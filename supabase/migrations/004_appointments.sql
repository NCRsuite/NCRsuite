-- NCR Suite V1.4.0 — rendez-vous internes, contrôle des disponibilités et anti double-réservation

create extension if not exists btree_gist;

alter table public.organizations
  add column if not exists timezone text not null default 'Europe/Paris';

alter table public.appointments
  add column if not exists source text not null default 'internal',
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text;

alter table public.appointments
  drop constraint if exists appointments_source_check;
alter table public.appointments
  add constraint appointments_source_check check (source in ('internal','public'));

-- Le pack V1.4 exige une prestation et un collaborateur pour chaque rendez-vous.
do $$
begin
  if not exists (select 1 from public.appointments where service_id is null) then
    alter table public.appointments alter column service_id set not null;
  end if;
  if not exists (select 1 from public.appointments where staff_id is null) then
    alter table public.appointments alter column staff_id set not null;
  end if;
end $$;

-- Protection transactionnelle contre deux rendez-vous simultanés pour un même collaborateur.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_no_staff_overlap'
  ) then
    alter table public.appointments
      add constraint appointments_no_staff_overlap
      exclude using gist (
        organization_id with =,
        staff_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      ) where (status <> 'cancelled');
  end if;
end $$;

create or replace function public.save_appointment(
  p_organization_id uuid,
  p_appointment_id uuid,
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
  v_appointment_id uuid;
  v_timezone text;
  v_duration integer;
  v_amount integer;
  v_starts_local timestamp;
  v_ends_at timestamptz;
  v_ends_local timestamp;
  v_weekday smallint;
  v_start_time time;
  v_end_time time;
  v_work_start time;
  v_work_end time;
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  if p_status not in ('pending','confirmed','completed','cancelled','no_show') then
    raise exception 'Statut de rendez-vous invalide.';
  end if;

  select timezone into v_timezone
  from public.organizations
  where id = p_organization_id;

  if v_timezone is null then
    raise exception 'Entreprise introuvable.';
  end if;

  if not exists (
    select 1 from public.clients
    where id = p_client_id
      and organization_id = p_organization_id
      and status = 'active'
  ) then
    raise exception 'Le client sélectionné est introuvable ou inactif.';
  end if;

  select duration_minutes, price_cents
  into v_duration, v_amount
  from public.services
  where id = p_service_id
    and organization_id = p_organization_id
    and active = true;

  if v_duration is null then
    raise exception 'La prestation sélectionnée est introuvable ou inactive.';
  end if;

  if not exists (
    select 1 from public.staff
    where id = p_staff_id
      and organization_id = p_organization_id
      and active = true
  ) then
    raise exception 'Le collaborateur sélectionné est introuvable ou inactif.';
  end if;

  if not exists (
    select 1 from public.staff_services
    where organization_id = p_organization_id
      and staff_id = p_staff_id
      and service_id = p_service_id
  ) then
    raise exception 'Ce collaborateur ne réalise pas cette prestation.';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_starts_local := p_starts_at at time zone v_timezone;
  v_ends_local := v_ends_at at time zone v_timezone;

  if v_starts_local::date <> v_ends_local::date then
    raise exception 'Un rendez-vous ne peut pas se terminer le lendemain.';
  end if;

  v_weekday := extract(isodow from v_starts_local)::smallint - 1;
  v_start_time := v_starts_local::time;
  v_end_time := v_ends_local::time;

  select start_time, end_time
  into v_work_start, v_work_end
  from public.staff_working_hours
  where organization_id = p_organization_id
    and staff_id = p_staff_id
    and weekday = v_weekday;

  if v_work_start is null then
    raise exception 'Le collaborateur ne travaille pas ce jour-là.';
  end if;

  if v_start_time < v_work_start or v_end_time > v_work_end then
    raise exception 'Le rendez-vous se situe en dehors des horaires du collaborateur.';
  end if;

  if exists (
    select 1 from public.staff_breaks
    where organization_id = p_organization_id
      and staff_id = p_staff_id
      and weekday = v_weekday
      and v_start_time < end_time
      and v_end_time > start_time
  ) then
    raise exception 'Le créneau chevauche une pause du collaborateur.';
  end if;

  if p_status <> 'cancelled' and exists (
    select 1 from public.appointments a
    where a.organization_id = p_organization_id
      and a.staff_id = p_staff_id
      and a.status <> 'cancelled'
      and (p_appointment_id is null or a.id <> p_appointment_id)
      and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'Ce créneau est déjà occupé pour ce collaborateur.';
  end if;

  if p_appointment_id is null then
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
      cancelled_at
    ) values (
      p_organization_id,
      p_client_id,
      p_service_id,
      p_staff_id,
      p_starts_at,
      v_ends_at,
      p_status,
      v_notes,
      v_amount,
      'internal',
      auth.uid(),
      case when p_status = 'cancelled' then now() else null end
    ) returning id into v_appointment_id;
  else
    update public.appointments
    set client_id = p_client_id,
        service_id = p_service_id,
        staff_id = p_staff_id,
        starts_at = p_starts_at,
        ends_at = v_ends_at,
        status = p_status,
        notes = v_notes,
        amount_cents = v_amount,
        cancelled_at = case when p_status = 'cancelled' then coalesce(cancelled_at, now()) else null end,
        cancellation_reason = case when p_status = 'cancelled' then cancellation_reason else null end
    where id = p_appointment_id
      and organization_id = p_organization_id
    returning id into v_appointment_id;

    if v_appointment_id is null then
      raise exception 'Rendez-vous introuvable.';
    end if;
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  values (
    p_organization_id,
    auth.uid(),
    case when p_appointment_id is null then 'appointment.created' else 'appointment.updated' end,
    'appointment',
    v_appointment_id::text
  );

  return v_appointment_id;
exception
  when exclusion_violation then
    raise exception 'Ce créneau vient d’être réservé par une autre personne.';
end;
$$;

create or replace function public.set_appointment_status(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_status text,
  p_cancellation_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  if p_status not in ('pending','confirmed','completed','cancelled','no_show') then
    raise exception 'Statut de rendez-vous invalide.';
  end if;

  update public.appointments
  set status = p_status,
      cancelled_at = case when p_status = 'cancelled' then coalesce(cancelled_at, now()) else null end,
      cancellation_reason = case
        when p_status = 'cancelled' then nullif(trim(coalesce(p_cancellation_reason, '')), '')
        else null
      end
  where id = p_appointment_id
    and organization_id = p_organization_id
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Rendez-vous introuvable.';
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'appointment.status_changed',
    'appointment',
    p_appointment_id::text,
    jsonb_build_object('status', p_status)
  );
exception
  when exclusion_violation then
    raise exception 'Le créneau est désormais occupé et ne peut pas être réactivé.';
end;
$$;

revoke all on function public.save_appointment(uuid,uuid,uuid,uuid,uuid,timestamptz,text,text) from public;
revoke all on function public.set_appointment_status(uuid,uuid,text,text) from public;
grant execute on function public.save_appointment(uuid,uuid,uuid,uuid,uuid,timestamptz,text,text) to authenticated;
grant execute on function public.set_appointment_status(uuid,uuid,text,text) to authenticated;

-- Les écritures passent obligatoirement par les fonctions sécurisées ci-dessus.
drop policy if exists "appointments_staff_insert" on public.appointments;
drop policy if exists "appointments_staff_update" on public.appointments;
drop policy if exists "appointments_manager_delete" on public.appointments;
revoke insert, update, delete on public.appointments from authenticated;
grant select on public.appointments to authenticated;

create index if not exists idx_appointments_org_status_start
  on public.appointments(organization_id, status, starts_at);
create index if not exists idx_appointments_client_start
  on public.appointments(organization_id, client_id, starts_at desc);
