create or replace function public.metier_beauty_accessible_enseignes(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_plan text;
  v_business_type text;
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'Accès au centre requis.';
  end if;

  select o.plan::text, o.business_type::text
    into v_plan, v_business_type
  from public.organizations o
  where o.id = p_organization_id;

  if v_plan is distinct from 'metier' or v_business_type is distinct from 'coiffure' then
    raise exception 'Cette vue est réservée à Coiffure & Beauté Métier.';
  end if;

  return jsonb_build_object(
    'enseignes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'logo_url', c.logo_url,
          'primary_color', c.primary_color,
          'is_primary', c.is_primary,
          'booking_enabled', c.booking_enabled,
          'public_slug', c.public_slug,
          'public_page_enabled', c.public_page_enabled,
          'public_banner_url', c.public_banner_url,
          'sites', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', s.id,
                'name', s.name,
                'is_primary', s.is_primary,
                'location_id', s.location_id,
                'location_name', l.name,
                'address', coalesce(l.address, s.address),
                'postal_code', coalesce(l.postal_code, s.postal_code),
                'city', coalesce(l.city, s.city)
              )
              order by s.is_primary desc, s.name
            )
            from public.organization_sites s
            left join public.organization_locations l on l.id = s.location_id
            where s.organization_id = p_organization_id
              and s.company_id = c.id
              and s.status = 'active'
              and public.metier_member_can_access_site(p_organization_id, s.id)
          ), '[]'::jsonb)
        )
        order by c.is_primary desc, c.name
      )
      from public.organization_companies c
      where c.organization_id = p_organization_id
        and c.status = 'active'
        and public.metier_company_access_allows(p_organization_id, c.id)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.metier_beauty_accessible_enseignes(uuid) from public;
grant execute on function public.metier_beauty_accessible_enseignes(uuid) to authenticated;
