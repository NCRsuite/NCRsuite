-- NCR Suite V2.14.1 — Formation : dossier de session centralisé
-- À exécuter après 068_training_commercial_administration.sql.

begin;

alter table public.training_sessions
  add column if not exists training_dossier_requirements jsonb not null default '{}'::jsonb,
  add column if not exists training_dossier_notes text,
  add column if not exists training_dossier_reviewed_at timestamptz,
  add column if not exists training_dossier_reviewed_by uuid references auth.users(id) on delete set null;

alter table public.training_sessions
  drop constraint if exists training_sessions_dossier_requirements_object_check,
  add constraint training_sessions_dossier_requirements_object_check
    check (jsonb_typeof(training_dossier_requirements) = 'object'),
  drop constraint if exists training_sessions_dossier_notes_length_check,
  add constraint training_sessions_dossier_notes_length_check
    check (training_dossier_notes is null or char_length(training_dossier_notes) <= 4000);

create or replace function public.update_training_session_dossier_settings(
  p_organization_id uuid,
  p_session_id uuid,
  p_requirements jsonb default '{}'::jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requirements jsonb := coalesce(p_requirements, '{}'::jsonb);
  v_result jsonb;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Seuls le propriétaire, les administrateurs et les responsables peuvent piloter le dossier de formation.';
  end if;

  if not public.organization_has_plan_feature(p_organization_id, 'training_session_dossier') then
    raise exception 'Le dossier complet de session n’est pas inclus dans cette offre.';
  end if;

  if jsonb_typeof(v_requirements) <> 'object' then
    raise exception 'Les règles du dossier doivent être transmises sous forme d’objet.';
  end if;

  if exists (
    select 1
    from jsonb_each(v_requirements) item
    where item.key not in (
      'commercial',
      'program_document',
      'convocations',
      'attendance',
      'evaluations',
      'certificates',
      'administrative'
    )
       or jsonb_typeof(item.value) <> 'boolean'
  ) then
    raise exception 'Une règle du dossier est invalide.';
  end if;

  update public.training_sessions s
  set training_dossier_requirements = v_requirements,
      training_dossier_notes = nullif(trim(coalesce(p_notes, '')), ''),
      training_dossier_reviewed_at = now(),
      training_dossier_reviewed_by = auth.uid(),
      updated_at = now()
  where s.organization_id = p_organization_id
    and s.id = p_session_id
    and exists (
      select 1
      from public.organizations o
      where o.id = s.organization_id
        and o.business_type = 'formation'
    )
  returning jsonb_build_object(
    'session_id', s.id,
    'requirements', s.training_dossier_requirements,
    'notes', s.training_dossier_notes,
    'reviewed_at', s.training_dossier_reviewed_at,
    'reviewed_by', s.training_dossier_reviewed_by
  ) into v_result;

  if v_result is null then
    raise exception 'Session de formation introuvable.';
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'training.session_dossier_updated',
    'training_session',
    p_session_id::text,
    jsonb_build_object('requirements', v_requirements, 'notes_present', nullif(trim(coalesce(p_notes, '')), '') is not null)
  );

  return v_result;
end;
$$;

revoke all on function public.update_training_session_dossier_settings(uuid,uuid,jsonb,text) from public, anon;
grant execute on function public.update_training_session_dossier_settings(uuid,uuid,jsonb,text) to authenticated;

insert into public.platform_release_state (
  singleton, database_version, expected_frontend_version, expected_pwa_cache,
  installed_at, installed_by, notes
)
values (
  true,
  '2.14.1',
  '2.14.1',
  'ncr-suite-shell-v2.14.1-training-dossiers',
  now(),
  auth.uid(),
  'Formation : espace dossier de session centralisé, contrôle des pièces, suivi de complétude et ergonomie premium PC/mobile.'
)
on conflict(singleton) do update set
  database_version = excluded.database_version,
  expected_frontend_version = excluded.expected_frontend_version,
  expected_pwa_cache = excluded.expected_pwa_cache,
  installed_at = excluded.installed_at,
  installed_by = excluded.installed_by,
  notes = excluded.notes;

commit;
