import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import type { Organization } from '../../types';
import { prepareFileWindow, showBlobDownload } from '../../lib/browserFiles';
import { formatCleaningDateTime, type CleaningInterventionRecord } from './types';

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function cleanText(value: string) {
  return value.replace(/[’‘]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...').replace(/\s+/g, ' ').trim();
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = cleanText(text || '-').split(' '); const lines: string[] = []; let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > width && current) { lines.push(current); current = word; } else current = candidate;
  }
  if (current) lines.push(current); return lines;
}

export async function generateCleaningReportPdf(organization: Organization, intervention: CleaningInterventionRecord) {
  const pdf = await PDFDocument.create(); const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]); const width = page.getWidth(); const margin = 44; let y = 790;
  const accent = rgb(0.05, 0.55, 0.35); const dark = rgb(0.08, 0.1, 0.13); const muted = rgb(0.4, 0.44, 0.49); const line = rgb(0.86, 0.89, 0.92); const soft = rgb(0.95, 0.98, 0.97);
  page.drawText('NCR SUITE - NETTOYAGE', { x: margin, y, size: 9, font: bold, color: accent });
  page.drawText('FICHE DE PASSAGE', { x: margin, y: y - 34, size: 24, font: bold, color: dark });
  page.drawText(cleanText(organization.public_name || organization.name), { x: margin, y: y - 56, size: 11, font: bold, color: dark });
  y -= 84; page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: line }); y -= 24;

  const info = [
    ['Client', intervention.cleaning_sites?.cleaning_clients?.company_name || '-'],
    ['Site', intervention.cleaning_sites?.name || '-'],
    ['Adresse', [intervention.cleaning_sites?.address, intervention.cleaning_sites?.city].filter(Boolean).join(' ') || '-'],
    ['Agent', intervention.cleaning_agents ? `${intervention.cleaning_agents.first_name} ${intervention.cleaning_agents.last_name}` : '-'],
    ['Intervention prévue', `${formatCleaningDateTime(intervention.starts_at)} - ${new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date(intervention.ends_at))}`],
    ['Arrivée réelle', intervention.actual_started_at ? formatCleaningDateTime(intervention.actual_started_at) : '-'],
    ['Départ réel', intervention.actual_ended_at ? formatCleaningDateTime(intervention.actual_ended_at) : '-']
  ];
  for (const [label, value] of info) {
    page.drawText(label.toUpperCase(), { x: margin, y, size: 7.5, font: bold, color: muted });
    page.drawText(cleanText(value), { x: margin + 135, y: y - 1, size: 9.5, font: regular, color: dark }); y -= 25;
  }

  y -= 8; page.drawRectangle({ x: margin, y: y - 142, width: width - margin * 2, height: 150, color: soft, borderColor: line, borderWidth: 1 });
  page.drawText('TRAVAUX REALISES ET OBSERVATIONS', { x: margin + 16, y: y - 18, size: 9, font: bold, color: accent });
  let textY = y - 42; for (const lineText of wrap(intervention.report_text || 'Passage termine sans observation particuliere.', regular, 10, width - margin * 2 - 32).slice(0, 8)) { page.drawText(lineText, { x: margin + 16, y: textY, size: 10, font: regular, color: dark }); textY -= 16; }
  y -= 178;

  page.drawText('PREUVES PHOTO', { x: margin, y, size: 9, font: bold, color: muted }); y -= 18;
  page.drawText(`Photo avant : ${intervention.before_photo_url ? 'jointe dans NCR Suite' : 'non fournie'}`, { x: margin, y, size: 9.5, font: regular, color: dark }); y -= 18;
  page.drawText(`Photo apres : ${intervention.after_photo_url ? 'jointe dans NCR Suite' : 'non fournie'}`, { x: margin, y, size: 9.5, font: regular, color: dark }); y -= 34;

  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: line }); y -= 22;
  page.drawText('Document genere depuis NCR Suite. Les horodatages sont issus du suivi de l intervention.', { x: margin, y, size: 8, font: regular, color: muted });
  return pdf.save();
}

export async function downloadCleaningReportPdf(organization: Organization, intervention: CleaningInterventionRecord) {
  const target = prepareFileWindow('Préparation du rapport', 'Le PDF de la fiche de passage est en cours de génération.');
  const bytes = await generateCleaningReportPdf(organization, intervention); const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'application/pdf' }); const url = URL.createObjectURL(blob);
  const filename = `fiche-passage-${safeName(intervention.cleaning_sites?.name || 'site')}-${intervention.starts_at.slice(0, 10)}.pdf`;
  showBlobDownload(target, url, filename, 'Fiche de passage prête'); window.setTimeout(() => URL.revokeObjectURL(url), 120000);
}
