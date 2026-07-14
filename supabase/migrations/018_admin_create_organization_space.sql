-- NCR Suite V2.4.1 — création d'un nouvel espace entreprise depuis l'administration NCR
-- À exécuter après 017_training_pack_core.sql.
-- Un même compte utilisateur peut être propriétaire de plusieurs espaces indépendants.

begin;

create or replace function public.admin_create_organization_space(
  p_owner_email text,
  p_name text,
  p_slug text,
  p_business_type text,
  p_plan text,
  p_monthly_price_cents integer,
  p_trial_days integer default 0,
  p_primary_color text default '#2997ff',
  p_internal_notes text default null,
  p_metier_setup_fee_cents integer default 0,
  p_metier_member_limit integer default null,
  p_metier_site_limit integer default null,
  p_metier_storage_limit_mb integer default null,
  p_metier_contract_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_owner_confirmed_at timestamptz;
  v_owner_is_platform_admin boolean := false;
  v_organization_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_owner_email text := lower(trim(coalesce(p_owner_email, '')));
  v_status text;
  v_subscription_status text;
  v_trial_ends_at timestamptz;
  v_default_price integer;
  v_minimum_price integer;
  v_business_label text;
  v_member_limit integer;
  v_site_limit integer;
  v_storage_limit integer;
  v_suffix text;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Seul un super-administrateur NCR peut créer un nouvel espace.';
  end if;

  if v_owner_email = '' or v_owner_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'L’adresse e-mail du propriétaire est invalide.';
  end if;

  select u.id, u.email_confirmed_at,
         exists (
           select 1 from public.platform_admins pa
           where pa.user_id = u.id and pa.active = true
         )
    into v_owner_id, v_owner_confirmed_at, v_owner_is_platform_admin
  from auth.users u
  where lower(u.email::text) = v_owner_email
  limit 1;

  if v_owner_id is null then
    raise exception 'Aucun compte NCR Suite ne correspond à cette adresse. Le propriétaire doit d’abord créer et confirmer son compte.';
  end if;

  if v_owner_confirmed_at is null then
    raise exception 'Le compte du propriétaire doit confirmer son adresse e-mail avant la création de l’espace.';
  end if;

  if v_owner_is_platform_admin then
    raise exception 'Un compte d’administration NCR ne peut pas être propriétaire d’un espace entreprise. Utilise le compte entreprise du client.';
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'Le nom de l’espace doit contenir entre 2 et 120 caractères.';
  end if;

  if p_business_type not in ('coiffure','nettoyage','securite','formation','artisan') then
    raise exception 'Le domaine métier sélectionné est invalide.';
  end if;

  if p_plan not in ('decouverte','essentielle','professionnelle','metier') then
    raise exception 'La formule sélectionnée est invalide.';
  end if;

  if p_primary_color is null or p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'La couleur principale est invalide.';
  end if;

  if p_trial_days is null or p_trial_days not between 0 and 365 then
    raise exception 'La durée d’essai doit être comprise entre 0 et 365 jours.';
  end if;

  select monthly_price_cents into v_default_price
  from public.plan_catalog
  where plan_key = p_plan and active = true;

  if v_default_price is null then
    raise exception 'La formule sélectionnée n’est pas disponible.';
  end if;

  if p_monthly_price_cents is null or p_monthly_price_cents < 0 then
    raise exception 'Le tarif mensuel est invalide.';
  end if;

  select d.minimum_monthly_price_cents, d.display_name
    into v_minimum_price, v_business_label
  from public.business_domain_catalog d
  where d.business_type = p_business_type and d.active = true;

  if p_plan = 'metier'
     and v_minimum_price is not null
     and p_monthly_price_cents < v_minimum_price then
    raise exception 'Le tarif minimum pour % est de % € HT/mois.',
      coalesce(v_business_label, p_business_type),
      to_char(v_minimum_price / 100.0, 'FM999999990D00');
  end if;

  if p_plan = 'metier' then
    if p_metier_setup_fee_cents is null or p_metier_setup_fee_cents < 0 then
      raise exception 'Les frais de configuration sont invalides.';
    end if;
    v_member_limit := greatest(1, least(100, coalesce(p_metier_member_limit, 10)));
    v_site_limit := greatest(1, least(50, coalesce(p_metier_site_limit, 1)));
    v_storage_limit := greatest(100, least(100000, coalesce(p_metier_storage_limit_mb, 5000)));
  else
    v_member_limit := null;
    v_site_limit := null;
    v_storage_limit := null;
  end if;

  if v_slug = '' then
    raise exception 'L’identifiant public de l’espace est obligatoire.';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) not between 2 and 80 then
    raise exception 'L’identifiant public doit contenir uniquement des lettres minuscules, chiffres et tirets.';
  end if;

  -- Le suffixe évite qu’un nom déjà utilisé bloque la création, tout en conservant
  -- un identifiant lisible pour l’entreprise.
  if exists (select 1 from public.organizations where slug = v_slug) then
    v_suffix := substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6);
    v_slug := left(v_slug, 73) || '-' || v_suffix;
  end if;

  v_status := case when p_trial_days > 0 then 'trial' else 'active' end;
  v_subscription_status := case when p_trial_days > 0 then 'trialing' else 'active' end;
  v_trial_ends_at := case when p_trial_days > 0 then now() + make_interval(days => p_trial_days) else null end;

  insert into public.organizations (
    name,
    slug,
    business_type,
    plan,
    status,
    primary_color,
    created_by,
    metier_setup_fee_cents,
    metier_member_limit,
    metier_site_limit,
    metier_storage_limit_mb,
    metier_contract_reference,
    metier_modules_configured,
    metier_business_type_locked,
    white_label_enabled,
    show_ncr_branding
  ) values (
    v_name,
    v_slug,
    p_business_type,
    p_plan,
    v_status,
    p_primary_color,
    v_owner_id,
    case when p_plan = 'metier' then coalesce(p_metier_setup_fee_cents, 0) else 0 end,
    v_member_limit,
    v_site_limit,
    v_storage_limit,
    case when p_plan = 'metier' then nullif(trim(coalesce(p_metier_contract_reference, '')), '') else null end,
    p_plan = 'metier',
    p_plan = 'metier',
    false,
    true
  ) returning id into v_organization_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_organization_id, v_owner_id, 'owner', 'active');

  -- Active automatiquement le socle et les modules par défaut compatibles
  -- avec le domaine choisi. Les modules d’un autre domaine ne sont jamais ajoutés.
  insert into public.organization_modules (
    organization_id,
    module_key,
    enabled,
    configured_by
  )
  select
    v_organization_id,
    c.module_key,
    true,
    auth.uid()
  from public.module_catalog c
  where c.active = true
    and (c.core_module = true or c.default_enabled = true)
    and (
      cardinality(c.compatible_business_types) = 0
      or p_business_type = any(c.compatible_business_types)
    )
  on conflict (organization_id, module_key) do update
  set enabled = true,
      configured_by = auth.uid(),
      updated_at = now();

  -- Conserve la clé métier historique utilisée par les premières versions.
  insert into public.organization_modules (organization_id, module_key, enabled, configured_by)
  values (v_organization_id, p_business_type, true, auth.uid())
  on conflict (organization_id, module_key) do update
  set enabled = true,
      configured_by = auth.uid(),
      updated_at = now();

  -- Le trigger de création a déjà initialisé l’abonnement. On le met à jour
  -- avec le tarif, l’essai et les notes propres à ce nouvel espace.
  insert into public.organization_subscriptions (
    organization_id,
    plan_key,
    status,
    provider,
    monthly_price_cents,
    trial_ends_at,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    internal_notes,
    updated_by
  ) values (
    v_organization_id,
    p_plan,
    v_subscription_status,
    'manual',
    p_monthly_price_cents,
    v_trial_ends_at,
    case when v_subscription_status = 'active' then now() else null end,
    null,
    false,
    nullif(trim(coalesce(p_internal_notes, '')), ''),
    auth.uid()
  )
  on conflict (organization_id) do update
  set plan_key = excluded.plan_key,
      status = excluded.status,
      provider = excluded.provider,
      monthly_price_cents = excluded.monthly_price_cents,
      trial_ends_at = excluded.trial_ends_at,
      current_period_start = excluded.current_period_start,
      current_period_end = null,
      cancel_at_period_end = false,
      internal_notes = excluded.internal_notes,
      updated_by = auth.uid(),
      updated_at = now();

  -- Un espace Métier commence avec un établissement principal utilisable.
  if p_plan = 'metier' then
    insert into public.organization_sites (
      organization_id,
      name,
      code,
      timezone,
      is_primary,
      status,
      created_by
    ) values (
      v_organization_id,
      v_name,
      'PRINCIPAL',
      'Europe/Paris',
      true,
      'active',
      auth.uid()
    );
  end if;

  insert into public.subscription_events (
    organization_id,
    event_type,
    actor_user_id,
    from_plan,
    to_plan,
    metadata
  ) values (
    v_organization_id,
    'organization_space_created',
    auth.uid(),
    null,
    p_plan,
    jsonb_build_object(
      'owner_email', v_owner_email,
      'business_type', p_business_type,
      'monthly_price_cents', p_monthly_price_cents,
      'trial_days', p_trial_days,
      'separate_subscription', true
    )
  );

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_organization_id,
    auth.uid(),
    'platform.organization_space_created',
    'organization',
    v_organization_id::text,
    jsonb_build_object(
      'owner_user_id', v_owner_id,
      'owner_email', v_owner_email,
      'business_type', p_business_type,
      'plan', p_plan,
      'monthly_price_cents', p_monthly_price_cents,
      'trial_days', p_trial_days
    )
  );

  return jsonb_build_object(
    'organization_id', v_organization_id,
    'name', v_name,
    'slug', v_slug,
    'owner_email', v_owner_email,
    'business_type', p_business_type,
    'plan', p_plan,
    'monthly_price_cents', p_monthly_price_cents,
    'status', v_status
  );
end;
$$;

revoke all on function public.admin_create_organization_space(
  text,text,text,text,text,integer,integer,text,text,integer,integer,integer,integer,text
) from public;

grant execute on function public.admin_create_organization_space(
  text,text,text,text,text,integer,integer,text,text,integer,integer,integer,integer,text
) to authenticated;

comment on function public.admin_create_organization_space(
  text,text,text,text,text,integer,integer,text,text,integer,integer,integer,integer,text
) is 'Crée un espace métier indépendant pour un compte NCR Suite existant, avec abonnement et modules propres.';

select pg_notify('pgrst', 'reload schema');

commit;
