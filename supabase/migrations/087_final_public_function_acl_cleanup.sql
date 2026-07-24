-- NCR Suite V2.21.2 - Classification finale des acces publics
-- A executer apres 086_security_definer_search_path_hardening.sql.

begin;

-- Les futures fonctions applicatives creees par postgres restent privees par
-- defaut. Les fonctions publiques doivent toujours recevoir un GRANT explicite.
alter default privileges for role postgres in schema public
  revoke execute on functions from public,anon;

-- Le rapport distingue les fonctions NCR des fonctions appartenant a une
-- extension PostgreSQL. Ces objets d'extension sont geres par Supabase et ne
-- doivent jamais etre modifies, reattribues ou supprimes par une migration NCR.
create or replace function public.platform_access_security_report()
returns jsonb
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_rls_disabled jsonb;
  v_sealed_tables jsonb;
  v_insecure_functions jsonb;
  v_anon_functions jsonb;
  v_extension_functions jsonb;
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

  -- RLS actif sans politique signifie refus total. Ces tables restent
  -- inventoriees comme tables internes fermees, sans devenir une alerte.
  select coalesce(jsonb_agg(c.relname order by c.relname),'[]'::jsonb)
  into v_sealed_tables
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
      from pg_depend d
      where d.classid='pg_proc'::regclass
        and d.objid=p.oid
        and d.refclassid='pg_extension'::regclass
        and d.deptype='e'
    )
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
    and not (p.proname=any(v_allowed_anon))
    and not exists (
      select 1
      from pg_depend d
      where d.classid='pg_proc'::regclass
        and d.objid=p.oid
        and d.refclassid='pg_extension'::regclass
        and d.deptype='e'
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'signature',p.oid::regprocedure::text,
        'extension',e.extname
      )
      order by e.extname,p.oid::regprocedure::text
    ),
    '[]'::jsonb
  )
  into v_extension_functions
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  join pg_depend d
    on d.classid='pg_proc'::regclass
   and d.objid=p.oid
   and d.refclassid='pg_extension'::regclass
   and d.deptype='e'
  join pg_extension e on e.oid=d.refobjid
  where n.nspname='public'
    and has_function_privilege('anon',p.oid,'EXECUTE');

  return jsonb_build_object(
    'generated_at',now(),
    'summary',jsonb_build_object(
      'rls_disabled',jsonb_array_length(v_rls_disabled),
      'policyless',0,
      'insecure_security_definer',jsonb_array_length(v_insecure_functions),
      'unexpected_anon_functions',jsonb_array_length(v_anon_functions)
    ),
    'rls_disabled_tables',v_rls_disabled,
    'policyless_tables','[]'::jsonb,
    'sealed_by_rls_tables',v_sealed_tables,
    'insecure_security_definer_functions',v_insecure_functions,
    'unexpected_anon_functions',v_anon_functions,
    'extension_public_functions',v_extension_functions
  );
end;
$$;

revoke all on function public.platform_access_security_report() from public,anon;
grant execute on function public.platform_access_security_report() to authenticated;

-- Le correctif refuse de masquer une fonction applicative reellement publique.
-- Seuls les objets rattaches a pg_extension sortent du compteur bloquant.
do $$
declare
  v_remaining integer:=0;
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
  select count(*)::integer
  into v_remaining
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and has_function_privilege('anon',p.oid,'EXECUTE')
    and not (p.proname=any(v_allowed_anon))
    and not exists (
      select 1
      from pg_depend d
      where d.classid='pg_proc'::regclass
        and d.objid=p.oid
        and d.refclassid='pg_extension'::regclass
        and d.deptype='e'
    );

  if v_remaining>0 then
    raise exception '% fonction(s) applicative(s) reste(nt) accessible(s) au role anon.',v_remaining;
  end if;
end;
$$;

insert into public.audit_logs(
  organization_id,user_id,action,entity_type,entity_id,metadata
) values (
  null,auth.uid(),'platform.extension_access_classification_corrected',
  'platform_release','2.21.2',
  jsonb_build_object(
    'migration','087',
    'extension_objects','inventoried_not_modified',
    'application_public_functions','explicit_allowlist_only',
    'sealed_rls_tables','inventoried_not_blocking'
  )
);

commit;

select pg_notify('pgrst','reload schema');
