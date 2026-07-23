import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  trainingBpfObjectiveLabels,
  trainingBpfRevenueKeys,
  trainingBpfRevenueLabels,
  trainingBpfRncpLevelLabels,
  trainingBpfTraineeLabels,
  type TrainingBpfCalculation,
  type TrainingBpfMetric
} from './bpf';

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 42;
const INK = rgb(0.1, 0.12, 0.15);
const MUTED = rgb(0.4, 0.43, 0.48);
const LINE = rgb(0.86, 0.88, 0.91);
const PANEL = rgb(0.96, 0.97, 0.98);
const BLUE = rgb(0.04, 0.36, 0.68);
const RED = rgb(0.76, 0.13, 0.16);
const ORANGE = rgb(0.83, 0.43, 0.05);

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

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round((Number(cents) || 0) / 100)) + ' EUR';
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}

function fit(text: string, font: PDFFont, size: number, width: number) {
  const safe = pdfSafe(text);
  if (font.widthOfTextAtSize(safe, size) <= width) return safe;
  let next = safe;
  while (next.length > 1 && font.widthOfTextAtSize(`${next}...`, size) > width) next = next.slice(0, -1);
  return `${next.trim()}...`;
}

function header(page: PDFPage, regular: PDFFont, bold: PDFFont, calculation: TrainingBpfCalculation, pageNumber: number) {
  page.drawText('NCR SUITE · BPF PREPARATOIRE', { x: MARGIN, y: PAGE.height - 38, size: 8.5, font: bold, color: BLUE });
  page.drawText(`${calculation.identity.name} · Exercice ${calculation.period.year}`, { x: MARGIN, y: PAGE.height - 54, size: 8, font: regular, color: MUTED });
  page.drawLine({ start: { x: MARGIN, y: PAGE.height - 65 }, end: { x: PAGE.width - MARGIN, y: PAGE.height - 65 }, thickness: 0.7, color: LINE });
  page.drawText(String(pageNumber), { x: PAGE.width - MARGIN - 8, y: 24, size: 8, font: regular, color: MUTED });
}

function sectionTitle(page: PDFPage, bold: PDFFont, title: string, y: number) {
  page.drawText(pdfSafe(title), { x: MARGIN, y, size: 13, font: bold, color: INK });
  page.drawLine({ start: { x: MARGIN, y: y - 9 }, end: { x: PAGE.width - MARGIN, y: y - 9 }, thickness: 0.6, color: LINE });
}

function row(page: PDFPage, regular: PDFFont, bold: PDFFont, label: string, value: string, y: number, emphasized = false) {
  page.drawText(fit(label, emphasized ? bold : regular, 8.2, 365), { x: MARGIN, y, size: 8.2, font: emphasized ? bold : regular, color: INK });
  page.drawText(fit(value, emphasized ? bold : regular, 8.4, 115), { x: PAGE.width - MARGIN - 115, y, size: 8.4, font: emphasized ? bold : regular, color: INK });
  page.drawLine({ start: { x: MARGIN, y: y - 7 }, end: { x: PAGE.width - MARGIN, y: y - 7 }, thickness: 0.4, color: LINE });
}

function metricValue(value: TrainingBpfMetric) {
  return `${value.count} · ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value.hours)} h`;
}

export async function generateTrainingBpfPdf(organization: Organization, calculation: TrainingBpfCalculation) {
  const pdf = await PDFDocument.create();
  pdf.setProducer('NCR Suite V2.18.0');
  pdf.setTitle(`BPF préparatoire ${calculation.period.year} - ${calculation.identity.name}`);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const first = pdf.addPage([PAGE.width, PAGE.height]);
  header(first, regular, bold, calculation, 1);
  first.drawRectangle({ x: MARGIN, y: PAGE.height - 184, width: PAGE.width - MARGIN * 2, height: 92, color: PANEL, borderColor: LINE, borderWidth: 0.7 });
  first.drawText('Bilan pedagogique et financier', { x: MARGIN + 16, y: PAGE.height - 121, size: 22, font: bold, color: INK });
  first.drawText('Etat preparatoire au Cerfa 10443*17', { x: MARGIN + 16, y: PAGE.height - 143, size: 10, font: regular, color: MUTED });
  first.drawText(pdfSafe(`${dateLabel(calculation.period.start)} au ${dateLabel(calculation.period.end)}`), { x: MARGIN + 16, y: PAGE.height - 162, size: 9, font: bold, color: BLUE });

  sectionTitle(first, bold, 'A et B · Identification et exercice', PAGE.height - 218);
  let y = PAGE.height - 244;
  const identityRows = [
    ['Organisme', calculation.identity.name],
    ['NDA', calculation.identity.nda_number || 'A compléter'],
    ['SIRET', calculation.identity.siret || 'A compléter'],
    ['Forme juridique', calculation.identity.legal_form || 'A compléter'],
    ['Code NAF', calculation.identity.naf_code || 'A compléter'],
    ['Adresse', [calculation.identity.address, calculation.identity.postal_code, calculation.identity.city].filter(Boolean).join(' ') || 'A compléter'],
    ['Formation à distance', calculation.general.distance_learning ? 'Oui' : 'Non'],
    ['Dirigeant', [calculation.identity.executive_name, calculation.identity.executive_title].filter(Boolean).join(' · ') || 'A compléter']
  ];
  identityRows.forEach(([label, value]) => { row(first, regular, bold, label, value, y); y -= 25; });

  sectionTitle(first, bold, 'C · Produits de formation hors taxes', y - 6);
  y -= 34;
  for (const key of trainingBpfRevenueKeys.slice(0, 13)) {
    row(first, regular, bold, trainingBpfRevenueLabels[key], money(calculation.financial.revenues_cents[key]), y);
    y -= 22;
  }

  const finance = pdf.addPage([PAGE.width, PAGE.height]);
  header(finance, regular, bold, calculation, 2);
  sectionTitle(finance, bold, 'C · Produits de formation hors taxes', PAGE.height - 94);
  y = PAGE.height - 120;
  trainingBpfRevenueKeys.slice(13).forEach((key) => {
    row(finance, regular, bold, trainingBpfRevenueLabels[key], money(calculation.financial.revenues_cents[key]), y);
    y -= 24;
  });
  y -= 4;
  row(finance, regular, bold, 'Total des produits de formation', money(calculation.financial.total_products_cents), y, true);
  y -= 25;
  row(finance, regular, bold, 'Part du chiffre d’affaires en formation', `${calculation.financial.training_revenue_percent} %`, y, true);
  y -= 42;
  sectionTitle(finance, bold, 'D · Charges de formation hors taxes', y);
  y -= 28;
  row(finance, regular, bold, 'Total des charges liées à la formation', money(calculation.financial.total_training_charges_cents), y, true);
  y -= 24;
  row(finance, regular, bold, 'dont salaires des formateurs', money(calculation.financial.trainer_salaries_cents), y);
  y -= 24;
  row(finance, regular, bold, 'dont achats et honoraires de formation', money(calculation.financial.external_training_costs_cents), y);
  y -= 42;
  sectionTitle(finance, bold, 'E · Personnes dispensant des heures', y);
  y -= 28;
  row(finance, regular, bold, 'Personnes internes', metricValue(calculation.trainers.internal), y);
  y -= 24;
  row(finance, regular, bold, 'Personnes extérieures', metricValue(calculation.trainers.external), y);

  const pedagogy = pdf.addPage([PAGE.width, PAGE.height]);
  header(pedagogy, regular, bold, calculation, 3);
  sectionTitle(pedagogy, bold, 'F1 · Type de stagiaires', PAGE.height - 94);
  y = PAGE.height - 120;
  Object.entries(trainingBpfTraineeLabels).forEach(([key, label]) => {
    row(pedagogy, regular, bold, label, metricValue(calculation.trainees.categories[key as keyof typeof calculation.trainees.categories]), y);
    y -= 24;
  });
  row(pedagogy, regular, bold, 'Total F1', metricValue(calculation.trainees.total), y, true);
  y -= 39;
  sectionTitle(pedagogy, bold, 'F2 · Activité confiée à un autre organisme', y);
  y -= 28;
  row(pedagogy, regular, bold, 'Stagiaires et heures sous-traités', metricValue(calculation.trainees.outsourced_by_us), y);
  y -= 39;
  sectionTitle(pedagogy, bold, 'F3 · Objectif général des prestations', y);
  y -= 28;
  Object.entries(trainingBpfObjectiveLabels).forEach(([key, label]) => {
    row(pedagogy, regular, bold, label, metricValue(calculation.objectives.categories[key as keyof typeof calculation.objectives.categories]), y);
    y -= 24;
  });
  y -= 8;
  sectionTitle(pedagogy, bold, 'Détail RNCP', y);
  y -= 28;
  Object.entries(trainingBpfRncpLevelLabels).forEach(([key, label]) => {
    row(pedagogy, regular, bold, label, metricValue(calculation.objectives.rncp_levels[key as keyof typeof calculation.objectives.rncp_levels]), y);
    y -= 22;
  });

  const specialty = pdf.addPage([PAGE.width, PAGE.height]);
  header(specialty, regular, bold, calculation, 4);
  sectionTitle(specialty, bold, 'F4 · Spécialités de formation', PAGE.height - 94);
  y = PAGE.height - 120;
  calculation.specialties.main.forEach((item) => {
    row(specialty, regular, bold, `${item.code} · ${item.name}`, metricValue(item), y);
    y -= 25;
  });
  if (calculation.specialties.other.count > 0) {
    row(specialty, regular, bold, 'Autres spécialités', metricValue(calculation.specialties.other), y);
    y -= 25;
  }
  row(specialty, regular, bold, 'Total F4', metricValue(calculation.specialties.total), y, true);
  y -= 42;
  sectionTitle(specialty, bold, 'G · Actions confiées à votre organisme', y);
  y -= 28;
  row(specialty, regular, bold, 'Interventions en sous-traitance', metricValue(calculation.trainees.subcontracted_for_other), y);
  y -= 48;
  sectionTitle(specialty, bold, 'Contrôles avant déclaration', y);
  y -= 30;
  specialty.drawText(`${calculation.quality.completeness_percent} %`, { x: MARGIN, y, size: 24, font: bold, color: calculation.quality.ready ? BLUE : ORANGE });
  specialty.drawText(pdfSafe(`${calculation.quality.critical_count} bloquant(s) · ${calculation.quality.warning_count} vigilance(s)`), { x: MARGIN + 72, y: y + 5, size: 9.5, font: regular, color: MUTED });
  y -= 34;
  for (const warning of calculation.quality.warnings.slice(0, 14)) {
    specialty.drawRectangle({ x: MARGIN, y: y - 4, width: 5, height: 15, color: warning.severity === 'critical' ? RED : ORANGE });
    specialty.drawText(fit(warning.label, regular, 8.3, PAGE.width - MARGIN * 2 - 18), { x: MARGIN + 12, y, size: 8.3, font: regular, color: INK });
    y -= 20;
  }
  specialty.drawText('Document préparatoire : vérifier puis télétransmettre les données dans Mon Activité Formation.', {
    x: MARGIN, y: 42, size: 7.8, font: regular, color: MUTED
  });

  const bytes = await pdf.save();
  return {
    bytes,
    filename: `bpf-preparatoire-${safeName(organization.name)}-${calculation.period.year}.pdf`
  };
}
