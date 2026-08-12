-- NCR Suite V2.29.2 - Corrections de cadrage de la vitrine publique
-- A executer apres 115_public_ui_premium_trial_cta.sql.
-- Cette migration ne cree ni table ni fonction : elle synchronise uniquement la release attendue.

begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null then
    raise exception 'Les migrations NCR Suite precedentes doivent etre executees avant la V2.29.2.';
  end if;
end;
$$;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.29.2','2.29.2','ncr-suite-shell-v2.29.2-public-ui-spacing-fix',
  now(),auth.uid(),
  'V2.29.2 : alignement du flux public, reduction des espaces verticaux et pied de page clair avec logo officiel lisible.'
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
