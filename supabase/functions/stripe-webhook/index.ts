import { createClient } from 'npm:@supabase/supabase-js@2.110.2';
import Stripe from 'npm:stripe@22.0.0';

type JsonRecord = Record<string, unknown>;

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

type AppStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled';

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

function appStatus(status: string): AppStatus {
  if (status === 'trialing') return 'trialing';
  if (status === 'active') return 'active';
  if (status === 'paused') return 'paused';
  if (status === 'canceled' || status === 'incomplete_expired') return 'canceled';
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
    const signatureStripe = stripeClient(config.stripeSecretKey);
    event = await signatureStripe.webhooks.constructEventAsync(
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
    let customerId: string | null = null;
    let priceId: string | null = null;
    let planKey: string | null = null;
    let paymentConfirmed = false;
    let normalizedStatus: AppStatus = 'past_due';
    let stripeStatus = 'unknown';
    let eventMetadata: Record<string, unknown> = {};
    const stripe = stripeClient(config.stripeSecretKey);

    if (event.type === 'checkout.session.completed') {
      const checkout = event.data.object as Stripe.Checkout.Session;
      const metadata = safeMetadata(checkout.metadata);
      const subscriptionId = safeId(checkout.subscription);
      if (!subscriptionId) throw new Error('La session Checkout ne contient aucun abonnement.');
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      organizationId = metadata.ncr_organization_id ?? null;
      requestId = metadata.ncr_request_id ?? null;
      planKey = metadata.ncr_plan_key ?? null;
      customerId = safeId(checkout.customer);
      paymentConfirmed = checkout.payment_status === 'paid' || checkout.payment_status === 'no_payment_required';
      eventMetadata = {
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
    planKey = planKey ?? metadata.ncr_plan_key ?? null;
    customerId = customerId ?? safeId(subscription.customer);
    priceId = subscription.items.data[0]?.price?.id ?? null;
    stripeStatus = event.type === 'customer.subscription.deleted'
      ? 'canceled'
      : subscription.status;
    normalizedStatus = event.type === 'invoice.payment_failed'
      ? 'past_due'
      : appStatus(stripeStatus);
    const period = subscriptionPeriod(subscription);

    const { data: applied, error: applyError } = await service.rpc('apply_stripe_billing_event', {
      p_stripe_event_id: event.id,
      p_event_type: event.type,
      p_organization_id: organizationId,
      p_request_id: requestId,
      p_customer_id: customerId,
      p_subscription_id: subscription.id,
      p_price_id: priceId,
      p_plan_key: planKey,
      p_app_status: normalizedStatus,
      p_stripe_status: stripeStatus,
      p_period_start: period.start,
      p_period_end: period.end,
      p_cancel_at_period_end: subscription.cancel_at_period_end,
      p_payment_confirmed: paymentConfirmed,
      p_livemode: event.livemode,
      p_metadata: eventMetadata,
    });
    if (applyError) throw applyError;
    const appliedResult = applied as { organization_id?: string } | null;
    organizationId = appliedResult?.organization_id ?? organizationId;

    const { error: completeError } = await service.rpc('complete_stripe_webhook_event', {
      p_event_id: event.id,
      p_status: 'processed',
      p_organization_id: organizationId,
      p_error_message: null,
      p_metadata: {
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        stripe_price_id: priceId,
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
