import { PDFDocument, type PDFImage, rgb, type RGB } from 'pdf-lib';
import type { Organization } from '../../types';

export function securityAccent(organization: Pick<Organization, 'primary_color'>): RGB {
  const raw = (organization.primary_color || '#0A84FF').replace('#', '');
  const value = /^[0-9a-f]{6}$/i.test(raw) ? raw : '0A84FF';
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255
  );
}

async function webpToPng(bytes: Uint8Array) {
  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') return null;
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes).buffer], { type: 'image/webp' }));
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}

export async function embedSecurityLogo(pdf: PDFDocument, logoUrl?: string | null): Promise<PDFImage | null> {
  if (!logoUrl || !/^https:\/\//i.test(logoUrl)) return null;
  try {
    const response = await fetch(logoUrl, { cache: 'force-cache' });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    let bytes = new Uint8Array(await response.arrayBuffer());
    if (contentType.includes('webp') || /\.webp(?:\?|$)/i.test(logoUrl)) {
      const converted = await webpToPng(bytes);
      if (!converted) return null;
      bytes = converted;
      return pdf.embedPng(bytes);
    }
    if (contentType.includes('png') || /\.png(?:\?|$)/i.test(logoUrl)) return pdf.embedPng(bytes);
    return pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

export function logoDimensions(logo: PDFImage, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height, 1);
  return { width: logo.width * scale, height: logo.height * scale };
}
