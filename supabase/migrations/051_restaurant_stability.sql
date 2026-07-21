-- NCR Suite V2.9.2 — Stabilisation complète Restauration
-- À exécuter après 050_restaurant_ordering_kitchen.sql.

begin;

create index if not exists idx_restaurant_reservations_public_email
  on public.restaurant_reservations(organization_id, lower(guest_email), created_at desc)
  where source = 'online' and guest_email is not null;

create index if not exists idx_restaurant_reservations_public_phone
  on public.restaurant_reservations(organization_id, guest_phone, created_at desc)
  where source = 'online' and guest_phone is not null;

-- Version complète des réglages Restauration. L’ancienne surcharge à trois
-- paramètres est conservée plus bas pour les anciens caches PWA.
create or replace function public.update_restaurant_public_booking_settings(
  p_organization_id uuid,
  p_enabled boolean,
  p_confirmation_mode text,
  p_slot_interval integer,
  p_min_notice_hours integer,
  p_max_days_ahead integer,
  p_cancel_notice_hours integer,
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
  if p_enabled and not public.organization_has_plan_feature(p_organization_id, 'restaurant_online_reservations') then
    raise exception 'La réservation en ligne est disponible à partir de l’offre Essentielle.';
  end if;
  if p_confirmation_mode not in ('automatic','manual') then
    raise exception 'Mode de confirmation invalide.';
  end if;
  if p_slot_interval not in (5,10,15,20,30,45,60) then
    raise exception 'Intervalle de créneau invalide.';
  end if;
  if p_min_notice_hours not between 0 and 720 then
    raise exception 'Délai minimum invalide.';
  end if;
  if p_max_days_ahead not between 1 and 365 then
    raise exception 'Période de réservation invalide.';
  end if;
  if p_cancel_notice_hours not between 0 and 720 then
    raise exception 'Délai d’annulation invalide.';
  end if;

  update public.organizations
  set booking_enabled = coalesce(p_enabled, false),
      booking_confirmation_mode = p_confirmation_mode,
      booking_slot_interval = p_slot_interval,
      booking_min_notice_hours = p_min_notice_hours,
      booking_max_days_ahead = p_max_days_ahead,
      booking_cancel_notice_hours = p_cancel_notice_hours,
      booking_welcome_text = nullif(trim(coalesce(p_welcome_text, '')), ''),
      updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id)
  values (p_organization_id, auth.uid(), 'restaurant.public_booking_settings_updated', 'organization', p_organization_id::text);
end;
$$;

-- Compatibilité avec l’ancien frontend qui n’envoyait que l’activation et le texte.
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
  v_org public.organizations%rowtype;
begin
  select * into v_org from public.organizations where id = p_organization_id;
  perform public.update_restaurant_public_booking_settings(
    p_organization_id,
    p_enabled,
    coalesce(v_org.booking_confirmation_mode, 'manual'),
    coalesce(v_org.booking_slot_interval, 15),
    coalesce(v_org.booking_min_notice_hours, 2),
    coalesce(v_org.booking_max_days_ahead, 180),
    coalesce(v_org.booking_cancel_notice_hours, 12),
    p_welcome_text
  );
end;
$$;

create or replace function public.get_public_restaurant_booking_config(p_slug text)
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

  v_enabled := coalesce(v_org.booking_enabled, false)
    and public.organization_has_plan_feature(v_org.id, 'restaurant_online_reservations');

  return jsonb_build_object(
    'organization_name', v_org.name,
    'public_name', v_org.public_name,
    'primary_color', v_org.primary_color,
    'logo_url', v_org.logo_url,
    'booking_enabled', v_enabled,
    'booking_welcome_text', v_org.booking_welcome_text,
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

create or replace function public.get_public_restaurant_booking_availability(
  p_slug text,
  p_party_size integer,
  p_reservation_at timestamptz,
  p_duration_minutes integer default 120
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_table_count integer;
  v_available boolean;
  v_local timestamp;
  v_minutes integer;
  v_interval integer;
begin
  select * into v_org
  from public.organizations
  where slug = lower(trim(p_slug))
    and business_type = 'restauration'
    and status in ('trial','active')
  limit 1;

  if v_org.id is null
     or not coalesce(v_org.booking_enabled, false)
     or not public.organization_has_plan_feature(v_org.id, 'restaurant_online_reservations') then
    return jsonb_build_object('available', false, 'reason', 'La réservation en ligne n’est pas disponible.');
  end if;
  if p_party_size not between 1 and 30 or p_duration_minutes not between 30 and 360 then
    return jsonb_build_object('available', false, 'reason', 'Les informations du créneau sont invalides.');
  end if;
  if p_reservation_at < now() + make_interval(hours => coalesce(v_org.booking_min_notice_hours, 2)) then
    return jsonb_build_object('available', false, 'reason', format('Ce restaurant demande au moins %s heure(s) de délai.', coalesce(v_org.booking_min_notice_hours, 2)));
  end if;
  if (p_reservation_at at time zone 'Europe/Paris')::date > (now() at time zone 'Europe/Paris')::date + coalesce(v_org.booking_max_days_ahead, 180) then
    return jsonb_build_object('available', false, 'reason', 'Cette date est trop éloignée pour être réservée en ligne.');
  end if;

  v_interval := coalesce(v_org.booking_slot_interval, 15);
  v_local := p_reservation_at at time zone 'Europe/Paris';
  v_minutes := extract(hour from v_local)::integer * 60 + extract(minute from v_local)::integer;
  if mod(v_minutes, v_interval) <> 0 or extract(second from v_local) <> 0 then
    return jsonb_build_object('available', false, 'reason', format('Choisissez un horaire par intervalle de %s minutes.', v_interval));
  end if;

  select count(*) into v_table_count
  from public.restaurant_tables t
  where t.organization_id = v_org.id and t.active;

  if v_table_count = 0 then
    return jsonb_build_object('available', true, 'manual_assignment', true);
  end if;

  select exists (
    select 1
    from public.restaurant_tables t
    where t.organization_id = v_org.id
      and t.active
      and t.capacity >= p_party_size
      and coalesce(t.service_status, 'available') <> 'unavailable'
      and not exists (
        select 1
        from public.restaurant_reservations r
        where r.organization_id = v_org.id
          and r.table_id = t.id
          and r.status in ('pending','confirmed','seated')
          and r.reservation_at < p_reservation_at + make_interval(mins => p_duration_minutes)
          and p_reservation_at < r.reservation_at + make_interval(mins => r.duration_minutes)
      )
  ) into v_available;

  return jsonb_build_object(
    'available', v_available,
    'manual_assignment', false,
    'reason', case when v_available then null else 'Aucune table adaptée n’est disponible sur ce créneau.' end
  );
end;
$$;

create or replace function public.create_public_restaurant_reservation(
  p_slug text,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_party_size integer,
  p_reservation_at timestamptz,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_id uuid;
  v_table record;
  v_table_count integer;
  v_status text;
  v_email text;
  v_phone text;
  v_local timestamp;
  v_minutes integer;
  v_interval integer;
begin
  select * into v_org
  from public.organizations
  where slug = lower(trim(p_slug))
    and business_type = 'restauration'
    and status in ('trial','active')
  limit 1;

  if v_org.id is null
     or not coalesce(v_org.booking_enabled, false)
     or not public.organization_has_plan_feature(v_org.id, 'restaurant_online_reservations') then
    raise exception 'La réservation en ligne n’est pas disponible.';
  end if;
  if char_length(trim(coalesce(p_guest_name, ''))) < 2 then raise exception 'Indiquez votre nom.'; end if;
  if p_party_size not between 1 and 30 then raise exception 'Le nombre de personnes doit être compris entre 1 et 30.'; end if;
  if p_reservation_at < now() + make_interval(hours => coalesce(v_org.booking_min_notice_hours, 2)) then
    raise exception 'Le délai minimum de réservation n’est pas respecté.';
  end if;
  if (p_reservation_at at time zone 'Europe/Paris')::date > (now() at time zone 'Europe/Paris')::date + coalesce(v_org.booking_max_days_ahead, 180) then
    raise exception 'Cette date est trop éloignée pour être réservée en ligne.';
  end if;

  v_interval := coalesce(v_org.booking_slot_interval, 15);
  v_local := p_reservation_at at time zone 'Europe/Paris';
  v_minutes := extract(hour from v_local)::integer * 60 + extract(minute from v_local)::integer;
  if mod(v_minutes, v_interval) <> 0 or extract(second from v_local) <> 0 then
    raise exception 'Choisissez un horaire compatible avec les créneaux du restaurant.';
  end if;

  v_email := nullif(lower(trim(coalesce(p_guest_email, ''))), '');
  v_phone := nullif(regexp_replace(trim(coalesce(p_guest_phone, '')), '[^0-9+]', '', 'g'), '');
  if v_email is null and v_phone is null then
    raise exception 'Indiquez un e-mail ou un téléphone.';
  end if;

  if (
    select count(*)
    from public.restaurant_reservations r
    where r.organization_id = v_org.id
      and r.source = 'online'
      and r.created_at >= now() - interval '24 hours'
      and (
        (v_email is not null and lower(coalesce(r.guest_email, '')) = v_email)
        or (v_phone is not null and regexp_replace(coalesce(r.guest_phone, ''), '[^0-9+]', '', 'g') = v_phone)
      )
  ) >= 5 then
    raise exception 'Trop de demandes ont été envoyées avec ces coordonnées. Réessayez plus tard.';
  end if;

  v_status := case when coalesce(v_org.booking_confirmation_mode, 'manual') = 'automatic' then 'confirmed' else 'pending' end;

  select count(*) into v_table_count
  from public.restaurant_tables t
  where t.organization_id = v_org.id and t.active;

  if v_table_count = 0 then
    insert into public.restaurant_reservations(
      organization_id, source, guest_name, guest_email, guest_phone,
      party_size, reservation_at, duration_minutes, status, notes
    ) values (
      v_org.id, 'online', trim(p_guest_name), v_email, nullif(trim(coalesce(p_guest_phone, '')), ''),
      p_party_size, p_reservation_at, 120, v_status, nullif(trim(coalesce(p_notes, '')), '')
    ) returning id into v_id;
    return v_id;
  end if;

  for v_table in
    select t.id, t.capacity
    from public.restaurant_tables t
    where t.organization_id = v_org.id
      and t.active
      and t.capacity >= p_party_size
      and coalesce(t.service_status, 'available') <> 'unavailable'
    order by t.capacity, t.name
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_org.id::text || ':' || v_table.id::text, 0));

    if not exists (
      select 1
      from public.restaurant_reservations r
      where r.organization_id = v_org.id
        and r.table_id = v_table.id
        and r.status in ('pending','confirmed','seated')
        and r.reservation_at < p_reservation_at + interval '120 minutes'
        and p_reservation_at < r.reservation_at + make_interval(mins => r.duration_minutes)
    ) then
      insert into public.restaurant_reservations(
        organization_id, table_id, source, guest_name, guest_email, guest_phone,
        party_size, reservation_at, duration_minutes, status, notes
      ) values (
        v_org.id, v_table.id, 'online', trim(p_guest_name), v_email, nullif(trim(coalesce(p_guest_phone, '')), ''),
        p_party_size, p_reservation_at, 120, v_status, nullif(trim(coalesce(p_notes, '')), '')
      ) returning id into v_id;
      return v_id;
    end if;
  end loop;

  raise exception 'Aucune table adaptée n’est disponible sur ce créneau. Choisissez une autre heure.';
end;
$$;

-- Mise à jour centralisée des statuts avec audit et synchronisation du plan de salle.
create or replace function public.set_restaurant_reservation_status(
  p_reservation_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.restaurant_reservations%rowtype;
  v_has_active_order boolean;
begin
  if p_status not in ('pending','confirmed','seated','completed','canceled','no_show') then
    raise exception 'Statut de réservation invalide.';
  end if;

  select * into v_reservation
  from public.restaurant_reservations
  where id = p_reservation_id
  for update;

  if v_reservation.id is null or not public.is_org_member(v_reservation.organization_id) then
    raise exception 'Réservation introuvable.';
  end if;

  update public.restaurant_reservations
  set status = p_status, updated_at = now()
  where id = p_reservation_id;

  if v_reservation.table_id is not null then
    select exists(
      select 1 from public.restaurant_orders o
      where o.organization_id = v_reservation.organization_id
        and o.table_id = v_reservation.table_id
        and o.status not in ('closed','canceled')
    ) into v_has_active_order;

    if not v_has_active_order then
      update public.restaurant_tables
      set service_status = case
        when p_status = 'seated' and service_status <> 'unavailable' then 'occupied'
        when p_status = 'completed' and service_status <> 'unavailable' then 'cleaning'
        when p_status in ('canceled','no_show') and service_status in ('reserved','occupied') then 'available'
        when p_status in ('pending','confirmed') and service_status = 'occupied' then 'available'
        else service_status
      end,
      updated_at = now()
      where id = v_reservation.table_id
        and organization_id = v_reservation.organization_id;
    end if;
  end if;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id)
  values (v_reservation.organization_id, auth.uid(), 'restaurant.reservation_status_updated', 'restaurant_reservation', v_reservation.id::text);
end;
$$;

revoke all on function public.update_restaurant_public_booking_settings(uuid,boolean,text,integer,integer,integer,integer,text) from public;
revoke all on function public.update_restaurant_public_booking_settings(uuid,boolean,text) from public;
revoke all on function public.set_restaurant_reservation_status(uuid,text) from public;

grant execute on function public.update_restaurant_public_booking_settings(uuid,boolean,text,integer,integer,integer,integer,text) to authenticated;
grant execute on function public.update_restaurant_public_booking_settings(uuid,boolean,text) to authenticated;
grant execute on function public.get_public_restaurant_booking_config(text) to anon, authenticated;
grant execute on function public.get_public_restaurant_booking_availability(text,integer,timestamptz,integer) to anon, authenticated;
grant execute on function public.create_public_restaurant_reservation(text,text,text,text,integer,timestamptz,text) to anon, authenticated;
grant execute on function public.set_restaurant_reservation_status(uuid,text) to authenticated;

commit;
