-- NCR Suite V2.4.2 — tarifs et offres distincts par domaine métier
-- À exécuter après 018_admin_create_organization_space.sql.
-- Les quatre niveaux restent identiques dans toute la plateforme, mais les prix,
-- descriptions, fonctions affichées et liens Qonto dépendent du domaine de l’espace.

begin;

create table if not exists public.domain_plan_catalog (
  business_type text not null check (business_type in ('coiffure','nettoyage','securite','formation','artisan')),
  plan_key text not null references public.plan_catalog(plan_key) on delete cascade,
  display_name text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  member_limit integer not null check (member_limit >= 1),
  features jsonb not null default '{}'::jsonb,
  short_description text,
  sort_order integer not null default 0,
  recommended boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_type, plan_key)
);

create table if not exists public.domain_billing_plan_links (
  business_type text not null,
  plan_key text not null,
  provider text not null default 'qonto' check (provider in ('manual','qonto','stripe')),
  checkout_url text,
  active boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_type, plan_key),
  foreign key (business_type, plan_key)
    references public.domain_plan_catalog(business_type, plan_key) on delete cascade,
  constraint domain_billing_plan_links_url_check check (
    checkout_url is null or checkout_url ~ '^https://[^[:space:]]+$'
  )
);

insert into public.domain_plan_catalog (
  business_type, plan_key, display_name, monthly_price_cents, member_limit,
  features, short_description, sort_order, recommended, active
)
values
  ('coiffure','decouverte','Découverte',990,1,
    '{"public_booking":true,"confirmation_emails":true}'::jsonb,
    'Pour démarrer seul avec les clients, le planning et la réservation en ligne.',10,false,true),
  ('coiffure','essentielle','Essentielle',1990,3,
    '{"public_booking":true,"confirmation_emails":true,"automatic_reminders":true,"online_booking_management":true,"calendar_links":true,"team_access":true}'::jsonb,
    'Pour une petite équipe avec rappels et gestion client en ligne.',20,false,true),
  ('coiffure','professionnelle','Professionnelle',3990,10,
    '{"public_booking":true,"confirmation_emails":true,"automatic_reminders":true,"online_booking_management":true,"calendar_links":true,"team_access":true,"manager_role":true,"commercial_branding":true}'::jsonb,
    'Pour un salon structuré avec personnalisation et permissions avancées.',30,true,true),
  ('coiffure','metier','Métier',6990,100,
    '{"public_booking":true,"confirmation_emails":true,"automatic_reminders":true,"online_booking_management":true,"calendar_links":true,"team_access":true,"manager_role":true,"commercial_branding":true,"white_label":true,"multi_site":true,"custom_modules":true,"custom_roles":true,"custom_domain":true}'::jsonb,
    'Pour les réseaux, le multi-sites et les besoins configurés sur mesure.',40,false,true),

  ('formation','decouverte','Découverte',3990,1,
    '{"training_programs":true,"training_trainees":true,"training_trainers":true,"training_sessions":true}'::jsonb,
    'Pour un formateur indépendant qui centralise ses formations, stagiaires et sessions.',10,false,true),
  ('formation','essentielle','Essentielle',6990,3,
    '{"training_programs":true,"training_trainees":true,"training_trainers":true,"training_sessions":true,"team_access":true}'::jsonb,
    'Pour une petite équipe de formation avec jusqu’à 3 accès.',20,true,true),
  ('formation','professionnelle','Professionnelle',9990,10,
    '{"training_programs":true,"training_trainees":true,"training_trainers":true,"training_sessions":true,"team_access":true,"manager_role":true,"commercial_branding":true}'::jsonb,
    'Pour un organisme structuré avec 10 accès, responsable et personnalisation.',30,false,true),
  ('formation','metier','Métier',14990,100,
    '{"training_programs":true,"training_trainees":true,"training_trainers":true,"training_sessions":true,"team_access":true,"manager_role":true,"commercial_branding":true,"white_label":true,"multi_site":true,"custom_modules":true,"custom_roles":true,"custom_domain":true}'::jsonb,
    'Pour les organismes multi-sites et les besoins contractuels sur mesure.',40,false,true)
on conflict (business_type, plan_key) do update
set display_name = excluded.display_name,
    monthly_price_cents = excluded.monthly_price_cents,
    member_limit = excluded.member_limit,
    features = excluded.features,
    short_description = excluded.short_description,
    sort_order = excluded.sort_order,
    recommended = excluded.recommended,
    active = excluded.active,
    updated_at = now();

-- Les liens Qonto existants deviennent les liens Coiffure. Les liens Formation
-- restent volontairement désactivés jusqu’à leur création dans Qonto.
insert into public.domain_billing_plan_links (
  business_type, plan_key, provider, checkout_url, active, updated_by
)
select 'coiffure', p.plan_key, coalesce(l.provider, 'qonto'), l.checkout_url,
       coalesce(l.active, false), l.updated_by
from public.domain_plan_catalog p
left join public.billing_plan_links l on l.plan_key = p.plan_key
where p.business_type = 'coiffure'
on conflict (business_type, plan_key) do nothing;

insert into public.domain_billing_plan_links (business_type, plan_key, provider, active)
select 'formation', plan_key, 'qonto', false
from public.domain_plan_catalog
where business_type = 'formation'
on conflict (business_type, plan_key) do nothing;

-- Corrige uniquement les espaces Formation encore facturés avec les anciens
-- tarifs génériques. Un tarif personnalisé déjà saisi reste intact.
update public.organization_subscriptions s
set monthly_price_cents = d.monthly_price_cents,
    updated_at = now()
from public.organizations o
join public.domain_plan_catalog d
  on d.business_type = o.business_type
 and d.plan_key = o.plan
join public.plan_catalog legacy on legacy.plan_key = o.plan
where s.organization_id = o.id
  and o.business_type = 'formation'
  and s.monthly_price_cents = legacy.monthly_price_cents;

drop trigger if exists set_domain_plan_catalog_updated_at on public.domain_plan_catalog;
create trigger set_domain_plan_catalog_updated_at
before update on public.domain_plan_catalog
for each row execute procedure public.set_updated_at();

drop trigger if exists set_domain_billing_plan_links_updated_at on public.domain_billing_plan_links;
create trigger set_domain_billing_plan_links_updated_at
before update on public.domain_billing_plan_links
for each row execute procedure public.set_updated_at();

alter table public.domain_plan_catalog enable row level security;
alter table public.domain_billing_plan_links enable row level security;
revoke all on public.domain_plan_catalog from anon, authenticated;
revoke all on public.domain_billing_plan_links from anon, authenticated;

create or replace function public.domain_plan_price(
  p_business_type text,
  p_plan_key text
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select d.monthly_price_cents
     from public.domain_plan_catalog d
     where d.business_type = p_business_type
       and d.plan_key = p_plan_key
       and d.active = true),
    (select p.monthly_price_cents
     from public.plan_catalog p
     where p.plan_key = p_plan_key
       and p.active = true)
  );
$$;

create or replace function public.domain_plan_member_limit(
  p_business_type text,
  p_plan_key text
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select d.member_limit
     from public.domain_plan_catalog d
     where d.business_type = p_business_type
       and d.plan_key = p_plan_key
       and d.active = true),
    (select p.member_limit
     from public.plan_catalog p
     where p.plan_key = p_plan_key
       and p.active = true)
  );
$$;

create or replace function public.initialize_organization_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price integer;
  v_trial_days integer := 0;
begin
  v_price := public.domain_plan_price(new.business_type, new.plan);

  select default_trial_days into v_trial_days
  from public.platform_billing_settings
  where singleton = true;

  insert into public.organization_subscriptions (
    organization_id, plan_key, status, provider, monthly_price_cents,
    trial_ends_at, current_period_start
  ) values (
    new.id,
    new.plan,
    case when new.status = 'trial' then 'trialing' else 'active' end,
    'manual',
    coalesce(v_price, 0),
    case when new.status = 'trial' then now() + make_interval(days => coalesce(v_trial_days, 0)) else null end,
    case when new.status = 'active' then now() else null end
  )
  on conflict (organization_id) do nothing;

  return new;
end;
$$;

create or replace function public.organization_plan_entitlements(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_org_member_any_status(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;

  select jsonb_build_object(
    'plan', o.plan,
    'business_type', o.business_type,
    'display_name', coalesce(d.display_name, p.display_name),
    'monthly_price_cents', coalesce(s.monthly_price_cents, d.monthly_price_cents, p.monthly_price_cents),
    'member_limit', coalesce(d.member_limit, p.member_limit),
    'features', coalesce(d.features, p.features),
    'organization_status', o.status,
    'subscription_status', coalesce(s.status, 'active'),
    'trial_ends_at', s.trial_ends_at,
    'current_period_end', s.current_period_end
  )
  into v_result
  from public.organizations o
  join public.plan_catalog p on p.plan_key = o.plan
  left join public.domain_plan_catalog d
    on d.business_type = o.business_type and d.plan_key = o.plan and d.active = true
  left join public.organization_subscriptions s on s.organization_id = o.id
  where o.id = p_organization_id;

  return v_result;
end;
$$;

create or replace function public.organization_billing_portal(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_result jsonb;
  v_business_type text;
  v_business_label text;
  v_active_members integer := 0;
  v_member_limit integer := 1;
  v_clients integer := 0;
  v_services integer := 0;
  v_appointments_month integer := 0;
  v_training_trainees integer := 0;
  v_training_programs integer := 0;
  v_training_trainers integer := 0;
  v_training_sessions_month integer := 0;
  v_storage_bytes bigint := 0;
  v_usage_items jsonb := '[]'::jsonb;
begin
  if not public.is_org_member_any_status(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;

  select o.business_type, coalesce(b.display_name, o.business_type),
         public.domain_plan_member_limit(o.business_type, o.plan)
    into v_business_type, v_business_label, v_member_limit
  from public.organizations o
  left join public.business_domain_catalog b
    on b.business_type = o.business_type and b.active = true
  where o.id = p_organization_id;

  if v_business_type is null then
    raise exception 'Entreprise introuvable.';
  end if;

  select count(*)::integer into v_active_members
  from public.organization_members
  where organization_id = p_organization_id and status = 'active';

  if v_business_type = 'formation' then
    select count(*)::integer into v_training_trainees
    from public.training_trainees
    where organization_id = p_organization_id and status = 'active';

    select count(*)::integer into v_training_programs
    from public.training_programs
    where organization_id = p_organization_id and status = 'active';

    select count(*)::integer into v_training_trainers
    from public.training_trainers
    where organization_id = p_organization_id and status = 'active';

    select count(*)::integer into v_training_sessions_month
    from public.training_sessions
    where organization_id = p_organization_id
      and starts_at >= date_trunc('month', now())
      and starts_at < date_trunc('month', now()) + interval '1 month'
      and status <> 'canceled';

    v_usage_items := jsonb_build_array(
      jsonb_build_object('key','members','label','Utilisateurs','value',v_active_members::text || ' / ' || coalesce(v_member_limit,1)::text),
      jsonb_build_object('key','trainees','label','Stagiaires actifs','value',v_training_trainees),
      jsonb_build_object('key','programs','label','Formations actives','value',v_training_programs),
      jsonb_build_object('key','sessions','label','Sessions ce mois','value',v_training_sessions_month),
      jsonb_build_object('key','trainers','label','Formateurs actifs','value',v_training_trainers)
    );
  else
    select count(*)::integer into v_clients
    from public.clients
    where organization_id = p_organization_id;

    if to_regclass('public.services') is not null then
      select count(*)::integer into v_services
      from public.services
      where organization_id = p_organization_id and active = true;
    end if;

    if to_regclass('public.appointments') is not null then
      select count(*)::integer into v_appointments_month
      from public.appointments
      where organization_id = p_organization_id
        and starts_at >= date_trunc('month', now())
        and starts_at < date_trunc('month', now()) + interval '1 month';
    end if;
  end if;

  if to_regclass('storage.objects') is not null then
    select coalesce(sum(
      case
        when metadata ? 'size' and (metadata ->> 'size') ~ '^[0-9]+$'
          then (metadata ->> 'size')::bigint
        else 0
      end
    ), 0)
    into v_storage_bytes
    from storage.objects
    where bucket_id = 'organization-branding'
      and split_part(name, '/', 1) = p_organization_id::text;
  end if;

  if v_business_type <> 'formation' then
    v_usage_items := jsonb_build_array(
      jsonb_build_object('key','members','label','Utilisateurs','value',v_active_members::text || ' / ' || coalesce(v_member_limit,1)::text),
      jsonb_build_object('key','clients','label','Clients','value',v_clients),
      jsonb_build_object('key','services','label','Prestations actives','value',v_services),
      jsonb_build_object('key','appointments','label','RDV ce mois','value',v_appointments_month),
      jsonb_build_object('key','storage','label','Stockage identité','value',
        case
          when v_storage_bytes < 1024 then '0 Ko'
          when v_storage_bytes < 1048576 then greatest(1, round(v_storage_bytes / 1024.0))::text || ' Ko'
          else round(v_storage_bytes / 1048576.0, 1)::text || ' Mo'
        end)
    );
  end if;

  select jsonb_build_object(
    'business_type', o.business_type,
    'business_type_label', v_business_label,
    'subscription', jsonb_build_object(
      'plan', o.plan,
      'plan_name', coalesce(dp.display_name, p.display_name),
      'organization_status', o.status,
      'subscription_status', coalesce(s.status, 'active'),
      'provider', coalesce(s.provider, 'manual'),
      'monthly_price_cents', coalesce(s.monthly_price_cents, dp.monthly_price_cents, p.monthly_price_cents),
      'trial_ends_at', s.trial_ends_at,
      'current_period_start', s.current_period_start,
      'current_period_end', s.current_period_end,
      'cancel_at_period_end', coalesce(s.cancel_at_period_end, false),
      'payment_confirmed_at', s.payment_confirmed_at
    ),
    'usage', jsonb_build_object(
      'active_members', v_active_members,
      'member_limit', coalesce(dp.member_limit, p.member_limit),
      'clients', v_clients,
      'active_services', v_services,
      'appointments_this_month', v_appointments_month,
      'storage_bytes', v_storage_bytes,
      'usage_items', v_usage_items
    ),
    'plans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'plan_key', pc.plan_key,
        'display_name', coalesce(dpc.display_name, pc.display_name),
        'monthly_price_cents', coalesce(dpc.monthly_price_cents, pc.monthly_price_cents),
        'member_limit', coalesce(dpc.member_limit, pc.member_limit),
        'features', coalesce(dpc.features, pc.features),
        'short_description', coalesce(dpc.short_description, pc.short_description),
        'sort_order', coalesce(dpc.sort_order, pc.sort_order),
        'recommended', coalesce(dpc.recommended, pc.plan_key = 'professionnelle'),
        'provider', case
          when dbl.plan_key is not null then dbl.provider
          else coalesce(bl.provider, bs.default_provider)
        end,
        'checkout_url', case
          when dbl.plan_key is not null and dbl.active then dbl.checkout_url
          when dbl.plan_key is null and coalesce(bl.active, false) then bl.checkout_url
          else null
        end,
        'checkout_active', case
          when dbl.plan_key is not null then dbl.active
          else coalesce(bl.active, false)
        end
      ) order by coalesce(dpc.sort_order, pc.sort_order)), '[]'::jsonb)
      from public.plan_catalog pc
      left join public.domain_plan_catalog dpc
        on dpc.business_type = o.business_type and dpc.plan_key = pc.plan_key
      left join public.domain_billing_plan_links dbl
        on dbl.business_type = o.business_type and dbl.plan_key = pc.plan_key
      left join public.billing_plan_links bl on bl.plan_key = pc.plan_key
      cross join public.platform_billing_settings bs
      where pc.active = true
        and bs.singleton = true
        and coalesce(dpc.active, true) = true
    ),
    'open_request', (
      select to_jsonb(r)
      from (
        select id, current_plan, requested_plan, request_type, status, provider,
               request_reference, checkout_url_snapshot, created_at
        from public.subscription_change_requests
        where organization_id = p_organization_id
          and status in ('payment_pending','pending_review')
        order by created_at desc
        limit 1
      ) r
    ),
    'history', (
      select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc), '[]'::jsonb)
      from (
        select event_type, from_plan, to_plan, metadata, created_at
        from public.subscription_events
        where organization_id = p_organization_id
        order by created_at desc
        limit 20
      ) e
    ),
    'terms', (
      select jsonb_build_object(
        'version', terms_version,
        'text', terms_text,
        'cancellation_text', cancellation_text
      )
      from public.platform_billing_settings
      where singleton = true
    )
  ) into v_result
  from public.organizations o
  join public.plan_catalog p on p.plan_key = o.plan
  left join public.domain_plan_catalog dp
    on dp.business_type = o.business_type and dp.plan_key = o.plan and dp.active = true
  left join public.organization_subscriptions s on s.organization_id = o.id
  where o.id = p_organization_id;

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
  if not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seul le propriétaire ou un administrateur peut gérer l’abonnement.';
  end if;

  if not coalesce(p_accept_terms, false) then
    raise exception 'Vous devez accepter les conditions d’abonnement.';
  end if;

  if p_requested_plan not in ('decouverte','essentielle','professionnelle','metier') then
    raise exception 'Formule invalide.';
  end if;

  if exists (
    select 1 from public.subscription_change_requests
    where organization_id = p_organization_id
      and status in ('payment_pending','pending_review')
  ) then
    raise exception 'Une demande de changement est déjà en cours.';
  end if;

  select o.plan, o.business_type, coalesce(s.status, 'active')
    into v_current_plan, v_business_type, v_subscription_status
  from public.organizations o
  left join public.organization_subscriptions s on s.organization_id = o.id
  where o.id = p_organization_id;

  if v_current_plan is null then
    raise exception 'Entreprise introuvable.';
  end if;

  select exists (
    select 1 from public.domain_plan_catalog
    where business_type = v_business_type
  ) into v_domain_catalog_exists;

  if v_domain_catalog_exists and not exists (
    select 1 from public.domain_plan_catalog
    where business_type = v_business_type
      and plan_key = p_requested_plan
      and active = true
  ) then
    raise exception 'Cette formule n’est pas disponible pour ce domaine.';
  end if;

  select terms_version into v_terms_version
  from public.platform_billing_settings
  where singleton = true;

  v_current_rank := case v_current_plan when 'decouverte' then 1 when 'essentielle' then 2 when 'professionnelle' then 3 else 4 end;
  v_requested_rank := case p_requested_plan when 'decouverte' then 1 when 'essentielle' then 2 when 'professionnelle' then 3 else 4 end;

  if p_requested_plan = 'metier' then
    v_request_type := 'metier';
  elsif v_subscription_status = 'trialing' then
    v_request_type := 'reactivation';
  elsif p_requested_plan = v_current_plan then
    if v_subscription_status in ('past_due','paused','canceled') then
      v_request_type := 'reactivation';
    else
      raise exception 'Cette formule est déjà active.';
    end if;
  elsif v_requested_rank > v_current_rank then
    v_request_type := 'upgrade';
  else
    v_request_type := 'downgrade';
  end if;

  if v_request_type in ('upgrade','reactivation') and p_requested_plan <> 'metier' then
    if v_domain_catalog_exists then
      select provider, checkout_url
        into v_provider, v_checkout_url
      from public.domain_billing_plan_links
      where business_type = v_business_type
        and plan_key = p_requested_plan
        and active = true;
    else
      select provider, checkout_url
        into v_provider, v_checkout_url
      from public.billing_plan_links
      where plan_key = p_requested_plan
        and active = true;
    end if;

    if v_checkout_url is not null then
      v_status := 'payment_pending';
    else
      v_provider := 'manual';
      v_status := 'pending_review';
    end if;
  end if;

  v_reference := 'NCR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.subscription_change_requests (
    organization_id, current_plan, requested_plan, request_type, status,
    provider, checkout_url_snapshot, request_reference, accepted_terms_at,
    terms_version, requested_by
  ) values (
    p_organization_id, v_current_plan, p_requested_plan, v_request_type, v_status,
    v_provider, v_checkout_url, v_reference, now(),
    coalesce(v_terms_version, 'initial'), auth.uid()
  ) returning id into v_request_id;

  insert into public.subscription_events (
    organization_id, request_id, event_type, actor_user_id, from_plan, to_plan, metadata
  ) values (
    p_organization_id, v_request_id, 'change_requested', auth.uid(),
    v_current_plan, p_requested_plan,
    jsonb_build_object(
      'status', v_status,
      'provider', v_provider,
      'reference', v_reference,
      'business_type', v_business_type
    )
  );

  return jsonb_build_object(
    'id', v_request_id,
    'status', v_status,
    'provider', v_provider,
    'checkout_url', v_checkout_url,
    'reference', v_reference
  );
end;
$$;

create or replace function public.admin_billing_configuration()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Accès administrateur NCR requis.';
  end if;

  select jsonb_build_object(
    'settings', (
      select jsonb_build_object(
        'default_provider', default_provider,
        'default_trial_days', default_trial_days,
        'default_trial_plan', default_trial_plan,
        'terms_version', terms_version,
        'terms_text', terms_text,
        'cancellation_text', cancellation_text
      )
      from public.platform_billing_settings where singleton = true
    ),
    'domains', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'business_type', d.business_type,
        'display_name', coalesce(b.display_name, d.business_type)
      ) order by coalesce(b.display_name, d.business_type)), '[]'::jsonb)
      from (select distinct business_type from public.domain_plan_catalog where active = true) d
      left join public.business_domain_catalog b
        on b.business_type = d.business_type and b.active = true
    ),
    'plans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'business_type', p.business_type,
        'business_type_label', coalesce(b.display_name, p.business_type),
        'plan_key', p.plan_key,
        'display_name', p.display_name,
        'monthly_price_cents', p.monthly_price_cents,
        'member_limit', p.member_limit,
        'provider', coalesce(l.provider, 'qonto'),
        'checkout_url', l.checkout_url,
        'active', coalesce(l.active, false),
        'sort_order', p.sort_order,
        'recommended', p.recommended
      ) order by coalesce(b.display_name, p.business_type), p.sort_order), '[]'::jsonb)
      from public.domain_plan_catalog p
      left join public.domain_billing_plan_links l
        on l.business_type = p.business_type and l.plan_key = p.plan_key
      left join public.business_domain_catalog b
        on b.business_type = p.business_type and b.active = true
      where p.active = true
    )
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_update_billing_plan_link(
  p_business_type text,
  p_plan_key text,
  p_provider text,
  p_checkout_url text,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := nullif(trim(coalesce(p_checkout_url, '')), '');
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut modifier les liens de paiement.';
  end if;

  if not exists (
    select 1 from public.domain_plan_catalog
    where business_type = p_business_type
      and plan_key = p_plan_key
      and active = true
  ) then
    raise exception 'Formule ou domaine invalide.';
  end if;

  if p_provider not in ('manual','qonto','stripe') then
    raise exception 'Prestataire invalide.';
  end if;

  if coalesce(p_active, false) and v_url is null and p_plan_key <> 'metier' then
    raise exception 'Un lien de paiement est requis pour activer cette formule.';
  end if;

  if v_url is not null and v_url !~ '^https://[^[:space:]]+$' then
    raise exception 'URL de paiement invalide.';
  end if;

  insert into public.domain_billing_plan_links (
    business_type, plan_key, provider, checkout_url, active, updated_by
  ) values (
    p_business_type, p_plan_key, p_provider, v_url, coalesce(p_active, false), auth.uid()
  )
  on conflict (business_type, plan_key) do update
  set provider = excluded.provider,
      checkout_url = excluded.checkout_url,
      active = excluded.active,
      updated_by = auth.uid(),
      updated_at = now();
end;
$$;

create or replace function public.admin_review_subscription_request(
  p_request_id uuid,
  p_decision text,
  p_note text default null,
  p_provider_payment_reference text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.subscription_change_requests%rowtype;
  v_price integer;
  v_business_type text;
  v_period_end timestamptz;
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut traiter les demandes.';
  end if;

  if p_decision not in ('approve','reject') then
    raise exception 'Décision invalide.';
  end if;

  select * into v_request
  from public.subscription_change_requests
  where id = p_request_id
    and status in ('payment_pending','pending_review')
  for update;

  if v_request.id is null then
    raise exception 'Demande introuvable ou déjà traitée.';
  end if;

  if p_decision = 'reject' then
    update public.subscription_change_requests
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
        review_note = nullif(trim(coalesce(p_note, '')), ''), updated_at = now()
    where id = p_request_id;

    insert into public.subscription_events (
      organization_id, request_id, event_type, actor_user_id, from_plan, to_plan, metadata
    ) values (
      v_request.organization_id, v_request.id, 'request_rejected', auth.uid(),
      v_request.current_plan, v_request.requested_plan,
      jsonb_build_object('note', nullif(trim(coalesce(p_note, '')), ''))
    );
    return;
  end if;

  select business_type into v_business_type
  from public.organizations
  where id = v_request.organization_id;

  v_price := public.domain_plan_price(v_business_type, v_request.requested_plan);

  v_period_end := case
    when v_request.request_type = 'downgrade' then now() + interval '1 month'
    when v_request.requested_plan = 'metier' then null
    else now() + interval '1 month'
  end;

  perform public.admin_update_organization_subscription(
    v_request.organization_id,
    v_request.requested_plan,
    'active',
    'active',
    coalesce(v_price, 0),
    null,
    v_period_end,
    false,
    coalesce(nullif(trim(coalesce(p_note, '')), ''),
      'Activation depuis une demande d’abonnement ' || v_request.request_reference)
  );

  update public.organization_subscriptions
  set provider = v_request.provider,
      provider_checkout_url = v_request.checkout_url_snapshot,
      provider_payment_reference = nullif(trim(coalesce(p_provider_payment_reference, '')), ''),
      provider_subscription_id = coalesce(nullif(trim(coalesce(p_provider_payment_reference, '')), ''), provider_subscription_id),
      payment_confirmed_at = case when v_request.provider <> 'manual' then now() else payment_confirmed_at end,
      provider_metadata = provider_metadata || jsonb_build_object(
        'request_reference', v_request.request_reference,
        'approved_by', auth.uid(),
        'approved_at', now(),
        'business_type', v_business_type
      ),
      updated_at = now()
  where organization_id = v_request.organization_id;

  update public.subscription_change_requests
  set status = 'approved',
      provider_payment_reference = nullif(trim(coalesce(p_provider_payment_reference, '')), ''),
      reviewed_by = auth.uid(), reviewed_at = now(),
      review_note = nullif(trim(coalesce(p_note, '')), ''), updated_at = now()
  where id = p_request_id;

  insert into public.subscription_events (
    organization_id, request_id, event_type, actor_user_id, from_plan, to_plan, metadata
  ) values (
    v_request.organization_id, v_request.id, 'request_approved', auth.uid(),
    v_request.current_plan, v_request.requested_plan,
    jsonb_build_object(
      'provider', v_request.provider,
      'provider_payment_reference', nullif(trim(coalesce(p_provider_payment_reference, '')), ''),
      'business_type', v_business_type,
      'monthly_price_cents', v_price
    )
  );
end;
$$;

revoke all on public.domain_plan_catalog from public;
revoke all on public.domain_billing_plan_links from public;
revoke all on function public.domain_plan_price(text,text) from public;
revoke all on function public.domain_plan_member_limit(text,text) from public;
revoke all on function public.admin_update_billing_plan_link(text,text,text,text,boolean) from public;

grant execute on function public.domain_plan_price(text,text) to authenticated;
grant execute on function public.domain_plan_member_limit(text,text) to authenticated;
grant execute on function public.admin_update_billing_plan_link(text,text,text,text,boolean) to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
