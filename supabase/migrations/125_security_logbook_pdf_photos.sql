-- NCR Suite V2.29.10 — Photos intégrées au PDF de main courante
-- Aucun changement de données : cette migration aligne uniquement l'état de release.

begin;

do $$
begin
  if to_regclass('public.security_logbook_photos') is null
     or to_regclass('public.platform_release_state') is null then
    raise exception 'Les migrations photos de main courante doivent être exécutées avant la V2.29.10.';
  end if;
end;
$$;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.29.10','2.29.10','ncr-suite-shell-v2.29.10-security-logbook-photo-display',
  now(),auth.uid(),
  'V2.29.10 : les photos privées de main courante sont rechargées avec URL signée fraîche et intégrées au PDF de la vacation.'
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
