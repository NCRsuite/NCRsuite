CREATE OR REPLACE FUNCTION public.beauty_enforce_client_company_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_business_type text;
BEGIN
  SELECT o.business_type
    INTO v_business_type
  FROM public.organizations o
  WHERE o.id = NEW.organization_id;

  IF v_business_type IS DISTINCT FROM 'coiffure' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_companies oc
    WHERE oc.organization_id = NEW.organization_id
      AND coalesce(oc.status, 'active') = 'active'
  ) THEN
    RETURN NEW;
  END IF;

  -- Preserve legacy orphan rows on unrelated updates.
  IF TG_OP = 'UPDATE'
     AND OLD.company_id IS NULL
     AND NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'Une enseigne est obligatoire pour ce client Beauty.'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_companies oc
    WHERE oc.id = NEW.company_id
      AND oc.organization_id = NEW.organization_id
      AND coalesce(oc.status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'L''enseigne du client n''appartient pas à cette organisation ou n''est pas active.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS beauty_client_company_scope_guard ON public.clients;

CREATE TRIGGER beauty_client_company_scope_guard
BEFORE INSERT OR UPDATE OF organization_id, company_id
ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.beauty_enforce_client_company_scope();
