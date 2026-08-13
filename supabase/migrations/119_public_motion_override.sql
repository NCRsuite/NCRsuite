-- NCR Suite V2.29.5 - Animations publiques forcees
-- A executer apres 118_public_flow_signal.sql.
-- Cette migration ne cree ni table ni fonction : elle synchronise uniquement la release attendue.

begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null then
    raise exception 'Les migrations NCR Suite precedentes doivent etre executees avant la V2.29.5.';
  end if;
end;
$$;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.29.5','2.29.5','ncr-suite-shell-v2.29.5-public-motion',
  now(),auth.uid(),
  'V2.29.5 : les animations des pages publiques restent actives meme lorsque la reduction des mouvements est demandee par le systeme.'
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
