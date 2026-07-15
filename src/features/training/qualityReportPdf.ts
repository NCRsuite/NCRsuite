import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Organization, OrganizationSite } from '../../types';
import type { TrainingQualityDashboard, TrainingQualityIssue, TrainingQualityPeriod } from './qualityDashboard';
import { qualityPeriodLabel } from './qualityDashboard';

interface QualityReportInput {
  organization: Organization;
  site?: OrganizationSite | null;
  dashboard: TrainingQualityDashboard;
  periodDays: TrainingQualityPeriod;
}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 46;
const BLUE = rgb(0.07, 0.38, 0.78);
const INK = rgb(0.11, 0.12, 0.14);
const MUTED = rgb(0.39, 0.41, 0.45);
const LINE = rgb(0.89, 0.9, 0.92);
const PANEL = rgb(0.965, 0.97, 0.98);
const RED = rgb(0.82, 0.17, 0.18);
const ORANGE = rgb(0.86, 0.48, 0.08);
const GREEN = rgb(0.10, 0.58, 0.31);


function pdfSafe(value: string) {
  return value
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/…/g, '...')
    .replace(/[^ -ÿ]/g, '');
}

function safeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(value);
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const safeText = pdfSafe(text);
  if (font.widthOfTextAtSize(safeText, size) <= maxWidth) return safeText;
  let next = safeText;
  while (next.length > 1 && font.widthOfTextAtSize(`${next}…`, size) > maxWidth) next = next.slice(0, -1);
  return `${next.trim()}…`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [''];
}

function drawHeader(page: PDFPage, regular: PDFFont, bold: PDFFont, title: string, subtitle: string, pageNumber: number) {
  page.drawText(title, { x: MARGIN, y: A4.height - 48, size: 10, font: bold, color: INK });
  page.drawText(subtitle, { x: MARGIN, y: A4.height - 64, size: 8, font: regular, color: MUTED });
  page.drawText(String(pageNumber), { x: A4.width - MARGIN - 10, y: 30, size: 8, font: regular, color: MUTED });
  page.drawLine({ start: { x: MARGIN, y: A4.height - 76 }, end: { x: A4.width - MARGIN, y: A4.height - 76 }, thickness: 0.8, color: LINE });
}

function issueColor(issue: TrainingQualityIssue) {
  if (issue.severity === 'critical') return RED;
  if (issue.severity === 'warning') return ORANGE;
  if (issue.severity === 'ready') return GREEN;
  return BLUE;
}

function metricValue(value: number | null, suffix = '') {
  return value == null ? '—' : `${value}${suffix}`;
}

export async function generateTrainingQualityReportPdf({ organization, site, dashboard, periodDays }: QualityReportInput) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([A4.width, A4.height]);

  page.drawRectangle({ x: 0, y: A4.height - 220, width: A4.width, height: 220, color: rgb(0.965, 0.98, 1) });
  page.drawCircle({ x: A4.width - 74, y: A4.height - 68, size: 48, color: rgb(0.86, 0.93, 1), opacity: 0.9 });
  page.drawCircle({ x: A4.width - 32, y: A4.height - 126, size: 70, color: rgb(0.91, 0.96, 1), opacity: 0.9 });
  page.drawText('NCR SUITE · FORMATION', { x: MARGIN, y: A4.height - 58, size: 10, font: bold, color: BLUE });
  page.drawText('Rapport de pilotage', { x: MARGIN, y: A4.height - 104, size: 29, font: bold, color: INK });
  page.drawText('& contrôle qualité', { x: MARGIN, y: A4.height - 137, size: 29, font: bold, color: INK });
  page.drawText(pdfSafe(organization.name), { x: MARGIN, y: A4.height - 173, size: 13, font: bold, color: INK });
  page.drawText(pdfSafe(`${site?.name ? `${site.name} · ` : ''}${qualityPeriodLabel(periodDays)} · ${formatDate(dashboard.periodStart)} au ${formatDate(dashboard.periodEnd)}`), {
    x: MARGIN, y: A4.height - 192, size: 9, font: regular, color: MUTED
  });

  const metricCards = [
    ['Sessions clôturées', String(dashboard.metrics.closedSessions)],
    ['Stagiaires formés', String(dashboard.metrics.trainedTrainees)],
    ['Taux de présence', metricValue(dashboard.metrics.attendanceRate, ' %')],
    ['Documents complets', metricValue(dashboard.metrics.documentCompletionRate, ' %')],
    ['Note moyenne', dashboard.metrics.satisfactionAverage == null ? '—' : `${dashboard.metrics.satisfactionAverage} / 5`],
    ['Taux de réponse', metricValue(dashboard.metrics.satisfactionResponseRate, ' %')]
  ];
  const cardWidth = (A4.width - MARGIN * 2 - 20) / 3;
  let cardY = A4.height - 274;
  metricCards.forEach(([label, value], index) => {
    const column = index % 3;
    if (index === 3) cardY -= 94;
    const x = MARGIN + column * (cardWidth + 10);
    page.drawRectangle({ x, y: cardY, width: cardWidth, height: 78, color: PANEL, borderColor: LINE, borderWidth: 0.7 });
    page.drawText(value, { x: x + 14, y: cardY + 39, size: 20, font: bold, color: INK });
    page.drawText(label, { x: x + 14, y: cardY + 18, size: 8.5, font: regular, color: MUTED });
  });

  let y = cardY - 42;
  page.drawText('État opérationnel', { x: MARGIN, y, size: 15, font: bold, color: INK });
  y -= 26;
  const operationRows = [
    ['Sessions planifiées à 30 jours', dashboard.metrics.plannedSessions],
    ['Sessions actuellement en cours', dashboard.metrics.inProgressSessions],
    ['Sessions prêtes à clôturer', dashboard.metrics.readyToCloseSessions],
    ['Alertes critiques', dashboard.criticalCount],
    ['Points de vigilance', dashboard.warningCount]
  ];
  operationRows.forEach(([label, value], index) => {
    const rowY = y - index * 35;
    page.drawLine({ start: { x: MARGIN, y: rowY - 10 }, end: { x: A4.width - MARGIN, y: rowY - 10 }, thickness: 0.6, color: LINE });
    page.drawText(String(label), { x: MARGIN, y: rowY, size: 9.5, font: regular, color: INK });
    page.drawText(String(value), { x: A4.width - MARGIN - 30, y: rowY, size: 11, font: bold, color: index === 3 ? RED : index === 4 ? ORANGE : INK });
  });

  const maxTrend = Math.max(1, ...dashboard.trend.flatMap((point) => [point.sessions, point.trainees]));
  const chartY = 105;
  const chartHeight = 105;
  const chartWidth = A4.width - MARGIN * 2;
  page.drawText('Activité des six derniers mois', { x: MARGIN, y: chartY + chartHeight + 24, size: 13, font: bold, color: INK });
  page.drawLine({ start: { x: MARGIN, y: chartY }, end: { x: MARGIN + chartWidth, y: chartY }, thickness: 0.8, color: LINE });
  dashboard.trend.forEach((point, index) => {
    const groupWidth = chartWidth / dashboard.trend.length;
    const x = MARGIN + index * groupWidth + 14;
    const sessionsHeight = (point.sessions / maxTrend) * (chartHeight - 22);
    const traineesHeight = (point.trainees / maxTrend) * (chartHeight - 22);
    page.drawRectangle({ x, y: chartY, width: 13, height: sessionsHeight, color: BLUE });
    page.drawRectangle({ x: x + 17, y: chartY, width: 13, height: traineesHeight, color: rgb(0.43, 0.66, 0.92) });
    page.drawText(point.label, { x: x - 1, y: chartY - 15, size: 7.5, font: regular, color: MUTED });
  });
  page.drawText('Sessions', { x: MARGIN, y: 56, size: 8, font: regular, color: BLUE });
  page.drawText('Stagiaires', { x: MARGIN + 72, y: 56, size: 8, font: regular, color: rgb(0.43, 0.66, 0.92) });
  page.drawText('Généré par NCR Suite', { x: A4.width - MARGIN - 93, y: 30, size: 8, font: regular, color: MUTED });

  const issues = dashboard.issues;
  if (issues.length > 0) {
    let issuePage = pdf.addPage([A4.width, A4.height]);
    let pageNumber = 2;
    drawHeader(issuePage, regular, bold, 'Plan d’action qualité', `${issues.length} élément${issues.length > 1 ? 's' : ''} détecté${issues.length > 1 ? 's' : ''}`, pageNumber);
    let issueY = A4.height - 108;

    for (const issue of issues) {
      const detailLines = wrapText(issue.detail, regular, 8.5, A4.width - MARGIN * 2 - 42);
      const height = 54 + Math.max(0, detailLines.length - 1) * 11;
      if (issueY - height < 58) {
        issuePage = pdf.addPage([A4.width, A4.height]);
        pageNumber += 1;
        drawHeader(issuePage, regular, bold, 'Plan d’action qualité', 'Suite des points à traiter', pageNumber);
        issueY = A4.height - 108;
      }
      issuePage.drawRectangle({ x: MARGIN, y: issueY - height, width: A4.width - MARGIN * 2, height, color: PANEL, borderColor: LINE, borderWidth: 0.7 });
      issuePage.drawRectangle({ x: MARGIN, y: issueY - height, width: 5, height, color: issueColor(issue) });
      issuePage.drawText(fitText(issue.title, bold, 10, A4.width - MARGIN * 2 - 42), { x: MARGIN + 16, y: issueY - 20, size: 10, font: bold, color: INK });
      issuePage.drawText(fitText(issue.sessionTitle, regular, 8, A4.width - MARGIN * 2 - 42), { x: MARGIN + 16, y: issueY - 34, size: 8, font: regular, color: MUTED });
      detailLines.forEach((line, index) => issuePage.drawText(line, { x: MARGIN + 16, y: issueY - 48 - index * 11, size: 8.5, font: regular, color: INK }));
      issueY -= height + 10;
    }
  }

  const bytes = await pdf.save();
  const date = new Date().toISOString().slice(0, 10);
  const filename = `pilotage-qualite-${safeName(organization.name)}-${date}.pdf`;
  return { bytes, filename };
}
