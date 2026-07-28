-- NCR Suite V2.26.2 - Finition premium du cockpit
-- A executer apres 096_premium_context_switchers.sql.

begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null then
    raise exception 'La migration 084_final_production_validation.sql doit etre executee avant la V2.26.2.';
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
  '2.26.2',
  '2.26.2',
  'ncr-suite-shell-v2.26.2-premium-cockpit',
  now(),
  auth.uid(),
  'V2.26.2 : finition visuelle du cockpit Formation sur ordinateur, titres harmonises et libelles utilisateurs epures, sans modification des donnees, droits ou parcours mobiles.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
