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

function userClient(supabaseUrl: string, anonKey: string, token: string) {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type CheckoutPayload = {
  organizationId?: string;
  planKey?: string;
  requestId?: string;
  acceptTerms?: boolean;
};

const validPlans = new Set(['decouverte', 'essentielle', 'professionnelle', 'metier']);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return jsonResponse(request, 405, { error: 'Methode non autorisee.' });

  try {
    const config = serverConfiguration();
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!anonKey) return jsonResponse(request, 503, { error: 'Configuration Supabase incomplete.' });

    const service = serviceClient(config.supabaseUrl, config.serviceRoleKey);
    const { user, token } = await authenticatedUser(request, service);
    let payload: CheckoutPayload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(request, 400, { error: 'Demande de paiement invalide.' });
    }

    const organizationId = String(payload.organizationId ?? '').trim();
    const requestedPlan = String(payload.planKey ?? '').trim();
    let requestId = String(payload.requestId ?? '').trim();
    if (!organizationId || (!requestId && !validPlans.has(requestedPlan))) {
      return jsonResponse(request, 400, { error: 'Entreprise ou formule invalide.' });
    }
    await requireOrganizationManager(service, organizationId, user.id);

    let reference = '';
    if (!requestId) {
      if (payload.acceptTerms !== true) {
        return jsonResponse(request, 400, { error: 'Les conditions d abonnement doivent etre acceptees.' });
      }
      const scoped = userClient(config.supabaseUrl, anonKey, token);
      const { data, error } = await scoped.rpc('request_subscription_change', {
        p_organization_id: organizationId,
        p_requested_plan: requestedPlan,
        p_accept_terms: true,
      });
      if (error || !data) throw new Error(error?.message ?? 'La demande d abonnement n a pas pu etre creee.');
      const result = data as { id?: string; provider?: string; status?: string; reference?: string };
      if (result.provider !== 'stripe' || result.status !== 'payment_pending' || !result.id) {
        throw new Error('Cette formule ne dispose pas encore du paiement Stripe.');
      }
      requestId = result.id;
      reference = result.reference ?? '';
    }

    const { data: changeRequest, error: changeError } = await service
      .from('subscription_change_requests')
      .select('id,organization_id,requested_plan,status,provider,request_reference,stripe_checkout_session_id')
      .eq('id', requestId)
      .eq('organization_id', organizationId)
      .eq('status', 'payment_pending')
      .eq('provider', 'stripe')
      .maybeSingle();
    if (changeError || !changeRequest) throw new Error('Demande Stripe introuvable ou deja traitee.');
    reference = reference || changeRequest.request_reference;

    const { data: organization, error: organizationError } = await service
      .from('organizations')
      .select('id,name,business_type')
      .eq('id', organizationId)
      .maybeSingle();
    if (organizationError || !organization) throw new Error('Entreprise introuvable.');

    const { data: price, error: priceError } = await service
      .from('stripe_price_catalog')
      .select('stripe_price_id,livemode')
      .eq('business_type', organization.business_type)
      .eq('plan_key', changeRequest.requested_plan)
      .eq('livemode', config.stripeLivemode)
      .eq('active', true)
      .maybeSingle();
    if (priceError || !price) throw new Error('Le tarif Stripe de cette formule n est pas configure.');

    const stripe = stripeClient(config.stripeSecretKey);
    const { data: subscription, error: subscriptionError } = await service
      .from('organization_subscriptions')
      .select('stripe_customer_id,provider_customer_id,stripe_subscription_id,provider_subscription_id,stripe_livemode')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (subscriptionError || !subscription) throw new Error('Abonnement NCR Suite introuvable.');

    let customerId = subscription.stripe_livemode === config.stripeLivemode
      ? subscription.stripe_customer_id || subscription.provider_customer_id || ''
      : '';
    const activeSubscriptionId = subscription.stripe_livemode === config.stripeLivemode
      ? subscription.stripe_subscription_id || subscription.provider_subscription_id || ''
      : '';
    if (activeSubscriptionId && customerId) {
      const currentSubscription = await stripe.subscriptions.retrieve(activeSubscriptionId);
      const currentItem = currentSubscription.items.data[0];
      if (!currentItem) throw new Error('L abonnement Stripe ne contient aucune formule modifiable.');
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${config.publicUrl}/abonnement`,
        locale: 'fr',
        flow_data: {
          type: 'subscription_update_confirm',
          subscription_update_confirm: {
            subscription: activeSubscriptionId,
            items: [{
              id: currentItem.id,
              price: price.stripe_price_id,
              quantity: 1,
            }],
          },
          after_completion: {
            type: 'redirect',
            redirect: {
              return_url: `${config.publicUrl}/abonnement?stripe=success`,
            },
          },
        },
      });
      return jsonResponse(request, 200, {
        url: portal.url,
        reference,
        requestId,
        destination: 'portal',
      });
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: organization.name,
        metadata: {
          ncr_organization_id: organizationId,
          ncr_business_type: String(organization.business_type),
        },
      });
      customerId = customer.id;
      const { error: customerSaveError } = await service
        .from('organization_subscriptions')
        .update({
          provider: 'stripe',
          provider_customer_id: customerId,
          stripe_customer_id: customerId,
          stripe_livemode: customer.livemode,
        })
        .eq('organization_id', organizationId);
      if (customerSaveError) throw new Error('Le client Stripe n a pas pu etre rattache a l entreprise.');
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: organizationId,
      line_items: [{ price: price.stripe_price_id, quantity: 1 }],
      locale: 'fr',
      billing_address_collection: 'auto',
      customer_update: { address: 'auto', name: 'auto' },
      success_url: `${config.publicUrl}/abonnement?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.publicUrl}/abonnement?stripe=cancel`,
      metadata: {
        ncr_organization_id: organizationId,
        ncr_request_id: requestId,
        ncr_plan_key: changeRequest.requested_plan,
        ncr_request_reference: reference,
      },
      subscription_data: {
        metadata: {
          ncr_organization_id: organizationId,
          ncr_request_id: requestId,
          ncr_plan_key: changeRequest.requested_plan,
          ncr_request_reference: reference,
        },
      },
    });
    if (!checkout.url) throw new Error('Stripe n a pas retourne d URL de paiement.');

    const { error: requestSaveError } = await service
      .from('subscription_change_requests')
      .update({
        checkout_url_snapshot: checkout.url,
        provider_payment_reference: checkout.id,
        stripe_checkout_session_id: checkout.id,
        stripe_price_id: price.stripe_price_id,
        stripe_livemode: checkout.livemode,
      })
      .eq('id', requestId)
      .eq('status', 'payment_pending');
    if (requestSaveError) throw new Error('La session Stripe n a pas pu etre enregistree.');

    await service.from('subscription_events').insert({
      organization_id: organizationId,
      request_id: requestId,
      event_type: 'stripe_checkout_created',
      actor_user_id: user.id,
      from_plan: null,
      to_plan: changeRequest.requested_plan,
      metadata: {
        stripe_checkout_session_id: checkout.id,
        stripe_price_id: price.stripe_price_id,
        request_reference: reference,
      },
    });

    return jsonResponse(request, 200, {
      url: checkout.url,
      reference,
      requestId,
      destination: 'checkout',
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Le paiement Stripe est indisponible.';
    console.error('create_stripe_checkout_failed', message);
    return jsonResponse(request, 500, { error: message });
  }
});
