-- LOCAL CANDIDATE: not applied remotely. Security first; no historical reconciliation.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
DO $preflight$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_public_booking' AND md5(p.prosrc)='0333fd50d3aaaed3c72ed1ba1ae5044f' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: create_public_booking. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_public_booking_v2' AND md5(p.prosrc)='aebc5af27e0036a5190e554678222c20' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: create_public_booking_v2. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_public_metier_coiffure_company_booking' AND md5(p.prosrc)='38d075965f908fe168712f5f27a9275e' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: create_public_metier_coiffure_company_booking. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_public_metier_coiffure_company_booking_v2' AND md5(p.prosrc)='dde0a2a2a39309ce018e672549177493' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: create_public_metier_coiffure_company_booking_v2. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_coiffure_client_portal_booking_v2' AND md5(p.prosrc)='b835518622832196451a998101579925' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: create_coiffure_client_portal_booking_v2. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='coiffure_client_portal_dashboard' AND md5(p.prosrc)='094b7100dbdca60a498fb2945c09f187' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: coiffure_client_portal_dashboard. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='request_public_booking_client_portal_activation' AND md5(p.prosrc)='6efc9ff067b6b6d505fd20a18ddb98fd' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: request_public_booking_client_portal_activation. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='public_booking_client_portal_activation_status' AND md5(p.prosrc)='1ceb2d9c0d8b92ce253813853fe965e0' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: public_booking_client_portal_activation_status. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='accept_coiffure_client_portal_invitation' AND md5(p.prosrc)='2632380b863da75fb69c673fdfa6e752' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: accept_coiffure_client_portal_invitation. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='enqueue_coiffure_client_portal_invitation_email' AND md5(p.prosrc)='8c7474afb9411295c879ef4137baa819' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: enqueue_coiffure_client_portal_invitation_email. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_coiffure_client_portal_invitation' AND md5(p.prosrc)='f12881ec28c0d0e5010df3ceac59a0d6' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: create_coiffure_client_portal_invitation. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='resend_coiffure_client_portal_invitation' AND md5(p.prosrc)='5298d8ffa7623dadbd6ef49878ca0090' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: resend_coiffure_client_portal_invitation. Review before applying.'; END IF;
END; $preflight$;
-- New proof records only. Existing clients, appointments, accounts and balances are not rewritten.
CREATE TABLE private.beauty_guest_booking_proofs (
  appointment_id uuid PRIMARY KEY REFERENCES public.appointments(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  company_id uuid,
  original_client_id uuid NOT NULL,
  email_snapshot text,
  verified_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, original_client_id) REFERENCES public.clients(organization_id,id),
  FOREIGN KEY (organization_id, company_id) REFERENCES public.organization_companies(organization_id,id),
  CHECK ((verified_user_id IS NULL) = (verified_at IS NULL))
);
ALTER TABLE private.beauty_guest_booking_proofs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.beauty_guest_booking_proofs FROM PUBLIC, anon, authenticated;
CREATE INDEX beauty_guest_booking_verified_user_idx ON private.beauty_guest_booking_proofs(verified_user_id,organization_id,company_id) WHERE verified_user_id IS NOT NULL;
ALTER TABLE public.coiffure_client_portal_invitations ADD COLUMN booking_appointment_id uuid REFERENCES public.appointments(id) ON DELETE RESTRICT;

CREATE FUNCTION private.beauty_booking_client(
  p_org uuid, p_company uuid, p_first text, p_last text, p_email text, p_phone text,
  p_account uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, private AS $body$
DECLARE v_ids uuid[]; v_client uuid;
BEGIN
  IF p_company IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_companies WHERE organization_id=p_org AND id=p_company AND status='active'
  ) THEN RAISE EXCEPTION 'Enseigne indisponible.'; END IF;
  IF p_account IS NOT NULL AND auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise.'; END IF;
  SELECT array_agg(a.client_id ORDER BY a.id) INTO v_ids
  FROM public.coiffure_client_portal_accounts a
  JOIN public.clients c ON c.organization_id=a.organization_id AND c.id=a.client_id
  WHERE a.organization_id=p_org AND a.user_id=auth.uid() AND a.status='active'
    AND c.status='active' AND c.company_id IS NOT DISTINCT FROM p_company
    AND (p_account IS NULL OR a.id=p_account)
    AND public.is_coiffure_client_portal_account(a.id);
  IF cardinality(v_ids)>1 THEN RAISE EXCEPTION 'Sélectionnez votre dossier depuis votre espace client.'; END IF;
  IF cardinality(v_ids)=1 THEN RETURN v_ids[1]; END IF;
  IF p_account IS NOT NULL THEN RAISE EXCEPTION 'Accès client refusé.'; END IF;
  -- Contact information is not an identity credential. Never match or update an existing client here.
  INSERT INTO public.clients(organization_id,company_id,first_name,last_name,email,phone,status,created_by)
  VALUES(p_org,p_company,p_first,p_last,p_email,p_phone,'active',NULL) RETURNING id INTO v_client;
  RETURN v_client;
END;
$body$;

CREATE FUNCTION private.beauty_record_guest_booking(p_appointment uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $body$
BEGIN
  INSERT INTO private.beauty_guest_booking_proofs(appointment_id,organization_id,company_id,original_client_id,email_snapshot)
  SELECT a.id,a.organization_id,a.company_id,a.client_id,nullif(lower(trim(c.email)),'')
  FROM public.appointments a
  JOIN public.clients c ON c.organization_id=a.organization_id AND c.id=a.client_id
  WHERE a.id=p_appointment AND a.source='public' AND a.company_id IS NOT DISTINCT FROM c.company_id
    AND NOT EXISTS(SELECT 1 FROM public.coiffure_client_portal_accounts ca WHERE ca.organization_id=a.organization_id AND ca.client_id=a.client_id);
END;
$body$;

CREATE FUNCTION private.beauty_claim_guest_booking(p_appointment uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $body$
DECLARE v_proof private.beauty_guest_booking_proofs%rowtype; v_email text; v_account uuid; v_client uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise.'; END IF;
  SELECT lower(trim(email)) INTO v_email FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
  IF v_email IS NULL THEN RAISE EXCEPTION 'Confirmez votre adresse e-mail avant de rattacher une réservation.'; END IF;
  SELECT * INTO v_proof FROM private.beauty_guest_booking_proofs WHERE appointment_id=p_appointment FOR UPDATE;
  IF NOT FOUND OR v_proof.email_snapshot IS DISTINCT FROM v_email THEN
    RAISE EXCEPTION 'Cette réservation nécessite une invitation du salon ou une autre adresse vérifiée.';
  END IF;
  IF v_proof.verified_user_id IS NOT NULL AND v_proof.verified_user_id<>auth.uid() THEN RAISE EXCEPTION 'Rattachement refusé.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.appointments a JOIN public.clients c ON c.organization_id=a.organization_id AND c.id=a.client_id
    WHERE a.id=v_proof.appointment_id AND a.organization_id=v_proof.organization_id
      AND a.company_id IS NOT DISTINCT FROM v_proof.company_id AND a.client_id=v_proof.original_client_id
      AND c.company_id IS NOT DISTINCT FROM v_proof.company_id AND c.status='active' AND a.source='public') THEN
    RAISE EXCEPTION 'Le contexte de la réservation a changé. Contactez le salon.';
  END IF;
  IF NOT private.coiffure_client_portal_company_feature_enabled(v_proof.organization_id,v_proof.company_id) THEN
    RAISE EXCEPTION 'Espace client indisponible.';
  END IF;
  -- Serialize first activation for one verified identity and one tenant, without merging client records.
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||v_proof.organization_id::text||coalesce(v_proof.company_id::text,''),0));
  SELECT a.id INTO v_account FROM public.coiffure_client_portal_accounts a
    JOIN public.clients c ON c.organization_id=a.organization_id AND c.id=a.client_id
    WHERE a.organization_id=v_proof.organization_id AND a.user_id=auth.uid() AND a.status='active'
      AND c.company_id IS NOT DISTINCT FROM v_proof.company_id AND c.status='active'
      AND public.is_coiffure_client_portal_account(a.id)
    ORDER BY a.created_at,a.id LIMIT 1;
  IF v_account IS NULL THEN
    IF EXISTS(SELECT 1 FROM public.coiffure_client_portal_accounts a JOIN public.clients c ON c.organization_id=a.organization_id AND c.id=a.client_id
      WHERE a.organization_id=v_proof.organization_id AND a.user_id=auth.uid() AND c.company_id IS NOT DISTINCT FROM v_proof.company_id)
      OR EXISTS(SELECT 1 FROM public.coiffure_client_portal_accounts a WHERE a.organization_id=v_proof.organization_id AND a.client_id=v_proof.original_client_id) THEN
      RAISE EXCEPTION 'Contactez le salon pour réactiver votre accès.';
    END IF;
    INSERT INTO public.coiffure_client_portal_accounts(organization_id,client_id,user_id,email,status,last_seen_at)
    VALUES(v_proof.organization_id,v_proof.original_client_id,auth.uid(),v_email,'active',now()) RETURNING id INTO v_account;
    -- Existing loyalty rules, once on first account creation only. No balance transfer.
    PERFORM public.apply_coiffure_welcome_benefit(v_proof.organization_id,v_proof.original_client_id);
    PERFORM public.ensure_coiffure_birthday_reward(v_proof.organization_id,v_proof.original_client_id);
  END IF;
  IF v_proof.verified_user_id IS NULL THEN
    UPDATE private.beauty_guest_booking_proofs SET verified_user_id=auth.uid(),verified_at=now() WHERE appointment_id=p_appointment;
    INSERT INTO public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
    VALUES(v_proof.organization_id,auth.uid(),'beauty.guest_booking_verified','appointment',p_appointment::text,jsonb_build_object('company_id',v_proof.company_id,'account_id',v_account));
  END IF;
  RETURN v_account;
END;
$body$;

CREATE FUNCTION private.beauty_guest_booking_visible(p_appointment uuid,p_account uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $body$
 SELECT EXISTS(
   SELECT 1 FROM private.beauty_guest_booking_proofs g
   JOIN public.appointments ap ON ap.id=g.appointment_id AND ap.organization_id=g.organization_id
     AND ap.client_id=g.original_client_id AND ap.company_id IS NOT DISTINCT FROM g.company_id
   JOIN public.coiffure_client_portal_accounts ca ON ca.id=p_account AND ca.organization_id=g.organization_id
   JOIN public.clients c ON c.id=ca.client_id AND c.organization_id=ca.organization_id
   WHERE g.appointment_id=p_appointment AND g.verified_user_id=auth.uid() AND g.verified_at IS NOT NULL
     AND ca.user_id=auth.uid() AND ca.status='active' AND c.status='active'
     AND c.company_id IS NOT DISTINCT FROM g.company_id AND public.is_coiffure_client_portal_account(ca.id)
 );
$body$;

REVOKE ALL ON FUNCTION private.beauty_booking_client(uuid,uuid,text,text,text,text,uuid),
  private.beauty_record_guest_booking(uuid),private.beauty_claim_guest_booking(uuid),
  private.beauty_guest_booking_visible(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.beauty_create_company_booking(p_slug text, p_site_id uuid, p_service_ids uuid[], p_staff_id uuid, p_starts_at timestamp with time zone, p_first_name text, p_last_name text, p_email text, p_phone text, p_notes text DEFAULT NULL::text, p_website text DEFAULT NULL::text, p_privacy_consent boolean DEFAULT false, p_authorized_account_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_company public.organization_companies%rowtype;
  v_org public.organizations%rowtype;
  v_requested_count integer;
  v_matched_count integer;
  v_total_duration integer;
  v_amount integer;
  v_service_names text[];
  v_service_label text;
  v_staff_name text;
  v_site_name text;
  v_site_address text;
  v_timezone text;
  v_ends_at timestamptz;
  v_client_id uuid;
  v_appointment_id uuid;
  v_token uuid:=gen_random_uuid();
  v_status text;
  v_first_name text:=trim(coalesce(p_first_name,''));
  v_last_name text:=nullif(trim(coalesce(p_last_name,'')),'');
  v_email text:=nullif(lower(trim(coalesce(p_email,''))),'');
  v_phone text:=nullif(trim(coalesce(p_phone,'')),'');
  v_normalized_phone text;
  v_notes text:=nullif(trim(coalesce(p_notes,'')),'');
begin
  if not coalesce(p_privacy_consent,false) then raise exception 'Votre consentement est nécessaire pour enregistrer la réservation.'; end if;
  if nullif(trim(coalesce(p_website,'')),'') is not null then raise exception 'Réservation impossible.'; end if;

  v_requested_count:=coalesce(cardinality(p_service_ids),0);
  if v_requested_count<1 or v_requested_count>6 then raise exception 'Sélectionnez entre 1 et 6 prestations.'; end if;
  if (select count(distinct service_id) from unnest(p_service_ids) service_id)<>v_requested_count then
    raise exception 'Une même prestation ne peut pas être ajoutée deux fois.';
  end if;

  select c.* into v_company
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.booking_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and o.plan='metier'
    and o.status in ('trial','active')
  limit 1;
  if v_company.id is null then raise exception 'La réservation en ligne est indisponible.'; end if;
  select * into v_org from public.organizations where id=v_company.organization_id;

  if char_length(v_first_name) not between 2 and 80 then raise exception 'Indiquez un prénom valide.'; end if;
  if v_last_name is not null and char_length(v_last_name)>100 then raise exception 'Le nom est trop long.'; end if;
  if v_email is null and v_phone is null then raise exception 'Indiquez une adresse e-mail ou un numéro de téléphone.'; end if;
  if v_email is not null and v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'L’adresse e-mail est invalide.'; end if;
  v_normalized_phone:=nullif(regexp_replace(coalesce(v_phone,''),'[^0-9+]','','g'),'');
  if v_phone is not null and char_length(v_normalized_phone)<8 then raise exception 'Le numéro de téléphone est invalide.'; end if;
  if v_notes is not null and char_length(v_notes)>1000 then raise exception 'Le message est trop long.'; end if;

  select s.name,trim(concat_ws(' ',s.address,s.postal_code,s.city)),s.timezone
  into v_site_name,v_site_address,v_timezone
  from public.organization_sites s
  where s.id=p_site_id
    and s.organization_id=v_company.organization_id
    and s.company_id=v_company.id
    and s.status='active';
  if v_site_name is null then raise exception 'Sélectionnez un lieu actif.'; end if;

  with ordered as (
    select u.ord,s.*
    from unnest(p_service_ids) with ordinality u(service_id,ord)
    join public.services s
      on s.id=u.service_id
     and s.organization_id=v_company.organization_id
     and s.company_id=v_company.id
     and s.active=true
     and s.online_booking_enabled=true
  )
  select count(*),
         sum(duration_minutes)::integer,
         sum(price_cents)::integer,
         array_agg(name order by ord),
         string_agg(name,' + ' order by ord)
  into v_matched_count,v_total_duration,v_amount,v_service_names,v_service_label
  from ordered;

  if v_matched_count<>v_requested_count or v_total_duration is null then
    raise exception 'Une ou plusieurs prestations ne sont plus disponibles en ligne.';
  end if;

  select st.display_name into v_staff_name
  from public.staff st
  where st.id=p_staff_id
    and st.organization_id=v_company.organization_id
    and st.company_id=v_company.id
    and st.site_id=p_site_id
    and st.active=true;
  if v_staff_name is null then raise exception 'Le collaborateur sélectionné est indisponible.'; end if;

  if exists (
    select 1
    from unnest(p_service_ids) sid(service_id)
    where not exists (
      select 1 from public.staff_services ss
      where ss.organization_id=v_company.organization_id
        and ss.staff_id=p_staff_id
        and ss.service_id=sid.service_id
    )
  ) then raise exception 'Ce collaborateur ne réalise pas toutes les prestations sélectionnées.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_staff_id::text,0));

  select available.slot_end
  into v_ends_at
  from public.get_public_metier_coiffure_company_multi_slots(
    p_slug,p_site_id,p_service_ids,(p_starts_at at time zone v_timezone)::date,p_staff_id
  ) available
  where available.staff_id=p_staff_id
    and available.slot_start=p_starts_at
  limit 1;

  if v_ends_at is null then raise exception 'Ce créneau n’est plus disponible. Choisissez une autre heure.'; end if;

  if (
    select count(*)
    from public.appointments a
    join public.clients c on c.organization_id=a.organization_id and c.id=a.client_id
    where a.organization_id=v_company.organization_id
      and a.company_id=v_company.id
      and a.source='public'
      and a.created_at>now()-interval '24 hours'
      and c.company_id=v_company.id
      and (
        (v_email is not null and lower(coalesce(c.email,''))=v_email)
        or (
          v_normalized_phone is not null
          and regexp_replace(coalesce(c.phone,''),'[^0-9+]','','g')=v_normalized_phone
        )
      )
  )>=5 then
    raise exception 'Trop de demandes ont été envoyées avec ces coordonnées. Réessayez plus tard.';
  end if;

  v_client_id := private.beauty_booking_client(v_company.organization_id,v_company.id,v_first_name,v_last_name,v_email,v_phone,p_authorized_account_id);

  v_status:=case when v_org.booking_confirmation_mode='manual' then 'pending' else 'confirmed' end;

  insert into public.appointments(
    organization_id,company_id,site_id,client_id,service_id,staff_id,starts_at,ends_at,status,notes,
    amount_cents,source,created_by,public_token,booking_consent_at,booking_consent_text
  )
  values(
    v_company.organization_id,v_company.id,p_site_id,v_client_id,p_service_ids[1],p_staff_id,p_starts_at,v_ends_at,
    v_status,v_notes,v_amount,'public',null,v_token,now(),
    coalesce(nullif(trim(v_org.booking_privacy_notice),''),'Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre votre rendez-vous.')
  )
  returning id into v_appointment_id;
  perform private.beauty_record_guest_booking(v_appointment_id);

  with ordered as (
    select u.ord::smallint as position,
           s.id as service_id,
           s.name,
           s.duration_minutes,
           s.price_cents,
           coalesce(s.booking_buffer_before_minutes,0) as buffer_before_minutes,
           coalesce(s.booking_buffer_after_minutes,0) as buffer_after_minutes,
           coalesce(
             sum(s.duration_minutes) over (
               order by u.ord
               rows between unbounded preceding and 1 preceding
             ),0
           )::integer as offset_minutes
    from unnest(p_service_ids) with ordinality u(service_id,ord)
    join public.services s
      on s.id=u.service_id
     and s.organization_id=v_company.organization_id
     and s.company_id=v_company.id
  )
  insert into public.appointment_service_items(
    organization_id,company_id,appointment_id,service_id,staff_id,position,service_name,duration_minutes,price_cents,
    buffer_before_minutes,buffer_after_minutes,starts_at,ends_at
  )
  select v_company.organization_id,v_company.id,v_appointment_id,o.service_id,p_staff_id,o.position,o.name,o.duration_minutes,o.price_cents,
         o.buffer_before_minutes,o.buffer_after_minutes,
         p_starts_at+make_interval(mins=>o.offset_minutes),
         p_starts_at+make_interval(mins=>o.offset_minutes+o.duration_minutes)
  from ordered o
  order by o.position;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    v_company.organization_id,null,'appointment.public_company_created','appointment',v_appointment_id::text,
    jsonb_build_object(
      'company_id',v_company.id,
      'status',v_status,
      'service_ids',to_jsonb(p_service_ids),
      'service_count',v_requested_count
    )
  );

  return jsonb_build_object(
    'appointment_id',v_appointment_id,
    'token',v_token,
    'status',v_status,
    'starts_at',p_starts_at,
    'ends_at',v_ends_at,
    'company_name',v_company.name,
    'company_slug',v_company.public_slug,
    'service_name',v_service_label,
    'service_names',to_jsonb(v_service_names),
    'service_count',v_requested_count,
    'total_duration_minutes',v_total_duration,
    'staff_name',v_staff_name,
    'amount_cents',v_amount,
    'site_id',p_site_id,
    'site_name',v_site_name,
    'site_address',nullif(v_site_address,'')
  );
exception
  when exclusion_violation then
    raise exception 'Ce créneau vient d’être réservé par une autre personne.';
end;
$function$;

REVOKE ALL ON FUNCTION private.beauty_create_company_booking(text,uuid,uuid[],uuid,timestamptz,text,text,text,text,text,text,boolean,uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.create_public_booking(p_slug text, p_service_id uuid, p_staff_id uuid, p_starts_at timestamp with time zone, p_first_name text, p_last_name text, p_email text, p_phone text, p_notes text DEFAULT NULL::text, p_website text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
declare
  v_organization public.organizations%rowtype;
  v_duration integer;
  v_amount integer;
  v_service_name text;
  v_staff_name text;
  v_ends_at timestamptz;
  v_starts_local timestamp;
  v_ends_local timestamp;
  v_weekday smallint;
  v_work_start time;
  v_work_end time;
  v_client_id uuid;
  v_appointment_id uuid;
  v_token uuid := gen_random_uuid();
  v_status text;
  v_first_name text := trim(coalesce(p_first_name, ''));
  v_last_name text := nullif(trim(coalesce(p_last_name, '')), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_normalized_phone text;
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  -- Champ invisible anti-robot : toute valeur bloque silencieusement la demande.
  if nullif(trim(coalesce(p_website, '')), '') is not null then
    raise exception 'Réservation impossible.';
  end if;

  select * into v_organization
  from public.organizations
  where slug = lower(trim(p_slug))
    and status in ('trial','active')
    and business_type = 'coiffure'
    and booking_enabled = true;

  if v_organization.id is null then
    raise exception 'La réservation en ligne est indisponible.';
  end if;

  if char_length(v_first_name) not between 2 and 80 then
    raise exception 'Indiquez un prénom valide.';
  end if;

  if v_last_name is not null and char_length(v_last_name) > 100 then
    raise exception 'Le nom est trop long.';
  end if;

  if v_email is null and v_phone is null then
    raise exception 'Indiquez une adresse e-mail ou un numéro de téléphone.';
  end if;

  if v_email is not null and v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'L’adresse e-mail est invalide.';
  end if;

  v_normalized_phone := nullif(regexp_replace(coalesce(v_phone, ''), '[^0-9+]', '', 'g'), '');
  if v_phone is not null and char_length(v_normalized_phone) < 8 then
    raise exception 'Le numéro de téléphone est invalide.';
  end if;

  if v_notes is not null and char_length(v_notes) > 1000 then
    raise exception 'Le message est trop long.';
  end if;

  if p_starts_at < now() + make_interval(hours => v_organization.booking_min_notice_hours) then
    raise exception 'Ce créneau est trop proche.';
  end if;

  if (p_starts_at at time zone v_organization.timezone)::date
      > (now() at time zone v_organization.timezone)::date + v_organization.booking_max_days_ahead then
    raise exception 'Ce créneau est trop éloigné.';
  end if;

  select s.duration_minutes, s.price_cents, s.name
  into v_duration, v_amount, v_service_name
  from public.services s
  where s.id = p_service_id
    and s.organization_id = v_organization.id
    and s.active = true;

  if v_duration is null then
    raise exception 'La prestation sélectionnée est indisponible.';
  end if;

  select st.display_name into v_staff_name
  from public.staff st
  where st.id = p_staff_id
    and st.organization_id = v_organization.id
    and st.active = true;

  if v_staff_name is null then
    raise exception 'Le collaborateur sélectionné est indisponible.';
  end if;

  if not exists (
    select 1 from public.staff_services ss
    where ss.organization_id = v_organization.id
      and ss.staff_id = p_staff_id
      and ss.service_id = p_service_id
  ) then
    raise exception 'Ce collaborateur ne réalise pas cette prestation.';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_starts_local := p_starts_at at time zone v_organization.timezone;
  v_ends_local := v_ends_at at time zone v_organization.timezone;
  v_weekday := extract(isodow from v_starts_local)::smallint - 1;

  if v_starts_local::date <> v_ends_local::date then
    raise exception 'Le créneau est invalide.';
  end if;

  select h.start_time, h.end_time
  into v_work_start, v_work_end
  from public.staff_working_hours h
  where h.organization_id = v_organization.id
    and h.staff_id = p_staff_id
    and h.weekday = v_weekday;

  if v_work_start is null
     or v_starts_local::time < v_work_start
     or v_ends_local::time > v_work_end then
    raise exception 'Ce créneau se situe en dehors des horaires disponibles.';
  end if;

  if exists (
    select 1 from public.staff_breaks b
    where b.organization_id = v_organization.id
      and b.staff_id = p_staff_id
      and b.weekday = v_weekday
      and v_starts_local::time < b.end_time
      and v_ends_local::time > b.start_time
  ) then
    raise exception 'Ce créneau n’est plus disponible.';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.organization_id = v_organization.id
      and a.staff_id = p_staff_id
      and a.status <> 'cancelled'
      and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'Ce créneau vient d’être réservé.';
  end if;

  -- Limitation simple contre les envois répétés avec les mêmes coordonnées.
  if (
    select count(*)
    from public.appointments a
    join public.clients c
      on c.organization_id = a.organization_id
     and c.id = a.client_id
    where a.organization_id = v_organization.id
      and a.source = 'public'
      and a.created_at > now() - interval '24 hours'
      and (
        (v_email is not null and lower(coalesce(c.email, '')) = v_email)
        or (
          v_normalized_phone is not null
          and regexp_replace(coalesce(c.phone, ''), '[^0-9+]', '', 'g') = v_normalized_phone
        )
      )
  ) >= 5 then
    raise exception 'Trop de demandes ont été envoyées avec ces coordonnées. Réessayez plus tard.';
  end if;

  v_client_id := private.beauty_booking_client(v_organization.id,(select company_id from public.staff where organization_id=v_organization.id and id=p_staff_id),v_first_name,v_last_name,v_email,v_phone,NULL);

  v_status := case
    when v_organization.booking_confirmation_mode = 'manual' then 'pending'
    else 'confirmed'
  end;

  insert into public.appointments (
    organization_id,
    client_id,
    service_id,
    staff_id,
    starts_at,
    ends_at,
    status,
    notes,
    amount_cents,
    source,
    created_by,
    public_token
  ) values (
    v_organization.id,
    v_client_id,
    p_service_id,
    p_staff_id,
    p_starts_at,
    v_ends_at,
    v_status,
    v_notes,
    v_amount,
    'public',
    null,
    v_token
  ) returning id into v_appointment_id;
  perform private.beauty_record_guest_booking(v_appointment_id);

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    v_organization.id,
    null,
    'appointment.public_created',
    'appointment',
    v_appointment_id::text,
    jsonb_build_object('status', v_status)
  );

  return jsonb_build_object(
    'appointment_id', v_appointment_id,
    'token', v_token,
    'status', v_status,
    'starts_at', p_starts_at,
    'ends_at', v_ends_at,
    'organization_name', v_organization.name,
    'organization_slug', v_organization.slug,
    'service_name', v_service_name,
    'staff_name', v_staff_name,
    'amount_cents', v_amount
  );
exception
  when exclusion_violation then
    raise exception 'Ce créneau vient d’être réservé par une autre personne.';
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_public_booking_v2(p_slug text, p_service_id uuid, p_staff_id uuid, p_starts_at timestamp with time zone, p_first_name text, p_last_name text, p_email text, p_phone text, p_notes text DEFAULT NULL::text, p_website text DEFAULT NULL::text, p_privacy_consent boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_organization public.organizations%rowtype;
  v_duration integer;
  v_amount integer;
  v_service_name text;
  v_staff_name text;
  v_site_id uuid;
  v_ends_at timestamptz;
  v_starts_local timestamp;
  v_ends_local timestamp;
  v_weekday smallint;
  v_work_start time;
  v_work_end time;
  v_client_id uuid;
  v_appointment_id uuid;
  v_token uuid := gen_random_uuid();
  v_status text;
  v_first_name text := trim(coalesce(p_first_name, ''));
  v_last_name text := nullif(trim(coalesce(p_last_name, '')), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_normalized_phone text;
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  if not coalesce(p_privacy_consent, false) then
    raise exception 'Votre consentement est nécessaire pour enregistrer la réservation.';
  end if;

  if nullif(trim(coalesce(p_website, '')), '') is not null then
    raise exception 'Réservation impossible.';
  end if;

  select * into v_organization
  from public.organizations
  where slug = lower(trim(p_slug))
    and status in ('trial','active')
    and business_type = 'coiffure'
    and booking_enabled = true;

  if v_organization.id is null then
    raise exception 'La réservation en ligne est indisponible.';
  end if;

  if char_length(v_first_name) not between 2 and 80 then
    raise exception 'Indiquez un prénom valide.';
  end if;

  if v_last_name is not null and char_length(v_last_name) > 100 then
    raise exception 'Le nom est trop long.';
  end if;

  if v_email is null and v_phone is null then
    raise exception 'Indiquez une adresse e-mail ou un numéro de téléphone.';
  end if;

  if v_email is not null and v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'L’adresse e-mail est invalide.';
  end if;

  v_normalized_phone := nullif(regexp_replace(coalesce(v_phone, ''), '[^0-9+]', '', 'g'), '');
  if v_phone is not null and char_length(v_normalized_phone) < 8 then
    raise exception 'Le numéro de téléphone est invalide.';
  end if;

  if v_notes is not null and char_length(v_notes) > 1000 then
    raise exception 'Le message est trop long.';
  end if;

  if p_starts_at < now() + make_interval(hours => v_organization.booking_min_notice_hours) then
    raise exception 'Ce créneau est trop proche.';
  end if;

  if (p_starts_at at time zone v_organization.timezone)::date
      > (now() at time zone v_organization.timezone)::date + v_organization.booking_max_days_ahead then
    raise exception 'Ce créneau est trop éloigné.';
  end if;

  select s.duration_minutes, s.price_cents, s.name
  into v_duration, v_amount, v_service_name
  from public.services s
  where s.id = p_service_id
    and s.organization_id = v_organization.id
    and s.active = true;

  if v_duration is null then
    raise exception 'La prestation sélectionnée est indisponible.';
  end if;

  select st.display_name, st.site_id
  into v_staff_name, v_site_id
  from public.staff st
  where st.id = p_staff_id
    and st.organization_id = v_organization.id
    and st.active = true;

  if v_staff_name is null then
    raise exception 'Le collaborateur sélectionné est indisponible.';
  end if;

  if v_site_id is null then
    select s.id into v_site_id
    from public.organization_sites s
    where s.organization_id = v_organization.id
      and s.status = 'active'
    order by s.is_primary desc, s.name, s.id
    limit 1;
  end if;

  if not exists (
    select 1 from public.staff_services ss
    where ss.organization_id = v_organization.id
      and ss.staff_id = p_staff_id
      and ss.service_id = p_service_id
  ) then
    raise exception 'Ce collaborateur ne réalise pas cette prestation.';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_starts_local := p_starts_at at time zone v_organization.timezone;
  v_ends_local := v_ends_at at time zone v_organization.timezone;
  v_weekday := extract(isodow from v_starts_local)::smallint - 1;

  if v_starts_local::date <> v_ends_local::date then
    raise exception 'Le créneau est invalide.';
  end if;

  select h.start_time, h.end_time
  into v_work_start, v_work_end
  from public.staff_working_hours h
  where h.organization_id = v_organization.id
    and h.staff_id = p_staff_id
    and h.weekday = v_weekday;

  if v_work_start is null
     or v_starts_local::time < v_work_start
     or v_ends_local::time > v_work_end then
    raise exception 'Ce créneau se situe en dehors des horaires disponibles.';
  end if;

  if exists (
    select 1 from public.staff_breaks b
    where b.organization_id = v_organization.id
      and b.staff_id = p_staff_id
      and b.weekday = v_weekday
      and v_starts_local::time < b.end_time
      and v_ends_local::time > b.start_time
  ) then
    raise exception 'Ce créneau n’est plus disponible.';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.organization_id = v_organization.id
      and a.staff_id = p_staff_id
      and a.status <> 'cancelled'
      and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'Ce créneau vient d’être réservé.';
  end if;

  if (
    select count(*)
    from public.appointments a
    join public.clients c
      on c.organization_id = a.organization_id
     and c.id = a.client_id
    where a.organization_id = v_organization.id
      and a.source = 'public'
      and a.created_at > now() - interval '24 hours'
      and (
        (v_email is not null and lower(coalesce(c.email, '')) = v_email)
        or (
          v_normalized_phone is not null
          and regexp_replace(coalesce(c.phone, ''), '[^0-9+]', '', 'g') = v_normalized_phone
        )
      )
  ) >= 5 then
    raise exception 'Trop de demandes ont été envoyées avec ces coordonnées. Réessayez plus tard.';
  end if;

  v_client_id := private.beauty_booking_client(v_organization.id,(select company_id from public.staff where organization_id=v_organization.id and id=p_staff_id),v_first_name,v_last_name,v_email,v_phone,NULL);

  v_status := case
    when v_organization.booking_confirmation_mode = 'manual' then 'pending'
    else 'confirmed'
  end;

  insert into public.appointments (
    organization_id,
    client_id,
    service_id,
    staff_id,
    site_id,
    starts_at,
    ends_at,
    status,
    notes,
    amount_cents,
    source,
    created_by,
    public_token,
    booking_consent_at,
    booking_consent_text
  ) values (
    v_organization.id,
    v_client_id,
    p_service_id,
    p_staff_id,
    v_site_id,
    p_starts_at,
    v_ends_at,
    v_status,
    v_notes,
    v_amount,
    'public',
    null,
    v_token,
    now(),
    coalesce(
      nullif(trim(v_organization.booking_privacy_notice), ''),
      'Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre votre rendez-vous.'
    )
  ) returning id into v_appointment_id;
  perform private.beauty_record_guest_booking(v_appointment_id);

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    v_organization.id,
    null,
    'appointment.public_created',
    'appointment',
    v_appointment_id::text,
    jsonb_build_object('status', v_status)
  );

  return jsonb_build_object(
    'appointment_id', v_appointment_id,
    'token', v_token,
    'status', v_status,
    'starts_at', p_starts_at,
    'ends_at', v_ends_at,
    'organization_name', v_organization.name,
    'organization_slug', v_organization.slug,
    'service_name', v_service_name,
    'staff_name', v_staff_name,
    'amount_cents', v_amount
  );
exception
  when exclusion_violation then
    raise exception 'Ce créneau vient d’être réservé par une autre personne.';
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_public_metier_coiffure_company_booking(p_slug text, p_site_id uuid, p_service_id uuid, p_staff_id uuid, p_starts_at timestamp with time zone, p_first_name text, p_last_name text, p_email text, p_phone text, p_notes text DEFAULT NULL::text, p_website text DEFAULT NULL::text, p_privacy_consent boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_company public.organization_companies%rowtype;
  v_org public.organizations%rowtype;
  v_duration integer;
  v_amount integer;
  v_service_name text;
  v_staff_name text;
  v_site_name text;
  v_site_address text;
  v_timezone text;
  v_ends_at timestamptz;
  v_client_id uuid;
  v_appointment_id uuid;
  v_token uuid:=gen_random_uuid();
  v_status text;
  v_first_name text:=trim(coalesce(p_first_name,''));
  v_last_name text:=nullif(trim(coalesce(p_last_name,'')),'');
  v_email text:=nullif(lower(trim(coalesce(p_email,''))),'');
  v_phone text:=nullif(trim(coalesce(p_phone,'')),'');
  v_normalized_phone text;
  v_notes text:=nullif(trim(coalesce(p_notes,'')),'');
begin
  if not coalesce(p_privacy_consent,false) then raise exception 'Votre consentement est nécessaire pour enregistrer la réservation.'; end if;
  if nullif(trim(coalesce(p_website,'')),'') is not null then raise exception 'Réservation impossible.'; end if;

  select c.* into v_company
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.booking_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and o.plan='metier'
    and o.status in ('trial','active')
  limit 1;
  if v_company.id is null then raise exception 'La réservation en ligne est indisponible.'; end if;
  select * into v_org from public.organizations where id=v_company.organization_id;

  if char_length(v_first_name) not between 2 and 80 then raise exception 'Indiquez un prénom valide.'; end if;
  if v_last_name is not null and char_length(v_last_name)>100 then raise exception 'Le nom est trop long.'; end if;
  if v_email is null and v_phone is null then raise exception 'Indiquez une adresse e-mail ou un numéro de téléphone.'; end if;
  if v_email is not null and v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'L’adresse e-mail est invalide.'; end if;
  v_normalized_phone:=nullif(regexp_replace(coalesce(v_phone,''),'[^0-9+]','','g'),'');
  if v_phone is not null and char_length(v_normalized_phone)<8 then raise exception 'Le numéro de téléphone est invalide.'; end if;
  if v_notes is not null and char_length(v_notes)>1000 then raise exception 'Le message est trop long.'; end if;

  select s.name,trim(concat_ws(' ',s.address,s.postal_code,s.city)),s.timezone
  into v_site_name,v_site_address,v_timezone
  from public.organization_sites s
  where s.id=p_site_id
    and s.organization_id=v_company.organization_id
    and s.company_id=v_company.id
    and s.status='active';
  if v_site_name is null then raise exception 'Sélectionnez un lieu actif.'; end if;

  select sv.duration_minutes,sv.price_cents,sv.name
  into v_duration,v_amount,v_service_name
  from public.services sv
  where sv.id=p_service_id
    and sv.organization_id=v_company.organization_id
    and sv.company_id=v_company.id
    and sv.active=true
    and sv.online_booking_enabled=true;
  if v_duration is null then raise exception 'La prestation sélectionnée est indisponible en ligne.'; end if;

  select st.display_name into v_staff_name
  from public.staff st
  where st.id=p_staff_id
    and st.organization_id=v_company.organization_id
    and st.company_id=v_company.id
    and st.site_id=p_site_id
    and st.active=true;
  if v_staff_name is null then raise exception 'Le collaborateur sélectionné est indisponible.'; end if;
  if not exists(
    select 1 from public.staff_services ss
    where ss.organization_id=v_company.organization_id
      and ss.staff_id=p_staff_id
      and ss.service_id=p_service_id
  ) then raise exception 'Ce collaborateur ne réalise pas cette prestation.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_staff_id::text,0));

  if not exists (
    select 1
    from public.get_public_metier_coiffure_company_slots_v2(
      p_slug,p_site_id,p_service_id,(p_starts_at at time zone v_timezone)::date,p_staff_id
    ) available
    where available.staff_id=p_staff_id
      and available.slot_start=p_starts_at
  ) then
    raise exception 'Ce créneau n’est plus disponible. Choisissez une autre heure.';
  end if;

  v_ends_at:=p_starts_at+make_interval(mins=>v_duration);

  if (
    select count(*)
    from public.appointments a
    join public.clients c on c.organization_id=a.organization_id and c.id=a.client_id
    where a.organization_id=v_company.organization_id
      and a.company_id=v_company.id
      and a.source='public'
      and a.created_at>now()-interval '24 hours'
      and c.company_id=v_company.id
      and (
        (v_email is not null and lower(coalesce(c.email,''))=v_email)
        or (
          v_normalized_phone is not null
          and regexp_replace(coalesce(c.phone,''),'[^0-9+]','','g')=v_normalized_phone
        )
      )
  )>=5 then
    raise exception 'Trop de demandes ont été envoyées avec ces coordonnées. Réessayez plus tard.';
  end if;

  v_client_id := private.beauty_booking_client(v_company.organization_id,v_company.id,v_first_name,v_last_name,v_email,v_phone,NULL);

  v_status:=case when v_org.booking_confirmation_mode='manual' then 'pending' else 'confirmed' end;
  insert into public.appointments(
    organization_id,company_id,site_id,client_id,service_id,staff_id,starts_at,ends_at,status,notes,
    amount_cents,source,created_by,public_token,booking_consent_at,booking_consent_text
  )
  values(
    v_company.organization_id,v_company.id,p_site_id,v_client_id,p_service_id,p_staff_id,p_starts_at,v_ends_at,
    v_status,v_notes,v_amount,'public',null,v_token,now(),
    coalesce(nullif(trim(v_org.booking_privacy_notice),''),'Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre votre rendez-vous.')
  )
  returning id into v_appointment_id;
  perform private.beauty_record_guest_booking(v_appointment_id);

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    v_company.organization_id,null,'appointment.public_company_created','appointment',v_appointment_id::text,
    jsonb_build_object('company_id',v_company.id,'status',v_status)
  );

  return jsonb_build_object(
    'appointment_id',v_appointment_id,'token',v_token,'status',v_status,
    'starts_at',p_starts_at,'ends_at',v_ends_at,'company_name',v_company.name,
    'company_slug',v_company.public_slug,'service_name',v_service_name,'staff_name',v_staff_name,
    'amount_cents',v_amount,'site_id',p_site_id,'site_name',v_site_name,'site_address',nullif(v_site_address,'')
  );
exception
  when exclusion_violation then
    raise exception 'Ce créneau vient d’être réservé par une autre personne.';
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_public_metier_coiffure_company_booking_v2(p_slug text, p_site_id uuid, p_service_ids uuid[], p_staff_id uuid, p_starts_at timestamp with time zone, p_first_name text, p_last_name text, p_email text, p_phone text, p_notes text DEFAULT NULL::text, p_website text DEFAULT NULL::text, p_privacy_consent boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $body$
 SELECT private.beauty_create_company_booking(p_slug,p_site_id,p_service_ids,p_staff_id,p_starts_at,
   p_first_name,p_last_name,p_email,p_phone,p_notes,p_website,p_privacy_consent,NULL);
$body$;

CREATE OR REPLACE FUNCTION public.create_coiffure_client_portal_booking_v2(p_account_id uuid, p_site_id uuid, p_service_ids uuid[], p_staff_id uuid, p_starts_at timestamp with time zone, p_notes text DEFAULT NULL::text, p_privacy_consent boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_account public.coiffure_client_portal_accounts%rowtype;
  v_client public.clients%rowtype;
  v_company public.organization_companies%rowtype;
  v_result jsonb;
  v_appointment_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;

  select * into v_account
  from public.coiffure_client_portal_accounts
  where id=p_account_id and user_id=auth.uid() and status='active';

  if v_account.id is null or not public.is_coiffure_client_portal_account(p_account_id) then
    raise exception 'Accès client refusé.';
  end if;

  select * into v_client
  from public.clients
  where organization_id=v_account.organization_id and id=v_account.client_id and status='active';
  if v_client.id is null then raise exception 'Votre dossier client est indisponible.'; end if;

  select * into v_company
  from public.organization_companies oc
  where oc.organization_id=v_account.organization_id
    and oc.status='active'
    and oc.public_page_enabled=true
    and (
      oc.id=v_client.company_id
      or (
        v_client.company_id is null
        and 1=(select count(*) from public.organization_companies only_company
               where only_company.organization_id=v_account.organization_id and only_company.status='active')
      )
    )
  order by oc.is_primary desc,oc.created_at
  limit 1;

  if v_company.id is null or v_company.public_slug is null then
    raise exception 'La page de réservation de votre enseigne est indisponible.';
  end if;

  v_result:=private.beauty_create_company_booking(
    v_company.public_slug,p_site_id,p_service_ids,p_staff_id,p_starts_at,
    v_client.first_name,v_client.last_name,v_client.email,v_client.phone,p_notes,null,p_privacy_consent,p_account_id
  );

  v_appointment_id:=nullif(v_result->>'appointment_id','')::uuid;
  if v_appointment_id is not null then
    update public.appointments
    set booking_origin='client_portal',
        booking_origin_detail='Espace client Beauty',
        booking_origin_meta=coalesce(booking_origin_meta,'{}'::jsonb)
          || jsonb_build_object('portal_account_id',p_account_id),
        updated_at=now()
    where id=v_appointment_id
      and organization_id=v_account.organization_id
      and company_id=v_company.id;
  end if;

  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.coiffure_client_portal_dashboard(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public', 'private', 'pg_catalog'
AS $function$
declare
  v_account public.coiffure_client_portal_accounts%rowtype;
  v_company_id uuid;
  v_result jsonb;
begin
  if not public.is_coiffure_client_portal_account(p_account_id) then
    raise exception 'Accès refusé.';
  end if;

  select * into v_account
  from public.coiffure_client_portal_accounts
  where id=p_account_id;

  select c.company_id into v_company_id
  from public.clients c
  where c.organization_id=v_account.organization_id
    and c.id=v_account.client_id;

  if v_company_id is not null then
    perform private.ensure_beauty_company_loyalty_settings(v_account.organization_id,v_company_id,null);
  end if;

  update public.coiffure_client_portal_accounts
  set last_seen_at=now(),updated_at=now()
  where id=p_account_id;

  perform public.expire_coiffure_loyalty_rewards(v_account.organization_id,v_account.client_id);
  perform public.ensure_coiffure_birthday_reward(v_account.organization_id,v_account.client_id);

  select jsonb_build_object(
    'organization', (
      select jsonb_build_object(
        'id',coalesce(oc.id,o.id),
        'name',coalesce(oc.name,o.public_name,o.name),
        'slug',coalesce(oc.public_slug,o.slug),
        'logo_url',coalesce(oc.logo_url,o.logo_url),
        'primary_color',coalesce(oc.primary_color,o.primary_color,'#c026d3'),
        'email',coalesce(oc.email,o.company_email),
        'phone',coalesce(oc.phone,o.company_phone),
        'address',coalesce(
          (select concat_ws(' ',nullif(os.address,''),nullif(os.postal_code,''),nullif(os.city,''))
             from public.organization_sites os
            where os.organization_id=o.id
              and os.status='active'
              and (v_company_id is null or os.company_id=v_company_id)
            order by os.is_primary desc,os.created_at
            limit 1),
          o.booking_address,
          o.company_address
        )
      )
      from public.organizations o
      left join public.organization_companies oc
        on oc.organization_id=o.id
       and oc.id=v_company_id
       and oc.status='active'
      where o.id=v_account.organization_id
    ),
    'client', (
      select jsonb_build_object(
        'id',c.id,'first_name',c.first_name,'last_name',c.last_name,'email',c.email,'phone',c.phone,
        'birth_date',c.birth_date,'loyalty_opt_in',c.loyalty_opt_in,'birthday_consent',c.birthday_consent,
        'marketing_opt_in',c.marketing_opt_in
      )
      from public.clients c
      where c.organization_id=v_account.organization_id
        and c.id=v_account.client_id
        and (v_company_id is null or c.company_id=v_company_id)
    ),
    'settings', case when v_company_id is not null then
      (select to_jsonb(s) from public.beauty_company_loyalty_settings s
       where s.organization_id=v_account.organization_id and s.company_id=v_company_id)
    else
      (select to_jsonb(s) from public.coiffure_loyalty_settings s
       where s.organization_id=v_account.organization_id)
    end,
    'balance', jsonb_build_object(
      'points',coalesce((select sum(l.points_delta) from public.coiffure_loyalty_ledger l where l.organization_id=v_account.organization_id and l.client_id=v_account.client_id and l.company_id is not distinct from v_company_id),0),
      'visits',coalesce((select sum(l.visits_delta) from public.coiffure_loyalty_ledger l where l.organization_id=v_account.organization_id and l.client_id=v_account.client_id and l.company_id is not distinct from v_company_id),0)
    ),
    'rewards',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.id,'source_type',r.source_type,'title',r.title,'description',r.description,
        'reward_kind',r.reward_kind,'reward_value',r.reward_value,'status',r.status,
        'issued_at',r.issued_at,'expires_at',r.expires_at,'redeemed_at',r.redeemed_at
      ) order by case when r.status='available' then 0 else 1 end,r.issued_at desc)
      from public.coiffure_loyalty_rewards r
      where r.organization_id=v_account.organization_id and r.client_id=v_account.client_id
        and r.company_id is not distinct from v_company_id
    ),'[]'::jsonb),
    'history',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',l.id,'entry_type',l.entry_type,'points_delta',l.points_delta,'visits_delta',l.visits_delta,
        'label',l.label,'created_at',l.created_at
      ) order by l.created_at desc)
      from (
        select * from public.coiffure_loyalty_ledger
        where organization_id=v_account.organization_id and client_id=v_account.client_id
          and company_id is not distinct from v_company_id
        order by created_at desc limit 50
      ) l
    ),'[]'::jsonb),
    'appointments',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'starts_at',a.starts_at,'ends_at',a.ends_at,'status',a.status,'amount_cents',a.amount_cents,
        'public_token',a.public_token,
        'service_name',coalesce(
          (select string_agg(asi.service_name,' + ' order by asi.position)
             from public.appointment_service_items asi
            where asi.appointment_id=a.id),
          s.name,'Prestation'
        ),
        'service_ids',coalesce(
          (select jsonb_agg(asi.service_id order by asi.position)
             from public.appointment_service_items asi
            where asi.appointment_id=a.id),
          jsonb_build_array(a.service_id)
        ),
        'staff_id',a.staff_id,
        'staff_name',coalesce(st.display_name,'Équipe du salon'),
        'site_name',os.name,
        'can_cancel',(
          public.plan_feature_enabled((select org.plan from public.organizations org where org.id=v_account.organization_id),'online_booking_management')
          and a.source='public'
          and a.public_token is not null
          and a.status in ('pending','confirmed')
          and now()<a.starts_at-make_interval(hours=>(select org.booking_cancel_notice_hours from public.organizations org where org.id=v_account.organization_id))
        ),
        'can_reschedule',(
          public.plan_feature_enabled((select org.plan from public.organizations org where org.id=v_account.organization_id),'online_booking_management')
          and a.source='public'
          and a.public_token is not null
          and a.status in ('pending','confirmed')
          and now()<a.starts_at-make_interval(hours=>(select org.booking_cancel_notice_hours from public.organizations org where org.id=v_account.organization_id))
        )
      ) order by a.starts_at desc)
      from (
        select * from public.appointments
        where organization_id=v_account.organization_id
          and (client_id=v_account.client_id OR private.beauty_guest_booking_visible(id,p_account_id))
          and company_id IS NOT DISTINCT FROM v_company_id
        order by starts_at desc limit 100
      ) a
      left join public.services s on s.organization_id=a.organization_id and s.id=a.service_id
      left join public.staff st on st.organization_id=a.organization_id and st.id=a.staff_id
      left join public.organization_sites os on os.organization_id=a.organization_id and os.id=a.site_id
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.request_public_booking_client_portal_activation(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public', 'private', 'pg_catalog'
AS $function$
declare
  v_appointment public.appointments%rowtype;
  v_client public.clients%rowtype;
  v_company public.organization_companies%rowtype;
  v_email text;
  v_auth_email text;
  v_existing_account uuid;
  v_invitation_id uuid;
  v_token text;
  v_masked text;
begin
  select * into v_appointment
  from public.appointments
  where public_token=p_token
    and source='public'
  for update;

  if v_appointment.id is null then raise exception 'Réservation introuvable.'; end if;
  if not private.coiffure_client_portal_company_feature_enabled(v_appointment.organization_id,v_appointment.company_id) then
    raise exception 'L’espace client est actuellement indisponible.';
  end if;

  select * into v_client
  from public.clients
  where organization_id=v_appointment.organization_id
    and id=v_appointment.client_id
    and status='active';

  if v_client.id is null then raise exception 'Dossier client introuvable.'; end if;

  select * into v_company
  from public.organization_companies
  where organization_id=v_appointment.organization_id
    and id=v_appointment.company_id
    and status='active';

  select email_snapshot into v_email from private.beauty_guest_booking_proofs
  where appointment_id=v_appointment.id AND organization_id=v_appointment.organization_id
    AND original_client_id=v_appointment.client_id AND company_id IS NOT DISTINCT FROM v_appointment.company_id;
  if not found then raise exception 'Pour cette réservation historique, demandez une invitation au salon.'; end if;
  if v_email is null then
    raise exception 'Ajoutez une adresse e-mail à votre dossier pour activer l’espace client.';
  end if;
  v_masked:=regexp_replace(v_email,'^(.{1,2}).*(@.*)$','\1••••\2');

  if auth.uid() is not null then
    select lower(trim(email)) into v_auth_email from auth.users where id=auth.uid() AND email_confirmed_at IS NOT NULL;
    if v_auth_email=v_email then
      v_existing_account := private.beauty_claim_guest_booking(v_appointment.id);
      return jsonb_build_object('status','active','account_id',v_existing_account,'masked_email',v_masked,'company_name',coalesce(v_company.name,'Votre enseigne'));
    end if;
  end if;

  if (
    select count(*)
    from public.coiffure_client_portal_invitations i
    where i.organization_id=v_appointment.organization_id
      and i.client_id=v_client.id
      and lower(i.email)=v_email
      and i.invitation_source='public_booking'
      and i.created_at>now()-interval '24 hours'
  )>=3 then
    raise exception 'Plusieurs e-mails d’activation ont déjà été envoyés. Réessayez plus tard.';
  end if;

  select i.id into v_invitation_id
  from public.coiffure_client_portal_invitations i
  where i.organization_id=v_appointment.organization_id
    and i.client_id=v_client.id
    and lower(i.email)=v_email
    and i.status='pending'
    and i.expires_at>now()
    and i.created_at>now()-interval '5 minutes'
  order by i.created_at desc
  limit 1;

  if v_invitation_id is not null then
    return jsonb_build_object('status','sent','masked_email',v_masked,'company_name',coalesce(v_company.name,'Votre enseigne'));
  end if;

  update public.coiffure_client_portal_invitations
  set status='revoked',revoked_at=now(),updated_at=now()
  where organization_id=v_appointment.organization_id
    and client_id=v_client.id
    and lower(email)=v_email
    and status='pending';

  v_token:=encode(extensions.gen_random_bytes(32),'hex');

  insert into public.coiffure_client_portal_invitations(
    organization_id,client_id,email,display_name,token_hash,status,expires_at,invited_by,invitation_source,booking_appointment_id
  )
  values(
    v_appointment.organization_id,v_client.id,v_email,
    trim(concat_ws(' ',v_client.first_name,v_client.last_name)),
    extensions.digest(v_token,'sha256'),'pending',now()+interval '7 days',null,'public_booking',v_appointment.id
  )
  returning id into v_invitation_id;

  perform public.enqueue_coiffure_client_portal_invitation_email(v_invitation_id,v_token);

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    v_appointment.organization_id,null,'coiffure.client_portal_activation_requested','client',v_client.id::text,
    jsonb_build_object('company_id',v_appointment.company_id,'appointment_id',v_appointment.id,'invitation_id',v_invitation_id)
  );

  return jsonb_build_object('status','sent','masked_email',v_masked,'company_name',coalesce(v_company.name,'Votre enseigne'));
end;
$function$;

CREATE OR REPLACE FUNCTION public.public_booking_client_portal_activation_status(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'private', 'pg_catalog'
AS $function$
declare
  v_appointment public.appointments%rowtype;
  v_client public.clients%rowtype;
  v_company public.organization_companies%rowtype;
  v_active boolean := false;
  v_pending boolean := false;
  v_email text;
  v_masked text;
begin
  select * into v_appointment
  from public.appointments
  where public_token=p_token
    and source='public'
  limit 1;

  if v_appointment.id is null then return null; end if;

  select * into v_client
  from public.clients
  where organization_id=v_appointment.organization_id
    and id=v_appointment.client_id
    and status='active';

  if v_client.id is null then return null; end if;

  select * into v_company
  from public.organization_companies
  where organization_id=v_appointment.organization_id
    and id=v_appointment.company_id
    and status='active';

  select g.email_snapshot into v_email from private.beauty_guest_booking_proofs g where g.appointment_id=v_appointment.id and g.organization_id=v_appointment.organization_id and g.original_client_id=v_appointment.client_id and g.company_id is not distinct from v_appointment.company_id;
  if v_email is not null then
    v_masked:=regexp_replace(v_email,'^(.{1,2}).*(@.*)$','\1••••\2');
  end if;

  select exists(
    select 1
    from public.coiffure_client_portal_accounts a
    where a.organization_id=v_appointment.organization_id
      and a.client_id=v_client.id
      and a.status='active'
      and (v_email is null or lower(a.email)=v_email)
  ) OR EXISTS(select 1 from private.beauty_guest_booking_proofs g join public.coiffure_client_portal_accounts ca on ca.organization_id=g.organization_id and ca.user_id=g.verified_user_id join public.clients cc on cc.organization_id=ca.organization_id and cc.id=ca.client_id where g.appointment_id=v_appointment.id and g.original_client_id=v_appointment.client_id and g.company_id is not distinct from v_appointment.company_id and cc.company_id is not distinct from g.company_id and cc.status='active' and ca.status='active' and g.verified_at is not null) into v_active;

  select exists(
    select 1
    from public.coiffure_client_portal_invitations i
    where i.organization_id=v_appointment.organization_id
      and i.client_id=v_client.id
      and i.status='pending'
      and i.expires_at>now()
      and (v_email is null or lower(i.email)=v_email)
  ) into v_pending;

  return jsonb_build_object(
    'available', private.coiffure_client_portal_company_feature_enabled(v_appointment.organization_id,v_appointment.company_id) and exists(select 1 from private.beauty_guest_booking_proofs g where g.appointment_id=v_appointment.id and g.original_client_id=v_appointment.client_id and g.company_id is not distinct from v_appointment.company_id and g.email_snapshot is not null),
    'already_active',v_active,
    'invitation_pending',v_pending,
    'masked_email',v_masked,
    'company_name',coalesce(v_company.name,'Votre enseigne')
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.accept_coiffure_client_portal_invitation(p_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public', 'private', 'pg_catalog'
AS $function$
declare v_inv public.coiffure_client_portal_invitations%rowtype; v_id uuid; v_auth_email text;
begin
  if auth.uid() is null then raise exception 'Connecte-toi pour activer cet accès.'; end if;
  select lower(trim(email)) into v_auth_email from auth.users where id=auth.uid() AND email_confirmed_at IS NOT NULL;
  if v_auth_email is null then raise exception 'Confirmez votre adresse e-mail avant d’activer cet accès.'; end if;
  select * into v_inv from public.coiffure_client_portal_invitations
  where token_hash=extensions.digest(trim(p_token),'sha256') for update;
  if v_inv.id is null then raise exception 'Invitation introuvable.'; end if;
  if v_inv.status<>'pending' then raise exception 'Cette invitation n’est plus disponible.'; end if;
  if v_inv.expires_at<=now() then update public.coiffure_client_portal_invitations set status='expired',updated_at=now() where id=v_inv.id; raise exception 'Cette invitation a expiré.'; end if;
  if lower(v_inv.email)<>v_auth_email then raise exception 'Cette invitation est liée à une autre adresse e-mail.'; end if;
  if not private.coiffure_client_portal_company_feature_enabled(
      v_inv.organization_id,
      (select c.company_id from public.clients c where c.organization_id=v_inv.organization_id and c.id=v_inv.client_id)
    ) then raise exception 'L’espace client est actuellement désactivé.'; end if;

  if v_inv.invitation_source='public_booking' then
    if v_inv.booking_appointment_id is null OR NOT EXISTS (
      select 1 from private.beauty_guest_booking_proofs g
      where g.appointment_id=v_inv.booking_appointment_id AND g.organization_id=v_inv.organization_id
        AND g.original_client_id=v_inv.client_id AND g.email_snapshot=lower(trim(v_inv.email))
    ) then raise exception 'Cette ancienne invitation nécessite une nouvelle invitation du salon.'; end if;
    v_id := private.beauty_claim_guest_booking(v_inv.booking_appointment_id);
    update public.coiffure_client_portal_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now(),updated_at=now() where id=v_inv.id;
    return v_id;
  end if;

  insert into public.coiffure_client_portal_accounts(organization_id,client_id,user_id,email,display_name,status,last_seen_at)
  values(v_inv.organization_id,v_inv.client_id,auth.uid(),v_auth_email,v_inv.display_name,'active',now())
  on conflict(organization_id,client_id,user_id) do update set email=excluded.email,display_name=coalesce(excluded.display_name,public.coiffure_client_portal_accounts.display_name),status='active',last_seen_at=now(),updated_at=now()
  returning id into v_id;

  update public.coiffure_client_portal_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now(),updated_at=now() where id=v_inv.id;
  perform public.apply_coiffure_welcome_benefit(v_inv.organization_id,v_inv.client_id);
  perform public.ensure_coiffure_birthday_reward(v_inv.organization_id,v_inv.client_id);
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_coiffure_client_portal_invitation_email(p_invitation_id uuid, p_raw_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_inv public.coiffure_client_portal_invitations%rowtype;
  v_org public.organizations%rowtype;
  v_client public.clients%rowtype;
  v_company public.organization_companies%rowtype;
  v_key text;
begin
  select * into v_inv
  from public.coiffure_client_portal_invitations
  where id=p_invitation_id;

  if v_inv.id is null or v_inv.status<>'pending' or v_inv.expires_at<=now() then return; end if;
  if extensions.digest(p_raw_token,'sha256') IS DISTINCT FROM v_inv.token_hash then raise exception 'Jeton d’invitation invalide.'; end if;

  select * into v_org
  from public.organizations
  where id=v_inv.organization_id;

  select * into v_client
  from public.clients
  where organization_id=v_inv.organization_id
    and id=v_inv.client_id;

  if v_client.company_id is not null then
    select * into v_company
    from public.organization_companies
    where organization_id=v_inv.organization_id
      and id=v_client.company_id
      and status='active';
  end if;

  v_key := 'coiffure-client-portal:'||v_inv.id::text||':'||encode(extensions.digest(p_raw_token,'sha256'),'hex');

  insert into public.email_outbox(
    organization_id,appointment_id,template_key,recipient_email,recipient_name,payload,dedupe_key,status,scheduled_for,attempts
  )
  values(
    v_inv.organization_id,null,'coiffure_client_portal_invitation',lower(v_inv.email),
    coalesce(v_inv.display_name,v_client.first_name),
    jsonb_build_object(
      'organization_name',coalesce(v_company.name,v_org.public_name,v_org.name),
      'organization_slug',coalesce(v_company.public_slug,v_org.slug),
      'organization_primary_color',coalesce(v_company.primary_color,v_org.primary_color),
      'organization_logo_url',coalesce(v_company.logo_url,v_org.logo_url),
      'client_name',trim(concat(v_client.first_name,' ',coalesce(v_client.last_name,''))),
      'invitation_token',p_raw_token,
      'invited_name',v_inv.display_name,
      'expires_at',v_inv.expires_at,
      'contact_email',coalesce(v_company.email,v_org.company_email),
      'contact_phone',coalesce(v_company.phone,v_org.company_phone)
    ),
    v_key,'pending',now(),0
  )
  on conflict(dedupe_key) do nothing;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_coiffure_client_portal_invitation(p_organization_id uuid, p_client_id uuid, p_email text, p_display_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public', 'private', 'pg_catalog'
AS $function$
declare v_id uuid; v_token text; v_email text:=lower(trim(coalesce(p_email,'')));
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'Droits insuffisants.'; end if;
  if not private.coiffure_client_portal_company_feature_enabled(
      p_organization_id,
      (select c.company_id from public.clients c where c.organization_id=p_organization_id and c.id=p_client_id)
    ) then raise exception 'L’espace client de cette enseigne est désactivé.'; end if;
  if not public.can_access_client(p_organization_id,p_client_id)
    or not public.metier_company_access_allows(p_organization_id,(select company_id from public.clients where organization_id=p_organization_id and id=p_client_id),auth.uid()) then
    raise exception 'Dossier hors de votre périmètre.';
  end if;
  if v_email='' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Adresse e-mail invalide.'; end if;
  if not exists(select 1 from public.clients where organization_id=p_organization_id and id=p_client_id and status='active') then raise exception 'Client introuvable.'; end if;
  if exists(select 1 from public.coiffure_client_portal_accounts where organization_id=p_organization_id and client_id=p_client_id and lower(email)=v_email and status='active') then raise exception 'Ce client possède déjà un accès actif avec cette adresse.'; end if;

  update public.coiffure_client_portal_invitations set status='revoked',revoked_at=now(),updated_at=now()
  where organization_id=p_organization_id and client_id=p_client_id and lower(email)=v_email and status='pending';

  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.coiffure_client_portal_invitations(organization_id,client_id,email,display_name,token_hash,status,expires_at,invited_by)
  values(p_organization_id,p_client_id,v_email,nullif(trim(coalesce(p_display_name,'')),''),extensions.digest(v_token,'sha256'),'pending',now()+interval '7 days',auth.uid())
  returning id into v_id;
  perform public.enqueue_coiffure_client_portal_invitation_email(v_id,v_token);
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.resend_coiffure_client_portal_invitation(p_organization_id uuid, p_invitation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
declare v_token text; v_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'Droits insuffisants.'; end if;
  if not exists(select 1 from public.coiffure_client_portal_invitations i join public.clients c on c.organization_id=i.organization_id and c.id=i.client_id
    where i.id=p_invitation_id and i.organization_id=p_organization_id
      and public.can_access_client(i.organization_id,i.client_id)
      and public.metier_company_access_allows(i.organization_id,c.company_id,auth.uid())
      and (i.invitation_source<>'public_booking' OR i.booking_appointment_id IS NOT NULL)) then
    raise exception 'Invitation hors de votre périmètre ou à renouveler depuis le salon.';
  end if;
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  update public.coiffure_client_portal_invitations
  set token_hash=extensions.digest(v_token,'sha256'),status='pending',expires_at=now()+interval '7 days',revoked_at=null,updated_at=now()
  where organization_id=p_organization_id and id=p_invitation_id and status in ('pending','expired')
  returning id into v_id;
  if v_id is null then raise exception 'Invitation introuvable.'; end if;
  perform public.enqueue_coiffure_client_portal_invitation_email(v_id,v_token);
end;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_coiffure_client_portal_invitation_email(uuid,text) FROM PUBLIC,anon,authenticated;
COMMIT;
