create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

alter table public.organization_companies
  add column if not exists google_review_url text,
  add column if not exists referral_enabled boolean not null default false,
  add column if not exists referral_referrer_reward_label text not null default 'Avantage parrainage',
  add column if not exists referral_referrer_reward_kind text not null default 'discount_fixed',
  add column if not exists referral_referrer_reward_value integer not null default 500,
  add column if not exists referral_referrer_reward_valid_days integer not null default 60,
  add column if not exists referral_referred_reward_label text not null default 'Avantage de bienvenue',
  add column if not exists referral_referred_reward_kind text not null default 'discount_fixed',
  add column if not exists referral_referred_reward_value integer not null default 500,
  add column if not exists referral_referred_reward_valid_days integer not null default 60;

alter table public.organization_companies
  drop constraint if exists organization_companies_google_review_url_check;
alter table public.organization_companies
  add constraint organization_companies_google_review_url_check
  check (google_review_url is null or (char_length(google_review_url)<=1000 and google_review_url ~ '^https://'));

alter table public.organization_companies
  drop constraint if exists organization_companies_referral_referrer_kind_check;
alter table public.organization_companies
  add constraint organization_companies_referral_referrer_kind_check
  check (referral_referrer_reward_kind in ('discount_percent','discount_fixed','free_service','gift','custom'));

alter table public.organization_companies
  drop constraint if exists organization_companies_referral_referred_kind_check;
alter table public.organization_companies
  add constraint organization_companies_referral_referred_kind_check
  check (referral_referred_reward_kind in ('discount_percent','discount_fixed','free_service','gift','custom'));

alter table public.organization_companies
  drop constraint if exists organization_companies_referral_referrer_value_check;
alter table public.organization_companies
  add constraint organization_companies_referral_referrer_value_check
  check (referral_referrer_reward_value between 0 and 1000000);

alter table public.organization_companies
  drop constraint if exists organization_companies_referral_referred_value_check;
alter table public.organization_companies
  add constraint organization_companies_referral_referred_value_check
  check (referral_referred_reward_value between 0 and 1000000);

alter table public.organization_companies
  drop constraint if exists organization_companies_referral_referrer_days_check;
alter table public.organization_companies
  add constraint organization_companies_referral_referrer_days_check
  check (referral_referrer_reward_valid_days between 1 and 730);

alter table public.organization_companies
  drop constraint if exists organization_companies_referral_referred_days_check;
alter table public.organization_companies
  add constraint organization_companies_referral_referred_days_check
  check (referral_referred_reward_valid_days between 1 and 730);

alter table public.coiffure_loyalty_rewards
  drop constraint if exists coiffure_loyalty_rewards_source_type_check;
alter table public.coiffure_loyalty_rewards
  add constraint coiffure_loyalty_rewards_source_type_check
  check (source_type in ('points','visits','birthday','welcome','manual','referral'));

create table if not exists public.beauty_referral_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  code text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id,client_id),
  unique (code),
  constraint beauty_referral_codes_code_check check (code ~ '^[A-Z0-9]{8,16}$')
);

create table if not exists public.beauty_referrals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  referral_code_id uuid not null references public.beauty_referral_codes(id) on delete restrict,
  referrer_client_id uuid not null references public.clients(id) on delete cascade,
  referred_client_id uuid not null references public.clients(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  status text not null default 'pending',
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id,referred_client_id),
  unique (appointment_id),
  constraint beauty_referrals_status_check check (status in ('pending','qualified','cancelled')),
  constraint beauty_referrals_distinct_clients_check check (referrer_client_id<>referred_client_id)
);

create index if not exists beauty_referral_codes_scope_idx
  on public.beauty_referral_codes(organization_id,company_id,active);
create index if not exists beauty_referral_codes_client_fk_idx
  on public.beauty_referral_codes(client_id);
create index if not exists beauty_referrals_scope_idx
  on public.beauty_referrals(organization_id,company_id,status,created_at desc);
create index if not exists beauty_referrals_referrer_idx
  on public.beauty_referrals(referrer_client_id,status);
create index if not exists beauty_referrals_referred_idx
  on public.beauty_referrals(referred_client_id,status);
create index if not exists beauty_referrals_code_fk_idx
  on public.beauty_referrals(referral_code_id);

alter table public.beauty_referral_codes enable row level security;
alter table public.beauty_referrals enable row level security;

drop policy if exists beauty_referral_codes_admin_select on public.beauty_referral_codes;
create policy beauty_referral_codes_admin_select on public.beauty_referral_codes
for select to authenticated
using (public.metier_company_access_allows(organization_id,company_id,(select auth.uid())));

drop policy if exists beauty_referrals_admin_select on public.beauty_referrals;
create policy beauty_referrals_admin_select on public.beauty_referrals
for select to authenticated
using (public.metier_company_access_allows(organization_id,company_id,(select auth.uid())));

revoke all on table public.beauty_referral_codes from anon;
revoke all on table public.beauty_referrals from anon;
revoke insert,update,delete,truncate,references,trigger on table public.beauty_referral_codes from authenticated;
revoke insert,update,delete,truncate,references,trigger on table public.beauty_referrals from authenticated;
grant select on table public.beauty_referral_codes to authenticated;
grant select on table public.beauty_referrals to authenticated;
grant select,insert,update,delete on table public.beauty_referral_codes to service_role;
grant select,insert,update,delete on table public.beauty_referrals to service_role;

drop trigger if exists beauty_referrals_touch_updated_at on public.beauty_referrals;
create trigger beauty_referrals_touch_updated_at
before update on public.beauty_referrals
for each row execute function public.set_updated_at();

CREATE OR REPLACE FUNCTION private.beauty_company_review_growth_summary(p_organization_id uuid, p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise.'; end if;
  if not public.metier_company_access_allows(p_organization_id,p_company_id,(select auth.uid())) then
    raise exception 'Accès refusé à cette enseigne.';
  end if;

  return jsonb_build_object(
    'verified_reviews',(
      select count(*)
      from public.coiffure_company_reviews rv
      where rv.organization_id=p_organization_id
        and rv.company_id=p_company_id
        and rv.status='published'
    ),
    'average_rating',(
      select round(avg(rv.rating)::numeric,1)
      from public.coiffure_company_reviews rv
      where rv.organization_id=p_organization_id
        and rv.company_id=p_company_id
        and rv.status='published'
    ),
    'review_opportunities',(
      select count(*)
      from public.appointments a
      where a.organization_id=p_organization_id
        and a.company_id=p_company_id
        and a.status='completed'
        and a.ends_at<=now()
        and a.ends_at>=now()-interval '90 days'
        and not exists(
          select 1
          from public.coiffure_company_reviews rv
          where rv.organization_id=a.organization_id
            and rv.appointment_id=a.id
        )
    )
  );
end;
$function$;
revoke all on function private.beauty_company_review_growth_summary(uuid,uuid) from public;
grant execute on function private.beauty_company_review_growth_summary(uuid,uuid) to authenticated,service_role;

CREATE OR REPLACE FUNCTION private.metier_update_company_growth_settings(p_organization_id uuid, p_company_id uuid, p_google_review_url text, p_referral_enabled boolean, p_referrer_label text, p_referrer_kind text, p_referrer_value integer, p_referrer_valid_days integer, p_referred_label text, p_referred_kind text, p_referred_value integer, p_referred_valid_days integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_allowed boolean := false;
  v_google text:=nullif(trim(coalesce(p_google_review_url,'')),'');
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  v_allowed:=public.is_platform_super_admin()
    or public.has_org_role(p_organization_id,array['owner','admin'])
    or (
      public.has_org_role(p_organization_id,array['manager'])
      and public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid())
    );
  if not v_allowed then raise exception 'Droits insuffisants pour cette enseigne.'; end if;

  if v_google is not null and (char_length(v_google)>1000 or v_google !~ '^https://') then
    raise exception 'Le lien Google doit être une adresse HTTPS valide.';
  end if;
  if p_referrer_kind not in ('discount_percent','discount_fixed','free_service','gift','custom')
     or p_referred_kind not in ('discount_percent','discount_fixed','free_service','gift','custom') then
    raise exception 'Type de récompense invalide.';
  end if;
  if p_referrer_value not between 0 and 1000000 or p_referred_value not between 0 and 1000000 then
    raise exception 'Valeur de récompense invalide.';
  end if;
  if p_referrer_valid_days not between 1 and 730 or p_referred_valid_days not between 1 and 730 then
    raise exception 'Durée de validité invalide.';
  end if;

  update public.organization_companies
  set google_review_url=v_google,
      referral_enabled=coalesce(p_referral_enabled,false),
      referral_referrer_reward_label=left(coalesce(nullif(trim(p_referrer_label),''),'Avantage parrainage'),160),
      referral_referrer_reward_kind=p_referrer_kind,
      referral_referrer_reward_value=p_referrer_value,
      referral_referrer_reward_valid_days=p_referrer_valid_days,
      referral_referred_reward_label=left(coalesce(nullif(trim(p_referred_label),''),'Avantage de bienvenue'),160),
      referral_referred_reward_kind=p_referred_kind,
      referral_referred_reward_value=p_referred_value,
      referral_referred_reward_valid_days=p_referred_valid_days,
      updated_at=now()
  where id=p_company_id
    and organization_id=p_organization_id
    and status='active';

  if not found then raise exception 'Enseigne introuvable.'; end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'metier.company_growth_settings_updated','organization_company',p_company_id::text,
    jsonb_build_object('referral_enabled',coalesce(p_referral_enabled,false),'google_review_configured',v_google is not null)
  );
  return true;
end;
$function$;
revoke all on function private.metier_update_company_growth_settings(uuid,uuid,text,boolean,text,text,integer,integer,text,text,integer,integer) from public;
grant execute on function private.metier_update_company_growth_settings(uuid,uuid,text,boolean,text,text,integer,integer,text,text,integer,integer) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.metier_update_company_growth_settings(p_organization_id uuid, p_company_id uuid, p_google_review_url text, p_referral_enabled boolean, p_referrer_label text, p_referrer_kind text, p_referrer_value integer, p_referrer_valid_days integer, p_referred_label text, p_referred_kind text, p_referred_value integer, p_referred_valid_days integer)
 RETURNS boolean
 LANGUAGE sql
 SET search_path = public, private, pg_catalog
AS $function$
  select private.metier_update_company_growth_settings(
    p_organization_id,p_company_id,p_google_review_url,p_referral_enabled,
    p_referrer_label,p_referrer_kind,p_referrer_value,p_referrer_valid_days,
    p_referred_label,p_referred_kind,p_referred_value,p_referred_valid_days
  );
$function$;
revoke all on function public.metier_update_company_growth_settings(uuid,uuid,text,boolean,text,text,integer,integer,text,text,integer,integer) from public;
grant execute on function public.metier_update_company_growth_settings(uuid,uuid,text,boolean,text,text,integer,integer,text,text,integer,integer) to authenticated,service_role;

CREATE OR REPLACE FUNCTION private.get_or_create_beauty_referral_link(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_catalog
AS $function$
declare
  v_account public.coiffure_client_portal_accounts%rowtype;
  v_client public.clients%rowtype;
  v_company public.organization_companies%rowtype;
  v_code text;
  v_attempt integer:=0;
begin
  if not public.is_coiffure_client_portal_account(p_account_id) then
    raise exception 'Accès client refusé.';
  end if;

  select * into v_account
  from public.coiffure_client_portal_accounts
  where id=p_account_id and status='active';
  if v_account.id is null then raise exception 'Espace client indisponible.'; end if;

  select * into v_client
  from public.clients
  where organization_id=v_account.organization_id
    and id=v_account.client_id
    and status='active';
  if v_client.id is null or v_client.company_id is null then raise exception 'Dossier client sans enseigne.'; end if;

  select * into v_company
  from public.organization_companies
  where organization_id=v_account.organization_id
    and id=v_client.company_id
    and status='active';

  if v_company.id is null or not v_company.referral_enabled or v_company.public_slug is null then
    return jsonb_build_object('enabled',false);
  end if;

  select rc.code into v_code
  from public.beauty_referral_codes rc
  where rc.organization_id=v_account.organization_id
    and rc.company_id=v_company.id
    and rc.client_id=v_client.id
    and rc.active=true
  limit 1;

  while v_code is null and v_attempt<10 loop
    v_attempt:=v_attempt+1;
    v_code:=upper(substr(encode(gen_random_bytes(8),'hex'),1,10));
    begin
      insert into public.beauty_referral_codes(organization_id,company_id,client_id,code,active)
      values(v_account.organization_id,v_company.id,v_client.id,v_code,true);
    exception when unique_violation then
      select rc.code into v_code
      from public.beauty_referral_codes rc
      where rc.organization_id=v_account.organization_id
        and rc.company_id=v_company.id
        and rc.client_id=v_client.id
        and rc.active=true
      limit 1;
      if v_code is null then v_code:=null; end if;
    end;
  end loop;

  if v_code is null then raise exception 'Impossible de générer le lien de parrainage.'; end if;

  return jsonb_build_object(
    'enabled',true,
    'code',v_code,
    'public_slug',v_company.public_slug,
    'path','/salon/'||v_company.public_slug||'?ref='||v_code||'#reserver',
    'referrer_reward_label',v_company.referral_referrer_reward_label,
    'referred_reward_label',v_company.referral_referred_reward_label,
    'pending_count',(select count(*) from public.beauty_referrals r where r.organization_id=v_account.organization_id and r.company_id=v_company.id and r.referrer_client_id=v_client.id and r.status='pending'),
    'qualified_count',(select count(*) from public.beauty_referrals r where r.organization_id=v_account.organization_id and r.company_id=v_company.id and r.referrer_client_id=v_client.id and r.status='qualified')
  );
end;
$function$;
revoke all on function private.get_or_create_beauty_referral_link(uuid) from public;
grant execute on function private.get_or_create_beauty_referral_link(uuid) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_or_create_beauty_referral_link(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path = public, private, pg_catalog
AS $function$
  select private.get_or_create_beauty_referral_link(p_account_id);
$function$;
revoke all on function public.get_or_create_beauty_referral_link(uuid) from public;
grant execute on function public.get_or_create_beauty_referral_link(uuid) to authenticated,service_role;

CREATE OR REPLACE FUNCTION private.coiffure_client_growth_state(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_account public.coiffure_client_portal_accounts%rowtype;
  v_client public.clients%rowtype;
  v_company public.organization_companies%rowtype;
begin
  if not public.is_coiffure_client_portal_account(p_account_id) then
    raise exception 'Accès client refusé.';
  end if;
  select * into v_account from public.coiffure_client_portal_accounts where id=p_account_id and status='active';
  select * into v_client from public.clients where organization_id=v_account.organization_id and id=v_account.client_id and status='active';
  if v_client.company_id is not null then
    select * into v_company from public.organization_companies
    where organization_id=v_account.organization_id and id=v_client.company_id and status='active';
  end if;

  return jsonb_build_object(
    'google_review_url',v_company.google_review_url,
    'referral_enabled',coalesce(v_company.referral_enabled,false),
    'company_name',v_company.name
  );
end;
$function$;
revoke all on function private.coiffure_client_growth_state(uuid) from public;
grant execute on function private.coiffure_client_growth_state(uuid) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.coiffure_client_growth_state(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path = public, private, pg_catalog
AS $function$
  select private.coiffure_client_growth_state(p_account_id);
$function$;
revoke all on function public.coiffure_client_growth_state(uuid) from public;
grant execute on function public.coiffure_client_growth_state(uuid) to authenticated,service_role;

CREATE OR REPLACE FUNCTION private.register_public_booking_referral(p_token uuid, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_appointment public.appointments%rowtype;
  v_code public.beauty_referral_codes%rowtype;
  v_company public.organization_companies%rowtype;
  v_existing public.beauty_referrals%rowtype;
begin
  if nullif(trim(coalesce(p_code,'')),'') is null then
    return jsonb_build_object('status','ignored');
  end if;

  select * into v_appointment
  from public.appointments
  where public_token=p_token
    and source='public'
  limit 1;
  if v_appointment.id is null or v_appointment.company_id is null then
    return jsonb_build_object('status','ignored');
  end if;

  select * into v_company
  from public.organization_companies
  where id=v_appointment.company_id
    and organization_id=v_appointment.organization_id
    and status='active';
  if v_company.id is null or not v_company.referral_enabled then
    return jsonb_build_object('status','disabled');
  end if;

  select * into v_code
  from public.beauty_referral_codes
  where code=upper(trim(p_code))
    and organization_id=v_appointment.organization_id
    and company_id=v_appointment.company_id
    and active=true
  limit 1;
  if v_code.id is null then return jsonb_build_object('status','invalid'); end if;
  if v_code.client_id=v_appointment.client_id then return jsonb_build_object('status','self'); end if;

  if exists(
    select 1
    from public.appointments a
    where a.organization_id=v_appointment.organization_id
      and a.company_id=v_appointment.company_id
      and a.client_id=v_appointment.client_id
      and a.id<>v_appointment.id
      and a.created_at<v_appointment.created_at
      and a.status<>'cancelled'
  ) then
    return jsonb_build_object('status','not_new_client');
  end if;

  select * into v_existing
  from public.beauty_referrals r
  where r.company_id=v_appointment.company_id
    and r.referred_client_id=v_appointment.client_id
  limit 1;

  if v_existing.id is not null then
    if v_existing.status='cancelled' then
      update public.beauty_referrals
      set referral_code_id=v_code.id,
          referrer_client_id=v_code.client_id,
          appointment_id=v_appointment.id,
          status='pending',
          qualified_at=null,
          updated_at=now()
      where id=v_existing.id;
      return jsonb_build_object('status','registered');
    end if;
    return jsonb_build_object('status',v_existing.status);
  end if;

  insert into public.beauty_referrals(
    organization_id,company_id,referral_code_id,referrer_client_id,referred_client_id,appointment_id,status
  )
  values(
    v_appointment.organization_id,v_appointment.company_id,v_code.id,v_code.client_id,v_appointment.client_id,v_appointment.id,'pending'
  );

  return jsonb_build_object('status','registered');
end;
$function$;
revoke all on function private.register_public_booking_referral(uuid,text) from public;
grant execute on function private.register_public_booking_referral(uuid,text) to anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.register_public_booking_referral(p_token uuid, p_code text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path = public, private, pg_catalog
AS $function$
  select private.register_public_booking_referral(p_token,p_code);
$function$;
revoke all on function public.register_public_booking_referral(uuid,text) from public;
grant execute on function public.register_public_booking_referral(uuid,text) to anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.process_beauty_referral_qualification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_ref public.beauty_referrals%rowtype;
  v_company public.organization_companies%rowtype;
begin
  if new.status<>'completed' or old.status='completed' then return new; end if;

  select * into v_ref
  from public.beauty_referrals
  where appointment_id=new.id
    and organization_id=new.organization_id
    and company_id=new.company_id
    and status='pending'
  for update;

  if v_ref.id is null then return new; end if;

  select * into v_company
  from public.organization_companies
  where id=v_ref.company_id
    and organization_id=v_ref.organization_id
    and status='active';

  if v_company.id is null or not v_company.referral_enabled then
    update public.beauty_referrals set status='cancelled',updated_at=now() where id=v_ref.id;
    return new;
  end if;

  insert into public.coiffure_loyalty_rewards(
    organization_id,client_id,source_type,source_key,title,description,reward_kind,reward_value,status,issued_at,expires_at,created_by
  )
  values(
    v_ref.organization_id,v_ref.referrer_client_id,'referral','referral:'||v_ref.id::text||':referrer',
    v_company.referral_referrer_reward_label,
    'Avantage obtenu après le premier rendez-vous terminé d’un filleul.',
    v_company.referral_referrer_reward_kind,v_company.referral_referrer_reward_value,'available',now(),
    now()+make_interval(days=>v_company.referral_referrer_reward_valid_days),null
  )
  on conflict(organization_id,client_id,source_key) where source_key is not null do nothing;

  insert into public.coiffure_loyalty_rewards(
    organization_id,client_id,source_type,source_key,title,description,reward_kind,reward_value,status,issued_at,expires_at,created_by
  )
  values(
    v_ref.organization_id,v_ref.referred_client_id,'referral','referral:'||v_ref.id::text||':referred',
    v_company.referral_referred_reward_label,
    'Avantage de bienvenue validé après votre premier rendez-vous terminé.',
    v_company.referral_referred_reward_kind,v_company.referral_referred_reward_value,'available',now(),
    now()+make_interval(days=>v_company.referral_referred_reward_valid_days),null
  )
  on conflict(organization_id,client_id,source_key) where source_key is not null do nothing;

  update public.beauty_referrals
  set status='qualified',qualified_at=now(),updated_at=now()
  where id=v_ref.id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    v_ref.organization_id,null,'beauty.referral_qualified','beauty_referral',v_ref.id::text,
    jsonb_build_object('company_id',v_ref.company_id,'appointment_id',new.id,'referrer_client_id',v_ref.referrer_client_id,'referred_client_id',v_ref.referred_client_id)
  );

  return new;
end;
$function$;
revoke all on function private.process_beauty_referral_qualification() from public;

drop trigger if exists beauty_referral_qualification_after_appointment on public.appointments;
create trigger beauty_referral_qualification_after_appointment
after update of status on public.appointments
for each row
when (new.status='completed' and old.status is distinct from new.status)
execute function private.process_beauty_referral_qualification();

CREATE OR REPLACE FUNCTION public.get_beauty_growth_dashboard(p_organization_id uuid, p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path = public, private, pg_catalog
AS $function$
declare
  v_result jsonb;
  v_slug text;
  v_review_summary jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise.'; end if;
  if not public.metier_company_access_allows(p_organization_id,p_company_id,(select auth.uid())) then
    raise exception 'Accès refusé à cette enseigne.';
  end if;

  select oc.public_slug into v_slug
  from public.organization_companies oc
  where oc.id=p_company_id
    and oc.organization_id=p_organization_id
    and oc.status='active';

  if v_slug is null then
    select oc.public_slug into v_slug
    from public.organization_companies oc
    where oc.id=p_company_id and oc.organization_id=p_organization_id;
  end if;

  v_review_summary:=private.beauty_company_review_growth_summary(p_organization_id,p_company_id);

  with client_stats as (
    select
      c.id,
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      c.birth_date,
      c.birthday_consent,
      c.marketing_opt_in,
      max(a.starts_at) filter (where a.status='completed') as last_visit,
      min(a.starts_at) filter (where a.status in ('pending','confirmed') and a.starts_at>=now()) as next_appointment
    from public.clients c
    left join public.appointments a
      on a.organization_id=c.organization_id
     and a.company_id=c.company_id
     and a.client_id=c.id
    where c.organization_id=p_organization_id
      and c.company_id=p_company_id
      and c.status='active'
    group by c.id
  ),
  opportunities as (
    select
      cs.*,
      public.beauty_next_birthday(cs.birth_date,current_date) as next_birthday,
      case
        when cs.birthday_consent and cs.birth_date is not null
         and public.beauty_next_birthday(cs.birth_date,current_date)<=current_date+30 then 'birthday'
        when cs.last_visit is not null and cs.last_visit<now()-interval '60 days' and cs.next_appointment is null then 'inactive'
        when cs.last_visit is not null and cs.last_visit<now()-interval '30 days' and cs.next_appointment is null then 'rebook_due'
        else null
      end as reason,
      case
        when cs.birthday_consent and cs.birth_date is not null
         and public.beauty_next_birthday(cs.birth_date,current_date)<=current_date+30 then 90
        when cs.last_visit is not null and cs.last_visit<now()-interval '90 days' and cs.next_appointment is null then 80
        when cs.last_visit is not null and cs.last_visit<now()-interval '60 days' and cs.next_appointment is null then 70
        when cs.last_visit is not null and cs.last_visit<now()-interval '30 days' and cs.next_appointment is null then 50
        else 0
      end as score
    from client_stats cs
  ),
  ranked as (
    select o.*,
      last_appt.id as last_appointment_id,
      last_appt.staff_id as last_staff_id,
      coalesce(
        (select jsonb_agg(asi.service_id order by asi.position)
         from public.appointment_service_items asi
         where asi.appointment_id=last_appt.id),
        case when last_appt.service_id is not null then jsonb_build_array(last_appt.service_id) else '[]'::jsonb end
      ) as last_service_ids,
      coalesce(
        (select string_agg(asi.service_name,' + ' order by asi.position)
         from public.appointment_service_items asi
         where asi.appointment_id=last_appt.id),
        s.name
      ) as last_service_name
    from opportunities o
    left join lateral (
      select a.*
      from public.appointments a
      where a.organization_id=p_organization_id
        and a.company_id=p_company_id
        and a.client_id=o.id
        and a.status='completed'
      order by a.starts_at desc
      limit 1
    ) last_appt on true
    left join public.services s on s.id=last_appt.service_id and s.organization_id=p_organization_id
    where o.reason is not null
  )
  select jsonb_build_object(
    'company',jsonb_build_object(
      'id',oc.id,
      'name',oc.name,
      'public_slug',oc.public_slug
    ),
    'summary',jsonb_build_object(
      'waiting',(select count(*) from public.beauty_waitlist_entries w where w.organization_id=p_organization_id and w.company_id=p_company_id and w.status='waiting'),
      'inactive',(select count(*) from ranked r where r.reason='inactive'),
      'birthday',(select count(*) from ranked r where r.reason='birthday'),
      'rebook_due',(select count(*) from ranked r where r.reason='rebook_due'),
      'verified_reviews',coalesce((v_review_summary->>'verified_reviews')::integer,0),
      'average_rating',case when v_review_summary->>'average_rating' is null then null else (v_review_summary->>'average_rating')::numeric end,
      'review_opportunities',coalesce((v_review_summary->>'review_opportunities')::integer,0),
      'qualified_referrals',(select count(*) from public.beauty_referrals br where br.organization_id=p_organization_id and br.company_id=p_company_id and br.status='qualified'),
      'pending_referrals',(select count(*) from public.beauty_referrals br where br.organization_id=p_organization_id and br.company_id=p_company_id and br.status='pending')
    ),
    'growth_settings',jsonb_build_object(
      'google_review_url',oc.google_review_url,
      'referral_enabled',oc.referral_enabled,
      'referrer_reward_label',oc.referral_referrer_reward_label,
      'referrer_reward_kind',oc.referral_referrer_reward_kind,
      'referrer_reward_value',oc.referral_referrer_reward_value,
      'referrer_reward_valid_days',oc.referral_referrer_reward_valid_days,
      'referred_reward_label',oc.referral_referred_reward_label,
      'referred_reward_kind',oc.referral_referred_reward_kind,
      'referred_reward_value',oc.referral_referred_reward_value,
      'referred_reward_valid_days',oc.referral_referred_reward_valid_days
    ),
    'opportunities',coalesce((
      select jsonb_agg(jsonb_build_object(
        'client_id',r.id,
        'first_name',r.first_name,
        'last_name',r.last_name,
        'email',r.email,
        'phone',r.phone,
        'reason',r.reason,
        'score',r.score,
        'last_visit',r.last_visit,
        'next_birthday',r.next_birthday,
        'last_staff_id',r.last_staff_id,
        'last_service_ids',r.last_service_ids,
        'last_service_name',r.last_service_name
      ) order by r.score desc,r.last_visit nulls last)
      from (select * from ranked order by score desc,last_visit nulls last limit 60) r
    ),'[]'::jsonb),
    'waitlist',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',w.id,
        'client_id',w.client_id,
        'client_name',trim(concat_ws(' ',c.first_name,c.last_name)),
        'email',c.email,
        'phone',c.phone,
        'service_ids',to_jsonb(w.service_ids),
        'service_names',coalesce((
          select string_agg(s.name,' + ' order by u.ord)
          from unnest(w.service_ids) with ordinality u(service_id,ord)
          join public.services s on s.id=u.service_id and s.organization_id=p_organization_id and s.company_id=p_company_id
        ),'Toutes prestations'),
        'staff_id',w.staff_id,
        'staff_name',st.display_name,
        'preferred_from',w.preferred_from,
        'preferred_to',w.preferred_to,
        'time_preference',w.time_preference,
        'notes',w.notes,
        'status',w.status,
        'created_at',w.created_at
      ) order by w.created_at desc)
      from public.beauty_waitlist_entries w
      join public.clients c on c.id=w.client_id and c.organization_id=w.organization_id and c.company_id=w.company_id
      left join public.staff st on st.id=w.staff_id and st.organization_id=w.organization_id
      where w.organization_id=p_organization_id
        and w.company_id=p_company_id
        and w.status in ('waiting','contacted')
    ),'[]'::jsonb),
    'clients',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'first_name',c.first_name,'last_name',c.last_name,'email',c.email,'phone',c.phone
      ) order by c.first_name,c.last_name)
      from public.clients c
      where c.organization_id=p_organization_id
        and c.company_id=p_company_id
        and c.status='active'
    ),'[]'::jsonb),
    'services',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',s.id,'name',s.name,'duration_minutes',s.duration_minutes,'price_cents',s.price_cents
      ) order by s.name)
      from public.services s
      where s.organization_id=p_organization_id
        and s.company_id=p_company_id
        and s.active=true
    ),'[]'::jsonb),
    'staff',coalesce((
      select jsonb_agg(jsonb_build_object('id',st.id,'name',st.display_name) order by st.display_name)
      from public.staff st
      where st.organization_id=p_organization_id
        and st.company_id=p_company_id
        and st.active=true
    ),'[]'::jsonb)
  )
  into v_result
  from public.organization_companies oc
  where oc.id=p_company_id
    and oc.organization_id=p_organization_id;

  return v_result;
end;
$function$;
revoke all on function public.get_beauty_growth_dashboard(uuid,uuid) from public;
grant execute on function public.get_beauty_growth_dashboard(uuid,uuid) to authenticated,service_role;

drop function if exists public.beauty_company_review_growth_summary(uuid,uuid);
drop function if exists public.process_beauty_referral_qualification();
