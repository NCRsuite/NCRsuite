import { rgb, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  buildTrainingQualitySummary,
  formatTrainingQualityDate,
  trainingQualityAuditResultLabels,
  trainingQualityAuditStatusLabels,
  trainingQualityAuditTypeLabels,
  trainingQualityCriteria,
  trainingQualityStatusLabels
} from './qualityCompliance';
import {
  createTrainingPdfTheme,
  drawTrainingPdfText,
  drawTrainingPremiumFooter,
  drawTrainingPremiumHeader,
  safeTrainingPdfName,
  TRAINING_PDF_MARGIN,
  TRAINING_PDF_PAGE,
  wrapTrainingPdfText,
  type TrainingPdfTheme
} from './premiumPdf';
import type {
  TrainingQualityAuditRecord,
  TrainingQualityControlRecord,
  TrainingQualityEvidenceRecord
} from './types';

interface Input {
  organization: Organization;
  controls: TrainingQualityControlRecord[];
  evidence: TrainingQualityEvidenceRecord[];
  audits: TrainingQualityAuditRecord[];
}

const BOTTOM = 72;

function addPage(theme: TrainingPdfTheme, organization: Organization, title: string, subtitle: string, pageNumber: number) {
  const page = theme.pdf.addPage(TRAINING_PDF_PAGE);
  const y = drawTrainingPremiumHeader(page, theme, organization, {
    eyebrow: 'Qualiopi & conformité',
    title,
    subtitle,
    reference: 'V2.19.0',
    pageNumber
  });
  return { page, y };
}

function drawMetric(page: PDFPage, theme: TrainingPdfTheme, x: number, y: number, width: number, label: string, value: string) {
  page.drawRectangle({ x, y: y - 56, width, height: 56, color: theme.surface, borderColor: theme.line, borderWidth: 0.7 });
  drawTrainingPdfText(page, value, { x: x + 12, y: y - 25, size: 17, font: theme.bold, color: theme.dark });
  drawTrainingPdfText(page, label, { x: x + 12, y: y - 43, size: 7.2, font: theme.regular, color: theme.muted });
}

export async function generateTrainingQualityCompliancePdf({ organization, controls, evidence, audits }: Input) {
  const theme = await createTrainingPdfTheme(organization);
  theme.pdf.setProducer('NCR Suite V2.19.0');
  theme.pdf.setCreator('NCR Suite');
  theme.pdf.setTitle(`Dossier Qualiopi - ${organization.name}`);
  const summary = buildTrainingQualitySummary(controls, evidence, audits);
  let pageNumber = 1;
  let { page, y } = addPage(
    theme,
    organization,
    'Dossier de préparation qualité',
    `Référentiel interne, preuves et audits · ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date())}`,
    pageNumber
  );

  const contentWidth = TRAINING_PDF_PAGE[0] - TRAINING_PDF_MARGIN * 2;
  const metricWidth = (contentWidth - 18) / 4;
  drawMetric(page, theme, TRAINING_PDF_MARGIN, y, metricWidth, 'Avancement', `${summary.progressPercent} %`);
  drawMetric(page, theme, TRAINING_PDF_MARGIN + metricWidth + 6, y, metricWidth, 'Maîtrisés', String(summary.readyCount));
  drawMetric(page, theme, TRAINING_PDF_MARGIN + (metricWidth + 6) * 2, y, metricWidth, 'Sans preuve', String(summary.missingEvidenceCount));
  drawMetric(page, theme, TRAINING_PDF_MARGIN + (metricWidth + 6) * 3, y, metricWidth, 'À corriger', String(summary.attentionCount));
  y -= 84;

  drawTrainingPdfText(page, 'Synthèse par critère', { x: TRAINING_PDF_MARGIN, y, size: 12, font: theme.bold, color: theme.dark });
  y -= 22;
  for (const criterion of trainingQualityCriteria) {
    const rows = controls.filter((control) => control.criterion_number === criterion.number && control.applicable);
    const ready = rows.filter((control) => control.status === 'ready').length;
    const percent = rows.length ? Math.round((ready / rows.length) * 100) : 0;
    page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: y - 31, width: contentWidth, height: 31, color: rgb(1, 1, 1), borderColor: theme.line, borderWidth: 0.6 });
    page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: y - 31, width: 5, height: 31, color: theme.accent });
    drawTrainingPdfText(page, `${criterion.number}. ${criterion.label}`, { x: TRAINING_PDF_MARGIN + 14, y: y - 20, size: 8.5, font: theme.bold, color: theme.dark });
    drawTrainingPdfText(page, `${ready}/${rows.length} · ${percent} %`, { x: TRAINING_PDF_PAGE[0] - TRAINING_PDF_MARGIN - 58, y: y - 20, size: 8.5, font: theme.bold, color: percent === 100 ? rgb(0.08, 0.5, 0.28) : theme.muted });
    y -= 36;
  }
  y -= 12;
  drawTrainingPdfText(page, 'Lecture du document', { x: TRAINING_PDF_MARGIN, y, size: 11, font: theme.bold, color: theme.dark });
  y -= 18;
  const notice = 'Ce dossier facilite la préparation et la traçabilité internes. Il ne constitue ni une certification, ni une décision de conformité de l’organisme certificateur.';
  for (const line of wrapTrainingPdfText(notice, theme.regular, 8, contentWidth)) {
    drawTrainingPdfText(page, line, { x: TRAINING_PDF_MARGIN, y, size: 8, font: theme.regular, color: theme.muted });
    y -= 11;
  }

  for (const criterion of trainingQualityCriteria) {
    pageNumber += 1;
    ({ page, y } = addPage(theme, organization, `Critère ${criterion.number}`, criterion.label, pageNumber));
    const criterionControls = controls.filter((control) => control.criterion_number === criterion.number);
    for (const control of criterionControls) {
      const proofCount = evidence.filter((item) => item.control_id === control.id && item.status === 'current').length;
      const noteLines = control.notes ? wrapTrainingPdfText(control.notes, theme.regular, 7.2, contentWidth - 24).slice(0, 2) : [];
      const height = 49 + noteLines.length * 9;
      if (y - height < BOTTOM) {
        drawTrainingPremiumFooter(page, theme, organization, { pageNumber });
        pageNumber += 1;
        ({ page, y } = addPage(theme, organization, `Critère ${criterion.number}`, 'Suite des indicateurs', pageNumber));
      }
      page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: y - height, width: contentWidth, height, color: theme.surface, borderColor: theme.line, borderWidth: 0.6 });
      page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: y - height, width: 5, height, color: control.status === 'ready' ? rgb(0.08, 0.5, 0.28) : control.status === 'attention' ? rgb(0.77, 0.2, 0.16) : theme.accent });
      drawTrainingPdfText(page, `INDICATEUR ${control.indicator_number}`, { x: TRAINING_PDF_MARGIN + 14, y: y - 17, size: 6.6, font: theme.bold, color: theme.accent });
      drawTrainingPdfText(page, control.title.slice(0, 82), { x: TRAINING_PDF_MARGIN + 14, y: y - 31, size: 8.5, font: theme.bold, color: theme.dark });
      drawTrainingPdfText(page, `${trainingQualityStatusLabels[control.status]} · ${proofCount} preuve(s) · ${control.owner_name || 'Responsable non défini'}`, {
        x: TRAINING_PDF_MARGIN + 14, y: y - 44, size: 7, font: theme.regular, color: theme.muted
      });
      noteLines.forEach((line, index) => drawTrainingPdfText(page, line, {
        x: TRAINING_PDF_MARGIN + 14, y: y - 56 - index * 9, size: 7.2, font: theme.regular, color: theme.dark
      }));
      y -= height + 7;
    }
    drawTrainingPremiumFooter(page, theme, organization, { pageNumber });
  }

  pageNumber += 1;
  ({ page, y } = addPage(theme, organization, 'Calendrier des audits', `${audits.length} audit(s) enregistré(s)`, pageNumber));
  if (!audits.length) {
    drawTrainingPdfText(page, 'Aucun audit planifié.', { x: TRAINING_PDF_MARGIN, y, size: 10, font: theme.regular, color: theme.muted });
  } else {
    for (const audit of audits) {
      const result = audit.result ? trainingQualityAuditResultLabels[audit.result] : 'Résultat à venir';
      page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: y - 62, width: contentWidth, height: 62, color: theme.surface, borderColor: theme.line, borderWidth: 0.6 });
      drawTrainingPdfText(page, trainingQualityAuditTypeLabels[audit.audit_type], { x: TRAINING_PDF_MARGIN + 14, y: y - 20, size: 10, font: theme.bold, color: theme.dark });
      drawTrainingPdfText(page, `${formatTrainingQualityDate(audit.planned_date)} · ${trainingQualityAuditStatusLabels[audit.status]} · ${result}`, {
        x: TRAINING_PDF_MARGIN + 14, y: y - 37, size: 7.8, font: theme.regular, color: theme.muted
      });
      drawTrainingPdfText(page, (audit.scope || 'Périmètre à préciser').slice(0, 95), { x: TRAINING_PDF_MARGIN + 14, y: y - 51, size: 7.5, font: theme.regular, color: theme.dark });
      y -= 70;
    }
  }
  drawTrainingPremiumFooter(page, theme, organization, { pageNumber });

  const pages = theme.pdf.getPages();
  pages.forEach((current, index) => {
    if (index === 0) drawTrainingPremiumFooter(current, theme, organization, { pageNumber: 1, totalPages: pages.length });
  });
  const bytes = await theme.pdf.save();
  return {
    bytes,
    filename: `dossier-qualiopi-${safeTrainingPdfName(organization.name)}-${new Date().toISOString().slice(0, 10)}.pdf`
  };
}
