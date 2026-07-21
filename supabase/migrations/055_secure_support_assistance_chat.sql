-- NCR Suite V2.11.1 — Conversation support et prise en main sécurisée

-- 1) Conversation centralisée par ticket
create table if not exists public.platform_support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.platform_support_tickets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_kind text not null check (sender_kind in ('customer','ncr_admin','system')),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  is_initial boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_support_messages_ticket
  on public.platform_support_messages(ticket_id, created_at);
create unique index if not exists idx_platform_support_messages_initial
  on public.platform_support_messages(ticket_id) where is_initial = true;

alter table public.platform_support_messages enable row level security;
revoke all on public.platform_support_messages from anon, authenticated;

-- Reprise des descriptions déjà présentes dans les tickets existants.
insert into public.platform_support_messages (
  ticket_id, organization_id, sender_id, sender_kind, body, is_initial, created_at
)
select t.id, t.organization_id, t.created_by, 'customer', t.description, true, t.created_at
from public.platform_support_tickets t
where not exists (
  select 1 from public.platform_support_messages m
  where m.ticket_id = t.id and m.is_initial = true
);

-- 2) Demandes et sessions de prise en main
create table if not exists public.platform_support_access_requests (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.platform_support_tickets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  approved_by uuid references auth.users(id) on delete set null,
  reason text not null check (char_length(trim(reason)) between 5 and 1000),
  duration_minutes integer not null check (duration_minutes in (15,30,60)),
  status text not null default 'pending' check (status in ('pending','approved','denied','active','ended','revoked','expired','cancelled')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  started_at timestamptz,
  expires_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_access_ticket
  on public.platform_support_access_requests(ticket_id, requested_at desc);
create index if not exists idx_support_access_admin_active
  on public.platform_support_access_requests(requested_by, status, expires_at);
create unique index if not exists idx_support_access_single_open_request
  on public.platform_support_access_requests(ticket_id)
  where status in ('pending','approved','active');

alter table public.platform_support_access_requests enable row level security;
revoke all on public.platform_support_access_requests from anon, authenticated;

drop trigger if exists set_platform_support_access_updated_at on public.platform_support_access_requests;
create trigger set_platform_support_access_updated_at
before update on public.platform_support_access_requests
for each row execute procedure public.set_updated_at();

-- Vérification d'un rôle réellement détenu dans l'entreprise, sans tenir compte d'une session support.
create or replace function public.has_actual_org_role(p_organization_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(p_roles)
  );
$$;

create or replace function public.has_active_support_access(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    and exists (
      select 1
      from public.platform_support_access_requests r
      join public.platform_support_tickets t on t.id = r.ticket_id
      join public.organizations o on o.id = r.organization_id
      where r.organization_id = p_organization_id
        and r.requested_by = auth.uid()
        and r.status = 'active'
        and r.started_at is not null
        and r.expires_at > now()
        and t.status in ('open','in_progress','waiting_customer')
        and o.status <> 'closed'
    );
$$;

-- Une session approuvée donne un accès temporaire aux écrans opérationnels.
create or replace function public.is_org_member_any_status(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ) or public.has_active_support_access(p_organization_id);
$$;

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and o.status in ('trial','active')
  ) or public.has_active_support_access(p_organization_id);
$$;

create or replace function public.has_org_role(p_organization_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(p_roles)
      and o.status in ('trial','active')
  ) or (
    public.has_active_support_access(p_organization_id)
    and p_roles && array['owner','admin','manager']::text[]
  );
$$;

-- 3) Création d'un ticket avec son premier message
create or replace function public.create_platform_support_ticket(
  p_organization_id uuid,
  p_category text,
  p_priority text,
  p_subject text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.has_actual_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès refusé.';
  end if;
  if p_category not in ('general','billing','access','technical','data','feature') then raise exception 'Catégorie invalide.'; end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'Priorité invalide.'; end if;

  insert into public.platform_support_tickets (
    organization_id, created_by, category, priority, subject, description
  ) values (
    p_organization_id, auth.uid(), p_category, p_priority, trim(p_subject), trim(p_description)
  ) returning id into v_id;

  insert into public.platform_support_messages (
    ticket_id, organization_id, sender_id, sender_kind, body, is_initial
  ) values (
    v_id, p_organization_id, auth.uid(), 'customer', trim(p_description), true
  );

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'support.ticket_created', 'platform_support_ticket', v_id::text,
    jsonb_build_object('priority', p_priority, 'category', p_category));

  return v_id;
end;
$$;

-- 4) Fil de discussion partagé
create or replace function public.get_support_ticket_thread(p_ticket_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_result jsonb;
begin
  select organization_id into v_org_id
  from public.platform_support_tickets
  where id = p_ticket_id;

  if v_org_id is null then raise exception 'Ticket introuvable.'; end if;
  if not public.is_platform_admin() and not public.has_actual_org_role(v_org_id, array['owner','admin','manager','employee','viewer']) then
    raise exception 'Accès refusé.';
  end if;

  select jsonb_build_object(
    'messages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'sender_kind', m.sender_kind,
          'sender_id', m.sender_id,
          'sender_name', case
            when m.sender_kind = 'system' then 'NCR Suite'
            when m.sender_kind = 'ncr_admin' then coalesce(nullif(u.raw_user_meta_data->>'full_name',''), split_part(u.email::text,'@',1), 'Équipe NCR')
            else coalesce(nullif(u.raw_user_meta_data->>'full_name',''), split_part(u.email::text,'@',1), 'Entreprise')
          end,
          'sender_email', case when m.sender_kind = 'system' then null else u.email::text end,
          'body', m.body,
          'is_initial', m.is_initial,
          'created_at', m.created_at
        ) order by m.created_at
      )
      from public.platform_support_messages m
      left join auth.users u on u.id = m.sender_id
      where m.ticket_id = p_ticket_id
    ), '[]'::jsonb),
    'access_requests', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'reason', r.reason,
          'duration_minutes', r.duration_minutes,
          'status', case when r.status = 'active' and r.expires_at <= now() then 'expired' else r.status end,
          'requested_by', r.requested_by,
          'requested_by_name', coalesce(nullif(requester.raw_user_meta_data->>'full_name',''), split_part(requester.email::text,'@',1), 'Équipe NCR'),
          'approved_by', r.approved_by,
          'approved_by_name', coalesce(nullif(approver.raw_user_meta_data->>'full_name',''), split_part(approver.email::text,'@',1)),
          'requested_at', r.requested_at,
          'approved_at', r.approved_at,
          'started_at', r.started_at,
          'expires_at', r.expires_at,
          'ended_at', r.ended_at,
          'can_start', public.is_platform_admin() and r.requested_by = auth.uid() and r.status = 'approved',
          'can_enter', public.is_platform_admin() and r.requested_by = auth.uid() and r.status = 'active' and r.expires_at > now(),
          'can_respond', public.has_actual_org_role(v_org_id, array['owner','admin']) and r.status = 'pending',
          'can_revoke', (public.has_actual_org_role(v_org_id, array['owner','admin']) or r.requested_by = auth.uid()) and r.status in ('approved','active')
        ) order by r.requested_at desc
      )
      from public.platform_support_access_requests r
      left join auth.users requester on requester.id = r.requested_by
      left join auth.users approver on approver.id = r.approved_by
      where r.ticket_id = p_ticket_id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.send_support_ticket_message(p_ticket_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_status text;
  v_kind text;
  v_id uuid;
begin
  select organization_id, status into v_org_id, v_status
  from public.platform_support_tickets where id = p_ticket_id;
  if v_org_id is null then raise exception 'Ticket introuvable.'; end if;
  if v_status not in ('open','in_progress','waiting_customer') then
    raise exception 'La conversation est fermée. Rouvre un ticket pour poursuivre.';
  end if;
  if char_length(trim(coalesce(p_body,''))) < 1 then raise exception 'Le message est vide.'; end if;
  if char_length(trim(p_body)) > 5000 then raise exception 'Le message est trop long.'; end if;

  if public.is_platform_admin() then
    v_kind := 'ncr_admin';
  elsif public.has_actual_org_role(v_org_id, array['owner','admin','manager','employee','viewer']) then
    v_kind := 'customer';
  else
    raise exception 'Accès refusé.';
  end if;

  insert into public.platform_support_messages(ticket_id,organization_id,sender_id,sender_kind,body)
  values (p_ticket_id,v_org_id,auth.uid(),v_kind,trim(p_body)) returning id into v_id;

  update public.platform_support_tickets
  set status = case
        when v_kind = 'ncr_admin' and status = 'open' then 'in_progress'
        when v_kind = 'customer' and status = 'waiting_customer' then 'in_progress'
        else status end,
      first_response_at = case when v_kind = 'ncr_admin' then coalesce(first_response_at,now()) else first_response_at end,
      updated_at = now()
  where id = p_ticket_id;

  return v_id;
end;
$$;

-- 5) Demande, approbation et démarrage de l'assistance
create or replace function public.request_support_access(
  p_ticket_id uuid,
  p_reason text,
  p_duration_minutes integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_status text;
  v_id uuid;
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;
  if p_duration_minutes not in (15,30,60) then raise exception 'Durée invalide.'; end if;
  if char_length(trim(coalesce(p_reason,''))) < 5 then raise exception 'Le motif est obligatoire.'; end if;

  select organization_id,status into v_org_id,v_status
  from public.platform_support_tickets where id=p_ticket_id;
  if v_org_id is null then raise exception 'Ticket introuvable.'; end if;
  if v_status not in ('open','in_progress','waiting_customer') then raise exception 'Le ticket doit être ouvert.'; end if;

  update public.platform_support_access_requests
  set status='expired', ended_at=coalesce(ended_at,now()), updated_at=now()
  where ticket_id=p_ticket_id and status='active' and expires_at <= now();

  if exists (select 1 from public.platform_support_access_requests where ticket_id=p_ticket_id and status in ('pending','approved','active')) then
    raise exception 'Une demande d’accès est déjà en cours sur ce ticket.';
  end if;

  insert into public.platform_support_access_requests(ticket_id,organization_id,requested_by,reason,duration_minutes)
  values (p_ticket_id,v_org_id,auth.uid(),trim(p_reason),p_duration_minutes)
  returning id into v_id;

  insert into public.platform_support_messages(ticket_id,organization_id,sender_id,sender_kind,body)
  values (p_ticket_id,v_org_id,null,'system',
    'L’équipe NCR demande une autorisation temporaire de '||p_duration_minutes||' minutes pour intervenir dans l’espace entreprise. Motif : '||trim(p_reason));

  update public.platform_support_tickets set status='waiting_customer',updated_at=now() where id=p_ticket_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(v_org_id,auth.uid(),'platform.support_access_requested','platform_support_access',v_id::text,
    jsonb_build_object('ticket_id',p_ticket_id,'duration_minutes',p_duration_minutes,'reason',trim(p_reason)));
  return v_id;
end;
$$;

create or replace function public.respond_support_access(p_request_id uuid, p_approved boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.platform_support_access_requests%rowtype;
begin
  select * into v_request from public.platform_support_access_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'Demande introuvable.'; end if;
  if not public.has_actual_org_role(v_request.organization_id,array['owner','admin']) then raise exception 'Seul le propriétaire ou un administrateur peut répondre.'; end if;
  if v_request.status <> 'pending' then raise exception 'Cette demande a déjà été traitée.'; end if;

  update public.platform_support_access_requests
  set status=case when p_approved then 'approved' else 'denied' end,
      approved_by=auth.uid(), approved_at=now(), ended_at=case when p_approved then null else now() end
  where id=p_request_id;

  insert into public.platform_support_messages(ticket_id,organization_id,sender_id,sender_kind,body)
  values(v_request.ticket_id,v_request.organization_id,null,'system',
    case when p_approved
      then 'L’entreprise a autorisé la prise en main. La durée commencera uniquement lorsque l’équipe NCR démarrera la session.'
      else 'L’entreprise a refusé la demande de prise en main.' end);

  update public.platform_support_tickets
  set status=case when p_approved then 'in_progress' else 'waiting_customer' end,updated_at=now()
  where id=v_request.ticket_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(v_request.organization_id,auth.uid(),
    case when p_approved then 'support.access_approved' else 'support.access_denied' end,
    'platform_support_access',p_request_id::text,jsonb_build_object('ticket_id',v_request.ticket_id));
end;
$$;

create or replace function public.start_support_access(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.platform_support_access_requests%rowtype;
  v_expires timestamptz;
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;
  select * into v_request from public.platform_support_access_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'Demande introuvable.'; end if;
  if v_request.requested_by <> auth.uid() then raise exception 'Cette autorisation appartient à un autre administrateur.'; end if;
  if v_request.status <> 'approved' then raise exception 'L’entreprise doit d’abord autoriser la prise en main.'; end if;
  if not exists (select 1 from public.platform_support_tickets where id=v_request.ticket_id and status in ('open','in_progress','waiting_customer')) then
    raise exception 'Le ticket n’est plus ouvert.';
  end if;

  update public.platform_support_access_requests
  set status='ended',ended_at=now(),updated_at=now()
  where requested_by=auth.uid() and status='active';

  v_expires := now() + make_interval(mins => v_request.duration_minutes);
  update public.platform_support_access_requests
  set status='active',started_at=now(),expires_at=v_expires,ended_at=null,updated_at=now()
  where id=p_request_id;

  insert into public.platform_support_messages(ticket_id,organization_id,sender_id,sender_kind,body)
  values(v_request.ticket_id,v_request.organization_id,null,'system',
    'La session d’assistance NCR a commencé pour '||v_request.duration_minutes||' minutes. Un bandeau restera visible pendant toute l’intervention.');

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(v_request.organization_id,auth.uid(),'platform.support_session_started','platform_support_access',p_request_id::text,
    jsonb_build_object('ticket_id',v_request.ticket_id,'expires_at',v_expires));

  return jsonb_build_object('request_id',p_request_id,'organization_id',v_request.organization_id,'expires_at',v_expires);
end;
$$;

create or replace function public.revoke_support_access(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.platform_support_access_requests%rowtype;
  v_is_customer boolean;
begin
  select * into v_request from public.platform_support_access_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'Demande introuvable.'; end if;
  v_is_customer := public.has_actual_org_role(v_request.organization_id,array['owner','admin']);
  if not v_is_customer and not (public.is_platform_admin() and v_request.requested_by=auth.uid()) then raise exception 'Accès refusé.'; end if;
  if v_request.status not in ('pending','approved','active') then raise exception 'Cette autorisation est déjà terminée.'; end if;

  update public.platform_support_access_requests
  set status=case when v_request.status='pending' and not v_is_customer then 'cancelled' else 'revoked' end,
      ended_at=now(),updated_at=now()
  where id=p_request_id;

  insert into public.platform_support_messages(ticket_id,organization_id,sender_id,sender_kind,body)
  values(v_request.ticket_id,v_request.organization_id,null,'system',
    case when v_is_customer then 'L’entreprise a révoqué l’accès d’assistance.' else 'L’équipe NCR a terminé ou annulé la demande d’accès.' end);

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(v_request.organization_id,auth.uid(),'platform.support_access_revoked','platform_support_access',p_request_id::text,
    jsonb_build_object('ticket_id',v_request.ticket_id,'previous_status',v_request.status));
end;
$$;

create or replace function public.end_my_support_access_session()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;
  for v_row in
    select id,ticket_id,organization_id from public.platform_support_access_requests
    where requested_by=auth.uid() and status='active'
    for update
  loop
    update public.platform_support_access_requests set status='ended',ended_at=now(),updated_at=now() where id=v_row.id;
    insert into public.platform_support_messages(ticket_id,organization_id,sender_id,sender_kind,body)
    values(v_row.ticket_id,v_row.organization_id,null,'system','L’équipe NCR a quitté l’espace entreprise et terminé la session d’assistance.');
    insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
    values(v_row.organization_id,auth.uid(),'platform.support_session_ended','platform_support_access',v_row.id::text,jsonb_build_object('ticket_id',v_row.ticket_id));
  end loop;
end;
$$;

-- 6) Chargement de l'entreprise lorsqu'un administrateur NCR est en assistance
create or replace function public.get_my_active_support_session()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then return null; end if;

  select jsonb_build_object(
    'id',r.id,
    'ticket_id',r.ticket_id,
    'organization_id',r.organization_id,
    'reason',r.reason,
    'duration_minutes',r.duration_minutes,
    'started_at',r.started_at,
    'expires_at',r.expires_at,
    'organization', to_jsonb(o) || jsonb_build_object(
      'role','admin',
      'custom_role_id',null,
      'custom_role_label','Assistance NCR',
      'custom_module_keys','[]'::jsonb,
      'enabled_modules',coalesce((select jsonb_agg(m.module_key order by m.module_key) from public.organization_modules m where m.organization_id=o.id and m.enabled=true),'[]'::jsonb)
    )
  ) into v_result
  from public.platform_support_access_requests r
  join public.organizations o on o.id=r.organization_id
  join public.platform_support_tickets t on t.id=r.ticket_id
  where r.requested_by=auth.uid()
    and r.status='active'
    and r.expires_at > now()
    and t.status in ('open','in_progress','waiting_customer')
    and o.status <> 'closed'
  order by r.started_at desc
  limit 1;

  return v_result;
end;
$$;

-- Fermer automatiquement les autorisations si le ticket est résolu ou fermé.
create or replace function public.close_support_access_with_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('resolved','closed') and old.status is distinct from new.status then
    update public.platform_support_access_requests
    set status=case when status='active' then 'ended' else 'cancelled' end,
        ended_at=now(),updated_at=now()
    where ticket_id=new.id and status in ('pending','approved','active');
  end if;
  return new;
end;
$$;

drop trigger if exists close_support_access_on_ticket_close on public.platform_support_tickets;
create trigger close_support_access_on_ticket_close
after update of status on public.platform_support_tickets
for each row execute procedure public.close_support_access_with_ticket();

-- Permissions
revoke all on function public.has_actual_org_role(uuid,text[]) from public;
revoke all on function public.has_active_support_access(uuid) from public;
revoke all on function public.get_support_ticket_thread(uuid) from public;
revoke all on function public.send_support_ticket_message(uuid,text) from public;
revoke all on function public.request_support_access(uuid,text,integer) from public;
revoke all on function public.respond_support_access(uuid,boolean) from public;
revoke all on function public.start_support_access(uuid) from public;
revoke all on function public.revoke_support_access(uuid) from public;
revoke all on function public.end_my_support_access_session() from public;
revoke all on function public.get_my_active_support_session() from public;

grant execute on function public.has_actual_org_role(uuid,text[]) to authenticated;
grant execute on function public.has_active_support_access(uuid) to authenticated;
grant execute on function public.get_support_ticket_thread(uuid) to authenticated;
grant execute on function public.send_support_ticket_message(uuid,text) to authenticated;
grant execute on function public.request_support_access(uuid,text,integer) to authenticated;
grant execute on function public.respond_support_access(uuid,boolean) to authenticated;
grant execute on function public.start_support_access(uuid) to authenticated;
grant execute on function public.revoke_support_access(uuid) to authenticated;
grant execute on function public.end_my_support_access_session() to authenticated;
grant execute on function public.get_my_active_support_session() to authenticated;
