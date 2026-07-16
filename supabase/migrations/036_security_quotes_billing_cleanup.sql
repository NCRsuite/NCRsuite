-- NCR Suite V2.5.9 — Synthèses planning, devis, nettoyage des préfactures et envoi e-mail
-- À exécuter après 035_security_shift_closure_dossier.sql.

begin;

-- Coordonnées bancaires utilisées dans le pied de page des documents commerciaux.
alter table public.organizations
  add column if not exists security_bank_account_holder text,
  add column if not exists security_bank_name text,
  add column if not exists security_bank_iban text,
  add column if not exists security_bank_bic text,
  add column if not exists security_quote_validity_days integer not null default 30;

alter table public.organizations
  drop constraint if exists organizations_security_quote_validity_days_check,
  add constraint organizations_security_quote_validity_days_check
    check (security_quote_validity_days between 1 and 180);

-- Remplace la fonction de personnalisation pour intégrer les coordonnées bancaires.
drop function if exists public.update_security_document_branding(uuid,text,text,text,text,text,text,text,text,text,numeric,integer,text,text);
drop function if exists public.update_security_document_branding(uuid,text,text,text,text,text,text,text,text,text,numeric,integer,text,text,text,text,text,text,integer);

create function public.update_security_document_branding(
  p_organization_id uuid,
  p_public_name text,
  p_logo_url text,
  p_address text,
  p_postal_code text,
  p_city text,
  p_siret text,
  p_vat_number text,
  p_email text,
  p_phone text,
  p_default_vat_rate numeric,
  p_payment_terms_days integer,
  p_late_penalty_text text,
  p_tax_exemption_text text,
  p_bank_account_holder text,
  p_bank_name text,
  p_bank_iban text,
  p_bank_bic text,
  p_quote_validity_days integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(trim(coalesce(p_public_name, '')), '');
  v_logo text := nullif(trim(coalesce(p_logo_url, '')), '');
  v_iban text := upper(regexp_replace(coalesce(p_bank_iban, ''), '\s+', '', 'g'));
  v_bic text := upper(regexp_replace(coalesce(p_bank_bic, ''), '\s+', '', 'g'));
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;
  if not exists (
    select 1 from public.organizations o
    where o.id = p_organization_id and o.business_type = 'securite' and o.status in ('trial','active')
  ) then
    raise exception 'Espace Sécurité introuvable ou inactif.';
  end if;
  if v_name is null or char_length(v_name) not between 2 and 120 then
    raise exception 'Le nom affiché doit contenir entre 2 et 120 caractères.';
  end if;
  if v_logo is not null and (char_length(v_logo) > 1200 or v_logo !~ '^https://') then
    raise exception 'L’adresse du logo est invalide.';
  end if;
  if coalesce(p_default_vat_rate, 0) not between 0 and 100 then
    raise exception 'Le taux de TVA est invalide.';
  end if;
  if coalesce(p_payment_terms_days, 30) not between 0 and 180 then
    raise exception 'Le délai de paiement est invalide.';
  end if;
  if coalesce(p_quote_validity_days, 30) not between 1 and 180 then
    raise exception 'La durée de validité des devis est invalide.';
  end if;
  if v_iban <> '' and (char_length(v_iban) < 14 or char_length(v_iban) > 34 or v_iban !~ '^[A-Z0-9]+$') then
    raise exception 'L’IBAN est invalide.';
  end if;
  if v_bic <> '' and (char_length(v_bic) not in (8,11) or v_bic !~ '^[A-Z0-9]+$') then
    raise exception 'Le BIC est invalide.';
  end if;

  update public.organizations
  set public_name = v_name,
      logo_url = v_logo,
      security_billing_address = nullif(trim(coalesce(p_address, '')), ''),
      security_billing_postal_code = nullif(trim(coalesce(p_postal_code, '')), ''),
      security_billing_city = nullif(trim(coalesce(p_city, '')), ''),
      security_billing_siret = nullif(trim(coalesce(p_siret, '')), ''),
      security_billing_vat_number = nullif(trim(coalesce(p_vat_number, '')), ''),
      security_billing_email = nullif(lower(trim(coalesce(p_email, ''))), ''),
      security_billing_phone = nullif(trim(coalesce(p_phone, '')), ''),
      security_default_vat_rate = coalesce(p_default_vat_rate, 20),
      security_payment_terms_days = coalesce(p_payment_terms_days, 30),
      security_late_penalty_text = nullif(trim(coalesce(p_late_penalty_text, '')), ''),
      security_tax_exemption_text = nullif(trim(coalesce(p_tax_exemption_text, '')), ''),
      security_bank_account_holder = nullif(trim(coalesce(p_bank_account_holder, '')), ''),
      security_bank_name = nullif(trim(coalesce(p_bank_name, '')), ''),
      security_bank_iban = nullif(v_iban, ''),
      security_bank_bic = nullif(v_bic, ''),
      security_quote_validity_days = coalesce(p_quote_validity_days, 30),
      updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'security.document_branding_updated', 'organization', p_organization_id::text,
    jsonb_build_object(
      'vat_rate', p_default_vat_rate,
      'payment_terms_days', p_payment_terms_days,
      'quote_validity_days', p_quote_validity_days,
      'bank_details_configured', v_iban <> ''
    )
  );
end;
$$;

revoke all on function public.update_security_document_branding(uuid,text,text,text,text,text,text,text,text,text,numeric,integer,text,text,text,text,text,text,integer) from public;
grant execute on function public.update_security_document_branding(uuid,text,text,text,text,text,text,text,text,text,numeric,integer,text,text,text,text,text,text,integer) to authenticated;

-- Les coordonnées bancaires sont ajoutées aux instantanés des documents existants et futurs.
create or replace function public.security_enrich_invoice_issuer_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
begin
  select * into v_org from public.organizations where id = new.organization_id;
  new.issuer_snapshot := coalesce(new.issuer_snapshot, '{}'::jsonb) || jsonb_build_object(
    'bank_account_holder', v_org.security_bank_account_holder,
    'bank_name', v_org.security_bank_name,
    'bank_iban', v_org.security_bank_iban,
    'bank_bic', v_org.security_bank_bic
  );
  return new;
end;
$$;

drop trigger if exists security_enrich_invoice_issuer_snapshot_trigger on public.security_invoices;
create trigger security_enrich_invoice_issuer_snapshot_trigger
before insert or update of issuer_snapshot on public.security_invoices
for each row execute procedure public.security_enrich_invoice_issuer_snapshot();

update public.security_invoices i
set issuer_snapshot = coalesce(i.issuer_snapshot, '{}'::jsonb) || jsonb_build_object(
  'bank_account_holder', o.security_bank_account_holder,
  'bank_name', o.security_bank_name,
  'bank_iban', o.security_bank_iban,
  'bank_bic', o.security_bank_bic
), updated_at = now()
from public.organizations o
where o.id = i.organization_id and o.business_type = 'securite';

-- Suppression sécurisée des seules préfactures en brouillon.
create or replace function public.delete_security_proforma(
  p_organization_id uuid,
  p_invoice_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;

  select i.invoice_number into v_number
  from public.security_invoices i
  where i.organization_id = p_organization_id
    and i.id = p_invoice_id
    and coalesce(i.document_kind, 'proforma') = 'proforma'
    and i.status = 'draft'
  for update;

  if not found then
    raise exception 'Seule une préfacture en brouillon peut être supprimée.';
  end if;

  delete from public.security_invoices
  where organization_id = p_organization_id and id = p_invoice_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'security.proforma_deleted', 'security_invoice', p_invoice_id::text,
    jsonb_build_object('invoice_number', v_number));
end;
$$;

revoke all on function public.delete_security_proforma(uuid,uuid) from public;
grant execute on function public.delete_security_proforma(uuid,uuid) to authenticated;

-- Devis pour prospects et nouvelles entreprises.
create table if not exists public.security_quote_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_year integer not null,
  next_value integer not null default 1 check (next_value > 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, quote_year)
);

create table if not exists public.security_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_number text not null,
  status text not null default 'draft' check (status in ('draft','sent','accepted','refused','expired','canceled')),
  prospect_company_name text not null check (char_length(trim(prospect_company_name)) between 2 and 160),
  prospect_contact_name text,
  prospect_email text,
  prospect_phone text,
  prospect_billing_address text,
  prospect_postal_code text,
  prospect_city text,
  prospect_siret text,
  prospect_vat_number text,
  proposed_site_name text,
  proposed_site_address text,
  proposed_hourly_rate_cents integer check (proposed_hourly_rate_cents is null or proposed_hourly_rate_cents between 0 and 1000000),
  valid_until date not null,
  notes text,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  tax_rate_basis_points integer not null default 0 check (tax_rate_basis_points between 0 and 10000),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  issuer_snapshot jsonb not null default '{}'::jsonb,
  prospect_snapshot jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  accepted_at timestamptz,
  refused_at timestamptz,
  canceled_at timestamptz,
  converted_client_id uuid,
  converted_site_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, quote_number),
  unique (organization_id, id),
  constraint security_quotes_converted_client_fk foreign key (organization_id, converted_client_id)
    references public.security_clients(organization_id, id) on delete set null,
  constraint security_quotes_converted_site_fk foreign key (organization_id, converted_site_id)
    references public.security_sites(organization_id, id) on delete set null
);

create table if not exists public.security_quote_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null,
  position integer not null default 0,
  label text not null check (char_length(trim(label)) between 1 and 180),
  description text,
  quantity numeric(10,2) not null default 1 check (quantity > 0 and quantity <= 100000),
  unit text not null default 'forfait' check (unit in ('heure','jour','vacation','forfait','unite')),
  unit_price_cents integer not null default 0 check (unit_price_cents between 0 and 100000000),
  line_total_cents integer not null default 0 check (line_total_cents >= 0),
  created_at timestamptz not null default now(),
  constraint security_quote_lines_quote_fk foreign key (organization_id, quote_id)
    references public.security_quotes(organization_id, id) on delete cascade
);

create index if not exists idx_security_quotes_org_created on public.security_quotes(organization_id, created_at desc);
create index if not exists idx_security_quotes_org_status on public.security_quotes(organization_id, status, valid_until);
create index if not exists idx_security_quote_lines_quote on public.security_quote_lines(organization_id, quote_id, position);

alter table public.security_quote_counters enable row level security;
alter table public.security_quotes enable row level security;
alter table public.security_quote_lines enable row level security;

drop policy if exists "security_quotes_select_members" on public.security_quotes;
create policy "security_quotes_select_members" on public.security_quotes
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "security_quote_lines_select_members" on public.security_quote_lines;
create policy "security_quote_lines_select_members" on public.security_quote_lines
for select to authenticated using (public.is_org_member(organization_id));

create or replace function public.save_security_quote(
  p_organization_id uuid,
  p_quote_id uuid,
  p_company_name text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_billing_address text,
  p_postal_code text,
  p_city text,
  p_siret text,
  p_vat_number text,
  p_site_name text,
  p_site_address text,
  p_hourly_rate_cents integer,
  p_valid_until date,
  p_notes text,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid := p_quote_id;
  v_quote_number text;
  v_year integer := extract(year from current_date)::integer;
  v_sequence integer;
  v_org public.organizations%rowtype;
  v_subtotal integer := 0;
  v_tax integer := 0;
  v_total integer := 0;
  v_tax_bps integer;
  v_line jsonb;
  v_quantity numeric(10,2);
  v_price integer;
  v_line_total integer;
  v_position integer := 0;
  v_line_count integer := 0;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;
  select * into v_org from public.organizations
  where id = p_organization_id and business_type = 'securite' and status in ('trial','active');
  if not found then raise exception 'Espace Sécurité introuvable ou inactif.'; end if;
  if char_length(trim(coalesce(p_company_name, ''))) not between 2 and 160 then
    raise exception 'Le nom de l’entreprise prospecte est obligatoire.';
  end if;
  if p_valid_until is null or p_valid_until < current_date then
    raise exception 'La date de validité du devis est invalide.';
  end if;
  if jsonb_typeof(coalesce(p_lines, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) = 0 then
    raise exception 'Ajoutez au moins une ligne au devis.';
  end if;

  if v_quote_id is null then
    insert into public.security_quote_counters (organization_id, quote_year, next_value)
    values (p_organization_id, v_year, 2)
    on conflict (organization_id, quote_year)
    do update set next_value = public.security_quote_counters.next_value + 1, updated_at = now()
    returning next_value - 1 into v_sequence;
    v_quote_number := 'DEV-' || v_year::text || '-' || lpad(v_sequence::text, 6, '0');
    v_quote_id := gen_random_uuid();

    insert into public.security_quotes (
      id, organization_id, quote_number, status,
      prospect_company_name, prospect_contact_name, prospect_email, prospect_phone,
      prospect_billing_address, prospect_postal_code, prospect_city, prospect_siret, prospect_vat_number,
      proposed_site_name, proposed_site_address, proposed_hourly_rate_cents,
      valid_until, notes, issuer_snapshot, prospect_snapshot, created_by
    ) values (
      v_quote_id, p_organization_id, v_quote_number, 'draft',
      trim(p_company_name), nullif(trim(coalesce(p_contact_name,'')),''), nullif(lower(trim(coalesce(p_email,''))),''), nullif(trim(coalesce(p_phone,'')),''),
      nullif(trim(coalesce(p_billing_address,'')),''), nullif(trim(coalesce(p_postal_code,'')),''), nullif(trim(coalesce(p_city,'')),''), nullif(trim(coalesce(p_siret,'')),''), nullif(trim(coalesce(p_vat_number,'')),''),
      nullif(trim(coalesce(p_site_name,'')),''), nullif(trim(coalesce(p_site_address,'')),''), p_hourly_rate_cents,
      p_valid_until, nullif(trim(coalesce(p_notes,'')),''),
      jsonb_build_object(
        'name', coalesce(v_org.public_name, v_org.name), 'logo_url', v_org.logo_url,
        'address', v_org.security_billing_address, 'postal_code', v_org.security_billing_postal_code,
        'city', v_org.security_billing_city, 'siret', v_org.security_billing_siret,
        'vat_number', v_org.security_billing_vat_number, 'email', v_org.security_billing_email,
        'phone', v_org.security_billing_phone, 'late_penalty_text', v_org.security_late_penalty_text,
        'tax_exemption_text', v_org.security_tax_exemption_text,
        'bank_account_holder', v_org.security_bank_account_holder, 'bank_name', v_org.security_bank_name,
        'bank_iban', v_org.security_bank_iban, 'bank_bic', v_org.security_bank_bic
      ),
      jsonb_build_object(
        'company_name', trim(p_company_name), 'contact_name', nullif(trim(coalesce(p_contact_name,'')),''),
        'email', nullif(lower(trim(coalesce(p_email,''))),''), 'phone', nullif(trim(coalesce(p_phone,'')),''),
        'billing_address', nullif(trim(coalesce(p_billing_address,'')),''), 'postal_code', nullif(trim(coalesce(p_postal_code,'')),''),
        'city', nullif(trim(coalesce(p_city,'')),''), 'siret', nullif(trim(coalesce(p_siret,'')),''),
        'vat_number', nullif(trim(coalesce(p_vat_number,'')),'')
      ), auth.uid()
    );
  else
    select quote_number into v_quote_number
    from public.security_quotes
    where organization_id = p_organization_id and id = v_quote_id and status = 'draft'
    for update;
    if not found then raise exception 'Seul un devis en brouillon peut être modifié.'; end if;

    update public.security_quotes
    set prospect_company_name = trim(p_company_name),
        prospect_contact_name = nullif(trim(coalesce(p_contact_name,'')),''),
        prospect_email = nullif(lower(trim(coalesce(p_email,''))),''),
        prospect_phone = nullif(trim(coalesce(p_phone,'')),''),
        prospect_billing_address = nullif(trim(coalesce(p_billing_address,'')),''),
        prospect_postal_code = nullif(trim(coalesce(p_postal_code,'')),''),
        prospect_city = nullif(trim(coalesce(p_city,'')),''),
        prospect_siret = nullif(trim(coalesce(p_siret,'')),''),
        prospect_vat_number = nullif(trim(coalesce(p_vat_number,'')),''),
        proposed_site_name = nullif(trim(coalesce(p_site_name,'')),''),
        proposed_site_address = nullif(trim(coalesce(p_site_address,'')),''),
        proposed_hourly_rate_cents = p_hourly_rate_cents,
        valid_until = p_valid_until,
        notes = nullif(trim(coalesce(p_notes,'')),''),
        prospect_snapshot = jsonb_build_object(
          'company_name', trim(p_company_name), 'contact_name', nullif(trim(coalesce(p_contact_name,'')),''),
          'email', nullif(lower(trim(coalesce(p_email,''))),''), 'phone', nullif(trim(coalesce(p_phone,'')),''),
          'billing_address', nullif(trim(coalesce(p_billing_address,'')),''), 'postal_code', nullif(trim(coalesce(p_postal_code,'')),''),
          'city', nullif(trim(coalesce(p_city,'')),''), 'siret', nullif(trim(coalesce(p_siret,'')),''),
          'vat_number', nullif(trim(coalesce(p_vat_number,'')),'')
        ),
        updated_at = now()
    where organization_id = p_organization_id and id = v_quote_id;

    delete from public.security_quote_lines where organization_id = p_organization_id and quote_id = v_quote_id;
  end if;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_position := v_position + 1;
    v_quantity := greatest(0.01, coalesce(nullif(v_line->>'quantity','')::numeric, 1));
    v_price := greatest(0, coalesce(nullif(v_line->>'unit_price_cents','')::integer, 0));
    v_line_total := round(v_quantity * v_price)::integer;
    if nullif(trim(coalesce(v_line->>'label','')), '') is null then
      raise exception 'Chaque ligne doit avoir un intitulé.';
    end if;
    insert into public.security_quote_lines (
      organization_id, quote_id, position, label, description, quantity, unit, unit_price_cents, line_total_cents
    ) values (
      p_organization_id, v_quote_id, v_position, trim(v_line->>'label'), nullif(trim(coalesce(v_line->>'description','')),''),
      v_quantity,
      case when coalesce(v_line->>'unit','forfait') in ('heure','jour','vacation','forfait','unite') then coalesce(v_line->>'unit','forfait') else 'forfait' end,
      v_price, v_line_total
    );
    v_subtotal := v_subtotal + v_line_total;
    v_line_count := v_line_count + 1;
  end loop;

  if v_line_count = 0 then raise exception 'Ajoutez au moins une ligne au devis.'; end if;
  v_tax_bps := round(coalesce(v_org.security_default_vat_rate,20) * 100)::integer;
  v_tax := round(v_subtotal::numeric * v_tax_bps / 10000)::integer;
  v_total := v_subtotal + v_tax;

  update public.security_quotes
  set subtotal_cents = v_subtotal,
      tax_rate_basis_points = v_tax_bps,
      tax_cents = v_tax,
      total_cents = v_total,
      updated_at = now()
  where organization_id = p_organization_id and id = v_quote_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'security.quote_saved', 'security_quote', v_quote_id::text,
    jsonb_build_object('quote_number', v_quote_number, 'total_cents', v_total));

  return v_quote_id;
end;
$$;

revoke all on function public.save_security_quote(uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,integer,date,text,jsonb) from public;
grant execute on function public.save_security_quote(uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,integer,date,text,jsonb) to authenticated;

create or replace function public.set_security_quote_status(
  p_organization_id uuid,
  p_quote_id uuid,
  p_status text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;
  select status into v_current from public.security_quotes
  where organization_id = p_organization_id and id = p_quote_id for update;
  if not found then raise exception 'Devis introuvable.'; end if;
  if p_status not in ('draft','sent','accepted','refused','expired','canceled') then raise exception 'Statut invalide.'; end if;
  if not (
    v_current = p_status
    or (v_current = 'draft' and p_status in ('sent','accepted','refused','canceled'))
    or (v_current = 'sent' and p_status in ('accepted','refused','expired','canceled'))
  ) then raise exception 'Transition de statut non autorisée.'; end if;

  update public.security_quotes
  set status = p_status,
      sent_at = case when p_status = 'sent' then coalesce(sent_at, now()) else sent_at end,
      accepted_at = case when p_status = 'accepted' then coalesce(accepted_at, now()) else accepted_at end,
      refused_at = case when p_status = 'refused' then coalesce(refused_at, now()) else refused_at end,
      canceled_at = case when p_status = 'canceled' then coalesce(canceled_at, now()) else canceled_at end,
      updated_at = now()
  where organization_id = p_organization_id and id = p_quote_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'security.quote_status_changed', 'security_quote', p_quote_id::text,
    jsonb_build_object('previous_status', v_current, 'new_status', p_status));
  return p_status;
end;
$$;

revoke all on function public.set_security_quote_status(uuid,uuid,text) from public;
grant execute on function public.set_security_quote_status(uuid,uuid,text) to authenticated;

create or replace function public.convert_security_quote_to_client(
  p_organization_id uuid,
  p_quote_id uuid
)
returns table(client_id uuid, site_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.security_quotes%rowtype;
  v_client_id uuid;
  v_site_id uuid;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seul un propriétaire ou administrateur peut convertir un devis.';
  end if;
  select * into v_quote from public.security_quotes
  where organization_id = p_organization_id and id = p_quote_id for update;
  if not found then raise exception 'Devis introuvable.'; end if;
  if v_quote.status <> 'accepted' then raise exception 'Le devis doit être accepté avant conversion.'; end if;
  if v_quote.converted_client_id is not null then
    return query select v_quote.converted_client_id, v_quote.converted_site_id;
    return;
  end if;

  insert into public.security_clients (
    organization_id, company_name, contact_name, email, phone, billing_address, postal_code, city,
    siret, vat_number, payment_terms_days, notes, status, created_by
  ) values (
    p_organization_id, v_quote.prospect_company_name, v_quote.prospect_contact_name, v_quote.prospect_email,
    v_quote.prospect_phone, v_quote.prospect_billing_address, v_quote.prospect_postal_code, v_quote.prospect_city,
    v_quote.prospect_siret, v_quote.prospect_vat_number,
    coalesce((select security_payment_terms_days from public.organizations where id = p_organization_id),30),
    'Créé depuis le devis ' || v_quote.quote_number, 'active', auth.uid()
  ) returning id into v_client_id;

  if nullif(trim(coalesce(v_quote.proposed_site_name,'')), '') is not null then
    insert into public.security_sites (
      organization_id, client_id, name, address, hourly_rate_cents, timezone, notes, status, created_by
    ) values (
      p_organization_id, v_client_id, v_quote.proposed_site_name, v_quote.proposed_site_address,
      coalesce(v_quote.proposed_hourly_rate_cents,0), 'Europe/Paris',
      'Créé depuis le devis ' || v_quote.quote_number, 'active', auth.uid()
    ) returning id into v_site_id;
  end if;

  update public.security_quotes
  set converted_client_id = v_client_id, converted_site_id = v_site_id, updated_at = now()
  where organization_id = p_organization_id and id = p_quote_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'security.quote_converted', 'security_quote', p_quote_id::text,
    jsonb_build_object('client_id', v_client_id, 'site_id', v_site_id));

  return query select v_client_id, v_site_id;
end;
$$;

revoke all on function public.convert_security_quote_to_client(uuid,uuid) from public;
grant execute on function public.convert_security_quote_to_client(uuid,uuid) to authenticated;

-- Historique des envois de devis et factures via l’Edge Function dédiée.
create table if not exists public.security_document_email_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_kind text not null check (document_kind in ('invoice','quote')),
  document_id uuid not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  message text,
  status text not null default 'sending' check (status in ('sending','sent','failed')),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_document_email_logs_document
  on public.security_document_email_logs(organization_id, document_kind, document_id, created_at desc);

alter table public.security_document_email_logs enable row level security;
drop policy if exists "security_document_email_logs_select_members" on public.security_document_email_logs;
create policy "security_document_email_logs_select_members" on public.security_document_email_logs
for select to authenticated using (public.is_org_member(organization_id));

-- Module Devis visible dans toutes les offres Sécurité.
insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, active, sort_order
) values (
  'security_quotes', 'Devis Sécurité',
  'Création de devis prospects, PDF, envoi e-mail et conversion en client et site.',
  'securite', 'file', '{securite}', false, true, true, 553
)
on conflict (module_key) do update
set display_name = excluded.display_name, description = excluded.description, category = excluded.category,
    icon_key = excluded.icon_key, compatible_business_types = excluded.compatible_business_types,
    default_enabled = excluded.default_enabled, active = excluded.active, sort_order = excluded.sort_order,
    updated_at = now();

insert into public.organization_modules (organization_id, module_key, enabled)
select o.id, 'security_quotes', true
from public.organizations o
where o.business_type = 'securite'
on conflict (organization_id, module_key) do update set enabled = true, updated_at = now();

update public.domain_plan_catalog
set features = coalesce(features, '{}'::jsonb) || '{"security_quotes":true,"security_bank_details":true,"security_document_email":true}'::jsonb,
    updated_at = now()
where business_type = 'securite';

select pg_notify('pgrst', 'reload schema');
commit;
