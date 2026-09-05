CREATE OR REPLACE FUNCTION private.beauty_import_clients(p_organization_id uuid, p_company_id uuid, p_source_provider text, p_file_name text, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
declare
  v_job_id uuid; v_row jsonb; v_inserted integer:=0; v_merged integer:=0; v_skipped integer:=0;
  v_errors jsonb:='[]'::jsonb; v_line integer:=1; v_first_name text; v_last_name text;
  v_email text; v_phone text; v_phone_norm text; v_birth_date date; v_notes text;
  v_external_id text; v_force boolean; v_email_id uuid; v_phone_id uuid; v_name_id uuid;
  v_name_count integer; v_existing_id uuid; v_client_id uuid; v_merge_target_id uuid; v_status text;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour importer des clientes.';
  end if;
  if p_source_provider not in ('planity','booksy','treatwell','csv') then raise exception 'Source d import invalide.'; end if;
  if jsonb_typeof(p_rows)<>'array' then raise exception 'Données d import invalides.'; end if;
  if jsonb_array_length(p_rows)<1 or jsonb_array_length(p_rows)>5000 then
    raise exception 'L import doit contenir entre 1 et 5 000 lignes.';
  end if;
  if not exists(
    select 1 from public.organization_companies c join public.organizations o on o.id=c.organization_id
    where c.id=p_company_id and c.organization_id=p_organization_id and c.status='active'
      and o.business_type='coiffure' and o.plan='metier'
  ) then raise exception 'Enseigne Beauty introuvable.'; end if;

  insert into public.organization_import_jobs(
    organization_id,company_id,import_type,import_scope,source_provider,file_name,status,total_rows,created_by,metadata
  ) values(
    p_organization_id,p_company_id,'coiffure_clients','beauty_clients',p_source_provider,
    nullif(trim(coalesce(p_file_name,'')),''),
    'processing',jsonb_array_length(p_rows),auth.uid(),
    jsonb_build_object('safe_dedupe',true,'merge_only_missing',true)
  ) returning id into v_job_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_line:=v_line+1;
    begin
      v_first_name:=nullif(trim(coalesce(v_row->>'first_name','')),'');
      v_last_name:=nullif(trim(coalesce(v_row->>'last_name','')),'');
      v_email:=nullif(lower(trim(coalesce(v_row->>'email',''))),'');
      v_phone:=nullif(trim(coalesce(v_row->>'phone','')),'');
      v_phone_norm:=private.beauty_import_normalize_phone(v_phone);
      v_notes:=nullif(trim(coalesce(v_row->>'notes','')),'');
      v_external_id:=nullif(trim(coalesce(v_row->>'external_id','')),'');
      v_force:=lower(coalesce(v_row->>'force_import','false')) in ('true','1','yes','oui');
      v_birth_date:=null; v_email_id:=null; v_phone_id:=null; v_name_id:=null; v_name_count:=0;
      v_existing_id:=null; v_merge_target_id:=null;

      if v_first_name is null then raise exception 'Prénom manquant.'; end if;

      if nullif(trim(coalesce(v_row->>'birth_date','')),'') is not null then
        begin v_birth_date:=(v_row->>'birth_date')::date;
        exception when others then raise exception 'Date de naissance invalide.'; end;
      end if;

      if nullif(trim(coalesce(v_row->>'merge_target_id','')),'') is not null then
        begin v_merge_target_id:=(v_row->>'merge_target_id')::uuid;
        exception when others then raise exception 'Cible de fusion invalide.'; end;
      end if;

      if v_external_id is not null then
        select local_id into v_existing_id from public.beauty_import_external_refs
        where organization_id=p_organization_id and company_id=p_company_id
          and source_provider=p_source_provider and entity_type='client' and external_id=v_external_id limit 1;
        if v_existing_id is not null then v_skipped:=v_skipped+1; continue; end if;
      end if;

      if v_email is not null then
        select id into v_email_id from public.clients
        where organization_id=p_organization_id and company_id=p_company_id and status='active'
          and lower(coalesce(email,''))=v_email
        order by created_at limit 1;
      end if;

      if v_phone_norm is not null then
        select id into v_phone_id from public.clients
        where organization_id=p_organization_id and company_id=p_company_id and status='active'
          and private.beauty_import_normalize_phone(phone)=v_phone_norm
        order by created_at limit 1;
      end if;

      if v_email_id is not null and v_phone_id is not null and v_email_id<>v_phone_id then
        raise exception 'Conflit : e-mail et téléphone rattachés à deux clientes différentes.';
      end if;
      v_existing_id:=coalesce(v_email_id,v_phone_id);

      select count(*)::int,min(id::text)::uuid into v_name_count,v_name_id
      from public.clients
      where organization_id=p_organization_id and company_id=p_company_id and status='active'
        and lower(trim(first_name))=lower(v_first_name)
        and lower(trim(coalesce(last_name,'')))=lower(trim(coalesce(v_last_name,'')));

      if v_merge_target_id is not null then
        if not exists(
          select 1 from public.clients c
          where c.id=v_merge_target_id and c.organization_id=p_organization_id
            and c.company_id=p_company_id and c.status='active'
        ) then
          raise exception 'La fiche cible de fusion est introuvable dans cette enseigne.';
        end if;

        if v_existing_id is not null and v_merge_target_id<>v_existing_id then
          raise exception 'La cible de fusion ne correspond pas au doublon e-mail/téléphone détecté.';
        end if;

        if v_existing_id is null and (v_name_count<>1 or v_merge_target_id<>v_name_id) then
          raise exception 'La cible de fusion n’est pas un doublon nominatif unique.';
        end if;

        update public.clients c
        set last_name=case
              when nullif(trim(coalesce(c.last_name,'')),'') is null and v_last_name is not null then v_last_name
              else c.last_name
            end,
            email=case
              when nullif(trim(coalesce(c.email,'')),'') is null and v_email is not null then v_email
              else c.email
            end,
            phone=case
              when nullif(trim(coalesce(c.phone,'')),'') is null and v_phone is not null then v_phone
              else c.phone
            end,
            birth_date=coalesce(c.birth_date,v_birth_date),
            notes=case
              when nullif(trim(coalesce(c.notes,'')),'') is null and v_notes is not null then v_notes
              else c.notes
            end,
            updated_at=now()
        where c.id=v_merge_target_id
          and c.organization_id=p_organization_id
          and c.company_id=p_company_id;

        if v_external_id is not null then
          insert into public.beauty_import_external_refs(
            organization_id,company_id,import_job_id,source_provider,entity_type,external_id,local_id
          ) values(p_organization_id,p_company_id,v_job_id,p_source_provider,'client',v_external_id,v_merge_target_id)
          on conflict(organization_id,company_id,source_provider,entity_type,external_id) do nothing;
        end if;

        v_merged:=v_merged+1;
        continue;
      end if;

      if v_existing_id is not null then
        if v_external_id is not null then
          insert into public.beauty_import_external_refs(
            organization_id,company_id,import_job_id,source_provider,entity_type,external_id,local_id
          ) values(p_organization_id,p_company_id,v_job_id,p_source_provider,'client',v_external_id,v_existing_id)
          on conflict(organization_id,company_id,source_provider,entity_type,external_id) do nothing;
        end if;
        v_skipped:=v_skipped+1;
        continue;
      end if;

      if v_name_count>1 then
        raise exception 'Plusieurs clientes portent ce prénom et ce nom : résolution manuelle obligatoire.';
      end if;

      if v_name_count=1 and not v_force then
        v_skipped:=v_skipped+1;
        continue;
      end if;

      insert into public.clients(
        organization_id,company_id,first_name,last_name,email,phone,birth_date,notes,status,
        loyalty_opt_in,birthday_consent,marketing_opt_in,created_by
      ) values(
        p_organization_id,p_company_id,v_first_name,v_last_name,v_email,v_phone,v_birth_date,v_notes,
        'active',true,false,false,auth.uid()
      ) returning id into v_client_id;

      if v_external_id is not null then
        insert into public.beauty_import_external_refs(
          organization_id,company_id,import_job_id,source_provider,entity_type,external_id,local_id
        ) values(p_organization_id,p_company_id,v_job_id,p_source_provider,'client',v_external_id,v_client_id)
        on conflict(organization_id,company_id,source_provider,entity_type,external_id) do nothing;
      end if;
      v_inserted:=v_inserted+1;

    exception when others then
      v_errors:=v_errors||jsonb_build_array(jsonb_build_object('line',v_line,'message',sqlerrm));
    end;
  end loop;

  v_status:=case when jsonb_array_length(v_errors)=0 then 'completed'
    when v_inserted>0 or v_merged>0 or v_skipped>0 then 'completed_with_errors' else 'failed' end;

  update public.organization_import_jobs
  set status=v_status,inserted_rows=v_inserted,skipped_rows=v_skipped,
      error_rows=jsonb_array_length(v_errors),errors=v_errors,completed_at=now(),
      metadata=metadata||jsonb_build_object(
        'inserted',v_inserted,'merged',v_merged,'skipped',v_skipped,'errors',jsonb_array_length(v_errors)
      )
  where id=v_job_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'beauty.clients_imported','organization_import_job',v_job_id::text,
    jsonb_build_object(
      'company_id',p_company_id,'source_provider',p_source_provider,
      'inserted',v_inserted,'merged',v_merged,'skipped',v_skipped,'errors',jsonb_array_length(v_errors)
    )
  );

  return jsonb_build_object(
    'job_id',v_job_id,'status',v_status,'total_rows',jsonb_array_length(p_rows),
    'inserted_rows',v_inserted,'merged_rows',v_merged,'skipped_rows',v_skipped,
    'error_rows',jsonb_array_length(v_errors),'errors',v_errors
  );
end;
$function$


CREATE OR REPLACE FUNCTION private.beauty_preview_client_import(p_organization_id uuid, p_company_id uuid, p_source_provider text, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
declare
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour prévisualiser cet import.';
  end if;
  if p_source_provider not in ('planity','booksy','treatwell','csv') then raise exception 'Source d import invalide.'; end if;
  if jsonb_typeof(p_rows)<>'array' then raise exception 'Données d import invalides.'; end if;
  if jsonb_array_length(p_rows)<1 then raise exception 'Aucune ligne à prévisualiser.'; end if;
  if jsonb_array_length(p_rows)>5000 then raise exception 'Un import Beauty est limité à 5 000 lignes.'; end if;
  if not exists(
    select 1 from public.organization_companies c join public.organizations o on o.id=c.organization_id
    where c.id=p_company_id and c.organization_id=p_organization_id and c.status='active'
      and o.business_type='coiffure' and o.plan='metier'
  ) then raise exception 'Enseigne Beauty introuvable.'; end if;

  with input_rows as (
    select ordinality::int+1 as line,value as raw,
      nullif(trim(coalesce(value->>'first_name','')),'') as first_name,
      nullif(trim(coalesce(value->>'last_name','')),'') as last_name,
      nullif(lower(trim(coalesce(value->>'email',''))),'') as email,
      nullif(trim(coalesce(value->>'phone','')),'') as phone,
      private.beauty_import_normalize_phone(value->>'phone') as phone_norm,
      nullif(trim(coalesce(value->>'birth_date','')),'') as birth_date,
      nullif(trim(coalesce(value->>'notes','')),'') as notes,
      nullif(trim(coalesce(value->>'external_id','')),'') as external_id
    from jsonb_array_elements(p_rows) with ordinality
  ),
  matches as (
    select i.*,
      (select c.id from public.clients c where c.organization_id=p_organization_id and c.company_id=p_company_id
         and c.status='active' and i.email is not null and lower(coalesce(c.email,''))=i.email order by c.created_at limit 1) as email_client_id,
      (select c.id from public.clients c where c.organization_id=p_organization_id and c.company_id=p_company_id
         and c.status='active' and i.phone_norm is not null and private.beauty_import_normalize_phone(c.phone)=i.phone_norm order by c.created_at limit 1) as phone_client_id,
      (select count(*)::int from public.clients c where c.organization_id=p_organization_id and c.company_id=p_company_id
         and c.status='active' and i.first_name is not null
         and lower(trim(c.first_name))=lower(i.first_name)
         and lower(trim(coalesce(c.last_name,'')))=lower(trim(coalesce(i.last_name,'')))) as name_match_count,
      (select min(c.id::text)::uuid from public.clients c where c.organization_id=p_organization_id and c.company_id=p_company_id
         and c.status='active' and i.first_name is not null
         and lower(trim(c.first_name))=lower(i.first_name)
         and lower(trim(coalesce(c.last_name,'')))=lower(trim(coalesce(i.last_name,'')))) as name_client_id,
      exists(select 1 from public.beauty_import_external_refs r
        where r.organization_id=p_organization_id and r.company_id=p_company_id
          and r.source_provider=p_source_provider and r.entity_type='client'
          and i.external_id is not null and r.external_id=i.external_id) as external_seen,
      exists(select 1 from input_rows prior where prior.line<i.line
        and ((i.email is not null and prior.email=i.email)
          or (i.phone_norm is not null and prior.phone_norm=i.phone_norm))) as file_duplicate
    from input_rows i
  ),
  classified as (
    select m.*,
      case
        when m.first_name is null then 'invalid'
        when m.external_seen then 'duplicate'
        when m.file_duplicate then 'duplicate_file'
        when m.email_client_id is not null and m.phone_client_id is not null and m.email_client_id<>m.phone_client_id then 'conflict'
        when m.email_client_id is not null or m.phone_client_id is not null then 'duplicate'
        when m.name_match_count>1 then 'conflict'
        when m.name_match_count=1 then 'possible_duplicate'
        else 'ready'
      end as status,
      case
        when m.first_name is null then 'Prénom manquant.'
        when m.external_seen then 'Cet identifiant source a déjà été importé.'
        when m.file_duplicate then 'Doublon détecté dans le fichier.'
        when m.email_client_id is not null and m.phone_client_id is not null and m.email_client_id<>m.phone_client_id then 'L e-mail et le téléphone correspondent à deux clientes différentes.'
        when m.email_client_id is not null then 'Une cliente possède déjà cet e-mail.'
        when m.phone_client_id is not null then 'Une cliente possède déjà ce téléphone.'
        when m.name_match_count>1 then 'Plusieurs clientes portent exactement ce prénom et ce nom : résolution manuelle obligatoire.'
        when m.name_match_count=1 then 'Même prénom et nom détectés : choisissez de compléter la fiche existante ou de créer une nouvelle fiche.'
        else 'Prête à être importée.'
      end as reason,
      case
        when m.email_client_id is not null and m.phone_client_id is not null and m.email_client_id<>m.phone_client_id then null
        when m.email_client_id is not null or m.phone_client_id is not null then coalesce(m.email_client_id,m.phone_client_id)
        when m.name_match_count=1 then m.name_client_id
        else null
      end as matched_client_id
    from matches m
  ),
  with_client as (
    select c.*,existing.first_name as existing_first_name,existing.last_name as existing_last_name,
      existing.email as existing_email,existing.phone as existing_phone,existing.birth_date as existing_birth_date
    from classified c
    left join public.clients existing on existing.organization_id=p_organization_id
      and existing.company_id=p_company_id and existing.id=c.matched_client_id
  )
  select jsonb_build_object(
    'total_rows',count(*)::int,
    'ready_rows',count(*) filter(where status='ready')::int,
    'duplicate_rows',count(*) filter(where status in ('duplicate','duplicate_file'))::int,
    'possible_duplicate_rows',count(*) filter(where status='possible_duplicate')::int,
    'conflict_rows',count(*) filter(where status='conflict')::int,
    'invalid_rows',count(*) filter(where status='invalid')::int,
    'items',coalesce(jsonb_agg(jsonb_build_object(
      'line',line,'status',status,'reason',reason,'first_name',first_name,'last_name',last_name,
      'email',email,'phone',phone,'birth_date',birth_date,'external_id',external_id,
      'matched_client',case when matched_client_id is null then null else jsonb_build_object(
        'id',matched_client_id,'first_name',existing_first_name,'last_name',existing_last_name,
        'email',existing_email,'phone',existing_phone,'birth_date',existing_birth_date
      ) end
    ) order by line),'[]'::jsonb)
  ) into v_result from with_client;
  return v_result;
end;
$function$
