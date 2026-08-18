-- NCR Suite V2.29.25 — R5.7.4
-- Conversion d'un essai en abonnement Stripe :
-- - l'entreprise reste en statut trial tant que Stripe est trialing ;
-- - elle passe active uniquement lorsque Stripe devient active ;
-- - aucune donnée n'est supprimée.

begin;

create or replace function public.apply_stripe_billing_event(
  p_stripe_event_id text,
  p_event_type text,
  p_organization_id uuid,
  p_request_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_price_id text,
  p_plan_key text,
  p_app_status text,
  p_stripe_status text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_payment_confirmed boolean,
  p_livemode boolean,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_organization_id uuid:=p_organization_id;
  v_request_id uuid:=p_request_id;
  v_business_type text;
  v_previous_plan text;
  v_plan_key text:=nullif(trim(coalesce(p_plan_key,'')),'');
  v_catalog_plan_key text;
  v_price integer;
  v_reference text;
begin
  if current_user<>'service_role'
     and coalesce(auth.role(),'')<>'service_role' then
    raise exception 'Acces service Stripe requis.';
  end if;
  if p_event_type not in (
    'checkout.session.completed','invoice.paid','invoice.payment_failed',
    'customer.subscription.updated','customer.subscription.deleted'
  ) then raise exception 'Type d evenement Stripe non pris en charge.'; end if;
  if p_app_status not in ('trialing','active','past_due','paused','canceled') then
    raise exception 'Statut d abonnement invalide.';
  end if;

  if v_organization_id is null and nullif(trim(coalesce(p_subscription_id,'')),'') is not null then
    select organization_id into v_organization_id
    from public.organization_subscriptions
    where stripe_subscription_id=p_subscription_id
       or provider_subscription_id=p_subscription_id
    limit 1;
  end if;
  if v_organization_id is null and nullif(trim(coalesce(p_customer_id,'')),'') is not null then
    select organization_id into v_organization_id
    from public.organization_subscriptions
    where stripe_customer_id=p_customer_id
       or provider_customer_id=p_customer_id
    limit 1;
  end if;
  if v_organization_id is null then
    raise exception 'Entreprise Stripe introuvable.';
  end if;

  select business_type,plan into v_business_type,v_previous_plan
  from public.organizations where id=v_organization_id;
  if v_business_type is null then raise exception 'Entreprise introuvable.'; end if;

  if nullif(trim(coalesce(p_price_id,'')),'') is not null then
    select plan_key into v_catalog_plan_key
    from public.stripe_price_catalog
    where stripe_price_id=p_price_id
      and livemode=coalesce(p_livemode,false)
      and active=true
      and business_type=v_business_type;
    v_plan_key:=coalesce(v_catalog_plan_key,v_plan_key);
  end if;
  v_plan_key:=coalesce(v_plan_key,v_previous_plan);

  if not exists(
    select 1 from public.domain_plan_catalog
    where business_type=v_business_type
      and plan_key=v_plan_key
      and active=true
  ) then raise exception 'Formule Stripe incoherente avec le domaine.'; end if;

  v_price:=public.domain_plan_price(v_business_type,v_plan_key);

  update public.organization_subscriptions
  set plan_key=v_plan_key,
      status=p_app_status,
      provider='stripe',
      monthly_price_cents=coalesce(v_price,monthly_price_cents),
      current_period_start=coalesce(p_period_start,current_period_start),
      current_period_end=coalesce(p_period_end,current_period_end),
      cancel_at_period_end=coalesce(p_cancel_at_period_end,false),
      provider_customer_id=coalesce(nullif(trim(coalesce(p_customer_id,'')),''),provider_customer_id),
      provider_subscription_id=coalesce(nullif(trim(coalesce(p_subscription_id,'')),''),provider_subscription_id),
      provider_payment_reference=coalesce(nullif(trim(coalesce(p_subscription_id,'')),''),provider_payment_reference),
      provider_checkout_url=null,
      provider_metadata=provider_metadata||jsonb_build_object(
        'last_stripe_event_id',p_stripe_event_id,
        'last_stripe_event_type',p_event_type,
        'last_stripe_event_at',now(),
        'livemode',coalesce(p_livemode,false)
      )||coalesce(p_metadata,'{}'::jsonb),
      payment_confirmed_at=case
        when coalesce(p_payment_confirmed,false) then now()
        else payment_confirmed_at
      end,
      stripe_customer_id=coalesce(nullif(trim(coalesce(p_customer_id,'')),''),stripe_customer_id),
      stripe_subscription_id=coalesce(nullif(trim(coalesce(p_subscription_id,'')),''),stripe_subscription_id),
      stripe_price_id=coalesce(nullif(trim(coalesce(p_price_id,'')),''),stripe_price_id),
      stripe_subscription_status=nullif(trim(coalesce(p_stripe_status,'')),''),
      stripe_current_period_end=coalesce(p_period_end,stripe_current_period_end),
      stripe_livemode=coalesce(p_livemode,false),
      updated_at=now()
  where organization_id=v_organization_id;
  if not found then raise exception 'Abonnement NCR Suite introuvable.'; end if;

  if p_app_status='trialing'
     and p_event_type in (
       'checkout.session.completed','invoice.paid','customer.subscription.updated'
     ) then
    update public.organizations
    set plan=v_plan_key,status='trial',updated_at=now()
    where id=v_organization_id and status<>'closed';
  elsif p_app_status='active'
     and p_event_type in (
       'checkout.session.completed','invoice.paid','customer.subscription.updated'
     ) then
    update public.organizations
    set plan=v_plan_key,status='active',updated_at=now()
    where id=v_organization_id and status<>'closed';
  elsif p_app_status in ('paused','canceled') then
    update public.organizations
    set status='suspended',updated_at=now()
    where id=v_organization_id and status<>'closed';
  end if;

  if v_request_id is not null
     and not exists(
       select 1 from public.subscription_change_requests
       where id=v_request_id
         and organization_id=v_organization_id
         and requested_plan=v_plan_key
         and provider='stripe'
         and status='payment_pending'
     ) then
    v_request_id:=null;
  end if;

  if v_request_id is null
     and p_event_type in (
       'checkout.session.completed','invoice.paid','customer.subscription.updated'
     ) then
    select id into v_request_id
    from public.subscription_change_requests
    where organization_id=v_organization_id
      and requested_plan=v_plan_key
      and provider='stripe'
      and status='payment_pending'
    order by created_at desc limit 1;
  end if;

  if v_request_id is not null
     and p_event_type in (
       'checkout.session.completed','invoice.paid','customer.subscription.updated'
     )
     and p_app_status in ('active','trialing') then
    update public.subscription_change_requests
    set status='approved',
        provider_payment_reference=coalesce(
          nullif(trim(coalesce(p_subscription_id,'')),''),
          nullif(trim(coalesce(p_stripe_event_id,'')),'')
        ),
        checkout_url_snapshot=null,
        reviewed_at=coalesce(reviewed_at,now()),
        review_note=coalesce(review_note,'Validation automatique Stripe'),
        updated_at=now()
    where id=v_request_id
      and organization_id=v_organization_id
      and status='payment_pending'
    returning request_reference into v_reference;
  end if;

  insert into public.subscription_events(
    organization_id,request_id,event_type,actor_user_id,from_plan,to_plan,metadata
  ) values (
    v_organization_id,v_request_id,
    case p_event_type
      when 'checkout.session.completed' then 'stripe_checkout_completed'
      when 'invoice.paid' then 'stripe_invoice_paid'
      when 'invoice.payment_failed' then 'stripe_invoice_payment_failed'
      when 'customer.subscription.deleted' then 'stripe_subscription_deleted'
      else 'stripe_subscription_updated'
    end,
    null,v_previous_plan,v_plan_key,
    jsonb_build_object(
      'stripe_event_id',p_stripe_event_id,
      'stripe_status',p_stripe_status,
      'subscription_status',p_app_status,
      'stripe_subscription_id',p_subscription_id,
      'stripe_price_id',p_price_id,
      'livemode',coalesce(p_livemode,false)
    )||coalesce(p_metadata,'{}'::jsonb)
  );

  insert into public.audit_logs(
    organization_id,user_id,action,entity_type,entity_id,metadata
  ) values (
    v_organization_id,null,'billing.stripe_event_applied',
    'organization_subscription',v_organization_id::text,
    jsonb_build_object(
      'stripe_event_id',p_stripe_event_id,'event_type',p_event_type,
      'app_status',p_app_status,'stripe_status',p_stripe_status,
      'plan_key',v_plan_key,'request_reference',v_reference
    )
  );

  return jsonb_build_object(
    'organization_id',v_organization_id,
    'request_id',v_request_id,
    'plan_key',v_plan_key,
    'status',p_app_status
  );
end;
$$;

select pg_notify('pgrst','reload schema');

commit;
