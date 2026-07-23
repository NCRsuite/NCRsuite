-- NCR Suite V2.18.0 - Formation : facturation, encaissements et relances
-- A executer apres 077_training_bpf_automation.sql.

begin;

alter table public.organizations
  add column if not exists training_invoice_prefix text not null default 'FAC',
  add column if not exists training_payment_terms_days integer not null default 30,
  add column if not exists training_late_penalty_text text not null default 'Taux de refinancement de la BCE majore de 10 points',
  add column if not exists training_tax_exemption_text text,
  add column if not exists training_bank_account_holder text,
  add column if not exists training_bank_name text,
  add column if not exists training_bank_iban text,
  add column if not exists training_bank_bic text,
  add column if not exists training_invoice_reminder_enabled boolean not null default true,
  add column if not exists training_invoice_reminder_first_delay_days integer not null default 3,
  add column if not exists training_invoice_reminder_interval_days integer not null default 7,
  add column if not exists training_invoice_reminder_max_count integer not null default 3;

alter table public.organizations
  drop constraint if exists organizations_training_invoice_prefix_check,
  add constraint organizations_training_invoice_prefix_check
    check (training_invoice_prefix ~ '^[A-Z0-9-]{1,12}$'),
  drop constraint if exists organizations_training_payment_terms_check,
  add constraint organizations_training_payment_terms_check
    check (training_payment_terms_days between 0 and 365),
  drop constraint if exists organizations_training_invoice_reminder_delay_check,
  add constraint organizations_training_invoice_reminder_delay_check
    check (
      training_invoice_reminder_first_delay_days between 0 and 365
      and training_invoice_reminder_interval_days between 1 and 365
      and training_invoice_reminder_max_count between 0 and 12
    );

alter table public.training_funders
  add column if not exists siret text,
  add column if not exists vat_number text;

create table if not exists public.training_invoice_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  counter_year integer not null check (counter_year between 2000 and 2100),
  document_kind text not null check (document_kind in ('invoice','credit_note')),
  current_value integer not null default 0 check (current_value >= 0),
  primary key (organization_id, counter_year, document_kind)
);

create table if not exists public.training_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  commercial_document_id uuid not null,
  credited_invoice_id uuid,
  customer_id uuid,
  funder_id uuid,
  session_id uuid,
  program_id uuid,
  document_kind text not null default 'invoice' check (document_kind in ('invoice','credit_note')),
  invoice_number text,
  payer_kind text not null check (payer_kind in ('customer','funder')),
  title text not null check (char_length(trim(title)) between 2 and 240),
  issue_date date not null default current_date,
  service_date date not null default current_date,
  due_date date not null default current_date,
  status text not null default 'draft'
    check (status in ('draft','issued','sent','partial','paid','overdue','canceled')),
  bpf_revenue_category text,
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  paid_amount_cents bigint not null default 0 check (paid_amount_cents >= 0),
  balance_due_cents bigint generated always as (greatest(total_cents - paid_amount_cents, 0)) stored,
  seller_snapshot jsonb not null default '{}'::jsonb,
  buyer_snapshot jsonb not null default '{}'::jsonb,
  payment_terms_text text,
  late_penalty_text text,
  tax_exemption_text text,
  purchase_order_number text,
  notes text,
  issued_at timestamptz,
  sent_at timestamptz,
  paid_at timestamptz,
  generated_document_path text,
  generated_document_name text,
  generated_at timestamptz,
  email_queued_at timestamptz,
  emailed_at timestamptz,
  last_email_recipient text,
  last_email_outbox_id uuid references public.email_outbox(id) on delete set null,
  reminder_count integer not null default 0 check (reminder_count between 0 and 100),
  last_reminded_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, invoice_number),
  constraint training_invoices_commercial_fk foreign key (organization_id, commercial_document_id)
    references public.training_commercial_documents(organization_id, id) on delete restrict,
  constraint training_invoices_credit_fk foreign key (organization_id, credited_invoice_id)
    references public.training_invoices(organization_id, id) on delete restrict,
  constraint training_invoices_customer_fk foreign key (organization_id, customer_id)
    references public.training_customers(organization_id, id) on delete restrict,
  constraint training_invoices_funder_fk foreign key (organization_id, funder_id)
    references public.training_funders(organization_id, id) on delete restrict,
  constraint training_invoices_session_fk foreign key (organization_id, session_id)
    references public.training_sessions(organization_id, id) on delete restrict,
  constraint training_invoices_program_fk foreign key (organization_id, program_id)
    references public.training_programs(organization_id, id) on delete restrict,
  constraint training_invoices_payer_check check (
    (payer_kind = 'customer' and customer_id is not null and funder_id is null)
    or (payer_kind = 'funder' and funder_id is not null and customer_id is null)
  ),
  constraint training_invoices_credit_source_check check (
    (document_kind = 'invoice' and credited_invoice_id is null)
    or (document_kind = 'credit_note' and credited_invoice_id is not null)
  ),
  constraint training_invoices_dates_check check (due_date >= issue_date),
  constraint training_invoices_amounts_check check (
    tax_cents <= total_cents
    and subtotal_cents + tax_cents = total_cents
    and paid_amount_cents <= total_cents
  ),
  constraint training_invoices_bpf_category_check check (
    bpf_revenue_category is null
    or bpf_revenue_category in (
      'companies','apprenticeship','professionalization','pro_a','transition','cpf',
      'jobseekers_funds','self_employed_funds','skills_plan','public_agents','eu',
      'state','regions','france_travail','other_public','individuals',
      'training_organizations','other_training'
    )
  )
);

create table if not exists public.training_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null,
  position integer not null default 1 check (position between 1 and 1000),
  description text not null check (char_length(trim(description)) between 2 and 500),
  quantity numeric(12,3) not null default 1 check (quantity > 0 and quantity <= 1000000),
  unit_label text not null default 'forfait' check (char_length(trim(unit_label)) between 1 and 40),
  unit_price_excl_tax_cents bigint not null default 0 check (unit_price_excl_tax_cents >= 0),
  vat_rate_basis_points integer not null default 2000 check (vat_rate_basis_points between 0 and 10000),
  subtotal_cents bigint generated always as (round(quantity * unit_price_excl_tax_cents)) stored,
  tax_cents bigint generated always as (
    round((quantity * unit_price_excl_tax_cents * vat_rate_basis_points) / 10000.0)
  ) stored,
  total_cents bigint generated always as (
    round(quantity * unit_price_excl_tax_cents)
    + round((quantity * unit_price_excl_tax_cents * vat_rate_basis_points) / 10000.0)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, invoice_id, position),
  constraint training_invoice_lines_invoice_fk foreign key (organization_id, invoice_id)
    references public.training_invoices(organization_id, id) on delete cascade
);

create table if not exists public.training_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null,
  payment_date date not null default current_date,
  amount_cents bigint not null check (amount_cents > 0),
  payment_method text not null default 'bank_transfer'
    check (payment_method in ('bank_transfer','card','cash','check','direct_debit','other')),
  reference text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint training_invoice_payments_invoice_fk foreign key (organization_id, invoice_id)
    references public.training_invoices(organization_id, id) on delete restrict
);

create index if not exists idx_training_invoices_org_issue
  on public.training_invoices(organization_id, issue_date desc, created_at desc);
create index if not exists idx_training_invoices_org_status_due
  on public.training_invoices(organization_id, status, due_date);
create index if not exists idx_training_invoices_commercial
  on public.training_invoices(organization_id, commercial_document_id);
create index if not exists idx_training_invoice_lines_invoice
  on public.training_invoice_lines(organization_id, invoice_id, position);
create index if not exists idx_training_invoice_payments_invoice
  on public.training_invoice_payments(organization_id, invoice_id, payment_date desc);

drop trigger if exists set_training_invoices_updated_at on public.training_invoices;
create trigger set_training_invoices_updated_at
before update on public.training_invoices
for each row execute procedure public.set_updated_at();

drop trigger if exists set_training_invoice_lines_updated_at on public.training_invoice_lines;
create trigger set_training_invoice_lines_updated_at
before update on public.training_invoice_lines
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

create or replace function public.update_training_billing_settings(
  p_organization_id uuid,
  p_invoice_prefix text,
  p_payment_terms_days integer,
  p_late_penalty_text text,
  p_tax_exemption_text text,
  p_bank_account_holder text,
  p_bank_name text,
  p_bank_iban text,
  p_bank_bic text,
  p_reminder_enabled boolean,
  p_reminder_first_delay_days integer,
  p_reminder_interval_days integer,
  p_reminder_max_count integer
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.organizations;
  v_prefix text := upper(regexp_replace(trim(coalesce(p_invoice_prefix, 'FAC')), '[^A-Z0-9-]', '', 'g'));
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_billing') then
    raise exception 'Acces refuse.';
  end if;
  if v_prefix = '' or char_length(v_prefix) > 12 then raise exception 'Prefixe de facture invalide.'; end if;
  if coalesce(p_payment_terms_days, -1) not between 0 and 365 then raise exception 'Delai de paiement invalide.'; end if;
  if coalesce(p_reminder_first_delay_days, -1) not between 0 and 365
     or coalesce(p_reminder_interval_days, 0) not between 1 and 365
     or coalesce(p_reminder_max_count, -1) not between 0 and 12 then
    raise exception 'Reglage de relance invalide.';
  end if;

  update public.organizations
  set training_invoice_prefix = v_prefix,
      training_payment_terms_days = p_payment_terms_days,
      training_late_penalty_text = coalesce(nullif(trim(coalesce(p_late_penalty_text, '')), ''), 'Taux de refinancement de la BCE majore de 10 points'),
      training_tax_exemption_text = nullif(trim(coalesce(p_tax_exemption_text, '')), ''),
      training_bank_account_holder = nullif(trim(coalesce(p_bank_account_holder, '')), ''),
      training_bank_name = nullif(trim(coalesce(p_bank_name, '')), ''),
      training_bank_iban = nullif(upper(regexp_replace(coalesce(p_bank_iban, ''), '\s', '', 'g')), ''),
      training_bank_bic = nullif(upper(regexp_replace(coalesce(p_bank_bic, ''), '\s', '', 'g')), ''),
      training_invoice_reminder_enabled = coalesce(p_reminder_enabled, true),
      training_invoice_reminder_first_delay_days = p_reminder_first_delay_days,
      training_invoice_reminder_interval_days = p_reminder_interval_days,
      training_invoice_reminder_max_count = p_reminder_max_count
  where id = p_organization_id and business_type = 'formation'
  returning * into v_result;
  if v_result.id is null then raise exception 'Espace Formation introuvable.'; end if;
  return v_result;
end;
$$;

create or replace function public.training_refresh_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_organization_id uuid;
  v_status text;
begin
  v_invoice_id := case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end;
  v_organization_id := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  select status into v_status
  from public.training_invoices
  where organization_id = v_organization_id and id = v_invoice_id
  for update;
  if v_status is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if v_status <> 'draft' then
    raise exception 'Les lignes d''un document emis sont immuables.';
  end if;
  update public.training_invoices i
  set subtotal_cents = totals.subtotal_cents,
      tax_cents = totals.tax_cents,
      total_cents = totals.total_cents
  from (
    select
      coalesce(sum(subtotal_cents), 0)::bigint as subtotal_cents,
      coalesce(sum(tax_cents), 0)::bigint as tax_cents,
      coalesce(sum(total_cents), 0)::bigint as total_cents
    from public.training_invoice_lines
    where organization_id = v_organization_id and invoice_id = v_invoice_id
  ) totals
  where i.organization_id = v_organization_id and i.id = v_invoice_id;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists training_refresh_invoice_totals_after_line on public.training_invoice_lines;
create trigger training_refresh_invoice_totals_after_line
after insert or update or delete on public.training_invoice_lines
for each row execute procedure public.training_refresh_invoice_totals();

create or replace function public.create_training_invoice(
  p_organization_id uuid,
  p_commercial_document_id uuid,
  p_payer_kind text,
  p_amount_excl_tax_cents bigint,
  p_vat_rate_basis_points integer,
  p_issue_date date,
  p_service_date date,
  p_due_date date,
  p_bpf_revenue_category text,
  p_purchase_order_number text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document public.training_commercial_documents%rowtype;
  v_invoice_id uuid;
  v_remaining bigint;
  v_default_due date;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_billing') then
    raise exception 'Acces refuse.';
  end if;
  if p_payer_kind not in ('customer','funder') then raise exception 'Payeur invalide.'; end if;
  if coalesce(p_amount_excl_tax_cents, 0) <= 0 then raise exception 'Le montant doit etre positif.'; end if;
  if coalesce(p_vat_rate_basis_points, -1) not between 0 and 10000 then raise exception 'Taux de TVA invalide.'; end if;
  if p_bpf_revenue_category is null then raise exception 'La categorie BPF est obligatoire.'; end if;

  select * into v_document
  from public.training_commercial_documents
  where organization_id = p_organization_id and id = p_commercial_document_id
  for update;
  if not found then raise exception 'Dossier commercial introuvable.'; end if;
  if v_document.status not in ('accepted','signed','completed') then
    raise exception 'Le dossier doit etre accepte ou signe avant facturation.';
  end if;
  if p_payer_kind = 'customer' and v_document.customer_id is null then
    raise exception 'Aucun client facturable n''est rattache au dossier.';
  end if;
  if p_payer_kind = 'funder' and v_document.funder_id is null then
    raise exception 'Aucun financeur n''est rattache au dossier.';
  end if;

  select v_document.amount_excl_tax_cents
         - coalesce(sum(case when document_kind = 'invoice' then subtotal_cents else -subtotal_cents end)
             filter (where status <> 'canceled'), 0)
  into v_remaining
  from public.training_invoices
  where organization_id = p_organization_id
    and commercial_document_id = p_commercial_document_id;
  if p_amount_excl_tax_cents > v_remaining then
    raise exception 'Le montant depasse le solde facturable de % centimes.', greatest(v_remaining, 0);
  end if;

  v_default_due := coalesce(
    p_due_date,
    coalesce(p_issue_date, current_date) + (
      select training_payment_terms_days from public.organizations where id = p_organization_id
    )
  );
  if v_default_due < coalesce(p_issue_date, current_date) then
    raise exception 'La date d''echeance doit suivre la date d''emission.';
  end if;

  insert into public.training_invoices (
    organization_id, commercial_document_id, customer_id, funder_id, session_id, program_id,
    document_kind, payer_kind, title, issue_date, service_date, due_date, status,
    bpf_revenue_category, purchase_order_number, notes, created_by
  ) values (
    p_organization_id, v_document.id,
    case when p_payer_kind = 'customer' then v_document.customer_id else null end,
    case when p_payer_kind = 'funder' then v_document.funder_id else null end,
    v_document.session_id, v_document.program_id,
    'invoice', p_payer_kind, v_document.title,
    coalesce(p_issue_date, current_date), coalesce(p_service_date, p_issue_date, current_date),
    v_default_due, 'draft', p_bpf_revenue_category,
    nullif(trim(coalesce(p_purchase_order_number, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''), auth.uid()
  ) returning id into v_invoice_id;

  insert into public.training_invoice_lines (
    organization_id, invoice_id, position, description, quantity, unit_label,
    unit_price_excl_tax_cents, vat_rate_basis_points
  ) values (
    p_organization_id, v_invoice_id, 1,
    coalesce(nullif(trim(coalesce(v_document.training_summary, '')), ''), v_document.title),
    1, 'forfait', p_amount_excl_tax_cents, p_vat_rate_basis_points
  );

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.invoice_created', 'training_invoice', v_invoice_id::text,
    jsonb_build_object('commercial_document_id', v_document.id, 'amount_excl_tax_cents', p_amount_excl_tax_cents)
  );
  return v_invoice_id;
end;
$$;

create or replace function public.issue_training_invoice(
  p_organization_id uuid,
  p_invoice_id uuid
)
returns public.training_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.training_invoices%rowtype;
  v_org public.organizations%rowtype;
  v_customer public.training_customers%rowtype;
  v_funder public.training_funders%rowtype;
  v_counter integer;
  v_number text;
  v_seller jsonb;
  v_buyer jsonb;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_billing') then
    raise exception 'Acces refuse.';
  end if;
  select * into v_invoice from public.training_invoices
  where organization_id = p_organization_id and id = p_invoice_id for update;
  if not found then raise exception 'Facture introuvable.'; end if;
  if v_invoice.document_kind <> 'invoice' or v_invoice.status <> 'draft' then
    raise exception 'Seule une facture brouillon peut etre emise.';
  end if;
  if v_invoice.subtotal_cents <= 0 or v_invoice.total_cents <= 0 then
    raise exception 'La facture ne contient aucun montant.';
  end if;
  if v_invoice.bpf_revenue_category is null then raise exception 'La categorie BPF est obligatoire.'; end if;

  select * into v_org from public.organizations
  where id = p_organization_id and business_type = 'formation';
  if v_org.id is null
     or nullif(trim(coalesce(v_org.company_address, '')), '') is null
     or nullif(trim(coalesce(v_org.company_postal_code, '')), '') is null
     or nullif(trim(coalesce(v_org.company_city, '')), '') is null
     or nullif(regexp_replace(coalesce(v_org.company_siret, ''), '\D', '', 'g'), '') is null then
    raise exception 'Completez l''adresse et le SIRET du profil organisme avant emission.';
  end if;

  if v_invoice.payer_kind = 'customer' then
    select * into v_customer from public.training_customers
    where organization_id = p_organization_id and id = v_invoice.customer_id and status <> 'archived';
    if v_customer.id is null then raise exception 'Client facturable introuvable.'; end if;
    if nullif(trim(coalesce(v_customer.billing_address, '')), '') is null
       or nullif(trim(coalesce(v_customer.postal_code, '')), '') is null
       or nullif(trim(coalesce(v_customer.city, '')), '') is null then
      raise exception 'Completez l''adresse de facturation du client.';
    end if;
    v_buyer := jsonb_build_object(
      'kind','customer','name',v_customer.legal_name,'contact_name',v_customer.contact_name,
      'email',v_customer.email,'phone',v_customer.phone,'address',v_customer.billing_address,
      'postal_code',v_customer.postal_code,'city',v_customer.city,
      'siret',v_customer.siret,'vat_number',v_customer.vat_number
    );
  else
    select * into v_funder from public.training_funders
    where organization_id = p_organization_id and id = v_invoice.funder_id and status <> 'archived';
    if v_funder.id is null then raise exception 'Financeur facturable introuvable.'; end if;
    if nullif(trim(coalesce(v_funder.billing_address, '')), '') is null
       or nullif(trim(coalesce(v_funder.postal_code, '')), '') is null
       or nullif(trim(coalesce(v_funder.city, '')), '') is null then
      raise exception 'Completez l''adresse de facturation du financeur.';
    end if;
    v_buyer := jsonb_build_object(
      'kind','funder','name',v_funder.name,'contact_name',v_funder.contact_name,
      'email',v_funder.email,'phone',v_funder.phone,'address',v_funder.billing_address,
      'postal_code',v_funder.postal_code,'city',v_funder.city,
      'siret',v_funder.siret,'vat_number',v_funder.vat_number,'reference_code',v_funder.reference_code
    );
  end if;

  if v_invoice.tax_cents = 0
     and nullif(trim(coalesce(v_org.training_tax_exemption_text, '')), '') is null then
    raise exception 'Renseignez la mention d''exoneration de TVA avant emission a 0 %% de TVA.';
  end if;

  insert into public.training_invoice_counters(organization_id, counter_year, document_kind, current_value)
  values (p_organization_id, extract(year from v_invoice.issue_date)::integer, 'invoice', 1)
  on conflict (organization_id, counter_year, document_kind) do update
  set current_value = public.training_invoice_counters.current_value + 1
  returning current_value into v_counter;
  v_number := v_org.training_invoice_prefix || '-' || to_char(v_invoice.issue_date, 'YYYY')
              || '-' || lpad(v_counter::text, 6, '0');
  v_seller := jsonb_build_object(
    'name',coalesce(v_org.public_name,v_org.name),'legal_representative',v_org.training_legal_representative,
    'address',v_org.company_address,'postal_code',v_org.company_postal_code,'city',v_org.company_city,
    'siret',v_org.company_siret,'vat_number',v_org.training_vat_number,'nda_number',v_org.training_nda_number,
    'email',coalesce(v_org.training_reply_to_email,v_org.company_email),'phone',v_org.company_phone,
    'bank_account_holder',v_org.training_bank_account_holder,'bank_name',v_org.training_bank_name,
    'iban',v_org.training_bank_iban,'bic',v_org.training_bank_bic
  );

  update public.training_invoices
  set invoice_number = v_number, status = 'issued', issued_at = now(),
      seller_snapshot = v_seller, buyer_snapshot = v_buyer,
      payment_terms_text = coalesce(v_org.training_default_terms, 'Paiement a ' || v_org.training_payment_terms_days || ' jours'),
      late_penalty_text = v_org.training_late_penalty_text,
      tax_exemption_text = case when v_invoice.tax_cents = 0 then v_org.training_tax_exemption_text else null end
  where organization_id = p_organization_id and id = p_invoice_id
  returning * into v_invoice;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.invoice_issued', 'training_invoice', p_invoice_id::text,
    jsonb_build_object('invoice_number', v_number, 'total_cents', v_invoice.total_cents)
  );
  return v_invoice;
end;
$$;

create or replace function public.record_training_invoice_payment(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_amount_cents bigint,
  p_payment_date date,
  p_payment_method text,
  p_reference text default null,
  p_notes text default null
)
returns public.training_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.training_invoices%rowtype;
  v_paid bigint;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_billing') then
    raise exception 'Acces refuse.';
  end if;
  select * into v_invoice from public.training_invoices
  where organization_id = p_organization_id and id = p_invoice_id for update;
  if not found or v_invoice.document_kind <> 'invoice' then raise exception 'Facture introuvable.'; end if;
  if v_invoice.status in ('draft','canceled') then raise exception 'Cette facture ne peut pas etre encaissee.'; end if;
  if coalesce(p_amount_cents, 0) <= 0 or p_amount_cents > v_invoice.balance_due_cents then
    raise exception 'Montant d''encaissement invalide.';
  end if;
  if p_payment_method not in ('bank_transfer','card','cash','check','direct_debit','other') then
    raise exception 'Mode de paiement invalide.';
  end if;

  insert into public.training_invoice_payments (
    organization_id, invoice_id, payment_date, amount_cents, payment_method, reference, notes, created_by
  ) values (
    p_organization_id, p_invoice_id, coalesce(p_payment_date,current_date), p_amount_cents,
    p_payment_method, nullif(trim(coalesce(p_reference,'')), ''),
    nullif(trim(coalesce(p_notes,'')), ''), auth.uid()
  );
  select coalesce(sum(amount_cents),0)::bigint into v_paid
  from public.training_invoice_payments
  where organization_id = p_organization_id and invoice_id = p_invoice_id;

  update public.training_invoices
  set paid_amount_cents = v_paid,
      status = case
        when v_paid >= total_cents then 'paid'
        when due_date < current_date then 'overdue'
        else 'partial'
      end,
      paid_at = case when v_paid >= total_cents then now() else null end
  where organization_id = p_organization_id and id = p_invoice_id
  returning * into v_invoice;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.invoice_payment_recorded', 'training_invoice', p_invoice_id::text,
    jsonb_build_object('amount_cents', p_amount_cents, 'payment_method', p_payment_method, 'balance_due_cents', v_invoice.balance_due_cents)
  );
  return v_invoice;
end;
$$;

create or replace function public.cancel_training_invoice_draft(
  p_organization_id uuid,
  p_invoice_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_billing') then
    raise exception 'Acces refuse.';
  end if;
  update public.training_invoices
  set status = 'canceled'
  where organization_id = p_organization_id and id = p_invoice_id
    and document_kind = 'invoice' and status = 'draft';
  if not found then raise exception 'Seule une facture brouillon peut etre annulee.'; end if;
end;
$$;

create or replace function public.create_training_credit_note(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_reason text default null
)
returns public.training_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.training_invoices%rowtype;
  v_credit_id uuid;
  v_already_credited bigint;
  v_remaining bigint;
  v_vat integer;
  v_counter integer;
  v_number text;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_billing') then
    raise exception 'Acces refuse.';
  end if;
  select * into v_source from public.training_invoices
  where organization_id = p_organization_id and id = p_invoice_id for update;
  if not found or v_source.document_kind <> 'invoice' or v_source.status in ('draft','canceled') then
    raise exception 'Facture emise introuvable.';
  end if;
  select coalesce(sum(subtotal_cents),0)::bigint into v_already_credited
  from public.training_invoices
  where organization_id = p_organization_id and credited_invoice_id = p_invoice_id
    and document_kind = 'credit_note' and status <> 'canceled';
  v_remaining := v_source.subtotal_cents - v_already_credited;
  if v_remaining <= 0 then raise exception 'Cette facture est deja entierement creditee.'; end if;
  select vat_rate_basis_points into v_vat
  from public.training_invoice_lines
  where organization_id = p_organization_id and invoice_id = p_invoice_id
  order by position limit 1;

  insert into public.training_invoices (
    organization_id, commercial_document_id, credited_invoice_id, customer_id, funder_id,
    session_id, program_id, document_kind, payer_kind, title, issue_date, service_date, due_date,
    status, bpf_revenue_category, seller_snapshot, buyer_snapshot, payment_terms_text,
    late_penalty_text, tax_exemption_text, purchase_order_number, notes, created_by
  ) values (
    p_organization_id, v_source.commercial_document_id, v_source.id, v_source.customer_id, v_source.funder_id,
    v_source.session_id, v_source.program_id, 'credit_note', v_source.payer_kind,
    'Avoir sur ' || v_source.invoice_number, current_date, current_date, current_date,
    'draft', v_source.bpf_revenue_category, v_source.seller_snapshot, v_source.buyer_snapshot,
    v_source.payment_terms_text, v_source.late_penalty_text, v_source.tax_exemption_text,
    v_source.purchase_order_number, nullif(trim(coalesce(p_reason,'')), ''), auth.uid()
  ) returning id into v_credit_id;

  insert into public.training_invoice_lines (
    organization_id, invoice_id, position, description, quantity, unit_label,
    unit_price_excl_tax_cents, vat_rate_basis_points
  ) values (
    p_organization_id, v_credit_id, 1, 'Avoir sur facture ' || v_source.invoice_number,
    1, 'forfait', v_remaining, coalesce(v_vat,0)
  );

  insert into public.training_invoice_counters(organization_id, counter_year, document_kind, current_value)
  values (p_organization_id, extract(year from current_date)::integer, 'credit_note', 1)
  on conflict (organization_id, counter_year, document_kind) do update
  set current_value = public.training_invoice_counters.current_value + 1
  returning current_value into v_counter;
  v_number := 'AV-' || to_char(current_date, 'YYYY') || '-' || lpad(v_counter::text, 6, '0');

  update public.training_invoices
  set invoice_number = v_number, status = 'issued', issued_at = now()
  where organization_id = p_organization_id and id = v_credit_id
  returning * into v_source;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.credit_note_issued', 'training_invoice', v_credit_id::text,
    jsonb_build_object('invoice_number', v_number, 'credited_invoice_id', p_invoice_id, 'subtotal_cents', v_remaining)
  );
  return v_source;
end;
$$;

alter table public.email_outbox drop constraint if exists email_outbox_template_key_check;
alter table public.email_outbox add constraint email_outbox_template_key_check check (template_key in (
  'customer_pending','customer_confirmed','customer_rescheduled','customer_cancelled','customer_reminder',
  'business_new_booking','business_rescheduled','business_cancelled','team_invitation',
  'training_convocation','training_attestation','training_satisfaction_request','training_commercial_document',
  'training_invoice',
  'security_client_portal_invitation','cleaning_client_portal_invitation','coiffure_client_portal_invitation',
  'security_quote','security_invoice','security_client_message','security_client_portal_message',
  'cleaning_client_portal_message','coiffure_loyalty_reward','training_team_invitation','support_message'
));

create or replace function public.queue_training_invoice_email(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_attachment_path text,
  p_attachment_name text,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.training_invoices%rowtype;
  v_org public.organizations%rowtype;
  v_email text;
  v_name text;
  v_outbox_id uuid;
  v_status text;
  v_dedupe text;
  v_expected_prefix text;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_billing') then
    raise exception 'Acces refuse.';
  end if;
  select * into v_invoice from public.training_invoices
  where organization_id = p_organization_id and id = p_invoice_id;
  if not found or v_invoice.status in ('draft','canceled') then raise exception 'Le document doit etre emis avant envoi.'; end if;
  select * into v_org from public.organizations where id = p_organization_id;
  v_email := lower(trim(coalesce(v_invoice.buyer_snapshot ->> 'email','')));
  v_name := coalesce(nullif(trim(coalesce(v_invoice.buyer_snapshot ->> 'contact_name','')), ''), v_invoice.buyer_snapshot ->> 'name');
  if v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'Le payeur ne possede pas d''adresse e-mail valide.';
  end if;
  v_expected_prefix := p_organization_id::text || '/billing/generated/' || p_invoice_id::text || '/';
  if nullif(trim(coalesce(p_attachment_path,'')), '') is null
     or position(v_expected_prefix in trim(p_attachment_path)) <> 1 then
    raise exception 'Chemin de piece jointe invalide.';
  end if;
  if lower(trim(coalesce(p_attachment_name,''))) not like '%.pdf'
     or char_length(trim(p_attachment_name)) > 255 then raise exception 'Nom de piece jointe invalide.'; end if;
  v_dedupe := 'training-invoice:' || p_invoice_id::text || ':initial:' || md5(trim(p_attachment_path));

  insert into public.email_outbox (
    organization_id, template_key, recipient_email, recipient_name, payload,
    dedupe_key, status, scheduled_for, attempts, locked_at, sent_at, provider_message_id, last_error
  ) values (
    p_organization_id, 'training_invoice', v_email, v_name,
    jsonb_build_object(
      'training_invoice_id',v_invoice.id,'document_kind',v_invoice.document_kind,
      'invoice_number',v_invoice.invoice_number,'document_title',v_invoice.title,
      'issue_date',v_invoice.issue_date,'due_date',v_invoice.due_date,
      'subtotal_cents',v_invoice.subtotal_cents,'tax_cents',v_invoice.tax_cents,
      'total_cents',v_invoice.total_cents,'balance_due_cents',v_invoice.balance_due_cents,
      'buyer_name',v_invoice.buyer_snapshot ->> 'name',
      'organization_name',coalesce(v_org.public_name,v_org.name),
      'organization_logo_url',v_org.logo_url,'organization_primary_color',v_org.primary_color,
      'contact_email',coalesce(v_org.training_reply_to_email,v_org.company_email),
      'contact_phone',v_org.company_phone,'reply_to_email',coalesce(v_org.training_reply_to_email,v_org.company_email),
      'is_reminder',false,'attachment_bucket','training-documents',
      'attachment_path',trim(p_attachment_path),'attachment_name',trim(p_attachment_name)
    ),
    v_dedupe, 'pending', now(), 0, null, null, null, null
  ) on conflict (dedupe_key) do update set
    recipient_email = excluded.recipient_email, recipient_name = excluded.recipient_name,
    payload = excluded.payload,
    status = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then 'pending' else public.email_outbox.status end,
    scheduled_for = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then now() else public.email_outbox.scheduled_for end,
    attempts = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then 0 else public.email_outbox.attempts end,
    locked_at = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then null else public.email_outbox.locked_at end,
    sent_at = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then null else public.email_outbox.sent_at end,
    provider_message_id = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then null else public.email_outbox.provider_message_id end,
    last_error = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then null else public.email_outbox.last_error end,
    updated_at = now()
  returning id,status into v_outbox_id,v_status;

  update public.training_invoices
  set generated_document_path=trim(p_attachment_path), generated_document_name=trim(p_attachment_name),
      generated_at=now(), email_queued_at=now(), last_email_recipient=v_email,
      last_email_outbox_id=v_outbox_id
  where organization_id=p_organization_id and id=p_invoice_id;
  return jsonb_build_object('outbox_id',v_outbox_id,'status',v_status,'recipient_email',v_email,'recipient_name',v_name);
end;
$$;

create or replace function public.queue_due_training_invoice_reminders(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_next integer;
  v_inserted integer;
  v_total integer := 0;
begin
  if current_user not in ('postgres','service_role','supabase_admin') and auth.role() <> 'service_role' then
    raise exception 'Acces reserve au service d''envoi.';
  end if;

  update public.training_invoices
  set status = 'overdue'
  where document_kind='invoice' and status in ('issued','sent','partial')
    and due_date < current_date and balance_due_cents > 0;

  for v_row in
    select i.*, o.public_name, o.name as organization_name, o.logo_url, o.primary_color,
           o.training_reply_to_email, o.company_email, o.company_phone,
           o.training_invoice_reminder_interval_days, o.training_invoice_reminder_max_count
    from public.training_invoices i
    join public.organizations o on o.id=i.organization_id
    where i.document_kind='invoice' and i.status='overdue' and i.balance_due_cents > 0
      and i.generated_document_path is not null and i.generated_document_name is not null
      and o.training_invoice_reminder_enabled=true
      and i.reminder_count < o.training_invoice_reminder_max_count
      and current_date >= i.due_date + o.training_invoice_reminder_first_delay_days
      and now() >= coalesce(i.last_reminded_at, i.due_date::timestamptz)
          + make_interval(days => case when i.reminder_count=0 then o.training_invoice_reminder_first_delay_days else o.training_invoice_reminder_interval_days end)
      and lower(trim(coalesce(i.buyer_snapshot ->> 'email',''))) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    order by i.due_date
    limit greatest(1,least(coalesce(p_limit,100),500))
  loop
    v_next := v_row.reminder_count + 1;
    insert into public.email_outbox (
      organization_id,template_key,recipient_email,recipient_name,payload,
      dedupe_key,status,scheduled_for,attempts,locked_at,sent_at,provider_message_id,last_error
    ) values (
      v_row.organization_id,'training_invoice',lower(trim(v_row.buyer_snapshot ->> 'email')),
      coalesce(nullif(trim(coalesce(v_row.buyer_snapshot ->> 'contact_name','')),''),v_row.buyer_snapshot ->> 'name'),
      jsonb_build_object(
        'training_invoice_id',v_row.id,'document_kind','invoice','invoice_number',v_row.invoice_number,
        'document_title',v_row.title,'issue_date',v_row.issue_date,'due_date',v_row.due_date,
        'subtotal_cents',v_row.subtotal_cents,'tax_cents',v_row.tax_cents,
        'total_cents',v_row.total_cents,'balance_due_cents',v_row.balance_due_cents,
        'buyer_name',v_row.buyer_snapshot ->> 'name',
        'organization_name',coalesce(v_row.public_name,v_row.organization_name),
        'organization_logo_url',v_row.logo_url,'organization_primary_color',v_row.primary_color,
        'contact_email',coalesce(v_row.training_reply_to_email,v_row.company_email),
        'contact_phone',v_row.company_phone,'reply_to_email',coalesce(v_row.training_reply_to_email,v_row.company_email),
        'is_reminder',true,'reminder_count',v_next,'attachment_bucket','training-documents',
        'attachment_path',v_row.generated_document_path,'attachment_name',v_row.generated_document_name
      ),
      'training-invoice:'||v_row.id::text||':reminder:'||v_next::text,
      'pending',now(),0,null,null,null,null
    ) on conflict(dedupe_key) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted > 0 then
      update public.training_invoices
      set reminder_count=v_next,last_reminded_at=now()
      where organization_id=v_row.organization_id and id=v_row.id;
      v_total:=v_total+1;
    end if;
  end loop;
  return v_total;
end;
$$;

-- Conserve integralement le calcul V2.17.0 et remplace seulement sa source de
-- produits lorsqu'au moins une facture ou un avoir a ete emis sur l'exercice.
do $$
begin
  if to_regprocedure('public.refresh_training_bpf_report(uuid,uuid)') is not null
     and to_regprocedure('public.refresh_training_bpf_report_commercial_legacy(uuid,uuid)') is null then
    alter function public.refresh_training_bpf_report(uuid,uuid)
      rename to refresh_training_bpf_report_commercial_legacy;
  end if;
end;
$$;

create or replace function public.refresh_training_bpf_report(
  p_organization_id uuid,
  p_report_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb;
  v_report public.training_bpf_reports%rowtype;
  v_keys text[] := array[
    'companies','apprenticeship','professionalization','pro_a','transition','cpf',
    'jobseekers_funds','self_employed_funds','skills_plan','public_agents','eu',
    'state','regions','france_travail','other_public','individuals',
    'training_organizations','other_training'
  ];
  v_auto jsonb := '{}'::jsonb;
  v_revenues jsonb := '{}'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_batch jsonb;
  v_key text;
  v_value bigint;
  v_total bigint := 0;
  v_invoice_count integer := 0;
  v_credit_count integer := 0;
  v_unbilled_count integer := 0;
  v_critical integer := 0;
  v_warning integer := 0;
  v_percent integer := 0;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id,array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id,'training_bpf') then
    raise exception 'Acces refuse.';
  end if;
  select * into v_report from public.training_bpf_reports
  where organization_id=p_organization_id and id=p_report_id;
  if not found then raise exception 'BPF introuvable.'; end if;
  if v_report.status='locked' then return v_report.calculated_data; end if;

  v_data := public.refresh_training_bpf_report_commercial_legacy(p_organization_id,p_report_id);
  select
    count(*) filter(where document_kind='invoice')::integer,
    count(*) filter(where document_kind='credit_note')::integer
  into v_invoice_count,v_credit_count
  from public.training_invoices
  where organization_id=p_organization_id
    and status in ('issued','sent','partial','paid','overdue')
    and issue_date between v_report.exercise_start and v_report.exercise_end;
  if v_invoice_count + v_credit_count = 0 then return v_data; end if;

  select coalesce(jsonb_object_agg(k.key,coalesce(r.amount_cents,0)),'{}'::jsonb)
  into v_auto
  from unnest(v_keys) k(key)
  left join (
    select bpf_revenue_category as key,
      sum(case when document_kind='invoice' then subtotal_cents else -subtotal_cents end)::bigint as amount_cents
    from public.training_invoices
    where organization_id=p_organization_id
      and status in ('issued','sent','partial','paid','overdue')
      and issue_date between v_report.exercise_start and v_report.exercise_end
      and bpf_revenue_category is not null
    group by bpf_revenue_category
  ) r on r.key=k.key;

  foreach v_key in array v_keys loop
    v_value:=greatest(0,coalesce((v_auto->>v_key)::bigint,0));
    if v_report.revenue_overrides ? v_key then
      v_value:=greatest(0,(v_report.revenue_overrides->>v_key)::bigint);
    end if;
    v_revenues:=v_revenues||jsonb_build_object(v_key,v_value);
    v_total:=v_total+v_value;
  end loop;
  if v_report.total_company_revenue_cents>0 and v_total>0 then
    v_percent:=greatest(1,least(100,round(v_total::numeric*100/v_report.total_company_revenue_cents)::integer));
  end if;

  select coalesce(jsonb_agg(item),'[]'::jsonb) into v_warnings
  from jsonb_array_elements(coalesce(v_data#>'{quality,warnings}','[]'::jsonb)) item
  where item->>'code' not in ('revenue_category','commercial_document_not_included');

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','critical','code','invoice_revenue_category','label','Facture emise sans categorie BPF',
    'entity_type','invoice','entity_id',i.id
  )),'[]'::jsonb) into v_batch
  from public.training_invoices i
  where i.organization_id=p_organization_id
    and i.status in ('issued','sent','partial','paid','overdue')
    and i.issue_date between v_report.exercise_start and v_report.exercise_end
    and i.bpf_revenue_category is null;
  v_warnings:=v_warnings||v_batch;

  select count(*)::integer into v_unbilled_count
  from public.training_commercial_documents d
  where d.organization_id=p_organization_id and d.status in ('accepted','signed','completed')
    and d.issue_date between v_report.exercise_start and v_report.exercise_end
    and d.amount_excl_tax_cents > coalesce((
      select sum(case when i.document_kind='invoice' then i.subtotal_cents else -i.subtotal_cents end)
      from public.training_invoices i
      where i.organization_id=d.organization_id and i.commercial_document_id=d.id
        and i.status<>'canceled'
    ),0);

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','warning','code','invoice_overdue','label','Facture en retard de paiement',
    'entity_type','invoice','entity_id',i.id
  )),'[]'::jsonb) into v_batch
  from public.training_invoices i
  where i.organization_id=p_organization_id and i.document_kind='invoice'
    and i.status='overdue' and i.balance_due_cents>0
    and i.issue_date between v_report.exercise_start and v_report.exercise_end;
  v_warnings:=v_warnings||v_batch;

  select coalesce(jsonb_agg(jsonb_build_object(
    'severity','warning','code','commercial_unbilled','label','Dossier commercial partiellement facture',
    'entity_type','commercial_document','entity_id',d.id
  )),'[]'::jsonb) into v_batch
  from public.training_commercial_documents d
  where d.organization_id=p_organization_id and d.status in ('accepted','signed','completed')
    and d.issue_date between v_report.exercise_start and v_report.exercise_end
    and d.amount_excl_tax_cents > coalesce((
      select sum(case when i.document_kind='invoice' then i.subtotal_cents else -i.subtotal_cents end)
      from public.training_invoices i
      where i.organization_id=d.organization_id and i.commercial_document_id=d.id
        and i.status<>'canceled'
    ),0);
  v_warnings:=v_warnings||v_batch;

  select
    count(*) filter(where item->>'severity'='critical')::integer,
    count(*) filter(where item->>'severity'='warning')::integer
  into v_critical,v_warning from jsonb_array_elements(v_warnings) item;

  v_data:=jsonb_set(v_data,'{financial,auto_revenues_cents}',v_auto,true);
  v_data:=jsonb_set(v_data,'{financial,revenues_cents}',v_revenues,true);
  v_data:=jsonb_set(v_data,'{financial,total_products_cents}',to_jsonb(v_total),true);
  v_data:=jsonb_set(v_data,'{financial,training_revenue_percent}',to_jsonb(v_percent),true);
  v_data:=jsonb_set(v_data,'{quality,warnings}',v_warnings,true);
  v_data:=jsonb_set(v_data,'{quality,critical_count}',to_jsonb(v_critical),true);
  v_data:=jsonb_set(v_data,'{quality,warning_count}',to_jsonb(v_warning),true);
  v_data:=jsonb_set(v_data,'{quality,ready}',to_jsonb(v_critical=0),true);
  v_data:=jsonb_set(v_data,'{quality,completeness_percent}',to_jsonb(greatest(0,100-v_critical*10-v_warning*3)),true);
  v_data:=jsonb_set(v_data,'{sources,revenue_source}',to_jsonb('invoices'::text),true);
  v_data:=jsonb_set(v_data,'{sources,included_revenue_documents}',to_jsonb(v_invoice_count+v_credit_count),true);
  v_data:=jsonb_set(v_data,'{sources,unreviewed_revenue_documents}',to_jsonb(v_unbilled_count),true);
  v_data:=jsonb_set(v_data,'{sources,issued_invoices}',to_jsonb(v_invoice_count),true);
  v_data:=jsonb_set(v_data,'{sources,issued_credit_notes}',to_jsonb(v_credit_count),true);
  update public.training_bpf_reports set calculated_data=v_data,calculated_at=now()
  where organization_id=p_organization_id and id=p_report_id;
  return v_data;
end;
$$;

alter table public.training_invoices enable row level security;
alter table public.training_invoice_lines enable row level security;
alter table public.training_invoice_payments enable row level security;
alter table public.training_invoice_counters enable row level security;

revoke all on public.training_invoices, public.training_invoice_lines,
  public.training_invoice_payments, public.training_invoice_counters from anon, authenticated;
grant select on public.training_invoices, public.training_invoice_lines,
  public.training_invoice_payments to authenticated;

drop policy if exists training_invoices_select on public.training_invoices;
create policy training_invoices_select on public.training_invoices for select to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id,'training_billing')
);
drop policy if exists training_invoice_lines_select on public.training_invoice_lines;
create policy training_invoice_lines_select on public.training_invoice_lines for select to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id,'training_billing')
);
drop policy if exists training_invoice_payments_select on public.training_invoice_payments;
create policy training_invoice_payments_select on public.training_invoice_payments for select to authenticated
using (
  public.has_org_role(organization_id,array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id,'training_billing')
);

revoke all on function public.update_training_billing_settings(uuid,text,integer,text,text,text,text,text,text,boolean,integer,integer,integer) from public,anon;
revoke all on function public.create_training_invoice(uuid,uuid,text,bigint,integer,date,date,date,text,text,text) from public,anon;
revoke all on function public.issue_training_invoice(uuid,uuid) from public,anon;
revoke all on function public.record_training_invoice_payment(uuid,uuid,bigint,date,text,text,text) from public,anon;
revoke all on function public.cancel_training_invoice_draft(uuid,uuid) from public,anon;
revoke all on function public.create_training_credit_note(uuid,uuid,text) from public,anon;
revoke all on function public.queue_training_invoice_email(uuid,uuid,text,text,boolean) from public,anon;
revoke all on function public.queue_due_training_invoice_reminders(integer) from public,anon,authenticated;
revoke all on function public.refresh_training_bpf_report_commercial_legacy(uuid,uuid) from public,anon,authenticated;
revoke all on function public.refresh_training_bpf_report(uuid,uuid) from public,anon;

grant execute on function public.update_training_billing_settings(uuid,text,integer,text,text,text,text,text,text,boolean,integer,integer,integer) to authenticated;
grant execute on function public.create_training_invoice(uuid,uuid,text,bigint,integer,date,date,date,text,text,text) to authenticated;
grant execute on function public.issue_training_invoice(uuid,uuid) to authenticated;
grant execute on function public.record_training_invoice_payment(uuid,uuid,bigint,date,text,text,text) to authenticated;
grant execute on function public.cancel_training_invoice_draft(uuid,uuid) to authenticated;
grant execute on function public.create_training_credit_note(uuid,uuid,text) to authenticated;
grant execute on function public.queue_training_invoice_email(uuid,uuid,text,text,boolean) to authenticated;
grant execute on function public.queue_due_training_invoice_reminders(integer) to service_role;
grant execute on function public.refresh_training_bpf_report(uuid,uuid) to authenticated;

insert into public.module_catalog (
  module_key,display_name,description,category,icon_key,
  compatible_business_types,core_module,default_enabled,sort_order
) values (
  'training_billing','Facturation Formation',
  'Factures, avoirs, encaissements, echeances et relances automatiques.',
  'formation','creditCard','{formation}',false,true,535
) on conflict(module_key) do update set
  display_name=excluded.display_name,description=excluded.description,category=excluded.category,
  icon_key=excluded.icon_key,compatible_business_types=excluded.compatible_business_types,
  default_enabled=excluded.default_enabled,active=true,sort_order=excluded.sort_order,updated_at=now();

update public.domain_plan_catalog
set features=features||'{"training_billing":true}'::jsonb,updated_at=now()
where business_type='formation' and plan_key in ('professionnelle','metier');

insert into public.organization_modules(organization_id,module_key,enabled)
select o.id,'training_billing',o.plan in ('professionnelle','metier')
from public.organizations o
where o.business_type='formation'
  and (o.plan<>'metier' or not coalesce(o.metier_modules_configured,false))
on conflict(organization_id,module_key) do update
set enabled=excluded.enabled,updated_at=now();

insert into public.platform_release_state (
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.18.0','2.18.0','ncr-suite-shell-v2.18.0-training-billing-collections',
  now(),auth.uid(),
  'Formation V2.18.0 : factures et avoirs numerotes, encaissements, echeances, relances Brevo et BPF alimente par les factures emises.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,notes=excluded.notes;

commit;
