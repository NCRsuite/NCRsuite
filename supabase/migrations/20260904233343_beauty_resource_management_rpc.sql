create or replace function public.replace_beauty_resource_requirements(
  p_organization_id uuid,
  p_company_id uuid,
  p_resource_id uuid,
  p_requirements jsonb
)
returns void
language plpgsql
security invoker
set search_path=public,pg_catalog
as $function$
declare
  v_resource public.beauty_resources%rowtype;
  v_row jsonb;
  v_service_id uuid;
  v_quantity integer;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour cette enseigne.';
  end if;

  select * into v_resource
  from public.beauty_resources
  where id=p_resource_id
    and organization_id=p_organization_id
    and company_id=p_company_id;

  if v_resource.id is null then raise exception 'Ressource introuvable.'; end if;
  if p_requirements is null or jsonb_typeof(p_requirements)<>'array' then
    raise exception 'Configuration de prestations invalide.';
  end if;

  delete from public.beauty_service_resource_requirements
  where organization_id=p_organization_id
    and company_id=p_company_id
    and resource_id=p_resource_id;

  for v_row in select value from jsonb_array_elements(p_requirements)
  loop
    v_service_id:=(v_row->>'service_id')::uuid;
    v_quantity:=coalesce((v_row->>'quantity_required')::integer,1);

    insert into public.beauty_service_resource_requirements(
      organization_id,company_id,site_id,service_id,resource_id,quantity_required,created_by
    )
    values(
      p_organization_id,p_company_id,v_resource.site_id,v_service_id,p_resource_id,v_quantity,auth.uid()
    );
  end loop;
end;
$function$;

revoke all on function public.replace_beauty_resource_requirements(uuid,uuid,uuid,jsonb) from public;
grant execute on function public.replace_beauty_resource_requirements(uuid,uuid,uuid,jsonb) to authenticated,service_role;