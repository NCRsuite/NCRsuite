create or replace function public.metier_public_page_configuration(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
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
$$;

create or replace function public.metier_update_company_public_page(
  p_organization_id uuid,
  p_company_id uuid,
  p_public_page_enabled boolean,
  p_public_slug text,
  p_public_tagline text,
  p_public_description text,
  p_public_banner_url text,
  p_public_hours_text text,
  p_public_practical_info text
)
returns text
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_slug text;
  v_business_type text;
  v_plan text;
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

  select business_type,plan into v_business_type,v_plan from public.organizations where id=p_organization_id;
  if v_business_type<>'coiffure' or v_plan<>'metier' then raise exception 'Cette fonction est réservée à Coiffure & Beauté Métier.'; end if;
  if not exists(select 1 from public.organization_companies where id=p_company_id and organization_id=p_organization_id and status<>'archived') then raise exception 'Enseigne introuvable.'; end if;

  v_slug := public.metier_company_slug_base(p_public_slug);
  if v_slug is null or length(v_slug)<2 then
    select public.allocate_metier_company_public_slug(id,name) into v_slug from public.organization_companies where id=p_company_id;
  elsif exists(select 1 from public.organization_companies where lower(public_slug)=lower(v_slug) and id<>p_company_id) then
    raise exception 'Cette adresse publique est déjà utilisée.';
  end if;

  update public.organization_companies
  set public_page_enabled=coalesce(p_public_page_enabled,false),
      public_slug=v_slug,
      public_tagline=nullif(trim(coalesce(p_public_tagline,'')),''),
      public_description=nullif(trim(coalesce(p_public_description,'')),''),
      public_banner_url=case when nullif(trim(coalesce(p_public_banner_url,'')),'') is null then null when p_public_banner_url ~ '^https://' then trim(p_public_banner_url) else public_banner_url end,
      public_hours_text=nullif(trim(coalesce(p_public_hours_text,'')),''),
      public_practical_info=nullif(trim(coalesce(p_public_practical_info,'')),''),
      updated_at=now()
  where id=p_company_id and organization_id=p_organization_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'metier.company_public_page_updated','organization_company',p_company_id::text,
    jsonb_build_object('public_page_enabled',coalesce(p_public_page_enabled,false),'public_slug',v_slug));

  return v_slug;
end;
$$;

create or replace function public.metier_update_company_public_logo(
  p_organization_id uuid,
  p_company_id uuid,
  p_logo_url text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
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

  if not exists (
    select 1 from public.organizations o
    where o.id = p_organization_id
      and o.plan = 'metier'
      and o.business_type = 'coiffure'
      and o.status in ('trial','active')
  ) then raise exception 'Cette fonction est réservée aux espaces Coiffure & Beauté Métier actifs.'; end if;

  if p_logo_url is not null and trim(p_logo_url) <> '' then
    if char_length(trim(p_logo_url)) > 1200 or left(lower(trim(p_logo_url)), 8) <> 'https://' then raise exception 'URL de logo invalide.'; end if;
  end if;

  update public.organization_companies
  set logo_url = nullif(trim(p_logo_url), ''), updated_at = now()
  where id = p_company_id and organization_id = p_organization_id and status <> 'archived';
  if not found then raise exception 'Enseigne introuvable.'; end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'metier.company_public_logo_updated','organization_company',p_company_id::text,
    jsonb_build_object('has_logo', p_logo_url is not null and trim(p_logo_url) <> ''));
end;
$$;

revoke all on function public.metier_public_page_configuration(uuid) from public, anon;
grant execute on function public.metier_public_page_configuration(uuid) to authenticated;
revoke all on function public.metier_update_company_public_page(uuid,uuid,boolean,text,text,text,text,text,text) from public, anon;
grant execute on function public.metier_update_company_public_page(uuid,uuid,boolean,text,text,text,text,text,text) to authenticated;
revoke all on function public.metier_update_company_public_logo(uuid,uuid,text) from public, anon;
grant execute on function public.metier_update_company_public_logo(uuid,uuid,text) to authenticated;
