-- NCR Suite V2.24.0 - Acces portails et alertes super-administrateur
-- A executer apres 091_showcase_polish_release.sql.

begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null
     or to_regclass('public.training_portal_invitations') is null
     or to_regclass('public.platform_support_tickets') is null then
    raise exception 'Les migrations NCR Suite precedentes doivent etre executees avant la V2.24.0.';
  end if;
end;
$$;

-- Le jeton brut n'est jamais conserve. Cette fonction le renouvelle et ne
-- retourne que le lien au proprietaire ou a un administrateur de l'entreprise.
create or replace function public.prepare_training_portal_manual_link(
  p_organization_id uuid,
  p_invitation_id uuid
)
returns text
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_token text;
  v_invitation public.training_portal_invitations%rowtype;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Seuls le proprietaire et les administrateurs peuvent preparer ce lien.';
  end if;
  if not public.training_portals_feature_enabled(p_organization_id) then
    raise exception 'Le module Portails et signatures n est pas actif.';
  end if;

  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  update public.training_portal_invitations
  set token_hash=extensions.digest(v_token,'sha256'),
      status='pending',
      expires_at=now()+interval '7 days',
      revoked_at=null,
      updated_at=now()
  where organization_id=p_organization_id
    and id=p_invitation_id
    and status in ('pending','expired')
  returning * into v_invitation;

  if v_invitation.id is null then
    raise exception 'Invitation introuvable ou deja utilisee.';
  end if;

  insert into public.audit_logs(
    organization_id,user_id,action,entity_type,entity_id,metadata
  ) values (
    p_organization_id,
    auth.uid(),
    'training.portal_manual_link_prepared',
    'training_portal_invitation',
    v_invitation.id::text,
    jsonb_build_object(
      'subject_kind',v_invitation.subject_kind,
      'email',v_invitation.email,
      'expires_at',v_invitation.expires_at
    )
  );

  return '/formation/invitation/'||v_token;
end;
$$;

revoke all on function public.prepare_training_portal_manual_link(uuid,uuid)
  from public,anon;
grant execute on function public.prepare_training_portal_manual_link(uuid,uuid)
  to authenticated;

-- Les alertes de la console centrale sont separees des notifications propres
-- aux entreprises : un super-administrateur n'a pas a devenir membre client.
create table if not exists public.platform_admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  category text not null check (
    category in ('access','support','subscription','module','system')
  ),
  event_type text not null,
  title text not null check (char_length(trim(title)) between 2 and 180),
  body text not null check (char_length(trim(body)) between 2 and 1000),
  target_section text not null default 'cockpit' check (
    target_section in ('cockpit','access','support','billing')
  ),
  urgency text not null default 'normal' check (
    urgency in ('low','normal','high','critical')
  ),
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_admin_notifications_recipient
  on public.platform_admin_notifications(recipient_user_id,created_at desc);
create index if not exists idx_platform_admin_notifications_unread
  on public.platform_admin_notifications(recipient_user_id,created_at desc)
  where read_at is null;

alter table public.platform_admin_notifications enable row level security;
revoke all on public.platform_admin_notifications from public,anon,authenticated;
grant select on public.platform_admin_notifications to authenticated;

drop policy if exists platform_admin_notifications_select_own
  on public.platform_admin_notifications;
create policy platform_admin_notifications_select_own
on public.platform_admin_notifications
for select to authenticated
using (
  recipient_user_id=auth.uid()
  and public.is_platform_admin()
);

create or replace function public.enqueue_platform_admin_notification_internal(
  p_organization_id uuid,
  p_category text,
  p_event_type text,
  p_title text,
  p_body text,
  p_target_section text,
  p_urgency text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_prefix text default null
)
returns integer
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_admin record;
  v_count integer:=0;
  v_prefix text;
begin
  if p_category not in ('access','support','subscription','module','system')
     or p_target_section not in ('cockpit','access','support','billing')
     or p_urgency not in ('low','normal','high','critical') then
    raise exception 'Notification super-administrateur invalide.';
  end if;

  v_prefix:=coalesce(
    nullif(trim(p_dedupe_prefix),''),
    p_event_type||':'||coalesce(p_entity_id,gen_random_uuid()::text)
  );

  for v_admin in
    select user_id
    from public.platform_admins
    where active=true and role='super_admin'
  loop
    insert into public.platform_admin_notifications(
      recipient_user_id,organization_id,category,event_type,title,body,
      target_section,urgency,entity_type,entity_id,metadata,dedupe_key
    ) values (
      v_admin.user_id,p_organization_id,p_category,p_event_type,
      left(trim(p_title),180),left(trim(p_body),1000),
      p_target_section,p_urgency,p_entity_type,p_entity_id,
      coalesce(p_metadata,'{}'::jsonb),
      v_prefix||':'||v_admin.user_id::text
    )
    on conflict(dedupe_key) do nothing;
    if found then v_count:=v_count+1; end if;
  end loop;

  return v_count;
end;
$$;

create or replace function public.mark_platform_admin_notifications_read(
  p_notification_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Acces administrateur NCR requis.';
  end if;

  update public.platform_admin_notifications
  set read_at=coalesce(read_at,now())
  where recipient_user_id=auth.uid()
    and read_at is null
    and (p_notification_id is null or id=p_notification_id);
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

create or replace function public.notify_platform_admin_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_org_name text;
begin
  select coalesce(public_name,name) into v_org_name
  from public.organizations where id=new.organization_id;

  perform public.enqueue_platform_admin_notification_internal(
    new.organization_id,
    'support',
    'support.ticket_created',
    'Nouveau ticket support',
    coalesce(v_org_name,'Entreprise')||' : '||new.subject,
    'support',
    case when new.priority='urgent' then 'critical'
         when new.priority='high' then 'high'
         else 'normal' end,
    'platform_support_ticket',
    new.id::text,
    jsonb_build_object('priority',new.priority,'category',new.category),
    'support.ticket_created:'||new.id::text
  );
  return new;
end;
$$;

create or replace function public.notify_platform_admin_support_message()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_subject text;
  v_org_name text;
begin
  if new.sender_kind<>'customer' or new.is_initial then return new; end if;

  select t.subject,coalesce(o.public_name,o.name)
  into v_subject,v_org_name
  from public.platform_support_tickets t
  join public.organizations o on o.id=t.organization_id
  where t.id=new.ticket_id;

  perform public.enqueue_platform_admin_notification_internal(
    new.organization_id,
    'support',
    'support.customer_replied',
    'Nouvelle reponse client',
    coalesce(v_org_name,'Entreprise')||' : '||coalesce(v_subject,'Ticket support'),
    'support',
    'high',
    'platform_support_ticket',
    new.ticket_id::text,
    jsonb_build_object('message_id',new.id),
    'support.customer_replied:'||new.id::text
  );
  return new;
end;
$$;

create or replace function public.notify_platform_admin_access_request()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
begin
  perform public.enqueue_platform_admin_notification_internal(
    null,
    'access',
    'access.request_created',
    'Nouvelle demande d acces',
    new.company_name||' : '||new.full_name,
    'access',
    'high',
    'platform_access_request',
    new.id::text,
    jsonb_build_object(
      'reference',new.reference,
      'business_type',new.business_type
    ),
    'access.request_created:'||new.id::text
  );
  return new;
end;
$$;

create or replace function public.notify_platform_admin_subscription_request()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_org_name text;
begin
  select coalesce(public_name,name) into v_org_name
  from public.organizations where id=new.organization_id;

  perform public.enqueue_platform_admin_notification_internal(
    new.organization_id,
    'subscription',
    'subscription.change_requested',
    'Demande d abonnement',
    coalesce(v_org_name,'Entreprise')||' : '||new.current_plan||' vers '||new.requested_plan,
    'billing',
    'high',
    'subscription_change_request',
    new.id::text,
    jsonb_build_object(
      'reference',new.request_reference,
      'request_type',new.request_type,
      'status',new.status
    ),
    'subscription.change_requested:'||new.id::text
  );
  return new;
end;
$$;

create or replace function public.notify_platform_admin_security_module_request()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_org_name text;
  v_module_name text;
begin
  select coalesce(public_name,name) into v_org_name
  from public.organizations where id=new.organization_id;
  select display_name into v_module_name
  from public.security_addon_catalog where addon_key=new.addon_key;

  perform public.enqueue_platform_admin_notification_internal(
    new.organization_id,
    'module',
    'security.module_change_requested',
    'Demande de module Securite',
    coalesce(v_org_name,'Entreprise')||' : '||
      case when new.action='add' then 'ajout de ' else 'retrait de ' end||
      coalesce(v_module_name,new.addon_key),
    'billing',
    'high',
    'security_addon_change_request',
    new.id::text,
    jsonb_build_object(
      'reference',new.request_reference,
      'action',new.action,
      'status',new.status
    ),
    'security.module_change_requested:'||new.id::text
  );
  return new;
end;
$$;

create or replace function public.notify_platform_admin_training_module_request()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_org_name text;
  v_module_name text;
begin
  select coalesce(public_name,name) into v_org_name
  from public.organizations where id=new.organization_id;
  select display_name into v_module_name
  from public.training_module_catalog where module_key=new.module_key;

  perform public.enqueue_platform_admin_notification_internal(
    new.organization_id,
    'module',
    'training.module_change_requested',
    'Demande de module Formation',
    coalesce(v_org_name,'Entreprise')||' : '||
      case when new.action='add' then 'ajout de ' else 'retrait de ' end||
      coalesce(v_module_name,new.module_key),
    'billing',
    'high',
    'training_module_change_request',
    new.id::text,
    jsonb_build_object(
      'reference',new.request_reference,
      'action',new.action,
      'status',new.status
    ),
    'training.module_change_requested:'||new.id::text
  );
  return new;
end;
$$;

drop trigger if exists notify_platform_admin_support_ticket_insert
  on public.platform_support_tickets;
create trigger notify_platform_admin_support_ticket_insert
after insert on public.platform_support_tickets
for each row execute procedure public.notify_platform_admin_support_ticket();

drop trigger if exists notify_platform_admin_support_message_insert
  on public.platform_support_messages;
create trigger notify_platform_admin_support_message_insert
after insert on public.platform_support_messages
for each row execute procedure public.notify_platform_admin_support_message();

drop trigger if exists notify_platform_admin_access_request_insert
  on public.platform_access_requests;
create trigger notify_platform_admin_access_request_insert
after insert on public.platform_access_requests
for each row execute procedure public.notify_platform_admin_access_request();

drop trigger if exists notify_platform_admin_subscription_request_insert
  on public.subscription_change_requests;
create trigger notify_platform_admin_subscription_request_insert
after insert on public.subscription_change_requests
for each row execute procedure public.notify_platform_admin_subscription_request();

drop trigger if exists notify_platform_admin_security_module_request_insert
  on public.security_addon_change_requests;
create trigger notify_platform_admin_security_module_request_insert
after insert on public.security_addon_change_requests
for each row execute procedure public.notify_platform_admin_security_module_request();

drop trigger if exists notify_platform_admin_training_module_request_insert
  on public.training_module_change_requests;
create trigger notify_platform_admin_training_module_request_insert
after insert on public.training_module_change_requests
for each row execute procedure public.notify_platform_admin_training_module_request();

revoke all on function public.enqueue_platform_admin_notification_internal(
  uuid,text,text,text,text,text,text,text,text,jsonb,text
) from public,anon,authenticated;
revoke all on function public.mark_platform_admin_notifications_read(uuid)
  from public,anon;
grant execute on function public.mark_platform_admin_notifications_read(uuid)
  to authenticated;

revoke all on function public.notify_platform_admin_support_ticket()
  from public,anon,authenticated;
revoke all on function public.notify_platform_admin_support_message()
  from public,anon,authenticated;
revoke all on function public.notify_platform_admin_access_request()
  from public,anon,authenticated;
revoke all on function public.notify_platform_admin_subscription_request()
  from public,anon,authenticated;
revoke all on function public.notify_platform_admin_security_module_request()
  from public,anon,authenticated;
revoke all on function public.notify_platform_admin_training_module_request()
  from public,anon,authenticated;

insert into public.platform_release_state(
  singleton,
  database_version,
  expected_frontend_version,
  expected_pwa_cache,
  installed_at,
  installed_by,
  notes
) values (
  true,
  '2.24.0',
  '2.24.0',
  'ncr-suite-shell-v2.24.0-portal-access-support-alerts',
  now(),
  auth.uid(),
  'V2.24.0 : lien manuel Formation securise, acces aux portails depuis la connexion et alertes actives dans la console super-administrateur.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
