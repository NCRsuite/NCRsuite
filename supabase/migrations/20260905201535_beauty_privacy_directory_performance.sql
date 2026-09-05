create index if not exists clients_org_company_created_idx
  on public.clients(organization_id,company_id,created_at desc,id desc);

create or replace function private.beauty_client_privacy_directory(
  p_organization_id uuid,
  p_company_id uuid,
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public,private,pg_catalog
as $function$
declare
  v_limit integer:=greatest(1,least(coalesce(p_limit,100),200));
  v_offset integer:=greatest(0,coalesce(p_offset,0));
  v_search text:=nullif(lower(btrim(coalesce(p_search,''))),'');
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour consulter les données RGPD.';
  end if;

  if not exists(
    select 1
    from public.organization_companies c
    join public.organizations o on o.id=c.organization_id
    where c.id=p_company_id
      and c.organization_id=p_organization_id
      and c.status='active'
      and o.business_type='coiffure'
      and o.plan='metier'
  ) then
    raise exception 'Enseigne Beauty introuvable.';
  end if;

  with filtered as (
    select c.id,c.first_name,c.last_name,c.email,c.phone,c.status,c.created_at
    from public.clients c
    where c.organization_id=p_organization_id
      and c.company_id=p_company_id
      and c.first_name<>'Client supprimé'
      and (
        v_search is null
        or lower(concat_ws(' ',c.first_name,c.last_name,c.email,c.phone)) like '%'||v_search||'%'
      )
  ),
  page_rows as (
    select *
    from filtered
    order by created_at desc,id desc
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'total',(select count(*)::int from filtered),
    'limit',v_limit,
    'offset',v_offset,
    'items',coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id desc)
      from page_rows p
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

create or replace function public.beauty_client_privacy_directory(
  p_organization_id uuid,
  p_company_id uuid,
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = public,private,pg_catalog
as $function$
  select private.beauty_client_privacy_directory(
    p_organization_id,p_company_id,p_search,p_limit,p_offset
  );
$function$;

revoke all on function private.beauty_client_privacy_directory(uuid,uuid,text,integer,integer) from public,anon;
grant execute on function private.beauty_client_privacy_directory(uuid,uuid,text,integer,integer) to authenticated,service_role;
revoke all on function public.beauty_client_privacy_directory(uuid,uuid,text,integer,integer) from public,anon;
grant execute on function public.beauty_client_privacy_directory(uuid,uuid,text,integer,integer) to authenticated,service_role;
