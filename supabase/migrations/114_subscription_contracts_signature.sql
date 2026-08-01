-- NCR Suite V2.29.0 - Contrats d'abonnement et signature electronique simple documentee
-- A executer apres 113_unified_external_portals_photo_reports.sql.

begin;

do $$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_subscriptions') is null
     or to_regclass('public.subscription_change_requests') is null
     or to_regclass('public.platform_release_state') is null then
    raise exception 'Les migrations NCR Suite precedentes doivent etre executees avant la V2.29.0.';
  end if;
end;
$$;

create table if not exists public.subscription_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_kind text not null default 'initial_subscription'
    check (contract_kind in ('initial_subscription','plan_amendment','module_amendment')),
  reference text not null unique,
  contract_version text not null,
  status text not null default 'awaiting_signature'
    check (status in ('awaiting_signature','signed','payment_pending','active','payment_failed','canceled','superseded')),
  business_type text not null,
  plan_key text not null check (plan_key in ('decouverte','essentielle','professionnelle','metier')),
  plan_label text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  client_snapshot jsonb not null default '{}'::jsonb,
  offer_snapshot jsonb not null default '{}'::jsonb,
  document_path text not null,
  document_sha256 text not null check (document_sha256 ~ '^[a-f0-9]{64}$'),
  signed_document_path text,
  signed_document_sha256 text check (signed_document_sha256 is null or signed_document_sha256 ~ '^[a-f0-9]{64}$'),
  signer_user_id uuid references auth.users(id) on delete set null,
  signer_name text,
  signer_email text,
  signer_title text,
  accepted_contract boolean not null default false,
  accepted_cgv boolean not null default false,
  accepted_cgu boolean not null default false,
  accepted_privacy_dpa boolean not null default false,
  otp_hash text,
  otp_expires_at timestamptz,
  otp_attempts integer not null default 0 check (otp_attempts between 0 and 10),
  otp_requested_at timestamptz,
  otp_verified_at timestamptz,
  signed_at timestamptz,
  signer_ip text,
  signer_user_agent text,
  signature_payload_sha256 text check (signature_payload_sha256 is null or signature_payload_sha256 ~ '^[a-f0-9]{64}$'),
  stripe_checkout_session_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  payment_status text not null default 'not_started'
    check (payment_status in ('not_started','pending','paid','failed','canceled')),
  payment_confirmed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_contracts_signed_integrity check (
    status = 'awaiting_signature'
    or (
      signed_at is not null
      and signed_document_path is not null
      and signed_document_sha256 is not null
      and signature_payload_sha256 is not null
      and accepted_contract
      and accepted_cgv
      and accepted_cgu
      and accepted_privacy_dpa
    )
  )
);

create table if not exists public.subscription_contract_events (
  id bigint generated always as identity primary key,
  contract_id uuid not null references public.subscription_contracts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  source_ip text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscription_contracts_organization
  on public.subscription_contracts(organization_id,created_at desc);
create index if not exists idx_subscription_contracts_status
  on public.subscription_contracts(status,created_at desc);
create unique index if not exists uq_subscription_contracts_checkout
  on public.subscription_contracts(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create unique index if not exists uq_subscription_contracts_subscription
  on public.subscription_contracts(stripe_subscription_id)
  where stripe_subscription_id is not null;
create index if not exists idx_subscription_contract_events_contract
  on public.subscription_contract_events(contract_id,created_at asc);

alter table public.subscription_change_requests
  add column if not exists contract_id uuid references public.subscription_contracts(id) on delete set null;

alter table public.organization_subscriptions
  add column if not exists current_contract_id uuid references public.subscription_contracts(id) on delete set null;

create index if not exists idx_subscription_change_requests_contract
  on public.subscription_change_requests(contract_id)
  where contract_id is not null;

drop trigger if exists set_subscription_contracts_updated_at on public.subscription_contracts;
create trigger set_subscription_contracts_updated_at
before update on public.subscription_contracts
for each row execute procedure public.set_updated_at();

alter table public.subscription_contracts enable row level security;
alter table public.subscription_contract_events enable row level security;
revoke all on public.subscription_contracts from public,anon,authenticated;
revoke all on public.subscription_contract_events from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('subscription-contracts','subscription-contracts',false,10485760,array['application/pdf'])
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.29.0','2.29.0','ncr-suite-shell-v2.29.0-subscription-contract-signature',
  now(),auth.uid(),
  'V2.29.0 : contrat d abonnement immutable, code e-mail, signature documentee, preuve horodatee et activation Stripe apres signature.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
