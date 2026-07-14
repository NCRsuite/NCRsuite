-- NCR Suite V2.3.3 — multi-établissements opérationnel
-- Les entreprises restent les espaces clients. Les établissements deviennent un filtre métier interne.

alter table public.staff
  add column if not exists site_id uuid;

alter table public.appointments
  add column if not exists site_id uuid;

-- Toute organisation Métier dispose d'au moins un établissement actif.
insert into public.organization_sites (
  organization_id, name, code, address, phone, email, timezone, is_primary, status, created_by
)
select
  o.id,
  coalesce(nullif(trim(o.public_name), ''), o.name) || ' — Principal',
  'PRINCIPAL',
  o.booking_address,
  o.booking_contact_phone,
  o.booking_contact_email,
  o.timezone,
  true,
  'active',
  null
from public.organizations o
where o.plan = 'metier'
  and not exists (
    select 1 from public.organization_sites s
    where s.organization_id = o.id and s.status = 'active'
  );

-- Si des sites existaient sans site principal, le premier site actif le devient.
with ranked as (
  select id, organization_id,
         row_number() over (partition by organization_id order by created_at, name, id) as rn
  from public.organization_sites
  where status = 'active'
), missing as (
  select r.id
  from ranked r
  where r.rn = 1
    and not exists (
      select 1 from public.organization_sites p
      where p.organization_id = r.organization_id
        and p.status = 'active'
        and p.is_primary = true
    )
)
update public.organization_sites s
set is_primary = true, updated_at = now()
where s.id in (select id from missing);

-- Rattachement des données déjà présentes au site principal.
update public.staff st
set site_id = (
      select s.id
      from public.organization_sites s
      where s.organization_id = st.organization_id and s.status = 'active'
      order by s.is_primary desc, s.created_at, s.name
      limit 1
    ),
    updated_at = now()
where st.site_id is null
  and exists (
    select 1 from public.organizations o
    where o.id = st.organization_id and o.plan = 'metier'
  );

update public.appointments a
set site_id = coalesce(
      (select st.site_id from public.staff st where st.organization_id = a.organization_id and st.id = a.staff_id),
      (select s.id from public.organization_sites s where s.organization_id = a.organization_id and s.status = 'active' order by s.is_primary desc, s.created_at, s.name limit 1)
    ),
    updated_at = now()
where a.site_id is null
  and exists (
    select 1 from public.organizations o
    where o.id = a.organization_id and o.plan = 'metier'
  );

-- Les sites sont archivés plutôt que supprimés : les FK restent donc restrictives.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'staff_site_same_org_fk') then
    alter table public.staff
      add constraint staff_site_same_org_fk
      foreign key (organization_id, site_id)
      references public.organization_sites (organization_id, id)
      on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'appointments_site_same_org_fk') then
    alter table public.appointments
      add constraint appointments_site_same_org_fk
      foreign key (organization_id, site_id)
      references public.organization_sites (organization_id, id)
      on delete restrict;
  end if;
end
$$;

create index if not exists idx_staff_org_site_active
  on public.staff (organization_id, site_id, active, display_name);
create index if not exists idx_appointments_org_site_start
  on public.appointments (organization_id, site_id, starts_at);

-- Vérification différée : les wrappers V2 peuvent appeler les anciennes fonctions puis affecter le site
-- dans la même transaction, tout en empêchant les écritures incohérentes à la fin de la transaction.
create or replace function public.validate_operational_site_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_plan text;
begin
  select plan into v_plan from public.organizations where id = new.organization_id;

  if v_plan <> 'metier' then
    return new;
  end if;

  if new.site_id is null or not exists (
    select 1 from public.organization_sites s
    where s.id = new.site_id
      and s.organization_id = new.organization_id
      and s.status = 'active'
  ) then
    raise exception 'Un établissement actif doit être sélectionné.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_staff_site_scope on public.staff;
create constraint trigger validate_staff_site_scope
after insert or update on public.staff
deferrable initially deferred
for each row execute procedure public.validate_operational_site_scope();

drop trigger if exists validate_appointment_site_scope on public.appointments;
create constraint trigger validate_appointment_site_scope
after insert or update on public.appointments
deferrable initially deferred
for each row execute procedure public.validate_operational_site_scope();

-- Enregistrement d'un collaborateur avec son établissement.
create or replace function public.save_staff_configuration_v2(
  p_organization_id uuid,
  p_staff_id uuid,
  p_site_id uuid,
  p_display_name text,
  p_email text,
  p_phone text,
  p_color text,
  p_service_ids uuid[],
  p_working_hours jsonb,
  p_breaks jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid;
begin
  if not exists (
    select 1 from public.organization_sites
    where id = p_site_id
      and organization_id = p_organization_id
      and status = 'active'
  ) then
    raise exception 'L’établissement sélectionné est introuvable ou inactif.';
  end if;

  v_staff_id := public.save_staff_configuration(
    p_organization_id,
    p_staff_id,
    p_display_name,
    p_email,
    p_phone,
    p_color,
    p_service_ids,
    p_working_hours,
    p_breaks
  );

  update public.staff
  set site_id = p_site_id, updated_at = now()
  where id = v_staff_id and organization_id = p_organization_id;

  return v_staff_id;
end;
$$;

-- Enregistrement d'un rendez-vous interne avec son établissement.
create or replace function public.save_appointment_v2(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_site_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_status text default 'confirmed',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.organization_sites
    where id = p_site_id
      and organization_id = p_organization_id
      and status = 'active'
  ) then
    raise exception 'L’établissement sélectionné est introuvable ou inactif.';
  end if;

  if not exists (
    select 1 from public.staff
    where id = p_staff_id
      and organization_id = p_organization_id
      and site_id = p_site_id
      and active = true
  ) then
    raise exception 'Ce collaborateur n’est pas rattaché à l’établissement sélectionné.';
  end if;

  v_id := public.save_appointment(
    p_organization_id,
    p_appointment_id,
    p_client_id,
    p_service_id,
    p_staff_id,
    p_starts_at,
    p_status,
    p_notes
  );

  update public.appointments
  set site_id = p_site_id, updated_at = now()
  where id = v_id and organization_id = p_organization_id;

  return v_id;
end;
$$;

-- Page de réservation enrichie avec les sites actifs et le site de chaque collaborateur.
create or replace function public.get_public_booking_page(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_organization public.organizations%rowtype;
  v_services jsonb;
  v_staff jsonb;
  v_sites jsonb;
  v_has_commercial_branding boolean;
begin
  select * into v_organization
  from public.organizations
  where slug = lower(trim(p_slug))
    and status in ('trial','active')
    and business_type = 'coiffure'
    and booking_enabled = true;

  if v_organization.id is null then return null; end if;

  v_has_commercial_branding := v_organization.plan in ('professionnelle','metier');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'address', s.address,
    'postal_code', s.postal_code,
    'city', s.city,
    'phone', s.phone,
    'email', s.email,
    'timezone', s.timezone,
    'is_primary', s.is_primary
  ) order by s.is_primary desc, s.name), '[]'::jsonb)
  into v_sites
  from public.organization_sites s
  where s.organization_id = v_organization.id
    and s.status = 'active'
    and v_organization.plan = 'metier';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'description', s.description,
    'duration_minutes', s.duration_minutes,
    'price_cents', s.price_cents
  ) order by s.name), '[]'::jsonb)
  into v_services
  from public.services s
  where s.organization_id = v_organization.id
    and s.active = true
    and exists (
      select 1
      from public.staff_services ss
      join public.staff st on st.organization_id = ss.organization_id and st.id = ss.staff_id and st.active = true
      where ss.organization_id = v_organization.id and ss.service_id = s.id
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', st.id,
    'display_name', st.display_name,
    'color', st.color,
    'site_id', st.site_id,
    'service_ids', coalesce((
      select jsonb_agg(ss.service_id order by ss.service_id)
      from public.staff_services ss
      where ss.organization_id = v_organization.id and ss.staff_id = st.id
    ), '[]'::jsonb)
  ) order by st.display_name), '[]'::jsonb)
  into v_staff
  from public.staff st
  where st.organization_id = v_organization.id
    and st.active = true
    and (v_organization.plan <> 'metier' or st.site_id is not null)
    and exists (
      select 1 from public.staff_working_hours h
      where h.organization_id = v_organization.id and h.staff_id = st.id
    );

  return jsonb_build_object(
    'organization', jsonb_build_object(
      'id', v_organization.id,
      'name', case when v_has_commercial_branding then coalesce(v_organization.public_name, v_organization.name) else v_organization.name end,
      'slug', v_organization.slug,
      'primary_color', case when v_has_commercial_branding then v_organization.primary_color else '#2997ff' end,
      'logo_url', case when v_has_commercial_branding then v_organization.logo_url else null end,
      'banner_url', case when v_has_commercial_branding then v_organization.booking_banner_url else null end,
      'tagline', case when v_has_commercial_branding then v_organization.booking_tagline else null end,
      'address', case when v_has_commercial_branding then v_organization.booking_address else null end,
      'hours_text', case when v_has_commercial_branding then v_organization.booking_hours_text else null end,
      'practical_info', case when v_has_commercial_branding then v_organization.booking_practical_info else null end,
      'show_ncr_branding', case when v_has_commercial_branding then v_organization.show_ncr_branding else true end,
      'timezone', v_organization.timezone
    ),
    'settings', jsonb_build_object(
      'confirmation_mode', v_organization.booking_confirmation_mode,
      'slot_interval', v_organization.booking_slot_interval,
      'min_notice_hours', v_organization.booking_min_notice_hours,
      'max_days_ahead', v_organization.booking_max_days_ahead,
      'cancel_notice_hours', v_organization.booking_cancel_notice_hours,
      'welcome_text', v_organization.booking_welcome_text,
      'cancellation_policy', v_organization.booking_cancellation_policy,
      'privacy_notice', v_organization.booking_privacy_notice,
      'contact_email', v_organization.booking_contact_email,
      'contact_phone', v_organization.booking_contact_phone
    ),
    'sites', v_sites,
    'services', v_services,
    'staff', v_staff
  );
end;
$$;

-- Créneaux filtrés par établissement. Pour les offres non Métier, p_site_id reste nul.
create or replace function public.get_public_available_slots_v2(
  p_slug text,
  p_site_id uuid,
  p_service_id uuid,
  p_date date,
  p_staff_id uuid default null
)
returns table (
  slot_start timestamptz,
  slot_end timestamptz,
  staff_id uuid,
  staff_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
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
  select id, plan, timezone, booking_slot_interval, booking_min_notice_hours, booking_max_days_ahead
  into v_organization_id, v_plan, v_timezone, v_interval, v_min_notice, v_max_days
  from public.organizations
  where slug = lower(trim(p_slug))
    and status in ('trial','active')
    and business_type = 'coiffure'
    and booking_enabled = true;

  if v_organization_id is null then return; end if;

  if v_plan = 'metier' and not exists (
    select 1 from public.organization_sites
    where id = p_site_id and organization_id = v_organization_id and status = 'active'
  ) then return; end if;

  if v_plan = 'metier' then
    select timezone into v_timezone
    from public.organization_sites
    where id = p_site_id and organization_id = v_organization_id and status = 'active';
  end if;

  select duration_minutes into v_duration
  from public.services
  where id = p_service_id and organization_id = v_organization_id and active = true;
  if v_duration is null then return; end if;

  v_today := (now() at time zone v_timezone)::date;
  if p_date < v_today or p_date > v_today + v_max_days then return; end if;
  v_weekday := extract(isodow from p_date)::smallint - 1;

  return query
  with candidates as (
    select st.id candidate_staff_id, st.display_name candidate_staff_name,
           local_start, local_start + make_interval(mins => v_duration) local_end
    from public.staff st
    join public.staff_services ss on ss.organization_id = st.organization_id and ss.staff_id = st.id and ss.service_id = p_service_id
    join public.staff_working_hours h on h.organization_id = st.organization_id and h.staff_id = st.id and h.weekday = v_weekday
    cross join lateral generate_series(
      p_date + h.start_time,
      p_date + h.end_time - make_interval(mins => v_duration),
      make_interval(mins => v_interval)
    ) as gs(local_start)
    where st.organization_id = v_organization_id
      and st.active = true
      and (v_plan <> 'metier' or st.site_id = p_site_id)
      and (p_staff_id is null or st.id = p_staff_id)
  )
  select c.local_start at time zone v_timezone,
         c.local_end at time zone v_timezone,
         c.candidate_staff_id,
         c.candidate_staff_name
  from candidates c
  where (c.local_start at time zone v_timezone) >= now() + make_interval(hours => v_min_notice)
    and not exists (
      select 1 from public.staff_breaks b
      where b.organization_id = v_organization_id
        and b.staff_id = c.candidate_staff_id
        and b.weekday = v_weekday
        and c.local_start::time < b.end_time
        and c.local_end::time > b.start_time
    )
    and not exists (
      select 1 from public.appointments a
      where a.organization_id = v_organization_id
        and a.staff_id = c.candidate_staff_id
        and a.status <> 'cancelled'
        and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(c.local_start at time zone v_timezone, c.local_end at time zone v_timezone, '[)')
    )
  order by slot_start, staff_name;
end;
$$;

-- Réservation publique avec établissement.
create or replace function public.create_public_booking_v3(
  p_slug text,
  p_site_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_notes text default null,
  p_website text default null,
  p_privacy_consent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_plan text;
  v_result jsonb;
  v_appointment_id uuid;
  v_site_name text;
  v_site_address text;
begin
  select id, plan into v_org_id, v_plan
  from public.organizations
  where slug = lower(trim(p_slug)) and status in ('trial','active');

  if v_org_id is null then raise exception 'La réservation en ligne est indisponible.'; end if;

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
    p_email, p_phone, p_notes, p_website, p_privacy_consent
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
$$;

-- Gestion publique : expose l'établissement tout en conservant les droits des formules V2.1.
create or replace function public.get_public_booking(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'appointment_id', a.id,
    'token', a.public_token,
    'status', a.status,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'notes', a.notes,
    'amount_cents', a.amount_cents,
    'organization_name', case when o.plan in ('professionnelle','metier') then coalesce(o.public_name, o.name) else o.name end,
    'organization_slug', o.slug,
    'primary_color', case when o.plan in ('professionnelle','metier') then o.primary_color else '#2997ff' end,
    'logo_url', case when o.plan in ('professionnelle','metier') then o.logo_url else null end,
    'banner_url', case when o.plan in ('professionnelle','metier') then o.booking_banner_url else null end,
    'organization_address', case when o.plan in ('professionnelle','metier') then o.booking_address else null end,
    'organization_hours_text', case when o.plan in ('professionnelle','metier') then o.booking_hours_text else null end,
    'organization_practical_info', case when o.plan in ('professionnelle','metier') then o.booking_practical_info else null end,
    'site_id', a.site_id,
    'site_name', site.name,
    'site_address', nullif(trim(concat_ws(' ', site.address, site.postal_code, site.city)), ''),
    'show_ncr_branding', case when o.plan in ('professionnelle','metier') then o.show_ncr_branding else true end,
    'timezone', coalesce(site.timezone, o.timezone),
    'cancel_notice_hours', o.booking_cancel_notice_hours,
    'service_id', s.id,
    'service_name', s.name,
    'service_duration_minutes', s.duration_minutes,
    'staff_id', st.id,
    'staff_name', st.display_name,
    'client_name', trim(concat_ws(' ', c.first_name, c.last_name)),
    'client_email', c.email,
    'client_phone', c.phone,
    'contact_email', coalesce(site.email, o.booking_contact_email),
    'contact_phone', coalesce(site.phone, o.booking_contact_phone),
    'cancellation_policy', o.booking_cancellation_policy,
    'privacy_notice', o.booking_privacy_notice,
    'online_management_enabled', public.plan_feature_enabled(o.plan, 'online_booking_management'),
    'calendar_links_enabled', public.plan_feature_enabled(o.plan, 'calendar_links'),
    'can_cancel', (
      public.plan_feature_enabled(o.plan, 'online_booking_management')
      and a.status in ('pending','confirmed')
      and now() < a.starts_at - make_interval(hours => o.booking_cancel_notice_hours)
    )
  ) into v_result
  from public.appointments a
  join public.organizations o on o.id = a.organization_id
  join public.clients c on c.organization_id = a.organization_id and c.id = a.client_id
  join public.services s on s.organization_id = a.organization_id and s.id = a.service_id
  join public.staff st on st.organization_id = a.organization_id and st.id = a.staff_id
  left join public.organization_sites site on site.organization_id = a.organization_id and site.id = a.site_id
  where a.public_token = p_token and a.source = 'public';

  if v_result is not null then
    update public.appointments set customer_manage_last_seen_at = now() where public_token = p_token;
  end if;
  return v_result;
end;
$$;

create or replace function public.reschedule_public_booking_v2(
  p_token uuid,
  p_site_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_plan text;
  v_current_site uuid;
  v_result jsonb;
begin
  select a.organization_id, o.plan, a.site_id
  into v_org_id, v_plan, v_current_site
  from public.appointments a
  join public.organizations o on o.id = a.organization_id
  where a.public_token = p_token and a.source = 'public';

  if v_org_id is null then raise exception 'Réservation introuvable.'; end if;

  if v_plan = 'metier' then
    if p_site_id is distinct from v_current_site then
      raise exception 'Le déplacement doit rester dans l’établissement initial.';
    end if;
    if not exists (
      select 1 from public.staff
      where id = p_staff_id and organization_id = v_org_id and site_id = p_site_id and active = true
    ) then raise exception 'Ce professionnel n’est pas disponible dans cet établissement.'; end if;
  end if;

  v_result := public.reschedule_public_booking(p_token, p_staff_id, p_starts_at);
  update public.appointments
  set site_id = case when v_plan = 'metier' then p_site_id else null end,
      updated_at = now()
  where public_token = p_token;
  return v_result;
end;
$$;

revoke all on function public.save_staff_configuration_v2(uuid,uuid,uuid,text,text,text,text,uuid[],jsonb,jsonb) from public;
revoke all on function public.save_appointment_v2(uuid,uuid,uuid,uuid,uuid,uuid,timestamptz,text,text) from public;
revoke all on function public.get_public_available_slots_v2(text,uuid,uuid,date,uuid) from public;
revoke all on function public.create_public_booking_v3(text,uuid,uuid,uuid,timestamptz,text,text,text,text,text,text,boolean) from public;
revoke all on function public.reschedule_public_booking_v2(uuid,uuid,uuid,timestamptz) from public;

grant execute on function public.save_staff_configuration_v2(uuid,uuid,uuid,text,text,text,text,uuid[],jsonb,jsonb) to authenticated;
grant execute on function public.save_appointment_v2(uuid,uuid,uuid,uuid,uuid,uuid,timestamptz,text,text) to authenticated;
grant execute on function public.get_public_available_slots_v2(text,uuid,uuid,date,uuid) to anon, authenticated;
grant execute on function public.create_public_booking_v3(text,uuid,uuid,uuid,timestamptz,text,text,text,text,text,text,boolean) to anon, authenticated;
grant execute on function public.reschedule_public_booking_v2(uuid,uuid,uuid,timestamptz) to anon, authenticated;
