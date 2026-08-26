import { rgb, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  drawTrainingPdfText,
  TRAINING_PDF_MARGIN,
  TRAINING_PDF_PAGE,
  trainingPdfText,
  wrapTrainingPdfText,
  type TrainingPdfTheme
} from './premiumPdf';

export const CARD_DOCUMENT_BOTTOM_LIMIT = 66;
export const CARD_DOCUMENT_CONTENT_WIDTH = TRAINING_PDF_PAGE[0] - TRAINING_PDF_MARGIN * 2;

function organizationAddress(organization: Organization) {
  return [
    organization.company_address,
    [organization.company_postal_code, organization.company_city].filter(Boolean).join(' ')
  ].filter(Boolean).join(' · ');
}

export function drawCardDocumentHeader(
  page: PDFPage,
  theme: TrainingPdfTheme,
  organization: Organization,
  input: {
    badge: string;
    title: string;
    subtitle?: string | null;
    reference?: string | null;
    meta?: string | null;
    continuation?: boolean;
  }
) {
  const width = page.getWidth();
  const height = page.getHeight();

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: height - 7, width, height: 7, color: theme.accent });

  // Motif discret inspiré de la proposition C, sans gêner la lecture.
  page.drawRectangle({ x: width - 154, y: height - 168, width: 118, height: 118, color: theme.accentPale, opacity: 0.72 });
  page.drawRectangle({ x: width - 104, y: height - 126, width: 76, height: 76, color: theme.accentSoft, opacity: 0.44 });

  const logoX = TRAINING_PDF_MARGIN;
  const logoY = height - 76;
  if (theme.logo) {
    const scale = Math.min(78 / theme.logo.width, 34 / theme.logo.height, 1);
    page.drawImage(theme.logo, {
      x: logoX,
      y: logoY,
      width: theme.logo.width * scale,
      height: theme.logo.height * scale
    });
  } else {
    page.drawRectangle({ x: logoX, y: logoY - 2, width: 38, height: 38, color: theme.accent });
    const initials = String(organization.public_name || organization.name).slice(0, 2).toUpperCase();
    drawTrainingPdfText(page, initials, { x: logoX + 8, y: logoY + 10, size: 12, font: theme.bold, color: rgb(1, 1, 1) });
  }

  const brandX = theme.logo ? logoX + 92 : logoX + 50;
  drawTrainingPdfText(page, organization.public_name || organization.name, {
    x: brandX,
    y: height - 49,
    size: 11.5,
    font: theme.bold,
    color: theme.dark
  });
  const legalAddress = organizationAddress(organization);
  if (legalAddress) {
    drawTrainingPdfText(page, legalAddress.slice(0, 78), {
      x: brandX,
      y: height - 63,
      size: 6.4,
      font: theme.regular,
      color: theme.muted
    });
  }

  const badgeText = trainingPdfText(input.badge.toUpperCase(), theme.bold);
  const badgeWidth = Math.max(72, theme.bold.widthOfTextAtSize(badgeText, 7.1) + 24);
  page.drawRectangle({
    x: width - TRAINING_PDF_MARGIN - badgeWidth,
    y: height - 58,
    width: badgeWidth,
    height: 26,
    color: theme.accent
  });
  drawTrainingPdfText(page, badgeText, {
    x: width - TRAINING_PDF_MARGIN - badgeWidth + 12,
    y: height - 49,
    size: 7.1,
    font: theme.bold,
    color: rgb(1, 1, 1)
  });

  const reference = [input.reference, input.meta].filter(Boolean).join(' · ');
  if (reference) {
    const encoded = trainingPdfText(reference, theme.regular);
    const refWidth = Math.min(220, theme.regular.widthOfTextAtSize(encoded, 6.4));
    drawTrainingPdfText(page, encoded, {
      x: width - TRAINING_PDF_MARGIN - refWidth,
      y: height - 74,
      size: 6.4,
      font: theme.regular,
      color: theme.muted
    });
  }

  page.drawLine({
    start: { x: TRAINING_PDF_MARGIN, y: height - 96 },
    end: { x: TRAINING_PDF_MARGIN + 76, y: height - 96 },
    thickness: 1.2,
    color: theme.accent
  });

  drawTrainingPdfText(page, input.continuation ? `${input.title} · suite` : input.title, {
    x: TRAINING_PDF_MARGIN,
    y: height - 130,
    size: input.continuation ? 20 : 25,
    font: theme.bold,
    color: theme.dark
  });

  if (input.subtitle) {
    const lines = wrapTrainingPdfText(input.subtitle, theme.regular, 8, 365).slice(0, 2);
    lines.forEach((line, index) => drawTrainingPdfText(page, line, {
      x: TRAINING_PDF_MARGIN,
      y: height - 149 - index * 11,
      size: 8,
      font: theme.regular,
      color: theme.muted
    }));
  }

  return height - 184;
}

export function drawCardDocumentFooter(
  page: PDFPage,
  theme: TrainingPdfTheme,
  organization: Organization,
  input: { reference?: string | null; pageNumber: number; totalPages: number }
) {
  const width = page.getWidth();
  page.drawLine({
    start: { x: TRAINING_PDF_MARGIN, y: 48 },
    end: { x: width - TRAINING_PDF_MARGIN, y: 48 },
    thickness: 0.7,
    color: theme.line
  });
  page.drawRectangle({ x: 0, y: 0, width, height: 7, color: theme.accent });

  drawTrainingPdfText(page, organization.public_name || organization.name, {
    x: TRAINING_PDF_MARGIN,
    y: 32,
    size: 6.2,
    font: theme.bold,
    color: theme.dark
  });

  const contact = [organization.company_phone, organization.company_email].filter(Boolean).join(' · ');
  if (contact) {
    drawTrainingPdfText(page, contact.slice(0, 76), {
      x: TRAINING_PDF_MARGIN,
      y: 20,
      size: 5.5,
      font: theme.regular,
      color: theme.muted
    });
  }

  const legal = [
    organization.company_siret ? `SIRET ${organization.company_siret}` : '',
    organization.training_nda_number ? `NDA ${organization.training_nda_number}` : ''
  ].filter(Boolean).join(' · ');
  if (legal) {
    const encoded = trainingPdfText(legal, theme.regular);
    const w = theme.regular.widthOfTextAtSize(encoded, 5.5);
    drawTrainingPdfText(page, encoded, {
      x: Math.max(TRAINING_PDF_MARGIN, width / 2 - w / 2),
      y: 25,
      size: 5.5,
      font: theme.regular,
      color: theme.muted
    });
  }

  const pageLabel = `${input.reference ? `${input.reference} · ` : ''}${input.pageNumber}/${input.totalPages}`;
  const encoded = trainingPdfText(pageLabel, theme.bold);
  drawTrainingPdfText(page, encoded, {
    x: width - TRAINING_PDF_MARGIN - theme.bold.widthOfTextAtSize(encoded, 6),
    y: 26,
    size: 6,
    font: theme.bold,
    color: theme.muted
  });
}

export function drawCardFrame(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill?: 'white' | 'surface' | 'accent';
    accentEdge?: boolean;
  }
) {
  const fill = input.fill === 'accent'
    ? theme.accentPale
    : input.fill === 'surface'
      ? theme.surface
      : rgb(1, 1, 1);
  page.drawRectangle({
    x: input.x,
    y: input.y - input.height,
    width: input.width,
    height: input.height,
    color: fill,
    borderColor: theme.line,
    borderWidth: 0.7
  });
  if (input.accentEdge) {
    page.drawRectangle({ x: input.x, y: input.y - input.height, width: 4, height: input.height, color: theme.accent });
  }
}

export function drawCardHeading(
  page: PDFPage,
  theme: TrainingPdfTheme,
  title: string,
  x: number,
  y: number,
  options?: { size?: number; muted?: boolean }
) {
  drawTrainingPdfText(page, title.toUpperCase(), {
    x,
    y,
    size: options?.size ?? 6.2,
    font: theme.bold,
    color: options?.muted ? theme.muted : theme.accent
  });
}

export function drawCardMetric(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: {
    x: number;
    y: number;
    width: number;
    height?: number;
    label: string;
    value: unknown;
    detail?: unknown;
    emphasized?: boolean;
  }
) {
  const height = input.height ?? 64;
  drawCardFrame(page, theme, {
    x: input.x,
    y: input.y,
    width: input.width,
    height,
    fill: input.emphasized ? 'accent' : 'white'
  });
  drawCardHeading(page, theme, input.label, input.x + 11, input.y - 17);
  const valueLines = wrapTrainingPdfText(input.value || '-', theme.bold, input.emphasized ? 10.3 : 8.7, input.width - 22).slice(0, 2);
  valueLines.forEach((line, index) => drawTrainingPdfText(page, line, {
    x: input.x + 11,
    y: input.y - 36 - index * 11,
    size: input.emphasized ? 10.3 : 8.7,
    font: theme.bold,
    color: theme.dark
  }));
  if (input.detail) {
    const detailLines = wrapTrainingPdfText(input.detail, theme.regular, 6.3, input.width - 22).slice(0, 2);
    detailLines.forEach((line, index) => drawTrainingPdfText(page, line, {
      x: input.x + 11,
      y: input.y - height + 14 - index * 8,
      size: 6.3,
      font: theme.regular,
      color: theme.muted
    }));
  }
}

export function drawCardSectionTitle(
  page: PDFPage,
  theme: TrainingPdfTheme,
  title: string,
  y: number,
  eyebrow?: string
) {
  page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: y - 3, width: 24, height: 24, color: theme.accentPale });
  page.drawRectangle({ x: TRAINING_PDF_MARGIN, y: y - 3, width: 4, height: 24, color: theme.accent });
  if (eyebrow) {
    drawTrainingPdfText(page, eyebrow.toUpperCase(), {
      x: TRAINING_PDF_MARGIN + 34,
      y: y + 5,
      size: 5.4,
      font: theme.bold,
      color: theme.accent
    });
  }
  drawTrainingPdfText(page, title, {
    x: TRAINING_PDF_MARGIN + 34,
    y: eyebrow ? y - 8 : y,
    size: 11.2,
    font: theme.bold,
    color: theme.dark
  });
  return y - 34;
}

export function drawCardTextBlock(
  page: PDFPage,
  theme: TrainingPdfTheme,
  input: {
    x: number;
    y: number;
    width: number;
    title: string;
    lines: string[];
    lineHeight?: number;
    fill?: 'white' | 'surface' | 'accent';
    accentEdge?: boolean;
  }
) {
  const lineHeight = input.lineHeight ?? 10.5;
  const height = 38 + Math.max(1, input.lines.length) * lineHeight + 10;
  drawCardFrame(page, theme, {
    x: input.x,
    y: input.y,
    width: input.width,
    height,
    fill: input.fill,
    accentEdge: input.accentEdge
  });
  drawCardHeading(page, theme, input.title, input.x + 12, input.y - 18);
  input.lines.forEach((line, index) => drawTrainingPdfText(page, line || ' ', {
    x: input.x + 12,
    y: input.y - 38 - index * lineHeight,
    size: 7.4,
    font: theme.regular,
    color: theme.muted
  }));
  return input.y - height;
}
