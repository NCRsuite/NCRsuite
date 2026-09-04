alter table public.coiffure_client_portal_invitations
  alter column invited_by drop not null,
  add column if not exists invitation_source text not null default 'team';

alter table public.coiffure_client_portal_invitations
  drop constraint if exists coiffure_client_portal_invitations_source_check;
alter table public.coiffure_client_portal_invitations
  add constraint coiffure_client_portal_invitations_source_check
  check (invitation_source in ('team','public_booking'));

create index if not exists coiffure_client_portal_invitations_invited_by_idx
  on public.coiffure_client_portal_invitations(invited_by)
  where invited_by is not null;
create index if not exists coiffure_client_portal_invitations_accepted_by_idx
  on public.coiffure_client_portal_invitations(accepted_by)
  where accepted_by is not null;

CREATE OR REPLACE FUNCTION public.public_booking_client_portal_activation_status(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_appointment public.appointments%rowtype;
  v_client public.clients%rowtype;
  v_company public.organization_companies%rowtype;
  v_active boolean := false;
  v_pending boolean := false;
  v_email text;
  v_masked text;
begin
  select * into v_appointment
  from public.appointments
  where public_token=p_token
    and source='public'
  limit 1;

  if v_appointment.id is null then return null; end if;

  select * into v_client
  from public.clients
  where organization_id=v_appointment.organization_id
    and id=v_appointment.client_id
    and status='active';

  if v_client.id is null then return null; end if;

  select * into v_company
  from public.organization_companies
  where organization_id=v_appointment.organization_id
    and id=v_appointment.company_id
    and status='active';

  v_email:=nullif(lower(trim(coalesce(v_client.email,''))),'');
  if v_email is not null then
    v_masked:=regexp_replace(v_email,'^(.{1,2}).*(@.*)$','\1••••\2');
  end if;

  select exists(
    select 1
    from public.coiffure_client_portal_accounts a
    where a.organization_id=v_appointment.organization_id
      and a.client_id=v_client.id
      and a.status='active'
      and (v_email is null or lower(a.email)=v_email)
  ) into v_active;

  select exists(
    select 1
    from public.coiffure_client_portal_invitations i
    where i.organization_id=v_appointment.organization_id
      and i.client_id=v_client.id
      and i.status='pending'
      and i.expires_at>now()
      and (v_email is null or lower(i.email)=v_email)
  ) into v_pending;

  return jsonb_build_object(
    'available', public.coiffure_client_portal_feature_enabled(v_appointment.organization_id) and v_email is not null,
    'already_active',v_active,
    'invitation_pending',v_pending,
    'masked_email',v_masked,
    'company_name',coalesce(v_company.name,'Votre enseigne')
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.request_public_booking_client_portal_activation(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_appointment public.appointments%rowtype;
  v_client public.clients%rowtype;
  v_company public.organization_companies%rowtype;
  v_email text;
  v_auth_email text;
  v_existing_account uuid;
  v_invitation_id uuid;
  v_token text;
  v_masked text;
begin
  select * into v_appointment
  from public.appointments
  where public_token=p_token
    and source='public'
  for update;

  if v_appointment.id is null then raise exception 'Réservation introuvable.'; end if;
  if not public.coiffure_client_portal_feature_enabled(v_appointment.organization_id) then
    raise exception 'L’espace client est actuellement indisponible.';
  end if;

  select * into v_client
  from public.clients
  where organization_id=v_appointment.organization_id
    and id=v_appointment.client_id
    and status='active';

  if v_client.id is null then raise exception 'Dossier client introuvable.'; end if;

  select * into v_company
  from public.organization_companies
  where organization_id=v_appointment.organization_id
    and id=v_appointment.company_id
    and status='active';

  v_email:=nullif(lower(trim(coalesce(v_client.email,''))),'');
  if v_email is null then
    raise exception 'Ajoutez une adresse e-mail à votre dossier pour activer l’espace client.';
  end if;
  v_masked:=regexp_replace(v_email,'^(.{1,2}).*(@.*)$','\1••••\2');

  select a.id into v_existing_account
  from public.coiffure_client_portal_accounts a
  where a.organization_id=v_appointment.organization_id
    and a.client_id=v_client.id
    and lower(a.email)=v_email
    and a.status='active'
  order by a.updated_at desc
  limit 1;

  if v_existing_account is not null then
    return jsonb_build_object('status','active','masked_email',v_masked,'company_name',coalesce(v_company.name,'Votre enseigne'));
  end if;

  if auth.uid() is not null then
    select lower(email) into v_auth_email from auth.users where id=auth.uid();
    if v_auth_email=v_email then
      insert into public.coiffure_client_portal_accounts(organization_id,client_id,user_id,email,display_name,status,last_seen_at)
      values(
        v_appointment.organization_id,v_client.id,auth.uid(),v_email,
        trim(concat_ws(' ',v_client.first_name,v_client.last_name)),'active',now()
      )
      on conflict(organization_id,client_id,user_id)
      do update set email=excluded.email,status='active',last_seen_at=now(),updated_at=now();

      perform public.apply_coiffure_welcome_benefit(v_appointment.organization_id,v_client.id);
      perform public.ensure_coiffure_birthday_reward(v_appointment.organization_id,v_client.id);

      insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
      values(
        v_appointment.organization_id,auth.uid(),'coiffure.client_portal_self_activated','client',v_client.id::text,
        jsonb_build_object('company_id',v_appointment.company_id,'appointment_id',v_appointment.id)
      );

      return jsonb_build_object('status','active','masked_email',v_masked,'company_name',coalesce(v_company.name,'Votre enseigne'));
    end if;
  end if;

  if (
    select count(*)
    from public.coiffure_client_portal_invitations i
    where i.organization_id=v_appointment.organization_id
      and i.client_id=v_client.id
      and lower(i.email)=v_email
      and i.invitation_source='public_booking'
      and i.created_at>now()-interval '24 hours'
  )>=3 then
    raise exception 'Plusieurs e-mails d’activation ont déjà été envoyés. Réessayez plus tard.';
  end if;

  select i.id into v_invitation_id
  from public.coiffure_client_portal_invitations i
  where i.organization_id=v_appointment.organization_id
    and i.client_id=v_client.id
    and lower(i.email)=v_email
    and i.status='pending'
    and i.expires_at>now()
    and i.created_at>now()-interval '5 minutes'
  order by i.created_at desc
  limit 1;

  if v_invitation_id is not null then
    return jsonb_build_object('status','sent','masked_email',v_masked,'company_name',coalesce(v_company.name,'Votre enseigne'));
  end if;

  update public.coiffure_client_portal_invitations
  set status='revoked',revoked_at=now(),updated_at=now()
  where organization_id=v_appointment.organization_id
    and client_id=v_client.id
    and lower(email)=v_email
    and status='pending';

  v_token:=encode(extensions.gen_random_bytes(32),'hex');

  insert into public.coiffure_client_portal_invitations(
    organization_id,client_id,email,display_name,token_hash,status,expires_at,invited_by,invitation_source
  )
  values(
    v_appointment.organization_id,v_client.id,v_email,
    trim(concat_ws(' ',v_client.first_name,v_client.last_name)),
    extensions.digest(v_token,'sha256'),'pending',now()+interval '7 days',null,'public_booking'
  )
  returning id into v_invitation_id;

  perform public.enqueue_coiffure_client_portal_invitation_email(v_invitation_id,v_token);

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    v_appointment.organization_id,null,'coiffure.client_portal_activation_requested','client',v_client.id::text,
    jsonb_build_object('company_id',v_appointment.company_id,'appointment_id',v_appointment.id,'invitation_id',v_invitation_id)
  );

  return jsonb_build_object('status','sent','masked_email',v_masked,'company_name',coalesce(v_company.name,'Votre enseigne'));
end;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_coiffure_client_portal_invitation_email(p_invitation_id uuid, p_raw_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_inv public.coiffure_client_portal_invitations%rowtype;
  v_org public.organizations%rowtype;
  v_client public.clients%rowtype;
  v_company public.organization_companies%rowtype;
  v_key text;
begin
  select * into v_inv
  from public.coiffure_client_portal_invitations
  where id=p_invitation_id;

  if v_inv.id is null or v_inv.status<>'pending' then return; end if;

  select * into v_org
  from public.organizations
  where id=v_inv.organization_id;

  select * into v_client
  from public.clients
  where organization_id=v_inv.organization_id
    and id=v_inv.client_id;

  if v_client.company_id is not null then
    select * into v_company
    from public.organization_companies
    where organization_id=v_inv.organization_id
      and id=v_client.company_id
      and status='active';
  end if;

  v_key := 'coiffure-client-portal:'||v_inv.id::text||':'||encode(extensions.digest(p_raw_token,'sha256'),'hex');

  insert into public.email_outbox(
    organization_id,appointment_id,template_key,recipient_email,recipient_name,payload,dedupe_key,status,scheduled_for,attempts
  )
  values(
    v_inv.organization_id,null,'coiffure_client_portal_invitation',lower(v_inv.email),
    coalesce(v_inv.display_name,v_client.first_name),
    jsonb_build_object(
      'organization_name',coalesce(v_company.name,v_org.public_name,v_org.name),
      'organization_slug',coalesce(v_company.public_slug,v_org.slug),
      'organization_primary_color',coalesce(v_company.primary_color,v_org.primary_color),
      'organization_logo_url',coalesce(v_company.logo_url,v_org.logo_url),
      'client_name',trim(concat(v_client.first_name,' ',coalesce(v_client.last_name,''))),
      'invitation_token',p_raw_token,
      'invited_name',v_inv.display_name,
      'expires_at',v_inv.expires_at,
      'contact_email',coalesce(v_company.email,v_org.company_email),
      'contact_phone',coalesce(v_company.phone,v_org.company_phone)
    ),
    v_key,'pending',now(),0
  )
  on conflict(dedupe_key) do nothing;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_coiffure_client_portal_invitation(p_token text)
 RETURNS TABLE(organization_name text, organization_logo_url text, organization_primary_color text, client_name text, invited_email text, invited_name text, invitation_status text, expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
  select
    coalesce(oc.name,o.public_name,o.name),
    coalesce(oc.logo_url,o.logo_url),
    coalesce(oc.primary_color,o.primary_color),
    trim(concat(c.first_name,' ',coalesce(c.last_name,''))),
    i.email,
    i.display_name,
    case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,
    i.expires_at
  from public.coiffure_client_portal_invitations i
  join public.organizations o on o.id=i.organization_id
  join public.clients c
    on c.organization_id=i.organization_id
   and c.id=i.client_id
  left join public.organization_companies oc
    on oc.organization_id=i.organization_id
   and oc.id=c.company_id
   and oc.status='active'
  where i.token_hash=extensions.digest(trim(p_token),'sha256')
    and public.coiffure_client_portal_feature_enabled(i.organization_id)
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.coiffure_client_portal_dashboard(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
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
        'public_token',a.public_token,
        'service_name',coalesce(
          (select string_agg(asi.service_name,' + ' order by asi.position)
             from public.appointment_service_items asi
            where asi.appointment_id=a.id),
          s.name,'Prestation'
        ),
        'service_ids',coalesce(
          (select jsonb_agg(asi.service_id order by asi.position)
             from public.appointment_service_items asi
            where asi.appointment_id=a.id),
          jsonb_build_array(a.service_id)
        ),
        'staff_id',a.staff_id,
        'staff_name',coalesce(st.display_name,'Équipe du salon'),
        'site_name',os.name,
        'can_cancel',(
          public.plan_feature_enabled((select org.plan from public.organizations org where org.id=v_account.organization_id),'online_booking_management')
          and a.source='public'
          and a.public_token is not null
          and a.status in ('pending','confirmed')
          and now()<a.starts_at-make_interval(hours=>(select org.booking_cancel_notice_hours from public.organizations org where org.id=v_account.organization_id))
        ),
        'can_reschedule',(
          public.plan_feature_enabled((select org.plan from public.organizations org where org.id=v_account.organization_id),'online_booking_management')
          and a.source='public'
          and a.public_token is not null
          and a.status in ('pending','confirmed')
          and now()<a.starts_at-make_interval(hours=>(select org.booking_cancel_notice_hours from public.organizations org where org.id=v_account.organization_id))
        )
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
$function$;

revoke all on function public.public_booking_client_portal_activation_status(uuid) from public;
revoke all on function public.request_public_booking_client_portal_activation(uuid) from public;
grant execute on function public.public_booking_client_portal_activation_status(uuid) to anon,authenticated,service_role;
grant execute on function public.request_public_booking_client_portal_activation(uuid) to anon,authenticated,service_role;
