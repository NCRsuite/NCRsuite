-- NCR Suite V2.29.24 — Hotfix émargement / WinAnsi
-- Aligne la release après correction du générateur d'émargement et des caractères Unicode incompatibles PDF.
begin;

insert into public.platform_release_state(
  singleton, database_version, expected_frontend_version, expected_pwa_cache,
  installed_at, installed_by, notes
)
values(
  true,
  '2.29.24',
  '2.29.24',
  'ncr-suite-shell-v2.29.24-attendance-winansi-hotfix',
  now(),
  auth.uid(),
  'V2.29.24 : correction émargement et sécurisation des caractères WinAnsi dans les PDF Formation.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

select pg_notify('pgrst','reload schema');
commit;
