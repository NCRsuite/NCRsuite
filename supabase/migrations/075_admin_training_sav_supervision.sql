-- NCR Suite V2.15.4 - Super admin : SAV des automatisations Formation
-- A executer apres 074_training_automation_integrity.sql.
-- Ajoute une console de diagnostic et de relance reservee au super administrateur NCR.

begin;

create or replace function public.admin_training_sav_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_organizations jsonb;
  v_summary jsonb;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Acces super administrateur NCR requis.';
  end if;

  with formation_orgs as (
    select o.*
    from public.organizations o
    where o.business_type = 'formation'
  ), org_counts as (
    select
      o.id,
      o.name,
      o.slug,
      o.plan,
      o.status,
      owner_data.email as owner_email,
      coalesce(session_data.sessions_total, 0) as sessions_total,
      coalesce(session_data.sessions_attention, 0) as sessions_attention,
      coalesce(issue_data.initial_missing, 0) as initial_missing,
      coalesce(issue_data.final_missing, 0) as final_missing,
      coalesce(issue_data.attestation_missing, 0) as attestation_missing,
      coalesce(job_data.document_jobs_pending, 0) as document_jobs_pending,
      coalesce(job_data.document_jobs_failed, 0) as document_jobs_failed,
      coalesce(email_data.email_failed, 0) as email_failed,
      greatest(
        coalesce(issue_data.initial_missing, 0)
        + coalesce(issue_data.final_missing, 0)
        + coalesce(issue_data.attestation_missing, 0)
        + coalesce(job_data.document_jobs_failed, 0)
        + coalesce(email_data.email_failed, 0),
        0
      ) as open_issues,
      greatest(
        coalesce(job_data.last_job_at, o.created_at),
        coalesce(email_data.last_email_at, o.created_at),
        coalesce(session_data.last_session_at, o.created_at)
      ) as last_training_activity_at
    from formation_orgs o
    left join lateral (
      select u.email::text as email
      from public.organization_members m
      join auth.users u on u.id = m.user_id
      where m.organization_id = o.id and m.role = 'owner'
      order by m.created_at
      limit 1
    ) owner_data on true
    left join lateral (
      select
        count(*)::integer as sessions_total,
        count(*) filter (
          where s.status in ('scheduled','in_progress','completed')
            and (
              s.trainer_id is null
              or exists (
                select 1 from public.training_document_jobs j
                where j.organization_id = o.id and j.session_id = s.id and j.status = 'failed'
              )
              or exists (
                select 1 from public.email_outbox e
                where e.organization_id = o.id
                  and e.status = 'failed'
                  and e.template_key in ('training_convocation','training_attestation','training_satisfaction_request','training_commercial_document')
                  and (
                    e.payload->>'session_id' = s.id::text
                    or e.payload->>'training_session_id' = s.id::text
                  )
              )
            )
        )::integer as sessions_attention,
        max(s.updated_at) as last_session_at
      from public.training_sessions s
      where s.organization_id = o.id
    ) session_data on true
    left join lateral (
      select
        count(*) filter (
          where s.status in ('scheduled','in_progress')
            and public.organization_has_plan_feature(o.id, 'training_satisfaction')
            and coalesce(o.training_initial_evaluation_enabled, true)
            and not exists (
              select 1 from public.training_satisfaction_surveys q
              where q.organization_id = e.organization_id
                and q.session_id = e.session_id
                and q.trainee_id = e.trainee_id
                and q.evaluation_type = 'initial'
                and q.status <> 'cancelled'
            )
        )::integer as initial_missing,
        count(*) filter (
          where s.status = 'completed'
            and public.organization_has_plan_feature(o.id, 'training_satisfaction')
            and coalesce(o.training_satisfaction_enabled, true)
            and not exists (
              select 1 from public.training_satisfaction_surveys q
              where q.organization_id = e.organization_id
                and q.session_id = e.session_id
                and q.trainee_id = e.trainee_id
                and q.evaluation_type = 'final'
                and q.status <> 'cancelled'
            )
        )::integer as final_missing,
        count(*) filter (
          where s.status = 'completed'
            and public.organization_has_plan_feature(o.id, 'training_automatic_certificates')
            and coalesce(o.training_attestation_auto_send, true)
            and not exists (
              select 1 from public.training_documents d
              where d.organization_id = e.organization_id
                and d.session_id = e.session_id
                and d.trainee_id = e.trainee_id
                and d.category = 'attestation'
                and d.status <> 'archived'
            )
        )::integer as attestation_missing
      from public.training_session_enrollments e
      join public.training_sessions s
        on s.organization_id = e.organization_id and s.id = e.session_id
      where e.organization_id = o.id and e.status <> 'canceled'
    ) issue_data on true
    left join lateral (
      select
        count(*) filter (where j.status in ('pending','processing'))::integer as document_jobs_pending,
        count(*) filter (where j.status = 'failed')::integer as document_jobs_failed,
        max(j.updated_at) as last_job_at
      from public.training_document_jobs j
      where j.organization_id = o.id
    ) job_data on true
    left join lateral (
      select
        count(*) filter (where e.status = 'failed')::integer as email_failed,
        max(e.updated_at) as last_email_at
      from public.email_outbox e
      where e.organization_id = o.id
        and e.template_key in ('training_convocation','training_attestation','training_satisfaction_request','training_commercial_document')
    ) email_data on true
  )
  select
    jsonb_build_object(
      'organizations_total', count(*)::integer,
      'organizations_with_issues', count(*) filter (where open_issues > 0)::integer,
      'sessions_attention', coalesce(sum(sessions_attention), 0)::integer,
      'document_jobs_failed', coalesce(sum(document_jobs_failed), 0)::integer,
      'document_jobs_pending', coalesce(sum(document_jobs_pending), 0)::integer,
      'email_failed', coalesce(sum(email_failed), 0)::integer,
      'initial_missing', coalesce(sum(initial_missing), 0)::integer,
      'final_missing', coalesce(sum(final_missing), 0)::integer,
      'attestation_missing', coalesce(sum(attestation_missing), 0)::integer
    ),
    coalesce(jsonb_agg(jsonb_build_object(
      'organization_id', id,
      'name', name,
      'slug', slug,
      'plan', plan,
      'status', status,
      'owner_email', owner_email,
      'sessions_total', sessions_total,
      'sessions_attention', sessions_attention,
      'open_issues', open_issues,
      'initial_missing', initial_missing,
      'final_missing', final_missing,
      'attestation_missing', attestation_missing,
      'document_jobs_pending', document_jobs_pending,
      'document_jobs_failed', document_jobs_failed,
      'email_failed', email_failed,
      'last_training_activity_at', last_training_activity_at
    ) order by open_issues desc, last_training_activity_at desc, name), '[]'::jsonb)
  into v_summary, v_organizations
  from org_counts;

  return jsonb_build_object(
    'generated_at', now(),
    'summary', coalesce(v_summary, jsonb_build_object(
      'organizations_total', 0,
      'organizations_with_issues', 0,
      'sessions_attention', 0,
      'document_jobs_failed', 0,
      'document_jobs_pending', 0,
      'email_failed', 0,
      'initial_missing', 0,
      'final_missing', 0,
      'attestation_missing', 0
    )),
    'organizations', coalesce(v_organizations, '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_training_sav_organization_report(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_sessions jsonb;
  v_jobs jsonb;
  v_emails jsonb;
  v_summary jsonb;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Acces super administrateur NCR requis.';
  end if;

  select * into v_org
  from public.organizations
  where id = p_organization_id and business_type = 'formation';
  if v_org.id is null then raise exception 'Entreprise Formation introuvable.'; end if;

  with session_rows as (
    select
      s.id,
      s.title,
      s.status,
      s.starts_at,
      s.ends_at,
      s.trainer_id is null as trainer_missing,
      coalesce(p.completion_status, 'draft') <> 'ready' as program_not_ready,
      coalesce(enrollments.enrollment_count, 0) as enrollment_count,
      coalesce(issues.initial_missing, 0) as initial_missing,
      coalesce(issues.final_missing, 0) as final_missing,
      coalesce(issues.attestation_missing, 0) as attestation_missing,
      coalesce(jobs.document_jobs_pending, 0) as document_jobs_pending,
      coalesce(jobs.document_jobs_failed, 0) as document_jobs_failed,
      coalesce(emails.email_failed, 0) as email_failed,
      s.updated_at
    from public.training_sessions s
    left join public.training_programs p
      on p.organization_id = s.organization_id and p.id = s.program_id
    left join lateral (
      select count(*)::integer as enrollment_count
      from public.training_session_enrollments e
      where e.organization_id = s.organization_id and e.session_id = s.id and e.status <> 'canceled'
    ) enrollments on true
    left join lateral (
      select
        count(*) filter (
          where s.status in ('scheduled','in_progress')
            and public.organization_has_plan_feature(s.organization_id, 'training_satisfaction')
            and coalesce(v_org.training_initial_evaluation_enabled, true)
            and not exists (
              select 1 from public.training_satisfaction_surveys q
              where q.organization_id = e.organization_id
                and q.session_id = e.session_id
                and q.trainee_id = e.trainee_id
                and q.evaluation_type = 'initial'
                and q.status <> 'cancelled'
            )
        )::integer as initial_missing,
        count(*) filter (
          where s.status = 'completed'
            and public.organization_has_plan_feature(s.organization_id, 'training_satisfaction')
            and coalesce(v_org.training_satisfaction_enabled, true)
            and not exists (
              select 1 from public.training_satisfaction_surveys q
              where q.organization_id = e.organization_id
                and q.session_id = e.session_id
                and q.trainee_id = e.trainee_id
                and q.evaluation_type = 'final'
                and q.status <> 'cancelled'
            )
        )::integer as final_missing,
        count(*) filter (
          where s.status = 'completed'
            and public.organization_has_plan_feature(s.organization_id, 'training_automatic_certificates')
            and coalesce(v_org.training_attestation_auto_send, true)
            and not exists (
              select 1 from public.training_documents d
              where d.organization_id = e.organization_id
                and d.session_id = e.session_id
                and d.trainee_id = e.trainee_id
                and d.category = 'attestation'
                and d.status <> 'archived'
            )
        )::integer as attestation_missing
      from public.training_session_enrollments e
      where e.organization_id = s.organization_id and e.session_id = s.id and e.status <> 'canceled'
    ) issues on true
    left join lateral (
      select
        count(*) filter (where j.status in ('pending','processing'))::integer as document_jobs_pending,
        count(*) filter (where j.status = 'failed')::integer as document_jobs_failed
      from public.training_document_jobs j
      where j.organization_id = s.organization_id and j.session_id = s.id
    ) jobs on true
    left join lateral (
      select count(*) filter (where e.status = 'failed')::integer as email_failed
      from public.email_outbox e
      where e.organization_id = s.organization_id
        and e.template_key in ('training_convocation','training_attestation','training_satisfaction_request','training_commercial_document')
        and (
          e.payload->>'session_id' = s.id::text
          or e.payload->>'training_session_id' = s.id::text
        )
    ) emails on true
    where s.organization_id = p_organization_id
      and s.status <> 'canceled'
      and s.starts_at >= now() - interval '18 months'
  )
  select
    jsonb_build_object(
      'sessions_total', count(*)::integer,
      'sessions_attention', count(*) filter (
        where trainer_missing or program_not_ready or initial_missing > 0 or final_missing > 0
          or attestation_missing > 0 or document_jobs_failed > 0 or email_failed > 0
      )::integer,
      'initial_missing', coalesce(sum(initial_missing), 0)::integer,
      'final_missing', coalesce(sum(final_missing), 0)::integer,
      'attestation_missing', coalesce(sum(attestation_missing), 0)::integer,
      'document_jobs_failed', coalesce(sum(document_jobs_failed), 0)::integer,
      'document_jobs_pending', coalesce(sum(document_jobs_pending), 0)::integer,
      'email_failed', coalesce(sum(email_failed), 0)::integer
    ),
    coalesce(jsonb_agg(jsonb_build_object(
      'session_id', id,
      'title', title,
      'status', status,
      'starts_at', starts_at,
      'ends_at', ends_at,
      'trainer_missing', trainer_missing,
      'program_not_ready', program_not_ready,
      'enrollment_count', enrollment_count,
      'initial_missing', initial_missing,
      'final_missing', final_missing,
      'attestation_missing', attestation_missing,
      'document_jobs_pending', document_jobs_pending,
      'document_jobs_failed', document_jobs_failed,
      'email_failed', email_failed,
      'updated_at', updated_at
    ) order by (initial_missing + final_missing + attestation_missing + document_jobs_failed + email_failed) desc, starts_at desc), '[]'::jsonb)
  into v_summary, v_sessions
  from session_rows;

  select coalesce(jsonb_agg(jsonb_build_object(
    'job_id', job_id,
    'session_id', session_id,
    'session_title', session_title,
    'trainee_name', trainee_name,
    'document_kind', document_kind,
    'status', status,
    'attempts', attempts,
    'generation_version', generation_version,
    'last_error', last_error,
    'scheduled_for', scheduled_for,
    'updated_at', updated_at
  ) order by updated_at desc), '[]'::jsonb)
  into v_jobs
  from (
    select
      j.id as job_id,
      j.session_id,
      s.title as session_title,
      trim(concat_ws(' ', t.first_name, t.last_name)) as trainee_name,
      j.document_kind,
      j.status,
      j.attempts,
      j.generation_version,
      j.last_error,
      j.scheduled_for,
      j.updated_at
    from public.training_document_jobs j
    join public.training_sessions s on s.organization_id = j.organization_id and s.id = j.session_id
    join public.training_trainees t on t.organization_id = j.organization_id and t.id = j.trainee_id
    where j.organization_id = p_organization_id
      and j.status in ('failed','pending','processing')
    order by j.updated_at desc
    limit 80
  ) recent_jobs;

  select coalesce(jsonb_agg(jsonb_build_object(
    'email_id', email_id,
    'template_key', template_key,
    'recipient_email', recipient_email,
    'recipient_name', recipient_name,
    'status', status,
    'attempts', attempts,
    'last_error', last_error,
    'scheduled_for', scheduled_for,
    'updated_at', updated_at,
    'session_id', session_id
  ) order by updated_at desc), '[]'::jsonb)
  into v_emails
  from (
    select
      e.id as email_id,
      e.template_key,
      e.recipient_email,
      e.recipient_name,
      e.status,
      e.attempts,
      e.last_error,
      e.scheduled_for,
      e.updated_at,
      coalesce(e.payload->>'session_id', e.payload->>'training_session_id') as session_id
    from public.email_outbox e
    where e.organization_id = p_organization_id
      and e.status = 'failed'
      and e.template_key in ('training_convocation','training_attestation','training_satisfaction_request','training_commercial_document')
    order by e.updated_at desc
    limit 80
  ) recent_emails;

  return jsonb_build_object(
    'generated_at', now(),
    'organization', jsonb_build_object(
      'id', v_org.id,
      'name', v_org.name,
      'slug', v_org.slug,
      'plan', v_org.plan,
      'status', v_org.status
    ),
    'summary', coalesce(v_summary, jsonb_build_object(
      'sessions_total', 0,
      'sessions_attention', 0,
      'initial_missing', 0,
      'final_missing', 0,
      'attestation_missing', 0,
      'document_jobs_failed', 0,
      'document_jobs_pending', 0,
      'email_failed', 0
    )),
    'sessions', coalesce(v_sessions, '[]'::jsonb),
    'document_jobs', coalesce(v_jobs, '[]'::jsonb),
    'failed_emails', coalesce(v_emails, '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_training_sav_retry_document_job(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.training_document_jobs%rowtype;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Acces super administrateur NCR requis.';
  end if;

  select * into v_job
  from public.training_document_jobs
  where id = p_job_id
  for update;
  if v_job.id is null then raise exception 'Job documentaire introuvable.'; end if;
  if v_job.status = 'completed' then raise exception 'Ce job est deja termine.'; end if;

  update public.training_document_jobs
  set status = 'pending',
      attempts = 0,
      scheduled_for = now(),
      locked_at = null,
      last_error = null,
      updated_at = now()
  where id = p_job_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    v_job.organization_id,
    auth.uid(),
    'admin.training_sav_document_job_retried',
    'training_document_job',
    p_job_id::text,
    jsonb_build_object('previous_status', v_job.status, 'session_id', v_job.session_id, 'document_kind', v_job.document_kind)
  );

  return jsonb_build_object('job_id', p_job_id, 'status', 'pending');
end;
$$;

create or replace function public.admin_training_sav_retry_training_emails(
  p_organization_id uuid,
  p_session_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Acces super administrateur NCR requis.';
  end if;

  if not exists (
    select 1 from public.organizations
    where id = p_organization_id and business_type = 'formation'
  ) then
    raise exception 'Entreprise Formation introuvable.';
  end if;

  update public.email_outbox e
  set status = 'pending',
      attempts = 0,
      locked_at = null,
      scheduled_for = now(),
      sent_at = null,
      provider_message_id = null,
      last_error = null,
      updated_at = now()
  where e.organization_id = p_organization_id
    and e.status = 'failed'
    and e.template_key in ('training_convocation','training_attestation','training_satisfaction_request','training_commercial_document')
    and (
      p_session_id is null
      or e.payload->>'session_id' = p_session_id::text
      or e.payload->>'training_session_id' = p_session_id::text
    );
  get diagnostics v_count = row_count;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'admin.training_sav_emails_retried',
    'training_session',
    coalesce(p_session_id::text, p_organization_id::text),
    jsonb_build_object('retried', v_count, 'session_id', p_session_id)
  );

  return jsonb_build_object('retried', v_count);
end;
$$;

create or replace function public.admin_training_sav_repair_session(
  p_organization_id uuid,
  p_session_id uuid,
  p_mode text default 'all'
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
  v_initial_queued integer := 0;
  v_final_queued integer := 0;
  v_attestations_queued integer := 0;
  v_emails_retried integer := 0;
  v_refresh jsonb := null;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Acces super administrateur NCR requis.';
  end if;
  if p_mode not in ('all','initial','final','attestations','emails','dossier') then
    raise exception 'Mode SAV invalide.';
  end if;

  select * into v_org
  from public.organizations
  where id = p_organization_id and business_type = 'formation';
  if v_org.id is null then raise exception 'Entreprise Formation introuvable.'; end if;

  select * into v_session
  from public.training_sessions
  where organization_id = p_organization_id and id = p_session_id
  for update;
  if v_session.id is null then raise exception 'Session Formation introuvable.'; end if;

  if p_mode in ('all','initial')
     and v_session.status in ('scheduled','in_progress')
     and public.organization_has_plan_feature(p_organization_id, 'training_satisfaction')
     and coalesce(v_org.training_initial_evaluation_enabled, true) then
    for v_trainee in
      select e.trainee_id
      from public.training_session_enrollments e
      where e.organization_id = p_organization_id
        and e.session_id = p_session_id
        and e.status <> 'canceled'
        and not exists (
          select 1 from public.training_satisfaction_surveys q
          where q.organization_id = e.organization_id
            and q.session_id = e.session_id
            and q.trainee_id = e.trainee_id
            and q.evaluation_type = 'initial'
            and q.status = 'completed'
        )
    loop
      perform public.enqueue_training_evaluation_internal(
        p_organization_id, p_session_id, v_trainee.trainee_id, 'initial', true, true, auth.uid()
      );
      v_initial_queued := v_initial_queued + 1;
    end loop;
  end if;

  if p_mode in ('all','final')
     and v_session.status = 'completed'
     and public.organization_has_plan_feature(p_organization_id, 'training_satisfaction')
     and coalesce(v_org.training_satisfaction_enabled, true) then
    for v_trainee in
      select e.trainee_id
      from public.training_session_enrollments e
      where e.organization_id = p_organization_id
        and e.session_id = p_session_id
        and e.status <> 'canceled'
        and not exists (
          select 1 from public.training_satisfaction_surveys q
          where q.organization_id = e.organization_id
            and q.session_id = e.session_id
            and q.trainee_id = e.trainee_id
            and q.evaluation_type = 'final'
            and q.status = 'completed'
        )
    loop
      perform public.enqueue_training_evaluation_internal(
        p_organization_id, p_session_id, v_trainee.trainee_id, 'final', true, true, auth.uid()
      );
      v_final_queued := v_final_queued + 1;
    end loop;
  end if;

  if p_mode in ('all','attestations')
     and v_session.status = 'completed'
     and public.organization_has_plan_feature(p_organization_id, 'training_automatic_certificates')
     and coalesce(v_org.training_attestation_auto_send, true) then
    for v_trainee in
      select e.trainee_id
      from public.training_session_enrollments e
      where e.organization_id = p_organization_id
        and e.session_id = p_session_id
        and e.status <> 'canceled'
        and not exists (
          select 1 from public.training_documents d
          where d.organization_id = e.organization_id
            and d.session_id = e.session_id
            and d.trainee_id = e.trainee_id
            and d.category = 'attestation'
            and d.status <> 'archived'
        )
    loop
      perform public.queue_training_attestation_internal(
        p_organization_id, p_session_id, v_trainee.trainee_id, true, auth.uid()
      );
      v_attestations_queued := v_attestations_queued + 1;
    end loop;
  end if;

  if p_mode in ('all','emails') then
    select (public.admin_training_sav_retry_training_emails(p_organization_id, p_session_id)->>'retried')::integer
    into v_emails_retried;
  end if;

  if p_mode in ('all','dossier') and v_session.status = 'completed' then
    v_refresh := public.refresh_training_session_dossier_completion(p_organization_id, p_session_id);
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'admin.training_sav_session_repaired',
    'training_session',
    p_session_id::text,
    jsonb_build_object(
      'mode', p_mode,
      'initial_queued', v_initial_queued,
      'final_queued', v_final_queued,
      'attestations_queued', v_attestations_queued,
      'emails_retried', coalesce(v_emails_retried, 0),
      'dossier_refresh', v_refresh
    )
  );

  return jsonb_build_object(
    'session_id', p_session_id,
    'mode', p_mode,
    'initial_queued', v_initial_queued,
    'final_queued', v_final_queued,
    'attestations_queued', v_attestations_queued,
    'emails_retried', coalesce(v_emails_retried, 0),
    'dossier_refresh', v_refresh
  );
end;
$$;

revoke all on function public.admin_training_sav_overview() from public, anon;
revoke all on function public.admin_training_sav_organization_report(uuid) from public, anon;
revoke all on function public.admin_training_sav_retry_document_job(uuid) from public, anon;
revoke all on function public.admin_training_sav_retry_training_emails(uuid, uuid) from public, anon;
revoke all on function public.admin_training_sav_repair_session(uuid, uuid, text) from public, anon;

grant execute on function public.admin_training_sav_overview() to authenticated;
grant execute on function public.admin_training_sav_organization_report(uuid) to authenticated;
grant execute on function public.admin_training_sav_retry_document_job(uuid) to authenticated;
grant execute on function public.admin_training_sav_retry_training_emails(uuid, uuid) to authenticated;
grant execute on function public.admin_training_sav_repair_session(uuid, uuid, text) to authenticated;

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
  '2.15.4',
  '2.15.4',
  'ncr-suite-shell-v2.15.4-training-sav-admin',
  now(),
  auth.uid(),
  'Formation V2.15.4 : supervision SAV super admin, diagnostic des automatisations, relance des jobs/e-mails et reparation de session.'
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
