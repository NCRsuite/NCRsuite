-- NCR Suite V2.11.6 — Surveillance globale, erreurs runtime et validation de version
begin;

create table if not exists public.platform_release_state (
  singleton boolean primary key default true check (singleton),
  database_version text not null,
  expected_frontend_version text not null,
  expected_pwa_cache text not null,
  installed_at timestamptz not null default now(),
  installed_by uuid references auth.users(id) on delete set null,
  notes text
);

insert into public.platform_release_state (
  singleton,
  database_version,
  expected_frontend_version,
  expected_pwa_cache,
  installed_at,
  installed_by,
  notes
)
values (
  true,
  '2.11.6',
  '2.11.6',
  'ncr-suite-shell-v2.11.6-phase1-complete',
  now(),
  auth.uid(),
  'Phase 1 terminée : matrice d’accès, observabilité, tests critiques et validation de version.'
)
on conflict (singleton) do update
set database_version = excluded.database_version,
    expected_frontend_version = excluded.expected_frontend_version,
    expected_pwa_cache = excluded.expected_pwa_cache,
    installed_at = excluded.installed_at,
    installed_by = excluded.installed_by,
    notes = excluded.notes;

create table if not exists public.platform_runtime_errors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  source text not null check (source in ('react','window','promise','network','service_worker','release','unknown')),
  severity text not null default 'error' check (severity in ('info','warning','error','critical')),
  fingerprint text not null,
  message text not null check (char_length(message) between 1 and 2000),
  stack text,
  pathname text,
  app_version text,
  pwa_cache text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrences integer not null default 1 check (occurrences between 1 and 1000000),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_note text
);

create unique index if not exists idx_platform_runtime_errors_open_fingerprint
  on public.platform_runtime_errors(fingerprint)
  where resolved_at is null;

create index if not exists idx_platform_runtime_errors_recent
  on public.platform_runtime_errors(last_seen_at desc);

create index if not exists idx_platform_runtime_errors_org_recent
  on public.platform_runtime_errors(organization_id, last_seen_at desc);

create table if not exists public.platform_runtime_heartbeats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_key text not null check (char_length(session_key) between 8 and 120),
  app_version text not null,
  pwa_cache text not null,
  pathname text,
  online boolean not null default true,
  user_agent text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, session_key)
);

create index if not exists idx_platform_runtime_heartbeats_seen
  on public.platform_runtime_heartbeats(last_seen_at desc);

create index if not exists idx_platform_runtime_heartbeats_org_seen
  on public.platform_runtime_heartbeats(organization_id, last_seen_at desc);

alter table public.platform_release_state enable row level security;
alter table public.platform_runtime_errors enable row level security;
alter table public.platform_runtime_heartbeats enable row level security;

revoke all on public.platform_release_state from anon, authenticated;
revoke all on public.platform_runtime_errors from anon, authenticated;
revoke all on public.platform_runtime_heartbeats from anon, authenticated;

drop policy if exists platform_release_state_admin_read on public.platform_release_state;
create policy platform_release_state_admin_read on public.platform_release_state
for select to authenticated using (public.is_platform_admin());

drop policy if exists platform_runtime_errors_admin_read on public.platform_runtime_errors;
create policy platform_runtime_errors_admin_read on public.platform_runtime_errors
for select to authenticated using (public.is_platform_admin());

drop policy if exists platform_runtime_heartbeats_admin_read on public.platform_runtime_heartbeats;
create policy platform_runtime_heartbeats_admin_read on public.platform_runtime_heartbeats
for select to authenticated using (public.is_platform_admin());

create or replace function public.get_runtime_release_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_state public.platform_release_state%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  select * into v_state
  from public.platform_release_state
  where singleton = true;

  return jsonb_build_object(
    'database_version', v_state.database_version,
    'expected_frontend_version', v_state.expected_frontend_version,
    'expected_pwa_cache', v_state.expected_pwa_cache,
    'installed_at', v_state.installed_at
  );
end;
$$;

create or replace function public.record_runtime_heartbeat(
  p_organization_id uuid,
  p_session_key text,
  p_app_version text,
  p_pwa_cache text,
  p_pathname text,
  p_online boolean,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if p_organization_id is not null
     and not public.is_platform_admin()
     and not public.is_org_member(p_organization_id) then
    raise exception 'Accès interdit à cette entreprise.';
  end if;

  insert into public.platform_runtime_heartbeats (
    organization_id,
    user_id,
    session_key,
    app_version,
    pwa_cache,
    pathname,
    online,
    user_agent,
    first_seen_at,
    last_seen_at
  )
  values (
    p_organization_id,
    auth.uid(),
    left(trim(coalesce(p_session_key, '')), 120),
    left(trim(coalesce(p_app_version, 'inconnue')), 40),
    left(trim(coalesce(p_pwa_cache, 'inconnu')), 160),
    left(coalesce(p_pathname, '/'), 500),
    coalesce(p_online, true),
    left(coalesce(p_user_agent, ''), 1000),
    now(),
    now()
  )
  on conflict (user_id, session_key) do update
  set organization_id = excluded.organization_id,
      app_version = excluded.app_version,
      pwa_cache = excluded.pwa_cache,
      pathname = excluded.pathname,
      online = excluded.online,
      user_agent = excluded.user_agent,
      last_seen_at = now();
end;
$$;

create or replace function public.report_client_runtime_error(
  p_organization_id uuid,
  p_source text,
  p_severity text,
  p_message text,
  p_stack text,
  p_pathname text,
  p_app_version text,
  p_pwa_cache text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source text := lower(trim(coalesce(p_source, 'unknown')));
  v_severity text := lower(trim(coalesce(p_severity, 'error')));
  v_message text := left(trim(coalesce(p_message, 'Erreur inconnue')), 2000);
  v_fingerprint text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if p_organization_id is not null
     and not public.is_platform_admin()
     and not public.is_org_member(p_organization_id) then
    raise exception 'Accès interdit à cette entreprise.';
  end if;

  if v_source not in ('react','window','promise','network','service_worker','release','unknown') then
    v_source := 'unknown';
  end if;
  if v_severity not in ('info','warning','error','critical') then
    v_severity := 'error';
  end if;

  v_fingerprint := md5(
    coalesce(p_organization_id::text, 'platform') || '|' ||
    v_source || '|' ||
    lower(v_message) || '|' ||
    left(coalesce(p_pathname, '/'), 500) || '|' ||
    left(coalesce(p_app_version, 'inconnue'), 40)
  );

  insert into public.platform_runtime_errors (
    organization_id,
    user_id,
    source,
    severity,
    fingerprint,
    message,
    stack,
    pathname,
    app_version,
    pwa_cache,
    user_agent,
    metadata
  )
  values (
    p_organization_id,
    auth.uid(),
    v_source,
    v_severity,
    v_fingerprint,
    v_message,
    nullif(left(coalesce(p_stack, ''), 8000), ''),
    left(coalesce(p_pathname, '/'), 500),
    left(coalesce(p_app_version, 'inconnue'), 40),
    left(coalesce(p_pwa_cache, 'inconnu'), 160),
    left(coalesce(p_metadata ->> 'user_agent', ''), 1000),
    coalesce(p_metadata, '{}'::jsonb) - 'user_agent'
  )
  on conflict (fingerprint) where resolved_at is null do update
  set last_seen_at = now(),
      occurrences = least(public.platform_runtime_errors.occurrences + 1, 1000000),
      severity = case
        when excluded.severity = 'critical' then 'critical'
        when excluded.severity = 'error' and public.platform_runtime_errors.severity in ('info','warning') then 'error'
        when excluded.severity = 'warning' and public.platform_runtime_errors.severity = 'info' then 'warning'
        else public.platform_runtime_errors.severity
      end,
      stack = coalesce(excluded.stack, public.platform_runtime_errors.stack),
      metadata = public.platform_runtime_errors.metadata || excluded.metadata
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_resolve_runtime_error(
  p_error_id uuid,
  p_resolution_note text default null,
  p_resolved boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Accès administrateur NCR requis.';
  end if;

  update public.platform_runtime_errors
  set resolved_at = case when coalesce(p_resolved, true) then now() else null end,
      resolved_by = case when coalesce(p_resolved, true) then auth.uid() else null end,
      resolution_note = case when coalesce(p_resolved, true) then nullif(left(trim(coalesce(p_resolution_note, '')), 2000), '') else null end
  where id = p_error_id;

  if not found then
    raise exception 'Erreur runtime introuvable.';
  end if;
end;
$$;

create or replace function public.platform_global_health_report(p_hours integer default 24)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_hours integer := greatest(1, least(coalesce(p_hours, 24), 720));
  v_since timestamptz;
  v_release jsonb;
  v_runtime_open integer := 0;
  v_runtime_critical integer := 0;
  v_runtime_organizations integer := 0;
  v_active_clients integer := 0;
  v_outdated_clients integer := 0;
  v_email_failed integer := 0;
  v_email_stalled integer := 0;
  v_push_failed integer := 0;
  v_push_stalled integer := 0;
  v_urgent_support integer := 0;
  v_recent_errors jsonb := '[]'::jsonb;
  v_versions jsonb := '[]'::jsonb;
  v_access jsonb := '{}'::jsonb;
  v_required_objects jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Accès administrateur NCR requis.';
  end if;

  v_since := now() - make_interval(hours => v_hours);

  select jsonb_build_object(
    'database_version', database_version,
    'expected_frontend_version', expected_frontend_version,
    'expected_pwa_cache', expected_pwa_cache,
    'installed_at', installed_at
  )
  into v_release
  from public.platform_release_state
  where singleton = true;

  select count(*)::integer,
         count(*) filter (where severity = 'critical')::integer,
         count(distinct organization_id) filter (where organization_id is not null)::integer
  into v_runtime_open, v_runtime_critical, v_runtime_organizations
  from public.platform_runtime_errors
  where resolved_at is null and last_seen_at >= v_since;

  select count(*)::integer,
         count(*) filter (
           where app_version is distinct from coalesce(v_release ->> 'expected_frontend_version', '')
              or pwa_cache is distinct from coalesce(v_release ->> 'expected_pwa_cache', '')
         )::integer
  into v_active_clients, v_outdated_clients
  from public.platform_runtime_heartbeats
  where last_seen_at >= now() - interval '20 minutes';

  select count(*) filter (where status = 'failed')::integer,
         count(*) filter (
           where status in ('pending','sending')
             and scheduled_for <= now() - interval '15 minutes'
         )::integer
  into v_email_failed, v_email_stalled
  from public.email_outbox;

  select count(*) filter (where status = 'failed')::integer,
         count(*) filter (
           where status in ('pending','sending')
             and scheduled_for <= now() - interval '15 minutes'
         )::integer
  into v_push_failed, v_push_stalled
  from public.push_delivery_queue;

  select count(*)::integer
  into v_urgent_support
  from public.platform_support_tickets
  where status in ('open','in_progress','waiting_customer')
    and priority = 'urgent';

  select coalesce(jsonb_agg(to_jsonb(x) order by x.last_seen_at desc), '[]'::jsonb)
  into v_recent_errors
  from (
    select e.id,
           e.organization_id,
           o.name as organization_name,
           e.source,
           e.severity,
           e.message,
           e.pathname,
           e.app_version,
           e.pwa_cache,
           e.occurrences,
           e.first_seen_at,
           e.last_seen_at,
           e.resolved_at,
           e.resolution_note
    from public.platform_runtime_errors e
    left join public.organizations o on o.id = e.organization_id
    where e.last_seen_at >= v_since
    order by e.last_seen_at desc
    limit 60
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.clients desc), '[]'::jsonb)
  into v_versions
  from (
    select app_version,
           pwa_cache,
           count(*)::integer as clients,
           max(last_seen_at) as last_seen_at
    from public.platform_runtime_heartbeats
    where last_seen_at >= now() - interval '24 hours'
    group by app_version, pwa_cache
  ) x;

  v_access := public.platform_access_security_report();

  select jsonb_agg(jsonb_build_object(
    'object', object_name,
    'status', case when available then 'ok' else 'error' end,
    'detail', case when available then 'Disponible' else 'Migration ou objet manquant' end
  ))
  into v_required_objects
  from (
    values
      ('organizations', to_regclass('public.organizations') is not null),
      ('platform_support_tickets', to_regclass('public.platform_support_tickets') is not null),
      ('platform_runtime_errors', to_regclass('public.platform_runtime_errors') is not null),
      ('security_shifts', to_regclass('public.security_shifts') is not null),
      ('cleaning_interventions', to_regclass('public.cleaning_interventions') is not null),
      ('restaurant_orders', to_regclass('public.restaurant_orders') is not null),
      ('training_sessions', to_regclass('public.training_sessions') is not null)
  ) as required(object_name, available);

  return jsonb_build_object(
    'generated_at', now(),
    'window_hours', v_hours,
    'release', coalesce(v_release, '{}'::jsonb),
    'summary', jsonb_build_object(
      'runtime_open', v_runtime_open,
      'runtime_critical', v_runtime_critical,
      'runtime_organizations', v_runtime_organizations,
      'active_clients', v_active_clients,
      'outdated_clients', v_outdated_clients,
      'email_failed', v_email_failed,
      'email_stalled', v_email_stalled,
      'push_failed', v_push_failed,
      'push_stalled', v_push_stalled,
      'urgent_support', v_urgent_support
    ),
    'checks', jsonb_build_array(
      jsonb_build_object('key','release','label','Versions déployées','status',case when v_outdated_clients = 0 then 'ok' else 'warning' end,'detail',v_outdated_clients || ' session(s) sur une ancienne version'),
      jsonb_build_object('key','runtime','label','Erreurs interface','status',case when v_runtime_critical > 0 then 'error' when v_runtime_open > 0 then 'warning' else 'ok' end,'detail',v_runtime_open || ' erreur(s) ouverte(s), dont ' || v_runtime_critical || ' critique(s)'),
      jsonb_build_object('key','email','label','File e-mails','status',case when v_email_failed > 0 then 'error' when v_email_stalled > 0 then 'warning' else 'ok' end,'detail',v_email_failed || ' échec(s) · ' || v_email_stalled || ' bloqué(s)'),
      jsonb_build_object('key','push','label','Notifications Push','status',case when v_push_failed > 10 then 'error' when v_push_failed > 0 or v_push_stalled > 0 then 'warning' else 'ok' end,'detail',v_push_failed || ' échec(s) · ' || v_push_stalled || ' bloquée(s)'),
      jsonb_build_object('key','support','label','Support urgent','status',case when v_urgent_support > 0 then 'warning' else 'ok' end,'detail',v_urgent_support || ' ticket(s) urgent(s) ouvert(s)'),
      jsonb_build_object('key','access','label','Sécurité des accès','status',case when coalesce((v_access #>> '{summary,rls_disabled}')::integer,0) + coalesce((v_access #>> '{summary,policyless}')::integer,0) + coalesce((v_access #>> '{summary,insecure_security_definer}')::integer,0) + coalesce((v_access #>> '{summary,unexpected_anon_functions}')::integer,0) = 0 then 'ok' else 'error' end,'detail','Rapport RLS et fonctions publiques actualisé')
    ),
    'required_objects', coalesce(v_required_objects, '[]'::jsonb),
    'recent_errors', v_recent_errors,
    'versions', v_versions,
    'access_security', v_access
  );
end;
$$;

revoke all on function public.get_runtime_release_state() from public;
grant execute on function public.get_runtime_release_state() to authenticated;
revoke all on function public.record_runtime_heartbeat(uuid,text,text,text,text,boolean,text) from public;
grant execute on function public.record_runtime_heartbeat(uuid,text,text,text,text,boolean,text) to authenticated;
revoke all on function public.report_client_runtime_error(uuid,text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.report_client_runtime_error(uuid,text,text,text,text,text,text,text,jsonb) to authenticated;
revoke all on function public.admin_resolve_runtime_error(uuid,text,boolean) from public;
grant execute on function public.admin_resolve_runtime_error(uuid,text,boolean) to authenticated;
revoke all on function public.platform_global_health_report(integer) from public;
grant execute on function public.platform_global_health_report(integer) to authenticated;

commit;
