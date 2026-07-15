-- NCR Suite V2.5.4 — Validation QR, accès PDF et sites de facturation
begin;

-- La précédente fonction utilisait des noms de colonnes identiques aux colonnes
-- de sortie de la fonction. PostgreSQL pouvait alors lever une ambiguïté au moment
-- du premier scan. La validation est désormais explicite et idempotente.
create or replace function public.record_security_patrol_scan(
  p_organization_id uuid,
  p_patrol_id uuid,
  p_qr_code text
)
returns table (
  point_id uuid,
  point_label text,
  scanned_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_id uuid;
  v_site_id uuid;
  v_point_id uuid;
  v_point_label text;
  v_scan_time timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not public.organization_has_plan_feature(p_organization_id, 'security_qr_patrols') then
    raise exception 'Les rondes QR nécessitent l’offre Essentielle.';
  end if;

  v_agent_id := public.current_security_agent_id(p_organization_id);

  select patrol.site_id
  into v_site_id
  from public.security_patrols patrol
  where patrol.organization_id = p_organization_id
    and patrol.id = p_patrol_id
    and patrol.status = 'in_progress'
    and (
      patrol.agent_id = v_agent_id
      or public.is_security_manager(p_organization_id)
    )
  limit 1;

  if v_site_id is null then
    raise exception 'Ronde en cours introuvable ou non autorisée.';
  end if;

  select point.id, point.label
  into v_point_id, v_point_label
  from public.security_patrol_points point
  where point.organization_id = p_organization_id
    and point.site_id = v_site_id
    and point.qr_code = trim(coalesce(p_qr_code, ''))
    and point.status = 'active'
  limit 1;

  if v_point_id is null then
    raise exception 'Point de ronde QR inconnu pour ce site.';
  end if;

  update public.security_patrol_scans scan
  set scanned_at = now(),
      status = 'valid'
  where scan.organization_id = p_organization_id
    and scan.patrol_id = p_patrol_id
    and scan.point_id = v_point_id
  returning scan.scanned_at into v_scan_time;

  if not found then
    insert into public.security_patrol_scans as inserted_scan (
      organization_id,
      patrol_id,
      point_id,
      status
    ) values (
      p_organization_id,
      p_patrol_id,
      v_point_id,
      'valid'
    )
    returning inserted_scan.scanned_at into v_scan_time;
  end if;

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_organization_id,
    auth.uid(),
    'security.patrol_point_scanned',
    'security_patrol',
    p_patrol_id::text,
    jsonb_build_object(
      'point_id', v_point_id,
      'site_id', v_site_id,
      'scanned_at', v_scan_time
    )
  );

  return query
  select v_point_id, v_point_label, v_scan_time;
end;
$$;

-- Tous les sites actifs rattachés au client sont désormais renvoyés dans
-- l’aperçu, y compris ceux qui n’ont aucune mission sur la période. Cela permet
-- de voir immédiatement qu’un nouveau site est bien rattaché, sans le facturer
-- tant qu’aucune heure n’y est programmée.
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
    from public.security_clients client
    where client.organization_id = p_organization_id
      and client.id = p_client_id
      and client.status <> 'archived'
  ) then
    raise exception 'Client introuvable.';
  end if;

  return query
  select
    site.id,
    site.name,
    coalesce(
      sum(
        case
          when shift.id is null then 0
          else greatest(
            0,
            floor(extract(epoch from (shift.ends_at - shift.starts_at)) / 60)::integer - shift.break_minutes
          )
        end
      ),
      0
    )::integer as scheduled_minutes,
    site.hourly_rate_cents,
    round(
      (
        coalesce(
          sum(
            case
              when shift.id is null then 0
              else greatest(
                0,
                floor(extract(epoch from (shift.ends_at - shift.starts_at)) / 60)::integer - shift.break_minutes
              )
            end
          ),
          0
        )::numeric / 60
      ) * site.hourly_rate_cents
    )::integer as line_total_cents
  from public.security_sites site
  left join public.security_shifts shift
    on shift.organization_id = site.organization_id
   and shift.site_id = site.id
   and shift.status <> 'canceled'
   and shift.starts_at >= (
     p_period_start::timestamp at time zone coalesce(nullif(site.timezone, ''), 'Europe/Paris')
   )
   and shift.starts_at < (
     (p_period_end + 1)::timestamp at time zone coalesce(nullif(site.timezone, ''), 'Europe/Paris')
   )
  where site.organization_id = p_organization_id
    and site.client_id = p_client_id
    and site.status = 'active'
  group by site.id, site.name, site.hourly_rate_cents
  order by site.name;
end;
$$;

-- La génération reprend le même aperçu, mais ne crée des lignes que pour les
-- sites possédant réellement des heures programmées.
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
    raise exception 'La facturation Sécurité n’est pas incluse dans cette offre.';
  end if;

  if p_period_end < p_period_start then
    raise exception 'La date de fin doit être postérieure ou égale à la date de début.';
  end if;

  if not exists (
    select 1
    from public.security_clients client
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
          when 'paid' then 'payée'
          else v_existing_status
        end;
    end if;

    delete from public.security_invoice_lines line
    where line.organization_id = p_organization_id
      and line.invoice_id = v_invoice_id;

    update public.security_invoices invoice
    set notes = nullif(trim(coalesce(p_notes, '')), ''),
        subtotal_cents = 0,
        total_cents = 0,
        updated_at = now()
    where invoice.organization_id = p_organization_id
      and invoice.id = v_invoice_id;
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

  for invoice_line in
    select *
    from public.preview_security_invoice(
      p_organization_id,
      p_client_id,
      p_period_start,
      p_period_end
    )
    where scheduled_minutes > 0
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
      invoice_line.site_id,
      'Heures de sécurité programmées — ' || invoice_line.site_name,
      invoice_line.scheduled_minutes,
      invoice_line.hourly_rate_cents,
      invoice_line.line_total_cents
    );

    v_total := v_total + invoice_line.line_total_cents;
    v_line_count := v_line_count + 1;
  end loop;

  if v_line_count = 0 then
    raise exception 'Aucune heure programmée facturable sur cette période.';
  end if;

  update public.security_invoices invoice
  set subtotal_cents = v_total,
      total_cents = v_total,
      updated_at = now()
  where invoice.organization_id = p_organization_id
    and invoice.id = v_invoice_id;

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_organization_id,
    auth.uid(),
    case
      when v_existing_status = 'draft' then 'security.invoice_recalculated'
      else 'security.invoice_generated'
    end,
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

revoke all on function public.record_security_patrol_scan(uuid,uuid,text) from public;
revoke all on function public.preview_security_invoice(uuid,uuid,date,date) from public;
revoke all on function public.generate_security_invoice(uuid,uuid,date,date,text) from public;

grant execute on function public.record_security_patrol_scan(uuid,uuid,text) to authenticated;
grant execute on function public.preview_security_invoice(uuid,uuid,date,date) to authenticated;
grant execute on function public.generate_security_invoice(uuid,uuid,date,date,text) to authenticated;

notify pgrst, 'reload schema';

commit;
