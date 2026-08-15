-- NCR Suite V2.29.15 — QG opérationnel : push, déduplication, urgences et relève
-- À exécuter après 128_security_presence_photo_release_alignment.sql.

begin;

do $$
begin
  if to_regclass('public.notification_events') is null
     or to_regclass('public.push_delivery_queue') is null
     or to_regprocedure('public.enqueue_org_notification_internal(uuid,text[],text,text,text,text,text,text,text,text,jsonb,text,timestamptz,timestamptz)') is null then
    raise exception 'Le moteur de notifications push NCR doit être installé avant la V2.29.15.';
  end if;
  if to_regclass('public.security_shift_proofs') is null then
    raise exception 'La migration 127_security_premium_shift_presence.sql doit être exécutée avant la V2.29.15.';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Vacations : notifications QG immédiates + alertes programmées et annulables.
-- -----------------------------------------------------------------------------

create or replace function public.cancel_security_qg_condition_notification(
  p_organization_id uuid,
  p_shift_id uuid,
  p_event_type text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update public.notification_events
  set status='canceled'
  where organization_id=p_organization_id
    and entity_type='security_shift'
    and entity_id=p_shift_id::text
    and event_type=p_event_type
    and status='active';

  update public.push_delivery_queue q
  set status='canceled', locked_at=null, updated_at=now()
  from public.notification_events e
  where q.event_id=e.id
    and e.organization_id=p_organization_id
    and e.entity_type='security_shift'
    and e.entity_id=p_shift_id::text
    and e.event_type=p_event_type
    and q.status in ('pending','sending');
end;
$$;

revoke all on function public.cancel_security_qg_condition_notification(uuid,uuid,text) from public, anon, authenticated;

create or replace function public.push_notify_security_qg_shift_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_agent text;
  v_site text;
  v_timezone text;
  v_start_local text;
  v_end_local text;
  v_late_at timestamptz;
  v_forgotten_at timestamptz;
begin
  select trim(concat_ws(' ', a.first_name, a.last_name)), s.name, coalesce(s.timezone, 'Europe/Paris')
    into v_agent, v_site, v_timezone
  from public.security_agents a
  join public.security_sites s
    on s.organization_id = new.organization_id and s.id = new.site_id
  where a.organization_id = new.organization_id and a.id = new.agent_id;

  v_agent := coalesce(nullif(v_agent, ''), 'Agent');
  v_site := coalesce(nullif(v_site, ''), 'Site');
  v_start_local := to_char(new.starts_at at time zone coalesce(v_timezone, 'Europe/Paris'), 'DD/MM/YYYY à HH24:MI');
  v_end_local := to_char(new.ends_at at time zone coalesce(v_timezone, 'Europe/Paris'), 'DD/MM/YYYY à HH24:MI');
  v_late_at := greatest(now(), new.starts_at + interval '15 minutes');
  v_forgotten_at := greatest(now(), new.ends_at + interval '15 minutes');

  -- Toute modification structurelle recalcule les alertes futures avec la même clé
  -- de déduplication. Elles sont annulées dès que l'agent pointe.
  perform public.cancel_security_qg_condition_notification(new.organization_id, new.id, 'security_qg_late_clock_in');
  perform public.cancel_security_qg_condition_notification(new.organization_id, new.id, 'security_qg_forgotten_clock_out');

  if new.status <> 'canceled' and new.clocked_in_at is null and new.clocked_out_at is null then
    perform public.enqueue_org_notification_internal(
      new.organization_id, array['owner','admin','manager'], 'security_alerts', 'security_qg_late_clock_in',
      'Prise de poste en retard',
      v_agent || ' · ' || v_site || ' · prévue ' || v_start_local,
      '/dossiers-vacations?shift=' || new.id::text,
      'high', 'security_shift', new.id::text,
      jsonb_build_object('shift_id',new.id,'agent_id',new.agent_id,'site_id',new.site_id,'kind','late_clock_in'),
      'security-qg-late-clock-in:' || new.id::text,
      v_late_at,
      greatest(new.ends_at, v_late_at + interval '2 hours')
    );
  end if;

  if new.status <> 'canceled' and new.clocked_in_at is not null and new.clocked_out_at is null then
    perform public.enqueue_org_notification_internal(
      new.organization_id, array['owner','admin','manager'], 'security_alerts', 'security_qg_forgotten_clock_out',
      'Fin de poste non enregistrée',
      v_agent || ' · ' || v_site || ' · fin prévue ' || v_end_local,
      '/dossiers-vacations?shift=' || new.id::text,
      'high', 'security_shift', new.id::text,
      jsonb_build_object('shift_id',new.id,'agent_id',new.agent_id,'site_id',new.site_id,'kind','forgotten_clock_out'),
      'security-qg-forgotten-clock-out:' || new.id::text,
      v_forgotten_at,
      v_forgotten_at + interval '12 hours'
    );
  end if;

  if tg_op = 'UPDATE' then
    if old.clocked_in_at is null and new.clocked_in_at is not null then
      perform public.cancel_security_qg_condition_notification(new.organization_id, new.id, 'security_qg_late_clock_in');
      perform public.enqueue_org_notification_internal(
        new.organization_id, array['owner','admin','manager'], 'security_alerts', 'security_qg_clock_in',
        'Agent en poste',
        v_agent || ' · ' || v_site || ' · prise enregistrée à ' || to_char(new.clocked_in_at at time zone coalesce(v_timezone,'Europe/Paris'),'HH24:MI'),
        '/dossiers-vacations?shift=' || new.id::text,
        'normal', 'security_shift', new.id::text,
        jsonb_build_object('shift_id',new.id,'agent_id',new.agent_id,'site_id',new.site_id,'clocked_in_at',new.clocked_in_at),
        'security-qg-clock-in:' || new.id::text,
        now(), now() + interval '8 hours'
      );
    end if;

    if old.clocked_out_at is null and new.clocked_out_at is not null then
      perform public.cancel_security_qg_condition_notification(new.organization_id, new.id, 'security_qg_forgotten_clock_out');
      perform public.enqueue_org_notification_internal(
        new.organization_id, array['owner','admin','manager'], 'security_alerts', 'security_qg_clock_out',
        'Fin de poste enregistrée',
        v_agent || ' · ' || v_site || ' · sortie à ' || to_char(new.clocked_out_at at time zone coalesce(v_timezone,'Europe/Paris'),'HH24:MI'),
        '/dossiers-vacations?shift=' || new.id::text,
        'normal', 'security_shift', new.id::text,
        jsonb_build_object('shift_id',new.id,'agent_id',new.agent_id,'site_id',new.site_id,'clocked_out_at',new.clocked_out_at,'handover_note',new.handover_note),
        'security-qg-clock-out:' || new.id::text,
        now(), now() + interval '8 hours'
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.push_notify_security_qg_shift_state() from public, anon, authenticated;

drop trigger if exists push_notify_security_qg_shift_state on public.security_shifts;
create trigger push_notify_security_qg_shift_state
after insert or update of starts_at, ends_at, site_id, agent_id, status, clocked_in_at, clocked_out_at, handover_note
on public.security_shifts
for each row execute procedure public.push_notify_security_qg_shift_state();

-- Amorçage des alertes pour les vacations déjà existantes au moment de la migration.
-- L'UPDATE à valeur identique déclenche uniquement les recalculs dédupliqués.
update public.security_shifts
set starts_at = starts_at
where status <> 'canceled'
  and clocked_out_at is null
  and ends_at >= now() - interval '12 hours'
  and starts_at <= now() + interval '30 days';

-- -----------------------------------------------------------------------------
-- MCI urgente : uniquement les urgentes, jamais les RAS / événements normaux.
-- -----------------------------------------------------------------------------
create or replace function public.push_notify_security_qg_urgent_logbook()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_agent text;
  v_site text;
begin
  if new.severity <> 'urgent' or new.status <> 'open' then return new; end if;
  if tg_op = 'UPDATE' and old.severity = 'urgent' and old.status = 'open' then return new; end if;

  select trim(concat_ws(' ', a.first_name, a.last_name)), s.name
    into v_agent, v_site
  from public.security_agents a
  join public.security_sites s
    on s.organization_id = new.organization_id and s.id = new.site_id
  where a.organization_id = new.organization_id and a.id = new.agent_id;

  perform public.enqueue_org_notification_internal(
    new.organization_id, array['owner','admin','manager'], 'security_alerts', 'security_qg_urgent_logbook',
    'MCI URGENTE · ' || left(new.title, 120),
    coalesce(nullif(v_agent,''),'Agent') || ' · ' || coalesce(nullif(v_site,''),'Site') || coalesce(' · ' || nullif(left(trim(coalesce(new.details,'')),260),''),''),
    case when new.shift_id is null then '/main-courante' else '/main-courante?shift=' || new.shift_id::text end,
    'critical', 'security_logbook_entry', new.id::text,
    jsonb_build_object('entry_id',new.id,'shift_id',new.shift_id,'agent_id',new.agent_id,'site_id',new.site_id,'severity',new.severity),
    'security-qg-urgent-logbook:' || new.id::text,
    now(), now() + interval '24 hours'
  );
  return new;
end;
$$;

revoke all on function public.push_notify_security_qg_urgent_logbook() from public, anon, authenticated;

drop trigger if exists push_notify_security_qg_urgent_logbook on public.security_logbook_entries;
create trigger push_notify_security_qg_urgent_logbook
after insert or update of severity, status on public.security_logbook_entries
for each row execute procedure public.push_notify_security_qg_urgent_logbook();

-- Publication Realtime idempotente pour le cockpit QG.
do $$
begin
  begin alter publication supabase_realtime add table public.security_shifts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.security_logbook_entries; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.security_alerts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.security_emergency_alerts; exception when duplicate_object then null; end;
end $$;

-- Aligne la release front / base / PWA.
insert into public.platform_release_state(
  singleton, database_version, expected_frontend_version, expected_pwa_cache, installed_at, installed_by, notes
) values (
  true,
  '2.29.15',
  '2.29.15',
  'ncr-suite-shell-v2.29.15-security-qg-operational',
  now(),
  auth.uid(),
  'V2.29.15 : QG opérationnel temps réel, push prise/fin de poste, retard, fin oubliée, MCI urgente et déduplication stricte.'
)
on conflict (singleton) do update set
  database_version = excluded.database_version,
  expected_frontend_version = excluded.expected_frontend_version,
  expected_pwa_cache = excluded.expected_pwa_cache,
  installed_at = excluded.installed_at,
  installed_by = excluded.installed_by,
  notes = excluded.notes;

commit;
