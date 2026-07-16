-- NCR Suite V2.5.6 — Sécurité Professionnelle
-- Géolocalisation, PTI / SOS, supervision temps réel et rôle Chef de poste.
-- À exécuter après 032_security_branding_final_invoices.sql.

begin;

create table if not exists public.security_agent_positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null,
  shift_id uuid not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision check (accuracy_m is null or accuracy_m between 0 and 100000),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint security_agent_positions_agent_fk foreign key (organization_id, agent_id)
    references public.security_agents(organization_id, id) on delete cascade,
  constraint security_agent_positions_shift_fk foreign key (organization_id, shift_id)
    references public.security_shifts(organization_id, id) on delete cascade
);

create table if not exists public.security_pti_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null,
  shift_id uuid not null,
  status text not null default 'active' check (status in ('active','alerted','closed')),
  check_interval_minutes integer not null default 30 check (check_interval_minutes between 5 and 240),
  activated_at timestamptz not null default now(),
  last_check_in_at timestamptz not null default now(),
  next_check_due_at timestamptz not null,
  triggered_at timestamptz,
  trigger_reason text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint security_pti_sessions_agent_fk foreign key (organization_id, agent_id)
    references public.security_agents(organization_id, id) on delete cascade,
  constraint security_pti_sessions_shift_fk foreign key (organization_id, shift_id)
    references public.security_shifts(organization_id, id) on delete cascade
);

create table if not exists public.security_emergency_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null,
  shift_id uuid not null,
  pti_session_id uuid,
  alert_type text not null check (alert_type in ('sos','pti_timeout')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  accuracy_m double precision check (accuracy_m is null or accuracy_m between 0 and 100000),
  message text,
  triggered_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint security_emergency_alerts_agent_fk foreign key (organization_id, agent_id)
    references public.security_agents(organization_id, id) on delete cascade,
  constraint security_emergency_alerts_shift_fk foreign key (organization_id, shift_id)
    references public.security_shifts(organization_id, id) on delete cascade,
  constraint security_emergency_alerts_pti_fk foreign key (organization_id, pti_session_id)
    references public.security_pti_sessions(organization_id, id) on delete set null
);

create index if not exists idx_security_agent_positions_latest
  on public.security_agent_positions(organization_id, agent_id, recorded_at desc);
create index if not exists idx_security_agent_positions_shift
  on public.security_agent_positions(organization_id, shift_id, recorded_at desc);
create index if not exists idx_security_pti_sessions_status
  on public.security_pti_sessions(organization_id, status, next_check_due_at);
create unique index if not exists idx_security_pti_one_open_per_agent
  on public.security_pti_sessions(organization_id, agent_id)
  where status in ('active','alerted');
create index if not exists idx_security_emergency_alerts_status
  on public.security_emergency_alerts(organization_id, status, triggered_at desc);
create unique index if not exists idx_security_emergency_one_timeout
  on public.security_emergency_alerts(organization_id, pti_session_id, alert_type)
  where alert_type = 'pti_timeout' and status in ('open','acknowledged');

create or replace function public.is_security_office_admin(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_org_role(p_organization_id, array['owner','admin']);
$$;

create or replace function public.security_validate_professional_shift(
  p_organization_id uuid,
  p_shift_id uuid,
  p_agent_id uuid
)
returns public.security_shifts
language plpgsql stable security definer set search_path = public as $$
declare v_shift public.security_shifts%rowtype;
begin
  select * into v_shift
  from public.security_shifts
  where organization_id = p_organization_id
    and id = p_shift_id
    and agent_id = p_agent_id
    and status <> 'canceled';

  if v_shift.id is null then
    raise exception 'Vacation introuvable ou non attribuée à cet agent.';
  end if;

  if now() < v_shift.starts_at - interval '2 hours'
     or now() > v_shift.ends_at + interval '4 hours' then
    raise exception 'Cette action est disponible uniquement autour de la vacation.';
  end if;

  return v_shift;
end;
$$;

create or replace function public.record_security_agent_position(
  p_organization_id uuid,
  p_shift_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_agent uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'security_geolocation') then
    raise exception 'La géolocalisation nécessite l’offre Professionnelle.';
  end if;
  v_agent := public.current_security_agent_id(p_organization_id);
  if v_agent is null then raise exception 'Aucune fiche agent n’est liée à ce compte.'; end if;
  perform public.security_validate_professional_shift(p_organization_id, p_shift_id, v_agent);
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Coordonnées GPS invalides.';
  end if;

  insert into public.security_agent_positions(
    organization_id, agent_id, shift_id, latitude, longitude, accuracy_m, recorded_at
  ) values (
    p_organization_id, v_agent, p_shift_id, p_latitude, p_longitude,
    case when p_accuracy_m is null then null else greatest(0, p_accuracy_m) end,
    now()
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.start_security_pti_session(
  p_organization_id uuid,
  p_shift_id uuid,
  p_check_interval_minutes integer default 30
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_agent uuid; v_id uuid; v_interval integer;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'security_pti_sos') then
    raise exception 'Le PTI / SOS nécessite l’offre Professionnelle.';
  end if;
  v_agent := public.current_security_agent_id(p_organization_id);
  if v_agent is null then raise exception 'Aucune fiche agent n’est liée à ce compte.'; end if;
  perform public.security_validate_professional_shift(p_organization_id, p_shift_id, v_agent);
  if exists (
    select 1 from public.security_pti_sessions
    where organization_id = p_organization_id and agent_id = v_agent and status in ('active','alerted')
  ) then raise exception 'Une protection PTI est déjà active.'; end if;

  v_interval := least(240, greatest(5, coalesce(p_check_interval_minutes, 30)));
  insert into public.security_pti_sessions(
    organization_id, agent_id, shift_id, status, check_interval_minutes,
    activated_at, last_check_in_at, next_check_due_at
  ) values (
    p_organization_id, v_agent, p_shift_id, 'active', v_interval,
    now(), now(), now() + make_interval(mins => v_interval)
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.security_pti_check_in(
  p_organization_id uuid,
  p_session_id uuid
)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_agent uuid; v_next timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  v_agent := public.current_security_agent_id(p_organization_id);
  update public.security_pti_sessions
  set status = 'active',
      last_check_in_at = now(),
      next_check_due_at = now() + make_interval(mins => check_interval_minutes),
      triggered_at = null,
      trigger_reason = null,
      updated_at = now()
  where organization_id = p_organization_id
    and id = p_session_id
    and agent_id = v_agent
    and status in ('active','alerted')
  returning next_check_due_at into v_next;
  if v_next is null then raise exception 'Session PTI introuvable ou déjà clôturée.'; end if;
  return v_next;
end;
$$;

create or replace function public.close_security_pti_session(
  p_organization_id uuid,
  p_session_id uuid
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_agent uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  v_agent := public.current_security_agent_id(p_organization_id);
  update public.security_pti_sessions
  set status = 'closed', closed_at = now(), updated_at = now()
  where organization_id = p_organization_id and id = p_session_id
    and agent_id = v_agent and status in ('active','alerted');
  if not found then raise exception 'Session PTI introuvable ou déjà clôturée.'; end if;
end;
$$;

create or replace function public.trigger_security_emergency(
  p_organization_id uuid,
  p_shift_id uuid,
  p_alert_type text default 'sos',
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_m double precision default null,
  p_message text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_agent uuid; v_pti uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'security_pti_sos') then
    raise exception 'Le PTI / SOS nécessite l’offre Professionnelle.';
  end if;
  if p_alert_type <> 'sos' then raise exception 'Type d’alerte invalide.'; end if;
  v_agent := public.current_security_agent_id(p_organization_id);
  if v_agent is null then raise exception 'Aucune fiche agent n’est liée à ce compte.'; end if;
  perform public.security_validate_professional_shift(p_organization_id, p_shift_id, v_agent);
  select id into v_pti from public.security_pti_sessions
  where organization_id = p_organization_id and agent_id = v_agent and shift_id = p_shift_id
    and status in ('active','alerted') order by activated_at desc limit 1;

  insert into public.security_emergency_alerts(
    organization_id, agent_id, shift_id, pti_session_id, alert_type, status,
    latitude, longitude, accuracy_m, message, triggered_at
  ) values (
    p_organization_id, v_agent, p_shift_id, v_pti, 'sos', 'open',
    p_latitude, p_longitude, p_accuracy_m, nullif(trim(coalesce(p_message,'')),''), now()
  ) returning id into v_id;

  if v_pti is not null then
    update public.security_pti_sessions
    set status = 'alerted', triggered_at = now(), trigger_reason = 'sos', updated_at = now()
    where organization_id = p_organization_id and id = v_pti;
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'security.sos_triggered','security_emergency_alert',v_id::text,
    jsonb_build_object('shift_id',p_shift_id,'agent_id',v_agent));
  return v_id;
end;
$$;

create or replace function public.refresh_security_pti_timeouts(p_organization_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer := 0; v_row record; v_alert_id uuid;
begin
  if auth.uid() is null or not public.is_security_manager(p_organization_id) then
    raise exception 'Accès insuffisant.';
  end if;
  if not public.organization_has_plan_feature(p_organization_id, 'security_pti_sos') then return 0; end if;

  for v_row in
    select s.id, s.agent_id, s.shift_id
    from public.security_pti_sessions s
    where s.organization_id = p_organization_id
      and s.status = 'active'
      and s.next_check_due_at < now()
    for update skip locked
  loop
    update public.security_pti_sessions
    set status='alerted', triggered_at=coalesce(triggered_at,now()), trigger_reason='pti_timeout', updated_at=now()
    where organization_id=p_organization_id and id=v_row.id;

    insert into public.security_emergency_alerts(
      organization_id,agent_id,shift_id,pti_session_id,alert_type,status,message,triggered_at
    ) values (
      p_organization_id,v_row.agent_id,v_row.shift_id,v_row.id,'pti_timeout','open',
      'Le délai de confirmation PTI est dépassé.',now()
    ) on conflict do nothing returning id into v_alert_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.acknowledge_security_emergency(
  p_organization_id uuid,
  p_alert_id uuid
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_security_manager(p_organization_id) then
    raise exception 'Accès insuffisant.';
  end if;
  update public.security_emergency_alerts
  set status='acknowledged', acknowledged_at=coalesce(acknowledged_at,now()),
      acknowledged_by=coalesce(acknowledged_by,auth.uid()), updated_at=now()
  where organization_id=p_organization_id and id=p_alert_id and status='open';
  if not found then raise exception 'Alerte introuvable ou déjà prise en charge.'; end if;
end;
$$;

create or replace function public.resolve_security_emergency(
  p_organization_id uuid,
  p_alert_id uuid,
  p_resolution_notes text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_pti uuid;
begin
  if auth.uid() is null or not public.is_security_manager(p_organization_id) then
    raise exception 'Accès insuffisant.';
  end if;
  update public.security_emergency_alerts
  set status='resolved', acknowledged_at=coalesce(acknowledged_at,now()),
      acknowledged_by=coalesce(acknowledged_by,auth.uid()), resolved_at=now(),
      resolved_by=auth.uid(), resolution_notes=nullif(trim(coalesce(p_resolution_notes,'')),''), updated_at=now()
  where organization_id=p_organization_id and id=p_alert_id and status in ('open','acknowledged')
  returning pti_session_id into v_pti;
  if not found then raise exception 'Alerte introuvable ou déjà résolue.'; end if;
  if v_pti is not null then
    update public.security_pti_sessions
    set status='closed', closed_at=coalesce(closed_at,now()), updated_at=now()
    where organization_id=p_organization_id and id=v_pti and status='alerted';
  end if;
end;
$$;

-- Invitation Agent / Chef de poste.
create or replace function public.create_security_team_invitation(
  p_organization_id uuid,
  p_email text,
  p_security_agent_id uuid,
  p_role text default 'employee'
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_used integer; v_email text := lower(trim(coalesce(p_email,''))); v_token text; v_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Seul le propriétaire ou un administrateur peut gérer les accès.';
  end if;
  if not public.organization_has_plan_feature(p_organization_id,'team_access') then
    raise exception 'Les accès agents nécessitent l’offre Essentielle.';
  end if;
  if p_role not in ('employee','manager') then raise exception 'Rôle Sécurité invalide.'; end if;
  if p_role='manager' and not public.organization_has_plan_feature(p_organization_id,'security_agent_roles') then
    raise exception 'Le rôle Chef de poste nécessite l’offre Professionnelle.';
  end if;
  if v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'Adresse e-mail invalide.'; end if;
  if not exists (
    select 1 from public.security_agents
    where organization_id=p_organization_id and id=p_security_agent_id and status='active' and linked_user_id is null
  ) then raise exception 'Agent introuvable, inactif ou déjà connecté.'; end if;
  if exists (
    select 1 from public.organization_invitations
    where organization_id=p_organization_id and security_agent_id=p_security_agent_id
      and status='pending' and expires_at>now()
  ) then raise exception 'Une invitation active existe déjà pour cet agent.'; end if;
  if exists (
    select 1 from public.organization_members m join auth.users u on u.id=m.user_id
    where m.organization_id=p_organization_id and lower(u.email::text)=v_email and m.status in ('active','disabled')
  ) then raise exception 'Cette adresse possède déjà un accès.'; end if;

  select public.security_team_member_limit(p_organization_id) into v_limit;
  select (
    select count(*) from public.security_agents a
    join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.linked_user_id and m.status='active'
    where a.organization_id=p_organization_id and a.linked_user_id is not null and a.status='active'
  ) + (
    select count(*) from public.organization_invitations
    where organization_id=p_organization_id and security_agent_id is not null and status='pending' and expires_at>now()
  ) into v_used;
  if v_used>=v_limit then raise exception 'La limite de % agent(s) connecté(s) est atteinte.',v_limit; end if;

  v_token := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.organization_invitations(
    organization_id,email,role,staff_id,security_agent_id,token_hash,expires_at,invited_by
  ) values (
    p_organization_id,v_email,p_role,null,p_security_agent_id,extensions.digest(v_token,'sha256'),now()+interval '7 days',auth.uid()
  ) returning id into v_id;
  perform public.enqueue_team_invitation_email(v_id,v_token,false);
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'security.agent_invited','security_agent',p_security_agent_id::text,
    jsonb_build_object('email',v_email,'role',p_role));
  return v_id;
end;
$$;

create or replace function public.set_security_team_member_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_current text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;
  if p_role not in ('employee','manager') then raise exception 'Rôle Sécurité invalide.'; end if;
  if p_role='manager' and not public.organization_has_plan_feature(p_organization_id,'security_agent_roles') then
    raise exception 'Le rôle Chef de poste nécessite l’offre Professionnelle.';
  end if;
  select role into v_current from public.organization_members
  where organization_id=p_organization_id and user_id=p_user_id;
  if v_current is null then raise exception 'Utilisateur introuvable.'; end if;
  if v_current='owner' then raise exception 'Le rôle du propriétaire ne peut pas être modifié.'; end if;
  if not exists(select 1 from public.security_agents where organization_id=p_organization_id and linked_user_id=p_user_id) then
    raise exception 'Aucune fiche agent n’est liée à cet accès.';
  end if;
  update public.organization_members set role=p_role
  where organization_id=p_organization_id and user_id=p_user_id;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'security.agent_role_updated','organization_member',p_user_id::text,
    jsonb_build_object('role',p_role));
end;
$$;

-- Horodatages.
drop trigger if exists set_security_pti_sessions_updated_at on public.security_pti_sessions;
create trigger set_security_pti_sessions_updated_at before update on public.security_pti_sessions
for each row execute procedure public.set_updated_at();
drop trigger if exists set_security_emergency_alerts_updated_at on public.security_emergency_alerts;
create trigger set_security_emergency_alerts_updated_at before update on public.security_emergency_alerts
for each row execute procedure public.set_updated_at();

alter table public.security_agent_positions enable row level security;
alter table public.security_pti_sessions enable row level security;
alter table public.security_emergency_alerts enable row level security;

drop policy if exists security_agent_positions_select on public.security_agent_positions;
create policy security_agent_positions_select on public.security_agent_positions for select using (
  public.is_security_manager(organization_id) or agent_id=public.current_security_agent_id(organization_id)
);
drop policy if exists security_pti_sessions_select on public.security_pti_sessions;
create policy security_pti_sessions_select on public.security_pti_sessions for select using (
  public.is_security_manager(organization_id) or agent_id=public.current_security_agent_id(organization_id)
);
drop policy if exists security_emergency_alerts_select on public.security_emergency_alerts;
create policy security_emergency_alerts_select on public.security_emergency_alerts for select using (
  public.is_security_manager(organization_id) or agent_id=public.current_security_agent_id(organization_id)
);

-- Un Chef de poste supervise l’opérationnel mais n’accède pas aux données financières.
drop policy if exists security_invoices_member_select on public.security_invoices;
create policy security_invoices_member_select on public.security_invoices for select using (public.is_security_office_admin(organization_id));
drop policy if exists security_invoice_lines_member_select on public.security_invoice_lines;
create policy security_invoice_lines_member_select on public.security_invoice_lines for select using (public.is_security_office_admin(organization_id));
drop policy if exists security_invoice_shift_items_manager_select on public.security_invoice_shift_items;
drop policy if exists security_invoice_shift_items_member_select on public.security_invoice_shift_items;
create policy security_invoice_shift_items_member_select on public.security_invoice_shift_items for select using (public.is_security_office_admin(organization_id));

grant select on public.security_agent_positions to authenticated;
grant select on public.security_pti_sessions to authenticated;
grant select on public.security_emergency_alerts to authenticated;

revoke all on function public.is_security_office_admin(uuid) from public;
revoke all on function public.security_validate_professional_shift(uuid,uuid,uuid) from public;
revoke all on function public.record_security_agent_position(uuid,uuid,double precision,double precision,double precision) from public;
revoke all on function public.start_security_pti_session(uuid,uuid,integer) from public;
revoke all on function public.security_pti_check_in(uuid,uuid) from public;
revoke all on function public.close_security_pti_session(uuid,uuid) from public;
revoke all on function public.trigger_security_emergency(uuid,uuid,text,double precision,double precision,double precision,text) from public;
revoke all on function public.refresh_security_pti_timeouts(uuid) from public;
revoke all on function public.acknowledge_security_emergency(uuid,uuid) from public;
revoke all on function public.resolve_security_emergency(uuid,uuid,text) from public;
revoke all on function public.create_security_team_invitation(uuid,text,uuid,text) from public;
revoke all on function public.set_security_team_member_role(uuid,uuid,text) from public;

grant execute on function public.is_security_office_admin(uuid) to authenticated;
grant execute on function public.record_security_agent_position(uuid,uuid,double precision,double precision,double precision) to authenticated;
grant execute on function public.start_security_pti_session(uuid,uuid,integer) to authenticated;
grant execute on function public.security_pti_check_in(uuid,uuid) to authenticated;
grant execute on function public.close_security_pti_session(uuid,uuid) to authenticated;
grant execute on function public.trigger_security_emergency(uuid,uuid,text,double precision,double precision,double precision,text) to authenticated;
grant execute on function public.refresh_security_pti_timeouts(uuid) to authenticated;
grant execute on function public.acknowledge_security_emergency(uuid,uuid) to authenticated;
grant execute on function public.resolve_security_emergency(uuid,uuid,text) to authenticated;
grant execute on function public.create_security_team_invitation(uuid,text,uuid,text) to authenticated;
grant execute on function public.set_security_team_member_role(uuid,uuid,text) to authenticated;

-- Realtime : ajout idempotent à la publication Supabase.
do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables where pubname='supabase_realtime'
        and schemaname='public' and tablename='security_agent_positions'
    ) then alter publication supabase_realtime add table public.security_agent_positions; end if;
    if not exists (
      select 1 from pg_publication_tables where pubname='supabase_realtime'
        and schemaname='public' and tablename='security_pti_sessions'
    ) then alter publication supabase_realtime add table public.security_pti_sessions; end if;
    if not exists (
      select 1 from pg_publication_tables where pubname='supabase_realtime'
        and schemaname='public' and tablename='security_emergency_alerts'
    ) then alter publication supabase_realtime add table public.security_emergency_alerts; end if;
  end if;
end $$;


-- Catalogue modules Professionnels et activation selon la formule.
insert into public.module_catalog(module_key,display_name,description,category,icon_key,compatible_business_types,core_module,default_enabled,active,sort_order)
values
 ('security_geolocation','Géolocalisation','Dernières positions GPS transmises pendant les vacations.','securite','map','{securite}',false,false,true,610),
 ('security_pti_sos','PTI / SOS','Protection du travailleur isolé, confirmations et SOS.','securite','shield','{securite}',false,false,true,620),
 ('security_realtime_supervision','Supervision temps réel','Vacations, positions, PTI et urgences sur un seul écran.','securite','activity','{securite}',false,false,true,630),
 ('security_agent_roles','Rôles Agent et Chef de poste','Permissions opérationnelles renforcées pour les Chefs de poste.','securite','users','{securite}',false,false,true,640)
on conflict(module_key) do update set display_name=excluded.display_name,description=excluded.description,category=excluded.category,icon_key=excluded.icon_key,
 compatible_business_types=excluded.compatible_business_types,active=true,updated_at=now();

with professional_modules(module_key,feature_key) as (
  values
    ('security_geolocation','security_geolocation'),
    ('security_pti_sos','security_pti_sos'),
    ('security_realtime_supervision','security_realtime_supervision'),
    ('security_agent_roles','security_agent_roles')
)
insert into public.organization_modules(organization_id,module_key,enabled)
select o.id, pm.module_key, public.organization_has_plan_feature(o.id,pm.feature_key)
from public.organizations o cross join professional_modules pm
where o.business_type='securite'
  and not (o.plan='metier' and coalesce(o.metier_modules_configured,false))
on conflict(organization_id,module_key) do update set enabled=excluded.enabled,updated_at=now();

notify pgrst, 'reload schema';
commit;
