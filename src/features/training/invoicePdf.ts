import { degrees, rgb, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  createTrainingPdfTheme,
  drawTrainingParagraph,
  drawTrainingPdfText,
  drawTrainingPremiumFooter,
  drawTrainingPremiumHeader,
  safeTrainingPdfName,
  TRAINING_PDF_MARGIN,
  TRAINING_PDF_PAGE,
  trainingPdfDate,
  wrapTrainingPdfText,
  type TrainingPdfTheme
} from './premiumPdf';
import {
  formatTrainingMoney,
  type TrainingInvoiceLineRecord,
  type TrainingInvoicePartySnapshot,
  type TrainingInvoiceRecord
} from './types';

const CONTENT_WIDTH = TRAINING_PDF_PAGE[0] - TRAINING_PDF_MARGIN * 2;
const BOTTOM_LIMIT = 78;

type PageState = { page: PDFPage; y: number; number: number };

function partyLines(party: TrainingInvoicePartySnapshot) {
  return [
    party.contact_name ? `Contact : ${party.contact_name}` : '',
    party.address || '',
    [party.postal_code, party.city].filter(Boolean).join(' '),
    party.siret ? `SIRET : ${party.siret}` : '',
    party.vat_number ? `TVA : ${party.vat_number}` : '',
    [party.email, party.phone].filter(Boolean).join(' · ')
  ].filter(Boolean);
}

function partyLayout(theme: TrainingPdfTheme, party: TrainingInvoicePartySnapshot, width: number) {
  const nameLines = wrapTrainingPdfText(party.name || '-', theme.bold, 10, width - 32);
  const details = partyLines(party).flatMap((line) => wrapTrainingPdfText(line, theme.regular, 7.1, width - 32));
  return { nameLines, details, height: Math.max(112, 58 + nameLines.length * 12 + details.length * 10.5 + 12) };
}

function drawParty(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: { x: number; y: number; width: number; height: number; label: string; party: TrainingInvoicePartySnapshot }
) {
  const layout = partyLayout(theme, input.party, input.width);
  page.drawRectangle({
    x: input.x,
    y: input.y - input.height,
    width: input.width,
    height: input.height,
    color: theme.surface,
    borderColor: theme.line,
    borderWidth: 0.7
  });
  page.drawRectangle({ x: input.x, y: input.y - input.height, width: 5, height: input.height, color: theme.accent });
  drawTrainingPdfText(page, input.label.toUpperCase(), {
    x: input.x + 16, y: input.y - 20, size: 6.3, font: theme.bold, color: theme.accent
  });
  layout.nameLines.forEach((line, index) => drawTrainingPdfText(page, line, {
    x: input.x + 16, y: input.y - 40 - index * 12, size: 10, font: theme.bold, color: theme.dark
  }));
  let cursor = input.y - 56 - layout.nameLines.length * 12;
  layout.details.forEach((line) => {
    drawTrainingPdfText(page, line, { x: input.x + 16, y: cursor, size: 7.1, font: theme.regular, color: theme.muted });
    cursor -= 10.5;
  });
}

function drawMeta(page: PDFPage, theme: TrainingPdfTheme, label: string, value: string, x: number, y: number, width: number) {
  drawTrainingPdfText(page, label.toUpperCase(), { x, y, size: 6.1, font: theme.bold, color: theme.muted });
  const lines = wrapTrainingPdfText(value, theme.bold, 8.5, width);
  lines.slice(0, 3).forEach((line, index) => drawTrainingPdfText(page, line, {
    x, y: y - 16 - index * 11, size: 8.5, font: theme.bold, color: theme.dark
  }));
}

export async function generateTrainingInvoicePdf(input: {
  organization: Organization;
  invoice: TrainingInvoiceRecord;
  lines: TrainingInvoiceLineRecord[];
}) {
  const { organization, invoice } = input;
  const lines = [...input.lines].sort((a, b) => a.position - b.position);
  const theme = await createTrainingPdfTheme(organization);
  const isCredit = invoice.document_kind === 'credit_note';
  const reference = invoice.invoice_number || 'BROUILLON';
  const pages: PageState[] = [];

  const addPage = (continuation = false) => {
    const page = theme.pdf.addPage(TRAINING_PDF_PAGE);
    const number = pages.length + 1;
    let y = drawTrainingPremiumHeader(page, theme, organization, {
      eyebrow: continuation ? 'FORMATION · FACTURATION · SUITE' : 'FORMATION · FACTURATION',
      title: continuation ? `${isCredit ? 'Avoir' : 'Facture'} · suite` : (isCredit ? 'Avoir' : 'Facture'),
      subtitle: invoice.title,
      reference,
      pageNumber: number
    });
    const state = { page, y, number };
    pages.push(state);
    return state;
  };

  let state = addPage();
  if (invoice.status === 'draft') {
    state.page.drawText('BROUILLON', {
      x: 145, y: 410, size: 54, font: theme.bold, color: rgb(0.72, 0.76, 0.82), opacity: 0.16, rotate: degrees(32)
    });
  }

  const ensure = (height: number, continuation = true) => {
    if (state.y - height < BOTTOM_LIMIT) state = addPage(continuation);
  };

  const seller: TrainingInvoicePartySnapshot = invoice.seller_snapshot?.name ? invoice.seller_snapshot : {
    name: organization.public_name || organization.name,
    address: organization.company_address,
    postal_code: organization.company_postal_code,
    city: organization.company_city,
    siret: organization.company_siret,
    vat_number: organization.training_vat_number,
    email: organization.training_reply_to_email || organization.company_email,
    phone: organization.company_phone
  };
  const buyer = invoice.buyer_snapshot;
  const cardGap = 12;
  const cardWidth = (CONTENT_WIDTH - cardGap) / 2;
  const sellerHeight = partyLayout(theme, seller, cardWidth).height;
  const buyerHeight = partyLayout(theme, buyer, cardWidth).height;
  const partyHeight = Math.max(sellerHeight, buyerHeight);
  drawParty(state.page, theme, { x: TRAINING_PDF_MARGIN, y: state.y, width: cardWidth, height: partyHeight, label: 'Emetteur', party: seller });
  drawParty(state.page, theme, {
    x: TRAINING_PDF_MARGIN + cardWidth + cardGap,
    y: state.y,
    width: cardWidth,
    height: partyHeight,
    label: invoice.payer_kind === 'funder' ? 'Financeur' : 'Client',
    party: buyer
  });
  state.y -= partyHeight + 24;

  const metaWidth = (CONTENT_WIDTH - 24) / 4;
  [
    ['Emission', trainingPdfDate(invoice.issue_date)],
    ['Prestation', trainingPdfDate(invoice.service_date)],
    ['Echeance', trainingPdfDate(invoice.due_date)],
    ['Reference client', invoice.purchase_order_number || '-']
  ].forEach(([label, value], index) => drawMeta(
    state.page, theme, label, value, TRAINING_PDF_MARGIN + index * (metaWidth + 8), state.y, metaWidth
  ));
  state.y -= 68;

  const columns = {
    description: { x: TRAINING_PDF_MARGIN + 10, width: 236 },
    quantity: { x: TRAINING_PDF_MARGIN + 258, width: 48 },
    unit: { x: TRAINING_PDF_MARGIN + 320, width: 72 },
    vat: { x: TRAINING_PDF_MARGIN + 405, width: 42 },
    total: { x: TRAINING_PDF_MARGIN + 458, width: 53 }
  };

  const drawTableHeader = () => {
    state.page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: state.y - 28, width: CONTENT_WIDTH, height: 28, color: theme.dark });
    [
      [columns.description.x, 'DESIGNATION'],
      [columns.quantity.x, 'QTE'],
      [columns.unit.x, 'PU HT'],
      [columns.vat.x, 'TVA'],
      [columns.total.x, 'TOTAL HT']
    ].forEach(([x, label]) => drawTrainingPdfText(state.page, label, {
      x: Number(x), y: state.y - 18, size: 5.8, font: theme.bold, color: rgb(0.86, 0.89, 0.94)
    }));
    state.y -= 28;
  };

  drawTableHeader();
  lines.forEach((line, index) => {
    const description = wrapTrainingPdfText(line.description, theme.regular, 7.6, columns.description.width);
    const rowHeight = Math.max(30, 18 + description.length * 10);
    if (state.y - rowHeight < BOTTOM_LIMIT) {
      state = addPage(true);
      drawTableHeader();
    }
    state.page.drawRectangle({
      x: TRAINING_PDF_MARGIN, y: state.y - rowHeight, width: CONTENT_WIDTH, height: rowHeight,
      color: index % 2 === 0 ? theme.surface : rgb(1, 1, 1)
    });
    description.forEach((text, lineIndex) => drawTrainingPdfText(state.page, text, {
      x: columns.description.x, y: state.y - 18 - lineIndex * 10, size: 7.6, font: theme.regular, color: theme.dark
    }));
    drawTrainingPdfText(state.page, `${String(line.quantity).replace('.', ',')} ${line.unit_label || ''}`.trim(), {
      x: columns.quantity.x, y: state.y - 18, size: 6.8, font: theme.regular, color: theme.dark
    });
    drawTrainingPdfText(state.page, formatTrainingMoney(line.unit_price_excl_tax_cents), {
      x: columns.unit.x, y: state.y - 18, size: 6.8, font: theme.regular, color: theme.dark
    });
    drawTrainingPdfText(state.page, `${(line.vat_rate_basis_points / 100).toLocaleString('fr-FR')} %`, {
      x: columns.vat.x, y: state.y - 18, size: 6.8, font: theme.regular, color: theme.dark
    });
    const totalValue = formatTrainingMoney(line.subtotal_cents);
    drawTrainingPdfText(state.page, totalValue, {
      x: columns.total.x, y: state.y - 18, size: 6.8, font: theme.bold, color: theme.dark
    });
    state.y -= rowHeight;
  });

  ensure(196);
  state.y -= 18;
  const totalsX = TRAINING_PDF_MARGIN + 300;
  const totalsWidth = CONTENT_WIDTH - 300;
  [
    ['TOTAL HT', invoice.subtotal_cents],
    ['TVA', invoice.tax_cents],
    [isCredit ? 'TOTAL A DEDUIRE' : 'TOTAL TTC', invoice.total_cents]
  ].forEach(([label, amount], index) => {
    const rowY = state.y - index * 28;
    state.page.drawRectangle({
      x: totalsX, y: rowY - 24, width: totalsWidth, height: 24,
      color: index === 2 ? theme.dark : theme.surface
    });
    drawTrainingPdfText(state.page, String(label), {
      x: totalsX + 12, y: rowY - 16, size: 7, font: theme.bold,
      color: index === 2 ? rgb(1, 1, 1) : theme.muted
    });
    const value = formatTrainingMoney(Number(amount));
    drawTrainingPdfText(state.page, value, {
      x: totalsX + totalsWidth - theme.bold.widthOfTextAtSize(value, index === 2 ? 11 : 8) - 12,
      y: rowY - 17, size: index === 2 ? 11 : 8, font: theme.bold,
      color: index === 2 ? rgb(1, 1, 1) : theme.dark
    });
  });
  state.y -= 104;

  if (!isCredit && invoice.paid_amount_cents > 0) {
    const paidText = `Deja regle : ${formatTrainingMoney(invoice.paid_amount_cents)} · Reste du : ${formatTrainingMoney(invoice.balance_due_cents)}`;
    wrapTrainingPdfText(paidText, theme.bold, 8, CONTENT_WIDTH).forEach((text, index) => drawTrainingPdfText(state.page, text, {
      x: TRAINING_PDF_MARGIN, y: state.y - index * 11, size: 8, font: theme.bold, color: theme.accent
    }));
    state.y -= 28;
  }

  const legalLines = [
    invoice.payment_terms_text || '',
    invoice.late_penalty_text ? `Penalites de retard : ${invoice.late_penalty_text}.` : '',
    'Indemnite forfaitaire pour frais de recouvrement due en cas de retard : 40 EUR.',
    invoice.tax_exemption_text || '',
    invoice.notes || ''
  ].filter(Boolean);
  const legalWrapped = legalLines.flatMap((item) => wrapTrainingPdfText(item, theme.regular, 6.7, CONTENT_WIDTH - 24));
  const legalHeight = Math.max(62, 34 + legalWrapped.length * 9.2);
  ensure(legalHeight + 34);
  state.page.drawRectangle({
    x: TRAINING_PDF_MARGIN, y: state.y - legalHeight, width: CONTENT_WIDTH, height: legalHeight,
    color: theme.surface, borderColor: theme.line, borderWidth: 0.7
  });
  drawTrainingPdfText(state.page, 'REGLEMENT ET MENTIONS', {
    x: TRAINING_PDF_MARGIN + 12, y: state.y - 18, size: 6.2, font: theme.bold, color: theme.accent
  });
  legalWrapped.forEach((line, index) => drawTrainingPdfText(state.page, line, {
    x: TRAINING_PDF_MARGIN + 12, y: state.y - 34 - index * 9.2, size: 6.7, font: theme.regular, color: theme.muted
  }));
  state.y -= legalHeight + 12;

  const bank = invoice.seller_snapshot || {};
  const bankText = [
    bank.bank_account_holder ? `Titulaire : ${bank.bank_account_holder}` : '',
    bank.bank_name || '',
    bank.iban ? `IBAN : ${bank.iban}` : '',
    bank.bic ? `BIC : ${bank.bic}` : ''
  ].filter(Boolean).join(' · ');
  if (bankText) {
    const bankLines = wrapTrainingPdfText(bankText, theme.regular, 6.4, CONTENT_WIDTH);
    ensure(bankLines.length * 9 + 12);
    bankLines.forEach((line, index) => drawTrainingPdfText(state.page, line, {
      x: TRAINING_PDF_MARGIN, y: state.y - index * 9, size: 6.4, font: theme.regular, color: theme.muted
    }));
  }

  pages.forEach((item) => drawTrainingPremiumFooter(item.page, theme, organization, {
    reference,
    pageNumber: item.number,
    totalPages: pages.length
  }));
  theme.pdf.setTitle(`${isCredit ? 'Avoir' : 'Facture'} ${reference} - ${invoice.title}`);
  theme.pdf.setAuthor(organization.public_name || organization.name);
  theme.pdf.setSubject(invoice.title);
  theme.pdf.setCreator('NCR Suite');
  theme.pdf.setProducer('NCR Suite V2.18.0');
  const bytes = await theme.pdf.save();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return {
    blob: new Blob([buffer], { type: 'application/pdf' }),
    filename: `${safeTrainingPdfName(reference)}.pdf`
  };
}
