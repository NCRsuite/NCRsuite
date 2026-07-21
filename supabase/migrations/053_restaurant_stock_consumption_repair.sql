-- NCR Suite V2.10.1 — Correctif déstockage automatique des plats servis
-- À exécuter après 052_restaurant_recipes_stock_profitability.sql.
-- Le correctif rend le déstockage explicite, idempotent et vérifiable depuis l'interface.

begin;

-- Répare les droits de l'offre au cas où le catalogue Supabase aurait conservé
-- une ancienne définition de la formule Professionnelle / Métier.
update public.domain_plan_catalog
set features = coalesce(features, '{}'::jsonb)
  || jsonb_build_object(
    'restaurant_recipe_cards', true,
    'restaurant_recipe_kitchen', true,
    'restaurant_auto_stock_consumption', true,
    'restaurant_stock_traceability', true
  ),
  updated_at = now()
where business_type = 'restauration'
  and plan_key in ('professionnelle', 'metier');

-- Fonction interne unique chargée d'appliquer une consommation de recette.
-- Elle est idempotente : une consommation déjà active n'est jamais rejouée.
create or replace function public.restaurant_apply_served_item_stock(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.restaurant_order_items%rowtype;
  v_recipe public.restaurant_recipe_cards%rowtype;
  v_ingredient record;
  v_stock public.restaurant_stock_items%rowtype;
  v_business_type text;
  v_plan text;
  v_org_status text;
  v_entitled boolean := false;
  v_quantity numeric;
  v_before numeric;
  v_after numeric;
  v_consumed integer := 0;
  v_existing integer := 0;
  v_missing_stock integer := 0;
  v_recipe_ingredients integer := 0;
begin
  select * into v_item
  from public.restaurant_order_items
  where id = p_item_id
  for update;

  if v_item.id is null then
    return jsonb_build_object('result', 'item_not_found', 'stock_updated', false);
  end if;

  if v_item.status <> 'served' then
    return jsonb_build_object('result', 'not_served', 'stock_updated', false);
  end if;

  select o.business_type, o.plan, o.status
  into v_business_type, v_plan, v_org_status
  from public.organizations o
  where o.id = v_item.organization_id;

  -- Le contrôle principal reste celui du catalogue. Le contrôle direct du plan
  -- évite cependant qu'une ancienne ligne de catalogue empêche silencieusement
  -- une entreprise Professionnelle déjà facturée d'utiliser la fonction.
  v_entitled := public.organization_has_plan_feature(
      v_item.organization_id,
      'restaurant_auto_stock_consumption'
    )
    or (
      v_business_type = 'restauration'
      and v_plan in ('professionnelle', 'metier')
      and v_org_status in ('trial', 'active')
    );

  if not v_entitled then
    return jsonb_build_object('result', 'feature_locked', 'stock_updated', false);
  end if;

  if v_item.menu_item_id is null then
    return jsonb_build_object('result', 'no_menu_item', 'stock_updated', false);
  end if;

  select r.* into v_recipe
  from public.restaurant_recipe_cards r
  where r.organization_id = v_item.organization_id
    and r.menu_item_id = v_item.menu_item_id
    and r.active
  order by r.updated_at desc
  limit 1;

  if v_recipe.id is null then
    return jsonb_build_object('result', 'no_recipe', 'stock_updated', false);
  end if;

  select count(*)::integer into v_recipe_ingredients
  from public.restaurant_recipe_ingredients i
  where i.organization_id = v_item.organization_id
    and i.recipe_id = v_recipe.id
    and i.deduct_from_stock;

  if v_recipe_ingredients = 0 then
    return jsonb_build_object(
      'result', 'no_deductible_ingredients',
      'recipe_id', v_recipe.id,
      'stock_updated', false
    );
  end if;

  for v_ingredient in
    select i.*, s.unit as stock_unit
    from public.restaurant_recipe_ingredients i
    join public.restaurant_stock_items s
      on s.organization_id = i.organization_id
     and s.id = i.stock_item_id
    where i.organization_id = v_item.organization_id
      and i.recipe_id = v_recipe.id
      and i.deduct_from_stock
    order by i.position, i.created_at
  loop
    if exists (
      select 1
      from public.restaurant_stock_movements m
      where m.organization_id = v_item.organization_id
        and m.order_item_id = v_item.id
        and m.recipe_ingredient_id = v_ingredient.id
        and m.movement_type = 'recipe_consumption'
        and m.reversed_at is null
    ) then
      v_existing := v_existing + 1;
      continue;
    end if;

    v_quantity := public.convert_restaurant_quantity(
      v_ingredient.quantity * v_item.quantity / greatest(v_recipe.portions, 0.0001),
      v_ingredient.unit,
      v_ingredient.stock_unit
    );

    if v_quantity is null or v_quantity <= 0 then
      continue;
    end if;

    select * into v_stock
    from public.restaurant_stock_items
    where organization_id = v_item.organization_id
      and id = v_ingredient.stock_item_id
      and status = 'active'
    for update;

    if v_stock.id is null then
      v_missing_stock := v_missing_stock + 1;
      continue;
    end if;

    v_before := v_stock.quantity;
    v_after := v_before - v_quantity;

    update public.restaurant_stock_items
    set quantity = v_after,
        updated_at = now()
    where id = v_stock.id
      and organization_id = v_item.organization_id;

    insert into public.restaurant_stock_movements(
      organization_id, stock_item_id, recipe_id, recipe_ingredient_id,
      order_id, order_item_id, movement_type, quantity_delta, unit,
      unit_cost_cents, balance_before, balance_after, notes, created_by
    ) values (
      v_item.organization_id, v_stock.id, v_recipe.id, v_ingredient.id,
      v_item.order_id, v_item.id, 'recipe_consumption', -v_quantity, v_stock.unit,
      v_stock.unit_cost_cents, v_before, v_after,
      format('Consommation automatique : %s × %s', v_item.quantity, v_item.item_name),
      auth.uid()
    );

    v_consumed := v_consumed + 1;
  end loop;

  return jsonb_build_object(
    'result', case
      when v_consumed > 0 then 'consumed'
      when v_existing > 0 then 'already_consumed'
      when v_missing_stock > 0 then 'stock_items_missing'
      else 'nothing_to_consume'
    end,
    'stock_updated', (v_consumed > 0 or v_existing > 0),
    'recipe_id', v_recipe.id,
    'recipe_ingredients', v_recipe_ingredients,
    'consumed_ingredients', v_consumed,
    'existing_movements', v_existing,
    'missing_stock_items', v_missing_stock
  );
end;
$$;

-- Le trigger conserve la restauration du stock en cas d'annulation/correction,
-- puis délègue toute nouvelle consommation à la fonction idempotente ci-dessus.
create or replace function public.consume_restaurant_order_item_stock_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock public.restaurant_stock_items%rowtype;
  v_before numeric;
  v_after numeric;
  v_movement record;
  v_must_reverse boolean := false;
  v_must_consume boolean := false;
begin
  if tg_op = 'INSERT' then
    v_must_consume := new.status = 'served';
  elsif tg_op = 'UPDATE' then
    v_must_reverse := old.status = 'served' and (
      new.status <> 'served'
      or old.quantity is distinct from new.quantity
      or old.menu_item_id is distinct from new.menu_item_id
    );
    v_must_consume := new.status = 'served' and (
      old.status is distinct from 'served'
      or old.quantity is distinct from new.quantity
      or old.menu_item_id is distinct from new.menu_item_id
    );
  end if;

  if v_must_reverse then
    for v_movement in
      select *
      from public.restaurant_stock_movements
      where organization_id = old.organization_id
        and order_item_id = old.id
        and movement_type = 'recipe_consumption'
        and reversed_at is null
      order by created_at
    loop
      select * into v_stock
      from public.restaurant_stock_items
      where organization_id = v_movement.organization_id
        and id = v_movement.stock_item_id
      for update;

      if v_stock.id is not null then
        v_before := v_stock.quantity;
        v_after := v_before - v_movement.quantity_delta;

        update public.restaurant_stock_items
        set quantity = v_after,
            updated_at = now()
        where id = v_stock.id;

        insert into public.restaurant_stock_movements(
          organization_id, stock_item_id, recipe_id, recipe_ingredient_id,
          order_id, order_item_id, movement_type, quantity_delta, unit,
          unit_cost_cents, balance_before, balance_after, notes, created_by,
          reversal_of
        ) values (
          v_movement.organization_id, v_movement.stock_item_id,
          v_movement.recipe_id, v_movement.recipe_ingredient_id,
          v_movement.order_id, v_movement.order_item_id,
          'recipe_reversal', -v_movement.quantity_delta, v_movement.unit,
          v_movement.unit_cost_cents, v_before, v_after,
          'Rétablissement après correction de l’article servi.', auth.uid(),
          v_movement.id
        );

        update public.restaurant_stock_movements
        set reversed_at = now()
        where id = v_movement.id;
      end if;
    end loop;
  end if;

  if v_must_consume then
    perform public.restaurant_apply_served_item_stock(new.id);
  end if;

  return new;
end;
$$;

-- RPC utilisée par l'écran Cuisine. Elle confirme explicitement si le stock a
-- bien été déduit, au lieu de masquer un plat sans fiche recette.
create or replace function public.serve_restaurant_order_item_with_stock(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_order uuid;
  v_result jsonb;
  v_active_movements integer := 0;
begin
  select organization_id, order_id
  into v_org, v_order
  from public.restaurant_order_items
  where id = p_item_id;

  if v_org is null or not public.is_org_member(v_org) then
    raise exception 'Article introuvable.';
  end if;

  update public.restaurant_order_items
  set status = 'served',
      served_at = coalesce(served_at, now()),
      updated_at = now()
  where id = p_item_id;

  -- Le trigger a normalement déjà agi. Cet appel supplémentaire est sans risque
  -- et sert de filet de sécurité grâce à l'idempotence de la fonction.
  v_result := public.restaurant_apply_served_item_stock(p_item_id);

  select count(*)::integer into v_active_movements
  from public.restaurant_stock_movements
  where organization_id = v_org
    and order_item_id = p_item_id
    and movement_type = 'recipe_consumption'
    and reversed_at is null;

  update public.restaurant_orders o
  set status = case
    when exists(select 1 from public.restaurant_order_items i where i.order_id=o.id and i.status='in_progress') then 'in_progress'
    when exists(select 1 from public.restaurant_order_items i where i.order_id=o.id and i.status='sent') then 'sent'
    when exists(select 1 from public.restaurant_order_items i where i.order_id=o.id and i.status='ready') then 'ready'
    when exists(select 1 from public.restaurant_order_items i where i.order_id=o.id and i.status='served') then 'served'
    else o.status end,
    updated_at = now()
  where o.id = v_order
    and o.status not in ('bill_requested', 'closed', 'canceled');

  return coalesce(v_result, '{}'::jsonb) || jsonb_build_object(
    'item_id', p_item_id,
    'active_movements', v_active_movements,
    'stock_updated', v_active_movements > 0
  );
end;
$$;

-- Rattrapage volontaire pour les articles déjà marqués servis avant ce correctif.
create or replace function public.reconcile_restaurant_served_stock(
  p_organization_id uuid,
  p_since timestamptz default (now() - interval '7 days')
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_result jsonb;
  v_scanned integer := 0;
  v_with_stock integer := 0;
  v_movements_created integer := 0;
  v_without_recipe integer := 0;
  v_locked integer := 0;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;

  for v_item in
    select id
    from public.restaurant_order_items
    where organization_id = p_organization_id
      and status = 'served'
      and coalesce(served_at, updated_at, created_at) >= coalesce(p_since, now() - interval '7 days')
    order by coalesce(served_at, updated_at, created_at)
    limit 500
  loop
    v_scanned := v_scanned + 1;
    v_result := public.restaurant_apply_served_item_stock(v_item.id);

    if coalesce((v_result ->> 'stock_updated')::boolean, false) then
      v_with_stock := v_with_stock + 1;
    end if;
    v_movements_created := v_movements_created
      + coalesce((v_result ->> 'consumed_ingredients')::integer, 0);
    if (v_result ->> 'result') in ('no_recipe', 'no_menu_item', 'no_deductible_ingredients') then
      v_without_recipe := v_without_recipe + 1;
    end if;
    if v_result ->> 'result' = 'feature_locked' then
      v_locked := v_locked + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'scanned_items', v_scanned,
    'items_with_stock', v_with_stock,
    'movements_created', v_movements_created,
    'items_without_recipe', v_without_recipe,
    'feature_locked_items', v_locked
  );
end;
$$;

-- Réinstalle explicitement le trigger au cas où une ancienne version aurait été
-- conservée par une migration partielle.
drop trigger if exists restaurant_order_items_stock_consumption_trigger
  on public.restaurant_order_items;
create trigger restaurant_order_items_stock_consumption_trigger
after insert or update of status, quantity, menu_item_id
on public.restaurant_order_items
for each row execute procedure public.consume_restaurant_order_item_stock_trigger();

revoke all on function public.restaurant_apply_served_item_stock(uuid) from public;
grant execute on function public.serve_restaurant_order_item_with_stock(uuid) to authenticated;
grant execute on function public.reconcile_restaurant_served_stock(uuid,timestamptz) to authenticated;

commit;
