-- NCR Suite V2.25.0 - Multi-business Stripe subscription billing
-- Run after 093_platform_admin_locked_screen_push.sql.

begin;

do $$
begin
  if to_regclass('public.organization_subscriptions') is null
     or to_regclass('public.subscription_change_requests') is null
     or to_regclass('public.domain_billing_plan_links') is null
     or to_regclass('public.platform_release_state') is null then
    raise exception 'Les migrations NCR Suite precedentes doivent etre executees avant la V2.25.0.';
  end if;
end;
$$;

alter table public.organization_subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_subscription_status text,
  add column if not exists stripe_current_period_end timestamptz,
  add column if not exists stripe_livemode boolean;

alter table public.subscription_change_requests
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_livemode boolean;

create unique index if not exists uq_organization_subscriptions_stripe_customer
  on public.organization_subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists uq_organization_subscriptions_stripe_subscription
  on public.organization_subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

create unique index if not exists uq_subscription_requests_stripe_checkout
  on public.subscription_change_requests(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create table if not exists public.stripe_price_catalog (
  business_type text not null,
  plan_key text not null references public.plan_catalog(plan_key) on delete cascade,
  stripe_price_id text not null,
  livemode boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_type, plan_key, livemode),
  unique (stripe_price_id, livemode),
  constraint stripe_price_catalog_id_check
    check (stripe_price_id ~ '^price_[A-Za-z0-9]+$')
);

insert into public.stripe_price_catalog(
  business_type,plan_key,stripe_price_id,livemode,active
) values
  ('formation','decouverte','price_1TxX0hPC1bVY7Vn5W4DxQBdX',false,true),
  ('formation','essentielle','price_1TxX2SPC1bVY7Vn5kdYgwDVb',false,true),
  ('formation','professionnelle','price_1TxXZ4PC1bVY7Vn53OOobCuw',false,true)
on conflict(business_type,plan_key,livemode) do update set
  stripe_price_id=excluded.stripe_price_id,
  active=true,
  updated_at=now();

insert into public.domain_billing_plan_links(
  business_type,plan_key,provider,checkout_url,active
)
select 'formation',p.plan_key,'stripe',null,true
from public.plan_catalog p
where p.plan_key in ('decouverte','essentielle','professionnelle')
on conflict(business_type,plan_key) do update set
  provider='stripe',
  checkout_url=null,
  active=true,
  updated_at=now();

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  object_id text,
  livemode boolean not null,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null default 'received'
    check (status in ('received','processing','processed','ignored','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_stripe_webhook_events_status
  on public.stripe_webhook_events(status,received_at desc);
create index if not exists idx_stripe_webhook_events_organization
  on public.stripe_webhook_events(organization_id,received_at desc);

drop trigger if exists set_stripe_price_catalog_updated_at
  on public.stripe_price_catalog;
create trigger set_stripe_price_catalog_updated_at
before update on public.stripe_price_catalog
for each row execute procedure public.set_updated_at();

drop trigger if exists set_stripe_webhook_events_updated_at
  on public.stripe_webhook_events;
create trigger set_stripe_webhook_events_updated_at
before update on public.stripe_webhook_events
for each row execute procedure public.set_updated_at();

alter table public.stripe_price_catalog enable row level security;
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_price_catalog from anon,authenticated;
revoke all on public.stripe_webhook_events from anon,authenticated;

-- Stripe plans create a payment-pending request even though their Checkout URL
-- is generated on demand by the authenticated Edge Function.
create or replace function public.request_subscription_change(
  p_organization_id uuid,
  p_requested_plan text,
  p_accept_terms boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_plan text;
  v_business_type text;
  v_subscription_status text;
  v_provider text := 'manual';
  v_checkout_url text;
  v_status text := 'pending_review';
  v_request_type text;
  v_terms_version text;
  v_request_id uuid;
  v_reference text;
  v_current_rank integer;
  v_requested_rank integer;
  v_domain_catalog_exists boolean := false;
begin
  if not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Seul le proprietaire ou un administrateur peut gerer l abonnement.';
  end if;
  if not coalesce(p_accept_terms,false) then
    raise exception 'Vous devez accepter les conditions d abonnement.';
  end if;
  if p_requested_plan not in ('decouverte','essentielle','professionnelle','metier') then
    raise exception 'Formule invalide.';
  end if;
  if exists (
    select 1 from public.subscription_change_requests
    where organization_id=p_organization_id
      and status in ('payment_pending','pending_review')
  ) then
    raise exception 'Une demande de changement est deja en cours.';
  end if;

  select o.plan,o.business_type,coalesce(s.status,'active')
  into v_current_plan,v_business_type,v_subscription_status
  from public.organizations o
  left join public.organization_subscriptions s on s.organization_id=o.id
  where o.id=p_organization_id;

  if v_current_plan is null then raise exception 'Entreprise introuvable.'; end if;

  select exists(
    select 1 from public.domain_plan_catalog
    where business_type=v_business_type
  ) into v_domain_catalog_exists;

  if v_domain_catalog_exists and not exists(
    select 1 from public.domain_plan_catalog
    where business_type=v_business_type
      and plan_key=p_requested_plan
      and active=true
  ) then
    raise exception 'Cette formule n est pas disponible pour ce domaine.';
  end if;

  select terms_version into v_terms_version
  from public.platform_billing_settings where singleton=true;

  v_current_rank:=case v_current_plan
    when 'decouverte' then 1 when 'essentielle' then 2
    when 'professionnelle' then 3 else 4 end;
  v_requested_rank:=case p_requested_plan
    when 'decouverte' then 1 when 'essentielle' then 2
    when 'professionnelle' then 3 else 4 end;

  if p_requested_plan='metier' then
    v_request_type:='metier';
  elsif v_subscription_status='trialing' then
    v_request_type:='reactivation';
  elsif p_requested_plan=v_current_plan then
    if v_subscription_status in ('past_due','paused','canceled') then
      v_request_type:='reactivation';
    else
      raise exception 'Cette formule est deja active.';
    end if;
  elsif v_requested_rank>v_current_rank then
    v_request_type:='upgrade';
  else
    v_request_type:='downgrade';
  end if;

  if v_request_type in ('upgrade','downgrade','reactivation','metier') then
    if v_domain_catalog_exists then
      select provider,checkout_url
      into v_provider,v_checkout_url
      from public.domain_billing_plan_links
      where business_type=v_business_type
        and plan_key=p_requested_plan
        and active=true;
    else
      select provider,checkout_url
      into v_provider,v_checkout_url
      from public.billing_plan_links
      where plan_key=p_requested_plan and active=true;
    end if;

    if v_provider='stripe' and exists(
      select 1 from public.stripe_price_catalog
      where business_type=v_business_type
        and plan_key=p_requested_plan
        and active=true
    ) then
      v_status:='payment_pending';
      v_checkout_url:=null;
    elsif v_checkout_url is not null then
      v_status:='payment_pending';
    else
      v_provider:='manual';
      v_status:='pending_review';
    end if;
  end if;

  v_reference:='NCR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));

  insert into public.subscription_change_requests(
    organization_id,current_plan,requested_plan,request_type,status,
    provider,checkout_url_snapshot,request_reference,accepted_terms_at,
    terms_version,requested_by
  ) values (
    p_organization_id,v_current_plan,p_requested_plan,v_request_type,v_status,
    v_provider,v_checkout_url,v_reference,now(),
    coalesce(v_terms_version,'initial'),auth.uid()
  ) returning id into v_request_id;

  insert into public.subscription_events(
    organization_id,request_id,event_type,actor_user_id,from_plan,to_plan,metadata
  ) values (
    p_organization_id,v_request_id,'change_requested',auth.uid(),
    v_current_plan,p_requested_plan,
    jsonb_build_object(
      'status',v_status,'provider',v_provider,'reference',v_reference,
      'business_type',v_business_type
    )
  );

  return jsonb_build_object(
    'id',v_request_id,'status',v_status,'provider',v_provider,
    'checkout_url',v_checkout_url,'reference',v_reference
  );
end;
$$;

create or replace function public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_object_id text,
  p_livemode boolean,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_claimed boolean:=false;
begin
  if current_user<>'service_role'
     and coalesce(auth.role(),'')<>'service_role' then
    raise exception 'Acces service Stripe requis.';
  end if;
  if nullif(trim(p_event_id),'') is null
     or nullif(trim(p_event_type),'') is null then
    raise exception 'Evenement Stripe invalide.';
  end if;

  insert into public.stripe_webhook_events(
    event_id,event_type,object_id,livemode,status,metadata
  ) values (
    p_event_id,p_event_type,nullif(trim(coalesce(p_object_id,'')),''),
    coalesce(p_livemode,false),'received',coalesce(p_metadata,'{}'::jsonb)
  ) on conflict(event_id) do nothing;

  update public.stripe_webhook_events
  set status='processing',
      attempts=attempts+1,
      error_message=null,
      metadata=metadata||coalesce(p_metadata,'{}'::jsonb),
      updated_at=now()
  where event_id=p_event_id
    and (
      status in ('received','failed')
      or (status='processing' and updated_at<now()-interval '5 minutes')
    )
  returning true into v_claimed;

  return coalesce(v_claimed,false);
end;
$$;

create or replace function public.complete_stripe_webhook_event(
  p_event_id text,
  p_status text,
  p_organization_id uuid default null,
  p_error_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
begin
  if current_user<>'service_role'
     and coalesce(auth.role(),'')<>'service_role' then
    raise exception 'Acces service Stripe requis.';
  end if;
  if p_status not in ('processed','ignored','failed') then
    raise exception 'Statut webhook Stripe invalide.';
  end if;

  update public.stripe_webhook_events
  set status=p_status,
      organization_id=coalesce(p_organization_id,organization_id),
      error_message=case
        when p_status='failed' then left(coalesce(p_error_message,'Erreur Stripe'),2000)
        else null
      end,
      metadata=metadata||coalesce(p_metadata,'{}'::jsonb),
      processed_at=case when p_status in ('processed','ignored') then now() else null end,
      updated_at=now()
  where event_id=p_event_id;
end;
$$;

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
set search_path = public,pg_catalog
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

  if p_app_status in ('active','trialing')
     and p_event_type in (
       'checkout.session.completed','invoice.paid','customer.subscription.updated'
     ) then
    update public.organizations
    set plan=v_plan_key,status='active',updated_at=now()
    where id=v_organization_id;
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

create or replace function public.notify_platform_admin_stripe_event()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_name text;
  v_title text;
  v_body text;
  v_urgency text:='normal';
begin
  if new.event_type not in (
    'stripe_checkout_completed','stripe_invoice_paid',
    'stripe_invoice_payment_failed','stripe_subscription_deleted'
  ) then return new; end if;

  select name into v_name from public.organizations where id=new.organization_id;
  v_title:=case new.event_type
    when 'stripe_checkout_completed' then 'Souscription Stripe confirmee'
    when 'stripe_invoice_paid' then 'Paiement Stripe recu'
    when 'stripe_invoice_payment_failed' then 'Paiement Stripe echoue'
    else 'Abonnement Stripe termine'
  end;
  v_body:=coalesce(v_name,'Entreprise')||' - '||
    case new.event_type
      when 'stripe_checkout_completed' then 'la souscription NCR Suite est active.'
      when 'stripe_invoice_paid' then 'le renouvellement a ete paye.'
      when 'stripe_invoice_payment_failed' then 'un paiement doit etre regularise.'
      else 'l abonnement Stripe a ete resilie.'
    end;
  if new.event_type in (
    'stripe_invoice_payment_failed','stripe_subscription_deleted'
  ) then v_urgency:='high'; end if;

  perform public.enqueue_platform_admin_notification_internal(
    new.organization_id,'subscription',new.event_type,v_title,v_body,
    'billing',v_urgency,'subscription_event',new.id::text,
    new.metadata,
    'stripe:'||coalesce(new.metadata->>'stripe_event_id',new.id::text)
  );
  return new;
end;
$$;

drop trigger if exists notify_platform_admin_stripe_event_insert
  on public.subscription_events;
create trigger notify_platform_admin_stripe_event_insert
after insert on public.subscription_events
for each row execute procedure public.notify_platform_admin_stripe_event();

revoke all on function public.request_subscription_change(uuid,text,boolean)
  from public,anon;
grant execute on function public.request_subscription_change(uuid,text,boolean)
  to authenticated;

revoke all on function public.claim_stripe_webhook_event(text,text,text,boolean,jsonb)
  from public,anon,authenticated;
revoke all on function public.complete_stripe_webhook_event(text,text,uuid,text,jsonb)
  from public,anon,authenticated;
revoke all on function public.apply_stripe_billing_event(
  text,text,uuid,uuid,text,text,text,text,text,text,
  timestamptz,timestamptz,boolean,boolean,boolean,jsonb
) from public,anon,authenticated;
revoke all on function public.notify_platform_admin_stripe_event()
  from public,anon,authenticated;

grant execute on function public.claim_stripe_webhook_event(text,text,text,boolean,jsonb)
  to service_role;
grant execute on function public.complete_stripe_webhook_event(text,text,uuid,text,jsonb)
  to service_role;
grant execute on function public.apply_stripe_billing_event(
  text,text,uuid,uuid,text,text,text,text,text,text,
  timestamptz,timestamptz,boolean,boolean,boolean,jsonb
) to service_role;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.25.0','2.25.0','ncr-suite-shell-v2.25.0-stripe-billing',
  now(),auth.uid(),
  'V2.25.0 : Checkout Stripe multi-metiers, portail client, synchronisation des abonnements et webhooks signes.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
