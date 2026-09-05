CREATE OR REPLACE FUNCTION private.beauty_check_appointment_resources_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
begin
  if coalesce(current_setting('ncr.beauty_history_import',true),'')='1' then
    return null;
  end if;
  perform private.beauty_assert_appointment_resources_available(new.id);
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION private.process_beauty_company_appointment_loyalty(p_appointment_id uuid, p_organization_id uuid, p_company_id uuid, p_client_id uuid, p_status text, p_amount_cents integer, p_old_client_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public,private,pg_catalog
AS $function$
declare
  v_settings public.beauty_company_loyalty_settings%rowtype;
  v_client public.clients%rowtype;
  v_state public.coiffure_appointment_loyalty_state%rowtype;
  v_points integer:=0;
  v_visits integer:=0;
begin
  if coalesce(current_setting('ncr.beauty_history_import',true),'')='1' then
    return;
  end if;
  perform private.ensure_beauty_company_loyalty_settings(p_organization_id,p_company_id,null);

  select * into v_settings
  from public.beauty_company_loyalty_settings
  where organization_id=p_organization_id and company_id=p_company_id;

  select * into v_client
  from public.clients
  where organization_id=p_organization_id
    and company_id=p_company_id
    and id=p_client_id;

  select * into v_state
  from public.coiffure_appointment_loyalty_state
  where appointment_id=p_appointment_id;

  if p_old_client_id is not null
     and p_old_client_id is distinct from p_client_id
     and v_state.appointment_id is not null
     and v_state.active then
    insert into public.coiffure_loyalty_ledger(
      organization_id,company_id,client_id,appointment_id,entry_type,
      points_delta,visits_delta,label
    )
    values(
      v_state.organization_id,v_state.company_id,v_state.client_id,p_appointment_id,
      'appointment_reversal',-v_state.points_awarded,-v_state.visits_awarded,
      'Régularisation du rendez-vous déplacé vers un autre client'
    );

    update public.coiffure_appointment_loyalty_state
    set active=false
    where appointment_id=p_appointment_id;

    select * into v_state
    from public.coiffure_appointment_loyalty_state
    where appointment_id=p_appointment_id;
  end if;

  if p_status='completed'
     and v_settings.program_active
     and (v_settings.points_enabled or v_settings.visits_enabled)
     and v_client.id is not null
     and v_client.loyalty_opt_in then

    v_points:=case when v_settings.points_enabled
      then floor(coalesce(p_amount_cents,0)::numeric/100*v_settings.points_per_euro)::integer+v_settings.points_per_visit
      else 0 end;
    v_visits:=case when v_settings.visits_enabled then 1 else 0 end;

    if v_state.appointment_id is null then
      insert into public.coiffure_appointment_loyalty_state(
        appointment_id,organization_id,company_id,client_id,points_awarded,visits_awarded,active
      )
      values(
        p_appointment_id,p_organization_id,p_company_id,p_client_id,v_points,v_visits,true
      );

      insert into public.coiffure_loyalty_ledger(
        organization_id,company_id,client_id,appointment_id,entry_type,
        points_delta,visits_delta,label
      )
      values(
        p_organization_id,p_company_id,p_client_id,p_appointment_id,'appointment_credit',
        v_points,v_visits,'Rendez-vous terminé'
      );

    elsif not v_state.active
       or v_state.client_id<>p_client_id
       or v_state.company_id is distinct from p_company_id then
      update public.coiffure_appointment_loyalty_state
      set organization_id=p_organization_id,
          company_id=p_company_id,
          client_id=p_client_id,
          points_awarded=v_points,
          visits_awarded=v_visits,
          active=true
      where appointment_id=p_appointment_id;

      insert into public.coiffure_loyalty_ledger(
        organization_id,company_id,client_id,appointment_id,entry_type,
        points_delta,visits_delta,label
      )
      values(
        p_organization_id,p_company_id,p_client_id,p_appointment_id,'appointment_credit',
        v_points,v_visits,'Rendez-vous revalidé comme terminé'
      );

    elsif v_state.points_awarded<>v_points or v_state.visits_awarded<>v_visits then
      insert into public.coiffure_loyalty_ledger(
        organization_id,company_id,client_id,appointment_id,entry_type,
        points_delta,visits_delta,label
      )
      values(
        p_organization_id,p_company_id,p_client_id,p_appointment_id,'appointment_adjustment',
        v_points-v_state.points_awarded,v_visits-v_state.visits_awarded,
        'Ajustement du rendez-vous terminé'
      );

      update public.coiffure_appointment_loyalty_state
      set points_awarded=v_points,visits_awarded=v_visits
      where appointment_id=p_appointment_id;
    end if;

    perform private.issue_beauty_company_threshold_rewards(p_organization_id,p_company_id,p_client_id);

  elsif p_status<>'completed'
     and v_state.appointment_id is not null
     and v_state.active then
    insert into public.coiffure_loyalty_ledger(
      organization_id,company_id,client_id,appointment_id,entry_type,
      points_delta,visits_delta,label
    )
    values(
      v_state.organization_id,v_state.company_id,v_state.client_id,p_appointment_id,
      'appointment_reversal',-v_state.points_awarded,-v_state.visits_awarded,
      'Rendez-vous retiré du statut terminé'
    );

    update public.coiffure_appointment_loyalty_state
    set active=false
    where appointment_id=p_appointment_id;
  end if;
end;
$function$;