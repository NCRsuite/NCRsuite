begin;

insert into public.platform_release_state (
  singleton,
  database_version,
  expected_frontend_version,
  expected_pwa_cache,
  installed_at,
  installed_by,
  notes
) values (
  true,
  '2.20.1',
  '2.20.1',
  'ncr-suite-shell-v2.20.1-training-locked-navigation',
  now(),
  auth.uid(),
  'V2.20.1 : modules Formation verrouilles visibles dans les navigations ordinateur et mobile, ecran de montee en gamme et acces direct au module concerne dans l abonnement.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;
