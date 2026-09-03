
create or replace function public.reschedule_public_booking_v3(
  p_token uuid,
  p_site_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_appointment public.appointments%rowtype;
  v_org public.organizations%rowtype;
  v_company public.organization_companies%rowtype;
  v_service_ids uuid[];
  v_item_count integer;
  v_timezone text;
  v_ends_at timestamptz;
  v_staff_name text;
  v_status text;
  v_service_label text;
begin
  select * into v_appointment
  from public.appointments
  where public_token=p_token and source='public'
  for update;

  if v_appointment.id is null then raise exception 'Réservation introuvable.'; end if;

  select * into v_org from public.organizations where id=v_appointment.organization_id;
  if not public.plan_feature_enabled(v_org.plan,'online_booking_management') then
    raise exception 'La modification en ligne n’est pas incluse dans la formule de cet établissement.';
  end if;
  if v_appointment.status not in ('pending','confirmed') then
    raise exception 'Cette réservation ne peut plus être déplacée en ligne.';
  end if;
  if now()>=v_appointment.starts_at-make_interval(hours=>v_org.booking_cancel_notice_hours) then
    raise exception 'Le délai de modification en ligne est dépassé.';
  end if;

  select count(*)::integer,array_agg(asi.service_id order by asi.position)
  into v_item_count,v_service_ids
  from public.appointment_service_items asi
  where asi.appointment_id=v_appointment.id;

  if coalesce(v_item_count,0)=0 then
    return public.reschedule_public_booking_v2(p_token,p_site_id,p_staff_id,p_starts_at);
  end if;

  if p_site_id is distinct from v_appointment.site_id then
    raise exception 'Le déplacement doit rester dans l’établissement initial.';
  end if;

  select * into v_company
  from public.organization_companies
  where id=v_appointment.company_id
    and organization_id=v_appointment.organization_id
    and status='active';
  if v_company.id is null or v_company.public_slug is null then
    raise exception 'L’enseigne de cette réservation est indisponible.';
  end if;

  select s.timezone into v_timezone
  from public.organization_sites s
  where s.id=p_site_id
    and s.organization_id=v_appointment.organization_id
    and s.company_id=v_company.id
    and s.status='active';
  if v_timezone is null then raise exception 'L’établissement est indisponible.'; end if;

  select st.display_name into v_staff_name
  from public.staff st
  where st.id=p_staff_id
    and st.organization_id=v_appointment.organization_id
    and st.company_id=v_company.id
    and st.site_id=p_site_id
    and st.active=true;
  if v_staff_name is null then raise exception 'Ce professionnel n’est pas disponible dans cet établissement.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_staff_id::text,0));

  update public.appointments
  set status='cancelled'
  where id=v_appointment.id;

  select available.slot_end
  into v_ends_at
  from public.get_public_metier_coiffure_company_multi_slots(
    v_company.public_slug,
    p_site_id,
    v_service_ids,
    (p_starts_at at time zone v_timezone)::date,
    p_staff_id
  ) available
  where available.staff_id=p_staff_id
    and available.slot_start=p_starts_at
  limit 1;

  if v_ends_at is null then
    raise exception 'Ce créneau n’est plus disponible. Choisissez une autre heure.';
  end if;

  v_status:=case when v_org.booking_confirmation_mode='manual' then 'pending' else 'confirmed' end;

  update public.appointments
  set staff_id=p_staff_id,
      starts_at=p_starts_at,
      ends_at=v_ends_at,
      status=v_status,
      cancelled_at=null,
      cancellation_reason=null,
      updated_at=now()
  where id=v_appointment.id;

  with ordered as (
    select asi.id,
           asi.position,
           asi.price_cents,
           s.name,
           s.duration_minutes,
           coalesce(s.booking_buffer_before_minutes,0) buffer_before_minutes,
           coalesce(s.booking_buffer_after_minutes,0) buffer_after_minutes,
           coalesce(
             sum(s.duration_minutes) over (
               order by asi.position
               rows between unbounded preceding and 1 preceding
             ),0
           )::integer offset_minutes
    from public.appointment_service_items asi
    join public.services s
      on s.id=asi.service_id
     and s.organization_id=asi.organization_id
     and s.company_id=asi.company_id
     and s.active=true
     and s.online_booking_enabled=true
    where asi.appointment_id=v_appointment.id
  )
  update public.appointment_service_items asi
  set staff_id=p_staff_id,
      service_name=o.name,
      duration_minutes=o.duration_minutes,
      buffer_before_minutes=o.buffer_before_minutes,
      buffer_after_minutes=o.buffer_after_minutes,
      starts_at=p_starts_at+make_interval(mins=>o.offset_minutes),
      ends_at=p_starts_at+make_interval(mins=>o.offset_minutes+o.duration_minutes)
  from ordered o
  where asi.id=o.id;

  select string_agg(asi.service_name,' + ' order by asi.position)
  into v_service_label
  from public.appointment_service_items asi
  where asi.appointment_id=v_appointment.id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    v_appointment.organization_id,null,'appointment.public_rescheduled','appointment',v_appointment.id::text,
    jsonb_build_object('company_id',v_company.id,'service_count',v_item_count)
  );

  return jsonb_build_object(
    'appointment_id',v_appointment.id,
    'token',p_token,
    'status',v_status,
    'starts_at',p_starts_at,
    'ends_at',v_ends_at,
    'organization_name',v_org.name,
    'organization_slug',v_org.slug,
    'company_slug',v_company.public_slug,
    'service_name',v_service_label,
    'staff_name',v_staff_name,
    'amount_cents',v_appointment.amount_cents
  );
exception
  when exclusion_violation then
    raise exception 'Ce créneau vient d’être réservé par une autre personne.';
end;
$function$;

create or replace function public.get_public_booking(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'appointment_id',a.id,
    'token',a.public_token,
    'status',a.status,
    'starts_at',a.starts_at,
    'ends_at',a.ends_at,
    'notes',a.notes,
    'amount_cents',a.amount_cents,
    'organization_name',coalesce(company.name,case when o.plan in ('professionnelle','metier') then coalesce(o.public_name,o.name) else o.name end),
    'organization_slug',o.slug,
    'company_slug',company.public_slug,
    'primary_color',coalesce(company.primary_color,case when o.plan in ('professionnelle','metier') then o.primary_color else '#2997ff' end),
    'logo_url',coalesce(company.logo_url,case when o.plan in ('professionnelle','metier') then o.logo_url else null end),
    'banner_url',case when company.id is not null then company.public_banner_url when o.plan in ('professionnelle','metier') then o.booking_banner_url else null end,
    'organization_address',case when o.plan in ('professionnelle','metier') then o.booking_address else null end,
    'organization_hours_text',coalesce(company.public_hours_text,case when o.plan in ('professionnelle','metier') then o.booking_hours_text else null end),
    'organization_practical_info',coalesce(company.public_practical_info,case when o.plan in ('professionnelle','metier') then o.booking_practical_info else null end),
    'site_id',a.site_id,
    'site_name',site.name,
    'site_address',nullif(trim(concat_ws(' ',site.address,site.postal_code,site.city)),''),
    'show_ncr_branding',case when o.plan in ('professionnelle','metier') then o.show_ncr_branding else true end,
    'timezone',coalesce(site.timezone,o.timezone),
    'cancel_notice_hours',o.booking_cancel_notice_hours,
    'service_id',s.id,
    'service_name',coalesce(
      (select string_agg(asi.service_name,' + ' order by asi.position) from public.appointment_service_items asi where asi.appointment_id=a.id),
      s.name
    ),
    'service_duration_minutes',coalesce(
      (select sum(asi.duration_minutes)::integer from public.appointment_service_items asi where asi.appointment_id=a.id),
      s.duration_minutes
    ),
    'service_items',coalesce(
      (select jsonb_agg(jsonb_build_object(
        'service_id',asi.service_id,
        'service_name',asi.service_name,
        'position',asi.position,
        'duration_minutes',asi.duration_minutes,
        'price_cents',asi.price_cents,
        'starts_at',asi.starts_at,
        'ends_at',asi.ends_at
      ) order by asi.position) from public.appointment_service_items asi where asi.appointment_id=a.id),
      jsonb_build_array(jsonb_build_object(
        'service_id',s.id,
        'service_name',s.name,
        'position',1,
        'duration_minutes',s.duration_minutes,
        'price_cents',coalesce(a.amount_cents,s.price_cents),
        'starts_at',a.starts_at,
        'ends_at',a.ends_at
      ))
    ),
    'service_count',greatest(1,(select count(*)::integer from public.appointment_service_items asi where asi.appointment_id=a.id)),
    'staff_id',st.id,
    'staff_name',st.display_name,
    'client_name',trim(concat_ws(' ',c.first_name,c.last_name)),
    'client_email',c.email,
    'client_phone',c.phone,
    'contact_email',coalesce(site.email,company.email,o.booking_contact_email),
    'contact_phone',coalesce(site.phone,company.phone,o.booking_contact_phone),
    'cancellation_policy',o.booking_cancellation_policy,
    'privacy_notice',o.booking_privacy_notice,
    'online_management_enabled',public.plan_feature_enabled(o.plan,'online_booking_management'),
    'calendar_links_enabled',public.plan_feature_enabled(o.plan,'calendar_links'),
    'can_cancel',(
      public.plan_feature_enabled(o.plan,'online_booking_management')
      and a.status in ('pending','confirmed')
      and now()<a.starts_at-make_interval(hours=>o.booking_cancel_notice_hours)
    ),
    'can_reschedule',(
      public.plan_feature_enabled(o.plan,'online_booking_management')
      and a.status in ('pending','confirmed')
      and now()<a.starts_at-make_interval(hours=>o.booking_cancel_notice_hours)
    )
  ) into v_result
  from public.appointments a
  join public.organizations o on o.id=a.organization_id
  join public.clients c on c.organization_id=a.organization_id and c.id=a.client_id
  join public.services s on s.organization_id=a.organization_id and s.id=a.service_id
  join public.staff st on st.organization_id=a.organization_id and st.id=a.staff_id
  left join public.organization_sites site on site.organization_id=a.organization_id and site.id=a.site_id
  left join public.organization_companies company on company.organization_id=a.organization_id and company.id=a.company_id
  where a.public_token=p_token and a.source='public';

  if v_result is not null then
    update public.appointments set customer_manage_last_seen_at=now() where public_token=p_token;
  end if;
  return v_result;
end;
$function$;

revoke all on function public.reschedule_public_booking_v3(uuid,uuid,uuid,timestamptz) from public;
grant execute on function public.reschedule_public_booking_v3(uuid,uuid,uuid,timestamptz) to anon,authenticated,service_role;
