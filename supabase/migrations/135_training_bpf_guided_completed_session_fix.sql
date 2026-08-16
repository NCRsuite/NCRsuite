-- NCR Suite V2.29.21 — Hotfix Assistant BPF · sessions clôturées
-- À exécuter après 134_training_premium_documents_release.sql.
--
-- Problème corrigé :
-- le BPF ne travaille que sur des sessions clôturées, alors que les garde-fous
-- de clôture interdisaient les UPDATE directs sur training_sessions et
-- training_session_enrollments. Le mode guidé ne pouvait donc pas qualifier
-- la nature réglementaire, le mode de réalisation ni la catégorie BPF des stagiaires.
--
-- Ce hotfix ne rouvre jamais une session et ne modifie aucune donnée pédagogique.
-- Il expose uniquement quatre RPC dédiées aux métadonnées BPF.

begin;

-- -----------------------------------------------------------------------------
-- Autorise le garde-fou des enfants d'une session clôturée à laisser passer
-- UNIQUEMENT une mise à jour effectuée par une RPC BPF dédiée dans sa transaction.
-- L'émargement et toutes les autres modifications restent verrouillés.
-- -----------------------------------------------------------------------------
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
    if tg_op = 'UPDATE'
       and tg_table_name = 'training_session_enrollments'
       and coalesce(current_setting('ncr.allow_training_bpf_metadata_update', true), '') = '1' then
      return new;
    end if;
    raise exception 'La session est clôturée. Rouvrez-la avant toute modification.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Utilitaire interne : refuse toute modification BPF d'un exercice déjà verrouillé.
create or replace function public.assert_training_bpf_period_is_editable(
  p_organization_id uuid,
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_session_date date;
begin
  select s.ends_at::date into v_session_date
  from public.training_sessions s
  where s.organization_id = p_organization_id
    and s.id = p_session_id;

  if v_session_date is null then
    raise exception 'Session introuvable.';
  end if;

  if exists (
    select 1
    from public.training_bpf_reports r
    where r.organization_id = p_organization_id
      and r.status = 'locked'
      and v_session_date between r.exercise_start and r.exercise_end
  ) then
    raise exception 'Le BPF de cet exercice est verrouillé. Déverrouillez-le avant de modifier sa qualification.';
  end if;
end;
$$;

revoke all on function public.assert_training_bpf_period_is_editable(uuid,uuid) from public, anon, authenticated;
grant execute on function public.assert_training_bpf_period_is_editable(uuid,uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Qualification réglementaire d'une session clôturée.
-- -----------------------------------------------------------------------------
create or replace function public.set_training_bpf_session_regulatory_scope(
  p_organization_id uuid,
  p_session_id uuid,
  p_scope text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null
     or not public.training_member_has_module_access(
       p_organization_id,
       'sessions',
       array['owner','admin','manager']::text[]
     ) then
    raise exception 'Accès insuffisant pour qualifier cette session.';
  end if;

  if p_scope not in ('review_required','professional_continuing','apprenticeship','initial_education','out_of_scope') then
    raise exception 'Nature réglementaire BPF invalide.';
  end if;

  perform public.assert_training_bpf_period_is_editable(p_organization_id, p_session_id);
  perform set_config('ncr.allow_training_session_reopen', '1', true);

  update public.training_sessions
  set bpf_regulatory_scope = p_scope,
      updated_at = now()
  where organization_id = p_organization_id
    and id = p_session_id;

  if not found then raise exception 'Session introuvable.'; end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Mode de réalisation BPF (direct / sous-traité / réalisé pour un autre OF).
-- -----------------------------------------------------------------------------
create or replace function public.set_training_bpf_session_delivery_mode(
  p_organization_id uuid,
  p_session_id uuid,
  p_delivery_mode text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null
     or not public.training_member_has_module_access(
       p_organization_id,
       'sessions',
       array['owner','admin','manager']::text[]
     ) then
    raise exception 'Accès insuffisant pour classer cette session.';
  end if;

  if p_delivery_mode not in ('direct','outsourced_by_us','subcontracted_for_other') then
    raise exception 'Mode de réalisation BPF invalide.';
  end if;

  perform public.assert_training_bpf_period_is_editable(p_organization_id, p_session_id);
  perform set_config('ncr.allow_training_session_reopen', '1', true);

  update public.training_sessions
  set bpf_delivery_mode = p_delivery_mode,
      updated_at = now()
  where organization_id = p_organization_id
    and id = p_session_id;

  if not found then raise exception 'Session introuvable.'; end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Catégorie BPF d'un stagiaire d'une session clôturée.
-- -----------------------------------------------------------------------------
create or replace function public.set_training_bpf_enrollment_trainee_type(
  p_organization_id uuid,
  p_session_id uuid,
  p_trainee_id uuid,
  p_trainee_type text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null
     or not public.training_member_has_module_access(
       p_organization_id,
       'sessions',
       array['owner','admin','manager']::text[]
     ) then
    raise exception 'Accès insuffisant pour classer ce stagiaire.';
  end if;

  if p_trainee_type not in ('private_employee','apprentice','jobseeker','individual','other') then
    raise exception 'Catégorie BPF du stagiaire invalide.';
  end if;

  perform public.assert_training_bpf_period_is_editable(p_organization_id, p_session_id);
  perform set_config('ncr.allow_training_bpf_metadata_update', '1', true);

  update public.training_session_enrollments
  set bpf_trainee_type = p_trainee_type,
      updated_at = now()
  where organization_id = p_organization_id
    and session_id = p_session_id
    and trainee_id = p_trainee_id
    and status <> 'canceled';

  if not found then raise exception 'Inscription active introuvable.'; end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Classement en masse de tous les stagiaires actifs de la session.
-- -----------------------------------------------------------------------------
create or replace function public.set_training_bpf_session_trainee_type(
  p_organization_id uuid,
  p_session_id uuid,
  p_trainee_type text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count integer;
begin
  if auth.uid() is null
     or not public.training_member_has_module_access(
       p_organization_id,
       'sessions',
       array['owner','admin','manager']::text[]
     ) then
    raise exception 'Accès insuffisant pour classer les stagiaires.';
  end if;

  if p_trainee_type not in ('private_employee','apprentice','jobseeker','individual','other') then
    raise exception 'Catégorie BPF du stagiaire invalide.';
  end if;

  perform public.assert_training_bpf_period_is_editable(p_organization_id, p_session_id);
  perform set_config('ncr.allow_training_bpf_metadata_update', '1', true);

  update public.training_session_enrollments
  set bpf_trainee_type = p_trainee_type,
      updated_at = now()
  where organization_id = p_organization_id
    and session_id = p_session_id
    and status <> 'canceled';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.set_training_bpf_session_regulatory_scope(uuid,uuid,text) from public, anon;
revoke all on function public.set_training_bpf_session_delivery_mode(uuid,uuid,text) from public, anon;
revoke all on function public.set_training_bpf_enrollment_trainee_type(uuid,uuid,uuid,text) from public, anon;
revoke all on function public.set_training_bpf_session_trainee_type(uuid,uuid,text) from public, anon;

grant execute on function public.set_training_bpf_session_regulatory_scope(uuid,uuid,text) to authenticated, service_role;
grant execute on function public.set_training_bpf_session_delivery_mode(uuid,uuid,text) to authenticated, service_role;
grant execute on function public.set_training_bpf_enrollment_trainee_type(uuid,uuid,uuid,text) to authenticated, service_role;
grant execute on function public.set_training_bpf_session_trainee_type(uuid,uuid,text) to authenticated, service_role;

-- Release state.
insert into public.platform_release_state(
  singleton,
  database_version,
  expected_frontend_version,
  expected_pwa_cache,
  installed_at,
  installed_by,
  notes
)
values(
  true,
  '2.29.21',
  '2.29.21',
  'ncr-suite-shell-v2.29.21-training-bpf-guided-hotfix',
  now(),
  auth.uid(),
  'V2.29.21 : hotfix BPF guidé — qualification réglementaire, mode de réalisation et catégories stagiaires modifiables de façon sécurisée après clôture, sans rouvrir les sessions.'
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
