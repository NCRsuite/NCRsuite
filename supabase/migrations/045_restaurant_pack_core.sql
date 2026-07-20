-- NCR Suite V2.8.0 — Pack Restauration
-- À exécuter après 044_cleaning_protocols_profitability.sql.
-- Active le domaine Restauration et installe le socle Découverte,
-- les fonctions Essentielle (équipe, salle, menu QR, hygiène)
-- et les contrôles Professionnelle (coûts, pertes, statistiques).

begin;

update public.business_domain_catalog
set launch_status = 'active', active = true, updated_at = now()
where business_type = 'restauration';

insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, active, sort_order
) values
  ('restaurant_staff_planning', 'Planning équipe', 'Services et horaires des employés du restaurant.', 'restauration', 'calendar', '{restauration}', false, true, true, 702),
  ('restaurant_staff', 'Employés', 'Fiches, fonctions et disponibilité de l’équipe.', 'restauration', 'users', '{restauration}', false, true, true, 704),
  ('restaurant_employee_portal', 'Espace employés', 'Planning personnel et accès opérationnel au service.', 'restauration', 'utensils', '{restauration}', false, false, true, 706)
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

create table if not exists public.restaurant_employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name text not null check (char_length(trim(last_name)) between 1 and 100),
  role_code text not null default 'server' check (role_code in ('manager','server','cook','host','dishwasher','other')),
  email text,
  phone text,
  weekly_hours numeric(5,2) not null default 35 check (weekly_hours between 0 and 80),
  linked_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create unique index if not exists idx_restaurant_employees_linked_user on public.restaurant_employees(organization_id, linked_user_id) where linked_user_id is not null;

create table if not exists public.restaurant_shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  position_label text,
  notes text,
  status text not null default 'planned' check (status in ('planned','completed','canceled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint restaurant_shifts_employee_fk foreign key (organization_id, employee_id)
    references public.restaurant_employees(organization_id, id) on delete restrict,
  constraint restaurant_shift_dates_check check (ends_at > starts_at)
);

create table if not exists public.restaurant_menu_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  position integer not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, name)
);

create table if not exists public.restaurant_menu_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description_fr text,
  description_en text,
  description_es text,
  description_it text,
  price_cents integer not null default 0 check (price_cents between 0 and 10000000),
  allergens text[] not null default '{}',
  vegetarian boolean not null default false,
  vegan boolean not null default false,
  available boolean not null default true,
  featured boolean not null default false,
  image_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint restaurant_menu_item_category_fk foreign key (organization_id, category_id)
    references public.restaurant_menu_categories(organization_id, id) on delete restrict
);

-- Les coûts matière sont séparés de la carte pour ne jamais être exposés aux employés.
create table if not exists public.restaurant_menu_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  menu_item_id uuid not null,
  cost_cents integer not null default 0 check (cost_cents between 0 and 10000000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, menu_item_id),
  constraint restaurant_menu_cost_item_fk foreign key (organization_id, menu_item_id)
    references public.restaurant_menu_items(organization_id, id) on delete cascade
);

create table if not exists public.restaurant_suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  contact_name text,
  email text,
  phone text,
  notes text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.restaurant_stock_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 160),
  category text,
  unit text not null default 'unité',
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  minimum_quantity numeric(12,2) not null default 0 check (minimum_quantity >= 0),
  unit_cost_cents integer not null default 0 check (unit_cost_cents between 0 and 10000000),
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint restaurant_stock_supplier_fk foreign key (organization_id, supplier_id)
    references public.restaurant_suppliers(organization_id, id) on delete set null (supplier_id)
);

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  area text not null default 'Salle principale',
  capacity integer not null default 2 check (capacity between 1 and 30),
  position_x numeric(5,2) not null default 10 check (position_x between 0 and 95),
  position_y numeric(5,2) not null default 10 check (position_y between 0 and 95),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, name)
);

create table if not exists public.restaurant_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  table_id uuid,
  source text not null default 'manual' check (source in ('manual','online')),
  guest_name text not null check (char_length(trim(guest_name)) between 1 and 160),
  guest_email text,
  guest_phone text,
  party_size integer not null default 2 check (party_size between 1 and 100),
  reservation_at timestamptz not null,
  duration_minutes integer not null default 120 check (duration_minutes between 30 and 360),
  status text not null default 'pending' check (status in ('pending','confirmed','seated','completed','canceled','no_show')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint restaurant_reservation_table_fk foreign key (organization_id, table_id)
    references public.restaurant_tables(organization_id, id) on delete set null (table_id)
);

create table if not exists public.restaurant_temperature_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid,
  equipment_name text not null,
  temperature_celsius numeric(6,2) not null check (temperature_celsius between -100 and 300),
  minimum_celsius numeric(6,2),
  maximum_celsius numeric(6,2),
  compliant boolean not null,
  notes text,
  logged_by uuid references auth.users(id) on delete set null,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint restaurant_temperature_employee_fk foreign key (organization_id, employee_id)
    references public.restaurant_employees(organization_id, id) on delete set null (employee_id)
);

create table if not exists public.restaurant_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  checklist_type text not null check (checklist_type in ('opening','closing','cleaning')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.restaurant_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null,
  label text not null,
  required boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint restaurant_checklist_item_template_fk foreign key (organization_id, template_id)
    references public.restaurant_checklist_templates(organization_id, id) on delete cascade
);

create table if not exists public.restaurant_checklist_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null,
  completed_item_ids uuid[] not null default '{}',
  status text not null default 'completed' check (status in ('in_progress','completed','non_compliant')),
  notes text,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint restaurant_checklist_run_template_fk foreign key (organization_id, template_id)
    references public.restaurant_checklist_templates(organization_id, id) on delete restrict
);

create table if not exists public.restaurant_waste_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stock_item_id uuid,
  item_name text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null default 'unité',
  reason text not null,
  estimated_cost_cents integer not null default 0 check (estimated_cost_cents between 0 and 10000000),
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint restaurant_waste_stock_fk foreign key (organization_id, stock_item_id)
    references public.restaurant_stock_items(organization_id, id) on delete set null (stock_item_id)
);

create index if not exists idx_restaurant_employees_org on public.restaurant_employees(organization_id, status, last_name, first_name);
create index if not exists idx_restaurant_shifts_org_dates on public.restaurant_shifts(organization_id, starts_at, ends_at);
create index if not exists idx_restaurant_shifts_employee_dates on public.restaurant_shifts(organization_id, employee_id, starts_at, ends_at);
create index if not exists idx_restaurant_menu_org_category on public.restaurant_menu_items(organization_id, category_id, available);
create index if not exists idx_restaurant_reservations_org_date on public.restaurant_reservations(organization_id, reservation_at, status);
create index if not exists idx_restaurant_stock_org on public.restaurant_stock_items(organization_id, status, name);
create index if not exists idx_restaurant_temperature_org_date on public.restaurant_temperature_logs(organization_id, logged_at desc);
create index if not exists idx_restaurant_waste_org_date on public.restaurant_waste_records(organization_id, recorded_at desc);

create or replace function public.is_restaurant_manager(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(p_organization_id, array['owner','admin','manager']);
$$;

create or replace function public.is_restaurant_finance_manager(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(p_organization_id, array['owner','admin']);
$$;

create or replace function public.current_restaurant_employee_id(p_organization_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select e.id from public.restaurant_employees e
  join public.organization_members m on m.organization_id=e.organization_id and m.user_id=e.linked_user_id and m.status='active'
  where e.organization_id=p_organization_id and e.linked_user_id=auth.uid() and e.status='active'
  limit 1;
$$;

create or replace function public.current_restaurant_employee(p_organization_id uuid)
returns table(id uuid,organization_id uuid,first_name text,last_name text,role_code text,email text,phone text,weekly_hours numeric,linked_user_id uuid,status text)
language sql stable security definer set search_path = public as $$
  select e.id,e.organization_id,e.first_name,e.last_name,e.role_code,e.email,e.phone,e.weekly_hours,e.linked_user_id,e.status
  from public.restaurant_employees e
  where e.organization_id=p_organization_id and e.id=public.current_restaurant_employee_id(p_organization_id)
  limit 1;
$$;

grant execute on function public.current_restaurant_employee(uuid) to authenticated;

create or replace function public.restaurant_team_member_limit(p_organization_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select case o.plan when 'decouverte' then 0 when 'essentielle' then 10 when 'professionnelle' then 50 else coalesce(o.metier_member_limit,100) end
  from public.organizations o where o.id=p_organization_id and o.business_type='restauration';
$$;

create or replace function public.validate_restaurant_record()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.organizations o
    where o.id=new.organization_id and o.business_type='restauration' and o.status in ('trial','active')
  ) then raise exception 'Ce module est réservé à un espace Restauration actif.'; end if;

  if tg_table_name in ('restaurant_employees','restaurant_shifts') and not public.organization_has_plan_feature(new.organization_id,'restaurant_staff_planning') then raise exception 'Le planning équipe n’est pas inclus dans cette offre.'; end if;
  if tg_table_name in ('restaurant_menu_categories','restaurant_menu_items') and not public.organization_has_plan_feature(new.organization_id,'restaurant_menu') then raise exception 'La carte restaurant n’est pas incluse dans cette offre.'; end if;
  if tg_table_name='restaurant_suppliers' and not public.organization_has_plan_feature(new.organization_id,'restaurant_suppliers') then raise exception 'Les fournisseurs ne sont pas inclus dans cette offre.'; end if;
  if tg_table_name='restaurant_stock_items' and not public.organization_has_plan_feature(new.organization_id,'restaurant_basic_stock') then raise exception 'Les stocks ne sont pas inclus dans cette offre.'; end if;
  if tg_table_name='restaurant_reservations' and not public.organization_has_plan_feature(new.organization_id,'restaurant_manual_reservations') then raise exception 'Les réservations ne sont pas incluses dans cette offre.'; end if;
  if tg_table_name='restaurant_tables' and not public.organization_has_plan_feature(new.organization_id,'restaurant_floor_plan') then raise exception 'Le plan de salle nécessite l’offre Essentielle.'; end if;
  if tg_table_name in ('restaurant_temperature_logs','restaurant_checklist_templates','restaurant_checklist_items','restaurant_checklist_runs') and not public.organization_has_plan_feature(new.organization_id,'restaurant_temperatures') then raise exception 'Le suivi hygiène nécessite l’offre Essentielle.'; end if;
  if tg_table_name='restaurant_menu_costs' and not public.organization_has_plan_feature(new.organization_id,'restaurant_food_cost') then raise exception 'Le coût matière nécessite l’offre Professionnelle.'; end if;
  if tg_table_name='restaurant_waste_records' and not public.organization_has_plan_feature(new.organization_id,'restaurant_waste') then raise exception 'Le suivi des pertes nécessite l’offre Professionnelle.'; end if;
  return new;
end;
$$;

create or replace function public.validate_restaurant_shift()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.ends_at<=new.starts_at then raise exception 'La fin doit être postérieure au début.'; end if;
  if not exists(select 1 from public.restaurant_employees e where e.organization_id=new.organization_id and e.id=new.employee_id and e.status='active') then raise exception 'Employé introuvable ou inactif.'; end if;
  if new.status<>'canceled' and exists(
    select 1 from public.restaurant_shifts s
    where s.organization_id=new.organization_id and s.employee_id=new.employee_id
      and (tg_op='INSERT' or s.id<>new.id) and s.status<>'canceled'
      and tstzrange(s.starts_at,s.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)')
  ) then raise exception 'Cet employé possède déjà un service sur ce créneau.'; end if;
  return new;
end;
$$;

create or replace function public.validate_restaurant_menu_item()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists(select 1 from public.restaurant_menu_categories c where c.organization_id=new.organization_id and c.id=new.category_id and c.active) then raise exception 'Catégorie introuvable ou inactive.'; end if;
  if (new.description_en is not null or new.description_es is not null or new.description_it is not null)
     and not public.organization_has_plan_feature(new.organization_id,'restaurant_multilingual_qr_menu') then
    raise exception 'Les traductions du menu nécessitent l’offre Essentielle.';
  end if;
  return new;
end;
$$;

create or replace function public.validate_restaurant_stock_item()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.unit_cost_cents>0 and not public.organization_has_plan_feature(new.organization_id,'restaurant_advanced_stock') then
    raise exception 'Les coûts et stocks avancés nécessitent l’offre Professionnelle.';
  end if;
  return new;
end;
$$;

create or replace function public.assign_restaurant_employee_context()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_table_name='restaurant_temperature_logs' and not public.is_restaurant_manager(new.organization_id) then
    new.employee_id:=public.current_restaurant_employee_id(new.organization_id);
    if new.employee_id is null then raise exception 'Aucune fiche employé n’est liée à ce compte.'; end if;
  end if;
  return new;
end;
$$;

-- Dates automatiques et contrôles d’offre.
do $$ declare t text; begin
  foreach t in array array['restaurant_employees','restaurant_shifts','restaurant_menu_categories','restaurant_menu_items','restaurant_menu_costs','restaurant_suppliers','restaurant_stock_items','restaurant_tables','restaurant_reservations','restaurant_checklist_templates'] loop
    execute format('drop trigger if exists %I on public.%I','set_'||t||'_updated_at',t);
    execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()','set_'||t||'_updated_at',t);
  end loop;
  foreach t in array array['restaurant_employees','restaurant_shifts','restaurant_menu_categories','restaurant_menu_items','restaurant_menu_costs','restaurant_suppliers','restaurant_stock_items','restaurant_tables','restaurant_reservations','restaurant_temperature_logs','restaurant_checklist_templates','restaurant_checklist_items','restaurant_checklist_runs','restaurant_waste_records'] loop
    execute format('drop trigger if exists %I on public.%I','validate_'||t||'_offer',t);
    execute format('create trigger %I before insert or update on public.%I for each row execute procedure public.validate_restaurant_record()','validate_'||t||'_offer',t);
  end loop;
end $$;

drop trigger if exists validate_restaurant_shift_trigger on public.restaurant_shifts;
create trigger validate_restaurant_shift_trigger before insert or update on public.restaurant_shifts for each row execute procedure public.validate_restaurant_shift();
drop trigger if exists validate_restaurant_menu_item_trigger on public.restaurant_menu_items;
create trigger validate_restaurant_menu_item_trigger before insert or update on public.restaurant_menu_items for each row execute procedure public.validate_restaurant_menu_item();
drop trigger if exists validate_restaurant_stock_item_trigger on public.restaurant_stock_items;
create trigger validate_restaurant_stock_item_trigger before insert or update on public.restaurant_stock_items for each row execute procedure public.validate_restaurant_stock_item();
drop trigger if exists assign_restaurant_employee_context_trigger on public.restaurant_temperature_logs;
create trigger assign_restaurant_employee_context_trigger before insert on public.restaurant_temperature_logs for each row execute procedure public.assign_restaurant_employee_context();

-- RLS.
do $$ declare t text; begin
  foreach t in array array['restaurant_employees','restaurant_shifts','restaurant_menu_categories','restaurant_menu_items','restaurant_menu_costs','restaurant_suppliers','restaurant_stock_items','restaurant_tables','restaurant_reservations','restaurant_temperature_logs','restaurant_checklist_templates','restaurant_checklist_items','restaurant_checklist_runs','restaurant_waste_records'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

-- Employés et planning.
drop policy if exists restaurant_employees_select on public.restaurant_employees;
create policy restaurant_employees_select on public.restaurant_employees for select using (public.is_restaurant_manager(organization_id) or linked_user_id=auth.uid());
drop policy if exists restaurant_employees_manage on public.restaurant_employees;
create policy restaurant_employees_manage on public.restaurant_employees for all using (public.is_restaurant_manager(organization_id)) with check (public.is_restaurant_manager(organization_id));

drop policy if exists restaurant_shifts_select on public.restaurant_shifts;
create policy restaurant_shifts_select on public.restaurant_shifts for select using (public.is_restaurant_manager(organization_id) or employee_id=public.current_restaurant_employee_id(organization_id));
drop policy if exists restaurant_shifts_manage on public.restaurant_shifts;
create policy restaurant_shifts_manage on public.restaurant_shifts for all using (public.is_restaurant_manager(organization_id)) with check (public.is_restaurant_manager(organization_id));

-- Carte lisible par tous les membres actifs ; modification par l’exploitation.
drop policy if exists restaurant_menu_categories_select on public.restaurant_menu_categories;
create policy restaurant_menu_categories_select on public.restaurant_menu_categories for select using (public.is_org_member(organization_id));
drop policy if exists restaurant_menu_categories_manage on public.restaurant_menu_categories;
create policy restaurant_menu_categories_manage on public.restaurant_menu_categories for all using (public.is_restaurant_manager(organization_id)) with check (public.is_restaurant_manager(organization_id));
drop policy if exists restaurant_menu_items_select on public.restaurant_menu_items;
create policy restaurant_menu_items_select on public.restaurant_menu_items for select using (public.is_org_member(organization_id));
drop policy if exists restaurant_menu_items_manage on public.restaurant_menu_items;
create policy restaurant_menu_items_manage on public.restaurant_menu_items for all using (public.is_restaurant_manager(organization_id)) with check (public.is_restaurant_manager(organization_id));

drop policy if exists restaurant_menu_costs_finance on public.restaurant_menu_costs;
create policy restaurant_menu_costs_finance on public.restaurant_menu_costs for all using (public.is_restaurant_finance_manager(organization_id)) with check (public.is_restaurant_finance_manager(organization_id));

-- Fournisseurs et stocks : exploitation uniquement.
drop policy if exists restaurant_suppliers_manager on public.restaurant_suppliers;
create policy restaurant_suppliers_manager on public.restaurant_suppliers for all using (public.is_restaurant_manager(organization_id)) with check (public.is_restaurant_manager(organization_id));
drop policy if exists restaurant_stock_manager on public.restaurant_stock_items;
create policy restaurant_stock_manager on public.restaurant_stock_items for all using (public.is_restaurant_manager(organization_id)) with check (public.is_restaurant_manager(organization_id));

-- Salle, réservations et hygiène accessibles aux membres du service.
drop policy if exists restaurant_tables_select on public.restaurant_tables;
create policy restaurant_tables_select on public.restaurant_tables for select using (public.is_org_member(organization_id));
drop policy if exists restaurant_tables_manage on public.restaurant_tables;
create policy restaurant_tables_manage on public.restaurant_tables for all using (public.is_restaurant_manager(organization_id)) with check (public.is_restaurant_manager(organization_id));

drop policy if exists restaurant_reservations_select on public.restaurant_reservations;
create policy restaurant_reservations_select on public.restaurant_reservations for select using (public.is_org_member(organization_id));
drop policy if exists restaurant_reservations_insert on public.restaurant_reservations;
create policy restaurant_reservations_insert on public.restaurant_reservations for insert with check (public.is_org_member(organization_id));
drop policy if exists restaurant_reservations_update on public.restaurant_reservations;
create policy restaurant_reservations_update on public.restaurant_reservations for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists restaurant_reservations_delete on public.restaurant_reservations;
create policy restaurant_reservations_delete on public.restaurant_reservations for delete using (public.has_org_role(organization_id,array['owner','admin']));

drop policy if exists restaurant_temperature_select on public.restaurant_temperature_logs;
create policy restaurant_temperature_select on public.restaurant_temperature_logs for select using (public.is_org_member(organization_id));
drop policy if exists restaurant_temperature_insert on public.restaurant_temperature_logs;
create policy restaurant_temperature_insert on public.restaurant_temperature_logs for insert with check (public.is_org_member(organization_id));
drop policy if exists restaurant_temperature_update on public.restaurant_temperature_logs;
create policy restaurant_temperature_update on public.restaurant_temperature_logs for update using (public.is_restaurant_manager(organization_id)) with check (public.is_restaurant_manager(organization_id));

drop policy if exists restaurant_checklist_templates_select on public.restaurant_checklist_templates;
create policy restaurant_checklist_templates_select on public.restaurant_checklist_templates for select using (public.is_org_member(organization_id));
drop policy if exists restaurant_checklist_templates_manage on public.restaurant_checklist_templates;
create policy restaurant_checklist_templates_manage on public.restaurant_checklist_templates for all using (public.is_restaurant_manager(organization_id)) with check (public.is_restaurant_manager(organization_id));
drop policy if exists restaurant_checklist_items_select on public.restaurant_checklist_items;
create policy restaurant_checklist_items_select on public.restaurant_checklist_items for select using (public.is_org_member(organization_id));
drop policy if exists restaurant_checklist_items_manage on public.restaurant_checklist_items;
create policy restaurant_checklist_items_manage on public.restaurant_checklist_items for all using (public.is_restaurant_manager(organization_id)) with check (public.is_restaurant_manager(organization_id));
drop policy if exists restaurant_checklist_runs_select on public.restaurant_checklist_runs;
create policy restaurant_checklist_runs_select on public.restaurant_checklist_runs for select using (public.is_org_member(organization_id));
drop policy if exists restaurant_checklist_runs_insert on public.restaurant_checklist_runs;
create policy restaurant_checklist_runs_insert on public.restaurant_checklist_runs for insert with check (public.is_org_member(organization_id));

drop policy if exists restaurant_waste_manager on public.restaurant_waste_records;
create policy restaurant_waste_manager on public.restaurant_waste_records for all using (public.is_restaurant_manager(organization_id)) with check (public.is_restaurant_manager(organization_id));

grant select,insert,update,delete on public.restaurant_employees to authenticated;
grant select,insert,update,delete on public.restaurant_shifts to authenticated;
grant select,insert,update,delete on public.restaurant_menu_categories to authenticated;
grant select,insert,update,delete on public.restaurant_menu_items to authenticated;
grant select,insert,update,delete on public.restaurant_menu_costs to authenticated;
grant select,insert,update,delete on public.restaurant_suppliers to authenticated;
grant select,insert,update,delete on public.restaurant_stock_items to authenticated;
grant select,insert,update,delete on public.restaurant_tables to authenticated;
grant select,insert,update,delete on public.restaurant_reservations to authenticated;
grant select,insert,update,delete on public.restaurant_temperature_logs to authenticated;
grant select,insert,update,delete on public.restaurant_checklist_templates to authenticated;
grant select,insert,update,delete on public.restaurant_checklist_items to authenticated;
grant select,insert,update,delete on public.restaurant_checklist_runs to authenticated;
grant select,insert,update,delete on public.restaurant_waste_records to authenticated;

-- Accès équipe Restauration.
alter table public.organization_invitations add column if not exists restaurant_employee_id uuid;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='organization_invitations_restaurant_employee_fk') then
    alter table public.organization_invitations add constraint organization_invitations_restaurant_employee_fk foreign key (restaurant_employee_id) references public.restaurant_employees(id) on delete set null;
  end if;
end $$;
create index if not exists idx_org_invitations_restaurant_employee on public.organization_invitations(organization_id,restaurant_employee_id) where restaurant_employee_id is not null;

create or replace function public.restaurant_team_plan_summary(p_organization_id uuid)
returns table(plan text,member_limit integer,active_members integer,pending_invitations integer,available_seats integer,invitations_enabled boolean,manager_role_enabled boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_plan text; v_limit integer; v_active integer; v_pending integer;
begin
  if not public.is_restaurant_manager(p_organization_id) then raise exception 'Accès insuffisant.'; end if;
  select o.plan,public.restaurant_team_member_limit(o.id) into v_plan,v_limit from public.organizations o where o.id=p_organization_id and o.business_type='restauration';
  select count(*)::integer into v_active from public.restaurant_employees e join public.organization_members m on m.organization_id=e.organization_id and m.user_id=e.linked_user_id and m.status='active' where e.organization_id=p_organization_id and e.linked_user_id is not null and e.status='active';
  select count(*)::integer into v_pending from public.organization_invitations where organization_id=p_organization_id and restaurant_employee_id is not null and status='pending' and expires_at>now();
  return query select v_plan,v_limit,v_active,v_pending,greatest(v_limit-v_active-v_pending,0),public.organization_has_plan_feature(p_organization_id,'team_access'),public.organization_has_plan_feature(p_organization_id,'manager_role');
end;
$$;

create or replace function public.list_restaurant_team_members(p_organization_id uuid)
returns table(user_id uuid,email text,full_name text,role text,status text,staff_id uuid,staff_name text,joined_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_restaurant_manager(p_organization_id) then raise exception 'Accès insuffisant.'; end if;
  return query select m.user_id,u.email::text,coalesce(nullif(trim(p.full_name),''),concat_ws(' ',e.first_name,e.last_name),split_part(u.email::text,'@',1))::text,m.role,m.status,e.id,concat_ws(' ',e.first_name,e.last_name)::text,m.created_at
  from public.organization_members m join auth.users u on u.id=m.user_id left join public.user_profiles p on p.id=m.user_id left join public.restaurant_employees e on e.organization_id=m.organization_id and e.linked_user_id=m.user_id
  where m.organization_id=p_organization_id order by case m.role when 'owner' then 0 when 'admin' then 1 when 'manager' then 2 else 3 end,coalesce(e.last_name,p.full_name,u.email::text);
end;
$$;

create or replace function public.list_restaurant_team_invitations(p_organization_id uuid)
returns table(invitation_id uuid,email text,role text,staff_id uuid,staff_name text,status text,expires_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_restaurant_manager(p_organization_id) then raise exception 'Accès insuffisant.'; end if;
  return query select i.id,i.email,i.role,i.restaurant_employee_id,concat_ws(' ',e.first_name,e.last_name)::text,case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,i.expires_at,i.created_at
  from public.organization_invitations i left join public.restaurant_employees e on e.organization_id=i.organization_id and e.id=i.restaurant_employee_id
  where i.organization_id=p_organization_id and i.restaurant_employee_id is not null and i.status in ('pending','expired') order by i.created_at desc;
end;
$$;

create or replace function public.create_restaurant_team_invitation(p_organization_id uuid,p_email text,p_restaurant_employee_id uuid,p_role text default 'employee')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_used integer; v_email text:=lower(trim(coalesce(p_email,''))); v_token text; v_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then raise exception 'Seul le propriétaire ou un administrateur peut gérer les accès.'; end if;
  if not public.organization_has_plan_feature(p_organization_id,'team_access') then raise exception 'Les accès employés nécessitent l’offre Essentielle.'; end if;
  if p_role not in ('employee','manager') then raise exception 'Rôle invalide.'; end if;
  if p_role='manager' and not public.organization_has_plan_feature(p_organization_id,'manager_role') then raise exception 'Le rôle Manager nécessite l’offre Professionnelle.'; end if;
  if not exists(select 1 from public.restaurant_employees where organization_id=p_organization_id and id=p_restaurant_employee_id and status='active' and linked_user_id is null) then raise exception 'Employé introuvable, inactif ou déjà connecté.'; end if;
  select public.restaurant_team_member_limit(p_organization_id) into v_limit;
  select (select count(*) from public.restaurant_employees e join public.organization_members m on m.organization_id=e.organization_id and m.user_id=e.linked_user_id and m.status='active' where e.organization_id=p_organization_id and e.linked_user_id is not null and e.status='active') + (select count(*) from public.organization_invitations where organization_id=p_organization_id and restaurant_employee_id is not null and status='pending' and expires_at>now()) into v_used;
  if v_used>=v_limit then raise exception 'La limite de % employé(s) connecté(s) est atteinte.',v_limit; end if;
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.organization_invitations(organization_id,email,role,staff_id,security_agent_id,cleaning_agent_id,restaurant_employee_id,token_hash,expires_at,invited_by)
  values(p_organization_id,v_email,p_role,null,null,null,p_restaurant_employee_id,extensions.digest(v_token,'sha256'),now()+interval '7 days',auth.uid()) returning id into v_id;
  perform public.enqueue_team_invitation_email(v_id,v_token,false); return v_id;
end;
$$;

create or replace function public.set_restaurant_team_member_role(p_organization_id uuid,p_user_id uuid,p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then raise exception 'Accès insuffisant.'; end if;
  if p_role not in ('employee','manager') then raise exception 'Rôle invalide.'; end if;
  if p_role='manager' and not public.organization_has_plan_feature(p_organization_id,'manager_role') then raise exception 'Le rôle Manager nécessite l’offre Professionnelle.'; end if;
  if not exists(select 1 from public.restaurant_employees where organization_id=p_organization_id and linked_user_id=p_user_id) then raise exception 'Aucune fiche employé liée à cet accès.'; end if;
  update public.organization_members set role=p_role where organization_id=p_organization_id and user_id=p_user_id and role<>'owner';
end;
$$;

create or replace function public.set_restaurant_team_member_status(p_organization_id uuid,p_user_id uuid,p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then raise exception 'Accès insuffisant.'; end if;
  if p_status not in ('active','disabled') then raise exception 'Statut invalide.'; end if;
  if p_user_id=auth.uid() then raise exception 'Vous ne pouvez pas suspendre votre propre accès.'; end if;
  if not exists(select 1 from public.restaurant_employees where organization_id=p_organization_id and linked_user_id=p_user_id) then raise exception 'Aucune fiche employé liée à cet accès.'; end if;
  update public.organization_members set status=p_status where organization_id=p_organization_id and user_id=p_user_id and role<>'owner';
end;
$$;

grant execute on function public.restaurant_team_plan_summary(uuid) to authenticated;
grant execute on function public.list_restaurant_team_members(uuid) to authenticated;
grant execute on function public.list_restaurant_team_invitations(uuid) to authenticated;
grant execute on function public.create_restaurant_team_invitation(uuid,text,uuid,text) to authenticated;
grant execute on function public.set_restaurant_team_member_role(uuid,uuid,text) to authenticated;
grant execute on function public.set_restaurant_team_member_status(uuid,uuid,text) to authenticated;

-- Invitation générique étendue à la Restauration.
create or replace function public.get_team_invitation(p_token text)
returns table(organization_name text,organization_color text,invited_email text,invited_role text,staff_name text,invitation_status text,expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.name,o.primary_color,i.email,i.role,coalesce(s.display_name,concat_ws(' ',sa.first_name,sa.last_name),concat_ws(' ',ca.first_name,ca.last_name),concat_ws(' ',re.first_name,re.last_name)),case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,i.expires_at
  from public.organization_invitations i join public.organizations o on o.id=i.organization_id
  left join public.staff s on s.organization_id=i.organization_id and s.id=i.staff_id
  left join public.security_agents sa on sa.organization_id=i.organization_id and sa.id=i.security_agent_id
  left join public.cleaning_agents ca on ca.organization_id=i.organization_id and ca.id=i.cleaning_agent_id
  left join public.restaurant_employees re on re.organization_id=i.organization_id and re.id=i.restaurant_employee_id
  where i.token_hash=extensions.digest(trim(p_token),'sha256') limit 1;
$$;

create or replace function public.accept_team_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_invitation public.organization_invitations%rowtype; v_user_email text; v_limit integer; v_active integer;
begin
  if auth.uid() is null then raise exception 'Connectez-vous pour accepter cette invitation.'; end if;
  select lower(email::text) into v_user_email from auth.users where id=auth.uid();
  select * into v_invitation from public.organization_invitations where token_hash=extensions.digest(trim(p_token),'sha256') for update;
  if v_invitation.id is null then raise exception 'Invitation introuvable.'; end if;
  if v_invitation.status<>'pending' or v_invitation.expires_at<=now() then raise exception 'Cette invitation n’est plus valide.'; end if;
  if v_user_email is null or v_user_email<>lower(v_invitation.email) then raise exception 'Connectez-vous avec l’adresse e-mail invitée.'; end if;
  if v_invitation.restaurant_employee_id is not null then
    select public.restaurant_team_member_limit(v_invitation.organization_id) into v_limit;
    select count(*)::integer into v_active from public.restaurant_employees e join public.organization_members m on m.organization_id=e.organization_id and m.user_id=e.linked_user_id and m.status='active' where e.organization_id=v_invitation.organization_id and e.linked_user_id is not null and e.status='active' and e.linked_user_id<>auth.uid();
  elsif v_invitation.cleaning_agent_id is not null then
    select public.cleaning_team_member_limit(v_invitation.organization_id) into v_limit;
    select count(*)::integer into v_active from public.cleaning_agents a join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.linked_user_id and m.status='active' where a.organization_id=v_invitation.organization_id and a.linked_user_id is not null and a.status='active' and a.linked_user_id<>auth.uid();
  elsif v_invitation.security_agent_id is not null then
    select public.security_team_member_limit(v_invitation.organization_id) into v_limit;
    select count(*)::integer into v_active from public.security_agents a join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.linked_user_id and m.status='active' where a.organization_id=v_invitation.organization_id and a.linked_user_id is not null and a.status='active' and a.linked_user_id<>auth.uid();
  else
    select public.plan_member_limit(o.plan) into v_limit from public.organizations o where o.id=v_invitation.organization_id;
    select count(*)::integer into v_active from public.organization_members where organization_id=v_invitation.organization_id and status='active' and user_id<>auth.uid();
  end if;
  if v_active>=v_limit then raise exception 'La limite d’utilisateurs est atteinte.'; end if;
  insert into public.organization_members(organization_id,user_id,role,status) values(v_invitation.organization_id,auth.uid(),v_invitation.role,'active') on conflict(organization_id,user_id) do update set role=case when public.organization_members.role='owner' then 'owner' else excluded.role end,status='active';
  if v_invitation.staff_id is not null then update public.staff set linked_user_id=auth.uid(),email=coalesce(email,v_user_email),updated_at=now() where organization_id=v_invitation.organization_id and id=v_invitation.staff_id and linked_user_id is null; end if;
  if v_invitation.security_agent_id is not null then update public.security_agents set linked_user_id=auth.uid(),email=coalesce(email,v_user_email),updated_at=now() where organization_id=v_invitation.organization_id and id=v_invitation.security_agent_id and linked_user_id is null; end if;
  if v_invitation.cleaning_agent_id is not null then update public.cleaning_agents set linked_user_id=auth.uid(),email=coalesce(email,v_user_email),updated_at=now() where organization_id=v_invitation.organization_id and id=v_invitation.cleaning_agent_id and linked_user_id is null; end if;
  if v_invitation.restaurant_employee_id is not null then update public.restaurant_employees set linked_user_id=auth.uid(),email=coalesce(email,v_user_email),updated_at=now() where organization_id=v_invitation.organization_id and id=v_invitation.restaurant_employee_id and linked_user_id is null; end if;
  update public.organization_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now(),updated_at=now() where id=v_invitation.id;
  return v_invitation.organization_id;
end;
$$;

-- API publiques : aucune donnée interne ou coût matière n’est exposé.
create or replace function public.get_public_restaurant_menu(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_org public.organizations%rowtype; v_enabled boolean;
begin
  select * into v_org from public.organizations where slug=lower(trim(p_slug)) and business_type='restauration' and status in ('trial','active') limit 1;
  if v_org.id is null then return null; end if;
  v_enabled:=public.organization_has_plan_feature(v_org.id,'restaurant_multilingual_qr_menu');
  return jsonb_build_object(
    'organization_name',v_org.name,'public_name',v_org.public_name,'primary_color',v_org.primary_color,'logo_url',v_org.logo_url,'menu_enabled',v_enabled,
    'items',case when v_enabled then coalesce((select jsonb_agg(jsonb_build_object(
      'id',i.id,'category_name',c.name,'name',i.name,'description_fr',i.description_fr,'description_en',i.description_en,'description_es',i.description_es,'description_it',i.description_it,
      'price_cents',i.price_cents,'allergens',i.allergens,'vegetarian',i.vegetarian,'vegan',i.vegan,'featured',i.featured
    ) order by c.position,i.featured desc,i.name) from public.restaurant_menu_items i join public.restaurant_menu_categories c on c.organization_id=i.organization_id and c.id=i.category_id where i.organization_id=v_org.id and i.available and c.active),'[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

create or replace function public.get_public_restaurant_booking_config(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_org public.organizations%rowtype; v_enabled boolean;
begin
  select * into v_org from public.organizations where slug=lower(trim(p_slug)) and business_type='restauration' and status in ('trial','active') limit 1;
  if v_org.id is null then return null; end if;
  v_enabled:=coalesce(v_org.booking_enabled,true) and public.organization_has_plan_feature(v_org.id,'restaurant_online_reservations');
  return jsonb_build_object('organization_name',v_org.name,'public_name',v_org.public_name,'primary_color',v_org.primary_color,'logo_url',v_org.logo_url,'booking_enabled',v_enabled,'booking_welcome_text',v_org.booking_welcome_text,'booking_contact_phone',v_org.booking_contact_phone,'booking_contact_email',v_org.booking_contact_email);
end;
$$;

create or replace function public.create_public_restaurant_reservation(p_slug text,p_guest_name text,p_guest_email text,p_guest_phone text,p_party_size integer,p_reservation_at timestamptz,p_notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org public.organizations%rowtype; v_id uuid;
begin
  select * into v_org from public.organizations where slug=lower(trim(p_slug)) and business_type='restauration' and status in ('trial','active') limit 1;
  if v_org.id is null or not coalesce(v_org.booking_enabled,true) or not public.organization_has_plan_feature(v_org.id,'restaurant_online_reservations') then raise exception 'La réservation en ligne n’est pas disponible.'; end if;
  if char_length(trim(coalesce(p_guest_name,'')))<2 then raise exception 'Indiquez votre nom.'; end if;
  if p_party_size not between 1 and 30 then raise exception 'Le nombre de personnes doit être compris entre 1 et 30.'; end if;
  if p_reservation_at<now()+interval '30 minutes' or p_reservation_at>now()+interval '180 days' then raise exception 'Choisissez une date valide.'; end if;
  if nullif(trim(coalesce(p_guest_email,'')),'') is null and nullif(trim(coalesce(p_guest_phone,'')),'') is null then raise exception 'Indiquez un e-mail ou un téléphone.'; end if;
  insert into public.restaurant_reservations(organization_id,source,guest_name,guest_email,guest_phone,party_size,reservation_at,status,notes)
  values(v_org.id,'online',trim(p_guest_name),nullif(lower(trim(coalesce(p_guest_email,''))),''),nullif(trim(coalesce(p_guest_phone,'')),''),p_party_size,p_reservation_at,'pending',nullif(trim(coalesce(p_notes,'')),'')) returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.get_public_restaurant_menu(text) to anon,authenticated;
grant execute on function public.get_public_restaurant_booking_config(text) to anon,authenticated;
grant execute on function public.create_public_restaurant_reservation(text,text,text,text,integer,timestamptz,text) to anon,authenticated;

commit;
