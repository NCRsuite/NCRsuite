-- NCR Suite V2.29.8 — Main courante terrain : photos privées + textes rapides
-- A exécuter après 122_security_agent_logbook_ux_release.sql.

begin;

do $$
begin
  if to_regclass('public.security_logbook_entries') is null
     or to_regclass('public.security_shifts') is null
     or to_regclass('public.platform_release_state') is null then
    raise exception 'Les migrations NCR Suite précédentes doivent être exécutées avant la V2.29.8.';
  end if;
end;
$$;

create table if not exists public.security_logbook_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_id uuid not null references public.security_logbook_entries(id) on delete cascade,
  shift_id uuid not null references public.security_shifts(id) on delete cascade,
  storage_path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 1 and 10485760),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (storage_path)
);

create index if not exists idx_security_logbook_photos_entry
  on public.security_logbook_photos(organization_id, entry_id, created_at);

alter table public.security_logbook_photos enable row level security;

drop policy if exists security_logbook_photos_select on public.security_logbook_photos;
create policy security_logbook_photos_select
on public.security_logbook_photos for select to authenticated
using (
  public.is_security_manager(organization_id)
  or exists (
    select 1
    from public.security_logbook_entries e
    where e.organization_id = security_logbook_photos.organization_id
      and e.id = security_logbook_photos.entry_id
      and e.agent_id = public.current_security_agent_id(e.organization_id)
  )
);

drop policy if exists security_logbook_photos_delete on public.security_logbook_photos;
create policy security_logbook_photos_delete
on public.security_logbook_photos for delete to authenticated
using (public.is_security_manager(organization_id));

grant select, delete on public.security_logbook_photos to authenticated;

create or replace function public.can_read_security_logbook_photo_object(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage, pg_catalog
as $$
declare
  v_folders text[];
  v_org uuid;
  v_shift uuid;
  v_entry uuid;
begin
  if auth.uid() is null then return false; end if;
  v_folders := storage.foldername(p_object_name);
  if coalesce(array_length(v_folders, 1), 0) < 3 then return false; end if;
  if v_folders[1] !~* '^[0-9a-f-]{36}$'
     or v_folders[2] !~* '^[0-9a-f-]{36}$'
     or v_folders[3] !~* '^[0-9a-f-]{36}$' then return false; end if;

  v_org := v_folders[1]::uuid;
  v_shift := v_folders[2]::uuid;
  v_entry := v_folders[3]::uuid;

  if not public.organization_has_plan_feature(v_org, 'security_smart_logbook') then return false; end if;

  return exists (
    select 1
    from public.security_logbook_entries e
    join public.security_shifts s
      on s.organization_id = e.organization_id and s.id = e.shift_id
    where e.organization_id = v_org
      and e.id = v_entry
      and s.id = v_shift
      and (
        public.is_security_manager(v_org)
        or e.agent_id = public.current_security_agent_id(v_org)
      )
  );
exception when others then
  return false;
end;
$$;

create or replace function public.can_write_security_logbook_photo_object(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage, pg_catalog
as $$
declare
  v_folders text[];
  v_org uuid;
  v_shift uuid;
  v_entry uuid;
begin
  if auth.uid() is null then return false; end if;
  v_folders := storage.foldername(p_object_name);
  if coalesce(array_length(v_folders, 1), 0) < 3 then return false; end if;
  if v_folders[1] !~* '^[0-9a-f-]{36}$'
     or v_folders[2] !~* '^[0-9a-f-]{36}$'
     or v_folders[3] !~* '^[0-9a-f-]{36}$' then return false; end if;

  v_org := v_folders[1]::uuid;
  v_shift := v_folders[2]::uuid;
  v_entry := v_folders[3]::uuid;

  if not public.organization_has_plan_feature(v_org, 'security_smart_logbook') then return false; end if;

  return exists (
    select 1
    from public.security_logbook_entries e
    join public.security_shifts s
      on s.organization_id = e.organization_id and s.id = e.shift_id
    where e.organization_id = v_org
      and e.id = v_entry
      and s.id = v_shift
      and (
        public.is_security_manager(v_org)
        or (
          e.agent_id = public.current_security_agent_id(v_org)
          and s.clocked_in_at is not null
          and s.clocked_out_at is null
          and s.status not in ('completed','canceled')
          and s.logbook_status <> 'closed'
          and s.dossier_status not in ('closed','archived')
        )
      )
  );
exception when others then
  return false;
end;
$$;

revoke all on function public.can_read_security_logbook_photo_object(text) from public, anon;
revoke all on function public.can_write_security_logbook_photo_object(text) from public, anon;
grant execute on function public.can_read_security_logbook_photo_object(text) to authenticated;
grant execute on function public.can_write_security_logbook_photo_object(text) to authenticated;

create or replace function public.attach_security_logbook_photo(
  p_organization_id uuid,
  p_entry_id uuid,
  p_storage_path text,
  p_file_name text default null,
  p_mime_type text default 'image/jpeg',
  p_size_bytes bigint default null
)
returns public.security_logbook_photos
language plpgsql
security definer
set search_path = public, storage, pg_catalog
as $$
declare
  v_entry public.security_logbook_entries%rowtype;
  v_photo public.security_logbook_photos%rowtype;
  v_prefix text;
  v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;

  select * into v_entry
  from public.security_logbook_entries
  where organization_id = p_organization_id and id = p_entry_id;
  if v_entry.id is null or v_entry.shift_id is null then raise exception 'Événement de main courante introuvable.'; end if;

  v_prefix := p_organization_id::text || '/' || v_entry.shift_id::text || '/' || p_entry_id::text || '/';
  if nullif(trim(coalesce(p_storage_path,'')), '') is null or position(v_prefix in p_storage_path) <> 1 then
    raise exception 'Chemin de photo invalide.';
  end if;
  if not public.can_write_security_logbook_photo_object(p_storage_path) then
    raise exception 'Cette photo ne peut pas être rattachée à cet événement.';
  end if;
  if coalesce(p_mime_type, '') not in ('image/jpeg','image/png','image/webp') then
    raise exception 'Format de photo non autorisé.';
  end if;
  if p_size_bytes is not null and (p_size_bytes < 1 or p_size_bytes > 10485760) then
    raise exception 'La photo dépasse la taille autorisée.';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'security-logbook-photos' and name = p_storage_path) then
    raise exception 'Le fichier photo n’a pas été trouvé.';
  end if;

  select count(*) into v_count
  from public.security_logbook_photos
  where organization_id = p_organization_id and entry_id = p_entry_id;
  if v_count >= 3 then raise exception 'Maximum 3 photos par événement.'; end if;

  insert into public.security_logbook_photos(
    organization_id, entry_id, shift_id, storage_path,
    file_name, mime_type, size_bytes, created_by
  ) values (
    p_organization_id, p_entry_id, v_entry.shift_id, trim(p_storage_path),
    nullif(trim(coalesce(p_file_name,'')), ''), coalesce(p_mime_type,'image/jpeg'), p_size_bytes, auth.uid()
  ) returning * into v_photo;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),'security_logbook_photo_attached','security_logbook_photo',v_photo.id,
    jsonb_build_object('entry_id',p_entry_id,'shift_id',v_entry.shift_id,'storage_path',p_storage_path)
  );

  return v_photo;
end;
$$;

revoke all on function public.attach_security_logbook_photo(uuid,uuid,text,text,text,bigint) from public, anon;
grant execute on function public.attach_security_logbook_photo(uuid,uuid,text,text,text,bigint) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('security-logbook-photos','security-logbook-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists security_logbook_photos_storage_select on storage.objects;
create policy security_logbook_photos_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'security-logbook-photos'
  and public.can_read_security_logbook_photo_object(name)
);

drop policy if exists security_logbook_photos_storage_insert on storage.objects;
create policy security_logbook_photos_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'security-logbook-photos'
  and public.can_write_security_logbook_photo_object(name)
);

drop policy if exists security_logbook_photos_storage_delete on storage.objects;
create policy security_logbook_photos_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'security-logbook-photos'
  and public.can_write_security_logbook_photo_object(name)
);

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.29.8','2.29.8','ncr-suite-shell-v2.29.8-security-logbook-photos',
  now(),auth.uid(),
  'V2.29.8 : photos privées jusqu à 3 par événement et textes rapides contextuels dans la main courante Sécurité.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
