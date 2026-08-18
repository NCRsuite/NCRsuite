-- NCR Suite V2.29.25 — R5.7.4
-- La demande d’accès approuvée devient la source de vérité de l’activation.
-- Un JWT/front ancien ne peut ni choisir un autre métier, ni bloquer l’ouverture avec un métier périmé.

begin;

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
set search_path = public, pg_catalog
as $$
declare
  v_id uuid;
  v_name text := trim(p_name);
  v_slug text := lower(trim(p_slug));
  v_business_type text := case when p_business_type = 'restaurant' then 'restauration' else p_business_type end;
  v_authorized_business_type text;
  v_request_id uuid;
  v_jwt_request_id uuid;
  v_request_reference text;
  v_request_plan text;
  v_trial_requested boolean := false;
  v_trial_days integer := 0;
  v_initial_status text := 'suspended';
  v_effective_plan text := p_requested_plan;
  v_candidate_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_platform_super_admin() then
    begin
      v_jwt_request_id := nullif(auth.jwt()->'user_metadata'->>'access_request_id', '')::uuid;
    exception when others then
      v_jwt_request_id := null;
    end;

    -- 1) On privilégie l’identifiant signé dans le JWT s’il pointe encore vers
    --    une autorisation approuvée, non consommée et appartenant à ce compte.
    if v_jwt_request_id is not null then
      select
        r.id,
        r.reference,
        r.requested_plan,
        coalesce(r.trial_requested, false),
        case when r.business_type = 'restaurant' then 'restauration' else r.business_type end
      into
        v_request_id,
        v_request_reference,
        v_request_plan,
        v_trial_requested,
        v_authorized_business_type
      from public.platform_access_requests r
      where r.id = v_jwt_request_id
        and r.status = 'approved'
        and r.invited_user_id = auth.uid()
        and r.organization_id is null;
    end if;

    -- 2) Si le JWT est ancien/incomplet, on récupère l’autorisation côté serveur.
    --    On ne devine jamais s’il y en a plusieurs.
    if v_request_id is null then
      select count(*)::integer, min(r.id)
      into v_candidate_count, v_request_id
      from public.platform_access_requests r
      where r.status = 'approved'
        and r.invited_user_id = auth.uid()
        and r.organization_id is null;

      if v_candidate_count = 0 then
        raise exception 'Ce compte ne possede pas d autorisation valide pour ouvrir une entreprise.';
      elsif v_candidate_count > 1 then
        raise exception 'Plusieurs autorisations sont disponibles pour ce compte. Contactez NCR avant de creer l espace.';
      end if;

      select
        r.reference,
        r.requested_plan,
        coalesce(r.trial_requested, false),
        case when r.business_type = 'restaurant' then 'restauration' else r.business_type end
      into
        v_request_reference,
        v_request_plan,
        v_trial_requested,
        v_authorized_business_type
      from public.platform_access_requests r
      where r.id = v_request_id;
    end if;

    if v_request_reference is null or v_authorized_business_type is null then
      raise exception 'Ce compte ne possede pas d autorisation valide pour ouvrir une entreprise.';
    end if;

    if v_request_plan not in ('decouverte','essentielle','professionnelle','metier') then
      raise exception 'La formule autorisee pour cette demande est invalide.';
    end if;

    -- Source de vérité : métier + formule de la demande approuvée.
    -- Les valeurs envoyées par un ancien écran ne peuvent plus les remplacer.
    v_business_type := v_authorized_business_type;
    v_effective_plan := v_request_plan;
  else
    if p_requested_plan not in ('decouverte','essentielle','professionnelle','metier') then
      raise exception 'Formule invalide.';
    end if;
  end if;

  if v_trial_requested then
    v_effective_plan := 'professionnelle';
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'Nom invalide.';
  end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) not between 2 and 80 then
    raise exception 'Identifiant invalide.';
  end if;
  if v_business_type not in ('coiffure','nettoyage','securite','formation','restauration') then
    raise exception 'Metier non pris en charge.';
  end if;
  if p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Couleur invalide.';
  end if;
  if not exists (
    select 1
    from public.domain_plan_catalog
    where business_type = v_business_type
      and plan_key = v_effective_plan
      and active = true
  ) then
    raise exception 'Cette formule n est pas disponible pour ce metier.';
  end if;

  select default_trial_days
  into v_trial_days
  from public.platform_billing_settings
  where singleton = true;

  if v_request_id is not null and v_trial_requested and coalesce(v_trial_days, 0) > 0 then
    v_initial_status := 'trial';
  end if;

  if v_initial_status <> 'trial' and not exists (
    select 1
    from public.stripe_price_catalog c
    join public.platform_billing_settings bs
      on bs.singleton = true
     and bs.stripe_livemode = c.livemode
    where c.business_type = v_business_type
      and c.plan_key = v_effective_plan
      and c.active = true
  ) then
    raise exception 'Le tarif Stripe de cette formule doit etre configure avant l ouverture.';
  end if;

  insert into public.organizations(
    name, slug, business_type, plan, status, primary_color, created_by, onboarding_requested_plan
  ) values (
    v_name, v_slug, v_business_type, v_effective_plan, v_initial_status, p_primary_color, auth.uid(), v_effective_plan
  )
  returning id into v_id;

  insert into public.organization_members(organization_id, user_id, role, status)
  values (v_id, auth.uid(), 'owner', 'active');

  insert into public.organization_modules(organization_id, module_key)
  values
    (v_id, 'dashboard'),
    (v_id, 'settings'),
    (v_id, v_business_type)
  on conflict do nothing;

  if v_request_id is not null then
    update public.platform_access_requests
    set organization_id = v_id,
        requested_plan = v_effective_plan,
        updated_at = now()
    where id = v_request_id
      and invited_user_id = auth.uid()
      and organization_id is null;
  end if;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    v_id,
    auth.uid(),
    case when v_initial_status = 'trial' then 'organization.created_trial' else 'organization.created_payment_required' end,
    'organization',
    v_id::text,
    jsonb_build_object(
      'initial_plan', v_effective_plan,
      'client_requested_plan', p_requested_plan,
      'client_business_type', p_business_type,
      'access_request_reference', v_request_reference,
      'trial_requested', v_trial_requested,
      'trial_days', case when v_initial_status = 'trial' then v_trial_days else 0 end,
      'payment_required', v_initial_status <> 'trial',
      'authorized_business_type', v_authorized_business_type,
      'data_retention_mode', 'preserve'
    )
  );

  return v_id;
end;
$$;

revoke all on function public.create_organization(text,text,text,text,text) from public, anon;
grant execute on function public.create_organization(text,text,text,text,text) to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
