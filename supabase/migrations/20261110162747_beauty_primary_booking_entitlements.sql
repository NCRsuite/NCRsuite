-- LOCAL CANDIDATE: not applied remotely. Requires security migration first. No commercial catalog changes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
DO $preflight$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_metier_coiffure_company_slots_v2' AND md5(p.prosrc)='7418d855d239e579ebb185758368dd7b' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: get_public_metier_coiffure_company_slots_v2. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_metier_coiffure_company_multi_slots' AND md5(p.prosrc)='d9fb6361354c910cd1bd3508343b8755' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: get_public_metier_coiffure_company_multi_slots. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_metier_coiffure_company_page' AND md5(p.prosrc)='2f3cf2e987d1ed57491b66a99837281a' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: get_public_metier_coiffure_company_page. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_metier_coiffure_company_slots' AND md5(p.prosrc)='1bae62dd0d42320a69935427eb49c2a5' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: get_public_metier_coiffure_company_slots. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_metier_coiffure_company_slots_v2_base' AND md5(p.prosrc)='20b23cab4c3955a500646a17a5497af5' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: get_public_metier_coiffure_company_slots_v2_base. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_metier_coiffure_company_multi_slots_base' AND md5(p.prosrc)='9f33be8a35263d96eaa8fa42b64be273' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: get_public_metier_coiffure_company_multi_slots_base. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_metier_coiffure_next_slots' AND md5(p.prosrc)='b8e2633f9fbd98316c8d9b5ccce2686b' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: get_public_metier_coiffure_next_slots. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_metier_coiffure_next_multi_slots' AND md5(p.prosrc)='8e5e7d93b2098f038aa2f58d14f025fd' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: get_public_metier_coiffure_next_multi_slots. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_public_metier_coiffure_company_booking' AND md5(p.prosrc)='ddadcb37db19f50e525c43503fd4ead6' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: create_public_metier_coiffure_company_booking. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_public_booking' AND md5(p.prosrc)='dfbac68c07646fb447ee891e7e9eec0c' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: create_public_booking. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_public_booking_v2' AND md5(p.prosrc)='c91cce89e2897b8104b63ad8551cef1a' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: create_public_booking_v2. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_booking_page' AND md5(p.prosrc)='ffa12fc842b7c996a4a9d66ab53834ed' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: get_public_booking_page. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_available_slots_v2' AND md5(p.prosrc)='08b7c496cd3f52621943f676f8d5f5d5' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: get_public_available_slots_v2. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_public_booking_v3' AND md5(p.prosrc)='3bcd6c12a6f0c71af7c7c68e33bdf34a' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: create_public_booking_v3. Review before applying.'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_available_slots' AND md5(p.prosrc)='d0d87b4fc6450a459df1b5613957f2c5' AND p.prosecdef) THEN RAISE EXCEPTION 'Definition changed: get_public_available_slots. Review before applying.'; END IF;
END; $preflight$;
DO $preflight$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private' AND p.proname='beauty_create_company_booking' AND md5(p.prosrc)='a666d05fd27c2034abaee55a97e68d4d') THEN RAISE EXCEPTION 'Security stage missing or changed'; END IF; END; $preflight$;
CREATE FUNCTION private.beauty_public_company_allowed(p_org uuid,p_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $body$
 SELECT EXISTS(SELECT 1 FROM public.organizations o JOIN public.organization_companies c ON c.organization_id=o.id
   WHERE o.id=p_org AND c.id=p_company AND o.business_type='coiffure' AND o.status IN ('trial','active')
     AND c.status='active' AND c.public_page_enabled AND public.organization_has_plan_feature(o.id,'public_booking')
     AND (public.organization_has_plan_feature(o.id,'multi_site') OR (
       c.is_primary AND 1=(SELECT count(*) FROM public.organization_companies x WHERE x.organization_id=o.id AND x.status='active' AND x.is_primary)
       AND 1=(SELECT count(*) FROM public.organization_sites s WHERE s.organization_id=o.id AND s.company_id=c.id AND s.status='active' AND s.is_primary)
     )));
$body$;
CREATE FUNCTION private.beauty_public_site_allowed(p_org uuid,p_company uuid,p_site uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $body$
 SELECT private.beauty_public_company_allowed(p_org,p_company) AND EXISTS(
   SELECT 1 FROM public.organization_sites s WHERE s.organization_id=p_org AND s.company_id=p_company AND s.id=p_site AND s.status='active'
   AND (public.organization_has_plan_feature(p_org,'multi_site') OR s.is_primary));
$body$;
CREATE FUNCTION private.beauty_public_booking_slug(p_slug text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $body$
DECLARE v_slug text; v_org uuid;
BEGIN
  -- A known company slug never falls back to an organization with the same slug.
  SELECT public_slug INTO v_slug FROM public.organization_companies WHERE lower(public_slug)=lower(trim(p_slug));
  IF FOUND THEN RETURN v_slug; END IF;
  SELECT id INTO v_org FROM public.organizations WHERE slug=lower(trim(p_slug)) AND business_type='coiffure';
  IF EXISTS(SELECT 1 FROM public.organization_companies WHERE organization_id=v_org AND status='active') THEN
    IF 1<>(SELECT count(*) FROM public.organization_companies WHERE organization_id=v_org AND status='active' AND is_primary) THEN
      RAISE EXCEPTION 'La réservation nécessite une enseigne principale non ambiguë.';
    END IF;
    SELECT public_slug INTO v_slug FROM public.organization_companies WHERE organization_id=v_org AND status='active' AND is_primary;
    IF v_slug IS NULL THEN RAISE EXCEPTION 'Le lien de réservation de l’enseigne est indisponible.'; END IF;
  END IF;
  RETURN v_slug;
END;
$body$;
CREATE FUNCTION private.beauty_legacy_staff_allowed(p_org uuid,p_staff uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $body$
 SELECT public.organization_has_plan_feature(p_org,'public_booking') AND EXISTS(
   SELECT 1 FROM public.staff st WHERE st.id=p_staff AND st.organization_id=p_org AND st.active
   AND (NOT EXISTS(SELECT 1 FROM public.organization_companies c WHERE c.organization_id=p_org AND c.status='active')
     OR private.beauty_public_site_allowed(p_org,st.company_id,st.site_id)));
$body$;
REVOKE ALL ON FUNCTION private.beauty_public_company_allowed(uuid,uuid),private.beauty_public_site_allowed(uuid,uuid,uuid),
  private.beauty_public_booking_slug(text),private.beauty_legacy_staff_allowed(uuid,uuid) FROM PUBLIC,anon,authenticated;

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
  if not exists(select 1 from public.organization_companies c where lower(c.public_slug)=lower(trim(p_slug)) AND private.beauty_public_site_allowed(c.organization_id,c.id,p_site_id)) then raise exception 'Établissement non autorisé pour cette réservation.'; end if;
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
    and private.beauty_public_company_allowed(c.organization_id,c.id)
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

CREATE OR REPLACE FUNCTION public.get_public_metier_coiffure_company_slots_v2(p_slug text, p_site_id uuid, p_service_id uuid, p_date date, p_staff_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, staff_id uuid, staff_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'private', 'pg_catalog'
AS $function$
declare
  v_org_id uuid;
  v_company_id uuid;
begin
  if not exists(select 1 from public.organization_companies c where lower(c.public_slug)=lower(trim(p_slug)) AND private.beauty_public_site_allowed(c.organization_id,c.id,p_site_id)) then return; end if;
  select c.organization_id,c.id into v_org_id,v_company_id
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.status='active'
    and c.public_page_enabled=true
    and o.business_type='coiffure'
    and private.beauty_public_company_allowed(c.organization_id,c.id)
    and o.status in ('trial','active')
  limit 1;
  if v_company_id is null then return; end if;

  return query
  select s.slot_start,s.slot_end,s.staff_id,s.staff_name
  from public.get_public_metier_coiffure_company_slots_v2_base(
    p_slug,p_site_id,p_service_id,p_date,p_staff_id
  ) s
  where private.beauty_service_sequence_resources_available(
    v_org_id,v_company_id,p_site_id,array[p_service_id]::uuid[],s.slot_start
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_metier_coiffure_company_multi_slots(p_slug text, p_site_id uuid, p_service_ids uuid[], p_date date, p_staff_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, staff_id uuid, staff_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'private', 'pg_catalog'
AS $function$
declare
  v_org_id uuid;
  v_company_id uuid;
begin
  if not exists(select 1 from public.organization_companies c where lower(c.public_slug)=lower(trim(p_slug)) AND private.beauty_public_site_allowed(c.organization_id,c.id,p_site_id)) then return; end if;
  select c.organization_id,c.id into v_org_id,v_company_id
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.status='active'
    and c.public_page_enabled=true
    and o.business_type='coiffure'
    and private.beauty_public_company_allowed(c.organization_id,c.id)
    and o.status in ('trial','active')
  limit 1;
  if v_company_id is null then return; end if;

  return query
  select s.slot_start,s.slot_end,s.staff_id,s.staff_name
  from public.get_public_metier_coiffure_company_multi_slots_base(
    p_slug,p_site_id,p_service_ids,p_date,p_staff_id
  ) s
  where private.beauty_service_sequence_resources_available(
    v_org_id,v_company_id,p_site_id,p_service_ids,s.slot_start
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_metier_coiffure_company_page(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_company public.organization_companies%rowtype;
  v_org public.organizations%rowtype;
  v_sites jsonb;
  v_services jsonb;
  v_staff jsonb;
  v_logo text;
  v_color text;
  v_brand_name text;
begin
  select c.* into v_company
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and private.beauty_public_company_allowed(c.organization_id,c.id)
    and o.status in ('trial','active')
  limit 1;
  if v_company.id is null then return null; end if;

  select * into v_org from public.organizations where id=v_company.organization_id;
  select coalesce(b.logo_url,b.compact_logo_url),coalesce(b.primary_color,v_company.primary_color),b.name
  into v_logo,v_color,v_brand_name
  from public.organization_brands b
  where b.organization_id=v_company.organization_id and b.company_id=v_company.id and b.status='active'
  order by b.is_primary desc,b.created_at
  limit 1;
  v_logo := coalesce(v_company.logo_url,v_logo,v_org.logo_url);
  v_color := coalesce(v_company.primary_color,v_color,v_org.primary_color,'#2997ff');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'name',s.name,'address',s.address,'postal_code',s.postal_code,'city',s.city,
    'phone',coalesce(s.phone,v_company.phone),'email',coalesce(s.email,v_company.email),'timezone',s.timezone,'is_primary',s.is_primary
  ) order by s.is_primary desc,s.name),'[]'::jsonb)
  into v_sites
  from public.organization_sites s
  where s.organization_id=v_company.organization_id and s.company_id=v_company.id and s.status='active' AND private.beauty_public_site_allowed(s.organization_id,s.company_id,s.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',sv.id,'name',sv.name,'description',sv.description,'duration_minutes',sv.duration_minutes,'price_cents',sv.price_cents,
    'image_url',sv.image_url,'category_name',nullif(trim(sv.category_name),''),
    'online_booking_enabled',sv.online_booking_enabled,
    'booking_min_notice_hours',sv.booking_min_notice_hours,
    'booking_max_days_ahead',sv.booking_max_days_ahead,
    'booking_buffer_before_minutes',sv.booking_buffer_before_minutes,
    'booking_buffer_after_minutes',sv.booking_buffer_after_minutes,
    'booking_weekdays',sv.booking_weekdays,
    'booking_start_time',sv.booking_start_time,
    'booking_end_time',sv.booking_end_time
  ) order by coalesce(nullif(trim(sv.category_name),''),'Autres'),sv.name),'[]'::jsonb)
  into v_services
  from public.services sv
  where sv.organization_id=v_company.organization_id and sv.company_id=v_company.id and sv.active=true
    and coalesce(sv.online_booking_enabled,true)=true
    and exists(
      select 1 from public.staff_services ss
      join public.staff st on st.organization_id=ss.organization_id and st.id=ss.staff_id and st.active=true and st.company_id=v_company.id AND private.beauty_public_site_allowed(st.organization_id,st.company_id,st.site_id)
      where ss.organization_id=v_company.organization_id and ss.service_id=sv.id
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',st.id,'display_name',st.display_name,'color',st.color,'site_id',st.site_id,
    'service_ids',coalesce((select jsonb_agg(ss.service_id order by ss.service_id) from public.staff_services ss where ss.organization_id=st.organization_id and ss.staff_id=st.id),'[]'::jsonb)
  ) order by st.display_name),'[]'::jsonb)
  into v_staff
  from public.staff st
  where st.organization_id=v_company.organization_id and st.company_id=v_company.id and st.active=true AND private.beauty_public_site_allowed(st.organization_id,st.company_id,st.site_id)
    and exists(select 1 from public.staff_working_hours h where h.organization_id=st.organization_id and h.staff_id=st.id);

  if not public.organization_has_plan_feature(v_org.id,'commercial_branding') then
    v_logo:=null; v_color:='#2997ff'; v_brand_name:=null;
  end if;
  return jsonb_build_object(
    'company',jsonb_build_object(
      'id',v_company.id,'organization_id',v_company.organization_id,'name',coalesce(v_brand_name,v_company.name),
      'legal_name',v_company.legal_name,'public_slug',v_company.public_slug,'logo_url',v_logo,'primary_color',v_color,
      'tagline',CASE WHEN public.organization_has_plan_feature(v_org.id,'commercial_branding') THEN v_company.public_tagline ELSE NULL END,'description',v_company.public_description,'banner_url',v_company.public_banner_url,
      'banner_position_x',v_company.public_banner_position_x,'banner_position_y',v_company.public_banner_position_y,
      'banner_landscape_zoom',v_company.public_banner_landscape_zoom,
      'banner_portrait_position_x',v_company.public_banner_portrait_position_x,
      'banner_portrait_position_y',v_company.public_banner_portrait_position_y,
      'banner_portrait_zoom',v_company.public_banner_portrait_zoom,
      'hours_text',CASE WHEN public.organization_has_plan_feature(v_org.id,'commercial_branding') THEN v_company.public_hours_text ELSE NULL END,'practical_info',CASE WHEN public.organization_has_plan_feature(v_org.id,'commercial_branding') THEN v_company.public_practical_info ELSE NULL END,
      'email',v_company.email,'phone',v_company.phone,'booking_enabled',v_company.booking_enabled,
      'show_ncr_branding',CASE WHEN public.organization_has_plan_feature(v_org.id,'white_label') THEN coalesce(v_org.show_ncr_branding,true) ELSE true END
    ),
    'settings',jsonb_build_object(
      'confirmation_mode',v_org.booking_confirmation_mode,'slot_interval',v_org.booking_slot_interval,
      'min_notice_hours',v_org.booking_min_notice_hours,'max_days_ahead',v_org.booking_max_days_ahead,
      'cancel_notice_hours',v_org.booking_cancel_notice_hours,'welcome_text',v_org.booking_welcome_text,
      'cancellation_policy',v_org.booking_cancellation_policy,'privacy_notice',v_org.booking_privacy_notice,
      'contact_email',coalesce(v_company.email,v_org.booking_contact_email),'contact_phone',coalesce(v_company.phone,v_org.booking_contact_phone)
    ),
    'sites',v_sites,'services',v_services,'staff',v_staff
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_metier_coiffure_company_slots(p_slug text, p_site_id uuid, p_service_id uuid, p_date date, p_staff_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, staff_id uuid, staff_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_company_id uuid;
  v_org_id uuid;
  v_timezone text;
  v_interval integer;
  v_min_notice integer;
  v_max_days integer;
  v_duration integer;
  v_weekday smallint;
  v_today date;
begin
  if not exists(select 1 from public.organization_companies c where lower(c.public_slug)=lower(trim(p_slug)) AND private.beauty_public_site_allowed(c.organization_id,c.id,p_site_id)) then return; end if;
  select c.id,c.organization_id,o.booking_slot_interval,o.booking_min_notice_hours,o.booking_max_days_ahead
  into v_company_id,v_org_id,v_interval,v_min_notice,v_max_days
  from public.organization_companies c join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug)) and c.public_page_enabled=true and c.booking_enabled=true and c.status='active'
    and o.business_type='coiffure' and private.beauty_public_company_allowed(c.organization_id,c.id) and o.status in ('trial','active');
  if v_company_id is null then return; end if;

  select s.timezone into v_timezone from public.organization_sites s
  where s.id=p_site_id and s.organization_id=v_org_id and s.company_id=v_company_id and s.status='active';
  if v_timezone is null then return; end if;

  select sv.duration_minutes into v_duration from public.services sv
  where sv.id=p_service_id and sv.organization_id=v_org_id and sv.company_id=v_company_id and sv.active=true;
  if v_duration is null then return; end if;

  v_today := (now() at time zone v_timezone)::date;
  if p_date<v_today or p_date>v_today+v_max_days then return; end if;
  v_weekday := extract(isodow from p_date)::smallint-1;

  return query
  with candidates as (
    select st.id candidate_staff_id,st.display_name candidate_staff_name,
      gs.local_start,gs.local_start+make_interval(mins=>v_duration) local_end
    from public.staff st
    join public.staff_services ss on ss.organization_id=st.organization_id and ss.staff_id=st.id and ss.service_id=p_service_id
    join public.staff_working_hours h on h.organization_id=st.organization_id and h.staff_id=st.id and h.weekday=v_weekday
    cross join lateral generate_series(
      p_date+h.start_time,
      p_date+h.end_time-make_interval(mins=>v_duration),
      make_interval(mins=>v_interval)
    ) gs(local_start)
    where st.organization_id=v_org_id and st.company_id=v_company_id and st.active=true and st.site_id=p_site_id
      and (p_staff_id is null or st.id=p_staff_id)
  )
  select c.local_start at time zone v_timezone,c.local_end at time zone v_timezone,c.candidate_staff_id,c.candidate_staff_name
  from candidates c
  where (c.local_start at time zone v_timezone)>=now()+make_interval(hours=>v_min_notice)
    and not exists(select 1 from public.staff_breaks b where b.organization_id=v_org_id and b.staff_id=c.candidate_staff_id and b.weekday=v_weekday and c.local_start::time<b.end_time and c.local_end::time>b.start_time)
    and not exists(select 1 from public.appointments a where a.organization_id=v_org_id and a.staff_id=c.candidate_staff_id and a.status<>'cancelled' and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(c.local_start at time zone v_timezone,c.local_end at time zone v_timezone,'[)'))
  order by slot_start,staff_name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_metier_coiffure_company_slots_v2_base(p_slug text, p_site_id uuid, p_service_id uuid, p_date date, p_staff_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, staff_id uuid, staff_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_company_id uuid;
  v_org_id uuid;
  v_timezone text;
  v_org_min_notice integer;
  v_org_max_days integer;
  v_service_min_notice integer;
  v_service_max_days integer;
  v_buffer_before integer;
  v_buffer_after integer;
  v_weekdays smallint[];
  v_start_time time;
  v_end_time time;
  v_online boolean;
  v_effective_min_notice integer;
  v_effective_max_days integer;
  v_weekday smallint;
  v_today date;
begin
  if not exists(select 1 from public.organization_companies c where lower(c.public_slug)=lower(trim(p_slug)) AND private.beauty_public_site_allowed(c.organization_id,c.id,p_site_id)) then return; end if;
  select c.id,c.organization_id,o.booking_min_notice_hours,o.booking_max_days_ahead
  into v_company_id,v_org_id,v_org_min_notice,v_org_max_days
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.booking_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and private.beauty_public_company_allowed(c.organization_id,c.id)
    and o.status in ('trial','active')
  limit 1;
  if v_company_id is null then return; end if;

  select s.timezone into v_timezone
  from public.organization_sites s
  where s.id=p_site_id
    and s.organization_id=v_org_id
    and s.company_id=v_company_id
    and s.status='active';
  if v_timezone is null then return; end if;

  select sv.online_booking_enabled,sv.booking_min_notice_hours,sv.booking_max_days_ahead,
         sv.booking_buffer_before_minutes,sv.booking_buffer_after_minutes,
         sv.booking_weekdays,sv.booking_start_time,sv.booking_end_time
  into v_online,v_service_min_notice,v_service_max_days,v_buffer_before,v_buffer_after,
       v_weekdays,v_start_time,v_end_time
  from public.services sv
  where sv.id=p_service_id
    and sv.organization_id=v_org_id
    and sv.company_id=v_company_id
    and sv.active=true;
  if not coalesce(v_online,false) then return; end if;

  v_effective_min_notice := greatest(v_org_min_notice,coalesce(v_service_min_notice,v_org_min_notice));
  v_effective_max_days := least(v_org_max_days,coalesce(v_service_max_days,v_org_max_days));
  v_buffer_before := coalesce(v_buffer_before,0);
  v_buffer_after := coalesce(v_buffer_after,0);
  v_today := (now() at time zone v_timezone)::date;
  v_weekday := extract(isodow from p_date)::smallint-1;

  if p_date<v_today or p_date>v_today+v_effective_max_days then return; end if;
  if v_weekdays is not null and not (v_weekday=any(v_weekdays)) then return; end if;

  return query
  select base.slot_start,base.slot_end,base.staff_id,base.staff_name
  from public.get_public_metier_coiffure_company_slots(p_slug,p_site_id,p_service_id,p_date,p_staff_id) base
  where base.slot_start>=now()+make_interval(hours=>v_effective_min_notice)
    and (
      v_start_time is null
      or (
        (base.slot_start at time zone v_timezone)::time>=v_start_time
        and (base.slot_end at time zone v_timezone)::time<=v_end_time
      )
    )
    and exists (
      select 1
      from public.staff_working_hours h
      where h.organization_id=v_org_id
        and h.staff_id=base.staff_id
        and h.weekday=v_weekday
        and ((base.slot_start-make_interval(mins=>v_buffer_before)) at time zone v_timezone)::date=p_date
        and ((base.slot_end+make_interval(mins=>v_buffer_after)) at time zone v_timezone)::date=p_date
        and ((base.slot_start-make_interval(mins=>v_buffer_before)) at time zone v_timezone)::time>=h.start_time
        and ((base.slot_end+make_interval(mins=>v_buffer_after)) at time zone v_timezone)::time<=h.end_time
    )
    and not exists (
      select 1
      from public.staff_breaks b
      where b.organization_id=v_org_id
        and b.staff_id=base.staff_id
        and b.weekday=v_weekday
        and ((base.slot_start-make_interval(mins=>v_buffer_before)) at time zone v_timezone)::time<b.end_time
        and ((base.slot_end+make_interval(mins=>v_buffer_after)) at time zone v_timezone)::time>b.start_time
    )
    and not exists (
      select 1
      from public.appointments a
      left join public.services booked_service
        on booked_service.id=a.service_id
       and booked_service.organization_id=a.organization_id
      where a.organization_id=v_org_id
        and a.staff_id=base.staff_id
        and a.status<>'cancelled'
        and tstzrange(
          a.starts_at-make_interval(mins=>coalesce(booked_service.booking_buffer_before_minutes,0)),
          a.ends_at+make_interval(mins=>coalesce(booked_service.booking_buffer_after_minutes,0)),
          '[)'
        ) && tstzrange(
          base.slot_start-make_interval(mins=>v_buffer_before),
          base.slot_end+make_interval(mins=>v_buffer_after),
          '[)'
        )
    )
    and not exists (
      select 1
      from public.beauty_availability_blocks blk
      where blk.organization_id=v_org_id
        and blk.company_id=v_company_id
        and blk.site_id=p_site_id
        and blk.active=true
        and (blk.staff_id is null or blk.staff_id=base.staff_id)
        and tstzrange(blk.starts_at,blk.ends_at,'[)') &&
            tstzrange(
              base.slot_start-make_interval(mins=>v_buffer_before),
              base.slot_end+make_interval(mins=>v_buffer_after),
              '[)'
            )
    )
  order by base.slot_start,base.staff_name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_metier_coiffure_company_multi_slots_base(p_slug text, p_site_id uuid, p_service_ids uuid[], p_date date, p_staff_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, staff_id uuid, staff_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_company_id uuid;
  v_org_id uuid;
  v_timezone text;
  v_interval integer;
  v_org_min_notice integer;
  v_org_max_days integer;
  v_effective_min_notice integer;
  v_effective_max_days integer;
  v_total_duration integer;
  v_buffer_before integer;
  v_buffer_after integer;
  v_weekday smallint;
  v_today date;
  v_requested_count integer;
  v_matched_count integer;
begin
  if not exists(select 1 from public.organization_companies c where lower(c.public_slug)=lower(trim(p_slug)) AND private.beauty_public_site_allowed(c.organization_id,c.id,p_site_id)) then return; end if;
  v_requested_count:=coalesce(cardinality(p_service_ids),0);
  if v_requested_count<1 or v_requested_count>6 then return; end if;
  if (select count(distinct service_id) from unnest(p_service_ids) service_id)<>v_requested_count then return; end if;

  select c.id,c.organization_id,s.timezone,o.booking_slot_interval,o.booking_min_notice_hours,o.booking_max_days_ahead
  into v_company_id,v_org_id,v_timezone,v_interval,v_org_min_notice,v_org_max_days
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  join public.organization_sites s
    on s.id=p_site_id and s.organization_id=c.organization_id and s.company_id=c.id and s.status='active'
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.booking_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and private.beauty_public_company_allowed(c.organization_id,c.id)
    and o.status in ('trial','active')
  limit 1;
  if v_company_id is null or v_timezone is null then return; end if;

  select count(*),
         sum(s.duration_minutes)::integer,
         greatest(v_org_min_notice,coalesce(max(coalesce(s.booking_min_notice_hours,v_org_min_notice)),v_org_min_notice)),
         least(v_org_max_days,coalesce(min(coalesce(s.booking_max_days_ahead,v_org_max_days)),v_org_max_days))
  into v_matched_count,v_total_duration,v_effective_min_notice,v_effective_max_days
  from public.services s
  where s.organization_id=v_org_id
    and s.company_id=v_company_id
    and s.active=true
    and s.online_booking_enabled=true
    and s.id=any(p_service_ids);

  if v_matched_count<>v_requested_count or v_total_duration is null then return; end if;

  select coalesce(s.booking_buffer_before_minutes,0)
  into v_buffer_before
  from public.services s
  where s.organization_id=v_org_id and s.company_id=v_company_id and s.id=p_service_ids[1];

  select coalesce(s.booking_buffer_after_minutes,0)
  into v_buffer_after
  from public.services s
  where s.organization_id=v_org_id and s.company_id=v_company_id and s.id=p_service_ids[v_requested_count];

  v_today:=(now() at time zone v_timezone)::date;
  v_weekday:=extract(isodow from p_date)::smallint-1;
  if p_date<v_today or p_date>v_today+v_effective_max_days then return; end if;

  if exists (
    select 1
    from public.services s
    where s.organization_id=v_org_id
      and s.company_id=v_company_id
      and s.id=any(p_service_ids)
      and s.booking_weekdays is not null
      and not (v_weekday=any(s.booking_weekdays))
  ) then return; end if;

  return query
  with ordered_services as (
    select u.ord::smallint as position,
           s.id,
           s.duration_minutes,
           s.booking_start_time,
           s.booking_end_time,
           coalesce(
             sum(s.duration_minutes) over (
               order by u.ord
               rows between unbounded preceding and 1 preceding
             ),0
           )::integer as offset_minutes
    from unnest(p_service_ids) with ordinality u(service_id,ord)
    join public.services s
      on s.id=u.service_id
     and s.organization_id=v_org_id
     and s.company_id=v_company_id
  ),
  candidates as (
    select st.id as candidate_staff_id,
           st.display_name as candidate_staff_name,
           gs.local_start,
           gs.local_start+make_interval(mins=>v_total_duration) as local_end
    from public.staff st
    join public.staff_working_hours h
      on h.organization_id=st.organization_id
     and h.staff_id=st.id
     and h.weekday=v_weekday
    cross join lateral generate_series(
      p_date+h.start_time,
      p_date+h.end_time-make_interval(mins=>v_total_duration),
      make_interval(mins=>v_interval)
    ) gs(local_start)
    where st.organization_id=v_org_id
      and st.company_id=v_company_id
      and st.site_id=p_site_id
      and st.active=true
      and (p_staff_id is null or st.id=p_staff_id)
      and not exists (
        select 1
        from unnest(p_service_ids) sid(service_id)
        where not exists (
          select 1
          from public.staff_services ss
          where ss.organization_id=v_org_id
            and ss.staff_id=st.id
            and ss.service_id=sid.service_id
        )
      )
  )
  select c.local_start at time zone v_timezone,
         c.local_end at time zone v_timezone,
         c.candidate_staff_id,
         c.candidate_staff_name
  from candidates c
  where (c.local_start at time zone v_timezone)>=now()+make_interval(hours=>v_effective_min_notice)
    and c.local_start::date=p_date
    and c.local_end::date=p_date
    and (c.local_start-make_interval(mins=>v_buffer_before))::date=p_date
    and (c.local_end+make_interval(mins=>v_buffer_after))::date=p_date
    and exists (
      select 1
      from public.staff_working_hours h
      where h.organization_id=v_org_id
        and h.staff_id=c.candidate_staff_id
        and h.weekday=v_weekday
        and (c.local_start-make_interval(mins=>v_buffer_before))::time>=h.start_time
        and (c.local_end+make_interval(mins=>v_buffer_after))::time<=h.end_time
    )
    and not exists (
      select 1
      from ordered_services os
      where (os.booking_start_time is not null and (c.local_start+make_interval(mins=>os.offset_minutes))::time<os.booking_start_time)
         or (os.booking_end_time is not null and (c.local_start+make_interval(mins=>os.offset_minutes+os.duration_minutes))::time>os.booking_end_time)
    )
    and not exists (
      select 1
      from public.staff_breaks b
      where b.organization_id=v_org_id
        and b.staff_id=c.candidate_staff_id
        and b.weekday=v_weekday
        and (c.local_start-make_interval(mins=>v_buffer_before))::time<b.end_time
        and (c.local_end+make_interval(mins=>v_buffer_after))::time>b.start_time
    )
    and not exists (
      select 1
      from public.appointments a
      left join public.services booked_service
        on booked_service.id=a.service_id and booked_service.organization_id=a.organization_id
      where a.organization_id=v_org_id
        and a.staff_id=c.candidate_staff_id
        and a.status<>'cancelled'
        and tstzrange(
          a.starts_at-make_interval(mins=>coalesce(
            (select asi.buffer_before_minutes from public.appointment_service_items asi where asi.appointment_id=a.id order by asi.position limit 1),
            booked_service.booking_buffer_before_minutes,0
          )),
          a.ends_at+make_interval(mins=>coalesce(
            (select asi.buffer_after_minutes from public.appointment_service_items asi where asi.appointment_id=a.id order by asi.position desc limit 1),
            booked_service.booking_buffer_after_minutes,0
          )),
          '[)'
        ) && tstzrange(
          (c.local_start at time zone v_timezone)-make_interval(mins=>v_buffer_before),
          (c.local_end at time zone v_timezone)+make_interval(mins=>v_buffer_after),
          '[)'
        )
    )
    and not exists (
      select 1
      from public.beauty_availability_blocks blk
      where blk.organization_id=v_org_id
        and blk.company_id=v_company_id
        and blk.site_id=p_site_id
        and blk.active=true
        and (blk.staff_id is null or blk.staff_id=c.candidate_staff_id)
        and tstzrange(blk.starts_at,blk.ends_at,'[)') &&
            tstzrange(
              (c.local_start at time zone v_timezone)-make_interval(mins=>v_buffer_before),
              (c.local_end at time zone v_timezone)+make_interval(mins=>v_buffer_after),
              '[)'
            )
    )
  order by slot_start,staff_name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_metier_coiffure_next_slots(p_slug text, p_site_id uuid, p_service_id uuid, p_staff_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 3)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, staff_id uuid, staff_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_company_id uuid;
  v_org_id uuid;
  v_timezone text;
  v_org_max_days integer;
  v_service_max_days integer;
  v_effective_max_days integer;
  v_today date;
  v_limit integer;
begin
  if not exists(select 1 from public.organization_companies c where lower(c.public_slug)=lower(trim(p_slug)) AND private.beauty_public_site_allowed(c.organization_id,c.id,p_site_id)) then return; end if;
  select c.id,c.organization_id,o.booking_max_days_ahead
  into v_company_id,v_org_id,v_org_max_days
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.booking_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and private.beauty_public_company_allowed(c.organization_id,c.id)
    and o.status in ('trial','active')
  limit 1;
  if v_company_id is null then return; end if;

  select s.timezone into v_timezone
  from public.organization_sites s
  where s.id=p_site_id
    and s.organization_id=v_org_id
    and s.company_id=v_company_id
    and s.status='active';
  if v_timezone is null then return; end if;

  select sv.booking_max_days_ahead into v_service_max_days
  from public.services sv
  where sv.id=p_service_id
    and sv.organization_id=v_org_id
    and sv.company_id=v_company_id
    and sv.active=true
    and sv.online_booking_enabled=true;
  if not found then return; end if;

  v_effective_max_days:=least(v_org_max_days,coalesce(v_service_max_days,v_org_max_days));
  v_today:=(now() at time zone v_timezone)::date;
  v_limit:=least(greatest(coalesce(p_limit,3),1),12);

  return query
  with raw_slots as (
    select s.slot_start,s.slot_end,s.staff_id,s.staff_name
    from generate_series(v_today,v_today+v_effective_max_days,interval '1 day') d(day_value)
    cross join lateral public.get_public_metier_coiffure_company_slots_v2(
      p_slug,p_site_id,p_service_id,d.day_value::date,p_staff_id
    ) s
  ),
  unique_times as (
    select distinct on (r.slot_start)
      r.slot_start,r.slot_end,r.staff_id,r.staff_name
    from raw_slots r
    order by r.slot_start,r.staff_name
  )
  select u.slot_start,u.slot_end,u.staff_id,u.staff_name
  from unique_times u
  order by u.slot_start,u.staff_name
  limit v_limit;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_metier_coiffure_next_multi_slots(p_slug text, p_site_id uuid, p_service_ids uuid[], p_staff_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 3)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, staff_id uuid, staff_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_company_id uuid;
  v_org_id uuid;
  v_timezone text;
  v_org_max_days integer;
  v_effective_max_days integer;
  v_today date;
  v_limit integer;
  v_requested_count integer;
  v_matched_count integer;
begin
  if not exists(select 1 from public.organization_companies c where lower(c.public_slug)=lower(trim(p_slug)) AND private.beauty_public_site_allowed(c.organization_id,c.id,p_site_id)) then return; end if;
  v_requested_count:=coalesce(cardinality(p_service_ids),0);
  if v_requested_count<1 or v_requested_count>6 then return; end if;
  if (select count(distinct service_id) from unnest(p_service_ids) service_id)<>v_requested_count then return; end if;

  select c.id,c.organization_id,s.timezone,o.booking_max_days_ahead
  into v_company_id,v_org_id,v_timezone,v_org_max_days
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  join public.organization_sites s
    on s.id=p_site_id and s.organization_id=c.organization_id and s.company_id=c.id and s.status='active'
  where lower(c.public_slug)=lower(trim(p_slug))
    and c.public_page_enabled=true
    and c.booking_enabled=true
    and c.status='active'
    and o.business_type='coiffure'
    and private.beauty_public_company_allowed(c.organization_id,c.id)
    and o.status in ('trial','active')
  limit 1;
  if v_company_id is null then return; end if;

  select count(*),
         least(v_org_max_days,coalesce(min(coalesce(s.booking_max_days_ahead,v_org_max_days)),v_org_max_days))
  into v_matched_count,v_effective_max_days
  from public.services s
  where s.organization_id=v_org_id
    and s.company_id=v_company_id
    and s.active=true
    and s.online_booking_enabled=true
    and s.id=any(p_service_ids);
  if v_matched_count<>v_requested_count then return; end if;

  v_today:=(now() at time zone v_timezone)::date;
  v_limit:=least(greatest(coalesce(p_limit,3),1),12);

  return query
  with raw_slots as (
    select s.slot_start,s.slot_end,s.staff_id,s.staff_name
    from generate_series(v_today,v_today+v_effective_max_days,interval '1 day') d(day_value)
    cross join lateral public.get_public_metier_coiffure_company_multi_slots(
      p_slug,p_site_id,p_service_ids,d.day_value::date,p_staff_id
    ) s
  ),
  unique_times as (
    select distinct on (r.slot_start)
      r.slot_start,r.slot_end,r.staff_id,r.staff_name
    from raw_slots r
    order by r.slot_start,r.staff_name
  )
  select u.slot_start,u.slot_end,u.staff_id,u.staff_name
  from unique_times u
  order by u.slot_start,u.staff_name
  limit v_limit;
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
  if not exists(select 1 from public.organization_companies c where lower(c.public_slug)=lower(trim(p_slug)) AND private.beauty_public_site_allowed(c.organization_id,c.id,p_site_id)) then raise exception 'Établissement non autorisé pour cette réservation.'; end if;
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
    and private.beauty_public_company_allowed(c.organization_id,c.id)
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
  v_site_id uuid;
  v_staff_company_id uuid;
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

  select st.display_name, st.site_id, st.company_id
  into v_staff_name, v_site_id, v_staff_company_id
  from public.staff st
  where st.id = p_staff_id
    and st.organization_id = v_organization.id
    and st.active = true;

  if v_staff_name is null then
    raise exception 'Le collaborateur sélectionné est indisponible.';
  end if;

  -- The legacy endpoint has no site parameter: use only the selected staff site.
  -- Never fall back to another company or an arbitrary primary establishment.
  if v_site_id is null or not exists (
    select 1 from public.organization_sites s
    where s.id = v_site_id
      and s.organization_id = v_organization.id
      and s.company_id is not distinct from v_staff_company_id
      and s.status = 'active'
  ) then
    raise exception 'L’établissement du collaborateur est indisponible.';
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

  if not private.beauty_legacy_staff_allowed(v_organization.id,p_staff_id) then raise exception 'Établissement non autorisé pour cette réservation.'; end if;
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
    public_token
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

  if not private.beauty_legacy_staff_allowed(v_organization.id,p_staff_id) then raise exception 'Établissement non autorisé pour cette réservation.'; end if;
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

CREATE OR REPLACE FUNCTION public.get_public_booking_page(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_company_page jsonb;
  v_context_slug text;
  v_company jsonb;
  v_organization public.organizations%rowtype;
  v_services jsonb;
  v_staff jsonb;
  v_sites jsonb;
  v_has_commercial_branding boolean;
begin
  v_context_slug := private.beauty_public_booking_slug(p_slug);
  v_company_page := public.get_public_metier_coiffure_company_page(coalesce(v_context_slug,p_slug));
  if v_company_page is not null then
    v_company:=v_company_page->'company';
    return jsonb_build_object(
      'organization',jsonb_build_object(
        'id',v_company->>'id',
        'name',v_company->>'name',
        'slug',v_company->>'public_slug',
        'primary_color',coalesce(v_company->>'primary_color','#2997ff'),
        'logo_url',v_company->>'logo_url',
        'banner_url',v_company->>'banner_url',
        'banner_position_x',coalesce((v_company->>'banner_position_x')::integer,50),
        'banner_position_y',coalesce((v_company->>'banner_position_y')::integer,50),
        'banner_landscape_zoom',coalesce((v_company->>'banner_landscape_zoom')::integer,100),
        'banner_portrait_position_x',coalesce((v_company->>'banner_portrait_position_x')::integer,50),
        'banner_portrait_position_y',coalesce((v_company->>'banner_portrait_position_y')::integer,50),
        'banner_portrait_zoom',coalesce((v_company->>'banner_portrait_zoom')::integer,100),
        'tagline',v_company->>'tagline',
        'address',coalesce((v_company_page->'sites'->0->>'address'),''),
        'hours_text',v_company->>'hours_text',
        'practical_info',v_company->>'practical_info',
        'show_ncr_branding',coalesce((v_company->>'show_ncr_branding')::boolean,true),
        'timezone',coalesce((v_company_page->'sites'->0->>'timezone'),'Europe/Paris')
      ),
      'settings',v_company_page->'settings',
      'sites',coalesce(v_company_page->'sites','[]'::jsonb),
      'services',coalesce(v_company_page->'services','[]'::jsonb),
      'staff',coalesce(v_company_page->'staff','[]'::jsonb)
    );
  end if;

  if v_context_slug is not null then return null; end if;

  select * into v_organization
  from public.organizations
  where slug=lower(trim(p_slug))
    and status in ('trial','active')
    and business_type='coiffure'
    and booking_enabled=true;

  if v_organization.id is null then return null; end if;
  v_has_commercial_branding:=v_organization.plan in ('professionnelle','metier');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'name',s.name,'address',s.address,'postal_code',s.postal_code,'city',s.city,
    'phone',s.phone,'email',s.email,'timezone',s.timezone,'is_primary',s.is_primary
  ) order by s.is_primary desc,s.name),'[]'::jsonb)
  into v_sites
  from public.organization_sites s
  where s.organization_id=v_organization.id
    and s.status='active'
    and v_organization.plan='metier';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'name',s.name,'description',s.description,
    'duration_minutes',s.duration_minutes,'price_cents',s.price_cents
  ) order by s.name),'[]'::jsonb)
  into v_services
  from public.services s
  where s.organization_id=v_organization.id
    and s.active=true
    and exists (
      select 1
      from public.staff_services ss
      join public.staff st
        on st.organization_id=ss.organization_id
       and st.id=ss.staff_id
       and st.active=true
      where ss.organization_id=v_organization.id
        and ss.service_id=s.id
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',st.id,
    'display_name',st.display_name,
    'color',st.color,
    'site_id',st.site_id,
    'service_ids',coalesce((
      select jsonb_agg(ss.service_id order by ss.service_id)
      from public.staff_services ss
      where ss.organization_id=v_organization.id
        and ss.staff_id=st.id
    ),'[]'::jsonb)
  ) order by st.display_name),'[]'::jsonb)
  into v_staff
  from public.staff st
  where st.organization_id=v_organization.id
    and st.active=true
    and (v_organization.plan<>'metier' or st.site_id is not null)
    and exists (
      select 1
      from public.staff_working_hours h
      where h.organization_id=v_organization.id
        and h.staff_id=st.id
    );

  return jsonb_build_object(
    'organization',jsonb_build_object(
      'id',v_organization.id,
      'name',case
        when v_has_commercial_branding then coalesce(v_organization.public_name,v_organization.name)
        else v_organization.name
      end,
      'slug',v_organization.slug,
      'primary_color',coalesce(v_organization.primary_color,'#2997ff'),
      'logo_url',v_organization.logo_url,
      'banner_url',v_organization.booking_banner_url,
      'banner_position_x',v_organization.booking_banner_position_x,
      'banner_position_y',v_organization.booking_banner_position_y,
      'banner_landscape_zoom',v_organization.booking_banner_landscape_zoom,
      'banner_portrait_position_x',v_organization.booking_banner_portrait_position_x,
      'banner_portrait_position_y',v_organization.booking_banner_portrait_position_y,
      'banner_portrait_zoom',v_organization.booking_banner_portrait_zoom,
      'tagline',case when v_has_commercial_branding then v_organization.booking_tagline else null end,
      'address',case when v_has_commercial_branding then v_organization.booking_address else null end,
      'hours_text',case when v_has_commercial_branding then v_organization.booking_hours_text else null end,
      'practical_info',case when v_has_commercial_branding then v_organization.booking_practical_info else null end,
      'show_ncr_branding',case when v_has_commercial_branding then v_organization.show_ncr_branding else true end,
      'timezone',v_organization.timezone
    ),
    'settings',jsonb_build_object(
      'confirmation_mode',v_organization.booking_confirmation_mode,
      'slot_interval',v_organization.booking_slot_interval,
      'min_notice_hours',v_organization.booking_min_notice_hours,
      'max_days_ahead',v_organization.booking_max_days_ahead,
      'cancel_notice_hours',v_organization.booking_cancel_notice_hours,
      'welcome_text',v_organization.booking_welcome_text,
      'cancellation_policy',v_organization.booking_cancellation_policy,
      'privacy_notice',v_organization.booking_privacy_notice,
      'contact_email',v_organization.booking_contact_email,
      'contact_phone',v_organization.booking_contact_phone
    ),
    'sites',v_sites,
    'services',v_services,
    'staff',v_staff
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_available_slots_v2(p_slug text, p_site_id uuid, p_service_id uuid, p_date date, p_staff_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, staff_id uuid, staff_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_company_page jsonb;
  v_context_slug text;
  v_organization_id uuid;
  v_plan text;
  v_timezone text;
  v_interval integer;
  v_min_notice integer;
  v_max_days integer;
  v_duration integer;
  v_today date;
  v_weekday smallint;
begin
  v_context_slug := private.beauty_public_booking_slug(p_slug);
  v_company_page := public.get_public_metier_coiffure_company_page(coalesce(v_context_slug,p_slug));
  if v_company_page is not null then
    return query
    select s.slot_start,s.slot_end,s.staff_id,s.staff_name
    from public.get_public_metier_coiffure_company_slots_v2(v_context_slug,p_site_id,p_service_id,p_date,p_staff_id) s;
    return;
  end if;

  if v_context_slug is not null then return; end if;

  select id,plan,timezone,booking_slot_interval,booking_min_notice_hours,booking_max_days_ahead
  into v_organization_id,v_plan,v_timezone,v_interval,v_min_notice,v_max_days
  from public.organizations
  where slug=lower(trim(p_slug)) and status in ('trial','active') and business_type='coiffure' and booking_enabled=true;
  if v_organization_id is null then return; end if;

  if v_plan='metier' and not exists (
    select 1 from public.organization_sites
    where id=p_site_id and organization_id=v_organization_id and status='active'
  ) then return; end if;
  if v_plan='metier' then
    select timezone into v_timezone
    from public.organization_sites
    where id=p_site_id and organization_id=v_organization_id and status='active';
  end if;

  select duration_minutes into v_duration
  from public.services
  where id=p_service_id and organization_id=v_organization_id and active=true;
  if v_duration is null then return; end if;

  v_today := (now() at time zone v_timezone)::date;
  if p_date<v_today or p_date>v_today+v_max_days then return; end if;
  v_weekday := extract(isodow from p_date)::smallint-1;

  return query
  with candidates as (
    select st.id candidate_staff_id,st.display_name candidate_staff_name,
           local_start,local_start+make_interval(mins=>v_duration) local_end
    from public.staff st
    join public.staff_services ss
      on ss.organization_id=st.organization_id and ss.staff_id=st.id and ss.service_id=p_service_id
    join public.staff_working_hours h
      on h.organization_id=st.organization_id and h.staff_id=st.id and h.weekday=v_weekday
    cross join lateral generate_series(
      p_date+h.start_time,
      p_date+h.end_time-make_interval(mins=>v_duration),
      make_interval(mins=>v_interval)
    ) gs(local_start)
    where st.organization_id=v_organization_id
      and st.active=true
      and (v_plan<>'metier' or st.site_id=p_site_id)
      and (p_staff_id is null or st.id=p_staff_id)
  )
  select c.local_start at time zone v_timezone,c.local_end at time zone v_timezone,
         c.candidate_staff_id,c.candidate_staff_name
  from candidates c
  where (c.local_start at time zone v_timezone)>=now()+make_interval(hours=>v_min_notice)
    and not exists (
      select 1 from public.staff_breaks b
      where b.organization_id=v_organization_id
        and b.staff_id=c.candidate_staff_id
        and b.weekday=v_weekday
        and c.local_start::time<b.end_time
        and c.local_end::time>b.start_time
    )
    and not exists (
      select 1 from public.appointments a
      where a.organization_id=v_organization_id
        and a.staff_id=c.candidate_staff_id
        and a.status<>'cancelled'
        and tstzrange(a.starts_at,a.ends_at,'[)') &&
            tstzrange(c.local_start at time zone v_timezone,c.local_end at time zone v_timezone,'[)')
    )
  order by slot_start,staff_name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_public_booking_v3(p_slug text, p_site_id uuid, p_service_id uuid, p_staff_id uuid, p_starts_at timestamp with time zone, p_first_name text, p_last_name text, p_email text, p_phone text, p_notes text DEFAULT NULL::text, p_website text DEFAULT NULL::text, p_privacy_consent boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public', 'pg_catalog'
AS $function$
declare
  v_company_page jsonb;
  v_context_slug text;
  v_company_result jsonb;
  v_org_id uuid;
  v_plan text;
  v_result jsonb;
  v_appointment_id uuid;
  v_site_name text;
  v_site_address text;
  v_effective_website text:=p_website;
begin
  v_context_slug := private.beauty_public_booking_slug(p_slug);
  v_company_page := public.get_public_metier_coiffure_company_page(coalesce(v_context_slug,p_slug));
  if v_company_page is not null then
    v_company_result := public.create_public_metier_coiffure_company_booking(
      v_context_slug,p_site_id,p_service_id,p_staff_id,p_starts_at,p_first_name,p_last_name,p_email,p_phone,p_notes,p_website,p_privacy_consent
    );
    return v_company_result || jsonb_build_object(
      'organization_name',v_company_result->>'company_name',
      'organization_slug',v_company_result->>'company_slug'
    );
  end if;

  if v_context_slug is not null then raise exception 'Réservation indisponible pour cette enseigne.'; end if;

  select id,plan into v_org_id,v_plan
  from public.organizations
  where slug=lower(trim(p_slug)) and business_type='coiffure' and status in ('trial','active') and coalesce(booking_enabled,false)
  limit 1;
  if v_org_id is null or not public.organization_has_plan_feature(v_org_id,'public_booking') then raise exception 'La réservation en ligne est indisponible.'; end if;

  if auth.uid() is not null and exists (select 1 from public.coiffure_client_portal_accounts a where a.organization_id=v_org_id and a.user_id=auth.uid() and a.status='active') then v_effective_website:=null; end if;

  if v_plan='metier' then
    select name,trim(concat_ws(' ',address,postal_code,city)) into v_site_name,v_site_address
    from public.organization_sites where id=p_site_id and organization_id=v_org_id and status='active';
    if v_site_name is null then raise exception 'Sélectionnez un établissement actif.'; end if;
    if not exists (select 1 from public.staff where id=p_staff_id and organization_id=v_org_id and site_id=p_site_id and active=true) then raise exception 'Le professionnel sélectionné n’est pas disponible dans cet établissement.'; end if;
  end if;

  v_result := public.create_public_booking_v2(p_slug,p_service_id,p_staff_id,p_starts_at,p_first_name,p_last_name,p_email,p_phone,p_notes,v_effective_website,p_privacy_consent);
  v_appointment_id := (v_result->>'appointment_id')::uuid;
  if v_plan='metier' then update public.appointments set site_id=p_site_id,updated_at=now() where id=v_appointment_id and organization_id=v_org_id; end if;
  return v_result || jsonb_build_object('site_id',case when v_plan='metier' then p_site_id else null end,'site_name',v_site_name,'site_address',nullif(v_site_address,''));
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_available_slots(p_slug text, p_service_id uuid, p_date date, p_staff_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, staff_id uuid, staff_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
declare
  v_organization_id uuid;
  v_timezone text;
  v_interval integer;
  v_min_notice integer;
  v_max_days integer;
  v_duration integer;
  v_today date;
  v_weekday smallint;
begin
  select id, timezone, booking_slot_interval, booking_min_notice_hours, booking_max_days_ahead
  into v_organization_id, v_timezone, v_interval, v_min_notice, v_max_days
  from public.organizations
  where slug = lower(trim(p_slug))
    and status in ('trial','active')
    and business_type = 'coiffure'
    and booking_enabled = true;

  if v_organization_id is null then
    return;
  end if;

  select duration_minutes into v_duration
  from public.services
  where id = p_service_id
    and organization_id = v_organization_id
    and active = true;

  if v_duration is null then
    return;
  end if;

  v_today := (now() at time zone v_timezone)::date;
  if p_date < v_today or p_date > v_today + v_max_days then
    return;
  end if;

  v_weekday := extract(isodow from p_date)::smallint - 1;

  return query
  with candidates as (
    select
      st.id as candidate_staff_id,
      st.display_name as candidate_staff_name,
      local_start,
      local_start + make_interval(mins => v_duration) as local_end
    from public.staff st
    join public.staff_services ss
      on ss.organization_id = st.organization_id
     and ss.staff_id = st.id
     and ss.service_id = p_service_id
    join public.staff_working_hours h
      on h.organization_id = st.organization_id
     and h.staff_id = st.id
     and h.weekday = v_weekday
    cross join lateral generate_series(
      p_date + h.start_time,
      p_date + h.end_time - make_interval(mins => v_duration),
      make_interval(mins => v_interval)
    ) as local_start
    where st.organization_id = v_organization_id
      and st.active = true AND private.beauty_legacy_staff_allowed(st.organization_id,st.id)
      and (p_staff_id is null or st.id = p_staff_id)
  )
  select
    c.local_start at time zone v_timezone as slot_start,
    c.local_end at time zone v_timezone as slot_end,
    c.candidate_staff_id as staff_id,
    c.candidate_staff_name as staff_name
  from candidates c
  where (c.local_start at time zone v_timezone) >= now() + make_interval(hours => v_min_notice)
    and not exists (
      select 1
      from public.staff_breaks b
      where b.organization_id = v_organization_id
        and b.staff_id = c.candidate_staff_id
        and b.weekday = v_weekday
        and c.local_start::time < b.end_time
        and c.local_end::time > b.start_time
    )
    and not exists (
      select 1
      from public.appointments a
      where a.organization_id = v_organization_id
        and a.staff_id = c.candidate_staff_id
        and a.status <> 'cancelled'
        and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(
          c.local_start at time zone v_timezone,
          c.local_end at time zone v_timezone,
          '[)'
        )
    )
  order by slot_start, staff_name;
end;
$function$;

COMMIT;
