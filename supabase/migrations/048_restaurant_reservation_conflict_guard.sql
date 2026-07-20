-- NCR Suite V2.8.3 — Anti-surréservation des tables
-- À exécuter après 047_restaurant_interactive_floor_plan.sql.

begin;

create index if not exists idx_restaurant_reservations_table_slot
  on public.restaurant_reservations(organization_id, table_id, reservation_at)
  where table_id is not null and status in ('pending','confirmed','seated');

-- Retourne les tables impossibles à proposer sur un créneau : capacité insuffisante,
-- table indisponible ou réservation active qui chevauche le créneau demandé.
create or replace function public.get_restaurant_unavailable_table_ids(
  p_organization_id uuid,
  p_reservation_at timestamptz,
  p_duration_minutes integer,
  p_party_size integer default 1,
  p_exclude_reservation_id uuid default null
)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_end timestamptz;
  v_ids uuid[];
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;
  if p_reservation_at is null or p_duration_minutes not between 30 and 360 then
    raise exception 'Créneau de réservation invalide.';
  end if;
  if p_party_size not between 1 and 100 then
    raise exception 'Nombre de personnes invalide.';
  end if;

  v_end := p_reservation_at + make_interval(mins => p_duration_minutes);

  select coalesce(array_agg(t.id), '{}'::uuid[])
  into v_ids
  from public.restaurant_tables t
  where t.organization_id = p_organization_id
    and t.active
    and (
      t.capacity < p_party_size
      or coalesce(t.service_status, 'available') = 'unavailable'
      or exists (
        select 1
        from public.restaurant_reservations r
        where r.organization_id = p_organization_id
          and r.table_id = t.id
          and r.status in ('pending','confirmed','seated')
          and (p_exclude_reservation_id is null or r.id <> p_exclude_reservation_id)
          and r.reservation_at < v_end
          and p_reservation_at < r.reservation_at + make_interval(mins => r.duration_minutes)
      )
    );

  return v_ids;
end;
$$;

-- Dernier rempart serveur. Même si deux utilisateurs réservent au même instant,
-- une seule réservation peut être enregistrée sur la même table et le même créneau.
create or replace function public.prevent_restaurant_table_double_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table public.restaurant_tables%rowtype;
  v_conflict public.restaurant_reservations%rowtype;
begin
  if new.table_id is null then
    if tg_op = 'INSERT'
       and new.status in ('pending','confirmed','seated')
       and exists (
         select 1 from public.restaurant_tables t
         where t.organization_id = new.organization_id and t.active
       ) then
      raise exception using errcode = 'P0001', message = 'Choisissez une table disponible pour bloquer le créneau.';
    end if;
    return new;
  end if;

  if new.status not in ('pending','confirmed','seated') then
    return new;
  end if;

  select * into v_table
  from public.restaurant_tables
  where organization_id = new.organization_id
    and id = new.table_id;

  if v_table.id is null or not v_table.active then
    raise exception using errcode = 'P0001', message = 'Cette table n’est pas disponible.';
  end if;
  if coalesce(v_table.service_status, 'available') = 'unavailable' then
    raise exception using errcode = 'P0001', message = 'Cette table est actuellement indisponible.';
  end if;
  if new.party_size > v_table.capacity then
    raise exception using errcode = 'P0001', message = format('La table %s possède seulement %s places.', v_table.name, v_table.capacity);
  end if;

  -- Verrou transactionnel par entreprise + table pour éviter une course entre deux inserts.
  perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text || ':' || new.table_id::text, 0));

  select r.* into v_conflict
  from public.restaurant_reservations r
  where r.organization_id = new.organization_id
    and r.table_id = new.table_id
    and r.status in ('pending','confirmed','seated')
    and r.id <> coalesce(new.id, gen_random_uuid())
    and r.reservation_at < new.reservation_at + make_interval(mins => new.duration_minutes)
    and new.reservation_at < r.reservation_at + make_interval(mins => r.duration_minutes)
  order by r.reservation_at
  limit 1;

  if v_conflict.id is not null then
    raise exception using
      errcode = 'P0001',
      message = format(
        'La table %s est déjà réservée de %s à %s.',
        v_table.name,
        to_char(v_conflict.reservation_at at time zone 'Europe/Paris', 'HH24:MI'),
        to_char((v_conflict.reservation_at + make_interval(mins => v_conflict.duration_minutes)) at time zone 'Europe/Paris', 'HH24:MI')
      );
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_restaurant_table_double_booking_trigger on public.restaurant_reservations;
create trigger prevent_restaurant_table_double_booking_trigger
before insert or update of table_id, reservation_at, duration_minutes, status, party_size
on public.restaurant_reservations
for each row execute procedure public.prevent_restaurant_table_double_booking();

-- Disponibilité publique sans exposer les tables, les clients ou le planning interne.
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
begin
  select * into v_org
  from public.organizations
  where slug = lower(trim(p_slug))
    and business_type = 'restauration'
    and status in ('trial','active')
  limit 1;

  if v_org.id is null
     or not coalesce(v_org.booking_enabled, true)
     or not public.organization_has_plan_feature(v_org.id, 'restaurant_online_reservations') then
    return jsonb_build_object('available', false, 'reason', 'La réservation en ligne n’est pas disponible.');
  end if;
  if p_party_size not between 1 and 30 or p_duration_minutes not between 30 and 360 then
    return jsonb_build_object('available', false, 'reason', 'Les informations du créneau sont invalides.');
  end if;

  select count(*) into v_table_count
  from public.restaurant_tables t
  where t.organization_id = v_org.id and t.active;

  -- Compatibilité avec les restaurants qui n’ont pas encore configuré leur plan de salle.
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

-- La réservation publique attribue automatiquement la plus petite table adaptée.
-- Une demande en attente bloque donc réellement le créneau jusqu’à confirmation ou annulation.
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
begin
  select * into v_org
  from public.organizations
  where slug = lower(trim(p_slug))
    and business_type = 'restauration'
    and status in ('trial','active')
  limit 1;

  if v_org.id is null
     or not coalesce(v_org.booking_enabled, true)
     or not public.organization_has_plan_feature(v_org.id, 'restaurant_online_reservations') then
    raise exception 'La réservation en ligne n’est pas disponible.';
  end if;
  if char_length(trim(coalesce(p_guest_name, ''))) < 2 then raise exception 'Indiquez votre nom.'; end if;
  if p_party_size not between 1 and 30 then raise exception 'Le nombre de personnes doit être compris entre 1 et 30.'; end if;
  if p_reservation_at < now() + interval '30 minutes' or p_reservation_at > now() + interval '180 days' then raise exception 'Choisissez une date valide.'; end if;
  if nullif(trim(coalesce(p_guest_email, '')), '') is null and nullif(trim(coalesce(p_guest_phone, '')), '') is null then
    raise exception 'Indiquez un e-mail ou un téléphone.';
  end if;

  select count(*) into v_table_count
  from public.restaurant_tables t
  where t.organization_id = v_org.id and t.active;

  -- Ancien fonctionnement conservé tant que le restaurant n’a créé aucune table.
  if v_table_count = 0 then
    insert into public.restaurant_reservations(
      organization_id, source, guest_name, guest_email, guest_phone,
      party_size, reservation_at, duration_minutes, status, notes
    ) values (
      v_org.id, 'online', trim(p_guest_name), nullif(lower(trim(coalesce(p_guest_email, ''))), ''),
      nullif(trim(coalesce(p_guest_phone, '')), ''), p_party_size, p_reservation_at, 120, 'pending',
      nullif(trim(coalesce(p_notes, '')), '')
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
        v_org.id, v_table.id, 'online', trim(p_guest_name), nullif(lower(trim(coalesce(p_guest_email, ''))), ''),
        nullif(trim(coalesce(p_guest_phone, '')), ''), p_party_size, p_reservation_at, 120, 'pending',
        nullif(trim(coalesce(p_notes, '')), '')
      ) returning id into v_id;
      return v_id;
    end if;
  end loop;

  raise exception 'Aucune table adaptée n’est disponible sur ce créneau. Choisissez une autre heure.';
end;
$$;

grant execute on function public.get_restaurant_unavailable_table_ids(uuid,timestamptz,integer,integer,uuid) to authenticated;
grant execute on function public.get_public_restaurant_booking_availability(text,integer,timestamptz,integer) to anon, authenticated;
grant execute on function public.create_public_restaurant_reservation(text,text,text,text,integer,timestamptz,text) to anon, authenticated;

commit;
