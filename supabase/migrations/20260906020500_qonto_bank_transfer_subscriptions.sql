-- NCR Suite V2.29.25 — Qonto / virement bancaire récurrent
-- Ajoute un second parcours d'abonnement sans dépendance Stripe :
-- demande d'accès -> contrat signé -> premier virement vérifié -> activation manuelle NCR.
-- Le parcours Stripe existant reste inchangé.

begin;

alter table public.platform_access_requests
  add column if not exists payment_provider text not null default 'stripe';

alter table public.platform_access_requests
  drop constraint if exists platform_access_requests_payment_provider_check;
alter table public.platform_access_requests
  add constraint platform_access_requests_payment_provider_check
  check (payment_provider in ('stripe','qonto'));

alter table public.subscription_contracts
  add column if not exists payment_provider text not null default 'stripe';

alter table public.subscription_contracts
  drop constraint if exists subscription_contracts_payment_provider_check;
alter table public.subscription_contracts
  add constraint subscription_contracts_payment_provider_check
  check (payment_provider in ('stripe','qonto'));

update public.subscription_contracts
set payment_provider=case
  when lower(coalesce(offer_snapshot->>'payment_provider','')) in ('qonto','bank_transfer') then 'qonto'
  else 'stripe'
end
where payment_provider is null
   or payment_provider not in ('stripe','qonto');

create index if not exists idx_platform_access_requests_payment_provider
  on public.platform_access_requests(payment_provider,status,submitted_at desc);

create index if not exists idx_subscription_contracts_payment_provider
  on public.subscription_contracts(payment_provider,status,created_at desc);

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
set search_path = public, pg_catalog
as $$
declare
  v_id uuid;
  v_name text := trim(p_name);
  v_slug text := lower(trim(p_slug));
  v_business_type text := case when p_business_type = 'restaurant' then 'restauration' else p_business_type end;
  v_authorized_business_type text;
  v_request_id uuid;
  v_jwt_request_id uuid;
  v_request_reference text;
  v_request_plan text;
  v_trial_requested boolean := false;
  v_payment_provider text := 'stripe';
  v_trial_days integer := 0;
  v_initial_status text := 'suspended';
  v_effective_plan text := p_requested_plan;
  v_candidate_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  if not public.is_platform_super_admin() then
    begin
      v_jwt_request_id := nullif(auth.jwt()->'user_metadata'->>'access_request_id', '')::uuid;
    exception when others then
      v_jwt_request_id := null;
    end;

    if v_jwt_request_id is not null then
      select r.id,r.reference,r.requested_plan,coalesce(r.trial_requested,false),
             coalesce(r.payment_provider,'stripe'),
             case when r.business_type='restaurant' then 'restauration' else r.business_type end
      into v_request_id,v_request_reference,v_request_plan,v_trial_requested,
           v_payment_provider,v_authorized_business_type
      from public.platform_access_requests r
      where r.id=v_jwt_request_id
        and r.status='approved'
        and r.invited_user_id=auth.uid()
        and r.organization_id is null;
    end if;

    if v_request_id is null then
      select count(*)::integer,min(r.id)
      into v_candidate_count,v_request_id
      from public.platform_access_requests r
      where r.status='approved'
        and r.invited_user_id=auth.uid()
        and r.organization_id is null;

      if v_candidate_count=0 then
        raise exception 'Ce compte ne possede pas d autorisation valide pour ouvrir une entreprise.';
      elsif v_candidate_count>1 then
        raise exception 'Plusieurs autorisations sont disponibles pour ce compte. Contactez NCR avant de creer l espace.';
      end if;

      select r.reference,r.requested_plan,coalesce(r.trial_requested,false),
             coalesce(r.payment_provider,'stripe'),
             case when r.business_type='restaurant' then 'restauration' else r.business_type end
      into v_request_reference,v_request_plan,v_trial_requested,
           v_payment_provider,v_authorized_business_type
      from public.platform_access_requests r
      where r.id=v_request_id;
    end if;

    if v_request_reference is null or v_authorized_business_type is null then
      raise exception 'Ce compte ne possede pas d autorisation valide pour ouvrir une entreprise.';
    end if;
    if v_request_plan not in ('decouverte','essentielle','professionnelle','metier') then
      raise exception 'La formule autorisee pour cette demande est invalide.';
    end if;
    if v_payment_provider not in ('stripe','qonto') then
      raise exception 'Le mode de reglement autorise est invalide.';
    end if;

    v_business_type:=v_authorized_business_type;
    v_effective_plan:=v_request_plan;
  else
    if p_requested_plan not in ('decouverte','essentielle','professionnelle','metier') then
      raise exception 'Formule invalide.';
    end if;
  end if;

  if v_trial_requested then v_effective_plan:='professionnelle'; end if;

  if char_length(v_name) not between 2 and 120 then raise exception 'Nom invalide.'; end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) not between 2 and 80 then
    raise exception 'Identifiant invalide.';
  end if;
  if v_business_type not in ('coiffure','nettoyage','securite','formation','restauration') then
    raise exception 'Metier non pris en charge.';
  end if;
  if p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Couleur invalide.'; end if;

  if not exists (
    select 1 from public.domain_plan_catalog
    where business_type=v_business_type
      and plan_key=v_effective_plan
      and active=true
  ) then raise exception 'Cette formule n est pas disponible pour ce metier.'; end if;

  select default_trial_days into v_trial_days
  from public.platform_billing_settings where singleton=true;

  if v_request_id is not null and v_trial_requested and coalesce(v_trial_days,0)>0 then
    v_initial_status:='trial';
  end if;

  if v_initial_status<>'trial' and v_payment_provider='stripe' and not exists (
    select 1
    from public.stripe_price_catalog c
    join public.platform_billing_settings bs
      on bs.singleton=true and bs.stripe_livemode=c.livemode
    where c.business_type=v_business_type
      and c.plan_key=v_effective_plan
      and c.active=true
  ) then raise exception 'Le tarif Stripe de cette formule doit etre configure avant l ouverture.'; end if;

  insert into public.organizations(
    name,slug,business_type,plan,status,primary_color,created_by,onboarding_requested_plan
  ) values (
    v_name,v_slug,v_business_type,v_effective_plan,v_initial_status,p_primary_color,auth.uid(),v_effective_plan
  )
  returning id into v_id;

  insert into public.organization_members(organization_id,user_id,role,status)
  values(v_id,auth.uid(),'owner','active');

  insert into public.organization_modules(organization_id,module_key)
  values (v_id,'dashboard'),(v_id,'settings'),(v_id,v_business_type)
  on conflict do nothing;

  update public.organization_subscriptions
  set plan_key=v_effective_plan,
      status=case when v_initial_status='trial' then 'trialing' else 'paused' end,
      provider=v_payment_provider,
      monthly_price_cents=public.domain_plan_price(v_business_type,v_effective_plan),
      provider_checkout_url=null,
      provider_metadata=coalesce(provider_metadata,'{}'::jsonb)||jsonb_build_object(
        'payment_method',case when v_payment_provider='qonto' then 'bank_transfer' else 'online' end,
        'invoice_provider',case when v_payment_provider='qonto' then 'qonto' else 'stripe' end,
        'access_request_reference',v_request_reference
      ),
      updated_at=now()
  where organization_id=v_id;

  if v_request_id is not null then
    update public.platform_access_requests
    set organization_id=v_id,
        requested_plan=v_effective_plan,
        payment_provider=v_payment_provider,
        updated_at=now()
    where id=v_request_id
      and invited_user_id=auth.uid()
      and organization_id is null;
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    v_id,auth.uid(),
    case when v_initial_status='trial' then 'organization.created_trial' else 'organization.created_payment_required' end,
    'organization',v_id::text,
    jsonb_build_object(
      'initial_plan',v_effective_plan,
      'client_requested_plan',p_requested_plan,
      'client_business_type',p_business_type,
      'access_request_reference',v_request_reference,
      'trial_requested',v_trial_requested,
      'trial_days',case when v_initial_status='trial' then v_trial_days else 0 end,
      'payment_required',v_initial_status<>'trial',
      'payment_provider',v_payment_provider,
      'authorized_business_type',v_authorized_business_type,
      'data_retention_mode','preserve'
    )
  );

  return v_id;
end;
$$;

revoke all on function public.create_organization(text,text,text,text,text) from public,anon;
grant execute on function public.create_organization(text,text,text,text,text) to authenticated;

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
set search_path=public,pg_catalog
as $$
declare
  v_result jsonb;
  v_existing_status text;
  v_trial_days integer:=0;
  v_is_trial boolean:=false;
  v_payment_provider text:='stripe';
begin
  if not public.has_org_role_any_status(p_organization_id,array['owner','admin']) then
    raise exception 'Seul le proprietaire ou un administrateur peut terminer la configuration.';
  end if;
  if p_requested_plan not in ('decouverte','essentielle','professionnelle','metier') then
    raise exception 'Formule souhaitee invalide.';
  end if;
  if char_length(trim(coalesce(p_contact_name,'')))<2 then
    raise exception 'Le nom du contact principal est requis.';
  end if;
  if char_length(trim(coalesce(p_company_email,'')))<5 or position('@' in p_company_email)=0 then
    raise exception 'L adresse e-mail de l entreprise est invalide.';
  end if;

  select status into v_existing_status from public.organizations where id=p_organization_id;
  if v_existing_status is null then raise exception 'Entreprise introuvable.'; end if;

  select coalesce(r.payment_provider,'stripe')
  into v_payment_provider
  from public.platform_access_requests r
  where r.organization_id=p_organization_id
  order by r.updated_at desc
  limit 1;
  v_payment_provider:=coalesce(v_payment_provider,'stripe');

  v_is_trial:=v_existing_status='trial';
  select default_trial_days into v_trial_days
  from public.platform_billing_settings where singleton=true;

  if not v_is_trial and v_payment_provider='stripe' and not exists (
    select 1
    from public.stripe_price_catalog c
    join public.organizations o on o.business_type=c.business_type
    join public.platform_billing_settings bs
      on bs.singleton=true and bs.stripe_livemode=c.livemode
    where o.id=p_organization_id
      and c.plan_key=p_requested_plan
      and c.active=true
  ) then raise exception 'Le tarif Stripe de cette formule n est pas configure.'; end if;

  update public.organizations
  set company_contact_name=nullif(trim(p_contact_name),''),
      company_email=lower(nullif(trim(p_company_email),'')),
      company_phone=nullif(trim(p_company_phone),''),
      company_address=nullif(trim(p_company_address),''),
      company_postal_code=nullif(trim(p_company_postal_code),''),
      company_city=nullif(trim(p_company_city),''),
      company_siret=nullif(regexp_replace(coalesce(p_company_siret,''),'[^0-9]','','g'),''),
      plan=p_requested_plan,
      onboarding_requested_plan=p_requested_plan,
      onboarding_objective=nullif(trim(coalesce(p_objective,'')),''),
      onboarding_status='completed',
      onboarding_checklist=jsonb_build_object('identity',true,'business',true,'offer',true,'branding',true,'payment',false),
      onboarding_completed_at=now(),
      status=case when v_is_trial then 'trial' else 'suspended' end,
      updated_at=now()
  where id=p_organization_id;

  update public.organization_subscriptions
  set plan_key=p_requested_plan,
      monthly_price_cents=public.domain_plan_price(
        (select business_type from public.organizations where id=p_organization_id),
        p_requested_plan
      ),
      status=case when v_is_trial then 'trialing' else 'paused' end,
      provider=v_payment_provider,
      trial_ends_at=case
        when v_is_trial then coalesce(trial_ends_at,now()+make_interval(days=>greatest(coalesce(v_trial_days,0),1)))
        else null
      end,
      provider_checkout_url=null,
      provider_metadata=coalesce(provider_metadata,'{}'::jsonb)||jsonb_build_object(
        'payment_method',case when v_payment_provider='qonto' then 'bank_transfer' else 'online' end,
        'invoice_provider',case when v_payment_provider='qonto' then 'qonto' else 'stripe' end
      ),
      data_retention_mode='preserve',
      updated_at=now()
  where organization_id=p_organization_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),
    case when v_is_trial then 'organization.onboarding_completed_trial' else 'organization.onboarding_completed_payment_pending' end,
    'organization',p_organization_id::text,
    jsonb_build_object(
      'requested_plan',p_requested_plan,
      'trialing',v_is_trial,
      'payment_required',not v_is_trial,
      'payment_provider',v_payment_provider,
      'data_retention_mode','preserve'
    )
  );

  select jsonb_build_object(
    'organization_id',id,
    'status',onboarding_status,
    'requested_plan',onboarding_requested_plan,
    'trialing',v_is_trial,
    'payment_required',not v_is_trial,
    'payment_provider',v_payment_provider,
    'completed_at',onboarding_completed_at
  )
  into v_result
  from public.organizations where id=p_organization_id;

  return v_result;
end;
$$;

create or replace function public.submit_bank_transfer_subscription_activation(
  p_organization_id uuid,
  p_contract_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  v_contract public.subscription_contracts%rowtype;
  v_plan text;
  v_subscription_status text;
  v_request_id uuid;
  v_reference text;
  v_request_type text;
begin
  if not public.has_org_role_any_status(p_organization_id,array['owner','admin']) then
    raise exception 'Seul le proprietaire ou un administrateur peut demander l activation.';
  end if;

  select * into v_contract
  from public.subscription_contracts
  where id=p_contract_id and organization_id=p_organization_id
  for update;

  if v_contract.id is null then raise exception 'Contrat introuvable.'; end if;
  if v_contract.payment_provider<>'qonto'
     or lower(coalesce(v_contract.offer_snapshot->>'payment_method',''))<>'bank_transfer' then
    raise exception 'Ce contrat n est pas configure pour un reglement par virement.';
  end if;
  if v_contract.status not in ('signed','payment_pending') or v_contract.signed_at is null then
    raise exception 'Le contrat doit etre signe avant la demande d activation.';
  end if;

  select o.plan,coalesce(s.status,'paused')
  into v_plan,v_subscription_status
  from public.organizations o
  left join public.organization_subscriptions s on s.organization_id=o.id
  where o.id=p_organization_id;

  if v_plan is null then raise exception 'Entreprise introuvable.'; end if;
  if v_contract.plan_key<>v_plan then raise exception 'Le contrat ne correspond pas a la formule de l entreprise.'; end if;

  select id into v_request_id
  from public.subscription_change_requests
  where organization_id=p_organization_id
    and status in ('payment_pending','pending_review')
  order by created_at desc limit 1;

  if v_request_id is not null then
    select request_reference into v_reference
    from public.subscription_change_requests where id=v_request_id;
    return jsonb_build_object('request_id',v_request_id,'reference',v_reference,'status','payment_pending','reused',true);
  end if;

  v_reference:='NCR-VIR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  v_request_type:=case when v_plan='metier' then 'metier' else 'reactivation' end;

  insert into public.subscription_change_requests(
    organization_id,current_plan,requested_plan,request_type,status,
    provider,checkout_url_snapshot,request_reference,accepted_terms_at,
    terms_version,requested_by,contract_id
  ) values (
    p_organization_id,v_plan,v_plan,v_request_type,'payment_pending',
    'qonto',null,v_reference,coalesce(v_contract.signed_at,now()),
    v_contract.contract_version,auth.uid(),v_contract.id
  )
  returning id into v_request_id;

  update public.subscription_contracts
  set status='payment_pending',payment_status='pending',updated_at=now()
  where id=v_contract.id;

  update public.organization_subscriptions
  set provider='qonto',
      status=case when v_subscription_status='trialing' then 'paused' else v_subscription_status end,
      current_contract_id=v_contract.id,
      provider_checkout_url=null,
      provider_metadata=coalesce(provider_metadata,'{}'::jsonb)||jsonb_build_object(
        'payment_method','bank_transfer',
        'invoice_provider','qonto',
        'activation_request_reference',v_reference
      ),
      updated_at=now()
  where organization_id=p_organization_id;

  insert into public.subscription_events(
    organization_id,request_id,event_type,actor_user_id,from_plan,to_plan,metadata
  ) values (
    p_organization_id,v_request_id,'bank_transfer_activation_requested',
    auth.uid(),v_plan,v_plan,
    jsonb_build_object(
      'provider','qonto',
      'contract_id',v_contract.id,
      'contract_reference',v_contract.reference,
      'request_reference',v_reference
    )
  );

  insert into public.audit_logs(
    organization_id,user_id,action,entity_type,entity_id,metadata
  ) values (
    p_organization_id,auth.uid(),'billing.bank_transfer_activation_requested',
    'subscription_change_request',v_request_id::text,
    jsonb_build_object(
      'contract_id',v_contract.id,
      'contract_reference',v_contract.reference,
      'request_reference',v_reference
    )
  );

  return jsonb_build_object('request_id',v_request_id,'reference',v_reference,'status','payment_pending','reused',false);
end;
$$;

revoke all on function public.submit_bank_transfer_subscription_activation(uuid,uuid) from public,anon;
grant execute on function public.submit_bank_transfer_subscription_activation(uuid,uuid) to authenticated;

create or replace function public.admin_review_subscription_request(
  p_request_id uuid,
  p_decision text,
  p_note text default null,
  p_provider_payment_reference text default null
)
returns void
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  v_request public.subscription_change_requests%rowtype;
  v_contract public.subscription_contracts%rowtype;
  v_price integer;
  v_period_end timestamptz;
  v_payment_reference text:=nullif(trim(coalesce(p_provider_payment_reference,'')),'');
  v_business_type text;
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut traiter les demandes.';
  end if;
  if p_decision not in ('approve','reject') then raise exception 'Decision invalide.'; end if;

  select * into v_request
  from public.subscription_change_requests
  where id=p_request_id and status in ('payment_pending','pending_review')
  for update;

  if v_request.id is null then raise exception 'Demande introuvable ou deja traitee.'; end if;

  if p_decision='reject' then
    update public.subscription_change_requests
    set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),
        review_note=nullif(trim(coalesce(p_note,'')),''),updated_at=now()
    where id=p_request_id;

    if v_request.provider='qonto' and v_request.contract_id is not null then
      update public.subscription_contracts
      set status='signed',payment_status='not_started',updated_at=now()
      where id=v_request.contract_id
        and organization_id=v_request.organization_id
        and status='payment_pending';
    end if;

    insert into public.subscription_events(
      organization_id,request_id,event_type,actor_user_id,from_plan,to_plan,metadata
    ) values (
      v_request.organization_id,v_request.id,'request_rejected',auth.uid(),
      v_request.current_plan,v_request.requested_plan,
      jsonb_build_object('note',nullif(trim(coalesce(p_note,'')),''))
    );
    return;
  end if;

  if v_request.provider='qonto' then
    if v_payment_reference is null then
      raise exception 'La reference du premier virement ou de la facture Qonto est obligatoire avant activation.';
    end if;
    if v_request.contract_id is null then
      raise exception 'Un contrat signe est obligatoire pour activer un abonnement par virement.';
    end if;

    select * into v_contract
    from public.subscription_contracts
    where id=v_request.contract_id
      and organization_id=v_request.organization_id
    for update;

    if v_contract.id is null
       or v_contract.payment_provider<>'qonto'
       or v_contract.status not in ('signed','payment_pending')
       or v_contract.signed_at is null
       or v_contract.plan_key<>v_request.requested_plan then
      raise exception 'Le contrat Qonto signe ne peut pas etre valide pour cette demande.';
    end if;
  end if;

  select business_type into v_business_type
  from public.organizations where id=v_request.organization_id;
  if v_business_type is null then raise exception 'Entreprise introuvable.'; end if;

  v_price:=public.domain_plan_price(v_business_type,v_request.requested_plan);
  if v_price is null then
    select monthly_price_cents into v_price
    from public.plan_catalog where plan_key=v_request.requested_plan;
  end if;

  v_period_end:=now()+interval '1 month';

  perform public.admin_update_organization_subscription(
    v_request.organization_id,v_request.requested_plan,
    'active','active',coalesce(v_price,0),null,v_period_end,false,
    coalesce(
      nullif(trim(coalesce(p_note,'')),''),
      case when v_request.provider='qonto'
        then 'Activation apres verification du premier virement - '||v_request.request_reference
        else 'Activation depuis une demande d abonnement '||v_request.request_reference
      end
    )
  );

  update public.organization_subscriptions
  set provider=v_request.provider,
      provider_checkout_url=v_request.checkout_url_snapshot,
      provider_payment_reference=v_payment_reference,
      provider_subscription_id=case
        when v_request.provider='stripe' then coalesce(v_payment_reference,provider_subscription_id)
        else provider_subscription_id
      end,
      payment_confirmed_at=case when v_request.provider in ('qonto','stripe') then now() else payment_confirmed_at end,
      current_period_start=case when v_request.provider='qonto' then now() else current_period_start end,
      current_period_end=case when v_request.provider='qonto' then v_period_end else current_period_end end,
      current_contract_id=coalesce(v_request.contract_id,current_contract_id),
      payment_failed_at=null,
      grace_period_ends_at=null,
      access_restricted_at=null,
      provider_metadata=coalesce(provider_metadata,'{}'::jsonb)||jsonb_build_object(
        'request_reference',v_request.request_reference,
        'payment_method',case when v_request.provider='qonto' then 'bank_transfer' else coalesce(provider_metadata->>'payment_method','online') end,
        'invoice_provider',case when v_request.provider='qonto' then 'qonto' else coalesce(provider_metadata->>'invoice_provider',v_request.provider) end,
        'approved_by',auth.uid(),
        'approved_at',now()
      ),
      updated_at=now()
  where organization_id=v_request.organization_id;

  if v_request.provider='qonto' and v_request.contract_id is not null then
    update public.subscription_contracts
    set status='active',payment_status='paid',payment_confirmed_at=now(),updated_at=now()
    where id=v_request.contract_id;
  end if;

  update public.subscription_change_requests
  set status='approved',
      provider_payment_reference=v_payment_reference,
      reviewed_by=auth.uid(),
      reviewed_at=now(),
      review_note=nullif(trim(coalesce(p_note,'')),''),
      updated_at=now()
  where id=p_request_id;

  insert into public.subscription_events(
    organization_id,request_id,event_type,actor_user_id,from_plan,to_plan,metadata
  ) values (
    v_request.organization_id,v_request.id,
    case when v_request.provider='qonto' then 'bank_transfer_subscription_activated' else 'request_approved' end,
    auth.uid(),v_request.current_plan,v_request.requested_plan,
    jsonb_build_object(
      'provider',v_request.provider,
      'provider_payment_reference',v_payment_reference,
      'contract_id',v_request.contract_id
    )
  );
end;
$$;

revoke all on function public.admin_review_subscription_request(uuid,text,text,text) from public,anon;
grant execute on function public.admin_review_subscription_request(uuid,text,text,text) to authenticated;

create or replace function public.admin_list_bank_transfer_subscriptions()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_catalog
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Acces administrateur NCR requis.'; end if;

  select coalesce(jsonb_agg(item order by organization_name),'[]'::jsonb)
  into v_result
  from (
    select o.name as organization_name,
      jsonb_build_object(
        'organization_id',o.id,
        'organization_name',o.name,
        'business_type',o.business_type,
        'plan_key',s.plan_key,
        'monthly_price_cents',s.monthly_price_cents,
        'organization_status',o.status,
        'subscription_status',s.status,
        'payment_confirmed_at',s.payment_confirmed_at,
        'current_period_end',s.current_period_end,
        'provider_payment_reference',s.provider_payment_reference,
        'contract_id',s.current_contract_id,
        'contract_reference',c.reference,
        'contract_status',c.status,
        'owner_email',owner_data.email
      ) as item
    from public.organization_subscriptions s
    join public.organizations o on o.id=s.organization_id
    left join public.subscription_contracts c on c.id=s.current_contract_id
    left join lateral (
      select u.email::text as email
      from public.organization_members m
      join auth.users u on u.id=m.user_id
      where m.organization_id=o.id and m.role='owner'
      order by m.created_at
      limit 1
    ) owner_data on true
    where s.provider='qonto'
  ) rows;

  return v_result;
end;
$$;

create or replace function public.admin_manage_bank_transfer_subscription(
  p_organization_id uuid,
  p_action text,
  p_payment_reference text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  v_subscription public.organization_subscriptions%rowtype;
  v_plan text;
  v_reference text:=nullif(trim(coalesce(p_payment_reference,'')),'');
  v_note text:=nullif(trim(coalesce(p_note,'')),'');
  v_next_due timestamptz;
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut gerer les abonnements par virement.';
  end if;
  if p_action not in ('mark_paid','suspend','reactivate','cancel') then raise exception 'Action invalide.'; end if;

  select s.*,o.plan
  into v_subscription,v_plan
  from public.organization_subscriptions s
  join public.organizations o on o.id=s.organization_id
  where s.organization_id=p_organization_id and s.provider='qonto'
  for update of s;

  if v_subscription.organization_id is null then raise exception 'Abonnement Qonto introuvable.'; end if;

  if p_action='mark_paid' then
    if v_reference is null then raise exception 'Une reference de virement ou de facture est requise.'; end if;
    v_next_due:=now()+interval '1 month';
    update public.organization_subscriptions
    set status='active',
        payment_confirmed_at=now(),
        provider_payment_reference=v_reference,
        current_period_start=now(),
        current_period_end=v_next_due,
        payment_failed_at=null,
        grace_period_ends_at=null,
        access_restricted_at=null,
        provider_metadata=coalesce(provider_metadata,'{}'::jsonb)||jsonb_build_object(
          'last_bank_transfer_reference',v_reference,
          'last_bank_transfer_confirmed_at',now(),
          'last_bank_transfer_note',v_note
        ),
        updated_at=now(),updated_by=auth.uid()
    where organization_id=p_organization_id;
    update public.organizations set status='active',updated_at=now() where id=p_organization_id;
    update public.subscription_contracts
    set status='active',payment_status='paid',payment_confirmed_at=now(),updated_at=now()
    where id=v_subscription.current_contract_id and signed_at is not null;
  elsif p_action='suspend' then
    update public.organization_subscriptions
    set status='paused',
        access_restricted_at=coalesce(access_restricted_at,now()),
        provider_metadata=coalesce(provider_metadata,'{}'::jsonb)||jsonb_build_object(
          'manual_suspension_at',now(),'manual_suspension_note',v_note
        ),
        updated_at=now(),updated_by=auth.uid()
    where organization_id=p_organization_id;
    update public.organizations set status='suspended',updated_at=now()
    where id=p_organization_id and status<>'closed';
  elsif p_action='reactivate' then
    update public.organization_subscriptions
    set status='active',
        access_restricted_at=null,
        payment_failed_at=null,
        grace_period_ends_at=null,
        provider_metadata=coalesce(provider_metadata,'{}'::jsonb)||jsonb_build_object(
          'manual_reactivation_at',now(),'manual_reactivation_note',v_note
        ),
        updated_at=now(),updated_by=auth.uid()
    where organization_id=p_organization_id;
    update public.organizations set status='active',updated_at=now() where id=p_organization_id;
  else
    update public.organization_subscriptions
    set status='canceled',
        cancel_at_period_end=false,
        access_restricted_at=coalesce(access_restricted_at,now()),
        provider_metadata=coalesce(provider_metadata,'{}'::jsonb)||jsonb_build_object(
          'manual_cancellation_at',now(),'manual_cancellation_note',v_note
        ),
        updated_at=now(),updated_by=auth.uid()
    where organization_id=p_organization_id;
    update public.organizations set status='suspended',updated_at=now()
    where id=p_organization_id and status<>'closed';
    update public.subscription_contracts
    set status='canceled',updated_at=now()
    where id=v_subscription.current_contract_id and signed_at is not null;
  end if;

  insert into public.subscription_events(
    organization_id,event_type,actor_user_id,from_plan,to_plan,metadata
  ) values (
    p_organization_id,'bank_transfer_'||p_action,auth.uid(),v_plan,v_plan,
    jsonb_build_object('payment_reference',v_reference,'note',v_note)
  );

  insert into public.audit_logs(
    organization_id,user_id,action,entity_type,entity_id,metadata
  ) values (
    p_organization_id,auth.uid(),'billing.bank_transfer_'||p_action,
    'organization_subscription',p_organization_id::text,
    jsonb_build_object('payment_reference',v_reference,'note',v_note)
  );

  return jsonb_build_object('organization_id',p_organization_id,'action',p_action,'next_due',v_next_due);
end;
$$;

revoke all on function public.admin_list_bank_transfer_subscriptions() from public,anon;
revoke all on function public.admin_manage_bank_transfer_subscription(uuid,text,text,text) from public,anon;
grant execute on function public.admin_list_bank_transfer_subscriptions() to authenticated;
grant execute on function public.admin_manage_bank_transfer_subscription(uuid,text,text,text) to authenticated;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.29.25-qonto-transfer','2.29.25','ncr-suite-shell-v2.29.25-training-test-sandbox',
  now(),auth.uid(),
  'Qonto/virement : choix admin, contrat dedie, signature obligatoire, verification du premier virement et pilotage manuel sans dependance Stripe.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
