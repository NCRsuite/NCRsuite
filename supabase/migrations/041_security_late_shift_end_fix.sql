begin;

-- V2.6.4 — Une fin de poste enregistrée tardivement doit rester rattachée
-- à la plage horaire de la vacation dans la main courante.
-- L'heure réelle du clic reste conservée dans l'audit et dans completed_at,
-- tandis que l'événement opérationnel utilise l'heure planifiée de fin
-- lorsqu'il est enregistré plus de deux heures après la vacation.
create or replace function public.set_security_shift_presence_event(
  p_organization_id uuid,
  p_shift_id uuid,
  p_action text,
  p_note text default null,
  p_force boolean default false
)
returns public.security_shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.security_shifts%rowtype;
  v_agent uuid;
  v_manager boolean;
  v_action text := lower(trim(coalesce(p_action, '')));
  v_source text;
  v_action_time timestamptz := now();
  v_event_time timestamptz;
  v_planned integer;
  v_has_start_event boolean;
  v_has_end_event boolean;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if v_action not in ('start', 'end') then raise exception 'Action invalide.'; end if;

  v_manager := public.is_security_manager(p_organization_id);
  v_agent := public.current_security_agent_id(p_organization_id);

  select * into v_shift
  from public.security_shifts
  where organization_id = p_organization_id and id = p_shift_id
  for update;

  if v_shift.id is null then raise exception 'Vacation introuvable.'; end if;
  if v_shift.status = 'canceled' then raise exception 'Cette vacation est annulée.'; end if;
  if not v_manager and (v_agent is null or v_shift.agent_id <> v_agent) then
    raise exception 'Cette vacation ne vous est pas attribuée.';
  end if;
  if v_shift.dossier_status in ('closed', 'archived') then
    raise exception 'Le dossier de cette vacation est déjà clôturé.';
  end if;

  v_source := case when v_manager then 'qg' else 'agent' end;

  -- Le contrôle horaire ne bloque que la prise de poste. Une vacation déjà
  -- prise doit pouvoir être terminée même après un oubli prolongé.
  if v_action = 'start'
     and not v_manager
     and not p_force
     and (v_action_time < v_shift.starts_at - interval '4 hours'
          or v_action_time > v_shift.ends_at + interval '8 hours') then
    raise exception 'La prise de poste est disponible uniquement autour de la vacation.';
  end if;

  -- Le trigger historique de la main courante accepte les événements entre
  -- H-1 et H+2. Pour une régularisation tardive, la fin de poste est donc
  -- datée à l'heure planifiée de fin, sans prétendre que l'agent a travaillé
  -- jusqu'au moment où il rouvre l'application.
  if v_action = 'end' and v_action_time > v_shift.ends_at + interval '2 hours' then
    v_event_time := v_shift.ends_at;
  elsif v_action = 'start' and v_action_time < v_shift.starts_at - interval '1 hour' then
    v_event_time := v_shift.starts_at - interval '1 hour';
  else
    v_event_time := v_action_time;
  end if;

  select exists(
    select 1 from public.security_logbook_entries
    where organization_id = p_organization_id
      and shift_id = p_shift_id
      and category = 'prise_poste'
  ) into v_has_start_event;

  select exists(
    select 1 from public.security_logbook_entries
    where organization_id = p_organization_id
      and shift_id = p_shift_id
      and category = 'fin_poste'
  ) into v_has_end_event;

  if v_action = 'start' then
    if v_shift.logbook_status = 'closed' then
      raise exception 'La main courante est déjà clôturée. Demande au QG de la rouvrir.';
    end if;

    if v_shift.clocked_in_at is null and not v_has_start_event then
      insert into public.security_logbook_entries(
        organization_id, shift_id, site_id, agent_id, occurred_at, category, severity,
        title, details, status, created_by
      ) values (
        p_organization_id, v_shift.id, v_shift.site_id, v_shift.agent_id, v_event_time,
        'prise_poste', 'info', 'Prise de poste',
        nullif(trim(coalesce(p_note, case when v_manager then 'Prise de poste enregistrée par le QG.' else '' end)), ''),
        'open', auth.uid()
      );
    end if;

    update public.security_shifts
    set status = case when status = 'planned' then 'in_progress' else status end,
        clocked_in_at = coalesce(clocked_in_at, v_action_time),
        clocked_in_by = coalesce(clocked_in_by, auth.uid()),
        clocked_in_source = coalesce(clocked_in_source, v_source),
        updated_at = now()
    where organization_id = p_organization_id and id = p_shift_id
    returning * into v_shift;

  else
    if v_shift.clocked_in_at is null then
      if not v_manager and not p_force then raise exception 'Prends d’abord ton poste.'; end if;

      if v_shift.logbook_status = 'closed' then
        update public.security_shifts
        set logbook_status = 'open',
            logbook_closed_at = null,
            logbook_closed_by = null,
            logbook_closed_source = null,
            updated_at = now()
        where organization_id = p_organization_id and id = p_shift_id;
      end if;

      if not v_has_start_event then
        insert into public.security_logbook_entries(
          organization_id, shift_id, site_id, agent_id, occurred_at, category, severity,
          title, details, status, created_by
        ) values (
          p_organization_id, v_shift.id, v_shift.site_id, v_shift.agent_id,
          v_shift.starts_at,
          'prise_poste', 'attention', 'Prise de poste régularisée par le QG',
          nullif(trim(coalesce(p_note, 'Prise de poste manquante régularisée lors de la clôture.')), ''),
          'open', auth.uid()
        );
      end if;
    end if;

    if v_shift.logbook_status = 'closed' and v_shift.clocked_out_at is null then
      update public.security_shifts
      set logbook_status = 'open',
          logbook_closed_at = null,
          logbook_closed_by = null,
          logbook_closed_source = null,
          updated_at = now()
      where organization_id = p_organization_id and id = p_shift_id;
    end if;

    if v_shift.clocked_out_at is null and not v_has_end_event then
      insert into public.security_logbook_entries(
        organization_id, shift_id, site_id, agent_id, occurred_at, category, severity,
        title, details, status, created_by
      ) values (
        p_organization_id, v_shift.id, v_shift.site_id, v_shift.agent_id, v_event_time,
        'fin_poste', 'info', 'Fin de poste',
        nullif(trim(coalesce(
          p_note,
          case
            when v_action_time > v_shift.ends_at + interval '2 hours' then
              case when v_manager
                then 'Fin de poste régularisée tardivement par le QG.'
                else 'Fin de poste régularisée tardivement par l’agent.'
              end
            when v_manager then 'Fin de poste enregistrée par le QG.'
            else ''
          end
        )), ''),
        'open', auth.uid()
      );
    end if;

    v_planned := greatest(
      0,
      floor(extract(epoch from (v_shift.ends_at - v_shift.starts_at)) / 60)::integer - v_shift.break_minutes
    );

    update public.security_pti_sessions
    set status = 'closed', closed_at = coalesce(closed_at, v_action_time), updated_at = now()
    where organization_id = p_organization_id
      and shift_id = p_shift_id
      and status in ('active', 'alerted');

    update public.security_agent_presence
    set status = 'stopped',
        tracking_active = false,
        wake_lock_active = false,
        stopped_at = coalesce(stopped_at, v_action_time),
        last_seen_at = v_action_time,
        updated_at = now()
    where organization_id = p_organization_id
      and shift_id = p_shift_id
      and status <> 'stopped';

    update public.security_shifts
    set status = 'completed',
        completed_at = coalesce(completed_at, v_action_time),
        completed_by = coalesce(completed_by, auth.uid()),
        actual_minutes = coalesce(actual_minutes, v_planned),
        clocked_in_at = coalesce(clocked_in_at, v_shift.starts_at),
        clocked_in_by = coalesce(clocked_in_by, auth.uid()),
        clocked_in_source = coalesce(clocked_in_source, v_source),
        clocked_out_at = coalesce(clocked_out_at, v_event_time),
        clocked_out_by = coalesce(clocked_out_by, auth.uid()),
        clocked_out_source = coalesce(clocked_out_source, v_source),
        logbook_status = 'closed',
        logbook_closed_at = coalesce(logbook_closed_at, v_action_time),
        logbook_closed_by = coalesce(logbook_closed_by, auth.uid()),
        logbook_closed_source = coalesce(logbook_closed_source, v_source),
        updated_at = now()
    where organization_id = p_organization_id and id = p_shift_id
    returning * into v_shift;
  end if;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'security.shift_' || v_action,
    'security_shift',
    p_shift_id::text,
    jsonb_build_object(
      'source', v_source,
      'force', p_force,
      'note', nullif(trim(coalesce(p_note, '')), ''),
      'action_at', v_action_time,
      'logbook_event_at', v_event_time,
      'late_regularization', v_action = 'end' and v_action_time > v_shift.ends_at + interval '2 hours'
    )
  );

  return v_shift;
end;
$$;

revoke all on function public.set_security_shift_presence_event(uuid, uuid, text, text, boolean) from public;
grant execute on function public.set_security_shift_presence_event(uuid, uuid, text, text, boolean) to authenticated;

select pg_notify('pgrst', 'reload schema');
commit;
