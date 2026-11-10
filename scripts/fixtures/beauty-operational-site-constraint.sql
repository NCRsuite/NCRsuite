-- Actual deployed deferred site constraint, read on 2026-11-10. Local test fixture only.
CREATE OR REPLACE FUNCTION public.validate_operational_site_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
CREATE CONSTRAINT TRIGGER validate_appointment_site_scope AFTER INSERT OR UPDATE ON public.appointments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_operational_site_scope();
