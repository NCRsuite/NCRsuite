-- Coiffure client portal booking hardening
-- Safari/iOS can autofill the invisible public-booking honeypot. Legitimate
-- authenticated Coiffure portal clients are already verified by invitation,
-- so ignore that honeypot only for an active portal account attached to the
-- same salon. Anonymous/public traffic keeps the original anti-bot guard.

CREATE OR REPLACE FUNCTION public.create_public_booking_v3(
  p_slug text,
  p_site_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamp with time zone,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_notes text DEFAULT NULL::text,
  p_website text DEFAULT NULL::text,
  p_privacy_consent boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_plan text;
  v_result jsonb;
  v_appointment_id uuid;
  v_site_name text;
  v_site_address text;
  v_effective_website text := p_website;
begin
  select id, plan into v_org_id, v_plan
  from public.organizations
  where slug = lower(trim(p_slug))
    and business_type = 'coiffure'
    and status in ('trial','active')
    and coalesce(booking_enabled, false)
  limit 1;

  if v_org_id is null or not public.organization_has_plan_feature(v_org_id, 'public_booking') then
    raise exception 'La réservation en ligne est indisponible.';
  end if;

  if auth.uid() is not null and exists (
    select 1
    from public.coiffure_client_portal_accounts a
    where a.organization_id = v_org_id
      and a.user_id = auth.uid()
      and a.status = 'active'
  ) then
    v_effective_website := null;
  end if;

  if v_plan = 'metier' then
    select name, trim(concat_ws(' ', address, postal_code, city))
    into v_site_name, v_site_address
    from public.organization_sites
    where id = p_site_id and organization_id = v_org_id and status = 'active';

    if v_site_name is null then raise exception 'Sélectionnez un établissement actif.'; end if;

    if not exists (
      select 1 from public.staff
      where id = p_staff_id and organization_id = v_org_id and site_id = p_site_id and active = true
    ) then raise exception 'Le professionnel sélectionné n’est pas disponible dans cet établissement.'; end if;
  end if;

  v_result := public.create_public_booking_v2(
    p_slug, p_service_id, p_staff_id, p_starts_at, p_first_name, p_last_name,
    p_email, p_phone, p_notes, v_effective_website, p_privacy_consent
  );

  v_appointment_id := (v_result ->> 'appointment_id')::uuid;
  update public.appointments
  set site_id = case when v_plan = 'metier' then p_site_id else null end,
      updated_at = now()
  where id = v_appointment_id and organization_id = v_org_id;

  return v_result || jsonb_build_object(
    'site_id', case when v_plan = 'metier' then p_site_id else null end,
    'site_name', v_site_name,
    'site_address', nullif(v_site_address, '')
  );
end;
$function$;
