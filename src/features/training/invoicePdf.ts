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

function drawParty(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: { x: number; y: number; width: number; label: string; party: TrainingInvoicePartySnapshot }
) {
  page.drawRectangle({
    x: input.x,
    y: input.y - 112,
    width: input.width,
    height: 112,
    color: theme.surface,
    borderColor: theme.line,
    borderWidth: 0.7
  });
  page.drawRectangle({ x: input.x, y: input.y - 112, width: 5, height: 112, color: theme.accent });
  drawTrainingPdfText(page, input.label.toUpperCase(), {
    x: input.x + 16, y: input.y - 20, size: 6.3, font: theme.bold, color: theme.accent
  });
  const nameLines = wrapTrainingPdfText(input.party.name || '-', theme.bold, 10, input.width - 32).slice(0, 2);
  nameLines.forEach((line, index) => drawTrainingPdfText(page, line, {
    x: input.x + 16, y: input.y - 40 - index * 12, size: 10, font: theme.bold, color: theme.dark
  }));
  const startY = input.y - 64 - Math.max(0, nameLines.length - 1) * 10;
  partyLines(input.party).slice(0, 4).forEach((line, index) => drawTrainingPdfText(page, line, {
    x: input.x + 16, y: startY - index * 11, size: 7.1, font: theme.regular, color: theme.muted
  }));
}

function drawMeta(page: PDFPage, theme: TrainingPdfTheme, label: string, value: string, x: number, y: number, width: number) {
  drawTrainingPdfText(page, label.toUpperCase(), { x, y, size: 6.1, font: theme.bold, color: theme.muted });
  const lines = wrapTrainingPdfText(value, theme.bold, 8.5, width).slice(0, 2);
  lines.forEach((line, index) => drawTrainingPdfText(page, line, {
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
  const page = theme.pdf.addPage(TRAINING_PDF_PAGE);
  const isCredit = invoice.document_kind === 'credit_note';
  const reference = invoice.invoice_number || 'BROUILLON';
  let y = drawTrainingPremiumHeader(page, theme, organization, {
    eyebrow: 'FORMATION · FACTURATION',
    title: isCredit ? 'Avoir' : 'Facture',
    subtitle: invoice.title,
    reference
  });

  if (invoice.status === 'draft') {
    page.drawText('BROUILLON', {
      x: 145, y: 410, size: 54, font: theme.bold, color: rgb(0.72, 0.76, 0.82), opacity: 0.16, rotate: degrees(32)
    });
  }

  const cardGap = 12;
  const cardWidth = (CONTENT_WIDTH - cardGap) / 2;
  drawParty(page, theme, {
    x: TRAINING_PDF_MARGIN, y, width: cardWidth, label: 'Emetteur',
    party: invoice.seller_snapshot?.name ? invoice.seller_snapshot : {
      name: organization.public_name || organization.name,
      address: organization.company_address,
      postal_code: organization.company_postal_code,
      city: organization.company_city,
      siret: organization.company_siret,
      vat_number: organization.training_vat_number,
      email: organization.training_reply_to_email || organization.company_email,
      phone: organization.company_phone
    }
  });
  drawParty(page, theme, {
    x: TRAINING_PDF_MARGIN + cardWidth + cardGap, y, width: cardWidth,
    label: invoice.payer_kind === 'funder' ? 'Financeur' : 'Client',
    party: invoice.buyer_snapshot
  });
  y -= 138;

  const metaWidth = (CONTENT_WIDTH - 24) / 4;
  [
    ['Emission', trainingPdfDate(invoice.issue_date)],
    ['Prestation', trainingPdfDate(invoice.service_date)],
    ['Echeance', trainingPdfDate(invoice.due_date)],
    ['Reference client', invoice.purchase_order_number || '-']
  ].forEach(([label, value], index) => drawMeta(
    page, theme, label, value, TRAINING_PDF_MARGIN + index * (metaWidth + 8), y, metaWidth
  ));
  y -= 62;

  const columns = {
    description: { x: TRAINING_PDF_MARGIN + 10, width: 245 },
    quantity: { x: TRAINING_PDF_MARGIN + 270, width: 45 },
    unit: { x: TRAINING_PDF_MARGIN + 330, width: 62 },
    vat: { x: TRAINING_PDF_MARGIN + 407, width: 42 },
    total: { x: TRAINING_PDF_MARGIN + 462, width: 49 }
  };
  page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: y - 28, width: CONTENT_WIDTH, height: 28, color: theme.dark });
  [
    [columns.description.x, 'DESIGNATION'],
    [columns.quantity.x, 'QTE'],
    [columns.unit.x, 'PU HT'],
    [columns.vat.x, 'TVA'],
    [columns.total.x, 'TOTAL HT']
  ].forEach(([x, label]) => drawTrainingPdfText(page, label, {
    x: Number(x), y: y - 18, size: 5.8, font: theme.bold, color: rgb(0.86, 0.89, 0.94)
  }));
  y -= 28;

  const visibleLines = lines.slice(0, 9);
  visibleLines.forEach((line, index) => {
    const description = wrapTrainingPdfText(line.description, theme.regular, 7.6, columns.description.width).slice(0, 2);
    const rowHeight = description.length > 1 ? 38 : 30;
    page.drawRectangle({
      x: TRAINING_PDF_MARGIN, y: y - rowHeight, width: CONTENT_WIDTH, height: rowHeight,
      color: index % 2 === 0 ? theme.surface : rgb(1, 1, 1)
    });
    description.forEach((text, lineIndex) => drawTrainingPdfText(page, text, {
      x: columns.description.x, y: y - 18 - lineIndex * 10, size: 7.6, font: theme.regular, color: theme.dark
    }));
    drawTrainingPdfText(page, String(line.quantity).replace('.', ','), {
      x: columns.quantity.x, y: y - 18, size: 7.2, font: theme.regular, color: theme.dark
    });
    drawTrainingPdfText(page, formatTrainingMoney(line.unit_price_excl_tax_cents), {
      x: columns.unit.x, y: y - 18, size: 7.2, font: theme.regular, color: theme.dark
    });
    drawTrainingPdfText(page, `${(line.vat_rate_basis_points / 100).toLocaleString('fr-FR')} %`, {
      x: columns.vat.x, y: y - 18, size: 7.2, font: theme.regular, color: theme.dark
    });
    drawTrainingPdfText(page, formatTrainingMoney(line.subtotal_cents), {
      x: columns.total.x, y: y - 18, size: 7.2, font: theme.bold, color: theme.dark
    });
    y -= rowHeight;
  });
  if (lines.length > visibleLines.length) {
    drawTrainingPdfText(page, `+ ${lines.length - visibleLines.length} ligne(s) annexe(s)`, {
      x: TRAINING_PDF_MARGIN + 10, y: y - 16, size: 7, font: theme.regular, color: theme.muted
    });
    y -= 28;
  }
  y -= 18;

  const totalsX = TRAINING_PDF_MARGIN + 300;
  const totalsWidth = CONTENT_WIDTH - 300;
  [
    ['TOTAL HT', invoice.subtotal_cents],
    ['TVA', invoice.tax_cents],
    [isCredit ? 'TOTAL A DEDUIRE' : 'TOTAL TTC', invoice.total_cents]
  ].forEach(([label, amount], index) => {
    const rowY = y - index * 28;
    page.drawRectangle({
      x: totalsX, y: rowY - 24, width: totalsWidth, height: 24,
      color: index === 2 ? theme.dark : theme.surface
    });
    drawTrainingPdfText(page, String(label), {
      x: totalsX + 12, y: rowY - 16, size: 7, font: theme.bold,
      color: index === 2 ? rgb(1, 1, 1) : theme.muted
    });
    const value = formatTrainingMoney(Number(amount));
    drawTrainingPdfText(page, value, {
      x: totalsX + totalsWidth - theme.bold.widthOfTextAtSize(value, index === 2 ? 11 : 8) - 12,
      y: rowY - 17, size: index === 2 ? 11 : 8, font: theme.bold,
      color: index === 2 ? rgb(1, 1, 1) : theme.dark
    });
  });
  y -= 104;

  if (!isCredit && invoice.paid_amount_cents > 0) {
    drawTrainingPdfText(page, `Deja regle : ${formatTrainingMoney(invoice.paid_amount_cents)} · Reste du : ${formatTrainingMoney(invoice.balance_due_cents)}`, {
      x: TRAINING_PDF_MARGIN, y, size: 8, font: theme.bold, color: theme.accent
    });
    y -= 24;
  }

  const legalLines = [
    invoice.payment_terms_text || '',
    invoice.late_penalty_text ? `Penalites de retard : ${invoice.late_penalty_text}.` : '',
    'Indemnite forfaitaire pour frais de recouvrement due en cas de retard : 40 EUR.',
    invoice.tax_exemption_text || '',
    invoice.notes || ''
  ].filter(Boolean);
  page.drawRectangle({
    x: TRAINING_PDF_MARGIN, y: Math.max(82, y - 78), width: CONTENT_WIDTH, height: Math.min(78, y - 82),
    color: theme.surface, borderColor: theme.line, borderWidth: 0.7
  });
  drawTrainingPdfText(page, 'REGLEMENT ET MENTIONS', {
    x: TRAINING_PDF_MARGIN + 12, y: y - 18, size: 6.2, font: theme.bold, color: theme.accent
  });
  drawTrainingParagraph(page, theme, legalLines.join('\n'), y - 34, {
    x: TRAINING_PDF_MARGIN + 12, width: CONTENT_WIDTH - 24, size: 6.7, lineHeight: 9.2, maxLines: 5
  });

  const bank = invoice.seller_snapshot || {};
  const bankText = [
    bank.bank_account_holder ? `Titulaire : ${bank.bank_account_holder}` : '',
    bank.bank_name || '',
    bank.iban ? `IBAN : ${bank.iban}` : '',
    bank.bic ? `BIC : ${bank.bic}` : ''
  ].filter(Boolean).join(' · ');
  if (bankText) drawTrainingPdfText(page, bankText.slice(0, 140), {
    x: TRAINING_PDF_MARGIN, y: 61, size: 6.4, font: theme.regular, color: theme.muted
  });

  drawTrainingPremiumFooter(page, theme, organization, { reference });
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
