alter table public.organization_companies
  add column if not exists public_banner_landscape_zoom smallint not null default 100,
  add column if not exists public_banner_portrait_position_x smallint not null default 50,
  add column if not exists public_banner_portrait_position_y smallint not null default 50,
  add column if not exists public_banner_portrait_zoom smallint not null default 100;

alter table public.organization_companies
  drop constraint if exists organization_companies_public_banner_landscape_zoom_check;
alter table public.organization_companies
  add constraint organization_companies_public_banner_landscape_zoom_check
  check (public_banner_landscape_zoom between 100 and 250);

alter table public.organization_companies
  drop constraint if exists organization_companies_public_banner_portrait_position_x_check;
alter table public.organization_companies
  add constraint organization_companies_public_banner_portrait_position_x_check
  check (public_banner_portrait_position_x between 0 and 100);

alter table public.organization_companies
  drop constraint if exists organization_companies_public_banner_portrait_position_y_check;
alter table public.organization_companies
  add constraint organization_companies_public_banner_portrait_position_y_check
  check (public_banner_portrait_position_y between 0 and 100);

alter table public.organization_companies
  drop constraint if exists organization_companies_public_banner_portrait_zoom_check;
alter table public.organization_companies
  add constraint organization_companies_public_banner_portrait_zoom_check
  check (public_banner_portrait_zoom between 100 and 250);

CREATE OR REPLACE FUNCTION public.metier_update_company_public_banner_crop(p_organization_id uuid, p_company_id uuid, p_landscape_x integer, p_landscape_y integer, p_landscape_zoom integer, p_portrait_x integer, p_portrait_y integer, p_portrait_zoom integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_allowed boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;

  v_allowed := public.is_platform_super_admin()
    or public.has_org_role(p_organization_id,array['owner','admin'])
    or (
      public.has_org_role(p_organization_id,array['manager'])
      and public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid())
    );

  if not v_allowed then raise exception 'Droits insuffisants pour cette enseigne.'; end if;

  if p_landscape_x not between 0 and 100
     or p_landscape_y not between 0 and 100
     or p_portrait_x not between 0 and 100
     or p_portrait_y not between 0 and 100
     or p_landscape_zoom not between 100 and 250
     or p_portrait_zoom not between 100 and 250 then
    raise exception 'Le cadrage demandé est invalide.';
  end if;

  update public.organization_companies
  set public_banner_position_x=p_landscape_x::smallint,
      public_banner_position_y=p_landscape_y::smallint,
      public_banner_landscape_zoom=p_landscape_zoom::smallint,
      public_banner_portrait_position_x=p_portrait_x::smallint,
      public_banner_portrait_position_y=p_portrait_y::smallint,
      public_banner_portrait_zoom=p_portrait_zoom::smallint,
      updated_at=now()
  where id=p_company_id
    and organization_id=p_organization_id
    and status<>'archived';

  if not found then raise exception 'Enseigne introuvable.'; end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'metier.company_public_banner_crop_updated','organization_company',p_company_id::text,
    jsonb_build_object(
      'landscape',jsonb_build_object('x',p_landscape_x,'y',p_landscape_y,'zoom',p_landscape_zoom),
      'portrait',jsonb_build_object('x',p_portrait_x,'y',p_portrait_y,'zoom',p_portrait_zoom)
    )
  );

  return true;
end;
$function$;

revoke all on function public.metier_update_company_public_banner_crop(uuid,uuid,integer,integer,integer,integer,integer,integer) from public;
grant execute on function public.metier_update_company_public_banner_crop(uuid,uuid,integer,integer,integer,integer,integer,integer) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.metier_public_page_configuration(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_is_full_access boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.plan = 'metier'
      and o.business_type = 'coiffure'
      and o.status in ('trial','active')
  ) then
    raise exception 'Espace Coiffure & Beauté Métier actif requis.';
  end if;

  v_is_full_access := public.is_platform_super_admin()
    or public.has_org_role(p_organization_id, array['owner','admin']);

  if not v_is_full_access
     and not public.has_org_role(p_organization_id, array['manager']) then
    raise exception 'Droits insuffisants.';
  end if;

  return jsonb_build_object(
    'companies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,
        'name',c.name,
        'logo_url',c.logo_url,
        'primary_color',c.primary_color,
        'booking_enabled',c.booking_enabled,
        'public_slug',c.public_slug,
        'public_page_enabled',c.public_page_enabled,
        'public_tagline',c.public_tagline,
        'public_description',c.public_description,
        'public_banner_url',c.public_banner_url,
        'public_banner_position_x',c.public_banner_position_x,
        'public_banner_position_y',c.public_banner_position_y,
        'public_banner_landscape_zoom',c.public_banner_landscape_zoom,
        'public_banner_portrait_position_x',c.public_banner_portrait_position_x,
        'public_banner_portrait_position_y',c.public_banner_portrait_position_y,
        'public_banner_portrait_zoom',c.public_banner_portrait_zoom,
        'public_hours_text',c.public_hours_text,
        'public_practical_info',c.public_practical_info,
        'site_count',(select count(*) from public.organization_sites s where s.organization_id=c.organization_id and s.company_id=c.id and s.status='active'),
        'staff_count',(select count(*) from public.staff st where st.organization_id=c.organization_id and st.company_id=c.id and st.active=true),
        'service_count',(select count(*) from public.services sv where sv.organization_id=c.organization_id and sv.company_id=c.id and sv.active=true)
      ) order by c.is_primary desc,c.name)
      from public.organization_companies c
      where c.organization_id = p_organization_id
        and c.status <> 'archived'
        and (
          v_is_full_access
          or public.metier_company_access_allows(p_organization_id,c.id,auth.uid())
        )
    ), '[]'::jsonb)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_metier_coiffure_company_page(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_company public.organization_companies%rowtype;
  v_org public.organizations%rowtype;
  v_sites jsonb;
  v_services jsonb;
  v_staff jsonb;
  v_logo text;
  v_color text;
  v_brand_name text;
begin
  select c.* into v_company
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and o.plan='metier'
    and o.status in ('trial','active')
  limit 1;
  if v_company.id is null then return null; end if;

  select * into v_org from public.organizations where id=v_company.organization_id;
  select coalesce(b.logo_url,b.compact_logo_url),coalesce(b.primary_color,v_company.primary_color),b.name
  into v_logo,v_color,v_brand_name
  from public.organization_brands b
  where b.organization_id=v_company.organization_id and b.company_id=v_company.id and b.status='active'
  order by b.is_primary desc,b.created_at
  limit 1;
  v_logo := coalesce(v_company.logo_url,v_logo,v_org.logo_url);
  v_color := coalesce(v_company.primary_color,v_color,v_org.primary_color,'#2997ff');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'name',s.name,'address',s.address,'postal_code',s.postal_code,'city',s.city,
    'phone',coalesce(s.phone,v_company.phone),'email',coalesce(s.email,v_company.email),'timezone',s.timezone,'is_primary',s.is_primary
  ) order by s.is_primary desc,s.name),'[]'::jsonb)
  into v_sites
  from public.organization_sites s
  where s.organization_id=v_company.organization_id and s.company_id=v_company.id and s.status='active';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',sv.id,'name',sv.name,'description',sv.description,'duration_minutes',sv.duration_minutes,'price_cents',sv.price_cents,
    'image_url',sv.image_url,'category_name',nullif(trim(sv.category_name),''),
    'online_booking_enabled',sv.online_booking_enabled,
    'booking_min_notice_hours',sv.booking_min_notice_hours,
    'booking_max_days_ahead',sv.booking_max_days_ahead,
    'booking_buffer_before_minutes',sv.booking_buffer_before_minutes,
    'booking_buffer_after_minutes',sv.booking_buffer_after_minutes,
    'booking_weekdays',sv.booking_weekdays,
    'booking_start_time',sv.booking_start_time,
    'booking_end_time',sv.booking_end_time
  ) order by coalesce(nullif(trim(sv.category_name),''),'Autres'),sv.name),'[]'::jsonb)
  into v_services
  from public.services sv
  where sv.organization_id=v_company.organization_id and sv.company_id=v_company.id and sv.active=true
    and coalesce(sv.online_booking_enabled,true)=true
    and exists(
      select 1 from public.staff_services ss
      join public.staff st on st.organization_id=ss.organization_id and st.id=ss.staff_id and st.active=true and st.company_id=v_company.id
      where ss.organization_id=v_company.organization_id and ss.service_id=sv.id
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',st.id,'display_name',st.display_name,'color',st.color,'site_id',st.site_id,
    'service_ids',coalesce((select jsonb_agg(ss.service_id order by ss.service_id) from public.staff_services ss where ss.organization_id=st.organization_id and ss.staff_id=st.id),'[]'::jsonb)
  ) order by st.display_name),'[]'::jsonb)
  into v_staff
  from public.staff st
  where st.organization_id=v_company.organization_id and st.company_id=v_company.id and st.active=true
    and exists(select 1 from public.staff_working_hours h where h.organization_id=st.organization_id and h.staff_id=st.id);

  return jsonb_build_object(
    'company',jsonb_build_object(
      'id',v_company.id,'organization_id',v_company.organization_id,'name',coalesce(v_brand_name,v_company.name),
      'legal_name',v_company.legal_name,'public_slug',v_company.public_slug,'logo_url',v_logo,'primary_color',v_color,
      'tagline',v_company.public_tagline,'description',v_company.public_description,'banner_url',v_company.public_banner_url,
      'banner_position_x',v_company.public_banner_position_x,'banner_position_y',v_company.public_banner_position_y,
      'banner_landscape_zoom',v_company.public_banner_landscape_zoom,
      'banner_portrait_position_x',v_company.public_banner_portrait_position_x,
      'banner_portrait_position_y',v_company.public_banner_portrait_position_y,
      'banner_portrait_zoom',v_company.public_banner_portrait_zoom,
      'hours_text',v_company.public_hours_text,'practical_info',v_company.public_practical_info,
      'email',v_company.email,'phone',v_company.phone,'booking_enabled',v_company.booking_enabled,
      'show_ncr_branding',coalesce(v_org.show_ncr_branding,true)
    ),
    'settings',jsonb_build_object(
      'confirmation_mode',v_org.booking_confirmation_mode,'slot_interval',v_org.booking_slot_interval,
      'min_notice_hours',v_org.booking_min_notice_hours,'max_days_ahead',v_org.booking_max_days_ahead,
      'cancel_notice_hours',v_org.booking_cancel_notice_hours,'welcome_text',v_org.booking_welcome_text,
      'cancellation_policy',v_org.booking_cancellation_policy,'privacy_notice',v_org.booking_privacy_notice,
      'contact_email',coalesce(v_company.email,v_org.booking_contact_email),'contact_phone',coalesce(v_company.phone,v_org.booking_contact_phone)
    ),
    'sites',v_sites,'services',v_services,'staff',v_staff
  );
end;
$function$;
