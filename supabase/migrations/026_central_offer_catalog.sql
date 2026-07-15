-- NCR Suite V2.4.13 — catalogue central des offres par domaine
-- À exécuter après 025_training_session_closure.sql.
-- Cette migration prépare Sécurité, Nettoyage et Restauration sans ouvrir
-- leurs espaces avant la validation de leurs modules métier.

begin;

-- Statut de lancement distinct de l'activation commerciale du catalogue.
alter table public.business_domain_catalog
  add column if not exists launch_status text not null default 'active';

alter table public.business_domain_catalog
  drop constraint if exists business_domain_catalog_launch_status_check;
alter table public.business_domain_catalog
  add constraint business_domain_catalog_launch_status_check
  check (launch_status in ('active','planned'));

-- Retire les anciens contrôles de domaine afin de remplacer Artisan par Restauration.
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.organizations'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%business_type%'
  loop execute format('alter table public.organizations drop constraint %I', r.conname); end loop;

  for r in
    select conname from pg_constraint
    where conrelid = 'public.business_domain_catalog'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%business_type%'
  loop execute format('alter table public.business_domain_catalog drop constraint %I', r.conname); end loop;

  for r in
    select conname from pg_constraint
    where conrelid = 'public.domain_plan_catalog'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%business_type%'
  loop execute format('alter table public.domain_plan_catalog drop constraint %I', r.conname); end loop;
end
$$;

-- Reprise sûre des éventuels anciens espaces Artisan de démonstration.
do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.organizations'::regclass
      and tgname = 'protect_locked_metier_business_type'
      and not tgisinternal
  ) then
    execute 'alter table public.organizations disable trigger protect_locked_metier_business_type';
  end if;
end
$$;

update public.organizations
set business_type = 'restauration', updated_at = now()
where business_type = 'artisan';

insert into public.organization_modules (organization_id, module_key, enabled, settings)
select organization_id, 'restauration', enabled, settings
from public.organization_modules
where module_key = 'artisan'
on conflict (organization_id, module_key) do update
set enabled = excluded.enabled,
    settings = excluded.settings,
    updated_at = now();

delete from public.organization_modules where module_key = 'artisan';

do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.organizations'::regclass
      and tgname = 'protect_locked_metier_business_type'
      and not tgisinternal
  ) then
    execute 'alter table public.organizations enable trigger protect_locked_metier_business_type';
  end if;
end
$$;

delete from public.domain_billing_plan_links where business_type = 'artisan';
delete from public.domain_plan_catalog where business_type = 'artisan';
delete from public.business_domain_catalog where business_type = 'artisan';

alter table public.organizations
  add constraint organizations_business_type_check
  check (business_type in ('coiffure','nettoyage','securite','formation','restauration'));
alter table public.business_domain_catalog
  add constraint business_domain_catalog_business_type_check
  check (business_type in ('coiffure','nettoyage','securite','formation','restauration'));
alter table public.domain_plan_catalog
  add constraint domain_plan_catalog_business_type_check
  check (business_type in ('coiffure','nettoyage','securite','formation','restauration'));

insert into public.business_domain_catalog (
  business_type, display_name, minimum_monthly_price_cents, description, active, launch_status
)
values
  ('coiffure', 'Coiffure & beauté', 6990, 'Rendez-vous, clients, prestations et équipe.', true, 'active'),
  ('formation', 'Formation', 14990, 'Stagiaires, sessions, documents et émargements.', true, 'active'),
  ('securite', 'Sécurité privée', 11990, 'Planning, facturation, terrain, rondes et supervision.', true, 'planned'),
  ('nettoyage', 'Nettoyage', 10990, 'Planning, pointage, interventions et contrôle qualité.', true, 'planned'),
  ('restauration', 'Restauration', 10990, 'Équipe, réservations, menu, hygiène, stocks et rentabilité.', true, 'planned')
on conflict (business_type) do update
set display_name = excluded.display_name,
    minimum_monthly_price_cents = excluded.minimum_monthly_price_cents,
    description = excluded.description,
    active = excluded.active,
    launch_status = excluded.launch_status,
    updated_at = now();

insert into public.domain_plan_catalog (
  business_type, plan_key, display_name, monthly_price_cents, member_limit,
  features, short_description, sort_order, recommended, active
)
values
  ('coiffure', 'decouverte', 'Découverte', 990, 1, '{"public_booking":true,"confirmation_emails":true}'::jsonb, 'Le socle clients, prestations, rendez-vous et réservation publique.', 10, false, true),
  ('coiffure', 'essentielle', 'Essentielle', 1990, 3, '{"public_booking":true,"confirmation_emails":true,"automatic_reminders":true,"online_booking_management":true,"calendar_links":true,"team_access":true}'::jsonb, 'Ajoute les rappels, la gestion en ligne et les premiers accès collaborateurs.', 20, true, true),
  ('coiffure', 'professionnelle', 'Professionnelle', 3990, 10, '{"public_booking":true,"confirmation_emails":true,"automatic_reminders":true,"online_booking_management":true,"calendar_links":true,"team_access":true,"manager_role":true,"commercial_branding":true}'::jsonb, 'Ajoute la gestion structurée de l’équipe et la personnalisation commerciale.', 30, false, true),
  ('coiffure', 'metier', 'Métier', 6990, 100, '{"public_booking":true,"confirmation_emails":true,"automatic_reminders":true,"online_booking_management":true,"calendar_links":true,"team_access":true,"manager_role":true,"commercial_branding":true,"white_label":true,"multi_site":true,"custom_modules":true,"custom_roles":true,"custom_domain":true}'::jsonb, 'À partir de 69,90 € : configuration sur mesure.', 40, false, true),
  ('formation', 'decouverte', 'Découverte', 3990, 1, '{"training_programs":true,"training_trainees":true,"training_trainers":true,"training_sessions":true,"training_documents":true,"training_blank_attendance":true,"training_automatic_certificates":true}'::jsonb, 'Gestion, documents, feuille vierge et attestations automatiques.', 10, false, true),
  ('formation', 'essentielle', 'Essentielle', 6990, 3, '{"training_programs":true,"training_trainees":true,"training_trainers":true,"training_sessions":true,"training_documents":true,"training_blank_attendance":true,"training_automatic_certificates":true,"training_digital_attendance":true,"training_attendance_pdf":true,"commercial_branding":true,"training_document_branding":true,"training_email_branding":true}'::jsonb, 'Ajoute l’émargement numérique et la personnalisation des documents et e-mails.', 20, true, true),
  ('formation', 'professionnelle', 'Professionnelle', 9990, 10, '{"training_programs":true,"training_trainees":true,"training_trainers":true,"training_sessions":true,"training_documents":true,"training_blank_attendance":true,"training_automatic_certificates":true,"training_digital_attendance":true,"training_attendance_pdf":true,"commercial_branding":true,"training_document_branding":true,"training_email_branding":true,"training_satisfaction":true,"training_session_dossier":true,"multi_site":true,"team_access":true,"manager_role":true}'::jsonb, 'Ajoute les évaluations, le dossier complet, le multi-site et les rôles.', 30, false, true),
  ('formation', 'metier', 'Métier', 14990, 100, '{"training_programs":true,"training_trainees":true,"training_trainers":true,"training_sessions":true,"training_documents":true,"training_blank_attendance":true,"training_automatic_certificates":true,"training_digital_attendance":true,"training_attendance_pdf":true,"commercial_branding":true,"training_document_branding":true,"training_email_branding":true,"training_satisfaction":true,"training_session_dossier":true,"multi_site":true,"team_access":true,"manager_role":true,"white_label":true,"custom_modules":true,"custom_roles":true,"custom_domain":true}'::jsonb, 'À partir de 149,90 € : configuration contractuelle sur mesure.', 40, false, true),
  ('securite', 'decouverte', 'Découverte', 3990, 1, '{"security_planning":true,"security_clients_sites":true,"security_site_rates":true,"security_scheduled_billing":true}'::jsonb, 'Planning des agents et facturation selon les heures programmées et le tarif du site.', 10, false, true),
  ('securite', 'essentielle', 'Essentielle', 6990, 10, '{"security_planning":true,"security_clients_sites":true,"security_site_rates":true,"security_scheduled_billing":true,"team_access":true,"security_agent_portal":true,"security_qr_patrols":true,"security_smart_logbook":true,"security_site_instructions":true,"security_logbook_pdf":true}'::jsonb, 'Ajoute 10 agents connectés, rondes QR et main courante intelligente.', 20, true, true),
  ('securite', 'professionnelle', 'Professionnelle', 8990, 50, '{"security_planning":true,"security_clients_sites":true,"security_site_rates":true,"security_scheduled_billing":true,"team_access":true,"security_agent_portal":true,"security_qr_patrols":true,"security_smart_logbook":true,"security_site_instructions":true,"security_logbook_pdf":true,"security_geolocation":true,"security_pti_sos":true,"security_realtime_supervision":true,"security_agent_roles":true,"manager_role":true}'::jsonb, 'Ajoute 50 agents, géolocalisation, PTI/SOS et supervision temps réel.', 30, false, true),
  ('securite', 'metier', 'Métier', 11990, 100, '{"security_planning":true,"security_clients_sites":true,"security_site_rates":true,"security_scheduled_billing":true,"team_access":true,"security_agent_portal":true,"security_qr_patrols":true,"security_smart_logbook":true,"security_site_instructions":true,"security_logbook_pdf":true,"security_geolocation":true,"security_pti_sos":true,"security_realtime_supervision":true,"security_agent_roles":true,"manager_role":true,"white_label":true,"multi_site":true,"custom_modules":true,"custom_roles":true,"custom_domain":true}'::jsonb, 'À partir de 119,90 € : capacité, agences et modules sur mesure.', 40, false, true),
  ('nettoyage', 'decouverte', 'Découverte', 2990, 1, '{"cleaning_clients_sites":true,"cleaning_planning":true,"cleaning_scheduled_billing":true}'::jsonb, 'Clients, sites, planning, affectations et facturation programmée.', 10, false, true),
  ('nettoyage', 'essentielle', 'Essentielle', 4990, 10, '{"cleaning_clients_sites":true,"cleaning_planning":true,"cleaning_scheduled_billing":true,"team_access":true,"cleaning_agent_portal":true,"cleaning_time_clock":true,"cleaning_site_instructions":true,"cleaning_visit_reports":true,"cleaning_before_after_photos":true}'::jsonb, 'Ajoute 10 agents connectés, pointage, rapports et photos.', 20, true, true),
  ('nettoyage', 'professionnelle', 'Professionnelle', 7990, 50, '{"cleaning_clients_sites":true,"cleaning_planning":true,"cleaning_scheduled_billing":true,"team_access":true,"cleaning_agent_portal":true,"cleaning_time_clock":true,"cleaning_site_instructions":true,"cleaning_visit_reports":true,"cleaning_before_after_photos":true,"cleaning_quality_control":true,"cleaning_anomalies":true,"cleaning_stock":true,"multi_site":true,"cleaning_statistics":true,"cleaning_agent_roles":true,"manager_role":true}'::jsonb, 'Ajoute 50 agents, contrôle qualité, stocks, multi-site et statistiques.', 30, false, true),
  ('nettoyage', 'metier', 'Métier', 10990, 100, '{"cleaning_clients_sites":true,"cleaning_planning":true,"cleaning_scheduled_billing":true,"team_access":true,"cleaning_agent_portal":true,"cleaning_time_clock":true,"cleaning_site_instructions":true,"cleaning_visit_reports":true,"cleaning_before_after_photos":true,"cleaning_quality_control":true,"cleaning_anomalies":true,"cleaning_stock":true,"multi_site":true,"cleaning_statistics":true,"cleaning_agent_roles":true,"manager_role":true,"white_label":true,"custom_modules":true,"custom_roles":true,"custom_domain":true}'::jsonb, 'À partir de 109,90 € : capacité, portail client et processus sur mesure.', 40, false, true),
  ('restauration', 'decouverte', 'Découverte', 2990, 1, '{"restaurant_staff_planning":true,"restaurant_menu":true,"restaurant_allergens":true,"restaurant_suppliers":true,"restaurant_basic_stock":true,"restaurant_manual_reservations":true}'::jsonb, 'Équipe, planning, carte, allergènes, fournisseurs et stocks simples.', 10, false, true),
  ('restauration', 'essentielle', 'Essentielle', 4990, 10, '{"restaurant_staff_planning":true,"restaurant_menu":true,"restaurant_allergens":true,"restaurant_suppliers":true,"restaurant_basic_stock":true,"restaurant_manual_reservations":true,"team_access":true,"restaurant_employee_portal":true,"restaurant_basic_roles":true,"restaurant_online_reservations":true,"restaurant_floor_plan":true,"restaurant_multilingual_qr_menu":true,"restaurant_temperatures":true,"restaurant_checklists":true,"restaurant_document_email_branding":true,"commercial_branding":true}'::jsonb, 'Ajoute 10 employés, réservations en ligne et menu QR en quatre langues.', 20, true, true),
  ('restauration', 'professionnelle', 'Professionnelle', 7990, 50, '{"restaurant_staff_planning":true,"restaurant_menu":true,"restaurant_allergens":true,"restaurant_suppliers":true,"restaurant_basic_stock":true,"restaurant_manual_reservations":true,"team_access":true,"restaurant_employee_portal":true,"restaurant_basic_roles":true,"restaurant_online_reservations":true,"restaurant_floor_plan":true,"restaurant_multilingual_qr_menu":true,"restaurant_temperatures":true,"restaurant_checklists":true,"restaurant_document_email_branding":true,"commercial_branding":true,"restaurant_manager_role":true,"manager_role":true,"multi_site":true,"restaurant_realtime_supervision":true,"restaurant_advanced_stock":true,"restaurant_inventory":true,"restaurant_waste":true,"restaurant_supplier_orders":true,"restaurant_food_cost":true,"restaurant_statistics":true}'::jsonb, 'Ajoute 50 employés, multi-site, stocks avancés et rentabilité.', 30, false, true),
  ('restauration', 'metier', 'Métier', 10990, 100, '{"restaurant_staff_planning":true,"restaurant_menu":true,"restaurant_allergens":true,"restaurant_suppliers":true,"restaurant_basic_stock":true,"restaurant_manual_reservations":true,"team_access":true,"restaurant_employee_portal":true,"restaurant_basic_roles":true,"restaurant_online_reservations":true,"restaurant_floor_plan":true,"restaurant_multilingual_qr_menu":true,"restaurant_temperatures":true,"restaurant_checklists":true,"restaurant_document_email_branding":true,"commercial_branding":true,"restaurant_manager_role":true,"manager_role":true,"multi_site":true,"restaurant_realtime_supervision":true,"restaurant_advanced_stock":true,"restaurant_inventory":true,"restaurant_waste":true,"restaurant_supplier_orders":true,"restaurant_food_cost":true,"restaurant_statistics":true,"white_label":true,"custom_modules":true,"custom_roles":true,"custom_domain":true}'::jsonb, 'À partir de 109,90 € : groupes, franchises et intégrations sur mesure.', 40, false, true)
on conflict (business_type, plan_key) do update
set display_name = excluded.display_name,
    monthly_price_cents = excluded.monthly_price_cents,
    member_limit = excluded.member_limit,
    features = excluded.features,
    short_description = excluded.short_description,
    sort_order = excluded.sort_order,
    recommended = excluded.recommended,
    active = excluded.active,
    updated_at = now();

insert into public.domain_billing_plan_links (business_type, plan_key, provider, active)
select d.business_type, d.plan_key, 'qonto', false
from public.domain_plan_catalog d
where d.business_type in ('securite','nettoyage','restauration')
on conflict (business_type, plan_key) do nothing;

-- Compatibilité des modules Métier et préparation du domaine Restauration.
update public.module_catalog
set compatible_business_types = array_remove(compatible_business_types, 'artisan'),
    updated_at = now()
where 'artisan' = any(compatible_business_types);

update public.module_catalog
set compatible_business_types = array_append(compatible_business_types, 'restauration'),
    updated_at = now()
where module_key in ('planning','documents')
  and not ('restauration' = any(compatible_business_types));

update public.module_catalog set active = false, updated_at = now() where module_key = 'quotes';

insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, active, sort_order
)
values
  ('restauration', 'Restauration', 'Clé métier du domaine Restauration.', 'restauration', 'utensils', '{restauration}', false, true, true, 700),
  ('restaurant_menu', 'Carte & menus', 'Plats, catégories, prix et allergènes.', 'restauration', 'utensils', '{restauration}', false, true, true, 710),
  ('restaurant_reservations', 'Réservations', 'Réservations internes et en ligne.', 'restauration', 'calendar', '{restauration}', false, true, true, 720),
  ('restaurant_floor_plan', 'Plan de salle', 'Tables, zones et capacité.', 'restauration', 'map', '{restauration}', false, false, true, 730),
  ('restaurant_qr_menu', 'Menu QR multilingue', 'Menu français, anglais, espagnol et italien.', 'restauration', 'file', '{restauration}', false, false, true, 740),
  ('restaurant_food_safety', 'Hygiène & températures', 'Relevés et checklists HACCP.', 'restauration', 'clipboard', '{restauration}', false, false, true, 750),
  ('restaurant_stock', 'Stocks & fournisseurs', 'Stocks, inventaires et commandes.', 'restauration', 'briefcase', '{restauration}', false, false, true, 760)
on conflict (module_key) do update
set display_name = excluded.display_name,
    description = excluded.description,
    category = excluded.category,
    icon_key = excluded.icon_key,
    compatible_business_types = excluded.compatible_business_types,
    core_module = excluded.core_module,
    default_enabled = excluded.default_enabled,
    active = excluded.active,
    sort_order = excluded.sort_order,
    updated_at = now();

-- Les créations restent limitées aux domaines réellement disponibles.
create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_business_type text,
  p_primary_color text default '#2997ff'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := trim(p_name);
  v_slug text := lower(trim(p_slug));
  v_trial_days integer := 0;
  v_trial_plan text := 'decouverte';
  v_status text := 'active';
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'Invalid organization name';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) not between 2 and 80 then
    raise exception 'Invalid organization slug';
  end if;

  if p_business_type not in ('coiffure','nettoyage','securite','formation','restauration') then
    raise exception 'Unsupported business type';
  end if;

  if not exists (
    select 1 from public.business_domain_catalog
    where business_type = p_business_type
      and active = true
      and launch_status = 'active'
  ) then
    raise exception 'Ce domaine métier est encore en préparation.';
  end if;

  if p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Invalid primary color';
  end if;

  select default_trial_days, default_trial_plan
  into v_trial_days, v_trial_plan
  from public.platform_billing_settings
  where singleton = true;

  v_trial_days := coalesce(v_trial_days, 0);
  v_trial_plan := coalesce(v_trial_plan, 'decouverte');
  v_status := case when v_trial_days > 0 then 'trial' else 'active' end;

  insert into public.organizations (name, slug, business_type, plan, status, primary_color, created_by)
  values (v_name, v_slug, p_business_type, v_trial_plan, v_status, p_primary_color, auth.uid())
  returning id into v_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_id, auth.uid(), 'owner', 'active');

  insert into public.organization_modules (organization_id, module_key)
  values
    (v_id, 'dashboard'),
    (v_id, 'settings'),
    (v_id, p_business_type)
  on conflict do nothing;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    v_id,
    auth.uid(),
    'organization.created',
    'organization',
    v_id::text,
    jsonb_build_object('trial_days', v_trial_days, 'initial_plan', v_trial_plan)
  );

  return v_id;
end;
$$;

create or replace function public.admin_create_organization_space(
  p_owner_email text,
  p_name text,
  p_slug text,
  p_business_type text,
  p_plan text,
  p_monthly_price_cents integer,
  p_trial_days integer default 0,
  p_primary_color text default '#2997ff',
  p_internal_notes text default null,
  p_metier_setup_fee_cents integer default 0,
  p_metier_member_limit integer default null,
  p_metier_site_limit integer default null,
  p_metier_storage_limit_mb integer default null,
  p_metier_contract_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_owner_confirmed_at timestamptz;
  v_owner_is_platform_admin boolean := false;
  v_organization_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_owner_email text := lower(trim(coalesce(p_owner_email, '')));
  v_status text;
  v_subscription_status text;
  v_trial_ends_at timestamptz;
  v_default_price integer;
  v_minimum_price integer;
  v_business_label text;
  v_member_limit integer;
  v_site_limit integer;
  v_storage_limit integer;
  v_suffix text;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur NCR peut créer un nouvel espace.';
  end if;

  if v_owner_email = '' or v_owner_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'L’adresse e-mail du propriétaire est invalide.';
  end if;

  select u.id, u.email_confirmed_at,
         exists (
           select 1 from public.platform_admins pa
           where pa.user_id = u.id and pa.active = true
         )
    into v_owner_id, v_owner_confirmed_at, v_owner_is_platform_admin
  from auth.users u
  where lower(u.email::text) = v_owner_email
  limit 1;

  if v_owner_id is null then
    raise exception 'Aucun compte NCR Suite ne correspond à cette adresse. Le propriétaire doit d’abord créer et confirmer son compte.';
  end if;

  if v_owner_confirmed_at is null then
    raise exception 'Le compte du propriétaire doit confirmer son adresse e-mail avant la création de l’espace.';
  end if;

  if v_owner_is_platform_admin then
    raise exception 'Un compte d’administration NCR ne peut pas être propriétaire d’un espace entreprise. Utilise le compte entreprise du client.';
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'Le nom de l’espace doit contenir entre 2 et 120 caractères.';
  end if;

  if p_business_type not in ('coiffure','nettoyage','securite','formation','restauration') then
    raise exception 'Le domaine métier sélectionné est invalide.';
  end if;

  if not exists (
    select 1 from public.business_domain_catalog
    where business_type = p_business_type
      and active = true
      and launch_status = 'active'
  ) then
    raise exception 'Ce domaine métier est encore en préparation.';
  end if;

  if p_plan not in ('decouverte','essentielle','professionnelle','metier') then
    raise exception 'La formule sélectionnée est invalide.';
  end if;

  if p_primary_color is null or p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'La couleur principale est invalide.';
  end if;

  if p_trial_days is null or p_trial_days not between 0 and 365 then
    raise exception 'La durée d’essai doit être comprise entre 0 et 365 jours.';
  end if;

  select monthly_price_cents into v_default_price
  from public.plan_catalog
  where plan_key = p_plan and active = true;

  if v_default_price is null then
    raise exception 'La formule sélectionnée n’est pas disponible.';
  end if;

  if p_monthly_price_cents is null or p_monthly_price_cents < 0 then
    raise exception 'Le tarif mensuel est invalide.';
  end if;

  select d.minimum_monthly_price_cents, d.display_name
    into v_minimum_price, v_business_label
  from public.business_domain_catalog d
  where d.business_type = p_business_type and d.active = true;

  if p_plan = 'metier'
     and v_minimum_price is not null
     and p_monthly_price_cents < v_minimum_price then
    raise exception 'Le tarif minimum pour % est de % € HT/mois.',
      coalesce(v_business_label, p_business_type),
      to_char(v_minimum_price / 100.0, 'FM999999990D00');
  end if;

  if p_plan = 'metier' then
    if p_metier_setup_fee_cents is null or p_metier_setup_fee_cents < 0 then
      raise exception 'Les frais de configuration sont invalides.';
    end if;
    v_member_limit := greatest(1, least(100, coalesce(p_metier_member_limit, 10)));
    v_site_limit := greatest(1, least(50, coalesce(p_metier_site_limit, 1)));
    v_storage_limit := greatest(100, least(100000, coalesce(p_metier_storage_limit_mb, 5000)));
  else
    v_member_limit := null;
    v_site_limit := null;
    v_storage_limit := null;
  end if;

  if v_slug = '' then
    raise exception 'L’identifiant public de l’espace est obligatoire.';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) not between 2 and 80 then
    raise exception 'L’identifiant public doit contenir uniquement des lettres minuscules, chiffres et tirets.';
  end if;

  -- Le suffixe évite qu’un nom déjà utilisé bloque la création, tout en conservant
  -- un identifiant lisible pour l’entreprise.
  if exists (select 1 from public.organizations where slug = v_slug) then
    v_suffix := substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6);
    v_slug := left(v_slug, 73) || '-' || v_suffix;
  end if;

  v_status := case when p_trial_days > 0 then 'trial' else 'active' end;
  v_subscription_status := case when p_trial_days > 0 then 'trialing' else 'active' end;
  v_trial_ends_at := case when p_trial_days > 0 then now() + make_interval(days => p_trial_days) else null end;

  insert into public.organizations (
    name,
    slug,
    business_type,
    plan,
    status,
    primary_color,
    created_by,
    metier_setup_fee_cents,
    metier_member_limit,
    metier_site_limit,
    metier_storage_limit_mb,
    metier_contract_reference,
    metier_modules_configured,
    metier_business_type_locked,
    white_label_enabled,
    show_ncr_branding
  ) values (
    v_name,
    v_slug,
    p_business_type,
    p_plan,
    v_status,
    p_primary_color,
    v_owner_id,
    case when p_plan = 'metier' then coalesce(p_metier_setup_fee_cents, 0) else 0 end,
    v_member_limit,
    v_site_limit,
    v_storage_limit,
    case when p_plan = 'metier' then nullif(trim(coalesce(p_metier_contract_reference, '')), '') else null end,
    p_plan = 'metier',
    p_plan = 'metier',
    false,
    true
  ) returning id into v_organization_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_organization_id, v_owner_id, 'owner', 'active');

  -- Active automatiquement le socle et les modules par défaut compatibles
  -- avec le domaine choisi. Les modules d’un autre domaine ne sont jamais ajoutés.
  insert into public.organization_modules (
    organization_id,
    module_key,
    enabled,
    configured_by
  )
  select
    v_organization_id,
    c.module_key,
    true,
    auth.uid()
  from public.module_catalog c
  where c.active = true
    and (c.core_module = true or c.default_enabled = true)
    and (
      cardinality(c.compatible_business_types) = 0
      or p_business_type = any(c.compatible_business_types)
    )
  on conflict (organization_id, module_key) do update
  set enabled = true,
      configured_by = auth.uid(),
      updated_at = now();

  -- Conserve la clé métier historique utilisée par les premières versions.
  insert into public.organization_modules (organization_id, module_key, enabled, configured_by)
  values (v_organization_id, p_business_type, true, auth.uid())
  on conflict (organization_id, module_key) do update
  set enabled = true,
      configured_by = auth.uid(),
      updated_at = now();

  -- Le trigger de création a déjà initialisé l’abonnement. On le met à jour
  -- avec le tarif, l’essai et les notes propres à ce nouvel espace.
  insert into public.organization_subscriptions (
    organization_id,
    plan_key,
    status,
    provider,
    monthly_price_cents,
    trial_ends_at,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    internal_notes,
    updated_by
  ) values (
    v_organization_id,
    p_plan,
    v_subscription_status,
    'manual',
    p_monthly_price_cents,
    v_trial_ends_at,
    case when v_subscription_status = 'active' then now() else null end,
    null,
    false,
    nullif(trim(coalesce(p_internal_notes, '')), ''),
    auth.uid()
  )
  on conflict (organization_id) do update
  set plan_key = excluded.plan_key,
      status = excluded.status,
      provider = excluded.provider,
      monthly_price_cents = excluded.monthly_price_cents,
      trial_ends_at = excluded.trial_ends_at,
      current_period_start = excluded.current_period_start,
      current_period_end = null,
      cancel_at_period_end = false,
      internal_notes = excluded.internal_notes,
      updated_by = auth.uid(),
      updated_at = now();

  -- Un espace Métier commence avec un établissement principal utilisable.
  if p_plan = 'metier' then
    insert into public.organization_sites (
      organization_id,
      name,
      code,
      timezone,
      is_primary,
      status,
      created_by
    ) values (
      v_organization_id,
      v_name,
      'PRINCIPAL',
      'Europe/Paris',
      true,
      'active',
      auth.uid()
    );
  end if;

  insert into public.subscription_events (
    organization_id,
    event_type,
    actor_user_id,
    from_plan,
    to_plan,
    metadata
  ) values (
    v_organization_id,
    'organization_space_created',
    auth.uid(),
    null,
    p_plan,
    jsonb_build_object(
      'owner_email', v_owner_email,
      'business_type', p_business_type,
      'monthly_price_cents', p_monthly_price_cents,
      'trial_days', p_trial_days,
      'separate_subscription', true
    )
  );

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_organization_id,
    auth.uid(),
    'platform.organization_space_created',
    'organization',
    v_organization_id::text,
    jsonb_build_object(
      'owner_user_id', v_owner_id,
      'owner_email', v_owner_email,
      'business_type', p_business_type,
      'plan', p_plan,
      'monthly_price_cents', p_monthly_price_cents,
      'trial_days', p_trial_days
    )
  );

  return jsonb_build_object(
    'organization_id', v_organization_id,
    'name', v_name,
    'slug', v_slug,
    'owner_email', v_owner_email,
    'business_type', p_business_type,
    'plan', p_plan,
    'monthly_price_cents', p_monthly_price_cents,
    'status', v_status
  );
end;
$$;

select pg_notify('pgrst', 'reload schema');

commit;
