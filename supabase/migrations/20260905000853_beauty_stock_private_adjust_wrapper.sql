create or replace function private.adjust_beauty_stock(
  p_organization_id uuid,
  p_company_id uuid,
  p_stock_item_id uuid,
  p_quantity_delta numeric,
  p_movement_type text,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour ce stock.';
  end if;
  if p_movement_type not in ('purchase','manual_in','manual_out','correction','waste') then
    raise exception 'Type de mouvement manuel invalide.';
  end if;
  if not exists (
    select 1 from public.beauty_stock_items s
    where s.id=p_stock_item_id and s.organization_id=p_organization_id and s.company_id=p_company_id
  ) then raise exception 'Produit de stock introuvable.'; end if;

  v_id:=private.beauty_apply_stock_delta(
    p_stock_item_id,p_quantity_delta,p_movement_type,p_reason,null,null,null,null,auth.uid(),false,null
  );

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'beauty.stock_adjusted','beauty_stock_item',p_stock_item_id::text,
    jsonb_build_object('movement_id',v_id,'quantity_delta',p_quantity_delta,'movement_type',p_movement_type,'company_id',p_company_id)
  );

  return v_id;
end;
$function$;

create or replace function public.adjust_beauty_stock(
  p_organization_id uuid,
  p_company_id uuid,
  p_stock_item_id uuid,
  p_quantity_delta numeric,
  p_movement_type text,
  p_reason text default null
)
returns uuid
language sql
security invoker
set search_path=public,private,pg_catalog
as $function$
  select private.adjust_beauty_stock(
    p_organization_id,p_company_id,p_stock_item_id,p_quantity_delta,p_movement_type,p_reason
  );
$function$;

revoke all on function private.adjust_beauty_stock(uuid,uuid,uuid,numeric,text,text) from public,anon;
grant execute on function private.adjust_beauty_stock(uuid,uuid,uuid,numeric,text,text) to authenticated,service_role;

revoke all on function public.adjust_beauty_stock(uuid,uuid,uuid,numeric,text,text) from public,anon;
grant execute on function public.adjust_beauty_stock(uuid,uuid,uuid,numeric,text,text) to authenticated,service_role;