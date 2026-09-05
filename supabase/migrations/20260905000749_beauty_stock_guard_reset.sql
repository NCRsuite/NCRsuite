create or replace function private.beauty_apply_stock_delta(
  p_stock_item_id uuid,
  p_quantity_delta numeric,
  p_movement_type text,
  p_notes text default null,
  p_service_id uuid default null,
  p_appointment_id uuid default null,
  p_appointment_service_item_id uuid default null,
  p_source_key text default null,
  p_created_by uuid default null,
  p_allow_negative boolean default false,
  p_reversal_of uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
declare
  v_item public.beauty_stock_items%rowtype;
  v_existing uuid;
  v_after numeric(14,3);
  v_movement_id uuid;
  v_previous_guard text;
begin
  if p_quantity_delta=0 then raise exception 'Le mouvement de stock ne peut pas être nul.'; end if;
  if p_movement_type not in ('initial','purchase','manual_in','manual_out','correction','waste','service_consumption','service_reversal') then
    raise exception 'Type de mouvement invalide.';
  end if;

  if p_source_key is not null then
    select id into v_existing
    from public.beauty_stock_movements
    where stock_item_id=p_stock_item_id and source_key=p_source_key;
    if v_existing is not null then return v_existing; end if;
  end if;

  select * into v_item
  from public.beauty_stock_items
  where id=p_stock_item_id
  for update;

  if v_item.id is null then raise exception 'Produit de stock introuvable.'; end if;

  v_after:=v_item.quantity_on_hand+p_quantity_delta;
  if not p_allow_negative and p_quantity_delta<0 and v_after<0 then
    raise exception 'Stock insuffisant : il reste % %.',v_item.quantity_on_hand,v_item.unit;
  end if;

  v_previous_guard:=coalesce(current_setting('ncr.beauty_stock_movement',true),'');
  perform set_config('ncr.beauty_stock_movement','1',true);
  update public.beauty_stock_items
  set quantity_on_hand=v_after
  where id=v_item.id;
  perform set_config('ncr.beauty_stock_movement',v_previous_guard,true);

  insert into public.beauty_stock_movements(
    organization_id,company_id,site_id,stock_item_id,service_id,appointment_id,appointment_service_item_id,
    movement_type,quantity_delta,unit,unit_cost_cents,balance_before,balance_after,notes,source_key,
    reversal_of,created_by
  ) values (
    v_item.organization_id,v_item.company_id,v_item.site_id,v_item.id,p_service_id,p_appointment_id,p_appointment_service_item_id,
    p_movement_type,p_quantity_delta,v_item.unit,v_item.unit_cost_cents,v_item.quantity_on_hand,v_after,
    nullif(trim(coalesce(p_notes,'')),''),p_source_key,p_reversal_of,p_created_by
  )
  returning id into v_movement_id;

  return v_movement_id;
end;
$function$;