-- NCR Suite V2.15.1 — Formation : documents premium et envois Brevo commerciaux
-- À exécuter après 070_training_unified_workflow.sql.

begin;

alter table public.training_commercial_documents
  add column if not exists generated_document_path text,
  add column if not exists generated_document_name text,
  add column if not exists generated_at timestamptz,
  add column if not exists email_queued_at timestamptz,
  add column if not exists emailed_at timestamptz,
  add column if not exists last_email_recipient text,
  add column if not exists last_email_outbox_id uuid references public.email_outbox(id) on delete set null;

alter table public.training_commercial_documents
  drop constraint if exists training_commercial_generated_path_length_check,
  add constraint training_commercial_generated_path_length_check
    check (generated_document_path is null or char_length(generated_document_path) <= 1200),
  drop constraint if exists training_commercial_generated_name_length_check,
  add constraint training_commercial_generated_name_length_check
    check (generated_document_name is null or char_length(generated_document_name) <= 255),
  drop constraint if exists training_commercial_email_recipient_length_check,
  add constraint training_commercial_email_recipient_length_check
    check (last_email_recipient is null or char_length(last_email_recipient) <= 254);

create index if not exists idx_training_commercial_email_status
  on public.training_commercial_documents(organization_id, emailed_at desc nulls last, email_queued_at desc nulls last);

alter table public.email_outbox drop constraint if exists email_outbox_template_key_check;
alter table public.email_outbox add constraint email_outbox_template_key_check check (template_key in (
  'customer_pending','customer_confirmed','customer_rescheduled','customer_cancelled','customer_reminder',
  'business_new_booking','business_rescheduled','business_cancelled','team_invitation',
  'training_convocation','training_attestation','training_satisfaction_request','training_commercial_document',
  'security_client_portal_invitation','cleaning_client_portal_invitation','coiffure_client_portal_invitation'
));

create or replace function public.queue_training_commercial_document_email(
  p_organization_id uuid,
  p_document_id uuid,
  p_recipient_kind text,
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
  v_document public.training_commercial_documents%rowtype;
  v_organization public.organizations%rowtype;
  v_customer public.training_customers%rowtype;
  v_funder public.training_funders%rowtype;
  v_trainee public.training_trainees%rowtype;
  v_program public.training_programs%rowtype;
  v_recipient_email text;
  v_recipient_name text;
  v_outbox_id uuid;
  v_dedupe_key text;
  v_status text;
  v_expected_prefix text;
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin','manager'])
     or not public.organization_has_plan_feature(p_organization_id, 'training_commercial') then
    raise exception 'Accès insuffisant pour envoyer ce document.';
  end if;

  if p_recipient_kind not in ('customer','trainee','funder') then
    raise exception 'Destinataire invalide.';
  end if;

  select * into v_document
  from public.training_commercial_documents
  where organization_id = p_organization_id and id = p_document_id;
  if v_document.id is null then raise exception 'Document commercial introuvable.'; end if;

  select * into v_organization
  from public.organizations
  where id = p_organization_id and business_type = 'formation';
  if v_organization.id is null then raise exception 'Organisme de formation introuvable.'; end if;

  if v_document.program_id is not null then
    select * into v_program
    from public.training_programs
    where organization_id = p_organization_id and id = v_document.program_id;
  end if;

  if p_recipient_kind = 'customer' then
    if v_document.customer_id is null then raise exception 'Aucun client n’est rattaché à ce document.'; end if;
    select * into v_customer from public.training_customers
    where organization_id = p_organization_id and id = v_document.customer_id and status <> 'archived';
    v_recipient_email := lower(trim(coalesce(v_customer.email, '')));
    v_recipient_name := coalesce(nullif(trim(coalesce(v_customer.contact_name, '')), ''), v_customer.legal_name);
  elsif p_recipient_kind = 'trainee' then
    if v_document.trainee_id is null then raise exception 'Aucun stagiaire n’est rattaché à ce document.'; end if;
    select * into v_trainee from public.training_trainees
    where organization_id = p_organization_id and id = v_document.trainee_id and status = 'active';
    v_recipient_email := lower(trim(coalesce(v_trainee.email, '')));
    v_recipient_name := trim(concat(v_trainee.first_name, ' ', v_trainee.last_name));
  else
    if v_document.funder_id is null then raise exception 'Aucun financeur n’est rattaché à ce document.'; end if;
    select * into v_funder from public.training_funders
    where organization_id = p_organization_id and id = v_document.funder_id and status <> 'archived';
    v_recipient_email := lower(trim(coalesce(v_funder.email, '')));
    v_recipient_name := coalesce(nullif(trim(coalesce(v_funder.contact_name, '')), ''), v_funder.name);
  end if;

  if v_recipient_email is null
     or v_recipient_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'Le destinataire choisi n’a pas d’adresse e-mail valide.';
  end if;

  v_expected_prefix := p_organization_id::text || '/commercial/generated/' || p_document_id::text || '/';
  if nullif(trim(coalesce(p_attachment_path, '')), '') is null
     or position(v_expected_prefix in trim(p_attachment_path)) <> 1 then
    raise exception 'Chemin de pièce jointe invalide.';
  end if;

  if nullif(trim(coalesce(p_attachment_name, '')), '') is null
     or lower(trim(p_attachment_name)) not like '%.pdf'
     or char_length(trim(p_attachment_name)) > 255 then
    raise exception 'Nom de pièce jointe invalide.';
  end if;

  v_dedupe_key := 'training-commercial:' || p_document_id::text || ':' || p_recipient_kind || ':' || md5(trim(p_attachment_path));

  insert into public.email_outbox (
    organization_id, appointment_id, template_key, recipient_email, recipient_name,
    payload, dedupe_key, status, scheduled_for, attempts, locked_at, sent_at,
    provider_message_id, last_error
  ) values (
    p_organization_id, null, 'training_commercial_document', v_recipient_email, v_recipient_name,
    jsonb_build_object(
      'commercial_document_id', v_document.id,
      'document_type', v_document.document_type,
      'document_reference', v_document.reference,
      'document_title', v_document.title,
      'document_status', v_document.status,
      'issue_date', v_document.issue_date,
      'valid_until', v_document.valid_until,
      'participant_count', v_document.participant_count,
      'amount_excl_tax_cents', v_document.amount_excl_tax_cents,
      'amount_incl_tax_cents', v_document.amount_incl_tax_cents,
      'program_title', coalesce(v_program.title, v_document.training_summary, v_document.title),
      'customer_name', coalesce(v_customer.legal_name, ''),
      'funder_name', coalesce(v_funder.name, ''),
      'trainee_name', trim(concat(v_trainee.first_name, ' ', v_trainee.last_name)),
      'recipient_kind', p_recipient_kind,
      'organization_name', coalesce(v_organization.public_name, v_organization.name),
      'organization_logo_url', v_organization.logo_url,
      'organization_primary_color', v_organization.primary_color,
      'organization_address', concat_ws(' ', v_organization.company_address, v_organization.company_postal_code, v_organization.company_city),
      'contact_email', coalesce(v_organization.training_reply_to_email, v_organization.company_email),
      'contact_phone', v_organization.company_phone,
      'reply_to_email', coalesce(v_organization.training_reply_to_email, v_organization.company_email),
      'return_instructions', case
        when coalesce(v_organization.training_reply_to_email, v_organization.company_email) is not null
          then 'Merci de retourner le document signé à ' || coalesce(v_organization.training_reply_to_email, v_organization.company_email) || '.'
        else 'Merci de contacter l’organisme pour le retour du document signé.'
      end,
      'show_ncr_branding', v_organization.show_ncr_branding,
      'attachment_bucket', 'training-documents',
      'attachment_path', trim(p_attachment_path),
      'attachment_name', trim(p_attachment_name)
    ),
    v_dedupe_key, 'pending', now(), 0, null, null, null, null
  )
  on conflict (dedupe_key) do update set
    recipient_email = excluded.recipient_email,
    recipient_name = excluded.recipient_name,
    payload = excluded.payload,
    status = case
      when p_force or public.email_outbox.status in ('failed','cancelled','sent') then 'pending'
      else public.email_outbox.status
    end,
    scheduled_for = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then now() else public.email_outbox.scheduled_for end,
    attempts = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then 0 else public.email_outbox.attempts end,
    locked_at = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then null else public.email_outbox.locked_at end,
    sent_at = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then null else public.email_outbox.sent_at end,
    provider_message_id = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then null else public.email_outbox.provider_message_id end,
    last_error = case when p_force or public.email_outbox.status in ('failed','cancelled','sent') then null else public.email_outbox.last_error end,
    updated_at = now()
  returning id, status into v_outbox_id, v_status;

  update public.training_commercial_documents
  set generated_document_path = trim(p_attachment_path),
      generated_document_name = trim(p_attachment_name),
      generated_at = now(),
      email_queued_at = now(),
      last_email_recipient = v_recipient_email,
      last_email_outbox_id = v_outbox_id,
      status = case when status = 'draft' then 'sent' else status end,
      sent_at = coalesce(sent_at, now()),
      updated_at = now()
  where organization_id = p_organization_id and id = p_document_id;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.commercial_email_queued', 'training_commercial_document', p_document_id::text,
    jsonb_build_object('recipient_kind', p_recipient_kind, 'recipient_email', v_recipient_email,
                       'outbox_id', v_outbox_id, 'attachment_path', p_attachment_path)
  );

  return jsonb_build_object(
    'outbox_id', v_outbox_id,
    'status', v_status,
    'recipient_email', v_recipient_email,
    'recipient_name', v_recipient_name
  );
end;
$$;

revoke all on function public.queue_training_commercial_document_email(uuid,uuid,text,text,text,boolean) from public, anon;
grant execute on function public.queue_training_commercial_document_email(uuid,uuid,text,text,text,boolean) to authenticated;

create or replace function public.update_training_document_branding(
  p_organization_id uuid,
  p_signature_url text,
  p_stamp_url text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.organizations;
  v_signature text := nullif(trim(coalesce(p_signature_url, '')), '');
  v_stamp text := nullif(trim(coalesce(p_stamp_url, '')), '');
begin
  if auth.uid() is null
     or not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Accès insuffisant pour modifier l’identité documentaire.';
  end if;

  if (v_signature is not null and (char_length(v_signature) > 1200 or v_signature !~* '^https?://'))
     or (v_stamp is not null and (char_length(v_stamp) > 1200 or v_stamp !~* '^https?://')) then
    raise exception 'Adresse d’image invalide.';
  end if;

  update public.organizations
  set training_signature_url = v_signature,
      training_stamp_url = v_stamp,
      updated_at = now()
  where id = p_organization_id
    and business_type = 'formation'
  returning * into v_result;

  if v_result.id is null then raise exception 'Organisme de formation introuvable.'; end if;

  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id, auth.uid(), 'training.document_branding_updated', 'organization', p_organization_id::text,
    jsonb_build_object('signature_configured', v_signature is not null, 'stamp_configured', v_stamp is not null)
  );

  return v_result;
end;
$$;

revoke all on function public.update_training_document_branding(uuid,text,text) from public, anon;
grant execute on function public.update_training_document_branding(uuid,text,text) to authenticated;

insert into public.platform_release_state (
  singleton, database_version, expected_frontend_version, expected_pwa_cache,
  installed_at, installed_by, notes
)
values (
  true,
  '2.15.1',
  '2.15.1',
  'ncr-suite-shell-v2.15.1-training-documents',
  now(),
  auth.uid(),
  'Formation : moteur documentaire premium commun, programmes PDF et envoi Brevo des devis, conventions et contrats.'
)
on conflict(singleton) do update set
  database_version = excluded.database_version,
  expected_frontend_version = excluded.expected_frontend_version,
  expected_pwa_cache = excluded.expected_pwa_cache,
  installed_at = excluded.installed_at,
  installed_by = excluded.installed_by,
  notes = excluded.notes;

commit;

select pg_notify('pgrst', 'reload schema');
