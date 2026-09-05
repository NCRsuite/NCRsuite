create table public.beauty_stock_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  site_id uuid not null references public.organization_sites(id) on delete cascade,
  name text not null,
  category text,
  sku text,
  unit text not null default 'unit',
  quantity_on_hand numeric(14,3) not null default 0,
  alert_threshold numeric(14,3) not null default 0,
  unit_cost_cents numeric(14,4) not null default 0,
  supplier text,
  storage_location text,
  notes text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beauty_stock_name_check check (char_length(trim(name)) between 2 and 120),
  constraint beauty_stock_unit_check check (unit in ('unit','ml','cl','l','g','kg','dose','pair','sheet','box','other')),
  constraint beauty_stock_initial_threshold_check check (alert_threshold >= 0),
  constraint beauty_stock_unit_cost_check check (unit_cost_cents >= 0),
  constraint beauty_stock_notes_check check (notes is null or char_length(notes) <= 1500)
);

create unique index beauty_stock_items_scope_name_uidx
  on public.beauty_stock_items(organization_id,company_id,site_id,lower(trim(name)));
create unique index beauty_stock_items_scope_sku_uidx
  on public.beauty_stock_items(organization_id,company_id,site_id,lower(trim(sku)))
  where sku is not null;
create index beauty_stock_items_scope_idx
  on public.beauty_stock_items(organization_id,company_id,site_id,active);
create index beauty_stock_items_alert_idx
  on public.beauty_stock_items(organization_id,company_id,site_id,quantity_on_hand,alert_threshold)
  where active=true;

create table public.beauty_service_consumables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  site_id uuid not null references public.organization_sites(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  stock_item_id uuid not null references public.beauty_stock_items(id) on delete cascade,
  quantity_used numeric(14,3) not null,
  automatic_deduction boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beauty_service_consumable_quantity_check check (quantity_used > 0 and quantity_used <= 100000),
  constraint beauty_service_consumable_unique unique(service_id,stock_item_id)
);

create index beauty_service_consumables_service_idx
  on public.beauty_service_consumables(organization_id,company_id,site_id,service_id);
create index beauty_service_consumables_stock_idx
  on public.beauty_service_consumables(stock_item_id,service_id);

create table public.beauty_stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  site_id uuid not null references public.organization_sites(id) on delete cascade,
  stock_item_id uuid not null references public.beauty_stock_items(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  appointment_service_item_id uuid references public.appointment_service_items(id) on delete set null,
  movement_type text not null,
  quantity_delta numeric(14,3) not null,
  unit text not null,
  unit_cost_cents numeric(14,4) not null default 0,
  balance_before numeric(14,3) not null,
  balance_after numeric(14,3) not null,
  notes text,
  source_key text,
  reversal_of uuid references public.beauty_stock_movements(id) on delete set null,
  reversed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint beauty_stock_movement_type_check check (movement_type in ('initial','purchase','manual_in','manual_out','correction','waste','service_consumption','service_reversal')),
  constraint beauty_stock_movement_delta_check check (quantity_delta <> 0),
  constraint beauty_stock_movement_notes_check check (notes is null or char_length(notes) <= 1500)
);

create unique index beauty_stock_movements_source_uidx
  on public.beauty_stock_movements(stock_item_id,source_key)
  where source_key is not null;
create index beauty_stock_movements_scope_created_idx
  on public.beauty_stock_movements(organization_id,company_id,site_id,created_at desc);
create index beauty_stock_movements_item_created_idx
  on public.beauty_stock_movements(stock_item_id,created_at desc);
create index beauty_stock_movements_appointment_idx
  on public.beauty_stock_movements(appointment_id,movement_type);

alter table public.beauty_stock_items enable row level security;
alter table public.beauty_service_consumables enable row level security;
alter table public.beauty_stock_movements enable row level security;

grant select,insert,update,delete on public.beauty_stock_items to authenticated,service_role;
grant select,insert,update,delete on public.beauty_service_consumables to authenticated,service_role;
grant select on public.beauty_stock_movements to authenticated;
grant select,insert,update,delete on public.beauty_stock_movements to service_role;

create policy beauty_stock_items_select on public.beauty_stock_items
for select to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager','employee','viewer'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
);

create policy beauty_stock_items_manage on public.beauty_stock_items
for all to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
)
with check (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
);

create policy beauty_service_consumables_select on public.beauty_service_consumables
for select to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager','employee','viewer'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
);

create policy beauty_service_consumables_manage on public.beauty_service_consumables
for all to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
)
with check (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
);

create policy beauty_stock_movements_select on public.beauty_stock_movements
for select to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager','employee','viewer'])
  and public.metier_company_access_allows(organization_id,company_id,auth.uid())
);

create or replace function public.beauty_validate_stock_item()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $function$
begin
  if not exists (
    select 1
    from public.organization_companies c
    join public.organizations o on o.id=c.organization_id
    where c.id=new.company_id
      and c.organization_id=new.organization_id
      and c.status='active'
      and o.business_type='coiffure'
      and o.plan='metier'
  ) then raise exception 'L’enseigne Beauty est invalide.'; end if;

  if not exists (
    select 1 from public.organization_sites s
    where s.id=new.site_id
      and s.organization_id=new.organization_id
      and s.company_id=new.company_id
      and s.status='active'
  ) then raise exception 'L’établissement est invalide.'; end if;

  new.name:=trim(new.name);
  new.category:=nullif(trim(coalesce(new.category,'')),'');
  new.sku:=nullif(trim(coalesce(new.sku,'')),'');
  new.supplier:=nullif(trim(coalesce(new.supplier,'')),'');
  new.storage_location:=nullif(trim(coalesce(new.storage_location,'')),'');
  new.notes:=nullif(trim(coalesce(new.notes,'')),'');
  new.updated_at:=now();

  if tg_op='INSERT' and new.quantity_on_hand < 0 then
    raise exception 'Le stock initial ne peut pas être négatif.';
  end if;

  if tg_op='UPDATE'
     and new.quantity_on_hand is distinct from old.quantity_on_hand
     and coalesce(current_setting('ncr.beauty_stock_movement',true),'')<>'1' then
    raise exception 'Utilisez un mouvement de stock pour modifier la quantité.';
  end if;

  return new;
end;
$function$;

create trigger beauty_stock_items_guard
before insert or update on public.beauty_stock_items
for each row execute function public.beauty_validate_stock_item();

create or replace function public.beauty_validate_service_consumable()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $function$
declare
  v_site_id uuid;
begin
  if not exists (
    select 1 from public.services s
    where s.id=new.service_id
      and s.organization_id=new.organization_id
      and s.company_id=new.company_id
  ) then raise exception 'La prestation n’appartient pas à cette enseigne.'; end if;

  select si.site_id into v_site_id
  from public.beauty_stock_items si
  where si.id=new.stock_item_id
    and si.organization_id=new.organization_id
    and si.company_id=new.company_id;

  if v_site_id is null or v_site_id<>new.site_id then
    raise exception 'Le consommable n’appartient pas à cet établissement.';
  end if;

  new.updated_at:=now();
  return new;
end;
$function$;

create trigger beauty_service_consumables_guard
before insert or update on public.beauty_service_consumables
for each row execute function public.beauty_validate_service_consumable();

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
  if not p_allow_negative and v_after<0 then
    raise exception 'Stock insuffisant : il reste % %.',v_item.quantity_on_hand,v_item.unit;
  end if;

  perform set_config('ncr.beauty_stock_movement','1',true);
  update public.beauty_stock_items
  set quantity_on_hand=v_after
  where id=v_item.id;

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

create or replace function public.adjust_beauty_stock(
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

create or replace function public.replace_beauty_stock_item_services(
  p_organization_id uuid,
  p_company_id uuid,
  p_stock_item_id uuid,
  p_requirements jsonb
)
returns void
language plpgsql
security invoker
set search_path=public,pg_catalog
as $function$
declare
  v_item public.beauty_stock_items%rowtype;
  v_row jsonb;
  v_service_id uuid;
  v_quantity numeric;
  v_automatic boolean;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour cette enseigne.';
  end if;
  if p_requirements is null or jsonb_typeof(p_requirements)<>'array' then
    raise exception 'Configuration de consommables invalide.';
  end if;

  select * into v_item
  from public.beauty_stock_items
  where id=p_stock_item_id
    and organization_id=p_organization_id
    and company_id=p_company_id;

  if v_item.id is null then raise exception 'Produit de stock introuvable.'; end if;

  delete from public.beauty_service_consumables
  where organization_id=p_organization_id
    and company_id=p_company_id
    and stock_item_id=p_stock_item_id;

  for v_row in select value from jsonb_array_elements(p_requirements)
  loop
    v_service_id:=(v_row->>'service_id')::uuid;
    v_quantity:=(v_row->>'quantity_used')::numeric;
    v_automatic:=coalesce((v_row->>'automatic_deduction')::boolean,true);

    insert into public.beauty_service_consumables(
      organization_id,company_id,site_id,service_id,stock_item_id,quantity_used,automatic_deduction,created_by
    ) values (
      p_organization_id,p_company_id,v_item.site_id,v_service_id,p_stock_item_id,v_quantity,v_automatic,auth.uid()
    );
  end loop;
end;
$function$;

create or replace function private.beauty_apply_appointment_stock_consumption(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
declare
  v_appt public.appointments%rowtype;
  v_row record;
  v_cycle integer;
  v_source_key text;
begin
  select * into v_appt from public.appointments where id=p_appointment_id;
  if v_appt.id is null or v_appt.status<>'completed' or v_appt.company_id is null or v_appt.site_id is null then return; end if;
  if not exists (
    select 1 from public.organizations o
    where o.id=v_appt.organization_id and o.business_type='coiffure' and o.plan='metier'
  ) then return; end if;

  for v_row in
    with segments as (
      select asi.id as service_item_id,asi.service_id
      from public.appointment_service_items asi
      where asi.organization_id=v_appt.organization_id
        and asi.appointment_id=v_appt.id
      union all
      select null::uuid,v_appt.service_id
      where not exists (
        select 1 from public.appointment_service_items asi
        where asi.organization_id=v_appt.organization_id
          and asi.appointment_id=v_appt.id
      )
    )
    select seg.service_item_id,seg.service_id,c.id as consumable_id,c.stock_item_id,c.quantity_used
    from segments seg
    join public.beauty_service_consumables c
      on c.organization_id=v_appt.organization_id
     and c.company_id=v_appt.company_id
     and c.site_id=v_appt.site_id
     and c.service_id=seg.service_id
     and c.automatic_deduction=true
    join public.beauty_stock_items si
      on si.id=c.stock_item_id and si.active=true
  loop
    if exists (
      select 1
      from public.beauty_stock_movements m
      where m.appointment_id=v_appt.id
        and m.stock_item_id=v_row.stock_item_id
        and m.service_id=v_row.service_id
        and m.movement_type='service_consumption'
        and m.reversed_at is null
        and (
          (v_row.service_item_id is null and m.appointment_service_item_id is null)
          or m.appointment_service_item_id=v_row.service_item_id
        )
    ) then continue; end if;

    select count(*)+1 into v_cycle
    from public.beauty_stock_movements m
    where m.appointment_id=v_appt.id
      and m.stock_item_id=v_row.stock_item_id
      and m.service_id=v_row.service_id
      and m.movement_type='service_consumption'
      and (
        (v_row.service_item_id is null and m.appointment_service_item_id is null)
        or m.appointment_service_item_id=v_row.service_item_id
      );

    v_source_key:=concat(
      'appointment:',v_appt.id,':segment:',coalesce(v_row.service_item_id::text,'main'),
      ':consumable:',v_row.consumable_id,':cycle:',v_cycle
    );

    perform private.beauty_apply_stock_delta(
      v_row.stock_item_id,-v_row.quantity_used,'service_consumption',
      'Consommation automatique à la clôture du rendez-vous',
      v_row.service_id,v_appt.id,v_row.service_item_id,v_source_key,null,true,null
    );
  end loop;
end;
$function$;

create or replace function private.beauty_reverse_appointment_stock_consumption(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
declare
  v_row public.beauty_stock_movements%rowtype;
  v_reversal_id uuid;
begin
  for v_row in
    select *
    from public.beauty_stock_movements
    where appointment_id=p_appointment_id
      and movement_type='service_consumption'
      and reversed_at is null
    order by created_at,id
  loop
    v_reversal_id:=private.beauty_apply_stock_delta(
      v_row.stock_item_id,-v_row.quantity_delta,'service_reversal',
      'Réintégration automatique après correction du statut du rendez-vous',
      v_row.service_id,v_row.appointment_id,v_row.appointment_service_item_id,
      concat('reversal:',v_row.id),null,true,v_row.id
    );

    update public.beauty_stock_movements
    set reversed_at=now()
    where id=v_row.id and reversed_at is null;
  end loop;
end;
$function$;

create or replace function private.beauty_appointment_stock_status_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
begin
  if new.status='completed' and old.status is distinct from 'completed' then
    perform private.beauty_apply_appointment_stock_consumption(new.id);
  elsif old.status='completed' and new.status is distinct from 'completed' then
    perform private.beauty_reverse_appointment_stock_consumption(new.id);
  end if;
  return null;
end;
$function$;

create trigger beauty_appointment_stock_status_guard
after update of status on public.appointments
for each row execute function private.beauty_appointment_stock_status_trigger();

create or replace function private.beauty_stock_initial_movement_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
begin
  if new.quantity_on_hand<>0 then
    insert into public.beauty_stock_movements(
      organization_id,company_id,site_id,stock_item_id,movement_type,quantity_delta,unit,unit_cost_cents,
      balance_before,balance_after,notes,source_key,created_by
    ) values (
      new.organization_id,new.company_id,new.site_id,new.id,'initial',new.quantity_on_hand,new.unit,new.unit_cost_cents,
      0,new.quantity_on_hand,'Stock initial','initial:'||new.id,new.created_by
    );
  end if;
  return null;
end;
$function$;

create trigger beauty_stock_initial_movement
after insert on public.beauty_stock_items
for each row execute function private.beauty_stock_initial_movement_trigger();

revoke all on function public.adjust_beauty_stock(uuid,uuid,uuid,numeric,text,text) from public;
grant execute on function public.adjust_beauty_stock(uuid,uuid,uuid,numeric,text,text) to authenticated,service_role;

revoke all on function public.replace_beauty_stock_item_services(uuid,uuid,uuid,jsonb) from public;
grant execute on function public.replace_beauty_stock_item_services(uuid,uuid,uuid,jsonb) to authenticated,service_role;