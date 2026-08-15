-- NCR Suite V2.29.14 — Correctif photo prise/fin de poste + alignement release
-- La V2.29.13 corrigeait uniquement le front et n'avait pas mis à jour platform_release_state.

begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null then
    raise exception 'La table public.platform_release_state est absente. Exécutez les migrations précédentes.';
  end if;
  if to_regclass('public.security_shift_proofs') is null then
    raise exception 'La migration 127_security_premium_shift_presence.sql doit être exécutée avant la V2.29.14.';
  end if;
end $$;

insert into public.platform_release_state(
  singleton, database_version, expected_frontend_version, expected_pwa_cache, installed_at, installed_by, notes
) values (
  true,
  '2.29.14',
  '2.29.14',
  'ncr-suite-shell-v2.29.14-security-presence-photo-release-fix',
  now(),
  auth.uid(),
  'V2.29.14 : photo arrivée/sortie toujours disponible (obligatoire seulement si configurée) et alignement front/base/cache après le hotfix 2.29.13.'
)
on conflict (singleton) do update set
  database_version = excluded.database_version,
  expected_frontend_version = excluded.expected_frontend_version,
  expected_pwa_cache = excluded.expected_pwa_cache,
  installed_at = excluded.installed_at,
  installed_by = excluded.installed_by,
  notes = excluded.notes;

commit;
