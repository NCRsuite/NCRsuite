import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Organization } from '../../types';
import { formatSecurityDate, formatSecurityDuration, formatSecurityMoney, type SecurityInvoiceRecord } from './types';

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

export async function generateSecurityInvoicePdf(organization: Organization, invoice: SecurityInvoiceRecord) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 46;
  const accent = rgb(0.06, 0.34, 0.64);
  const dark = rgb(0.10, 0.11, 0.14);
  const muted = rgb(0.42, 0.44, 0.48);
  const line = rgb(0.88, 0.89, 0.91);

  page.drawText('NCR SUITE · SÉCURITÉ PRIVÉE', { x: margin, y: height - 54, size: 9, font: bold, color: accent });
  page.drawText('FACTURE PRÉVISIONNELLE', { x: margin, y: height - 88, size: 24, font: bold, color: dark });
  page.drawText(invoice.invoice_number, { x: width - margin - 155, y: height - 84, size: 12, font: bold, color: dark });
  page.drawText(`Créée le ${formatSecurityDate(invoice.created_at)}`, { x: width - margin - 155, y: height - 101, size: 8.5, font: regular, color: muted });

  page.drawRectangle({ x: margin, y: height - 198, width: width - margin * 2, height: 72, color: rgb(0.965, 0.972, 0.985), borderColor: line, borderWidth: 1 });
  page.drawText('ÉMETTEUR', { x: margin + 14, y: height - 148, size: 7.5, font: bold, color: muted });
  page.drawText(organization.public_name || organization.name, { x: margin + 14, y: height - 166, size: 11, font: bold, color: dark });
  page.drawText('CLIENT', { x: width / 2 + 14, y: height - 148, size: 7.5, font: bold, color: muted });
  page.drawText(invoice.security_clients?.company_name || 'Client', { x: width / 2 + 14, y: height - 166, size: 11, font: bold, color: dark });
  const clientAddress = [invoice.security_clients?.billing_address, invoice.security_clients?.postal_code, invoice.security_clients?.city].filter(Boolean).join(' · ');
  if (clientAddress) page.drawText(clientAddress.slice(0, 58), { x: width / 2 + 14, y: height - 181, size: 8.5, font: regular, color: muted });

  page.drawText(`Période : du ${formatSecurityDate(invoice.period_start)} au ${formatSecurityDate(invoice.period_end)}`, { x: margin, y: height - 226, size: 10, font: bold, color: dark });
  page.drawText('Calcul basé uniquement sur les heures programmées et le tarif horaire enregistré pour chaque site.', { x: margin, y: height - 243, size: 8.2, font: regular, color: muted });

  let y = height - 282;
  page.drawRectangle({ x: margin, y: y - 5, width: width - margin * 2, height: 26, color: dark });
  page.drawText('SITE / DESCRIPTION', { x: margin + 10, y: y + 4, size: 7.5, font: bold, color: rgb(1, 1, 1) });
  page.drawText('HEURES', { x: width - 230, y: y + 4, size: 7.5, font: bold, color: rgb(1, 1, 1) });
  page.drawText('TARIF', { x: width - 150, y: y + 4, size: 7.5, font: bold, color: rgb(1, 1, 1) });
  page.drawText('TOTAL HT', { x: width - 92, y: y + 4, size: 7.5, font: bold, color: rgb(1, 1, 1) });
  y -= 26;

  for (const item of invoice.security_invoice_lines ?? []) {
    page.drawLine({ start: { x: margin, y: y - 25 }, end: { x: width - margin, y: y - 25 }, thickness: 0.7, color: line });
    page.drawText((item.security_sites?.name || item.description).slice(0, 48), { x: margin + 10, y: y - 10, size: 9, font: bold, color: dark });
    page.drawText(formatSecurityDuration(item.scheduled_minutes), { x: width - 230, y: y - 10, size: 8.5, font: regular, color: dark });
    page.drawText(`${formatSecurityMoney(item.hourly_rate_cents)}/h`, { x: width - 150, y: y - 10, size: 8.5, font: regular, color: dark });
    page.drawText(formatSecurityMoney(item.line_total_cents), { x: width - 92, y: y - 10, size: 8.5, font: bold, color: dark });
    y -= 40;
  }

  const totalBoxY = Math.max(132, y - 76);
  page.drawRectangle({ x: width - margin - 220, y: totalBoxY, width: 220, height: 62, color: rgb(0.965, 0.972, 0.985), borderColor: line, borderWidth: 1 });
  page.drawText('TOTAL PRÉVISIONNEL HT', { x: width - margin - 202, y: totalBoxY + 39, size: 8, font: bold, color: muted });
  page.drawText(formatSecurityMoney(invoice.total_cents), { x: width - margin - 202, y: totalBoxY + 15, size: 18, font: bold, color: accent });

  if (invoice.notes) page.drawText(`Note : ${invoice.notes.slice(0, 95)}`, { x: margin, y: totalBoxY + 18, size: 8.5, font: regular, color: muted });
  page.drawText('Document de préfacturation — les heures réalisées et ajustements éventuels ne modifient pas automatiquement ce calcul.', { x: margin, y: 60, size: 7.5, font: regular, color: muted });
  page.drawText('Généré avec NCR Suite', { x: margin, y: 44, size: 7.5, font: bold, color: accent });

  const bytes = await pdf.save();
  const pdfBytes = new Uint8Array(bytes);
  const blob = new Blob([pdfBytes.buffer], { type: 'application/pdf' });
  return {
    blob,
    filename: `${safeName(invoice.invoice_number || 'facture-securite')}.pdf`
  };
}
