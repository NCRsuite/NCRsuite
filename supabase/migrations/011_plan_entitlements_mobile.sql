-- NCR Suite V2.1.0 — formules réellement appliquées et stabilisation mobile
-- À exécuter après 010_platform_admin_subscriptions.sql.

begin;

-- Catalogue commercial central : seules les fonctions déjà disponibles dans NCR Suite
-- sont déclarées ici. Les futures fonctions (paiement, fidélité, exports...) restent absentes.
update public.plan_catalog
set features = case plan_key
  when 'decouverte' then '{
    "public_booking": true,
    "confirmation_emails": true,
    "automatic_reminders": false,
    "online_booking_management": false,
    "calendar_links": false,
    "team_access": false,
    "manager_role": false,
    "commercial_branding": false,
    "white_label": false
  }'::jsonb
  when 'essentielle' then '{
    "public_booking": true,
    "confirmation_emails": true,
    "automatic_reminders": true,
    "online_booking_management": true,
    "calendar_links": true,
    "team_access": true,
    "manager_role": false,
    "commercial_branding": false,
    "white_label": false
  }'::jsonb
  when 'professionnelle' then '{
    "public_booking": true,
    "confirmation_emails": true,
    "automatic_reminders": true,
    "online_booking_management": true,
    "calendar_links": true,
    "team_access": true,
    "manager_role": true,
    "commercial_branding": true,
    "white_label": false
  }'::jsonb
  when 'metier' then '{
    "public_booking": true,
    "confirmation_emails": true,
    "automatic_reminders": true,
    "online_booking_management": true,
    "calendar_links": true,
    "team_access": true,
    "manager_role": true,
    "commercial_branding": true,
    "white_label": true
  }'::jsonb
  else features
end,
updated_at = now();

create or replace function public.plan_feature_enabled(
  p_plan text,
  p_feature text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((features ->> p_feature)::boolean, false)
  from public.plan_catalog
  where plan_key = p_plan
    and active = true;
$$;

create or replace function public.organization_plan_entitlements(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_org_member_any_status(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;

  select jsonb_build_object(
    'plan', o.plan,
    'display_name', p.display_name,
    'monthly_price_cents', coalesce(s.monthly_price_cents, p.monthly_price_cents),
    'member_limit', p.member_limit,
    'features', p.features,
    'organization_status', o.status,
    'subscription_status', coalesce(s.status, 'active'),
    'trial_ends_at', s.trial_ends_at,
    'current_period_end', s.current_period_end
  )
  into v_result
  from public.organizations o
  join public.plan_catalog p on p.plan_key = o.plan
  left join public.organization_subscriptions s on s.organization_id = o.id
  where o.id = p_organization_id;

  return v_result;
end;
$$;

-- Conserve la logique V1.6, mais bloque les rappels sur la formule Découverte.
do $$
begin
  if to_regprocedure('public.update_email_notification_settings_base_v210(uuid,boolean,text,text,integer)') is null then
    alter function public.update_email_notification_settings(uuid,boolean,text,text,integer)
      rename to update_email_notification_settings_base_v210;
  end if;
end
$$;

create or replace function public.update_email_notification_settings(
  p_organization_id uuid,
  p_enabled boolean,
  p_contact_email text,
  p_contact_phone text,
  p_reminder_hours integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  select plan into v_plan
  from public.organizations
  where id = p_organization_id;

  if v_plan is null then
    raise exception 'Entreprise introuvable.';
  end if;

  if p_reminder_hours <> 0
     and not public.plan_feature_enabled(v_plan, 'automatic_reminders') then
    raise exception 'Les rappels automatiques sont disponibles à partir de l’offre Essentielle.';
  end if;

  perform public.update_email_notification_settings_base_v210(
    p_organization_id,
    p_enabled,
    p_contact_email,
    p_contact_phone,
    case when public.plan_feature_enabled(v_plan, 'automatic_reminders') then p_reminder_hours else 0 end
  );
end;
$$;

-- Le moteur de rappel vérifie aussi la formule côté serveur : aucun contournement possible.
do $$
begin
  if to_regprocedure('public.sync_appointment_reminder_base_v210(uuid)') is null then
    alter function public.sync_appointment_reminder(uuid)
      rename to sync_appointment_reminder_base_v210;
  end if;
end
$$;

create or replace function public.sync_appointment_reminder(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_key text := 'appointment:' || p_appointment_id::text || ':customer_reminder';
begin
  select o.plan into v_plan
  from public.appointments a
  join public.organizations o on o.id = a.organization_id
  where a.id = p_appointment_id;

  if v_plan is null or not public.plan_feature_enabled(v_plan, 'automatic_reminders') then
    update public.email_outbox
    set status = 'cancelled', updated_at = now()
    where dedupe_key = v_key
      and status in ('pending','failed','sending');
    return;
  end if;

  perform public.sync_appointment_reminder_base_v210(p_appointment_id);
end;
$$;

-- La page client expose clairement les droits de la formule.
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

-- Les RPC publiques sont protégées côté base, pas uniquement masquées dans l’interface.
do $$
begin
  if to_regprocedure('public.cancel_public_booking_base_v210(uuid,text)') is null then
    alter function public.cancel_public_booking(uuid,text)
      rename to cancel_public_booking_base_v210;
  end if;
end
$$;

create or replace function public.cancel_public_booking(
  p_token uuid,
  p_reason text default 'Annulation demandée par le client'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  select o.plan into v_plan
  from public.appointments a
  join public.organizations o on o.id = a.organization_id
  where a.public_token = p_token
    and a.source = 'public';

  if v_plan is null then
    raise exception 'Réservation introuvable.';
  end if;

  if not public.plan_feature_enabled(v_plan, 'online_booking_management') then
    raise exception 'L’annulation en ligne n’est pas incluse dans la formule de cet établissement.';
  end if;

  return public.cancel_public_booking_base_v210(p_token, p_reason);
end;
$$;

do $$
begin
  if to_regprocedure('public.reschedule_public_booking_base_v210(uuid,uuid,timestamp with time zone)') is null then
    alter function public.reschedule_public_booking(uuid,uuid,timestamptz)
      rename to reschedule_public_booking_base_v210;
  end if;
end
$$;

create or replace function public.reschedule_public_booking(
  p_token uuid,
  p_staff_id uuid,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  select o.plan into v_plan
  from public.appointments a
  join public.organizations o on o.id = a.organization_id
  where a.public_token = p_token
    and a.source = 'public';

  if v_plan is null then
    raise exception 'Réservation introuvable.';
  end if;

  if not public.plan_feature_enabled(v_plan, 'online_booking_management') then
    raise exception 'La modification en ligne n’est pas incluse dans la formule de cet établissement.';
  end if;

  return public.reschedule_public_booking_base_v210(p_token, p_staff_id, p_starts_at);
end;
$$;

-- Une baisse de formule neutralise automatiquement les fonctions devenues indisponibles.
create or replace function public.apply_organization_plan_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan = 'decouverte' then
    new.booking_reminder_hours := 0;
  end if;

  if new.plan <> 'metier' then
    new.show_ncr_branding := true;
  end if;

  return new;
end;
$$;

drop trigger if exists apply_organization_plan_defaults_trigger on public.organizations;
create trigger apply_organization_plan_defaults_trigger
before insert or update of plan on public.organizations
for each row execute procedure public.apply_organization_plan_defaults();

create or replace function public.cleanup_disabled_plan_features()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan = 'decouverte' then
    update public.email_outbox
    set status = 'cancelled', updated_at = now()
    where organization_id = new.id
      and template_key = 'customer_reminder'
      and status in ('pending','failed','sending');
  end if;
  return new;
end;
$$;

drop trigger if exists cleanup_disabled_plan_features_trigger on public.organizations;
create trigger cleanup_disabled_plan_features_trigger
after update of plan on public.organizations
for each row execute procedure public.cleanup_disabled_plan_features();

-- Mise en conformité des comptes Découverte déjà présents.
update public.organizations
set booking_reminder_hours = 0,
    show_ncr_branding = true,
    updated_at = now()
where plan = 'decouverte'
  and (booking_reminder_hours <> 0 or show_ncr_branding = false);

update public.email_outbox e
set status = 'cancelled', updated_at = now()
from public.organizations o
where o.id = e.organization_id
  and o.plan = 'decouverte'
  and e.template_key = 'customer_reminder'
  and e.status in ('pending','failed','sending');

revoke all on function public.plan_feature_enabled(text,text) from public;
revoke all on function public.organization_plan_entitlements(uuid) from public;
revoke all on function public.update_email_notification_settings_base_v210(uuid,boolean,text,text,integer) from public, anon, authenticated;
revoke all on function public.sync_appointment_reminder_base_v210(uuid) from public, anon, authenticated;
revoke all on function public.cancel_public_booking_base_v210(uuid,text) from public, anon, authenticated;
revoke all on function public.reschedule_public_booking_base_v210(uuid,uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.update_email_notification_settings(uuid,boolean,text,text,integer) from public;
revoke all on function public.sync_appointment_reminder(uuid) from public;
revoke all on function public.get_public_booking(uuid) from public;
revoke all on function public.cancel_public_booking(uuid,text) from public;
revoke all on function public.reschedule_public_booking(uuid,uuid,timestamptz) from public;
revoke all on function public.apply_organization_plan_defaults() from public;
revoke all on function public.cleanup_disabled_plan_features() from public;

grant execute on function public.organization_plan_entitlements(uuid) to authenticated;
grant execute on function public.update_email_notification_settings(uuid,boolean,text,text,integer) to authenticated;
grant execute on function public.get_public_booking(uuid) to anon, authenticated;
grant execute on function public.cancel_public_booking(uuid,text) to anon, authenticated;
grant execute on function public.reschedule_public_booking(uuid,uuid,timestamptz) to anon, authenticated;

commit;
