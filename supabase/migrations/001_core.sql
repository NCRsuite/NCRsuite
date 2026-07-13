-- NCR Suite — socle multi-entreprises sécurisé
create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique,
  business_type text not null check (business_type in ('coiffure','nettoyage','securite','formation','artisan')),
  plan text not null default 'decouverte' check (plan in ('decouverte','essentielle','professionnelle','metier')),
  status text not null default 'active' check (status in ('trial','active','suspended','closed')),
  primary_color text not null default '#2997ff',
  logo_url text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'employee' check (role in ('owner','admin','manager','employee','viewer')),
  status text not null default 'active' check (status in ('invited','active','disabled')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.organization_modules (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (organization_id, module_key)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  notes text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  category text not null default 'general',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  visibility text not null default 'internal' check (visibility in ('internal','client','public')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.has_org_role(p_organization_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and status = 'active'
      and role = any(p_roles)
  );
$$;

create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_business_type text,
  p_primary_color text default '#2997ff'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_business_type not in ('coiffure','nettoyage','securite','formation','artisan') then
    raise exception 'Unsupported business type';
  end if;

  insert into public.organizations (name, slug, business_type, primary_color, created_by)
  values (trim(p_name), lower(trim(p_slug)), p_business_type, p_primary_color, auth.uid())
  returning id into v_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_id, auth.uid(), 'owner', 'active');

  insert into public.organization_modules (organization_id, module_key)
  values
    (v_id, 'dashboard'),
    (v_id, 'settings'),
    (v_id, p_business_type)
  on conflict do nothing;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  values (v_id, auth.uid(), 'organization.created', 'organization', v_id::text);

  return v_id;
end;
$$;

grant execute on function public.create_organization(text,text,text,text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.user_profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_modules enable row level security;
alter table public.clients enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_self_select" on public.user_profiles for select using (id = auth.uid());
create policy "profiles_self_update" on public.user_profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations_member_select" on public.organizations for select using (public.is_org_member(id));
create policy "organizations_admin_update" on public.organizations for update using (public.has_org_role(id, array['owner','admin'])) with check (public.has_org_role(id, array['owner','admin']));

create policy "members_org_select" on public.organization_members for select using (public.is_org_member(organization_id));
create policy "members_admin_insert" on public.organization_members for insert with check (public.has_org_role(organization_id, array['owner','admin']));
create policy "members_admin_update" on public.organization_members for update using (public.has_org_role(organization_id, array['owner','admin'])) with check (public.has_org_role(organization_id, array['owner','admin']));
create policy "members_admin_delete" on public.organization_members for delete using (public.has_org_role(organization_id, array['owner','admin']));

create policy "modules_member_select" on public.organization_modules for select using (public.is_org_member(organization_id));
create policy "modules_admin_manage" on public.organization_modules for all using (public.has_org_role(organization_id, array['owner','admin'])) with check (public.has_org_role(organization_id, array['owner','admin']));

create policy "clients_member_select" on public.clients for select using (public.is_org_member(organization_id));
create policy "clients_staff_insert" on public.clients for insert with check (public.has_org_role(organization_id, array['owner','admin','manager','employee']));
create policy "clients_staff_update" on public.clients for update using (public.has_org_role(organization_id, array['owner','admin','manager','employee'])) with check (public.has_org_role(organization_id, array['owner','admin','manager','employee']));
create policy "clients_manager_delete" on public.clients for delete using (public.has_org_role(organization_id, array['owner','admin','manager']));

create policy "documents_member_select" on public.documents for select using (public.is_org_member(organization_id));
create policy "documents_staff_insert" on public.documents for insert with check (public.has_org_role(organization_id, array['owner','admin','manager','employee']));
create policy "documents_manager_update" on public.documents for update using (public.has_org_role(organization_id, array['owner','admin','manager'])) with check (public.has_org_role(organization_id, array['owner','admin','manager']));
create policy "documents_manager_delete" on public.documents for delete using (public.has_org_role(organization_id, array['owner','admin','manager']));

create policy "audit_member_select" on public.audit_logs for select using (public.has_org_role(organization_id, array['owner','admin','manager']));
create policy "audit_authenticated_insert" on public.audit_logs for insert with check (public.is_org_member(organization_id) and user_id = auth.uid());

create index if not exists idx_members_user on public.organization_members(user_id);
create index if not exists idx_clients_org on public.clients(organization_id);
create index if not exists idx_documents_org on public.documents(organization_id);
create index if not exists idx_audit_org_created on public.audit_logs(organization_id, created_at desc);
