-- NCR Suite V2.23.2 - Finitions de la vitrine et cadrage mobile
-- A executer apres 090_signature_showcase_release.sql.

begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null then
    raise exception 'La migration 084_final_production_validation.sql doit etre executee avant la V2.23.2.';
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
  '2.23.2',
  '2.23.2',
  'ncr-suite-shell-v2.23.2-showcase-polish',
  now(),
  auth.uid(),
  'V2.23.2 : cartes du hero reduites, survol du header, titres epures et cadrage bento mobile corrige.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
