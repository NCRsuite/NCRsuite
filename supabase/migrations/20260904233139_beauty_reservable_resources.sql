create table public.beauty_resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  site_id uuid not null references public.organization_sites(id) on delete cascade,
  name text not null,
  kind text not null default 'other',
  capacity integer not null default 1,
  notes text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beauty_resources_name_check check (char_length(trim(name)) between 2 and 100),
  constraint beauty_resources_kind_check check (kind in ('chair','cabin','machine','station','room','other')),
  constraint beauty_resources_capacity_check check (capacity between 1 and 100),
  constraint beauty_resources_notes_check check (notes is null or char_length(notes) <= 1000)
);

create unique index beauty_resources_company_site_name_uidx
  on public.beauty_resources (organization_id,company_id,site_id,lower(trim(name)));
create index beauty_resources_scope_idx
  on public.beauty_resources (organization_id,company_id,site_id,active);

create table public.beauty_service_resource_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  site_id uuid not null references public.organization_sites(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  resource_id uuid not null references public.beauty_resources(id) on delete cascade,
  quantity_required integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint beauty_service_resource_quantity_check check (quantity_required between 1 and 100),
  constraint beauty_service_resource_unique unique (service_id,resource_id)
);

create index beauty_service_resource_scope_idx
  on public.beauty_service_resource_requirements (organization_id,company_id,site_id,service_id);
create index beauty_service_resource_resource_idx
  on public.beauty_service_resource_requirements (resource_id,service_id);

alter table public.beauty_resources enable row level security;
alter table public.beauty_service_resource_requirements enable row level security;

grant select,insert,update,delete on public.beauty_resources to authenticated,service_role;
grant select,insert,update,delete on public.beauty_service_resource_requirements to authenticated,service_role;

create policy beauty_resources_select
on public.beauty_resources
for select to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager','employee','viewer'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
);

create policy beauty_resources_manage
on public.beauty_resources
for all to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
)
with check (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
);

create policy beauty_service_resources_select
on public.beauty_service_resource_requirements
for select to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager','employee','viewer'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
);

create policy beauty_service_resources_manage
on public.beauty_service_resource_requirements
for all to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
)
with check (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
);

create or replace function public.beauty_validate_resource_scope()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $function$
begin
  if not exists (
    select 1
    from public.organization_companies c
    where c.id=new.company_id
      and c.organization_id=new.organization_id
      and c.status='active'
  ) then
    raise exception 'L’enseigne de cette ressource est invalide.';
  end if;

  if not exists (
    select 1
    from public.organization_sites s
    where s.id=new.site_id
      and s.organization_id=new.organization_id
      and s.company_id=new.company_id
      and s.status='active'
  ) then
    raise exception 'L’établissement de cette ressource est invalide.';
  end if;

  new.name:=trim(new.name);
  new.notes:=nullif(trim(coalesce(new.notes,'')),'');
  new.updated_at:=now();
  return new;
end;
$function$;

create trigger beauty_resources_scope_guard
before insert or update on public.beauty_resources
for each row execute function public.beauty_validate_resource_scope();

create or replace function public.beauty_validate_service_resource_scope()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $function$
declare
  v_capacity integer;
begin
  if not exists (
    select 1 from public.services s
    where s.id=new.service_id
      and s.organization_id=new.organization_id
      and s.company_id=new.company_id
  ) then
    raise exception 'La prestation n’appartient pas à cette enseigne.';
  end if;

  select r.capacity into v_capacity
  from public.beauty_resources r
  where r.id=new.resource_id
    and r.organization_id=new.organization_id
    and r.company_id=new.company_id
    and r.site_id=new.site_id;

  if v_capacity is null then
    raise exception 'La ressource n’appartient pas à cet établissement.';
  end if;

  if new.quantity_required>v_capacity then
    raise exception 'La quantité requise dépasse la capacité de la ressource.';
  end if;

  return new;
end;
$function$;

create trigger beauty_service_resource_scope_guard
before insert or update on public.beauty_service_resource_requirements
for each row execute function public.beauty_validate_service_resource_scope();

create or replace function private.beauty_resource_used_capacity(
  p_resource_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_appointment_id uuid default null
)
returns integer
language sql
stable
security definer
set search_path=public,private,pg_catalog
as $function$
  with item_segments as (
    select
      a.id as appointment_id,
      req.quantity_required,
      asi.starts_at-make_interval(mins=>coalesce(asi.buffer_before_minutes,0)) as occupied_start,
      asi.ends_at+make_interval(mins=>coalesce(asi.buffer_after_minutes,0)) as occupied_end
    from public.appointments a
    join public.appointment_service_items asi
      on asi.organization_id=a.organization_id
     and asi.appointment_id=a.id
    join public.beauty_service_resource_requirements req
      on req.organization_id=a.organization_id
     and req.company_id=a.company_id
     and req.site_id=a.site_id
     and req.service_id=asi.service_id
     and req.resource_id=p_resource_id
    where a.status<>'cancelled'
      and (p_exclude_appointment_id is null or a.id<>p_exclude_appointment_id)
  ),
  fallback_segments as (
    select
      a.id as appointment_id,
      req.quantity_required,
      a.starts_at-make_interval(mins=>coalesce(s.booking_buffer_before_minutes,0)) as occupied_start,
      a.ends_at+make_interval(mins=>coalesce(s.booking_buffer_after_minutes,0)) as occupied_end
    from public.appointments a
    join public.services s
      on s.organization_id=a.organization_id
     and s.id=a.service_id
    join public.beauty_service_resource_requirements req
      on req.organization_id=a.organization_id
     and req.company_id=a.company_id
     and req.site_id=a.site_id
     and req.service_id=a.service_id
     and req.resource_id=p_resource_id
    where a.status<>'cancelled'
      and (p_exclude_appointment_id is null or a.id<>p_exclude_appointment_id)
      and not exists (
        select 1
        from public.appointment_service_items asi
        where asi.organization_id=a.organization_id
          and asi.appointment_id=a.id
      )
  ),
  all_segments as (
    select * from item_segments
    union all
    select * from fallback_segments
  )
  select coalesce(sum(quantity_required),0)::integer
  from all_segments
  where tstzrange(occupied_start,occupied_end,'[)') && tstzrange(p_starts_at,p_ends_at,'[)');
$function$;

create or replace function private.beauty_service_sequence_resources_available(
  p_organization_id uuid,
  p_company_id uuid,
  p_site_id uuid,
  p_service_ids uuid[],
  p_starts_at timestamptz
)
returns boolean
language plpgsql
stable
security definer
set search_path=public,private,pg_catalog
as $function$
declare
  v_item record;
  v_req record;
  v_cursor timestamptz:=p_starts_at;
  v_occupied_start timestamptz;
  v_occupied_end timestamptz;
  v_used integer;
begin
  if coalesce(cardinality(p_service_ids),0)=0 then return true; end if;

  for v_item in
    select u.ord,s.id,s.duration_minutes,
           coalesce(s.booking_buffer_before_minutes,0) as buffer_before,
           coalesce(s.booking_buffer_after_minutes,0) as buffer_after
    from unnest(p_service_ids) with ordinality u(service_id,ord)
    join public.services s
      on s.id=u.service_id
     and s.organization_id=p_organization_id
     and s.company_id=p_company_id
    order by u.ord
  loop
    v_occupied_start:=v_cursor-make_interval(mins=>v_item.buffer_before);
    v_occupied_end:=v_cursor+make_interval(mins=>v_item.duration_minutes+v_item.buffer_after);

    for v_req in
      select req.quantity_required,r.id as resource_id,r.name,r.capacity,r.active
      from public.beauty_service_resource_requirements req
      join public.beauty_resources r on r.id=req.resource_id
      where req.organization_id=p_organization_id
        and req.company_id=p_company_id
        and req.site_id=p_site_id
        and req.service_id=v_item.id
    loop
      if not v_req.active then return false; end if;
      v_used:=private.beauty_resource_used_capacity(
        v_req.resource_id,v_occupied_start,v_occupied_end,null
      );
      if v_used+v_req.quantity_required>v_req.capacity then return false; end if;
    end loop;

    v_cursor:=v_cursor+make_interval(mins=>v_item.duration_minutes);
  end loop;

  return true;
end;
$function$;

create or replace function private.beauty_assert_appointment_resources_available(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
declare
  v_appt public.appointments%rowtype;
  v_resource record;
  v_item record;
  v_req record;
  v_used integer;
  v_occupied_start timestamptz;
  v_occupied_end timestamptz;
begin
  select * into v_appt
  from public.appointments
  where id=p_appointment_id;

  if v_appt.id is null
     or v_appt.company_id is null
     or v_appt.site_id is null
     or v_appt.status='cancelled' then
    return;
  end if;

  if not exists (
    select 1 from public.organizations o
    where o.id=v_appt.organization_id
      and o.business_type='coiffure'
      and o.plan='metier'
  ) then
    return;
  end if;

  for v_resource in
    with service_ids as (
      select distinct asi.service_id
      from public.appointment_service_items asi
      where asi.organization_id=v_appt.organization_id
        and asi.appointment_id=v_appt.id
      union
      select v_appt.service_id
      where not exists (
        select 1 from public.appointment_service_items asi
        where asi.organization_id=v_appt.organization_id
          and asi.appointment_id=v_appt.id
      )
    )
    select distinct req.resource_id
    from service_ids sid
    join public.beauty_service_resource_requirements req
      on req.organization_id=v_appt.organization_id
     and req.company_id=v_appt.company_id
     and req.site_id=v_appt.site_id
     and req.service_id=sid.service_id
    order by req.resource_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_resource.resource_id::text,17));
  end loop;

  for v_item in
    with item_rows as (
      select asi.id as service_item_id,asi.service_id,asi.starts_at,asi.ends_at,
             asi.buffer_before_minutes as buffer_before,
             asi.buffer_after_minutes as buffer_after
      from public.appointment_service_items asi
      where asi.organization_id=v_appt.organization_id
        and asi.appointment_id=v_appt.id
    ),
    fallback_row as (
      select null::uuid as service_item_id,v_appt.service_id as service_id,
             v_appt.starts_at as starts_at,v_appt.ends_at as ends_at,
             coalesce(s.booking_buffer_before_minutes,0) as buffer_before,
             coalesce(s.booking_buffer_after_minutes,0) as buffer_after
      from public.services s
      where s.organization_id=v_appt.organization_id
        and s.id=v_appt.service_id
        and not exists (select 1 from item_rows)
    )
    select * from item_rows
    union all
    select * from fallback_row
  loop
    v_occupied_start:=v_item.starts_at-make_interval(mins=>coalesce(v_item.buffer_before,0));
    v_occupied_end:=v_item.ends_at+make_interval(mins=>coalesce(v_item.buffer_after,0));

    for v_req in
      select req.quantity_required,r.id as resource_id,r.name,r.capacity,r.active
      from public.beauty_service_resource_requirements req
      join public.beauty_resources r on r.id=req.resource_id
      where req.organization_id=v_appt.organization_id
        and req.company_id=v_appt.company_id
        and req.site_id=v_appt.site_id
        and req.service_id=v_item.service_id
    loop
      if not v_req.active then
        raise exception 'La ressource « % » est indisponible.',v_req.name;
      end if;

      v_used:=private.beauty_resource_used_capacity(
        v_req.resource_id,v_occupied_start,v_occupied_end,v_appt.id
      );
      if v_used+v_req.quantity_required>v_req.capacity then
        raise exception 'La ressource « % » n’est plus disponible sur ce créneau.',v_req.name;
      end if;
    end loop;
  end loop;
end;
$function$;

create or replace function private.beauty_check_appointment_resources_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
begin
  perform private.beauty_assert_appointment_resources_available(new.id);
  return null;
end;
$function$;

create trigger beauty_appointment_resource_guard
after insert or update of site_id,company_id,status
on public.appointments
for each row execute function private.beauty_check_appointment_resources_trigger();

create or replace function private.beauty_check_service_item_resources_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
begin
  perform private.beauty_assert_appointment_resources_available(coalesce(new.appointment_id,old.appointment_id));
  return null;
end;
$function$;

create trigger beauty_appointment_service_resource_guard
after insert or update or delete
on public.appointment_service_items
for each row execute function private.beauty_check_service_item_resources_trigger();

do $$
begin
  if to_regprocedure('public.get_public_metier_coiffure_company_slots_v2_base(text,uuid,uuid,date,uuid)') is null then
    alter function public.get_public_metier_coiffure_company_slots_v2(text,uuid,uuid,date,uuid)
      rename to get_public_metier_coiffure_company_slots_v2_base;
  end if;
  if to_regprocedure('public.get_public_metier_coiffure_company_multi_slots_base(text,uuid,uuid[],date,uuid)') is null then
    alter function public.get_public_metier_coiffure_company_multi_slots(text,uuid,uuid[],date,uuid)
      rename to get_public_metier_coiffure_company_multi_slots_base;
  end if;
end $$;

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
set search_path=public,private,pg_catalog
as $function$
declare
  v_org_id uuid;
  v_company_id uuid;
begin
  select c.organization_id,c.id into v_org_id,v_company_id
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.status='active'
    and c.public_page_enabled=true
    and o.business_type='coiffure'
    and o.plan='metier'
    and o.status in ('trial','active')
  limit 1;
  if v_company_id is null then return; end if;

  return query
  select s.slot_start,s.slot_end,s.staff_id,s.staff_name
  from public.get_public_metier_coiffure_company_slots_v2_base(
    p_slug,p_site_id,p_service_id,p_date,p_staff_id
  ) s
  where private.beauty_service_sequence_resources_available(
    v_org_id,v_company_id,p_site_id,array[p_service_id]::uuid[],s.slot_start
  );
end;
$function$;

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
set search_path=public,private,pg_catalog
as $function$
declare
  v_org_id uuid;
  v_company_id uuid;
begin
  select c.organization_id,c.id into v_org_id,v_company_id
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.status='active'
    and c.public_page_enabled=true
    and o.business_type='coiffure'
    and o.plan='metier'
    and o.status in ('trial','active')
  limit 1;
  if v_company_id is null then return; end if;

  return query
  select s.slot_start,s.slot_end,s.staff_id,s.staff_name
  from public.get_public_metier_coiffure_company_multi_slots_base(
    p_slug,p_site_id,p_service_ids,p_date,p_staff_id
  ) s
  where private.beauty_service_sequence_resources_available(
    v_org_id,v_company_id,p_site_id,p_service_ids,s.slot_start
  );
end;
$function$;

revoke all on function public.get_public_metier_coiffure_company_slots_v2_base(text,uuid,uuid,date,uuid) from public;
revoke all on function public.get_public_metier_coiffure_company_multi_slots_base(text,uuid,uuid[],date,uuid) from public;
grant execute on function public.get_public_metier_coiffure_company_slots_v2(text,uuid,uuid,date,uuid) to anon,authenticated,service_role;
grant execute on function public.get_public_metier_coiffure_company_multi_slots(text,uuid,uuid[],date,uuid) to anon,authenticated,service_role;
