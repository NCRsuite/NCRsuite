-- NCR Suite V2.5.7 — Fiabilité terrain PWA
-- Mode vacation, présence applicative, reprise réseau et positions GPS différées.
-- À exécuter après 033_security_professional_supervision.sql.

begin;

create table if not exists public.security_agent_presence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null,
  shift_id uuid not null,
  status text not null default 'active' check (status in ('active','paused','stopped')),
  network_status text not null default 'online' check (network_status in ('online','offline')),
  app_state text not null default 'visible' check (app_state in ('visible','hidden')),
  tracking_active boolean not null default false,
  wake_lock_active boolean not null default false,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  stopped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, agent_id, shift_id),
  unique (organization_id, id),
  constraint security_agent_presence_agent_fk foreign key (organization_id, agent_id)
    references public.security_agents(organization_id, id) on delete cascade,
  constraint security_agent_presence_shift_fk foreign key (organization_id, shift_id)
    references public.security_shifts(organization_id, id) on delete cascade
);

create index if not exists idx_security_agent_presence_last_seen
  on public.security_agent_presence(organization_id, last_seen_at desc);
create index if not exists idx_security_agent_presence_shift
  on public.security_agent_presence(organization_id, shift_id);

create or replace function public.update_security_agent_presence(
  p_organization_id uuid,
  p_shift_id uuid,
  p_status text default 'active',
  p_network_status text default 'online',
  p_app_state text default 'visible',
  p_tracking_active boolean default false,
  p_wake_lock_active boolean default false
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_agent uuid;
  v_id uuid;
  v_status text := lower(trim(coalesce(p_status, 'active')));
  v_network text := lower(trim(coalesce(p_network_status, 'online')));
  v_app_state text := lower(trim(coalesce(p_app_state, 'visible')));
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'security_geolocation') then
    raise exception 'Le mode vacation nécessite l’offre Professionnelle.';
  end if;
  v_agent := public.current_security_agent_id(p_organization_id);
  if v_agent is null then raise exception 'Aucune fiche agent n’est liée à ce compte.'; end if;
  perform public.security_validate_professional_shift(p_organization_id, p_shift_id, v_agent);

  if v_status not in ('active','paused','stopped') then raise exception 'Statut de présence invalide.'; end if;
  if v_network not in ('online','offline') then raise exception 'État réseau invalide.'; end if;
  if v_app_state not in ('visible','hidden') then raise exception 'État de l’application invalide.'; end if;

  insert into public.security_agent_presence(
    organization_id, agent_id, shift_id, status, network_status, app_state,
    tracking_active, wake_lock_active, started_at, last_seen_at, stopped_at
  ) values (
    p_organization_id, v_agent, p_shift_id, v_status, v_network, v_app_state,
    coalesce(p_tracking_active, false), coalesce(p_wake_lock_active, false),
    now(), now(), case when v_status = 'stopped' then now() else null end
  )
  on conflict (organization_id, agent_id, shift_id) do update set
    status = excluded.status,
    network_status = excluded.network_status,
    app_state = excluded.app_state,
    tracking_active = excluded.tracking_active,
    wake_lock_active = excluded.wake_lock_active,
    started_at = case
      when security_agent_presence.status = 'stopped' and excluded.status <> 'stopped' then now()
      else security_agent_presence.started_at
    end,
    last_seen_at = now(),
    stopped_at = case when excluded.status = 'stopped' then now() else null end,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.record_security_agent_position_at(
  p_organization_id uuid,
  p_shift_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision default null,
  p_recorded_at timestamptz default now()
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_agent uuid;
  v_id uuid;
  v_shift public.security_shifts%rowtype;
  v_recorded_at timestamptz := coalesce(p_recorded_at, now());
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'security_geolocation') then
    raise exception 'La géolocalisation nécessite l’offre Professionnelle.';
  end if;
  v_agent := public.current_security_agent_id(p_organization_id);
  if v_agent is null then raise exception 'Aucune fiche agent n’est liée à ce compte.'; end if;
  select * into v_shift
  from public.security_shifts
  where organization_id = p_organization_id
    and id = p_shift_id
    and agent_id = v_agent
    and status <> 'canceled';
  if v_shift.id is null then raise exception 'Vacation introuvable ou non attribuée à cet agent.'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Coordonnées GPS invalides.';
  end if;
  if v_recorded_at < now() - interval '24 hours' or v_recorded_at > now() + interval '5 minutes' then
    raise exception 'Horodatage GPS invalide.';
  end if;
  if v_recorded_at < v_shift.starts_at - interval '2 hours'
     or v_recorded_at > v_shift.ends_at + interval '4 hours' then
    raise exception 'La position ne correspond pas à la période de cette vacation.';
  end if;

  insert into public.security_agent_positions(
    organization_id, agent_id, shift_id, latitude, longitude, accuracy_m, recorded_at
  ) values (
    p_organization_id, v_agent, p_shift_id, p_latitude, p_longitude,
    case when p_accuracy_m is null then null else greatest(0, p_accuracy_m) end,
    v_recorded_at
  ) returning id into v_id;

  return v_id;
end;
$$;

-- Horodatage automatique.
drop trigger if exists set_security_agent_presence_updated_at on public.security_agent_presence;
create trigger set_security_agent_presence_updated_at before update on public.security_agent_presence
for each row execute procedure public.set_updated_at();

alter table public.security_agent_presence enable row level security;

drop policy if exists security_agent_presence_select on public.security_agent_presence;
create policy security_agent_presence_select on public.security_agent_presence for select using (
  public.is_security_manager(organization_id) or agent_id = public.current_security_agent_id(organization_id)
);

grant select on public.security_agent_presence to authenticated;

revoke all on function public.update_security_agent_presence(uuid,uuid,text,text,text,boolean,boolean) from public;
revoke all on function public.record_security_agent_position_at(uuid,uuid,double precision,double precision,double precision,timestamptz) from public;
grant execute on function public.update_security_agent_presence(uuid,uuid,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.record_security_agent_position_at(uuid,uuid,double precision,double precision,double precision,timestamptz) to authenticated;

-- Realtime : ajout idempotent à la publication Supabase.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'security_agent_presence'
    ) then
      alter publication supabase_realtime add table public.security_agent_presence;
    end if;
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
