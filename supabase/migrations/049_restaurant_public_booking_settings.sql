-- NCR Suite V2.8.4 — Paramètres Restauration et activation de la page publique
-- À exécuter après 048_restaurant_reservation_conflict_guard.sql.

begin;

-- Répare explicitement le droit de réservation publique sur toutes les offres
-- Restauration qui doivent le proposer, sans écraser les autres fonctions.
update public.domain_plan_catalog
set features = coalesce(features, '{}'::jsonb)
      || jsonb_build_object('restaurant_online_reservations', true),
    active = true,
    updated_at = now()
where business_type = 'restauration'
  and plan_key in ('essentielle', 'professionnelle', 'metier');

-- Fonction dédiée au restaurant : elle évite de réutiliser les réglages Coiffure
-- et contrôle le droit d'offre directement côté Supabase.
create or replace function public.update_restaurant_public_booking_settings(
  p_organization_id uuid,
  p_enabled boolean,
  p_welcome_text text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_type text;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  select business_type::text
  into v_business_type
  from public.organizations
  where id = p_organization_id
    and status in ('trial','active');

  if v_business_type is null then
    raise exception 'Entreprise introuvable ou inactive.';
  end if;

  if v_business_type <> 'restauration' then
    raise exception 'Ce réglage est réservé au métier Restauration.';
  end if;

  if p_enabled
     and not public.organization_has_plan_feature(
       p_organization_id,
       'restaurant_online_reservations'
     ) then
    raise exception 'La réservation en ligne est disponible à partir de l’offre Essentielle.';
  end if;

  update public.organizations
  set booking_enabled = coalesce(p_enabled, false),
      booking_welcome_text = nullif(trim(coalesce(p_welcome_text, '')), ''),
      updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id
  ) values (
    p_organization_id,
    auth.uid(),
    case when p_enabled
      then 'restaurant.public_booking_enabled'
      else 'restaurant.public_booking_disabled'
    end,
    'organization',
    p_organization_id::text
  );
end;
$$;

revoke all on function public.update_restaurant_public_booking_settings(uuid, boolean, text) from public;
grant execute on function public.update_restaurant_public_booking_settings(uuid, boolean, text) to authenticated;

commit;
