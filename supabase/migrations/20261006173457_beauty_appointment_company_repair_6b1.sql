BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

LOCK TABLE public.appointments, public.clients,
  public.staff, public.services, public.organization_sites,
  public.organization_companies,
  public.coiffure_loyalty_ledger,
  public.coiffure_appointment_loyalty_state
IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE private.phase6b1_beauty_repair_backup (
  appointment_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  old_company_id uuid,
  target_company_id uuid NOT NULL,
  before_row jsonb NOT NULL,
  after_row jsonb
);
REVOKE ALL ON private.phase6b1_beauty_repair_backup
FROM PUBLIC, anon, authenticated;
ALTER TABLE private.phase6b1_beauty_repair_backup ENABLE ROW LEVEL SECURITY;

DO $repair$
DECLARE
  v_org uuid := 'e2b94483-f38e-491e-bbc9-05dd481847ec';
  v_company uuid := 'd4f347b2-40df-4906-966f-c551fcda02f0';
  v_ids uuid[] := ARRAY[
    '5c180e42-ae64-4406-a947-c7e14ecea514',
    '88e3b3af-537e-4948-a465-87f94256a6d2',
    '9d3a704e-da6d-4de6-a2aa-90f9f49ee165',
    'd92561bf-f5d9-4430-9158-a45376f64c6b',
    '7f2adeda-c54a-41f2-943d-081779a83a7d',
    '1a0dbd23-709f-4989-a16e-4b93ff99f9b1',
    '4c1b2443-caf2-45cf-9df8-5f28dd89a596'
  ]::uuid[];
  v_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = v_org
      AND business_type = 'coiffure'
      AND plan = 'professionnelle'
  ) THEN
    RAISE EXCEPTION 'Organisation ou offre différente du diagnostic.';
  END IF;

  INSERT INTO private.phase6b1_beauty_repair_backup
    (appointment_id, organization_id, old_company_id,
     target_company_id, before_row)
  SELECT a.id, a.organization_id, a.company_id,
         c.company_id, to_jsonb(a)
  FROM public.appointments a
  JOIN public.clients c
    ON (c.organization_id, c.id) = (a.organization_id, a.client_id)
  JOIN public.organization_companies co
    ON (co.organization_id, co.id) = (c.organization_id, c.company_id)
  JOIN public.staff st
    ON (st.organization_id, st.id) = (a.organization_id, a.staff_id)
  JOIN public.services sv
    ON (sv.organization_id, sv.id) = (a.organization_id, a.service_id)
  WHERE a.id = ANY(v_ids)
    AND a.organization_id = v_org
    AND a.company_id IS NULL
    AND c.company_id = v_company
    AND co.status = 'active'
    AND a.status IN ('pending', 'confirmed', 'cancelled')
    AND (st.company_id IS NULL OR st.company_id = c.company_id)
    AND (sv.company_id IS NULL OR sv.company_id = c.company_id)
    AND (
      a.site_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.organization_sites s
        WHERE (s.organization_id, s.id) = (a.organization_id, a.site_id)
          AND (s.company_id IS NULL OR s.company_id = c.company_id)
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.coiffure_loyalty_ledger l
      WHERE l.appointment_id = a.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.coiffure_appointment_loyalty_state ls
      WHERE ls.appointment_id = a.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 7 THEN
    RAISE EXCEPTION 'Préconditions modifiées : % rendez-vous éligibles sur 7.', v_count;
  END IF;

  UPDATE public.appointments a
  SET company_id = b.target_company_id
  FROM private.phase6b1_beauty_repair_backup b
  WHERE (a.organization_id, a.id) = (b.organization_id, b.appointment_id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 7 THEN
    RAISE EXCEPTION 'Réparation incomplète : % lignes.', v_count;
  END IF;

  UPDATE private.phase6b1_beauty_repair_backup b
  SET after_row = to_jsonb(a)
  FROM public.appointments a
  WHERE (a.organization_id, a.id) = (b.organization_id, b.appointment_id);

  IF EXISTS (
    SELECT 1
    FROM private.phase6b1_beauty_repair_backup b
    LEFT JOIN public.appointments a
      ON (a.organization_id, a.id) = (b.organization_id, b.appointment_id)
    LEFT JOIN public.clients c
      ON (c.organization_id, c.id) = (a.organization_id, a.client_id)
    WHERE a.id IS NULL
      OR c.id IS NULL
      OR a.company_id IS DISTINCT FROM b.target_company_id
      OR a.company_id IS DISTINCT FROM c.company_id
      OR (b.after_row - 'company_id' - 'updated_at')
         IS DISTINCT FROM (b.before_row - 'company_id' - 'updated_at')
      OR EXISTS (
        SELECT 1 FROM public.coiffure_loyalty_ledger l
        WHERE l.appointment_id = b.appointment_id
      )
      OR EXISTS (
        SELECT 1 FROM public.coiffure_appointment_loyalty_state ls
        WHERE ls.appointment_id = b.appointment_id
      )
  ) THEN
    RAISE EXCEPTION 'Postcondition invalide : portée, autre donnée métier ou fidélité modifiée.';
  END IF;
END;
$repair$;

SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;