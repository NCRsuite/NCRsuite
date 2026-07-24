-- NCR Suite V2.21.2 - Correctif de validation production
-- A executer apres 084_final_production_validation.sql.

begin;

-- Les fonctions PostgreSQL sont executables par PUBLIC par defaut.
-- On memorise les acces effectifs afin de ne jamais ouvrir une fonction
-- auparavant reservee au service interne.
create temporary table ncr_function_access_snapshot on commit drop as
select
  p.oid,
  p.oid::regprocedure::text signature,
  has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') service_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public';

revoke execute on all functions in schema public from public,anon;

do $$
declare
  v_function record;
begin
  for v_function in
    select signature
    from ncr_function_access_snapshot
    where authenticated_execute
  loop
    execute format('grant execute on function %s to authenticated',v_function.signature);
  end loop;

  for v_function in
    select signature
    from ncr_function_access_snapshot
    where service_execute
  loop
    execute format('grant execute on function %s to service_role',v_function.signature);
  end loop;
end;
$$;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public grant execute on functions to authenticated,service_role;

-- Seuls les parcours effectivement publics recuperent un droit anonyme explicite.
do $$
declare
  v_function record;
  v_allowed_anon text[]:=array[
    'get_public_booking_page','get_public_available_slots','get_public_available_slots_v2',
    'create_public_booking','create_public_booking_v2','create_public_booking_v3',
    'get_public_booking','cancel_public_booking','reschedule_public_booking','reschedule_public_booking_v2',
    'get_public_restaurant_menu','get_public_restaurant_booking_config',
    'get_public_restaurant_booking_availability','create_public_restaurant_reservation',
    'get_public_training_satisfaction','submit_public_training_satisfaction',
    'submit_public_training_evaluation','get_team_invitation',
    'get_security_client_portal_invitation','get_cleaning_client_portal_invitation',
    'get_coiffure_client_portal_invitation','get_training_portal_invitation'
  ];
begin
  for v_function in
    select p.oid::regprocedure signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(v_allowed_anon)
  loop
    execute format('grant execute on function %s to anon,authenticated',v_function.signature);
  end loop;
end;
$$;

-- Le rapport utilise la meme liste publique que le durcissement ci-dessus.
create or replace function public.platform_access_security_report()
returns jsonb
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_rls_disabled jsonb;
  v_policyless jsonb;
  v_insecure_functions jsonb;
  v_anon_functions jsonb;
  v_allowed_anon text[]:=array[
    'get_public_booking_page','get_public_available_slots','get_public_available_slots_v2',
    'create_public_booking','create_public_booking_v2','create_public_booking_v3',
    'get_public_booking','cancel_public_booking','reschedule_public_booking','reschedule_public_booking_v2',
    'get_public_restaurant_menu','get_public_restaurant_booking_config',
    'get_public_restaurant_booking_availability','create_public_restaurant_reservation',
    'get_public_training_satisfaction','submit_public_training_satisfaction',
    'submit_public_training_evaluation','get_team_invitation',
    'get_security_client_portal_invitation','get_cleaning_client_portal_invitation',
    'get_coiffure_client_portal_invitation','get_training_portal_invitation'
  ];
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Acces administrateur NCR requis.';
  end if;

  select coalesce(jsonb_agg(c.relname order by c.relname),'[]'::jsonb)
  into v_rls_disabled
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relkind in ('r','p')
    and exists (
      select 1 from pg_attribute a
      where a.attrelid=c.oid and a.attname='organization_id' and not a.attisdropped
    )
    and not c.relrowsecurity;

  select coalesce(jsonb_agg(c.relname order by c.relname),'[]'::jsonb)
  into v_policyless
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relkind in ('r','p')
    and c.relrowsecurity
    and exists (
      select 1 from pg_attribute a
      where a.attrelid=c.oid and a.attname='organization_id' and not a.attisdropped
    )
    and not exists (select 1 from pg_policy pol where pol.polrelid=c.oid);

  select coalesce(jsonb_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text),'[]'::jsonb)
  into v_insecure_functions
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and not exists (
      select 1
      from unnest(coalesce(p.proconfig,array[]::text[])) setting
      where setting like 'search_path=%'
    );

  select coalesce(jsonb_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text),'[]'::jsonb)
  into v_anon_functions
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and has_function_privilege('anon',p.oid,'EXECUTE')
    and not (p.proname=any(v_allowed_anon));

  return jsonb_build_object(
    'generated_at',now(),
    'summary',jsonb_build_object(
      'rls_disabled',jsonb_array_length(v_rls_disabled),
      'policyless',jsonb_array_length(v_policyless),
      'insecure_security_definer',jsonb_array_length(v_insecure_functions),
      'unexpected_anon_functions',jsonb_array_length(v_anon_functions)
    ),
    'rls_disabled_tables',v_rls_disabled,
    'policyless_tables',v_policyless,
    'insecure_security_definer_functions',v_insecure_functions,
    'unexpected_anon_functions',v_anon_functions
  );
end;
$$;

revoke all on function public.platform_access_security_report() from public,anon;
grant execute on function public.platform_access_security_report() to authenticated;

-- Conserve la fonction V2.21.2 de base et corrige son verdict sans dupliquer
-- les controles deja valides.
do $$
begin
  if to_regprocedure(
    'public.platform_production_validation_report_v212(text,text,boolean,text[])'
  ) is null then
    alter function public.platform_production_validation_report(text,text,boolean,text[])
      rename to platform_production_validation_report_v212;
  end if;
end;
$$;

create or replace function public.platform_production_validation_report(
  p_frontend_version text,
  p_pwa_cache text,
  p_store boolean default false,
  p_manual_checks text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_report jsonb;
  v_readiness jsonb;
  v_checks jsonb;
  v_status text;
  v_total integer:=0;
  v_passed integer:=0;
  v_warnings integer:=0;
  v_blocking integer:=0;
  v_old_module_requests integer:=0;
  v_manual_completed integer:=0;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Validation reservee au super administrateur NCR.';
  end if;

  v_report:=public.platform_production_validation_report_v212(
    p_frontend_version,p_pwa_cache,false,p_manual_checks
  );
  v_readiness:=public.platform_release_readiness_report();
  v_old_module_requests:=coalesce(
    (v_readiness#>>'{summary,old_training_module_requests}')::integer,0
  );

  select coalesce(jsonb_agg(
    case
      when item->>'key'='training_modules' then
        item||jsonb_build_object(
          'status',case when v_old_module_requests>0 then 'warning' else 'ok' end,
          'detail',v_old_module_requests||' demande(s) de plus de 7 jours.'
        )
      else item
    end
    order by position
  ),'[]'::jsonb)
  into v_checks
  from jsonb_array_elements(v_report->'checks') with ordinality entries(item,position);

  if coalesce(p_store,false) then
    select count(*)::integer
    into v_manual_completed
    from jsonb_array_elements(v_report->'manual_checklist') item
    where coalesce((item->>'completed')::boolean,false);

    v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
      'key','manual_validation','category','Mise en production','label','Controles manuels',
      'status',case when v_manual_completed=7 then 'ok' else 'error' end,
      'detail',v_manual_completed||' controle(s) confirme(s) sur 7.',
      'action','Terminer la liste de validation avant d enregistrer le verdict final.'
    ));
  end if;

  select
    count(*)::integer,
    count(*) filter(where item->>'status'='ok')::integer,
    count(*) filter(where item->>'status'='warning')::integer,
    count(*) filter(where item->>'status'='error')::integer
  into v_total,v_passed,v_warnings,v_blocking
  from jsonb_array_elements(v_checks) item;

  v_status:=case when v_blocking>0 then 'blocked'
                 when v_warnings>0 then 'attention'
                 else 'ready' end;

  v_report:=v_report||jsonb_build_object(
    'generated_at',now(),
    'status',v_status,
    'summary',jsonb_build_object(
      'total',v_total,
      'passed',v_passed,
      'warnings',v_warnings,
      'blocking',v_blocking
    ),
    'checks',v_checks
  );

  if coalesce(p_store,false) then
    insert into public.platform_production_validation_runs(
      release_version,frontend_version,pwa_cache,status,total_checks,
      passed_checks,warning_checks,blocking_checks,report,created_by
    ) values (
      '2.21.2',p_frontend_version,p_pwa_cache,v_status,v_total,
      v_passed,v_warnings,v_blocking,v_report,auth.uid()
    );

    insert into public.audit_logs(
      organization_id,user_id,action,entity_type,entity_id,metadata
    ) values (
      null,auth.uid(),'platform.production_validation_recorded',
      'platform_release','2.21.2',
      jsonb_build_object(
        'status',v_status,'passed',v_passed,
        'warnings',v_warnings,'blocking',v_blocking,
        'correction','085'
      )
    );
  end if;

  return v_report;
end;
$$;

revoke all on function public.platform_production_validation_report_v212(text,text,boolean,text[])
  from public,anon,authenticated;
revoke all on function public.platform_production_validation_report(text,text,boolean,text[])
  from public,anon;
grant execute on function public.platform_production_validation_report(text,text,boolean,text[])
  to authenticated;

insert into public.audit_logs(
  organization_id,user_id,action,entity_type,entity_id,metadata
) values (
  null,auth.uid(),'platform.production_validation_security_corrected',
  'platform_release','2.21.2',
  jsonb_build_object(
    'migration','085',
    'anonymous_function_access','hardened',
    'training_module_verdict','corrected'
  )
);

commit;

select pg_notify('pgrst','reload schema');
