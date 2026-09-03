alter table public.services
  add column if not exists image_url text;

comment on column public.services.image_url is 'Optional public illustration for a Beauty service/prestation.';

create or replace function public.get_public_metier_coiffure_company_page(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $function$
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
    'image_url',sv.image_url
  ) order by sv.name),'[]'::jsonb)
  into v_services
  from public.services sv
  where sv.organization_id=v_company.organization_id and sv.company_id=v_company.id and sv.active=true
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
