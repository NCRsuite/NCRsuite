-- NCR Suite V1.9.0 — personnalisation commerciale de l'offre Professionnelle
begin;

alter table public.organizations
  add column if not exists public_name text,
  add column if not exists booking_tagline text,
  add column if not exists booking_banner_url text,
  add column if not exists booking_address text,
  add column if not exists booking_hours_text text,
  add column if not exists booking_practical_info text,
  add column if not exists show_ncr_branding boolean not null default true;

alter table public.organizations
  drop constraint if exists organizations_public_name_check,
  add constraint organizations_public_name_check
    check (public_name is null or char_length(public_name) between 2 and 120),
  drop constraint if exists organizations_booking_tagline_check,
  add constraint organizations_booking_tagline_check
    check (booking_tagline is null or char_length(booking_tagline) <= 180),
  drop constraint if exists organizations_booking_banner_url_check,
  add constraint organizations_booking_banner_url_check
    check (booking_banner_url is null or (char_length(booking_banner_url) <= 1200 and booking_banner_url ~ '^https://')),
  drop constraint if exists organizations_logo_url_check,
  add constraint organizations_logo_url_check
    check (logo_url is null or (char_length(logo_url) <= 1200 and logo_url ~ '^https://')),
  drop constraint if exists organizations_booking_address_check,
  add constraint organizations_booking_address_check
    check (booking_address is null or char_length(booking_address) <= 500),
  drop constraint if exists organizations_booking_hours_text_check,
  add constraint organizations_booking_hours_text_check
    check (booking_hours_text is null or char_length(booking_hours_text) <= 800),
  drop constraint if exists organizations_booking_practical_info_check,
  add constraint organizations_booking_practical_info_check
    check (booking_practical_info is null or char_length(booking_practical_info) <= 1200);

-- La bibliothèque d'images est publique pour l'affichage sur les pages de réservation,
-- mais l'écriture reste limitée aux responsables de l'entreprise concernée.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-branding',
  'organization-branding',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_manage_brand_asset(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  begin
    v_organization_id := split_part(coalesce(p_object_name, ''), '/', 1)::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return public.has_org_role(v_organization_id, array['owner','admin','manager'])
    and exists (
      select 1
      from public.organizations o
      where o.id = v_organization_id
        and o.plan in ('professionnelle','metier')
        and o.status in ('trial','active')
    );
end;
$$;

revoke all on function public.can_manage_brand_asset(text) from public;
grant execute on function public.can_manage_brand_asset(text) to authenticated;

drop policy if exists "organization_branding_insert" on storage.objects;
create policy "organization_branding_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'organization-branding'
  and public.can_manage_brand_asset(name)
);

drop policy if exists "organization_branding_update" on storage.objects;
create policy "organization_branding_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'organization-branding'
  and public.can_manage_brand_asset(name)
)
with check (
  bucket_id = 'organization-branding'
  and public.can_manage_brand_asset(name)
);

drop policy if exists "organization_branding_delete" on storage.objects;
create policy "organization_branding_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'organization-branding'
  and public.can_manage_brand_asset(name)
);

drop policy if exists "organization_branding_select" on storage.objects;
create policy "organization_branding_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'organization-branding'
  and public.can_manage_brand_asset(name)
);

create or replace function public.update_commercial_branding(
  p_organization_id uuid,
  p_public_name text,
  p_slug text,
  p_primary_color text,
  p_logo_url text,
  p_banner_url text,
  p_tagline text,
  p_address text,
  p_hours_text text,
  p_practical_info text,
  p_show_ncr_branding boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_public_name text := nullif(trim(coalesce(p_public_name, '')), '');
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_logo_url text := nullif(trim(coalesce(p_logo_url, '')), '');
  v_banner_url text := nullif(trim(coalesce(p_banner_url, '')), '');
  v_tagline text := nullif(trim(coalesce(p_tagline, '')), '');
  v_address text := nullif(trim(coalesce(p_address, '')), '');
  v_hours_text text := nullif(trim(coalesce(p_hours_text, '')), '');
  v_practical_info text := nullif(trim(coalesce(p_practical_info, '')), '');
  v_reserved_slugs text[] := array[
    'connexion','configuration','reservation','reserver','invitation','admin','api',
    'ncr','ncr-suite','support','aide','contact','legal','mentions-legales'
  ];
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  select plan into v_plan
  from public.organizations
  where id = p_organization_id
    and status in ('trial','active');

  if v_plan is null then
    raise exception 'Entreprise introuvable ou inactive.';
  end if;

  if v_plan not in ('professionnelle','metier') then
    raise exception 'La personnalisation commerciale est disponible à partir de l’offre Professionnelle.';
  end if;

  if v_public_name is null or char_length(v_public_name) not between 2 and 120 then
    raise exception 'Le nom commercial doit contenir entre 2 et 120 caractères.';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) not between 2 and 60 then
    raise exception 'Le lien public doit contenir uniquement des lettres minuscules, chiffres et tirets.';
  end if;

  if v_slug = any(v_reserved_slugs) then
    raise exception 'Cet identifiant public est réservé.';
  end if;

  if exists (
    select 1 from public.organizations
    where slug = v_slug and id <> p_organization_id
  ) then
    raise exception 'Ce lien public est déjà utilisé.';
  end if;

  if p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'La couleur principale est invalide.';
  end if;

  if v_logo_url is not null and (char_length(v_logo_url) > 1200 or v_logo_url !~ '^https://') then
    raise exception 'L’adresse du logo est invalide.';
  end if;

  if v_banner_url is not null and (char_length(v_banner_url) > 1200 or v_banner_url !~ '^https://') then
    raise exception 'L’adresse de la bannière est invalide.';
  end if;

  if v_tagline is not null and char_length(v_tagline) > 180 then
    raise exception 'L’accroche est trop longue.';
  end if;

  if v_address is not null and char_length(v_address) > 500 then
    raise exception 'L’adresse est trop longue.';
  end if;

  if v_hours_text is not null and char_length(v_hours_text) > 800 then
    raise exception 'Les horaires sont trop longs.';
  end if;

  if v_practical_info is not null and char_length(v_practical_info) > 1200 then
    raise exception 'Les informations pratiques sont trop longues.';
  end if;

  update public.organizations
  set public_name = v_public_name,
      slug = v_slug,
      primary_color = lower(p_primary_color),
      logo_url = v_logo_url,
      booking_banner_url = v_banner_url,
      booking_tagline = v_tagline,
      booking_address = v_address,
      booking_hours_text = v_hours_text,
      booking_practical_info = v_practical_info,
      show_ncr_branding = case when v_plan = 'metier' then coalesce(p_show_ncr_branding, true) else true end,
      updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'organization.commercial_branding_updated',
    'organization',
    p_organization_id::text,
    jsonb_build_object('slug', v_slug, 'plan', v_plan)
  );
end;
$$;

revoke all on function public.update_commercial_branding(uuid,text,text,text,text,text,text,text,text,text,boolean) from public;
grant execute on function public.update_commercial_branding(uuid,text,text,text,text,text,text,text,text,text,boolean) to authenticated;

-- Page publique enrichie. Les offres inférieures conservent l'identité neutre NCR Suite.
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
  v_has_commercial_branding boolean;
begin
  select * into v_organization
  from public.organizations
  where slug = lower(trim(p_slug))
    and status in ('trial','active')
    and business_type = 'coiffure'
    and booking_enabled = true;

  if v_organization.id is null then
    return null;
  end if;

  v_has_commercial_branding := v_organization.plan in ('professionnelle','metier');

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'description', s.description,
      'duration_minutes', s.duration_minutes,
      'price_cents', s.price_cents
    ) order by s.name
  ), '[]'::jsonb)
  into v_services
  from public.services s
  where s.organization_id = v_organization.id
    and s.active = true
    and exists (
      select 1
      from public.staff_services ss
      join public.staff st
        on st.organization_id = ss.organization_id
       and st.id = ss.staff_id
       and st.active = true
      where ss.organization_id = v_organization.id
        and ss.service_id = s.id
    );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', st.id,
      'display_name', st.display_name,
      'color', st.color,
      'service_ids', coalesce((
        select jsonb_agg(ss.service_id order by ss.service_id)
        from public.staff_services ss
        where ss.organization_id = v_organization.id
          and ss.staff_id = st.id
      ), '[]'::jsonb)
    ) order by st.display_name
  ), '[]'::jsonb)
  into v_staff
  from public.staff st
  where st.organization_id = v_organization.id
    and st.active = true
    and exists (
      select 1 from public.staff_working_hours h
      where h.organization_id = v_organization.id
        and h.staff_id = st.id
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
    'services', v_services,
    'staff', v_staff
  );
end;
$$;

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
    'show_ncr_branding', case when o.plan in ('professionnelle','metier') then o.show_ncr_branding else true end,
    'timezone', o.timezone,
    'cancel_notice_hours', o.booking_cancel_notice_hours,
    'service_id', s.id,
    'service_name', s.name,
    'service_duration_minutes', s.duration_minutes,
    'staff_id', st.id,
    'staff_name', st.display_name,
    'client_name', trim(concat_ws(' ', c.first_name, c.last_name)),
    'client_email', c.email,
    'client_phone', c.phone,
    'contact_email', o.booking_contact_email,
    'contact_phone', o.booking_contact_phone,
    'cancellation_policy', o.booking_cancellation_policy,
    'privacy_notice', o.booking_privacy_notice,
    'can_cancel', (
      a.status in ('pending','confirmed')
      and now() < a.starts_at - make_interval(hours => o.booking_cancel_notice_hours)
    )
  ) into v_result
  from public.appointments a
  join public.organizations o on o.id = a.organization_id
  join public.clients c on c.organization_id = a.organization_id and c.id = a.client_id
  join public.services s on s.organization_id = a.organization_id and s.id = a.service_id
  join public.staff st on st.organization_id = a.organization_id and st.id = a.staff_id
  where a.public_token = p_token
    and a.source = 'public';

  if v_result is not null then
    update public.appointments
    set customer_manage_last_seen_at = now()
    where public_token = p_token;
  end if;

  return v_result;
end;
$$;

create or replace function public.appointment_email_payload(p_appointment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'appointment_id', a.id,
    'status', a.status,
    'source', a.source,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'amount_cents', a.amount_cents,
    'notes', a.notes,
    'cancellation_reason', a.cancellation_reason,
    'public_token', a.public_token,
    'organization_name', case when o.plan in ('professionnelle','metier') then coalesce(o.public_name, o.name) else o.name end,
    'organization_slug', o.slug,
    'organization_timezone', o.timezone,
    'organization_primary_color', case when o.plan in ('professionnelle','metier') then o.primary_color else '#2997ff' end,
    'organization_logo_url', case when o.plan in ('professionnelle','metier') then o.logo_url else null end,
    'organization_address', case when o.plan in ('professionnelle','metier') then o.booking_address else null end,
    'show_ncr_branding', case when o.plan in ('professionnelle','metier') then o.show_ncr_branding else true end,
    'contact_email', o.booking_contact_email,
    'contact_phone', o.booking_contact_phone,
    'cancellation_policy', o.booking_cancellation_policy,
    'client_name', trim(concat_ws(' ', c.first_name, c.last_name)),
    'client_first_name', c.first_name,
    'client_email', c.email,
    'client_phone', c.phone,
    'service_name', s.name,
    'service_duration_minutes', s.duration_minutes,
    'staff_name', st.display_name
  )
  from public.appointments a
  join public.organizations o on o.id = a.organization_id
  join public.clients c
    on c.organization_id = a.organization_id
   and c.id = a.client_id
  join public.services s
    on s.organization_id = a.organization_id
   and s.id = a.service_id
  join public.staff st
    on st.organization_id = a.organization_id
   and st.id = a.staff_id
  where a.id = p_appointment_id;
$$;

revoke all on function public.get_public_booking_page(text) from public;
revoke all on function public.get_public_booking(uuid) from public;
revoke all on function public.appointment_email_payload(uuid) from public;
grant execute on function public.get_public_booking_page(text) to anon, authenticated;
grant execute on function public.get_public_booking(uuid) to anon, authenticated;
grant execute on function public.appointment_email_payload(uuid) to service_role;

commit;
