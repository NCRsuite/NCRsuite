create table if not exists public.beauty_client_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  technical_notes text,
  preferences text,
  contraindications text,
  custom_fields jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,company_id,client_id),
  constraint beauty_client_profiles_custom_fields_object check (jsonb_typeof(custom_fields)='object')
);

create table if not exists public.beauty_client_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  note_type text not null default 'technical',
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beauty_client_notes_type_check check (note_type in ('technical','preference','warning','follow_up')),
  constraint beauty_client_notes_note_check check (char_length(trim(note)) between 1 and 3000)
);

create table if not exists public.beauty_client_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  media_kind text not null,
  storage_path text not null,
  caption text,
  captured_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint beauty_client_media_kind_check check (media_kind in ('before','after','result','reference')),
  constraint beauty_client_media_storage_path_check check (char_length(storage_path) between 10 and 1000),
  unique (storage_path)
);

create table if not exists public.beauty_client_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  consent_type text not null,
  granted boolean not null,
  source text not null default 'professional',
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  note text,
  constraint beauty_client_consents_type_check check (consent_type in ('photo_internal','photo_marketing','marketing','birthday')),
  constraint beauty_client_consents_source_check check (source in ('professional','client_portal','booking'))
);

create index if not exists beauty_client_notes_scope_idx on public.beauty_client_notes(organization_id,company_id,client_id,created_at desc);
create index if not exists beauty_client_notes_appointment_idx on public.beauty_client_notes(appointment_id) where appointment_id is not null;
create index if not exists beauty_client_media_scope_idx on public.beauty_client_media(organization_id,company_id,client_id,captured_at desc);
create index if not exists beauty_client_media_appointment_idx on public.beauty_client_media(appointment_id) where appointment_id is not null;
create index if not exists beauty_client_consents_scope_idx on public.beauty_client_consents(organization_id,company_id,client_id,recorded_at desc);

create index if not exists beauty_client_profiles_company_fk_idx on public.beauty_client_profiles(company_id);
create index if not exists beauty_client_profiles_client_fk_idx on public.beauty_client_profiles(client_id);
create index if not exists beauty_client_profiles_updated_by_fk_idx on public.beauty_client_profiles(updated_by) where updated_by is not null;
create index if not exists beauty_client_notes_company_fk_idx on public.beauty_client_notes(company_id);
create index if not exists beauty_client_notes_client_fk_idx on public.beauty_client_notes(client_id);
create index if not exists beauty_client_notes_created_by_fk_idx on public.beauty_client_notes(created_by) where created_by is not null;
create index if not exists beauty_client_media_company_fk_idx on public.beauty_client_media(company_id);
create index if not exists beauty_client_media_client_fk_idx on public.beauty_client_media(client_id);
create index if not exists beauty_client_media_created_by_fk_idx on public.beauty_client_media(created_by) where created_by is not null;
create index if not exists beauty_client_consents_company_fk_idx on public.beauty_client_consents(company_id);
create index if not exists beauty_client_consents_client_fk_idx on public.beauty_client_consents(client_id);
create index if not exists beauty_client_consents_recorded_by_fk_idx on public.beauty_client_consents(recorded_by) where recorded_by is not null;

create or replace function public.beauty_client_record_scope_valid(
  p_organization_id uuid,
  p_company_id uuid,
  p_client_id uuid,
  p_appointment_id uuid default null
)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_catalog
as $function$
  select exists(
    select 1 from public.clients c
    where c.id=p_client_id
      and c.organization_id=p_organization_id
      and c.company_id=p_company_id
      and c.status<>'archived'
  )
  and (
    p_appointment_id is null
    or exists(
      select 1 from public.appointments a
      where a.id=p_appointment_id
        and a.organization_id=p_organization_id
        and a.company_id=p_company_id
        and a.client_id=p_client_id
    )
  );
$function$;

create or replace function public.beauty_enforce_client_record_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $function$
declare
  v_appointment_id uuid := null;
begin
  if tg_table_name='beauty_client_notes' then
    v_appointment_id:=new.appointment_id;
  elsif tg_table_name='beauty_client_media' then
    v_appointment_id:=new.appointment_id;
  end if;

  if not public.beauty_client_record_scope_valid(new.organization_id,new.company_id,new.client_id,v_appointment_id) then
    raise exception 'Le dossier Beauty ne correspond pas à cette enseigne ou à cette cliente.';
  end if;
  return new;
end;
$function$;

drop trigger if exists beauty_client_profiles_scope_guard on public.beauty_client_profiles;
create trigger beauty_client_profiles_scope_guard before insert or update on public.beauty_client_profiles
for each row execute function public.beauty_enforce_client_record_scope();

drop trigger if exists beauty_client_notes_scope_guard on public.beauty_client_notes;
create trigger beauty_client_notes_scope_guard before insert or update on public.beauty_client_notes
for each row execute function public.beauty_enforce_client_record_scope();

drop trigger if exists beauty_client_media_scope_guard on public.beauty_client_media;
create trigger beauty_client_media_scope_guard before insert or update on public.beauty_client_media
for each row execute function public.beauty_enforce_client_record_scope();

drop trigger if exists beauty_client_consents_scope_guard on public.beauty_client_consents;
create trigger beauty_client_consents_scope_guard before insert or update on public.beauty_client_consents
for each row execute function public.beauty_enforce_client_record_scope();

drop trigger if exists beauty_client_profiles_touch_updated_at on public.beauty_client_profiles;
create trigger beauty_client_profiles_touch_updated_at before update on public.beauty_client_profiles
for each row execute function public.set_updated_at();

drop trigger if exists beauty_client_notes_touch_updated_at on public.beauty_client_notes;
create trigger beauty_client_notes_touch_updated_at before update on public.beauty_client_notes
for each row execute function public.set_updated_at();

alter table public.beauty_client_profiles enable row level security;
alter table public.beauty_client_notes enable row level security;
alter table public.beauty_client_media enable row level security;
alter table public.beauty_client_consents enable row level security;

drop policy if exists beauty_client_profiles_select on public.beauty_client_profiles;
create policy beauty_client_profiles_select on public.beauty_client_profiles
for select to authenticated
using (public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid())));

drop policy if exists beauty_client_profiles_insert on public.beauty_client_profiles;
create policy beauty_client_profiles_insert on public.beauty_client_profiles
for insert to authenticated
with check (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and updated_by=(select auth.uid())
);

drop policy if exists beauty_client_profiles_update on public.beauty_client_profiles;
create policy beauty_client_profiles_update on public.beauty_client_profiles
for update to authenticated
using (public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid())))
with check (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and updated_by=(select auth.uid())
);

drop policy if exists beauty_client_notes_select on public.beauty_client_notes;
create policy beauty_client_notes_select on public.beauty_client_notes
for select to authenticated
using (public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid())));

drop policy if exists beauty_client_notes_insert on public.beauty_client_notes;
create policy beauty_client_notes_insert on public.beauty_client_notes
for insert to authenticated
with check (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and created_by=(select auth.uid())
);

drop policy if exists beauty_client_notes_update on public.beauty_client_notes;
create policy beauty_client_notes_update on public.beauty_client_notes
for update to authenticated
using (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and (created_by=(select auth.uid()) or public.has_org_role(organization_id,array['owner','admin','manager']))
)
with check (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and (created_by=(select auth.uid()) or public.has_org_role(organization_id,array['owner','admin','manager']))
);

drop policy if exists beauty_client_notes_delete on public.beauty_client_notes;
create policy beauty_client_notes_delete on public.beauty_client_notes
for delete to authenticated
using (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and (created_by=(select auth.uid()) or public.has_org_role(organization_id,array['owner','admin','manager']))
);

drop policy if exists beauty_client_media_select on public.beauty_client_media;
create policy beauty_client_media_select on public.beauty_client_media
for select to authenticated
using (public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid())));

drop policy if exists beauty_client_media_insert on public.beauty_client_media;
create policy beauty_client_media_insert on public.beauty_client_media
for insert to authenticated
with check (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and created_by=(select auth.uid())
);

drop policy if exists beauty_client_media_delete on public.beauty_client_media;
create policy beauty_client_media_delete on public.beauty_client_media
for delete to authenticated
using (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and (created_by=(select auth.uid()) or public.has_org_role(organization_id,array['owner','admin','manager']))
);

drop policy if exists beauty_client_consents_select on public.beauty_client_consents;
create policy beauty_client_consents_select on public.beauty_client_consents
for select to authenticated
using (public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid())));

drop policy if exists beauty_client_consents_insert on public.beauty_client_consents;
create policy beauty_client_consents_insert on public.beauty_client_consents
for insert to authenticated
with check (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and recorded_by=(select auth.uid())
);

revoke all on table public.beauty_client_profiles from anon;
revoke all on table public.beauty_client_notes from anon;
revoke all on table public.beauty_client_media from anon;
revoke all on table public.beauty_client_consents from anon;
grant select,insert,update on table public.beauty_client_profiles to authenticated;
grant select,insert,update,delete on table public.beauty_client_notes to authenticated;
grant select,insert,delete on table public.beauty_client_media to authenticated;
grant select,insert on table public.beauty_client_consents to authenticated;
grant select,insert,update,delete on table public.beauty_client_profiles to service_role;
grant select,insert,update,delete on table public.beauty_client_notes to service_role;
grant select,insert,update,delete on table public.beauty_client_media to service_role;
grant select,insert,update,delete on table public.beauty_client_consents to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('beauty-client-media','beauty-client-media',false,10485760,array['image/jpeg','image/png','image/webp']::text[])
on conflict(id) do update
set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.can_access_beauty_client_media_object(p_name text)
returns boolean
language plpgsql
stable
security invoker
set search_path = public, storage, pg_catalog
as $function$
declare
  v_parts text[];
  v_org uuid;
  v_company uuid;
  v_client uuid;
begin
  if (select auth.uid()) is null then return false; end if;
  v_parts:=storage.foldername(p_name);
  if coalesce(array_length(v_parts,1),0)<3 then return false; end if;
  begin
    v_org:=v_parts[1]::uuid;
    v_company:=v_parts[2]::uuid;
    v_client:=v_parts[3]::uuid;
  exception when others then
    return false;
  end;
  return exists(
    select 1 from public.clients c
    where c.id=v_client
      and c.organization_id=v_org
      and c.company_id=v_company
      and c.status<>'archived'
      and public.metier_beauty_client_scope_allows(v_org,v_company,v_client,(select auth.uid()))
  );
end;
$function$;

revoke all on function public.can_access_beauty_client_media_object(text) from public;
grant execute on function public.can_access_beauty_client_media_object(text) to authenticated,service_role;

drop policy if exists beauty_client_media_storage_select on storage.objects;
create policy beauty_client_media_storage_select on storage.objects
for select to authenticated
using (bucket_id='beauty-client-media' and public.can_access_beauty_client_media_object(name));

drop policy if exists beauty_client_media_storage_insert on storage.objects;
create policy beauty_client_media_storage_insert on storage.objects
for insert to authenticated
with check (bucket_id='beauty-client-media' and public.can_access_beauty_client_media_object(name));

drop policy if exists beauty_client_media_storage_delete on storage.objects;
create policy beauty_client_media_storage_delete on storage.objects
for delete to authenticated
using (bucket_id='beauty-client-media' and public.can_access_beauty_client_media_object(name));

create or replace function public.get_beauty_client_crm(
  p_organization_id uuid,
  p_company_id uuid,
  p_client_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_catalog
as $function$
declare
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.metier_beauty_client_scope_allows(p_organization_id,p_company_id,p_client_id,auth.uid()) then
    raise exception 'Accès refusé à cette fiche cliente.';
  end if;

  select jsonb_build_object(
    'client',jsonb_build_object(
      'id',c.id,'first_name',c.first_name,'last_name',c.last_name,'email',c.email,'phone',c.phone,
      'notes',c.notes,'birth_date',c.birth_date,'marketing_opt_in',c.marketing_opt_in,
      'birthday_consent',c.birthday_consent,'loyalty_opt_in',c.loyalty_opt_in,'created_at',c.created_at
    ),
    'summary',jsonb_build_object(
      'visit_count',coalesce(stats.visit_count,0),
      'total_spent_cents',coalesce(stats.total_spent_cents,0),
      'last_visit',stats.last_visit,
      'next_appointment',next_appt.next_appointment,
      'average_days_between',stats.average_days_between
    ),
    'profile',coalesce((
      select to_jsonb(bp)-'organization_id'-'company_id'-'client_id'
      from public.beauty_client_profiles bp
      where bp.organization_id=p_organization_id and bp.company_id=p_company_id and bp.client_id=p_client_id
    ),'{}'::jsonb),
    'appointments',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'starts_at',a.starts_at,'ends_at',a.ends_at,'status',a.status,
        'amount_cents',a.amount_cents,'staff_name',coalesce(st.display_name,'Équipe'),
        'service_name',coalesce(
          (select string_agg(asi.service_name,' + ' order by asi.position)
           from public.appointment_service_items asi where asi.appointment_id=a.id),
          s.name,'Prestation'
        )
      ) order by a.starts_at desc)
      from (
        select * from public.appointments a0
        where a0.organization_id=p_organization_id
          and a0.company_id=p_company_id
          and a0.client_id=p_client_id
        order by a0.starts_at desc
        limit 30
      ) a
      left join public.staff st on st.organization_id=a.organization_id and st.id=a.staff_id
      left join public.services s on s.organization_id=a.organization_id and s.id=a.service_id
    ),'[]'::jsonb),
    'notes',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',n.id,'appointment_id',n.appointment_id,'note_type',n.note_type,'note',n.note,
        'created_by',n.created_by,'created_at',n.created_at,'updated_at',n.updated_at
      ) order by n.created_at desc)
      from public.beauty_client_notes n
      where n.organization_id=p_organization_id and n.company_id=p_company_id and n.client_id=p_client_id
    ),'[]'::jsonb),
    'media',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',m.id,'appointment_id',m.appointment_id,'media_kind',m.media_kind,'storage_path',m.storage_path,
        'caption',m.caption,'captured_at',m.captured_at,'created_by',m.created_by
      ) order by m.captured_at desc)
      from public.beauty_client_media m
      where m.organization_id=p_organization_id and m.company_id=p_company_id and m.client_id=p_client_id
    ),'[]'::jsonb),
    'consents',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,'consent_type',x.consent_type,'granted',x.granted,'source',x.source,
        'recorded_at',x.recorded_at,'note',x.note
      ) order by x.recorded_at desc)
      from (
        select distinct on (bc.consent_type) bc.*
        from public.beauty_client_consents bc
        where bc.organization_id=p_organization_id and bc.company_id=p_company_id and bc.client_id=p_client_id
        order by bc.consent_type,bc.recorded_at desc
      ) x
    ),'[]'::jsonb)
  ) into v_result
  from public.clients c
  left join lateral (
    select
      count(*) filter (where a.status='completed')::integer visit_count,
      coalesce(sum(a.amount_cents) filter (where a.status='completed'),0)::bigint total_spent_cents,
      max(a.starts_at) filter (where a.status='completed') last_visit,
      case when count(*) filter (where a.status='completed')>=2 then
        round((extract(epoch from (
          max(a.starts_at) filter (where a.status='completed')
          - min(a.starts_at) filter (where a.status='completed')
        )) / 86400.0) / ((count(*) filter (where a.status='completed'))-1),1)
      else null end average_days_between
    from public.appointments a
    where a.organization_id=p_organization_id and a.company_id=p_company_id and a.client_id=p_client_id
  ) stats on true
  left join lateral (
    select min(a.starts_at) next_appointment
    from public.appointments a
    where a.organization_id=p_organization_id
      and a.company_id=p_company_id
      and a.client_id=p_client_id
      and a.status in ('pending','confirmed')
      and a.starts_at>=now()
  ) next_appt on true
  where c.id=p_client_id
    and c.organization_id=p_organization_id
    and c.company_id=p_company_id
    and c.status<>'archived';

  return v_result;
end;
$function$;

revoke all on function public.get_beauty_client_crm(uuid,uuid,uuid) from public;
grant execute on function public.get_beauty_client_crm(uuid,uuid,uuid) to authenticated,service_role;
