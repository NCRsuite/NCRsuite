-- NCR Suite V2.12.1 — Suppression sécurisée des entreprises depuis l'administration NCR
begin;

create table if not exists public.platform_deleted_organizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  organization_name text not null,
  organization_slug text,
  business_type text,
  plan text,
  previous_status text,
  owner_email text,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  storage_objects_deleted integer not null default 0 check (storage_objects_deleted >= 0),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists platform_deleted_organizations_deleted_at_idx
  on public.platform_deleted_organizations(deleted_at desc);

alter table public.platform_deleted_organizations enable row level security;

drop policy if exists platform_deleted_organizations_super_admin_select
  on public.platform_deleted_organizations;
create policy platform_deleted_organizations_super_admin_select
  on public.platform_deleted_organizations
  for select
  using (public.is_platform_super_admin());

revoke all on table public.platform_deleted_organizations from anon, authenticated;
grant select on table public.platform_deleted_organizations to authenticated;

insert into public.platform_release_state(
  singleton,
  database_version,
  expected_frontend_version,
  expected_pwa_cache,
  installed_at,
  installed_by,
  notes
) values (
  true,
  '2.12.1',
  '2.12.1',
  'ncr-suite-shell-v2.12.1-secure-organization-deletion',
  now(),
  auth.uid(),
  'Suppression définitive et sécurisée des entreprises depuis l’administration NCR, nettoyage des fichiers et conservation d’une trace d’audit.'
)
on conflict (singleton) do update
set database_version = excluded.database_version,
    expected_frontend_version = excluded.expected_frontend_version,
    expected_pwa_cache = excluded.expected_pwa_cache,
    installed_at = excluded.installed_at,
    installed_by = excluded.installed_by,
    notes = excluded.notes;

commit;
