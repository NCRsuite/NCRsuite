-- NCR Suite V2.11.3 — Modules Sécurité à la carte
-- À exécuter après 056_saas_phase2_completion.sql.

begin;

create table if not exists public.security_addon_catalog (
  addon_key text primary key,
  display_name text not null,
  short_description text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  available_plans text[] not null default '{}',
  feature_keys text[] not null default '{}',
  prerequisite_addons text[] not null default '{}',
  member_limit_delta integer not null default 0 check (member_limit_delta >= 0),
  icon_key text not null default 'shield',
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.security_addon_billing_links (
  addon_key text primary key references public.security_addon_catalog(addon_key) on delete cascade,
  provider text not null default 'manual' check (provider in ('manual','qonto','stripe')),
  checkout_url text,
  active boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_security_addons (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  addon_key text not null references public.security_addon_catalog(addon_key) on delete restrict,
  status text not null default 'active' check (status in ('active','inactive')),
  monthly_price_cents_snapshot integer not null default 0,
  provider text not null default 'manual' check (provider in ('manual','qonto','stripe')),
  provider_payment_reference text,
  activated_at timestamptz,
  deactivated_at timestamptz,
  activated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, addon_key)
);

create table if not exists public.security_addon_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  addon_key text not null references public.security_addon_catalog(addon_key) on delete restrict,
  action text not null check (action in ('add','remove')),
  status text not null check (status in ('payment_pending','pending_review','approved','rejected','canceled')),
  provider text not null default 'manual' check (provider in ('manual','qonto','stripe')),
  checkout_url_snapshot text,
  request_reference text not null unique,
  accepted_terms_at timestamptz not null,
  terms_version text,
  requested_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  provider_payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_security_addon_requests_open
  on public.security_addon_change_requests(organization_id, status, created_at desc);
create index if not exists idx_security_addons_active
  on public.organization_security_addons(organization_id, status);

insert into public.security_addon_catalog (
  addon_key, display_name, short_description, monthly_price_cents,
  available_plans, feature_keys, prerequisite_addons, member_limit_delta, icon_key, sort_order, active
) values
  ('security_agent_access', 'Accès Agent Terrain',
   'Planning personnel, missions, prise et fin de poste pour 5 agents connectés.', 1290,
   array['decouverte'], array['team_access','security_agent_portal'], array[]::text[], 5, 'users', 10, true),
  ('security_agent_pack_5', 'Extension 5 agents',
   'Ajoute 5 accès agents supplémentaires, dans la limite de 10 agents en Découverte.', 590,
   array['decouverte'], array[]::text[], array['security_agent_access'], 5, 'plus', 20, true),
  ('security_qr_patrols_addon', 'Rondes QR',
   'Points de passage, scans QR, parcours, anomalies et suivi des rondes.', 890,
   array['decouverte'], array['security_qr_patrols'], array['security_agent_access'], 0, 'map', 30, true),
  ('security_logbook_addon', 'Main courante numérique',
   'Événements, incidents, photos et PDF de main courante par mission.', 890,
   array['decouverte'], array['security_smart_logbook','security_logbook_pdf'], array['security_agent_access'], 0, 'clipboard', 40, true),
  ('security_instructions_addon', 'Consignes & alertes',
   'Consignes, plans, contacts et alertes propres à chaque site.', 490,
   array['decouverte'], array['security_site_instructions'], array['security_agent_access'], 0, 'alert', 50, true),
  ('security_geolocation_addon', 'Géolocalisation',
   'Positions transmises pendant les vacations et suivi cartographique.', 790,
   array['essentielle'], array['security_geolocation'], array[]::text[], 0, 'map', 60, true),
  ('security_pti_addon', 'PTI / SOS',
   'Protection du travailleur isolé, confirmations périodiques et alertes SOS.', 990,
   array['essentielle'], array['security_pti_sos'], array[]::text[], 0, 'shield', 70, true),
  ('security_supervision_addon', 'Supervision QG temps réel',
   'Vacations, positions, PTI et urgences regroupés dans un cockpit opérationnel.', 790,
   array['essentielle'], array['security_realtime_supervision'], array[]::text[], 0, 'activity', 80, true),
  ('security_agent_roles_addon', 'Rôle Chef de poste',
   'Ajoute le rôle Chef de poste et ses droits opérationnels renforcés.', 490,
   array['essentielle'], array['security_agent_roles','manager_role'], array[]::text[], 0, 'users', 90, true)
on conflict (addon_key) do update set
  display_name = excluded.display_name,
  short_description = excluded.short_description,
  monthly_price_cents = excluded.monthly_price_cents,
  available_plans = excluded.available_plans,
  feature_keys = excluded.feature_keys,
  prerequisite_addons = excluded.prerequisite_addons,
  member_limit_delta = excluded.member_limit_delta,
  icon_key = excluded.icon_key,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

insert into public.security_addon_billing_links(addon_key, provider, checkout_url, active)
select addon_key, 'manual', null, false
from public.security_addon_catalog
on conflict (addon_key) do nothing;

alter table public.security_addon_catalog enable row level security;
alter table public.security_addon_billing_links enable row level security;
alter table public.organization_security_addons enable row level security;
alter table public.security_addon_change_requests enable row level security;

revoke all on public.security_addon_catalog from anon, authenticated;
revoke all on public.security_addon_billing_links from anon, authenticated;
revoke all on public.organization_security_addons from anon, authenticated;
revoke all on public.security_addon_change_requests from anon, authenticated;

create or replace function public.security_base_plan_has_feature(
  p_organization_id uuid,
  p_feature text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((d.features ->> p_feature)::boolean, false)
  from public.organizations o
  left join public.domain_plan_catalog d
    on d.business_type = o.business_type
   and d.plan_key = o.plan
   and d.active = true
  where o.id = p_organization_id
    and o.business_type = 'securite';
$$;

create or replace function public.security_has_active_addon(
  p_organization_id uuid,
  p_addon_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_security_addons a
    where a.organization_id = p_organization_id
      and a.addon_key = p_addon_key
      and a.status = 'active'
  );
$$;

create or replace function public.security_has_addon_feature(
  p_organization_id uuid,
  p_feature text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_security_addons a
    join public.security_addon_catalog c on c.addon_key = a.addon_key
    where a.organization_id = p_organization_id
      and a.status = 'active'
      and c.active = true
      and p_feature = any(c.feature_keys)
  );
$$;

-- Les modules à la carte complètent la formule sans modifier le plan principal.
create or replace function public.organization_has_plan_feature(
  p_organization_id uuid,
  p_feature text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_type text;
  v_plan text;
  v_status text;
  v_metier_modules_configured boolean;
  v_features jsonb;
  v_module_key text;
begin
  select o.business_type, o.plan, o.status, coalesce(o.metier_modules_configured, false), d.features
  into v_business_type, v_plan, v_status, v_metier_modules_configured, v_features
  from public.organizations o
  left join public.domain_plan_catalog d
    on d.business_type = o.business_type
   and d.plan_key = o.plan
   and d.active = true
  where o.id = p_organization_id;

  if v_business_type is null or v_status not in ('trial','active') then
    return false;
  end if;

  if v_business_type = 'securite'
     and public.security_has_addon_feature(p_organization_id, p_feature) then
    return true;
  end if;

  if not coalesce((v_features ->> p_feature)::boolean, false) then
    return false;
  end if;

  if v_business_type = 'formation' and v_plan = 'metier' and v_metier_modules_configured then
    v_module_key := case p_feature
      when 'training_programs' then 'training_programs'
      when 'training_trainees' then 'trainees'
      when 'training_trainers' then 'trainers'
      when 'training_sessions' then 'sessions'
      when 'training_documents' then 'documents'
      when 'training_blank_attendance' then 'attendance'
      when 'training_digital_attendance' then 'attendance'
      when 'training_attendance_pdf' then 'attendance'
      when 'training_automatic_certificates' then 'certificates'
      when 'commercial_branding' then 'commercial_branding'
      when 'training_document_branding' then 'commercial_branding'
      when 'training_email_branding' then 'commercial_branding'
      when 'training_satisfaction' then 'evaluations'
      when 'training_session_dossier' then 'documents'
      when 'multi_site' then 'sites'
      when 'team_access' then 'team_access'
      when 'manager_role' then 'team_access'
      else null
    end;

    if v_module_key is not null then
      return exists (
        select 1
        from public.organization_modules m
        where m.organization_id = p_organization_id
          and m.module_key = v_module_key
          and m.enabled = true
      );
    end if;
  end if;

  return true;
end;
$$;

create or replace function public.sync_security_addon_modules(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feature text;
  v_enabled boolean;
begin
  if not exists (
    select 1 from public.organizations
    where id = p_organization_id and business_type = 'securite'
  ) then
    return;
  end if;

  for v_feature in
    select distinct unnest(c.feature_keys)
    from public.security_addon_catalog c
    where c.active = true
  loop
    v_enabled := public.security_base_plan_has_feature(p_organization_id, v_feature)
      or public.security_has_addon_feature(p_organization_id, v_feature);

    insert into public.organization_modules(organization_id, module_key, enabled)
    values (p_organization_id, v_feature, v_enabled)
    on conflict (organization_id, module_key) do update
    set enabled = excluded.enabled,
        updated_at = now();
  end loop;
end;
$$;

create or replace function public.security_team_member_limit(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when o.plan = 'metier' then public.organization_metier_member_limit(o.id)
    when o.plan = 'decouverte' then least(10, coalesce((
      select sum(c.member_limit_delta)::integer
      from public.organization_security_addons a
      join public.security_addon_catalog c on c.addon_key = a.addon_key
      where a.organization_id = o.id
        and a.status = 'active'
        and c.active = true
    ), 0))
    else coalesce(d.member_limit, 1)
  end
  from public.organizations o
  left join public.domain_plan_catalog d
    on d.business_type = o.business_type and d.plan_key = o.plan
  where o.id = p_organization_id and o.business_type = 'securite';
$$;

create or replace function public.security_addon_portal(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;

  if not exists (
    select 1 from public.organizations
    where id = p_organization_id and business_type = 'securite'
  ) then
    raise exception 'Cette rubrique est réservée au métier Sécurité.';
  end if;

  select jsonb_build_object(
    'organization_id', o.id,
    'plan', o.plan,
    'base_monthly_price_cents', d.monthly_price_cents,
    'base_member_limit', d.member_limit,
    'active_addons_monthly_price_cents', coalesce((
      select sum(a.monthly_price_cents_snapshot)::integer
      from public.organization_security_addons a
      join public.security_addon_catalog c on c.addon_key = a.addon_key
      where a.organization_id = o.id and a.status = 'active'
    ), 0),
    'effective_member_limit', public.security_team_member_limit(o.id),
    'next_plan', case o.plan
      when 'decouverte' then jsonb_build_object(
        'plan_key','essentielle',
        'display_name',coalesce((select display_name from public.domain_plan_catalog where business_type='securite' and plan_key='essentielle'),'Essentielle'),
        'monthly_price_cents',coalesce((select monthly_price_cents from public.domain_plan_catalog where business_type='securite' and plan_key='essentielle'),6990)
      )
      when 'essentielle' then jsonb_build_object(
        'plan_key','professionnelle',
        'display_name',coalesce((select display_name from public.domain_plan_catalog where business_type='securite' and plan_key='professionnelle'),'Professionnelle'),
        'monthly_price_cents',coalesce((select monthly_price_cents from public.domain_plan_catalog where business_type='securite' and plan_key='professionnelle'),8990)
      )
      else null
    end,
    'catalog', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'addon_key', c.addon_key,
        'display_name', c.display_name,
        'short_description', c.short_description,
        'monthly_price_cents', c.monthly_price_cents,
        'available_plans', c.available_plans,
        'feature_keys', c.feature_keys,
        'prerequisite_addons', c.prerequisite_addons,
        'member_limit_delta', c.member_limit_delta,
        'icon_key', c.icon_key,
        'sort_order', c.sort_order,
        'active', exists (
          select 1 from public.organization_security_addons a
          where a.organization_id = o.id and a.addon_key = c.addon_key and a.status = 'active'
        ),
        'included_by_plan', case
          when cardinality(c.feature_keys) = 0 then false
          else not exists (
            select 1 from unnest(c.feature_keys) f
            where not public.security_base_plan_has_feature(o.id, f)
          )
        end,
        'available_for_plan', o.plan = any(c.available_plans),
        'prerequisites_met', not exists (
          select 1 from unnest(c.prerequisite_addons) p
          where not public.security_has_active_addon(o.id, p)
        ),
        'provider', coalesce(l.provider, 'manual'),
        'checkout_active', coalesce(l.active, false),
        'checkout_url', l.checkout_url
      ) order by c.sort_order), '[]'::jsonb)
      from public.security_addon_catalog c
      left join public.security_addon_billing_links l on l.addon_key = c.addon_key
      where c.active = true
    ),
    'requests', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'addon_key', r.addon_key,
        'action', r.action,
        'status', r.status,
        'provider', r.provider,
        'checkout_url_snapshot', r.checkout_url_snapshot,
        'request_reference', r.request_reference,
        'created_at', r.created_at
      ) order by r.created_at desc), '[]'::jsonb)
      from public.security_addon_change_requests r
      where r.organization_id = o.id
        and r.status in ('payment_pending','pending_review')
    )
  ) into v_result
  from public.organizations o
  join public.domain_plan_catalog d
    on d.business_type = o.business_type and d.plan_key = o.plan
  where o.id = p_organization_id;

  return v_result;
end;
$$;

create or replace function public.request_security_addon_change(
  p_organization_id uuid,
  p_addon_key text,
  p_action text,
  p_accept_terms boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_catalog public.security_addon_catalog%rowtype;
  v_provider text := 'manual';
  v_checkout_url text;
  v_status text := 'pending_review';
  v_reference text;
  v_request_id uuid;
  v_terms_version text;
  v_dependency text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seul le propriétaire ou un administrateur peut gérer les modules.';
  end if;

  if not coalesce(p_accept_terms, false) then
    raise exception 'Vous devez accepter les conditions d’abonnement.';
  end if;

  if p_action not in ('add','remove') then
    raise exception 'Action invalide.';
  end if;

  select * into v_org
  from public.organizations
  where id = p_organization_id;

  if v_org.id is null or v_org.business_type <> 'securite' then
    raise exception 'Entreprise Sécurité introuvable.';
  end if;

  if v_org.status not in ('trial','active') then
    raise exception 'L’entreprise doit être active pour modifier ses modules.';
  end if;

  select * into v_catalog
  from public.security_addon_catalog
  where addon_key = p_addon_key and active = true;

  if v_catalog.addon_key is null then
    raise exception 'Module introuvable.';
  end if;

  if exists (
    select 1 from public.security_addon_change_requests
    where organization_id = p_organization_id
      and addon_key = p_addon_key
      and status in ('payment_pending','pending_review')
  ) then
    raise exception 'Une demande est déjà en cours pour ce module.';
  end if;

  if p_action = 'add' then
    if not (v_org.plan = any(v_catalog.available_plans)) then
      raise exception 'Ce module n’est pas disponible avec votre formule actuelle.';
    end if;

    if public.security_has_active_addon(p_organization_id, p_addon_key) then
      raise exception 'Ce module est déjà actif.';
    end if;

    if cardinality(v_catalog.feature_keys) > 0 and not exists (
      select 1 from unnest(v_catalog.feature_keys) f
      where not public.security_base_plan_has_feature(p_organization_id, f)
    ) then
      raise exception 'Ce module est déjà inclus dans votre formule.';
    end if;

    foreach v_dependency in array v_catalog.prerequisite_addons loop
      if not public.security_has_active_addon(p_organization_id, v_dependency) then
        raise exception 'Un module requis doit être activé avant celui-ci.';
      end if;
    end loop;

    select coalesce(l.provider,'manual'), l.checkout_url
    into v_provider, v_checkout_url
    from public.security_addon_billing_links l
    where l.addon_key = p_addon_key and l.active = true;

    if v_checkout_url is not null then
      v_status := 'payment_pending';
    else
      v_provider := 'manual';
      v_status := 'pending_review';
    end if;
  else
    if not public.security_has_active_addon(p_organization_id, p_addon_key) then
      raise exception 'Ce module n’est pas actif.';
    end if;

    if exists (
      select 1
      from public.organization_security_addons a
      join public.security_addon_catalog c on c.addon_key = a.addon_key
      where a.organization_id = p_organization_id
        and a.status = 'active'
        and p_addon_key = any(c.prerequisite_addons)
    ) then
      raise exception 'Désactivez d’abord les modules qui dépendent de celui-ci.';
    end if;
  end if;

  select terms_version into v_terms_version
  from public.platform_billing_settings
  where singleton = true;

  v_reference := 'NCR-MOD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.security_addon_change_requests(
    organization_id, addon_key, action, status, provider,
    checkout_url_snapshot, request_reference, accepted_terms_at,
    terms_version, requested_by
  ) values (
    p_organization_id, p_addon_key, p_action, v_status, v_provider,
    v_checkout_url, v_reference, now(), coalesce(v_terms_version,'initial'), auth.uid()
  ) returning id into v_request_id;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'security.addon_change_requested',
    'security_addon_request', v_request_id::text,
    jsonb_build_object('addon_key',p_addon_key,'action',p_action,'status',v_status,'reference',v_reference)
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

create or replace function public.cancel_security_addon_request(
  p_organization_id uuid,
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Accès refusé.';
  end if;

  update public.security_addon_change_requests
  set status = 'canceled', updated_at = now()
  where id = p_request_id
    and organization_id = p_organization_id
    and status in ('payment_pending','pending_review');

  if not found then
    raise exception 'Demande introuvable ou déjà traitée.';
  end if;
end;
$$;

create or replace function public.admin_security_addon_configuration()
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'addon_key', c.addon_key,
    'display_name', c.display_name,
    'short_description', c.short_description,
    'monthly_price_cents', c.monthly_price_cents,
    'available_plans', c.available_plans,
    'provider', coalesce(l.provider,'manual'),
    'checkout_url', l.checkout_url,
    'checkout_active', coalesce(l.active,false),
    'sort_order', c.sort_order
  ) order by c.sort_order), '[]'::jsonb)
  into v_result
  from public.security_addon_catalog c
  left join public.security_addon_billing_links l on l.addon_key = c.addon_key
  where c.active = true;

  return jsonb_build_object('addons', v_result);
end;
$$;

create or replace function public.admin_update_security_addon_link(
  p_addon_key text,
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
  v_url text := nullif(trim(coalesce(p_checkout_url,'')), '');
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut modifier les liens de paiement.';
  end if;

  if not exists (
    select 1 from public.security_addon_catalog
    where addon_key = p_addon_key and active = true
  ) then
    raise exception 'Module invalide.';
  end if;

  if p_provider not in ('manual','qonto','stripe') then
    raise exception 'Prestataire invalide.';
  end if;

  if coalesce(p_active,false) and p_provider <> 'manual' and v_url is null then
    raise exception 'Un lien de paiement est requis.';
  end if;

  if v_url is not null and v_url !~ '^https://[^[:space:]]+$' then
    raise exception 'URL de paiement invalide.';
  end if;

  insert into public.security_addon_billing_links(addon_key,provider,checkout_url,active,updated_by)
  values (p_addon_key,p_provider,v_url,coalesce(p_active,false),auth.uid())
  on conflict (addon_key) do update
  set provider = excluded.provider,
      checkout_url = excluded.checkout_url,
      active = excluded.active,
      updated_by = auth.uid(),
      updated_at = now();
end;
$$;

create or replace function public.admin_list_security_addon_requests(p_status text default null)
returns table (
  id uuid,
  organization_id uuid,
  organization_name text,
  owner_email text,
  addon_key text,
  addon_name text,
  action text,
  status text,
  provider text,
  request_reference text,
  provider_payment_reference text,
  created_at timestamptz,
  review_note text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.organization_id, o.name,
    (select u.email::text
     from public.organization_members m
     join auth.users u on u.id = m.user_id
     where m.organization_id = o.id and m.role = 'owner' and m.status = 'active'
     order by m.created_at
     limit 1),
    r.addon_key, c.display_name, r.action, r.status, r.provider,
    r.request_reference, r.provider_payment_reference, r.created_at, r.review_note
  from public.security_addon_change_requests r
  join public.organizations o on o.id = r.organization_id
  join public.security_addon_catalog c on c.addon_key = r.addon_key
  where public.is_platform_admin()
    and (p_status is null or r.status = p_status)
  order by case when r.status in ('payment_pending','pending_review') then 0 else 1 end,
           r.created_at desc;
$$;

create or replace function public.admin_review_security_addon_request(
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
  v_request public.security_addon_change_requests%rowtype;
  v_catalog public.security_addon_catalog%rowtype;
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut traiter les demandes.';
  end if;

  if p_decision not in ('approve','reject') then
    raise exception 'Décision invalide.';
  end if;

  select * into v_request
  from public.security_addon_change_requests
  where id = p_request_id
  for update;

  if v_request.id is null or v_request.status not in ('payment_pending','pending_review') then
    raise exception 'Demande introuvable ou déjà traitée.';
  end if;

  select * into v_catalog
  from public.security_addon_catalog
  where addon_key = v_request.addon_key;

  if p_decision = 'approve' then
    if v_request.action = 'add' then
      insert into public.organization_security_addons(
        organization_id, addon_key, status, monthly_price_cents_snapshot,
        provider, provider_payment_reference, activated_at, deactivated_at,
        activated_by, updated_at
      ) values (
        v_request.organization_id, v_request.addon_key, 'active', v_catalog.monthly_price_cents,
        v_request.provider, nullif(trim(coalesce(p_provider_payment_reference,'')),''), now(), null,
        auth.uid(), now()
      )
      on conflict (organization_id, addon_key) do update
      set status = 'active',
          monthly_price_cents_snapshot = excluded.monthly_price_cents_snapshot,
          provider = excluded.provider,
          provider_payment_reference = excluded.provider_payment_reference,
          activated_at = now(),
          deactivated_at = null,
          activated_by = auth.uid(),
          updated_at = now();
    else
      update public.organization_security_addons
      set status = 'inactive', deactivated_at = now(), updated_at = now()
      where organization_id = v_request.organization_id
        and addon_key = v_request.addon_key;
    end if;

    update public.security_addon_change_requests
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
        review_note = nullif(trim(coalesce(p_note,'')),''),
        provider_payment_reference = nullif(trim(coalesce(p_provider_payment_reference,'')),''),
        updated_at = now()
    where id = v_request.id;

    perform public.sync_security_addon_modules(v_request.organization_id);
  else
    update public.security_addon_change_requests
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
        review_note = nullif(trim(coalesce(p_note,'')),''), updated_at = now()
    where id = v_request.id;
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    v_request.organization_id, auth.uid(),
    case when p_decision='approve' then 'security.addon_change_approved' else 'security.addon_change_rejected' end,
    'security_addon_request', v_request.id::text,
    jsonb_build_object('addon_key',v_request.addon_key,'request_action',v_request.action,'decision',p_decision)
  );
end;
$$;

-- Une montée de formule retire automatiquement les modules devenus inclus.
create or replace function public.reconcile_security_addons_after_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_addon record;
begin
  if new.business_type = 'securite' and old.plan is distinct from new.plan then
    for v_addon in
      select a.addon_key, c.feature_keys, c.available_plans
      from public.organization_security_addons a
      join public.security_addon_catalog c on c.addon_key = a.addon_key
      where a.organization_id = new.id and a.status = 'active'
    loop
      if not (new.plan = any(v_addon.available_plans))
         or (cardinality(v_addon.feature_keys) > 0 and not exists (
           select 1 from unnest(v_addon.feature_keys) f
           where not public.security_base_plan_has_feature(new.id, f)
         )) then
        update public.organization_security_addons
        set status='inactive', deactivated_at=now(), updated_at=now()
        where organization_id=new.id and addon_key=v_addon.addon_key;
      end if;
    end loop;
    perform public.sync_security_addon_modules(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists reconcile_security_addons_plan_trigger on public.organizations;
create trigger reconcile_security_addons_plan_trigger
after update of plan on public.organizations
for each row execute procedure public.reconcile_security_addons_after_plan_change();

revoke all on function public.security_base_plan_has_feature(uuid,text) from public;
revoke all on function public.security_has_active_addon(uuid,text) from public;
revoke all on function public.security_has_addon_feature(uuid,text) from public;
revoke all on function public.sync_security_addon_modules(uuid) from public;
revoke all on function public.security_addon_portal(uuid) from public;
revoke all on function public.request_security_addon_change(uuid,text,text,boolean) from public;
revoke all on function public.cancel_security_addon_request(uuid,uuid) from public;
revoke all on function public.admin_security_addon_configuration() from public;
revoke all on function public.admin_update_security_addon_link(text,text,text,boolean) from public;
revoke all on function public.admin_list_security_addon_requests(text) from public;
revoke all on function public.admin_review_security_addon_request(uuid,text,text,text) from public;

 grant execute on function public.security_base_plan_has_feature(uuid,text) to authenticated, service_role;
 grant execute on function public.security_has_active_addon(uuid,text) to authenticated, service_role;
 grant execute on function public.security_has_addon_feature(uuid,text) to authenticated, service_role;
 grant execute on function public.security_addon_portal(uuid) to authenticated;
 grant execute on function public.request_security_addon_change(uuid,text,text,boolean) to authenticated;
 grant execute on function public.cancel_security_addon_request(uuid,uuid) to authenticated;
 grant execute on function public.admin_security_addon_configuration() to authenticated;
 grant execute on function public.admin_update_security_addon_link(text,text,text,boolean) to authenticated;
 grant execute on function public.admin_list_security_addon_requests(text) to authenticated;
 grant execute on function public.admin_review_security_addon_request(uuid,text,text,text) to authenticated;

select public.sync_security_addon_modules(id)
from public.organizations
where business_type = 'securite';

notify pgrst, 'reload schema';
commit;
