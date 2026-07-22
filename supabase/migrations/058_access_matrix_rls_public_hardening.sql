-- NCR Suite V2.11.5 — Matrice d'accès, audit RLS et durcissement des pages publiques
begin;

-- 1. Garantit l'activation RLS sur les tables métier déjà protégées par leurs politiques.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'cleaning_clients','cleaning_sites','cleaning_agents','cleaning_interventions','cleaning_intervention_tasks',
    'cleaning_anomalies','cleaning_quality_controls','cleaning_stock_items','cleaning_invoices','cleaning_invoice_lines',
    'restaurant_employees','restaurant_shifts','restaurant_menu_categories','restaurant_menu_items','restaurant_menu_costs',
    'restaurant_suppliers','restaurant_stock_items','restaurant_reservations','restaurant_tables','restaurant_temperature_logs',
    'restaurant_checklist_templates','restaurant_checklist_items','restaurant_checklist_runs','restaurant_waste_records',
    'restaurant_orders','restaurant_order_items','restaurant_recipe_cards','restaurant_recipe_ingredients','restaurant_stock_movements',
    'security_invoice_counters'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('alter table public.%I enable row level security', v_table);
    end if;
  end loop;
end $$;

-- 2. La réservation Coiffure multi-établissement ne peut cibler qu'une page Coiffure active.
create or replace function public.create_public_booking_v3(
  p_slug text,
  p_site_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_notes text default null,
  p_website text default null,
  p_privacy_consent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_plan text;
  v_result jsonb;
  v_appointment_id uuid;
  v_site_name text;
  v_site_address text;
begin
  select id, plan into v_org_id, v_plan
  from public.organizations
  where slug = lower(trim(p_slug))
    and business_type = 'coiffure'
    and status in ('trial','active')
    and coalesce(booking_enabled, false)
  limit 1;

  if v_org_id is null or not public.organization_has_plan_feature(v_org_id, 'public_booking') then
    raise exception 'La réservation en ligne est indisponible.';
  end if;

  if v_plan = 'metier' then
    select name, trim(concat_ws(' ', address, postal_code, city))
    into v_site_name, v_site_address
    from public.organization_sites
    where id = p_site_id and organization_id = v_org_id and status = 'active';

    if v_site_name is null then raise exception 'Sélectionnez un établissement actif.'; end if;

    if not exists (
      select 1 from public.staff
      where id = p_staff_id and organization_id = v_org_id and site_id = p_site_id and active = true
    ) then raise exception 'Le professionnel sélectionné n’est pas disponible dans cet établissement.'; end if;
  end if;

  v_result := public.create_public_booking_v2(
    p_slug, p_service_id, p_staff_id, p_starts_at, p_first_name, p_last_name,
    p_email, p_phone, p_notes, p_website, p_privacy_consent
  );

  v_appointment_id := (v_result ->> 'appointment_id')::uuid;
  update public.appointments
  set site_id = case when v_plan = 'metier' then p_site_id else null end,
      updated_at = now()
  where id = v_appointment_id and organization_id = v_org_id;

  return v_result || jsonb_build_object(
    'site_id', case when v_plan = 'metier' then p_site_id else null end,
    'site_name', v_site_name,
    'site_address', nullif(v_site_address, '')
  );
end;
$$;

-- 3. Les questionnaires publics Formation sont coupés si l'entreprise ou l'offre ne l'autorise plus.
create or replace function public.get_public_training_satisfaction(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'survey_id', q.id,
    'status', q.status,
    'organization_name', coalesce(o.public_name, o.name),
    'organization_logo_url', o.logo_url,
    'organization_primary_color', o.primary_color,
    'show_ncr_branding', coalesce(o.show_ncr_branding, true),
    'intro_text', o.training_satisfaction_intro,
    'session_title', s.title,
    'program_title', p.title,
    'starts_at', s.starts_at,
    'ends_at', s.ends_at,
    'trainer_name', nullif(trim(concat_ws(' ', tr.first_name, tr.last_name)), ''),
    'trainee_first_name', t.first_name,
    'completed_at', q.completed_at
  )
  from public.training_satisfaction_surveys q
  join public.organizations o on o.id = q.organization_id
  join public.training_sessions s on s.organization_id = q.organization_id and s.id = q.session_id
  join public.training_programs p on p.organization_id = s.organization_id and p.id = s.program_id
  join public.training_trainees t on t.organization_id = q.organization_id and t.id = q.trainee_id
  left join public.training_trainers tr on tr.organization_id = s.organization_id and tr.id = s.trainer_id
  where q.public_token = trim(coalesce(p_token, ''))
    and q.status in ('pending','sent','completed')
    and o.business_type = 'formation'
    and o.status in ('trial','active')
    and public.organization_has_plan_feature(o.id, 'training_satisfaction');
$$;

create or replace function public.submit_public_training_satisfaction(
  p_token text,
  p_content_rating integer,
  p_trainer_rating integer,
  p_organization_rating integer,
  p_objectives_rating integer,
  p_recommend boolean,
  p_comment text,
  p_improvement text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_survey public.training_satisfaction_surveys%rowtype;
begin
  if p_content_rating not between 1 and 5
     or p_trainer_rating not between 1 and 5
     or p_organization_rating not between 1 and 5
     or p_objectives_rating not between 1 and 5 then
    raise exception 'Toutes les notes doivent être comprises entre 1 et 5.';
  end if;
  if p_recommend is null then raise exception 'Indique si tu recommanderais cette formation.'; end if;
  if char_length(coalesce(p_comment, '')) > 3000 or char_length(coalesce(p_improvement, '')) > 3000 then
    raise exception 'Le commentaire est trop long.';
  end if;

  select q.* into v_survey
  from public.training_satisfaction_surveys q
  join public.organizations o on o.id = q.organization_id
  where q.public_token = trim(coalesce(p_token, ''))
    and o.business_type = 'formation'
    and o.status in ('trial','active')
    and public.organization_has_plan_feature(o.id, 'training_satisfaction')
  for update of q;

  if v_survey.id is null then raise exception 'Questionnaire introuvable ou indisponible.'; end if;
  if v_survey.status = 'completed' then
    return jsonb_build_object('completed', true, 'already_completed', true);
  end if;
  if v_survey.status not in ('pending','sent') then raise exception 'Ce questionnaire n’est plus disponible.'; end if;

  update public.training_satisfaction_surveys
  set status = 'completed',
      completed_at = now(),
      content_rating = p_content_rating,
      trainer_rating = p_trainer_rating,
      organization_rating = p_organization_rating,
      objectives_rating = p_objectives_rating,
      recommend = p_recommend,
      comment = nullif(trim(coalesce(p_comment, '')), ''),
      improvement = nullif(trim(coalesce(p_improvement, '')), ''),
      updated_at = now()
  where id = v_survey.id;

  return jsonb_build_object('completed', true, 'already_completed', false);
end;
$$;

-- 4. Les fonctions réellement publiques sont explicitement isolées du reste du schéma.
do $$
declare
  v_function record;
  v_public_names text[] := array[
    'get_public_booking_page','get_public_available_slots','get_public_available_slots_v2',
    'create_public_booking','create_public_booking_v2','create_public_booking_v3',
    'get_public_booking','cancel_public_booking','reschedule_public_booking','reschedule_public_booking_v2',
    'get_public_restaurant_menu','get_public_restaurant_booking_config','get_public_restaurant_booking_availability',
    'create_public_restaurant_reservation','get_public_training_satisfaction','submit_public_training_satisfaction',
    'get_team_invitation'
  ];
begin
  for v_function in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(v_public_names)
  loop
    execute format('revoke all on function %s from public', v_function.signature);
    execute format('grant execute on function %s to anon, authenticated', v_function.signature);
  end loop;
end $$;

-- 5. Rapport réel de sécurité des accès, visible uniquement depuis l'administration NCR.
create or replace function public.platform_access_security_report()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_rls_disabled jsonb;
  v_policyless jsonb;
  v_insecure_functions jsonb;
  v_anon_functions jsonb;
  v_allowed_anon text[] := array[
    'get_public_booking_page','get_public_available_slots','get_public_available_slots_v2',
    'create_public_booking','create_public_booking_v2','create_public_booking_v3',
    'get_public_booking','cancel_public_booking','reschedule_public_booking','reschedule_public_booking_v2',
    'get_public_restaurant_menu','get_public_restaurant_booking_config','get_public_restaurant_booking_availability',
    'create_public_restaurant_reservation','get_public_training_satisfaction','submit_public_training_satisfaction',
    'get_team_invitation'
  ];
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Accès administrateur NCR requis.';
  end if;

  select coalesce(jsonb_agg(c.relname order by c.relname), '[]'::jsonb)
  into v_rls_disabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r','p')
    and exists (
      select 1 from pg_attribute a
      where a.attrelid = c.oid and a.attname = 'organization_id' and not a.attisdropped
    )
    and not c.relrowsecurity;

  select coalesce(jsonb_agg(c.relname order by c.relname), '[]'::jsonb)
  into v_policyless
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r','p')
    and c.relrowsecurity
    and exists (
      select 1 from pg_attribute a
      where a.attrelid = c.oid and a.attname = 'organization_id' and not a.attisdropped
    )
    and not exists (select 1 from pg_policy pol where pol.polrelid = c.oid);

  select coalesce(jsonb_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text), '[]'::jsonb)
  into v_insecure_functions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and not exists (
      select 1
      from unnest(coalesce(p.proconfig, array[]::text[])) setting
      where setting like 'search_path=%'
    );

  select coalesce(jsonb_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text), '[]'::jsonb)
  into v_anon_functions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and has_function_privilege('anon', p.oid, 'EXECUTE')
    and not (p.proname = any(v_allowed_anon));

  return jsonb_build_object(
    'generated_at', now(),
    'summary', jsonb_build_object(
      'rls_disabled', jsonb_array_length(v_rls_disabled),
      'policyless', jsonb_array_length(v_policyless),
      'insecure_security_definer', jsonb_array_length(v_insecure_functions),
      'unexpected_anon_functions', jsonb_array_length(v_anon_functions)
    ),
    'rls_disabled_tables', v_rls_disabled,
    'policyless_tables', v_policyless,
    'insecure_security_definer_functions', v_insecure_functions,
    'unexpected_anon_functions', v_anon_functions
  );
end;
$$;

revoke all on function public.platform_access_security_report() from public;
grant execute on function public.platform_access_security_report() to authenticated;

-- Les fonctions publiques corrigées conservent uniquement leurs droits attendus.
revoke all on function public.create_public_booking_v3(text,uuid,uuid,uuid,timestamptz,text,text,text,text,text,text,boolean) from public;
grant execute on function public.create_public_booking_v3(text,uuid,uuid,uuid,timestamptz,text,text,text,text,text,text,boolean) to anon, authenticated;
revoke all on function public.get_public_training_satisfaction(text) from public;
grant execute on function public.get_public_training_satisfaction(text) to anon, authenticated;
revoke all on function public.submit_public_training_satisfaction(text,integer,integer,integer,integer,boolean,text,text) from public;
grant execute on function public.submit_public_training_satisfaction(text,integer,integer,integer,integer,boolean,text,text) to anon, authenticated;

commit;
