import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Organization, OrganizationSite } from '../../types';
import {
  personName,
  type TrainingAttendanceRecord,
  type TrainingEnrollmentRecord,
  type TrainingProgramRecord,
  type TrainingSessionRecord,
  type TrainingTraineeRecord,
  type TrainingTrainerRecord
} from './types';

export interface TrainingCertificateOfRealizationPdfInput {
  organization: Organization;
  site?: OrganizationSite | null;
  session: TrainingSessionRecord;
  program?: TrainingProgramRecord | null;
  trainer?: TrainingTrainerRecord | null;
  trainees: TrainingTraineeRecord[];
  enrollments: TrainingEnrollmentRecord[];
  attendance: TrainingAttendanceRecord[];
}

export interface TrainingCertificateOfRealizationPdfResult {
  bytes: Uint8Array;
  filename: string;
}

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 46;

function normalizePdfText(value: unknown) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/•/g, '-')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/…/g, '...')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fontSafeText(value: unknown, font: PDFFont) {
  const normalized = normalizePdfText(value);
  let output = '';
  for (const character of normalized) {
    if (character === '\n') { output += '\n'; continue; }
    try { font.encodeText(character); output += character; }
    catch { /* caractère ignoré plutôt que remplacé par ? */ }
  }
  return output;
}

function safeHex(value: unknown) {
  const raw = String(value ?? '');
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : '#2997ff';
}

function hexRgb(value: unknown) {
  const hex = safeHex(value).slice(1);
  return rgb(
    Number.parseInt(hex.slice(0, 2), 16) / 255,
    Number.parseInt(hex.slice(2, 4), 16) / 255,
    Number.parseInt(hex.slice(4, 6), 16) / 255
  );
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'formation';
}

function formatDate(value: string, timezone: string, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'À confirmer';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    day: '2-digit', month: 'long', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  }).format(date);
}

function wrap(text: unknown, font: PDFFont, size: number, maxWidth: number) {
  const normalized = fontSafeText(text, font);
  const lines: string[] = [];
  for (const paragraph of normalized.split('\n')) {
    if (!paragraph.trim()) { lines.push(''); continue; }
    let current = '';
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
      else { lines.push(current); current = word; }
    }
    if (current) lines.push(current);
  }
  return lines;
}

async function fetchImage(pdf: PDFDocument, url?: string | null): Promise<PDFImage | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('png') || /\.png(?:$|\?)/i.test(url)) return await pdf.embedPng(bytes);
    if (contentType.includes('jpeg') || contentType.includes('jpg') || /\.jpe?g(?:$|\?)/i.test(url)) return await pdf.embedJpg(bytes);
  } catch { return null; }
  return null;
}

function countInclusiveDays(session: TrainingSessionRecord) {
  const start = new Date(session.starts_at);
  const end = new Date(session.ends_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const a = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const b = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.max(1, Math.floor((b - a) / 86_400_000) + 1);
}

function realizedHoursFor(
  enrollment: TrainingEnrollmentRecord | undefined,
  traineeId: string,
  input: TrainingCertificateOfRealizationPdfInput
) {
  const declared = Number(enrollment?.bpf_attended_hours ?? 0);
  if (declared > 0) return declared;
  const planned = Number(input.program?.duration_hours ?? 0);
  if (planned <= 0) return 0;
  const records = input.attendance.filter((row) => row.trainee_id === traineeId && row.session_id === input.session.id);
  if (!records.length) return planned;
  const days = countInclusiveDays(input.session);
  const expectedPeriods = Math.max(days * 2, 1);
  const presentPeriods = records.filter((row) => row.status === 'present').length;
  if (presentPeriods >= expectedPeriods) return planned;
  return Math.max(0, Math.round((planned * presentPeriods / expectedPeriods) * 100) / 100);
}

function drawMultiline(page: PDFPage, value: unknown, x: number, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>, maxWidth: number, lineHeight = size * 1.35, maxLines = 8) {
  let currentY = y;
  for (const line of wrap(value, font, size, maxWidth).slice(0, maxLines)) {
    if (line) page.drawText(line, { x, y: currentY, size, font, color });
    currentY -= lineHeight;
  }
  return currentY;
}

export async function generateCertificateOfRealizationPdf(input: TrainingCertificateOfRealizationPdfInput): Promise<TrainingCertificateOfRealizationPdfResult> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = hexRgb(input.organization.primary_color);
  const dark = rgb(0.07, 0.09, 0.14);
  const muted = rgb(0.39, 0.43, 0.49);
  const line = rgb(0.86, 0.88, 0.91);
  const surface = rgb(0.965, 0.972, 0.982);
  const accentPale = rgb(
    accent.red + (1 - accent.red) * 0.91,
    accent.green + (1 - accent.green) * 0.91,
    accent.blue + (1 - accent.blue) * 0.91
  );
  const timezone = input.organization.timezone || input.site?.timezone || 'Europe/Paris';
  const organizationName = normalizePdfText(input.organization.public_name || input.organization.name || 'Organisme de formation');
  const representative = normalizePdfText(input.organization.training_legal_representative || input.organization.company_contact_name || organizationName);
  const organizationAddress = normalizePdfText([
    input.organization.company_address,
    input.organization.company_postal_code,
    input.organization.company_city
  ].filter(Boolean).join(' ') || input.site?.address || '');
  const trainerName = input.trainer ? personName(input.trainer.first_name, input.trainer.last_name) : '';
  const title = normalizePdfText(input.program?.title || input.session.title || 'Action de formation');
  const modality = input.session.modality === 'presentiel' ? 'Présentiel' : input.session.modality === 'distanciel' ? 'Distanciel' : 'Hybride';
  const location = normalizePdfText(input.session.location || input.site?.address || organizationAddress || 'À confirmer');
  const logo = await fetchImage(pdf, input.organization.logo_url);
  const signature = await fetchImage(pdf, input.organization.training_signature_url);
  const stamp = await fetchImage(pdf, input.organization.training_stamp_url);

  const activeEnrollments = input.enrollments.filter((row) => row.session_id === input.session.id && row.status !== 'canceled');
  const traineeIds = new Set(activeEnrollments.map((row) => row.trainee_id));
  const beneficiaries = input.trainees.filter((trainee) => traineeIds.has(trainee.id));
  if (!beneficiaries.length) throw new Error('Aucun stagiaire actif à certifier sur cette session.');

  beneficiaries.forEach((trainee, index) => {
    const page = pdf.addPage(A4);
    const width = page.getWidth();
    const height = page.getHeight();
    const contentWidth = width - MARGIN * 2;
    const enrollment = activeEnrollments.find((row) => row.trainee_id === trainee.id);
    const realizedHours = realizedHoursFor(enrollment, trainee.id, input);
    const beneficiary = personName(trainee.first_name, trainee.last_name);
    const reference = `CR-${new Date(input.session.ends_at).getFullYear()}-${input.session.id.replace(/-/g, '').slice(0, 6).toUpperCase()}-${String(index + 1).padStart(2, '0')}`;

    page.drawRectangle({ x: 0, y: height - 172, width, height: 172, color: dark });
    page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: accent });
    page.drawRectangle({ x: width - 168, y: height - 172, width: 168, height: 172, color: accent, opacity: 0.11 });

    if (logo) {
      const boxX = MARGIN;
      const boxY = height - 88;
      page.drawRectangle({ x: boxX, y: boxY, width: 116, height: 48, color: rgb(1, 1, 1) });
      const scale = Math.min(94 / logo.width, 31 / logo.height, 1);
      page.drawImage(logo, { x: boxX + (116 - logo.width * scale) / 2, y: boxY + (48 - logo.height * scale) / 2, width: logo.width * scale, height: logo.height * scale });
    }
    const brandX = logo ? MARGIN + 134 : MARGIN;
    page.drawText(fontSafeText(organizationName, bold).slice(0, 58), { x: brandX, y: height - 55, size: 11, font: bold, color: rgb(1, 1, 1) });
    if (organizationAddress) page.drawText(fontSafeText(organizationAddress, regular).slice(0, 78), { x: brandX, y: height - 71, size: 7.2, font: regular, color: rgb(0.78, 0.82, 0.88) });

    page.drawRectangle({ x: MARGIN, y: height - 152, width: 5, height: 43, color: accent });
    page.drawText('FORMATION · JUSTIFICATIF DE RÉALISATION', { x: MARGIN + 15, y: height - 120, size: 6.4, font: bold, color: accent });
    page.drawText('Certificat de réalisation', { x: MARGIN + 15, y: height - 149, size: 22, font: bold, color: rgb(1, 1, 1) });
    const refWidth = bold.widthOfTextAtSize(reference, 7.1);
    page.drawRectangle({ x: width - MARGIN - refWidth - 20, y: height - 128, width: refWidth + 20, height: 24, color: accent });
    page.drawText(reference, { x: width - MARGIN - refWidth - 10, y: height - 120, size: 7.1, font: bold, color: rgb(1, 1, 1) });

    let y = height - 210;
    page.drawRectangle({ x: MARGIN, y: y - 86, width: contentWidth, height: 86, color: accentPale, borderColor: line, borderWidth: 0.7 });
    page.drawRectangle({ x: MARGIN, y: y - 86, width: 6, height: 86, color: accent });
    page.drawText('BÉNÉFICIAIRE', { x: MARGIN + 18, y: y - 20, size: 6.1, font: bold, color: accent });
    page.drawText(fontSafeText(beneficiary, bold), { x: MARGIN + 18, y: y - 46, size: 15, font: bold, color: dark });
    const traineeDetail = [trainee.company, trainee.email].filter(Boolean).join(' · ');
    if (traineeDetail) page.drawText(fontSafeText(traineeDetail, regular).slice(0, 86), { x: MARGIN + 18, y: y - 67, size: 7.7, font: regular, color: muted });
    y -= 116;

    const intro = `Je soussigné(e) ${representative}, représentant ${organizationName}, certifie que ${beneficiary} a réalisé l'action de formation décrite ci-dessous.`;
    y = drawMultiline(page, intro, MARGIN, y, regular, 10.2, dark, contentWidth, 14, 5) - 16;

    const rows: Array<[string, string]> = [
      ['Action de formation', title],
      ['Période', `${formatDate(input.session.starts_at, timezone)} au ${formatDate(input.session.ends_at, timezone)}`],
      ['Durée réalisée', realizedHours > 0 ? `${String(realizedHours).replace('.', ',')} heures` : 'À confirmer'],
      ['Modalité', modality],
      ['Lieu / accès', location],
      ['Formateur', trainerName || 'À confirmer']
    ];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const [label, value] = rows[rowIndex];
      const rowHeight = rowIndex === 4 ? 50 : 42;
      page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: contentWidth, height: rowHeight, color: rowIndex % 2 === 0 ? surface : rgb(1, 1, 1), borderColor: line, borderWidth: 0.55 });
      page.drawText(label.toUpperCase(), { x: MARGIN + 13, y: y - 17, size: 5.7, font: bold, color: accent });
      const valueLines = wrap(value, bold, 8.5, contentWidth - 155).slice(0, 2);
      valueLines.forEach((lineText, lineIndex) => page.drawText(lineText, { x: MARGIN + 145, y: y - 18 - lineIndex * 11, size: 8.5, font: bold, color: dark }));
      y -= rowHeight;
    }
    y -= 20;

    page.drawRectangle({ x: MARGIN, y: y - 116, width: contentWidth, height: 116, color: surface, borderColor: line, borderWidth: 0.7 });
    page.drawText('ATTESTATION DE L’ORGANISME', { x: MARGIN + 15, y: y - 21, size: 6.2, font: bold, color: accent });
    page.drawText(`Établi le ${formatDate(new Date().toISOString(), timezone)}`, { x: MARGIN + 15, y: y - 44, size: 8, font: regular, color: muted });
    page.drawText(fontSafeText(representative, bold), { x: MARGIN + 15, y: y - 68, size: 10, font: bold, color: dark });
    page.drawText('Pour l’organisme de formation', { x: MARGIN + 15, y: y - 84, size: 7.5, font: regular, color: muted });
    if (signature) {
      const scale = Math.min(118 / signature.width, 48 / signature.height, 1);
      page.drawImage(signature, { x: MARGIN + 257, y: y - 92, width: signature.width * scale, height: signature.height * scale });
    }
    if (stamp) {
      const scale = Math.min(74 / stamp.width, 60 / stamp.height, 1);
      page.drawImage(stamp, { x: width - MARGIN - stamp.width * scale - 16, y: y - 98, width: stamp.width * scale, height: stamp.height * scale, opacity: 0.84 });
    }

    page.drawLine({ start: { x: MARGIN, y: 49 }, end: { x: width - MARGIN, y: 49 }, thickness: 0.8, color: line });
    const legal = [
      input.organization.company_siret ? `SIRET ${normalizePdfText(input.organization.company_siret)}` : '',
      input.organization.training_nda_number ? `NDA ${normalizePdfText(input.organization.training_nda_number)}` : ''
    ].filter(Boolean).join(' · ');
    page.drawText(fontSafeText(organizationName, bold), { x: MARGIN, y: 35, size: 6.4, font: bold, color: dark });
    page.drawText(fontSafeText(legal || reference, regular), { x: MARGIN, y: 23, size: 5.8, font: regular, color: muted });
    const footerRight = input.organization.show_ncr_branding === false ? reference : `NCR Suite · ${reference}`;
    page.drawText(fontSafeText(footerRight, bold), { x: width - MARGIN - bold.widthOfTextAtSize(fontSafeText(footerRight, bold), 6), y: 29, size: 6, font: bold, color: muted });
  });

  pdf.setTitle(`Certificats de réalisation - ${input.session.title}`);
  pdf.setAuthor(organizationName);
  pdf.setSubject('Certificat de réalisation d’une action de formation');
  pdf.setCreator('NCR Suite');
  pdf.setProducer('NCR Suite V2.29.25');

  return {
    bytes: await pdf.save(),
    filename: `certificats-realisation-${slugify(input.session.title)}.pdf`
  };
}
