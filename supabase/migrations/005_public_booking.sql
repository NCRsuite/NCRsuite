-- NCR Suite V1.5.0 — réservation publique sécurisée
-- À exécuter après 004_appointments.sql.

alter table public.organizations
  add column if not exists booking_enabled boolean not null default false,
  add column if not exists booking_confirmation_mode text not null default 'automatic',
  add column if not exists booking_slot_interval integer not null default 15,
  add column if not exists booking_min_notice_hours integer not null default 2,
  add column if not exists booking_max_days_ahead integer not null default 60,
  add column if not exists booking_cancel_notice_hours integer not null default 12,
  add column if not exists booking_welcome_text text;

alter table public.organizations
  drop constraint if exists organizations_booking_confirmation_mode_check,
  add constraint organizations_booking_confirmation_mode_check
    check (booking_confirmation_mode in ('automatic','manual')),
  drop constraint if exists organizations_booking_slot_interval_check,
  add constraint organizations_booking_slot_interval_check
    check (booking_slot_interval in (5,10,15,20,30,45,60)),
  drop constraint if exists organizations_booking_min_notice_hours_check,
  add constraint organizations_booking_min_notice_hours_check
    check (booking_min_notice_hours between 0 and 720),
  drop constraint if exists organizations_booking_max_days_ahead_check,
  add constraint organizations_booking_max_days_ahead_check
    check (booking_max_days_ahead between 1 and 365),
  drop constraint if exists organizations_booking_cancel_notice_hours_check,
  add constraint organizations_booking_cancel_notice_hours_check
    check (booking_cancel_notice_hours between 0 and 720);

alter table public.appointments
  add column if not exists public_token uuid,
  add column if not exists customer_manage_last_seen_at timestamptz;

create unique index if not exists idx_appointments_public_token
  on public.appointments(public_token)
  where public_token is not null;

create index if not exists idx_appointments_public_source_created
  on public.appointments(organization_id, source, created_at desc);

create or replace function public.update_public_booking_settings(
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
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
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
  set booking_enabled = p_enabled,
      booking_confirmation_mode = p_confirmation_mode,
      booking_slot_interval = p_slot_interval,
      booking_min_notice_hours = p_min_notice_hours,
      booking_max_days_ahead = p_max_days_ahead,
      booking_cancel_notice_hours = p_cancel_notice_hours,
      booking_welcome_text = nullif(trim(coalesce(p_welcome_text, '')), ''),
      updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  values (p_organization_id, auth.uid(), 'booking.settings_updated', 'organization', p_organization_id::text);
end;
$$;

create or replace function public.get_public_booking_page(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_organization public.organizations%rowtype;
  v_services jsonb;
  v_staff jsonb;
begin
  select * into v_organization
  from public.organizations
  where slug = lower(trim(p_slug))
    and status in ('trial','active')
    and business_type = 'coiffure'
    and booking_enabled = true;

  if v_organization.id is null then
    return null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'description', s.description,
      'duration_minutes', s.duration_minutes,
      'price_cents', s.price_cents
    ) order by s.name
  ), '[]'::jsonb)
  into v_services
  from public.services s
  where s.organization_id = v_organization.id
    and s.active = true
    and exists (
      select 1
      from public.staff_services ss
      join public.staff st
        on st.organization_id = ss.organization_id
       and st.id = ss.staff_id
       and st.active = true
      where ss.organization_id = v_organization.id
        and ss.service_id = s.id
    );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', st.id,
      'display_name', st.display_name,
      'color', st.color,
      'service_ids', coalesce((
        select jsonb_agg(ss.service_id order by ss.service_id)
        from public.staff_services ss
        where ss.organization_id = v_organization.id
          and ss.staff_id = st.id
      ), '[]'::jsonb)
    ) order by st.display_name
  ), '[]'::jsonb)
  into v_staff
  from public.staff st
  where st.organization_id = v_organization.id
    and st.active = true
    and exists (
      select 1 from public.staff_working_hours h
      where h.organization_id = v_organization.id
        and h.staff_id = st.id
    );

  return jsonb_build_object(
    'organization', jsonb_build_object(
      'id', v_organization.id,
      'name', v_organization.name,
      'slug', v_organization.slug,
      'primary_color', v_organization.primary_color,
      'logo_url', v_organization.logo_url,
      'timezone', v_organization.timezone
    ),
    'settings', jsonb_build_object(
      'confirmation_mode', v_organization.booking_confirmation_mode,
      'slot_interval', v_organization.booking_slot_interval,
      'min_notice_hours', v_organization.booking_min_notice_hours,
      'max_days_ahead', v_organization.booking_max_days_ahead,
      'cancel_notice_hours', v_organization.booking_cancel_notice_hours,
      'welcome_text', v_organization.booking_welcome_text
    ),
    'services', v_services,
    'staff', v_staff
  );
end;
$$;

create or replace function public.get_public_available_slots(
  p_slug text,
  p_service_id uuid,
  p_date date,
  p_staff_id uuid default null
)
returns table (
  slot_start timestamptz,
  slot_end timestamptz,
  staff_id uuid,
  staff_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_timezone text;
  v_interval integer;
  v_min_notice integer;
  v_max_days integer;
  v_duration integer;
  v_today date;
  v_weekday smallint;
begin
  select id, timezone, booking_slot_interval, booking_min_notice_hours, booking_max_days_ahead
  into v_organization_id, v_timezone, v_interval, v_min_notice, v_max_days
  from public.organizations
  where slug = lower(trim(p_slug))
    and status in ('trial','active')
    and business_type = 'coiffure'
    and booking_enabled = true;

  if v_organization_id is null then
    return;
  end if;

  select duration_minutes into v_duration
  from public.services
  where id = p_service_id
    and organization_id = v_organization_id
    and active = true;

  if v_duration is null then
    return;
  end if;

  v_today := (now() at time zone v_timezone)::date;
  if p_date < v_today or p_date > v_today + v_max_days then
    return;
  end if;

  v_weekday := extract(isodow from p_date)::smallint - 1;

  return query
  with candidates as (
    select
      st.id as candidate_staff_id,
      st.display_name as candidate_staff_name,
      local_start,
      local_start + make_interval(mins => v_duration) as local_end
    from public.staff st
    join public.staff_services ss
      on ss.organization_id = st.organization_id
     and ss.staff_id = st.id
     and ss.service_id = p_service_id
    join public.staff_working_hours h
      on h.organization_id = st.organization_id
     and h.staff_id = st.id
     and h.weekday = v_weekday
    cross join lateral generate_series(
      p_date + h.start_time,
      p_date + h.end_time - make_interval(mins => v_duration),
      make_interval(mins => v_interval)
    ) as local_start
    where st.organization_id = v_organization_id
      and st.active = true
      and (p_staff_id is null or st.id = p_staff_id)
  )
  select
    c.local_start at time zone v_timezone as slot_start,
    c.local_end at time zone v_timezone as slot_end,
    c.candidate_staff_id as staff_id,
    c.candidate_staff_name as staff_name
  from candidates c
  where (c.local_start at time zone v_timezone) >= now() + make_interval(hours => v_min_notice)
    and not exists (
      select 1
      from public.staff_breaks b
      where b.organization_id = v_organization_id
        and b.staff_id = c.candidate_staff_id
        and b.weekday = v_weekday
        and c.local_start::time < b.end_time
        and c.local_end::time > b.start_time
    )
    and not exists (
      select 1
      from public.appointments a
      where a.organization_id = v_organization_id
        and a.staff_id = c.candidate_staff_id
        and a.status <> 'cancelled'
        and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(
          c.local_start at time zone v_timezone,
          c.local_end at time zone v_timezone,
          '[)'
        )
    )
  order by slot_start, staff_name;
end;
$$;

create or replace function public.create_public_booking(
  p_slug text,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_notes text default null,
  p_website text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization public.organizations%rowtype;
  v_duration integer;
  v_amount integer;
  v_service_name text;
  v_staff_name text;
  v_ends_at timestamptz;
  v_starts_local timestamp;
  v_ends_local timestamp;
  v_weekday smallint;
  v_work_start time;
  v_work_end time;
  v_client_id uuid;
  v_appointment_id uuid;
  v_token uuid := gen_random_uuid();
  v_status text;
  v_first_name text := trim(coalesce(p_first_name, ''));
  v_last_name text := nullif(trim(coalesce(p_last_name, '')), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_normalized_phone text;
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  -- Champ invisible anti-robot : toute valeur bloque silencieusement la demande.
  if nullif(trim(coalesce(p_website, '')), '') is not null then
    raise exception 'Réservation impossible.';
  end if;

  select * into v_organization
  from public.organizations
  where slug = lower(trim(p_slug))
    and status in ('trial','active')
    and business_type = 'coiffure'
    and booking_enabled = true;

  if v_organization.id is null then
    raise exception 'La réservation en ligne est indisponible.';
  end if;

  if char_length(v_first_name) not between 2 and 80 then
    raise exception 'Indiquez un prénom valide.';
  end if;

  if v_last_name is not null and char_length(v_last_name) > 100 then
    raise exception 'Le nom est trop long.';
  end if;

  if v_email is null and v_phone is null then
    raise exception 'Indiquez une adresse e-mail ou un numéro de téléphone.';
  end if;

  if v_email is not null and v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'L’adresse e-mail est invalide.';
  end if;

  v_normalized_phone := nullif(regexp_replace(coalesce(v_phone, ''), '[^0-9+]', '', 'g'), '');
  if v_phone is not null and char_length(v_normalized_phone) < 8 then
    raise exception 'Le numéro de téléphone est invalide.';
  end if;

  if v_notes is not null and char_length(v_notes) > 1000 then
    raise exception 'Le message est trop long.';
  end if;

  if p_starts_at < now() + make_interval(hours => v_organization.booking_min_notice_hours) then
    raise exception 'Ce créneau est trop proche.';
  end if;

  if (p_starts_at at time zone v_organization.timezone)::date
      > (now() at time zone v_organization.timezone)::date + v_organization.booking_max_days_ahead then
    raise exception 'Ce créneau est trop éloigné.';
  end if;

  select s.duration_minutes, s.price_cents, s.name
  into v_duration, v_amount, v_service_name
  from public.services s
  where s.id = p_service_id
    and s.organization_id = v_organization.id
    and s.active = true;

  if v_duration is null then
    raise exception 'La prestation sélectionnée est indisponible.';
  end if;

  select st.display_name into v_staff_name
  from public.staff st
  where st.id = p_staff_id
    and st.organization_id = v_organization.id
    and st.active = true;

  if v_staff_name is null then
    raise exception 'Le collaborateur sélectionné est indisponible.';
  end if;

  if not exists (
    select 1 from public.staff_services ss
    where ss.organization_id = v_organization.id
      and ss.staff_id = p_staff_id
      and ss.service_id = p_service_id
  ) then
    raise exception 'Ce collaborateur ne réalise pas cette prestation.';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_starts_local := p_starts_at at time zone v_organization.timezone;
  v_ends_local := v_ends_at at time zone v_organization.timezone;
  v_weekday := extract(isodow from v_starts_local)::smallint - 1;

  if v_starts_local::date <> v_ends_local::date then
    raise exception 'Le créneau est invalide.';
  end if;

  select h.start_time, h.end_time
  into v_work_start, v_work_end
  from public.staff_working_hours h
  where h.organization_id = v_organization.id
    and h.staff_id = p_staff_id
    and h.weekday = v_weekday;

  if v_work_start is null
     or v_starts_local::time < v_work_start
     or v_ends_local::time > v_work_end then
    raise exception 'Ce créneau se situe en dehors des horaires disponibles.';
  end if;

  if exists (
    select 1 from public.staff_breaks b
    where b.organization_id = v_organization.id
      and b.staff_id = p_staff_id
      and b.weekday = v_weekday
      and v_starts_local::time < b.end_time
      and v_ends_local::time > b.start_time
  ) then
    raise exception 'Ce créneau n’est plus disponible.';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.organization_id = v_organization.id
      and a.staff_id = p_staff_id
      and a.status <> 'cancelled'
      and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'Ce créneau vient d’être réservé.';
  end if;

  -- Limitation simple contre les envois répétés avec les mêmes coordonnées.
  if (
    select count(*)
    from public.appointments a
    join public.clients c
      on c.organization_id = a.organization_id
     and c.id = a.client_id
    where a.organization_id = v_organization.id
      and a.source = 'public'
      and a.created_at > now() - interval '24 hours'
      and (
        (v_email is not null and lower(coalesce(c.email, '')) = v_email)
        or (
          v_normalized_phone is not null
          and regexp_replace(coalesce(c.phone, ''), '[^0-9+]', '', 'g') = v_normalized_phone
        )
      )
  ) >= 5 then
    raise exception 'Trop de demandes ont été envoyées avec ces coordonnées. Réessayez plus tard.';
  end if;

  select c.id into v_client_id
  from public.clients c
  where c.organization_id = v_organization.id
    and (
      (v_email is not null and lower(coalesce(c.email, '')) = v_email)
      or (
        v_normalized_phone is not null
        and regexp_replace(coalesce(c.phone, ''), '[^0-9+]', '', 'g') = v_normalized_phone
      )
    )
  order by case when c.status = 'active' then 0 else 1 end, c.created_at desc
  limit 1;

  if v_client_id is null then
    insert into public.clients (
      organization_id, first_name, last_name, email, phone, notes, status, created_by
    ) values (
      v_organization.id, v_first_name, v_last_name, v_email, v_phone, null, 'active', null
    ) returning id into v_client_id;
  else
    update public.clients
    set first_name = v_first_name,
        last_name = coalesce(v_last_name, last_name),
        email = coalesce(v_email, email),
        phone = coalesce(v_phone, phone),
        status = 'active',
        updated_at = now()
    where id = v_client_id
      and organization_id = v_organization.id;
  end if;

  v_status := case
    when v_organization.booking_confirmation_mode = 'manual' then 'pending'
    else 'confirmed'
  end;

  insert into public.appointments (
    organization_id,
    client_id,
    service_id,
    staff_id,
    starts_at,
    ends_at,
    status,
    notes,
    amount_cents,
    source,
    created_by,
    public_token
  ) values (
    v_organization.id,
    v_client_id,
    p_service_id,
    p_staff_id,
    p_starts_at,
    v_ends_at,
    v_status,
    v_notes,
    v_amount,
    'public',
    null,
    v_token
  ) returning id into v_appointment_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    v_organization.id,
    null,
    'appointment.public_created',
    'appointment',
    v_appointment_id::text,
    jsonb_build_object('status', v_status)
  );

  return jsonb_build_object(
    'appointment_id', v_appointment_id,
    'token', v_token,
    'status', v_status,
    'starts_at', p_starts_at,
    'ends_at', v_ends_at,
    'organization_name', v_organization.name,
    'organization_slug', v_organization.slug,
    'service_name', v_service_name,
    'staff_name', v_staff_name,
    'amount_cents', v_amount
  );
exception
  when exclusion_violation then
    raise exception 'Ce créneau vient d’être réservé par une autre personne.';
end;
$$;

create or replace function public.get_public_booking(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'appointment_id', a.id,
    'token', a.public_token,
    'status', a.status,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'notes', a.notes,
    'amount_cents', a.amount_cents,
    'organization_name', o.name,
    'organization_slug', o.slug,
    'primary_color', o.primary_color,
    'logo_url', o.logo_url,
    'timezone', o.timezone,
    'cancel_notice_hours', o.booking_cancel_notice_hours,
    'service_id', s.id,
    'service_name', s.name,
    'service_duration_minutes', s.duration_minutes,
    'staff_id', st.id,
    'staff_name', st.display_name,
    'client_name', trim(concat_ws(' ', c.first_name, c.last_name)),
    'client_email', c.email,
    'client_phone', c.phone,
    'can_cancel', (
      a.status in ('pending','confirmed')
      and now() < a.starts_at - make_interval(hours => o.booking_cancel_notice_hours)
    )
  ) into v_result
  from public.appointments a
  join public.organizations o on o.id = a.organization_id
  join public.clients c on c.organization_id = a.organization_id and c.id = a.client_id
  join public.services s on s.organization_id = a.organization_id and s.id = a.service_id
  join public.staff st on st.organization_id = a.organization_id and st.id = a.staff_id
  where a.public_token = p_token
    and a.source = 'public';

  if v_result is not null then
    update public.appointments
    set customer_manage_last_seen_at = now()
    where public_token = p_token;
  end if;

  return v_result;
end;
$$;

create or replace function public.cancel_public_booking(
  p_token uuid,
  p_reason text default 'Annulation demandée par le client'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment_id uuid;
  v_organization_id uuid;
  v_starts_at timestamptz;
  v_status text;
  v_notice integer;
begin
  select a.id, a.organization_id, a.starts_at, a.status, o.booking_cancel_notice_hours
  into v_appointment_id, v_organization_id, v_starts_at, v_status, v_notice
  from public.appointments a
  join public.organizations o on o.id = a.organization_id
  where a.public_token = p_token
    and a.source = 'public'
  for update of a;

  if v_appointment_id is null then
    raise exception 'Réservation introuvable.';
  end if;

  if v_status not in ('pending','confirmed') then
    raise exception 'Cette réservation ne peut plus être annulée en ligne.';
  end if;

  if now() >= v_starts_at - make_interval(hours => v_notice) then
    raise exception 'Le délai d’annulation en ligne est dépassé. Contactez directement l’établissement.';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = left(nullif(trim(coalesce(p_reason, '')), ''), 500)
  where id = v_appointment_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  values (v_organization_id, null, 'appointment.public_cancelled', 'appointment', v_appointment_id::text);

  return true;
end;
$$;

create or replace function public.reschedule_public_booking(
  p_token uuid,
  p_staff_id uuid,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_organization public.organizations%rowtype;
  v_duration integer;
  v_service_name text;
  v_staff_name text;
  v_ends_at timestamptz;
  v_starts_local timestamp;
  v_ends_local timestamp;
  v_weekday smallint;
  v_work_start time;
  v_work_end time;
  v_status text;
begin
  select * into v_appointment
  from public.appointments
  where public_token = p_token
    and source = 'public'
  for update;

  if v_appointment.id is null then
    raise exception 'Réservation introuvable.';
  end if;

  if v_appointment.status not in ('pending','confirmed') then
    raise exception 'Cette réservation ne peut plus être déplacée en ligne.';
  end if;

  select * into v_organization
  from public.organizations
  where id = v_appointment.organization_id;

  if now() >= v_appointment.starts_at - make_interval(hours => v_organization.booking_cancel_notice_hours) then
    raise exception 'Le délai de modification en ligne est dépassé.';
  end if;

  if p_starts_at < now() + make_interval(hours => v_organization.booking_min_notice_hours) then
    raise exception 'Ce créneau est trop proche.';
  end if;

  if (p_starts_at at time zone v_organization.timezone)::date
      > (now() at time zone v_organization.timezone)::date + v_organization.booking_max_days_ahead then
    raise exception 'Ce créneau est trop éloigné.';
  end if;

  select s.duration_minutes, s.name
  into v_duration, v_service_name
  from public.services s
  where s.id = v_appointment.service_id
    and s.organization_id = v_appointment.organization_id
    and s.active = true;

  if v_duration is null then
    raise exception 'Cette prestation n’est plus disponible.';
  end if;

  select st.display_name into v_staff_name
  from public.staff st
  where st.id = p_staff_id
    and st.organization_id = v_appointment.organization_id
    and st.active = true;

  if v_staff_name is null then
    raise exception 'Le collaborateur sélectionné est indisponible.';
  end if;

  if not exists (
    select 1 from public.staff_services ss
    where ss.organization_id = v_appointment.organization_id
      and ss.staff_id = p_staff_id
      and ss.service_id = v_appointment.service_id
  ) then
    raise exception 'Ce collaborateur ne réalise pas cette prestation.';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_starts_local := p_starts_at at time zone v_organization.timezone;
  v_ends_local := v_ends_at at time zone v_organization.timezone;
  v_weekday := extract(isodow from v_starts_local)::smallint - 1;

  select h.start_time, h.end_time
  into v_work_start, v_work_end
  from public.staff_working_hours h
  where h.organization_id = v_appointment.organization_id
    and h.staff_id = p_staff_id
    and h.weekday = v_weekday;

  if v_work_start is null
     or v_starts_local::time < v_work_start
     or v_ends_local::time > v_work_end then
    raise exception 'Ce créneau est en dehors des horaires disponibles.';
  end if;

  if exists (
    select 1 from public.staff_breaks b
    where b.organization_id = v_appointment.organization_id
      and b.staff_id = p_staff_id
      and b.weekday = v_weekday
      and v_starts_local::time < b.end_time
      and v_ends_local::time > b.start_time
  ) then
    raise exception 'Ce créneau n’est plus disponible.';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.organization_id = v_appointment.organization_id
      and a.staff_id = p_staff_id
      and a.id <> v_appointment.id
      and a.status <> 'cancelled'
      and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'Ce créneau vient d’être réservé.';
  end if;

  v_status := case
    when v_organization.booking_confirmation_mode = 'manual' then 'pending'
    else 'confirmed'
  end;

  update public.appointments
  set staff_id = p_staff_id,
      starts_at = p_starts_at,
      ends_at = v_ends_at,
      status = v_status,
      cancelled_at = null,
      cancellation_reason = null
  where id = v_appointment.id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  values (v_appointment.organization_id, null, 'appointment.public_rescheduled', 'appointment', v_appointment.id::text);

  return jsonb_build_object(
    'appointment_id', v_appointment.id,
    'token', p_token,
    'status', v_status,
    'starts_at', p_starts_at,
    'ends_at', v_ends_at,
    'organization_name', v_organization.name,
    'organization_slug', v_organization.slug,
    'service_name', v_service_name,
    'staff_name', v_staff_name,
    'amount_cents', v_appointment.amount_cents
  );
exception
  when exclusion_violation then
    raise exception 'Ce créneau vient d’être réservé par une autre personne.';
end;
$$;

revoke all on function public.update_public_booking_settings(uuid,boolean,text,integer,integer,integer,integer,text) from public;
revoke all on function public.get_public_booking_page(text) from public;
revoke all on function public.get_public_available_slots(text,uuid,date,uuid) from public;
revoke all on function public.create_public_booking(text,uuid,uuid,timestamptz,text,text,text,text,text,text) from public;
revoke all on function public.get_public_booking(uuid) from public;
revoke all on function public.cancel_public_booking(uuid,text) from public;
revoke all on function public.reschedule_public_booking(uuid,uuid,timestamptz) from public;

grant execute on function public.update_public_booking_settings(uuid,boolean,text,integer,integer,integer,integer,text) to authenticated;
grant execute on function public.get_public_booking_page(text) to anon, authenticated;
grant execute on function public.get_public_available_slots(text,uuid,date,uuid) to anon, authenticated;
grant execute on function public.create_public_booking(text,uuid,uuid,timestamptz,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.get_public_booking(uuid) to anon, authenticated;
grant execute on function public.cancel_public_booking(uuid,text) to anon, authenticated;
grant execute on function public.reschedule_public_booking(uuid,uuid,timestamptz) to anon, authenticated;
