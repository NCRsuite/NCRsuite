-- NCR Suite V2.29.25 — correction du tri de la liste des accès distribués.

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
  select rows.*
  from (
    select
      ('training_'||a.subject_kind)::text as access_type,
      a.id as access_id,
      a.organization_id,
      coalesce(o.public_name,o.name)::text as organization_name,
      o.business_type::text as business_type,
      case a.subject_kind when 'trainee' then 'Stagiaire' when 'trainer' then 'Formateur' else 'Client' end::text as access_label,
      coalesce(nullif(trim(a.display_name),''),a.email)::text as display_name,
      a.email::text as email,
      a.user_id as user_id,
      a.status::text as status,
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
  ) rows
  order by rows.organization_name,rows.access_label,rows.display_name;
end;
$$;

revoke all on function public.admin_list_distributed_accesses() from public,anon;
grant execute on function public.admin_list_distributed_accesses() to authenticated;
select pg_notify('pgrst','reload schema');