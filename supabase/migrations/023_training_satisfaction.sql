-- NCR Suite V2.4.6 — Évaluations et satisfaction Formation
-- À exécuter après 022_training_automatic_documents.sql.

begin;

alter table public.organizations
  add column if not exists training_satisfaction_enabled boolean not null default true,
  add column if not exists training_satisfaction_delay_hours integer not null default 0,
  add column if not exists training_satisfaction_intro text;

alter table public.organizations
  drop constraint if exists organizations_training_satisfaction_delay_check,
  add constraint organizations_training_satisfaction_delay_check
    check (training_satisfaction_delay_hours between 0 and 168),
  drop constraint if exists organizations_training_satisfaction_intro_check,
  add constraint organizations_training_satisfaction_intro_check
    check (training_satisfaction_intro is null or char_length(training_satisfaction_intro) <= 1200);


insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, sort_order
) values (
  'evaluations', 'Évaluations', 'Questionnaires de satisfaction et suivi qualité des sessions.',
  'formation', 'chart', '{formation}', false, true, 550
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

insert into public.organization_modules (organization_id, module_key, enabled, configured_by)
select o.id, 'evaluations', true, null
from public.organizations o
where o.business_type = 'formation' and o.plan = 'metier'
on conflict (organization_id, module_key) do nothing;

create table if not exists public.training_satisfaction_surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid,
  session_id uuid not null,
  trainee_id uuid not null,
  public_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending','sent','completed','expired','cancelled')),
  scheduled_for timestamptz not null default now(),
  emailed_at timestamptz,
  completed_at timestamptz,
  content_rating smallint check (content_rating between 1 and 5),
  trainer_rating smallint check (trainer_rating between 1 and 5),
  organization_rating smallint check (organization_rating between 1 and 5),
  objectives_rating smallint check (objectives_rating between 1 and 5),
  recommend boolean,
  comment text,
  improvement text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, session_id, trainee_id),
  constraint training_satisfaction_session_fk foreign key (organization_id, session_id)
    references public.training_sessions(organization_id, id) on delete cascade,
  constraint training_satisfaction_trainee_fk foreign key (organization_id, trainee_id)
    references public.training_trainees(organization_id, id) on delete restrict,
  constraint training_satisfaction_site_fk foreign key (organization_id, site_id)
    references public.organization_sites(organization_id, id) on delete restrict,
  constraint training_satisfaction_comment_check check (comment is null or char_length(comment) <= 3000),
  constraint training_satisfaction_improvement_check check (improvement is null or char_length(improvement) <= 3000)
);

create index if not exists idx_training_satisfaction_org_session
  on public.training_satisfaction_surveys(organization_id, session_id, status, created_at desc);
create index if not exists idx_training_satisfaction_pending
  on public.training_satisfaction_surveys(status, scheduled_for)
  where status in ('pending','sent');

alter table public.training_satisfaction_surveys enable row level security;
revoke all on public.training_satisfaction_surveys from anon;
revoke all on public.training_satisfaction_surveys from authenticated;
grant select on public.training_satisfaction_surveys to authenticated;

drop policy if exists training_satisfaction_select on public.training_satisfaction_surveys;
create policy training_satisfaction_select
on public.training_satisfaction_surveys for select
to authenticated
using (public.is_org_member(organization_id));

drop trigger if exists set_training_satisfaction_updated_at on public.training_satisfaction_surveys;
create trigger set_training_satisfaction_updated_at
before update on public.training_satisfaction_surveys
for each row execute procedure public.set_updated_at();

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
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;

  if not exists (
    select 1 from public.organizations
    where id = p_organization_id and business_type = 'formation'
  ) then
    raise exception 'Espace Formation introuvable.';
  end if;

  if coalesce(p_delay_hours, 0) not between 0 and 168 then
    raise exception 'Le délai doit être compris entre 0 et 168 heures.';
  end if;

  update public.organizations
  set training_satisfaction_enabled = coalesce(p_enabled, true),
      training_satisfaction_delay_hours = coalesce(p_delay_hours, 0),
      training_satisfaction_intro = nullif(trim(coalesce(p_intro, '')), ''),
      updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.satisfaction_settings_updated', 'organization', p_organization_id::text,
    jsonb_build_object('enabled', coalesce(p_enabled, true), 'delay_hours', coalesce(p_delay_hours, 0))
  );
end;
$$;

revoke all on function public.update_training_satisfaction_settings(uuid,boolean,integer,text) from public;
grant execute on function public.update_training_satisfaction_settings(uuid,boolean,integer,text) to authenticated;

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
    'organization_name', coalesce(o.public_name, o.name),
    'organization_primary_color', o.primary_color,
    'organization_logo_url', o.logo_url,
    'organization_timezone', o.timezone,
    'show_ncr_branding', coalesce(o.show_ncr_branding, true),
    'contact_email', o.booking_contact_email,
    'contact_phone', o.booking_contact_phone,
    'intro_text', o.training_satisfaction_intro,
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

revoke all on function public.training_satisfaction_email_payload(uuid) from public;
grant execute on function public.training_satisfaction_email_payload(uuid) to service_role;

create or replace function public.enqueue_training_satisfaction_internal(
  p_organization_id uuid,
  p_session_id uuid,
  p_trainee_id uuid,
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
  v_delay integer;
  v_enabled boolean;
  v_email text;
  v_name text;
  v_payload jsonb;
  v_scheduled_for timestamptz;
begin
  select s.site_id, s.status, o.training_satisfaction_delay_hours, o.training_satisfaction_enabled,
         lower(trim(coalesce(t.email, ''))), trim(concat_ws(' ', t.first_name, t.last_name))
  into v_site_id, v_status, v_delay, v_enabled, v_email, v_name
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
  if v_status <> 'completed' then raise exception 'La session doit être terminée.'; end if;
  if not coalesce(v_enabled, true) and not p_force then return null; end if;

  v_scheduled_for := now() + make_interval(hours => coalesce(v_delay, 0));

  insert into public.training_satisfaction_surveys (
    organization_id, site_id, session_id, trainee_id, status, scheduled_for, created_by,
    emailed_at, completed_at, content_rating, trainer_rating, organization_rating,
    objectives_rating, recommend, comment, improvement
  ) values (
    p_organization_id, v_site_id, p_session_id, p_trainee_id, 'pending', v_scheduled_for, p_created_by,
    null, null, null, null, null, null, null, null, null
  )
  on conflict (organization_id, session_id, trainee_id)
  do update set
    status = case
      when public.training_satisfaction_surveys.status = 'completed' and not p_force then 'completed'
      else 'pending'
    end,
    scheduled_for = case
      when public.training_satisfaction_surveys.status = 'completed' and not p_force then public.training_satisfaction_surveys.scheduled_for
      else v_scheduled_for
    end,
    emailed_at = case
      when public.training_satisfaction_surveys.status = 'completed' and not p_force then public.training_satisfaction_surveys.emailed_at
      else null
    end,
    updated_at = now()
  returning id into v_survey_id;

  if p_send_email
     and v_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
     and not exists (
       select 1 from public.training_satisfaction_surveys
       where id = v_survey_id and status = 'completed'
     ) then
    select public.training_satisfaction_email_payload(v_survey_id) into v_payload;

    insert into public.email_outbox (
      organization_id, template_key, recipient_email, recipient_name, payload,
      dedupe_key, status, scheduled_for, attempts, locked_at, sent_at,
      provider_message_id, last_error
    ) values (
      p_organization_id, 'training_satisfaction_request', v_email, nullif(v_name, ''), v_payload,
      'training-satisfaction:' || v_survey_id::text,
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

revoke all on function public.enqueue_training_satisfaction_internal(uuid,uuid,uuid,boolean,boolean,uuid) from public;

create or replace function public.queue_training_session_satisfaction(
  p_organization_id uuid,
  p_session_id uuid,
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
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then
    raise exception 'Accès insuffisant.';
  end if;

  if not exists (
    select 1 from public.training_sessions
    where organization_id = p_organization_id and id = p_session_id and status = 'completed'
  ) then
    raise exception 'La session doit être terminée avant l’envoi du questionnaire.';
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
    perform public.enqueue_training_satisfaction_internal(
      p_organization_id, p_session_id, v_trainee.id, p_send_email, p_force, auth.uid()
    );
    v_queued := v_queued + 1;
    if nullif(trim(coalesce(v_trainee.email, '')), '') is null then
      v_without_email := v_without_email + 1;
    end if;
  end loop;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.satisfaction_queued', 'training_session', p_session_id::text,
    jsonb_build_object('queued', v_queued, 'without_email', v_without_email, 'forced', p_force)
  );

  return jsonb_build_object('queued', v_queued, 'without_email', v_without_email);
end;
$$;

revoke all on function public.queue_training_session_satisfaction(uuid,uuid,boolean,boolean) from public;
grant execute on function public.queue_training_session_satisfaction(uuid,uuid,boolean,boolean) to authenticated;

create or replace function public.training_enqueue_satisfaction_on_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainee record;
  v_enabled boolean;
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    select training_satisfaction_enabled into v_enabled
    from public.organizations where id = new.organization_id;

    if coalesce(v_enabled, true) then
      for v_trainee in
        select trainee_id
        from public.training_session_enrollments
        where organization_id = new.organization_id
          and session_id = new.id
          and status <> 'canceled'
      loop
        perform public.enqueue_training_satisfaction_internal(
          new.organization_id, new.id, v_trainee.trainee_id, true, false, auth.uid()
        );
      end loop;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists training_enqueue_satisfaction_on_completion on public.training_sessions;
create trigger training_enqueue_satisfaction_on_completion
after update of status on public.training_sessions
for each row execute procedure public.training_enqueue_satisfaction_on_completion();

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
    'organization_name', coalesce(o.public_name, o.name),
    'organization_logo_url', o.logo_url,
    'organization_primary_color', o.primary_color,
    'show_ncr_branding', coalesce(o.show_ncr_branding, true),
    'intro_text', o.training_satisfaction_intro,
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

revoke all on function public.get_public_training_satisfaction(text) from public;
grant execute on function public.get_public_training_satisfaction(text) to anon, authenticated;

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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_survey public.training_satisfaction_surveys%rowtype;
begin
  if p_content_rating not between 1 and 5
     or p_trainer_rating not between 1 and 5
     or p_organization_rating not between 1 and 5
     or p_objectives_rating not between 1 and 5 then
    raise exception 'Toutes les notes doivent être comprises entre 1 et 5.';
  end if;
  if p_recommend is null then raise exception 'Indique si tu recommanderais cette formation.'; end if;

  select * into v_survey
  from public.training_satisfaction_surveys
  where public_token = trim(coalesce(p_token, ''))
  for update;

  if v_survey.id is null then raise exception 'Questionnaire introuvable.'; end if;
  if v_survey.status = 'completed' then
    return jsonb_build_object('completed', true, 'already_completed', true);
  end if;
  if v_survey.status not in ('pending','sent') then raise exception 'Ce questionnaire n’est plus disponible.'; end if;

  update public.training_satisfaction_surveys
  set status = 'completed',
      completed_at = now(),
      content_rating = p_content_rating,
      trainer_rating = p_trainer_rating,
      organization_rating = p_organization_rating,
      objectives_rating = p_objectives_rating,
      recommend = p_recommend,
      comment = nullif(trim(coalesce(p_comment, '')), ''),
      improvement = nullif(trim(coalesce(p_improvement, '')), ''),
      updated_at = now()
  where id = v_survey.id;

  return jsonb_build_object('completed', true, 'already_completed', false);
end;
$$;

revoke all on function public.submit_public_training_satisfaction(text,integer,integer,integer,integer,boolean,text,text) from public;
grant execute on function public.submit_public_training_satisfaction(text,integer,integer,integer,integer,boolean,text,text) to anon, authenticated;

create or replace function public.training_satisfaction_summary(
  p_organization_id uuid,
  p_site_id uuid default null,
  p_session_id uuid default null
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
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;

  select jsonb_build_object(
    'total', count(*),
    'completed', count(*) filter (where q.status = 'completed'),
    'pending', count(*) filter (where q.status in ('pending','sent')),
    'response_rate', case when count(*) = 0 then 0 else round((count(*) filter (where q.status = 'completed'))::numeric * 100 / count(*), 1) end,
    'average_rating', round(avg(((q.content_rating + q.trainer_rating + q.organization_rating + q.objectives_rating)::numeric / 4)) filter (where q.status = 'completed'), 2),
    'recommendation_rate', case
      when count(*) filter (where q.status = 'completed' and q.recommend is not null) = 0 then 0
      else round((count(*) filter (where q.status = 'completed' and q.recommend = true))::numeric * 100 /
                 (count(*) filter (where q.status = 'completed' and q.recommend is not null)), 1)
    end
  ) into v_result
  from public.training_satisfaction_surveys q
  where q.organization_id = p_organization_id
    and (p_site_id is null or q.site_id = p_site_id)
    and (p_session_id is null or q.session_id = p_session_id);

  return v_result;
end;
$$;

revoke all on function public.training_satisfaction_summary(uuid,uuid,uuid) from public;
grant execute on function public.training_satisfaction_summary(uuid,uuid,uuid) to authenticated;

create or replace function public.training_mark_satisfaction_email_sent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_survey_id uuid;
begin
  if new.template_key = 'training_satisfaction_request'
     and new.status = 'sent'
     and old.status is distinct from new.status then
    begin
      v_survey_id := nullif(new.payload->>'survey_id', '')::uuid;
    exception when others then
      v_survey_id := null;
    end;
    if v_survey_id is not null then
      update public.training_satisfaction_surveys
      set status = case when status = 'pending' then 'sent' else status end,
          emailed_at = coalesce(emailed_at, now()),
          updated_at = now()
      where id = v_survey_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists training_mark_satisfaction_email_sent on public.email_outbox;
create trigger training_mark_satisfaction_email_sent
after update of status on public.email_outbox
for each row execute procedure public.training_mark_satisfaction_email_sent();

alter table public.email_outbox
  drop constraint if exists email_outbox_template_key_check;
alter table public.email_outbox
  add constraint email_outbox_template_key_check check (template_key in (
    'customer_pending',
    'customer_confirmed',
    'customer_rescheduled',
    'customer_cancelled',
    'customer_reminder',
    'business_new_booking',
    'business_rescheduled',
    'business_cancelled',
    'team_invitation',
    'training_convocation',
    'training_attestation',
    'training_satisfaction_request'
  ));

commit;

select pg_notify('pgrst', 'reload schema');
