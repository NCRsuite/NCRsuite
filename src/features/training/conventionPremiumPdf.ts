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

type ConventionPdfInput = {
  organization: Organization;
  document: TrainingCommercialDocumentRecord;
  customer: TrainingCustomerRecord | null;
  funder: TrainingFunderRecord | null;
  session: TrainingSessionRecord | null;
  trainee: TrainingTraineeRecord | null;
  program?: TrainingProgramRecord | null;
};

type PageState = { page: PDFPage; y: number; number: number };

type EditorialSection = { title: string; value: unknown; accent?: boolean };

function beneficiaryName(input: ConventionPdfInput) {
  if (input.customer?.legal_name) return input.customer.legal_name;
  if (input.trainee) return `${input.trainee.first_name} ${input.trainee.last_name}`.trim();
  return 'Bénéficiaire à compléter';
}

function drawConventionHeader(
  page: PDFPage,
  theme: TrainingPdfTheme,
  organization: Organization,
  input: ConventionPdfInput,
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
    drawTrainingPdfText(page, `Convention de formation · ${input.document.reference}`, {
      x: MARGIN,
      y: PAGE_HEIGHT - 61,
      size: 6.7,
      font: theme.regular,
      color: theme.muted
    });
    const label = `SUITE · PAGE ${pageNumber}`;
    const text = trainingPdfText(label, theme.bold);
    const width = theme.bold.widthOfTextAtSize(text, 6.4) + 22;
    page.drawRectangle({ x: PAGE_WIDTH - MARGIN - width, y: PAGE_HEIGHT - 58, width, height: 22, color: theme.accentPale });
    drawTrainingPdfText(page, text, {
      x: PAGE_WIDTH - MARGIN - width + 11,
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
    drawTrainingPdfText(page, String(organization.public_name || organization.name).slice(0, 2).toUpperCase(), {
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

  const badgeWidth = 104;
  page.drawRectangle({ x: PAGE_WIDTH - MARGIN - badgeWidth, y: PAGE_HEIGHT - 60, width: badgeWidth, height: 28, color: theme.accent });
  drawTrainingPdfText(page, 'CONVENTION', {
    x: PAGE_WIDTH - MARGIN - badgeWidth + 24,
    y: PAGE_HEIGHT - 50,
    size: 7,
    font: theme.bold,
    color: rgb(1, 1, 1)
  });

  const refLines = [input.document.reference, `Émise le ${trainingPdfDate(input.document.issue_date)}`];
  refLines.forEach((line, index) => {
    const font = index === 0 ? theme.bold : theme.regular;
    const size = index === 0 ? 6.7 : 5.8;
    const text = trainingPdfText(line, font);
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

  drawTrainingPdfText(page, 'Convention de formation', {
    x: MARGIN,
    y: PAGE_HEIGHT - 142,
    size: 25,
    font: theme.bold,
    color: theme.dark
  });
  drawTrainingPdfText(page, 'Cadre contractuel de l’action de formation professionnelle.', {
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
  page.drawRectangle({ x: input.x, y: input.y - 108, width: input.width, height: 108, color: theme.surface });
  page.drawRectangle({ x: input.x, y: input.y - 4, width: 32, height: 4, color: theme.accent });
  drawTrainingPdfText(page, input.label.toUpperCase(), {
    x: input.x + 12,
    y: input.y - 20,
    size: 5.7,
    font: theme.bold,
    color: theme.accent
  });
  const nameLines = wrapTrainingPdfText(input.name, theme.bold, 9.1, input.width - 24).slice(0, 2);
  nameLines.forEach((line, index) => drawTrainingPdfText(page, line, {
    x: input.x + 12,
    y: input.y - 39 - index * 11,
    size: 9.1,
    font: theme.bold,
    color: theme.dark
  }));
  let cursor = input.y - 62 - Math.max(0, nameLines.length - 1) * 11;
  for (const detail of input.lines) {
    for (const line of wrapTrainingPdfText(detail, theme.regular, 6.15, input.width - 24)) {
      if (cursor < input.y - 98) return;
      drawTrainingPdfText(page, line, {
        x: input.x + 12,
        y: cursor,
        size: 6.15,
        font: theme.regular,
        color: theme.muted
      });
      cursor -= 8.1;
    }
  }
}

function drawMetric(page: PDFPage, theme: TrainingPdfTheme, x: number, y: number, width: number, label: string, value: unknown) {
  page.drawRectangle({ x, y: y - 58, width, height: 58, color: theme.accentPale, opacity: 0.58 });
  drawTrainingPdfText(page, label.toUpperCase(), {
    x: x + 10,
    y: y - 17,
    size: 5.1,
    font: theme.bold,
    color: theme.accent
  });
  const lines = wrapTrainingPdfText(value || '-', theme.bold, 7.7, width - 20).slice(0, 2);
  lines.forEach((line, index) => drawTrainingPdfText(page, line, {
    x: x + 10,
    y: y - 36 - index * 9.5,
    size: 7.7,
    font: theme.bold,
    color: theme.dark
  }));
}

function drawFinancialStrip(page: PDFPage, theme: TrainingPdfTheme, input: ConventionPdfInput, y: number) {
  page.drawRectangle({ x: MARGIN, y: y - 76, width: CONTENT_WIDTH, height: 76, color: theme.surface });
  const items: Array<[string, string]> = [
    ['Total HT', formatTrainingMoney(input.document.amount_excl_tax_cents)],
    [`TVA ${(input.document.vat_rate_basis_points / 100).toLocaleString('fr-FR')} %`, formatTrainingMoney(input.document.tax_cents)],
    ['Total TTC', formatTrainingMoney(input.document.amount_incl_tax_cents)]
  ];
  const column = CONTENT_WIDTH / 3;
  items.forEach(([label, value], index) => {
    const x = MARGIN + index * column;
    if (index === 2) page.drawRectangle({ x, y: y - 76, width: column, height: 76, color: theme.accent });
    drawTrainingPdfText(page, label.toUpperCase(), {
      x: x + 14,
      y: y - 20,
      size: 5.5,
      font: theme.bold,
      color: index === 2 ? rgb(1, 1, 1) : theme.muted
    });
    drawTrainingPdfText(page, value, {
      x: x + 14,
      y: y - 49,
      size: index === 2 ? 14.6 : 12.3,
      font: theme.bold,
      color: index === 2 ? rgb(1, 1, 1) : theme.dark
    });
  });
  return y - 90;
}

function drawEditorialBlock(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: { y: number; title: string; lines: string[]; accent?: boolean; lineHeight?: number }
) {
  const lineHeight = input.lineHeight ?? 10.4;
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
    size: 7.3,
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

function drawSignatureArea(
  page: PDFPage,
  theme: TrainingPdfTheme,
  organization: Organization,
  input: ConventionPdfInput,
  y: number
) {
  const gap = 24;
  const width = (CONTENT_WIDTH - gap) / 2;
  const height = 122;
  const items = [
    {
      x: MARGIN,
      label: 'Pour l’organisme de formation',
      name: organization.training_legal_representative || organization.company_contact_name || organization.public_name || organization.name,
      client: false
    },
    {
      x: MARGIN + width + gap,
      label: 'Pour le bénéficiaire / client',
      name: beneficiaryName(input),
      client: true
    }
  ];

  items.forEach((item) => {
    page.drawLine({
      start: { x: item.x, y },
      end: { x: item.x + width, y },
      thickness: item.client ? 1.3 : 0.8,
      color: item.client ? theme.accent : theme.line
    });
    drawTrainingPdfText(page, item.label.toUpperCase(), {
      x: item.x,
      y: y - 19,
      size: 5.7,
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
    drawTrainingPdfText(page, 'Nom, qualité, date et signature', {
      x: item.x,
      y: y - height + 8,
      size: 5.8,
      font: theme.regular,
      color: theme.muted
    });

    if (!item.client && theme.signature) {
      const scale = Math.min(94 / theme.signature.width, 38 / theme.signature.height, 1);
      page.drawImage(theme.signature, {
        x: item.x,
        y: y - 94,
        width: theme.signature.width * scale,
        height: theme.signature.height * scale
      });
    }
    if (!item.client && theme.stamp) {
      const scale = Math.min(58 / theme.stamp.width, 44 / theme.stamp.height, 1);
      page.drawImage(theme.stamp, {
        x: item.x + width - theme.stamp.width * scale,
        y: y - 97,
        width: theme.stamp.width * scale,
        height: theme.stamp.height * scale,
        opacity: 0.82
      });
    }
  });

  return y - height;
}

export async function generatePremiumTrainingConventionPdf(input: ConventionPdfInput) {
  const { organization, document, customer, funder, session, trainee, program } = input;
  const theme = await createTrainingPdfTheme(organization);
  const pages: PageState[] = [];

  const addPage = (continuation = false) => {
    const page = theme.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const number = pages.length + 1;
    const y = drawConventionHeader(page, theme, organization, input, continuation, number);
    const state = { page, y, number };
    pages.push(state);
    return state;
  };

  let state = addPage();
  const ensure = (height: number) => {
    if (state.y - height < BOTTOM_LIMIT) state = addPage(true);
  };

  const clientLabel = beneficiaryName(input);
  const issuerLines = [
    organization.company_contact_name ? `Représentant : ${organization.company_contact_name}` : '',
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

  state.y = drawSectionLabel(state.page, theme, 'Les parties', state.y, 'CADRE CONTRACTUEL');
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
    label: 'Bénéficiaire / client',
    name: clientLabel,
    lines: recipientLines
  });
  state.y -= 128;

  const duration = program
    ? `${String(program.duration_hours).replace('.', ',')} h`
    : session
      ? `${Math.max(0, (new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 3_600_000).toLocaleString('fr-FR')} h`
      : 'À confirmer';
  const modality = program ? modalityLabels[program.modality] : session ? modalityLabels[session.modality] : 'À confirmer';
  const period = session ? `${trainingPdfDate(session.starts_at, true)} → ${trainingPdfDate(session.ends_at, true)}` : 'À convenir';
  const location = session?.location || program?.default_location || 'À convenir';
  const formationTitle = program?.title || session?.title || document.title;

  state.y = drawSectionLabel(state.page, theme, 'Objet de la convention', state.y, 'ACTION DE FORMATION');
  state.page.drawRectangle({ x: MARGIN, y: state.y - 62, width: CONTENT_WIDTH, height: 62, color: theme.surface });
  state.page.drawRectangle({ x: MARGIN, y: state.y - 62, width: 4, height: 62, color: theme.accent });
  drawTrainingPdfText(state.page, 'FORMATION', {
    x: MARGIN + 16,
    y: state.y - 18,
    size: 5.4,
    font: theme.bold,
    color: theme.accent
  });
  wrapTrainingPdfText(formationTitle, theme.bold, 10.1, CONTENT_WIDTH - 32).slice(0, 2).forEach((line, index) => drawTrainingPdfText(state.page, line, {
    x: MARGIN + 16,
    y: state.y - 40 - index * 12,
    size: 10.1,
    font: theme.bold,
    color: theme.dark
  }));
  state.y -= 74;

  const metricGap = 7;
  const metricWidth = (CONTENT_WIDTH - metricGap * 4) / 5;
  const metrics: Array<[string, unknown]> = [
    ['Durée', duration],
    ['Format', modality],
    ['Participants', `${document.participant_count}`],
    ['Période', period],
    ['Lieu', location]
  ];
  metrics.forEach(([label, value], index) => drawMetric(state.page, theme, MARGIN + index * (metricWidth + metricGap), state.y, metricWidth, label, value));
  state.y -= 72;

  ensure(126);
  state.y = drawSectionLabel(state.page, theme, 'Conditions financières', state.y, 'ENGAGEMENT FINANCIER');
  state.y = drawFinancialStrip(state.page, theme, input, state.y);

  state = addPage(true);
  state.y = drawSectionLabel(state.page, theme, 'Cadre pédagogique', state.y, 'CONTENU & MODALITÉS');

  const sections: EditorialSection[] = [
    { title: 'Finalité et objectifs pédagogiques', value: program?.objectives || document.training_summary, accent: true },
    { title: 'Public concerné', value: program?.audience },
    { title: 'Prérequis', value: program?.prerequisites },
    { title: 'Programme détaillé', value: program?.detailed_program, accent: true },
    { title: 'Méthodes et moyens pédagogiques', value: [program?.teaching_methods, program?.training_resources].filter(Boolean).join('\n') },
    { title: 'Modalités d’évaluation', value: program?.assessment_methods },
    { title: 'Accessibilité', value: program?.accessibility },
    { title: 'Financeur', value: funder ? `${funder.name} · ${trainingFunderTypeLabels[funder.funder_type]}` : null },
    { title: 'Conditions et modalités', value: document.terms || organization.training_default_terms, accent: true }
  ].filter((section) => Boolean(normalizeTrainingPdfText(section.value)));

  for (const section of sections) {
    let remaining = [...wrapTrainingPdfText(section.value, theme.regular, 7.3, CONTENT_WIDTH - (section.accent ? 32 : 0))];
    let continuation = false;
    while (remaining.length) {
      ensure(78);
      const available = Math.max(58, state.y - BOTTOM_LIMIT - 36);
      const maxLines = Math.max(3, Math.min(26, Math.floor((available - 48) / 10.4)));
      const chunk = remaining.splice(0, maxLines);
      state.y = drawEditorialBlock(state.page, theme, {
        y: state.y,
        title: continuation ? `${section.title} · suite` : section.title,
        lines: chunk,
        accent: Boolean(section.accent)
      }) - 12;
      continuation = remaining.length > 0;
      if (continuation) state = addPage(true);
    }
  }

  ensure(184);
  state.y = drawSectionLabel(state.page, theme, 'Acceptation et signatures', state.y, 'ENGAGEMENT DES PARTIES');
  const acceptance = wrapTrainingPdfText(
    `Les parties déclarent accepter les dispositions de la présente convention ${document.reference} et s’engagent à respecter les modalités qui y sont définies.`,
    theme.regular,
    7.2,
    CONTENT_WIDTH
  ).slice(0, 4);
  acceptance.forEach((line, index) => drawTrainingPdfText(state.page, line, {
    x: MARGIN,
    y: state.y - index * 10,
    size: 7.2,
    font: theme.regular,
    color: theme.muted
  }));
  state.y -= 48;
  state.y = drawSignatureArea(state.page, theme, organization, input, state.y) - 8;

  const footerNote = normalizeTrainingPdfText(organization.training_document_footer);
  if (footerNote) {
    ensure(48);
    const lines = wrapTrainingPdfText(footerNote, theme.regular, 6.4, CONTENT_WIDTH).slice(0, 4);
    drawTrainingPdfText(state.page, 'INFORMATIONS UTILES', {
      x: MARGIN,
      y: state.y,
      size: 5.4,
      font: theme.bold,
      color: theme.accent
    });
    lines.forEach((line, index) => drawTrainingPdfText(state.page, line, {
      x: MARGIN,
      y: state.y - 14 - index * 8.4,
      size: 6.4,
      font: theme.regular,
      color: theme.muted
    }));
  }

  pages.forEach((item) => drawCardDocumentFooter(item.page, theme, organization, {
    reference: document.reference,
    pageNumber: item.number,
    totalPages: pages.length
  }));

  theme.pdf.setTitle(`Convention de formation ${document.reference} - ${formationTitle}`);
  theme.pdf.setAuthor(organization.public_name || organization.name);
  theme.pdf.setSubject(program?.title || document.training_summary || document.title);
  theme.pdf.setCreator('NCR Suite');
  theme.pdf.setProducer('NCR Suite V2.29.20 · Premium editorial convention');

  const bytes = await theme.pdf.save();
  const pdfBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return {
    blob: new Blob([pdfBuffer], { type: 'application/pdf' }),
    filename: `${safeTrainingPdfName(document.reference || 'convention-formation')}.pdf`
  };
}
