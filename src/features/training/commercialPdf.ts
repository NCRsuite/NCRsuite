import { rgb, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  createTrainingPdfTheme,
  drawTrainingParagraph,
  drawTrainingPdfText,
  drawTrainingPremiumFooter,
  drawTrainingPremiumHeader,
  drawTrainingSectionTitle,
  normalizeTrainingPdfText,
  safeTrainingPdfName,
  TRAINING_PDF_MARGIN,
  TRAINING_PDF_PAGE,
  trainingPdfDate,
  trainingPdfText,
  wrapTrainingPdfText,
  type TrainingPdfTheme
} from './premiumPdf';
import {
  formatTrainingMoney,
  modalityLabels,
  trainingCommercialDocumentTypeLabels,
  trainingFunderTypeLabels,
  type TrainingCommercialDocumentRecord,
  type TrainingCustomerRecord,
  type TrainingFunderRecord,
  type TrainingProgramRecord,
  type TrainingSessionRecord,
  type TrainingTraineeRecord
} from './types';

const CONTENT_WIDTH = TRAINING_PDF_PAGE[0] - TRAINING_PDF_MARGIN * 2;
const BOTTOM_LIMIT = 74;

type CommercialPdfInput = {
  organization: Organization;
  document: TrainingCommercialDocumentRecord;
  customer: TrainingCustomerRecord | null;
  funder: TrainingFunderRecord | null;
  session: TrainingSessionRecord | null;
  trainee: TrainingTraineeRecord | null;
  program?: TrainingProgramRecord | null;
};

type PageState = { page: PDFPage; y: number; number: number };

function beneficiaryName(input: CommercialPdfInput) {
  if (input.customer?.legal_name) return input.customer.legal_name;
  if (input.trainee) return `${input.trainee.first_name} ${input.trainee.last_name}`.trim();
  return 'Bénéficiaire à compléter';
}

function drawLabelValue(
  page: PDFPage,
  theme: TrainingPdfTheme,
  label: string,
  value: unknown,
  x: number,
  y: number,
  width: number
) {
  drawTrainingPdfText(page, label.toUpperCase(), { x, y, size: 6.2, font: theme.bold, color: theme.muted });
  const lines = wrapTrainingPdfText(value || '-', theme.bold, 9, width).slice(0, 2);
  lines.forEach((line, index) => drawTrainingPdfText(page, line, { x, y: y - 17 - index * 12, size: 9, font: theme.bold, color: theme.dark }));
}

function drawEntityCard(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: { x: number; y: number; width: number; title: string; name: string; lines: string[] }
) {
  const height = 112;
  page.drawRectangle({ x: input.x, y: input.y - height, width: input.width, height, color: theme.surface, borderColor: theme.line, borderWidth: 0.7 });
  page.drawRectangle({ x: input.x, y: input.y - height, width: 5, height, color: theme.accent });
  drawTrainingPdfText(page, input.title.toUpperCase(), { x: input.x + 16, y: input.y - 20, size: 6.4, font: theme.bold, color: theme.accent });
  const nameLines = wrapTrainingPdfText(input.name, theme.bold, 10, input.width - 32).slice(0, 2);
  nameLines.forEach((line, index) => drawTrainingPdfText(page, line, { x: input.x + 16, y: input.y - 40 - index * 12, size: 10, font: theme.bold, color: theme.dark }));
  const start = input.y - 64 - Math.max(0, nameLines.length - 1) * 10;
  input.lines.slice(0, 4).forEach((line, index) => {
    drawTrainingPdfText(page, line, { x: input.x + 16, y: start - index * 12, size: 7.2, font: theme.regular, color: theme.muted });
  });
  return input.y - height;
}

function pageTitle(input: CommercialPdfInput) {
  return trainingCommercialDocumentTypeLabels[input.document.document_type];
}

export async function generateTrainingCommercialPdf(input: CommercialPdfInput) {
  const { organization, document, customer, funder, session, trainee, program } = input;
  const theme = await createTrainingPdfTheme(organization);
  const pages: PageState[] = [];

  const addPage = (continuation = false) => {
    const page = theme.pdf.addPage(TRAINING_PDF_PAGE);
    const number = pages.length + 1;
    const y = drawTrainingPremiumHeader(page, theme, organization, {
      eyebrow: continuation ? 'FORMATION · DOSSIER COMMERCIAL' : 'FORMATION · DOCUMENT OFFICIEL',
      title: continuation ? `${pageTitle(input)} · suite` : pageTitle(input),
      subtitle: document.title,
      reference: document.reference,
      pageNumber: number
    });
    const state = { page, y, number };
    pages.push(state);
    return state;
  };

  let state = addPage();
  const ensure = (height: number) => {
    if (state.y - height < BOTTOM_LIMIT) state = addPage(true);
  };

  const issuerLines = [
    organization.company_contact_name ? `Contact : ${organization.company_contact_name}` : '',
    organization.company_address || '',
    [organization.company_postal_code, organization.company_city].filter(Boolean).join(' '),
    organization.company_siret ? `SIRET : ${organization.company_siret}` : '',
    organization.training_nda_number ? `NDA : ${organization.training_nda_number}` : '',
    [organization.company_email, organization.company_phone].filter(Boolean).join(' · ')
  ].filter(Boolean);
  const recipientLines = [
    customer?.contact_name ? `Contact : ${customer.contact_name}` : '',
    customer?.billing_address || '',
    [customer?.postal_code, customer?.city].filter(Boolean).join(' '),
    customer?.siret ? `SIRET : ${customer.siret}` : '',
    [customer?.email, customer?.phone].filter(Boolean).join(' · '),
    !customer && trainee?.email ? trainee.email : ''
  ].filter(Boolean);

  const cardGap = 12;
  const cardWidth = (CONTENT_WIDTH - cardGap) / 2;
  const cardBottom = drawEntityCard(state.page, theme, {
    x: TRAINING_PDF_MARGIN,
    y: state.y,
    width: cardWidth,
    title: 'Organisme de formation',
    name: organization.public_name || organization.name,
    lines: issuerLines
  });
  drawEntityCard(state.page, theme, {
    x: TRAINING_PDF_MARGIN + cardWidth + cardGap,
    y: state.y,
    width: cardWidth,
    title: 'Client / bénéficiaire',
    name: beneficiaryName(input),
    lines: recipientLines
  });
  state.y = cardBottom - 24;

  const metaWidth = (CONTENT_WIDTH - 24) / 4;
  const meta = [
    ['Émission', trainingPdfDate(document.issue_date)],
    ['Validité', document.valid_until ? trainingPdfDate(document.valid_until) : 'Sans échéance'],
    ['Participants', String(document.participant_count)],
    ['Statut', document.status === 'draft' ? 'Brouillon' : document.status]
  ];
  meta.forEach(([label, value], index) => drawLabelValue(state.page, theme, label, value, TRAINING_PDF_MARGIN + index * (metaWidth + 8), state.y, metaWidth));
  state.y -= 62;

  state.y = drawTrainingSectionTitle(state.page, theme, document.title, state.y, '01');
  const summary = document.training_summary || program?.description || program?.objectives || session?.title || 'Prestation de formation professionnelle.';
  state.y = drawTrainingParagraph(state.page, theme, summary, state.y, { size: 9.2, color: theme.muted, lineHeight: 14, maxLines: 8 });
  state.y -= 8;

  ensure(126);
  state.page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: state.y - 108, width: CONTENT_WIDTH, height: 108, color: theme.dark });
  state.page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: state.y - 108, width: 9, height: 108, color: theme.accent });
  const amountColumns = [
    ['MONTANT HT', formatTrainingMoney(document.amount_excl_tax_cents)],
    [`TVA ${(document.vat_rate_basis_points / 100).toLocaleString('fr-FR')} %`, formatTrainingMoney(document.tax_cents)],
    ['TOTAL TTC', formatTrainingMoney(document.amount_incl_tax_cents)]
  ];
  amountColumns.forEach(([label, value], index) => {
    const x = TRAINING_PDF_MARGIN + 28 + index * 160;
    drawTrainingPdfText(state.page, label, { x, y: state.y - 30, size: 6.4, font: theme.bold, color: index === 2 ? theme.accent : rgb(0.7, 0.75, 0.82) });
    drawTrainingPdfText(state.page, value, { x, y: state.y - 62, size: index === 2 ? 18 : 14, font: theme.bold, color: rgb(1, 1, 1) });
  });
  state.y -= 132;

  ensure(150);
  state.y = drawTrainingSectionTitle(state.page, theme, 'Cadre de la prestation', state.y, '02');
  const details = [
    ['Formation', program?.title || session?.title || document.title],
    ['Code', program?.code || '-'],
    ['Durée', program ? `${String(program.duration_hours).replace('.', ',')} heures` : session ? `${Math.max(0, (new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 3_600_000).toLocaleString('fr-FR')} heures` : 'À confirmer'],
    ['Modalité', program ? modalityLabels[program.modality] : session ? modalityLabels[session.modality] : 'À confirmer'],
    ['Période', session ? `${trainingPdfDate(session.starts_at, true)} au ${trainingPdfDate(session.ends_at, true)}` : 'À convenir'],
    ['Lieu', session?.location || program?.default_location || 'À convenir'],
    ['Financeur', funder ? `${funder.name} · ${trainingFunderTypeLabels[funder.funder_type]}` : 'Sans financeur identifié'],
    ['Bénéficiaire', trainee ? `${trainee.first_name} ${trainee.last_name}`.trim() : beneficiaryName(input)]
  ];
  const detailColumnWidth = (CONTENT_WIDTH - 12) / 2;
  details.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = TRAINING_PDF_MARGIN + column * (detailColumnWidth + 12);
    const y = state.y - row * 48;
    state.page.drawRectangle({ x, y: y - 38, width: detailColumnWidth, height: 38, color: row % 2 === 0 ? theme.accentPale : theme.surface });
    drawTrainingPdfText(state.page, label.toUpperCase(), { x: x + 11, y: y - 13, size: 5.8, font: theme.bold, color: theme.accent });
    const lines = wrapTrainingPdfText(value, theme.bold, 7.8, detailColumnWidth - 22).slice(0, 2);
    lines.forEach((line, lineIndex) => drawTrainingPdfText(state.page, line, { x: x + 11, y: y - 27 - lineIndex * 10, size: 7.8, font: theme.bold, color: theme.dark }));
  });
  state.y -= Math.ceil(details.length / 2) * 48 + 10;

  const sections = ([
    ['Objectifs pédagogiques', program?.objectives] as [string, unknown],
    ['Public concerné', program?.audience] as [string, unknown],
    ['Prérequis', program?.prerequisites] as [string, unknown],
    ['Programme détaillé', program?.detailed_program] as [string, unknown],
    ['Méthodes et moyens pédagogiques', [program?.teaching_methods, program?.training_resources].filter(Boolean).join('\n')] as [string, unknown],
    ['Modalités d’évaluation', program?.assessment_methods] as [string, unknown],
    ['Accessibilité', program?.accessibility] as [string, unknown]
  ]).filter(([, value]) => Boolean(normalizeTrainingPdfText(value)));

  sections.forEach(([title, value], sectionIndex) => {
    const remaining = [...wrapTrainingPdfText(value, theme.regular, 8.6, CONTENT_WIDTH)];
    let continuation = false;
    while (remaining.length) {
      ensure(64);
      state.y = drawTrainingSectionTitle(
        state.page,
        theme,
        continuation ? `${title} · suite` : title,
        state.y,
        String(sectionIndex + 3).padStart(2, '0')
      );
      const room = Math.max(1, Math.floor((state.y - BOTTOM_LIMIT - 10) / 12.5));
      const chunk = remaining.splice(0, room);
      chunk.forEach((line) => {
        drawTrainingPdfText(state.page, line || ' ', { x: TRAINING_PDF_MARGIN, y: state.y, size: 8.6, font: theme.regular, color: theme.muted });
        state.y -= 12.5;
      });
      state.y -= 13;
      continuation = remaining.length > 0;
      if (continuation) state = addPage(true);
    }
  });

  if (document.terms || organization.training_default_terms) {
    const terms = document.terms || organization.training_default_terms;
    const remaining = [...wrapTrainingPdfText(terms, theme.regular, 7.7, CONTENT_WIDTH - 24)];
    let continuation = false;
    while (remaining.length) {
      ensure(88);
      const room = Math.max(2, Math.min(24, Math.floor((state.y - BOTTOM_LIMIT - 46) / 11)));
      const chunk = remaining.splice(0, room);
      const boxHeight = 38 + chunk.length * 11;
      state.page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: state.y - boxHeight, width: CONTENT_WIDTH, height: boxHeight, color: theme.surface, borderColor: theme.line, borderWidth: 0.7 });
      drawTrainingPdfText(state.page, continuation ? 'CONDITIONS ET MODALITÉS · SUITE' : 'CONDITIONS ET MODALITÉS', { x: TRAINING_PDF_MARGIN + 12, y: state.y - 19, size: 6.4, font: theme.bold, color: theme.accent });
      chunk.forEach((line, index) => drawTrainingPdfText(state.page, line || ' ', { x: TRAINING_PDF_MARGIN + 12, y: state.y - 37 - index * 11, size: 7.7, font: theme.regular, color: theme.muted }));
      state.y -= boxHeight + 14;
      continuation = remaining.length > 0;
      if (continuation) state = addPage(true);
    }
  }

  if (document.document_type !== 'quote') {
    ensure(150);
    state.y -= 8;
    state.y = drawTrainingSectionTitle(state.page, theme, 'Acceptation et signatures', state.y, '✓');
    const signWidth = (CONTENT_WIDTH - 14) / 2;
    const signHeight = 104;
    [
      { x: TRAINING_PDF_MARGIN, title: 'Pour l’organisme', name: organization.training_legal_representative || organization.company_contact_name || organization.public_name || organization.name },
      { x: TRAINING_PDF_MARGIN + signWidth + 14, title: 'Pour le client', name: beneficiaryName(input) }
    ].forEach((box, index) => {
      state.page.drawRectangle({ x: box.x, y: state.y - signHeight, width: signWidth, height: signHeight, color: rgb(1, 1, 1), borderColor: theme.line, borderWidth: 0.9 });
      drawTrainingPdfText(state.page, box.title.toUpperCase(), { x: box.x + 12, y: state.y - 19, size: 6.3, font: theme.bold, color: theme.accent });
      drawTrainingPdfText(state.page, box.name, { x: box.x + 12, y: state.y - 37, size: 8.3, font: theme.bold, color: theme.dark });
      drawTrainingPdfText(state.page, 'Date, cachet et signature', { x: box.x + 12, y: state.y - 91, size: 6.5, font: theme.regular, color: theme.muted });
      if (index === 0 && theme.signature) {
        const scale = Math.min(88 / theme.signature.width, 38 / theme.signature.height, 1);
        state.page.drawImage(theme.signature, { x: box.x + 12, y: state.y - 79, width: theme.signature.width * scale, height: theme.signature.height * scale });
      }
      if (index === 0 && theme.stamp) {
        const scale = Math.min(58 / theme.stamp.width, 45 / theme.stamp.height, 1);
        state.page.drawImage(theme.stamp, { x: box.x + signWidth - theme.stamp.width * scale - 12, y: state.y - 81, width: theme.stamp.width * scale, height: theme.stamp.height * scale, opacity: 0.82 });
      }
    });
    state.y -= signHeight + 12;
  }

  if (organization.training_document_footer) {
    ensure(70);
    state.page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: state.y - 52, width: CONTENT_WIDTH, height: 52, color: theme.accentPale });
    drawTrainingPdfText(state.page, 'INFORMATIONS UTILES', { x: TRAINING_PDF_MARGIN + 12, y: state.y - 17, size: 6.3, font: theme.bold, color: theme.accent });
    drawTrainingParagraph(state.page, theme, organization.training_document_footer, state.y - 32, { x: TRAINING_PDF_MARGIN + 12, width: CONTENT_WIDTH - 24, size: 7.2, lineHeight: 10, maxLines: 2 });
  }

  pages.forEach((item) => drawTrainingPremiumFooter(item.page, theme, organization, { reference: document.reference, pageNumber: item.number, totalPages: pages.length }));
  theme.pdf.setTitle(`${pageTitle(input)} ${document.reference} - ${document.title}`);
  theme.pdf.setAuthor(organization.public_name || organization.name);
  theme.pdf.setSubject(program?.title || document.training_summary || document.title);
  theme.pdf.setCreator('NCR Suite');
  theme.pdf.setProducer('NCR Suite V2.15.2');

  const bytes = await theme.pdf.save();
  const pdfBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return {
    blob: new Blob([pdfBuffer], { type: 'application/pdf' }),
    filename: `${safeTrainingPdfName(document.reference || pageTitle(input))}.pdf`
  };
}
