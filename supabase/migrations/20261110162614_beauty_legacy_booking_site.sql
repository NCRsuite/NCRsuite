-- Targeted forward fix. Preserve verified client identity, grants and deferred scope guards.
-- No historical migration replay, data repair, policy or trigger modification.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.create_public_booking(text,uuid,uuid,timestamptz,text,text,text,text,text,text)') AND md5(prosrc)='ec8cc850ff767c1556115acf732d56e9' AND prosecdef) THEN
    RAISE EXCEPTION 'Legacy booking changed; review before applying.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('private.beauty_booking_client(uuid,uuid,text,text,text,text,uuid)') AND md5(prosrc)='c02686e0c3ac8a706ca2152ad32e7580') THEN
    RAISE EXCEPTION 'Verified identity protection changed; review before applying.';
  END IF;
END;
$preflight$;
CREATE OR REPLACE FUNCTION public.create_public_booking(p_slug text, p_service_id uuid, p_staff_id uuid, p_starts_at timestamp with time zone, p_first_name text, p_last_name text, p_email text, p_phone text, p_notes text DEFAULT NULL::text, p_website text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
declare
  v_organization public.organizations%rowtype;
  v_duration integer;
  v_amount integer;
  v_service_name text;
  v_staff_name text;
  v_site_id uuid;
  v_staff_company_id uuid;
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

  select st.display_name, st.site_id, st.company_id
  into v_staff_name, v_site_id, v_staff_company_id
  from public.staff st
  where st.id = p_staff_id
    and st.organization_id = v_organization.id
    and st.active = true;

  if v_staff_name is null then
    raise exception 'Le collaborateur sélectionné est indisponible.';
  end if;

  -- The legacy endpoint has no site parameter: use only the selected staff site.
  -- Never fall back to another company or an arbitrary primary establishment.
  if v_site_id is null or not exists (
    select 1 from public.organization_sites s
    where s.id = v_site_id
      and s.organization_id = v_organization.id
      and s.company_id is not distinct from v_staff_company_id
      and s.status = 'active'
  ) then
    raise exception 'L’établissement du collaborateur est indisponible.';
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

  v_client_id := private.beauty_booking_client(v_organization.id,(select company_id from public.staff where organization_id=v_organization.id and id=p_staff_id),v_first_name,v_last_name,v_email,v_phone,NULL);

  v_status := case
    when v_organization.booking_confirmation_mode = 'manual' then 'pending'
    else 'confirmed'
  end;

  insert into public.appointments (
    organization_id,
    client_id,
    service_id,
    staff_id,
    site_id,
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
    v_site_id,
    p_starts_at,
    v_ends_at,
    v_status,
    v_notes,
    v_amount,
    'public',
    null,
    v_token
  ) returning id into v_appointment_id;
  perform private.beauty_record_guest_booking(v_appointment_id);

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
$function$;

COMMIT;
