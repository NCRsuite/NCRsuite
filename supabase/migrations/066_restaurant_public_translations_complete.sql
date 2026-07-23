-- NCR Suite V2.13.1 — Traductions publiques Restauration complètes
-- À exécuter après 065_restaurant_public_menu_premium.sql.

begin;

alter table public.restaurant_public_menu_settings
  add column if not exists hero_eyebrow_en text,
  add column if not exists hero_eyebrow_es text,
  add column if not exists hero_eyebrow_it text,
  add column if not exists hero_title_en text,
  add column if not exists hero_title_es text,
  add column if not exists hero_title_it text,
  add column if not exists hero_description_en text,
  add column if not exists hero_description_es text,
  add column if not exists hero_description_it text,
  add column if not exists hours_text_en text,
  add column if not exists hours_text_es text,
  add column if not exists hours_text_it text,
  add column if not exists practical_info_en text,
  add column if not exists practical_info_es text,
  add column if not exists practical_info_it text,
  add column if not exists booking_button_label_en text,
  add column if not exists booking_button_label_es text,
  add column if not exists booking_button_label_it text,
  add column if not exists booking_welcome_text_en text,
  add column if not exists booking_welcome_text_es text,
  add column if not exists booking_welcome_text_it text,
  add column if not exists translation_provider text,
  add column if not exists translated_at timestamptz;

create or replace function public.update_restaurant_public_menu_translations(
  p_organization_id uuid,
  p_translations jsonb,
  p_provider text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_type text;
  v_en jsonb := coalesce(p_translations -> 'en', '{}'::jsonb);
  v_es jsonb := coalesce(p_translations -> 'es', '{}'::jsonb);
  v_it jsonb := coalesce(p_translations -> 'it', '{}'::jsonb);
  v_provider text := nullif(trim(coalesce(p_provider, '')), '');
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  select business_type::text into v_business_type
  from public.organizations
  where id = p_organization_id and status in ('trial','active');

  if v_business_type is null then raise exception 'Entreprise introuvable ou inactive.'; end if;
  if v_business_type <> 'restauration' then raise exception 'Ce réglage est réservé au métier Restauration.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'restaurant_multilingual_qr_menu') then
    raise exception 'Le menu multilingue est disponible à partir de l’offre Essentielle.';
  end if;

  insert into public.restaurant_public_menu_settings (organization_id, created_by)
  values (p_organization_id, auth.uid())
  on conflict (organization_id) do nothing;

  update public.restaurant_public_menu_settings
  set
    hero_eyebrow_en = case when v_en ? 'hero_eyebrow' then nullif(trim(v_en ->> 'hero_eyebrow'), '') else hero_eyebrow_en end,
    hero_eyebrow_es = case when v_es ? 'hero_eyebrow' then nullif(trim(v_es ->> 'hero_eyebrow'), '') else hero_eyebrow_es end,
    hero_eyebrow_it = case when v_it ? 'hero_eyebrow' then nullif(trim(v_it ->> 'hero_eyebrow'), '') else hero_eyebrow_it end,
    hero_title_en = case when v_en ? 'hero_title' then nullif(trim(v_en ->> 'hero_title'), '') else hero_title_en end,
    hero_title_es = case when v_es ? 'hero_title' then nullif(trim(v_es ->> 'hero_title'), '') else hero_title_es end,
    hero_title_it = case when v_it ? 'hero_title' then nullif(trim(v_it ->> 'hero_title'), '') else hero_title_it end,
    hero_description_en = case when v_en ? 'hero_description' then nullif(trim(v_en ->> 'hero_description'), '') else hero_description_en end,
    hero_description_es = case when v_es ? 'hero_description' then nullif(trim(v_es ->> 'hero_description'), '') else hero_description_es end,
    hero_description_it = case when v_it ? 'hero_description' then nullif(trim(v_it ->> 'hero_description'), '') else hero_description_it end,
    hours_text_en = case when v_en ? 'hours_text' then nullif(trim(v_en ->> 'hours_text'), '') else hours_text_en end,
    hours_text_es = case when v_es ? 'hours_text' then nullif(trim(v_es ->> 'hours_text'), '') else hours_text_es end,
    hours_text_it = case when v_it ? 'hours_text' then nullif(trim(v_it ->> 'hours_text'), '') else hours_text_it end,
    practical_info_en = case when v_en ? 'practical_info' then nullif(trim(v_en ->> 'practical_info'), '') else practical_info_en end,
    practical_info_es = case when v_es ? 'practical_info' then nullif(trim(v_es ->> 'practical_info'), '') else practical_info_es end,
    practical_info_it = case when v_it ? 'practical_info' then nullif(trim(v_it ->> 'practical_info'), '') else practical_info_it end,
    booking_button_label_en = case when v_en ? 'booking_button_label' then nullif(trim(v_en ->> 'booking_button_label'), '') else booking_button_label_en end,
    booking_button_label_es = case when v_es ? 'booking_button_label' then nullif(trim(v_es ->> 'booking_button_label'), '') else booking_button_label_es end,
    booking_button_label_it = case when v_it ? 'booking_button_label' then nullif(trim(v_it ->> 'booking_button_label'), '') else booking_button_label_it end,
    booking_welcome_text_en = case when v_en ? 'booking_welcome_text' then nullif(trim(v_en ->> 'booking_welcome_text'), '') else booking_welcome_text_en end,
    booking_welcome_text_es = case when v_es ? 'booking_welcome_text' then nullif(trim(v_es ->> 'booking_welcome_text'), '') else booking_welcome_text_es end,
    booking_welcome_text_it = case when v_it ? 'booking_welcome_text' then nullif(trim(v_it ->> 'booking_welcome_text'), '') else booking_welcome_text_it end,
    translation_provider = coalesce(v_provider, translation_provider),
    translated_at = now(),
    updated_at = now()
  where organization_id = p_organization_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id, auth.uid(), 'restaurant.public_translations_updated',
    'restaurant_public_menu_settings', p_organization_id::text,
    jsonb_build_object('provider',v_provider,'languages',jsonb_build_array('en','es','it'))
  );
end;
$$;

revoke all on function public.update_restaurant_public_menu_translations(uuid,jsonb,text) from public;
grant execute on function public.update_restaurant_public_menu_translations(uuid,jsonb,text) to authenticated;

create or replace function public.get_public_restaurant_menu(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_settings public.restaurant_public_menu_settings%rowtype;
  v_enabled boolean;
  v_booking_enabled boolean;
begin
  select * into v_org
  from public.organizations
  where slug = lower(trim(p_slug))
    and business_type = 'restauration'
    and status in ('trial','active')
  limit 1;

  if v_org.id is null then return null; end if;

  select * into v_settings
  from public.restaurant_public_menu_settings
  where organization_id = v_org.id;

  v_enabled := public.organization_has_plan_feature(v_org.id,'restaurant_multilingual_qr_menu');
  v_booking_enabled := coalesce(v_settings.show_booking_button,true)
    and coalesce(v_org.booking_enabled,false)
    and public.organization_has_plan_feature(v_org.id,'restaurant_online_reservations');

  return jsonb_build_object(
    'organization_name', v_org.name,
    'public_name', v_org.public_name,
    'primary_color', v_org.primary_color,
    'secondary_color', coalesce(v_settings.secondary_color,'#d6a15d'),
    'logo_url', v_org.logo_url,
    'cover_url', coalesce(v_settings.cover_url,v_org.booking_banner_url),
    'theme_code', coalesce(v_settings.theme_code,'signature'),
    'layout_code', coalesce(v_settings.layout_code,'gallery'),
    'hero_eyebrow', coalesce(v_settings.hero_eyebrow,'La carte du moment'),
    'hero_eyebrow_en', v_settings.hero_eyebrow_en,
    'hero_eyebrow_es', v_settings.hero_eyebrow_es,
    'hero_eyebrow_it', v_settings.hero_eyebrow_it,
    'hero_title', coalesce(v_settings.hero_title,coalesce(v_org.booking_tagline,'Bienvenue à table')),
    'hero_title_en', v_settings.hero_title_en,
    'hero_title_es', v_settings.hero_title_es,
    'hero_title_it', v_settings.hero_title_it,
    'hero_description', coalesce(v_settings.hero_description,'Découvrez notre sélection, préparée avec soin et présentée dans la langue de votre choix.'),
    'hero_description_en', v_settings.hero_description_en,
    'hero_description_es', v_settings.hero_description_es,
    'hero_description_it', v_settings.hero_description_it,
    'address', v_org.booking_address,
    'hours_text', v_org.booking_hours_text,
    'hours_text_en', v_settings.hours_text_en,
    'hours_text_es', v_settings.hours_text_es,
    'hours_text_it', v_settings.hours_text_it,
    'practical_info', v_org.booking_practical_info,
    'practical_info_en', v_settings.practical_info_en,
    'practical_info_es', v_settings.practical_info_es,
    'practical_info_it', v_settings.practical_info_it,
    'show_category_nav', coalesce(v_settings.show_category_nav,true),
    'show_dish_images', coalesce(v_settings.show_dish_images,true),
    'show_allergens', coalesce(v_settings.show_allergens,true),
    'show_dietary_badges', coalesce(v_settings.show_dietary_badges,true),
    'booking_enabled', v_booking_enabled,
    'booking_button_label', coalesce(v_settings.booking_button_label,'Réserver une table'),
    'booking_button_label_en', v_settings.booking_button_label_en,
    'booking_button_label_es', v_settings.booking_button_label_es,
    'booking_button_label_it', v_settings.booking_button_label_it,
    'show_ncr_branding', coalesce(v_org.show_ncr_branding,true),
    'menu_enabled', v_enabled,
    'items', case when v_enabled then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'category_id', c.id,
        'category_position', c.position,
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
        'featured', i.featured,
        'image_url', i.image_url
      ) order by c.position, i.featured desc, i.name)
      from public.restaurant_menu_items i
      join public.restaurant_menu_categories c
        on c.organization_id = i.organization_id and c.id = i.category_id
      where i.organization_id = v_org.id and i.available and c.active
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

revoke all on function public.get_public_restaurant_menu(text) from public;
grant execute on function public.get_public_restaurant_menu(text) to anon, authenticated;

create or replace function public.get_public_restaurant_booking_config(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_settings public.restaurant_public_menu_settings%rowtype;
  v_enabled boolean;
begin
  select * into v_org
  from public.organizations
  where slug = lower(trim(p_slug))
    and business_type = 'restauration'
    and status in ('trial','active')
  limit 1;

  if v_org.id is null then return null; end if;

  select * into v_settings
  from public.restaurant_public_menu_settings
  where organization_id = v_org.id;

  v_enabled := coalesce(v_org.booking_enabled, false)
    and public.organization_has_plan_feature(v_org.id, 'restaurant_online_reservations');

  return jsonb_build_object(
    'organization_name', v_org.name,
    'public_name', v_org.public_name,
    'primary_color', v_org.primary_color,
    'logo_url', v_org.logo_url,
    'booking_enabled', v_enabled,
    'booking_welcome_text', v_org.booking_welcome_text,
    'booking_welcome_text_en', v_settings.booking_welcome_text_en,
    'booking_welcome_text_es', v_settings.booking_welcome_text_es,
    'booking_welcome_text_it', v_settings.booking_welcome_text_it,
    'booking_contact_phone', v_org.booking_contact_phone,
    'booking_contact_email', v_org.booking_contact_email,
    'confirmation_mode', coalesce(v_org.booking_confirmation_mode, 'manual'),
    'slot_interval', coalesce(v_org.booking_slot_interval, 15),
    'min_notice_hours', coalesce(v_org.booking_min_notice_hours, 2),
    'max_days_ahead', coalesce(v_org.booking_max_days_ahead, 180),
    'cancel_notice_hours', coalesce(v_org.booking_cancel_notice_hours, 12)
  );
end;
$$;

revoke all on function public.get_public_restaurant_booking_config(text) from public;
grant execute on function public.get_public_restaurant_booking_config(text) to anon, authenticated;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,installed_at,installed_by,notes
) values (
  true,'2.13.1','2.13.1','ncr-suite-shell-v2.13.1-restaurant-premium',now(),auth.uid(),
  'Restauration : traductions complètes du menu public, des textes d’enseigne et de la réservation en ligne en FR, EN, ES et IT.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

notify pgrst, 'reload schema';
commit;
