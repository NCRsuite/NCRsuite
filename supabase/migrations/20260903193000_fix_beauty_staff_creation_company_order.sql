create or replace function public.save_staff_configuration_v2(
  p_organization_id uuid,
  p_staff_id uuid,
  p_site_id uuid,
  p_display_name text,
  p_email text,
  p_phone text,
  p_color text,
  p_service_ids uuid[],
  p_working_hours jsonb,
  p_breaks jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_staff_id uuid;
  v_display_name text := trim(p_display_name);
  v_email text := nullif(trim(coalesce(p_email,'')), '');
  v_phone text := nullif(trim(coalesce(p_phone,'')), '');
  v_service_ids uuid[] := coalesce(p_service_ids, '{}'::uuid[]);
  v_working_hours jsonb := coalesce(p_working_hours, '[]'::jsonb);
  v_breaks jsonb := coalesce(p_breaks, '[]'::jsonb);
  v_company_id uuid;
  v_existing_company_id uuid;
  v_business_type text;
  v_plan text;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Droits insuffisants.'; end if;

  if char_length(v_display_name) not between 2 and 120 then raise exception 'Nom du collaborateur invalide.'; end if;
  if p_color is null or p_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Couleur invalide.'; end if;
  if jsonb_typeof(v_working_hours) <> 'array' or jsonb_typeof(v_breaks) <> 'array' then raise exception 'Horaires invalides.'; end if;

  select s.company_id into v_company_id
  from public.organization_sites s
  where s.id=p_site_id and s.organization_id=p_organization_id and s.status='active';
  if not found then raise exception 'L’établissement sélectionné est introuvable ou inactif.'; end if;

  select o.business_type,o.plan into v_business_type,v_plan
  from public.organizations o where o.id=p_organization_id;

  if v_plan='metier' and v_business_type='coiffure' then
    if v_company_id is null then raise exception 'Ce lieu n’est rattaché à aucune enseigne.'; end if;
    if not public.metier_company_access_allows(p_organization_id,v_company_id,auth.uid()) then raise exception 'Accès non autorisé à cette enseigne.'; end if;
    if exists(
      select 1 from unnest(v_service_ids) sid
      where not exists(
        select 1 from public.services sv
        where sv.organization_id=p_organization_id and sv.id=sid and sv.company_id=v_company_id and sv.active=true
      )
    ) then raise exception 'Une prestation appartient à une autre enseigne.'; end if;
  else
    if exists(
      select 1 from unnest(v_service_ids) sid
      where not exists(select 1 from public.services sv where sv.organization_id=p_organization_id and sv.id=sid)
    ) then raise exception 'Une prestation sélectionnée est invalide.'; end if;
  end if;

  if p_staff_id is null then
    insert into public.staff(organization_id,display_name,email,phone,color,site_id,company_id)
    values(p_organization_id,v_display_name,v_email,v_phone,p_color,p_site_id,v_company_id)
    returning id into v_staff_id;
  else
    select company_id into v_existing_company_id
    from public.staff
    where id=p_staff_id and organization_id=p_organization_id;
    if not found then raise exception 'Collaborateur introuvable.'; end if;

    if v_plan='metier' and v_business_type='coiffure'
       and v_existing_company_id is not null
       and not public.metier_company_access_allows(p_organization_id,v_existing_company_id,auth.uid()) then
      raise exception 'Accès non autorisé au collaborateur.';
    end if;

    update public.staff
    set display_name=v_display_name,
        email=v_email,
        phone=v_phone,
        color=p_color,
        site_id=p_site_id,
        company_id=coalesce(v_company_id,company_id),
        updated_at=now()
    where id=p_staff_id and organization_id=p_organization_id
    returning id into v_staff_id;
  end if;

  delete from public.staff_services where organization_id=p_organization_id and staff_id=v_staff_id;
  insert into public.staff_services(organization_id,staff_id,service_id)
  select p_organization_id,v_staff_id,sid from unnest(v_service_ids) sid
  on conflict do nothing;

  delete from public.staff_breaks where organization_id=p_organization_id and staff_id=v_staff_id;
  delete from public.staff_working_hours where organization_id=p_organization_id and staff_id=v_staff_id;

  insert into public.staff_working_hours(organization_id,staff_id,weekday,start_time,end_time)
  select p_organization_id,v_staff_id,row_data.weekday,row_data.start_time::time,row_data.end_time::time
  from jsonb_to_recordset(v_working_hours) as row_data(weekday smallint,start_time text,end_time text);

  insert into public.staff_breaks(organization_id,staff_id,weekday,label,start_time,end_time)
  select p_organization_id,v_staff_id,row_data.weekday,coalesce(nullif(trim(row_data.label),''),'Pause'),row_data.start_time::time,row_data.end_time::time
  from jsonb_to_recordset(v_breaks) as row_data(weekday smallint,label text,start_time text,end_time text);

  if exists(
    select 1
    from public.staff_breaks b
    left join public.staff_working_hours h
      on h.organization_id=b.organization_id and h.staff_id=b.staff_id and h.weekday=b.weekday
    where b.organization_id=p_organization_id and b.staff_id=v_staff_id
      and (h.id is null or b.start_time<h.start_time or b.end_time>h.end_time)
  ) then raise exception 'Une pause doit être comprise dans les horaires de travail.'; end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,
    auth.uid(),
    case when p_staff_id is null then 'staff.created' else 'staff.updated' end,
    'staff',
    v_staff_id::text,
    jsonb_build_object('site_id',p_site_id,'company_id',v_company_id)
  );

  return v_staff_id;
end;
$$;
