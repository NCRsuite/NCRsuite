import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Organization, OrganizationSite } from '../../types';
import {
  attendanceStatusLabels,
  personName,
  type TrainingAttendanceRecord,
  type TrainingProgramRecord,
  type TrainingSessionRecord,
  type TrainingTraineeRecord,
  type TrainingTrainerRecord
} from './types';

export interface AttendancePdfInput {
  organization: Organization;
  site?: OrganizationSite | null;
  session: TrainingSessionRecord;
  program?: TrainingProgramRecord | null;
  trainer?: TrainingTrainerRecord | null;
  attendanceDate: string;
  trainees: TrainingTraineeRecord[];
  records: TrainingAttendanceRecord[];
  signatureFiles: Map<string, Blob>;
  blank?: boolean;
}

export interface AttendancePdfResult {
  bytes: Uint8Array;
  filename: string;
}

const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
const MARGIN = 34;
const HEADER_HEIGHT = 176;
const FOOTER_HEIGHT = 42;
const ROW_HEIGHT = 58;
const TABLE_HEADER_HEIGHT = 34;
const PARTICIPANT_WIDTH = 220;
const PERIOD_WIDTH = (A4_LANDSCAPE[0] - MARGIN * 2 - PARTICIPANT_WIDTH) / 2;

function normalizePdfText(value: unknown) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[→⇒⟶➜➝]/g, ' au ')
    .replace(/[←⇐⟵]/g, ' - ')
    .replace(/•/g, '-')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/…/g, '...')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function singleLinePdfText(value: unknown) {
  return normalizePdfText(value).replace(/\n+/g, ' · ');
}

function safeHexColor(value: unknown) {
  const color = String(value ?? '');
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#2997ff';
}

function hexToRgb(value: unknown) {
  const color = safeHexColor(value).slice(1);
  return rgb(
    Number.parseInt(color.slice(0, 2), 16) / 255,
    Number.parseInt(color.slice(2, 4), 16) / 255,
    Number.parseInt(color.slice(4, 6), 16) / 255
  );
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'session';
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string, timezone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'À confirmer';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number, maxLines = 2) {
  const normalized = normalizePdfText(text);
  const lines: string[] = [];
  let truncated = false;
  for (const paragraph of normalized.split('\n')) {
    if (lines.length >= maxLines) { truncated = true; break; }
    if (!paragraph.trim()) {
      if (lines.length && lines[lines.length - 1] !== '') lines.push('');
      continue;
    }
    let current = '';
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
      else {
        lines.push(current);
        current = word;
        if (lines.length >= maxLines) { truncated = true; break; }
      }
    }
    if (current && lines.length < maxLines) lines.push(current);
    if (truncated) break;
  }
  if (truncated && lines.length) {
    const last = lines[lines.length - 1];
    if (last && font.widthOfTextAtSize(`${last}...`, size) <= maxWidth) lines[lines.length - 1] = `${last}...`;
  }
  return lines;
}

async function fetchLogo(pdf: PDFDocument, url?: string | null): Promise<PDFImage | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('png')) return await pdf.embedPng(bytes);
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
  return null;
}

async function embedSignature(pdf: PDFDocument, blob: Blob | undefined): Promise<PDFImage | null> {
  if (!blob) return null;
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const isPng = bytes.length > 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (isPng) return await pdf.embedPng(bytes);
    if (isJpeg) return await pdf.embedJpg(bytes);
    try { return await pdf.embedPng(bytes); }
    catch { return await pdf.embedJpg(bytes); }
  } catch {
    return null;
  }
}

function recordKey(traineeId: string, period: 'morning' | 'afternoon') {
  return `${traineeId}:${period}`;
}

function drawPageHeader(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  input: AttendancePdfInput,
  logo: PDFImage | null,
  pageIndex: number,
  totalPages: number
) {
  const width = page.getWidth();
  const height = page.getHeight();
  const accent = hexToRgb(input.organization.primary_color);
  const dark = rgb(0.07, 0.09, 0.14);
  const muted = rgb(0.39, 0.43, 0.49);
  const lightText = rgb(0.78, 0.82, 0.88);
  const surface = rgb(0.965, 0.972, 0.982);
  const border = rgb(0.86, 0.88, 0.91);

  page.drawRectangle({ x: 0, y: height - 126, width, height: 126, color: dark });
  page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: accent });
  page.drawRectangle({ x: width - 188, y: height - 126, width: 188, height: 126, color: accent, opacity: 0.10 });

  let brandX = MARGIN;
  if (logo) {
    const boxW = 112;
    const boxH = 48;
    const boxY = height - 69;
    page.drawRectangle({ x: MARGIN, y: boxY, width: boxW, height: boxH, color: rgb(1, 1, 1), borderColor: border, borderWidth: 0.5 });
    const scale = Math.min(90 / logo.width, 31 / logo.height, 1);
    const logoWidth = logo.width * scale;
    const logoHeight = logo.height * scale;
    page.drawImage(logo, { x: MARGIN + (boxW - logoWidth) / 2, y: boxY + (boxH - logoHeight) / 2, width: logoWidth, height: logoHeight });
    brandX += boxW + 17;
  }

  const organizationName = singleLinePdfText(input.organization.public_name || input.organization.name || 'Organisme de formation');
  page.drawText(organizationName.slice(0, 58), { x: brandX, y: height - 41, size: 11, font: bold, color: rgb(1, 1, 1) });
  const address = singleLinePdfText(input.site?.address || input.organization.booking_address || [input.organization.company_address, input.organization.company_postal_code, input.organization.company_city].filter(Boolean).join(' '));
  if (address) page.drawText(address.slice(0, 82), { x: brandX, y: height - 57, size: 7.4, font: regular, color: lightText });

  page.drawRectangle({ x: MARGIN, y: height - 116, width: 5, height: 35, color: accent });
  page.drawText(input.blank ? "FORMATION · FEUILLE À SIGNER" : "FORMATION · PREUVE DE PRÉSENCE", { x: MARGIN + 15, y: height - 88, size: 6.1, font: bold, color: accent });
  page.drawText(input.blank ? "FEUILLE D'ÉMARGEMENT VIERGE" : "FEUILLE D'ÉMARGEMENT", { x: MARGIN + 15, y: height - 111, size: 18.5, font: bold, color: rgb(1, 1, 1) });

  const dateBadge = formatDay(input.attendanceDate).toUpperCase();
  const badgeW = Math.min(188, Math.max(122, bold.widthOfTextAtSize(dateBadge, 7.1) + 24));
  page.drawRectangle({ x: width - MARGIN - badgeW, y: height - 101, width: badgeW, height: 28, color: accent });
  page.drawText(dateBadge, { x: width - MARGIN - badgeW + 12, y: height - 92, size: 7.1, font: bold, color: rgb(1, 1, 1) });

  const metaY = height - 142;
  const gap = 8;
  const cardW = (width - MARGIN * 2 - gap * 3) / 4;
  const timezone = input.organization.timezone || 'Europe/Paris';
  const trainerName = input.trainer ? personName(input.trainer.first_name, input.trainer.last_name) : 'À définir';
  const cards: Array<[string, string]> = [
    ['SESSION', input.session.title || input.program?.title || 'Formation'],
    ['FORMATEUR', trainerName],
    ['LIEU', input.session.location || input.site?.name || input.site?.address || 'À confirmer'],
    ['PARTICIPANTS', `${input.trainees.length} stagiaire${input.trainees.length > 1 ? 's' : ''}`]
  ];
  cards.forEach(([label, value], index) => {
    const x = MARGIN + index * (cardW + gap);
    page.drawRectangle({ x, y: metaY - 30, width: cardW, height: 30, color: surface, borderColor: border, borderWidth: 0.55 });
    page.drawText(label, { x: x + 9, y: metaY - 10, size: 5.3, font: bold, color: accent });
    const display = index === 0 ? value : singleLinePdfText(value);
    const lines = wrapText(display, bold, 7.4, cardW - 18, 2);
    lines.forEach((line, lineIndex) => page.drawText(line, { x: x + 9, y: metaY - 22 - lineIndex * 8.5, size: 7.4, font: bold, color: dark }));
  });

  page.drawText(`Horaires session : ${formatDateTime(input.session.starts_at, timezone)} au ${formatDateTime(input.session.ends_at, timezone)}`, {
    x: MARGIN,
    y: height - 173,
    size: 6.8,
    font: regular,
    color: muted
  });
  page.drawText(`PAGE ${pageIndex + 1}/${totalPages}`, { x: width - MARGIN - 56, y: height - 173, size: 6.8, font: bold, color: muted });
}

function drawTableHeader(page: PDFPage, regular: PDFFont, bold: PDFFont, y: number, blank = false) {
  const dark = rgb(0.07, 0.09, 0.14);
  const accentText = rgb(0.72, 0.78, 0.88);
  const border = rgb(0.20, 0.23, 0.29);

  page.drawRectangle({ x: MARGIN, y: y - TABLE_HEADER_HEIGHT, width: A4_LANDSCAPE[0] - MARGIN * 2, height: TABLE_HEADER_HEIGHT, color: dark });
  page.drawLine({ start: { x: MARGIN + PARTICIPANT_WIDTH, y }, end: { x: MARGIN + PARTICIPANT_WIDTH, y: y - TABLE_HEADER_HEIGHT }, color: border, thickness: 0.8 });
  page.drawLine({ start: { x: MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH, y }, end: { x: MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH, y: y - TABLE_HEADER_HEIGHT }, color: border, thickness: 0.8 });

  page.drawText('STAGIAIRE', { x: MARGIN + 11, y: y - 21, size: 8.1, font: bold, color: rgb(1, 1, 1) });
  page.drawText('MATIN', { x: MARGIN + PARTICIPANT_WIDTH + 11, y: y - 15, size: 8.1, font: bold, color: rgb(1, 1, 1) });
  page.drawText(blank ? 'Signature du stagiaire' : 'Statut · signature · heure', { x: MARGIN + PARTICIPANT_WIDTH + 11, y: y - 27, size: 6.1, font: regular, color: accentText });
  page.drawText('APRÈS-MIDI', { x: MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH + 11, y: y - 15, size: 8.1, font: bold, color: rgb(1, 1, 1) });
  page.drawText(blank ? 'Signature du stagiaire' : 'Statut · signature · heure', { x: MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH + 11, y: y - 27, size: 6.1, font: regular, color: accentText });
}

function drawPeriodCell(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  x: number,
  y: number,
  width: number,
  record: TrainingAttendanceRecord | undefined,
  image: PDFImage | null,
  timezone: string,
  blank = false
) {
  const dark = rgb(0.12, 0.13, 0.15);
  const muted = rgb(0.39, 0.42, 0.47);
  const green = rgb(0.05, 0.47, 0.28);
  const red = rgb(0.72, 0.17, 0.17);
  const orange = rgb(0.68, 0.39, 0.03);
  if (blank) {
    page.drawLine({ start: { x: x + 16, y: y - 40 }, end: { x: x + width - 16, y: y - 40 }, color: muted, thickness: 0.65 });
    page.drawText('SIGNATURE', { x: x + 11, y: y - 17, size: 6.2, font: bold, color: muted });
    return;
  }

  const status = record?.status ?? 'pending';
  const statusColor = status === 'present' ? green : status === 'absent' ? red : status === 'excused' ? orange : muted;
  const label = attendanceStatusLabels[status];

  page.drawRectangle({ x: x + 10, y: y - 24, width: 72, height: 17, color: statusColor, opacity: 0.10 });
  page.drawText(singleLinePdfText(label).toUpperCase(), { x: x + 17, y: y - 18, size: 6.8, font: bold, color: statusColor });
  if (status === 'present') {
    if (image) {
      const signatureX = x + 98;
      const maxWidth = Math.max(40, width - 108);
      const maxHeight = 36;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      const imageWidth = image.width * scale;
      const imageHeight = image.height * scale;
      page.drawImage(image, {
        x: signatureX + (maxWidth - imageWidth) / 2,
        y: y - 47 + (maxHeight - imageHeight) / 2,
        width: imageWidth,
        height: imageHeight
      });
    } else {
      page.drawText('Image de signature indisponible', { x: x + 98, y: y - 29, size: 6.9, font: regular, color: muted });
    }
    if (record?.signatory_name) page.drawText(singleLinePdfText(record.signatory_name).slice(0, 34), { x: x + 10, y: y - 33, size: 7.3, font: regular, color: dark });
    if (record?.signed_at) page.drawText(formatDateTime(record.signed_at, timezone), { x: x + 10, y: y - 45, size: 6.8, font: regular, color: muted });
  } else if (record?.notes) {
    page.drawText(singleLinePdfText(record.notes).slice(0, 48), { x: x + 10, y: y - 35, size: 7.2, font: regular, color: muted });
  }
}

function drawFooter(page: PDFPage, regular: PDFFont, bold: PDFFont, input: AttendancePdfInput, pageIndex: number, totalPages: number) {
  const width = page.getWidth();
  const dark = rgb(0.12, 0.13, 0.15);
  const muted = rgb(0.45, 0.47, 0.51);
  const line = rgb(0.86, 0.88, 0.91);
  const accent = hexToRgb(input.organization.primary_color);
  page.drawLine({ start: { x: MARGIN, y: 35 }, end: { x: width - MARGIN, y: 35 }, color: line, thickness: 0.75 });
  const reference = `EMG-${input.attendanceDate.replace(/-/g, '')}-${input.session.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const generated = `Généré le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`;
  page.drawText(generated, { x: MARGIN, y: 20, size: 6.6, font: regular, color: muted });
  page.drawText(reference, { x: width / 2 - bold.widthOfTextAtSize(reference, 6.8) / 2, y: 20, size: 6.8, font: bold, color: dark });
  const right = input.organization.show_ncr_branding === false ? `${pageIndex + 1}/${totalPages}` : `NCR Suite · ${pageIndex + 1}/${totalPages}`;
  page.drawText(right, { x: width - MARGIN - bold.widthOfTextAtSize(right, 6.6), y: 20, size: 6.6, font: bold, color: muted });
  page.drawRectangle({ x: MARGIN, y: 10, width: 36, height: 2.2, color: accent });
}

export async function generateAttendanceDayPdf(input: AttendancePdfInput): Promise<AttendancePdfResult> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await fetchLogo(pdf, input.organization.logo_url);
  const timezone = input.organization.timezone || 'Europe/Paris';
  const records = new Map(input.records.map((record) => [recordKey(record.trainee_id, record.period), record]));
  const signatures = new Map<string, PDFImage | null>();

  for (const record of input.records) {
    if (record.status !== 'present' || !record.signature_path) continue;
    signatures.set(recordKey(record.trainee_id, record.period), await embedSignature(pdf, input.signatureFiles.get(record.signature_path)));
  }

  const usableHeight = A4_LANDSCAPE[1] - HEADER_HEIGHT - FOOTER_HEIGHT - TABLE_HEADER_HEIGHT - 24;
  const rowsPerPage = Math.max(1, Math.floor(usableHeight / ROW_HEIGHT));
  const totalPages = Math.max(1, Math.ceil(input.trainees.length / rowsPerPage));
  const border = rgb(0.84, 0.86, 0.89);
  const dark = rgb(0.12, 0.13, 0.15);
  const muted = rgb(0.40, 0.43, 0.48);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const page = pdf.addPage(A4_LANDSCAPE);
    drawPageHeader(page, regular, bold, input, logo, pageIndex, totalPages);
    let y = page.getHeight() - HEADER_HEIGHT;
    drawTableHeader(page, regular, bold, y, input.blank === true);
    y -= TABLE_HEADER_HEIGHT;

    const pageTrainees = input.trainees.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    for (const [rowIndex, trainee] of pageTrainees.entries()) {
      page.drawRectangle({ x: MARGIN, y: y - ROW_HEIGHT, width: A4_LANDSCAPE[0] - MARGIN * 2, height: ROW_HEIGHT, color: rowIndex % 2 === 0 ? rgb(1, 1, 1) : rgb(0.982, 0.986, 0.992), borderColor: border, borderWidth: 0.8 });
      page.drawLine({ start: { x: MARGIN + PARTICIPANT_WIDTH, y }, end: { x: MARGIN + PARTICIPANT_WIDTH, y: y - ROW_HEIGHT }, color: border, thickness: 0.8 });
      page.drawLine({ start: { x: MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH, y }, end: { x: MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH, y: y - ROW_HEIGHT }, color: border, thickness: 0.8 });

      const name = personName(trainee.first_name, trainee.last_name);
      const company = trainee.company || trainee.email || 'Stagiaire';
      wrapText(name, bold, 9.2, PARTICIPANT_WIDTH - 20, 2).forEach((line, index) => {
        page.drawText(line, { x: MARGIN + 10, y: y - 18 - index * 11, size: 9.2, font: bold, color: dark });
      });
      page.drawText(singleLinePdfText(company).slice(0, 42), { x: MARGIN + 10, y: y - 44, size: 7.3, font: regular, color: muted });

      const morning = records.get(recordKey(trainee.id, 'morning'));
      const afternoon = records.get(recordKey(trainee.id, 'afternoon'));
      drawPeriodCell(page, regular, bold, MARGIN + PARTICIPANT_WIDTH, y, PERIOD_WIDTH, morning, signatures.get(recordKey(trainee.id, 'morning')) ?? null, timezone, input.blank === true);
      drawPeriodCell(page, regular, bold, MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH, y, PERIOD_WIDTH, afternoon, signatures.get(recordKey(trainee.id, 'afternoon')) ?? null, timezone, input.blank === true);
      y -= ROW_HEIGHT;
    }

    drawFooter(page, regular, bold, input, pageIndex, totalPages);
  }

  const totals = input.records.reduce((acc, record) => {
    acc[record.status] += 1;
    return acc;
  }, { present: 0, absent: 0, excused: 0, pending: 0 });
  pdf.setTitle(`${input.blank ? "Feuille d'émargement vierge" : "Feuille d'émargement"} - ${input.session.title} - ${formatDay(input.attendanceDate)}`);
  pdf.setAuthor(input.organization.public_name || input.organization.name);
  pdf.setSubject(input.blank ? 'Feuille vierge à imprimer et signer manuellement.' : `Présences signées : ${totals.present} · Absences : ${totals.absent} · Justifiées : ${totals.excused}`);
  pdf.setCreator('NCR Suite');
  pdf.setProducer('NCR Suite V2.29.24');

  return {
    bytes: await pdf.save(),
    filename: `${input.blank ? 'feuille-emargement-vierge' : 'emargement'}-${slugify(input.session.title)}-${input.attendanceDate}.pdf`
  };
}
