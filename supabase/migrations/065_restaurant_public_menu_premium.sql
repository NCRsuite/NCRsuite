-- NCR Suite V2.13.0 — Restauration premium : identité publique et menu QR
-- À exécuter après 064_coiffure_loyalty_client_portal.sql.

begin;

create table if not exists public.restaurant_public_menu_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  theme_code text not null default 'signature'
    check (theme_code in ('signature','bistro','gastronomique','street','mediterraneen','minimal')),
  layout_code text not null default 'gallery'
    check (layout_code in ('gallery','editorial')),
  secondary_color text not null default '#d6a15d'
    check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  cover_url text,
  hero_eyebrow text,
  hero_title text,
  hero_description text,
  show_category_nav boolean not null default true,
  show_dish_images boolean not null default true,
  show_allergens boolean not null default true,
  show_dietary_badges boolean not null default true,
  show_booking_button boolean not null default true,
  booking_button_label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_public_menu_cover_url_check
    check (cover_url is null or (char_length(cover_url) <= 1200 and cover_url ~ '^https://')),
  constraint restaurant_public_menu_hero_eyebrow_check
    check (hero_eyebrow is null or char_length(hero_eyebrow) <= 80),
  constraint restaurant_public_menu_hero_title_check
    check (hero_title is null or char_length(hero_title) <= 140),
  constraint restaurant_public_menu_hero_description_check
    check (hero_description is null or char_length(hero_description) <= 420),
  constraint restaurant_public_menu_booking_label_check
    check (booking_button_label is null or char_length(booking_button_label) <= 80)
);

alter table public.restaurant_public_menu_settings enable row level security;

drop policy if exists restaurant_public_menu_settings_select on public.restaurant_public_menu_settings;
create policy restaurant_public_menu_settings_select
on public.restaurant_public_menu_settings for select
to authenticated
using (public.is_org_member(organization_id));

drop policy if exists restaurant_public_menu_settings_manage on public.restaurant_public_menu_settings;
create policy restaurant_public_menu_settings_manage
on public.restaurant_public_menu_settings for all
to authenticated
using (public.is_restaurant_manager(organization_id))
with check (public.is_restaurant_manager(organization_id));

drop trigger if exists set_restaurant_public_menu_settings_updated_at on public.restaurant_public_menu_settings;
create trigger set_restaurant_public_menu_settings_updated_at
before update on public.restaurant_public_menu_settings
for each row execute procedure public.set_updated_at();

grant select, insert, update, delete on public.restaurant_public_menu_settings to authenticated;

insert into public.restaurant_public_menu_settings (organization_id, created_by)
select o.id, o.created_by
from public.organizations o
where o.business_type = 'restauration'
on conflict (organization_id) do nothing;

-- Les établissements Restauration en offre Essentielle possèdent déjà la
-- fonctionnalité commercial_branding dans le catalogue. Cette surcharge rend
-- l'upload cohérent avec le catalogue plutôt qu'avec un contrôle de plan figé.
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
  exception
    when invalid_text_representation then
      return false;
  end;

  return public.has_org_role(v_organization_id, array['owner','admin','manager'])
    and exists (
      select 1
      from public.organizations o
      where o.id = v_organization_id
        and o.status in ('trial','active')
        and (
          o.business_type = 'securite'
          or public.organization_has_plan_feature(o.id, 'commercial_branding')
        )
    );
end;
$$;

revoke all on function public.can_manage_brand_asset(text) from public;
grant execute on function public.can_manage_brand_asset(text) to authenticated;

create or replace function public.update_restaurant_public_menu_settings(
  p_organization_id uuid,
  p_theme_code text,
  p_layout_code text,
  p_secondary_color text,
  p_cover_url text,
  p_hero_eyebrow text,
  p_hero_title text,
  p_hero_description text,
  p_show_category_nav boolean,
  p_show_dish_images boolean,
  p_show_allergens boolean,
  p_show_dietary_badges boolean,
  p_show_booking_button boolean,
  p_booking_button_label text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_type text;
  v_cover_url text := nullif(trim(coalesce(p_cover_url, '')), '');
  v_hero_eyebrow text := nullif(trim(coalesce(p_hero_eyebrow, '')), '');
  v_hero_title text := nullif(trim(coalesce(p_hero_title, '')), '');
  v_hero_description text := nullif(trim(coalesce(p_hero_description, '')), '');
  v_booking_button_label text := nullif(trim(coalesce(p_booking_button_label, '')), '');
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
    raise exception 'Le menu QR premium est disponible à partir de l’offre Essentielle.';
  end if;
  if p_theme_code is null or p_theme_code not in ('signature','bistro','gastronomique','street','mediterraneen','minimal') then
    raise exception 'Thème de menu invalide.';
  end if;
  if p_layout_code is null or p_layout_code not in ('gallery','editorial') then raise exception 'Présentation de menu invalide.'; end if;
  if p_secondary_color is null or p_secondary_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'La couleur secondaire est invalide.'; end if;
  if v_cover_url is not null and (char_length(v_cover_url) > 1200 or v_cover_url !~ '^https://') then
    raise exception 'L’adresse de la couverture est invalide.';
  end if;
  if v_hero_eyebrow is not null and char_length(v_hero_eyebrow) > 80 then raise exception 'Le surtitre est trop long.'; end if;
  if v_hero_title is not null and char_length(v_hero_title) > 140 then raise exception 'Le titre est trop long.'; end if;
  if v_hero_description is not null and char_length(v_hero_description) > 420 then raise exception 'Le texte d’accueil est trop long.'; end if;
  if v_booking_button_label is not null and char_length(v_booking_button_label) > 80 then raise exception 'Le libellé du bouton est trop long.'; end if;

  insert into public.restaurant_public_menu_settings (
    organization_id, theme_code, layout_code, secondary_color, cover_url,
    hero_eyebrow, hero_title, hero_description, show_category_nav,
    show_dish_images, show_allergens, show_dietary_badges,
    show_booking_button, booking_button_label, created_by
  ) values (
    p_organization_id, p_theme_code, p_layout_code, lower(p_secondary_color), v_cover_url,
    v_hero_eyebrow, v_hero_title, v_hero_description, coalesce(p_show_category_nav, true),
    coalesce(p_show_dish_images, true), coalesce(p_show_allergens, true),
    coalesce(p_show_dietary_badges, true), coalesce(p_show_booking_button, true),
    v_booking_button_label, auth.uid()
  )
  on conflict (organization_id) do update set
    theme_code = excluded.theme_code,
    layout_code = excluded.layout_code,
    secondary_color = excluded.secondary_color,
    cover_url = excluded.cover_url,
    hero_eyebrow = excluded.hero_eyebrow,
    hero_title = excluded.hero_title,
    hero_description = excluded.hero_description,
    show_category_nav = excluded.show_category_nav,
    show_dish_images = excluded.show_dish_images,
    show_allergens = excluded.show_allergens,
    show_dietary_badges = excluded.show_dietary_badges,
    show_booking_button = excluded.show_booking_button,
    booking_button_label = excluded.booking_button_label,
    updated_at = now();

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id, auth.uid(), 'restaurant.public_menu_branding_updated',
    'restaurant_public_menu_settings', p_organization_id::text,
    jsonb_build_object('theme',p_theme_code,'layout',p_layout_code)
  );
end;
$$;

revoke all on function public.update_restaurant_public_menu_settings(uuid,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,boolean,text) from public;
grant execute on function public.update_restaurant_public_menu_settings(uuid,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,boolean,text) to authenticated;

-- Autorise la personnalisation commerciale lorsqu'elle est réellement incluse
-- dans l'offre du domaine, notamment Restauration Essentielle.
create or replace function public.update_commercial_branding(
  p_organization_id uuid,
  p_public_name text,
  p_slug text,
  p_primary_color text,
  p_logo_url text,
  p_banner_url text,
  p_tagline text,
  p_address text,
  p_hours_text text,
  p_practical_info text,
  p_show_ncr_branding boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_public_name text := nullif(trim(coalesce(p_public_name, '')), '');
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_logo_url text := nullif(trim(coalesce(p_logo_url, '')), '');
  v_banner_url text := nullif(trim(coalesce(p_banner_url, '')), '');
  v_tagline text := nullif(trim(coalesce(p_tagline, '')), '');
  v_address text := nullif(trim(coalesce(p_address, '')), '');
  v_hours_text text := nullif(trim(coalesce(p_hours_text, '')), '');
  v_practical_info text := nullif(trim(coalesce(p_practical_info, '')), '');
  v_reserved_slugs text[] := array[
    'connexion','configuration','reservation','reserver','invitation','admin','api',
    'ncr','ncr-suite','support','aide','contact','legal','mentions-legales'
  ];
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  select plan into v_plan
  from public.organizations
  where id = p_organization_id and status in ('trial','active');

  if v_plan is null then raise exception 'Entreprise introuvable ou inactive.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'commercial_branding') then
    raise exception 'La personnalisation commerciale n’est pas incluse dans cette offre.';
  end if;
  if v_public_name is null or char_length(v_public_name) not between 2 and 120 then raise exception 'Le nom commercial doit contenir entre 2 et 120 caractères.'; end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) not between 2 and 60 then raise exception 'Le lien public doit contenir uniquement des lettres minuscules, chiffres et tirets.'; end if;
  if v_slug = any(v_reserved_slugs) then raise exception 'Cet identifiant public est réservé.'; end if;
  if exists (select 1 from public.organizations where slug = v_slug and id <> p_organization_id) then raise exception 'Ce lien public est déjà utilisé.'; end if;
  if p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'La couleur principale est invalide.'; end if;
  if v_logo_url is not null and (char_length(v_logo_url) > 1200 or v_logo_url !~ '^https://') then raise exception 'L’adresse du logo est invalide.'; end if;
  if v_banner_url is not null and (char_length(v_banner_url) > 1200 or v_banner_url !~ '^https://') then raise exception 'L’adresse de la bannière est invalide.'; end if;
  if v_tagline is not null and char_length(v_tagline) > 180 then raise exception 'L’accroche est trop longue.'; end if;
  if v_address is not null and char_length(v_address) > 500 then raise exception 'L’adresse est trop longue.'; end if;
  if v_hours_text is not null and char_length(v_hours_text) > 800 then raise exception 'Les horaires sont trop longs.'; end if;
  if v_practical_info is not null and char_length(v_practical_info) > 1200 then raise exception 'Les informations pratiques sont trop longues.'; end if;

  update public.organizations
  set public_name = v_public_name,
      slug = v_slug,
      primary_color = lower(p_primary_color),
      logo_url = v_logo_url,
      booking_banner_url = v_banner_url,
      booking_tagline = v_tagline,
      booking_address = v_address,
      booking_hours_text = v_hours_text,
      booking_practical_info = v_practical_info,
      show_ncr_branding = case when public.organization_has_plan_feature(p_organization_id,'white_label') then coalesce(p_show_ncr_branding,true) else true end,
      updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs (organization_id,user_id,action,entity_type,entity_id,metadata)
  values (p_organization_id,auth.uid(),'organization.commercial_branding_updated','organization',p_organization_id::text,jsonb_build_object('slug',v_slug,'plan',v_plan));
end;
$$;

revoke all on function public.update_commercial_branding(uuid,text,text,text,text,text,text,text,text,text,boolean) from public;
grant execute on function public.update_commercial_branding(uuid,text,text,text,text,text,text,text,text,text,boolean) to authenticated;

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
    'hero_title', coalesce(v_settings.hero_title,coalesce(v_org.booking_tagline,'Bienvenue à table')),
    'hero_description', coalesce(v_settings.hero_description,'Découvrez notre sélection, préparée avec soin et présentée dans la langue de votre choix.'),
    'address', v_org.booking_address,
    'hours_text', v_org.booking_hours_text,
    'practical_info', v_org.booking_practical_info,
    'show_category_nav', coalesce(v_settings.show_category_nav,true),
    'show_dish_images', coalesce(v_settings.show_dish_images,true),
    'show_allergens', coalesce(v_settings.show_allergens,true),
    'show_dietary_badges', coalesce(v_settings.show_dietary_badges,true),
    'booking_enabled', v_booking_enabled,
    'booking_button_label', coalesce(v_settings.booking_button_label,'Réserver une table'),
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

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,installed_at,installed_by,notes
) values (
  true,'2.13.0','2.13.0','ncr-suite-shell-v2.13.0-restaurant-premium',now(),auth.uid(),
  'Finalisation Restauration : menu QR public premium, identité d’enseigne, thèmes visuels, photos des plats et expérience mobile multilingue.'
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
