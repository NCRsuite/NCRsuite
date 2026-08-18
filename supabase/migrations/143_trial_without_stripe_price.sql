-- NCR Suite V2.29.25 — Essai 7 jours sans dépendance à un Price Stripe.
-- Alignement source du correctif déjà appliqué en production le 18/08/2026
-- sous la migration Supabase `trial_without_stripe_price`.

begin;

create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_business_type text,
  p_primary_color text,
  p_requested_plan text
)
returns uuid
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_id uuid;
  v_name text:=trim(p_name);
  v_slug text:=lower(trim(p_slug));
  v_business_type text:=case when p_business_type='restaurant' then 'restauration' else p_business_type end;
  v_request_id uuid;
  v_request_reference text;
  v_request_plan text;
  v_trial_requested boolean:=false;
  v_trial_days integer:=0;
  v_initial_status text:='suspended';
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_requested_plan not in ('decouverte','essentielle','professionnelle','metier') then raise exception 'Formule invalide.'; end if;

  if not public.is_platform_super_admin() then
    begin
      v_request_id:=nullif(auth.jwt()->'user_metadata'->>'access_request_id','')::uuid;
    exception when others then
      v_request_id:=null;
    end;

    select r.reference,r.requested_plan,coalesce(r.trial_requested,false)
    into v_request_reference,v_request_plan,v_trial_requested
    from public.platform_access_requests r
    where r.id=v_request_id
      and r.status='approved'
      and r.invited_user_id=auth.uid()
      and r.organization_id is null
      and case when r.business_type='restaurant' then 'restauration' else r.business_type end=v_business_type;
    if v_request_reference is null then
      raise exception 'Ce compte ne possede pas d autorisation valide pour ouvrir une entreprise.';
    end if;
  end if;

  if char_length(v_name) not between 2 and 120 then raise exception 'Nom invalide.'; end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) not between 2 and 80 then raise exception 'Identifiant invalide.'; end if;
  if v_business_type not in ('coiffure','nettoyage','securite','formation','restauration') then raise exception 'Metier non pris en charge.'; end if;
  if p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Couleur invalide.'; end if;
  if not exists (select 1 from public.domain_plan_catalog where business_type=v_business_type and plan_key=p_requested_plan and active=true) then
    raise exception 'Cette formule n est pas disponible pour ce metier.';
  end if;

  select default_trial_days into v_trial_days from public.platform_billing_settings where singleton=true;
  if v_request_id is not null and v_trial_requested and coalesce(v_trial_days,0)>0 then
    v_initial_status:='trial';
  end if;

  if v_initial_status <> 'trial' and not exists (
    select 1 from public.stripe_price_catalog c
    join public.platform_billing_settings bs on bs.singleton=true and bs.stripe_livemode=c.livemode
    where c.business_type=v_business_type and c.plan_key=p_requested_plan and c.active=true
  ) then
    raise exception 'Le tarif Stripe de cette formule doit etre configure avant l ouverture.';
  end if;

  insert into public.organizations(name,slug,business_type,plan,status,primary_color,created_by,onboarding_requested_plan)
  values(v_name,v_slug,v_business_type,p_requested_plan,v_initial_status,p_primary_color,auth.uid(),p_requested_plan)
  returning id into v_id;

  insert into public.organization_members(organization_id,user_id,role,status)
  values(v_id,auth.uid(),'owner','active');

  insert into public.organization_modules(organization_id,module_key)
  values (v_id,'dashboard'),(v_id,'settings'),(v_id,v_business_type)
  on conflict do nothing;

  if v_request_id is not null then
    update public.platform_access_requests
    set organization_id=v_id,requested_plan=p_requested_plan,updated_at=now()
    where id=v_request_id and invited_user_id=auth.uid() and organization_id is null;
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    v_id,auth.uid(),case when v_initial_status='trial' then 'organization.created_trial' else 'organization.created_payment_required' end,
    'organization',v_id::text,
    jsonb_build_object(
      'initial_plan',p_requested_plan,'access_request_reference',v_request_reference,
      'trial_requested',v_trial_requested,'trial_days',case when v_initial_status='trial' then v_trial_days else 0 end,
      'payment_required',v_initial_status<>'trial','data_retention_mode','preserve'
    )
  );
  return v_id;
end;
$$;

create or replace function public.complete_organization_onboarding(
  p_organization_id uuid,
  p_contact_name text,
  p_company_email text,
  p_company_phone text,
  p_company_address text,
  p_company_postal_code text,
  p_company_city text,
  p_company_siret text,
  p_requested_plan text,
  p_objective text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_result jsonb;
  v_existing_status text;
  v_trial_days integer:=0;
  v_is_trial boolean:=false;
begin
  if not public.has_org_role_any_status(p_organization_id,array['owner','admin']) then raise exception 'Seul le proprietaire ou un administrateur peut terminer la configuration.'; end if;
  if p_requested_plan not in ('decouverte','essentielle','professionnelle','metier') then raise exception 'Formule souhaitee invalide.'; end if;
  if char_length(trim(coalesce(p_contact_name,'')))<2 then raise exception 'Le nom du contact principal est requis.'; end if;
  if char_length(trim(coalesce(p_company_email,'')))<5 or position('@' in p_company_email)=0 then raise exception 'L adresse e-mail de l entreprise est invalide.'; end if;

  select status into v_existing_status from public.organizations where id=p_organization_id;
  if v_existing_status is null then raise exception 'Entreprise introuvable.'; end if;
  v_is_trial:=v_existing_status='trial';
  select default_trial_days into v_trial_days from public.platform_billing_settings where singleton=true;

  if not v_is_trial and not exists (
    select 1 from public.stripe_price_catalog c
    join public.organizations o on o.business_type=c.business_type
    join public.platform_billing_settings bs on bs.singleton=true and bs.stripe_livemode=c.livemode
    where o.id=p_organization_id and c.plan_key=p_requested_plan and c.active=true
  ) then raise exception 'Le tarif Stripe de cette formule n est pas configure.'; end if;

  update public.organizations
  set company_contact_name=nullif(trim(p_contact_name),''),
      company_email=lower(nullif(trim(p_company_email),'')),
      company_phone=nullif(trim(p_company_phone),''),
      company_address=nullif(trim(p_company_address),''),
      company_postal_code=nullif(trim(p_company_postal_code),''),
      company_city=nullif(trim(p_company_city),''),
      company_siret=nullif(regexp_replace(coalesce(p_company_siret,''),'[^0-9]','','g'),''),
      plan=p_requested_plan,onboarding_requested_plan=p_requested_plan,
      onboarding_objective=nullif(trim(coalesce(p_objective,'')),''),
      onboarding_status='completed',
      onboarding_checklist=jsonb_build_object('identity',true,'business',true,'offer',true,'branding',true,'payment',not v_is_trial),
      onboarding_completed_at=now(),status=case when v_is_trial then 'trial' else 'suspended' end,updated_at=now()
  where id=p_organization_id;

  update public.organization_subscriptions
  set plan_key=p_requested_plan,
      monthly_price_cents=public.domain_plan_price((select business_type from public.organizations where id=p_organization_id),p_requested_plan),
      status=case when v_is_trial then 'trialing' else 'paused' end,
      provider='stripe',
      trial_ends_at=case when v_is_trial then coalesce(trial_ends_at,now()+make_interval(days=>greatest(coalesce(v_trial_days,0),1))) else null end,
      data_retention_mode='preserve',updated_at=now()
  where organization_id=p_organization_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),case when v_is_trial then 'organization.onboarding_completed_trial' else 'organization.onboarding_completed_payment_pending' end,
    'organization',p_organization_id::text,
    jsonb_build_object('requested_plan',p_requested_plan,'trialing',v_is_trial,'payment_required',not v_is_trial,'data_retention_mode','preserve')
  );

  select jsonb_build_object(
    'organization_id',id,'status',onboarding_status,'requested_plan',onboarding_requested_plan,
    'trialing',v_is_trial,'payment_required',not v_is_trial,'completed_at',onboarding_completed_at
  ) into v_result from public.organizations where id=p_organization_id;
  return v_result;
end;
$$;

commit;
select pg_notify('pgrst','reload schema');
