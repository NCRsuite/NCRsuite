export interface BeautyCompanyDataExport {
  schema_version: number;
  generated_at: string;
  organization_id: string;
  company: Record<string, unknown>;
  clients: Array<Record<string, unknown>>;
  appointments: Array<Record<string, unknown>>;
  appointment_service_items: Array<Record<string, unknown>>;
  services: Array<Record<string, unknown>>;
  staff_reference: Array<Record<string, unknown>>;
  consents: Array<Record<string, unknown>>;
  client_profiles: Array<Record<string, unknown>>;
  client_notes: Array<Record<string, unknown>>;
  questionnaires: Array<Record<string, unknown>>;
  media_manifest: Array<Record<string, unknown>>;
  documents_manifest: Array<Record<string, unknown>>;
  waitlist: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
  loyalty_ledger: Array<Record<string, unknown>>;
  loyalty_rewards: Array<Record<string, unknown>>;
  referral_codes: Array<Record<string, unknown>>;
  referrals: Array<Record<string, unknown>>;
  portal_accounts: Array<Record<string, unknown>>;
  portal_invitations: Array<Record<string, unknown>>;
  import_references: Array<Record<string, unknown>>;
}

export interface BeautyClientDataExport {
  schema_version: number;
  generated_at: string;
  purpose: string;
  company: Record<string, unknown>;
  client: Record<string, unknown>;
  appointments: Array<Record<string, unknown>>;
  profile: Record<string, unknown> | null;
  notes: Array<Record<string, unknown>>;
  questionnaires: Array<Record<string, unknown>>;
  consents: Array<Record<string, unknown>>;
  media: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  waitlist: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
  loyalty_ledger: Array<Record<string, unknown>>;
  loyalty_rewards: Array<Record<string, unknown>>;
  referral_code: Record<string, unknown> | null;
  referrals: Array<Record<string, unknown>>;
  portal_accounts: Array<Record<string, unknown>>;
  portal_invitations: Array<Record<string, unknown>>;
}

export type BeautyCsvDatasetKey =
  | 'clients'
  | 'appointments'
  | 'services'
  | 'consents'
  | 'loyalty';

export interface BeautyCsvDataset {
  key: BeautyCsvDatasetKey;
  label: string;
  filenameSuffix: string;
  rows: Array<Record<string, unknown>>;
}

function cleanFilePart(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'export';
}

function dateStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function csvValue(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function collectColumns(rows: Array<Record<string, unknown>>) {
  const columns: string[] = [];
  const seen = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    });
  });
  return columns;
}

export function makeJsonExport(
  payload: unknown,
  baseName: string
) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8'
  });
  return {
    blob,
    filename: `${cleanFilePart(baseName)}-${dateStamp()}.json`
  };
}

export function makeCsvExport(
  rows: Array<Record<string, unknown>>,
  baseName: string
) {
  const columns = collectColumns(rows);
  const body = rows.length === 0
    ? ''
    : [
        columns.map(csvValue).join(';'),
        ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(';'))
      ].join('\r\n');
  const blob = new Blob(['\ufeff', body], {
    type: 'text/csv;charset=utf-8'
  });
  return {
    blob,
    filename: `${cleanFilePart(baseName)}-${dateStamp()}.csv`
  };
}

export function companyCsvDatasets(
  payload: BeautyCompanyDataExport
): BeautyCsvDataset[] {
  const serviceRows = [...payload.appointment_service_items];
  const appointmentsWithItems = new Set(
    payload.appointment_service_items
      .map((row) => String(row.appointment_id ?? ''))
      .filter(Boolean)
  );
  const servicesById = new Map(
    payload.services.map((row) => [String(row.id ?? ''), row])
  );

  payload.appointments.forEach((appointment) => {
    const appointmentId = String(appointment.id ?? '');
    if (!appointmentId || appointmentsWithItems.has(appointmentId)) return;
    const service = servicesById.get(String(appointment.service_id ?? '')) ?? {};
    serviceRows.push({
      appointment_id: appointmentId,
      service_id: appointment.service_id ?? null,
      service_name: service.name ?? 'Prestation',
      duration_minutes: service.duration_minutes ?? null,
      price_cents: appointment.amount_cents ?? service.price_cents ?? null,
      position: 0,
      legacy_fallback: true
    });
  });

  const loyaltyRows = [
    ...payload.loyalty_ledger.map((row) => ({ record_type: 'ledger', ...row })),
    ...payload.loyalty_rewards.map((row) => ({ record_type: 'reward', ...row }))
  ];

  return [
    {
      key: 'clients',
      label: 'Clients',
      filenameSuffix: 'clients',
      rows: payload.clients
    },
    {
      key: 'appointments',
      label: 'Rendez-vous',
      filenameSuffix: 'rendez-vous',
      rows: payload.appointments
    },
    {
      key: 'services',
      label: 'Prestations réalisées',
      filenameSuffix: 'prestations',
      rows: serviceRows
    },
    {
      key: 'consents',
      label: 'Consentements',
      filenameSuffix: 'consentements',
      rows: payload.consents
    },
    {
      key: 'loyalty',
      label: 'Fidélité',
      filenameSuffix: 'fidelite',
      rows: loyaltyRows
    }
  ];
}

export function companyExportBaseName(
  companyName: string,
  suffix: string
) {
  return `ncr-beauty-${cleanFilePart(companyName)}-${suffix}`;
}

export function clientExportBaseName(
  clientName: string
) {
  return `portabilite-rgpd-${cleanFilePart(clientName)}`;
}
