-- Coiffure client portal — deferred site-scope validation must read organization plan reliably.
-- The constraint trigger can fire after the booking RPC returns under the authenticated
-- portal user's RLS context. Keep this invariant check privileged so it can always
-- resolve the real organization plan and active site.

create or replace function public.validate_operational_site_scope()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $function$
declare
  v_plan text;
begin
  select plan into v_plan
  from public.organizations
  where id = new.organization_id;

  if v_plan is distinct from 'metier' then
    return new;
  end if;

  if new.site_id is null or not exists (
    select 1
    from public.organization_sites s
    where s.id = new.site_id
      and s.organization_id = new.organization_id
      and s.status = 'active'
  ) then
    raise exception 'Un établissement actif doit être sélectionné.';
  end if;

  return new;
end;
$function$;
