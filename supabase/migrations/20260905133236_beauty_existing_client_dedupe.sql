CREATE OR REPLACE FUNCTION private.beauty_client_duplicate_candidates(p_organization_id uuid, p_company_id uuid)
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
    raise exception 'Droits insuffisants pour analyser les doublons.';
  end if;

  with base as (
    select
      c.*,
      nullif(lower(trim(coalesce(c.email,''))),'') as email_norm,
      private.beauty_import_normalize_phone(c.phone) as phone_norm,
      lower(trim(c.first_name)) as first_norm,
      lower(trim(coalesce(c.last_name,''))) as last_norm,
      (
        (case when nullif(trim(coalesce(c.email,'')),'') is not null then 1 else 0 end)
        +(case when nullif(trim(coalesce(c.phone,'')),'') is not null then 1 else 0 end)
        +(case when c.birth_date is not null then 1 else 0 end)
        +(case when nullif(trim(coalesce(c.notes,'')),'') is not null then 1 else 0 end)
        +(case when exists(
          select 1 from public.beauty_client_profiles p
          where p.organization_id=p_organization_id and p.company_id=p_company_id and p.client_id=c.id
        ) then 2 else 0 end)
        +(case when exists(
          select 1 from public.coiffure_client_portal_accounts a
          where a.organization_id=p_organization_id and a.client_id=c.id and a.status='active'
        ) then 2 else 0 end)
      )::int as data_score
    from public.clients c
    where c.organization_id=p_organization_id
      and c.company_id=p_company_id
      and c.status='active'
  ),
  stats as (
    select
      b.*,
      coalesce(a.appointment_count,0)::int as appointment_count,
      coalesce(a.completed_count,0)::int as completed_count,
      coalesce(a.spent_cents,0)::bigint as spent_cents
    from base b
    left join lateral (
      select
        count(*)::int as appointment_count,
        count(*) filter(where ap.status='completed')::int as completed_count,
        coalesce(sum(ap.amount_cents) filter(where ap.status='completed'),0)::bigint as spent_cents
      from public.appointments ap
      where ap.organization_id=p_organization_id
        and ap.company_id=p_company_id
        and ap.client_id=b.id
    ) a on true
  ),
  pairs as (
    select
      a.id as a_id,b.id as b_id,
      (a.email_norm is not null and a.email_norm=b.email_norm) as email_match,
      (a.phone_norm is not null and a.phone_norm=b.phone_norm) as phone_match,
      (a.first_norm=b.first_norm and a.last_norm=b.last_norm) as name_match,
      (a.birth_date is not null and a.birth_date=b.birth_date) as birth_match,
      a.first_name as a_first_name,a.last_name as a_last_name,a.email as a_email,a.phone as a_phone,a.birth_date as a_birth_date,
      a.appointment_count as a_appointment_count,a.completed_count as a_completed_count,a.spent_cents as a_spent_cents,
      a.data_score as a_data_score,a.created_at as a_created_at,
      b.first_name as b_first_name,b.last_name as b_last_name,b.email as b_email,b.phone as b_phone,b.birth_date as b_birth_date,
      b.appointment_count as b_appointment_count,b.completed_count as b_completed_count,b.spent_cents as b_spent_cents,
      b.data_score as b_data_score,b.created_at as b_created_at,
      (
        (case when a.email_norm is not null and a.email_norm=b.email_norm then 100 else 0 end)
        +(case when a.phone_norm is not null and a.phone_norm=b.phone_norm then 90 else 0 end)
        +(case when a.first_norm=b.first_norm and a.last_norm=b.last_norm then 30 else 0 end)
        +(case when a.birth_date is not null and a.birth_date=b.birth_date then 20 else 0 end)
      )::int as match_score
    from stats a
    join stats b on a.id<b.id
    where
      (a.email_norm is not null and a.email_norm=b.email_norm)
      or (a.phone_norm is not null and a.phone_norm=b.phone_norm)
      or (a.first_norm=b.first_norm and a.last_norm=b.last_norm)
  ),
  ranked as (
    select *,
      case
        when a_appointment_count>b_appointment_count then a_id
        when b_appointment_count>a_appointment_count then b_id
        when a_data_score>b_data_score then a_id
        when b_data_score>a_data_score then b_id
        when a_created_at<=b_created_at then a_id
        else b_id
      end as recommended_keep_id
    from pairs
    order by match_score desc,greatest(a_appointment_count,b_appointment_count) desc
    limit 100
  )
  select jsonb_build_object(
    'candidate_count',count(*)::int,
    'items',coalesce(jsonb_agg(jsonb_build_object(
      'client_a',jsonb_build_object(
        'id',a_id,'first_name',a_first_name,'last_name',a_last_name,'email',a_email,'phone',a_phone,'birth_date',a_birth_date,
        'appointment_count',a_appointment_count,'completed_count',a_completed_count,'spent_cents',a_spent_cents,
        'data_score',a_data_score,'created_at',a_created_at
      ),
      'client_b',jsonb_build_object(
        'id',b_id,'first_name',b_first_name,'last_name',b_last_name,'email',b_email,'phone',b_phone,'birth_date',b_birth_date,
        'appointment_count',b_appointment_count,'completed_count',b_completed_count,'spent_cents',b_spent_cents,
        'data_score',b_data_score,'created_at',b_created_at
      ),
      'email_match',email_match,
      'phone_match',phone_match,
      'name_match',name_match,
      'birth_match',birth_match,
      'match_score',match_score,
      'strength',case when email_match or phone_match then 'strong' else 'review' end,
      'recommended_keep_id',recommended_keep_id
    ) order by match_score desc,greatest(a_appointment_count,b_appointment_count) desc),'[]'::jsonb)
  )
  into v_result
  from ranked;

  return v_result;
end;
$function$


CREATE OR REPLACE FUNCTION private.beauty_merge_clients(p_organization_id uuid, p_company_id uuid, p_keep_client_id uuid, p_merge_client_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
declare
  v_keep public.clients%rowtype;
  v_source public.clients%rowtype;
  v_email_match boolean;
  v_phone_match boolean;
  v_name_match boolean;
  v_source_profile_id uuid;
  v_keep_profile_id uuid;
  v_source_code_id uuid;
  v_keep_code_id uuid;
  v_previous_guard text;
  v_appointments integer:=0;
  v_notes integer:=0;
  v_media integer:=0;
  v_documents integer:=0;
  v_consents integer:=0;
  v_questionnaires integer:=0;
  v_loyalty_rows integer:=0;
  v_rewards integer:=0;
  v_waitlist integer:=0;
  v_reviews integer:=0;
  v_portal_accounts integer:=0;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour fusionner des clientes.';
  end if;

  if p_keep_client_id=p_merge_client_id then raise exception 'Les deux fiches doivent être différentes.'; end if;

  select * into v_keep from public.clients
  where id=p_keep_client_id and organization_id=p_organization_id and company_id=p_company_id and status='active'
  for update;

  select * into v_source from public.clients
  where id=p_merge_client_id and organization_id=p_organization_id and company_id=p_company_id and status='active'
  for update;

  if v_keep.id is null or v_source.id is null then
    raise exception 'Une des fiches clientes est introuvable dans cette enseigne.';
  end if;

  v_email_match:=nullif(lower(trim(coalesce(v_keep.email,''))),'') is not null
    and lower(trim(v_keep.email))=lower(trim(coalesce(v_source.email,'')));
  v_phone_match:=private.beauty_import_normalize_phone(v_keep.phone) is not null
    and private.beauty_import_normalize_phone(v_keep.phone)=private.beauty_import_normalize_phone(v_source.phone);
  v_name_match:=lower(trim(v_keep.first_name))=lower(trim(v_source.first_name))
    and lower(trim(coalesce(v_keep.last_name,'')))=lower(trim(coalesce(v_source.last_name,'')));

  if not (v_email_match or v_phone_match or v_name_match) then
    raise exception 'Ces deux fiches ne partagent aucun signal de doublon vérifiable.';
  end if;

  if exists(
    select 1 from public.beauty_referrals r
    where r.organization_id=p_organization_id and r.company_id=p_company_id and r.referred_client_id=p_keep_client_id
  ) and exists(
    select 1 from public.beauty_referrals r
    where r.organization_id=p_organization_id and r.company_id=p_company_id and r.referred_client_id=p_merge_client_id
  ) then
    raise exception 'Fusion bloquée : les deux fiches ont déjà un parrainage en tant que cliente fille.';
  end if;

  select id into v_source_code_id from public.beauty_referral_codes
  where organization_id=p_organization_id and company_id=p_company_id and client_id=p_merge_client_id limit 1;

  select id into v_keep_code_id from public.beauty_referral_codes
  where organization_id=p_organization_id and company_id=p_company_id and client_id=p_keep_client_id limit 1;

  if v_source_code_id is not null and v_keep_code_id is not null and exists(
    select 1 from public.beauty_referrals
    where organization_id=p_organization_id and company_id=p_company_id and referral_code_id=v_source_code_id
  ) then
    raise exception 'Fusion bloquée : les deux fiches possèdent un code de parrainage utilisé.';
  end if;

  update public.clients c
  set last_name=case when nullif(trim(coalesce(c.last_name,'')),'') is null then v_source.last_name else c.last_name end,
      email=case when nullif(trim(coalesce(c.email,'')),'') is null then v_source.email else c.email end,
      phone=case when nullif(trim(coalesce(c.phone,'')),'') is null then v_source.phone else c.phone end,
      birth_date=coalesce(c.birth_date,v_source.birth_date),
      notes=case
        when nullif(trim(coalesce(c.notes,'')),'') is null then v_source.notes
        when nullif(trim(coalesce(v_source.notes,'')),'') is null then c.notes
        when trim(c.notes)=trim(v_source.notes) then c.notes
        else c.notes||E'\n\n[Fusion ancienne fiche]\n'||v_source.notes
      end,
      updated_at=now()
  where c.id=p_keep_client_id and c.organization_id=p_organization_id and c.company_id=p_company_id;

  select id into v_source_profile_id from public.beauty_client_profiles
  where organization_id=p_organization_id and company_id=p_company_id and client_id=p_merge_client_id limit 1;
  select id into v_keep_profile_id from public.beauty_client_profiles
  where organization_id=p_organization_id and company_id=p_company_id and client_id=p_keep_client_id limit 1;

  if v_source_profile_id is not null and v_keep_profile_id is not null then
    update public.beauty_client_profiles target
    set technical_notes=case
          when nullif(trim(coalesce(target.technical_notes,'')),'') is null then source.technical_notes
          when nullif(trim(coalesce(source.technical_notes,'')),'') is null or trim(target.technical_notes)=trim(source.technical_notes) then target.technical_notes
          else target.technical_notes||E'\n\n'||source.technical_notes
        end,
        preferences=case
          when nullif(trim(coalesce(target.preferences,'')),'') is null then source.preferences
          when nullif(trim(coalesce(source.preferences,'')),'') is null or trim(target.preferences)=trim(source.preferences) then target.preferences
          else target.preferences||E'\n\n'||source.preferences
        end,
        contraindications=case
          when nullif(trim(coalesce(target.contraindications,'')),'') is null then source.contraindications
          when nullif(trim(coalesce(source.contraindications,'')),'') is null or trim(target.contraindications)=trim(source.contraindications) then target.contraindications
          else target.contraindications||E'\n\n'||source.contraindications
        end,
        custom_fields=coalesce(source.custom_fields,'{}'::jsonb)||coalesce(target.custom_fields,'{}'::jsonb),
        updated_by=auth.uid(),updated_at=now()
    from public.beauty_client_profiles source
    where target.id=v_keep_profile_id and source.id=v_source_profile_id;
    delete from public.beauty_client_profiles where id=v_source_profile_id;
  elsif v_source_profile_id is not null then
    update public.beauty_client_profiles
    set client_id=p_keep_client_id,updated_by=auth.uid(),updated_at=now()
    where id=v_source_profile_id;
  end if;

  update public.beauty_client_notes set client_id=p_keep_client_id where client_id=p_merge_client_id and organization_id=p_organization_id and company_id=p_company_id;
  get diagnostics v_notes=row_count;
  update public.beauty_client_media set client_id=p_keep_client_id where client_id=p_merge_client_id and organization_id=p_organization_id and company_id=p_company_id;
  get diagnostics v_media=row_count;
  update public.beauty_client_documents set client_id=p_keep_client_id where client_id=p_merge_client_id and organization_id=p_organization_id and company_id=p_company_id;
  get diagnostics v_documents=row_count;
  update public.beauty_client_consents set client_id=p_keep_client_id where client_id=p_merge_client_id and organization_id=p_organization_id and company_id=p_company_id;
  get diagnostics v_consents=row_count;
  update public.beauty_client_questionnaire_responses set client_id=p_keep_client_id where client_id=p_merge_client_id and organization_id=p_organization_id and company_id=p_company_id;
  get diagnostics v_questionnaires=row_count;
  update public.beauty_waitlist_entries set client_id=p_keep_client_id where client_id=p_merge_client_id and organization_id=p_organization_id and company_id=p_company_id;
  get diagnostics v_waitlist=row_count;
  update public.coiffure_company_reviews set client_id=p_keep_client_id where client_id=p_merge_client_id and organization_id=p_organization_id and company_id=p_company_id;
  get diagnostics v_reviews=row_count;

  if v_source_code_id is not null then
    if v_keep_code_id is null then
      update public.beauty_referral_codes set client_id=p_keep_client_id where id=v_source_code_id;
      v_keep_code_id:=v_source_code_id;
    else
      delete from public.beauty_referral_codes where id=v_source_code_id;
    end if;
  end if;

  update public.beauty_referrals
  set referrer_client_id=p_keep_client_id,referral_code_id=coalesce(v_keep_code_id,referral_code_id),updated_at=now()
  where organization_id=p_organization_id and company_id=p_company_id and referrer_client_id=p_merge_client_id;

  update public.beauty_referrals
  set referred_client_id=p_keep_client_id,updated_at=now()
  where organization_id=p_organization_id and company_id=p_company_id and referred_client_id=p_merge_client_id;

  update public.coiffure_client_portal_accounts target
  set status=case when target.status='active' or source.status<>'active' then target.status else source.status end,
      display_name=coalesce(target.display_name,source.display_name),
      last_seen_at=greatest(target.last_seen_at,source.last_seen_at),
      updated_at=now()
  from public.coiffure_client_portal_accounts source
  where target.organization_id=p_organization_id
    and target.client_id=p_keep_client_id
    and source.organization_id=p_organization_id
    and source.client_id=p_merge_client_id
    and target.user_id=source.user_id;

  delete from public.coiffure_client_portal_accounts source
  where source.organization_id=p_organization_id and source.client_id=p_merge_client_id
    and exists(
      select 1 from public.coiffure_client_portal_accounts target
      where target.organization_id=p_organization_id and target.client_id=p_keep_client_id and target.user_id=source.user_id
    );

  update public.coiffure_client_portal_accounts
  set client_id=p_keep_client_id,updated_at=now()
  where organization_id=p_organization_id and client_id=p_merge_client_id;
  get diagnostics v_portal_accounts=row_count;

  update public.coiffure_client_portal_invitations
  set client_id=p_keep_client_id,updated_at=now()
  where organization_id=p_organization_id and client_id=p_merge_client_id;

  v_previous_guard:=coalesce(current_setting('ncr.beauty_history_import',true),'');
  perform set_config('ncr.beauty_history_import','1',true);
  update public.appointments
  set client_id=p_keep_client_id
  where organization_id=p_organization_id and company_id=p_company_id and client_id=p_merge_client_id;
  get diagnostics v_appointments=row_count;
  perform set_config('ncr.beauty_history_import',v_previous_guard,true);

  update public.coiffure_appointment_loyalty_state
  set client_id=p_keep_client_id
  where organization_id=p_organization_id and company_id=p_company_id and client_id=p_merge_client_id;

  update public.coiffure_loyalty_ledger
  set client_id=p_keep_client_id
  where organization_id=p_organization_id and company_id=p_company_id and client_id=p_merge_client_id;
  get diagnostics v_loyalty_rows=row_count;

  update public.coiffure_loyalty_rewards
  set client_id=p_keep_client_id
  where organization_id=p_organization_id and company_id=p_company_id and client_id=p_merge_client_id;
  get diagnostics v_rewards=row_count;

  update public.beauty_import_external_refs
  set local_id=p_keep_client_id
  where organization_id=p_organization_id and company_id=p_company_id and entity_type='client' and local_id=p_merge_client_id;

  delete from public.clients
  where id=p_merge_client_id and organization_id=p_organization_id and company_id=p_company_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'beauty.client_merged','client',p_keep_client_id::text,
    jsonb_build_object(
      'company_id',p_company_id,'merged_client_id',p_merge_client_id,'appointments_moved',v_appointments,
      'notes_moved',v_notes,'media_moved',v_media,'documents_moved',v_documents,'consents_moved',v_consents,
      'questionnaires_moved',v_questionnaires,'waitlist_moved',v_waitlist,'reviews_moved',v_reviews,
      'loyalty_rows_moved',v_loyalty_rows,'rewards_moved',v_rewards,'portal_accounts_moved',v_portal_accounts
    )
  );

  return jsonb_build_object(
    'kept_client_id',p_keep_client_id,'merged_client_id',p_merge_client_id,'appointments_moved',v_appointments,
    'notes_moved',v_notes,'media_moved',v_media,'documents_moved',v_documents,'consents_moved',v_consents,
    'questionnaires_moved',v_questionnaires,'waitlist_moved',v_waitlist,'reviews_moved',v_reviews,
    'loyalty_rows_moved',v_loyalty_rows,'rewards_moved',v_rewards,'portal_accounts_moved',v_portal_accounts
  );

exception when others then
  perform set_config('ncr.beauty_history_import',coalesce(v_previous_guard,''),true);
  raise;
end;
$function$


CREATE OR REPLACE FUNCTION public.beauty_client_duplicate_candidates(p_organization_id uuid, p_company_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path = public,private,pg_catalog
AS $function$
  select private.beauty_client_duplicate_candidates(p_organization_id,p_company_id);
$function$


CREATE OR REPLACE FUNCTION public.beauty_merge_clients(p_organization_id uuid, p_company_id uuid, p_keep_client_id uuid, p_merge_client_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path = public,private,pg_catalog
AS $function$
  select private.beauty_merge_clients(p_organization_id,p_company_id,p_keep_client_id,p_merge_client_id);
$function$



revoke all on function private.beauty_client_duplicate_candidates(uuid,uuid) from public,anon;
grant execute on function private.beauty_client_duplicate_candidates(uuid,uuid) to authenticated,service_role;
revoke all on function public.beauty_client_duplicate_candidates(uuid,uuid) from public,anon;
grant execute on function public.beauty_client_duplicate_candidates(uuid,uuid) to authenticated,service_role;

revoke all on function private.beauty_merge_clients(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function private.beauty_merge_clients(uuid,uuid,uuid,uuid) to authenticated,service_role;
revoke all on function public.beauty_merge_clients(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.beauty_merge_clients(uuid,uuid,uuid,uuid) to authenticated,service_role;
