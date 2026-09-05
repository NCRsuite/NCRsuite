CREATE OR REPLACE FUNCTION private.beauty_import_appointments(p_organization_id uuid, p_company_id uuid, p_source_provider text, p_file_name text, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
declare
  v_timezone text; v_job_id uuid; v_row jsonb; v_line integer:=1; v_inserted integer:=0; v_skipped integer:=0;
  v_errors jsonb:='[]'::jsonb; v_status_final text; v_client_id uuid; v_email_id uuid; v_phone_id uuid;
  v_name_id uuid; v_name_count integer; v_service_id uuid; v_service_count integer; v_service_duration integer;
  v_service_price integer; v_staff_id uuid; v_staff_count integer; v_site_id uuid; v_site_count integer;
  v_starts_at timestamptz; v_ends_at timestamptz; v_duration integer; v_amount integer; v_appt_status text;
  v_external_id text; v_email text; v_phone_norm text; v_first_name text; v_last_name text; v_service_name text;
  v_staff_name text; v_site_name text; v_appointment_id uuid; v_previous_guard text;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour importer des rendez-vous.';
  end if;
  if p_source_provider not in ('planity','booksy','treatwell','csv') then raise exception 'Source d import invalide.'; end if;
  if jsonb_typeof(p_rows)<>'array' then raise exception 'Données d import invalides.'; end if;
  if jsonb_array_length(p_rows)<1 or jsonb_array_length(p_rows)>5000 then
    raise exception 'L import doit contenir entre 1 et 5 000 lignes.';
  end if;

  select o.timezone into v_timezone
  from public.organization_companies c join public.organizations o on o.id=c.organization_id
  where c.id=p_company_id and c.organization_id=p_organization_id and c.status='active'
    and o.business_type='coiffure' and o.plan='metier';
  if v_timezone is null then raise exception 'Enseigne Beauty introuvable.'; end if;

  insert into public.organization_import_jobs(
    organization_id,company_id,import_type,import_scope,source_provider,file_name,status,total_rows,created_by,metadata
  ) values(
    p_organization_id,p_company_id,'coiffure_appointments','beauty_appointments',p_source_provider,
    nullif(trim(coalesce(p_file_name,'')),''),
    'processing',jsonb_array_length(p_rows),auth.uid(),
    jsonb_build_object('historical_import',true,'notifications_suppressed',true,'loyalty_suppressed',true)
  ) returning id into v_job_id;

  v_previous_guard:=coalesce(current_setting('ncr.beauty_history_import',true),'');
  perform set_config('ncr.beauty_history_import','1',true);

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_line:=v_line+1;
    begin
      v_client_id:=null; v_email_id:=null; v_phone_id:=null; v_name_id:=null; v_name_count:=0;
      v_service_id:=null; v_service_count:=0; v_service_duration:=null; v_service_price:=null;
      v_staff_id:=null; v_staff_count:=0; v_site_id:=null; v_site_count:=0; v_appointment_id:=null;

      v_external_id:=nullif(trim(coalesce(v_row->>'external_id','')),'');
      v_email:=nullif(lower(trim(coalesce(v_row->>'client_email',''))),'');
      v_phone_norm:=private.beauty_import_normalize_phone(v_row->>'client_phone');
      v_first_name:=nullif(trim(coalesce(v_row->>'client_first_name','')),'');
      v_last_name:=nullif(trim(coalesce(v_row->>'client_last_name','')),'');
      v_service_name:=nullif(trim(coalesce(v_row->>'service_name','')),'');
      v_staff_name:=nullif(trim(coalesce(v_row->>'staff_name','')),'');
      v_site_name:=nullif(trim(coalesce(v_row->>'site_name','')),'');
      v_starts_at:=private.beauty_import_parse_timestamp(v_row->>'starts_at',v_timezone);

      if v_external_id is not null and exists(
        select 1 from public.beauty_import_external_refs r
        where r.organization_id=p_organization_id and r.company_id=p_company_id
          and r.source_provider=p_source_provider and r.entity_type='appointment'
          and r.external_id=v_external_id
      ) then v_skipped:=v_skipped+1; continue; end if;

      if v_starts_at is null then raise exception 'Date ou heure invalide.'; end if;
      if v_service_name is null then raise exception 'Prestation manquante.'; end if;

      if v_email is not null then
        select id into v_email_id from public.clients
        where organization_id=p_organization_id and company_id=p_company_id
          and lower(coalesce(email,''))=v_email and status='active'
        order by created_at limit 1;
      end if;
      if v_phone_norm is not null then
        select id into v_phone_id from public.clients
        where organization_id=p_organization_id and company_id=p_company_id
          and private.beauty_import_normalize_phone(phone)=v_phone_norm and status='active'
        order by created_at limit 1;
      end if;
      if v_email_id is not null and v_phone_id is not null and v_email_id<>v_phone_id then
        raise exception 'Conflit client : e-mail et téléphone différents.';
      end if;
      v_client_id:=coalesce(v_email_id,v_phone_id);
      if v_client_id is null and v_first_name is not null then
        select count(*)::int,min(id::text)::uuid into v_name_count,v_name_id
        from public.clients
        where organization_id=p_organization_id and company_id=p_company_id and status='active'
          and lower(trim(first_name))=lower(v_first_name)
          and lower(trim(coalesce(last_name,'')))=lower(trim(coalesce(v_last_name,'')));
        if v_name_count=1 then v_client_id:=v_name_id; end if;
      end if;
      if v_client_id is null then raise exception 'Cliente introuvable ou ambiguë.'; end if;

      select count(*)::int,min(id::text)::uuid,min(duration_minutes),min(price_cents)
      into v_service_count,v_service_id,v_service_duration,v_service_price
      from public.services
      where organization_id=p_organization_id and company_id=p_company_id and active=true
        and lower(trim(name))=lower(v_service_name);
      if v_service_count<>1 then raise exception 'Prestation introuvable ou ambiguë.'; end if;

      if v_staff_name is not null then
        select count(*)::int,min(id::text)::uuid into v_staff_count,v_staff_id from public.staff
        where organization_id=p_organization_id and company_id=p_company_id and active=true
          and lower(trim(display_name))=lower(v_staff_name);
      else
        select count(*)::int,min(id::text)::uuid into v_staff_count,v_staff_id from public.staff
        where organization_id=p_organization_id and company_id=p_company_id and active=true;
      end if;
      if v_staff_count<>1 then raise exception 'Collaborateur introuvable ou ambigu.'; end if;

      if v_site_name is not null then
        select count(*)::int,min(id::text)::uuid into v_site_count,v_site_id from public.organization_sites
        where organization_id=p_organization_id and company_id=p_company_id and status='active'
          and lower(trim(name))=lower(v_site_name);
      else
        select count(*)::int,min(id::text)::uuid into v_site_count,v_site_id from public.organization_sites
        where organization_id=p_organization_id and company_id=p_company_id and status='active';
      end if;
      if v_site_count<>1 then raise exception 'Établissement introuvable ou ambigu.'; end if;

      begin v_duration:=coalesce(nullif(trim(coalesce(v_row->>'duration_minutes','')),'')::integer,v_service_duration,30);
      exception when others then v_duration:=v_service_duration; end;
      v_duration:=greatest(5,least(720,coalesce(v_duration,30)));
      v_ends_at:=v_starts_at+make_interval(mins=>v_duration);
      v_appt_status:=private.beauty_import_map_status(v_row->>'status',v_starts_at);
      begin v_amount:=coalesce(nullif(trim(coalesce(v_row->>'amount_cents','')),'')::integer,v_service_price,0);
      exception when others then v_amount:=coalesce(v_service_price,0); end;
      v_amount:=greatest(0,v_amount);

      if exists(
        select 1 from public.appointments a
        where a.organization_id=p_organization_id and a.company_id=p_company_id
          and a.client_id=v_client_id and a.service_id=v_service_id and a.starts_at=v_starts_at
      ) then v_skipped:=v_skipped+1; continue; end if;

      insert into public.appointments(
        organization_id,company_id,site_id,client_id,service_id,staff_id,starts_at,ends_at,status,
        notes,amount_cents,source,created_by,booking_origin,booking_origin_detail,booking_origin_meta
      ) values(
        p_organization_id,p_company_id,v_site_id,v_client_id,v_service_id,v_staff_id,v_starts_at,v_ends_at,
        v_appt_status,nullif(trim(coalesce(v_row->>'notes','')),''),v_amount,'internal',auth.uid(),'import',
        case p_source_provider when 'planity' then 'Import Planity' when 'booksy' then 'Import Booksy'
          when 'treatwell' then 'Import Treatwell' else 'Import CSV' end,
        jsonb_build_object('source_provider',p_source_provider,'import_job_id',v_job_id)
      ) returning id into v_appointment_id;

      insert into public.appointment_service_items(
        organization_id,company_id,appointment_id,service_id,staff_id,position,service_name,
        duration_minutes,price_cents,buffer_before_minutes,buffer_after_minutes,starts_at,ends_at
      )
      select p_organization_id,p_company_id,v_appointment_id,s.id,v_staff_id,1,s.name,v_duration,v_amount,0,0,v_starts_at,v_ends_at
      from public.services s
      where s.id=v_service_id and s.organization_id=p_organization_id and s.company_id=p_company_id;

      delete from public.notification_events
      where organization_id=p_organization_id and entity_type='appointment' and entity_id=v_appointment_id::text;

      delete from public.email_outbox
      where organization_id=p_organization_id and appointment_id=v_appointment_id;

      if v_external_id is not null then
        insert into public.beauty_import_external_refs(
          organization_id,company_id,import_job_id,source_provider,entity_type,external_id,local_id
        ) values(p_organization_id,p_company_id,v_job_id,p_source_provider,'appointment',v_external_id,v_appointment_id)
        on conflict(organization_id,company_id,source_provider,entity_type,external_id) do nothing;
      end if;

      v_inserted:=v_inserted+1;
    exception when others then
      v_errors:=v_errors||jsonb_build_array(jsonb_build_object('line',v_line,'message',sqlerrm));
    end;
  end loop;

  perform set_config('ncr.beauty_history_import',v_previous_guard,true);

  v_status_final:=case when jsonb_array_length(v_errors)=0 then 'completed'
    when v_inserted>0 or v_skipped>0 then 'completed_with_errors' else 'failed' end;

  update public.organization_import_jobs
  set status=v_status_final,inserted_rows=v_inserted,skipped_rows=v_skipped,
      error_rows=jsonb_array_length(v_errors),errors=v_errors,completed_at=now(),
      metadata=metadata||jsonb_build_object('inserted',v_inserted,'skipped',v_skipped,'errors',jsonb_array_length(v_errors))
  where id=v_job_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'beauty.appointments_imported','organization_import_job',v_job_id::text,
    jsonb_build_object('company_id',p_company_id,'source_provider',p_source_provider,
      'inserted',v_inserted,'skipped',v_skipped,'errors',jsonb_array_length(v_errors))
  );

  return jsonb_build_object(
    'job_id',v_job_id,'status',v_status_final,'total_rows',jsonb_array_length(p_rows),
    'inserted_rows',v_inserted,'skipped_rows',v_skipped,'error_rows',jsonb_array_length(v_errors),'errors',v_errors
  );
exception when others then
  perform set_config('ncr.beauty_history_import',coalesce(v_previous_guard,''),true);
  if v_job_id is not null then
    update public.organization_import_jobs
    set status='failed',error_rows=1,errors=jsonb_build_array(jsonb_build_object('message',sqlerrm)),completed_at=now()
    where id=v_job_id;
  end if;
  raise;
end;
$function$;

CREATE OR REPLACE FUNCTION private.beauty_import_map_status(p_value text, p_starts_at timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path = pg_catalog
AS $function$
declare
  v text:=lower(trim(coalesce(p_value,'')));
begin
  if v in ('completed','done','termine','terminé','realise','réalisé','realisee','réalisée') then return 'completed'; end if;
  if v in ('cancelled','canceled','annule','annulé','annulee','annulée') then return 'cancelled'; end if;
  if v in ('no_show','no-show','noshow','absent','absence') then return 'no_show'; end if;
  if v in ('pending','en attente','attente') then return 'pending'; end if;
  if v in ('confirmed','confirme','confirmé','confirmee','confirmée') then return 'confirmed'; end if;
  if p_starts_at is not null and p_starts_at<now() then return 'completed'; end if;
  return 'confirmed';
end;
$function$;

CREATE OR REPLACE FUNCTION private.beauty_import_parse_timestamp(p_value text, p_timezone text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE
 SET search_path = pg_catalog
AS $function$
declare
  v text:=nullif(trim(coalesce(p_value,'')),'');
begin
  if v is null then return null; end if;
  begin
    if v ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then
      return v::timestamptz;
    end if;
    return v::timestamp at time zone coalesce(nullif(trim(p_timezone),''),'Europe/Paris');
  exception when others then
    return null;
  end;
end;
$function$;

CREATE OR REPLACE FUNCTION private.beauty_preview_appointment_import(p_organization_id uuid, p_company_id uuid, p_source_provider text, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
declare
  v_timezone text;
  v_row jsonb;
  v_line integer:=1;
  v_items jsonb:='[]'::jsonb;
  v_ready integer:=0;
  v_duplicate integer:=0;
  v_unresolved integer:=0;
  v_conflict integer:=0;
  v_invalid integer:=0;
  v_client_id uuid;
  v_email_id uuid;
  v_phone_id uuid;
  v_name_id uuid;
  v_name_count integer;
  v_service_id uuid;
  v_service_count integer;
  v_service_duration integer;
  v_service_price integer;
  v_staff_id uuid;
  v_staff_count integer;
  v_site_id uuid;
  v_site_count integer;
  v_starts_at timestamptz;
  v_duration integer;
  v_ends_at timestamptz;
  v_status text;
  v_amount integer;
  v_external_id text;
  v_reason text;
  v_result_status text;
  v_email text;
  v_phone_norm text;
  v_first_name text;
  v_last_name text;
  v_service_name text;
  v_staff_name text;
  v_site_name text;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour prévisualiser les rendez-vous.';
  end if;
  if p_source_provider not in ('planity','booksy','treatwell','csv') then raise exception 'Source d import invalide.'; end if;
  if jsonb_typeof(p_rows)<>'array' then raise exception 'Données d import invalides.'; end if;
  if jsonb_array_length(p_rows)<1 or jsonb_array_length(p_rows)>5000 then
    raise exception 'L import doit contenir entre 1 et 5 000 lignes.';
  end if;

  select o.timezone into v_timezone
  from public.organization_companies c
  join public.organizations o on o.id=c.organization_id
  where c.id=p_company_id and c.organization_id=p_organization_id and c.status='active'
    and o.business_type='coiffure' and o.plan='metier';
  if v_timezone is null then raise exception 'Enseigne Beauty introuvable.'; end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_line:=v_line+1;
    v_client_id:=null; v_email_id:=null; v_phone_id:=null; v_name_id:=null; v_name_count:=0;
    v_service_id:=null; v_service_count:=0; v_service_duration:=null; v_service_price:=null;
    v_staff_id:=null; v_staff_count:=0; v_site_id:=null; v_site_count:=0;
    v_starts_at:=null; v_duration:=null; v_ends_at:=null; v_amount:=null;
    v_reason:=null; v_result_status:='ready'; v_status:=null;

    v_external_id:=nullif(trim(coalesce(v_row->>'external_id','')),'');
    v_email:=nullif(lower(trim(coalesce(v_row->>'client_email',''))),'');
    v_phone_norm:=private.beauty_import_normalize_phone(v_row->>'client_phone');
    v_first_name:=nullif(trim(coalesce(v_row->>'client_first_name','')),'');
    v_last_name:=nullif(trim(coalesce(v_row->>'client_last_name','')),'');
    v_service_name:=nullif(trim(coalesce(v_row->>'service_name','')),'');
    v_staff_name:=nullif(trim(coalesce(v_row->>'staff_name','')),'');
    v_site_name:=nullif(trim(coalesce(v_row->>'site_name','')),'');
    v_starts_at:=private.beauty_import_parse_timestamp(v_row->>'starts_at',v_timezone);

    if v_external_id is not null and exists(
      select 1 from public.beauty_import_external_refs r
      where r.organization_id=p_organization_id and r.company_id=p_company_id
        and r.source_provider=p_source_provider and r.entity_type='appointment'
        and r.external_id=v_external_id
    ) then
      v_result_status:='duplicate';
      v_reason:='Cet identifiant de rendez-vous a déjà été importé.';
    end if;

    if v_result_status='ready' and v_starts_at is null then
      v_result_status:='invalid'; v_reason:='Date ou heure invalide.';
    end if;
    if v_result_status='ready' and v_service_name is null then
      v_result_status:='invalid'; v_reason:='Prestation manquante.';
    end if;

    if v_result_status='ready' then
      if v_email is not null then
        select id into v_email_id from public.clients
        where organization_id=p_organization_id and company_id=p_company_id
          and lower(coalesce(email,''))=v_email and status='active'
        order by created_at limit 1;
      end if;
      if v_phone_norm is not null then
        select id into v_phone_id from public.clients
        where organization_id=p_organization_id and company_id=p_company_id
          and private.beauty_import_normalize_phone(phone)=v_phone_norm and status='active'
        order by created_at limit 1;
      end if;

      if v_email_id is not null and v_phone_id is not null and v_email_id<>v_phone_id then
        v_result_status:='conflict';
        v_reason:='L e-mail et le téléphone correspondent à deux clientes différentes.';
      else
        v_client_id:=coalesce(v_email_id,v_phone_id);
        if v_client_id is null and v_first_name is not null then
          select count(*)::int,min(id::text)::uuid into v_name_count,v_name_id
          from public.clients
          where organization_id=p_organization_id and company_id=p_company_id and status='active'
            and lower(trim(first_name))=lower(v_first_name)
            and lower(trim(coalesce(last_name,'')))=lower(trim(coalesce(v_last_name,'')));
          if v_name_count=1 then v_client_id:=v_name_id;
          elsif v_name_count>1 then
            v_result_status:='unresolved'; v_reason:='Plusieurs clientes portent ce nom.';
          end if;
        end if;
        if v_result_status='ready' and v_client_id is null then
          v_result_status:='unresolved';
          v_reason:='Cliente introuvable. Importez ou corrigez d abord le fichier clients.';
        end if;
      end if;
    end if;

    if v_result_status='ready' then
      select count(*)::int,min(id::text)::uuid,min(duration_minutes),min(price_cents)
      into v_service_count,v_service_id,v_service_duration,v_service_price
      from public.services
      where organization_id=p_organization_id and company_id=p_company_id and active=true
        and lower(trim(name))=lower(v_service_name);
      if v_service_count<>1 then
        v_result_status:='unresolved';
        v_reason:=case when v_service_count=0 then 'Prestation introuvable dans cette enseigne.' else 'Plusieurs prestations portent ce nom.' end;
      end if;
    end if;

    if v_result_status='ready' then
      if v_staff_name is not null then
        select count(*)::int,min(id::text)::uuid into v_staff_count,v_staff_id
        from public.staff
        where organization_id=p_organization_id and company_id=p_company_id and active=true
          and lower(trim(display_name))=lower(v_staff_name);
      else
        select count(*)::int,min(id::text)::uuid into v_staff_count,v_staff_id
        from public.staff
        where organization_id=p_organization_id and company_id=p_company_id and active=true;
      end if;
      if v_staff_count<>1 then
        v_result_status:='unresolved';
        v_reason:=case when v_staff_name is null then 'Collaborateur non renseigné et plusieurs collaborateurs sont disponibles.'
          when v_staff_count=0 then 'Collaborateur introuvable dans cette enseigne.'
          else 'Plusieurs collaborateurs portent ce nom.' end;
      end if;
    end if;

    if v_result_status='ready' then
      if v_site_name is not null then
        select count(*)::int,min(id::text)::uuid into v_site_count,v_site_id
        from public.organization_sites
        where organization_id=p_organization_id and company_id=p_company_id and status='active'
          and lower(trim(name))=lower(v_site_name);
      else
        select count(*)::int,min(id::text)::uuid into v_site_count,v_site_id
        from public.organization_sites
        where organization_id=p_organization_id and company_id=p_company_id and status='active';
      end if;
      if v_site_count<>1 then
        v_result_status:='unresolved';
        v_reason:=case when v_site_name is null then 'Établissement non renseigné et plusieurs établissements sont disponibles.'
          when v_site_count=0 then 'Établissement introuvable dans cette enseigne.'
          else 'Plusieurs établissements portent ce nom.' end;
      end if;
    end if;

    if v_result_status='ready' then
      begin
        v_duration:=coalesce(nullif(trim(coalesce(v_row->>'duration_minutes','')),'')::integer,v_service_duration,30);
      exception when others then v_duration:=v_service_duration; end;
      v_duration:=greatest(5,least(720,coalesce(v_duration,30)));
      v_ends_at:=v_starts_at+make_interval(mins=>v_duration);
      v_status:=private.beauty_import_map_status(v_row->>'status',v_starts_at);
      begin
        v_amount:=coalesce(nullif(trim(coalesce(v_row->>'amount_cents','')),'')::integer,v_service_price,0);
      exception when others then v_amount:=coalesce(v_service_price,0); end;
      v_amount:=greatest(0,v_amount);

      if exists(
        select 1 from public.appointments a
        where a.organization_id=p_organization_id and a.company_id=p_company_id
          and a.client_id=v_client_id and a.service_id=v_service_id and a.starts_at=v_starts_at
      ) then
        v_result_status:='duplicate'; v_reason:='Un rendez-vous identique existe déjà.';
      elsif v_status<>'cancelled' and exists(
        select 1 from public.appointments a
        where a.organization_id=p_organization_id and a.company_id=p_company_id
          and a.staff_id=v_staff_id and a.status<>'cancelled'
          and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(v_starts_at,v_ends_at,'[)')
      ) then
        v_result_status:='conflict';
        v_reason:='Le collaborateur possède déjà un rendez-vous sur ce créneau.';
      end if;
    end if;

    if v_result_status='ready' then v_ready:=v_ready+1;
    elsif v_result_status='duplicate' then v_duplicate:=v_duplicate+1;
    elsif v_result_status='unresolved' then v_unresolved:=v_unresolved+1;
    elsif v_result_status='conflict' then v_conflict:=v_conflict+1;
    else v_invalid:=v_invalid+1;
    end if;

    v_items:=v_items||jsonb_build_array(jsonb_build_object(
      'line',v_line,'status',v_result_status,'reason',coalesce(v_reason,'Prêt à être importé.'),
      'external_id',v_external_id,'client_name',trim(concat_ws(' ',v_first_name,v_last_name)),
      'service_name',v_service_name,'staff_name',v_staff_name,'site_name',v_site_name,
      'starts_at',v_starts_at,'duration_minutes',v_duration,'appointment_status',v_status,
      'amount_cents',v_amount,'resolved_client_id',v_client_id,'resolved_service_id',v_service_id,
      'resolved_staff_id',v_staff_id,'resolved_site_id',v_site_id
    ));
  end loop;

  return jsonb_build_object(
    'total_rows',jsonb_array_length(p_rows),'ready_rows',v_ready,'duplicate_rows',v_duplicate,
    'unresolved_rows',v_unresolved,'conflict_rows',v_conflict,'invalid_rows',v_invalid,'items',v_items
  );
end;
$function$;
