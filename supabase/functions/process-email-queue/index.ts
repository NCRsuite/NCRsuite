import { createClient } from 'npm:@supabase/supabase-js@2.110.2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

type OutboxItem = {
  id: string;
  appointment_id: string | null;
  template_key: string;
  recipient_email: string;
  recipient_name: string | null;
  payload: Record<string, unknown>;
  attempts: number;
};


type TrainingDocumentJob = {
  id: string;
  organization_id: string;
  session_id: string;
  trainee_id: string;
  document_kind: 'convocation' | 'attestation';
  generation_version: number;
  send_email: boolean;
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


function normalizePdfText(value: unknown): string {
  return String(value ?? '')
    .replaceAll('\u00a0', ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/•/g, '-')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/…/g, '...')
    .replace(/[^\u0000-\u00ff]/g, '?')
    .replace(/\s+/g, ' ')
    .trim();
}

function hexRgb(value: unknown) {
  const color = safeColor(value).slice(1);
  return rgb(
    Number.parseInt(color.slice(0, 2), 16) / 255,
    Number.parseInt(color.slice(2, 4), 16) / 255,
    Number.parseInt(color.slice(4, 6), 16) / 255,
  );
}

function wrapPdfText(text: string, font: { widthOfTextAtSize: (value: string, size: number) => number }, size: number, maxWidth: number): string[] {
  const normalized = normalizePdfText(text);
  if (!normalized) return [];
  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatTrainingDate(value: unknown, timezone: string, withTime = false): string {
  const date = new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return 'À confirmer';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    day: '2-digit', month: 'long', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

async function generateTrainingPdf(payload: Record<string, unknown>): Promise<Uint8Array> {
  const kind = String(payload.document_kind ?? 'convocation');
  const timezone = String(payload.organization_timezone ?? 'Europe/Paris');
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = hexRgb(payload.organization_primary_color);
  const dark = rgb(0.11, 0.11, 0.12);
  const muted = rgb(0.42, 0.42, 0.45);
  const soft = rgb(0.96, 0.96, 0.97);
  const margin = 48;
  const contentWidth = page.getWidth() - margin * 2;
  let y = page.getHeight() - 48;

  page.drawRectangle({ x: 0, y: page.getHeight() - 10, width: page.getWidth(), height: 10, color: accent });

  const logoUrl = safeImageUrl(payload.organization_logo_url);
  if (logoUrl) {
    try {
      const response = await fetch(logoUrl);
      if (response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        const bytes = new Uint8Array(await response.arrayBuffer());
        const image = contentType.includes('png') ? await pdf.embedPng(bytes) : contentType.includes('jpeg') || contentType.includes('jpg') ? await pdf.embedJpg(bytes) : null;
        if (image) {
          const scaled = image.scale(Math.min(150 / image.width, 58 / image.height, 1));
          page.drawImage(image, { x: margin, y: y - scaled.height, width: scaled.width, height: scaled.height });
        }
      }
    } catch {
      // Le document reste générable même si le logo externe est temporairement indisponible.
    }
  }

  const organization = normalizePdfText(payload.organization_name || 'Organisme de formation');
  page.drawText(organization, { x: margin, y: y - 8, size: 13, font: bold, color: dark });
  const address = normalizePdfText(payload.site_address || payload.organization_address);
  if (address) page.drawText(address.slice(0, 105), { x: margin, y: y - 27, size: 9, font: regular, color: muted });
  y -= 88;

  const title = kind === 'attestation' ? 'ATTESTATION DE FIN DE FORMATION' : 'CONVOCATION À UNE FORMATION';
  page.drawText(title, { x: margin, y, size: kind === 'attestation' ? 21 : 23, font: bold, color: dark });
  y -= 12;
  page.drawRectangle({ x: margin, y, width: 86, height: 4, color: accent });
  y -= 38;

  const traineeName = normalizePdfText(`${payload.trainee_first_name ?? ''} ${payload.trainee_last_name ?? ''}`);
  const company = normalizePdfText(payload.trainee_company);
  const program = normalizePdfText(payload.program_title || payload.session_title || 'Formation');
  const session = normalizePdfText(payload.session_title || program);
  const trainer = normalizePdfText(payload.trainer_name);
  const location = normalizePdfText(payload.location || payload.site_address || payload.organization_address || 'À confirmer');
  const modalityLabels: Record<string, string> = { presentiel: 'Présentiel', distanciel: 'Distanciel', hybride: 'Hybride' };
  const modality = modalityLabels[String(payload.modality ?? '')] ?? normalizePdfText(payload.modality);
  const starts = formatTrainingDate(payload.starts_at, timezone, true);
  const ends = formatTrainingDate(payload.ends_at, timezone, true);
  const duration = Number(payload.duration_hours ?? 0);
  const reference = normalizePdfText(String(payload.job_id ?? '').replaceAll('-', '').slice(0, 12).toUpperCase());

  const intro = kind === 'attestation'
    ? `${organization} atteste que ${traineeName}${company ? `, rattaché(e) à ${company}` : ''}, a participé à la formation indiquée ci-dessous.`
    : `Madame, Monsieur, ${traineeName}${company ? ` (${company})` : ''} est convoqué(e) à la session de formation indiquée ci-dessous.`;
  for (const line of wrapPdfText(intro, regular, 11, contentWidth)) {
    page.drawText(line, { x: margin, y, size: 11, font: regular, color: dark });
    y -= 17;
  }
  y -= 14;

  const fields: Array<[string, string]> = [
    ['Formation', program],
    ['Session', session],
    ['Début', starts],
    ['Fin', ends],
    ['Durée prévue', duration > 0 ? `${String(duration).replace('.', ',')} heures` : 'À confirmer'],
    ['Modalité', modality || 'À confirmer'],
    ['Lieu / accès', location],
    ['Formateur', trainer || 'À définir'],
  ];

  page.drawRectangle({ x: margin, y: y - fields.length * 34 - 10, width: contentWidth, height: fields.length * 34 + 18, color: soft });
  y -= 18;
  for (const [label, value] of fields) {
    page.drawText(label, { x: margin + 16, y, size: 9, font: bold, color: muted });
    const valueLines = wrapPdfText(value || 'À confirmer', regular, 10.5, contentWidth - 150).slice(0, 2);
    valueLines.forEach((line, index) => page.drawText(line, { x: margin + 136, y: y - index * 13, size: 10.5, font: regular, color: dark }));
    y -= 34;
  }
  y -= 22;

  if (kind === 'convocation') {
    const objectives = normalizePdfText(payload.program_objectives);
    if (objectives) {
      page.drawText('Objectifs principaux', { x: margin, y, size: 11, font: bold, color: dark });
      y -= 18;
      for (const line of wrapPdfText(objectives, regular, 10, contentWidth).slice(0, 5)) {
        page.drawText(line, { x: margin, y, size: 10, font: regular, color: muted });
        y -= 15;
      }
      y -= 8;
    }
    const footer = normalizePdfText(payload.document_footer);
    if (footer) {
      page.drawText('Informations pratiques', { x: margin, y, size: 11, font: bold, color: dark });
      y -= 18;
      for (const line of wrapPdfText(footer, regular, 10, contentWidth).slice(0, 5)) {
        page.drawText(line, { x: margin, y, size: 10, font: regular, color: muted });
        y -= 15;
      }
    }
  } else {
    const present = Number(payload.attendance_present ?? 0);
    const absent = Number(payload.attendance_absent ?? 0);
    const excused = Number(payload.attendance_excused ?? 0);
    page.drawText('Éléments de présence enregistrés', { x: margin, y, size: 11, font: bold, color: dark });
    y -= 20;
    page.drawText(`Présences signées : ${present}  ·  Absences : ${absent}  ·  Absences justifiées : ${excused}`, { x: margin, y, size: 10, font: regular, color: muted });
    y -= 40;
    const signatoryName = normalizePdfText(payload.signatory_name) || 'Le responsable de l’organisme';
    const signatoryTitle = normalizePdfText(payload.signatory_title);
    page.drawText('Fait le ' + formatTrainingDate(new Date().toISOString(), timezone), { x: margin, y, size: 10, font: regular, color: muted });
    y -= 35;
    page.drawText(signatoryName, { x: margin, y, size: 12, font: bold, color: dark });
    if (signatoryTitle) page.drawText(signatoryTitle, { x: margin, y: y - 17, size: 10, font: regular, color: muted });
  }

  page.drawText(`Référence : ${reference || 'NCR-SUITE'}`, { x: margin, y: 32, size: 8, font: regular, color: muted });
  if (payload.show_ncr_branding !== false) {
    const branding = 'Document généré automatiquement par NCR Suite';
    page.drawText(branding, { x: page.getWidth() - margin - regular.widthOfTextAtSize(branding, 8), y: 32, size: 8, font: regular, color: muted });
  }

  pdf.setTitle(`${title} - ${traineeName}`);
  pdf.setAuthor(organization);
  pdf.setSubject(program);
  pdf.setCreator('NCR Suite');
  return await pdf.save();
}

async function processTrainingDocumentJobs(supabase: any) {
  const { data, error } = await supabase.rpc('claim_training_document_jobs', { p_limit: 10 });
  if (error) throw new Error(`File documents : ${error.message}`);

  const jobs = (data ?? []) as TrainingDocumentJob[];
  let generated = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const { data: rawPayload, error: payloadError } = await supabase.rpc('training_document_job_payload', { p_job_id: job.id });
      if (payloadError) throw payloadError;
      const trainingPayload = (rawPayload ?? {}) as Record<string, unknown>;
      if (!trainingPayload.job_id) throw new Error('Données de génération introuvables.');

      if (job.document_kind === 'attestation') {
        if (String(trainingPayload.session_status) !== 'completed') throw new Error('La session n’est pas terminée.');
        if (Number(trainingPayload.attendance_present ?? 0) < 1) {
          throw new Error('ATTENDANCE_REQUIRED: aucune présence signée pour ce stagiaire.');
        }
      }

      const pdfBytes = await generateTrainingPdf(trainingPayload);
      const safeName = `${job.document_kind}-${normalizePdfText(trainingPayload.trainee_first_name).toLowerCase()}-${normalizePdfText(trainingPayload.trainee_last_name).toLowerCase()}`
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || job.document_kind;
      const storagePath = `${job.organization_id}/${job.session_id}/automatiques/${job.document_kind}/${safeName}-v${job.generation_version}.pdf`;
      const { error: uploadError } = await supabase.storage.from('training-documents').upload(storagePath, pdfBytes, {
        contentType: 'application/pdf', cacheControl: '3600', upsert: true,
      });
      if (uploadError) throw uploadError;

      const title = job.document_kind === 'attestation'
        ? `Attestation de fin — ${normalizePdfText(trainingPayload.trainee_first_name)} ${normalizePdfText(trainingPayload.trainee_last_name)}`
        : `Convocation — ${normalizePdfText(trainingPayload.trainee_first_name)} ${normalizePdfText(trainingPayload.trainee_last_name)}`;
      const { data: documentRow, error: documentError } = await supabase
        .from('training_documents')
        .upsert({
          organization_id: job.organization_id,
          site_id: trainingPayload.site_id || null,
          session_id: job.session_id,
          program_id: trainingPayload.program_id || null,
          trainee_id: job.trainee_id,
          title,
          category: job.document_kind === 'attestation' ? 'attestation' : 'convocation',
          storage_path: storagePath,
          mime_type: 'application/pdf',
          size_bytes: pdfBytes.length,
          visibility: 'trainee',
          status: 'published',
          notes: `Document généré automatiquement · version ${job.generation_version}`,
          generated_automatically: true,
          automation_key: String(trainingPayload.automation_key),
          generated_at: new Date().toISOString(),
        }, { onConflict: 'automation_key' })
        .select('id')
        .single();
      if (documentError) throw documentError;
      const documentId = documentRow?.id;
      if (!documentId) throw new Error('Document généré mais référence introuvable.');

      const recipientEmail = String(trainingPayload.trainee_email ?? '').trim().toLowerCase();
      const shouldEmail = job.send_email && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(recipientEmail);
      if (shouldEmail) {
        const emailTemplate = job.document_kind === 'attestation' ? 'training_attestation' : 'training_convocation';
        const { error: emailError } = await supabase.from('email_outbox').upsert({
          organization_id: job.organization_id,
          appointment_id: null,
          template_key: emailTemplate,
          recipient_email: recipientEmail,
          recipient_name: normalizePdfText(`${trainingPayload.trainee_first_name ?? ''} ${trainingPayload.trainee_last_name ?? ''}`),
          payload: {
            ...trainingPayload,
            document_title: title,
            attachment_bucket: 'training-documents',
            attachment_path: storagePath,
            attachment_name: `${safeName}.pdf`,
          },
          dedupe_key: `training-email:${job.id}`,
          status: 'pending',
          scheduled_for: new Date().toISOString(),
          attempts: 0,
          locked_at: null,
          sent_at: null,
          provider_message_id: null,
          last_error: null,
        }, { onConflict: 'dedupe_key', ignoreDuplicates: true });
        if (emailError) throw emailError;
      }

      const { error: completedError } = await supabase
        .from('training_document_jobs')
        .update({
          status: 'completed', completed_at: new Date().toISOString(), locked_at: null,
          document_id: documentId, last_error: shouldEmail ? null : 'Document généré. Aucun e-mail valide à envoyer.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      if (completedError) throw completedError;
      generated += 1;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      const attendanceBlocked = message.startsWith('ATTENDANCE_REQUIRED:');
      const exhausted = attendanceBlocked || job.attempts >= 4;
      const retryMinutes = Math.min(30, Math.max(2, 2 ** job.attempts));
      await supabase
        .from('training_document_jobs')
        .update({
          status: exhausted ? 'failed' : 'pending',
          scheduled_for: new Date(Date.now() + retryMinutes * 60_000).toISOString(),
          locked_at: null,
          last_error: message.replace('ATTENDANCE_REQUIRED:', '').trim().slice(0, 2000),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      failed += 1;
    }
  }

  return { claimed: jobs.length, generated, failed };
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
    case 'training_convocation':
      return {
        subject: `Convocation à votre formation — ${organization}`,
        eyebrow: 'CONVOCATION FORMATION',
        title: 'Votre convocation est disponible',
        message: `Vous trouverez en pièce jointe votre convocation pour la session « ${String(payload.session_title ?? payload.program_title ?? 'Formation')} » prévue du ${formatTrainingDate(payload.starts_at, String(payload.organization_timezone ?? 'Europe/Paris'), true)} au ${formatTrainingDate(payload.ends_at, String(payload.organization_timezone ?? 'Europe/Paris'), true)}.`,
      };
    case 'training_attestation':
      return {
        subject: `Attestation de fin de formation — ${organization}`,
        eyebrow: 'ATTESTATION DE FIN',
        title: 'Votre attestation est disponible',
        message: `Vous trouverez en pièce jointe votre attestation relative à la formation « ${String(payload.program_title ?? payload.session_title ?? 'Formation')} ».`
      };
    case 'training_satisfaction_request':
      return {
        subject: `Votre avis sur la formation — ${organization}`,
        eyebrow: 'QUESTIONNAIRE DE SATISFACTION',
        title: 'Votre avis compte',
        message: `Prenez quelques instants pour évaluer la formation « ${String(payload.program_title ?? payload.session_title ?? 'Formation')} ».`
      };
    case 'security_client_portal_invitation':
      return {
        subject: `Votre portail client Sécurité — ${organization}`,
        eyebrow: 'PORTAIL CLIENT SÉCURITÉ',
        title: `Votre espace sécurisé est prêt`,
        message: `${organization} vous invite à consulter les prestations de sécurité réalisées pour votre entreprise.`,
      };
    case 'cleaning_client_portal_invitation':
      return {
        subject: `Votre portail client Nettoyage — ${organization}`,
        eyebrow: 'PORTAIL CLIENT NETTOYAGE',
        title: `Votre espace client est prêt`,
        message: `${organization} vous invite à consulter les interventions de nettoyage réalisées pour votre entreprise.`,
      };
    case 'coiffure_client_portal_invitation':
      return {
        subject: `Votre espace client Coiffure — ${organization}`,
        eyebrow: 'FIDÉLITÉ & RENDEZ-VOUS',
        title: `Votre espace client est prêt`,
        message: `${organization} vous invite à retrouver vos rendez-vous et vos avantages fidélité.`,
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

  if (item.template_key === 'security_client_portal_invitation') {
    const accent = safeColor(payload.organization_primary_color);
    const organizationRaw = String(payload.organization_name ?? 'Votre prestataire de sécurité');
    const clientRaw = String(payload.client_name ?? 'Votre entreprise');
    const organization = escapeHtml(organizationRaw);
    const client = escapeHtml(clientRaw);
    const invitee = escapeHtml(payload.invited_name ?? item.recipient_name ?? '');
    const token = String(payload.invitation_token ?? '').trim();
    const role = String(payload.invited_role ?? '') === 'client_viewer' ? 'Consultation' : 'Responsable client';
    const inviteUrl = `${publicUrl.replace(/\/$/, '')}/client-securite/invitation/${encodeURIComponent(token)}`;
    const contactEmail = String(payload.contact_email ?? '').trim();
    const contactPhone = String(payload.contact_phone ?? '').trim();
    const organizationLogoUrl = safeImageUrl(payload.organization_logo_url);
    const expiresAt = new Date(String(payload.expires_at ?? ''));
    const expiry = Number.isNaN(expiresAt.getTime())
      ? 'dans 7 jours'
      : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(expiresAt);
    const logo = organizationLogoUrl
      ? `<img src="${escapeHtml(organizationLogoUrl)}" alt="${organization}" style="display:block;max-width:180px;max-height:64px;object-fit:contain">`
      : `<div style="display:inline-block;background:${accent};color:#fff;font-size:22px;font-weight:800;padding:12px 16px;border-radius:16px">${organization.slice(0, 2).toUpperCase()}</div>`;

    const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,.10)">
<tr><td style="height:8px;background:${accent}"></td></tr>
<tr><td style="padding:34px 34px 18px">${logo}<div style="font-size:11px;letter-spacing:.14em;font-weight:800;color:${accent};margin-top:28px">PORTAIL CLIENT SÉCURITÉ</div><h1 style="font-size:30px;line-height:1.15;margin:10px 0 12px">Votre espace sécurisé est prêt.</h1><p style="font-size:16px;line-height:1.65;color:#64748b;margin:0">${invitee ? `Bonjour ${invitee}, ` : ''}${organization} vous ouvre un accès personnel pour suivre les prestations réalisées pour <strong style="color:#111827">${client}</strong>.</p></td></tr>
<tr><td style="padding:12px 34px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px"><tr><td style="padding:16px 18px;color:#64748b">Entreprise cliente</td><td align="right" style="padding:16px 18px;font-weight:700">${client}</td></tr><tr><td style="padding:16px 18px;border-top:1px solid #e2e8f0;color:#64748b">Niveau d’accès</td><td align="right" style="padding:16px 18px;border-top:1px solid #e2e8f0;font-weight:700">${role}</td></tr><tr><td style="padding:16px 18px;border-top:1px solid #e2e8f0;color:#64748b">Invitation valable</td><td align="right" style="padding:16px 18px;border-top:1px solid #e2e8f0;font-weight:700">Jusqu’au ${escapeHtml(expiry)}</td></tr></table></td></tr>
<tr><td style="padding:22px 34px 30px"><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:800;padding:15px 25px;border-radius:999px">Créer ou ouvrir mon portail</a><p style="font-size:13px;line-height:1.55;color:#94a3b8;margin:18px 0 0">Cet accès permet de consulter uniquement les données autorisées par votre prestataire : missions, main courante, rondes QR, documents et messages.</p></td></tr>
<tr><td style="padding:22px 34px 30px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;line-height:1.7">${contactEmail ? `Contact : ${escapeHtml(contactEmail)}` : ''}${contactEmail && contactPhone ? ' · ' : ''}${contactPhone ? escapeHtml(contactPhone) : ''}<br>Invitation personnelle envoyée automatiquement par NCR Suite.</td></tr>
</table></td></tr></table></body></html>`;

    const text = `Votre portail client Sécurité est prêt

${organizationRaw} vous invite à suivre les prestations réalisées pour ${clientRaw}.
Niveau d’accès : ${role}.
Invitation valable jusqu’au ${expiry}.

Ouvrir le portail : ${inviteUrl}`;
    return { subject: copy.subject, html, text, replyTo: contactEmail || null };
  }

  if (item.template_key === 'cleaning_client_portal_invitation') {
    const accent = safeColor(payload.organization_primary_color);
    const organizationRaw = String(payload.organization_name ?? 'Votre prestataire de nettoyage');
    const clientRaw = String(payload.client_name ?? 'Votre entreprise');
    const organization = escapeHtml(organizationRaw);
    const client = escapeHtml(clientRaw);
    const invitee = escapeHtml(payload.invited_name ?? item.recipient_name ?? '');
    const token = String(payload.invitation_token ?? '').trim();
    const role = String(payload.invited_role ?? '') === 'client_viewer' ? 'Consultation' : 'Responsable client';
    const inviteUrl = `${publicUrl.replace(/\/$/, '')}/client-nettoyage/invitation/${encodeURIComponent(token)}`;
    const contactEmail = String(payload.contact_email ?? '').trim();
    const contactPhone = String(payload.contact_phone ?? '').trim();
    const organizationLogoUrl = safeImageUrl(payload.organization_logo_url);
    const expiresAt = new Date(String(payload.expires_at ?? ''));
    const expiry = Number.isNaN(expiresAt.getTime())
      ? 'dans 7 jours'
      : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(expiresAt);
    const logo = organizationLogoUrl
      ? `<img src="${escapeHtml(organizationLogoUrl)}" alt="${organization}" style="display:block;max-width:180px;max-height:64px;object-fit:contain">`
      : `<div style="display:inline-block;background:${accent};color:#fff;font-size:22px;font-weight:800;padding:12px 16px;border-radius:16px">${organization.slice(0, 2).toUpperCase()}</div>`;

    const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,.10)">
<tr><td style="height:8px;background:${accent}"></td></tr>
<tr><td style="padding:34px 34px 18px">${logo}<div style="font-size:11px;letter-spacing:.14em;font-weight:800;color:${accent};margin-top:28px">PORTAIL CLIENT NETTOYAGE</div><h1 style="font-size:30px;line-height:1.15;margin:10px 0 12px">Votre espace sécurisé est prêt.</h1><p style="font-size:16px;line-height:1.65;color:#64748b;margin:0">${invitee ? `Bonjour ${invitee}, ` : ''}${organization} vous ouvre un accès personnel pour suivre les interventions réalisées pour <strong style="color:#111827">${client}</strong>.</p></td></tr>
<tr><td style="padding:12px 34px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px"><tr><td style="padding:16px 18px;color:#64748b">Entreprise cliente</td><td align="right" style="padding:16px 18px;font-weight:700">${client}</td></tr><tr><td style="padding:16px 18px;border-top:1px solid #e2e8f0;color:#64748b">Niveau d’accès</td><td align="right" style="padding:16px 18px;border-top:1px solid #e2e8f0;font-weight:700">${role}</td></tr><tr><td style="padding:16px 18px;border-top:1px solid #e2e8f0;color:#64748b">Invitation valable</td><td align="right" style="padding:16px 18px;border-top:1px solid #e2e8f0;font-weight:700">Jusqu’au ${escapeHtml(expiry)}</td></tr></table></td></tr>
<tr><td style="padding:22px 34px 30px"><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:800;padding:15px 25px;border-radius:999px">Créer ou ouvrir mon portail</a><p style="font-size:13px;line-height:1.55;color:#94a3b8;margin:18px 0 0">Cet accès permet de consulter uniquement les données autorisées par votre prestataire : interventions, rapports, anomalies, contrôles qualité, documents et messages.</p></td></tr>
<tr><td style="padding:22px 34px 30px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;line-height:1.7">${contactEmail ? `Contact : ${escapeHtml(contactEmail)}` : ''}${contactEmail && contactPhone ? ' · ' : ''}${contactPhone ? escapeHtml(contactPhone) : ''}<br>Invitation personnelle envoyée automatiquement par NCR Suite.</td></tr>
</table></td></tr></table></body></html>`;

    const text = `Votre portail client Nettoyage est prêt

${organizationRaw} vous invite à suivre les interventions réalisées pour ${clientRaw}.
Niveau d’accès : ${role}.
Invitation valable jusqu’au ${expiry}.

Ouvrir le portail : ${inviteUrl}`;
    return { subject: copy.subject, html, text, replyTo: contactEmail || null };
  }

  if (item.template_key === 'coiffure_client_portal_invitation') {
    const accent = safeColor(payload.organization_primary_color);
    const organizationRaw = String(payload.organization_name ?? 'Votre salon');
    const clientRaw = String(payload.client_name ?? item.recipient_name ?? '');
    const organization = escapeHtml(organizationRaw);
    const client = escapeHtml(clientRaw);
    const invitee = escapeHtml(payload.invited_name ?? item.recipient_name ?? '');
    const token = String(payload.invitation_token ?? '').trim();
    const inviteUrl = `${publicUrl.replace(/\/$/, '')}/client-coiffure/invitation/${encodeURIComponent(token)}`;
    const bookingSlug = String(payload.organization_slug ?? '').trim();
    const bookingUrl = bookingSlug ? `${publicUrl.replace(/\/$/, '')}/reserver/${encodeURIComponent(bookingSlug)}` : '';
    const contactEmail = String(payload.contact_email ?? '').trim();
    const contactPhone = String(payload.contact_phone ?? '').trim();
    const organizationLogoUrl = safeImageUrl(payload.organization_logo_url);
    const expiresAt = new Date(String(payload.expires_at ?? ''));
    const expiry = Number.isNaN(expiresAt.getTime())
      ? 'dans 7 jours'
      : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(expiresAt);
    const logo = organizationLogoUrl
      ? `<img src="${escapeHtml(organizationLogoUrl)}" alt="${organization}" style="display:block;max-width:180px;max-height:64px;object-fit:contain">`
      : `<div style="display:inline-flex;align-items:center;justify-content:center;background:${accent};color:#fff;font-size:24px;font-weight:800;width:58px;height:58px;border-radius:18px">${organization.slice(0, 2).toUpperCase()}</div>`;

    const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f7f2f8;font-family:Arial,Helvetica,sans-serif;color:#18141a">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f2f8;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:30px;overflow:hidden;box-shadow:0 18px 45px rgba(55,25,60,.12)">
<tr><td style="height:8px;background:${accent}"></td></tr>
<tr><td style="padding:34px 34px 18px">${logo}<div style="font-size:11px;letter-spacing:.14em;font-weight:800;color:${accent};margin-top:28px">FIDÉLITÉ & RENDEZ-VOUS</div><h1 style="font-size:30px;line-height:1.15;margin:10px 0 12px">Votre espace client est prêt.</h1><p style="font-size:16px;line-height:1.65;color:#6f6573;margin:0">${invitee ? `Bonjour ${invitee}, ` : ''}${organization} vous ouvre un espace personnel pour suivre vos rendez-vous et profiter de vos avantages fidélité.</p></td></tr>
<tr><td style="padding:12px 34px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fbf8fc;border:1px solid #eadfeb;border-radius:20px"><tr><td style="padding:16px 18px;color:#7b6f7e">Profil client</td><td align="right" style="padding:16px 18px;font-weight:700">${client}</td></tr><tr><td style="padding:16px 18px;border-top:1px solid #eadfeb;color:#7b6f7e">Dans votre espace</td><td align="right" style="padding:16px 18px;border-top:1px solid #eadfeb;font-weight:700">Rendez-vous · Fidélité · Récompenses</td></tr><tr><td style="padding:16px 18px;border-top:1px solid #eadfeb;color:#7b6f7e">Invitation valable</td><td align="right" style="padding:16px 18px;border-top:1px solid #eadfeb;font-weight:700">Jusqu’au ${escapeHtml(expiry)}</td></tr></table></td></tr>
<tr><td style="padding:22px 34px 30px"><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:800;padding:15px 25px;border-radius:999px">Activer mon espace client</a>${bookingUrl ? `<a href="${escapeHtml(bookingUrl)}" style="display:inline-block;color:${accent};text-decoration:none;font-weight:700;padding:15px 18px">Prendre rendez-vous</a>` : ''}<p style="font-size:13px;line-height:1.55;color:#9a8f9d;margin:18px 0 0">La date de naissance et les communications commerciales restent facultatives. Elles ne sont utilisées que selon vos choix dans l’espace client.</p></td></tr>
<tr><td style="padding:22px 34px 30px;border-top:1px solid #eadfeb;color:#7b6f7e;font-size:13px;line-height:1.7">${contactEmail ? `Contact : ${escapeHtml(contactEmail)}` : ''}${contactEmail && contactPhone ? ' · ' : ''}${contactPhone ? escapeHtml(contactPhone) : ''}<br>Invitation personnelle envoyée automatiquement par NCR Suite.</td></tr>
</table></td></tr></table></body></html>`;

    const text = `Votre espace client Coiffure est prêt

${organizationRaw} vous invite à retrouver vos rendez-vous et vos avantages fidélité${clientRaw ? ` pour ${clientRaw}` : ''}.
Invitation valable jusqu’au ${expiry}.

Activer mon espace : ${inviteUrl}${bookingUrl ? `
Prendre rendez-vous : ${bookingUrl}` : ''}`;
    return { subject: copy.subject, html, text, replyTo: contactEmail || null };
  }

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
  if (item.template_key === 'training_satisfaction_request') {
    const accent = safeColor(payload.organization_primary_color);
    const organization = escapeHtml(payload.organization_name ?? 'NCR Suite');
    const trainee = escapeHtml(payload.trainee_first_name ?? item.recipient_name ?? '');
    const program = escapeHtml(payload.program_title ?? payload.session_title ?? 'Formation');
    const trainer = escapeHtml(payload.trainer_name ?? '');
    const timezone = String(payload.organization_timezone ?? 'Europe/Paris');
    const contactEmail = String(payload.contact_email ?? '').trim();
    const contactPhone = String(payload.contact_phone ?? '').trim();
    const organizationLogoUrl = safeImageUrl(payload.organization_logo_url);
    const surveyToken = String(payload.survey_token ?? '').trim();
    const surveyUrl = `${publicUrl.replace(/\/$/, '')}/evaluation/${encodeURIComponent(surveyToken)}`;
    const emailLogo = organizationLogoUrl
      ? `<div style="margin-bottom:22px"><img src="${escapeHtml(organizationLogoUrl)}" alt="${organization}" style="display:block;max-width:180px;max-height:72px;object-fit:contain"></div>`
      : '';
    const intro = escapeHtml(payload.intro_text ?? copy.message);
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 12px 35px rgba(0,0,0,.08)">
<tr><td style="height:8px;background:${accent}"></td></tr>
<tr><td style="padding:34px 32px 14px">${emailLogo}<div style="font-size:12px;letter-spacing:.12em;font-weight:800;color:${accent}">${escapeHtml(copy.eyebrow)}</div><h1 style="font-size:28px;line-height:1.15;margin:10px 0 12px">${escapeHtml(copy.title)}</h1><p style="font-size:16px;line-height:1.6;color:#6e6e73;margin:0">Bonjour ${trainee}, ${intro}</p></td></tr>
<tr><td style="padding:18px 32px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;border-radius:20px;padding:8px 18px">
<tr><td style="padding:13px 0;color:#6e6e73">Organisme</td><td align="right" style="font-weight:700">${organization}</td></tr>
<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Formation</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${program}</td></tr>
<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Période</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${escapeHtml(formatTrainingDate(payload.starts_at, timezone, true))}</td></tr>
${trainer ? `<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Formateur</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${trainer}</td></tr>` : ''}
</table></td></tr>
<tr><td style="padding:8px 32px 30px"><a href="${escapeHtml(surveyUrl)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:999px">Donner mon avis</a></td></tr>
<tr><td style="padding:22px 32px 32px;border-top:1px solid #ededf0;color:#86868b;font-size:13px;line-height:1.6">${contactEmail || contactPhone ? `Une question ? ${[contactEmail, contactPhone].filter(Boolean).map(escapeHtml).join(' · ')}<br>` : ''}${payload.show_ncr_branding !== false ? `Propulsé par NCR Suite pour ${organization}.` : `E-mail envoyé automatiquement pour ${organization}.`}</td></tr>
</table></td></tr></table></body></html>`;
    const text = `${copy.title}

${copy.message}

Formation : ${payload.program_title ?? payload.session_title ?? ''}
Répondre au questionnaire : ${surveyUrl}`;
    return { subject: copy.subject, html, text, replyTo: contactEmail || null };
  }

  if (item.template_key === 'training_convocation' || item.template_key === 'training_attestation') {
    const accent = safeColor(payload.organization_primary_color);
    const organization = escapeHtml(payload.organization_name ?? 'NCR Suite');
    const trainee = escapeHtml(`${payload.trainee_first_name ?? ''} ${payload.trainee_last_name ?? item.recipient_name ?? ''}`.trim());
    const program = escapeHtml(payload.program_title ?? payload.session_title ?? 'Formation');
    const timezone = String(payload.organization_timezone ?? 'Europe/Paris');
    const starts = escapeHtml(formatTrainingDate(payload.starts_at, timezone, true));
    const ends = escapeHtml(formatTrainingDate(payload.ends_at, timezone, true));
    const location = escapeHtml(payload.location ?? payload.site_address ?? payload.organization_address ?? 'À confirmer');
    const trainer = escapeHtml(payload.trainer_name ?? 'À définir');
    const contactEmail = String(payload.contact_email ?? '').trim();
    const contactPhone = String(payload.contact_phone ?? '').trim();
    const organizationLogoUrl = safeImageUrl(payload.organization_logo_url);
    const emailLogo = organizationLogoUrl
      ? `<div style="margin-bottom:22px"><img src="${escapeHtml(organizationLogoUrl)}" alt="${organization}" style="display:block;max-width:180px;max-height:72px;object-fit:contain"></div>`
      : '';
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 12px 35px rgba(0,0,0,.08)">
<tr><td style="height:8px;background:${accent}"></td></tr>
<tr><td style="padding:34px 32px 14px">${emailLogo}<div style="font-size:12px;letter-spacing:.12em;font-weight:800;color:${accent}">${escapeHtml(copy.eyebrow)}</div><h1 style="font-size:28px;line-height:1.15;margin:10px 0 12px">${escapeHtml(copy.title)}</h1><p style="font-size:16px;line-height:1.6;color:#6e6e73;margin:0">Bonjour ${trainee}, ${escapeHtml(copy.message)}</p></td></tr>
<tr><td style="padding:18px 32px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;border-radius:20px;padding:8px 18px">
<tr><td style="padding:13px 0;color:#6e6e73">Organisme</td><td align="right" style="font-weight:700">${organization}</td></tr>
<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Formation</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${program}</td></tr>
<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Début</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${starts}</td></tr>
<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Fin</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${ends}</td></tr>
<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Lieu / accès</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${location}</td></tr>
<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Formateur</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${trainer}</td></tr>
</table></td></tr>
<tr><td style="padding:8px 32px 28px"><div style="display:inline-block;background:${accent};color:#fff;font-weight:700;padding:13px 22px;border-radius:999px">Document PDF joint à cet e-mail</div></td></tr>
<tr><td style="padding:22px 32px 32px;border-top:1px solid #ededf0;color:#86868b;font-size:13px;line-height:1.6">${contactEmail || contactPhone ? `Une question ? ${[contactEmail, contactPhone].filter(Boolean).map(escapeHtml).join(' · ')}<br>` : ''}${payload.show_ncr_branding !== false ? `Propulsé par NCR Suite pour ${organization}.` : `E-mail envoyé automatiquement pour ${organization}.`}</td></tr>
</table></td></tr></table></body></html>`;
    const text = `${copy.title}\n\n${copy.message}\n\nFormation : ${payload.program_title ?? ''}\nDébut : ${formatTrainingDate(payload.starts_at, timezone, true)}\nFin : ${formatTrainingDate(payload.ends_at, timezone, true)}\nLieu / accès : ${payload.location ?? payload.site_address ?? payload.organization_address ?? 'À confirmer'}\n\nLe document PDF est joint à cet e-mail.`;
    return { subject: copy.subject, html, text, replyTo: contactEmail || null };
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

  let documentJobs = { claimed: 0, generated: 0, failed: 0 };
  try {
    documentJobs = await processTrainingDocumentJobs(supabase);
  } catch (caught) {
    console.error('Training document processor:', caught);
  }

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

      const attachmentBucket = String(item.payload?.attachment_bucket ?? '').trim();
      const attachmentPath = String(item.payload?.attachment_path ?? '').trim();
      if (attachmentBucket && attachmentPath) {
        const { data: attachmentBlob, error: attachmentError } = await supabase.storage.from(attachmentBucket).download(attachmentPath);
        if (attachmentError || !attachmentBlob) throw attachmentError ?? new Error('Pièce jointe introuvable.');
        const attachmentBytes = new Uint8Array(await attachmentBlob.arrayBuffer());
        payload.attachment = [{
          name: String(item.payload?.attachment_name ?? 'document.pdf'),
          content: bytesToBase64(attachmentBytes),
        }];
      }

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
      if (item.template_key === 'training_convocation' || item.template_key === 'training_attestation') {
        const automationKey = String(item.payload?.automation_key ?? '').trim();
        if (automationKey) {
          await supabase.from('training_documents').update({ emailed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('automation_key', automationKey);
        }
      }
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

  return new Response(JSON.stringify({ documents: documentJobs, emails: { claimed: items.length, sent, failed } }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
