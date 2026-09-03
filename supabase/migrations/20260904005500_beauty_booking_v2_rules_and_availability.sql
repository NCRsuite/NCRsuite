
alter table public.services
  add column if not exists online_booking_enabled boolean not null default true,
  add column if not exists booking_min_notice_hours integer,
  add column if not exists booking_max_days_ahead integer,
  add column if not exists booking_buffer_before_minutes integer not null default 0,
  add column if not exists booking_buffer_after_minutes integer not null default 0,
  add column if not exists booking_weekdays smallint[],
  add column if not exists booking_start_time time without time zone,
  add column if not exists booking_end_time time without time zone;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='services_booking_min_notice_check') then
    alter table public.services add constraint services_booking_min_notice_check
      check (booking_min_notice_hours is null or booking_min_notice_hours between 0 and 720);
  end if;
  if not exists (select 1 from pg_constraint where conname='services_booking_max_days_check') then
    alter table public.services add constraint services_booking_max_days_check
      check (booking_max_days_ahead is null or booking_max_days_ahead between 1 and 365);
  end if;
  if not exists (select 1 from pg_constraint where conname='services_booking_buffer_before_check') then
    alter table public.services add constraint services_booking_buffer_before_check
      check (booking_buffer_before_minutes between 0 and 240);
  end if;
  if not exists (select 1 from pg_constraint where conname='services_booking_buffer_after_check') then
    alter table public.services add constraint services_booking_buffer_after_check
      check (booking_buffer_after_minutes between 0 and 240);
  end if;
  if not exists (select 1 from pg_constraint where conname='services_booking_weekdays_check') then
    alter table public.services add constraint services_booking_weekdays_check
      check (
        booking_weekdays is null
        or (
          cardinality(booking_weekdays) between 1 and 7
          and booking_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
        )
      );
  end if;
  if not exists (select 1 from pg_constraint where conname='services_booking_time_window_check') then
    alter table public.services add constraint services_booking_time_window_check
      check (
        (booking_start_time is null and booking_end_time is null)
        or (
          booking_start_time is not null
          and booking_end_time is not null
          and booking_start_time < booking_end_time
        )
      );
  end if;
end $$;

create index if not exists services_company_online_booking_idx
  on public.services (organization_id, company_id, online_booking_enabled)
  where active=true;

create or replace function public.get_public_metier_coiffure_company_page(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_company public.organization_companies%rowtype;
  v_org public.organizations%rowtype;
  v_sites jsonb;
  v_services jsonb;
  v_staff jsonb;
  v_logo text;
  v_color text;
  v_brand_name text;
begin
  select c.* into v_company
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and o.plan='metier'
    and o.status in ('trial','active')
  limit 1;
  if v_company.id is null then return null; end if;

  select * into v_org from public.organizations where id=v_company.organization_id;
  select coalesce(b.logo_url,b.compact_logo_url),coalesce(b.primary_color,v_company.primary_color),b.name
  into v_logo,v_color,v_brand_name
  from public.organization_brands b
  where b.organization_id=v_company.organization_id and b.company_id=v_company.id and b.status='active'
  order by b.is_primary desc,b.created_at
  limit 1;
  v_logo := coalesce(v_company.logo_url,v_logo,v_org.logo_url);
  v_color := coalesce(v_company.primary_color,v_color,v_org.primary_color,'#2997ff');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'name',s.name,'address',s.address,'postal_code',s.postal_code,'city',s.city,
    'phone',coalesce(s.phone,v_company.phone),'email',coalesce(s.email,v_company.email),'timezone',s.timezone,'is_primary',s.is_primary
  ) order by s.is_primary desc,s.name),'[]'::jsonb)
  into v_sites
  from public.organization_sites s
  where s.organization_id=v_company.organization_id and s.company_id=v_company.id and s.status='active';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',sv.id,'name',sv.name,'description',sv.description,'duration_minutes',sv.duration_minutes,'price_cents',sv.price_cents,
    'image_url',sv.image_url,'category_name',nullif(trim(sv.category_name),''),
    'online_booking_enabled',sv.online_booking_enabled,
    'booking_min_notice_hours',sv.booking_min_notice_hours,
    'booking_max_days_ahead',sv.booking_max_days_ahead,
    'booking_buffer_before_minutes',sv.booking_buffer_before_minutes,
    'booking_buffer_after_minutes',sv.booking_buffer_after_minutes,
    'booking_weekdays',sv.booking_weekdays,
    'booking_start_time',sv.booking_start_time,
    'booking_end_time',sv.booking_end_time
  ) order by coalesce(nullif(trim(sv.category_name),''),'Autres'),sv.name),'[]'::jsonb)
  into v_services
  from public.services sv
  where sv.organization_id=v_company.organization_id and sv.company_id=v_company.id and sv.active=true
    and coalesce(sv.online_booking_enabled,true)=true
    and exists(
      select 1 from public.staff_services ss
      join public.staff st on st.organization_id=ss.organization_id and st.id=ss.staff_id and st.active=true and st.company_id=v_company.id
      where ss.organization_id=v_company.organization_id and ss.service_id=sv.id
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',st.id,'display_name',st.display_name,'color',st.color,'site_id',st.site_id,
    'service_ids',coalesce((select jsonb_agg(ss.service_id order by ss.service_id) from public.staff_services ss where ss.organization_id=st.organization_id and ss.staff_id=st.id),'[]'::jsonb)
  ) order by st.display_name),'[]'::jsonb)
  into v_staff
  from public.staff st
  where st.organization_id=v_company.organization_id and st.company_id=v_company.id and st.active=true
    and exists(select 1 from public.staff_working_hours h where h.organization_id=st.organization_id and h.staff_id=st.id);

  return jsonb_build_object(
    'company',jsonb_build_object(
      'id',v_company.id,'organization_id',v_company.organization_id,'name',coalesce(v_brand_name,v_company.name),
      'legal_name',v_company.legal_name,'public_slug',v_company.public_slug,'logo_url',v_logo,'primary_color',v_color,
      'tagline',v_company.public_tagline,'description',v_company.public_description,'banner_url',v_company.public_banner_url,
      'hours_text',v_company.public_hours_text,'practical_info',v_company.public_practical_info,
      'email',v_company.email,'phone',v_company.phone,'booking_enabled',v_company.booking_enabled,
      'show_ncr_branding',coalesce(v_org.show_ncr_branding,true)
    ),
    'settings',jsonb_build_object(
      'confirmation_mode',v_org.booking_confirmation_mode,'slot_interval',v_org.booking_slot_interval,
      'min_notice_hours',v_org.booking_min_notice_hours,'max_days_ahead',v_org.booking_max_days_ahead,
      'cancel_notice_hours',v_org.booking_cancel_notice_hours,'welcome_text',v_org.booking_welcome_text,
      'cancellation_policy',v_org.booking_cancellation_policy,'privacy_notice',v_org.booking_privacy_notice,
      'contact_email',coalesce(v_company.email,v_org.booking_contact_email),'contact_phone',coalesce(v_company.phone,v_org.booking_contact_phone)
    ),
    'sites',v_sites,'services',v_services,'staff',v_staff
  );
end;
$function$;

create or replace function public.get_public_metier_coiffure_company_slots_v2(
  p_slug text,
  p_site_id uuid,
  p_service_id uuid,
  p_date date,
  p_staff_id uuid default null
)
returns table(slot_start timestamptz,slot_end timestamptz,staff_id uuid,staff_name text)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_company_id uuid;
  v_org_id uuid;
  v_timezone text;
  v_org_min_notice integer;
  v_org_max_days integer;
  v_service_min_notice integer;
  v_service_max_days integer;
  v_buffer_before integer;
  v_buffer_after integer;
  v_weekdays smallint[];
  v_start_time time;
  v_end_time time;
  v_online boolean;
  v_effective_min_notice integer;
  v_effective_max_days integer;
  v_weekday smallint;
  v_today date;
begin
  select c.id,c.organization_id,o.booking_min_notice_hours,o.booking_max_days_ahead
  into v_company_id,v_org_id,v_org_min_notice,v_org_max_days
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.booking_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and o.plan='metier'
    and o.status in ('trial','active')
  limit 1;
  if v_company_id is null then return; end if;

  select s.timezone into v_timezone
  from public.organization_sites s
  where s.id=p_site_id
    and s.organization_id=v_org_id
    and s.company_id=v_company_id
    and s.status='active';
  if v_timezone is null then return; end if;

  select sv.online_booking_enabled,sv.booking_min_notice_hours,sv.booking_max_days_ahead,
         sv.booking_buffer_before_minutes,sv.booking_buffer_after_minutes,
         sv.booking_weekdays,sv.booking_start_time,sv.booking_end_time
  into v_online,v_service_min_notice,v_service_max_days,v_buffer_before,v_buffer_after,
       v_weekdays,v_start_time,v_end_time
  from public.services sv
  where sv.id=p_service_id
    and sv.organization_id=v_org_id
    and sv.company_id=v_company_id
    and sv.active=true;
  if not coalesce(v_online,false) then return; end if;

  v_effective_min_notice := greatest(v_org_min_notice,coalesce(v_service_min_notice,v_org_min_notice));
  v_effective_max_days := least(v_org_max_days,coalesce(v_service_max_days,v_org_max_days));
  v_buffer_before := coalesce(v_buffer_before,0);
  v_buffer_after := coalesce(v_buffer_after,0);
  v_today := (now() at time zone v_timezone)::date;
  v_weekday := extract(isodow from p_date)::smallint-1;

  if p_date<v_today or p_date>v_today+v_effective_max_days then return; end if;
  if v_weekdays is not null and not (v_weekday=any(v_weekdays)) then return; end if;

  return query
  select base.slot_start,base.slot_end,base.staff_id,base.staff_name
  from public.get_public_metier_coiffure_company_slots(p_slug,p_site_id,p_service_id,p_date,p_staff_id) base
  where base.slot_start>=now()+make_interval(hours=>v_effective_min_notice)
    and (
      v_start_time is null
      or (
        (base.slot_start at time zone v_timezone)::time>=v_start_time
        and (base.slot_end at time zone v_timezone)::time<=v_end_time
      )
    )
    and exists (
      select 1
      from public.staff_working_hours h
      where h.organization_id=v_org_id
        and h.staff_id=base.staff_id
        and h.weekday=v_weekday
        and ((base.slot_start-make_interval(mins=>v_buffer_before)) at time zone v_timezone)::date=p_date
        and ((base.slot_end+make_interval(mins=>v_buffer_after)) at time zone v_timezone)::date=p_date
        and ((base.slot_start-make_interval(mins=>v_buffer_before)) at time zone v_timezone)::time>=h.start_time
        and ((base.slot_end+make_interval(mins=>v_buffer_after)) at time zone v_timezone)::time<=h.end_time
    )
    and not exists (
      select 1
      from public.staff_breaks b
      where b.organization_id=v_org_id
        and b.staff_id=base.staff_id
        and b.weekday=v_weekday
        and ((base.slot_start-make_interval(mins=>v_buffer_before)) at time zone v_timezone)::time<b.end_time
        and ((base.slot_end+make_interval(mins=>v_buffer_after)) at time zone v_timezone)::time>b.start_time
    )
    and not exists (
      select 1
      from public.appointments a
      left join public.services booked_service
        on booked_service.id=a.service_id
       and booked_service.organization_id=a.organization_id
      where a.organization_id=v_org_id
        and a.staff_id=base.staff_id
        and a.status<>'cancelled'
        and tstzrange(
          a.starts_at-make_interval(mins=>coalesce(booked_service.booking_buffer_before_minutes,0)),
          a.ends_at+make_interval(mins=>coalesce(booked_service.booking_buffer_after_minutes,0)),
          '[)'
        ) && tstzrange(
          base.slot_start-make_interval(mins=>v_buffer_before),
          base.slot_end+make_interval(mins=>v_buffer_after),
          '[)'
        )
    )
  order by base.slot_start,base.staff_name;
end;
$function$;

create or replace function public.get_public_metier_coiffure_next_slots(
  p_slug text,
  p_site_id uuid,
  p_service_id uuid,
  p_staff_id uuid default null,
  p_limit integer default 3
)
returns table(slot_start timestamptz,slot_end timestamptz,staff_id uuid,staff_name text)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_company_id uuid;
  v_org_id uuid;
  v_timezone text;
  v_org_max_days integer;
  v_service_max_days integer;
  v_effective_max_days integer;
  v_today date;
  v_limit integer;
begin
  select c.id,c.organization_id,o.booking_max_days_ahead
  into v_company_id,v_org_id,v_org_max_days
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.booking_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and o.plan='metier'
    and o.status in ('trial','active')
  limit 1;
  if v_company_id is null then return; end if;

  select s.timezone into v_timezone
  from public.organization_sites s
  where s.id=p_site_id
    and s.organization_id=v_org_id
    and s.company_id=v_company_id
    and s.status='active';
  if v_timezone is null then return; end if;

  select sv.booking_max_days_ahead into v_service_max_days
  from public.services sv
  where sv.id=p_service_id
    and sv.organization_id=v_org_id
    and sv.company_id=v_company_id
    and sv.active=true
    and sv.online_booking_enabled=true;
  if not found then return; end if;

  v_effective_max_days:=least(v_org_max_days,coalesce(v_service_max_days,v_org_max_days));
  v_today:=(now() at time zone v_timezone)::date;
  v_limit:=least(greatest(coalesce(p_limit,3),1),12);

  return query
  with raw_slots as (
    select s.slot_start,s.slot_end,s.staff_id,s.staff_name
    from generate_series(v_today,v_today+v_effective_max_days,interval '1 day') d(day_value)
    cross join lateral public.get_public_metier_coiffure_company_slots_v2(
      p_slug,p_site_id,p_service_id,d.day_value::date,p_staff_id
    ) s
  ),
  unique_times as (
    select distinct on (r.slot_start)
      r.slot_start,r.slot_end,r.staff_id,r.staff_name
    from raw_slots r
    order by r.slot_start,r.staff_name
  )
  select u.slot_start,u.slot_end,u.staff_id,u.staff_name
  from unique_times u
  order by u.slot_start,u.staff_name
  limit v_limit;
end;
$function$;

create or replace function public.create_public_metier_coiffure_company_booking(
  p_slug text,
  p_site_id uuid,
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
set search_path = public, pg_catalog
as $function$
declare
  v_company public.organization_companies%rowtype;
  v_org public.organizations%rowtype;
  v_duration integer;
  v_amount integer;
  v_service_name text;
  v_staff_name text;
  v_site_name text;
  v_site_address text;
  v_timezone text;
  v_ends_at timestamptz;
  v_client_id uuid;
  v_appointment_id uuid;
  v_token uuid:=gen_random_uuid();
  v_status text;
  v_first_name text:=trim(coalesce(p_first_name,''));
  v_last_name text:=nullif(trim(coalesce(p_last_name,'')),'');
  v_email text:=nullif(lower(trim(coalesce(p_email,''))),'');
  v_phone text:=nullif(trim(coalesce(p_phone,'')),'');
  v_normalized_phone text;
  v_notes text:=nullif(trim(coalesce(p_notes,'')),'');
begin
  if not coalesce(p_privacy_consent,false) then raise exception 'Votre consentement est nécessaire pour enregistrer la réservation.'; end if;
  if nullif(trim(coalesce(p_website,'')),'') is not null then raise exception 'Réservation impossible.'; end if;

  select c.* into v_company
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.booking_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and o.plan='metier'
    and o.status in ('trial','active')
  limit 1;
  if v_company.id is null then raise exception 'La réservation en ligne est indisponible.'; end if;
  select * into v_org from public.organizations where id=v_company.organization_id;

  if char_length(v_first_name) not between 2 and 80 then raise exception 'Indiquez un prénom valide.'; end if;
  if v_last_name is not null and char_length(v_last_name)>100 then raise exception 'Le nom est trop long.'; end if;
  if v_email is null and v_phone is null then raise exception 'Indiquez une adresse e-mail ou un numéro de téléphone.'; end if;
  if v_email is not null and v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'L’adresse e-mail est invalide.'; end if;
  v_normalized_phone:=nullif(regexp_replace(coalesce(v_phone,''),'[^0-9+]','','g'),'');
  if v_phone is not null and char_length(v_normalized_phone)<8 then raise exception 'Le numéro de téléphone est invalide.'; end if;
  if v_notes is not null and char_length(v_notes)>1000 then raise exception 'Le message est trop long.'; end if;

  select s.name,trim(concat_ws(' ',s.address,s.postal_code,s.city)),s.timezone
  into v_site_name,v_site_address,v_timezone
  from public.organization_sites s
  where s.id=p_site_id
    and s.organization_id=v_company.organization_id
    and s.company_id=v_company.id
    and s.status='active';
  if v_site_name is null then raise exception 'Sélectionnez un lieu actif.'; end if;

  select sv.duration_minutes,sv.price_cents,sv.name
  into v_duration,v_amount,v_service_name
  from public.services sv
  where sv.id=p_service_id
    and sv.organization_id=v_company.organization_id
    and sv.company_id=v_company.id
    and sv.active=true
    and sv.online_booking_enabled=true;
  if v_duration is null then raise exception 'La prestation sélectionnée est indisponible en ligne.'; end if;

  select st.display_name into v_staff_name
  from public.staff st
  where st.id=p_staff_id
    and st.organization_id=v_company.organization_id
    and st.company_id=v_company.id
    and st.site_id=p_site_id
    and st.active=true;
  if v_staff_name is null then raise exception 'Le collaborateur sélectionné est indisponible.'; end if;
  if not exists(
    select 1 from public.staff_services ss
    where ss.organization_id=v_company.organization_id
      and ss.staff_id=p_staff_id
      and ss.service_id=p_service_id
  ) then raise exception 'Ce collaborateur ne réalise pas cette prestation.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_staff_id::text,0));

  if not exists (
    select 1
    from public.get_public_metier_coiffure_company_slots_v2(
      p_slug,p_site_id,p_service_id,(p_starts_at at time zone v_timezone)::date,p_staff_id
    ) available
    where available.staff_id=p_staff_id
      and available.slot_start=p_starts_at
  ) then
    raise exception 'Ce créneau n’est plus disponible. Choisissez une autre heure.';
  end if;

  v_ends_at:=p_starts_at+make_interval(mins=>v_duration);

  if (
    select count(*)
    from public.appointments a
    join public.clients c on c.organization_id=a.organization_id and c.id=a.client_id
    where a.organization_id=v_company.organization_id
      and a.company_id=v_company.id
      and a.source='public'
      and a.created_at>now()-interval '24 hours'
      and c.company_id=v_company.id
      and (
        (v_email is not null and lower(coalesce(c.email,''))=v_email)
        or (
          v_normalized_phone is not null
          and regexp_replace(coalesce(c.phone,''),'[^0-9+]','','g')=v_normalized_phone
        )
      )
  )>=5 then
    raise exception 'Trop de demandes ont été envoyées avec ces coordonnées. Réessayez plus tard.';
  end if;

  select c.id into v_client_id
  from public.clients c
  where c.organization_id=v_company.organization_id
    and c.company_id=v_company.id
    and (
      (v_email is not null and lower(coalesce(c.email,''))=v_email)
      or (
        v_normalized_phone is not null
        and regexp_replace(coalesce(c.phone,''),'[^0-9+]','','g')=v_normalized_phone
      )
    )
  order by case when c.status='active' then 0 else 1 end,c.created_at desc
  limit 1;

  if v_client_id is null then
    insert into public.clients(organization_id,company_id,first_name,last_name,email,phone,status,created_by)
    values(v_company.organization_id,v_company.id,v_first_name,v_last_name,v_email,v_phone,'active',null)
    returning id into v_client_id;
  else
    update public.clients
    set first_name=v_first_name,
        last_name=coalesce(v_last_name,last_name),
        email=coalesce(v_email,email),
        phone=coalesce(v_phone,phone),
        status='active',
        updated_at=now()
    where id=v_client_id
      and organization_id=v_company.organization_id
      and company_id=v_company.id;
  end if;

  v_status:=case when v_org.booking_confirmation_mode='manual' then 'pending' else 'confirmed' end;
  insert into public.appointments(
    organization_id,company_id,site_id,client_id,service_id,staff_id,starts_at,ends_at,status,notes,
    amount_cents,source,created_by,public_token,booking_consent_at,booking_consent_text
  )
  values(
    v_company.organization_id,v_company.id,p_site_id,v_client_id,p_service_id,p_staff_id,p_starts_at,v_ends_at,
    v_status,v_notes,v_amount,'public',null,v_token,now(),
    coalesce(nullif(trim(v_org.booking_privacy_notice),''),'Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre votre rendez-vous.')
  )
  returning id into v_appointment_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    v_company.organization_id,null,'appointment.public_company_created','appointment',v_appointment_id::text,
    jsonb_build_object('company_id',v_company.id,'status',v_status)
  );

  return jsonb_build_object(
    'appointment_id',v_appointment_id,'token',v_token,'status',v_status,
    'starts_at',p_starts_at,'ends_at',v_ends_at,'company_name',v_company.name,
    'company_slug',v_company.public_slug,'service_name',v_service_name,'staff_name',v_staff_name,
    'amount_cents',v_amount,'site_id',p_site_id,'site_name',v_site_name,'site_address',nullif(v_site_address,'')
  );
exception
  when exclusion_violation then
    raise exception 'Ce créneau vient d’être réservé par une autre personne.';
end;
$function$;

create or replace function public.get_public_available_slots_v2(
  p_slug text,
  p_site_id uuid,
  p_service_id uuid,
  p_date date,
  p_staff_id uuid default null
)
returns table(slot_start timestamptz,slot_end timestamptz,staff_id uuid,staff_name text)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $function$
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
    from public.get_public_metier_coiffure_company_slots_v2(p_slug,p_site_id,p_service_id,p_date,p_staff_id) s;
    return;
  end if;

  select id,plan,timezone,booking_slot_interval,booking_min_notice_hours,booking_max_days_ahead
  into v_organization_id,v_plan,v_timezone,v_interval,v_min_notice,v_max_days
  from public.organizations
  where slug=lower(trim(p_slug)) and status in ('trial','active') and business_type='coiffure' and booking_enabled=true;
  if v_organization_id is null then return; end if;

  if v_plan='metier' and not exists (
    select 1 from public.organization_sites
    where id=p_site_id and organization_id=v_organization_id and status='active'
  ) then return; end if;
  if v_plan='metier' then
    select timezone into v_timezone
    from public.organization_sites
    where id=p_site_id and organization_id=v_organization_id and status='active';
  end if;

  select duration_minutes into v_duration
  from public.services
  where id=p_service_id and organization_id=v_organization_id and active=true;
  if v_duration is null then return; end if;

  v_today := (now() at time zone v_timezone)::date;
  if p_date<v_today or p_date>v_today+v_max_days then return; end if;
  v_weekday := extract(isodow from p_date)::smallint-1;

  return query
  with candidates as (
    select st.id candidate_staff_id,st.display_name candidate_staff_name,
           local_start,local_start+make_interval(mins=>v_duration) local_end
    from public.staff st
    join public.staff_services ss
      on ss.organization_id=st.organization_id and ss.staff_id=st.id and ss.service_id=p_service_id
    join public.staff_working_hours h
      on h.organization_id=st.organization_id and h.staff_id=st.id and h.weekday=v_weekday
    cross join lateral generate_series(
      p_date+h.start_time,
      p_date+h.end_time-make_interval(mins=>v_duration),
      make_interval(mins=>v_interval)
    ) gs(local_start)
    where st.organization_id=v_organization_id
      and st.active=true
      and (v_plan<>'metier' or st.site_id=p_site_id)
      and (p_staff_id is null or st.id=p_staff_id)
  )
  select c.local_start at time zone v_timezone,c.local_end at time zone v_timezone,
         c.candidate_staff_id,c.candidate_staff_name
  from candidates c
  where (c.local_start at time zone v_timezone)>=now()+make_interval(hours=>v_min_notice)
    and not exists (
      select 1 from public.staff_breaks b
      where b.organization_id=v_organization_id
        and b.staff_id=c.candidate_staff_id
        and b.weekday=v_weekday
        and c.local_start::time<b.end_time
        and c.local_end::time>b.start_time
    )
    and not exists (
      select 1 from public.appointments a
      where a.organization_id=v_organization_id
        and a.staff_id=c.candidate_staff_id
        and a.status<>'cancelled'
        and tstzrange(a.starts_at,a.ends_at,'[)') &&
            tstzrange(c.local_start at time zone v_timezone,c.local_end at time zone v_timezone,'[)')
    )
  order by slot_start,staff_name;
end;
$function$;

revoke all on function public.get_public_metier_coiffure_company_page(text) from public;
revoke all on function public.get_public_metier_coiffure_company_slots_v2(text,uuid,uuid,date,uuid) from public;
revoke all on function public.get_public_metier_coiffure_next_slots(text,uuid,uuid,uuid,integer) from public;
revoke all on function public.create_public_metier_coiffure_company_booking(text,uuid,uuid,uuid,timestamptz,text,text,text,text,text,text,boolean) from public;
revoke all on function public.get_public_available_slots_v2(text,uuid,uuid,date,uuid) from public;

grant execute on function public.get_public_metier_coiffure_company_page(text) to anon,authenticated,service_role;
grant execute on function public.get_public_metier_coiffure_company_slots_v2(text,uuid,uuid,date,uuid) to anon,authenticated,service_role;
grant execute on function public.get_public_metier_coiffure_next_slots(text,uuid,uuid,uuid,integer) to anon,authenticated,service_role;
grant execute on function public.create_public_metier_coiffure_company_booking(text,uuid,uuid,uuid,timestamptz,text,text,text,text,text,text,boolean) to anon,authenticated,service_role;
grant execute on function public.get_public_available_slots_v2(text,uuid,uuid,date,uuid) to anon,authenticated,service_role;
