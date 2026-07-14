-- NCR Suite V2.4.3 — Documents du pack Formation
-- À exécuter après 019_domain_plan_catalog.sql.

begin;

create table if not exists public.training_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid,
  session_id uuid,
  program_id uuid,
  trainee_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 180),
  category text not null default 'other' check (category in (
    'convocation','programme','support','attestation','administrative','other'
  )),
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or (size_bytes >= 0 and size_bytes <= 20971520)),
  visibility text not null default 'internal' check (visibility in ('internal','session','trainee')),
  status text not null default 'published' check (status in ('draft','published','archived')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint training_documents_site_fk foreign key (organization_id, site_id)
    references public.organization_sites(organization_id, id) on delete restrict,
  constraint training_documents_session_fk foreign key (organization_id, session_id)
    references public.training_sessions(organization_id, id) on delete cascade,
  constraint training_documents_program_fk foreign key (organization_id, program_id)
    references public.training_programs(organization_id, id) on delete restrict,
  constraint training_documents_trainee_fk foreign key (organization_id, trainee_id)
    references public.training_trainees(organization_id, id) on delete restrict
);

create index if not exists idx_training_documents_org_created
  on public.training_documents(organization_id, created_at desc);
create index if not exists idx_training_documents_session
  on public.training_documents(organization_id, session_id, category);
create index if not exists idx_training_documents_trainee
  on public.training_documents(organization_id, trainee_id, category);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-documents',
  'training-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'image/png','image/jpeg','image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.training_document_organization_id(p_object_name text)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  begin
    v_organization_id := split_part(coalesce(p_object_name, ''), '/', 1)::uuid;
  exception
    when invalid_text_representation then
      return null;
  end;
  return v_organization_id;
end;
$$;

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
    where o.id = public.training_document_organization_id(p_object_name)
      and o.business_type = 'formation'
      and public.is_org_member(o.id)
  );
$$;

create or replace function public.can_manage_training_document_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = public.training_document_organization_id(p_object_name)
      and o.business_type = 'formation'
      and o.status in ('trial','active')
      and public.has_org_role(o.id, array['owner','admin','manager','employee'])
  );
$$;

revoke all on function public.training_document_organization_id(text) from public;
revoke all on function public.can_read_training_document_asset(text) from public;
revoke all on function public.can_manage_training_document_asset(text) from public;
grant execute on function public.training_document_organization_id(text) to authenticated;
grant execute on function public.can_read_training_document_asset(text) to authenticated;
grant execute on function public.can_manage_training_document_asset(text) to authenticated;

drop policy if exists "training_documents_storage_select" on storage.objects;
create policy "training_documents_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'training-documents'
  and public.can_read_training_document_asset(name)
);

drop policy if exists "training_documents_storage_insert" on storage.objects;
create policy "training_documents_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'training-documents'
  and public.can_manage_training_document_asset(name)
);

drop policy if exists "training_documents_storage_update" on storage.objects;
create policy "training_documents_storage_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'training-documents'
  and public.can_manage_training_document_asset(name)
)
with check (
  bucket_id = 'training-documents'
  and public.can_manage_training_document_asset(name)
);

drop policy if exists "training_documents_storage_delete" on storage.objects;
create policy "training_documents_storage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'training-documents'
  and public.can_manage_training_document_asset(name)
);

create or replace function public.validate_training_document_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_plan text;
  v_session_program_id uuid;
  v_session_site_id uuid;
begin
  select plan into v_plan
  from public.organizations
  where id = new.organization_id
    and business_type = 'formation';

  if v_plan is null then
    raise exception 'Ce module est réservé aux espaces Formation.';
  end if;

  if new.session_id is not null then
    select program_id, site_id
    into v_session_program_id, v_session_site_id
    from public.training_sessions
    where organization_id = new.organization_id
      and id = new.session_id;

    if v_session_program_id is null then
      raise exception 'Session introuvable.';
    end if;

    if new.program_id is null then
      new.program_id := v_session_program_id;
    elsif new.program_id <> v_session_program_id then
      raise exception 'La formation ne correspond pas à la session.';
    end if;

    if v_plan = 'metier' then
      if new.site_id is null then
        new.site_id := v_session_site_id;
      elsif new.site_id is distinct from v_session_site_id then
        raise exception 'L’établissement ne correspond pas à la session.';
      end if;
    end if;
  end if;

  if new.program_id is not null and not exists (
    select 1 from public.training_programs p
    where p.organization_id = new.organization_id
      and p.id = new.program_id
      and p.status <> 'archived'
  ) then
    raise exception 'Formation introuvable.';
  end if;

  if new.trainee_id is not null and not exists (
    select 1 from public.training_trainees t
    where t.organization_id = new.organization_id
      and t.id = new.trainee_id
      and t.status <> 'archived'
  ) then
    raise exception 'Stagiaire introuvable.';
  end if;

  if new.visibility = 'trainee' and new.trainee_id is null then
    raise exception 'Un stagiaire doit être sélectionné pour cette visibilité.';
  end if;

  if new.visibility = 'session' and new.session_id is null then
    raise exception 'Une session doit être sélectionnée pour cette visibilité.';
  end if;

  if v_plan = 'metier' then
    if new.site_id is not null and not exists (
      select 1 from public.organization_sites s
      where s.organization_id = new.organization_id
        and s.id = new.site_id
        and s.status = 'active'
    ) then
      raise exception 'Établissement introuvable ou inactif.';
    end if;
  else
    new.site_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_training_document_scope on public.training_documents;
create trigger validate_training_document_scope
before insert or update on public.training_documents
for each row execute procedure public.validate_training_document_scope();

drop trigger if exists set_training_documents_updated_at on public.training_documents;
create trigger set_training_documents_updated_at
before update on public.training_documents
for each row execute procedure public.set_updated_at();

alter table public.training_documents enable row level security;
revoke all on public.training_documents from anon;
grant select, insert, update, delete on public.training_documents to authenticated;

drop policy if exists training_documents_select on public.training_documents;
create policy training_documents_select
on public.training_documents for select
to authenticated
using (public.is_org_member(organization_id));

drop policy if exists training_documents_insert on public.training_documents;
create policy training_documents_insert
on public.training_documents for insert
to authenticated
with check (public.has_org_role(organization_id, array['owner','admin','manager','employee']));

drop policy if exists training_documents_update on public.training_documents;
create policy training_documents_update
on public.training_documents for update
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager','employee']))
with check (public.has_org_role(organization_id, array['owner','admin','manager','employee']));

drop policy if exists training_documents_delete on public.training_documents;
create policy training_documents_delete
on public.training_documents for delete
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']));

insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, sort_order
)
values (
  'documents', 'Documents', 'Convocations, programmes, supports et attestations des sessions.',
  'formation', 'file', '{securite,formation,artisan}', false, true, 530
)
on conflict (module_key) do update
set display_name = excluded.display_name,
    description = excluded.description,
    icon_key = excluded.icon_key,
    compatible_business_types = excluded.compatible_business_types,
    active = true,
    updated_at = now();

insert into public.organization_modules (organization_id, module_key, enabled)
select id, 'documents', true
from public.organizations
where business_type = 'formation'
on conflict (organization_id, module_key) do update set enabled = true;

commit;

select pg_notify('pgrst', 'reload schema');
