alter table public.beauty_company_loyalty_settings
  add column if not exists loyalty_card_enabled boolean not null default true,
  add column if not exists loyalty_status_enabled boolean not null default false,
  add column if not exists loyalty_status_silver_visits integer not null default 5,
  add column if not exists loyalty_status_gold_visits integer not null default 10,
  add column if not exists loyalty_status_vip_visits integer not null default 20;

alter table public.beauty_company_loyalty_settings
  drop constraint if exists beauty_company_loyalty_status_thresholds_check;

alter table public.beauty_company_loyalty_settings
  add constraint beauty_company_loyalty_status_thresholds_check
  check (
    loyalty_status_silver_visits >= 1
    and loyalty_status_silver_visits < loyalty_status_gold_visits
    and loyalty_status_gold_visits < loyalty_status_vip_visits
    and loyalty_status_vip_visits <= 100
  );

CREATE OR REPLACE FUNCTION private.update_beauty_company_loyalty_settings(
  p_organization_id uuid,
  p_company_id uuid,
  p_settings jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_catalog
AS $function$
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour cette enseigne.';
  end if;

  perform private.ensure_beauty_company_loyalty_settings(p_organization_id,p_company_id,auth.uid());

  update public.beauty_company_loyalty_settings set
    portal_enabled=coalesce((p_settings->>'portal_enabled')::boolean,portal_enabled),
    program_active=coalesce((p_settings->>'program_active')::boolean,program_active),
    program_name=coalesce(nullif(trim(p_settings->>'program_name'),''),program_name),
    program_description=case when p_settings ? 'program_description' then nullif(trim(p_settings->>'program_description'),'') else program_description end,
    points_enabled=coalesce((p_settings->>'points_enabled')::boolean,points_enabled),
    points_per_euro=coalesce((p_settings->>'points_per_euro')::integer,points_per_euro),
    points_per_visit=coalesce((p_settings->>'points_per_visit')::integer,points_per_visit),
    points_reward_threshold=coalesce((p_settings->>'points_reward_threshold')::integer,points_reward_threshold),
    points_reward_label=coalesce(nullif(trim(p_settings->>'points_reward_label'),''),points_reward_label),
    points_reward_kind=coalesce(nullif(trim(p_settings->>'points_reward_kind'),''),points_reward_kind),
    points_reward_value=coalesce((p_settings->>'points_reward_value')::integer,points_reward_value),
    points_reward_valid_days=coalesce((p_settings->>'points_reward_valid_days')::integer,points_reward_valid_days),
    visits_enabled=coalesce((p_settings->>'visits_enabled')::boolean,visits_enabled),
    visits_required=coalesce((p_settings->>'visits_required')::integer,visits_required),
    visits_reward_label=coalesce(nullif(trim(p_settings->>'visits_reward_label'),''),visits_reward_label),
    visits_reward_kind=coalesce(nullif(trim(p_settings->>'visits_reward_kind'),''),visits_reward_kind),
    visits_reward_value=coalesce((p_settings->>'visits_reward_value')::integer,visits_reward_value),
    visits_reward_valid_days=coalesce((p_settings->>'visits_reward_valid_days')::integer,visits_reward_valid_days),
    birthday_enabled=coalesce((p_settings->>'birthday_enabled')::boolean,birthday_enabled),
    birthday_days_before=coalesce((p_settings->>'birthday_days_before')::integer,birthday_days_before),
    birthday_reward_label=coalesce(nullif(trim(p_settings->>'birthday_reward_label'),''),birthday_reward_label),
    birthday_reward_kind=coalesce(nullif(trim(p_settings->>'birthday_reward_kind'),''),birthday_reward_kind),
    birthday_reward_value=coalesce((p_settings->>'birthday_reward_value')::integer,birthday_reward_value),
    birthday_reward_valid_days=coalesce((p_settings->>'birthday_reward_valid_days')::integer,birthday_reward_valid_days),
    welcome_enabled=coalesce((p_settings->>'welcome_enabled')::boolean,welcome_enabled),
    welcome_points=coalesce((p_settings->>'welcome_points')::integer,welcome_points),
    welcome_reward_label=coalesce(nullif(trim(p_settings->>'welcome_reward_label'),''),welcome_reward_label),
    welcome_reward_kind=coalesce(nullif(trim(p_settings->>'welcome_reward_kind'),''),welcome_reward_kind),
    welcome_reward_value=coalesce((p_settings->>'welcome_reward_value')::integer,welcome_reward_value),
    welcome_reward_valid_days=coalesce((p_settings->>'welcome_reward_valid_days')::integer,welcome_reward_valid_days),
    allow_client_birthdate_edit=coalesce((p_settings->>'allow_client_birthdate_edit')::boolean,allow_client_birthdate_edit),
    loyalty_card_enabled=coalesce((p_settings->>'loyalty_card_enabled')::boolean,loyalty_card_enabled),
    loyalty_status_enabled=coalesce((p_settings->>'loyalty_status_enabled')::boolean,loyalty_status_enabled),
    loyalty_status_silver_visits=coalesce((p_settings->>'loyalty_status_silver_visits')::integer,loyalty_status_silver_visits),
    loyalty_status_gold_visits=coalesce((p_settings->>'loyalty_status_gold_visits')::integer,loyalty_status_gold_visits),
    loyalty_status_vip_visits=coalesce((p_settings->>'loyalty_status_vip_visits')::integer,loyalty_status_vip_visits),
    updated_at=now()
  where organization_id=p_organization_id
    and company_id=p_company_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'beauty.company_loyalty_settings_updated',
    'beauty_company_loyalty_settings',p_company_id::text,
    jsonb_build_object('company_id',p_company_id)
  );
end;
$function$;
