
create table if not exists public.beauty_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  site_id uuid not null references public.organization_sites(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete cascade,
  kind text not null,
  label text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beauty_availability_blocks_kind_check check (kind in ('closure','leave','block')),
  constraint beauty_availability_blocks_range_check check (ends_at > starts_at)
);

create index if not exists beauty_availability_blocks_scope_idx
  on public.beauty_availability_blocks (organization_id, company_id, site_id, starts_at, ends_at)
  where active=true;

create index if not exists beauty_availability_blocks_staff_idx
  on public.beauty_availability_blocks (organization_id, staff_id, starts_at, ends_at)
  where active=true and staff_id is not null;

alter table public.beauty_availability_blocks enable row level security;

drop policy if exists beauty_availability_blocks_select on public.beauty_availability_blocks;
create policy beauty_availability_blocks_select
on public.beauty_availability_blocks
for select
to authenticated
using (public.metier_company_access_allows(organization_id, company_id));

drop policy if exists beauty_availability_blocks_manage on public.beauty_availability_blocks;
create policy beauty_availability_blocks_manage
on public.beauty_availability_blocks
for all
to authenticated
using (
  public.metier_company_access_allows(organization_id, company_id)
  and public.has_org_role(organization_id, array['owner','admin','manager'])
)
with check (
  public.metier_company_access_allows(organization_id, company_id)
  and public.has_org_role(organization_id, array['owner','admin','manager'])
);

drop trigger if exists beauty_availability_blocks_touch_updated_at on public.beauty_availability_blocks;
create trigger beauty_availability_blocks_touch_updated_at
before update on public.beauty_availability_blocks
for each row execute function public.set_updated_at();

create or replace function public.save_beauty_availability_block(
  p_organization_id uuid,
  p_company_id uuid,
  p_site_id uuid,
  p_staff_id uuid,
  p_kind text,
  p_label text,
  p_starts_local timestamp without time zone,
  p_ends_local timestamp without time zone,
  p_all_day boolean default false,
  p_block_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_timezone text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_id uuid;
  v_label text := nullif(trim(coalesce(p_label,'')),'');
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;
  if not public.metier_company_access_allows(p_organization_id,p_company_id) then
    raise exception 'Cette enseigne n’est pas accessible.';
  end if;
  if p_kind not in ('closure','leave','block') then
    raise exception 'Type d’indisponibilité invalide.';
  end if;
  if p_kind='leave' and p_staff_id is null then
    raise exception 'Sélectionnez le collaborateur concerné par ce congé.';
  end if;
  if p_starts_local is null or p_ends_local is null or p_ends_local<=p_starts_local then
    raise exception 'La période d’indisponibilité est invalide.';
  end if;
  if p_ends_local-p_starts_local > interval '370 days' then
    raise exception 'La période est trop longue.';
  end if;
  if v_label is not null and char_length(v_label)>160 then
    raise exception 'Le libellé est trop long.';
  end if;

  select s.timezone into v_timezone
  from public.organization_sites s
  where s.id=p_site_id
    and s.organization_id=p_organization_id
    and s.company_id=p_company_id
    and s.status='active';
  if v_timezone is null then raise exception 'Le lieu sélectionné est introuvable ou inactif.'; end if;

  if p_staff_id is not null and not exists (
    select 1 from public.staff st
    where st.id=p_staff_id
      and st.organization_id=p_organization_id
      and st.company_id=p_company_id
      and st.site_id=p_site_id
      and st.active=true
  ) then
    raise exception 'Le collaborateur sélectionné n’appartient pas à ce lieu de l’enseigne.';
  end if;

  v_starts_at := p_starts_local at time zone v_timezone;
  v_ends_at := p_ends_local at time zone v_timezone;

  if p_block_id is null then
    insert into public.beauty_availability_blocks(
      organization_id,company_id,site_id,staff_id,kind,label,starts_at,ends_at,all_day,active,created_by
    )
    values(
      p_organization_id,p_company_id,p_site_id,p_staff_id,p_kind,v_label,v_starts_at,v_ends_at,coalesce(p_all_day,false),true,auth.uid()
    )
    returning id into v_id;
  else
    update public.beauty_availability_blocks
    set site_id=p_site_id,
        staff_id=p_staff_id,
        kind=p_kind,
        label=v_label,
        starts_at=v_starts_at,
        ends_at=v_ends_at,
        all_day=coalesce(p_all_day,false),
        active=true,
        updated_at=now()
    where id=p_block_id
      and organization_id=p_organization_id
      and company_id=p_company_id
    returning id into v_id;
    if v_id is null then raise exception 'Indisponibilité introuvable.'; end if;
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),
    case when p_block_id is null then 'beauty.availability.created' else 'beauty.availability.updated' end,
    'beauty_availability_block',v_id::text,
    jsonb_build_object('company_id',p_company_id,'site_id',p_site_id,'staff_id',p_staff_id,'kind',p_kind)
  );

  return v_id;
end;
$function$;

create or replace function public.set_beauty_availability_block_active(
  p_organization_id uuid,
  p_company_id uuid,
  p_block_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;
  if not public.metier_company_access_allows(p_organization_id,p_company_id) then
    raise exception 'Cette enseigne n’est pas accessible.';
  end if;

  update public.beauty_availability_blocks
  set active=coalesce(p_active,false),updated_at=now()
  where id=p_block_id
    and organization_id=p_organization_id
    and company_id=p_company_id;
  if not found then raise exception 'Indisponibilité introuvable.'; end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),
    case when coalesce(p_active,false) then 'beauty.availability.restored' else 'beauty.availability.cancelled' end,
    'beauty_availability_block',p_block_id::text,
    jsonb_build_object('company_id',p_company_id)
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
    and not exists (
      select 1
      from public.beauty_availability_blocks blk
      where blk.organization_id=v_org_id
        and blk.company_id=v_company_id
        and blk.site_id=p_site_id
        and blk.active=true
        and (blk.staff_id is null or blk.staff_id=base.staff_id)
        and tstzrange(blk.starts_at,blk.ends_at,'[)') &&
            tstzrange(
              base.slot_start-make_interval(mins=>v_buffer_before),
              base.slot_end+make_interval(mins=>v_buffer_after),
              '[)'
            )
    )
  order by base.slot_start,base.staff_name;
end;
$function$;

create or replace function public.save_appointment_v2(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_site_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_status text default 'confirmed',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_id uuid;
  v_company_id uuid;
  v_duration integer;
  v_buffer_before integer := 0;
  v_buffer_after integer := 0;
  v_ends_at timestamptz;
begin
  select s.company_id into v_company_id
  from public.organization_sites s
  where s.id=p_site_id
    and s.organization_id=p_organization_id
    and s.status='active';
  if v_company_id is null and exists (
    select 1 from public.organizations o
    where o.id=p_organization_id and o.business_type='coiffure' and o.plan='metier'
  ) then
    raise exception 'L’établissement sélectionné n’est rattaché à aucune enseigne Beauty.';
  end if;

  if not exists (
    select 1 from public.organization_sites
    where id=p_site_id
      and organization_id=p_organization_id
      and status='active'
  ) then
    raise exception 'L’établissement sélectionné est introuvable ou inactif.';
  end if;

  if not exists (
    select 1 from public.staff
    where id=p_staff_id
      and organization_id=p_organization_id
      and site_id=p_site_id
      and active=true
  ) then
    raise exception 'Ce collaborateur n’est pas rattaché à l’établissement sélectionné.';
  end if;

  select sv.duration_minutes,
         coalesce(sv.booking_buffer_before_minutes,0),
         coalesce(sv.booking_buffer_after_minutes,0)
  into v_duration,v_buffer_before,v_buffer_after
  from public.services sv
  where sv.id=p_service_id
    and sv.organization_id=p_organization_id
    and sv.active=true;
  if v_duration is null then raise exception 'La prestation sélectionnée est introuvable ou inactive.'; end if;
  v_ends_at:=p_starts_at+make_interval(mins=>v_duration);

  if p_status<>'cancelled' and v_company_id is not null and exists (
    select 1
    from public.beauty_availability_blocks blk
    where blk.organization_id=p_organization_id
      and blk.company_id=v_company_id
      and blk.site_id=p_site_id
      and blk.active=true
      and (blk.staff_id is null or blk.staff_id=p_staff_id)
      and tstzrange(blk.starts_at,blk.ends_at,'[)') &&
          tstzrange(
            p_starts_at-make_interval(mins=>v_buffer_before),
            v_ends_at+make_interval(mins=>v_buffer_after),
            '[)'
          )
  ) then
    raise exception 'Ce créneau est bloqué par une fermeture, un congé ou une indisponibilité.';
  end if;

  v_id := public.save_appointment(
    p_organization_id,p_appointment_id,p_client_id,p_service_id,p_staff_id,p_starts_at,p_status,p_notes
  );

  update public.appointments
  set site_id=p_site_id,
      company_id=coalesce(v_company_id,company_id),
      updated_at=now()
  where id=v_id and organization_id=p_organization_id;

  return v_id;
end;
$function$;

revoke all on function public.save_beauty_availability_block(uuid,uuid,uuid,uuid,text,text,timestamp without time zone,timestamp without time zone,boolean,uuid) from public;
revoke all on function public.set_beauty_availability_block_active(uuid,uuid,uuid,boolean) from public;
grant execute on function public.save_beauty_availability_block(uuid,uuid,uuid,uuid,text,text,timestamp without time zone,timestamp without time zone,boolean,uuid) to authenticated,service_role;
grant execute on function public.set_beauty_availability_block_active(uuid,uuid,uuid,boolean) to authenticated,service_role;
