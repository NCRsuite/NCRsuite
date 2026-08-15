-- NCR Suite V2.29.9 — Correctif affichage et diagnostic des photos de main courante
-- Aucun changement destructif : conserve les photos et événements existants.

begin;

do $$
begin
  if to_regclass('public.security_logbook_photos') is null
     or to_regclass('public.platform_release_state') is null then
    raise exception 'La migration 123_security_logbook_photos_quick_texts.sql doit être exécutée avant la V2.29.9.';
  end if;
end;
$$;

-- Les photos restent privées. Cette policy garantit explicitement la lecture
-- d'un objet uniquement s'il est rattaché à une photo de main courante que
-- l'utilisateur courant a le droit de consulter.
create or replace function public.can_read_security_logbook_photo_object(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_catalog
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.security_logbook_photos p
      join public.security_logbook_entries e
        on e.organization_id = p.organization_id
       and e.id = p.entry_id
      where p.storage_path = p_object_name
        and (
          public.is_security_manager(p.organization_id)
          or e.agent_id = public.current_security_agent_id(p.organization_id)
        )
    );
$$;

revoke all on function public.can_read_security_logbook_photo_object(text) from public, anon;
grant execute on function public.can_read_security_logbook_photo_object(text) to authenticated;

drop policy if exists security_logbook_photos_storage_select on storage.objects;
create policy security_logbook_photos_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'security-logbook-photos'
  and public.can_read_security_logbook_photo_object(name)
);

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.29.9','2.29.9','ncr-suite-shell-v2.29.9-security-logbook-photo-display',
  now(),auth.uid(),
  'V2.29.9 : affichage fiable des photos de main courante, lecture Storage privée simplifiée et erreurs photo non masquées.'
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
