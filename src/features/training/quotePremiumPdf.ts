import { rgb, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  createTrainingPdfTheme,
  drawTrainingPdfText,
  normalizeTrainingPdfText,
  safeTrainingPdfName,
  trainingPdfDate,
  trainingPdfText,
  wrapTrainingPdfText,
  type TrainingPdfTheme
} from './premiumPdf';
import { drawCardDocumentFooter } from './cardDocumentPdf';
import {
  formatTrainingMoney,
  modalityLabels,
  trainingCommercialDocumentStatusLabels,
  trainingFunderTypeLabels,
  type TrainingCommercialDocumentRecord,
  type TrainingCustomerRecord,
  type TrainingFunderRecord,
  type TrainingProgramRecord,
  type TrainingSessionRecord,
  type TrainingTraineeRecord
} from './types';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_LIMIT = 68;

type QuotePdfInput = {
  organization: Organization;
  document: TrainingCommercialDocumentRecord;
  customer: TrainingCustomerRecord | null;
  funder: TrainingFunderRecord | null;
  session: TrainingSessionRecord | null;
  trainee: TrainingTraineeRecord | null;
  program?: TrainingProgramRecord | null;
};

type PageState = { page: PDFPage; y: number; number: number };

type EditorialSection = { title: string; value: unknown };

function beneficiaryName(input: QuotePdfInput) {
  if (input.customer?.legal_name) return input.customer.legal_name;
  if (input.trainee) return `${input.trainee.first_name} ${input.trainee.last_name}`.trim();
  return 'Bénéficiaire à compléter';
}

function drawQuoteHeader(
  page: PDFPage,
  theme: TrainingPdfTheme,
  organization: Organization,
  input: QuotePdfInput,
  continuation = false,
  pageNumber = 1
) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 6, width: PAGE_WIDTH, height: 6, color: theme.accent });

  if (continuation) {
    drawTrainingPdfText(page, organization.public_name || organization.name, {
      x: MARGIN,
      y: PAGE_HEIGHT - 46,
      size: 9.4,
      font: theme.bold,
      color: theme.dark
    });
    drawTrainingPdfText(page, `Devis de formation · ${input.document.reference}`, {
      x: MARGIN,
      y: PAGE_HEIGHT - 61,
      size: 6.7,
      font: theme.regular,
      color: theme.muted
    });
    const label = `SUITE · PAGE ${pageNumber}`;
    const labelText = trainingPdfText(label, theme.bold);
    const labelWidth = theme.bold.widthOfTextAtSize(labelText, 6.4) + 22;
    page.drawRectangle({
      x: PAGE_WIDTH - MARGIN - labelWidth,
      y: PAGE_HEIGHT - 58,
      width: labelWidth,
      height: 22,
      color: theme.accentPale
    });
    drawTrainingPdfText(page, labelText, {
      x: PAGE_WIDTH - MARGIN - labelWidth + 11,
      y: PAGE_HEIGHT - 50,
      size: 6.4,
      font: theme.bold,
      color: theme.accent
    });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 78 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 78 },
      thickness: 0.6,
      color: theme.line
    });
    return PAGE_HEIGHT - 104;
  }

  if (theme.logo) {
    const scale = Math.min(84 / theme.logo.width, 36 / theme.logo.height, 1);
    page.drawImage(theme.logo, {
      x: MARGIN,
      y: PAGE_HEIGHT - 75,
      width: theme.logo.width * scale,
      height: theme.logo.height * scale
    });
  } else {
    page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 73, width: 38, height: 38, color: theme.accent });
    const initials = String(organization.public_name || organization.name).slice(0, 2).toUpperCase();
    drawTrainingPdfText(page, initials, {
      x: MARGIN + 8,
      y: PAGE_HEIGHT - 59,
      size: 12,
      font: theme.bold,
      color: rgb(1, 1, 1)
    });
  }

  const brandX = theme.logo ? MARGIN + 96 : MARGIN + 50;
  drawTrainingPdfText(page, organization.public_name || organization.name, {
    x: brandX,
    y: PAGE_HEIGHT - 47,
    size: 11.5,
    font: theme.bold,
    color: theme.dark
  });
  const contact = [organization.company_email, organization.company_phone].filter(Boolean).join(' · ');
  if (contact) {
    drawTrainingPdfText(page, contact.slice(0, 78), {
      x: brandX,
      y: PAGE_HEIGHT - 62,
      size: 6.2,
      font: theme.regular,
      color: theme.muted
    });
  }

  const badgeWidth = 76;
  page.drawRectangle({
    x: PAGE_WIDTH - MARGIN - badgeWidth,
    y: PAGE_HEIGHT - 60,
    width: badgeWidth,
    height: 28,
    color: theme.accent
  });
  drawTrainingPdfText(page, 'DEVIS', {
    x: PAGE_WIDTH - MARGIN - badgeWidth + 23,
    y: PAGE_HEIGHT - 50,
    size: 7.2,
    font: theme.bold,
    color: rgb(1, 1, 1)
  });

  const refLines = [
    input.document.reference,
    `Émis le ${trainingPdfDate(input.document.issue_date)}`,
    input.document.valid_until ? `Valable jusqu'au ${trainingPdfDate(input.document.valid_until)}` : ''
  ].filter(Boolean);
  refLines.forEach((line, index) => {
    const text = trainingPdfText(line, index === 0 ? theme.bold : theme.regular);
    const font = index === 0 ? theme.bold : theme.regular;
    const size = index === 0 ? 6.7 : 5.8;
    const width = font.widthOfTextAtSize(text, size);
    drawTrainingPdfText(page, text, {
      x: Math.max(PAGE_WIDTH - MARGIN - 190, PAGE_WIDTH - MARGIN - width),
      y: PAGE_HEIGHT - 73 - index * 10,
      size,
      font,
      color: index === 0 ? theme.dark : theme.muted
    });
  });

  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 103 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 103 },
    thickness: 0.7,
    color: theme.line
  });

  drawTrainingPdfText(page, 'Devis de formation', {
    x: MARGIN,
    y: PAGE_HEIGHT - 142,
    size: 26,
    font: theme.bold,
    color: theme.dark
  });
  drawTrainingPdfText(page, 'Proposition commerciale relative à votre action de formation.', {
    x: MARGIN,
    y: PAGE_HEIGHT - 162,
    size: 8,
    font: theme.regular,
    color: theme.muted
  });
  page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 179, width: 58, height: 3, color: theme.accent });

  return PAGE_HEIGHT - 202;
}

function drawSectionLabel(page: PDFPage, theme: TrainingPdfTheme, title: string, y: number, eyebrow?: string) {
  if (eyebrow) {
    drawTrainingPdfText(page, eyebrow.toUpperCase(), {
      x: MARGIN,
      y,
      size: 5.5,
      font: theme.bold,
      color: theme.accent
    });
  }
  drawTrainingPdfText(page, title, {
    x: MARGIN,
    y: y - (eyebrow ? 14 : 0),
    size: 12.2,
    font: theme.bold,
    color: theme.dark
  });
  return y - (eyebrow ? 34 : 20);
}

function drawPartyColumn(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: { x: number; y: number; width: number; label: string; name: string; lines: string[] }
) {
  page.drawRectangle({ x: input.x, y: input.y - 102, width: input.width, height: 102, color: theme.surface });
  page.drawRectangle({ x: input.x, y: input.y - 4, width: 32, height: 4, color: theme.accent });
  drawTrainingPdfText(page, input.label.toUpperCase(), {
    x: input.x + 12,
    y: input.y - 20,
    size: 5.7,
    font: theme.bold,
    color: theme.accent
  });
  const nameLines = wrapTrainingPdfText(input.name, theme.bold, 9.3, input.width - 24).slice(0, 2);
  nameLines.forEach((line, index) => drawTrainingPdfText(page, line, {
    x: input.x + 12,
    y: input.y - 39 - index * 11,
    size: 9.3,
    font: theme.bold,
    color: theme.dark
  }));
  let cursor = input.y - 61 - Math.max(0, nameLines.length - 1) * 11;
  for (const detail of input.lines) {
    const wrapped = wrapTrainingPdfText(detail, theme.regular, 6.25, input.width - 24);
    for (const line of wrapped) {
      if (cursor < input.y - 91) break;
      drawTrainingPdfText(page, line, {
        x: input.x + 12,
        y: cursor,
        size: 6.25,
        font: theme.regular,
        color: theme.muted
      });
      cursor -= 8.3;
    }
    if (cursor < input.y - 91) break;
  }
}

function drawOverviewMetric(
  page: PDFPage,
  theme: TrainingPdfTheme,
  x: number,
  y: number,
  width: number,
  label: string,
  value: unknown
) {
  page.drawRectangle({ x, y: y - 56, width, height: 56, color: theme.accentPale, opacity: 0.62 });
  drawTrainingPdfText(page, label.toUpperCase(), {
    x: x + 10,
    y: y - 16,
    size: 5.2,
    font: theme.bold,
    color: theme.accent
  });
  const lines = wrapTrainingPdfText(value || '-', theme.bold, 8.1, width - 20).slice(0, 2);
  lines.forEach((line, index) => drawTrainingPdfText(page, line, {
    x: x + 10,
    y: y - 34 - index * 10,
    size: 8.1,
    font: theme.bold,
    color: theme.dark
  }));
}

function drawEditorialBlock(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: { y: number; title: string; lines: string[]; accent?: boolean; lineHeight?: number }
) {
  const lineHeight = input.lineHeight ?? 10.5;
  const height = 34 + Math.max(1, input.lines.length) * lineHeight + 12;
  if (input.accent) {
    page.drawRectangle({ x: MARGIN, y: input.y - height, width: CONTENT_WIDTH, height, color: theme.surface });
    page.drawRectangle({ x: MARGIN, y: input.y - height, width: 4, height, color: theme.accent });
  }
  drawTrainingPdfText(page, input.title, {
    x: MARGIN + (input.accent ? 16 : 0),
    y: input.y - 16,
    size: 8.4,
    font: theme.bold,
    color: theme.dark
  });
  input.lines.forEach((line, index) => drawTrainingPdfText(page, line || ' ', {
    x: MARGIN + (input.accent ? 16 : 0),
    y: input.y - 36 - index * lineHeight,
    size: 7.35,
    font: theme.regular,
    color: theme.muted
  }));
  if (!input.accent) {
    page.drawLine({
      start: { x: MARGIN, y: input.y - height + 2 },
      end: { x: PAGE_WIDTH - MARGIN, y: input.y - height + 2 },
      thickness: 0.55,
      color: theme.line
    });
  }
  return input.y - height;
}

function drawFinancialSummary(page: PDFPage, theme: TrainingPdfTheme, input: QuotePdfInput, y: number) {
  const leftWidth = 138;
  const gap = 10;
  const totalWidth = CONTENT_WIDTH - leftWidth * 2 - gap * 2;

  page.drawRectangle({ x: MARGIN, y: y - 88, width: CONTENT_WIDTH, height: 88, color: theme.surface });

  const small = [
    ['Total HT', formatTrainingMoney(input.document.amount_excl_tax_cents)],
    [`TVA ${(input.document.vat_rate_basis_points / 100).toLocaleString('fr-FR')} %`, formatTrainingMoney(input.document.tax_cents)]
  ] as Array<[string, string]>;

  small.forEach(([label, value], index) => {
    const x = MARGIN + index * (leftWidth + gap);
    drawTrainingPdfText(page, label.toUpperCase(), {
      x: x + 14,
      y: y - 22,
      size: 5.7,
      font: theme.bold,
      color: theme.muted
    });
    drawTrainingPdfText(page, value, {
      x: x + 14,
      y: y - 49,
      size: 13.2,
      font: theme.bold,
      color: theme.dark
    });
    if (index === 0) {
      drawTrainingPdfText(page, `${input.document.participant_count} participant${input.document.participant_count > 1 ? 's' : ''}`, {
        x: x + 14,
        y: y - 68,
        size: 5.9,
        font: theme.regular,
        color: theme.muted
      });
    }
  });

  const totalX = MARGIN + leftWidth * 2 + gap * 2;
  page.drawRectangle({ x: totalX, y: y - 88, width: totalWidth, height: 88, color: theme.accent });
  drawTrainingPdfText(page, 'TOTAL TTC', {
    x: totalX + 16,
    y: y - 22,
    size: 6.1,
    font: theme.bold,
    color: rgb(1, 1, 1)
  });
  const total = formatTrainingMoney(input.document.amount_incl_tax_cents);
  const totalLines = wrapTrainingPdfText(total, theme.bold, 17.5, totalWidth - 32).slice(0, 2);
  totalLines.forEach((line, index) => drawTrainingPdfText(page, line, {
    x: totalX + 16,
    y: y - 51 - index * 19,
    size: 17.5,
    font: theme.bold,
    color: rgb(1, 1, 1)
  }));

  return y - 102;
}

function drawSignatureArea(
  page: PDFPage,
  theme: TrainingPdfTheme,
  organization: Organization,
  input: QuotePdfInput,
  y: number
) {
  const gap = 24;
  const width = (CONTENT_WIDTH - gap) / 2;
  const height = 118;
  const items = [
    {
      x: MARGIN,
      label: 'Pour l’organisme de formation',
      name: organization.training_legal_representative || organization.company_contact_name || organization.public_name || organization.name,
      client: false
    },
    {
      x: MARGIN + width + gap,
      label: 'Bon pour accord · client',
      name: beneficiaryName(input),
      client: true
    }
  ];

  items.forEach((item) => {
    page.drawLine({
      start: { x: item.x, y },
      end: { x: item.x + width, y },
      thickness: item.client ? 1.6 : 0.8,
      color: item.client ? theme.accent : theme.line
    });
    drawTrainingPdfText(page, item.label.toUpperCase(), {
      x: item.x,
      y: y - 19,
      size: 5.8,
      font: theme.bold,
      color: item.client ? theme.accent : theme.muted
    });
    const nameLines = wrapTrainingPdfText(item.name, theme.bold, 8.2, width).slice(0, 2);
    nameLines.forEach((line, index) => drawTrainingPdfText(page, line, {
      x: item.x,
      y: y - 39 - index * 10,
      size: 8.2,
      font: theme.bold,
      color: theme.dark
    }));
    drawTrainingPdfText(page, item.client ? 'Nom, qualité, date et signature' : 'Date, cachet et signature', {
      x: item.x,
      y: y - height + 8,
      size: 5.9,
      font: theme.regular,
      color: theme.muted
    });

    if (!item.client && theme.signature) {
      const scale = Math.min(94 / theme.signature.width, 38 / theme.signature.height, 1);
      page.drawImage(theme.signature, {
        x: item.x,
        y: y - 91,
        width: theme.signature.width * scale,
        height: theme.signature.height * scale
      });
    }
    if (!item.client && theme.stamp) {
      const scale = Math.min(58 / theme.stamp.width, 44 / theme.stamp.height, 1);
      page.drawImage(theme.stamp, {
        x: item.x + width - theme.stamp.width * scale,
        y: y - 94,
        width: theme.stamp.width * scale,
        height: theme.stamp.height * scale,
        opacity: 0.82
      });
    }
  });

  return y - height;
}

export async function generatePremiumTrainingQuotePdf(input: QuotePdfInput) {
  const { organization, document, customer, funder, session, trainee, program } = input;
  const theme = await createTrainingPdfTheme(organization);
  const pages: PageState[] = [];

  const addPage = (continuation = false) => {
    const page = theme.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const number = pages.length + 1;
    const state = {
      page,
      number,
      y: drawQuoteHeader(page, theme, organization, input, continuation, number)
    };
    pages.push(state);
    return state;
  };

  let state = addPage(false);
  const ensure = (height: number, continuation = true) => {
    if (state.y - height < BOTTOM_LIMIT) state = addPage(continuation);
  };

  const clientLabel = beneficiaryName(input);
  const issuerLines = [
    organization.company_contact_name ? `Contact : ${organization.company_contact_name}` : '',
    [organization.company_address, [organization.company_postal_code, organization.company_city].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
    organization.company_siret ? `SIRET : ${organization.company_siret}` : '',
    organization.training_nda_number ? `NDA : ${organization.training_nda_number}` : ''
  ].filter(Boolean);
  const recipientLines = [
    customer?.contact_name ? `Contact : ${customer.contact_name}` : '',
    [customer?.billing_address, [customer?.postal_code, customer?.city].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
    customer?.siret ? `SIRET : ${customer.siret}` : '',
    [customer?.email, customer?.phone].filter(Boolean).join(' · '),
    !customer && trainee?.email ? trainee.email : ''
  ].filter(Boolean);

  state.y = drawSectionLabel(state.page, theme, 'Les interlocuteurs', state.y, 'CADRE COMMERCIAL');
  const partyGap = 14;
  const partyWidth = (CONTENT_WIDTH - partyGap) / 2;
  drawPartyColumn(state.page, theme, {
    x: MARGIN,
    y: state.y,
    width: partyWidth,
    label: 'Organisme de formation',
    name: organization.public_name || organization.name,
    lines: issuerLines
  });
  drawPartyColumn(state.page, theme, {
    x: MARGIN + partyWidth + partyGap,
    y: state.y,
    width: partyWidth,
    label: 'Client / bénéficiaire',
    name: clientLabel,
    lines: recipientLines
  });
  state.y -= 124;

  const duration = program
    ? `${String(program.duration_hours).replace('.', ',')} h`
    : session
      ? `${Math.max(0, (new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 3_600_000).toLocaleString('fr-FR')} h`
      : 'À confirmer';
  const modality = program ? modalityLabels[program.modality] : session ? modalityLabels[session.modality] : 'À confirmer';
  const period = session ? `${trainingPdfDate(session.starts_at, true)} → ${trainingPdfDate(session.ends_at, true)}` : 'À convenir';
  const location = session?.location || program?.default_location || 'À convenir';
  const formationTitle = program?.title || session?.title || document.title;

  state.y = drawSectionLabel(state.page, theme, 'Vue d’ensemble', state.y, 'L’OFFRE EN UN COUP D’ŒIL');
  pageFormation: {
    state.page.drawRectangle({ x: MARGIN, y: state.y - 60, width: CONTENT_WIDTH, height: 60, color: theme.surface });
    drawTrainingPdfText(state.page, 'FORMATION', {
      x: MARGIN + 14,
      y: state.y - 18,
      size: 5.5,
      font: theme.bold,
      color: theme.accent
    });
    const lines = wrapTrainingPdfText(formationTitle, theme.bold, 10.1, CONTENT_WIDTH - 28).slice(0, 2);
    lines.forEach((line, index) => drawTrainingPdfText(state.page, line, {
      x: MARGIN + 14,
      y: state.y - 39 - index * 12,
      size: 10.1,
      font: theme.bold,
      color: theme.dark
    }));
  }
  state.y -= 70;

  const metricGap = 7;
  const metricWidth = (CONTENT_WIDTH - metricGap * 4) / 5;
  const overview: Array<[string, unknown]> = [
    ['Durée', duration],
    ['Format', modality],
    ['Participants', `${document.participant_count}`],
    ['Période', period],
    ['Lieu', location]
  ];
  overview.forEach(([label, value], index) => drawOverviewMetric(
    state.page,
    theme,
    MARGIN + index * (metricWidth + metricGap),
    state.y,
    metricWidth,
    label,
    value
  ));
  state.y -= 72;

  const summary = document.training_summary || program?.description || program?.objectives || session?.title || 'Prestation de formation professionnelle.';
  const summaryLines = wrapTrainingPdfText(summary, theme.regular, 7.6, CONTENT_WIDTH - 32).slice(0, 8);
  ensure(74 + summaryLines.length * 10.5);
  state.y = drawSectionLabel(state.page, theme, 'Votre prestation', state.y, 'PROPOSITION');
  state.y = drawEditorialBlock(state.page, theme, {
    y: state.y,
    title: formationTitle,
    lines: summaryLines,
    accent: true
  }) - 14;

  ensure(132);
  state.y = drawSectionLabel(state.page, theme, 'Conditions financières', state.y, 'SYNTHÈSE DE L’OFFRE');
  state.y = drawFinancialSummary(state.page, theme, input, state.y);

  // Le reste du devis passe volontairement sur une page éditoriale dédiée :
  // la première page reste une vraie synthèse commerciale premium.
  state = addPage(true);
  state.y = drawSectionLabel(state.page, theme, 'Cadre de la prestation', state.y, 'REPÈRES UTILES');

  const details: Array<[string, unknown]> = [
    ['Formation', formationTitle],
    ['Code formation', program?.code || '-'],
    ['Bénéficiaire', trainee ? `${trainee.first_name} ${trainee.last_name}`.trim() : clientLabel],
    ['Financeur', funder ? `${funder.name} · ${trainingFunderTypeLabels[funder.funder_type]}` : 'Sans financeur identifié'],
    ['Statut', trainingCommercialDocumentStatusLabels[document.status]],
    ['Référence', document.reference]
  ];

  const detailColumnGap = 28;
  const detailColumnWidth = (CONTENT_WIDTH - detailColumnGap) / 2;
  details.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + column * (detailColumnWidth + detailColumnGap);
    const y = state.y - row * 48;
    drawTrainingPdfText(state.page, label.toUpperCase(), {
      x,
      y,
      size: 5.3,
      font: theme.bold,
      color: theme.accent
    });
    const lines = wrapTrainingPdfText(value, theme.bold, 7.8, detailColumnWidth).slice(0, 2);
    lines.forEach((line, lineIndex) => drawTrainingPdfText(state.page, line, {
      x,
      y: y - 17 - lineIndex * 10,
      size: 7.8,
      font: theme.bold,
      color: theme.dark
    }));
  });
  state.y -= 158;
  state.page.drawLine({
    start: { x: MARGIN, y: state.y + 12 },
    end: { x: PAGE_WIDTH - MARGIN, y: state.y + 12 },
    thickness: 0.55,
    color: theme.line
  });

  const pedagogicalSections: EditorialSection[] = [
    { title: 'Objectifs pédagogiques', value: program?.objectives },
    { title: 'Public concerné', value: program?.audience },
    { title: 'Prérequis', value: program?.prerequisites },
    { title: 'Programme détaillé', value: program?.detailed_program },
    { title: 'Méthodes et moyens pédagogiques', value: [program?.teaching_methods, program?.training_resources].filter(Boolean).join('\n') },
    { title: 'Modalités d’évaluation', value: program?.assessment_methods },
    { title: 'Accessibilité', value: program?.accessibility }
  ].filter((section) => Boolean(normalizeTrainingPdfText(section.value)));

  for (const section of pedagogicalSections) {
    let remaining = [...wrapTrainingPdfText(section.value, theme.regular, 7.35, CONTENT_WIDTH)];
    let continuation = false;
    while (remaining.length) {
      ensure(72);
      const available = Math.max(64, state.y - BOTTOM_LIMIT - 36);
      const maxLines = Math.max(2, Math.min(28, Math.floor((available - 42) / 10.2)));
      const chunk = remaining.splice(0, maxLines);
      state.y = drawEditorialBlock(state.page, theme, {
        y: state.y,
        title: continuation ? `${section.title} · suite` : section.title,
        lines: chunk,
        accent: false,
        lineHeight: 10.2
      }) - 10;
      continuation = remaining.length > 0;
      if (continuation) state = addPage(true);
    }
  }

  const terms = normalizeTrainingPdfText(document.terms || organization.training_default_terms);
  if (terms) {
    ensure(76);
    state.y = drawSectionLabel(state.page, theme, 'Conditions et modalités', state.y, 'CADRE CONTRACTUEL');
    let remaining = [...wrapTrainingPdfText(terms, theme.regular, 7.25, CONTENT_WIDTH)];
    let continuation = false;
    while (remaining.length) {
      ensure(68);
      const available = Math.max(64, state.y - BOTTOM_LIMIT - 34);
      const maxLines = Math.max(2, Math.min(30, Math.floor((available - 38) / 10.1)));
      const chunk = remaining.splice(0, maxLines);
      state.y = drawEditorialBlock(state.page, theme, {
        y: state.y,
        title: continuation ? 'Conditions et modalités · suite' : 'Conditions applicables',
        lines: chunk,
        accent: continuation,
        lineHeight: 10.1
      }) - 12;
      continuation = remaining.length > 0;
      if (continuation) state = addPage(true);
    }
  }

  ensure(206);
  state.y = drawSectionLabel(state.page, theme, 'Validation du devis', state.y, 'BON POUR ACCORD');
  const agreementLines = wrapTrainingPdfText(
    `Le client confirme accepter la proposition ${document.reference} ainsi que les conditions indiquées au présent devis.`,
    theme.regular,
    7.35,
    CONTENT_WIDTH
  ).slice(0, 3);
  agreementLines.forEach((line, index) => drawTrainingPdfText(state.page, line, {
    x: MARGIN,
    y: state.y - index * 10.2,
    size: 7.35,
    font: theme.regular,
    color: theme.muted
  }));
  state.y -= 42;
  state.y = drawSignatureArea(state.page, theme, organization, input, state.y) - 10;

  const footerNote = normalizeTrainingPdfText(organization.training_document_footer);
  if (footerNote) {
    const lines = wrapTrainingPdfText(footerNote, theme.regular, 6.35, CONTENT_WIDTH).slice(0, 6);
    ensure(30 + lines.length * 8.6);
    drawTrainingPdfText(state.page, 'INFORMATIONS UTILES', {
      x: MARGIN,
      y: state.y,
      size: 5.4,
      font: theme.bold,
      color: theme.accent
    });
    lines.forEach((line, index) => drawTrainingPdfText(state.page, line, {
      x: MARGIN,
      y: state.y - 15 - index * 8.6,
      size: 6.35,
      font: theme.regular,
      color: theme.muted
    }));
  }

  pages.forEach((page) => drawCardDocumentFooter(page.page, theme, organization, {
    reference: document.reference,
    pageNumber: page.number,
    totalPages: pages.length
  }));

  theme.pdf.setTitle(`Devis de formation ${document.reference} - ${document.title}`);
  theme.pdf.setAuthor(organization.public_name || organization.name);
  theme.pdf.setSubject(program?.title || document.training_summary || document.title);
  theme.pdf.setCreator('NCR Suite');
  theme.pdf.setProducer('NCR Suite V2.29.20 · Premium editorial quote system');

  const bytes = await theme.pdf.save();
  const pdfBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return {
    blob: new Blob([pdfBuffer], { type: 'application/pdf' }),
    filename: `${safeTrainingPdfName(document.reference || 'devis-formation')}.pdf`
  };
}
