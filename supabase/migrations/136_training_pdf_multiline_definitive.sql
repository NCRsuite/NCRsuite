-- NCR Suite V2.29.22 — Correctif définitif des sauts de ligne PDF Formation
-- Aucun changement métier : aligne la release après correction du rendu multi-ligne.
begin;

insert into public.platform_release_state(
  singleton, database_version, expected_frontend_version, expected_pwa_cache,
  installed_at, installed_by, notes
)
values(
  true,
  '2.29.22',
  '2.29.22',
  'ncr-suite-shell-v2.29.22-pdf-multiline-definitive',
  now(),
  auth.uid(),
  'V2.29.22 : rendu PDF Formation multi-ligne corrigé à la source ; aucun retour à la ligne n’est transmis comme glyphe à pdf-lib.'
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
