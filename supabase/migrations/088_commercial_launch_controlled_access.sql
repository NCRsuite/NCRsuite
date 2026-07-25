-- NCR Suite V2.22.0 - Lancement commercial et acces controles
-- A executer apres 087_final_public_function_acl_cleanup.sql.

begin;

create table if not exists public.platform_access_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'NCR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))
  ),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  email_normalized text not null check (email_normalized=lower(email_normalized)),
  email_hash text not null check (char_length(email_hash)=64),
  phone text,
  company_name text not null check (char_length(company_name) between 2 and 160),
  business_type text not null check (
    business_type in ('coiffure','securite','nettoyage','restaurant','formation')
  ),
  team_size text check (team_size in ('1','1-5','6-15','16-50','51+')),
  message text check (char_length(message)<=2000),
  privacy_accepted boolean not null default false,
  status text not null default 'pending' check (
    status in ('pending','approved','rejected')
  ),
  request_fingerprint_hash text not null check (char_length(request_fingerprint_hash)=64),
  source_ip_hash text not null check (char_length(source_ip_hash)=64),
  user_agent text check (char_length(user_agent)<=500),
  turnstile_verified boolean not null default false,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  decision_note text check (char_length(decision_note)<=2000),
  invited_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  invitation_sent_at timestamptz,
  invitation_count integer not null default 0 check (invitation_count>=0),
  last_invitation_error text check (char_length(last_invitation_error)<=1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_access_requests_status_date
  on public.platform_access_requests(status,submitted_at desc);
create index if not exists idx_platform_access_requests_email_hash
  on public.platform_access_requests(email_hash,submitted_at desc);
create index if not exists idx_platform_access_requests_source_rate
  on public.platform_access_requests(source_ip_hash,submitted_at desc);
create unique index if not exists idx_platform_access_requests_one_open_email
  on public.platform_access_requests(email_normalized)
  where status in ('pending','approved');

drop trigger if exists set_platform_access_requests_updated_at
  on public.platform_access_requests;
create trigger set_platform_access_requests_updated_at
before update on public.platform_access_requests
for each row execute procedure public.set_updated_at();

alter table public.platform_access_requests enable row level security;
revoke all on public.platform_access_requests from public,anon,authenticated;
drop policy if exists platform_access_requests_admin_read
  on public.platform_access_requests;
create policy platform_access_requests_admin_read
on public.platform_access_requests
for select to authenticated
using (public.is_platform_admin());
grant select on public.platform_access_requests to authenticated;

create table if not exists public.platform_auth_email_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('recovery','invitation')),
  email_hash text not null check (char_length(email_hash)=64),
  source_ip_hash text not null check (char_length(source_ip_hash)=64),
  delivery_status text not null check (
    delivery_status in ('sent','failed','not_found','rate_limited')
  ),
  provider_message text check (char_length(provider_message)<=500),
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_auth_email_events_email_rate
  on public.platform_auth_email_events(event_type,email_hash,created_at desc);
create index if not exists idx_platform_auth_email_events_source_rate
  on public.platform_auth_email_events(event_type,source_ip_hash,created_at desc);

alter table public.platform_auth_email_events enable row level security;
revoke all on public.platform_auth_email_events from public,anon,authenticated;

-- Une identite Auth seule ne peut plus ouvrir une entreprise. La demande
-- acceptee par le super administrateur doit etre liee au compte invite.
create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_business_type text,
  p_primary_color text default '#2997ff'
)
returns uuid
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_id uuid;
  v_name text:=trim(p_name);
  v_slug text:=lower(trim(p_slug));
  v_trial_days integer:=0;
  v_trial_plan text:='decouverte';
  v_status text:='active';
  v_request_id uuid;
  v_request_reference text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_platform_super_admin() then
    begin
      v_request_id:=nullif(auth.jwt()->'user_metadata'->>'access_request_id','')::uuid;
    exception when others then
      v_request_id:=null;
    end;

    select r.reference
    into v_request_reference
    from public.platform_access_requests r
    where r.id=v_request_id
      and r.status='approved'
      and r.invited_user_id=auth.uid()
      and r.organization_id is null
      and r.business_type=p_business_type;

    if v_request_reference is null then
      raise exception 'Ce compte ne possede pas d autorisation valide pour ouvrir une entreprise.';
    end if;
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'Invalid organization name';
  end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(v_slug) not between 2 and 80 then
    raise exception 'Invalid organization slug';
  end if;
  if p_business_type not in ('coiffure','nettoyage','securite','formation','restauration') then
    raise exception 'Unsupported business type';
  end if;
  if not exists (
    select 1 from public.business_domain_catalog
    where business_type=p_business_type
      and active=true
      and launch_status='active'
  ) then
    raise exception 'Ce domaine metier est encore en preparation.';
  end if;
  if p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Invalid primary color';
  end if;

  select default_trial_days,default_trial_plan
  into v_trial_days,v_trial_plan
  from public.platform_billing_settings
  where singleton=true;

  v_trial_days:=coalesce(v_trial_days,0);
  v_trial_plan:=coalesce(v_trial_plan,'decouverte');
  v_status:=case when v_trial_days>0 then 'trial' else 'active' end;

  insert into public.organizations(
    name,slug,business_type,plan,status,primary_color,created_by
  ) values (
    v_name,v_slug,p_business_type,v_trial_plan,v_status,p_primary_color,auth.uid()
  )
  returning id into v_id;

  insert into public.organization_members(
    organization_id,user_id,role,status
  ) values (
    v_id,auth.uid(),'owner','active'
  );

  insert into public.organization_modules(organization_id,module_key)
  values
    (v_id,'dashboard'),
    (v_id,'settings'),
    (v_id,p_business_type)
  on conflict do nothing;

  if v_request_id is not null then
    update public.platform_access_requests
    set organization_id=v_id,updated_at=now()
    where id=v_request_id
      and invited_user_id=auth.uid()
      and organization_id is null;
  end if;

  insert into public.audit_logs(
    organization_id,user_id,action,entity_type,entity_id,metadata
  ) values (
    v_id,auth.uid(),'organization.created','organization',v_id::text,
    jsonb_build_object(
      'trial_days',v_trial_days,
      'initial_plan',v_trial_plan,
      'access_request_reference',v_request_reference
    )
  );

  return v_id;
end;
$$;

revoke all on function public.create_organization(text,text,text,text)
  from public,anon;
grant execute on function public.create_organization(text,text,text,text)
  to authenticated;

create table if not exists public.platform_production_validation_runs (
  id uuid primary key default gen_random_uuid(),
  release_version text not null,
  frontend_version text not null,
  pwa_cache text not null,
  status text not null check (status in ('ready','attention','blocked')),
  total_checks integer not null check (total_checks >= 0),
  passed_checks integer not null check (passed_checks >= 0),
  warning_checks integer not null check (warning_checks >= 0),
  blocking_checks integer not null check (blocking_checks >= 0),
  report jsonb not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_production_validation_runs_created
  on public.platform_production_validation_runs(created_at desc);

alter table public.platform_production_validation_runs enable row level security;
revoke all on public.platform_production_validation_runs from anon,authenticated;

create or replace function public.platform_production_validation_report(
  p_frontend_version text,
  p_pwa_cache text,
  p_store boolean default false,
  p_manual_checks text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_release public.platform_release_state%rowtype;
  v_health jsonb;
  v_readiness jsonb;
  v_access jsonb;
  v_checks jsonb := '[]'::jsonb;
  v_report jsonb;
  v_manual_checklist jsonb;
  v_status text;
  v_total integer := 0;
  v_passed integer := 0;
  v_warnings integer := 0;
  v_blocking integer := 0;
  v_without_owner integer := 0;
  v_subscription_mismatch integer := 0;
  v_missing_objects integer := 0;
  v_runtime_open integer := 0;
  v_runtime_critical integer := 0;
  v_outdated_clients integer := 0;
  v_email_failed integer := 0;
  v_email_stalled integer := 0;
  v_push_failed integer := 0;
  v_push_stalled integer := 0;
  v_document_failed integer := 0;
  v_document_stalled integer := 0;
  v_import_stalled integer := 0;
  v_import_recent_errors integer := 0;
  v_sessions_without_enrollment integer := 0;
  v_sessions_without_trainer integer := 0;
  v_expired_invitations integer := 0;
  v_overdue_signatures integer := 0;
  v_access_issues integer := 0;
  v_old_module_requests integer := 0;
  v_old_access_requests integer := 0;
  v_manual_completed integer := 0;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Validation reservee au super administrateur NCR.';
  end if;

  select * into v_release
  from public.platform_release_state
  where singleton=true;

  v_health:=public.platform_global_health_report(24);
  v_readiness:=public.platform_release_readiness_report();
  v_access:=coalesce(v_health->'access_security','{}'::jsonb);

  v_runtime_open:=coalesce((v_health#>>'{summary,runtime_open}')::integer,0);
  v_runtime_critical:=coalesce((v_health#>>'{summary,runtime_critical}')::integer,0);
  v_outdated_clients:=coalesce((v_health#>>'{summary,outdated_clients}')::integer,0);
  v_email_failed:=coalesce((v_health#>>'{summary,email_failed}')::integer,0);
  v_email_stalled:=coalesce((v_health#>>'{summary,email_stalled}')::integer,0);
  v_push_failed:=coalesce((v_health#>>'{summary,push_failed}')::integer,0);
  v_push_stalled:=coalesce((v_health#>>'{summary,push_stalled}')::integer,0);
  v_old_module_requests:=coalesce((v_readiness#>>'{summary,old_training_module_requests}')::integer,0);
  v_access_issues:=
    coalesce((v_access#>>'{summary,rls_disabled}')::integer,0)
    +coalesce((v_access#>>'{summary,policyless}')::integer,0)
    +coalesce((v_access#>>'{summary,insecure_security_definer}')::integer,0)
    +coalesce((v_access#>>'{summary,unexpected_anon_functions}')::integer,0);

  select count(*)::integer into v_without_owner
  from public.organizations o
  where o.status in ('trial','active')
    and not exists (
      select 1 from public.organization_members m
      where m.organization_id=o.id and m.role='owner' and m.status='active'
    );

  select count(*)::integer into v_subscription_mismatch
  from public.organizations o
  left join public.organization_subscriptions s on s.organization_id=o.id
  where o.status in ('trial','active')
    and (
      s.organization_id is null
      or s.plan_key<>o.plan
      or s.status not in ('trialing','active')
    );

  select count(*)::integer into v_missing_objects
  from (
    values
      (to_regclass('public.platform_release_state') is not null),
      (to_regclass('public.platform_runtime_errors') is not null),
      (to_regclass('public.platform_access_requests') is not null),
      (to_regclass('public.platform_auth_email_events') is not null),
      (to_regclass('public.organization_import_jobs') is not null),
      (to_regclass('public.training_portal_accounts') is not null),
      (to_regclass('public.training_signature_requests') is not null),
      (to_regclass('public.training_document_jobs') is not null),
      (to_regprocedure('public.preview_training_recovery_import(uuid,text,jsonb)') is not null),
      (to_regprocedure('public.import_training_recovery_records(uuid,text,text,jsonb)') is not null),
      (to_regprocedure('public.complete_training_signature(uuid,uuid,text,text,text,text)') is not null),
      (to_regprocedure('public.platform_release_readiness_report()') is not null)
  ) required(available)
  where not available;

  select
    count(*) filter (where status='failed')::integer,
    count(*) filter (
      where status in ('pending','processing')
        and scheduled_for<=now()-interval '30 minutes'
    )::integer
  into v_document_failed,v_document_stalled
  from public.training_document_jobs;

  select
    count(*) filter (
      where status='processing' and created_at<=now()-interval '30 minutes'
    )::integer,
    count(*) filter (
      where status in ('failed','completed_with_errors')
        and created_at>=now()-interval '30 days'
    )::integer
  into v_import_stalled,v_import_recent_errors
  from public.organization_import_jobs;

  select count(*)::integer into v_sessions_without_enrollment
  from public.training_sessions s
  where s.status in ('scheduled','in_progress')
    and not exists (
      select 1 from public.training_session_enrollments e
      where e.organization_id=s.organization_id
        and e.session_id=s.id
        and e.status<>'canceled'
    );

  select count(*)::integer into v_sessions_without_trainer
  from public.training_sessions
  where status in ('scheduled','in_progress') and trainer_id is null;

  select count(*)::integer into v_expired_invitations
  from public.training_portal_invitations
  where status='pending' and expires_at<now();

  select count(*)::integer into v_overdue_signatures
  from public.training_signature_requests
  where status='pending' and due_date is not null and due_date<current_date;

  select count(*)::integer into v_old_access_requests
  from public.platform_access_requests
  where status='pending' and submitted_at<now()-interval '7 days';

  select count(*)::integer into v_manual_completed
  from unnest(array[
    'supabase','cloudflare','pwa','roles','domains','formation','access','email','backup'
  ]::text[]) expected(key)
  where expected.key=any(coalesce(p_manual_checks,'{}'::text[]));

  select jsonb_agg(
    jsonb_build_object(
      'key',manual.key,
      'label',manual.label,
      'completed',manual.key=any(coalesce(p_manual_checks,'{}'::text[]))
    )
    order by manual.position
  )
  into v_manual_checklist
  from (
    values
      (1,'supabase','Migration 088 executee et version 2.22.0 confirmee'),
      (2,'cloudflare','Build Cloudflare termine sans erreur'),
      (3,'pwa','Cache PWA renouvele sur ordinateur et mobile'),
      (4,'roles','Comptes proprietaire, manager, employe et externe testes'),
      (5,'domains','Un parcours critique teste pour chaque metier actif'),
      (6,'formation','Automatisations Formation, portails, signatures et import testes'),
      (7,'access','Demande publique, acceptation et activation du compte testees'),
      (8,'email','SPF, DKIM, DMARC et envoi depuis contact@ncr-suite.fr verifies'),
      (9,'backup','Sauvegarde Supabase et procedure de retour arriere confirmees')
  ) manual(position,key,label);

  v_checks:=jsonb_build_array(
    jsonb_build_object(
      'key','database_release','category','Version','label','Version Supabase',
      'status',case when v_release.database_version='2.22.0'
                        and v_release.expected_frontend_version='2.22.0'
                        and v_release.expected_pwa_cache='ncr-suite-shell-v2.22.0-commercial-launch'
                    then 'ok' else 'error' end,
      'detail','Base '||coalesce(v_release.database_version,'absente')||
        ' · frontend attendu '||coalesce(v_release.expected_frontend_version,'absent'),
      'action','Executer integralement la migration 088.'
    ),
    jsonb_build_object(
      'key','frontend_release','category','Version','label','Build et cache PWA',
      'status',case when p_frontend_version=v_release.expected_frontend_version
                        and p_pwa_cache=v_release.expected_pwa_cache
                    then 'ok' else 'error' end,
      'detail','Interface '||coalesce(p_frontend_version,'absente')||
        ' · cache '||coalesce(p_pwa_cache,'absent'),
      'action','Verifier le build Cloudflare puis fermer et rouvrir la PWA.'
    ),
    jsonb_build_object(
      'key','required_objects','category','Socle','label','Objets de production',
      'status',case when v_missing_objects=0 then 'ok' else 'error' end,
      'detail',case when v_missing_objects=0 then 'Tables et fonctions critiques disponibles.'
                    else v_missing_objects||' objet(s) critique(s) manquant(s).' end,
      'action','Verifier l ordre des migrations Supabase.'
    ),
    jsonb_build_object(
      'key','access_security','category','Securite','label','RLS et fonctions publiques',
      'status',case when v_access_issues=0 then 'ok' else 'error' end,
      'detail',case when v_access_issues=0 then 'Aucune exposition inattendue detectee.'
                    else v_access_issues||' anomalie(s) de securite detectee(s).' end,
      'action','Ouvrir le rapport Securite des acces et corriger chaque anomalie.'
    ),
    jsonb_build_object(
      'key','organization_owners','category','Comptes','label','Proprietaires actifs',
      'status',case when v_without_owner=0 then 'ok' else 'error' end,
      'detail',case when v_without_owner=0 then 'Chaque entreprise active possede un proprietaire.'
                    else v_without_owner||' entreprise(s) sans proprietaire actif.' end,
      'action','Nommer un proprietaire depuis Entreprises.'
    ),
    jsonb_build_object(
      'key','subscriptions','category','Abonnements','label','Cohérence des abonnements',
      'status',case when v_subscription_mismatch=0 then 'ok' else 'error' end,
      'detail',case when v_subscription_mismatch=0 then 'Formules et abonnements actifs sont coherents.'
                    else v_subscription_mismatch||' abonnement(s) absent(s) ou incoherent(s).' end,
      'action','Regulariser la formule et le statut depuis Abonnements.'
    ),
    jsonb_build_object(
      'key','runtime','category','Application','label','Erreurs des navigateurs',
      'status',case when v_runtime_critical>0 then 'error'
                    when v_runtime_open>0 then 'warning' else 'ok' end,
      'detail',v_runtime_open||' erreur(s) ouverte(s), dont '||v_runtime_critical||' critique(s).',
      'action','Traiter les erreurs ouvertes dans Surveillance.'
    ),
    jsonb_build_object(
      'key','client_versions','category','Application','label','Sessions sur l ancienne version',
      'status',case when v_outdated_clients=0 then 'ok' else 'warning' end,
      'detail',v_outdated_clients||' session(s) recente(s) utilise(nt) encore un ancien cache.',
      'action','Demander aux utilisateurs concernes de fermer puis rouvrir NCR Suite.'
    ),
    jsonb_build_object(
      'key','email_queue','category','Automatisations','label','File des e-mails',
      'status',case when v_email_failed>0 then 'error'
                    when v_email_stalled>0 then 'warning' else 'ok' end,
      'detail',v_email_failed||' echec(s) · '||v_email_stalled||' envoi(s) bloques.',
      'action','Relancer les e-mails depuis le SAV ou la supervision.'
    ),
    jsonb_build_object(
      'key','push_queue','category','Automatisations','label','Notifications PWA',
      'status',case when v_push_failed>10 then 'error'
                    when v_push_failed>0 or v_push_stalled>0 then 'warning' else 'ok' end,
      'detail',v_push_failed||' echec(s) · '||v_push_stalled||' notification(s) bloquees.',
      'action','Verifier le Worker push et les abonnements appareils.'
    ),
    jsonb_build_object(
      'key','training_documents','category','Formation','label','Documents automatiques',
      'status',case when v_document_failed>0 or v_document_stalled>0 then 'error' else 'ok' end,
      'detail',v_document_failed||' echec(s) · '||v_document_stalled||' traitement(s) bloques.',
      'action','Utiliser le SAV Formation pour diagnostiquer et relancer les jobs.'
    ),
    jsonb_build_object(
      'key','training_imports','category','Formation','label','Imports et reprise de donnees',
      'status',case when v_import_stalled>0 then 'error'
                    when v_import_recent_errors>0 then 'warning' else 'ok' end,
      'detail',v_import_stalled||' import(s) bloques · '||v_import_recent_errors||' import(s) recent(s) avec erreur.',
      'action','Telecharger le rapport d erreurs depuis Centre de demarrage.'
    ),
    jsonb_build_object(
      'key','training_sessions','category','Formation','label','Sessions planifiees',
      'status',case when v_sessions_without_enrollment>0 then 'error'
                    when v_sessions_without_trainer>0 then 'warning' else 'ok' end,
      'detail',v_sessions_without_enrollment||' sans stagiaire · '||v_sessions_without_trainer||' sans formateur.',
      'action','Completer les sessions avant leur demarrage.'
    ),
    jsonb_build_object(
      'key','training_portals','category','Formation','label','Invitations aux espaces',
      'status',case when v_expired_invitations=0 then 'ok' else 'warning' end,
      'detail',v_expired_invitations||' invitation(s) en attente depassee(s).',
      'action','Revoquer ou renvoyer les invitations expirees.'
    ),
    jsonb_build_object(
      'key','training_signatures','category','Formation','label','Signatures attendues',
      'status',case when v_overdue_signatures=0 then 'ok' else 'warning' end,
      'detail',v_overdue_signatures||' signature(s) ont depasse leur echeance.',
      'action','Relancer ou annuler les demandes depuis Portails Formation.'
    ),
    jsonb_build_object(
      'key','training_modules','category','Abonnements','label','Demandes de modules Formation',
      'status',case when v_old_module_requests>0 then 'warning' else 'ok' end,
      'detail',v_old_module_requests||' demande(s) de plus de 7 jours.',
      'action','Traiter les demandes en attente depuis Abonnements.'
    ),
    jsonb_build_object(
      'key','access_requests','category','Comptes','label','Demandes d acces entreprises',
      'status',case when v_old_access_requests>0 then 'warning' else 'ok' end,
      'detail',v_old_access_requests||' demande(s) en attente depuis plus de 7 jours.',
      'action','Traiter les demandes depuis Administration NCR.'
    )
  );

  if coalesce(p_store,false) then
    v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
      'key','manual_validation','category','Mise en production','label','Contrôles manuels',
      'status',case when v_manual_completed=9 then 'ok' else 'error' end,
      'detail',v_manual_completed||' contrôle(s) confirmé(s) sur 9.',
      'action','Terminer la liste de validation avant d enregistrer le verdict final.'
    ));
  end if;

  select
    count(*)::integer,
    count(*) filter (where item->>'status'='ok')::integer,
    count(*) filter (where item->>'status'='warning')::integer,
    count(*) filter (where item->>'status'='error')::integer
  into v_total,v_passed,v_warnings,v_blocking
  from jsonb_array_elements(v_checks) item;

  v_status:=case when v_blocking>0 then 'blocked'
                 when v_warnings>0 then 'attention'
                 else 'ready' end;

  v_report:=jsonb_build_object(
    'generated_at',now(),
    'release_version','2.22.0',
    'frontend_version',p_frontend_version,
    'pwa_cache',p_pwa_cache,
    'status',v_status,
    'summary',jsonb_build_object(
      'total',v_total,
      'passed',v_passed,
      'warnings',v_warnings,
      'blocking',v_blocking
    ),
    'checks',v_checks,
    'domains',coalesce(v_readiness->'domains','[]'::jsonb),
    'manual_checklist',coalesce(v_manual_checklist,'[]'::jsonb)
  );

  if coalesce(p_store,false) then
    insert into public.platform_production_validation_runs(
      release_version,frontend_version,pwa_cache,status,total_checks,
      passed_checks,warning_checks,blocking_checks,report,created_by
    ) values (
      '2.22.0',p_frontend_version,p_pwa_cache,v_status,v_total,
      v_passed,v_warnings,v_blocking,v_report,auth.uid()
    );

    insert into public.audit_logs(
      organization_id,user_id,action,entity_type,entity_id,metadata
    ) values (
      null,auth.uid(),'platform.production_validation_recorded',
      'platform_release','2.22.0',
      jsonb_build_object(
        'status',v_status,'passed',v_passed,
        'warnings',v_warnings,'blocking',v_blocking
      )
    );
  end if;

  return v_report;
end;
$$;

create or replace function public.platform_production_validation_history(
  p_limit integer default 12
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Historique reserve au super administrateur NCR.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,
    'release_version',r.release_version,
    'frontend_version',r.frontend_version,
    'pwa_cache',r.pwa_cache,
    'status',r.status,
    'total_checks',r.total_checks,
    'passed_checks',r.passed_checks,
    'warning_checks',r.warning_checks,
    'blocking_checks',r.blocking_checks,
    'created_at',r.created_at,
    'created_by_name',coalesce(nullif(trim(p.full_name),''),'Super-administrateur NCR'),
    'report',r.report
  ) order by r.created_at desc),'[]'::jsonb)
  into v_result
  from (
    select *
    from public.platform_production_validation_runs
    order by created_at desc
    limit greatest(1,least(coalesce(p_limit,12),50))
  ) r
  left join public.user_profiles p on p.id=r.created_by;

  return v_result;
end;
$$;

revoke all on function public.platform_production_validation_report(text,text,boolean,text[]) from public,anon;
revoke all on function public.platform_production_validation_history(integer) from public,anon;
grant execute on function public.platform_production_validation_report(text,text,boolean,text[]) to authenticated;
grant execute on function public.platform_production_validation_history(integer) to authenticated;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.22.0','2.22.0','ncr-suite-shell-v2.22.0-commercial-launch',
  now(),auth.uid(),
  'V2.22.0 : site public, acces sur validation, domaine ncr-suite.fr, SEO et e-mails transactionnels de marque NCR Suite.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
