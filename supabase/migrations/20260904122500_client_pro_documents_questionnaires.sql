alter table public.organization_companies
  add column if not exists client_profile_activity text not null default 'general';

alter table public.organization_companies
  drop constraint if exists organization_companies_client_profile_activity_check;
alter table public.organization_companies
  add constraint organization_companies_client_profile_activity_check
  check (client_profile_activity in ('general','hair','barber','nails','lashes','aesthetics'));

create table if not exists public.beauty_client_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  title text not null,
  category text not null default 'other',
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint beauty_client_documents_title_check check (char_length(trim(title)) between 1 and 180),
  constraint beauty_client_documents_category_check check (category in ('questionnaire','consent','technical','reference','other')),
  constraint beauty_client_documents_size_check check (size_bytes between 1 and 15728640)
);

create table if not exists public.beauty_client_questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.organization_companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  activity_kind text not null,
  answers jsonb not null default '{}'::jsonb,
  source text not null default 'professional',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint beauty_client_questionnaire_activity_check check (activity_kind in ('general','hair','barber','nails','lashes','aesthetics')),
  constraint beauty_client_questionnaire_answers_object check (jsonb_typeof(answers)='object'),
  constraint beauty_client_questionnaire_source_check check (source in ('professional','client_portal'))
);

create index if not exists beauty_client_documents_scope_idx on public.beauty_client_documents(organization_id,company_id,client_id,created_at desc);
create index if not exists beauty_client_documents_appointment_idx on public.beauty_client_documents(appointment_id) where appointment_id is not null;
create index if not exists beauty_client_documents_company_fk_idx on public.beauty_client_documents(company_id);
create index if not exists beauty_client_documents_client_fk_idx on public.beauty_client_documents(client_id);
create index if not exists beauty_client_documents_created_by_fk_idx on public.beauty_client_documents(created_by) where created_by is not null;
create index if not exists beauty_client_questionnaire_scope_idx on public.beauty_client_questionnaire_responses(organization_id,company_id,client_id,created_at desc);
create index if not exists beauty_client_questionnaire_company_fk_idx on public.beauty_client_questionnaire_responses(company_id);
create index if not exists beauty_client_questionnaire_client_fk_idx on public.beauty_client_questionnaire_responses(client_id);
create index if not exists beauty_client_questionnaire_created_by_fk_idx on public.beauty_client_questionnaire_responses(created_by) where created_by is not null;

CREATE OR REPLACE FUNCTION public.beauty_enforce_client_record_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_catalog
AS $function$
declare
  v_appointment_id uuid := null;
begin
  if tg_table_name='beauty_client_notes' then
    v_appointment_id:=new.appointment_id;
  elsif tg_table_name='beauty_client_media' then
    v_appointment_id:=new.appointment_id;
  elsif tg_table_name='beauty_client_documents' then
    v_appointment_id:=new.appointment_id;
  end if;

  if not public.beauty_client_record_scope_valid(new.organization_id,new.company_id,new.client_id,v_appointment_id) then
    raise exception 'Le dossier Beauty ne correspond pas à cette enseigne ou à cette cliente.';
  end if;
  return new;
end;
$function$;

drop trigger if exists beauty_client_documents_scope_guard on public.beauty_client_documents;
create trigger beauty_client_documents_scope_guard
before insert or update on public.beauty_client_documents
for each row execute function public.beauty_enforce_client_record_scope();

drop trigger if exists beauty_client_questionnaire_scope_guard on public.beauty_client_questionnaire_responses;
create trigger beauty_client_questionnaire_scope_guard
before insert or update on public.beauty_client_questionnaire_responses
for each row execute function public.beauty_enforce_client_record_scope();

alter table public.beauty_client_documents enable row level security;
alter table public.beauty_client_questionnaire_responses enable row level security;

drop policy if exists beauty_client_documents_select on public.beauty_client_documents;
create policy beauty_client_documents_select on public.beauty_client_documents
for select to authenticated
using (public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid())));

drop policy if exists beauty_client_documents_insert on public.beauty_client_documents;
create policy beauty_client_documents_insert on public.beauty_client_documents
for insert to authenticated
with check (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and created_by=(select auth.uid())
);

drop policy if exists beauty_client_documents_delete on public.beauty_client_documents;
create policy beauty_client_documents_delete on public.beauty_client_documents
for delete to authenticated
using (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and (created_by=(select auth.uid()) or public.has_org_role(organization_id,array['owner','admin','manager']))
);

drop policy if exists beauty_client_questionnaire_select on public.beauty_client_questionnaire_responses;
create policy beauty_client_questionnaire_select on public.beauty_client_questionnaire_responses
for select to authenticated
using (public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid())));

drop policy if exists beauty_client_questionnaire_insert on public.beauty_client_questionnaire_responses;
create policy beauty_client_questionnaire_insert on public.beauty_client_questionnaire_responses
for insert to authenticated
with check (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and created_by=(select auth.uid())
);

drop policy if exists beauty_client_questionnaire_delete on public.beauty_client_questionnaire_responses;
create policy beauty_client_questionnaire_delete on public.beauty_client_questionnaire_responses
for delete to authenticated
using (
  public.metier_beauty_client_scope_allows(organization_id,company_id,client_id,(select auth.uid()))
  and public.has_org_role(organization_id,array['owner','admin','manager'])
);

revoke all on table public.beauty_client_documents from anon;
revoke all on table public.beauty_client_questionnaire_responses from anon;
grant select,insert,delete on table public.beauty_client_documents to authenticated;
grant select,insert,delete on table public.beauty_client_questionnaire_responses to authenticated;
grant select,insert,update,delete on table public.beauty_client_documents to service_role;
grant select,insert,update,delete on table public.beauty_client_questionnaire_responses to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'beauty-client-documents','beauty-client-documents',false,15728640,
  array[
    'application/pdf','image/jpeg','image/png','image/webp','text/plain',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict(id) do update
set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.can_access_beauty_client_document_object(p_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path = public, storage, pg_catalog
AS $function$
declare
  v_parts text[];
  v_org uuid;
  v_company uuid;
  v_client uuid;
begin
  if (select auth.uid()) is null then return false; end if;
  v_parts:=storage.foldername(p_name);
  if coalesce(array_length(v_parts,1),0)<3 then return false; end if;
  begin
    v_org:=v_parts[1]::uuid;
    v_company:=v_parts[2]::uuid;
    v_client:=v_parts[3]::uuid;
  exception when others then
    return false;
  end;
  return exists(
    select 1
    from public.clients c
    where c.id=v_client
      and c.organization_id=v_org
      and c.company_id=v_company
      and c.status<>'archived'
      and public.metier_beauty_client_scope_allows(v_org,v_company,v_client,(select auth.uid()))
  );
end;
$function$;

revoke all on function public.can_access_beauty_client_document_object(text) from public;
grant execute on function public.can_access_beauty_client_document_object(text) to authenticated,service_role;

drop policy if exists beauty_client_documents_storage_select on storage.objects;
create policy beauty_client_documents_storage_select on storage.objects
for select to authenticated
using (bucket_id='beauty-client-documents' and public.can_access_beauty_client_document_object(name));

drop policy if exists beauty_client_documents_storage_insert on storage.objects;
create policy beauty_client_documents_storage_insert on storage.objects
for insert to authenticated
with check (bucket_id='beauty-client-documents' and public.can_access_beauty_client_document_object(name));

drop policy if exists beauty_client_documents_storage_delete on storage.objects;
create policy beauty_client_documents_storage_delete on storage.objects
for delete to authenticated
using (bucket_id='beauty-client-documents' and public.can_access_beauty_client_document_object(name));

CREATE OR REPLACE FUNCTION public.metier_update_company_client_profile_activity(p_organization_id uuid, p_company_id uuid, p_activity text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_allowed boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if p_activity not in ('general','hair','barber','nails','lashes','aesthetics') then
    raise exception 'Profil métier invalide.';
  end if;

  v_allowed:=public.is_platform_super_admin()
    or public.has_org_role(p_organization_id,array['owner','admin'])
    or (
      public.has_org_role(p_organization_id,array['manager'])
      and public.metier_company_access_allows(p_organization_id,p_company_id,auth.uid())
    );

  if not v_allowed then raise exception 'Droits insuffisants pour cette enseigne.'; end if;

  update public.organization_companies
  set client_profile_activity=p_activity,updated_at=now()
  where id=p_company_id
    and organization_id=p_organization_id
    and status='active';

  if not found then raise exception 'Enseigne introuvable.'; end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,auth.uid(),'metier.company_client_profile_activity_updated','organization_company',p_company_id::text,
    jsonb_build_object('activity',p_activity)
  );

  return true;
end;
$function$;

revoke all on function public.metier_update_company_client_profile_activity(uuid,uuid,text) from public;
grant execute on function public.metier_update_company_client_profile_activity(uuid,uuid,text) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.save_beauty_client_questionnaire(p_organization_id uuid, p_company_id uuid, p_client_id uuid, p_activity_kind text, p_answers jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path = public, pg_catalog
AS $function$
declare
  v_id uuid;
  v_company_activity text;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise.'; end if;
  if jsonb_typeof(coalesce(p_answers,'{}'::jsonb))<>'object' then raise exception 'Réponses invalides.'; end if;

  select oc.client_profile_activity into v_company_activity
  from public.organization_companies oc
  where oc.id=p_company_id
    and oc.organization_id=p_organization_id
    and oc.status='active';

  if v_company_activity is null then raise exception 'Enseigne introuvable.'; end if;
  if p_activity_kind is distinct from v_company_activity then raise exception 'Le questionnaire ne correspond plus au profil métier de l’enseigne.'; end if;
  if not public.metier_beauty_client_scope_allows(p_organization_id,p_company_id,p_client_id,(select auth.uid())) then
    raise exception 'Accès refusé à cette fiche client.';
  end if;

  insert into public.beauty_client_questionnaire_responses(
    organization_id,company_id,client_id,activity_kind,answers,source,created_by
  )
  values(
    p_organization_id,p_company_id,p_client_id,p_activity_kind,coalesce(p_answers,'{}'::jsonb),'professional',(select auth.uid())
  )
  returning id into v_id;

  insert into public.beauty_client_profiles(
    organization_id,company_id,client_id,custom_fields,updated_by
  )
  values(
    p_organization_id,p_company_id,p_client_id,coalesce(p_answers,'{}'::jsonb),(select auth.uid())
  )
  on conflict(organization_id,company_id,client_id)
  do update set
    custom_fields=excluded.custom_fields,
    updated_by=(select auth.uid()),
    updated_at=now();

  return v_id;
end;
$function$;

revoke all on function public.save_beauty_client_questionnaire(uuid,uuid,uuid,text,jsonb) from public;
grant execute on function public.save_beauty_client_questionnaire(uuid,uuid,uuid,text,jsonb) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.metier_beauty_accessible_enseignes(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
declare
  v_plan text;
  v_business_type text;
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'Accès au centre requis.';
  end if;

  select o.plan::text, o.business_type::text
    into v_plan, v_business_type
  from public.organizations o
  where o.id = p_organization_id;

  if v_plan is distinct from 'metier' or v_business_type is distinct from 'coiffure' then
    raise exception 'Cette vue est réservée à Coiffure & Beauté Métier.';
  end if;

  return jsonb_build_object(
    'enseignes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'logo_url', c.logo_url,
          'primary_color', c.primary_color,
          'is_primary', c.is_primary,
          'booking_enabled', c.booking_enabled,
          'public_slug', c.public_slug,
          'public_page_enabled', c.public_page_enabled,
          'client_profile_activity', c.client_profile_activity,
          'public_banner_url', c.public_banner_url,
          'sites', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', s.id,
                'name', s.name,
                'is_primary', s.is_primary,
                'location_id', s.location_id,
                'location_name', l.name,
                'address', coalesce(l.address, s.address),
                'postal_code', coalesce(l.postal_code, s.postal_code),
                'city', coalesce(l.city, s.city)
              )
              order by s.is_primary desc, s.name
            )
            from public.organization_sites s
            left join public.organization_locations l on l.id = s.location_id
            where s.organization_id = p_organization_id
              and s.company_id = c.id
              and s.status = 'active'
              and public.metier_member_can_access_site(p_organization_id, s.id)
          ), '[]'::jsonb)
        )
        order by c.is_primary desc, c.name
      )
      from public.organization_companies c
      where c.organization_id = p_organization_id
        and c.status = 'active'
        and public.metier_company_access_allows(p_organization_id, c.id)
    ), '[]'::jsonb)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_beauty_client_crm(p_organization_id uuid, p_company_id uuid, p_client_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path = public, pg_catalog
AS $function$
declare
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.metier_beauty_client_scope_allows(p_organization_id,p_company_id,p_client_id,auth.uid()) then
    raise exception 'Accès refusé à cette fiche cliente.';
  end if;

  select jsonb_build_object(
    'client',jsonb_build_object(
      'id',c.id,'first_name',c.first_name,'last_name',c.last_name,'email',c.email,'phone',c.phone,
      'notes',c.notes,'birth_date',c.birth_date,'marketing_opt_in',c.marketing_opt_in,
      'birthday_consent',c.birthday_consent,'loyalty_opt_in',c.loyalty_opt_in,'created_at',c.created_at
    ),
    'summary',jsonb_build_object(
      'visit_count',coalesce(stats.visit_count,0),
      'total_spent_cents',coalesce(stats.total_spent_cents,0),
      'last_visit',stats.last_visit,
      'next_appointment',next_appt.next_appointment,
      'average_days_between',stats.average_days_between
    ),
    'activity_kind',coalesce((
      select oc.client_profile_activity
      from public.organization_companies oc
      where oc.id=p_company_id and oc.organization_id=p_organization_id
    ),'general'),
    'profile',coalesce((
      select to_jsonb(bp)-'organization_id'-'company_id'-'client_id'
      from public.beauty_client_profiles bp
      where bp.organization_id=p_organization_id and bp.company_id=p_company_id and bp.client_id=p_client_id
    ),'{}'::jsonb),
    'appointments',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'starts_at',a.starts_at,'ends_at',a.ends_at,'status',a.status,
        'amount_cents',a.amount_cents,'staff_name',coalesce(st.display_name,'Équipe'),
        'service_name',coalesce(
          (select string_agg(asi.service_name,' + ' order by asi.position)
           from public.appointment_service_items asi where asi.appointment_id=a.id),
          s.name,'Prestation'
        )
      ) order by a.starts_at desc)
      from (
        select * from public.appointments a0
        where a0.organization_id=p_organization_id
          and a0.company_id=p_company_id
          and a0.client_id=p_client_id
        order by a0.starts_at desc
        limit 30
      ) a
      left join public.staff st on st.organization_id=a.organization_id and st.id=a.staff_id
      left join public.services s on s.organization_id=a.organization_id and s.id=a.service_id
    ),'[]'::jsonb),
    'notes',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',n.id,'appointment_id',n.appointment_id,'note_type',n.note_type,'note',n.note,
        'created_by',n.created_by,'created_at',n.created_at,'updated_at',n.updated_at
      ) order by n.created_at desc)
      from public.beauty_client_notes n
      where n.organization_id=p_organization_id and n.company_id=p_company_id and n.client_id=p_client_id
    ),'[]'::jsonb),
    'media',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',m.id,'appointment_id',m.appointment_id,'media_kind',m.media_kind,'storage_path',m.storage_path,
        'caption',m.caption,'captured_at',m.captured_at,'created_by',m.created_by
      ) order by m.captured_at desc)
      from public.beauty_client_media m
      where m.organization_id=p_organization_id and m.company_id=p_company_id and m.client_id=p_client_id
    ),'[]'::jsonb),
    'documents',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',d.id,
        'appointment_id',d.appointment_id,
        'title',d.title,
        'category',d.category,
        'storage_path',d.storage_path,
        'mime_type',d.mime_type,
        'size_bytes',d.size_bytes,
        'created_by',d.created_by,
        'created_at',d.created_at
      ) order by d.created_at desc)
      from public.beauty_client_documents d
      where d.organization_id=p_organization_id
        and d.company_id=p_company_id
        and d.client_id=p_client_id
    ),'[]'::jsonb),
    'questionnaires',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',q.id,
        'activity_kind',q.activity_kind,
        'answers',q.answers,
        'source',q.source,
        'created_by',q.created_by,
        'created_at',q.created_at
      ) order by q.created_at desc)
      from (
        select *
        from public.beauty_client_questionnaire_responses q0
        where q0.organization_id=p_organization_id
          and q0.company_id=p_company_id
          and q0.client_id=p_client_id
        order by q0.created_at desc
        limit 12
      ) q
    ),'[]'::jsonb),
    'consents',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,'consent_type',x.consent_type,'granted',x.granted,'source',x.source,
        'recorded_at',x.recorded_at,'note',x.note
      ) order by x.recorded_at desc)
      from (
        select distinct on (bc.consent_type) bc.*
        from public.beauty_client_consents bc
        where bc.organization_id=p_organization_id and bc.company_id=p_company_id and bc.client_id=p_client_id
        order by bc.consent_type,bc.recorded_at desc
      ) x
    ),'[]'::jsonb)
  ) into v_result
  from public.clients c
  left join lateral (
    select
      count(*) filter (where a.status='completed')::integer visit_count,
      coalesce(sum(a.amount_cents) filter (where a.status='completed'),0)::bigint total_spent_cents,
      max(a.starts_at) filter (where a.status='completed') last_visit,
      case when count(*) filter (where a.status='completed')>=2 then
        round((extract(epoch from (
          max(a.starts_at) filter (where a.status='completed')
          - min(a.starts_at) filter (where a.status='completed')
        )) / 86400.0) / ((count(*) filter (where a.status='completed'))-1),1)
      else null end average_days_between
    from public.appointments a
    where a.organization_id=p_organization_id and a.company_id=p_company_id and a.client_id=p_client_id
  ) stats on true
  left join lateral (
    select min(a.starts_at) next_appointment
    from public.appointments a
    where a.organization_id=p_organization_id
      and a.company_id=p_company_id
      and a.client_id=p_client_id
      and a.status in ('pending','confirmed')
      and a.starts_at>=now()
  ) next_appt on true
  where c.id=p_client_id
    and c.organization_id=p_organization_id
    and c.company_id=p_company_id
    and c.status<>'archived';

  return v_result;
end;
$function$;
