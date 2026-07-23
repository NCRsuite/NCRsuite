-- NCR Suite V2.16.0 - Formation : CRM, pipeline commercial et relances
-- A executer apres 075_admin_training_sav_supervision.sql.

begin;

create table if not exists public.training_crm_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid,
  customer_id uuid,
  program_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 200),
  company_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  source text not null default 'other'
    check (source in ('website','referral','outbound','event','partner','existing_customer','other')),
  stage text not null default 'new'
    check (stage in ('new','qualified','proposal','negotiation','won','lost')),
  estimated_value_cents integer not null default 0 check (estimated_value_cents >= 0),
  probability integer not null default 20 check (probability between 0 and 100),
  expected_close_date date,
  next_action_label text,
  next_action_at timestamptz,
  notes text,
  lost_reason text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint training_crm_opportunities_site_fk foreign key (organization_id, site_id)
    references public.organization_sites(organization_id, id) on delete restrict,
  constraint training_crm_opportunities_customer_fk foreign key (organization_id, customer_id)
    references public.training_customers(organization_id, id) on delete restrict,
  constraint training_crm_opportunities_program_fk foreign key (organization_id, program_id)
    references public.training_programs(organization_id, id) on delete restrict,
  constraint training_crm_opportunities_contact_check check (
    customer_id is not null
    or nullif(trim(coalesce(company_name, '')), '') is not null
    or nullif(trim(coalesce(contact_name, '')), '') is not null
  ),
  constraint training_crm_opportunities_action_check check (
    next_action_at is null
    or nullif(trim(coalesce(next_action_label, '')), '') is not null
  )
);

create index if not exists idx_training_crm_opportunities_pipeline
  on public.training_crm_opportunities(organization_id, stage, updated_at desc);
create index if not exists idx_training_crm_opportunities_next_action
  on public.training_crm_opportunities(organization_id, next_action_at)
  where next_action_at is not null and stage not in ('won','lost');
create index if not exists idx_training_crm_opportunities_customer
  on public.training_crm_opportunities(organization_id, customer_id);

create table if not exists public.training_crm_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null,
  activity_type text not null default 'task'
    check (activity_type in ('note','call','email','meeting','task')),
  subject text not null check (char_length(trim(subject)) between 2 and 200),
  details text,
  due_at timestamptz,
  status text not null default 'planned'
    check (status in ('planned','completed','canceled')),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint training_crm_activities_opportunity_fk foreign key (organization_id, opportunity_id)
    references public.training_crm_opportunities(organization_id, id) on delete cascade,
  constraint training_crm_activities_due_check check (
    activity_type = 'note' or due_at is not null or status <> 'planned'
  )
);

create index if not exists idx_training_crm_activities_opportunity
  on public.training_crm_activities(organization_id, opportunity_id, created_at desc);
create index if not exists idx_training_crm_activities_due
  on public.training_crm_activities(organization_id, due_at)
  where status = 'planned';

alter table public.training_commercial_documents
  add column if not exists opportunity_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'training_commercial_documents_opportunity_fk'
      and conrelid = 'public.training_commercial_documents'::regclass
  ) then
    alter table public.training_commercial_documents
      add constraint training_commercial_documents_opportunity_fk
      foreign key (organization_id, opportunity_id)
      references public.training_crm_opportunities(organization_id, id)
      on delete restrict;
  end if;
end
$$;

create index if not exists idx_training_commercial_opportunity
  on public.training_commercial_documents(organization_id, opportunity_id)
  where opportunity_id is not null;

create or replace function public.prepare_training_crm_opportunity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.organizations o
    where o.id = new.organization_id and o.business_type = 'formation'
  ) then
    raise exception 'Ce CRM est reserve aux espaces Formation.';
  end if;

  if not public.organization_has_plan_feature(new.organization_id, 'training_commercial') then
    raise exception 'Le CRM Formation necessite le module Commercial.';
  end if;

  new.company_name := nullif(trim(coalesce(new.company_name, '')), '');
  new.contact_name := nullif(trim(coalesce(new.contact_name, '')), '');
  new.contact_email := nullif(trim(coalesce(new.contact_email, '')), '');
  new.contact_phone := nullif(trim(coalesce(new.contact_phone, '')), '');
  new.next_action_label := nullif(trim(coalesce(new.next_action_label, '')), '');
  new.lost_reason := nullif(trim(coalesce(new.lost_reason, '')), '');

  if new.stage = 'won' then
    new.probability := 100;
    new.won_at := coalesce(new.won_at, now());
    new.lost_at := null;
    new.lost_reason := null;
    new.next_action_label := null;
    new.next_action_at := null;
  elsif new.stage = 'lost' then
    new.probability := 0;
    new.lost_at := coalesce(new.lost_at, now());
    new.won_at := null;
    new.next_action_label := null;
    new.next_action_at := null;
  else
    new.won_at := null;
    new.lost_at := null;
    new.lost_reason := null;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_training_crm_opportunity on public.training_crm_opportunities;
create trigger prepare_training_crm_opportunity
before insert or update on public.training_crm_opportunities
for each row execute procedure public.prepare_training_crm_opportunity();

drop trigger if exists set_training_crm_opportunity_updated_at on public.training_crm_opportunities;
create trigger set_training_crm_opportunity_updated_at
before update on public.training_crm_opportunities
for each row execute procedure public.set_updated_at();

create or replace function public.prepare_training_crm_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_training_crm_activity on public.training_crm_activities;
create trigger prepare_training_crm_activity
before insert or update on public.training_crm_activities
for each row execute procedure public.prepare_training_crm_activity();

drop trigger if exists set_training_crm_activity_updated_at on public.training_crm_activities;
create trigger set_training_crm_activity_updated_at
before update on public.training_crm_activities
for each row execute procedure public.set_updated_at();

create or replace function public.seed_training_crm_initial_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.next_action_at is not null and new.next_action_label is not null then
    insert into public.training_crm_activities (
      organization_id, opportunity_id, activity_type, subject, due_at,
      status, created_by
    ) values (
      new.organization_id, new.id, 'task', new.next_action_label, new.next_action_at,
      'planned', new.created_by
    );
  end if;
  return new;
end;
$$;

drop trigger if exists seed_training_crm_initial_action on public.training_crm_opportunities;
create trigger seed_training_crm_initial_action
after insert on public.training_crm_opportunities
for each row execute procedure public.seed_training_crm_initial_action();

create or replace function public.refresh_training_crm_next_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_opportunity_id uuid;
  v_subject text;
  v_due_at timestamptz;
begin
  if tg_op = 'DELETE' then
    v_organization_id := old.organization_id;
    v_opportunity_id := old.opportunity_id;
  else
    v_organization_id := new.organization_id;
    v_opportunity_id := new.opportunity_id;
  end if;

  select a.subject, a.due_at
  into v_subject, v_due_at
  from public.training_crm_activities a
  where a.organization_id = v_organization_id
    and a.opportunity_id = v_opportunity_id
    and a.status = 'planned'
    and a.due_at is not null
  order by a.due_at, a.created_at
  limit 1;

  update public.training_crm_opportunities
  set next_action_label = v_subject,
      next_action_at = v_due_at
  where organization_id = v_organization_id
    and id = v_opportunity_id
    and stage not in ('won','lost')
    and (
      next_action_label is distinct from v_subject
      or next_action_at is distinct from v_due_at
    );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists refresh_training_crm_next_action on public.training_crm_activities;
create trigger refresh_training_crm_next_action
after insert or update or delete on public.training_crm_activities
for each row execute procedure public.refresh_training_crm_next_action();

create or replace function public.move_training_crm_opportunity(
  p_organization_id uuid,
  p_opportunity_id uuid,
  p_stage text,
  p_lost_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_stage text;
  v_stage_label text;
begin
  if not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_commercial') then
    raise exception 'Acces refuse.';
  end if;
  if p_stage not in ('new','qualified','proposal','negotiation','won','lost') then
    raise exception 'Etape CRM invalide.';
  end if;
  if p_stage = 'lost' and nullif(trim(coalesce(p_lost_reason, '')), '') is null then
    raise exception 'Indique la raison de la perte.';
  end if;

  select stage into v_previous_stage
  from public.training_crm_opportunities
  where organization_id = p_organization_id and id = p_opportunity_id
  for update;
  if v_previous_stage is null then raise exception 'Opportunite introuvable.'; end if;

  update public.training_crm_opportunities
  set stage = p_stage,
      lost_reason = case when p_stage = 'lost' then nullif(trim(p_lost_reason), '') else null end,
      probability = case p_stage
        when 'new' then least(probability, 20)
        when 'qualified' then greatest(probability, 40)
        when 'proposal' then greatest(probability, 60)
        when 'negotiation' then greatest(probability, 80)
        when 'won' then 100
        else 0
      end
  where organization_id = p_organization_id and id = p_opportunity_id;

  v_stage_label := case p_stage
    when 'new' then 'Nouveau'
    when 'qualified' then 'Qualifie'
    when 'proposal' then 'Proposition'
    when 'negotiation' then 'Negociation'
    when 'won' then 'Gagne'
    else 'Perdu'
  end;

  if v_previous_stage <> p_stage then
    insert into public.training_crm_activities (
      organization_id, opportunity_id, activity_type, subject, details,
      status, completed_at, created_by
    ) values (
      p_organization_id, p_opportunity_id, 'note',
      'Etape mise a jour : ' || v_stage_label,
      case when p_stage = 'lost' then nullif(trim(p_lost_reason), '') else null end,
      'completed', now(), auth.uid()
    );
  end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'training.crm_opportunity_moved',
    'training_crm_opportunity',
    p_opportunity_id::text,
    jsonb_build_object('previous_stage', v_previous_stage, 'stage', p_stage, 'lost_reason', p_lost_reason)
  );

  return jsonb_build_object(
    'opportunity_id', p_opportunity_id,
    'previous_stage', v_previous_stage,
    'stage', p_stage
  );
end;
$$;

create or replace function public.convert_training_crm_opportunity_to_customer(
  p_organization_id uuid,
  p_opportunity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opportunity public.training_crm_opportunities%rowtype;
  v_customer_id uuid;
  v_legal_name text;
begin
  if not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_commercial') then
    raise exception 'Acces refuse.';
  end if;

  select * into v_opportunity
  from public.training_crm_opportunities
  where organization_id = p_organization_id and id = p_opportunity_id
  for update;
  if v_opportunity.id is null then raise exception 'Opportunite introuvable.'; end if;

  if v_opportunity.customer_id is not null then
    return jsonb_build_object(
      'opportunity_id', p_opportunity_id,
      'customer_id', v_opportunity.customer_id,
      'created', false
    );
  end if;

  v_legal_name := coalesce(
    nullif(trim(v_opportunity.company_name), ''),
    nullif(trim(v_opportunity.contact_name), ''),
    v_opportunity.title
  );

  insert into public.training_customers (
    organization_id, site_id, customer_type, legal_name, contact_name,
    email, phone, notes, status, created_by
  ) values (
    p_organization_id,
    v_opportunity.site_id,
    'company',
    v_legal_name,
    v_opportunity.contact_name,
    v_opportunity.contact_email,
    v_opportunity.contact_phone,
    v_opportunity.notes,
    'active',
    auth.uid()
  )
  returning id into v_customer_id;

  update public.training_crm_opportunities
  set customer_id = v_customer_id,
      stage = case when stage = 'new' then 'qualified' else stage end,
      probability = case when stage = 'new' then greatest(probability, 40) else probability end
  where organization_id = p_organization_id and id = p_opportunity_id;

  insert into public.training_crm_activities (
    organization_id, opportunity_id, activity_type, subject,
    status, completed_at, created_by
  ) values (
    p_organization_id, p_opportunity_id, 'note', 'Fiche client creee',
    'completed', now(), auth.uid()
  );

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'training.crm_customer_created',
    'training_crm_opportunity',
    p_opportunity_id::text,
    jsonb_build_object('customer_id', v_customer_id)
  );

  return jsonb_build_object(
    'opportunity_id', p_opportunity_id,
    'customer_id', v_customer_id,
    'created', true
  );
end;
$$;

create or replace function public.set_training_crm_activity_completed(
  p_organization_id uuid,
  p_activity_id uuid,
  p_completed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity public.training_crm_activities%rowtype;
begin
  if not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_commercial') then
    raise exception 'Acces refuse.';
  end if;

  update public.training_crm_activities
  set status = case when p_completed then 'completed' else 'planned' end,
      completed_at = case when p_completed then now() else null end
  where organization_id = p_organization_id and id = p_activity_id
  returning * into v_activity;
  if v_activity.id is null then raise exception 'Action CRM introuvable.'; end if;

  return jsonb_build_object(
    'activity_id', p_activity_id,
    'status', v_activity.status,
    'completed_at', v_activity.completed_at
  );
end;
$$;

create or replace function public.sync_training_crm_from_commercial_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_stage text;
  v_changed_id uuid;
begin
  if new.opportunity_id is null then return new; end if;

  v_target_stage := case
    when new.status in ('accepted','signed','completed') then 'won'
    when new.status in ('draft','sent') then 'proposal'
    else null
  end;
  if v_target_stage is null then return new; end if;

  update public.training_crm_opportunities
  set stage = v_target_stage,
      probability = case when v_target_stage = 'won' then 100 else greatest(probability, 60) end
  where organization_id = new.organization_id
    and id = new.opportunity_id
    and stage not in ('won','lost')
    and stage <> v_target_stage
  returning id into v_changed_id;

  if v_changed_id is not null then
    insert into public.training_crm_activities (
      organization_id, opportunity_id, activity_type, subject, details,
      status, completed_at, created_by
    ) values (
      new.organization_id,
      new.opportunity_id,
      'note',
      case when v_target_stage = 'won' then 'Vente gagnee' else 'Proposition commerciale creee' end,
      new.reference || ' - ' || new.title,
      'completed',
      now(),
      auth.uid()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists sync_training_crm_from_commercial_document on public.training_commercial_documents;
create trigger sync_training_crm_from_commercial_document
after insert or update of opportunity_id, status on public.training_commercial_documents
for each row execute procedure public.sync_training_crm_from_commercial_document();

alter table public.training_crm_opportunities enable row level security;
alter table public.training_crm_activities enable row level security;

revoke all on public.training_crm_opportunities from anon;
revoke all on public.training_crm_activities from anon;
grant select, insert, update on public.training_crm_opportunities to authenticated;
grant select, insert, update, delete on public.training_crm_activities to authenticated;

drop policy if exists training_crm_opportunities_select on public.training_crm_opportunities;
create policy training_crm_opportunities_select on public.training_crm_opportunities
for select to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id, 'training_commercial')
);
drop policy if exists training_crm_opportunities_insert on public.training_crm_opportunities;
create policy training_crm_opportunities_insert on public.training_crm_opportunities
for insert to authenticated
with check (
  public.has_org_role(organization_id, array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id, 'training_commercial')
);
drop policy if exists training_crm_opportunities_update on public.training_crm_opportunities;
create policy training_crm_opportunities_update on public.training_crm_opportunities
for update to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id, 'training_commercial')
)
with check (
  public.has_org_role(organization_id, array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id, 'training_commercial')
);

drop policy if exists training_crm_activities_select on public.training_crm_activities;
create policy training_crm_activities_select on public.training_crm_activities
for select to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id, 'training_commercial')
);
drop policy if exists training_crm_activities_insert on public.training_crm_activities;
create policy training_crm_activities_insert on public.training_crm_activities
for insert to authenticated
with check (
  public.has_org_role(organization_id, array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id, 'training_commercial')
);
drop policy if exists training_crm_activities_update on public.training_crm_activities;
create policy training_crm_activities_update on public.training_crm_activities
for update to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id, 'training_commercial')
)
with check (
  public.has_org_role(organization_id, array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id, 'training_commercial')
);
drop policy if exists training_crm_activities_delete on public.training_crm_activities;
create policy training_crm_activities_delete on public.training_crm_activities
for delete to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin'])
  and public.organization_has_plan_feature(organization_id, 'training_commercial')
);

revoke all on function public.move_training_crm_opportunity(uuid,uuid,text,text) from public, anon;
revoke all on function public.convert_training_crm_opportunity_to_customer(uuid,uuid) from public, anon;
revoke all on function public.set_training_crm_activity_completed(uuid,uuid,boolean) from public, anon;
grant execute on function public.move_training_crm_opportunity(uuid,uuid,text,text) to authenticated;
grant execute on function public.convert_training_crm_opportunity_to_customer(uuid,uuid) to authenticated;
grant execute on function public.set_training_crm_activity_completed(uuid,uuid,boolean) to authenticated;

update public.module_catalog
set display_name = 'CRM & commercial Formation',
    description = 'Prospects, opportunites, relances, clients, financeurs, devis, conventions et contrats.',
    active = true
where module_key = 'training_commercial';

insert into public.platform_release_state (
  singleton,
  database_version,
  expected_frontend_version,
  expected_pwa_cache,
  installed_at,
  installed_by,
  notes
) values (
  true,
  '2.16.0',
  '2.16.0',
  'ncr-suite-shell-v2.16.0-training-crm-pipeline',
  now(),
  auth.uid(),
  'Formation V2.16.0 : CRM, pipeline commercial, relances et liaison avec les dossiers commerciaux.'
)
on conflict (singleton) do update
set database_version = excluded.database_version,
    expected_frontend_version = excluded.expected_frontend_version,
    expected_pwa_cache = excluded.expected_pwa_cache,
    installed_at = excluded.installed_at,
    installed_by = excluded.installed_by,
    notes = excluded.notes;

commit;

select pg_notify('pgrst', 'reload schema');
