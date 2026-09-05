-- Re-apply the corrected CRM segment functions after resolving consent ordering against recorded_at/id.

CREATE OR REPLACE FUNCTION private.beauty_crm_segment_clients(p_organization_id uuid, p_company_id uuid, p_segment text DEFAULT 'all'::text, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_catalog'
AS $function$
declare
  v_segment text:=coalesce(nullif(trim(p_segment),''),'all');
  v_search text:=nullif(lower(trim(coalesce(p_search,''))),'');
  v_limit integer:=greatest(1,least(coalesce(p_limit,100),250));
  v_offset integer:=greatest(0,coalesce(p_offset,0));
  v_vip_threshold integer;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour consulter le CRM.';
  end if;

  if v_segment not in ('all','marketing','new','loyal','vip','rebook_due','inactive','lost','birthday','prospect','at_risk') then
    raise exception 'Segment CRM invalide.';
  end if;

  select coalesce(nullif(s.loyalty_status_vip_visits,0),10)
  into v_vip_threshold
  from public.beauty_company_loyalty_settings s
  where s.organization_id=p_organization_id and s.company_id=p_company_id;
  v_vip_threshold:=coalesce(v_vip_threshold,10);

  with metrics as (
    select
      c.id,c.first_name,c.last_name,c.email,c.phone,c.birth_date,c.created_at,
      coalesce((
        select bc.granted
        from public.beauty_client_consents bc
        where bc.organization_id=p_organization_id and bc.company_id=p_company_id
          and bc.client_id=c.id and bc.consent_type='marketing'
        order by bc.recorded_at desc,bc.id desc limit 1
      ),c.marketing_opt_in,false) as marketing_allowed,
      coalesce((
        select bc.granted
        from public.beauty_client_consents bc
        where bc.organization_id=p_organization_id and bc.company_id=p_company_id
          and bc.client_id=c.id and bc.consent_type='birthday'
        order by bc.recorded_at desc,bc.id desc limit 1
      ),c.birthday_consent,false) as birthday_allowed,
      coalesce(a.visit_count,0)::int as visit_count,
      coalesce(a.total_spent_cents,0)::bigint as total_spent_cents,
      a.first_visit,a.last_visit,a.next_appointment,a.average_days_between,
      coalesce(a.no_show_count,0)::int as no_show_count,
      last_appt.last_service_name,
      last_appt.last_staff_name
    from public.clients c
    left join lateral (
      select
        count(*) filter(where ap.status='completed')::int as visit_count,
        coalesce(sum(ap.amount_cents) filter(where ap.status='completed'),0)::bigint as total_spent_cents,
        min(ap.starts_at) filter(where ap.status='completed') as first_visit,
        max(ap.starts_at) filter(where ap.status='completed') as last_visit,
        min(ap.starts_at) filter(where ap.status in ('pending','confirmed') and ap.starts_at>=now()) as next_appointment,
        count(*) filter(where ap.status='no_show')::int as no_show_count,
        case when count(*) filter(where ap.status='completed')>=2 then
          round((extract(epoch from (
            max(ap.starts_at) filter(where ap.status='completed')
            - min(ap.starts_at) filter(where ap.status='completed')
          ))/86400.0)/greatest(1,(count(*) filter(where ap.status='completed'))-1),1)
        else null end as average_days_between
      from public.appointments ap
      where ap.organization_id=p_organization_id and ap.company_id=p_company_id and ap.client_id=c.id
    ) a on true
    left join lateral (
      select
        coalesce((
          select string_agg(asi.service_name,' + ' order by asi.position)
          from public.appointment_service_items asi where asi.appointment_id=ap.id
        ),sv.name,'Prestation') as last_service_name,
        coalesce(st.display_name,'Équipe') as last_staff_name
      from public.appointments ap
      left join public.services sv on sv.id=ap.service_id and sv.organization_id=p_organization_id and sv.company_id=p_company_id
      left join public.staff st on st.id=ap.staff_id and st.organization_id=p_organization_id and st.company_id=p_company_id
      where ap.organization_id=p_organization_id and ap.company_id=p_company_id
        and ap.client_id=c.id and ap.status='completed'
      order by ap.starts_at desc
      limit 1
    ) last_appt on true
    where c.organization_id=p_organization_id and c.company_id=p_company_id and c.status='active'
  ),
  segmented as (
    select m.*,
      public.beauty_next_birthday(m.birth_date,current_date) as next_birthday,
      array_remove(array[
        'all',
        case when m.marketing_allowed then 'marketing' end,
        case when m.visit_count=0 then 'prospect' end,
        case when m.first_visit>=now()-interval '30 days' then 'new' end,
        case when m.visit_count>=5 then 'loyal' end,
        case when m.visit_count>=v_vip_threshold then 'vip' end,
        case when m.visit_count>0 and m.next_appointment is null
          and m.last_visit < now()-make_interval(days=>greatest(30,ceil(coalesce(m.average_days_between,30)*1.15)::int))
          and m.last_visit >= now()-interval '60 days' then 'rebook_due' end,
        case when m.visit_count>0 and m.next_appointment is null
          and m.last_visit < now()-interval '60 days'
          and m.last_visit >= now()-interval '120 days' then 'inactive' end,
        case when m.visit_count>0 and m.next_appointment is null
          and m.last_visit < now()-interval '120 days' then 'lost' end,
        case when m.birthday_allowed and m.birth_date is not null
          and public.beauty_next_birthday(m.birth_date,current_date)<=current_date+30 then 'birthday' end,
        case when m.no_show_count>=2 then 'at_risk' end
      ],null)::text[] as segment_keys
    from metrics m
  ),
  filtered as (
    select *
    from segmented s
    where v_segment=any(s.segment_keys)
      and (
        v_search is null
        or lower(concat_ws(' ',s.first_name,s.last_name,s.email,s.phone)) like '%'||v_search||'%'
      )
  ),
  page as (
    select *
    from filtered
    order by
      case v_segment
        when 'rebook_due' then extract(epoch from last_visit)
        when 'inactive' then extract(epoch from last_visit)
        when 'lost' then extract(epoch from last_visit)
        else null
      end asc nulls last,
      total_spent_cents desc,
      last_visit desc nulls last,
      first_name,last_name
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'segment',v_segment,
    'total',(select count(*)::int from filtered),
    'limit',v_limit,
    'offset',v_offset,
    'items',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,
        'first_name',p.first_name,
        'last_name',p.last_name,
        'email',p.email,
        'phone',p.phone,
        'marketing_allowed',p.marketing_allowed,
        'birthday_allowed',p.birthday_allowed,
        'birth_date',p.birth_date,
        'next_birthday',p.next_birthday,
        'visit_count',p.visit_count,
        'total_spent_cents',p.total_spent_cents,
        'first_visit',p.first_visit,
        'last_visit',p.last_visit,
        'next_appointment',p.next_appointment,
        'average_days_between',p.average_days_between,
        'no_show_count',p.no_show_count,
        'last_service_name',p.last_service_name,
        'last_staff_name',p.last_staff_name,
        'segment_keys',to_jsonb(p.segment_keys)
      ) order by
        case v_segment
          when 'rebook_due' then extract(epoch from p.last_visit)
          when 'inactive' then extract(epoch from p.last_visit)
          when 'lost' then extract(epoch from p.last_visit)
          else null
        end asc nulls last,
        p.total_spent_cents desc,
        p.last_visit desc nulls last,
        p.first_name,p.last_name
      )
      from page p
    ),'[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$function$


CREATE OR REPLACE FUNCTION private.beauty_crm_segments_dashboard(p_organization_id uuid, p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_catalog'
AS $function$
declare
  v_vip_threshold integer;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour consulter le CRM.';
  end if;

  if not exists(
    select 1 from public.organization_companies c
    join public.organizations o on o.id=c.organization_id
    where c.id=p_company_id and c.organization_id=p_organization_id and c.status='active'
      and o.business_type='coiffure' and o.plan='metier'
  ) then
    raise exception 'Enseigne Beauty introuvable.';
  end if;

  select coalesce(nullif(s.loyalty_status_vip_visits,0),10)
  into v_vip_threshold
  from public.beauty_company_loyalty_settings s
  where s.organization_id=p_organization_id and s.company_id=p_company_id;

  v_vip_threshold:=coalesce(v_vip_threshold,10);

  with metrics as (
    select
      c.id,
      coalesce((
        select bc.granted
        from public.beauty_client_consents bc
        where bc.organization_id=p_organization_id and bc.company_id=p_company_id
          and bc.client_id=c.id and bc.consent_type='marketing'
        order by bc.recorded_at desc,bc.id desc
        limit 1
      ),c.marketing_opt_in,false) as marketing_allowed,
      coalesce((
        select bc.granted
        from public.beauty_client_consents bc
        where bc.organization_id=p_organization_id and bc.company_id=p_company_id
          and bc.client_id=c.id and bc.consent_type='birthday'
        order by bc.recorded_at desc,bc.id desc
        limit 1
      ),c.birthday_consent,false) as birthday_allowed,
      c.birth_date,
      c.email,
      c.phone,
      coalesce(a.visit_count,0)::int as visit_count,
      coalesce(a.total_spent_cents,0)::bigint as total_spent_cents,
      a.first_visit,
      a.last_visit,
      a.next_appointment,
      a.average_days_between,
      coalesce(a.no_show_count,0)::int as no_show_count
    from public.clients c
    left join lateral (
      select
        count(*) filter(where ap.status='completed')::int as visit_count,
        coalesce(sum(ap.amount_cents) filter(where ap.status='completed'),0)::bigint as total_spent_cents,
        min(ap.starts_at) filter(where ap.status='completed') as first_visit,
        max(ap.starts_at) filter(where ap.status='completed') as last_visit,
        min(ap.starts_at) filter(where ap.status in ('pending','confirmed') and ap.starts_at>=now()) as next_appointment,
        count(*) filter(where ap.status='no_show')::int as no_show_count,
        case when count(*) filter(where ap.status='completed')>=2 then
          round((
            extract(epoch from (
              max(ap.starts_at) filter(where ap.status='completed')
              - min(ap.starts_at) filter(where ap.status='completed')
            ))/86400.0
          ) / greatest(1,(count(*) filter(where ap.status='completed'))-1),1)
        else null end as average_days_between
      from public.appointments ap
      where ap.organization_id=p_organization_id and ap.company_id=p_company_id and ap.client_id=c.id
    ) a on true
    where c.organization_id=p_organization_id and c.company_id=p_company_id and c.status='active'
  ),
  segmented as (
    select m.*,
      array_remove(array[
        'all',
        case when m.marketing_allowed then 'marketing' end,
        case when m.visit_count=0 then 'prospect' end,
        case when m.first_visit>=now()-interval '30 days' then 'new' end,
        case when m.visit_count>=5 then 'loyal' end,
        case when m.visit_count>=v_vip_threshold then 'vip' end,
        case when m.visit_count>0 and m.next_appointment is null
          and m.last_visit < now()-make_interval(days=>greatest(30,ceil(coalesce(m.average_days_between,30)*1.15)::int))
          and m.last_visit >= now()-interval '60 days' then 'rebook_due' end,
        case when m.visit_count>0 and m.next_appointment is null
          and m.last_visit < now()-interval '60 days'
          and m.last_visit >= now()-interval '120 days' then 'inactive' end,
        case when m.visit_count>0 and m.next_appointment is null
          and m.last_visit < now()-interval '120 days' then 'lost' end,
        case when m.birthday_allowed and m.birth_date is not null
          and public.beauty_next_birthday(m.birth_date,current_date)<=current_date+30 then 'birthday' end,
        case when m.no_show_count>=2 then 'at_risk' end
      ],null)::text[] as segment_keys
    from metrics m
  ),
  keys(key,sort_order) as (
    values
      ('all',1),('marketing',2),('new',3),('loyal',4),('vip',5),
      ('rebook_due',6),('inactive',7),('lost',8),('birthday',9),('prospect',10),('at_risk',11)
  ),
  segment_counts as (
    select
      k.key,
      k.sort_order,
      count(s.id) filter(where k.key=any(s.segment_keys))::int as count,
      count(s.id) filter(where k.key=any(s.segment_keys) and s.marketing_allowed)::int as marketing_eligible_count
    from keys k cross join segmented s
    group by k.key,k.sort_order
  )
  select jsonb_build_object(
    'summary',jsonb_build_object(
      'active_clients',count(*)::int,
      'marketing_allowed',count(*) filter(where marketing_allowed)::int,
      'with_email',count(*) filter(where nullif(trim(coalesce(email,'')),'') is not null)::int,
      'with_phone',count(*) filter(where nullif(trim(coalesce(phone,'')),'') is not null)::int,
      'average_visits',coalesce(round(avg(visit_count),1),0),
      'average_spent_cents',coalesce(round(avg(total_spent_cents)),0),
      'vip_threshold_visits',v_vip_threshold
    ),
    'segments',coalesce((
      select jsonb_agg(jsonb_build_object(
        'key',sc.key,
        'count',sc.count,
        'marketing_eligible_count',sc.marketing_eligible_count
      ) order by sc.sort_order)
      from segment_counts sc
    ),'[]'::jsonb)
  )
  into v_result
  from segmented;

  return v_result;
end;
$function$
