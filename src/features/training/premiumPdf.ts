import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import type { Organization } from '../../types';

export const TRAINING_PDF_PAGE: [number, number] = [595.28, 841.89];
export const TRAINING_PDF_MARGIN = 42;

export function normalizeTrainingPdfText(value: unknown) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[’‘‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•●▪◦]/g, '-')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/ß/g, 'ss')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function trainingPdfText(value: unknown, font: PDFFont) {
  const normalized = normalizeTrainingPdfText(value);
  let output = '';
  for (const character of normalized) {
    try {
      font.encodeText(character);
      output += character;
    } catch {
      output += '?';
    }
  }
  return output;
}

export function drawTrainingPdfText(
  page: PDFPage,
  value: unknown,
  options: { x: number; y: number; size: number; font: PDFFont; color: RGB; maxWidth?: number }
) {
  const { maxWidth: _maxWidth, ...drawOptions } = options;
  page.drawText(trainingPdfText(value, options.font), drawOptions);
}

export function wrapTrainingPdfText(value: unknown, font: PDFFont, size: number, maxWidth: number) {
  const normalized = trainingPdfText(value || '-', font);
  const lines: string[] = [];
  for (const paragraph of normalized.split('\n')) {
    if (!paragraph.trim()) {
      if (lines.length && lines[lines.length - 1] !== '') lines.push('');
      continue;
    }
    const words = paragraph.trim().split(' ');
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current);
        current = word;
      } else current = candidate;
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : ['-'];
}

export function safeTrainingPdfName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function trainingPdfDate(value?: string | null, withTime = false) {
  if (!value) return 'A confirmer';
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    ...(withTime ? { timeStyle: 'short' } : {})
  }).format(date);
}

function accentFromOrganization(organization: Organization) {
  const hex = String(organization.primary_color || '#3578e5').replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return rgb(0.21, 0.47, 0.9);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function mix(color: RGB, target: RGB, ratio: number) {
  return rgb(
    color.red + (target.red - color.red) * ratio,
    color.green + (target.green - color.green) * ratio,
    color.blue + (target.blue - color.blue) * ratio
  );
}

async function embedRemoteImage(pdf: PDFDocument, url?: string | null): Promise<PDFImage | null> {
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

export type TrainingPdfTheme = {
  pdf: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  accent: RGB;
  accentSoft: RGB;
  accentPale: RGB;
  dark: RGB;
  muted: RGB;
  line: RGB;
  surface: RGB;
  logo: PDFImage | null;
  signature: PDFImage | null;
  stamp: PDFImage | null;
};

export async function createTrainingPdfTheme(organization: Organization): Promise<TrainingPdfTheme> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = accentFromOrganization(organization);
  const white = rgb(1, 1, 1);
  return {
    pdf,
    regular,
    bold,
    accent,
    accentSoft: mix(accent, white, 0.84),
    accentPale: mix(accent, white, 0.93),
    dark: rgb(0.075, 0.1, 0.15),
    muted: rgb(0.37, 0.42, 0.5),
    line: rgb(0.87, 0.89, 0.93),
    surface: rgb(0.968, 0.975, 0.985),
    logo: await embedRemoteImage(pdf, organization.logo_url),
    signature: await embedRemoteImage(pdf, organization.training_signature_url),
    stamp: await embedRemoteImage(pdf, organization.training_stamp_url)
  };
}

function organizationAddress(organization: Organization) {
  return [
    organization.company_address,
    [organization.company_postal_code, organization.company_city].filter(Boolean).join(' ')
  ].filter(Boolean).join(' · ');
}

export function drawTrainingPremiumHeader(
  page: PDFPage,
  theme: TrainingPdfTheme,
  organization: Organization,
  input: { eyebrow: string; title: string; subtitle?: string; reference?: string; pageNumber?: number }
) {
  const width = page.getWidth();
  const height = page.getHeight();
  const heroHeight = 162;
  page.drawRectangle({ x: 0, y: height - heroHeight, width, height: heroHeight, color: theme.dark });
  page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: theme.accent });
  page.drawRectangle({ x: width - 132, y: height - heroHeight, width: 132, height: heroHeight, color: theme.accentSoft, opacity: 0.12 });
  page.drawRectangle({ x: width - 58, y: height - heroHeight, width: 58, height: heroHeight, color: theme.accent, opacity: 0.22 });

  const logoBoxX = TRAINING_PDF_MARGIN;
  const logoBoxY = height - 88;
  page.drawRectangle({ x: logoBoxX, y: logoBoxY, width: 118, height: 52, color: rgb(1, 1, 1), opacity: 0.98 });
  if (theme.logo) {
    const scale = Math.min(96 / theme.logo.width, 34 / theme.logo.height, 1);
    page.drawImage(theme.logo, {
      x: logoBoxX + (118 - theme.logo.width * scale) / 2,
      y: logoBoxY + (52 - theme.logo.height * scale) / 2,
      width: theme.logo.width * scale,
      height: theme.logo.height * scale
    });
  } else {
    const initials = normalizeTrainingPdfText(organization.public_name || organization.name).slice(0, 2).toUpperCase();
    drawTrainingPdfText(page, initials, { x: logoBoxX + 45, y: logoBoxY + 18, size: 15, font: theme.bold, color: theme.accent });
  }

  const brandX = logoBoxX + 136;
  drawTrainingPdfText(page, organization.public_name || organization.name, { x: brandX, y: height - 54, size: 11, font: theme.bold, color: rgb(1, 1, 1) });
  const address = organizationAddress(organization);
  if (address) drawTrainingPdfText(page, address.slice(0, 80), { x: brandX, y: height - 70, size: 7.2, font: theme.regular, color: rgb(0.78, 0.82, 0.88) });
  const contact = [organization.company_email, organization.company_phone].filter(Boolean).join(' · ');
  if (contact) drawTrainingPdfText(page, contact.slice(0, 80), { x: brandX, y: height - 83, size: 7.2, font: theme.regular, color: rgb(0.78, 0.82, 0.88) });

  drawTrainingPdfText(page, input.eyebrow.toUpperCase(), { x: TRAINING_PDF_MARGIN, y: height - 112, size: 7, font: theme.bold, color: theme.accent });
  drawTrainingPdfText(page, input.title, { x: TRAINING_PDF_MARGIN, y: height - 139, size: 23, font: theme.bold, color: rgb(1, 1, 1) });
  if (input.subtitle) {
    drawTrainingPdfText(page, input.subtitle.slice(0, 95), { x: TRAINING_PDF_MARGIN, y: height - 154, size: 7.8, font: theme.regular, color: rgb(0.78, 0.82, 0.88) });
  }

  if (input.reference) {
    const ref = trainingPdfText(input.reference, theme.bold);
    const refWidth = theme.bold.widthOfTextAtSize(ref, 8);
    page.drawRectangle({ x: width - TRAINING_PDF_MARGIN - refWidth - 22, y: height - 125, width: refWidth + 22, height: 24, color: theme.accent });
    drawTrainingPdfText(page, ref, { x: width - TRAINING_PDF_MARGIN - refWidth - 11, y: height - 117, size: 8, font: theme.bold, color: rgb(1, 1, 1) });
  }
  if (input.pageNumber && input.pageNumber > 1) {
    drawTrainingPdfText(page, `PAGE ${input.pageNumber}`, { x: width - TRAINING_PDF_MARGIN - 40, y: height - 151, size: 6.3, font: theme.bold, color: rgb(0.78, 0.82, 0.88) });
  }
  return height - heroHeight - 26;
}

export function drawTrainingPremiumFooter(
  page: PDFPage,
  theme: TrainingPdfTheme,
  organization: Organization,
  input?: { reference?: string; pageNumber?: number; totalPages?: number }
) {
  const width = page.getWidth();
  page.drawLine({ start: { x: TRAINING_PDF_MARGIN, y: 48 }, end: { x: width - TRAINING_PDF_MARGIN, y: 48 }, thickness: 0.8, color: theme.line });
  const legal = [
    organization.company_siret ? `SIRET ${organization.company_siret}` : '',
    organization.training_nda_number ? `NDA ${organization.training_nda_number}` : '',
    organization.training_vat_number ? `TVA ${organization.training_vat_number}` : ''
  ].filter(Boolean).join(' · ');
  drawTrainingPdfText(page, legal || 'Organisme de formation', { x: TRAINING_PDF_MARGIN, y: 31, size: 6.4, font: theme.regular, color: theme.muted });
  const pageText = input?.totalPages && input.totalPages > 1
    ? `${input.pageNumber ?? 1}/${input.totalPages}`
    : input?.reference || 'NCR Suite';
  const encoded = trainingPdfText(pageText, theme.bold);
  drawTrainingPdfText(page, encoded, { x: width - TRAINING_PDF_MARGIN - theme.bold.widthOfTextAtSize(encoded, 6.4), y: 31, size: 6.4, font: theme.bold, color: theme.muted });
}

export function drawTrainingSectionTitle(page: PDFPage, theme: TrainingPdfTheme, title: string, y: number, index?: string) {
  if (index) {
    page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: y - 2, width: 24, height: 24, color: theme.accentSoft });
    drawTrainingPdfText(page, index, { x: TRAINING_PDF_MARGIN + 7, y: y + 6, size: 7, font: theme.bold, color: theme.accent });
  }
  drawTrainingPdfText(page, title, { x: TRAINING_PDF_MARGIN + (index ? 34 : 0), y: y + 5, size: 12, font: theme.bold, color: theme.dark });
  return y - 28;
}

export function drawTrainingParagraph(
  page: PDFPage,
  theme: TrainingPdfTheme,
  text: unknown,
  y: number,
  options?: { x?: number; width?: number; size?: number; color?: RGB; lineHeight?: number; maxLines?: number }
) {
  const x = options?.x ?? TRAINING_PDF_MARGIN;
  const width = options?.width ?? page.getWidth() - TRAINING_PDF_MARGIN * 2;
  const size = options?.size ?? 9;
  const lineHeight = options?.lineHeight ?? size * 1.45;
  const lines = wrapTrainingPdfText(text, theme.regular, size, width).slice(0, options?.maxLines ?? 999);
  for (const line of lines) {
    drawTrainingPdfText(page, line, { x, y, size, font: theme.regular, color: options?.color ?? theme.muted });
    y -= lineHeight;
  }
  return y;
}
