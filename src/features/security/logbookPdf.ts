import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Organization } from '../../types';
import { formatSecurityDate, formatSecurityDateTime, securityPersonName, type SecurityLogbookEntryRecord } from './types';

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}


function dateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function wrap(text: string, max = 86) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) { lines.push(current); current = word; }
    else current = next;
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['—'];
}

export async function generateSecurityLogbookPdf(
  organization: Organization,
  entries: SecurityLogbookEntryRecord[],
  periodStart: string | Date,
  periodEnd: string | Date,
  siteLabel = 'Tous les sites'
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 42;
  const dark = rgb(0.09, 0.11, 0.14);
  const muted = rgb(0.42, 0.45, 0.49);
  const accent = rgb(0.05, 0.37, 0.69);
  const line = rgb(0.87, 0.89, 0.92);
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - 46;
  let pageNumber = 1;

  const drawHeader = () => {
    page.drawText('NCR SUITE · SÉCURITÉ PRIVÉE', { x: margin, y, size: 8.5, font: bold, color: accent });
    page.drawText('MAIN COURANTE', { x: margin, y: y - 30, size: 23, font: bold, color: dark });
    page.drawText(organization.public_name || organization.name, { x: margin, y: y - 50, size: 10, font: bold, color: dark });
    page.drawText(`${siteLabel} · Du ${formatSecurityDate(periodStart)} au ${formatSecurityDate(periodEnd)}`, { x: margin, y: y - 66, size: 8.5, font: regular, color: muted });
    page.drawText(`Page ${pageNumber}`, { x: pageSize[0] - margin - 46, y, size: 8, font: regular, color: muted });
    page.drawLine({ start: { x: margin, y: y - 82 }, end: { x: pageSize[0] - margin, y: y - 82 }, thickness: 1, color: line });
    y -= 104;
  };

  const nextPage = () => {
    page = pdf.addPage(pageSize); pageNumber += 1; y = pageSize[1] - 46; drawHeader();
  };

  drawHeader();

  if (entries.length === 0) {
    page.drawText('Aucune entrée sur la période sélectionnée.', { x: margin, y, size: 10, font: regular, color: muted });
  }

  for (const entry of entries) {
    const agent = entry.security_agents ? securityPersonName(entry.security_agents.first_name, entry.security_agents.last_name) : 'Responsable';
    const site = entry.security_sites?.name || 'Site';
    const detailLines = wrap(entry.details || 'Aucun complément.', 82).slice(0, 5);
    const blockHeight = 54 + detailLines.length * 11;
    if (y - blockHeight < 62) nextPage();

    const severityColor = entry.severity === 'urgent' ? rgb(0.75, 0.08, 0.10) : entry.severity === 'attention' ? rgb(0.82, 0.34, 0.02) : accent;
    page.drawRectangle({ x: margin, y: y - blockHeight + 8, width: 4, height: blockHeight - 8, color: severityColor });
    page.drawText(formatSecurityDateTime(entry.occurred_at), { x: margin + 14, y: y - 4, size: 8, font: bold, color: muted });
    page.drawText(`${site} · ${agent}`, { x: margin + 150, y: y - 4, size: 8, font: regular, color: muted });
    page.drawText(entry.title.slice(0, 80), { x: margin + 14, y: y - 23, size: 10, font: bold, color: dark });
    detailLines.forEach((lineText, index) => page.drawText(lineText, { x: margin + 14, y: y - 41 - index * 11, size: 8.3, font: regular, color: dark }));
    page.drawLine({ start: { x: margin, y: y - blockHeight }, end: { x: pageSize[0] - margin, y: y - blockHeight }, thickness: 0.7, color: line });
    y -= blockHeight + 10;
  }

  for (const currentPage of pdf.getPages()) {
    currentPage.drawText('Document généré avec NCR Suite', { x: margin, y: 34, size: 7.2, font: bold, color: accent });
  }

  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' });
  return { blob, filename: `main-courante-${safeName(siteLabel)}-${dateKey(periodStart)}-${dateKey(periodEnd)}.pdf` };
}
