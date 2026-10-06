BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

LOCK TABLE public.appointments, public.clients
IN SHARE ROW EXCLUSIVE MODE;

DO $preconditions$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE NOT t.tgisinternal
      AND (
        (
          t.tgrelid = 'public.appointments'::regclass
          AND t.tgname = 'metier_appointment_company_client_guard'
        )
        OR (
          t.tgrelid = 'public.clients'::regclass
          AND t.tgname = 'phase6b_beauty_client_reassignment_guard'
        )
      )
  ) THEN
    RAISE EXCEPTION
      'Ancienne proposition déjà installée : réconciliation des migrations requise.';
  END IF;
END;
$preconditions$;

-- Héritage uniquement lors d'un nouvel INSERT.
-- Les UPDATE historiques incohérents sont laissés au contrôle final.
CREATE FUNCTION private.beauty_inherit_appointment_company_6b1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $inherit$
DECLARE
  v_client_company uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = NEW.organization_id
      AND o.business_type = 'coiffure'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT c.company_id
  INTO v_client_company
  FROM public.clients c
  WHERE (c.organization_id, c.id)
      = (NEW.organization_id, NEW.client_id)
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client hors organisation ou introuvable.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.company_id IS NULL THEN
    NEW.company_id := v_client_company;
  END IF;

  RETURN NEW;
END;
$inherit$;

REVOKE ALL
ON FUNCTION private.beauty_inherit_appointment_company_6b1()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER beauty_appointment_company_inherit_6b1
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION private.beauty_inherit_appointment_company_6b1();


-- Vérification de la ligne enregistrée, après tous les BEFORE.
-- Aucun héritage ou UPDATE réparateur dans cette fonction.
CREATE FUNCTION private.beauty_assert_appointment_company_6b1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $assert$
DECLARE
  v_appointment public.appointments%ROWTYPE;
  v_client_company uuid;
  v_resource_company uuid;
  v_business text;
  v_plan text;
BEGIN
  SELECT a.*
  INTO v_appointment
  FROM public.appointments a
  WHERE a.id = NEW.id;

  -- Une suppression effectuée dans la même opération ne laisse
  -- aucune ligne persistante à contrôler.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT o.business_type, o.plan
  INTO v_business, v_plan
  FROM public.organizations o
  WHERE o.id = v_appointment.organization_id;

  IF v_business IS DISTINCT FROM 'coiffure' THEN
    RETURN NULL;
  END IF;

  SELECT c.company_id
  INTO v_client_company
  FROM public.clients c
  WHERE (c.organization_id, c.id)
      = (
          v_appointment.organization_id,
          v_appointment.client_id
        )
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client hors organisation ou introuvable.'
      USING ERRCODE = '23514';
  END IF;

  IF v_appointment.company_id IS DISTINCT FROM v_client_company THEN
    RAISE EXCEPTION
      'Le rendez-vous doit rester dans l’enseigne du client.'
      USING ERRCODE = '23514';
  END IF;

  IF v_plan = 'metier'
     AND v_appointment.company_id IS NULL THEN
    RAISE EXCEPTION
      'Une enseigne est requise pour ce rendez-vous Beauty.'
      USING ERRCODE = '23514';
  END IF;

  IF v_appointment.company_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.organization_companies co
       WHERE (co.organization_id, co.id)
           = (
               v_appointment.organization_id,
               v_appointment.company_id
             )
     ) THEN
    RAISE EXCEPTION 'Enseigne hors organisation.'
      USING ERRCODE = '23514';
  END IF;

  SELECT st.company_id
  INTO v_resource_company
  FROM public.staff st
  WHERE (st.organization_id, st.id)
      = (
          v_appointment.organization_id,
          v_appointment.staff_id
        );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Collaborateur hors organisation.'
      USING ERRCODE = '23514';
  END IF;

  IF v_resource_company IS NOT NULL
     AND v_resource_company IS DISTINCT FROM v_appointment.company_id THEN
    RAISE EXCEPTION 'Collaborateur d’une autre enseigne.'
      USING ERRCODE = '23514';
  END IF;

  SELECT sv.company_id
  INTO v_resource_company
  FROM public.services sv
  WHERE (sv.organization_id, sv.id)
      = (
          v_appointment.organization_id,
          v_appointment.service_id
        );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prestation hors organisation.'
      USING ERRCODE = '23514';
  END IF;

  IF v_resource_company IS NOT NULL
     AND v_resource_company IS DISTINCT FROM v_appointment.company_id THEN
    RAISE EXCEPTION 'Prestation d’une autre enseigne.'
      USING ERRCODE = '23514';
  END IF;

  IF v_appointment.site_id IS NOT NULL THEN
    SELECT s.company_id
    INTO v_resource_company
    FROM public.organization_sites s
    WHERE (s.organization_id, s.id)
        = (
            v_appointment.organization_id,
            v_appointment.site_id
          );

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Établissement hors organisation.'
        USING ERRCODE = '23514';
    END IF;

    IF v_resource_company IS NOT NULL
       AND v_resource_company IS DISTINCT FROM v_appointment.company_id THEN
      RAISE EXCEPTION 'Établissement d’une autre enseigne.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NULL;
END;
$assert$;

REVOKE ALL
ON FUNCTION private.beauty_assert_appointment_company_6b1()
FROM PUBLIC, anon, authenticated;

CREATE CONSTRAINT TRIGGER a0_beauty_appointment_company_final_6b1
AFTER INSERT OR UPDATE ON public.appointments
NOT DEFERRABLE
FOR EACH ROW
EXECUTE FUNCTION private.beauty_assert_appointment_company_6b1();


-- Empêche qu'une modification finale de la fiche client
-- rende ses rendez-vous incohérents.
CREATE FUNCTION private.beauty_assert_client_appointment_scope_6b1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $client_assert$
DECLARE
  v_client public.clients%ROWTYPE;
BEGIN
  SELECT c.*
  INTO v_client
  FROM public.clients c
  WHERE c.id = NEW.id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id IN (OLD.organization_id, v_client.organization_id)
      AND o.business_type = 'coiffure'
  ) THEN
    RETURN NULL;
  END IF;

  IF v_client.organization_id IS NOT DISTINCT FROM OLD.organization_id
     AND v_client.company_id IS NOT DISTINCT FROM OLD.company_id THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.client_id = v_client.id
      AND (
        a.organization_id IS DISTINCT FROM v_client.organization_id
        OR a.company_id IS DISTINCT FROM v_client.company_id
      )
  ) THEN
    RAISE EXCEPTION
      'Transfert de client avec rendez-vous : réconciliation explicite requise.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$client_assert$;

REVOKE ALL
ON FUNCTION private.beauty_assert_client_appointment_scope_6b1()
FROM PUBLIC, anon, authenticated;

CREATE CONSTRAINT TRIGGER a0_beauty_client_appointment_scope_final_6b1
AFTER UPDATE ON public.clients
NOT DEFERRABLE
FOR EACH ROW
EXECUTE FUNCTION private.beauty_assert_client_appointment_scope_6b1();


DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.appointments'::regclass
      AND t.tgname = 'beauty_appointment_company_inherit_6b1'
      AND t.tgenabled = 'O'
      AND t.tgfoid =
        'private.beauty_inherit_appointment_company_6b1()'::regprocedure
  ) THEN
    RAISE EXCEPTION 'Trigger d’héritage absent ou désactivé.';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_trigger t
    WHERE (
      (
        t.tgrelid = 'public.appointments'::regclass
        AND t.tgname = 'a0_beauty_appointment_company_final_6b1'
        AND t.tgfoid =
          'private.beauty_assert_appointment_company_6b1()'::regprocedure
      )
      OR (
        t.tgrelid = 'public.clients'::regclass
        AND t.tgname = 'a0_beauty_client_appointment_scope_final_6b1'
        AND t.tgfoid =
          'private.beauty_assert_client_appointment_scope_6b1()'::regprocedure
      )
    )
      AND t.tgenabled = 'O'
      AND NOT t.tgdeferrable
      AND t.tgconstraint <> 0
  ) <> 2 THEN
    RAISE EXCEPTION
      'Protections finales absentes, désactivées ou différables.';
  END IF;
END;
$verify$;

COMMIT;