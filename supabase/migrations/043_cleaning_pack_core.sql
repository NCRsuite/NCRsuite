-- NCR Suite V2.7.0 — Pack Nettoyage complet
-- À exécuter après 042_security_delete_planned_shift.sql.
-- Active le domaine Nettoyage et installe le socle Découverte, le terrain Essentielle
-- et les fonctions qualité / stocks de l’offre Professionnelle.

begin;

update public.business_domain_catalog
set launch_status = 'active', active = true, updated_at = now()
where business_type = 'nettoyage';

create table if not exists public.cleaning_clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_name text not null check (char_length(trim(company_name)) between 2 and 160),
  contact_name text,
  email text,
  phone text,
  billing_address text,
  postal_code text,
  city text,
  payment_terms_days integer not null default 30 check (payment_terms_days between 0 and 180),
  notes text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.cleaning_sites (
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
  billing_mode text not null default 'hourly' check (billing_mode in ('hourly','flat')),
  service_rate_cents integer not null default 0 check (service_rate_cents between 0 and 10000000),
  instructions text,
  access_details text,
  expected_frequency text,
  timezone text not null default 'Europe/Paris',
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint cleaning_sites_client_fk foreign key (organization_id, client_id)
    references public.cleaning_clients(organization_id, id) on delete restrict
);

create table if not exists public.cleaning_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name text not null check (char_length(trim(last_name)) between 1 and 100),
  employee_number text,
  email text,
  phone text,
  contract_type text not null default 'cdi' check (contract_type in ('cdi','cdd','interim','sous_traitant','autre')),
  weekly_hours numeric(5,2) not null default 35 check (weekly_hours between 0 and 80),
  skills text[] not null default '{}',
  linked_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create unique index if not exists idx_cleaning_agents_linked_user on public.cleaning_agents(organization_id, linked_user_id) where linked_user_id is not null;

create table if not exists public.cleaning_interventions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null,
  agent_id uuid not null,
  title text not null default 'Intervention de nettoyage',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes integer not null default 0 check (break_minutes between 0 and 720),
  status text not null default 'planned' check (status in ('planned','in_progress','completed','canceled')),
  planned_price_cents integer not null default 0 check (planned_price_cents >= 0),
  actual_started_at timestamptz,
  actual_ended_at timestamptz,
  report_text text,
  before_photo_url text,
  after_photo_url text,
  agent_signature text,
  client_signature text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint cleaning_interventions_site_fk foreign key (organization_id, site_id)
    references public.cleaning_sites(organization_id, id) on delete restrict,
  constraint cleaning_interventions_agent_fk foreign key (organization_id, agent_id)
    references public.cleaning_agents(organization_id, id) on delete restrict,
  constraint cleaning_intervention_dates_check check (ends_at > starts_at)
);

create table if not exists public.cleaning_intervention_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  intervention_id uuid not null,
  label text not null,
  position integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint cleaning_tasks_intervention_fk foreign key (organization_id, intervention_id)
    references public.cleaning_interventions(organization_id, id) on delete cascade
);

create table if not exists public.cleaning_anomalies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  intervention_id uuid,
  site_id uuid not null,
  agent_id uuid,
  title text not null,
  description text not null,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  corrective_action text,
  reported_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint cleaning_anomalies_site_fk foreign key (organization_id, site_id)
    references public.cleaning_sites(organization_id, id) on delete restrict,
  constraint cleaning_anomalies_agent_fk foreign key (organization_id, agent_id)
    references public.cleaning_agents(organization_id, id) on delete set null,
  constraint cleaning_anomalies_intervention_fk foreign key (organization_id, intervention_id)
    references public.cleaning_interventions(organization_id, id) on delete set null
);

create table if not exists public.cleaning_quality_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  intervention_id uuid,
  site_id uuid not null,
  agent_id uuid,
  score_cleanliness numeric(3,1) not null check (score_cleanliness between 0 and 5),
  score_compliance numeric(3,1) not null check (score_compliance between 0 and 5),
  score_punctuality numeric(3,1) not null check (score_punctuality between 0 and 5),
  score_material numeric(3,1) not null check (score_material between 0 and 5),
  overall_score numeric(3,1) not null check (overall_score between 0 and 5),
  observations text,
  corrective_action text,
  controlled_by uuid references auth.users(id) on delete set null,
  controlled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint cleaning_quality_site_fk foreign key (organization_id, site_id)
    references public.cleaning_sites(organization_id, id) on delete restrict,
  constraint cleaning_quality_agent_fk foreign key (organization_id, agent_id)
    references public.cleaning_agents(organization_id, id) on delete set null,
  constraint cleaning_quality_intervention_fk foreign key (organization_id, intervention_id)
    references public.cleaning_interventions(organization_id, id) on delete set null
);

create table if not exists public.cleaning_stock_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  unit text not null default 'unité',
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  minimum_quantity numeric(12,2) not null default 0 check (minimum_quantity >= 0),
  unit_cost_cents integer not null default 0 check (unit_cost_cents >= 0),
  supplier text,
  storage_location text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create sequence if not exists public.cleaning_invoice_number_seq;
create table if not exists public.cleaning_invoices (
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
  constraint cleaning_invoices_client_fk foreign key (organization_id, client_id)
    references public.cleaning_clients(organization_id, id) on delete restrict,
  constraint cleaning_invoice_period_check check (period_end >= period_start)
);

create table if not exists public.cleaning_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null,
  site_id uuid not null,
  description text not null,
  intervention_count integer not null default 0,
  scheduled_minutes integer not null default 0,
  line_total_cents integer not null default 0 check (line_total_cents >= 0),
  created_at timestamptz not null default now(),
  constraint cleaning_invoice_lines_invoice_fk foreign key (organization_id, invoice_id)
    references public.cleaning_invoices(organization_id, id) on delete cascade,
  constraint cleaning_invoice_lines_site_fk foreign key (organization_id, site_id)
    references public.cleaning_sites(organization_id, id) on delete restrict
);

create index if not exists idx_cleaning_clients_org on public.cleaning_clients(organization_id, status, company_name);
create index if not exists idx_cleaning_sites_org on public.cleaning_sites(organization_id, client_id, status);
create index if not exists idx_cleaning_agents_org on public.cleaning_agents(organization_id, status, last_name, first_name);
create index if not exists idx_cleaning_interventions_org_dates on public.cleaning_interventions(organization_id, starts_at, ends_at);
create index if not exists idx_cleaning_interventions_agent_dates on public.cleaning_interventions(organization_id, agent_id, starts_at, ends_at);
create index if not exists idx_cleaning_anomalies_org_status on public.cleaning_anomalies(organization_id, status, severity, created_at desc);
create index if not exists idx_cleaning_quality_org_date on public.cleaning_quality_controls(organization_id, controlled_at desc);
create index if not exists idx_cleaning_stock_org on public.cleaning_stock_items(organization_id, status, name);
create index if not exists idx_cleaning_invoices_org on public.cleaning_invoices(organization_id, created_at desc);

create or replace function public.is_cleaning_manager(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(p_organization_id, array['owner','admin','manager']);
$$;

create or replace function public.current_cleaning_agent_id(p_organization_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select a.id from public.cleaning_agents a
  join public.organization_members m on m.organization_id = a.organization_id and m.user_id = a.linked_user_id
  where a.organization_id = p_organization_id and a.linked_user_id = auth.uid() and a.status = 'active' and m.status = 'active'
  limit 1;
$$;

create or replace function public.cleaning_team_member_limit(p_organization_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select case o.plan when 'decouverte' then 0 when 'essentielle' then 10 when 'professionnelle' then 50 else coalesce(o.metier_member_limit,100) end
  from public.organizations o where o.id = p_organization_id and o.business_type = 'nettoyage';
$$;

create or replace function public.cleaning_agent_can_access_site(p_organization_id uuid, p_site_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_cleaning_manager(p_organization_id)
    or exists (
      select 1 from public.cleaning_interventions i
      where i.organization_id = p_organization_id and i.site_id = p_site_id
        and i.agent_id = public.current_cleaning_agent_id(p_organization_id)
        and i.status <> 'canceled'
        and i.starts_at >= now() - interval '30 days'
    );
$$;

create or replace function public.validate_cleaning_organization()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.organizations o where o.id = new.organization_id and o.business_type = 'nettoyage' and o.status in ('trial','active')) then
    raise exception 'Ce module est réservé à un espace Nettoyage actif.';
  end if;
  if tg_table_name = 'cleaning_anomalies' and not public.organization_has_plan_feature(new.organization_id, 'cleaning_anomalies') then raise exception 'Les anomalies nécessitent l’offre Professionnelle.'; end if;
  if tg_table_name = 'cleaning_quality_controls' and not public.organization_has_plan_feature(new.organization_id, 'cleaning_quality_control') then raise exception 'Le contrôle qualité nécessite l’offre Professionnelle.'; end if;
  if tg_table_name = 'cleaning_stock_items' and not public.organization_has_plan_feature(new.organization_id, 'cleaning_stock') then raise exception 'Les stocks nécessitent l’offre Professionnelle.'; end if;
  return new;
end;
$$;

create or replace function public.validate_cleaning_intervention()
returns trigger language plpgsql set search_path = public as $$
declare v_duration integer;
begin
  if not public.organization_has_plan_feature(new.organization_id, 'cleaning_planning') then raise exception 'Le planning Nettoyage n’est pas inclus dans cette offre.'; end if;
  if new.ends_at <= new.starts_at then raise exception 'La fin doit être postérieure au début.'; end if;
  v_duration := floor(extract(epoch from (new.ends_at - new.starts_at)) / 60)::integer;
  if new.break_minutes >= v_duration then raise exception 'La pause doit être inférieure à la durée totale.'; end if;
  if not exists (select 1 from public.cleaning_agents a where a.organization_id = new.organization_id and a.id = new.agent_id and a.status = 'active') then raise exception 'Agent introuvable ou inactif.'; end if;
  if not exists (select 1 from public.cleaning_sites s where s.organization_id = new.organization_id and s.id = new.site_id and s.status = 'active') then raise exception 'Site introuvable ou inactif.'; end if;
  if new.status <> 'canceled' and exists (
    select 1 from public.cleaning_interventions i where i.organization_id = new.organization_id and i.agent_id = new.agent_id
      and (tg_op = 'INSERT' or i.id <> new.id) and i.status <> 'canceled'
      and tstzrange(i.starts_at, i.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
  ) then raise exception 'Cet agent possède déjà une intervention sur ce créneau.'; end if;
  if tg_op = 'UPDATE' and (new.actual_started_at is distinct from old.actual_started_at or new.actual_ended_at is distinct from old.actual_ended_at) and not public.organization_has_plan_feature(new.organization_id, 'cleaning_time_clock') then raise exception 'Le pointage nécessite l’offre Essentielle.'; end if;
  if tg_op = 'UPDATE' and new.report_text is distinct from old.report_text and not public.organization_has_plan_feature(new.organization_id, 'cleaning_visit_reports') then raise exception 'Les rapports de passage nécessitent l’offre Essentielle.'; end if;
  if tg_op = 'UPDATE' and (new.before_photo_url is distinct from old.before_photo_url or new.after_photo_url is distinct from old.after_photo_url) and not public.organization_has_plan_feature(new.organization_id, 'cleaning_before_after_photos') then raise exception 'Les photos avant/après nécessitent l’offre Essentielle.'; end if;
  return new;
end;
$$;

create or replace function public.assign_cleaning_anomaly_agent()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_cleaning_manager(new.organization_id) then
    new.agent_id := public.current_cleaning_agent_id(new.organization_id);
    if new.agent_id is null then raise exception 'Aucune fiche agent liée à ce compte.'; end if;
    if not public.cleaning_agent_can_access_site(new.organization_id, new.site_id) then raise exception 'Ce site ne fait pas partie de vos interventions.'; end if;
  end if;
  return new;
end;
$$;

-- Déclencheurs idempotents.
do $$ declare t text; begin
  foreach t in array array['cleaning_clients','cleaning_sites','cleaning_agents','cleaning_interventions','cleaning_anomalies','cleaning_quality_controls','cleaning_stock_items','cleaning_invoices'] loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', 'set_' || t || '_updated_at', t);
    execute format('drop trigger if exists %I on public.%I', 'validate_' || t || '_organization', t);
    execute format('create trigger %I before insert or update of organization_id on public.%I for each row execute procedure public.validate_cleaning_organization()', 'validate_' || t || '_organization', t);
  end loop;
end $$;

drop trigger if exists validate_cleaning_intervention_trigger on public.cleaning_interventions;
create trigger validate_cleaning_intervention_trigger before insert or update on public.cleaning_interventions for each row execute procedure public.validate_cleaning_intervention();
drop trigger if exists assign_cleaning_anomaly_agent_trigger on public.cleaning_anomalies;
create trigger assign_cleaning_anomaly_agent_trigger before insert on public.cleaning_anomalies for each row execute procedure public.assign_cleaning_anomaly_agent();

-- RLS.
do $$ declare t text; begin
  foreach t in array array['cleaning_clients','cleaning_sites','cleaning_agents','cleaning_interventions','cleaning_intervention_tasks','cleaning_anomalies','cleaning_quality_controls','cleaning_stock_items','cleaning_invoices','cleaning_invoice_lines'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Clients : exploitation uniquement.
drop policy if exists cleaning_clients_select on public.cleaning_clients;
create policy cleaning_clients_select on public.cleaning_clients for select using (public.is_cleaning_manager(organization_id));
drop policy if exists cleaning_clients_insert on public.cleaning_clients;
create policy cleaning_clients_insert on public.cleaning_clients for insert with check (public.is_cleaning_manager(organization_id));
drop policy if exists cleaning_clients_update on public.cleaning_clients;
create policy cleaning_clients_update on public.cleaning_clients for update using (public.is_cleaning_manager(organization_id)) with check (public.is_cleaning_manager(organization_id));
drop policy if exists cleaning_clients_delete on public.cleaning_clients;
create policy cleaning_clients_delete on public.cleaning_clients for delete using (public.has_org_role(organization_id, array['owner','admin']));

-- Sites : responsables ou agents affectés.
drop policy if exists cleaning_sites_select on public.cleaning_sites;
create policy cleaning_sites_select on public.cleaning_sites for select using (public.cleaning_agent_can_access_site(organization_id, id));
drop policy if exists cleaning_sites_insert on public.cleaning_sites;
create policy cleaning_sites_insert on public.cleaning_sites for insert with check (public.is_cleaning_manager(organization_id));
drop policy if exists cleaning_sites_update on public.cleaning_sites;
create policy cleaning_sites_update on public.cleaning_sites for update using (public.is_cleaning_manager(organization_id)) with check (public.is_cleaning_manager(organization_id));
drop policy if exists cleaning_sites_delete on public.cleaning_sites;
create policy cleaning_sites_delete on public.cleaning_sites for delete using (public.has_org_role(organization_id, array['owner','admin']));

-- Agents : responsables ou fiche personnelle.
drop policy if exists cleaning_agents_select on public.cleaning_agents;
create policy cleaning_agents_select on public.cleaning_agents for select using (public.is_cleaning_manager(organization_id) or linked_user_id = auth.uid());
drop policy if exists cleaning_agents_insert on public.cleaning_agents;
create policy cleaning_agents_insert on public.cleaning_agents for insert with check (public.is_cleaning_manager(organization_id));
drop policy if exists cleaning_agents_update on public.cleaning_agents;
create policy cleaning_agents_update on public.cleaning_agents for update using (public.is_cleaning_manager(organization_id)) with check (public.is_cleaning_manager(organization_id));
drop policy if exists cleaning_agents_delete on public.cleaning_agents;
create policy cleaning_agents_delete on public.cleaning_agents for delete using (public.has_org_role(organization_id, array['owner','admin']));

-- Interventions : responsables ou agent affecté.
drop policy if exists cleaning_interventions_select on public.cleaning_interventions;
create policy cleaning_interventions_select on public.cleaning_interventions for select using (public.is_cleaning_manager(organization_id) or agent_id = public.current_cleaning_agent_id(organization_id));
drop policy if exists cleaning_interventions_insert on public.cleaning_interventions;
create policy cleaning_interventions_insert on public.cleaning_interventions for insert with check (public.is_cleaning_manager(organization_id));
drop policy if exists cleaning_interventions_update on public.cleaning_interventions;
create policy cleaning_interventions_update on public.cleaning_interventions for update using (public.is_cleaning_manager(organization_id) or agent_id = public.current_cleaning_agent_id(organization_id)) with check (public.is_cleaning_manager(organization_id) or agent_id = public.current_cleaning_agent_id(organization_id));
drop policy if exists cleaning_interventions_delete on public.cleaning_interventions;
create policy cleaning_interventions_delete on public.cleaning_interventions for delete using (public.has_org_role(organization_id, array['owner','admin']));

-- Tâches.
drop policy if exists cleaning_tasks_select on public.cleaning_intervention_tasks;
create policy cleaning_tasks_select on public.cleaning_intervention_tasks for select using (exists (select 1 from public.cleaning_interventions i where i.organization_id = cleaning_intervention_tasks.organization_id and i.id = cleaning_intervention_tasks.intervention_id and (public.is_cleaning_manager(i.organization_id) or i.agent_id = public.current_cleaning_agent_id(i.organization_id))));
drop policy if exists cleaning_tasks_manage on public.cleaning_intervention_tasks;
create policy cleaning_tasks_manage on public.cleaning_intervention_tasks for all using (public.is_cleaning_manager(organization_id)) with check (public.is_cleaning_manager(organization_id));

-- Anomalies.
drop policy if exists cleaning_anomalies_select on public.cleaning_anomalies;
create policy cleaning_anomalies_select on public.cleaning_anomalies for select using (public.is_cleaning_manager(organization_id) or agent_id = public.current_cleaning_agent_id(organization_id));
drop policy if exists cleaning_anomalies_insert on public.cleaning_anomalies;
create policy cleaning_anomalies_insert on public.cleaning_anomalies for insert with check (public.is_cleaning_manager(organization_id) or agent_id = public.current_cleaning_agent_id(organization_id));
drop policy if exists cleaning_anomalies_update on public.cleaning_anomalies;
create policy cleaning_anomalies_update on public.cleaning_anomalies for update using (public.is_cleaning_manager(organization_id)) with check (public.is_cleaning_manager(organization_id));
drop policy if exists cleaning_anomalies_delete on public.cleaning_anomalies;
create policy cleaning_anomalies_delete on public.cleaning_anomalies for delete using (public.has_org_role(organization_id, array['owner','admin']));

-- Qualité, stocks et facturation : responsables.
do $$ declare t text; begin
  foreach t in array array['cleaning_quality_controls','cleaning_stock_items'] loop
    execute format('drop policy if exists %I on public.%I', t || '_manager_all', t);
    execute format('create policy %I on public.%I for all using (public.is_cleaning_manager(organization_id)) with check (public.is_cleaning_manager(organization_id))', t || '_manager_all', t);
  end loop;
end $$;
drop policy if exists cleaning_invoices_select on public.cleaning_invoices;
create policy cleaning_invoices_select on public.cleaning_invoices for select using (public.is_cleaning_manager(organization_id));
drop policy if exists cleaning_invoice_lines_select on public.cleaning_invoice_lines;
create policy cleaning_invoice_lines_select on public.cleaning_invoice_lines for select using (public.is_cleaning_manager(organization_id));

-- Permissions tables.
grant select, insert, update, delete on public.cleaning_clients to authenticated;
grant select, insert, update, delete on public.cleaning_sites to authenticated;
grant select, insert, update, delete on public.cleaning_agents to authenticated;
grant select, insert, update, delete on public.cleaning_interventions to authenticated;
grant select, insert, update, delete on public.cleaning_intervention_tasks to authenticated;
grant select, insert, update, delete on public.cleaning_anomalies to authenticated;
grant select, insert, update, delete on public.cleaning_quality_controls to authenticated;
grant select, insert, update, delete on public.cleaning_stock_items to authenticated;
grant select on public.cleaning_invoices, public.cleaning_invoice_lines to authenticated;
revoke insert, update, delete on public.cleaning_invoices, public.cleaning_invoice_lines from authenticated;

-- Pointage sécurisé.
create or replace function public.start_cleaning_intervention(p_organization_id uuid, p_intervention_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_agent uuid;
begin
  if not public.organization_has_plan_feature(p_organization_id, 'cleaning_time_clock') then raise exception 'Le pointage nécessite l’offre Essentielle.'; end if;
  v_agent := public.current_cleaning_agent_id(p_organization_id);
  if v_agent is null then raise exception 'Aucune fiche agent liée à ce compte.'; end if;
  update public.cleaning_interventions set status = 'in_progress', actual_started_at = coalesce(actual_started_at, now()), updated_at = now()
  where organization_id = p_organization_id and id = p_intervention_id and agent_id = v_agent and status = 'planned';
  if not found then raise exception 'Intervention introuvable ou déjà démarrée.'; end if;
end;
$$;

create or replace function public.finish_cleaning_intervention(p_organization_id uuid, p_intervention_id uuid, p_report_text text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_agent uuid;
begin
  if not public.organization_has_plan_feature(p_organization_id, 'cleaning_time_clock') then raise exception 'Le pointage nécessite l’offre Essentielle.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'cleaning_visit_reports') then raise exception 'Les rapports nécessitent l’offre Essentielle.'; end if;
  v_agent := public.current_cleaning_agent_id(p_organization_id);
  if v_agent is null then raise exception 'Aucune fiche agent liée à ce compte.'; end if;
  update public.cleaning_interventions set status = 'completed', actual_ended_at = now(), report_text = nullif(trim(coalesce(p_report_text,'')),''), updated_at = now()
  where organization_id = p_organization_id and id = p_intervention_id and agent_id = v_agent and status = 'in_progress';
  if not found then raise exception 'Intervention introuvable ou non démarrée.'; end if;
end;
$$;

grant execute on function public.start_cleaning_intervention(uuid,uuid) to authenticated;
grant execute on function public.finish_cleaning_intervention(uuid,uuid,text) to authenticated;

-- Préfacturation programmée.
create or replace function public.generate_cleaning_invoice(p_organization_id uuid, p_client_id uuid, p_period_start date, p_period_end date, p_notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_invoice_id uuid; v_number text; v_total integer := 0; v_lines integer := 0; r record;
begin
  if auth.uid() is null or not public.is_cleaning_manager(p_organization_id) then raise exception 'Accès insuffisant.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'cleaning_scheduled_billing') then raise exception 'La facturation programmée n’est pas incluse dans cette offre.'; end if;
  if p_period_end < p_period_start then raise exception 'Période invalide.'; end if;
  if exists (select 1 from public.cleaning_invoices where organization_id = p_organization_id and client_id = p_client_id and period_start = p_period_start and period_end = p_period_end and status <> 'canceled') then raise exception 'Une préfacture existe déjà pour cette période.'; end if;
  v_number := 'NET-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.cleaning_invoice_number_seq')::text,6,'0');
  insert into public.cleaning_invoices(organization_id,client_id,invoice_number,period_start,period_end,notes,created_by)
  values(p_organization_id,p_client_id,v_number,p_period_start,p_period_end,nullif(trim(coalesce(p_notes,'')),''),auth.uid()) returning id into v_invoice_id;
  for r in
    select s.id site_id, s.name site_name, count(i.id)::integer intervention_count,
      sum(greatest(0, floor(extract(epoch from (i.ends_at-i.starts_at))/60)::integer-i.break_minutes))::integer scheduled_minutes,
      sum(i.planned_price_cents)::integer line_total
    from public.cleaning_sites s join public.cleaning_interventions i on i.organization_id=s.organization_id and i.site_id=s.id
    where s.organization_id=p_organization_id and s.client_id=p_client_id and i.status<>'canceled'
      and i.starts_at >= (p_period_start::timestamp at time zone s.timezone)
      and i.starts_at < ((p_period_end+1)::timestamp at time zone s.timezone)
    group by s.id,s.name having count(i.id)>0 order by s.name
  loop
    insert into public.cleaning_invoice_lines(organization_id,invoice_id,site_id,description,intervention_count,scheduled_minutes,line_total_cents)
    values(p_organization_id,v_invoice_id,r.site_id,'Prestations de nettoyage — '||r.site_name,r.intervention_count,r.scheduled_minutes,r.line_total);
    v_total := v_total + r.line_total; v_lines := v_lines + 1;
  end loop;
  if v_lines = 0 then delete from public.cleaning_invoices where id=v_invoice_id; raise exception 'Aucune intervention facturable sur cette période.'; end if;
  update public.cleaning_invoices set subtotal_cents=v_total,total_cents=v_total where id=v_invoice_id;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'cleaning.invoice_generated','cleaning_invoice',v_invoice_id::text,jsonb_build_object('client_id',p_client_id,'total_cents',v_total));
  return v_invoice_id;
end;
$$;

create or replace function public.set_cleaning_invoice_status(p_organization_id uuid, p_invoice_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_cleaning_manager(p_organization_id) then raise exception 'Accès insuffisant.'; end if;
  if p_status not in ('issued','paid','canceled') then raise exception 'Statut invalide.'; end if;
  update public.cleaning_invoices set status=p_status,
    issued_at=case when p_status in ('issued','paid') then coalesce(issued_at,now()) else issued_at end,
    paid_at=case when p_status='paid' then coalesce(paid_at,now()) else paid_at end,
    updated_at=now()
  where organization_id=p_organization_id and id=p_invoice_id;
  if not found then raise exception 'Document introuvable.'; end if;
end;
$$;

grant execute on function public.generate_cleaning_invoice(uuid,uuid,date,date,text) to authenticated;
grant execute on function public.set_cleaning_invoice_status(uuid,uuid,text) to authenticated;

-- Accès agents Nettoyage.
alter table public.organization_invitations add column if not exists cleaning_agent_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'organization_invitations_cleaning_agent_fk') then
    alter table public.organization_invitations add constraint organization_invitations_cleaning_agent_fk foreign key (cleaning_agent_id) references public.cleaning_agents(id) on delete set null;
  end if;
end $$;
create index if not exists idx_org_invitations_cleaning_agent on public.organization_invitations(organization_id, cleaning_agent_id) where cleaning_agent_id is not null;

create or replace function public.cleaning_team_plan_summary(p_organization_id uuid)
returns table(plan text, member_limit integer, active_members integer, pending_invitations integer, available_seats integer, invitations_enabled boolean, manager_role_enabled boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_plan text; v_limit integer; v_active integer; v_pending integer;
begin
  if not public.is_cleaning_manager(p_organization_id) then raise exception 'Accès insuffisant.'; end if;
  select o.plan, public.cleaning_team_member_limit(o.id) into v_plan,v_limit from public.organizations o where o.id=p_organization_id and o.business_type='nettoyage';
  select count(*)::integer into v_active from public.cleaning_agents a join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.linked_user_id and m.status='active' where a.organization_id=p_organization_id and a.linked_user_id is not null and a.status='active';
  select count(*)::integer into v_pending from public.organization_invitations where organization_id=p_organization_id and cleaning_agent_id is not null and status='pending' and expires_at>now();
  return query select v_plan,v_limit,v_active,v_pending,greatest(v_limit-v_active-v_pending,0),public.organization_has_plan_feature(p_organization_id,'team_access'),public.organization_has_plan_feature(p_organization_id,'manager_role');
end;
$$;

create or replace function public.list_cleaning_team_members(p_organization_id uuid)
returns table(user_id uuid,email text,full_name text,role text,status text,staff_id uuid,staff_name text,joined_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_cleaning_manager(p_organization_id) then raise exception 'Accès insuffisant.'; end if;
  return query select m.user_id,u.email::text,coalesce(nullif(trim(p.full_name),''),concat_ws(' ',a.first_name,a.last_name),split_part(u.email::text,'@',1))::text,m.role,m.status,a.id,concat_ws(' ',a.first_name,a.last_name)::text,m.created_at
  from public.organization_members m join auth.users u on u.id=m.user_id left join public.user_profiles p on p.id=m.user_id left join public.cleaning_agents a on a.organization_id=m.organization_id and a.linked_user_id=m.user_id
  where m.organization_id=p_organization_id order by case m.role when 'owner' then 0 when 'admin' then 1 when 'manager' then 2 else 3 end,coalesce(a.last_name,p.full_name,u.email::text);
end;
$$;

create or replace function public.list_cleaning_team_invitations(p_organization_id uuid)
returns table(invitation_id uuid,email text,role text,staff_id uuid,staff_name text,status text,expires_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_cleaning_manager(p_organization_id) then raise exception 'Accès insuffisant.'; end if;
  return query select i.id,i.email,i.role,i.cleaning_agent_id,concat_ws(' ',a.first_name,a.last_name)::text,case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,i.expires_at,i.created_at
  from public.organization_invitations i left join public.cleaning_agents a on a.organization_id=i.organization_id and a.id=i.cleaning_agent_id
  where i.organization_id=p_organization_id and i.cleaning_agent_id is not null and i.status in ('pending','expired') order by i.created_at desc;
end;
$$;

create or replace function public.create_cleaning_team_invitation(p_organization_id uuid,p_email text,p_cleaning_agent_id uuid,p_role text default 'employee')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_used integer; v_email text:=lower(trim(coalesce(p_email,''))); v_token text; v_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then raise exception 'Seul le propriétaire ou un administrateur peut gérer les accès.'; end if;
  if not public.organization_has_plan_feature(p_organization_id,'team_access') then raise exception 'Les accès agents nécessitent l’offre Essentielle.'; end if;
  if p_role not in ('employee','manager') then raise exception 'Rôle invalide.'; end if;
  if p_role='manager' and not public.organization_has_plan_feature(p_organization_id,'manager_role') then raise exception 'Le rôle Chef d’équipe nécessite l’offre Professionnelle.'; end if;
  if not exists(select 1 from public.cleaning_agents where organization_id=p_organization_id and id=p_cleaning_agent_id and status='active' and linked_user_id is null) then raise exception 'Agent introuvable, inactif ou déjà connecté.'; end if;
  select public.cleaning_team_member_limit(p_organization_id) into v_limit;
  select (select count(*) from public.cleaning_agents a join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.linked_user_id and m.status='active' where a.organization_id=p_organization_id and a.linked_user_id is not null and a.status='active') + (select count(*) from public.organization_invitations where organization_id=p_organization_id and cleaning_agent_id is not null and status='pending' and expires_at>now()) into v_used;
  if v_used>=v_limit then raise exception 'La limite de % agent(s) connecté(s) est atteinte.',v_limit; end if;
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.organization_invitations(organization_id,email,role,staff_id,security_agent_id,cleaning_agent_id,token_hash,expires_at,invited_by)
  values(p_organization_id,v_email,p_role,null,null,p_cleaning_agent_id,extensions.digest(v_token,'sha256'),now()+interval '7 days',auth.uid()) returning id into v_id;
  perform public.enqueue_team_invitation_email(v_id,v_token,false); return v_id;
end;
$$;

create or replace function public.set_cleaning_team_member_role(p_organization_id uuid,p_user_id uuid,p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then raise exception 'Accès insuffisant.'; end if;
  if p_role not in ('employee','manager') then raise exception 'Rôle invalide.'; end if;
  if p_role='manager' and not public.organization_has_plan_feature(p_organization_id,'manager_role') then raise exception 'Le rôle Chef d’équipe nécessite l’offre Professionnelle.'; end if;
  if not exists(select 1 from public.cleaning_agents where organization_id=p_organization_id and linked_user_id=p_user_id) then raise exception 'Aucune fiche agent liée à cet accès.'; end if;
  update public.organization_members set role=p_role where organization_id=p_organization_id and user_id=p_user_id and role<>'owner';
end;
$$;

create or replace function public.set_cleaning_team_member_status(p_organization_id uuid,p_user_id uuid,p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then raise exception 'Accès insuffisant.'; end if;
  if p_status not in ('active','disabled') then raise exception 'Statut invalide.'; end if;
  if p_user_id=auth.uid() then raise exception 'Vous ne pouvez pas suspendre votre propre accès.'; end if;
  if not exists(select 1 from public.cleaning_agents where organization_id=p_organization_id and linked_user_id=p_user_id) then raise exception 'Aucune fiche agent liée à cet accès.'; end if;
  update public.organization_members set status=p_status where organization_id=p_organization_id and user_id=p_user_id and role<>'owner';
end;
$$;

grant execute on function public.cleaning_team_plan_summary(uuid) to authenticated;
grant execute on function public.list_cleaning_team_members(uuid) to authenticated;
grant execute on function public.list_cleaning_team_invitations(uuid) to authenticated;
grant execute on function public.create_cleaning_team_invitation(uuid,text,uuid,text) to authenticated;
grant execute on function public.set_cleaning_team_member_role(uuid,uuid,text) to authenticated;
grant execute on function public.set_cleaning_team_member_status(uuid,uuid,text) to authenticated;

-- Étend l’invitation générique avec la fiche agent Nettoyage, sans casser Coiffure ou Sécurité.
create or replace function public.get_team_invitation(p_token text)
returns table(organization_name text,organization_color text,invited_email text,invited_role text,staff_name text,invitation_status text,expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.name,o.primary_color,i.email,i.role,coalesce(s.display_name,concat_ws(' ',sa.first_name,sa.last_name),concat_ws(' ',ca.first_name,ca.last_name)),case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,i.expires_at
  from public.organization_invitations i join public.organizations o on o.id=i.organization_id
  left join public.staff s on s.organization_id=i.organization_id and s.id=i.staff_id
  left join public.security_agents sa on sa.organization_id=i.organization_id and sa.id=i.security_agent_id
  left join public.cleaning_agents ca on ca.organization_id=i.organization_id and ca.id=i.cleaning_agent_id
  where i.token_hash=extensions.digest(trim(p_token),'sha256') limit 1;
$$;

create or replace function public.accept_team_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_invitation public.organization_invitations%rowtype; v_user_email text; v_limit integer; v_active integer;
begin
  if auth.uid() is null then raise exception 'Connectez-vous pour accepter cette invitation.'; end if;
  select lower(email::text) into v_user_email from auth.users where id=auth.uid();
  select * into v_invitation from public.organization_invitations where token_hash=extensions.digest(trim(p_token),'sha256') for update;
  if v_invitation.id is null then raise exception 'Invitation introuvable.'; end if;
  if v_invitation.status<>'pending' or v_invitation.expires_at<=now() then raise exception 'Cette invitation n’est plus valide.'; end if;
  if v_user_email is null or v_user_email<>lower(v_invitation.email) then raise exception 'Connectez-vous avec l’adresse e-mail invitée.'; end if;
  if v_invitation.cleaning_agent_id is not null then
    select public.cleaning_team_member_limit(v_invitation.organization_id) into v_limit;
    select count(*)::integer into v_active from public.cleaning_agents a join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.linked_user_id and m.status='active' where a.organization_id=v_invitation.organization_id and a.linked_user_id is not null and a.status='active' and a.linked_user_id<>auth.uid();
  elsif v_invitation.security_agent_id is not null then
    select public.security_team_member_limit(v_invitation.organization_id) into v_limit;
    select count(*)::integer into v_active from public.security_agents a join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.linked_user_id and m.status='active' where a.organization_id=v_invitation.organization_id and a.linked_user_id is not null and a.status='active' and a.linked_user_id<>auth.uid();
  else
    select public.plan_member_limit(o.plan) into v_limit from public.organizations o where o.id=v_invitation.organization_id;
    select count(*)::integer into v_active from public.organization_members where organization_id=v_invitation.organization_id and status='active' and user_id<>auth.uid();
  end if;
  if v_active>=v_limit then raise exception 'La limite d’utilisateurs est atteinte.'; end if;
  insert into public.organization_members(organization_id,user_id,role,status) values(v_invitation.organization_id,auth.uid(),v_invitation.role,'active') on conflict(organization_id,user_id) do update set role=case when public.organization_members.role='owner' then 'owner' else excluded.role end,status='active';
  if v_invitation.staff_id is not null then update public.staff set linked_user_id=auth.uid(),email=coalesce(email,v_user_email),updated_at=now() where organization_id=v_invitation.organization_id and id=v_invitation.staff_id and linked_user_id is null; end if;
  if v_invitation.security_agent_id is not null then update public.security_agents set linked_user_id=auth.uid(),email=coalesce(email,v_user_email),updated_at=now() where organization_id=v_invitation.organization_id and id=v_invitation.security_agent_id and linked_user_id is null; end if;
  if v_invitation.cleaning_agent_id is not null then update public.cleaning_agents set linked_user_id=auth.uid(),email=coalesce(email,v_user_email),updated_at=now() where organization_id=v_invitation.organization_id and id=v_invitation.cleaning_agent_id and linked_user_id is null; end if;
  update public.organization_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now(),updated_at=now() where id=v_invitation.id;
  return v_invitation.organization_id;
end;
$$;

-- Stockage des preuves photo (URL non devinable basée sur organisation/intervention).
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cleaning-photos','cleaning-photos',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists cleaning_photos_insert on storage.objects;
create policy cleaning_photos_insert on storage.objects for insert to authenticated with check (
  bucket_id='cleaning-photos' and public.is_org_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists cleaning_photos_update on storage.objects;
create policy cleaning_photos_update on storage.objects for update to authenticated using (
  bucket_id='cleaning-photos' and public.is_org_member((storage.foldername(name))[1]::uuid)
) with check (
  bucket_id='cleaning-photos' and public.is_org_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists cleaning_photos_delete on storage.objects;
create policy cleaning_photos_delete on storage.objects for delete to authenticated using (
  bucket_id='cleaning-photos' and public.has_org_role((storage.foldername(name))[1]::uuid,array['owner','admin','manager'])
);

commit;
