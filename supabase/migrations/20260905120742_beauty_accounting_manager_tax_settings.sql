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

  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour modifier les paramètres comptables.';
  end if;

  if p_tax_mode not in ('unset','vat','exempt') then
    raise exception 'Régime fiscal invalide.';
  end if;

  if coalesce(p_vat_rate_basis_points,0) < 0 or coalesce(p_vat_rate_basis_points,0) > 10000 then
    raise exception 'Taux de TVA invalide.';
  end if;

  update public.organization_companies c
  set beauty_accounting_tax_mode=p_tax_mode,
      beauty_accounting_vat_rate_basis_points=case
        when p_tax_mode='vat' then coalesce(p_vat_rate_basis_points,2000)
        else 0
      end,
      beauty_accounting_tax_exemption_text=case
        when p_tax_mode='exempt' then left(nullif(trim(coalesce(p_tax_exemption_text,'')),''),240)
        else null
      end,
      updated_at=now()
  where c.id=p_company_id
    and c.organization_id=p_organization_id
    and c.status='active'
    and exists(
      select 1
      from public.organizations o
      where o.id=c.organization_id
        and o.business_type='coiffure'
        and o.plan='metier'
    )
  returning c.* into v_company;

  if v_company.id is null then
    raise exception 'Enseigne Beauty introuvable.';
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,
    auth.uid(),
    'beauty.accounting_settings.updated',
    'organization_company',
    p_company_id::text,
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
