-- NCR Suite V2.29.25 — Validation production : état courant et diagnostics lisibles.
-- Corrige deux faux angles morts du contrôle final sans masquer de vraie anomalie :
-- 1) les échecs de documents Formation supersédés par une génération plus récente ne bloquent plus ;
-- 2) les anomalies RLS / SECURITY DEFINER / anon sont intégrées au rapport avec leur nom exact.
--
-- La fonction existante reste la source du rapport global. Cette fonction corrigée l'enrichit,
-- ce qui préserve les évolutions de version, de checklist et de readiness déjà présentes en base.

begin;

create or replace function public.platform_production_validation_report_corrected(
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
  v_report jsonb;
  v_access jsonb := '{}'::jsonb;
  v_checks jsonb := '[]'::jsonb;
  v_status text;
  v_total integer := 0;
  v_passed integer := 0;
  v_warnings integer := 0;
  v_blocking integer := 0;
  v_manual_total integer := 0;
  v_manual_completed integer := 0;
  v_document_failed integer := 0;
  v_document_stalled integer := 0;
  v_document_failed_all integer := 0;
  v_document_superseded_failed integer := 0;
  v_access_issues integer := 0;
begin
  if auth.uid() is null or not public.is_platform_super_admin() then
    raise exception 'Validation reservee au super administrateur NCR.';
  end if;

  -- On réutilise volontairement le validateur déjà installé pour tout le reste.
  -- p_store=false évite d'enregistrer un verdict avant l'ajustement des deux contrôles ci-dessous.
  v_report := public.platform_production_validation_report(
    p_frontend_version,
    p_pwa_cache,
    false,
    coalesce(p_manual_checks,'{}'::text[])
  );

  v_access := coalesce(public.platform_access_security_report(),'{}'::jsonb);
  v_access_issues :=
    coalesce((v_access#>>'{summary,rls_disabled}')::integer,0)
    + coalesce((v_access#>>'{summary,policyless}')::integer,0)
    + coalesce((v_access#>>'{summary,insecure_security_definer}')::integer,0)
    + coalesce((v_access#>>'{summary,unexpected_anon_functions}')::integer,0);

  -- Un document peut avoir plusieurs générations. Un ancien job failed est historique
  -- dès qu'une génération plus récente existe pour le même document logique.
  with ranked_jobs as (
    select
      j.*,
      row_number() over (
        partition by j.organization_id,j.session_id,j.trainee_id,j.document_kind
        order by coalesce(j.generation_version,0) desc,j.updated_at desc,j.created_at desc,j.id desc
      ) as current_rank
    from public.training_document_jobs j
  ), current_jobs as (
    select * from ranked_jobs where current_rank=1
  )
  select
    count(*) filter (where status='failed')::integer,
    count(*) filter (
      where status in ('pending','processing')
        and scheduled_for<=now()-interval '30 minutes'
    )::integer
  into v_document_failed,v_document_stalled
  from current_jobs;

  select count(*)::integer
  into v_document_failed_all
  from public.training_document_jobs
  where status='failed';

  v_document_superseded_failed := greatest(v_document_failed_all-v_document_failed,0);

  select coalesce(jsonb_agg(
    case
      when item->>'key'='training_documents' then
        item || jsonb_build_object(
          'status',case when v_document_failed>0 or v_document_stalled>0 then 'error' else 'ok' end,
          'detail',
            v_document_failed||' echec(s) actuel(s) · '
            ||v_document_stalled||' traitement(s) bloque(s)'
            ||case when v_document_superseded_failed>0
                    then ' · '||v_document_superseded_failed||' ancien(s) echec(s) supersede(s) ignore(s)'
                    else '' end||'.',
          'action',case
            when v_document_failed>0 or v_document_stalled>0
              then 'Utiliser le SAV Formation pour traiter uniquement les jobs encore en echec ou bloques.'
            else 'Aucune action requise : les anciens echecs remplaces par une generation reussie restent dans l historique sans bloquer la production.'
          end,
          'diagnostics',jsonb_build_object(
            'current_failed_jobs',v_document_failed,
            'current_stalled_jobs',v_document_stalled,
            'superseded_failed_jobs',v_document_superseded_failed
          )
        )
      when item->>'key'='access_security' then
        item || jsonb_build_object(
          'status',case when v_access_issues=0 then 'ok' else 'error' end,
          'detail',case
            when v_access_issues=0 then 'Aucune exposition inattendue detectee.'
            else v_access_issues||' anomalie(s) de securite detectee(s). Le detail exact est affiche dans NCR Admin.'
          end,
          'action',case
            when v_access_issues=0 then 'Aucune action requise.'
            else 'Corriger uniquement les objets nommes dans le detail du controle Securite.'
          end,
          'diagnostics',jsonb_build_object(
            'rls_disabled_tables',coalesce(v_access->'rls_disabled_tables','[]'::jsonb),
            'insecure_security_definer_functions',coalesce(v_access->'insecure_security_definer_functions','[]'::jsonb),
            'unexpected_anon_functions',coalesce(v_access->'unexpected_anon_functions','[]'::jsonb),
            'sealed_by_rls_tables',coalesce(v_access->'sealed_by_rls_tables','[]'::jsonb)
          )
        )
      else item
    end
    order by ordinal_position
  ),'[]'::jsonb)
  into v_checks
  from jsonb_array_elements(coalesce(v_report->'checks','[]'::jsonb))
       with ordinality as checks(item,ordinal_position);

  -- Le validateur historique n'ajoute le contrôle manuel que lorsqu'il stocke le rapport.
  -- Ici on le reconstitue après correction afin que le verdict enregistré soit bien le verdict corrigé.
  if coalesce(p_store,false) then
    v_manual_total := jsonb_array_length(coalesce(v_report->'manual_checklist','[]'::jsonb));

    select count(*)::integer
    into v_manual_completed
    from jsonb_array_elements(coalesce(v_report->'manual_checklist','[]'::jsonb)) as manual(item)
    where coalesce((manual.item->>'completed')::boolean,false);

    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'key','manual_validation',
      'category','Mise en production',
      'label','Controles manuels',
      'status',case when v_manual_total>0 and v_manual_completed=v_manual_total then 'ok' else 'error' end,
      'detail',v_manual_completed||' controle(s) confirme(s) sur '||v_manual_total||'.',
      'action','Terminer la liste de validation avant d enregistrer le verdict final.'
    ));
  end if;

  select
    count(*)::integer,
    count(*) filter (where item->>'status'='ok')::integer,
    count(*) filter (where item->>'status'='warning')::integer,
    count(*) filter (where item->>'status'='error')::integer
  into v_total,v_passed,v_warnings,v_blocking
  from jsonb_array_elements(v_checks) as report_checks(item);

  v_status := case
    when v_blocking>0 then 'blocked'
    when v_warnings>0 then 'attention'
    else 'ready'
  end;

  v_report := v_report || jsonb_build_object(
    'generated_at',now(),
    'status',v_status,
    'summary',jsonb_build_object(
      'total',v_total,
      'passed',v_passed,
      'warnings',v_warnings,
      'blocking',v_blocking
    ),
    'checks',v_checks
  );

  if coalesce(p_store,false) then
    insert into public.platform_production_validation_runs(
      release_version,frontend_version,pwa_cache,status,total_checks,
      passed_checks,warning_checks,blocking_checks,report,created_by
    ) values (
      coalesce(nullif(v_report->>'release_version',''),'unknown'),
      p_frontend_version,
      p_pwa_cache,
      v_status,
      v_total,
      v_passed,
      v_warnings,
      v_blocking,
      v_report,
      auth.uid()
    );

    insert into public.audit_logs(
      organization_id,user_id,action,entity_type,entity_id,metadata
    ) values (
      null,
      auth.uid(),
      'platform.production_validation_recorded',
      'platform_release',
      coalesce(nullif(v_report->>'release_version',''),'unknown'),
      jsonb_build_object(
        'status',v_status,
        'passed',v_passed,
        'warnings',v_warnings,
        'blocking',v_blocking,
        'validator','current_state_diagnostics_v2'
      )
    );
  end if;

  return v_report;
end;
$$;

revoke all on function public.platform_production_validation_report_corrected(text,text,boolean,text[])
  from public,anon;
grant execute on function public.platform_production_validation_report_corrected(text,text,boolean,text[])
  to authenticated;

comment on function public.platform_production_validation_report_corrected(text,text,boolean,text[]) is
  'Validation production NCR : conserve le validateur existant, ignore uniquement les echecs Formation supersedes et expose le detail exact des anomalies de securite.';

commit;
select pg_notify('pgrst','reload schema');
