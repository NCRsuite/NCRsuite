CREATE OR REPLACE FUNCTION private.beauty_anonymize_client(p_organization_id uuid, p_company_id uuid, p_client_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
declare
  v_client public.clients%rowtype;
  v_future_count integer;
  v_notes integer:=0; v_profiles integer:=0; v_questionnaires integer:=0;
  v_media integer:=0; v_documents integer:=0; v_waitlist integer:=0;
  v_portal_accounts integer:=0; v_portal_invitations integer:=0; v_import_refs integer:=0;
  v_reviews_scrubbed integer:=0; v_appointments_scrubbed integer:=0; v_reason text;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour effectuer un effacement RGPD.';
  end if;

  v_reason:=left(nullif(trim(coalesce(p_reason,'')),''),500);
  if v_reason is null then raise exception 'Un motif d effacement est requis.'; end if;

  select * into v_client from public.clients c
  where c.id=p_client_id and c.organization_id=p_organization_id and c.company_id=p_company_id
  for update;
  if v_client.id is null then raise exception 'Cliente introuvable dans cette enseigne.'; end if;

  select count(*)::int into v_future_count from public.appointments a
  where a.organization_id=p_organization_id and a.company_id=p_company_id and a.client_id=p_client_id
    and a.status in ('pending','confirmed') and a.starts_at>=now();
  if v_future_count>0 then
    raise exception 'Effacement bloqué : % rendez-vous futur(s) actif(s) doivent d abord être annulés ou traités.',v_future_count;
  end if;

  delete from public.beauty_client_notes where organization_id=p_organization_id and company_id=p_company_id and client_id=p_client_id;
  get diagnostics v_notes=row_count;
  delete from public.beauty_client_profiles where organization_id=p_organization_id and company_id=p_company_id and client_id=p_client_id;
  get diagnostics v_profiles=row_count;
  delete from public.beauty_client_questionnaire_responses where organization_id=p_organization_id and company_id=p_company_id and client_id=p_client_id;
  get diagnostics v_questionnaires=row_count;
  delete from public.beauty_waitlist_entries where organization_id=p_organization_id and company_id=p_company_id and client_id=p_client_id;
  get diagnostics v_waitlist=row_count;
  delete from public.beauty_client_media where organization_id=p_organization_id and company_id=p_company_id and client_id=p_client_id;
  get diagnostics v_media=row_count;
  delete from public.beauty_client_documents where organization_id=p_organization_id and company_id=p_company_id and client_id=p_client_id;
  get diagnostics v_documents=row_count;
  delete from public.coiffure_client_portal_invitations where organization_id=p_organization_id and client_id=p_client_id;
  get diagnostics v_portal_invitations=row_count;
  delete from public.coiffure_client_portal_accounts where organization_id=p_organization_id and client_id=p_client_id;
  get diagnostics v_portal_accounts=row_count;
  delete from public.beauty_import_external_refs where organization_id=p_organization_id and company_id=p_company_id and entity_type='client' and local_id=p_client_id;
  get diagnostics v_import_refs=row_count;

  update public.beauty_referral_codes set active=false
  where organization_id=p_organization_id and company_id=p_company_id and client_id=p_client_id;

  update public.coiffure_company_reviews set comment=null,updated_at=now()
  where organization_id=p_organization_id and company_id=p_company_id and client_id=p_client_id;
  get diagnostics v_reviews_scrubbed=row_count;

  update public.appointments
  set notes=null,cancellation_reason=null,public_token=null,customer_manage_last_seen_at=null,
      booking_origin_meta='{}'::jsonb,updated_at=now()
  where organization_id=p_organization_id and company_id=p_company_id and client_id=p_client_id;
  get diagnostics v_appointments_scrubbed=row_count;

  update public.clients
  set first_name='Client supprimé',last_name=null,email=null,phone=null,notes=null,birth_date=null,
      loyalty_opt_in=false,birthday_consent=false,marketing_opt_in=false,status='archived',updated_at=now()
  where id=p_client_id and organization_id=p_organization_id and company_id=p_company_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'beauty.client_rgpd_anonymized','client',p_client_id::text,
    jsonb_build_object(
      'company_id',p_company_id,'client_id',p_client_id,'reason',v_reason,
      'appointments_preserved_and_scrubbed',v_appointments_scrubbed,'notes_deleted',v_notes,
      'profiles_deleted',v_profiles,'questionnaires_deleted',v_questionnaires,
      'media_metadata_deleted',v_media,'documents_metadata_deleted',v_documents,
      'waitlist_deleted',v_waitlist,'portal_accounts_deleted',v_portal_accounts,
      'portal_invitations_deleted',v_portal_invitations,'import_refs_deleted',v_import_refs,
      'reviews_scrubbed',v_reviews_scrubbed
    ));

  return jsonb_build_object(
    'client_id',p_client_id,'status','anonymized',
    'appointments_preserved_and_scrubbed',v_appointments_scrubbed,'notes_deleted',v_notes,
    'profiles_deleted',v_profiles,'questionnaires_deleted',v_questionnaires,
    'media_metadata_deleted',v_media,'documents_metadata_deleted',v_documents,
    'waitlist_deleted',v_waitlist,'portal_accounts_deleted',v_portal_accounts,
    'portal_invitations_deleted',v_portal_invitations,'import_refs_deleted',v_import_refs,
    'reviews_scrubbed',v_reviews_scrubbed
  );
end;
$function$


CREATE OR REPLACE FUNCTION private.beauty_client_data_export(p_organization_id uuid, p_company_id uuid, p_client_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
declare
  v_result jsonb;
  v_client public.clients%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour exporter cette fiche.';
  end if;

  select * into v_client from public.clients c
  where c.id=p_client_id and c.organization_id=p_organization_id and c.company_id=p_company_id;
  if v_client.id is null then raise exception 'Cliente introuvable dans cette enseigne.'; end if;

  select jsonb_build_object(
    'schema_version',1,'generated_at',now(),'purpose','Accès et portabilité des données personnelles',
    'company',(select jsonb_build_object('id',c.id,'name',c.name,'legal_name',c.legal_name,'siret',c.siret,'email',c.email,'phone',c.phone) from public.organization_companies c where c.id=p_company_id and c.organization_id=p_organization_id),
    'client',(to_jsonb(v_client)-'created_by'),
    'appointments',coalesce((
      select jsonb_agg(
        (to_jsonb(a)-'public_token'-'created_by')
        ||jsonb_build_object(
          'services',coalesce((select jsonb_agg(to_jsonb(i) order by i.position,i.id) from public.appointment_service_items i where i.appointment_id=a.id),'[]'::jsonb),
          'staff_name',(select s.display_name from public.staff s where s.id=a.staff_id),
          'service_name',(select s.name from public.services s where s.id=a.service_id)
        ) order by a.starts_at,a.id
      )
      from public.appointments a
      where a.organization_id=p_organization_id and a.company_id=p_company_id and a.client_id=p_client_id
    ),'[]'::jsonb),
    'profile',(select to_jsonb(p)-'updated_by' from public.beauty_client_profiles p where p.organization_id=p_organization_id and p.company_id=p_company_id and p.client_id=p_client_id limit 1),
    'notes',coalesce((select jsonb_agg((to_jsonb(n)-'created_by') order by n.created_at,n.id) from public.beauty_client_notes n where n.organization_id=p_organization_id and n.company_id=p_company_id and n.client_id=p_client_id),'[]'::jsonb),
    'questionnaires',coalesce((select jsonb_agg((to_jsonb(q)-'created_by') order by q.created_at,q.id) from public.beauty_client_questionnaire_responses q where q.organization_id=p_organization_id and q.company_id=p_company_id and q.client_id=p_client_id),'[]'::jsonb),
    'consents',coalesce((select jsonb_agg((to_jsonb(c)-'recorded_by') order by c.recorded_at,c.id) from public.beauty_client_consents c where c.organization_id=p_organization_id and c.company_id=p_company_id and c.client_id=p_client_id),'[]'::jsonb),
    'media',coalesce((select jsonb_agg((to_jsonb(m)-'storage_path'-'created_by') order by m.created_at,m.id) from public.beauty_client_media m where m.organization_id=p_organization_id and m.company_id=p_company_id and m.client_id=p_client_id),'[]'::jsonb),
    'documents',coalesce((select jsonb_agg((to_jsonb(d)-'storage_path'-'created_by') order by d.created_at,d.id) from public.beauty_client_documents d where d.organization_id=p_organization_id and d.company_id=p_company_id and d.client_id=p_client_id),'[]'::jsonb),
    'waitlist',coalesce((select jsonb_agg((to_jsonb(w)-'created_by') order by w.created_at,w.id) from public.beauty_waitlist_entries w where w.organization_id=p_organization_id and w.company_id=p_company_id and w.client_id=p_client_id),'[]'::jsonb),
    'reviews',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.coiffure_company_reviews r where r.organization_id=p_organization_id and r.company_id=p_company_id and r.client_id=p_client_id),'[]'::jsonb),
    'loyalty_ledger',coalesce((select jsonb_agg((to_jsonb(l)-'created_by') order by l.created_at,l.id) from public.coiffure_loyalty_ledger l where l.organization_id=p_organization_id and l.company_id=p_company_id and l.client_id=p_client_id),'[]'::jsonb),
    'loyalty_rewards',coalesce((select jsonb_agg((to_jsonb(r)-'created_by'-'redeemed_by') order by r.created_at,r.id) from public.coiffure_loyalty_rewards r where r.organization_id=p_organization_id and r.company_id=p_company_id and r.client_id=p_client_id),'[]'::jsonb),
    'referral_code',(select to_jsonb(r) from public.beauty_referral_codes r where r.organization_id=p_organization_id and r.company_id=p_company_id and r.client_id=p_client_id limit 1),
    'referrals',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.beauty_referrals r where r.organization_id=p_organization_id and r.company_id=p_company_id and (r.referrer_client_id=p_client_id or r.referred_client_id=p_client_id)),'[]'::jsonb),
    'portal_accounts',coalesce((select jsonb_agg((to_jsonb(a)-'user_id') order by a.created_at,a.id) from public.coiffure_client_portal_accounts a where a.organization_id=p_organization_id and a.client_id=p_client_id),'[]'::jsonb),
    'portal_invitations',coalesce((select jsonb_agg((to_jsonb(i)-'token_hash'-'accepted_by'-'invited_by') order by i.created_at,i.id) from public.coiffure_client_portal_invitations i where i.organization_id=p_organization_id and i.client_id=p_client_id),'[]'::jsonb)
  ) into v_result;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'beauty.data_export.client','client',p_client_id::text,
    jsonb_build_object('company_id',p_company_id,'client_id',p_client_id));
  return v_result;
end;
$function$


CREATE OR REPLACE FUNCTION private.beauty_client_erasure_preview(p_organization_id uuid, p_company_id uuid, p_client_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
declare
  v_client public.clients%rowtype;
  v_future_count integer;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour préparer un effacement RGPD.';
  end if;
  select * into v_client from public.clients c
  where c.id=p_client_id and c.organization_id=p_organization_id and c.company_id=p_company_id;
  if v_client.id is null then raise exception 'Cliente introuvable dans cette enseigne.'; end if;

  select count(*)::int into v_future_count from public.appointments a
  where a.organization_id=p_organization_id and a.company_id=p_company_id and a.client_id=p_client_id
    and a.status in ('pending','confirmed') and a.starts_at>=now();

  select jsonb_build_object(
    'client',jsonb_build_object('id',v_client.id,'first_name',v_client.first_name,'last_name',v_client.last_name,'email',v_client.email,'phone',v_client.phone,'status',v_client.status),
    'blocked',v_future_count>0,'future_appointments',v_future_count,
    'counts',jsonb_build_object(
      'appointments',(select count(*)::int from public.appointments a where a.organization_id=p_organization_id and a.company_id=p_company_id and a.client_id=p_client_id),
      'notes',(select count(*)::int from public.beauty_client_notes n where n.organization_id=p_organization_id and n.company_id=p_company_id and n.client_id=p_client_id),
      'profiles',(select count(*)::int from public.beauty_client_profiles p where p.organization_id=p_organization_id and p.company_id=p_company_id and p.client_id=p_client_id),
      'questionnaires',(select count(*)::int from public.beauty_client_questionnaire_responses q where q.organization_id=p_organization_id and q.company_id=p_company_id and q.client_id=p_client_id),
      'consents',(select count(*)::int from public.beauty_client_consents c where c.organization_id=p_organization_id and c.company_id=p_company_id and c.client_id=p_client_id),
      'media',(select count(*)::int from public.beauty_client_media m where m.organization_id=p_organization_id and m.company_id=p_company_id and m.client_id=p_client_id),
      'documents',(select count(*)::int from public.beauty_client_documents d where d.organization_id=p_organization_id and d.company_id=p_company_id and d.client_id=p_client_id),
      'waitlist',(select count(*)::int from public.beauty_waitlist_entries w where w.organization_id=p_organization_id and w.company_id=p_company_id and w.client_id=p_client_id),
      'reviews',(select count(*)::int from public.coiffure_company_reviews r where r.organization_id=p_organization_id and r.company_id=p_company_id and r.client_id=p_client_id),
      'portal_accounts',(select count(*)::int from public.coiffure_client_portal_accounts a where a.organization_id=p_organization_id and a.client_id=p_client_id),
      'portal_invitations',(select count(*)::int from public.coiffure_client_portal_invitations i where i.organization_id=p_organization_id and i.client_id=p_client_id)
    ),
    'media_paths',coalesce((select jsonb_agg(m.storage_path order by m.created_at,m.id) from public.beauty_client_media m where m.organization_id=p_organization_id and m.company_id=p_company_id and m.client_id=p_client_id),'[]'::jsonb),
    'document_paths',coalesce((select jsonb_agg(d.storage_path order by d.created_at,d.id) from public.beauty_client_documents d where d.organization_id=p_organization_id and d.company_id=p_company_id and d.client_id=p_client_id),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$function$


CREATE OR REPLACE FUNCTION private.beauty_company_data_export(p_organization_id uuid, p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
declare
  v_result jsonb;
  v_client_count integer;
  v_appointment_count integer;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour exporter les données.';
  end if;
  if not exists(
    select 1 from public.organization_companies c
    join public.organizations o on o.id=c.organization_id
    where c.id=p_company_id and c.organization_id=p_organization_id and c.status='active'
      and o.business_type='coiffure' and o.plan='metier'
  ) then raise exception 'Enseigne Beauty introuvable.'; end if;

  select count(*)::int into v_client_count from public.clients c
  where c.organization_id=p_organization_id and c.company_id=p_company_id;
  select count(*)::int into v_appointment_count from public.appointments a
  where a.organization_id=p_organization_id and a.company_id=p_company_id;

  select jsonb_build_object(
    'schema_version',1,
    'generated_at',now(),
    'organization_id',p_organization_id,
    'company',(select to_jsonb(c) from public.organization_companies c where c.id=p_company_id and c.organization_id=p_organization_id),
    'clients',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at,c.id) from public.clients c where c.organization_id=p_organization_id and c.company_id=p_company_id),'[]'::jsonb),
    'appointments',coalesce((select jsonb_agg((to_jsonb(a)-'public_token') order by a.starts_at,a.id) from public.appointments a where a.organization_id=p_organization_id and a.company_id=p_company_id),'[]'::jsonb),
    'appointment_service_items',coalesce((select jsonb_agg(to_jsonb(i) order by i.appointment_id,i.position,i.id) from public.appointment_service_items i where i.organization_id=p_organization_id and i.company_id=p_company_id),'[]'::jsonb),
    'services',coalesce((select jsonb_agg(to_jsonb(s) order by s.name,s.id) from public.services s where s.organization_id=p_organization_id and s.company_id=p_company_id),'[]'::jsonb),
    'staff_reference',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'display_name',s.display_name,'site_id',s.site_id,'company_id',s.company_id,'active',s.active,'color',s.color) order by s.display_name,s.id) from public.staff s where s.organization_id=p_organization_id and s.company_id=p_company_id),'[]'::jsonb),
    'consents',coalesce((select jsonb_agg(to_jsonb(c) order by c.recorded_at,c.id) from public.beauty_client_consents c where c.organization_id=p_organization_id and c.company_id=p_company_id),'[]'::jsonb),
    'client_profiles',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at,p.id) from public.beauty_client_profiles p where p.organization_id=p_organization_id and p.company_id=p_company_id),'[]'::jsonb),
    'client_notes',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at,n.id) from public.beauty_client_notes n where n.organization_id=p_organization_id and n.company_id=p_company_id),'[]'::jsonb),
    'questionnaires',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at,q.id) from public.beauty_client_questionnaire_responses q where q.organization_id=p_organization_id and q.company_id=p_company_id),'[]'::jsonb),
    'media_manifest',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at,m.id) from public.beauty_client_media m where m.organization_id=p_organization_id and m.company_id=p_company_id),'[]'::jsonb),
    'documents_manifest',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at,d.id) from public.beauty_client_documents d where d.organization_id=p_organization_id and d.company_id=p_company_id),'[]'::jsonb),
    'waitlist',coalesce((select jsonb_agg(to_jsonb(w) order by w.created_at,w.id) from public.beauty_waitlist_entries w where w.organization_id=p_organization_id and w.company_id=p_company_id),'[]'::jsonb),
    'reviews',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.coiffure_company_reviews r where r.organization_id=p_organization_id and r.company_id=p_company_id),'[]'::jsonb),
    'loyalty_ledger',coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at,l.id) from public.coiffure_loyalty_ledger l where l.organization_id=p_organization_id and l.company_id=p_company_id),'[]'::jsonb),
    'loyalty_rewards',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.coiffure_loyalty_rewards r where r.organization_id=p_organization_id and r.company_id=p_company_id),'[]'::jsonb),
    'referral_codes',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.beauty_referral_codes r where r.organization_id=p_organization_id and r.company_id=p_company_id),'[]'::jsonb),
    'referrals',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.beauty_referrals r where r.organization_id=p_organization_id and r.company_id=p_company_id),'[]'::jsonb),
    'portal_accounts',coalesce((select jsonb_agg((to_jsonb(a)-'user_id') order by a.created_at,a.id) from public.coiffure_client_portal_accounts a join public.clients c on c.id=a.client_id and c.organization_id=a.organization_id where a.organization_id=p_organization_id and c.company_id=p_company_id),'[]'::jsonb),
    'portal_invitations',coalesce((select jsonb_agg((to_jsonb(i)-'token_hash'-'accepted_by'-'invited_by') order by i.created_at,i.id) from public.coiffure_client_portal_invitations i join public.clients c on c.id=i.client_id and c.organization_id=i.organization_id where i.organization_id=p_organization_id and c.company_id=p_company_id),'[]'::jsonb),
    'import_references',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.beauty_import_external_refs r where r.organization_id=p_organization_id and r.company_id=p_company_id),'[]'::jsonb)
  ) into v_result;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'beauty.data_export.company','organization_company',p_company_id::text,
    jsonb_build_object('company_id',p_company_id,'client_count',v_client_count,'appointment_count',v_appointment_count));
  return v_result;
end;
$function$


CREATE OR REPLACE FUNCTION public.beauty_anonymize_client(p_organization_id uuid, p_company_id uuid, p_client_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path = public,private,pg_catalog
AS $function$
  select private.beauty_anonymize_client(p_organization_id,p_company_id,p_client_id,p_reason);
$function$


CREATE OR REPLACE FUNCTION public.beauty_client_data_export(p_organization_id uuid, p_company_id uuid, p_client_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path = public,private,pg_catalog
AS $function$
  select private.beauty_client_data_export(p_organization_id,p_company_id,p_client_id);
$function$


CREATE OR REPLACE FUNCTION public.beauty_client_erasure_preview(p_organization_id uuid, p_company_id uuid, p_client_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path = public,private,pg_catalog
AS $function$
  select private.beauty_client_erasure_preview(p_organization_id,p_company_id,p_client_id);
$function$


CREATE OR REPLACE FUNCTION public.beauty_company_data_export(p_organization_id uuid, p_company_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path = public,private,pg_catalog
AS $function$
  select private.beauty_company_data_export(p_organization_id,p_company_id);
$function$



revoke all on function private.beauty_company_data_export(uuid,uuid) from public,anon;
grant execute on function private.beauty_company_data_export(uuid,uuid) to authenticated,service_role;
revoke all on function public.beauty_company_data_export(uuid,uuid) from public,anon;
grant execute on function public.beauty_company_data_export(uuid,uuid) to authenticated,service_role;

revoke all on function private.beauty_client_data_export(uuid,uuid,uuid) from public,anon;
grant execute on function private.beauty_client_data_export(uuid,uuid,uuid) to authenticated,service_role;
revoke all on function public.beauty_client_data_export(uuid,uuid,uuid) from public,anon;
grant execute on function public.beauty_client_data_export(uuid,uuid,uuid) to authenticated,service_role;

revoke all on function private.beauty_client_erasure_preview(uuid,uuid,uuid) from public,anon;
grant execute on function private.beauty_client_erasure_preview(uuid,uuid,uuid) to authenticated,service_role;
revoke all on function public.beauty_client_erasure_preview(uuid,uuid,uuid) from public,anon;
grant execute on function public.beauty_client_erasure_preview(uuid,uuid,uuid) to authenticated,service_role;

revoke all on function private.beauty_anonymize_client(uuid,uuid,uuid,text) from public,anon;
grant execute on function private.beauty_anonymize_client(uuid,uuid,uuid,text) to authenticated,service_role;
revoke all on function public.beauty_anonymize_client(uuid,uuid,uuid,text) from public,anon;
grant execute on function public.beauty_anonymize_client(uuid,uuid,uuid,text) to authenticated,service_role;
