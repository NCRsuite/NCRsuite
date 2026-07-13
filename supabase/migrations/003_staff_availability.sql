-- NCR Suite V1.3.0 — collaborateurs, prestations attribuées et disponibilités hebdomadaires

create table if not exists public.staff_services (
  organization_id uuid not null,
  staff_id uuid not null,
  service_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, staff_id, service_id),
  constraint staff_services_staff_same_org_fk
    foreign key (organization_id, staff_id)
    references public.staff (organization_id, id)
    on delete cascade,
  constraint staff_services_service_same_org_fk
    foreign key (organization_id, service_id)
    references public.services (organization_id, id)
    on delete cascade
);

create table if not exists public.staff_working_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  staff_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, staff_id, weekday),
  check (end_time > start_time),
  constraint staff_working_hours_staff_same_org_fk
    foreign key (organization_id, staff_id)
    references public.staff (organization_id, id)
    on delete cascade
);

create table if not exists public.staff_breaks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  staff_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  label text not null default 'Pause',
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  constraint staff_breaks_staff_same_org_fk
    foreign key (organization_id, staff_id)
    references public.staff (organization_id, id)
    on delete cascade
);

drop trigger if exists set_staff_working_hours_updated_at on public.staff_working_hours;
create trigger set_staff_working_hours_updated_at before update on public.staff_working_hours
for each row execute procedure public.set_updated_at();

drop trigger if exists set_staff_breaks_updated_at on public.staff_breaks;
create trigger set_staff_breaks_updated_at before update on public.staff_breaks
for each row execute procedure public.set_updated_at();

alter table public.staff_services enable row level security;
alter table public.staff_working_hours enable row level security;
alter table public.staff_breaks enable row level security;

drop policy if exists "staff_admin_manage" on public.staff;
drop policy if exists "staff_manager_manage" on public.staff;
create policy "staff_manager_manage" on public.staff for all
using (public.has_org_role(organization_id, array['owner','admin','manager']))
with check (public.has_org_role(organization_id, array['owner','admin','manager']));

drop policy if exists "staff_services_member_select" on public.staff_services;
drop policy if exists "staff_services_manager_manage" on public.staff_services;
drop policy if exists "staff_hours_member_select" on public.staff_working_hours;
drop policy if exists "staff_hours_manager_manage" on public.staff_working_hours;
drop policy if exists "staff_breaks_member_select" on public.staff_breaks;
drop policy if exists "staff_breaks_manager_manage" on public.staff_breaks;

create policy "staff_services_member_select" on public.staff_services for select
using (public.is_org_member(organization_id));
create policy "staff_services_manager_manage" on public.staff_services for all
using (public.has_org_role(organization_id, array['owner','admin','manager']))
with check (public.has_org_role(organization_id, array['owner','admin','manager']));

create policy "staff_hours_member_select" on public.staff_working_hours for select
using (public.is_org_member(organization_id));
create policy "staff_hours_manager_manage" on public.staff_working_hours for all
using (public.has_org_role(organization_id, array['owner','admin','manager']))
with check (public.has_org_role(organization_id, array['owner','admin','manager']));

create policy "staff_breaks_member_select" on public.staff_breaks for select
using (public.is_org_member(organization_id));
create policy "staff_breaks_manager_manage" on public.staff_breaks for all
using (public.has_org_role(organization_id, array['owner','admin','manager']))
with check (public.has_org_role(organization_id, array['owner','admin','manager']));

create or replace function public.save_staff_configuration(
  p_organization_id uuid,
  p_staff_id uuid,
  p_display_name text,
  p_email text,
  p_phone text,
  p_color text,
  p_service_ids uuid[],
  p_working_hours jsonb,
  p_breaks jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid;
  v_display_name text := trim(p_display_name);
  v_email text := nullif(trim(coalesce(p_email, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_service_ids uuid[] := coalesce(p_service_ids, '{}'::uuid[]);
  v_working_hours jsonb := coalesce(p_working_hours, '[]'::jsonb);
  v_breaks jsonb := coalesce(p_breaks, '[]'::jsonb);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Insufficient permissions';
  end if;

  if char_length(v_display_name) not between 2 and 120 then
    raise exception 'Invalid display name';
  end if;

  if p_color is null or p_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Invalid color';
  end if;

  if jsonb_typeof(v_working_hours) <> 'array' or jsonb_typeof(v_breaks) <> 'array' then
    raise exception 'Invalid schedule payload';
  end if;

  if exists (
    select 1
    from unnest(v_service_ids) service_id
    left join public.services s
      on s.id = service_id
     and s.organization_id = p_organization_id
    where s.id is null
  ) then
    raise exception 'A selected service does not belong to this organization';
  end if;

  if p_staff_id is null then
    insert into public.staff (organization_id, display_name, email, phone, color)
    values (p_organization_id, v_display_name, v_email, v_phone, p_color)
    returning id into v_staff_id;
  else
    update public.staff
    set display_name = v_display_name,
        email = v_email,
        phone = v_phone,
        color = p_color
    where id = p_staff_id
      and organization_id = p_organization_id
    returning id into v_staff_id;

    if v_staff_id is null then
      raise exception 'Collaborator not found';
    end if;
  end if;

  delete from public.staff_services
  where organization_id = p_organization_id
    and staff_id = v_staff_id;

  insert into public.staff_services (organization_id, staff_id, service_id)
  select p_organization_id, v_staff_id, service_id
  from unnest(v_service_ids) service_id
  on conflict do nothing;

  delete from public.staff_breaks
  where organization_id = p_organization_id
    and staff_id = v_staff_id;

  delete from public.staff_working_hours
  where organization_id = p_organization_id
    and staff_id = v_staff_id;

  insert into public.staff_working_hours (organization_id, staff_id, weekday, start_time, end_time)
  select
    p_organization_id,
    v_staff_id,
    row_data.weekday,
    row_data.start_time::time,
    row_data.end_time::time
  from jsonb_to_recordset(v_working_hours) as row_data(weekday smallint, start_time text, end_time text);

  insert into public.staff_breaks (organization_id, staff_id, weekday, label, start_time, end_time)
  select
    p_organization_id,
    v_staff_id,
    row_data.weekday,
    coalesce(nullif(trim(row_data.label), ''), 'Pause'),
    row_data.start_time::time,
    row_data.end_time::time
  from jsonb_to_recordset(v_breaks) as row_data(weekday smallint, label text, start_time text, end_time text);

  if exists (
    select 1
    from public.staff_breaks b
    left join public.staff_working_hours h
      on h.organization_id = b.organization_id
     and h.staff_id = b.staff_id
     and h.weekday = b.weekday
    where b.organization_id = p_organization_id
      and b.staff_id = v_staff_id
      and (
        h.id is null
        or b.start_time < h.start_time
        or b.end_time > h.end_time
      )
  ) then
    raise exception 'A break must be included in working hours';
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  values (
    p_organization_id,
    auth.uid(),
    case when p_staff_id is null then 'staff.created' else 'staff.updated' end,
    'staff',
    v_staff_id::text
  );

  return v_staff_id;
end;
$$;

revoke all on function public.save_staff_configuration(uuid,uuid,text,text,text,text,uuid[],jsonb,jsonb) from public;
grant execute on function public.save_staff_configuration(uuid,uuid,text,text,text,text,uuid[],jsonb,jsonb) to authenticated;

create index if not exists idx_staff_services_staff on public.staff_services(organization_id, staff_id);
create index if not exists idx_staff_services_service on public.staff_services(organization_id, service_id);
create index if not exists idx_staff_hours_staff_day on public.staff_working_hours(organization_id, staff_id, weekday);
create index if not exists idx_staff_breaks_staff_day on public.staff_breaks(organization_id, staff_id, weekday);
