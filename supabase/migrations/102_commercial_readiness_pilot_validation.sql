-- NCR Suite V2.27.0 - Recette commerciale d'une entreprise pilote
-- A executer apres 101_compact_navigation_subscription_consistency.sql.

begin;

do $$
begin
  if to_regclass('public.platform_release_state') is null
     or to_regclass('public.organization_subscriptions') is null
     or to_regclass('public.stripe_webhook_events') is null
     or to_regclass('public.subscription_data_retention_events') is null
     or to_regclass('public.platform_access_requests') is null then
    raise exception 'Les migrations NCR Suite precedentes doivent etre executees avant la V2.27.0.';
  end if;
end;
$$;

create table if not exists public.platform_commercial_validation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  organization_name text not null,
  business_type text not null,
  plan_key text not null,
  release_version text not null,
  frontend_version text not null,
  pwa_cache text not null,
  status text not null check (status in ('in_progress','ready','blocked')),
  automatic_summary jsonb not null default '{}'::jsonb,
  scenario_results jsonb not null default '[]'::jsonb,
  final_notes text,
  completed_count integer not null default 0 check (completed_count >= 0),
  total_count integer not null default 0 check (total_count >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_commercial_validation_runs_org
  on public.platform_commercial_validation_runs(organization_id,created_at desc);
create index if not exists idx_platform_commercial_validation_runs_created
  on public.platform_commercial_validation_runs(created_at desc);

alter table public.platform_commercial_validation_runs enable row level security;
revoke all on public.platform_commercial_validation_runs from public,anon,authenticated;

create or replace function public.platform_commercial_readiness_report(
  p_organization_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_org public.organizations%rowtype;
  v_sub public.organization_subscriptions%rowtype;
  v_release public.platform_release_state%rowtype;
  v_checks jsonb := '[]'::jsonb;
  v_scenarios jsonb;
  v_owner_count integer := 0;
  v_manager_count integer := 0;
  v_employee_count integer := 0;
  v_access_requests integer := 0;
  v_checkout_events integer := 0;
  v_webhook_failures integer := 0;
  v_runtime_errors integer := 0;
  v_runtime_critical integer := 0;
  v_email_failures integer := 0;
  v_push_devices integer := 0;
  v_outdated_clients integer := 0;
  v_retention_events integer := 0;
  v_portal_accounts integer := 0;
  v_expired_invitations integer := 0;
  v_signed_documents integer := 0;
  v_price_configured boolean := false;
  v_access_allowed boolean := false;
  v_total integer := 0;
  v_passed integer := 0;
  v_warnings integer := 0;
  v_blocking integer := 0;
  v_status text;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Recette commerciale reservee au super administrateur NCR.';
  end if;

  select * into v_org from public.organizations where id=p_organization_id;
  if not found then raise exception 'Entreprise pilote introuvable.'; end if;

  select * into v_sub
  from public.organization_subscriptions
  where organization_id=p_organization_id;

  select * into v_release
  from public.platform_release_state
  where singleton=true;

  select
    count(*) filter (where role='owner' and status='active')::integer,
    count(*) filter (where role in ('admin','manager') and status='active')::integer,
    count(*) filter (where role in ('employee','viewer') and status='active')::integer
  into v_owner_count,v_manager_count,v_employee_count
  from public.organization_members
  where organization_id=p_organization_id;

  select count(*)::integer into v_access_requests
  from public.platform_access_requests
  where organization_id=p_organization_id
    and status='approved';

  select
    count(*) filter (
      where event_type='checkout.session.completed' and status='processed'
    )::integer,
    count(*) filter (
      where status='failed' and received_at>=now()-interval '30 days'
    )::integer
  into v_checkout_events,v_webhook_failures
  from public.stripe_webhook_events
  where organization_id=p_organization_id;

  select
    count(*)::integer,
    count(*) filter (where severity='critical')::integer
  into v_runtime_errors,v_runtime_critical
  from public.platform_runtime_errors
  where organization_id=p_organization_id
    and resolved_at is null;

  select count(*)::integer into v_email_failures
  from public.email_outbox
  where organization_id=p_organization_id
    and status='failed'
    and created_at>=now()-interval '30 days';

  select count(distinct s.id)::integer into v_push_devices
  from public.organization_members m
  join public.push_subscriptions s
    on s.user_id=m.user_id and s.active=true
  where m.organization_id=p_organization_id
    and m.status='active';

  select count(*)::integer into v_outdated_clients
  from public.platform_runtime_heartbeats h
  where h.organization_id=p_organization_id
    and h.last_seen_at>=now()-interval '7 days'
    and (
      h.app_version is distinct from v_release.expected_frontend_version
      or h.pwa_cache is distinct from v_release.expected_pwa_cache
    );

  select count(*)::integer into v_retention_events
  from public.subscription_data_retention_events
  where organization_id=p_organization_id;

  if v_org.business_type='formation' then
    select count(*)::integer into v_portal_accounts
    from public.training_portal_accounts
    where organization_id=p_organization_id and status='active';

    select count(*)::integer into v_expired_invitations
    from public.training_portal_invitations
    where organization_id=p_organization_id
      and status='pending' and expires_at<now();

    select count(*)::integer into v_signed_documents
    from public.training_signature_requests
    where organization_id=p_organization_id and status='signed';
  end if;

  if v_sub.organization_id is not null then
    select exists (
      select 1
      from public.stripe_price_catalog c
      join public.platform_billing_settings b
        on b.singleton=true and b.stripe_livemode=c.livemode
      where c.business_type=v_org.business_type
        and c.plan_key=v_sub.plan_key
        and c.stripe_price_id=v_sub.stripe_price_id
        and c.active=true
    ) into v_price_configured;

    v_access_allowed:=public.organization_billing_access_allowed(p_organization_id);
  end if;

  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','organization','category','Entreprise','label','Entreprise active et formule attribuee',
    'status',case when v_org.status in ('trial','active') then 'ok' else 'error' end,
    'detail',v_org.name||' · '||v_org.business_type||' · '||v_org.plan||' · '||v_org.status,
    'action','Reouvrir ou regulariser le compte avant la recette.'
  ));
  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','owner','category','Acces','label','Proprietaire actif',
    'status',case when v_owner_count=1 then 'ok' when v_owner_count>1 then 'warning' else 'error' end,
    'detail',v_owner_count||' proprietaire(s) actif(s).',
    'action','Conserver exactement un proprietaire actif pour l entreprise pilote.'
  ));
  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','access_request','category','Acquisition','label','Demande d acces reliee au compte',
    'status',case when v_access_requests>0 then 'ok' else 'warning' end,
    'detail',v_access_requests||' demande(s) approuvee(s) reliee(s).',
    'action','Effectuer le parcours depuis la demande d acces pour la simulation commerciale.'
  ));
  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','stripe_subscription','category','Paiement','label','Abonnement Stripe complet',
    'status',case
      when v_sub.organization_id is null then 'error'
      when v_sub.provider<>'stripe' then 'error'
      when v_sub.stripe_customer_id is null or v_sub.stripe_subscription_id is null
        or v_sub.stripe_price_id is null then 'error'
      when v_sub.status not in ('active','trialing') then 'error'
      else 'ok' end,
    'detail',case when v_sub.organization_id is null then 'Aucun abonnement.'
      else coalesce(v_sub.provider,'—')||' · '||coalesce(v_sub.status,'—')
        ||' · client '||case when v_sub.stripe_customer_id is null then 'absent' else 'present' end
        ||' · abonnement '||case when v_sub.stripe_subscription_id is null then 'absent' else 'present' end end,
    'action','Finaliser Checkout et attendre le webhook Stripe avant d ouvrir les acces.'
  ));
  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','stripe_price','category','Paiement','label','Tarif Stripe coherent avec l offre',
    'status',case when v_price_configured then 'ok' else 'error' end,
    'detail',case when v_price_configured then 'Le price_id correspond au metier, a la formule et au mode Stripe.'
      else 'Aucun price_id actif correspondant a cet abonnement.' end,
    'action','Configurer le price_id dans Catalogue des offres puis synchroniser l abonnement.'
  ));
  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','checkout_webhook','category','Paiement','label','Activation confirmee par Stripe',
    'status',case when v_checkout_events>0 then 'ok' else 'warning' end,
    'detail',v_checkout_events||' evenement(s) Checkout traite(s) · '||v_webhook_failures||' echec(s) recent(s).',
    'action','Verifier la destination webhook et rejouer le paiement test si necessaire.'
  ));
  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','plan_consistency','category','Droits','label','Formule et droits coherents',
    'status',case
      when v_sub.organization_id is null then 'error'
      when v_org.plan<>v_sub.plan_key then 'error'
      when not v_access_allowed then 'error'
      else 'ok' end,
    'detail',case when v_sub.organization_id is null then 'Abonnement absent.'
      else 'Entreprise '||v_org.plan||' · abonnement '||v_sub.plan_key
        ||' · acces '||case when v_access_allowed then 'autorise' else 'bloque' end end,
    'action','Aligner la formule puis verifier le statut de paiement et le delai de grace.'
  ));
  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','data_retention','category','Cycle de vie','label','Conservation des donnees garantie',
    'status',case
      when v_sub.organization_id is not null and v_sub.data_retention_mode='preserve' then 'ok'
      else 'error' end,
    'detail',coalesce(v_sub.data_retention_mode,'non configure')||' · '||v_retention_events||' preuve(s) de cycle de vie.',
    'action','Retablir le mode preserve avant toute retrogradation ou resiliation.'
  ));
  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','roles','category','Roles','label','Roles internes disponibles pour le test',
    'status',case when v_owner_count>0 and v_manager_count>0 and v_employee_count>0 then 'ok' else 'warning' end,
    'detail',v_owner_count||' proprietaire(s) · '||v_manager_count||' manager(s) · '||v_employee_count||' employe(s).',
    'action','Inviter les roles manquants avant de confirmer leurs parcours.'
  ));
  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','runtime','category','Application','label','Aucune erreur critique ouverte',
    'status',case when v_runtime_critical>0 then 'error' when v_runtime_errors>0 then 'warning' else 'ok' end,
    'detail',v_runtime_errors||' erreur(s) ouverte(s), dont '||v_runtime_critical||' critique(s).',
    'action','Traiter les incidents de cette entreprise dans Surveillance.'
  ));
  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','email','category','Communications','label','Envois sans echec recent',
    'status',case when v_email_failures>0 then 'warning' else 'ok' end,
    'detail',v_email_failures||' echec(s) sur les 30 derniers jours.',
    'action','Verifier la reception, les indesirables et les pieces jointes avec une adresse reelle.'
  ));
  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','push','category','Notifications','label','Appareil actif pour les notifications',
    'status',case when v_push_devices>0 then 'ok' else 'warning' end,
    'detail',v_push_devices||' appareil(s) actif(s) rattache(s) aux membres.',
    'action','Activer les notifications sur le telephone de test puis verrouiller l ecran.'
  ));
  v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
    'key','pwa','category','PWA','label','Sessions recentes sur la version attendue',
    'status',case when v_outdated_clients>0 then 'warning' else 'ok' end,
    'detail',v_outdated_clients||' session(s) recente(s) utilise(nt) une ancienne version.',
    'action','Renouveler le cache sur ordinateur et mobile avant la recette finale.'
  ));

  if v_org.business_type='formation' then
    v_checks:=v_checks||jsonb_build_array(jsonb_build_object(
      'key','training_portals','category','Formation','label','Portails et signatures disponibles',
      'status',case when v_expired_invitations>0 then 'error'
        when v_portal_accounts=0 or v_signed_documents=0 then 'warning' else 'ok' end,
      'detail',v_portal_accounts||' portail(s) actif(s) · '||v_expired_invitations
        ||' invitation(s) expiree(s) · '||v_signed_documents||' signature(s) terminee(s).',
      'action','Tester les trois espaces, le lien manuel, le depot de piece et une signature.'
    ));
  end if;

  select
    count(*)::integer,
    count(*) filter (where item->>'status'='ok')::integer,
    count(*) filter (where item->>'status'='warning')::integer,
    count(*) filter (where item->>'status'='error')::integer
  into v_total,v_passed,v_warnings,v_blocking
  from jsonb_array_elements(v_checks) items(item);

  v_status:=case when v_blocking>0 then 'blocked'
    when v_warnings>0 then 'attention' else 'ready' end;

  v_scenarios:=jsonb_build_array(
    jsonb_build_object('key','acquisition','label','Acces et paiement','items',jsonb_build_array(
      jsonb_build_object('key','access_request_flow','label','Demande d acces acceptee puis compte invite'),
      jsonb_build_object('key','stripe_checkout_flow','label','Paiement Stripe termine et abonnement active'),
      jsonb_build_object('key','organization_activation','label','Bon metier, bonne formule et bons droits apres activation')
    )),
    jsonb_build_object('key','lifecycle','label','Cycle de vie de l abonnement','items',jsonb_build_array(
      jsonb_build_object('key','downgrade_period_end','label','Retrogradation appliquee en fin de periode'),
      jsonb_build_object('key','addon_change','label','Ajout puis retrait d un module sans suppression de donnees'),
      jsonb_build_object('key','payment_failure_grace','label','Paiement echoue, delai de grace puis restriction verifies'),
      jsonb_build_object('key','cancellation_portal','label','Resiliation depuis le portail Stripe verifiee'),
      jsonb_build_object('key','data_restore','label','Donnees retrouvees apres retour a une offre superieure')
    )),
    jsonb_build_object('key','roles','label','Roles et espaces','items',jsonb_build_array(
      jsonb_build_object('key','owner_role','label','Parcours proprietaire teste'),
      jsonb_build_object('key','manager_role','label','Parcours manager teste'),
      jsonb_build_object('key','employee_role','label','Parcours employe teste'),
      jsonb_build_object('key','external_spaces','label','Espaces externes utiles au metier testes')
    )),
    jsonb_build_object('key','communications','label','Invitations et communications','items',jsonb_build_array(
      jsonb_build_object('key','invitations','label','Invitations recues et activation terminee'),
      jsonb_build_object('key','manual_links','label','Liens manuels copies et ouverts avec succes'),
      jsonb_build_object('key','signatures','label','Signature et historique de preuve verifies'),
      jsonb_build_object('key','email_delivery','label','E-mails, indesirables et pieces jointes controles'),
      jsonb_build_object('key','locked_push','label','Notification recue sur telephone verrouille')
    )),
    jsonb_build_object('key','devices','label','Ordinateur et mobile','items',jsonb_build_array(
      jsonb_build_object('key','desktop_path','label','Parcours critique termine sur ordinateur'),
      jsonb_build_object('key','mobile_pwa','label','Parcours critique termine dans la PWA mobile'),
      jsonb_build_object('key','pwa_cache','label','Cache renouvele et version confirmee sur les deux appareils')
    )),
    jsonb_build_object('key','operations','label','Protection et decision','items',jsonb_build_array(
      jsonb_build_object('key','backup_rollback','label','Sauvegarde et procedure de retour arriere confirmees'),
      jsonb_build_object('key','pilot_scenario','label','Premier parcours client reel simule sans modifier les autres donnees')
    ))
  );

  return jsonb_build_object(
    'generated_at',now(),
    'organization',jsonb_build_object(
      'id',v_org.id,'name',v_org.name,'business_type',v_org.business_type,
      'plan',v_org.plan,'status',v_org.status
    ),
    'release_version',v_release.database_version,
    'frontend_version',v_release.expected_frontend_version,
    'pwa_cache',v_release.expected_pwa_cache,
    'status',v_status,
    'summary',jsonb_build_object(
      'total',v_total,'passed',v_passed,'warnings',v_warnings,'blocking',v_blocking
    ),
    'checks',v_checks,
    'scenarios',v_scenarios
  );
end;
$$;

create or replace function public.store_platform_commercial_validation(
  p_organization_id uuid,
  p_frontend_version text,
  p_pwa_cache text,
  p_scenario_results jsonb,
  p_final_notes text default null,
  p_finalize boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_report jsonb;
  v_org public.organizations%rowtype;
  v_expected_keys text[]:=array[
    'access_request_flow','stripe_checkout_flow','organization_activation',
    'downgrade_period_end','addon_change','payment_failure_grace','cancellation_portal','data_restore',
    'owner_role','manager_role','employee_role','external_spaces',
    'invitations','manual_links','signatures','email_delivery','locked_push',
    'desktop_path','mobile_pwa','pwa_cache','backup_rollback','pilot_scenario'
  ];
  v_completed integer:=0;
  v_total integer:=array_length(v_expected_keys,1);
  v_unknown integer:=0;
  v_status text;
  v_id uuid;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Recette commerciale reservee au super administrateur NCR.';
  end if;
  if jsonb_typeof(coalesce(p_scenario_results,'[]'::jsonb))<>'array' then
    raise exception 'Les resultats de recette sont invalides.';
  end if;

  select * into v_org from public.organizations where id=p_organization_id;
  if not found then raise exception 'Entreprise pilote introuvable.'; end if;

  select count(*)::integer into v_unknown
  from jsonb_array_elements(coalesce(p_scenario_results,'[]'::jsonb)) values_list(item)
  where not (item->>'key'=any(v_expected_keys))
     or char_length(coalesce(item->>'note',''))>1200;
  if v_unknown>0 then raise exception 'Un resultat de recette est inconnu ou trop long.'; end if;

  select count(distinct item->>'key')::integer into v_completed
  from jsonb_array_elements(coalesce(p_scenario_results,'[]'::jsonb)) values_list(item)
  where item->>'key'=any(v_expected_keys)
    and coalesce((item->>'completed')::boolean,false);

  v_report:=public.platform_commercial_readiness_report(p_organization_id);

  if p_finalize and v_completed<>v_total then
    raise exception 'Tous les scenarios doivent etre confirmes avant la cloture.';
  end if;
  if p_finalize and char_length(trim(coalesce(p_final_notes,'')))<10 then
    raise exception 'Ajoutez une observation finale ou une reference de preuve.';
  end if;

  v_status:=case
    when coalesce((v_report#>>'{summary,blocking}')::integer,0)>0 then 'blocked'
    when p_finalize then 'ready'
    else 'in_progress'
  end;

  insert into public.platform_commercial_validation_runs(
    organization_id,organization_name,business_type,plan_key,
    release_version,frontend_version,pwa_cache,status,automatic_summary,
    scenario_results,final_notes,completed_count,total_count,created_by
  ) values (
    v_org.id,v_org.name,v_org.business_type,v_org.plan,
    v_report->>'release_version',trim(p_frontend_version),trim(p_pwa_cache),v_status,
    v_report->'summary',coalesce(p_scenario_results,'[]'::jsonb),
    nullif(trim(coalesce(p_final_notes,'')),''),v_completed,v_total,auth.uid()
  )
  returning id into v_id;

  insert into public.audit_logs(
    organization_id,user_id,action,entity_type,entity_id,metadata
  ) values (
    p_organization_id,auth.uid(),'platform.commercial_validation_saved',
    'platform_commercial_validation_run',v_id::text,
    jsonb_build_object(
      'status',v_status,'completed',v_completed,'total',v_total,
      'automatic_blocking',coalesce((v_report#>>'{summary,blocking}')::integer,0)
    )
  );

  return jsonb_build_object(
    'id',v_id,'status',v_status,'completed_count',v_completed,'total_count',v_total,
    'created_at',now(),'report',v_report
  );
end;
$$;

create or replace function public.platform_commercial_validation_history(
  p_organization_id uuid default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Recette commerciale reservee au super administrateur NCR.';
  end if;

  select coalesce(jsonb_agg(item order by (item->>'created_at')::timestamptz desc),'[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id',r.id,'organization_id',r.organization_id,
      'organization_name',r.organization_name,'business_type',r.business_type,
      'plan_key',r.plan_key,'release_version',r.release_version,
      'frontend_version',r.frontend_version,'pwa_cache',r.pwa_cache,
      'status',r.status,'automatic_summary',r.automatic_summary,
      'scenario_results',r.scenario_results,'final_notes',r.final_notes,
      'completed_count',r.completed_count,'total_count',r.total_count,
      'created_at',r.created_at,
      'created_by_name',coalesce(nullif(trim(p.full_name),''),u.email::text,'Super administrateur')
    ) item
    from public.platform_commercial_validation_runs r
    left join public.user_profiles p on p.id=r.created_by
    left join auth.users u on u.id=r.created_by
    where p_organization_id is null or r.organization_id=p_organization_id
    order by r.created_at desc
    limit least(greatest(coalesce(p_limit,20),1),100)
  ) rows;
  return v_result;
end;
$$;

revoke all on function public.platform_commercial_readiness_report(uuid) from public,anon;
revoke all on function public.store_platform_commercial_validation(uuid,text,text,jsonb,text,boolean) from public,anon;
revoke all on function public.platform_commercial_validation_history(uuid,integer) from public,anon;
grant execute on function public.platform_commercial_readiness_report(uuid) to authenticated;
grant execute on function public.store_platform_commercial_validation(uuid,text,text,jsonb,text,boolean) to authenticated;
grant execute on function public.platform_commercial_validation_history(uuid,integer) to authenticated;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.27.0','2.27.0','ncr-suite-shell-v2.27.0-commercial-readiness',
  now(),auth.uid(),
  'V2.27.0 : recette commerciale ciblee, preuves horodatees et validation d une entreprise pilote sans creation de donnees automatique.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
