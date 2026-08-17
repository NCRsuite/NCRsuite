-- NCR Suite V2.29.25 R5 — Essai public contrôlé 7 jours, sans carte bancaire avant l'essai.
-- Les demandes hors essai conservent le parcours paiement avant accès.

begin;

alter table public.platform_access_requests
  add column if not exists trial_requested boolean not null default false;

create or replace function public.detect_platform_access_trial_request()
returns trigger
language plpgsql
set search_path = public,pg_catalog
as $$
begin
  new.trial_requested := coalesce(new.trial_requested,false)
    or coalesce(new.acquisition_campaign,'') = 'essai-7-jours'
    or coalesce(new.message,'') ilike 'Demande d’essai gratuit de 7 jours.%';
  return new;
end;
$$;

drop trigger if exists detect_platform_access_trial_request_trigger
  on public.platform_access_requests;
create trigger detect_platform_access_trial_request_trigger
before insert or update of message,acquisition_campaign,trial_requested
on public.platform_access_requests
for each row execute procedure public.detect_platform_access_trial_request();

update public.platform_access_requests
set trial_requested = true
where trial_requested = false
  and (
    coalesce(acquisition_campaign,'') = 'essai-7-jours'
    or coalesce(message,'') ilike 'Demande d’essai gratuit de 7 jours.%'
  );

update public.platform_billing_settings
set default_trial_days = 7,
    payment_required_before_access = false,
    updated_at = now()
where singleton = true;

create or replace function public.admin_get_trial_policy()
returns jsonb
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_days integer;
  v_payment_required boolean;
begin
  if not public.is_platform_admin() then
    raise exception 'Acces administrateur NCR requis.';
  end if;

  select default_trial_days,payment_required_before_access
  into v_days,v_payment_required
  from public.platform_billing_settings
  where singleton=true;

  return jsonb_build_object(
    'enabled',coalesce(v_days,0)>0,
    'trial_days',coalesce(v_days,0),
    'payment_required_before_access',coalesce(v_payment_required,false),
    'manual_review',true,
    'plan_mode','requested_plan',
    'data_retention_mode','preserve'
  );
end;
$$;

create or replace function public.admin_update_trial_policy(p_trial_days integer)
returns jsonb
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut modifier la politique d essai.';
  end if;
  if p_trial_days not between 0 and 30 then
    raise exception 'La duree d essai doit etre comprise entre 0 et 30 jours.';
  end if;

  update public.platform_billing_settings
  set default_trial_days=p_trial_days,
      payment_required_before_access=(p_trial_days=0),
      updated_by=auth.uid(),
      updated_at=now()
  where singleton=true;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    null,auth.uid(),'platform.trial_policy_updated','platform_billing_settings','singleton',
    jsonb_build_object(
      'trial_days',p_trial_days,
      'payment_required_before_access',p_trial_days=0,
      'manual_review',true,
      'plan_mode','requested_plan',
      'data_retention_mode','preserve'
    )
  );

  return public.admin_get_trial_policy();
end;
$$;

-- Sauvegarder les règles Stripe ne doit plus remettre la durée d'essai à zéro.
create or replace function public.admin_update_billing_settings_v2(
  p_stripe_livemode boolean,
  p_grace_period_days integer,
  p_payment_required_before_access boolean,
  p_downgrade_at_period_end boolean,
  p_terms_version text,
  p_terms_text text,
  p_cancellation_text text,
  p_qonto_exceptional_payment_url text,
  p_qonto_exceptional_instructions text
)
returns void
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_qonto_url text:=nullif(trim(coalesce(p_qonto_exceptional_payment_url,'')),'');
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut modifier ces regles.';
  end if;
  if p_grace_period_days not between 0 and 30 then
    raise exception 'Le delai de grace doit etre compris entre 0 et 30 jours.';
  end if;
  if v_qonto_url is not null and v_qonto_url !~ '^https://[^[:space:]]+$' then
    raise exception 'URL Qonto invalide.';
  end if;
  if char_length(trim(coalesce(p_terms_version,'')))<2
     or char_length(trim(coalesce(p_terms_text,'')))<10
     or char_length(trim(coalesce(p_cancellation_text,'')))<10 then
    raise exception 'Les conditions commerciales sont incompletes.';
  end if;

  update public.platform_billing_settings
  set default_provider='stripe',
      stripe_livemode=coalesce(p_stripe_livemode,false),
      grace_period_days=p_grace_period_days,
      payment_required_before_access=case
        when default_trial_days>0 then false
        else coalesce(p_payment_required_before_access,true)
      end,
      downgrade_at_period_end=coalesce(p_downgrade_at_period_end,true),
      terms_version=trim(p_terms_version),
      terms_text=trim(p_terms_text),
      cancellation_text=trim(p_cancellation_text),
      qonto_exceptional_payment_url=v_qonto_url,
      qonto_exceptional_instructions=left(trim(coalesce(p_qonto_exceptional_instructions,'')),3000),
      updated_by=auth.uid(),updated_at=now()
  where singleton=true;
end;
$$;

create or replace function public.initialize_organization_subscription()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_price integer;
  v_trial_days integer:=0;
begin
  select public.domain_plan_price(new.business_type,new.plan) into v_price;
  select default_trial_days into v_trial_days
  from public.platform_billing_settings where singleton=true;

  insert into public.organization_subscriptions(
    organization_id,plan_key,status,provider,monthly_price_cents,
    trial_ends_at,current_period_start,data_retention_mode
  ) values (
    new.id,new.plan,
    case
      when new.status='trial' then 'trialing'
      when new.status='suspended' then 'paused'
      else 'active'
    end,
    'stripe',
    coalesce(v_price,0),
    case when new.status='trial' then now()+make_interval(days=>greatest(coalesce(v_trial_days,0),1)) else null end,
    case when new.status='active' then now() else null end,
    'preserve'
  )
  on conflict(organization_id) do nothing;
  return new;
end;
$$;

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
  if not exists (
    select 1 from public.stripe_price_catalog c
    join public.platform_billing_settings bs on bs.singleton=true and bs.stripe_livemode=c.livemode
    where c.business_type=v_business_type and c.plan_key=p_requested_plan and c.active=true
  ) then raise exception 'Le tarif Stripe de cette formule doit etre configure avant l ouverture.'; end if;

  select default_trial_days into v_trial_days from public.platform_billing_settings where singleton=true;
  if v_request_id is not null and v_trial_requested and coalesce(v_trial_days,0)>0 then v_initial_status:='trial'; end if;

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
  if not exists (
    select 1 from public.stripe_price_catalog c
    join public.organizations o on o.business_type=c.business_type
    join public.platform_billing_settings bs on bs.singleton=true and bs.stripe_livemode=c.livemode
    where o.id=p_organization_id and c.plan_key=p_requested_plan and c.active=true
  ) then raise exception 'Le tarif Stripe de cette formule n est pas configure.'; end if;
  if char_length(trim(coalesce(p_contact_name,'')))<2 then raise exception 'Le nom du contact principal est requis.'; end if;
  if char_length(trim(coalesce(p_company_email,'')))<5 or position('@' in p_company_email)=0 then raise exception 'L adresse e-mail de l entreprise est invalide.'; end if;

  select status into v_existing_status from public.organizations where id=p_organization_id;
  if v_existing_status is null then raise exception 'Entreprise introuvable.'; end if;
  v_is_trial:=v_existing_status='trial';
  select default_trial_days into v_trial_days from public.platform_billing_settings where singleton=true;

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

create or replace function public.request_subscription_change(
  p_organization_id uuid,
  p_requested_plan text,
  p_accept_terms boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_current_plan text;
  v_business_type text;
  v_subscription_status text;
  v_provider text:='manual';
  v_checkout_url text;
  v_status text:='pending_review';
  v_request_type text;
  v_terms_version text;
  v_request_id uuid;
  v_reference text;
  v_current_rank integer;
  v_requested_rank integer;
begin
  if not public.has_org_role_any_status(p_organization_id,array['owner','admin']) then raise exception 'Seul le proprietaire ou un administrateur peut gerer l abonnement.'; end if;
  if not coalesce(p_accept_terms,false) then raise exception 'Vous devez accepter les conditions d abonnement.'; end if;
  if p_requested_plan not in ('decouverte','essentielle','professionnelle','metier') then raise exception 'Formule invalide.'; end if;
  if exists (select 1 from public.subscription_change_requests where organization_id=p_organization_id and status in ('payment_pending','pending_review')) then
    raise exception 'Une demande de changement est deja en cours.';
  end if;

  select o.plan,o.business_type,coalesce(s.status,'paused')
  into v_current_plan,v_business_type,v_subscription_status
  from public.organizations o
  left join public.organization_subscriptions s on s.organization_id=o.id
  where o.id=p_organization_id;
  if v_current_plan is null then raise exception 'Entreprise introuvable.'; end if;

  if not exists (select 1 from public.domain_plan_catalog where business_type=v_business_type and plan_key=p_requested_plan and active=true) then
    raise exception 'Cette formule n est pas disponible pour ce domaine.';
  end if;

  select terms_version into v_terms_version from public.platform_billing_settings where singleton=true;
  v_current_rank:=case v_current_plan when 'decouverte' then 1 when 'essentielle' then 2 when 'professionnelle' then 3 else 4 end;
  v_requested_rank:=case p_requested_plan when 'decouverte' then 1 when 'essentielle' then 2 when 'professionnelle' then 3 else 4 end;

  if p_requested_plan='metier' and v_current_plan<>'metier' then
    v_request_type:='metier';
  elsif p_requested_plan=v_current_plan then
    if v_subscription_status in ('trialing','past_due','paused','canceled') then v_request_type:='reactivation';
    else raise exception 'Cette formule est deja active.'; end if;
  elsif v_requested_rank>v_current_rank then v_request_type:='upgrade';
  else v_request_type:='downgrade';
  end if;

  if exists (
    select 1 from public.stripe_price_catalog c
    join public.platform_billing_settings bs on bs.singleton=true and bs.stripe_livemode=c.livemode
    where c.business_type=v_business_type and c.plan_key=p_requested_plan and c.active=true
  ) then
    v_provider:='stripe';v_status:='payment_pending';v_checkout_url:=null;
  else raise exception 'Le tarif Stripe de cette formule n est pas encore configure.'; end if;

  v_reference:='NCR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.subscription_change_requests(
    organization_id,current_plan,requested_plan,request_type,status,provider,
    checkout_url_snapshot,request_reference,accepted_terms_at,terms_version,requested_by
  ) values (
    p_organization_id,v_current_plan,p_requested_plan,v_request_type,v_status,v_provider,
    v_checkout_url,v_reference,now(),coalesce(v_terms_version,'initial'),auth.uid()
  ) returning id into v_request_id;

  insert into public.subscription_events(organization_id,request_id,event_type,actor_user_id,from_plan,to_plan,metadata)
  values (
    p_organization_id,v_request_id,'change_requested',auth.uid(),v_current_plan,p_requested_plan,
    jsonb_build_object(
      'status',v_status,'provider',v_provider,'reference',v_reference,'business_type',v_business_type,
      'data_retention_mode','preserve','downgrade_at_period_end',v_request_type='downgrade','from_trial',v_subscription_status='trialing'
    )
  );

  return jsonb_build_object(
    'id',v_request_id,'status',v_status,'provider',v_provider,'checkout_url',v_checkout_url,
    'reference',v_reference,'request_type',v_request_type,'data_retained',true
  );
end;
$$;

revoke all on function public.detect_platform_access_trial_request() from public,anon,authenticated;
revoke all on function public.admin_get_trial_policy() from public,anon;
revoke all on function public.admin_update_trial_policy(integer) from public,anon;
grant execute on function public.admin_get_trial_policy() to authenticated;
grant execute on function public.admin_update_trial_policy(integer) to authenticated;

commit;
select pg_notify('pgrst','reload schema');
