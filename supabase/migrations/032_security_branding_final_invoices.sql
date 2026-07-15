-- NCR Suite V2.5.5 — Logo documents Sécurité et facturation définitive
-- À exécuter après 031_security_patrol_billing_access_fix.sql.

begin;

-- Toutes les offres Sécurité disposent du logo documentaire et de la facture définitive.
update public.domain_plan_catalog
set features = coalesce(features, '{}'::jsonb)
  || '{"security_document_branding":true,"security_final_billing":true}'::jsonb,
    updated_at = now()
where business_type = 'securite';

-- Profil légal et commercial utilisé pour les documents Sécurité.
alter table public.organizations
  add column if not exists security_billing_address text,
  add column if not exists security_billing_postal_code text,
  add column if not exists security_billing_city text,
  add column if not exists security_billing_siret text,
  add column if not exists security_billing_vat_number text,
  add column if not exists security_billing_email text,
  add column if not exists security_billing_phone text,
  add column if not exists security_default_vat_rate numeric(5,2) not null default 20,
  add column if not exists security_payment_terms_days integer not null default 30,
  add column if not exists security_late_penalty_text text,
  add column if not exists security_tax_exemption_text text;

alter table public.organizations
  drop constraint if exists organizations_security_default_vat_rate_check,
  add constraint organizations_security_default_vat_rate_check check (security_default_vat_rate between 0 and 100),
  drop constraint if exists organizations_security_payment_terms_days_check,
  add constraint organizations_security_payment_terms_days_check check (security_payment_terms_days between 0 and 180);

-- Les logos Sécurité sont accessibles quelle que soit la formule.
create or replace function public.can_manage_brand_asset(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  begin
    v_organization_id := split_part(coalesce(p_object_name, ''), '/', 1)::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return public.has_org_role(v_organization_id, array['owner','admin','manager'])
    and exists (
      select 1
      from public.organizations o
      where o.id = v_organization_id
        and o.status in ('trial','active')
        and (o.business_type = 'securite' or o.plan in ('professionnelle','metier'))
    );
end;
$$;

revoke all on function public.can_manage_brand_asset(text) from public;
grant execute on function public.can_manage_brand_asset(text) to authenticated;

create or replace function public.update_security_document_branding(
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
  p_tax_exemption_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(trim(coalesce(p_public_name, '')), '');
  v_logo text := nullif(trim(coalesce(p_logo_url, '')), '');
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

  update public.organizations
  set public_name = v_name,
      logo_url = v_logo,
      security_billing_address = nullif(trim(coalesce(p_address, '')), ''),
      security_billing_postal_code = nullif(trim(coalesce(p_postal_code, '')), ''),
      security_billing_city = nullif(trim(coalesce(p_city, '')), ''),
      security_billing_siret = nullif(trim(coalesce(p_siret, '')), ''),
      security_billing_vat_number = nullif(trim(coalesce(p_vat_number, '')), ''),
      security_billing_email = nullif(trim(coalesce(p_email, '')), ''),
      security_billing_phone = nullif(trim(coalesce(p_phone, '')), ''),
      security_default_vat_rate = coalesce(p_default_vat_rate, 20),
      security_payment_terms_days = coalesce(p_payment_terms_days, 30),
      security_late_penalty_text = nullif(trim(coalesce(p_late_penalty_text, '')), ''),
      security_tax_exemption_text = nullif(trim(coalesce(p_tax_exemption_text, '')), ''),
      updated_at = now()
  where id = p_organization_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'security.document_branding_updated', 'organization', p_organization_id::text,
    jsonb_build_object('vat_rate', p_default_vat_rate, 'payment_terms_days', p_payment_terms_days));
end;
$$;

revoke all on function public.update_security_document_branding(uuid,text,text,text,text,text,text,text,text,text,numeric,integer,text,text) from public;
grant execute on function public.update_security_document_branding(uuid,text,text,text,text,text,text,text,text,text,numeric,integer,text,text) to authenticated;

-- Données de réalisation de la vacation.
alter table public.security_shifts
  add column if not exists actual_minutes integer,
  add column if not exists actual_validation_note text,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references auth.users(id) on delete set null,
  add column if not exists final_invoice_id uuid;

alter table public.security_shifts
  drop constraint if exists security_shifts_actual_minutes_check,
  add constraint security_shifts_actual_minutes_check check (actual_minutes is null or actual_minutes between 0 and 2880);

-- Distinction préfacture / facture définitive.
alter table public.security_invoices
  add column if not exists document_kind text not null default 'proforma',
  add column if not exists tax_rate_basis_points integer not null default 0,
  add column if not exists tax_cents integer not null default 0,
  add column if not exists due_date date,
  add column if not exists sent_at timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists issuer_snapshot jsonb,
  add column if not exists client_snapshot jsonb,
  add column if not exists source_mode text not null default 'scheduled';

alter table public.security_invoices
  drop constraint if exists security_invoices_status_check,
  add constraint security_invoices_status_check check (status in ('draft','issued','sent','paid','overdue','canceled')),
  drop constraint if exists security_invoices_document_kind_check,
  add constraint security_invoices_document_kind_check check (document_kind in ('proforma','invoice')),
  drop constraint if exists security_invoices_source_mode_check,
  add constraint security_invoices_source_mode_check check (source_mode in ('scheduled','completed')),
  drop constraint if exists security_invoices_tax_rate_check,
  add constraint security_invoices_tax_rate_check check (tax_rate_basis_points between 0 and 10000);

alter table public.security_invoice_lines
  add column if not exists billed_minutes integer,
  add column if not exists shift_count integer not null default 0;

alter table public.security_invoice_lines
  drop constraint if exists security_invoice_lines_billed_minutes_check,
  add constraint security_invoice_lines_billed_minutes_check check (billed_minutes is null or billed_minutes >= 0);

-- Détail des vacations incluses dans une facture définitive.
create table if not exists public.security_invoice_shift_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null,
  shift_id uuid not null,
  site_id uuid not null,
  agent_id uuid not null,
  service_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  actual_minutes integer not null check (actual_minutes between 0 and 2880),
  hourly_rate_cents integer not null check (hourly_rate_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  description text,
  created_at timestamptz not null default now(),
  unique (organization_id, shift_id),
  constraint security_invoice_shift_items_invoice_fk foreign key (organization_id, invoice_id)
    references public.security_invoices(organization_id, id) on delete restrict,
  constraint security_invoice_shift_items_shift_fk foreign key (organization_id, shift_id)
    references public.security_shifts(organization_id, id) on delete restrict,
  constraint security_invoice_shift_items_site_fk foreign key (organization_id, site_id)
    references public.security_sites(organization_id, id) on delete restrict,
  constraint security_invoice_shift_items_agent_fk foreign key (organization_id, agent_id)
    references public.security_agents(organization_id, id) on delete restrict
);

create index if not exists idx_security_invoice_shift_items_invoice on public.security_invoice_shift_items(organization_id, invoice_id, service_date);
create index if not exists idx_security_shifts_final_invoice on public.security_shifts(organization_id, final_invoice_id);

alter table public.security_shifts
  drop constraint if exists security_shifts_final_invoice_fk,
  add constraint security_shifts_final_invoice_fk foreign key (organization_id, final_invoice_id)
    references public.security_invoices(organization_id, id) on delete restrict;

alter table public.security_invoice_shift_items enable row level security;
drop policy if exists security_invoice_shift_items_manager_select on public.security_invoice_shift_items;
create policy security_invoice_shift_items_manager_select on public.security_invoice_shift_items
for select using (public.is_security_manager(organization_id));
grant select on public.security_invoice_shift_items to authenticated;
revoke insert, update, delete on public.security_invoice_shift_items from authenticated;

-- Compteur chronologique par entreprise et par année.
create table if not exists public.security_invoice_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_year integer not null,
  next_value integer not null default 1 check (next_value >= 1),
  updated_at timestamptz not null default now(),
  primary key (organization_id, invoice_year)
);
revoke all on public.security_invoice_counters from anon, authenticated;

create or replace function public.set_security_shift_completion_data()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_planned integer;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    v_planned := greatest(0, floor(extract(epoch from (new.ends_at - new.starts_at)) / 60)::integer - new.break_minutes);
    new.actual_minutes := coalesce(new.actual_minutes, v_planned);
    new.completed_at := coalesce(new.completed_at, now());
    new.completed_by := coalesce(new.completed_by, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists set_security_shift_completion_data_trigger on public.security_shifts;
create trigger set_security_shift_completion_data_trigger
before update of status on public.security_shifts
for each row execute procedure public.set_security_shift_completion_data();

create or replace function public.validate_security_shift_actual_minutes(
  p_organization_id uuid,
  p_shift_id uuid,
  p_actual_minutes integer,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;
  if p_actual_minutes < 0 or p_actual_minutes > 2880 then
    raise exception 'La durée réalisée est invalide.';
  end if;

  update public.security_shifts s
  set actual_minutes = p_actual_minutes,
      actual_validation_note = nullif(trim(coalesce(p_note, '')), ''),
      completed_at = coalesce(s.completed_at, now()),
      completed_by = auth.uid(),
      updated_at = now()
  where s.organization_id = p_organization_id
    and s.id = p_shift_id
    and s.status = 'completed'
    and s.final_invoice_id is null;

  if not found then
    raise exception 'Vacation réalisée introuvable, déjà facturée ou non modifiable.';
  end if;
end;
$$;

revoke all on function public.validate_security_shift_actual_minutes(uuid,uuid,integer,text) from public;
grant execute on function public.validate_security_shift_actual_minutes(uuid,uuid,integer,text) to authenticated;

-- Les préfactures restent distinctes des factures définitives, même sur une période identique.
create or replace function public.generate_security_invoice(
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
  v_invoice_id uuid;
  v_invoice_number text;
  v_existing_status text;
  v_total integer := 0;
  v_line_count integer := 0;
  v_seq bigint;
  invoice_line record;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;
  if not public.organization_has_plan_feature(p_organization_id, 'security_scheduled_billing') then
    raise exception 'La préfacturation Sécurité n’est pas incluse dans cette offre.';
  end if;
  if p_period_end < p_period_start then
    raise exception 'La date de fin doit être postérieure ou égale à la date de début.';
  end if;
  if not exists (
    select 1 from public.security_clients client
    where client.organization_id = p_organization_id
      and client.id = p_client_id
      and client.status <> 'archived'
  ) then
    raise exception 'Client introuvable.';
  end if;

  select invoice.id, invoice.invoice_number, invoice.status
  into v_invoice_id, v_invoice_number, v_existing_status
  from public.security_invoices invoice
  where invoice.organization_id = p_organization_id
    and invoice.client_id = p_client_id
    and invoice.period_start = p_period_start
    and invoice.period_end = p_period_end
    and invoice.document_kind = 'proforma'
    and invoice.status <> 'canceled'
  order by invoice.created_at desc
  limit 1
  for update;

  if found then
    if v_existing_status <> 'draft' then
      raise exception 'La préfacture % est déjà % et ne peut plus être recalculée.',
        v_invoice_number,
        case v_existing_status
          when 'issued' then 'émise'
          when 'sent' then 'envoyée'
          when 'paid' then 'payée'
          else v_existing_status
        end;
    end if;
    delete from public.security_invoice_lines line
    where line.organization_id = p_organization_id and line.invoice_id = v_invoice_id;
    update public.security_invoices invoice
    set notes = nullif(trim(coalesce(p_notes, '')), ''),
        subtotal_cents = 0,
        tax_rate_basis_points = 0,
        tax_cents = 0,
        total_cents = 0,
        document_kind = 'proforma',
        source_mode = 'scheduled',
        updated_at = now()
    where invoice.organization_id = p_organization_id and invoice.id = v_invoice_id;
  else
    v_seq := nextval('public.security_invoice_number_seq');
    v_invoice_number := 'SEC-' || to_char(current_date, 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    insert into public.security_invoices (
      organization_id, client_id, invoice_number, period_start, period_end, status,
      subtotal_cents, tax_rate_basis_points, tax_cents, total_cents, notes,
      document_kind, source_mode, created_by
    ) values (
      p_organization_id, p_client_id, v_invoice_number, p_period_start, p_period_end, 'draft',
      0, 0, 0, 0, nullif(trim(coalesce(p_notes, '')), ''),
      'proforma', 'scheduled', auth.uid()
    ) returning id into v_invoice_id;
  end if;

  for invoice_line in
    select *
    from public.preview_security_invoice(p_organization_id, p_client_id, p_period_start, p_period_end)
    where scheduled_minutes > 0
  loop
    insert into public.security_invoice_lines (
      organization_id, invoice_id, site_id, description, scheduled_minutes, billed_minutes,
      shift_count, hourly_rate_cents, line_total_cents
    ) values (
      p_organization_id, v_invoice_id, invoice_line.site_id,
      'Heures de sécurité programmées — ' || invoice_line.site_name,
      invoice_line.scheduled_minutes, invoice_line.scheduled_minutes, 0,
      invoice_line.hourly_rate_cents, invoice_line.line_total_cents
    );
    v_total := v_total + invoice_line.line_total_cents;
    v_line_count := v_line_count + 1;
  end loop;

  if v_line_count = 0 then
    raise exception 'Aucune heure programmée facturable sur cette période.';
  end if;

  update public.security_invoices invoice
  set subtotal_cents = v_total, total_cents = v_total, updated_at = now()
  where invoice.organization_id = p_organization_id and invoice.id = v_invoice_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(),
    case when v_existing_status = 'draft' then 'security.invoice_recalculated' else 'security.invoice_generated' end,
    'security_invoice', v_invoice_id::text,
    jsonb_build_object('document_kind', 'proforma', 'client_id', p_client_id,
      'period_start', p_period_start, 'period_end', p_period_end,
      'total_cents', v_total, 'line_count', v_line_count)
  );

  return v_invoice_id;
end;
$$;

revoke all on function public.generate_security_invoice(uuid,uuid,date,date,text) from public;
grant execute on function public.generate_security_invoice(uuid,uuid,date,date,text) to authenticated;

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
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;
  if not public.organization_has_plan_feature(p_organization_id, 'security_final_billing') then
    raise exception 'La facturation définitive n’est pas incluse dans cette offre.';
  end if;
  if p_period_end < p_period_start then raise exception 'Période invalide.'; end if;

  return query
  select
    site.id,
    site.name,
    count(shift.id)::integer,
    sum(coalesce(shift.actual_minutes, greatest(0, floor(extract(epoch from (shift.ends_at - shift.starts_at)) / 60)::integer - shift.break_minutes)))::integer,
    site.hourly_rate_cents,
    round((sum(coalesce(shift.actual_minutes, greatest(0, floor(extract(epoch from (shift.ends_at - shift.starts_at)) / 60)::integer - shift.break_minutes)))::numeric / 60) * site.hourly_rate_cents)::integer
  from public.security_sites site
  join public.security_shifts shift
    on shift.organization_id = site.organization_id and shift.site_id = site.id
  where site.organization_id = p_organization_id
    and site.client_id = p_client_id
    and shift.status = 'completed'
    and shift.ends_at <= now()
    and shift.final_invoice_id is null
    and shift.starts_at >= (p_period_start::timestamp at time zone coalesce(nullif(site.timezone,''), 'Europe/Paris'))
    and shift.starts_at < ((p_period_end + 1)::timestamp at time zone coalesce(nullif(site.timezone,''), 'Europe/Paris'))
  group by site.id, site.name, site.hourly_rate_cents
  order by site.name;
end;
$$;

revoke all on function public.preview_security_final_invoice(uuid,uuid,date,date) from public;
grant execute on function public.preview_security_final_invoice(uuid,uuid,date,date) to authenticated;

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
  v_invoice_id uuid;
  v_invoice_number text;
  v_year integer := extract(year from current_date)::integer;
  v_sequence integer;
  v_subtotal integer := 0;
  v_tax integer := 0;
  v_total integer := 0;
  v_tax_bps integer := 0;
  v_terms integer := 30;
  v_issuer jsonb;
  v_client jsonb;
  v_line_count integer := 0;
  r record;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;
  if not public.organization_has_plan_feature(p_organization_id, 'security_final_billing') then
    raise exception 'La facturation définitive n’est pas incluse dans cette offre.';
  end if;
  if p_period_end < p_period_start then raise exception 'Période invalide.'; end if;

  select
    round(coalesce(o.security_default_vat_rate, 20) * 100)::integer,
    coalesce(o.security_payment_terms_days, 30),
    jsonb_build_object(
      'name', coalesce(o.public_name, o.name), 'logo_url', o.logo_url,
      'address', o.security_billing_address, 'postal_code', o.security_billing_postal_code,
      'city', o.security_billing_city, 'siret', o.security_billing_siret,
      'vat_number', o.security_billing_vat_number, 'email', o.security_billing_email,
      'phone', o.security_billing_phone, 'late_penalty_text', o.security_late_penalty_text,
      'tax_exemption_text', o.security_tax_exemption_text
    )
  into v_tax_bps, v_terms, v_issuer
  from public.organizations o
  where o.id = p_organization_id and o.business_type = 'securite';

  if coalesce(v_issuer->>'address','') = '' or coalesce(v_issuer->>'siret','') = '' then
    raise exception 'Complétez l’adresse et le SIRET dans Personnalisation avant d’émettre une facture.';
  end if;

  select jsonb_build_object(
    'company_name', c.company_name, 'contact_name', c.contact_name, 'email', c.email,
    'phone', c.phone, 'billing_address', c.billing_address, 'postal_code', c.postal_code,
    'city', c.city, 'siret', c.siret, 'vat_number', c.vat_number,
    'payment_terms_days', c.payment_terms_days
  ) into v_client
  from public.security_clients c
  where c.organization_id = p_organization_id and c.id = p_client_id and c.status <> 'archived';

  if v_client is null then raise exception 'Client introuvable.'; end if;
  if coalesce(v_client->>'billing_address','') = '' then
    raise exception 'Complétez l’adresse de facturation du client avant d’émettre la facture.';
  end if;

  -- Verrouille les vacations admissibles pour éviter une double émission simultanée.
  perform 1
  from public.security_shifts shift
  join public.security_sites site
    on site.organization_id = shift.organization_id and site.id = shift.site_id
  where shift.organization_id = p_organization_id
    and site.client_id = p_client_id
    and shift.status = 'completed'
    and shift.ends_at <= now()
    and shift.final_invoice_id is null
    and shift.starts_at >= (p_period_start::timestamp at time zone coalesce(nullif(site.timezone,''), 'Europe/Paris'))
    and shift.starts_at < ((p_period_end + 1)::timestamp at time zone coalesce(nullif(site.timezone,''), 'Europe/Paris'))
  for update of shift;

  insert into public.security_invoice_counters (organization_id, invoice_year, next_value)
  values (p_organization_id, v_year, 2)
  on conflict (organization_id, invoice_year)
  do update set next_value = public.security_invoice_counters.next_value + 1, updated_at = now()
  returning next_value - 1 into v_sequence;

  v_invoice_number := 'FAC-' || v_year::text || '-' || lpad(v_sequence::text, 6, '0');

  insert into public.security_invoices (
    organization_id, client_id, invoice_number, period_start, period_end, status,
    subtotal_cents, tax_rate_basis_points, tax_cents, total_cents, notes,
    issued_at, due_date, issuer_snapshot, client_snapshot, document_kind, source_mode, created_by
  ) values (
    p_organization_id, p_client_id, v_invoice_number, p_period_start, p_period_end, 'issued',
    0, v_tax_bps, 0, 0, nullif(trim(coalesce(p_notes,'')),''),
    now(), current_date + v_terms, v_issuer, v_client, 'invoice', 'completed', auth.uid()
  ) returning id into v_invoice_id;

  for r in
    select * from public.preview_security_final_invoice(p_organization_id, p_client_id, p_period_start, p_period_end)
  loop
    insert into public.security_invoice_lines (
      organization_id, invoice_id, site_id, description, scheduled_minutes, billed_minutes,
      shift_count, hourly_rate_cents, line_total_cents
    ) values (
      p_organization_id, v_invoice_id, r.site_id,
      'Vacations réalisées — ' || r.site_name, r.actual_minutes, r.actual_minutes,
      r.completed_shift_count, r.hourly_rate_cents, r.line_total_cents
    );
    v_subtotal := v_subtotal + r.line_total_cents;
    v_line_count := v_line_count + 1;
  end loop;

  if v_line_count = 0 then
    delete from public.security_invoices where id = v_invoice_id;
    raise exception 'Aucune vacation réalisée et non facturée sur cette période.';
  end if;

  insert into public.security_invoice_shift_items (
    organization_id, invoice_id, shift_id, site_id, agent_id, service_date,
    starts_at, ends_at, actual_minutes, hourly_rate_cents, line_total_cents, description
  )
  select
    p_organization_id, v_invoice_id, shift.id, shift.site_id, shift.agent_id,
    (shift.starts_at at time zone coalesce(nullif(site.timezone,''), 'Europe/Paris'))::date,
    shift.starts_at, shift.ends_at,
    coalesce(shift.actual_minutes, greatest(0, floor(extract(epoch from (shift.ends_at - shift.starts_at)) / 60)::integer - shift.break_minutes)),
    site.hourly_rate_cents,
    round((coalesce(shift.actual_minutes, greatest(0, floor(extract(epoch from (shift.ends_at - shift.starts_at)) / 60)::integer - shift.break_minutes))::numeric / 60) * site.hourly_rate_cents)::integer,
    coalesce(nullif(trim(shift.title),''), 'Mission de sécurité')
  from public.security_shifts shift
  join public.security_sites site on site.organization_id = shift.organization_id and site.id = shift.site_id
  where shift.organization_id = p_organization_id
    and site.client_id = p_client_id
    and shift.status = 'completed'
    and shift.ends_at <= now()
    and shift.final_invoice_id is null
    and shift.starts_at >= (p_period_start::timestamp at time zone coalesce(nullif(site.timezone,''), 'Europe/Paris'))
    and shift.starts_at < ((p_period_end + 1)::timestamp at time zone coalesce(nullif(site.timezone,''), 'Europe/Paris'));

  update public.security_shifts shift
  set final_invoice_id = v_invoice_id, updated_at = now()
  where shift.organization_id = p_organization_id
    and exists (
      select 1 from public.security_invoice_shift_items item
      where item.organization_id = p_organization_id and item.invoice_id = v_invoice_id and item.shift_id = shift.id
    );

  v_tax := round(v_subtotal::numeric * v_tax_bps / 10000)::integer;
  v_total := v_subtotal + v_tax;
  update public.security_invoices
  set subtotal_cents = v_subtotal, tax_cents = v_tax, total_cents = v_total, updated_at = now()
  where organization_id = p_organization_id and id = v_invoice_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'security.final_invoice_issued', 'security_invoice', v_invoice_id::text,
    jsonb_build_object('invoice_number', v_invoice_number, 'subtotal_cents', v_subtotal, 'tax_cents', v_tax, 'total_cents', v_total));

  return v_invoice_id;
end;
$$;

revoke all on function public.generate_security_final_invoice(uuid,uuid,date,date,text) from public;
grant execute on function public.generate_security_final_invoice(uuid,uuid,date,date,text) to authenticated;

-- Statuts communs : les préfactures gardent leur flux, les factures définitives sont immuables.
-- La signature existe déjà dans les versions précédentes avec un type de retour différent.
-- PostgreSQL exige de supprimer explicitement la fonction avant de modifier ses colonnes OUT.
drop function if exists public.set_security_invoice_status(uuid,uuid,text);

create function public.set_security_invoice_status(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_status text
)
returns table(status text, issued_at timestamptz, sent_at timestamptz, paid_at timestamptz, due_date date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
  v_kind text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;

  select i.status, i.document_kind into v_current, v_kind
  from public.security_invoices i
  where i.organization_id = p_organization_id and i.id = p_invoice_id
  for update;
  if not found then raise exception 'Document introuvable.'; end if;

  if v_kind = 'proforma' then
    if not ((v_current = 'draft' and p_status in ('issued','canceled')) or
            (v_current = 'issued' and p_status in ('paid','canceled')) or v_current = p_status) then
      raise exception 'Transition de statut non autorisée.';
    end if;
  else
    if p_status not in ('sent','paid','overdue') then
      raise exception 'Une facture émise ne peut pas être modifiée ou annulée depuis cet écran.';
    end if;
    if not ((v_current = 'issued' and p_status in ('sent','paid','overdue')) or
            (v_current = 'sent' and p_status in ('paid','overdue')) or
            (v_current = 'overdue' and p_status = 'paid') or v_current = p_status) then
      raise exception 'Transition de statut non autorisée.';
    end if;
  end if;

  update public.security_invoices i
  set status = p_status,
      issued_at = case when p_status in ('issued','sent','paid','overdue') then coalesce(i.issued_at, now()) else i.issued_at end,
      sent_at = case when p_status = 'sent' then coalesce(i.sent_at, now()) else i.sent_at end,
      paid_at = case when p_status = 'paid' then coalesce(i.paid_at, now()) else i.paid_at end,
      canceled_at = case when p_status = 'canceled' then coalesce(i.canceled_at, now()) else i.canceled_at end,
      updated_at = now()
  where i.organization_id = p_organization_id and i.id = p_invoice_id
  returning i.status, i.issued_at, i.sent_at, i.paid_at, i.due_date
  into status, issued_at, sent_at, paid_at, due_date;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'security.invoice_status_changed', 'security_invoice', p_invoice_id::text,
    jsonb_build_object('document_kind', v_kind, 'previous_status', v_current, 'new_status', p_status));
  return next;
end;
$$;

revoke all on function public.set_security_invoice_status(uuid,uuid,text) from public;
grant execute on function public.set_security_invoice_status(uuid,uuid,text) to authenticated;

-- Module documentaire accessible à toutes les offres Sécurité.
insert into public.module_catalog (
  module_key, display_name, description, category, icon_key,
  compatible_business_types, core_module, default_enabled, active, sort_order
) values (
  'security_document_branding', 'Personnalisation documents Sécurité',
  'Logo et profil de facturation utilisés sur les plannings, mains courantes et factures.',
  'securite', 'sparkles', '{securite}', false, true, true, 557
)
on conflict (module_key) do update
set display_name = excluded.display_name, description = excluded.description, category = excluded.category,
    icon_key = excluded.icon_key, compatible_business_types = excluded.compatible_business_types,
    default_enabled = excluded.default_enabled, active = excluded.active, sort_order = excluded.sort_order,
    updated_at = now();

insert into public.organization_modules (organization_id, module_key, enabled)
select o.id, 'security_document_branding', true
from public.organizations o
where o.business_type = 'securite'
on conflict (organization_id, module_key) do update set enabled = true, updated_at = now();

select pg_notify('pgrst', 'reload schema');
commit;
