-- NCR Suite V2.6.0 — Notifications push PWA globales
-- À exécuter après 036_security_quotes_billing_cleanup.sql.
-- Installe le centre de notifications, les préférences par utilisateur,
-- les abonnements Web Push, la file d'envoi et les déclencheurs multi-métiers.

begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.push_configuration (
  singleton boolean primary key default true check (singleton),
  vapid_public_key text not null,
  vapid_private_key text not null,
  vapid_subject text not null default 'mailto:ncr-solutions@outlook.fr',
  worker_secret text not null,
  project_url text not null,
  cron_configured boolean not null default false,
  configured_at timestamptz not null default now(),
  configured_by uuid references auth.users(id) on delete set null,
  last_worker_run_at timestamptz,
  last_worker_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  expiration_time bigint,
  device_label text,
  user_agent text,
  active boolean not null default true,
  failure_count integer not null default 0 check (failure_count between 0 and 100),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_active
  on public.push_subscriptions(user_id, active, updated_at desc);

create table if not exists public.notification_preferences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  push_enabled boolean not null default false,
  planning_enabled boolean not null default true,
  appointments_enabled boolean not null default true,
  documents_enabled boolean not null default true,
  security_alerts_enabled boolean not null default true,
  billing_enabled boolean not null default true,
  system_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('planning','appointments','documents','security_alerts','billing','system')),
  event_type text not null,
  title text not null check (char_length(trim(title)) between 2 and 180),
  body text not null check (char_length(trim(body)) between 2 and 1000),
  url text not null default '/',
  urgency text not null default 'normal' check (urgency in ('low','normal','high','critical')),
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  scheduled_for timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active','canceled')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_events_user_org
  on public.notification_events(recipient_user_id, organization_id, scheduled_for desc)
  where status = 'active';
create index if not exists idx_notification_events_unread
  on public.notification_events(recipient_user_id, organization_id, scheduled_for)
  where status = 'active' and read_at is null;
create index if not exists idx_notification_events_entity
  on public.notification_events(organization_id, entity_type, entity_id, event_type);

create table if not exists public.push_delivery_queue (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.notification_events(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','canceled')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  scheduled_for timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  provider_status integer,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, subscription_id)
);

create index if not exists idx_push_delivery_pending
  on public.push_delivery_queue(status, scheduled_for, created_at)
  where status in ('pending','sending');

-- Aucune clé privée ou file d'envoi n'est exposée aux utilisateurs.
alter table public.push_configuration enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_events enable row level security;
alter table public.push_delivery_queue enable row level security;

revoke all on public.push_configuration from anon, authenticated;
revoke all on public.push_delivery_queue from anon, authenticated;
revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.notification_preferences from anon, authenticated;
revoke all on public.notification_events from anon, authenticated;

grant select on public.push_subscriptions to authenticated;
grant select on public.notification_preferences to authenticated;
grant select on public.notification_events to authenticated;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
for select to authenticated using (user_id = auth.uid());

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own on public.notification_preferences
for select to authenticated using (
  user_id = auth.uid() and public.is_org_member(organization_id)
);

drop policy if exists notification_events_select_own on public.notification_events;
create policy notification_events_select_own on public.notification_events
for select to authenticated using (
  recipient_user_id = auth.uid()
  and public.is_org_member(organization_id)
  and status = 'active'
);

create or replace function public.notification_category_allowed(
  p_organization_id uuid,
  p_user_id uuid,
  p_category text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_pref public.notification_preferences%rowtype;
begin
  select * into v_pref
  from public.notification_preferences
  where organization_id = p_organization_id and user_id = p_user_id;

  if v_pref.user_id is null or not v_pref.push_enabled then return false; end if;
  return case p_category
    when 'planning' then v_pref.planning_enabled
    when 'appointments' then v_pref.appointments_enabled
    when 'documents' then v_pref.documents_enabled
    when 'security_alerts' then v_pref.security_alerts_enabled
    when 'billing' then v_pref.billing_enabled
    when 'system' then v_pref.system_enabled
    else false
  end;
end;
$$;

create or replace function public.enqueue_user_notification_internal(
  p_organization_id uuid,
  p_user_id uuid,
  p_category text,
  p_event_type text,
  p_title text,
  p_body text,
  p_url text default '/',
  p_urgency text default 'normal',
  p_entity_type text default null,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_key text default null,
  p_scheduled_for timestamptz default now(),
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_event_id uuid;
begin
  if not exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id and user_id = p_user_id and status = 'active'
  ) then return null; end if;

  insert into public.notification_events (
    organization_id, recipient_user_id, category, event_type, title, body, url,
    urgency, entity_type, entity_id, metadata, dedupe_key, scheduled_for, expires_at
  ) values (
    p_organization_id, p_user_id, p_category, p_event_type,
    left(trim(p_title), 180), left(trim(p_body), 1000), coalesce(nullif(p_url, ''), '/'),
    p_urgency, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb),
    p_dedupe_key, coalesce(p_scheduled_for, now()), p_expires_at
  )
  on conflict (dedupe_key) do update
  set title = excluded.title,
      body = excluded.body,
      url = excluded.url,
      urgency = excluded.urgency,
      metadata = excluded.metadata,
      scheduled_for = excluded.scheduled_for,
      expires_at = excluded.expires_at,
      status = 'active'
  returning id into v_event_id;

  if public.notification_category_allowed(p_organization_id, p_user_id, p_category) then
    insert into public.push_delivery_queue (event_id, subscription_id, scheduled_for)
    select v_event_id, s.id, coalesce(p_scheduled_for, now())
    from public.push_subscriptions s
    where s.user_id = p_user_id and s.active = true
    on conflict (event_id, subscription_id) do update
      set status = 'pending', attempts = 0, scheduled_for = excluded.scheduled_for,
          locked_at = null, sent_at = null, provider_status = null,
          last_error = null, updated_at = now();
  end if;

  return v_event_id;
end;
$$;

create or replace function public.enqueue_org_notification_internal(
  p_organization_id uuid,
  p_roles text[],
  p_category text,
  p_event_type text,
  p_title text,
  p_body text,
  p_url text default '/',
  p_urgency text default 'normal',
  p_entity_type text default null,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_prefix text default null,
  p_scheduled_for timestamptz default now(),
  p_expires_at timestamptz default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_member record; v_count integer := 0;
begin
  for v_member in
    select user_id from public.organization_members
    where organization_id = p_organization_id and status = 'active' and role = any(p_roles)
  loop
    perform public.enqueue_user_notification_internal(
      p_organization_id, v_member.user_id, p_category, p_event_type, p_title, p_body,
      p_url, p_urgency, p_entity_type, p_entity_id, p_metadata,
      case when p_dedupe_prefix is null then null else p_dedupe_prefix || ':' || v_member.user_id::text end,
      p_scheduled_for, p_expires_at
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.cancel_scheduled_notifications_internal(
  p_organization_id uuid,
  p_entity_type text,
  p_entity_id text,
  p_event_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_events
  set status = 'canceled'
  where organization_id = p_organization_id
    and entity_type = p_entity_type
    and entity_id = p_entity_id
    and event_type = p_event_type
    and scheduled_for > now();

  update public.push_delivery_queue d
  set status = 'canceled', updated_at = now()
  from public.notification_events e
  where d.event_id = e.id
    and e.organization_id = p_organization_id
    and e.entity_type = p_entity_type
    and e.entity_id = p_entity_id
    and e.event_type = p_event_type
    and d.status in ('pending','sending');
end;
$$;

create or replace function public.get_push_public_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select vapid_public_key from public.push_configuration where singleton = true;
$$;

create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth_key text,
  p_expiration_time bigint default null,
  p_device_label text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if length(trim(p_endpoint)) < 20 or length(trim(p_p256dh)) < 20 or length(trim(p_auth_key)) < 8 then
    raise exception 'Abonnement push invalide.';
  end if;

  insert into public.push_subscriptions (
    user_id, endpoint, p256dh, auth_key, expiration_time, device_label, user_agent, active,
    failure_count, last_seen_at, updated_at
  ) values (
    auth.uid(), trim(p_endpoint), trim(p_p256dh), trim(p_auth_key), p_expiration_time,
    nullif(trim(coalesce(p_device_label, '')), ''), left(p_user_agent, 600), true, 0, now(), now()
  )
  on conflict (endpoint) do update
  set user_id = auth.uid(), p256dh = excluded.p256dh, auth_key = excluded.auth_key,
      expiration_time = excluded.expiration_time, device_label = excluded.device_label,
      user_agent = excluded.user_agent, active = true, failure_count = 0,
      last_seen_at = now(), updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.disable_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  update public.push_subscriptions
  set active = false, updated_at = now()
  where user_id = auth.uid() and endpoint = p_endpoint;
end;
$$;

create or replace function public.save_notification_preferences(
  p_organization_id uuid,
  p_push_enabled boolean,
  p_planning_enabled boolean,
  p_appointments_enabled boolean,
  p_documents_enabled boolean,
  p_security_alerts_enabled boolean,
  p_billing_enabled boolean,
  p_system_enabled boolean
)
returns public.notification_preferences
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.notification_preferences%rowtype;
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'Accès insuffisant.';
  end if;

  insert into public.notification_preferences (
    organization_id, user_id, push_enabled, planning_enabled, appointments_enabled,
    documents_enabled, security_alerts_enabled, billing_enabled, system_enabled
  ) values (
    p_organization_id, auth.uid(), coalesce(p_push_enabled, false),
    coalesce(p_planning_enabled, true), coalesce(p_appointments_enabled, true),
    coalesce(p_documents_enabled, true), coalesce(p_security_alerts_enabled, true),
    coalesce(p_billing_enabled, true), coalesce(p_system_enabled, true)
  )
  on conflict (organization_id, user_id) do update
  set push_enabled = excluded.push_enabled,
      planning_enabled = excluded.planning_enabled,
      appointments_enabled = excluded.appointments_enabled,
      documents_enabled = excluded.documents_enabled,
      security_alerts_enabled = excluded.security_alerts_enabled,
      billing_enabled = excluded.billing_enabled,
      system_enabled = excluded.system_enabled,
      updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.mark_notification_read(p_organization_id uuid, p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_events
  set read_at = coalesce(read_at, now())
  where id = p_event_id and organization_id = p_organization_id and recipient_user_id = auth.uid();
end;
$$;

create or replace function public.mark_all_notifications_read(p_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  update public.notification_events
  set read_at = now()
  where organization_id = p_organization_id and recipient_user_id = auth.uid()
    and status = 'active' and scheduled_for <= now() and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.queue_test_push(p_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'Accès insuffisant.';
  end if;
  return public.enqueue_user_notification_internal(
    p_organization_id, auth.uid(), 'system', 'push_test',
    'Notifications NCR Suite activées',
    'Ce téléphone peut maintenant recevoir les alertes de votre espace, même lorsque la PWA est fermée.',
    '/notifications', 'normal', 'organization', p_organization_id::text,
    jsonb_build_object('test', true), 'push-test:' || auth.uid()::text || ':' || floor(extract(epoch from now()) / 60)::text,
    now(), now() + interval '1 day'
  );
end;
$$;

-- État et initialisation réservés au super-administrateur NCR.
create or replace function public.platform_push_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_can_manage boolean; v_config public.push_configuration%rowtype;
begin
  select exists(
    select 1 from public.platform_admins where user_id = auth.uid() and active = true and role = 'super_admin'
  ) into v_can_manage;
  if not v_can_manage then raise exception 'Accès super-administrateur requis.'; end if;

  select * into v_config from public.push_configuration where singleton = true;
  return jsonb_build_object(
    'configured', v_config.singleton is not null,
    'public_key', v_config.vapid_public_key,
    'cron_configured', coalesce(v_config.cron_configured, false),
    'configured_at', v_config.configured_at,
    'last_worker_run_at', v_config.last_worker_run_at,
    'last_worker_error', v_config.last_worker_error,
    'active_subscriptions', (select count(*) from public.push_subscriptions where active = true),
    'pending_deliveries', (select count(*) from public.push_delivery_queue where status = 'pending')
  );
end;
$$;

create or replace function public.platform_initialize_push(
  p_vapid_public_key text,
  p_vapid_private_key text,
  p_vapid_subject text,
  p_worker_secret text,
  p_project_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_job record; v_command text; v_url text;
begin
  -- La fonction est appelée par l'Edge Function avec la clé service_role.
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Appel serveur requis.';
  end if;

  if length(p_vapid_public_key) < 40 or length(p_vapid_private_key) < 20
     or length(p_worker_secret) < 32 or p_project_url !~ '^https://[a-z0-9-]+\.supabase\.co$' then
    raise exception 'Configuration push invalide.';
  end if;

  v_url := rtrim(p_project_url, '/');
  insert into public.push_configuration (
    singleton, vapid_public_key, vapid_private_key, vapid_subject, worker_secret, project_url,
    cron_configured, configured_at, updated_at
  ) values (
    true, p_vapid_public_key, p_vapid_private_key, coalesce(nullif(trim(p_vapid_subject), ''), 'mailto:ncr-solutions@outlook.fr'),
    p_worker_secret, v_url, false, now(), now()
  ) on conflict (singleton) do update
  set vapid_public_key = excluded.vapid_public_key,
      vapid_private_key = excluded.vapid_private_key,
      vapid_subject = excluded.vapid_subject,
      worker_secret = excluded.worker_secret,
      project_url = excluded.project_url,
      configured_at = now(), updated_at = now(), last_worker_error = null;

  for v_job in select jobid from cron.job where jobname = 'ncr-suite-process-push' loop
    perform cron.unschedule(v_job.jobid);
  end loop;

  v_command := format(
    'select net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'',''application/json'',''x-ncr-push-secret'',%L), body := ''{}''::jsonb) as request_id;',
    v_url || '/functions/v1/process-push-notifications', p_worker_secret
  );
  perform cron.schedule('ncr-suite-process-push', '* * * * *', v_command);

  update public.push_configuration set cron_configured = true, updated_at = now() where singleton = true;
  return jsonb_build_object('configured', true, 'public_key', p_vapid_public_key, 'cron_configured', true);
end;
$$;

-- Déclencheurs métiers -------------------------------------------------------
create or replace function public.push_notify_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_client text; v_service text; v_staff text; v_timezone text; v_local text; v_hours integer;
begin
  select trim(concat_ws(' ', c.first_name, c.last_name)), s.name, trim(concat_ws(' ', st.first_name, st.last_name)), o.timezone, o.booking_reminder_hours
  into v_client, v_service, v_staff, v_timezone, v_hours
  from public.clients c
  join public.services s on s.organization_id = new.organization_id and s.id = new.service_id
  join public.staff st on st.organization_id = new.organization_id and st.id = new.staff_id
  join public.organizations o on o.id = new.organization_id
  where c.organization_id = new.organization_id and c.id = new.client_id;
  v_local := to_char(new.starts_at at time zone coalesce(v_timezone, 'Europe/Paris'), 'DD/MM/YYYY à HH24:MI');

  if tg_op = 'INSERT' then
    perform public.enqueue_org_notification_internal(new.organization_id, array['owner','admin','manager'], 'appointments', 'appointment_created',
      case when new.source = 'public' then 'Nouveau rendez-vous en ligne' else 'Nouveau rendez-vous' end,
      coalesce(v_client, 'Un client') || ' · ' || coalesce(v_service, 'Prestation') || ' · ' || v_local,
      '/rendez-vous', 'normal', 'appointment', new.id::text,
      jsonb_build_object('appointment_id', new.id, 'staff', v_staff), 'appointment-created:' || new.id::text);
  elsif old.starts_at is distinct from new.starts_at or old.status is distinct from new.status or old.staff_id is distinct from new.staff_id then
    perform public.enqueue_org_notification_internal(new.organization_id, array['owner','admin','manager'], 'appointments', 'appointment_updated',
      case when new.status = 'cancelled' then 'Rendez-vous annulé' else 'Rendez-vous modifié' end,
      coalesce(v_client, 'Client') || ' · ' || coalesce(v_service, 'Prestation') || ' · ' || v_local,
      '/rendez-vous', case when new.status = 'cancelled' then 'high' else 'normal' end,
      'appointment', new.id::text, jsonb_build_object('appointment_id', new.id, 'status', new.status),
      'appointment-updated:' || new.id::text || ':' || new.status || ':' || extract(epoch from new.starts_at)::bigint::text);
  end if;

  perform public.cancel_scheduled_notifications_internal(new.organization_id, 'appointment', new.id::text, 'appointment_reminder');
  if new.status in ('pending','confirmed') and coalesce(v_hours, 0) > 0 and new.starts_at > now() then
    perform public.enqueue_org_notification_internal(new.organization_id, array['owner','admin','manager'], 'appointments', 'appointment_reminder',
      'Rendez-vous à venir', coalesce(v_client, 'Client') || ' · ' || coalesce(v_service, 'Prestation') || ' · ' || v_local,
      '/rendez-vous', 'normal', 'appointment', new.id::text, jsonb_build_object('appointment_id', new.id),
      'appointment-reminder:' || new.id::text || ':' || extract(epoch from new.starts_at)::bigint::text,
      greatest(now(), new.starts_at - make_interval(hours => v_hours)), new.starts_at + interval '2 hours');
  end if;
  return new;
end;
$$;

drop trigger if exists push_notify_appointment on public.appointments;
create trigger push_notify_appointment
after insert or update of starts_at, status, staff_id on public.appointments
for each row execute procedure public.push_notify_appointment();

create or replace function public.push_notify_training_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_title text; v_timezone text; v_local text;
begin
  select coalesce(new.title, p.title, 'Session de formation'), o.timezone
  into v_title, v_timezone
  from public.training_programs p join public.organizations o on o.id = new.organization_id
  where p.organization_id = new.organization_id and p.id = new.program_id;
  v_local := to_char(new.starts_at at time zone coalesce(v_timezone, 'Europe/Paris'), 'DD/MM/YYYY à HH24:MI');

  if tg_op = 'INSERT' then
    perform public.enqueue_org_notification_internal(new.organization_id, array['owner','admin','manager','employee'], 'planning', 'training_session_created',
      'Nouvelle session planifiée', v_title || ' · ' || v_local, '/sessions', 'normal',
      'training_session', new.id::text, jsonb_build_object('session_id', new.id), 'training-session-created:' || new.id::text);
  elsif old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at or old.status is distinct from new.status then
    perform public.enqueue_org_notification_internal(new.organization_id, array['owner','admin','manager','employee'], 'planning', 'training_session_updated',
      case when new.status = 'canceled' then 'Session annulée' else 'Session modifiée' end,
      v_title || ' · ' || v_local, '/sessions', case when new.status = 'canceled' then 'high' else 'normal' end,
      'training_session', new.id::text, jsonb_build_object('session_id', new.id, 'status', new.status),
      'training-session-updated:' || new.id::text || ':' || new.status || ':' || extract(epoch from new.starts_at)::bigint::text);
  end if;

  perform public.cancel_scheduled_notifications_internal(new.organization_id, 'training_session', new.id::text, 'training_session_reminder');
  if new.status in ('draft','scheduled') and new.starts_at > now() then
    perform public.enqueue_org_notification_internal(new.organization_id, array['owner','admin','manager','employee'], 'planning', 'training_session_reminder',
      'Session demain', v_title || ' débute le ' || v_local, '/sessions', 'normal',
      'training_session', new.id::text, jsonb_build_object('session_id', new.id),
      'training-session-reminder:' || new.id::text || ':' || extract(epoch from new.starts_at)::bigint::text,
      greatest(now(), new.starts_at - interval '24 hours'), new.starts_at + interval '4 hours');
  end if;
  return new;
end;
$$;

drop trigger if exists push_notify_training_session on public.training_sessions;
create trigger push_notify_training_session
after insert or update of starts_at, ends_at, status on public.training_sessions
for each row execute procedure public.push_notify_training_session();

create or replace function public.push_notify_training_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.enqueue_org_notification_internal(new.organization_id, array['owner','admin','manager','employee'], 'documents', 'training_document_published',
      'Nouveau document de formation', new.title, '/documents', 'normal', 'training_document', new.id::text,
      jsonb_build_object('document_id', new.id, 'category', new.category, 'session_id', new.session_id),
      'training-document:' || new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists push_notify_training_document on public.training_documents;
create trigger push_notify_training_document
after insert or update of status on public.training_documents
for each row execute procedure public.push_notify_training_document();

create or replace function public.push_notify_security_shift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid; v_site text; v_timezone text; v_local text;
begin
  select a.linked_user_id, s.name, s.timezone into v_user_id, v_site, v_timezone
  from public.security_agents a join public.security_sites s on s.organization_id = new.organization_id and s.id = new.site_id
  where a.organization_id = new.organization_id and a.id = new.agent_id;
  if v_user_id is null then return new; end if;
  v_local := to_char(new.starts_at at time zone coalesce(v_timezone, 'Europe/Paris'), 'DD/MM/YYYY à HH24:MI');

  if tg_op = 'INSERT' then
    perform public.enqueue_user_notification_internal(new.organization_id, v_user_id, 'planning', 'security_shift_created',
      'Nouvelle vacation planifiée', coalesce(v_site, 'Site') || ' · ' || v_local, '/terrain', 'normal',
      'security_shift', new.id::text, jsonb_build_object('shift_id', new.id, 'site_id', new.site_id), 'security-shift-created:' || new.id::text);
  elsif old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at or old.site_id is distinct from new.site_id or old.status is distinct from new.status then
    perform public.enqueue_user_notification_internal(new.organization_id, v_user_id, 'planning', 'security_shift_updated',
      case when new.status = 'canceled' then 'Vacation annulée' else 'Vacation modifiée' end,
      coalesce(v_site, 'Site') || ' · ' || v_local, '/terrain', case when new.status = 'canceled' then 'high' else 'normal' end,
      'security_shift', new.id::text, jsonb_build_object('shift_id', new.id, 'status', new.status),
      'security-shift-updated:' || new.id::text || ':' || new.status || ':' || extract(epoch from new.starts_at)::bigint::text);
  end if;

  perform public.cancel_scheduled_notifications_internal(new.organization_id, 'security_shift', new.id::text, 'security_shift_reminder');
  if new.status = 'planned' and new.starts_at > now() then
    perform public.enqueue_user_notification_internal(new.organization_id, v_user_id, 'planning', 'security_shift_reminder',
      'Vacation dans 1 heure', coalesce(v_site, 'Site') || ' · ' || v_local, '/terrain', 'high',
      'security_shift', new.id::text, jsonb_build_object('shift_id', new.id),
      'security-shift-reminder:' || new.id::text || ':' || extract(epoch from new.starts_at)::bigint::text,
      greatest(now(), new.starts_at - interval '1 hour'), new.starts_at + interval '2 hours');
  end if;
  return new;
end;
$$;

drop trigger if exists push_notify_security_shift on public.security_shifts;
create trigger push_notify_security_shift
after insert or update of starts_at, ends_at, site_id, agent_id, status on public.security_shifts
for each row execute procedure public.push_notify_security_shift();

create or replace function public.push_notify_security_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_agent record; v_site text;
begin
  select name into v_site from public.security_sites where organization_id = new.organization_id and id = new.site_id;
  if new.agent_id is not null then
    select linked_user_id into v_agent from public.security_agents where organization_id = new.organization_id and id = new.agent_id;
    if v_agent.linked_user_id is not null then
      perform public.enqueue_user_notification_internal(new.organization_id, v_agent.linked_user_id, 'security_alerts', 'security_site_alert',
        new.title, coalesce(v_site, 'Site') || ' · ' || new.message, '/consignes',
        case new.severity when 'critical' then 'critical' when 'warning' then 'high' else 'normal' end,
        'security_alert', new.id::text, jsonb_build_object('alert_id', new.id, 'site_id', new.site_id), 'security-alert:' || new.id::text || ':' || v_agent.linked_user_id::text);
    end if;
  else
    for v_agent in select linked_user_id from public.security_agents where organization_id = new.organization_id and linked_user_id is not null and status = 'active' loop
      perform public.enqueue_user_notification_internal(new.organization_id, v_agent.linked_user_id, 'security_alerts', 'security_site_alert',
        new.title, coalesce(v_site, 'Site') || ' · ' || new.message, '/consignes',
        case new.severity when 'critical' then 'critical' when 'warning' then 'high' else 'normal' end,
        'security_alert', new.id::text, jsonb_build_object('alert_id', new.id, 'site_id', new.site_id), 'security-alert:' || new.id::text || ':' || v_agent.linked_user_id::text);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists push_notify_security_alert on public.security_alerts;
create trigger push_notify_security_alert after insert on public.security_alerts
for each row execute procedure public.push_notify_security_alert();

create or replace function public.push_notify_security_emergency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_agent text; v_site text;
begin
  select trim(concat_ws(' ', a.first_name, a.last_name)), s.name into v_agent, v_site
  from public.security_agents a
  join public.security_shifts sh on sh.organization_id = new.organization_id and sh.id = new.shift_id
  join public.security_sites s on s.organization_id = new.organization_id and s.id = sh.site_id
  where a.organization_id = new.organization_id and a.id = new.agent_id;

  perform public.enqueue_org_notification_internal(new.organization_id, array['owner','admin','manager'], 'security_alerts', 'security_emergency',
    case when new.alert_type = 'sos' then 'SOS AGENT' else 'ALERTE PTI' end,
    coalesce(v_agent, 'Agent') || ' · ' || coalesce(v_site, 'Site') || coalesce(' · ' || nullif(new.message, ''), ''),
    '/supervision', 'critical', 'security_emergency', new.id::text,
    jsonb_build_object('alert_id', new.id, 'agent_id', new.agent_id, 'shift_id', new.shift_id, 'alert_type', new.alert_type),
    'security-emergency:' || new.id::text, now(), now() + interval '24 hours');
  return new;
end;
$$;

drop trigger if exists push_notify_security_emergency on public.security_emergency_alerts;
create trigger push_notify_security_emergency after insert on public.security_emergency_alerts
for each row execute procedure public.push_notify_security_emergency();

create or replace function public.push_notify_security_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.document_kind = 'invoice' and new.status in ('sent','paid','overdue') then
    perform public.enqueue_org_notification_internal(new.organization_id, array['owner','admin'], 'billing', 'security_invoice_status',
      case new.status when 'paid' then 'Facture payée' when 'overdue' then 'Facture en retard' else 'Facture envoyée' end,
      new.invoice_number || ' · ' || to_char(new.total_cents / 100.0, 'FM999G999G990D00') || ' €',
      '/facturation', case when new.status = 'overdue' then 'high' else 'normal' end,
      'security_invoice', new.id::text, jsonb_build_object('invoice_id', new.id, 'status', new.status),
      'security-invoice-status:' || new.id::text || ':' || new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists push_notify_security_invoice on public.security_invoices;
create trigger push_notify_security_invoice after update of status on public.security_invoices
for each row execute procedure public.push_notify_security_invoice();

-- Triggers updated_at.
drop trigger if exists set_push_configuration_updated_at on public.push_configuration;
create trigger set_push_configuration_updated_at before update on public.push_configuration
for each row execute procedure public.set_updated_at();
drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at before update on public.push_subscriptions
for each row execute procedure public.set_updated_at();
drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at before update on public.notification_preferences
for each row execute procedure public.set_updated_at();
drop trigger if exists set_push_delivery_queue_updated_at on public.push_delivery_queue;
create trigger set_push_delivery_queue_updated_at before update on public.push_delivery_queue
for each row execute procedure public.set_updated_at();

-- Permissions des RPC publiques.
revoke all on function public.notification_category_allowed(uuid,uuid,text) from public;
revoke all on function public.enqueue_user_notification_internal(uuid,uuid,text,text,text,text,text,text,text,text,jsonb,text,timestamptz,timestamptz) from public;
revoke all on function public.enqueue_org_notification_internal(uuid,text[],text,text,text,text,text,text,text,text,jsonb,text,timestamptz,timestamptz) from public;
revoke all on function public.cancel_scheduled_notifications_internal(uuid,text,text,text) from public;
revoke all on function public.platform_initialize_push(text,text,text,text,text) from public;

grant execute on function public.platform_initialize_push(text,text,text,text,text) to service_role;
grant execute on function public.get_push_public_key() to authenticated;
grant execute on function public.save_push_subscription(text,text,text,bigint,text,text) to authenticated;
grant execute on function public.disable_push_subscription(text) to authenticated;
grant execute on function public.save_notification_preferences(uuid,boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;
grant execute on function public.mark_notification_read(uuid,uuid) to authenticated;
grant execute on function public.mark_all_notifications_read(uuid) to authenticated;
grant execute on function public.queue_test_push(uuid) to authenticated;
grant execute on function public.platform_push_status() to authenticated;

-- Realtime pour le centre de notifications.
do $$ begin
  alter publication supabase_realtime add table public.notification_events;
exception when duplicate_object then null; end $$;

insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
select null, null, 'platform.push_notifications_installed', 'platform', 'v2.6.0', jsonb_build_object('version', '2.6.0')
where not exists (
  select 1 from public.audit_logs where action = 'platform.push_notifications_installed' and entity_id = 'v2.6.0'
);

commit;
