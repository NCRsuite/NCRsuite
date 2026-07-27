-- NCR Suite V2.26.0 - Stripe catalog, paid activation and retained data
-- Run after 094_stripe_subscription_billing.sql.

begin;

do $$
begin
  if to_regclass('public.stripe_price_catalog') is null
     or to_regclass('public.organization_subscriptions') is null
     or to_regclass('public.platform_access_requests') is null
     or to_regclass('public.platform_release_state') is null
     or to_regclass('public.training_module_billing_links') is null
     or to_regclass('public.security_addon_billing_links') is null then
    raise exception 'Les migrations NCR Suite precedentes doivent etre executees avant la V2.26.0.';
  end if;
end;
$$;

alter table public.platform_billing_settings
  add column if not exists stripe_livemode boolean not null default false,
  add column if not exists payment_required_before_access boolean not null default true,
  add column if not exists downgrade_at_period_end boolean not null default true,
  add column if not exists grace_period_days integer not null default 7,
  add column if not exists qonto_exceptional_payment_url text,
  add column if not exists qonto_exceptional_instructions text not null default
    'Qonto est reserve aux prestations sur devis, parametrages exceptionnels, formations personnalisees, factures ponctuelles et virements convenus avec le client.';

alter table public.platform_billing_settings
  drop constraint if exists platform_billing_settings_grace_period_days_check;
alter table public.platform_billing_settings
  add constraint platform_billing_settings_grace_period_days_check
  check (grace_period_days between 0 and 30);

alter table public.platform_billing_settings
  drop constraint if exists platform_billing_settings_qonto_exceptional_url_check;
alter table public.platform_billing_settings
  add constraint platform_billing_settings_qonto_exceptional_url_check
  check (
    qonto_exceptional_payment_url is null
    or qonto_exceptional_payment_url ~ '^https://[^[:space:]]+$'
  );

update public.platform_billing_settings
set default_provider='stripe',
    default_trial_days=0,
    payment_required_before_access=true,
    downgrade_at_period_end=true,
    updated_at=now()
where singleton=true;

alter table public.platform_access_requests
  add column if not exists requested_plan text;

update public.platform_access_requests
set requested_plan=coalesce(requested_plan,'essentielle')
where requested_plan is null;

alter table public.platform_access_requests
  alter column requested_plan set default 'essentielle';
alter table public.platform_access_requests
  alter column requested_plan set not null;

alter table public.platform_access_requests
  drop constraint if exists platform_access_requests_requested_plan_check;
alter table public.platform_access_requests
  add constraint platform_access_requests_requested_plan_check
  check (requested_plan in ('decouverte','essentielle','professionnelle','metier'));

alter table public.platform_access_requests
  drop constraint if exists platform_access_requests_business_type_check;
alter table public.platform_access_requests
  add constraint platform_access_requests_business_type_check
  check (
    business_type in ('coiffure','securite','nettoyage','restauration','formation')
  );

alter table public.organization_subscriptions
  add column if not exists scheduled_plan_key text,
  add column if not exists scheduled_change_at timestamptz,
  add column if not exists stripe_schedule_id text,
  add column if not exists payment_failed_at timestamptz,
  add column if not exists grace_period_ends_at timestamptz,
  add column if not exists access_restricted_at timestamptz,
  add column if not exists data_retention_mode text not null default 'preserve';

alter table public.organization_subscriptions
  drop constraint if exists organization_subscriptions_scheduled_plan_check;
alter table public.organization_subscriptions
  add constraint organization_subscriptions_scheduled_plan_check
  check (
    scheduled_plan_key is null
    or scheduled_plan_key in ('decouverte','essentielle','professionnelle','metier')
  );

alter table public.organization_subscriptions
  drop constraint if exists organization_subscriptions_data_retention_check;
alter table public.organization_subscriptions
  add constraint organization_subscriptions_data_retention_check
  check (data_retention_mode='preserve');

alter table public.subscription_change_requests
  add column if not exists effective_at timestamptz,
  add column if not exists stripe_schedule_id text;

alter table public.organization_training_modules
  add column if not exists stripe_subscription_item_id text;
alter table public.training_module_change_requests
  add column if not exists stripe_subscription_item_id text,
  add column if not exists effective_at timestamptz;
alter table public.organization_security_addons
  add column if not exists stripe_subscription_item_id text;
alter table public.security_addon_change_requests
  add column if not exists stripe_subscription_item_id text,
  add column if not exists effective_at timestamptz;

create unique index if not exists uq_training_module_stripe_item
  on public.organization_training_modules(stripe_subscription_item_id)
  where stripe_subscription_item_id is not null;
create unique index if not exists uq_security_addon_stripe_item
  on public.organization_security_addons(stripe_subscription_item_id)
  where stripe_subscription_item_id is not null;

create table if not exists public.stripe_addon_price_catalog (
  item_type text not null check (item_type in ('training_module','security_addon')),
  item_key text not null,
  stripe_price_id text not null,
  livemode boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(item_type,item_key,livemode),
  unique(stripe_price_id,livemode),
  constraint stripe_addon_price_catalog_id_check
    check (stripe_price_id ~ '^price_[A-Za-z0-9]+$')
);

create table if not exists public.subscription_data_retention_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'plan_changed','plan_change_scheduled','addon_removed',
      'payment_access_restricted','subscription_canceled','access_restored'
    )
  ),
  previous_plan text,
  next_plan text,
  effective_at timestamptz,
  data_preserved boolean not null default true check (data_preserved),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscription_retention_events_org
  on public.subscription_data_retention_events(organization_id,created_at desc);

update public.billing_plan_links
set provider='stripe',checkout_url=null,active=false,updated_at=now();

update public.domain_billing_plan_links l
set provider='stripe',
    checkout_url=null,
    active=exists (
      select 1
      from public.stripe_price_catalog c
      join public.platform_billing_settings bs
        on bs.singleton=true and bs.stripe_livemode=c.livemode
      where c.business_type=l.business_type
        and c.plan_key=l.plan_key
        and c.active=true
    ),
    updated_at=now();

update public.training_module_billing_links l
set provider='stripe',
    checkout_url=null,
    active=exists (
      select 1
      from public.stripe_addon_price_catalog c
      join public.platform_billing_settings bs
        on bs.singleton=true and bs.stripe_livemode=c.livemode
      where c.item_type='training_module'
        and c.item_key=l.module_key
        and c.active=true
    ),
    updated_at=now();

update public.security_addon_billing_links l
set provider='stripe',
    checkout_url=null,
    active=exists (
      select 1
      from public.stripe_addon_price_catalog c
      join public.platform_billing_settings bs
        on bs.singleton=true and bs.stripe_livemode=c.livemode
      where c.item_type='security_addon'
        and c.item_key=l.addon_key
        and c.active=true
    ),
    updated_at=now();

drop trigger if exists set_stripe_addon_price_catalog_updated_at
  on public.stripe_addon_price_catalog;
create trigger set_stripe_addon_price_catalog_updated_at
before update on public.stripe_addon_price_catalog
for each row execute procedure public.set_updated_at();

alter table public.stripe_addon_price_catalog enable row level security;
alter table public.subscription_data_retention_events enable row level security;
revoke all on public.stripe_addon_price_catalog from public,anon,authenticated;
revoke all on public.subscription_data_retention_events from public,anon,authenticated;

create or replace function public.has_org_role_any_status(
  p_organization_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public,pg_catalog
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id=p_organization_id
      and m.user_id=auth.uid()
      and m.status='active'
      and m.role=any(p_roles)
  );
$$;

create or replace function public.organization_billing_access_allowed(
  p_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public,pg_catalog
as $$
  select coalesce((
    select
      case
        when o.status not in ('trial','active') then false
        when s.organization_id is null or s.provider<>'stripe' then true
        when s.status in ('active','trialing') then true
        when s.status='past_due'
          and s.grace_period_ends_at is not null
          and s.grace_period_ends_at>now() then true
        else false
      end
    from public.organizations o
    left join public.organization_subscriptions s on s.organization_id=o.id
    where o.id=p_organization_id
  ),false);
$$;

create or replace function public.organization_has_plan_feature(
  p_organization_id uuid,
  p_feature text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_business_type text;
  v_plan text;
  v_status text;
  v_metier_modules_configured boolean;
  v_features jsonb;
  v_module_key text;
begin
  if not public.organization_billing_access_allowed(p_organization_id) then
    return false;
  end if;

  select o.business_type,o.plan,o.status,
         coalesce(o.metier_modules_configured,false),d.features
  into v_business_type,v_plan,v_status,v_metier_modules_configured,v_features
  from public.organizations o
  left join public.domain_plan_catalog d
    on d.business_type=o.business_type
   and d.plan_key=o.plan
   and d.active=true
  where o.id=p_organization_id;

  if v_business_type is null or v_status not in ('trial','active') then
    return false;
  end if;

  if v_business_type='securite'
     and public.security_has_addon_feature(p_organization_id,p_feature) then
    return true;
  end if;
  if v_business_type='formation'
     and public.training_has_module_feature(p_organization_id,p_feature) then
    return true;
  end if;
  if not coalesce((v_features->>p_feature)::boolean,false) then return false; end if;

  if v_business_type='formation' and v_plan='metier'
     and v_metier_modules_configured then
    v_module_key:=case p_feature
      when 'training_programs' then 'training_programs'
      when 'training_trainees' then 'trainees'
      when 'training_trainers' then 'trainers'
      when 'training_sessions' then 'sessions'
      when 'training_documents' then 'documents'
      when 'training_blank_attendance' then 'attendance'
      when 'training_digital_attendance' then 'training_digital_attendance'
      when 'training_attendance_pdf' then 'training_digital_attendance'
      when 'training_automatic_certificates' then 'certificates'
      when 'commercial_branding' then 'commercial_branding'
      when 'training_document_branding' then 'commercial_branding'
      when 'training_email_branding' then 'commercial_branding'
      when 'training_satisfaction' then 'evaluations'
      when 'training_session_dossier' then 'training_session_dossier'
      when 'training_commercial' then 'training_commercial'
      when 'training_billing' then 'training_billing'
      when 'training_bpf' then 'training_bpf'
      when 'training_quality' then 'training_quality'
      when 'training_portals_signatures' then 'training_portals_signatures'
      when 'multi_site' then 'sites'
      when 'team_access' then 'team_access'
      when 'manager_role' then 'team_access'
      else null
    end;
    if v_module_key is not null then
      return exists (
        select 1 from public.organization_modules m
        where m.organization_id=p_organization_id
          and m.module_key=v_module_key
          and m.enabled=true
      );
    end if;
  end if;
  return true;
end;
$$;

create or replace function public.apply_organization_plan_defaults()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
begin
  -- Les valeurs initiales restent appliquees a la creation. Un changement
  -- de formule ne doit jamais ecraser une configuration premium conservee.
  if tg_op='INSERT' then
    if new.plan='decouverte' and new.booking_reminder_hours is null then
      new.booking_reminder_hours:=0;
    end if;
    if new.plan<>'metier' and new.show_ncr_branding is null then
      new.show_ncr_branding:=true;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public,pg_catalog
as $$
  select (
    exists (
      select 1
      from public.organization_members m
      where m.organization_id=p_organization_id
        and m.user_id=auth.uid()
        and m.status='active'
    )
    and public.organization_billing_access_allowed(p_organization_id)
  ) or public.has_active_support_access(p_organization_id);
$$;

create or replace function public.has_org_role(
  p_organization_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public,pg_catalog
as $$
  select (
    exists (
      select 1
      from public.organization_members m
      where m.organization_id=p_organization_id
        and m.user_id=auth.uid()
        and m.status='active'
        and m.role=any(p_roles)
    )
    and public.organization_billing_access_allowed(p_organization_id)
  ) or (
    public.has_active_support_access(p_organization_id)
    and p_roles && array['owner','admin','manager']::text[]
  );
$$;

create or replace function public.organization_billing_access_state(
  p_organization_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_org public.organizations%rowtype;
  v_sub public.organization_subscriptions%rowtype;
  v_allowed boolean;
  v_reason text;
begin
  if not public.is_org_member_any_status(p_organization_id)
     and not public.is_platform_admin() then
    raise exception 'Acces refuse.';
  end if;

  select * into v_org from public.organizations where id=p_organization_id;
  select * into v_sub from public.organization_subscriptions
  where organization_id=p_organization_id;
  if v_org.id is null then raise exception 'Entreprise introuvable.'; end if;

  v_allowed:=public.organization_billing_access_allowed(p_organization_id);
  v_reason:=case
    when v_org.status='closed' then 'closed'
    when v_sub.provider='stripe' and v_sub.status='paused'
      and v_sub.payment_confirmed_at is null then 'payment_required'
    when v_sub.status='past_due' and v_allowed then 'past_due_grace'
    when v_sub.status='past_due' then 'past_due_locked'
    when v_sub.status='canceled' then 'canceled'
    when v_org.status='suspended' then 'suspended'
    else 'active'
  end;

  return jsonb_build_object(
    'organization_id',p_organization_id,
    'access_allowed',v_allowed,
    'reason',v_reason,
    'subscription_status',v_sub.status,
    'scheduled_plan_key',v_sub.scheduled_plan_key,
    'scheduled_change_at',v_sub.scheduled_change_at,
    'cancel_at_period_end',v_sub.cancel_at_period_end,
    'current_period_end',v_sub.current_period_end,
    'payment_failed_at',v_sub.payment_failed_at,
    'grace_period_ends_at',v_sub.grace_period_ends_at,
    'data_retained',true,
    'data_retention_mode','preserve'
  );
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
  v_payment_required boolean:=true;
begin
  select public.domain_plan_price(new.business_type,new.plan) into v_price;
  select payment_required_before_access into v_payment_required
  from public.platform_billing_settings where singleton=true;

  insert into public.organization_subscriptions(
    organization_id,plan_key,status,provider,monthly_price_cents,
    current_period_start,data_retention_mode
  ) values (
    new.id,new.plan,
    case
      when new.status='trial' then 'trialing'
      when new.status='suspended' then 'paused'
      else 'active'
    end,
    case when coalesce(v_payment_required,true) then 'stripe' else 'manual' end,
    coalesce(v_price,0),
    case when new.status='active' then now() else null end,
    'preserve'
  )
  on conflict(organization_id) do nothing;
  return new;
end;
$$;

drop trigger if exists initialize_organization_subscription_trigger
  on public.organizations;
drop trigger if exists on_organization_created_subscription
  on public.organizations;
create trigger on_organization_created_subscription
after insert on public.organizations
for each row execute procedure public.initialize_organization_subscription();

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
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_requested_plan not in ('decouverte','essentielle','professionnelle','metier') then
    raise exception 'Formule invalide.';
  end if;

  if not public.is_platform_super_admin() then
    begin
      v_request_id:=nullif(auth.jwt()->'user_metadata'->>'access_request_id','')::uuid;
    exception when others then
      v_request_id:=null;
    end;

    select r.reference,r.requested_plan
    into v_request_reference,v_request_plan
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
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(v_slug) not between 2 and 80 then raise exception 'Identifiant invalide.'; end if;
  if v_business_type not in ('coiffure','nettoyage','securite','formation','restauration') then
    raise exception 'Metier non pris en charge.';
  end if;
  if p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Couleur invalide.'; end if;
  if not exists (
    select 1 from public.domain_plan_catalog
    where business_type=v_business_type and plan_key=p_requested_plan and active=true
  ) then raise exception 'Cette formule n est pas disponible pour ce metier.'; end if;
  if not exists (
    select 1
    from public.stripe_price_catalog c
    join public.platform_billing_settings bs
      on bs.singleton=true and bs.stripe_livemode=c.livemode
    where c.business_type=v_business_type
      and c.plan_key=p_requested_plan
      and c.active=true
  ) then raise exception 'Le tarif Stripe de cette formule doit etre configure avant l ouverture.';
  end if;

  insert into public.organizations(
    name,slug,business_type,plan,status,primary_color,created_by,
    onboarding_requested_plan
  ) values (
    v_name,v_slug,v_business_type,p_requested_plan,'suspended',
    p_primary_color,auth.uid(),p_requested_plan
  ) returning id into v_id;

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

  insert into public.audit_logs(
    organization_id,user_id,action,entity_type,entity_id,metadata
  ) values (
    v_id,auth.uid(),'organization.created_payment_required','organization',v_id::text,
    jsonb_build_object(
      'initial_plan',p_requested_plan,
      'access_request_reference',v_request_reference,
      'payment_required',true,
      'data_retention_mode','preserve'
    )
  );
  return v_id;
end;
$$;

create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_business_type text,
  p_primary_color text default '#2997ff'
)
returns uuid
language sql
security definer
set search_path = public,pg_catalog
as $$
  select public.create_organization(
    p_name,p_slug,p_business_type,p_primary_color,
    coalesce(nullif(auth.jwt()->'user_metadata'->>'requested_plan',''),'essentielle')
  );
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
begin
  if not public.has_org_role_any_status(p_organization_id,array['owner','admin']) then
    raise exception 'Seul le proprietaire ou un administrateur peut terminer la configuration.';
  end if;
  if p_requested_plan not in ('decouverte','essentielle','professionnelle','metier') then
    raise exception 'Formule souhaitee invalide.';
  end if;
  if not exists (
    select 1 from public.stripe_price_catalog c
    join public.organizations o on o.business_type=c.business_type
    join public.platform_billing_settings bs
      on bs.singleton=true and bs.stripe_livemode=c.livemode
    where o.id=p_organization_id
      and c.plan_key=p_requested_plan
      and c.active=true
  ) then raise exception 'Le tarif Stripe de cette formule n est pas configure.'; end if;
  if char_length(trim(coalesce(p_contact_name,'')))<2 then
    raise exception 'Le nom du contact principal est requis.';
  end if;
  if char_length(trim(coalesce(p_company_email,'')))<5
     or position('@' in p_company_email)=0 then
    raise exception 'L adresse e-mail de l entreprise est invalide.';
  end if;

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
      onboarding_checklist=jsonb_build_object(
        'identity',true,'business',true,'offer',true,'branding',true,'payment',false
      ),
      onboarding_completed_at=now(),
      status='suspended',
      updated_at=now()
  where id=p_organization_id;
  if not found then raise exception 'Entreprise introuvable.'; end if;

  update public.organization_subscriptions
  set plan_key=p_requested_plan,
      monthly_price_cents=public.domain_plan_price(
        (select business_type from public.organizations where id=p_organization_id),
        p_requested_plan
      ),
      status='paused',provider='stripe',data_retention_mode='preserve',updated_at=now()
  where organization_id=p_organization_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),'organization.onboarding_completed_payment_pending',
    'organization',p_organization_id::text,
    jsonb_build_object('requested_plan',p_requested_plan,'payment_required',true)
  );

  select jsonb_build_object(
    'organization_id',id,'status',onboarding_status,
    'requested_plan',onboarding_requested_plan,'payment_required',true,
    'completed_at',onboarding_completed_at
  ) into v_result
  from public.organizations where id=p_organization_id;
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
  if not public.has_org_role_any_status(p_organization_id,array['owner','admin']) then
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
  ) then raise exception 'Une demande de changement est deja en cours.'; end if;

  select o.plan,o.business_type,coalesce(s.status,'paused')
  into v_current_plan,v_business_type,v_subscription_status
  from public.organizations o
  left join public.organization_subscriptions s on s.organization_id=o.id
  where o.id=p_organization_id;
  if v_current_plan is null then raise exception 'Entreprise introuvable.'; end if;

  if not exists (
    select 1 from public.domain_plan_catalog
    where business_type=v_business_type and plan_key=p_requested_plan and active=true
  ) then raise exception 'Cette formule n est pas disponible pour ce domaine.'; end if;

  select terms_version into v_terms_version
  from public.platform_billing_settings where singleton=true;
  v_current_rank:=case v_current_plan
    when 'decouverte' then 1 when 'essentielle' then 2
    when 'professionnelle' then 3 else 4 end;
  v_requested_rank:=case p_requested_plan
    when 'decouverte' then 1 when 'essentielle' then 2
    when 'professionnelle' then 3 else 4 end;

  if p_requested_plan='metier' and v_current_plan<>'metier' then
    v_request_type:='metier';
  elsif p_requested_plan=v_current_plan then
    if v_subscription_status in ('past_due','paused','canceled') then
      v_request_type:='reactivation';
    else raise exception 'Cette formule est deja active.'; end if;
  elsif v_requested_rank>v_current_rank then v_request_type:='upgrade';
  else v_request_type:='downgrade';
  end if;

  if exists (
    select 1
    from public.stripe_price_catalog c
    join public.platform_billing_settings bs
      on bs.singleton=true and bs.stripe_livemode=c.livemode
    where c.business_type=v_business_type
      and c.plan_key=p_requested_plan
      and c.active=true
  ) then
    v_provider:='stripe';
    v_status:='payment_pending';
    v_checkout_url:=null;
  else
    raise exception 'Le tarif Stripe de cette formule n est pas encore configure.';
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
      'business_type',v_business_type,
      'data_retention_mode','preserve',
      'downgrade_at_period_end',v_request_type='downgrade'
    )
  );

  return jsonb_build_object(
    'id',v_request_id,'status',v_status,'provider',v_provider,
    'checkout_url',v_checkout_url,'reference',v_reference,
    'request_type',v_request_type,
    'data_retained',true
  );
end;
$$;

create or replace function public.organization_billing_portal(
  p_organization_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public,storage,pg_catalog
as $$
declare
  v_result jsonb;
  v_business_type text;
  v_business_label text;
  v_access_allowed boolean:=false;
  v_active_members integer:=0;
  v_member_limit integer:=1;
  v_clients integer:=0;
  v_services integer:=0;
  v_appointments_month integer:=0;
  v_training_trainees integer:=0;
  v_training_programs integer:=0;
  v_training_trainers integer:=0;
  v_training_sessions_month integer:=0;
  v_storage_bytes bigint:=0;
  v_usage_items jsonb:='[]'::jsonb;
begin
  if not public.is_org_member_any_status(p_organization_id)
     and not public.is_platform_admin() then
    raise exception 'Acces refuse.';
  end if;

  select o.business_type,coalesce(b.display_name,o.business_type),
         public.domain_plan_member_limit(o.business_type,o.plan),
         public.organization_billing_access_allowed(o.id)
  into v_business_type,v_business_label,v_member_limit,v_access_allowed
  from public.organizations o
  left join public.business_domain_catalog b
    on b.business_type=o.business_type and b.active=true
  where o.id=p_organization_id;

  if v_business_type is null then raise exception 'Entreprise introuvable.'; end if;

  if v_access_allowed then
    select count(*)::integer into v_active_members
    from public.organization_members
    where organization_id=p_organization_id and status='active';

    if v_business_type='formation' then
      select count(*)::integer into v_training_trainees
      from public.training_trainees
      where organization_id=p_organization_id and status='active';

      select count(*)::integer into v_training_programs
      from public.training_programs
      where organization_id=p_organization_id and status='active';

      select count(*)::integer into v_training_trainers
      from public.training_trainers
      where organization_id=p_organization_id and status='active';

      select count(*)::integer into v_training_sessions_month
      from public.training_sessions
      where organization_id=p_organization_id
        and starts_at>=date_trunc('month',now())
        and starts_at<date_trunc('month',now())+interval '1 month'
        and status<>'canceled';

      v_usage_items:=jsonb_build_array(
        jsonb_build_object('key','members','label','Utilisateurs','value',v_active_members::text||' / '||coalesce(v_member_limit,1)::text),
        jsonb_build_object('key','trainees','label','Stagiaires actifs','value',v_training_trainees),
        jsonb_build_object('key','programs','label','Formations actives','value',v_training_programs),
        jsonb_build_object('key','sessions','label','Sessions ce mois','value',v_training_sessions_month),
        jsonb_build_object('key','trainers','label','Formateurs actifs','value',v_training_trainers)
      );
    else
      select count(*)::integer into v_clients
      from public.clients where organization_id=p_organization_id;

      if to_regclass('public.services') is not null then
        select count(*)::integer into v_services
        from public.services
        where organization_id=p_organization_id and active=true;
      end if;

      if to_regclass('public.appointments') is not null then
        select count(*)::integer into v_appointments_month
        from public.appointments
        where organization_id=p_organization_id
          and starts_at>=date_trunc('month',now())
          and starts_at<date_trunc('month',now())+interval '1 month';
      end if;
    end if;

    if to_regclass('storage.objects') is not null then
      select coalesce(sum(
        case
          when metadata?'size' and (metadata->>'size')~'^[0-9]+$'
            then (metadata->>'size')::bigint
          else 0
        end
      ),0)
      into v_storage_bytes
      from storage.objects
      where bucket_id='organization-branding'
        and split_part(name,'/',1)=p_organization_id::text;
    end if;

    if v_business_type<>'formation' then
      v_usage_items:=jsonb_build_array(
        jsonb_build_object('key','members','label','Utilisateurs','value',v_active_members::text||' / '||coalesce(v_member_limit,1)::text),
        jsonb_build_object('key','clients','label','Clients','value',v_clients),
        jsonb_build_object('key','services','label','Prestations actives','value',v_services),
        jsonb_build_object('key','appointments','label','RDV ce mois','value',v_appointments_month),
        jsonb_build_object(
          'key','storage','label','Stockage identite',
          'value',case
            when v_storage_bytes<1024 then '0 Ko'
            when v_storage_bytes<1048576 then greatest(1,round(v_storage_bytes/1024.0))::text||' Ko'
            else round(v_storage_bytes/1048576.0,1)::text||' Mo'
          end
        )
      );
    end if;
  else
    v_usage_items:=jsonb_build_array(
      jsonb_build_object(
        'key','retention',
        'label','Donnees metier',
        'value','Conservees'
      )
    );
  end if;

  select jsonb_build_object(
    'business_type',o.business_type,
    'business_type_label',v_business_label,
    'access_allowed',v_access_allowed,
    'data_retained',true,
    'subscription',jsonb_build_object(
      'plan',o.plan,
      'plan_name',coalesce(dp.display_name,p.display_name),
      'organization_status',o.status,
      'subscription_status',coalesce(s.status,'paused'),
      'provider',coalesce(s.provider,'stripe'),
      'monthly_price_cents',coalesce(s.monthly_price_cents,dp.monthly_price_cents,p.monthly_price_cents),
      'trial_ends_at',s.trial_ends_at,
      'current_period_start',s.current_period_start,
      'current_period_end',s.current_period_end,
      'cancel_at_period_end',coalesce(s.cancel_at_period_end,false),
      'payment_confirmed_at',s.payment_confirmed_at,
      'scheduled_plan_key',s.scheduled_plan_key,
      'scheduled_change_at',s.scheduled_change_at,
      'payment_failed_at',s.payment_failed_at,
      'grace_period_ends_at',s.grace_period_ends_at,
      'access_restricted_at',s.access_restricted_at,
      'data_retention_mode',coalesce(s.data_retention_mode,'preserve'),
      'access_allowed',v_access_allowed,
      'data_retained',true
    ),
    'usage',jsonb_build_object(
      'active_members',v_active_members,
      'member_limit',coalesce(dp.member_limit,p.member_limit),
      'clients',v_clients,
      'active_services',v_services,
      'appointments_this_month',v_appointments_month,
      'storage_bytes',v_storage_bytes,
      'usage_items',v_usage_items,
      'available',v_access_allowed
    ),
    'plans',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'plan_key',pc.plan_key,
        'display_name',coalesce(dpc.display_name,pc.display_name),
        'monthly_price_cents',coalesce(dpc.monthly_price_cents,pc.monthly_price_cents),
        'member_limit',coalesce(dpc.member_limit,pc.member_limit),
        'features',coalesce(dpc.features,pc.features),
        'short_description',coalesce(dpc.short_description,pc.short_description),
        'sort_order',coalesce(dpc.sort_order,pc.sort_order),
        'recommended',coalesce(dpc.recommended,pc.plan_key='professionnelle'),
        'provider',case when sp.stripe_price_id is not null then 'stripe' else 'manual' end,
        'checkout_url',null,
        'checkout_active',sp.stripe_price_id is not null
      ) order by coalesce(dpc.sort_order,pc.sort_order)),'[]'::jsonb)
      from public.plan_catalog pc
      left join public.domain_plan_catalog dpc
        on dpc.business_type=o.business_type and dpc.plan_key=pc.plan_key
      left join public.domain_billing_plan_links dbl
        on dbl.business_type=o.business_type and dbl.plan_key=pc.plan_key
      left join public.billing_plan_links bl on bl.plan_key=pc.plan_key
      cross join public.platform_billing_settings bs
      left join public.stripe_price_catalog sp
        on sp.business_type=o.business_type
       and sp.plan_key=pc.plan_key
       and sp.livemode=bs.stripe_livemode
       and sp.active=true
      where pc.active=true
        and bs.singleton=true
        and coalesce(dpc.active,true)=true
    ),
    'open_request',(
      select to_jsonb(r)
      from (
        select id,current_plan,requested_plan,request_type,status,provider,
               request_reference,checkout_url_snapshot,created_at,
               effective_at,stripe_schedule_id
        from public.subscription_change_requests
        where organization_id=p_organization_id
          and status in ('payment_pending','pending_review')
        order by created_at desc
        limit 1
      ) r
    ),
    'history',(
      select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc),'[]'::jsonb)
      from (
        select event_type,from_plan,to_plan,metadata,created_at
        from public.subscription_events
        where organization_id=p_organization_id
        order by created_at desc
        limit 20
      ) e
    ),
    'terms',(
      select jsonb_build_object(
        'version',terms_version,
        'text',terms_text,
        'cancellation_text',cancellation_text
      )
      from public.platform_billing_settings
      where singleton=true
    )
  ) into v_result
  from public.organizations o
  join public.plan_catalog p on p.plan_key=o.plan
  left join public.domain_plan_catalog dp
    on dp.business_type=o.business_type and dp.plan_key=o.plan and dp.active=true
  left join public.organization_subscriptions s on s.organization_id=o.id
  where o.id=p_organization_id;

  return v_result;
end;
$$;

create or replace function public.admin_list_subscription_requests(
  p_status text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Acces administrateur NCR requis.';
  end if;

  select coalesce(jsonb_agg(item order by created_at desc),'[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id',r.id,
      'organization_id',r.organization_id,
      'organization_name',o.name,
      'owner_email',owner_data.email,
      'current_plan',r.current_plan,
      'requested_plan',r.requested_plan,
      'request_type',r.request_type,
      'status',r.status,
      'provider',r.provider,
      'request_reference',r.request_reference,
      'provider_payment_reference',r.provider_payment_reference,
      'created_at',r.created_at,
      'effective_at',r.effective_at,
      'stripe_schedule_id',r.stripe_schedule_id,
      'review_note',r.review_note,
      'data_retained',true
    ) as item,
    r.created_at
    from public.subscription_change_requests r
    join public.organizations o on o.id=r.organization_id
    left join lateral (
      select u.email::text as email
      from public.organization_members m
      join auth.users u on u.id=m.user_id
      where m.organization_id=o.id and m.role='owner'
      order by m.created_at
      limit 1
    ) owner_data on true
    where p_status is null or p_status='' or r.status=p_status
  ) rows;
  return v_result;
end;
$$;

create or replace function public.admin_update_stripe_catalog_item(
  p_item_type text,
  p_business_type text,
  p_item_key text,
  p_stripe_price_id text,
  p_livemode boolean,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_price_id text:=nullif(trim(coalesce(p_stripe_price_id,'')),'');
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut configurer Stripe.';
  end if;
  if p_item_type not in ('plan','training_module','security_addon') then
    raise exception 'Type de tarif Stripe invalide.';
  end if;
  if coalesce(p_active,false) and v_price_id is null then
    raise exception 'Le Price ID Stripe est requis pour activer ce tarif.';
  end if;
  if v_price_id is not null and v_price_id !~ '^price_[A-Za-z0-9]+$' then
    raise exception 'Le Price ID Stripe doit commencer par price_.';
  end if;

  if p_item_type='plan' then
    if not exists (
      select 1 from public.domain_plan_catalog
      where business_type=p_business_type and plan_key=p_item_key and active=true
    ) then raise exception 'Formule ou domaine invalide.'; end if;
    if v_price_id is null then
      delete from public.stripe_price_catalog
      where business_type=p_business_type and plan_key=p_item_key
        and livemode=coalesce(p_livemode,false);
    else
      insert into public.stripe_price_catalog(
        business_type,plan_key,stripe_price_id,livemode,active
      ) values (
        p_business_type,p_item_key,v_price_id,coalesce(p_livemode,false),coalesce(p_active,false)
      ) on conflict(business_type,plan_key,livemode) do update
      set stripe_price_id=excluded.stripe_price_id,
          active=excluded.active,updated_at=now();
    end if;
    insert into public.domain_billing_plan_links(
      business_type,plan_key,provider,checkout_url,active,updated_by
    ) values (
      p_business_type,p_item_key,'stripe',null,coalesce(p_active,false),auth.uid()
    ) on conflict(business_type,plan_key) do update
    set provider='stripe',checkout_url=null,active=excluded.active,
        updated_by=auth.uid(),updated_at=now();
  else
    if p_item_type='training_module' and not exists (
      select 1 from public.training_module_catalog
      where module_key=p_item_key and active=true
    ) then raise exception 'Module Formation invalide.'; end if;
    if p_item_type='security_addon' and not exists (
      select 1 from public.security_addon_catalog
      where addon_key=p_item_key and active=true
    ) then raise exception 'Module Securite invalide.'; end if;

    if v_price_id is null then
      delete from public.stripe_addon_price_catalog
      where item_type=p_item_type and item_key=p_item_key
        and livemode=coalesce(p_livemode,false);
    else
      insert into public.stripe_addon_price_catalog(
        item_type,item_key,stripe_price_id,livemode,active
      ) values (
        p_item_type,p_item_key,v_price_id,coalesce(p_livemode,false),coalesce(p_active,false)
      ) on conflict(item_type,item_key,livemode) do update
      set stripe_price_id=excluded.stripe_price_id,
          active=excluded.active,updated_at=now();
    end if;

    if p_item_type='training_module' then
      insert into public.training_module_billing_links(
        module_key,provider,checkout_url,active,updated_by
      ) values (
        p_item_key,'stripe',null,coalesce(p_active,false),auth.uid()
      ) on conflict(module_key) do update
      set provider='stripe',checkout_url=null,active=excluded.active,
          updated_by=auth.uid(),updated_at=now();
    else
      insert into public.security_addon_billing_links(
        addon_key,provider,checkout_url,active,updated_by
      ) values (
        p_item_key,'stripe',null,coalesce(p_active,false),auth.uid()
      ) on conflict(addon_key) do update
      set provider='stripe',checkout_url=null,active=excluded.active,
          updated_by=auth.uid(),updated_at=now();
    end if;
  end if;

  insert into public.audit_logs(
    organization_id,user_id,action,entity_type,entity_id,metadata
  ) values (
    null,auth.uid(),'billing.stripe_catalog_updated','stripe_catalog',
    p_item_type||':'||coalesce(p_business_type,'')||':'||p_item_key,
    jsonb_build_object(
      'item_type',p_item_type,'business_type',p_business_type,
      'item_key',p_item_key,'livemode',coalesce(p_livemode,false),
      'active',coalesce(p_active,false)
    )
  );
end;
$$;

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
      default_trial_days=0,
      stripe_livemode=coalesce(p_stripe_livemode,false),
      grace_period_days=p_grace_period_days,
      payment_required_before_access=coalesce(p_payment_required_before_access,true),
      downgrade_at_period_end=coalesce(p_downgrade_at_period_end,true),
      terms_version=trim(p_terms_version),
      terms_text=trim(p_terms_text),
      cancellation_text=trim(p_cancellation_text),
      qonto_exceptional_payment_url=v_qonto_url,
      qonto_exceptional_instructions=left(
        trim(coalesce(p_qonto_exceptional_instructions,'')),3000
      ),
      updated_by=auth.uid(),updated_at=now()
  where singleton=true;
end;
$$;

create or replace function public.admin_billing_configuration()
returns jsonb
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Acces administrateur NCR requis.'; end if;
  select jsonb_build_object(
    'settings',(
      select jsonb_build_object(
        'default_provider','stripe',
        'default_trial_days',0,
        'default_trial_plan',default_trial_plan,
        'terms_version',terms_version,
        'terms_text',terms_text,
        'cancellation_text',cancellation_text,
        'stripe_livemode',stripe_livemode,
        'grace_period_days',grace_period_days,
        'payment_required_before_access',payment_required_before_access,
        'downgrade_at_period_end',downgrade_at_period_end,
        'qonto_exceptional_payment_url',qonto_exceptional_payment_url,
        'qonto_exceptional_instructions',qonto_exceptional_instructions
      ) from public.platform_billing_settings where singleton=true
    ),
    'domains',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'business_type',d.business_type,
        'display_name',coalesce(b.display_name,d.business_type)
      ) order by coalesce(b.display_name,d.business_type)),'[]'::jsonb)
      from (select distinct business_type from public.domain_plan_catalog where active=true) d
      left join public.business_domain_catalog b
        on b.business_type=d.business_type and b.active=true
    ),
    'plans',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'business_type',p.business_type,
        'business_type_label',coalesce(b.display_name,p.business_type),
        'plan_key',p.plan_key,'display_name',p.display_name,
        'monthly_price_cents',p.monthly_price_cents,
        'member_limit',p.member_limit,
        'provider',coalesce(l.provider,'stripe'),
        'checkout_url',l.checkout_url,
        'active',coalesce(l.active,false),
        'sort_order',p.sort_order,'recommended',p.recommended,
        'stripe_price_id',sp.stripe_price_id,
        'stripe_livemode',bs.stripe_livemode
      ) order by coalesce(b.display_name,p.business_type),p.sort_order),'[]'::jsonb)
      from public.domain_plan_catalog p
      cross join public.platform_billing_settings bs
      left join public.domain_billing_plan_links l
        on l.business_type=p.business_type and l.plan_key=p.plan_key
      left join public.stripe_price_catalog sp
        on sp.business_type=p.business_type and sp.plan_key=p.plan_key
       and sp.livemode=bs.stripe_livemode
      left join public.business_domain_catalog b
        on b.business_type=p.business_type and b.active=true
      where p.active=true
    )
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.admin_training_module_configuration()
returns jsonb
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Acces administrateur NCR requis.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'module_key',c.module_key,'display_name',c.display_name,
    'short_description',c.short_description,
    'monthly_price_cents',c.monthly_price_cents,
    'available_plans',c.available_plans,
    'provider',coalesce(l.provider,'stripe'),
    'checkout_url',l.checkout_url,
    'checkout_active',coalesce(l.active,false),
    'sort_order',c.sort_order,
    'stripe_price_id',sp.stripe_price_id,
    'stripe_livemode',bs.stripe_livemode
  ) order by c.sort_order),'[]'::jsonb)
  into v_result
  from public.training_module_catalog c
  cross join public.platform_billing_settings bs
  left join public.training_module_billing_links l on l.module_key=c.module_key
  left join public.stripe_addon_price_catalog sp
    on sp.item_type='training_module' and sp.item_key=c.module_key
   and sp.livemode=bs.stripe_livemode
  where c.active=true;
  return jsonb_build_object('modules',v_result);
end;
$$;

create or replace function public.admin_security_addon_configuration()
returns jsonb
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Acces administrateur NCR requis.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'addon_key',c.addon_key,'display_name',c.display_name,
    'short_description',c.short_description,
    'monthly_price_cents',c.monthly_price_cents,
    'available_plans',c.available_plans,
    'provider',coalesce(l.provider,'stripe'),
    'checkout_url',l.checkout_url,
    'checkout_active',coalesce(l.active,false),
    'sort_order',c.sort_order,
    'stripe_price_id',sp.stripe_price_id,
    'stripe_livemode',bs.stripe_livemode
  ) order by c.sort_order),'[]'::jsonb)
  into v_result
  from public.security_addon_catalog c
  cross join public.platform_billing_settings bs
  left join public.security_addon_billing_links l on l.addon_key=c.addon_key
  left join public.stripe_addon_price_catalog sp
    on sp.item_type='security_addon' and sp.item_key=c.addon_key
   and sp.livemode=bs.stripe_livemode
  where c.active=true;
  return jsonb_build_object('addons',v_result);
end;
$$;

create or replace function public.request_stripe_addon_change(
  p_organization_id uuid,
  p_item_type text,
  p_item_key text,
  p_action text,
  p_accept_terms boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_org public.organizations%rowtype;
  v_terms_version text;
  v_request_id uuid;
  v_reference text;
  v_dependency text;
  v_available_plans text[];
  v_feature_keys text[];
begin
  if not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Seul le proprietaire ou un administrateur peut gerer les modules.';
  end if;
  if not coalesce(p_accept_terms,false) then
    raise exception 'Vous devez accepter les conditions d abonnement.';
  end if;
  if p_item_type not in ('training_module','security_addon')
     or p_action not in ('add','remove') then raise exception 'Demande invalide.'; end if;
  select * into v_org from public.organizations where id=p_organization_id;
  if v_org.id is null or (
    (p_item_type='training_module' and v_org.business_type<>'formation')
    or (p_item_type='security_addon' and v_org.business_type<>'securite')
  ) then raise exception 'Module incompatible avec cette entreprise.'; end if;
  if not exists (
    select 1
    from public.stripe_addon_price_catalog c
    join public.platform_billing_settings bs
      on bs.singleton=true and bs.stripe_livemode=c.livemode
    where c.item_type=p_item_type
      and c.item_key=p_item_key
      and c.active=true
  ) then raise exception 'Le tarif Stripe de ce module n est pas configure.'; end if;

  if p_item_type='training_module' then
    select available_plans,feature_keys into v_available_plans,v_feature_keys
    from public.training_module_catalog where module_key=p_item_key and active=true;
    if v_available_plans is null then raise exception 'Module Formation introuvable.'; end if;
    if exists (
      select 1 from public.training_module_change_requests
      where organization_id=p_organization_id and module_key=p_item_key
        and status in ('payment_pending','pending_review')
    ) then raise exception 'Une demande est deja en cours pour ce module.'; end if;
    if p_action='add' then
      if not (v_org.plan=any(v_available_plans)) then
        raise exception 'Ce module n est pas disponible avec votre formule actuelle.';
      end if;
      if public.training_has_active_module(p_organization_id,p_item_key) then
        raise exception 'Ce module est deja actif.';
      end if;
      for v_dependency in
        select unnest(prerequisite_modules)
        from public.training_module_catalog where module_key=p_item_key
      loop
        if not public.training_module_is_effective(p_organization_id,v_dependency) then
          raise exception 'Un module requis doit etre active avant celui-ci.';
        end if;
      end loop;
    else
      if not public.training_has_active_module(p_organization_id,p_item_key) then
        raise exception 'Ce module n est pas actif.';
      end if;
      if exists (
        select 1
        from public.organization_training_modules m
        join public.training_module_catalog c on c.module_key=m.module_key
        where m.organization_id=p_organization_id and m.status='active'
          and p_item_key=any(c.prerequisite_modules)
      ) then raise exception 'Desactivez d abord les modules dependants.'; end if;
    end if;
    v_reference:='NCR-FORM-STRIPE-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    select terms_version into v_terms_version from public.platform_billing_settings where singleton=true;
    insert into public.training_module_change_requests(
      organization_id,module_key,action,status,provider,checkout_url_snapshot,
      request_reference,accepted_terms_at,terms_version,requested_by
    ) values (
      p_organization_id,p_item_key,p_action,'payment_pending','stripe',null,
      v_reference,now(),coalesce(v_terms_version,'initial'),auth.uid()
    ) returning id into v_request_id;
  else
    select available_plans,feature_keys into v_available_plans,v_feature_keys
    from public.security_addon_catalog where addon_key=p_item_key and active=true;
    if v_available_plans is null then raise exception 'Module Securite introuvable.'; end if;
    if exists (
      select 1 from public.security_addon_change_requests
      where organization_id=p_organization_id and addon_key=p_item_key
        and status in ('payment_pending','pending_review')
    ) then raise exception 'Une demande est deja en cours pour ce module.'; end if;
    if p_action='add' then
      if not (v_org.plan=any(v_available_plans)) then
        raise exception 'Ce module n est pas disponible avec votre formule actuelle.';
      end if;
      if public.security_has_active_addon(p_organization_id,p_item_key) then
        raise exception 'Ce module est deja actif.';
      end if;
      for v_dependency in
        select unnest(prerequisite_addons)
        from public.security_addon_catalog where addon_key=p_item_key
      loop
        if not public.security_has_active_addon(p_organization_id,v_dependency) then
          raise exception 'Un module requis doit etre active avant celui-ci.';
        end if;
      end loop;
    else
      if not public.security_has_active_addon(p_organization_id,p_item_key) then
        raise exception 'Ce module n est pas actif.';
      end if;
      if exists (
        select 1
        from public.organization_security_addons a
        join public.security_addon_catalog c on c.addon_key=a.addon_key
        where a.organization_id=p_organization_id and a.status='active'
          and p_item_key=any(c.prerequisite_addons)
      ) then raise exception 'Desactivez d abord les modules dependants.'; end if;
    end if;
    v_reference:='NCR-SEC-STRIPE-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    select terms_version into v_terms_version from public.platform_billing_settings where singleton=true;
    insert into public.security_addon_change_requests(
      organization_id,addon_key,action,status,provider,checkout_url_snapshot,
      request_reference,accepted_terms_at,terms_version,requested_by
    ) values (
      p_organization_id,p_item_key,p_action,'payment_pending','stripe',null,
      v_reference,now(),coalesce(v_terms_version,'initial'),auth.uid()
    ) returning id into v_request_id;
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),'billing.stripe_addon_change_requested',
    p_item_type,v_request_id::text,
    jsonb_build_object(
      'item_key',p_item_key,'request_action',p_action,
      'reference',v_reference,'data_retention_mode','preserve'
    )
  );
  return jsonb_build_object(
    'id',v_request_id,'status','payment_pending','provider','stripe',
    'reference',v_reference,'data_retained',true
  );
end;
$$;

create or replace function public.record_stripe_scheduled_plan_change(
  p_organization_id uuid,
  p_request_id uuid,
  p_schedule_id text,
  p_plan_key text,
  p_effective_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
begin
  if current_user<>'service_role' and coalesce(auth.role(),'')<>'service_role' then
    raise exception 'Acces service Stripe requis.';
  end if;
  if p_plan_key not in ('decouverte','essentielle','professionnelle','metier')
     or p_effective_at is null then raise exception 'Changement programme invalide.'; end if;
  update public.organization_subscriptions
  set scheduled_plan_key=p_plan_key,
      scheduled_change_at=p_effective_at,
      stripe_schedule_id=nullif(trim(coalesce(p_schedule_id,'')),''),
      data_retention_mode='preserve',updated_at=now()
  where organization_id=p_organization_id;
  update public.subscription_change_requests
  set effective_at=p_effective_at,
      stripe_schedule_id=nullif(trim(coalesce(p_schedule_id,'')),''),
      updated_at=now()
  where id=p_request_id and organization_id=p_organization_id
    and status='payment_pending' and provider='stripe';
  insert into public.subscription_data_retention_events(
    organization_id,event_type,previous_plan,next_plan,effective_at,metadata
  )
  select p_organization_id,'plan_change_scheduled',o.plan,p_plan_key,p_effective_at,
    jsonb_build_object('stripe_schedule_id',p_schedule_id,'request_id',p_request_id)
  from public.organizations o where o.id=p_organization_id;
end;
$$;

create or replace function public.apply_stripe_lifecycle_state(
  p_organization_id uuid,
  p_event_type text,
  p_app_status text,
  p_plan_key text,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns void
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_grace_days integer:=7;
  v_previous_status text;
  v_had_restriction boolean:=false;
begin
  if current_user<>'service_role' and coalesce(auth.role(),'')<>'service_role' then
    raise exception 'Acces service Stripe requis.';
  end if;
  select grace_period_days into v_grace_days
  from public.platform_billing_settings where singleton=true;
  select status,(payment_failed_at is not null or access_restricted_at is not null)
  into v_previous_status,v_had_restriction
  from public.organization_subscriptions where organization_id=p_organization_id;

  if p_event_type='invoice.payment_failed' then
    update public.organization_subscriptions
    set payment_failed_at=coalesce(payment_failed_at,now()),
        grace_period_ends_at=coalesce(
          grace_period_ends_at,
          now()+make_interval(days=>coalesce(v_grace_days,7))
        ),
        access_restricted_at=null,data_retention_mode='preserve',updated_at=now()
    where organization_id=p_organization_id;
  elsif p_event_type in ('invoice.paid','checkout.session.completed')
        or p_app_status in ('active','trialing') then
    update public.organization_subscriptions
    set payment_failed_at=null,grace_period_ends_at=null,access_restricted_at=null,
        scheduled_plan_key=case when scheduled_plan_key=p_plan_key then null else scheduled_plan_key end,
        scheduled_change_at=case when scheduled_plan_key=p_plan_key then null else scheduled_change_at end,
        stripe_schedule_id=case when scheduled_plan_key=p_plan_key then null else stripe_schedule_id end,
        cancel_at_period_end=coalesce(p_cancel_at_period_end,false),
        data_retention_mode='preserve',updated_at=now()
    where organization_id=p_organization_id;
    update public.organizations set status='active',updated_at=now()
    where id=p_organization_id and status='suspended';
    if v_had_restriction or v_previous_status in ('past_due','paused','canceled') then
      insert into public.subscription_data_retention_events(
        organization_id,event_type,previous_plan,next_plan,effective_at,metadata
      ) values (
        p_organization_id,'access_restored',p_plan_key,p_plan_key,now(),
        jsonb_build_object('event_type',p_event_type)
      );
    end if;
  end if;

  if p_app_status in ('paused','canceled') then
    update public.organization_subscriptions
    set access_restricted_at=coalesce(access_restricted_at,now()),
        data_retention_mode='preserve',updated_at=now()
    where organization_id=p_organization_id;
    update public.organizations set status='suspended',updated_at=now()
    where id=p_organization_id and status<>'closed';
    insert into public.subscription_data_retention_events(
      organization_id,event_type,previous_plan,next_plan,effective_at,metadata
    ) values (
      p_organization_id,
      case when p_app_status='canceled' then 'subscription_canceled'
        else 'payment_access_restricted' end,
      p_plan_key,p_plan_key,coalesce(p_period_end,now()),
      jsonb_build_object('event_type',p_event_type,'data_retained',true)
    );
  end if;
end;
$$;

create or replace function public.reconcile_stripe_subscription_items(
  p_organization_id uuid,
  p_subscription_id text,
  p_items jsonb,
  p_livemode boolean,
  p_event_reference text
)
returns void
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_item record;
  v_mapping record;
  v_plan text;
  v_business_type text;
begin
  if current_user<>'service_role' and coalesce(auth.role(),'')<>'service_role' then
    raise exception 'Acces service Stripe requis.';
  end if;
  select plan,business_type into v_plan,v_business_type
  from public.organizations where id=p_organization_id;
  if v_plan is null then raise exception 'Entreprise introuvable.'; end if;

  if v_business_type='formation' then
    update public.organization_training_modules m
    set status='inactive',deactivated_at=coalesce(m.deactivated_at,now()),updated_at=now()
    where m.organization_id=p_organization_id
      and m.provider='stripe'
      and not exists (
        select 1
        from jsonb_to_recordset(coalesce(p_items,'[]'::jsonb))
          as i(subscription_item_id text,price_id text)
        where i.subscription_item_id=m.stripe_subscription_item_id
      );
  elsif v_business_type='securite' then
    update public.organization_security_addons a
    set status='inactive',deactivated_at=coalesce(a.deactivated_at,now()),updated_at=now()
    where a.organization_id=p_organization_id
      and a.provider='stripe'
      and not exists (
        select 1
        from jsonb_to_recordset(coalesce(p_items,'[]'::jsonb))
          as i(subscription_item_id text,price_id text)
        where i.subscription_item_id=a.stripe_subscription_item_id
      );
  end if;

  for v_item in
    select * from jsonb_to_recordset(coalesce(p_items,'[]'::jsonb))
      as i(subscription_item_id text,price_id text)
  loop
    select c.item_type,c.item_key into v_mapping
    from public.stripe_addon_price_catalog c
    where c.stripe_price_id=v_item.price_id
      and c.livemode=coalesce(p_livemode,false)
      and c.active=true;
    if v_mapping.item_type='training_module' and v_business_type='formation'
       and exists (
         select 1 from public.training_module_catalog c
         where c.module_key=v_mapping.item_key
           and v_plan=any(c.available_plans)
       ) then
      insert into public.organization_training_modules(
        organization_id,module_key,status,monthly_price_cents_snapshot,
        provider,provider_payment_reference,stripe_subscription_item_id,
        activated_at,deactivated_at,updated_at
      )
      select p_organization_id,c.module_key,'active',c.monthly_price_cents,
        'stripe',p_subscription_id,v_item.subscription_item_id,now(),null,now()
      from public.training_module_catalog c where c.module_key=v_mapping.item_key
      on conflict(organization_id,module_key) do update
      set status='active',provider='stripe',
          provider_payment_reference=excluded.provider_payment_reference,
          stripe_subscription_item_id=excluded.stripe_subscription_item_id,
          activated_at=now(),deactivated_at=null,updated_at=now();
      update public.training_module_change_requests
      set status='approved',provider_payment_reference=p_subscription_id,
          stripe_subscription_item_id=v_item.subscription_item_id,
          reviewed_at=coalesce(reviewed_at,now()),
          review_note=coalesce(review_note,'Validation automatique Stripe'),
          updated_at=now()
      where organization_id=p_organization_id
        and module_key=v_mapping.item_key and action='add'
        and status='payment_pending' and provider='stripe';
    elsif v_mapping.item_type='security_addon' and v_business_type='securite'
       and exists (
         select 1 from public.security_addon_catalog c
         where c.addon_key=v_mapping.item_key
           and v_plan=any(c.available_plans)
       ) then
      insert into public.organization_security_addons(
        organization_id,addon_key,status,monthly_price_cents_snapshot,
        provider,provider_payment_reference,stripe_subscription_item_id,
        activated_at,deactivated_at,updated_at
      )
      select p_organization_id,c.addon_key,'active',c.monthly_price_cents,
        'stripe',p_subscription_id,v_item.subscription_item_id,now(),null,now()
      from public.security_addon_catalog c where c.addon_key=v_mapping.item_key
      on conflict(organization_id,addon_key) do update
      set status='active',provider='stripe',
          provider_payment_reference=excluded.provider_payment_reference,
          stripe_subscription_item_id=excluded.stripe_subscription_item_id,
          activated_at=now(),deactivated_at=null,updated_at=now();
      update public.security_addon_change_requests
      set status='approved',provider_payment_reference=p_subscription_id,
          stripe_subscription_item_id=v_item.subscription_item_id,
          reviewed_at=coalesce(reviewed_at,now()),
          review_note=coalesce(review_note,'Validation automatique Stripe'),
          updated_at=now()
      where organization_id=p_organization_id
        and addon_key=v_mapping.item_key and action='add'
        and status='payment_pending' and provider='stripe';
    end if;
  end loop;

  if v_business_type='formation' then
    perform public.sync_training_module_access(p_organization_id);
  elsif v_business_type='securite' then
    perform public.sync_security_addon_modules(p_organization_id);
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,null,'billing.stripe_items_reconciled',
    'organization_subscription',p_subscription_id,
    jsonb_build_object(
      'event_reference',p_event_reference,
      'item_count',jsonb_array_length(coalesce(p_items,'[]'::jsonb)),
      'data_retention_mode','preserve'
    )
  );
end;
$$;

create or replace function public.complete_stripe_addon_removal(
  p_organization_id uuid,
  p_item_type text,
  p_request_id uuid,
  p_subscription_item_id text
)
returns void
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_item_key text;
begin
  if current_user<>'service_role' and coalesce(auth.role(),'')<>'service_role' then
    raise exception 'Acces service Stripe requis.';
  end if;
  if p_item_type='training_module' then
    update public.training_module_change_requests
    set status='approved',provider_payment_reference=p_subscription_item_id,
        stripe_subscription_item_id=p_subscription_item_id,
        effective_at=now(),reviewed_at=coalesce(reviewed_at,now()),
        review_note=coalesce(review_note,'Retrait automatique Stripe'),
        updated_at=now()
    where id=p_request_id and organization_id=p_organization_id
      and action='remove' and status='payment_pending' and provider='stripe'
    returning module_key into v_item_key;
    if v_item_key is null then raise exception 'Demande de retrait introuvable.'; end if;
    update public.organization_training_modules
    set status='inactive',deactivated_at=now(),updated_at=now()
    where organization_id=p_organization_id and module_key=v_item_key;
    perform public.sync_training_module_access(p_organization_id);
  elsif p_item_type='security_addon' then
    update public.security_addon_change_requests
    set status='approved',provider_payment_reference=p_subscription_item_id,
        stripe_subscription_item_id=p_subscription_item_id,
        effective_at=now(),reviewed_at=coalesce(reviewed_at,now()),
        review_note=coalesce(review_note,'Retrait automatique Stripe'),
        updated_at=now()
    where id=p_request_id and organization_id=p_organization_id
      and action='remove' and status='payment_pending' and provider='stripe'
    returning addon_key into v_item_key;
    if v_item_key is null then raise exception 'Demande de retrait introuvable.'; end if;
    update public.organization_security_addons
    set status='inactive',deactivated_at=now(),updated_at=now()
    where organization_id=p_organization_id and addon_key=v_item_key;
    perform public.sync_security_addon_modules(p_organization_id);
  else raise exception 'Type de module invalide.';
  end if;

  insert into public.subscription_data_retention_events(
    organization_id,event_type,previous_plan,next_plan,effective_at,metadata
  )
  select p_organization_id,'addon_removed',o.plan,o.plan,now(),
    jsonb_build_object(
      'item_type',p_item_type,'item_key',v_item_key,
      'stripe_subscription_item_id',p_subscription_item_id,
      'data_retained',true
    )
  from public.organizations o where o.id=p_organization_id;
end;
$$;

create or replace function public.audit_plan_change_data_retention()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
begin
  if old.plan is distinct from new.plan then
    insert into public.subscription_data_retention_events(
      organization_id,event_type,previous_plan,next_plan,effective_at,metadata
    ) values (
      new.id,'plan_changed',old.plan,new.plan,now(),
      jsonb_build_object(
        'data_retained',true,
        'policy','Les droits changent sans suppression des donnees metier.'
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_plan_change_data_retention_trigger
  on public.organizations;
create trigger audit_plan_change_data_retention_trigger
after update of plan on public.organizations
for each row execute procedure public.audit_plan_change_data_retention();

revoke all on function public.has_org_role_any_status(uuid,text[]) from public,anon;
revoke all on function public.organization_billing_access_allowed(uuid) from public,anon;
revoke all on function public.organization_has_plan_feature(uuid,text) from public,anon;
revoke all on function public.apply_organization_plan_defaults() from public,anon,authenticated;
revoke all on function public.organization_billing_access_state(uuid) from public,anon;
revoke all on function public.organization_billing_portal(uuid) from public,anon;
revoke all on function public.admin_list_subscription_requests(text) from public,anon;
revoke all on function public.create_organization(text,text,text,text,text) from public,anon;
revoke all on function public.request_subscription_change(uuid,text,boolean) from public,anon;
revoke all on function public.admin_update_stripe_catalog_item(text,text,text,text,boolean,boolean) from public,anon;
revoke all on function public.admin_update_billing_settings_v2(boolean,integer,boolean,boolean,text,text,text,text,text) from public,anon;
revoke all on function public.request_stripe_addon_change(uuid,text,text,text,boolean) from public,anon;
revoke all on function public.record_stripe_scheduled_plan_change(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.apply_stripe_lifecycle_state(uuid,text,text,text,timestamptz,boolean) from public,anon,authenticated;
revoke all on function public.reconcile_stripe_subscription_items(uuid,text,jsonb,boolean,text) from public,anon,authenticated;
revoke all on function public.complete_stripe_addon_removal(uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.audit_plan_change_data_retention() from public,anon,authenticated;

grant execute on function public.has_org_role_any_status(uuid,text[]) to authenticated;
grant execute on function public.organization_billing_access_allowed(uuid) to authenticated;
grant execute on function public.organization_has_plan_feature(uuid,text) to authenticated,service_role;
grant execute on function public.organization_billing_access_state(uuid) to authenticated;
grant execute on function public.organization_billing_portal(uuid) to authenticated;
grant execute on function public.admin_list_subscription_requests(text) to authenticated;
grant execute on function public.create_organization(text,text,text,text,text) to authenticated;
grant execute on function public.request_subscription_change(uuid,text,boolean) to authenticated;
grant execute on function public.admin_update_stripe_catalog_item(text,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.admin_update_billing_settings_v2(boolean,integer,boolean,boolean,text,text,text,text,text) to authenticated;
grant execute on function public.request_stripe_addon_change(uuid,text,text,text,boolean) to authenticated;
grant execute on function public.record_stripe_scheduled_plan_change(uuid,uuid,text,text,timestamptz) to service_role;
grant execute on function public.apply_stripe_lifecycle_state(uuid,text,text,text,timestamptz,boolean) to service_role;
grant execute on function public.reconcile_stripe_subscription_items(uuid,text,jsonb,boolean,text) to service_role;
grant execute on function public.complete_stripe_addon_removal(uuid,text,uuid,text) to service_role;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.26.0','2.26.0','ncr-suite-shell-v2.26.0-stripe-billing',
  now(),auth.uid(),
  'V2.26.0 : catalogue Stripe administrable, activation payante, retrogradations programmees, grace impayes et conservation garantie des donnees.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
