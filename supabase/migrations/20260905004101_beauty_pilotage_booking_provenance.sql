alter table public.appointments
  add column if not exists booking_origin text not null default 'unknown',
  add column if not exists booking_origin_detail text,
  add column if not exists booking_origin_meta jsonb not null default '{}'::jsonb;

alter table public.appointments drop constraint if exists appointments_booking_origin_check;
alter table public.appointments add constraint appointments_booking_origin_check
check (booking_origin in (
  'unknown','internal_agenda','shared_reception','public_page','client_portal',
  'referral','qr_code','widget','direct_link','import'
));

create index if not exists appointments_company_origin_start_idx
  on public.appointments(organization_id,company_id,booking_origin,starts_at desc);

create or replace function private.beauty_set_default_booking_origin()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $function$
begin
  if new.booking_origin is null or new.booking_origin='unknown' then
    new.booking_origin:=case when new.source='public' then 'public_page' else 'internal_agenda' end;
  end if;
  return new;
end;
$function$;

drop trigger if exists beauty_appointment_default_booking_origin on public.appointments;
create trigger beauty_appointment_default_booking_origin
before insert on public.appointments
for each row execute function private.beauty_set_default_booking_origin();

create or replace function private.beauty_referral_booking_origin_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
begin
  if new.appointment_id is not null and new.status in ('pending','qualified') then
    update public.appointments
    set booking_origin='referral',
        booking_origin_detail='Parrainage client',
        booking_origin_meta=coalesce(booking_origin_meta,'{}'::jsonb)
          || jsonb_build_object('referral_id',new.id,'referral_code_id',new.referral_code_id),
        updated_at=now()
    where id=new.appointment_id
      and organization_id=new.organization_id
      and company_id=new.company_id;
  end if;
  return new;
end;
$function$;

drop trigger if exists beauty_referral_booking_origin on public.beauty_referrals;
create trigger beauty_referral_booking_origin
after insert or update of appointment_id,status on public.beauty_referrals
for each row execute function private.beauty_referral_booking_origin_trigger();

create or replace function private.tag_public_beauty_booking_origin(
  p_token uuid,
  p_origin text,
  p_detail text default null,
  p_meta jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
declare
  v_updated integer;
begin
  if p_token is null then return false; end if;
  if p_origin not in ('public_page','qr_code','widget','direct_link') then
    raise exception 'Canal de réservation invalide.';
  end if;
  if p_meta is null or jsonb_typeof(p_meta)<>'object' then
    raise exception 'Métadonnées de provenance invalides.';
  end if;

  update public.appointments a
  set booking_origin=p_origin,
      booking_origin_detail=left(nullif(trim(coalesce(p_detail,'')),''),120),
      booking_origin_meta=coalesce(a.booking_origin_meta,'{}'::jsonb) || p_meta,
      updated_at=now()
  where a.public_token=p_token
    and a.source='public'
    and a.company_id is not null
    and a.booking_origin in ('unknown','public_page','qr_code','widget','direct_link');

  get diagnostics v_updated=row_count;
  return v_updated>0;
end;
$function$;

create or replace function public.tag_public_beauty_booking_origin(
  p_token uuid,
  p_origin text,
  p_detail text default null,
  p_meta jsonb default '{}'::jsonb
)
returns boolean
language sql
security invoker
set search_path=public,private,pg_catalog
as $function$
  select private.tag_public_beauty_booking_origin(p_token,p_origin,p_detail,p_meta);
$function$;

revoke all on function private.tag_public_beauty_booking_origin(uuid,text,text,jsonb) from public;
grant execute on function private.tag_public_beauty_booking_origin(uuid,text,text,jsonb) to anon,authenticated,service_role;
revoke all on function public.tag_public_beauty_booking_origin(uuid,text,text,jsonb) from public;
grant execute on function public.tag_public_beauty_booking_origin(uuid,text,text,jsonb) to anon,authenticated,service_role;

create or replace function public.create_coiffure_client_portal_booking_v2(
  p_account_id uuid,
  p_site_id uuid,
  p_service_ids uuid[],
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_notes text default null,
  p_privacy_consent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $function$
declare
  v_account public.coiffure_client_portal_accounts%rowtype;
  v_client public.clients%rowtype;
  v_company public.organization_companies%rowtype;
  v_result jsonb;
  v_appointment_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;

  select * into v_account
  from public.coiffure_client_portal_accounts
  where id=p_account_id and user_id=auth.uid() and status='active';

  if v_account.id is null or not public.is_coiffure_client_portal_account(p_account_id) then
    raise exception 'Accès client refusé.';
  end if;

  select * into v_client
  from public.clients
  where organization_id=v_account.organization_id and id=v_account.client_id and status='active';
  if v_client.id is null then raise exception 'Votre dossier client est indisponible.'; end if;

  select * into v_company
  from public.organization_companies oc
  where oc.organization_id=v_account.organization_id
    and oc.status='active'
    and oc.public_page_enabled=true
    and (
      oc.id=v_client.company_id
      or (
        v_client.company_id is null
        and 1=(select count(*) from public.organization_companies only_company
               where only_company.organization_id=v_account.organization_id and only_company.status='active')
      )
    )
  order by oc.is_primary desc,oc.created_at
  limit 1;

  if v_company.id is null or v_company.public_slug is null then
    raise exception 'La page de réservation de votre enseigne est indisponible.';
  end if;

  v_result:=public.create_public_metier_coiffure_company_booking_v2(
    v_company.public_slug,p_site_id,p_service_ids,p_staff_id,p_starts_at,
    v_client.first_name,v_client.last_name,v_client.email,v_client.phone,p_notes,null,p_privacy_consent
  );

  v_appointment_id:=nullif(v_result->>'appointment_id','')::uuid;
  if v_appointment_id is not null then
    update public.appointments
    set booking_origin='client_portal',
        booking_origin_detail='Espace client Beauty',
        booking_origin_meta=coalesce(booking_origin_meta,'{}'::jsonb)
          || jsonb_build_object('portal_account_id',p_account_id),
        updated_at=now()
    where id=v_appointment_id
      and organization_id=v_account.organization_id
      and company_id=v_company.id;
  end if;

  return v_result;
end;
$function$;

create or replace function public.metier_reception_save_appointment(
  p_organization_id uuid,
  p_company_id uuid,
  p_site_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_client_id uuid default null,
  p_client_first_name text default null,
  p_client_last_name text default null,
  p_client_email text default null,
  p_client_phone text default null,
  p_starts_at timestamptz default null,
  p_status text default 'confirmed',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_catalog
as $function$
declare
  v_client_id uuid := p_client_id;
  v_duration integer;
  v_price integer;
  v_staff_site uuid;
  v_id uuid;
begin
  if auth.uid() is null or not public.metier_shared_reception_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Accès accueil partagé non autorisé.';
  end if;
  if p_starts_at is null then raise exception 'Date du rendez-vous requise.'; end if;
  if p_status not in ('pending','confirmed') then raise exception 'Statut de rendez-vous invalide.'; end if;
  if not exists(select 1 from public.organization_companies where organization_id=p_organization_id and id=p_company_id and status='active' and booking_enabled=true) then
    raise exception 'Enseigne indisponible pour les rendez-vous.';
  end if;
  if not exists(select 1 from public.organization_sites where organization_id=p_organization_id and id=p_site_id and company_id=p_company_id and status='active') then
    raise exception 'Adresse invalide pour cette enseigne.';
  end if;

  select duration_minutes,price_cents into v_duration,v_price
  from public.services
  where organization_id=p_organization_id and id=p_service_id and company_id=p_company_id and active=true;
  if v_duration is null then raise exception 'Prestation invalide pour cette enseigne.'; end if;

  select site_id into v_staff_site
  from public.staff
  where organization_id=p_organization_id and id=p_staff_id and company_id=p_company_id and active=true;
  if not found then raise exception 'Collaborateur invalide pour cette enseigne.'; end if;
  if v_staff_site is not null and v_staff_site<>p_site_id then
    raise exception 'Ce collaborateur n’est pas affecté à ce lieu.';
  end if;
  if not exists(select 1 from public.staff_services where organization_id=p_organization_id and staff_id=p_staff_id and service_id=p_service_id) then
    raise exception 'Ce collaborateur ne réalise pas cette prestation.';
  end if;

  if v_client_id is null then
    if nullif(trim(coalesce(p_client_first_name,'')),'') is null then raise exception 'Nom du client requis.'; end if;
    insert into public.clients(organization_id,company_id,first_name,last_name,email,phone,status,created_by)
    values(
      p_organization_id,p_company_id,trim(p_client_first_name),
      nullif(trim(coalesce(p_client_last_name,'')),''),
      nullif(lower(trim(coalesce(p_client_email,''))),''),
      nullif(trim(coalesce(p_client_phone,'')),''),
      'active',auth.uid()
    )
    returning id into v_client_id;
  elsif not exists(
    select 1 from public.clients
    where organization_id=p_organization_id and id=v_client_id and company_id=p_company_id and status='active'
  ) then
    raise exception 'Client introuvable dans cette enseigne.';
  end if;

  insert into public.appointments(
    organization_id,company_id,site_id,client_id,service_id,staff_id,starts_at,ends_at,status,notes,
    amount_cents,source,created_by,booking_origin,booking_origin_detail
  )
  values(
    p_organization_id,p_company_id,p_site_id,v_client_id,p_service_id,p_staff_id,p_starts_at,
    p_starts_at+make_interval(mins=>v_duration),p_status,nullif(trim(coalesce(p_notes,'')),''),
    v_price,'internal',auth.uid(),'shared_reception','Accueil partagé'
  )
  returning id into v_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'appointment.created','appointment',v_id::text,
    jsonb_build_object('company_id',p_company_id,'site_id',p_site_id,'booking_origin','shared_reception')
  );

  return v_id;
exception when exclusion_violation then
  raise exception 'Ce collaborateur a déjà un rendez-vous sur ce créneau.';
end;
$function$;

create or replace function private.beauty_pilot_dashboard(
  p_organization_id uuid,
  p_company_id uuid,
  p_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
declare
  v_timezone text;
  v_days integer;
  v_end_date date;
  v_start_date date;
  v_prev_start date;
  v_current_start timestamptz;
  v_current_end timestamptz;
  v_prev_start_ts timestamptz;
  v_prev_end_ts timestamptz;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour consulter le pilotage.';
  end if;

  select o.timezone into v_timezone
  from public.organizations o
  join public.organization_companies c on c.organization_id=o.id
  where o.id=p_organization_id and c.id=p_company_id and c.status='active'
    and o.business_type='coiffure' and o.plan='metier';
  if v_timezone is null then raise exception 'Enseigne Beauty introuvable.'; end if;

  v_days:=case when p_days in (7,30,90,365) then p_days else 30 end;
  v_end_date:=(now() at time zone v_timezone)::date + 1;
  v_start_date:=v_end_date-v_days;
  v_prev_start:=v_start_date-v_days;
  v_current_start:=v_start_date::timestamp at time zone v_timezone;
  v_current_end:=v_end_date::timestamp at time zone v_timezone;
  v_prev_start_ts:=v_prev_start::timestamp at time zone v_timezone;
  v_prev_end_ts:=v_start_date::timestamp at time zone v_timezone;

  with current_appts as (
    select a.* from public.appointments a
    where a.organization_id=p_organization_id and a.company_id=p_company_id
      and a.starts_at>=v_current_start and a.starts_at<v_current_end
  ),
  prev_appts as (
    select a.* from public.appointments a
    where a.organization_id=p_organization_id and a.company_id=p_company_id
      and a.starts_at>=v_prev_start_ts and a.starts_at<v_prev_end_ts
  ),
  current_summary as (
    select count(*)::int as total,
      count(*) filter(where status='completed')::int as completed,
      count(*) filter(where status='cancelled')::int as cancelled,
      count(*) filter(where status='no_show')::int as no_show,
      count(*) filter(where status in ('pending','confirmed'))::int as upcoming_or_active,
      coalesce(sum(amount_cents) filter(where status='completed'),0)::bigint as revenue_cents,
      coalesce(avg(amount_cents) filter(where status='completed'),0)::numeric as avg_basket_cents,
      count(distinct client_id) filter(where status<>'cancelled')::int as unique_clients,
      coalesce(sum(extract(epoch from (ends_at-starts_at))/60) filter(where status<>'cancelled'),0)::numeric as booked_minutes
    from current_appts
  ),
  prev_summary as (
    select count(*)::int as total,
      count(*) filter(where status='completed')::int as completed,
      count(*) filter(where status='cancelled')::int as cancelled,
      count(*) filter(where status='no_show')::int as no_show,
      coalesce(sum(amount_cents) filter(where status='completed'),0)::bigint as revenue_cents,
      coalesce(avg(amount_cents) filter(where status='completed'),0)::numeric as avg_basket_cents
    from prev_appts
  ),
  first_appointment as (
    select a.client_id,min(a.starts_at) as first_at
    from public.appointments a
    where a.organization_id=p_organization_id and a.company_id=p_company_id and a.status<>'cancelled'
    group by a.client_id
  ),
  acquisition as (
    select
      count(distinct ca.client_id) filter(where fa.first_at>=v_current_start and fa.first_at<v_current_end and ca.status<>'cancelled')::int as new_clients,
      count(distinct ca.client_id) filter(where fa.first_at<v_current_start and ca.status<>'cancelled')::int as returning_clients
    from current_appts ca join first_appointment fa on fa.client_id=ca.client_id
  ),
  capacity_days as (
    select d::date as work_date,st.id as staff_id,st.site_id,wh.start_time,wh.end_time,
      greatest(0,
        extract(epoch from (wh.end_time-wh.start_time))/60
        - coalesce((
          select sum(extract(epoch from (br.end_time-br.start_time))/60)
          from public.staff_breaks br
          where br.organization_id=p_organization_id and br.staff_id=st.id and br.weekday=wh.weekday
        ),0)
        - coalesce((
          select sum(greatest(0,extract(epoch from (
            least((blk.ends_at at time zone v_timezone),d::date+wh.end_time)
            - greatest((blk.starts_at at time zone v_timezone),d::date+wh.start_time)
          ))/60))
          from public.beauty_availability_blocks blk
          where blk.organization_id=p_organization_id and blk.company_id=p_company_id and blk.active=true
            and blk.site_id=st.site_id and (blk.staff_id is null or blk.staff_id=st.id)
            and (blk.starts_at at time zone v_timezone)<d::date+wh.end_time
            and (blk.ends_at at time zone v_timezone)>d::date+wh.start_time
        ),0)
      ) as available_minutes
    from generate_series(v_start_date,v_end_date-1,interval '1 day') d
    join public.staff st on st.organization_id=p_organization_id and st.company_id=p_company_id and st.active=true
    join public.staff_working_hours wh on wh.organization_id=p_organization_id and wh.staff_id=st.id
      and wh.weekday=(extract(isodow from d)::int-1)
  ),
  capacity as (
    select coalesce(sum(available_minutes),0)::numeric as available_minutes from capacity_days
  ),
  daily as (
    select d::date as day,
      count(a.id) filter(where a.status<>'cancelled')::int as appointments,
      count(a.id) filter(where a.status='completed')::int as completed,
      coalesce(sum(a.amount_cents) filter(where a.status='completed'),0)::bigint as revenue_cents
    from generate_series(v_start_date,v_end_date-1,interval '1 day') d
    left join current_appts a on (a.starts_at at time zone v_timezone)::date=d::date
    group by d::date order by d::date
  ),
  source_rows as (
    select
      case
        when exists(
          select 1 from public.beauty_referrals br
          where br.appointment_id=a.id and br.organization_id=p_organization_id and br.company_id=p_company_id
            and br.status in ('pending','qualified')
        ) then 'referral'
        else coalesce(nullif(a.booking_origin,'unknown'),case when a.source='public' then 'public_page' else 'internal_agenda' end)
      end as origin,
      count(*)::int as appointments,
      coalesce(sum(a.amount_cents) filter(where a.status='completed'),0)::bigint as revenue_cents
    from current_appts a where a.status<>'cancelled'
    group by 1
  ),
  service_lines as (
    select a.id as appointment_id,a.status,asi.service_id,asi.service_name,asi.price_cents,asi.duration_minutes
    from current_appts a
    join public.appointment_service_items asi
      on asi.organization_id=p_organization_id and asi.company_id=p_company_id and asi.appointment_id=a.id
    union all
    select a.id,a.status,s.id,s.name,s.price_cents,s.duration_minutes
    from current_appts a
    join public.services s on s.id=a.service_id and s.organization_id=p_organization_id and s.company_id=p_company_id
    where not exists(select 1 from public.appointment_service_items asi where asi.appointment_id=a.id)
  ),
  service_stats as (
    select service_id,service_name,
      count(*) filter(where status<>'cancelled')::int as appointments,
      count(*) filter(where status='completed')::int as completed,
      coalesce(sum(price_cents) filter(where status='completed'),0)::bigint as revenue_cents,
      coalesce(sum(duration_minutes) filter(where status<>'cancelled'),0)::bigint as booked_minutes
    from service_lines group by service_id,service_name
    order by revenue_cents desc,appointments desc limit 8
  ),
  staff_stats as (
    select st.id,st.display_name as name,
      count(a.id) filter(where a.status<>'cancelled')::int as appointments,
      count(a.id) filter(where a.status='completed')::int as completed,
      coalesce(sum(a.amount_cents) filter(where a.status='completed'),0)::bigint as revenue_cents,
      coalesce(sum(extract(epoch from (a.ends_at-a.starts_at))/60) filter(where a.status<>'cancelled'),0)::bigint as booked_minutes
    from public.staff st
    left join current_appts a on a.staff_id=st.id
    where st.organization_id=p_organization_id and st.company_id=p_company_id and st.active=true
    group by st.id,st.display_name
    order by revenue_cents desc,appointments desc limit 8
  ),
  peak_hours as (
    select extract(hour from (a.starts_at at time zone v_timezone))::int as hour,count(*)::int as appointments
    from current_appts a where a.status<>'cancelled'
    group by 1 order by appointments desc,hour
  ),
  weekday_stats as (
    select extract(isodow from (a.starts_at at time zone v_timezone))::int as weekday,
      count(*)::int as appointments,
      coalesce(sum(a.amount_cents) filter(where a.status='completed'),0)::bigint as revenue_cents
    from current_appts a where a.status<>'cancelled'
    group by 1 order by weekday
  )
  select jsonb_build_object(
    'company',jsonb_build_object('id',c.id,'name',c.name),
    'period',jsonb_build_object(
      'days',v_days,'start_date',v_start_date,'end_date',v_end_date-1,
      'previous_start_date',v_prev_start,'previous_end_date',v_start_date-1
    ),
    'summary',jsonb_build_object(
      'appointments_total',cs.total,'completed',cs.completed,'cancelled',cs.cancelled,'no_show',cs.no_show,
      'upcoming_or_active',cs.upcoming_or_active,'revenue_cents',cs.revenue_cents,'average_basket_cents',round(cs.avg_basket_cents),
      'unique_clients',cs.unique_clients,'new_clients',acq.new_clients,'returning_clients',acq.returning_clients,
      'booked_minutes',round(cs.booked_minutes),'available_minutes',round(cap.available_minutes),
      'occupancy_rate',case when cap.available_minutes>0 then round(least(100,(cs.booked_minutes/cap.available_minutes)*100),1) else 0 end,
      'cancellation_rate',case when cs.total>0 then round((cs.cancelled::numeric/cs.total)*100,1) else 0 end,
      'no_show_rate',case when cs.total>0 then round((cs.no_show::numeric/cs.total)*100,1) else 0 end
    ),
    'previous',jsonb_build_object(
      'appointments_total',ps.total,'completed',ps.completed,'cancelled',ps.cancelled,'no_show',ps.no_show,
      'revenue_cents',ps.revenue_cents,'average_basket_cents',round(ps.avg_basket_cents)
    ),
    'changes',jsonb_build_object(
      'revenue_pct',case when ps.revenue_cents>0 then round(((cs.revenue_cents-ps.revenue_cents)::numeric/ps.revenue_cents)*100,1) when cs.revenue_cents>0 then 100 else 0 end,
      'completed_pct',case when ps.completed>0 then round(((cs.completed-ps.completed)::numeric/ps.completed)*100,1) when cs.completed>0 then 100 else 0 end,
      'average_basket_pct',case when ps.avg_basket_cents>0 then round(((cs.avg_basket_cents-ps.avg_basket_cents)/ps.avg_basket_cents)*100,1) when cs.avg_basket_cents>0 then 100 else 0 end
    ),
    'daily',coalesce((select jsonb_agg(jsonb_build_object('date',day,'appointments',appointments,'completed',completed,'revenue_cents',revenue_cents) order by day) from daily),'[]'::jsonb),
    'sources',coalesce((select jsonb_agg(jsonb_build_object('origin',origin,'appointments',appointments,'revenue_cents',revenue_cents) order by appointments desc,origin) from source_rows),'[]'::jsonb),
    'top_services',coalesce((select jsonb_agg(to_jsonb(s) order by s.revenue_cents desc,s.appointments desc) from service_stats s),'[]'::jsonb),
    'top_staff',coalesce((select jsonb_agg(to_jsonb(s) order by s.revenue_cents desc,s.appointments desc) from staff_stats s),'[]'::jsonb),
    'peak_hours',coalesce((select jsonb_agg(jsonb_build_object('hour',hour,'appointments',appointments) order by appointments desc,hour) from peak_hours),'[]'::jsonb),
    'weekdays',coalesce((select jsonb_agg(jsonb_build_object('weekday',weekday,'appointments',appointments,'revenue_cents',revenue_cents) order by weekday) from weekday_stats),'[]'::jsonb)
  ) into v_result
  from public.organization_companies c
  cross join current_summary cs
  cross join prev_summary ps
  cross join acquisition acq
  cross join capacity cap
  where c.id=p_company_id and c.organization_id=p_organization_id;

  return v_result;
end;
$function$;

create or replace function public.beauty_pilot_dashboard(
  p_organization_id uuid,
  p_company_id uuid,
  p_days integer default 30
)
returns jsonb
language sql
security invoker
set search_path=public,private,pg_catalog
as $function$
  select private.beauty_pilot_dashboard(p_organization_id,p_company_id,p_days);
$function$;

revoke all on function private.beauty_pilot_dashboard(uuid,uuid,integer) from public,anon;
grant execute on function private.beauty_pilot_dashboard(uuid,uuid,integer) to authenticated,service_role;
revoke all on function public.beauty_pilot_dashboard(uuid,uuid,integer) from public,anon;
grant execute on function public.beauty_pilot_dashboard(uuid,uuid,integer) to authenticated,service_role;

update public.appointments
set booking_origin=case when source='public' then 'public_page' else 'internal_agenda' end
where booking_origin='unknown';