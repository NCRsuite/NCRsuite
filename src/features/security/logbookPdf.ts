import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  formatSecurityDate,
  formatSecurityDateTime,
  formatSecurityDuration,
  securityPersonName,
  securityShiftMinutes,
  type SecurityLogbookEntryRecord,
  type SecurityShiftRecord
} from './types';
import { embedSecurityLogo, logoDimensions, securityAccent } from './pdfBranding';

const categoryLabels: Record<SecurityLogbookEntryRecord['category'], string> = {
  prise_poste: 'Prise de poste',
  fin_poste: 'Fin de poste',
  ronde: 'Ronde effectuee',
  anomalie: 'Anomalie constatee',
  incident: 'Incident',
  visiteur: 'Visiteur / acces',
  livraison: 'Livraison',
  appel: 'Appel recu',
  consigne: 'Consigne transmise',
  autre: 'Autre evenement'
};

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function cleanPdfText(value: string) {
  return value
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapByWidth(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = cleanPdfText(text || '-').split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['-'];
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export async function generateSecurityMissionLogbookPdf(
  organization: Organization,
  shift: SecurityShiftRecord,
  entries: SecurityLogbookEntryRecord[]
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 42;
  const contentWidth = pageSize[0] - margin * 2;
  const dark = rgb(0.07, 0.09, 0.13);
  const muted = rgb(0.39, 0.43, 0.49);
  const accent = securityAccent(organization);
  const logo = await embedSecurityLogo(pdf, organization.logo_url);
  const line = rgb(0.86, 0.89, 0.93);
  const soft = rgb(0.96, 0.97, 0.985);
  const success = rgb(0.08, 0.55, 0.29);
  const warning = rgb(0.88, 0.47, 0.03);
  const danger = rgb(0.79, 0.09, 0.12);

  const ordered = [...entries].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  const site = shift.security_sites?.name || 'Site';
  const client = shift.security_sites?.security_clients?.company_name || null;
  const agent = shift.security_agents ? securityPersonName(shift.security_agents.first_name, shift.security_agents.last_name) : 'Agent';
  const address = [shift.security_sites?.address, shift.security_sites?.postal_code, shift.security_sites?.city].filter(Boolean).join(' ');
  const missionReference = shift.id.slice(0, 8).toUpperCase();
  const totals = {
    all: ordered.length,
    urgent: ordered.filter((entry) => entry.severity === 'urgent').length,
    anomalies: ordered.filter((entry) => entry.category === 'anomalie' || entry.category === 'incident').length
  };

  let page!: PDFPage;
  let y = 0;
  let pageNumber = 0;

  const addPage = () => {
    page = pdf.addPage(pageSize);
    pageNumber += 1;
    y = pageSize[1] - 42;

    let headerX = margin;
    if (logo) {
      const size = logoDimensions(logo, 78, 34);
      page.drawImage(logo, { x: margin, y: y - size.height + 5, width: size.width, height: size.height });
      headerX = margin + 90;
    }
    page.drawText('NCR SUITE - SECURITE PRIVEE', { x: headerX, y, size: 8.5, font: bold, color: accent });
    page.drawText(`Page ${pageNumber}`, { x: pageSize[0] - margin - 38, y, size: 7.5, font: regular, color: muted });
    y -= 28;
    page.drawText('MAIN COURANTE DE VACATION', { x: headerX, y, size: 22, font: bold, color: dark });
    y -= 20;
    page.drawText(cleanPdfText(organization.public_name || organization.name), { x: headerX, y, size: 10, font: bold, color: dark });
    page.drawText(`Mission ${missionReference}`, { x: pageSize[0] - margin - 85, y, size: 8.5, font: regular, color: muted });
    y -= 15;
    page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 1, color: line });
    y -= 19;
  };

  const ensureSpace = (height: number) => {
    if (y - height < 58) addPage();
  };

  addPage();

  const infoTop = y;
  page.drawRectangle({ x: margin, y: infoTop - 108, width: contentWidth, height: 108, color: soft, borderColor: line, borderWidth: 0.8 });
  const leftX = margin + 16;
  const rightX = margin + contentWidth / 2 + 10;
  const infoRowsLeft = [
    ['Site', site],
    ['Client', client || '-'],
    ['Adresse', address || '-']
  ];
  const infoRowsRight = [
    ['Agent', agent],
    ['Vacation', `${formatSecurityDate(shift.starts_at)} - ${timeLabel(shift.starts_at)} a ${timeLabel(shift.ends_at)}`],
    ['Duree planifiee', formatSecurityDuration(securityShiftMinutes(shift))]
  ];
  infoRowsLeft.forEach(([label, value], index) => {
    const rowY = infoTop - 23 - index * 28;
    page.drawText(label.toUpperCase(), { x: leftX, y: rowY, size: 6.8, font: bold, color: muted });
    const lines = wrapByWidth(value, regular, 8.5, contentWidth / 2 - 38).slice(0, 2);
    lines.forEach((text, lineIndex) => page.drawText(text, { x: leftX, y: rowY - 11 - lineIndex * 9, size: 8.5, font: regular, color: dark }));
  });
  infoRowsRight.forEach(([label, value], index) => {
    const rowY = infoTop - 23 - index * 28;
    page.drawText(label.toUpperCase(), { x: rightX, y: rowY, size: 6.8, font: bold, color: muted });
    page.drawText(cleanPdfText(value).slice(0, 54), { x: rightX, y: rowY - 11, size: 8.5, font: regular, color: dark });
  });
  y -= 128;

  const cardWidth = (contentWidth - 16) / 3;
  const summary = [
    ['EVENEMENTS', String(totals.all), accent],
    ['ANOMALIES / INCIDENTS', String(totals.anomalies), warning],
    ['URGENTS', String(totals.urgent), danger]
  ] as const;
  summary.forEach(([label, value, color], index) => {
    const x = margin + index * (cardWidth + 8);
    page.drawRectangle({ x, y: y - 48, width: cardWidth, height: 48, color: soft, borderColor: line, borderWidth: 0.7 });
    page.drawText(label, { x: x + 11, y: y - 15, size: 6.5, font: bold, color: muted });
    page.drawText(value, { x: x + 11, y: y - 36, size: 16, font: bold, color });
  });
  y -= 70;

  page.drawText('CHRONOLOGIE DE LA VACATION', { x: margin, y, size: 8, font: bold, color: accent });
  y -= 20;

  if (ordered.length === 0) {
    page.drawRectangle({ x: margin, y: y - 74, width: contentWidth, height: 74, color: soft, borderColor: line, borderWidth: 0.7 });
    page.drawText('Aucun evenement n’a ete saisi pour cette vacation.', { x: margin + 16, y: y - 31, size: 10, font: bold, color: dark });
    page.drawText('Le PDF reste rattache a la mission et peut etre archive dans le dossier du site.', { x: margin + 16, y: y - 49, size: 8, font: regular, color: muted });
    y -= 92;
  }

  for (const entry of ordered) {
    const details = wrapByWidth(entry.details || 'Aucun complement.', regular, 8.2, contentWidth - 80).slice(0, 7);
    const title = wrapByWidth(entry.title, bold, 9.5, contentWidth - 80).slice(0, 2);
    const height = 49 + title.length * 11 + details.length * 10;
    ensureSpace(height + 12);

    const severityColor = entry.severity === 'urgent' ? danger : entry.severity === 'attention' ? warning : accent;
    page.drawRectangle({ x: margin, y: y - height, width: contentWidth, height, borderColor: line, borderWidth: 0.7, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: margin, y: y - height, width: 5, height, color: severityColor });
    page.drawText(timeLabel(entry.occurred_at), { x: margin + 15, y: y - 20, size: 11, font: bold, color: dark });
    page.drawText(categoryLabels[entry.category].toUpperCase(), { x: margin + 64, y: y - 17, size: 6.8, font: bold, color: severityColor });
    page.drawText(entry.status === 'processed' ? 'TRAITE' : 'OUVERT', { x: pageSize[0] - margin - 51, y: y - 17, size: 6.5, font: bold, color: entry.status === 'processed' ? success : muted });

    let textY = y - 34;
    title.forEach((text) => {
      page.drawText(text, { x: margin + 64, y: textY, size: 9.5, font: bold, color: dark });
      textY -= 11;
    });
    details.forEach((text) => {
      page.drawText(text, { x: margin + 64, y: textY, size: 8.2, font: regular, color: muted });
      textY -= 10;
    });
    y -= height + 10;
  }

  ensureSpace(70);
  page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 0.8, color: line });
  y -= 18;
  page.drawText(`Document genere le ${formatSecurityDateTime(new Date())}`, { x: margin, y, size: 7.5, font: regular, color: muted });
  page.drawText('Main courante rattachee exclusivement a la vacation indiquee.', { x: margin, y: y - 12, size: 7.5, font: bold, color: accent });

  for (const currentPage of pdf.getPages()) {
    currentPage.drawText('Document genere avec NCR Suite', { x: margin, y: 31, size: 7.1, font: bold, color: accent });
    currentPage.drawText(`${site} - ${agent}`, { x: pageSize[0] - margin - 150, y: 31, size: 7, font: regular, color: muted });
  }

  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' });
  const date = new Date(shift.starts_at);
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return {
    blob,
    filename: `main-courante-${safeName(site)}-${dateKey}-${safeName(agent)}.pdf`
  };
}
