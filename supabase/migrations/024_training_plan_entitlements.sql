-- NCR Suite V2.4.9 — droits réels des offres Formation
-- À exécuter après 023_training_satisfaction.sql et après les migrations d'automatisation des documents déjà présentes en production.

begin;

-- 1. Catalogue commercial Formation : matrice validée par NCR Solutions.
update public.domain_plan_catalog
set features = case plan_key
  when 'decouverte' then '{
    "training_programs":true,
    "training_trainees":true,
    "training_trainers":true,
    "training_sessions":true,
    "training_documents":true,
    "training_blank_attendance":true,
    "training_automatic_certificates":true
  }'::jsonb
  when 'essentielle' then '{
    "training_programs":true,
    "training_trainees":true,
    "training_trainers":true,
    "training_sessions":true,
    "training_documents":true,
    "training_blank_attendance":true,
    "training_automatic_certificates":true,
    "training_digital_attendance":true,
    "training_attendance_pdf":true,
    "commercial_branding":true,
    "training_document_branding":true,
    "training_email_branding":true
  }'::jsonb
  when 'professionnelle' then '{
    "training_programs":true,
    "training_trainees":true,
    "training_trainers":true,
    "training_sessions":true,
    "training_documents":true,
    "training_blank_attendance":true,
    "training_automatic_certificates":true,
    "training_digital_attendance":true,
    "training_attendance_pdf":true,
    "commercial_branding":true,
    "training_document_branding":true,
    "training_email_branding":true,
    "training_satisfaction":true,
    "training_session_dossier":true,
    "multi_site":true,
    "team_access":true,
    "manager_role":true
  }'::jsonb
  when 'metier' then '{
    "training_programs":true,
    "training_trainees":true,
    "training_trainers":true,
    "training_sessions":true,
    "training_documents":true,
    "training_blank_attendance":true,
    "training_automatic_certificates":true,
    "training_digital_attendance":true,
    "training_attendance_pdf":true,
    "commercial_branding":true,
    "training_document_branding":true,
    "training_email_branding":true,
    "training_satisfaction":true,
    "training_session_dossier":true,
    "multi_site":true,
    "team_access":true,
    "manager_role":true,
    "white_label":true,
    "custom_modules":true,
    "custom_roles":true,
    "custom_domain":true
  }'::jsonb
end,
short_description = case plan_key
  when 'decouverte' then 'Le socle Formation avec documents, feuille d’émargement vierge et attestations automatiques.'
  when 'essentielle' then 'Ajoute l’émargement numérique et la personnalisation des documents et e-mails.'
  when 'professionnelle' then 'Ajoute les évaluations, le dossier complet, le multi-site et les accès employés avec rôles.'
  when 'metier' then 'Modules, rôles, limites et identité configurés sur mesure selon le contrat.'
end,
recommended = (plan_key = 'essentielle'),
updated_at = now()
where business_type = 'formation';

create or replace function public.organization_has_plan_feature(
  p_organization_id uuid,
  p_feature text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_type text;
  v_plan text;
  v_status text;
  v_metier_modules_configured boolean;
  v_features jsonb;
  v_module_key text;
begin
  select o.business_type, o.plan, o.status, coalesce(o.metier_modules_configured, false), d.features
  into v_business_type, v_plan, v_status, v_metier_modules_configured, v_features
  from public.organizations o
  left join public.domain_plan_catalog d
    on d.business_type = o.business_type
   and d.plan_key = o.plan
   and d.active = true
  where o.id = p_organization_id;

  if v_business_type is null or v_status not in ('trial','active') then return false; end if;
  if not coalesce((v_features ->> p_feature)::boolean, false) then return false; end if;

  if v_business_type = 'formation' and v_plan = 'metier' and v_metier_modules_configured then
    v_module_key := case p_feature
      when 'training_programs' then 'training_programs'
      when 'training_trainees' then 'trainees'
      when 'training_trainers' then 'trainers'
      when 'training_sessions' then 'sessions'
      when 'training_documents' then 'documents'
      when 'training_blank_attendance' then 'attendance'
      when 'training_digital_attendance' then 'attendance'
      when 'training_attendance_pdf' then 'attendance'
      when 'training_automatic_certificates' then 'certificates'
      when 'commercial_branding' then 'commercial_branding'
      when 'training_document_branding' then 'commercial_branding'
      when 'training_email_branding' then 'commercial_branding'
      when 'training_satisfaction' then 'evaluations'
      when 'training_session_dossier' then 'documents'
      when 'multi_site' then 'sites'
      when 'team_access' then 'team_access'
      when 'manager_role' then 'team_access'
      else null
    end;

    if v_module_key is not null then
      return exists (
        select 1 from public.organization_modules m
        where m.organization_id = p_organization_id
          and m.module_key = v_module_key
          and m.enabled = true
      );
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.organization_has_plan_feature(uuid,text) from public;
grant execute on function public.organization_has_plan_feature(uuid,text) to authenticated, service_role;

-- 2. Multi-site Formation : Professionnelle, puis Métier selon configuration.
create or replace function public.validate_training_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_formation boolean;
  v_multi_site boolean;
begin
  select business_type = 'formation', public.organization_has_plan_feature(id, 'multi_site')
  into v_is_formation, v_multi_site
  from public.organizations
  where id = new.organization_id;

  if not coalesce(v_is_formation, false) then
    raise exception 'Ce module est réservé aux espaces Formation.';
  end if;

  if tg_table_name in ('training_programs','training_sessions') and v_multi_site then
    if new.site_id is null or not exists (
      select 1 from public.organization_sites s
      where s.organization_id = new.organization_id
        and s.id = new.site_id
        and s.status = 'active'
    ) then
      raise exception 'Un établissement actif doit être sélectionné.';
    end if;
  elsif tg_table_name in ('training_programs','training_sessions') then
    new.site_id := null;
  end if;

  return new;
end;
$$;

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
  v_multi_site boolean;
  v_trainee_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then
    raise exception 'Accès insuffisant.';
  end if;

  if not exists (select 1 from public.organizations where id = p_organization_id and business_type = 'formation') then
    raise exception 'Espace Formation introuvable.';
  end if;
  v_multi_site := public.organization_has_plan_feature(p_organization_id, 'multi_site');

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

  if v_multi_site and not exists (
    select 1 from public.organization_sites
    where organization_id = p_organization_id and id = p_site_id and status = 'active'
  ) then raise exception 'Établissement introuvable ou inactif.'; end if;

  if cardinality(coalesce(p_trainee_ids, '{}'::uuid[])) > p_capacity then
    raise exception 'Le nombre de stagiaires dépasse la capacité de la session.';
  end if;

  insert into public.training_sessions (
    organization_id, site_id, program_id, trainer_id, title, starts_at, ends_at,
    capacity, location, modality, status, notes, created_by
  ) values (
    p_organization_id, case when v_multi_site then p_site_id else null end,
    p_program_id, p_trainer_id, trim(p_title), p_starts_at, p_ends_at,
    p_capacity, nullif(trim(coalesce(p_location,'')),''), p_modality, p_status,
    nullif(trim(coalesce(p_notes,'')),''), auth.uid()
  ) returning id into v_id;

  foreach v_trainee_id in array coalesce(p_trainee_ids, '{}'::uuid[]) loop
    if not exists (
      select 1 from public.training_trainees
      where organization_id = p_organization_id and id = v_trainee_id and status = 'active'
    ) then raise exception 'Un stagiaire sélectionné est introuvable ou inactif.'; end if;

    insert into public.training_session_enrollments (
      organization_id, session_id, trainee_id, status, created_by
    ) values (p_organization_id, v_id, v_trainee_id, 'registered', auth.uid());
  end loop;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.session_created', 'training_session', v_id::text,
    jsonb_build_object('program_id', p_program_id, 'trainer_id', p_trainer_id, 'site_id', case when v_multi_site then p_site_id else null end, 'trainee_count', cardinality(coalesce(p_trainee_ids, '{}'::uuid[])))
  );

  return v_id;
end;
$$;

create or replace function public.validate_training_document_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_multi_site boolean;
  v_session_program_id uuid;
  v_session_site_id uuid;
begin
  if not exists (select 1 from public.organizations where id = new.organization_id and business_type = 'formation') then
    raise exception 'Ce module est réservé aux espaces Formation.';
  end if;
  v_multi_site := public.organization_has_plan_feature(new.organization_id, 'multi_site');

  if new.session_id is not null then
    select program_id, site_id into v_session_program_id, v_session_site_id
    from public.training_sessions
    where organization_id = new.organization_id and id = new.session_id;

    if v_session_program_id is null then raise exception 'Session introuvable.'; end if;
    if new.program_id is null then new.program_id := v_session_program_id;
    elsif new.program_id <> v_session_program_id then raise exception 'La formation ne correspond pas à la session.';
    end if;

    if v_multi_site then
      if new.site_id is null then new.site_id := v_session_site_id;
      elsif new.site_id is distinct from v_session_site_id then raise exception 'L’établissement ne correspond pas à la session.';
      end if;
    end if;
  end if;

  if new.program_id is not null and not exists (
    select 1 from public.training_programs p
    where p.organization_id = new.organization_id and p.id = new.program_id and p.status <> 'archived'
  ) then raise exception 'Formation introuvable.'; end if;

  if new.trainee_id is not null and not exists (
    select 1 from public.training_trainees t
    where t.organization_id = new.organization_id and t.id = new.trainee_id and t.status <> 'archived'
  ) then raise exception 'Stagiaire introuvable.'; end if;

  if new.visibility = 'trainee' and new.trainee_id is null then raise exception 'Un stagiaire doit être sélectionné pour cette visibilité.'; end if;
  if new.visibility = 'session' and new.session_id is null then raise exception 'Une session doit être sélectionnée pour cette visibilité.'; end if;

  if v_multi_site then
    if new.site_id is not null and not exists (
      select 1 from public.organization_sites s
      where s.organization_id = new.organization_id and s.id = new.site_id and s.status = 'active'
    ) then raise exception 'Établissement introuvable ou inactif.'; end if;
  else
    new.site_id := null;
  end if;
  return new;
end;
$$;

create or replace function public.training_upsert_site(
  p_organization_id uuid,
  p_site_id uuid,
  p_name text,
  p_code text,
  p_address text,
  p_postal_code text,
  p_city text,
  p_phone text,
  p_email text,
  p_timezone text,
  p_is_primary boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_primary boolean := coalesce(p_is_primary, false);
  v_count integer;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seul le propriétaire ou un administrateur peut gérer les établissements.';
  end if;
  if not public.organization_has_plan_feature(p_organization_id, 'multi_site') then
    raise exception 'Le multi-site est disponible avec l’offre Professionnelle.';
  end if;
  if v_name is null or char_length(v_name) > 120 then raise exception 'Le nom de l’établissement est invalide.'; end if;
  if nullif(trim(coalesce(p_email, '')), '') is not null and trim(p_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'L’adresse e-mail est invalide.';
  end if;

  if p_site_id is null then
    select count(*)::integer into v_count from public.organization_sites where organization_id = p_organization_id and status <> 'archived';
    if v_count >= 50 then raise exception 'La limite technique de 50 établissements est atteinte.'; end if;
    v_id := gen_random_uuid();
    if v_count = 0 then v_primary := true; end if;
  else
    v_id := p_site_id;
    if not exists (select 1 from public.organization_sites where organization_id = p_organization_id and id = v_id) then
      raise exception 'Établissement introuvable.';
    end if;
  end if;

  if v_primary then update public.organization_sites set is_primary = false where organization_id = p_organization_id and id <> v_id; end if;

  insert into public.organization_sites (
    id, organization_id, name, code, address, postal_code, city, phone, email, timezone, is_primary, status, created_by
  ) values (
    v_id, p_organization_id, v_name, nullif(trim(coalesce(p_code,'')),''), nullif(trim(coalesce(p_address,'')),''),
    nullif(trim(coalesce(p_postal_code,'')),''), nullif(trim(coalesce(p_city,'')),''), nullif(trim(coalesce(p_phone,'')),''),
    nullif(lower(trim(coalesce(p_email,''))),''), coalesce(nullif(trim(coalesce(p_timezone,'')),''),'Europe/Paris'), v_primary, 'active', auth.uid()
  )
  on conflict (id) do update set
    name = excluded.name, code = excluded.code, address = excluded.address, postal_code = excluded.postal_code,
    city = excluded.city, phone = excluded.phone, email = excluded.email, timezone = excluded.timezone,
    is_primary = excluded.is_primary, status = 'active', updated_at = now();

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'training.site_saved', 'organization_site', v_id::text, jsonb_build_object('name', v_name, 'primary', v_primary));
  return v_id;
end;
$$;

create or replace function public.training_set_site_status(
  p_organization_id uuid,
  p_site_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_primary boolean;
  v_next_primary uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then raise exception 'Droits insuffisants.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'multi_site') then raise exception 'Le multi-site est disponible avec l’offre Professionnelle.'; end if;
  if p_status not in ('active','inactive','archived') then raise exception 'Statut invalide.'; end if;

  select is_primary into v_was_primary from public.organization_sites where organization_id = p_organization_id and id = p_site_id;
  if v_was_primary is null then raise exception 'Établissement introuvable.'; end if;

  update public.organization_sites
  set status = p_status, is_primary = case when p_status = 'active' then is_primary else false end, updated_at = now()
  where organization_id = p_organization_id and id = p_site_id;

  if v_was_primary and p_status <> 'active' then
    select id into v_next_primary from public.organization_sites
    where organization_id = p_organization_id and status = 'active' and id <> p_site_id
    order by created_at limit 1;
    if v_next_primary is not null then update public.organization_sites set is_primary = true where id = v_next_primary; end if;
  end if;
end;
$$;

revoke all on function public.training_upsert_site(uuid,uuid,text,text,text,text,text,text,text,text,boolean) from public;
revoke all on function public.training_set_site_status(uuid,uuid,text) from public;
grant execute on function public.training_upsert_site(uuid,uuid,text,text,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.training_set_site_status(uuid,uuid,text) to authenticated;

-- 3. Personnalisation des documents et des e-mails Formation.
create or replace function public.can_manage_brand_asset(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  begin
    v_organization_id := split_part(coalesce(p_object_name, ''), '/', 1)::uuid;
  exception when invalid_text_representation then return false;
  end;

  return public.has_org_role(v_organization_id, array['owner','admin','manager'])
    and public.organization_has_plan_feature(v_organization_id, 'commercial_branding');
end;
$$;

create or replace function public.update_training_branding(
  p_organization_id uuid,
  p_public_name text,
  p_primary_color text,
  p_logo_url text,
  p_address text,
  p_contact_email text,
  p_contact_phone text,
  p_signature_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_public_name text := nullif(trim(coalesce(p_public_name, '')), '');
  v_logo_url text := nullif(trim(coalesce(p_logo_url, '')), '');
  v_address text := nullif(trim(coalesce(p_address, '')), '');
  v_email text := nullif(lower(trim(coalesce(p_contact_email, ''))), '');
  v_phone text := nullif(trim(coalesce(p_contact_phone, '')), '');
  v_signature text := nullif(trim(coalesce(p_signature_text, '')), '');
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seul le propriétaire ou un administrateur peut personnaliser les documents.';
  end if;
  if not public.organization_has_plan_feature(p_organization_id, 'training_document_branding') then
    raise exception 'La personnalisation Formation est disponible avec l’offre Essentielle.';
  end if;
  if v_public_name is null or char_length(v_public_name) not between 2 and 120 then raise exception 'Le nom affiché est invalide.'; end if;
  if p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'La couleur principale est invalide.'; end if;
  if v_logo_url is not null and (char_length(v_logo_url) > 1200 or v_logo_url !~ '^https://') then raise exception 'L’adresse du logo est invalide.'; end if;
  if v_address is not null and char_length(v_address) > 500 then raise exception 'L’adresse est trop longue.'; end if;
  if v_email is not null and v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'L’adresse e-mail est invalide.'; end if;
  if v_phone is not null and char_length(v_phone) > 40 then raise exception 'Le téléphone est trop long.'; end if;
  if v_signature is not null and char_length(v_signature) > 1200 then raise exception 'La signature personnalisée est trop longue.'; end if;

  update public.organizations
  set public_name = v_public_name,
      primary_color = lower(p_primary_color),
      logo_url = v_logo_url,
      booking_address = v_address,
      booking_contact_email = v_email,
      booking_contact_phone = v_phone,
      booking_practical_info = v_signature,
      show_ncr_branding = case when white_label_enabled then show_ncr_branding else true end,
      updated_at = now()
  where id = p_organization_id and business_type = 'formation';

  if not found then raise exception 'Espace Formation introuvable.'; end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'training.branding_updated', 'organization', p_organization_id::text,
    jsonb_build_object('public_name', v_public_name, 'email_branding', true, 'document_branding', true));
end;
$$;

revoke all on function public.update_training_branding(uuid,text,text,text,text,text,text,text) from public;
grant execute on function public.update_training_branding(uuid,text,text,text,text,text,text,text) to authenticated;

-- 4. Émargement numérique réservé à Essentielle et au-dessus.
create or replace function public.can_manage_training_signature_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizations o
    where o.id = public.training_signature_organization_id(p_object_name)
      and o.business_type = 'formation'
      and public.organization_has_plan_feature(o.id, 'training_digital_attendance')
      and public.has_org_role(o.id, array['owner','admin','manager','employee'])
  );
$$;

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

  select s.site_id, s.starts_at, s.ends_at, coalesce(o.timezone, 'Europe/Paris')
  into v_site_id, v_starts_at, v_ends_at, v_timezone
  from public.training_sessions s join public.organizations o on o.id = s.organization_id
  where s.organization_id = p_organization_id and s.id = p_session_id and o.business_type = 'formation' and s.status <> 'canceled';
  if v_starts_at is null then raise exception 'Session introuvable ou annulée.'; end if;

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

drop policy if exists training_attendance_insert on public.training_attendance;
create policy training_attendance_insert on public.training_attendance for insert to authenticated
with check (
  public.has_org_role(organization_id, array['owner','admin','manager','employee'])
  and public.organization_has_plan_feature(organization_id, 'training_digital_attendance')
);
drop policy if exists training_attendance_update on public.training_attendance;
create policy training_attendance_update on public.training_attendance for update to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','manager','employee'])
  and public.organization_has_plan_feature(organization_id, 'training_digital_attendance')
)
with check (
  public.has_org_role(organization_id, array['owner','admin','manager','employee'])
  and public.organization_has_plan_feature(organization_id, 'training_digital_attendance')
);
drop policy if exists training_attendance_delete on public.training_attendance;
create policy training_attendance_delete on public.training_attendance for delete to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id, 'training_digital_attendance')
);

-- 5. Évaluations uniquement en Professionnelle/Métier.
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
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Accès insuffisant.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'training_satisfaction') then raise exception 'Les évaluations sont disponibles avec l’offre Professionnelle.'; end if;
  if coalesce(p_delay_hours, 0) not between 0 and 168 then raise exception 'Le délai doit être compris entre 0 et 168 heures.'; end if;

  update public.organizations
  set training_satisfaction_enabled = coalesce(p_enabled, true),
      training_satisfaction_delay_hours = coalesce(p_delay_hours, 0),
      training_satisfaction_intro = nullif(trim(coalesce(p_intro, '')), ''),
      updated_at = now()
  where id = p_organization_id and business_type = 'formation';
  if not found then raise exception 'Espace Formation introuvable.'; end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.satisfaction_settings_updated', 'organization', p_organization_id::text,
    jsonb_build_object('enabled', coalesce(p_enabled, true), 'delay_hours', coalesce(p_delay_hours, 0))
  );
end;
$$;

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
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then raise exception 'Accès insuffisant.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'training_satisfaction') then raise exception 'Les évaluations sont disponibles avec l’offre Professionnelle.'; end if;
  if not exists (select 1 from public.training_sessions where organization_id = p_organization_id and id = p_session_id and status = 'completed') then
    raise exception 'La session doit être terminée avant l’envoi du questionnaire.';
  end if;

  for v_trainee in
    select t.id, t.email
    from public.training_session_enrollments e
    join public.training_trainees t on t.organization_id = e.organization_id and t.id = e.trainee_id
    where e.organization_id = p_organization_id and e.session_id = p_session_id and e.status <> 'canceled' and t.status <> 'archived'
  loop
    perform public.enqueue_training_satisfaction_internal(p_organization_id, p_session_id, v_trainee.id, p_send_email, p_force, auth.uid());
    v_queued := v_queued + 1;
    if nullif(trim(coalesce(v_trainee.email, '')), '') is null then v_without_email := v_without_email + 1; end if;
  end loop;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.satisfaction_queued', 'training_session', p_session_id::text,
    jsonb_build_object('queued', v_queued, 'without_email', v_without_email, 'forced', p_force)
  );

  return jsonb_build_object('queued', v_queued, 'without_email', v_without_email);
end;
$$;

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
  if new.status = 'completed' and old.status is distinct from new.status
     and public.organization_has_plan_feature(new.organization_id, 'training_satisfaction') then
    select training_satisfaction_enabled into v_enabled from public.organizations where id = new.organization_id;
    if coalesce(v_enabled, true) then
      for v_trainee in
        select trainee_id from public.training_session_enrollments
        where organization_id = new.organization_id and session_id = new.id and status <> 'canceled'
      loop
        perform public.enqueue_training_satisfaction_internal(new.organization_id, new.id, v_trainee.trainee_id, true, false, auth.uid());
      end loop;
    end if;
  end if;
  return new;
end;
$$;

drop policy if exists training_satisfaction_select on public.training_satisfaction_surveys;
create policy training_satisfaction_select on public.training_satisfaction_surveys for select to authenticated
using (public.is_org_member(organization_id) and public.organization_has_plan_feature(organization_id, 'training_satisfaction'));

-- 6. Accès employés avec rôles uniquement en Professionnelle/Métier Formation.
create or replace function public.training_team_plan_summary(p_organization_id uuid)
returns table (
  plan text,
  member_limit integer,
  active_members integer,
  pending_invitations integer,
  available_seats integer,
  invitations_enabled boolean,
  manager_role_enabled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_active integer;
  v_pending integer;
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then raise exception 'Accès refusé.'; end if;
  select o.plan, public.domain_plan_member_limit(o.business_type, o.plan) into v_plan, v_limit
  from public.organizations o where o.id = p_organization_id and o.business_type = 'formation';
  if v_plan is null then raise exception 'Espace Formation introuvable.'; end if;
  select count(*)::integer into v_active from public.organization_members where organization_id = p_organization_id and status = 'active';
  select count(*)::integer into v_pending from public.organization_invitations where organization_id = p_organization_id and status = 'pending' and expires_at > now();
  return query select v_plan, v_limit, v_active, v_pending, greatest(v_limit - v_active - v_pending, 0),
    public.organization_has_plan_feature(p_organization_id, 'team_access'),
    public.organization_has_plan_feature(p_organization_id, 'manager_role');
end;
$$;

create or replace function public.create_training_team_invitation(
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_staff_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_used integer;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text;
  v_invitation_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then raise exception 'Seul le propriétaire ou un administrateur peut gérer les accès.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'team_access') then raise exception 'Les accès employés sont disponibles avec l’offre Professionnelle.'; end if;
  select o.plan, public.domain_plan_member_limit(o.business_type, o.plan) into v_plan, v_limit
  from public.organizations o where o.id = p_organization_id and o.business_type = 'formation';
  if v_plan is null then raise exception 'Espace Formation introuvable.'; end if;
  if v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'Adresse e-mail invalide.'; end if;
  if v_plan = 'professionnelle' and p_role not in ('manager','employee','viewer') then raise exception 'Ce rôle nécessite l’offre Métier.'; end if;
  if v_plan = 'metier' and p_role not in ('admin','manager','employee','viewer') then raise exception 'Rôle invalide.'; end if;

  if exists (
    select 1 from public.organization_members m join auth.users u on u.id = m.user_id
    where m.organization_id = p_organization_id and lower(u.email::text) = v_email and m.status in ('active','disabled')
  ) then raise exception 'Cette adresse possède déjà un accès à l’entreprise.'; end if;
  if exists (
    select 1 from public.organization_invitations i
    where i.organization_id = p_organization_id and lower(i.email) = v_email and i.status = 'pending' and i.expires_at > now()
  ) then raise exception 'Une invitation active existe déjà pour cette adresse.'; end if;

  select
    (select count(*) from public.organization_members where organization_id = p_organization_id and status = 'active')
    + (select count(*) from public.organization_invitations where organization_id = p_organization_id and status = 'pending' and expires_at > now())
  into v_used;
  if v_used >= v_limit then raise exception 'La limite de % utilisateur(s) de votre offre est atteinte.', v_limit; end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.organization_invitations (organization_id, email, role, staff_id, token_hash, expires_at, invited_by)
  values (p_organization_id, v_email, p_role, null, extensions.digest(v_token, 'sha256'), now() + interval '7 days', auth.uid())
  returning id into v_invitation_id;
  perform public.enqueue_team_invitation_email(v_invitation_id, v_token, false);

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'training.team_invitation_created', 'organization_invitation', v_invitation_id::text,
    jsonb_build_object('email', v_email, 'role', p_role));
  return v_invitation_id;
end;
$$;

create or replace function public.update_training_team_member_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_current_role text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then raise exception 'Droits insuffisants.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'team_access') then raise exception 'Les accès employés sont disponibles avec l’offre Professionnelle.'; end if;
  select o.plan into v_plan from public.organizations o where o.id = p_organization_id and o.business_type = 'formation';
  select role into v_current_role from public.organization_members where organization_id = p_organization_id and user_id = p_user_id;
  if v_current_role is null then raise exception 'Utilisateur introuvable.'; end if;
  if v_current_role = 'owner' then raise exception 'Le rôle du propriétaire ne peut pas être modifié.'; end if;
  if v_plan = 'professionnelle' and p_role not in ('manager','employee','viewer') then raise exception 'Ce rôle nécessite l’offre Métier.'; end if;
  if v_plan = 'metier' and p_role not in ('admin','manager','employee','viewer') then raise exception 'Rôle invalide.'; end if;
  update public.organization_members set role = p_role where organization_id = p_organization_id and user_id = p_user_id;
end;
$$;

revoke all on function public.training_team_plan_summary(uuid) from public;
revoke all on function public.create_training_team_invitation(uuid,text,text,uuid) from public;
revoke all on function public.update_training_team_member_role(uuid,uuid,text) from public;
grant execute on function public.training_team_plan_summary(uuid) to authenticated;
grant execute on function public.create_training_team_invitation(uuid,text,text,uuid) to authenticated;
grant execute on function public.update_training_team_member_role(uuid,uuid,text) to authenticated;

-- Le module Sites devient compatible avec le domaine Formation pour l'offre Professionnelle.
update public.module_catalog
set compatible_business_types = case
      when 'formation' = any(compatible_business_types) then compatible_business_types
      else array_append(compatible_business_types, 'formation')
    end,
    display_name = case when module_key = 'sites' then 'Établissements' else display_name end,
    updated_at = now()
where module_key = 'sites';

-- Bloque également les invitations Formation qui tenteraient d'utiliser l'ancien RPC générique.
create or replace function public.enforce_training_team_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_type text;
  v_plan text;
begin
  select o.business_type, o.plan into v_business_type, v_plan
  from public.organizations o where o.id = new.organization_id;
  if v_business_type = 'formation' and new.status = 'pending' then
    if not public.organization_has_plan_feature(new.organization_id, 'team_access') then
      raise exception 'Les accès employés sont disponibles avec l’offre Professionnelle.';
    end if;
    if v_plan = 'professionnelle' and new.role not in ('manager','employee','viewer') then
      raise exception 'Ce rôle nécessite l’offre Métier.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_training_team_entitlement on public.organization_invitations;
create trigger enforce_training_team_entitlement
before insert or update of status, role on public.organization_invitations
for each row execute procedure public.enforce_training_team_entitlement();

-- Aligne les modules des offres standard sans écraser une offre Métier déjà configurée sur mesure.
insert into public.organization_modules (organization_id, module_key, enabled)
select
  o.id,
  modules.module_key,
  case modules.module_key
    when 'commercial_branding' then public.organization_has_plan_feature(o.id, 'training_document_branding')
    when 'evaluations' then public.organization_has_plan_feature(o.id, 'training_satisfaction')
    when 'team_access' then public.organization_has_plan_feature(o.id, 'team_access')
    when 'sites' then public.organization_has_plan_feature(o.id, 'multi_site')
    else true
  end
from public.organizations o
cross join (values
  ('training_programs'),('trainees'),('trainers'),('sessions'),('documents'),('attendance'),('certificates'),
  ('commercial_branding'),('evaluations'),('team_access'),('sites')
) as modules(module_key)
where o.business_type = 'formation'
  and (o.plan <> 'metier' or not coalesce(o.metier_modules_configured, false))
on conflict (organization_id, module_key) do update
set enabled = excluded.enabled,
    updated_at = now();

-- En cas de baisse de formule, les traitements devenus interdits sont neutralisés sans supprimer l'historique.
create or replace function public.cleanup_training_plan_features()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.business_type = 'formation' and old.plan is distinct from new.plan then
    if not public.organization_has_plan_feature(new.id, 'training_satisfaction') then
      update public.email_outbox
      set status = 'cancelled', locked_at = null, updated_at = now()
      where organization_id = new.id
        and template_key = 'training_satisfaction_request'
        and status in ('pending','failed','sending');
    end if;

    if not public.organization_has_plan_feature(new.id, 'team_access') then
      update public.organization_invitations
      set status = 'revoked', revoked_at = now(), updated_at = now()
      where organization_id = new.id
        and status = 'pending';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists cleanup_training_plan_features on public.organizations;
create trigger cleanup_training_plan_features
after update of plan on public.organizations
for each row execute procedure public.cleanup_training_plan_features();

revoke all on function public.cleanup_training_plan_features() from public;

select pg_notify('pgrst', 'reload schema');
commit;
