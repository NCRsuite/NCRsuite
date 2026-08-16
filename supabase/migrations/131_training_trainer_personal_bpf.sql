-- NCR Suite V2.29.17 — Formation · Mon BPF sous-traitance formateur
-- Consolide, pour chaque utilisateur formateur portail, les interventions réalisées
-- pour d'autres organismes sans exposer le BPF global de ces organismes.
begin;

create table if not exists public.training_trainer_bpf_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trainer_id uuid not null,
  session_id uuid not null,
  reporting_year integer not null check (reporting_year between 2000 and 2100),
  amount_excl_tax_cents bigint check (amount_excl_tax_cents is null or amount_excl_tax_cents >= 0),
  invoice_reference text,
  invoice_date date,
  notes text,
  status text not null default 'draft' check (status in ('draft','confirmed')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, organization_id, trainer_id, session_id),
  constraint training_trainer_bpf_entries_trainer_fk foreign key(organization_id,trainer_id)
    references public.training_trainers(organization_id,id) on delete cascade,
  constraint training_trainer_bpf_entries_session_fk foreign key(organization_id,session_id)
    references public.training_sessions(organization_id,id) on delete cascade
);

create index if not exists idx_training_trainer_bpf_entries_user_year
  on public.training_trainer_bpf_entries(user_id,reporting_year,updated_at desc);
create index if not exists idx_training_trainer_bpf_entries_session
  on public.training_trainer_bpf_entries(organization_id,session_id);

alter table public.training_trainer_bpf_entries enable row level security;

drop policy if exists training_trainer_bpf_entries_select on public.training_trainer_bpf_entries;
create policy training_trainer_bpf_entries_select on public.training_trainer_bpf_entries
for select to authenticated
using (user_id=auth.uid());

drop policy if exists training_trainer_bpf_entries_insert on public.training_trainer_bpf_entries;
drop policy if exists training_trainer_bpf_entries_update on public.training_trainer_bpf_entries;
drop policy if exists training_trainer_bpf_entries_delete on public.training_trainer_bpf_entries;
-- Les écritures passent exclusivement par save_training_trainer_bpf_entry(), qui recalcule
-- l'éligibilité à partir du compte portail connecté et de la session réellement affectée.

create or replace function public.training_trainer_bpf_overview(p_reporting_year integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if p_reporting_year < 2000 or p_reporting_year > extract(year from current_date)::integer + 1 then
    raise exception 'Exercice BPF invalide.';
  end if;

  with my_accounts as (
    select distinct
      a.organization_id,
      a.trainer_id,
      coalesce(o.public_name,o.name) as organization_name,
      o.company_siret,
      trim(concat(tr.first_name,' ',tr.last_name)) as trainer_name,
      coalesce(tr.bpf_relationship,'internal') as relationship
    from public.training_portal_accounts a
    join public.organizations o on o.id=a.organization_id
    join public.training_trainers tr
      on tr.organization_id=a.organization_id and tr.id=a.trainer_id
    where a.user_id=auth.uid()
      and a.status='active'
      and a.subject_kind='trainer'
      and o.business_type='formation'
  ),
  period_sessions as (
    select
      ma.organization_id,ma.trainer_id,ma.organization_name,ma.company_siret,ma.trainer_name,ma.relationship,
      s.id as session_id,s.title,s.starts_at,s.ends_at,s.status,s.location,s.modality,s.program_id,
      p.title as program_title,p.duration_hours
    from my_accounts ma
    join public.training_sessions s
      on s.organization_id=ma.organization_id and s.trainer_id=ma.trainer_id
    join public.training_programs p
      on p.organization_id=s.organization_id and p.id=s.program_id
    where s.status='completed'
      and extract(year from (s.ends_at at time zone 'Europe/Paris'))::integer=p_reporting_year
  ),
  participant_rows as (
    select
      ps.organization_id,ps.session_id,e.trainee_id,
      greatest(0,round((
        case
          when e.bpf_attended_hours is not null then e.bpf_attended_hours
          when e.status='absent' then 0
          when att.mark_count > 0 then coalesce(ps.duration_hours,0) * att.present_count::numeric / att.mark_count::numeric
          else coalesce(ps.duration_hours,0)
        end
      )::numeric,2)) as attended_hours
    from period_sessions ps
    join public.training_session_enrollments e
      on e.organization_id=ps.organization_id and e.session_id=ps.session_id and e.status<>'canceled'
    left join lateral (
      select
        count(*) filter (where a.status in ('present','absent','excused'))::numeric as mark_count,
        count(*) filter (where a.status='present')::numeric as present_count
      from public.training_attendance a
      where a.organization_id=e.organization_id
        and a.session_id=e.session_id
        and a.trainee_id=e.trainee_id
    ) att on true
  ),
  session_metrics as (
    select
      ps.*,
      count(pr.trainee_id) filter (where pr.attended_hours>0)::integer as trainee_count,
      round(coalesce(sum(pr.attended_hours) filter (where pr.attended_hours>0),0),2) as trainee_hours
    from period_sessions ps
    left join participant_rows pr
      on pr.organization_id=ps.organization_id and pr.session_id=ps.session_id
    group by
      ps.organization_id,ps.trainer_id,ps.organization_name,ps.company_siret,ps.trainer_name,ps.relationship,
      ps.session_id,ps.title,ps.starts_at,ps.ends_at,ps.status,ps.location,ps.modality,ps.program_id,
      ps.program_title,ps.duration_hours
  ),
  eligible as (
    select sm.*,e.id as entry_id,e.amount_excl_tax_cents,e.invoice_reference,e.invoice_date,e.notes,
      e.status as entry_status,e.confirmed_at,e.updated_at
    from session_metrics sm
    left join public.training_trainer_bpf_entries e
      on e.user_id=auth.uid()
      and e.organization_id=sm.organization_id
      and e.trainer_id=sm.trainer_id
      and e.session_id=sm.session_id
    where sm.relationship='external'
  )
  select jsonb_build_object(
    'reporting_year',p_reporting_year,
    'summary',jsonb_build_object(
      'centers',(select count(distinct organization_id) from eligible),
      'interventions',(select count(*) from eligible),
      'trainees',(select coalesce(sum(trainee_count),0) from eligible),
      'trainee_hours',(select round(coalesce(sum(trainee_hours),0),2) from eligible),
      'revenue_cents',(select coalesce(sum(amount_excl_tax_cents),0) from eligible where amount_excl_tax_cents is not null),
      'completed_entries',(select count(*) from eligible where amount_excl_tax_cents is not null),
      'to_complete',(select count(*) from eligible where amount_excl_tax_cents is null)
    ),
    'excluded_internal_sessions',(select count(*) from session_metrics where relationship<>'external'),
    'interventions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'organization_id',organization_id,
        'organization_name',organization_name,
        'organization_siret',company_siret,
        'trainer_id',trainer_id,
        'session_id',session_id,
        'session_title',title,
        'program_title',program_title,
        'starts_at',starts_at,
        'ends_at',ends_at,
        'location',location,
        'modality',modality,
        'training_hours',duration_hours,
        'trainee_count',trainee_count,
        'trainee_hours',trainee_hours,
        'amount_excl_tax_cents',amount_excl_tax_cents,
        'invoice_reference',invoice_reference,
        'invoice_date',invoice_date,
        'notes',notes,
        'entry_status',coalesce(entry_status,'draft'),
        'confirmed_at',confirmed_at,
        'updated_at',updated_at
      ) order by ends_at desc,organization_name,title)
      from eligible
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.save_training_trainer_bpf_entry(
  p_session_id uuid,
  p_amount_excl_tax_cents bigint default null,
  p_invoice_reference text default null,
  p_invoice_date date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_account record;
  v_session public.training_sessions%rowtype;
  v_year integer;
  v_entry public.training_trainer_bpf_entries%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if p_amount_excl_tax_cents is not null and p_amount_excl_tax_cents < 0 then
    raise exception 'Le montant HT ne peut pas être négatif.';
  end if;

  select a.organization_id,a.trainer_id
  into v_account
  from public.training_portal_accounts a
  join public.training_trainers tr
    on tr.organization_id=a.organization_id and tr.id=a.trainer_id
  join public.training_sessions s
    on s.organization_id=a.organization_id and s.id=p_session_id and s.trainer_id=a.trainer_id
  where a.user_id=auth.uid()
    and a.status='active'
    and a.subject_kind='trainer'
    and coalesce(tr.bpf_relationship,'internal')='external'
    and s.status='completed'
  limit 1;

  if v_account.organization_id is null then
    raise exception 'Cette intervention n est pas éligible à votre suivi BPF sous-traitance.';
  end if;

  select * into v_session
  from public.training_sessions
  where organization_id=v_account.organization_id and id=p_session_id;

  v_year:=extract(year from (v_session.ends_at at time zone 'Europe/Paris'))::integer;

  insert into public.training_trainer_bpf_entries(
    user_id,organization_id,trainer_id,session_id,reporting_year,
    amount_excl_tax_cents,invoice_reference,invoice_date,notes,status,confirmed_at
  ) values (
    auth.uid(),v_account.organization_id,v_account.trainer_id,p_session_id,v_year,
    p_amount_excl_tax_cents,nullif(trim(coalesce(p_invoice_reference,'')),''),p_invoice_date,
    nullif(trim(coalesce(p_notes,'')),''),
    case when p_amount_excl_tax_cents is null then 'draft' else 'confirmed' end,
    case when p_amount_excl_tax_cents is null then null else now() end
  )
  on conflict(user_id,organization_id,trainer_id,session_id) do update set
    reporting_year=excluded.reporting_year,
    amount_excl_tax_cents=excluded.amount_excl_tax_cents,
    invoice_reference=excluded.invoice_reference,
    invoice_date=excluded.invoice_date,
    notes=excluded.notes,
    status=excluded.status,
    confirmed_at=case
      when excluded.status='confirmed' then coalesce(public.training_trainer_bpf_entries.confirmed_at,now())
      else null
    end,
    updated_at=now()
  returning * into v_entry;

  return jsonb_build_object(
    'id',v_entry.id,
    'status',v_entry.status,
    'reporting_year',v_entry.reporting_year,
    'amount_excl_tax_cents',v_entry.amount_excl_tax_cents,
    'invoice_reference',v_entry.invoice_reference,
    'invoice_date',v_entry.invoice_date,
    'updated_at',v_entry.updated_at
  );
end;
$$;

revoke all on function public.training_trainer_bpf_overview(integer) from public,anon;
revoke all on function public.save_training_trainer_bpf_entry(uuid,bigint,text,date,text) from public,anon;
grant execute on function public.training_trainer_bpf_overview(integer) to authenticated;
grant execute on function public.save_training_trainer_bpf_entry(uuid,bigint,text,date,text) to authenticated;

-- Release state
insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,installed_at,installed_by,notes
) values (
  true,'2.29.17','2.29.17','ncr-suite-shell-v2.29.17-trainer-personal-bpf',now(),auth.uid(),
  'V2.29.17 : BPF personnel formateur sous-traitant, consolidation multi-centres, cadre G et suivi des produits C10.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

select pg_notify('pgrst','reload schema');
commit;
