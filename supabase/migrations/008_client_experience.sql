-- NCR Suite V1.8.0 — expérience client, consentement et calendrier
begin;

alter table public.organizations
  add column if not exists booking_cancellation_policy text,
  add column if not exists booking_privacy_notice text;

update public.organizations
set booking_cancellation_policy = coalesce(
      nullif(trim(booking_cancellation_policy), ''),
      'Toute modification ou annulation doit être effectuée avant le délai indiqué. Au-delà, contactez directement l’établissement.'
    ),
    booking_privacy_notice = coalesce(
      nullif(trim(booking_privacy_notice), ''),
      'Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre votre rendez-vous.'
    )
where booking_cancellation_policy is null
   or booking_privacy_notice is null;

alter table public.organizations
  alter column booking_cancellation_policy set default 'Toute modification ou annulation doit être effectuée avant le délai indiqué. Au-delà, contactez directement l’établissement.',
  alter column booking_privacy_notice set default 'Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre votre rendez-vous.';

alter table public.organizations
  drop constraint if exists organizations_booking_cancellation_policy_check,
  add constraint organizations_booking_cancellation_policy_check
    check (booking_cancellation_policy is null or char_length(booking_cancellation_policy) <= 1500),
  drop constraint if exists organizations_booking_privacy_notice_check,
  add constraint organizations_booking_privacy_notice_check
    check (booking_privacy_notice is null or char_length(booking_privacy_notice) <= 2000);

alter table public.appointments
  add column if not exists booking_consent_at timestamptz,
  add column if not exists booking_consent_text text;

create or replace function public.update_client_experience_settings(
  p_organization_id uuid,
  p_cancellation_policy text,
  p_privacy_notice text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cancellation text := nullif(trim(coalesce(p_cancellation_policy, '')), '');
  v_privacy text := nullif(trim(coalesce(p_privacy_notice, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  if v_cancellation is not null and char_length(v_cancellation) > 1500 then
    raise exception 'La politique d’annulation est trop longue.';
  end if;

  if v_privacy is not null and char_length(v_privacy) > 2000 then
    raise exception 'Le texte de confidentialité est trop long.';
  end if;

  update public.organizations
  set booking_cancellation_policy = coalesce(v_cancellation, 'Toute modification ou annulation doit être effectuée avant le délai indiqué. Au-delà, contactez directement l’établissement.'),
      booking_privacy_notice = coalesce(v_privacy, 'Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre votre rendez-vous.'),
      updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  values (p_organization_id, auth.uid(), 'booking.client_experience_updated', 'organization', p_organization_id::text);
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
      'welcome_text', v_organization.booking_welcome_text,
      'cancellation_policy', v_organization.booking_cancellation_policy,
      'privacy_notice', v_organization.booking_privacy_notice,
      'contact_email', v_organization.booking_contact_email,
      'contact_phone', v_organization.booking_contact_phone
    ),
    'services', v_services,
    'staff', v_staff
  );
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
    'contact_email', o.booking_contact_email,
    'contact_phone', o.booking_contact_phone,
    'cancellation_policy', o.booking_cancellation_policy,
    'privacy_notice', o.booking_privacy_notice,
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

create or replace function public.create_public_booking_v2(
  p_slug text,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_notes text default null,
  p_website text default null,
  p_privacy_consent boolean default false
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
  if not coalesce(p_privacy_consent, false) then
    raise exception 'Votre consentement est nécessaire pour enregistrer la réservation.';
  end if;

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
    public_token,
    booking_consent_at,
    booking_consent_text
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
$$;

create or replace function public.appointment_email_payload(p_appointment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'appointment_id', a.id,
    'status', a.status,
    'source', a.source,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'amount_cents', a.amount_cents,
    'notes', a.notes,
    'cancellation_reason', a.cancellation_reason,
    'public_token', a.public_token,
    'organization_name', o.name,
    'organization_slug', o.slug,
    'organization_timezone', o.timezone,
    'organization_primary_color', o.primary_color,
    'organization_logo_url', o.logo_url,
    'contact_email', o.booking_contact_email,
    'contact_phone', o.booking_contact_phone,
    'cancellation_policy', o.booking_cancellation_policy,
    'client_name', trim(concat_ws(' ', c.first_name, c.last_name)),
    'client_first_name', c.first_name,
    'client_email', c.email,
    'client_phone', c.phone,
    'service_name', s.name,
    'service_duration_minutes', s.duration_minutes,
    'staff_name', st.display_name
  )
  from public.appointments a
  join public.organizations o on o.id = a.organization_id
  join public.clients c
    on c.organization_id = a.organization_id
   and c.id = a.client_id
  join public.services s
    on s.organization_id = a.organization_id
   and s.id = a.service_id
  join public.staff st
    on st.organization_id = a.organization_id
   and st.id = a.staff_id
  where a.id = p_appointment_id;
$$;

revoke all on function public.update_client_experience_settings(uuid,text,text) from public;
grant execute on function public.update_client_experience_settings(uuid,text,text) to authenticated;

revoke all on function public.create_public_booking(text,uuid,uuid,timestamptz,text,text,text,text,text,text) from anon, authenticated;
revoke all on function public.create_public_booking_v2(text,uuid,uuid,timestamptz,text,text,text,text,text,text,boolean) from public;
grant execute on function public.create_public_booking_v2(text,uuid,uuid,timestamptz,text,text,text,text,text,text,boolean) to anon, authenticated;

commit;
