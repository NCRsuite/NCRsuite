-- NCR Suite V2.15.0 — Formation : parcours unifié, formations complètes et cockpit de session
-- À exécuter après 069_training_session_dossier_workspace.sql.

begin;

-- Profil de l'organisme : les informations légales et de contact sont saisies une seule fois.
alter table public.organizations
  add column if not exists training_nda_number text,
  add column if not exists training_legal_representative text,
  add column if not exists training_reply_to_email text,
  add column if not exists training_vat_number text,
  add column if not exists training_document_footer text,
  add column if not exists training_default_terms text,
  add column if not exists training_default_vat_basis_points integer not null default 0,
  add column if not exists training_signature_url text,
  add column if not exists training_stamp_url text;

alter table public.organizations
  drop constraint if exists organizations_training_nda_number_length_check,
  add constraint organizations_training_nda_number_length_check
    check (training_nda_number is null or char_length(training_nda_number) <= 120),
  drop constraint if exists organizations_training_legal_representative_length_check,
  add constraint organizations_training_legal_representative_length_check
    check (training_legal_representative is null or char_length(training_legal_representative) <= 180),
  drop constraint if exists organizations_training_reply_to_email_length_check,
  add constraint organizations_training_reply_to_email_length_check
    check (training_reply_to_email is null or char_length(training_reply_to_email) <= 254),
  drop constraint if exists organizations_training_vat_number_length_check,
  add constraint organizations_training_vat_number_length_check
    check (training_vat_number is null or char_length(training_vat_number) <= 80),
  drop constraint if exists organizations_training_document_footer_length_check,
  add constraint organizations_training_document_footer_length_check
    check (training_document_footer is null or char_length(training_document_footer) <= 1500),
  drop constraint if exists organizations_training_default_terms_length_check,
  add constraint organizations_training_default_terms_length_check
    check (training_default_terms is null or char_length(training_default_terms) <= 5000),
  drop constraint if exists organizations_training_default_vat_basis_points_check,
  add constraint organizations_training_default_vat_basis_points_check
    check (training_default_vat_basis_points between 0 and 10000);

-- Une formation devient un modèle complet et réutilisable pour le commercial et les sessions.
alter table public.training_programs
  add column if not exists audience text,
  add column if not exists prerequisites text,
  add column if not exists detailed_program text,
  add column if not exists teaching_methods text,
  add column if not exists training_resources text,
  add column if not exists assessment_methods text,
  add column if not exists accessibility text,
  add column if not exists price_excl_tax_cents integer not null default 0,
  add column if not exists vat_rate_basis_points integer not null default 0,
  add column if not exists default_capacity integer not null default 12,
  add column if not exists default_location text,
  add column if not exists completion_status text not null default 'draft';

alter table public.training_programs
  drop constraint if exists training_programs_price_check,
  add constraint training_programs_price_check check (price_excl_tax_cents >= 0),
  drop constraint if exists training_programs_vat_rate_check,
  add constraint training_programs_vat_rate_check check (vat_rate_basis_points between 0 and 10000),
  drop constraint if exists training_programs_default_capacity_check,
  add constraint training_programs_default_capacity_check check (default_capacity between 1 and 500),
  drop constraint if exists training_programs_completion_status_check,
  add constraint training_programs_completion_status_check check (completion_status in ('draft','ready')),
  drop constraint if exists training_programs_audience_length_check,
  add constraint training_programs_audience_length_check check (audience is null or char_length(audience) <= 4000),
  drop constraint if exists training_programs_prerequisites_length_check,
  add constraint training_programs_prerequisites_length_check check (prerequisites is null or char_length(prerequisites) <= 4000),
  drop constraint if exists training_programs_detailed_program_length_check,
  add constraint training_programs_detailed_program_length_check check (detailed_program is null or char_length(detailed_program) <= 20000),
  drop constraint if exists training_programs_methods_length_check,
  add constraint training_programs_methods_length_check check (teaching_methods is null or char_length(teaching_methods) <= 8000),
  drop constraint if exists training_programs_resources_length_check,
  add constraint training_programs_resources_length_check check (training_resources is null or char_length(training_resources) <= 8000),
  drop constraint if exists training_programs_assessment_length_check,
  add constraint training_programs_assessment_length_check check (assessment_methods is null or char_length(assessment_methods) <= 8000),
  drop constraint if exists training_programs_accessibility_length_check,
  add constraint training_programs_accessibility_length_check check (accessibility is null or char_length(accessibility) <= 4000);

create or replace function public.refresh_training_program_completion_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.completion_status := case
    when nullif(trim(coalesce(new.title, '')), '') is not null
     and coalesce(new.duration_hours, 0) > 0
     and nullif(trim(coalesce(new.objectives, '')), '') is not null
     and nullif(trim(coalesce(new.audience, '')), '') is not null
     and nullif(trim(coalesce(new.prerequisites, '')), '') is not null
     and nullif(trim(coalesce(new.detailed_program, '')), '') is not null
     and nullif(trim(coalesce(new.teaching_methods, '')), '') is not null
     and nullif(trim(coalesce(new.assessment_methods, '')), '') is not null
     and nullif(trim(coalesce(new.accessibility, '')), '') is not null
    then 'ready'
    else 'draft'
  end;
  return new;
end;
$$;

drop trigger if exists refresh_training_program_completion_status on public.training_programs;
create trigger refresh_training_program_completion_status
before insert or update on public.training_programs
for each row execute procedure public.refresh_training_program_completion_status();

-- Recalcule les formations existantes sans inventer les informations manquantes.
update public.training_programs set updated_at = updated_at;

create table if not exists public.training_program_trainers (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null,
  trainer_id uuid not null,
  is_primary boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (program_id, trainer_id),
  constraint training_program_trainers_program_fk foreign key (organization_id, program_id)
    references public.training_programs(organization_id, id) on delete cascade,
  constraint training_program_trainers_trainer_fk foreign key (organization_id, trainer_id)
    references public.training_trainers(organization_id, id) on delete cascade
);

create index if not exists idx_training_program_trainers_org_program
  on public.training_program_trainers(organization_id, program_id);

alter table public.training_program_trainers enable row level security;
revoke all on public.training_program_trainers from anon;
grant select, insert, update, delete on public.training_program_trainers to authenticated;

drop policy if exists training_program_trainers_select on public.training_program_trainers;
create policy training_program_trainers_select
on public.training_program_trainers for select
to authenticated
using (public.is_org_member(organization_id));

drop policy if exists training_program_trainers_manage on public.training_program_trainers;
create policy training_program_trainers_manage
on public.training_program_trainers for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager','employee']))
with check (public.has_org_role(organization_id, array['owner','admin','manager','employee']));

-- Le document commercial garde le modèle choisi et le retour signé.
alter table public.training_commercial_documents
  add column if not exists program_id uuid,
  add column if not exists signed_document_path text,
  add column if not exists signed_document_received_at timestamptz,
  add column if not exists signed_document_received_by uuid references auth.users(id) on delete set null;

alter table public.training_commercial_documents
  drop constraint if exists training_commercial_program_fk,
  add constraint training_commercial_program_fk foreign key (organization_id, program_id)
    references public.training_programs(organization_id, id) on delete restrict,
  drop constraint if exists training_commercial_signed_path_length_check,
  add constraint training_commercial_signed_path_length_check
    check (signed_document_path is null or char_length(signed_document_path) <= 1200);

create index if not exists idx_training_commercial_program
  on public.training_commercial_documents(organization_id, program_id, status);

update public.training_commercial_documents d
set program_id = s.program_id
from public.training_sessions s
where d.organization_id = s.organization_id
  and d.session_id = s.id
  and d.program_id is null;

-- La session sait d'où elle vient et si l'utilisateur l'a réellement validée.
alter table public.training_sessions
  add column if not exists source_commercial_document_id uuid,
  add column if not exists validated_at timestamptz,
  add column if not exists validated_by uuid references auth.users(id) on delete set null;

alter table public.training_sessions
  drop constraint if exists training_sessions_source_commercial_fk,
  add constraint training_sessions_source_commercial_fk foreign key (organization_id, source_commercial_document_id)
    references public.training_commercial_documents(organization_id, id) on delete restrict;

create index if not exists idx_training_sessions_source_commercial
  on public.training_sessions(organization_id, source_commercial_document_id);

create or replace function public.update_training_organization_profile(
  p_organization_id uuid,
  p_public_name text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_address text,
  p_postal_code text,
  p_city text,
  p_siret text,
  p_nda_number text,
  p_legal_representative text,
  p_reply_to_email text,
  p_vat_number text,
  p_document_footer text,
  p_default_terms text,
  p_default_vat_basis_points integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seuls le propriétaire et les administrateurs peuvent modifier le profil de l’organisme.';
  end if;

  if not exists (
    select 1 from public.organizations
    where id = p_organization_id and business_type = 'formation'
  ) then
    raise exception 'Espace Formation introuvable.';
  end if;

  if coalesce(p_default_vat_basis_points, 0) not between 0 and 10000 then
    raise exception 'Le taux de TVA par défaut est invalide.';
  end if;

  if nullif(trim(coalesce(p_reply_to_email, '')), '') is not null
     and trim(p_reply_to_email) !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'L’adresse de retour est invalide.';
  end if;

  update public.organizations
  set public_name = coalesce(nullif(trim(coalesce(p_public_name, '')), ''), name),
      company_contact_name = nullif(trim(coalesce(p_contact_name, '')), ''),
      company_email = nullif(lower(trim(coalesce(p_email, ''))), ''),
      company_phone = nullif(trim(coalesce(p_phone, '')), ''),
      company_address = nullif(trim(coalesce(p_address, '')), ''),
      company_postal_code = nullif(trim(coalesce(p_postal_code, '')), ''),
      company_city = nullif(trim(coalesce(p_city, '')), ''),
      company_siret = nullif(trim(coalesce(p_siret, '')), ''),
      training_nda_number = nullif(trim(coalesce(p_nda_number, '')), ''),
      training_legal_representative = nullif(trim(coalesce(p_legal_representative, '')), ''),
      training_reply_to_email = nullif(lower(trim(coalesce(p_reply_to_email, ''))), ''),
      training_vat_number = nullif(trim(coalesce(p_vat_number, '')), ''),
      training_document_footer = nullif(trim(coalesce(p_document_footer, '')), ''),
      training_default_terms = nullif(trim(coalesce(p_default_terms, '')), ''),
      training_default_vat_basis_points = coalesce(p_default_vat_basis_points, 0),
      updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.organization_profile_updated', 'organization', p_organization_id::text,
    jsonb_build_object('nda_present', nullif(trim(coalesce(p_nda_number, '')), '') is not null,
                       'reply_to_present', nullif(trim(coalesce(p_reply_to_email, '')), '') is not null)
  );
end;
$$;

revoke all on function public.update_training_organization_profile(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer) from public, anon;
grant execute on function public.update_training_organization_profile(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer) to authenticated;

create or replace function public.create_training_session_from_commercial(
  p_organization_id uuid,
  p_document_id uuid,
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
  v_plan text;
  v_selected_trainees uuid[] := '{}'::uuid[];
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;

  select plan into v_plan
  from public.organizations
  where id = p_organization_id and business_type = 'formation';
  if v_plan is null then raise exception 'Espace Formation introuvable.'; end if;

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
  where organization_id = p_organization_id and id = v_document.program_id and status <> 'archived';
  if v_program.id is null then raise exception 'Formation introuvable.'; end if;
  if v_program.completion_status <> 'ready' then
    raise exception 'La fiche formation doit être complétée avant de créer la session.';
  end if;

  v_site_id := coalesce(v_document.site_id, v_program.site_id);
  if v_plan = 'metier' and (v_site_id is null or not exists (
    select 1 from public.organization_sites s
    where s.organization_id = p_organization_id and s.id = v_site_id and s.status = 'active'
  )) then
    raise exception 'Sélectionne un établissement actif pour cette session.';
  end if;
  if v_plan <> 'metier' then v_site_id := null; end if;

  if p_trainer_id is null or not exists (
    select 1 from public.training_trainers
    where organization_id = p_organization_id and id = p_trainer_id and status = 'active'
  ) then
    raise exception 'Sélectionne un formateur actif.';
  end if;

  select coalesce(array_agg(distinct trainee_id), '{}'::uuid[])
  into v_selected_trainees
  from unnest(coalesce(p_trainee_ids, '{}'::uuid[])) trainee_id;
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
    select 1 from unnest(v_selected_trainees) trainee_id
    where not exists (
      select 1 from public.training_trainees t
      where t.organization_id = p_organization_id and t.id = trainee_id and t.status = 'active'
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
    jsonb_build_object('commercial_document_id', v_document.id, 'reference', v_document.reference,
                       'trainee_count', cardinality(v_selected_trainees))
  );

  return jsonb_build_object(
    'session_id', v_session_id,
    'commercial_document_id', v_document.id,
    'trainee_count', cardinality(v_selected_trainees),
    'status', 'draft'
  );
end;
$$;

revoke all on function public.create_training_session_from_commercial(uuid,uuid,timestamptz,timestamptz,uuid,integer,text,uuid[]) from public, anon;
grant execute on function public.create_training_session_from_commercial(uuid,uuid,timestamptz,timestamptz,uuid,integer,text,uuid[]) to authenticated;

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
  v_queued integer := 0;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;

  select * into v_session
  from public.training_sessions
  where organization_id = p_organization_id and id = p_session_id
  for update;
  if v_session.id is null then raise exception 'Session introuvable.'; end if;
  if v_session.status <> 'draft' then raise exception 'Seule une session en préparation peut être validée.'; end if;
  if v_session.trainer_id is null then raise exception 'Aucun formateur n’est affecté à la session.'; end if;

  select * into v_program
  from public.training_programs
  where organization_id = p_organization_id and id = v_session.program_id and status <> 'archived';
  if v_program.id is null then raise exception 'Formation introuvable.'; end if;
  if v_program.completion_status <> 'ready' then
    raise exception 'La fiche formation doit être complétée avant la validation de la session.';
  end if;

  select count(*)::integer,
         count(*) filter (
           where nullif(trim(coalesce(t.email, '')), '') is null
              or trim(t.email) !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
         )::integer
  into v_enrollment_count, v_missing_email_count
  from public.training_session_enrollments e
  join public.training_trainees t
    on t.organization_id = e.organization_id and t.id = e.trainee_id
  where e.organization_id = p_organization_id
    and e.session_id = p_session_id
    and e.status <> 'canceled';

  if v_enrollment_count = 0 then raise exception 'Ajoute au moins un stagiaire à la session.'; end if;
  if p_send_convocations and v_missing_email_count > 0 then
    raise exception '% stagiaire(s) n’ont pas d’adresse e-mail valide pour recevoir leur convocation.', v_missing_email_count;
  end if;

  update public.training_sessions
  set status = 'scheduled',
      validated_at = now(),
      validated_by = auth.uid(),
      updated_at = now()
  where organization_id = p_organization_id and id = p_session_id;

  if p_send_convocations then
    insert into public.training_document_jobs (
      organization_id, site_id, session_id, trainee_id, document_kind,
      generation_version, send_email, status, attempts, scheduled_for, created_by
    )
    select
      e.organization_id,
      v_session.site_id,
      e.session_id,
      e.trainee_id,
      'convocation',
      coalesce((
        select max(existing.generation_version)
        from public.training_document_jobs existing
        where existing.organization_id = e.organization_id
          and existing.session_id = e.session_id
          and existing.trainee_id = e.trainee_id
          and existing.document_kind = 'convocation'
      ), 0) + 1,
      true,
      'pending',
      0,
      now(),
      auth.uid()
    from public.training_session_enrollments e
    where e.organization_id = p_organization_id
      and e.session_id = p_session_id
      and e.status <> 'canceled'
      and not exists (
        select 1
        from public.training_document_jobs existing
        where existing.organization_id = e.organization_id
          and existing.session_id = e.session_id
          and existing.trainee_id = e.trainee_id
          and existing.document_kind = 'convocation'
          and existing.status in ('pending','processing','completed')
      );
    get diagnostics v_queued = row_count;
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.session_validated', 'training_session', p_session_id::text,
    jsonb_build_object('enrollment_count', v_enrollment_count, 'convocations_queued', v_queued,
                       'send_convocations', p_send_convocations)
  );

  return jsonb_build_object(
    'session_id', p_session_id,
    'status', 'scheduled',
    'enrollment_count', v_enrollment_count,
    'convocations_queued', v_queued
  );
end;
$$;

revoke all on function public.validate_training_session_workflow(uuid,uuid,boolean) from public, anon;
grant execute on function public.validate_training_session_workflow(uuid,uuid,boolean) to authenticated;

insert into public.platform_release_state (
  singleton, database_version, expected_frontend_version, expected_pwa_cache,
  installed_at, installed_by, notes
)
values (
  true,
  '2.15.0',
  '2.15.0',
  'ncr-suite-shell-v2.15.0-training-workflow',
  now(),
  auth.uid(),
  'Formation : profil organisme unique, formations complètes, documents commerciaux liés et cockpit de session unifié.'
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
