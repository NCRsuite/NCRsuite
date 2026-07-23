-- NCR Suite V2.17.0 - Formation : preparation automatisee du BPF
-- A executer apres 076_training_crm_pipeline.sql.

begin;

-- Les classifications restent modifiables : elles qualifient les donnees metier
-- existantes sans remplacer les sessions, inscriptions ou documents deja valides.
alter table public.training_programs
  add column if not exists bpf_objective text not null default 'other_professional',
  add column if not exists bpf_rncp_level text,
  add column if not exists bpf_specialty_code text,
  add column if not exists bpf_specialty_name text;

alter table public.training_programs
  drop constraint if exists training_programs_bpf_objective_check,
  add constraint training_programs_bpf_objective_check check (
    bpf_objective in ('rncp','rs','cqp_unregistered','other_professional','skills_assessment','vae')
  ),
  drop constraint if exists training_programs_bpf_rncp_level_check,
  add constraint training_programs_bpf_rncp_level_check check (
    bpf_rncp_level is null
    or bpf_rncp_level in ('level_6_8','level_5','level_4','level_3','level_2','cqp_no_level')
  ),
  drop constraint if exists training_programs_bpf_specialty_code_check,
  add constraint training_programs_bpf_specialty_code_check check (
    bpf_specialty_code is null or bpf_specialty_code ~ '^[0-9]{3}$'
  );

alter table public.training_trainers
  add column if not exists bpf_relationship text not null default 'internal';

alter table public.training_trainers
  drop constraint if exists training_trainers_bpf_relationship_check,
  add constraint training_trainers_bpf_relationship_check
    check (bpf_relationship in ('internal','external'));

alter table public.training_sessions
  add column if not exists bpf_delivery_mode text not null default 'direct';

alter table public.training_sessions
  drop constraint if exists training_sessions_bpf_delivery_mode_check,
  add constraint training_sessions_bpf_delivery_mode_check
    check (bpf_delivery_mode in ('direct','outsourced_by_us','subcontracted_for_other'));

alter table public.training_session_enrollments
  add column if not exists bpf_trainee_type text,
  add column if not exists bpf_attended_hours numeric(8,2);

alter table public.training_session_enrollments
  drop constraint if exists training_enrollments_bpf_trainee_type_check,
  add constraint training_enrollments_bpf_trainee_type_check check (
    bpf_trainee_type is null
    or bpf_trainee_type in ('private_employee','apprentice','jobseeker','individual','other')
  ),
  drop constraint if exists training_enrollments_bpf_attended_hours_check,
  add constraint training_enrollments_bpf_attended_hours_check
    check (bpf_attended_hours is null or bpf_attended_hours between 0 and 10000);

alter table public.training_commercial_documents
  add column if not exists bpf_revenue_category text,
  add column if not exists bpf_revenue_recognized_at date,
  add column if not exists bpf_included boolean not null default false;

alter table public.training_commercial_documents
  drop constraint if exists training_commercial_bpf_revenue_category_check,
  add constraint training_commercial_bpf_revenue_category_check check (
    bpf_revenue_category is null
    or bpf_revenue_category in (
      'companies',
      'apprenticeship',
      'professionalization',
      'pro_a',
      'transition',
      'cpf',
      'jobseekers_funds',
      'self_employed_funds',
      'skills_plan',
      'public_agents',
      'eu',
      'state',
      'regions',
      'france_travail',
      'other_public',
      'individuals',
      'training_organizations',
      'other_training'
    )
  );

create index if not exists idx_training_sessions_bpf_period
  on public.training_sessions(organization_id, status, ends_at, bpf_delivery_mode);
create index if not exists idx_training_enrollments_bpf_type
  on public.training_session_enrollments(organization_id, bpf_trainee_type);
create index if not exists idx_training_commercial_bpf_period
  on public.training_commercial_documents(
    organization_id,
    bpf_included,
    coalesce(bpf_revenue_recognized_at, issue_date)
  );

create table if not exists public.training_bpf_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reporting_year integer not null check (reporting_year between 2000 and 2100),
  exercise_start date not null,
  exercise_end date not null,
  status text not null default 'draft' check (status in ('draft','reviewed','locked')),
  legal_form text,
  naf_code text,
  address_public boolean not null default false,
  total_company_revenue_cents bigint not null default 0 check (total_company_revenue_cents >= 0),
  total_training_charges_cents bigint not null default 0 check (total_training_charges_cents >= 0),
  trainer_salaries_cents bigint not null default 0 check (trainer_salaries_cents >= 0),
  external_training_costs_cents bigint not null default 0 check (external_training_costs_cents >= 0),
  executive_name text,
  executive_title text,
  revenue_overrides jsonb not null default '{}'::jsonb,
  notes text,
  calculated_data jsonb not null default '{}'::jsonb,
  calculated_at timestamptz,
  locked_at timestamptz,
  locked_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reporting_year),
  unique (organization_id, id),
  constraint training_bpf_reports_period_check check (exercise_end >= exercise_start),
  constraint training_bpf_reports_trainer_costs_check check (
    trainer_salaries_cents <= total_training_charges_cents
    and external_training_costs_cents <= total_training_charges_cents
  )
);

create index if not exists idx_training_bpf_reports_org_year
  on public.training_bpf_reports(organization_id, reporting_year desc);

-- Etend le controle d'offre central au module BPF.
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
      when 'training_bpf' then 'training_bpf'
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

create or replace function public.prepare_training_bpf_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_allowed_keys text[] := array[
    'companies','apprenticeship','professionalization','pro_a','transition','cpf',
    'jobseekers_funds','self_employed_funds','skills_plan','public_agents','eu',
    'state','regions','france_travail','other_public','individuals',
    'training_organizations','other_training'
  ];
begin
  if not exists (
    select 1 from public.organizations
    where id = new.organization_id and business_type = 'formation'
  ) then
    raise exception 'Le BPF est reserve aux espaces Formation.';
  end if;

  if new.exercise_end < new.exercise_start then
    raise exception 'La fin de l''exercice doit etre posterieure au debut.';
  end if;

  new.legal_form := nullif(trim(coalesce(new.legal_form, '')), '');
  new.naf_code := nullif(upper(trim(coalesce(new.naf_code, ''))), '');
  new.executive_name := nullif(trim(coalesce(new.executive_name, '')), '');
  new.executive_title := nullif(trim(coalesce(new.executive_title, '')), '');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');

  for v_item in select key, value from jsonb_each_text(coalesce(new.revenue_overrides, '{}'::jsonb))
  loop
    if not (v_item.key = any(v_allowed_keys))
       or v_item.value !~ '^[0-9]+$' then
      raise exception 'Une correction de produits BPF est invalide.';
    end if;
  end loop;

  if new.status = 'locked' and coalesce((new.calculated_data #>> '{quality,ready}')::boolean, false) is not true then
    raise exception 'Les controles bloquants doivent etre corriges avant le verrouillage.';
  end if;

  if new.status = 'locked' and (tg_op = 'INSERT' or old.status <> 'locked') then
    new.locked_at := now();
    new.locked_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_training_bpf_report on public.training_bpf_reports;
create trigger prepare_training_bpf_report
before insert or update on public.training_bpf_reports
for each row execute procedure public.prepare_training_bpf_report();

drop trigger if exists set_training_bpf_reports_updated_at on public.training_bpf_reports;
create trigger set_training_bpf_reports_updated_at
before update on public.training_bpf_reports
for each row execute procedure public.set_updated_at();

-- Classification prudente des produits commerciaux. Les cas ambigus restent a verifier.
create or replace function public.prepare_training_bpf_commercial_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_funder_type text;
  v_customer_type text;
  v_recognized_at date;
begin
  if new.status in ('accepted','signed','completed') and exists (
    select 1
    from public.training_sessions s
    where s.organization_id = new.organization_id
      and s.source_commercial_document_id = new.id
  ) then
    new.bpf_included := true;
    if new.bpf_revenue_recognized_at is null then
      select max(s.ends_at::date) into v_recognized_at
      from public.training_sessions s
      where s.organization_id = new.organization_id
        and s.source_commercial_document_id = new.id;
      new.bpf_revenue_recognized_at := v_recognized_at;
    end if;
  end if;

  if new.bpf_revenue_category is not null then
    return new;
  end if;

  if new.funder_id is not null then
    select funder_type into v_funder_type
    from public.training_funders
    where organization_id = new.organization_id and id = new.funder_id;
  end if;

  if new.customer_id is not null then
    select customer_type into v_customer_type
    from public.training_customers
    where organization_id = new.organization_id and id = new.customer_id;
  end if;

  new.bpf_revenue_category := case
    when v_funder_type = 'employer' then 'companies'
    when v_funder_type = 'cpf' then 'cpf'
    when v_funder_type = 'self' then 'individuals'
    when v_customer_type = 'individual' and v_funder_type is null then 'individuals'
    when v_customer_type = 'company' and v_funder_type is null then 'companies'
    else null
  end;
  return new;
end;
$$;

drop trigger if exists prepare_training_bpf_commercial_document on public.training_commercial_documents;
create trigger prepare_training_bpf_commercial_document
before insert or update
on public.training_commercial_documents
for each row execute procedure public.prepare_training_bpf_commercial_document();

create or replace function public.infer_training_bpf_trainee_type(
  p_organization_id uuid,
  p_session_id uuid,
  p_trainee_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when f.funder_type = 'employer' then 'private_employee'
    when c.customer_type = 'individual' and coalesce(f.funder_type, 'self') = 'self' then 'individual'
    when c.customer_type = 'company' and coalesce(f.funder_type, 'employer') = 'employer' then 'private_employee'
    when nullif(trim(t.company), '') is not null and f.funder_type is null then 'private_employee'
    else null
  end
  from public.training_trainees t
  join public.training_sessions s
    on s.organization_id = t.organization_id and s.id = p_session_id
  left join public.training_commercial_documents d
    on d.organization_id = s.organization_id and d.id = s.source_commercial_document_id
  left join public.training_customers c
    on c.organization_id = d.organization_id and c.id = d.customer_id
  left join public.training_funders f
    on f.organization_id = d.organization_id and f.id = d.funder_id
  where t.organization_id = p_organization_id
    and t.id = p_trainee_id;
$$;

revoke all on function public.infer_training_bpf_trainee_type(uuid,uuid,uuid) from public, anon, authenticated;

create or replace function public.prepare_training_bpf_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.bpf_trainee_type is null then
    new.bpf_trainee_type := public.infer_training_bpf_trainee_type(
      new.organization_id,
      new.session_id,
      new.trainee_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_training_bpf_enrollment on public.training_session_enrollments;
create trigger prepare_training_bpf_enrollment
before insert or update
on public.training_session_enrollments
for each row execute procedure public.prepare_training_bpf_enrollment();

update public.training_session_enrollments e
set bpf_trainee_type = public.infer_training_bpf_trainee_type(
  e.organization_id,
  e.session_id,
  e.trainee_id
)
where e.bpf_trainee_type is null
  and public.infer_training_bpf_trainee_type(
    e.organization_id,
    e.session_id,
    e.trainee_id
  ) is not null;

create or replace function public.sync_training_bpf_source_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_commercial_document_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.source_commercial_document_id is not distinct from old.source_commercial_document_id then
      return new;
    end if;
  end if;

  update public.training_commercial_documents
  set bpf_included = true,
      bpf_revenue_recognized_at = coalesce(bpf_revenue_recognized_at, new.ends_at::date),
      updated_at = now()
  where organization_id = new.organization_id
    and id = new.source_commercial_document_id;

  return new;
end;
$$;

drop trigger if exists sync_training_bpf_source_document on public.training_sessions;
create trigger sync_training_bpf_source_document
after insert or update of source_commercial_document_id on public.training_sessions
for each row execute procedure public.sync_training_bpf_source_document();

update public.training_commercial_documents d
set bpf_included = true,
    bpf_revenue_recognized_at = coalesce(
      d.bpf_revenue_recognized_at,
      (
        select s.ends_at::date
        from public.training_sessions s
        where s.organization_id = d.organization_id
          and s.source_commercial_document_id = d.id
        order by s.ends_at desc
        limit 1
      ),
      d.issue_date
    )
where exists (
  select 1
  from public.training_sessions s
  where s.organization_id = d.organization_id
    and s.source_commercial_document_id = d.id
)
and d.status in ('accepted','signed','completed');

-- Une ligne represente une participation a une action. Les heures d'emargement
-- priment, puis une saisie BPF manuelle, puis la duree du programme.
create or replace function public.training_bpf_participant_rows(
  p_organization_id uuid,
  p_start date,
  p_end date
)
returns table (
  session_id uuid,
  trainee_id uuid,
  trainee_type text,
  attended_hours numeric,
  delivery_mode text,
  objective text,
  rncp_level text,
  specialty_code text,
  specialty_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    e.trainee_id,
    e.bpf_trainee_type,
    round(
      greatest(
        0::numeric,
        case
          when e.bpf_attended_hours is not null then e.bpf_attended_hours
          when e.status = 'absent' then 0::numeric
          when coalesce(a.marked_periods, 0) > 0 then
            p.duration_hours
              * coalesce(a.present_periods, 0)::numeric
              / a.marked_periods::numeric
          else p.duration_hours
        end
      ),
      2
    ) as attended_hours,
    s.bpf_delivery_mode,
    p.bpf_objective,
    p.bpf_rncp_level,
    p.bpf_specialty_code,
    p.bpf_specialty_name
  from public.training_sessions s
  join public.training_programs p
    on p.organization_id = s.organization_id and p.id = s.program_id
  join public.training_session_enrollments e
    on e.organization_id = s.organization_id and e.session_id = s.id
  left join lateral (
    select
      count(*) filter (where a1.status in ('present','absent','excused')) as marked_periods,
      count(*) filter (where a1.status = 'present') as present_periods
    from public.training_attendance a1
    where a1.organization_id = e.organization_id
      and a1.session_id = e.session_id
      and a1.trainee_id = e.trainee_id
  ) a on true
  where s.organization_id = p_organization_id
    and s.status = 'completed'
    and s.ends_at::date between p_start and p_end
    and e.status <> 'canceled';
$$;

revoke all on function public.training_bpf_participant_rows(uuid,date,date) from public, anon, authenticated;

create or replace function public.create_training_bpf_report(
  p_organization_id uuid,
  p_reporting_year integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_bpf') then
    raise exception 'Acces refuse.';
  end if;
  if p_reporting_year not between 2000 and 2100 then
    raise exception 'Annee BPF invalide.';
  end if;

  insert into public.training_bpf_reports (
    organization_id,
    reporting_year,
    exercise_start,
    exercise_end,
    executive_name,
    created_by
  )
  select
    o.id,
    p_reporting_year,
    make_date(p_reporting_year, 1, 1),
    make_date(p_reporting_year, 12, 31),
    o.training_legal_representative,
    auth.uid()
  from public.organizations o
  where o.id = p_organization_id and o.business_type = 'formation'
  on conflict (organization_id, reporting_year) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.training_bpf_reports
    where organization_id = p_organization_id
      and reporting_year = p_reporting_year;
  end if;
  if v_id is null then raise exception 'Espace Formation introuvable.'; end if;
  return v_id;
end;
$$;

create or replace function public.refresh_training_bpf_report(
  p_organization_id uuid,
  p_report_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.training_bpf_reports%rowtype;
  v_org public.organizations%rowtype;
  v_revenue_keys text[] := array[
    'companies','apprenticeship','professionalization','pro_a','transition','cpf',
    'jobseekers_funds','self_employed_funds','skills_plan','public_agents','eu',
    'state','regions','france_travail','other_public','individuals',
    'training_organizations','other_training'
  ];
  v_auto_revenues jsonb := '{}'::jsonb;
  v_revenues jsonb := '{}'::jsonb;
  v_trainee_categories jsonb := '{}'::jsonb;
  v_trainee_total jsonb := '{"count":0,"hours":0}'::jsonb;
  v_outsourced jsonb := '{"count":0,"hours":0}'::jsonb;
  v_subcontracted jsonb := '{"count":0,"hours":0}'::jsonb;
  v_objectives jsonb := '{}'::jsonb;
  v_rncp_levels jsonb := '{}'::jsonb;
  v_specialties jsonb := '[]'::jsonb;
  v_other_specialties jsonb := '{"count":0,"hours":0}'::jsonb;
  v_trainers jsonb := '{}'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_warning_batch jsonb;
  v_data jsonb;
  v_key text;
  v_auto_value bigint;
  v_total_products bigint := 0;
  v_training_percent integer := 0;
  v_completed_sessions integer := 0;
  v_enrollments integer := 0;
  v_included_documents integer := 0;
  v_unincluded_documents integer := 0;
  v_distance_learning boolean := false;
  v_critical_count integer := 0;
  v_warning_count integer := 0;
  v_completeness integer := 0;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_bpf') then
    raise exception 'Acces refuse.';
  end if;

  select * into v_report
  from public.training_bpf_reports
  where organization_id = p_organization_id and id = p_report_id;
  if not found then raise exception 'BPF introuvable.'; end if;
  if v_report.status = 'locked' then return v_report.calculated_data; end if;

  select * into v_org
  from public.organizations
  where id = p_organization_id and business_type = 'formation';
  if not found then raise exception 'Espace Formation introuvable.'; end if;

  select
    count(*)::integer,
    coalesce(bool_or(modality in ('distanciel','hybride')), false)
  into v_completed_sessions, v_distance_learning
  from public.training_sessions
  where organization_id = p_organization_id
    and status = 'completed'
    and ends_at::date between v_report.exercise_start and v_report.exercise_end;

  select count(*)::integer into v_enrollments
  from public.training_bpf_participant_rows(
    p_organization_id,
    v_report.exercise_start,
    v_report.exercise_end
  )
  where attended_hours > 0;

  select
    coalesce(jsonb_object_agg(k.key, coalesce(r.amount_cents, 0)), '{}'::jsonb)
  into v_auto_revenues
  from unnest(v_revenue_keys) as k(key)
  left join (
    select
      d.bpf_revenue_category as key,
      sum(d.amount_excl_tax_cents)::bigint as amount_cents
    from public.training_commercial_documents d
    where d.organization_id = p_organization_id
      and d.bpf_included = true
      and d.status in ('accepted','signed','completed')
      and coalesce(d.bpf_revenue_recognized_at, d.issue_date)
        between v_report.exercise_start and v_report.exercise_end
      and d.bpf_revenue_category is not null
    group by d.bpf_revenue_category
  ) r on r.key = k.key;

  foreach v_key in array v_revenue_keys loop
    v_auto_value := coalesce((v_auto_revenues ->> v_key)::bigint, 0);
    if v_report.revenue_overrides ? v_key then
      v_auto_value := greatest(0, (v_report.revenue_overrides ->> v_key)::bigint);
    end if;
    v_revenues := v_revenues || jsonb_build_object(v_key, v_auto_value);
    v_total_products := v_total_products + v_auto_value;
  end loop;

  if v_report.total_company_revenue_cents > 0 and v_total_products > 0 then
    v_training_percent := greatest(
      1,
      least(100, round(v_total_products::numeric * 100 / v_report.total_company_revenue_cents)::integer)
    );
  end if;

  select coalesce(jsonb_object_agg(category, metric), '{}'::jsonb)
  into v_trainee_categories
  from (
    select
      category,
      jsonb_build_object(
        'count', count(*)::integer,
        'hours', round(coalesce(sum(attended_hours), 0), 2)
      ) as metric
    from (
      select
        coalesce(trainee_type, 'other') as category,
        attended_hours
      from public.training_bpf_participant_rows(
        p_organization_id,
        v_report.exercise_start,
        v_report.exercise_end
      )
      where delivery_mode <> 'subcontracted_for_other' and attended_hours > 0
    ) participant_categories
    group by category
  ) category_metrics;

  foreach v_key in array array['private_employee','apprentice','jobseeker','individual','other'] loop
    if not (v_trainee_categories ? v_key) then
      v_trainee_categories := v_trainee_categories
        || jsonb_build_object(v_key, jsonb_build_object('count', 0, 'hours', 0));
    end if;
  end loop;

  select jsonb_build_object(
    'count', count(*)::integer,
    'hours', round(coalesce(sum(attended_hours), 0), 2)
  )
  into v_trainee_total
  from public.training_bpf_participant_rows(
    p_organization_id,
    v_report.exercise_start,
    v_report.exercise_end
  )
  where delivery_mode <> 'subcontracted_for_other' and attended_hours > 0;

  select jsonb_build_object(
    'count', count(*)::integer,
    'hours', round(coalesce(sum(attended_hours), 0), 2)
  )
  into v_outsourced
  from public.training_bpf_participant_rows(
    p_organization_id,
    v_report.exercise_start,
    v_report.exercise_end
  )
  where delivery_mode = 'outsourced_by_us' and attended_hours > 0;

  select jsonb_build_object(
    'count', count(*)::integer,
    'hours', round(coalesce(sum(attended_hours), 0), 2)
  )
  into v_subcontracted
  from public.training_bpf_participant_rows(
    p_organization_id,
    v_report.exercise_start,
    v_report.exercise_end
  )
  where delivery_mode = 'subcontracted_for_other' and attended_hours > 0;

  select coalesce(jsonb_object_agg(objective_key, metric), '{}'::jsonb)
  into v_objectives
  from (
    select
      coalesce(objective, 'other_professional') as objective_key,
      jsonb_build_object(
        'count', count(*)::integer,
        'hours', round(coalesce(sum(attended_hours), 0), 2)
      ) as metric
    from public.training_bpf_participant_rows(
      p_organization_id,
      v_report.exercise_start,
      v_report.exercise_end
    )
    where delivery_mode <> 'subcontracted_for_other' and attended_hours > 0
    group by coalesce(objective, 'other_professional')
  ) objective_metrics;

  foreach v_key in array array['rncp','rs','cqp_unregistered','other_professional','skills_assessment','vae'] loop
    if not (v_objectives ? v_key) then
      v_objectives := v_objectives
        || jsonb_build_object(v_key, jsonb_build_object('count', 0, 'hours', 0));
    end if;
  end loop;

  select coalesce(jsonb_object_agg(level_key, metric), '{}'::jsonb)
  into v_rncp_levels
  from (
    select
      rncp_level as level_key,
      jsonb_build_object(
        'count', count(*)::integer,
        'hours', round(coalesce(sum(attended_hours), 0), 2)
      ) as metric
    from public.training_bpf_participant_rows(
      p_organization_id,
      v_report.exercise_start,
      v_report.exercise_end
    )
    where delivery_mode <> 'subcontracted_for_other'
      and objective = 'rncp'
      and rncp_level is not null
      and attended_hours > 0
    group by rncp_level
  ) rncp_metrics;

  foreach v_key in array array['level_6_8','level_5','level_4','level_3','level_2','cqp_no_level'] loop
    if not (v_rncp_levels ? v_key) then
      v_rncp_levels := v_rncp_levels
        || jsonb_build_object(v_key, jsonb_build_object('count', 0, 'hours', 0));
    end if;
  end loop;

  with grouped as (
    select
      coalesce(nullif(specialty_code, ''), '---') as code,
      coalesce(nullif(specialty_name, ''), 'Non classee') as name,
      count(*)::integer as participant_count,
      round(coalesce(sum(attended_hours), 0), 2) as participant_hours
    from public.training_bpf_participant_rows(
      p_organization_id,
      v_report.exercise_start,
      v_report.exercise_end
    )
    where delivery_mode <> 'subcontracted_for_other' and attended_hours > 0
    group by
      coalesce(nullif(specialty_code, ''), '---'),
      coalesce(nullif(specialty_name, ''), 'Non classee')
  ),
  ranked as (
    select *, row_number() over (order by participant_hours desc, participant_count desc, code) as rank
    from grouped
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'code', code,
          'name', name,
          'count', participant_count,
          'hours', participant_hours
        )
        order by rank
      ) filter (where rank <= 5),
      '[]'::jsonb
    ),
    jsonb_build_object(
      'count', coalesce(sum(participant_count) filter (where rank > 5), 0),
      'hours', coalesce(round(sum(participant_hours) filter (where rank > 5), 2), 0)
    )
  into v_specialties, v_other_specialties
  from ranked;

  with trainer_sessions as (
    select
      tr.id,
      tr.bpf_relationship,
      p.duration_hours
    from public.training_sessions s
    join public.training_programs p
      on p.organization_id = s.organization_id and p.id = s.program_id
    join public.training_trainers tr
      on tr.organization_id = s.organization_id and tr.id = s.trainer_id
    where s.organization_id = p_organization_id
      and s.status = 'completed'
      and s.ends_at::date between v_report.exercise_start and v_report.exercise_end
  ),
  trainer_metrics as (
    select
      relationship_key,
      jsonb_build_object(
        'count', count(distinct id)::integer,
        'hours', round(coalesce(sum(duration_hours), 0), 2)
      ) as metric
    from (
      select id, coalesce(bpf_relationship, 'internal') as relationship_key, duration_hours
      from trainer_sessions
    ) normalized
    group by relationship_key
  )
  select coalesce(jsonb_object_agg(relationship_key, metric), '{}'::jsonb)
  into v_trainers
  from trainer_metrics;

  foreach v_key in array array['internal','external'] loop
    if not (v_trainers ? v_key) then
      v_trainers := v_trainers
        || jsonb_build_object(v_key, jsonb_build_object('count', 0, 'hours', 0));
    end if;
  end loop;

  select count(*)::integer into v_included_documents
  from public.training_commercial_documents d
  where d.organization_id = p_organization_id
    and d.bpf_included = true
    and d.status in ('accepted','signed','completed')
    and coalesce(d.bpf_revenue_recognized_at, d.issue_date)
      between v_report.exercise_start and v_report.exercise_end;

  select count(*)::integer into v_unincluded_documents
  from public.training_commercial_documents d
  where d.organization_id = p_organization_id
    and d.bpf_included = false
    and d.status in ('accepted','signed','completed')
    and d.issue_date between v_report.exercise_start and v_report.exercise_end
    and d.amount_excl_tax_cents > 0;

  -- Identite obligatoire du cadre A et signataire du cadre H.
  if nullif(trim(coalesce(v_org.training_nda_number, '')), '') is null then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','critical','code','identity_nda','label','Numero de declaration d''activite manquant',
      'entity_type','organization','entity_id',p_organization_id
    ));
  end if;
  if nullif(trim(coalesce(v_org.company_siret, '')), '') is null then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','critical','code','identity_siret','label','SIRET manquant',
      'entity_type','organization','entity_id',p_organization_id
    ));
  end if;
  if v_report.legal_form is null then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','critical','code','identity_legal_form','label','Forme juridique manquante',
      'entity_type','report','entity_id',p_report_id
    ));
  end if;
  if v_report.naf_code is null then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','critical','code','identity_naf','label','Code NAF manquant',
      'entity_type','report','entity_id',p_report_id
    ));
  end if;
  if v_report.executive_name is null or v_report.executive_title is null then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','critical','code','identity_executive','label','Dirigeant ou qualite du signataire manquant',
      'entity_type','report','entity_id',p_report_id
    ));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','critical',
    'code','trainee_type',
    'label','Type de stagiaire a classer',
    'entity_type','enrollment',
    'entity_id',participant.session_id::text || ':' || participant.trainee_id::text
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_bpf_participant_rows(
    p_organization_id,
    v_report.exercise_start,
    v_report.exercise_end
  ) participant
  where participant.delivery_mode <> 'subcontracted_for_other'
    and participant.attended_hours > 0
    and participant.trainee_type is null;
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(distinct jsonb_build_object(
    'severity','critical',
    'code','program_specialty',
    'label','Specialite de formation a renseigner',
    'entity_type','program',
    'entity_id',p.id
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_sessions s
  join public.training_programs p
    on p.organization_id = s.organization_id and p.id = s.program_id
  where s.organization_id = p_organization_id
    and s.status = 'completed'
    and s.ends_at::date between v_report.exercise_start and v_report.exercise_end
    and s.bpf_delivery_mode <> 'subcontracted_for_other'
    and (p.bpf_specialty_code is null or p.bpf_specialty_name is null);
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(distinct jsonb_build_object(
    'severity','critical',
    'code','program_rncp_level',
    'label','Niveau RNCP a renseigner',
    'entity_type','program',
    'entity_id',p.id
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_sessions s
  join public.training_programs p
    on p.organization_id = s.organization_id and p.id = s.program_id
  where s.organization_id = p_organization_id
    and s.status = 'completed'
    and s.ends_at::date between v_report.exercise_start and v_report.exercise_end
    and s.bpf_delivery_mode <> 'subcontracted_for_other'
    and p.bpf_objective = 'rncp'
    and p.bpf_rncp_level is null;
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','critical',
    'code','revenue_category',
    'label','Produit financier a classer',
    'entity_type','commercial_document',
    'entity_id',d.id
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_commercial_documents d
  where d.organization_id = p_organization_id
    and d.bpf_included = true
    and d.status in ('accepted','signed','completed')
    and coalesce(d.bpf_revenue_recognized_at, d.issue_date)
      between v_report.exercise_start and v_report.exercise_end
    and d.bpf_revenue_category is null;
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','warning',
    'code','commercial_document_not_included',
    'label','Document commercial realise non retenu',
    'entity_type','commercial_document',
    'entity_id',d.id
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_commercial_documents d
  where d.organization_id = p_organization_id
    and d.bpf_included = false
    and d.status in ('accepted','signed','completed')
    and d.issue_date between v_report.exercise_start and v_report.exercise_end
    and d.amount_excl_tax_cents > 0;
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','warning',
    'code','attendance_unconfirmed',
    'label','Presence calculee sans emargement complet',
    'entity_type','enrollment',
    'entity_id',e.session_id::text || ':' || e.trainee_id::text
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_session_enrollments e
  join public.training_sessions s
    on s.organization_id = e.organization_id and s.id = e.session_id
  where e.organization_id = p_organization_id
    and s.status = 'completed'
    and s.ends_at::date between v_report.exercise_start and v_report.exercise_end
    and e.status in ('registered','confirmed')
    and e.bpf_attended_hours is null
    and not exists (
      select 1 from public.training_attendance a
      where a.organization_id = e.organization_id
        and a.session_id = e.session_id
        and a.trainee_id = e.trainee_id
        and a.status in ('present','absent','excused')
    );
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','warning',
    'code','session_trainer',
    'label','Session cloturee sans formateur',
    'entity_type','session',
    'entity_id',s.id
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_sessions s
  where s.organization_id = p_organization_id
    and s.status = 'completed'
    and s.ends_at::date between v_report.exercise_start and v_report.exercise_end
    and s.trainer_id is null;
  v_warnings := v_warnings || v_warning_batch;

  if v_total_products > 0 and v_report.total_company_revenue_cents = 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','warning','code','global_revenue','label','Chiffre d''affaires global a renseigner',
      'entity_type','report','entity_id',p_report_id
    ));
  end if;
  if v_completed_sessions > 0 and v_report.total_training_charges_cents = 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','warning','code','training_charges','label','Charges de formation a verifier',
      'entity_type','report','entity_id',p_report_id
    ));
  end if;

  select
    count(*) filter (where item ->> 'severity' = 'critical')::integer,
    count(*) filter (where item ->> 'severity' = 'warning')::integer
  into v_critical_count, v_warning_count
  from jsonb_array_elements(v_warnings) item;

  v_completeness := greatest(0, 100 - v_critical_count * 10 - v_warning_count * 3);

  v_data := jsonb_build_object(
    'report_id', v_report.id,
    'generated_at', now(),
    'period', jsonb_build_object(
      'year', v_report.reporting_year,
      'start', v_report.exercise_start,
      'end', v_report.exercise_end
    ),
    'identity', jsonb_build_object(
      'nda_number', v_org.training_nda_number,
      'siret', v_org.company_siret,
      'name', coalesce(v_org.public_name, v_org.name),
      'address', v_org.company_address,
      'postal_code', v_org.company_postal_code,
      'city', v_org.company_city,
      'phone', v_org.company_phone,
      'email', coalesce(v_org.company_email, v_org.training_reply_to_email),
      'legal_form', v_report.legal_form,
      'naf_code', v_report.naf_code,
      'address_public', v_report.address_public,
      'executive_name', v_report.executive_name,
      'executive_title', v_report.executive_title
    ),
    'general', jsonb_build_object(
      'distance_learning', v_distance_learning,
      'completed_sessions', v_completed_sessions
    ),
    'financial', jsonb_build_object(
      'auto_revenues_cents', v_auto_revenues,
      'revenues_cents', v_revenues,
      'total_products_cents', v_total_products,
      'total_company_revenue_cents', v_report.total_company_revenue_cents,
      'training_revenue_percent', v_training_percent,
      'total_training_charges_cents', v_report.total_training_charges_cents,
      'trainer_salaries_cents', v_report.trainer_salaries_cents,
      'external_training_costs_cents', v_report.external_training_costs_cents
    ),
    'trainers', v_trainers,
    'trainees', jsonb_build_object(
      'categories', v_trainee_categories,
      'total', v_trainee_total,
      'outsourced_by_us', v_outsourced,
      'subcontracted_for_other', v_subcontracted
    ),
    'objectives', jsonb_build_object(
      'categories', v_objectives,
      'rncp_levels', v_rncp_levels,
      'total', v_trainee_total
    ),
    'specialties', jsonb_build_object(
      'main', v_specialties,
      'other', v_other_specialties,
      'total', v_trainee_total
    ),
    'quality', jsonb_build_object(
      'completeness_percent', v_completeness,
      'critical_count', v_critical_count,
      'warning_count', v_warning_count,
      'ready', v_critical_count = 0,
      'warnings', v_warnings
    ),
    'sources', jsonb_build_object(
      'completed_sessions', v_completed_sessions,
      'enrollments', v_enrollments,
      'included_revenue_documents', v_included_documents,
      'unreviewed_revenue_documents', v_unincluded_documents
    )
  );

  update public.training_bpf_reports
  set calculated_data = v_data,
      calculated_at = now()
  where organization_id = p_organization_id and id = p_report_id;

  return v_data;
end;
$$;

create or replace function public.set_training_bpf_report_status(
  p_organization_id uuid,
  p_report_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb;
  v_current_status text;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_bpf') then
    raise exception 'Acces refuse.';
  end if;
  if p_status not in ('draft','reviewed','locked') then
    raise exception 'Statut BPF invalide.';
  end if;

  select status into v_current_status
  from public.training_bpf_reports
  where organization_id = p_organization_id and id = p_report_id;
  if not found then raise exception 'BPF introuvable.'; end if;
  if v_current_status = 'locked' then
    raise exception 'Ce BPF est deja verrouille.';
  end if;

  v_data := public.refresh_training_bpf_report(p_organization_id, p_report_id);
  if p_status = 'locked'
     and coalesce((v_data #>> '{quality,ready}')::boolean, false) is not true then
    raise exception 'Les controles bloquants doivent etre corriges avant le verrouillage.';
  end if;

  update public.training_bpf_reports
  set status = p_status
  where organization_id = p_organization_id and id = p_report_id;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'training.bpf_status_changed',
    'training_bpf_report',
    p_report_id::text,
    jsonb_build_object('status', p_status, 'reporting_year', v_data #>> '{period,year}')
  );

  return v_data;
end;
$$;

create or replace function public.reopen_training_bpf_report(
  p_organization_id uuid,
  p_report_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_bpf') then
    raise exception 'Acces refuse.';
  end if;

  update public.training_bpf_reports
  set status = 'draft',
      locked_at = null,
      locked_by = null
  where organization_id = p_organization_id and id = p_report_id;

  if not found then raise exception 'BPF introuvable.'; end if;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'training.bpf_reopened',
    'training_bpf_report',
    p_report_id::text,
    '{}'::jsonb
  );
end;
$$;

alter table public.training_bpf_reports enable row level security;
revoke all on public.training_bpf_reports from anon, authenticated;
grant select on public.training_bpf_reports to authenticated;
grant update (
  exercise_start,
  exercise_end,
  legal_form,
  naf_code,
  address_public,
  total_company_revenue_cents,
  total_training_charges_cents,
  trainer_salaries_cents,
  external_training_costs_cents,
  executive_name,
  executive_title,
  revenue_overrides,
  notes
) on public.training_bpf_reports to authenticated;

drop policy if exists training_bpf_reports_select on public.training_bpf_reports;
create policy training_bpf_reports_select
on public.training_bpf_reports for select to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id, 'training_bpf')
);

drop policy if exists training_bpf_reports_update on public.training_bpf_reports;
create policy training_bpf_reports_update
on public.training_bpf_reports for update to authenticated
using (
  status <> 'locked'
  and public.has_org_role(organization_id, array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id, 'training_bpf')
)
with check (
  public.has_org_role(organization_id, array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id, 'training_bpf')
);

revoke all on function public.create_training_bpf_report(uuid,integer) from public, anon;
revoke all on function public.refresh_training_bpf_report(uuid,uuid) from public, anon;
revoke all on function public.set_training_bpf_report_status(uuid,uuid,text) from public, anon;
revoke all on function public.reopen_training_bpf_report(uuid,uuid) from public, anon;
grant execute on function public.create_training_bpf_report(uuid,integer) to authenticated;
grant execute on function public.refresh_training_bpf_report(uuid,uuid) to authenticated;
grant execute on function public.set_training_bpf_report_status(uuid,uuid,text) to authenticated;
grant execute on function public.reopen_training_bpf_report(uuid,uuid) to authenticated;

insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, sort_order
)
values (
  'training_bpf',
  'BPF automatique',
  'Preparation annuelle du bilan pedagogique et financier, controles et exports.',
  'formation',
  'chart',
  '{formation}',
  false,
  true,
  540
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
set features = features || '{"training_bpf":true}'::jsonb,
    updated_at = now()
where business_type = 'formation' and plan_key in ('professionnelle','metier');

insert into public.organization_modules(organization_id, module_key, enabled)
select
  o.id,
  'training_bpf',
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
  '2.17.0',
  '2.17.0',
  'ncr-suite-shell-v2.17.0-training-bpf-automation',
  now(),
  auth.uid(),
  'Formation V2.17.0 : brouillon BPF annuel, calcul des cadres C a G, controles de coherence, verrouillage et exports preparatoires.'
)
on conflict(singleton) do update set
  database_version = excluded.database_version,
  expected_frontend_version = excluded.expected_frontend_version,
  expected_pwa_cache = excluded.expected_pwa_cache,
  installed_at = excluded.installed_at,
  installed_by = excluded.installed_by,
  notes = excluded.notes;

commit;
