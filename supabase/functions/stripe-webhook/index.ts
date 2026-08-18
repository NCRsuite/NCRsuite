import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.110.2';
import Stripe from 'npm:stripe@22.0.0';

type JsonRecord = Record<string, unknown>;
type AppStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled';

function serverConfiguration() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
    throw new Error('Configuration serveur Stripe incomplete.');
  }
  return { supabaseUrl, serviceRoleKey, stripeSecretKey };
}

function serviceClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function stripeClient(secretKey: string) {
  return new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
}

function safeId(value: unknown) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

function safeMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as JsonRecord)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function timestamp(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : null;
}

function subscriptionPeriod(subscription: Stripe.Subscription) {
  const record = subscription as unknown as Record<string, unknown>;
  const firstItem = subscription.items.data[0] as unknown as Record<string, unknown> | undefined;
  return {
    start: timestamp(record.current_period_start) ?? timestamp(firstItem?.current_period_start),
    end: timestamp(record.current_period_end) ?? timestamp(firstItem?.current_period_end),
  };
}

function scheduledCancellation(subscription: Stripe.Subscription) {
  if (subscription.cancel_at_period_end === true) return true;
  const record = subscription as unknown as {
    cancel_at?: unknown;
    current_period_end?: unknown;
  };
  const firstItem = subscription.items.data[0] as unknown as { current_period_end?: unknown } | undefined;
  const cancelAt = typeof record.cancel_at === 'number' && Number.isFinite(record.cancel_at)
    ? record.cancel_at
    : null;
  const periodEnd = typeof record.current_period_end === 'number' && Number.isFinite(record.current_period_end)
    ? record.current_period_end
    : typeof firstItem?.current_period_end === 'number' && Number.isFinite(firstItem.current_period_end)
      ? firstItem.current_period_end
      : null;
  return cancelAt !== null && periodEnd !== null && cancelAt <= periodEnd;
}

function appStatus(status: string): AppStatus {
  if (status === 'trialing') return 'trialing';
  if (status === 'active') return 'active';
  if (status === 'paused') return 'paused';
  if (status === 'canceled' || status === 'incomplete_expired' || status === 'unpaid') {
    return 'canceled';
  }
  return 'past_due';
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const record = invoice as unknown as {
    subscription?: unknown;
    parent?: { subscription_details?: { subscription?: unknown } };
  };
  return safeId(record.subscription)
    ?? safeId(record.parent?.subscription_details?.subscription);
}

function eventObjectId(event: Stripe.Event) {
  return safeId(event.data.object);
}

function serializedItems(subscription: Stripe.Subscription) {
  return subscription.items.data.map((item) => ({
    subscription_item_id: item.id,
    price_id: item.price.id,
  }));
}

async function resolveOrganization(
  service: SupabaseClient,
  organizationId: string | null,
  subscriptionId: string,
  customerId: string | null,
) {
  if (organizationId) return organizationId;
  let query = service
    .from('organization_subscriptions')
    .select('organization_id')
    .or(`stripe_subscription_id.eq.${subscriptionId},provider_subscription_id.eq.${subscriptionId}`)
    .limit(1);
  let { data } = await query.maybeSingle();
  if (!data && customerId) {
    const result = await service
      .from('organization_subscriptions')
      .select('organization_id')
      .or(`stripe_customer_id.eq.${customerId},provider_customer_id.eq.${customerId}`)
      .limit(1)
      .maybeSingle();
    data = result.data;
  }
  return data?.organization_id ? String(data.organization_id) : null;
}

async function basePrice(
  service: SupabaseClient,
  subscription: Stripe.Subscription,
  organizationId: string,
  livemode: boolean,
) {
  const { data: organization, error: organizationError } = await service
    .from('organizations')
    .select('business_type,plan')
    .eq('id', organizationId)
    .maybeSingle();
  if (organizationError || !organization) throw new Error('Entreprise Stripe introuvable.');
  const priceIds = subscription.items.data.map((item) => item.price.id).filter(Boolean);
  const { data: catalog, error: catalogError } = await service
    .from('stripe_price_catalog')
    .select('stripe_price_id,plan_key')
    .eq('business_type', organization.business_type)
    .eq('livemode', livemode)
    .eq('active', true)
    .in('stripe_price_id', priceIds);
  if (catalogError) throw catalogError;
  const mapping = (catalog ?? []).find((row) => priceIds.includes(row.stripe_price_id));
  return {
    businessType: String(organization.business_type),
    planKey: mapping?.plan_key ? String(mapping.plan_key) : String(organization.plan),
    priceId: mapping?.stripe_price_id ? String(mapping.stripe_price_id) : null,
  };
}

async function removeIncompatibleAddons(
  service: SupabaseClient,
  stripe: Stripe,
  subscription: Stripe.Subscription,
  planKey: string,
  businessType: string,
  livemode: boolean,
) {
  const priceIds = subscription.items.data.map((item) => item.price.id).filter(Boolean);
  const { data: mappings, error } = await service
    .from('stripe_addon_price_catalog')
    .select('item_type,item_key,stripe_price_id')
    .eq('livemode', livemode)
    .eq('active', true)
    .in('stripe_price_id', priceIds);
  if (error) throw error;
  const { data: targetPlanCatalog, error: planError } = await service
    .from('domain_plan_catalog')
    .select('features')
    .eq('business_type', businessType)
    .eq('plan_key', planKey)
    .eq('active', true)
    .maybeSingle();
  if (planError || !targetPlanCatalog) {
    throw new Error('La formule Stripe est introuvable dans le catalogue NCR Suite.');
  }
  const planFeatures = targetPlanCatalog.features && typeof targetPlanCatalog.features === 'object'
    ? targetPlanCatalog.features as Record<string, unknown>
    : {};
  let removed = false;

  for (const mapping of mappings ?? []) {
    const table = mapping.item_type === 'training_module'
      ? 'training_module_catalog'
      : 'security_addon_catalog';
    const keyColumn = mapping.item_type === 'training_module' ? 'module_key' : 'addon_key';
    const { data: catalogItem, error: catalogError } = await service
      .from(table)
      .select('available_plans,feature_keys')
      .eq(keyColumn, mapping.item_key)
      .eq('active', true)
      .maybeSingle();
    if (catalogError) throw catalogError;
    const availablePlans = Array.isArray(catalogItem?.available_plans)
      ? catalogItem.available_plans as string[]
      : [];
    const featureKeys = Array.isArray(catalogItem?.feature_keys)
      ? catalogItem.feature_keys as string[]
      : [];
    const includedByTargetPlan = featureKeys.length > 0
      && featureKeys.every((feature) => planFeatures[feature] === true);
    if (!availablePlans.includes(planKey) || includedByTargetPlan) {
      const item = subscription.items.data.find(
        (candidate) => candidate.price.id === mapping.stripe_price_id,
      );
      if (item) {
        await stripe.subscriptionItems.del(item.id, {
          proration_behavior: 'create_prorations',
        });
        removed = true;
      }
    }
  }
  return removed;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let event: Stripe.Event;
  let service: ReturnType<typeof serviceClient>;
  try {
    const config = serverConfiguration();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET absent.');
    const signature = request.headers.get('stripe-signature');
    if (!signature) return new Response('Stripe signature missing', { status: 400 });

    const rawBody = await request.text();
    const stripe = stripeClient(config.stripeSecretKey);
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
    service = serviceClient(config.supabaseUrl, config.serviceRoleKey);

    const { data: claimed, error: claimError } = await service.rpc('claim_stripe_webhook_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_object_id: eventObjectId(event),
      p_livemode: event.livemode,
      p_metadata: { api_version: event.api_version, created: event.created },
    });
    if (claimError) throw claimError;
    if (!claimed) return Response.json({ received: true, duplicate: true });

    let subscription: Stripe.Subscription | null = null;
    let organizationId: string | null = null;
    let requestId: string | null = null;
    let contractId: string | null = null;
    let customerId: string | null = null;
    let paymentConfirmed = false;
    let eventMetadata: Record<string, unknown> = {
      data_retention_mode: 'preserve',
    };

    if (event.type === 'checkout.session.completed') {
      const checkout = event.data.object as Stripe.Checkout.Session;
      const metadata = safeMetadata(checkout.metadata);
      const subscriptionId = safeId(checkout.subscription);
      if (!subscriptionId) throw new Error('La session Checkout ne contient aucun abonnement.');
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      organizationId = metadata.ncr_organization_id ?? null;
      requestId = metadata.ncr_request_id ?? null;
      contractId = metadata.ncr_contract_id ?? null;
      customerId = safeId(checkout.customer);
      paymentConfirmed = checkout.payment_status === 'paid'
        || checkout.payment_status === 'no_payment_required';
      eventMetadata = {
        ...eventMetadata,
        checkout_session_id: checkout.id,
        payment_status: checkout.payment_status,
        request_reference: metadata.ncr_request_reference,
      };
    } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (!subscriptionId) {
        await service.rpc('complete_stripe_webhook_event', {
          p_event_id: event.id,
          p_status: 'ignored',
          p_organization_id: null,
          p_error_message: null,
          p_metadata: { reason: 'invoice_without_subscription', invoice_id: invoice.id },
        });
        return Response.json({ received: true, ignored: true });
      }
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      customerId = safeId(invoice.customer);
      paymentConfirmed = event.type === 'invoice.paid' && invoice.paid === true;
      eventMetadata = {
        ...eventMetadata,
        invoice_id: invoice.id,
        invoice_status: invoice.status,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        hosted_invoice_url: invoice.hosted_invoice_url,
      };
    } else if (
      event.type === 'customer.subscription.updated'
      || event.type === 'customer.subscription.deleted'
    ) {
      subscription = event.data.object as Stripe.Subscription;
      customerId = safeId(subscription.customer);
    } else {
      await service.rpc('complete_stripe_webhook_event', {
        p_event_id: event.id,
        p_status: 'ignored',
        p_organization_id: null,
        p_error_message: null,
        p_metadata: { reason: 'event_type_not_subscribed' },
      });
      return Response.json({ received: true, ignored: true });
    }

    if (!subscription) throw new Error('Abonnement Stripe absent de l evenement.');
    const metadata = safeMetadata(subscription.metadata);
    organizationId = organizationId ?? metadata.ncr_organization_id ?? null;
    requestId = requestId ?? metadata.ncr_request_id ?? null;
    contractId = contractId ?? metadata.ncr_contract_id ?? null;
    customerId = customerId ?? safeId(subscription.customer);
    organizationId = await resolveOrganization(
      service,
      organizationId,
      subscription.id,
      customerId,
    );
    if (!organizationId) throw new Error('Entreprise Stripe introuvable.');

    if (!contractId) {
      const { data: billingContract } = await service
        .from('organization_subscriptions')
        .select('current_contract_id')
        .eq('organization_id', organizationId)
        .maybeSingle();
      contractId = billingContract?.current_contract_id ? String(billingContract.current_contract_id) : null;
    }

    const base = await basePrice(service, subscription, organizationId, event.livemode);
    const stripeStatus = event.type === 'customer.subscription.deleted'
      ? 'canceled'
      : subscription.status;
    const normalizedStatus = event.type === 'invoice.payment_failed'
      ? 'past_due'
      : appStatus(stripeStatus);
    const period = subscriptionPeriod(subscription);
    const cancellationScheduled = scheduledCancellation(subscription);
    const cancelAt = timestamp((subscription as unknown as { cancel_at?: unknown }).cancel_at);
    eventMetadata = {
      ...eventMetadata,
      stripe_cancel_at: cancelAt,
      stripe_cancel_at_period_end: cancellationScheduled,
    };

    const { data: applied, error: applyError } = await service.rpc('apply_stripe_billing_event', {
      p_stripe_event_id: event.id,
      p_event_type: event.type,
      p_organization_id: organizationId,
      p_request_id: requestId,
      p_customer_id: customerId,
      p_subscription_id: subscription.id,
      p_price_id: base.priceId,
      p_plan_key: base.planKey,
      p_app_status: normalizedStatus,
      p_stripe_status: stripeStatus,
      p_period_start: period.start,
      p_period_end: period.end,
      p_cancel_at_period_end: cancellationScheduled,
      p_payment_confirmed: paymentConfirmed,
      p_livemode: event.livemode,
      p_metadata: eventMetadata,
    });
    if (applyError) throw applyError;
    const appliedResult = applied as { organization_id?: string; plan_key?: string } | null;
    organizationId = appliedResult?.organization_id ?? organizationId;
    const appliedPlan = appliedResult?.plan_key ?? base.planKey;

    const { error: lifecycleError } = await service.rpc('apply_stripe_lifecycle_state', {
      p_organization_id: organizationId,
      p_event_type: event.type,
      p_app_status: normalizedStatus,
      p_plan_key: appliedPlan,
      p_period_end: period.end,
      p_cancel_at_period_end: cancellationScheduled,
    });
    if (lifecycleError) throw lifecycleError;

    if (contractId) {
      const contractStatus = event.type === 'customer.subscription.deleted'
        ? 'canceled'
        : event.type === 'invoice.payment_failed'
          ? 'payment_failed'
          : normalizedStatus === 'active'
            ? 'active'
            : null;
      const contractPaymentStatus = event.type === 'customer.subscription.deleted'
        ? 'canceled'
        : event.type === 'invoice.payment_failed'
          ? 'failed'
          : paymentConfirmed || normalizedStatus === 'active'
            ? 'paid'
            : null;
      const contractUpdate: Record<string, unknown> = {
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
      };
      if (contractStatus) contractUpdate.status = contractStatus;
      if (contractPaymentStatus) contractUpdate.payment_status = contractPaymentStatus;
      if (contractPaymentStatus === 'paid') contractUpdate.payment_confirmed_at = new Date().toISOString();
      const { error: contractUpdateError } = await service
        .from('subscription_contracts')
        .update(contractUpdate)
        .eq('id', contractId)
        .eq('organization_id', organizationId);
      if (contractUpdateError) throw contractUpdateError;
      const { error: activeContractError } = await service
        .from('organization_subscriptions')
        .update({ current_contract_id: contractId })
        .eq('organization_id', organizationId);
      if (activeContractError) throw activeContractError;
      const { error: contractEventError } = await service.from('subscription_contract_events').insert({
        contract_id: contractId,
        organization_id: organizationId,
        event_type: `stripe_${event.type.replaceAll('.', '_')}`,
        actor_user_id: null,
        metadata: {
          stripe_event_id: event.id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          payment_confirmed: paymentConfirmed,
          app_status: normalizedStatus,
        },
      });
      if (contractEventError) throw contractEventError;
    }

    let removedIncompatibleAddon = false;
    if (
      normalizedStatus === 'active'
      && event.type !== 'invoice.payment_failed'
      && event.type !== 'customer.subscription.deleted'
    ) {
      removedIncompatibleAddon = await removeIncompatibleAddons(
        service,
        stripe,
        subscription,
        appliedPlan,
        base.businessType,
        event.livemode,
      );
      if (removedIncompatibleAddon) {
        subscription = await stripe.subscriptions.retrieve(subscription.id);
      }
    }

    if (
      event.type === 'checkout.session.completed'
      || event.type === 'invoice.paid'
      || event.type === 'customer.subscription.deleted'
      || removedIncompatibleAddon
    ) {
      const items = event.type === 'customer.subscription.deleted'
        ? []
        : serializedItems(subscription);
      const { error: reconcileError } = await service.rpc('reconcile_stripe_subscription_items', {
        p_organization_id: organizationId,
        p_subscription_id: subscription.id,
        p_items: items,
        p_livemode: event.livemode,
        p_event_reference: event.id,
      });
      if (reconcileError) throw reconcileError;
    }

    const { error: completeError } = await service.rpc('complete_stripe_webhook_event', {
      p_event_id: event.id,
      p_status: 'processed',
      p_organization_id: organizationId,
      p_error_message: null,
      p_metadata: {
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        stripe_price_id: base.priceId,
        plan_key: appliedPlan,
        contract_id: contractId,
        data_retained: true,
      },
    });
    if (completeError) throw completeError;
    return Response.json({ received: true });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    console.error('stripe_webhook_failed', message);
    try {
      if (typeof service !== 'undefined' && typeof event !== 'undefined') {
        await service.rpc('complete_stripe_webhook_event', {
          p_event_id: event.id,
          p_status: 'failed',
          p_organization_id: null,
          p_error_message: message,
          p_metadata: {},
        });
      }
    } catch (recordError) {
      console.error('stripe_webhook_failure_record_failed', recordError);
    }
    return new Response(`Webhook error: ${message}`, { status: 400 });
  }
});
