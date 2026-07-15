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
}

export interface AttendancePdfResult {
  bytes: Uint8Array;
  filename: string;
}

const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
const MARGIN = 34;
const HEADER_HEIGHT = 148;
const FOOTER_HEIGHT = 34;
const ROW_HEIGHT = 54;
const TABLE_HEADER_HEIGHT = 30;
const PARTICIPANT_WIDTH = 220;
const PERIOD_WIDTH = (A4_LANDSCAPE[0] - MARGIN * 2 - PARTICIPANT_WIDTH) / 2;

function normalizePdfText(value: unknown) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
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
  const words = normalizePdfText(text).split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.length > 0) {
    const last = lines[lines.length - 1];
    if (font.widthOfTextAtSize(`${last}...`, size) <= maxWidth) lines[lines.length - 1] = `${last}...`;
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
    if (blob.type.includes('jpeg') || blob.type.includes('jpg')) return await pdf.embedJpg(bytes);
    return await pdf.embedPng(bytes);
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
  const dark = rgb(0.10, 0.11, 0.13);
  const muted = rgb(0.38, 0.41, 0.46);

  page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: accent });

  let brandX = MARGIN;
  if (logo) {
    const scale = Math.min(112 / logo.width, 42 / logo.height, 1);
    const logoWidth = logo.width * scale;
    const logoHeight = logo.height * scale;
    page.drawImage(logo, { x: MARGIN, y: height - 58, width: logoWidth, height: logoHeight });
    brandX += logoWidth + 12;
  }

  const organizationName = normalizePdfText(input.organization.public_name || input.organization.name || 'Organisme de formation');
  page.drawText(organizationName, { x: brandX, y: height - 34, size: 12, font: bold, color: dark });
  const address = normalizePdfText(input.site?.address || input.organization.booking_address || '');
  if (address) page.drawText(address.slice(0, 95), { x: brandX, y: height - 50, size: 8.5, font: regular, color: muted });

  page.drawText("FEUILLE D'EMARGEMENT", { x: MARGIN, y: height - 85, size: 19, font: bold, color: dark });
  page.drawRectangle({ x: MARGIN, y: height - 93, width: 74, height: 3, color: accent });

  const title = normalizePdfText(input.session.title || input.program?.title || 'Session de formation');
  page.drawText(title.slice(0, 86), { x: MARGIN, y: height - 112, size: 10.5, font: bold, color: dark });

  const timezone = input.organization.timezone || 'Europe/Paris';
  const trainerName = input.trainer ? personName(input.trainer.first_name, input.trainer.last_name) : 'À définir';
  const details = [
    formatDay(input.attendanceDate),
    `Formateur : ${normalizePdfText(trainerName)}`,
    input.session.location ? `Lieu : ${normalizePdfText(input.session.location)}` : null,
    `Session : ${formatDateTime(input.session.starts_at, timezone)} - ${formatDateTime(input.session.ends_at, timezone)}`
  ].filter(Boolean).join('  ·  ');
  page.drawText(details.slice(0, 155), { x: MARGIN, y: height - 128, size: 8.3, font: regular, color: muted });

  page.drawText(`${pageIndex + 1}/${totalPages}`, {
    x: width - MARGIN - 20,
    y: height - 34,
    size: 8.5,
    font: bold,
    color: muted
  });
}

function drawTableHeader(page: PDFPage, regular: PDFFont, bold: PDFFont, y: number) {
  const dark = rgb(0.12, 0.13, 0.15);
  const muted = rgb(0.39, 0.42, 0.47);
  const soft = rgb(0.95, 0.96, 0.97);
  const border = rgb(0.84, 0.86, 0.89);

  page.drawRectangle({ x: MARGIN, y: y - TABLE_HEADER_HEIGHT, width: A4_LANDSCAPE[0] - MARGIN * 2, height: TABLE_HEADER_HEIGHT, color: soft, borderColor: border, borderWidth: 0.8 });
  page.drawLine({ start: { x: MARGIN + PARTICIPANT_WIDTH, y }, end: { x: MARGIN + PARTICIPANT_WIDTH, y: y - TABLE_HEADER_HEIGHT }, color: border, thickness: 0.8 });
  page.drawLine({ start: { x: MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH, y }, end: { x: MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH, y: y - TABLE_HEADER_HEIGHT }, color: border, thickness: 0.8 });

  page.drawText('STAGIAIRE', { x: MARGIN + 10, y: y - 19, size: 8.5, font: bold, color: dark });
  page.drawText('MATIN', { x: MARGIN + PARTICIPANT_WIDTH + 10, y: y - 19, size: 8.5, font: bold, color: dark });
  page.drawText('APRÈS-MIDI', { x: MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH + 10, y: y - 19, size: 8.5, font: bold, color: dark });
  page.drawText('Statut, signature et horodatage', { x: MARGIN + PARTICIPANT_WIDTH + 54, y: y - 19, size: 7.6, font: regular, color: muted });
  page.drawText('Statut, signature et horodatage', { x: MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH + 72, y: y - 19, size: 7.6, font: regular, color: muted });
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
  timezone: string
) {
  const dark = rgb(0.12, 0.13, 0.15);
  const muted = rgb(0.39, 0.42, 0.47);
  const green = rgb(0.05, 0.47, 0.28);
  const red = rgb(0.72, 0.17, 0.17);
  const orange = rgb(0.68, 0.39, 0.03);
  const status = record?.status ?? 'pending';
  const statusColor = status === 'present' ? green : status === 'absent' ? red : status === 'excused' ? orange : muted;
  const label = attendanceStatusLabels[status];

  page.drawText(normalizePdfText(label), { x: x + 10, y: y - 18, size: 8.5, font: bold, color: statusColor });
  if (status === 'present') {
    if (image) {
      const scale = Math.min((width - 126) / image.width, 31 / image.height, 1);
      page.drawImage(image, {
        x: x + 108,
        y: y - 42,
        width: image.width * scale,
        height: image.height * scale
      });
    } else {
      page.drawText('Signature enregistrée', { x: x + 108, y: y - 28, size: 7.4, font: regular, color: muted });
    }
    if (record?.signatory_name) page.drawText(normalizePdfText(record.signatory_name).slice(0, 34), { x: x + 10, y: y - 33, size: 7.3, font: regular, color: dark });
    if (record?.signed_at) page.drawText(formatDateTime(record.signed_at, timezone), { x: x + 10, y: y - 45, size: 6.8, font: regular, color: muted });
  } else if (record?.notes) {
    page.drawText(normalizePdfText(record.notes).slice(0, 48), { x: x + 10, y: y - 35, size: 7.2, font: regular, color: muted });
  }
}

function drawFooter(page: PDFPage, regular: PDFFont, bold: PDFFont, input: AttendancePdfInput, pageIndex: number, totalPages: number) {
  const width = page.getWidth();
  const muted = rgb(0.45, 0.47, 0.51);
  const text = `Généré le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`;
  page.drawText(text, { x: MARGIN, y: 18, size: 7.2, font: regular, color: muted });
  const reference = `Réf. EMG-${input.attendanceDate.replace(/-/g, '')}-${input.session.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  page.drawText(reference, { x: width / 2 - 60, y: 18, size: 7.2, font: regular, color: muted });
  const right = input.organization.show_ncr_branding === false ? `${pageIndex + 1}/${totalPages}` : `NCR Suite · ${pageIndex + 1}/${totalPages}`;
  page.drawText(right, { x: width - MARGIN - bold.widthOfTextAtSize(right, 7.2), y: 18, size: 7.2, font: bold, color: muted });
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
    drawTableHeader(page, regular, bold, y);
    y -= TABLE_HEADER_HEIGHT;

    const pageTrainees = input.trainees.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    for (const trainee of pageTrainees) {
      page.drawRectangle({ x: MARGIN, y: y - ROW_HEIGHT, width: A4_LANDSCAPE[0] - MARGIN * 2, height: ROW_HEIGHT, borderColor: border, borderWidth: 0.8 });
      page.drawLine({ start: { x: MARGIN + PARTICIPANT_WIDTH, y }, end: { x: MARGIN + PARTICIPANT_WIDTH, y: y - ROW_HEIGHT }, color: border, thickness: 0.8 });
      page.drawLine({ start: { x: MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH, y }, end: { x: MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH, y: y - ROW_HEIGHT }, color: border, thickness: 0.8 });

      const name = personName(trainee.first_name, trainee.last_name);
      const company = trainee.company || trainee.email || 'Stagiaire';
      wrapText(name, bold, 9.2, PARTICIPANT_WIDTH - 20, 2).forEach((line, index) => {
        page.drawText(line, { x: MARGIN + 10, y: y - 18 - index * 11, size: 9.2, font: bold, color: dark });
      });
      page.drawText(normalizePdfText(company).slice(0, 42), { x: MARGIN + 10, y: y - 44, size: 7.3, font: regular, color: muted });

      const morning = records.get(recordKey(trainee.id, 'morning'));
      const afternoon = records.get(recordKey(trainee.id, 'afternoon'));
      drawPeriodCell(page, regular, bold, MARGIN + PARTICIPANT_WIDTH, y, PERIOD_WIDTH, morning, signatures.get(recordKey(trainee.id, 'morning')) ?? null, timezone);
      drawPeriodCell(page, regular, bold, MARGIN + PARTICIPANT_WIDTH + PERIOD_WIDTH, y, PERIOD_WIDTH, afternoon, signatures.get(recordKey(trainee.id, 'afternoon')) ?? null, timezone);
      y -= ROW_HEIGHT;
    }

    drawFooter(page, regular, bold, input, pageIndex, totalPages);
  }

  const totals = input.records.reduce((acc, record) => {
    acc[record.status] += 1;
    return acc;
  }, { present: 0, absent: 0, excused: 0, pending: 0 });
  pdf.setTitle(`Feuille d'émargement - ${input.session.title} - ${formatDay(input.attendanceDate)}`);
  pdf.setAuthor(input.organization.public_name || input.organization.name);
  pdf.setSubject(`Présences signées : ${totals.present} · Absences : ${totals.absent} · Justifiées : ${totals.excused}`);
  pdf.setCreator('NCR Suite');
  pdf.setProducer('NCR Suite V2.4.7');

  return {
    bytes: await pdf.save(),
    filename: `emargement-${slugify(input.session.title)}-${input.attendanceDate}.pdf`
  };
}
