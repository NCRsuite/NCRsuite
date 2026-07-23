import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Organization, OrganizationSite } from '../../types';
import {
  attendanceStatusLabels,
  personName,
  sessionStatusLabels,
  trainingDocumentCategoryLabels,
  type TrainingAttendanceRecord,
  type TrainingDocumentRecord,
  type TrainingEnrollmentRecord,
  type TrainingProgramRecord,
  type TrainingSatisfactionRecord,
  type TrainingSessionRecord,
  type TrainingTraineeRecord,
  type TrainingTrainerRecord
} from './types';

export interface SessionDossierPdfInput {
  organization: Organization;
  site?: OrganizationSite | null;
  session: TrainingSessionRecord;
  program?: TrainingProgramRecord | null;
  trainer?: TrainingTrainerRecord | null;
  trainees: TrainingTraineeRecord[];
  enrollments: TrainingEnrollmentRecord[];
  attendance: TrainingAttendanceRecord[];
  satisfaction: TrainingSatisfactionRecord[];
  documents: TrainingDocumentRecord[];
}

export interface SessionDossierPdfResult { bytes: Uint8Array; filename: string; }

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 42;
const BOTTOM = 48;

function safe(value: unknown) {
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

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'session';
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = safe(text).split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === 'number');
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

async function embedLogo(pdf: PDFDocument, logoUrl?: string | null) {
  if (!logoUrl || !/^https:\/\//i.test(logoUrl)) return null;
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const type = response.headers.get('content-type') ?? '';
    if (type.includes('png')) return await pdf.embedPng(bytes);
    if (type.includes('jpeg') || type.includes('jpg')) return await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
  return null;
}


function formatDateTimeInZone(value: string, timezone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'À confirmer';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function sessionDayCount(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.max(1, Math.floor((endDay - startDay) / 86_400_000) + 1);
}

export async function generateSessionDossierPdf(input: SessionDossierPdfInput): Promise<SessionDossierPdfResult> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdf, input.organization.logo_url);
  const timezone = input.organization.timezone || 'Europe/Paris';
  const accentHex = /^#[0-9a-f]{6}$/i.test(input.organization.primary_color || '') ? input.organization.primary_color : '#2997ff';
  const accent = rgb(parseInt(accentHex.slice(1, 3), 16) / 255, parseInt(accentHex.slice(3, 5), 16) / 255, parseInt(accentHex.slice(5, 7), 16) / 255);
  const dark = rgb(0.10, 0.11, 0.13);
  const muted = rgb(0.39, 0.42, 0.47);
  const border = rgb(0.84, 0.86, 0.89);
  const soft = rgb(0.96, 0.97, 0.98);
  const traineeMap = new Map(input.trainees.map((item) => [item.id, item]));
  const attendanceByTrainee = new Map<string, TrainingAttendanceRecord[]>();
  input.attendance.forEach((record) => attendanceByTrainee.set(record.trainee_id, [...(attendanceByTrainee.get(record.trainee_id) ?? []), record]));
  const satisfactionByTrainee = new Map(input.satisfaction.map((item) => [item.trainee_id, item]));
  let page: PDFPage;
  let y = 0;
  let pageNumber = 0;

  function addPage() {
    page = pdf.addPage(A4);
    pageNumber += 1;
    y = A4[1] - MARGIN;
    page.drawRectangle({ x: 0, y: A4[1] - 7, width: A4[0], height: 7, color: accent });
    let organizationX = MARGIN;
    if (logo) {
      const scale = Math.min(70 / logo.width, 24 / logo.height, 1);
      const width = logo.width * scale;
      const height = logo.height * scale;
      page.drawImage(logo, { x: MARGIN, y: y - height + 5, width, height });
      organizationX += width + 10;
    }
    page.drawText(safe(input.organization.public_name || input.organization.name), { x: organizationX, y, size: 10, font: bold, color: dark });
    page.drawText(`DOSSIER DE SESSION · ${pageNumber}`, { x: A4[0] - MARGIN - 118, y, size: 8, font: bold, color: muted });
    y -= 28;
  }

  function ensure(height: number) { if (y - height < BOTTOM) addPage(); }

  function title(text: string, level = 1) {
    const size = level === 1 ? 18 : 12;
    const lines = wrap(text, bold, size, A4[0] - MARGIN * 2);
    ensure(lines.length * (size + 4) + 10);
    lines.forEach((line) => { page.drawText(line, { x: MARGIN, y, size, font: bold, color: dark }); y -= size + 4; });
    if (level === 1) { page.drawRectangle({ x: MARGIN, y: y + 3, width: 72, height: 3, color: accent }); y -= 10; }
  }

  function paragraph(text: string, options: { bold?: boolean; color?: typeof muted; indent?: number } = {}) {
    const font = options.bold ? bold : regular;
    const size = 9;
    const indent = options.indent ?? 0;
    const lines = wrap(text, font, size, A4[0] - MARGIN * 2 - indent);
    ensure(lines.length * 12 + 5);
    lines.forEach((line) => { page.drawText(line, { x: MARGIN + indent, y, size, font, color: options.color ?? dark }); y -= 12; });
    y -= 3;
  }

  function keyValue(label: string, value: string) {
    const lines = wrap(value || '-', regular, 9, A4[0] - MARGIN * 2 - 145);
    ensure(Math.max(22, lines.length * 12 + 6));
    page.drawText(safe(label), { x: MARGIN, y, size: 8, font: bold, color: muted });
    lines.forEach((line, index) => page.drawText(line, { x: MARGIN + 145, y: y - index * 12, size: 9, font: regular, color: dark }));
    y -= Math.max(18, lines.length * 12 + 4);
  }

  function section(text: string) {
    ensure(34);
    y -= 5;
    page.drawRectangle({ x: MARGIN, y: y - 23, width: A4[0] - MARGIN * 2, height: 27, color: soft });
    page.drawText(safe(text).toUpperCase(), { x: MARGIN + 10, y: y - 14, size: 9.5, font: bold, color: dark });
    y -= 34;
  }

  addPage();
  title('Dossier complet de session');
  title(input.session.title, 2);
  paragraph('Synthèse administrative générée depuis NCR Suite. Elle regroupe les informations de la session, les participants, les émargements, les évaluations et l’inventaire documentaire.', { color: muted });

  section('Informations générales');
  keyValue('Formation', input.program?.title || input.session.title);
  keyValue('Code', input.program?.code || '-');
  keyValue('Statut', sessionStatusLabels[input.session.status]);
  keyValue('Dates', `${formatDateTimeInZone(input.session.starts_at, timezone)} → ${formatDateTimeInZone(input.session.ends_at, timezone)}`);
  keyValue('Formateur', input.trainer ? personName(input.trainer.first_name, input.trainer.last_name) : 'À définir');
  keyValue('Établissement', input.site?.name || 'Site principal');
  keyValue('Lieu', input.session.location || input.site?.address || input.organization.booking_address || '-');
  keyValue('Capacité', `${input.enrollments.filter((item) => item.status !== 'canceled').length} inscrit(s) / ${input.session.capacity}`);
  if (input.session.notes) { section('Notes internes'); paragraph(input.session.notes); }

  section('Participants et suivi');
  const activeEnrollments = input.enrollments.filter((item) => item.status !== 'canceled');
  if (activeEnrollments.length === 0) paragraph('Aucun stagiaire inscrit.', { color: muted });
  activeEnrollments.forEach((enrollment, index) => {
    const trainee = traineeMap.get(enrollment.trainee_id);
    if (!trainee) return;
    const records = attendanceByTrainee.get(trainee.id) ?? [];
    const present = records.filter((record) => record.status === 'present').length;
    const absent = records.filter((record) => record.status === 'absent').length;
    const excused = records.filter((record) => record.status === 'excused').length;
    const survey = satisfactionByTrainee.get(trainee.id);
    const evaluation = survey?.status === 'completed' ? 'Évaluation complétée' : survey ? 'Évaluation envoyée' : 'Sans évaluation';
    ensure(46);
    page.drawLine({ start: { x: MARGIN, y: y + 5 }, end: { x: A4[0] - MARGIN, y: y + 5 }, color: border, thickness: 0.6 });
    page.drawText(`${index + 1}. ${safe(personName(trainee.first_name, trainee.last_name))}`, { x: MARGIN, y: y - 8, size: 9, font: bold, color: dark });
    page.drawText(safe(trainee.company || trainee.email || 'Stagiaire'), { x: MARGIN, y: y - 21, size: 7.8, font: regular, color: muted });
    page.drawText(`Émargement : ${present} signé(s), ${absent} absent(s), ${excused} justifié(s)`, { x: MARGIN + 245, y: y - 8, size: 7.8, font: regular, color: dark });
    page.drawText(evaluation, { x: MARGIN + 245, y: y - 21, size: 7.8, font: regular, color: muted });
    y -= 38;
  });

  section('Synthèse des émargements');
  const attendanceTotals = input.attendance.reduce((acc, record) => { acc[record.status] += 1; return acc; }, { present: 0, absent: 0, excused: 0, pending: 0 });
  const expectedAttendanceSlots = activeEnrollments.length * sessionDayCount(input.session.starts_at, input.session.ends_at) * 2;
  const completedAttendanceSlots = attendanceTotals.present + attendanceTotals.absent + attendanceTotals.excused;
  const missingAttendanceSlots = Math.max(attendanceTotals.pending, expectedAttendanceSlots - completedAttendanceSlots);
  keyValue('Signatures enregistrées', String(attendanceTotals.present));
  keyValue('Absences', String(attendanceTotals.absent));
  keyValue('Absences justifiées', String(attendanceTotals.excused));
  keyValue('Créneaux non renseignés', String(missingAttendanceSlots));

  section('Évaluations de satisfaction');
  const completed = input.satisfaction.filter((item) => item.status === 'completed');
  const ratings = completed.flatMap((item) => [item.content_rating, item.trainer_rating, item.organization_rating, item.objectives_rating]);
  const avg = average(ratings);
  const recommended = completed.filter((item) => item.recommend === true).length;
  keyValue('Questionnaires complétés', `${completed.length} / ${input.satisfaction.length}`);
  keyValue('Note moyenne', avg === null ? '-' : `${avg.toFixed(1)} / 5`);
  keyValue('Recommandation', completed.length ? `${Math.round((recommended / completed.length) * 100)} %` : '-');
  completed.filter((item) => item.comment || item.improvement).slice(0, 8).forEach((item) => {
    const trainee = traineeMap.get(item.trainee_id);
    if (item.comment) paragraph(`${trainee ? personName(trainee.first_name, trainee.last_name) : 'Stagiaire'} — Commentaire : ${item.comment}`, { indent: 8 });
    if (item.improvement) paragraph(`Amélioration proposée : ${item.improvement}`, { indent: 8, color: muted });
  });

  section('Inventaire des documents');
  const docs = input.documents.filter((item) => item.status !== 'archived');
  if (!docs.length) paragraph('Aucun document rattaché à la session.', { color: muted });
  docs.forEach((document, index) => {
    ensure(28);
    page.drawText(`${index + 1}. ${safe(document.title)}`, { x: MARGIN, y, size: 8.5, font: bold, color: dark });
    const categoryLabel = trainingDocumentCategoryLabels[document.category] || 'Document de session';
    page.drawText(`${categoryLabel} · ${document.generated_automatically ? 'Généré automatiquement' : 'Ajouté manuellement'}`, { x: MARGIN + 255, y, size: 7.5, font: regular, color: muted });
    y -= 18;
  });

  section('Traçabilité');
  if (input.organization.booking_practical_info) paragraph(input.organization.booking_practical_info, { color: muted });
  paragraph(`Dossier généré le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())}. Référence : DOS-${input.session.id.replace(/-/g, '').slice(0, 12).toUpperCase()}.`, { color: muted });
  paragraph("Ce PDF constitue une synthèse du dossier de session. Les documents originaux et fichiers de signature restent conservés séparément dans l'espace sécurisé NCR Suite.", { color: muted });

  pdf.setTitle(`Dossier de session - ${input.session.title}`);
  pdf.setAuthor(input.organization.public_name || input.organization.name);
  pdf.setCreator('NCR Suite');
  pdf.setProducer('NCR Suite V2.14.1');
  return { bytes: await pdf.save(), filename: `dossier-session-${slugify(input.session.title)}.pdf` };
}
