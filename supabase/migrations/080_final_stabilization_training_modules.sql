-- NCR Suite V2.20.0 - Stabilisation finale et modules Formation a la carte
-- A executer apres 079_training_quality_compliance.sql.

begin;

create table if not exists public.training_module_catalog (
  module_key text primary key,
  display_name text not null,
  short_description text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  available_plans text[] not null default '{}',
  feature_keys text[] not null default '{}',
  prerequisite_modules text[] not null default '{}',
  organization_module_key text not null,
  icon_key text not null default 'graduation',
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_module_billing_links (
  module_key text primary key references public.training_module_catalog(module_key) on delete cascade,
  provider text not null default 'manual' check (provider in ('manual','qonto','stripe')),
  checkout_url text,
  active boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_training_modules (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_key text not null references public.training_module_catalog(module_key) on delete restrict,
  status text not null default 'active' check (status in ('active','inactive')),
  monthly_price_cents_snapshot integer not null default 0 check (monthly_price_cents_snapshot >= 0),
  provider text not null default 'manual' check (provider in ('manual','qonto','stripe')),
  provider_payment_reference text,
  activated_at timestamptz,
  deactivated_at timestamptz,
  activated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, module_key)
);

create table if not exists public.training_module_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_key text not null references public.training_module_catalog(module_key) on delete restrict,
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

create index if not exists idx_training_module_requests_open
  on public.training_module_change_requests(organization_id,status,created_at desc);
create unique index if not exists uq_training_module_requests_open
  on public.training_module_change_requests(organization_id,module_key)
  where status in ('payment_pending','pending_review');
create index if not exists idx_training_modules_active
  on public.organization_training_modules(organization_id,status);

insert into public.training_module_catalog (
  module_key,display_name,short_description,monthly_price_cents,
  available_plans,feature_keys,prerequisite_modules,organization_module_key,
  icon_key,sort_order,active
) values
  (
    'training_digital_attendance_addon','Emargement numerique',
    'Signatures numeriques, suivi des presences et PDF d emargement signe.',1490,
    array['decouverte'],array['training_digital_attendance','training_attendance_pdf'],
    array[]::text[],'training_digital_attendance','signature',10,true
  ),
  (
    'training_branding_addon','Identite documentaire',
    'Personnalisation des documents, des e-mails et de l identite commerciale.',1290,
    array['decouverte'],array['commercial_branding','training_document_branding','training_email_branding'],
    array[]::text[],'commercial_branding','sparkles',20,true
  ),
  (
    'training_evaluations_addon','Evaluations automatisees',
    'Evaluations initiales et finales, relances, syntheses et cloture automatisee.',990,
    array['decouverte','essentielle'],array['training_satisfaction'],
    array[]::text[],'evaluations','chart',30,true
  ),
  (
    'training_session_dossier_addon','Dossier complet de session',
    'Cockpit documentaire, controle des pieces et export du dossier de formation.',990,
    array['decouverte','essentielle'],array['training_session_dossier'],
    array[]::text[],'training_session_dossier','clipboard',40,true
  ),
  (
    'training_commercial_addon','CRM et cycle commercial',
    'Prospects, entreprises, financeurs, pipeline, relances, devis et conventions.',1490,
    array['decouverte','essentielle'],array['training_commercial'],
    array[]::text[],'training_commercial','users',50,true
  ),
  (
    'training_billing_addon','Facturation Formation',
    'Factures, avoirs, encaissements, echeances et relances automatiques.',1290,
    array['decouverte','essentielle'],array['training_billing'],
    array['training_commercial_addon'],'training_billing','creditCard',60,true
  ),
  (
    'training_bpf_addon','BPF automatique',
    'Preparation annuelle du bilan pedagogique et financier, controles et exports.',1290,
    array['decouverte','essentielle'],array['training_bpf'],
    array['training_billing_addon'],'training_bpf','file',70,true
  ),
  (
    'training_quality_addon','Qualiopi et conformite',
    'Referentiel, preuves, echeances, audits internes et dossier de preparation.',1290,
    array['decouverte','essentielle'],array['training_quality'],
    array[]::text[],'training_quality','shield',80,true
  ),
  (
    'training_multi_site_addon','Multi-etablissements',
    'Organisation des formations, sessions et equipes sur plusieurs etablissements.',790,
    array['decouverte','essentielle'],array['multi_site'],
    array[]::text[],'sites','building',90,true
  ),
  (
    'training_team_access_addon','Acces equipe et responsables',
    'Comptes collaborateurs, droits operationnels et role Responsable Formation.',990,
    array['decouverte','essentielle'],array['team_access','manager_role'],
    array[]::text[],'team_access','users',100,true
  )
on conflict(module_key) do update set
  display_name=excluded.display_name,
  short_description=excluded.short_description,
  monthly_price_cents=excluded.monthly_price_cents,
  available_plans=excluded.available_plans,
  feature_keys=excluded.feature_keys,
  prerequisite_modules=excluded.prerequisite_modules,
  organization_module_key=excluded.organization_module_key,
  icon_key=excluded.icon_key,
  sort_order=excluded.sort_order,
  active=excluded.active,
  updated_at=now();

insert into public.training_module_billing_links(module_key,provider,checkout_url,active)
select module_key,'manual',null,false
from public.training_module_catalog
on conflict(module_key) do nothing;

-- Deux cles distinctes evitent qu un module de base accorde par erreur une fonction premium.
insert into public.module_catalog (
  module_key,display_name,description,category,icon_key,
  compatible_business_types,core_module,default_enabled,sort_order
) values
  (
    'training_digital_attendance','Emargement numerique',
    'Signatures numeriques, presences et PDF d emargement signe.',
    'formation','signature','{formation}',false,false,525
  ),
  (
    'training_session_dossier','Dossier complet de session',
    'Cockpit documentaire et controle des pieces du dossier de formation.',
    'formation','clipboard','{formation}',false,false,530
  )
on conflict(module_key) do update set
  display_name=excluded.display_name,
  description=excluded.description,
  category=excluded.category,
  icon_key=excluded.icon_key,
  compatible_business_types=excluded.compatible_business_types,
  active=true,
  sort_order=excluded.sort_order,
  updated_at=now();

alter table public.training_module_catalog enable row level security;
alter table public.training_module_billing_links enable row level security;
alter table public.organization_training_modules enable row level security;
alter table public.training_module_change_requests enable row level security;

revoke all on public.training_module_catalog from anon,authenticated;
revoke all on public.training_module_billing_links from anon,authenticated;
revoke all on public.organization_training_modules from anon,authenticated;
revoke all on public.training_module_change_requests from anon,authenticated;

create or replace function public.training_base_plan_has_feature(
  p_organization_id uuid,
  p_feature text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((d.features->>p_feature)::boolean,false)
  from public.organizations o
  left join public.domain_plan_catalog d
    on d.business_type=o.business_type
   and d.plan_key=o.plan
   and d.active=true
  where o.id=p_organization_id
    and o.business_type='formation'
    and o.status in ('trial','active');
$$;

create or replace function public.training_has_active_module(
  p_organization_id uuid,
  p_module_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_training_modules m
    where m.organization_id=p_organization_id
      and m.module_key=p_module_key
      and m.status='active'
  );
$$;

create or replace function public.training_has_module_feature(
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
    from public.organization_training_modules m
    join public.training_module_catalog c on c.module_key=m.module_key
    where m.organization_id=p_organization_id
      and m.status='active'
      and c.active=true
      and p_feature=any(c.feature_keys)
  );
$$;

create or replace function public.training_module_is_effective(
  p_organization_id uuid,
  p_module_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.training_has_active_module(p_organization_id,p_module_key)
    or exists (
      select 1
      from public.training_module_catalog c
      where c.module_key=p_module_key
        and c.active=true
        and cardinality(c.feature_keys)>0
        and not exists (
          select 1
          from unnest(c.feature_keys) feature_key
          where not public.training_base_plan_has_feature(p_organization_id,feature_key)
        )
    );
$$;

-- Les modules Formation actifs completent la formule principale.
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
  select o.business_type,o.plan,o.status,coalesce(o.metier_modules_configured,false),d.features
  into v_business_type,v_plan,v_status,v_metier_modules_configured,v_features
  from public.organizations o
  left join public.domain_plan_catalog d
    on d.business_type=o.business_type
   and d.plan_key=o.plan
   and d.active=true
  where o.id=p_organization_id;

  if v_business_type is null or v_status not in ('trial','active') then return false; end if;

  if v_business_type='securite'
     and public.security_has_addon_feature(p_organization_id,p_feature) then return true; end if;

  if v_business_type='formation'
     and public.training_has_module_feature(p_organization_id,p_feature) then return true; end if;

  if not coalesce((v_features->>p_feature)::boolean,false) then return false; end if;

  if v_business_type='formation' and v_plan='metier' and v_metier_modules_configured then
    v_module_key := case p_feature
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

create or replace function public.sync_training_module_access(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalog record;
  v_enabled boolean;
begin
  if not exists (
    select 1 from public.organizations
    where id=p_organization_id and business_type='formation'
  ) then return; end if;

  -- Les offres Metier configurees restent exclusivement pilotees par leur contrat.
  if exists (
    select 1 from public.organizations
    where id=p_organization_id and plan='metier' and coalesce(metier_modules_configured,false)
  ) then return; end if;

  for v_catalog in
    select c.module_key,c.organization_module_key,c.feature_keys
    from public.training_module_catalog c
    where c.active=true
  loop
    v_enabled := public.training_has_active_module(p_organization_id,v_catalog.module_key)
      or (
        cardinality(v_catalog.feature_keys)>0
        and not exists (
          select 1 from unnest(v_catalog.feature_keys) feature_key
          where not public.training_base_plan_has_feature(p_organization_id,feature_key)
        )
      );

    insert into public.organization_modules(organization_id,module_key,enabled)
    values(p_organization_id,v_catalog.organization_module_key,v_enabled)
    on conflict(organization_id,module_key) do update
    set enabled=excluded.enabled,updated_at=now();
  end loop;
end;
$$;

create or replace function public.training_module_portal(p_organization_id uuid)
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
    raise exception 'Acces refuse.';
  end if;
  if not exists (
    select 1 from public.organizations
    where id=p_organization_id and business_type='formation'
  ) then raise exception 'Cette rubrique est reservee au metier Formation.'; end if;

  select jsonb_build_object(
    'organization_id',o.id,
    'plan',o.plan,
    'base_monthly_price_cents',d.monthly_price_cents,
    'active_modules_monthly_price_cents',coalesce((
      select sum(m.monthly_price_cents_snapshot)::integer
      from public.organization_training_modules m
      where m.organization_id=o.id and m.status='active'
    ),0),
    'pending_modules_monthly_delta_cents',coalesce((
      select sum(case
        when r.action='add' then c.monthly_price_cents
        else -coalesce((
          select m.monthly_price_cents_snapshot
          from public.organization_training_modules m
          where m.organization_id=o.id and m.module_key=r.module_key and m.status='active'
        ),0)
      end)::integer
      from public.training_module_change_requests r
      join public.training_module_catalog c on c.module_key=r.module_key
      where r.organization_id=o.id and r.status in ('payment_pending','pending_review')
    ),0),
    'next_plan',case o.plan
      when 'decouverte' then jsonb_build_object(
        'plan_key','essentielle',
        'display_name',coalesce((
          select display_name from public.domain_plan_catalog
          where business_type='formation' and plan_key='essentielle'
        ),'Essentielle'),
        'monthly_price_cents',coalesce((
          select monthly_price_cents from public.domain_plan_catalog
          where business_type='formation' and plan_key='essentielle'
        ),6990)
      )
      when 'essentielle' then jsonb_build_object(
        'plan_key','professionnelle',
        'display_name',coalesce((
          select display_name from public.domain_plan_catalog
          where business_type='formation' and plan_key='professionnelle'
        ),'Professionnelle'),
        'monthly_price_cents',coalesce((
          select monthly_price_cents from public.domain_plan_catalog
          where business_type='formation' and plan_key='professionnelle'
        ),9990)
      )
      else null
    end,
    'catalog',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'module_key',c.module_key,
        'display_name',c.display_name,
        'short_description',c.short_description,
        'monthly_price_cents',c.monthly_price_cents,
        'available_plans',c.available_plans,
        'feature_keys',c.feature_keys,
        'prerequisite_modules',c.prerequisite_modules,
        'icon_key',c.icon_key,
        'sort_order',c.sort_order,
        'active',public.training_has_active_module(o.id,c.module_key),
        'included_by_plan',cardinality(c.feature_keys)>0 and not exists (
          select 1 from unnest(c.feature_keys) feature_key
          where not public.training_base_plan_has_feature(o.id,feature_key)
        ),
        'available_for_plan',o.plan=any(c.available_plans),
        'prerequisites_met',not exists (
          select 1 from unnest(c.prerequisite_modules) prerequisite_key
          where not public.training_module_is_effective(o.id,prerequisite_key)
        ),
        'provider',coalesce(l.provider,'manual'),
        'checkout_active',coalesce(l.active,false),
        'checkout_url',l.checkout_url
      ) order by c.sort_order),'[]'::jsonb)
      from public.training_module_catalog c
      left join public.training_module_billing_links l on l.module_key=c.module_key
      where c.active=true
    ),
    'requests',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',r.id,'module_key',r.module_key,'action',r.action,'status',r.status,
        'provider',r.provider,'checkout_url_snapshot',r.checkout_url_snapshot,
        'request_reference',r.request_reference,'created_at',r.created_at
      ) order by r.created_at desc),'[]'::jsonb)
      from public.training_module_change_requests r
      where r.organization_id=o.id
        and r.status in ('payment_pending','pending_review')
    )
  ) into v_result
  from public.organizations o
  join public.domain_plan_catalog d
    on d.business_type=o.business_type and d.plan_key=o.plan
  where o.id=p_organization_id;

  return v_result;
end;
$$;

create or replace function public.request_training_module_change(
  p_organization_id uuid,
  p_module_key text,
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
  v_catalog public.training_module_catalog%rowtype;
  v_provider text := 'manual';
  v_checkout_url text;
  v_status text := 'pending_review';
  v_reference text;
  v_request_id uuid;
  v_terms_version text;
  v_dependency text;
  v_base_price integer := 0;
  v_active_price integer := 0;
  v_next_plan_price integer;
  v_next_plan_name text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Seul le proprietaire ou un administrateur peut gerer les modules.';
  end if;
  if not coalesce(p_accept_terms,false) then
    raise exception 'Vous devez accepter les conditions d abonnement.';
  end if;
  if p_action not in ('add','remove') then raise exception 'Action invalide.'; end if;

  select * into v_org from public.organizations where id=p_organization_id;
  if v_org.id is null or v_org.business_type<>'formation' then
    raise exception 'Entreprise Formation introuvable.';
  end if;
  if v_org.status not in ('trial','active') then
    raise exception 'L entreprise doit etre active pour modifier ses modules.';
  end if;

  select * into v_catalog
  from public.training_module_catalog
  where module_key=p_module_key and active=true;
  if v_catalog.module_key is null then raise exception 'Module introuvable.'; end if;

  if exists (
    select 1 from public.training_module_change_requests
    where organization_id=p_organization_id
      and module_key=p_module_key
      and status in ('payment_pending','pending_review')
  ) then raise exception 'Une demande est deja en cours pour ce module.'; end if;

  if p_action='add' then
    if not (v_org.plan=any(v_catalog.available_plans)) then
      raise exception 'Ce module n est pas disponible avec votre formule actuelle.';
    end if;
    if public.training_has_active_module(p_organization_id,p_module_key) then
      raise exception 'Ce module est deja actif.';
    end if;
    if cardinality(v_catalog.feature_keys)>0 and not exists (
      select 1 from unnest(v_catalog.feature_keys) feature_key
      where not public.training_base_plan_has_feature(p_organization_id,feature_key)
    ) then raise exception 'Ce module est deja inclus dans votre formule.'; end if;

    foreach v_dependency in array v_catalog.prerequisite_modules loop
      if not public.training_module_is_effective(p_organization_id,v_dependency) then
        raise exception 'Un module requis doit etre active avant celui-ci.';
      end if;
    end loop;

    select coalesce(l.provider,'manual'),l.checkout_url
    into v_provider,v_checkout_url
    from public.training_module_billing_links l
    where l.module_key=p_module_key and l.active=true;
    if v_checkout_url is not null then v_status:='payment_pending';
    else v_provider:='manual'; v_status:='pending_review'; end if;
  else
    if not public.training_has_active_module(p_organization_id,p_module_key) then
      raise exception 'Ce module n est pas actif.';
    end if;
    if exists (
      select 1
      from public.organization_training_modules m
      join public.training_module_catalog c on c.module_key=m.module_key
      where m.organization_id=p_organization_id
        and m.status='active'
        and p_module_key=any(c.prerequisite_modules)
    ) then raise exception 'Desactivez d abord les modules qui dependent de celui-ci.'; end if;
  end if;

  select terms_version into v_terms_version
  from public.platform_billing_settings where singleton=true;

  v_reference := 'NCR-FORM-MOD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));

  insert into public.training_module_change_requests(
    organization_id,module_key,action,status,provider,checkout_url_snapshot,
    request_reference,accepted_terms_at,terms_version,requested_by
  ) values (
    p_organization_id,p_module_key,p_action,v_status,v_provider,v_checkout_url,
    v_reference,now(),coalesce(v_terms_version,'initial'),auth.uid()
  ) returning id into v_request_id;

  select coalesce(d.monthly_price_cents,0) into v_base_price
  from public.domain_plan_catalog d
  where d.business_type='formation' and d.plan_key=v_org.plan;
  select coalesce(sum(monthly_price_cents_snapshot),0)::integer into v_active_price
  from public.organization_training_modules
  where organization_id=p_organization_id and status='active';

  if v_org.plan='decouverte' then
    select display_name,monthly_price_cents into v_next_plan_name,v_next_plan_price
    from public.domain_plan_catalog
    where business_type='formation' and plan_key='essentielle';
  elsif v_org.plan='essentielle' then
    select display_name,monthly_price_cents into v_next_plan_name,v_next_plan_price
    from public.domain_plan_catalog
    where business_type='formation' and plan_key='professionnelle';
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),'training.module_change_requested',
    'training_module_request',v_request_id::text,
    jsonb_build_object('module_key',p_module_key,'request_action',p_action,'status',v_status,'reference',v_reference)
  );

  return jsonb_build_object(
    'id',v_request_id,'status',v_status,'provider',v_provider,
    'checkout_url',v_checkout_url,'reference',v_reference,
    'projected_monthly_price_cents',v_base_price+v_active_price+
      case when p_action='add' then v_catalog.monthly_price_cents else -v_catalog.monthly_price_cents end,
    'next_plan_name',v_next_plan_name,
    'next_plan_monthly_price_cents',v_next_plan_price,
    'upgrade_recommended',v_next_plan_price is not null and
      v_base_price+v_active_price+
      case when p_action='add' then v_catalog.monthly_price_cents else -v_catalog.monthly_price_cents end
      >=v_next_plan_price
  );
end;
$$;

create or replace function public.cancel_training_module_request(
  p_organization_id uuid,
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Acces refuse.';
  end if;
  update public.training_module_change_requests
  set status='canceled',updated_at=now()
  where id=p_request_id and organization_id=p_organization_id
    and status in ('payment_pending','pending_review');
  if not found then raise exception 'Demande introuvable ou deja traitee.'; end if;
end;
$$;

create or replace function public.admin_training_module_configuration()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Acces administrateur NCR requis.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'module_key',c.module_key,'display_name',c.display_name,
    'short_description',c.short_description,'monthly_price_cents',c.monthly_price_cents,
    'available_plans',c.available_plans,'provider',coalesce(l.provider,'manual'),
    'checkout_url',l.checkout_url,'checkout_active',coalesce(l.active,false),
    'sort_order',c.sort_order
  ) order by c.sort_order),'[]'::jsonb)
  into v_result
  from public.training_module_catalog c
  left join public.training_module_billing_links l on l.module_key=c.module_key
  where c.active=true;
  return jsonb_build_object('modules',v_result);
end;
$$;

create or replace function public.admin_update_training_module_link(
  p_module_key text,
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
  v_url text := nullif(trim(coalesce(p_checkout_url,'')),'');
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut modifier les liens de paiement.';
  end if;
  if not exists (
    select 1 from public.training_module_catalog
    where module_key=p_module_key and active=true
  ) then raise exception 'Module invalide.'; end if;
  if p_provider not in ('manual','qonto','stripe') then raise exception 'Prestataire invalide.'; end if;
  if coalesce(p_active,false) and p_provider<>'manual' and v_url is null then
    raise exception 'Un lien de paiement est requis.';
  end if;
  if v_url is not null and v_url !~ '^https://[^[:space:]]+$' then
    raise exception 'URL de paiement invalide.';
  end if;

  insert into public.training_module_billing_links(module_key,provider,checkout_url,active,updated_by)
  values(p_module_key,p_provider,v_url,coalesce(p_active,false),auth.uid())
  on conflict(module_key) do update
  set provider=excluded.provider,checkout_url=excluded.checkout_url,
      active=excluded.active,updated_by=auth.uid(),updated_at=now();
end;
$$;

create or replace function public.admin_list_training_module_requests(p_status text default null)
returns table (
  id uuid,
  organization_id uuid,
  organization_name text,
  owner_email text,
  module_key text,
  module_name text,
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
  select r.id,r.organization_id,o.name,
    (
      select u.email::text
      from public.organization_members m
      join auth.users u on u.id=m.user_id
      where m.organization_id=o.id and m.role='owner' and m.status='active'
      order by m.created_at limit 1
    ),
    r.module_key,c.display_name,r.action,r.status,r.provider,
    r.request_reference,r.provider_payment_reference,r.created_at,r.review_note
  from public.training_module_change_requests r
  join public.organizations o on o.id=r.organization_id
  join public.training_module_catalog c on c.module_key=r.module_key
  where public.is_platform_admin()
    and (p_status is null or r.status=p_status)
  order by case when r.status in ('payment_pending','pending_review') then 0 else 1 end,
           r.created_at desc;
$$;

create or replace function public.admin_review_training_module_request(
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
  v_request public.training_module_change_requests%rowtype;
  v_catalog public.training_module_catalog%rowtype;
  v_org public.organizations%rowtype;
  v_dependency text;
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut traiter les demandes.';
  end if;
  if p_decision not in ('approve','reject') then raise exception 'Decision invalide.'; end if;

  select * into v_request
  from public.training_module_change_requests
  where id=p_request_id for update;
  if v_request.id is null or v_request.status not in ('payment_pending','pending_review') then
    raise exception 'Demande introuvable ou deja traitee.';
  end if;
  select * into v_catalog from public.training_module_catalog where module_key=v_request.module_key;
  select * into v_org from public.organizations where id=v_request.organization_id;

  if p_decision='approve' then
    if v_request.action='add' then
      if not (v_org.plan=any(v_catalog.available_plans)) then
        raise exception 'La formule a change : ce module ne peut plus etre active.';
      end if;
      if cardinality(v_catalog.feature_keys)>0 and not exists (
        select 1 from unnest(v_catalog.feature_keys) feature_key
        where not public.training_base_plan_has_feature(v_request.organization_id,feature_key)
      ) then raise exception 'Ce module est maintenant inclus dans la formule.'; end if;
      foreach v_dependency in array v_catalog.prerequisite_modules loop
        if not public.training_module_is_effective(v_request.organization_id,v_dependency) then
          raise exception 'Un module requis doit etre active avant celui-ci.';
        end if;
      end loop;

      insert into public.organization_training_modules(
        organization_id,module_key,status,monthly_price_cents_snapshot,
        provider,provider_payment_reference,activated_at,deactivated_at,
        activated_by,updated_at
      ) values (
        v_request.organization_id,v_request.module_key,'active',v_catalog.monthly_price_cents,
        v_request.provider,nullif(trim(coalesce(p_provider_payment_reference,'')),''),now(),null,
        auth.uid(),now()
      )
      on conflict(organization_id,module_key) do update
      set status='active',monthly_price_cents_snapshot=excluded.monthly_price_cents_snapshot,
          provider=excluded.provider,provider_payment_reference=excluded.provider_payment_reference,
          activated_at=now(),deactivated_at=null,activated_by=auth.uid(),updated_at=now();
    else
      if exists (
        select 1
        from public.organization_training_modules m
        join public.training_module_catalog c on c.module_key=m.module_key
        where m.organization_id=v_request.organization_id
          and m.status='active'
          and v_request.module_key=any(c.prerequisite_modules)
      ) then raise exception 'Desactivez d abord les modules dependants.'; end if;

      update public.organization_training_modules
      set status='inactive',deactivated_at=now(),updated_at=now()
      where organization_id=v_request.organization_id and module_key=v_request.module_key;
    end if;

    update public.training_module_change_requests
    set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),
        review_note=nullif(trim(coalesce(p_note,'')),''),
        provider_payment_reference=nullif(trim(coalesce(p_provider_payment_reference,'')),''),
        updated_at=now()
    where id=v_request.id;

    perform public.sync_training_module_access(v_request.organization_id);
  else
    update public.training_module_change_requests
    set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),
        review_note=nullif(trim(coalesce(p_note,'')),''),updated_at=now()
    where id=v_request.id;
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    v_request.organization_id,auth.uid(),
    case when p_decision='approve' then 'training.module_change_approved' else 'training.module_change_rejected' end,
    'training_module_request',v_request.id::text,
    jsonb_build_object('module_key',v_request.module_key,'request_action',v_request.action,'decision',p_decision)
  );
end;
$$;

create or replace function public.reconcile_training_modules_after_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module record;
begin
  if new.business_type='formation' and old.plan is distinct from new.plan then
    for v_module in
      select m.module_key,c.feature_keys,c.available_plans
      from public.organization_training_modules m
      join public.training_module_catalog c on c.module_key=m.module_key
      where m.organization_id=new.id and m.status='active'
    loop
      if not (new.plan=any(v_module.available_plans))
         or (
           cardinality(v_module.feature_keys)>0
           and not exists (
             select 1 from unnest(v_module.feature_keys) feature_key
             where not public.training_base_plan_has_feature(new.id,feature_key)
           )
         ) then
        update public.organization_training_modules
        set status='inactive',deactivated_at=now(),updated_at=now()
        where organization_id=new.id and module_key=v_module.module_key;
      end if;
    end loop;

    update public.training_module_change_requests r
    set status='canceled',review_note='Annulee automatiquement apres changement de formule.',updated_at=now()
    from public.training_module_catalog c
    where r.organization_id=new.id
      and r.module_key=c.module_key
      and r.status in ('payment_pending','pending_review')
      and (
        not (new.plan=any(c.available_plans))
        or (
          cardinality(c.feature_keys)>0
          and not exists (
            select 1 from unnest(c.feature_keys) feature_key
            where not public.training_base_plan_has_feature(new.id,feature_key)
          )
        )
      );

    perform public.sync_training_module_access(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists reconcile_training_modules_plan_trigger on public.organizations;
create trigger reconcile_training_modules_plan_trigger
after update of plan on public.organizations
for each row execute procedure public.reconcile_training_modules_after_plan_change();

-- Rapport transversal utilise par la supervision NCR.
create or replace function public.platform_release_readiness_report()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_without_owner integer;
  v_unknown_modules integer;
  v_duplicate_training_modules integer;
  v_old_training_requests integer;
  v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Acces administrateur NCR requis.'; end if;

  select count(*)::integer into v_without_owner
  from public.organizations o
  where o.status in ('trial','active')
    and not exists (
      select 1 from public.organization_members m
      where m.organization_id=o.id and m.role='owner' and m.status='active'
    );

  select count(*)::integer into v_unknown_modules
  from public.organization_modules m
  left join public.module_catalog c on c.module_key=m.module_key
  where c.module_key is null;

  select count(*)::integer into v_duplicate_training_modules
  from public.organization_training_modules m
  join public.training_module_catalog c on c.module_key=m.module_key
  where m.status='active'
    and cardinality(c.feature_keys)>0
    and not exists (
      select 1 from unnest(c.feature_keys) feature_key
      where not public.training_base_plan_has_feature(m.organization_id,feature_key)
    );

  select count(*)::integer into v_old_training_requests
  from public.training_module_change_requests
  where status in ('payment_pending','pending_review')
    and created_at<now()-interval '7 days';

  v_result := jsonb_build_object(
    'generated_at',now(),
    'ready',v_without_owner=0 and v_unknown_modules=0 and v_duplicate_training_modules=0,
    'summary',jsonb_build_object(
      'active_organizations',(select count(*) from public.organizations where status in ('trial','active')),
      'organizations_without_owner',v_without_owner,
      'unknown_organization_modules',v_unknown_modules,
      'duplicate_training_modules',v_duplicate_training_modules,
      'old_training_module_requests',v_old_training_requests
    ),
    'checks',jsonb_build_array(
      jsonb_build_object(
        'key','organization_owners','label','Proprietaires des entreprises',
        'status',case when v_without_owner=0 then 'ok' else 'error' end,
        'detail',case when v_without_owner=0 then 'Chaque entreprise active possede un proprietaire.'
          else v_without_owner||' entreprise(s) active(s) sans proprietaire.' end
      ),
      jsonb_build_object(
        'key','module_catalog','label','Integrite du catalogue de modules',
        'status',case when v_unknown_modules=0 then 'ok' else 'error' end,
        'detail',case when v_unknown_modules=0 then 'Toutes les activations referencent le catalogue.'
          else v_unknown_modules||' activation(s) sans module catalogue.' end
      ),
      jsonb_build_object(
        'key','training_module_billing','label','Facturation des modules Formation',
        'status',case when v_duplicate_training_modules=0 then 'ok' else 'error' end,
        'detail',case when v_duplicate_training_modules=0 then 'Aucun supplement deja inclus par une formule.'
          else v_duplicate_training_modules||' supplement(s) Formation deja inclus a regulariser.' end
      ),
      jsonb_build_object(
        'key','training_module_requests','label','Demandes Formation en attente',
        'status',case when v_old_training_requests=0 then 'ok' else 'warning' end,
        'detail',case when v_old_training_requests=0 then 'Aucune demande de plus de 7 jours.'
          else v_old_training_requests||' demande(s) depassent 7 jours.' end
      )
    ),
    'domains',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'business_type',business_type,'organizations',organization_count
      ) order by business_type),'[]'::jsonb)
      from (
        select business_type,count(*)::integer organization_count
        from public.organizations
        where status in ('trial','active')
        group by business_type
      ) domain_counts
    )
  );
  return v_result;
end;
$$;

revoke all on function public.training_base_plan_has_feature(uuid,text) from public;
revoke all on function public.training_has_active_module(uuid,text) from public;
revoke all on function public.training_has_module_feature(uuid,text) from public;
revoke all on function public.training_module_is_effective(uuid,text) from public;
revoke all on function public.sync_training_module_access(uuid) from public;
revoke all on function public.training_module_portal(uuid) from public;
revoke all on function public.request_training_module_change(uuid,text,text,boolean) from public;
revoke all on function public.cancel_training_module_request(uuid,uuid) from public;
revoke all on function public.admin_training_module_configuration() from public;
revoke all on function public.admin_update_training_module_link(text,text,text,boolean) from public;
revoke all on function public.admin_list_training_module_requests(text) from public;
revoke all on function public.admin_review_training_module_request(uuid,text,text,text) from public;
revoke all on function public.platform_release_readiness_report() from public;

grant execute on function public.training_base_plan_has_feature(uuid,text) to authenticated,service_role;
grant execute on function public.training_has_active_module(uuid,text) to authenticated,service_role;
grant execute on function public.training_has_module_feature(uuid,text) to authenticated,service_role;
grant execute on function public.training_module_is_effective(uuid,text) to authenticated,service_role;
grant execute on function public.sync_training_module_access(uuid) to service_role;
grant execute on function public.training_module_portal(uuid) to authenticated;
grant execute on function public.request_training_module_change(uuid,text,text,boolean) to authenticated;
grant execute on function public.cancel_training_module_request(uuid,uuid) to authenticated;
grant execute on function public.admin_training_module_configuration() to authenticated;
grant execute on function public.admin_update_training_module_link(text,text,text,boolean) to authenticated;
grant execute on function public.admin_list_training_module_requests(text) to authenticated;
grant execute on function public.admin_review_training_module_request(uuid,text,text,text) to authenticated;
grant execute on function public.platform_release_readiness_report() to authenticated;

-- Preserve les choix Metier existants lors de la separation des deux cles premium.
insert into public.organization_modules(organization_id,module_key,enabled)
select
  o.id,
  module_data.module_key,
  case
    when o.plan='metier' and coalesce(o.metier_modules_configured,false) then coalesce(source.enabled,false)
    when module_data.module_key='training_digital_attendance'
      then public.training_base_plan_has_feature(o.id,'training_digital_attendance')
    else public.training_base_plan_has_feature(o.id,'training_session_dossier')
  end
from public.organizations o
cross join (values
  ('training_digital_attendance','attendance'),
  ('training_session_dossier','documents')
) module_data(module_key,source_module_key)
left join public.organization_modules source
  on source.organization_id=o.id and source.module_key=module_data.source_module_key
where o.business_type='formation'
on conflict(organization_id,module_key) do update
set enabled=excluded.enabled,updated_at=now();

select public.sync_training_module_access(id)
from public.organizations
where business_type='formation'
  and not (plan='metier' and coalesce(metier_modules_configured,false));

insert into public.platform_release_state (
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.20.0','2.20.0','ncr-suite-shell-v2.20.0-final-stabilization',
  now(),auth.uid(),
  'V2.20.0 : stabilisation multi-metiers, controle de preparation, modules Formation a la carte et recommandation automatique de montee en gamme.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;
