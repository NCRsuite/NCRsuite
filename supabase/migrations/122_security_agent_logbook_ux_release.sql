-- NCR Suite V2.29.7 - Hotfix UX Agent / main courante + cache bust PWA
-- A executer apres 121_security_agent_logbook_fast_entry.sql.

begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null then
    raise exception 'Les migrations NCR Suite precedentes doivent etre executees avant la V2.29.7.';
  end if;
end;
$$;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.29.7','2.29.7','ncr-suite-shell-v2.29.7-security-agent-logbook-ux',
  now(),auth.uid(),
  'V2.29.7 : saisie rapide de main courante en haut de l espace Agent et renouvellement des assets/cache PWA.'
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
