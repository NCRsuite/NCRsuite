import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';

export interface BeautyAccountingCompany {
  id: string;
  name: string;
  legal_name: string | null;
  siret: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
}

export interface BeautyAccountingTax {
  configured: boolean;
  mode: 'unset' | 'vat' | 'exempt';
  vat_rate_basis_points: number;
  exemption_text: string | null;
}

export interface BeautyAccountingSummary {
  appointment_count: number;
  prestation_count: number;
  total_ttc_cents: number;
  total_ht_cents: number | null;
  total_vat_cents: number | null;
}

export interface BeautyAccountingLine {
  service_id?: string | null;
  service_name?: string;
  site_id?: string | null;
  site_name?: string;
  prestation_count: number;
  appointment_count: number;
  total_ttc_cents: number;
  total_ht_cents: number | null;
  total_vat_cents: number | null;
}

export interface BeautyMonthlyAccountingReport {
  company: BeautyAccountingCompany;
  period: {
    year: number;
    month: number;
    start_date: string;
    end_date: string;
    timezone: string;
  };
  tax: BeautyAccountingTax;
  summary: BeautyAccountingSummary;
  services: BeautyAccountingLine[];
  sites: BeautyAccountingLine[];
}

const PAGE: [number, number] = [595.28, 841.89];
const MARGIN = 42;

function clean(value: unknown) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function money(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return '—';
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}

function safeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'comptabilite';
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const source = clean(text);
  if (!source) return [''];
  const words = source.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function loadLogo(pdf: PDFDocument, url: string | null): Promise<PDFImage | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (type.includes('png')) return await pdf.embedPng(bytes);
    if (type.includes('jpeg') || type.includes('jpg')) return await pdf.embedJpg(bytes);
    return null;
  } catch {
    return null;
  }
}

function fitLogo(image: PDFImage, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  return { width: image.width * scale, height: image.height * scale };
}

function drawMoneyRight(page: PDFPage, value: string, xRight: number, y: number, font: PDFFont, size: number, color = rgb(.16,.18,.21)) {
  const width = font.widthOfTextAtSize(value, size);
  page.drawText(value, { x: xRight - width, y, font, size, color });
}

export async function generateBeautyMonthlyAccountingPdf(report: BeautyMonthlyAccountingReport) {
  if (!report.tax.configured || report.summary.total_ht_cents === null || report.summary.total_vat_cents === null) {
    throw new Error('Configurez le régime fiscal de l’enseigne avant de générer le PDF.');
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(pdf, report.company.logo_url);

  const accent = rgb(.16,.55,.92);
  const dark = rgb(.12,.14,.17);
  const muted = rgb(.42,.46,.51);
  const line = rgb(.88,.90,.92);
  const soft = rgb(.97,.98,.985);
  const white = rgb(1,1,1);

  let page!: PDFPage;
  let y = 0;
  let pageNumber = 0;

  const addPage = () => {
    page = pdf.addPage(PAGE);
    pageNumber += 1;
    y = PAGE[1] - MARGIN;

    if (logo) {
      const size = fitLogo(logo, 76, 38);
      page.drawImage(logo, { x: MARGIN, y: y - size.height + 2, width: size.width, height: size.height });
    }

    const headerX = logo ? MARGIN + 90 : MARGIN;
    page.drawText('NCR SUITE · BEAUTY', { x: headerX, y: y - 2, size: 7.2, font: bold, color: accent });
    page.drawText('FEUILLE COMPTABLE MENSUELLE', { x: headerX, y: y - 27, size: 20, font: bold, color: dark });
    page.drawText(clean(monthLabel(report.period.year, report.period.month)).toUpperCase(), { x: headerX, y: y - 43, size: 8.2, font: bold, color: muted });
    page.drawText(`Page ${pageNumber}`, { x: PAGE[0] - MARGIN - 36, y: y - 4, size: 6.5, font: regular, color: muted });
    y -= 60;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE[0] - MARGIN, y }, thickness: .8, color: line });
    y -= 18;
  };

  const ensure = (height: number) => {
    if (y - height < 66) addPage();
  };

  addPage();

  const companyName = clean(report.company.legal_name || report.company.name);
  const companyLines = [
    ...(report.company.legal_name && report.company.legal_name !== report.company.name ? [report.company.name] : []),
    report.company.siret ? `SIRET : ${report.company.siret}` : '',
    [report.company.email, report.company.phone].filter(Boolean).join(' · ')
  ].filter(Boolean);

  page.drawRectangle({ x: MARGIN, y: y - 76, width: PAGE[0] - MARGIN * 2, height: 76, color: soft, borderColor: line, borderWidth: .7 });
  page.drawText('ENSEIGNE', { x: MARGIN + 12, y: y - 17, size: 6.8, font: bold, color: accent });
  page.drawText(companyName, { x: MARGIN + 12, y: y - 36, size: 11.5, font: bold, color: dark });
  companyLines.slice(0,2).forEach((text, index) => page.drawText(clean(text), { x: MARGIN + 12, y: y - 51 - index * 11, size: 7.2, font: regular, color: muted }));

  page.drawText('PÉRIODE', { x: 348, y: y - 17, size: 6.8, font: bold, color: accent });
  page.drawText(clean(monthLabel(report.period.year, report.period.month)), { x: 348, y: y - 36, size: 10.5, font: bold, color: dark });
  page.drawText(`Du ${new Intl.DateTimeFormat('fr-FR').format(new Date(report.period.start_date + 'T12:00:00'))} au ${new Intl.DateTimeFormat('fr-FR').format(new Date(report.period.end_date + 'T12:00:00'))}`, { x: 348, y: y - 52, size: 7, font: regular, color: muted });
  y -= 96;

  const cardWidth = (PAGE[0] - MARGIN * 2 - 18) / 4;
  const cards: Array<[string,string]> = [
    ['PRESTATIONS', String(report.summary.prestation_count)],
    ['TOTAL HT', money(report.summary.total_ht_cents)],
    ['TVA', money(report.summary.total_vat_cents)],
    ['TOTAL TTC', money(report.summary.total_ttc_cents)]
  ];
  cards.forEach(([label,value], index) => {
    const x = MARGIN + index * (cardWidth + 6);
    page.drawRectangle({ x, y: y - 58, width: cardWidth, height: 58, color: index === 3 ? rgb(.95,.98,1) : soft, borderColor: index === 3 ? rgb(.70,.85,.98) : line, borderWidth: .7 });
    page.drawText(label, { x: x + 9, y: y - 17, size: 6.5, font: bold, color: index === 3 ? accent : muted });
    const valueSize = value.length > 13 ? 10 : 12;
    page.drawText(value, { x: x + 9, y: y - 39, size: valueSize, font: bold, color: dark });
  });
  y -= 79;

  page.drawText('DÉTAIL PAR PRESTATION', { x: MARGIN, y, size: 9.5, font: bold, color: accent });
  page.drawText(`${report.summary.appointment_count} rendez-vous terminés · ${report.summary.prestation_count} prestations réalisées`, { x: MARGIN, y: y - 14, size: 7, font: regular, color: muted });
  y -= 30;

  const drawHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - 24, width: PAGE[0] - MARGIN * 2, height: 24, color: dark });
    page.drawText('PRESTATION', { x: MARGIN + 8, y: y - 15, size: 6.8, font: bold, color: white });
    page.drawText('QTÉ', { x: 306, y: y - 15, size: 6.8, font: bold, color: white });
    page.drawText('HT', { x: 354, y: y - 15, size: 6.8, font: bold, color: white });
    page.drawText('TVA', { x: 429, y: y - 15, size: 6.8, font: bold, color: white });
    page.drawText('TTC', { x: 500, y: y - 15, size: 6.8, font: bold, color: white });
    y -= 24;
  };
  drawHeader();

  for (const item of report.services) {
    const name = clean(item.service_name || 'Prestation');
    const nameLines = wrap(name, bold, 8, 248);
    const rowHeight = Math.max(32, 16 + nameLines.length * 10);
    if (y - rowHeight < 76) {
      addPage();
      page.drawText('DÉTAIL PAR PRESTATION · SUITE', { x: MARGIN, y, size: 9, font: bold, color: accent });
      y -= 18;
      drawHeader();
    }
    let textY = y - 13;
    nameLines.forEach((value) => {
      page.drawText(value, { x: MARGIN + 8, y: textY, size: 8, font: bold, color: dark });
      textY -= 10;
    });
    page.drawText(String(item.prestation_count), { x: 310, y: y - 14, size: 7.5, font: bold, color: dark });
    drawMoneyRight(page, money(item.total_ht_cents), 408, y - 14, regular, 7.2);
    drawMoneyRight(page, money(item.total_vat_cents), 482, y - 14, regular, 7.2);
    drawMoneyRight(page, money(item.total_ttc_cents), PAGE[0] - MARGIN - 7, y - 14, bold, 7.5, dark);
    page.drawLine({ start: { x: MARGIN, y: y - rowHeight }, end: { x: PAGE[0] - MARGIN, y: y - rowHeight }, thickness: .5, color: line });
    y -= rowHeight;
  }

  ensure(92);
  y -= 12;
  const totalsX = 340;
  const totalRows: Array<[string,number | null]> = [
    ['TOTAL HT', report.summary.total_ht_cents],
    [report.tax.mode === 'vat' ? `TVA ${(report.tax.vat_rate_basis_points / 100).toLocaleString('fr-FR')} %` : 'TVA', report.summary.total_vat_cents],
    ['TOTAL TTC', report.summary.total_ttc_cents]
  ];
  totalRows.forEach(([label,value], index) => {
    const rowY = y - index * 23;
    page.drawText(label, { x: totalsX, y: rowY, size: index === 2 ? 9 : 7.5, font: bold, color: index === 2 ? dark : muted });
    drawMoneyRight(page, money(value), PAGE[0] - MARGIN, rowY, bold, index === 2 ? 11.5 : 8.2, index === 2 ? accent : dark);
  });
  y -= 82;

  if (report.sites.length > 1) {
    ensure(60 + report.sites.length * 24);
    page.drawText('RÉPARTITION PAR ÉTABLISSEMENT', { x: MARGIN, y, size: 9, font: bold, color: accent });
    y -= 20;
    for (const site of report.sites) {
      ensure(28);
      page.drawText(clean(site.site_name || 'Établissement'), { x: MARGIN, y: y - 12, size: 7.8, font: bold, color: dark });
      page.drawText(`${site.prestation_count} prestation${site.prestation_count > 1 ? 's' : ''}`, { x: 300, y: y - 12, size: 7, font: regular, color: muted });
      drawMoneyRight(page, money(site.total_ttc_cents), PAGE[0] - MARGIN, y - 12, bold, 7.8, dark);
      page.drawLine({ start: { x: MARGIN, y: y - 22 }, end: { x: PAGE[0] - MARGIN, y: y - 22 }, thickness: .4, color: line });
      y -= 23;
    }
    y -= 8;
  }

  ensure(52);
  const taxText = report.tax.mode === 'vat'
    ? `Régime TVA configuré : ${(report.tax.vat_rate_basis_points / 100).toLocaleString('fr-FR')} %.`
    : clean(report.tax.exemption_text || 'TVA non applicable selon le régime fiscal configuré pour cette enseigne.');
  wrap(taxText, regular, 6.8, PAGE[0] - MARGIN * 2).slice(0,3).forEach((value,index) => {
    page.drawText(value, { x: MARGIN, y: y - index * 9, size: 6.8, font: index === 0 ? bold : regular, color: muted });
  });

  for (const current of pdf.getPages()) {
    current.drawLine({ start: { x: MARGIN, y: 47 }, end: { x: PAGE[0] - MARGIN, y: 47 }, thickness: .5, color: line });
    current.drawText('Synthèse interne issue des rendez-vous terminés enregistrés dans NCR Suite.', { x: MARGIN, y: 32, size: 5.8, font: regular, color: muted });
    current.drawText('Ce document ne remplace pas les justificatifs comptables ou fiscaux requis.', { x: MARGIN, y: 23, size: 5.8, font: regular, color: muted });
    const generated = `Généré le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`;
    const width = regular.widthOfTextAtSize(generated, 5.8);
    current.drawText(generated, { x: PAGE[0] - MARGIN - width, y: 32, size: 5.8, font: regular, color: muted });
  }

  const label = monthLabel(report.period.year, report.period.month);
  pdf.setTitle(`Feuille comptable mensuelle · ${report.company.name} · ${label}`);
  pdf.setAuthor(report.company.legal_name || report.company.name);
  pdf.setSubject('Synthèse mensuelle des prestations terminées');
  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' });
  return {
    blob,
    filename: `comptabilite-${safeName(report.company.name)}-${report.period.year}-${String(report.period.month).padStart(2,'0')}.pdf`
  };
}
