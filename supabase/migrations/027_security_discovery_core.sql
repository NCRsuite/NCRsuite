-- NCR Suite V2.5.0 — Socle Sécurité privée · offre Découverte
-- À exécuter après 026_central_offer_catalog.sql.
-- Active le domaine Sécurité et installe : clients, sites, agents, planning et facturation prévisionnelle.

begin;

update public.business_domain_catalog
set launch_status = 'active',
    active = true,
    updated_at = now()
where business_type = 'securite';

create table if not exists public.security_clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_name text not null check (char_length(trim(company_name)) between 2 and 160),
  contact_name text,
  email text,
  phone text,
  billing_address text,
  postal_code text,
  city text,
  siret text,
  vat_number text,
  payment_terms_days integer not null default 30 check (payment_terms_days between 0 and 180),
  notes text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.security_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 160),
  code text,
  address text,
  postal_code text,
  city text,
  contact_name text,
  contact_phone text,
  hourly_rate_cents integer not null default 0 check (hourly_rate_cents between 0 and 1000000),
  timezone text not null default 'Europe/Paris',
  notes text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint security_sites_client_fk foreign key (organization_id, client_id)
    references public.security_clients(organization_id, id) on delete restrict
);

create table if not exists public.security_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name text not null check (char_length(trim(last_name)) between 1 and 100),
  employee_number text,
  email text,
  phone text,
  contract_type text not null default 'cdi' check (contract_type in ('cdi','cdd','interim','sous_traitant','autre')),
  weekly_hours numeric(5,2) not null default 35 check (weekly_hours between 0 and 80),
  notes text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.security_shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null,
  agent_id uuid not null,
  title text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes integer not null default 0 check (break_minutes between 0 and 720),
  status text not null default 'planned' check (status in ('planned','completed','canceled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint security_shifts_site_fk foreign key (organization_id, site_id)
    references public.security_sites(organization_id, id) on delete restrict,
  constraint security_shifts_agent_fk foreign key (organization_id, agent_id)
    references public.security_agents(organization_id, id) on delete restrict,
  constraint security_shift_dates_check check (ends_at > starts_at)
);

create sequence if not exists public.security_invoice_number_seq;

create table if not exists public.security_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  invoice_number text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft','issued','paid','canceled')),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  notes text,
  issued_at timestamptz,
  paid_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number),
  unique (organization_id, id),
  constraint security_invoices_client_fk foreign key (organization_id, client_id)
    references public.security_clients(organization_id, id) on delete restrict,
  constraint security_invoice_period_check check (period_end >= period_start)
);

create table if not exists public.security_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null,
  site_id uuid not null,
  description text not null,
  scheduled_minutes integer not null check (scheduled_minutes >= 0),
  hourly_rate_cents integer not null check (hourly_rate_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now(),
  constraint security_invoice_lines_invoice_fk foreign key (organization_id, invoice_id)
    references public.security_invoices(organization_id, id) on delete cascade,
  constraint security_invoice_lines_site_fk foreign key (organization_id, site_id)
    references public.security_sites(organization_id, id) on delete restrict
);

create index if not exists idx_security_clients_org_status on public.security_clients(organization_id, status, company_name);
create index if not exists idx_security_sites_org_client on public.security_sites(organization_id, client_id, status);
create index if not exists idx_security_agents_org_status on public.security_agents(organization_id, status, last_name, first_name);
create index if not exists idx_security_shifts_org_dates on public.security_shifts(organization_id, starts_at, ends_at);
create index if not exists idx_security_shifts_agent_dates on public.security_shifts(organization_id, agent_id, starts_at, ends_at);
create index if not exists idx_security_invoices_org_created on public.security_invoices(organization_id, created_at desc);
create index if not exists idx_security_invoice_lines_invoice on public.security_invoice_lines(organization_id, invoice_id);

create or replace function public.validate_security_organization()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.organizations o
    where o.id = new.organization_id
      and o.business_type = 'securite'
      and o.status in ('trial','active')
  ) then
    raise exception 'Ce module est réservé à un espace Sécurité actif.';
  end if;
  return new;
end;
$$;

create or replace function public.validate_security_shift()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_duration integer;
begin
  if new.ends_at <= new.starts_at then
    raise exception 'La fin de mission doit être postérieure au début.';
  end if;

  v_duration := floor(extract(epoch from (new.ends_at - new.starts_at)) / 60)::integer;
  if new.break_minutes >= v_duration then
    raise exception 'La pause doit être inférieure à la durée totale de la mission.';
  end if;

  if not exists (
    select 1 from public.security_agents a
    where a.organization_id = new.organization_id and a.id = new.agent_id and a.status = 'active'
  ) then
    raise exception 'L’agent sélectionné est introuvable ou inactif.';
  end if;

  if not exists (
    select 1 from public.security_sites s
    where s.organization_id = new.organization_id and s.id = new.site_id and s.status = 'active'
  ) then
    raise exception 'Le site sélectionné est introuvable ou inactif.';
  end if;

  if new.status <> 'canceled' and exists (
    select 1 from public.security_shifts s
    where s.organization_id = new.organization_id
      and s.agent_id = new.agent_id
      and (tg_op = 'INSERT' or s.id <> new.id)
      and s.status <> 'canceled'
      and tstzrange(s.starts_at, s.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
  ) then
    raise exception 'Cet agent possède déjà une mission sur ce créneau.';
  end if;

  return new;
end;
$$;

create or replace function public.set_security_invoice_status_dates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'issued' and old.status is distinct from 'issued' then
    new.issued_at := coalesce(new.issued_at, now());
  end if;
  if new.status = 'paid' and old.status is distinct from 'paid' then
    new.issued_at := coalesce(new.issued_at, now());
    new.paid_at := coalesce(new.paid_at, now());
  end if;
  return new;
end;
$$;

-- Déclencheurs idempotents.
do $$
declare t text;
begin
  foreach t in array array['security_clients','security_sites','security_agents','security_shifts','security_invoices'] loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', 'set_' || t || '_updated_at', t);
    execute format('drop trigger if exists %I on public.%I', 'validate_' || t || '_organization', t);
    execute format('create trigger %I before insert or update of organization_id on public.%I for each row execute procedure public.validate_security_organization()', 'validate_' || t || '_organization', t);
  end loop;
end
$$;

drop trigger if exists validate_security_shift_trigger on public.security_shifts;
create trigger validate_security_shift_trigger
before insert or update on public.security_shifts
for each row execute procedure public.validate_security_shift();

drop trigger if exists set_security_invoice_status_dates_trigger on public.security_invoices;
create trigger set_security_invoice_status_dates_trigger
before update of status on public.security_invoices
for each row execute procedure public.set_security_invoice_status_dates();

alter table public.security_clients enable row level security;
alter table public.security_sites enable row level security;
alter table public.security_agents enable row level security;
alter table public.security_shifts enable row level security;
alter table public.security_invoices enable row level security;
alter table public.security_invoice_lines enable row level security;

-- Les référentiels et le planning sont administrables par le responsable de l'espace.
do $$
declare t text;
begin
  foreach t in array array['security_clients','security_sites','security_agents','security_shifts'] loop
    execute format('drop policy if exists %I on public.%I', t || '_member_select', t);
    execute format('create policy %I on public.%I for select using (public.is_org_member(organization_id))', t || '_member_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_manager_insert', t);
    execute format('create policy %I on public.%I for insert with check (public.has_org_role(organization_id, array[''owner'',''admin'',''manager'']))', t || '_manager_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_manager_update', t);
    execute format('create policy %I on public.%I for update using (public.has_org_role(organization_id, array[''owner'',''admin'',''manager''])) with check (public.has_org_role(organization_id, array[''owner'',''admin'',''manager'']))', t || '_manager_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_delete', t);
    execute format('create policy %I on public.%I for delete using (public.has_org_role(organization_id, array[''owner'',''admin'']))', t || '_admin_delete', t);
  end loop;
end
$$;

-- Les factures sont lisibles par les membres, mais leur création et leur statut passent
-- exclusivement par les fonctions sécurisées ci-dessous.
drop policy if exists security_invoices_member_select on public.security_invoices;
create policy security_invoices_member_select on public.security_invoices
for select using (public.is_org_member(organization_id));

drop policy if exists security_invoice_lines_member_select on public.security_invoice_lines;
create policy security_invoice_lines_member_select on public.security_invoice_lines
for select using (public.is_org_member(organization_id));

do $$
declare
  t text;
  suffix text;
begin
  foreach t in array array['security_invoices','security_invoice_lines'] loop
    foreach suffix in array array['manager_insert','manager_update','admin_delete'] loop
      execute format('drop policy if exists %I on public.%I', t || '_' || suffix, t);
    end loop;
  end loop;
end
$$;

grant select, insert, update, delete on public.security_clients to authenticated;
grant select, insert, update, delete on public.security_sites to authenticated;
grant select, insert, update, delete on public.security_agents to authenticated;
grant select, insert, update, delete on public.security_shifts to authenticated;
grant select on public.security_invoices to authenticated;
grant select on public.security_invoice_lines to authenticated;
revoke insert, update, delete on public.security_invoices from authenticated;
revoke insert, update, delete on public.security_invoice_lines from authenticated;

create or replace function public.generate_security_invoice(
  p_organization_id uuid,
  p_client_id uuid,
  p_period_start date,
  p_period_end date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_invoice_number text;
  v_total integer := 0;
  v_line_count integer := 0;
  v_seq bigint;
  r record;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;

  if not public.organization_has_plan_feature(p_organization_id, 'security_scheduled_billing') then
    raise exception 'La facturation Sécurité n’est pas incluse dans cette offre.';
  end if;

  if p_period_end < p_period_start then
    raise exception 'La date de fin doit être postérieure ou égale à la date de début.';
  end if;

  if not exists (
    select 1 from public.security_clients c
    where c.organization_id = p_organization_id and c.id = p_client_id and c.status <> 'archived'
  ) then
    raise exception 'Client introuvable.';
  end if;

  if exists (
    select 1
    from public.security_invoices i
    where i.organization_id = p_organization_id
      and i.client_id = p_client_id
      and i.period_start = p_period_start
      and i.period_end = p_period_end
      and i.status <> 'canceled'
  ) then
    raise exception 'Une préfacture existe déjà pour ce client et cette période.';
  end if;

  v_seq := nextval('public.security_invoice_number_seq');
  v_invoice_number := 'SEC-' || to_char(current_date, 'YYYY') || '-' || lpad(v_seq::text, 6, '0');

  insert into public.security_invoices (
    organization_id, client_id, invoice_number, period_start, period_end, status, notes, created_by
  ) values (
    p_organization_id, p_client_id, v_invoice_number, p_period_start, p_period_end, 'draft', nullif(trim(coalesce(p_notes,'')),''), auth.uid()
  ) returning id into v_invoice_id;

  for r in
    select
      s.id as site_id,
      s.name as site_name,
      s.hourly_rate_cents,
      sum(greatest(0, floor(extract(epoch from (sh.ends_at - sh.starts_at)) / 60)::integer - sh.break_minutes))::integer as scheduled_minutes
    from public.security_sites s
    join public.security_shifts sh
      on sh.organization_id = s.organization_id and sh.site_id = s.id
    where s.organization_id = p_organization_id
      and s.client_id = p_client_id
      and sh.status <> 'canceled'
      and sh.starts_at >= (p_period_start::timestamp at time zone coalesce(nullif(s.timezone, ''), 'Europe/Paris'))
      and sh.starts_at < ((p_period_end + 1)::timestamp at time zone coalesce(nullif(s.timezone, ''), 'Europe/Paris'))
    group by s.id, s.name, s.hourly_rate_cents
    having sum(greatest(0, floor(extract(epoch from (sh.ends_at - sh.starts_at)) / 60)::integer - sh.break_minutes)) > 0
    order by s.name
  loop
    insert into public.security_invoice_lines (
      organization_id, invoice_id, site_id, description, scheduled_minutes, hourly_rate_cents, line_total_cents
    ) values (
      p_organization_id,
      v_invoice_id,
      r.site_id,
      'Heures de sécurité programmées — ' || r.site_name,
      r.scheduled_minutes,
      r.hourly_rate_cents,
      round((r.scheduled_minutes::numeric / 60) * r.hourly_rate_cents)::integer
    );
    v_total := v_total + round((r.scheduled_minutes::numeric / 60) * r.hourly_rate_cents)::integer;
    v_line_count := v_line_count + 1;
  end loop;

  if v_line_count = 0 then
    delete from public.security_invoices where id = v_invoice_id;
    raise exception 'Aucune heure programmée facturable sur cette période.';
  end if;

  update public.security_invoices
  set subtotal_cents = v_total, total_cents = v_total
  where id = v_invoice_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'security.invoice_generated',
    'security_invoice',
    v_invoice_id::text,
    jsonb_build_object('client_id', p_client_id, 'period_start', p_period_start, 'period_end', p_period_end, 'total_cents', v_total)
  );

  return v_invoice_id;
end;
$$;

revoke all on function public.generate_security_invoice(uuid,uuid,date,date,text) from public;
grant execute on function public.generate_security_invoice(uuid,uuid,date,date,text) to authenticated;

create or replace function public.set_security_invoice_status(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_status text
)
returns table(status text, issued_at timestamptz, paid_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;

  if p_status not in ('issued','paid','canceled') then
    raise exception 'Statut de facture invalide.';
  end if;

  select i.status
  into v_current_status
  from public.security_invoices i
  where i.organization_id = p_organization_id
    and i.id = p_invoice_id
  for update;

  if not found then
    raise exception 'Préfacture introuvable.';
  end if;

  if not (
    (v_current_status = 'draft' and p_status in ('issued','canceled'))
    or (v_current_status = 'issued' and p_status in ('paid','canceled'))
    or (v_current_status = p_status)
  ) then
    raise exception 'Transition de statut non autorisée : % vers %.', v_current_status, p_status;
  end if;

  update public.security_invoices i
  set status = p_status
  where i.organization_id = p_organization_id
    and i.id = p_invoice_id
  returning i.status, i.issued_at, i.paid_at
  into status, issued_at, paid_at;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'security.invoice_status_changed',
    'security_invoice',
    p_invoice_id::text,
    jsonb_build_object('previous_status', v_current_status, 'new_status', p_status)
  );

  return next;
end;
$$;

revoke all on function public.set_security_invoice_status(uuid,uuid,text) from public;
grant execute on function public.set_security_invoice_status(uuid,uuid,text) to authenticated;

-- Modules visibles dans les configurations Métier et l'administration.
insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, active, sort_order
)
values
  ('security_clients', 'Clients Sécurité', 'Clients donneurs d’ordre et informations de facturation.', 'securite', 'users', '{securite}', false, true, true, 510),
  ('security_sites', 'Sites Sécurité', 'Sites surveillés, contacts et tarifs horaires.', 'securite', 'map', '{securite}', false, true, true, 520),
  ('security_agents', 'Agents Sécurité', 'Fichier agents et informations contractuelles.', 'securite', 'users', '{securite}', false, true, true, 530),
  ('security_planning', 'Planning Sécurité', 'Missions programmées par agent et par site.', 'securite', 'calendar', '{securite}', false, true, true, 540),
  ('security_billing', 'Facturation Sécurité', 'Préfacturation selon les heures programmées et le tarif du site.', 'securite', 'creditCard', '{securite}', false, true, true, 550)
on conflict (module_key) do update
set display_name = excluded.display_name,
    description = excluded.description,
    category = excluded.category,
    icon_key = excluded.icon_key,
    compatible_business_types = excluded.compatible_business_types,
    core_module = excluded.core_module,
    default_enabled = excluded.default_enabled,
    active = excluded.active,
    sort_order = excluded.sort_order,
    updated_at = now();

-- Les nouveaux espaces Sécurité reçoivent le socle Découverte.
create or replace function public.bootstrap_security_modules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.business_type = 'securite' then
    insert into public.organization_modules (organization_id, module_key, enabled)
    values
      (new.id, 'security_clients', true),
      (new.id, 'security_sites', true),
      (new.id, 'security_agents', true),
      (new.id, 'security_planning', true),
      (new.id, 'security_billing', true)
    on conflict (organization_id, module_key) do update set enabled = true, updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists bootstrap_security_modules_trigger on public.organizations;
create trigger bootstrap_security_modules_trigger
after insert or update of business_type on public.organizations
for each row execute procedure public.bootstrap_security_modules();

insert into public.organization_modules (organization_id, module_key, enabled)
select o.id, m.module_key, true
from public.organizations o
cross join (values ('security_clients'),('security_sites'),('security_agents'),('security_planning'),('security_billing')) m(module_key)
where o.business_type = 'securite'
on conflict (organization_id, module_key) do update set enabled = true, updated_at = now();

commit;
