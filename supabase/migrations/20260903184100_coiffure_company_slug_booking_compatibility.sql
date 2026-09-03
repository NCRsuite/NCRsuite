create or replace function public.get_public_booking_page(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_catalog'
as $$
declare
  v_company_page jsonb;
  v_company jsonb;
  v_organization public.organizations%rowtype;
  v_services jsonb;
  v_staff jsonb;
  v_sites jsonb;
  v_has_commercial_branding boolean;
begin
  v_company_page := public.get_public_metier_coiffure_company_page(p_slug);
  if v_company_page is not null then
    v_company := v_company_page -> 'company';
    return jsonb_build_object(
      'organization', jsonb_build_object(
        'id', v_company ->> 'id',
        'name', v_company ->> 'name',
        'slug', v_company ->> 'public_slug',
        'primary_color', coalesce(v_company ->> 'primary_color','#2997ff'),
        'logo_url', v_company ->> 'logo_url',
        'banner_url', v_company ->> 'banner_url',
        'tagline', v_company ->> 'tagline',
        'address', coalesce((v_company_page -> 'sites' -> 0 ->> 'address'),''),
        'hours_text', v_company ->> 'hours_text',
        'practical_info', v_company ->> 'practical_info',
        'show_ncr_branding', coalesce((v_company ->> 'show_ncr_branding')::boolean,true),
        'timezone', coalesce((v_company_page -> 'sites' -> 0 ->> 'timezone'),'Europe/Paris')
      ),
      'settings', v_company_page -> 'settings',
      'sites', coalesce(v_company_page -> 'sites','[]'::jsonb),
      'services', coalesce(v_company_page -> 'services','[]'::jsonb),
      'staff', coalesce(v_company_page -> 'staff','[]'::jsonb)
    );
  end if;

  select * into v_organization
  from public.organizations
  where slug = lower(trim(p_slug))
    and status in ('trial','active')
    and business_type = 'coiffure'
    and booking_enabled = true;

  if v_organization.id is null then return null; end if;
  v_has_commercial_branding := v_organization.plan in ('professionnelle','metier');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'name',s.name,'address',s.address,'postal_code',s.postal_code,'city',s.city,
    'phone',s.phone,'email',s.email,'timezone',s.timezone,'is_primary',s.is_primary
  ) order by s.is_primary desc,s.name),'[]'::jsonb)
  into v_sites
  from public.organization_sites s
  where s.organization_id=v_organization.id and s.status='active' and v_organization.plan='metier';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'name',s.name,'description',s.description,'duration_minutes',s.duration_minutes,'price_cents',s.price_cents
  ) order by s.name),'[]'::jsonb)
  into v_services
  from public.services s
  where s.organization_id=v_organization.id and s.active=true
    and exists (
      select 1 from public.staff_services ss
      join public.staff st on st.organization_id=ss.organization_id and st.id=ss.staff_id and st.active=true
      where ss.organization_id=v_organization.id and ss.service_id=s.id
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',st.id,'display_name',st.display_name,'color',st.color,'site_id',st.site_id,
    'service_ids',coalesce((select jsonb_agg(ss.service_id order by ss.service_id) from public.staff_services ss where ss.organization_id=v_organization.id and ss.staff_id=st.id),'[]'::jsonb)
  ) order by st.display_name),'[]'::jsonb)
  into v_staff
  from public.staff st
  where st.organization_id=v_organization.id and st.active=true
    and (v_organization.plan<>'metier' or st.site_id is not null)
    and exists (select 1 from public.staff_working_hours h where h.organization_id=v_organization.id and h.staff_id=st.id);

  return jsonb_build_object(
    'organization',jsonb_build_object(
      'id',v_organization.id,
      'name',case when v_has_commercial_branding then coalesce(v_organization.public_name,v_organization.name) else v_organization.name end,
      'slug',v_organization.slug,
      'primary_color',coalesce(v_organization.primary_color,'#2997ff'),
      'logo_url',v_organization.logo_url,
      'banner_url',case when v_has_commercial_branding then v_organization.booking_banner_url else null end,
      'tagline',case when v_has_commercial_branding then v_organization.booking_tagline else null end,
      'address',case when v_has_commercial_branding then v_organization.booking_address else null end,
      'hours_text',case when v_has_commercial_branding then v_organization.booking_hours_text else null end,
      'practical_info',case when v_has_commercial_branding then v_organization.booking_practical_info else null end,
      'show_ncr_branding',case when v_has_commercial_branding then v_organization.show_ncr_branding else true end,
      'timezone',v_organization.timezone
    ),
    'settings',jsonb_build_object(
      'confirmation_mode',v_organization.booking_confirmation_mode,'slot_interval',v_organization.booking_slot_interval,
      'min_notice_hours',v_organization.booking_min_notice_hours,'max_days_ahead',v_organization.booking_max_days_ahead,
      'cancel_notice_hours',v_organization.booking_cancel_notice_hours,'welcome_text',v_organization.booking_welcome_text,
      'cancellation_policy',v_organization.booking_cancellation_policy,'privacy_notice',v_organization.booking_privacy_notice,
      'contact_email',v_organization.booking_contact_email,'contact_phone',v_organization.booking_contact_phone
    ),
    'sites',v_sites,'services',v_services,'staff',v_staff
  );
end;
$$;

create or replace function public.get_public_available_slots_v2(p_slug text,p_site_id uuid,p_service_id uuid,p_date date,p_staff_id uuid default null)
returns table(slot_start timestamptz,slot_end timestamptz,staff_id uuid,staff_name text)
language plpgsql
stable
security definer
set search_path to 'public','pg_catalog'
as $$
declare
  v_company_page jsonb;
  v_organization_id uuid;
  v_plan text;
  v_timezone text;
  v_interval integer;
  v_min_notice integer;
  v_max_days integer;
  v_duration integer;
  v_today date;
  v_weekday smallint;
begin
  v_company_page := public.get_public_metier_coiffure_company_page(p_slug);
  if v_company_page is not null then
    return query
    select s.slot_start,s.slot_end,s.staff_id,s.staff_name
    from public.get_public_metier_coiffure_company_slots(p_slug,p_site_id,p_service_id,p_date,p_staff_id) s;
    return;
  end if;

  select id,plan,timezone,booking_slot_interval,booking_min_notice_hours,booking_max_days_ahead
  into v_organization_id,v_plan,v_timezone,v_interval,v_min_notice,v_max_days
  from public.organizations
  where slug=lower(trim(p_slug)) and status in ('trial','active') and business_type='coiffure' and booking_enabled=true;
  if v_organization_id is null then return; end if;

  if v_plan='metier' and not exists (select 1 from public.organization_sites where id=p_site_id and organization_id=v_organization_id and status='active') then return; end if;
  if v_plan='metier' then select timezone into v_timezone from public.organization_sites where id=p_site_id and organization_id=v_organization_id and status='active'; end if;
  select duration_minutes into v_duration from public.services where id=p_service_id and organization_id=v_organization_id and active=true;
  if v_duration is null then return; end if;

  v_today := (now() at time zone v_timezone)::date;
  if p_date<v_today or p_date>v_today+v_max_days then return; end if;
  v_weekday := extract(isodow from p_date)::smallint-1;

  return query
  with candidates as (
    select st.id candidate_staff_id,st.display_name candidate_staff_name,local_start,local_start+make_interval(mins=>v_duration) local_end
    from public.staff st
    join public.staff_services ss on ss.organization_id=st.organization_id and ss.staff_id=st.id and ss.service_id=p_service_id
    join public.staff_working_hours h on h.organization_id=st.organization_id and h.staff_id=st.id and h.weekday=v_weekday
    cross join lateral generate_series(p_date+h.start_time,p_date+h.end_time-make_interval(mins=>v_duration),make_interval(mins=>v_interval)) gs(local_start)
    where st.organization_id=v_organization_id and st.active=true and (v_plan<>'metier' or st.site_id=p_site_id) and (p_staff_id is null or st.id=p_staff_id)
  )
  select c.local_start at time zone v_timezone,c.local_end at time zone v_timezone,c.candidate_staff_id,c.candidate_staff_name
  from candidates c
  where (c.local_start at time zone v_timezone)>=now()+make_interval(hours=>v_min_notice)
    and not exists (select 1 from public.staff_breaks b where b.organization_id=v_organization_id and b.staff_id=c.candidate_staff_id and b.weekday=v_weekday and c.local_start::time<b.end_time and c.local_end::time>b.start_time)
    and not exists (select 1 from public.appointments a where a.organization_id=v_organization_id and a.staff_id=c.candidate_staff_id and a.status<>'cancelled' and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(c.local_start at time zone v_timezone,c.local_end at time zone v_timezone,'[)'))
  order by slot_start,staff_name;
end;
$$;

create or replace function public.create_public_booking_v3(p_slug text,p_site_id uuid,p_service_id uuid,p_staff_id uuid,p_starts_at timestamptz,p_first_name text,p_last_name text,p_email text,p_phone text,p_notes text default null,p_website text default null,p_privacy_consent boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_catalog'
as $$
declare
  v_company_page jsonb;
  v_company_result jsonb;
  v_org_id uuid;
  v_plan text;
  v_result jsonb;
  v_appointment_id uuid;
  v_site_name text;
  v_site_address text;
  v_effective_website text:=p_website;
begin
  v_company_page := public.get_public_metier_coiffure_company_page(p_slug);
  if v_company_page is not null then
    v_company_result := public.create_public_metier_coiffure_company_booking(
      p_slug,p_site_id,p_service_id,p_staff_id,p_starts_at,p_first_name,p_last_name,p_email,p_phone,p_notes,p_website,p_privacy_consent
    );
    return v_company_result || jsonb_build_object(
      'organization_name',v_company_result->>'company_name',
      'organization_slug',v_company_result->>'company_slug'
    );
  end if;

  select id,plan into v_org_id,v_plan
  from public.organizations
  where slug=lower(trim(p_slug)) and business_type='coiffure' and status in ('trial','active') and coalesce(booking_enabled,false)
  limit 1;
  if v_org_id is null or not public.organization_has_plan_feature(v_org_id,'public_booking') then raise exception 'La réservation en ligne est indisponible.'; end if;

  if auth.uid() is not null and exists (select 1 from public.coiffure_client_portal_accounts a where a.organization_id=v_org_id and a.user_id=auth.uid() and a.status='active') then v_effective_website:=null; end if;

  if v_plan='metier' then
    select name,trim(concat_ws(' ',address,postal_code,city)) into v_site_name,v_site_address
    from public.organization_sites where id=p_site_id and organization_id=v_org_id and status='active';
    if v_site_name is null then raise exception 'Sélectionnez un établissement actif.'; end if;
    if not exists (select 1 from public.staff where id=p_staff_id and organization_id=v_org_id and site_id=p_site_id and active=true) then raise exception 'Le professionnel sélectionné n’est pas disponible dans cet établissement.'; end if;
  end if;

  v_result := public.create_public_booking_v2(p_slug,p_service_id,p_staff_id,p_starts_at,p_first_name,p_last_name,p_email,p_phone,p_notes,v_effective_website,p_privacy_consent);
  v_appointment_id := (v_result->>'appointment_id')::uuid;
  if v_plan='metier' then update public.appointments set site_id=p_site_id,updated_at=now() where id=v_appointment_id and organization_id=v_org_id; end if;
  return v_result || jsonb_build_object('site_id',case when v_plan='metier' then p_site_id else null end,'site_name',v_site_name,'site_address',nullif(v_site_address,''));
end;
$$;