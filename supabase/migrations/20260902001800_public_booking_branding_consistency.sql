create or replace function public.get_public_booking_page(p_slug text)
returns jsonb
language plpgsql
stable security definer
set search_path = public,pg_catalog
as $function$
declare
  v_organization public.organizations%rowtype;
  v_services jsonb;
  v_staff jsonb;
  v_sites jsonb;
  v_has_commercial_branding boolean;
begin
  select * into v_organization
  from public.organizations
  where slug = lower(trim(p_slug))
    and status in ('trial','active')
    and business_type = 'coiffure'
    and booking_enabled = true;

  if v_organization.id is null then return null; end if;

  v_has_commercial_branding := v_organization.plan in ('professionnelle','metier');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'name', s.name, 'address', s.address,
    'postal_code', s.postal_code, 'city', s.city,
    'phone', s.phone, 'email', s.email,
    'timezone', s.timezone, 'is_primary', s.is_primary
  ) order by s.is_primary desc, s.name), '[]'::jsonb)
  into v_sites
  from public.organization_sites s
  where s.organization_id = v_organization.id
    and s.status = 'active'
    and v_organization.plan = 'metier';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'name', s.name, 'description', s.description,
    'duration_minutes', s.duration_minutes, 'price_cents', s.price_cents
  ) order by s.name), '[]'::jsonb)
  into v_services
  from public.services s
  where s.organization_id = v_organization.id
    and s.active = true
    and exists (
      select 1
      from public.staff_services ss
      join public.staff st on st.organization_id = ss.organization_id and st.id = ss.staff_id and st.active = true
      where ss.organization_id = v_organization.id and ss.service_id = s.id
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', st.id, 'display_name', st.display_name, 'color', st.color,
    'site_id', st.site_id,
    'service_ids', coalesce((
      select jsonb_agg(ss.service_id order by ss.service_id)
      from public.staff_services ss
      where ss.organization_id = v_organization.id and ss.staff_id = st.id
    ), '[]'::jsonb)
  ) order by st.display_name), '[]'::jsonb)
  into v_staff
  from public.staff st
  where st.organization_id = v_organization.id
    and st.active = true
    and (v_organization.plan <> 'metier' or st.site_id is not null)
    and exists (
      select 1 from public.staff_working_hours h
      where h.organization_id = v_organization.id and h.staff_id = st.id
    );

  return jsonb_build_object(
    'organization', jsonb_build_object(
      'id', v_organization.id,
      'name', case when v_has_commercial_branding then coalesce(v_organization.public_name, v_organization.name) else v_organization.name end,
      'slug', v_organization.slug,
      'primary_color', coalesce(v_organization.primary_color, '#2997ff'),
      'logo_url', v_organization.logo_url,
      'banner_url', case when v_has_commercial_branding then v_organization.booking_banner_url else null end,
      'tagline', case when v_has_commercial_branding then v_organization.booking_tagline else null end,
      'address', case when v_has_commercial_branding then v_organization.booking_address else null end,
      'hours_text', case when v_has_commercial_branding then v_organization.booking_hours_text else null end,
      'practical_info', case when v_has_commercial_branding then v_organization.booking_practical_info else null end,
      'show_ncr_branding', case when v_has_commercial_branding then v_organization.show_ncr_branding else true end,
      'timezone', v_organization.timezone
    ),
    'settings', jsonb_build_object(
      'confirmation_mode', v_organization.booking_confirmation_mode,
      'slot_interval', v_organization.booking_slot_interval,
      'min_notice_hours', v_organization.booking_min_notice_hours,
      'max_days_ahead', v_organization.booking_max_days_ahead,
      'cancel_notice_hours', v_organization.booking_cancel_notice_hours,
      'welcome_text', v_organization.booking_welcome_text,
      'cancellation_policy', v_organization.booking_cancellation_policy,
      'privacy_notice', v_organization.booking_privacy_notice,
      'contact_email', v_organization.booking_contact_email,
      'contact_phone', v_organization.booking_contact_phone
    ),
    'sites', v_sites,
    'services', v_services,
    'staff', v_staff
  );
end;
$function$;

grant execute on function public.get_public_booking_page(text) to anon, authenticated;
