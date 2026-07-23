-- NCR Suite V2.15.1 — Correctif de création des sessions Formation
-- À exécuter après 071_training_premium_documents_brevo.sql.
-- Corrige la sélection d'établissement pour les offres multi-site et fiabilise
-- la transformation d'une proposition signée en session en préparation.

begin;

-- La portée Formation doit suivre la fonctionnalité multi-site réellement active,
-- et non uniquement le nom historique de l'offre « Métier ».
create or replace function public.validate_training_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_business_type text;
  v_requires_site boolean := false;
begin
  select business_type into v_business_type
  from public.organizations
  where id = new.organization_id;

  if v_business_type is distinct from 'formation' then
    raise exception 'Ce module est réservé aux espaces Formation.';
  end if;

  if tg_table_name in ('training_programs','training_sessions') then
    v_requires_site := public.organization_has_plan_feature(new.organization_id, 'multi_site');

    if v_requires_site then
      if new.site_id is null or not exists (
        select 1
        from public.organization_sites s
        where s.organization_id = new.organization_id
          and s.id = new.site_id
          and s.status = 'active'
      ) then
        raise exception 'Un établissement actif doit être sélectionné.';
      end if;
    else
      new.site_id := null;
    end if;
  end if;

  return new;
end;
$$;

-- Aligne également la création manuelle de session sur les droits multi-site.
create or replace function public.create_training_session(
  p_organization_id uuid,
  p_site_id uuid,
  p_program_id uuid,
  p_trainer_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity integer,
  p_location text,
  p_modality text,
  p_status text,
  p_notes text,
  p_trainee_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_requires_site boolean := false;
  v_trainee_id uuid;
  v_selected_trainees uuid[] := '{}'::uuid[];
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then
    raise exception 'Accès insuffisant.';
  end if;

  if not exists (
    select 1 from public.organizations
    where id = p_organization_id and business_type = 'formation'
  ) then
    raise exception 'Espace Formation introuvable.';
  end if;

  v_requires_site := public.organization_has_plan_feature(p_organization_id, 'multi_site');

  if p_ends_at <= p_starts_at then raise exception 'La date de fin doit être postérieure au début.'; end if;
  if p_capacity not between 1 and 500 then raise exception 'La capacité doit être comprise entre 1 et 500.'; end if;
  if p_modality not in ('presentiel','distanciel','hybride') then raise exception 'Modalité invalide.'; end if;
  if p_status not in ('draft','scheduled','in_progress','completed','canceled') then raise exception 'Statut invalide.'; end if;

  if not exists (
    select 1 from public.training_programs
    where organization_id = p_organization_id and id = p_program_id and status <> 'archived'
  ) then raise exception 'Formation introuvable.'; end if;

  if p_trainer_id is not null and not exists (
    select 1 from public.training_trainers
    where organization_id = p_organization_id and id = p_trainer_id and status = 'active'
  ) then raise exception 'Formateur introuvable ou inactif.'; end if;

  if v_requires_site and (
    p_site_id is null or not exists (
      select 1 from public.organization_sites
      where organization_id = p_organization_id and id = p_site_id and status = 'active'
    )
  ) then
    raise exception 'Établissement introuvable ou inactif.';
  end if;

  select coalesce(array_agg(distinct selected.trainee_id), '{}'::uuid[])
  into v_selected_trainees
  from unnest(coalesce(p_trainee_ids, '{}'::uuid[])) as selected(trainee_id);

  if cardinality(v_selected_trainees) > p_capacity then
    raise exception 'Le nombre de stagiaires dépasse la capacité de la session.';
  end if;

  if exists (
    select 1
    from unnest(v_selected_trainees) as selected(trainee_id)
    where not exists (
      select 1 from public.training_trainees t
      where t.organization_id = p_organization_id
        and t.id = selected.trainee_id
        and t.status = 'active'
    )
  ) then
    raise exception 'Un stagiaire sélectionné est introuvable ou inactif.';
  end if;

  insert into public.training_sessions (
    organization_id, site_id, program_id, trainer_id, title, starts_at, ends_at,
    capacity, location, modality, status, notes, created_by
  ) values (
    p_organization_id, case when v_requires_site then p_site_id else null end,
    p_program_id, p_trainer_id, trim(p_title), p_starts_at, p_ends_at,
    p_capacity, nullif(trim(coalesce(p_location,'')),''), p_modality, p_status,
    nullif(trim(coalesce(p_notes,'')),''), auth.uid()
  ) returning id into v_id;

  foreach v_trainee_id in array v_selected_trainees loop
    insert into public.training_session_enrollments (
      organization_id, session_id, trainee_id, status, created_by
    ) values (p_organization_id, v_id, v_trainee_id, 'registered', auth.uid())
    on conflict (session_id, trainee_id) do nothing;
  end loop;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.session_created', 'training_session', v_id::text,
    jsonb_build_object(
      'program_id', p_program_id,
      'trainer_id', p_trainer_id,
      'site_id', case when v_requires_site then p_site_id else null end,
      'trainee_count', cardinality(v_selected_trainees)
    )
  );

  return v_id;
end;
$$;

-- La nouvelle signature reçoit explicitement l'établissement choisi dans le cockpit.
drop function if exists public.create_training_session_from_commercial(
  uuid, uuid, timestamptz, timestamptz, uuid, integer, text, uuid[]
);

create or replace function public.create_training_session_from_commercial(
  p_organization_id uuid,
  p_document_id uuid,
  p_site_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_trainer_id uuid,
  p_capacity integer,
  p_location text,
  p_trainee_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document public.training_commercial_documents%rowtype;
  v_program public.training_programs%rowtype;
  v_session_id uuid;
  v_trainee_id uuid;
  v_site_id uuid;
  v_requires_site boolean := false;
  v_selected_trainees uuid[] := '{}'::uuid[];
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

  v_requires_site := public.organization_has_plan_feature(p_organization_id, 'multi_site');

  select * into v_document
  from public.training_commercial_documents
  where organization_id = p_organization_id and id = p_document_id
  for update;

  if v_document.id is null then raise exception 'Document commercial introuvable.'; end if;
  if v_document.status <> 'signed' then raise exception 'Le devis, la convention ou le contrat doit être marqué comme signé.'; end if;
  if v_document.session_id is not null then raise exception 'Une session est déjà rattachée à ce document.'; end if;
  if v_document.program_id is null then raise exception 'Aucune formation complète n’est rattachée à ce document.'; end if;
  if p_ends_at <= p_starts_at then raise exception 'La date de fin doit être postérieure au début.'; end if;
  if p_capacity not between 1 and 500 then raise exception 'La capacité doit être comprise entre 1 et 500.'; end if;

  select * into v_program
  from public.training_programs
  where organization_id = p_organization_id
    and id = v_document.program_id
    and status <> 'archived';

  if v_program.id is null then raise exception 'Formation introuvable.'; end if;
  if v_program.completion_status <> 'ready' then
    raise exception 'La fiche formation doit être complétée avant de créer la session.';
  end if;

  v_site_id := case
    when v_requires_site then coalesce(p_site_id, v_document.site_id, v_program.site_id)
    else null
  end;

  if v_requires_site and (
    v_site_id is null or not exists (
      select 1 from public.organization_sites s
      where s.organization_id = p_organization_id
        and s.id = v_site_id
        and s.status = 'active'
    )
  ) then
    raise exception 'Sélectionne un établissement actif pour cette session.';
  end if;

  if p_trainer_id is null or not exists (
    select 1 from public.training_trainers
    where organization_id = p_organization_id and id = p_trainer_id and status = 'active'
  ) then
    raise exception 'Sélectionne un formateur actif.';
  end if;

  select coalesce(array_agg(distinct selected.trainee_id), '{}'::uuid[])
  into v_selected_trainees
  from unnest(coalesce(p_trainee_ids, '{}'::uuid[])) as selected(trainee_id);

  if v_document.trainee_id is not null and not (v_document.trainee_id = any(v_selected_trainees)) then
    v_selected_trainees := array_append(v_selected_trainees, v_document.trainee_id);
  end if;

  if cardinality(v_selected_trainees) = 0 then
    raise exception 'Ajoute au moins un stagiaire avant de créer la session.';
  end if;
  if cardinality(v_selected_trainees) > p_capacity then
    raise exception 'Le nombre de stagiaires dépasse la capacité de la session.';
  end if;

  if exists (
    select 1
    from unnest(v_selected_trainees) as selected(trainee_id)
    where not exists (
      select 1 from public.training_trainees t
      where t.organization_id = p_organization_id
        and t.id = selected.trainee_id
        and t.status = 'active'
    )
  ) then
    raise exception 'Un stagiaire sélectionné est introuvable ou inactif.';
  end if;

  insert into public.training_sessions (
    organization_id, site_id, program_id, trainer_id, title, starts_at, ends_at,
    capacity, location, modality, status, notes, source_commercial_document_id, created_by
  ) values (
    p_organization_id, v_site_id, v_program.id, p_trainer_id,
    v_program.title, p_starts_at, p_ends_at, p_capacity,
    coalesce(nullif(trim(coalesce(p_location, '')), ''), v_program.default_location),
    v_program.modality, 'draft',
    concat('Créée depuis ', v_document.reference), v_document.id, auth.uid()
  ) returning id into v_session_id;

  foreach v_trainee_id in array v_selected_trainees loop
    insert into public.training_session_enrollments (
      organization_id, session_id, trainee_id, status, created_by
    ) values (
      p_organization_id, v_session_id, v_trainee_id, 'confirmed', auth.uid()
    ) on conflict (session_id, trainee_id) do nothing;
  end loop;

  update public.training_commercial_documents
  set session_id = v_session_id,
      status = 'completed',
      updated_at = now()
  where organization_id = p_organization_id and id = v_document.id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.commercial_converted_to_session', 'training_session', v_session_id::text,
    jsonb_build_object(
      'commercial_document_id', v_document.id,
      'reference', v_document.reference,
      'site_id', v_site_id,
      'trainee_count', cardinality(v_selected_trainees)
    )
  );

  return jsonb_build_object(
    'session_id', v_session_id,
    'commercial_document_id', v_document.id,
    'trainee_count', cardinality(v_selected_trainees),
    'status', 'draft'
  );
end;
$$;

revoke all on function public.create_training_session_from_commercial(
  uuid, uuid, uuid, timestamptz, timestamptz, uuid, integer, text, uuid[]
) from public, anon;
grant execute on function public.create_training_session_from_commercial(
  uuid, uuid, uuid, timestamptz, timestamptz, uuid, integer, text, uuid[]
) to authenticated;

insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
select null, auth.uid(), 'platform.training_session_creation_hotfix_applied', 'platform_release', '2.15.1-hotfix',
       jsonb_build_object('migration', '072_training_session_creation_hotfix')
where auth.uid() is not null;

-- Force PostgREST à prendre immédiatement en compte la nouvelle signature RPC.
notify pgrst, 'reload schema';

commit;
