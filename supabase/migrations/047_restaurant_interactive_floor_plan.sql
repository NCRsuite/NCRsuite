-- NCR Suite V2.8.2 — Plan de salle interactif
-- À exécuter après 046_restaurant_stabilization_translation.sql.

begin;

-- Capacités d'offre : éditeur libre dès Essentielle, fonctions avancées dès Professionnelle.
update public.domain_plan_catalog
set features = coalesce(features, '{}'::jsonb) || jsonb_build_object('restaurant_floor_editor', true),
    updated_at = now()
where business_type = 'restauration'
  and plan_key in ('essentielle','professionnelle','metier');

update public.domain_plan_catalog
set features = coalesce(features, '{}'::jsonb) || jsonb_build_object('restaurant_floor_advanced', true),
    updated_at = now()
where business_type = 'restauration'
  and plan_key in ('professionnelle','metier');

-- Une salle correspond à un canevas éditable. Une salle est disponible dès Essentielle ;
-- plusieurs salles sont réservées aux offres Professionnelle et Métier dans l'interface.
create table if not exists public.restaurant_floor_rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  canvas_width integer not null default 1200 check (canvas_width between 600 and 3000),
  canvas_height integer not null default 760 check (canvas_height between 400 and 2200),
  grid_enabled boolean not null default true,
  grid_size integer not null default 20 check (grid_size between 5 and 100),
  background_url text,
  position integer not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, name)
);

-- Éléments architecturaux indépendants des tables.
create table if not exists public.restaurant_floor_elements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  room_id uuid not null,
  element_type text not null check (element_type in ('wall','door','window','counter','kitchen','toilet','stairs','restricted','label')),
  label text,
  position_x numeric(6,3) not null default 10 check (position_x between 0 and 100),
  position_y numeric(6,3) not null default 10 check (position_y between 0 and 100),
  width numeric(6,3) not null default 12 check (width between 1 and 100),
  height numeric(6,3) not null default 8 check (height between 1 and 100),
  rotation numeric(6,2) not null default 0 check (rotation between -360 and 360),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint restaurant_floor_element_room_fk foreign key (organization_id, room_id)
    references public.restaurant_floor_rooms(organization_id, id) on delete cascade
);

-- Enrichit les tables existantes sans perdre les données de la V2.8.1.
alter table public.restaurant_tables
  add column if not exists room_id uuid,
  add column if not exists width numeric(6,3) not null default 10,
  add column if not exists height numeric(6,3) not null default 14,
  add column if not exists rotation numeric(6,2) not null default 0,
  add column if not exists shape text not null default 'round',
  add column if not exists service_status text not null default 'available',
  add column if not exists z_index integer not null default 10;

-- Contraintes ajoutées séparément pour rendre la migration relançable.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'restaurant_table_room_fk') then
    alter table public.restaurant_tables
      add constraint restaurant_table_room_fk foreign key (organization_id, room_id)
      references public.restaurant_floor_rooms(organization_id, id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'restaurant_table_width_check') then
    alter table public.restaurant_tables add constraint restaurant_table_width_check check (width between 3 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'restaurant_table_height_check') then
    alter table public.restaurant_tables add constraint restaurant_table_height_check check (height between 3 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'restaurant_table_rotation_check') then
    alter table public.restaurant_tables add constraint restaurant_table_rotation_check check (rotation between -360 and 360);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'restaurant_table_shape_check') then
    alter table public.restaurant_tables add constraint restaurant_table_shape_check check (shape in ('round','square','rectangle'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'restaurant_table_service_status_check') then
    alter table public.restaurant_tables add constraint restaurant_table_service_status_check
      check (service_status in ('available','reserved','occupied','ordering','payment','cleaning','unavailable'));
  end if;
end $$;

-- Crée une salle principale pour chaque restaurant déjà existant.
insert into public.restaurant_floor_rooms (organization_id, name, created_by)
select o.id, 'Salle principale', null
from public.organizations o
where o.business_type = 'restauration'
  and not exists (
    select 1 from public.restaurant_floor_rooms r
    where r.organization_id = o.id and r.active
  )
on conflict (organization_id, name) do nothing;

-- Rattache les anciennes tables à la première salle disponible.
update public.restaurant_tables t
set room_id = (
      select r.id
      from public.restaurant_floor_rooms r
      where r.organization_id = t.organization_id and r.active
      order by r.position, r.created_at
      limit 1
    ),
    width = case when t.capacity >= 6 then 18 when t.capacity >= 4 then 14 else 10 end,
    height = case when t.capacity >= 6 then 11 when t.capacity >= 4 then 12 else 14 end,
    shape = case when t.capacity >= 6 then 'rectangle' when t.capacity = 4 then 'square' else 'round' end
where t.room_id is null;

update public.restaurant_tables
set position_x = least(position_x, greatest(0, 100 - width)),
    position_y = least(position_y, greatest(0, 100 - height));

create index if not exists idx_restaurant_floor_rooms_org on public.restaurant_floor_rooms(organization_id, active, position);
create index if not exists idx_restaurant_floor_elements_room on public.restaurant_floor_elements(organization_id, room_id, active);
create index if not exists idx_restaurant_tables_room on public.restaurant_tables(organization_id, room_id, active);

-- Contrôle métier et droits d'offre.
create or replace function public.validate_restaurant_floor_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.organizations o
    where o.id = new.organization_id
      and o.business_type = 'restauration'
      and o.status in ('trial','active')
  ) then
    raise exception 'Ce plan appartient à un espace Restauration inactif.';
  end if;

  if not public.organization_has_plan_feature(new.organization_id, 'restaurant_floor_plan') then
    raise exception 'Le plan de salle nécessite l’offre Essentielle.';
  end if;

  if tg_table_name = 'restaurant_floor_rooms'
     and tg_op = 'INSERT'
     and not public.organization_has_plan_feature(new.organization_id, 'restaurant_floor_advanced')
     and exists (
       select 1 from public.restaurant_floor_rooms r
       where r.organization_id = new.organization_id and r.active
     ) then
    raise exception 'Les salles multiples nécessitent l’offre Professionnelle.';
  end if;

  return new;
end;
$$;

-- Les membres peuvent changer uniquement l'état opérationnel d'une table via cette RPC.
create or replace function public.set_restaurant_table_service_status(
  p_organization_id uuid,
  p_table_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;
  if p_status not in ('available','reserved','occupied','ordering','payment','cleaning','unavailable') then
    raise exception 'État de table invalide.';
  end if;

  update public.restaurant_tables
  set service_status = p_status,
      updated_at = now()
  where organization_id = p_organization_id
    and id = p_table_id
    and active;

  if not found then raise exception 'Table introuvable.'; end if;
end;
$$;

-- Dates automatiques.
drop trigger if exists set_restaurant_floor_rooms_updated_at on public.restaurant_floor_rooms;
create trigger set_restaurant_floor_rooms_updated_at
before update on public.restaurant_floor_rooms
for each row execute procedure public.set_updated_at();

drop trigger if exists set_restaurant_floor_elements_updated_at on public.restaurant_floor_elements;
create trigger set_restaurant_floor_elements_updated_at
before update on public.restaurant_floor_elements
for each row execute procedure public.set_updated_at();

-- Validation d'offre sur les deux nouvelles tables.
drop trigger if exists validate_restaurant_floor_rooms_offer on public.restaurant_floor_rooms;
create trigger validate_restaurant_floor_rooms_offer
before insert or update on public.restaurant_floor_rooms
for each row execute procedure public.validate_restaurant_floor_record();

drop trigger if exists validate_restaurant_floor_elements_offer on public.restaurant_floor_elements;
create trigger validate_restaurant_floor_elements_offer
before insert or update on public.restaurant_floor_elements
for each row execute procedure public.validate_restaurant_floor_record();

-- RLS.
alter table public.restaurant_floor_rooms enable row level security;
alter table public.restaurant_floor_elements enable row level security;

drop policy if exists restaurant_floor_rooms_select on public.restaurant_floor_rooms;
create policy restaurant_floor_rooms_select on public.restaurant_floor_rooms
for select using (public.is_org_member(organization_id));

drop policy if exists restaurant_floor_rooms_manage on public.restaurant_floor_rooms;
create policy restaurant_floor_rooms_manage on public.restaurant_floor_rooms
for all using (public.is_restaurant_manager(organization_id))
with check (public.is_restaurant_manager(organization_id));

drop policy if exists restaurant_floor_elements_select on public.restaurant_floor_elements;
create policy restaurant_floor_elements_select on public.restaurant_floor_elements
for select using (public.is_org_member(organization_id));

drop policy if exists restaurant_floor_elements_manage on public.restaurant_floor_elements;
create policy restaurant_floor_elements_manage on public.restaurant_floor_elements
for all using (public.is_restaurant_manager(organization_id))
with check (public.is_restaurant_manager(organization_id));

grant select, insert, update, delete on public.restaurant_floor_rooms to authenticated;
grant select, insert, update, delete on public.restaurant_floor_elements to authenticated;
grant execute on function public.set_restaurant_table_service_status(uuid, uuid, text) to authenticated;

commit;
