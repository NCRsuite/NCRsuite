-- NCR Suite V1.6.0 — e-mails transactionnels et rappels de rendez-vous
-- À exécuter après 005_public_booking.sql.

alter table public.organizations
  add column if not exists email_notifications_enabled boolean not null default true,
  add column if not exists booking_contact_email text,
  add column if not exists booking_contact_phone text,
  add column if not exists booking_reminder_hours integer not null default 24;

alter table public.organizations
  drop constraint if exists organizations_booking_reminder_hours_check,
  add constraint organizations_booking_reminder_hours_check
    check (booking_reminder_hours in (0,2,6,12,24,48,72));

alter table public.organizations
  drop constraint if exists organizations_booking_contact_email_check,
  add constraint organizations_booking_contact_email_check
    check (
      booking_contact_email is null
      or booking_contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    );

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  template_key text not null check (template_key in (
    'customer_pending',
    'customer_confirmed',
    'customer_rescheduled',
    'customer_cancelled',
    'customer_reminder',
    'business_new_booking',
    'business_rescheduled',
    'business_cancelled'
  )),
  recipient_email text not null,
  recipient_name text,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','cancelled')),
  scheduled_for timestamptz not null default now(),
  attempts integer not null default 0 check (attempts between 0 and 20),
  locked_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_outbox_pending
  on public.email_outbox(status, scheduled_for, created_at)
  where status in ('pending','sending');

create index if not exists idx_email_outbox_appointment
  on public.email_outbox(appointment_id, created_at desc);

alter table public.email_outbox enable row level security;

-- Aucune politique volontairement : seul le service_role de l'Edge Function peut lire la file.
drop policy if exists "email_outbox_no_client_access" on public.email_outbox;

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
    'organization_name', o.name,
    'organization_slug', o.slug,
    'organization_timezone', o.timezone,
    'organization_primary_color', o.primary_color,
    'organization_logo_url', o.logo_url,
    'contact_email', o.booking_contact_email,
    'contact_phone', o.booking_contact_phone,
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

create or replace function public.enqueue_appointment_email(
  p_appointment_id uuid,
  p_template_key text,
  p_recipient_kind text,
  p_dedupe_key text,
  p_scheduled_for timestamptz default now(),
  p_allow_resend boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
  v_organization_id uuid;
  v_enabled boolean;
  v_recipient_email text;
  v_recipient_name text;
begin
  select
    public.appointment_email_payload(a.id),
    a.organization_id,
    o.email_notifications_enabled,
    case
      when p_recipient_kind = 'customer' then c.email
      when p_recipient_kind = 'business' then o.booking_contact_email
      else null
    end,
    case
      when p_recipient_kind = 'customer' then trim(concat_ws(' ', c.first_name, c.last_name))
      when p_recipient_kind = 'business' then o.name
      else null
    end
  into v_payload, v_organization_id, v_enabled, v_recipient_email, v_recipient_name
  from public.appointments a
  join public.organizations o on o.id = a.organization_id
  join public.clients c
    on c.organization_id = a.organization_id
   and c.id = a.client_id
  where a.id = p_appointment_id;

  if v_payload is null or not coalesce(v_enabled, false) then
    return;
  end if;

  v_recipient_email := nullif(lower(trim(coalesce(v_recipient_email, ''))), '');
  if v_recipient_email is null
     or v_recipient_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    return;
  end if;

  insert into public.email_outbox (
    organization_id,
    appointment_id,
    template_key,
    recipient_email,
    recipient_name,
    payload,
    dedupe_key,
    status,
    scheduled_for,
    attempts,
    locked_at,
    sent_at,
    provider_message_id,
    last_error
  ) values (
    v_organization_id,
    p_appointment_id,
    p_template_key,
    v_recipient_email,
    nullif(trim(coalesce(v_recipient_name, '')), ''),
    v_payload,
    p_dedupe_key,
    'pending',
    greatest(p_scheduled_for, now()),
    0,
    null,
    null,
    null,
    null
  )
  on conflict (dedupe_key) do update
  set recipient_email = excluded.recipient_email,
      recipient_name = excluded.recipient_name,
      payload = excluded.payload,
      scheduled_for = excluded.scheduled_for,
      status = case
        when p_allow_resend then 'pending'
        when public.email_outbox.status in ('failed','cancelled') then 'pending'
        else public.email_outbox.status
      end,
      attempts = case when p_allow_resend then 0 else public.email_outbox.attempts end,
      locked_at = case when p_allow_resend then null else public.email_outbox.locked_at end,
      sent_at = case when p_allow_resend then null else public.email_outbox.sent_at end,
      provider_message_id = case when p_allow_resend then null else public.email_outbox.provider_message_id end,
      last_error = case when p_allow_resend then null else public.email_outbox.last_error end,
      updated_at = now();
end;
$$;

create or replace function public.sync_appointment_reminder(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_enabled boolean;
  v_reminder_hours integer;
  v_client_email text;
  v_scheduled_for timestamptz;
  v_key text;
begin
  select a.*
  into v_appointment
  from public.appointments a
  where a.id = p_appointment_id;

  if v_appointment.id is not null then
    select o.email_notifications_enabled, o.booking_reminder_hours, c.email
    into v_enabled, v_reminder_hours, v_client_email
    from public.organizations o
    join public.clients c
      on c.organization_id = o.id
     and c.id = v_appointment.client_id
    where o.id = v_appointment.organization_id;
  end if;

  v_key := 'appointment:' || p_appointment_id::text || ':customer_reminder';

  if v_appointment.id is null
     or not coalesce(v_enabled, false)
     or coalesce(v_reminder_hours, 0) = 0
     or v_appointment.status <> 'confirmed'
     or nullif(trim(coalesce(v_client_email, '')), '') is null then
    update public.email_outbox
    set status = 'cancelled', updated_at = now()
    where dedupe_key = v_key
      and status in ('pending','failed');
    return;
  end if;

  v_scheduled_for := v_appointment.starts_at - make_interval(hours => v_reminder_hours);

  -- Évite un rappel doublon juste après une confirmation tardive.
  if v_scheduled_for <= now() + interval '10 minutes' then
    update public.email_outbox
    set status = 'cancelled', updated_at = now()
    where dedupe_key = v_key
      and status in ('pending','failed');
    return;
  end if;

  perform public.enqueue_appointment_email(
    p_appointment_id,
    'customer_reminder',
    'customer',
    v_key,
    v_scheduled_for,
    true
  );
end;
$$;

create or replace function public.handle_appointment_email_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_time_key text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform public.enqueue_appointment_email(
        new.id,
        'customer_pending',
        'customer',
        'appointment:' || new.id::text || ':customer_pending',
        now(),
        false
      );
    elsif new.status = 'confirmed' then
      perform public.enqueue_appointment_email(
        new.id,
        'customer_confirmed',
        'customer',
        'appointment:' || new.id::text || ':customer_confirmed:' || extract(epoch from new.starts_at)::bigint::text,
        now(),
        false
      );
      perform public.sync_appointment_reminder(new.id);
    end if;

    if new.source = 'public' then
      perform public.enqueue_appointment_email(
        new.id,
        'business_new_booking',
        'business',
        'appointment:' || new.id::text || ':business_new_booking',
        now(),
        false
      );
    end if;

    return new;
  end if;

  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    perform public.enqueue_appointment_email(
      new.id,
      'customer_cancelled',
      'customer',
      'appointment:' || new.id::text || ':customer_cancelled',
      now(),
      false
    );

    if new.source = 'public' then
      perform public.enqueue_appointment_email(
        new.id,
        'business_cancelled',
        'business',
        'appointment:' || new.id::text || ':business_cancelled',
        now(),
        false
      );
    end if;

    perform public.sync_appointment_reminder(new.id);
    return new;
  end if;

  if new.starts_at is distinct from old.starts_at
     or new.ends_at is distinct from old.ends_at
     or new.staff_id is distinct from old.staff_id
     or new.service_id is distinct from old.service_id then
    if new.status in ('pending','confirmed') then
      v_time_key := extract(epoch from new.starts_at)::bigint::text;
      perform public.enqueue_appointment_email(
        new.id,
        'customer_rescheduled',
        'customer',
        'appointment:' || new.id::text || ':customer_rescheduled:' || v_time_key,
        now(),
        false
      );

      if new.source = 'public' then
        perform public.enqueue_appointment_email(
          new.id,
          'business_rescheduled',
          'business',
          'appointment:' || new.id::text || ':business_rescheduled:' || v_time_key,
          now(),
          false
        );
      end if;
    end if;

    perform public.sync_appointment_reminder(new.id);
    return new;
  end if;

  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    perform public.enqueue_appointment_email(
      new.id,
      'customer_confirmed',
      'customer',
      'appointment:' || new.id::text || ':customer_confirmed:' || extract(epoch from new.starts_at)::bigint::text,
      now(),
      false
    );
    perform public.sync_appointment_reminder(new.id);
  elsif new.status is distinct from old.status then
    perform public.sync_appointment_reminder(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_email_events on public.appointments;
create trigger appointments_email_events
after insert or update on public.appointments
for each row execute procedure public.handle_appointment_email_events();

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
  v_email text := nullif(lower(trim(coalesce(p_contact_email, ''))), '');
  v_phone text := nullif(trim(coalesce(p_contact_phone, '')), '');
  v_appointment record;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  if v_email is not null and v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'L’adresse e-mail de contact est invalide.';
  end if;

  if p_reminder_hours not in (0,2,6,12,24,48,72) then
    raise exception 'Délai de rappel invalide.';
  end if;

  if v_phone is not null and char_length(regexp_replace(v_phone, '[^0-9+]', '', 'g')) < 8 then
    raise exception 'Le numéro de téléphone de contact est invalide.';
  end if;

  update public.organizations
  set email_notifications_enabled = p_enabled,
      booking_contact_email = v_email,
      booking_contact_phone = v_phone,
      booking_reminder_hours = p_reminder_hours,
      updated_at = now()
  where id = p_organization_id;

  if not p_enabled then
    update public.email_outbox
    set status = 'cancelled', updated_at = now()
    where organization_id = p_organization_id
      and status in ('pending','failed');
  else
    for v_appointment in
      select id
      from public.appointments
      where organization_id = p_organization_id
        and status = 'confirmed'
        and starts_at > now() + interval '10 minutes'
    loop
      perform public.sync_appointment_reminder(v_appointment.id);
    end loop;
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'booking.email_settings_updated',
    'organization',
    p_organization_id::text,
    jsonb_build_object('enabled', p_enabled, 'reminder_hours', p_reminder_hours)
  );
end;
$$;

create or replace function public.claim_email_outbox(p_limit integer default 20)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.email_outbox
  set status = 'pending',
      locked_at = null,
      last_error = coalesce(last_error, 'Traitement interrompu, nouvelle tentative.'),
      updated_at = now()
  where status = 'sending'
    and locked_at < now() - interval '15 minutes';

  return query
  with candidates as (
    select id
    from public.email_outbox
    where status = 'pending'
      and scheduled_for <= now()
    order by scheduled_for, created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  )
  update public.email_outbox e
  set status = 'sending',
      attempts = e.attempts + 1,
      locked_at = now(),
      updated_at = now()
  from candidates c
  where e.id = c.id
  returning e.*;
end;
$$;

-- Les rendez-vous déjà présents sont pris en compte après installation de la V1.6.
do $$
declare
  v_appointment record;
begin
  for v_appointment in
    select id
    from public.appointments
    where status = 'confirmed'
      and starts_at > now() + interval '10 minutes'
  loop
    perform public.sync_appointment_reminder(v_appointment.id);
  end loop;
end $$;

revoke all on function public.appointment_email_payload(uuid) from public;
revoke all on function public.enqueue_appointment_email(uuid,text,text,text,timestamptz,boolean) from public;
revoke all on function public.sync_appointment_reminder(uuid) from public;
revoke all on function public.handle_appointment_email_events() from public;
revoke all on function public.update_email_notification_settings(uuid,boolean,text,text,integer) from public;
revoke all on function public.claim_email_outbox(integer) from public;

grant execute on function public.update_email_notification_settings(uuid,boolean,text,text,integer) to authenticated;
grant execute on function public.claim_email_outbox(integer) to service_role;
