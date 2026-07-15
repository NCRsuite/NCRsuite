-- NCR Suite V2.4.11 — Clôture sécurisée des sessions Formation
-- À exécuter après 024_training_plan_entitlements.sql.

begin;

-- Compatibilité avec les sessions créées avant l’activation du multi-site.
-- Certaines entreprises Professionnelles possèdent déjà des sessions sans établissement :
-- on crée/choisit un établissement principal actif avant toute mise à jour de ces sessions.
insert into public.organization_sites (
  organization_id, name, code, timezone, is_primary, status, created_by
)
select
  o.id,
  'Établissement principal',
  'PRINCIPAL',
  coalesce(o.timezone, 'Europe/Paris'),
  true,
  'active',
  o.created_by
from public.organizations o
where o.business_type = 'formation'
  and public.organization_has_plan_feature(o.id, 'multi_site')
  and not exists (
    select 1
    from public.organization_sites s
    where s.organization_id = o.id
      and s.status = 'active'
  );

-- Si des établissements actifs existaient déjà sans principal, le premier devient principal.
with organizations_without_primary as (
  select
    o.id as organization_id,
    (
      select s.id
      from public.organization_sites s
      where s.organization_id = o.id
        and s.status = 'active'
      order by s.created_at asc, s.id asc
      limit 1
    ) as site_id
  from public.organizations o
  where o.business_type = 'formation'
    and public.organization_has_plan_feature(o.id, 'multi_site')
    and not exists (
      select 1
      from public.organization_sites p
      where p.organization_id = o.id
        and p.status = 'active'
        and p.is_primary = true
    )
)
update public.organization_sites s
set is_primary = true,
    updated_at = now()
from organizations_without_primary m
where s.id = m.site_id
  and m.site_id is not null;

-- Rattachement des anciennes formations et sessions au site principal actif.
with site_map as (
  select
    o.id as organization_id,
    (
      select s.id
      from public.organization_sites s
      where s.organization_id = o.id
        and s.status = 'active'
      order by s.is_primary desc, s.created_at asc, s.id asc
      limit 1
    ) as site_id
  from public.organizations o
  where o.business_type = 'formation'
    and public.organization_has_plan_feature(o.id, 'multi_site')
)
update public.training_programs p
set site_id = m.site_id
from site_map m
where p.organization_id = m.organization_id
  and m.site_id is not null
  and (
    p.site_id is null
    or not exists (
      select 1
      from public.organization_sites current_site
      where current_site.organization_id = p.organization_id
        and current_site.id = p.site_id
        and current_site.status = 'active'
    )
  );

with site_map as (
  select
    o.id as organization_id,
    (
      select s.id
      from public.organization_sites s
      where s.organization_id = o.id
        and s.status = 'active'
      order by s.is_primary desc, s.created_at asc, s.id asc
      limit 1
    ) as site_id
  from public.organizations o
  where o.business_type = 'formation'
    and public.organization_has_plan_feature(o.id, 'multi_site')
)
update public.training_sessions s
set site_id = m.site_id
from site_map m
where s.organization_id = m.organization_id
  and m.site_id is not null
  and (
    s.site_id is null
    or not exists (
      select 1
      from public.organization_sites current_site
      where current_site.organization_id = s.organization_id
        and current_site.id = s.site_id
        and current_site.status = 'active'
    )
  );

alter table public.training_sessions
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references auth.users(id) on delete set null,
  add column if not exists closure_notes text,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by uuid references auth.users(id) on delete set null;

-- Les anciennes sessions déjà terminées apparaissent immédiatement dans « Clôturées ».
update public.training_sessions
set closed_at = coalesce(closed_at, updated_at, ends_at)
where status = 'completed' and closed_at is null;

create or replace function public.training_session_closure_check(
  p_organization_id uuid,
  p_session_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session public.training_sessions%rowtype;
  v_timezone text := 'Europe/Paris';
  v_enrollment_count integer := 0;
  v_expected_attendance integer := 0;
  v_completed_attendance integer := 0;
  v_missing_attendance integer := 0;
  v_documents_count integer := 0;
  v_attestations_count integer := 0;
  v_digital_attendance boolean := false;
  v_session_ended boolean := false;
  v_blockers jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;

  -- Un %ROWTYPE doit être la seule cible de son SELECT en PL/pgSQL.
  -- On charge donc la session puis son fuseau horaire dans deux instructions distinctes.
  select s.*
  into v_session
  from public.training_sessions s
  join public.organizations o on o.id = s.organization_id
  where s.organization_id = p_organization_id
    and s.id = p_session_id
    and o.business_type = 'formation';

  if v_session.id is null then raise exception 'Session introuvable.'; end if;

  select coalesce(o.timezone, 'Europe/Paris')
  into v_timezone
  from public.organizations o
  where o.id = v_session.organization_id;

  select count(*)::integer into v_enrollment_count
  from public.training_session_enrollments
  where organization_id = p_organization_id
    and session_id = p_session_id
    and status <> 'canceled';

  v_digital_attendance := public.organization_has_plan_feature(p_organization_id, 'training_digital_attendance');
  v_session_ended := now() >= v_session.ends_at;

  if v_digital_attendance and v_enrollment_count > 0 then
    select count(*)::integer
    into v_expected_attendance
    from public.training_session_enrollments e
    cross join generate_series(
      (v_session.starts_at at time zone v_timezone)::date,
      (v_session.ends_at at time zone v_timezone)::date,
      interval '1 day'
    ) attendance_day
    cross join (values ('morning'::text), ('afternoon'::text)) periods(period)
    where e.organization_id = p_organization_id
      and e.session_id = p_session_id
      and e.status <> 'canceled';

    select count(*)::integer
    into v_completed_attendance
    from public.training_attendance a
    join public.training_session_enrollments e
      on e.organization_id = a.organization_id
     and e.session_id = a.session_id
     and e.trainee_id = a.trainee_id
     and e.status <> 'canceled'
    where a.organization_id = p_organization_id
      and a.session_id = p_session_id
      and a.status in ('present','absent','excused')
      and a.attendance_date between
        (v_session.starts_at at time zone v_timezone)::date
        and (v_session.ends_at at time zone v_timezone)::date;

    v_missing_attendance := greatest(v_expected_attendance - v_completed_attendance, 0);
  end if;

  select
    count(*)::integer,
    count(*) filter (where category = 'attestation')::integer
  into v_documents_count, v_attestations_count
  from public.training_documents
  where organization_id = p_organization_id
    and session_id = p_session_id
    and status <> 'archived';

  if v_session.status = 'canceled' then
    v_blockers := v_blockers || jsonb_build_array('La session est annulée.');
  end if;
  if v_session.status = 'completed' then
    v_blockers := v_blockers || jsonb_build_array('La session est déjà clôturée.');
  end if;
  if not v_session_ended then
    v_blockers := v_blockers || jsonb_build_array('La date de fin de la session n’est pas encore passée.');
  end if;
  if v_session.trainer_id is null then
    v_blockers := v_blockers || jsonb_build_array('Aucun formateur n’est affecté à la session.');
  end if;
  if v_enrollment_count = 0 then
    v_blockers := v_blockers || jsonb_build_array('Aucun stagiaire n’est inscrit à la session.');
  end if;
  if v_digital_attendance and v_missing_attendance > 0 then
    v_blockers := v_blockers || jsonb_build_array(format('%s émargement(s) restent à compléter.', v_missing_attendance));
  end if;

  return jsonb_build_object(
    'session_id', v_session.id,
    'session_status', v_session.status,
    'session_ended', v_session_ended,
    'trainer_assigned', v_session.trainer_id is not null,
    'enrollment_count', v_enrollment_count,
    'digital_attendance_required', v_digital_attendance,
    'expected_attendance', v_expected_attendance,
    'completed_attendance', v_completed_attendance,
    'missing_attendance', v_missing_attendance,
    'documents_count', v_documents_count,
    'attestations_count', v_attestations_count,
    'can_close', jsonb_array_length(v_blockers) = 0,
    'blockers', v_blockers
  );
end;
$$;

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
    raise exception '%', coalesce(v_check->'blockers'->>0, 'La session ne peut pas être clôturée.');
  end if;

  update public.training_sessions
  set status = 'completed',
      closed_at = now(),
      closed_by = auth.uid(),
      closure_notes = nullif(trim(coalesce(p_closure_notes, '')), ''),
      reopened_at = null,
      reopened_by = null,
      updated_at = now()
  where organization_id = p_organization_id
    and id = p_session_id
    and status <> 'completed';

  if not found then raise exception 'Session introuvable ou déjà clôturée.'; end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'training.session_closed',
    'training_session',
    p_session_id::text,
    jsonb_build_object('closure_notes', nullif(trim(coalesce(p_closure_notes, '')), ''), 'check', v_check)
  );

  select jsonb_build_object(
    'id', id,
    'status', status,
    'closed_at', closed_at,
    'closed_by', closed_by,
    'closure_notes', closure_notes
  ) into v_result
  from public.training_sessions
  where organization_id = p_organization_id and id = p_session_id;

  return v_result;
end;
$$;

create or replace function public.reopen_training_session(
  p_organization_id uuid,
  p_session_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_closed_at timestamptz;
  v_result jsonb;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seul un propriétaire ou un administrateur peut rouvrir une session.';
  end if;

  select closed_at into v_previous_closed_at
  from public.training_sessions
  where organization_id = p_organization_id and id = p_session_id and status = 'completed';

  if v_previous_closed_at is null then raise exception 'Cette session n’est pas clôturée.'; end if;

  perform set_config('ncr.allow_training_session_reopen', '1', true);

  update public.training_sessions
  set status = 'in_progress',
      closed_at = null,
      closed_by = null,
      reopened_at = now(),
      reopened_by = auth.uid(),
      updated_at = now()
  where organization_id = p_organization_id and id = p_session_id and status = 'completed';

  if not found then raise exception 'Session introuvable ou non clôturée.'; end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'training.session_reopened',
    'training_session',
    p_session_id::text,
    jsonb_build_object('reason', nullif(trim(coalesce(p_reason, '')), ''), 'previous_closed_at', v_previous_closed_at)
  );

  select jsonb_build_object(
    'id', id,
    'status', status,
    'reopened_at', reopened_at,
    'reopened_by', reopened_by
  ) into v_result
  from public.training_sessions
  where organization_id = p_organization_id and id = p_session_id;

  return v_result;
end;
$$;

-- Une session terminée ne repasse jamais à un autre statut par le menu classique.
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
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then
    raise exception 'Accès insuffisant.';
  end if;
  if p_status not in ('draft','scheduled','in_progress','canceled') then
    raise exception 'Utilisez la clôture sécurisée pour terminer une session.';
  end if;

  select status into v_current_status
  from public.training_sessions
  where organization_id = p_organization_id and id = p_session_id;

  if v_current_status is null then raise exception 'Session introuvable.'; end if;
  if v_current_status = 'completed' then raise exception 'La session est clôturée. Rouvrez-la avant de la modifier.'; end if;

  update public.training_sessions
  set status = p_status, updated_at = now()
  where organization_id = p_organization_id and id = p_session_id;
end;
$$;

-- Bloque les modifications directes d’une session clôturée. La réouverture passe uniquement par la fonction dédiée.
create or replace function public.prevent_closed_training_session_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.status = 'completed' then
    raise exception 'Une session clôturée ne peut pas être supprimée.';
  end if;
  if tg_op = 'UPDATE' and old.status = 'completed'
     and coalesce(current_setting('ncr.allow_training_session_reopen', true), '') <> '1' then
    raise exception 'La session est clôturée. Utilisez la réouverture administrateur.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists prevent_closed_training_session_change on public.training_sessions;
create trigger prevent_closed_training_session_change
before update or delete on public.training_sessions
for each row execute procedure public.prevent_closed_training_session_change();

-- Les émargements et inscriptions deviennent immuables après clôture.
create or replace function public.prevent_closed_training_session_child_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_session_id uuid;
  v_status text;
begin
  v_organization_id := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  v_session_id := case when tg_op = 'DELETE' then old.session_id else new.session_id end;

  select status into v_status
  from public.training_sessions
  where organization_id = v_organization_id and id = v_session_id;

  if v_status = 'completed' then
    raise exception 'La session est clôturée. Rouvrez-la avant toute modification.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists prevent_closed_training_attendance_change on public.training_attendance;
create trigger prevent_closed_training_attendance_change
before insert or update or delete on public.training_attendance
for each row execute procedure public.prevent_closed_training_session_child_change();

drop trigger if exists prevent_closed_training_enrollment_change on public.training_session_enrollments;
create trigger prevent_closed_training_enrollment_change
before insert or update or delete on public.training_session_enrollments
for each row execute procedure public.prevent_closed_training_session_child_change();

-- Verrouillage également appliqué à l’API d’émargement.
create or replace function public.save_training_attendance(
  p_organization_id uuid,
  p_session_id uuid,
  p_trainee_id uuid,
  p_attendance_date date,
  p_period text,
  p_status text,
  p_signature_path text default null,
  p_signatory_name text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_site_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_session_status text;
  v_timezone text;
  v_start_date date;
  v_end_date date;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then raise exception 'Accès insuffisant.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'training_digital_attendance') then
    raise exception 'L’émargement numérique est disponible avec l’offre Essentielle.';
  end if;
  if p_period not in ('morning','afternoon') then raise exception 'Période invalide.'; end if;
  if p_status not in ('pending','present','absent','excused') then raise exception 'Statut de présence invalide.'; end if;

  select s.site_id, s.starts_at, s.ends_at, s.status, coalesce(o.timezone, 'Europe/Paris')
  into v_site_id, v_starts_at, v_ends_at, v_session_status, v_timezone
  from public.training_sessions s
  join public.organizations o on o.id = s.organization_id
  where s.organization_id = p_organization_id and s.id = p_session_id and o.business_type = 'formation';

  if v_starts_at is null then raise exception 'Session introuvable.'; end if;
  if v_session_status = 'canceled' then raise exception 'La session est annulée.'; end if;
  if v_session_status = 'completed' then raise exception 'La session est clôturée. Rouvrez-la avant de modifier l’émargement.'; end if;

  v_start_date := (v_starts_at at time zone v_timezone)::date;
  v_end_date := (v_ends_at at time zone v_timezone)::date;
  if p_attendance_date < v_start_date or p_attendance_date > v_end_date then raise exception 'La date d’émargement est hors de la session.'; end if;

  if not exists (
    select 1 from public.training_session_enrollments e
    where e.organization_id = p_organization_id and e.session_id = p_session_id and e.trainee_id = p_trainee_id and e.status <> 'canceled'
  ) then raise exception 'Ce stagiaire n’est pas inscrit à la session.'; end if;

  if p_status = 'present' then
    if nullif(trim(coalesce(p_signature_path, '')), '') is null then raise exception 'La signature est obligatoire pour valider la présence.'; end if;
    if nullif(trim(coalesce(p_signatory_name, '')), '') is null then raise exception 'Le nom du signataire est obligatoire.'; end if;
    if public.training_signature_organization_id(p_signature_path) is distinct from p_organization_id then raise exception 'Le fichier de signature ne correspond pas à cette entreprise.'; end if;
  end if;

  insert into public.training_attendance (
    organization_id, site_id, session_id, trainee_id, attendance_date, period,
    status, signature_path, signatory_name, signed_at, captured_by, notes
  ) values (
    p_organization_id, v_site_id, p_session_id, p_trainee_id, p_attendance_date, p_period, p_status,
    case when p_status = 'present' then nullif(trim(p_signature_path), '') else null end,
    case when p_status = 'present' then nullif(trim(p_signatory_name), '') else null end,
    case when p_status = 'present' then now() else null end,
    auth.uid(), nullif(trim(coalesce(p_notes, '')), '')
  )
  on conflict (organization_id, session_id, trainee_id, attendance_date, period)
  do update set site_id = excluded.site_id, status = excluded.status, signature_path = excluded.signature_path,
    signatory_name = excluded.signatory_name, signed_at = excluded.signed_at, captured_by = excluded.captured_by,
    notes = excluded.notes, updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.training_session_closure_check(uuid,uuid) from public;
revoke all on function public.close_training_session(uuid,uuid,text) from public;
revoke all on function public.reopen_training_session(uuid,uuid,text) from public;
revoke all on function public.set_training_session_status(uuid,uuid,text) from public;
revoke all on function public.save_training_attendance(uuid,uuid,uuid,date,text,text,text,text,text) from public;

grant execute on function public.training_session_closure_check(uuid,uuid) to authenticated;
grant execute on function public.close_training_session(uuid,uuid,text) to authenticated;
grant execute on function public.reopen_training_session(uuid,uuid,text) to authenticated;
grant execute on function public.set_training_session_status(uuid,uuid,text) to authenticated;
grant execute on function public.save_training_attendance(uuid,uuid,uuid,date,text,text,text,text,text) to authenticated;

commit;
