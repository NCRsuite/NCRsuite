-- NCR Suite V2.14.0 — Formation : entreprises, financeurs et dossiers commerciaux
-- À exécuter après 067_restaurant_finalization_release.sql.

begin;

create table if not exists public.training_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid,
  customer_type text not null default 'company' check (customer_type in ('company','individual')),
  legal_name text not null check (char_length(trim(legal_name)) between 2 and 180),
  contact_name text,
  email text,
  phone text,
  billing_address text,
  postal_code text,
  city text,
  siret text,
  vat_number text,
  notes text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint training_customers_site_fk foreign key (organization_id, site_id)
    references public.organization_sites(organization_id, id) on delete restrict
);

create index if not exists idx_training_customers_org_status_name
  on public.training_customers(organization_id, status, legal_name);

create table if not exists public.training_funders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  funder_type text not null default 'opco' check (funder_type in ('opco','employer','cpf','public','self','other')),
  name text not null check (char_length(trim(name)) between 2 and 180),
  contact_name text,
  email text,
  phone text,
  billing_address text,
  postal_code text,
  city text,
  reference_code text,
  notes text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create index if not exists idx_training_funders_org_status_name
  on public.training_funders(organization_id, status, name);

create table if not exists public.training_commercial_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  counter_year integer not null,
  document_type text not null check (document_type in ('quote','agreement','contract')),
  current_value integer not null default 0 check (current_value >= 0),
  primary key (organization_id, counter_year, document_type)
);

create table if not exists public.training_commercial_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid,
  customer_id uuid,
  funder_id uuid,
  session_id uuid,
  trainee_id uuid,
  document_type text not null check (document_type in ('quote','agreement','contract')),
  reference text,
  title text not null check (char_length(trim(title)) between 2 and 200),
  training_summary text,
  participant_count integer not null default 1 check (participant_count between 1 and 10000),
  issue_date date not null default current_date,
  valid_until date,
  status text not null default 'draft' check (status in ('draft','sent','accepted','signed','refused','canceled','completed')),
  amount_excl_tax_cents integer not null default 0 check (amount_excl_tax_cents >= 0),
  vat_rate_basis_points integer not null default 2000 check (vat_rate_basis_points between 0 and 10000),
  tax_cents integer generated always as (round((amount_excl_tax_cents::numeric * vat_rate_basis_points::numeric) / 10000.0)) stored,
  amount_incl_tax_cents integer generated always as (amount_excl_tax_cents + round((amount_excl_tax_cents::numeric * vat_rate_basis_points::numeric) / 10000.0)) stored,
  notes text,
  terms text,
  sent_at timestamptz,
  accepted_at timestamptz,
  signed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, reference),
  constraint training_commercial_site_fk foreign key (organization_id, site_id)
    references public.organization_sites(organization_id, id) on delete restrict,
  constraint training_commercial_customer_fk foreign key (organization_id, customer_id)
    references public.training_customers(organization_id, id) on delete restrict,
  constraint training_commercial_funder_fk foreign key (organization_id, funder_id)
    references public.training_funders(organization_id, id) on delete restrict,
  constraint training_commercial_session_fk foreign key (organization_id, session_id)
    references public.training_sessions(organization_id, id) on delete restrict,
  constraint training_commercial_trainee_fk foreign key (organization_id, trainee_id)
    references public.training_trainees(organization_id, id) on delete restrict,
  constraint training_commercial_beneficiary_check check (customer_id is not null or trainee_id is not null),
  constraint training_commercial_validity_check check (valid_until is null or valid_until >= issue_date)
);

create index if not exists idx_training_commercial_org_created
  on public.training_commercial_documents(organization_id, created_at desc);
create index if not exists idx_training_commercial_org_status
  on public.training_commercial_documents(organization_id, status, document_type);
create index if not exists idx_training_commercial_session
  on public.training_commercial_documents(organization_id, session_id);

-- Étend le contrôle central des offres sans perdre la gestion des modules additionnels Sécurité.
create or replace function public.organization_has_plan_feature(
  p_organization_id uuid,
  p_feature text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_type text;
  v_plan text;
  v_status text;
  v_metier_modules_configured boolean;
  v_features jsonb;
  v_module_key text;
begin
  select o.business_type, o.plan, o.status, coalesce(o.metier_modules_configured, false), d.features
  into v_business_type, v_plan, v_status, v_metier_modules_configured, v_features
  from public.organizations o
  left join public.domain_plan_catalog d
    on d.business_type = o.business_type
   and d.plan_key = o.plan
   and d.active = true
  where o.id = p_organization_id;

  if v_business_type is null or v_status not in ('trial','active') then
    return false;
  end if;

  if v_business_type = 'securite'
     and public.security_has_addon_feature(p_organization_id, p_feature) then
    return true;
  end if;

  if not coalesce((v_features ->> p_feature)::boolean, false) then
    return false;
  end if;

  if v_business_type = 'formation' and v_plan = 'metier' and v_metier_modules_configured then
    v_module_key := case p_feature
      when 'training_programs' then 'training_programs'
      when 'training_trainees' then 'trainees'
      when 'training_trainers' then 'trainers'
      when 'training_sessions' then 'sessions'
      when 'training_documents' then 'documents'
      when 'training_blank_attendance' then 'attendance'
      when 'training_digital_attendance' then 'attendance'
      when 'training_attendance_pdf' then 'attendance'
      when 'training_automatic_certificates' then 'certificates'
      when 'commercial_branding' then 'commercial_branding'
      when 'training_document_branding' then 'commercial_branding'
      when 'training_email_branding' then 'commercial_branding'
      when 'training_satisfaction' then 'evaluations'
      when 'training_session_dossier' then 'documents'
      when 'training_commercial' then 'training_commercial'
      when 'multi_site' then 'sites'
      when 'team_access' then 'team_access'
      when 'manager_role' then 'team_access'
      else null
    end;

    if v_module_key is not null then
      return exists (
        select 1
        from public.organization_modules m
        where m.organization_id = p_organization_id
          and m.module_key = v_module_key
          and m.enabled = true
      );
    end if;
  end if;

  return true;
end;
$$;

create or replace function public.next_training_commercial_reference(
  p_organization_id uuid,
  p_document_type text,
  p_issue_date date default current_date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from coalesce(p_issue_date, current_date));
  v_value integer;
  v_prefix text;
begin
  if p_document_type not in ('quote','agreement','contract') then
    raise exception 'Type de document commercial invalide.';
  end if;

  if not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_commercial') then
    raise exception 'Accès refusé.';
  end if;

  insert into public.training_commercial_counters(organization_id, counter_year, document_type, current_value)
  values (p_organization_id, v_year, p_document_type, 1)
  on conflict (organization_id, counter_year, document_type)
  do update set current_value = public.training_commercial_counters.current_value + 1
  returning current_value into v_value;

  v_prefix := case p_document_type
    when 'quote' then 'DEV'
    when 'agreement' then 'CONV'
    else 'CTR'
  end;

  return v_prefix || '-' || v_year::text || '-' || lpad(v_value::text, 4, '0');
end;
$$;

create or replace function public.prepare_training_commercial_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.organizations o
    where o.id = new.organization_id and o.business_type = 'formation'
  ) then
    raise exception 'Ce module est réservé aux espaces Formation.';
  end if;

  if not public.organization_has_plan_feature(new.organization_id, 'training_commercial') then
    raise exception 'Le module Commercial Formation nécessite l’offre Professionnelle ou une configuration Métier compatible.';
  end if;

  if new.reference is null or trim(new.reference) = '' then
    new.reference := public.next_training_commercial_reference(new.organization_id, new.document_type, new.issue_date);
  end if;

  if new.status = 'sent' and new.sent_at is null then new.sent_at := now(); end if;
  if new.status = 'accepted' and new.accepted_at is null then new.accepted_at := now(); end if;
  if new.status = 'signed' and new.signed_at is null then new.signed_at := now(); end if;
  return new;
end;
$$;

drop trigger if exists prepare_training_commercial_document on public.training_commercial_documents;
create trigger prepare_training_commercial_document
before insert or update on public.training_commercial_documents
for each row execute procedure public.prepare_training_commercial_document();

drop trigger if exists set_training_customers_updated_at on public.training_customers;
create trigger set_training_customers_updated_at before update on public.training_customers
for each row execute procedure public.set_updated_at();

drop trigger if exists set_training_funders_updated_at on public.training_funders;
create trigger set_training_funders_updated_at before update on public.training_funders
for each row execute procedure public.set_updated_at();

drop trigger if exists set_training_commercial_updated_at on public.training_commercial_documents;
create trigger set_training_commercial_updated_at before update on public.training_commercial_documents
for each row execute procedure public.set_updated_at();

alter table public.training_customers enable row level security;
alter table public.training_funders enable row level security;
alter table public.training_commercial_counters enable row level security;
alter table public.training_commercial_documents enable row level security;

revoke all on public.training_customers from anon;
revoke all on public.training_funders from anon;
revoke all on public.training_commercial_counters from anon, authenticated;
revoke all on public.training_commercial_documents from anon;

grant select, insert, update, delete on public.training_customers to authenticated;
grant select, insert, update, delete on public.training_funders to authenticated;
grant select, insert, update, delete on public.training_commercial_documents to authenticated;

drop policy if exists training_customers_select on public.training_customers;
create policy training_customers_select on public.training_customers for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']) and public.organization_has_plan_feature(organization_id, 'training_commercial'));
drop policy if exists training_customers_insert on public.training_customers;
create policy training_customers_insert on public.training_customers for insert to authenticated
with check (public.has_org_role(organization_id, array['owner','admin','manager']) and public.organization_has_plan_feature(organization_id, 'training_commercial'));
drop policy if exists training_customers_update on public.training_customers;
create policy training_customers_update on public.training_customers for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']) and public.organization_has_plan_feature(organization_id, 'training_commercial'))
with check (public.has_org_role(organization_id, array['owner','admin','manager']) and public.organization_has_plan_feature(organization_id, 'training_commercial'));
drop policy if exists training_customers_delete on public.training_customers;
create policy training_customers_delete on public.training_customers for delete to authenticated
using (public.has_org_role(organization_id, array['owner','admin']) and public.organization_has_plan_feature(organization_id, 'training_commercial'));

drop policy if exists training_funders_select on public.training_funders;
create policy training_funders_select on public.training_funders for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']) and public.organization_has_plan_feature(organization_id, 'training_commercial'));
drop policy if exists training_funders_insert on public.training_funders;
create policy training_funders_insert on public.training_funders for insert to authenticated
with check (public.has_org_role(organization_id, array['owner','admin','manager']) and public.organization_has_plan_feature(organization_id, 'training_commercial'));
drop policy if exists training_funders_update on public.training_funders;
create policy training_funders_update on public.training_funders for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']) and public.organization_has_plan_feature(organization_id, 'training_commercial'))
with check (public.has_org_role(organization_id, array['owner','admin','manager']) and public.organization_has_plan_feature(organization_id, 'training_commercial'));
drop policy if exists training_funders_delete on public.training_funders;
create policy training_funders_delete on public.training_funders for delete to authenticated
using (public.has_org_role(organization_id, array['owner','admin']) and public.organization_has_plan_feature(organization_id, 'training_commercial'));

drop policy if exists training_commercial_select on public.training_commercial_documents;
create policy training_commercial_select on public.training_commercial_documents for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']) and public.organization_has_plan_feature(organization_id, 'training_commercial'));
drop policy if exists training_commercial_insert on public.training_commercial_documents;
create policy training_commercial_insert on public.training_commercial_documents for insert to authenticated
with check (public.has_org_role(organization_id, array['owner','admin','manager']) and public.organization_has_plan_feature(organization_id, 'training_commercial'));
drop policy if exists training_commercial_update on public.training_commercial_documents;
create policy training_commercial_update on public.training_commercial_documents for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']) and public.organization_has_plan_feature(organization_id, 'training_commercial'))
with check (public.has_org_role(organization_id, array['owner','admin','manager']) and public.organization_has_plan_feature(organization_id, 'training_commercial'));
drop policy if exists training_commercial_delete on public.training_commercial_documents;
create policy training_commercial_delete on public.training_commercial_documents for delete to authenticated
using (public.has_org_role(organization_id, array['owner','admin']) and public.organization_has_plan_feature(organization_id, 'training_commercial'));

revoke all on function public.next_training_commercial_reference(uuid,text,date) from public, anon, authenticated;

insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, sort_order
)
values (
  'training_commercial',
  'Commercial Formation',
  'Entreprises clientes, financeurs, devis, conventions et contrats reliés aux sessions.',
  'formation',
  'creditCard',
  '{formation}',
  false,
  true,
  535
)
on conflict (module_key) do update
set display_name = excluded.display_name,
    description = excluded.description,
    category = excluded.category,
    icon_key = excluded.icon_key,
    compatible_business_types = excluded.compatible_business_types,
    default_enabled = excluded.default_enabled,
    active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

update public.domain_plan_catalog
set features = features || '{"training_commercial":true}'::jsonb,
    updated_at = now()
where business_type = 'formation' and plan_key in ('professionnelle','metier');

-- Aligne les offres standard sans activer silencieusement un module sur une offre Métier déjà configurée à la carte.
insert into public.organization_modules(organization_id, module_key, enabled)
select
  o.id,
  'training_commercial',
  o.plan in ('professionnelle','metier')
from public.organizations o
where o.business_type = 'formation'
  and (o.plan <> 'metier' or not coalesce(o.metier_modules_configured, false))
on conflict (organization_id, module_key) do update
set enabled = excluded.enabled,
    updated_at = now();

insert into public.platform_release_state (
  singleton, database_version, expected_frontend_version, expected_pwa_cache,
  installed_at, installed_by, notes
)
values (
  true,
  '2.14.0',
  '2.14.0',
  'ncr-suite-shell-v2.14.0-training-commercial',
  now(),
  auth.uid(),
  'Formation : entreprises clientes, financeurs et dossiers commerciaux avec devis, conventions et contrats PDF reliés aux sessions.'
)
on conflict(singleton) do update set
  database_version = excluded.database_version,
  expected_frontend_version = excluded.expected_frontend_version,
  expected_pwa_cache = excluded.expected_pwa_cache,
  installed_at = excluded.installed_at,
  installed_by = excluded.installed_by,
  notes = excluded.notes;

commit;
