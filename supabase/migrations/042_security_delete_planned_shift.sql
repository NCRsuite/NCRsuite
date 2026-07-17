-- NCR Suite V2.6.5 — Suppression sécurisée d'une planification Sécurité
-- À exécuter après 041_security_late_shift_end_fix.sql.

begin;

create or replace function public.delete_security_planned_shift(
  p_organization_id uuid,
  p_shift_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.security_shifts%rowtype;
  v_agent_name text;
  v_site_name text;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;

  select *
  into v_shift
  from public.security_shifts
  where organization_id = p_organization_id
    and id = p_shift_id
  for update;

  if not found then
    raise exception 'Planification introuvable.';
  end if;

  if v_shift.status <> 'planned' then
    raise exception 'Seule une mission encore planifiée peut être supprimée.';
  end if;

  if v_shift.starts_at <= now() then
    raise exception 'Une vacation déjà commencée ou passée ne peut pas être supprimée. Utilisez l’annulation ou la régularisation.';
  end if;

  if v_shift.clocked_in_at is not null
     or v_shift.clocked_out_at is not null
     or v_shift.completed_at is not null
     or v_shift.actual_minutes is not null
     or v_shift.final_invoice_id is not null
     or v_shift.billing_minutes_override is not null then
    raise exception 'Cette vacation contient déjà des données opérationnelles ou de facturation.';
  end if;

  if exists (
    select 1 from public.security_logbook_entries e
    where e.organization_id = p_organization_id and e.shift_id = p_shift_id
  ) or exists (
    select 1 from public.security_patrols p
    where p.organization_id = p_organization_id and p.shift_id = p_shift_id
  ) or exists (
    select 1 from public.security_agent_positions p
    where p.organization_id = p_organization_id and p.shift_id = p_shift_id
  ) or exists (
    select 1 from public.security_pti_sessions p
    where p.organization_id = p_organization_id and p.shift_id = p_shift_id
  ) or exists (
    select 1 from public.security_emergency_alerts a
    where a.organization_id = p_organization_id and a.shift_id = p_shift_id
  ) or exists (
    select 1 from public.security_agent_presence p
    where p.organization_id = p_organization_id and p.shift_id = p_shift_id
  ) or exists (
    select 1 from public.security_invoice_shift_items i
    where i.organization_id = p_organization_id and i.shift_id = p_shift_id
  ) then
    raise exception 'Cette vacation possède déjà une main courante, une ronde, du GPS, un PTI ou une donnée de facturation.';
  end if;

  select trim(concat_ws(' ', a.first_name, a.last_name))
  into v_agent_name
  from public.security_agents a
  where a.organization_id = p_organization_id and a.id = v_shift.agent_id;

  select s.name
  into v_site_name
  from public.security_sites s
  where s.organization_id = p_organization_id and s.id = v_shift.site_id;

  -- Les rappels et notifications encore en attente sont annulés avec la mission.
  update public.push_delivery_queue q
  set status = 'canceled',
      updated_at = now(),
      last_error = coalesce(q.last_error, 'Mission supprimée du planning')
  where q.event_id in (
    select e.id
    from public.notification_events e
    where e.organization_id = p_organization_id
      and e.entity_type = 'security_shift'
      and e.entity_id = p_shift_id::text
  )
    and q.status in ('pending','sending','failed');

  update public.notification_events
  set status = 'canceled'
  where organization_id = p_organization_id
    and entity_type = 'security_shift'
    and entity_id = p_shift_id::text
    and status = 'active';

  delete from public.security_shifts
  where organization_id = p_organization_id
    and id = p_shift_id;

  insert into public.audit_logs (
    organization_id, user_id, action, entity_type, entity_id, metadata
  ) values (
    p_organization_id,
    auth.uid(),
    'security.shift_deleted',
    'security_shift',
    p_shift_id::text,
    jsonb_build_object(
      'agent_id', v_shift.agent_id,
      'agent_name', v_agent_name,
      'site_id', v_shift.site_id,
      'site_name', v_site_name,
      'starts_at', v_shift.starts_at,
      'ends_at', v_shift.ends_at,
      'recurrence_group_id', v_shift.recurrence_group_id
    )
  );

  return p_shift_id;
end;
$$;

revoke all on function public.delete_security_planned_shift(uuid,uuid) from public;
grant execute on function public.delete_security_planned_shift(uuid,uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
