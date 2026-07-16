import { createClient } from 'npm:@supabase/supabase-js@2.110.2';
import webpush from 'npm:web-push@3.6.7';

type DeliveryRow = {
  id: string;
  event_id: string;
  subscription_id: string;
  attempts: number;
};

type EventRow = {
  id: string;
  organization_id: string;
  title: string;
  body: string;
  url: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  category: string;
  event_type: string;
  metadata: Record<string, unknown>;
  expires_at: string | null;
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  active: boolean;
  failure_count: number;
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return new Response('Server configuration missing', { status: 500 });

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: config, error: configError } = await service
    .from('push_configuration')
    .select('vapid_public_key,vapid_private_key,vapid_subject,worker_secret')
    .eq('singleton', true)
    .maybeSingle();
  if (configError || !config) return new Response('Push is not configured', { status: 503 });

  const providedSecret = request.headers.get('x-ncr-push-secret') ?? '';
  if (!providedSecret || providedSecret !== config.worker_secret) return new Response('Forbidden', { status: 403 });

  webpush.setVapidDetails(config.vapid_subject, config.vapid_public_key, config.vapid_private_key);

  const now = new Date().toISOString();
  const { data: deliveries, error: deliveryError } = await service
    .from('push_delivery_queue')
    .select('id,event_id,subscription_id,attempts')
    .in('status', ['pending', 'sending'])
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(100);
  if (deliveryError) {
    await service.from('push_configuration').update({ last_worker_run_at: now, last_worker_error: deliveryError.message }).eq('singleton', true);
    return new Response(JSON.stringify({ error: deliveryError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const rows = (deliveries ?? []) as DeliveryRow[];
  if (rows.length === 0) {
    await service.from('push_configuration').update({ last_worker_run_at: now, last_worker_error: null }).eq('singleton', true);
    return new Response(JSON.stringify({ processed: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  const eventIds = [...new Set(rows.map((row) => row.event_id))];
  const subscriptionIds = [...new Set(rows.map((row) => row.subscription_id))];
  const [{ data: events }, { data: subscriptions }] = await Promise.all([
    service.from('notification_events').select('id,organization_id,title,body,url,urgency,category,event_type,metadata,expires_at,status').in('id', eventIds),
    service.from('push_subscriptions').select('id,endpoint,p256dh,auth_key,active,failure_count').in('id', subscriptionIds),
  ]);

  const eventMap = new Map((events ?? []).map((row: any) => [row.id, row as EventRow & { status: string }]));
  const subscriptionMap = new Map((subscriptions ?? []).map((row: any) => [row.id, row as SubscriptionRow]));
  let sent = 0;
  let failed = 0;
  let canceled = 0;

  for (const delivery of rows) {
    const event = eventMap.get(delivery.event_id);
    const subscription = subscriptionMap.get(delivery.subscription_id);
    if (!event || event.status !== 'active' || (event.expires_at && new Date(event.expires_at) < new Date()) || !subscription?.active) {
      await service.from('push_delivery_queue').update({ status: 'canceled', locked_at: null, updated_at: new Date().toISOString() }).eq('id', delivery.id);
      canceled += 1;
      continue;
    }

    const lockedAt = new Date().toISOString();
    const { data: locked } = await service.from('push_delivery_queue')
      .update({ status: 'sending', locked_at: lockedAt, attempts: delivery.attempts + 1, updated_at: lockedAt })
      .eq('id', delivery.id)
      .in('status', ['pending', 'sending'])
      .select('id')
      .maybeSingle();
    if (!locked) continue;

    const payload = JSON.stringify({
      title: event.title,
      body: event.body,
      icon: '/brand/ncr-suite-icon.png',
      badge: '/icons/icon-192.png',
      url: event.url || '/',
      tag: `${event.category}:${event.id}`,
      urgency: event.urgency,
      data: { event_id: event.id, organization_id: event.organization_id, event_type: event.event_type, ...(event.metadata ?? {}) },
    });

    try {
      const result = await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
      }, payload, {
        TTL: event.urgency === 'critical' ? 3600 : 86400,
        urgency: event.urgency === 'critical' ? 'high' : event.urgency === 'low' ? 'low' : 'normal',
      });
      const sentAt = new Date().toISOString();
      await Promise.all([
        service.from('push_delivery_queue').update({ status: 'sent', sent_at: sentAt, locked_at: null, provider_status: result.statusCode, last_error: null, updated_at: sentAt }).eq('id', delivery.id),
        service.from('push_subscriptions').update({ failure_count: 0, last_success_at: sentAt, last_seen_at: sentAt, updated_at: sentAt }).eq('id', subscription.id),
      ]);
      sent += 1;
    } catch (caught: any) {
      const statusCode = Number(caught?.statusCode ?? 0) || null;
      const errorMessage = String(caught?.body || caught?.message || caught).slice(0, 1500);
      const permanent = statusCode === 404 || statusCode === 410;
      const attempts = delivery.attempts + 1;
      const exhausted = attempts >= 5;
      const nextTime = new Date(Date.now() + Math.min(60, 5 * attempts) * 60_000).toISOString();
      const failureTime = new Date().toISOString();

      await service.from('push_delivery_queue').update({
        status: permanent || exhausted ? 'failed' : 'pending',
        scheduled_for: permanent || exhausted ? now : nextTime,
        locked_at: null,
        provider_status: statusCode,
        last_error: errorMessage,
        updated_at: failureTime,
      }).eq('id', delivery.id);
      await service.from('push_subscriptions').update({
        active: permanent ? false : subscription.active,
        failure_count: Math.min(100, (subscription.failure_count ?? 0) + 1),
        last_failure_at: failureTime,
        updated_at: failureTime,
      }).eq('id', subscription.id);
      failed += 1;
    }
  }

  const runAt = new Date().toISOString();
  await service.from('push_configuration').update({ last_worker_run_at: runAt, last_worker_error: failed > 0 ? `${failed} envoi(s) en échec sur ce passage.` : null }).eq('singleton', true);
  return new Response(JSON.stringify({ processed: rows.length, sent, failed, canceled }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
