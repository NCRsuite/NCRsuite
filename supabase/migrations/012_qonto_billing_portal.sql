-- NCR Suite V2.2.0 — portail d'abonnement, Qonto et architecture multi-prestataires
-- À exécuter après 011_plan_entitlements_mobile.sql.

-- 1. Le prestataire reste abstrait : Qonto maintenant, Stripe possible plus tard.
alter table public.organization_subscriptions
  drop constraint if exists organization_subscriptions_provider_check;

alter table public.organization_subscriptions
  add constraint organization_subscriptions_provider_check
  check (provider in ('manual','qonto','stripe'));

alter table public.organization_subscriptions
  add column if not exists provider_checkout_url text,
  add column if not exists provider_payment_reference text,
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb,
  add column if not exists payment_confirmed_at timestamptz;

alter table public.plan_catalog
  add column if not exists sort_order integer not null default 0,
  add column if not exists short_description text;

update public.plan_catalog
set sort_order = case plan_key
      when 'decouverte' then 10
      when 'essentielle' then 20
      when 'professionnelle' then 30
      when 'metier' then 40
      else 100
    end,
    short_description = case plan_key
      when 'decouverte' then 'L’essentiel pour démarrer seul.'
      when 'essentielle' then 'L’équipe, les rappels et la gestion client en ligne.'
      when 'professionnelle' then 'La personnalisation complète et les permissions avancées.'
      when 'metier' then 'Une configuration sur mesure pour les besoins complexes.'
      else short_description
    end,
    updated_at = now();

create table if not exists public.platform_billing_settings (
  singleton boolean primary key default true check (singleton),
  default_provider text not null default 'qonto' check (default_provider in ('manual','qonto','stripe')),
  default_trial_days integer not null default 14 check (default_trial_days between 0 and 90),
  default_trial_plan text not null default 'professionnelle' references public.plan_catalog(plan_key),
  terms_version text not null default '2026-07',
  terms_text text not null default 'L’abonnement est facturé selon la formule choisie. L’accès aux fonctions dépend du règlement et du statut du compte.',
  cancellation_text text not null default 'Toute résiliation prend effet selon les conditions acceptées lors de la souscription et la période déjà réglée.',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_billing_settings (singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists public.billing_plan_links (
  plan_key text primary key references public.plan_catalog(plan_key) on delete cascade,
  provider text not null default 'qonto' check (provider in ('manual','qonto','stripe')),
  checkout_url text,
  active boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_plan_links_url_check check (
    checkout_url is null
    or checkout_url ~ '^https://[^[:space:]]+$'
  )
);

insert into public.billing_plan_links (plan_key, provider, active)
select plan_key, 'qonto', false
from public.plan_catalog
on conflict (plan_key) do nothing;

create table if not exists public.subscription_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  current_plan text not null references public.plan_catalog(plan_key),
  requested_plan text not null references public.plan_catalog(plan_key),
  request_type text not null check (request_type in ('upgrade','downgrade','reactivation','metier')),
  status text not null default 'pending_review' check (status in ('payment_pending','pending_review','approved','rejected','canceled')),
  provider text not null default 'manual' check (provider in ('manual','qonto','stripe')),
  checkout_url_snapshot text,
  request_reference text not null unique,
  accepted_terms_at timestamptz not null,
  terms_version text not null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  provider_payment_reference text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_subscription_request_open_per_org
on public.subscription_change_requests(organization_id)
where status in ('payment_pending','pending_review');

create table if not exists public.subscription_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid references public.subscription_change_requests(id) on delete set null,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  from_plan text,
  to_plan text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscription_requests_org_created
  on public.subscription_change_requests(organization_id, created_at desc);
create index if not exists idx_subscription_requests_status_created
  on public.subscription_change_requests(status, created_at desc);
create index if not exists idx_subscription_events_org_created
  on public.subscription_events(organization_id, created_at desc);

-- 2. Horodatage et accès strictement via RPC.
drop trigger if exists set_platform_billing_settings_updated_at on public.platform_billing_settings;
create trigger set_platform_billing_settings_updated_at
before update on public.platform_billing_settings
for each row execute procedure public.set_updated_at();

drop trigger if exists set_billing_plan_links_updated_at on public.billing_plan_links;
create trigger set_billing_plan_links_updated_at
before update on public.billing_plan_links
for each row execute procedure public.set_updated_at();

drop trigger if exists set_subscription_change_requests_updated_at on public.subscription_change_requests;
create trigger set_subscription_change_requests_updated_at
before update on public.subscription_change_requests
for each row execute procedure public.set_updated_at();

alter table public.platform_billing_settings enable row level security;
alter table public.billing_plan_links enable row level security;
alter table public.subscription_change_requests enable row level security;
alter table public.subscription_events enable row level security;

revoke all on public.platform_billing_settings from anon, authenticated;
revoke all on public.billing_plan_links from anon, authenticated;
revoke all on public.subscription_change_requests from anon, authenticated;
revoke all on public.subscription_events from anon, authenticated;

-- 3. Les nouvelles entreprises démarrent en essai selon le réglage de la plateforme.
create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_business_type text,
  p_primary_color text default '#2997ff'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := trim(p_name);
  v_slug text := lower(trim(p_slug));
  v_trial_days integer := 0;
  v_trial_plan text := 'decouverte';
  v_status text := 'active';
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'Invalid organization name';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) not between 2 and 80 then
    raise exception 'Invalid organization slug';
  end if;

  if p_business_type not in ('coiffure','nettoyage','securite','formation','artisan') then
    raise exception 'Unsupported business type';
  end if;

  if p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Invalid primary color';
  end if;

  select default_trial_days, default_trial_plan
  into v_trial_days, v_trial_plan
  from public.platform_billing_settings
  where singleton = true;

  v_trial_days := coalesce(v_trial_days, 0);
  v_trial_plan := coalesce(v_trial_plan, 'decouverte');
  v_status := case when v_trial_days > 0 then 'trial' else 'active' end;

  insert into public.organizations (name, slug, business_type, plan, status, primary_color, created_by)
  values (v_name, v_slug, p_business_type, v_trial_plan, v_status, p_primary_color, auth.uid())
  returning id into v_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_id, auth.uid(), 'owner', 'active');

  insert into public.organization_modules (organization_id, module_key)
  values
    (v_id, 'dashboard'),
    (v_id, 'settings'),
    (v_id, p_business_type)
  on conflict do nothing;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    v_id,
    auth.uid(),
    'organization.created',
    'organization',
    v_id::text,
    jsonb_build_object('trial_days', v_trial_days, 'initial_plan', v_trial_plan)
  );

  return v_id;
end;
$$;

create or replace function public.initialize_organization_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price integer;
  v_trial_days integer := 0;
begin
  select monthly_price_cents into v_price
  from public.plan_catalog
  where plan_key = new.plan;

  select default_trial_days into v_trial_days
  from public.platform_billing_settings
  where singleton = true;

  insert into public.organization_subscriptions (
    organization_id,
    plan_key,
    status,
    provider,
    monthly_price_cents,
    trial_ends_at,
    current_period_start
  ) values (
    new.id,
    new.plan,
    case when new.status = 'trial' then 'trialing' else 'active' end,
    'manual',
    coalesce(v_price, 0),
    case when new.status = 'trial' then now() + make_interval(days => coalesce(v_trial_days, 0)) else null end,
    case when new.status = 'active' then now() else null end
  )
  on conflict (organization_id) do nothing;

  return new;
end;
$$;

-- 4. Vue abonnement côté entreprise.
create or replace function public.organization_billing_portal(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_result jsonb;
  v_active_members integer := 0;
  v_clients integer := 0;
  v_services integer := 0;
  v_appointments_month integer := 0;
  v_storage_bytes bigint := 0;
begin
  if not public.is_org_member_any_status(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;

  select count(*)::integer into v_active_members
  from public.organization_members
  where organization_id = p_organization_id and status = 'active';

  select count(*)::integer into v_clients
  from public.clients
  where organization_id = p_organization_id;

  if to_regclass('public.services') is not null then
    select count(*)::integer into v_services
    from public.services
    where organization_id = p_organization_id and active = true;
  end if;

  if to_regclass('public.appointments') is not null then
    select count(*)::integer into v_appointments_month
    from public.appointments
    where organization_id = p_organization_id
      and starts_at >= date_trunc('month', now())
      and starts_at < date_trunc('month', now()) + interval '1 month';
  end if;

  if to_regclass('storage.objects') is not null then
    select coalesce(sum(
      case
        when metadata ? 'size' and (metadata ->> 'size') ~ '^[0-9]+$'
          then (metadata ->> 'size')::bigint
        else 0
      end
    ), 0)
    into v_storage_bytes
    from storage.objects
    where bucket_id = 'organization-branding'
      and split_part(name, '/', 1) = p_organization_id::text;
  end if;

  select jsonb_build_object(
    'subscription', jsonb_build_object(
      'plan', o.plan,
      'plan_name', p.display_name,
      'organization_status', o.status,
      'subscription_status', coalesce(s.status, 'active'),
      'provider', coalesce(s.provider, 'manual'),
      'monthly_price_cents', coalesce(s.monthly_price_cents, p.monthly_price_cents),
      'trial_ends_at', s.trial_ends_at,
      'current_period_start', s.current_period_start,
      'current_period_end', s.current_period_end,
      'cancel_at_period_end', coalesce(s.cancel_at_period_end, false),
      'payment_confirmed_at', s.payment_confirmed_at
    ),
    'usage', jsonb_build_object(
      'active_members', v_active_members,
      'member_limit', p.member_limit,
      'clients', v_clients,
      'active_services', v_services,
      'appointments_this_month', v_appointments_month,
      'storage_bytes', v_storage_bytes
    ),
    'plans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'plan_key', pc.plan_key,
        'display_name', pc.display_name,
        'monthly_price_cents', pc.monthly_price_cents,
        'member_limit', pc.member_limit,
        'features', pc.features,
        'short_description', pc.short_description,
        'sort_order', pc.sort_order,
        'provider', coalesce(bl.provider, bs.default_provider),
        'checkout_url', case when coalesce(bl.active, false) then bl.checkout_url else null end,
        'checkout_active', coalesce(bl.active, false)
      ) order by pc.sort_order), '[]'::jsonb)
      from public.plan_catalog pc
      left join public.billing_plan_links bl on bl.plan_key = pc.plan_key
      cross join public.platform_billing_settings bs
      where pc.active = true and bs.singleton = true
    ),
    'open_request', (
      select to_jsonb(r)
      from (
        select id, current_plan, requested_plan, request_type, status, provider,
               request_reference, checkout_url_snapshot, created_at
        from public.subscription_change_requests
        where organization_id = p_organization_id
          and status in ('payment_pending','pending_review')
        order by created_at desc
        limit 1
      ) r
    ),
    'history', (
      select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc), '[]'::jsonb)
      from (
        select event_type, from_plan, to_plan, metadata, created_at
        from public.subscription_events
        where organization_id = p_organization_id
        order by created_at desc
        limit 20
      ) e
    ),
    'terms', (
      select jsonb_build_object(
        'version', terms_version,
        'text', terms_text,
        'cancellation_text', cancellation_text
      )
      from public.platform_billing_settings
      where singleton = true
    )
  ) into v_result
  from public.organizations o
  join public.plan_catalog p on p.plan_key = o.plan
  left join public.organization_subscriptions s on s.organization_id = o.id
  where o.id = p_organization_id;

  return v_result;
end;
$$;

create or replace function public.request_subscription_change(
  p_organization_id uuid,
  p_requested_plan text,
  p_accept_terms boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_plan text;
  v_subscription_status text;
  v_provider text := 'manual';
  v_checkout_url text;
  v_status text := 'pending_review';
  v_request_type text;
  v_terms_version text;
  v_request_id uuid;
  v_reference text;
  v_current_rank integer;
  v_requested_rank integer;
begin
  if not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seul le propriétaire ou un administrateur peut gérer l’abonnement.';
  end if;

  if not coalesce(p_accept_terms, false) then
    raise exception 'Vous devez accepter les conditions d’abonnement.';
  end if;

  if p_requested_plan not in ('decouverte','essentielle','professionnelle','metier') then
    raise exception 'Formule invalide.';
  end if;

  if exists (
    select 1 from public.subscription_change_requests
    where organization_id = p_organization_id
      and status in ('payment_pending','pending_review')
  ) then
    raise exception 'Une demande de changement est déjà en cours.';
  end if;

  select o.plan, coalesce(s.status, 'active')
  into v_current_plan, v_subscription_status
  from public.organizations o
  left join public.organization_subscriptions s on s.organization_id = o.id
  where o.id = p_organization_id;

  if v_current_plan is null then
    raise exception 'Entreprise introuvable.';
  end if;

  select terms_version into v_terms_version
  from public.platform_billing_settings
  where singleton = true;

  v_current_rank := case v_current_plan when 'decouverte' then 1 when 'essentielle' then 2 when 'professionnelle' then 3 else 4 end;
  v_requested_rank := case p_requested_plan when 'decouverte' then 1 when 'essentielle' then 2 when 'professionnelle' then 3 else 4 end;

  if p_requested_plan = 'metier' then
    v_request_type := 'metier';
  elsif v_subscription_status = 'trialing' then
    -- À la fin d’un essai, toute formule choisie devient une souscription payante,
    -- même si son niveau est inférieur à la formule testée.
    v_request_type := 'reactivation';
  elsif p_requested_plan = v_current_plan then
    if v_subscription_status in ('past_due','paused','canceled') then
      v_request_type := 'reactivation';
    else
      raise exception 'Cette formule est déjà active.';
    end if;
  elsif v_requested_rank > v_current_rank then
    v_request_type := 'upgrade';
  else
    v_request_type := 'downgrade';
  end if;

  if v_request_type in ('upgrade','reactivation') and p_requested_plan <> 'metier' then
    select provider, checkout_url
    into v_provider, v_checkout_url
    from public.billing_plan_links
    where plan_key = p_requested_plan
      and active = true;

    if v_checkout_url is not null then
      v_status := 'payment_pending';
    else
      v_provider := 'manual';
      v_status := 'pending_review';
    end if;
  end if;

  v_reference := 'NCR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.subscription_change_requests (
    organization_id,
    current_plan,
    requested_plan,
    request_type,
    status,
    provider,
    checkout_url_snapshot,
    request_reference,
    accepted_terms_at,
    terms_version,
    requested_by
  ) values (
    p_organization_id,
    v_current_plan,
    p_requested_plan,
    v_request_type,
    v_status,
    v_provider,
    v_checkout_url,
    v_reference,
    now(),
    coalesce(v_terms_version, 'initial'),
    auth.uid()
  ) returning id into v_request_id;

  insert into public.subscription_events (
    organization_id, request_id, event_type, actor_user_id, from_plan, to_plan, metadata
  ) values (
    p_organization_id,
    v_request_id,
    'change_requested',
    auth.uid(),
    v_current_plan,
    p_requested_plan,
    jsonb_build_object('status', v_status, 'provider', v_provider, 'reference', v_reference)
  );

  return jsonb_build_object(
    'id', v_request_id,
    'status', v_status,
    'provider', v_provider,
    'checkout_url', v_checkout_url,
    'reference', v_reference
  );
end;
$$;

create or replace function public.cancel_subscription_change_request(
  p_organization_id uuid,
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_plan text;
  v_to_plan text;
begin
  if not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Accès refusé.';
  end if;

  update public.subscription_change_requests
  set status = 'canceled', updated_at = now()
  where id = p_request_id
    and organization_id = p_organization_id
    and status in ('payment_pending','pending_review')
  returning current_plan, requested_plan into v_from_plan, v_to_plan;

  if v_from_plan is null then
    raise exception 'Demande introuvable ou déjà traitée.';
  end if;

  insert into public.subscription_events (
    organization_id, request_id, event_type, actor_user_id, from_plan, to_plan
  ) values (
    p_organization_id, p_request_id, 'request_canceled', auth.uid(), v_from_plan, v_to_plan
  );
end;
$$;

-- 5. Configuration et traitement depuis l'administration NCR.
create or replace function public.admin_billing_configuration()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Accès administrateur NCR requis.';
  end if;

  select jsonb_build_object(
    'settings', (
      select jsonb_build_object(
        'default_provider', default_provider,
        'default_trial_days', default_trial_days,
        'default_trial_plan', default_trial_plan,
        'terms_version', terms_version,
        'terms_text', terms_text,
        'cancellation_text', cancellation_text
      )
      from public.platform_billing_settings where singleton = true
    ),
    'plans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'plan_key', p.plan_key,
        'display_name', p.display_name,
        'monthly_price_cents', p.monthly_price_cents,
        'member_limit', p.member_limit,
        'provider', coalesce(l.provider, 'qonto'),
        'checkout_url', l.checkout_url,
        'active', coalesce(l.active, false),
        'sort_order', p.sort_order
      ) order by p.sort_order), '[]'::jsonb)
      from public.plan_catalog p
      left join public.billing_plan_links l on l.plan_key = p.plan_key
    )
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_update_billing_settings(
  p_default_provider text,
  p_default_trial_days integer,
  p_default_trial_plan text,
  p_terms_version text,
  p_terms_text text,
  p_cancellation_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut modifier la facturation.';
  end if;

  if p_default_provider not in ('manual','qonto','stripe') then
    raise exception 'Prestataire invalide.';
  end if;

  if p_default_trial_days not between 0 and 90 then
    raise exception 'Durée d’essai invalide.';
  end if;

  if p_default_trial_plan not in ('decouverte','essentielle','professionnelle','metier') then
    raise exception 'Formule d’essai invalide.';
  end if;

  if char_length(trim(coalesce(p_terms_version, ''))) not between 1 and 40 then
    raise exception 'Version des conditions invalide.';
  end if;

  if char_length(trim(coalesce(p_terms_text, ''))) not between 20 and 5000
     or char_length(trim(coalesce(p_cancellation_text, ''))) not between 20 and 5000 then
    raise exception 'Les conditions sont trop courtes ou trop longues.';
  end if;

  update public.platform_billing_settings
  set default_provider = p_default_provider,
      default_trial_days = p_default_trial_days,
      default_trial_plan = p_default_trial_plan,
      terms_version = trim(p_terms_version),
      terms_text = trim(p_terms_text),
      cancellation_text = trim(p_cancellation_text),
      updated_by = auth.uid(),
      updated_at = now()
  where singleton = true;
end;
$$;

create or replace function public.admin_update_billing_plan_link(
  p_plan_key text,
  p_provider text,
  p_checkout_url text,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := nullif(trim(coalesce(p_checkout_url, '')), '');
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut modifier les liens de paiement.';
  end if;

  if p_plan_key not in ('decouverte','essentielle','professionnelle','metier') then
    raise exception 'Formule invalide.';
  end if;

  if p_provider not in ('manual','qonto','stripe') then
    raise exception 'Prestataire invalide.';
  end if;

  if coalesce(p_active, false) and v_url is null and p_plan_key <> 'metier' then
    raise exception 'Un lien de paiement est requis pour activer cette formule.';
  end if;

  if v_url is not null and v_url !~ '^https://[^[:space:]]+$' then
    raise exception 'URL de paiement invalide.';
  end if;

  insert into public.billing_plan_links (plan_key, provider, checkout_url, active, updated_by)
  values (p_plan_key, p_provider, v_url, coalesce(p_active, false), auth.uid())
  on conflict (plan_key) do update
  set provider = excluded.provider,
      checkout_url = excluded.checkout_url,
      active = excluded.active,
      updated_by = auth.uid(),
      updated_at = now();
end;
$$;

create or replace function public.admin_list_subscription_requests(p_status text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Accès administrateur NCR requis.';
  end if;

  select coalesce(jsonb_agg(item order by created_at desc), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id', r.id,
      'organization_id', r.organization_id,
      'organization_name', o.name,
      'owner_email', owner_data.email,
      'current_plan', r.current_plan,
      'requested_plan', r.requested_plan,
      'request_type', r.request_type,
      'status', r.status,
      'provider', r.provider,
      'request_reference', r.request_reference,
      'provider_payment_reference', r.provider_payment_reference,
      'created_at', r.created_at,
      'review_note', r.review_note
    ) as item,
    r.created_at
    from public.subscription_change_requests r
    join public.organizations o on o.id = r.organization_id
    left join lateral (
      select u.email::text as email
      from public.organization_members m
      join auth.users u on u.id = m.user_id
      where m.organization_id = o.id and m.role = 'owner'
      order by m.created_at
      limit 1
    ) owner_data on true
    where p_status is null or p_status = '' or r.status = p_status
  ) rows;

  return v_result;
end;
$$;

create or replace function public.admin_review_subscription_request(
  p_request_id uuid,
  p_decision text,
  p_note text default null,
  p_provider_payment_reference text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.subscription_change_requests%rowtype;
  v_price integer;
  v_period_end timestamptz;
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut traiter les demandes.';
  end if;

  if p_decision not in ('approve','reject') then
    raise exception 'Décision invalide.';
  end if;

  select * into v_request
  from public.subscription_change_requests
  where id = p_request_id
    and status in ('payment_pending','pending_review')
  for update;

  if v_request.id is null then
    raise exception 'Demande introuvable ou déjà traitée.';
  end if;

  if p_decision = 'reject' then
    update public.subscription_change_requests
    set status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = nullif(trim(coalesce(p_note, '')), ''),
        updated_at = now()
    where id = p_request_id;

    insert into public.subscription_events (
      organization_id, request_id, event_type, actor_user_id, from_plan, to_plan, metadata
    ) values (
      v_request.organization_id,
      v_request.id,
      'request_rejected',
      auth.uid(),
      v_request.current_plan,
      v_request.requested_plan,
      jsonb_build_object('note', nullif(trim(coalesce(p_note, '')), ''))
    );
    return;
  end if;

  select monthly_price_cents into v_price
  from public.plan_catalog
  where plan_key = v_request.requested_plan;

  v_period_end := case
    when v_request.request_type = 'downgrade' then now() + interval '1 month'
    when v_request.requested_plan = 'metier' then null
    else now() + interval '1 month'
  end;

  perform public.admin_update_organization_subscription(
    v_request.organization_id,
    v_request.requested_plan,
    'active',
    'active',
    coalesce(v_price, 0),
    null,
    v_period_end,
    false,
    coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Activation depuis une demande d’abonnement ' || v_request.request_reference)
  );

  update public.organization_subscriptions
  set provider = v_request.provider,
      provider_checkout_url = v_request.checkout_url_snapshot,
      provider_payment_reference = nullif(trim(coalesce(p_provider_payment_reference, '')), ''),
      provider_subscription_id = coalesce(nullif(trim(coalesce(p_provider_payment_reference, '')), ''), provider_subscription_id),
      payment_confirmed_at = case when v_request.provider <> 'manual' then now() else payment_confirmed_at end,
      provider_metadata = provider_metadata || jsonb_build_object(
        'request_reference', v_request.request_reference,
        'approved_by', auth.uid(),
        'approved_at', now()
      ),
      updated_at = now()
  where organization_id = v_request.organization_id;

  update public.subscription_change_requests
  set status = 'approved',
      provider_payment_reference = nullif(trim(coalesce(p_provider_payment_reference, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = nullif(trim(coalesce(p_note, '')), ''),
      updated_at = now()
  where id = p_request_id;

  insert into public.subscription_events (
    organization_id, request_id, event_type, actor_user_id, from_plan, to_plan, metadata
  ) values (
    v_request.organization_id,
    v_request.id,
    'request_approved',
    auth.uid(),
    v_request.current_plan,
    v_request.requested_plan,
    jsonb_build_object(
      'provider', v_request.provider,
      'provider_payment_reference', nullif(trim(coalesce(p_provider_payment_reference, '')), '')
    )
  );
end;
$$;

-- 6. Historique automatique des changements manuels ou automatisés.
create or replace function public.log_organization_plan_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.plan is distinct from new.plan then
    insert into public.subscription_events (
      organization_id, event_type, actor_user_id, from_plan, to_plan, metadata
    ) values (
      new.id,
      'plan_changed',
      auth.uid(),
      old.plan,
      new.plan,
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  elsif old.status is distinct from new.status then
    insert into public.subscription_events (
      organization_id, event_type, actor_user_id, from_plan, to_plan, metadata
    ) values (
      new.id,
      'organization_status_changed',
      auth.uid(),
      old.plan,
      new.plan,
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_organization_plan_status_changed on public.organizations;
create trigger on_organization_plan_status_changed
after update of plan, status on public.organizations
for each row execute procedure public.log_organization_plan_status_change();

-- 7. Expiration automatique des essais.
create or replace function public.expire_ncr_suite_trials()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  with expired as (
    update public.organization_subscriptions s
    set status = 'paused', updated_at = now()
    from public.organizations o
    where o.id = s.organization_id
      and o.status = 'trial'
      and s.status = 'trialing'
      and s.trial_ends_at is not null
      and s.trial_ends_at <= now()
    returning s.organization_id
  )
  update public.organizations o
  set status = 'suspended', updated_at = now()
  where o.id in (select organization_id from expired);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- pg_cron est déjà utilisé par les e-mails ; le bloc reste idempotent.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'ncr-suite-expire-trials') then
      perform cron.unschedule('ncr-suite-expire-trials');
    end if;
    perform cron.schedule(
      'ncr-suite-expire-trials',
      '15 * * * *',
      'select public.expire_ncr_suite_trials();'
    );
  end if;
end
$$;

-- 8. Permissions RPC.
revoke all on function public.organization_billing_portal(uuid) from public;
revoke all on function public.request_subscription_change(uuid,text,boolean) from public;
revoke all on function public.cancel_subscription_change_request(uuid,uuid) from public;
revoke all on function public.admin_billing_configuration() from public;
revoke all on function public.admin_update_billing_settings(text,integer,text,text,text,text) from public;
revoke all on function public.admin_update_billing_plan_link(text,text,text,boolean) from public;
revoke all on function public.admin_list_subscription_requests(text) from public;
revoke all on function public.admin_review_subscription_request(uuid,text,text,text) from public;
revoke all on function public.expire_ncr_suite_trials() from public;

grant execute on function public.organization_billing_portal(uuid) to authenticated;
grant execute on function public.request_subscription_change(uuid,text,boolean) to authenticated;
grant execute on function public.cancel_subscription_change_request(uuid,uuid) to authenticated;
grant execute on function public.admin_billing_configuration() to authenticated;
grant execute on function public.admin_update_billing_settings(text,integer,text,text,text,text) to authenticated;
grant execute on function public.admin_update_billing_plan_link(text,text,text,boolean) to authenticated;
grant execute on function public.admin_list_subscription_requests(text) to authenticated;
grant execute on function public.admin_review_subscription_request(uuid,text,text,text) to authenticated;
grant execute on function public.expire_ncr_suite_trials() to service_role;
