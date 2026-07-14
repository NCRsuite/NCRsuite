-- NCR Suite V2.3.0 — offre Métier : établissements, modules, rôles, marque blanche et contrat sur mesure
-- À exécuter après 012_qonto_billing_portal.sql.

alter table public.organizations
  add column if not exists metier_setup_fee_cents integer not null default 0,
  add column if not exists metier_member_limit integer,
  add column if not exists metier_site_limit integer,
  add column if not exists metier_storage_limit_mb integer,
  add column if not exists metier_contract_reference text,
  add column if not exists metier_modules_configured boolean not null default false,
  add column if not exists white_label_enabled boolean not null default false,
  add column if not exists custom_domain text,
  add column if not exists custom_domain_status text not null default 'not_configured',
  add column if not exists custom_domain_verified_at timestamptz;

create unique index if not exists idx_organizations_custom_domain_unique
  on public.organizations (lower(custom_domain))
  where custom_domain is not null;

create table if not exists public.module_catalog (
  module_key text primary key,
  display_name text not null,
  description text not null default '',
  category text not null default 'general',
  icon_key text not null default 'briefcase',
  compatible_business_types text[] not null default '{}'::text[],
  core_module boolean not null default false,
  default_enabled boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, sort_order
)
values
  ('dashboard', 'Tableau de bord', 'Vue d’ensemble de l’activité.', 'socle', 'home', '{}', true, true, 10),
  ('subscription', 'Abonnement', 'Formule, utilisation et demandes de changement.', 'socle', 'creditCard', '{}', true, true, 20),
  ('settings', 'Paramètres', 'Réglages généraux de l’entreprise.', 'socle', 'settings', '{}', true, true, 30),
  ('appointments', 'Rendez-vous', 'Planning et gestion des rendez-vous.', 'relation-client', 'calendar', '{coiffure}', false, true, 100),
  ('clients', 'Clients', 'Fichier clients et historique.', 'relation-client', 'users', '{coiffure,artisan}', false, true, 110),
  ('services', 'Prestations', 'Catalogue des prestations, durées et tarifs.', 'relation-client', 'sparkles', '{coiffure}', false, true, 120),
  ('staff', 'Collaborateurs', 'Profils, horaires et disponibilités.', 'equipe', 'briefcase', '{coiffure}', false, true, 130),
  ('team_access', 'Accès équipe', 'Comptes utilisateurs et permissions.', 'equipe', 'users', '{}', false, true, 140),
  ('commercial_branding', 'Personnalisation', 'Logo, couleurs et identité client.', 'identite', 'sparkles', '{}', false, true, 150),
  ('loyalty', 'Fidélité', 'Programme de fidélité et avantages.', 'relation-client', 'chart', '{coiffure}', false, false, 160),
  ('planning', 'Planning', 'Planification des équipes et missions.', 'operations', 'calendar', '{nettoyage,securite,artisan}', false, true, 200),
  ('agents', 'Agents', 'Gestion des agents et intervenants.', 'equipe', 'users', '{nettoyage,securite}', false, true, 210),
  ('sites', 'Sites clients', 'Établissements, sites et lieux d’intervention.', 'operations', 'map', '{nettoyage,securite}', false, true, 220),
  ('interventions', 'Interventions', 'Suivi des interventions et missions.', 'operations', 'clipboard', '{nettoyage,artisan}', false, true, 230),
  ('reports', 'Rapports', 'Comptes rendus et rapports d’activité.', 'operations', 'file', '{nettoyage,securite,artisan}', false, true, 240),
  ('anomalies', 'Anomalies', 'Signalements et suivi des anomalies.', 'operations', 'alert', '{nettoyage}', false, false, 250),
  ('shifts', 'Prises de poste', 'Prises et fins de poste horodatées.', 'securite', 'activity', '{securite}', false, true, 300),
  ('logbook', 'Main courante', 'Événements et main courante numérique.', 'securite', 'clipboard', '{securite}', false, true, 310),
  ('patrols', 'Rondes', 'Parcours, points de contrôle et validations.', 'securite', 'shield', '{securite}', false, true, 320),
  ('alerts', 'Alertes', 'Alertes prioritaires et prise en charge.', 'securite', 'alert', '{securite}', false, true, 330),
  ('documents', 'Documents', 'Documents internes et opérationnels.', 'documents', 'file', '{securite,formation,artisan}', false, true, 400),
  ('trainees', 'Stagiaires', 'Gestion des stagiaires.', 'formation', 'users', '{formation}', false, true, 500),
  ('trainers', 'Formateurs', 'Gestion des formateurs.', 'formation', 'briefcase', '{formation}', false, true, 510),
  ('sessions', 'Sessions', 'Planification des sessions de formation.', 'formation', 'calendar', '{formation}', false, true, 520),
  ('attendance', 'Émargements', 'Présences et signatures.', 'formation', 'signature', '{formation}', false, true, 530),
  ('certificates', 'Attestations', 'Attestations et certificats.', 'formation', 'graduation', '{formation}', false, true, 540),
  ('quotes', 'Devis', 'Création et suivi des devis.', 'artisan', 'file', '{artisan}', false, true, 600)
on conflict (module_key) do update
set display_name = excluded.display_name,
    description = excluded.description,
    category = excluded.category,
    icon_key = excluded.icon_key,
    compatible_business_types = excluded.compatible_business_types,
    core_module = excluded.core_module,
    default_enabled = excluded.default_enabled,
    active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

alter table public.organization_modules
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists configured_by uuid references auth.users(id) on delete set null;

create table if not exists public.organization_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  address text,
  postal_code text,
  city text,
  phone text,
  email text,
  timezone text not null default 'Europe/Paris',
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create unique index if not exists idx_organization_sites_primary
  on public.organization_sites (organization_id)
  where is_primary = true and status = 'active';
create index if not exists idx_organization_sites_org_status
  on public.organization_sites (organization_id, status, name);

create table if not exists public.organization_custom_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_key text not null,
  label text not null,
  base_role text not null check (base_role in ('manager','employee','viewer')),
  module_keys text[] not null default '{}'::text[],
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, role_key),
  unique (organization_id, id)
);

alter table public.organization_members
  add column if not exists custom_role_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organization_members_custom_role_fk'
  ) then
    alter table public.organization_members
      add constraint organization_members_custom_role_fk
      foreign key (custom_role_id)
      references public.organization_custom_roles(id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_organization_members_custom_role
  on public.organization_members (organization_id, custom_role_id)
  where custom_role_id is not null;

create or replace function public.set_metier_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_module_catalog_updated_at on public.module_catalog;
create trigger set_module_catalog_updated_at before update on public.module_catalog
for each row execute procedure public.set_metier_updated_at();

drop trigger if exists set_organization_modules_metier_updated_at on public.organization_modules;
create trigger set_organization_modules_metier_updated_at before update on public.organization_modules
for each row execute procedure public.set_metier_updated_at();

drop trigger if exists set_organization_sites_updated_at on public.organization_sites;
create trigger set_organization_sites_updated_at before update on public.organization_sites
for each row execute procedure public.set_metier_updated_at();

drop trigger if exists set_organization_custom_roles_updated_at on public.organization_custom_roles;
create trigger set_organization_custom_roles_updated_at before update on public.organization_custom_roles
for each row execute procedure public.set_metier_updated_at();

create or replace function public.enforce_white_label_entitlement()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.white_label_enabled = false then
    new.show_ncr_branding := true;
  end if;
  if new.show_ncr_branding = false and new.white_label_enabled = false then
    raise exception 'La marque blanche doit être activée par NCR avant de masquer la signature NCR Suite.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_white_label_entitlement_trigger on public.organizations;
create trigger enforce_white_label_entitlement_trigger
before insert or update of white_label_enabled, show_ncr_branding on public.organizations
for each row execute procedure public.enforce_white_label_entitlement();

alter table public.module_catalog enable row level security;
alter table public.organization_sites enable row level security;
alter table public.organization_custom_roles enable row level security;

revoke all on public.module_catalog from anon, authenticated;
revoke all on public.organization_sites from anon, authenticated;
revoke all on public.organization_custom_roles from anon, authenticated;

drop policy if exists "module_catalog_authenticated_select" on public.module_catalog;
create policy "module_catalog_authenticated_select" on public.module_catalog
for select to authenticated using (active = true);

drop policy if exists "organization_sites_member_select" on public.organization_sites;
create policy "organization_sites_member_select" on public.organization_sites
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "organization_custom_roles_member_select" on public.organization_custom_roles;
create policy "organization_custom_roles_member_select" on public.organization_custom_roles
for select to authenticated using (public.is_org_member(organization_id));

grant select on public.module_catalog to authenticated;
grant select on public.organization_sites to authenticated;
grant select on public.organization_custom_roles to authenticated;

-- En offre Métier, les modules font partie du contrat et ne peuvent pas être
-- modifiés directement par l'entreprise. Les offres standard conservent le
-- comportement historique.
drop policy if exists "modules_admin_manage" on public.organization_modules;
drop policy if exists "modules_admin_manage_standard" on public.organization_modules;
create policy "modules_admin_manage_standard" on public.organization_modules
for all to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin'])
  and exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.plan <> 'metier'
  )
)
with check (
  public.has_org_role(organization_id, array['owner','admin'])
  and exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.plan <> 'metier'
  )
);

create or replace function public.organization_metier_member_limit(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when o.plan = 'metier' then greatest(1, least(100, coalesce(o.metier_member_limit, 100)))
    else public.plan_member_limit(o.plan)
  end
  from public.organizations o
  where o.id = p_organization_id;
$$;

create or replace function public.enforce_metier_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_active integer;
  v_pending integer;
  v_pending_for_user integer := 0;
begin
  select plan into v_plan from public.organizations where id = new.organization_id;
  if v_plan <> 'metier' then
    return new;
  end if;

  v_limit := public.organization_metier_member_limit(new.organization_id);

  if tg_table_name = 'organization_members' and new.status = 'active' then
    select count(*)::integer into v_active
    from public.organization_members m
    where m.organization_id = new.organization_id
      and m.status = 'active'
      and (tg_op = 'INSERT' or m.user_id <> new.user_id);

    select count(*)::integer into v_pending
    from public.organization_invitations i
    where i.organization_id = new.organization_id
      and i.status = 'pending';

    select count(*)::integer into v_pending_for_user
    from public.organization_invitations i
    join auth.users u on lower(u.email::text) = lower(i.email)
    where i.organization_id = new.organization_id
      and i.status = 'pending'
      and u.id = new.user_id;

    v_pending := greatest(v_pending - v_pending_for_user, 0);

    if v_active + v_pending + 1 > v_limit then
      raise exception 'La limite personnalisée de % accès est atteinte.', v_limit;
    end if;
  elsif tg_table_name = 'organization_invitations' and new.status = 'pending' then
    select count(*)::integer into v_active
    from public.organization_members m
    where m.organization_id = new.organization_id and m.status = 'active';

    select count(*)::integer into v_pending
    from public.organization_invitations i
    where i.organization_id = new.organization_id
      and i.status = 'pending'
      and (tg_op = 'INSERT' or i.id <> new.id);

    if v_active + v_pending + 1 > v_limit then
      raise exception 'La limite personnalisée de % accès est atteinte.', v_limit;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_metier_member_limit_members on public.organization_members;
create trigger enforce_metier_member_limit_members
before insert or update of status on public.organization_members
for each row execute procedure public.enforce_metier_member_limit();

drop trigger if exists enforce_metier_member_limit_invitations on public.organization_invitations;
create trigger enforce_metier_member_limit_invitations
before insert or update of status on public.organization_invitations
for each row execute procedure public.enforce_metier_member_limit();

create or replace function public.team_plan_summary(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_active integer;
  v_pending integer;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  select o.plan, m.role
  into v_plan, v_role
  from public.organizations o
  join public.organization_members m on m.organization_id = o.id
  where o.id = p_organization_id
    and m.user_id = auth.uid()
    and m.status = 'active';

  if v_plan is null then
    raise exception 'Entreprise inaccessible.';
  end if;

  v_limit := public.organization_metier_member_limit(p_organization_id);

  select count(*)::integer into v_active
  from public.organization_members
  where organization_id = p_organization_id and status = 'active';

  select count(*)::integer into v_pending
  from public.organization_invitations
  where organization_id = p_organization_id and status = 'pending';

  return jsonb_build_object(
    'plan', v_plan,
    'member_limit', v_limit,
    'active_members', v_active,
    'pending_invitations', v_pending,
    'available_seats', greatest(v_limit - v_active - v_pending, 0),
    'invitations_enabled', public.plan_rank(v_plan) >= public.plan_rank('essentielle'),
    'current_role', v_role
  );
end;
$$;

create or replace function public.metier_workspace_summary(p_organization_id uuid)
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
    raise exception 'Accès à l’entreprise requis.';
  end if;

  if not exists (select 1 from public.organizations where id = p_organization_id and plan = 'metier') then
    raise exception 'Cette configuration est réservée à l’offre Métier.';
  end if;

  select jsonb_build_object(
    'organization', jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'business_type', o.business_type,
      'member_limit', public.organization_metier_member_limit(o.id),
      'site_limit', greatest(1, least(50, coalesce(o.metier_site_limit, 5))),
      'storage_limit_mb', greatest(100, least(100000, coalesce(o.metier_storage_limit_mb, 5000))),
      'setup_fee_cents', greatest(0, coalesce(o.metier_setup_fee_cents, 0)),
      'contract_reference', o.metier_contract_reference,
      'white_label_enabled', o.white_label_enabled,
      'custom_domain', o.custom_domain,
      'custom_domain_status', o.custom_domain_status,
      'custom_domain_verified_at', o.custom_domain_verified_at,
      'modules_configured', o.metier_modules_configured,
      'show_ncr_branding', o.show_ncr_branding
    ),
    'usage', jsonb_build_object(
      'active_members', (select count(*) from public.organization_members m where m.organization_id = o.id and m.status = 'active'),
      'active_sites', (select count(*) from public.organization_sites s where s.organization_id = o.id and s.status = 'active'),
      'custom_roles', (select count(*) from public.organization_custom_roles r where r.organization_id = o.id and r.active = true),
      'enabled_modules', (select count(*) from public.organization_modules om where om.organization_id = o.id and om.enabled = true)
    ),
    'sites', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'code', s.code,
        'address', s.address,
        'postal_code', s.postal_code,
        'city', s.city,
        'phone', s.phone,
        'email', s.email,
        'timezone', s.timezone,
        'is_primary', s.is_primary,
        'status', s.status,
        'created_at', s.created_at
      ) order by s.is_primary desc, s.name), '[]'::jsonb)
      from public.organization_sites s
      where s.organization_id = o.id and s.status <> 'archived'
    ),
    'modules', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'module_key', c.module_key,
        'display_name', c.display_name,
        'description', c.description,
        'category', c.category,
        'icon_key', c.icon_key,
        'enabled', case
          when o.metier_modules_configured then coalesce(om.enabled, false)
          else c.default_enabled or c.core_module
        end,
        'core_module', c.core_module
      ) order by c.category, c.sort_order, c.display_name), '[]'::jsonb)
      from public.module_catalog c
      left join public.organization_modules om
        on om.organization_id = o.id and om.module_key = c.module_key
      where c.active = true
        and (cardinality(c.compatible_business_types) = 0 or o.business_type = any(c.compatible_business_types))
    ),
    'roles', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'role_key', r.role_key,
        'label', r.label,
        'base_role', r.base_role,
        'module_keys', r.module_keys,
        'active', r.active
      ) order by r.label), '[]'::jsonb)
      from public.organization_custom_roles r
      where r.organization_id = o.id and r.active = true
    ),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', m.user_id,
        'full_name', coalesce(nullif(trim(p.full_name), ''), split_part(u.email::text, '@', 1)),
        'email', u.email::text,
        'role', m.role,
        'custom_role_id', m.custom_role_id,
        'status', m.status
      ) order by coalesce(nullif(trim(p.full_name), ''), u.email::text)), '[]'::jsonb)
      from public.organization_members m
      join auth.users u on u.id = m.user_id
      left join public.user_profiles p on p.id = m.user_id
      where m.organization_id = o.id and m.status = 'active'
    )
  ) into v_result
  from public.organizations o
  where o.id = p_organization_id;

  return v_result;
end;
$$;

create or replace function public.metier_upsert_site(
  p_organization_id uuid,
  p_site_id uuid,
  p_name text,
  p_code text,
  p_address text,
  p_postal_code text,
  p_city text,
  p_phone text,
  p_email text,
  p_timezone text,
  p_is_primary boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_limit integer;
  v_count integer;
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_primary boolean := coalesce(p_is_primary, false);
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seul le propriétaire ou un administrateur peut gérer les établissements.';
  end if;

  select greatest(1, least(50, coalesce(metier_site_limit, 5)))
  into v_limit
  from public.organizations
  where id = p_organization_id and plan = 'metier' and status in ('trial','active');

  if v_limit is null then
    raise exception 'Offre Métier active requise.';
  end if;

  if v_name is null or char_length(v_name) > 120 then
    raise exception 'Le nom de l’établissement est invalide.';
  end if;

  if p_email is not null and trim(p_email) <> '' and trim(p_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'L’adresse e-mail est invalide.';
  end if;

  if p_site_id is null then
    select count(*)::integer into v_count
    from public.organization_sites
    where organization_id = p_organization_id and status <> 'archived';
    if v_count >= v_limit then
      raise exception 'La limite de % établissements est atteinte.', v_limit;
    end if;
    if v_count = 0 then v_primary := true; end if;
    v_id := gen_random_uuid();
  else
    v_id := p_site_id;
    if not exists (select 1 from public.organization_sites where id = v_id and organization_id = p_organization_id) then
      raise exception 'Établissement introuvable.';
    end if;
  end if;

  if v_primary then
    update public.organization_sites
    set is_primary = false
    where organization_id = p_organization_id and id <> v_id;
  end if;

  insert into public.organization_sites (
    id, organization_id, name, code, address, postal_code, city, phone, email,
    timezone, is_primary, status, created_by
  ) values (
    v_id, p_organization_id, v_name, nullif(trim(coalesce(p_code, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''), nullif(trim(coalesce(p_postal_code, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''), nullif(trim(coalesce(p_phone, '')), ''),
    nullif(lower(trim(coalesce(p_email, ''))), ''), coalesce(nullif(trim(coalesce(p_timezone, '')), ''), 'Europe/Paris'),
    v_primary, 'active', auth.uid()
  )
  on conflict (id) do update
  set name = excluded.name,
      code = excluded.code,
      address = excluded.address,
      postal_code = excluded.postal_code,
      city = excluded.city,
      phone = excluded.phone,
      email = excluded.email,
      timezone = excluded.timezone,
      is_primary = excluded.is_primary,
      status = 'active',
      updated_at = now();

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'metier.site_saved', 'organization_site', v_id::text, jsonb_build_object('name', v_name, 'primary', v_primary));

  return v_id;
end;
$$;

create or replace function public.metier_set_site_status(
  p_organization_id uuid,
  p_site_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_primary boolean;
  v_next_primary uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Droits insuffisants.';
  end if;
  if p_status not in ('active','inactive','archived') then
    raise exception 'Statut invalide.';
  end if;

  select is_primary into v_was_primary
  from public.organization_sites
  where id = p_site_id and organization_id = p_organization_id;
  if v_was_primary is null then raise exception 'Établissement introuvable.'; end if;

  update public.organization_sites
  set status = p_status,
      is_primary = case when p_status = 'active' then is_primary else false end,
      updated_at = now()
  where id = p_site_id and organization_id = p_organization_id;

  if v_was_primary and p_status <> 'active' then
    select id into v_next_primary
    from public.organization_sites
    where organization_id = p_organization_id and status = 'active' and id <> p_site_id
    order by created_at
    limit 1;
    if v_next_primary is not null then
      update public.organization_sites set is_primary = true where id = v_next_primary;
    end if;
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'metier.site_status_updated', 'organization_site', p_site_id::text, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.metier_set_module(
  p_organization_id uuid,
  p_module_key text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_core boolean;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur NCR peut modifier les modules contractuels.';
  end if;
  if not exists (select 1 from public.organizations where id = p_organization_id and plan = 'metier' and status in ('trial','active')) then
    raise exception 'Offre Métier active requise.';
  end if;

  select c.core_module into v_core
  from public.module_catalog c
  join public.organizations o on o.id = p_organization_id
  where c.module_key = p_module_key
    and c.active = true
    and (cardinality(c.compatible_business_types) = 0 or o.business_type = any(c.compatible_business_types));
  if v_core is null then raise exception 'Module inconnu.'; end if;
  if v_core and not p_enabled then raise exception 'Ce module fait partie du socle obligatoire.'; end if;

  insert into public.organization_modules (organization_id, module_key, enabled, configured_by)
  values (p_organization_id, p_module_key, coalesce(p_enabled, false), auth.uid())
  on conflict (organization_id, module_key) do update
  set enabled = excluded.enabled,
      configured_by = auth.uid(),
      updated_at = now();

  update public.organizations
  set metier_modules_configured = true, updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'metier.module_updated', 'organization_module', p_module_key, jsonb_build_object('enabled', p_enabled));
end;
$$;

create or replace function public.metier_upsert_custom_role(
  p_organization_id uuid,
  p_role_id uuid,
  p_label text,
  p_base_role text,
  p_module_keys text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_label text := nullif(trim(coalesce(p_label, '')), '');
  v_keys text[] := coalesce(p_module_keys, '{}'::text[]);
  v_count integer;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Droits insuffisants.';
  end if;
  if not exists (select 1 from public.organizations where id = p_organization_id and plan = 'metier' and status in ('trial','active')) then
    raise exception 'Offre Métier active requise.';
  end if;
  if v_label is null or char_length(v_label) > 80 then raise exception 'Le nom du rôle est invalide.'; end if;
  if p_base_role not in ('manager','employee','viewer') then raise exception 'Niveau de sécurité invalide.'; end if;
  if exists (
    select 1
    from unnest(v_keys) k
    where not exists (
      select 1
      from public.organization_modules om
      join public.module_catalog c on c.module_key = om.module_key and c.active = true
      where om.organization_id = p_organization_id
        and om.module_key = k
        and om.enabled = true
    )
  ) then
    raise exception 'Un module sélectionné n’est pas inclus dans le contrat Métier.';
  end if;

  if p_role_id is null then
    select count(*)::integer into v_count from public.organization_custom_roles where organization_id = p_organization_id and active = true;
    if v_count >= 20 then raise exception 'La limite de 20 rôles personnalisés est atteinte.'; end if;
    v_id := gen_random_uuid();
    insert into public.organization_custom_roles (id, organization_id, role_key, label, base_role, module_keys, created_by)
    values (v_id, p_organization_id, 'role-' || substr(replace(v_id::text, '-', ''), 1, 10), v_label, p_base_role, v_keys, auth.uid());
  else
    v_id := p_role_id;
    update public.organization_custom_roles
    set label = v_label, base_role = p_base_role, module_keys = v_keys, active = true, updated_at = now()
    where id = v_id and organization_id = p_organization_id;
    if not found then raise exception 'Rôle personnalisé introuvable.'; end if;

    update public.organization_members m
    set role = p_base_role
    where m.organization_id = p_organization_id and m.custom_role_id = v_id and m.role <> 'owner';
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'metier.custom_role_saved', 'organization_custom_role', v_id::text, jsonb_build_object('label', v_label, 'base_role', p_base_role, 'module_keys', v_keys));

  return v_id;
end;
$$;

create or replace function public.metier_delete_custom_role(
  p_organization_id uuid,
  p_role_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Droits insuffisants.';
  end if;

  update public.organization_members
  set custom_role_id = null,
      role = 'employee'
  where organization_id = p_organization_id
    and custom_role_id = p_role_id
    and role not in ('owner','admin');

  update public.organization_custom_roles
  set active = false, updated_at = now()
  where id = p_role_id and organization_id = p_organization_id;
  if not found then raise exception 'Rôle personnalisé introuvable.'; end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  values (p_organization_id, auth.uid(), 'metier.custom_role_deleted', 'organization_custom_role', p_role_id::text);
end;
$$;

create or replace function public.metier_assign_custom_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_role text;
  v_current_role text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Droits insuffisants.';
  end if;

  select role into v_current_role
  from public.organization_members
  where organization_id = p_organization_id and user_id = p_user_id and status = 'active';
  if v_current_role is null then raise exception 'Utilisateur introuvable.'; end if;
  if v_current_role in ('owner','admin') then raise exception 'Les rôles Propriétaire et Administrateur restent gérés par le système.'; end if;

  if p_role_id is null then
    update public.organization_members
    set custom_role_id = null,
        role = 'employee'
    where organization_id = p_organization_id and user_id = p_user_id;
  else
    select base_role into v_base_role
    from public.organization_custom_roles
    where id = p_role_id and organization_id = p_organization_id and active = true;
    if v_base_role is null then raise exception 'Rôle personnalisé introuvable.'; end if;

    update public.organization_members
    set custom_role_id = p_role_id,
        role = v_base_role
    where organization_id = p_organization_id and user_id = p_user_id;
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'metier.custom_role_assigned', 'organization_member', p_user_id::text, jsonb_build_object('custom_role_id', p_role_id));
end;
$$;

create or replace function public.admin_list_metier_organizations()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'business_type', o.business_type,
    'owner_email', owner_data.email,
    'monthly_price_cents', coalesce(s.monthly_price_cents, 0),
    'setup_fee_cents', coalesce(o.metier_setup_fee_cents, 0),
    'member_limit', public.organization_metier_member_limit(o.id),
    'site_limit', coalesce(o.metier_site_limit, 5),
    'active_sites', coalesce(site_data.active_sites, 0),
    'enabled_modules', coalesce(module_data.enabled_modules, 0),
    'white_label_enabled', o.white_label_enabled,
    'custom_domain', o.custom_domain,
    'custom_domain_status', o.custom_domain_status,
    'contract_reference', o.metier_contract_reference,
    'organization_status', o.status,
    'created_at', o.created_at
  ) order by o.created_at desc), '[]'::jsonb)
  into v_result
  from public.organizations o
  left join public.organization_subscriptions s on s.organization_id = o.id
  left join lateral (
    select u.email::text as email
    from public.organization_members m
    join auth.users u on u.id = m.user_id
    where m.organization_id = o.id and m.role = 'owner'
    order by m.created_at limit 1
  ) owner_data on true
  left join lateral (
    select count(*)::integer as active_sites
    from public.organization_sites os
    where os.organization_id = o.id and os.status = 'active'
  ) site_data on true
  left join lateral (
    select count(*)::integer as enabled_modules
    from public.organization_modules om
    where om.organization_id = o.id and om.enabled = true
  ) module_data on true
  where o.plan = 'metier';

  return v_result;
end;
$$;

create or replace function public.admin_metier_configuration(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;
  if not exists (select 1 from public.organizations where id = p_organization_id and plan = 'metier') then
    raise exception 'Entreprise Métier introuvable.';
  end if;

  select jsonb_build_object(
    'organization', jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'business_type', o.business_type,
      'member_limit', public.organization_metier_member_limit(o.id),
      'site_limit', coalesce(o.metier_site_limit, 5),
      'storage_limit_mb', coalesce(o.metier_storage_limit_mb, 5000),
      'setup_fee_cents', coalesce(o.metier_setup_fee_cents, 0),
      'contract_reference', o.metier_contract_reference,
      'white_label_enabled', o.white_label_enabled,
      'custom_domain', o.custom_domain,
      'custom_domain_status', o.custom_domain_status,
      'custom_domain_verified_at', o.custom_domain_verified_at,
      'modules_configured', o.metier_modules_configured
    ),
    'modules', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'module_key', c.module_key,
        'display_name', c.display_name,
        'description', c.description,
        'category', c.category,
        'core_module', c.core_module,
        'enabled', case when o.metier_modules_configured then coalesce(om.enabled, false) else c.default_enabled or c.core_module end
      ) order by c.category, c.sort_order), '[]'::jsonb)
      from public.module_catalog c
      left join public.organization_modules om on om.organization_id = o.id and om.module_key = c.module_key
      where c.active = true and (cardinality(c.compatible_business_types) = 0 or o.business_type = any(c.compatible_business_types))
    )
  ) into v_result
  from public.organizations o
  where o.id = p_organization_id;

  return v_result;
end;
$$;

create or replace function public.admin_update_metier_configuration(
  p_organization_id uuid,
  p_member_limit integer,
  p_site_limit integer,
  p_storage_limit_mb integer,
  p_setup_fee_cents integer,
  p_contract_reference text,
  p_white_label_enabled boolean,
  p_custom_domain text,
  p_custom_domain_status text,
  p_enabled_modules text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := nullif(lower(trim(coalesce(p_custom_domain, ''))), '');
  v_modules text[] := coalesce(p_enabled_modules, '{}'::text[]);
  v_active_members integer;
  v_active_sites integer;
begin
  if not public.is_platform_super_admin() then raise exception 'Seul un super-administrateur peut configurer une offre Métier.'; end if;
  if not exists (select 1 from public.organizations where id = p_organization_id and plan = 'metier') then
    raise exception 'Entreprise Métier introuvable.';
  end if;

  if p_member_limit not between 1 and 100 then raise exception 'La limite utilisateurs doit être comprise entre 1 et 100.'; end if;
  if p_site_limit not between 1 and 50 then raise exception 'La limite établissements doit être comprise entre 1 et 50.'; end if;
  if p_storage_limit_mb not between 100 and 100000 then raise exception 'La limite de stockage est invalide.'; end if;
  if p_setup_fee_cents < 0 or p_setup_fee_cents > 10000000 then raise exception 'Les frais de configuration sont invalides.'; end if;
  if char_length(coalesce(p_contract_reference, '')) > 120 then raise exception 'La référence de contrat est trop longue.'; end if;
  if coalesce(p_custom_domain_status, '') not in ('not_configured','pending','verified','active','error') then raise exception 'Statut de domaine invalide.'; end if;
  if v_domain is not null and v_domain !~ '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$' then raise exception 'Le domaine personnalisé est invalide.'; end if;
  if v_domain is null and p_custom_domain_status <> 'not_configured' then raise exception 'Indiquez un domaine avant de modifier son statut.'; end if;
  if exists (
    select 1
    from unnest(v_modules) k
    where not exists (
      select 1
      from public.module_catalog c
      join public.organizations o on o.id = p_organization_id
      where c.module_key = k
        and c.active = true
        and (cardinality(c.compatible_business_types) = 0 or o.business_type = any(c.compatible_business_types))
    )
  ) then raise exception 'Un module sélectionné est incompatible avec cette activité.'; end if;

  select count(*)::integer into v_active_members from public.organization_members where organization_id = p_organization_id and status = 'active';
  if v_active_members > p_member_limit then raise exception 'L’entreprise possède déjà % accès actifs.', v_active_members; end if;
  select count(*)::integer into v_active_sites from public.organization_sites where organization_id = p_organization_id and status <> 'archived';
  if v_active_sites > p_site_limit then raise exception 'L’entreprise possède déjà % établissements.', v_active_sites; end if;

  update public.organizations
  set metier_member_limit = p_member_limit,
      metier_site_limit = p_site_limit,
      metier_storage_limit_mb = p_storage_limit_mb,
      metier_setup_fee_cents = p_setup_fee_cents,
      metier_contract_reference = nullif(trim(coalesce(p_contract_reference, '')), ''),
      white_label_enabled = coalesce(p_white_label_enabled, false),
      show_ncr_branding = case when coalesce(p_white_label_enabled, false) then show_ncr_branding else true end,
      custom_domain = v_domain,
      custom_domain_status = case when v_domain is null then 'not_configured' else p_custom_domain_status end,
      custom_domain_verified_at = case when p_custom_domain_status in ('verified','active') then coalesce(custom_domain_verified_at, now()) else null end,
      metier_modules_configured = true,
      updated_at = now()
  where id = p_organization_id;

  insert into public.organization_modules (organization_id, module_key, enabled, configured_by)
  select p_organization_id,
         c.module_key,
         case when c.core_module then true else c.module_key = any(v_modules) end,
         auth.uid()
  from public.module_catalog c
  join public.organizations o on o.id = p_organization_id
  where c.active = true
    and (cardinality(c.compatible_business_types) = 0 or o.business_type = any(c.compatible_business_types))
  on conflict (organization_id, module_key) do update
  set enabled = excluded.enabled,
      configured_by = auth.uid(),
      updated_at = now();

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'platform.metier_configuration_updated',
    'organization',
    p_organization_id::text,
    jsonb_build_object(
      'member_limit', p_member_limit,
      'site_limit', p_site_limit,
      'storage_limit_mb', p_storage_limit_mb,
      'setup_fee_cents', p_setup_fee_cents,
      'white_label_enabled', p_white_label_enabled,
      'custom_domain', v_domain,
      'custom_domain_status', p_custom_domain_status,
      'enabled_modules', v_modules
    )
  );
end;
$$;

update public.plan_catalog
set features = coalesce(features, '{}'::jsonb) || jsonb_build_object(
  'multi_site', true,
  'custom_modules', true,
  'custom_roles', true,
  'white_label', true,
  'custom_domain', true
),
short_description = 'Configuration sur mesure, établissements multiples, modules à la carte, rôles personnalisés et marque blanche.',
updated_at = now()
where plan_key = 'metier';

revoke all on function public.organization_metier_member_limit(uuid) from public;
revoke all on function public.metier_workspace_summary(uuid) from public;
revoke all on function public.metier_upsert_site(uuid,uuid,text,text,text,text,text,text,text,text,boolean) from public;
revoke all on function public.metier_set_site_status(uuid,uuid,text) from public;
revoke all on function public.metier_set_module(uuid,text,boolean) from public;
revoke all on function public.metier_upsert_custom_role(uuid,uuid,text,text,text[]) from public;
revoke all on function public.metier_delete_custom_role(uuid,uuid) from public;
revoke all on function public.metier_assign_custom_role(uuid,uuid,uuid) from public;
revoke all on function public.admin_list_metier_organizations() from public;
revoke all on function public.admin_metier_configuration(uuid) from public;
revoke all on function public.admin_update_metier_configuration(uuid,integer,integer,integer,integer,text,boolean,text,text,text[]) from public;

grant execute on function public.organization_metier_member_limit(uuid) to authenticated;
grant execute on function public.metier_workspace_summary(uuid) to authenticated;
grant execute on function public.metier_upsert_site(uuid,uuid,text,text,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.metier_set_site_status(uuid,uuid,text) to authenticated;
grant execute on function public.metier_set_module(uuid,text,boolean) to authenticated;
grant execute on function public.metier_upsert_custom_role(uuid,uuid,text,text,text[]) to authenticated;
grant execute on function public.metier_delete_custom_role(uuid,uuid) to authenticated;
grant execute on function public.metier_assign_custom_role(uuid,uuid,uuid) to authenticated;
grant execute on function public.admin_list_metier_organizations() to authenticated;
grant execute on function public.admin_metier_configuration(uuid) to authenticated;
grant execute on function public.admin_update_metier_configuration(uuid,integer,integer,integer,integer,text,boolean,text,text,text[]) to authenticated;

create index if not exists idx_module_catalog_category on public.module_catalog(active, category, sort_order);
create index if not exists idx_custom_roles_org_active on public.organization_custom_roles(organization_id, active, label);
