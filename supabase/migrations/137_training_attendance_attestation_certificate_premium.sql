-- NCR Suite V2.29.23 — Émargements, attestations et certificats premium
-- Aucun changement destructif : aligne la release après modernisation des documents de clôture.
begin;

insert into public.platform_release_state(
  singleton, database_version, expected_frontend_version, expected_pwa_cache,
  installed_at, installed_by, notes
)
values(
  true,
  '2.29.23',
  '2.29.23',
  'ncr-suite-shell-v2.29.23-training-closure-documents-premium',
  now(),
  auth.uid(),
  'V2.29.23 : émargement premium, attestation nominative modernisée et certificat de réalisation générable depuis le dossier de session.'
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
