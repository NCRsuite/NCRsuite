-- NCR Suite V2.29.19 — Assistant BPF guidé
-- Le moteur réglementaire reste celui de la V2.29.18.
-- Cette migration aligne l'état de release avec le nouvel assistant UX.
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
  '2.29.19',
  '2.29.19',
  'ncr-suite-shell-v2.29.19-bpf-guided-assistant',
  now(),
  auth.uid(),
  'V2.29.19 : assistant BPF guidé pour nouveaux formateurs, qualification pas à pas des sessions, stagiaires et recettes, contrôle NCR et synthèse prête à reporter sur Mon Activité Formation.'
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
