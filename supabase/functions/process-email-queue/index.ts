import { createClient } from 'npm:@supabase/supabase-js@2.110.2';

type OutboxItem = {
  id: string;
  appointment_id: string | null;
  template_key: string;
  recipient_email: string;
  recipient_name: string | null;
  payload: Record<string, unknown>;
  attempts: number;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ncr-suite-secret',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeColor(value: unknown): string {
  const color = String(value ?? '');
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#0A84FF';
}

function safeImageUrl(value: unknown): string | null {
  const url = String(value ?? '').trim();
  return /^https:\/\//i.test(url) && url.length <= 1200 ? url : null;
}

function formatAppointmentDate(payload: Record<string, unknown>): { date: string; time: string } {
  const startsAt = String(payload.starts_at ?? '');
  const timezone = String(payload.organization_timezone ?? 'Europe/Paris');
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return { date: 'Date à confirmer', time: '' };

  return {
    date: new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(date),
  };
}


function compactUtc(value: unknown): string | null {
  const date = new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function formatPrice(cents: unknown): string | null {
  const amount = Number(cents);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 100);
}

function templateCopy(templateKey: string, payload: Record<string, unknown>) {
  const organization = String(payload.organization_name ?? 'Votre établissement');
  const date = formatAppointmentDate(payload);

  switch (templateKey) {
    case 'customer_pending':
      return {
        subject: `Demande de rendez-vous reçue — ${organization}`,
        eyebrow: 'DEMANDE REÇUE',
        title: 'Votre demande a bien été transmise',
        message: `${organization} doit encore valider votre rendez-vous du ${date.date} à ${date.time}.`,
      };
    case 'customer_confirmed':
      return {
        subject: `Rendez-vous confirmé — ${organization}`,
        eyebrow: 'RENDEZ-VOUS CONFIRMÉ',
        title: 'Votre rendez-vous est confirmé',
        message: `Nous vous attendons le ${date.date} à ${date.time}.`,
      };
    case 'customer_rescheduled':
      return {
        subject: `Rendez-vous modifié — ${organization}`,
        eyebrow: 'RENDEZ-VOUS MODIFIÉ',
        title: 'Votre nouveau créneau est enregistré',
        message: `Votre rendez-vous est maintenant prévu le ${date.date} à ${date.time}.`,
      };
    case 'customer_cancelled':
      return {
        subject: `Rendez-vous annulé — ${organization}`,
        eyebrow: 'RENDEZ-VOUS ANNULÉ',
        title: 'Votre rendez-vous a été annulé',
        message: `Le rendez-vous initialement prévu le ${date.date} à ${date.time} n’est plus programmé.`,
      };
    case 'customer_reminder':
      return {
        subject: `Rappel de votre rendez-vous — ${organization}`,
        eyebrow: 'RAPPEL',
        title: 'Votre rendez-vous approche',
        message: `Petit rappel : votre rendez-vous est prévu le ${date.date} à ${date.time}.`,
      };
    case 'business_new_booking':
      return {
        subject: `Nouvelle réservation en ligne — ${payload.client_name ?? 'Client'}`,
        eyebrow: 'NOUVELLE RÉSERVATION',
        title: 'Un client vient de réserver',
        message: `${payload.client_name ?? 'Un client'} a demandé un rendez-vous le ${date.date} à ${date.time}.`,
      };
    case 'business_rescheduled':
      return {
        subject: `Réservation déplacée — ${payload.client_name ?? 'Client'}`,
        eyebrow: 'RÉSERVATION MODIFIÉE',
        title: 'Un client a déplacé son rendez-vous',
        message: `Le nouveau créneau est fixé au ${date.date} à ${date.time}.`,
      };
    case 'business_cancelled':
      return {
        subject: `Réservation annulée — ${payload.client_name ?? 'Client'}`,
        eyebrow: 'RÉSERVATION ANNULÉE',
        title: 'Un client a annulé son rendez-vous',
        message: `Le rendez-vous du ${date.date} à ${date.time} a été annulé.`,
      };
    case 'team_invitation':
      return {
        subject: `Invitation à rejoindre ${organization} sur NCR Suite`,
        eyebrow: 'INVITATION ÉQUIPE',
        title: `Rejoignez l’espace ${organization}`,
        message: `${organization} vous invite à accéder à son espace professionnel NCR Suite.`,
      };
    default:
      throw new Error(`Modèle d’e-mail inconnu : ${templateKey}`);
  }
}

function buildEmail(item: OutboxItem, publicUrl: string) {
  const payload = item.payload ?? {};
  const copy = templateCopy(item.template_key, payload);

  if (item.template_key === 'team_invitation') {
    const accent = safeColor(payload.organization_primary_color);
    const organization = escapeHtml(payload.organization_name ?? 'NCR Suite');
    const token = String(payload.invitation_token ?? '').trim();
    const roleKey = String(payload.invited_role ?? 'employee');
    const roleLabels: Record<string, string> = {
      admin: 'Administrateur',
      manager: 'Responsable',
      employee: 'Collaborateur',
      viewer: 'Consultation',
    };
    const role = roleLabels[roleKey] ?? 'Collaborateur';
    const inviteUrl = `${publicUrl.replace(/\/$/, '')}/invitation/${encodeURIComponent(token)}`;
    const expiresAt = new Date(String(payload.expires_at ?? ''));
    const expiry = Number.isNaN(expiresAt.getTime())
      ? 'dans 7 jours'
      : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(expiresAt);

    const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 12px 35px rgba(0,0,0,.08)">
<tr><td style="height:8px;background:${accent}"></td></tr>
<tr><td style="padding:36px 32px 14px"><div style="font-size:12px;letter-spacing:.12em;font-weight:800;color:${accent}">${escapeHtml(copy.eyebrow)}</div><h1 style="font-size:28px;line-height:1.15;margin:10px 0 12px">${escapeHtml(copy.title)}</h1><p style="font-size:16px;line-height:1.6;color:#6e6e73;margin:0">${escapeHtml(copy.message)}</p></td></tr>
<tr><td style="padding:18px 32px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;border-radius:20px;padding:8px 18px"><tr><td style="padding:13px 0;color:#6e6e73">Entreprise</td><td align="right" style="font-weight:700">${organization}</td></tr><tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Accès proposé</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${escapeHtml(role)}</td></tr><tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Validité</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">Jusqu’au ${escapeHtml(expiry)}</td></tr></table></td></tr>
<tr><td style="padding:8px 32px 30px"><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:999px">Accepter l’invitation</a></td></tr>
<tr><td style="padding:22px 32px 32px;border-top:1px solid #ededf0;color:#86868b;font-size:13px;line-height:1.6">Cette invitation est personnelle. Si vous ne connaissez pas ${organization}, vous pouvez ignorer cet e-mail.<br>E-mail envoyé automatiquement par NCR Suite.</td></tr>
</table></td></tr></table></body></html>`;

    const text = `${copy.title}\n\n${copy.message}\n\nAccès : ${role}\nInvitation valable jusqu’au ${expiry}.\n\nAccepter l’invitation : ${inviteUrl}`;
    return { subject: copy.subject, html, text, replyTo: null };
  }
  const accent = safeColor(payload.organization_primary_color);
  const organization = escapeHtml(payload.organization_name ?? 'NCR Suite');
  const clientFirstName = escapeHtml(payload.client_first_name ?? item.recipient_name ?? '');
  const service = escapeHtml(payload.service_name ?? 'Rendez-vous');
  const staff = escapeHtml(payload.staff_name ?? '');
  const contactEmail = String(payload.contact_email ?? '').trim();
  const contactPhone = String(payload.contact_phone ?? '').trim();
  const organizationAddress = String(payload.organization_address ?? '').trim();
  const organizationLogoUrl = safeImageUrl(payload.organization_logo_url);
  const showNcrBranding = payload.show_ncr_branding !== false;
  const publicToken = String(payload.public_token ?? '').trim();
  const appointmentDate = formatAppointmentDate(payload);
  const price = formatPrice(payload.amount_cents);
  const isCustomer = item.template_key.startsWith('customer_');
  const manageUrl = publicToken ? `${publicUrl.replace(/\/$/, '')}/reservation/${encodeURIComponent(publicToken)}` : null;
  const starts = compactUtc(payload.starts_at);
  const ends = compactUtc(payload.ends_at);
  const calendarUrl = isCustomer && starts && ends && !['customer_cancelled', 'customer_pending'].includes(item.template_key)
    ? `https://calendar.google.com/calendar/render?${new URLSearchParams({
        action: 'TEMPLATE',
        text: `${String(payload.service_name ?? 'Rendez-vous')} — ${String(payload.organization_name ?? '')}`,
        details: manageUrl ? `Gérer le rendez-vous : ${manageUrl}` : 'Rendez-vous réservé avec NCR Suite',
        dates: `${starts}/${ends}`,
        location: organizationAddress || String(payload.organization_name ?? '')
      }).toString()}`
    : null;
  const cancellationPolicy = String(payload.cancellation_policy ?? '').trim();
  const emailLogo = organizationLogoUrl
    ? `<div style="margin-bottom:22px"><img src="${escapeHtml(organizationLogoUrl)}" alt="${organization}" style="display:block;max-width:180px;max-height:72px;object-fit:contain"></div>`
    : '';

  const contactLine = [
    contactEmail ? `<a href="mailto:${escapeHtml(contactEmail)}" style="color:${accent};text-decoration:none">${escapeHtml(contactEmail)}</a>` : '',
    contactPhone ? `<a href="tel:${escapeHtml(contactPhone)}" style="color:${accent};text-decoration:none">${escapeHtml(contactPhone)}</a>` : '',
  ].filter(Boolean).join(' · ');

  const actionButtons = isCustomer && ((manageUrl && !['customer_cancelled'].includes(item.template_key)) || calendarUrl)
    ? `<tr><td style="padding:8px 32px 28px">${manageUrl && !['customer_cancelled'].includes(item.template_key) ? `<a href="${escapeHtml(manageUrl)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:999px;margin:0 8px 8px 0">Gérer mon rendez-vous</a>` : ''}${calendarUrl ? `<a href="${escapeHtml(calendarUrl)}" style="display:inline-block;background:#f0f0f2;color:#1d1d1f;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:999px;margin-bottom:8px">Ajouter à Google Agenda</a>` : ''}</td></tr>`
    : '';

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 12px 35px rgba(0,0,0,.08)">
<tr><td style="height:8px;background:${accent}"></td></tr>
<tr><td style="padding:34px 32px 14px">${emailLogo}<div style="font-size:12px;letter-spacing:.12em;font-weight:800;color:${accent}">${escapeHtml(copy.eyebrow)}</div><h1 style="font-size:28px;line-height:1.15;margin:10px 0 12px">${escapeHtml(copy.title)}</h1><p style="font-size:16px;line-height:1.6;color:#6e6e73;margin:0">${clientFirstName && isCustomer ? `Bonjour ${clientFirstName}, ` : ''}${escapeHtml(copy.message)}</p></td></tr>
<tr><td style="padding:18px 32px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;border-radius:20px;padding:8px 18px">
<tr><td style="padding:13px 0;color:#6e6e73">Établissement</td><td align="right" style="font-weight:700">${organization}</td></tr>
<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Prestation</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${service}</td></tr>
<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Date</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${escapeHtml(appointmentDate.date)}</td></tr>
<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Heure</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${escapeHtml(appointmentDate.time)}</td></tr>
${staff ? `<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Collaborateur</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${staff}</td></tr>` : ''}
${organizationAddress ? `<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Adresse</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${escapeHtml(organizationAddress)}</td></tr>` : ''}
${price ? `<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Tarif</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${escapeHtml(price)}</td></tr>` : ''}
</table></td></tr>
${actionButtons}
${isCustomer && cancellationPolicy ? `<tr><td style="padding:0 32px 24px;color:#6e6e73;font-size:12px;line-height:1.6"><strong style="color:#1d1d1f">Modification et annulation :</strong> ${escapeHtml(cancellationPolicy)}</td></tr>` : ''}
<tr><td style="padding:22px 32px 32px;border-top:1px solid #ededf0;color:#86868b;font-size:13px;line-height:1.6">${contactLine ? `Une question ? ${contactLine}<br>` : ''}${showNcrBranding ? `Propulsé par NCR Suite pour ${organization}.` : `E-mail envoyé automatiquement pour ${organization}.`}</td></tr>
</table></td></tr></table></body></html>`;

  const text = `${copy.title}\n\n${copy.message}\n\nÉtablissement : ${payload.organization_name ?? ''}\nPrestation : ${payload.service_name ?? ''}\nDate : ${appointmentDate.date}\nHeure : ${appointmentDate.time}${staff ? `\nCollaborateur : ${payload.staff_name}` : ''}${organizationAddress ? `\nAdresse : ${organizationAddress}` : ''}${price ? `\nTarif : ${price}` : ''}${manageUrl && isCustomer ? `\n\nGérer mon rendez-vous : ${manageUrl}` : ''}${calendarUrl ? `\nAjouter à Google Agenda : ${calendarUrl}` : ''}${cancellationPolicy && isCustomer ? `\n\nModification et annulation : ${cancellationPolicy}` : ''}${contactEmail || contactPhone ? `\n\nContact : ${[contactEmail, contactPhone].filter(Boolean).join(' · ')}` : ''}`;

  return { subject: copy.subject, html, text, replyTo: contactEmail || null };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const expectedSecret = Deno.env.get('EMAIL_PROCESSOR_SECRET');
  const receivedSecret = request.headers.get('x-ncr-suite-secret');
  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL');
  const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'NCR Suite';
  const publicUrl = Deno.env.get('NCR_SUITE_PUBLIC_URL') || 'https://ncrsuite.pages.dev';

  if (!supabaseUrl || !serviceRoleKey || !brevoApiKey || !senderEmail) {
    return new Response(JSON.stringify({ error: 'Configuration incomplète des secrets.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('claim_email_outbox', { p_limit: 20 });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const items = (data ?? []) as OutboxItem[];
  let sent = 0;
  let failed = 0;

  for (const item of items) {
    try {
      if (item.appointment_id && !['customer_cancelled', 'business_cancelled'].includes(item.template_key)) {
        const { data: currentAppointment, error: appointmentError } = await supabase
          .from('appointments')
          .select('status,starts_at')
          .eq('id', item.appointment_id)
          .maybeSingle();
        if (appointmentError) throw appointmentError;

        const expectedStart = String(item.payload?.starts_at ?? '');
        const currentStart = String(currentAppointment?.starts_at ?? '');
        const startStillMatches = !expectedStart || expectedStart === currentStart;
        const statusStillMatches = item.template_key === 'customer_pending'
          ? currentAppointment?.status === 'pending'
          : ['customer_confirmed', 'customer_reminder'].includes(item.template_key)
            ? currentAppointment?.status === 'confirmed'
            : item.template_key === 'business_new_booking'
              ? currentAppointment?.status !== 'cancelled'
              : ['confirmed', 'pending'].includes(String(currentAppointment?.status ?? ''));

        if (!currentAppointment || !startStillMatches || !statusStillMatches) {
          await supabase
            .from('email_outbox')
            .update({ status: 'cancelled', locked_at: null, last_error: 'Notification devenue obsolète.', updated_at: new Date().toISOString() })
            .eq('id', item.id);
          continue;
        }
      }

      const email = buildEmail(item, publicUrl);
      const payload: Record<string, unknown> = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: item.recipient_email, name: item.recipient_name || undefined }],
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
        tags: ['ncr-suite', item.template_key],
      };
      if (email.replyTo) payload.replyTo = { email: email.replyTo };

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(`Brevo ${response.status}: ${JSON.stringify(responseBody).slice(0, 800)}`);
      }

      const { error: updateError } = await supabase
        .from('email_outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          locked_at: null,
          provider_message_id: String(responseBody.messageId ?? ''),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (updateError) throw updateError;
      sent += 1;
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : String(caught);
      const exhausted = item.attempts >= 3;
      const retryMinutes = Math.min(30, Math.max(2, 2 ** item.attempts));
      await supabase
        .from('email_outbox')
        .update({
          status: exhausted ? 'failed' : 'pending',
          scheduled_for: new Date(Date.now() + retryMinutes * 60_000).toISOString(),
          locked_at: null,
          last_error: errorMessage.slice(0, 2000),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      failed += 1;
    }
  }

  return new Response(JSON.stringify({ claimed: items.length, sent, failed }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
