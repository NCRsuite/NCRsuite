create table if not exists public.coiffure_company_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  reception_rating smallint not null check (reception_rating between 1 and 5),
  cleanliness_rating smallint not null check (cleanliness_rating between 1 and 5),
  ambiance_rating smallint not null check (ambiance_rating between 1 and 5),
  quality_rating smallint not null check (quality_rating between 1 and 5),
  comment text,
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id)
);

create index if not exists coiffure_company_reviews_public_idx
  on public.coiffure_company_reviews(company_id, status, created_at desc);
create index if not exists coiffure_company_reviews_client_idx
  on public.coiffure_company_reviews(organization_id, client_id, created_at desc);

alter table public.coiffure_company_reviews enable row level security;
revoke all on table public.coiffure_company_reviews from anon, authenticated;

create or replace function public.get_public_metier_coiffure_company_reviews(
  p_slug text,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_company_id uuid;
  v_organization_id uuid;
  v_limit integer := greatest(1, least(coalesce(p_limit,20), 50));
  v_summary jsonb;
  v_reviews jsonb;
begin
  select oc.id, oc.organization_id
    into v_company_id, v_organization_id
  from public.organization_companies oc
  join public.organizations o on o.id=oc.organization_id
  where lower(oc.public_slug)=lower(trim(coalesce(p_slug,'')))
    and oc.status='active'
    and oc.public_page_enabled=true
    and o.status in ('trial','active')
    and o.plan='metier'
    and o.business_type='coiffure'
  limit 1;

  if v_company_id is null then return null; end if;

  select jsonb_build_object(
    'count', count(*)::integer,
    'rating', round(avg(r.rating)::numeric,1),
    'reception', round(avg(r.reception_rating)::numeric,1),
    'cleanliness', round(avg(r.cleanliness_rating)::numeric,1),
    'ambiance', round(avg(r.ambiance_rating)::numeric,1),
    'quality', round(avg(r.quality_rating)::numeric,1)
  ) into v_summary
  from public.coiffure_company_reviews r
  where r.organization_id=v_organization_id
    and r.company_id=v_company_id
    and r.status='published';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'rating', q.rating,
    'reception_rating', q.reception_rating,
    'cleanliness_rating', q.cleanliness_rating,
    'ambiance_rating', q.ambiance_rating,
    'quality_rating', q.quality_rating,
    'comment', q.comment,
    'created_at', q.created_at,
    'reviewer_name', q.reviewer_name,
    'service_name', q.service_name,
    'staff_name', q.staff_name,
    'verified', true
  ) order by q.created_at desc),'[]'::jsonb)
  into v_reviews
  from (
    select r.id,r.rating,r.reception_rating,r.cleanliness_rating,r.ambiance_rating,r.quality_rating,
           r.comment,r.created_at,c.first_name as reviewer_name,
           coalesce(s.name,'Prestation') as service_name,
           coalesce(st.display_name,'Équipe de l’enseigne') as staff_name
    from public.coiffure_company_reviews r
    join public.clients c on c.organization_id=r.organization_id and c.id=r.client_id
    join public.appointments a on a.organization_id=r.organization_id and a.id=r.appointment_id
    left join public.services s on s.organization_id=a.organization_id and s.id=a.service_id
    left join public.staff st on st.organization_id=a.organization_id and st.id=a.staff_id
    where r.organization_id=v_organization_id
      and r.company_id=v_company_id
      and r.status='published'
    order by r.created_at desc
    limit v_limit
  ) q;

  return jsonb_build_object('summary',v_summary,'reviews',v_reviews);
end;
$$;

create or replace function public.coiffure_client_review_state(p_account_id uuid)
returns jsonb
language plpgsql
stable
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'appointment_id', q.appointment_id,
    'service_id', q.service_id,
    'staff_id', q.staff_id,
    'review_id', q.review_id,
    'can_review', q.review_id is null,
    'rating', q.rating,
    'comment', q.comment
  ) order by q.ends_at desc),'[]'::jsonb)
  into v_result
  from (
    select a.id as appointment_id,a.service_id,a.staff_id,a.ends_at,
           r.id as review_id,r.rating,r.comment
    from public.appointments a
    left join public.coiffure_company_reviews r
      on r.organization_id=a.organization_id and r.appointment_id=a.id
    where a.organization_id=v_account.organization_id
      and a.client_id=v_account.client_id
      and a.status='completed'
      and a.ends_at<=now()
      and v_company_id is not null
      and a.company_id=v_company_id
    order by a.ends_at desc
    limit 100
  ) q;

  return v_result;
end;
$$;

create or replace function public.submit_coiffure_client_review(
  p_account_id uuid,
  p_appointment_id uuid,
  p_rating smallint,
  p_reception_rating smallint,
  p_cleanliness_rating smallint,
  p_ambiance_rating smallint,
  p_quality_rating smallint,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_account public.coiffure_client_portal_accounts%rowtype;
  v_company_id uuid;
  v_appointment public.appointments%rowtype;
  v_review public.coiffure_company_reviews%rowtype;
begin
  if not public.is_coiffure_client_portal_account(p_account_id) then
    raise exception 'Accès refusé.';
  end if;

  if p_rating not between 1 and 5
     or p_reception_rating not between 1 and 5
     or p_cleanliness_rating not between 1 and 5
     or p_ambiance_rating not between 1 and 5
     or p_quality_rating not between 1 and 5 then
    raise exception 'Chaque note doit être comprise entre 1 et 5.';
  end if;

  if length(coalesce(p_comment,''))>1200 then
    raise exception 'Votre commentaire est trop long.';
  end if;

  select * into v_account
  from public.coiffure_client_portal_accounts
  where id=p_account_id;

  select c.company_id into v_company_id
  from public.clients c
  where c.organization_id=v_account.organization_id
    and c.id=v_account.client_id
    and c.status='active';

  if v_company_id is null then
    raise exception 'Votre dossier client n’est rattaché à aucune enseigne.';
  end if;

  select * into v_appointment
  from public.appointments a
  where a.organization_id=v_account.organization_id
    and a.id=p_appointment_id
    and a.client_id=v_account.client_id
    and a.company_id=v_company_id;

  if v_appointment.id is null then
    raise exception 'Rendez-vous introuvable.';
  end if;
  if v_appointment.status<>'completed' or v_appointment.ends_at>now() then
    raise exception 'Vous pourrez donner votre avis une fois le rendez-vous terminé.';
  end if;
  if exists (select 1 from public.coiffure_company_reviews where appointment_id=v_appointment.id) then
    raise exception 'Un avis a déjà été publié pour ce rendez-vous.';
  end if;

  insert into public.coiffure_company_reviews(
    organization_id,company_id,appointment_id,client_id,rating,reception_rating,
    cleanliness_rating,ambiance_rating,quality_rating,comment,status
  ) values (
    v_account.organization_id,v_company_id,v_appointment.id,v_account.client_id,p_rating,p_reception_rating,
    p_cleanliness_rating,p_ambiance_rating,p_quality_rating,nullif(trim(coalesce(p_comment,'')),''),'published'
  ) returning * into v_review;

  return jsonb_build_object(
    'id',v_review.id,
    'appointment_id',v_review.appointment_id,
    'rating',v_review.rating,
    'status',v_review.status,
    'created_at',v_review.created_at
  );
end;
$$;

grant execute on function public.get_public_metier_coiffure_company_reviews(text,integer) to anon, authenticated;
grant execute on function public.coiffure_client_review_state(uuid) to authenticated;
grant execute on function public.submit_coiffure_client_review(uuid,uuid,smallint,smallint,smallint,smallint,smallint,text) to authenticated;
