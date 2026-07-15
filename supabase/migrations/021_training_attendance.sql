-- NCR Suite V2.4.4 — Émargements et signatures du pack Formation
-- À exécuter après 020_training_documents.sql.

begin;

create table if not exists public.training_attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid,
  session_id uuid not null,
  trainee_id uuid not null,
  attendance_date date not null,
  period text not null check (period in ('morning','afternoon')),
  status text not null default 'pending' check (status in ('pending','present','absent','excused')),
  signature_path text,
  signatory_name text,
  signed_at timestamptz,
  captured_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, session_id, trainee_id, attendance_date, period),
  unique (organization_id, id),
  constraint training_attendance_session_fk foreign key (organization_id, session_id)
    references public.training_sessions(organization_id, id) on delete cascade,
  constraint training_attendance_trainee_fk foreign key (organization_id, trainee_id)
    references public.training_trainees(organization_id, id) on delete restrict,
  constraint training_attendance_site_fk foreign key (organization_id, site_id)
    references public.organization_sites(organization_id, id) on delete restrict,
  constraint training_attendance_signature_consistency check (
    (status = 'present' and signature_path is not null and signatory_name is not null and signed_at is not null)
    or
    (status <> 'present' and signature_path is null and signatory_name is null and signed_at is null)
  )
);

create index if not exists idx_training_attendance_session_day
  on public.training_attendance(organization_id, session_id, attendance_date, period);
create index if not exists idx_training_attendance_trainee
  on public.training_attendance(organization_id, trainee_id, attendance_date desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-signatures',
  'training-signatures',
  false,
  2097152,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.training_signature_organization_id(p_object_name text)
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

create or replace function public.can_read_training_signature_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = public.training_signature_organization_id(p_object_name)
      and o.business_type = 'formation'
      and public.is_org_member(o.id)
  );
$$;

create or replace function public.can_manage_training_signature_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = public.training_signature_organization_id(p_object_name)
      and o.business_type = 'formation'
      and o.status in ('trial','active')
      and public.has_org_role(o.id, array['owner','admin','manager','employee'])
  );
$$;

revoke all on function public.training_signature_organization_id(text) from public;
revoke all on function public.can_read_training_signature_asset(text) from public;
revoke all on function public.can_manage_training_signature_asset(text) from public;
grant execute on function public.training_signature_organization_id(text) to authenticated;
grant execute on function public.can_read_training_signature_asset(text) to authenticated;
grant execute on function public.can_manage_training_signature_asset(text) to authenticated;

drop policy if exists "training_signatures_storage_select" on storage.objects;
create policy "training_signatures_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'training-signatures'
  and public.can_read_training_signature_asset(name)
);

drop policy if exists "training_signatures_storage_insert" on storage.objects;
create policy "training_signatures_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'training-signatures'
  and public.can_manage_training_signature_asset(name)
);

drop policy if exists "training_signatures_storage_update" on storage.objects;
create policy "training_signatures_storage_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'training-signatures'
  and public.can_manage_training_signature_asset(name)
)
with check (
  bucket_id = 'training-signatures'
  and public.can_manage_training_signature_asset(name)
);

drop policy if exists "training_signatures_storage_delete" on storage.objects;
create policy "training_signatures_storage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'training-signatures'
  and public.can_manage_training_signature_asset(name)
);

create or replace function public.save_training_attendance(
  p_organization_id uuid,
  p_session_id uuid,
  p_trainee_id uuid,
  p_attendance_date date,
  p_period text,
  p_status text,
  p_signature_path text default null,
  p_signatory_name text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_site_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_timezone text;
  v_start_date date;
  v_end_date date;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager','employee']) then
    raise exception 'Accès insuffisant.';
  end if;

  if p_period not in ('morning','afternoon') then
    raise exception 'Période invalide.';
  end if;

  if p_status not in ('pending','present','absent','excused') then
    raise exception 'Statut de présence invalide.';
  end if;

  select s.site_id, s.starts_at, s.ends_at, coalesce(o.timezone, 'Europe/Paris')
  into v_site_id, v_starts_at, v_ends_at, v_timezone
  from public.training_sessions s
  join public.organizations o on o.id = s.organization_id
  where s.organization_id = p_organization_id
    and s.id = p_session_id
    and o.business_type = 'formation'
    and s.status <> 'canceled';

  if v_starts_at is null then
    raise exception 'Session introuvable ou annulée.';
  end if;

  v_start_date := (v_starts_at at time zone v_timezone)::date;
  v_end_date := (v_ends_at at time zone v_timezone)::date;

  if p_attendance_date < v_start_date or p_attendance_date > v_end_date then
    raise exception 'La date d’émargement est hors de la session.';
  end if;

  if not exists (
    select 1
    from public.training_session_enrollments e
    where e.organization_id = p_organization_id
      and e.session_id = p_session_id
      and e.trainee_id = p_trainee_id
      and e.status <> 'canceled'
  ) then
    raise exception 'Ce stagiaire n’est pas inscrit à la session.';
  end if;

  if p_status = 'present' then
    if nullif(trim(coalesce(p_signature_path, '')), '') is null then
      raise exception 'La signature est obligatoire pour valider la présence.';
    end if;
    if nullif(trim(coalesce(p_signatory_name, '')), '') is null then
      raise exception 'Le nom du signataire est obligatoire.';
    end if;
    if public.training_signature_organization_id(p_signature_path) is distinct from p_organization_id then
      raise exception 'Le fichier de signature ne correspond pas à cette entreprise.';
    end if;
  end if;

  insert into public.training_attendance (
    organization_id, site_id, session_id, trainee_id, attendance_date, period,
    status, signature_path, signatory_name, signed_at, captured_by, notes
  ) values (
    p_organization_id, v_site_id, p_session_id, p_trainee_id, p_attendance_date, p_period,
    p_status,
    case when p_status = 'present' then nullif(trim(p_signature_path), '') else null end,
    case when p_status = 'present' then nullif(trim(p_signatory_name), '') else null end,
    case when p_status = 'present' then now() else null end,
    auth.uid(), nullif(trim(coalesce(p_notes, '')), '')
  )
  on conflict (organization_id, session_id, trainee_id, attendance_date, period)
  do update set
    site_id = excluded.site_id,
    status = excluded.status,
    signature_path = excluded.signature_path,
    signatory_name = excluded.signatory_name,
    signed_at = excluded.signed_at,
    captured_by = excluded.captured_by,
    notes = excluded.notes,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.training_attendance_summary(
  p_organization_id uuid,
  p_session_id uuid
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
    raise exception 'Accès insuffisant.';
  end if;

  if not exists (
    select 1 from public.training_sessions
    where organization_id = p_organization_id and id = p_session_id
  ) then
    raise exception 'Session introuvable.';
  end if;

  select jsonb_build_object(
    'registered', (
      select count(*) from public.training_session_enrollments e
      where e.organization_id = p_organization_id
        and e.session_id = p_session_id
        and e.status <> 'canceled'
    ),
    'signed', (
      select count(*) from public.training_attendance a
      where a.organization_id = p_organization_id
        and a.session_id = p_session_id
        and a.status = 'present'
    ),
    'absent', (
      select count(*) from public.training_attendance a
      where a.organization_id = p_organization_id
        and a.session_id = p_session_id
        and a.status = 'absent'
    ),
    'excused', (
      select count(*) from public.training_attendance a
      where a.organization_id = p_organization_id
        and a.session_id = p_session_id
        and a.status = 'excused'
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.save_training_attendance(uuid,uuid,uuid,date,text,text,text,text,text) from public;
revoke all on function public.training_attendance_summary(uuid,uuid) from public;
grant execute on function public.save_training_attendance(uuid,uuid,uuid,date,text,text,text,text,text) to authenticated;
grant execute on function public.training_attendance_summary(uuid,uuid) to authenticated;

drop trigger if exists set_training_attendance_updated_at on public.training_attendance;
create trigger set_training_attendance_updated_at
before update on public.training_attendance
for each row execute procedure public.set_updated_at();

alter table public.training_attendance enable row level security;
revoke all on public.training_attendance from anon;
grant select, insert, update, delete on public.training_attendance to authenticated;

drop policy if exists training_attendance_select on public.training_attendance;
create policy training_attendance_select
on public.training_attendance for select
to authenticated
using (public.is_org_member(organization_id));

drop policy if exists training_attendance_insert on public.training_attendance;
create policy training_attendance_insert
on public.training_attendance for insert
to authenticated
with check (public.has_org_role(organization_id, array['owner','admin','manager','employee']));

drop policy if exists training_attendance_update on public.training_attendance;
create policy training_attendance_update
on public.training_attendance for update
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager','employee']))
with check (public.has_org_role(organization_id, array['owner','admin','manager','employee']));

drop policy if exists training_attendance_delete on public.training_attendance;
create policy training_attendance_delete
on public.training_attendance for delete
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']));

insert into public.organization_modules (organization_id, module_key, enabled)
select id, 'attendance', true
from public.organizations
where business_type = 'formation'
on conflict (organization_id, module_key) do update set enabled = true, updated_at = now();

select pg_notify('pgrst', 'reload schema');
commit;
