create or replace function public.current_coiffure_client_portal_accounts()
returns table(account_id uuid, organization_id uuid, client_id uuid, organization_name text, organization_logo_url text, organization_primary_color text, client_name text, display_name text, unread_rewards integer, last_seen_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    a.id,
    a.organization_id,
    a.client_id,
    coalesce(oc.name, o.public_name, o.name),
    coalesce(oc.logo_url, o.logo_url),
    coalesce(oc.primary_color, o.primary_color),
    trim(concat(c.first_name,' ',coalesce(c.last_name,''))),
    a.display_name,
    (select count(*)::integer
       from public.coiffure_loyalty_rewards r
      where r.organization_id=a.organization_id
        and r.client_id=a.client_id
        and r.status='available'),
    a.last_seen_at
  from public.coiffure_client_portal_accounts a
  join public.organizations o on o.id=a.organization_id
  join public.clients c on c.organization_id=a.organization_id and c.id=a.client_id
  left join public.organization_companies oc
    on oc.organization_id=a.organization_id
   and oc.id=c.company_id
   and oc.status='active'
  where a.user_id=auth.uid()
    and a.status='active'
    and c.status='active'
    and public.coiffure_client_portal_feature_enabled(a.organization_id)
  order by coalesce(oc.name,o.name),c.first_name;
$$;

create or replace function public.coiffure_client_portal_dashboard(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_account public.coiffure_client_portal_accounts%rowtype;
  v_company_id uuid;
  v_result jsonb;
begin
  if not public.is_coiffure_client_portal_account(p_account_id) then
    raise exception 'Accès refusé.';
  end if;

  select * into v_account
  from public.coiffure_client_portal_accounts
  where id=p_account_id;

  select c.company_id into v_company_id
  from public.clients c
  where c.organization_id=v_account.organization_id
    and c.id=v_account.client_id;

  update public.coiffure_client_portal_accounts
  set last_seen_at=now(),updated_at=now()
  where id=p_account_id;

  perform public.expire_coiffure_loyalty_rewards(v_account.organization_id,v_account.client_id);
  perform public.ensure_coiffure_birthday_reward(v_account.organization_id,v_account.client_id);

  select jsonb_build_object(
    'organization', (
      select jsonb_build_object(
        'id',coalesce(oc.id,o.id),
        'name',coalesce(oc.name,o.public_name,o.name),
        'slug',coalesce(oc.public_slug,o.slug),
        'logo_url',coalesce(oc.logo_url,o.logo_url),
        'primary_color',coalesce(oc.primary_color,o.primary_color,'#c026d3'),
        'email',coalesce(oc.email,o.company_email),
        'phone',coalesce(oc.phone,o.company_phone),
        'address',coalesce(
          (select concat_ws(' ',nullif(os.address,''),nullif(os.postal_code,''),nullif(os.city,''))
             from public.organization_sites os
            where os.organization_id=o.id
              and os.status='active'
              and (v_company_id is null or os.company_id=v_company_id)
            order by os.is_primary desc,os.created_at
            limit 1),
          o.booking_address,
          o.company_address
        )
      )
      from public.organizations o
      left join public.organization_companies oc
        on oc.organization_id=o.id
       and oc.id=v_company_id
       and oc.status='active'
      where o.id=v_account.organization_id
    ),
    'client', (
      select jsonb_build_object(
        'id',c.id,'first_name',c.first_name,'last_name',c.last_name,'email',c.email,'phone',c.phone,
        'birth_date',c.birth_date,'loyalty_opt_in',c.loyalty_opt_in,'birthday_consent',c.birthday_consent,
        'marketing_opt_in',c.marketing_opt_in
      )
      from public.clients c
      where c.organization_id=v_account.organization_id
        and c.id=v_account.client_id
        and (v_company_id is null or c.company_id=v_company_id)
    ),
    'settings', (select to_jsonb(s) from public.coiffure_loyalty_settings s where s.organization_id=v_account.organization_id),
    'balance', jsonb_build_object(
      'points',coalesce((select sum(l.points_delta) from public.coiffure_loyalty_ledger l where l.organization_id=v_account.organization_id and l.client_id=v_account.client_id),0),
      'visits',coalesce((select sum(l.visits_delta) from public.coiffure_loyalty_ledger l where l.organization_id=v_account.organization_id and l.client_id=v_account.client_id),0)
    ),
    'rewards',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.id,'source_type',r.source_type,'title',r.title,'description',r.description,
        'reward_kind',r.reward_kind,'reward_value',r.reward_value,'status',r.status,
        'issued_at',r.issued_at,'expires_at',r.expires_at,'redeemed_at',r.redeemed_at
      ) order by case when r.status='available' then 0 else 1 end,r.issued_at desc)
      from public.coiffure_loyalty_rewards r
      where r.organization_id=v_account.organization_id and r.client_id=v_account.client_id
    ),'[]'::jsonb),
    'history',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',l.id,'entry_type',l.entry_type,'points_delta',l.points_delta,'visits_delta',l.visits_delta,
        'label',l.label,'created_at',l.created_at
      ) order by l.created_at desc)
      from (
        select * from public.coiffure_loyalty_ledger
        where organization_id=v_account.organization_id and client_id=v_account.client_id
        order by created_at desc limit 50
      ) l
    ),'[]'::jsonb),
    'appointments',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'starts_at',a.starts_at,'ends_at',a.ends_at,'status',a.status,'amount_cents',a.amount_cents,
        'public_token',a.public_token,'service_name',coalesce(s.name,'Prestation'),
        'staff_name',coalesce(st.display_name,'Équipe du salon'),'site_name',os.name
      ) order by a.starts_at desc)
      from (
        select * from public.appointments
        where organization_id=v_account.organization_id
          and client_id=v_account.client_id
          and (v_company_id is null or company_id=v_company_id)
        order by starts_at desc limit 100
      ) a
      left join public.services s on s.organization_id=a.organization_id and s.id=a.service_id
      left join public.staff st on st.organization_id=a.organization_id and st.id=a.staff_id
      left join public.organization_sites os on os.organization_id=a.organization_id and os.id=a.site_id
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;