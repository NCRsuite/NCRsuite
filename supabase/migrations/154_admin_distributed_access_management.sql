-- NCR Suite V2.29.25 — gestion centrale des accès distribués par les entreprises.
-- La suppression retire uniquement le droit de connexion ciblé et conserve les données métier/historiques.

begin;

create or replace function public.admin_list_distributed_accesses()
returns table(
  access_type text,
  access_id uuid,
  organization_id uuid,
  organization_name text,
  business_type text,
  access_label text,
  display_name text,
  email text,
  user_id uuid,
  status text,
  created_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public,pg_catalog
as $$
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Accès réservé au super-administrateur NCR.';
  end if;

  return query
  select
    ('training_'||a.subject_kind)::text,
    a.id,
    a.organization_id,
    coalesce(o.public_name,o.name)::text,
    o.business_type::text,
    case a.subject_kind when 'trainee' then 'Stagiaire' when 'trainer' then 'Formateur' else 'Client' end::text,
    coalesce(nullif(trim(a.display_name),''),a.email)::text,
    a.email::text,
    a.user_id,
    a.status::text,
    a.created_at,
    a.last_seen_at
  from public.training_portal_accounts a
  join public.organizations o on o.id=a.organization_id
  where a.status='active'

  union all
  select
    'security_client'::text,a.id,a.organization_id,coalesce(o.public_name,o.name)::text,o.business_type::text,
    'Client'::text,coalesce(nullif(trim(a.display_name),''),a.email)::text,a.email::text,a.user_id,a.status::text,a.created_at,a.last_seen_at
  from public.security_client_portal_accounts a
  join public.organizations o on o.id=a.organization_id
  where a.status='active'

  union all
  select
    'cleaning_client'::text,a.id,a.organization_id,coalesce(o.public_name,o.name)::text,o.business_type::text,
    'Client'::text,coalesce(nullif(trim(a.display_name),''),a.email)::text,a.email::text,a.user_id,a.status::text,a.created_at,a.last_seen_at
  from public.cleaning_client_portal_accounts a
  join public.organizations o on o.id=a.organization_id
  where a.status='active'

  union all
  select
    'coiffure_client'::text,a.id,a.organization_id,coalesce(o.public_name,o.name)::text,o.business_type::text,
    'Client'::text,coalesce(nullif(trim(a.display_name),''),a.email)::text,a.email::text,a.user_id,a.status::text,a.created_at,a.last_seen_at
  from public.coiffure_client_portal_accounts a
  join public.organizations o on o.id=a.organization_id
  where a.status='active'

  union all
  select
    'security_agent'::text,a.id,a.organization_id,coalesce(o.public_name,o.name)::text,o.business_type::text,
    'Agent'::text,trim(concat_ws(' ',a.first_name,a.last_name))::text,a.email::text,a.linked_user_id,'active'::text,a.created_at,null::timestamptz
  from public.security_agents a
  join public.organizations o on o.id=a.organization_id
  where a.linked_user_id is not null

  union all
  select
    'cleaning_agent'::text,a.id,a.organization_id,coalesce(o.public_name,o.name)::text,o.business_type::text,
    'Agent'::text,trim(concat_ws(' ',a.first_name,a.last_name))::text,a.email::text,a.linked_user_id,'active'::text,a.created_at,null::timestamptz
  from public.cleaning_agents a
  join public.organizations o on o.id=a.organization_id
  where a.linked_user_id is not null

  union all
  select
    'restaurant_employee'::text,e.id,e.organization_id,coalesce(o.public_name,o.name)::text,o.business_type::text,
    'Employé'::text,trim(concat_ws(' ',e.first_name,e.last_name))::text,e.email::text,e.linked_user_id,'active'::text,e.created_at,null::timestamptz
  from public.restaurant_employees e
  join public.organizations o on o.id=e.organization_id
  where e.linked_user_id is not null

  union all
  select
    'coiffure_staff'::text,s.id,s.organization_id,coalesce(o.public_name,o.name)::text,o.business_type::text,
    'Collaborateur'::text,coalesce(nullif(trim(s.display_name),''),s.email)::text,s.email::text,s.linked_user_id,'active'::text,s.created_at,null::timestamptz
  from public.staff s
  join public.organizations o on o.id=s.organization_id
  where s.linked_user_id is not null

  order by organization_name,access_label,display_name;
end;
$$;

create or replace function public.admin_delete_distributed_access(
  p_access_type text,
  p_access_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_email text;
  v_subject_kind text;
  v_subject_id uuid;
  v_label text;
  v_name text;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Accès réservé au super-administrateur NCR.';
  end if;
  if p_access_id is null then raise exception 'Accès invalide.'; end if;

  if p_access_type in ('training_trainee','training_trainer','training_client') then
    select a.organization_id,a.user_id,a.email,a.subject_kind,
           coalesce(a.trainee_id,a.trainer_id,a.customer_id),
           coalesce(nullif(trim(a.display_name),''),a.email)
      into v_org_id,v_user_id,v_email,v_subject_kind,v_subject_id,v_name
    from public.training_portal_accounts a
    where a.id=p_access_id and a.status='active'
      and p_access_type='training_'||a.subject_kind
    for update;
    if v_org_id is null then raise exception 'Accès Formation introuvable ou déjà supprimé.'; end if;

    update public.training_portal_accounts
    set status='disabled',updated_at=now()
    where id=p_access_id;

    update public.training_portal_invitations
    set status='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now()
    where organization_id=v_org_id and subject_kind=v_subject_kind
      and coalesce(trainee_id,trainer_id,customer_id)=v_subject_id
      and lower(email)=lower(v_email) and status='pending';

    v_label:=case v_subject_kind when 'trainee' then 'Stagiaire' when 'trainer' then 'Formateur' else 'Client' end;

  elsif p_access_type='security_client' then
    select organization_id,user_id,email,coalesce(nullif(trim(display_name),''),email)
      into v_org_id,v_user_id,v_email,v_name
    from public.security_client_portal_accounts where id=p_access_id and status='active' for update;
    if v_org_id is null then raise exception 'Accès client Sécurité introuvable ou déjà supprimé.'; end if;
    update public.security_client_portal_accounts set status='disabled',updated_at=now() where id=p_access_id;
    update public.security_client_portal_invitations i
      set status='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now()
      where i.organization_id=v_org_id and lower(i.email)=lower(v_email) and i.status='pending'
        and i.client_id=(select client_id from public.security_client_portal_accounts where id=p_access_id);
    v_label:='Client';

  elsif p_access_type='cleaning_client' then
    select organization_id,user_id,email,coalesce(nullif(trim(display_name),''),email)
      into v_org_id,v_user_id,v_email,v_name
    from public.cleaning_client_portal_accounts where id=p_access_id and status='active' for update;
    if v_org_id is null then raise exception 'Accès client Nettoyage introuvable ou déjà supprimé.'; end if;
    update public.cleaning_client_portal_accounts set status='disabled',updated_at=now() where id=p_access_id;
    update public.cleaning_client_portal_invitations i
      set status='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now()
      where i.organization_id=v_org_id and lower(i.email)=lower(v_email) and i.status='pending'
        and i.client_id=(select client_id from public.cleaning_client_portal_accounts where id=p_access_id);
    v_label:='Client';

  elsif p_access_type='coiffure_client' then
    select organization_id,user_id,email,coalesce(nullif(trim(display_name),''),email)
      into v_org_id,v_user_id,v_email,v_name
    from public.coiffure_client_portal_accounts where id=p_access_id and status='active' for update;
    if v_org_id is null then raise exception 'Accès client Coiffure introuvable ou déjà supprimé.'; end if;
    update public.coiffure_client_portal_accounts set status='suspended',updated_at=now() where id=p_access_id;
    update public.coiffure_client_portal_invitations i
      set status='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now()
      where i.organization_id=v_org_id and lower(i.email)=lower(v_email) and i.status='pending'
        and i.client_id=(select client_id from public.coiffure_client_portal_accounts where id=p_access_id);
    v_label:='Client';

  elsif p_access_type='security_agent' then
    select organization_id,linked_user_id,email,trim(concat_ws(' ',first_name,last_name))
      into v_org_id,v_user_id,v_email,v_name
    from public.security_agents where id=p_access_id and linked_user_id is not null for update;
    if v_org_id is null then raise exception 'Accès agent Sécurité introuvable ou déjà supprimé.'; end if;
    update public.organization_invitations set status='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now()
      where organization_id=v_org_id and security_agent_id=p_access_id and status='pending';
    update public.security_agents set linked_user_id=null,updated_at=now() where id=p_access_id;
    delete from public.organization_members
      where organization_id=v_org_id and user_id=v_user_id and role not in ('owner','admin');
    v_label:='Agent';

  elsif p_access_type='cleaning_agent' then
    select organization_id,linked_user_id,email,trim(concat_ws(' ',first_name,last_name))
      into v_org_id,v_user_id,v_email,v_name
    from public.cleaning_agents where id=p_access_id and linked_user_id is not null for update;
    if v_org_id is null then raise exception 'Accès agent Nettoyage introuvable ou déjà supprimé.'; end if;
    update public.organization_invitations set status='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now()
      where organization_id=v_org_id and cleaning_agent_id=p_access_id and status='pending';
    update public.cleaning_agents set linked_user_id=null,updated_at=now() where id=p_access_id;
    delete from public.organization_members
      where organization_id=v_org_id and user_id=v_user_id and role not in ('owner','admin');
    v_label:='Agent';

  elsif p_access_type='restaurant_employee' then
    select organization_id,linked_user_id,email,trim(concat_ws(' ',first_name,last_name))
      into v_org_id,v_user_id,v_email,v_name
    from public.restaurant_employees where id=p_access_id and linked_user_id is not null for update;
    if v_org_id is null then raise exception 'Accès employé Restauration introuvable ou déjà supprimé.'; end if;
    update public.organization_invitations set status='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now()
      where organization_id=v_org_id and restaurant_employee_id=p_access_id and status='pending';
    update public.restaurant_employees set linked_user_id=null,updated_at=now() where id=p_access_id;
    delete from public.organization_members
      where organization_id=v_org_id and user_id=v_user_id and role not in ('owner','admin');
    v_label:='Employé';

  elsif p_access_type='coiffure_staff' then
    select organization_id,linked_user_id,email,coalesce(nullif(trim(display_name),''),email)
      into v_org_id,v_user_id,v_email,v_name
    from public.staff where id=p_access_id and linked_user_id is not null for update;
    if v_org_id is null then raise exception 'Accès collaborateur Coiffure introuvable ou déjà supprimé.'; end if;
    update public.organization_invitations set status='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now()
      where organization_id=v_org_id and staff_id=p_access_id and status='pending';
    update public.staff set linked_user_id=null,updated_at=now() where id=p_access_id;
    delete from public.organization_members
      where organization_id=v_org_id and user_id=v_user_id and role not in ('owner','admin');
    v_label:='Collaborateur';

  else
    raise exception 'Type d’accès non pris en charge.';
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    v_org_id,auth.uid(),'platform.distributed_access_deleted','distributed_access',p_access_id::text,
    jsonb_build_object(
      'access_type',p_access_type,
      'access_label',v_label,
      'display_name',v_name,
      'email',v_email,
      'linked_user_id',v_user_id,
      'auth_account_preserved',true,
      'business_data_preserved',true
    )
  );

  return jsonb_build_object(
    'deleted',true,
    'organization_id',v_org_id,
    'access_type',p_access_type,
    'access_label',v_label,
    'display_name',v_name,
    'email',v_email,
    'auth_account_preserved',true,
    'business_data_preserved',true
  );
end;
$$;

revoke all on function public.admin_list_distributed_accesses() from public,anon;
revoke all on function public.admin_delete_distributed_access(text,uuid) from public,anon;
grant execute on function public.admin_list_distributed_accesses() to authenticated;
grant execute on function public.admin_delete_distributed_access(text,uuid) to authenticated;

commit;
select pg_notify('pgrst','reload schema');