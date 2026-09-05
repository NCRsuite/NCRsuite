create index if not exists clients_org_company_status_created_idx
  on public.clients(organization_id,company_id,status,created_at desc,id);

create index if not exists appointments_company_client_completed_start_idx
  on public.appointments(organization_id,company_id,client_id,starts_at desc)
  where status='completed';

create index if not exists appointments_company_client_upcoming_start_idx
  on public.appointments(organization_id,company_id,client_id,starts_at)
  where status in ('pending','confirmed');

create index if not exists audit_logs_org_company_created_idx
  on public.audit_logs(organization_id,(metadata->>'company_id'),created_at desc,id desc);

CREATE OR REPLACE FUNCTION private.beauty_audit_history_v2(p_organization_id uuid, p_company_id uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_since timestamp with time zone DEFAULT NULL::timestamp with time zone, p_category text DEFAULT 'all'::text, p_site_id uuid DEFAULT NULL::uuid, p_actor text DEFAULT 'all'::text, p_search text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
declare
  v_result jsonb;
  v_limit integer:=greatest(1,least(coalesce(p_limit,100),200));
  v_offset integer:=greatest(0,coalesce(p_offset,0));
  v_category text:=coalesce(nullif(lower(btrim(p_category)),''),'all');
  v_actor text:=coalesce(nullif(btrim(p_actor),''),'all');
  v_search text:=nullif(lower(btrim(coalesce(p_search,''))),'');
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour consulter cet historique.';
  end if;

  if v_category not in ('all','appointments','clients','services','team','resources','stock','loyalty','settings') then
    v_category:='all';
  end if;

  if not exists(
    select 1
    from public.organization_companies c
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
      and (p_since is null or l.created_at>=p_since)
      and (
        l.metadata->>'company_id' is null
        or l.metadata->>'company_id'=p_company_id::text
      )
  ),
  scoped as (
    select r.*,
      case
        when lower(r.action||' '||coalesce(r.entity_type,'')) like '%appointment%' then 'appointments'
        when lower(r.action||' '||coalesce(r.entity_type,'')) like '%client%' then 'clients'
        when lower(r.action||' '||coalesce(r.entity_type,'')) like '%service%'
          and lower(r.action||' '||coalesce(r.entity_type,'')) not like '%resource_services%'
          and lower(r.action||' '||coalesce(r.entity_type,'')) not like '%stock_consumables%' then 'services'
        when lower(r.action||' '||coalesce(r.entity_type,'')) ~ '(staff|team)' then 'team'
        when lower(r.action||' '||coalesce(r.entity_type,'')) like '%resource%' then 'resources'
        when lower(r.action||' '||coalesce(r.entity_type,'')) ~ '(stock|consumable)' then 'stock'
        when lower(r.action||' '||coalesce(r.entity_type,'')) ~ '(loyalty|fidel)' then 'loyalty'
        else 'settings'
      end as category
    from resolved r
    where r.resolved_company_id=p_company_id
      and (p_site_id is null or r.resolved_site_id=p_site_id)
      and (
        v_actor='all'
        or (v_actor='system' and r.user_id is null)
        or (v_actor<>'system' and r.user_id::text=v_actor)
      )
  ),
  decorated as (
    select s.id,s.created_at,s.action,s.entity_type,s.entity_id,s.metadata,s.user_id,s.category,
      coalesce(nullif(up.full_name,''),case when s.user_id is null then 'Système / client' else 'Utilisateur' end) as actor_name,
      up.avatar_url as actor_avatar_url,
      s.resolved_company_id as company_id,oc.name as company_name,
      s.resolved_site_id as site_id,os.name as site_name,
      coalesce(
        s.metadata->>'entity_label',
        case
          when s.entity_type='appointment' then (
            select 'Rendez-vous · '||coalesce(nullif(btrim(concat_ws(' ',c.first_name,c.last_name)),''),'Client')
            from public.appointments a
            left join public.clients c on c.id=a.client_id
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
    where v_category='all' or s.category=v_category
  ),
  filtered as (
    select d.*
    from decorated d
    where v_search is null
      or lower(concat_ws(' ',
        d.actor_name,d.entity_label,d.site_name,d.company_name,d.action,d.entity_type,
        coalesce(d.metadata->>'changed_fields','')
      )) like '%'||v_search||'%'
  ),
  page_rows as (
    select *
    from filtered
    order by created_at desc,id desc
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'total',(select count(*)::int from filtered),
    'items',coalesce((
      select jsonb_agg((to_jsonb(p)-'category') order by p.created_at desc,p.id desc)
      from page_rows p
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$


CREATE OR REPLACE FUNCTION private.beauty_growth_pilot_compact(p_organization_id uuid, p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
declare
  v_result jsonb;
  v_review_summary jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour consulter le pilotage.';
  end if;

  if not exists(
    select 1
    from public.organization_companies c
    join public.organizations o on o.id=c.organization_id
    where c.id=p_company_id and c.organization_id=p_organization_id and c.status='active'
      and o.business_type='coiffure' and o.plan='metier'
  ) then raise exception 'Enseigne Beauty introuvable.'; end if;

  v_review_summary:=private.beauty_company_review_growth_summary(p_organization_id,p_company_id);

  with client_stats as (
    select
      c.id,c.first_name,c.last_name,c.email,c.phone,c.birth_date,c.birthday_consent,
      completed.last_visit,upcoming.next_appointment
    from public.clients c
    left join lateral (
      select a.starts_at as last_visit
      from public.appointments a
      where a.organization_id=p_organization_id and a.company_id=p_company_id
        and a.client_id=c.id and a.status='completed'
      order by a.starts_at desc limit 1
    ) completed on true
    left join lateral (
      select a.starts_at as next_appointment
      from public.appointments a
      where a.organization_id=p_organization_id and a.company_id=p_company_id
        and a.client_id=c.id and a.status in ('pending','confirmed') and a.starts_at>=now()
      order by a.starts_at limit 1
    ) upcoming on true
    where c.organization_id=p_organization_id and c.company_id=p_company_id and c.status='active'
  ),
  opportunities as (
    select cs.*,
      public.beauty_next_birthday(cs.birth_date,current_date) as next_birthday,
      case
        when cs.birthday_consent and cs.birth_date is not null
          and public.beauty_next_birthday(cs.birth_date,current_date)<=current_date+30 then 'birthday'
        when cs.last_visit is not null and cs.last_visit<now()-interval '60 days' and cs.next_appointment is null then 'inactive'
        when cs.last_visit is not null and cs.last_visit<now()-interval '30 days' and cs.next_appointment is null then 'rebook_due'
        else null
      end as reason,
      case
        when cs.birthday_consent and cs.birth_date is not null
          and public.beauty_next_birthday(cs.birth_date,current_date)<=current_date+30 then 90
        when cs.last_visit is not null and cs.last_visit<now()-interval '90 days' and cs.next_appointment is null then 80
        when cs.last_visit is not null and cs.last_visit<now()-interval '60 days' and cs.next_appointment is null then 70
        when cs.last_visit is not null and cs.last_visit<now()-interval '30 days' and cs.next_appointment is null then 50
        else 0
      end as score
    from client_stats cs
  ),
  ranked as (
    select o.*,last_appt.staff_id as last_staff_id,
      coalesce(
        (select string_agg(asi.service_name,' + ' order by asi.position)
         from public.appointment_service_items asi where asi.appointment_id=last_appt.id),
        s.name
      ) as last_service_name
    from opportunities o
    left join lateral (
      select a.id,a.service_id,a.staff_id
      from public.appointments a
      where a.organization_id=p_organization_id and a.company_id=p_company_id
        and a.client_id=o.id and a.status='completed'
      order by a.starts_at desc limit 1
    ) last_appt on true
    left join public.services s on s.id=last_appt.service_id
      and s.organization_id=p_organization_id and s.company_id=p_company_id
    where o.reason is not null
  )
  select jsonb_build_object(
    'summary',jsonb_build_object(
      'waiting',(select count(*)::int from public.beauty_waitlist_entries w
        where w.organization_id=p_organization_id and w.company_id=p_company_id and w.status='waiting'),
      'inactive',(select count(*)::int from ranked r where r.reason='inactive'),
      'birthday',(select count(*)::int from ranked r where r.reason='birthday'),
      'rebook_due',(select count(*)::int from ranked r where r.reason='rebook_due'),
      'verified_reviews',coalesce((v_review_summary->>'verified_reviews')::integer,0),
      'average_rating',case when v_review_summary->>'average_rating' is null then null else (v_review_summary->>'average_rating')::numeric end,
      'review_opportunities',coalesce((v_review_summary->>'review_opportunities')::integer,0),
      'qualified_referrals',(select count(*)::int from public.beauty_referrals br
        where br.organization_id=p_organization_id and br.company_id=p_company_id and br.status='qualified'),
      'pending_referrals',(select count(*)::int from public.beauty_referrals br
        where br.organization_id=p_organization_id and br.company_id=p_company_id and br.status='pending')
    ),
    'opportunities',coalesce((
      select jsonb_agg(jsonb_build_object(
        'client_id',r.id,'first_name',r.first_name,'last_name',r.last_name,
        'reason',r.reason,'score',r.score,'last_visit',r.last_visit,
        'next_appointment',r.next_appointment,'next_birthday',r.next_birthday,
        'last_staff_id',r.last_staff_id,'last_service_name',r.last_service_name
      ) order by r.score desc,r.last_visit nulls last)
      from (select * from ranked order by score desc,last_visit nulls last limit 60) r
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$


CREATE OR REPLACE FUNCTION public.beauty_audit_history_v2(p_organization_id uuid, p_company_id uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_since timestamp with time zone DEFAULT NULL::timestamp with time zone, p_category text DEFAULT 'all'::text, p_site_id uuid DEFAULT NULL::uuid, p_actor text DEFAULT 'all'::text, p_search text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path = public,private,pg_catalog
AS $function$
  select private.beauty_audit_history_v2(
    p_organization_id,p_company_id,p_limit,p_offset,p_since,p_category,p_site_id,p_actor,p_search
  );
$function$


CREATE OR REPLACE FUNCTION public.beauty_client_directory(p_organization_id uuid, p_company_id uuid, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_active_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path = public,private,pg_catalog
AS $function$
  with params as (
    select
      greatest(1,least(coalesce(p_limit,100),200)) as row_limit,
      greatest(0,coalesce(p_offset,0)) as row_offset,
      nullif(lower(btrim(coalesce(p_search,''))),'') as needle
  ),
  filtered as (
    select c.id,c.company_id,c.first_name,c.last_name,c.email,c.phone,c.notes,c.status,c.created_at
    from public.clients c
    cross join params p
    where c.organization_id=p_organization_id
      and c.company_id=p_company_id
      and case when p_active_only then c.status='active' else c.status<>'archived' end
      and (
        p.needle is null
        or lower(concat_ws(' ',c.first_name,c.last_name,c.email,c.phone)) like '%'||p.needle||'%'
      )
  ),
  page_rows as (
    select f.*
    from filtered f
    cross join params p
    order by f.created_at desc,f.id desc
    limit (select row_limit from params)
    offset (select row_offset from params)
  )
  select jsonb_build_object(
    'total',(select count(*)::int from filtered),
    'items',coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc)
      from page_rows r
    ),'[]'::jsonb)
  );
$function$


CREATE OR REPLACE FUNCTION public.beauty_growth_pilot_compact(p_organization_id uuid, p_company_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path = public,private,pg_catalog
AS $function$
  select private.beauty_growth_pilot_compact(p_organization_id,p_company_id);
$function$


revoke all on function public.beauty_client_directory(uuid,uuid,text,integer,integer,boolean) from public,anon;
grant execute on function public.beauty_client_directory(uuid,uuid,text,integer,integer,boolean) to authenticated,service_role;

revoke all on function private.beauty_audit_history_v2(uuid,uuid,integer,integer,timestamptz,text,uuid,text,text) from public,anon;
grant execute on function private.beauty_audit_history_v2(uuid,uuid,integer,integer,timestamptz,text,uuid,text,text) to authenticated,service_role;
revoke all on function public.beauty_audit_history_v2(uuid,uuid,integer,integer,timestamptz,text,uuid,text,text) from public,anon;
grant execute on function public.beauty_audit_history_v2(uuid,uuid,integer,integer,timestamptz,text,uuid,text,text) to authenticated,service_role;

revoke all on function private.beauty_growth_pilot_compact(uuid,uuid) from public,anon;
grant execute on function private.beauty_growth_pilot_compact(uuid,uuid) to authenticated,service_role;
revoke all on function public.beauty_growth_pilot_compact(uuid,uuid) from public,anon;
grant execute on function public.beauty_growth_pilot_compact(uuid,uuid) to authenticated,service_role;
