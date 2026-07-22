begin;

-- Correctif V2.12.0 : la fonction retourne une colonne "author_type".
-- Dans le UPDATE précédent, PostgreSQL ne pouvait pas distinguer cette
-- colonne de sortie de la colonne homonyme de la table.
create or replace function public.security_client_portal_admin_messages(
  p_organization_id uuid,
  p_client_id uuid
)
returns table(
  id uuid,
  author_type text,
  author_name text,
  body text,
  read_by_client_at timestamptz,
  read_by_security_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès refusé.';
  end if;

  if not public.security_client_portal_feature_enabled(p_organization_id) then
    raise exception 'Portail client indisponible.';
  end if;

  if not exists (
    select 1
    from public.security_clients as portal_client
    where portal_client.organization_id = p_organization_id
      and portal_client.id = p_client_id
  ) then
    raise exception 'Client introuvable.';
  end if;

  update public.security_client_portal_messages as portal_message
  set read_by_security_at = coalesce(portal_message.read_by_security_at, now())
  where portal_message.organization_id = p_organization_id
    and portal_message.client_id = p_client_id
    and portal_message.author_type = 'client';

  return query
  select
    portal_message.id,
    portal_message.author_type,
    portal_message.author_name,
    portal_message.body,
    portal_message.read_by_client_at,
    portal_message.read_by_security_at,
    portal_message.created_at
  from public.security_client_portal_messages as portal_message
  where portal_message.organization_id = p_organization_id
    and portal_message.client_id = p_client_id
  order by portal_message.created_at;
end;
$$;

revoke all on function public.security_client_portal_admin_messages(uuid, uuid) from public;
grant execute on function public.security_client_portal_admin_messages(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
