create or replace function public.save_appointment_v2(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_site_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_status text default 'confirmed'::text,
  p_notes text default null::text
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_catalog
as $function$
declare
  v_appointment_id uuid;
  v_company_id uuid;
  v_timezone text;
  v_duration integer;
  v_amount integer;
  v_buffer_before integer := 0;
  v_buffer_after integer := 0;
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
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;
  if p_status not in ('pending','confirmed','completed','cancelled','no_show') then
    raise exception 'Statut de rendez-vous invalide.';
  end if;

  select o.timezone into v_timezone
  from public.organizations o
  where o.id=p_organization_id;
  if v_timezone is null then raise exception 'Entreprise introuvable.'; end if;

  select s.company_id into v_company_id
  from public.organization_sites s
  where s.id=p_site_id
    and s.organization_id=p_organization_id
    and s.status='active';

  if not exists (
    select 1 from public.organization_sites s
    where s.id=p_site_id
      and s.organization_id=p_organization_id
      and s.status='active'
  ) then
    raise exception 'L’établissement sélectionné est introuvable ou inactif.';
  end if;

  if v_company_id is null and exists (
    select 1 from public.organizations o
    where o.id=p_organization_id and o.business_type='coiffure' and o.plan='metier'
  ) then
    raise exception 'L’établissement sélectionné n’est rattaché à aucune enseigne Beauty.';
  end if;

  if not exists (
    select 1 from public.clients c
    where c.id=p_client_id
      and c.organization_id=p_organization_id
      and c.status='active'
      and (
        v_company_id is null
        or c.company_id is not distinct from v_company_id
      )
  ) then
    raise exception 'Le client sélectionné est introuvable, inactif ou rattaché à une autre enseigne.';
  end if;

  select sv.duration_minutes,
         sv.price_cents,
         coalesce(sv.booking_buffer_before_minutes,0),
         coalesce(sv.booking_buffer_after_minutes,0)
    into v_duration,v_amount,v_buffer_before,v_buffer_after
  from public.services sv
  where sv.id=p_service_id
    and sv.organization_id=p_organization_id
    and sv.active=true
    and (
      v_company_id is null
      or sv.company_id is null
      or sv.company_id=v_company_id
    );
  if v_duration is null then
    raise exception 'La prestation sélectionnée est introuvable, inactive ou rattachée à une autre enseigne.';
  end if;

  if not exists (
    select 1 from public.staff st
    where st.id=p_staff_id
      and st.organization_id=p_organization_id
      and st.site_id=p_site_id
      and st.active=true
      and (
        v_company_id is null
        or st.company_id is null
        or st.company_id=v_company_id
      )
  ) then
    raise exception 'Ce collaborateur n’est pas rattaché à l’établissement sélectionné.';
  end if;

  if not exists (
    select 1 from public.staff_services ss
    where ss.organization_id=p_organization_id
      and ss.staff_id=p_staff_id
      and ss.service_id=p_service_id
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

  select wh.start_time,wh.end_time into v_work_start,v_work_end
  from public.staff_working_hours wh
  where wh.organization_id=p_organization_id
    and wh.staff_id=p_staff_id
    and wh.weekday=v_weekday;

  if v_work_start is null then
    raise exception 'Le collaborateur ne travaille pas ce jour-là.';
  end if;
  if v_start_time < v_work_start or v_end_time > v_work_end then
    raise exception 'Le rendez-vous se situe en dehors des horaires du collaborateur.';
  end if;

  if exists (
    select 1 from public.staff_breaks br
    where br.organization_id=p_organization_id
      and br.staff_id=p_staff_id
      and br.weekday=v_weekday
      and v_start_time < br.end_time
      and v_end_time > br.start_time
  ) then
    raise exception 'Le créneau chevauche une pause du collaborateur.';
  end if;

  if p_status<>'cancelled' and exists (
    select 1 from public.appointments a
    where a.organization_id=p_organization_id
      and a.staff_id=p_staff_id
      and a.status<>'cancelled'
      and (p_appointment_id is null or a.id<>p_appointment_id)
      and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(p_starts_at,v_ends_at,'[)')
  ) then
    raise exception 'Ce créneau est déjà occupé pour ce collaborateur.';
  end if;

  if p_status<>'cancelled' and v_company_id is not null and exists (
    select 1
    from public.beauty_availability_blocks blk
    where blk.organization_id=p_organization_id
      and blk.company_id=v_company_id
      and blk.site_id=p_site_id
      and blk.active=true
      and (blk.staff_id is null or blk.staff_id=p_staff_id)
      and tstzrange(blk.starts_at,blk.ends_at,'[)') &&
          tstzrange(
            p_starts_at-make_interval(mins=>v_buffer_before),
            v_ends_at+make_interval(mins=>v_buffer_after),
            '[)'
          )
  ) then
    raise exception 'Ce créneau est bloqué par une fermeture, un congé ou une indisponibilité.';
  end if;

  if p_appointment_id is null then
    insert into public.appointments(
      organization_id,company_id,site_id,client_id,service_id,staff_id,
      starts_at,ends_at,status,notes,amount_cents,source,created_by,cancelled_at
    ) values (
      p_organization_id,v_company_id,p_site_id,p_client_id,p_service_id,p_staff_id,
      p_starts_at,v_ends_at,p_status,v_notes,v_amount,'internal',auth.uid(),
      case when p_status='cancelled' then now() else null end
    )
    returning id into v_appointment_id;
  else
    update public.appointments
    set company_id=v_company_id,
        site_id=p_site_id,
        client_id=p_client_id,
        service_id=p_service_id,
        staff_id=p_staff_id,
        starts_at=p_starts_at,
        ends_at=v_ends_at,
        status=p_status,
        notes=v_notes,
        amount_cents=v_amount,
        cancelled_at=case when p_status='cancelled' then coalesce(cancelled_at,now()) else null end,
        cancellation_reason=case when p_status='cancelled' then cancellation_reason else null end,
        updated_at=now()
    where id=p_appointment_id
      and organization_id=p_organization_id
    returning id into v_appointment_id;

    if v_appointment_id is null then raise exception 'Rendez-vous introuvable.'; end if;
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,
    auth.uid(),
    case when p_appointment_id is null then 'appointment.created' else 'appointment.updated' end,
    'appointment',
    v_appointment_id::text,
    jsonb_build_object('site_id',p_site_id,'company_id',v_company_id)
  );

  return v_appointment_id;
exception when exclusion_violation then
  raise exception 'Ce créneau vient d’être réservé par une autre personne.';
end;
$function$;