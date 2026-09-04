CREATE OR REPLACE FUNCTION private.coiffure_client_completed_appointments(p_account_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_catalog
AS $function$
DECLARE
  v_account public.coiffure_client_portal_accounts%rowtype;
  v_company_id uuid;
  v_count integer;
BEGIN
  IF NOT public.is_coiffure_client_portal_account(p_account_id) THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;

  SELECT * INTO v_account
  FROM public.coiffure_client_portal_accounts
  WHERE id = p_account_id;

  SELECT c.company_id INTO v_company_id
  FROM public.clients c
  WHERE c.organization_id = v_account.organization_id
    AND c.id = v_account.client_id;

  SELECT count(*)::integer INTO v_count
  FROM public.appointments a
  WHERE a.organization_id = v_account.organization_id
    AND a.client_id = v_account.client_id
    AND a.status = 'completed'
    AND a.company_id IS NOT DISTINCT FROM v_company_id;

  RETURN coalesce(v_count, 0);
END;
$function$;

REVOKE ALL ON FUNCTION private.coiffure_client_completed_appointments(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.coiffure_client_completed_appointments(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.coiffure_client_completed_appointments(p_account_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_catalog
AS $function$
  SELECT private.coiffure_client_completed_appointments(p_account_id);
$function$;

REVOKE ALL ON FUNCTION public.coiffure_client_completed_appointments(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coiffure_client_completed_appointments(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.coiffure_client_completed_appointments(uuid) TO authenticated;
