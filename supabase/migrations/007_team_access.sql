-- NCR Suite V1.7.1 — comptes d’équipe, invitations, limites d’offre et permissions
-- À exécuter après 006_email_notifications.sql.
-- Correctif : fonctions pgcrypto qualifiées dans le schéma extensions de Supabase.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','manager','employee','viewer')),
  staff_id uuid,
  token_hash bytea not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_invitations_staff_same_org_fk
    foreign key (organization_id, staff_id)
    references public.staff (organization_id, id)
    on delete set null
);

create unique index if not exists idx_org_invitations_pending_email
  on public.organization_invitations(organization_id, lower(email))
  where status = 'pending';

create unique index if not exists idx_org_invitations_pending_staff
  on public.organization_invitations(organization_id, staff_id)
  where status = 'pending' and staff_id is not null;

create index if not exists idx_org_invitations_org_status
  on public.organization_invitations(organization_id, status, created_at desc);

create index if not exists idx_staff_linked_user
  on public.staff(organization_id, linked_user_id)
  where linked_user_id is not null;

drop trigger if exists set_organization_invitations_updated_at on public.organization_invitations;
create trigger set_organization_invitations_updated_at before update on public.organization_invitations
for each row execute procedure public.set_updated_at();

alter table public.organization_invitations enable row level security;
-- Les invitations sont lues et modifiées uniquement via les fonctions sécurisées ci-dessous.
revoke all on public.organization_invitations from anon, authenticated;

create or replace function public.plan_member_limit(p_plan text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_plan
    when 'decouverte' then 1
    when 'essentielle' then 3
    when 'professionnelle' then 10
    when 'metier' then 100
    else 1
  end;
$$;

create or replace function public.plan_rank(p_plan text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_plan
    when 'decouverte' then 1
    when 'essentielle' then 2
    when 'professionnelle' then 3
    when 'metier' then 4
    else 0
  end;
$$;

create or replace function public.current_org_staff_id(p_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.staff s
  where s.organization_id = p_organization_id
    and s.linked_user_id = auth.uid()
    and s.active = true
  limit 1;
$$;

create or replace function public.can_access_staff_record(p_organization_id uuid, p_staff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_org_role(p_organization_id, array['owner','admin','manager'])
    or exists (
      select 1
      from public.staff s
      where s.organization_id = p_organization_id
        and s.id = p_staff_id
        and s.linked_user_id = auth.uid()
        and s.active = true
    );
$$;

create or replace function public.can_access_appointment(p_organization_id uuid, p_staff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_org_role(p_organization_id, array['owner','admin','manager'])
    or exists (
      select 1
      from public.staff s
      where s.organization_id = p_organization_id
        and s.id = p_staff_id
        and s.linked_user_id = auth.uid()
        and s.active = true
    );
$$;

create or replace function public.can_access_client(p_organization_id uuid, p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_org_role(p_organization_id, array['owner','admin','manager'])
    or exists (
      select 1
      from public.appointments a
      join public.staff s
        on s.organization_id = a.organization_id
       and s.id = a.staff_id
      where a.organization_id = p_organization_id
        and a.client_id = p_client_id
        and s.linked_user_id = auth.uid()
        and s.active = true
    );
$$;

create or replace function public.team_plan_summary(p_organization_id uuid)
returns table (
  plan text,
  member_limit integer,
  active_members integer,
  pending_invitations integer,
  available_seats integer,
  invitations_enabled boolean,
  manager_role_enabled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_active integer;
  v_pending integer;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;

  select o.plan into v_plan
  from public.organizations o
  where o.id = p_organization_id;

  v_limit := public.plan_member_limit(v_plan);

  select count(*)::integer into v_active
  from public.organization_members m
  where m.organization_id = p_organization_id
    and m.status = 'active';

  select count(*)::integer into v_pending
  from public.organization_invitations i
  where i.organization_id = p_organization_id
    and i.status = 'pending'
    and i.expires_at > now();

  return query select
    v_plan,
    v_limit,
    v_active,
    v_pending,
    greatest(v_limit - v_active - v_pending, 0),
    public.plan_rank(v_plan) >= 2,
    public.plan_rank(v_plan) >= 3;
end;
$$;

create or replace function public.list_team_members(p_organization_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text,
  status text,
  staff_id uuid,
  staff_name text,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  return query
  select
    m.user_id,
    u.email::text,
    coalesce(nullif(trim(p.full_name), ''), split_part(u.email::text, '@', 1))::text,
    m.role,
    m.status,
    s.id,
    s.display_name,
    m.created_at
  from public.organization_members m
  join auth.users u on u.id = m.user_id
  left join public.user_profiles p on p.id = m.user_id
  left join public.staff s
    on s.organization_id = m.organization_id
   and s.linked_user_id = m.user_id
  where m.organization_id = p_organization_id
  order by case m.role when 'owner' then 0 when 'admin' then 1 when 'manager' then 2 else 3 end,
           coalesce(p.full_name, u.email::text);
end;
$$;

create or replace function public.list_team_invitations(p_organization_id uuid)
returns table (
  invitation_id uuid,
  email text,
  role text,
  staff_id uuid,
  staff_name text,
  status text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  return query
  select
    i.id,
    i.email,
    i.role,
    i.staff_id,
    s.display_name,
    case when i.status = 'pending' and i.expires_at <= now() then 'expired' else i.status end,
    i.expires_at,
    i.created_at
  from public.organization_invitations i
  left join public.staff s
    on s.organization_id = i.organization_id
   and s.id = i.staff_id
  where i.organization_id = p_organization_id
    and i.status in ('pending','expired')
  order by i.created_at desc;
end;
$$;

create or replace function public.get_team_invitation(p_token text)
returns table (
  organization_name text,
  organization_color text,
  invited_email text,
  invited_role text,
  staff_name text,
  invitation_status text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.name,
    o.primary_color,
    i.email,
    i.role,
    s.display_name,
    case
      when i.status = 'pending' and i.expires_at <= now() then 'expired'
      else i.status
    end,
    i.expires_at
  from public.organization_invitations i
  join public.organizations o on o.id = i.organization_id
  left join public.staff s
    on s.organization_id = i.organization_id
   and s.id = i.staff_id
  where i.token_hash = extensions.digest(trim(p_token), 'sha256')
  limit 1;
$$;

create or replace function public.enqueue_team_invitation_email(
  p_invitation_id uuid,
  p_raw_token text,
  p_allow_resend boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.organization_invitations%rowtype;
  v_organization public.organizations%rowtype;
  v_staff_name text;
  v_key text;
begin
  select * into v_invitation
  from public.organization_invitations
  where id = p_invitation_id;

  if v_invitation.id is null or v_invitation.status <> 'pending' then
    return;
  end if;

  select * into v_organization
  from public.organizations
  where id = v_invitation.organization_id;

  select display_name into v_staff_name
  from public.staff
  where organization_id = v_invitation.organization_id
    and id = v_invitation.staff_id;

  v_key := 'team-invitation:' || v_invitation.id::text || ':' || extract(epoch from v_invitation.updated_at)::bigint::text;

  insert into public.email_outbox (
    organization_id,
    appointment_id,
    template_key,
    recipient_email,
    recipient_name,
    payload,
    dedupe_key,
    status,
    scheduled_for,
    attempts,
    locked_at,
    sent_at,
    provider_message_id,
    last_error
  ) values (
    v_invitation.organization_id,
    null,
    'team_invitation',
    lower(v_invitation.email),
    nullif(trim(coalesce(v_staff_name, '')), ''),
    jsonb_build_object(
      'invitation_id', v_invitation.id,
      'organization_name', v_organization.name,
      'organization_primary_color', v_organization.primary_color,
      'invitation_token', p_raw_token,
      'invited_role', v_invitation.role,
      'staff_name', v_staff_name,
      'expires_at', v_invitation.expires_at
    ),
    v_key,
    'pending',
    now(),
    0,
    null,
    null,
    null,
    null
  )
  on conflict (dedupe_key) do update
  set status = case when p_allow_resend then 'pending' else public.email_outbox.status end,
      scheduled_for = now(),
      attempts = case when p_allow_resend then 0 else public.email_outbox.attempts end,
      locked_at = case when p_allow_resend then null else public.email_outbox.locked_at end,
      sent_at = case when p_allow_resend then null else public.email_outbox.sent_at end,
      provider_message_id = case when p_allow_resend then null else public.email_outbox.provider_message_id end,
      last_error = case when p_allow_resend then null else public.email_outbox.last_error end,
      payload = excluded.payload,
      updated_at = now();
end;
$$;

create or replace function public.create_team_invitation(
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_staff_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_used integer;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text;
  v_invitation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seul le propriétaire peut gérer les accès de l’équipe.';
  end if;

  select plan into v_plan from public.organizations where id = p_organization_id;
  if public.plan_rank(v_plan) < 2 then
    raise exception 'Fonction disponible à partir de l’offre Essentielle.';
  end if;

  if v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Adresse e-mail invalide.';
  end if;

  if p_role not in ('admin','manager','employee','viewer') then
    raise exception 'Rôle invalide.';
  end if;

  if v_plan = 'essentielle' and p_role <> 'employee' then
    raise exception 'L’offre Essentielle autorise uniquement les accès Collaborateur.';
  end if;

  if v_plan = 'professionnelle' and p_role not in ('manager','employee') then
    raise exception 'Ce rôle nécessite l’offre Métier.';
  end if;

  if p_role = 'employee' and p_staff_id is null then
    raise exception 'Sélectionnez le collaborateur correspondant à cet accès.';
  end if;

  if p_staff_id is not null and not exists (
    select 1 from public.staff s
    where s.organization_id = p_organization_id
      and s.id = p_staff_id
      and s.active = true
      and s.linked_user_id is null
  ) then
    raise exception 'Ce collaborateur est introuvable, inactif ou possède déjà un accès.';
  end if;

  if p_staff_id is not null and exists (
    select 1 from public.organization_invitations i
    where i.organization_id = p_organization_id
      and i.staff_id = p_staff_id
      and i.status = 'pending'
      and i.expires_at > now()
  ) then
    raise exception 'Une invitation active existe déjà pour ce collaborateur.';
  end if;

  if exists (
    select 1
    from public.organization_members m
    join auth.users u on u.id = m.user_id
    where m.organization_id = p_organization_id
      and lower(u.email::text) = v_email
      and m.status in ('active','disabled')
  ) then
    raise exception 'Cette adresse possède déjà un accès à l’entreprise.';
  end if;

  if exists (
    select 1 from public.organization_invitations i
    where i.organization_id = p_organization_id
      and lower(i.email) = v_email
      and i.status = 'pending'
      and i.expires_at > now()
  ) then
    raise exception 'Une invitation active existe déjà pour cette adresse.';
  end if;

  v_limit := public.plan_member_limit(v_plan);
  select
    (select count(*) from public.organization_members m where m.organization_id = p_organization_id and m.status = 'active')
    +
    (select count(*) from public.organization_invitations i where i.organization_id = p_organization_id and i.status = 'pending' and i.expires_at > now())
  into v_used;

  if v_used >= v_limit then
    raise exception 'La limite de % utilisateur(s) de votre offre est atteinte.', v_limit;
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.organization_invitations (
    organization_id, email, role, staff_id, token_hash, expires_at, invited_by
  ) values (
    p_organization_id, v_email, p_role, p_staff_id, extensions.digest(v_token, 'sha256'), now() + interval '7 days', auth.uid()
  ) returning id into v_invitation_id;

  perform public.enqueue_team_invitation_email(v_invitation_id, v_token, false);

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'team.invitation_created',
    'organization_invitation',
    v_invitation_id::text,
    jsonb_build_object('email', v_email, 'role', p_role, 'staff_id', p_staff_id)
  );

  return v_invitation_id;
end;
$$;

create or replace function public.resend_team_invitation(
  p_organization_id uuid,
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_updated_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  update public.organization_invitations
  set token_hash = extensions.digest(v_token, 'sha256'),
      status = 'pending',
      expires_at = now() + interval '7 days',
      revoked_at = null,
      updated_at = now()
  where id = p_invitation_id
    and organization_id = p_organization_id
    and status in ('pending','expired')
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Invitation introuvable ou déjà utilisée.';
  end if;

  update public.email_outbox
  set status = 'cancelled', last_error = 'Invitation remplacée par un nouvel envoi.', updated_at = now()
  where template_key = 'team_invitation'
    and payload->>'invitation_id' = v_updated_id::text
    and status in ('pending','failed');

  perform public.enqueue_team_invitation_email(v_updated_id, v_token, true);

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  values (p_organization_id, auth.uid(), 'team.invitation_resent', 'organization_invitation', v_updated_id::text);
end;
$$;

create or replace function public.revoke_team_invitation(
  p_organization_id uuid,
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  update public.organization_invitations
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where id = p_invitation_id
    and organization_id = p_organization_id
    and status in ('pending','expired')
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Invitation introuvable ou déjà utilisée.';
  end if;

  update public.email_outbox
  set status = 'cancelled', last_error = 'Invitation révoquée.', updated_at = now()
  where template_key = 'team_invitation'
    and payload->>'invitation_id' = p_invitation_id::text
    and organization_id = p_organization_id
    and status in ('pending','failed');

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  values (p_organization_id, auth.uid(), 'team.invitation_revoked', 'organization_invitation', v_updated_id::text);
end;
$$;

create or replace function public.accept_team_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.organization_invitations%rowtype;
  v_user_email text;
  v_plan text;
  v_limit integer;
  v_active integer;
begin
  if auth.uid() is null then
    raise exception 'Connectez-vous pour accepter cette invitation.';
  end if;

  select lower(email::text) into v_user_email
  from auth.users
  where id = auth.uid();

  select * into v_invitation
  from public.organization_invitations
  where token_hash = extensions.digest(trim(p_token), 'sha256')
  for update;

  if v_invitation.id is null then
    raise exception 'Invitation introuvable.';
  end if;

  if v_invitation.status <> 'pending' or v_invitation.expires_at <= now() then
    if v_invitation.status = 'pending' then
      update public.organization_invitations set status = 'expired', updated_at = now() where id = v_invitation.id;
    end if;
    raise exception 'Cette invitation n’est plus valide.';
  end if;

  if v_user_email is null or v_user_email <> lower(v_invitation.email) then
    raise exception 'Connectez-vous avec l’adresse e-mail qui a reçu l’invitation.';
  end if;

  select plan into v_plan from public.organizations where id = v_invitation.organization_id;
  v_limit := public.plan_member_limit(v_plan);

  select count(*)::integer into v_active
  from public.organization_members
  where organization_id = v_invitation.organization_id
    and status = 'active'
    and user_id <> auth.uid();

  if v_active >= v_limit then
    raise exception 'La limite d’utilisateurs de cette entreprise est atteinte.';
  end if;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_invitation.organization_id, auth.uid(), v_invitation.role, 'active')
  on conflict (organization_id, user_id) do update
  set role = case
        when public.organization_members.role = 'owner' then 'owner'
        else excluded.role
      end,
      status = 'active';

  if v_invitation.staff_id is not null then
    update public.staff
    set linked_user_id = auth.uid(),
        email = coalesce(email, v_user_email),
        updated_at = now()
    where organization_id = v_invitation.organization_id
      and id = v_invitation.staff_id
      and linked_user_id is null;
  end if;

  update public.organization_invitations
  set status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now(),
      updated_at = now()
  where id = v_invitation.id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    v_invitation.organization_id,
    auth.uid(),
    'team.invitation_accepted',
    'organization_member',
    auth.uid()::text,
    jsonb_build_object('role', v_invitation.role, 'staff_id', v_invitation.staff_id)
  );

  return v_invitation.organization_id;
end;
$$;

create or replace function public.update_team_member_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_current_role text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  select role into v_current_role
  from public.organization_members
  where organization_id = p_organization_id and user_id = p_user_id;

  if v_current_role is null then raise exception 'Utilisateur introuvable.'; end if;
  if v_current_role = 'owner' then raise exception 'Le rôle du propriétaire ne peut pas être modifié.'; end if;

  select plan into v_plan from public.organizations where id = p_organization_id;
  if v_plan = 'essentielle' and p_role <> 'employee' then
    raise exception 'Le rôle Responsable nécessite l’offre Professionnelle.';
  end if;
  if v_plan = 'professionnelle' and p_role not in ('manager','employee') then
    raise exception 'Ce rôle nécessite l’offre Métier.';
  end if;
  if v_plan = 'metier' and p_role not in ('admin','manager','employee','viewer') then
    raise exception 'Rôle invalide.';
  end if;

  if p_role = 'employee' and not exists (
    select 1 from public.staff
    where organization_id = p_organization_id and linked_user_id = p_user_id
  ) then
    raise exception 'Associez d’abord cet utilisateur à un collaborateur.';
  end if;

  update public.organization_members
  set role = p_role
  where organization_id = p_organization_id and user_id = p_user_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'team.role_updated', 'organization_member', p_user_id::text, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.set_team_member_status(
  p_organization_id uuid,
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_plan text;
  v_limit integer;
  v_active integer;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  if p_status not in ('active','disabled') then raise exception 'Statut invalide.'; end if;
  if p_user_id = auth.uid() then raise exception 'Vous ne pouvez pas suspendre votre propre accès.'; end if;

  select role into v_role
  from public.organization_members
  where organization_id = p_organization_id and user_id = p_user_id;

  if v_role is null then raise exception 'Utilisateur introuvable.'; end if;
  if v_role = 'owner' then raise exception 'Le propriétaire ne peut pas être suspendu.'; end if;

  if p_status = 'active' then
    select plan into v_plan from public.organizations where id = p_organization_id;
    v_limit := public.plan_member_limit(v_plan);
    select count(*)::integer into v_active
    from public.organization_members
    where organization_id = p_organization_id and status = 'active';
    if v_active >= v_limit then raise exception 'La limite d’utilisateurs de l’offre est atteinte.'; end if;
  end if;

  update public.organization_members
  set status = p_status
  where organization_id = p_organization_id and user_id = p_user_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'team.status_updated', 'organization_member', p_user_id::text, jsonb_build_object('status', p_status));
end;
$$;

-- Le modèle d’e-mail d’invitation rejoint la file transactionnelle existante.
alter table public.email_outbox
  drop constraint if exists email_outbox_template_key_check;
alter table public.email_outbox
  add constraint email_outbox_template_key_check check (template_key in (
    'customer_pending',
    'customer_confirmed',
    'customer_rescheduled',
    'customer_cancelled',
    'customer_reminder',
    'business_new_booking',
    'business_rescheduled',
    'business_cancelled',
    'team_invitation'
  ));

-- Permissions de lecture : un collaborateur connecté ne voit que son propre planning.
drop policy if exists "appointments_member_select" on public.appointments;
create policy "appointments_member_select" on public.appointments for select
using (public.can_access_appointment(organization_id, staff_id));

drop policy if exists "clients_member_select" on public.clients;
create policy "clients_member_select" on public.clients for select
using (public.can_access_client(organization_id, id));

drop policy if exists "clients_staff_insert" on public.clients;
drop policy if exists "clients_staff_update" on public.clients;
drop policy if exists "clients_manager_delete" on public.clients;
create policy "clients_manager_insert" on public.clients for insert
with check (public.has_org_role(organization_id, array['owner','admin','manager']));
create policy "clients_manager_update" on public.clients for update
using (public.has_org_role(organization_id, array['owner','admin','manager']))
with check (public.has_org_role(organization_id, array['owner','admin','manager']));
create policy "clients_manager_delete" on public.clients for delete
using (public.has_org_role(organization_id, array['owner','admin','manager']));

drop policy if exists "staff_member_select" on public.staff;
create policy "staff_member_select" on public.staff for select
using (public.can_access_staff_record(organization_id, id));

drop policy if exists "staff_services_member_select" on public.staff_services;
create policy "staff_services_member_select" on public.staff_services for select
using (public.can_access_staff_record(organization_id, staff_id));

drop policy if exists "staff_hours_member_select" on public.staff_working_hours;
create policy "staff_hours_member_select" on public.staff_working_hours for select
using (public.can_access_staff_record(organization_id, staff_id));

drop policy if exists "staff_breaks_member_select" on public.staff_breaks;
create policy "staff_breaks_member_select" on public.staff_breaks for select
using (public.can_access_staff_record(organization_id, staff_id));

-- Les accès d’équipe ne peuvent plus contourner les limites via des écritures directes.
revoke insert, update, delete on public.organization_members from authenticated;
grant select on public.organization_members to authenticated;

-- Un collaborateur ne peut plus créer ou déplacer un rendez-vous au nom d’un autre membre.
create or replace function public.save_appointment(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_status text default 'confirmed',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment_id uuid;
  v_timezone text;
  v_duration integer;
  v_amount integer;
  v_starts_local timestamp;
  v_ends_at timestamptz;
  v_ends_local timestamp;
  v_weekday smallint;
  v_start_time time;
  v_end_time time;
  v_work_start time;
  v_work_end time;
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;
  if p_status not in ('pending','confirmed','completed','cancelled','no_show') then
    raise exception 'Statut de rendez-vous invalide.';
  end if;

  select timezone into v_timezone from public.organizations where id = p_organization_id;
  if v_timezone is null then raise exception 'Entreprise introuvable.'; end if;

  if not exists (select 1 from public.clients where id = p_client_id and organization_id = p_organization_id and status = 'active') then
    raise exception 'Le client sélectionné est introuvable ou inactif.';
  end if;

  select duration_minutes, price_cents into v_duration, v_amount
  from public.services where id = p_service_id and organization_id = p_organization_id and active = true;
  if v_duration is null then raise exception 'La prestation sélectionnée est introuvable ou inactive.'; end if;

  if not exists (select 1 from public.staff where id = p_staff_id and organization_id = p_organization_id and active = true) then
    raise exception 'Le collaborateur sélectionné est introuvable ou inactif.';
  end if;
  if not exists (select 1 from public.staff_services where organization_id = p_organization_id and staff_id = p_staff_id and service_id = p_service_id) then
    raise exception 'Ce collaborateur ne réalise pas cette prestation.';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_starts_local := p_starts_at at time zone v_timezone;
  v_ends_local := v_ends_at at time zone v_timezone;
  if v_starts_local::date <> v_ends_local::date then raise exception 'Un rendez-vous ne peut pas se terminer le lendemain.'; end if;

  v_weekday := extract(isodow from v_starts_local)::smallint - 1;
  v_start_time := v_starts_local::time;
  v_end_time := v_ends_local::time;

  select start_time, end_time into v_work_start, v_work_end
  from public.staff_working_hours
  where organization_id = p_organization_id and staff_id = p_staff_id and weekday = v_weekday;
  if v_work_start is null then raise exception 'Le collaborateur ne travaille pas ce jour-là.'; end if;
  if v_start_time < v_work_start or v_end_time > v_work_end then raise exception 'Le rendez-vous se situe en dehors des horaires du collaborateur.'; end if;

  if exists (
    select 1 from public.staff_breaks
    where organization_id = p_organization_id and staff_id = p_staff_id and weekday = v_weekday
      and v_start_time < end_time and v_end_time > start_time
  ) then raise exception 'Le créneau chevauche une pause du collaborateur.'; end if;

  if p_status <> 'cancelled' and exists (
    select 1 from public.appointments a
    where a.organization_id = p_organization_id and a.staff_id = p_staff_id and a.status <> 'cancelled'
      and (p_appointment_id is null or a.id <> p_appointment_id)
      and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then raise exception 'Ce créneau est déjà occupé pour ce collaborateur.'; end if;

  if p_appointment_id is null then
    insert into public.appointments (
      organization_id, client_id, service_id, staff_id, starts_at, ends_at, status, notes,
      amount_cents, source, created_by, cancelled_at
    ) values (
      p_organization_id, p_client_id, p_service_id, p_staff_id, p_starts_at, v_ends_at, p_status, v_notes,
      v_amount, 'internal', auth.uid(), case when p_status = 'cancelled' then now() else null end
    ) returning id into v_appointment_id;
  else
    update public.appointments
    set client_id = p_client_id,
        service_id = p_service_id,
        staff_id = p_staff_id,
        starts_at = p_starts_at,
        ends_at = v_ends_at,
        status = p_status,
        notes = v_notes,
        amount_cents = v_amount,
        cancelled_at = case when p_status = 'cancelled' then coalesce(cancelled_at, now()) else null end,
        cancellation_reason = case when p_status = 'cancelled' then cancellation_reason else null end
    where id = p_appointment_id and organization_id = p_organization_id
    returning id into v_appointment_id;
    if v_appointment_id is null then raise exception 'Rendez-vous introuvable.'; end if;
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  values (p_organization_id, auth.uid(), case when p_appointment_id is null then 'appointment.created' else 'appointment.updated' end, 'appointment', v_appointment_id::text);
  return v_appointment_id;
exception when exclusion_violation then
  raise exception 'Ce créneau vient d’être réservé par une autre personne.';
end;
$$;

create or replace function public.set_appointment_status(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_status text,
  p_cancellation_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_id uuid;
  v_staff_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if p_status not in ('pending','confirmed','completed','cancelled','no_show') then raise exception 'Statut de rendez-vous invalide.'; end if;

  select staff_id into v_staff_id
  from public.appointments
  where id = p_appointment_id and organization_id = p_organization_id;

  if v_staff_id is null then raise exception 'Rendez-vous introuvable.'; end if;
  if not public.can_access_appointment(p_organization_id, v_staff_id) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;

  update public.appointments
  set status = p_status,
      cancelled_at = case when p_status = 'cancelled' then coalesce(cancelled_at, now()) else null end,
      cancellation_reason = case when p_status = 'cancelled' then nullif(trim(coalesce(p_cancellation_reason, '')), '') else null end
  where id = p_appointment_id and organization_id = p_organization_id
  returning id into v_updated_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'appointment.status_changed', 'appointment', p_appointment_id::text, jsonb_build_object('status', p_status));
exception when exclusion_violation then
  raise exception 'Le créneau est désormais occupé et ne peut pas être réactivé.';
end;
$$;

revoke all on function public.plan_member_limit(text) from public;
revoke all on function public.plan_rank(text) from public;
revoke all on function public.current_org_staff_id(uuid) from public;
revoke all on function public.can_access_staff_record(uuid,uuid) from public;
revoke all on function public.can_access_appointment(uuid,uuid) from public;
revoke all on function public.can_access_client(uuid,uuid) from public;
revoke all on function public.team_plan_summary(uuid) from public;
revoke all on function public.list_team_members(uuid) from public;
revoke all on function public.list_team_invitations(uuid) from public;
revoke all on function public.get_team_invitation(text) from public;
revoke all on function public.enqueue_team_invitation_email(uuid,text,boolean) from public;
revoke all on function public.create_team_invitation(uuid,text,text,uuid) from public;
revoke all on function public.resend_team_invitation(uuid,uuid) from public;
revoke all on function public.revoke_team_invitation(uuid,uuid) from public;
revoke all on function public.accept_team_invitation(text) from public;
revoke all on function public.update_team_member_role(uuid,uuid,text) from public;
revoke all on function public.set_team_member_status(uuid,uuid,text) from public;

-- Helpers utilisés par les politiques RLS.
grant execute on function public.current_org_staff_id(uuid) to authenticated;
grant execute on function public.can_access_staff_record(uuid,uuid) to authenticated;
grant execute on function public.can_access_appointment(uuid,uuid) to authenticated;
grant execute on function public.can_access_client(uuid,uuid) to authenticated;

-- Fonctions d’interface.
grant execute on function public.team_plan_summary(uuid) to authenticated;
grant execute on function public.list_team_members(uuid) to authenticated;
grant execute on function public.list_team_invitations(uuid) to authenticated;
grant execute on function public.get_team_invitation(text) to anon, authenticated;
grant execute on function public.create_team_invitation(uuid,text,text,uuid) to authenticated;
grant execute on function public.resend_team_invitation(uuid,uuid) to authenticated;
grant execute on function public.revoke_team_invitation(uuid,uuid) to authenticated;
grant execute on function public.accept_team_invitation(text) to authenticated;
grant execute on function public.update_team_member_role(uuid,uuid,text) to authenticated;
grant execute on function public.set_team_member_status(uuid,uuid,text) to authenticated;

grant execute on function public.save_appointment(uuid,uuid,uuid,uuid,uuid,timestamptz,text,text) to authenticated;
grant execute on function public.set_appointment_status(uuid,uuid,text,text) to authenticated;
