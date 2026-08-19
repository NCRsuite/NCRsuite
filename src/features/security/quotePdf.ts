import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import { formatSecurityDate, formatSecurityMoney, type SecurityBillingSnapshot, type SecurityQuoteRecord } from './types';
import { embedSecurityLogo, logoDimensions, securityAccent } from './pdfBranding';

const PAGE: [number, number] = [595.28, 841.89];
const MARGIN = 42;

function clean(value: unknown) {
  return String(value ?? '').replace(/[’‘]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...').replace(/\s+/g, ' ').trim();
}

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const splitLongToken = (token: string) => {
    if (!token || font.widthOfTextAtSize(token, size) <= width) return [token];
    const chunks: string[] = [];
    let current = '';
    for (const character of token) {
      const candidate = `${current}${character}`;
      if (current && font.widthOfTextAtSize(candidate, size) > width) {
        chunks.push(current);
        current = character;
      } else current = candidate;
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const words = clean(text || '-').split(' ').flatMap(splitLongToken);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['-'];
}

function issuerSnapshot(organization: Organization, quote: SecurityQuoteRecord): SecurityBillingSnapshot {
  return {
    name: organization.public_name || organization.name,
    logo_url: organization.logo_url,
    address: organization.security_billing_address,
    postal_code: organization.security_billing_postal_code,
    city: organization.security_billing_city,
    siret: organization.security_billing_siret,
    vat_number: organization.security_billing_vat_number,
    email: organization.security_billing_email,
    phone: organization.security_billing_phone,
    late_penalty_text: organization.security_late_penalty_text,
    tax_exemption_text: organization.security_tax_exemption_text,
    bank_account_holder: organization.security_bank_account_holder,
    bank_name: organization.security_bank_name,
    bank_iban: organization.security_bank_iban,
    bank_bic: organization.security_bank_bic,
    ...(quote.issuer_snapshot ?? {})
  };
}

export async function generateSecurityQuotePdf(organization: Organization, quote: SecurityQuoteRecord) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = securityAccent(organization);
  const dark = rgb(0.08, 0.10, 0.14);
  const muted = rgb(0.39, 0.43, 0.49);
  const line = rgb(0.86, 0.89, 0.93);
  const soft = rgb(0.96, 0.975, 0.99);
  const issuer = issuerSnapshot(organization, quote);
  const logo = await embedSecurityLogo(pdf, issuer.logo_url || organization.logo_url);
  let page!: PDFPage;
  let y = 0;
  let pageNumber = 0;

  const addPage = () => {
    page = pdf.addPage(PAGE);
    pageNumber += 1;
    y = PAGE[1] - MARGIN;
    if (logo) {
      const size = logoDimensions(logo, 88, 42);
      page.drawImage(logo, { x: MARGIN, y: y - size.height + 4, width: size.width, height: size.height });
    }
    const headerX = logo ? MARGIN + 100 : MARGIN;
    page.drawText('NCR SUITE · SÉCURITÉ PRIVÉE', { x: headerX, y: y - 4, size: 7.5, font: bold, color: accent });
    page.drawText('DEVIS', { x: headerX, y: y - 30, size: 23, font: bold, color: dark });
    page.drawText(quote.quote_number, { x: PAGE[0] - MARGIN - 160, y: y - 20, size: 11, font: bold, color: dark });
    page.drawText(`Page ${pageNumber}`, { x: PAGE[0] - MARGIN - 42, y: y - 39, size: 7, font: regular, color: muted });
    y -= 66;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE[0] - MARGIN, y }, thickness: 1, color: line });
    y -= 20;
  };
  const ensure = (height: number) => { if (y - height < 78) { addPage(); return true; } return false; };
  addPage();

  const boxWidth = (PAGE[0] - MARGIN * 2 - 12) / 2;
  const issuerNameLines = wrap(clean(issuer.name || organization.name), bold, 10.5, boxWidth - 26);
  const issuerDetailLines = [issuer.address, [issuer.postal_code, issuer.city].filter(Boolean).join(' '), issuer.siret ? `SIRET : ${issuer.siret}` : '', issuer.vat_number ? `TVA : ${issuer.vat_number}` : '', [issuer.email, issuer.phone].filter(Boolean).join(' · ')].filter(Boolean).flatMap((value) => wrap(clean(value), regular, 7.6, boxWidth - 26));
  const prospectNameLines = wrap(clean(quote.prospect_company_name), bold, 10.5, boxWidth - 26);
  const prospectDetailLines = [quote.prospect_contact_name, quote.prospect_billing_address, [quote.prospect_postal_code, quote.prospect_city].filter(Boolean).join(' '), quote.prospect_siret ? `SIRET : ${quote.prospect_siret}` : '', [quote.prospect_email, quote.prospect_phone].filter(Boolean).join(' · ')].filter(Boolean).flatMap((value) => wrap(clean(value), regular, 7.6, boxWidth - 26));
  const infoHeight = Math.max(
    116,
    58 + issuerNameLines.length * 12 + issuerDetailLines.length * 11 + 12,
    58 + prospectNameLines.length * 12 + prospectDetailLines.length * 11 + 12
  );
  page.drawRectangle({ x: MARGIN, y: y - infoHeight, width: boxWidth, height: infoHeight, color: soft, borderColor: line, borderWidth: 0.8 });
  page.drawRectangle({ x: MARGIN + boxWidth + 12, y: y - infoHeight, width: boxWidth, height: infoHeight, color: soft, borderColor: line, borderWidth: 0.8 });
  page.drawRectangle({ x: MARGIN, y: y - infoHeight, width: 5, height: infoHeight, color: accent });
  page.drawRectangle({ x: MARGIN + boxWidth + 12, y: y - infoHeight, width: 5, height: infoHeight, color: accent });
  page.drawText('ÉMETTEUR', { x: MARGIN + 13, y: y - 18, size: 7, font: bold, color: accent });
  issuerNameLines.forEach((text, index) => page.drawText(text, { x: MARGIN + 13, y: y - 38 - index * 12, size: 10.5, font: bold, color: dark }));
  let issuerY = y - 52 - issuerNameLines.length * 12;
  issuerDetailLines.forEach((text) => { page.drawText(text, { x: MARGIN + 13, y: issuerY, size: 7.6, font: regular, color: muted }); issuerY -= 11; });

  const clientX = MARGIN + boxWidth + 25;
  page.drawText('PROSPECT', { x: clientX, y: y - 18, size: 7, font: bold, color: accent });
  prospectNameLines.forEach((text, index) => page.drawText(text, { x: clientX, y: y - 38 - index * 12, size: 10.5, font: bold, color: dark }));
  let prospectY = y - 52 - prospectNameLines.length * 12;
  prospectDetailLines.forEach((text) => { page.drawText(text, { x: clientX, y: prospectY, size: 7.6, font: regular, color: muted }); prospectY -= 11; });
  y -= infoHeight + 22;

  const created = formatSecurityDate(quote.created_at);
  const valid = formatSecurityDate(quote.valid_until);
  page.drawText('DATE DU DEVIS', { x: MARGIN, y, size: 6.8, font: bold, color: muted });
  page.drawText(created, { x: MARGIN, y: y - 14, size: 8.8, font: bold, color: dark });
  page.drawText('VALABLE JUSQU’AU', { x: MARGIN + 190, y, size: 6.8, font: bold, color: muted });
  page.drawText(valid, { x: MARGIN + 190, y: y - 14, size: 8.8, font: bold, color: dark });
  if (quote.proposed_site_name) {
    page.drawText('SITE PROPOSÉ', { x: MARGIN + 380, y, size: 6.8, font: bold, color: muted });
    wrap(clean(quote.proposed_site_name), bold, 8.8, PAGE[0] - MARGIN - (MARGIN + 380)).slice(0, 2).forEach((text, index) => page.drawText(text, { x: MARGIN + 380, y: y - 14 - index * 11, size: 8.8, font: bold, color: dark }));
  }
  y -= 52;

  const drawHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - 25, width: PAGE[0] - MARGIN * 2, height: 25, color: dark });
    page.drawText('PRESTATION', { x: MARGIN + 9, y: y - 16, size: 7.2, font: bold, color: rgb(1,1,1) });
    page.drawText('QTÉ', { x: 346, y: y - 16, size: 7.2, font: bold, color: rgb(1,1,1) });
    page.drawText('PRIX UNIT.', { x: 410, y: y - 16, size: 7.2, font: bold, color: rgb(1,1,1) });
    page.drawText('TOTAL HT', { x: 493, y: y - 16, size: 7.2, font: bold, color: rgb(1,1,1) });
    y -= 25;
  };
  drawHeader();
  for (const item of quote.security_quote_lines ?? []) {
    const labelLines = wrap(clean(item.label), bold, 8.5, 282);
    const descriptionLines = item.description ? wrap(clean(item.description), regular, 6.7, 282) : [];
    const rowHeight = Math.max(38, 18 + labelLines.length * 11 + descriptionLines.length * 9 + (descriptionLines.length ? 6 : 0));
    if (ensure(rowHeight + 4)) drawHeader();
    let textY = y - 16;
    labelLines.forEach((text) => { page.drawText(text, { x: MARGIN + 9, y: textY, size: 8.5, font: bold, color: dark }); textY -= 11; });
    if (descriptionLines.length) {
      textY -= 2;
      descriptionLines.forEach((text) => { page.drawText(text, { x: MARGIN + 9, y: textY, size: 6.7, font: regular, color: muted }); textY -= 9; });
    }
    wrap(`${Number(item.quantity).toLocaleString('fr-FR')} ${item.unit}`, regular, 7.4, 54).slice(0, 2).forEach((text, index) => page.drawText(text, { x: 346, y: y - 16 - index * 9, size: 7.4, font: regular, color: dark }));
    page.drawText(formatSecurityMoney(item.unit_price_cents), { x: 410, y: y - 16, size: 7.2, font: regular, color: dark });
    page.drawText(formatSecurityMoney(item.line_total_cents), { x: 493, y: y - 16, size: 7.5, font: bold, color: dark });
    page.drawLine({ start: { x: MARGIN, y: y - rowHeight }, end: { x: PAGE[0] - MARGIN, y: y - rowHeight }, thickness: 0.55, color: line });
    y -= rowHeight + 1;
  }

  ensure(132);
  y -= 12;
  const totalRows: Array<[string, number]> = [
    ['TOTAL HT', quote.subtotal_cents],
    [`TVA ${((quote.tax_rate_basis_points || 0) / 100).toLocaleString('fr-FR')} %`, quote.tax_cents],
    ['TOTAL TTC', quote.total_cents]
  ];
  totalRows.forEach(([label, value], index) => {
    const rowY = y - index * 24;
    page.drawText(label, { x: 350, y: rowY, size: index === 2 ? 9 : 7.5, font: bold, color: index === 2 ? dark : muted });
    page.drawText(formatSecurityMoney(value), { x: 485, y: rowY, size: index === 2 ? 12 : 8.5, font: bold, color: index === 2 ? accent : dark });
  });
  y -= 88;
  if (quote.notes) {
    page.drawText('CONDITIONS / NOTES', { x: MARGIN, y, size: 7.2, font: bold, color: accent });
    y -= 15;
    for (const lineText of wrap(quote.notes, regular, 7.5, PAGE[0] - MARGIN * 2).slice(0, 8)) {
      page.drawText(lineText, { x: MARGIN, y, size: 7.5, font: regular, color: muted });
      y -= 10;
    }
  }

  for (const current of pdf.getPages()) {
    const footerY = 31;
    current.drawLine({ start: { x: MARGIN, y: footerY + 15 }, end: { x: PAGE[0] - MARGIN, y: footerY + 15 }, thickness: 0.5, color: line });
    const bankLine = issuer.bank_iban
      ? clean(`Règlement : ${issuer.bank_account_holder || issuer.name || ''}${issuer.bank_name ? ` · ${issuer.bank_name}` : ''} · IBAN ${issuer.bank_iban}${issuer.bank_bic ? ` · BIC ${issuer.bank_bic}` : ''}`)
      : 'Ce devis est valable jusqu’à la date indiquée ci-dessus.';
    wrap(bankLine, issuer.bank_iban ? bold : regular, 5.8, PAGE[0] - MARGIN * 2 - 106).slice(0, 2).forEach((text, index) => current.drawText(text, { x: MARGIN, y: footerY + 1 - index * 8, size: 5.8, font: issuer.bank_iban ? bold : regular, color: issuer.bank_iban ? dark : muted }));
    if ((quote.tax_rate_basis_points || 0) === 0 && issuer.tax_exemption_text) current.drawText(clean(issuer.tax_exemption_text).slice(0, 95), { x: MARGIN, y: footerY - 9, size: 5.6, font: bold, color: dark });
    current.drawText('Généré avec NCR Suite', { x: PAGE[0] - MARGIN - 92, y: footerY + 1, size: 6.2, font: bold, color: accent });
  }

  pdf.setTitle(`Devis ${quote.quote_number}`);
  pdf.setAuthor(clean(issuer.name || organization.name));
  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' });
  return { blob, filename: `${safeName(quote.quote_number || 'devis')}.pdf` };
}
