-- NCR Suite V2.11.0 — Administration NCR, exploitation SaaS et onboarding guidé

-- 1) Profil d'entreprise et progression d'onboarding
alter table public.organizations
  add column if not exists company_contact_name text,
  add column if not exists company_email text,
  add column if not exists company_phone text,
  add column if not exists company_address text,
  add column if not exists company_postal_code text,
  add column if not exists company_city text,
  add column if not exists company_siret text,
  add column if not exists onboarding_status text not null default 'not_started',
  add column if not exists onboarding_requested_plan text,
  add column if not exists onboarding_objective text,
  add column if not exists onboarding_checklist jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_completed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'organizations_onboarding_status_check'
  ) then
    alter table public.organizations
      add constraint organizations_onboarding_status_check
      check (onboarding_status in ('not_started','in_progress','completed'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'organizations_onboarding_requested_plan_check'
  ) then
    alter table public.organizations
      add constraint organizations_onboarding_requested_plan_check
      check (onboarding_requested_plan is null or onboarding_requested_plan in ('decouverte','essentielle','professionnelle','metier'));
  end if;
end $$;

-- Les entreprises déjà présentes sont considérées comme opérationnelles afin de ne pas fausser le cockpit.
update public.organizations
set onboarding_status = 'completed',
    onboarding_checklist = jsonb_build_object(
      'identity', true,
      'business', true,
      'offer', true,
      'branding', true
    ),
    onboarding_completed_at = coalesce(onboarding_completed_at, created_at)
where onboarding_status = 'not_started'
  and onboarding_completed_at is null;

-- Les nouvelles entreprises créées après cette migration démarrent réellement l'onboarding.
create or replace function public.mark_new_organization_onboarding()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.onboarding_status := 'not_started';
  new.onboarding_checklist := '{}'::jsonb;
  new.onboarding_completed_at := null;
  return new;
end;
$$;

drop trigger if exists before_new_organization_onboarding on public.organizations;
create trigger before_new_organization_onboarding
before insert on public.organizations
for each row execute procedure public.mark_new_organization_onboarding();

-- 2) Tickets de support SaaS
create table if not exists public.platform_support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  category text not null default 'general' check (category in ('general','billing','access','technical','data','feature')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','waiting_customer','resolved','closed')),
  subject text not null check (char_length(trim(subject)) between 3 and 160),
  description text not null check (char_length(trim(description)) between 5 and 5000),
  admin_note text,
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_support_tickets_status_priority
  on public.platform_support_tickets(status, priority, created_at desc);
create index if not exists idx_platform_support_tickets_organization
  on public.platform_support_tickets(organization_id, created_at desc);

drop trigger if exists set_platform_support_tickets_updated_at on public.platform_support_tickets;
create trigger set_platform_support_tickets_updated_at
before update on public.platform_support_tickets
for each row execute procedure public.set_updated_at();

alter table public.platform_support_tickets enable row level security;
revoke all on public.platform_support_tickets from anon, authenticated;

-- 3) Finalisation sécurisée de l'onboarding par le propriétaire / administrateur de l'entreprise
create or replace function public.complete_organization_onboarding(
  p_organization_id uuid,
  p_contact_name text,
  p_company_email text,
  p_company_phone text,
  p_company_address text,
  p_company_postal_code text,
  p_company_city text,
  p_company_siret text,
  p_requested_plan text,
  p_objective text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seul le propriétaire ou un administrateur peut terminer la configuration.';
  end if;

  if p_requested_plan not in ('decouverte','essentielle','professionnelle','metier') then
    raise exception 'Formule souhaitée invalide.';
  end if;

  if char_length(trim(coalesce(p_contact_name,''))) < 2 then
    raise exception 'Le nom du contact principal est requis.';
  end if;

  if char_length(trim(coalesce(p_company_email,''))) < 5 or position('@' in p_company_email) = 0 then
    raise exception 'L’adresse e-mail de l’entreprise est invalide.';
  end if;

  update public.organizations
  set company_contact_name = nullif(trim(p_contact_name), ''),
      company_email = lower(nullif(trim(p_company_email), '')),
      company_phone = nullif(trim(p_company_phone), ''),
      company_address = nullif(trim(p_company_address), ''),
      company_postal_code = nullif(trim(p_company_postal_code), ''),
      company_city = nullif(trim(p_company_city), ''),
      company_siret = nullif(regexp_replace(coalesce(p_company_siret,''), '[^0-9]', '', 'g'), ''),
      onboarding_requested_plan = p_requested_plan,
      onboarding_objective = nullif(trim(coalesce(p_objective,'')), ''),
      onboarding_status = 'completed',
      onboarding_checklist = jsonb_build_object(
        'identity', true,
        'business', true,
        'offer', true,
        'branding', true
      ),
      onboarding_completed_at = now(),
      updated_at = now()
  where id = p_organization_id;

  if not found then raise exception 'Entreprise introuvable.'; end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'organization.onboarding_completed',
    'organization',
    p_organization_id::text,
    jsonb_build_object('requested_plan', p_requested_plan)
  );

  select jsonb_build_object(
    'organization_id', id,
    'status', onboarding_status,
    'requested_plan', onboarding_requested_plan,
    'completed_at', onboarding_completed_at
  ) into v_result
  from public.organizations where id = p_organization_id;

  return v_result;
end;
$$;

-- 4) Support côté entreprise
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
  if not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès refusé.';
  end if;
  if p_category not in ('general','billing','access','technical','data','feature') then raise exception 'Catégorie invalide.'; end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'Priorité invalide.'; end if;

  insert into public.platform_support_tickets (
    organization_id, created_by, category, priority, subject, description
  ) values (
    p_organization_id, auth.uid(), p_category, p_priority, trim(p_subject), trim(p_description)
  ) returning id into v_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'support.ticket_created', 'platform_support_ticket', v_id::text,
    jsonb_build_object('priority', p_priority, 'category', p_category));

  return v_id;
end;
$$;

create or replace function public.list_my_platform_support_tickets(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if not public.is_org_member_any_status(p_organization_id) then raise exception 'Accès refusé.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'category', t.category,
    'priority', t.priority,
    'status', t.status,
    'subject', t.subject,
    'description', t.description,
    'admin_note', t.admin_note,
    'created_at', t.created_at,
    'updated_at', t.updated_at,
    'resolved_at', t.resolved_at
  ) order by t.created_at desc), '[]'::jsonb)
  into v_result
  from public.platform_support_tickets t
  where t.organization_id = p_organization_id;

  return v_result;
end;
$$;

-- 5) Cockpit SaaS central
create or replace function public.admin_saas_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;

  select jsonb_build_object(
    'organizations_total', (select count(*) from public.organizations),
    'organizations_active', (select count(*) from public.organizations where status = 'active'),
    'organizations_trial', (select count(*) from public.organizations where status = 'trial'),
    'organizations_suspended', (select count(*) from public.organizations where status = 'suspended'),
    'active_users', (select count(*) from public.organization_members where status = 'active'),
    'estimated_mrr_cents', (select coalesce(sum(monthly_price_cents),0) from public.organization_subscriptions where status = 'active'),
    'trials_ending_soon', (select count(*) from public.organization_subscriptions where status = 'trialing' and trial_ends_at between now() and now() + interval '7 days'),
    'payments_past_due', (select count(*) from public.organization_subscriptions where status = 'past_due'),
    'open_support_tickets', (select count(*) from public.platform_support_tickets where status in ('open','in_progress','waiting_customer')),
    'urgent_support_tickets', (select count(*) from public.platform_support_tickets where status in ('open','in_progress') and priority = 'urgent'),
    'onboarding_incomplete', (select count(*) from public.organizations where onboarding_status <> 'completed'),
    'inactive_14_days', (
      select count(*)
      from public.organizations o
      where o.status in ('trial','active')
        and coalesce((select max(a.created_at) from public.audit_logs a where a.organization_id = o.id), o.created_at) < now() - interval '14 days'
    ),
    'domains', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'business_type', business_type,
        'organizations', organizations,
        'active', active,
        'mrr_cents', mrr_cents
      ) order by organizations desc), '[]'::jsonb)
      from (
        select o.business_type,
               count(*)::integer organizations,
               count(*) filter (where o.status = 'active')::integer active,
               coalesce(sum(case when s.status = 'active' then s.monthly_price_cents else 0 end),0)::integer mrr_cents
        from public.organizations o
        left join public.organization_subscriptions s on s.organization_id = o.id
        group by o.business_type
      ) d
    )
  ) into v_result;

  return v_result;
end;
$$;

-- 6) Liste enrichie des entreprises pour le cockpit
create or replace function public.admin_list_organizations(
  p_search text default null,
  p_plan text default null,
  p_status text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_search text := lower(trim(coalesce(p_search, ''));
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;

  select coalesce(jsonb_agg(item order by (item->>'created_at') desc), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug,
      'business_type', o.business_type,
      'plan', o.plan,
      'organization_status', o.status,
      'subscription_status', coalesce(s.status, 'active'),
      'monthly_price_cents', coalesce(s.monthly_price_cents, p.monthly_price_cents, 0),
      'trial_ends_at', s.trial_ends_at,
      'current_period_end', s.current_period_end,
      'cancel_at_period_end', coalesce(s.cancel_at_period_end, false),
      'provider', coalesce(s.provider, 'manual'),
      'internal_notes', s.internal_notes,
      'owner_email', owner_data.email,
      'active_members', coalesce(member_data.active_members, 0),
      'clients_count', coalesce(client_data.clients_count, 0),
      'appointments_count', coalesce(appointment_data.appointments_count, 0),
      'documents_bytes', coalesce(document_data.documents_bytes, 0),
      'open_tickets', coalesce(ticket_data.open_tickets, 0),
      'onboarding_status', o.onboarding_status,
      'onboarding_requested_plan', o.onboarding_requested_plan,
      'company_phone', o.company_phone,
      'company_city', o.company_city,
      'last_activity_at', activity_data.last_activity_at,
      'created_at', o.created_at,
      'health', case
        when o.status = 'suspended' or coalesce(s.status,'active') in ('past_due','paused','canceled') then 'critical'
        when coalesce(ticket_data.urgent_tickets,0) > 0 then 'critical'
        when o.onboarding_status <> 'completed' or coalesce(activity_data.last_activity_at,o.created_at) < now() - interval '14 days' then 'attention'
        else 'healthy'
      end
    ) as item
    from public.organizations o
    left join public.organization_subscriptions s on s.organization_id = o.id
    left join public.plan_catalog p on p.plan_key = o.plan
    left join lateral (
      select u.email::text as email
      from public.organization_members m
      join auth.users u on u.id = m.user_id
      where m.organization_id = o.id and m.role = 'owner'
      order by m.created_at limit 1
    ) owner_data on true
    left join lateral (
      select count(*)::integer active_members
      from public.organization_members m where m.organization_id = o.id and m.status = 'active'
    ) member_data on true
    left join lateral (
      select count(*)::integer clients_count from public.clients c where c.organization_id = o.id
    ) client_data on true
    left join lateral (
      select count(*)::integer appointments_count from public.appointments a where a.organization_id = o.id
    ) appointment_data on true
    left join lateral (
      select coalesce(sum(d.size_bytes),0)::bigint documents_bytes from public.documents d where d.organization_id = o.id
    ) document_data on true
    left join lateral (
      select count(*) filter (where t.status in ('open','in_progress','waiting_customer'))::integer open_tickets,
             count(*) filter (where t.status in ('open','in_progress') and t.priority='urgent')::integer urgent_tickets
      from public.platform_support_tickets t where t.organization_id = o.id
    ) ticket_data on true
    left join lateral (
      select max(a.created_at) last_activity_at from public.audit_logs a where a.organization_id = o.id
    ) activity_data on true
    where (v_search = ''
      or lower(o.name) like '%' || v_search || '%'
      or lower(o.slug) like '%' || v_search || '%'
      or lower(coalesce(owner_data.email, '')) like '%' || v_search || '%')
      and (p_plan is null or p_plan = '' or o.plan = p_plan)
      and (p_status is null or p_status = '' or o.status = p_status)
  ) rows;

  return v_result;
end;
$$;

-- 7) File support administrateur
create or replace function public.admin_list_support_tickets(
  p_status text default null,
  p_priority text default null,
  p_search text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_search text := lower(trim(coalesce(p_search,'')));
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'organization_id', t.organization_id,
    'organization_name', o.name,
    'business_type', o.business_type,
    'plan', o.plan,
    'owner_email', owner_data.email,
    'created_by_email', creator.email,
    'assigned_to_email', assignee.email,
    'category', t.category,
    'priority', t.priority,
    'status', t.status,
    'subject', t.subject,
    'description', t.description,
    'admin_note', t.admin_note,
    'created_at', t.created_at,
    'updated_at', t.updated_at,
    'first_response_at', t.first_response_at,
    'resolved_at', t.resolved_at
  ) order by
    case t.priority when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,
    t.created_at asc), '[]'::jsonb)
  into v_result
  from public.platform_support_tickets t
  join public.organizations o on o.id = t.organization_id
  left join auth.users creator on creator.id = t.created_by
  left join auth.users assignee on assignee.id = t.assigned_to
  left join lateral (
    select u.email::text email
    from public.organization_members m join auth.users u on u.id=m.user_id
    where m.organization_id=o.id and m.role='owner' order by m.created_at limit 1
  ) owner_data on true
  where (p_status is null or p_status='' or t.status=p_status)
    and (p_priority is null or p_priority='' or t.priority=p_priority)
    and (v_search='' or lower(t.subject) like '%'||v_search||'%' or lower(o.name) like '%'||v_search||'%' or lower(coalesce(owner_data.email,'')) like '%'||v_search||'%');

  return v_result;
end;
$$;

create or replace function public.admin_update_support_ticket(
  p_ticket_id uuid,
  p_status text,
  p_priority text,
  p_admin_note text default null,
  p_assign_to_self boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org_id uuid; v_old_status text;
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;
  if p_status not in ('open','in_progress','waiting_customer','resolved','closed') then raise exception 'Statut invalide.'; end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'Priorité invalide.'; end if;

  select organization_id,status into v_org_id,v_old_status from public.platform_support_tickets where id=p_ticket_id;
  if v_org_id is null then raise exception 'Ticket introuvable.'; end if;

  update public.platform_support_tickets
  set status=p_status,
      priority=p_priority,
      admin_note=nullif(trim(coalesce(p_admin_note,'')),''),
      assigned_to=case when p_assign_to_self then auth.uid() else assigned_to end,
      first_response_at=case when first_response_at is null and p_status <> 'open' then now() else first_response_at end,
      resolved_at=case when p_status in ('resolved','closed') then coalesce(resolved_at,now()) else null end,
      updated_at=now()
  where id=p_ticket_id;

  insert into public.audit_logs (organization_id,user_id,action,entity_type,entity_id,metadata)
  values (v_org_id,auth.uid(),'platform.support_ticket_updated','platform_support_ticket',p_ticket_id::text,
    jsonb_build_object('old_status',v_old_status,'new_status',p_status,'priority',p_priority));
end;
$$;

-- 8) Flux d'activité central
create or replace function public.admin_recent_platform_activity(p_limit integer default 60)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'organization_id', a.organization_id,
    'organization_name', o.name,
    'business_type', o.business_type,
    'user_email', u.email,
    'action', a.action,
    'entity_type', a.entity_type,
    'entity_id', a.entity_id,
    'metadata', a.metadata,
    'created_at', a.created_at
  ) order by a.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select * from public.audit_logs order by created_at desc limit greatest(1,least(coalesce(p_limit,60),200))
  ) a
  left join public.organizations o on o.id=a.organization_id
  left join auth.users u on u.id=a.user_id;

  return v_result;
end;
$$;

-- 9) Diagnostic d'une entreprise
create or replace function public.admin_organization_health(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Accès administrateur NCR requis.'; end if;

  select jsonb_build_object(
    'organization_id', o.id,
    'members', (select count(*) from public.organization_members m where m.organization_id=o.id and m.status='active'),
    'documents', (select count(*) from public.documents d where d.organization_id=o.id),
    'documents_bytes', (select coalesce(sum(d.size_bytes),0) from public.documents d where d.organization_id=o.id),
    'open_tickets', (select count(*) from public.platform_support_tickets t where t.organization_id=o.id and t.status in ('open','in_progress','waiting_customer')),
    'last_activity_at', (select max(a.created_at) from public.audit_logs a where a.organization_id=o.id),
    'onboarding_status', o.onboarding_status,
    'onboarding_requested_plan', o.onboarding_requested_plan,
    'company_contact_name', o.company_contact_name,
    'company_email', o.company_email,
    'company_phone', o.company_phone,
    'company_city', o.company_city,
    'recent_events', (
      select coalesce(jsonb_agg(jsonb_build_object('action',x.action,'created_at',x.created_at,'metadata',x.metadata) order by x.created_at desc),'[]'::jsonb)
      from (select action,created_at,metadata from public.audit_logs where organization_id=o.id order by created_at desc limit 8) x
    )
  ) into v_result
  from public.organizations o where o.id=p_organization_id;

  if v_result is null then raise exception 'Entreprise introuvable.'; end if;
  return v_result;
end;
$$;

-- Permissions
revoke all on function public.complete_organization_onboarding(uuid,text,text,text,text,text,text,text,text,text) from public;
revoke all on function public.create_platform_support_ticket(uuid,text,text,text,text) from public;
revoke all on function public.list_my_platform_support_tickets(uuid) from public;
revoke all on function public.admin_saas_overview() from public;
revoke all on function public.admin_list_support_tickets(text,text,text) from public;
revoke all on function public.admin_update_support_ticket(uuid,text,text,text,boolean) from public;
revoke all on function public.admin_recent_platform_activity(integer) from public;
revoke all on function public.admin_organization_health(uuid) from public;

grant execute on function public.complete_organization_onboarding(uuid,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.create_platform_support_ticket(uuid,text,text,text,text) to authenticated;
grant execute on function public.list_my_platform_support_tickets(uuid) to authenticated;
grant execute on function public.admin_saas_overview() to authenticated;
grant execute on function public.admin_list_support_tickets(text,text,text) to authenticated;
grant execute on function public.admin_update_support_ticket(uuid,text,text,text,boolean) to authenticated;
grant execute on function public.admin_recent_platform_activity(integer) to authenticated;
grant execute on function public.admin_organization_health(uuid) to authenticated;
