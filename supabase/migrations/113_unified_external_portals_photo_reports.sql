begin;

-- Cette version reutilise les roles et politiques deja valides. La migration
-- synchronise uniquement l'etat de release attendu par les controles de production.
insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.28.9','2.28.9','ncr-suite-shell-v2.28.9-unified-external-portals-photo-reports',
  now(),auth.uid(),
  'V2.28.9 : espaces externes Client/Agent unifies pour Securite et Nettoyage, photos integrees aux rapports PDF.'
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
