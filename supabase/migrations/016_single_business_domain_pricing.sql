-- NCR Suite V2.3.4 — un domaine métier par espace et tarification minimale par activité
-- À exécuter après 015_operational_multi_sites.sql.

create table if not exists public.business_domain_catalog (
  business_type text primary key check (business_type in ('coiffure','nettoyage','securite','formation','artisan')),
  display_name text not null,
  minimum_monthly_price_cents integer check (minimum_monthly_price_cents is null or minimum_monthly_price_cents >= 0),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.business_domain_catalog (
  business_type, display_name, minimum_monthly_price_cents, description, active
)
values
  ('coiffure', 'Coiffure & beauté', null, 'Rendez-vous, clients, prestations et équipe.', true),
  ('nettoyage', 'Nettoyage', null, 'Agents, sites, interventions et rapports.', true),
  ('securite', 'Sécurité privée', 5000, 'Agents, sites, prises de poste, rondes et alertes.', true),
  ('formation', 'Formation', null, 'Stagiaires, sessions, documents et émargements.', true),
  ('artisan', 'Artisan & intervention', null, 'Clients, interventions, devis et rapports.', true)
on conflict (business_type) do update
set display_name = excluded.display_name,
    minimum_monthly_price_cents = case
      when excluded.business_type = 'securite' then excluded.minimum_monthly_price_cents
      else public.business_domain_catalog.minimum_monthly_price_cents
    end,
    description = excluded.description,
    active = true,
    updated_at = now();

alter table public.organizations
  add column if not exists metier_business_type_locked boolean not null default false;

-- Les contrats Sécurité Métier existants sont remontés au minimum annoncé.
update public.organization_subscriptions s
set monthly_price_cents = 5000,
    updated_at = now()
from public.organizations o
where o.id = s.organization_id
  and o.plan = 'metier'
  and o.business_type = 'securite'
  and s.plan_key = 'metier'
  and s.monthly_price_cents < 5000;

update public.organizations
set metier_business_type_locked = true
where plan = 'metier'
  and coalesce(metier_modules_configured, false) = true;

alter table public.business_domain_catalog enable row level security;
revoke all on public.business_domain_catalog from anon, authenticated;

drop trigger if exists set_business_domain_catalog_updated_at on public.business_domain_catalog;
create trigger set_business_domain_catalog_updated_at
before update on public.business_domain_catalog
for each row execute procedure public.set_updated_at();

-- Un contrat Métier correspond à un seul domaine d'activité. Une deuxième activité
-- nécessite un autre espace entreprise et un abonnement distinct.
create or replace function public.protect_locked_metier_business_type()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.business_type is distinct from new.business_type
     and coalesce(old.metier_business_type_locked, false) then
    raise exception 'Le domaine métier de cet espace est verrouillé. Créez un nouvel espace et un abonnement distinct pour une autre activité.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_locked_metier_business_type on public.organizations;
create trigger protect_locked_metier_business_type
before update of business_type on public.organizations
for each row execute procedure public.protect_locked_metier_business_type();

create or replace function public.enforce_metier_domain_minimum_price()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_business_type text;
  v_minimum integer;
begin
  if new.plan_key <> 'metier' then
    return new;
  end if;

  select o.business_type, d.minimum_monthly_price_cents
    into v_business_type, v_minimum
  from public.organizations o
  left join public.business_domain_catalog d on d.business_type = o.business_type and d.active = true
  where o.id = new.organization_id;

  if v_business_type is null then
    raise exception 'Entreprise introuvable pour la tarification Métier.';
  end if;

  if v_minimum is not null and new.monthly_price_cents < v_minimum then
    raise exception 'Le tarif minimum pour % est de % € HT/mois.',
      coalesce((select display_name from public.business_domain_catalog where business_type = v_business_type), v_business_type),
      trim(to_char(v_minimum / 100.0, 'FM999999990D00'));
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_metier_domain_minimum_price on public.organization_subscriptions;
create trigger enforce_metier_domain_minimum_price
before insert or update of plan_key, monthly_price_cents on public.organization_subscriptions
for each row execute procedure public.enforce_metier_domain_minimum_price();

-- Configuration enrichie : domaine unique, tarif du contrat et minimum applicable.
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
      'business_type_label', coalesce(d.display_name, o.business_type),
      'business_type_locked', o.metier_business_type_locked,
      'minimum_monthly_price_cents', d.minimum_monthly_price_cents,
      'monthly_price_cents', coalesce(s.monthly_price_cents, 0),
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
      where c.active = true
        and (cardinality(c.compatible_business_types) = 0 or o.business_type = any(c.compatible_business_types))
    )
  ) into v_result
  from public.organizations o
  left join public.business_domain_catalog d on d.business_type = o.business_type and d.active = true
  left join public.organization_subscriptions s on s.organization_id = o.id
  where o.id = p_organization_id;

  return v_result;
end;
$$;

-- Nouvelle version de l'enregistrement contractuel : le tarif mensuel est contrôlé
-- en même temps que les limites, modules et paramètres de marque blanche.
create or replace function public.admin_update_metier_configuration_v2(
  p_organization_id uuid,
  p_monthly_price_cents integer,
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
  v_business_type text;
  v_business_label text;
  v_minimum integer;
begin
  if not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur peut configurer une offre Métier.';
  end if;

  select o.business_type, coalesce(d.display_name, o.business_type), d.minimum_monthly_price_cents
    into v_business_type, v_business_label, v_minimum
  from public.organizations o
  left join public.business_domain_catalog d on d.business_type = o.business_type and d.active = true
  where o.id = p_organization_id and o.plan = 'metier';

  if v_business_type is null then
    raise exception 'Entreprise Métier introuvable.';
  end if;

  if p_monthly_price_cents is null or p_monthly_price_cents < 0 or p_monthly_price_cents > 10000000 then
    raise exception 'Le tarif mensuel est invalide.';
  end if;

  if v_minimum is not null and p_monthly_price_cents < v_minimum then
    raise exception 'Le tarif minimum pour % est de % € HT/mois.',
      v_business_label,
      trim(to_char(v_minimum / 100.0, 'FM999999990D00'));
  end if;

  perform public.admin_update_metier_configuration(
    p_organization_id,
    p_member_limit,
    p_site_limit,
    p_storage_limit_mb,
    p_setup_fee_cents,
    p_contract_reference,
    p_white_label_enabled,
    p_custom_domain,
    p_custom_domain_status,
    p_enabled_modules
  );

  update public.organizations
  set metier_business_type_locked = true,
      updated_at = now()
  where id = p_organization_id;

  update public.organization_subscriptions
  set monthly_price_cents = p_monthly_price_cents,
      updated_by = auth.uid(),
      updated_at = now()
  where organization_id = p_organization_id
    and plan_key = 'metier';

  if not found then
    raise exception 'Abonnement Métier introuvable pour cette entreprise.';
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'platform.metier_domain_contract_updated',
    'organization',
    p_organization_id::text,
    jsonb_build_object(
      'business_type', v_business_type,
      'business_type_label', v_business_label,
      'monthly_price_cents', p_monthly_price_cents,
      'minimum_monthly_price_cents', v_minimum,
      'single_domain', true
    )
  );
end;
$$;

revoke all on function public.admin_update_metier_configuration_v2(uuid,integer,integer,integer,integer,integer,text,boolean,text,text,text[]) from public;
grant execute on function public.admin_update_metier_configuration_v2(uuid,integer,integer,integer,integer,integer,text,boolean,text,text,text[]) to authenticated;

comment on table public.business_domain_catalog is 'Tarification minimale et libellés par domaine métier. Une organisation Métier reste rattachée à un seul domaine.';
comment on column public.organizations.metier_business_type_locked is 'Empêche un espace Métier configuré de basculer vers un autre domaine d’activité.';

select pg_notify('pgrst', 'reload schema');
