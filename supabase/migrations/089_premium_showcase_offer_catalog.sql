-- NCR Suite V2.23.0 - Vitrine premium et catalogue tarifaire metier
-- A executer apres 088_commercial_launch_controlled_access.sql.

begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null then
    raise exception 'La migration 084_final_production_validation.sql doit etre executee avant la V2.23.0.';
  end if;
end;
$$;

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
  '2.23.0',
  '2.23.0',
  'ncr-suite-shell-v2.23.0-premium-catalog',
  now(),
  auth.uid(),
  'V2.23.0 : vitrine premium, parcours operationnel anime, catalogue tarifaire par metier, logo public corrige et cache PWA synchronise.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
