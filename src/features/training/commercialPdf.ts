import type { PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  createTrainingPdfTheme,
  drawTrainingPdfText,
  normalizeTrainingPdfText,
  safeTrainingPdfName,
  trainingPdfDate,
  wrapTrainingPdfText,
  type TrainingPdfTheme
} from './premiumPdf';
import {
  CARD_DOCUMENT_BOTTOM_LIMIT,
  CARD_DOCUMENT_CONTENT_WIDTH,
  drawCardDocumentFooter,
  drawCardDocumentHeader,
  drawCardFrame,
  drawCardHeading,
  drawCardMetric,
  drawCardSectionTitle,
  drawCardTextBlock
} from './cardDocumentPdf';
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

const CONTENT_WIDTH = CARD_DOCUMENT_CONTENT_WIDTH;
const MARGIN = 42;

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

function documentTitle(input: CommercialPdfInput) {
  if (input.document.document_type === 'quote') return 'Devis de formation';
  if (input.document.document_type === 'agreement') return 'Convention de formation';
  return 'Contrat de formation';
}

function documentBadge(input: CommercialPdfInput) {
  if (input.document.document_type === 'quote') return 'DEVIS';
  if (input.document.document_type === 'agreement') return 'CONVENTION';
  return 'CONTRAT';
}

function entityCardHeight(theme: TrainingPdfTheme, width: number, name: string, details: string[]) {
  const nameLines = wrapTrainingPdfText(name, theme.bold, 9.2, width - 24).slice(0, 2);
  const detailLines = details.flatMap((line) => wrapTrainingPdfText(line, theme.regular, 6.8, width - 24));
  return Math.max(108, 48 + nameLines.length * 12 + detailLines.length * 9.2 + 14);
}

function drawEntityCard(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: { x: number; y: number; width: number; height: number; label: string; name: string; details: string[] }
) {
  drawCardFrame(page, theme, { x: input.x, y: input.y, width: input.width, height: input.height, fill: 'white' });
  drawCardHeading(page, theme, input.label, input.x + 12, input.y - 18);
  const nameLines = wrapTrainingPdfText(input.name, theme.bold, 9.2, input.width - 24).slice(0, 2);
  nameLines.forEach((line, index) => drawTrainingPdfText(page, line, {
    x: input.x + 12,
    y: input.y - 39 - index * 12,
    size: 9.2,
    font: theme.bold,
    color: theme.dark
  }));
  let cursor = input.y - 58 - nameLines.length * 12;
  for (const detail of input.details) {
    const lines = wrapTrainingPdfText(detail, theme.regular, 6.8, input.width - 24);
    lines.forEach((line) => {
      drawTrainingPdfText(page, line, {
        x: input.x + 12,
        y: cursor,
        size: 6.8,
        font: theme.regular,
        color: theme.muted
      });
      cursor -= 9.2;
    });
  }
}

function drawSignatureBoxes(
  state: PageState,
  theme: TrainingPdfTheme,
  organization: Organization,
  input: CommercialPdfInput
) {
  const signWidth = (CONTENT_WIDTH - 14) / 2;
  const signHeight = 108;
  const top = state.y;
  const boxes = [
    {
      x: MARGIN,
      label: 'Pour l’organisme de formation',
      name: organization.training_legal_representative || organization.company_contact_name || organization.public_name || organization.name,
      client: false
    },
    {
      x: MARGIN + signWidth + 14,
      label: input.document.document_type === 'quote' ? 'Bon pour accord · client' : 'Pour le bénéficiaire / client',
      name: beneficiaryName(input),
      client: true
    }
  ];

  boxes.forEach((box) => {
    drawCardFrame(state.page, theme, {
      x: box.x,
      y: top,
      width: signWidth,
      height: signHeight,
      fill: box.client && input.document.document_type === 'quote' ? 'accent' : 'white'
    });
    drawCardHeading(state.page, theme, box.label, box.x + 12, top - 18);
    const nameLines = wrapTrainingPdfText(box.name, theme.bold, 8.2, signWidth - 24).slice(0, 2);
    nameLines.forEach((line, index) => drawTrainingPdfText(state.page, line, {
      x: box.x + 12,
      y: top - 39 - index * 10,
      size: 8.2,
      font: theme.bold,
      color: theme.dark
    }));
    drawTrainingPdfText(state.page, box.client ? 'Nom, qualité, date et signature' : 'Date, cachet et signature', {
      x: box.x + 12,
      y: top - signHeight + 14,
      size: 6.1,
      font: theme.regular,
      color: theme.muted
    });

    if (!box.client && theme.signature) {
      const scale = Math.min(88 / theme.signature.width, 36 / theme.signature.height, 1);
      state.page.drawImage(theme.signature, {
        x: box.x + 12,
        y: top - signHeight + 29,
        width: theme.signature.width * scale,
        height: theme.signature.height * scale
      });
    }
    if (!box.client && theme.stamp) {
      const scale = Math.min(56 / theme.stamp.width, 42 / theme.stamp.height, 1);
      state.page.drawImage(theme.stamp, {
        x: box.x + signWidth - theme.stamp.width * scale - 12,
        y: top - signHeight + 27,
        width: theme.stamp.width * scale,
        height: theme.stamp.height * scale,
        opacity: 0.84
      });
    }
  });

  return top - signHeight;
}

export async function generateTrainingCommercialPdf(input: CommercialPdfInput) {
  const { organization, document, customer, funder, session, trainee, program } = input;
  const theme = await createTrainingPdfTheme(organization);
  const pages: PageState[] = [];

  const addPage = (continuation = false) => {
    const page = theme.pdf.addPage([595.28, 841.89]);
    const number = pages.length + 1;
    const y = drawCardDocumentHeader(page, theme, organization, {
      badge: documentBadge(input),
      title: documentTitle(input),
      subtitle: continuation ? `${document.title} · suite` : document.title,
      reference: document.reference,
      meta: continuation ? `Page ${number}` : `Émis le ${trainingPdfDate(document.issue_date)}`,
      continuation
    });
    const state = { page, y, number };
    pages.push(state);
    return state;
  };

  let state = addPage();
  const ensure = (height: number) => {
    if (state.y - height < CARD_DOCUMENT_BOTTOM_LIMIT) state = addPage(true);
  };

  const clientLabel = beneficiaryName(input);
  const metaGap = 10;
  const metaWidth = (CONTENT_WIDTH - metaGap * 2) / 3;
  const metaTop = state.y;
  drawCardMetric(state.page, theme, {
    x: MARGIN,
    y: metaTop,
    width: metaWidth,
    height: 70,
    label: 'Client / bénéficiaire',
    value: clientLabel,
    detail: customer?.contact_name || trainee?.email || 'Coordonnées rattachées au dossier'
  });
  drawCardMetric(state.page, theme, {
    x: MARGIN + metaWidth + metaGap,
    y: metaTop,
    width: metaWidth,
    height: 70,
    label: 'Référence',
    value: document.reference,
    detail: trainingCommercialDocumentStatusLabels[document.status]
  });
  drawCardMetric(state.page, theme, {
    x: MARGIN + (metaWidth + metaGap) * 2,
    y: metaTop,
    width: metaWidth,
    height: 70,
    label: document.document_type === 'quote' ? 'Validité' : 'Date d’émission',
    value: document.document_type === 'quote' && document.valid_until ? trainingPdfDate(document.valid_until) : trainingPdfDate(document.issue_date),
    detail: `${document.participant_count} participant${document.participant_count > 1 ? 's' : ''}`
  });
  state.y -= 86;

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

  const partyGap = 12;
  const partyWidth = (CONTENT_WIDTH - partyGap) / 2;
  const issuerHeight = entityCardHeight(theme, partyWidth, organization.public_name || organization.name, issuerLines);
  const recipientHeight = entityCardHeight(theme, partyWidth, clientLabel, recipientLines);
  const partyHeight = Math.max(issuerHeight, recipientHeight);
  ensure(partyHeight + 58);
  state.y = drawCardSectionTitle(
    state.page,
    theme,
    document.document_type === 'quote' ? 'Les interlocuteurs' : 'Les parties',
    state.y,
    document.document_type === 'quote' ? 'CADRE COMMERCIAL' : 'CADRE CONTRACTUEL'
  );
  drawEntityCard(state.page, theme, {
    x: MARGIN,
    y: state.y,
    width: partyWidth,
    height: partyHeight,
    label: 'Organisme de formation',
    name: organization.public_name || organization.name,
    details: issuerLines
  });
  drawEntityCard(state.page, theme, {
    x: MARGIN + partyWidth + partyGap,
    y: state.y,
    width: partyWidth,
    height: partyHeight,
    label: 'Client / bénéficiaire',
    name: clientLabel,
    details: recipientLines
  });
  state.y -= partyHeight + 18;

  ensure(210);
  state.y = drawCardSectionTitle(
    state.page,
    theme,
    document.document_type === 'quote' ? 'Prestation proposée' : 'Objet de la convention',
    state.y,
    'FORMATION'
  );
  const summary = document.training_summary || program?.description || program?.objectives || session?.title || 'Prestation de formation professionnelle.';
  const summaryLines = wrapTrainingPdfText(summary, theme.regular, 7.7, CONTENT_WIDTH - 24).slice(0, 8);
  state.y = drawCardTextBlock(state.page, theme, {
    x: MARGIN,
    y: state.y,
    width: CONTENT_WIDTH,
    title: program?.title || session?.title || document.title,
    lines: summaryLines,
    fill: 'surface',
    accentEdge: true
  }) - 16;

  ensure(90);
  const factGap = 8;
  const factWidth = (CONTENT_WIDTH - factGap * 3) / 4;
  const duration = program
    ? `${String(program.duration_hours).replace('.', ',')} h`
    : session
      ? `${Math.max(0, (new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 3_600_000).toLocaleString('fr-FR')} h`
      : 'À confirmer';
  const modality = program ? modalityLabels[program.modality] : session ? modalityLabels[session.modality] : 'À confirmer';
  const period = session ? `${trainingPdfDate(session.starts_at, true)} → ${trainingPdfDate(session.ends_at, true)}` : 'À convenir';
  const location = session?.location || program?.default_location || 'À convenir';
  [
    ['Durée', duration],
    ['Format', modality],
    ['Période', period],
    ['Lieu', location]
  ].forEach(([label, value], index) => drawCardMetric(state.page, theme, {
    x: MARGIN + index * (factWidth + factGap),
    y: state.y,
    width: factWidth,
    height: 70,
    label,
    value
  }));
  state.y -= 86;

  ensure(136);
  state.y = drawCardSectionTitle(
    state.page,
    theme,
    'Conditions financières',
    state.y,
    document.document_type === 'quote' ? 'SYNTHÈSE DE L’OFFRE' : 'SYNTHÈSE FINANCIÈRE'
  );
  const financeGap = 10;
  const financeWidth = (CONTENT_WIDTH - financeGap * 2) / 3;
  [
    ['Total HT', formatTrainingMoney(document.amount_excl_tax_cents), false],
    [`TVA ${(document.vat_rate_basis_points / 100).toLocaleString('fr-FR')} %`, formatTrainingMoney(document.tax_cents), false],
    ['Total TTC', formatTrainingMoney(document.amount_incl_tax_cents), true]
  ].forEach(([label, value, emphasized], index) => drawCardMetric(state.page, theme, {
    x: MARGIN + index * (financeWidth + financeGap),
    y: state.y,
    width: financeWidth,
    height: 72,
    label: String(label),
    value,
    emphasized: Boolean(emphasized),
    detail: index === 0 ? `${document.participant_count} participant${document.participant_count > 1 ? 's' : ''}` : undefined
  }));
  state.y -= 90;

  const details: Array<[string, unknown]> = [
    ['Formation', program?.title || session?.title || document.title],
    ['Code formation', program?.code || '-'],
    ['Bénéficiaire', trainee ? `${trainee.first_name} ${trainee.last_name}`.trim() : clientLabel],
    ['Financeur', funder ? `${funder.name} · ${trainingFunderTypeLabels[funder.funder_type]}` : 'Sans financeur identifié']
  ];
  ensure(204);
  state.y = drawCardSectionTitle(state.page, theme, 'Cadre de la prestation', state.y, 'REPÈRES');
  const detailGap = 10;
  const detailWidth = (CONTENT_WIDTH - detailGap) / 2;
  details.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawCardMetric(state.page, theme, {
      x: MARGIN + column * (detailWidth + detailGap),
      y: state.y - row * 68,
      width: detailWidth,
      height: 58,
      label,
      value
    });
  });
  state.y -= 146;

  const sections = ([
    ['Objectifs pédagogiques', program?.objectives] as [string, unknown],
    ['Public concerné', program?.audience] as [string, unknown],
    ['Prérequis', program?.prerequisites] as [string, unknown],
    ['Programme détaillé', program?.detailed_program] as [string, unknown],
    ['Méthodes et moyens pédagogiques', [program?.teaching_methods, program?.training_resources].filter(Boolean).join('\n')] as [string, unknown],
    ['Modalités d’évaluation', program?.assessment_methods] as [string, unknown],
    ['Accessibilité', program?.accessibility] as [string, unknown]
  ]).filter(([, value]) => Boolean(normalizeTrainingPdfText(value)));

  for (const [title, value] of sections) {
    const remaining = [...wrapTrainingPdfText(value, theme.regular, 7.5, CONTENT_WIDTH - 24)];
    let continuation = false;
    while (remaining.length) {
      ensure(82);
      const available = Math.max(50, state.y - CARD_DOCUMENT_BOTTOM_LIMIT - 42);
      const maxLines = Math.max(2, Math.min(24, Math.floor((available - 52) / 10.5)));
      const chunk = remaining.splice(0, maxLines);
      state.y = drawCardTextBlock(state.page, theme, {
        x: MARGIN,
        y: state.y,
        width: CONTENT_WIDTH,
        title: continuation ? `${title} · suite` : title,
        lines: chunk,
        fill: 'white',
        accentEdge: false
      }) - 12;
      continuation = remaining.length > 0;
      if (continuation) state = addPage(true);
    }
  }

  const terms = document.terms || organization.training_default_terms;
  if (terms) {
    const remaining = [...wrapTrainingPdfText(terms, theme.regular, 7.2, CONTENT_WIDTH - 24)];
    let continuation = false;
    while (remaining.length) {
      ensure(86);
      const available = Math.max(50, state.y - CARD_DOCUMENT_BOTTOM_LIMIT - 42);
      const maxLines = Math.max(2, Math.min(26, Math.floor((available - 52) / 10.2)));
      const chunk = remaining.splice(0, maxLines);
      state.y = drawCardTextBlock(state.page, theme, {
        x: MARGIN,
        y: state.y,
        width: CONTENT_WIDTH,
        title: continuation ? 'Conditions et modalités · suite' : 'Conditions et modalités',
        lines: chunk,
        fill: 'surface',
        accentEdge: true
      }) - 12;
      continuation = remaining.length > 0;
      if (continuation) state = addPage(true);
    }
  }

  ensure(document.document_type === 'quote' ? 214 : 182);
  state.y = drawCardSectionTitle(
    state.page,
    theme,
    document.document_type === 'quote' ? 'Validation du devis' : 'Acceptation et signatures',
    state.y,
    document.document_type === 'quote' ? 'BON POUR ACCORD' : 'ENGAGEMENT'
  );
  if (document.document_type === 'quote') {
    const accordLines = wrapTrainingPdfText(
      `Le client confirme accepter la proposition ${document.reference} dans les conditions indiquées au présent devis.`,
      theme.regular,
      7.4,
      CONTENT_WIDTH
    ).slice(0, 3);
    accordLines.forEach((line, index) => drawTrainingPdfText(state.page, line, {
      x: MARGIN,
      y: state.y - index * 10,
      size: 7.4,
      font: theme.regular,
      color: theme.muted
    }));
    state.y -= 38;
  }
  state.y = drawSignatureBoxes(state, theme, organization, input) - 14;

  const footerNote = normalizeTrainingPdfText(organization.training_document_footer);
  if (footerNote) {
    const lines = wrapTrainingPdfText(footerNote, theme.regular, 6.6, CONTENT_WIDTH - 24);
    ensure(44 + lines.length * 9);
    state.y = drawCardTextBlock(state.page, theme, {
      x: MARGIN,
      y: state.y,
      width: CONTENT_WIDTH,
      title: 'Informations utiles',
      lines,
      lineHeight: 9,
      fill: 'accent'
    }) - 6;
  }

  pages.forEach((item) => drawCardDocumentFooter(item.page, theme, organization, {
    reference: document.reference,
    pageNumber: item.number,
    totalPages: pages.length
  }));

  theme.pdf.setTitle(`${documentTitle(input)} ${document.reference} - ${document.title}`);
  theme.pdf.setAuthor(organization.public_name || organization.name);
  theme.pdf.setSubject(program?.title || document.training_summary || document.title);
  theme.pdf.setCreator('NCR Suite');
  theme.pdf.setProducer('NCR Suite V2.29.20 · Card-based document system');

  const bytes = await theme.pdf.save();
  const pdfBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return {
    blob: new Blob([pdfBuffer], { type: 'application/pdf' }),
    filename: `${safeTrainingPdfName(document.reference || documentTitle(input))}.pdf`
  };
}
