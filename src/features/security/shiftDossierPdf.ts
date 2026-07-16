import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Organization } from '../../types';
import { embedSecurityLogo, logoDimensions, securityAccent } from './pdfBranding';
import {
  formatSecurityDate,
  formatSecurityDateTime,
  formatSecurityDuration,
  formatSecurityMoney,
  securityPersonName,
  securityShiftMinutes,
  type SecurityEmergencyAlertRecord,
  type SecurityLogbookEntryRecord,
  type SecurityPatrolRecord,
  type SecurityPtiSessionRecord,
  type SecurityShiftDossierReadiness,
  type SecurityShiftRecord
} from './types';

export interface SecurityDossierPosition {
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  recorded_at: string;
}

export interface SecurityDossierInvoice {
  invoice_number: string;
  status: string;
  line_total_cents: number;
}

export interface SecurityShiftDossierData {
  shift: SecurityShiftRecord;
  readiness: SecurityShiftDossierReadiness;
  logbook: SecurityLogbookEntryRecord[];
  patrols: SecurityPatrolRecord[];
  ptiSessions: SecurityPtiSessionRecord[];
  emergencies: SecurityEmergencyAlertRecord[];
  positions: SecurityDossierPosition[];
  invoice: SecurityDossierInvoice | null;
}

const categoryLabels: Record<SecurityLogbookEntryRecord['category'], string> = {
  prise_poste: 'Prise de poste',
  fin_poste: 'Fin de poste',
  ronde: 'Ronde',
  anomalie: 'Anomalie',
  incident: 'Incident',
  visiteur: 'Visiteur / accès',
  livraison: 'Livraison',
  appel: 'Appel',
  consigne: 'Consigne',
  autre: 'Autre'
};

function clean(value: string | null | undefined) {
  return (value || '-')
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = clean(text).split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['-'];
}

function time(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export async function generateSecurityShiftDossierPdf(organization: Organization, data: SecurityShiftDossierData) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 40;
  const width = pageSize[0] - margin * 2;
  const accent = securityAccent(organization);
  const dark = rgb(0.07, 0.09, 0.13);
  const muted = rgb(0.4, 0.44, 0.5);
  const line = rgb(0.86, 0.89, 0.93);
  const soft = rgb(0.96, 0.97, 0.985);
  const success = rgb(0.08, 0.55, 0.29);
  const warning = rgb(0.88, 0.47, 0.03);
  const danger = rgb(0.79, 0.09, 0.12);
  const logo = await embedSecurityLogo(pdf, organization.logo_url);
  const { shift, readiness } = data;
  const site = shift.security_sites?.name || 'Site';
  const client = shift.security_sites?.security_clients?.company_name || 'Client';
  const agent = shift.security_agents ? securityPersonName(shift.security_agents.first_name, shift.security_agents.last_name) : 'Agent';
  const address = [shift.security_sites?.address, shift.security_sites?.postal_code, shift.security_sites?.city].filter(Boolean).join(' ');
  const ref = shift.id.slice(0, 8).toUpperCase();

  let page!: PDFPage;
  let y = 0;
  let pageNumber = 0;

  const addPage = (section?: string) => {
    page = pdf.addPage(pageSize);
    pageNumber += 1;
    y = pageSize[1] - 42;
    let x = margin;
    if (logo) {
      const size = logoDimensions(logo, 76, 32);
      page.drawImage(logo, { x: margin, y: y - size.height + 5, width: size.width, height: size.height });
      x += 88;
    }
    page.drawText('NCR SUITE - SECURITE PRIVEE', { x, y, size: 8, font: bold, color: accent });
    page.drawText(`Page ${pageNumber}`, { x: pageSize[0] - margin - 38, y, size: 7.2, font: regular, color: muted });
    y -= 26;
    page.drawText(section || 'DOSSIER COMPLET DE VACATION', { x, y, size: section ? 17 : 21, font: bold, color: dark });
    y -= 18;
    page.drawText(clean(organization.public_name || organization.name), { x, y, size: 9.5, font: bold, color: dark });
    page.drawText(`Réf. ${ref}`, { x: pageSize[0] - margin - 72, y, size: 8, font: regular, color: muted });
    y -= 14;
    page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 0.8, color: line });
    y -= 18;
  };

  const ensure = (height: number, section?: string) => {
    if (y - height < 55) addPage(section);
  };

  const sectionTitle = (title: string) => {
    ensure(85, title);
    page.drawText(title.toUpperCase(), { x: margin, y, size: 8, font: bold, color: accent });
    y -= 18;
  };

  const infoBox = (items: Array<[string, string]>) => {
    const half = (width - 14) / 2;
    const rows = Math.ceil(items.length / 2);
    const height = 24 + rows * 34;
    ensure(height);
    page.drawRectangle({ x: margin, y: y - height, width, height, color: soft, borderColor: line, borderWidth: 0.7 });
    items.forEach(([label, value], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = margin + 14 + column * (half + 14);
      const top = y - 20 - row * 34;
      page.drawText(label.toUpperCase(), { x, y: top, size: 6.4, font: bold, color: muted });
      const lines = wrap(value, regular, 8.4, half - 20).slice(0, 2);
      lines.forEach((txt, i) => page.drawText(txt, { x, y: top - 11 - i * 9, size: 8.4, font: regular, color: dark }));
    });
    y -= height + 16;
  };

  addPage();
  infoBox([
    ['Site', site], ['Client', client],
    ['Adresse', address || '-'], ['Agent', agent],
    ['Vacation', `${formatSecurityDate(shift.starts_at)} · ${time(shift.starts_at)} - ${time(shift.ends_at)}`],
    ['Durée', `${formatSecurityDuration(shift.actual_minutes ?? securityShiftMinutes(shift))} réalisée`],
    ['État du dossier', shift.dossier_status === 'archived' ? 'Archivé' : shift.dossier_status === 'closed' ? 'Clôturé' : readiness.ready ? 'Prêt à clôturer' : 'À compléter'],
    ['Facturation', data.invoice ? `${data.invoice.invoice_number} · ${formatSecurityMoney(data.invoice.line_total_cents)}` : 'Non facturée']
  ]);

  const cards = [
    ['MAIN COURANTE', String(data.logbook.length), accent],
    ['RONDES', String(data.patrols.filter((p) => p.status === 'completed').length), success],
    ['ALERTES', String(data.emergencies.length), data.emergencies.some((e) => e.status !== 'resolved') ? danger : warning],
    ['POSITIONS GPS', String(data.positions.length), accent]
  ] as const;
  const cardWidth = (width - 18) / 4;
  cards.forEach(([label, value, color], index) => {
    const x = margin + index * (cardWidth + 6);
    page.drawRectangle({ x, y: y - 48, width: cardWidth, height: 48, color: soft, borderColor: line, borderWidth: 0.6 });
    page.drawText(label, { x: x + 8, y: y - 15, size: 5.8, font: bold, color: muted });
    page.drawText(value, { x: x + 8, y: y - 36, size: 15, font: bold, color });
  });
  y -= 66;

  sectionTitle('Contrôle de clôture');
  const checkRows: Array<[string, boolean]> = [
    ['Vacation marquée comme réalisée', shift.status === 'completed'],
    ['Durée réelle validée', (shift.actual_minutes ?? 0) > 0],
    ['Prise de poste enregistrée', readiness.has_start || !readiness.logbook_count],
    ['Fin de poste enregistrée', readiness.has_end || !readiness.logbook_count],
    ['Ronde complète', readiness.patrol_points === 0 || readiness.completed_patrols > 0],
    ['PTI clôturé', readiness.active_pti === 0],
    ['SOS / alertes résolus', readiness.open_emergencies === 0],
    ['Mode vacation arrêté', readiness.active_presence === 0]
  ];
  checkRows.forEach(([label, ok]) => {
    ensure(22, 'Contrôle de clôture');
    page.drawCircle({ x: margin + 7, y: y + 2, size: 5, color: ok ? success : danger });
    page.drawText(ok ? 'OK' : 'À TRAITER', { x: margin + 18, y: y - 1, size: 7, font: bold, color: ok ? success : danger });
    page.drawText(clean(label), { x: margin + 76, y: y - 1, size: 8.5, font: regular, color: dark });
    y -= 19;
  });
  if (readiness.reasons.length) {
    y -= 4;
    readiness.reasons.forEach((reason) => {
      const lines = wrap(reason, regular, 8, width - 26);
      ensure(18 + lines.length * 9, 'Points bloquants');
      page.drawRectangle({ x: margin, y: y - 11 - lines.length * 9, width, height: 17 + lines.length * 9, color: rgb(1, 0.965, 0.93), borderColor: warning, borderWidth: 0.5 });
      lines.forEach((txt, i) => page.drawText(txt, { x: margin + 12, y: y - 12 - i * 9, size: 8, font: regular, color: dark }));
      y -= 23 + lines.length * 9;
    });
  }

  sectionTitle('Main courante de la vacation');
  if (!data.logbook.length) {
    page.drawText('Aucun événement saisi.', { x: margin, y, size: 8.5, font: regular, color: muted });
    y -= 18;
  } else {
    [...data.logbook].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)).forEach((entry) => {
      const title = `${time(entry.occurred_at)} · ${categoryLabels[entry.category]} · ${entry.title}`;
      const detailLines = wrap(entry.details || '-', regular, 7.8, width - 22).slice(0, 5);
      const height = 31 + detailLines.length * 9;
      ensure(height + 8, 'Main courante');
      const color = entry.severity === 'urgent' ? danger : entry.severity === 'attention' ? warning : accent;
      page.drawRectangle({ x: margin, y: y - height, width, height, borderColor: line, borderWidth: 0.6 });
      page.drawRectangle({ x: margin, y: y - height, width: 4, height, color });
      page.drawText(clean(title).slice(0, 95), { x: margin + 12, y: y - 16, size: 8.4, font: bold, color: dark });
      detailLines.forEach((txt, i) => page.drawText(txt, { x: margin + 12, y: y - 29 - i * 9, size: 7.8, font: regular, color: muted }));
      y -= height + 7;
    });
  }

  sectionTitle('Rondes QR');
  if (!data.patrols.length) {
    page.drawText('Aucune ronde rattachée à cette vacation.', { x: margin, y, size: 8.5, font: regular, color: muted });
    y -= 18;
  } else {
    data.patrols.forEach((patrol) => {
      const scans = patrol.security_patrol_scans || [];
      const detail = scans.map((scan) => `${scan.security_patrol_points?.sequence_number ?? '-'} · ${scan.security_patrol_points?.label || 'Point'} · ${time(scan.scanned_at)}`);
      const height = 38 + Math.max(1, detail.length) * 10;
      ensure(height + 8, 'Rondes QR');
      page.drawRectangle({ x: margin, y: y - height, width, height, color: soft, borderColor: line, borderWidth: 0.6 });
      page.drawText(`${formatSecurityDateTime(patrol.started_at)} · ${patrol.status === 'completed' ? 'Terminée' : patrol.status === 'abandoned' ? 'Abandonnée' : 'En cours'}`, { x: margin + 12, y: y - 16, size: 8.4, font: bold, color: patrol.status === 'completed' ? success : warning });
      (detail.length ? detail : ['Aucun point scanné.']).forEach((txt, i) => page.drawText(clean(txt), { x: margin + 12, y: y - 31 - i * 10, size: 7.7, font: regular, color: dark }));
      y -= height + 7;
    });
  }

  sectionTitle('PTI, SOS et présence terrain');
  const ptiStatus = (value: SecurityPtiSessionRecord['status']) => value === 'closed' ? 'CLÔTURÉ' : value === 'alerted' ? 'EN ALERTE' : 'ACTIF';
  const emergencyStatus = (value: SecurityEmergencyAlertRecord['status']) => value === 'resolved' ? 'RÉSOLU' : value === 'acknowledged' ? 'PRIS EN CHARGE' : 'OUVERT';
  const ptiLines = data.ptiSessions.map((row) => `PTI ${ptiStatus(row.status)} · activé ${formatSecurityDateTime(row.activated_at)} · dernière confirmation ${formatSecurityDateTime(row.last_check_in_at)}`);
  const emergencyLines = data.emergencies.map((row) => `${row.alert_type === 'sos' ? 'SOS' : 'DÉPASSEMENT PTI'} · ${emergencyStatus(row.status)} · ${formatSecurityDateTime(row.triggered_at)}${row.resolution_notes ? ` · ${row.resolution_notes}` : ''}`);
  const operationalLines = [...ptiLines, ...emergencyLines];
  if (!operationalLines.length) operationalLines.push('Aucune session PTI ni alerte SOS enregistrée pour cette vacation.');
  operationalLines.forEach((txt) => {
    const lines = wrap(txt, regular, 8, width - 20);
    ensure(14 + lines.length * 9, 'PTI, SOS et présence terrain');
    page.drawCircle({ x: margin + 5, y: y + 2, size: 3, color: accent });
    lines.forEach((lineText, i) => page.drawText(lineText, { x: margin + 15, y: y - i * 9, size: 8, font: regular, color: dark }));
    y -= 8 + lines.length * 9;
  });

  sectionTitle('Géolocalisation');
  if (!data.positions.length) {
    page.drawText('Aucune position GPS enregistrée.', { x: margin, y, size: 8.5, font: regular, color: muted });
    y -= 18;
  } else {
    const ordered = [...data.positions].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    infoBox([
      ['Première position', `${formatSecurityDateTime(first.recorded_at)} · ${first.latitude.toFixed(5)}, ${first.longitude.toFixed(5)}`],
      ['Dernière position', `${formatSecurityDateTime(last.recorded_at)} · ${last.latitude.toFixed(5)}, ${last.longitude.toFixed(5)}`],
      ['Nombre de points', String(ordered.length)],
      ['Précision finale', last.accuracy_m == null ? '-' : `${Math.round(last.accuracy_m)} m`]
    ]);
  }

  sectionTitle('Facturation et archivage');
  infoBox([
    ['Facture', data.invoice?.invoice_number || 'Aucune facture définitive'],
    ['Montant', data.invoice ? formatSecurityMoney(data.invoice.line_total_cents) : '-'],
    ['Statut du dossier', shift.dossier_status === 'archived' ? 'Archivé' : shift.dossier_status === 'closed' ? 'Clôturé' : 'Ouvert'],
    ['Clôture', shift.dossier_closed_at ? formatSecurityDateTime(shift.dossier_closed_at) : '-'],
    ['Archivage', shift.dossier_archived_at ? formatSecurityDateTime(shift.dossier_archived_at) : '-'],
    ['Note', shift.dossier_note || '-']
  ]);

  for (const current of pdf.getPages()) {
    current.drawText('Document généré avec NCR Suite', { x: margin, y: 29, size: 7, font: bold, color: accent });
    current.drawText(`${site} · ${agent}`, { x: pageSize[0] - margin - 165, y: 29, size: 7, font: regular, color: muted });
  }

  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' });
  const date = new Date(shift.starts_at);
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { blob, filename: `dossier-vacation-${safeName(site)}-${dateKey}-${safeName(agent)}.pdf` };
}
