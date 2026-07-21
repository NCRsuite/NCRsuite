-- NCR Suite V2.10.0 — Fiches recettes, déstockage automatique et rentabilité réelle
-- À exécuter après 051_restaurant_stability.sql.
-- Le module ne gère aucun encaissement : il relie uniquement la carte, les recettes,
-- les articles servis et le stock théorique du restaurant.

begin;

insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, active, sort_order
) values (
  'restaurant_recipes',
  'Fiches recettes',
  'Ingrédients, quantités, préparation, coût matière et consommation de stock par plat.',
  'restauration',
  'clipboard',
  '{restauration}',
  false,
  true,
  true,
  710
)
on conflict (module_key) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  category = excluded.category,
  icon_key = excluded.icon_key,
  compatible_business_types = excluded.compatible_business_types,
  default_enabled = excluded.default_enabled,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Répartition des fonctions par offre.
update public.domain_plan_catalog
set features = coalesce(features, '{}'::jsonb)
  || jsonb_build_object('restaurant_recipe_cards', true),
  updated_at = now()
where business_type = 'restauration'
  and plan_key in ('decouverte','essentielle','professionnelle','metier');

update public.domain_plan_catalog
set features = coalesce(features, '{}'::jsonb)
  || jsonb_build_object('restaurant_recipe_kitchen', true),
  updated_at = now()
where business_type = 'restauration'
  and plan_key in ('essentielle','professionnelle','metier');

update public.domain_plan_catalog
set features = coalesce(features, '{}'::jsonb)
  || jsonb_build_object(
    'restaurant_auto_stock_consumption', true,
    'restaurant_stock_traceability', true
  ),
  updated_at = now()
where business_type = 'restauration'
  and plan_key in ('professionnelle','metier');

insert into public.organization_modules (organization_id, module_key, enabled)
select o.id, 'restaurant_recipes', true
from public.organizations o
where o.business_type = 'restauration'
  and (o.plan <> 'metier' or not coalesce(o.metier_modules_configured, false))
on conflict (organization_id, module_key) do update set enabled = true;

-- Les allergènes portés par un ingrédient permettent de contrôler la fiche du plat.
alter table public.restaurant_stock_items
  add column if not exists allergens text[] not null default '{}';

-- Le stock théorique peut devenir négatif : cela révèle une rupture ou un inventaire
-- non mis à jour au lieu de masquer la consommation réelle.
alter table public.restaurant_stock_items
  drop constraint if exists restaurant_stock_items_quantity_check;

alter table public.restaurant_stock_items
  add constraint restaurant_stock_items_quantity_check
  check (quantity between -1000000000 and 1000000000) not valid;

alter table public.restaurant_stock_items
  validate constraint restaurant_stock_items_quantity_check;

create table if not exists public.restaurant_recipe_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  menu_item_id uuid not null,
  portions numeric(8,2) not null default 1 check (portions > 0 and portions <= 10000),
  prep_time_minutes integer not null default 0 check (prep_time_minutes between 0 and 10080),
  cooking_time_minutes integer not null default 0 check (cooking_time_minutes between 0 and 10080),
  instructions text,
  plating_notes text,
  kitchen_notes text,
  derived_allergens text[] not null default '{}',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, menu_item_id),
  constraint restaurant_recipe_menu_item_fk foreign key (organization_id, menu_item_id)
    references public.restaurant_menu_items(organization_id, id) on delete cascade
);

create table if not exists public.restaurant_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipe_id uuid not null,
  stock_item_id uuid not null,
  quantity numeric(14,4) not null check (quantity > 0 and quantity <= 100000000),
  unit text not null check (char_length(trim(unit)) between 1 and 30),
  position integer not null default 0,
  deduct_from_stock boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint restaurant_recipe_ingredient_recipe_fk foreign key (organization_id, recipe_id)
    references public.restaurant_recipe_cards(organization_id, id) on delete cascade,
  constraint restaurant_recipe_ingredient_stock_fk foreign key (organization_id, stock_item_id)
    references public.restaurant_stock_items(organization_id, id) on delete restrict
);

create index if not exists idx_restaurant_recipe_ingredients_recipe
  on public.restaurant_recipe_ingredients(organization_id, recipe_id, position, created_at);
create index if not exists idx_restaurant_recipe_ingredients_stock
  on public.restaurant_recipe_ingredients(organization_id, stock_item_id);

create table if not exists public.restaurant_stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stock_item_id uuid not null,
  recipe_id uuid,
  recipe_ingredient_id uuid,
  order_id uuid,
  order_item_id uuid,
  waste_record_id uuid,
  movement_type text not null check (movement_type in (
    'manual_adjustment','restock','inventory','waste',
    'recipe_consumption','recipe_reversal'
  )),
  quantity_delta numeric(14,4) not null check (quantity_delta <> 0),
  unit text not null,
  unit_cost_cents integer not null default 0 check (unit_cost_cents between 0 and 10000000),
  balance_before numeric(14,4) not null,
  balance_after numeric(14,4) not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  reversal_of uuid references public.restaurant_stock_movements(id) on delete set null,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint restaurant_stock_movement_stock_fk foreign key (organization_id, stock_item_id)
    references public.restaurant_stock_items(organization_id, id) on delete restrict,
  constraint restaurant_stock_movement_recipe_fk foreign key (organization_id, recipe_id)
    references public.restaurant_recipe_cards(organization_id, id) on delete set null (recipe_id),
  constraint restaurant_stock_movement_recipe_ingredient_fk foreign key (organization_id, recipe_ingredient_id)
    references public.restaurant_recipe_ingredients(organization_id, id) on delete set null (recipe_ingredient_id),
  constraint restaurant_stock_movement_order_fk foreign key (organization_id, order_id)
    references public.restaurant_orders(organization_id, id) on delete set null (order_id),
  constraint restaurant_stock_movement_order_item_fk foreign key (organization_id, order_item_id)
    references public.restaurant_order_items(organization_id, id) on delete set null (order_item_id),
  constraint restaurant_stock_movement_waste_fk foreign key (organization_id, waste_record_id)
    references public.restaurant_waste_records(organization_id, id) on delete restrict
);

create index if not exists idx_restaurant_stock_movements_stock
  on public.restaurant_stock_movements(organization_id, stock_item_id, created_at desc);
create index if not exists idx_restaurant_stock_movements_order_item
  on public.restaurant_stock_movements(organization_id, order_item_id, created_at desc)
  where order_item_id is not null;
create unique index if not exists idx_restaurant_stock_waste_record
  on public.restaurant_stock_movements(organization_id, waste_record_id)
  where waste_record_id is not null and movement_type = 'waste';
create unique index if not exists idx_restaurant_stock_active_recipe_consumption
  on public.restaurant_stock_movements(organization_id, order_item_id, recipe_ingredient_id)
  where movement_type = 'recipe_consumption' and reversed_at is null;

create or replace function public.normalize_restaurant_unit(p_unit text)
returns text
language plpgsql
immutable
as $$
declare
  v text := lower(trim(coalesce(p_unit, '')));
begin
  v := replace(replace(replace(v, 'é', 'e'), 'è', 'e'), 'ê', 'e');
  v := replace(v, '.', '');
  return case
    when v in ('mg','milligramme','milligrammes') then 'mg'
    when v in ('g','gr','gramme','grammes') then 'g'
    when v in ('kg','kilo','kilos','kilogramme','kilogrammes') then 'kg'
    when v in ('ml','millilitre','millilitres') then 'ml'
    when v in ('cl','centilitre','centilitres') then 'cl'
    when v in ('l','litre','litres') then 'l'
    when v in ('unite','unites','piece','pieces','pc','pcs') then 'unite'
    else v
  end;
end;
$$;

create or replace function public.convert_restaurant_quantity(
  p_quantity numeric,
  p_from_unit text,
  p_to_unit text
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_from text := public.normalize_restaurant_unit(p_from_unit);
  v_to text := public.normalize_restaurant_unit(p_to_unit);
  v_base numeric;
begin
  if p_quantity is null then return 0; end if;
  if v_from = v_to then return p_quantity; end if;

  if v_from in ('mg','g','kg') and v_to in ('mg','g','kg') then
    v_base := p_quantity * case v_from when 'mg' then 0.001 when 'g' then 1 else 1000 end;
    return v_base / case v_to when 'mg' then 0.001 when 'g' then 1 else 1000 end;
  end if;

  if v_from in ('ml','cl','l') and v_to in ('ml','cl','l') then
    v_base := p_quantity * case v_from when 'ml' then 1 when 'cl' then 10 else 1000 end;
    return v_base / case v_to when 'ml' then 1 when 'cl' then 10 else 1000 end;
  end if;

  if v_from = 'unite' and v_to = 'unite' then return p_quantity; end if;

  raise exception 'Unité incompatible : % vers %. Utilisez une unité compatible avec le stock.', p_from_unit, p_to_unit;
end;
$$;

create or replace function public.recalculate_restaurant_recipe(p_recipe_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe public.restaurant_recipe_cards%rowtype;
  v_cost_cents integer := 0;
  v_allergens text[] := '{}';
begin
  select * into v_recipe
  from public.restaurant_recipe_cards
  where id = p_recipe_id;

  if v_recipe.id is null then return; end if;
  if auth.uid() is not null and not public.is_restaurant_manager(v_recipe.organization_id) then
    raise exception 'Accès insuffisant.';
  end if;

  select coalesce(round(sum(
    public.convert_restaurant_quantity(i.quantity, i.unit, s.unit)
    * s.unit_cost_cents
  ) / greatest(v_recipe.portions, 0.0001)), 0)::integer
  into v_cost_cents
  from public.restaurant_recipe_ingredients i
  join public.restaurant_stock_items s
    on s.organization_id = i.organization_id and s.id = i.stock_item_id
  where i.organization_id = v_recipe.organization_id
    and i.recipe_id = v_recipe.id;

  select coalesce(array_agg(distinct allergen order by allergen), '{}'::text[])
  into v_allergens
  from public.restaurant_recipe_ingredients i
  join public.restaurant_stock_items s
    on s.organization_id = i.organization_id and s.id = i.stock_item_id
  cross join lateral unnest(coalesce(s.allergens, '{}'::text[])) as allergen_row(allergen)
  where i.organization_id = v_recipe.organization_id
    and i.recipe_id = v_recipe.id
    and trim(allergen) <> '';

  update public.restaurant_recipe_cards
  set derived_allergens = coalesce(v_allergens, '{}'::text[]),
      updated_at = now()
  where id = v_recipe.id;

  insert into public.restaurant_menu_costs(
    organization_id, menu_item_id, cost_cents, created_by
  ) values (
    v_recipe.organization_id, v_recipe.menu_item_id, greatest(v_cost_cents, 0), auth.uid()
  )
  on conflict (organization_id, menu_item_id) do update set
    cost_cents = excluded.cost_cents,
    updated_at = now();
end;
$$;

create or replace function public.restaurant_recipe_recalculate_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_restaurant_recipe(old.recipe_id);
    return old;
  end if;
  perform public.recalculate_restaurant_recipe(new.recipe_id);
  if tg_op = 'UPDATE' and old.recipe_id is distinct from new.recipe_id then
    perform public.recalculate_restaurant_recipe(old.recipe_id);
  end if;
  return new;
end;
$$;

create or replace function public.restaurant_recipe_card_recalculate_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_restaurant_recipe(new.id);
  return new;
end;
$$;

create or replace function public.restaurant_stock_recipe_recalculate_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe_id uuid;
begin
  if old.unit_cost_cents is not distinct from new.unit_cost_cents
     and old.allergens is not distinct from new.allergens
     and old.unit is not distinct from new.unit then
    return new;
  end if;

  for v_recipe_id in
    select distinct i.recipe_id
    from public.restaurant_recipe_ingredients i
    where i.organization_id = new.organization_id
      and i.stock_item_id = new.id
  loop
    perform public.recalculate_restaurant_recipe(v_recipe_id);
  end loop;
  return new;
end;
$$;

create or replace function public.list_restaurant_recipe_kitchen(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;
  if not public.organization_has_plan_feature(p_organization_id, 'restaurant_recipe_kitchen') then
    raise exception 'Les fiches recettes Cuisine sont disponibles à partir de l’offre Essentielle.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'organization_id', r.organization_id,
        'menu_item_id', r.menu_item_id,
        'portions', r.portions,
        'prep_time_minutes', r.prep_time_minutes,
        'cooking_time_minutes', r.cooking_time_minutes,
        'instructions', r.instructions,
        'plating_notes', r.plating_notes,
        'kitchen_notes', r.kitchen_notes,
        'derived_allergens', r.derived_allergens,
        'active', r.active,
        'created_at', r.created_at,
        'updated_at', r.updated_at,
        'restaurant_recipe_ingredients', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', i.id,
              'organization_id', i.organization_id,
              'recipe_id', i.recipe_id,
              'stock_item_id', i.stock_item_id,
              'quantity', i.quantity,
              'unit', i.unit,
              'position', i.position,
              'deduct_from_stock', i.deduct_from_stock,
              'notes', i.notes,
              'restaurant_stock_items', jsonb_build_object(
                'id', s.id,
                'name', s.name,
                'unit', s.unit,
                'allergens', s.allergens,
                'quantity', null,
                'unit_cost_cents', 0
              )
            ) order by i.position, i.created_at
          )
          from public.restaurant_recipe_ingredients i
          join public.restaurant_stock_items s
            on s.organization_id = i.organization_id and s.id = i.stock_item_id
          where i.organization_id = r.organization_id and i.recipe_id = r.id
        ), '[]'::jsonb)
      ) order by r.updated_at desc
    )
    from public.restaurant_recipe_cards r
    where r.organization_id = p_organization_id and r.active
  ), '[]'::jsonb);
end;
$$;

create or replace function public.save_restaurant_recipe(
  p_organization_id uuid,
  p_menu_item_id uuid,
  p_portions numeric,
  p_prep_time_minutes integer,
  p_cooking_time_minutes integer,
  p_instructions text,
  p_plating_notes text,
  p_kitchen_notes text,
  p_ingredients jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe_id uuid;
  v_ingredient record;
  v_stock public.restaurant_stock_items%rowtype;
  v_position integer := 0;
begin
  if auth.uid() is null or not public.is_restaurant_manager(p_organization_id) then
    raise exception 'Accès insuffisant.';
  end if;
  if not public.organization_has_plan_feature(p_organization_id, 'restaurant_recipe_cards') then
    raise exception 'Les fiches recettes ne sont pas incluses dans cette offre.';
  end if;
  if not exists (
    select 1 from public.restaurant_menu_items
    where organization_id = p_organization_id and id = p_menu_item_id
  ) then
    raise exception 'Plat introuvable.';
  end if;
  if p_portions is null or p_portions <= 0 or p_portions > 10000 then
    raise exception 'Le nombre de portions est invalide.';
  end if;

  insert into public.restaurant_recipe_cards(
    organization_id, menu_item_id, portions, prep_time_minutes,
    cooking_time_minutes, instructions, plating_notes, kitchen_notes,
    active, created_by
  ) values (
    p_organization_id, p_menu_item_id, p_portions,
    greatest(0, least(coalesce(p_prep_time_minutes, 0), 10080)),
    greatest(0, least(coalesce(p_cooking_time_minutes, 0), 10080)),
    nullif(trim(coalesce(p_instructions, '')), ''),
    nullif(trim(coalesce(p_plating_notes, '')), ''),
    nullif(trim(coalesce(p_kitchen_notes, '')), ''),
    true, auth.uid()
  )
  on conflict (organization_id, menu_item_id) do update set
    portions = excluded.portions,
    prep_time_minutes = excluded.prep_time_minutes,
    cooking_time_minutes = excluded.cooking_time_minutes,
    instructions = excluded.instructions,
    plating_notes = excluded.plating_notes,
    kitchen_notes = excluded.kitchen_notes,
    active = true,
    updated_at = now()
  returning id into v_recipe_id;

  delete from public.restaurant_recipe_ingredients
  where organization_id = p_organization_id and recipe_id = v_recipe_id;

  for v_ingredient in
    select *
    from jsonb_to_recordset(coalesce(p_ingredients, '[]'::jsonb)) as ingredient(
      stock_item_id uuid,
      quantity numeric,
      unit text,
      position integer,
      deduct_from_stock boolean,
      notes text
    )
  loop
    if v_ingredient.stock_item_id is null
       or v_ingredient.quantity is null
       or v_ingredient.quantity <= 0 then
      raise exception 'Un ingrédient contient une quantité invalide.';
    end if;

    select * into v_stock
    from public.restaurant_stock_items
    where organization_id = p_organization_id
      and id = v_ingredient.stock_item_id
      and status = 'active';

    if v_stock.id is null then
      raise exception 'Un ingrédient ne correspond plus à un produit actif du stock.';
    end if;

    -- Vérifie dès l’enregistrement que l’unité de la recette est compatible.
    perform public.convert_restaurant_quantity(
      v_ingredient.quantity,
      coalesce(nullif(trim(v_ingredient.unit), ''), v_stock.unit),
      v_stock.unit
    );

    insert into public.restaurant_recipe_ingredients(
      organization_id, recipe_id, stock_item_id, quantity, unit,
      position, deduct_from_stock, notes
    ) values (
      p_organization_id, v_recipe_id, v_stock.id, v_ingredient.quantity,
      coalesce(nullif(trim(v_ingredient.unit), ''), v_stock.unit),
      coalesce(v_ingredient.position, v_position),
      coalesce(v_ingredient.deduct_from_stock, true),
      nullif(trim(coalesce(v_ingredient.notes, '')), '')
    );
    v_position := v_position + 1;
  end loop;

  perform public.recalculate_restaurant_recipe(v_recipe_id);

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id)
  values (
    p_organization_id, auth.uid(), 'restaurant.recipe_saved',
    'restaurant_recipe', v_recipe_id::text
  );

  return v_recipe_id;
end;
$$;

create or replace function public.sync_restaurant_recipe_allergens(p_recipe_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe public.restaurant_recipe_cards%rowtype;
begin
  select * into v_recipe
  from public.restaurant_recipe_cards
  where id = p_recipe_id;

  if v_recipe.id is null then raise exception 'Fiche recette introuvable.'; end if;
  if not public.is_restaurant_manager(v_recipe.organization_id) then
    raise exception 'Accès insuffisant.';
  end if;

  perform public.recalculate_restaurant_recipe(v_recipe.id);
  select * into v_recipe from public.restaurant_recipe_cards where id = p_recipe_id;

  update public.restaurant_menu_items
  set allergens = coalesce(v_recipe.derived_allergens, '{}'::text[]),
      updated_at = now()
  where organization_id = v_recipe.organization_id
    and id = v_recipe.menu_item_id;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id)
  values (v_recipe.organization_id, auth.uid(), 'restaurant.recipe_allergens_synced', 'restaurant_recipe', v_recipe.id::text);
end;
$$;

create or replace function public.adjust_restaurant_stock(
  p_stock_item_id uuid,
  p_quantity_delta numeric,
  p_reason text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.restaurant_stock_items%rowtype;
  v_before numeric;
  v_after numeric;
  v_type text;
begin
  if p_quantity_delta is null or p_quantity_delta = 0 then
    raise exception 'Indiquez une variation différente de zéro.';
  end if;

  select * into v_item
  from public.restaurant_stock_items
  where id = p_stock_item_id
  for update;

  if v_item.id is null then raise exception 'Produit introuvable.'; end if;
  if not public.is_restaurant_manager(v_item.organization_id) then raise exception 'Accès insuffisant.'; end if;

  v_before := v_item.quantity;
  v_after := v_before + p_quantity_delta;
  v_type := case when p_quantity_delta > 0 then 'restock' else 'manual_adjustment' end;

  update public.restaurant_stock_items
  set quantity = v_after,
      updated_at = now()
  where id = v_item.id;

  insert into public.restaurant_stock_movements(
    organization_id, stock_item_id, movement_type, quantity_delta, unit,
    unit_cost_cents, balance_before, balance_after, notes, created_by
  ) values (
    v_item.organization_id, v_item.id, v_type, p_quantity_delta, v_item.unit,
    v_item.unit_cost_cents, v_before, v_after,
    nullif(trim(coalesce(p_reason, '')), ''), auth.uid()
  );

  return v_after;
end;
$$;

create or replace function public.consume_restaurant_order_item_stock_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe public.restaurant_recipe_cards%rowtype;
  v_ingredient record;
  v_stock public.restaurant_stock_items%rowtype;
  v_quantity numeric;
  v_before numeric;
  v_after numeric;
  v_movement record;
  v_must_reverse boolean := false;
  v_must_consume boolean := false;
begin
  if tg_op = 'INSERT' then
    v_must_consume := new.status = 'served';
  elsif tg_op = 'UPDATE' then
    -- Une sortie de l’état servi ou un changement de quantité/plat doit d’abord
    -- restaurer exactement les consommations précédentes.
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
        set quantity = v_after, updated_at = now()
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

  if v_must_consume
     and public.organization_has_plan_feature(new.organization_id, 'restaurant_auto_stock_consumption') then

    select r.* into v_recipe
    from public.restaurant_recipe_cards r
    where r.organization_id = new.organization_id
      and r.menu_item_id = new.menu_item_id
      and r.active
    limit 1;

    if v_recipe.id is null then return new; end if;

    for v_ingredient in
      select i.*, s.unit as stock_unit
      from public.restaurant_recipe_ingredients i
      join public.restaurant_stock_items s
        on s.organization_id = i.organization_id and s.id = i.stock_item_id
      where i.organization_id = new.organization_id
        and i.recipe_id = v_recipe.id
        and i.deduct_from_stock
      order by i.position, i.created_at
    loop
      if exists (
        select 1 from public.restaurant_stock_movements m
        where m.organization_id = new.organization_id
          and m.order_item_id = new.id
          and m.recipe_ingredient_id = v_ingredient.id
          and m.movement_type = 'recipe_consumption'
          and m.reversed_at is null
      ) then
        continue;
      end if;

      v_quantity := public.convert_restaurant_quantity(
        v_ingredient.quantity * new.quantity / greatest(v_recipe.portions, 0.0001),
        v_ingredient.unit,
        v_ingredient.stock_unit
      );

      select * into v_stock
      from public.restaurant_stock_items
      where organization_id = new.organization_id
        and id = v_ingredient.stock_item_id
      for update;

      if v_stock.id is null then continue; end if;
      v_before := v_stock.quantity;
      v_after := v_before - v_quantity;

      update public.restaurant_stock_items
      set quantity = v_after, updated_at = now()
      where id = v_stock.id;

      insert into public.restaurant_stock_movements(
        organization_id, stock_item_id, recipe_id, recipe_ingredient_id,
        order_id, order_item_id, movement_type, quantity_delta, unit,
        unit_cost_cents, balance_before, balance_after, notes, created_by
      ) values (
        new.organization_id, v_stock.id, v_recipe.id, v_ingredient.id,
        new.order_id, new.id, 'recipe_consumption', -v_quantity, v_stock.unit,
        v_stock.unit_cost_cents, v_before, v_after,
        format('Consommation automatique : %s × %s', new.quantity, new.item_name),
        auth.uid()
      );
    end loop;
  end if;

  return new;
end;
$$;

create or replace function public.consume_restaurant_waste_stock_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock public.restaurant_stock_items%rowtype;
  v_quantity numeric;
  v_before numeric;
  v_after numeric;
begin
  if new.stock_item_id is null then return new; end if;
  if exists (
    select 1 from public.restaurant_stock_movements
    where organization_id = new.organization_id
      and waste_record_id = new.id
      and movement_type = 'waste'
  ) then return new; end if;

  select * into v_stock
  from public.restaurant_stock_items
  where organization_id = new.organization_id and id = new.stock_item_id
  for update;

  if v_stock.id is null then return new; end if;
  v_quantity := public.convert_restaurant_quantity(new.quantity, new.unit, v_stock.unit);
  v_before := v_stock.quantity;
  v_after := v_before - v_quantity;

  update public.restaurant_stock_items
  set quantity = v_after, updated_at = now()
  where id = v_stock.id;

  insert into public.restaurant_stock_movements(
    organization_id, stock_item_id, waste_record_id, movement_type,
    quantity_delta, unit, unit_cost_cents, balance_before, balance_after,
    notes, created_by
  ) values (
    new.organization_id, v_stock.id, new.id, 'waste',
    -v_quantity, v_stock.unit, v_stock.unit_cost_cents, v_before, v_after,
    format('Perte : %s', new.reason), coalesce(new.recorded_by, auth.uid())
  );

  if coalesce(new.estimated_cost_cents, 0) = 0 then
    update public.restaurant_waste_records
    set estimated_cost_cents = greatest(0, round(v_quantity * v_stock.unit_cost_cents)::integer)
    where id = new.id;
  end if;

  return new;
end;
$$;

create or replace function public.guard_restaurant_waste_stock_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.stock_item_id is distinct from new.stock_item_id
     or old.quantity is distinct from new.quantity
     or public.normalize_restaurant_unit(old.unit) is distinct from public.normalize_restaurant_unit(new.unit) then
    raise exception 'Le produit, la quantité et l’unité d’une perte déjà enregistrée ne peuvent pas être modifiés. Utilisez un mouvement de stock compensatoire.';
  end if;
  return new;
end;
$$;

alter table public.restaurant_recipe_cards enable row level security;
alter table public.restaurant_recipe_ingredients enable row level security;
alter table public.restaurant_stock_movements enable row level security;
alter table public.restaurant_recipe_cards force row level security;
alter table public.restaurant_recipe_ingredients force row level security;
alter table public.restaurant_stock_movements force row level security;

drop policy if exists restaurant_recipe_cards_select on public.restaurant_recipe_cards;
create policy restaurant_recipe_cards_select on public.restaurant_recipe_cards for select
using (
  public.is_org_member(organization_id)
  and public.organization_has_plan_feature(organization_id, 'restaurant_recipe_cards')
);

drop policy if exists restaurant_recipe_cards_manage on public.restaurant_recipe_cards;
create policy restaurant_recipe_cards_manage on public.restaurant_recipe_cards for all
using (public.is_restaurant_manager(organization_id))
with check (
  public.is_restaurant_manager(organization_id)
  and public.organization_has_plan_feature(organization_id, 'restaurant_recipe_cards')
);

drop policy if exists restaurant_recipe_ingredients_select on public.restaurant_recipe_ingredients;
create policy restaurant_recipe_ingredients_select on public.restaurant_recipe_ingredients for select
using (
  public.is_org_member(organization_id)
  and public.organization_has_plan_feature(organization_id, 'restaurant_recipe_cards')
);

drop policy if exists restaurant_recipe_ingredients_manage on public.restaurant_recipe_ingredients;
create policy restaurant_recipe_ingredients_manage on public.restaurant_recipe_ingredients for all
using (public.is_restaurant_manager(organization_id))
with check (
  public.is_restaurant_manager(organization_id)
  and public.organization_has_plan_feature(organization_id, 'restaurant_recipe_cards')
);

drop policy if exists restaurant_stock_movements_finance on public.restaurant_stock_movements;
create policy restaurant_stock_movements_finance on public.restaurant_stock_movements for select
using (
  public.is_restaurant_finance_manager(organization_id)
  and public.organization_has_plan_feature(organization_id, 'restaurant_stock_traceability')
);

-- Toutes les écritures sont réalisées par les fonctions sécurisées ci-dessus.

-- Une perte ayant modifié le stock reste archivée : elle peut être corrigée,
-- mais pas supprimée sans laisser de trace.
drop policy if exists restaurant_waste_manager on public.restaurant_waste_records;
drop policy if exists restaurant_waste_select on public.restaurant_waste_records;
create policy restaurant_waste_select on public.restaurant_waste_records for select
using (public.is_restaurant_manager(organization_id));
drop policy if exists restaurant_waste_insert on public.restaurant_waste_records;
create policy restaurant_waste_insert on public.restaurant_waste_records for insert
with check (public.is_restaurant_manager(organization_id));
drop policy if exists restaurant_waste_update on public.restaurant_waste_records;
create policy restaurant_waste_update on public.restaurant_waste_records for update
using (public.is_restaurant_manager(organization_id))
with check (public.is_restaurant_manager(organization_id));

drop trigger if exists restaurant_recipe_cards_updated_at_trigger on public.restaurant_recipe_cards;
create trigger restaurant_recipe_cards_updated_at_trigger
before update on public.restaurant_recipe_cards
for each row execute procedure public.set_updated_at();

drop trigger if exists restaurant_recipe_ingredients_updated_at_trigger on public.restaurant_recipe_ingredients;
create trigger restaurant_recipe_ingredients_updated_at_trigger
before update on public.restaurant_recipe_ingredients
for each row execute procedure public.set_updated_at();

drop trigger if exists restaurant_recipe_ingredients_recalculate_trigger on public.restaurant_recipe_ingredients;
create trigger restaurant_recipe_ingredients_recalculate_trigger
after insert or update or delete on public.restaurant_recipe_ingredients
for each row execute procedure public.restaurant_recipe_recalculate_trigger();

drop trigger if exists restaurant_recipe_cards_recalculate_trigger on public.restaurant_recipe_cards;
create trigger restaurant_recipe_cards_recalculate_trigger
after insert or update of portions on public.restaurant_recipe_cards
for each row execute procedure public.restaurant_recipe_card_recalculate_trigger();

drop trigger if exists restaurant_stock_recipe_recalculate_trigger on public.restaurant_stock_items;
create trigger restaurant_stock_recipe_recalculate_trigger
after update of unit_cost_cents, allergens, unit on public.restaurant_stock_items
for each row execute procedure public.restaurant_stock_recipe_recalculate_trigger();

drop trigger if exists restaurant_waste_stock_fields_guard_trigger on public.restaurant_waste_records;
create trigger restaurant_waste_stock_fields_guard_trigger
before update of stock_item_id, quantity, unit on public.restaurant_waste_records
for each row execute procedure public.guard_restaurant_waste_stock_fields();

drop trigger if exists restaurant_waste_stock_consumption_trigger on public.restaurant_waste_records;
create trigger restaurant_waste_stock_consumption_trigger
after insert on public.restaurant_waste_records
for each row execute procedure public.consume_restaurant_waste_stock_trigger();

drop trigger if exists restaurant_order_items_stock_consumption_trigger on public.restaurant_order_items;
create trigger restaurant_order_items_stock_consumption_trigger
after insert or update of status, quantity, menu_item_id on public.restaurant_order_items
for each row execute procedure public.consume_restaurant_order_item_stock_trigger();

grant select, insert, update, delete on public.restaurant_recipe_cards to authenticated;
grant select, insert, update, delete on public.restaurant_recipe_ingredients to authenticated;
grant select on public.restaurant_stock_movements to authenticated;
grant execute on function public.normalize_restaurant_unit(text) to authenticated;
grant execute on function public.convert_restaurant_quantity(numeric,text,text) to authenticated;
grant execute on function public.recalculate_restaurant_recipe(uuid) to authenticated;
grant execute on function public.save_restaurant_recipe(uuid,uuid,numeric,integer,integer,text,text,text,jsonb) to authenticated;
grant execute on function public.list_restaurant_recipe_kitchen(uuid) to authenticated;
grant execute on function public.sync_restaurant_recipe_allergens(uuid) to authenticated;
grant execute on function public.adjust_restaurant_stock(uuid,numeric,text) to authenticated;

commit;
