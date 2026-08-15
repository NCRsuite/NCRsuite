-- NCR Suite V2.29.12 — Prise / fin de poste Premium
-- Exigences configurables par site, preuves photo privées, GPS arrivée/sortie,
-- note de relève et signature de fin.

begin;

do $$
begin
  if to_regclass('public.security_sites') is null
     or to_regclass('public.security_shifts') is null
     or to_regclass('public.security_agent_positions') is null
     or to_regclass('public.platform_release_state') is null then
    raise exception 'Les migrations Sécurité précédentes doivent être exécutées avant la V2.29.12.';
  end if;
end;
$$;

alter table public.security_sites
  add column if not exists clock_in_photo_required boolean not null default false,
  add column if not exists clock_out_photo_required boolean not null default false,
  add column if not exists clock_in_gps_required boolean not null default false,
  add column if not exists clock_out_gps_required boolean not null default false,
  add column if not exists clock_out_signature_required boolean not null default false,
  add column if not exists handover_note_required boolean not null default false;

alter table public.security_shifts
  add column if not exists clock_in_position_id uuid,
  add column if not exists clock_out_position_id uuid,
  add column if not exists handover_note text,
  add column if not exists handover_note_at timestamptz,
  add column if not exists handover_note_by uuid references auth.users(id) on delete set null;

alter table public.security_shifts
  drop constraint if exists security_shifts_clock_in_position_fk,
  add constraint security_shifts_clock_in_position_fk foreign key (clock_in_position_id)
    references public.security_agent_positions(id) on delete set null,
  drop constraint if exists security_shifts_clock_out_position_fk,
  add constraint security_shifts_clock_out_position_fk foreign key (clock_out_position_id)
    references public.security_agent_positions(id) on delete set null;

alter table public.security_shifts
  drop constraint if exists security_shifts_handover_note_length_check,
  add constraint security_shifts_handover_note_length_check
    check (handover_note is null or char_length(handover_note) <= 2000);

-- Étend la marge de capture GPS jusqu'à H+8 pour permettre une clôture tardive
-- cohérente avec la fenêtre de récupération des vacations oubliées.
create or replace function public.record_security_agent_position_at(
  p_organization_id uuid,
  p_shift_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision default null,
  p_recorded_at timestamptz default now()
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_agent uuid;
  v_id uuid;
  v_shift public.security_shifts%rowtype;
  v_recorded_at timestamptz := coalesce(p_recorded_at, now());
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'security_geolocation') then
    raise exception 'La géolocalisation nécessite l’offre Professionnelle.';
  end if;
  v_agent := public.current_security_agent_id(p_organization_id);
  if v_agent is null then raise exception 'Aucune fiche agent n’est liée à ce compte.'; end if;
  select * into v_shift
  from public.security_shifts
  where organization_id = p_organization_id
    and id = p_shift_id
    and agent_id = v_agent
    and status <> 'canceled';
  if v_shift.id is null then raise exception 'Vacation introuvable ou non attribuée à cet agent.'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Coordonnées GPS invalides.';
  end if;
  if v_recorded_at < now() - interval '24 hours' or v_recorded_at > now() + interval '5 minutes' then
    raise exception 'Horodatage GPS invalide.';
  end if;
  if v_recorded_at < v_shift.starts_at - interval '2 hours'
     or v_recorded_at > v_shift.ends_at + interval '8 hours' then
    raise exception 'La position ne correspond pas à la période de cette vacation.';
  end if;

  insert into public.security_agent_positions(
    organization_id, agent_id, shift_id, latitude, longitude, accuracy_m, recorded_at
  ) values (
    p_organization_id, v_agent, p_shift_id, p_latitude, p_longitude,
    case when p_accuracy_m is null then null else greatest(0, p_accuracy_m) end,
    v_recorded_at
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_security_agent_position_at(uuid,uuid,double precision,double precision,double precision,timestamptz) from public;
grant execute on function public.record_security_agent_position_at(uuid,uuid,double precision,double precision,double precision,timestamptz) to authenticated;

create table if not exists public.security_shift_proofs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shift_id uuid not null,
  site_id uuid not null,
  agent_id uuid not null,
  proof_type text not null check (proof_type in ('clock_in_photo','clock_out_photo','clock_out_signature')),
  storage_path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 25000000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, shift_id, proof_type),
  unique (organization_id, storage_path),
  constraint security_shift_proofs_shift_fk foreign key (organization_id, shift_id)
    references public.security_shifts(organization_id, id) on delete cascade,
  constraint security_shift_proofs_site_fk foreign key (organization_id, site_id)
    references public.security_sites(organization_id, id) on delete cascade,
  constraint security_shift_proofs_agent_fk foreign key (organization_id, agent_id)
    references public.security_agents(organization_id, id) on delete cascade
);

create index if not exists idx_security_shift_proofs_shift
  on public.security_shift_proofs(organization_id, shift_id, proof_type);

alter table public.security_shift_proofs enable row level security;

drop policy if exists security_shift_proofs_select on public.security_shift_proofs;
create policy security_shift_proofs_select on public.security_shift_proofs for select using (
  public.is_security_manager(organization_id)
  or agent_id = public.current_security_agent_id(organization_id)
);

grant select on public.security_shift_proofs to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'security-shift-proofs',
  'security-shift-proofs',
  false,
  10000000,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.can_manage_security_shift_proof_asset(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_org uuid;
  v_shift uuid;
  v_agent uuid;
begin
  begin
    v_org := split_part(p_object_name, '/', 1)::uuid;
    v_shift := split_part(p_object_name, '/', 2)::uuid;
  exception when others then
    return false;
  end;

  if auth.uid() is null then return false; end if;
  if public.is_security_manager(v_org) then return true; end if;
  v_agent := public.current_security_agent_id(v_org);
  if v_agent is null then return false; end if;

  return exists (
    select 1 from public.security_shifts s
    where s.organization_id = v_org
      and s.id = v_shift
      and s.agent_id = v_agent
      and s.status <> 'canceled'
  );
end;
$$;

revoke all on function public.can_manage_security_shift_proof_asset(text) from public, anon;
grant execute on function public.can_manage_security_shift_proof_asset(text) to authenticated;

drop policy if exists security_shift_proofs_storage_select on storage.objects;
create policy security_shift_proofs_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'security-shift-proofs'
  and public.can_manage_security_shift_proof_asset(name)
);

drop policy if exists security_shift_proofs_storage_insert on storage.objects;
create policy security_shift_proofs_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'security-shift-proofs'
  and public.can_manage_security_shift_proof_asset(name)
);

drop policy if exists security_shift_proofs_storage_update on storage.objects;
create policy security_shift_proofs_storage_update on storage.objects for update to authenticated using (
  bucket_id = 'security-shift-proofs'
  and public.can_manage_security_shift_proof_asset(name)
) with check (
  bucket_id = 'security-shift-proofs'
  and public.can_manage_security_shift_proof_asset(name)
);

drop policy if exists security_shift_proofs_storage_delete on storage.objects;
create policy security_shift_proofs_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'security-shift-proofs'
  and public.can_manage_security_shift_proof_asset(name)
);

create or replace function public.attach_security_shift_proof(
  p_organization_id uuid,
  p_shift_id uuid,
  p_proof_type text,
  p_storage_path text,
  p_file_name text default null,
  p_mime_type text default null,
  p_size_bytes bigint default null
)
returns public.security_shift_proofs
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_shift public.security_shifts%rowtype;
  v_agent uuid;
  v_manager boolean;
  v_type text := lower(trim(coalesce(p_proof_type, '')));
  v_row public.security_shift_proofs%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if v_type not in ('clock_in_photo','clock_out_photo','clock_out_signature') then
    raise exception 'Type de preuve invalide.';
  end if;

  v_manager := public.is_security_manager(p_organization_id);
  v_agent := public.current_security_agent_id(p_organization_id);

  select * into v_shift
  from public.security_shifts
  where organization_id = p_organization_id and id = p_shift_id
  for update;

  if v_shift.id is null then raise exception 'Vacation introuvable.'; end if;
  if v_shift.status = 'canceled' then raise exception 'Cette vacation est annulée.'; end if;
  if not v_manager and (v_agent is null or v_shift.agent_id <> v_agent) then
    raise exception 'Cette vacation ne vous est pas attribuée.';
  end if;
  if v_type in ('clock_out_photo','clock_out_signature')
     and not v_manager
     and (v_shift.clocked_in_at is null or v_shift.clocked_out_at is not null) then
    raise exception 'La vacation doit être en cours pour enregistrer cette preuve de fin.';
  end if;
  if split_part(p_storage_path, '/', 1) <> p_organization_id::text
     or split_part(p_storage_path, '/', 2) <> p_shift_id::text then
    raise exception 'Le fichier ne correspond pas à cette vacation.';
  end if;

  insert into public.security_shift_proofs(
    organization_id,shift_id,site_id,agent_id,proof_type,storage_path,file_name,mime_type,size_bytes,created_by
  ) values (
    p_organization_id,v_shift.id,v_shift.site_id,v_shift.agent_id,v_type,p_storage_path,
    nullif(trim(coalesce(p_file_name,'')),''),nullif(trim(coalesce(p_mime_type,'')),''),p_size_bytes,auth.uid()
  )
  on conflict(organization_id,shift_id,proof_type) do update set
    storage_path=excluded.storage_path,
    file_name=excluded.file_name,
    mime_type=excluded.mime_type,
    size_bytes=excluded.size_bytes,
    created_by=excluded.created_by,
    updated_at=now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.attach_security_shift_proof(uuid,uuid,text,text,text,text,bigint) from public, anon;
grant execute on function public.attach_security_shift_proof(uuid,uuid,text,text,text,text,bigint) to authenticated;

create or replace function public.get_security_shift_handover(
  p_organization_id uuid,
  p_shift_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_shift public.security_shifts%rowtype;
  v_agent uuid;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  v_agent := public.current_security_agent_id(p_organization_id);
  select * into v_shift from public.security_shifts
  where organization_id=p_organization_id and id=p_shift_id;
  if v_shift.id is null then raise exception 'Vacation introuvable.'; end if;
  if not public.is_security_manager(p_organization_id)
     and (v_agent is null or v_shift.agent_id <> v_agent) then
    raise exception 'Cette vacation ne vous est pas attribuée.';
  end if;

  select jsonb_build_object(
    'note', s.handover_note,
    'recorded_at', s.handover_note_at,
    'ended_at', s.clocked_out_at,
    'agent_name', trim(concat(a.first_name, ' ', left(a.last_name, 1), '.'))
  ) into v_result
  from public.security_shifts s
  left join public.security_agents a on a.organization_id=s.organization_id and a.id=s.agent_id
  where s.organization_id=p_organization_id
    and s.site_id=v_shift.site_id
    and s.id<>v_shift.id
    and s.handover_note is not null
    and char_length(trim(s.handover_note)) > 0
    and coalesce(s.clocked_out_at,s.ends_at) <= v_shift.starts_at
  order by coalesce(s.clocked_out_at,s.ends_at) desc
  limit 1;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.get_security_shift_handover(uuid,uuid) from public, anon;
grant execute on function public.get_security_shift_handover(uuid,uuid) to authenticated;

create or replace function public.set_security_shift_presence_event_premium(
  p_organization_id uuid,
  p_shift_id uuid,
  p_action text,
  p_handover_note text default null,
  p_position_id uuid default null,
  p_force boolean default false
)
returns public.security_shifts
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_shift public.security_shifts%rowtype;
  v_site public.security_sites%rowtype;
  v_agent uuid;
  v_manager boolean;
  v_action text := lower(trim(coalesce(p_action,'')));
  v_note text := nullif(trim(coalesce(p_handover_note,'')), '');
  v_result public.security_shifts%rowtype;
  v_position public.security_agent_positions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if v_action not in ('start','end') then raise exception 'Action invalide.'; end if;

  v_manager := public.is_security_manager(p_organization_id);
  v_agent := public.current_security_agent_id(p_organization_id);

  select * into v_shift from public.security_shifts
  where organization_id=p_organization_id and id=p_shift_id for update;
  if v_shift.id is null then raise exception 'Vacation introuvable.'; end if;
  select * into v_site from public.security_sites
  where organization_id=p_organization_id and id=v_shift.site_id;

  if not v_manager and (v_agent is null or v_shift.agent_id<>v_agent) then
    raise exception 'Cette vacation ne vous est pas attribuée.';
  end if;

  if p_position_id is not null then
    select * into v_position from public.security_agent_positions
    where id=p_position_id
      and organization_id=p_organization_id
      and shift_id=p_shift_id
      and agent_id=v_shift.agent_id;
    if v_position.id is null then raise exception 'La position GPS ne correspond pas à cette vacation.'; end if;
    if v_position.recorded_at < now() - interval '15 minutes' then
      raise exception 'La position GPS est trop ancienne. Relance la localisation.';
    end if;
  end if;

  if not v_manager and v_action='start' then
    if v_site.clock_in_photo_required and not exists(
      select 1 from public.security_shift_proofs p
      where p.organization_id=p_organization_id and p.shift_id=p_shift_id and p.proof_type='clock_in_photo'
    ) then raise exception 'La photo de prise de poste est obligatoire sur ce site.'; end if;
    if v_site.clock_in_gps_required and p_position_id is null then
      raise exception 'La position GPS est obligatoire pour prendre le poste sur ce site.';
    end if;
  end if;

  if not v_manager and v_action='end' then
    if v_site.clock_out_photo_required and not exists(
      select 1 from public.security_shift_proofs p
      where p.organization_id=p_organization_id and p.shift_id=p_shift_id and p.proof_type='clock_out_photo'
    ) then raise exception 'La photo de fin de poste est obligatoire sur ce site.'; end if;
    if v_site.clock_out_signature_required and not exists(
      select 1 from public.security_shift_proofs p
      where p.organization_id=p_organization_id and p.shift_id=p_shift_id and p.proof_type='clock_out_signature'
    ) then raise exception 'La signature de fin de poste est obligatoire sur ce site.'; end if;
    if v_site.clock_out_gps_required and p_position_id is null then
      raise exception 'La position GPS est obligatoire pour terminer le poste sur ce site.';
    end if;
    if v_site.handover_note_required and v_note is null then
      raise exception 'La note de relève est obligatoire sur ce site.';
    end if;
    if v_note is not null and char_length(v_note)>2000 then
      raise exception 'La note de relève est trop longue.';
    end if;
  end if;

  select * into v_result
  from public.set_security_shift_presence_event(
    p_organization_id,
    p_shift_id,
    v_action,
    case when v_action='end' then v_note else null end,
    p_force
  );

  if v_action='start' then
    update public.security_shifts
      set clock_in_position_id=coalesce(clock_in_position_id,p_position_id), updated_at=now()
    where organization_id=p_organization_id and id=p_shift_id
    returning * into v_result;
  else
    update public.security_shifts
      set clock_out_position_id=coalesce(clock_out_position_id,p_position_id),
          handover_note=v_note,
          handover_note_at=case when v_note is null then handover_note_at else now() end,
          handover_note_by=case when v_note is null then handover_note_by else auth.uid() end,
          updated_at=now()
    where organization_id=p_organization_id and id=p_shift_id
    returning * into v_result;
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),'security.shift_presence_premium','security_shift',p_shift_id::text,
    jsonb_build_object(
      'action',v_action,
      'position_id',p_position_id,
      'handover_note_supplied',v_note is not null,
      'site_requirements',jsonb_build_object(
        'clock_in_photo',v_site.clock_in_photo_required,
        'clock_out_photo',v_site.clock_out_photo_required,
        'clock_in_gps',v_site.clock_in_gps_required,
        'clock_out_gps',v_site.clock_out_gps_required,
        'clock_out_signature',v_site.clock_out_signature_required,
        'handover_note',v_site.handover_note_required
      )
    )
  );

  return v_result;
end;
$$;

revoke all on function public.set_security_shift_presence_event_premium(uuid,uuid,text,text,uuid,boolean) from public, anon;
grant execute on function public.set_security_shift_presence_event_premium(uuid,uuid,text,text,uuid,boolean) to authenticated;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.29.12','2.29.12','ncr-suite-shell-v2.29.12-security-premium-presence',
  now(),auth.uid(),
  'V2.29.12 : prise et fin de poste premium, preuves configurables par site, GPS entrée/sortie, relève et signature.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
