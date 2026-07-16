-- NCR Suite V2.6.1 — correctif réservation Coiffure / notifications Push
-- Corrige staff.first_name inexistant et rend le déclencheur non bloquant.

begin;

create or replace function public.push_notify_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client text;
  v_service text;
  v_staff text;
  v_timezone text;
  v_local text;
  v_hours integer;
begin
  begin
    select
      nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
      s.name,
      st.display_name,
      o.timezone,
      o.booking_reminder_hours
    into v_client, v_service, v_staff, v_timezone, v_hours
    from public.organizations o
    left join public.clients c
      on c.organization_id = new.organization_id
     and c.id = new.client_id
    left join public.services s
      on s.organization_id = new.organization_id
     and s.id = new.service_id
    left join public.staff st
      on st.organization_id = new.organization_id
     and st.id = new.staff_id
    where o.id = new.organization_id;

    v_local := to_char(
      new.starts_at at time zone coalesce(v_timezone, 'Europe/Paris'),
      'DD/MM/YYYY à HH24:MI'
    );

    if tg_op = 'INSERT' then
      perform public.enqueue_org_notification_internal(
        new.organization_id,
        array['owner','admin','manager'],
        'appointments',
        'appointment_created',
        case when new.source = 'public' then 'Nouveau rendez-vous en ligne' else 'Nouveau rendez-vous' end,
        coalesce(v_client, 'Un client') || ' · ' || coalesce(v_service, 'Prestation') || ' · ' || v_local,
        '/rendez-vous',
        'normal',
        'appointment',
        new.id::text,
        jsonb_build_object('appointment_id', new.id, 'staff', v_staff),
        'appointment-created:' || new.id::text
      );
    elsif old.starts_at is distinct from new.starts_at
       or old.status is distinct from new.status
       or old.staff_id is distinct from new.staff_id then
      perform public.enqueue_org_notification_internal(
        new.organization_id,
        array['owner','admin','manager'],
        'appointments',
        'appointment_updated',
        case when new.status = 'cancelled' then 'Rendez-vous annulé' else 'Rendez-vous modifié' end,
        coalesce(v_client, 'Client') || ' · ' || coalesce(v_service, 'Prestation') || ' · ' || v_local,
        '/rendez-vous',
        case when new.status = 'cancelled' then 'high' else 'normal' end,
        'appointment',
        new.id::text,
        jsonb_build_object('appointment_id', new.id, 'status', new.status),
        'appointment-updated:' || new.id::text || ':' || new.status || ':' || extract(epoch from new.starts_at)::bigint::text
      );
    end if;

    perform public.cancel_scheduled_notifications_internal(
      new.organization_id,
      'appointment',
      new.id::text,
      'appointment_reminder'
    );

    if new.status in ('pending','confirmed')
       and coalesce(v_hours, 0) > 0
       and new.starts_at > now() then
      perform public.enqueue_org_notification_internal(
        new.organization_id,
        array['owner','admin','manager'],
        'appointments',
        'appointment_reminder',
        'Rendez-vous à venir',
        coalesce(v_client, 'Client') || ' · ' || coalesce(v_service, 'Prestation') || ' · ' || v_local,
        '/rendez-vous',
        'normal',
        'appointment',
        new.id::text,
        jsonb_build_object('appointment_id', new.id),
        'appointment-reminder:' || new.id::text || ':' || extract(epoch from new.starts_at)::bigint::text,
        greatest(now(), new.starts_at - make_interval(hours => v_hours)),
        new.starts_at + interval '2 hours'
      );
    end if;
  exception when others then
    raise warning 'Notification rendez-vous ignorée pour % : %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

select pg_notify('pgrst', 'reload schema');
commit;
