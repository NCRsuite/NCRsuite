import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  formatTrainingMoney,
  trainingCommercialDocumentTypeLabels,
  trainingFunderTypeLabels,
  type TrainingCommercialDocumentRecord,
  type TrainingCustomerRecord,
  type TrainingFunderRecord,
  type TrainingSessionRecord,
  type TrainingTraineeRecord
} from './types';

const PAGE: [number, number] = [595.28, 841.89];
const MARGIN = 42;

function clean(value: unknown) {
  return String(value ?? '').replace(/[’‘]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...').replace(/\s+/g, ' ').trim();
}

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function dateLabel(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date);
}

function accentFromOrganization(organization: Organization) {
  const hex = String(organization.primary_color || '#2997ff').replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return rgb(0.16, 0.59, 1);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

async function embedLogo(pdf: PDFDocument, url?: string | null): Promise<PDFImage | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    const type = response.headers.get('content-type') || '';
    return type.includes('png') || url.toLowerCase().includes('.png')
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = clean(text || '—').split(' ');
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
  return lines.length ? lines : ['—'];
}

export interface TrainingCommercialPdfInput {
  organization: Organization;
  document: TrainingCommercialDocumentRecord;
  customer: TrainingCustomerRecord | null;
  funder: TrainingFunderRecord | null;
  session: TrainingSessionRecord | null;
  trainee: TrainingTraineeRecord | null;
}

export async function generateTrainingCommercialPdf(input: TrainingCommercialPdfInput) {
  const { organization, document, customer, funder, session, trainee } = input;
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = accentFromOrganization(organization);
  const dark = rgb(0.08, 0.1, 0.14);
  const muted = rgb(0.4, 0.43, 0.49);
  const line = rgb(0.86, 0.88, 0.92);
  const soft = rgb(0.965, 0.975, 0.99);
  const logo = await embedLogo(pdf, organization.logo_url);
  let page!: PDFPage;
  let y = 0;
  let pageNumber = 0;

  const addPage = () => {
    page = pdf.addPage(PAGE);
    pageNumber += 1;
    y = PAGE[1] - MARGIN;
    if (logo) {
      const scale = Math.min(88 / logo.width, 38 / logo.height, 1);
      page.drawImage(logo, { x: MARGIN, y: y - logo.height * scale + 4, width: logo.width * scale, height: logo.height * scale });
    }
    const headerX = logo ? MARGIN + 103 : MARGIN;
    page.drawText('NCR SUITE · FORMATION', { x: headerX, y: y - 2, size: 7.2, font: bold, color: accent });
    page.drawText(trainingCommercialDocumentTypeLabels[document.document_type].toUpperCase(), { x: headerX, y: y - 28, size: 22, font: bold, color: dark });
    page.drawText(document.reference, { x: PAGE[0] - MARGIN - 150, y: y - 18, size: 10.5, font: bold, color: dark });
    page.drawText(`Page ${pageNumber}`, { x: PAGE[0] - MARGIN - 40, y: y - 38, size: 6.8, font: regular, color: muted });
    y -= 64;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE[0] - MARGIN, y }, thickness: 1, color: line });
    y -= 20;
  };

  const ensure = (height: number) => { if (y - height < 72) addPage(); };
  addPage();

  const issuerName = organization.public_name || organization.name;
  const issuerLines = [
    organization.company_contact_name,
    organization.company_address,
    [organization.company_postal_code, organization.company_city].filter(Boolean).join(' '),
    organization.company_siret ? `SIRET : ${organization.company_siret}` : '',
    [organization.company_email, organization.company_phone].filter(Boolean).join(' · ')
  ].filter(Boolean);
  const customerLines = [
    customer?.contact_name,
    customer?.billing_address,
    [customer?.postal_code, customer?.city].filter(Boolean).join(' '),
    customer?.siret ? `SIRET : ${customer.siret}` : '',
    [customer?.email, customer?.phone].filter(Boolean).join(' · ')
  ].filter(Boolean);

  const boxWidth = (PAGE[0] - MARGIN * 2 - 12) / 2;
  const boxHeight = 118;
  page.drawRectangle({ x: MARGIN, y: y - boxHeight, width: boxWidth, height: boxHeight, color: soft, borderColor: line, borderWidth: 0.8 });
  page.drawRectangle({ x: MARGIN + boxWidth + 12, y: y - boxHeight, width: boxWidth, height: boxHeight, color: soft, borderColor: line, borderWidth: 0.8 });
  page.drawText('ORGANISME DE FORMATION', { x: MARGIN + 13, y: y - 18, size: 6.8, font: bold, color: accent });
  page.drawText(clean(issuerName).slice(0, 46), { x: MARGIN + 13, y: y - 38, size: 10, font: bold, color: dark });
  issuerLines.slice(0, 5).forEach((value, index) => page.drawText(clean(value).slice(0, 53), { x: MARGIN + 13, y: y - 55 - index * 12, size: 7.3, font: regular, color: muted }));
  const customerX = MARGIN + boxWidth + 25;
  page.drawText('CLIENT / BÉNÉFICIAIRE', { x: customerX, y: y - 18, size: 6.8, font: bold, color: accent });
  page.drawText(clean(customer?.legal_name || (trainee ? `${trainee.first_name} ${trainee.last_name}` : 'À compléter')).slice(0, 46), { x: customerX, y: y - 38, size: 10, font: bold, color: dark });
  customerLines.slice(0, 5).forEach((value, index) => page.drawText(clean(value).slice(0, 53), { x: customerX, y: y - 55 - index * 12, size: 7.3, font: regular, color: muted }));
  y -= boxHeight + 24;

  page.drawText('DATE D’ÉMISSION', { x: MARGIN, y, size: 6.8, font: bold, color: muted });
  page.drawText(dateLabel(document.issue_date), { x: MARGIN, y: y - 15, size: 8.5, font: bold, color: dark });
  page.drawText('VALIDITÉ', { x: MARGIN + 195, y, size: 6.8, font: bold, color: muted });
  page.drawText(dateLabel(document.valid_until), { x: MARGIN + 195, y: y - 15, size: 8.5, font: bold, color: dark });
  page.drawText('PARTICIPANTS', { x: MARGIN + 390, y, size: 6.8, font: bold, color: muted });
  page.drawText(String(document.participant_count), { x: MARGIN + 390, y: y - 15, size: 8.5, font: bold, color: dark });
  y -= 50;

  page.drawText(clean(document.title), { x: MARGIN, y, size: 17, font: bold, color: dark });
  y -= 24;
  const summary = document.training_summary || session?.title || 'Prestation de formation';
  for (const lineText of wrap(summary, regular, 9, PAGE[0] - MARGIN * 2).slice(0, 7)) {
    page.drawText(lineText, { x: MARGIN, y, size: 9, font: regular, color: muted });
    y -= 13;
  }
  if (session) {
    y -= 5;
    page.drawText(`Session : ${clean(session.title)} · ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(session.starts_at))}`, { x: MARGIN, y, size: 8, font: bold, color: dark });
    y -= 16;
  }
  if (funder) {
    page.drawText(`Financeur : ${clean(funder.name)} (${trainingFunderTypeLabels[funder.funder_type]})`, { x: MARGIN, y, size: 8, font: bold, color: dark });
    y -= 16;
  }
  if (trainee) {
    page.drawText(`Stagiaire : ${clean(`${trainee.first_name} ${trainee.last_name}`)}`, { x: MARGIN, y, size: 8, font: bold, color: dark });
    y -= 16;
  }

  ensure(110);
  y -= 8;
  page.drawRectangle({ x: MARGIN, y: y - 96, width: PAGE[0] - MARGIN * 2, height: 96, color: soft, borderColor: line, borderWidth: 0.8 });
  page.drawText('MONTANT HT', { x: MARGIN + 20, y: y - 24, size: 7, font: bold, color: muted });
  page.drawText(formatTrainingMoney(document.amount_excl_tax_cents), { x: MARGIN + 20, y: y - 52, size: 16, font: bold, color: dark });
  page.drawText(`TVA ${(document.vat_rate_basis_points / 100).toLocaleString('fr-FR')} %`, { x: MARGIN + 210, y: y - 24, size: 7, font: bold, color: muted });
  page.drawText(formatTrainingMoney(document.tax_cents), { x: MARGIN + 210, y: y - 52, size: 13, font: bold, color: dark });
  page.drawText('TOTAL TTC', { x: MARGIN + 375, y: y - 24, size: 7, font: bold, color: accent });
  page.drawText(formatTrainingMoney(document.amount_incl_tax_cents), { x: MARGIN + 375, y: y - 52, size: 17, font: bold, color: accent });
  y -= 122;

  if (document.notes) {
    ensure(80);
    page.drawText('NOTES', { x: MARGIN, y, size: 7, font: bold, color: accent });
    y -= 15;
    for (const lineText of wrap(document.notes, regular, 8, PAGE[0] - MARGIN * 2).slice(0, 10)) {
      page.drawText(lineText, { x: MARGIN, y, size: 8, font: regular, color: muted });
      y -= 11;
    }
    y -= 8;
  }

  if (document.terms) {
    ensure(90);
    page.drawText('CONDITIONS', { x: MARGIN, y, size: 7, font: bold, color: accent });
    y -= 15;
    for (const lineText of wrap(document.terms, regular, 7.6, PAGE[0] - MARGIN * 2).slice(0, 14)) {
      page.drawText(lineText, { x: MARGIN, y, size: 7.6, font: regular, color: muted });
      y -= 10;
    }
  }

  for (const current of pdf.getPages()) {
    current.drawLine({ start: { x: MARGIN, y: 46 }, end: { x: PAGE[0] - MARGIN, y: 46 }, thickness: 0.5, color: line });
    current.drawText('Document généré depuis NCR Suite', { x: MARGIN, y: 31, size: 6.2, font: regular, color: muted });
    current.drawText(clean(issuerName).slice(0, 55), { x: PAGE[0] - MARGIN - 190, y: 31, size: 6.2, font: bold, color: accent });
  }

  pdf.setTitle(`${trainingCommercialDocumentTypeLabels[document.document_type]} ${document.reference}`);
  pdf.setAuthor(clean(issuerName));
  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' });
  return { blob, filename: `${safeName(document.reference || document.title)}.pdf` };
}
