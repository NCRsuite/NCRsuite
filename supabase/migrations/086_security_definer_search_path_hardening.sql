-- NCR Suite V2.21.2 - Durcissement final des fonctions historiques
-- A executer apres 085_production_validation_security_correction.sql.

begin;

-- Les roles applicatifs utilisent le schema public mais ne doivent jamais
-- pouvoir y creer un objet susceptible d'etre appele par une fonction interne.
revoke create on schema public from public,anon,authenticated;
grant usage on schema public to anon,authenticated,service_role;

-- Les anciennes fonctions deja deployees peuvent conserver le search_path
-- implicite de PostgreSQL, meme si leur definition actuelle est corrigee dans
-- le depot. On memorise uniquement celles qui doivent etre durcies.
create temporary table ncr_security_definer_path_snapshot on commit drop as
select
  p.oid,
  p.oid::regprocedure::text signature,
  p.prokind
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.prosecdef
  and p.prokind in ('f','p','w')
  and not exists (
    select 1
    from unnest(coalesce(p.proconfig,array[]::text[])) setting
    where setting like 'search_path=%'
  );

do $$
declare
  v_routine record;
begin
  for v_routine in
    select signature,prokind
    from ncr_security_definer_path_snapshot
    order by signature
  loop
    if v_routine.prokind='p' then
      execute format(
        'alter procedure %s set search_path = pg_catalog, public, extensions, pg_temp',
        v_routine.signature
      );
    else
      execute format(
        'alter function %s set search_path = pg_catalog, public, extensions, pg_temp',
        v_routine.signature
      );
    end if;
  end loop;
end;
$$;

-- La migration ne peut pas etre validee partiellement.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and p.prokind in ('f','p','w')
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig,array[]::text[])) setting
        where setting like 'search_path=%'
      )
  ) then
    raise exception 'Des fonctions SECURITY DEFINER sans search_path securise subsistent.';
  end if;
end;
$$;

insert into public.audit_logs(
  organization_id,user_id,action,entity_type,entity_id,metadata
) values (
  null,auth.uid(),'platform.security_definer_search_path_hardened',
  'platform_release','2.21.2',
  jsonb_build_object(
    'migration','086',
    'functions_hardened',(select count(*) from ncr_security_definer_path_snapshot),
    'search_path','pg_catalog,public,extensions,pg_temp',
    'public_schema_create','revoked_for_application_roles'
  )
);

commit;

select pg_notify('pgrst','reload schema');
