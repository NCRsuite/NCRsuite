import { createClient } from 'npm:@supabase/supabase-js@2.110.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const organizationBuckets = [
  'organization-branding',
  'cleaning-photos',
  'training-documents',
  'training-signatures',
  'security-client-documents',
] as const;

type StorageEntry = {
  name: string;
  id?: string | null;
  metadata?: Record<string, unknown> | null;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeConfirmation(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr-FR');
}

async function collectStoragePaths(
  service: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await service.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes('bucket not found') || message.includes('not found')) return paths;
      throw new Error(`${bucket} : ${error.message}`);
    }

    const entries = (data ?? []) as StorageEntry[];
    for (const entry of entries) {
      const childPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFolder = !entry.id && !entry.metadata;
      if (isFolder) paths.push(...await collectStoragePaths(service, bucket, childPath));
      else paths.push(childPath);
    }

    if (entries.length < limit) break;
    offset += limit;
  }

  return paths;
}

async function removeOrganizationStorage(
  service: ReturnType<typeof createClient>,
  organizationId: string,
) {
  let deleted = 0;
  const errors: string[] = [];

  for (const bucket of organizationBuckets) {
    try {
      const paths = await collectStoragePaths(service, bucket, organizationId);
      for (let index = 0; index < paths.length; index += 100) {
        const chunk = paths.slice(index, index + 100);
        const { error } = await service.storage.from(bucket).remove(chunk);
        if (error) throw error;
        deleted += chunk.length;
      }
    } catch (caught) {
      errors.push(caught instanceof Error ? caught.message : `${bucket} : nettoyage impossible`);
    }
  }

  return { deleted, errors };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse(405, { error: 'Méthode non autorisée.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Configuration Supabase serveur incomplète.' });
  }

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) return jsonResponse(401, { error: 'Authentification requise.' });

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await service.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return jsonResponse(401, { error: 'Session utilisateur invalide.' });

  const { data: admin, error: adminError } = await service
    .from('platform_admins')
    .select('role,active')
    .eq('user_id', user.id)
    .eq('active', true)
    .eq('role', 'super_admin')
    .maybeSingle();

  if (adminError || !admin) {
    return jsonResponse(403, { error: 'Seul le super-administrateur peut supprimer une entreprise.' });
  }

  let payload: { organizationId?: string; confirmationName?: string };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Requête invalide.' });
  }

  const organizationId = String(payload.organizationId ?? '').trim();
  const confirmationName = String(payload.confirmationName ?? '').trim();
  if (!organizationId || !confirmationName) {
    return jsonResponse(400, { error: 'Entreprise et confirmation requises.' });
  }

  const { data: organization, error: organizationError } = await service
    .from('organizations')
    .select('id,name,slug,business_type,plan,status,created_at,created_by')
    .eq('id', organizationId)
    .maybeSingle();

  if (organizationError) return jsonResponse(500, { error: organizationError.message });
  if (!organization) return jsonResponse(404, { error: 'Entreprise introuvable ou déjà supprimée.' });

  if (normalizeConfirmation(confirmationName) !== normalizeConfirmation(organization.name)) {
    return jsonResponse(400, { error: 'Le nom saisi ne correspond pas exactement à l’entreprise.' });
  }

  const { error: auditTableError } = await service
    .from('platform_deleted_organizations')
    .select('id')
    .limit(1);
  if (auditTableError) {
    return jsonResponse(503, { error: 'La migration 062 doit être exécutée avant toute suppression.' });
  }

  const { data: owner } = await service
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('role', 'owner')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  let ownerEmail: string | null = null;
  if (owner?.user_id) {
    const { data: ownerUser } = await service.auth.admin.getUserById(owner.user_id);
    ownerEmail = ownerUser?.user?.email ?? null;
  }

  const storageCleanup = await removeOrganizationStorage(service, organizationId);

  const { error: deleteError } = await service
    .from('organizations')
    .delete()
    .eq('id', organizationId);

  if (deleteError) {
    return jsonResponse(500, {
      error: `Suppression impossible : ${deleteError.message}`,
      storage_objects_deleted: storageCleanup.deleted,
      storage_warnings: storageCleanup.errors,
    });
  }

  const auditMetadata = {
    name: organization.name,
    slug: organization.slug,
    business_type: organization.business_type,
    plan: organization.plan,
    previous_status: organization.status,
    owner_email: ownerEmail,
    created_at: organization.created_at,
    storage_objects_deleted: storageCleanup.deleted,
    storage_warnings: storageCleanup.errors,
    auth_accounts_deleted: false,
  };

  const auditWarnings = [...storageCleanup.errors];
  const { error: deletedHistoryError } = await service.from('platform_deleted_organizations').insert({
    organization_id: organization.id,
    organization_name: organization.name,
    organization_slug: organization.slug,
    business_type: organization.business_type,
    plan: organization.plan,
    previous_status: organization.status,
    owner_email: ownerEmail,
    deleted_by: user.id,
    storage_objects_deleted: storageCleanup.deleted,
    metadata: auditMetadata,
  });
  if (deletedHistoryError) auditWarnings.push(`Historique de suppression : ${deletedHistoryError.message}`);

  const { error: auditLogError } = await service.from('audit_logs').insert({
    organization_id: null,
    user_id: user.id,
    action: 'platform.organization_deleted',
    entity_type: 'organization',
    entity_id: organization.id,
    metadata: auditMetadata,
  });
  if (auditLogError) auditWarnings.push(`Journal d’audit : ${auditLogError.message}`);

  return jsonResponse(200, {
    success: true,
    organization_id: organization.id,
    organization_name: organization.name,
    storage_objects_deleted: storageCleanup.deleted,
    storage_warnings: auditWarnings,
    message: `L’entreprise ${organization.name} a été supprimée définitivement.`,
  });
});
