-- NCR Suite V2.12.3 — fidélité configurable et espace client Coiffure
-- À exécuter après 063_cleaning_client_portal.sql.

begin;

-- La fidélité et l'espace client sont inclus dans toutes les offres Coiffure.
-- Chaque salon reste libre d'activer les points, les passages, l'anniversaire,
-- le bonus de bienvenue ou uniquement l'espace de suivi des rendez-vous.
update public.domain_plan_catalog
set features = coalesce(features, '{}'::jsonb) || '{"coiffure_loyalty":true,"coiffure_client_portal":true}'::jsonb,
    updated_at = now()
where business_type = 'coiffure';

alter table public.clients
  add column if not exists birth_date date,
  add column if not exists loyalty_opt_in boolean not null default true,
  add column if not exists birthday_consent boolean not null default false,
  add column if not exists marketing_opt_in boolean not null default false;

create table if not exists public.coiffure_loyalty_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  portal_enabled boolean not null default true,
  program_active boolean not null default false,
  program_name text not null default 'Programme fidélité' check (char_length(trim(program_name)) between 2 and 80),
  program_description text,
  points_enabled boolean not null default false,
  points_per_euro integer not null default 1 check (points_per_euro between 0 and 1000),
  points_per_visit integer not null default 0 check (points_per_visit between 0 and 10000),
  points_reward_threshold integer not null default 100 check (points_reward_threshold between 1 and 1000000),
  points_reward_label text not null default 'Récompense fidélité' check (char_length(trim(points_reward_label)) between 2 and 120),
  points_reward_kind text not null default 'discount_fixed' check (points_reward_kind in ('discount_percent','discount_fixed','free_service','gift','custom')),
  points_reward_value integer not null default 500 check (points_reward_value between 0 and 1000000),
  points_reward_valid_days integer not null default 90 check (points_reward_valid_days between 1 and 730),
  visits_enabled boolean not null default false,
  visits_required integer not null default 10 check (visits_required between 1 and 1000),
  visits_reward_label text not null default 'Passage offert' check (char_length(trim(visits_reward_label)) between 2 and 120),
  visits_reward_kind text not null default 'free_service' check (visits_reward_kind in ('discount_percent','discount_fixed','free_service','gift','custom')),
  visits_reward_value integer not null default 0 check (visits_reward_value between 0 and 1000000),
  visits_reward_valid_days integer not null default 90 check (visits_reward_valid_days between 1 and 730),
  birthday_enabled boolean not null default false,
  birthday_days_before integer not null default 7 check (birthday_days_before between 0 and 60),
  birthday_reward_label text not null default 'Avantage anniversaire' check (char_length(trim(birthday_reward_label)) between 2 and 120),
  birthday_reward_kind text not null default 'discount_percent' check (birthday_reward_kind in ('discount_percent','discount_fixed','free_service','gift','custom')),
  birthday_reward_value integer not null default 10 check (birthday_reward_value between 0 and 1000000),
  birthday_reward_valid_days integer not null default 30 check (birthday_reward_valid_days between 1 and 365),
  welcome_enabled boolean not null default false,
  welcome_points integer not null default 0 check (welcome_points between 0 and 1000000),
  welcome_reward_label text not null default 'Cadeau de bienvenue' check (char_length(trim(welcome_reward_label)) between 2 and 120),
  welcome_reward_kind text not null default 'gift' check (welcome_reward_kind in ('discount_percent','discount_fixed','free_service','gift','custom')),
  welcome_reward_value integer not null default 0 check (welcome_reward_value between 0 and 1000000),
  welcome_reward_valid_days integer not null default 60 check (welcome_reward_valid_days between 1 and 365),
  allow_client_birthdate_edit boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.coiffure_loyalty_settings (organization_id, created_by)
select id, created_by
from public.organizations
where business_type = 'coiffure'
on conflict (organization_id) do nothing;

create table if not exists public.coiffure_client_portal_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  status text not null default 'active' check (status in ('active','suspended')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, client_id, user_id),
  constraint coiffure_client_portal_accounts_client_fk
    foreign key (organization_id, client_id)
    references public.clients(organization_id, id)
    on delete cascade
);
create index if not exists idx_coiffure_client_portal_accounts_user
  on public.coiffure_client_portal_accounts(user_id, status);
create index if not exists idx_coiffure_client_portal_accounts_client
  on public.coiffure_client_portal_accounts(organization_id, client_id, status);

create table if not exists public.coiffure_client_portal_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  email text not null,
  display_name text,
  token_hash bytea not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint coiffure_client_portal_invitations_client_fk
    foreign key (organization_id, client_id)
    references public.clients(organization_id, id)
    on delete cascade
);
create unique index if not exists idx_coiffure_client_portal_pending_email
  on public.coiffure_client_portal_invitations(organization_id, client_id, lower(email))
  where status = 'pending';

create table if not exists public.coiffure_loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  source_type text not null check (source_type in ('points','visits','birthday','welcome','manual')),
  source_key text,
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text,
  reward_kind text not null check (reward_kind in ('discount_percent','discount_fixed','free_service','gift','custom')),
  reward_value integer not null default 0 check (reward_value between 0 and 1000000),
  status text not null default 'available' check (status in ('available','redeemed','expired','cancelled')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint coiffure_loyalty_rewards_client_fk
    foreign key (organization_id, client_id)
    references public.clients(organization_id, id)
    on delete cascade
);
create unique index if not exists idx_coiffure_loyalty_reward_source
  on public.coiffure_loyalty_rewards(organization_id, client_id, source_key)
  where source_key is not null;
create index if not exists idx_coiffure_loyalty_rewards_client
  on public.coiffure_loyalty_rewards(organization_id, client_id, status, issued_at desc);

create table if not exists public.coiffure_loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  reward_id uuid,
  entry_type text not null check (entry_type in ('appointment_credit','appointment_reversal','appointment_adjustment','manual_adjustment','reward_exchange','welcome_bonus')),
  points_delta integer not null default 0 check (points_delta between -1000000 and 1000000),
  visits_delta integer not null default 0 check (visits_delta between -1000000 and 1000000),
  label text not null check (char_length(trim(label)) between 2 and 180),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint coiffure_loyalty_ledger_client_fk
    foreign key (organization_id, client_id)
    references public.clients(organization_id, id)
    on delete cascade,
  constraint coiffure_loyalty_ledger_reward_fk
    foreign key (organization_id, reward_id)
    references public.coiffure_loyalty_rewards(organization_id, id)
    on delete set null
);
create index if not exists idx_coiffure_loyalty_ledger_client
  on public.coiffure_loyalty_ledger(organization_id, client_id, created_at desc);
create index if not exists idx_coiffure_loyalty_ledger_appointment
  on public.coiffure_loyalty_ledger(appointment_id) where appointment_id is not null;

create table if not exists public.coiffure_appointment_loyalty_state (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  points_awarded integer not null default 0,
  visits_awarded integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint coiffure_appointment_loyalty_state_client_fk
    foreign key (organization_id, client_id)
    references public.clients(organization_id, id)
    on delete cascade
);

-- Mise à jour automatique des timestamps et verrouillage RLS.
do $$
declare t text;
begin
  foreach t in array array[
    'coiffure_loyalty_settings',
    'coiffure_client_portal_accounts',
    'coiffure_client_portal_invitations',
    'coiffure_loyalty_rewards',
    'coiffure_appointment_loyalty_state'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', 'set_' || t || '_updated_at', t);
  end loop;
end $$;

alter table public.coiffure_loyalty_settings enable row level security;
alter table public.coiffure_client_portal_accounts enable row level security;
alter table public.coiffure_client_portal_invitations enable row level security;
alter table public.coiffure_loyalty_rewards enable row level security;
alter table public.coiffure_loyalty_ledger enable row level security;
alter table public.coiffure_appointment_loyalty_state enable row level security;

revoke all on public.coiffure_loyalty_settings from anon, authenticated;
revoke all on public.coiffure_client_portal_accounts from anon, authenticated;
revoke all on public.coiffure_client_portal_invitations from anon, authenticated;
revoke all on public.coiffure_loyalty_rewards from anon, authenticated;
revoke all on public.coiffure_loyalty_ledger from anon, authenticated;
revoke all on public.coiffure_appointment_loyalty_state from anon, authenticated;

create or replace function public.coiffure_client_portal_feature_enabled(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    join public.domain_plan_catalog d
      on d.business_type = o.business_type
     and d.plan_key = o.plan
     and d.active = true
    left join public.coiffure_loyalty_settings s on s.organization_id = o.id
    where o.id = p_organization_id
      and o.business_type = 'coiffure'
      and o.status in ('trial','active')
      and coalesce((d.features ->> 'coiffure_client_portal')::boolean, false)
      and coalesce(s.portal_enabled, true)
  );
$$;

create or replace function public.is_coiffure_client_portal_account(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.coiffure_client_portal_accounts a
    join public.clients c
      on c.organization_id = a.organization_id and c.id = a.client_id
    where a.id = p_account_id
      and a.user_id = auth.uid()
      and a.status = 'active'
      and c.status = 'active'
      and public.coiffure_client_portal_feature_enabled(a.organization_id)
  );
$$;

create or replace function public.expire_coiffure_loyalty_rewards(p_organization_id uuid, p_client_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coiffure_loyalty_rewards
  set status = 'expired', updated_at = now()
  where organization_id = p_organization_id
    and (p_client_id is null or client_id = p_client_id)
    and status = 'available'
    and expires_at is not null
    and expires_at < now();
end;
$$;

create or replace function public.issue_coiffure_threshold_rewards(p_organization_id uuid, p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.coiffure_loyalty_settings%rowtype;
  v_points integer;
  v_visits integer;
  v_reward_id uuid;
  v_guard integer := 0;
begin
  select * into v_settings
  from public.coiffure_loyalty_settings
  where organization_id = p_organization_id;

  if v_settings.organization_id is null or not v_settings.program_active then return; end if;

  if v_settings.points_enabled then
    loop
      select coalesce(sum(points_delta), 0)::integer into v_points
      from public.coiffure_loyalty_ledger
      where organization_id = p_organization_id and client_id = p_client_id;
      exit when v_points < v_settings.points_reward_threshold or v_guard >= 20;
      v_guard := v_guard + 1;

      insert into public.coiffure_loyalty_rewards(
        organization_id, client_id, source_type, title, reward_kind, reward_value,
        expires_at, created_by
      ) values (
        p_organization_id, p_client_id, 'points', v_settings.points_reward_label,
        v_settings.points_reward_kind, v_settings.points_reward_value,
        now() + make_interval(days => v_settings.points_reward_valid_days), auth.uid()
      ) returning id into v_reward_id;

      insert into public.coiffure_loyalty_ledger(
        organization_id, client_id, reward_id, entry_type, points_delta, label, created_by
      ) values (
        p_organization_id, p_client_id, v_reward_id, 'reward_exchange',
        -v_settings.points_reward_threshold,
        'Conversion de points en récompense', auth.uid()
      );
    end loop;
  end if;

  v_guard := 0;
  if v_settings.visits_enabled then
    loop
      select coalesce(sum(visits_delta), 0)::integer into v_visits
      from public.coiffure_loyalty_ledger
      where organization_id = p_organization_id and client_id = p_client_id;
      exit when v_visits < v_settings.visits_required or v_guard >= 20;
      v_guard := v_guard + 1;

      insert into public.coiffure_loyalty_rewards(
        organization_id, client_id, source_type, title, reward_kind, reward_value,
        expires_at, created_by
      ) values (
        p_organization_id, p_client_id, 'visits', v_settings.visits_reward_label,
        v_settings.visits_reward_kind, v_settings.visits_reward_value,
        now() + make_interval(days => v_settings.visits_reward_valid_days), auth.uid()
      ) returning id into v_reward_id;

      insert into public.coiffure_loyalty_ledger(
        organization_id, client_id, reward_id, entry_type, visits_delta, label, created_by
      ) values (
        p_organization_id, p_client_id, v_reward_id, 'reward_exchange',
        -v_settings.visits_required,
        'Conversion de passages en récompense', auth.uid()
      );
    end loop;
  end if;
end;
$$;

create or replace function public.ensure_coiffure_birthday_reward(p_organization_id uuid, p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.coiffure_loyalty_settings%rowtype;
  v_client public.clients%rowtype;
  v_timezone text;
  v_today date;
  v_birthday date;
  v_year integer;
  v_source_key text;
begin
  select * into v_settings from public.coiffure_loyalty_settings where organization_id = p_organization_id;
  if v_settings.organization_id is null or not v_settings.program_active or not v_settings.birthday_enabled then return; end if;

  select * into v_client
  from public.clients
  where organization_id = p_organization_id and id = p_client_id and status = 'active';
  if v_client.id is null or v_client.birth_date is null or not v_client.birthday_consent then return; end if;

  select coalesce(timezone, 'Europe/Paris') into v_timezone from public.organizations where id = p_organization_id;
  v_today := (now() at time zone v_timezone)::date;
  v_year := extract(year from v_today)::integer;
  begin
    v_birthday := make_date(v_year, extract(month from v_client.birth_date)::integer, extract(day from v_client.birth_date)::integer);
  exception when others then
    v_birthday := make_date(v_year, 2, 28);
  end;

  if v_today < v_birthday - v_settings.birthday_days_before
     or v_today > v_birthday + v_settings.birthday_reward_valid_days then return; end if;

  v_source_key := 'birthday:' || v_year::text;
  insert into public.coiffure_loyalty_rewards(
    organization_id, client_id, source_type, source_key, title,
    reward_kind, reward_value, expires_at
  ) values (
    p_organization_id, p_client_id, 'birthday', v_source_key,
    v_settings.birthday_reward_label, v_settings.birthday_reward_kind,
    v_settings.birthday_reward_value,
    (v_birthday::timestamp at time zone v_timezone) + make_interval(days => v_settings.birthday_reward_valid_days)
  ) on conflict do nothing;
end;
$$;

create or replace function public.apply_coiffure_welcome_benefit(p_organization_id uuid, p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.coiffure_loyalty_settings%rowtype;
begin
  select * into v_settings from public.coiffure_loyalty_settings where organization_id = p_organization_id;
  if v_settings.organization_id is null or not v_settings.program_active or not v_settings.welcome_enabled then return; end if;

  if v_settings.welcome_points > 0 and not exists (
    select 1 from public.coiffure_loyalty_ledger
    where organization_id = p_organization_id and client_id = p_client_id and entry_type = 'welcome_bonus'
  ) then
    insert into public.coiffure_loyalty_ledger(
      organization_id, client_id, entry_type, points_delta, label
    ) values (
      p_organization_id, p_client_id, 'welcome_bonus', v_settings.welcome_points, 'Bonus de bienvenue'
    );
  end if;

  insert into public.coiffure_loyalty_rewards(
    organization_id, client_id, source_type, source_key, title,
    reward_kind, reward_value, expires_at
  ) values (
    p_organization_id, p_client_id, 'welcome', 'welcome',
    v_settings.welcome_reward_label, v_settings.welcome_reward_kind,
    v_settings.welcome_reward_value,
    now() + make_interval(days => v_settings.welcome_reward_valid_days)
  ) on conflict do nothing;

  perform public.issue_coiffure_threshold_rewards(p_organization_id, p_client_id);
end;
$$;

create or replace function public.process_coiffure_appointment_loyalty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.coiffure_loyalty_settings%rowtype;
  v_client public.clients%rowtype;
  v_state public.coiffure_appointment_loyalty_state%rowtype;
  v_points integer := 0;
  v_visits integer := 0;
  v_old_state public.coiffure_appointment_loyalty_state%rowtype;
begin
  if not exists (
    select 1 from public.organizations
    where id = new.organization_id and business_type = 'coiffure'
  ) then return new; end if;

  insert into public.coiffure_loyalty_settings(organization_id)
  values(new.organization_id)
  on conflict(organization_id) do nothing;

  select * into v_settings from public.coiffure_loyalty_settings where organization_id = new.organization_id;
  select * into v_client from public.clients where organization_id = new.organization_id and id = new.client_id;

  -- Si le rendez-vous terminé change de client, on retire d'abord l'ancien crédit.
  if tg_op = 'UPDATE' and old.client_id is distinct from new.client_id then
    select * into v_old_state from public.coiffure_appointment_loyalty_state where appointment_id = new.id;
    if v_old_state.appointment_id is not null and v_old_state.active then
      insert into public.coiffure_loyalty_ledger(
        organization_id, client_id, appointment_id, entry_type,
        points_delta, visits_delta, label
      ) values (
        old.organization_id, v_old_state.client_id, new.id, 'appointment_reversal',
        -v_old_state.points_awarded, -v_old_state.visits_awarded,
        'Régularisation du rendez-vous déplacé vers un autre client'
      );
      update public.coiffure_appointment_loyalty_state set active = false where appointment_id = new.id;
    end if;
  end if;

  select * into v_state from public.coiffure_appointment_loyalty_state where appointment_id = new.id;

  if new.status = 'completed'
     and v_settings.program_active
     and (v_settings.points_enabled or v_settings.visits_enabled)
     and v_client.id is not null
     and v_client.loyalty_opt_in then
    v_points := case when v_settings.points_enabled
      then floor(coalesce(new.amount_cents, 0)::numeric / 100 * v_settings.points_per_euro)::integer + v_settings.points_per_visit
      else 0 end;
    v_visits := case when v_settings.visits_enabled then 1 else 0 end;

    if v_state.appointment_id is null then
      insert into public.coiffure_appointment_loyalty_state(
        appointment_id, organization_id, client_id, points_awarded, visits_awarded, active
      ) values (new.id, new.organization_id, new.client_id, v_points, v_visits, true);
      insert into public.coiffure_loyalty_ledger(
        organization_id, client_id, appointment_id, entry_type,
        points_delta, visits_delta, label
      ) values (
        new.organization_id, new.client_id, new.id, 'appointment_credit',
        v_points, v_visits, 'Rendez-vous terminé'
      );
    elsif not v_state.active or v_state.client_id <> new.client_id then
      update public.coiffure_appointment_loyalty_state
      set organization_id = new.organization_id, client_id = new.client_id,
          points_awarded = v_points, visits_awarded = v_visits, active = true
      where appointment_id = new.id;
      insert into public.coiffure_loyalty_ledger(
        organization_id, client_id, appointment_id, entry_type,
        points_delta, visits_delta, label
      ) values (
        new.organization_id, new.client_id, new.id, 'appointment_credit',
        v_points, v_visits, 'Rendez-vous revalidé comme terminé'
      );
    elsif v_state.points_awarded <> v_points or v_state.visits_awarded <> v_visits then
      insert into public.coiffure_loyalty_ledger(
        organization_id, client_id, appointment_id, entry_type,
        points_delta, visits_delta, label
      ) values (
        new.organization_id, new.client_id, new.id, 'appointment_adjustment',
        v_points - v_state.points_awarded, v_visits - v_state.visits_awarded,
        'Ajustement du rendez-vous terminé'
      );
      update public.coiffure_appointment_loyalty_state
      set points_awarded = v_points, visits_awarded = v_visits
      where appointment_id = new.id;
    end if;

    perform public.issue_coiffure_threshold_rewards(new.organization_id, new.client_id);
  elsif new.status <> 'completed' and v_state.appointment_id is not null and v_state.active then
    insert into public.coiffure_loyalty_ledger(
      organization_id, client_id, appointment_id, entry_type,
      points_delta, visits_delta, label
    ) values (
      v_state.organization_id, v_state.client_id, new.id, 'appointment_reversal',
      -v_state.points_awarded, -v_state.visits_awarded,
      'Rendez-vous retiré du statut terminé'
    );
    update public.coiffure_appointment_loyalty_state set active = false where appointment_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists process_coiffure_appointment_loyalty on public.appointments;
create trigger process_coiffure_appointment_loyalty
after insert or update of status, amount_cents, client_id on public.appointments
for each row execute procedure public.process_coiffure_appointment_loyalty();

create or replace function public.update_coiffure_loyalty_settings(p_organization_id uuid, p_settings jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Droits insuffisants.';
  end if;
  if not exists (select 1 from public.organizations where id = p_organization_id and business_type = 'coiffure') then
    raise exception 'Espace Coiffure introuvable.';
  end if;

  insert into public.coiffure_loyalty_settings(organization_id, created_by)
  values(p_organization_id, auth.uid())
  on conflict(organization_id) do nothing;

  update public.coiffure_loyalty_settings set
    portal_enabled = coalesce((p_settings->>'portal_enabled')::boolean, portal_enabled),
    program_active = coalesce((p_settings->>'program_active')::boolean, program_active),
    program_name = coalesce(nullif(trim(p_settings->>'program_name'), ''), program_name),
    program_description = case when p_settings ? 'program_description' then nullif(trim(p_settings->>'program_description'), '') else program_description end,
    points_enabled = coalesce((p_settings->>'points_enabled')::boolean, points_enabled),
    points_per_euro = coalesce((p_settings->>'points_per_euro')::integer, points_per_euro),
    points_per_visit = coalesce((p_settings->>'points_per_visit')::integer, points_per_visit),
    points_reward_threshold = coalesce((p_settings->>'points_reward_threshold')::integer, points_reward_threshold),
    points_reward_label = coalesce(nullif(trim(p_settings->>'points_reward_label'), ''), points_reward_label),
    points_reward_kind = coalesce(nullif(trim(p_settings->>'points_reward_kind'), ''), points_reward_kind),
    points_reward_value = coalesce((p_settings->>'points_reward_value')::integer, points_reward_value),
    points_reward_valid_days = coalesce((p_settings->>'points_reward_valid_days')::integer, points_reward_valid_days),
    visits_enabled = coalesce((p_settings->>'visits_enabled')::boolean, visits_enabled),
    visits_required = coalesce((p_settings->>'visits_required')::integer, visits_required),
    visits_reward_label = coalesce(nullif(trim(p_settings->>'visits_reward_label'), ''), visits_reward_label),
    visits_reward_kind = coalesce(nullif(trim(p_settings->>'visits_reward_kind'), ''), visits_reward_kind),
    visits_reward_value = coalesce((p_settings->>'visits_reward_value')::integer, visits_reward_value),
    visits_reward_valid_days = coalesce((p_settings->>'visits_reward_valid_days')::integer, visits_reward_valid_days),
    birthday_enabled = coalesce((p_settings->>'birthday_enabled')::boolean, birthday_enabled),
    birthday_days_before = coalesce((p_settings->>'birthday_days_before')::integer, birthday_days_before),
    birthday_reward_label = coalesce(nullif(trim(p_settings->>'birthday_reward_label'), ''), birthday_reward_label),
    birthday_reward_kind = coalesce(nullif(trim(p_settings->>'birthday_reward_kind'), ''), birthday_reward_kind),
    birthday_reward_value = coalesce((p_settings->>'birthday_reward_value')::integer, birthday_reward_value),
    birthday_reward_valid_days = coalesce((p_settings->>'birthday_reward_valid_days')::integer, birthday_reward_valid_days),
    welcome_enabled = coalesce((p_settings->>'welcome_enabled')::boolean, welcome_enabled),
    welcome_points = coalesce((p_settings->>'welcome_points')::integer, welcome_points),
    welcome_reward_label = coalesce(nullif(trim(p_settings->>'welcome_reward_label'), ''), welcome_reward_label),
    welcome_reward_kind = coalesce(nullif(trim(p_settings->>'welcome_reward_kind'), ''), welcome_reward_kind),
    welcome_reward_value = coalesce((p_settings->>'welcome_reward_value')::integer, welcome_reward_value),
    welcome_reward_valid_days = coalesce((p_settings->>'welcome_reward_valid_days')::integer, welcome_reward_valid_days),
    allow_client_birthdate_edit = coalesce((p_settings->>'allow_client_birthdate_edit')::boolean, allow_client_birthdate_edit),
    updated_at = now()
  where organization_id = p_organization_id;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id)
  values(p_organization_id, auth.uid(), 'coiffure.loyalty_settings_updated', 'coiffure_loyalty_settings', p_organization_id::text);
end;
$$;

create or replace function public.coiffure_loyalty_admin_overview(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_client_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Droits insuffisants.';
  end if;

  insert into public.coiffure_loyalty_settings(organization_id, created_by)
  values(p_organization_id, auth.uid())
  on conflict(organization_id) do nothing;
  perform public.expire_coiffure_loyalty_rewards(p_organization_id, null);
  for v_client_id in
    select c.id from public.clients c
    where c.organization_id = p_organization_id
      and c.status = 'active'
      and c.birth_date is not null
      and c.birthday_consent
  loop
    perform public.ensure_coiffure_birthday_reward(p_organization_id, v_client_id);
  end loop;

  select jsonb_build_object(
    'settings', (select to_jsonb(s) from public.coiffure_loyalty_settings s where s.organization_id = p_organization_id),
    'summary', jsonb_build_object(
      'clients', (select count(*) from public.clients c where c.organization_id = p_organization_id and c.status = 'active'),
      'members', (select count(*) from public.clients c where c.organization_id = p_organization_id and c.status = 'active' and c.loyalty_opt_in),
      'portal_accounts', (select count(*) from public.coiffure_client_portal_accounts a where a.organization_id = p_organization_id and a.status = 'active'),
      'available_rewards', (select count(*) from public.coiffure_loyalty_rewards r where r.organization_id = p_organization_id and r.status = 'available')
    ),
    'clients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'first_name', c.first_name,
        'last_name', c.last_name,
        'email', c.email,
        'phone', c.phone,
        'birth_date', c.birth_date,
        'loyalty_opt_in', c.loyalty_opt_in,
        'birthday_consent', c.birthday_consent,
        'marketing_opt_in', c.marketing_opt_in,
        'points_balance', coalesce((select sum(l.points_delta) from public.coiffure_loyalty_ledger l where l.organization_id = c.organization_id and l.client_id = c.id), 0),
        'visits_balance', coalesce((select sum(l.visits_delta) from public.coiffure_loyalty_ledger l where l.organization_id = c.organization_id and l.client_id = c.id), 0),
        'available_rewards', (select count(*) from public.coiffure_loyalty_rewards r where r.organization_id = c.organization_id and r.client_id = c.id and r.status = 'available'),
        'completed_appointments', (select count(*) from public.appointments a where a.organization_id = c.organization_id and a.client_id = c.id and a.status = 'completed'),
        'portal_accounts', coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'email',a.email,'display_name',a.display_name,'status',a.status,'last_seen_at',a.last_seen_at) order by a.created_at desc) from public.coiffure_client_portal_accounts a where a.organization_id = c.organization_id and a.client_id = c.id), '[]'::jsonb),
        'pending_invitations', coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'display_name',i.display_name,'status',case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,'expires_at',i.expires_at) order by i.created_at desc) from public.coiffure_client_portal_invitations i where i.organization_id = c.organization_id and i.client_id = c.id and i.status = 'pending'), '[]'::jsonb)
      ) order by c.first_name, c.last_name)
      from public.clients c
      where c.organization_id = p_organization_id and c.status = 'active'
    ), '[]'::jsonb),
    'rewards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'client_id', r.client_id, 'source_type', r.source_type,
        'title', r.title, 'description', r.description, 'reward_kind', r.reward_kind,
        'reward_value', r.reward_value, 'status', r.status, 'issued_at', r.issued_at,
        'expires_at', r.expires_at, 'redeemed_at', r.redeemed_at
      ) order by r.issued_at desc)
      from (
        select * from public.coiffure_loyalty_rewards
        where organization_id = p_organization_id
        order by issued_at desc
        limit 300
      ) r
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.update_coiffure_client_loyalty_profile(
  p_organization_id uuid,
  p_client_id uuid,
  p_birth_date date,
  p_loyalty_opt_in boolean,
  p_birthday_consent boolean,
  p_marketing_opt_in boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Droits insuffisants.';
  end if;
  update public.clients
  set birth_date = p_birth_date,
      loyalty_opt_in = coalesce(p_loyalty_opt_in, true),
      birthday_consent = coalesce(p_birthday_consent, false),
      marketing_opt_in = coalesce(p_marketing_opt_in, false),
      updated_at = now()
  where organization_id = p_organization_id and id = p_client_id and status = 'active';
  if not found then raise exception 'Client introuvable.'; end if;
  perform public.ensure_coiffure_birthday_reward(p_organization_id, p_client_id);
end;
$$;

create or replace function public.adjust_coiffure_loyalty_balance(
  p_organization_id uuid,
  p_client_id uuid,
  p_points_delta integer default 0,
  p_visits_delta integer default 0,
  p_label text default 'Ajustement manuel',
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Droits insuffisants.'; end if;
  if coalesce(p_points_delta,0) = 0 and coalesce(p_visits_delta,0) = 0 then raise exception 'Saisissez un ajustement.'; end if;
  if not exists(select 1 from public.clients where organization_id=p_organization_id and id=p_client_id and status='active') then raise exception 'Client introuvable.'; end if;
  insert into public.coiffure_loyalty_ledger(organization_id,client_id,entry_type,points_delta,visits_delta,label,note,created_by)
  values(p_organization_id,p_client_id,'manual_adjustment',coalesce(p_points_delta,0),coalesce(p_visits_delta,0),coalesce(nullif(trim(p_label),''),'Ajustement manuel'),nullif(trim(coalesce(p_note,'')),''),auth.uid());
  perform public.issue_coiffure_threshold_rewards(p_organization_id,p_client_id);
end;
$$;

create or replace function public.issue_coiffure_manual_reward(
  p_organization_id uuid,
  p_client_id uuid,
  p_title text,
  p_description text default null,
  p_reward_kind text default 'custom',
  p_reward_value integer default 0,
  p_valid_days integer default 90
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Droits insuffisants.'; end if;
  if p_reward_kind not in ('discount_percent','discount_fixed','free_service','gift','custom') then raise exception 'Type de récompense invalide.'; end if;
  insert into public.coiffure_loyalty_rewards(organization_id,client_id,source_type,title,description,reward_kind,reward_value,expires_at,created_by)
  values(p_organization_id,p_client_id,'manual',trim(p_title),nullif(trim(coalesce(p_description,'')),''),p_reward_kind,coalesce(p_reward_value,0),now()+make_interval(days=>greatest(1,least(coalesce(p_valid_days,90),730))),auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.set_coiffure_loyalty_reward_status(
  p_organization_id uuid,
  p_reward_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Droits insuffisants.'; end if;
  if p_status not in ('available','redeemed','cancelled') then raise exception 'Statut invalide.'; end if;
  update public.coiffure_loyalty_rewards
  set status=p_status,
      redeemed_at=case when p_status='redeemed' then now() else null end,
      redeemed_by=case when p_status='redeemed' then auth.uid() else null end,
      updated_at=now()
  where organization_id=p_organization_id and id=p_reward_id and status<>'expired';
  if not found then raise exception 'Récompense introuvable ou expirée.'; end if;
end;
$$;

-- Invitation client et file e-mail.
alter table public.email_outbox drop constraint if exists email_outbox_template_key_check;
alter table public.email_outbox add constraint email_outbox_template_key_check check (template_key in (
  'customer_pending','customer_confirmed','customer_rescheduled','customer_cancelled','customer_reminder',
  'business_new_booking','business_rescheduled','business_cancelled','team_invitation',
  'training_convocation','training_attestation','training_satisfaction_request',
  'security_client_portal_invitation','cleaning_client_portal_invitation','coiffure_client_portal_invitation'
));

create or replace function public.get_coiffure_client_portal_invitation(p_token text)
returns table(
  organization_name text,
  organization_logo_url text,
  organization_primary_color text,
  client_name text,
  invited_email text,
  invited_name text,
  invitation_status text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(o.public_name,o.name),o.logo_url,o.primary_color,
         trim(concat(c.first_name,' ',coalesce(c.last_name,''))),i.email,i.display_name,
         case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,
         i.expires_at
  from public.coiffure_client_portal_invitations i
  join public.organizations o on o.id=i.organization_id
  join public.clients c on c.organization_id=i.organization_id and c.id=i.client_id
  where i.token_hash=extensions.digest(trim(p_token),'sha256')
    and public.coiffure_client_portal_feature_enabled(i.organization_id)
  limit 1;
$$;

create or replace function public.enqueue_coiffure_client_portal_invitation_email(p_invitation_id uuid,p_raw_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.coiffure_client_portal_invitations%rowtype;
  v_org public.organizations%rowtype;
  v_client public.clients%rowtype;
  v_key text;
begin
  select * into v_inv from public.coiffure_client_portal_invitations where id=p_invitation_id;
  if v_inv.id is null or v_inv.status<>'pending' then return; end if;
  select * into v_org from public.organizations where id=v_inv.organization_id;
  select * into v_client from public.clients where organization_id=v_inv.organization_id and id=v_inv.client_id;
  v_key := 'coiffure-client-portal:'||v_inv.id::text||':'||encode(extensions.digest(p_raw_token,'sha256'),'hex');
  insert into public.email_outbox(organization_id,appointment_id,template_key,recipient_email,recipient_name,payload,dedupe_key,status,scheduled_for,attempts)
  values(v_inv.organization_id,null,'coiffure_client_portal_invitation',lower(v_inv.email),coalesce(v_inv.display_name,v_client.first_name),
    jsonb_build_object(
      'organization_name',coalesce(v_org.public_name,v_org.name),
      'organization_slug',v_org.slug,
      'organization_primary_color',v_org.primary_color,
      'organization_logo_url',v_org.logo_url,
      'client_name',trim(concat(v_client.first_name,' ',coalesce(v_client.last_name,''))),
      'invitation_token',p_raw_token,
      'invited_name',v_inv.display_name,
      'expires_at',v_inv.expires_at,
      'contact_email',v_org.company_email,
      'contact_phone',v_org.company_phone
    ),v_key,'pending',now(),0)
  on conflict(dedupe_key) do nothing;
end;
$$;

create or replace function public.create_coiffure_client_portal_invitation(
  p_organization_id uuid,
  p_client_id uuid,
  p_email text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_token text; v_email text:=lower(trim(coalesce(p_email,'')));
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'Droits insuffisants.'; end if;
  if not public.coiffure_client_portal_feature_enabled(p_organization_id) then raise exception 'L’espace client Coiffure est désactivé.'; end if;
  if v_email='' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Adresse e-mail invalide.'; end if;
  if not exists(select 1 from public.clients where organization_id=p_organization_id and id=p_client_id and status='active') then raise exception 'Client introuvable.'; end if;
  if exists(select 1 from public.coiffure_client_portal_accounts where organization_id=p_organization_id and client_id=p_client_id and lower(email)=v_email and status='active') then raise exception 'Ce client possède déjà un accès actif avec cette adresse.'; end if;

  update public.coiffure_client_portal_invitations set status='revoked',revoked_at=now(),updated_at=now()
  where organization_id=p_organization_id and client_id=p_client_id and lower(email)=v_email and status='pending';

  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.coiffure_client_portal_invitations(organization_id,client_id,email,display_name,token_hash,status,expires_at,invited_by)
  values(p_organization_id,p_client_id,v_email,nullif(trim(coalesce(p_display_name,'')),''),extensions.digest(v_token,'sha256'),'pending',now()+interval '7 days',auth.uid())
  returning id into v_id;
  perform public.enqueue_coiffure_client_portal_invitation_email(v_id,v_token);
  return v_id;
end;
$$;

create or replace function public.resend_coiffure_client_portal_invitation(p_organization_id uuid,p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_token text; v_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'Droits insuffisants.'; end if;
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  update public.coiffure_client_portal_invitations
  set token_hash=extensions.digest(v_token,'sha256'),status='pending',expires_at=now()+interval '7 days',revoked_at=null,updated_at=now()
  where organization_id=p_organization_id and id=p_invitation_id and status in ('pending','expired')
  returning id into v_id;
  if v_id is null then raise exception 'Invitation introuvable.'; end if;
  perform public.enqueue_coiffure_client_portal_invitation_email(v_id,v_token);
end;
$$;

create or replace function public.revoke_coiffure_client_portal_invitation(p_organization_id uuid,p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'Droits insuffisants.'; end if;
  update public.coiffure_client_portal_invitations set status='revoked',revoked_at=now(),updated_at=now()
  where organization_id=p_organization_id and id=p_invitation_id and status='pending';
end;
$$;

create or replace function public.set_coiffure_client_portal_account_status(
  p_organization_id uuid,
  p_account_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Droits insuffisants.';
  end if;
  if p_status not in ('active','suspended') then raise exception 'Statut invalide.'; end if;
  update public.coiffure_client_portal_accounts
  set status=p_status,updated_at=now()
  where organization_id=p_organization_id and id=p_account_id;
  if not found then raise exception 'Accès client introuvable.'; end if;
end;
$$;

create or replace function public.accept_coiffure_client_portal_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_inv public.coiffure_client_portal_invitations%rowtype; v_id uuid; v_auth_email text;
begin
  if auth.uid() is null then raise exception 'Connecte-toi pour activer cet accès.'; end if;
  select lower(email) into v_auth_email from auth.users where id=auth.uid();
  select * into v_inv from public.coiffure_client_portal_invitations
  where token_hash=extensions.digest(trim(p_token),'sha256') for update;
  if v_inv.id is null then raise exception 'Invitation introuvable.'; end if;
  if v_inv.status<>'pending' then raise exception 'Cette invitation n’est plus disponible.'; end if;
  if v_inv.expires_at<=now() then update public.coiffure_client_portal_invitations set status='expired',updated_at=now() where id=v_inv.id; raise exception 'Cette invitation a expiré.'; end if;
  if lower(v_inv.email)<>v_auth_email then raise exception 'Cette invitation est liée à une autre adresse e-mail.'; end if;
  if not public.coiffure_client_portal_feature_enabled(v_inv.organization_id) then raise exception 'L’espace client est actuellement désactivé.'; end if;

  insert into public.coiffure_client_portal_accounts(organization_id,client_id,user_id,email,display_name,status,last_seen_at)
  values(v_inv.organization_id,v_inv.client_id,auth.uid(),v_auth_email,v_inv.display_name,'active',now())
  on conflict(organization_id,client_id,user_id) do update set email=excluded.email,display_name=coalesce(excluded.display_name,public.coiffure_client_portal_accounts.display_name),status='active',last_seen_at=now(),updated_at=now()
  returning id into v_id;

  update public.coiffure_client_portal_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now(),updated_at=now() where id=v_inv.id;
  perform public.apply_coiffure_welcome_benefit(v_inv.organization_id,v_inv.client_id);
  perform public.ensure_coiffure_birthday_reward(v_inv.organization_id,v_inv.client_id);
  return v_id;
end;
$$;

create or replace function public.current_coiffure_client_portal_accounts()
returns table(
  account_id uuid,
  organization_id uuid,
  client_id uuid,
  organization_name text,
  organization_logo_url text,
  organization_primary_color text,
  client_name text,
  display_name text,
  unread_rewards integer,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id,a.organization_id,a.client_id,coalesce(o.public_name,o.name),o.logo_url,o.primary_color,
         trim(concat(c.first_name,' ',coalesce(c.last_name,''))),a.display_name,
         (select count(*)::integer from public.coiffure_loyalty_rewards r where r.organization_id=a.organization_id and r.client_id=a.client_id and r.status='available'),
         a.last_seen_at
  from public.coiffure_client_portal_accounts a
  join public.organizations o on o.id=a.organization_id
  join public.clients c on c.organization_id=a.organization_id and c.id=a.client_id
  where a.user_id=auth.uid() and a.status='active' and c.status='active'
    and public.coiffure_client_portal_feature_enabled(a.organization_id)
  order by o.name,c.first_name;
$$;

create or replace function public.coiffure_client_portal_dashboard(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_account public.coiffure_client_portal_accounts%rowtype; v_result jsonb;
begin
  if not public.is_coiffure_client_portal_account(p_account_id) then raise exception 'Accès refusé.'; end if;
  select * into v_account from public.coiffure_client_portal_accounts where id=p_account_id;
  update public.coiffure_client_portal_accounts set last_seen_at=now(),updated_at=now() where id=p_account_id;
  perform public.expire_coiffure_loyalty_rewards(v_account.organization_id,v_account.client_id);
  perform public.ensure_coiffure_birthday_reward(v_account.organization_id,v_account.client_id);

  select jsonb_build_object(
    'organization', (select jsonb_build_object('id',o.id,'name',coalesce(o.public_name,o.name),'slug',o.slug,'logo_url',o.logo_url,'primary_color',o.primary_color,'email',o.company_email,'phone',o.company_phone,'address',coalesce(o.booking_address,o.company_address)) from public.organizations o where o.id=v_account.organization_id),
    'client', (select jsonb_build_object('id',c.id,'first_name',c.first_name,'last_name',c.last_name,'email',c.email,'phone',c.phone,'birth_date',c.birth_date,'loyalty_opt_in',c.loyalty_opt_in,'birthday_consent',c.birthday_consent,'marketing_opt_in',c.marketing_opt_in) from public.clients c where c.organization_id=v_account.organization_id and c.id=v_account.client_id),
    'settings', (select to_jsonb(s) from public.coiffure_loyalty_settings s where s.organization_id=v_account.organization_id),
    'balance', jsonb_build_object(
      'points',coalesce((select sum(l.points_delta) from public.coiffure_loyalty_ledger l where l.organization_id=v_account.organization_id and l.client_id=v_account.client_id),0),
      'visits',coalesce((select sum(l.visits_delta) from public.coiffure_loyalty_ledger l where l.organization_id=v_account.organization_id and l.client_id=v_account.client_id),0)
    ),
    'rewards',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'source_type',r.source_type,'title',r.title,'description',r.description,'reward_kind',r.reward_kind,'reward_value',r.reward_value,'status',r.status,'issued_at',r.issued_at,'expires_at',r.expires_at,'redeemed_at',r.redeemed_at) order by case when r.status='available' then 0 else 1 end,r.issued_at desc) from public.coiffure_loyalty_rewards r where r.organization_id=v_account.organization_id and r.client_id=v_account.client_id), '[]'::jsonb),
    'history',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'entry_type',l.entry_type,'points_delta',l.points_delta,'visits_delta',l.visits_delta,'label',l.label,'created_at',l.created_at) order by l.created_at desc) from (select * from public.coiffure_loyalty_ledger where organization_id=v_account.organization_id and client_id=v_account.client_id order by created_at desc limit 50) l), '[]'::jsonb),
    'appointments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'starts_at',a.starts_at,'ends_at',a.ends_at,'status',a.status,'amount_cents',a.amount_cents,'public_token',a.public_token,'service_name',coalesce(s.name,'Prestation'),'staff_name',coalesce(st.display_name,'Équipe du salon'),'site_name',os.name) order by a.starts_at desc) from (select * from public.appointments where organization_id=v_account.organization_id and client_id=v_account.client_id order by starts_at desc limit 100) a left join public.services s on s.organization_id=a.organization_id and s.id=a.service_id left join public.staff st on st.organization_id=a.organization_id and st.id=a.staff_id left join public.organization_sites os on os.organization_id=a.organization_id and os.id=a.site_id), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.update_coiffure_client_portal_profile(
  p_account_id uuid,
  p_birth_date date,
  p_birthday_consent boolean,
  p_marketing_opt_in boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_account public.coiffure_client_portal_accounts%rowtype; v_settings public.coiffure_loyalty_settings%rowtype;
begin
  if not public.is_coiffure_client_portal_account(p_account_id) then raise exception 'Accès refusé.'; end if;
  select * into v_account from public.coiffure_client_portal_accounts where id=p_account_id;
  select * into v_settings from public.coiffure_loyalty_settings where organization_id=v_account.organization_id;
  update public.clients
  set birth_date=case when v_settings.allow_client_birthdate_edit then p_birth_date else birth_date end,
      birthday_consent=coalesce(p_birthday_consent,false),
      marketing_opt_in=coalesce(p_marketing_opt_in,false),updated_at=now()
  where organization_id=v_account.organization_id and id=v_account.client_id;
  perform public.ensure_coiffure_birthday_reward(v_account.organization_id,v_account.client_id);
end;
$$;

-- Les RPC sont les seuls points d'accès aux données fidélité et portail.
revoke all on function public.coiffure_client_portal_feature_enabled(uuid) from public;
revoke all on function public.is_coiffure_client_portal_account(uuid) from public;
revoke all on function public.expire_coiffure_loyalty_rewards(uuid,uuid) from public;
revoke all on function public.issue_coiffure_threshold_rewards(uuid,uuid) from public;
revoke all on function public.ensure_coiffure_birthday_reward(uuid,uuid) from public;
revoke all on function public.apply_coiffure_welcome_benefit(uuid,uuid) from public;
revoke all on function public.process_coiffure_appointment_loyalty() from public;
revoke all on function public.update_coiffure_loyalty_settings(uuid,jsonb) from public;
revoke all on function public.coiffure_loyalty_admin_overview(uuid) from public;
revoke all on function public.update_coiffure_client_loyalty_profile(uuid,uuid,date,boolean,boolean,boolean) from public;
revoke all on function public.adjust_coiffure_loyalty_balance(uuid,uuid,integer,integer,text,text) from public;
revoke all on function public.issue_coiffure_manual_reward(uuid,uuid,text,text,text,integer,integer) from public;
revoke all on function public.set_coiffure_loyalty_reward_status(uuid,uuid,text) from public;
revoke all on function public.get_coiffure_client_portal_invitation(text) from public;
revoke all on function public.enqueue_coiffure_client_portal_invitation_email(uuid,text) from public;
revoke all on function public.create_coiffure_client_portal_invitation(uuid,uuid,text,text) from public;
revoke all on function public.resend_coiffure_client_portal_invitation(uuid,uuid) from public;
revoke all on function public.revoke_coiffure_client_portal_invitation(uuid,uuid) from public;
revoke all on function public.set_coiffure_client_portal_account_status(uuid,uuid,text) from public;
revoke all on function public.accept_coiffure_client_portal_invitation(text) from public;
revoke all on function public.current_coiffure_client_portal_accounts() from public;
revoke all on function public.coiffure_client_portal_dashboard(uuid) from public;
revoke all on function public.update_coiffure_client_portal_profile(uuid,date,boolean,boolean) from public;

grant execute on function public.update_coiffure_loyalty_settings(uuid,jsonb) to authenticated;
grant execute on function public.coiffure_loyalty_admin_overview(uuid) to authenticated;
grant execute on function public.update_coiffure_client_loyalty_profile(uuid,uuid,date,boolean,boolean,boolean) to authenticated;
grant execute on function public.adjust_coiffure_loyalty_balance(uuid,uuid,integer,integer,text,text) to authenticated;
grant execute on function public.issue_coiffure_manual_reward(uuid,uuid,text,text,text,integer,integer) to authenticated;
grant execute on function public.set_coiffure_loyalty_reward_status(uuid,uuid,text) to authenticated;
grant execute on function public.get_coiffure_client_portal_invitation(text) to anon,authenticated;
grant execute on function public.create_coiffure_client_portal_invitation(uuid,uuid,text,text) to authenticated;
grant execute on function public.resend_coiffure_client_portal_invitation(uuid,uuid) to authenticated;
grant execute on function public.revoke_coiffure_client_portal_invitation(uuid,uuid) to authenticated;
grant execute on function public.set_coiffure_client_portal_account_status(uuid,uuid,text) to authenticated;
grant execute on function public.accept_coiffure_client_portal_invitation(text) to authenticated;
grant execute on function public.current_coiffure_client_portal_accounts() to authenticated;
grant execute on function public.coiffure_client_portal_dashboard(uuid) to authenticated;
grant execute on function public.update_coiffure_client_portal_profile(uuid,date,boolean,boolean) to authenticated;

insert into public.platform_release_state(singleton,database_version,expected_frontend_version,expected_pwa_cache,installed_at,installed_by,notes)
values(true,'2.12.3','2.12.3','ncr-suite-shell-v2.12.3-coiffure-loyalty-portal',now(),auth.uid(),
  'Phase 3 finalisée : fidélité configurable et espace client Coiffure avec rendez-vous, points, passages, anniversaire, bienvenue et récompenses libres.')
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

notify pgrst, 'reload schema';
commit;
