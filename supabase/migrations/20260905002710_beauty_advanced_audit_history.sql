create or replace function private.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path=pg_catalog
as $function$
begin
  if p_value is null or btrim(p_value)='' then return null; end if;
  return p_value::uuid;
exception when invalid_text_representation then
  return null;
end;
$function$;

create or replace function private.jsonb_changed_keys(p_before jsonb,p_after jsonb)
returns jsonb
language sql
immutable
set search_path=pg_catalog
as $function$
  select coalesce(jsonb_agg(k order by k),'[]'::jsonb)
  from (
    select key as k
    from jsonb_object_keys(coalesce(p_before,'{}'::jsonb) || coalesce(p_after,'{}'::jsonb)) key
    where coalesce(p_before,'{}'::jsonb)->key is distinct from coalesce(p_after,'{}'::jsonb)->key
  ) changed;
$function$;

create or replace function private.beauty_core_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
declare
  v_org uuid;
  v_company uuid;
  v_site uuid;
  v_action text;
  v_entity_type text;
  v_entity_id text;
  v_compare_before jsonb := '{}'::jsonb;
  v_compare_after jsonb := '{}'::jsonb;
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
  v_changed jsonb := '[]'::jsonb;
  v_business_type text;
  v_plan text;
begin
  v_org := case when tg_op='DELETE' then old.organization_id else new.organization_id end;
  v_company := case when tg_op='DELETE' then old.company_id else new.company_id end;

  select o.business_type,o.plan into v_business_type,v_plan
  from public.organizations o where o.id=v_org;

  if v_business_type is distinct from 'coiffure' or v_plan is distinct from 'metier' or v_company is null then
    return case when tg_op='DELETE' then old else new end;
  end if;

  case tg_table_name
    when 'clients' then
      v_entity_type := 'client';
      v_entity_id := (case when tg_op='DELETE' then old.id else new.id end)::text;
      v_site := null;
      if tg_op='INSERT' then
        v_action := 'beauty.client_created';
        v_after := jsonb_build_object('status',new.status);
        v_changed := '["created"]'::jsonb;
      elsif tg_op='UPDATE' then
        v_action := case
          when old.status is distinct from new.status and new.status='archived' then 'beauty.client_archived'
          else 'beauty.client_updated'
        end;
        v_compare_before := to_jsonb(old) - array['id','organization_id','company_id','created_at'];
        v_compare_after := to_jsonb(new) - array['id','organization_id','company_id','created_at'];
        v_changed := private.jsonb_changed_keys(v_compare_before,v_compare_after);
        if jsonb_array_length(v_changed)=0 then return new; end if;
        v_before := jsonb_build_object('status',old.status);
        v_after := jsonb_build_object('status',new.status);
      end if;

    when 'services' then
      v_entity_type := 'service';
      v_entity_id := (case when tg_op='DELETE' then old.id else new.id end)::text;
      v_site := null;
      if tg_op='INSERT' then
        v_action := 'beauty.service_created';
        v_changed := '["created"]'::jsonb;
        v_after := jsonb_build_object(
          'name',new.name,'category_name',new.category_name,'duration_minutes',new.duration_minutes,
          'price_cents',new.price_cents,'online_booking_enabled',new.online_booking_enabled,
          'booking_buffer_before_minutes',new.booking_buffer_before_minutes,
          'booking_buffer_after_minutes',new.booking_buffer_after_minutes,'active',new.active
        );
      elsif tg_op='UPDATE' then
        v_compare_before := jsonb_build_object(
          'name',old.name,'category_name',old.category_name,'duration_minutes',old.duration_minutes,
          'price_cents',old.price_cents,'online_booking_enabled',old.online_booking_enabled,
          'booking_min_notice_hours',old.booking_min_notice_hours,'booking_max_days_ahead',old.booking_max_days_ahead,
          'booking_buffer_before_minutes',old.booking_buffer_before_minutes,
          'booking_buffer_after_minutes',old.booking_buffer_after_minutes,'booking_weekdays',old.booking_weekdays,
          'booking_start_time',old.booking_start_time,'booking_end_time',old.booking_end_time,'active',old.active
        );
        v_compare_after := jsonb_build_object(
          'name',new.name,'category_name',new.category_name,'duration_minutes',new.duration_minutes,
          'price_cents',new.price_cents,'online_booking_enabled',new.online_booking_enabled,
          'booking_min_notice_hours',new.booking_min_notice_hours,'booking_max_days_ahead',new.booking_max_days_ahead,
          'booking_buffer_before_minutes',new.booking_buffer_before_minutes,
          'booking_buffer_after_minutes',new.booking_buffer_after_minutes,'booking_weekdays',new.booking_weekdays,
          'booking_start_time',new.booking_start_time,'booking_end_time',new.booking_end_time,'active',new.active
        );
        v_changed := private.jsonb_changed_keys(v_compare_before,v_compare_after);
        if jsonb_array_length(v_changed)=0 then return new; end if;
        v_action := case
          when old.active is distinct from new.active and new.active=false then 'beauty.service_disabled'
          when old.active is distinct from new.active and new.active=true then 'beauty.service_reactivated'
          else 'beauty.service_updated'
        end;
        v_before := v_compare_before;
        v_after := v_compare_after;
      end if;

    when 'beauty_resources' then
      v_entity_type := 'beauty_resource';
      v_entity_id := (case when tg_op='DELETE' then old.id else new.id end)::text;
      v_site := case when tg_op='DELETE' then old.site_id else new.site_id end;
      if tg_op='INSERT' then
        v_action := 'beauty.resource_created';
        v_changed := '["created"]'::jsonb;
        v_after := jsonb_build_object('name',new.name,'kind',new.kind,'capacity',new.capacity,'active',new.active);
      elsif tg_op='UPDATE' then
        v_compare_before := jsonb_build_object('name',old.name,'kind',old.kind,'capacity',old.capacity,'notes',old.notes,'active',old.active);
        v_compare_after := jsonb_build_object('name',new.name,'kind',new.kind,'capacity',new.capacity,'notes',new.notes,'active',new.active);
        v_changed := private.jsonb_changed_keys(v_compare_before,v_compare_after);
        if jsonb_array_length(v_changed)=0 then return new; end if;
        v_action := case
          when old.active is distinct from new.active and new.active=false then 'beauty.resource_disabled'
          when old.active is distinct from new.active and new.active=true then 'beauty.resource_reactivated'
          else 'beauty.resource_updated'
        end;
        v_before := v_compare_before;
        v_after := v_compare_after;
      end if;

    when 'beauty_stock_items' then
      v_entity_type := 'beauty_stock_item';
      v_entity_id := (case when tg_op='DELETE' then old.id else new.id end)::text;
      v_site := case when tg_op='DELETE' then old.site_id else new.site_id end;
      if tg_op='INSERT' then
        v_action := 'beauty.stock_item_created';
        v_changed := '["created"]'::jsonb;
        v_after := jsonb_build_object(
          'name',new.name,'category',new.category,'sku',new.sku,'unit',new.unit,
          'alert_threshold',new.alert_threshold,'unit_cost_cents',new.unit_cost_cents,
          'supplier',new.supplier,'storage_location',new.storage_location,'active',new.active
        );
      elsif tg_op='UPDATE' then
        v_compare_before := jsonb_build_object(
          'name',old.name,'category',old.category,'sku',old.sku,'unit',old.unit,
          'alert_threshold',old.alert_threshold,'unit_cost_cents',old.unit_cost_cents,
          'supplier',old.supplier,'storage_location',old.storage_location,'notes',old.notes,'active',old.active
        );
        v_compare_after := jsonb_build_object(
          'name',new.name,'category',new.category,'sku',new.sku,'unit',new.unit,
          'alert_threshold',new.alert_threshold,'unit_cost_cents',new.unit_cost_cents,
          'supplier',new.supplier,'storage_location',new.storage_location,'notes',new.notes,'active',new.active
        );
        v_changed := private.jsonb_changed_keys(v_compare_before,v_compare_after);
        if jsonb_array_length(v_changed)=0 then return new; end if;
        v_action := case
          when old.active is distinct from new.active and new.active=false then 'beauty.stock_item_disabled'
          when old.active is distinct from new.active and new.active=true then 'beauty.stock_item_reactivated'
          else 'beauty.stock_item_updated'
        end;
        v_before := v_compare_before;
        v_after := v_compare_after;
      end if;
    else
      return case when tg_op='DELETE' then old else new end;
  end case;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    v_org,auth.uid(),v_action,v_entity_type,v_entity_id,
    jsonb_strip_nulls(jsonb_build_object(
      'company_id',v_company,'site_id',v_site,'changed_fields',v_changed,'before',v_before,'after',v_after
    ))
  );
  return case when tg_op='DELETE' then old else new end;
end;
$function$;

drop trigger if exists beauty_clients_audit on public.clients;
create trigger beauty_clients_audit after insert or update on public.clients
for each row execute function private.beauty_core_audit_trigger();

drop trigger if exists beauty_services_audit on public.services;
create trigger beauty_services_audit after insert or update on public.services
for each row execute function private.beauty_core_audit_trigger();

drop trigger if exists beauty_resources_audit on public.beauty_resources;
create trigger beauty_resources_audit after insert or update on public.beauty_resources
for each row execute function private.beauty_core_audit_trigger();

drop trigger if exists beauty_stock_items_audit on public.beauty_stock_items;
create trigger beauty_stock_items_audit after insert or update on public.beauty_stock_items
for each row execute function private.beauty_core_audit_trigger();

create or replace function public.replace_beauty_resource_requirements(
  p_organization_id uuid,p_company_id uuid,p_resource_id uuid,p_requirements jsonb
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
  select * into v_resource from public.beauty_resources
  where id=p_resource_id and organization_id=p_organization_id and company_id=p_company_id;
  if v_resource.id is null then raise exception 'Ressource introuvable.'; end if;
  if p_requirements is null or jsonb_typeof(p_requirements)<>'array' then raise exception 'Configuration de prestations invalide.'; end if;

  delete from public.beauty_service_resource_requirements
  where organization_id=p_organization_id and company_id=p_company_id and resource_id=p_resource_id;

  for v_row in select value from jsonb_array_elements(p_requirements)
  loop
    v_service_id:=(v_row->>'service_id')::uuid;
    v_quantity:=coalesce((v_row->>'quantity_required')::integer,1);
    insert into public.beauty_service_resource_requirements(
      organization_id,company_id,site_id,service_id,resource_id,quantity_required,created_by
    ) values(
      p_organization_id,p_company_id,v_resource.site_id,v_service_id,p_resource_id,v_quantity,auth.uid()
    );
  end loop;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'beauty.resource_services_updated','beauty_resource',p_resource_id::text,
    jsonb_build_object('company_id',p_company_id,'site_id',v_resource.site_id,'requirement_count',jsonb_array_length(p_requirements),'requirements',p_requirements)
  );
end;
$function$;

create or replace function public.replace_beauty_stock_item_services(
  p_organization_id uuid,p_company_id uuid,p_stock_item_id uuid,p_requirements jsonb
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
  if p_requirements is null or jsonb_typeof(p_requirements)<>'array' then raise exception 'Configuration de consommables invalide.'; end if;

  select * into v_item from public.beauty_stock_items
  where id=p_stock_item_id and organization_id=p_organization_id and company_id=p_company_id;
  if v_item.id is null then raise exception 'Produit de stock introuvable.'; end if;

  delete from public.beauty_service_consumables
  where organization_id=p_organization_id and company_id=p_company_id and stock_item_id=p_stock_item_id;

  for v_row in select value from jsonb_array_elements(p_requirements)
  loop
    v_service_id:=(v_row->>'service_id')::uuid;
    v_quantity:=(v_row->>'quantity_used')::numeric;
    v_automatic:=coalesce((v_row->>'automatic_deduction')::boolean,true);
    insert into public.beauty_service_consumables(
      organization_id,company_id,site_id,service_id,stock_item_id,quantity_used,automatic_deduction,created_by
    ) values(
      p_organization_id,p_company_id,v_item.site_id,v_service_id,p_stock_item_id,v_quantity,v_automatic,auth.uid()
    );
  end loop;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'beauty.stock_consumables_updated','beauty_stock_item',p_stock_item_id::text,
    jsonb_build_object('company_id',p_company_id,'site_id',v_item.site_id,'requirement_count',jsonb_array_length(p_requirements),'requirements',p_requirements)
  );
end;
$function$;

create or replace function private.beauty_audit_history(
  p_organization_id uuid,p_company_id uuid,p_limit integer default 100,p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
declare
  v_result jsonb;
  v_limit integer := greatest(1,least(coalesce(p_limit,100),200));
  v_offset integer := greatest(0,coalesce(p_offset,0));
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour consulter cet historique.';
  end if;

  if not exists (
    select 1 from public.organization_companies c
    join public.organizations o on o.id=c.organization_id
    where c.id=p_company_id and c.organization_id=p_organization_id and c.status='active'
      and o.business_type='coiffure' and o.plan='metier'
  ) then raise exception 'Enseigne Beauty introuvable.'; end if;

  with resolved as (
    select l.*,
      coalesce(
        private.try_uuid(l.metadata->>'company_id'),
        case when l.entity_type in ('organization_company','beauty_company_loyalty_settings') then private.try_uuid(l.entity_id) end,
        case when l.entity_type='appointment' then (select a.company_id from public.appointments a where a.id=private.try_uuid(l.entity_id)) end,
        case when l.entity_type='staff' then (select st.company_id from public.staff st where st.id=private.try_uuid(l.entity_id)) end,
        case when l.entity_type='client' then (select c.company_id from public.clients c where c.id=private.try_uuid(l.entity_id)) end,
        case when l.entity_type='service' then (select s.company_id from public.services s where s.id=private.try_uuid(l.entity_id)) end,
        case when l.entity_type='beauty_resource' then (select r.company_id from public.beauty_resources r where r.id=private.try_uuid(l.entity_id)) end,
        case when l.entity_type='beauty_stock_item' then (select si.company_id from public.beauty_stock_items si where si.id=private.try_uuid(l.entity_id)) end,
        case when l.entity_type='organization_site' then (select os.company_id from public.organization_sites os where os.id=private.try_uuid(l.entity_id)) end
      ) as resolved_company_id,
      coalesce(
        private.try_uuid(l.metadata->>'site_id'),
        case when l.entity_type='appointment' then (select a.site_id from public.appointments a where a.id=private.try_uuid(l.entity_id)) end,
        case when l.entity_type='staff' then (select st.site_id from public.staff st where st.id=private.try_uuid(l.entity_id)) end,
        case when l.entity_type='beauty_resource' then (select r.site_id from public.beauty_resources r where r.id=private.try_uuid(l.entity_id)) end,
        case when l.entity_type='beauty_stock_item' then (select si.site_id from public.beauty_stock_items si where si.id=private.try_uuid(l.entity_id)) end,
        case when l.entity_type='organization_site' then private.try_uuid(l.entity_id) end
      ) as resolved_site_id
    from public.audit_logs l
    where l.organization_id=p_organization_id
  ),
  scoped as (
    select * from resolved where resolved_company_id=p_company_id
  ),
  page_rows as (
    select s.id,s.created_at,s.action,s.entity_type,s.entity_id,s.metadata,s.user_id,
      coalesce(nullif(up.full_name,''),case when s.user_id is null then 'Système / client' else 'Utilisateur' end) as actor_name,
      up.avatar_url as actor_avatar_url,
      s.resolved_company_id as company_id,oc.name as company_name,
      s.resolved_site_id as site_id,os.name as site_name,
      coalesce(
        s.metadata->>'entity_label',
        case
          when s.entity_type='appointment' then (
            select 'Rendez-vous · '||nullif(btrim(concat_ws(' ',c.first_name,c.last_name)),'')
            from public.appointments a left join public.clients c on c.id=a.client_id
            where a.id=private.try_uuid(s.entity_id)
          )
          when s.entity_type='staff' then (select st.display_name from public.staff st where st.id=private.try_uuid(s.entity_id))
          when s.entity_type='client' then (select nullif(btrim(concat_ws(' ',c.first_name,c.last_name)),'') from public.clients c where c.id=private.try_uuid(s.entity_id))
          when s.entity_type='service' then (select sv.name from public.services sv where sv.id=private.try_uuid(s.entity_id))
          when s.entity_type='beauty_resource' then (select r.name from public.beauty_resources r where r.id=private.try_uuid(s.entity_id))
          when s.entity_type='beauty_stock_item' then (select si.name from public.beauty_stock_items si where si.id=private.try_uuid(s.entity_id))
          when s.entity_type in ('organization_company','beauty_company_loyalty_settings') then oc.name
          when s.entity_type='organization_site' then os.name
          else null
        end,
        case
          when s.entity_type='appointment' then 'Rendez-vous'
          when s.entity_type='staff' then 'Collaborateur'
          when s.entity_type='client' then 'Client'
          when s.entity_type='service' then 'Prestation'
          when s.entity_type='beauty_resource' then 'Ressource'
          when s.entity_type='beauty_stock_item' then 'Produit'
          else 'Élément'
        end
      ) as entity_label
    from scoped s
    left join public.user_profiles up on up.id=s.user_id
    left join public.organization_companies oc on oc.id=s.resolved_company_id
    left join public.organization_sites os on os.id=s.resolved_site_id
    order by s.created_at desc,s.id desc
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'total',(select count(*) from scoped),
    'items',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id desc) from page_rows p),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

create or replace function public.beauty_audit_history(
  p_organization_id uuid,p_company_id uuid,p_limit integer default 100,p_offset integer default 0
)
returns jsonb
language sql
security invoker
set search_path=public,private,pg_catalog
as $function$
  select private.beauty_audit_history(p_organization_id,p_company_id,p_limit,p_offset);
$function$;

revoke all on function private.beauty_audit_history(uuid,uuid,integer,integer) from public,anon;
grant execute on function private.beauty_audit_history(uuid,uuid,integer,integer) to authenticated,service_role;
revoke all on function public.beauty_audit_history(uuid,uuid,integer,integer) from public,anon;
grant execute on function public.beauty_audit_history(uuid,uuid,integer,integer) to authenticated,service_role;