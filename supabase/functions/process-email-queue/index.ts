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
  const dark = rgb(0.075, 0.1, 0.15);
  const muted = rgb(0.38, 0.43, 0.5);
  const line = rgb(0.87, 0.89, 0.93);
  const surface = rgb(0.968, 0.975, 0.985);
  const accentPale = rgb(
    accent.red + (1 - accent.red) * 0.9,
    accent.green + (1 - accent.green) * 0.9,
    accent.blue + (1 - accent.blue) * 0.9,
  );
  const margin = 42;
  const width = page.getWidth();
  const height = page.getHeight();
  const contentWidth = width - margin * 2;

  const drawText = (value: unknown, x: number, y: number, size: number, font = regular, color = dark) => {
    page.drawText(normalizePdfText(value), { x, y, size, font, color });
  };
  const wrap = (value: unknown, size: number, maxWidth: number, font = regular) =>
    wrapPdfText(normalizePdfText(value), font, size, maxWidth);
  const drawParagraph = (value: unknown, x: number, startY: number, size: number, maxWidth: number, maxLines = 12, color = muted) => {
    let currentY = startY;
    for (const lineText of wrap(value, size, maxWidth).slice(0, maxLines)) {
      drawText(lineText, x, currentY, size, regular, color);
      currentY -= size * 1.45;
    }
    return currentY;
  };

  const embedPayloadImage = async (value: unknown) => {
    const url = safeImageUrl(value);
    if (!url) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const contentType = response.headers.get('content-type') ?? '';
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (contentType.includes('png') || url.toLowerCase().includes('.png')) return await pdf.embedPng(bytes);
      if (contentType.includes('jpeg') || contentType.includes('jpg') || /\.(jpe?g)(?:$|\?)/i.test(url)) return await pdf.embedJpg(bytes);
      return null;
    } catch {
      return null;
    }
  };

  // En-tête premium : logo isolé dans son propre bloc, sans chevauchement avec l'adresse.
  const heroHeight = 164;
  page.drawRectangle({ x: 0, y: height - heroHeight, width, height: heroHeight, color: dark });
  page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: accent });
  page.drawRectangle({ x: width - 116, y: height - heroHeight, width: 116, height: heroHeight, color: accent, opacity: 0.18 });

  const logoBox = { x: margin, y: height - 88, width: 118, height: 52 };
  page.drawRectangle({ ...logoBox, color: rgb(1, 1, 1), opacity: 0.98 });
  const embeddedLogo = await embedPayloadImage(payload.organization_logo_url);
  if (embeddedLogo) {
    const scale = Math.min(96 / embeddedLogo.width, 34 / embeddedLogo.height, 1);
    page.drawImage(embeddedLogo, {
      x: logoBox.x + (logoBox.width - embeddedLogo.width * scale) / 2,
      y: logoBox.y + (logoBox.height - embeddedLogo.height * scale) / 2,
      width: embeddedLogo.width * scale,
      height: embeddedLogo.height * scale,
    });
  } else {
    const initials = normalizePdfText(payload.organization_name || 'OF').slice(0, 2).toUpperCase();
    drawText(initials, logoBox.x + 45, logoBox.y + 18, 15, bold, accent);
  }

  const organization = normalizePdfText(payload.organization_name || 'Organisme de formation');
  const brandX = logoBox.x + logoBox.width + 18;
  drawText(organization, brandX, height - 53, 11, bold, rgb(1, 1, 1));
  const address = normalizePdfText(payload.organization_address || payload.site_address);
  if (address) drawText(address.slice(0, 78), brandX, height - 69, 7.2, regular, rgb(0.78, 0.82, 0.88));
  const contact = [payload.contact_email, payload.contact_phone].filter(Boolean).map(normalizePdfText).join(' · ');
  if (contact) drawText(contact.slice(0, 78), brandX, height - 82, 7.2, regular, rgb(0.78, 0.82, 0.88));

  const title = kind === 'attestation' ? 'Attestation de fin de formation' : 'Convocation à une formation';
  drawText(kind === 'attestation' ? 'FORMATION · DOCUMENT DE CLÔTURE' : 'FORMATION · DOCUMENT PERSONNEL', margin, height - 112, 6.8, bold, accent);
  drawText(title, margin, height - 140, kind === 'attestation' ? 21 : 22, bold, rgb(1, 1, 1));
  const reference = normalizePdfText(String(payload.job_id ?? '').replaceAll('-', '').slice(0, 12).toUpperCase()) || 'NCR-SUITE';
  const refWidth = bold.widthOfTextAtSize(reference, 7.5);
  page.drawRectangle({ x: width - margin - refWidth - 20, y: height - 126, width: refWidth + 20, height: 23, color: accent });
  drawText(reference, width - margin - refWidth - 10, height - 118, 7.5, bold, rgb(1, 1, 1));

  const traineeName = normalizePdfText(`${payload.trainee_first_name ?? ''} ${payload.trainee_last_name ?? ''}`);
  const company = normalizePdfText(payload.trainee_company);
  const program = normalizePdfText(payload.program_title || payload.session_title || 'Formation');
  const session = normalizePdfText(payload.session_title || program);
  const trainer = normalizePdfText(payload.trainer_name) || 'À définir';
  const location = normalizePdfText(payload.location || payload.site_address || payload.organization_address || 'À confirmer');
  const modalityLabels: Record<string, string> = { presentiel: 'Présentiel', distanciel: 'Distanciel', hybride: 'Hybride' };
  const modality = modalityLabels[String(payload.modality ?? '')] ?? (normalizePdfText(payload.modality) || 'À confirmer');
  const starts = formatTrainingDate(payload.starts_at, timezone, true);
  const ends = formatTrainingDate(payload.ends_at, timezone, true);
  const duration = Number(payload.duration_hours ?? 0);
  let y = height - heroHeight - 28;

  // Bloc bénéficiaire.
  page.drawRectangle({ x: margin, y: y - 72, width: contentWidth, height: 72, color: accentPale, borderColor: line, borderWidth: 0.7 });
  page.drawRectangle({ x: margin, y: y - 72, width: 6, height: 72, color: accent });
  drawText(kind === 'attestation' ? 'BÉNÉFICIAIRE ATTESTÉ' : 'DESTINATAIRE DE LA CONVOCATION', margin + 18, y - 19, 6.2, bold, accent);
  drawText(traineeName || 'Stagiaire à compléter', margin + 18, y - 42, 13, bold, dark);
  if (company) drawText(company, margin + 18, y - 59, 8, regular, muted);
  y -= 96;

  const intro = kind === 'attestation'
    ? `${organization} atteste que ${traineeName}${company ? `, rattaché(e) à ${company}` : ''}, a participé à la formation décrite ci-dessous.`
    : `${traineeName}${company ? ` (${company})` : ''} est convoqué(e) à la session de formation décrite ci-dessous.`;
  y = drawParagraph(intro, margin, y, 10, contentWidth, 5, dark) - 12;

  // Grille de renseignements, toujours séparée du logo et de l'adresse.
  const fields: Array<[string, string]> = [
    ['Formation', program],
    ['Session', session],
    ['Début', starts],
    ['Fin', ends],
    ['Durée prévue', duration > 0 ? `${String(duration).replace('.', ',')} heures` : 'À confirmer'],
    ['Modalité', modality],
    ['Lieu / accès', location],
    ['Formateur', trainer],
  ];
  const columnWidth = (contentWidth - 10) / 2;
  fields.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + column * (columnWidth + 10);
    const fieldY = y - row * 50;
    page.drawRectangle({ x, y: fieldY - 40, width: columnWidth, height: 40, color: row % 2 === 0 ? surface : rgb(1, 1, 1), borderColor: line, borderWidth: 0.55 });
    drawText(label.toUpperCase(), x + 11, fieldY - 14, 5.7, bold, accent);
    const valueLines = wrap(value || 'À confirmer', 8.1, columnWidth - 22, bold).slice(0, 2);
    valueLines.forEach((lineText, lineIndex) => drawText(lineText, x + 11, fieldY - 29 - lineIndex * 10, 8.1, bold, dark));
  });
  y -= Math.ceil(fields.length / 2) * 50 + 10;

  if (kind === 'convocation') {
    const objectives = normalizePdfText(payload.program_objectives);
    if (objectives) {
      drawText('OBJECTIFS PRINCIPAUX', margin, y, 6.4, bold, accent);
      y -= 18;
      y = drawParagraph(objectives, margin, y, 8.5, contentWidth, 6, muted) - 10;
    }
    const footer = normalizePdfText(payload.document_footer);
    if (footer && y > 120) {
      const lines = wrap(footer, 7.5, contentWidth - 24).slice(0, 4);
      const boxHeight = 33 + lines.length * 11;
      page.drawRectangle({ x: margin, y: y - boxHeight, width: contentWidth, height: boxHeight, color: accentPale });
      drawText('INFORMATIONS PRATIQUES', margin + 12, y - 18, 6.2, bold, accent);
      lines.forEach((lineText, index) => drawText(lineText, margin + 12, y - 35 - index * 11, 7.5, regular, muted));
      y -= boxHeight + 8;
    }
  } else {
    const present = Number(payload.attendance_present ?? 0);
    const absent = Number(payload.attendance_absent ?? 0);
    const excused = Number(payload.attendance_excused ?? 0);
    page.drawRectangle({ x: margin, y: y - 70, width: contentWidth, height: 70, color: dark });
    const stats = [
      ['PRÉSENCES SIGNÉES', String(present)],
      ['ABSENCES', String(absent)],
      ['JUSTIFIÉES', String(excused)],
    ];
    stats.forEach(([label, value], index) => {
      const x = margin + 24 + index * 165;
      drawText(label, x, y - 22, 5.8, bold, index === 0 ? accent : rgb(0.7, 0.75, 0.82));
      drawText(value, x, y - 51, 18, bold, rgb(1, 1, 1));
    });
    y -= 94;
    const signatoryName = normalizePdfText(payload.signatory_name) || normalizePdfText(payload.organization_legal_representative) || 'Le responsable de l’organisme';
    const signatoryTitle = normalizePdfText(payload.signatory_title) || 'Pour l’organisme de formation';
    page.drawRectangle({ x: margin, y: y - 98, width: contentWidth, height: 98, color: surface, borderColor: line, borderWidth: 0.7 });
    drawText('CERTIFICATION DE L’ORGANISME', margin + 14, y - 20, 6.2, bold, accent);
    drawText(`Fait le ${formatTrainingDate(new Date().toISOString(), timezone)}`, margin + 14, y - 41, 8, regular, muted);
    drawText(signatoryName, margin + 14, y - 64, 10, bold, dark);
    drawText(signatoryTitle, margin + 14, y - 80, 7.5, regular, muted);
    const signature = await embedPayloadImage(payload.organization_signature_url);
    const stamp = await embedPayloadImage(payload.organization_stamp_url);
    if (signature) {
      const scale = Math.min(112 / signature.width, 43 / signature.height, 1);
      page.drawImage(signature, { x: margin + 252, y: y - 82, width: signature.width * scale, height: signature.height * scale });
    }
    if (stamp) {
      const scale = Math.min(70 / stamp.width, 55 / stamp.height, 1);
      page.drawImage(stamp, { x: width - margin - stamp.width * scale - 16, y: y - 84, width: stamp.width * scale, height: stamp.height * scale, opacity: 0.82 });
    }
  }

  // Pied de page légal commun.
  page.drawLine({ start: { x: margin, y: 48 }, end: { x: width - margin, y: 48 }, thickness: 0.8, color: line });
  const legal = [
    payload.organization_siret ? `SIRET ${normalizePdfText(payload.organization_siret)}` : '',
    payload.organization_nda_number ? `NDA ${normalizePdfText(payload.organization_nda_number)}` : '',
    payload.organization_vat_number ? `TVA ${normalizePdfText(payload.organization_vat_number)}` : '',
  ].filter(Boolean).join(' · ');
  drawText(legal || `Référence ${reference}`, margin, 31, 6.5, regular, muted);
  const branding = payload.show_ncr_branding !== false ? 'Document généré par NCR Suite' : reference;
  const brandingWidth = regular.widthOfTextAtSize(normalizePdfText(branding), 6.5);
  drawText(branding, width - margin - brandingWidth, 31, 6.5, regular, muted);

  pdf.setTitle(`${title} - ${traineeName}`);
  pdf.setAuthor(organization);
  pdf.setSubject(program);
  pdf.setCreator('NCR Suite');
  pdf.setProducer('NCR Suite V2.18.0');
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
      const trainingPayload = { ...((rawPayload ?? {}) as Record<string, unknown>) };
      if (!trainingPayload.job_id) throw new Error('Données de génération introuvables.');

      const { data: organizationProfile, error: organizationError } = await supabase
        .from('organizations')
        .select('name,public_name,logo_url,primary_color,timezone,company_address,company_postal_code,company_city,company_email,company_phone,company_siret,training_nda_number,training_vat_number,training_legal_representative,training_document_footer,training_signature_url,training_stamp_url,show_ncr_branding,training_attestation_requires_final_evaluation')
        .eq('id', job.organization_id)
        .maybeSingle();
      if (organizationError) throw organizationError;
      if (organizationProfile) {
        Object.assign(trainingPayload, {
          organization_name: organizationProfile.public_name || organizationProfile.name,
          organization_logo_url: organizationProfile.logo_url,
          organization_primary_color: organizationProfile.primary_color,
          organization_timezone: organizationProfile.timezone || trainingPayload.organization_timezone || 'Europe/Paris',
          organization_address: [organizationProfile.company_address, organizationProfile.company_postal_code, organizationProfile.company_city].filter(Boolean).join(' '),
          contact_email: organizationProfile.company_email,
          contact_phone: organizationProfile.company_phone,
          organization_siret: organizationProfile.company_siret,
          organization_nda_number: organizationProfile.training_nda_number,
          organization_vat_number: organizationProfile.training_vat_number,
          organization_legal_representative: organizationProfile.training_legal_representative,
          document_footer: organizationProfile.training_document_footer,
          organization_signature_url: organizationProfile.training_signature_url,
          organization_stamp_url: organizationProfile.training_stamp_url,
          show_ncr_branding: organizationProfile.show_ncr_branding
        });
      }
      const programId = String(trainingPayload.program_id ?? '').trim();
      if (programId) {
        const { data: programProfile, error: programError } = await supabase
          .from('training_programs')
          .select('title,objectives,modality,duration_hours')
          .eq('organization_id', job.organization_id)
          .eq('id', programId)
          .maybeSingle();
        if (programError) throw programError;
        if (programProfile) {
          trainingPayload.program_title = programProfile.title || trainingPayload.program_title;
          trainingPayload.program_objectives = programProfile.objectives || trainingPayload.program_objectives;
          trainingPayload.modality = programProfile.modality || trainingPayload.modality;
          trainingPayload.duration_hours = programProfile.duration_hours || trainingPayload.duration_hours;
        }
      }

      if (job.document_kind === 'attestation') {
        if (String(trainingPayload.session_status) !== 'completed') throw new Error('La session n’est pas terminée.');
        if (Number(trainingPayload.attendance_present ?? 0) < 1) {
          throw new Error('ATTENDANCE_REQUIRED: aucune présence signée pour ce stagiaire.');
        }
        if (organizationProfile?.training_attestation_requires_final_evaluation !== false) {
          const { data: finalEvaluation, error: finalEvaluationError } = await supabase
            .from('training_satisfaction_surveys')
            .select('id')
            .eq('organization_id', job.organization_id)
            .eq('session_id', job.session_id)
            .eq('trainee_id', job.trainee_id)
            .eq('evaluation_type', 'final')
            .eq('status', 'completed')
            .maybeSingle();
          if (finalEvaluationError) throw finalEvaluationError;
          if (!finalEvaluation) throw new Error('FINAL_EVALUATION_REQUIRED: évaluation finale non complétée.');
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
      if (job.document_kind === 'attestation') {
        const { error: refreshError } = await supabase.rpc('refresh_training_session_dossier_completion', {
          p_organization_id: job.organization_id,
          p_session_id: job.session_id,
        });
        if (refreshError) console.error('Training dossier refresh:', refreshError);
      }
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
    case 'training_satisfaction_request': {
      const isInitial = String(payload.evaluation_type ?? 'final') === 'initial';
      const isReminder = payload.is_reminder === true;
      const program = String(payload.program_title ?? payload.session_title ?? 'Formation');
      return {
        subject: `${isReminder ? 'Rappel — ' : ''}${isInitial ? 'Préparez votre formation' : 'Votre avis sur la formation'} — ${organization}`,
        eyebrow: isReminder ? 'RAPPEL PERSONNEL' : isInitial ? 'ÉVALUATION DE DÉBUT' : 'ÉVALUATION DE FIN',
        title: isInitial ? 'Préparons votre formation' : 'Votre avis compte',
        message: isInitial
          ? `Partagez votre niveau, vos attentes et vos besoins avant la formation « ${program} ».`
          : `Prenez quelques instants pour évaluer la formation « ${program} ».`
      };
    }
    case 'training_commercial_document': {
      const typeLabels: Record<string, string> = { quote: 'Devis', agreement: 'Convention', contract: 'Contrat' };
      const label = typeLabels[String(payload.document_type ?? '')] ?? 'Document';
      return {
        subject: `${label} ${String(payload.document_reference ?? '')} — ${organization}`,
        eyebrow: `${label.toUpperCase()} DE FORMATION`,
        title: `${label} prêt à être consulté`,
        message: `Vous trouverez en pièce jointe le document ${String(payload.document_reference ?? '')} relatif à la formation « ${String(payload.program_title ?? payload.document_title ?? 'Formation')} ».`
      };
    }
    case 'training_invoice': {
      const isCredit = String(payload.document_kind ?? 'invoice') === 'credit_note';
      const isReminder = payload.is_reminder === true;
      const reference = String(payload.invoice_number ?? '');
      return {
        subject: `${isReminder ? 'Rappel — ' : ''}${isCredit ? 'Avoir' : 'Facture'} ${reference} — ${organization}`,
        eyebrow: isReminder ? 'RAPPEL DE PAIEMENT' : isCredit ? 'AVOIR DE FORMATION' : 'FACTURE DE FORMATION',
        title: isReminder ? `Échéance dépassée pour ${reference}` : `${isCredit ? 'Votre avoir' : 'Votre facture'} est disponible`,
        message: isReminder
          ? `Sauf erreur de notre part, le solde de la facture ${reference} reste à régler.`
          : `Vous trouverez en pièce jointe ${isCredit ? 'votre avoir' : 'votre facture'} ${reference}.`
      };
    }
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
  if (item.template_key === 'training_commercial_document') {
    const accent = safeColor(payload.organization_primary_color);
    const organizationRaw = String(payload.organization_name ?? 'Votre organisme de formation');
    const organization = escapeHtml(organizationRaw);
    const recipient = escapeHtml(item.recipient_name ?? '');
    const reference = escapeHtml(payload.document_reference ?? '');
    const title = escapeHtml(payload.document_title ?? payload.program_title ?? 'Formation');
    const program = escapeHtml(payload.program_title ?? payload.document_title ?? 'Formation');
    const validUntil = payload.valid_until ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(`${String(payload.valid_until)}T12:00:00`)) : 'Sans échéance';
    const amount = formatPrice(payload.amount_incl_tax_cents);
    const contactEmail = String(payload.reply_to_email ?? payload.contact_email ?? '').trim();
    const contactPhone = String(payload.contact_phone ?? '').trim();
    const returnInstructions = escapeHtml(payload.return_instructions ?? 'Merci de nous retourner le document signé.');
    const organizationLogoUrl = safeImageUrl(payload.organization_logo_url);
    const logo = organizationLogoUrl
      ? `<img src="${escapeHtml(organizationLogoUrl)}" alt="${organization}" style="display:block;max-width:190px;max-height:70px;object-fit:contain">`
      : `<div style="display:inline-flex;align-items:center;justify-content:center;width:58px;height:58px;border-radius:18px;background:${accent};color:#fff;font-size:22px;font-weight:800">${organization.slice(0, 2).toUpperCase()}</div>`;
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:650px;background:#fff;border-radius:30px;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,.12)">
<tr><td style="height:9px;background:${accent}"></td></tr>
<tr><td style="padding:36px 36px 18px">${logo}<div style="font-size:11px;letter-spacing:.14em;font-weight:800;color:${accent};margin-top:26px">${escapeHtml(copy.eyebrow)}</div><h1 style="font-size:31px;line-height:1.13;margin:10px 0 12px;color:#111827">${escapeHtml(copy.title)}</h1><p style="font-size:16px;line-height:1.65;color:#64748b;margin:0">${recipient ? `Bonjour ${recipient}, ` : ''}${escapeHtml(copy.message)}</p></td></tr>
<tr><td style="padding:14px 36px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden">
<tr><td style="padding:16px 18px;color:#64748b">Référence</td><td align="right" style="padding:16px 18px;font-weight:800">${reference}</td></tr>
<tr><td style="padding:16px 18px;border-top:1px solid #e2e8f0;color:#64748b">Formation</td><td align="right" style="padding:16px 18px;border-top:1px solid #e2e8f0;font-weight:800">${program}</td></tr>
<tr><td style="padding:16px 18px;border-top:1px solid #e2e8f0;color:#64748b">Objet</td><td align="right" style="padding:16px 18px;border-top:1px solid #e2e8f0;font-weight:800">${title}</td></tr>
${amount ? `<tr><td style="padding:16px 18px;border-top:1px solid #e2e8f0;color:#64748b">Montant TTC</td><td align="right" style="padding:16px 18px;border-top:1px solid #e2e8f0;font-weight:800">${escapeHtml(amount)}</td></tr>` : ''}
<tr><td style="padding:16px 18px;border-top:1px solid #e2e8f0;color:#64748b">Validité</td><td align="right" style="padding:16px 18px;border-top:1px solid #e2e8f0;font-weight:800">${escapeHtml(validUntil)}</td></tr>
</table></td></tr>
<tr><td style="padding:24px 36px 30px"><div style="display:inline-block;background:${accent};color:#fff;font-weight:800;padding:14px 24px;border-radius:999px">Document PDF joint</div><p style="font-size:14px;line-height:1.65;color:#64748b;margin:20px 0 0"><strong style="color:#111827">Retour du document :</strong> ${returnInstructions}</p></td></tr>
<tr><td style="padding:22px 36px 32px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;line-height:1.7">${contactEmail || contactPhone ? `Une question ? ${[contactEmail, contactPhone].filter(Boolean).map(escapeHtml).join(' · ')}<br>` : ''}${payload.show_ncr_branding !== false ? `Document transmis par NCR Suite pour ${organization}.` : `E-mail envoyé automatiquement pour ${organization}.`}</td></tr>
</table></td></tr></table></body></html>`;
    const text = `${copy.title}\n\n${copy.message}\n\nRéférence : ${payload.document_reference ?? ''}\nFormation : ${payload.program_title ?? payload.document_title ?? ''}${amount ? `\nMontant TTC : ${amount}` : ''}\nValidité : ${validUntil}\n\n${payload.return_instructions ?? ''}\n\nLe document PDF est joint à cet e-mail.`;
    return { subject: copy.subject, html, text, replyTo: contactEmail || null };
  }
  if (item.template_key === 'training_invoice') {
    const accent = safeColor(payload.organization_primary_color);
    const organizationRaw = String(payload.organization_name ?? 'Votre organisme de formation');
    const organization = escapeHtml(organizationRaw);
    const recipient = escapeHtml(item.recipient_name ?? payload.buyer_name ?? '');
    const reference = escapeHtml(payload.invoice_number ?? '');
    const title = escapeHtml(payload.document_title ?? 'Prestation de formation');
    const isCredit = String(payload.document_kind ?? 'invoice') === 'credit_note';
    const isReminder = payload.is_reminder === true;
    const dueDate = payload.due_date
      ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(`${String(payload.due_date)}T12:00:00`))
      : 'À réception';
    const total = formatPrice(payload.total_cents);
    const balance = formatPrice(payload.balance_due_cents);
    const contactEmail = String(payload.reply_to_email ?? payload.contact_email ?? '').trim();
    const contactPhone = String(payload.contact_phone ?? '').trim();
    const organizationLogoUrl = safeImageUrl(payload.organization_logo_url);
    const logo = organizationLogoUrl
      ? `<img src="${escapeHtml(organizationLogoUrl)}" alt="${organization}" style="display:block;max-width:190px;max-height:70px;object-fit:contain">`
      : `<div style="display:inline-flex;align-items:center;justify-content:center;width:58px;height:58px;border-radius:10px;background:${accent};color:#fff;font-size:22px;font-weight:800">${organization.slice(0, 2).toUpperCase()}</div>`;
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef2f4;font-family:Arial,Helvetica,sans-serif;color:#17212b">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f4;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:650px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 18px 44px rgba(23,33,43,.12)">
<tr><td style="height:8px;background:${accent}"></td></tr>
<tr><td style="padding:34px 36px 18px">${logo}${isReminder ? `<div style="display:inline-block;margin:24px 0 0;background:#fff3e8;color:#a13f15;border:1px solid #f2c8ae;padding:7px 11px;border-radius:6px;font-size:11px;font-weight:800">RELANCE ${Number(payload.reminder_count ?? 1)}</div>` : ''}<div style="font-size:11px;letter-spacing:.14em;font-weight:800;color:${accent};margin-top:24px">${escapeHtml(copy.eyebrow)}</div><h1 style="font-size:29px;line-height:1.15;margin:10px 0 12px;color:#17212b">${escapeHtml(copy.title)}</h1><p style="font-size:16px;line-height:1.65;color:#65717d;margin:0">${recipient ? `Bonjour ${recipient}, ` : ''}${escapeHtml(copy.message)}</p></td></tr>
<tr><td style="padding:14px 36px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8f9;border:1px solid #dfe3e7;border-radius:8px;overflow:hidden">
<tr><td style="padding:15px 18px;color:#65717d">Référence</td><td align="right" style="padding:15px 18px;font-weight:800">${reference}</td></tr>
<tr><td style="padding:15px 18px;border-top:1px solid #dfe3e7;color:#65717d">Objet</td><td align="right" style="padding:15px 18px;border-top:1px solid #dfe3e7;font-weight:800">${title}</td></tr>
<tr><td style="padding:15px 18px;border-top:1px solid #dfe3e7;color:#65717d">${isCredit ? 'Montant de l’avoir' : 'Montant TTC'}</td><td align="right" style="padding:15px 18px;border-top:1px solid #dfe3e7;font-weight:800">${escapeHtml(total)}</td></tr>
${!isCredit ? `<tr><td style="padding:15px 18px;border-top:1px solid #dfe3e7;color:#65717d">Solde à régler</td><td align="right" style="padding:15px 18px;border-top:1px solid #dfe3e7;font-weight:800;color:${isReminder ? '#b42318' : '#17212b'}">${escapeHtml(balance)}</td></tr><tr><td style="padding:15px 18px;border-top:1px solid #dfe3e7;color:#65717d">Échéance</td><td align="right" style="padding:15px 18px;border-top:1px solid #dfe3e7;font-weight:800">${escapeHtml(dueDate)}</td></tr>` : ''}
</table></td></tr>
<tr><td style="padding:24px 36px 30px"><div style="display:inline-block;background:${accent};color:#fff;font-weight:800;padding:13px 22px;border-radius:7px">PDF joint à cet e-mail</div></td></tr>
<tr><td style="padding:22px 36px 32px;border-top:1px solid #dfe3e7;color:#65717d;font-size:13px;line-height:1.7">${contactEmail || contactPhone ? `Une question ? ${[contactEmail, contactPhone].filter(Boolean).map(escapeHtml).join(' · ')}<br>` : ''}E-mail envoyé automatiquement pour ${organization}.</td></tr>
</table></td></tr></table></body></html>`;
    const text = `${copy.title}\n\n${copy.message}\n\nRéférence : ${payload.invoice_number ?? ''}\nObjet : ${payload.document_title ?? ''}\nMontant : ${total}${!isCredit ? `\nSolde : ${balance}\nÉchéance : ${dueDate}` : ''}\n\nLe document PDF est joint à cet e-mail.`;
    return { subject: copy.subject, html, text, replyTo: contactEmail || null };
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
    const isInitial = String(payload.evaluation_type ?? 'final') === 'initial';
    const isReminder = payload.is_reminder === true;
    const buttonLabel = isInitial ? 'Préparer ma formation' : 'Donner mon avis';
    const intro = escapeHtml(payload.intro_text ?? copy.message);
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 12px 35px rgba(0,0,0,.08)">
<tr><td style="height:8px;background:${accent}"></td></tr>
<tr><td style="padding:34px 32px 14px">${emailLogo}${isReminder ? `<div style="display:inline-block;margin-bottom:14px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;padding:7px 11px;border-radius:999px;font-size:11px;font-weight:800">RAPPEL ${Number(payload.reminder_count ?? 1)}</div>` : ''}<div style="font-size:12px;letter-spacing:.12em;font-weight:800;color:${accent}">${escapeHtml(copy.eyebrow)}</div><h1 style="font-size:28px;line-height:1.15;margin:10px 0 12px">${escapeHtml(copy.title)}</h1><p style="font-size:16px;line-height:1.6;color:#6e6e73;margin:0">Bonjour ${trainee}, ${intro}</p></td></tr>
<tr><td style="padding:18px 32px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;border-radius:20px;padding:8px 18px">
<tr><td style="padding:13px 0;color:#6e6e73">Organisme</td><td align="right" style="font-weight:700">${organization}</td></tr>
<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Formation</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${program}</td></tr>
<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Période</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${escapeHtml(formatTrainingDate(payload.starts_at, timezone, true))}</td></tr>
${trainer ? `<tr><td style="padding:13px 0;border-top:1px solid #e5e5e7;color:#6e6e73">Formateur</td><td align="right" style="border-top:1px solid #e5e5e7;font-weight:700">${trainer}</td></tr>` : ''}
</table></td></tr>
<tr><td style="padding:8px 32px 30px"><a href="${escapeHtml(surveyUrl)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:999px">${escapeHtml(buttonLabel)}</a></td></tr>
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
<tr><td style="padding:34px 32px 14px">${emailLogo}${isReminder ? `<div style="display:inline-block;margin-bottom:14px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;padding:7px 11px;border-radius:999px;font-size:11px;font-weight:800">RAPPEL ${Number(payload.reminder_count ?? 1)}</div>` : ''}<div style="font-size:12px;letter-spacing:.12em;font-weight:800;color:${accent}">${escapeHtml(copy.eyebrow)}</div><h1 style="font-size:28px;line-height:1.15;margin:10px 0 12px">${escapeHtml(copy.title)}</h1><p style="font-size:16px;line-height:1.6;color:#6e6e73;margin:0">Bonjour ${trainee}, ${escapeHtml(copy.message)}</p></td></tr>
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
<tr><td style="padding:34px 32px 14px">${emailLogo}${isReminder ? `<div style="display:inline-block;margin-bottom:14px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;padding:7px 11px;border-radius:999px;font-size:11px;font-weight:800">RAPPEL ${Number(payload.reminder_count ?? 1)}</div>` : ''}<div style="font-size:12px;letter-spacing:.12em;font-weight:800;color:${accent}">${escapeHtml(copy.eyebrow)}</div><h1 style="font-size:28px;line-height:1.15;margin:10px 0 12px">${escapeHtml(copy.title)}</h1><p style="font-size:16px;line-height:1.6;color:#6e6e73;margin:0">${clientFirstName && isCustomer ? `Bonjour ${clientFirstName}, ` : ''}${escapeHtml(copy.message)}</p></td></tr>
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

  let remindersQueued = 0;
  try {
    const { data: reminderCount, error: reminderError } = await supabase.rpc('queue_due_training_evaluation_reminders', { p_limit: 100 });
    if (reminderError) throw reminderError;
    remindersQueued = Number(reminderCount ?? 0);
  } catch (caught) {
    console.error('Training evaluation reminder processor:', caught);
  }

  let invoiceRemindersQueued = 0;
  try {
    const { data: reminderCount, error: reminderError } = await supabase.rpc('queue_due_training_invoice_reminders', { p_limit: 100 });
    if (reminderError) throw reminderError;
    invoiceRemindersQueued = Number(reminderCount ?? 0);
  } catch (caught) {
    console.error('Training invoice reminder processor:', caught);
  }

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
      if (item.template_key === 'training_commercial_document') {
        const commercialDocumentId = String(item.payload?.commercial_document_id ?? '').trim();
        if (commercialDocumentId) {
          await supabase.from('training_commercial_documents').update({ emailed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', commercialDocumentId);
        }
      }
      if (item.template_key === 'training_invoice') {
        const trainingInvoiceId = String(item.payload?.training_invoice_id ?? '').trim();
        if (trainingInvoiceId) {
          const sentAt = new Date().toISOString();
          const isReminder = item.payload?.is_reminder === true;
          const { data: invoice } = await supabase.from('training_invoices').select('document_kind,status').eq('id', trainingInvoiceId).maybeSingle();
          const invoicePatch: Record<string, unknown> = { emailed_at: sentAt, updated_at: sentAt };
          if (!isReminder) invoicePatch.sent_at = sentAt;
          if (!isReminder && invoice?.document_kind === 'invoice' && invoice?.status === 'issued') invoicePatch.status = 'sent';
          await supabase.from('training_invoices').update(invoicePatch).eq('id', trainingInvoiceId);
        }
      }
      if (item.template_key === 'training_satisfaction_request') {
        const surveyId = String(item.payload?.survey_id ?? '').trim();
        if (surveyId) {
          const sentAt = new Date().toISOString();
          await supabase.from('training_satisfaction_surveys').update({ status: 'sent', emailed_at: sentAt, updated_at: sentAt }).eq('id', surveyId).neq('status', 'completed');
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

  return new Response(JSON.stringify({ evaluation_reminders_queued: remindersQueued, invoice_reminders_queued: invoiceRemindersQueued, documents: documentJobs, emails: { claimed: items.length, sent, failed } }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
