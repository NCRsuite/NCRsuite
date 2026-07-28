-- NCR Suite V2.26.1 - Selecteurs premium entreprise et etablissement
-- A executer apres 095_stripe_catalog_lifecycle_paid_activation.sql.

begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null then
    raise exception 'La migration 084_final_production_validation.sql doit etre executee avant la V2.26.1.';
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
  '2.26.1',
  '2.26.1',
  'ncr-suite-shell-v2.26.1-premium-switchers',
  now(),
  auth.uid(),
  'V2.26.1 : selecteurs premium entreprise et etablissement sur ordinateur, sans modification du parcours mobile ni des donnees metier.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
