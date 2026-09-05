alter table public.organization_companies
  add column if not exists beauty_accounting_tax_mode text not null default 'unset',
  add column if not exists beauty_accounting_vat_rate_basis_points integer not null default 2000,
  add column if not exists beauty_accounting_tax_exemption_text text;

alter table public.organization_companies
  drop constraint if exists organization_companies_beauty_accounting_tax_mode_check;
alter table public.organization_companies
  add constraint organization_companies_beauty_accounting_tax_mode_check
  check (beauty_accounting_tax_mode in ('unset','vat','exempt'));

alter table public.organization_companies
  drop constraint if exists organization_companies_beauty_accounting_vat_rate_check;
alter table public.organization_companies
  add constraint organization_companies_beauty_accounting_vat_rate_check
  check (beauty_accounting_vat_rate_basis_points between 0 and 10000);

create or replace function private.beauty_save_accounting_settings(
  p_organization_id uuid,
  p_company_id uuid,
  p_tax_mode text,
  p_vat_rate_basis_points integer default 2000,
  p_tax_exemption_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public,private,pg_catalog
as $function$
declare
  v_company public.organization_companies%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour modifier les paramètres comptables.';
  end if;
  if p_tax_mode not in ('unset','vat','exempt') then raise exception 'Régime fiscal invalide.'; end if;
  if coalesce(p_vat_rate_basis_points,0) < 0 or coalesce(p_vat_rate_basis_points,0) > 10000 then
    raise exception 'Taux de TVA invalide.';
  end if;

  update public.organization_companies c
  set beauty_accounting_tax_mode=p_tax_mode,
      beauty_accounting_vat_rate_basis_points=case when p_tax_mode='vat' then coalesce(p_vat_rate_basis_points,2000) else 0 end,
      beauty_accounting_tax_exemption_text=case when p_tax_mode='exempt' then left(nullif(trim(coalesce(p_tax_exemption_text,'')),''),240) else null end,
      updated_at=now()
  where c.id=p_company_id
    and c.organization_id=p_organization_id
    and c.status='active'
    and exists(
      select 1 from public.organizations o
      where o.id=c.organization_id and o.business_type='coiffure' and o.plan='metier'
    )
  returning c.* into v_company;

  if v_company.id is null then raise exception 'Enseigne Beauty introuvable.'; end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'beauty.accounting_settings.updated','organization_company',p_company_id::text,
    jsonb_build_object(
      'company_id',p_company_id,
      'tax_mode',v_company.beauty_accounting_tax_mode,
      'vat_rate_basis_points',v_company.beauty_accounting_vat_rate_basis_points
    )
  );

  return jsonb_build_object(
    'tax_mode',v_company.beauty_accounting_tax_mode,
    'vat_rate_basis_points',v_company.beauty_accounting_vat_rate_basis_points,
    'tax_exemption_text',v_company.beauty_accounting_tax_exemption_text
  );
end;
$function$;

create or replace function public.beauty_save_accounting_settings(
  p_organization_id uuid,
  p_company_id uuid,
  p_tax_mode text,
  p_vat_rate_basis_points integer default 2000,
  p_tax_exemption_text text default null
)
returns jsonb
language sql
security invoker
set search_path = public,private,pg_catalog
as $function$
  select private.beauty_save_accounting_settings(
    p_organization_id,p_company_id,p_tax_mode,p_vat_rate_basis_points,p_tax_exemption_text
  );
$function$;

create or replace function private.beauty_monthly_accounting_report(
  p_organization_id uuid,
  p_company_id uuid,
  p_year integer,
  p_month integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public,private,pg_catalog
as $function$
declare
  v_timezone text;
  v_start_date date;
  v_end_date date;
  v_start_ts timestamptz;
  v_end_ts timestamptz;
  v_tax_mode text;
  v_vat_rate integer;
  v_exemption_text text;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour consulter la comptabilité.';
  end if;
  if p_year < 2000 or p_year > 2100 or p_month < 1 or p_month > 12 then
    raise exception 'Mois comptable invalide.';
  end if;

  select o.timezone,c.beauty_accounting_tax_mode,c.beauty_accounting_vat_rate_basis_points,c.beauty_accounting_tax_exemption_text
  into v_timezone,v_tax_mode,v_vat_rate,v_exemption_text
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where c.id=p_company_id and c.organization_id=p_organization_id and c.status='active'
    and o.business_type='coiffure' and o.plan='metier';

  if v_timezone is null then raise exception 'Enseigne Beauty introuvable.'; end if;

  v_start_date:=make_date(p_year,p_month,1);
  v_end_date:=(v_start_date+interval '1 month')::date;
  v_start_ts:=v_start_date::timestamp at time zone v_timezone;
  v_end_ts:=v_end_date::timestamp at time zone v_timezone;

  with completed_appointments as (
    select a.*
    from public.appointments a
    where a.organization_id=p_organization_id
      and a.company_id=p_company_id
      and a.status='completed'
      and a.starts_at>=v_start_ts
      and a.starts_at<v_end_ts
  ),
  raw_lines as (
    select
      a.id as appointment_id,
      a.site_id,
      a.amount_cents as appointment_ttc_cents,
      asi.service_id,
      coalesce(nullif(trim(asi.service_name),''),'Prestation') as service_name,
      greatest(0,coalesce(asi.price_cents,0))::integer as catalogue_line_cents,
      coalesce(asi.position,0)::integer as line_position
    from completed_appointments a
    join public.appointment_service_items asi
      on asi.organization_id=p_organization_id
     and asi.company_id=p_company_id
     and asi.appointment_id=a.id

    union all

    select
      a.id,
      a.site_id,
      a.amount_cents,
      a.service_id,
      coalesce(nullif(trim(s.name),''),'Prestation'),
      greatest(0,coalesce(s.price_cents,a.amount_cents,0))::integer,
      0
    from completed_appointments a
    left join public.services s
      on s.id=a.service_id and s.organization_id=p_organization_id and s.company_id=p_company_id
    where not exists(select 1 from public.appointment_service_items asi where asi.appointment_id=a.id)
  ),
  normalized as (
    select
      r.*,
      count(*) over(partition by r.appointment_id)::integer as line_count,
      row_number() over(partition by r.appointment_id order by r.line_position,r.service_name,r.service_id)::integer as line_number,
      sum(r.catalogue_line_cents) over(partition by r.appointment_id)::bigint as catalogue_total_cents
    from raw_lines r
  ),
  prelim as (
    select
      n.*,
      coalesce(n.appointment_ttc_cents,n.catalogue_total_cents,0)::bigint as final_appointment_ttc_cents,
      case
        when n.catalogue_total_cents>0 then
          floor(coalesce(n.appointment_ttc_cents,n.catalogue_total_cents,0)::numeric * n.catalogue_line_cents::numeric / n.catalogue_total_cents::numeric)::bigint
        else
          floor(coalesce(n.appointment_ttc_cents,0)::numeric / greatest(1,n.line_count)::numeric)::bigint
      end as preliminary_allocated_cents
    from normalized n
  ),
  allocated as (
    select
      p.*,
      case
        when p.line_number=p.line_count then
          p.preliminary_allocated_cents + (p.final_appointment_ttc_cents - sum(p.preliminary_allocated_cents) over(partition by p.appointment_id))
        else p.preliminary_allocated_cents
      end::bigint as allocated_ttc_cents
    from prelim p
  ),
  taxed as (
    select
      a.*,
      case
        when v_tax_mode='unset' then null
        when v_tax_mode='exempt' then a.allocated_ttc_cents
        else round(a.allocated_ttc_cents::numeric * 10000::numeric / (10000+greatest(0,v_vat_rate))::numeric)::bigint
      end as allocated_ht_cents
    from allocated a
  ),
  final_lines as (
    select
      t.*,
      case when t.allocated_ht_cents is null then null else t.allocated_ttc_cents-t.allocated_ht_cents end::bigint as allocated_vat_cents
    from taxed t
  ),
  service_stats as (
    select service_id,service_name,count(*)::integer as prestation_count,count(distinct appointment_id)::integer as appointment_count,
      sum(allocated_ttc_cents)::bigint as total_ttc_cents,
      sum(allocated_ht_cents)::bigint as total_ht_cents,
      sum(allocated_vat_cents)::bigint as total_vat_cents
    from final_lines
    group by service_id,service_name
    order by total_ttc_cents desc,prestation_count desc,service_name
  ),
  site_stats as (
    select f.site_id,coalesce(s.name,'Établissement') as site_name,
      count(*)::integer as prestation_count,count(distinct f.appointment_id)::integer as appointment_count,
      sum(f.allocated_ttc_cents)::bigint as total_ttc_cents,
      sum(f.allocated_ht_cents)::bigint as total_ht_cents,
      sum(f.allocated_vat_cents)::bigint as total_vat_cents
    from final_lines f
    left join public.organization_sites s
      on s.id=f.site_id and s.organization_id=p_organization_id and s.company_id=p_company_id
    group by f.site_id,s.name
    order by total_ttc_cents desc,site_name
  ),
  totals as (
    select count(distinct appointment_id)::integer as appointment_count,count(*)::integer as prestation_count,
      coalesce(sum(allocated_ttc_cents),0)::bigint as total_ttc_cents,
      sum(allocated_ht_cents)::bigint as total_ht_cents,
      sum(allocated_vat_cents)::bigint as total_vat_cents
    from final_lines
  )
  select jsonb_build_object(
    'company',jsonb_build_object(
      'id',c.id,'name',c.name,'legal_name',c.legal_name,'siret',c.siret,'email',c.email,'phone',c.phone,'logo_url',c.logo_url
    ),
    'period',jsonb_build_object(
      'year',p_year,'month',p_month,'start_date',v_start_date,'end_date',v_end_date-1,'timezone',v_timezone
    ),
    'tax',jsonb_build_object(
      'configured',v_tax_mode<>'unset','mode',v_tax_mode,'vat_rate_basis_points',v_vat_rate,'exemption_text',v_exemption_text
    ),
    'summary',jsonb_build_object(
      'appointment_count',t.appointment_count,
      'prestation_count',t.prestation_count,
      'total_ttc_cents',t.total_ttc_cents,
      'total_ht_cents',case when v_tax_mode='unset' then null else coalesce(t.total_ht_cents,0) end,
      'total_vat_cents',case when v_tax_mode='unset' then null else coalesce(t.total_vat_cents,0) end
    ),
    'services',coalesce((
      select jsonb_agg(jsonb_build_object(
        'service_id',s.service_id,'service_name',s.service_name,'prestation_count',s.prestation_count,'appointment_count',s.appointment_count,
        'total_ttc_cents',s.total_ttc_cents,'total_ht_cents',case when v_tax_mode='unset' then null else s.total_ht_cents end,
        'total_vat_cents',case when v_tax_mode='unset' then null else s.total_vat_cents end
      ) order by s.total_ttc_cents desc,s.prestation_count desc,s.service_name)
      from service_stats s
    ),'[]'::jsonb),
    'sites',coalesce((
      select jsonb_agg(jsonb_build_object(
        'site_id',s.site_id,'site_name',s.site_name,'prestation_count',s.prestation_count,'appointment_count',s.appointment_count,
        'total_ttc_cents',s.total_ttc_cents,'total_ht_cents',case when v_tax_mode='unset' then null else s.total_ht_cents end,
        'total_vat_cents',case when v_tax_mode='unset' then null else s.total_vat_cents end
      ) order by s.total_ttc_cents desc,s.site_name)
      from site_stats s
    ),'[]'::jsonb)
  )
  into v_result
  from public.organization_companies c
  cross join totals t
  where c.id=p_company_id and c.organization_id=p_organization_id;

  return v_result;
end;
$function$;

create or replace function public.beauty_monthly_accounting_report(
  p_organization_id uuid,
  p_company_id uuid,
  p_year integer,
  p_month integer
)
returns jsonb
language sql
stable
security invoker
set search_path = public,private,pg_catalog
as $function$
  select private.beauty_monthly_accounting_report(p_organization_id,p_company_id,p_year,p_month);
$function$;

revoke all on function private.beauty_save_accounting_settings(uuid,uuid,text,integer,text) from public,anon;
grant execute on function private.beauty_save_accounting_settings(uuid,uuid,text,integer,text) to authenticated,service_role;
revoke all on function public.beauty_save_accounting_settings(uuid,uuid,text,integer,text) from public,anon;
grant execute on function public.beauty_save_accounting_settings(uuid,uuid,text,integer,text) to authenticated,service_role;

revoke all on function private.beauty_monthly_accounting_report(uuid,uuid,integer,integer) from public,anon;
grant execute on function private.beauty_monthly_accounting_report(uuid,uuid,integer,integer) to authenticated,service_role;
revoke all on function public.beauty_monthly_accounting_report(uuid,uuid,integer,integer) from public,anon;
grant execute on function public.beauty_monthly_accounting_report(uuid,uuid,integer,integer) to authenticated,service_role;