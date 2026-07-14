-- NCR Suite V2.4.0 — Pack Formation, socle opérationnel
-- À exécuter après 016_single_business_domain_pricing.sql.

begin;

create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 160),
  code text,
  duration_hours numeric(7,2) not null default 7 check (duration_hours > 0 and duration_hours <= 2000),
  modality text not null default 'presentiel' check (modality in ('presentiel','distanciel','hybride')),
  objectives text,
  description text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.training_trainees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) between 1 and 100),
  last_name text not null check (char_length(trim(last_name)) between 1 and 100),
  email text,
  phone text,
  company text,
  notes text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.training_trainers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) between 1 and 100),
  last_name text not null check (char_length(trim(last_name)) between 1 and 100),
  email text,
  phone text,
  specialties text[] not null default '{}'::text[],
  notes text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid,
  program_id uuid not null,
  trainer_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 180),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 12 check (capacity between 1 and 500),
  location text,
  modality text not null default 'presentiel' check (modality in ('presentiel','distanciel','hybride')),
  status text not null default 'scheduled' check (status in ('draft','scheduled','in_progress','completed','canceled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint training_sessions_valid_dates check (ends_at > starts_at),
  constraint training_sessions_program_fk foreign key (organization_id, program_id)
    references public.training_programs(organization_id, id) on delete restrict,
  constraint training_sessions_trainer_fk foreign key (organization_id, trainer_id)
    references public.training_trainers(organization_id, id) on delete restrict,
  constraint training_sessions_site_fk foreign key (organization_id, site_id)
    references public.organization_sites(organization_id, id) on delete restrict
);

create table if not exists public.training_session_enrollments (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid not null,
  trainee_id uuid not null,
  status text not null default 'registered' check (status in ('registered','confirmed','completed','absent','canceled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, trainee_id),
  constraint training_enrollments_session_fk foreign key (organization_id, session_id)
    references public.training_sessions(organization_id, id) on delete cascade,
  constraint training_enrollments_trainee_fk foreign key (organization_id, trainee_id)
    references public.training_trainees(organization_id, id) on delete restrict
);

insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, sort_order
)
values
  ('training_programs', 'Formations', 'Catalogue des formations, durées et objectifs.', 'formation', 'graduation', '{formation}', false, true, 495),
  ('trainees', 'Stagiaires', 'Fiches stagiaires et coordonnées.', 'formation', 'users', '{formation}', false, true, 500),
  ('trainers', 'Formateurs', 'Profils formateurs et spécialités.', 'formation', 'briefcase', '{formation}', false, true, 510),
  ('sessions', 'Sessions', 'Planification et inscriptions aux sessions.', 'formation', 'calendar', '{formation}', false, true, 520)
on conflict (module_key) do update
set display_name = excluded.display_name,
    description = excluded.description,
    category = excluded.category,
    icon_key = excluded.icon_key,
    compatible_business_types = excluded.compatible_business_types,
    default_enabled = excluded.default_enabled,
    active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

insert into public.organization_modules (organization_id, module_key, enabled)
select o.id, m.module_key, true
from public.organizations o
cross join (values ('training_programs'),('trainees'),('trainers'),('sessions'),('documents'),('attendance'),('certificates')) as m(module_key)
where o.business_type = 'formation'
on conflict (organization_id, module_key) do nothing;

create or replace function public.validate_training_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_plan text;
begin
  select plan into v_plan
  from public.organizations
  where id = new.organization_id and business_type = 'formation';

  if v_plan is null then
    raise exception 'Ce module est réservé aux espaces Formation.';
  end if;

  if tg_table_name in ('training_programs','training_sessions') and v_plan = 'metier' then
    if new.site_id is null or not exists (
      select 1 from public.organization_sites s
      where s.organization_id = new.organization_id
        and s.id = new.site_id
        and s.status = 'active'
    ) then
      raise exception 'Un établissement actif doit être sélectionné.';
    end if;
  end if;

  if tg_table_name in ('training_programs','training_sessions') and v_plan <> 'metier' then
    new.site_id := null;
  end if;

  return new;
end;
$$;

create or replace function public.create_training_session(
  p_organization_id uuid,
  p_site_id uuid,
  p_program_id uuid,
  p_trainer_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity integer,
  p_location text,
  p_modality text,
  p_status text,
  p_notes text,
  p_trainee_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_plan text;
  v_trainee_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then
    raise exception 'Accès insuffisant.';
  end if;

  select plan into v_plan from public.organizations
  where id = p_organization_id and business_type = 'formation';
  if v_plan is null then raise exception 'Espace Formation introuvable.'; end if;

  if p_ends_at <= p_starts_at then raise exception 'La date de fin doit être postérieure au début.'; end if;
  if p_capacity not between 1 and 500 then raise exception 'La capacité doit être comprise entre 1 et 500.'; end if;
  if p_modality not in ('presentiel','distanciel','hybride') then raise exception 'Modalité invalide.'; end if;
  if p_status not in ('draft','scheduled','in_progress','completed','canceled') then raise exception 'Statut invalide.'; end if;

  if not exists (
    select 1 from public.training_programs
    where organization_id = p_organization_id and id = p_program_id and status <> 'archived'
  ) then raise exception 'Formation introuvable.'; end if;

  if p_trainer_id is not null and not exists (
    select 1 from public.training_trainers
    where organization_id = p_organization_id and id = p_trainer_id and status = 'active'
  ) then raise exception 'Formateur introuvable ou inactif.'; end if;

  if v_plan = 'metier' and not exists (
    select 1 from public.organization_sites
    where organization_id = p_organization_id and id = p_site_id and status = 'active'
  ) then raise exception 'Établissement introuvable ou inactif.'; end if;

  if cardinality(coalesce(p_trainee_ids, '{}'::uuid[])) > p_capacity then
    raise exception 'Le nombre de stagiaires dépasse la capacité de la session.';
  end if;

  insert into public.training_sessions (
    organization_id, site_id, program_id, trainer_id, title, starts_at, ends_at,
    capacity, location, modality, status, notes, created_by
  ) values (
    p_organization_id, case when v_plan = 'metier' then p_site_id else null end,
    p_program_id, p_trainer_id, trim(p_title), p_starts_at, p_ends_at,
    p_capacity, nullif(trim(coalesce(p_location,'')),''), p_modality, p_status,
    nullif(trim(coalesce(p_notes,'')),''), auth.uid()
  ) returning id into v_id;

  foreach v_trainee_id in array coalesce(p_trainee_ids, '{}'::uuid[]) loop
    if not exists (
      select 1 from public.training_trainees
      where organization_id = p_organization_id and id = v_trainee_id and status = 'active'
    ) then raise exception 'Un stagiaire sélectionné est introuvable ou inactif.'; end if;

    insert into public.training_session_enrollments (
      organization_id, session_id, trainee_id, status, created_by
    ) values (p_organization_id, v_id, v_trainee_id, 'registered', auth.uid());
  end loop;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.session_created', 'training_session', v_id::text,
    jsonb_build_object('program_id', p_program_id, 'trainer_id', p_trainer_id, 'trainee_count', cardinality(coalesce(p_trainee_ids, '{}'::uuid[])))
  );

  return v_id;
end;
$$;

create or replace function public.set_training_session_status(
  p_organization_id uuid,
  p_session_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then
    raise exception 'Accès insuffisant.';
  end if;
  if p_status not in ('draft','scheduled','in_progress','completed','canceled') then
    raise exception 'Statut invalide.';
  end if;

  update public.training_sessions
  set status = p_status, updated_at = now()
  where organization_id = p_organization_id and id = p_session_id;

  if not found then raise exception 'Session introuvable.'; end if;
end;
$$;

create or replace function public.training_dashboard_summary(
  p_organization_id uuid,
  p_site_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'Accès refusé.';
  end if;

  select jsonb_build_object(
    'active_programs', (select count(*) from public.training_programs p where p.organization_id = p_organization_id and p.status = 'active' and (p_site_id is null or p.site_id = p_site_id)),
    'active_trainees', (select count(*) from public.training_trainees t where t.organization_id = p_organization_id and t.status = 'active'),
    'active_trainers', (select count(*) from public.training_trainers t where t.organization_id = p_organization_id and t.status = 'active'),
    'upcoming_sessions', (select count(*) from public.training_sessions s where s.organization_id = p_organization_id and s.status in ('draft','scheduled') and s.ends_at >= now() and (p_site_id is null or s.site_id = p_site_id)),
    'next_sessions', (
      select coalesce(jsonb_agg(row_data order by starts_at), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id', s.id,
          'title', s.title,
          'starts_at', s.starts_at,
          'ends_at', s.ends_at,
          'status', s.status,
          'capacity', s.capacity,
          'location', s.location,
          'program_title', p.title,
          'trainer_name', nullif(trim(concat_ws(' ', tr.first_name, tr.last_name)), ''),
          'enrolled_count', (select count(*) from public.training_session_enrollments e where e.session_id = s.id and e.status <> 'canceled')
        ) as row_data,
        s.starts_at
        from public.training_sessions s
        join public.training_programs p on p.organization_id = s.organization_id and p.id = s.program_id
        left join public.training_trainers tr on tr.organization_id = s.organization_id and tr.id = s.trainer_id
        where s.organization_id = p_organization_id
          and s.status in ('draft','scheduled','in_progress')
          and s.ends_at >= now()
          and (p_site_id is null or s.site_id = p_site_id)
        order by s.starts_at
        limit 6
      ) q
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.create_training_session(uuid,uuid,uuid,uuid,text,timestamptz,timestamptz,integer,text,text,text,text,uuid[]) from public;
revoke all on function public.set_training_session_status(uuid,uuid,text) from public;
revoke all on function public.training_dashboard_summary(uuid,uuid) from public;
grant execute on function public.create_training_session(uuid,uuid,uuid,uuid,text,timestamptz,timestamptz,integer,text,text,text,text,uuid[]) to authenticated;
grant execute on function public.set_training_session_status(uuid,uuid,text) to authenticated;
grant execute on function public.training_dashboard_summary(uuid,uuid) to authenticated;

drop trigger if exists set_training_programs_updated_at on public.training_programs;
create trigger set_training_programs_updated_at before update on public.training_programs
for each row execute procedure public.set_updated_at();
drop trigger if exists set_training_trainees_updated_at on public.training_trainees;
create trigger set_training_trainees_updated_at before update on public.training_trainees
for each row execute procedure public.set_updated_at();
drop trigger if exists set_training_trainers_updated_at on public.training_trainers;
create trigger set_training_trainers_updated_at before update on public.training_trainers
for each row execute procedure public.set_updated_at();
drop trigger if exists set_training_sessions_updated_at on public.training_sessions;
create trigger set_training_sessions_updated_at before update on public.training_sessions
for each row execute procedure public.set_updated_at();
drop trigger if exists set_training_enrollments_updated_at on public.training_session_enrollments;
create trigger set_training_enrollments_updated_at before update on public.training_session_enrollments
for each row execute procedure public.set_updated_at();

drop trigger if exists validate_training_program_scope on public.training_programs;
create trigger validate_training_program_scope before insert or update on public.training_programs
for each row execute procedure public.validate_training_scope();
drop trigger if exists validate_training_trainee_scope on public.training_trainees;
create trigger validate_training_trainee_scope before insert or update on public.training_trainees
for each row execute procedure public.validate_training_scope();
drop trigger if exists validate_training_trainer_scope on public.training_trainers;
create trigger validate_training_trainer_scope before insert or update on public.training_trainers
for each row execute procedure public.validate_training_scope();
drop trigger if exists validate_training_session_scope on public.training_sessions;
create trigger validate_training_session_scope before insert or update on public.training_sessions
for each row execute procedure public.validate_training_scope();
drop trigger if exists validate_training_enrollment_scope on public.training_session_enrollments;
create trigger validate_training_enrollment_scope before insert or update on public.training_session_enrollments
for each row execute procedure public.validate_training_scope();

alter table public.training_programs enable row level security;
alter table public.training_trainees enable row level security;
alter table public.training_trainers enable row level security;
alter table public.training_sessions enable row level security;
alter table public.training_session_enrollments enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['training_programs','training_trainees','training_trainers','training_sessions','training_session_enrollments'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

drop policy if exists training_programs_select on public.training_programs;
create policy training_programs_select on public.training_programs for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists training_programs_insert on public.training_programs;
create policy training_programs_insert on public.training_programs for insert to authenticated with check (public.has_org_role(organization_id,array['owner','admin','manager','employee']));
drop policy if exists training_programs_update on public.training_programs;
create policy training_programs_update on public.training_programs for update to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager','employee'])) with check (public.has_org_role(organization_id,array['owner','admin','manager','employee']));
drop policy if exists training_programs_delete on public.training_programs;
create policy training_programs_delete on public.training_programs for delete to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager']));

drop policy if exists training_trainees_select on public.training_trainees;
create policy training_trainees_select on public.training_trainees for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists training_trainees_insert on public.training_trainees;
create policy training_trainees_insert on public.training_trainees for insert to authenticated with check (public.has_org_role(organization_id,array['owner','admin','manager','employee']));
drop policy if exists training_trainees_update on public.training_trainees;
create policy training_trainees_update on public.training_trainees for update to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager','employee'])) with check (public.has_org_role(organization_id,array['owner','admin','manager','employee']));
drop policy if exists training_trainees_delete on public.training_trainees;
create policy training_trainees_delete on public.training_trainees for delete to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager']));

drop policy if exists training_trainers_select on public.training_trainers;
create policy training_trainers_select on public.training_trainers for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists training_trainers_insert on public.training_trainers;
create policy training_trainers_insert on public.training_trainers for insert to authenticated with check (public.has_org_role(organization_id,array['owner','admin','manager','employee']));
drop policy if exists training_trainers_update on public.training_trainers;
create policy training_trainers_update on public.training_trainers for update to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager','employee'])) with check (public.has_org_role(organization_id,array['owner','admin','manager','employee']));
drop policy if exists training_trainers_delete on public.training_trainers;
create policy training_trainers_delete on public.training_trainers for delete to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager']));

drop policy if exists training_sessions_select on public.training_sessions;
create policy training_sessions_select on public.training_sessions for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists training_sessions_insert on public.training_sessions;
create policy training_sessions_insert on public.training_sessions for insert to authenticated with check (public.has_org_role(organization_id,array['owner','admin','manager','employee']));
drop policy if exists training_sessions_update on public.training_sessions;
create policy training_sessions_update on public.training_sessions for update to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager','employee'])) with check (public.has_org_role(organization_id,array['owner','admin','manager','employee']));
drop policy if exists training_sessions_delete on public.training_sessions;
create policy training_sessions_delete on public.training_sessions for delete to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager']));

drop policy if exists training_enrollments_select on public.training_session_enrollments;
create policy training_enrollments_select on public.training_session_enrollments for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists training_enrollments_insert on public.training_session_enrollments;
create policy training_enrollments_insert on public.training_session_enrollments for insert to authenticated with check (public.has_org_role(organization_id,array['owner','admin','manager','employee']));
drop policy if exists training_enrollments_update on public.training_session_enrollments;
create policy training_enrollments_update on public.training_session_enrollments for update to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager','employee'])) with check (public.has_org_role(organization_id,array['owner','admin','manager','employee']));
drop policy if exists training_enrollments_delete on public.training_session_enrollments;
create policy training_enrollments_delete on public.training_session_enrollments for delete to authenticated using (public.has_org_role(organization_id,array['owner','admin','manager']));

create index if not exists idx_training_programs_org_status on public.training_programs(organization_id,status,title);
create index if not exists idx_training_programs_org_site on public.training_programs(organization_id,site_id);
create index if not exists idx_training_trainees_org_status on public.training_trainees(organization_id,status,last_name,first_name);
create index if not exists idx_training_trainers_org_status on public.training_trainers(organization_id,status,last_name,first_name);
create index if not exists idx_training_sessions_org_start on public.training_sessions(organization_id,starts_at);
create index if not exists idx_training_sessions_org_site_start on public.training_sessions(organization_id,site_id,starts_at);
create index if not exists idx_training_enrollments_org_session on public.training_session_enrollments(organization_id,session_id,status);

commit;
select pg_notify('pgrst','reload schema');
