-- NCR Suite V2.29.1 - Refonte UI publique premium et parcours d essai controle
-- A executer apres 114_subscription_contracts_signature.sql.
-- Cette migration ne cree ni table ni fonction : elle synchronise uniquement la release attendue.

begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null then
    raise exception 'Les migrations NCR Suite precedentes doivent etre executees avant la V2.29.1.';
  end if;
end;
$$;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.29.1','2.29.1','ncr-suite-shell-v2.29.1-public-ui-premium',
  now(),auth.uid(),
  'V2.29.1 : refonte premium en mode clair des pages publiques et CTA d essai de 7 jours transmis au parcours d acces valide par NCR Suite.'
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
