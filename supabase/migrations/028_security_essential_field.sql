-- NCR Suite V2.5.1 — Sécurité privée · Offre Essentielle
-- À exécuter après 027_security_discovery_core.sql.
-- Ajoute : accès agents, rondes QR, main courante, consignes/alertes,
-- planning coloré, duplication de missions et exports PDF côté application.

begin;

alter table public.security_sites add column if not exists color_hex text;
alter table public.security_sites drop constraint if exists security_sites_color_hex_check;
alter table public.security_sites add constraint security_sites_color_hex_check
  check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$');

with ranked as (
  select id, organization_id, row_number() over (partition by organization_id order by created_at, id) as rn
  from public.security_sites where color_hex is null
), palette as (
  select array['#0A84FF','#30D158','#FF9F0A','#BF5AF2','#FF375F','#64D2FF','#FFD60A','#5E5CE6']::text[] as colors
)
update public.security_sites s
set color_hex = palette.colors[((ranked.rn - 1) % array_length(palette.colors, 1)) + 1]
from ranked, palette
where s.id = ranked.id;

alter table public.security_sites alter column color_hex set default '#0A84FF';
alter table public.security_sites alter column color_hex set not null;

alter table public.security_agents add column if not exists linked_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists idx_security_agents_linked_user
  on public.security_agents(organization_id, linked_user_id) where linked_user_id is not null;

alter table public.security_shifts add column if not exists recurrence_group_id uuid;
alter table public.security_shifts add column if not exists duplicated_from_id uuid;
do $$ begin
  alter table public.security_shifts add constraint security_shifts_duplicated_from_fk
    foreign key (organization_id, duplicated_from_id)
    references public.security_shifts(organization_id, id) on delete set null;
exception when duplicate_object then null; end $$;
create index if not exists idx_security_shifts_recurrence on public.security_shifts(organization_id, recurrence_group_id);

alter table public.organization_invitations add column if not exists security_agent_id uuid;
do $$ begin
  alter table public.organization_invitations add constraint organization_invitations_security_agent_fk
    foreign key (organization_id, security_agent_id)
    references public.security_agents(organization_id, id) on delete set null;
exception when duplicate_object then null; end $$;
create unique index if not exists idx_org_invitations_pending_security_agent
  on public.organization_invitations(organization_id, security_agent_id)
  where status = 'pending' and security_agent_id is not null;

create table if not exists public.security_site_instructions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null,
  title text not null check (char_length(trim(title)) between 2 and 160),
  content text not null check (char_length(trim(content)) between 2 and 5000),
  priority text not null default 'normal' check (priority in ('normal','important','critical')),
  active_from timestamptz,
  active_until timestamptz,
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint security_site_instructions_site_fk foreign key (organization_id, site_id)
    references public.security_sites(organization_id, id) on delete cascade,
  constraint security_instruction_dates_check check (active_until is null or active_from is null or active_until > active_from)
);

create table if not exists public.security_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null,
  agent_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 160),
  message text not null check (char_length(trim(message)) between 2 and 3000),
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  status text not null default 'open' check (status in ('open','resolved')),
  resolved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint security_alerts_site_fk foreign key (organization_id, site_id)
    references public.security_sites(organization_id, id) on delete cascade,
  constraint security_alerts_agent_fk foreign key (organization_id, agent_id)
    references public.security_agents(organization_id, id) on delete cascade
);

create table if not exists public.security_alert_acknowledgements (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  alert_id uuid not null,
  agent_id uuid not null,
  acknowledged_at timestamptz not null default now(),
  primary key (organization_id, alert_id, agent_id),
  constraint security_alert_ack_alert_fk foreign key (organization_id, alert_id)
    references public.security_alerts(organization_id, id) on delete cascade,
  constraint security_alert_ack_agent_fk foreign key (organization_id, agent_id)
    references public.security_agents(organization_id, id) on delete cascade
);

create table if not exists public.security_logbook_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null,
  agent_id uuid not null,
  occurred_at timestamptz not null default now(),
  category text not null check (category in ('prise_poste','fin_poste','ronde','anomalie','incident','visiteur','livraison','appel','consigne','autre')),
  severity text not null default 'info' check (severity in ('info','attention','urgent')),
  title text not null check (char_length(trim(title)) between 2 and 180),
  details text,
  status text not null default 'open' check (status in ('open','processed','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint security_logbook_site_fk foreign key (organization_id, site_id)
    references public.security_sites(organization_id, id) on delete restrict,
  constraint security_logbook_agent_fk foreign key (organization_id, agent_id)
    references public.security_agents(organization_id, id) on delete restrict
);

create table if not exists public.security_patrol_points (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null,
  label text not null check (char_length(trim(label)) between 2 and 160),
  qr_code text not null,
  sequence_number integer not null default 1 check (sequence_number between 1 and 1000),
  instructions text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, qr_code),
  constraint security_patrol_points_site_fk foreign key (organization_id, site_id)
    references public.security_sites(organization_id, id) on delete cascade
);

create table if not exists public.security_patrols (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null,
  agent_id uuid not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint security_patrols_site_fk foreign key (organization_id, site_id)
    references public.security_sites(organization_id, id) on delete restrict,
  constraint security_patrols_agent_fk foreign key (organization_id, agent_id)
    references public.security_agents(organization_id, id) on delete restrict
);

create table if not exists public.security_patrol_scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patrol_id uuid not null,
  point_id uuid not null,
  scanned_at timestamptz not null default now(),
  status text not null default 'valid' check (status in ('valid','unexpected')),
  created_at timestamptz not null default now(),
  unique (organization_id, patrol_id, point_id),
  constraint security_patrol_scans_patrol_fk foreign key (organization_id, patrol_id)
    references public.security_patrols(organization_id, id) on delete cascade,
  constraint security_patrol_scans_point_fk foreign key (organization_id, point_id)
    references public.security_patrol_points(organization_id, id) on delete restrict
);

create index if not exists idx_security_instructions_site on public.security_site_instructions(organization_id, site_id, status);
create index if not exists idx_security_alerts_org_status on public.security_alerts(organization_id, status, created_at desc);
create index if not exists idx_security_logbook_org_date on public.security_logbook_entries(organization_id, occurred_at desc);
create index if not exists idx_security_patrol_points_site on public.security_patrol_points(organization_id, site_id, sequence_number);
create index if not exists idx_security_patrols_agent on public.security_patrols(organization_id, agent_id, started_at desc);

create or replace function public.current_security_agent_id(p_organization_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select a.id
  from public.security_agents a
  join public.organization_members m
    on m.organization_id = a.organization_id
   and m.user_id = a.linked_user_id
   and m.status = 'active'
  where a.organization_id = p_organization_id
    and a.linked_user_id = auth.uid()
    and a.status = 'active'
  limit 1;
$$;

create or replace function public.is_security_manager(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(p_organization_id, array['owner','admin','manager']);
$$;

create or replace function public.security_team_member_limit(p_organization_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select case
    when o.plan = 'metier' then public.organization_metier_member_limit(o.id)
    else coalesce(d.member_limit, 1)
  end
  from public.organizations o
  left join public.domain_plan_catalog d
    on d.business_type = o.business_type and d.plan_key = o.plan
  where o.id = p_organization_id and o.business_type = 'securite';
$$;

create or replace function public.security_agent_can_access_site(p_organization_id uuid, p_site_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_security_manager(p_organization_id)
    or exists (
      select 1
      from public.security_shifts s
      where s.organization_id = p_organization_id
        and s.site_id = p_site_id
        and s.agent_id = public.current_security_agent_id(p_organization_id)
        and s.status <> 'canceled'
    );
$$;

create or replace function public.validate_security_field_record()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.organizations o
    where o.id = new.organization_id and o.business_type = 'securite' and o.status in ('trial','active')
  ) then raise exception 'Ce module est réservé à un espace Sécurité actif.'; end if;

  if tg_table_name in ('security_patrol_points','security_patrols')
     and not public.organization_has_plan_feature(new.organization_id, 'security_qr_patrols') then
    raise exception 'Les rondes QR nécessitent l’offre Essentielle.';
  elsif tg_table_name = 'security_logbook_entries'
     and not public.organization_has_plan_feature(new.organization_id, 'security_smart_logbook') then
    raise exception 'La main courante nécessite l’offre Essentielle.';
  elsif tg_table_name in ('security_site_instructions','security_alerts')
     and not public.organization_has_plan_feature(new.organization_id, 'security_site_instructions') then
    raise exception 'Les consignes et alertes nécessitent l’offre Essentielle.';
  end if;
  return new;
end;
$$;

create or replace function public.validate_security_agent_owned_record()
returns trigger language plpgsql set search_path = public as $$
declare v_agent uuid;
begin
  if public.is_security_manager(new.organization_id) then return new; end if;
  v_agent := public.current_security_agent_id(new.organization_id);
  if v_agent is null or new.agent_id <> v_agent then raise exception 'Accès agent invalide.'; end if;
  if new.site_id is not null and not public.security_agent_can_access_site(new.organization_id, new.site_id) then
    raise exception 'Ce site ne fait pas partie de vos missions.';
  end if;
  return new;
end;
$$;

-- Triggers communs.
do $$ declare t text; begin
  foreach t in array array['security_site_instructions','security_alerts','security_logbook_entries','security_patrol_points','security_patrols'] loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', 'set_' || t || '_updated_at', t);
    execute format('drop trigger if exists %I on public.%I', 'validate_' || t || '_organization', t);
    execute format('create trigger %I before insert or update of organization_id on public.%I for each row execute procedure public.validate_security_field_record()', 'validate_' || t || '_organization', t);
  end loop;
end $$;

drop trigger if exists validate_security_logbook_owner on public.security_logbook_entries;
create trigger validate_security_logbook_owner before insert or update of agent_id on public.security_logbook_entries
for each row execute procedure public.validate_security_agent_owned_record();
drop trigger if exists validate_security_patrol_owner on public.security_patrols;
create trigger validate_security_patrol_owner before insert or update of agent_id on public.security_patrols
for each row execute procedure public.validate_security_agent_owned_record();

-- RLS.
alter table public.security_site_instructions enable row level security;
alter table public.security_alerts enable row level security;
alter table public.security_alert_acknowledgements enable row level security;
alter table public.security_logbook_entries enable row level security;
alter table public.security_patrol_points enable row level security;
alter table public.security_patrols enable row level security;
alter table public.security_patrol_scans enable row level security;

-- Les agents connectés ne voient que leur fiche et leur planning ; les responsables gardent la vue complète.
drop policy if exists security_agents_member_select on public.security_agents;
create policy security_agents_member_select on public.security_agents for select using (
  public.is_security_manager(organization_id) or linked_user_id = auth.uid()
);
drop policy if exists security_shifts_member_select on public.security_shifts;
create policy security_shifts_member_select on public.security_shifts for select using (
  public.is_security_manager(organization_id) or agent_id = public.current_security_agent_id(organization_id)
);

drop policy if exists security_clients_member_select on public.security_clients;
create policy security_clients_member_select on public.security_clients for select using (public.is_security_manager(organization_id));
drop policy if exists security_invoices_member_select on public.security_invoices;
create policy security_invoices_member_select on public.security_invoices for select using (public.is_security_manager(organization_id));
drop policy if exists security_invoice_lines_member_select on public.security_invoice_lines;
create policy security_invoice_lines_member_select on public.security_invoice_lines for select using (public.is_security_manager(organization_id));

-- Les informations de site, consignes et points de ronde sont limitées aux sites affectés à l’agent.
drop policy if exists security_sites_member_select on public.security_sites;
create policy security_sites_member_select on public.security_sites for select using (public.security_agent_can_access_site(organization_id, id));

drop policy if exists security_instructions_member_select on public.security_site_instructions;
create policy security_instructions_member_select on public.security_site_instructions for select using (public.security_agent_can_access_site(organization_id, site_id));
drop policy if exists security_instructions_manager_insert on public.security_site_instructions;
create policy security_instructions_manager_insert on public.security_site_instructions for insert with check (public.is_security_manager(organization_id));
drop policy if exists security_instructions_manager_update on public.security_site_instructions;
create policy security_instructions_manager_update on public.security_site_instructions for update using (public.is_security_manager(organization_id)) with check (public.is_security_manager(organization_id));
drop policy if exists security_instructions_manager_delete on public.security_site_instructions;
create policy security_instructions_manager_delete on public.security_site_instructions for delete using (public.has_org_role(organization_id, array['owner','admin']));

drop policy if exists security_alerts_member_select on public.security_alerts;
create policy security_alerts_member_select on public.security_alerts for select using (
  public.is_security_manager(organization_id)
  or (public.security_agent_can_access_site(organization_id, site_id) and (agent_id is null or agent_id = public.current_security_agent_id(organization_id)))
);
drop policy if exists security_alerts_manager_insert on public.security_alerts;
create policy security_alerts_manager_insert on public.security_alerts for insert with check (public.is_security_manager(organization_id));
drop policy if exists security_alerts_manager_update on public.security_alerts;
create policy security_alerts_manager_update on public.security_alerts for update using (public.is_security_manager(organization_id)) with check (public.is_security_manager(organization_id));
drop policy if exists security_alerts_manager_delete on public.security_alerts;
create policy security_alerts_manager_delete on public.security_alerts for delete using (public.has_org_role(organization_id, array['owner','admin']));

drop policy if exists security_alert_ack_member_select on public.security_alert_acknowledgements;
create policy security_alert_ack_member_select on public.security_alert_acknowledgements for select using (
  public.is_security_manager(organization_id) or agent_id = public.current_security_agent_id(organization_id)
);
drop policy if exists security_alert_ack_agent_insert on public.security_alert_acknowledgements;
create policy security_alert_ack_agent_insert on public.security_alert_acknowledgements for insert with check (
  agent_id = public.current_security_agent_id(organization_id)
);

drop policy if exists security_logbook_member_select on public.security_logbook_entries;
create policy security_logbook_member_select on public.security_logbook_entries for select using (
  public.is_security_manager(organization_id) or agent_id = public.current_security_agent_id(organization_id)
);
drop policy if exists security_logbook_member_insert on public.security_logbook_entries;
create policy security_logbook_member_insert on public.security_logbook_entries for insert with check (
  public.is_security_manager(organization_id) or agent_id = public.current_security_agent_id(organization_id)
);
drop policy if exists security_logbook_manager_update on public.security_logbook_entries;
create policy security_logbook_manager_update on public.security_logbook_entries for update using (public.is_security_manager(organization_id)) with check (public.is_security_manager(organization_id));
drop policy if exists security_logbook_admin_delete on public.security_logbook_entries;
create policy security_logbook_admin_delete on public.security_logbook_entries for delete using (public.has_org_role(organization_id, array['owner','admin']));

drop policy if exists security_patrol_points_member_select on public.security_patrol_points;
create policy security_patrol_points_member_select on public.security_patrol_points for select using (public.security_agent_can_access_site(organization_id, site_id));
drop policy if exists security_patrol_points_manager_insert on public.security_patrol_points;
create policy security_patrol_points_manager_insert on public.security_patrol_points for insert with check (public.is_security_manager(organization_id));
drop policy if exists security_patrol_points_manager_update on public.security_patrol_points;
create policy security_patrol_points_manager_update on public.security_patrol_points for update using (public.is_security_manager(organization_id)) with check (public.is_security_manager(organization_id));
drop policy if exists security_patrol_points_admin_delete on public.security_patrol_points;
create policy security_patrol_points_admin_delete on public.security_patrol_points for delete using (public.has_org_role(organization_id, array['owner','admin']));

drop policy if exists security_patrols_member_select on public.security_patrols;
create policy security_patrols_member_select on public.security_patrols for select using (
  public.is_security_manager(organization_id) or agent_id = public.current_security_agent_id(organization_id)
);
drop policy if exists security_patrols_agent_insert on public.security_patrols;
create policy security_patrols_agent_insert on public.security_patrols for insert with check (
  public.is_security_manager(organization_id) or agent_id = public.current_security_agent_id(organization_id)
);
drop policy if exists security_patrols_agent_update on public.security_patrols;
create policy security_patrols_agent_update on public.security_patrols for update using (
  public.is_security_manager(organization_id) or agent_id = public.current_security_agent_id(organization_id)
) with check (
  public.is_security_manager(organization_id) or agent_id = public.current_security_agent_id(organization_id)
);

drop policy if exists security_patrol_scans_member_select on public.security_patrol_scans;
create policy security_patrol_scans_member_select on public.security_patrol_scans for select using (
  public.is_security_manager(organization_id) or exists (
    select 1 from public.security_patrols p where p.organization_id = security_patrol_scans.organization_id
      and p.id = security_patrol_scans.patrol_id and p.agent_id = public.current_security_agent_id(p.organization_id)
  )
);

-- Permissions de tables.
grant select, insert, update, delete on public.security_site_instructions to authenticated;
grant select, insert, update, delete on public.security_alerts to authenticated;
grant select, insert on public.security_alert_acknowledgements to authenticated;
grant select, insert, update, delete on public.security_logbook_entries to authenticated;
grant select, insert, update, delete on public.security_patrol_points to authenticated;
grant select, insert, update on public.security_patrols to authenticated;
grant select on public.security_patrol_scans to authenticated;

-- Limites et invitations dédiées au domaine Sécurité.
create or replace function public.security_team_plan_summary(p_organization_id uuid)
returns table (
  plan text, member_limit integer, active_members integer, pending_invitations integer,
  available_seats integer, invitations_enabled boolean, manager_role_enabled boolean
)
language plpgsql stable security definer set search_path = public as $$
declare v_plan text; v_limit integer; v_active integer; v_pending integer;
begin
  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Accès insuffisant.'; end if;
  select o.plan, public.security_team_member_limit(o.id) into v_plan, v_limit
  from public.organizations o
  where o.id = p_organization_id and o.business_type = 'securite';
  if v_plan is null then raise exception 'Espace Sécurité introuvable.'; end if;
  select count(*)::integer into v_active
  from public.security_agents a
  join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.linked_user_id and m.status='active'
  where a.organization_id=p_organization_id and a.linked_user_id is not null and a.status='active';
  select count(*)::integer into v_pending from public.organization_invitations where organization_id = p_organization_id and security_agent_id is not null and status = 'pending' and expires_at > now();
  return query select v_plan, v_limit, v_active, v_pending, greatest(v_limit - v_active - v_pending, 0),
    public.organization_has_plan_feature(p_organization_id, 'team_access'), public.organization_has_plan_feature(p_organization_id, 'manager_role');
end;
$$;

create or replace function public.list_security_team_members(p_organization_id uuid)
returns table (user_id uuid, email text, full_name text, role text, status text, staff_id uuid, staff_name text, joined_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Accès insuffisant.'; end if;
  return query
  select m.user_id, u.email::text,
    coalesce(nullif(trim(p.full_name),''), concat_ws(' ', a.first_name, a.last_name), split_part(u.email::text,'@',1))::text,
    m.role, m.status, a.id, concat_ws(' ', a.first_name, a.last_name)::text, m.created_at
  from public.organization_members m
  join auth.users u on u.id = m.user_id
  left join public.user_profiles p on p.id = m.user_id
  left join public.security_agents a on a.organization_id = m.organization_id and a.linked_user_id = m.user_id
  where m.organization_id = p_organization_id
  order by case m.role when 'owner' then 0 when 'admin' then 1 when 'manager' then 2 else 3 end,
    coalesce(a.last_name, p.full_name, u.email::text);
end;
$$;

create or replace function public.list_security_team_invitations(p_organization_id uuid)
returns table (invitation_id uuid, email text, role text, staff_id uuid, staff_name text, status text, expires_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Accès insuffisant.'; end if;
  return query
  select i.id, i.email, i.role, i.security_agent_id, concat_ws(' ', a.first_name, a.last_name)::text,
    case when i.status = 'pending' and i.expires_at <= now() then 'expired' else i.status end,
    i.expires_at, i.created_at
  from public.organization_invitations i
  left join public.security_agents a on a.organization_id = i.organization_id and a.id = i.security_agent_id
  where i.organization_id = p_organization_id and i.security_agent_id is not null and i.status in ('pending','expired')
  order by i.created_at desc;
end;
$$;

create or replace function public.create_security_agent_invitation(
  p_organization_id uuid, p_email text, p_security_agent_id uuid
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_plan text; v_limit integer; v_used integer; v_email text := lower(trim(coalesce(p_email,''))); v_token text; v_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then raise exception 'Seul le propriétaire ou un administrateur peut gérer les accès.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'team_access') then raise exception 'Les accès agents nécessitent l’offre Essentielle.'; end if;
  if v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'Adresse e-mail invalide.'; end if;
  select o.plan, public.security_team_member_limit(o.id) into v_plan, v_limit
  from public.organizations o
  where o.id=p_organization_id and o.business_type='securite';
  if not exists (select 1 from public.security_agents where organization_id=p_organization_id and id=p_security_agent_id and status='active' and linked_user_id is null) then raise exception 'Agent introuvable, inactif ou déjà connecté.'; end if;
  if exists (select 1 from public.organization_invitations where organization_id=p_organization_id and security_agent_id=p_security_agent_id and status='pending' and expires_at>now()) then raise exception 'Une invitation active existe déjà pour cet agent.'; end if;
  if exists (select 1 from public.organization_members m join auth.users u on u.id=m.user_id where m.organization_id=p_organization_id and lower(u.email::text)=v_email and m.status in ('active','disabled')) then raise exception 'Cette adresse possède déjà un accès.'; end if;
  select (
           select count(*)
           from public.security_agents a
           join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.linked_user_id and m.status='active'
           where a.organization_id=p_organization_id and a.linked_user_id is not null and a.status='active'
         ) + (
           select count(*) from public.organization_invitations
           where organization_id=p_organization_id and security_agent_id is not null and status='pending' and expires_at>now()
         ) into v_used;
  if v_used >= v_limit then raise exception 'La limite de % agent(s) connecté(s) est atteinte.', v_limit; end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.organization_invitations(organization_id,email,role,staff_id,security_agent_id,token_hash,expires_at,invited_by)
  values(p_organization_id,v_email,'employee',null,p_security_agent_id,extensions.digest(v_token,'sha256'),now()+interval '7 days',auth.uid())
  returning id into v_id;
  perform public.enqueue_team_invitation_email(v_id, v_token, false);
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'security.agent_invited','security_agent',p_security_agent_id::text,jsonb_build_object('email',v_email));
  return v_id;
end;
$$;

create or replace function public.set_security_team_member_status(
  p_organization_id uuid, p_user_id uuid, p_status text
)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text; v_limit integer; v_active integer;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then raise exception 'Vous ne disposez pas des droits nécessaires.'; end if;
  if p_status not in ('active','disabled') then raise exception 'Statut invalide.'; end if;
  if p_user_id = auth.uid() then raise exception 'Vous ne pouvez pas suspendre votre propre accès.'; end if;
  select role into v_role from public.organization_members where organization_id=p_organization_id and user_id=p_user_id;
  if v_role is null then raise exception 'Utilisateur introuvable.'; end if;
  if v_role='owner' then raise exception 'Le propriétaire ne peut pas être suspendu.'; end if;
  if not exists(select 1 from public.security_agents where organization_id=p_organization_id and linked_user_id=p_user_id) then raise exception 'Aucune fiche agent n’est liée à cet accès.'; end if;
  if p_status='active' then
    select public.security_team_member_limit(o.id) into v_limit
    from public.organizations o
    where o.id=p_organization_id and o.business_type='securite';
    select count(*)::integer into v_active
    from public.security_agents a join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.linked_user_id
    where a.organization_id=p_organization_id and a.linked_user_id is not null and a.status='active' and m.status='active' and a.linked_user_id<>p_user_id;
    if v_active>=v_limit then raise exception 'La limite de % agent(s) connecté(s) est atteinte.',v_limit; end if;
  end if;
  update public.organization_members set status=p_status where organization_id=p_organization_id and user_id=p_user_id;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'security.agent_access_status_updated','organization_member',p_user_id::text,jsonb_build_object('status',p_status));
end;
$$;

-- Nom d’agent dans l’écran et l’e-mail d’invitation.
create or replace function public.get_team_invitation(p_token text)
returns table (organization_name text, organization_color text, invited_email text, invited_role text, staff_name text, invitation_status text, expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.name, o.primary_color, i.email, i.role,
    coalesce(s.display_name, concat_ws(' ', a.first_name, a.last_name)),
    case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end, i.expires_at
  from public.organization_invitations i
  join public.organizations o on o.id=i.organization_id
  left join public.staff s on s.organization_id=i.organization_id and s.id=i.staff_id
  left join public.security_agents a on a.organization_id=i.organization_id and a.id=i.security_agent_id
  where i.token_hash=extensions.digest(trim(p_token),'sha256') limit 1;
$$;

-- Extension sûre de l’acceptation existante : lie également la fiche agent Sécurité.
create or replace function public.accept_team_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_invitation public.organization_invitations%rowtype; v_user_email text; v_limit integer; v_active integer;
begin
  if auth.uid() is null then raise exception 'Connectez-vous pour accepter cette invitation.'; end if;
  select lower(email::text) into v_user_email from auth.users where id=auth.uid();
  select * into v_invitation from public.organization_invitations where token_hash=extensions.digest(trim(p_token),'sha256') for update;
  if v_invitation.id is null then raise exception 'Invitation introuvable.'; end if;
  if v_invitation.status<>'pending' or v_invitation.expires_at<=now() then
    if v_invitation.status='pending' then update public.organization_invitations set status='expired',updated_at=now() where id=v_invitation.id; end if;
    raise exception 'Cette invitation n’est plus valide.';
  end if;
  if v_user_email is null or v_user_email<>lower(v_invitation.email) then raise exception 'Connectez-vous avec l’adresse e-mail qui a reçu l’invitation.'; end if;
  if v_invitation.security_agent_id is not null then
    select public.security_team_member_limit(v_invitation.organization_id) into v_limit;
    select count(*)::integer into v_active
    from public.security_agents a
    join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.linked_user_id and m.status='active'
    where a.organization_id=v_invitation.organization_id and a.linked_user_id is not null and a.status='active' and a.linked_user_id<>auth.uid();
  else
    select public.plan_member_limit(o.plan) into v_limit from public.organizations o where o.id=v_invitation.organization_id;
    select count(*)::integer into v_active from public.organization_members where organization_id=v_invitation.organization_id and status='active' and user_id<>auth.uid();
  end if;
  if v_active>=v_limit then raise exception 'La limite d’utilisateurs de cette entreprise est atteinte.'; end if;
  insert into public.organization_members(organization_id,user_id,role,status)
  values(v_invitation.organization_id,auth.uid(),v_invitation.role,'active')
  on conflict(organization_id,user_id) do update set role=case when public.organization_members.role='owner' then 'owner' else excluded.role end,status='active';
  if v_invitation.staff_id is not null then
    update public.staff set linked_user_id=auth.uid(),email=coalesce(email,v_user_email),updated_at=now()
    where organization_id=v_invitation.organization_id and id=v_invitation.staff_id and linked_user_id is null;
  end if;
  if v_invitation.security_agent_id is not null then
    update public.security_agents set linked_user_id=auth.uid(),email=coalesce(email,v_user_email),updated_at=now()
    where organization_id=v_invitation.organization_id and id=v_invitation.security_agent_id and linked_user_id is null;
  end if;
  update public.organization_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now(),updated_at=now() where id=v_invitation.id;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(v_invitation.organization_id,auth.uid(),'team.invitation_accepted','organization_member',auth.uid()::text,jsonb_build_object('role',v_invitation.role,'staff_id',v_invitation.staff_id,'security_agent_id',v_invitation.security_agent_id));
  return v_invitation.organization_id;
end;
$$;

-- Duplique une mission sur plusieurs dates dans une seule transaction.
create or replace function public.duplicate_security_shift(
  p_organization_id uuid, p_shift_id uuid, p_target_dates date[]
)
returns table(shift_id uuid, target_date date)
language plpgsql security definer set search_path = public as $$
declare v_source public.security_shifts%rowtype; v_timezone text; v_start_local timestamp; v_end_local timestamp; v_date date; v_start timestamptz; v_end timestamptz; v_group uuid; v_new_id uuid;
begin
  if auth.uid() is null or not public.is_security_manager(p_organization_id) then raise exception 'Accès insuffisant.'; end if;
  select * into v_source from public.security_shifts where organization_id=p_organization_id and id=p_shift_id;
  if v_source.id is null then raise exception 'Mission introuvable.'; end if;
  select coalesce(nullif(timezone,''),'Europe/Paris') into v_timezone from public.security_sites
  where organization_id=p_organization_id and id=v_source.site_id;
  if coalesce(array_length(p_target_dates,1),0)=0 then raise exception 'Sélectionne au moins une date.'; end if;
  v_start_local := v_source.starts_at at time zone v_timezone; v_end_local := v_source.ends_at at time zone v_timezone;
  v_group := coalesce(v_source.recurrence_group_id, gen_random_uuid());
  update public.security_shifts set recurrence_group_id=v_group where id=v_source.id and organization_id=p_organization_id and recurrence_group_id is null;
  foreach v_date in array p_target_dates loop
    if v_date = v_start_local::date then continue; end if;
    v_start := (v_date + v_start_local::time) at time zone v_timezone;
    v_end := ((v_date + case when v_end_local::date>v_start_local::date then 1 else 0 end) + v_end_local::time) at time zone v_timezone;
    insert into public.security_shifts(organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,created_by,recurrence_group_id,duplicated_from_id)
    values(p_organization_id,v_source.site_id,v_source.agent_id,v_source.title,v_start,v_end,v_source.break_minutes,'planned',v_source.notes,auth.uid(),v_group,v_source.id)
    returning id into v_new_id;
    shift_id:=v_new_id; target_date:=v_date; return next;
  end loop;
end;
$$;

create or replace function public.start_security_patrol(p_organization_id uuid, p_site_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_agent uuid; v_id uuid;
begin
  if not public.organization_has_plan_feature(p_organization_id,'security_qr_patrols') then raise exception 'Les rondes QR nécessitent l’offre Essentielle.'; end if;
  v_agent:=public.current_security_agent_id(p_organization_id);
  if v_agent is null and public.is_security_manager(p_organization_id) then select id into v_agent from public.security_agents where organization_id=p_organization_id and status='active' order by created_at limit 1; end if;
  if v_agent is null then raise exception 'Aucune fiche agent liée à ce compte.'; end if;
  if not public.security_agent_can_access_site(p_organization_id, p_site_id) then raise exception 'Aucune mission ne vous donne accès à ce site.'; end if;
  if not exists (select 1 from public.security_patrol_points where organization_id=p_organization_id and site_id=p_site_id and status='active') then raise exception 'Aucun point de ronde actif n’est configuré sur ce site.'; end if;
  if exists(select 1 from public.security_patrols where organization_id=p_organization_id and agent_id=v_agent and status='in_progress') then raise exception 'Une ronde est déjà en cours.'; end if;
  insert into public.security_patrols(organization_id,site_id,agent_id,created_by) values(p_organization_id,p_site_id,v_agent,auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.record_security_patrol_scan(p_organization_id uuid, p_patrol_id uuid, p_qr_code text)
returns table(point_id uuid, point_label text, scanned_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_agent uuid; v_site uuid; v_point public.security_patrol_points%rowtype; v_time timestamptz;
begin
  v_agent:=public.current_security_agent_id(p_organization_id);
  select site_id into v_site from public.security_patrols where organization_id=p_organization_id and id=p_patrol_id and status='in_progress' and (agent_id=v_agent or public.is_security_manager(p_organization_id));
  if v_site is null then raise exception 'Ronde en cours introuvable.'; end if;
  select * into v_point from public.security_patrol_points where organization_id=p_organization_id and site_id=v_site and qr_code=trim(p_qr_code) and status='active';
  if v_point.id is null then raise exception 'Point de ronde QR inconnu pour ce site.'; end if;
  insert into public.security_patrol_scans(organization_id,patrol_id,point_id,status)
  values(p_organization_id,p_patrol_id,v_point.id,'valid')
  on conflict(organization_id,patrol_id,point_id) do update set scanned_at=now()
  returning security_patrol_scans.scanned_at into v_time;
  point_id:=v_point.id; point_label:=v_point.label; scanned_at:=v_time; return next;
end;
$$;

create or replace function public.complete_security_patrol(p_organization_id uuid, p_patrol_id uuid, p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_agent uuid; v_site uuid; v_expected integer; v_scanned integer;
begin
  v_agent:=public.current_security_agent_id(p_organization_id);
  select site_id into v_site from public.security_patrols where organization_id=p_organization_id and id=p_patrol_id and status='in_progress' and (agent_id=v_agent or public.is_security_manager(p_organization_id)) for update;
  if v_site is null then raise exception 'Ronde en cours introuvable.'; end if;
  select count(*) into v_expected from public.security_patrol_points where organization_id=p_organization_id and site_id=v_site and status='active';
  select count(*) into v_scanned from public.security_patrol_scans where organization_id=p_organization_id and patrol_id=p_patrol_id;
  if v_expected>0 and v_scanned<v_expected then raise exception 'La ronde est incomplète : % point(s) sur %.', v_scanned, v_expected; end if;
  update public.security_patrols set status='completed',completed_at=now(),notes=nullif(trim(coalesce(p_notes,'')),''),updated_at=now()
  where organization_id=p_organization_id and id=p_patrol_id;
end;
$$;

create or replace function public.acknowledge_security_alert(p_organization_id uuid, p_alert_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_agent uuid;
begin
  v_agent:=public.current_security_agent_id(p_organization_id); if v_agent is null then raise exception 'Aucune fiche agent liée à ce compte.'; end if;
  if not exists(select 1 from public.security_alerts where organization_id=p_organization_id and id=p_alert_id and status='open' and (agent_id is null or agent_id=v_agent)) then raise exception 'Alerte introuvable.'; end if;
  insert into public.security_alert_acknowledgements(organization_id,alert_id,agent_id) values(p_organization_id,p_alert_id,v_agent)
  on conflict(organization_id,alert_id,agent_id) do update set acknowledged_at=now();
end;
$$;

-- Fonctions publiques : droits explicites.
revoke all on function public.current_security_agent_id(uuid) from public;
revoke all on function public.is_security_manager(uuid) from public;
revoke all on function public.security_team_member_limit(uuid) from public;
revoke all on function public.security_agent_can_access_site(uuid,uuid) from public;
revoke all on function public.security_team_plan_summary(uuid) from public;
revoke all on function public.list_security_team_members(uuid) from public;
revoke all on function public.list_security_team_invitations(uuid) from public;
revoke all on function public.create_security_agent_invitation(uuid,text,uuid) from public;
revoke all on function public.set_security_team_member_status(uuid,uuid,text) from public;
revoke all on function public.duplicate_security_shift(uuid,uuid,date[]) from public;
revoke all on function public.start_security_patrol(uuid,uuid) from public;
revoke all on function public.record_security_patrol_scan(uuid,uuid,text) from public;
revoke all on function public.complete_security_patrol(uuid,uuid,text) from public;
revoke all on function public.acknowledge_security_alert(uuid,uuid) from public;
grant execute on function public.current_security_agent_id(uuid) to authenticated;
grant execute on function public.is_security_manager(uuid) to authenticated;
grant execute on function public.security_team_member_limit(uuid) to authenticated;
grant execute on function public.security_agent_can_access_site(uuid,uuid) to authenticated;
grant execute on function public.security_team_plan_summary(uuid) to authenticated;
grant execute on function public.list_security_team_members(uuid) to authenticated;
grant execute on function public.list_security_team_invitations(uuid) to authenticated;
grant execute on function public.create_security_agent_invitation(uuid,text,uuid) to authenticated;
grant execute on function public.set_security_team_member_status(uuid,uuid,text) to authenticated;
grant execute on function public.duplicate_security_shift(uuid,uuid,date[]) to authenticated;
grant execute on function public.start_security_patrol(uuid,uuid) to authenticated;
grant execute on function public.record_security_patrol_scan(uuid,uuid,text) to authenticated;
grant execute on function public.complete_security_patrol(uuid,uuid,text) to authenticated;
grant execute on function public.acknowledge_security_alert(uuid,uuid) to authenticated;

-- Catalogue modules et activation dans les espaces Sécurité existants.
insert into public.module_catalog(module_key,display_name,description,category,icon_key,compatible_business_types,core_module,default_enabled,active,sort_order)
values
 ('security_agent_portal','Espace agent','Planning personnel et accès aux actions terrain.','securite','shield','{securite}',false,false,true,560),
 ('security_qr_patrols','Rondes QR','Points de passage QR et suivi des rondes.','securite','map','{securite}',false,false,true,570),
 ('security_smart_logbook','Main courante intelligente','Choix prédéfinis, événements et export PDF.','securite','clipboard','{securite}',false,false,true,580),
 ('security_site_instructions','Consignes & alertes','Consignes et alertes propres à chaque site.','securite','alert','{securite}',false,false,true,590),
 ('security_logbook_pdf','PDF main courante','Export de la main courante pour le responsable.','securite','file','{securite}',false,false,true,600)
on conflict(module_key) do update set display_name=excluded.display_name,description=excluded.description,category=excluded.category,icon_key=excluded.icon_key,
 compatible_business_types=excluded.compatible_business_types,active=true,updated_at=now();

update public.module_catalog
set compatible_business_types = case when 'securite'=any(compatible_business_types) then compatible_business_types else array_append(compatible_business_types,'securite') end,
    active=true, updated_at=now()
where module_key='team_access';

with security_modules(module_key,feature_key) as (
  values
    ('security_agent_portal','security_agent_portal'),
    ('security_qr_patrols','security_qr_patrols'),
    ('security_smart_logbook','security_smart_logbook'),
    ('security_site_instructions','security_site_instructions'),
    ('security_logbook_pdf','security_logbook_pdf'),
    ('team_access','team_access')
)
insert into public.organization_modules(organization_id,module_key,enabled)
select o.id, sm.module_key, public.organization_has_plan_feature(o.id, sm.feature_key)
from public.organizations o
cross join security_modules sm
where o.business_type='securite'
  and not (o.plan='metier' and coalesce(o.metier_modules_configured,false))
on conflict(organization_id,module_key) do update set enabled=excluded.enabled,updated_at=now();

commit;

