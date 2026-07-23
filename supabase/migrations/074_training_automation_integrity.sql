-- NCR Suite V2.15.3 - Formation : integrite des automatisations validees
-- A executer apres 073_training_delivery_closure_automation.sql.
-- Complete les objets de file documentaire references par les versions 070/073
-- et verrouille la planification directe qui contourne la validation Formation.

begin;

alter table public.training_documents
  add column if not exists generated_automatically boolean not null default false,
  add column if not exists automation_key text,
  add column if not exists generated_at timestamptz,
  add column if not exists emailed_at timestamptz;

alter table public.training_documents
  drop constraint if exists training_documents_automation_key_length_check,
  add constraint training_documents_automation_key_length_check
    check (automation_key is null or char_length(automation_key) <= 240);

create unique index if not exists uq_training_documents_automation_key
  on public.training_documents(automation_key);
create index if not exists idx_training_documents_automatic_session
  on public.training_documents(organization_id, session_id, category, generated_automatically, generated_at desc);

create table if not exists public.training_document_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid,
  session_id uuid not null,
  trainee_id uuid not null,
  document_kind text not null check (document_kind in ('convocation','attestation')),
  generation_version integer not null default 1 check (generation_version >= 1),
  send_email boolean not null default true,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','cancelled')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  scheduled_for timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  document_id uuid references public.training_documents(id) on delete set null,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint training_document_jobs_site_fk foreign key (organization_id, site_id)
    references public.organization_sites(organization_id, id) on delete restrict,
  constraint training_document_jobs_session_fk foreign key (organization_id, session_id)
    references public.training_sessions(organization_id, id) on delete cascade,
  constraint training_document_jobs_trainee_fk foreign key (organization_id, trainee_id)
    references public.training_trainees(organization_id, id) on delete restrict
);

alter table public.training_document_jobs
  add column if not exists site_id uuid,
  add column if not exists generation_version integer not null default 1,
  add column if not exists send_email boolean not null default true,
  add column if not exists attempts integer not null default 0,
  add column if not exists scheduled_for timestamptz not null default now(),
  add column if not exists locked_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists document_id uuid references public.training_documents(id) on delete set null,
  add column if not exists last_error text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'training_document_jobs_kind_check') then
    alter table public.training_document_jobs
      add constraint training_document_jobs_kind_check
      check (document_kind in ('convocation','attestation'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'training_document_jobs_status_check') then
    alter table public.training_document_jobs
      add constraint training_document_jobs_status_check
      check (status in ('pending','processing','completed','failed','cancelled'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'training_document_jobs_generation_version_check') then
    alter table public.training_document_jobs
      add constraint training_document_jobs_generation_version_check
      check (generation_version >= 1);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'training_document_jobs_attempts_check') then
    alter table public.training_document_jobs
      add constraint training_document_jobs_attempts_check
      check (attempts between 0 and 20);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'training_document_jobs_site_fk') then
    alter table public.training_document_jobs
      add constraint training_document_jobs_site_fk
      foreign key (organization_id, site_id)
      references public.organization_sites(organization_id, id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'training_document_jobs_session_fk') then
    alter table public.training_document_jobs
      add constraint training_document_jobs_session_fk
      foreign key (organization_id, session_id)
      references public.training_sessions(organization_id, id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'training_document_jobs_trainee_fk') then
    alter table public.training_document_jobs
      add constraint training_document_jobs_trainee_fk
      foreign key (organization_id, trainee_id)
      references public.training_trainees(organization_id, id) on delete restrict;
  end if;
end
$$;

create index if not exists idx_training_document_jobs_pending
  on public.training_document_jobs(status, scheduled_for, created_at)
  where status in ('pending','processing');
create index if not exists idx_training_document_jobs_session
  on public.training_document_jobs(organization_id, session_id, document_kind, status);
create index if not exists idx_training_document_jobs_active_scope
  on public.training_document_jobs(organization_id, session_id, trainee_id, document_kind)
  where status in ('pending','processing','completed');

alter table public.training_document_jobs enable row level security;
revoke all on public.training_document_jobs from anon;
revoke all on public.training_document_jobs from authenticated;
grant select on public.training_document_jobs to authenticated;
grant select, insert, update, delete on public.training_document_jobs to service_role;

drop policy if exists training_document_jobs_select on public.training_document_jobs;
create policy training_document_jobs_select
on public.training_document_jobs for select
to authenticated
using (public.is_org_member(organization_id));

drop trigger if exists set_training_document_jobs_updated_at on public.training_document_jobs;
create trigger set_training_document_jobs_updated_at
before update on public.training_document_jobs
for each row execute procedure public.set_updated_at();

create or replace function public.claim_training_document_jobs(p_limit integer default 10)
returns setof public.training_document_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user <> 'service_role' and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Acces reserve au service de traitement.';
  end if;

  update public.training_document_jobs
  set status = 'pending',
      locked_at = null,
      updated_at = now()
  where status = 'processing'
    and locked_at < now() - interval '15 minutes';

  return query
  with candidates as (
    select id
    from public.training_document_jobs
    where status = 'pending'
      and scheduled_for <= now()
    order by scheduled_for asc, created_at asc
    limit greatest(1, least(coalesce(p_limit, 10), 50))
    for update skip locked
  )
  update public.training_document_jobs job
  set status = 'processing',
      attempts = least(coalesce(job.attempts, 0) + 1, 20),
      locked_at = now(),
      updated_at = now()
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$$;

revoke all on function public.claim_training_document_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_training_document_jobs(integer) to service_role;

create or replace function public.training_document_job_payload(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  if current_user <> 'service_role' and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Acces reserve au service de traitement.';
  end if;

  select jsonb_build_object(
    'job_id', j.id,
    'automation_key', 'training-document:' || j.id::text,
    'document_kind', j.document_kind,
    'generation_version', j.generation_version,
    'send_email', j.send_email,
    'organization_id', j.organization_id,
    'site_id', coalesce(j.site_id, s.site_id),
    'session_id', j.session_id,
    'program_id', s.program_id,
    'trainee_id', j.trainee_id,
    'session_status', s.status,
    'session_title', s.title,
    'starts_at', s.starts_at,
    'ends_at', s.ends_at,
    'location', coalesce(nullif(trim(s.location), ''), nullif(trim(site.address), '')),
    'modality', s.modality,
    'program_title', p.title,
    'program_objectives', p.objectives,
    'duration_hours', p.duration_hours,
    'trainer_name', trim(concat(coalesce(tr.first_name, ''), ' ', coalesce(tr.last_name, ''))),
    'trainee_first_name', t.first_name,
    'trainee_last_name', t.last_name,
    'trainee_email', t.email,
    'trainee_company', t.company,
    'attendance_present', coalesce(a.present_count, 0),
    'attendance_absent', coalesce(a.absent_count, 0),
    'attendance_excused', coalesce(a.excused_count, 0),
    'organization_name', coalesce(o.public_name, o.name),
    'organization_logo_url', o.logo_url,
    'organization_primary_color', o.primary_color,
    'organization_timezone', coalesce(nullif(o.timezone, ''), nullif(site.timezone, ''), 'Europe/Paris'),
    'organization_address', concat_ws(' ', o.company_address, o.company_postal_code, o.company_city),
    'organization_siret', o.company_siret,
    'organization_nda_number', o.training_nda_number,
    'organization_vat_number', o.training_vat_number,
    'organization_legal_representative', o.training_legal_representative,
    'signatory_name', coalesce(o.training_legal_representative, o.company_contact_name, o.public_name, o.name),
    'signatory_title', 'Pour l''organisme de formation',
    'contact_email', coalesce(o.training_reply_to_email, o.company_email, site.email),
    'contact_phone', coalesce(o.company_phone, site.phone),
    'document_footer', o.training_document_footer,
    'organization_signature_url', o.training_signature_url,
    'organization_stamp_url', o.training_stamp_url,
    'show_ncr_branding', coalesce(o.show_ncr_branding, true),
    'site_name', site.name,
    'site_address', concat_ws(' ', site.address, site.postal_code, site.city)
  )
  into v_payload
  from public.training_document_jobs j
  join public.training_sessions s
    on s.organization_id = j.organization_id and s.id = j.session_id
  join public.training_programs p
    on p.organization_id = s.organization_id and p.id = s.program_id
  join public.training_trainees t
    on t.organization_id = j.organization_id and t.id = j.trainee_id
  join public.organizations o
    on o.id = j.organization_id and o.business_type = 'formation'
  left join public.organization_sites site
    on site.organization_id = j.organization_id and site.id = coalesce(j.site_id, s.site_id)
  left join public.training_trainers tr
    on tr.organization_id = s.organization_id and tr.id = s.trainer_id
  left join lateral (
    select
      count(*) filter (where attendance.status = 'present')::integer as present_count,
      count(*) filter (where attendance.status = 'absent')::integer as absent_count,
      count(*) filter (where attendance.status = 'excused')::integer as excused_count
    from public.training_attendance attendance
    where attendance.organization_id = j.organization_id
      and attendance.session_id = j.session_id
      and attendance.trainee_id = j.trainee_id
  ) a on true
  where j.id = p_job_id
    and j.status = 'processing';

  if v_payload is null then
    raise exception 'Job documentaire introuvable ou non reclame.';
  end if;

  return v_payload;
end;
$$;

revoke all on function public.training_document_job_payload(uuid) from public, anon, authenticated;
grant execute on function public.training_document_job_payload(uuid) to service_role;

create or replace function public.guard_training_session_validation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     and new.status in ('scheduled','in_progress')
     and new.validated_at is null then
    new.status := 'draft';
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'draft'
     and new.status in ('scheduled','in_progress')
     and new.validated_at is null then
    raise exception 'Utilisez la validation de session pour planifier une formation.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_training_session_validation on public.training_sessions;
create trigger guard_training_session_validation
before insert or update on public.training_sessions
for each row execute procedure public.guard_training_session_validation();

create or replace function public.set_training_session_status(
  p_organization_id uuid,
  p_session_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_target_status text := p_status;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then
    raise exception 'Acces insuffisant.';
  end if;

  if v_target_status not in ('draft','scheduled','in_progress','canceled') then
    raise exception 'Utilisez la cloture securisee pour terminer une session.';
  end if;

  select status into v_current_status
  from public.training_sessions
  where organization_id = p_organization_id and id = p_session_id
  for update;

  if v_current_status is null then raise exception 'Session introuvable.'; end if;
  if v_current_status = 'completed' then raise exception 'La session est cloturee. Rouvrez-la avant de la modifier.'; end if;

  if v_current_status = 'draft' and v_target_status in ('scheduled','in_progress') then
    perform public.validate_training_session_workflow(p_organization_id, p_session_id, true);
    if v_target_status = 'in_progress' then
      update public.training_sessions
      set status = 'in_progress', updated_at = now()
      where organization_id = p_organization_id and id = p_session_id;
    end if;
    return;
  end if;

  update public.training_sessions
  set status = v_target_status, updated_at = now()
  where organization_id = p_organization_id and id = p_session_id;
end;
$$;

revoke all on function public.set_training_session_status(uuid,uuid,text) from public;
grant execute on function public.set_training_session_status(uuid,uuid,text) to authenticated;

create or replace function public.training_automation_integrity_report(
  p_organization_id uuid,
  p_session_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'Acces refuse.';
  end if;

  if not exists (
    select 1 from public.organizations
    where id = p_organization_id and business_type = 'formation'
  ) then
    raise exception 'Espace Formation introuvable.';
  end if;

  return jsonb_build_object(
    'release', '2.15.3',
    'organization_id', p_organization_id,
    'session_id', p_session_id,
    'checked_at', now(),
    'document_job_api_ready',
      to_regclass('public.training_document_jobs') is not null
      and to_regprocedure('public.claim_training_document_jobs(integer)') is not null
      and to_regprocedure('public.training_document_job_payload(uuid)') is not null,
    'draft_sessions_with_document_jobs', (
      select count(*)::integer
      from public.training_sessions s
      where s.organization_id = p_organization_id
        and (p_session_id is null or s.id = p_session_id)
        and s.status = 'draft'
        and exists (
          select 1 from public.training_document_jobs j
          where j.organization_id = s.organization_id
            and j.session_id = s.id
            and j.status in ('pending','processing','completed')
        )
    ),
    'scheduled_without_initial_evaluation', (
      select count(*)::integer
      from public.training_session_enrollments e
      join public.training_sessions s
        on s.organization_id = e.organization_id and s.id = e.session_id
      join public.organizations o on o.id = e.organization_id
      where e.organization_id = p_organization_id
        and (p_session_id is null or e.session_id = p_session_id)
        and e.status <> 'canceled'
        and s.status in ('scheduled','in_progress')
        and public.organization_has_plan_feature(e.organization_id, 'training_satisfaction')
        and coalesce(o.training_initial_evaluation_enabled, true)
        and not exists (
          select 1 from public.training_satisfaction_surveys q
          where q.organization_id = e.organization_id
            and q.session_id = e.session_id
            and q.trainee_id = e.trainee_id
            and q.evaluation_type = 'initial'
            and q.status <> 'cancelled'
        )
    ),
    'completed_without_final_evaluation', (
      select count(*)::integer
      from public.training_session_enrollments e
      join public.training_sessions s
        on s.organization_id = e.organization_id and s.id = e.session_id
      join public.organizations o on o.id = e.organization_id
      where e.organization_id = p_organization_id
        and (p_session_id is null or e.session_id = p_session_id)
        and e.status <> 'canceled'
        and s.status = 'completed'
        and public.organization_has_plan_feature(e.organization_id, 'training_satisfaction')
        and coalesce(o.training_satisfaction_enabled, true)
        and not exists (
          select 1 from public.training_satisfaction_surveys q
          where q.organization_id = e.organization_id
            and q.session_id = e.session_id
            and q.trainee_id = e.trainee_id
            and q.evaluation_type = 'final'
            and q.status <> 'cancelled'
        )
    ),
    'completed_without_attestation_document', (
      select count(*)::integer
      from public.training_session_enrollments e
      join public.training_sessions s
        on s.organization_id = e.organization_id and s.id = e.session_id
      where e.organization_id = p_organization_id
        and (p_session_id is null or e.session_id = p_session_id)
        and e.status <> 'canceled'
        and s.status = 'completed'
        and public.organization_has_plan_feature(e.organization_id, 'training_automatic_certificates')
        and not exists (
          select 1 from public.training_documents d
          where d.organization_id = e.organization_id
            and d.session_id = e.session_id
            and d.trainee_id = e.trainee_id
            and d.category = 'attestation'
            and d.status <> 'archived'
        )
    ),
    'pending_document_jobs', (
      select count(*)::integer
      from public.training_document_jobs j
      where j.organization_id = p_organization_id
        and (p_session_id is null or j.session_id = p_session_id)
        and j.status in ('pending','processing')
    ),
    'failed_document_jobs', (
      select count(*)::integer
      from public.training_document_jobs j
      where j.organization_id = p_organization_id
        and (p_session_id is null or j.session_id = p_session_id)
        and j.status = 'failed'
    )
  );
end;
$$;

revoke all on function public.training_automation_integrity_report(uuid,uuid) from public, anon;
grant execute on function public.training_automation_integrity_report(uuid,uuid) to authenticated;

insert into public.platform_release_state (
  singleton,
  database_version,
  expected_frontend_version,
  expected_pwa_cache,
  installed_at,
  installed_by,
  notes
) values (
  true,
  '2.15.3',
  '2.15.3',
  'ncr-suite-shell-v2.15.3-training-automation-integrity',
  now(),
  auth.uid(),
  'Formation V2.15.3 : file documentaire autonome, payload service-role, garde anti-contournement de validation et rapport d''integrite.'
)
on conflict (singleton) do update
set database_version = excluded.database_version,
    expected_frontend_version = excluded.expected_frontend_version,
    expected_pwa_cache = excluded.expected_pwa_cache,
    installed_at = excluded.installed_at,
    installed_by = excluded.installed_by,
    notes = excluded.notes;

commit;

select pg_notify('pgrst', 'reload schema');
