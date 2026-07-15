import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import type { Organization } from '../../types';
import {
  formatSecurityDate,
  formatSecurityDuration,
  securityPersonName,
  securityShiftMinutes,
  type SecurityAgentRecord,
  type SecurityShiftRecord,
  type SecuritySiteRecord
} from './types';
import { embedSecurityLogo, logoDimensions } from './pdfBranding';

interface PlanningPdfInput {
  organization: Organization;
  agent: SecurityAgentRecord;
  shifts: SecurityShiftRecord[];
  sites: SecuritySiteRecord[];
  periodStart: Date;
  periodEnd: Date;
}

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 24;
const SITE_COLUMN = 148;
const MAX_DAYS_PER_PAGE = 31;
const MAX_SITES_PER_PAGE = 8;

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function dateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function time(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}

function daysBetween(start: Date, end: Date) {
  const days: Date[] = [];
  const cursor = new Date(start); cursor.setHours(12, 0, 0, 0);
  const last = new Date(end); last.setHours(12, 0, 0, 0);
  while (cursor <= last) { days.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }
  return days;
}

function chunks<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
}

function parseHex(value: string | null | undefined): RGB {
  const normalized = (value || '#0A84FF').replace('#', '');
  const hex = /^[0-9a-f]{6}$/i.test(normalized) ? normalized : '0A84FF';
  return rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
}

function mixWithWhite(color: RGB, amount = 0.82): RGB {
  return rgb(color.red + (1 - color.red) * amount, color.green + (1 - color.green) * amount, color.blue + (1 - color.blue) * amount);
}

function fitText(font: PDFFont, text: string, maxWidth: number, size: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && font.widthOfTextAtSize(`${value}…`, size) > maxWidth) value = value.slice(0, -1);
  return `${value}…`;
}

function drawFooter(page: PDFPage, regular: PDFFont, bold: PDFFont, organization: Organization, pageNumber: number, totalPagesHint: number) {
  const muted = rgb(0.39, 0.43, 0.48);
  page.drawLine({ start: { x: MARGIN, y: 26 }, end: { x: PAGE_WIDTH - MARGIN, y: 26 }, thickness: 0.5, color: rgb(0.83, 0.85, 0.88) });
  page.drawText(organization.public_name || organization.name, { x: MARGIN, y: 12, size: 6.8, font: bold, color: muted });
  const notice = 'Attention : ce planning est susceptible d’être modifié.';
  page.drawText(notice, { x: (PAGE_WIDTH - regular.widthOfTextAtSize(notice, 6.6)) / 2, y: 12, size: 6.6, font: regular, color: muted });
  const pagination = `${pageNumber}/${totalPagesHint}`;
  page.drawText(pagination, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(pagination, 6.8), y: 12, size: 6.8, font: regular, color: muted });
}

export async function generateSecurityAgentPlanningPdf({ organization, agent, shifts, sites, periodStart, periodEnd }: PlanningPdfInput) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.06, 0.09, 0.14);
  const muted = rgb(0.38, 0.42, 0.48);
  const line = rgb(0.76, 0.79, 0.83);
  const headerBg = rgb(0.08, 0.11, 0.16);
  const accent = parseHex(organization.primary_color);
  const logo = await embedSecurityLogo(pdf, organization.logo_url);

  const activeShifts = shifts.filter((shift) => shift.status !== 'canceled').sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const allDays = daysBetween(periodStart, periodEnd);
  const dayGroups = chunks(allDays, MAX_DAYS_PER_PAGE);

  const siteById = new Map(sites.map((site) => [site.id, site]));
  for (const shift of activeShifts) {
    if (!siteById.has(shift.site_id)) {
      siteById.set(shift.site_id, {
        id: shift.site_id, organization_id: organization.id, client_id: '', name: shift.security_sites?.name || 'Site', code: null,
        address: null, postal_code: null, city: shift.security_sites?.city || null, contact_name: null, contact_phone: null,
        hourly_rate_cents: shift.security_sites?.hourly_rate_cents || 0, color_hex: shift.security_sites?.color_hex || '#0A84FF', timezone: organization.timezone || 'Europe/Paris', notes: null, status: 'active', created_at: '', security_clients: shift.security_sites?.security_clients || null
      });
    }
  }
  const usedSiteIds = new Set(activeShifts.map((shift) => shift.site_id));
  const visibleSites = Array.from(siteById.values()).filter((site) => usedSiteIds.has(site.id));
  const siteGroups = chunks(visibleSites.length ? visibleSites : [{
    id: 'empty', organization_id: organization.id, client_id: '', name: 'Aucune mission', code: null, address: null, postal_code: null,
    city: null, contact_name: null, contact_phone: null, hourly_rate_cents: 0, color_hex: '#8E8E93', timezone: organization.timezone || 'Europe/Paris', notes: null,
    status: 'active' as const, created_at: ''
  }], MAX_SITES_PER_PAGE);

  const plannedPages = Math.max(1, dayGroups.length * siteGroups.length);
  let pageNumber = 0;

  for (const days of dayGroups) {
    for (const pageSites of siteGroups) {
      const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageNumber += 1;
      let y = PAGE_HEIGHT - 28;

      let headerX = MARGIN;
      if (logo) {
        const size = logoDimensions(logo, 82, 38);
        page.drawImage(logo, { x: MARGIN, y: y - size.height + 5, width: size.width, height: size.height });
        headerX = MARGIN + 94;
      }
      page.drawText('NCR SUITE · SÉCURITÉ PRIVÉE', { x: headerX, y, size: 7.5, font: bold, color: accent });
      page.drawText('PLANNING COLLABORATEUR', { x: headerX, y: y - 22, size: 17, font: bold, color: dark });
      page.drawText(securityPersonName(agent.first_name, agent.last_name).toUpperCase(), { x: headerX, y: y - 39, size: 9, font: bold, color: dark });
      const periodText = `Du ${formatSecurityDate(periodStart)} au ${formatSecurityDate(periodEnd)} · Édition du ${formatSecurityDate(new Date(), { dateStyle: 'short', timeStyle: 'short' })}`;
      page.drawText(periodText, { x: MARGIN, y: y - 53, size: 6.8, font: regular, color: muted });
      const company = organization.public_name || organization.name;
      page.drawText(fitText(bold, company, 280, 9), { x: PAGE_WIDTH - MARGIN - Math.min(280, bold.widthOfTextAtSize(company, 9)), y: y - 15, size: 9, font: bold, color: dark });
      if (organization.booking_contact_phone) page.drawText(`Tél. ${organization.booking_contact_phone}`, { x: PAGE_WIDTH - MARGIN - 180, y: y - 31, size: 6.8, font: regular, color: muted });
      if (organization.booking_contact_email) page.drawText(organization.booking_contact_email, { x: PAGE_WIDTH - MARGIN - 180, y: y - 43, size: 6.8, font: regular, color: muted });
      y -= 72;

      const tableWidth = PAGE_WIDTH - MARGIN * 2;
      const dayWidth = (tableWidth - SITE_COLUMN) / days.length;
      const headerHeight = 38;
      const rowHeight = pageSites.length <= 5 ? 46 : 40;
      const totalHeight = 25;

      page.drawRectangle({ x: MARGIN, y: y - headerHeight, width: tableWidth, height: headerHeight, color: headerBg });
      page.drawText('SITES', { x: MARGIN + 8, y: y - 23, size: 7.6, font: bold, color: rgb(1, 1, 1) });
      days.forEach((day, index) => {
        const x = MARGIN + SITE_COLUMN + index * dayWidth;
        page.drawLine({ start: { x, y }, end: { x, y: y - headerHeight }, thickness: 0.45, color: rgb(0.28, 0.31, 0.36) });
        const number = String(day.getDate()).padStart(2, '0');
        const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(day).replace('.', '').slice(0, 3).toUpperCase();
        page.drawText(number, { x: x + (dayWidth - bold.widthOfTextAtSize(number, 6.8)) / 2, y: y - 15, size: 6.8, font: bold, color: rgb(1, 1, 1) });
        page.drawText(weekday, { x: x + (dayWidth - regular.widthOfTextAtSize(weekday, 5.1)) / 2, y: y - 27, size: 5.1, font: regular, color: rgb(0.75, 0.78, 0.82) });
      });
      y -= headerHeight;

      pageSites.forEach((site, siteIndex) => {
        const siteColor = parseHex(site.color_hex);
        const fill = siteIndex % 2 === 0 ? rgb(0.985, 0.988, 0.993) : rgb(1, 1, 1);
        page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: tableWidth, height: rowHeight, color: fill, borderColor: line, borderWidth: 0.45 });
        page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: 5, height: rowHeight, color: siteColor });
        page.drawText(fitText(bold, site.name, SITE_COLUMN - 18, 7.2), { x: MARGIN + 10, y: y - 16, size: 7.2, font: bold, color: dark });
        const subtitle = site.security_clients?.company_name || site.city || site.code || 'Site client';
        page.drawText(fitText(regular, subtitle, SITE_COLUMN - 18, 5.7), { x: MARGIN + 10, y: y - 29, size: 5.7, font: regular, color: muted });

        days.forEach((day, dayIndex) => {
          const x = MARGIN + SITE_COLUMN + dayIndex * dayWidth;
          page.drawLine({ start: { x, y }, end: { x, y: y - rowHeight }, thickness: 0.35, color: line });
          const cellShifts = activeShifts.filter((shift) => shift.site_id === site.id && dateKey(shift.starts_at) === dateKey(day));
          if (cellShifts.length) {
            page.drawRectangle({ x: x + 1, y: y - rowHeight + 1, width: dayWidth - 2, height: rowHeight - 2, color: mixWithWhite(siteColor, 0.76) });
            cellShifts.slice(0, 2).forEach((shift, shiftIndex) => {
              const textSize = dayWidth < 19 ? 4.2 : 4.8;
              const lineY = y - 11 - shiftIndex * 20;
              const startText = time(shift.starts_at);
              const endText = time(shift.ends_at);
              page.drawText(startText, { x: x + (dayWidth - bold.widthOfTextAtSize(startText, textSize)) / 2, y: lineY, size: textSize, font: bold, color: dark });
              page.drawText(endText, { x: x + (dayWidth - regular.widthOfTextAtSize(endText, textSize)) / 2, y: lineY - 8, size: textSize, font: regular, color: dark });
            });
            if (cellShifts.length > 2) page.drawText(`+${cellShifts.length - 2}`, { x: x + 2, y: y - rowHeight + 4, size: 4.3, font: bold, color: dark });
          }
        });
        y -= rowHeight;
      });

      page.drawRectangle({ x: MARGIN, y: y - totalHeight, width: tableWidth, height: totalHeight, color: rgb(0.94, 0.95, 0.97), borderColor: line, borderWidth: 0.5 });
      page.drawText('TOTAL HEURES JOURNALIÈRES', { x: MARGIN + 8, y: y - 16, size: 6.1, font: bold, color: dark });
      days.forEach((day, index) => {
        const x = MARGIN + SITE_COLUMN + index * dayWidth;
        page.drawLine({ start: { x, y }, end: { x, y: y - totalHeight }, thickness: 0.35, color: line });
        const minutes = activeShifts.filter((shift) => dateKey(shift.starts_at) === dateKey(day)).reduce((sum, shift) => sum + securityShiftMinutes(shift), 0);
        if (minutes) {
          const value = (minutes / 60).toFixed(minutes % 60 ? 1 : 0);
          page.drawText(value, { x: x + (dayWidth - bold.widthOfTextAtSize(value, 5.2)) / 2, y: y - 16, size: 5.2, font: bold, color: dark });
        }
      });
      y -= totalHeight + 14;

      const pageShiftIds = new Set(pageSites.map((site) => site.id));
      const pageMinutes = activeShifts.filter((shift) => pageShiftIds.has(shift.site_id) && days.some((day) => dateKey(day) === dateKey(shift.starts_at))).reduce((sum, shift) => sum + securityShiftMinutes(shift), 0);
      page.drawText(`Heures affichées : ${formatSecurityDuration(pageMinutes)}`, { x: MARGIN, y, size: 7.5, font: bold, color: accent });
      const agentLine = [agent.employee_number && `Matricule ${agent.employee_number}`, agent.phone, agent.email].filter(Boolean).join(' · ');
      if (agentLine) page.drawText(fitText(regular, agentLine, tableWidth - 250, 6.5), { x: MARGIN + 150, y, size: 6.5, font: regular, color: muted });
      y -= 18;

      if (pageNumber === plannedPages) {
        const weeks = new Map<string, number>();
        activeShifts.forEach((shift) => {
          const date = new Date(shift.starts_at);
          const thursday = new Date(date); thursday.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
          const firstThursday = new Date(thursday.getFullYear(), 0, 4);
          const week = 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
          const key = `S${String(week).padStart(2, '0')}`;
          weeks.set(key, (weeks.get(key) || 0) + securityShiftMinutes(shift));
        });
        const totalMinutes = activeShifts.reduce((sum, shift) => sum + securityShiftMinutes(shift), 0);
        const summary = `TOTAL PÉRIODE : ${formatSecurityDuration(totalMinutes)} · ${activeShifts.length} mission(s)`;
        page.drawText(summary, { x: MARGIN, y, size: 8.2, font: bold, color: dark });
        const weekly = Array.from(weeks.entries()).map(([key, minutes]) => `${key} : ${(minutes / 60).toFixed(minutes % 60 ? 1 : 0)} h`).join('   ');
        if (weekly) page.drawText(fitText(regular, weekly, tableWidth, 6.5), { x: MARGIN, y: y - 15, size: 6.5, font: regular, color: muted });

        const detailTop = y - 42;
        if (detailTop > 72) {
          page.drawText('DÉTAILS DES SITES', { x: MARGIN, y: detailTop, size: 7.2, font: bold, color: dark });
          const detailSites = visibleSites.slice(0, 8);
          const detailColumnWidth = 248;
          detailSites.forEach((site, index) => {
            const column = index % 2;
            const row = Math.floor(index / 2);
            const x = MARGIN + column * (detailColumnWidth + 12);
            const rowY = detailTop - 17 - row * 27;
            const siteColor = parseHex(site.color_hex);
            page.drawRectangle({ x, y: rowY - 13, width: 4, height: 18, color: siteColor });
            page.drawText(fitText(bold, site.name, detailColumnWidth - 12, 6.7), { x: x + 9, y: rowY, size: 6.7, font: bold, color: dark });
            const address = [site.address, site.postal_code, site.city].filter(Boolean).join(' · ') || site.security_clients?.company_name || 'Site client';
            page.drawText(fitText(regular, address, detailColumnWidth - 12, 5.7), { x: x + 9, y: rowY - 11, size: 5.7, font: regular, color: muted });
          });

          const summaryX = MARGIN + 535;
          page.drawText('SYNTHÈSE', { x: summaryX, y: detailTop, size: 7.2, font: bold, color: dark });
          const summaryItems = [
            ['Heures programmées', formatSecurityDuration(totalMinutes)],
            ['Nombre de missions', String(activeShifts.length)],
            ['Sites concernés', String(visibleSites.length)],
            ['Semaines couvertes', String(weeks.size)]
          ];
          summaryItems.forEach(([label, value], index) => {
            const rowY = detailTop - 18 - index * 20;
            page.drawText(label, { x: summaryX, y: rowY, size: 5.9, font: regular, color: muted });
            page.drawText(value, { x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(value, 6.5), y: rowY, size: 6.5, font: bold, color: dark });
            page.drawLine({ start: { x: summaryX, y: rowY - 5 }, end: { x: PAGE_WIDTH - MARGIN, y: rowY - 5 }, thickness: 0.35, color: line });
          });
        }
      }

      drawFooter(page, regular, bold, organization, pageNumber, plannedPages);
    }
  }

  pdf.setTitle(`Planning ${securityPersonName(agent.first_name, agent.last_name)}`);
  pdf.setAuthor(organization.public_name || organization.name);
  pdf.setSubject('Planning collaborateur Sécurité privée');
  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' });
  return { blob, filename: `planning-${safeName(securityPersonName(agent.first_name, agent.last_name))}-${dateKey(periodStart)}-${dateKey(periodEnd)}.pdf` };
}
