-- NCR Suite V2.21.0 - Espaces Formation, depots et signatures tracees
-- A executer apres 081_training_locked_module_navigation.sql.

begin;

insert into public.module_catalog (
  module_key,display_name,description,category,icon_key,
  compatible_business_types,core_module,default_enabled,sort_order
) values (
  'training_portals_signatures',
  'Portails et signatures',
  'Espaces stagiaire, formateur et client, depots classes et signatures tracees.',
  'formation','signature','{formation}',false,false,566
) on conflict(module_key) do update set
  display_name=excluded.display_name,
  description=excluded.description,
  category=excluded.category,
  icon_key=excluded.icon_key,
  compatible_business_types=excluded.compatible_business_types,
  active=true,
  sort_order=excluded.sort_order,
  updated_at=now();

insert into public.training_module_catalog (
  module_key,display_name,short_description,monthly_price_cents,
  available_plans,feature_keys,prerequisite_modules,organization_module_key,
  icon_key,sort_order,active
) values (
  'training_portals_signatures_addon',
  'Portails et signatures',
  'Espaces stagiaire, formateur et client, depots classes, signatures et preuves Qualiopi.',
  1990,
  array['decouverte','essentielle'],
  array['training_portals_signatures'],
  array[]::text[],
  'training_portals_signatures',
  'signature',110,true
) on conflict(module_key) do update set
  display_name=excluded.display_name,
  short_description=excluded.short_description,
  monthly_price_cents=excluded.monthly_price_cents,
  available_plans=excluded.available_plans,
  feature_keys=excluded.feature_keys,
  prerequisite_modules=excluded.prerequisite_modules,
  organization_module_key=excluded.organization_module_key,
  icon_key=excluded.icon_key,
  sort_order=excluded.sort_order,
  active=true,
  updated_at=now();

update public.domain_plan_catalog
set features=jsonb_set(coalesce(features,'{}'::jsonb),'{training_portals_signatures}','true'::jsonb,true),
    updated_at=now()
where business_type='formation' and plan_key in ('professionnelle','metier');

update public.domain_plan_catalog
set features=coalesce(features,'{}'::jsonb)-'training_portals_signatures',
    updated_at=now()
where business_type='formation' and plan_key in ('decouverte','essentielle');

create or replace function public.organization_has_plan_feature(
  p_organization_id uuid,
  p_feature text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_type text;
  v_plan text;
  v_status text;
  v_metier_modules_configured boolean;
  v_features jsonb;
  v_module_key text;
begin
  select o.business_type,o.plan,o.status,coalesce(o.metier_modules_configured,false),d.features
  into v_business_type,v_plan,v_status,v_metier_modules_configured,v_features
  from public.organizations o
  left join public.domain_plan_catalog d
    on d.business_type=o.business_type
   and d.plan_key=o.plan
   and d.active=true
  where o.id=p_organization_id;

  if v_business_type is null or v_status not in ('trial','active') then return false; end if;

  if v_business_type='securite'
     and public.security_has_addon_feature(p_organization_id,p_feature) then return true; end if;

  if v_business_type='formation'
     and public.training_has_module_feature(p_organization_id,p_feature) then return true; end if;

  if not coalesce((v_features->>p_feature)::boolean,false) then return false; end if;

  if v_business_type='formation' and v_plan='metier' and v_metier_modules_configured then
    v_module_key := case p_feature
      when 'training_programs' then 'training_programs'
      when 'training_trainees' then 'trainees'
      when 'training_trainers' then 'trainers'
      when 'training_sessions' then 'sessions'
      when 'training_documents' then 'documents'
      when 'training_blank_attendance' then 'attendance'
      when 'training_digital_attendance' then 'training_digital_attendance'
      when 'training_attendance_pdf' then 'training_digital_attendance'
      when 'training_automatic_certificates' then 'certificates'
      when 'commercial_branding' then 'commercial_branding'
      when 'training_document_branding' then 'commercial_branding'
      when 'training_email_branding' then 'commercial_branding'
      when 'training_satisfaction' then 'evaluations'
      when 'training_session_dossier' then 'training_session_dossier'
      when 'training_commercial' then 'training_commercial'
      when 'training_billing' then 'training_billing'
      when 'training_bpf' then 'training_bpf'
      when 'training_quality' then 'training_quality'
      when 'training_portals_signatures' then 'training_portals_signatures'
      when 'multi_site' then 'sites'
      when 'team_access' then 'team_access'
      when 'manager_role' then 'team_access'
      else null
    end;
    if v_module_key is not null then
      return exists (
        select 1 from public.organization_modules m
        where m.organization_id=p_organization_id
          and m.module_key=v_module_key
          and m.enabled=true
      );
    end if;
  end if;

  return true;
end;
$$;

create table if not exists public.training_portal_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_kind text not null check (subject_kind in ('trainee','trainer','client')),
  trainee_id uuid,
  trainer_id uuid,
  customer_id uuid,
  email text not null,
  display_name text,
  status text not null default 'active' check (status in ('active','disabled')),
  invited_at timestamptz,
  accepted_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,id),
  constraint training_portal_accounts_subject_check check (
    (subject_kind='trainee' and trainee_id is not null and trainer_id is null and customer_id is null)
    or (subject_kind='trainer' and trainer_id is not null and trainee_id is null and customer_id is null)
    or (subject_kind='client' and customer_id is not null and trainee_id is null and trainer_id is null)
  ),
  constraint training_portal_accounts_trainee_fk foreign key(organization_id,trainee_id)
    references public.training_trainees(organization_id,id) on delete cascade,
  constraint training_portal_accounts_trainer_fk foreign key(organization_id,trainer_id)
    references public.training_trainers(organization_id,id) on delete cascade,
  constraint training_portal_accounts_customer_fk foreign key(organization_id,customer_id)
    references public.training_customers(organization_id,id) on delete cascade
);

create unique index if not exists idx_training_portal_account_trainee_user
  on public.training_portal_accounts(organization_id,trainee_id,user_id)
  where subject_kind='trainee';
create unique index if not exists idx_training_portal_account_trainer_user
  on public.training_portal_accounts(organization_id,trainer_id,user_id)
  where subject_kind='trainer';
create unique index if not exists idx_training_portal_account_client_user
  on public.training_portal_accounts(organization_id,customer_id,user_id)
  where subject_kind='client';
create index if not exists idx_training_portal_accounts_user
  on public.training_portal_accounts(user_id,status,updated_at desc);

create table if not exists public.training_portal_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subject_kind text not null check (subject_kind in ('trainee','trainer','client')),
  trainee_id uuid,
  trainer_id uuid,
  customer_id uuid,
  email text not null,
  display_name text,
  token_hash bytea not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default (now()+interval '7 days'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,id),
  constraint training_portal_invitations_subject_check check (
    (subject_kind='trainee' and trainee_id is not null and trainer_id is null and customer_id is null)
    or (subject_kind='trainer' and trainer_id is not null and trainee_id is null and customer_id is null)
    or (subject_kind='client' and customer_id is not null and trainee_id is null and trainer_id is null)
  ),
  constraint training_portal_invitations_trainee_fk foreign key(organization_id,trainee_id)
    references public.training_trainees(organization_id,id) on delete cascade,
  constraint training_portal_invitations_trainer_fk foreign key(organization_id,trainer_id)
    references public.training_trainers(organization_id,id) on delete cascade,
  constraint training_portal_invitations_customer_fk foreign key(organization_id,customer_id)
    references public.training_customers(organization_id,id) on delete cascade
);

create unique index if not exists idx_training_portal_pending_invitation
  on public.training_portal_invitations(
    organization_id,subject_kind,
    coalesce(trainee_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(trainer_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(customer_id,'00000000-0000-0000-0000-000000000000'::uuid),
    lower(email)
  ) where status='pending';
create index if not exists idx_training_portal_invitations_org
  on public.training_portal_invitations(organization_id,status,created_at desc);

create table if not exists public.training_portal_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subject_kind text not null check (subject_kind in ('trainee','trainer','client')),
  trainee_id uuid,
  trainer_id uuid,
  customer_id uuid,
  session_id uuid,
  uploaded_by_account_id uuid,
  training_document_id uuid,
  commercial_document_id uuid,
  invoice_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 200),
  category text not null default 'other' check (category in (
    'identity','prerequisite','administrative','programme','support','convocation',
    'agreement','contract','invoice','attendance','evaluation','certificate','other'
  )),
  direction text not null default 'organization_to_portal'
    check (direction in ('organization_to_portal','portal_to_organization')),
  storage_bucket text not null default 'training-portal-documents'
    check (storage_bucket in ('training-portal-documents','training-documents')),
  storage_path text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 20971520),
  status text not null default 'active' check (status in ('active','archived')),
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,id),
  unique(storage_bucket,storage_path,subject_kind,trainee_id,trainer_id,customer_id),
  constraint training_portal_documents_subject_check check (
    (subject_kind='trainee' and trainee_id is not null and trainer_id is null and customer_id is null)
    or (subject_kind='trainer' and trainer_id is not null and trainee_id is null and customer_id is null)
    or (subject_kind='client' and customer_id is not null and trainee_id is null and trainer_id is null)
  ),
  constraint training_portal_documents_trainee_fk foreign key(organization_id,trainee_id)
    references public.training_trainees(organization_id,id) on delete cascade,
  constraint training_portal_documents_trainer_fk foreign key(organization_id,trainer_id)
    references public.training_trainers(organization_id,id) on delete cascade,
  constraint training_portal_documents_customer_fk foreign key(organization_id,customer_id)
    references public.training_customers(organization_id,id) on delete cascade,
  constraint training_portal_documents_session_fk foreign key(organization_id,session_id)
    references public.training_sessions(organization_id,id) on delete set null (session_id),
  constraint training_portal_documents_account_fk foreign key(organization_id,uploaded_by_account_id)
    references public.training_portal_accounts(organization_id,id) on delete set null (uploaded_by_account_id),
  constraint training_portal_documents_training_document_fk foreign key(organization_id,training_document_id)
    references public.training_documents(organization_id,id) on delete set null (training_document_id),
  constraint training_portal_documents_commercial_fk foreign key(organization_id,commercial_document_id)
    references public.training_commercial_documents(organization_id,id) on delete set null (commercial_document_id),
  constraint training_portal_documents_invoice_fk foreign key(organization_id,invoice_id)
    references public.training_invoices(organization_id,id) on delete set null (invoice_id)
);

create index if not exists idx_training_portal_documents_subject
  on public.training_portal_documents(organization_id,subject_kind,published_at desc);
create index if not exists idx_training_portal_documents_session
  on public.training_portal_documents(organization_id,session_id,published_at desc);

create table if not exists public.training_signature_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null,
  session_id uuid,
  portal_document_id uuid,
  training_document_id uuid,
  commercial_document_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 220),
  request_type text not null default 'other' check (request_type in (
    'quote','agreement','contract','rules','attendance','authorization','other'
  )),
  source_bucket text not null check (source_bucket in ('training-portal-documents','training-documents')),
  source_path text not null,
  status text not null default 'pending' check (status in ('pending','signed','declined','canceled')),
  due_date date,
  consent_text text not null default 'Je confirme avoir lu le document et consentir a le signer electroniquement.',
  opened_at timestamptz,
  signed_at timestamptz,
  declined_at timestamptz,
  canceled_at timestamptz,
  signer_name text,
  signer_user_id uuid references auth.users(id) on delete set null,
  signature_image_path text,
  document_sha256 text,
  signature_payload_sha256 text,
  proof_reference text,
  user_agent text,
  reminder_count integer not null default 0 check (reminder_count between 0 and 20),
  last_reminded_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,id),
  unique(proof_reference),
  constraint training_signature_account_fk foreign key(organization_id,account_id)
    references public.training_portal_accounts(organization_id,id) on delete cascade,
  constraint training_signature_session_fk foreign key(organization_id,session_id)
    references public.training_sessions(organization_id,id) on delete set null (session_id),
  constraint training_signature_portal_document_fk foreign key(organization_id,portal_document_id)
    references public.training_portal_documents(organization_id,id) on delete set null (portal_document_id),
  constraint training_signature_training_document_fk foreign key(organization_id,training_document_id)
    references public.training_documents(organization_id,id) on delete set null (training_document_id),
  constraint training_signature_commercial_fk foreign key(organization_id,commercial_document_id)
    references public.training_commercial_documents(organization_id,id) on delete set null (commercial_document_id),
  constraint training_signature_hashes_check check (
    (document_sha256 is null or document_sha256 ~ '^[0-9a-f]{64}$')
    and (signature_payload_sha256 is null or signature_payload_sha256 ~ '^[0-9a-f]{64}$')
  )
);

create index if not exists idx_training_signature_account_status
  on public.training_signature_requests(account_id,status,created_at desc);
create index if not exists idx_training_signature_org_status
  on public.training_signature_requests(organization_id,status,due_date);

create table if not exists public.training_signature_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  signature_request_id uuid not null,
  event_type text not null check (event_type in ('requested','viewed','reminded','signed','declined','canceled')),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_label text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  unique(organization_id,id),
  constraint training_signature_events_request_fk foreign key(organization_id,signature_request_id)
    references public.training_signature_requests(organization_id,id) on delete cascade
);

create index if not exists idx_training_signature_events_request
  on public.training_signature_events(signature_request_id,occurred_at);

do $$
declare t text;
begin
  foreach t in array array[
    'training_portal_accounts','training_portal_invitations',
    'training_portal_documents','training_signature_requests'
  ] loop
    execute format('drop trigger if exists %I on public.%I','set_'||t||'_updated_at',t);
    execute format(
      'create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()',
      'set_'||t||'_updated_at',t
    );
  end loop;
end $$;

create or replace function public.training_portals_feature_enabled(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.organization_has_plan_feature(p_organization_id,'training_portals_signatures');
$$;

create or replace function public.is_training_portal_account(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.training_portal_accounts a
    join public.organizations o on o.id=a.organization_id
    where a.id=p_account_id
      and a.user_id=auth.uid()
      and a.status='active'
      and o.status in ('trial','active')
      and public.training_portals_feature_enabled(a.organization_id)
      and (
        (a.subject_kind='trainee' and exists (
          select 1 from public.training_trainees t
          where t.organization_id=a.organization_id and t.id=a.trainee_id and t.status='active'
        ))
        or (a.subject_kind='trainer' and exists (
          select 1 from public.training_trainers t
          where t.organization_id=a.organization_id and t.id=a.trainer_id and t.status='active'
        ))
        or (a.subject_kind='client' and exists (
          select 1 from public.training_customers c
          where c.organization_id=a.organization_id and c.id=a.customer_id and c.status='active'
        ))
      )
  );
$$;

create or replace function public.training_portal_subject_session_allowed(
  p_account_id uuid,
  p_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.training_portal_accounts a
    join public.training_sessions s
      on s.organization_id=a.organization_id and s.id=p_session_id
    where a.id=p_account_id
      and (
        (a.subject_kind='trainee' and exists (
          select 1 from public.training_session_enrollments e
          where e.organization_id=a.organization_id
            and e.session_id=s.id and e.trainee_id=a.trainee_id
            and e.status<>'canceled'
        ))
        or (a.subject_kind='trainer' and s.trainer_id=a.trainer_id)
        or (a.subject_kind='client' and exists (
          select 1 from public.training_commercial_documents d
          where d.organization_id=a.organization_id
            and d.customer_id=a.customer_id and d.session_id=s.id
            and d.status<>'canceled'
        ))
      )
  );
$$;

create or replace function public.current_training_portal_accounts()
returns table(
  account_id uuid,
  organization_id uuid,
  subject_kind text,
  subject_id uuid,
  organization_name text,
  organization_logo_url text,
  organization_primary_color text,
  subject_name text,
  display_name text,
  email text,
  pending_signatures integer,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,a.organization_id,a.subject_kind,
    case a.subject_kind
      when 'trainee' then a.trainee_id
      when 'trainer' then a.trainer_id
      else a.customer_id
    end,
    coalesce(o.public_name,o.name),o.logo_url,o.primary_color,
    case a.subject_kind
      when 'trainee' then trim(concat(t.first_name,' ',t.last_name))
      when 'trainer' then trim(concat(tr.first_name,' ',tr.last_name))
      else c.legal_name
    end as subject_name,
    a.display_name,a.email,
    (
      select count(*)::integer
      from public.training_signature_requests r
      where r.account_id=a.id and r.status='pending'
    ),
    a.last_seen_at
  from public.training_portal_accounts a
  join public.organizations o on o.id=a.organization_id
  left join public.training_trainees t
    on t.organization_id=a.organization_id and t.id=a.trainee_id
  left join public.training_trainers tr
    on tr.organization_id=a.organization_id and tr.id=a.trainer_id
  left join public.training_customers c
    on c.organization_id=a.organization_id and c.id=a.customer_id
  where auth.uid() is not null
    and a.user_id=auth.uid()
    and a.status='active'
    and public.is_training_portal_account(a.id)
  order by o.name,a.subject_kind,subject_name;
$$;

create or replace function public.touch_training_portal_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_training_portal_account(p_account_id) then
    raise exception 'Acces portail refuse.';
  end if;
  update public.training_portal_accounts
  set last_seen_at=now(),updated_at=now()
  where id=p_account_id and user_id=auth.uid();
end;
$$;

create or replace function public.get_training_portal_invitation(p_token text)
returns table(
  organization_name text,
  organization_logo_url text,
  organization_primary_color text,
  subject_kind text,
  subject_name text,
  invited_email text,
  invited_name text,
  invitation_status text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(o.public_name,o.name),o.logo_url,o.primary_color,i.subject_kind,
    case i.subject_kind
      when 'trainee' then trim(concat(t.first_name,' ',t.last_name))
      when 'trainer' then trim(concat(tr.first_name,' ',tr.last_name))
      else c.legal_name
    end,
    i.email,i.display_name,
    case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,
    i.expires_at
  from public.training_portal_invitations i
  join public.organizations o on o.id=i.organization_id
  left join public.training_trainees t
    on t.organization_id=i.organization_id and t.id=i.trainee_id
  left join public.training_trainers tr
    on tr.organization_id=i.organization_id and tr.id=i.trainer_id
  left join public.training_customers c
    on c.organization_id=i.organization_id and c.id=i.customer_id
  where i.token_hash=extensions.digest(trim(p_token),'sha256')
    and public.training_portals_feature_enabled(i.organization_id)
  limit 1;
$$;

alter table public.email_outbox drop constraint if exists email_outbox_template_key_check;
alter table public.email_outbox add constraint email_outbox_template_key_check check (template_key in (
  'customer_pending','customer_confirmed','customer_rescheduled','customer_cancelled','customer_reminder',
  'business_new_booking','business_rescheduled','business_cancelled','team_invitation',
  'training_convocation','training_attestation','training_satisfaction_request','training_commercial_document',
  'training_invoice','training_portal_invitation','training_signature_request',
  'security_client_portal_invitation','cleaning_client_portal_invitation','coiffure_client_portal_invitation',
  'security_quote','security_invoice','security_client_message','security_client_portal_message',
  'cleaning_client_portal_message','coiffure_loyalty_reward','training_team_invitation','support_message'
));

create or replace function public.enqueue_training_portal_invitation_email(
  p_invitation_id uuid,
  p_raw_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.training_portal_invitations%rowtype;
  v_organization public.organizations%rowtype;
  v_subject_name text;
  v_key text;
begin
  select * into v_invitation
  from public.training_portal_invitations
  where id=p_invitation_id and status='pending';
  if v_invitation.id is null then return; end if;

  select * into v_organization
  from public.organizations where id=v_invitation.organization_id;

  if v_invitation.subject_kind='trainee' then
    select trim(concat(first_name,' ',last_name)) into v_subject_name
    from public.training_trainees
    where organization_id=v_invitation.organization_id and id=v_invitation.trainee_id;
  elsif v_invitation.subject_kind='trainer' then
    select trim(concat(first_name,' ',last_name)) into v_subject_name
    from public.training_trainers
    where organization_id=v_invitation.organization_id and id=v_invitation.trainer_id;
  else
    select legal_name into v_subject_name
    from public.training_customers
    where organization_id=v_invitation.organization_id and id=v_invitation.customer_id;
  end if;

  v_key := 'training-portal:'||v_invitation.id::text||':'||
    encode(extensions.digest(p_raw_token,'sha256'),'hex');

  insert into public.email_outbox(
    organization_id,appointment_id,template_key,recipient_email,recipient_name,
    payload,dedupe_key,status,scheduled_for,attempts
  ) values (
    v_invitation.organization_id,null,'training_portal_invitation',
    lower(v_invitation.email),coalesce(v_invitation.display_name,v_subject_name),
    jsonb_build_object(
      'organization_name',coalesce(v_organization.public_name,v_organization.name),
      'organization_primary_color',v_organization.primary_color,
      'organization_logo_url',v_organization.logo_url,
      'subject_kind',v_invitation.subject_kind,
      'subject_name',v_subject_name,
      'invitation_token',p_raw_token,
      'invited_name',v_invitation.display_name,
      'expires_at',v_invitation.expires_at,
      'contact_email',coalesce(v_organization.training_reply_to_email,v_organization.company_email),
      'contact_phone',v_organization.company_phone
    ),
    v_key,'pending',now(),0
  ) on conflict(dedupe_key) do nothing;
end;
$$;

create or replace function public.create_training_portal_invitation(
  p_organization_id uuid,
  p_subject_kind text,
  p_subject_id uuid,
  p_email text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_token text;
  v_email text := lower(trim(coalesce(p_email,'')));
  v_subject_email text;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Seuls le proprietaire et les administrateurs peuvent inviter un utilisateur.';
  end if;
  if not public.training_portals_feature_enabled(p_organization_id) then
    raise exception 'Le module Portails et signatures n est pas actif.';
  end if;
  if p_subject_kind not in ('trainee','trainer','client') then
    raise exception 'Type d espace invalide.';
  end if;

  if p_subject_kind='trainee' then
    select email into v_subject_email from public.training_trainees
    where organization_id=p_organization_id and id=p_subject_id and status='active';
  elsif p_subject_kind='trainer' then
    select email into v_subject_email from public.training_trainers
    where organization_id=p_organization_id and id=p_subject_id and status='active';
  else
    select email into v_subject_email from public.training_customers
    where organization_id=p_organization_id and id=p_subject_id and status='active';
  end if;
  if not found then raise exception 'Fiche introuvable ou inactive.'; end if;

  v_email := coalesce(nullif(v_email,''),lower(trim(coalesce(v_subject_email,''))));
  if v_email='' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'Adresse e-mail invalide.';
  end if;

  if exists (
    select 1 from public.training_portal_accounts a
    where a.organization_id=p_organization_id
      and a.subject_kind=p_subject_kind
      and case p_subject_kind
        when 'trainee' then a.trainee_id=p_subject_id
        when 'trainer' then a.trainer_id=p_subject_id
        else a.customer_id=p_subject_id
      end
      and lower(a.email)=v_email and a.status='active'
  ) then raise exception 'Cette adresse dispose deja d un acces actif.'; end if;

  update public.training_portal_invitations
  set status='revoked',revoked_at=now(),updated_at=now()
  where organization_id=p_organization_id
    and subject_kind=p_subject_kind
    and case p_subject_kind
      when 'trainee' then trainee_id=p_subject_id
      when 'trainer' then trainer_id=p_subject_id
      else customer_id=p_subject_id
    end
    and lower(email)=v_email and status='pending';

  v_token := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.training_portal_invitations(
    organization_id,subject_kind,trainee_id,trainer_id,customer_id,
    email,display_name,token_hash,status,expires_at,invited_by
  ) values (
    p_organization_id,p_subject_kind,
    case when p_subject_kind='trainee' then p_subject_id end,
    case when p_subject_kind='trainer' then p_subject_id end,
    case when p_subject_kind='client' then p_subject_id end,
    v_email,nullif(trim(coalesce(p_display_name,'')),''),
    extensions.digest(v_token,'sha256'),'pending',now()+interval '7 days',auth.uid()
  ) returning id into v_id;

  perform public.enqueue_training_portal_invitation_email(v_id,v_token);
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),'training.portal_invited',p_subject_kind,p_subject_id::text,
    jsonb_build_object('email',v_email,'invitation_id',v_id)
  );
  return v_id;
end;
$$;

create or replace function public.resend_training_portal_invitation(
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
  v_id uuid;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Acces refuse.';
  end if;
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  update public.training_portal_invitations
  set token_hash=extensions.digest(v_token,'sha256'),status='pending',
      expires_at=now()+interval '7 days',revoked_at=null,updated_at=now()
  where organization_id=p_organization_id and id=p_invitation_id
    and status in ('pending','expired')
  returning id into v_id;
  if v_id is null then raise exception 'Invitation introuvable.'; end if;
  perform public.enqueue_training_portal_invitation_email(v_id,v_token);
end;
$$;

create or replace function public.revoke_training_portal_invitation(
  p_organization_id uuid,
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Acces refuse.';
  end if;
  update public.training_portal_invitations
  set status='revoked',revoked_at=now(),updated_at=now()
  where organization_id=p_organization_id and id=p_invitation_id and status='pending';
end;
$$;

create or replace function public.accept_training_portal_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.training_portal_invitations%rowtype;
  v_email text;
  v_account_id uuid;
begin
  if auth.uid() is null then raise exception 'Connectez-vous pour accepter cette invitation.'; end if;
  v_email:=lower(coalesce(auth.jwt()->>'email',''));
  select * into v_invitation
  from public.training_portal_invitations
  where token_hash=extensions.digest(trim(p_token),'sha256')
  for update;

  if v_invitation.id is null then raise exception 'Invitation introuvable.'; end if;
  if v_invitation.status<>'pending' or v_invitation.expires_at<=now() then
    raise exception 'Cette invitation n est plus valide.';
  end if;
  if v_email='' or v_email<>lower(v_invitation.email) then
    raise exception 'Connectez-vous avec l adresse e-mail invitee.';
  end if;
  if not public.training_portals_feature_enabled(v_invitation.organization_id) then
    raise exception 'Le module Portails et signatures n est plus actif.';
  end if;

  select id into v_account_id
  from public.training_portal_accounts a
  where a.organization_id=v_invitation.organization_id
    and a.user_id=auth.uid()
    and a.subject_kind=v_invitation.subject_kind
    and case v_invitation.subject_kind
      when 'trainee' then a.trainee_id=v_invitation.trainee_id
      when 'trainer' then a.trainer_id=v_invitation.trainer_id
      else a.customer_id=v_invitation.customer_id
    end
  limit 1;

  if v_account_id is null then
    insert into public.training_portal_accounts(
      organization_id,user_id,subject_kind,trainee_id,trainer_id,customer_id,
      email,display_name,status,invited_at,accepted_at,created_by
    ) values (
      v_invitation.organization_id,auth.uid(),v_invitation.subject_kind,
      v_invitation.trainee_id,v_invitation.trainer_id,v_invitation.customer_id,
      v_email,v_invitation.display_name,'active',v_invitation.created_at,now(),v_invitation.invited_by
    ) returning id into v_account_id;
  else
    update public.training_portal_accounts
    set email=v_email,display_name=v_invitation.display_name,status='active',
        accepted_at=now(),updated_at=now()
    where id=v_account_id;
  end if;

  update public.training_portal_invitations
  set status='accepted',accepted_by=auth.uid(),accepted_at=now(),updated_at=now()
  where id=v_invitation.id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    v_invitation.organization_id,auth.uid(),'training.portal_accepted',
    v_invitation.subject_kind,
    coalesce(v_invitation.trainee_id,v_invitation.trainer_id,v_invitation.customer_id)::text,
    jsonb_build_object('account_id',v_account_id)
  );
  return v_account_id;
end;
$$;

create or replace function public.set_training_portal_account_status(
  p_organization_id uuid,
  p_account_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Acces refuse.';
  end if;
  if p_status not in ('active','disabled') then raise exception 'Statut invalide.'; end if;
  update public.training_portal_accounts
  set status=p_status,updated_at=now()
  where organization_id=p_organization_id and id=p_account_id;
  if not found then raise exception 'Compte portail introuvable.'; end if;
end;
$$;

create or replace function public.training_portal_admin_overview(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Acces refuse.';
  end if;
  if not public.training_portals_feature_enabled(p_organization_id) then
    raise exception 'Le module Portails et signatures n est pas actif.';
  end if;

  return jsonb_build_object(
    'summary',jsonb_build_object(
      'active_accounts',(
        select count(*) from public.training_portal_accounts
        where organization_id=p_organization_id and status='active'
      ),
      'pending_invitations',(
        select count(*) from public.training_portal_invitations
        where organization_id=p_organization_id and status='pending' and expires_at>now()
      ),
      'pending_signatures',(
        select count(*) from public.training_signature_requests
        where organization_id=p_organization_id and status='pending'
      ),
      'signed_documents',(
        select count(*) from public.training_signature_requests
        where organization_id=p_organization_id and status='signed'
      ),
      'received_documents',(
        select count(*) from public.training_portal_documents
        where organization_id=p_organization_id
          and direction='portal_to_organization' and status='active'
      )
    ),
    'subjects',coalesce((
      select jsonb_agg(row_data order by row_data->>'subject_kind',row_data->>'name')
      from (
        select jsonb_build_object(
          'id',t.id,'subject_kind','trainee',
          'name',trim(concat(t.first_name,' ',t.last_name)),
          'email',t.email,'detail',t.company,'status',t.status,
          'session_count',(
            select count(*) from public.training_session_enrollments e
            where e.organization_id=t.organization_id and e.trainee_id=t.id and e.status<>'canceled'
          )
        ) row_data
        from public.training_trainees t
        where t.organization_id=p_organization_id and t.status<>'archived'
        union all
        select jsonb_build_object(
          'id',t.id,'subject_kind','trainer',
          'name',trim(concat(t.first_name,' ',t.last_name)),
          'email',t.email,'detail',array_to_string(t.specialties,', '),'status',t.status,
          'session_count',(
            select count(*) from public.training_sessions s
            where s.organization_id=t.organization_id and s.trainer_id=t.id and s.status<>'canceled'
          )
        )
        from public.training_trainers t
        where t.organization_id=p_organization_id and t.status<>'archived'
        union all
        select jsonb_build_object(
          'id',c.id,'subject_kind','client',
          'name',c.legal_name,'email',c.email,'detail',c.contact_name,'status',c.status,
          'session_count',(
            select count(distinct d.session_id)
            from public.training_commercial_documents d
            where d.organization_id=c.organization_id and d.customer_id=c.id
              and d.session_id is not null and d.status<>'canceled'
          )
        )
        from public.training_customers c
        where c.organization_id=p_organization_id and c.status<>'archived'
      ) subjects
    ),'[]'::jsonb),
    'accounts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'subject_kind',a.subject_kind,
        'subject_id',coalesce(a.trainee_id,a.trainer_id,a.customer_id),
        'email',a.email,'display_name',a.display_name,'status',a.status,
        'last_seen_at',a.last_seen_at,'accepted_at',a.accepted_at,
        'pending_signatures',(
          select count(*) from public.training_signature_requests r
          where r.account_id=a.id and r.status='pending'
        )
      ) order by a.created_at desc)
      from public.training_portal_accounts a
      where a.organization_id=p_organization_id
    ),'[]'::jsonb),
    'invitations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',i.id,'subject_kind',i.subject_kind,
        'subject_id',coalesce(i.trainee_id,i.trainer_id,i.customer_id),
        'email',i.email,'display_name',i.display_name,
        'status',case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,
        'expires_at',i.expires_at,'created_at',i.created_at
      ) order by i.created_at desc)
      from public.training_portal_invitations i
      where i.organization_id=p_organization_id and i.status in ('pending','expired')
    ),'[]'::jsonb),
    'sessions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',s.id,'title',s.title,'starts_at',s.starts_at,'ends_at',s.ends_at,
        'status',s.status,'trainer_id',s.trainer_id
      ) order by s.starts_at desc)
      from public.training_sessions s
      where s.organization_id=p_organization_id and s.status<>'canceled'
    ),'[]'::jsonb),
    'account_sessions',coalesce((
      select jsonb_agg(jsonb_build_object('account_id',a.id,'session_id',s.id))
      from public.training_portal_accounts a
      join public.training_sessions s
        on s.organization_id=a.organization_id and s.status<>'canceled'
      where a.organization_id=p_organization_id and a.status='active'
        and public.training_portal_subject_session_allowed(a.id,s.id)
    ),'[]'::jsonb),
    'documents',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',d.id,'subject_kind',d.subject_kind,
        'subject_id',coalesce(d.trainee_id,d.trainer_id,d.customer_id),
        'session_id',d.session_id,'title',d.title,'category',d.category,
        'direction',d.direction,'storage_bucket',d.storage_bucket,
        'storage_path',d.storage_path,'mime_type',d.mime_type,'size_bytes',d.size_bytes,
        'status',d.status,'published_at',d.published_at
      ) order by d.published_at desc)
      from public.training_portal_documents d
      where d.organization_id=p_organization_id and d.status='active'
    ),'[]'::jsonb),
    'signatures',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.id,'account_id',r.account_id,'subject_kind',a.subject_kind,
        'subject_id',coalesce(a.trainee_id,a.trainer_id,a.customer_id),
        'title',r.title,'request_type',r.request_type,'source_bucket',r.source_bucket,
        'source_path',r.source_path,'session_id',r.session_id,'status',r.status,
        'due_date',r.due_date,'opened_at',r.opened_at,'signed_at',r.signed_at,
        'signer_name',r.signer_name,'proof_reference',r.proof_reference,
        'signature_image_path',r.signature_image_path,
        'document_sha256',r.document_sha256,
        'signature_payload_sha256',r.signature_payload_sha256,
        'reminder_count',r.reminder_count,'last_reminded_at',r.last_reminded_at,
        'created_at',r.created_at,
        'events',coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',e.id,'event_type',e.event_type,'actor_label',e.actor_label,
            'metadata',e.metadata,'occurred_at',e.occurred_at
          ) order by e.occurred_at)
          from public.training_signature_events e
          where e.signature_request_id=r.id
        ),'[]'::jsonb)
      ) order by r.created_at desc)
      from public.training_signature_requests r
      join public.training_portal_accounts a on a.id=r.account_id
      where r.organization_id=p_organization_id
    ),'[]'::jsonb),
    'source_documents',coalesce((
      select jsonb_agg(to_jsonb(source_document) order by source_document.created_at desc)
      from (
        select
          d.id,'training_document'::text source_kind,d.title,d.category,
          'training-documents'::text storage_bucket,d.storage_path,
          d.mime_type,d.size_bytes,d.session_id,d.trainee_id,
          null::uuid trainer_id,null::uuid customer_id,d.created_at,
          d.id training_document_id,null::uuid commercial_document_id,null::uuid invoice_id
        from public.training_documents d
        where d.organization_id=p_organization_id
          and d.status='published' and d.visibility<>'internal'
        union all
        select
          d.id,'commercial_document',
          coalesce(d.reference||' - ','')||d.title,
          d.document_type,'training-documents',d.generated_document_path,
          'application/pdf',null::bigint,d.session_id,d.trainee_id,
          null::uuid,d.customer_id,d.created_at,
          null::uuid,d.id,null::uuid
        from public.training_commercial_documents d
        where d.organization_id=p_organization_id
          and d.generated_document_path is not null
          and d.status not in ('draft','canceled')
        union all
        select
          i.id,'invoice',
          coalesce(i.invoice_number||' - ','')||i.title,
          i.document_kind,'training-documents',i.generated_document_path,
          'application/pdf',null::bigint,i.session_id,null::uuid,
          null::uuid,i.customer_id,i.created_at,
          null::uuid,null::uuid,i.id
        from public.training_invoices i
        where i.organization_id=p_organization_id
          and i.generated_document_path is not null
          and i.status not in ('draft','canceled')
      ) source_document
    ),'[]'::jsonb)
  );
end;
$$;

create or replace function public.training_portal_dashboard(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.training_portal_accounts%rowtype;
  v_result jsonb;
begin
  if not public.is_training_portal_account(p_account_id) then
    raise exception 'Acces portail refuse.';
  end if;
  select * into v_account
  from public.training_portal_accounts where id=p_account_id;

  update public.training_portal_accounts
  set last_seen_at=now(),updated_at=now()
  where id=p_account_id;

  select jsonb_build_object(
    'account',jsonb_build_object(
      'id',v_account.id,'subject_kind',v_account.subject_kind,
      'subject_id',coalesce(v_account.trainee_id,v_account.trainer_id,v_account.customer_id),
      'display_name',v_account.display_name,'email',v_account.email
    ),
    'organization',jsonb_build_object(
      'id',o.id,'name',coalesce(o.public_name,o.name),'logo_url',o.logo_url,
      'primary_color',o.primary_color,
      'email',coalesce(o.training_reply_to_email,o.company_email),
      'phone',o.company_phone,'address',o.company_address
    ),
    'subject',case v_account.subject_kind
      when 'trainee' then (
        select jsonb_build_object(
          'id',t.id,'name',trim(concat(t.first_name,' ',t.last_name)),
          'email',t.email,'phone',t.phone,'detail',t.company
        ) from public.training_trainees t
        where t.organization_id=v_account.organization_id and t.id=v_account.trainee_id
      )
      when 'trainer' then (
        select jsonb_build_object(
          'id',t.id,'name',trim(concat(t.first_name,' ',t.last_name)),
          'email',t.email,'phone',t.phone,'detail',array_to_string(t.specialties,', ')
        ) from public.training_trainers t
        where t.organization_id=v_account.organization_id and t.id=v_account.trainer_id
      )
      else (
        select jsonb_build_object(
          'id',c.id,'name',c.legal_name,'email',c.email,'phone',c.phone,
          'detail',c.contact_name
        ) from public.training_customers c
        where c.organization_id=v_account.organization_id and c.id=v_account.customer_id
      )
    end,
    'summary',jsonb_build_object(
      'sessions',(
        select count(*)
        from public.training_sessions s
        where s.organization_id=v_account.organization_id
          and s.status<>'canceled'
          and public.training_portal_subject_session_allowed(v_account.id,s.id)
      ),
      'documents',(
        select count(*)
        from public.training_portal_documents d
        where d.organization_id=v_account.organization_id and d.status='active'
          and d.subject_kind=v_account.subject_kind
          and coalesce(d.trainee_id,d.trainer_id,d.customer_id)=
              coalesce(v_account.trainee_id,v_account.trainer_id,v_account.customer_id)
      ),
      'pending_signatures',(
        select count(*) from public.training_signature_requests r
        where r.account_id=v_account.id and r.status='pending'
      ),
      'signed_documents',(
        select count(*) from public.training_signature_requests r
        where r.account_id=v_account.id and r.status='signed'
      )
    ),
    'sessions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',s.id,'title',s.title,'starts_at',s.starts_at,'ends_at',s.ends_at,
        'location',s.location,'modality',s.modality,'status',s.status,
        'program_title',p.title,
        'trainer_name',trim(concat(tr.first_name,' ',tr.last_name)),
        'enrollment_status',case when v_account.subject_kind='trainee' then (
          select e.status from public.training_session_enrollments e
          where e.organization_id=s.organization_id and e.session_id=s.id
            and e.trainee_id=v_account.trainee_id
        ) end
      ) order by s.starts_at desc)
      from public.training_sessions s
      join public.training_programs p
        on p.organization_id=s.organization_id and p.id=s.program_id
      left join public.training_trainers tr
        on tr.organization_id=s.organization_id and tr.id=s.trainer_id
      where s.organization_id=v_account.organization_id
        and s.status<>'canceled'
        and public.training_portal_subject_session_allowed(v_account.id,s.id)
    ),'[]'::jsonb),
    'documents',coalesce((
      select jsonb_agg(to_jsonb(document_row) order by document_row.published_at desc)
      from (
        select
          'portal'::text source_kind,d.id,d.title,d.category,d.storage_bucket,
          d.storage_path,d.mime_type,d.size_bytes,d.session_id,d.direction,d.published_at
        from public.training_portal_documents d
        where d.organization_id=v_account.organization_id and d.status='active'
          and d.subject_kind=v_account.subject_kind
          and coalesce(d.trainee_id,d.trainer_id,d.customer_id)=
              coalesce(v_account.trainee_id,v_account.trainer_id,v_account.customer_id)
          and (d.session_id is null or public.training_portal_subject_session_allowed(v_account.id,d.session_id))
        union all
        select
          'training_document',d.id,d.title,d.category,'training-documents',
          d.storage_path,d.mime_type,d.size_bytes,d.session_id,
          'organization_to_portal',d.created_at
        from public.training_documents d
        where d.organization_id=v_account.organization_id
          and d.status='published' and d.visibility<>'internal'
          and (
            (v_account.subject_kind='trainee' and (
              d.trainee_id=v_account.trainee_id
              or (d.session_id is not null and public.training_portal_subject_session_allowed(v_account.id,d.session_id))
            ))
            or (v_account.subject_kind='trainer' and d.session_id is not null
                and public.training_portal_subject_session_allowed(v_account.id,d.session_id))
          )
          and not exists (
            select 1 from public.training_portal_documents pd
            where pd.organization_id=d.organization_id
              and pd.storage_bucket='training-documents'
              and pd.storage_path=d.storage_path
              and pd.subject_kind=v_account.subject_kind
              and coalesce(pd.trainee_id,pd.trainer_id,pd.customer_id)=
                  coalesce(v_account.trainee_id,v_account.trainer_id,v_account.customer_id)
          )
        union all
        select
          'commercial_document',d.id,coalesce(d.reference||' - ','')||d.title,
          d.document_type,'training-documents',d.generated_document_path,
          'application/pdf',null::bigint,d.session_id,'organization_to_portal',d.created_at
        from public.training_commercial_documents d
        where d.organization_id=v_account.organization_id
          and d.generated_document_path is not null
          and d.status not in ('draft','canceled')
          and (
            (v_account.subject_kind='trainee' and d.trainee_id=v_account.trainee_id)
            or (v_account.subject_kind='client' and d.customer_id=v_account.customer_id)
          )
          and not exists (
            select 1 from public.training_portal_documents pd
            where pd.organization_id=d.organization_id
              and pd.storage_bucket='training-documents'
              and pd.storage_path=d.generated_document_path
              and pd.subject_kind=v_account.subject_kind
              and coalesce(pd.trainee_id,pd.trainer_id,pd.customer_id)=
                  coalesce(v_account.trainee_id,v_account.trainer_id,v_account.customer_id)
          )
        union all
        select
          'invoice',i.id,coalesce(i.invoice_number||' - ','')||i.title,
          i.document_kind,'training-documents',i.generated_document_path,
          'application/pdf',null::bigint,i.session_id,'organization_to_portal',i.created_at
        from public.training_invoices i
        where i.organization_id=v_account.organization_id
          and i.generated_document_path is not null
          and i.status not in ('draft','canceled')
          and v_account.subject_kind='client'
          and i.customer_id=v_account.customer_id
          and not exists (
            select 1 from public.training_portal_documents pd
            where pd.organization_id=i.organization_id
              and pd.storage_bucket='training-documents'
              and pd.storage_path=i.generated_document_path
              and pd.subject_kind='client'
              and pd.customer_id=v_account.customer_id
          )
      ) document_row
    ),'[]'::jsonb),
    'signatures',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.id,'title',r.title,'request_type',r.request_type,
        'source_bucket',r.source_bucket,'source_path',r.source_path,
        'session_id',r.session_id,'status',r.status,'due_date',r.due_date,
        'consent_text',r.consent_text,'opened_at',r.opened_at,'signed_at',r.signed_at,
        'signer_name',r.signer_name,'proof_reference',r.proof_reference,
        'signature_image_path',r.signature_image_path,
        'document_sha256',r.document_sha256,
        'signature_payload_sha256',r.signature_payload_sha256,
        'created_at',r.created_at,
        'events',coalesce((
          select jsonb_agg(jsonb_build_object(
            'event_type',e.event_type,'actor_label',e.actor_label,
            'occurred_at',e.occurred_at
          ) order by e.occurred_at)
          from public.training_signature_events e
          where e.signature_request_id=r.id
        ),'[]'::jsonb)
      ) order by case when r.status='pending' then 0 else 1 end,r.created_at desc)
      from public.training_signature_requests r
      where r.account_id=v_account.id
    ),'[]'::jsonb),
    'attendance',case when v_account.subject_kind='trainee' then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'session_id',a.session_id,'session_title',s.title,
        'attendance_date',a.attendance_date,'period',a.period,
        'status',a.status,'signatory_name',a.signatory_name,'signed_at',a.signed_at
      ) order by a.attendance_date desc,a.period)
      from public.training_attendance a
      join public.training_sessions s
        on s.organization_id=a.organization_id and s.id=a.session_id
      where a.organization_id=v_account.organization_id
        and a.trainee_id=v_account.trainee_id
    ),'[]'::jsonb) else '[]'::jsonb end,
    'evaluations',case when v_account.subject_kind='trainee' then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',q.id,'session_id',q.session_id,'session_title',s.title,
        'status',q.status,'scheduled_for',q.scheduled_for,
        'completed_at',q.completed_at,'public_token',q.public_token
      ) order by q.created_at desc)
      from public.training_satisfaction_surveys q
      join public.training_sessions s
        on s.organization_id=q.organization_id and s.id=q.session_id
      where q.organization_id=v_account.organization_id
        and q.trainee_id=v_account.trainee_id
    ),'[]'::jsonb) else '[]'::jsonb end
  ) into v_result
  from public.organizations o
  where o.id=v_account.organization_id;

  return v_result;
end;
$$;

create or replace function public.publish_training_portal_document(
  p_organization_id uuid,
  p_account_id uuid,
  p_session_id uuid,
  p_title text,
  p_category text,
  p_storage_bucket text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_training_document_id uuid default null,
  p_commercial_document_id uuid default null,
  p_invoice_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.training_portal_accounts%rowtype;
  v_id uuid;
  v_subject_id uuid;
  v_source_count integer;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Acces refuse.';
  end if;
  if not public.training_portals_feature_enabled(p_organization_id) then
    raise exception 'Le module Portails et signatures n est pas actif.';
  end if;
  select * into v_account
  from public.training_portal_accounts
  where organization_id=p_organization_id and id=p_account_id and status='active';
  if v_account.id is null then raise exception 'Compte portail introuvable ou inactif.'; end if;
  if p_category not in (
    'identity','prerequisite','administrative','programme','support','convocation',
    'agreement','contract','invoice','attendance','evaluation','certificate','other'
  ) then raise exception 'Categorie invalide.'; end if;
  if p_storage_bucket not in ('training-portal-documents','training-documents') then
    raise exception 'Espace de stockage invalide.';
  end if;
  if p_session_id is not null
     and not public.training_portal_subject_session_allowed(v_account.id,p_session_id) then
    raise exception 'La session ne correspond pas a cet espace.';
  end if;

  v_subject_id:=coalesce(v_account.trainee_id,v_account.trainer_id,v_account.customer_id);
  if p_storage_bucket='training-portal-documents' then
    if coalesce(p_storage_path,'') not like (
      p_organization_id::text||'/'||v_account.subject_kind||'/'||v_subject_id::text||'/%'
    ) then raise exception 'Chemin de document invalide.'; end if;
    if p_training_document_id is not null or p_commercial_document_id is not null or p_invoice_id is not null then
      raise exception 'Une piece importee ne peut pas pointer vers une source interne.';
    end if;
  else
    v_source_count:=
      (case when p_training_document_id is not null then 1 else 0 end)+
      (case when p_commercial_document_id is not null then 1 else 0 end)+
      (case when p_invoice_id is not null then 1 else 0 end);
    if v_source_count<>1 then raise exception 'Une source interne unique est requise.'; end if;

    if p_training_document_id is not null and not exists (
      select 1 from public.training_documents d
      where d.organization_id=p_organization_id and d.id=p_training_document_id
        and d.storage_path=p_storage_path and d.status='published'
        and (
          (v_account.subject_kind='trainee' and (
            d.trainee_id=v_account.trainee_id
            or (d.session_id is not null and public.training_portal_subject_session_allowed(v_account.id,d.session_id))
          ))
          or (v_account.subject_kind='trainer' and d.session_id is not null
              and public.training_portal_subject_session_allowed(v_account.id,d.session_id))
        )
    ) then raise exception 'Document Formation non partageable avec ce compte.'; end if;

    if p_commercial_document_id is not null and not exists (
      select 1 from public.training_commercial_documents d
      where d.organization_id=p_organization_id and d.id=p_commercial_document_id
        and d.generated_document_path=p_storage_path
        and (
          (v_account.subject_kind='trainee' and d.trainee_id=v_account.trainee_id)
          or (v_account.subject_kind='client' and d.customer_id=v_account.customer_id)
        )
    ) then raise exception 'Document commercial non partageable avec ce compte.'; end if;

    if p_invoice_id is not null and not exists (
      select 1 from public.training_invoices i
      where i.organization_id=p_organization_id and i.id=p_invoice_id
        and i.generated_document_path=p_storage_path
        and v_account.subject_kind='client' and i.customer_id=v_account.customer_id
    ) then raise exception 'Facture non partageable avec ce compte.'; end if;
  end if;

  insert into public.training_portal_documents(
    organization_id,subject_kind,trainee_id,trainer_id,customer_id,session_id,
    training_document_id,commercial_document_id,invoice_id,title,category,direction,
    storage_bucket,storage_path,mime_type,size_bytes,created_by
  ) values (
    p_organization_id,v_account.subject_kind,v_account.trainee_id,v_account.trainer_id,
    v_account.customer_id,p_session_id,p_training_document_id,p_commercial_document_id,
    p_invoice_id,trim(p_title),p_category,'organization_to_portal',
    p_storage_bucket,p_storage_path,nullif(trim(coalesce(p_mime_type,'')),''),
    p_size_bytes,auth.uid()
  ) returning id into v_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),'training.portal_document_published',
    'training_portal_document',v_id::text,
    jsonb_build_object('account_id',p_account_id,'session_id',p_session_id,'category',p_category)
  );
  return v_id;
end;
$$;

create or replace function public.register_training_portal_document(
  p_account_id uuid,
  p_session_id uuid,
  p_title text,
  p_category text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.training_portal_accounts%rowtype;
  v_subject_id uuid;
  v_id uuid;
begin
  if not public.is_training_portal_account(p_account_id) then
    raise exception 'Acces portail refuse.';
  end if;
  select * into v_account from public.training_portal_accounts where id=p_account_id;
  if p_category not in ('identity','prerequisite','administrative','other') then
    raise exception 'Categorie de depot invalide.';
  end if;
  if p_session_id is not null
     and not public.training_portal_subject_session_allowed(v_account.id,p_session_id) then
    raise exception 'La session ne correspond pas a votre espace.';
  end if;
  if p_size_bytes is null or p_size_bytes<1 or p_size_bytes>20971520 then
    raise exception 'Le fichier doit peser moins de 20 Mo.';
  end if;
  v_subject_id:=coalesce(v_account.trainee_id,v_account.trainer_id,v_account.customer_id);
  if coalesce(p_storage_path,'') not like (
    v_account.organization_id::text||'/'||v_account.subject_kind||'/'||v_subject_id::text||'/%'
  ) then raise exception 'Chemin de document invalide.'; end if;

  insert into public.training_portal_documents(
    organization_id,subject_kind,trainee_id,trainer_id,customer_id,session_id,
    uploaded_by_account_id,title,category,direction,storage_bucket,storage_path,
    mime_type,size_bytes,created_by
  ) values (
    v_account.organization_id,v_account.subject_kind,v_account.trainee_id,
    v_account.trainer_id,v_account.customer_id,p_session_id,v_account.id,
    trim(p_title),p_category,'portal_to_organization','training-portal-documents',
    p_storage_path,nullif(trim(coalesce(p_mime_type,'')),''),p_size_bytes,auth.uid()
  ) returning id into v_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    v_account.organization_id,auth.uid(),'training.portal_document_received',
    'training_portal_document',v_id::text,
    jsonb_build_object('account_id',p_account_id,'session_id',p_session_id,'category',p_category)
  );
  return v_id;
end;
$$;

create or replace function public.archive_training_portal_document(
  p_organization_id uuid,
  p_document_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Acces refuse.';
  end if;
  update public.training_portal_documents
  set status='archived',updated_at=now()
  where organization_id=p_organization_id and id=p_document_id and status='active';
  if not found then raise exception 'Document introuvable.'; end if;
end;
$$;

create or replace function public.enqueue_training_signature_email(
  p_request_id uuid,
  p_is_reminder boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.training_signature_requests%rowtype;
  v_account public.training_portal_accounts%rowtype;
  v_organization public.organizations%rowtype;
  v_key text;
begin
  select * into v_request
  from public.training_signature_requests
  where id=p_request_id and status='pending';
  if v_request.id is null then return; end if;
  select * into v_account from public.training_portal_accounts where id=v_request.account_id;
  select * into v_organization from public.organizations where id=v_request.organization_id;

  v_key:='training-signature:'||v_request.id::text||':'||
    case when p_is_reminder then 'reminder-'||(v_request.reminder_count+1)::text else 'request' end;
  insert into public.email_outbox(
    organization_id,appointment_id,template_key,recipient_email,recipient_name,
    payload,dedupe_key,status,scheduled_for,attempts
  ) values (
    v_request.organization_id,null,'training_signature_request',
    lower(v_account.email),coalesce(v_account.display_name,v_account.email),
    jsonb_build_object(
      'organization_name',coalesce(v_organization.public_name,v_organization.name),
      'organization_primary_color',v_organization.primary_color,
      'organization_logo_url',v_organization.logo_url,
      'document_title',v_request.title,
      'request_type',v_request.request_type,
      'due_date',v_request.due_date,
      'is_reminder',coalesce(p_is_reminder,false),
      'contact_email',coalesce(v_organization.training_reply_to_email,v_organization.company_email),
      'contact_phone',v_organization.company_phone
    ),
    v_key,'pending',now(),0
  ) on conflict(dedupe_key) do nothing;
end;
$$;

create or replace function public.create_training_signature_request(
  p_organization_id uuid,
  p_account_id uuid,
  p_portal_document_id uuid,
  p_title text,
  p_request_type text,
  p_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.training_portal_accounts%rowtype;
  v_document public.training_portal_documents%rowtype;
  v_id uuid;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Acces refuse.';
  end if;
  if not public.training_portals_feature_enabled(p_organization_id) then
    raise exception 'Le module Portails et signatures n est pas actif.';
  end if;
  if p_request_type not in ('quote','agreement','contract','rules','attendance','authorization','other') then
    raise exception 'Type de signature invalide.';
  end if;
  select * into v_account
  from public.training_portal_accounts
  where organization_id=p_organization_id and id=p_account_id and status='active';
  if v_account.id is null then raise exception 'Compte portail introuvable ou inactif.'; end if;
  select * into v_document
  from public.training_portal_documents
  where organization_id=p_organization_id and id=p_portal_document_id and status='active';
  if v_document.id is null
     or v_document.subject_kind<>v_account.subject_kind
     or coalesce(v_document.trainee_id,v_document.trainer_id,v_document.customer_id)<>
        coalesce(v_account.trainee_id,v_account.trainer_id,v_account.customer_id) then
    raise exception 'Le document ne correspond pas au destinataire.';
  end if;
  if exists (
    select 1 from public.training_signature_requests
    where account_id=p_account_id and portal_document_id=p_portal_document_id and status='pending'
  ) then raise exception 'Une signature est deja en attente pour ce document.'; end if;

  insert into public.training_signature_requests(
    organization_id,account_id,session_id,portal_document_id,
    training_document_id,commercial_document_id,title,request_type,
    source_bucket,source_path,due_date,created_by
  ) values (
    p_organization_id,p_account_id,v_document.session_id,v_document.id,
    v_document.training_document_id,v_document.commercial_document_id,
    trim(p_title),p_request_type,v_document.storage_bucket,v_document.storage_path,
    p_due_date,auth.uid()
  ) returning id into v_id;

  insert into public.training_signature_events(
    organization_id,signature_request_id,event_type,actor_user_id,actor_label,metadata
  ) values (
    p_organization_id,v_id,'requested',auth.uid(),'Organisme de formation',
    jsonb_build_object('due_date',p_due_date,'document_id',p_portal_document_id)
  );
  perform public.enqueue_training_signature_email(v_id,false);

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),'training.signature_requested',
    'training_signature_request',v_id::text,
    jsonb_build_object('account_id',p_account_id,'portal_document_id',p_portal_document_id)
  );
  return v_id;
end;
$$;

create or replace function public.remind_training_signature_request(
  p_organization_id uuid,
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.training_signature_requests%rowtype;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Acces refuse.';
  end if;
  select * into v_request
  from public.training_signature_requests
  where organization_id=p_organization_id and id=p_request_id and status='pending'
  for update;
  if v_request.id is null then raise exception 'Signature en attente introuvable.'; end if;
  if v_request.last_reminded_at is not null
     and v_request.last_reminded_at>now()-interval '12 hours' then
    raise exception 'Une relance a deja ete envoyee recemment.';
  end if;
  perform public.enqueue_training_signature_email(v_request.id,true);
  update public.training_signature_requests
  set reminder_count=reminder_count+1,last_reminded_at=now(),updated_at=now()
  where id=v_request.id;
  insert into public.training_signature_events(
    organization_id,signature_request_id,event_type,actor_user_id,actor_label,metadata
  ) values (
    p_organization_id,v_request.id,'reminded',auth.uid(),'Organisme de formation',
    jsonb_build_object('reminder_number',v_request.reminder_count+1)
  );
end;
$$;

create or replace function public.cancel_training_signature_request(
  p_organization_id uuid,
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Acces refuse.';
  end if;
  update public.training_signature_requests
  set status='canceled',canceled_at=now(),updated_at=now()
  where organization_id=p_organization_id and id=p_request_id and status='pending';
  if not found then raise exception 'Signature en attente introuvable.'; end if;
  insert into public.training_signature_events(
    organization_id,signature_request_id,event_type,actor_user_id,actor_label
  ) values (
    p_organization_id,p_request_id,'canceled',auth.uid(),'Organisme de formation'
  );
end;
$$;

create or replace function public.mark_training_signature_viewed(
  p_account_id uuid,
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.training_signature_requests%rowtype;
begin
  if not public.is_training_portal_account(p_account_id) then
    raise exception 'Acces portail refuse.';
  end if;
  select * into v_request
  from public.training_signature_requests
  where id=p_request_id and account_id=p_account_id and status='pending';
  if v_request.id is null then raise exception 'Demande de signature introuvable.'; end if;
  update public.training_signature_requests
  set opened_at=coalesce(opened_at,now()),updated_at=now()
  where id=v_request.id;
  if not exists (
    select 1 from public.training_signature_events
    where signature_request_id=v_request.id and event_type='viewed'
  ) then
    insert into public.training_signature_events(
      organization_id,signature_request_id,event_type,actor_user_id,actor_label
    ) values (
      v_request.organization_id,v_request.id,'viewed',auth.uid(),'Destinataire'
    );
  end if;
end;
$$;

create or replace function public.complete_training_signature(
  p_account_id uuid,
  p_request_id uuid,
  p_signer_name text,
  p_signature_image_path text,
  p_document_sha256 text,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.training_portal_accounts%rowtype;
  v_request public.training_signature_requests%rowtype;
  v_subject_id uuid;
  v_signed_at timestamptz:=clock_timestamp();
  v_reference text;
  v_payload_hash text;
  v_control_id uuid;
begin
  if not public.is_training_portal_account(p_account_id) then
    raise exception 'Acces portail refuse.';
  end if;
  select * into v_account from public.training_portal_accounts where id=p_account_id;
  select * into v_request
  from public.training_signature_requests
  where id=p_request_id and account_id=p_account_id
  for update;
  if v_request.id is null or v_request.status<>'pending' then
    raise exception 'Cette demande de signature n est plus disponible.';
  end if;
  if char_length(trim(coalesce(p_signer_name,'')))<2 then
    raise exception 'Le nom du signataire est obligatoire.';
  end if;
  if lower(trim(coalesce(p_document_sha256,''))) !~ '^[0-9a-f]{64}$' then
    raise exception 'Empreinte du document invalide.';
  end if;
  v_subject_id:=coalesce(v_account.trainee_id,v_account.trainer_id,v_account.customer_id);
  if coalesce(p_signature_image_path,'') not like (
    v_account.organization_id::text||'/'||v_account.subject_kind||'/'||
    v_subject_id::text||'/signatures/'||v_request.id::text||'/%'
  ) then raise exception 'Chemin de signature invalide.'; end if;

  v_reference:='NCR-SIG-'||to_char(v_signed_at,'YYYYMMDD')||'-'||
    upper(substr(replace(v_request.id::text,'-',''),1,10));
  v_payload_hash:=encode(extensions.digest(
    concat_ws('|',v_request.id::text,v_account.user_id::text,trim(p_signer_name),
      lower(trim(p_document_sha256)),p_signature_image_path,v_signed_at::text,v_request.consent_text),
    'sha256'
  ),'hex');

  update public.training_signature_requests
  set status='signed',opened_at=coalesce(opened_at,v_signed_at),signed_at=v_signed_at,
      signer_name=trim(p_signer_name),signer_user_id=auth.uid(),
      signature_image_path=p_signature_image_path,
      document_sha256=lower(trim(p_document_sha256)),
      signature_payload_sha256=v_payload_hash,proof_reference=v_reference,
      user_agent=left(nullif(trim(coalesce(p_user_agent,'')),''),1000),updated_at=now()
  where id=v_request.id;

  insert into public.training_signature_events(
    organization_id,signature_request_id,event_type,actor_user_id,actor_label,metadata,occurred_at
  ) values (
    v_request.organization_id,v_request.id,'signed',auth.uid(),trim(p_signer_name),
    jsonb_build_object(
      'proof_reference',v_reference,'document_sha256',lower(trim(p_document_sha256)),
      'signature_payload_sha256',v_payload_hash,'consent_text',v_request.consent_text
    ),v_signed_at
  );

  if v_request.commercial_document_id is not null then
    update public.training_commercial_documents
    set status='signed',signed_at=v_signed_at,
        signed_document_path=v_request.source_path,
        signed_document_received_at=v_signed_at,
        signed_document_received_by=auth.uid(),updated_at=now()
    where organization_id=v_request.organization_id and id=v_request.commercial_document_id;
  end if;

  insert into public.training_quality_controls(
    organization_id,criterion_number,indicator_number,title,objective,
    applicable,status,owner_name,reviewed_at,reviewed_by
  ) values (
    v_request.organization_id,4,18,'Coordination des intervenants et tracabilite',
    'Conserver les engagements, conventions et preuves de validation des parties.',
    true,'in_progress','Responsable Formation',now(),auth.uid()
  ) on conflict(organization_id,indicator_number) do nothing;

  select id into v_control_id
  from public.training_quality_controls
  where organization_id=v_request.organization_id and indicator_number=18;

  if v_control_id is not null then
    insert into public.training_quality_evidence(
      organization_id,control_id,session_id,label,description,source_kind,
      source_reference,action_path,evidence_date,status,dedup_key,created_by
    ) values (
      v_request.organization_id,v_control_id,v_request.session_id,
      'Preuve de signature - '||v_request.title,
      'Reference '||v_reference||'. Empreinte document SHA-256 : '||
        lower(trim(p_document_sha256))||'. Empreinte preuve : '||v_payload_hash||'.',
      'system',v_reference,'/portails-formation?signature='||v_request.id::text,
      v_signed_at::date,'current','signature:'||v_request.id::text,auth.uid()
    ) on conflict(organization_id,dedup_key) do update set
      label=excluded.label,description=excluded.description,
      source_reference=excluded.source_reference,evidence_date=excluded.evidence_date,
      status='current',updated_at=now();
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    v_request.organization_id,auth.uid(),'training.signature_completed',
    'training_signature_request',v_request.id::text,
    jsonb_build_object(
      'proof_reference',v_reference,'document_sha256',lower(trim(p_document_sha256)),
      'signature_payload_sha256',v_payload_hash
    )
  );

  return jsonb_build_object(
    'status','signed','signed_at',v_signed_at,'proof_reference',v_reference,
    'document_sha256',lower(trim(p_document_sha256)),
    'signature_payload_sha256',v_payload_hash
  );
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'training-portal-documents','training-portal-documents',false,20971520,
  array[
    'application/pdf','image/jpeg','image/png','image/webp','text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.can_manage_training_portal_document_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where p_object_name like o.id::text||'/%'
      and public.has_org_role(o.id,array['owner','admin','manager'])
      and public.training_portals_feature_enabled(o.id)
  );
$$;

create or replace function public.can_upload_training_portal_document_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_training_portal_document_asset(p_object_name)
  or exists (
    select 1
    from public.training_portal_accounts a
    where a.user_id=auth.uid() and a.status='active'
      and public.training_portals_feature_enabled(a.organization_id)
      and p_object_name like (
        a.organization_id::text||'/'||a.subject_kind||'/'||
        coalesce(a.trainee_id,a.trainer_id,a.customer_id)::text||'/%'
      )
  );
$$;

create or replace function public.can_read_training_portal_document_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_upload_training_portal_document_asset(p_object_name);
$$;

-- Etend la lecture du bucket historique aux comptes portail autorises.
create or replace function public.can_read_training_document_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id=public.training_document_organization_id(p_object_name)
      and o.business_type='formation'
      and public.is_org_member(o.id)
  )
  or exists (
    select 1
    from public.training_portal_accounts a
    where a.user_id=auth.uid() and a.status='active'
      and public.training_portals_feature_enabled(a.organization_id)
      and (
        exists (
          select 1 from public.training_portal_documents pd
          where pd.organization_id=a.organization_id
            and pd.storage_bucket='training-documents'
            and pd.storage_path=p_object_name and pd.status='active'
            and pd.subject_kind=a.subject_kind
            and coalesce(pd.trainee_id,pd.trainer_id,pd.customer_id)=
                coalesce(a.trainee_id,a.trainer_id,a.customer_id)
        )
        or exists (
          select 1 from public.training_documents d
          where d.organization_id=a.organization_id
            and d.storage_path=p_object_name
            and d.status='published' and d.visibility<>'internal'
            and (
              (a.subject_kind='trainee' and (
                d.trainee_id=a.trainee_id
                or (d.session_id is not null and public.training_portal_subject_session_allowed(a.id,d.session_id))
              ))
              or (a.subject_kind='trainer' and d.session_id is not null
                  and public.training_portal_subject_session_allowed(a.id,d.session_id))
            )
        )
        or exists (
          select 1 from public.training_commercial_documents d
          where d.organization_id=a.organization_id
            and d.generated_document_path=p_object_name
            and d.status not in ('draft','canceled')
            and (
              (a.subject_kind='trainee' and d.trainee_id=a.trainee_id)
              or (a.subject_kind='client' and d.customer_id=a.customer_id)
            )
        )
        or exists (
          select 1 from public.training_invoices i
          where i.organization_id=a.organization_id
            and i.generated_document_path=p_object_name
            and i.status not in ('draft','canceled')
            and a.subject_kind='client' and i.customer_id=a.customer_id
        )
      )
  );
$$;

alter table public.training_portal_accounts enable row level security;
alter table public.training_portal_invitations enable row level security;
alter table public.training_portal_documents enable row level security;
alter table public.training_signature_requests enable row level security;
alter table public.training_signature_events enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'training_portal_accounts','training_portal_invitations',
    'training_portal_documents','training_signature_requests','training_signature_events'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
  end loop;
end $$;

drop policy if exists training_portal_documents_storage_select on storage.objects;
create policy training_portal_documents_storage_select on storage.objects
for select to authenticated
using (
  bucket_id='training-portal-documents'
  and public.can_read_training_portal_document_asset(name)
);

drop policy if exists training_portal_documents_storage_insert on storage.objects;
create policy training_portal_documents_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id='training-portal-documents'
  and public.can_upload_training_portal_document_asset(name)
);

drop policy if exists training_portal_documents_storage_update on storage.objects;
create policy training_portal_documents_storage_update on storage.objects
for update to authenticated
using (
  bucket_id='training-portal-documents'
  and public.can_manage_training_portal_document_asset(name)
)
with check (
  bucket_id='training-portal-documents'
  and public.can_manage_training_portal_document_asset(name)
);

drop policy if exists training_portal_documents_storage_delete on storage.objects;
create policy training_portal_documents_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id='training-portal-documents'
  and public.can_manage_training_portal_document_asset(name)
);

revoke all on function public.training_portals_feature_enabled(uuid) from public;
revoke all on function public.is_training_portal_account(uuid) from public;
revoke all on function public.training_portal_subject_session_allowed(uuid,uuid) from public;
revoke all on function public.current_training_portal_accounts() from public;
revoke all on function public.touch_training_portal_account(uuid) from public;
revoke all on function public.get_training_portal_invitation(text) from public;
revoke all on function public.enqueue_training_portal_invitation_email(uuid,text) from public;
revoke all on function public.create_training_portal_invitation(uuid,text,uuid,text,text) from public;
revoke all on function public.resend_training_portal_invitation(uuid,uuid) from public;
revoke all on function public.revoke_training_portal_invitation(uuid,uuid) from public;
revoke all on function public.accept_training_portal_invitation(text) from public;
revoke all on function public.set_training_portal_account_status(uuid,uuid,text) from public;
revoke all on function public.training_portal_admin_overview(uuid) from public;
revoke all on function public.training_portal_dashboard(uuid) from public;
revoke all on function public.publish_training_portal_document(uuid,uuid,uuid,text,text,text,text,text,bigint,uuid,uuid,uuid) from public;
revoke all on function public.register_training_portal_document(uuid,uuid,text,text,text,text,bigint) from public;
revoke all on function public.archive_training_portal_document(uuid,uuid) from public;
revoke all on function public.enqueue_training_signature_email(uuid,boolean) from public;
revoke all on function public.create_training_signature_request(uuid,uuid,uuid,text,text,date) from public;
revoke all on function public.remind_training_signature_request(uuid,uuid) from public;
revoke all on function public.cancel_training_signature_request(uuid,uuid) from public;
revoke all on function public.mark_training_signature_viewed(uuid,uuid) from public;
revoke all on function public.complete_training_signature(uuid,uuid,text,text,text,text) from public;
revoke all on function public.can_manage_training_portal_document_asset(text) from public;
revoke all on function public.can_upload_training_portal_document_asset(text) from public;
revoke all on function public.can_read_training_portal_document_asset(text) from public;
revoke all on function public.can_read_training_document_asset(text) from public;

grant execute on function public.get_training_portal_invitation(text) to anon,authenticated;
grant execute on function public.current_training_portal_accounts() to authenticated;
grant execute on function public.touch_training_portal_account(uuid) to authenticated;
grant execute on function public.accept_training_portal_invitation(text) to authenticated;
grant execute on function public.create_training_portal_invitation(uuid,text,uuid,text,text) to authenticated;
grant execute on function public.resend_training_portal_invitation(uuid,uuid) to authenticated;
grant execute on function public.revoke_training_portal_invitation(uuid,uuid) to authenticated;
grant execute on function public.set_training_portal_account_status(uuid,uuid,text) to authenticated;
grant execute on function public.training_portal_admin_overview(uuid) to authenticated;
grant execute on function public.training_portal_dashboard(uuid) to authenticated;
grant execute on function public.publish_training_portal_document(uuid,uuid,uuid,text,text,text,text,text,bigint,uuid,uuid,uuid) to authenticated;
grant execute on function public.register_training_portal_document(uuid,uuid,text,text,text,text,bigint) to authenticated;
grant execute on function public.archive_training_portal_document(uuid,uuid) to authenticated;
grant execute on function public.create_training_signature_request(uuid,uuid,uuid,text,text,date) to authenticated;
grant execute on function public.remind_training_signature_request(uuid,uuid) to authenticated;
grant execute on function public.cancel_training_signature_request(uuid,uuid) to authenticated;
grant execute on function public.mark_training_signature_viewed(uuid,uuid) to authenticated;
grant execute on function public.complete_training_signature(uuid,uuid,text,text,text,text) to authenticated;
grant execute on function public.can_manage_training_portal_document_asset(text) to authenticated;
grant execute on function public.can_upload_training_portal_document_asset(text) to authenticated;
grant execute on function public.can_read_training_portal_document_asset(text) to authenticated;
grant execute on function public.can_read_training_document_asset(text) to authenticated;

select public.sync_training_module_access(id)
from public.organizations
where business_type='formation'
  and not (plan='metier' and coalesce(metier_modules_configured,false));

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.21.0','2.21.0','ncr-suite-shell-v2.21.0-training-portals-signatures',
  now(),auth.uid(),
  'V2.21.0 : espaces stagiaire, formateur et client, depots classes dans les dossiers, signatures tracees, relances et preuves Qualiopi.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
