-- NCR Suite — Facturation mensuelle Mon activité : intégrité facture + BPF
-- Complète 161_training_personal_monthly_billing.sql sans recréer un second moteur de facturation.

begin;

-- Une facture issue de "Mon activité" est, par définition, une prestation réalisée
-- pour un autre organisme de formation : elle doit alimenter le C10 lorsqu'elle est émise.
create or replace function public.enforce_training_personal_invoice_bpf()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $function$
begin
  if new.personal_activity_user_id is not null and new.document_kind = 'invoice' then
    new.bpf_revenue_category := 'training_organizations';
    new.bpf_included := true;
  end if;
  return new;
end;
$function$;

revoke all on function public.enforce_training_personal_invoice_bpf() from public,anon,authenticated;
grant execute on function public.enforce_training_personal_invoice_bpf() to service_role;

drop trigger if exists enforce_training_personal_invoice_bpf_before_write on public.training_invoices;
create trigger enforce_training_personal_invoice_bpf_before_write
before insert or update of personal_activity_user_id,bpf_revenue_category,bpf_included,document_kind
on public.training_invoices
for each row execute function public.enforce_training_personal_invoice_bpf();

-- Corrige aussi les brouillons/factures déjà créés par la migration 161.
update public.training_invoices
set bpf_revenue_category = 'training_organizations',
    bpf_included = true
where personal_activity_user_id is not null
  and document_kind = 'invoice';

-- Une intervention rattachée à une facture ne doit plus pouvoir changer de durée,
-- de tarif, de montant ou de statut. L'annulation du brouillon de facture la libère.
create or replace function public.protect_billed_training_personal_intervention()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $function$
begin
  if tg_op = 'DELETE' then
    if old.billing_invoice_id is not null then
      raise exception 'Cette intervention est rattachée à une facture. Annulez d abord le brouillon de facture.';
    end if;
    return old;
  end if;

  if old.billing_invoice_id is not null then
    if new.billing_invoice_id is null then
      if not exists (
        select 1
        from public.training_invoices i
        where i.id = old.billing_invoice_id
          and i.organization_id = old.reporting_organization_id
          and i.status = 'canceled'
      ) then
        raise exception 'Le rattachement à la facture ne peut pas être retiré manuellement.';
      end if;
      return new;
    end if;

    if new.billing_invoice_id is distinct from old.billing_invoice_id then
      raise exception 'Cette intervention est déjà rattachée à une autre facture.';
    end if;

    if new.center_name is distinct from old.center_name
       or new.activity_title is distinct from old.activity_title
       or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at
       or new.employment_mode is distinct from old.employment_mode
       or new.status is distinct from old.status
       or new.hourly_rate_cents is distinct from old.hourly_rate_cents
       or new.amount_excl_tax_cents is distinct from old.amount_excl_tax_cents then
      raise exception 'Cette intervention est déjà mise en facture. Annulez d abord le brouillon pour modifier ses données de facturation.';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.protect_billed_training_personal_intervention() from public,anon,authenticated;
grant execute on function public.protect_billed_training_personal_intervention() to service_role;

drop trigger if exists protect_billed_training_personal_intervention_before_write on public.training_personal_interventions;
create trigger protect_billed_training_personal_intervention_before_write
before update or delete on public.training_personal_interventions
for each row execute function public.protect_billed_training_personal_intervention();

-- Le calcul BPF existant consolide déjà C10 et G pour les interventions personnelles.
-- On l'enveloppe afin d'ajouter aussi, au cadre formateurs, les heures réellement
-- dispensées par les personnes de l'organisme déclarant dans "Mon activité".
do $block$
begin
  if to_regprocedure('public.refresh_training_bpf_report_core_before_personal_hours(uuid,uuid)') is null then
    alter function public.refresh_training_bpf_report(uuid,uuid)
      rename to refresh_training_bpf_report_core_before_personal_hours;
  end if;
end;
$block$;

revoke all on function public.refresh_training_bpf_report_core_before_personal_hours(uuid,uuid) from public,anon,authenticated;
grant execute on function public.refresh_training_bpf_report_core_before_personal_hours(uuid,uuid) to service_role;

create or replace function public.refresh_training_bpf_report(
  p_organization_id uuid,
  p_report_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public,pg_catalog
as $function$
declare
  v_data jsonb;
  v_report public.training_bpf_reports%rowtype;
  v_personal_hours numeric := 0;
  v_extra_people integer := 0;
  v_internal_count integer := 0;
  v_internal_hours numeric := 0;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id,'training_bpf') then
    raise exception 'Acces refuse.';
  end if;

  select * into v_report
  from public.training_bpf_reports
  where organization_id = p_organization_id
    and id = p_report_id;
  if not found then raise exception 'BPF introuvable.'; end if;

  v_data := public.refresh_training_bpf_report_core_before_personal_hours(p_organization_id,p_report_id);
  if v_report.status = 'locked' then return v_data; end if;

  select round(coalesce(sum(extract(epoch from (i.ends_at-i.starts_at))/3600.0),0)::numeric,2)
  into v_personal_hours
  from public.training_personal_interventions i
  join public.organization_members m
    on m.organization_id=i.reporting_organization_id
   and m.user_id=i.user_id
   and m.status='active'
   and m.role in ('owner','admin')
  where i.reporting_organization_id=p_organization_id
    and i.employment_mode='subcontractor'
    and i.status='completed'
    and i.regulatory_scope in ('professional_continuing','apprenticeship')
    and (i.ends_at at time zone 'Europe/Paris')::date between v_report.exercise_start and v_report.exercise_end;

  -- N'ajoute une personne au compteur E que si elle n'est pas déjà comptée comme
  -- formateur interne via une session de l'organisme sur le même exercice.
  with manual_people as (
    select distinct i.user_id
    from public.training_personal_interventions i
    join public.organization_members m
      on m.organization_id=i.reporting_organization_id
     and m.user_id=i.user_id
     and m.status='active'
     and m.role in ('owner','admin')
    where i.reporting_organization_id=p_organization_id
      and i.employment_mode='subcontractor'
      and i.status='completed'
      and i.regulatory_scope in ('professional_continuing','apprenticeship')
      and (i.ends_at at time zone 'Europe/Paris')::date between v_report.exercise_start and v_report.exercise_end
  )
  select count(*)::integer
  into v_extra_people
  from manual_people mp
  where not exists (
    select 1
    from public.training_portal_accounts a
    join public.training_trainers tr
      on tr.organization_id=a.organization_id
     and tr.id=a.trainer_id
     and coalesce(tr.bpf_relationship,'internal')='internal'
    join public.training_sessions s
      on s.organization_id=a.organization_id
     and s.trainer_id=a.trainer_id
     and s.status='completed'
     and coalesce(s.bpf_regulatory_scope,'review_required') in ('professional_continuing','apprenticeship')
     and (s.ends_at at time zone 'Europe/Paris')::date between v_report.exercise_start and v_report.exercise_end
    where a.user_id=mp.user_id
      and a.organization_id=p_organization_id
      and a.status='active'
      and a.subject_kind='trainer'
  );

  if v_personal_hours > 0 then
    v_internal_count := coalesce((v_data#>>'{trainers,internal,count}')::integer,0) + v_extra_people;
    v_internal_hours := coalesce((v_data#>>'{trainers,internal,hours}')::numeric,0) + v_personal_hours;
    v_data := jsonb_set(
      v_data,
      '{trainers,internal}',
      jsonb_build_object('count',v_internal_count,'hours',round(v_internal_hours,2)),
      true
    );
    v_data := jsonb_set(v_data,'{sources,personal_external_trainer_hours}',to_jsonb(v_personal_hours),true);

    update public.training_bpf_reports
    set calculated_data=v_data,
        calculated_at=now()
    where organization_id=p_organization_id
      and id=p_report_id;
  end if;

  return v_data;
end;
$function$;

revoke all on function public.refresh_training_bpf_report(uuid,uuid) from public,anon;
grant execute on function public.refresh_training_bpf_report(uuid,uuid) to authenticated,service_role;

comment on function public.refresh_training_bpf_report(uuid,uuid) is
  'Calcul BPF NCR Suite incluant les heures de sous-traitance saisies dans Mon activité : C10, cadre G et heures formateurs.';

select pg_notify('pgrst','reload schema');
commit;
