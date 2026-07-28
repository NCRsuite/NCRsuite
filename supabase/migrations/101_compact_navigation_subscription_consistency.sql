begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null then
    raise exception 'La table public.platform_release_state est absente. Executez les migrations precedentes.';
  end if;

  if to_regclass('public.security_addon_catalog') is null then
    raise exception 'Le catalogue des modules Securite est absent. Executez les migrations precedentes.';
  end if;

  if to_regclass('public.training_module_catalog') is null then
    raise exception 'Le catalogue des modules Formation est absent. Executez les migrations precedentes.';
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
  '2.26.6',
  '2.26.6',
  'ncr-suite-shell-v2.26.6-compact-navigation',
  now(),
  auth.uid(),
  'V2.26.6 : navigation compacte par familles, recherche rapide, modules verrouilles visibles et catalogues Formation Securite harmonises.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
