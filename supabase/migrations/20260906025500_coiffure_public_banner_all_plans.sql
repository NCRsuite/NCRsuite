-- NCR Suite · Coiffure
-- La qualité visuelle de la page publique est commune à toutes les offres.
-- Cette migration ouvre uniquement la photo de couverture + cadrage paysage/portrait.
-- Les autres droits de personnalisation commerciale restent inchangés.

begin;

alter table public.organizations
  add column if not exists booking_banner_position_x smallint not null default 50,
  add column if not exists booking_banner_position_y smallint not null default 50,
  add column if not exists booking_banner_landscape_zoom smallint not null default 100,
  add column if not exists booking_banner_portrait_position_x smallint not null default 50,
  add column if not exists booking_banner_portrait_position_y smallint not null default 50,
  add column if not exists booking_banner_portrait_zoom smallint not null default 100;

alter table public.organizations
  drop constraint if exists organizations_booking_banner_position_x_check;
alter table public.organizations
  add constraint organizations_booking_banner_position_x_check
  check (booking_banner_position_x between 0 and 100);

alter table public.organizations
  drop constraint if exists organizations_booking_banner_position_y_check;
alter table public.organizations
  add constraint organizations_booking_banner_position_y_check
  check (booking_banner_position_y between 0 and 100);

alter table public.organizations
  drop constraint if exists organizations_booking_banner_landscape_zoom_check;
alter table public.organizations
  add constraint organizations_booking_banner_landscape_zoom_check
  check (booking_banner_landscape_zoom between 100 and 250);

alter table public.organizations
  drop constraint if exists organizations_booking_banner_portrait_position_x_check;
alter table public.organizations
  add constraint organizations_booking_banner_portrait_position_x_check
  check (booking_banner_portrait_position_x between 0 and 100);

alter table public.organizations
  drop constraint if exists organizations_booking_banner_portrait_position_y_check;
alter table public.organizations
  add constraint organizations_booking_banner_portrait_position_y_check
  check (booking_banner_portrait_position_y between 0 and 100);

alter table public.organizations
  drop constraint if exists organizations_booking_banner_portrait_zoom_check;
alter table public.organizations
  add constraint organizations_booking_banner_portrait_zoom_check
  check (booking_banner_portrait_zoom between 100 and 250);

create or replace function public.update_coiffure_public_banner(
  p_organization_id uuid,
  p_banner_url text,
  p_landscape_x integer,
  p_landscape_y integer,
  p_landscape_zoom integer,
  p_portrait_x integer,
  p_portrait_y integer,
  p_portrait_zoom integer
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  v_banner_url text:=nullif(trim(coalesce(p_banner_url,'')),'');
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id=p_organization_id
      and o.business_type='coiffure'
      and o.status in ('trial','active')
  ) then
    raise exception 'Un espace Coiffure actif est requis.';
  end if;

  if v_banner_url is not null
     and (char_length(v_banner_url)>1600 or left(lower(v_banner_url),8)<>'https://') then
    raise exception 'L adresse de la photo est invalide.';
  end if;

  if p_landscape_x not between 0 and 100
     or p_landscape_y not between 0 and 100
     or p_portrait_x not between 0 and 100
     or p_portrait_y not between 0 and 100
     or p_landscape_zoom not between 100 and 250
     or p_portrait_zoom not between 100 and 250 then
    raise exception 'Le cadrage demandé est invalide.';
  end if;

  update public.organizations
  set booking_banner_url=v_banner_url,
      booking_banner_position_x=p_landscape_x::smallint,
      booking_banner_position_y=p_landscape_y::smallint,
      booking_banner_landscape_zoom=p_landscape_zoom::smallint,
      booking_banner_portrait_position_x=p_portrait_x::smallint,
      booking_banner_portrait_position_y=p_portrait_y::smallint,
      booking_banner_portrait_zoom=p_portrait_zoom::smallint,
      updated_at=now()
  where id=p_organization_id;

  insert into public.audit_logs(
    organization_id,user_id,action,entity_type,entity_id,metadata
  ) values (
    p_organization_id,
    auth.uid(),
    'booking.public_banner_updated',
    'organization',
    p_organization_id::text,
    jsonb_build_object(
      'has_banner',v_banner_url is not null,
      'landscape',jsonb_build_object(
        'x',p_landscape_x,'y',p_landscape_y,'zoom',p_landscape_zoom
      ),
      'portrait',jsonb_build_object(
        'x',p_portrait_x,'y',p_portrait_y,'zoom',p_portrait_zoom
      )
    )
  );

  return jsonb_build_object(
    'banner_url',v_banner_url,
    'landscape_x',p_landscape_x,
    'landscape_y',p_landscape_y,
    'landscape_zoom',p_landscape_zoom,
    'portrait_x',p_portrait_x,
    'portrait_y',p_portrait_y,
    'portrait_zoom',p_portrait_zoom
  );
end;
$$;

revoke all on function public.update_coiffure_public_banner(
  uuid,text,integer,integer,integer,integer,integer,integer
) from public,anon;
grant execute on function public.update_coiffure_public_banner(
  uuid,text,integer,integer,integer,integer,integer,integer
) to authenticated;

-- Version courante de get_public_booking_page enrichie avec le cadrage.
-- La bannière devient un élément de qualité de base Coiffure, quel que soit le forfait.
create or replace function public.get_public_booking_page(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_catalog
as $$
declare
  v_company_page jsonb;
  v_company jsonb;
  v_organization public.organizations%rowtype;
  v_services jsonb;
  v_staff jsonb;
  v_sites jsonb;
  v_has_commercial_branding boolean;
begin
  v_company_page:=public.get_public_metier_coiffure_company_page(p_slug);
  if v_company_page is not null then
    v_company:=v_company_page->'company';
    return jsonb_build_object(
      'organization',jsonb_build_object(
        'id',v_company->>'id',
        'name',v_company->>'name',
        'slug',v_company->>'public_slug',
        'primary_color',coalesce(v_company->>'primary_color','#2997ff'),
        'logo_url',v_company->>'logo_url',
        'banner_url',v_company->>'banner_url',
        'banner_position_x',coalesce((v_company->>'banner_position_x')::integer,50),
        'banner_position_y',coalesce((v_company->>'banner_position_y')::integer,50),
        'banner_landscape_zoom',coalesce((v_company->>'banner_landscape_zoom')::integer,100),
        'banner_portrait_position_x',coalesce((v_company->>'banner_portrait_position_x')::integer,50),
        'banner_portrait_position_y',coalesce((v_company->>'banner_portrait_position_y')::integer,50),
        'banner_portrait_zoom',coalesce((v_company->>'banner_portrait_zoom')::integer,100),
        'tagline',v_company->>'tagline',
        'address',coalesce((v_company_page->'sites'->0->>'address'),''),
        'hours_text',v_company->>'hours_text',
        'practical_info',v_company->>'practical_info',
        'show_ncr_branding',coalesce((v_company->>'show_ncr_branding')::boolean,true),
        'timezone',coalesce((v_company_page->'sites'->0->>'timezone'),'Europe/Paris')
      ),
      'settings',v_company_page->'settings',
      'sites',coalesce(v_company_page->'sites','[]'::jsonb),
      'services',coalesce(v_company_page->'services','[]'::jsonb),
      'staff',coalesce(v_company_page->'staff','[]'::jsonb)
    );
  end if;

  select * into v_organization
  from public.organizations
  where slug=lower(trim(p_slug))
    and status in ('trial','active')
    and business_type='coiffure'
    and booking_enabled=true;

  if v_organization.id is null then return null; end if;
  v_has_commercial_branding:=v_organization.plan in ('professionnelle','metier');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'name',s.name,'address',s.address,'postal_code',s.postal_code,'city',s.city,
    'phone',s.phone,'email',s.email,'timezone',s.timezone,'is_primary',s.is_primary
  ) order by s.is_primary desc,s.name),'[]'::jsonb)
  into v_sites
  from public.organization_sites s
  where s.organization_id=v_organization.id
    and s.status='active'
    and v_organization.plan='metier';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'name',s.name,'description',s.description,
    'duration_minutes',s.duration_minutes,'price_cents',s.price_cents
  ) order by s.name),'[]'::jsonb)
  into v_services
  from public.services s
  where s.organization_id=v_organization.id
    and s.active=true
    and exists (
      select 1
      from public.staff_services ss
      join public.staff st
        on st.organization_id=ss.organization_id
       and st.id=ss.staff_id
       and st.active=true
      where ss.organization_id=v_organization.id
        and ss.service_id=s.id
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',st.id,
    'display_name',st.display_name,
    'color',st.color,
    'site_id',st.site_id,
    'service_ids',coalesce((
      select jsonb_agg(ss.service_id order by ss.service_id)
      from public.staff_services ss
      where ss.organization_id=v_organization.id
        and ss.staff_id=st.id
    ),'[]'::jsonb)
  ) order by st.display_name),'[]'::jsonb)
  into v_staff
  from public.staff st
  where st.organization_id=v_organization.id
    and st.active=true
    and (v_organization.plan<>'metier' or st.site_id is not null)
    and exists (
      select 1
      from public.staff_working_hours h
      where h.organization_id=v_organization.id
        and h.staff_id=st.id
    );

  return jsonb_build_object(
    'organization',jsonb_build_object(
      'id',v_organization.id,
      'name',case
        when v_has_commercial_branding then coalesce(v_organization.public_name,v_organization.name)
        else v_organization.name
      end,
      'slug',v_organization.slug,
      'primary_color',coalesce(v_organization.primary_color,'#2997ff'),
      'logo_url',v_organization.logo_url,
      'banner_url',v_organization.booking_banner_url,
      'banner_position_x',v_organization.booking_banner_position_x,
      'banner_position_y',v_organization.booking_banner_position_y,
      'banner_landscape_zoom',v_organization.booking_banner_landscape_zoom,
      'banner_portrait_position_x',v_organization.booking_banner_portrait_position_x,
      'banner_portrait_position_y',v_organization.booking_banner_portrait_position_y,
      'banner_portrait_zoom',v_organization.booking_banner_portrait_zoom,
      'tagline',case when v_has_commercial_branding then v_organization.booking_tagline else null end,
      'address',case when v_has_commercial_branding then v_organization.booking_address else null end,
      'hours_text',case when v_has_commercial_branding then v_organization.booking_hours_text else null end,
      'practical_info',case when v_has_commercial_branding then v_organization.booking_practical_info else null end,
      'show_ncr_branding',case when v_has_commercial_branding then v_organization.show_ncr_branding else true end,
      'timezone',v_organization.timezone
    ),
    'settings',jsonb_build_object(
      'confirmation_mode',v_organization.booking_confirmation_mode,
      'slot_interval',v_organization.booking_slot_interval,
      'min_notice_hours',v_organization.booking_min_notice_hours,
      'max_days_ahead',v_organization.booking_max_days_ahead,
      'cancel_notice_hours',v_organization.booking_cancel_notice_hours,
      'welcome_text',v_organization.booking_welcome_text,
      'cancellation_policy',v_organization.booking_cancellation_policy,
      'privacy_notice',v_organization.booking_privacy_notice,
      'contact_email',v_organization.booking_contact_email,
      'contact_phone',v_organization.booking_contact_phone
    ),
    'sites',v_sites,
    'services',v_services,
    'staff',v_staff
  );
end;
$$;

revoke all on function public.get_public_booking_page(text) from public;
grant execute on function public.get_public_booking_page(text) to anon,authenticated;

commit;

select pg_notify('pgrst','reload schema');
