-- NCR Suite V2.8.1 — Stabilisation Restauration et traductions automatiques
-- À exécuter après 045_restaurant_pack_core.sql.

begin;

-- 1. Répare ou recrée le catalogue des droits, même si une ancienne ligne
--    Restauration existait déjà dans Supabase avant l'installation du pack.
insert into public.domain_plan_catalog (
  business_type, plan_key, display_name, monthly_price_cents, member_limit,
  features, short_description, sort_order, recommended, active
) values
  ('restauration','decouverte','Découverte',2990,1,
   '{"restaurant_staff_planning":true,"restaurant_menu":true,"restaurant_allergens":true,"restaurant_suppliers":true,"restaurant_basic_stock":true,"restaurant_manual_reservations":true}'::jsonb,
   'Équipe, planning, carte, allergènes, fournisseurs et stocks simples.',10,false,true),
  ('restauration','essentielle','Essentielle',4990,10,
   '{"restaurant_staff_planning":true,"restaurant_menu":true,"restaurant_allergens":true,"restaurant_suppliers":true,"restaurant_basic_stock":true,"restaurant_manual_reservations":true,"team_access":true,"restaurant_employee_portal":true,"restaurant_basic_roles":true,"restaurant_online_reservations":true,"restaurant_floor_plan":true,"restaurant_multilingual_qr_menu":true,"restaurant_temperatures":true,"restaurant_checklists":true,"restaurant_document_email_branding":true,"commercial_branding":true}'::jsonb,
   'Ajoute 10 employés, réservations en ligne et menu QR en quatre langues.',20,true,true),
  ('restauration','professionnelle','Professionnelle',7990,50,
   '{"restaurant_staff_planning":true,"restaurant_menu":true,"restaurant_allergens":true,"restaurant_suppliers":true,"restaurant_basic_stock":true,"restaurant_manual_reservations":true,"team_access":true,"restaurant_employee_portal":true,"restaurant_basic_roles":true,"restaurant_online_reservations":true,"restaurant_floor_plan":true,"restaurant_multilingual_qr_menu":true,"restaurant_temperatures":true,"restaurant_checklists":true,"restaurant_document_email_branding":true,"commercial_branding":true,"restaurant_manager_role":true,"manager_role":true,"multi_site":true,"restaurant_realtime_supervision":true,"restaurant_advanced_stock":true,"restaurant_inventory":true,"restaurant_waste":true,"restaurant_supplier_orders":true,"restaurant_food_cost":true,"restaurant_statistics":true}'::jsonb,
   'Ajoute 50 employés, multi-site, stocks avancés et rentabilité.',30,false,true),
  ('restauration','metier','Métier',10990,100,
   '{"restaurant_staff_planning":true,"restaurant_menu":true,"restaurant_allergens":true,"restaurant_suppliers":true,"restaurant_basic_stock":true,"restaurant_manual_reservations":true,"team_access":true,"restaurant_employee_portal":true,"restaurant_basic_roles":true,"restaurant_online_reservations":true,"restaurant_floor_plan":true,"restaurant_multilingual_qr_menu":true,"restaurant_temperatures":true,"restaurant_checklists":true,"restaurant_document_email_branding":true,"commercial_branding":true,"restaurant_manager_role":true,"manager_role":true,"multi_site":true,"restaurant_realtime_supervision":true,"restaurant_advanced_stock":true,"restaurant_inventory":true,"restaurant_waste":true,"restaurant_supplier_orders":true,"restaurant_food_cost":true,"restaurant_statistics":true,"white_label":true,"custom_modules":true,"custom_roles":true,"custom_domain":true}'::jsonb,
   'À partir de 109,90 € : groupes, franchises et intégrations sur mesure.',40,false,true)
on conflict (business_type,plan_key) do update set
  display_name=excluded.display_name,
  monthly_price_cents=excluded.monthly_price_cents,
  member_limit=excluded.member_limit,
  features=excluded.features,
  short_description=excluded.short_description,
  sort_order=excluded.sort_order,
  recommended=excluded.recommended,
  active=true,
  updated_at=now();

-- Répare aussi le catalogue des modules. La V2.8.0 ne déclarait que trois
-- modules Restauration, ce qui rendait les espaces Métier incomplets.
insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, active, sort_order
) values
  ('restaurant_menu','Carte & plats','Carte, catégories, prix et allergènes.','restauration','file','{restauration}',false,true,true,708),
  ('restaurant_reservations','Réservations','Réservations internes et demandes en ligne.','restauration','calendar','{restauration}',false,true,true,710),
  ('restaurant_floor_plan','Plan de salle','Zones, tables, capacités et affectations.','restauration','layout','{restauration}',false,false,true,712),
  ('restaurant_qr_menu','Menu QR','Menu public multilingue par QR code.','restauration','qrCode','{restauration}',false,false,true,714),
  ('restaurant_food_safety','Hygiène & HACCP','Températures et checklists opérationnelles.','restauration','clipboard','{restauration}',false,false,true,716),
  ('restaurant_stock','Stocks & fournisseurs','Stocks, seuils, fournisseurs, coûts et pertes.','restauration','briefcase','{restauration}',false,true,true,718)
on conflict (module_key) do update set
  display_name=excluded.display_name,
  description=excluded.description,
  category=excluded.category,
  icon_key=excluded.icon_key,
  compatible_business_types=excluded.compatible_business_types,
  default_enabled=excluded.default_enabled,
  active=true,
  sort_order=excluded.sort_order,
  updated_at=now();

-- Réactive les modules attendus sur les offres standards et sur les espaces
-- Métier qui n'ont pas encore fait de sélection personnalisée.
insert into public.organization_modules (organization_id,module_key,enabled)
select o.id,m.module_key,true
from public.organizations o
cross join lateral (
  values
    ('restaurant_staff_planning','decouverte'),
    ('restaurant_staff','decouverte'),
    ('restaurant_menu','decouverte'),
    ('restaurant_reservations','decouverte'),
    ('restaurant_stock','decouverte'),
    ('restaurant_employee_portal','essentielle'),
    ('restaurant_floor_plan','essentielle'),
    ('restaurant_qr_menu','essentielle'),
    ('restaurant_food_safety','essentielle')
) as m(module_key,minimum_plan)
where o.business_type='restauration'
  and (o.plan<>'metier' or not coalesce(o.metier_modules_configured,false))
  and case m.minimum_plan
    when 'decouverte' then true
    when 'essentielle' then o.plan in ('essentielle','professionnelle','metier')
    else false
  end
on conflict (organization_id,module_key) do update set enabled=true;

-- 2. Le menu public doit traduire le nom du plat et la catégorie, pas seulement
--    la description.
alter table public.restaurant_menu_categories
  add column if not exists name_en text,
  add column if not exists name_es text,
  add column if not exists name_it text,
  add column if not exists translation_provider text,
  add column if not exists translated_at timestamptz;

alter table public.restaurant_menu_items
  add column if not exists name_en text,
  add column if not exists name_es text,
  add column if not exists name_it text,
  add column if not exists translation_provider text,
  add column if not exists translated_at timestamptz;

-- 3. Sépare correctement les droits Températures et Checklists.
create or replace function public.validate_restaurant_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.organizations o
    where o.id = new.organization_id
      and o.business_type = 'restauration'
      and o.status in ('trial','active')
  ) then
    raise exception 'Ce module est réservé à un espace Restauration actif.';
  end if;

  if tg_table_name in ('restaurant_employees','restaurant_shifts')
     and not public.organization_has_plan_feature(new.organization_id,'restaurant_staff_planning') then
    raise exception 'Le planning équipe n’est pas inclus dans cette offre.';
  end if;
  if tg_table_name in ('restaurant_menu_categories','restaurant_menu_items')
     and not public.organization_has_plan_feature(new.organization_id,'restaurant_menu') then
    raise exception 'La carte restaurant n’est pas incluse dans cette offre.';
  end if;
  if tg_table_name = 'restaurant_suppliers'
     and not public.organization_has_plan_feature(new.organization_id,'restaurant_suppliers') then
    raise exception 'Les fournisseurs ne sont pas inclus dans cette offre.';
  end if;
  if tg_table_name = 'restaurant_stock_items'
     and not public.organization_has_plan_feature(new.organization_id,'restaurant_basic_stock') then
    raise exception 'Les stocks ne sont pas inclus dans cette offre.';
  end if;
  if tg_table_name = 'restaurant_reservations'
     and not public.organization_has_plan_feature(new.organization_id,'restaurant_manual_reservations') then
    raise exception 'Les réservations ne sont pas incluses dans cette offre.';
  end if;
  if tg_table_name = 'restaurant_tables'
     and not public.organization_has_plan_feature(new.organization_id,'restaurant_floor_plan') then
    raise exception 'Le plan de salle nécessite l’offre Essentielle.';
  end if;
  if tg_table_name = 'restaurant_temperature_logs'
     and not public.organization_has_plan_feature(new.organization_id,'restaurant_temperatures') then
    raise exception 'Les relevés de températures nécessitent l’offre Essentielle.';
  end if;
  if tg_table_name in ('restaurant_checklist_templates','restaurant_checklist_items','restaurant_checklist_runs')
     and not public.organization_has_plan_feature(new.organization_id,'restaurant_checklists') then
    raise exception 'Les checklists nécessitent l’offre Essentielle.';
  end if;
  if tg_table_name = 'restaurant_menu_costs'
     and not public.organization_has_plan_feature(new.organization_id,'restaurant_food_cost') then
    raise exception 'Le coût matière nécessite l’offre Professionnelle.';
  end if;
  if tg_table_name = 'restaurant_waste_records'
     and not public.organization_has_plan_feature(new.organization_id,'restaurant_waste') then
    raise exception 'Le suivi des pertes nécessite l’offre Professionnelle.';
  end if;
  return new;
end;
$$;

-- Les traductions du nom et de la description restent réservées au menu QR.
create or replace function public.validate_restaurant_menu_item()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.restaurant_menu_categories c
    where c.organization_id=new.organization_id
      and c.id=new.category_id
      and c.active
  ) then
    raise exception 'Catégorie introuvable ou inactive.';
  end if;
  if (
    new.name_en is not null or new.name_es is not null or new.name_it is not null
    or new.description_en is not null or new.description_es is not null or new.description_it is not null
  ) and not public.organization_has_plan_feature(new.organization_id,'restaurant_multilingual_qr_menu') then
    raise exception 'Les traductions du menu nécessitent l’offre Essentielle.';
  end if;
  return new;
end;
$$;

-- 4. Création atomique des checklists : plus de checklist vide si une tâche
--    échoue pendant l'enregistrement.
create or replace function public.create_restaurant_checklist_template(
  p_organization_id uuid,
  p_name text,
  p_checklist_type text,
  p_items text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
  v_label text;
  v_position integer := 0;
begin
  if auth.uid() is null or not public.is_restaurant_manager(p_organization_id) then
    raise exception 'Accès insuffisant.';
  end if;
  if not public.organization_has_plan_feature(p_organization_id, 'restaurant_checklists') then
    raise exception 'Les checklists nécessitent l’offre Essentielle.';
  end if;
  if p_checklist_type not in ('opening','closing','cleaning') then
    raise exception 'Type de checklist invalide.';
  end if;
  if char_length(trim(coalesce(p_name,''))) < 2 then
    raise exception 'Le nom de la checklist est obligatoire.';
  end if;
  if coalesce(array_length(p_items, 1), 0) = 0 then
    raise exception 'Ajoute au moins une tâche.';
  end if;

  insert into public.restaurant_checklist_templates(
    organization_id, name, checklist_type, created_by
  ) values (
    p_organization_id, trim(p_name), p_checklist_type, auth.uid()
  ) returning id into v_template_id;

  foreach v_label in array p_items loop
    v_label := trim(coalesce(v_label, ''));
    if v_label <> '' then
      insert into public.restaurant_checklist_items(
        organization_id, template_id, label, required, position
      ) values (
        p_organization_id, v_template_id, v_label, true, v_position
      );
      v_position := v_position + 1;
    end if;
  end loop;

  if v_position = 0 then
    raise exception 'Ajoute au moins une tâche valide.';
  end if;
  return v_template_id;
end;
$$;

revoke all on function public.create_restaurant_checklist_template(uuid,text,text,text[]) from public;
grant execute on function public.create_restaurant_checklist_template(uuid,text,text,text[]) to authenticated;

-- 5. Menu public multilingue complet.
create or replace function public.get_public_restaurant_menu(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_enabled boolean;
begin
  select * into v_org
  from public.organizations
  where slug = lower(trim(p_slug))
    and business_type = 'restauration'
    and status in ('trial','active')
  limit 1;

  if v_org.id is null then return null; end if;
  v_enabled := public.organization_has_plan_feature(v_org.id,'restaurant_multilingual_qr_menu');

  return jsonb_build_object(
    'organization_name', v_org.name,
    'public_name', v_org.public_name,
    'primary_color', v_org.primary_color,
    'logo_url', v_org.logo_url,
    'menu_enabled', v_enabled,
    'items', case when v_enabled then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'category_name', c.name,
        'category_name_en', c.name_en,
        'category_name_es', c.name_es,
        'category_name_it', c.name_it,
        'name', i.name,
        'name_en', i.name_en,
        'name_es', i.name_es,
        'name_it', i.name_it,
        'description_fr', i.description_fr,
        'description_en', i.description_en,
        'description_es', i.description_es,
        'description_it', i.description_it,
        'price_cents', i.price_cents,
        'allergens', i.allergens,
        'vegetarian', i.vegetarian,
        'vegan', i.vegan,
        'featured', i.featured
      ) order by c.position, i.featured desc, i.name)
      from public.restaurant_menu_items i
      join public.restaurant_menu_categories c
        on c.organization_id = i.organization_id and c.id = i.category_id
      where i.organization_id = v_org.id and i.available and c.active
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

grant execute on function public.get_public_restaurant_menu(text) to anon, authenticated;

commit;
