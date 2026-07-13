-- NCR Suite V1.0.1 — premier pack métier : rendez-vous / coiffure / beauté
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 720),
  price_cents integer not null default 0 check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  email text,
  phone text,
  active boolean not null default true,
  color text default '#2997ff' check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  service_id uuid,
  staff_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('pending','confirmed','completed','cancelled','no_show')),
  notes text,
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint appointments_client_same_org_fk
    foreign key (organization_id, client_id)
    references public.clients (organization_id, id)
    on delete restrict,
  constraint appointments_service_same_org_fk
    foreign key (organization_id, service_id)
    references public.services (organization_id, id)
    on delete set null,
  constraint appointments_staff_same_org_fk
    foreign key (organization_id, staff_id)
    references public.staff (organization_id, id)
    on delete set null
);

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at before update on public.services
for each row execute procedure public.set_updated_at();

drop trigger if exists set_staff_updated_at on public.staff;
create trigger set_staff_updated_at before update on public.staff
for each row execute procedure public.set_updated_at();

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at before update on public.appointments
for each row execute procedure public.set_updated_at();

alter table public.services enable row level security;
alter table public.staff enable row level security;
alter table public.appointments enable row level security;

drop policy if exists "services_member_select" on public.services;
drop policy if exists "services_manager_manage" on public.services;
drop policy if exists "staff_member_select" on public.staff;
drop policy if exists "staff_admin_manage" on public.staff;
drop policy if exists "appointments_member_select" on public.appointments;
drop policy if exists "appointments_staff_insert" on public.appointments;
drop policy if exists "appointments_staff_update" on public.appointments;
drop policy if exists "appointments_manager_delete" on public.appointments;

create policy "services_member_select" on public.services for select using (public.is_org_member(organization_id));
create policy "services_manager_manage" on public.services for all using (public.has_org_role(organization_id, array['owner','admin','manager'])) with check (public.has_org_role(organization_id, array['owner','admin','manager']));

create policy "staff_member_select" on public.staff for select using (public.is_org_member(organization_id));
create policy "staff_admin_manage" on public.staff for all using (public.has_org_role(organization_id, array['owner','admin'])) with check (public.has_org_role(organization_id, array['owner','admin']));

create policy "appointments_member_select" on public.appointments for select using (public.is_org_member(organization_id));
create policy "appointments_staff_insert" on public.appointments for insert with check (public.has_org_role(organization_id, array['owner','admin','manager','employee']));
create policy "appointments_staff_update" on public.appointments for update using (public.has_org_role(organization_id, array['owner','admin','manager','employee'])) with check (public.has_org_role(organization_id, array['owner','admin','manager','employee']));
create policy "appointments_manager_delete" on public.appointments for delete using (public.has_org_role(organization_id, array['owner','admin','manager']));

create index if not exists idx_services_org on public.services(organization_id);
create index if not exists idx_staff_org on public.staff(organization_id);
create index if not exists idx_appointments_org_start on public.appointments(organization_id, starts_at);
create index if not exists idx_appointments_staff_start on public.appointments(staff_id, starts_at);
