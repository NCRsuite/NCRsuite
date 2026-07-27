import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.110.2';
import Stripe from 'npm:stripe@22.0.0';

type JsonRecord = Record<string, unknown>;

function allowedOrigins() {
  return new Set(
    (Deno.env.get('NCR_SUITE_ALLOWED_ORIGINS')
      ?? 'https://ncr-suite.fr,https://www.ncr-suite.fr,http://localhost:5173')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins().has(origin) ? origin : 'https://ncr-suite.fr',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function jsonResponse(request: Request, status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function serverConfiguration() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const stripeLivemode = (Deno.env.get('STRIPE_LIVEMODE') ?? 'false').toLowerCase() === 'true';
  const publicUrl = (Deno.env.get('NCR_SUITE_PUBLIC_URL') ?? 'https://ncr-suite.fr').replace(/\/+$/, '');
  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
    throw new Error('Configuration serveur Stripe incomplete.');
  }
  return { supabaseUrl, serviceRoleKey, stripeSecretKey, stripeLivemode, publicUrl };
}

function serviceClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function stripeClient(secretKey: string) {
  return new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
}

async function authenticatedUser(
  request: Request,
  service: SupabaseClient,
): Promise<{ user: User; token: string }> {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Authentification requise.');
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) throw new Error('Session utilisateur invalide.');
  return { user: data.user, token };
}

async function requireOrganizationManager(
  service: SupabaseClient,
  organizationId: string,
  userId: string,
) {
  const { data, error } = await service
    .from('organization_members')
    .select('role,status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .maybeSingle();
  if (error || !data) {
    throw new Error('Seul le proprietaire ou un administrateur peut gerer cet abonnement.');
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return jsonResponse(request, 405, { error: 'Methode non autorisee.' });

  try {
    const config = serverConfiguration();
    const service = serviceClient(config.supabaseUrl, config.serviceRoleKey);
    const { user } = await authenticatedUser(request, service);
    let payload: { organizationId?: string };
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(request, 400, { error: 'Demande de portail invalide.' });
    }

    const organizationId = String(payload.organizationId ?? '').trim();
    if (!organizationId) return jsonResponse(request, 400, { error: 'Entreprise invalide.' });
    await requireOrganizationManager(service, organizationId, user.id);

    const { data: subscription, error } = await service
      .from('organization_subscriptions')
      .select('stripe_customer_id,provider_customer_id,stripe_livemode')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (error || !subscription) throw new Error('Abonnement NCR Suite introuvable.');
    if (subscription.stripe_livemode !== config.stripeLivemode) {
      return jsonResponse(request, 409, {
        error: 'Le compte Stripe rattache ne correspond pas au mode de paiement actuel.',
      });
    }
    const customerId = subscription.stripe_customer_id || subscription.provider_customer_id;
    if (!customerId) {
      return jsonResponse(request, 409, { error: 'Aucun compte Stripe n est encore rattache a cette entreprise.' });
    }

    const stripe = stripeClient(config.stripeSecretKey);
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${config.publicUrl}/abonnement`,
      locale: 'fr',
    });
    return jsonResponse(request, 200, { url: portal.url });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Le portail Stripe est indisponible.';
    console.error('create_stripe_portal_failed', message);
    return jsonResponse(request, 500, { error: message });
  }
});
