import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.110.2';
import Stripe from 'npm:stripe@22.0.0';

type JsonRecord = Record<string, unknown>;
type AddonType = 'training_module' | 'security_addon';

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

function configuration() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const stripeLivemode = (Deno.env.get('STRIPE_LIVEMODE') ?? 'false').toLowerCase() === 'true';
  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
    throw new Error('Configuration serveur Stripe incomplete.');
  }
  return { supabaseUrl, serviceRoleKey, stripeSecretKey, stripeLivemode };
}

function safeId(value: unknown) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' ? id : '';
  }
  return '';
}

async function requireManager(
  service: SupabaseClient,
  request: Request,
  organizationId: string,
) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Authentification requise.');
  const { data: userData, error: userError } = await service.auth.getUser(token);
  if (userError || !userData.user) throw new Error('Session utilisateur invalide.');
  const { data: membership, error } = await service
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userData.user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .maybeSingle();
  if (error || !membership) {
    throw new Error('Seul le proprietaire ou un administrateur peut gerer les modules.');
  }
}

function itemConfiguration(itemType: AddonType) {
  if (itemType === 'training_module') {
    return {
      requestTable: 'training_module_change_requests',
      entitlementTable: 'organization_training_modules',
      keyColumn: 'module_key',
    };
  }
  return {
    requestTable: 'security_addon_change_requests',
    entitlementTable: 'organization_security_addons',
    keyColumn: 'addon_key',
  };
}

function subscriptionItems(subscription: Stripe.Subscription) {
  return subscription.items.data.map((item) => ({
    subscription_item_id: item.id,
    price_id: item.price.id,
  }));
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return jsonResponse(request, 405, { error: 'Methode non autorisee.' });

  try {
    const config = configuration();
    const service = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const stripe = new Stripe(config.stripeSecretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });
    const payload = await request.json() as {
      organizationId?: string;
      requestId?: string;
      itemType?: string;
    };
    const organizationId = String(payload.organizationId ?? '').trim();
    const requestId = String(payload.requestId ?? '').trim();
    const itemType = String(payload.itemType ?? '') as AddonType;
    if (!organizationId || !requestId || !['training_module', 'security_addon'].includes(itemType)) {
      return jsonResponse(request, 400, { error: 'Demande de module invalide.' });
    }
    await requireManager(service, request, organizationId);

    const tables = itemConfiguration(itemType);
    const { data: change, error: changeError } = await service
      .from(tables.requestTable)
      .select(`id,organization_id,${tables.keyColumn},action,status,provider,request_reference`)
      .eq('id', requestId)
      .eq('organization_id', organizationId)
      .eq('status', 'payment_pending')
      .eq('provider', 'stripe')
      .maybeSingle();
    if (changeError || !change) throw new Error('Demande Stripe introuvable ou deja traitee.');
    const itemKey = String(change[tables.keyColumn] ?? '');
    const action = String(change.action);

    const { data: price, error: priceError } = await service
      .from('stripe_addon_price_catalog')
      .select('stripe_price_id')
      .eq('item_type', itemType)
      .eq('item_key', itemKey)
      .eq('livemode', config.stripeLivemode)
      .eq('active', true)
      .maybeSingle();
    if (priceError || !price) throw new Error('Le Price ID Stripe de ce module n est pas configure.');

    const { data: billing, error: billingError } = await service
      .from('organization_subscriptions')
      .select('stripe_subscription_id,provider_subscription_id,stripe_livemode,status,grace_period_ends_at')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (billingError || !billing) throw new Error('Abonnement NCR Suite introuvable.');
    if (billing.stripe_livemode !== config.stripeLivemode) {
      throw new Error('Le mode Stripe du module ne correspond pas a celui de l abonnement.');
    }
    const subscriptionId = billing.stripe_subscription_id || billing.provider_subscription_id || '';
    if (!subscriptionId) throw new Error('Aucun abonnement Stripe actif n est rattache a cette entreprise.');

    let subscription = await stripe.subscriptions.retrieve(subscriptionId);
    let stripeItem = subscription.items.data.find((item) => item.price.id === price.stripe_price_id);

    if (action === 'add') {
      const graceEnd = billing.grace_period_ends_at
        ? new Date(billing.grace_period_ends_at).getTime()
        : 0;
      const billingAllowed = ['active', 'trialing'].includes(String(billing.status))
        || (billing.status === 'past_due' && graceEnd > Date.now());
      if (!billingAllowed) {
        throw new Error('Le paiement de la formule principale doit etre regularise avant d ajouter un module.');
      }
      if (!stripeItem) {
        stripeItem = await stripe.subscriptionItems.create({
          subscription: subscriptionId,
          price: price.stripe_price_id,
          quantity: 1,
          payment_behavior: 'pending_if_incomplete',
          proration_behavior: 'always_invoice',
          metadata: {
            ncr_organization_id: organizationId,
            ncr_request_id: requestId,
            ncr_item_type: itemType,
            ncr_item_key: itemKey,
            ncr_data_retention: 'preserve',
          },
        }, { idempotencyKey: `ncr-addon-add-${requestId}` });
      }
      await service
        .from(tables.requestTable)
        .update({ stripe_subscription_item_id: stripeItem.id })
        .eq('id', requestId);

      subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice'],
      });
      const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
      const paymentUrl = latestInvoice?.status === 'paid'
        ? null
        : latestInvoice?.hosted_invoice_url ?? null;
      if (latestInvoice?.status === 'paid') {
        const { error: reconcileError } = await service.rpc('reconcile_stripe_subscription_items', {
          p_organization_id: organizationId,
          p_subscription_id: subscriptionId,
          p_items: subscriptionItems(subscription),
          p_livemode: config.stripeLivemode,
          p_event_reference: `addon:${requestId}`,
        });
        if (reconcileError) throw reconcileError;
      }
      return jsonResponse(request, 200, {
        success: true,
        status: latestInvoice?.status === 'paid' ? 'active' : 'payment_pending',
        paymentUrl,
        requestId,
        dataRetained: true,
      });
    }

    const { data: entitlement } = await service
      .from(tables.entitlementTable)
      .select('stripe_subscription_item_id')
      .eq('organization_id', organizationId)
      .eq(tables.keyColumn, itemKey)
      .maybeSingle();
    const stripeItemId = entitlement?.stripe_subscription_item_id || stripeItem?.id || '';
    if (stripeItemId) {
      await stripe.subscriptionItems.del(stripeItemId, {
        proration_behavior: 'none',
      });
    }
    const { error: removalError } = await service.rpc('complete_stripe_addon_removal', {
      p_organization_id: organizationId,
      p_item_type: itemType,
      p_request_id: requestId,
      p_subscription_item_id: stripeItemId || `removed:${requestId}`,
    });
    if (removalError) throw removalError;
    return jsonResponse(request, 200, {
      success: true,
      status: 'removed',
      requestId,
      dataRetained: true,
      message: 'Le droit du module est retire. Ses donnees restent conservees.',
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'La modification Stripe est indisponible.';
    console.error('manage_stripe_addon_failed', message);
    return jsonResponse(request, 500, { error: message });
  }
});
