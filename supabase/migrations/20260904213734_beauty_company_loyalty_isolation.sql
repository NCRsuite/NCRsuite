create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table if not exists public.beauty_company_loyalty_settings
  (like public.coiffure_loyalty_settings including defaults including constraints);

alter table public.beauty_company_loyalty_settings
  add column if not exists company_id uuid;

alter table public.beauty_company_loyalty_settings
  alter column company_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.beauty_company_loyalty_settings'::regclass
      and contype='p'
  ) then
    alter table public.beauty_company_loyalty_settings
      add constraint beauty_company_loyalty_settings_pkey
      primary key (organization_id,company_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.beauty_company_loyalty_settings'::regclass
      and conname='beauty_company_loyalty_settings_organization_fk'
  ) then
    alter table public.beauty_company_loyalty_settings
      add constraint beauty_company_loyalty_settings_organization_fk
      foreign key (organization_id) references public.organizations(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.beauty_company_loyalty_settings'::regclass
      and conname='beauty_company_loyalty_settings_company_fk'
  ) then
    alter table public.beauty_company_loyalty_settings
      add constraint beauty_company_loyalty_settings_company_fk
      foreign key (company_id) references public.organization_companies(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.beauty_company_loyalty_settings'::regclass
      and conname='beauty_company_loyalty_settings_created_by_fk'
  ) then
    alter table public.beauty_company_loyalty_settings
      add constraint beauty_company_loyalty_settings_created_by_fk
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;
end $$;

create index if not exists beauty_company_loyalty_settings_company_idx
  on public.beauty_company_loyalty_settings(company_id);
create index if not exists beauty_company_loyalty_settings_created_by_idx
  on public.beauty_company_loyalty_settings(created_by) where created_by is not null;

alter table public.beauty_company_loyalty_settings enable row level security;
revoke all on table public.beauty_company_loyalty_settings from anon,authenticated;
grant select,insert,update,delete on table public.beauty_company_loyalty_settings to service_role;

insert into public.beauty_company_loyalty_settings
select s.*,c.id
from public.coiffure_loyalty_settings s
join public.organizations o on o.id=s.organization_id and o.business_type='coiffure'
join public.organization_companies c on c.organization_id=s.organization_id and c.status='active'
on conflict(organization_id,company_id) do nothing;

alter table public.coiffure_loyalty_ledger
  add column if not exists company_id uuid references public.organization_companies(id) on delete cascade;
alter table public.coiffure_loyalty_rewards
  add column if not exists company_id uuid references public.organization_companies(id) on delete cascade;
alter table public.coiffure_appointment_loyalty_state
  add column if not exists company_id uuid references public.organization_companies(id) on delete cascade;

update public.coiffure_loyalty_ledger l
set company_id=coalesce(
  (select a.company_id from public.appointments a where a.id=l.appointment_id),
  (select c.company_id from public.clients c where c.organization_id=l.organization_id and c.id=l.client_id)
)
where l.company_id is null
  and coalesce(
    (select a.company_id from public.appointments a where a.id=l.appointment_id),
    (select c.company_id from public.clients c where c.organization_id=l.organization_id and c.id=l.client_id)
  ) is not null;

update public.coiffure_loyalty_rewards r
set company_id=(
  select c.company_id from public.clients c
  where c.organization_id=r.organization_id and c.id=r.client_id
)
where r.company_id is null
  and exists(
    select 1 from public.clients c
    where c.organization_id=r.organization_id and c.id=r.client_id and c.company_id is not null
  );

update public.coiffure_appointment_loyalty_state st
set company_id=coalesce(
  (select a.company_id from public.appointments a where a.id=st.appointment_id),
  (select c.company_id from public.clients c where c.organization_id=st.organization_id and c.id=st.client_id)
)
where st.company_id is null
  and coalesce(
    (select a.company_id from public.appointments a where a.id=st.appointment_id),
    (select c.company_id from public.clients c where c.organization_id=st.organization_id and c.id=st.client_id)
  ) is not null;

create index if not exists coiffure_loyalty_ledger_company_client_idx
  on public.coiffure_loyalty_ledger(organization_id,company_id,client_id,created_at desc);
create index if not exists coiffure_loyalty_rewards_company_client_idx
  on public.coiffure_loyalty_rewards(organization_id,company_id,client_id,status,issued_at desc);
create index if not exists coiffure_appointment_loyalty_state_company_idx
  on public.coiffure_appointment_loyalty_state(organization_id,company_id,client_id);

create index if not exists coiffure_loyalty_ledger_company_fk_idx
  on public.coiffure_loyalty_ledger(company_id) where company_id is not null;
create index if not exists coiffure_loyalty_rewards_company_fk_idx
  on public.coiffure_loyalty_rewards(company_id) where company_id is not null;
create index if not exists coiffure_appointment_loyalty_state_company_fk_idx
  on public.coiffure_appointment_loyalty_state(company_id) where company_id is not null;

create index if not exists coiffure_appointment_loyalty_state_client_idx
  on public.coiffure_appointment_loyalty_state(organization_id,client_id);
create index if not exists coiffure_loyalty_ledger_created_by_idx
  on public.coiffure_loyalty_ledger(created_by) where created_by is not null;
create index if not exists coiffure_loyalty_ledger_reward_idx
  on public.coiffure_loyalty_ledger(organization_id,reward_id) where reward_id is not null;
create index if not exists coiffure_loyalty_rewards_created_by_idx
  on public.coiffure_loyalty_rewards(created_by) where created_by is not null;
create index if not exists coiffure_loyalty_rewards_redeemed_by_idx
  on public.coiffure_loyalty_rewards(redeemed_by) where redeemed_by is not null;

CREATE OR REPLACE FUNCTION public.beauty_enforce_company_loyalty_settings_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_catalog
AS $function$
begin
  if not exists(
    select 1
    from public.organization_companies c
    where c.id=new.company_id
      and c.organization_id=new.organization_id
      and c.status='active'
  ) then
    raise exception 'Le programme fidélité ne correspond pas à cette enseigne.';
  end if;
  return new;
end;
$function$;


drop trigger if exists beauty_company_loyalty_settings_scope_guard on public.beauty_company_loyalty_settings;
create trigger beauty_company_loyalty_settings_scope_guard
before insert or update on public.beauty_company_loyalty_settings
for each row execute function public.beauty_enforce_company_loyalty_settings_scope();

CREATE OR REPLACE FUNCTION public.beauty_enforce_loyalty_company_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_catalog
AS $function$
declare
  v_client_company uuid;
  v_appointment_company uuid;
  v_reward_company uuid;
begin
  select c.company_id into v_client_company
  from public.clients c
  where c.organization_id=new.organization_id
    and c.id=new.client_id;

  if not found then
    raise exception 'Client fidélité introuvable.';
  end if;

  if new.company_id is distinct from v_client_company then
    raise exception 'La fidélité doit rester dans l’enseigne du client.';
  end if;

  if tg_table_name='coiffure_loyalty_ledger' then
    if new.appointment_id is not null then
      select a.company_id into v_appointment_company
      from public.appointments a
      where a.id=new.appointment_id
        and a.organization_id=new.organization_id;

      if not found or v_appointment_company is distinct from new.company_id then
        raise exception 'Le rendez-vous ne correspond pas à l’enseigne de cette fidélité.';
      end if;
    end if;

    if new.reward_id is not null then
      select r.company_id into v_reward_company
      from public.coiffure_loyalty_rewards r
      where r.id=new.reward_id
        and r.organization_id=new.organization_id;

      if not found or v_reward_company is distinct from new.company_id then
        raise exception 'La récompense ne correspond pas à l’enseigne de cette fidélité.';
      end if;
    end if;
  elsif tg_table_name='coiffure_appointment_loyalty_state' then
    select a.company_id into v_appointment_company
    from public.appointments a
    where a.id=new.appointment_id
      and a.organization_id=new.organization_id;

    if not found or v_appointment_company is distinct from new.company_id then
      raise exception 'L’état fidélité du rendez-vous ne correspond pas à son enseigne.';
    end if;
  end if;

  return new;
end;
$function$;


drop trigger if exists beauty_loyalty_ledger_scope_guard on public.coiffure_loyalty_ledger;
create trigger beauty_loyalty_ledger_scope_guard
before insert or update on public.coiffure_loyalty_ledger
for each row execute function public.beauty_enforce_loyalty_company_scope();

drop trigger if exists beauty_loyalty_rewards_scope_guard on public.coiffure_loyalty_rewards;
create trigger beauty_loyalty_rewards_scope_guard
before insert or update on public.coiffure_loyalty_rewards
for each row execute function public.beauty_enforce_loyalty_company_scope();

drop trigger if exists beauty_loyalty_state_scope_guard on public.coiffure_appointment_loyalty_state;
create trigger beauty_loyalty_state_scope_guard
before insert or update on public.coiffure_appointment_loyalty_state
for each row execute function public.beauty_enforce_loyalty_company_scope();

CREATE OR REPLACE FUNCTION private.ensure_beauty_company_loyalty_settings(p_organization_id uuid, p_company_id uuid, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
begin
  if not exists(
    select 1
    from public.organization_companies c
    join public.organizations o on o.id=c.organization_id
    where c.id=p_company_id
      and c.organization_id=p_organization_id
      and c.status='active'
      and o.business_type='coiffure'
  ) then
    raise exception 'Enseigne Beauty introuvable.';
  end if;

  insert into public.beauty_company_loyalty_settings(organization_id,company_id,created_by)
  values(p_organization_id,p_company_id,p_created_by)
  on conflict(organization_id,company_id) do nothing;
end;
$function$;


CREATE OR REPLACE FUNCTION private.expire_beauty_company_loyalty_rewards(p_organization_id uuid, p_company_id uuid, p_client_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
begin
  update public.coiffure_loyalty_rewards
  set status='expired',updated_at=now()
  where organization_id=p_organization_id
    and company_id=p_company_id
    and (p_client_id is null or client_id=p_client_id)
    and status='available'
    and expires_at is not null
    and expires_at<now();
end;
$function$;


CREATE OR REPLACE FUNCTION private.issue_beauty_company_threshold_rewards(p_organization_id uuid, p_company_id uuid, p_client_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_settings public.beauty_company_loyalty_settings%rowtype;
  v_points integer;
  v_visits integer;
  v_reward_id uuid;
  v_guard integer:=0;
begin
  perform private.ensure_beauty_company_loyalty_settings(p_organization_id,p_company_id,null);

  select * into v_settings
  from public.beauty_company_loyalty_settings
  where organization_id=p_organization_id and company_id=p_company_id;

  if not v_settings.program_active then return; end if;
  if not exists(
    select 1 from public.clients c
    where c.organization_id=p_organization_id
      and c.company_id=p_company_id
      and c.id=p_client_id
      and c.status='active'
  ) then return; end if;

  if v_settings.points_enabled then
    loop
      select coalesce(sum(points_delta),0)::integer into v_points
      from public.coiffure_loyalty_ledger
      where organization_id=p_organization_id
        and company_id=p_company_id
        and client_id=p_client_id;

      exit when v_points<v_settings.points_reward_threshold or v_guard>=20;
      v_guard:=v_guard+1;

      insert into public.coiffure_loyalty_rewards(
        organization_id,company_id,client_id,source_type,title,reward_kind,reward_value,
        expires_at,created_by
      )
      values(
        p_organization_id,p_company_id,p_client_id,'points',v_settings.points_reward_label,
        v_settings.points_reward_kind,v_settings.points_reward_value,
        now()+make_interval(days=>v_settings.points_reward_valid_days),auth.uid()
      )
      returning id into v_reward_id;

      insert into public.coiffure_loyalty_ledger(
        organization_id,company_id,client_id,reward_id,entry_type,points_delta,label,created_by
      )
      values(
        p_organization_id,p_company_id,p_client_id,v_reward_id,'reward_exchange',
        -v_settings.points_reward_threshold,'Conversion de points en récompense',auth.uid()
      );
    end loop;
  end if;

  v_guard:=0;
  if v_settings.visits_enabled then
    loop
      select coalesce(sum(visits_delta),0)::integer into v_visits
      from public.coiffure_loyalty_ledger
      where organization_id=p_organization_id
        and company_id=p_company_id
        and client_id=p_client_id;

      exit when v_visits<v_settings.visits_required or v_guard>=20;
      v_guard:=v_guard+1;

      insert into public.coiffure_loyalty_rewards(
        organization_id,company_id,client_id,source_type,title,reward_kind,reward_value,
        expires_at,created_by
      )
      values(
        p_organization_id,p_company_id,p_client_id,'visits',v_settings.visits_reward_label,
        v_settings.visits_reward_kind,v_settings.visits_reward_value,
        now()+make_interval(days=>v_settings.visits_reward_valid_days),auth.uid()
      )
      returning id into v_reward_id;

      insert into public.coiffure_loyalty_ledger(
        organization_id,company_id,client_id,reward_id,entry_type,visits_delta,label,created_by
      )
      values(
        p_organization_id,p_company_id,p_client_id,v_reward_id,'reward_exchange',
        -v_settings.visits_required,'Conversion de passages en récompense',auth.uid()
      );
    end loop;
  end if;
end;
$function$;


CREATE OR REPLACE FUNCTION private.ensure_beauty_company_birthday_reward(p_organization_id uuid, p_company_id uuid, p_client_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_settings public.beauty_company_loyalty_settings%rowtype;
  v_client public.clients%rowtype;
  v_timezone text;
  v_today date;
  v_birthday date;
  v_year integer;
  v_source_key text;
begin
  perform private.ensure_beauty_company_loyalty_settings(p_organization_id,p_company_id,null);

  select * into v_settings
  from public.beauty_company_loyalty_settings
  where organization_id=p_organization_id and company_id=p_company_id;

  if not v_settings.program_active or not v_settings.birthday_enabled then return; end if;

  select * into v_client
  from public.clients
  where organization_id=p_organization_id
    and company_id=p_company_id
    and id=p_client_id
    and status='active';

  if v_client.id is null or v_client.birth_date is null or not v_client.birthday_consent then return; end if;

  select coalesce(
    (select os.timezone
     from public.organization_sites os
     where os.organization_id=p_organization_id
       and os.company_id=p_company_id
       and os.status='active'
     order by os.is_primary desc,os.created_at
     limit 1),
    o.timezone,
    'Europe/Paris'
  )
  into v_timezone
  from public.organizations o
  where o.id=p_organization_id;

  v_today:=(now() at time zone v_timezone)::date;
  v_year:=extract(year from v_today)::integer;
  begin
    v_birthday:=make_date(v_year,extract(month from v_client.birth_date)::integer,extract(day from v_client.birth_date)::integer);
  exception when others then
    v_birthday:=make_date(v_year,2,28);
  end;

  if v_today<v_birthday-v_settings.birthday_days_before
     or v_today>v_birthday+v_settings.birthday_reward_valid_days then return; end if;

  v_source_key:='birthday:'||v_year::text;

  insert into public.coiffure_loyalty_rewards(
    organization_id,company_id,client_id,source_type,source_key,title,
    reward_kind,reward_value,expires_at
  )
  values(
    p_organization_id,p_company_id,p_client_id,'birthday',v_source_key,
    v_settings.birthday_reward_label,v_settings.birthday_reward_kind,
    v_settings.birthday_reward_value,
    (v_birthday::timestamp at time zone v_timezone)+make_interval(days=>v_settings.birthday_reward_valid_days)
  )
  on conflict(organization_id,client_id,source_key) where source_key is not null do nothing;
end;
$function$;


CREATE OR REPLACE FUNCTION private.apply_beauty_company_welcome_benefit(p_organization_id uuid, p_company_id uuid, p_client_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_settings public.beauty_company_loyalty_settings%rowtype;
begin
  perform private.ensure_beauty_company_loyalty_settings(p_organization_id,p_company_id,null);

  select * into v_settings
  from public.beauty_company_loyalty_settings
  where organization_id=p_organization_id and company_id=p_company_id;

  if not v_settings.program_active or not v_settings.welcome_enabled then return; end if;

  if v_settings.welcome_points>0 and not exists(
    select 1
    from public.coiffure_loyalty_ledger
    where organization_id=p_organization_id
      and company_id=p_company_id
      and client_id=p_client_id
      and entry_type='welcome_bonus'
  ) then
    insert into public.coiffure_loyalty_ledger(
      organization_id,company_id,client_id,entry_type,points_delta,label
    )
    values(
      p_organization_id,p_company_id,p_client_id,'welcome_bonus',
      v_settings.welcome_points,'Bonus de bienvenue'
    );
  end if;

  insert into public.coiffure_loyalty_rewards(
    organization_id,company_id,client_id,source_type,source_key,title,
    reward_kind,reward_value,expires_at
  )
  values(
    p_organization_id,p_company_id,p_client_id,'welcome','welcome',
    v_settings.welcome_reward_label,v_settings.welcome_reward_kind,
    v_settings.welcome_reward_value,
    now()+make_interval(days=>v_settings.welcome_reward_valid_days)
  )
  on conflict(organization_id,client_id,source_key) where source_key is not null do nothing;

  perform private.issue_beauty_company_threshold_rewards(p_organization_id,p_company_id,p_client_id);
end;
$function$;


CREATE OR REPLACE FUNCTION private.beauty_company_loyalty_admin_overview(p_organization_id uuid, p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private, pg_catalog
AS $function$
declare
  v_result jsonb;
  v_client_id uuid;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour cette enseigne.';
  end if;

  perform private.ensure_beauty_company_loyalty_settings(p_organization_id,p_company_id,auth.uid());
  perform private.expire_beauty_company_loyalty_rewards(p_organization_id,p_company_id,null);

  for v_client_id in
    select c.id
    from public.clients c
    where c.organization_id=p_organization_id
      and c.company_id=p_company_id
      and c.status='active'
      and c.birth_date is not null
      and c.birthday_consent
  loop
    perform private.ensure_beauty_company_birthday_reward(p_organization_id,p_company_id,v_client_id);
  end loop;

  select jsonb_build_object(
    'settings',(
      select to_jsonb(s)
      from public.beauty_company_loyalty_settings s
      where s.organization_id=p_organization_id
        and s.company_id=p_company_id
    ),
    'summary',jsonb_build_object(
      'clients',(
        select count(*)
        from public.clients c
        where c.organization_id=p_organization_id
          and c.company_id=p_company_id
          and c.status='active'
      ),
      'members',(
        select count(*)
        from public.clients c
        where c.organization_id=p_organization_id
          and c.company_id=p_company_id
          and c.status='active'
          and c.loyalty_opt_in
      ),
      'portal_accounts',(
        select count(*)
        from public.coiffure_client_portal_accounts a
        join public.clients c
          on c.organization_id=a.organization_id
         and c.id=a.client_id
        where a.organization_id=p_organization_id
          and c.company_id=p_company_id
          and a.status='active'
      ),
      'available_rewards',(
        select count(*)
        from public.coiffure_loyalty_rewards r
        where r.organization_id=p_organization_id
          and r.company_id=p_company_id
          and r.status='available'
      )
    ),
    'clients',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,
        'first_name',c.first_name,
        'last_name',c.last_name,
        'email',c.email,
        'phone',c.phone,
        'birth_date',c.birth_date,
        'loyalty_opt_in',c.loyalty_opt_in,
        'birthday_consent',c.birthday_consent,
        'marketing_opt_in',c.marketing_opt_in,
        'points_balance',coalesce((
          select sum(l.points_delta)
          from public.coiffure_loyalty_ledger l
          where l.organization_id=c.organization_id
            and l.company_id=p_company_id
            and l.client_id=c.id
        ),0),
        'visits_balance',coalesce((
          select sum(l.visits_delta)
          from public.coiffure_loyalty_ledger l
          where l.organization_id=c.organization_id
            and l.company_id=p_company_id
            and l.client_id=c.id
        ),0),
        'available_rewards',(
          select count(*)
          from public.coiffure_loyalty_rewards r
          where r.organization_id=c.organization_id
            and r.company_id=p_company_id
            and r.client_id=c.id
            and r.status='available'
        ),
        'completed_appointments',(
          select count(*)
          from public.appointments a
          where a.organization_id=c.organization_id
            and a.company_id=p_company_id
            and a.client_id=c.id
            and a.status='completed'
        ),
        'portal_accounts',coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',a.id,'email',a.email,'display_name',a.display_name,
            'status',a.status,'last_seen_at',a.last_seen_at
          ) order by a.created_at desc)
          from public.coiffure_client_portal_accounts a
          where a.organization_id=c.organization_id
            and a.client_id=c.id
        ),'[]'::jsonb),
        'pending_invitations',coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',i.id,'email',i.email,'display_name',i.display_name,
            'status',case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,
            'expires_at',i.expires_at
          ) order by i.created_at desc)
          from public.coiffure_client_portal_invitations i
          where i.organization_id=c.organization_id
            and i.client_id=c.id
            and i.status='pending'
        ),'[]'::jsonb)
      ) order by c.first_name,c.last_name)
      from public.clients c
      where c.organization_id=p_organization_id
        and c.company_id=p_company_id
        and c.status='active'
    ),'[]'::jsonb),
    'rewards',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.id,
        'client_id',r.client_id,
        'source_type',r.source_type,
        'title',r.title,
        'description',r.description,
        'reward_kind',r.reward_kind,
        'reward_value',r.reward_value,
        'status',r.status,
        'issued_at',r.issued_at,
        'expires_at',r.expires_at,
        'redeemed_at',r.redeemed_at
      ) order by r.issued_at desc)
      from (
        select *
        from public.coiffure_loyalty_rewards
        where organization_id=p_organization_id
          and company_id=p_company_id
        order by issued_at desc
        limit 300
      ) r
    ),'[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$function$;


CREATE OR REPLACE FUNCTION private.update_beauty_company_loyalty_settings(p_organization_id uuid, p_company_id uuid, p_settings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private, pg_catalog
AS $function$
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid()) then
    raise exception 'Droits insuffisants pour cette enseigne.';
  end if;

  perform private.ensure_beauty_company_loyalty_settings(p_organization_id,p_company_id,auth.uid());

  update public.beauty_company_loyalty_settings set
    portal_enabled=coalesce((p_settings->>'portal_enabled')::boolean,portal_enabled),
    program_active=coalesce((p_settings->>'program_active')::boolean,program_active),
    program_name=coalesce(nullif(trim(p_settings->>'program_name'),''),program_name),
    program_description=case when p_settings ? 'program_description' then nullif(trim(p_settings->>'program_description'),'') else program_description end,
    points_enabled=coalesce((p_settings->>'points_enabled')::boolean,points_enabled),
    points_per_euro=coalesce((p_settings->>'points_per_euro')::integer,points_per_euro),
    points_per_visit=coalesce((p_settings->>'points_per_visit')::integer,points_per_visit),
    points_reward_threshold=coalesce((p_settings->>'points_reward_threshold')::integer,points_reward_threshold),
    points_reward_label=coalesce(nullif(trim(p_settings->>'points_reward_label'),''),points_reward_label),
    points_reward_kind=coalesce(nullif(trim(p_settings->>'points_reward_kind'),''),points_reward_kind),
    points_reward_value=coalesce((p_settings->>'points_reward_value')::integer,points_reward_value),
    points_reward_valid_days=coalesce((p_settings->>'points_reward_valid_days')::integer,points_reward_valid_days),
    visits_enabled=coalesce((p_settings->>'visits_enabled')::boolean,visits_enabled),
    visits_required=coalesce((p_settings->>'visits_required')::integer,visits_required),
    visits_reward_label=coalesce(nullif(trim(p_settings->>'visits_reward_label'),''),visits_reward_label),
    visits_reward_kind=coalesce(nullif(trim(p_settings->>'visits_reward_kind'),''),visits_reward_kind),
    visits_reward_value=coalesce((p_settings->>'visits_reward_value')::integer,visits_reward_value),
    visits_reward_valid_days=coalesce((p_settings->>'visits_reward_valid_days')::integer,visits_reward_valid_days),
    birthday_enabled=coalesce((p_settings->>'birthday_enabled')::boolean,birthday_enabled),
    birthday_days_before=coalesce((p_settings->>'birthday_days_before')::integer,birthday_days_before),
    birthday_reward_label=coalesce(nullif(trim(p_settings->>'birthday_reward_label'),''),birthday_reward_label),
    birthday_reward_kind=coalesce(nullif(trim(p_settings->>'birthday_reward_kind'),''),birthday_reward_kind),
    birthday_reward_value=coalesce((p_settings->>'birthday_reward_value')::integer,birthday_reward_value),
    birthday_reward_valid_days=coalesce((p_settings->>'birthday_reward_valid_days')::integer,birthday_reward_valid_days),
    welcome_enabled=coalesce((p_settings->>'welcome_enabled')::boolean,welcome_enabled),
    welcome_points=coalesce((p_settings->>'welcome_points')::integer,welcome_points),
    welcome_reward_label=coalesce(nullif(trim(p_settings->>'welcome_reward_label'),''),welcome_reward_label),
    welcome_reward_kind=coalesce(nullif(trim(p_settings->>'welcome_reward_kind'),''),welcome_reward_kind),
    welcome_reward_value=coalesce((p_settings->>'welcome_reward_value')::integer,welcome_reward_value),
    welcome_reward_valid_days=coalesce((p_settings->>'welcome_reward_valid_days')::integer,welcome_reward_valid_days),
    allow_client_birthdate_edit=coalesce((p_settings->>'allow_client_birthdate_edit')::boolean,allow_client_birthdate_edit),
    updated_at=now()
  where organization_id=p_organization_id
    and company_id=p_company_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'beauty.company_loyalty_settings_updated',
    'beauty_company_loyalty_settings',p_company_id::text,
    jsonb_build_object('company_id',p_company_id)
  );
end;
$function$;


CREATE OR REPLACE FUNCTION private.process_beauty_company_appointment_loyalty(p_appointment_id uuid, p_organization_id uuid, p_company_id uuid, p_client_id uuid, p_status text, p_amount_cents integer, p_old_client_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private, pg_catalog
AS $function$
declare
  v_settings public.beauty_company_loyalty_settings%rowtype;
  v_client public.clients%rowtype;
  v_state public.coiffure_appointment_loyalty_state%rowtype;
  v_points integer:=0;
  v_visits integer:=0;
begin
  perform private.ensure_beauty_company_loyalty_settings(p_organization_id,p_company_id,null);

  select * into v_settings
  from public.beauty_company_loyalty_settings
  where organization_id=p_organization_id and company_id=p_company_id;

  select * into v_client
  from public.clients
  where organization_id=p_organization_id
    and company_id=p_company_id
    and id=p_client_id;

  select * into v_state
  from public.coiffure_appointment_loyalty_state
  where appointment_id=p_appointment_id;

  if p_old_client_id is not null
     and p_old_client_id is distinct from p_client_id
     and v_state.appointment_id is not null
     and v_state.active then
    insert into public.coiffure_loyalty_ledger(
      organization_id,company_id,client_id,appointment_id,entry_type,
      points_delta,visits_delta,label
    )
    values(
      v_state.organization_id,v_state.company_id,v_state.client_id,p_appointment_id,
      'appointment_reversal',-v_state.points_awarded,-v_state.visits_awarded,
      'Régularisation du rendez-vous déplacé vers un autre client'
    );

    update public.coiffure_appointment_loyalty_state
    set active=false
    where appointment_id=p_appointment_id;

    select * into v_state
    from public.coiffure_appointment_loyalty_state
    where appointment_id=p_appointment_id;
  end if;

  if p_status='completed'
     and v_settings.program_active
     and (v_settings.points_enabled or v_settings.visits_enabled)
     and v_client.id is not null
     and v_client.loyalty_opt_in then

    v_points:=case when v_settings.points_enabled
      then floor(coalesce(p_amount_cents,0)::numeric/100*v_settings.points_per_euro)::integer+v_settings.points_per_visit
      else 0 end;
    v_visits:=case when v_settings.visits_enabled then 1 else 0 end;

    if v_state.appointment_id is null then
      insert into public.coiffure_appointment_loyalty_state(
        appointment_id,organization_id,company_id,client_id,points_awarded,visits_awarded,active
      )
      values(
        p_appointment_id,p_organization_id,p_company_id,p_client_id,v_points,v_visits,true
      );

      insert into public.coiffure_loyalty_ledger(
        organization_id,company_id,client_id,appointment_id,entry_type,
        points_delta,visits_delta,label
      )
      values(
        p_organization_id,p_company_id,p_client_id,p_appointment_id,'appointment_credit',
        v_points,v_visits,'Rendez-vous terminé'
      );

    elsif not v_state.active
       or v_state.client_id<>p_client_id
       or v_state.company_id is distinct from p_company_id then
      update public.coiffure_appointment_loyalty_state
      set organization_id=p_organization_id,
          company_id=p_company_id,
          client_id=p_client_id,
          points_awarded=v_points,
          visits_awarded=v_visits,
          active=true
      where appointment_id=p_appointment_id;

      insert into public.coiffure_loyalty_ledger(
        organization_id,company_id,client_id,appointment_id,entry_type,
        points_delta,visits_delta,label
      )
      values(
        p_organization_id,p_company_id,p_client_id,p_appointment_id,'appointment_credit',
        v_points,v_visits,'Rendez-vous revalidé comme terminé'
      );

    elsif v_state.points_awarded<>v_points or v_state.visits_awarded<>v_visits then
      insert into public.coiffure_loyalty_ledger(
        organization_id,company_id,client_id,appointment_id,entry_type,
        points_delta,visits_delta,label
      )
      values(
        p_organization_id,p_company_id,p_client_id,p_appointment_id,'appointment_adjustment',
        v_points-v_state.points_awarded,v_visits-v_state.visits_awarded,
        'Ajustement du rendez-vous terminé'
      );

      update public.coiffure_appointment_loyalty_state
      set points_awarded=v_points,visits_awarded=v_visits
      where appointment_id=p_appointment_id;
    end if;

    perform private.issue_beauty_company_threshold_rewards(p_organization_id,p_company_id,p_client_id);

  elsif p_status<>'completed'
     and v_state.appointment_id is not null
     and v_state.active then
    insert into public.coiffure_loyalty_ledger(
      organization_id,company_id,client_id,appointment_id,entry_type,
      points_delta,visits_delta,label
    )
    values(
      v_state.organization_id,v_state.company_id,v_state.client_id,p_appointment_id,
      'appointment_reversal',-v_state.points_awarded,-v_state.visits_awarded,
      'Rendez-vous retiré du statut terminé'
    );

    update public.coiffure_appointment_loyalty_state
    set active=false
    where appointment_id=p_appointment_id;
  end if;
end;
$function$;


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
    organization_id,company_id,client_id,source_type,source_key,title,description,reward_kind,reward_value,status,issued_at,expires_at,created_by
  )
  values(
    v_ref.organization_id,v_ref.company_id,v_ref.referrer_client_id,'referral','referral:'||v_ref.id::text||':referrer',
    v_company.referral_referrer_reward_label,
    'Avantage obtenu après le premier rendez-vous terminé d’un filleul.',
    v_company.referral_referrer_reward_kind,v_company.referral_referrer_reward_value,'available',now(),
    now()+make_interval(days=>v_company.referral_referrer_reward_valid_days),null
  )
  on conflict(organization_id,client_id,source_key) where source_key is not null do nothing;

  insert into public.coiffure_loyalty_rewards(
    organization_id,company_id,client_id,source_type,source_key,title,description,reward_kind,reward_value,status,issued_at,expires_at,created_by
  )
  values(
    v_ref.organization_id,v_ref.company_id,v_ref.referred_client_id,'referral','referral:'||v_ref.id::text||':referred',
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



CREATE OR REPLACE FUNCTION public.coiffure_company_loyalty_admin_overview(p_organization_id uuid, p_company_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path = public, private, pg_catalog
AS $function$
  select private.beauty_company_loyalty_admin_overview(p_organization_id,p_company_id);
$function$;


CREATE OR REPLACE FUNCTION public.update_coiffure_company_loyalty_settings(p_organization_id uuid, p_company_id uuid, p_settings jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path = public, private, pg_catalog
AS $function$
  select private.update_beauty_company_loyalty_settings(p_organization_id,p_company_id,p_settings);
$function$;


CREATE OR REPLACE FUNCTION public.issue_coiffure_threshold_rewards(p_organization_id uuid, p_client_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private, pg_catalog
AS $function$
declare
  v_company_id uuid;
  v_settings public.coiffure_loyalty_settings%rowtype;
  v_points integer;
  v_visits integer;
  v_reward_id uuid;
  v_guard integer:=0;
begin
  select c.company_id into v_company_id
  from public.clients c
  where c.organization_id=p_organization_id and c.id=p_client_id;

  if v_company_id is not null then
    perform private.issue_beauty_company_threshold_rewards(p_organization_id,v_company_id,p_client_id);
    return;
  end if;

  select * into v_settings
  from public.coiffure_loyalty_settings
  where organization_id=p_organization_id;

  if v_settings.organization_id is null or not v_settings.program_active then return; end if;

  if v_settings.points_enabled then
    loop
      select coalesce(sum(points_delta),0)::integer into v_points
      from public.coiffure_loyalty_ledger
      where organization_id=p_organization_id and company_id is null and client_id=p_client_id;
      exit when v_points<v_settings.points_reward_threshold or v_guard>=20;
      v_guard:=v_guard+1;

      insert into public.coiffure_loyalty_rewards(
        organization_id,company_id,client_id,source_type,title,reward_kind,reward_value,expires_at,created_by
      )
      values(
        p_organization_id,null,p_client_id,'points',v_settings.points_reward_label,
        v_settings.points_reward_kind,v_settings.points_reward_value,
        now()+make_interval(days=>v_settings.points_reward_valid_days),auth.uid()
      ) returning id into v_reward_id;

      insert into public.coiffure_loyalty_ledger(
        organization_id,company_id,client_id,reward_id,entry_type,points_delta,label,created_by
      )
      values(
        p_organization_id,null,p_client_id,v_reward_id,'reward_exchange',
        -v_settings.points_reward_threshold,'Conversion de points en récompense',auth.uid()
      );
    end loop;
  end if;

  v_guard:=0;
  if v_settings.visits_enabled then
    loop
      select coalesce(sum(visits_delta),0)::integer into v_visits
      from public.coiffure_loyalty_ledger
      where organization_id=p_organization_id and company_id is null and client_id=p_client_id;
      exit when v_visits<v_settings.visits_required or v_guard>=20;
      v_guard:=v_guard+1;

      insert into public.coiffure_loyalty_rewards(
        organization_id,company_id,client_id,source_type,title,reward_kind,reward_value,expires_at,created_by
      )
      values(
        p_organization_id,null,p_client_id,'visits',v_settings.visits_reward_label,
        v_settings.visits_reward_kind,v_settings.visits_reward_value,
        now()+make_interval(days=>v_settings.visits_reward_valid_days),auth.uid()
      ) returning id into v_reward_id;

      insert into public.coiffure_loyalty_ledger(
        organization_id,company_id,client_id,reward_id,entry_type,visits_delta,label,created_by
      )
      values(
        p_organization_id,null,p_client_id,v_reward_id,'reward_exchange',
        -v_settings.visits_required,'Conversion de passages en récompense',auth.uid()
      );
    end loop;
  end if;
end;
$function$;


CREATE OR REPLACE FUNCTION public.ensure_coiffure_birthday_reward(p_organization_id uuid, p_client_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private, pg_catalog
AS $function$
declare
  v_company_id uuid;
  v_settings public.coiffure_loyalty_settings%rowtype;
  v_client public.clients%rowtype;
  v_timezone text;
  v_today date;
  v_birthday date;
  v_year integer;
  v_source_key text;
begin
  select c.company_id into v_company_id
  from public.clients c
  where c.organization_id=p_organization_id and c.id=p_client_id;

  if v_company_id is not null then
    perform private.ensure_beauty_company_birthday_reward(p_organization_id,v_company_id,p_client_id);
    return;
  end if;

  select * into v_settings from public.coiffure_loyalty_settings where organization_id=p_organization_id;
  if v_settings.organization_id is null or not v_settings.program_active or not v_settings.birthday_enabled then return; end if;

  select * into v_client
  from public.clients
  where organization_id=p_organization_id and id=p_client_id and company_id is null and status='active';
  if v_client.id is null or v_client.birth_date is null or not v_client.birthday_consent then return; end if;

  select coalesce(timezone,'Europe/Paris') into v_timezone from public.organizations where id=p_organization_id;
  v_today:=(now() at time zone v_timezone)::date;
  v_year:=extract(year from v_today)::integer;
  begin
    v_birthday:=make_date(v_year,extract(month from v_client.birth_date)::integer,extract(day from v_client.birth_date)::integer);
  exception when others then
    v_birthday:=make_date(v_year,2,28);
  end;

  if v_today<v_birthday-v_settings.birthday_days_before
     or v_today>v_birthday+v_settings.birthday_reward_valid_days then return; end if;

  v_source_key:='birthday:'||v_year::text;
  insert into public.coiffure_loyalty_rewards(
    organization_id,company_id,client_id,source_type,source_key,title,reward_kind,reward_value,expires_at
  )
  values(
    p_organization_id,null,p_client_id,'birthday',v_source_key,v_settings.birthday_reward_label,
    v_settings.birthday_reward_kind,v_settings.birthday_reward_value,
    (v_birthday::timestamp at time zone v_timezone)+make_interval(days=>v_settings.birthday_reward_valid_days)
  )
  on conflict(organization_id,client_id,source_key) where source_key is not null do nothing;
end;
$function$;


CREATE OR REPLACE FUNCTION public.expire_coiffure_loyalty_rewards(p_organization_id uuid, p_client_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private, pg_catalog
AS $function$
declare
  v_company_id uuid;
begin
  if p_client_id is not null then
    select c.company_id into v_company_id
    from public.clients c
    where c.organization_id=p_organization_id and c.id=p_client_id;

    if v_company_id is not null then
      perform private.expire_beauty_company_loyalty_rewards(p_organization_id,v_company_id,p_client_id);
      return;
    end if;
  end if;

  update public.coiffure_loyalty_rewards
  set status='expired',updated_at=now()
  where organization_id=p_organization_id
    and company_id is null
    and (p_client_id is null or client_id=p_client_id)
    and status='available'
    and expires_at is not null
    and expires_at<now();
end;
$function$;


CREATE OR REPLACE FUNCTION public.apply_coiffure_welcome_benefit(p_organization_id uuid, p_client_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private, pg_catalog
AS $function$
declare
  v_company_id uuid;
  v_settings public.coiffure_loyalty_settings%rowtype;
begin
  select c.company_id into v_company_id
  from public.clients c
  where c.organization_id=p_organization_id and c.id=p_client_id;

  if v_company_id is not null then
    perform private.apply_beauty_company_welcome_benefit(p_organization_id,v_company_id,p_client_id);
    return;
  end if;

  select * into v_settings from public.coiffure_loyalty_settings where organization_id=p_organization_id;
  if v_settings.organization_id is null or not v_settings.program_active or not v_settings.welcome_enabled then return; end if;

  if v_settings.welcome_points>0 and not exists(
    select 1 from public.coiffure_loyalty_ledger
    where organization_id=p_organization_id and company_id is null and client_id=p_client_id and entry_type='welcome_bonus'
  ) then
    insert into public.coiffure_loyalty_ledger(
      organization_id,company_id,client_id,entry_type,points_delta,label
    )
    values(p_organization_id,null,p_client_id,'welcome_bonus',v_settings.welcome_points,'Bonus de bienvenue');
  end if;

  insert into public.coiffure_loyalty_rewards(
    organization_id,company_id,client_id,source_type,source_key,title,reward_kind,reward_value,expires_at
  )
  values(
    p_organization_id,null,p_client_id,'welcome','welcome',v_settings.welcome_reward_label,
    v_settings.welcome_reward_kind,v_settings.welcome_reward_value,
    now()+make_interval(days=>v_settings.welcome_reward_valid_days)
  )
  on conflict(organization_id,client_id,source_key) where source_key is not null do nothing;

  perform public.issue_coiffure_threshold_rewards(p_organization_id,p_client_id);
end;
$function$;


CREATE OR REPLACE FUNCTION public.adjust_coiffure_loyalty_balance(p_organization_id uuid, p_client_id uuid, p_points_delta integer DEFAULT 0, p_visits_delta integer DEFAULT 0, p_label text DEFAULT 'Ajustement manuel'::text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private, pg_catalog
AS $function$
declare
  v_company_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Droits insuffisants.';
  end if;
  if coalesce(p_points_delta,0)=0 and coalesce(p_visits_delta,0)=0 then
    raise exception 'Saisissez un ajustement.';
  end if;

  select c.company_id into v_company_id
  from public.clients c
  where c.organization_id=p_organization_id and c.id=p_client_id and c.status='active';
  if not found then raise exception 'Client introuvable.'; end if;

  if v_company_id is not null
     and not public.metier_company_access_allows(p_organization_id,v_company_id,auth.uid()) then
    raise exception 'Accès refusé à cette enseigne.';
  end if;

  insert into public.coiffure_loyalty_ledger(
    organization_id,company_id,client_id,entry_type,points_delta,visits_delta,label,note,created_by
  )
  values(
    p_organization_id,v_company_id,p_client_id,'manual_adjustment',
    coalesce(p_points_delta,0),coalesce(p_visits_delta,0),
    coalesce(nullif(trim(p_label),''),'Ajustement manuel'),
    nullif(trim(coalesce(p_note,'')),''),auth.uid()
  );

  perform public.issue_coiffure_threshold_rewards(p_organization_id,p_client_id);
end;
$function$;


CREATE OR REPLACE FUNCTION public.issue_coiffure_manual_reward(p_organization_id uuid, p_client_id uuid, p_title text, p_description text DEFAULT NULL::text, p_reward_kind text DEFAULT 'custom'::text, p_reward_value integer DEFAULT 0, p_valid_days integer DEFAULT 90)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_id uuid;
  v_company_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Droits insuffisants.';
  end if;
  if p_reward_kind not in ('discount_percent','discount_fixed','free_service','gift','custom') then
    raise exception 'Type de récompense invalide.';
  end if;

  select c.company_id into v_company_id
  from public.clients c
  where c.organization_id=p_organization_id and c.id=p_client_id and c.status='active';
  if not found then raise exception 'Client introuvable.'; end if;

  if v_company_id is not null
     and not public.metier_company_access_allows(p_organization_id,v_company_id,auth.uid()) then
    raise exception 'Accès refusé à cette enseigne.';
  end if;

  insert into public.coiffure_loyalty_rewards(
    organization_id,company_id,client_id,source_type,title,description,reward_kind,reward_value,expires_at,created_by
  )
  values(
    p_organization_id,v_company_id,p_client_id,'manual',trim(p_title),
    nullif(trim(coalesce(p_description,'')),''),p_reward_kind,coalesce(p_reward_value,0),
    now()+make_interval(days=>greatest(1,least(coalesce(p_valid_days,90),730))),auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$function$;


CREATE OR REPLACE FUNCTION public.set_coiffure_loyalty_reward_status(p_organization_id uuid, p_reward_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_company_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Droits insuffisants.';
  end if;
  if p_status not in ('available','redeemed','cancelled') then raise exception 'Statut invalide.'; end if;

  select r.company_id into v_company_id
  from public.coiffure_loyalty_rewards r
  where r.organization_id=p_organization_id and r.id=p_reward_id;

  if not found then raise exception 'Récompense introuvable ou expirée.'; end if;
  if v_company_id is not null
     and not public.metier_company_access_allows(p_organization_id,v_company_id,auth.uid()) then
    raise exception 'Accès refusé à cette enseigne.';
  end if;

  update public.coiffure_loyalty_rewards
  set status=p_status,
      redeemed_at=case when p_status='redeemed' then now() else null end,
      redeemed_by=case when p_status='redeemed' then auth.uid() else null end,
      updated_at=now()
  where organization_id=p_organization_id
    and id=p_reward_id
    and status<>'expired';

  if not found then raise exception 'Récompense introuvable ou expirée.'; end if;
end;
$function$;


CREATE OR REPLACE FUNCTION public.update_coiffure_client_loyalty_profile(p_organization_id uuid, p_client_id uuid, p_birth_date date, p_loyalty_opt_in boolean, p_birthday_consent boolean, p_marketing_opt_in boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private, pg_catalog
AS $function$
declare
  v_company_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Droits insuffisants.';
  end if;

  select c.company_id into v_company_id
  from public.clients c
  where c.organization_id=p_organization_id and c.id=p_client_id and c.status='active';
  if not found then raise exception 'Client introuvable.'; end if;

  if v_company_id is not null
     and not public.metier_company_access_allows(p_organization_id,v_company_id,auth.uid()) then
    raise exception 'Accès refusé à cette enseigne.';
  end if;

  update public.clients
  set birth_date=p_birth_date,
      loyalty_opt_in=coalesce(p_loyalty_opt_in,true),
      birthday_consent=coalesce(p_birthday_consent,false),
      marketing_opt_in=coalesce(p_marketing_opt_in,false),
      updated_at=now()
  where organization_id=p_organization_id and id=p_client_id and status='active';

  if v_company_id is not null then
    perform private.ensure_beauty_company_birthday_reward(p_organization_id,v_company_id,p_client_id);
  else
    perform public.ensure_coiffure_birthday_reward(p_organization_id,p_client_id);
  end if;
end;
$function$;


CREATE OR REPLACE FUNCTION public.process_coiffure_appointment_loyalty()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private, pg_catalog
AS $function$
declare
  v_settings public.coiffure_loyalty_settings%rowtype;
  v_client public.clients%rowtype;
  v_state public.coiffure_appointment_loyalty_state%rowtype;
  v_points integer := 0;
  v_visits integer := 0;
  v_old_state public.coiffure_appointment_loyalty_state%rowtype;
begin
  if tg_op='UPDATE'
     and old.company_id is distinct from new.company_id
     and old.company_id is not null then
    perform private.process_beauty_company_appointment_loyalty(
      new.id,old.organization_id,old.company_id,old.client_id,'cancelled',
      old.amount_cents,old.client_id
    );
  end if;

  if new.company_id is not null then
    if tg_op='UPDATE' and old.company_id is not distinct from new.company_id then
      perform private.process_beauty_company_appointment_loyalty(
        new.id,new.organization_id,new.company_id,new.client_id,new.status,
        new.amount_cents,old.client_id
      );
    else
      perform private.process_beauty_company_appointment_loyalty(
        new.id,new.organization_id,new.company_id,new.client_id,new.status,
        new.amount_cents,null
      );
    end if;
    return new;
  end if;

  if not exists (
    select 1 from public.organizations
    where id = new.organization_id and business_type = 'coiffure'
  ) then return new; end if;

  insert into public.coiffure_loyalty_settings(organization_id)
  values(new.organization_id)
  on conflict(organization_id) do nothing;

  select * into v_settings from public.coiffure_loyalty_settings where organization_id = new.organization_id;
  select * into v_client from public.clients where organization_id = new.organization_id and id = new.client_id;

  -- Si le rendez-vous terminé change de client, on retire d'abord l'ancien crédit.
  if tg_op = 'UPDATE' and old.client_id is distinct from new.client_id then
    select * into v_old_state from public.coiffure_appointment_loyalty_state where appointment_id = new.id;
    if v_old_state.appointment_id is not null and v_old_state.active then
      insert into public.coiffure_loyalty_ledger(
        organization_id, client_id, appointment_id, entry_type,
        points_delta, visits_delta, label
      ) values (
        old.organization_id, v_old_state.client_id, new.id, 'appointment_reversal',
        -v_old_state.points_awarded, -v_old_state.visits_awarded,
        'Régularisation du rendez-vous déplacé vers un autre client'
      );
      update public.coiffure_appointment_loyalty_state set active = false where appointment_id = new.id;
    end if;
  end if;

  select * into v_state from public.coiffure_appointment_loyalty_state where appointment_id = new.id;

  if new.status = 'completed'
     and v_settings.program_active
     and (v_settings.points_enabled or v_settings.visits_enabled)
     and v_client.id is not null
     and v_client.loyalty_opt_in then
    v_points := case when v_settings.points_enabled
      then floor(coalesce(new.amount_cents, 0)::numeric / 100 * v_settings.points_per_euro)::integer + v_settings.points_per_visit
      else 0 end;
    v_visits := case when v_settings.visits_enabled then 1 else 0 end;

    if v_state.appointment_id is null then
      insert into public.coiffure_appointment_loyalty_state(
        appointment_id, organization_id, client_id, points_awarded, visits_awarded, active
      ) values (new.id, new.organization_id, new.client_id, v_points, v_visits, true);
      insert into public.coiffure_loyalty_ledger(
        organization_id, client_id, appointment_id, entry_type,
        points_delta, visits_delta, label
      ) values (
        new.organization_id, new.client_id, new.id, 'appointment_credit',
        v_points, v_visits, 'Rendez-vous terminé'
      );
    elsif not v_state.active or v_state.client_id <> new.client_id then
      update public.coiffure_appointment_loyalty_state
      set organization_id = new.organization_id, client_id = new.client_id,
          points_awarded = v_points, visits_awarded = v_visits, active = true
      where appointment_id = new.id;
      insert into public.coiffure_loyalty_ledger(
        organization_id, client_id, appointment_id, entry_type,
        points_delta, visits_delta, label
      ) values (
        new.organization_id, new.client_id, new.id, 'appointment_credit',
        v_points, v_visits, 'Rendez-vous revalidé comme terminé'
      );
    elsif v_state.points_awarded <> v_points or v_state.visits_awarded <> v_visits then
      insert into public.coiffure_loyalty_ledger(
        organization_id, client_id, appointment_id, entry_type,
        points_delta, visits_delta, label
      ) values (
        new.organization_id, new.client_id, new.id, 'appointment_adjustment',
        v_points - v_state.points_awarded, v_visits - v_state.visits_awarded,
        'Ajustement du rendez-vous terminé'
      );
      update public.coiffure_appointment_loyalty_state
      set points_awarded = v_points, visits_awarded = v_visits
      where appointment_id = new.id;
    end if;

    perform public.issue_coiffure_threshold_rewards(new.organization_id, new.client_id);
  elsif new.status <> 'completed' and v_state.appointment_id is not null and v_state.active then
    insert into public.coiffure_loyalty_ledger(
      organization_id, client_id, appointment_id, entry_type,
      points_delta, visits_delta, label
    ) values (
      v_state.organization_id, v_state.client_id, new.id, 'appointment_reversal',
      -v_state.points_awarded, -v_state.visits_awarded,
      'Rendez-vous retiré du statut terminé'
    );
    update public.coiffure_appointment_loyalty_state set active = false where appointment_id = new.id;
  end if;

  return new;
end;
$function$;


CREATE OR REPLACE FUNCTION public.coiffure_client_portal_dashboard(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private, pg_catalog
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

  if v_company_id is not null then
    perform private.ensure_beauty_company_loyalty_settings(v_account.organization_id,v_company_id,null);
  end if;

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
    'settings', case when v_company_id is not null then
      (select to_jsonb(s) from public.beauty_company_loyalty_settings s
       where s.organization_id=v_account.organization_id and s.company_id=v_company_id)
    else
      (select to_jsonb(s) from public.coiffure_loyalty_settings s
       where s.organization_id=v_account.organization_id)
    end,
    'balance', jsonb_build_object(
      'points',coalesce((select sum(l.points_delta) from public.coiffure_loyalty_ledger l where l.organization_id=v_account.organization_id and l.client_id=v_account.client_id and l.company_id is not distinct from v_company_id),0),
      'visits',coalesce((select sum(l.visits_delta) from public.coiffure_loyalty_ledger l where l.organization_id=v_account.organization_id and l.client_id=v_account.client_id and l.company_id is not distinct from v_company_id),0)
    ),
    'rewards',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.id,'source_type',r.source_type,'title',r.title,'description',r.description,
        'reward_kind',r.reward_kind,'reward_value',r.reward_value,'status',r.status,
        'issued_at',r.issued_at,'expires_at',r.expires_at,'redeemed_at',r.redeemed_at
      ) order by case when r.status='available' then 0 else 1 end,r.issued_at desc)
      from public.coiffure_loyalty_rewards r
      where r.organization_id=v_account.organization_id and r.client_id=v_account.client_id
        and r.company_id is not distinct from v_company_id
    ),'[]'::jsonb),
    'history',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',l.id,'entry_type',l.entry_type,'points_delta',l.points_delta,'visits_delta',l.visits_delta,
        'label',l.label,'created_at',l.created_at
      ) order by l.created_at desc)
      from (
        select * from public.coiffure_loyalty_ledger
        where organization_id=v_account.organization_id and client_id=v_account.client_id
          and company_id is not distinct from v_company_id
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



revoke all on function private.beauty_company_loyalty_admin_overview(uuid,uuid) from public;
grant execute on function private.beauty_company_loyalty_admin_overview(uuid,uuid) to authenticated,service_role;

revoke all on function private.update_beauty_company_loyalty_settings(uuid,uuid,jsonb) from public;
grant execute on function private.update_beauty_company_loyalty_settings(uuid,uuid,jsonb) to authenticated,service_role;

revoke all on function private.ensure_beauty_company_loyalty_settings(uuid,uuid,uuid) from public,authenticated;
revoke all on function private.expire_beauty_company_loyalty_rewards(uuid,uuid,uuid) from public,authenticated;
revoke all on function private.issue_beauty_company_threshold_rewards(uuid,uuid,uuid) from public,authenticated;
revoke all on function private.ensure_beauty_company_birthday_reward(uuid,uuid,uuid) from public,authenticated;
revoke all on function private.apply_beauty_company_welcome_benefit(uuid,uuid,uuid) from public,authenticated;
revoke all on function private.process_beauty_company_appointment_loyalty(uuid,uuid,uuid,uuid,text,integer,uuid) from public,authenticated;
revoke all on function private.process_beauty_referral_qualification() from public,authenticated;

grant execute on function private.ensure_beauty_company_loyalty_settings(uuid,uuid,uuid) to service_role;
grant execute on function private.expire_beauty_company_loyalty_rewards(uuid,uuid,uuid) to service_role;
grant execute on function private.issue_beauty_company_threshold_rewards(uuid,uuid,uuid) to service_role;
grant execute on function private.ensure_beauty_company_birthday_reward(uuid,uuid,uuid) to service_role;
grant execute on function private.apply_beauty_company_welcome_benefit(uuid,uuid,uuid) to service_role;
grant execute on function private.process_beauty_company_appointment_loyalty(uuid,uuid,uuid,uuid,text,integer,uuid) to service_role;

revoke all on function public.coiffure_company_loyalty_admin_overview(uuid,uuid) from public;
grant execute on function public.coiffure_company_loyalty_admin_overview(uuid,uuid) to authenticated,service_role;

revoke all on function public.update_coiffure_company_loyalty_settings(uuid,uuid,jsonb) from public;
grant execute on function public.update_coiffure_company_loyalty_settings(uuid,uuid,jsonb) to authenticated,service_role;

revoke all on function public.beauty_enforce_loyalty_company_scope() from public,anon,authenticated;
revoke all on function public.beauty_enforce_company_loyalty_settings_scope() from public,anon,authenticated;

drop trigger if exists process_coiffure_appointment_loyalty on public.appointments;
create trigger process_coiffure_appointment_loyalty
after insert or update of status,amount_cents,client_id,company_id on public.appointments
for each row execute function public.process_coiffure_appointment_loyalty();