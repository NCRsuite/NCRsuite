import { createClient } from 'npm:@supabase/supabase-js@2.110.2';

type SendRequest = {
  organization_id: string;
  document_kind: 'invoice' | 'quote';
  document_id: string;
  recipient_email: string;
  recipient_name?: string | null;
  subject: string;
  message: string;
  filename: string;
  pdf_base64: string;
  copy_sender?: boolean;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function emailIsValid(value: string) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value);
}

function safeColor(value: unknown) {
  const color = String(value ?? '');
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#0A84FF';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL');
  const defaultSenderName = Deno.env.get('BREVO_SENDER_NAME') || 'NCR Suite';
  if (!supabaseUrl || !serviceRoleKey || !brevoApiKey || !senderEmail) {
    return new Response(JSON.stringify({ error: 'Configuration Brevo ou Supabase incomplète.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return new Response(JSON.stringify({ error: 'Session utilisateur absente.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await service.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Session utilisateur invalide.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let input: SendRequest;
  try {
    input = await request.json() as SendRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Corps de requête invalide.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const recipientEmail = String(input.recipient_email ?? '').trim().toLowerCase();
  const subject = String(input.subject ?? '').trim().slice(0, 180);
  const message = String(input.message ?? '').trim().slice(0, 5000);
  const filename = String(input.filename ?? 'document.pdf').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 160);
  const pdfBase64 = String(input.pdf_base64 ?? '').replace(/^data:application\/pdf;base64,/, '');

  if (!input.organization_id || !input.document_id || !['invoice', 'quote'].includes(input.document_kind)) {
    return new Response(JSON.stringify({ error: 'Document invalide.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (!emailIsValid(recipientEmail)) {
    return new Response(JSON.stringify({ error: 'Adresse e-mail du destinataire invalide.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (!subject || !message || !pdfBase64) {
    return new Response(JSON.stringify({ error: 'Objet, message et PDF sont obligatoires.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (pdfBase64.length > 14_000_000) {
    return new Response(JSON.stringify({ error: 'Le PDF est trop volumineux pour être envoyé.' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: membership, error: membershipError } = await service
    .from('organization_members')
    .select('role,status')
    .eq('organization_id', input.organization_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (membershipError || !membership || !['owner', 'admin', 'manager'].includes(String(membership.role))) {
    return new Response(JSON.stringify({ error: 'Accès insuffisant pour envoyer ce document.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: organization, error: organizationError } = await service
    .from('organizations')
    .select('id,name,public_name,business_type,primary_color,logo_url,security_billing_email,security_billing_phone')
    .eq('id', input.organization_id)
    .eq('business_type', 'securite')
    .maybeSingle();
  if (organizationError || !organization) {
    return new Response(JSON.stringify({ error: 'Espace Sécurité introuvable.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let documentNumber = '';
  if (input.document_kind === 'invoice') {
    const { data: invoice, error: invoiceError } = await service
      .from('security_invoices')
      .select('id,invoice_number,document_kind,status')
      .eq('organization_id', input.organization_id)
      .eq('id', input.document_id)
      .eq('document_kind', 'invoice')
      .maybeSingle();
    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: 'Facture définitive introuvable.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    documentNumber = String(invoice.invoice_number);
  } else {
    const { data: quote, error: quoteError } = await service
      .from('security_quotes')
      .select('id,quote_number,status')
      .eq('organization_id', input.organization_id)
      .eq('id', input.document_id)
      .maybeSingle();
    if (quoteError || !quote) {
      return new Response(JSON.stringify({ error: 'Devis introuvable.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    documentNumber = String(quote.quote_number);
  }

  const { data: logRow, error: logError } = await service.from('security_document_email_logs').insert({
    organization_id: input.organization_id,
    document_kind: input.document_kind,
    document_id: input.document_id,
    recipient_email: recipientEmail,
    recipient_name: input.recipient_name || null,
    subject,
    message,
    status: 'sending',
    created_by: user.id,
  }).select('id').single();
  if (logError || !logRow) {
    return new Response(JSON.stringify({ error: logError?.message || 'Historique d’envoi impossible.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const organizationName = String(organization.public_name || organization.name || defaultSenderName);
  const accent = safeColor(organization.primary_color);
  const logo = /^https:\/\//i.test(String(organization.logo_url || ''))
    ? `<img src="${escapeHtml(organization.logo_url)}" alt="${escapeHtml(organizationName)}" style="max-width:170px;max-height:70px;object-fit:contain;margin-bottom:20px">`
    : '';
  const contact = [organization.security_billing_email, organization.security_billing_phone].filter(Boolean).map(escapeHtml).join(' · ');
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;background:#f5f5f7"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 12px 35px rgba(0,0,0,.08)">
<tr><td style="height:8px;background:${accent}"></td></tr>
<tr><td style="padding:34px 32px 18px">${logo}<div style="font-size:12px;letter-spacing:.12em;font-weight:800;color:${accent}">${input.document_kind === 'invoice' ? 'FACTURE' : 'DEVIS'} · ${escapeHtml(documentNumber)}</div><h1 style="font-size:27px;line-height:1.2;margin:10px 0 16px">${escapeHtml(subject)}</h1><p style="font-size:16px;line-height:1.7;color:#515154;white-space:pre-line;margin:0">${escapeHtml(message)}</p></td></tr>
<tr><td style="padding:8px 32px 28px"><div style="display:inline-block;background:${accent};color:#fff;font-weight:700;padding:13px 22px;border-radius:999px">PDF joint à cet e-mail</div></td></tr>
<tr><td style="padding:22px 32px 32px;border-top:1px solid #ededf0;color:#86868b;font-size:13px;line-height:1.6">${contact ? `Contact : ${contact}<br>` : ''}E-mail envoyé par ${escapeHtml(organizationName)} via NCR Suite.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${subject}\n\n${message}\n\nLe document ${documentNumber} est joint à cet e-mail.${contact ? `\n\nContact : ${[organization.security_billing_email, organization.security_billing_phone].filter(Boolean).join(' · ')}` : ''}`;

  try {
    const recipients = [{ email: recipientEmail, name: input.recipient_name || undefined }];
    const payload: Record<string, unknown> = {
      sender: { name: organizationName.slice(0, 70), email: senderEmail },
      to: recipients,
      subject,
      htmlContent: html,
      textContent: text,
      replyTo: organization.security_billing_email && emailIsValid(String(organization.security_billing_email))
        ? { email: String(organization.security_billing_email) }
        : undefined,
      attachment: [{ name: filename || `${documentNumber}.pdf`, content: pdfBase64 }],
      tags: ['ncr-suite', `security-${input.document_kind}`],
    };
    if (input.copy_sender && organization.security_billing_email && emailIsValid(String(organization.security_billing_email)) && String(organization.security_billing_email).toLowerCase() !== recipientEmail) {
      payload.cc = [{ email: String(organization.security_billing_email) }];
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Brevo ${response.status}: ${JSON.stringify(responseBody).slice(0, 800)}`);

    const sentAt = new Date().toISOString();
    const messageId = String(responseBody.messageId || '');
    await service.from('security_document_email_logs').update({ status: 'sent', provider_message_id: messageId, sent_at: sentAt, last_error: null }).eq('id', logRow.id);
    if (input.document_kind === 'invoice') {
      await service.from('security_invoices').update({ status: 'sent', sent_at: sentAt, updated_at: sentAt }).eq('organization_id', input.organization_id).eq('id', input.document_id).in('status', ['issued', 'sent', 'overdue']);
    } else {
      await service.from('security_quotes').update({ status: 'sent', sent_at: sentAt, updated_at: sentAt }).eq('organization_id', input.organization_id).eq('id', input.document_id).in('status', ['draft', 'sent']);
    }
    await service.from('audit_logs').insert({ organization_id: input.organization_id, user_id: user.id, action: `security.${input.document_kind}_emailed`, entity_type: `security_${input.document_kind}`, entity_id: input.document_id, metadata: { recipient_email: recipientEmail, provider_message_id: messageId } });

    return new Response(JSON.stringify({ success: true, message_id: messageId, sent_at: sentAt }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (caught) {
    const errorMessage = caught instanceof Error ? caught.message : String(caught);
    await service.from('security_document_email_logs').update({ status: 'failed', last_error: errorMessage.slice(0, 2000) }).eq('id', logRow.id);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
