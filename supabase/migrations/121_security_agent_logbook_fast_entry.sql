-- NCR Suite - Hotfix terrain Sécurité
-- Ajout direct à la main courante, écriture agent fiabilisée et rondes limitées aux vacations réellement en poste.

begin;

create or replace function public.create_security_logbook_entry(
  p_organization_id uuid,
  p_shift_id uuid,
  p_category text,
  p_severity text,
  p_title text,
  p_details text default null,
  p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_shift public.security_shifts%rowtype;
  v_agent uuid;
  v_manager boolean;
  v_entry_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_category text := lower(trim(coalesce(p_category, '')));
  v_severity text := lower(trim(coalesce(p_severity, 'info')));
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not public.organization_has_plan_feature(p_organization_id, 'security_smart_logbook') then
    raise exception 'La main courante n’est pas activée pour cet espace.';
  end if;

  if v_category not in ('prise_poste','fin_poste','ronde','anomalie','incident','visiteur','livraison','appel','consigne','autre') then
    raise exception 'Type d’événement invalide.';
  end if;
  if v_severity not in ('info','attention','urgent') then
    raise exception 'Niveau de gravité invalide.';
  end if;
  if char_length(v_title) < 2 or char_length(v_title) > 180 then
    raise exception 'Le titre doit contenir entre 2 et 180 caractères.';
  end if;

  v_manager := public.is_security_manager(p_organization_id);
  v_agent := public.current_security_agent_id(p_organization_id);

  select * into v_shift
  from public.security_shifts
  where organization_id = p_organization_id
    and id = p_shift_id
  for update;

  if v_shift.id is null then
    raise exception 'Vacation introuvable.';
  end if;
  if v_shift.status = 'canceled' then
    raise exception 'Cette vacation est annulée.';
  end if;
  if v_shift.logbook_status = 'closed' then
    raise exception 'La main courante de cette vacation est clôturée.';
  end if;
  if v_shift.dossier_status in ('closed','archived') then
    raise exception 'Le dossier de cette vacation est déjà clôturé.';
  end if;

  if not v_manager then
    if v_agent is null or v_shift.agent_id <> v_agent then
      raise exception 'Cette vacation ne vous est pas attribuée.';
    end if;
    if v_shift.clocked_in_at is null then
      raise exception 'Prends d’abord ton poste avant d’ajouter un événement.';
    end if;
    if v_shift.clocked_out_at is not null or v_shift.status = 'completed' then
      raise exception 'Cette vacation est déjà terminée.';
    end if;
  end if;

  insert into public.security_logbook_entries(
    organization_id,
    shift_id,
    site_id,
    agent_id,
    occurred_at,
    category,
    severity,
    title,
    details,
    status,
    created_by
  ) values (
    p_organization_id,
    v_shift.id,
    v_shift.site_id,
    v_shift.agent_id,
    coalesce(p_occurred_at, now()),
    v_category,
    v_severity,
    v_title,
    nullif(trim(coalesce(p_details, '')), ''),
    'open',
    auth.uid()
  )
  returning id into v_entry_id;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'security_logbook_entry_created',
    'security_logbook_entry',
    v_entry_id,
    jsonb_build_object(
      'shift_id', v_shift.id,
      'site_id', v_shift.site_id,
      'agent_id', v_shift.agent_id,
      'category', v_category,
      'severity', v_severity,
      'source', case when v_manager then 'qg' else 'agent' end
    )
  );

  return v_entry_id;
end;
$$;

revoke all on function public.create_security_logbook_entry(uuid,uuid,text,text,text,text,timestamptz) from public, anon;
grant execute on function public.create_security_logbook_entry(uuid,uuid,text,text,text,text,timestamptz) to authenticated;

-- Un agent ne peut plus alimenter directement une main courante avant sa prise de poste.
-- Le QG conserve ses droits complets. Les événements système prise/fin de poste passent
-- par les RPC SECURITY DEFINER existantes et ne sont donc pas bloqués par cette policy.
drop policy if exists security_logbook_member_insert on public.security_logbook_entries;
create policy security_logbook_member_insert
on public.security_logbook_entries for insert
with check (
  public.is_security_manager(organization_id)
  or (
    agent_id = public.current_security_agent_id(organization_id)
    and shift_id is not null
    and exists (
      select 1
      from public.security_shifts s
      where s.organization_id = security_logbook_entries.organization_id
        and s.id = security_logbook_entries.shift_id
        and s.agent_id = public.current_security_agent_id(s.organization_id)
        and s.status not in ('completed','canceled')
        and s.clocked_in_at is not null
        and s.clocked_out_at is null
        and s.logbook_status = 'open'
        and s.dossier_status = 'open'
    )
  )
);

-- Une ronde n’est désormais possible que pendant une vacation réellement prise.
create or replace function public.start_security_patrol(p_organization_id uuid, p_site_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_agent uuid;
  v_shift public.security_shifts%rowtype;
  v_patrol_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.organization_has_plan_feature(p_organization_id,'security_qr_patrols') then
    raise exception 'Les rondes QR nécessitent l’offre Essentielle.';
  end if;

  v_agent := public.current_security_agent_id(p_organization_id);
  if v_agent is null then raise exception 'Aucune fiche agent n’est liée à ce compte.'; end if;

  select * into v_shift
  from public.security_shifts
  where organization_id = p_organization_id
    and site_id = p_site_id
    and agent_id = v_agent
    and status = 'in_progress'
    and clocked_in_at is not null
    and clocked_out_at is null
    and logbook_status = 'open'
    and dossier_status = 'open'
    and now() between starts_at - interval '2 hours' and ends_at + interval '4 hours'
  order by abs(extract(epoch from (now() - starts_at)))
  limit 1;

  if v_shift.id is null then
    raise exception 'Prends d’abord ton poste sur ce site avant de démarrer une ronde.';
  end if;

  if exists (
    select 1 from public.security_patrols
    where organization_id = p_organization_id
      and agent_id = v_agent
      and status = 'in_progress'
  ) then
    raise exception 'Une ronde est déjà en cours.';
  end if;

  insert into public.security_patrols(organization_id, site_id, agent_id, shift_id, created_by)
  values (p_organization_id, p_site_id, v_agent, v_shift.id, auth.uid())
  returning id into v_patrol_id;

  return v_patrol_id;
end;
$$;

revoke all on function public.start_security_patrol(uuid,uuid) from public, anon;
grant execute on function public.start_security_patrol(uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
