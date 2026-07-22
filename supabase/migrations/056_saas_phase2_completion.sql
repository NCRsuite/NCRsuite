-- NCR Suite V2.11.2 — Finalisation Phase 2
-- Centre de démarrage, imports guidés et diagnostic SaaS central.

begin;

-- 1) Historique des imports guidés
create table if not exists public.organization_import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  import_type text not null,
  file_name text,
  status text not null default 'processing' check (status in ('processing','completed','completed_with_errors','failed')),
  total_rows integer not null default 0 check (total_rows >= 0),
  inserted_rows integer not null default 0 check (inserted_rows >= 0),
  skipped_rows integer not null default 0 check (skipped_rows >= 0),
  error_rows integer not null default 0 check (error_rows >= 0),
  errors jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_organization_import_jobs_org_created
  on public.organization_import_jobs(organization_id, created_at desc);

alter table public.organization_import_jobs enable row level security;
revoke all on public.organization_import_jobs from anon, authenticated;

-- 2) Centre de démarrage calculé depuis les vraies données métier
create or replace function public.get_organization_launch_center(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_team_count integer := 0;
  v_catalog_count integer := 0;
  v_planning_count integer := 0;
  v_customer_count integer := 0;
  v_import_count integer := 0;
  v_identity boolean := false;
  v_branding boolean := false;
  v_team boolean := false;
  v_catalog boolean := false;
  v_planning boolean := false;
  v_customer boolean := false;
  v_public boolean := false;
  v_test boolean := false;
  v_steps jsonb := '[]'::jsonb;
  v_completed integer := 0;
  v_total integer := 0;
  v_progress integer := 0;
  v_result jsonb;
begin
  if not public.is_platform_admin() and not public.is_org_member_any_status(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;

  select * into v_org from public.organizations where id = p_organization_id;
  if not found then raise exception 'Entreprise introuvable.'; end if;

  v_identity := nullif(trim(coalesce(v_org.company_email, '')), '') is not null
    and nullif(trim(coalesce(v_org.company_contact_name, '')), '') is not null;
  v_branding := v_org.logo_url is not null
    or v_org.primary_color <> '#2997ff'
    or coalesce((v_org.onboarding_checklist->>'branding')::boolean, false);
  v_test := coalesce((v_org.onboarding_checklist->>'launch_test')::boolean, false);

  select count(*)::integer into v_import_count
  from public.organization_import_jobs
  where organization_id = p_organization_id
    and status in ('completed','completed_with_errors');

  if v_org.business_type = 'coiffure' then
    select count(*)::integer into v_team_count from public.staff where organization_id = p_organization_id and active;
    select count(*)::integer into v_catalog_count from public.services where organization_id = p_organization_id and active;
    select count(*)::integer into v_planning_count from public.appointments where organization_id = p_organization_id;
    select count(*)::integer into v_customer_count from public.clients where organization_id = p_organization_id and status = 'active';
    v_public := coalesce(v_org.booking_enabled, false);
    v_steps := jsonb_build_array(
      jsonb_build_object('key','identity','label','Identité de l’entreprise','description','Coordonnées et contact principal renseignés.','completed',v_identity,'path','/parametres','icon','building'),
      jsonb_build_object('key','branding','label','Identité visuelle','description','Logo ou couleur principale personnalisée.','completed',v_branding,'path','/personnalisation','icon','sparkles'),
      jsonb_build_object('key','customers','label','Premiers clients','description',v_customer_count || ' client(s) actif(s).','completed',v_customer_count > 0,'path','/clients','icon','users'),
      jsonb_build_object('key','team','label','Équipe du salon','description',v_team_count || ' collaborateur(s) actif(s).','completed',v_team_count > 0,'path','/equipe','icon','users'),
      jsonb_build_object('key','catalog','label','Prestations configurées','description',v_catalog_count || ' prestation(s) disponible(s).','completed',v_catalog_count > 0,'path','/prestations','icon','scissors'),
      jsonb_build_object('key','planning','label','Premier rendez-vous','description',v_planning_count || ' rendez-vous enregistré(s).','completed',v_planning_count > 0,'path','/rendez-vous','icon','calendar'),
      jsonb_build_object('key','public_page','label','Réservation publique','description','La page publique est activée et prête à être partagée.','completed',v_public,'path','/parametres','icon','monitor'),
      jsonb_build_object('key','launch_test','label','Test de mise en service','description','Parcours complet vérifié avant utilisation réelle.','completed',v_test,'path','/demarrage','icon','check','manual',true)
    );
  elsif v_org.business_type = 'formation' then
    select count(*)::integer into v_team_count from public.training_trainers where organization_id = p_organization_id and status = 'active';
    select count(*)::integer into v_catalog_count from public.training_programs where organization_id = p_organization_id and status = 'active';
    select count(*)::integer into v_planning_count from public.training_sessions where organization_id = p_organization_id;
    select count(*)::integer into v_customer_count from public.training_trainees where organization_id = p_organization_id and status = 'active';
    v_steps := jsonb_build_array(
      jsonb_build_object('key','identity','label','Identité de l’organisme','description','Coordonnées et contact principal renseignés.','completed',v_identity,'path','/parametres','icon','building'),
      jsonb_build_object('key','branding','label','Documents personnalisés','description','Identité visuelle préparée pour les documents.','completed',v_branding,'path','/personnalisation','icon','sparkles'),
      jsonb_build_object('key','customers','label','Premiers stagiaires','description',v_customer_count || ' stagiaire(s) actif(s).','completed',v_customer_count > 0,'path','/stagiaires','icon','users'),
      jsonb_build_object('key','team','label','Formateurs','description',v_team_count || ' formateur(s) actif(s).','completed',v_team_count > 0,'path','/formateurs','icon','graduation'),
      jsonb_build_object('key','catalog','label','Programmes de formation','description',v_catalog_count || ' programme(s) actif(s).','completed',v_catalog_count > 0,'path','/formations','icon','clipboard'),
      jsonb_build_object('key','planning','label','Première session','description',v_planning_count || ' session(s) créée(s).','completed',v_planning_count > 0,'path','/sessions','icon','calendar'),
      jsonb_build_object('key','launch_test','label','Test du dossier de session','description','Documents, planning et parcours formateur vérifiés.','completed',v_test,'path','/demarrage','icon','check','manual',true)
    );
  elsif v_org.business_type = 'securite' then
    select count(*)::integer into v_team_count from public.security_agents where organization_id = p_organization_id and status = 'active';
    select count(*)::integer into v_catalog_count from public.security_sites where organization_id = p_organization_id and status = 'active';
    select count(*)::integer into v_planning_count from public.security_shifts where organization_id = p_organization_id;
    select count(*)::integer into v_customer_count from public.security_clients where organization_id = p_organization_id and status = 'active';
    v_steps := jsonb_build_array(
      jsonb_build_object('key','identity','label','Identité de l’agence','description','Coordonnées et contact principal renseignés.','completed',v_identity,'path','/parametres','icon','building'),
      jsonb_build_object('key','branding','label','Documents opérationnels','description','Logo et identité des documents configurés.','completed',v_branding,'path','/personnalisation','icon','shield'),
      jsonb_build_object('key','customers','label','Clients actifs','description',v_customer_count || ' client(s) actif(s).','completed',v_customer_count > 0,'path','/clients','icon','briefcase'),
      jsonb_build_object('key','team','label','Agents','description',v_team_count || ' agent(s) actif(s).','completed',v_team_count > 0,'path','/agents','icon','users'),
      jsonb_build_object('key','catalog','label','Sites sécurisés','description',v_catalog_count || ' site(s) actif(s).','completed',v_catalog_count > 0,'path','/sites','icon','map'),
      jsonb_build_object('key','planning','label','Première vacation','description',v_planning_count || ' vacation(s) planifiée(s).','completed',v_planning_count > 0,'path','/planning','icon','calendar'),
      jsonb_build_object('key','launch_test','label','Test opérationnel QG','description','Prise de poste, main courante et clôture vérifiées.','completed',v_test,'path','/demarrage','icon','check','manual',true)
    );
  elsif v_org.business_type = 'nettoyage' then
    select count(*)::integer into v_team_count from public.cleaning_agents where organization_id = p_organization_id and status = 'active';
    select count(*)::integer into v_catalog_count from public.cleaning_sites where organization_id = p_organization_id and status = 'active';
    select count(*)::integer into v_planning_count from public.cleaning_interventions where organization_id = p_organization_id;
    select count(*)::integer into v_customer_count from public.cleaning_clients where organization_id = p_organization_id and status = 'active';
    v_steps := jsonb_build_array(
      jsonb_build_object('key','identity','label','Identité de l’entreprise','description','Coordonnées et contact principal renseignés.','completed',v_identity,'path','/parametres','icon','building'),
      jsonb_build_object('key','branding','label','Rapports personnalisés','description','Logo et identité des rapports configurés.','completed',v_branding,'path','/personnalisation','icon','sparkles'),
      jsonb_build_object('key','customers','label','Clients actifs','description',v_customer_count || ' client(s) actif(s).','completed',v_customer_count > 0,'path','/clients','icon','briefcase'),
      jsonb_build_object('key','team','label','Agents de nettoyage','description',v_team_count || ' agent(s) actif(s).','completed',v_team_count > 0,'path','/agents','icon','users'),
      jsonb_build_object('key','catalog','label','Chantiers et sites','description',v_catalog_count || ' site(s) actif(s).','completed',v_catalog_count > 0,'path','/sites','icon','map'),
      jsonb_build_object('key','planning','label','Première intervention','description',v_planning_count || ' intervention(s) planifiée(s).','completed',v_planning_count > 0,'path','/planning','icon','calendar'),
      jsonb_build_object('key','launch_test','label','Test terrain','description','Pointage, checklist et rapport vérifiés.','completed',v_test,'path','/demarrage','icon','check','manual',true)
    );
  elsif v_org.business_type = 'restauration' then
    select count(*)::integer into v_team_count from public.restaurant_employees where organization_id = p_organization_id and status = 'active';
    select count(*)::integer into v_catalog_count from public.restaurant_menu_items where organization_id = p_organization_id and available;
    select count(*)::integer into v_planning_count from public.restaurant_shifts where organization_id = p_organization_id;
    select count(*)::integer into v_customer_count from public.restaurant_reservations where organization_id = p_organization_id;
    v_public := coalesce(v_org.booking_enabled, false);
    v_steps := jsonb_build_array(
      jsonb_build_object('key','identity','label','Identité du restaurant','description','Coordonnées et contact principal renseignés.','completed',v_identity,'path','/parametres','icon','building'),
      jsonb_build_object('key','branding','label','Menu personnalisé','description','Logo et identité du menu configurés.','completed',v_branding,'path','/personnalisation','icon','sparkles'),
      jsonb_build_object('key','team','label','Équipe du restaurant','description',v_team_count || ' employé(s) actif(s).','completed',v_team_count > 0,'path','/equipe','icon','users'),
      jsonb_build_object('key','catalog','label','Carte du restaurant','description',v_catalog_count || ' proposition(s) disponible(s).','completed',v_catalog_count > 0,'path','/carte','icon','utensils'),
      jsonb_build_object('key','planning','label','Premier service','description',v_planning_count || ' service(s) planifié(s).','completed',v_planning_count > 0,'path','/planning','icon','calendar'),
      jsonb_build_object('key','customers','label','Premières réservations','description',v_customer_count || ' réservation(s) enregistrée(s).','completed',v_customer_count > 0,'path','/reservations','icon','clipboard'),
      jsonb_build_object('key','public_page','label','Page publique','description','Menu QR et réservation publique prêts à être partagés.','completed',v_public,'path','/menu-qr','icon','monitor'),
      jsonb_build_object('key','launch_test','label','Test du service','description','Réservation, commande, cuisine et clôture vérifiées.','completed',v_test,'path','/demarrage','icon','check','manual',true)
    );
  end if;

  select count(*)::integer,
         count(*) filter (where coalesce((step->>'completed')::boolean,false))::integer
  into v_total, v_completed
  from jsonb_array_elements(v_steps) step;

  v_progress := case when v_total = 0 then 0 else round((v_completed::numeric / v_total::numeric) * 100)::integer end;

  select jsonb_build_object(
    'organization_id', v_org.id,
    'business_type', v_org.business_type,
    'onboarding_status', v_org.onboarding_status,
    'progress', v_progress,
    'completed_steps', v_completed,
    'total_steps', v_total,
    'import_count', v_import_count,
    'steps', v_steps
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.set_organization_launch_test(
  p_organization_id uuid,
  p_completed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès refusé.';
  end if;

  update public.organizations
  set onboarding_checklist = jsonb_set(coalesce(onboarding_checklist, '{}'::jsonb), '{launch_test}', to_jsonb(p_completed), true),
      updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    case when p_completed then 'organization.launch_test_completed' else 'organization.launch_test_reopened' end,
    'organization',
    p_organization_id::text,
    jsonb_build_object('completed', p_completed)
  );

  return public.get_organization_launch_center(p_organization_id);
end;
$$;

-- 3) Import transactionnel et audité des données de démarrage
create or replace function public.import_organization_records(
  p_organization_id uuid,
  p_import_type text,
  p_file_name text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_type text;
  v_job_id uuid;
  v_row jsonb;
  v_total integer := 0;
  v_inserted integer := 0;
  v_skipped integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_line integer := 1;
  v_client_id uuid;
  v_supplier_id uuid;
  v_category_id uuid;
  v_value text;
  v_status text;
begin
  if not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seul le propriétaire ou un administrateur peut importer des données.';
  end if;

  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Le fichier importé est invalide.'; end if;
  v_total := jsonb_array_length(p_rows);
  if v_total < 1 then raise exception 'Le fichier ne contient aucune donnée.'; end if;
  if v_total > 1000 then raise exception 'Un import est limité à 1 000 lignes.'; end if;

  select business_type into v_org_type from public.organizations where id = p_organization_id;
  if not found then raise exception 'Entreprise introuvable.'; end if;

  if not (
    (v_org_type = 'coiffure' and p_import_type in ('coiffure_clients','coiffure_staff','coiffure_services')) or
    (v_org_type = 'formation' and p_import_type in ('training_trainees','training_trainers','training_programs')) or
    (v_org_type = 'securite' and p_import_type in ('security_clients','security_agents','security_sites')) or
    (v_org_type = 'nettoyage' and p_import_type in ('cleaning_clients','cleaning_agents','cleaning_sites')) or
    (v_org_type = 'restauration' and p_import_type in ('restaurant_employees','restaurant_suppliers','restaurant_stock','restaurant_menu'))
  ) then
    raise exception 'Ce type d’import n’est pas compatible avec le métier de l’entreprise.';
  end if;

  insert into public.organization_import_jobs (
    organization_id, import_type, file_name, status, total_rows, created_by
  ) values (
    p_organization_id, p_import_type, nullif(trim(coalesce(p_file_name,'')), ''), 'processing', v_total, auth.uid()
  ) returning id into v_job_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_line := v_line + 1;
    begin
      if p_import_type = 'coiffure_clients' then
        if nullif(trim(coalesce(v_row->>'first_name','')), '') is null then raise exception 'Prénom obligatoire.'; end if;
        if exists (
          select 1 from public.clients c where c.organization_id = p_organization_id
            and ((nullif(lower(trim(v_row->>'email')), '') is not null and lower(coalesce(c.email,'')) = lower(trim(v_row->>'email')))
              or (nullif(trim(v_row->>'phone'), '') is not null and regexp_replace(coalesce(c.phone,''),'[^0-9]','','g') = regexp_replace(v_row->>'phone','[^0-9]','','g')))
        ) then v_skipped := v_skipped + 1;
        else
          insert into public.clients (organization_id, first_name, last_name, email, phone, notes, created_by)
          values (p_organization_id, trim(v_row->>'first_name'), nullif(trim(v_row->>'last_name'),''), lower(nullif(trim(v_row->>'email'),'')), nullif(trim(v_row->>'phone'),''), nullif(trim(v_row->>'notes'),''), auth.uid());
          v_inserted := v_inserted + 1;
        end if;

      elsif p_import_type = 'coiffure_staff' then
        if nullif(trim(coalesce(v_row->>'display_name','')), '') is null then raise exception 'Nom du collaborateur obligatoire.'; end if;
        if exists (select 1 from public.staff s where s.organization_id = p_organization_id and lower(s.display_name)=lower(trim(v_row->>'display_name'))) then v_skipped := v_skipped + 1;
        else
          insert into public.staff (organization_id, display_name, email, phone, color)
          values (p_organization_id, trim(v_row->>'display_name'), lower(nullif(trim(v_row->>'email'),'')), nullif(trim(v_row->>'phone'),''), coalesce(nullif(trim(v_row->>'color'),''),'#2997ff'));
          v_inserted := v_inserted + 1;
        end if;

      elsif p_import_type = 'coiffure_services' then
        if nullif(trim(coalesce(v_row->>'name','')), '') is null then raise exception 'Nom de prestation obligatoire.'; end if;
        if exists (select 1 from public.services s where s.organization_id = p_organization_id and lower(s.name)=lower(trim(v_row->>'name'))) then v_skipped := v_skipped + 1;
        else
          insert into public.services (organization_id, name, description, duration_minutes, price_cents)
          values (p_organization_id, trim(v_row->>'name'), nullif(trim(v_row->>'description'),''), greatest(5, least(720, coalesce(nullif(v_row->>'duration_minutes','')::integer,30))), greatest(0, round(coalesce(nullif(replace(v_row->>'price_euros',',','.'),'')::numeric,0)*100)::integer));
          v_inserted := v_inserted + 1;
        end if;

      elsif p_import_type = 'training_trainees' then
        if nullif(trim(coalesce(v_row->>'first_name','')), '') is null or nullif(trim(coalesce(v_row->>'last_name','')), '') is null then raise exception 'Prénom et nom obligatoires.'; end if;
        if exists (select 1 from public.training_trainees t where t.organization_id=p_organization_id and nullif(lower(trim(v_row->>'email')),'') is not null and lower(coalesce(t.email,''))=lower(trim(v_row->>'email'))) then v_skipped := v_skipped + 1;
        else
          insert into public.training_trainees (organization_id, first_name, last_name, email, phone, company, notes, created_by)
          values (p_organization_id, trim(v_row->>'first_name'), trim(v_row->>'last_name'), lower(nullif(trim(v_row->>'email'),'')), nullif(trim(v_row->>'phone'),''), nullif(trim(v_row->>'company'),''), nullif(trim(v_row->>'notes'),''), auth.uid());
          v_inserted := v_inserted + 1;
        end if;

      elsif p_import_type = 'training_trainers' then
        if nullif(trim(coalesce(v_row->>'first_name','')), '') is null or nullif(trim(coalesce(v_row->>'last_name','')), '') is null then raise exception 'Prénom et nom obligatoires.'; end if;
        if exists (select 1 from public.training_trainers t where t.organization_id=p_organization_id and nullif(lower(trim(v_row->>'email')),'') is not null and lower(coalesce(t.email,''))=lower(trim(v_row->>'email'))) then v_skipped := v_skipped + 1;
        else
          insert into public.training_trainers (organization_id, first_name, last_name, email, phone, specialties, notes, created_by)
          values (p_organization_id, trim(v_row->>'first_name'), trim(v_row->>'last_name'), lower(nullif(trim(v_row->>'email'),'')), nullif(trim(v_row->>'phone'),''), case when nullif(trim(v_row->>'specialties'),'') is null then '{}'::text[] else regexp_split_to_array(trim(v_row->>'specialties'),'\s*;\s*') end, nullif(trim(v_row->>'notes'),''), auth.uid());
          v_inserted := v_inserted + 1;
        end if;

      elsif p_import_type = 'training_programs' then
        if nullif(trim(coalesce(v_row->>'title','')), '') is null then raise exception 'Titre du programme obligatoire.'; end if;
        if exists (select 1 from public.training_programs p where p.organization_id=p_organization_id and lower(p.title)=lower(trim(v_row->>'title'))) then v_skipped := v_skipped + 1;
        else
          v_value := lower(coalesce(nullif(trim(v_row->>'modality'),''),'presentiel'));
          if v_value not in ('presentiel','distanciel','hybride') then v_value := 'presentiel'; end if;
          insert into public.training_programs (organization_id, title, code, duration_hours, modality, objectives, description, created_by)
          values (p_organization_id, trim(v_row->>'title'), nullif(trim(v_row->>'code'),''), greatest(0.5, least(2000, coalesce(nullif(replace(v_row->>'duration_hours',',','.'),'')::numeric,7))), v_value, nullif(trim(v_row->>'objectives'),''), nullif(trim(v_row->>'description'),''), auth.uid());
          v_inserted := v_inserted + 1;
        end if;

      elsif p_import_type in ('security_clients','cleaning_clients') then
        if nullif(trim(coalesce(v_row->>'company_name','')), '') is null then raise exception 'Nom de l’entreprise cliente obligatoire.'; end if;
        if p_import_type = 'security_clients' then
          if exists (select 1 from public.security_clients c where c.organization_id=p_organization_id and lower(c.company_name)=lower(trim(v_row->>'company_name'))) then v_skipped := v_skipped + 1;
          else
            insert into public.security_clients (organization_id, company_name, contact_name, email, phone, billing_address, postal_code, city, siret, notes, created_by)
            values (p_organization_id, trim(v_row->>'company_name'), nullif(trim(v_row->>'contact_name'),''), lower(nullif(trim(v_row->>'email'),'')), nullif(trim(v_row->>'phone'),''), nullif(trim(v_row->>'billing_address'),''), nullif(trim(v_row->>'postal_code'),''), nullif(trim(v_row->>'city'),''), nullif(trim(v_row->>'siret'),''), nullif(trim(v_row->>'notes'),''), auth.uid());
            v_inserted := v_inserted + 1;
          end if;
        else
          if exists (select 1 from public.cleaning_clients c where c.organization_id=p_organization_id and lower(c.company_name)=lower(trim(v_row->>'company_name'))) then v_skipped := v_skipped + 1;
          else
            insert into public.cleaning_clients (organization_id, company_name, contact_name, email, phone, billing_address, postal_code, city, notes, created_by)
            values (p_organization_id, trim(v_row->>'company_name'), nullif(trim(v_row->>'contact_name'),''), lower(nullif(trim(v_row->>'email'),'')), nullif(trim(v_row->>'phone'),''), nullif(trim(v_row->>'billing_address'),''), nullif(trim(v_row->>'postal_code'),''), nullif(trim(v_row->>'city'),''), nullif(trim(v_row->>'notes'),''), auth.uid());
            v_inserted := v_inserted + 1;
          end if;
        end if;

      elsif p_import_type in ('security_agents','cleaning_agents') then
        if nullif(trim(coalesce(v_row->>'first_name','')), '') is null or nullif(trim(coalesce(v_row->>'last_name','')), '') is null then raise exception 'Prénom et nom obligatoires.'; end if;
        v_value := lower(coalesce(nullif(trim(v_row->>'contract_type'),''),'cdi'));
        if v_value not in ('cdi','cdd','interim','sous_traitant','autre') then v_value := 'autre'; end if;
        if p_import_type = 'security_agents' then
          if exists (select 1 from public.security_agents a where a.organization_id=p_organization_id and ((nullif(trim(v_row->>'employee_number'),'') is not null and a.employee_number=trim(v_row->>'employee_number')) or (nullif(lower(trim(v_row->>'email')),'') is not null and lower(coalesce(a.email,''))=lower(trim(v_row->>'email'))))) then v_skipped := v_skipped + 1;
          else
            insert into public.security_agents (organization_id, first_name, last_name, employee_number, email, phone, contract_type, weekly_hours, notes, created_by)
            values (p_organization_id, trim(v_row->>'first_name'), trim(v_row->>'last_name'), nullif(trim(v_row->>'employee_number'),''), lower(nullif(trim(v_row->>'email'),'')), nullif(trim(v_row->>'phone'),''), v_value, greatest(0, least(80, coalesce(nullif(replace(v_row->>'weekly_hours',',','.'),'')::numeric,35))), nullif(trim(v_row->>'notes'),''), auth.uid());
            v_inserted := v_inserted + 1;
          end if;
        else
          if exists (select 1 from public.cleaning_agents a where a.organization_id=p_organization_id and ((nullif(trim(v_row->>'employee_number'),'') is not null and a.employee_number=trim(v_row->>'employee_number')) or (nullif(lower(trim(v_row->>'email')),'') is not null and lower(coalesce(a.email,''))=lower(trim(v_row->>'email'))))) then v_skipped := v_skipped + 1;
          else
            insert into public.cleaning_agents (organization_id, first_name, last_name, employee_number, email, phone, contract_type, weekly_hours, skills, created_by)
            values (p_organization_id, trim(v_row->>'first_name'), trim(v_row->>'last_name'), nullif(trim(v_row->>'employee_number'),''), lower(nullif(trim(v_row->>'email'),'')), nullif(trim(v_row->>'phone'),''), v_value, greatest(0, least(80, coalesce(nullif(replace(v_row->>'weekly_hours',',','.'),'')::numeric,35))), case when nullif(trim(v_row->>'skills'),'') is null then '{}'::text[] else regexp_split_to_array(trim(v_row->>'skills'),'\s*;\s*') end, auth.uid());
            v_inserted := v_inserted + 1;
          end if;
        end if;

      elsif p_import_type in ('security_sites','cleaning_sites') then
        if nullif(trim(coalesce(v_row->>'client_company','')), '') is null or nullif(trim(coalesce(v_row->>'name','')), '') is null then raise exception 'Client et nom du site obligatoires.'; end if;
        if p_import_type = 'security_sites' then
          select id into v_client_id from public.security_clients where organization_id=p_organization_id and lower(company_name)=lower(trim(v_row->>'client_company')) limit 1;
          if v_client_id is null then raise exception 'Client introuvable : %', trim(v_row->>'client_company'); end if;
          if exists (select 1 from public.security_sites s where s.organization_id=p_organization_id and lower(s.name)=lower(trim(v_row->>'name'))) then v_skipped := v_skipped + 1;
          else
            insert into public.security_sites (organization_id, client_id, name, code, address, postal_code, city, contact_name, contact_phone, hourly_rate_cents, created_by)
            values (p_organization_id, v_client_id, trim(v_row->>'name'), nullif(trim(v_row->>'code'),''), nullif(trim(v_row->>'address'),''), nullif(trim(v_row->>'postal_code'),''), nullif(trim(v_row->>'city'),''), nullif(trim(v_row->>'contact_name'),''), nullif(trim(v_row->>'contact_phone'),''), greatest(0, round(coalesce(nullif(replace(v_row->>'hourly_rate_euros',',','.'),'')::numeric,0)*100)::integer), auth.uid());
            v_inserted := v_inserted + 1;
          end if;
        else
          select id into v_client_id from public.cleaning_clients where organization_id=p_organization_id and lower(company_name)=lower(trim(v_row->>'client_company')) limit 1;
          if v_client_id is null then raise exception 'Client introuvable : %', trim(v_row->>'client_company'); end if;
          if exists (select 1 from public.cleaning_sites s where s.organization_id=p_organization_id and lower(s.name)=lower(trim(v_row->>'name'))) then v_skipped := v_skipped + 1;
          else
            v_value := lower(coalesce(nullif(trim(v_row->>'billing_mode'),''),'hourly'));
            if v_value not in ('hourly','flat') then v_value := 'hourly'; end if;
            insert into public.cleaning_sites (organization_id, client_id, name, code, address, postal_code, city, contact_name, contact_phone, billing_mode, service_rate_cents, instructions, access_details, expected_frequency, created_by)
            values (p_organization_id, v_client_id, trim(v_row->>'name'), nullif(trim(v_row->>'code'),''), nullif(trim(v_row->>'address'),''), nullif(trim(v_row->>'postal_code'),''), nullif(trim(v_row->>'city'),''), nullif(trim(v_row->>'contact_name'),''), nullif(trim(v_row->>'contact_phone'),''), v_value, greatest(0, round(coalesce(nullif(replace(v_row->>'service_rate_euros',',','.'),'')::numeric,0)*100)::integer), nullif(trim(v_row->>'instructions'),''), nullif(trim(v_row->>'access_details'),''), nullif(trim(v_row->>'expected_frequency'),''), auth.uid());
            v_inserted := v_inserted + 1;
          end if;
        end if;

      elsif p_import_type = 'restaurant_employees' then
        if nullif(trim(coalesce(v_row->>'first_name','')), '') is null or nullif(trim(coalesce(v_row->>'last_name','')), '') is null then raise exception 'Prénom et nom obligatoires.'; end if;
        v_value := lower(coalesce(nullif(trim(v_row->>'role_code'),''),'server'));
        if v_value not in ('manager','server','cook','host','dishwasher','other') then v_value := 'other'; end if;
        if exists (select 1 from public.restaurant_employees e where e.organization_id=p_organization_id and nullif(lower(trim(v_row->>'email')),'') is not null and lower(coalesce(e.email,''))=lower(trim(v_row->>'email'))) then v_skipped := v_skipped + 1;
        else
          insert into public.restaurant_employees (organization_id, first_name, last_name, role_code, email, phone, weekly_hours, created_by)
          values (p_organization_id, trim(v_row->>'first_name'), trim(v_row->>'last_name'), v_value, lower(nullif(trim(v_row->>'email'),'')), nullif(trim(v_row->>'phone'),''), greatest(0, least(80, coalesce(nullif(replace(v_row->>'weekly_hours',',','.'),'')::numeric,35))), auth.uid());
          v_inserted := v_inserted + 1;
        end if;

      elsif p_import_type = 'restaurant_suppliers' then
        if nullif(trim(coalesce(v_row->>'name','')), '') is null then raise exception 'Nom du fournisseur obligatoire.'; end if;
        if exists (select 1 from public.restaurant_suppliers s where s.organization_id=p_organization_id and lower(s.name)=lower(trim(v_row->>'name'))) then v_skipped := v_skipped + 1;
        else
          insert into public.restaurant_suppliers (organization_id, name, contact_name, email, phone, notes, created_by)
          values (p_organization_id, trim(v_row->>'name'), nullif(trim(v_row->>'contact_name'),''), lower(nullif(trim(v_row->>'email'),'')), nullif(trim(v_row->>'phone'),''), nullif(trim(v_row->>'notes'),''), auth.uid());
          v_inserted := v_inserted + 1;
        end if;

      elsif p_import_type = 'restaurant_stock' then
        if nullif(trim(coalesce(v_row->>'name','')), '') is null then raise exception 'Nom du produit obligatoire.'; end if;
        v_supplier_id := null;
        if nullif(trim(v_row->>'supplier_name'),'') is not null then
          select id into v_supplier_id from public.restaurant_suppliers where organization_id=p_organization_id and lower(name)=lower(trim(v_row->>'supplier_name')) limit 1;
        end if;
        if exists (select 1 from public.restaurant_stock_items s where s.organization_id=p_organization_id and lower(s.name)=lower(trim(v_row->>'name'))) then v_skipped := v_skipped + 1;
        else
          insert into public.restaurant_stock_items (organization_id, supplier_id, name, category, unit, quantity, minimum_quantity, unit_cost_cents, created_by)
          values (p_organization_id, v_supplier_id, trim(v_row->>'name'), nullif(trim(v_row->>'category'),''), coalesce(nullif(trim(v_row->>'unit'),''),'unité'), greatest(0, coalesce(nullif(replace(v_row->>'quantity',',','.'),'')::numeric,0)), greatest(0, coalesce(nullif(replace(v_row->>'minimum_quantity',',','.'),'')::numeric,0)), greatest(0, round(coalesce(nullif(replace(v_row->>'unit_cost_euros',',','.'),'')::numeric,0)*100)::integer), auth.uid());
          v_inserted := v_inserted + 1;
        end if;

      elsif p_import_type = 'restaurant_menu' then
        if nullif(trim(coalesce(v_row->>'name','')), '') is null then raise exception 'Nom du plat obligatoire.'; end if;
        v_value := coalesce(nullif(trim(v_row->>'category'),''),'Autres');
        select id into v_category_id from public.restaurant_menu_categories where organization_id=p_organization_id and lower(name)=lower(v_value) limit 1;
        if v_category_id is null then
          insert into public.restaurant_menu_categories (organization_id, name, created_by)
          values (p_organization_id, v_value, auth.uid()) returning id into v_category_id;
        end if;
        if exists (select 1 from public.restaurant_menu_items i where i.organization_id=p_organization_id and lower(i.name)=lower(trim(v_row->>'name'))) then v_skipped := v_skipped + 1;
        else
          insert into public.restaurant_menu_items (organization_id, category_id, name, description_fr, price_cents, allergens, vegetarian, vegan, available, created_by)
          values (
            p_organization_id,
            v_category_id,
            trim(v_row->>'name'),
            nullif(trim(v_row->>'description'),''),
            greatest(0, round(coalesce(nullif(replace(v_row->>'price_euros',',','.'),'')::numeric,0)*100)::integer),
            case when nullif(trim(v_row->>'allergens'),'') is null then '{}'::text[] else regexp_split_to_array(trim(v_row->>'allergens'),'\s*;\s*') end,
            lower(coalesce(v_row->>'vegetarian','false')) in ('true','1','oui','yes'),
            lower(coalesce(v_row->>'vegan','false')) in ('true','1','oui','yes'),
            true,
            auth.uid()
          );
          v_inserted := v_inserted + 1;
        end if;
      end if;
    exception when others then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('line',v_line,'message',sqlerrm));
    end;
  end loop;

  v_status := case when jsonb_array_length(v_errors) = 0 then 'completed' when v_inserted > 0 or v_skipped > 0 then 'completed_with_errors' else 'failed' end;

  update public.organization_import_jobs
  set status = v_status,
      inserted_rows = v_inserted,
      skipped_rows = v_skipped,
      error_rows = jsonb_array_length(v_errors),
      errors = v_errors,
      completed_at = now()
  where id = v_job_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'organization.import_completed',
    'organization_import_job',
    v_job_id::text,
    jsonb_build_object('import_type',p_import_type,'inserted',v_inserted,'skipped',v_skipped,'errors',jsonb_array_length(v_errors))
  );

  return jsonb_build_object(
    'job_id', v_job_id,
    'status', v_status,
    'total_rows', v_total,
    'inserted_rows', v_inserted,
    'skipped_rows', v_skipped,
    'error_rows', jsonb_array_length(v_errors),
    'errors', v_errors
  );
exception when others then
  if v_job_id is not null then
    update public.organization_import_jobs
    set status='failed', errors=jsonb_build_array(jsonb_build_object('message',sqlerrm)), error_rows=1, completed_at=now()
    where id=v_job_id;
  end if;
  raise;
end;
$$;

create or replace function public.list_organization_import_jobs(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if not public.is_org_member_any_status(p_organization_id) then raise exception 'Accès refusé.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',j.id,
    'import_type',j.import_type,
    'file_name',j.file_name,
    'status',j.status,
    'total_rows',j.total_rows,
    'inserted_rows',j.inserted_rows,
    'skipped_rows',j.skipped_rows,
    'error_rows',j.error_rows,
    'errors',j.errors,
    'created_at',j.created_at,
    'completed_at',j.completed_at
  ) order by j.created_at desc), '[]'::jsonb)
  into v_result
  from public.organization_import_jobs j
  where j.organization_id=p_organization_id;
  return v_result;
end;
$$;

-- 4) Diagnostic SaaS central et export de support
create or replace function public.admin_organization_diagnostics(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_subscription public.organization_subscriptions%rowtype;
  v_members integer := 0;
  v_owners integer := 0;
  v_limit integer := 1;
  v_modules integer := 0;
  v_documents_bytes bigint := 0;
  v_email_failed integer := 0;
  v_email_pending integer := 0;
  v_push_failed integer := 0;
  v_push_pending integer := 0;
  v_push_active integer := 0;
  v_open_tickets integer := 0;
  v_recent_activity timestamptz;
  v_setup jsonb;
  v_last_import jsonb;
  v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;

  select * into v_org from public.organizations where id=p_organization_id;
  if not found then raise exception 'Entreprise introuvable.'; end if;
  select * into v_subscription from public.organization_subscriptions where organization_id=p_organization_id;

  select count(*)::integer,
         count(*) filter (where role='owner')::integer
  into v_members,v_owners
  from public.organization_members where organization_id=p_organization_id and status='active';

  v_limit := coalesce(public.domain_plan_member_limit(v_org.business_type,v_org.plan),1);
  if v_org.plan='metier' then v_limit := coalesce(v_org.metier_member_limit,v_limit); end if;

  select count(*)::integer into v_modules from public.organization_modules where organization_id=p_organization_id and enabled;
  select coalesce(sum(size_bytes),0)::bigint into v_documents_bytes from public.documents where organization_id=p_organization_id;
  select count(*) filter (where status='failed')::integer,
         count(*) filter (where status in ('pending','sending'))::integer
  into v_email_failed,v_email_pending from public.email_outbox where organization_id=p_organization_id;

  select count(*) filter (where q.status='failed')::integer,
         count(*) filter (where q.status in ('pending','sending'))::integer
  into v_push_failed,v_push_pending
  from public.push_delivery_queue q
  join public.notification_events e on e.id=q.event_id
  where e.organization_id=p_organization_id;

  select count(distinct ps.id)::integer into v_push_active
  from public.push_subscriptions ps
  join public.organization_members m on m.user_id=ps.user_id and m.organization_id=p_organization_id and m.status='active'
  where ps.active;

  select count(*)::integer into v_open_tickets from public.platform_support_tickets where organization_id=p_organization_id and status in ('open','in_progress','waiting_customer');
  select max(created_at) into v_recent_activity from public.audit_logs where organization_id=p_organization_id;
  v_setup := public.get_organization_launch_center(p_organization_id);

  select jsonb_build_object(
    'id',j.id,'import_type',j.import_type,'status',j.status,'inserted_rows',j.inserted_rows,'error_rows',j.error_rows,'created_at',j.created_at
  ) into v_last_import
  from public.organization_import_jobs j
  where j.organization_id=p_organization_id
  order by j.created_at desc limit 1;

  select jsonb_build_object(
    'organization', jsonb_build_object(
      'id',v_org.id,'name',v_org.name,'slug',v_org.slug,'business_type',v_org.business_type,'plan',v_org.plan,
      'status',v_org.status,'created_at',v_org.created_at,'last_activity_at',v_recent_activity
    ),
    'summary', jsonb_build_object(
      'members',v_members,'member_limit',v_limit,'modules',v_modules,'documents_bytes',v_documents_bytes,
      'open_tickets',v_open_tickets,'email_failed',v_email_failed,'push_failed',v_push_failed,
      'setup_progress',coalesce((v_setup->>'progress')::integer,0)
    ),
    'checks', jsonb_build_array(
      jsonb_build_object('key','organization','label','Accès entreprise','status',case when v_org.status in ('active','trial') then 'ok' when v_org.status='suspended' then 'warning' else 'error' end,'detail','Statut : ' || v_org.status),
      jsonb_build_object('key','subscription','label','Abonnement','status',case when coalesce(v_subscription.status,'active') in ('active','trialing') then 'ok' when v_subscription.status in ('past_due','paused') then 'warning' else 'error' end,'detail','État : ' || coalesce(v_subscription.status,'active')),
      jsonb_build_object('key','owner','label','Propriétaire','status',case when v_owners=1 then 'ok' when v_owners=0 then 'error' else 'warning' end,'detail',v_owners || ' propriétaire(s) actif(s)'),
      jsonb_build_object('key','members','label','Quotas utilisateurs','status',case when v_members<=v_limit then 'ok' else 'error' end,'detail',v_members || ' / ' || v_limit || ' accès actifs'),
      jsonb_build_object('key','onboarding','label','Mise en service','status',case when coalesce((v_setup->>'progress')::integer,0)>=80 then 'ok' when coalesce((v_setup->>'progress')::integer,0)>=50 then 'warning' else 'error' end,'detail',coalesce(v_setup->>'progress','0') || '% terminé'),
      jsonb_build_object('key','email','label','File e-mails','status',case when v_email_failed>0 then 'error' when v_email_pending>20 then 'warning' else 'ok' end,'detail',v_email_failed || ' échec(s) · ' || v_email_pending || ' en attente'),
      jsonb_build_object('key','push','label','Notifications push','status',case when v_push_failed>0 then 'warning' when v_push_active=0 and v_members>1 then 'warning' else 'ok' end,'detail',v_push_active || ' appareil(s) · ' || v_push_failed || ' échec(s) · ' || v_push_pending || ' en attente'),
      jsonb_build_object('key','support','label','Support','status',case when v_open_tickets>3 then 'warning' else 'ok' end,'detail',v_open_tickets || ' ticket(s) ouvert(s)'),
      jsonb_build_object('key','activity','label','Activité récente','status',case when coalesce(v_recent_activity,v_org.created_at) >= now()-interval '14 days' then 'ok' else 'warning' end,'detail','Dernière activité : ' || coalesce(to_char(v_recent_activity,'DD/MM/YYYY HH24:MI'),'aucune trace')),
      jsonb_build_object('key','storage','label','Stockage documentaire','status',case when v_org.metier_storage_limit_mb is not null and v_documents_bytes > v_org.metier_storage_limit_mb::bigint*1024*1024 then 'error' else 'ok' end,'detail',round(v_documents_bytes::numeric/1024/1024,1) || ' Mo utilisés')
    ),
    'setup',v_setup,
    'last_import',v_last_import
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_export_organization_snapshot(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;
  select jsonb_build_object(
    'generated_at',now(),
    'organization',(select to_jsonb(o) - 'security_bank_iban' - 'security_bank_bic' from public.organizations o where o.id=p_organization_id),
    'subscription',(select to_jsonb(s) - 'provider_customer_id' - 'provider_subscription_id' from public.organization_subscriptions s where s.organization_id=p_organization_id),
    'members',(select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'status',m.status,'created_at',m.created_at)),'[]'::jsonb) from public.organization_members m where m.organization_id=p_organization_id),
    'modules',(select coalesce(jsonb_agg(jsonb_build_object('module_key',m.module_key,'enabled',m.enabled)),'[]'::jsonb) from public.organization_modules m where m.organization_id=p_organization_id),
    'support_tickets',(select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'category',t.category,'priority',t.priority,'status',t.status,'subject',t.subject,'created_at',t.created_at)),'[]'::jsonb) from public.platform_support_tickets t where t.organization_id=p_organization_id),
    'imports',(select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'import_type',j.import_type,'status',j.status,'total_rows',j.total_rows,'inserted_rows',j.inserted_rows,'skipped_rows',j.skipped_rows,'error_rows',j.error_rows,'created_at',j.created_at)),'[]'::jsonb) from public.organization_import_jobs j where j.organization_id=p_organization_id),
    'diagnostics',public.admin_organization_diagnostics(p_organization_id)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_organization_launch_center(uuid) from public;
revoke all on function public.set_organization_launch_test(uuid,boolean) from public;
revoke all on function public.import_organization_records(uuid,text,text,jsonb) from public;
revoke all on function public.list_organization_import_jobs(uuid) from public;
revoke all on function public.admin_organization_diagnostics(uuid) from public;
revoke all on function public.admin_export_organization_snapshot(uuid) from public;

grant execute on function public.get_organization_launch_center(uuid) to authenticated;
grant execute on function public.set_organization_launch_test(uuid,boolean) to authenticated;
grant execute on function public.import_organization_records(uuid,text,text,jsonb) to authenticated;
grant execute on function public.list_organization_import_jobs(uuid) to authenticated;
grant execute on function public.admin_organization_diagnostics(uuid) to authenticated;
grant execute on function public.admin_export_organization_snapshot(uuid) to authenticated;

commit;
