import { createClient } from 'npm:@supabase/supabase-js@2.110.2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function randomSecret(bytes = 36) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Configuration Supabase serveur incomplète.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return new Response(JSON.stringify({ error: 'Authentification requise.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await service.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Session utilisateur invalide.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: admin, error: adminError } = await service
    .from('platform_admins')
    .select('role,active')
    .eq('user_id', user.id)
    .eq('active', true)
    .eq('role', 'super_admin')
    .maybeSingle();
  if (adminError || !admin) {
    return new Response(JSON.stringify({ error: 'Accès super-administrateur requis.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data: existing } = await service
      .from('push_configuration')
      .select('vapid_public_key,vapid_private_key,vapid_subject,worker_secret')
      .eq('singleton', true)
      .maybeSingle();
    const generated = webpush.generateVAPIDKeys();
    const publicKey = existing?.vapid_public_key || generated.publicKey;
    const privateKey = existing?.vapid_private_key || generated.privateKey;
    const workerSecret = existing?.worker_secret || randomSecret();
    const subject = existing?.vapid_subject || 'mailto:ncr-solutions@outlook.fr';
    const { data, error } = await service.rpc('platform_initialize_push', {
      p_vapid_public_key: publicKey,
      p_vapid_private_key: privateKey,
      p_vapid_subject: subject,
      p_worker_secret: workerSecret,
      p_project_url: supabaseUrl,
    });
    if (error) throw error;

    await service.from('push_configuration').update({ configured_by: user.id }).eq('singleton', true);
    await service.from('audit_logs').insert({
      organization_id: null,
      user_id: user.id,
      action: 'platform.push_initialized',
      entity_type: 'platform',
      entity_id: 'push',
      metadata: { cron_configured: true },
    });

    return new Response(JSON.stringify(data ?? { configured: true, public_key: publicKey }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
