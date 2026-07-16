-- NCR Suite V2.6.2 — Finalisation opérationnelle Sécurité
-- Devis e-mail, fiche agent, facturation planifiée par défaut, prise/fin de poste QG et GPS fiabilisé.
-- À exécuter après 038_fix_appointment_push_trigger.sql.

begin;

-- Cycle opérationnel explicite des vacations et règle de facturation.
alter table public.security_shifts
  add column if not exists clocked_in_at timestamptz,
  add column if not exists clocked_in_by uuid references auth.users(id) on delete set null,
  add column if not exists clocked_in_source text,
  add column if not exists clocked_out_at timestamptz,
  add column if not exists clocked_out_by uuid references auth.users(id) on delete set null,
  add column if not exists clocked_out_source text,
  add column if not exists logbook_status text not null default 'open',
  add column if not exists logbook_closed_at timestamptz,
  add column if not exists logbook_closed_by uuid references auth.users(id) on delete set null,
  add column if not exists logbook_closed_source text,
  add column if not exists billing_minutes_override integer,
  add column if not exists billing_override_reason text,
  add column if not exists billing_override_at timestamptz,
  add column if not exists billing_override_by uuid references auth.users(id) on delete set null;

alter table public.security_shifts
  drop constraint if exists security_shifts_status_check,
  add constraint security_shifts_status_check check (status in ('planned','in_progress','completed','canceled')),
  drop constraint if exists security_shifts_clocked_in_source_check,
  add constraint security_shifts_clocked_in_source_check check (clocked_in_source is null or clocked_in_source in ('agent','qg','migration')),
  drop constraint if exists security_shifts_clocked_out_source_check,
  add constraint security_shifts_clocked_out_source_check check (clocked_out_source is null or clocked_out_source in ('agent','qg','migration')),
  drop constraint if exists security_shifts_logbook_status_check,
  add constraint security_shifts_logbook_status_check check (logbook_status in ('open','closed')),
  drop constraint if exists security_shifts_logbook_closed_source_check,
  add constraint security_shifts_logbook_closed_source_check check (logbook_closed_source is null or logbook_closed_source in ('agent','qg','dossier','migration')),
  drop constraint if exists security_shifts_billing_minutes_override_check,
  add constraint security_shifts_billing_minutes_override_check check (billing_minutes_override is null or billing_minutes_override between 0 and 2880);

create index if not exists idx_security_shifts_agent_period
  on public.security_shifts(organization_id, agent_id, starts_at desc);
create index if not exists idx_security_shifts_operational_state
  on public.security_shifts(organization_id, status, logbook_status, ends_at desc);

-- Reprise prudente des données déjà présentes.
update public.security_shifts s
set clocked_in_at = source.occurred_at,
    clocked_in_source = 'migration'
from (
  select organization_id, shift_id, min(occurred_at) occurred_at
  from public.security_logbook_entries
  where shift_id is not null and category = 'prise_poste'
  group by organization_id, shift_id
) source
where s.organization_id = source.organization_id
  and s.id = source.shift_id
  and s.clocked_in_at is null;

update public.security_shifts s
set clocked_out_at = source.occurred_at,
    clocked_out_source = 'migration',
    logbook_status = case when s.status = 'completed' then 'closed' else s.logbook_status end,
    logbook_closed_at = case when s.status = 'completed' then source.occurred_at else s.logbook_closed_at end,
    logbook_closed_source = case when s.status = 'completed' then 'migration' else s.logbook_closed_source end
from (
  select organization_id, shift_id, max(occurred_at) occurred_at
  from public.security_logbook_entries
  where shift_id is not null and category = 'fin_poste'
  group by organization_id, shift_id
) source
where s.organization_id = source.organization_id
  and s.id = source.shift_id
  and s.clocked_out_at is null;

-- Empêche les ajouts après fermeture de la main courante.
create or replace function public.protect_closed_security_logbook()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status text;
  v_organization_id uuid;
  v_shift_id uuid;
begin
  if tg_op = 'DELETE' then
    v_organization_id := old.organization_id;
    v_shift_id := old.shift_id;
  else
    v_organization_id := new.organization_id;
    v_shift_id := new.shift_id;
  end if;

  if v_shift_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select logbook_status into v_status
  from public.security_shifts
  where organization_id = v_organization_id
    and id = v_shift_id;

  if v_status = 'closed' then
    raise exception 'La main courante de cette vacation est clôturée.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists protect_closed_security_logbook_trigger on public.security_logbook_entries;
create trigger protect_closed_security_logbook_trigger
before insert or update or delete on public.security_logbook_entries
for each row execute procedure public.protect_closed_security_logbook();

-- Prise / fin de poste unique, utilisable par l’agent ou par le QG.
create or replace function public.set_security_shift_presence_event(
  p_organization_id uuid,
  p_shift_id uuid,
  p_action text,
  p_note text default null,
  p_force boolean default false
)
returns public.security_shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.security_shifts%rowtype;
  v_agent uuid;
  v_manager boolean;
  v_action text := lower(trim(coalesce(p_action, '')));
  v_source text;
  v_event_time timestamptz := now();
  v_planned integer;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  v_manager := public.is_security_manager(p_organization_id);
  v_agent := public.current_security_agent_id(p_organization_id);

  select * into v_shift
  from public.security_shifts
  where organization_id = p_organization_id and id = p_shift_id
  for update;
  if v_shift.id is null then raise exception 'Vacation introuvable.'; end if;
  if v_shift.status = 'canceled' then raise exception 'Cette vacation est annulée.'; end if;
  if not v_manager and (v_agent is null or v_shift.agent_id <> v_agent) then
    raise exception 'Cette vacation ne vous est pas attribuée.';
  end if;
  if v_shift.dossier_status in ('closed','archived') then
    raise exception 'Le dossier de cette vacation est déjà clôturé.';
  end if;

  v_source := case when v_manager then 'qg' else 'agent' end;
  if not v_manager and not p_force and (now() < v_shift.starts_at - interval '4 hours' or now() > v_shift.ends_at + interval '8 hours') then
    raise exception 'Cette action est disponible uniquement autour de la vacation.';
  end if;

  if v_action = 'start' then
    if v_shift.logbook_status = 'closed' then raise exception 'La main courante est déjà clôturée.'; end if;
    if v_shift.clocked_in_at is null then
      insert into public.security_logbook_entries(
        organization_id, shift_id, site_id, agent_id, occurred_at, category, severity,
        title, details, status, created_by
      ) values (
        p_organization_id, v_shift.id, v_shift.site_id, v_shift.agent_id, v_event_time,
        'prise_poste', 'info', 'Prise de poste',
        nullif(trim(coalesce(p_note, case when v_manager then 'Prise de poste enregistrée par le QG.' else '' end)), ''),
        'open', auth.uid()
      );
    end if;
    update public.security_shifts
    set status = case when status = 'planned' then 'in_progress' else status end,
        clocked_in_at = coalesce(clocked_in_at, v_event_time),
        clocked_in_by = coalesce(clocked_in_by, auth.uid()),
        clocked_in_source = coalesce(clocked_in_source, v_source),
        updated_at = now()
    where organization_id = p_organization_id and id = p_shift_id
    returning * into v_shift;

  elsif v_action = 'end' then
    if v_shift.clocked_in_at is null then
      if not v_manager and not p_force then raise exception 'Prends d’abord ton poste.'; end if;
      insert into public.security_logbook_entries(
        organization_id, shift_id, site_id, agent_id, occurred_at, category, severity,
        title, details, status, created_by
      ) values (
        p_organization_id, v_shift.id, v_shift.site_id, v_shift.agent_id,
        least(v_event_time, greatest(v_shift.starts_at, v_shift.ends_at - interval '1 minute')),
        'prise_poste', 'attention', 'Prise de poste régularisée par le QG',
        nullif(trim(coalesce(p_note, 'Prise de poste manquante régularisée lors de la clôture.')), ''),
        'open', auth.uid()
      );
    end if;

    if v_shift.clocked_out_at is null then
      insert into public.security_logbook_entries(
        organization_id, shift_id, site_id, agent_id, occurred_at, category, severity,
        title, details, status, created_by
      ) values (
        p_organization_id, v_shift.id, v_shift.site_id, v_shift.agent_id, v_event_time,
        'fin_poste', 'info', 'Fin de poste',
        nullif(trim(coalesce(p_note, case when v_manager then 'Fin de poste enregistrée par le QG.' else '' end)), ''),
        'open', auth.uid()
      );
    end if;

    v_planned := greatest(0, floor(extract(epoch from (v_shift.ends_at - v_shift.starts_at)) / 60)::integer - v_shift.break_minutes);
    update public.security_pti_sessions
    set status = 'closed', closed_at = coalesce(closed_at, now()), updated_at = now()
    where organization_id = p_organization_id and shift_id = p_shift_id and status in ('active','alerted');
    update public.security_agent_presence
    set status = 'stopped', tracking_active = false, wake_lock_active = false,
        stopped_at = coalesce(stopped_at, now()), last_seen_at = now(), updated_at = now()
    where organization_id = p_organization_id and shift_id = p_shift_id and status <> 'stopped';

    update public.security_shifts
    set status = 'completed',
        completed_at = coalesce(completed_at, now()),
        completed_by = coalesce(completed_by, auth.uid()),
        actual_minutes = coalesce(actual_minutes, v_planned),
        clocked_in_at = coalesce(clocked_in_at, v_shift.starts_at),
        clocked_in_by = coalesce(clocked_in_by, auth.uid()),
        clocked_in_source = coalesce(clocked_in_source, v_source),
        clocked_out_at = coalesce(clocked_out_at, v_event_time),
        clocked_out_by = coalesce(clocked_out_by, auth.uid()),
        clocked_out_source = coalesce(clocked_out_source, v_source),
        logbook_status = 'closed',
        logbook_closed_at = coalesce(logbook_closed_at, v_event_time),
        logbook_closed_by = coalesce(logbook_closed_by, auth.uid()),
        logbook_closed_source = coalesce(logbook_closed_source, v_source),
        updated_at = now()
    where organization_id = p_organization_id and id = p_shift_id
    returning * into v_shift;
  else
    raise exception 'Action invalide.';
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (p_organization_id, auth.uid(), 'security.shift_' || v_action,
    'security_shift', p_shift_id::text,
    jsonb_build_object('source', v_source, 'force', p_force, 'note', nullif(trim(coalesce(p_note,'')),'')));
  return v_shift;
end;
$$;

revoke all on function public.set_security_shift_presence_event(uuid,uuid,text,text,boolean) from public;
grant execute on function public.set_security_shift_presence_event(uuid,uuid,text,text,boolean) to authenticated;

create or replace function public.reopen_security_shift_operations(
  p_organization_id uuid,
  p_shift_id uuid,
  p_note text default null
)
returns public.security_shifts
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.security_shifts%rowtype;
begin
  if auth.uid() is null or not public.is_security_office_admin(p_organization_id) then
    raise exception 'Seuls le propriétaire et les administrateurs peuvent rouvrir une vacation.';
  end if;
  update public.security_shifts
  set logbook_status = 'open', logbook_closed_at = null, logbook_closed_by = null,
      logbook_closed_source = null,
      dossier_status = 'open', dossier_reopened_at = now(), dossier_reopened_by = auth.uid(),
      dossier_archived_at = null, dossier_archived_by = null,
      dossier_note = nullif(trim(coalesce(p_note,'')),''), updated_at = now()
  where organization_id = p_organization_id and id = p_shift_id
  returning * into v_row;
  if v_row.id is null then raise exception 'Vacation introuvable.'; end if;
  return v_row;
end;
$$;

revoke all on function public.reopen_security_shift_operations(uuid,uuid,text) from public;
grant execute on function public.reopen_security_shift_operations(uuid,uuid,text) to authenticated;

-- Une correction de facturation est une exception volontaire et motivée.
create or replace function public.set_security_shift_billing_override(
  p_organization_id uuid,
  p_shift_id uuid,
  p_minutes integer default null,
  p_reason text default null
)
returns public.security_shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.security_shifts%rowtype;
  v_planned integer;
begin
  if auth.uid() is null or not public.is_security_manager(p_organization_id) then
    raise exception 'Accès insuffisant.';
  end if;
  select * into v_row from public.security_shifts
  where organization_id = p_organization_id and id = p_shift_id for update;
  if v_row.id is null then raise exception 'Vacation introuvable.'; end if;
  if v_row.status <> 'completed' or v_row.final_invoice_id is not null then
    raise exception 'La vacation doit être terminée et non facturée.';
  end if;
  v_planned := greatest(0, floor(extract(epoch from (v_row.ends_at - v_row.starts_at)) / 60)::integer - v_row.break_minutes);
  if p_minutes is not null and (p_minutes < 0 or p_minutes > 2880) then raise exception 'Durée facturée invalide.'; end if;
  if p_minutes is not null and p_minutes <> v_planned and nullif(trim(coalesce(p_reason,'')),'') is null then
    raise exception 'Un motif est obligatoire pour modifier les heures planifiées.';
  end if;

  update public.security_shifts
  set billing_minutes_override = case when p_minutes is null or p_minutes = v_planned then null else p_minutes end,
      billing_override_reason = case when p_minutes is null or p_minutes = v_planned then null else nullif(trim(p_reason),'') end,
      billing_override_at = case when p_minutes is null or p_minutes = v_planned then null else now() end,
      billing_override_by = case when p_minutes is null or p_minutes = v_planned then null else auth.uid() end,
      updated_at = now()
  where organization_id = p_organization_id and id = p_shift_id
  returning * into v_row;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (p_organization_id, auth.uid(), 'security.billing_duration_changed', 'security_shift', p_shift_id::text,
    jsonb_build_object('planned_minutes', v_planned, 'billed_minutes', coalesce(v_row.billing_minutes_override,v_planned), 'reason', v_row.billing_override_reason));
  return v_row;
end;
$$;

revoke all on function public.set_security_shift_billing_override(uuid,uuid,integer,text) from public;
grant execute on function public.set_security_shift_billing_override(uuid,uuid,integer,text) to authenticated;

-- Même signature qu’en V2.5.5 : la colonne actual_minutes renvoie désormais les minutes facturées.
create or replace function public.preview_security_final_invoice(
  p_organization_id uuid,
  p_client_id uuid,
  p_period_start date,
  p_period_end date
)
returns table (
  site_id uuid,
  site_name text,
  completed_shift_count integer,
  actual_minutes integer,
  hourly_rate_cents integer,
  line_total_cents integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Accès insuffisant.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'security_final_billing') then raise exception 'La facturation définitive n’est pas incluse dans cette offre.'; end if;
  if p_period_end < p_period_start then raise exception 'Période invalide.'; end if;
  return query
  select site.id, site.name, count(shift.id)::integer,
    sum(coalesce(shift.billing_minutes_override,
      greatest(0, floor(extract(epoch from (shift.ends_at - shift.starts_at)) / 60)::integer - shift.break_minutes)))::integer,
    site.hourly_rate_cents,
    round((sum(coalesce(shift.billing_minutes_override,
      greatest(0, floor(extract(epoch from (shift.ends_at - shift.starts_at)) / 60)::integer - shift.break_minutes)))::numeric / 60) * site.hourly_rate_cents)::integer
  from public.security_sites site
  join public.security_shifts shift on shift.organization_id = site.organization_id and shift.site_id = site.id
  where site.organization_id = p_organization_id and site.client_id = p_client_id
    and shift.status = 'completed' and shift.ends_at <= now() and shift.final_invoice_id is null
    and shift.starts_at >= (p_period_start::timestamp at time zone coalesce(nullif(site.timezone,''), 'Europe/Paris'))
    and shift.starts_at < ((p_period_end + 1)::timestamp at time zone coalesce(nullif(site.timezone,''), 'Europe/Paris'))
  group by site.id, site.name, site.hourly_rate_cents
  order by site.name;
end;
$$;

revoke all on function public.preview_security_final_invoice(uuid,uuid,date,date) from public;
grant execute on function public.preview_security_final_invoice(uuid,uuid,date,date) to authenticated;

-- Remplace la génération pour appliquer la règle : heures planifiées, sauf correction explicite.
create or replace function public.generate_security_final_invoice(
  p_organization_id uuid,
  p_client_id uuid,
  p_period_start date,
  p_period_end date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid; v_invoice_number text; v_year integer := extract(year from current_date)::integer;
  v_sequence integer; v_subtotal integer := 0; v_tax integer := 0; v_total integer := 0;
  v_tax_bps integer := 0; v_terms integer := 30; v_issuer jsonb; v_client jsonb;
  v_line_count integer := 0; r record;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then raise exception 'Accès insuffisant.'; end if;
  if not public.organization_has_plan_feature(p_organization_id, 'security_final_billing') then raise exception 'La facturation définitive n’est pas incluse dans cette offre.'; end if;
  if p_period_end < p_period_start then raise exception 'Période invalide.'; end if;

  select round(coalesce(o.security_default_vat_rate,20)*100)::integer,
    coalesce(o.security_payment_terms_days,30),
    jsonb_build_object('name',coalesce(o.public_name,o.name),'logo_url',o.logo_url,'address',o.security_billing_address,
      'postal_code',o.security_billing_postal_code,'city',o.security_billing_city,'siret',o.security_billing_siret,
      'vat_number',o.security_billing_vat_number,'email',o.security_billing_email,'phone',o.security_billing_phone,
      'late_penalty_text',o.security_late_penalty_text,'tax_exemption_text',o.security_tax_exemption_text,
      'bank_account_holder',o.security_bank_account_holder,'bank_name',o.security_bank_name,
      'bank_iban',o.security_bank_iban,'bank_bic',o.security_bank_bic)
  into v_tax_bps,v_terms,v_issuer from public.organizations o
  where o.id=p_organization_id and o.business_type='securite';
  if coalesce(v_issuer->>'address','')='' or coalesce(v_issuer->>'siret','')='' then raise exception 'Complétez l’adresse et le SIRET dans Personnalisation avant d’émettre une facture.'; end if;

  select jsonb_build_object('company_name',c.company_name,'contact_name',c.contact_name,'email',c.email,'phone',c.phone,
    'billing_address',c.billing_address,'postal_code',c.postal_code,'city',c.city,'siret',c.siret,'vat_number',c.vat_number,
    'payment_terms_days',c.payment_terms_days)
  into v_client from public.security_clients c
  where c.organization_id=p_organization_id and c.id=p_client_id and c.status<>'archived';
  if v_client is null then raise exception 'Client introuvable.'; end if;
  if coalesce(v_client->>'billing_address','')='' then raise exception 'Complétez l’adresse de facturation du client avant d’émettre la facture.'; end if;

  perform 1 from public.security_shifts shift
  join public.security_sites site on site.organization_id=shift.organization_id and site.id=shift.site_id
  where shift.organization_id=p_organization_id and site.client_id=p_client_id and shift.status='completed'
    and shift.ends_at<=now() and shift.final_invoice_id is null
    and shift.starts_at >= (p_period_start::timestamp at time zone coalesce(nullif(site.timezone,''),'Europe/Paris'))
    and shift.starts_at < ((p_period_end+1)::timestamp at time zone coalesce(nullif(site.timezone,''),'Europe/Paris'))
  for update of shift;

  insert into public.security_invoice_counters(organization_id,invoice_year,next_value)
  values(p_organization_id,v_year,2)
  on conflict(organization_id,invoice_year) do update
    set next_value=public.security_invoice_counters.next_value+1,updated_at=now()
  returning next_value-1 into v_sequence;
  v_invoice_number := 'FAC-'||v_year::text||'-'||lpad(v_sequence::text,6,'0');

  insert into public.security_invoices(organization_id,client_id,invoice_number,period_start,period_end,status,
    subtotal_cents,tax_rate_basis_points,tax_cents,total_cents,notes,issued_at,due_date,issuer_snapshot,client_snapshot,
    document_kind,source_mode,created_by)
  values(p_organization_id,p_client_id,v_invoice_number,p_period_start,p_period_end,'issued',0,v_tax_bps,0,0,
    nullif(trim(coalesce(p_notes,'')),''),now(),current_date+v_terms,v_issuer,v_client,'invoice','completed',auth.uid())
  returning id into v_invoice_id;

  for r in select * from public.preview_security_final_invoice(p_organization_id,p_client_id,p_period_start,p_period_end)
  loop
    insert into public.security_invoice_lines(organization_id,invoice_id,site_id,description,scheduled_minutes,billed_minutes,
      shift_count,hourly_rate_cents,line_total_cents)
    values(p_organization_id,v_invoice_id,r.site_id,'Vacations réalisées — '||r.site_name,r.actual_minutes,r.actual_minutes,
      r.completed_shift_count,r.hourly_rate_cents,r.line_total_cents);
    v_subtotal:=v_subtotal+r.line_total_cents; v_line_count:=v_line_count+1;
  end loop;
  if v_line_count=0 then delete from public.security_invoices where id=v_invoice_id; raise exception 'Aucune vacation réalisée et non facturée sur cette période.'; end if;

  insert into public.security_invoice_shift_items(organization_id,invoice_id,shift_id,site_id,agent_id,service_date,
    starts_at,ends_at,actual_minutes,hourly_rate_cents,line_total_cents,description)
  select p_organization_id,v_invoice_id,shift.id,shift.site_id,shift.agent_id,
    (shift.starts_at at time zone coalesce(nullif(site.timezone,''),'Europe/Paris'))::date,
    shift.starts_at,shift.ends_at,
    coalesce(shift.billing_minutes_override,greatest(0,floor(extract(epoch from (shift.ends_at-shift.starts_at))/60)::integer-shift.break_minutes)),
    site.hourly_rate_cents,
    round((coalesce(shift.billing_minutes_override,greatest(0,floor(extract(epoch from (shift.ends_at-shift.starts_at))/60)::integer-shift.break_minutes))::numeric/60)*site.hourly_rate_cents)::integer,
    coalesce(nullif(trim(shift.title),''),'Mission de sécurité')
  from public.security_shifts shift join public.security_sites site on site.organization_id=shift.organization_id and site.id=shift.site_id
  where shift.organization_id=p_organization_id and site.client_id=p_client_id and shift.status='completed'
    and shift.ends_at<=now() and shift.final_invoice_id is null
    and shift.starts_at >= (p_period_start::timestamp at time zone coalesce(nullif(site.timezone,''),'Europe/Paris'))
    and shift.starts_at < ((p_period_end+1)::timestamp at time zone coalesce(nullif(site.timezone,''),'Europe/Paris'));

  update public.security_shifts shift set final_invoice_id=v_invoice_id,updated_at=now()
  where shift.organization_id=p_organization_id and exists(select 1 from public.security_invoice_shift_items item
    where item.organization_id=p_organization_id and item.invoice_id=v_invoice_id and item.shift_id=shift.id);
  v_tax:=round(v_subtotal::numeric*v_tax_bps/10000)::integer; v_total:=v_subtotal+v_tax;
  update public.security_invoices set subtotal_cents=v_subtotal,tax_cents=v_tax,total_cents=v_total,updated_at=now()
  where organization_id=p_organization_id and id=v_invoice_id;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'security.final_invoice_issued','security_invoice',v_invoice_id::text,
    jsonb_build_object('invoice_number',v_invoice_number,'subtotal_cents',v_subtotal,'tax_cents',v_tax,'total_cents',v_total,'billing_rule','scheduled_unless_override'));
  return v_invoice_id;
end;
$$;

revoke all on function public.generate_security_final_invoice(uuid,uuid,date,date,text) from public;
grant execute on function public.generate_security_final_invoice(uuid,uuid,date,date,text) to authenticated;

-- Réouverture d’un dossier = réouverture explicite de la main courante.
create or replace function public.reopen_security_shift_dossier(
  p_organization_id uuid,
  p_shift_id uuid,
  p_note text default null
)
returns public.security_shifts
language plpgsql security definer set search_path = public as $$
declare v_row public.security_shifts%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentification requise.'; end if;
  if not public.is_security_office_admin(p_organization_id) then raise exception 'Seuls le propriétaire et les administrateurs peuvent rouvrir un dossier.'; end if;
  update public.security_shifts
  set dossier_status='open',dossier_reopened_at=now(),dossier_reopened_by=auth.uid(),dossier_archived_at=null,dossier_archived_by=null,
      dossier_note=nullif(trim(coalesce(p_note,'')),''),logbook_status='open',logbook_closed_at=null,logbook_closed_by=null,
      logbook_closed_source=null,updated_at=now()
  where organization_id=p_organization_id and id=p_shift_id and dossier_status in ('closed','archived')
  returning * into v_row;
  if v_row.id is null then raise exception 'Dossier introuvable ou déjà ouvert.'; end if;
  return v_row;
end;
$$;

revoke all on function public.reopen_security_shift_dossier(uuid,uuid,text) from public;
grant execute on function public.reopen_security_shift_dossier(uuid,uuid,text) to authenticated;

select pg_notify('pgrst','reload schema');
commit;
