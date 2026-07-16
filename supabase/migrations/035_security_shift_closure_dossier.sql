-- NCR Suite V2.5.8 — Clôture et dossier complet de vacation
-- À exécuter après 034_security_web_shift_presence.sql.

begin;

alter table public.security_shifts
  add column if not exists dossier_status text not null default 'open'
    check (dossier_status in ('open','closed','archived')),
  add column if not exists dossier_closed_at timestamptz,
  add column if not exists dossier_closed_by uuid references auth.users(id) on delete set null,
  add column if not exists dossier_archived_at timestamptz,
  add column if not exists dossier_archived_by uuid references auth.users(id) on delete set null,
  add column if not exists dossier_reopened_at timestamptz,
  add column if not exists dossier_reopened_by uuid references auth.users(id) on delete set null,
  add column if not exists dossier_note text;

alter table public.security_patrols
  add column if not exists shift_id uuid;

-- La contrainte est ajoutée de façon idempotente.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'security_patrols_shift_fk'
  ) then
    alter table public.security_patrols
      add constraint security_patrols_shift_fk
      foreign key (organization_id, shift_id)
      references public.security_shifts(organization_id, id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_security_shifts_dossier_status
  on public.security_shifts(organization_id, dossier_status, ends_at desc);
create index if not exists idx_security_patrols_shift
  on public.security_patrols(organization_id, shift_id, started_at desc);

-- Rattachement prudent des anciennes rondes à la vacation correspondante.
update public.security_patrols p
set shift_id = (
  select s.id
  from public.security_shifts s
  where s.organization_id = p.organization_id
    and s.site_id = p.site_id
    and s.agent_id = p.agent_id
    and p.started_at between s.starts_at - interval '2 hours' and s.ends_at + interval '4 hours'
    and s.status <> 'canceled'
  order by abs(extract(epoch from (p.started_at - s.starts_at)))
  limit 1
)
where p.shift_id is null
  and exists (
    select 1
    from public.security_shifts s
    where s.organization_id = p.organization_id
      and s.site_id = p.site_id
      and s.agent_id = p.agent_id
      and p.started_at between s.starts_at - interval '2 hours' and s.ends_at + interval '4 hours'
      and s.status <> 'canceled'
  );

create or replace function public.security_shift_dossier_readiness(
  p_organization_id uuid,
  p_shift_id uuid
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_shift public.security_shifts%rowtype;
  v_requires_logbook boolean := false;
  v_requires_patrol boolean := false;
  v_has_start boolean := false;
  v_has_end boolean := false;
  v_logbook_count integer := 0;
  v_completed_patrols integer := 0;
  v_patrol_points integer := 0;
  v_active_pti integer := 0;
  v_open_emergencies integer := 0;
  v_active_presence integer := 0;
  v_reasons text[] := array[]::text[];
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.is_security_manager(p_organization_id) then raise exception 'Accès refusé.'; end if;

  select * into v_shift
  from public.security_shifts
  where organization_id = p_organization_id and id = p_shift_id;

  if v_shift.id is null then raise exception 'Vacation introuvable.'; end if;

  v_requires_logbook := public.organization_has_plan_feature(p_organization_id, 'security_smart_logbook');
  v_requires_patrol := public.organization_has_plan_feature(p_organization_id, 'security_qr_patrols');

  select count(*)::integer,
         bool_or(category = 'prise_poste'),
         bool_or(category = 'fin_poste')
    into v_logbook_count, v_has_start, v_has_end
  from public.security_logbook_entries
  where organization_id = p_organization_id and shift_id = p_shift_id;

  select count(*)::integer into v_patrol_points
  from public.security_patrol_points
  where organization_id = p_organization_id
    and site_id = v_shift.site_id
    and status = 'active';

  select count(*)::integer into v_completed_patrols
  from public.security_patrols
  where organization_id = p_organization_id
    and shift_id = p_shift_id
    and status = 'completed';

  select count(*)::integer into v_active_pti
  from public.security_pti_sessions
  where organization_id = p_organization_id
    and shift_id = p_shift_id
    and status in ('active','alerted');

  select count(*)::integer into v_open_emergencies
  from public.security_emergency_alerts
  where organization_id = p_organization_id
    and shift_id = p_shift_id
    and status in ('open','acknowledged');

  select count(*)::integer into v_active_presence
  from public.security_agent_presence
  where organization_id = p_organization_id
    and shift_id = p_shift_id
    and status <> 'stopped';

  if v_shift.status = 'canceled' then v_reasons := array_append(v_reasons, 'La vacation est annulée.'); end if;
  if v_shift.ends_at > now() then v_reasons := array_append(v_reasons, 'La vacation n’est pas encore terminée.'); end if;
  if v_shift.status <> 'completed' then v_reasons := array_append(v_reasons, 'La vacation doit être marquée comme réalisée.'); end if;
  if coalesce(v_shift.actual_minutes, 0) <= 0 then v_reasons := array_append(v_reasons, 'La durée réellement réalisée doit être validée.'); end if;
  if v_requires_logbook and not coalesce(v_has_start, false) then v_reasons := array_append(v_reasons, 'La prise de poste manque dans la main courante.'); end if;
  if v_requires_logbook and not coalesce(v_has_end, false) then v_reasons := array_append(v_reasons, 'La fin de poste manque dans la main courante.'); end if;
  if v_requires_patrol and v_patrol_points > 0 and v_completed_patrols = 0 then v_reasons := array_append(v_reasons, 'Aucune ronde QR complète n’est rattachée à cette vacation.'); end if;
  if v_active_pti > 0 then v_reasons := array_append(v_reasons, 'Une session PTI est encore active ou en alerte.'); end if;
  if v_open_emergencies > 0 then v_reasons := array_append(v_reasons, 'Une alerte SOS ou PTI reste à résoudre.'); end if;
  if v_active_presence > 0 then v_reasons := array_append(v_reasons, 'Le mode vacation est encore actif sur le téléphone de l’agent.'); end if;

  return jsonb_build_object(
    'ready', coalesce(array_length(v_reasons, 1), 0) = 0,
    'reasons', to_jsonb(v_reasons),
    'logbook_count', v_logbook_count,
    'has_start', coalesce(v_has_start, false),
    'has_end', coalesce(v_has_end, false),
    'patrol_points', v_patrol_points,
    'completed_patrols', v_completed_patrols,
    'active_pti', v_active_pti,
    'open_emergencies', v_open_emergencies,
    'active_presence', v_active_presence
  );
end;
$$;

create or replace function public.close_security_shift_dossier(
  p_organization_id uuid,
  p_shift_id uuid,
  p_note text default null
)
returns public.security_shifts
language plpgsql security definer set search_path = public as $$
declare
  v_readiness jsonb;
  v_row public.security_shifts%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.is_security_manager(p_organization_id) then raise exception 'Seul un responsable peut clôturer une vacation.'; end if;

  v_readiness := public.security_shift_dossier_readiness(p_organization_id, p_shift_id);
  if not coalesce((v_readiness->>'ready')::boolean, false) then
    raise exception 'Clôture impossible : %', array_to_string(array(select jsonb_array_elements_text(v_readiness->'reasons')), ' ');
  end if;

  update public.security_shifts
  set dossier_status = 'closed',
      dossier_closed_at = now(),
      dossier_closed_by = auth.uid(),
      dossier_archived_at = null,
      dossier_archived_by = null,
      dossier_note = nullif(trim(coalesce(p_note, '')), ''),
      updated_at = now()
  where organization_id = p_organization_id and id = p_shift_id
  returning * into v_row;

  if v_row.id is null then raise exception 'Vacation introuvable.'; end if;
  return v_row;
end;
$$;

create or replace function public.archive_security_shift_dossier(
  p_organization_id uuid,
  p_shift_id uuid
)
returns public.security_shifts
language plpgsql security definer set search_path = public as $$
declare v_row public.security_shifts%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.is_security_office_admin(p_organization_id) then raise exception 'Seuls le propriétaire et les administrateurs peuvent archiver un dossier.'; end if;

  update public.security_shifts
  set dossier_status = 'archived', dossier_archived_at = now(), dossier_archived_by = auth.uid(), updated_at = now()
  where organization_id = p_organization_id and id = p_shift_id and dossier_status = 'closed'
  returning * into v_row;

  if v_row.id is null then raise exception 'Le dossier doit être clôturé avant archivage.'; end if;
  return v_row;
end;
$$;

create or replace function public.reopen_security_shift_dossier(
  p_organization_id uuid,
  p_shift_id uuid,
  p_note text default null
)
returns public.security_shifts
language plpgsql security definer set search_path = public as $$
declare v_row public.security_shifts%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.is_security_office_admin(p_organization_id) then raise exception 'Seuls le propriétaire et les administrateurs peuvent rouvrir un dossier.'; end if;

  update public.security_shifts
  set dossier_status = 'open',
      dossier_reopened_at = now(),
      dossier_reopened_by = auth.uid(),
      dossier_archived_at = null,
      dossier_archived_by = null,
      dossier_note = nullif(trim(coalesce(p_note, '')), ''),
      updated_at = now()
  where organization_id = p_organization_id and id = p_shift_id and dossier_status in ('closed','archived')
  returning * into v_row;

  if v_row.id is null then raise exception 'Dossier introuvable ou déjà ouvert.'; end if;
  return v_row;
end;
$$;

create or replace function public.protect_closed_security_shift()
returns trigger
language plpgsql set search_path = public as $$
begin
  if old.dossier_status in ('closed','archived') and (
    new.site_id is distinct from old.site_id
    or new.agent_id is distinct from old.agent_id
    or new.starts_at is distinct from old.starts_at
    or new.ends_at is distinct from old.ends_at
    or new.break_minutes is distinct from old.break_minutes
    or new.status is distinct from old.status
    or new.actual_minutes is distinct from old.actual_minutes
    or new.actual_validation_note is distinct from old.actual_validation_note
  ) then
    raise exception 'Cette vacation est clôturée. Rouvrez son dossier avant de modifier ses données opérationnelles.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_closed_security_shift_trigger on public.security_shifts;
create trigger protect_closed_security_shift_trigger
before update on public.security_shifts
for each row execute procedure public.protect_closed_security_shift();

create or replace function public.prevent_closed_shift_child_change()
returns trigger
language plpgsql set search_path = public as $$
declare v_shift_id uuid;
begin
  v_shift_id := case when tg_op = 'DELETE' then old.shift_id else new.shift_id end;
  if v_shift_id is not null and exists (
    select 1 from public.security_shifts
    where id = v_shift_id and dossier_status in ('closed','archived')
  ) then
    raise exception 'Le dossier de cette vacation est clôturé. Rouvrez-le avant toute modification.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Verrouillage des données directement rattachées à une vacation.
do $$
declare t text;
begin
  foreach t in array array[
    'security_logbook_entries',
    'security_agent_positions',
    'security_pti_sessions',
    'security_emergency_alerts',
    'security_agent_presence'
  ] loop
    execute format('drop trigger if exists prevent_closed_shift_child_%I on public.%I', t, t);
    execute format('create trigger prevent_closed_shift_child_%I before insert or update or delete on public.%I for each row execute procedure public.prevent_closed_shift_child_change()', t, t);
  end loop;
end $$;

-- Une ronde doit désormais être rattachée automatiquement à la vacation active.
create or replace function public.start_security_patrol(p_organization_id uuid, p_site_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_agent uuid;
  v_shift public.security_shifts%rowtype;
  v_patrol_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.organization_has_plan_feature(p_organization_id,'security_qr_patrols') then raise exception 'Les rondes QR nécessitent l’offre Essentielle.'; end if;
  v_agent := public.current_security_agent_id(p_organization_id);
  if v_agent is null then raise exception 'Aucune fiche agent n’est liée à ce compte.'; end if;

  select * into v_shift
  from public.security_shifts
  where organization_id = p_organization_id
    and site_id = p_site_id
    and agent_id = v_agent
    and status <> 'canceled'
    and now() between starts_at - interval '2 hours' and ends_at + interval '4 hours'
    and dossier_status = 'open'
  order by abs(extract(epoch from (now() - starts_at)))
  limit 1;

  if v_shift.id is null then raise exception 'Aucune vacation ouverte ne correspond à ce site et à cet agent.'; end if;

  if exists (
    select 1 from public.security_patrols
    where organization_id = p_organization_id and agent_id = v_agent and status = 'in_progress'
  ) then raise exception 'Une ronde est déjà en cours.'; end if;

  insert into public.security_patrols(organization_id, site_id, agent_id, shift_id, created_by)
  values (p_organization_id, p_site_id, v_agent, v_shift.id, auth.uid())
  returning id into v_patrol_id;
  return v_patrol_id;
end;
$$;

revoke all on function public.security_shift_dossier_readiness(uuid,uuid) from public;
revoke all on function public.close_security_shift_dossier(uuid,uuid,text) from public;
revoke all on function public.archive_security_shift_dossier(uuid,uuid) from public;
revoke all on function public.reopen_security_shift_dossier(uuid,uuid,text) from public;
grant execute on function public.security_shift_dossier_readiness(uuid,uuid) to authenticated;
grant execute on function public.close_security_shift_dossier(uuid,uuid,text) to authenticated;
grant execute on function public.archive_security_shift_dossier(uuid,uuid) to authenticated;
grant execute on function public.reopen_security_shift_dossier(uuid,uuid,text) to authenticated;

notify pgrst, 'reload schema';
commit;
