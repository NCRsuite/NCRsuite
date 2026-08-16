-- NCR Suite V2.29.20 — Documents Formation premium
-- Refonte visuelle et harmonisation des documents générés : devis, convention/contrat et convocation.
-- Aucun changement de données métier : cette migration aligne uniquement l'état de release.
begin;

insert into public.platform_release_state(
  singleton,
  database_version,
  expected_frontend_version,
  expected_pwa_cache,
  installed_at,
  installed_by,
  notes
)
values(
  true,
  '2.29.20',
  '2.29.20',
  'ncr-suite-shell-v2.29.20-training-premium-documents',
  now(),
  auth.uid(),
  'V2.29.20 : documents Formation premium — socle visuel harmonisé, devis avec bon pour accord, conventions/contrats modernisés et convocation automatique plus lisible.'
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
