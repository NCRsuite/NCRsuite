-- NCR Suite V2.13.2 — Finitions Restauration et cohérence de release
begin;

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
  '2.13.2',
  '2.13.2',
  'ncr-suite-shell-v2.13.2-restaurant-premium',
  now(),
  auth.uid(),
  'Restauration : plan de salle sans ancien numéro statique, localisation publique finalisée, erreurs publiques traduites et cache PWA V2.13.2.'
)
on conflict(singleton) do update set
  database_version = excluded.database_version,
  expected_frontend_version = excluded.expected_frontend_version,
  expected_pwa_cache = excluded.expected_pwa_cache,
  installed_at = excluded.installed_at,
  installed_by = excluded.installed_by,
  notes = excluded.notes;

commit;
