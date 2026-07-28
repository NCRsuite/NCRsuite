begin;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.28.3','2.28.3','ncr-suite-shell-v2.28.3-solution-layout-fix',
  now(),auth.uid(),
  'V2.28.3 : correction desktop des titres et icones des cartes metier, grille stabilisee et transition verticale resserree. Le rendu mobile reste inchange.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
