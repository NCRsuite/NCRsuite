-- NCR Suite V2.5.3 — Correctif scan QR & facturation Sécurité
-- À exécuter après 029_security_logbook_by_shift.sql.

begin;

-- La facturation programmée reste incluse dans toutes les offres Sécurité.
update public.domain_plan_catalog
set features = coalesce(features, '{}'::jsonb) || '{"security_scheduled_billing":true}'::jsonb,
    updated_at = now()
where business_type = 'securite'
  and plan_key in ('decouverte','essentielle','professionnelle','metier');

insert into public.organization_modules (organization_id, module_key, enabled)
select o.id, 'security_billing', true
from public.organizations o
where o.business_type = 'securite'
  and o.plan <> 'metier'
on conflict (organization_id, module_key)
do update set enabled = true, updated_at = now();

-- Un aperçu serveur unique évite les écarts entre l’écran et la préfacture générée.
create or replace function public.preview_security_invoice(
  p_organization_id uuid,
  p_client_id uuid,
  p_period_start date,
  p_period_end date
)
returns table (
  site_id uuid,
  site_name text,
  scheduled_minutes integer,
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

  if not public.organization_has_plan_feature(p_organization_id, 'security_scheduled_billing') then
    raise exception 'La facturation Sécurité n’est pas incluse dans cette offre.';
  end if;

  if p_period_end < p_period_start then
    raise exception 'La date de fin doit être postérieure ou égale à la date de début.';
  end if;

  if not exists (
    select 1
    from public.security_clients c
    where c.organization_id = p_organization_id
      and c.id = p_client_id
      and c.status <> 'archived'
  ) then
    raise exception 'Client introuvable.';
  end if;

  return query
  select
    s.id,
    s.name,
    sum(
      greatest(
        0,
        floor(extract(epoch from (sh.ends_at - sh.starts_at)) / 60)::integer - sh.break_minutes
      )
    )::integer as scheduled_minutes,
    s.hourly_rate_cents,
    round(
      (
        sum(
          greatest(
            0,
            floor(extract(epoch from (sh.ends_at - sh.starts_at)) / 60)::integer - sh.break_minutes
          )
        )::numeric / 60
      ) * s.hourly_rate_cents
    )::integer as line_total_cents
  from public.security_sites s
  join public.security_shifts sh
    on sh.organization_id = s.organization_id
   and sh.site_id = s.id
  where s.organization_id = p_organization_id
    and s.client_id = p_client_id
    and s.status <> 'archived'
    and sh.status <> 'canceled'
    and sh.starts_at >= (p_period_start::timestamp at time zone coalesce(nullif(s.timezone, ''), 'Europe/Paris'))
    and sh.starts_at < ((p_period_end + 1)::timestamp at time zone coalesce(nullif(s.timezone, ''), 'Europe/Paris'))
  group by s.id, s.name, s.hourly_rate_cents
  having sum(
    greatest(
      0,
      floor(extract(epoch from (sh.ends_at - sh.starts_at)) / 60)::integer - sh.break_minutes
    )
  ) > 0
  order by s.name;
end;
$$;

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
  r record;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;

  if not public.organization_has_plan_feature(p_organization_id, 'security_scheduled_billing') then
    raise exception 'La facturation Sécurité n’est pas incluse dans cette offre.';
  end if;

  if p_period_end < p_period_start then
    raise exception 'La date de fin doit être postérieure ou égale à la date de début.';
  end if;

  if not exists (
    select 1
    from public.security_clients c
    where c.organization_id = p_organization_id
      and c.id = p_client_id
      and c.status <> 'archived'
  ) then
    raise exception 'Client introuvable.';
  end if;

  select i.id, i.invoice_number, i.status
  into v_invoice_id, v_invoice_number, v_existing_status
  from public.security_invoices i
  where i.organization_id = p_organization_id
    and i.client_id = p_client_id
    and i.period_start = p_period_start
    and i.period_end = p_period_end
    and i.status <> 'canceled'
  order by i.created_at desc
  limit 1
  for update;

  if found then
    if v_existing_status <> 'draft' then
      raise exception 'La préfacture % est déjà % et ne peut plus être recalculée.',
        v_invoice_number,
        case v_existing_status when 'issued' then 'émise' when 'paid' then 'payée' else v_existing_status end;
    end if;

    delete from public.security_invoice_lines l
    where l.organization_id = p_organization_id
      and l.invoice_id = v_invoice_id;

    update public.security_invoices i
    set notes = nullif(trim(coalesce(p_notes, '')), ''),
        subtotal_cents = 0,
        total_cents = 0,
        updated_at = now()
    where i.organization_id = p_organization_id
      and i.id = v_invoice_id;
  else
    v_seq := nextval('public.security_invoice_number_seq');
    v_invoice_number := 'SEC-' || to_char(current_date, 'YYYY') || '-' || lpad(v_seq::text, 6, '0');

    insert into public.security_invoices (
      organization_id,
      client_id,
      invoice_number,
      period_start,
      period_end,
      status,
      notes,
      created_by
    ) values (
      p_organization_id,
      p_client_id,
      v_invoice_number,
      p_period_start,
      p_period_end,
      'draft',
      nullif(trim(coalesce(p_notes, '')), ''),
      auth.uid()
    )
    returning id into v_invoice_id;
  end if;

  for r in
    select *
    from public.preview_security_invoice(
      p_organization_id,
      p_client_id,
      p_period_start,
      p_period_end
    )
  loop
    insert into public.security_invoice_lines (
      organization_id,
      invoice_id,
      site_id,
      description,
      scheduled_minutes,
      hourly_rate_cents,
      line_total_cents
    ) values (
      p_organization_id,
      v_invoice_id,
      r.site_id,
      'Heures de sécurité programmées — ' || r.site_name,
      r.scheduled_minutes,
      r.hourly_rate_cents,
      r.line_total_cents
    );

    v_total := v_total + r.line_total_cents;
    v_line_count := v_line_count + 1;
  end loop;

  if v_line_count = 0 then
    raise exception 'Aucune heure programmée facturable sur cette période.';
  end if;

  update public.security_invoices i
  set subtotal_cents = v_total,
      total_cents = v_total,
      updated_at = now()
  where i.organization_id = p_organization_id
    and i.id = v_invoice_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    case when v_existing_status = 'draft' then 'security.invoice_recalculated' else 'security.invoice_generated' end,
    'security_invoice',
    v_invoice_id::text,
    jsonb_build_object(
      'client_id', p_client_id,
      'period_start', p_period_start,
      'period_end', p_period_end,
      'total_cents', v_total,
      'line_count', v_line_count
    )
  );

  return v_invoice_id;
end;
$$;

create or replace function public.set_security_invoice_status(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_status text
)
returns table(status text, issued_at timestamptz, paid_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id, array['owner','admin','manager']) then
    raise exception 'Accès insuffisant.';
  end if;

  if p_status not in ('issued','paid','canceled') then
    raise exception 'Statut de facture invalide.';
  end if;

  select i.status
  into v_current_status
  from public.security_invoices i
  where i.organization_id = p_organization_id
    and i.id = p_invoice_id
  for update;

  if not found then
    raise exception 'Préfacture introuvable.';
  end if;

  if not (
    (v_current_status = 'draft' and p_status in ('issued','canceled'))
    or (v_current_status = 'issued' and p_status in ('paid','canceled'))
    or (v_current_status = p_status)
  ) then
    raise exception 'Transition de statut non autorisée : % vers %.', v_current_status, p_status;
  end if;

  return query
  update public.security_invoices i
  set status = p_status,
      issued_at = case
        when p_status in ('issued','paid') then coalesce(i.issued_at, now())
        else i.issued_at
      end,
      paid_at = case
        when p_status = 'paid' then coalesce(i.paid_at, now())
        else i.paid_at
      end,
      updated_at = now()
  where i.organization_id = p_organization_id
    and i.id = p_invoice_id
  returning i.status, i.issued_at, i.paid_at;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'security.invoice_status_changed',
    'security_invoice',
    p_invoice_id::text,
    jsonb_build_object('previous_status', v_current_status, 'new_status', p_status)
  );
end;
$$;

-- Les responsables doivent pouvoir relire les préfactures et leurs lignes.
drop policy if exists security_invoices_member_select on public.security_invoices;
create policy security_invoices_member_select
on public.security_invoices
for select
using (public.is_security_manager(organization_id));

drop policy if exists security_invoice_lines_member_select on public.security_invoice_lines;
create policy security_invoice_lines_member_select
on public.security_invoice_lines
for select
using (public.is_security_manager(organization_id));

revoke all on function public.preview_security_invoice(uuid,uuid,date,date) from public;
revoke all on function public.generate_security_invoice(uuid,uuid,date,date,text) from public;
revoke all on function public.set_security_invoice_status(uuid,uuid,text) from public;

grant execute on function public.preview_security_invoice(uuid,uuid,date,date) to authenticated;
grant execute on function public.generate_security_invoice(uuid,uuid,date,date,text) to authenticated;
grant execute on function public.set_security_invoice_status(uuid,uuid,text) to authenticated;

notify pgrst, 'reload schema';

commit;
