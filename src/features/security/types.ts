export interface SecurityClientRecord {
  id: string;
  organization_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  postal_code: string | null;
  city: string | null;
  siret: string | null;
  vat_number: string | null;
  payment_terms_days: number;
  notes: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
}

export interface SecuritySiteRecord {
  id: string;
  organization_id: string;
  client_id: string;
  name: string;
  code: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  hourly_rate_cents: number;
  timezone: string;
  notes: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  security_clients?: { company_name: string } | null;
}

export interface SecurityAgentRecord {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  employee_number: string | null;
  email: string | null;
  phone: string | null;
  contract_type: 'cdi' | 'cdd' | 'interim' | 'sous_traitant' | 'autre';
  weekly_hours: number;
  notes: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
}

export interface SecurityShiftRecord {
  id: string;
  organization_id: string;
  site_id: string;
  agent_id: string;
  title: string | null;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  status: 'planned' | 'completed' | 'canceled';
  notes: string | null;
  created_at: string;
  security_sites?: { name: string; hourly_rate_cents: number; city: string | null; security_clients?: { company_name: string } | null } | null;
  security_agents?: { first_name: string; last_name: string } | null;
}

export interface SecurityInvoiceLineRecord {
  id: string;
  organization_id: string;
  invoice_id: string;
  site_id: string;
  description: string;
  scheduled_minutes: number;
  hourly_rate_cents: number;
  line_total_cents: number;
  security_sites?: { name: string } | null;
}

export interface SecurityInvoiceRecord {
  id: string;
  organization_id: string;
  client_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'issued' | 'paid' | 'canceled';
  subtotal_cents: number;
  total_cents: number;
  notes: string | null;
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
  security_clients?: SecurityClientRecord | null;
  security_invoice_lines?: SecurityInvoiceLineRecord[];
}

export function nullableSecurityText(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

export function securityPersonName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

export function formatSecurityMoney(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100).replace(/[\u00a0\u202f]/g, ' ');
}

export function formatSecurityDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('fr-FR', options ?? { dateStyle: 'medium' }).format(date);
}

export function formatSecurityDateTime(value: string | Date) {
  return formatSecurityDate(value, { dateStyle: 'medium', timeStyle: 'short' });
}

export function securityShiftMinutes(shift: Pick<SecurityShiftRecord, 'starts_at' | 'ends_at' | 'break_minutes'>) {
  return Math.max(0, Math.round((new Date(shift.ends_at).getTime() - new Date(shift.starts_at).getTime()) / 60000) - shift.break_minutes);
}

export function formatSecurityDuration(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (!rest) return `${hours} h`;
  if (!hours) return `${rest} min`;
  return `${hours} h ${String(rest).padStart(2, '0')}`;
}

export function toLocalDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function monthRange(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  const toDate = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  return { start: toDate(start), end: toDate(end) };
}
