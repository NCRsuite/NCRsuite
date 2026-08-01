import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
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

async function convertPhotoToJpeg(blob: Blob) {
  const sourceUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Image illisible.'));
      element.src = sourceUrl;
    });
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, 2000 / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Conversion impossible.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Conversion impossible.')), 'image/jpeg', 0.86);
    });
    return new Uint8Array(await jpeg.arrayBuffer());
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function embedRemotePhoto(pdf: PDFDocument, url: string) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Photo inaccessible (${response.status}).`);
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mime = blob.type.toLowerCase();
  if (mime.includes('png')) return pdf.embedPng(bytes);
  if (mime.includes('jpeg') || mime.includes('jpg')) return pdf.embedJpg(bytes);
  return pdf.embedJpg(await convertPhotoToJpeg(blob));
}

function drawPhotoCard(page: PDFPage, options: { x: number; y: number; width: number; height: number; label: string; description: string; image: PDFImage | null; supplied: boolean }, fonts: { regular: PDFFont; bold: PDFFont }) {
  const { x, y, width, height, label, description, image, supplied } = options;
  const dark = rgb(0.08, 0.1, 0.13); const muted = rgb(0.4, 0.44, 0.49); const line = rgb(0.86, 0.89, 0.92); const soft = rgb(0.96, 0.97, 0.98); const accent = rgb(0.05, 0.55, 0.35);
  page.drawRectangle({ x, y, width, height, color: soft, borderColor: line, borderWidth: 1 });
  page.drawText(label, { x: x + 14, y: y + height - 24, size: 9, font: fonts.bold, color: accent });
  page.drawText(description, { x: x + 14, y: y + height - 41, size: 8, font: fonts.regular, color: muted });
  const imageArea = { x: x + 14, y: y + 42, width: width - 28, height: height - 100 };
  page.drawRectangle({ x: imageArea.x, y: imageArea.y, width: imageArea.width, height: imageArea.height, color: rgb(1, 1, 1), borderColor: line, borderWidth: 1 });
  if (image) {
    const size = image.scaleToFit(imageArea.width - 12, imageArea.height - 12);
    page.drawImage(image, { x: imageArea.x + (imageArea.width - size.width) / 2, y: imageArea.y + (imageArea.height - size.height) / 2, width: size.width, height: size.height });
  } else {
    const message = supplied ? 'Photo indisponible lors de cet export' : 'Photo non fournie';
    page.drawText(message, { x: imageArea.x + 18, y: imageArea.y + imageArea.height / 2, size: 9, font: fonts.regular, color: supplied ? dark : muted });
  }
  page.drawText(image ? 'Preuve integree au rapport' : supplied ? 'Reessayez l export avec une connexion active' : 'Aucune preuve enregistree', { x: x + 14, y: y + 18, size: 7.5, font: fonts.regular, color: muted });
}

export async function generateCleaningReportPdf(organization: Organization, intervention: CleaningInterventionRecord) {
  const pdf = await PDFDocument.create(); const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [beforePhoto, afterPhoto] = await Promise.all([
    intervention.before_photo_url ? embedRemotePhoto(pdf, intervention.before_photo_url).catch(() => null) : Promise.resolve(null),
    intervention.after_photo_url ? embedRemotePhoto(pdf, intervention.after_photo_url).catch(() => null) : Promise.resolve(null)
  ]);
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

  const tasks = [...(intervention.cleaning_intervention_tasks ?? [])].sort((a, b) => a.position - b.position);
  if (tasks.length > 0) {
    page.drawText('PROTOCOLE ET TACHES REALISEES', { x: margin, y, size: 9, font: bold, color: muted }); y -= 19;
    for (const task of tasks.slice(0, 10)) {
      page.drawText(task.completed ? '[OK]' : '[  ]', { x: margin, y, size: 8.5, font: bold, color: task.completed ? accent : muted });
      page.drawText(cleanText(task.label).slice(0, 72), { x: margin + 34, y, size: 8.8, font: regular, color: dark });
      y -= 14;
    }
    if (tasks.length > 10) { page.drawText(`+ ${tasks.length - 10} autre(s) tache(s) dans NCR Suite`, { x: margin + 34, y, size: 8, font: regular, color: muted }); y -= 14; }
    y -= 8;
  }

  y -= 8; page.drawRectangle({ x: margin, y: y - 142, width: width - margin * 2, height: 150, color: soft, borderColor: line, borderWidth: 1 });
  page.drawText('TRAVAUX REALISES ET OBSERVATIONS', { x: margin + 16, y: y - 18, size: 9, font: bold, color: accent });
  let textY = y - 42; for (const lineText of wrap(intervention.report_text || 'Passage termine sans observation particuliere.', regular, 10, width - margin * 2 - 32).slice(0, 8)) { page.drawText(lineText, { x: margin + 16, y: textY, size: 10, font: regular, color: dark }); textY -= 16; }
  y -= 178;

  page.drawText('PREUVES PHOTO', { x: margin, y, size: 9, font: bold, color: muted }); y -= 18;
  page.drawText(`Photo avant : ${beforePhoto ? 'integree au rapport' : intervention.before_photo_url ? 'indisponible pendant l export' : 'non fournie'}`, { x: margin, y, size: 9.5, font: regular, color: dark }); y -= 18;
  page.drawText(`Photo apres : ${afterPhoto ? 'integree au rapport' : intervention.after_photo_url ? 'indisponible pendant l export' : 'non fournie'}`, { x: margin, y, size: 9.5, font: regular, color: dark }); y -= 34;

  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: line }); y -= 22;
  page.drawText('Document genere depuis NCR Suite. Les horodatages sont issus du suivi de l intervention.', { x: margin, y, size: 8, font: regular, color: muted });

  if (intervention.before_photo_url || intervention.after_photo_url) {
    const proofPage = pdf.addPage([595.28, 841.89]);
    const proofWidth = proofPage.getWidth();
    proofPage.drawText('NCR SUITE - NETTOYAGE', { x: margin, y: 790, size: 9, font: bold, color: accent });
    proofPage.drawText('PREUVES PHOTO', { x: margin, y: 754, size: 22, font: bold, color: dark });
    proofPage.drawText(cleanText(`${intervention.cleaning_sites?.name || 'Site'} - ${formatCleaningDateTime(intervention.starts_at)}`), { x: margin, y: 733, size: 9, font: regular, color: muted });
    const gap = 14; const cardWidth = (proofWidth - margin * 2 - gap) / 2;
    drawPhotoCard(proofPage, { x: margin, y: 282, width: cardWidth, height: 420, label: 'AVANT', description: 'Etat constaté avant l intervention', image: beforePhoto, supplied: Boolean(intervention.before_photo_url) }, { regular, bold });
    drawPhotoCard(proofPage, { x: margin + cardWidth + gap, y: 282, width: cardWidth, height: 420, label: 'APRES', description: 'Résultat constaté après l intervention', image: afterPhoto, supplied: Boolean(intervention.after_photo_url) }, { regular, bold });
    proofPage.drawLine({ start: { x: margin, y: 252 }, end: { x: proofWidth - margin, y: 252 }, thickness: 1, color: line });
    proofPage.drawText('Les photographies sont associees a l intervention et conservees avec son rapport de passage.', { x: margin, y: 230, size: 8, font: regular, color: muted });
  }
  return pdf.save();
}

export async function downloadCleaningReportPdf(organization: Organization, intervention: CleaningInterventionRecord) {
  const target = prepareFileWindow('Préparation du rapport', 'Le PDF de la fiche de passage est en cours de génération.');
  const bytes = await generateCleaningReportPdf(organization, intervention); const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'application/pdf' }); const url = URL.createObjectURL(blob);
  const filename = `fiche-passage-${safeName(intervention.cleaning_sites?.name || 'site')}-${intervention.starts_at.slice(0, 10)}.pdf`;
  showBlobDownload(target, url, filename, 'Fiche de passage prête'); window.setTimeout(() => URL.revokeObjectURL(url), 120000);
}
