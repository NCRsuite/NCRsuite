begin;

do $$
begin
  if to_regclass('public.user_profiles') is null then
    raise exception 'La table public.user_profiles est absente. Executez les migrations precedentes.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='user_profiles'
      and column_name='avatar_url'
  ) then
    raise exception 'La colonne public.user_profiles.avatar_url est absente. Executez la migration 098.';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id='profile-avatars'
  ) then
    raise exception 'Le bucket profile-avatars est absent. Executez la migration 098.';
  end if;
end
$$;

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
  '2.26.4',
  '2.26.4',
  'ncr-suite-shell-v2.26.4-avatar-crop',
  now(),
  auth.uid(),
  'V2.26.4 : recadrage manuel, zoom et affichage circulaire premium de la photo de profil.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
