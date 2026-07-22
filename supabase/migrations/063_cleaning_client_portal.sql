-- NCR Suite V2.12.2 — Phase 3 · Portail client Nettoyage
-- À exécuter après 062_platform_organization_secure_deletion.sql.

begin;

create extension if not exists pgcrypto with schema extensions;

-- Le catalogue V2.12.1 réservait déjà le portail Nettoyage à l'offre Métier.
update public.domain_plan_catalog
set features = coalesce(features, '{}'::jsonb) || '{"cleaning_client_portal":true}'::jsonb,
    updated_at = now()
where business_type = 'nettoyage'
  and plan_key = 'metier';

insert into public.module_catalog(
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, active, sort_order
)
values (
  'cleaning_client_portal',
  'Portail clients',
  'Espace sécurisé pour partager interventions, rapports, anomalies, contrôles qualité, documents et échanges avec les clients.',
  'nettoyage', 'building', '{nettoyage}', false, false, true, 660
)
on conflict(module_key) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  category = excluded.category,
  icon_key = excluded.icon_key,
  compatible_business_types = excluded.compatible_business_types,
  active = true,
  updated_at = now();

insert into public.organization_modules(organization_id, module_key, enabled)
select o.id, 'cleaning_client_portal',
       coalesce((d.features ->> 'cleaning_client_portal')::boolean, false)
from public.organizations o
left join public.domain_plan_catalog d
  on d.business_type = o.business_type
 and d.plan_key = o.plan
 and d.active = true
where o.business_type = 'nettoyage'
  and not (o.plan = 'metier' and coalesce(o.metier_modules_configured, false))
on conflict(organization_id, module_key) do update
set enabled = excluded.enabled,
    updated_at = now();

create table if not exists public.cleaning_client_portal_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'client_admin' check (role in ('client_admin','client_viewer')),
  permissions jsonb not null default '{"planning":true,"reports":true,"anomalies":true,"quality":true,"documents":true,"messages":true}'::jsonb,
  status text not null default 'active' check (status in ('active','disabled')),
  invited_at timestamptz,
  accepted_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint cleaning_client_portal_accounts_client_fk
    foreign key (organization_id, client_id)
    references public.cleaning_clients(organization_id, id)
    on delete cascade
);

create unique index if not exists idx_cleaning_client_portal_account_user
  on public.cleaning_client_portal_accounts(organization_id, client_id, user_id);
create unique index if not exists idx_cleaning_client_portal_account_email
  on public.cleaning_client_portal_accounts(organization_id, client_id, lower(email));
create index if not exists idx_cleaning_client_portal_accounts_user
  on public.cleaning_client_portal_accounts(user_id, status, updated_at desc);

create table if not exists public.cleaning_client_portal_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  email text not null,
  display_name text,
  role text not null default 'client_admin' check (role in ('client_admin','client_viewer')),
  permissions jsonb not null default '{"planning":true,"reports":true,"anomalies":true,"quality":true,"documents":true,"messages":true}'::jsonb,
  token_hash bytea not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint cleaning_client_portal_invitations_client_fk
    foreign key (organization_id, client_id)
    references public.cleaning_clients(organization_id, id)
    on delete cascade
);

create unique index if not exists idx_cleaning_client_portal_pending_email
  on public.cleaning_client_portal_invitations(organization_id, client_id, lower(email))
  where status = 'pending';
create index if not exists idx_cleaning_client_portal_invitations_org
  on public.cleaning_client_portal_invitations(organization_id, status, created_at desc);

create table if not exists public.cleaning_client_portal_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  author_user_id uuid references auth.users(id) on delete set null,
  author_type text not null check (author_type in ('cleaning','client')),
  author_name text,
  body text not null check (char_length(trim(body)) between 1 and 3000),
  read_by_client_at timestamptz,
  read_by_cleaning_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint cleaning_client_portal_messages_client_fk
    foreign key (organization_id, client_id)
    references public.cleaning_clients(organization_id, id)
    on delete cascade
);
create index if not exists idx_cleaning_client_portal_messages_thread
  on public.cleaning_client_portal_messages(organization_id, client_id, created_at desc);

create table if not exists public.cleaning_client_portal_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  site_id uuid,
  intervention_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 180),
  category text not null default 'general' check (category in ('general','consigne','rapport','controle_qualite','contrat','facture','autre')),
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 15728640),
  status text not null default 'active' check (status in ('active','archived')),
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint cleaning_client_portal_documents_storage_path_check
    check (storage_path like organization_id::text || '/' || client_id::text || '/%'),
  constraint cleaning_client_portal_documents_client_fk
    foreign key (organization_id, client_id)
    references public.cleaning_clients(organization_id, id)
    on delete cascade,
  constraint cleaning_client_portal_documents_site_fk
    foreign key (organization_id, site_id)
    references public.cleaning_sites(organization_id, id)
    on delete restrict,
  constraint cleaning_client_portal_documents_intervention_fk
    foreign key (organization_id, intervention_id)
    references public.cleaning_interventions(organization_id, id)
    on delete restrict
);
create index if not exists idx_cleaning_client_portal_documents_client
  on public.cleaning_client_portal_documents(organization_id, client_id, published_at desc);

create or replace function public.validate_cleaning_client_portal_document_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.site_id is not null and not exists (
    select 1
    from public.cleaning_sites s
    where s.organization_id = new.organization_id
      and s.id = new.site_id
      and s.client_id = new.client_id
  ) then
    raise exception 'Le site sélectionné n’appartient pas à ce client.';
  end if;

  if new.intervention_id is not null and not exists (
    select 1
    from public.cleaning_interventions i
    join public.cleaning_sites s
      on s.organization_id = i.organization_id
     and s.id = i.site_id
    where i.organization_id = new.organization_id
      and i.id = new.intervention_id
      and s.client_id = new.client_id
      and (new.site_id is null or i.site_id = new.site_id)
  ) then
    raise exception 'L’intervention sélectionnée n’appartient pas à ce client ou à ce site.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_cleaning_client_portal_document_scope
  on public.cleaning_client_portal_documents;
create trigger validate_cleaning_client_portal_document_scope
before insert or update of organization_id, client_id, site_id, intervention_id
on public.cleaning_client_portal_documents
for each row execute procedure public.validate_cleaning_client_portal_document_scope();

do $$
declare t text;
begin
  foreach t in array array[
    'cleaning_client_portal_accounts',
    'cleaning_client_portal_invitations',
    'cleaning_client_portal_messages',
    'cleaning_client_portal_documents'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || t || '_updated_at', t);
    if t <> 'cleaning_client_portal_messages' then
      execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', 'set_' || t || '_updated_at', t);
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

create or replace function public.cleaning_client_portal_feature_enabled(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    join public.domain_plan_catalog d
      on d.business_type = o.business_type
     and d.plan_key = o.plan
     and d.active = true
    where o.id = p_organization_id
      and o.business_type = 'nettoyage'
      and o.status in ('trial','active')
      and coalesce((d.features ->> 'cleaning_client_portal')::boolean, false)
      and (
        not (o.plan = 'metier' and coalesce(o.metier_modules_configured, false))
        or exists (
          select 1 from public.organization_modules m
          where m.organization_id = o.id
            and m.module_key = 'cleaning_client_portal'
            and m.enabled = true
        )
      )
  );
$$;

create or replace function public.is_cleaning_client_portal_account(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cleaning_client_portal_accounts a
    join public.cleaning_clients c
      on c.organization_id = a.organization_id and c.id = a.client_id
    where a.id = p_account_id
      and a.user_id = auth.uid()
      and a.status = 'active'
      and c.status = 'active'
      and public.cleaning_client_portal_feature_enabled(a.organization_id)
  );
$$;

create or replace function public.current_cleaning_client_portal_accounts()
returns table(
  account_id uuid,
  organization_id uuid,
  client_id uuid,
  organization_name text,
  organization_logo_url text,
  organization_primary_color text,
  client_name text,
  display_name text,
  role text,
  permissions jsonb,
  unread_messages integer,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.organization_id, a.client_id,
         coalesce(o.public_name, o.name), o.logo_url, o.primary_color,
         c.company_name, a.display_name, a.role, a.permissions,
         (select count(*)::integer
          from public.cleaning_client_portal_messages m
          where m.organization_id = a.organization_id
            and m.client_id = a.client_id
            and m.author_type = 'cleaning'
            and m.read_by_client_at is null),
         a.last_seen_at
  from public.cleaning_client_portal_accounts a
  join public.organizations o on o.id = a.organization_id
  join public.cleaning_clients c
    on c.organization_id = a.organization_id and c.id = a.client_id
  where auth.uid() is not null
    and a.user_id = auth.uid()
    and a.status = 'active'
    and c.status = 'active'
    and public.cleaning_client_portal_feature_enabled(a.organization_id)
  order by o.name, c.company_name;
$$;

create or replace function public.touch_cleaning_client_portal_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_cleaning_client_portal_account(p_account_id) then
    raise exception 'Accès portail refusé.';
  end if;
  update public.cleaning_client_portal_accounts
  set last_seen_at = now(), updated_at = now()
  where id = p_account_id and user_id = auth.uid();
end;
$$;

create or replace function public.get_cleaning_client_portal_invitation(p_token text)
returns table(
  organization_name text,
  organization_logo_url text,
  organization_primary_color text,
  client_name text,
  invited_email text,
  invited_name text,
  invited_role text,
  invitation_status text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(o.public_name, o.name), o.logo_url, o.primary_color,
         c.company_name, i.email, i.display_name, i.role,
         case when i.status = 'pending' and i.expires_at <= now() then 'expired' else i.status end,
         i.expires_at
  from public.cleaning_client_portal_invitations i
  join public.organizations o on o.id = i.organization_id
  join public.cleaning_clients c
    on c.organization_id = i.organization_id and c.id = i.client_id
  where i.token_hash = extensions.digest(trim(p_token), 'sha256')
    and public.cleaning_client_portal_feature_enabled(i.organization_id)
  limit 1;
$$;

-- Étend la file e-mail existante sans retirer les modèles déjà utilisés.
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
    'team_invitation',
    'training_convocation',
    'training_attestation',
    'training_satisfaction_request',
    'security_client_portal_invitation',
    'cleaning_client_portal_invitation'
  ));

create or replace function public.enqueue_cleaning_client_portal_invitation_email(
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
  v_invitation public.cleaning_client_portal_invitations%rowtype;
  v_organization public.organizations%rowtype;
  v_client public.cleaning_clients%rowtype;
  v_key text;
begin
  select * into v_invitation
  from public.cleaning_client_portal_invitations
  where id = p_invitation_id;

  if v_invitation.id is null or v_invitation.status <> 'pending' then return; end if;

  select * into v_organization from public.organizations where id = v_invitation.organization_id;
  select * into v_client from public.cleaning_clients
  where organization_id = v_invitation.organization_id and id = v_invitation.client_id;

  v_key := 'cleaning-client-portal:' || v_invitation.id::text || ':' || encode(extensions.digest(p_raw_token, 'sha256'), 'hex');

  insert into public.email_outbox(
    organization_id, appointment_id, template_key, recipient_email, recipient_name,
    payload, dedupe_key, status, scheduled_for, attempts
  ) values (
    v_invitation.organization_id, null, 'cleaning_client_portal_invitation',
    lower(v_invitation.email), nullif(trim(coalesce(v_invitation.display_name, v_client.contact_name, '')), ''),
    jsonb_build_object(
      'organization_name', coalesce(v_organization.public_name, v_organization.name),
      'organization_primary_color', v_organization.primary_color,
      'organization_logo_url', v_organization.logo_url,
      'client_name', v_client.company_name,
      'invitation_token', p_raw_token,
      'invited_name', v_invitation.display_name,
      'invited_role', v_invitation.role,
      'expires_at', v_invitation.expires_at,
      'contact_email', v_organization.company_email,
      'contact_phone', v_organization.company_phone
    ),
    v_key, 'pending', now(), 0
  )
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.create_cleaning_client_portal_invitation(
  p_organization_id uuid,
  p_client_id uuid,
  p_email text,
  p_display_name text default null,
  p_role text default 'client_admin',
  p_permissions jsonb default '{"planning":true,"reports":true,"anomalies":true,"quality":true,"documents":true,"messages":true}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_token text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_permissions jsonb;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seuls le propriétaire et les administrateurs peuvent inviter un client.';
  end if;
  if not public.cleaning_client_portal_feature_enabled(p_organization_id) then
    raise exception 'Le Portail clients nécessite l’offre Nettoyage Métier.';
  end if;
  if v_email = '' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'Adresse e-mail invalide.';
  end if;
  if p_role not in ('client_admin','client_viewer') then raise exception 'Rôle portail invalide.'; end if;
  if not exists (
    select 1 from public.cleaning_clients c
    where c.organization_id = p_organization_id and c.id = p_client_id and c.status = 'active'
  ) then raise exception 'Client introuvable ou inactif.'; end if;
  if exists (
    select 1 from public.cleaning_client_portal_accounts a
    where a.organization_id = p_organization_id and a.client_id = p_client_id
      and lower(a.email) = v_email and a.status = 'active'
  ) then raise exception 'Cette adresse dispose déjà d’un accès actif.'; end if;

  update public.cleaning_client_portal_invitations
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where organization_id = p_organization_id and client_id = p_client_id
    and lower(email) = v_email and status = 'pending';

  v_permissions := jsonb_build_object(
    'planning', coalesce((p_permissions->>'planning')::boolean, true),
    'reports', coalesce((p_permissions->>'reports')::boolean, true),
    'anomalies', coalesce((p_permissions->>'anomalies')::boolean, true),
    'quality', coalesce((p_permissions->>'quality')::boolean, true),
    'documents', coalesce((p_permissions->>'documents')::boolean, true),
    'messages', coalesce((p_permissions->>'messages')::boolean, true)
  );
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.cleaning_client_portal_invitations(
    organization_id, client_id, email, display_name, role, permissions,
    token_hash, status, expires_at, invited_by
  ) values (
    p_organization_id, p_client_id, v_email,
    nullif(trim(coalesce(p_display_name, '')), ''), p_role, v_permissions,
    extensions.digest(v_token, 'sha256'), 'pending', now() + interval '7 days', auth.uid()
  ) returning id into v_id;

  perform public.enqueue_cleaning_client_portal_invitation_email(v_id, v_token, false);
  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'cleaning.client_portal.invited', 'cleaning_client', p_client_id::text,
          jsonb_build_object('email', v_email, 'invitation_id', v_id));
  return v_id;
end;
$$;

create or replace function public.resend_cleaning_client_portal_invitation(
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
    raise exception 'Accès refusé.';
  end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  update public.cleaning_client_portal_invitations
  set token_hash = extensions.digest(v_token, 'sha256'),
      status = 'pending', expires_at = now() + interval '7 days',
      revoked_at = null, updated_at = now()
  where organization_id = p_organization_id and id = p_invitation_id
    and status in ('pending','expired')
  returning id into v_updated_id;
  if v_updated_id is null then raise exception 'Invitation introuvable.'; end if;
  perform public.enqueue_cleaning_client_portal_invitation_email(v_updated_id, v_token, true);
end;
$$;

create or replace function public.revoke_cleaning_client_portal_invitation(
  p_organization_id uuid,
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then raise exception 'Accès refusé.'; end if;
  update public.cleaning_client_portal_invitations
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where organization_id = p_organization_id and id = p_invitation_id and status = 'pending';
end;
$$;

create or replace function public.accept_cleaning_client_portal_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.cleaning_client_portal_invitations%rowtype;
  v_email text;
  v_account_id uuid;
begin
  if auth.uid() is null then raise exception 'Connectez-vous pour accepter cette invitation.'; end if;
  v_email := lower(coalesce(auth.jwt()->>'email', ''));

  select * into v_invitation
  from public.cleaning_client_portal_invitations
  where token_hash = extensions.digest(trim(p_token), 'sha256')
  for update;

  if v_invitation.id is null then raise exception 'Invitation introuvable.'; end if;
  if v_invitation.status <> 'pending' or v_invitation.expires_at <= now() then raise exception 'Cette invitation n’est plus valide.'; end if;
  if v_email = '' or v_email <> lower(v_invitation.email) then raise exception 'Connectez-vous avec l’adresse e-mail invitée.'; end if;
  if not public.cleaning_client_portal_feature_enabled(v_invitation.organization_id) then raise exception 'Le portail client n’est plus actif.'; end if;

  insert into public.cleaning_client_portal_accounts(
    organization_id, client_id, user_id, email, display_name, role, permissions,
    status, invited_at, accepted_at, created_by
  ) values (
    v_invitation.organization_id, v_invitation.client_id, auth.uid(), v_email,
    v_invitation.display_name, v_invitation.role, v_invitation.permissions,
    'active', v_invitation.created_at, now(), v_invitation.invited_by
  )
  on conflict (organization_id, client_id, user_id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    role = excluded.role,
    permissions = excluded.permissions,
    status = 'active',
    accepted_at = now(),
    updated_at = now()
  returning id into v_account_id;

  update public.cleaning_client_portal_invitations
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now(), updated_at = now()
  where id = v_invitation.id;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (v_invitation.organization_id, auth.uid(), 'cleaning.client_portal.accepted', 'cleaning_client', v_invitation.client_id::text,
          jsonb_build_object('account_id', v_account_id));
  return v_account_id;
end;
$$;

create or replace function public.cleaning_client_portal_admin_overview(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Accès refusé.'; end if;
  if not public.cleaning_client_portal_feature_enabled(p_organization_id) then raise exception 'Le Portail clients nécessite l’offre Nettoyage Métier.'; end if;

  return jsonb_build_object(
    'clients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'client_id', c.id,
        'company_name', c.company_name,
        'contact_name', c.contact_name,
        'email', c.email,
        'phone', c.phone,
        'city', c.city,
        'site_count', (select count(*) from public.cleaning_sites s where s.organization_id=c.organization_id and s.client_id=c.id and s.status='active'),
        'accounts', coalesce((select jsonb_agg(jsonb_build_object(
          'id', a.id, 'email', a.email, 'display_name', a.display_name, 'role', a.role,
          'permissions', a.permissions, 'status', a.status, 'last_seen_at', a.last_seen_at,
          'accepted_at', a.accepted_at
        ) order by a.created_at desc) from public.cleaning_client_portal_accounts a
          where a.organization_id=c.organization_id and a.client_id=c.id), '[]'::jsonb),
        'invitations', coalesce((select jsonb_agg(jsonb_build_object(
          'id', i.id, 'email', i.email, 'display_name', i.display_name, 'role', i.role,
          'permissions', i.permissions,
          'status', case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,
          'expires_at', i.expires_at, 'created_at', i.created_at
        ) order by i.created_at desc) from public.cleaning_client_portal_invitations i
          where i.organization_id=c.organization_id and i.client_id=c.id and i.status in ('pending','expired')), '[]'::jsonb),
        'unread_messages', (select count(*) from public.cleaning_client_portal_messages m
          where m.organization_id=c.organization_id and m.client_id=c.id
            and m.author_type='client' and m.read_by_cleaning_at is null),
        'document_count', (select count(*) from public.cleaning_client_portal_documents d
          where d.organization_id=c.organization_id and d.client_id=c.id and d.status='active')
      ) order by c.company_name)
      from public.cleaning_clients c
      where c.organization_id=p_organization_id and c.status='active'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.set_cleaning_client_portal_account(
  p_organization_id uuid,
  p_account_id uuid,
  p_status text,
  p_permissions jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then raise exception 'Accès refusé.'; end if;
  if p_status not in ('active','disabled') then raise exception 'Statut invalide.'; end if;
  update public.cleaning_client_portal_accounts
  set status=p_status,
      permissions=jsonb_build_object(
        'planning',coalesce((p_permissions->>'planning')::boolean,true),
        'reports',coalesce((p_permissions->>'reports')::boolean,true),
        'anomalies',coalesce((p_permissions->>'anomalies')::boolean,true),
        'quality',coalesce((p_permissions->>'quality')::boolean,true),
        'documents',coalesce((p_permissions->>'documents')::boolean,true),
        'messages',coalesce((p_permissions->>'messages')::boolean,true)
      ),
      updated_at=now()
  where organization_id=p_organization_id and id=p_account_id;
  if not found then raise exception 'Accès client introuvable.'; end if;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'cleaning.client_portal.account_updated','cleaning_client_portal_account',p_account_id::text,
         jsonb_build_object('status',p_status,'permissions',p_permissions));
end;
$$;

create or replace function public.cleaning_client_portal_dashboard(
  p_account_id uuid,
  p_from date default (current_date - 30),
  p_to date default (current_date + 60)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.cleaning_client_portal_accounts%rowtype;
  v_from timestamptz;
  v_to timestamptz;
begin
  if not public.is_cleaning_client_portal_account(p_account_id) then raise exception 'Accès portail refusé.'; end if;
  select * into v_account from public.cleaning_client_portal_accounts where id=p_account_id;
  if p_to < p_from or p_to > p_from + 370 then raise exception 'Période invalide.'; end if;
  v_from := p_from::timestamptz;
  v_to := (p_to + 1)::timestamptz;

  update public.cleaning_client_portal_accounts set last_seen_at=now(), updated_at=now() where id=p_account_id;
  if coalesce((v_account.permissions->>'messages')::boolean,false) then
    update public.cleaning_client_portal_messages
    set read_by_client_at=coalesce(read_by_client_at,now())
    where organization_id=v_account.organization_id and client_id=v_account.client_id and author_type='cleaning';
  end if;

  return jsonb_build_object(
    'account', jsonb_build_object('id',v_account.id,'role',v_account.role,'display_name',v_account.display_name,'permissions',v_account.permissions),
    'organization', (select jsonb_build_object(
      'id',o.id,'name',coalesce(o.public_name,o.name),'logo_url',o.logo_url,'primary_color',o.primary_color,
      'email',o.company_email,'phone',o.company_phone,'address',concat_ws(' ',o.company_address,o.company_postal_code,o.company_city)
    ) from public.organizations o where o.id=v_account.organization_id),
    'client', (select jsonb_build_object('id',c.id,'company_name',c.company_name,'contact_name',c.contact_name,'email',c.email,'phone',c.phone)
      from public.cleaning_clients c where c.organization_id=v_account.organization_id and c.id=v_account.client_id),
    'summary', jsonb_build_object(
      'sites',(select count(*) from public.cleaning_sites s where s.organization_id=v_account.organization_id and s.client_id=v_account.client_id and s.status='active'),
      'upcoming_interventions',case when coalesce((v_account.permissions->>'planning')::boolean,false) then (select count(*) from public.cleaning_interventions i join public.cleaning_sites s on s.organization_id=i.organization_id and s.id=i.site_id where i.organization_id=v_account.organization_id and s.client_id=v_account.client_id and i.status='planned' and i.starts_at>=now()) else 0 end,
      'completed_interventions',case when coalesce((v_account.permissions->>'reports')::boolean,false) then (select count(*) from public.cleaning_interventions i join public.cleaning_sites s on s.organization_id=i.organization_id and s.id=i.site_id where i.organization_id=v_account.organization_id and s.client_id=v_account.client_id and i.status='completed' and i.starts_at>=v_from and i.starts_at<v_to) else 0 end,
      'open_anomalies',case when coalesce((v_account.permissions->>'anomalies')::boolean,false) then (select count(*) from public.cleaning_anomalies a join public.cleaning_sites s on s.organization_id=a.organization_id and s.id=a.site_id where a.organization_id=v_account.organization_id and s.client_id=v_account.client_id and a.status in ('open','in_progress')) else 0 end,
      'average_quality',case when coalesce((v_account.permissions->>'quality')::boolean,false) then (select round(avg(q.overall_score)::numeric,1) from public.cleaning_quality_controls q join public.cleaning_sites s on s.organization_id=q.organization_id and s.id=q.site_id where q.organization_id=v_account.organization_id and s.client_id=v_account.client_id and q.controlled_at>=v_from and q.controlled_at<v_to) else null end,
      'documents',case when coalesce((v_account.permissions->>'documents')::boolean,false) then (select count(*) from public.cleaning_client_portal_documents d where d.organization_id=v_account.organization_id and d.client_id=v_account.client_id and d.status='active') else 0 end,
      'unread_messages',case when coalesce((v_account.permissions->>'messages')::boolean,false) then (select count(*) from public.cleaning_client_portal_messages m where m.organization_id=v_account.organization_id and m.client_id=v_account.client_id and m.author_type='cleaning' and m.read_by_client_at is null) else 0 end
    ),
    'sites', coalesce((select jsonb_agg(jsonb_build_object(
      'id',s.id,'name',s.name,'code',s.code,'address',s.address,'postal_code',s.postal_code,'city',s.city,
      'contact_name',s.contact_name,'contact_phone',s.contact_phone
    ) order by s.name) from public.cleaning_sites s where s.organization_id=v_account.organization_id and s.client_id=v_account.client_id and s.status='active'),'[]'::jsonb),
    'interventions', case when coalesce((v_account.permissions->>'planning')::boolean,false) or coalesce((v_account.permissions->>'reports')::boolean,false) then coalesce((select jsonb_agg(row_to_json(x) order by x.starts_at desc) from (
      select i.id,i.site_id,s.name as site_name,i.title,i.starts_at,i.ends_at,i.status,
             i.actual_started_at,i.actual_ended_at,
             concat_ws(' ',a.first_name,a.last_name) as agent_name,
             case when coalesce((v_account.permissions->>'reports')::boolean,false) then i.report_text else null end as report_text,
             case when coalesce((v_account.permissions->>'reports')::boolean,false) then i.before_photo_url else null end as before_photo_url,
             case when coalesce((v_account.permissions->>'reports')::boolean,false) then i.after_photo_url else null end as after_photo_url,
             case when coalesce((v_account.permissions->>'reports')::boolean,false)
               then (select count(*) from public.cleaning_intervention_tasks t where t.organization_id=i.organization_id and t.intervention_id=i.id)
               else 0 end as task_count,
             case when coalesce((v_account.permissions->>'reports')::boolean,false)
               then (select count(*) from public.cleaning_intervention_tasks t where t.organization_id=i.organization_id and t.intervention_id=i.id and t.completed=true)
               else 0 end as completed_tasks,
             case when coalesce((v_account.permissions->>'anomalies')::boolean,false)
               then (select count(*) from public.cleaning_anomalies an where an.organization_id=i.organization_id and an.intervention_id=i.id)
               else 0 end as anomaly_count,
             case when coalesce((v_account.permissions->>'quality')::boolean,false)
               then (select round(avg(q.overall_score)::numeric,1) from public.cleaning_quality_controls q where q.organization_id=i.organization_id and q.intervention_id=i.id)
               else null end as quality_score
      from public.cleaning_interventions i
      join public.cleaning_sites s on s.organization_id=i.organization_id and s.id=i.site_id
      left join public.cleaning_agents a on a.organization_id=i.organization_id and a.id=i.agent_id
      where i.organization_id=v_account.organization_id and s.client_id=v_account.client_id
        and i.starts_at>=v_from and i.starts_at<v_to and i.status<>'canceled'
        and (
          coalesce((v_account.permissions->>'planning')::boolean,false)
          or (coalesce((v_account.permissions->>'reports')::boolean,false) and i.status='completed')
        )
      order by i.starts_at desc limit 300
    ) x),'[]'::jsonb) else '[]'::jsonb end,
    'anomalies', case when coalesce((v_account.permissions->>'anomalies')::boolean,false) then coalesce((select jsonb_agg(row_to_json(x) order by x.created_at desc) from (
      select a.id,a.intervention_id,a.site_id,s.name as site_name,a.title,a.description,a.severity,a.status,
             a.corrective_action,a.created_at,a.resolved_at
      from public.cleaning_anomalies a
      join public.cleaning_sites s on s.organization_id=a.organization_id and s.id=a.site_id
      where a.organization_id=v_account.organization_id and s.client_id=v_account.client_id
        and a.created_at>=v_from and a.created_at<v_to
      order by a.created_at desc limit 300
    ) x),'[]'::jsonb) else '[]'::jsonb end,
    'quality_controls', case when coalesce((v_account.permissions->>'quality')::boolean,false) then coalesce((select jsonb_agg(row_to_json(x) order by x.controlled_at desc) from (
      select q.id,q.intervention_id,q.site_id,s.name as site_name,q.overall_score,q.score_cleanliness,
             q.score_compliance,q.score_punctuality,q.score_material,q.observations,q.corrective_action,
             q.controlled_at,concat_ws(' ',a.first_name,a.last_name) as agent_name
      from public.cleaning_quality_controls q
      join public.cleaning_sites s on s.organization_id=q.organization_id and s.id=q.site_id
      left join public.cleaning_agents a on a.organization_id=q.organization_id and a.id=q.agent_id
      where q.organization_id=v_account.organization_id and s.client_id=v_account.client_id
        and q.controlled_at>=v_from and q.controlled_at<v_to
      order by q.controlled_at desc limit 250
    ) x),'[]'::jsonb) else '[]'::jsonb end,
    'documents', case when coalesce((v_account.permissions->>'documents')::boolean,false) then coalesce((select jsonb_agg(jsonb_build_object(
      'id',d.id,'title',d.title,'category',d.category,'storage_path',d.storage_path,'mime_type',d.mime_type,
      'size_bytes',d.size_bytes,'published_at',d.published_at,'site_id',d.site_id,'intervention_id',d.intervention_id,
      'site_name',s.name
    ) order by d.published_at desc) from public.cleaning_client_portal_documents d
      left join public.cleaning_sites s on s.organization_id=d.organization_id and s.id=d.site_id
      where d.organization_id=v_account.organization_id and d.client_id=v_account.client_id and d.status='active'),'[]'::jsonb) else '[]'::jsonb end,
    'messages', case when coalesce((v_account.permissions->>'messages')::boolean,false) then coalesce((select jsonb_agg(jsonb_build_object(
      'id',m.id,'author_type',m.author_type,'author_name',m.author_name,'body',m.body,'created_at',m.created_at,
      'read_by_client_at',m.read_by_client_at,'read_by_cleaning_at',m.read_by_cleaning_at
    ) order by m.created_at) from (select * from public.cleaning_client_portal_messages
      where organization_id=v_account.organization_id and client_id=v_account.client_id
      order by created_at desc limit 150) m),'[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

create or replace function public.cleaning_client_portal_send_message(p_account_id uuid,p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_account public.cleaning_client_portal_accounts%rowtype; v_id uuid;
begin
  if not public.is_cleaning_client_portal_account(p_account_id) then raise exception 'Accès portail refusé.'; end if;
  select * into v_account from public.cleaning_client_portal_accounts where id=p_account_id;
  if not coalesce((v_account.permissions->>'messages')::boolean,false) then raise exception 'La messagerie n’est pas autorisée pour cet accès.'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 3000 then raise exception 'Le message doit contenir entre 1 et 3000 caractères.'; end if;
  if (select count(*) from public.cleaning_client_portal_messages m
      where m.author_user_id=auth.uid() and m.author_type='client' and m.created_at>now()-interval '10 minutes') >= 20 then
    raise exception 'Trop de messages envoyés. Réessayez dans quelques minutes.';
  end if;
  insert into public.cleaning_client_portal_messages(organization_id,client_id,author_user_id,author_type,author_name,body,read_by_client_at)
  values(v_account.organization_id,v_account.client_id,auth.uid(),'client',coalesce(v_account.display_name,v_account.email),trim(p_body),now())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.cleaning_client_portal_admin_messages(
  p_organization_id uuid,
  p_client_id uuid
)
returns table(
  id uuid,
  author_type text,
  author_name text,
  body text,
  read_by_client_at timestamptz,
  read_by_cleaning_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès refusé.';
  end if;

  if not public.cleaning_client_portal_feature_enabled(p_organization_id) then
    raise exception 'Portail client indisponible.';
  end if;

  if not exists (
    select 1
    from public.cleaning_clients as portal_client
    where portal_client.organization_id = p_organization_id
      and portal_client.id = p_client_id
  ) then
    raise exception 'Client introuvable.';
  end if;

  update public.cleaning_client_portal_messages as portal_message
  set read_by_cleaning_at = coalesce(portal_message.read_by_cleaning_at, now())
  where portal_message.organization_id = p_organization_id
    and portal_message.client_id = p_client_id
    and portal_message.author_type = 'client';

  return query
  select
    portal_message.id,
    portal_message.author_type,
    portal_message.author_name,
    portal_message.body,
    portal_message.read_by_client_at,
    portal_message.read_by_cleaning_at,
    portal_message.created_at
  from public.cleaning_client_portal_messages as portal_message
  where portal_message.organization_id = p_organization_id
    and portal_message.client_id = p_client_id
  order by portal_message.created_at;
end;
$$;

create or replace function public.cleaning_client_portal_admin_send_message(p_organization_id uuid,p_client_id uuid,p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_name text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'Accès refusé.'; end if;
  if not public.cleaning_client_portal_feature_enabled(p_organization_id) then raise exception 'Portail client indisponible.'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 3000 then raise exception 'Le message doit contenir entre 1 et 3000 caractères.'; end if;
  if not exists(select 1 from public.cleaning_clients where organization_id=p_organization_id and id=p_client_id and status='active') then raise exception 'Client introuvable.'; end if;
  select coalesce(up.full_name, auth.jwt()->>'email', 'Équipe nettoyage') into v_name from public.user_profiles up where up.id=auth.uid();
  insert into public.cleaning_client_portal_messages(organization_id,client_id,author_user_id,author_type,author_name,body,read_by_cleaning_at)
  values(p_organization_id,p_client_id,auth.uid(),'cleaning',coalesce(v_name,'Équipe nettoyage'),trim(p_body),now()) returning id into v_id;
  return v_id;
end;
$$;

-- Accès direct aux métadonnées documents pour l'équipe uniquement. Le portail lit via le RPC dashboard.
drop policy if exists cleaning_client_portal_documents_team_select on public.cleaning_client_portal_documents;
create policy cleaning_client_portal_documents_team_select on public.cleaning_client_portal_documents
for select to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager']));
drop policy if exists cleaning_client_portal_documents_team_insert on public.cleaning_client_portal_documents;
create policy cleaning_client_portal_documents_team_insert on public.cleaning_client_portal_documents
for insert to authenticated with check (public.has_org_role(organization_id,array['owner','admin','manager']));
drop policy if exists cleaning_client_portal_documents_team_update on public.cleaning_client_portal_documents;
create policy cleaning_client_portal_documents_team_update on public.cleaning_client_portal_documents
for update to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager']))
with check (public.has_org_role(organization_id,array['owner','admin','manager']));
drop policy if exists cleaning_client_portal_documents_team_delete on public.cleaning_client_portal_documents;
create policy cleaning_client_portal_documents_team_delete on public.cleaning_client_portal_documents
for delete to authenticated using (public.has_org_role(organization_id,array['owner','admin']));

grant select,insert,update,delete on public.cleaning_client_portal_documents to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cleaning-client-documents','cleaning-client-documents',false,15728640,array['application/pdf','image/jpeg','image/png','image/webp','text/plain'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.can_manage_cleaning_client_document_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when split_part(p_object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then public.has_org_role(split_part(p_object_name, '/', 1)::uuid, array['owner','admin','manager'])
    else false
  end;
$$;

create or replace function public.can_read_cleaning_client_document_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_cleaning_client_document_asset(p_object_name)
  or exists(
    select 1
    from public.cleaning_client_portal_documents d
    join public.cleaning_client_portal_accounts a
      on a.organization_id=d.organization_id and a.client_id=d.client_id
    where d.storage_path=p_object_name
      and d.status='active'
      and a.user_id=auth.uid()
      and a.status='active'
      and coalesce((a.permissions->>'documents')::boolean,false)
      and public.cleaning_client_portal_feature_enabled(a.organization_id)
      and exists (
        select 1 from public.cleaning_clients c
        where c.organization_id=a.organization_id and c.id=a.client_id and c.status='active'
      )
  );
$$;

revoke all on function public.can_manage_cleaning_client_document_asset(text) from public;
revoke all on function public.can_read_cleaning_client_document_asset(text) from public;
grant execute on function public.can_manage_cleaning_client_document_asset(text) to authenticated;
grant execute on function public.can_read_cleaning_client_document_asset(text) to authenticated;

drop policy if exists cleaning_client_documents_storage_select on storage.objects;
create policy cleaning_client_documents_storage_select on storage.objects
for select to authenticated using(bucket_id='cleaning-client-documents' and public.can_read_cleaning_client_document_asset(name));
drop policy if exists cleaning_client_documents_storage_insert on storage.objects;
create policy cleaning_client_documents_storage_insert on storage.objects
for insert to authenticated with check(bucket_id='cleaning-client-documents' and public.can_manage_cleaning_client_document_asset(name));
drop policy if exists cleaning_client_documents_storage_update on storage.objects;
create policy cleaning_client_documents_storage_update on storage.objects
for update to authenticated using(bucket_id='cleaning-client-documents' and public.can_manage_cleaning_client_document_asset(name))
with check(bucket_id='cleaning-client-documents' and public.can_manage_cleaning_client_document_asset(name));
drop policy if exists cleaning_client_documents_storage_delete on storage.objects;
create policy cleaning_client_documents_storage_delete on storage.objects
for delete to authenticated using(bucket_id='cleaning-client-documents' and public.can_manage_cleaning_client_document_asset(name));

-- Les tables de comptes, invitations et messages restent accessibles uniquement via les RPC SECURITY DEFINER.
revoke all on public.cleaning_client_portal_accounts from anon,authenticated;
revoke all on public.cleaning_client_portal_invitations from anon,authenticated;
revoke all on public.cleaning_client_portal_messages from anon,authenticated;

revoke all on function public.validate_cleaning_client_portal_document_scope() from public;
revoke all on function public.cleaning_client_portal_feature_enabled(uuid) from public;
revoke all on function public.is_cleaning_client_portal_account(uuid) from public;
revoke all on function public.current_cleaning_client_portal_accounts() from public;
revoke all on function public.touch_cleaning_client_portal_account(uuid) from public;
revoke all on function public.get_cleaning_client_portal_invitation(text) from public;
revoke all on function public.enqueue_cleaning_client_portal_invitation_email(uuid,text,boolean) from public;
revoke all on function public.create_cleaning_client_portal_invitation(uuid,uuid,text,text,text,jsonb) from public;
revoke all on function public.resend_cleaning_client_portal_invitation(uuid,uuid) from public;
revoke all on function public.revoke_cleaning_client_portal_invitation(uuid,uuid) from public;
revoke all on function public.accept_cleaning_client_portal_invitation(text) from public;
revoke all on function public.cleaning_client_portal_admin_overview(uuid) from public;
revoke all on function public.set_cleaning_client_portal_account(uuid,uuid,text,jsonb) from public;
revoke all on function public.cleaning_client_portal_dashboard(uuid,date,date) from public;
revoke all on function public.cleaning_client_portal_send_message(uuid,text) from public;
revoke all on function public.cleaning_client_portal_admin_messages(uuid,uuid) from public;
revoke all on function public.cleaning_client_portal_admin_send_message(uuid,uuid,text) from public;

grant execute on function public.get_cleaning_client_portal_invitation(text) to anon,authenticated;
grant execute on function public.current_cleaning_client_portal_accounts() to authenticated;
grant execute on function public.touch_cleaning_client_portal_account(uuid) to authenticated;
grant execute on function public.accept_cleaning_client_portal_invitation(text) to authenticated;
grant execute on function public.create_cleaning_client_portal_invitation(uuid,uuid,text,text,text,jsonb) to authenticated;
grant execute on function public.resend_cleaning_client_portal_invitation(uuid,uuid) to authenticated;
grant execute on function public.revoke_cleaning_client_portal_invitation(uuid,uuid) to authenticated;
grant execute on function public.cleaning_client_portal_admin_overview(uuid) to authenticated;
grant execute on function public.set_cleaning_client_portal_account(uuid,uuid,text,jsonb) to authenticated;
grant execute on function public.cleaning_client_portal_dashboard(uuid,date,date) to authenticated;
grant execute on function public.cleaning_client_portal_send_message(uuid,text) to authenticated;
grant execute on function public.cleaning_client_portal_admin_messages(uuid,uuid) to authenticated;
grant execute on function public.cleaning_client_portal_admin_send_message(uuid,uuid,text) to authenticated;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,installed_at,installed_by,notes
) values (
  true,'2.12.2','2.12.2','ncr-suite-shell-v2.12.2-cleaning-client-portal',now(),auth.uid(),
  'Phase 3 lot 2 : portail client Nettoyage, interventions, rapports, qualité, documents et messagerie.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

notify pgrst, 'reload schema';
commit;
