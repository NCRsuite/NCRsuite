create table if not exists public.beauty_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_ids uuid[] not null default '{}'::uuid[],
  staff_id uuid references public.staff(id) on delete set null,
  preferred_from date,
  preferred_to date,
  time_preference text not null default 'any',
  notes text,
  status text not null default 'waiting',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beauty_waitlist_service_count_check check (cardinality(service_ids) between 0 and 6),
  constraint beauty_waitlist_time_preference_check check (time_preference in ('any','morning','afternoon','evening')),
  constraint beauty_waitlist_status_check check (status in ('waiting','contacted','booked','cancelled')),
  constraint beauty_waitlist_date_range_check check (preferred_to is null or preferred_from is null or preferred_to>=preferred_from)
);

create index if not exists beauty_waitlist_scope_idx
  on public.beauty_waitlist_entries(organization_id,company_id,status,created_at desc);
create index if not exists beauty_waitlist_client_idx
  on public.beauty_waitlist_entries(client_id,status);
create index if not exists beauty_waitlist_company_fk_idx
  on public.beauty_waitlist_entries(company_id);
create index if not exists beauty_waitlist_staff_fk_idx
  on public.beauty_waitlist_entries(staff_id) where staff_id is not null;
create index if not exists beauty_waitlist_created_by_fk_idx
  on public.beauty_waitlist_entries(created_by) where created_by is not null;

CREATE OR REPLACE FUNCTION public.beauty_waitlist_scope_valid(p_organization_id uuid, p_company_id uuid, p_client_id uuid, p_service_ids uuid[], p_staff_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path = public, pg_catalog
AS $function$
  select exists(
    select 1
    from public.clients c
    where c.id=p_client_id
      and c.organization_id=p_organization_id
      and c.company_id=p_company_id
      and c.status='active'
  )
  and not exists(
    select 1
    from unnest(coalesce(p_service_ids,'{}'::uuid[])) sid(service_id)
    where not exists(
      select 1
      from public.services s
      where s.id=sid.service_id
        and s.organization_id=p_organization_id
        and s.company_id=p_company_id
        and s.active=true
    )
  )
  and (
    p_staff_id is null
    or exists(
      select 1
      from public.staff st
      where st.id=p_staff_id
        and st.organization_id=p_organization_id
        and st.company_id=p_company_id
        and st.active=true
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.beauty_enforce_waitlist_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_catalog
AS $function$
begin
  if not public.beauty_waitlist_scope_valid(new.organization_id,new.company_id,new.client_id,new.service_ids,new.staff_id) then
    raise exception 'La liste d’attente ne correspond pas à cette enseigne.';
  end if;
  return new;
end;
$function$;

drop trigger if exists beauty_waitlist_scope_guard on public.beauty_waitlist_entries;
create trigger beauty_waitlist_scope_guard
before insert or update on public.beauty_waitlist_entries
for each row execute function public.beauty_enforce_waitlist_scope();

drop trigger if exists beauty_waitlist_touch_updated_at on public.beauty_waitlist_entries;
create trigger beauty_waitlist_touch_updated_at
before update on public.beauty_waitlist_entries
for each row execute function public.set_updated_at();

alter table public.beauty_waitlist_entries enable row level security;

drop policy if exists beauty_waitlist_select on public.beauty_waitlist_entries;
create policy beauty_waitlist_select on public.beauty_waitlist_entries
for select to authenticated
using (public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid())));

drop policy if exists beauty_waitlist_insert on public.beauty_waitlist_entries;
create policy beauty_waitlist_insert on public.beauty_waitlist_entries
for insert to authenticated
with check (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and created_by=(select auth.uid())
);

drop policy if exists beauty_waitlist_update on public.beauty_waitlist_entries;
create policy beauty_waitlist_update on public.beauty_waitlist_entries
for update to authenticated
using (public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid())))
with check (public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid())));

drop policy if exists beauty_waitlist_delete on public.beauty_waitlist_entries;
create policy beauty_waitlist_delete on public.beauty_waitlist_entries
for delete to authenticated
using (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and public.has_org_role(organization_id,array['owner','admin','manager'])
);

revoke all on table public.beauty_waitlist_entries from anon;
grant select,insert,update,delete on table public.beauty_waitlist_entries to authenticated;
grant select,insert,update,delete on table public.beauty_waitlist_entries to service_role;

CREATE OR REPLACE FUNCTION public.beauty_next_birthday(p_birth_date date, p_from date DEFAULT CURRENT_DATE)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = pg_catalog
AS $function$
declare
  v_year integer;
  v_candidate date;
begin
  if p_birth_date is null then return null; end if;
  v_year:=extract(year from p_from)::integer;
  begin
    v_candidate:=make_date(v_year,extract(month from p_birth_date)::integer,extract(day from p_birth_date)::integer);
  exception when datetime_field_overflow then
    v_candidate:=make_date(v_year,2,28);
  end;
  if v_candidate<p_from then
    v_year:=v_year+1;
    begin
      v_candidate:=make_date(v_year,extract(month from p_birth_date)::integer,extract(day from p_birth_date)::integer);
    exception when datetime_field_overflow then
      v_candidate:=make_date(v_year,2,28);
    end;
  end if;
  return v_candidate;
end;
$function$;

CREATE OR REPLACE FUNCTION public.beauty_company_review_growth_summary(p_organization_id uuid, p_company_id uuid)
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

revoke all on function public.beauty_company_review_growth_summary(uuid,uuid) from public;
grant execute on function public.beauty_company_review_growth_summary(uuid,uuid) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_beauty_growth_dashboard(p_organization_id uuid, p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path = public, pg_catalog
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

  v_review_summary:=public.beauty_company_review_growth_summary(p_organization_id,p_company_id);

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
      'review_opportunities',coalesce((v_review_summary->>'review_opportunities')::integer,0)
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
