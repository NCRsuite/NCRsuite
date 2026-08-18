-- NCR Suite V2.29.25 — Réconciliation des snapshots de prix des abonnements Stripe.
-- Corrige uniquement les abonnements réellement rattachés à un abonnement Stripe et à un Price actif du catalogue courant.

begin;

update public.organization_subscriptions s
set monthly_price_cents = d.monthly_price_cents,
    updated_at = now()
from public.organizations o
join public.domain_plan_catalog d
  on d.business_type = o.business_type
 and d.plan_key = o.plan
 and d.active = true
join public.stripe_price_catalog sp
  on sp.business_type = o.business_type
 and sp.plan_key = o.plan
 and sp.active = true
where s.organization_id = o.id
  and nullif(trim(coalesce(s.stripe_subscription_id,s.provider_subscription_id,'')),'') is not null
  and nullif(trim(coalesce(s.stripe_price_id,'')),'') = sp.stripe_price_id
  and coalesce(s.stripe_livemode,false) = sp.livemode
  and s.monthly_price_cents is distinct from d.monthly_price_cents;

commit;
select pg_notify('pgrst','reload schema');
