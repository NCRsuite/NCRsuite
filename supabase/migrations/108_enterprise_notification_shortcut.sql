begin;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.28.4','2.28.4','ncr-suite-shell-v2.28.4-enterprise-notification-shortcut',
  now(),auth.uid(),
  'V2.28.4 : raccourci permanent vers les notifications dans tous les espaces entreprise, avec compteur non lu sur ordinateur et mobile.'
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
