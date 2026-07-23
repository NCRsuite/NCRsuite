-- NCR Suite V2.15.2 — Formation · Déroulement et clôture automatisés
-- À exécuter après 072_training_session_creation_hotfix.sql.
-- Ajoute les évaluations initiales et finales, les relances Brevo,
-- l'envoi automatique des attestations et la finalisation du dossier complet.

begin;

alter table public.organizations
  add column if not exists training_initial_evaluation_enabled boolean not null default true,
  add column if not exists training_initial_evaluation_lead_hours integer not null default 24,
  add column if not exists training_initial_evaluation_intro text,
  add column if not exists training_evaluation_reminder_enabled boolean not null default true,
  add column if not exists training_evaluation_reminder_delay_hours integer not null default 24,
  add column if not exists training_evaluation_reminder_max_count integer not null default 2,
  add column if not exists training_attestation_auto_send boolean not null default true,
  add column if not exists training_attestation_requires_final_evaluation boolean not null default true;

alter table public.organizations
  drop constraint if exists organizations_training_initial_evaluation_lead_check,
  add constraint organizations_training_initial_evaluation_lead_check
    check (training_initial_evaluation_lead_hours between 0 and 336),
  drop constraint if exists organizations_training_initial_evaluation_intro_check,
  add constraint organizations_training_initial_evaluation_intro_check
    check (training_initial_evaluation_intro is null or char_length(training_initial_evaluation_intro) <= 1200),
  drop constraint if exists organizations_training_evaluation_reminder_delay_check,
  add constraint organizations_training_evaluation_reminder_delay_check
    check (training_evaluation_reminder_delay_hours between 1 and 336),
  drop constraint if exists organizations_training_evaluation_reminder_max_check,
  add constraint organizations_training_evaluation_reminder_max_check
    check (training_evaluation_reminder_max_count between 0 and 5);

alter table public.training_sessions
  add column if not exists delivery_completed_at timestamptz,
  add column if not exists closure_automation_started_at timestamptz,
  add column if not exists training_dossier_finalized_at timestamptz,
  add column if not exists training_dossier_finalized_by uuid references auth.users(id) on delete set null,
  add column if not exists training_dossier_auto_completed boolean not null default false;

-- Les dossiers déjà clôturés avant cette version restent considérés comme finalisés.
update public.training_sessions
set delivery_completed_at = coalesce(delivery_completed_at, closed_at, updated_at, ends_at),
    training_dossier_finalized_at = coalesce(training_dossier_finalized_at, closed_at, updated_at, ends_at),
    training_dossier_auto_completed = true
where status = 'completed'
  and training_dossier_finalized_at is null;

alter table public.training_satisfaction_surveys
  add column if not exists evaluation_type text not null default 'final',
  add column if not exists initial_level smallint,
  add column if not exists initial_expectations text,
  add column if not exists initial_objectives text,
  add column if not exists initial_needs text,
  add column if not exists reminder_count integer not null default 0,
  add column if not exists last_reminded_at timestamptz;

alter table public.training_satisfaction_surveys
  drop constraint if exists training_satisfaction_evaluation_type_check,
  add constraint training_satisfaction_evaluation_type_check
    check (evaluation_type in ('initial','final')),
  drop constraint if exists training_satisfaction_initial_level_check,
  add constraint training_satisfaction_initial_level_check
    check (initial_level is null or initial_level between 1 and 5),
  drop constraint if exists training_satisfaction_initial_expectations_check,
  add constraint training_satisfaction_initial_expectations_check
    check (initial_expectations is null or char_length(initial_expectations) <= 3000),
  drop constraint if exists training_satisfaction_initial_objectives_check,
  add constraint training_satisfaction_initial_objectives_check
    check (initial_objectives is null or char_length(initial_objectives) <= 3000),
  drop constraint if exists training_satisfaction_initial_needs_check,
  add constraint training_satisfaction_initial_needs_check
    check (initial_needs is null or char_length(initial_needs) <= 3000),
  drop constraint if exists training_satisfaction_reminder_count_check,
  add constraint training_satisfaction_reminder_count_check
    check (reminder_count between 0 and 10);

alter table public.training_satisfaction_surveys
  drop constraint if exists training_satisfaction_surveys_organization_id_session_id_trainee_id_key;

drop index if exists public.training_satisfaction_surveys_organization_id_session_id_trainee_id_key;
create unique index if not exists uq_training_evaluation_per_trainee
  on public.training_satisfaction_surveys(organization_id, session_id, trainee_id, evaluation_type);
create index if not exists idx_training_evaluation_type_status
  on public.training_satisfaction_surveys(organization_id, session_id, evaluation_type, status);

create or replace function public.update_training_evaluation_settings(
  p_organization_id uuid,
  p_initial_enabled boolean,
  p_initial_lead_hours integer,
  p_initial_intro text,
  p_final_enabled boolean,
  p_final_delay_hours integer,
  p_final_intro text,
  p_reminder_enabled boolean,
  p_reminder_delay_hours integer,
  p_reminder_max_count integer,
  p_attestation_auto_send boolean,
  p_attestation_requires_final boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;
  if not exists (select 1 from public.organizations where id = p_organization_id and business_type = 'formation') then
    raise exception 'Espace Formation introuvable.';
  end if;
  if coalesce(p_initial_lead_hours, 24) not between 0 and 336 then
    raise exception 'Le délai de l’évaluation initiale doit être compris entre 0 et 336 heures.';
  end if;
  if coalesce(p_final_delay_hours, 0) not between 0 and 168 then
    raise exception 'Le délai de l’évaluation finale doit être compris entre 0 et 168 heures.';
  end if;
  if coalesce(p_reminder_delay_hours, 24) not between 1 and 336 then
    raise exception 'Le délai de relance doit être compris entre 1 et 336 heures.';
  end if;
  if coalesce(p_reminder_max_count, 2) not between 0 and 5 then
    raise exception 'Le nombre de relances doit être compris entre 0 et 5.';
  end if;

  update public.organizations
  set training_initial_evaluation_enabled = coalesce(p_initial_enabled, true),
      training_initial_evaluation_lead_hours = coalesce(p_initial_lead_hours, 24),
      training_initial_evaluation_intro = nullif(trim(coalesce(p_initial_intro, '')), ''),
      training_satisfaction_enabled = coalesce(p_final_enabled, true),
      training_satisfaction_delay_hours = coalesce(p_final_delay_hours, 0),
      training_satisfaction_intro = nullif(trim(coalesce(p_final_intro, '')), ''),
      training_evaluation_reminder_enabled = coalesce(p_reminder_enabled, true),
      training_evaluation_reminder_delay_hours = coalesce(p_reminder_delay_hours, 24),
      training_evaluation_reminder_max_count = coalesce(p_reminder_max_count, 2),
      training_attestation_auto_send = coalesce(p_attestation_auto_send, true),
      training_attestation_requires_final_evaluation = coalesce(p_attestation_requires_final, true),
      updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.evaluation_settings_updated', 'organization', p_organization_id::text,
    jsonb_build_object(
      'initial_enabled', coalesce(p_initial_enabled, true),
      'initial_lead_hours', coalesce(p_initial_lead_hours, 24),
      'final_enabled', coalesce(p_final_enabled, true),
      'final_delay_hours', coalesce(p_final_delay_hours, 0),
      'reminder_enabled', coalesce(p_reminder_enabled, true),
      'reminder_delay_hours', coalesce(p_reminder_delay_hours, 24),
      'reminder_max_count', coalesce(p_reminder_max_count, 2),
      'attestation_auto_send', coalesce(p_attestation_auto_send, true),
      'attestation_requires_final', coalesce(p_attestation_requires_final, true)
    )
  );
end;
$$;

revoke all on function public.update_training_evaluation_settings(uuid,boolean,integer,text,boolean,integer,text,boolean,integer,integer,boolean,boolean) from public, anon;
grant execute on function public.update_training_evaluation_settings(uuid,boolean,integer,text,boolean,integer,text,boolean,integer,integer,boolean,boolean) to authenticated;

-- Compatibilité avec l'ancien écran de réglage.
create or replace function public.update_training_satisfaction_settings(
  p_organization_id uuid,
  p_enabled boolean,
  p_delay_hours integer,
  p_intro text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.update_training_evaluation_settings(
    p_organization_id,
    (select training_initial_evaluation_enabled from public.organizations where id = p_organization_id),
    (select training_initial_evaluation_lead_hours from public.organizations where id = p_organization_id),
    (select training_initial_evaluation_intro from public.organizations where id = p_organization_id),
    p_enabled,
    p_delay_hours,
    p_intro,
    (select training_evaluation_reminder_enabled from public.organizations where id = p_organization_id),
    (select training_evaluation_reminder_delay_hours from public.organizations where id = p_organization_id),
    (select training_evaluation_reminder_max_count from public.organizations where id = p_organization_id),
    (select training_attestation_auto_send from public.organizations where id = p_organization_id),
    (select training_attestation_requires_final_evaluation from public.organizations where id = p_organization_id)
  );
end;
$$;

create or replace function public.training_satisfaction_email_payload(p_survey_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'survey_id', q.id,
    'survey_token', q.public_token,
    'evaluation_type', q.evaluation_type,
    'reminder_count', q.reminder_count,
    'organization_name', coalesce(o.public_name, o.name),
    'organization_primary_color', o.primary_color,
    'organization_logo_url', o.logo_url,
    'organization_timezone', o.timezone,
    'show_ncr_branding', coalesce(o.show_ncr_branding, true),
    'contact_email', coalesce(o.training_reply_to_email, o.company_email, o.booking_contact_email),
    'contact_phone', coalesce(o.company_phone, o.booking_contact_phone),
    'intro_text', case when q.evaluation_type = 'initial' then o.training_initial_evaluation_intro else o.training_satisfaction_intro end,
    'session_title', s.title,
    'starts_at', s.starts_at,
    'ends_at', s.ends_at,
    'program_title', p.title,
    'trainer_name', nullif(trim(concat_ws(' ', tr.first_name, tr.last_name)), ''),
    'trainee_name', trim(concat_ws(' ', t.first_name, t.last_name)),
    'trainee_first_name', t.first_name,
    'trainee_email', t.email
  )
  from public.training_satisfaction_surveys q
  join public.organizations o on o.id = q.organization_id
  join public.training_sessions s on s.organization_id = q.organization_id and s.id = q.session_id
  join public.training_programs p on p.organization_id = s.organization_id and p.id = s.program_id
  join public.training_trainees t on t.organization_id = q.organization_id and t.id = q.trainee_id
  left join public.training_trainers tr on tr.organization_id = s.organization_id and tr.id = s.trainer_id
  where q.id = p_survey_id;
$$;

revoke all on function public.training_satisfaction_email_payload(uuid) from public, anon, authenticated;
grant execute on function public.training_satisfaction_email_payload(uuid) to service_role;

create or replace function public.enqueue_training_evaluation_internal(
  p_organization_id uuid,
  p_session_id uuid,
  p_trainee_id uuid,
  p_evaluation_type text,
  p_send_email boolean default true,
  p_force boolean default false,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_survey_id uuid;
  v_site_id uuid;
  v_status text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_delay integer;
  v_enabled boolean;
  v_email text;
  v_name text;
  v_payload jsonb;
  v_scheduled_for timestamptz;
  v_existing_status text;
begin
  if p_evaluation_type not in ('initial','final') then raise exception 'Type d’évaluation invalide.'; end if;

  select s.site_id, s.status, s.starts_at, s.ends_at,
         case when p_evaluation_type = 'initial' then o.training_initial_evaluation_lead_hours else o.training_satisfaction_delay_hours end,
         case when p_evaluation_type = 'initial' then o.training_initial_evaluation_enabled else o.training_satisfaction_enabled end,
         lower(trim(coalesce(t.email, ''))), trim(concat_ws(' ', t.first_name, t.last_name))
  into v_site_id, v_status, v_starts_at, v_ends_at, v_delay, v_enabled, v_email, v_name
  from public.training_sessions s
  join public.organizations o on o.id = s.organization_id
  join public.training_session_enrollments e
    on e.organization_id = s.organization_id and e.session_id = s.id and e.trainee_id = p_trainee_id
  join public.training_trainees t
    on t.organization_id = e.organization_id and t.id = e.trainee_id
  where s.organization_id = p_organization_id
    and s.id = p_session_id
    and e.status <> 'canceled'
    and t.status <> 'archived';

  if v_status is null then raise exception 'Session ou stagiaire introuvable.'; end if;
  if p_evaluation_type = 'initial' and v_status not in ('scheduled','in_progress') then
    raise exception 'La session doit être validée avant l’évaluation initiale.';
  end if;
  if p_evaluation_type = 'final' and v_status <> 'completed' then
    raise exception 'La session doit être terminée avant l’évaluation finale.';
  end if;
  if not coalesce(v_enabled, true) and not p_force then return null; end if;

  v_scheduled_for := case
    when p_evaluation_type = 'initial' then greatest(now(), v_starts_at - make_interval(hours => coalesce(v_delay, 24)))
    else greatest(now(), v_ends_at + make_interval(hours => coalesce(v_delay, 0)))
  end;

  select status into v_existing_status
  from public.training_satisfaction_surveys
  where organization_id = p_organization_id
    and session_id = p_session_id
    and trainee_id = p_trainee_id
    and evaluation_type = p_evaluation_type;

  insert into public.training_satisfaction_surveys (
    organization_id, site_id, session_id, trainee_id, evaluation_type, status, scheduled_for, created_by,
    emailed_at, completed_at, content_rating, trainer_rating, organization_rating, objectives_rating,
    recommend, comment, improvement, initial_level, initial_expectations, initial_objectives, initial_needs,
    reminder_count, last_reminded_at
  ) values (
    p_organization_id, v_site_id, p_session_id, p_trainee_id, p_evaluation_type, 'pending', v_scheduled_for, p_created_by,
    null, null, null, null, null, null, null, null, null, null, null, null, null, 0, null
  )
  on conflict (organization_id, session_id, trainee_id, evaluation_type)
  do update set
    scheduled_for = case when public.training_satisfaction_surveys.status = 'completed' then public.training_satisfaction_surveys.scheduled_for else excluded.scheduled_for end,
    status = case when public.training_satisfaction_surveys.status = 'completed' then 'completed' else 'pending' end,
    emailed_at = case when public.training_satisfaction_surveys.status = 'completed' then public.training_satisfaction_surveys.emailed_at else case when p_force then null else public.training_satisfaction_surveys.emailed_at end end,
    reminder_count = case when public.training_satisfaction_surveys.status = 'completed' then public.training_satisfaction_surveys.reminder_count else case when p_force then 0 else public.training_satisfaction_surveys.reminder_count end end,
    last_reminded_at = case when p_force and public.training_satisfaction_surveys.status <> 'completed' then null else public.training_satisfaction_surveys.last_reminded_at end,
    updated_at = now()
  returning id, status into v_survey_id, v_existing_status;

  if p_send_email
     and v_existing_status <> 'completed'
     and v_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    select public.training_satisfaction_email_payload(v_survey_id) into v_payload;
    v_payload := v_payload || jsonb_build_object('is_reminder', false);

    insert into public.email_outbox (
      organization_id, template_key, recipient_email, recipient_name, payload,
      dedupe_key, status, scheduled_for, attempts, locked_at, sent_at,
      provider_message_id, last_error
    ) values (
      p_organization_id, 'training_satisfaction_request', v_email, nullif(v_name, ''), v_payload,
      'training-evaluation:' || v_survey_id::text || ':request',
      'pending', greatest(v_scheduled_for, now()), 0, null, null, null, null
    )
    on conflict (dedupe_key) do update
    set recipient_email = excluded.recipient_email,
        recipient_name = excluded.recipient_name,
        payload = excluded.payload,
        scheduled_for = excluded.scheduled_for,
        status = case when p_force or public.email_outbox.status in ('failed','cancelled') then 'pending' else public.email_outbox.status end,
        attempts = case when p_force then 0 else public.email_outbox.attempts end,
        locked_at = case when p_force then null else public.email_outbox.locked_at end,
        sent_at = case when p_force then null else public.email_outbox.sent_at end,
        provider_message_id = case when p_force then null else public.email_outbox.provider_message_id end,
        last_error = case when p_force then null else public.email_outbox.last_error end,
        updated_at = now();
  end if;

  return v_survey_id;
end;
$$;

revoke all on function public.enqueue_training_evaluation_internal(uuid,uuid,uuid,text,boolean,boolean,uuid) from public, anon, authenticated;

-- Ancienne fonction conservée pour les appels historiques de satisfaction finale.
create or replace function public.enqueue_training_satisfaction_internal(
  p_organization_id uuid,
  p_session_id uuid,
  p_trainee_id uuid,
  p_send_email boolean default true,
  p_force boolean default false,
  p_created_by uuid default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.enqueue_training_evaluation_internal(
    p_organization_id, p_session_id, p_trainee_id, 'final', p_send_email, p_force, p_created_by
  );
$$;

revoke all on function public.enqueue_training_satisfaction_internal(uuid,uuid,uuid,boolean,boolean,uuid) from public, anon, authenticated;

create or replace function public.queue_training_session_evaluation(
  p_organization_id uuid,
  p_session_id uuid,
  p_evaluation_type text,
  p_send_email boolean default true,
  p_force boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainee record;
  v_queued integer := 0;
  v_without_email integer := 0;
  v_completed integer := 0;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then
    raise exception 'Accès insuffisant.';
  end if;
  if p_evaluation_type not in ('initial','final') then raise exception 'Type d’évaluation invalide.'; end if;

  if not exists (
    select 1 from public.training_sessions
    where organization_id = p_organization_id and id = p_session_id
      and ((p_evaluation_type = 'initial' and status in ('scheduled','in_progress'))
        or (p_evaluation_type = 'final' and status = 'completed'))
  ) then
    raise exception case when p_evaluation_type = 'initial'
      then 'La session doit être validée avant l’envoi de l’évaluation initiale.'
      else 'La session doit être terminée avant l’envoi de l’évaluation finale.' end;
  end if;

  for v_trainee in
    select t.id, t.email
    from public.training_session_enrollments e
    join public.training_trainees t on t.organization_id = e.organization_id and t.id = e.trainee_id
    where e.organization_id = p_organization_id
      and e.session_id = p_session_id
      and e.status <> 'canceled'
      and t.status <> 'archived'
  loop
    if exists (
      select 1 from public.training_satisfaction_surveys q
      where q.organization_id = p_organization_id and q.session_id = p_session_id
        and q.trainee_id = v_trainee.id and q.evaluation_type = p_evaluation_type and q.status = 'completed'
    ) then
      v_completed := v_completed + 1;
    else
      perform public.enqueue_training_evaluation_internal(
        p_organization_id, p_session_id, v_trainee.id, p_evaluation_type, p_send_email, p_force, auth.uid()
      );
      v_queued := v_queued + 1;
    end if;
    if nullif(trim(coalesce(v_trainee.email, '')), '') is null then v_without_email := v_without_email + 1; end if;
  end loop;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.evaluation_queued', 'training_session', p_session_id::text,
    jsonb_build_object('evaluation_type', p_evaluation_type, 'queued', v_queued, 'already_completed', v_completed, 'without_email', v_without_email, 'forced', p_force)
  );

  return jsonb_build_object('queued', v_queued, 'already_completed', v_completed, 'without_email', v_without_email, 'evaluation_type', p_evaluation_type);
end;
$$;

revoke all on function public.queue_training_session_evaluation(uuid,uuid,text,boolean,boolean) from public, anon;
grant execute on function public.queue_training_session_evaluation(uuid,uuid,text,boolean,boolean) to authenticated;

create or replace function public.queue_training_session_satisfaction(
  p_organization_id uuid,
  p_session_id uuid,
  p_send_email boolean default true,
  p_force boolean default true
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.queue_training_session_evaluation(p_organization_id, p_session_id, 'final', p_send_email, p_force);
$$;

revoke all on function public.queue_training_session_satisfaction(uuid,uuid,boolean,boolean) from public, anon;
grant execute on function public.queue_training_session_satisfaction(uuid,uuid,boolean,boolean) to authenticated;

create or replace function public.get_public_training_satisfaction(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'survey_id', q.id,
    'status', q.status,
    'evaluation_type', q.evaluation_type,
    'organization_name', coalesce(o.public_name, o.name),
    'organization_logo_url', o.logo_url,
    'organization_primary_color', o.primary_color,
    'show_ncr_branding', coalesce(o.show_ncr_branding, true),
    'intro_text', case when q.evaluation_type = 'initial' then o.training_initial_evaluation_intro else o.training_satisfaction_intro end,
    'session_title', s.title,
    'program_title', p.title,
    'starts_at', s.starts_at,
    'ends_at', s.ends_at,
    'trainer_name', nullif(trim(concat_ws(' ', tr.first_name, tr.last_name)), ''),
    'trainee_first_name', t.first_name,
    'completed_at', q.completed_at
  )
  from public.training_satisfaction_surveys q
  join public.organizations o on o.id = q.organization_id
  join public.training_sessions s on s.organization_id = q.organization_id and s.id = q.session_id
  join public.training_programs p on p.organization_id = s.organization_id and p.id = s.program_id
  join public.training_trainees t on t.organization_id = q.organization_id and t.id = q.trainee_id
  left join public.training_trainers tr on tr.organization_id = s.organization_id and tr.id = s.trainer_id
  where q.public_token = trim(coalesce(p_token, ''))
    and q.status in ('pending','sent','completed');
$$;

create or replace function public.queue_training_attestation_internal(
  p_organization_id uuid,
  p_session_id uuid,
  p_trainee_id uuid,
  p_send_email boolean default true,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
  v_site_id uuid;
  v_version integer;
begin
  select site_id into v_site_id
  from public.training_sessions
  where organization_id = p_organization_id and id = p_session_id and status = 'completed';
  if not found then raise exception 'La session doit être terminée avant l’attestation.'; end if;

  if not exists (
    select 1 from public.training_session_enrollments
    where organization_id = p_organization_id and session_id = p_session_id and trainee_id = p_trainee_id and status <> 'canceled'
  ) then raise exception 'Stagiaire non inscrit à la session.'; end if;

  select id into v_job_id
  from public.training_document_jobs
  where organization_id = p_organization_id and session_id = p_session_id and trainee_id = p_trainee_id
    and document_kind = 'attestation' and status in ('pending','processing','completed')
  order by generation_version desc limit 1;
  if v_job_id is not null then return v_job_id; end if;

  select coalesce(max(generation_version), 0) + 1 into v_version
  from public.training_document_jobs
  where organization_id = p_organization_id and session_id = p_session_id and trainee_id = p_trainee_id and document_kind = 'attestation';

  insert into public.training_document_jobs (
    organization_id, site_id, session_id, trainee_id, document_kind,
    generation_version, send_email, status, attempts, scheduled_for, created_by
  ) values (
    p_organization_id, v_site_id, p_session_id, p_trainee_id, 'attestation',
    v_version, p_send_email, 'pending', 0, now(), p_created_by
  ) returning id into v_job_id;

  return v_job_id;
end;
$$;

revoke all on function public.queue_training_attestation_internal(uuid,uuid,uuid,boolean,uuid) from public, anon, authenticated;
grant execute on function public.queue_training_attestation_internal(uuid,uuid,uuid,boolean,uuid) to service_role;

create or replace function public.refresh_training_session_dossier_completion(
  p_organization_id uuid,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.training_sessions%rowtype;
  v_org public.organizations%rowtype;
  v_enrollments integer := 0;
  v_expected_attendance integer := 0;
  v_completed_attendance integer := 0;
  v_initial_completed integer := 0;
  v_final_completed integer := 0;
  v_attestations integer := 0;
  v_initial_required boolean := false;
  v_final_required boolean := false;
  v_attestation_required boolean := false;
  v_attendance_required boolean := false;
  v_ready boolean := false;
  v_blockers jsonb := '[]'::jsonb;
  v_timezone text := 'Europe/Paris';
begin
  select * into v_session from public.training_sessions
  where organization_id = p_organization_id and id = p_session_id;
  if v_session.id is null then raise exception 'Session introuvable.'; end if;
  select * into v_org from public.organizations where id = p_organization_id;
  v_timezone := coalesce(v_org.timezone, 'Europe/Paris');

  select count(*)::integer into v_enrollments
  from public.training_session_enrollments
  where organization_id = p_organization_id and session_id = p_session_id and status <> 'canceled';

  v_attendance_required := public.organization_has_plan_feature(p_organization_id, 'training_digital_attendance');
  v_initial_required := public.organization_has_plan_feature(p_organization_id, 'training_satisfaction') and coalesce(v_org.training_initial_evaluation_enabled, true);
  v_final_required := public.organization_has_plan_feature(p_organization_id, 'training_satisfaction') and coalesce(v_org.training_satisfaction_enabled, true);
  v_attestation_required := public.organization_has_plan_feature(p_organization_id, 'training_automatic_certificates') and coalesce(v_org.training_attestation_auto_send, true);

  if v_attendance_required and v_enrollments > 0 then
    select count(*)::integer into v_expected_attendance
    from public.training_session_enrollments e
    cross join generate_series(
      (v_session.starts_at at time zone v_timezone)::date,
      (v_session.ends_at at time zone v_timezone)::date,
      interval '1 day'
    ) attendance_day
    cross join (values ('morning'::text), ('afternoon'::text)) periods(period)
    where e.organization_id = p_organization_id and e.session_id = p_session_id and e.status <> 'canceled';

    select count(*)::integer into v_completed_attendance
    from public.training_attendance a
    join public.training_session_enrollments e
      on e.organization_id = a.organization_id and e.session_id = a.session_id and e.trainee_id = a.trainee_id and e.status <> 'canceled'
    where a.organization_id = p_organization_id and a.session_id = p_session_id
      and a.status in ('present','absent','excused');
  end if;

  select count(*) filter (where evaluation_type = 'initial' and status = 'completed')::integer,
         count(*) filter (where evaluation_type = 'final' and status = 'completed')::integer
  into v_initial_completed, v_final_completed
  from public.training_satisfaction_surveys
  where organization_id = p_organization_id and session_id = p_session_id;

  select count(*)::integer into v_attestations
  from public.training_documents
  where organization_id = p_organization_id and session_id = p_session_id
    and category = 'attestation' and status <> 'archived';

  if v_session.status <> 'completed' then v_blockers := v_blockers || jsonb_build_array('La session n’est pas terminée.'); end if;
  if v_enrollments = 0 then v_blockers := v_blockers || jsonb_build_array('Aucun stagiaire actif.'); end if;
  if v_attendance_required and v_completed_attendance < v_expected_attendance then
    v_blockers := v_blockers || jsonb_build_array(format('%s émargement(s) restent à compléter.', greatest(v_expected_attendance - v_completed_attendance, 0)));
  end if;
  if v_initial_required and v_initial_completed < v_enrollments then
    v_blockers := v_blockers || jsonb_build_array(format('%s évaluation(s) initiale(s) restent à compléter.', greatest(v_enrollments - v_initial_completed, 0)));
  end if;
  if v_final_required and v_final_completed < v_enrollments then
    v_blockers := v_blockers || jsonb_build_array(format('%s évaluation(s) finale(s) restent à compléter.', greatest(v_enrollments - v_final_completed, 0)));
  end if;
  if v_attestation_required and v_attestations < v_enrollments then
    v_blockers := v_blockers || jsonb_build_array(format('%s attestation(s) restent à générer.', greatest(v_enrollments - v_attestations, 0)));
  end if;

  v_ready := jsonb_array_length(v_blockers) = 0;
  perform set_config('ncr.allow_training_session_finalize', '1', true);
  update public.training_sessions
  set training_dossier_finalized_at = case when v_ready then coalesce(training_dossier_finalized_at, now()) else null end,
      training_dossier_finalized_by = case when v_ready then coalesce(training_dossier_finalized_by, auth.uid()) else null end,
      training_dossier_auto_completed = v_ready,
      updated_at = now()
  where organization_id = p_organization_id and id = p_session_id;

  return jsonb_build_object(
    'ready', v_ready,
    'blockers', v_blockers,
    'enrollments', v_enrollments,
    'attendance_completed', v_completed_attendance,
    'attendance_expected', v_expected_attendance,
    'initial_completed', v_initial_completed,
    'final_completed', v_final_completed,
    'attestations', v_attestations,
    'finalized_at', case when v_ready then coalesce(v_session.training_dossier_finalized_at, now()) else null end
  );
end;
$$;

revoke all on function public.refresh_training_session_dossier_completion(uuid,uuid) from public, anon;
grant execute on function public.refresh_training_session_dossier_completion(uuid,uuid) to authenticated, service_role;

create or replace function public.submit_public_training_evaluation(
  p_token text,
  p_initial_level integer default null,
  p_initial_expectations text default null,
  p_initial_objectives text default null,
  p_initial_needs text default null,
  p_content_rating integer default null,
  p_trainer_rating integer default null,
  p_organization_rating integer default null,
  p_objectives_rating integer default null,
  p_recommend boolean default null,
  p_comment text default null,
  p_improvement text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_survey public.training_satisfaction_surveys%rowtype;
  v_org public.organizations%rowtype;
begin
  select * into v_survey
  from public.training_satisfaction_surveys
  where public_token = trim(coalesce(p_token, ''))
  for update;

  if v_survey.id is null then raise exception 'Questionnaire introuvable.'; end if;
  if v_survey.status = 'completed' then return jsonb_build_object('completed', true, 'already_completed', true, 'evaluation_type', v_survey.evaluation_type); end if;
  if v_survey.status not in ('pending','sent') then raise exception 'Ce questionnaire n’est plus disponible.'; end if;

  if v_survey.evaluation_type = 'initial' then
    if p_initial_level not between 1 and 5 then raise exception 'Indique ton niveau actuel entre 1 et 5.'; end if;
    if nullif(trim(coalesce(p_initial_expectations, '')), '') is null then raise exception 'Indique tes attentes principales.'; end if;
    update public.training_satisfaction_surveys
    set status = 'completed', completed_at = now(), initial_level = p_initial_level,
        initial_expectations = nullif(trim(coalesce(p_initial_expectations, '')), ''),
        initial_objectives = nullif(trim(coalesce(p_initial_objectives, '')), ''),
        initial_needs = nullif(trim(coalesce(p_initial_needs, '')), ''), updated_at = now()
    where id = v_survey.id;
  else
    if p_content_rating not between 1 and 5 or p_trainer_rating not between 1 and 5
       or p_organization_rating not between 1 and 5 or p_objectives_rating not between 1 and 5 then
      raise exception 'Toutes les notes doivent être comprises entre 1 et 5.';
    end if;
    if p_recommend is null then raise exception 'Indique si tu recommanderais cette formation.'; end if;
    update public.training_satisfaction_surveys
    set status = 'completed', completed_at = now(), content_rating = p_content_rating,
        trainer_rating = p_trainer_rating, organization_rating = p_organization_rating,
        objectives_rating = p_objectives_rating, recommend = p_recommend,
        comment = nullif(trim(coalesce(p_comment, '')), ''),
        improvement = nullif(trim(coalesce(p_improvement, '')), ''), updated_at = now()
    where id = v_survey.id;

    select * into v_org from public.organizations where id = v_survey.organization_id;
    if coalesce(v_org.training_attestation_auto_send, true)
       and coalesce(v_org.training_attestation_requires_final_evaluation, true)
       and exists (select 1 from public.training_sessions where organization_id = v_survey.organization_id and id = v_survey.session_id and status = 'completed') then
      perform public.queue_training_attestation_internal(v_survey.organization_id, v_survey.session_id, v_survey.trainee_id, true, null);
    end if;
  end if;

  perform public.refresh_training_session_dossier_completion(v_survey.organization_id, v_survey.session_id);
  return jsonb_build_object('completed', true, 'already_completed', false, 'evaluation_type', v_survey.evaluation_type);
end;
$$;

revoke all on function public.submit_public_training_evaluation(text,integer,text,text,text,integer,integer,integer,integer,boolean,text,text) from public;
grant execute on function public.submit_public_training_evaluation(text,integer,text,text,text,integer,integer,integer,integer,boolean,text,text) to anon, authenticated;

create or replace function public.submit_public_training_satisfaction(
  p_token text,
  p_content_rating integer,
  p_trainer_rating integer,
  p_organization_rating integer,
  p_objectives_rating integer,
  p_recommend boolean,
  p_comment text,
  p_improvement text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.submit_public_training_evaluation(
    p_token, null, null, null, null,
    p_content_rating, p_trainer_rating, p_organization_rating, p_objectives_rating,
    p_recommend, p_comment, p_improvement
  );
$$;

create or replace function public.training_evaluation_summary(
  p_organization_id uuid,
  p_site_id uuid default null,
  p_session_id uuid default null,
  p_evaluation_type text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then raise exception 'Accès refusé.'; end if;
  if p_evaluation_type is not null and p_evaluation_type not in ('initial','final') then raise exception 'Type d’évaluation invalide.'; end if;

  select jsonb_build_object(
    'total', count(*),
    'completed', count(*) filter (where q.status = 'completed'),
    'pending', count(*) filter (where q.status in ('pending','sent')),
    'response_rate', case when count(*) = 0 then 0 else round((count(*) filter (where q.status = 'completed'))::numeric * 100 / count(*), 1) end,
    'average_rating', round(avg(
      case when q.evaluation_type = 'initial' then q.initial_level::numeric
           else ((q.content_rating + q.trainer_rating + q.organization_rating + q.objectives_rating)::numeric / 4) end
    ) filter (where q.status = 'completed'), 2),
    'recommendation_rate', case
      when count(*) filter (where q.evaluation_type = 'final' and q.status = 'completed' and q.recommend is not null) = 0 then 0
      else round((count(*) filter (where q.evaluation_type = 'final' and q.status = 'completed' and q.recommend = true))::numeric * 100 /
                 (count(*) filter (where q.evaluation_type = 'final' and q.status = 'completed' and q.recommend is not null)), 1)
    end
  ) into v_result
  from public.training_satisfaction_surveys q
  where q.organization_id = p_organization_id
    and (p_site_id is null or q.site_id = p_site_id)
    and (p_session_id is null or q.session_id = p_session_id)
    and (p_evaluation_type is null or q.evaluation_type = p_evaluation_type);
  return v_result;
end;
$$;

revoke all on function public.training_evaluation_summary(uuid,uuid,uuid,text) from public, anon;
grant execute on function public.training_evaluation_summary(uuid,uuid,uuid,text) to authenticated;

create or replace function public.training_satisfaction_summary(
  p_organization_id uuid,
  p_site_id uuid default null,
  p_session_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.training_evaluation_summary(p_organization_id, p_site_id, p_session_id, 'final');
$$;

create or replace function public.queue_due_training_evaluation_reminders(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_payload jsonb;
  v_inserted integer;
  v_total integer := 0;
  v_next integer;
begin
  if current_user not in ('postgres','service_role','supabase_admin') and auth.role() <> 'service_role' then
    raise exception 'Accès réservé au service d’envoi.';
  end if;

  for v_row in
    select q.id, q.organization_id, q.session_id, q.evaluation_type, q.reminder_count,
           q.emailed_at, t.email, trim(concat_ws(' ', t.first_name, t.last_name)) as trainee_name,
           o.training_evaluation_reminder_delay_hours, o.training_evaluation_reminder_max_count
    from public.training_satisfaction_surveys q
    join public.organizations o on o.id = q.organization_id
    join public.training_sessions s on s.organization_id = q.organization_id and s.id = q.session_id
    join public.training_trainees t on t.organization_id = q.organization_id and t.id = q.trainee_id
    where q.status in ('pending','sent')
      and q.completed_at is null
      and q.emailed_at is not null
      and o.training_evaluation_reminder_enabled = true
      and q.reminder_count < o.training_evaluation_reminder_max_count
      and now() >= coalesce(q.last_reminded_at, q.emailed_at) + make_interval(hours => o.training_evaluation_reminder_delay_hours)
      and ((q.evaluation_type = 'initial' and s.status in ('scheduled','in_progress') and now() <= s.ends_at)
        or (q.evaluation_type = 'final' and s.status = 'completed'))
      and lower(trim(coalesce(t.email, ''))) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    order by q.emailed_at
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  loop
    v_next := v_row.reminder_count + 1;
    select public.training_satisfaction_email_payload(v_row.id) into v_payload;
    v_payload := v_payload || jsonb_build_object('is_reminder', true, 'reminder_count', v_next);

    insert into public.email_outbox (
      organization_id, template_key, recipient_email, recipient_name, payload,
      dedupe_key, status, scheduled_for, attempts, locked_at, sent_at,
      provider_message_id, last_error
    ) values (
      v_row.organization_id, 'training_satisfaction_request', lower(trim(v_row.email)), nullif(v_row.trainee_name, ''), v_payload,
      'training-evaluation:' || v_row.id::text || ':reminder:' || v_next::text,
      'pending', now(), 0, null, null, null, null
    ) on conflict (dedupe_key) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted > 0 then
      update public.training_satisfaction_surveys
      set reminder_count = v_next, last_reminded_at = now(), updated_at = now()
      where id = v_row.id;
      v_total := v_total + 1;
    end if;
  end loop;
  return v_total;
end;
$$;

revoke all on function public.queue_due_training_evaluation_reminders(integer) from public, anon, authenticated;
grant execute on function public.queue_due_training_evaluation_reminders(integer) to service_role;

create or replace function public.launch_training_session_closure_automation(
  p_organization_id uuid,
  p_session_id uuid,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.training_sessions%rowtype;
  v_org public.organizations%rowtype;
  v_trainee record;
  v_final_queued integer := 0;
  v_attestations_queued integer := 0;
  v_use_final boolean := false;
begin
  select * into v_session from public.training_sessions
  where organization_id = p_organization_id and id = p_session_id for update;
  if v_session.id is null or v_session.status <> 'completed' then raise exception 'La session doit être terminée.'; end if;
  if v_session.closure_automation_started_at is not null then
    return jsonb_build_object('already_started', true, 'final_evaluations_queued', 0, 'attestations_queued', 0);
  end if;
  select * into v_org from public.organizations where id = p_organization_id;

  perform set_config('ncr.allow_training_session_finalize', '1', true);
  update public.training_sessions
  set closure_automation_started_at = now(), updated_at = now()
  where organization_id = p_organization_id and id = p_session_id;

  v_use_final := public.organization_has_plan_feature(p_organization_id, 'training_satisfaction')
    and coalesce(v_org.training_satisfaction_enabled, true);

  for v_trainee in
    select e.trainee_id
    from public.training_session_enrollments e
    where e.organization_id = p_organization_id and e.session_id = p_session_id and e.status <> 'canceled'
  loop
    if v_use_final then
      perform public.enqueue_training_evaluation_internal(
        p_organization_id, p_session_id, v_trainee.trainee_id, 'final', true, false, p_created_by
      );
      v_final_queued := v_final_queued + 1;
    end if;

    if coalesce(v_org.training_attestation_auto_send, true)
       and (not v_use_final or not coalesce(v_org.training_attestation_requires_final_evaluation, true)) then
      perform public.queue_training_attestation_internal(p_organization_id, p_session_id, v_trainee.trainee_id, true, p_created_by);
      v_attestations_queued := v_attestations_queued + 1;
    end if;
  end loop;

  perform public.refresh_training_session_dossier_completion(p_organization_id, p_session_id);
  return jsonb_build_object('already_started', false, 'final_evaluations_queued', v_final_queued, 'attestations_queued', v_attestations_queued);
end;
$$;

revoke all on function public.launch_training_session_closure_automation(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.launch_training_session_closure_automation(uuid,uuid,uuid) to service_role;

create or replace function public.training_enqueue_satisfaction_on_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    perform public.launch_training_session_closure_automation(new.organization_id, new.id, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists training_enqueue_satisfaction_on_completion on public.training_sessions;
create trigger training_enqueue_satisfaction_on_completion
after update of status on public.training_sessions
for each row execute procedure public.training_enqueue_satisfaction_on_completion();

-- Validation de session : convocations et évaluations initiales partent dans la même orchestration.
create or replace function public.validate_training_session_workflow(
  p_organization_id uuid,
  p_session_id uuid,
  p_send_convocations boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.training_sessions%rowtype;
  v_program public.training_programs%rowtype;
  v_enrollment_count integer := 0;
  v_missing_email_count integer := 0;
  v_convocations_queued integer := 0;
  v_initial_queued integer := 0;
  v_trainee record;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Accès insuffisant.'; end if;
  select * into v_session from public.training_sessions where organization_id = p_organization_id and id = p_session_id for update;
  if v_session.id is null then raise exception 'Session introuvable.'; end if;
  if v_session.status <> 'draft' then raise exception 'Seule une session en préparation peut être validée.'; end if;
  if v_session.trainer_id is null then raise exception 'Aucun formateur n’est affecté à la session.'; end if;

  select * into v_program from public.training_programs
  where organization_id = p_organization_id and id = v_session.program_id and status <> 'archived';
  if v_program.id is null then raise exception 'Formation introuvable.'; end if;
  if v_program.completion_status <> 'ready' then raise exception 'La fiche formation doit être complétée avant la validation de la session.'; end if;

  select count(*)::integer,
         count(*) filter (where nullif(trim(coalesce(t.email, '')), '') is null
           or trim(t.email) !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$')::integer
  into v_enrollment_count, v_missing_email_count
  from public.training_session_enrollments e
  join public.training_trainees t on t.organization_id = e.organization_id and t.id = e.trainee_id
  where e.organization_id = p_organization_id and e.session_id = p_session_id and e.status <> 'canceled';

  if v_enrollment_count = 0 then raise exception 'Ajoute au moins un stagiaire à la session.'; end if;
  if p_send_convocations and v_missing_email_count > 0 then
    raise exception '% stagiaire(s) n’ont pas d’adresse e-mail valide pour recevoir leurs documents.', v_missing_email_count;
  end if;

  update public.training_sessions
  set status = 'scheduled', validated_at = now(), validated_by = auth.uid(), updated_at = now()
  where organization_id = p_organization_id and id = p_session_id;

  if p_send_convocations then
    insert into public.training_document_jobs (
      organization_id, site_id, session_id, trainee_id, document_kind,
      generation_version, send_email, status, attempts, scheduled_for, created_by
    )
    select e.organization_id, v_session.site_id, e.session_id, e.trainee_id, 'convocation',
      coalesce((select max(existing.generation_version) from public.training_document_jobs existing
        where existing.organization_id = e.organization_id and existing.session_id = e.session_id
          and existing.trainee_id = e.trainee_id and existing.document_kind = 'convocation'), 0) + 1,
      true, 'pending', 0, now(), auth.uid()
    from public.training_session_enrollments e
    where e.organization_id = p_organization_id and e.session_id = p_session_id and e.status <> 'canceled'
      and not exists (select 1 from public.training_document_jobs existing
        where existing.organization_id = e.organization_id and existing.session_id = e.session_id
          and existing.trainee_id = e.trainee_id and existing.document_kind = 'convocation'
          and existing.status in ('pending','processing','completed'));
    get diagnostics v_convocations_queued = row_count;
  end if;

  if public.organization_has_plan_feature(p_organization_id, 'training_satisfaction')
     and coalesce((select training_initial_evaluation_enabled from public.organizations where id = p_organization_id), true) then
    for v_trainee in
      select trainee_id from public.training_session_enrollments
      where organization_id = p_organization_id and session_id = p_session_id and status <> 'canceled'
    loop
      perform public.enqueue_training_evaluation_internal(
        p_organization_id, p_session_id, v_trainee.trainee_id, 'initial', true, false, auth.uid()
      );
      v_initial_queued := v_initial_queued + 1;
    end loop;
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'training.session_validated', 'training_session', p_session_id::text,
    jsonb_build_object('enrollment_count', v_enrollment_count, 'convocations_queued', v_convocations_queued,
      'initial_evaluations_queued', v_initial_queued, 'send_convocations', p_send_convocations));

  return jsonb_build_object('session_id', p_session_id, 'status', 'scheduled', 'enrollment_count', v_enrollment_count,
    'convocations_queued', v_convocations_queued, 'initial_evaluations_queued', v_initial_queued);
end;
$$;

-- Clôture métier : termine la session puis lance automatiquement l'évaluation finale.
create or replace function public.close_training_session(
  p_organization_id uuid,
  p_session_id uuid,
  p_closure_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_check jsonb;
  v_result jsonb;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then
    raise exception 'Accès insuffisant.';
  end if;
  v_check := public.training_session_closure_check(p_organization_id, p_session_id);
  if not coalesce((v_check->>'can_close')::boolean, false) then
    raise exception '%', coalesce(v_check->'blockers'->>0, 'La session ne peut pas être terminée.');
  end if;

  update public.training_sessions
  set status = 'completed', closed_at = now(), delivery_completed_at = now(), closed_by = auth.uid(),
      closure_notes = nullif(trim(coalesce(p_closure_notes, '')), ''), reopened_at = null, reopened_by = null,
      training_dossier_finalized_at = null, training_dossier_finalized_by = null,
      training_dossier_auto_completed = false, closure_automation_started_at = null, updated_at = now()
  where organization_id = p_organization_id and id = p_session_id and status <> 'completed';
  if not found then raise exception 'Session introuvable ou déjà terminée.'; end if;

  select jsonb_build_object(
    'id', s.id, 'status', s.status, 'closed_at', s.closed_at, 'delivery_completed_at', s.delivery_completed_at,
    'closure_notes', s.closure_notes, 'closure_automation_started_at', s.closure_automation_started_at,
    'training_dossier_finalized_at', s.training_dossier_finalized_at,
    'final_evaluations_queued', (select count(*) from public.training_satisfaction_surveys q
      where q.organization_id = p_organization_id and q.session_id = p_session_id and q.evaluation_type = 'final'),
    'attestations_queued', (select count(*) from public.training_document_jobs j
      where j.organization_id = p_organization_id and j.session_id = p_session_id and j.document_kind = 'attestation')
  ) into v_result
  from public.training_sessions s
  where s.organization_id = p_organization_id and s.id = p_session_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'training.session_delivery_completed', 'training_session', p_session_id::text,
    jsonb_build_object('closure_notes', nullif(trim(coalesce(p_closure_notes, '')), ''), 'check', v_check, 'automation', v_result));
  return v_result;
end;
$$;

-- Autorise uniquement les mises à jour internes de finalisation sur une session terminée.
create or replace function public.prevent_closed_training_session_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.status = 'completed' then raise exception 'Une session clôturée ne peut pas être supprimée.'; end if;
  if tg_op = 'UPDATE' and old.status = 'completed'
     and coalesce(current_setting('ncr.allow_training_session_reopen', true), '') <> '1'
     and coalesce(current_setting('ncr.allow_training_session_finalize', true), '') <> '1' then
    raise exception 'La session est clôturée. Utilisez la réouverture administrateur.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.finalize_training_session_dossier(
  p_organization_id uuid,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Accès insuffisant.'; end if;
  v_result := public.refresh_training_session_dossier_completion(p_organization_id, p_session_id);
  if not coalesce((v_result->>'ready')::boolean, false) then
    raise exception '%', coalesce(v_result->'blockers'->>0, 'Le dossier n’est pas encore complet.');
  end if;
  perform set_config('ncr.allow_training_session_finalize', '1', true);
  update public.training_sessions
  set training_dossier_finalized_by = auth.uid(), training_dossier_auto_completed = false, updated_at = now()
  where organization_id = p_organization_id and id = p_session_id;
  return v_result;
end;
$$;

revoke all on function public.finalize_training_session_dossier(uuid,uuid) from public, anon;
grant execute on function public.finalize_training_session_dossier(uuid,uuid) to authenticated;

-- Recalcule automatiquement le dossier quand une réponse, une présence ou une attestation évolue.
create or replace function public.training_refresh_dossier_from_child()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_session uuid;
begin
  v_org := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  v_session := case when tg_op = 'DELETE' then old.session_id else new.session_id end;
  if v_session is not null and exists (
    select 1 from public.training_sessions where organization_id = v_org and id = v_session and status = 'completed'
  ) then
    perform public.refresh_training_session_dossier_completion(v_org, v_session);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists training_refresh_dossier_from_evaluation on public.training_satisfaction_surveys;
create trigger training_refresh_dossier_from_evaluation
after insert or update or delete on public.training_satisfaction_surveys
for each row execute procedure public.training_refresh_dossier_from_child();

drop trigger if exists training_refresh_dossier_from_attendance on public.training_attendance;
create trigger training_refresh_dossier_from_attendance
after insert or update or delete on public.training_attendance
for each row execute procedure public.training_refresh_dossier_from_child();

drop trigger if exists training_refresh_dossier_from_document on public.training_documents;
create trigger training_refresh_dossier_from_document
after insert or update or delete on public.training_documents
for each row execute procedure public.training_refresh_dossier_from_child();

alter table public.email_outbox drop constraint if exists email_outbox_template_key_check;
alter table public.email_outbox add constraint email_outbox_template_key_check check (template_key in (
  'customer_pending','customer_confirmed','customer_rescheduled','customer_cancelled','customer_reminder',
  'business_new_booking','business_rescheduled','business_cancelled','team_invitation',
  'training_convocation','training_attestation','training_satisfaction_request','training_commercial_document',
  'security_client_portal_invitation','cleaning_client_portal_invitation','coiffure_client_portal_invitation',
  'security_quote','security_invoice','security_client_message','security_client_portal_message',
  'cleaning_client_portal_message','coiffure_loyalty_reward','training_team_invitation','support_message'
));

insert into public.platform_release_state (
  singleton, database_version, expected_frontend_version, expected_pwa_cache,
  installed_at, installed_by, notes
)
values (
  true, '2.15.2', '2.15.2', 'ncr-suite-shell-v2.15.2-training-closure', now(), auth.uid(),
  'Formation : évaluations initiales et finales Brevo, relances, attestations automatiques et dossier complet.'
)
on conflict(singleton) do update set
  database_version = excluded.database_version,
  expected_frontend_version = excluded.expected_frontend_version,
  expected_pwa_cache = excluded.expected_pwa_cache,
  installed_at = excluded.installed_at,
  installed_by = excluded.installed_by,
  notes = excluded.notes;

commit;

select pg_notify('pgrst', 'reload schema');
