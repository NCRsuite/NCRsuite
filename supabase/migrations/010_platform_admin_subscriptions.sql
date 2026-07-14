-- NCR Suite V2.0.0 — administration centrale, abonnements et suspension sécurisée
-- À exécuter après 009_commercial_branding.sql.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'support' check (role in ('super_admin','support')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_catalog (
  plan_key text primary key check (plan_key in ('decouverte','essentielle','professionnelle','metier')),
  display_name text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  member_limit integer not null check (member_limit >= 1),
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan_key text not null references public.plan_catalog(plan_key),
  status text not null default 'active' check (status in ('trialing','active','past_due','paused','canceled')),
  provider text not null default 'manual' check (provider in ('manual','stripe')),
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  provider_customer_id text,
  provider_subscription_id text,
  internal_notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plan_catalog (plan_key, display_name, monthly_price_cents, member_limit, features)
values
  ('decouverte', 'Découverte', 990, 1, '{"team_access":false,"commercial_branding":false,"advanced_permissions":false}'::jsonb),
  ('essentielle', 'Essentielle', 1990, 3, '{"team_access":true,"commercial_branding":false,"advanced_permissions":false}'::jsonb),
  ('professionnelle', 'Professionnelle', 3990, 10, '{"team_access":true,"commercial_branding":true,"advanced_permissions":true}'::jsonb),
  ('metier', 'Métier', 6990, 100, '{"team_access":true,"commercial_branding":true,"advanced_permissions":true,"white_label":true}'::jsonb)
on conflict (plan_key) do update
set display_name = excluded.display_name,
    monthly_price_cents = excluded.monthly_price_cents,
    member_limit = excluded.member_limit,
    features = excluded.features,
    active = true,
    updated_at = now();

insert into public.organization_subscriptions (
  organization_id,
  plan_key,
  status,
  provider,
  monthly_price_cents,
  trial_ends_at,
  current_period_start,
  current_period_end
)
select
  o.id,
  o.plan,
  case o.status
    when 'trial' then 'trialing'
    when 'suspended' then 'paused'
    when 'closed' then 'canceled'
    else 'active'
  end,
  'manual',
  p.monthly_price_cents,
  case when o.status = 'trial' then o.created_at + interval '14 days' else null end,
  case when o.status = 'active' then o.created_at else null end,
  null
from public.organizations o
join public.plan_catalog p on p.plan_key = o.plan
on conflict (organization_id) do nothing;

drop trigger if exists set_platform_admins_updated_at on public.platform_admins;
create trigger set_platform_admins_updated_at before update on public.platform_admins
for each row execute procedure public.set_updated_at();

drop trigger if exists set_plan_catalog_updated_at on public.plan_catalog;
create trigger set_plan_catalog_updated_at before update on public.plan_catalog
for each row execute procedure public.set_updated_at();

drop trigger if exists set_organization_subscriptions_updated_at on public.organization_subscriptions;
create trigger set_organization_subscriptions_updated_at before update on public.organization_subscriptions
for each row execute procedure public.set_updated_at();

alter table public.platform_admins enable row level security;
alter table public.plan_catalog enable row level security;
alter table public.organization_subscriptions enable row level security;

revoke all on public.platform_admins from anon, authenticated;
revoke all on public.plan_catalog from anon, authenticated;
revoke all on public.organization_subscriptions from anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins a
    where a.user_id = auth.uid()
      and a.active = true
  );
$$;

create or replace function public.is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins a
    where a.user_id = auth.uid()
      and a.active = true
      and a.role = 'super_admin'
  );
$$;

-- Permet à un membre de voir son entreprise même lorsqu'elle est suspendue,
-- sans lui donner accès aux données métier.
create or replace function public.is_org_member_any_status(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

-- Les données métier ne sont accessibles que si l'entreprise est opérationnelle.
create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and o.status in ('trial','active')
  );
$$;

create or replace function public.has_org_role(p_organization_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(p_roles)
      and o.status in ('trial','active')
  );
$$;

-- Les membres conservent la visibilité sur l'identité et leur appartenance,
-- mais les autres politiques restent bloquées grâce aux fonctions ci-dessus.
drop policy if exists "organizations_member_select" on public.organizations;
create policy "organizations_member_select" on public.organizations
for select using (public.is_org_member_any_status(id));

drop policy if exists "members_org_select" on public.organization_members;
create policy "members_org_select" on public.organization_members
for select using (public.is_org_member_any_status(organization_id));

create or replace function public.initialize_organization_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price integer;
begin
  select monthly_price_cents into v_price
  from public.plan_catalog
  where plan_key = new.plan;

  insert into public.organization_subscriptions (
    organization_id, plan_key, status, provider, monthly_price_cents, current_period_start
  ) values (
    new.id,
    new.plan,
    case when new.status = 'trial' then 'trialing' else 'active' end,
    'manual',
    coalesce(v_price, 0),
    case when new.status = 'active' then now() else null end
  )
  on conflict (organization_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_organization_created_subscription on public.organizations;
create trigger on_organization_created_subscription
after insert on public.organizations
for each row execute procedure public.initialize_organization_subscription();

create or replace function public.platform_admin_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role
  from public.platform_admins
  where user_id = auth.uid()
    and active = true;

  if v_role is null then
    return null;
  end if;

  return jsonb_build_object(
    'role', v_role,
    'can_manage', v_role = 'super_admin'
  );
end;
$$;

create or replace function public.organization_subscription_summary(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_org_member_any_status(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;

  select jsonb_build_object(
    'plan', o.plan,
    'organization_status', o.status,
    'subscription_status', s.status,
    'monthly_price_cents', s.monthly_price_cents,
    'trial_ends_at', s.trial_ends_at,
    'current_period_end', s.current_period_end,
    'cancel_at_period_end', s.cancel_at_period_end,
    'member_limit', public.plan_member_limit(o.plan)
  ) into v_result
  from public.organizations o
  left join public.organization_subscriptions s on s.organization_id = o.id
  where o.id = p_organization_id;

  return v_result;
end;
$$;

create or replace function public.admin_platform_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_organizations_total integer;
  v_active integer;
  v_trials integer;
  v_suspended integer;
  v_users integer;
  v_mrr integer;
  v_trials_ending integer;
begin
  if not public.is_platform_admin() then
    raise exception 'Accès administrateur NCR requis.';
  end if;

  select
    count(*)::integer,
    count(*) filter (where status = 'active')::integer,
    count(*) filter (where status = 'trial')::integer,
    count(*) filter (where status = 'suspended')::integer
  into v_organizations_total, v_active, v_trials, v_suspended
  from public.organizations;

  select count(*)::integer into v_users
  from public.organization_members
  where status = 'active';

  select coalesce(sum(monthly_price_cents), 0)::integer into v_mrr
  from public.organization_subscriptions
  where status = 'active';

  select count(*)::integer into v_trials_ending
  from public.organization_subscriptions
  where status = 'trialing'
    and trial_ends_at between now() and now() + interval '7 days';

  return jsonb_build_object(
    'organizations_total', v_organizations_total,
    'organizations_active', v_active,
    'organizations_trial', v_trials,
    'organizations_suspended', v_suspended,
    'active_users', v_users,
    'estimated_mrr_cents', v_mrr,
    'trials_ending_soon', v_trials_ending
  );
end;
$$;

create or replace function public.admin_list_organizations(
  p_search text default null,
  p_plan text default null,
  p_status text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_search text := lower(trim(coalesce(p_search, '')));
begin
  if not public.is_platform_admin() then
    raise exception 'Accès administrateur NCR requis.';
  end if;

  select coalesce(jsonb_agg(item order by (item->>'created_at') desc), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug,
      'business_type', o.business_type,
      'plan', o.plan,
      'organization_status', o.status,
      'subscription_status', coalesce(s.status, 'active'),
      'monthly_price_cents', coalesce(s.monthly_price_cents, p.monthly_price_cents, 0),
      'trial_ends_at', s.trial_ends_at,
      'current_period_end', s.current_period_end,
      'cancel_at_period_end', coalesce(s.cancel_at_period_end, false),
      'provider', coalesce(s.provider, 'manual'),
      'internal_notes', s.internal_notes,
      'owner_email', owner_data.email,
      'active_members', coalesce(member_data.active_members, 0),
      'clients_count', coalesce(client_data.clients_count, 0),
      'appointments_count', coalesce(appointment_data.appointments_count, 0),
      'last_activity_at', activity_data.last_activity_at,
      'created_at', o.created_at
    ) as item
    from public.organizations o
    left join public.organization_subscriptions s on s.organization_id = o.id
    left join public.plan_catalog p on p.plan_key = o.plan
    left join lateral (
      select u.email::text as email
      from public.organization_members m
      join auth.users u on u.id = m.user_id
      where m.organization_id = o.id
        and m.role = 'owner'
      order by m.created_at
      limit 1
    ) owner_data on true
    left join lateral (
      select count(*)::integer as active_members
      from public.organization_members m
      where m.organization_id = o.id
        and m.status = 'active'
    ) member_data on true
    left join lateral (
      select count(*)::integer as clients_count
      from public.clients c
      where c.organization_id = o.id
    ) client_data on true
    left join lateral (
      select count(*)::integer as appointments_count
      from public.appointments a
      where a.organization_id = o.id
    ) appointment_data on true
    left join lateral (
      select max(a.created_at) as last_activity_at
      from public.audit_logs a
      where a.organization_id = o.id
    ) activity_data on true
    where (v_search = ''
      or lower(o.name) like '%' || v_search || '%'
      or lower(o.slug) like '%' || v_search || '%'
      or lower(coalesce(owner_data.email, '')) like '%' || v_search || '%')
      and (p_plan is null or p_plan = '' or o.plan = p_plan)
      and (p_status is null or p_status = '' or o.status = p_status)
  ) rows;

  return v_result;
end;
$$;

create or replace function public.admin_update_organization_subscription(
  p_organization_id uuid,
  p_plan text,
  p_organization_status text,
  p_subscription_status text,
  p_monthly_price_cents integer,
  p_trial_ends_at timestamptz default null,
  p_current_period_end timestamptz default null,
  p_cancel_at_period_end boolean default false,
  p_internal_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_members integer;
  v_limit integer;
  v_incompatible_roles integer;
  v_old_plan text;
  v_old_status text;
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut modifier les abonnements.';
  end if;

  if p_plan not in ('decouverte','essentielle','professionnelle','metier') then
    raise exception 'Formule invalide.';
  end if;

  if p_organization_status not in ('trial','active','suspended','closed') then
    raise exception 'Statut entreprise invalide.';
  end if;

  if p_subscription_status not in ('trialing','active','past_due','paused','canceled') then
    raise exception 'Statut abonnement invalide.';
  end if;

  if p_monthly_price_cents is null or p_monthly_price_cents < 0 or p_monthly_price_cents > 10000000 then
    raise exception 'Tarif mensuel invalide.';
  end if;

  if char_length(coalesce(p_internal_notes, '')) > 2000 then
    raise exception 'La note interne est trop longue.';
  end if;

  select plan, status into v_old_plan, v_old_status
  from public.organizations
  where id = p_organization_id;

  if v_old_plan is null then
    raise exception 'Entreprise introuvable.';
  end if;

  v_limit := public.plan_member_limit(p_plan);

  select count(*)::integer into v_active_members
  from public.organization_members
  where organization_id = p_organization_id
    and status = 'active';

  if v_active_members > v_limit then
    raise exception 'Cette entreprise possède % accès actifs pour une limite de %. Désactivez des accès avant de réduire la formule.', v_active_members, v_limit;
  end if;

  select count(*)::integer into v_incompatible_roles
  from public.organization_members
  where organization_id = p_organization_id
    and status = 'active'
    and role <> 'owner'
    and (
      (p_plan = 'decouverte')
      or (p_plan = 'essentielle' and role <> 'employee')
      or (p_plan = 'professionnelle' and role not in ('manager','employee'))
    );

  if v_incompatible_roles > 0 then
    raise exception 'Certains rôles ne sont pas compatibles avec la formule choisie.';
  end if;

  update public.organizations
  set plan = p_plan,
      status = p_organization_status,
      updated_at = now()
  where id = p_organization_id;

  insert into public.organization_subscriptions (
    organization_id,
    plan_key,
    status,
    provider,
    monthly_price_cents,
    trial_ends_at,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    internal_notes,
    updated_by
  ) values (
    p_organization_id,
    p_plan,
    p_subscription_status,
    'manual',
    p_monthly_price_cents,
    p_trial_ends_at,
    case when p_subscription_status = 'active' then now() else null end,
    p_current_period_end,
    coalesce(p_cancel_at_period_end, false),
    nullif(trim(coalesce(p_internal_notes, '')), ''),
    auth.uid()
  )
  on conflict (organization_id) do update
  set plan_key = excluded.plan_key,
      status = excluded.status,
      monthly_price_cents = excluded.monthly_price_cents,
      trial_ends_at = excluded.trial_ends_at,
      current_period_start = case
        when organization_subscriptions.status <> 'active' and excluded.status = 'active' then now()
        else organization_subscriptions.current_period_start
      end,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      internal_notes = excluded.internal_notes,
      updated_by = auth.uid(),
      updated_at = now();

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'platform.subscription_updated',
    'organization_subscription',
    p_organization_id::text,
    jsonb_build_object(
      'old_plan', v_old_plan,
      'new_plan', p_plan,
      'old_status', v_old_status,
      'new_status', p_organization_status,
      'subscription_status', p_subscription_status,
      'monthly_price_cents', p_monthly_price_cents
    )
  );
end;
$$;

-- À utiliser une seule fois depuis le SQL Editor pour autoriser ton compte NCR.
-- Cette fonction n'est pas accessible depuis l'application web.
create or replace function public.bootstrap_platform_admin(
  p_email text,
  p_role text default 'super_admin'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if p_role not in ('super_admin','support') then
    raise exception 'Rôle administrateur invalide.';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email::text) = v_email
  limit 1;

  if v_user_id is null then
    raise exception 'Aucun utilisateur Supabase ne correspond à cette adresse.';
  end if;

  insert into public.platform_admins (user_id, role, active)
  values (v_user_id, p_role, true)
  on conflict (user_id) do update
  set role = excluded.role,
      active = true,
      updated_at = now();

  return v_user_id;
end;
$$;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_platform_super_admin() from public;
revoke all on function public.is_org_member_any_status(uuid) from public;
revoke all on function public.platform_admin_profile() from public;
revoke all on function public.organization_subscription_summary(uuid) from public;
revoke all on function public.admin_platform_dashboard() from public;
revoke all on function public.admin_list_organizations(text,text,text) from public;
revoke all on function public.admin_update_organization_subscription(uuid,text,text,text,integer,timestamptz,timestamptz,boolean,text) from public;
revoke all on function public.bootstrap_platform_admin(text,text) from public;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_platform_super_admin() to authenticated;
grant execute on function public.is_org_member_any_status(uuid) to authenticated;
grant execute on function public.platform_admin_profile() to authenticated;
grant execute on function public.organization_subscription_summary(uuid) to authenticated;
grant execute on function public.admin_platform_dashboard() to authenticated;
grant execute on function public.admin_list_organizations(text,text,text) to authenticated;
grant execute on function public.admin_update_organization_subscription(uuid,text,text,text,integer,timestamptz,timestamptz,boolean,text) to authenticated;
-- bootstrap_platform_admin reste réservé au rôle propriétaire de la base / service_role.
grant execute on function public.bootstrap_platform_admin(text,text) to service_role;

create index if not exists idx_platform_admins_active on public.platform_admins(active, role);
create index if not exists idx_org_subscriptions_status on public.organization_subscriptions(status, trial_ends_at);
create index if not exists idx_org_subscriptions_provider on public.organization_subscriptions(provider, provider_customer_id);
