create table if not exists public.training_personal_interventions (
  id uuid primary key default gen_random_uuid(),
  reporting_organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  series_id uuid,
  center_name text not null,
  activity_title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  employment_mode text not null default 'salaried' check (employment_mode in ('salaried','subcontractor')),
  regulatory_scope text not null default 'review_required' check (regulatory_scope in ('review_required','professional_continuing','apprenticeship','initial_education','out_of_scope')),
  status text not null default 'planned' check (status in ('planned','completed','canceled')),
  amount_excl_tax_cents bigint check (amount_excl_tax_cents is null or amount_excl_tax_cents >= 0),
  invoice_reference text,
  invoice_date date,
  trainee_count integer not null default 0 check (trainee_count >= 0),
  trainee_hours numeric(10,2) not null default 0 check (trainee_hours >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_personal_interventions_dates_check check (ends_at > starts_at)
);

create index if not exists training_personal_interventions_user_period_idx
  on public.training_personal_interventions(user_id, starts_at, ends_at);
create index if not exists training_personal_interventions_reporting_org_idx
  on public.training_personal_interventions(reporting_organization_id, user_id, starts_at);
create index if not exists training_personal_interventions_series_idx
  on public.training_personal_interventions(series_id) where series_id is not null;

alter table public.training_personal_interventions enable row level security;

drop policy if exists training_personal_interventions_select_own on public.training_personal_interventions;
create policy training_personal_interventions_select_own on public.training_personal_interventions
for select to authenticated
using (
  user_id = auth.uid()
  and public.has_org_role(reporting_organization_id, array['owner','admin','manager','employee'])
);

drop policy if exists training_personal_interventions_insert_own on public.training_personal_interventions;
create policy training_personal_interventions_insert_own on public.training_personal_interventions
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.has_org_role(reporting_organization_id, array['owner','admin','manager','employee'])
);

drop policy if exists training_personal_interventions_update_own on public.training_personal_interventions;
create policy training_personal_interventions_update_own on public.training_personal_interventions
for update to authenticated
using (
  user_id = auth.uid()
  and public.has_org_role(reporting_organization_id, array['owner','admin','manager','employee'])
)
with check (
  user_id = auth.uid()
  and public.has_org_role(reporting_organization_id, array['owner','admin','manager','employee'])
);

drop policy if exists training_personal_interventions_delete_own on public.training_personal_interventions;
create policy training_personal_interventions_delete_own on public.training_personal_interventions
for delete to authenticated
using (
  user_id = auth.uid()
  and public.has_org_role(reporting_organization_id, array['owner','admin','manager','employee'])
);

grant select, insert, update, delete on public.training_personal_interventions to authenticated;
revoke all on public.training_personal_interventions from anon;

drop trigger if exists set_training_personal_interventions_updated_at on public.training_personal_interventions;
create trigger set_training_personal_interventions_updated_at
before update on public.training_personal_interventions
for each row execute function public.set_updated_at();

create or replace function public.training_personal_schedule(
  p_reporting_organization_id uuid,
  p_start date,
  p_end date
)
returns table(
  source_kind text,
  event_id uuid,
  organization_id uuid,
  organization_name text,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  status text,
  employment_mode text,
  regulatory_scope text,
  source_detail text
)
language sql
stable
security definer
set search_path to 'public','pg_catalog'
as $function$
  with permitted as (
    select 1
    where auth.uid() is not null
      and public.has_org_role(p_reporting_organization_id, array['owner','admin','manager','employee'])
      and p_start is not null and p_end is not null and p_end >= p_start
      and p_end - p_start <= 400
  ), manual_rows as (
    select
      'manual'::text as source_kind,
      i.id as event_id,
      i.reporting_organization_id as organization_id,
      i.center_name as organization_name,
      i.activity_title as title,
      i.starts_at,
      i.ends_at,
      i.location,
      i.status,
      i.employment_mode,
      i.regulatory_scope,
      case when i.employment_mode='salaried' then 'Activité salariée / rémunérée à l’heure' else 'Sous-traitance via votre organisme' end as source_detail
    from public.training_personal_interventions i, permitted
    where i.user_id=auth.uid()
      and i.reporting_organization_id=p_reporting_organization_id
      and i.starts_at < (p_end + 1)::timestamp
      and i.ends_at >= p_start::timestamp
  ), connected_rows as (
    select
      case when a.organization_id=p_reporting_organization_id then 'organization_session' else 'connected_center' end::text as source_kind,
      s.id as event_id,
      s.organization_id,
      coalesce(o.public_name,o.name) as organization_name,
      s.title,
      s.starts_at,
      s.ends_at,
      s.location,
      s.status,
      case when coalesce(tr.bpf_relationship,'internal')='external' then 'subcontractor' else 'salaried' end::text as employment_mode,
      coalesce(s.bpf_regulatory_scope,'review_required')::text as regulatory_scope,
      case when a.organization_id=p_reporting_organization_id then 'Session de votre organisme' else 'Session reçue d’un centre connecté' end::text as source_detail
    from public.training_portal_accounts a
    join public.training_sessions s on s.organization_id=a.organization_id and s.trainer_id=a.trainer_id
    join public.training_trainers tr on tr.organization_id=a.organization_id and tr.id=a.trainer_id
    join public.organizations o on o.id=a.organization_id
    cross join permitted
    where a.user_id=auth.uid() and a.status='active' and a.subject_kind='trainer'
      and s.starts_at < (p_end + 1)::timestamp and s.ends_at >= p_start::timestamp
  ), own_org_email_rows as (
    select
      'organization_session'::text as source_kind,
      s.id as event_id,
      s.organization_id,
      coalesce(o.public_name,o.name) as organization_name,
      s.title,
      s.starts_at,
      s.ends_at,
      s.location,
      s.status,
      case when coalesce(tr.bpf_relationship,'internal')='external' then 'subcontractor' else 'salaried' end::text as employment_mode,
      coalesce(s.bpf_regulatory_scope,'review_required')::text as regulatory_scope,
      'Session de votre organisme'::text as source_detail
    from public.training_sessions s
    join public.training_trainers tr on tr.organization_id=s.organization_id and tr.id=s.trainer_id
    join public.organizations o on o.id=s.organization_id
    cross join permitted
    where s.organization_id=p_reporting_organization_id
      and lower(coalesce(tr.email,''))=lower(coalesce(auth.jwt()->>'email',''))
      and s.starts_at < (p_end + 1)::timestamp and s.ends_at >= p_start::timestamp
  ), combined as (
    select * from manual_rows
    union all
    select * from connected_rows
    union all
    select * from own_org_email_rows
  )
  select distinct on (event_id)
    source_kind,event_id,organization_id,organization_name,title,starts_at,ends_at,location,status,employment_mode,regulatory_scope,source_detail
  from combined
  order by event_id,
    case source_kind when 'manual' then 1 when 'organization_session' then 2 else 3 end;
$function$;

grant execute on function public.training_personal_schedule(uuid,date,date) to authenticated;
revoke all on function public.training_personal_schedule(uuid,date,date) from anon;

create or replace function public.training_reporting_org_external_bpf_rows(p_reporting_organization_id uuid, p_start date, p_end date)
returns table(user_id uuid, source_organization_id uuid, trainer_id uuid, session_id uuid, trainee_count integer, trainee_hours numeric, amount_excl_tax_cents bigint, invoice_reference text)
language sql
stable security definer
set search_path to 'public'
as $function$
  with contributors as (
    select pref.user_id
    from public.training_trainer_bpf_preferences pref
    join public.organization_members m on m.organization_id=pref.reporting_organization_id and m.user_id=pref.user_id
    where pref.reporting_organization_id=p_reporting_organization_id and m.status='active' and m.role in ('owner','admin')
  ), external_sessions as (
    select c.user_id,a.organization_id source_organization_id,a.trainer_id,s.id session_id,p.duration_hours
    from contributors c
    join public.training_portal_accounts a on a.user_id=c.user_id and a.status='active' and a.subject_kind='trainer'
    join public.training_trainers tr on tr.organization_id=a.organization_id and tr.id=a.trainer_id and coalesce(tr.bpf_relationship,'internal')='external'
    join public.training_sessions s on s.organization_id=a.organization_id and s.trainer_id=a.trainer_id and s.status='completed'
      and s.bpf_regulatory_scope in ('professional_continuing','apprenticeship') and s.ends_at::date between p_start and p_end
    join public.training_programs p on p.organization_id=s.organization_id and p.id=s.program_id
  ), metrics as (
    select es.user_id,es.source_organization_id,es.trainer_id,es.session_id,
      count(x.trainee_id) filter(where x.attended_hours>0)::integer trainee_count,
      round(coalesce(sum(x.attended_hours) filter(where x.attended_hours>0),0),2) trainee_hours
    from external_sessions es
    left join lateral (
      select e.trainee_id,greatest(0,round((case when e.bpf_attended_hours is not null then e.bpf_attended_hours when e.status='absent' then 0
        when att.mark_count>0 then es.duration_hours*att.present_count::numeric/att.mark_count::numeric else es.duration_hours end)::numeric,2)) attended_hours
      from public.training_session_enrollments e
      left join lateral (select count(*) filter(where at.status in ('present','absent','excused'))::numeric mark_count,count(*) filter(where at.status='present')::numeric present_count from public.training_attendance at where at.organization_id=e.organization_id and at.session_id=e.session_id and at.trainee_id=e.trainee_id) att on true
      where e.organization_id=es.source_organization_id and e.session_id=es.session_id and e.status<>'canceled'
    ) x on true
    group by es.user_id,es.source_organization_id,es.trainer_id,es.session_id
  ), connected_rows as (
    select m.user_id,m.source_organization_id,m.trainer_id,m.session_id,m.trainee_count,m.trainee_hours,e.amount_excl_tax_cents,e.invoice_reference
    from metrics m left join public.training_trainer_bpf_entries e on e.user_id=m.user_id and e.organization_id=m.source_organization_id and e.trainer_id=m.trainer_id and e.session_id=m.session_id
  ), manual_rows as (
    select i.user_id,
      i.reporting_organization_id as source_organization_id,
      null::uuid as trainer_id,
      i.id as session_id,
      i.trainee_count,
      i.trainee_hours,
      i.amount_excl_tax_cents,
      i.invoice_reference
    from public.training_personal_interventions i
    join public.organization_members m on m.organization_id=i.reporting_organization_id and m.user_id=i.user_id and m.status='active' and m.role in ('owner','admin')
    where i.reporting_organization_id=p_reporting_organization_id
      and i.employment_mode='subcontractor'
      and i.status='completed'
      and i.regulatory_scope in ('professional_continuing','apprenticeship')
      and i.ends_at::date between p_start and p_end
  )
  select * from connected_rows
  union all
  select * from manual_rows;
$function$;

comment on table public.training_personal_interventions is 'Activité personnelle du formateur hors sessions de son organisme : planning salarié ou sous-traitance manuelle, sans créer de fausse session NCR.';
