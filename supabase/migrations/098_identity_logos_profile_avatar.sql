-- NCR Suite V2.26.3 - Logos entreprise et photo de profil
-- A executer apres 097_premium_cockpit_polish.sql.

begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null then
    raise exception 'La migration 084_final_production_validation.sql doit etre executee avant la V2.26.3.';
  end if;
end;
$$;

alter table public.user_profiles
  add column if not exists avatar_url text;

alter table public.user_profiles
  drop constraint if exists user_profiles_avatar_url_check;

alter table public.user_profiles
  add constraint user_profiles_avatar_url_check
  check (avatar_url is null or (char_length(avatar_url) <= 1600 and avatar_url ~ '^https://'));

grant select on table public.user_profiles to authenticated;
grant update (avatar_url) on table public.user_profiles to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  3145728,
  array['image/jpeg','image/png','image/webp']
)
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists profile_avatars_insert_own on storage.objects;
create policy profile_avatars_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id='profile-avatars'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists profile_avatars_update_own on storage.objects;
create policy profile_avatars_update_own on storage.objects
for update to authenticated
using (
  bucket_id='profile-avatars'
  and (storage.foldername(name))[1]=auth.uid()::text
)
with check (
  bucket_id='profile-avatars'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists profile_avatars_delete_own on storage.objects;
create policy profile_avatars_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id='profile-avatars'
  and (storage.foldername(name))[1]=auth.uid()::text
);

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
  '2.26.3',
  '2.26.3',
  'ncr-suite-shell-v2.26.3-visual-identities',
  now(),
  auth.uid(),
  'V2.26.3 : correction definitive du selecteur de periode, logo entreprise dans le selecteur et photo de profil utilisateur securisee.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
