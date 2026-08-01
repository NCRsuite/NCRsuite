begin;

-- Vérifie l'accès à l'intervention avant tout dépôt dans le dossier photo associé.
create or replace function public.can_access_cleaning_intervention_photo(
  p_organization_id uuid,
  p_intervention_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and public.organization_has_plan_feature(p_organization_id, 'cleaning_before_after_photos')
    and exists (
      select 1
      from public.cleaning_interventions i
      where i.organization_id = p_organization_id
        and i.id = p_intervention_id
        and i.status in ('planned','in_progress')
        and (
          public.is_cleaning_manager(i.organization_id)
          or i.agent_id = public.current_cleaning_agent_id(i.organization_id)
        )
    );
$$;

revoke all on function public.can_access_cleaning_intervention_photo(uuid,uuid) from public, anon;
grant execute on function public.can_access_cleaning_intervention_photo(uuid,uuid) to authenticated;

-- Interprète le dossier Storage sans jamais convertir un chemin étranger en UUID.
create or replace function public.can_access_cleaning_photo_object(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_folders text[];
begin
  v_folders := storage.foldername(p_object_name);
  if coalesce(array_length(v_folders, 1), 0) < 2
     or v_folders[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or v_folders[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.can_access_cleaning_intervention_photo(v_folders[1]::uuid, v_folders[2]::uuid);
exception when others then
  return false;
end;
$$;

revoke all on function public.can_access_cleaning_photo_object(text) from public, anon;
grant execute on function public.can_access_cleaning_photo_object(text) to authenticated;

-- Enregistre la preuve sur l'intervention affectée sans ouvrir une mise à jour générale.
create or replace function public.set_cleaning_intervention_photo(
  p_organization_id uuid,
  p_intervention_id uuid,
  p_kind text,
  p_photo_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_expected_path text;
begin
  if p_kind not in ('before','after') then
    raise exception 'Type de photo invalide.';
  end if;
  if not public.can_access_cleaning_intervention_photo(p_organization_id, p_intervention_id) then
    raise exception 'Cette intervention ne fait pas partie de votre espace agent.';
  end if;

  v_expected_path := '/cleaning-photos/' || p_organization_id::text || '/' || p_intervention_id::text || '/';
  if nullif(trim(coalesce(p_photo_url,'')),'') is null or position(v_expected_path in p_photo_url) = 0 then
    raise exception 'Adresse de preuve photo invalide.';
  end if;

  select i.status into v_status
  from public.cleaning_interventions i
  where i.organization_id = p_organization_id
    and i.id = p_intervention_id
  for update;

  if p_kind = 'before' and v_status not in ('planned','in_progress') then
    raise exception 'La photo avant ne peut plus être modifiée après la fin de l intervention.';
  end if;
  if p_kind = 'after' and v_status <> 'in_progress' then
    raise exception 'Pointez votre arrivée avant de prendre la photo après.';
  end if;

  if p_kind = 'before' then
    update public.cleaning_interventions
    set before_photo_url = trim(p_photo_url), updated_at = now()
    where organization_id = p_organization_id and id = p_intervention_id;
  else
    update public.cleaning_interventions
    set after_photo_url = trim(p_photo_url), updated_at = now()
    where organization_id = p_organization_id and id = p_intervention_id;
  end if;
end;
$$;

revoke all on function public.set_cleaning_intervention_photo(uuid,uuid,text,text) from public, anon;
grant execute on function public.set_cleaning_intervention_photo(uuid,uuid,text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cleaning-photos','cleaning-photos',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists cleaning_photos_select on storage.objects;
create policy cleaning_photos_select on storage.objects
for select to authenticated
using (
  bucket_id = 'cleaning-photos'
  and public.can_access_cleaning_photo_object(name)
);

drop policy if exists cleaning_photos_insert on storage.objects;
create policy cleaning_photos_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'cleaning-photos'
  and public.can_access_cleaning_photo_object(name)
);

drop policy if exists cleaning_photos_update on storage.objects;
create policy cleaning_photos_update on storage.objects
for update to authenticated
using (
  bucket_id = 'cleaning-photos'
  and public.can_access_cleaning_photo_object(name)
)
with check (
  bucket_id = 'cleaning-photos'
  and public.can_access_cleaning_photo_object(name)
);

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.28.8','2.28.8','ncr-suite-shell-v2.28.8-cleaning-agent-camera',
  now(),auth.uid(),
  'V2.28.8 : espace agent Nettoyage, capture avant/apres, optimisation mobile et depot photo securise.'
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
