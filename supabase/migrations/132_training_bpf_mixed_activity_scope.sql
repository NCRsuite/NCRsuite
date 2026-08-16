-- NCR Suite V2.29.18 — BPF mixte : champ réglementaire + consolidation formateur
-- Objectif : ne jamais intégrer automatiquement de la formation initiale dans le BPF,
-- tout en consolidant les sous-traitances éligibles du formateur dans son propre organisme déclarant.
begin;

alter table public.training_sessions
  add column if not exists bpf_regulatory_scope text not null default 'review_required';
alter table public.training_sessions
  drop constraint if exists training_sessions_bpf_regulatory_scope_check;
alter table public.training_sessions
  add constraint training_sessions_bpf_regulatory_scope_check
  check (bpf_regulatory_scope in ('review_required','professional_continuing','apprenticeship','initial_education','out_of_scope'));
create index if not exists idx_training_sessions_bpf_scope
  on public.training_sessions(organization_id,status,ends_at,bpf_regulatory_scope);

alter table public.training_invoices
  add column if not exists bpf_included boolean not null default true;
create index if not exists idx_training_invoices_bpf_included
  on public.training_invoices(organization_id,bpf_included,issue_date,status);

create table if not exists public.training_trainer_bpf_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reporting_organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.training_trainer_bpf_preferences enable row level security;
drop policy if exists training_trainer_bpf_preferences_select on public.training_trainer_bpf_preferences;
create policy training_trainer_bpf_preferences_select on public.training_trainer_bpf_preferences
for select to authenticated using (user_id=auth.uid());

-- Les lignes pédagogiques BPF n'exposent que les actions réellement dans le champ.
create or replace function public.training_bpf_participant_rows(
  p_organization_id uuid,
  p_start date,
  p_end date
)
returns table (
  session_id uuid,
  trainee_id uuid,
  trainee_type text,
  attended_hours numeric,
  delivery_mode text,
  objective text,
  rncp_level text,
  specialty_code text,
  specialty_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    e.trainee_id,
    e.bpf_trainee_type,
    round(greatest(0::numeric,
      case
        when e.bpf_attended_hours is not null then e.bpf_attended_hours
        when e.status='absent' then 0::numeric
        when coalesce(a.marked_periods,0)>0 then p.duration_hours*coalesce(a.present_periods,0)::numeric/a.marked_periods::numeric
        else p.duration_hours
      end),2) as attended_hours,
    s.bpf_delivery_mode,
    p.bpf_objective,
    p.bpf_rncp_level,
    p.bpf_specialty_code,
    p.bpf_specialty_name
  from public.training_sessions s
  join public.training_programs p on p.organization_id=s.organization_id and p.id=s.program_id
  join public.training_session_enrollments e on e.organization_id=s.organization_id and e.session_id=s.id
  left join lateral (
    select
      count(*) filter(where a1.status in ('present','absent','excused')) as marked_periods,
      count(*) filter(where a1.status='present') as present_periods
    from public.training_attendance a1
    where a1.organization_id=e.organization_id and a1.session_id=e.session_id and a1.trainee_id=e.trainee_id
  ) a on true
  where s.organization_id=p_organization_id
    and s.status='completed'
    and s.ends_at::date between p_start and p_end
    and s.bpf_regulatory_scope in ('professional_continuing','apprenticeship')
    and e.status<>'canceled';
$$;
revoke all on function public.training_bpf_participant_rows(uuid,date,date) from public,anon,authenticated;

-- Repose le calcul historique sur le périmètre réglementaire filtré.
create or replace function public.refresh_training_bpf_report_commercial_legacy(
  p_organization_id uuid,
  p_report_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.training_bpf_reports%rowtype;
  v_org public.organizations%rowtype;
  v_revenue_keys text[] := array[
    'companies','apprenticeship','professionalization','pro_a','transition','cpf',
    'jobseekers_funds','self_employed_funds','skills_plan','public_agents','eu',
    'state','regions','france_travail','other_public','individuals',
    'training_organizations','other_training'
  ];
  v_auto_revenues jsonb := '{}'::jsonb;
  v_revenues jsonb := '{}'::jsonb;
  v_trainee_categories jsonb := '{}'::jsonb;
  v_trainee_total jsonb := '{"count":0,"hours":0}'::jsonb;
  v_outsourced jsonb := '{"count":0,"hours":0}'::jsonb;
  v_subcontracted jsonb := '{"count":0,"hours":0}'::jsonb;
  v_objectives jsonb := '{}'::jsonb;
  v_rncp_levels jsonb := '{}'::jsonb;
  v_specialties jsonb := '[]'::jsonb;
  v_other_specialties jsonb := '{"count":0,"hours":0}'::jsonb;
  v_trainers jsonb := '{}'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_warning_batch jsonb;
  v_data jsonb;
  v_key text;
  v_auto_value bigint;
  v_total_products bigint := 0;
  v_training_percent integer := 0;
  v_completed_sessions integer := 0;
  v_enrollments integer := 0;
  v_included_documents integer := 0;
  v_unincluded_documents integer := 0;
  v_distance_learning boolean := false;
  v_critical_count integer := 0;
  v_warning_count integer := 0;
  v_completeness integer := 0;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_bpf') then
    raise exception 'Acces refuse.';
  end if;

  select * into v_report
  from public.training_bpf_reports
  where organization_id = p_organization_id and id = p_report_id;
  if not found then raise exception 'BPF introuvable.'; end if;
  if v_report.status = 'locked' then return v_report.calculated_data; end if;

  select * into v_org
  from public.organizations
  where id = p_organization_id and business_type = 'formation';
  if not found then raise exception 'Espace Formation introuvable.'; end if;

  select
    count(*)::integer,
    coalesce(bool_or(modality in ('distanciel','hybride')), false)
  into v_completed_sessions, v_distance_learning
  from public.training_sessions
  where organization_id = p_organization_id
    and status = 'completed'
    and coalesce(bpf_regulatory_scope,'review_required') in ('professional_continuing','apprenticeship')
    and ends_at::date between v_report.exercise_start and v_report.exercise_end;

  select count(*)::integer into v_enrollments
  from public.training_bpf_participant_rows(
    p_organization_id,
    v_report.exercise_start,
    v_report.exercise_end
  )
  where attended_hours > 0;

  select
    coalesce(jsonb_object_agg(k.key, coalesce(r.amount_cents, 0)), '{}'::jsonb)
  into v_auto_revenues
  from unnest(v_revenue_keys) as k(key)
  left join (
    select
      d.bpf_revenue_category as key,
      sum(d.amount_excl_tax_cents)::bigint as amount_cents
    from public.training_commercial_documents d
    where d.organization_id = p_organization_id
      and d.bpf_included = true
      and d.status in ('accepted','signed','completed')
      and coalesce(d.bpf_revenue_recognized_at, d.issue_date)
        between v_report.exercise_start and v_report.exercise_end
      and d.bpf_revenue_category is not null
    group by d.bpf_revenue_category
  ) r on r.key = k.key;

  foreach v_key in array v_revenue_keys loop
    v_auto_value := coalesce((v_auto_revenues ->> v_key)::bigint, 0);
    if v_report.revenue_overrides ? v_key then
      v_auto_value := greatest(0, (v_report.revenue_overrides ->> v_key)::bigint);
    end if;
    v_revenues := v_revenues || jsonb_build_object(v_key, v_auto_value);
    v_total_products := v_total_products + v_auto_value;
  end loop;

  if v_report.total_company_revenue_cents > 0 and v_total_products > 0 then
    v_training_percent := greatest(
      1,
      least(100, round(v_total_products::numeric * 100 / v_report.total_company_revenue_cents)::integer)
    );
  end if;

  select coalesce(jsonb_object_agg(category, metric), '{}'::jsonb)
  into v_trainee_categories
  from (
    select
      category,
      jsonb_build_object(
        'count', count(*)::integer,
        'hours', round(coalesce(sum(attended_hours), 0), 2)
      ) as metric
    from (
      select
        coalesce(trainee_type, 'other') as category,
        attended_hours
      from public.training_bpf_participant_rows(
        p_organization_id,
        v_report.exercise_start,
        v_report.exercise_end
      )
      where delivery_mode <> 'subcontracted_for_other' and attended_hours > 0
    ) participant_categories
    group by category
  ) category_metrics;

  foreach v_key in array array['private_employee','apprentice','jobseeker','individual','other'] loop
    if not (v_trainee_categories ? v_key) then
      v_trainee_categories := v_trainee_categories
        || jsonb_build_object(v_key, jsonb_build_object('count', 0, 'hours', 0));
    end if;
  end loop;

  select jsonb_build_object(
    'count', count(*)::integer,
    'hours', round(coalesce(sum(attended_hours), 0), 2)
  )
  into v_trainee_total
  from public.training_bpf_participant_rows(
    p_organization_id,
    v_report.exercise_start,
    v_report.exercise_end
  )
  where delivery_mode <> 'subcontracted_for_other' and attended_hours > 0;

  select jsonb_build_object(
    'count', count(*)::integer,
    'hours', round(coalesce(sum(attended_hours), 0), 2)
  )
  into v_outsourced
  from public.training_bpf_participant_rows(
    p_organization_id,
    v_report.exercise_start,
    v_report.exercise_end
  )
  where delivery_mode = 'outsourced_by_us' and attended_hours > 0;

  select jsonb_build_object(
    'count', count(*)::integer,
    'hours', round(coalesce(sum(attended_hours), 0), 2)
  )
  into v_subcontracted
  from public.training_bpf_participant_rows(
    p_organization_id,
    v_report.exercise_start,
    v_report.exercise_end
  )
  where delivery_mode = 'subcontracted_for_other' and attended_hours > 0;

  select coalesce(jsonb_object_agg(objective_key, metric), '{}'::jsonb)
  into v_objectives
  from (
    select
      coalesce(objective, 'other_professional') as objective_key,
      jsonb_build_object(
        'count', count(*)::integer,
        'hours', round(coalesce(sum(attended_hours), 0), 2)
      ) as metric
    from public.training_bpf_participant_rows(
      p_organization_id,
      v_report.exercise_start,
      v_report.exercise_end
    )
    where delivery_mode <> 'subcontracted_for_other' and attended_hours > 0
    group by coalesce(objective, 'other_professional')
  ) objective_metrics;

  foreach v_key in array array['rncp','rs','cqp_unregistered','other_professional','skills_assessment','vae'] loop
    if not (v_objectives ? v_key) then
      v_objectives := v_objectives
        || jsonb_build_object(v_key, jsonb_build_object('count', 0, 'hours', 0));
    end if;
  end loop;

  select coalesce(jsonb_object_agg(level_key, metric), '{}'::jsonb)
  into v_rncp_levels
  from (
    select
      rncp_level as level_key,
      jsonb_build_object(
        'count', count(*)::integer,
        'hours', round(coalesce(sum(attended_hours), 0), 2)
      ) as metric
    from public.training_bpf_participant_rows(
      p_organization_id,
      v_report.exercise_start,
      v_report.exercise_end
    )
    where delivery_mode <> 'subcontracted_for_other'
      and objective = 'rncp'
      and rncp_level is not null
      and attended_hours > 0
    group by rncp_level
  ) rncp_metrics;

  foreach v_key in array array['level_6_8','level_5','level_4','level_3','level_2','cqp_no_level'] loop
    if not (v_rncp_levels ? v_key) then
      v_rncp_levels := v_rncp_levels
        || jsonb_build_object(v_key, jsonb_build_object('count', 0, 'hours', 0));
    end if;
  end loop;

  with grouped as (
    select
      coalesce(nullif(specialty_code, ''), '---') as code,
      coalesce(nullif(specialty_name, ''), 'Non classee') as name,
      count(*)::integer as participant_count,
      round(coalesce(sum(attended_hours), 0), 2) as participant_hours
    from public.training_bpf_participant_rows(
      p_organization_id,
      v_report.exercise_start,
      v_report.exercise_end
    )
    where delivery_mode <> 'subcontracted_for_other' and attended_hours > 0
    group by
      coalesce(nullif(specialty_code, ''), '---'),
      coalesce(nullif(specialty_name, ''), 'Non classee')
  ),
  ranked as (
    select *, row_number() over (order by participant_hours desc, participant_count desc, code) as rank
    from grouped
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'code', code,
          'name', name,
          'count', participant_count,
          'hours', participant_hours
        )
        order by rank
      ) filter (where rank <= 5),
      '[]'::jsonb
    ),
    jsonb_build_object(
      'count', coalesce(sum(participant_count) filter (where rank > 5), 0),
      'hours', coalesce(round(sum(participant_hours) filter (where rank > 5), 2), 0)
    )
  into v_specialties, v_other_specialties
  from ranked;

  with trainer_sessions as (
    select
      tr.id,
      tr.bpf_relationship,
      p.duration_hours
    from public.training_sessions s
    join public.training_programs p
      on p.organization_id = s.organization_id and p.id = s.program_id
    join public.training_trainers tr
      on tr.organization_id = s.organization_id and tr.id = s.trainer_id
    where s.organization_id = p_organization_id
      and s.status = 'completed'
      and coalesce(s.bpf_regulatory_scope,'review_required') in ('professional_continuing','apprenticeship')
      and s.ends_at::date between v_report.exercise_start and v_report.exercise_end
  ),
  trainer_metrics as (
    select
      relationship_key,
      jsonb_build_object(
        'count', count(distinct id)::integer,
        'hours', round(coalesce(sum(duration_hours), 0), 2)
      ) as metric
    from (
      select id, coalesce(bpf_relationship, 'internal') as relationship_key, duration_hours
      from trainer_sessions
    ) normalized
    group by relationship_key
  )
  select coalesce(jsonb_object_agg(relationship_key, metric), '{}'::jsonb)
  into v_trainers
  from trainer_metrics;

  foreach v_key in array array['internal','external'] loop
    if not (v_trainers ? v_key) then
      v_trainers := v_trainers
        || jsonb_build_object(v_key, jsonb_build_object('count', 0, 'hours', 0));
    end if;
  end loop;

  select count(*)::integer into v_included_documents
  from public.training_commercial_documents d
  where d.organization_id = p_organization_id
    and d.bpf_included = true
    and d.status in ('accepted','signed','completed')
    and coalesce(d.bpf_revenue_recognized_at, d.issue_date)
      between v_report.exercise_start and v_report.exercise_end;

  select count(*)::integer into v_unincluded_documents
  from public.training_commercial_documents d
  where d.organization_id = p_organization_id
    and d.bpf_included = false
    and d.status in ('accepted','signed','completed')
    and d.issue_date between v_report.exercise_start and v_report.exercise_end
    and d.amount_excl_tax_cents > 0;

  -- Identite obligatoire du cadre A et signataire du cadre H.
  if nullif(trim(coalesce(v_org.training_nda_number, '')), '') is null then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','critical','code','identity_nda','label','Numero de declaration d''activite manquant',
      'entity_type','organization','entity_id',p_organization_id
    ));
  end if;
  if nullif(trim(coalesce(v_org.company_siret, '')), '') is null then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','critical','code','identity_siret','label','SIRET manquant',
      'entity_type','organization','entity_id',p_organization_id
    ));
  end if;
  if v_report.legal_form is null then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','critical','code','identity_legal_form','label','Forme juridique manquante',
      'entity_type','report','entity_id',p_report_id
    ));
  end if;
  if v_report.naf_code is null then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','critical','code','identity_naf','label','Code NAF manquant',
      'entity_type','report','entity_id',p_report_id
    ));
  end if;
  if v_report.executive_name is null or v_report.executive_title is null then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','critical','code','identity_executive','label','Dirigeant ou qualite du signataire manquant',
      'entity_type','report','entity_id',p_report_id
    ));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','critical',
    'code','session_regulatory_scope',
    'label','Nature reglementaire de la session a qualifier',
    'entity_type','session',
    'entity_id',s.id
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_sessions s
  where s.organization_id = p_organization_id
    and s.status = 'completed'
    and s.ends_at::date between v_report.exercise_start and v_report.exercise_end
    and coalesce(s.bpf_regulatory_scope,'review_required') = 'review_required';
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','critical',
    'code','trainee_type',
    'label','Type de stagiaire a classer',
    'entity_type','enrollment',
    'entity_id',participant.session_id::text || ':' || participant.trainee_id::text
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_bpf_participant_rows(
    p_organization_id,
    v_report.exercise_start,
    v_report.exercise_end
  ) participant
  where participant.delivery_mode <> 'subcontracted_for_other'
    and participant.attended_hours > 0
    and participant.trainee_type is null;
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(distinct jsonb_build_object(
    'severity','critical',
    'code','program_specialty',
    'label','Specialite de formation a renseigner',
    'entity_type','program',
    'entity_id',p.id
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_sessions s
  join public.training_programs p
    on p.organization_id = s.organization_id and p.id = s.program_id
  where s.organization_id = p_organization_id
    and s.status = 'completed'
    and coalesce(s.bpf_regulatory_scope,'review_required') in ('professional_continuing','apprenticeship')
    and s.ends_at::date between v_report.exercise_start and v_report.exercise_end
    and s.bpf_delivery_mode <> 'subcontracted_for_other'
    and (p.bpf_specialty_code is null or p.bpf_specialty_name is null);
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(distinct jsonb_build_object(
    'severity','critical',
    'code','program_rncp_level',
    'label','Niveau RNCP a renseigner',
    'entity_type','program',
    'entity_id',p.id
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_sessions s
  join public.training_programs p
    on p.organization_id = s.organization_id and p.id = s.program_id
  where s.organization_id = p_organization_id
    and s.status = 'completed'
    and coalesce(s.bpf_regulatory_scope,'review_required') in ('professional_continuing','apprenticeship')
    and s.ends_at::date between v_report.exercise_start and v_report.exercise_end
    and s.bpf_delivery_mode <> 'subcontracted_for_other'
    and p.bpf_objective = 'rncp'
    and p.bpf_rncp_level is null;
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','critical',
    'code','revenue_category',
    'label','Produit financier a classer',
    'entity_type','commercial_document',
    'entity_id',d.id
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_commercial_documents d
  where d.organization_id = p_organization_id
    and d.bpf_included = true
    and d.status in ('accepted','signed','completed')
    and coalesce(d.bpf_revenue_recognized_at, d.issue_date)
      between v_report.exercise_start and v_report.exercise_end
    and d.bpf_revenue_category is null;
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','warning',
    'code','commercial_document_not_included',
    'label','Document commercial realise non retenu',
    'entity_type','commercial_document',
    'entity_id',d.id
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_commercial_documents d
  where d.organization_id = p_organization_id
    and d.bpf_included = false
    and d.status in ('accepted','signed','completed')
    and d.issue_date between v_report.exercise_start and v_report.exercise_end
    and d.amount_excl_tax_cents > 0;
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','warning',
    'code','attendance_unconfirmed',
    'label','Presence calculee sans emargement complet',
    'entity_type','enrollment',
    'entity_id',e.session_id::text || ':' || e.trainee_id::text
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_session_enrollments e
  join public.training_sessions s
    on s.organization_id = e.organization_id and s.id = e.session_id
  where e.organization_id = p_organization_id
    and s.status = 'completed'
    and coalesce(s.bpf_regulatory_scope,'review_required') in ('professional_continuing','apprenticeship')
    and s.ends_at::date between v_report.exercise_start and v_report.exercise_end
    and e.status in ('registered','confirmed')
    and e.bpf_attended_hours is null
    and not exists (
      select 1 from public.training_attendance a
      where a.organization_id = e.organization_id
        and a.session_id = e.session_id
        and a.trainee_id = e.trainee_id
        and a.status in ('present','absent','excused')
    );
  v_warnings := v_warnings || v_warning_batch;

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','warning',
    'code','session_trainer',
    'label','Session cloturee sans formateur',
    'entity_type','session',
    'entity_id',s.id
  )), '[]'::jsonb)
  into v_warning_batch
  from public.training_sessions s
  where s.organization_id = p_organization_id
    and s.status = 'completed'
    and coalesce(s.bpf_regulatory_scope,'review_required') in ('professional_continuing','apprenticeship')
    and s.ends_at::date between v_report.exercise_start and v_report.exercise_end
    and s.trainer_id is null;
  v_warnings := v_warnings || v_warning_batch;

  if v_total_products > 0 and v_report.total_company_revenue_cents = 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','warning','code','global_revenue','label','Chiffre d''affaires global a renseigner',
      'entity_type','report','entity_id',p_report_id
    ));
  end if;
  if v_completed_sessions > 0 and v_report.total_training_charges_cents = 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity','warning','code','training_charges','label','Charges de formation a verifier',
      'entity_type','report','entity_id',p_report_id
    ));
  end if;

  select
    count(*) filter (where item ->> 'severity' = 'critical')::integer,
    count(*) filter (where item ->> 'severity' = 'warning')::integer
  into v_critical_count, v_warning_count
  from jsonb_array_elements(v_warnings) item;

  v_completeness := greatest(0, 100 - v_critical_count * 10 - v_warning_count * 3);

  v_data := jsonb_build_object(
    'report_id', v_report.id,
    'generated_at', now(),
    'period', jsonb_build_object(
      'year', v_report.reporting_year,
      'start', v_report.exercise_start,
      'end', v_report.exercise_end
    ),
    'identity', jsonb_build_object(
      'nda_number', v_org.training_nda_number,
      'siret', v_org.company_siret,
      'name', coalesce(v_org.public_name, v_org.name),
      'address', v_org.company_address,
      'postal_code', v_org.company_postal_code,
      'city', v_org.company_city,
      'phone', v_org.company_phone,
      'email', coalesce(v_org.company_email, v_org.training_reply_to_email),
      'legal_form', v_report.legal_form,
      'naf_code', v_report.naf_code,
      'address_public', v_report.address_public,
      'executive_name', v_report.executive_name,
      'executive_title', v_report.executive_title
    ),
    'general', jsonb_build_object(
      'distance_learning', v_distance_learning,
      'completed_sessions', v_completed_sessions
    ),
    'financial', jsonb_build_object(
      'auto_revenues_cents', v_auto_revenues,
      'revenues_cents', v_revenues,
      'total_products_cents', v_total_products,
      'total_company_revenue_cents', v_report.total_company_revenue_cents,
      'training_revenue_percent', v_training_percent,
      'total_training_charges_cents', v_report.total_training_charges_cents,
      'trainer_salaries_cents', v_report.trainer_salaries_cents,
      'external_training_costs_cents', v_report.external_training_costs_cents
    ),
    'trainers', v_trainers,
    'trainees', jsonb_build_object(
      'categories', v_trainee_categories,
      'total', v_trainee_total,
      'outsourced_by_us', v_outsourced,
      'subcontracted_for_other', v_subcontracted
    ),
    'objectives', jsonb_build_object(
      'categories', v_objectives,
      'rncp_levels', v_rncp_levels,
      'total', v_trainee_total
    ),
    'specialties', jsonb_build_object(
      'main', v_specialties,
      'other', v_other_specialties,
      'total', v_trainee_total
    ),
    'quality', jsonb_build_object(
      'completeness_percent', v_completeness,
      'critical_count', v_critical_count,
      'warning_count', v_warning_count,
      'ready', v_critical_count = 0,
      'warnings', v_warnings
    ),
    'sources', jsonb_build_object(
      'completed_sessions', v_completed_sessions,
      'enrollments', v_enrollments,
      'included_revenue_documents', v_included_documents,
      'unreviewed_revenue_documents', v_unincluded_documents,
      'excluded_sessions', (select count(*)::integer from public.training_sessions s where s.organization_id=p_organization_id and s.status='completed' and s.ends_at::date between v_report.exercise_start and v_report.exercise_end and coalesce(s.bpf_regulatory_scope,'review_required') in ('initial_education','out_of_scope')),
      'pending_scope_sessions', (select count(*)::integer from public.training_sessions s where s.organization_id=p_organization_id and s.status='completed' and s.ends_at::date between v_report.exercise_start and v_report.exercise_end and coalesce(s.bpf_regulatory_scope,'review_required')='review_required')
    )
  );

  update public.training_bpf_reports
  set calculated_data = v_data,
      calculated_at = now()
  where organization_id = p_organization_id and id = p_report_id;

  return v_data;
end;
$$;

revoke all on function public.refresh_training_bpf_report_commercial_legacy(uuid,uuid) from public,anon,authenticated;

-- Organisme déclarant choisi par le formateur.
create or replace function public.set_training_trainer_bpf_reporting_organization(p_reporting_organization_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare v_org public.organizations%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if p_reporting_organization_id is not null then
    select o.* into v_org
    from public.organizations o
    join public.organization_members m on m.organization_id=o.id
    where o.id=p_reporting_organization_id and o.business_type='formation'
      and o.status in ('trial','active') and m.user_id=auth.uid() and m.status='active'
      and m.role in ('owner','admin');
    if not found then raise exception 'Cet organisme ne peut pas être utilisé comme déclarant BPF.'; end if;
  end if;
  insert into public.training_trainer_bpf_preferences(user_id,reporting_organization_id,updated_at)
  values(auth.uid(),p_reporting_organization_id,now())
  on conflict(user_id) do update set reporting_organization_id=excluded.reporting_organization_id,updated_at=now();
  return jsonb_build_object('reporting_organization_id',p_reporting_organization_id);
end;
$$;

-- Vue formateur : les sessions initiales/hors champ restent visibles en compteur mais ne polluent jamais C10/G.
create or replace function public.training_trainer_bpf_overview(p_reporting_year integer)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_catalog
as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if p_reporting_year<2000 or p_reporting_year>extract(year from current_date)::integer+1 then raise exception 'Exercice BPF invalide.'; end if;

  with my_accounts as (
    select distinct a.organization_id,a.trainer_id,coalesce(o.public_name,o.name) organization_name,o.company_siret,
      trim(concat(tr.first_name,' ',tr.last_name)) trainer_name,coalesce(tr.bpf_relationship,'internal') relationship
    from public.training_portal_accounts a
    join public.organizations o on o.id=a.organization_id
    join public.training_trainers tr on tr.organization_id=a.organization_id and tr.id=a.trainer_id
    where a.user_id=auth.uid() and a.status='active' and a.subject_kind='trainer' and o.business_type='formation'
  ), period_sessions as (
    select ma.*,s.id session_id,s.title,s.starts_at,s.ends_at,s.status,s.location,s.modality,s.program_id,s.bpf_regulatory_scope,
      p.title program_title,p.duration_hours
    from my_accounts ma
    join public.training_sessions s on s.organization_id=ma.organization_id and s.trainer_id=ma.trainer_id
    join public.training_programs p on p.organization_id=s.organization_id and p.id=s.program_id
    where s.status='completed' and extract(year from (s.ends_at at time zone 'Europe/Paris'))::integer=p_reporting_year
  ), participant_rows as (
    select ps.organization_id,ps.session_id,e.trainee_id,
      greatest(0,round((case when e.bpf_attended_hours is not null then e.bpf_attended_hours when e.status='absent' then 0
        when att.mark_count>0 then coalesce(ps.duration_hours,0)*att.present_count::numeric/att.mark_count::numeric else coalesce(ps.duration_hours,0) end)::numeric,2)) attended_hours
    from period_sessions ps
    join public.training_session_enrollments e on e.organization_id=ps.organization_id and e.session_id=ps.session_id and e.status<>'canceled'
    left join lateral (
      select count(*) filter(where a.status in ('present','absent','excused'))::numeric mark_count,
             count(*) filter(where a.status='present')::numeric present_count
      from public.training_attendance a where a.organization_id=e.organization_id and a.session_id=e.session_id and a.trainee_id=e.trainee_id
    ) att on true
  ), metrics as (
    select ps.*,count(pr.trainee_id) filter(where pr.attended_hours>0)::integer trainee_count,
      round(coalesce(sum(pr.attended_hours) filter(where pr.attended_hours>0),0),2) trainee_hours
    from period_sessions ps left join participant_rows pr on pr.organization_id=ps.organization_id and pr.session_id=ps.session_id
    group by ps.organization_id,ps.trainer_id,ps.organization_name,ps.company_siret,ps.trainer_name,ps.relationship,
      ps.session_id,ps.title,ps.starts_at,ps.ends_at,ps.status,ps.location,ps.modality,ps.program_id,ps.bpf_regulatory_scope,ps.program_title,ps.duration_hours
  ), eligible as (
    select sm.*,e.amount_excl_tax_cents,e.invoice_reference,e.invoice_date,e.notes,e.status entry_status,e.confirmed_at,e.updated_at
    from metrics sm left join public.training_trainer_bpf_entries e on e.user_id=auth.uid() and e.organization_id=sm.organization_id and e.trainer_id=sm.trainer_id and e.session_id=sm.session_id
    where sm.relationship='external' and sm.bpf_regulatory_scope in ('professional_continuing','apprenticeship')
  ), reporting_orgs as (
    select o.id,coalesce(o.public_name,o.name) name,o.company_siret,o.training_nda_number
    from public.organizations o join public.organization_members m on m.organization_id=o.id
    where m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin') and o.business_type='formation' and o.status in ('trial','active')
  ), pref as (
    select reporting_organization_id from public.training_trainer_bpf_preferences where user_id=auth.uid()
  )
  select jsonb_build_object(
    'reporting_year',p_reporting_year,
    'summary',jsonb_build_object(
      'centers',(select count(distinct organization_id) from eligible),
      'interventions',(select count(*) from eligible),
      'trainees',(select coalesce(sum(trainee_count),0) from eligible),
      'trainee_hours',(select round(coalesce(sum(trainee_hours),0),2) from eligible),
      'revenue_cents',(select coalesce(sum(amount_excl_tax_cents),0) from eligible where amount_excl_tax_cents is not null),
      'completed_entries',(select count(*) from eligible where amount_excl_tax_cents is not null),
      'to_complete',(select count(*) from eligible where amount_excl_tax_cents is null)
    ),
    'excluded_internal_sessions',(select count(*) from metrics where relationship<>'external'),
    'excluded_out_of_scope_sessions',(select count(*) from metrics where relationship='external' and bpf_regulatory_scope in ('initial_education','out_of_scope')),
    'pending_scope_sessions',(select count(*) from metrics where relationship='external' and coalesce(bpf_regulatory_scope,'review_required')='review_required'),
    'reporting_organizations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'siret',company_siret,'nda_number',training_nda_number) order by name) from reporting_orgs),'[]'::jsonb),
    'selected_reporting_organization_id',(select reporting_organization_id from pref limit 1),
    'interventions',coalesce((select jsonb_agg(jsonb_build_object(
      'organization_id',organization_id,'organization_name',organization_name,'organization_siret',company_siret,
      'trainer_id',trainer_id,'session_id',session_id,'session_title',title,'program_title',program_title,'starts_at',starts_at,'ends_at',ends_at,
      'location',location,'modality',modality,'training_hours',duration_hours,'regulatory_scope',bpf_regulatory_scope,
      'trainee_count',trainee_count,'trainee_hours',trainee_hours,'amount_excl_tax_cents',amount_excl_tax_cents,
      'invoice_reference',invoice_reference,'invoice_date',invoice_date,'notes',notes,'entry_status',coalesce(entry_status,'draft'),'confirmed_at',confirmed_at,'updated_at',updated_at
    ) order by ends_at desc,organization_name,title) from eligible),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.save_training_trainer_bpf_entry(
  p_session_id uuid,p_amount_excl_tax_cents bigint default null,p_invoice_reference text default null,p_invoice_date date default null,p_notes text default null
)
returns jsonb language plpgsql security definer set search_path=public,pg_catalog as $$
declare v_account record; v_session public.training_sessions%rowtype; v_year integer; v_entry public.training_trainer_bpf_entries%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if p_amount_excl_tax_cents is not null and p_amount_excl_tax_cents<0 then raise exception 'Le montant HT ne peut pas être négatif.'; end if;
  select a.organization_id,a.trainer_id into v_account
  from public.training_portal_accounts a
  join public.training_trainers tr on tr.organization_id=a.organization_id and tr.id=a.trainer_id
  join public.training_sessions s on s.organization_id=a.organization_id and s.id=p_session_id and s.trainer_id=a.trainer_id
  where a.user_id=auth.uid() and a.status='active' and a.subject_kind='trainer'
    and coalesce(tr.bpf_relationship,'internal')='external' and s.status='completed'
    and s.bpf_regulatory_scope in ('professional_continuing','apprenticeship') limit 1;
  if v_account.organization_id is null then raise exception 'Cette intervention est hors champ BPF, à qualifier, ou ne vous est pas attribuée.'; end if;
  select * into v_session from public.training_sessions where organization_id=v_account.organization_id and id=p_session_id;
  v_year:=extract(year from (v_session.ends_at at time zone 'Europe/Paris'))::integer;
  insert into public.training_trainer_bpf_entries(user_id,organization_id,trainer_id,session_id,reporting_year,amount_excl_tax_cents,invoice_reference,invoice_date,notes,status,confirmed_at)
  values(auth.uid(),v_account.organization_id,v_account.trainer_id,p_session_id,v_year,p_amount_excl_tax_cents,nullif(trim(coalesce(p_invoice_reference,'')),''),p_invoice_date,nullif(trim(coalesce(p_notes,'')),''),case when p_amount_excl_tax_cents is null then 'draft' else 'confirmed' end,case when p_amount_excl_tax_cents is null then null else now() end)
  on conflict(user_id,organization_id,trainer_id,session_id) do update set reporting_year=excluded.reporting_year,amount_excl_tax_cents=excluded.amount_excl_tax_cents,invoice_reference=excluded.invoice_reference,invoice_date=excluded.invoice_date,notes=excluded.notes,status=excluded.status,confirmed_at=case when excluded.status='confirmed' then coalesce(public.training_trainer_bpf_entries.confirmed_at,now()) else null end,updated_at=now()
  returning * into v_entry;
  return jsonb_build_object('id',v_entry.id,'status',v_entry.status,'reporting_year',v_entry.reporting_year,'amount_excl_tax_cents',v_entry.amount_excl_tax_cents,'invoice_reference',v_entry.invoice_reference,'invoice_date',v_entry.invoice_date,'updated_at',v_entry.updated_at);
end;
$$;

-- Contributions externes rattachées à un organisme déclarant : uniquement les utilisateurs qui en sont owner/admin actifs.
create or replace function public.training_reporting_org_external_bpf_rows(p_reporting_organization_id uuid,p_start date,p_end date)
returns table(user_id uuid,source_organization_id uuid,trainer_id uuid,session_id uuid,trainee_count integer,trainee_hours numeric,amount_excl_tax_cents bigint,invoice_reference text)
language sql stable security definer set search_path=public as $$
  with contributors as (
    select pref.user_id
    from public.training_trainer_bpf_preferences pref
    join public.organization_members m on m.organization_id=pref.reporting_organization_id and m.user_id=pref.user_id
    where pref.reporting_organization_id=p_reporting_organization_id and m.status='active' and m.role in ('owner','admin')
  ), external_sessions as (
    select c.user_id,a.organization_id source_organization_id,a.trainer_id,s.id session_id,p.duration_hours
    from contributors c
    join public.training_portal_accounts a on a.user_id=c.user_id and a.status='active' and a.subject_kind='trainer'
    join public.training_trainers tr on tr.organization_id=a.organization_id and tr.id=a.trainer_id and coalesce(tr.bpf_relationship,'internal')='external'
    join public.training_sessions s on s.organization_id=a.organization_id and s.trainer_id=a.trainer_id and s.status='completed'
      and s.bpf_regulatory_scope in ('professional_continuing','apprenticeship') and s.ends_at::date between p_start and p_end
    join public.training_programs p on p.organization_id=s.organization_id and p.id=s.program_id
  ), metrics as (
    select es.user_id,es.source_organization_id,es.trainer_id,es.session_id,
      count(x.trainee_id) filter(where x.attended_hours>0)::integer trainee_count,
      round(coalesce(sum(x.attended_hours) filter(where x.attended_hours>0),0),2) trainee_hours
    from external_sessions es
    left join lateral (
      select e.trainee_id,greatest(0,round((case when e.bpf_attended_hours is not null then e.bpf_attended_hours when e.status='absent' then 0
        when att.mark_count>0 then es.duration_hours*att.present_count::numeric/att.mark_count::numeric else es.duration_hours end)::numeric,2)) attended_hours
      from public.training_session_enrollments e
      left join lateral (select count(*) filter(where at.status in ('present','absent','excused'))::numeric mark_count,count(*) filter(where at.status='present')::numeric present_count from public.training_attendance at where at.organization_id=e.organization_id and at.session_id=e.session_id and at.trainee_id=e.trainee_id) att on true
      where e.organization_id=es.source_organization_id and e.session_id=es.session_id and e.status<>'canceled'
    ) x on true
    group by es.user_id,es.source_organization_id,es.trainer_id,es.session_id
  )
  select m.user_id,m.source_organization_id,m.trainer_id,m.session_id,m.trainee_count,m.trainee_hours,e.amount_excl_tax_cents,e.invoice_reference
  from metrics m left join public.training_trainer_bpf_entries e on e.user_id=m.user_id and e.organization_id=m.source_organization_id and e.trainer_id=m.trainer_id and e.session_id=m.session_id;
$$;
revoke all on function public.training_reporting_org_external_bpf_rows(uuid,date,date) from public,anon,authenticated;

-- Calcul BPF final : factures explicitement incluses + sous-traitances du formateur rattachées au même déclarant.
create or replace function public.refresh_training_bpf_report(p_organization_id uuid,p_report_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_data jsonb; v_report public.training_bpf_reports%rowtype; v_keys text[]:=array['companies','apprenticeship','professionalization','pro_a','transition','cpf','jobseekers_funds','self_employed_funds','skills_plan','public_agents','eu','state','regions','france_travail','other_public','individuals','training_organizations','other_training'];
  v_auto jsonb:='{}'::jsonb; v_revenues jsonb:='{}'::jsonb; v_warnings jsonb:='[]'::jsonb; v_batch jsonb; v_key text; v_value bigint; v_total bigint:=0; v_invoice_count integer:=0; v_credit_count integer:=0; v_unbilled_count integer:=0; v_critical integer:=0; v_warning integer:=0; v_percent integer:=0;
  v_ext_count integer:=0; v_ext_trainees integer:=0; v_ext_hours numeric:=0; v_ext_manual_revenue bigint:=0; v_old_g_count integer:=0; v_old_g_hours numeric:=0;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) or not public.organization_has_plan_feature(p_organization_id,'training_bpf') then raise exception 'Acces refuse.'; end if;
  select * into v_report from public.training_bpf_reports where organization_id=p_organization_id and id=p_report_id;
  if not found then raise exception 'BPF introuvable.'; end if;
  if v_report.status='locked' then return v_report.calculated_data; end if;

  v_data:=public.refresh_training_bpf_report_commercial_legacy(p_organization_id,p_report_id);
  v_warnings:=coalesce(v_data#>'{quality,warnings}','[]'::jsonb);

  select count(*) filter(where document_kind='invoice')::integer,count(*) filter(where document_kind='credit_note')::integer
    into v_invoice_count,v_credit_count from public.training_invoices
    where organization_id=p_organization_id and bpf_included=true and status in ('issued','sent','partial','paid','overdue') and issue_date between v_report.exercise_start and v_report.exercise_end;

  if v_invoice_count+v_credit_count>0 then
    select coalesce(jsonb_object_agg(k.key,coalesce(r.amount_cents,0)),'{}'::jsonb) into v_auto
    from unnest(v_keys) k(key) left join (
      select bpf_revenue_category key,sum(case when document_kind='invoice' then subtotal_cents else -subtotal_cents end)::bigint amount_cents
      from public.training_invoices where organization_id=p_organization_id and bpf_included=true and status in ('issued','sent','partial','paid','overdue') and issue_date between v_report.exercise_start and v_report.exercise_end and bpf_revenue_category is not null group by bpf_revenue_category
    ) r on r.key=k.key;
    select coalesce(jsonb_agg(item),'[]'::jsonb) into v_warnings from jsonb_array_elements(v_warnings) item where item->>'code' not in ('revenue_category','commercial_document_not_included');
    select coalesce(jsonb_agg(jsonb_build_object('severity','critical','code','invoice_revenue_category','label','Facture emise sans categorie BPF','entity_type','invoice','entity_id',i.id)),'[]'::jsonb) into v_batch
    from public.training_invoices i where i.organization_id=p_organization_id and i.bpf_included=true and i.status in ('issued','sent','partial','paid','overdue') and i.issue_date between v_report.exercise_start and v_report.exercise_end and i.bpf_revenue_category is null;
    v_warnings:=v_warnings||v_batch;
    select coalesce(jsonb_agg(jsonb_build_object('severity','warning','code','invoice_overdue','label','Facture en retard de paiement','entity_type','invoice','entity_id',i.id)),'[]'::jsonb) into v_batch
    from public.training_invoices i where i.organization_id=p_organization_id and i.bpf_included=true and i.document_kind='invoice' and i.status='overdue' and i.balance_due_cents>0 and i.issue_date between v_report.exercise_start and v_report.exercise_end;
    v_warnings:=v_warnings||v_batch;
  else
    v_auto:=coalesce(v_data#>'{financial,auto_revenues_cents}','{}'::jsonb);
  end if;

  -- C10 manuel : uniquement si aucune facture/document NCR portant la même référence ne l'a déjà compté.
  select count(*)::integer,coalesce(sum(r.trainee_count),0)::integer,round(coalesce(sum(r.trainee_hours),0),2),
    coalesce(sum(case when r.amount_excl_tax_cents is not null and not exists(
      select 1 from public.training_invoices i where i.organization_id=p_organization_id and i.bpf_included=true and i.status<>'canceled' and r.invoice_reference is not null and i.invoice_number=r.invoice_reference
    ) and not exists(
      select 1 from public.training_commercial_documents d where d.organization_id=p_organization_id and d.bpf_included=true and r.invoice_reference is not null and d.reference=r.invoice_reference
    ) then r.amount_excl_tax_cents else 0 end),0)::bigint
  into v_ext_count,v_ext_trainees,v_ext_hours,v_ext_manual_revenue
  from public.training_reporting_org_external_bpf_rows(p_organization_id,v_report.exercise_start,v_report.exercise_end) r;

  v_auto:=jsonb_set(v_auto,'{training_organizations}',to_jsonb(coalesce((v_auto->>'training_organizations')::bigint,0)+v_ext_manual_revenue),true);
  foreach v_key in array v_keys loop
    v_value:=greatest(0,coalesce((v_auto->>v_key)::bigint,0));
    if v_report.revenue_overrides ? v_key then v_value:=greatest(0,(v_report.revenue_overrides->>v_key)::bigint); end if;
    v_revenues:=v_revenues||jsonb_build_object(v_key,v_value); v_total:=v_total+v_value;
  end loop;
  if v_report.total_company_revenue_cents>0 and v_total>0 then v_percent:=greatest(1,least(100,round(v_total::numeric*100/v_report.total_company_revenue_cents)::integer)); end if;

  v_old_g_count:=coalesce((v_data#>>'{trainees,subcontracted_for_other,count}')::integer,0);
  v_old_g_hours:=coalesce((v_data#>>'{trainees,subcontracted_for_other,hours}')::numeric,0);
  v_data:=jsonb_set(v_data,'{trainees,subcontracted_for_other}',jsonb_build_object('count',v_old_g_count+v_ext_trainees,'hours',round(v_old_g_hours+v_ext_hours,2)),true);
  v_data:=jsonb_set(v_data,'{general,completed_sessions}',to_jsonb(coalesce((v_data#>>'{general,completed_sessions}')::integer,0)+v_ext_count),true);
  v_data:=jsonb_set(v_data,'{sources,completed_sessions}',to_jsonb(coalesce((v_data#>>'{sources,completed_sessions}')::integer,0)+v_ext_count),true);
  v_data:=jsonb_set(v_data,'{sources,enrollments}',to_jsonb(coalesce((v_data#>>'{sources,enrollments}')::integer,0)+v_ext_trainees),true);

  -- Une sous-traitance éligible sans facture/montant ne doit pas passer silencieusement.
  select coalesce(jsonb_agg(jsonb_build_object('severity','critical','code','trainer_external_revenue_missing','label','Sous-traitance externe : montant ou facture C10 a renseigner','entity_type','session','entity_id',r.session_id)),'[]'::jsonb) into v_batch
  from public.training_reporting_org_external_bpf_rows(p_organization_id,v_report.exercise_start,v_report.exercise_end) r
  where r.amount_excl_tax_cents is null and not exists(select 1 from public.training_invoices i where i.organization_id=p_organization_id and i.bpf_included=true and i.status<>'canceled' and r.invoice_reference is not null and i.invoice_number=r.invoice_reference);
  v_warnings:=v_warnings||v_batch;

  -- Si la facture existe dans NCR, elle doit être classée C10.
  select coalesce(jsonb_agg(jsonb_build_object('severity','critical','code','trainer_external_invoice_category','label','Facture de sous-traitance a classer en C10 - Autres organismes de formation','entity_type','invoice','entity_id',i.id)),'[]'::jsonb) into v_batch
  from public.training_reporting_org_external_bpf_rows(p_organization_id,v_report.exercise_start,v_report.exercise_end) r
  join public.training_invoices i on i.organization_id=p_organization_id and i.bpf_included=true and i.status<>'canceled' and r.invoice_reference is not null and i.invoice_number=r.invoice_reference
  where i.bpf_revenue_category is distinct from 'training_organizations';
  v_warnings:=v_warnings||v_batch;

  -- Alerte si un centre n'a pas encore qualifié une session attribuée au déclarant.
  select coalesce(jsonb_agg(jsonb_build_object('severity','critical','code','trainer_external_scope_pending','label','Intervention externe a qualifier par le centre (formation pro, apprentissage, initiale ou hors champ)','entity_type','session','entity_id',s.id)),'[]'::jsonb) into v_batch
  from public.training_trainer_bpf_preferences pref
  join public.organization_members m on m.organization_id=pref.reporting_organization_id and m.user_id=pref.user_id and m.status='active' and m.role in ('owner','admin')
  join public.training_portal_accounts a on a.user_id=pref.user_id and a.status='active' and a.subject_kind='trainer'
  join public.training_trainers tr on tr.organization_id=a.organization_id and tr.id=a.trainer_id and coalesce(tr.bpf_relationship,'internal')='external'
  join public.training_sessions s on s.organization_id=a.organization_id and s.trainer_id=a.trainer_id and s.status='completed' and s.ends_at::date between v_report.exercise_start and v_report.exercise_end
  where pref.reporting_organization_id=p_organization_id and coalesce(s.bpf_regulatory_scope,'review_required')='review_required';
  v_warnings:=v_warnings||v_batch;

  select count(*) filter(where item->>'severity'='critical')::integer,count(*) filter(where item->>'severity'='warning')::integer into v_critical,v_warning from jsonb_array_elements(v_warnings) item;
  v_data:=jsonb_set(v_data,'{financial,auto_revenues_cents}',v_auto,true);
  v_data:=jsonb_set(v_data,'{financial,revenues_cents}',v_revenues,true);
  v_data:=jsonb_set(v_data,'{financial,total_products_cents}',to_jsonb(v_total),true);
  v_data:=jsonb_set(v_data,'{financial,training_revenue_percent}',to_jsonb(v_percent),true);
  v_data:=jsonb_set(v_data,'{quality,warnings}',v_warnings,true);
  v_data:=jsonb_set(v_data,'{quality,critical_count}',to_jsonb(v_critical),true);
  v_data:=jsonb_set(v_data,'{quality,warning_count}',to_jsonb(v_warning),true);
  v_data:=jsonb_set(v_data,'{quality,ready}',to_jsonb(v_critical=0),true);
  v_data:=jsonb_set(v_data,'{quality,completeness_percent}',to_jsonb(greatest(0,100-v_critical*10-v_warning*3)),true);
  v_data:=jsonb_set(v_data,'{sources,revenue_source}',to_jsonb(case when v_invoice_count+v_credit_count>0 then 'invoices' else 'commercial_documents' end::text),true);
  v_data:=jsonb_set(v_data,'{sources,included_revenue_documents}',to_jsonb(case when v_invoice_count+v_credit_count>0 then v_invoice_count+v_credit_count else coalesce((v_data#>>'{sources,included_revenue_documents}')::integer,0) end),true);
  v_data:=jsonb_set(v_data,'{sources,issued_invoices}',to_jsonb(v_invoice_count),true);
  v_data:=jsonb_set(v_data,'{sources,issued_credit_notes}',to_jsonb(v_credit_count),true);
  v_data:=jsonb_set(v_data,'{sources,personal_external_interventions}',to_jsonb(v_ext_count),true);
  v_data:=jsonb_set(v_data,'{sources,personal_external_revenue_cents}',to_jsonb(v_ext_manual_revenue),true);
  update public.training_bpf_reports set calculated_data=v_data,calculated_at=now() where organization_id=p_organization_id and id=p_report_id;
  return v_data;
end;
$$;

revoke all on function public.training_trainer_bpf_overview(integer) from public,anon;
revoke all on function public.save_training_trainer_bpf_entry(uuid,bigint,text,date,text) from public,anon;
revoke all on function public.set_training_trainer_bpf_reporting_organization(uuid) from public,anon;
revoke all on function public.refresh_training_bpf_report(uuid,uuid) from public,anon;
grant execute on function public.training_trainer_bpf_overview(integer) to authenticated;
grant execute on function public.save_training_trainer_bpf_entry(uuid,bigint,text,date,text) to authenticated;
grant execute on function public.set_training_trainer_bpf_reporting_organization(uuid) to authenticated;
grant execute on function public.refresh_training_bpf_report(uuid,uuid) to authenticated;

insert into public.platform_release_state(singleton,database_version,expected_frontend_version,expected_pwa_cache,installed_at,installed_by,notes)
values(true,'2.29.18','2.29.18','ncr-suite-shell-v2.29.18-bpf-mixed-activity',now(),auth.uid(),'V2.29.18 : nature réglementaire des sessions, exclusion formation initiale/hors champ, BPF formateur consolidé avec son organisme déclarant et factures BPF excluables.')
on conflict(singleton) do update set database_version=excluded.database_version,expected_frontend_version=excluded.expected_frontend_version,expected_pwa_cache=excluded.expected_pwa_cache,installed_at=excluded.installed_at,installed_by=excluded.installed_by,notes=excluded.notes;
select pg_notify('pgrst','reload schema');
commit;
