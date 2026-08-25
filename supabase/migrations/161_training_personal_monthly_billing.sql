alter table public.training_invoices
  alter column commercial_document_id drop not null;

alter table public.training_invoices
  add column if not exists personal_activity_user_id uuid references auth.users(id) on delete set null,
  add column if not exists personal_activity_period_start date,
  add column if not exists personal_activity_period_end date,
  add column if not exists personal_activity_center_name text;

alter table public.training_invoices
  drop constraint if exists training_invoices_personal_activity_period_check;
alter table public.training_invoices
  add constraint training_invoices_personal_activity_period_check
  check (
    (personal_activity_period_start is null and personal_activity_period_end is null)
    or (
      personal_activity_period_start is not null
      and personal_activity_period_end is not null
      and personal_activity_period_end >= personal_activity_period_start
    )
  );

alter table public.training_personal_interventions
  add column if not exists billing_invoice_id uuid references public.training_invoices(id) on delete set null,
  add column if not exists billing_customer_id uuid references public.training_customers(id) on delete set null;

create index if not exists training_personal_interventions_monthly_billing_idx
  on public.training_personal_interventions(reporting_organization_id,user_id,center_name,starts_at)
  where employment_mode='subcontractor' and status='completed';

create index if not exists training_personal_interventions_billing_invoice_idx
  on public.training_personal_interventions(billing_invoice_id)
  where billing_invoice_id is not null;

create index if not exists training_invoices_personal_activity_period_idx
  on public.training_invoices(organization_id,personal_activity_user_id,personal_activity_period_start,personal_activity_center_name)
  where personal_activity_user_id is not null;

create or replace function public.create_training_personal_monthly_invoice(
  p_organization_id uuid,
  p_center_name text,
  p_customer_id uuid,
  p_month date,
  p_vat_rate_basis_points integer default 0,
  p_due_date date default null,
  p_purchase_order_number text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public,pg_catalog
as $function$
declare
  v_user_id uuid := auth.uid();
  v_center text := trim(coalesce(p_center_name,''));
  v_period_start date := date_trunc('month',p_month)::date;
  v_period_end date := (date_trunc('month',p_month) + interval '1 month - 1 day')::date;
  v_issue_date date := current_date;
  v_due_date date;
  v_customer public.training_customers%rowtype;
  v_invoice_id uuid;
  v_row_count integer := 0;
  v_total_cents bigint := 0;
  v_service_date date;
  v_terms_days integer := 30;
begin
  if v_user_id is null
     or not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id,'training_billing') then
    raise exception 'Acces refuse.';
  end if;

  if p_month is null then raise exception 'Mois de facturation obligatoire.'; end if;
  if char_length(v_center) < 2 then raise exception 'Centre de formation invalide.'; end if;
  if coalesce(p_vat_rate_basis_points,-1) not between 0 and 10000 then
    raise exception 'Taux de TVA invalide.';
  end if;

  select * into v_customer
  from public.training_customers
  where organization_id=p_organization_id
    and id=p_customer_id
    and status<>'archived';
  if not found then raise exception 'Client facturable introuvable.'; end if;

  perform 1
  from public.training_personal_interventions i
  where i.reporting_organization_id=p_organization_id
    and i.user_id=v_user_id
    and lower(trim(i.center_name))=lower(v_center)
    and i.employment_mode='subcontractor'
    and i.status='completed'
    and i.billing_invoice_id is null
    and i.starts_at::date between v_period_start and v_period_end
  for update;

  select count(*)::integer,
         coalesce(sum(i.amount_excl_tax_cents),0)::bigint,
         max(i.ends_at::date)
  into v_row_count,v_total_cents,v_service_date
  from public.training_personal_interventions i
  where i.reporting_organization_id=p_organization_id
    and i.user_id=v_user_id
    and lower(trim(i.center_name))=lower(v_center)
    and i.employment_mode='subcontractor'
    and i.status='completed'
    and i.billing_invoice_id is null
    and i.starts_at::date between v_period_start and v_period_end;

  if v_row_count=0 then
    raise exception 'Aucune intervention terminee et non facturee pour ce centre sur ce mois.';
  end if;

  if exists(
    select 1
    from public.training_personal_interventions i
    where i.reporting_organization_id=p_organization_id
      and i.user_id=v_user_id
      and lower(trim(i.center_name))=lower(v_center)
      and i.employment_mode='subcontractor'
      and i.status='completed'
      and i.billing_invoice_id is null
      and i.starts_at::date between v_period_start and v_period_end
      and coalesce(i.amount_excl_tax_cents,0)<=0
  ) then
    raise exception 'Une ou plusieurs interventions n ont pas de montant facturable. Verifiez le tarif horaire ou le forfait.';
  end if;

  select coalesce(training_payment_terms_days,30)
  into v_terms_days
  from public.organizations
  where id=p_organization_id;
  v_due_date := coalesce(p_due_date,v_issue_date+v_terms_days);
  if v_due_date<v_issue_date then raise exception 'La date d echeance doit suivre la date d emission.'; end if;

  insert into public.training_invoices(
    organization_id,commercial_document_id,customer_id,funder_id,session_id,program_id,
    document_kind,payer_kind,title,issue_date,service_date,due_date,status,
    bpf_revenue_category,bpf_included,purchase_order_number,notes,created_by,
    personal_activity_user_id,personal_activity_period_start,personal_activity_period_end,personal_activity_center_name
  ) values (
    p_organization_id,null,v_customer.id,null,null,null,
    'invoice','customer',
    'Prestations de formation · '||v_center||' · '||to_char(v_period_start,'MM/YYYY'),
    v_issue_date,coalesce(v_service_date,v_period_end),v_due_date,'draft',
    'training_organizations',false,
    nullif(trim(coalesce(p_purchase_order_number,'')),''),
    nullif(trim(coalesce(p_notes,'')),''),v_user_id,
    v_user_id,v_period_start,v_period_end,v_center
  ) returning id into v_invoice_id;

  insert into public.training_invoice_lines(
    organization_id,invoice_id,position,description,quantity,unit_label,
    unit_price_excl_tax_cents,vat_rate_basis_points
  )
  select
    p_organization_id,
    v_invoice_id,
    row_number() over(order by i.starts_at,i.id)::integer,
    to_char(i.starts_at at time zone 'Europe/Paris','DD/MM/YYYY')||' · '||i.activity_title,
    case
      when i.hourly_rate_cents is not null and i.hourly_rate_cents>0
        then round((extract(epoch from (i.ends_at-i.starts_at))/3600.0)::numeric,4)
      else 1::numeric
    end,
    case when i.hourly_rate_cents is not null and i.hourly_rate_cents>0 then 'heure' else 'forfait' end,
    case when i.hourly_rate_cents is not null and i.hourly_rate_cents>0 then i.hourly_rate_cents else i.amount_excl_tax_cents end,
    p_vat_rate_basis_points
  from public.training_personal_interventions i
  where i.reporting_organization_id=p_organization_id
    and i.user_id=v_user_id
    and lower(trim(i.center_name))=lower(v_center)
    and i.employment_mode='subcontractor'
    and i.status='completed'
    and i.billing_invoice_id is null
    and i.starts_at::date between v_period_start and v_period_end
  order by i.starts_at,i.id;

  update public.training_personal_interventions i
  set billing_invoice_id=v_invoice_id,
      billing_customer_id=v_customer.id
  where i.reporting_organization_id=p_organization_id
    and i.user_id=v_user_id
    and lower(trim(i.center_name))=lower(v_center)
    and i.employment_mode='subcontractor'
    and i.status='completed'
    and i.billing_invoice_id is null
    and i.starts_at::date between v_period_start and v_period_end;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(
    p_organization_id,v_user_id,'training.personal_monthly_invoice_created','training_invoice',v_invoice_id::text,
    jsonb_build_object(
      'center_name',v_center,
      'period_start',v_period_start,
      'period_end',v_period_end,
      'intervention_count',v_row_count,
      'estimated_subtotal_cents',v_total_cents,
      'customer_id',v_customer.id
    )
  );

  return v_invoice_id;
end;
$function$;

revoke all on function public.create_training_personal_monthly_invoice(uuid,text,uuid,date,integer,date,text,text) from public,anon;
grant execute on function public.create_training_personal_monthly_invoice(uuid,text,uuid,date,integer,date,text,text) to authenticated,service_role;

create or replace function public.sync_training_personal_monthly_invoice_links()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $function$
begin
  if new.personal_activity_user_id is null then return new; end if;

  if new.status='canceled' and old.status is distinct from 'canceled' then
    update public.training_personal_interventions
    set billing_invoice_id=null,
        billing_customer_id=null,
        invoice_reference=case when invoice_reference=old.invoice_number then null else invoice_reference end,
        invoice_date=case when invoice_reference=old.invoice_number then null else invoice_date end
    where reporting_organization_id=new.organization_id
      and billing_invoice_id=new.id;
    return new;
  end if;

  if new.invoice_number is not null
     and (old.invoice_number is distinct from new.invoice_number or old.status is distinct from new.status) then
    update public.training_personal_interventions
    set invoice_reference=new.invoice_number,
        invoice_date=new.issue_date,
        billing_customer_id=new.customer_id
    where reporting_organization_id=new.organization_id
      and billing_invoice_id=new.id;
  end if;

  return new;
end;
$function$;

revoke all on function public.sync_training_personal_monthly_invoice_links() from public,anon,authenticated;
grant execute on function public.sync_training_personal_monthly_invoice_links() to service_role;

drop trigger if exists sync_training_personal_monthly_invoice_links_after_invoice on public.training_invoices;
create trigger sync_training_personal_monthly_invoice_links_after_invoice
after update of status,invoice_number,issue_date,customer_id on public.training_invoices
for each row execute function public.sync_training_personal_monthly_invoice_links();

comment on function public.create_training_personal_monthly_invoice(uuid,text,uuid,date,integer,date,text,text) is
  'Regroupe les interventions personnelles terminees et facturees via l organisme, centre par centre et mois par mois, dans un brouillon de facture Formation. Les activites salariees sont exclues.';
