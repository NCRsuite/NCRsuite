begin;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.28.2','2.28.2','ncr-suite-shell-v2.28.2-solution-art-direction',
  now(),auth.uid(),
  'V2.28.2 : direction artistique des pages metier, apercus produit enrichis, compositions editoriales et responsive renforce.'
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
