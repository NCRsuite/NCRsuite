import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  formatSecurityDate,
  formatSecurityDuration,
  formatSecurityMoney,
  securityPersonName,
  type SecurityBillingSnapshot,
  type SecurityInvoiceRecord
} from './types';
import { embedSecurityLogo, logoDimensions, securityAccent } from './pdfBranding';

const PAGE: [number, number] = [595.28, 841.89];
const MARGIN = 42;

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function clean(value: unknown) {
  return String(value ?? '').replace(/[’‘]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...').replace(/\s+/g, ' ').trim();
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = clean(text || '-').split(' ');
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

function snapshotIssuer(organization: Organization, invoice: SecurityInvoiceRecord): SecurityBillingSnapshot {
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
    ...(invoice.issuer_snapshot ?? {})
  };
}

function snapshotClient(invoice: SecurityInvoiceRecord): SecurityBillingSnapshot {
  return invoice.client_snapshot ?? {
    company_name: invoice.security_clients?.company_name,
    contact_name: invoice.security_clients?.contact_name,
    email: invoice.security_clients?.email,
    phone: invoice.security_clients?.phone,
    billing_address: invoice.security_clients?.billing_address,
    postal_code: invoice.security_clients?.postal_code,
    city: invoice.security_clients?.city,
    siret: invoice.security_clients?.siret,
    vat_number: invoice.security_clients?.vat_number,
    payment_terms_days: invoice.security_clients?.payment_terms_days
  };
}

export async function generateSecurityInvoicePdf(organization: Organization, invoice: SecurityInvoiceRecord) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = securityAccent(organization);
  const logo = await embedSecurityLogo(pdf, invoice.issuer_snapshot?.logo_url || organization.logo_url);
  const dark = rgb(0.08, 0.10, 0.14);
  const muted = rgb(0.39, 0.43, 0.49);
  const line = rgb(0.86, 0.89, 0.93);
  const soft = rgb(0.96, 0.975, 0.99);
  const issuer = snapshotIssuer(organization, invoice);
  const client = snapshotClient(invoice);
  const isFinal = invoice.document_kind === 'invoice';
  const title = isFinal ? 'FACTURE' : 'FACTURE PRÉVISIONNELLE';
  const issuerName = clean(issuer.name || organization.public_name || organization.name);
  const clientName = clean(client.company_name || invoice.security_clients?.company_name || 'Client');
  let page!: PDFPage;
  let y = 0;
  let pageNumber = 0;

  const addPage = () => {
    page = pdf.addPage(PAGE);
    pageNumber += 1;
    const { width, height } = page.getSize();
    y = height - MARGIN;
    if (logo) {
      const size = logoDimensions(logo, 88, 42);
      page.drawImage(logo, { x: MARGIN, y: y - size.height + 4, width: size.width, height: size.height });
    }
    const headerX = logo ? MARGIN + 100 : MARGIN;
    page.drawText('NCR SUITE · SÉCURITÉ PRIVÉE', { x: headerX, y: y - 4, size: 7.5, font: bold, color: accent });
    page.drawText(title, { x: headerX, y: y - 30, size: 23, font: bold, color: dark });
    page.drawText(invoice.invoice_number, { x: width - MARGIN - 160, y: y - 20, size: 11, font: bold, color: dark });
    page.drawText(`Page ${pageNumber}`, { x: width - MARGIN - 42, y: y - 39, size: 7, font: regular, color: muted });
    y -= 66;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 1, color: line });
    y -= 20;
  };

  const ensure = (height: number) => {
    if (y - height < 76) { addPage(); return true; }
    return false;
  };
  addPage();

  const boxWidth = (PAGE[0] - MARGIN * 2 - 12) / 2;
  const infoHeight = 116;
  page.drawRectangle({ x: MARGIN, y: y - infoHeight, width: boxWidth, height: infoHeight, color: soft, borderColor: line, borderWidth: 0.8 });
  page.drawRectangle({ x: MARGIN + boxWidth + 12, y: y - infoHeight, width: boxWidth, height: infoHeight, color: soft, borderColor: line, borderWidth: 0.8 });
  page.drawText('ÉMETTEUR', { x: MARGIN + 13, y: y - 18, size: 7, font: bold, color: accent });
  page.drawText(issuerName.slice(0, 48), { x: MARGIN + 13, y: y - 38, size: 10.5, font: bold, color: dark });
  const issuerLines = [issuer.address, [issuer.postal_code, issuer.city].filter(Boolean).join(' '), issuer.siret ? `SIRET : ${issuer.siret}` : '', issuer.vat_number ? `TVA : ${issuer.vat_number}` : '', [issuer.email, issuer.phone].filter(Boolean).join(' · ')].filter(Boolean) as string[];
  issuerLines.slice(0, 5).forEach((text, index) => page.drawText(clean(text).slice(0, 52), { x: MARGIN + 13, y: y - 55 - index * 12, size: 7.6, font: regular, color: muted }));

  const clientX = MARGIN + boxWidth + 25;
  page.drawText('CLIENT', { x: clientX, y: y - 18, size: 7, font: bold, color: accent });
  page.drawText(clientName.slice(0, 48), { x: clientX, y: y - 38, size: 10.5, font: bold, color: dark });
  const clientLines = [client.billing_address, [client.postal_code, client.city].filter(Boolean).join(' '), client.siret ? `SIRET : ${client.siret}` : '', client.vat_number ? `TVA : ${client.vat_number}` : '', [client.email, client.phone].filter(Boolean).join(' · ')].filter(Boolean) as string[];
  clientLines.slice(0, 5).forEach((text, index) => page.drawText(clean(text).slice(0, 52), { x: clientX, y: y - 55 - index * 12, size: 7.6, font: regular, color: muted }));
  y -= infoHeight + 22;

  const dateRows = [
    ['Période', `Du ${formatSecurityDate(invoice.period_start)} au ${formatSecurityDate(invoice.period_end)}`],
    [isFinal ? 'Date d’émission' : 'Date de création', formatSecurityDate(invoice.issued_at || invoice.created_at)],
    ...(isFinal && invoice.due_date ? [['Échéance', formatSecurityDate(invoice.due_date)]] : [])
  ];
  dateRows.forEach(([label, value], index) => {
    const x = MARGIN + index * 170;
    page.drawText(label.toUpperCase(), { x, y, size: 6.8, font: bold, color: muted });
    page.drawText(clean(value), { x, y: y - 14, size: 8.8, font: bold, color: dark });
  });
  y -= 48;

  const drawTableHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - 25, width: PAGE[0] - MARGIN * 2, height: 25, color: dark });
    page.drawText('SITE / PRESTATION', { x: MARGIN + 9, y: y - 16, size: 7.2, font: bold, color: rgb(1, 1, 1) });
    page.drawText(isFinal ? 'RÉALISÉ' : 'PROGRAMMÉ', { x: 330, y: y - 16, size: 7.2, font: bold, color: rgb(1, 1, 1) });
    page.drawText('TARIF', { x: 410, y: y - 16, size: 7.2, font: bold, color: rgb(1, 1, 1) });
    page.drawText('TOTAL HT', { x: 486, y: y - 16, size: 7.2, font: bold, color: rgb(1, 1, 1) });
    y -= 25;
  };
  drawTableHeader();

  for (const item of invoice.security_invoice_lines ?? []) {
    const continued = ensure(44);
    if (continued) drawTableHeader();
    const minutes = isFinal ? (item.billed_minutes ?? item.scheduled_minutes) : item.scheduled_minutes;
    const description = clean(item.security_sites?.name || item.description);
    page.drawText(description.slice(0, 48), { x: MARGIN + 9, y: y - 16, size: 8.5, font: bold, color: dark });
    if (isFinal && item.shift_count) page.drawText(`${item.shift_count} vacation(s)`, { x: MARGIN + 9, y: y - 29, size: 6.8, font: regular, color: muted });
    page.drawText(formatSecurityDuration(minutes), { x: 330, y: y - 16, size: 8, font: regular, color: dark });
    page.drawText(`${formatSecurityMoney(item.hourly_rate_cents)}/h`, { x: 410, y: y - 16, size: 8, font: regular, color: dark });
    page.drawText(formatSecurityMoney(item.line_total_cents), { x: 486, y: y - 16, size: 8, font: bold, color: dark });
    page.drawLine({ start: { x: MARGIN, y: y - 38 }, end: { x: PAGE[0] - MARGIN, y: y - 38 }, thickness: 0.6, color: line });
    y -= 39;
  }

  ensure(116);
  y -= 10;
  const totalsX = 350;
  const subtotal = invoice.subtotal_cents || 0;
  const tax = invoice.tax_cents || 0;
  const total = invoice.total_cents || subtotal + tax;
  const vatLabel = `TVA ${((invoice.tax_rate_basis_points || 0) / 100).toLocaleString('fr-FR')} %`;
  const totalRows = isFinal ? [['TOTAL HT', subtotal], [vatLabel, tax], ['TOTAL TTC', total]] as const : [['TOTAL PRÉVISIONNEL HT', total]] as const;
  totalRows.forEach(([label, value], index) => {
    const rowY = y - index * 24;
    page.drawText(label, { x: totalsX, y: rowY, size: index === totalRows.length - 1 ? 9 : 7.5, font: bold, color: index === totalRows.length - 1 ? dark : muted });
    page.drawText(formatSecurityMoney(value), { x: 485, y: rowY, size: index === totalRows.length - 1 ? 12 : 8.5, font: bold, color: index === totalRows.length - 1 ? accent : dark });
  });
  y -= totalRows.length * 24 + 12;

  if (invoice.notes) {
    const notes = wrap(`Note : ${invoice.notes}`, regular, 7.5, 285).slice(0, 4);
    notes.forEach((text, index) => page.drawText(text, { x: MARGIN, y: y - index * 10, size: 7.5, font: regular, color: muted }));
  }

  if (isFinal && (invoice.security_invoice_shift_items?.length ?? 0) > 0) {
    addPage();
    page.drawText('DÉTAIL DES VACATIONS FACTURÉES', { x: MARGIN, y, size: 10, font: bold, color: accent });
    y -= 24;
    for (const item of invoice.security_invoice_shift_items ?? []) {
      ensure(42);
      const agent = item.security_agents ? securityPersonName(item.security_agents.first_name, item.security_agents.last_name) : 'Agent';
      const site = item.security_sites?.name || 'Site';
      const hours = `${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.starts_at))}–${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.ends_at))}`;
      page.drawText(`${formatSecurityDate(item.service_date)} · ${site}`, { x: MARGIN, y: y - 12, size: 8.4, font: bold, color: dark });
      page.drawText(`${agent} · ${hours} · ${formatSecurityDuration(item.actual_minutes)}`, { x: MARGIN, y: y - 25, size: 7.2, font: regular, color: muted });
      page.drawText(formatSecurityMoney(item.line_total_cents), { x: 486, y: y - 18, size: 8, font: bold, color: dark });
      page.drawLine({ start: { x: MARGIN, y: y - 35 }, end: { x: PAGE[0] - MARGIN, y: y - 35 }, thickness: 0.5, color: line });
      y -= 38;
    }
  }

  for (const current of pdf.getPages()) {
    const footerY = 31;
    current.drawLine({ start: { x: MARGIN, y: footerY + 15 }, end: { x: PAGE[0] - MARGIN, y: footerY + 15 }, thickness: 0.5, color: line });
    const footerText = isFinal
      ? clean(issuer.late_penalty_text || 'Indemnité forfaitaire pour frais de recouvrement : 40 €.')
      : 'Document prévisionnel sans valeur de facture définitive.';
    current.drawText(footerText.slice(0, 104), { x: MARGIN, y: footerY + 1, size: 5.8, font: regular, color: muted });
    const bankLine = isFinal && issuer.bank_iban
      ? clean(`Virement : ${issuer.bank_account_holder || issuer.name || ''}${issuer.bank_name ? ` · ${issuer.bank_name}` : ''} · IBAN ${issuer.bank_iban}${issuer.bank_bic ? ` · BIC ${issuer.bank_bic}` : ''}`)
      : '';
    if (bankLine) current.drawText(bankLine.slice(0, 118), { x: MARGIN, y: footerY - 9, size: 5.8, font: bold, color: dark });
    if (isFinal && (invoice.tax_rate_basis_points || 0) === 0 && issuer.tax_exemption_text) {
      current.drawText(clean(issuer.tax_exemption_text).slice(0, 95), { x: MARGIN, y: footerY - (bankLine ? 18 : 9), size: 5.6, font: bold, color: dark });
    }
    current.drawText('Généré avec NCR Suite', { x: PAGE[0] - MARGIN - 92, y: footerY + 1, size: 6.2, font: bold, color: accent });
  }

  pdf.setTitle(`${title} ${invoice.invoice_number}`);
  pdf.setAuthor(issuerName);
  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' });
  return { blob, filename: `${safeName(invoice.invoice_number || (isFinal ? 'facture' : 'prefacture'))}.pdf` };
}
