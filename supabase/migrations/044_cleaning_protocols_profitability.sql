-- NCR Suite V2.7.1 — Protocoles, récurrence et rentabilité Nettoyage
-- À exécuter après 043_cleaning_pack_core.sql.
-- Découverte : protocoles et planification récurrente.
-- Essentielle : checklists terrain.
-- Professionnelle : coûts et rentabilité par chantier.

begin;

-- Catalogue commercial et droits serveur.
update public.domain_plan_catalog
set features = features || '{"cleaning_protocols":true,"cleaning_recurring_planning":true}'::jsonb,
    short_description = 'Clients, sites, planning, protocoles, récurrence et facturation programmée.',
    updated_at = now()
where business_type = 'nettoyage' and plan_key = 'decouverte';

update public.domain_plan_catalog
set features = features || '{"cleaning_protocols":true,"cleaning_recurring_planning":true,"cleaning_task_checklists":true}'::jsonb,
    short_description = 'Ajoute 10 agents connectés, pointage, checklists terrain, rapports et photos.',
    updated_at = now()
where business_type = 'nettoyage' and plan_key = 'essentielle';

update public.domain_plan_catalog
set features = features || '{"cleaning_protocols":true,"cleaning_recurring_planning":true,"cleaning_task_checklists":true,"cleaning_profitability":true}'::jsonb,
    short_description = 'Ajoute 50 agents, rentabilité par chantier, contrôle qualité, stocks, multi-site et statistiques.',
    updated_at = now()
where business_type = 'nettoyage' and plan_key in ('professionnelle','metier');

insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, active, sort_order
) values
  ('cleaning_protocols', 'Protocoles & récurrences', 'Cahiers des charges par site et génération automatique du planning.', 'nettoyage', 'clipboard', '{nettoyage}', false, true, true, 635),
  ('cleaning_profitability', 'Rentabilité Nettoyage', 'Coûts horaires, consommables et marge par chantier.', 'nettoyage', 'chart', '{nettoyage}', false, false, true, 675)
on conflict (module_key) do update set
  display_name=excluded.display_name, description=excluded.description, category=excluded.category,
  icon_key=excluded.icon_key, compatible_business_types=excluded.compatible_business_types,
  default_enabled=excluded.default_enabled, active=excluded.active, sort_order=excluded.sort_order, updated_at=now();

create table if not exists public.cleaning_protocols (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 160),
  description text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint cleaning_protocols_site_fk foreign key (organization_id, site_id)
    references public.cleaning_sites(organization_id, id) on delete restrict
);

create table if not exists public.cleaning_protocol_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  protocol_id uuid not null,
  label text not null check (char_length(trim(label)) between 2 and 240),
  position integer not null default 0,
  required boolean not null default true,
  requires_photo boolean not null default false,
  estimated_minutes integer not null default 0 check (estimated_minutes between 0 and 1440),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint cleaning_protocol_tasks_protocol_fk foreign key (organization_id, protocol_id)
    references public.cleaning_protocols(organization_id, id) on delete cascade
);

create table if not exists public.cleaning_recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null,
  agent_id uuid not null,
  protocol_id uuid,
  title text not null default 'Entretien régulier',
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null,
  duration_minutes integer not null check (duration_minutes between 15 and 1440),
  break_minutes integer not null default 0 check (break_minutes between 0 and 720),
  interval_weeks integer not null default 1 check (interval_weeks between 1 and 12),
  starts_on date not null default current_date,
  ends_on date,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint cleaning_recurring_site_fk foreign key (organization_id, site_id)
    references public.cleaning_sites(organization_id, id) on delete restrict,
  constraint cleaning_recurring_agent_fk foreign key (organization_id, agent_id)
    references public.cleaning_agents(organization_id, id) on delete restrict,
  constraint cleaning_recurring_protocol_fk foreign key (organization_id, protocol_id)
    references public.cleaning_protocols(organization_id, id) on delete set null,
  constraint cleaning_recurring_dates_check check (ends_on is null or ends_on >= starts_on),
  constraint cleaning_recurring_break_check check (break_minutes < duration_minutes)
);

create table if not exists public.cleaning_agent_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null,
  hourly_cost_cents integer not null default 0 check (hourly_cost_cents between 0 and 100000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, agent_id),
  constraint cleaning_agent_costs_agent_fk foreign key (organization_id, agent_id)
    references public.cleaning_agents(organization_id, id) on delete cascade
);

alter table public.cleaning_intervention_tasks
  add column if not exists required boolean not null default true,
  add column if not exists requires_photo boolean not null default false,
  add column if not exists estimated_minutes integer not null default 0,
  add column if not exists observation text;

alter table public.cleaning_interventions
  add column if not exists protocol_id uuid,
  add column if not exists recurring_schedule_id uuid,
  add column if not exists occurrence_date date,
  add column if not exists consumable_cost_cents integer not null default 0;

alter table public.cleaning_interventions
  drop constraint if exists cleaning_interventions_protocol_fk,
  add constraint cleaning_interventions_protocol_fk foreign key (organization_id, protocol_id)
    references public.cleaning_protocols(organization_id, id) on delete set null;

alter table public.cleaning_interventions
  drop constraint if exists cleaning_interventions_recurring_fk,
  add constraint cleaning_interventions_recurring_fk foreign key (organization_id, recurring_schedule_id)
    references public.cleaning_recurring_schedules(organization_id, id) on delete set null;

alter table public.cleaning_interventions
  drop constraint if exists cleaning_interventions_consumable_cost_check,
  add constraint cleaning_interventions_consumable_cost_check check (consumable_cost_cents between 0 and 10000000);

create unique index if not exists idx_cleaning_intervention_recurring_occurrence
  on public.cleaning_interventions(organization_id, recurring_schedule_id, occurrence_date)
  where recurring_schedule_id is not null and occurrence_date is not null;
create index if not exists idx_cleaning_protocols_org_site on public.cleaning_protocols(organization_id, site_id, status);
create index if not exists idx_cleaning_protocol_tasks_protocol on public.cleaning_protocol_tasks(organization_id, protocol_id, position);
create index if not exists idx_cleaning_recurring_org_status on public.cleaning_recurring_schedules(organization_id, status, starts_on);
create index if not exists idx_cleaning_costs_org_agent on public.cleaning_agent_costs(organization_id, agent_id);

-- Mise à jour automatique des dates.
do $$ declare t text; begin
  foreach t in array array['cleaning_protocols','cleaning_recurring_schedules','cleaning_agent_costs'] loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', 'set_' || t || '_updated_at', t);
  end loop;
end $$;

create or replace function public.is_cleaning_finance_manager(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(p_organization_id, array['owner','admin']);
$$;

create or replace function public.validate_cleaning_v271_record()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.organizations o
    where o.id = new.organization_id and o.business_type = 'nettoyage' and o.status in ('trial','active')
  ) then raise exception 'Ce module est réservé à un espace Nettoyage actif.'; end if;

  if tg_table_name in ('cleaning_protocols','cleaning_protocol_tasks')
     and not public.organization_has_plan_feature(new.organization_id, 'cleaning_protocols') then
    raise exception 'Les protocoles ne sont pas inclus dans cette offre.';
  end if;
  if tg_table_name = 'cleaning_recurring_schedules'
     and not public.organization_has_plan_feature(new.organization_id, 'cleaning_recurring_planning') then
    raise exception 'La planification récurrente n’est pas incluse dans cette offre.';
  end if;
  if tg_table_name = 'cleaning_agent_costs'
     and not public.organization_has_plan_feature(new.organization_id, 'cleaning_profitability') then
    raise exception 'La rentabilité par chantier nécessite l’offre Professionnelle.';
  end if;
  if tg_table_name = 'cleaning_recurring_schedules' and new.protocol_id is not null and not exists (
    select 1 from public.cleaning_protocols p where p.organization_id=new.organization_id and p.id=new.protocol_id and p.site_id=new.site_id and p.status='active'
  ) then raise exception 'Le protocole doit appartenir au site de la récurrence.'; end if;
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['cleaning_protocols','cleaning_protocol_tasks','cleaning_recurring_schedules','cleaning_agent_costs'] loop
    execute format('drop trigger if exists %I on public.%I', 'validate_' || t || '_v271', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute procedure public.validate_cleaning_v271_record()', 'validate_' || t || '_v271', t);
  end loop;
end $$;

create or replace function public.validate_cleaning_profitability_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if (new.protocol_id is distinct from old.protocol_id or new.recurring_schedule_id is distinct from old.recurring_schedule_id or new.occurrence_date is distinct from old.occurrence_date)
     and not public.is_cleaning_manager(new.organization_id) then
    raise exception 'Seul un responsable peut modifier le protocole ou la récurrence.';
  end if;
  if new.consumable_cost_cents is distinct from old.consumable_cost_cents then
    if not public.is_cleaning_finance_manager(new.organization_id) then raise exception 'Seuls le propriétaire et les administrateurs peuvent modifier les coûts.'; end if;
    if not public.organization_has_plan_feature(new.organization_id, 'cleaning_profitability') then
      raise exception 'La rentabilité par chantier nécessite l’offre Professionnelle.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_cleaning_v271_intervention_links()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.protocol_id is not null and not exists (
    select 1 from public.cleaning_protocols p where p.organization_id=new.organization_id and p.id=new.protocol_id and p.site_id=new.site_id
  ) then raise exception 'Le protocole sélectionné ne correspond pas au site.'; end if;
  if new.recurring_schedule_id is not null and not exists (
    select 1 from public.cleaning_recurring_schedules r where r.organization_id=new.organization_id and r.id=new.recurring_schedule_id and r.site_id=new.site_id and r.agent_id=new.agent_id
  ) then raise exception 'La récurrence ne correspond pas au site ou à l’agent.'; end if;
  return new;
end;
$$;

drop trigger if exists validate_cleaning_v271_intervention_links_trigger on public.cleaning_interventions;
create trigger validate_cleaning_v271_intervention_links_trigger
before insert or update of protocol_id, recurring_schedule_id, site_id, agent_id on public.cleaning_interventions
for each row execute procedure public.validate_cleaning_v271_intervention_links();

drop trigger if exists validate_cleaning_profitability_fields_trigger on public.cleaning_interventions;
create trigger validate_cleaning_profitability_fields_trigger
before update on public.cleaning_interventions for each row execute procedure public.validate_cleaning_profitability_fields();

-- Copie le protocole dans la checklist de l’intervention.
create or replace function public.copy_cleaning_protocol_tasks()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.protocol_id is not null and public.organization_has_plan_feature(new.organization_id, 'cleaning_protocols') then
    insert into public.cleaning_intervention_tasks(
      organization_id, intervention_id, label, position, required, requires_photo, estimated_minutes
    )
    select new.organization_id, new.id, t.label, t.position, t.required, t.requires_photo, t.estimated_minutes
    from public.cleaning_protocol_tasks t
    where t.organization_id = new.organization_id and t.protocol_id = new.protocol_id
    order by t.position, t.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists copy_cleaning_protocol_tasks_trigger on public.cleaning_interventions;
create trigger copy_cleaning_protocol_tasks_trigger
after insert on public.cleaning_interventions for each row execute procedure public.copy_cleaning_protocol_tasks();

-- RLS.
alter table public.cleaning_protocols enable row level security;
alter table public.cleaning_protocol_tasks enable row level security;
alter table public.cleaning_recurring_schedules enable row level security;
alter table public.cleaning_agent_costs enable row level security;

drop policy if exists cleaning_protocols_select on public.cleaning_protocols;
create policy cleaning_protocols_select on public.cleaning_protocols for select using (
  public.is_cleaning_manager(organization_id) or public.cleaning_agent_can_access_site(organization_id, site_id)
);
drop policy if exists cleaning_protocols_manage on public.cleaning_protocols;
create policy cleaning_protocols_manage on public.cleaning_protocols for all using (
  public.is_cleaning_manager(organization_id)
) with check (
  public.is_cleaning_manager(organization_id)
);

drop policy if exists cleaning_protocol_tasks_select on public.cleaning_protocol_tasks;
create policy cleaning_protocol_tasks_select on public.cleaning_protocol_tasks for select using (
  exists (
    select 1 from public.cleaning_protocols p
    where p.organization_id = cleaning_protocol_tasks.organization_id
      and p.id = cleaning_protocol_tasks.protocol_id
      and (public.is_cleaning_manager(p.organization_id) or public.cleaning_agent_can_access_site(p.organization_id, p.site_id))
  )
);
drop policy if exists cleaning_protocol_tasks_manage on public.cleaning_protocol_tasks;
create policy cleaning_protocol_tasks_manage on public.cleaning_protocol_tasks for all using (
  public.is_cleaning_manager(organization_id)
) with check (
  public.is_cleaning_manager(organization_id)
);

drop policy if exists cleaning_recurring_manager_all on public.cleaning_recurring_schedules;
create policy cleaning_recurring_manager_all on public.cleaning_recurring_schedules for all using (
  public.is_cleaning_manager(organization_id)
) with check (
  public.is_cleaning_manager(organization_id)
);

drop policy if exists cleaning_agent_costs_manager_all on public.cleaning_agent_costs;
create policy cleaning_agent_costs_manager_all on public.cleaning_agent_costs for all using (
  public.is_cleaning_finance_manager(organization_id)
) with check (
  public.is_cleaning_finance_manager(organization_id)
);

grant select, insert, update, delete on public.cleaning_protocols to authenticated;
grant select, insert, update, delete on public.cleaning_protocol_tasks to authenticated;
grant select, insert, update, delete on public.cleaning_recurring_schedules to authenticated;
grant select, insert, update, delete on public.cleaning_agent_costs to authenticated;

-- Génère sans doublon les prochaines interventions d’une récurrence.
create or replace function public.generate_cleaning_recurring_interventions(
  p_organization_id uuid,
  p_schedule_id uuid,
  p_until date default (current_date + 56)
)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_schedule public.cleaning_recurring_schedules%rowtype;
  v_site public.cleaning_sites%rowtype;
  v_date date;
  v_last_date date;
  v_start timestamptz;
  v_end timestamptz;
  v_price integer;
  v_created integer := 0;
begin
  if auth.uid() is null or not public.is_cleaning_manager(p_organization_id) then raise exception 'Accès insuffisant.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'cleaning_recurring_planning') then
    raise exception 'La planification récurrente n’est pas incluse dans cette offre.';
  end if;
  select * into v_schedule from public.cleaning_recurring_schedules
  where organization_id = p_organization_id and id = p_schedule_id and status = 'active';
  if v_schedule.id is null then raise exception 'Récurrence introuvable ou inactive.'; end if;
  select * into v_site from public.cleaning_sites
  where organization_id = p_organization_id and id = v_schedule.site_id and status = 'active';
  if v_site.id is null then raise exception 'Site introuvable ou inactif.'; end if;

  v_date := greatest(v_schedule.starts_on, current_date);
  v_last_date := least(coalesce(v_schedule.ends_on, p_until), p_until);
  while v_date <= v_last_date loop
    if extract(dow from v_date)::integer = v_schedule.weekday
       and ((v_date - v_schedule.starts_on) / 7)::integer % v_schedule.interval_weeks = 0 then
      v_start := ((v_date::text || ' ' || v_schedule.start_time::text)::timestamp at time zone v_site.timezone);
      v_end := v_start + make_interval(mins => v_schedule.duration_minutes);
      v_price := case when v_site.billing_mode = 'flat' then v_site.service_rate_cents
        else round(((v_schedule.duration_minutes - v_schedule.break_minutes)::numeric / 60) * v_site.service_rate_cents)::integer end;
      begin
        insert into public.cleaning_interventions(
          organization_id, site_id, agent_id, protocol_id, recurring_schedule_id, occurrence_date,
          title, starts_at, ends_at, break_minutes, planned_price_cents, created_by
        ) values (
          p_organization_id, v_schedule.site_id, v_schedule.agent_id, v_schedule.protocol_id, v_schedule.id, v_date,
          v_schedule.title, v_start, v_end, v_schedule.break_minutes, greatest(v_price,0), auth.uid()
        );
        v_created := v_created + 1;
      exception when unique_violation then null;
      end;
    end if;
    v_date := v_date + 1;
  end loop;
  return v_created;
end;
$$;

-- L’agent coche uniquement les tâches de sa propre intervention.
create or replace function public.set_cleaning_intervention_task(
  p_organization_id uuid,
  p_task_id uuid,
  p_completed boolean,
  p_observation text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_agent uuid;
begin
  if not public.organization_has_plan_feature(p_organization_id, 'cleaning_task_checklists') then
    raise exception 'Les checklists terrain nécessitent l’offre Essentielle.';
  end if;
  v_agent := public.current_cleaning_agent_id(p_organization_id);
  if v_agent is null then raise exception 'Aucune fiche agent liée à ce compte.'; end if;
  update public.cleaning_intervention_tasks t
  set completed = p_completed,
      completed_at = case when p_completed then now() else null end,
      completed_by = case when p_completed then auth.uid() else null end,
      observation = nullif(trim(coalesce(p_observation,'')),'')
  from public.cleaning_interventions i
  where t.organization_id = p_organization_id and t.id = p_task_id
    and i.organization_id = t.organization_id and i.id = t.intervention_id
    and i.agent_id = v_agent and i.status = 'in_progress';
  if not found then raise exception 'Tâche introuvable ou intervention non démarrée.'; end if;
end;
$$;

-- La fin de mission contrôle les tâches obligatoires et les preuves demandées.
create or replace function public.finish_cleaning_intervention(p_organization_id uuid, p_intervention_id uuid, p_report_text text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_agent uuid; v_requires_photo boolean; v_after_photo text;
begin
  if not public.organization_has_plan_feature(p_organization_id, 'cleaning_time_clock') then raise exception 'Le pointage nécessite l’offre Essentielle.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'cleaning_visit_reports') then raise exception 'Les rapports nécessitent l’offre Essentielle.'; end if;
  v_agent := public.current_cleaning_agent_id(p_organization_id);
  if v_agent is null then raise exception 'Aucune fiche agent liée à ce compte.'; end if;

  if public.organization_has_plan_feature(p_organization_id, 'cleaning_task_checklists') then
    if exists (
      select 1 from public.cleaning_intervention_tasks t
      join public.cleaning_interventions i on i.organization_id=t.organization_id and i.id=t.intervention_id
      where t.organization_id=p_organization_id and t.intervention_id=p_intervention_id
        and i.agent_id=v_agent and t.required and not t.completed
    ) then raise exception 'Toutes les tâches obligatoires doivent être validées avant le départ.'; end if;
    select coalesce(bool_or(t.requires_photo),false), i.after_photo_url into v_requires_photo, v_after_photo
    from public.cleaning_interventions i
    left join public.cleaning_intervention_tasks t on t.organization_id=i.organization_id and t.intervention_id=i.id
    where i.organization_id=p_organization_id and i.id=p_intervention_id and i.agent_id=v_agent
    group by i.after_photo_url;
    if coalesce(v_requires_photo,false) and v_after_photo is null then
      raise exception 'Une photo après est obligatoire pour ce protocole.';
    end if;
  end if;

  update public.cleaning_interventions set status = 'completed', actual_ended_at = now(), report_text = nullif(trim(coalesce(p_report_text,'')),''), updated_at = now()
  where organization_id = p_organization_id and id = p_intervention_id and agent_id = v_agent and status = 'in_progress';
  if not found then raise exception 'Intervention introuvable ou non démarrée.'; end if;
end;
$$;

-- Coût horaire confidentiel par agent.
create or replace function public.set_cleaning_agent_cost(
  p_organization_id uuid,
  p_agent_id uuid,
  p_hourly_cost_cents integer
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_cleaning_finance_manager(p_organization_id) then raise exception 'Accès financier réservé au propriétaire et aux administrateurs.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'cleaning_profitability') then
    raise exception 'La rentabilité par chantier nécessite l’offre Professionnelle.';
  end if;
  if p_hourly_cost_cents < 0 or p_hourly_cost_cents > 100000 then raise exception 'Coût horaire invalide.'; end if;
  if not exists (select 1 from public.cleaning_agents where organization_id=p_organization_id and id=p_agent_id) then
    raise exception 'Agent introuvable.';
  end if;
  insert into public.cleaning_agent_costs(organization_id,agent_id,hourly_cost_cents,created_by)
  values(p_organization_id,p_agent_id,p_hourly_cost_cents,auth.uid())
  on conflict(organization_id,agent_id) do update set hourly_cost_cents=excluded.hourly_cost_cents,updated_at=now();
end;
$$;

create or replace function public.cleaning_profitability_summary(
  p_organization_id uuid,
  p_period_start date,
  p_period_end date
)
returns table(
  site_id uuid,
  site_name text,
  client_name text,
  intervention_count integer,
  planned_revenue_cents bigint,
  labor_cost_cents bigint,
  consumable_cost_cents bigint,
  margin_cents bigint,
  margin_rate numeric,
  planned_minutes bigint,
  actual_minutes bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_cleaning_finance_manager(p_organization_id) then raise exception 'Accès financier réservé au propriétaire et aux administrateurs.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'cleaning_profitability') then
    raise exception 'La rentabilité par chantier nécessite l’offre Professionnelle.';
  end if;
  if p_period_end < p_period_start then raise exception 'Période invalide.'; end if;

  return query
  with base as (
    select i.*, s.name as computed_site_name, c.company_name as computed_client_name,
      greatest(0, floor(extract(epoch from (i.ends_at-i.starts_at))/60)::integer-i.break_minutes) as computed_planned_minutes,
      case when i.actual_started_at is not null and i.actual_ended_at is not null
        then greatest(0, floor(extract(epoch from (i.actual_ended_at-i.actual_started_at))/60)::integer)
        else greatest(0, floor(extract(epoch from (i.ends_at-i.starts_at))/60)::integer-i.break_minutes) end as computed_cost_minutes,
      case when i.actual_started_at is not null and i.actual_ended_at is not null
        then greatest(0, floor(extract(epoch from (i.actual_ended_at-i.actual_started_at))/60)::integer)
        else 0 end as computed_actual_minutes,
      coalesce(ac.hourly_cost_cents,0) as computed_hourly_cost
    from public.cleaning_interventions i
    join public.cleaning_sites s on s.organization_id=i.organization_id and s.id=i.site_id
    join public.cleaning_clients c on c.organization_id=s.organization_id and c.id=s.client_id
    left join public.cleaning_agent_costs ac on ac.organization_id=i.organization_id and ac.agent_id=i.agent_id
    where i.organization_id=p_organization_id and i.status<>'canceled'
      and i.starts_at >= (p_period_start::timestamp at time zone s.timezone)
      and i.starts_at < ((p_period_end+1)::timestamp at time zone s.timezone)
  ), totals as (
    select b.site_id, b.computed_site_name, b.computed_client_name,
      count(*)::integer as computed_count,
      sum(b.planned_price_cents)::bigint as computed_revenue,
      sum(round((b.computed_cost_minutes::numeric/60)*b.computed_hourly_cost))::bigint as computed_labor,
      sum(b.consumable_cost_cents)::bigint as computed_consumables,
      sum(b.computed_planned_minutes)::bigint as computed_planned,
      sum(b.computed_actual_minutes)::bigint as computed_actual
    from base b group by b.site_id,b.computed_site_name,b.computed_client_name
  )
  select t.site_id,t.computed_site_name,t.computed_client_name,t.computed_count,t.computed_revenue,t.computed_labor,t.computed_consumables,
    (t.computed_revenue-t.computed_labor-t.computed_consumables)::bigint,
    case when t.computed_revenue>0 then round(((t.computed_revenue-t.computed_labor-t.computed_consumables)::numeric/t.computed_revenue)*100,1) else null end,
    t.computed_planned,t.computed_actual
  from totals t order by (t.computed_revenue-t.computed_labor-t.computed_consumables) asc, t.computed_site_name;
end;
$$;

grant execute on function public.generate_cleaning_recurring_interventions(uuid,uuid,date) to authenticated;
grant execute on function public.set_cleaning_intervention_task(uuid,uuid,boolean,text) to authenticated;
grant execute on function public.finish_cleaning_intervention(uuid,uuid,text) to authenticated;
grant execute on function public.set_cleaning_agent_cost(uuid,uuid,integer) to authenticated;
grant execute on function public.cleaning_profitability_summary(uuid,date,date) to authenticated;

commit;
