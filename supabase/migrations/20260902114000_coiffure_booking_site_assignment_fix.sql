-- Coiffure booking — assign a valid site before appointment insert.
-- Découverte: use the staff site when available, otherwise the primary active site.
-- Métier: v3 preserves the explicitly selected site.

create or replace function public.create_public_booking_v2(
  p_slug text,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamp with time zone,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_notes text default null::text,
  p_website text default null::text,
  p_privacy_consent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public,pg_catalog
as $function$
declare
  v_organization public.organizations%rowtype;
  v_duration integer;
  v_amount integer;
  v_service_name text;
  v_staff_name text;
  v_site_id uuid;
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
  if not coalesce(p_privacy_consent, false) then
    raise exception 'Votre consentement est nécessaire pour enregistrer la réservation.';
  end if;

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

  select st.display_name, st.site_id
  into v_staff_name, v_site_id
  from public.staff st
  where st.id = p_staff_id
    and st.organization_id = v_organization.id
    and st.active = true;

  if v_staff_name is null then
    raise exception 'Le collaborateur sélectionné est indisponible.';
  end if;

  if v_site_id is null then
    select s.id into v_site_id
    from public.organization_sites s
    where s.organization_id = v_organization.id
      and s.status = 'active'
    order by s.is_primary desc, s.name, s.id
    limit 1;
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
    site_id,
    starts_at,
    ends_at,
    status,
    notes,
    amount_cents,
    source,
    created_by,
    public_token,
    booking_consent_at,
    booking_consent_text
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
    v_token,
    now(),
    coalesce(
      nullif(trim(v_organization.booking_privacy_notice), ''),
      'Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre votre rendez-vous.'
    )
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
$function$;

create or replace function public.create_public_booking_v3(
  p_slug text,
  p_site_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamp with time zone,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_notes text default null::text,
  p_website text default null::text,
  p_privacy_consent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public,pg_catalog
as $function$
declare
  v_org_id uuid;
  v_plan text;
  v_result jsonb;
  v_appointment_id uuid;
  v_site_name text;
  v_site_address text;
  v_effective_website text := p_website;
begin
  select id, plan into v_org_id, v_plan
  from public.organizations
  where slug = lower(trim(p_slug))
    and business_type = 'coiffure'
    and status in ('trial','active')
    and coalesce(booking_enabled, false)
  limit 1;

  if v_org_id is null or not public.organization_has_plan_feature(v_org_id, 'public_booking') then
    raise exception 'La réservation en ligne est indisponible.';
  end if;

  if auth.uid() is not null and exists (
    select 1
    from public.coiffure_client_portal_accounts a
    where a.organization_id = v_org_id
      and a.user_id = auth.uid()
      and a.status = 'active'
  ) then
    v_effective_website := null;
  end if;

  if v_plan = 'metier' then
    select name, trim(concat_ws(' ', address, postal_code, city))
    into v_site_name, v_site_address
    from public.organization_sites
    where id = p_site_id and organization_id = v_org_id and status = 'active';

    if v_site_name is null then raise exception 'Sélectionnez un établissement actif.'; end if;

    if not exists (
      select 1 from public.staff
      where id = p_staff_id and organization_id = v_org_id and site_id = p_site_id and active = true
    ) then raise exception 'Le professionnel sélectionné n’est pas disponible dans cet établissement.'; end if;
  end if;

  v_result := public.create_public_booking_v2(
    p_slug, p_service_id, p_staff_id, p_starts_at, p_first_name, p_last_name,
    p_email, p_phone, p_notes, v_effective_website, p_privacy_consent
  );

  v_appointment_id := (v_result ->> 'appointment_id')::uuid;

  if v_plan = 'metier' then
    update public.appointments
    set site_id = p_site_id,
        updated_at = now()
    where id = v_appointment_id and organization_id = v_org_id;
  end if;

  return v_result || jsonb_build_object(
    'site_id', case when v_plan = 'metier' then p_site_id else null end,
    'site_name', v_site_name,
    'site_address', nullif(v_site_address, '')
  );
end;
$function$;
