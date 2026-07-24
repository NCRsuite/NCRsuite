-- NCR Suite V2.19.0 - Formation : Qualiopi, conformite et preuves
-- A executer apres 078_training_billing_collections.sql.

begin;

create table if not exists public.training_quality_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  criterion_number integer not null check (criterion_number between 1 and 7),
  indicator_number integer not null check (indicator_number between 1 and 32),
  title text not null check (char_length(trim(title)) between 4 and 240),
  objective text,
  applicable boolean not null default true,
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','ready','attention','not_applicable')),
  owner_name text,
  due_date date,
  notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, indicator_number),
  constraint training_quality_controls_applicability_check check (
    (applicable and status <> 'not_applicable')
    or (not applicable and status = 'not_applicable')
  )
);

create table if not exists public.training_quality_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  control_id uuid not null,
  session_id uuid,
  training_document_id uuid,
  label text not null check (char_length(trim(label)) between 2 and 240),
  description text,
  source_kind text not null default 'upload'
    check (source_kind in ('upload','document','system')),
  source_reference text,
  action_path text,
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 20971520),
  evidence_date date not null default current_date,
  expires_at date,
  status text not null default 'current'
    check (status in ('current','expired','archived')),
  dedup_key text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, dedup_key),
  constraint training_quality_evidence_control_fk foreign key (organization_id, control_id)
    references public.training_quality_controls(organization_id, id) on delete cascade,
  constraint training_quality_evidence_session_fk foreign key (organization_id, session_id)
    references public.training_sessions(organization_id, id) on delete set null,
  constraint training_quality_evidence_document_fk foreign key (organization_id, training_document_id)
    references public.training_documents(organization_id, id) on delete set null,
  constraint training_quality_evidence_expiry_check check (
    expires_at is null or expires_at >= evidence_date
  ),
  constraint training_quality_evidence_source_check check (
    (source_kind = 'system' and storage_path is null)
    or source_kind = 'document'
    or (source_kind = 'upload' and storage_path is not null)
  )
);

create table if not exists public.training_quality_audits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  audit_type text not null check (audit_type in ('initial','surveillance','renewal','internal')),
  status text not null default 'planned' check (status in ('planned','preparing','completed')),
  planned_date date not null,
  completed_date date,
  auditor_name text,
  scope text,
  notes text,
  result text check (result is null or result in ('conform','minor_nonconformity','major_nonconformity')),
  summary_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint training_quality_audits_completion_check check (
    (status <> 'completed' and completed_date is null and result is null)
    or (status = 'completed' and completed_date is not null and result is not null)
  )
);

create index if not exists idx_training_quality_controls_org_status
  on public.training_quality_controls(organization_id, criterion_number, status, indicator_number);
create index if not exists idx_training_quality_evidence_org_control
  on public.training_quality_evidence(organization_id, control_id, status, evidence_date desc);
create index if not exists idx_training_quality_evidence_expiry
  on public.training_quality_evidence(organization_id, expires_at)
  where status = 'current' and expires_at is not null;
create index if not exists idx_training_quality_audits_org_date
  on public.training_quality_audits(organization_id, planned_date desc);

drop trigger if exists set_training_quality_controls_updated_at on public.training_quality_controls;
create trigger set_training_quality_controls_updated_at
before update on public.training_quality_controls
for each row execute procedure public.set_updated_at();

drop trigger if exists set_training_quality_evidence_updated_at on public.training_quality_evidence;
create trigger set_training_quality_evidence_updated_at
before update on public.training_quality_evidence
for each row execute procedure public.set_updated_at();

drop trigger if exists set_training_quality_audits_updated_at on public.training_quality_audits;
create trigger set_training_quality_audits_updated_at
before update on public.training_quality_audits
for each row execute procedure public.set_updated_at();

create or replace function public.organization_has_plan_feature(
  p_organization_id uuid,
  p_feature text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_type text;
  v_plan text;
  v_status text;
  v_metier_modules_configured boolean;
  v_features jsonb;
  v_module_key text;
begin
  select o.business_type, o.plan, o.status, coalesce(o.metier_modules_configured, false), d.features
  into v_business_type, v_plan, v_status, v_metier_modules_configured, v_features
  from public.organizations o
  left join public.domain_plan_catalog d
    on d.business_type = o.business_type
   and d.plan_key = o.plan
   and d.active = true
  where o.id = p_organization_id;

  if v_business_type is null or v_status not in ('trial','active') then return false; end if;
  if v_business_type = 'securite'
     and public.security_has_addon_feature(p_organization_id, p_feature) then return true; end if;
  if not coalesce((v_features ->> p_feature)::boolean, false) then return false; end if;

  if v_business_type = 'formation' and v_plan = 'metier' and v_metier_modules_configured then
    v_module_key := case p_feature
      when 'training_programs' then 'training_programs'
      when 'training_trainees' then 'trainees'
      when 'training_trainers' then 'trainers'
      when 'training_sessions' then 'sessions'
      when 'training_documents' then 'documents'
      when 'training_blank_attendance' then 'attendance'
      when 'training_digital_attendance' then 'attendance'
      when 'training_attendance_pdf' then 'attendance'
      when 'training_automatic_certificates' then 'certificates'
      when 'commercial_branding' then 'commercial_branding'
      when 'training_document_branding' then 'commercial_branding'
      when 'training_email_branding' then 'commercial_branding'
      when 'training_satisfaction' then 'evaluations'
      when 'training_session_dossier' then 'documents'
      when 'training_commercial' then 'training_commercial'
      when 'training_billing' then 'training_billing'
      when 'training_bpf' then 'training_bpf'
      when 'training_quality' then 'training_quality'
      when 'multi_site' then 'sites'
      when 'team_access' then 'team_access'
      when 'manager_role' then 'team_access'
      else null
    end;
    if v_module_key is not null then
      return exists (
        select 1 from public.organization_modules m
        where m.organization_id = p_organization_id
          and m.module_key = v_module_key and m.enabled = true
      );
    end if;
  end if;
  return true;
end;
$$;

create or replace function public.initialize_training_quality_framework(
  p_organization_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_quality') then
    raise exception 'Acces refuse.';
  end if;

  insert into public.training_quality_controls (
    organization_id, criterion_number, indicator_number, title, objective
  )
  select p_organization_id, seed.criterion_number, seed.indicator_number, seed.title, seed.objective
  from (values
    (1,1,'Information detaillee sur les prestations','Verifier que les informations utiles sont accessibles, completes et verifiables.'),
    (1,2,'Indicateurs de resultats adaptes','Publier des resultats adaptes aux prestations et aux publics.'),
    (1,3,'Information sur les certifications preparees','Presenter les resultats, blocs, equivalences, passerelles et debouches lorsque cet indicateur s''applique.'),
    (2,4,'Analyse du besoin du beneficiaire','Tracer l''analyse du besoin avec le beneficiaire, l''entreprise ou le financeur.'),
    (2,5,'Objectifs operationnels et evaluables','Definir des objectifs observables et evaluables.'),
    (2,6,'Contenus et modalites adaptes','Adapter les contenus et modalites aux objectifs et aux publics.'),
    (2,7,'Adequation aux exigences de certification','Verifier l''alignement avec la certification professionnelle visee.'),
    (2,8,'Positionnement a l''entree','Formaliser le positionnement et l''evaluation des acquis a l''entree.'),
    (3,9,'Information sur le deroulement','Informer les beneficiaires des conditions de deroulement.'),
    (3,10,'Adaptation et accompagnement des publics','Tracer les adaptations, l''accompagnement et le suivi.'),
    (3,11,'Evaluation de l''atteinte des objectifs','Mesurer l''atteinte des objectifs par les beneficiaires.'),
    (3,12,'Engagement et prevention des ruptures','Prevenir les abandons et favoriser l''engagement.'),
    (3,13,'Coordination des formations en alternance','Coordonner les missions et la progression en alternance.'),
    (3,14,'Accompagnement socio-professionnel','Formaliser l''accompagnement socio-professionnel lorsqu''il s''applique.'),
    (3,15,'Droits, devoirs, sante et securite des apprentis','Informer les apprentis de leurs droits, devoirs et regles de securite.'),
    (3,16,'Conditions de presentation a la certification','Respecter les exigences formelles de presentation a la certification.'),
    (4,17,'Moyens humains, techniques et environnement','Demontrer l''adequation des moyens et de l''environnement.'),
    (4,18,'Coordination des intervenants','Identifier et coordonner les intervenants internes et externes.'),
    (4,19,'Ressources pedagogiques accessibles','Mettre les ressources a disposition et faciliter leur appropriation.'),
    (4,20,'Referents et conseil de perfectionnement','Identifier les fonctions et instances requises lorsqu''elles s''appliquent.'),
    (5,21,'Competences des intervenants','Determiner, mobiliser et evaluer les competences des intervenants.'),
    (5,22,'Developpement des competences des salaries','Entretenir les competences des salaries impliques.'),
    (6,23,'Veille legale et reglementaire','Realiser une veille formation et exploiter ses enseignements.'),
    (6,24,'Veille metiers et competences','Suivre les evolutions des metiers, emplois et competences.'),
    (6,25,'Veille pedagogique et technologique','Suivre les innovations pedagogiques et technologiques.'),
    (6,26,'Reseau et expertise handicap','Mobiliser les ressources necessaires a l''accueil du handicap.'),
    (6,27,'Conformite des sous-traitants','Verifier la conformite des prestations sous-traitees.'),
    (6,28,'Partenaires des formations en situation de travail','Mobiliser les partenaires utiles aux formations en situation de travail.'),
    (6,29,'Insertion professionnelle et poursuite d''etude','Contribuer a l''insertion ou a la poursuite d''etude.'),
    (7,30,'Recueil des appreciations','Recueillir les appreciations des parties prenantes.'),
    (7,31,'Traitement des difficultes et reclamations','Tracer les difficultes, reclamations et aleas ainsi que leur traitement.'),
    (7,32,'Mesures d''amelioration continue','Transformer les appreciations et reclamations en actions d''amelioration.')
  ) as seed(criterion_number, indicator_number, title, objective)
  on conflict (organization_id, indicator_number) do update
  set criterion_number = excluded.criterion_number,
      title = excluded.title,
      objective = excluded.objective;
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.sync_training_quality_automatic_evidence(
  p_organization_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changed integer := 0;
  v_batch integer := 0;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_quality') then
    raise exception 'Acces refuse.';
  end if;
  perform public.initialize_training_quality_framework(p_organization_id);

  update public.training_quality_evidence
  set status = 'expired'
  where organization_id = p_organization_id
    and status = 'current' and expires_at < current_date;

  insert into public.training_quality_evidence (
    organization_id, control_id, session_id, training_document_id, label, description,
    source_kind, source_reference, action_path, storage_path, file_name, mime_type,
    size_bytes, evidence_date, status, dedup_key
  )
  select
    d.organization_id, c.id, d.session_id, d.id, d.title,
    'Document Formation reutilise automatiquement comme preuve.',
    'document', d.category, '/documents?session=' || coalesce(d.session_id::text, 'all'),
    d.storage_path, d.title, d.mime_type, d.size_bytes, d.created_at::date, 'current',
    'document:' || d.id::text
  from public.training_documents d
  join public.training_quality_controls c
    on c.organization_id = d.organization_id
   and c.indicator_number = case d.category
     when 'programme' then 1
     when 'convocation' then 9
     when 'support' then 19
     when 'attestation' then 11
     when 'administrative' then 18
     else null
   end
  where d.organization_id = p_organization_id and d.status <> 'archived'
  on conflict (organization_id, dedup_key) do update
  set label = excluded.label, storage_path = excluded.storage_path,
      mime_type = excluded.mime_type, size_bytes = excluded.size_bytes,
      status = case
        when training_quality_evidence.status = 'archived' then 'archived'
        else 'current'
      end,
      updated_at = now();
  get diagnostics v_batch = row_count;
  v_changed := v_changed + v_batch;

  insert into public.training_quality_evidence (
    organization_id, control_id, session_id, label, description, source_kind,
    source_reference, action_path, evidence_date, status, dedup_key
  )
  select
    q.organization_id, c.id, q.session_id,
    'Evaluations completees - ' || coalesce(s.title, 'session'),
    count(*)::text || ' reponse(s) exploitable(s) conservee(s) dans NCR Suite.',
    'system', 'training_satisfaction_surveys', '/evaluations?session=' || q.session_id::text,
    max(q.completed_at)::date, 'current', 'evaluations:' || q.session_id::text
  from public.training_satisfaction_surveys q
  join public.training_sessions s
    on s.organization_id = q.organization_id and s.id = q.session_id
  join public.training_quality_controls c
    on c.organization_id = q.organization_id and c.indicator_number = 30
  where q.organization_id = p_organization_id and q.status = 'completed'
  group by q.organization_id, c.id, q.session_id, s.title
  on conflict (organization_id, dedup_key) do update
  set label = excluded.label, description = excluded.description,
      evidence_date = excluded.evidence_date,
      status = case
        when training_quality_evidence.status = 'archived' then 'archived'
        else 'current'
      end,
      updated_at = now();
  get diagnostics v_batch = row_count;
  v_changed := v_changed + v_batch;

  return v_changed;
end;
$$;

create or replace function public.update_training_quality_control(
  p_organization_id uuid,
  p_control_id uuid,
  p_status text,
  p_applicable boolean,
  p_owner_name text default null,
  p_due_date date default null,
  p_notes text default null
)
returns public.training_quality_controls
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.training_quality_controls;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_quality') then
    raise exception 'Acces refuse.';
  end if;
  if p_status not in ('not_started','in_progress','ready','attention','not_applicable') then
    raise exception 'Statut invalide.';
  end if;
  if p_status = 'ready' and not exists (
    select 1 from public.training_quality_evidence e
    where e.organization_id = p_organization_id and e.control_id = p_control_id
      and e.status = 'current'
  ) then
    raise exception 'Ajoutez au moins une preuve active avant de declarer cet indicateur maitrise.';
  end if;

  update public.training_quality_controls
  set applicable = case when p_status = 'not_applicable' then false else coalesce(p_applicable, true) end,
      status = case when coalesce(p_applicable, true) then p_status else 'not_applicable' end,
      owner_name = nullif(trim(coalesce(p_owner_name, '')), ''),
      due_date = p_due_date,
      notes = nullif(trim(coalesce(p_notes, '')), ''),
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where organization_id = p_organization_id and id = p_control_id
  returning * into v_result;
  if v_result.id is null then raise exception 'Indicateur introuvable.'; end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),'training.quality_control_updated','training_quality_control',
    p_control_id::text,jsonb_build_object('status',v_result.status,'applicable',v_result.applicable)
  );
  return v_result;
end;
$$;

create or replace function public.add_training_quality_evidence(
  p_organization_id uuid,
  p_control_id uuid,
  p_label text,
  p_description text,
  p_session_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_evidence_date date,
  p_expires_at date
)
returns public.training_quality_evidence
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.training_quality_evidence;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_quality') then
    raise exception 'Acces refuse.';
  end if;
  if not exists (
    select 1 from public.training_quality_controls
    where organization_id = p_organization_id and id = p_control_id
  ) then raise exception 'Indicateur introuvable.'; end if;
  if p_session_id is not null and not exists (
    select 1 from public.training_sessions
    where organization_id = p_organization_id and id = p_session_id
  ) then raise exception 'Session invalide.'; end if;
  if coalesce(p_storage_path, '') not like (p_organization_id::text || '/quality/%') then
    raise exception 'Chemin de preuve invalide.';
  end if;
  if coalesce(p_size_bytes, -1) not between 0 and 20971520 then
    raise exception 'Taille de fichier invalide.';
  end if;
  if p_expires_at is not null and p_expires_at < coalesce(p_evidence_date, current_date) then
    raise exception 'La date d''expiration doit suivre la date de preuve.';
  end if;

  insert into public.training_quality_evidence (
    organization_id,control_id,session_id,label,description,source_kind,storage_path,
    file_name,mime_type,size_bytes,evidence_date,expires_at,status,dedup_key,created_by
  ) values (
    p_organization_id,p_control_id,p_session_id,trim(p_label),
    nullif(trim(coalesce(p_description,'')),''),'upload',p_storage_path,
    nullif(trim(coalesce(p_file_name,'')),''),nullif(trim(coalesce(p_mime_type,'')),''),
    p_size_bytes,coalesce(p_evidence_date,current_date),p_expires_at,'current',
    'upload:' || p_storage_path,auth.uid()
  ) returning * into v_result;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),'training.quality_evidence_added','training_quality_evidence',
    v_result.id::text,jsonb_build_object('control_id',p_control_id,'label',v_result.label)
  );
  return v_result;
end;
$$;

create or replace function public.archive_training_quality_evidence(
  p_organization_id uuid,
  p_evidence_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_quality') then
    raise exception 'Acces refuse.';
  end if;
  update public.training_quality_evidence set status = 'archived'
  where organization_id = p_organization_id and id = p_evidence_id;
  if not found then raise exception 'Preuve introuvable.'; end if;
end;
$$;

create or replace function public.create_training_quality_audit(
  p_organization_id uuid,
  p_audit_type text,
  p_planned_date date,
  p_auditor_name text default null,
  p_scope text default null,
  p_notes text default null
)
returns public.training_quality_audits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.training_quality_audits;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_quality') then
    raise exception 'Acces refuse.';
  end if;
  if p_audit_type not in ('initial','surveillance','renewal','internal') then
    raise exception 'Type d''audit invalide.';
  end if;
  insert into public.training_quality_audits (
    organization_id,audit_type,status,planned_date,auditor_name,scope,notes,created_by
  ) values (
    p_organization_id,p_audit_type,'planned',p_planned_date,
    nullif(trim(coalesce(p_auditor_name,'')),''),
    nullif(trim(coalesce(p_scope,'')),''),
    nullif(trim(coalesce(p_notes,'')),''),auth.uid()
  ) returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.update_training_quality_audit(
  p_organization_id uuid,
  p_audit_id uuid,
  p_status text,
  p_planned_date date,
  p_auditor_name text,
  p_scope text,
  p_notes text,
  p_result text default null
)
returns public.training_quality_audits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.training_quality_audits;
  v_snapshot jsonb := '{}'::jsonb;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_quality') then
    raise exception 'Acces refuse.';
  end if;
  if p_status not in ('planned','preparing','completed') then raise exception 'Statut invalide.'; end if;
  if p_status = 'completed' and p_result not in ('conform','minor_nonconformity','major_nonconformity') then
    raise exception 'Le resultat est obligatoire pour terminer l''audit.';
  end if;

  if p_status = 'completed' then
    select jsonb_build_object(
      'captured_at',now(),
      'applicable_indicators',count(*) filter(where applicable),
      'ready_indicators',count(*) filter(where applicable and status='ready'),
      'attention_indicators',count(*) filter(where applicable and status='attention'),
      'active_evidence',(
        select count(*) from public.training_quality_evidence e
        where e.organization_id=p_organization_id and e.status='current'
      )
    ) into v_snapshot
    from public.training_quality_controls
    where organization_id=p_organization_id;
  end if;

  update public.training_quality_audits
  set status=p_status,planned_date=p_planned_date,
      completed_date=case when p_status='completed' then current_date else null end,
      completed_by=case when p_status='completed' then auth.uid() else null end,
      auditor_name=nullif(trim(coalesce(p_auditor_name,'')),''),
      scope=nullif(trim(coalesce(p_scope,'')),''),
      notes=nullif(trim(coalesce(p_notes,'')),''),
      result=case when p_status='completed' then p_result else null end,
      summary_snapshot=case when p_status='completed' then v_snapshot else '{}'::jsonb end
  where organization_id=p_organization_id and id=p_audit_id
  returning * into v_result;
  if v_result.id is null then raise exception 'Audit introuvable.'; end if;
  return v_result;
end;
$$;

alter table public.training_quality_controls enable row level security;
alter table public.training_quality_evidence enable row level security;
alter table public.training_quality_audits enable row level security;

revoke all on public.training_quality_controls, public.training_quality_evidence,
  public.training_quality_audits from anon, authenticated;
grant select on public.training_quality_controls, public.training_quality_evidence,
  public.training_quality_audits to authenticated;

drop policy if exists training_quality_controls_select on public.training_quality_controls;
create policy training_quality_controls_select on public.training_quality_controls for select to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id,'training_quality')
);
drop policy if exists training_quality_evidence_select on public.training_quality_evidence;
create policy training_quality_evidence_select on public.training_quality_evidence for select to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id,'training_quality')
);
drop policy if exists training_quality_audits_select on public.training_quality_audits;
create policy training_quality_audits_select on public.training_quality_audits for select to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id,'training_quality')
);

revoke all on function public.initialize_training_quality_framework(uuid) from public,anon;
revoke all on function public.sync_training_quality_automatic_evidence(uuid) from public,anon;
revoke all on function public.update_training_quality_control(uuid,uuid,text,boolean,text,date,text) from public,anon;
revoke all on function public.add_training_quality_evidence(uuid,uuid,text,text,uuid,text,text,text,bigint,date,date) from public,anon;
revoke all on function public.archive_training_quality_evidence(uuid,uuid) from public,anon;
revoke all on function public.create_training_quality_audit(uuid,text,date,text,text,text) from public,anon;
revoke all on function public.update_training_quality_audit(uuid,uuid,text,date,text,text,text,text) from public,anon;

grant execute on function public.initialize_training_quality_framework(uuid) to authenticated;
grant execute on function public.sync_training_quality_automatic_evidence(uuid) to authenticated;
grant execute on function public.update_training_quality_control(uuid,uuid,text,boolean,text,date,text) to authenticated;
grant execute on function public.add_training_quality_evidence(uuid,uuid,text,text,uuid,text,text,text,bigint,date,date) to authenticated;
grant execute on function public.archive_training_quality_evidence(uuid,uuid) to authenticated;
grant execute on function public.create_training_quality_audit(uuid,text,date,text,text,text) to authenticated;
grant execute on function public.update_training_quality_audit(uuid,uuid,text,date,text,text,text,text) to authenticated;

insert into public.module_catalog (
  module_key,display_name,description,category,icon_key,
  compatible_business_types,core_module,default_enabled,sort_order
) values (
  'training_quality','Qualiopi et conformite',
  'Referentiel, preuves, echeances, audits et exports de preparation.',
  'formation','shield','{formation}',false,true,540
) on conflict(module_key) do update set
  display_name=excluded.display_name,description=excluded.description,category=excluded.category,
  icon_key=excluded.icon_key,compatible_business_types=excluded.compatible_business_types,
  default_enabled=excluded.default_enabled,active=true,sort_order=excluded.sort_order,updated_at=now();

update public.domain_plan_catalog
set features=features||'{"training_quality":true}'::jsonb,updated_at=now()
where business_type='formation' and plan_key in ('professionnelle','metier');

insert into public.organization_modules(organization_id,module_key,enabled)
select o.id,'training_quality',o.plan in ('professionnelle','metier')
from public.organizations o
where o.business_type='formation'
  and (o.plan<>'metier' or not coalesce(o.metier_modules_configured,false))
on conflict(organization_id,module_key) do update
set enabled=excluded.enabled,updated_at=now();

insert into public.platform_release_state (
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.19.0','2.19.0','ncr-suite-shell-v2.19.0-training-quality-compliance',
  now(),auth.uid(),
  'Formation V2.19.0 : dossier Qualiopi, 32 indicateurs, preuves automatiques et manuelles, echeances, audits et exports.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,notes=excluded.notes;

commit;
