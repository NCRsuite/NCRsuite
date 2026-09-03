
create table if not exists public.appointment_service_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.organization_companies(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  staff_id uuid references public.staff(id) on delete set null,
  position smallint not null,
  service_name text not null,
  duration_minutes integer not null,
  price_cents integer not null,
  buffer_before_minutes integer not null default 0,
  buffer_after_minutes integer not null default 0,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint appointment_service_items_position_check check (position between 1 and 20),
  constraint appointment_service_items_duration_check check (duration_minutes > 0 and duration_minutes <= 1440),
  constraint appointment_service_items_price_check check (price_cents >= 0),
  constraint appointment_service_items_buffer_before_check check (buffer_before_minutes between 0 and 240),
  constraint appointment_service_items_buffer_after_check check (buffer_after_minutes between 0 and 240),
  constraint appointment_service_items_range_check check (ends_at > starts_at),
  constraint appointment_service_items_appointment_position_key unique (appointment_id, position),
  constraint appointment_service_items_appointment_service_key unique (appointment_id, service_id)
);

create index if not exists appointment_service_items_appointment_idx
  on public.appointment_service_items (appointment_id, position);
create index if not exists appointment_service_items_org_company_idx
  on public.appointment_service_items (organization_id, company_id, appointment_id);

alter table public.appointment_service_items enable row level security;

drop policy if exists appointment_service_items_select on public.appointment_service_items;
create policy appointment_service_items_select
on public.appointment_service_items
for select
to authenticated
using (
  exists (
    select 1
    from public.appointments a
    where a.id=appointment_id
      and a.organization_id=organization_id
      and public.can_access_appointment(a.organization_id,a.staff_id)
      and (
        company_id is null
        or public.metier_company_access_allows(organization_id,company_id)
      )
  )
);

revoke all on table public.appointment_service_items from anon;
revoke insert, update, delete, truncate, references, trigger on table public.appointment_service_items from authenticated;
grant select on table public.appointment_service_items to authenticated;
grant select,insert,update,delete on table public.appointment_service_items to service_role;

create or replace function public.get_public_metier_coiffure_company_multi_slots(
  p_slug text,
  p_site_id uuid,
  p_service_ids uuid[],
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
  v_interval integer;
  v_org_min_notice integer;
  v_org_max_days integer;
  v_effective_min_notice integer;
  v_effective_max_days integer;
  v_total_duration integer;
  v_buffer_before integer;
  v_buffer_after integer;
  v_weekday smallint;
  v_today date;
  v_requested_count integer;
  v_matched_count integer;
begin
  v_requested_count:=coalesce(cardinality(p_service_ids),0);
  if v_requested_count<1 or v_requested_count>6 then return; end if;
  if (select count(distinct service_id) from unnest(p_service_ids) service_id)<>v_requested_count then return; end if;

  select c.id,c.organization_id,s.timezone,o.booking_slot_interval,o.booking_min_notice_hours,o.booking_max_days_ahead
  into v_company_id,v_org_id,v_timezone,v_interval,v_org_min_notice,v_org_max_days
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  join public.organization_sites s
    on s.id=p_site_id and s.organization_id=c.organization_id and s.company_id=c.id and s.status='active'
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.booking_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and o.plan='metier'
    and o.status in ('trial','active')
  limit 1;
  if v_company_id is null or v_timezone is null then return; end if;

  select count(*),
         sum(s.duration_minutes)::integer,
         greatest(v_org_min_notice,coalesce(max(coalesce(s.booking_min_notice_hours,v_org_min_notice)),v_org_min_notice)),
         least(v_org_max_days,coalesce(min(coalesce(s.booking_max_days_ahead,v_org_max_days)),v_org_max_days))
  into v_matched_count,v_total_duration,v_effective_min_notice,v_effective_max_days
  from public.services s
  where s.organization_id=v_org_id
    and s.company_id=v_company_id
    and s.active=true
    and s.online_booking_enabled=true
    and s.id=any(p_service_ids);

  if v_matched_count<>v_requested_count or v_total_duration is null then return; end if;

  select coalesce(s.booking_buffer_before_minutes,0)
  into v_buffer_before
  from public.services s
  where s.organization_id=v_org_id and s.company_id=v_company_id and s.id=p_service_ids[1];

  select coalesce(s.booking_buffer_after_minutes,0)
  into v_buffer_after
  from public.services s
  where s.organization_id=v_org_id and s.company_id=v_company_id and s.id=p_service_ids[v_requested_count];

  v_today:=(now() at time zone v_timezone)::date;
  v_weekday:=extract(isodow from p_date)::smallint-1;
  if p_date<v_today or p_date>v_today+v_effective_max_days then return; end if;

  if exists (
    select 1
    from public.services s
    where s.organization_id=v_org_id
      and s.company_id=v_company_id
      and s.id=any(p_service_ids)
      and s.booking_weekdays is not null
      and not (v_weekday=any(s.booking_weekdays))
  ) then return; end if;

  return query
  with ordered_services as (
    select u.ord::smallint as position,
           s.id,
           s.duration_minutes,
           s.booking_start_time,
           s.booking_end_time,
           coalesce(
             sum(s.duration_minutes) over (
               order by u.ord
               rows between unbounded preceding and 1 preceding
             ),0
           )::integer as offset_minutes
    from unnest(p_service_ids) with ordinality u(service_id,ord)
    join public.services s
      on s.id=u.service_id
     and s.organization_id=v_org_id
     and s.company_id=v_company_id
  ),
  candidates as (
    select st.id as candidate_staff_id,
           st.display_name as candidate_staff_name,
           gs.local_start,
           gs.local_start+make_interval(mins=>v_total_duration) as local_end
    from public.staff st
    join public.staff_working_hours h
      on h.organization_id=st.organization_id
     and h.staff_id=st.id
     and h.weekday=v_weekday
    cross join lateral generate_series(
      p_date+h.start_time,
      p_date+h.end_time-make_interval(mins=>v_total_duration),
      make_interval(mins=>v_interval)
    ) gs(local_start)
    where st.organization_id=v_org_id
      and st.company_id=v_company_id
      and st.site_id=p_site_id
      and st.active=true
      and (p_staff_id is null or st.id=p_staff_id)
      and not exists (
        select 1
        from unnest(p_service_ids) sid(service_id)
        where not exists (
          select 1
          from public.staff_services ss
          where ss.organization_id=v_org_id
            and ss.staff_id=st.id
            and ss.service_id=sid.service_id
        )
      )
  )
  select c.local_start at time zone v_timezone,
         c.local_end at time zone v_timezone,
         c.candidate_staff_id,
         c.candidate_staff_name
  from candidates c
  where (c.local_start at time zone v_timezone)>=now()+make_interval(hours=>v_effective_min_notice)
    and c.local_start::date=p_date
    and c.local_end::date=p_date
    and (c.local_start-make_interval(mins=>v_buffer_before))::date=p_date
    and (c.local_end+make_interval(mins=>v_buffer_after))::date=p_date
    and exists (
      select 1
      from public.staff_working_hours h
      where h.organization_id=v_org_id
        and h.staff_id=c.candidate_staff_id
        and h.weekday=v_weekday
        and (c.local_start-make_interval(mins=>v_buffer_before))::time>=h.start_time
        and (c.local_end+make_interval(mins=>v_buffer_after))::time<=h.end_time
    )
    and not exists (
      select 1
      from ordered_services os
      where (os.booking_start_time is not null and (c.local_start+make_interval(mins=>os.offset_minutes))::time<os.booking_start_time)
         or (os.booking_end_time is not null and (c.local_start+make_interval(mins=>os.offset_minutes+os.duration_minutes))::time>os.booking_end_time)
    )
    and not exists (
      select 1
      from public.staff_breaks b
      where b.organization_id=v_org_id
        and b.staff_id=c.candidate_staff_id
        and b.weekday=v_weekday
        and (c.local_start-make_interval(mins=>v_buffer_before))::time<b.end_time
        and (c.local_end+make_interval(mins=>v_buffer_after))::time>b.start_time
    )
    and not exists (
      select 1
      from public.appointments a
      left join public.services booked_service
        on booked_service.id=a.service_id and booked_service.organization_id=a.organization_id
      where a.organization_id=v_org_id
        and a.staff_id=c.candidate_staff_id
        and a.status<>'cancelled'
        and tstzrange(
          a.starts_at-make_interval(mins=>coalesce(
            (select asi.buffer_before_minutes from public.appointment_service_items asi where asi.appointment_id=a.id order by asi.position limit 1),
            booked_service.booking_buffer_before_minutes,0
          )),
          a.ends_at+make_interval(mins=>coalesce(
            (select asi.buffer_after_minutes from public.appointment_service_items asi where asi.appointment_id=a.id order by asi.position desc limit 1),
            booked_service.booking_buffer_after_minutes,0
          )),
          '[)'
        ) && tstzrange(
          (c.local_start at time zone v_timezone)-make_interval(mins=>v_buffer_before),
          (c.local_end at time zone v_timezone)+make_interval(mins=>v_buffer_after),
          '[)'
        )
    )
    and not exists (
      select 1
      from public.beauty_availability_blocks blk
      where blk.organization_id=v_org_id
        and blk.company_id=v_company_id
        and blk.site_id=p_site_id
        and blk.active=true
        and (blk.staff_id is null or blk.staff_id=c.candidate_staff_id)
        and tstzrange(blk.starts_at,blk.ends_at,'[)') &&
            tstzrange(
              (c.local_start at time zone v_timezone)-make_interval(mins=>v_buffer_before),
              (c.local_end at time zone v_timezone)+make_interval(mins=>v_buffer_after),
              '[)'
            )
    )
  order by slot_start,staff_name;
end;
$function$;

create or replace function public.get_public_metier_coiffure_next_multi_slots(
  p_slug text,
  p_site_id uuid,
  p_service_ids uuid[],
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
  v_effective_max_days integer;
  v_today date;
  v_limit integer;
  v_requested_count integer;
  v_matched_count integer;
begin
  v_requested_count:=coalesce(cardinality(p_service_ids),0);
  if v_requested_count<1 or v_requested_count>6 then return; end if;
  if (select count(distinct service_id) from unnest(p_service_ids) service_id)<>v_requested_count then return; end if;

  select c.id,c.organization_id,s.timezone,o.booking_max_days_ahead
  into v_company_id,v_org_id,v_timezone,v_org_max_days
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  join public.organization_sites s
    on s.id=p_site_id and s.organization_id=c.organization_id and s.company_id=c.id and s.status='active'
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.booking_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and o.plan='metier'
    and o.status in ('trial','active')
  limit 1;
  if v_company_id is null then return; end if;

  select count(*),
         least(v_org_max_days,coalesce(min(coalesce(s.booking_max_days_ahead,v_org_max_days)),v_org_max_days))
  into v_matched_count,v_effective_max_days
  from public.services s
  where s.organization_id=v_org_id
    and s.company_id=v_company_id
    and s.active=true
    and s.online_booking_enabled=true
    and s.id=any(p_service_ids);
  if v_matched_count<>v_requested_count then return; end if;

  v_today:=(now() at time zone v_timezone)::date;
  v_limit:=least(greatest(coalesce(p_limit,3),1),12);

  return query
  with raw_slots as (
    select s.slot_start,s.slot_end,s.staff_id,s.staff_name
    from generate_series(v_today,v_today+v_effective_max_days,interval '1 day') d(day_value)
    cross join lateral public.get_public_metier_coiffure_company_multi_slots(
      p_slug,p_site_id,p_service_ids,d.day_value::date,p_staff_id
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

create or replace function public.create_public_metier_coiffure_company_booking_v2(
  p_slug text,
  p_site_id uuid,
  p_service_ids uuid[],
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
  v_requested_count integer;
  v_matched_count integer;
  v_total_duration integer;
  v_amount integer;
  v_service_names text[];
  v_service_label text;
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

  v_requested_count:=coalesce(cardinality(p_service_ids),0);
  if v_requested_count<1 or v_requested_count>6 then raise exception 'Sélectionnez entre 1 et 6 prestations.'; end if;
  if (select count(distinct service_id) from unnest(p_service_ids) service_id)<>v_requested_count then
    raise exception 'Une même prestation ne peut pas être ajoutée deux fois.';
  end if;

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

  with ordered as (
    select u.ord,s.*
    from unnest(p_service_ids) with ordinality u(service_id,ord)
    join public.services s
      on s.id=u.service_id
     and s.organization_id=v_company.organization_id
     and s.company_id=v_company.id
     and s.active=true
     and s.online_booking_enabled=true
  )
  select count(*),
         sum(duration_minutes)::integer,
         sum(price_cents)::integer,
         array_agg(name order by ord),
         string_agg(name,' + ' order by ord)
  into v_matched_count,v_total_duration,v_amount,v_service_names,v_service_label
  from ordered;

  if v_matched_count<>v_requested_count or v_total_duration is null then
    raise exception 'Une ou plusieurs prestations ne sont plus disponibles en ligne.';
  end if;

  select st.display_name into v_staff_name
  from public.staff st
  where st.id=p_staff_id
    and st.organization_id=v_company.organization_id
    and st.company_id=v_company.id
    and st.site_id=p_site_id
    and st.active=true;
  if v_staff_name is null then raise exception 'Le collaborateur sélectionné est indisponible.'; end if;

  if exists (
    select 1
    from unnest(p_service_ids) sid(service_id)
    where not exists (
      select 1 from public.staff_services ss
      where ss.organization_id=v_company.organization_id
        and ss.staff_id=p_staff_id
        and ss.service_id=sid.service_id
    )
  ) then raise exception 'Ce collaborateur ne réalise pas toutes les prestations sélectionnées.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_staff_id::text,0));

  select available.slot_end
  into v_ends_at
  from public.get_public_metier_coiffure_company_multi_slots(
    p_slug,p_site_id,p_service_ids,(p_starts_at at time zone v_timezone)::date,p_staff_id
  ) available
  where available.staff_id=p_staff_id
    and available.slot_start=p_starts_at
  limit 1;

  if v_ends_at is null then raise exception 'Ce créneau n’est plus disponible. Choisissez une autre heure.'; end if;

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
    v_company.organization_id,v_company.id,p_site_id,v_client_id,p_service_ids[1],p_staff_id,p_starts_at,v_ends_at,
    v_status,v_notes,v_amount,'public',null,v_token,now(),
    coalesce(nullif(trim(v_org.booking_privacy_notice),''),'Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre votre rendez-vous.')
  )
  returning id into v_appointment_id;

  with ordered as (
    select u.ord::smallint as position,
           s.id as service_id,
           s.name,
           s.duration_minutes,
           s.price_cents,
           coalesce(s.booking_buffer_before_minutes,0) as buffer_before_minutes,
           coalesce(s.booking_buffer_after_minutes,0) as buffer_after_minutes,
           coalesce(
             sum(s.duration_minutes) over (
               order by u.ord
               rows between unbounded preceding and 1 preceding
             ),0
           )::integer as offset_minutes
    from unnest(p_service_ids) with ordinality u(service_id,ord)
    join public.services s
      on s.id=u.service_id
     and s.organization_id=v_company.organization_id
     and s.company_id=v_company.id
  )
  insert into public.appointment_service_items(
    organization_id,company_id,appointment_id,service_id,staff_id,position,service_name,duration_minutes,price_cents,
    buffer_before_minutes,buffer_after_minutes,starts_at,ends_at
  )
  select v_company.organization_id,v_company.id,v_appointment_id,o.service_id,p_staff_id,o.position,o.name,o.duration_minutes,o.price_cents,
         o.buffer_before_minutes,o.buffer_after_minutes,
         p_starts_at+make_interval(mins=>o.offset_minutes),
         p_starts_at+make_interval(mins=>o.offset_minutes+o.duration_minutes)
  from ordered o
  order by o.position;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    v_company.organization_id,null,'appointment.public_company_created','appointment',v_appointment_id::text,
    jsonb_build_object(
      'company_id',v_company.id,
      'status',v_status,
      'service_ids',to_jsonb(p_service_ids),
      'service_count',v_requested_count
    )
  );

  return jsonb_build_object(
    'appointment_id',v_appointment_id,
    'token',v_token,
    'status',v_status,
    'starts_at',p_starts_at,
    'ends_at',v_ends_at,
    'company_name',v_company.name,
    'company_slug',v_company.public_slug,
    'service_name',v_service_label,
    'service_names',to_jsonb(v_service_names),
    'service_count',v_requested_count,
    'total_duration_minutes',v_total_duration,
    'staff_name',v_staff_name,
    'amount_cents',v_amount,
    'site_id',p_site_id,
    'site_name',v_site_name,
    'site_address',nullif(v_site_address,'')
  );
exception
  when exclusion_violation then
    raise exception 'Ce créneau vient d’être réservé par une autre personne.';
end;
$function$;

revoke all on function public.get_public_metier_coiffure_company_multi_slots(text,uuid,uuid[],date,uuid) from public;
revoke all on function public.get_public_metier_coiffure_next_multi_slots(text,uuid,uuid[],uuid,integer) from public;
revoke all on function public.create_public_metier_coiffure_company_booking_v2(text,uuid,uuid[],uuid,timestamptz,text,text,text,text,text,text,boolean) from public;

grant execute on function public.get_public_metier_coiffure_company_multi_slots(text,uuid,uuid[],date,uuid) to anon,authenticated,service_role;
grant execute on function public.get_public_metier_coiffure_next_multi_slots(text,uuid,uuid[],uuid,integer) to anon,authenticated,service_role;
grant execute on function public.create_public_metier_coiffure_company_booking_v2(text,uuid,uuid[],uuid,timestamptz,text,text,text,text,text,text,boolean) to anon,authenticated,service_role;
