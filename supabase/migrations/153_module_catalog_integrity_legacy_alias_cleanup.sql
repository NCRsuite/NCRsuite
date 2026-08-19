-- NCR Suite V2.29.25 — correction de l'integrite du catalogue de modules.
-- Les cles racines historiques de metier restent conservees pour compatibilite.
-- manager_role est une fonctionnalite de formule, pas un module catalogue.

begin;

delete from public.organization_modules m
using public.organizations o
where o.id=m.organization_id
  and m.module_key='manager_role'
  and not exists (
    select 1 from public.module_catalog c where c.module_key=m.module_key
  );

create or replace function public.platform_release_readiness_report()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_catalog
as $$
declare
  v_without_owner integer;
  v_unknown_modules integer;
  v_duplicate_training_modules integer;
  v_old_training_requests integer;
  v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Acces administrateur NCR requis.'; end if;

  select count(*)::integer into v_without_owner
  from public.organizations o
  where o.status in ('trial','active')
    and not exists (
      select 1 from public.organization_members m
      where m.organization_id=o.id and m.role='owner' and m.status='active'
    );

  select count(*)::integer into v_unknown_modules
  from public.organization_modules m
  join public.organizations o on o.id=m.organization_id
  left join public.module_catalog c on c.module_key=m.module_key
  where c.module_key is null
    and not (
      m.module_key=o.business_type
      and m.module_key in ('coiffure','formation','securite','nettoyage')
    );

  select count(*)::integer into v_duplicate_training_modules
  from public.organization_training_modules m
  join public.training_module_catalog c on c.module_key=m.module_key
  where m.status='active'
    and cardinality(c.feature_keys)>0
    and not exists (
      select 1 from unnest(c.feature_keys) feature_key
      where not public.training_base_plan_has_feature(m.organization_id,feature_key)
    );

  select count(*)::integer into v_old_training_requests
  from public.training_module_change_requests
  where status in ('payment_pending','pending_review')
    and created_at<now()-interval '7 days';

  v_result := jsonb_build_object(
    'generated_at',now(),
    'ready',v_without_owner=0 and v_unknown_modules=0 and v_duplicate_training_modules=0,
    'summary',jsonb_build_object(
      'active_organizations',(select count(*) from public.organizations where status in ('trial','active')),
      'organizations_without_owner',v_without_owner,
      'unknown_organization_modules',v_unknown_modules,
      'duplicate_training_modules',v_duplicate_training_modules,
      'old_training_module_requests',v_old_training_requests
    ),
    'checks',jsonb_build_array(
      jsonb_build_object(
        'key','organization_owners','label','Proprietaires des entreprises',
        'status',case when v_without_owner=0 then 'ok' else 'error' end,
        'detail',case when v_without_owner=0 then 'Chaque entreprise active possede un proprietaire.'
          else v_without_owner||' entreprise(s) active(s) sans proprietaire.' end
      ),
      jsonb_build_object(
        'key','module_catalog','label','Integrite du catalogue de modules',
        'status',case when v_unknown_modules=0 then 'ok' else 'error' end,
        'detail',case when v_unknown_modules=0 then 'Toutes les activations catalogue sont coherentes.'
          else v_unknown_modules||' activation(s) sans module catalogue.' end
      ),
      jsonb_build_object(
        'key','training_module_billing','label','Facturation des modules Formation',
        'status',case when v_duplicate_training_modules=0 then 'ok' else 'error' end,
        'detail',case when v_duplicate_training_modules=0 then 'Aucun supplement deja inclus par une formule.'
          else v_duplicate_training_modules||' supplement(s) Formation deja inclus a regulariser.' end
      ),
      jsonb_build_object(
        'key','training_module_requests','label','Demandes Formation en attente',
        'status',case when v_old_training_requests=0 then 'ok' else 'warning' end,
        'detail',case when v_old_training_requests=0 then 'Aucune demande de plus de 7 jours.'
          else v_old_training_requests||' demande(s) depassent 7 jours.' end
      )
    ),
    'domains',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'business_type',business_type,'organizations',organization_count
      ) order by business_type),'[]'::jsonb)
      from (
        select business_type,count(*)::integer organization_count
        from public.organizations
        where status in ('trial','active')
        group by business_type
      ) domain_counts
    )
  );
  return v_result;
end;
$$;

commit;
select pg_notify('pgrst','reload schema');