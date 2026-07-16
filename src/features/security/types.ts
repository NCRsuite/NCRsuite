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
  color_hex?: string | null;
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
  linked_user_id?: string | null;
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
  recurrence_group_id?: string | null;
  duplicated_from_id?: string | null;
  actual_minutes?: number | null;
  actual_validation_note?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  final_invoice_id?: string | null;
  dossier_status?: 'open' | 'closed' | 'archived';
  dossier_closed_at?: string | null;
  dossier_closed_by?: string | null;
  dossier_archived_at?: string | null;
  dossier_archived_by?: string | null;
  dossier_reopened_at?: string | null;
  dossier_reopened_by?: string | null;
  dossier_note?: string | null;
  created_at: string;
  security_sites?: { name: string; hourly_rate_cents: number; color_hex?: string | null; address?: string | null; postal_code?: string | null; city: string | null; security_clients?: { company_name: string } | null } | null;
  security_agents?: { first_name: string; last_name: string } | null;
}

export interface SecurityInvoiceLineRecord {
  id: string;
  organization_id: string;
  invoice_id: string;
  site_id: string;
  description: string;
  scheduled_minutes: number;
  billed_minutes?: number | null;
  shift_count?: number;
  hourly_rate_cents: number;
  line_total_cents: number;
  security_sites?: { name: string } | null;
}

export interface SecurityInvoiceShiftItemRecord {
  id: string;
  organization_id: string;
  invoice_id: string;
  shift_id: string;
  site_id: string;
  agent_id: string;
  service_date: string;
  starts_at: string;
  ends_at: string;
  actual_minutes: number;
  hourly_rate_cents: number;
  line_total_cents: number;
  description: string | null;
  security_sites?: { name: string } | null;
  security_agents?: { first_name: string; last_name: string } | null;
}

export interface SecurityBillingSnapshot {
  name?: string | null;
  logo_url?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  siret?: string | null;
  vat_number?: string | null;
  email?: string | null;
  phone?: string | null;
  late_penalty_text?: string | null;
  tax_exemption_text?: string | null;
  bank_account_holder?: string | null;
  bank_name?: string | null;
  bank_iban?: string | null;
  bank_bic?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  billing_address?: string | null;
  payment_terms_days?: number | null;
}

export interface SecurityInvoiceRecord {
  id: string;
  organization_id: string;
  client_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  document_kind?: 'proforma' | 'invoice';
  source_mode?: 'scheduled' | 'completed';
  status: 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'canceled';
  subtotal_cents: number;
  tax_rate_basis_points?: number;
  tax_cents?: number;
  total_cents: number;
  notes: string | null;
  issued_at: string | null;
  sent_at?: string | null;
  paid_at: string | null;
  canceled_at?: string | null;
  due_date?: string | null;
  issuer_snapshot?: SecurityBillingSnapshot | null;
  client_snapshot?: SecurityBillingSnapshot | null;
  created_at: string;
  security_clients?: SecurityClientRecord | null;
  security_invoice_lines?: SecurityInvoiceLineRecord[];
  security_invoice_shift_items?: SecurityInvoiceShiftItemRecord[];
}

export type SecurityQuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused' | 'expired' | 'canceled';

export interface SecurityQuoteLineRecord {
  id: string;
  organization_id: string;
  quote_id: string;
  position: number;
  label: string;
  description: string | null;
  quantity: number;
  unit: 'heure' | 'jour' | 'vacation' | 'forfait' | 'unite';
  unit_price_cents: number;
  line_total_cents: number;
  created_at: string;
}

export interface SecurityQuoteRecord {
  id: string;
  organization_id: string;
  quote_number: string;
  status: SecurityQuoteStatus;
  prospect_company_name: string;
  prospect_contact_name: string | null;
  prospect_email: string | null;
  prospect_phone: string | null;
  prospect_billing_address: string | null;
  prospect_postal_code: string | null;
  prospect_city: string | null;
  prospect_siret: string | null;
  prospect_vat_number: string | null;
  proposed_site_name: string | null;
  proposed_site_address: string | null;
  proposed_hourly_rate_cents: number | null;
  valid_until: string;
  notes: string | null;
  subtotal_cents: number;
  tax_rate_basis_points: number;
  tax_cents: number;
  total_cents: number;
  issuer_snapshot: SecurityBillingSnapshot;
  prospect_snapshot: SecurityBillingSnapshot;
  sent_at: string | null;
  accepted_at: string | null;
  refused_at: string | null;
  canceled_at: string | null;
  converted_client_id: string | null;
  converted_site_id: string | null;
  created_at: string;
  updated_at: string;
  security_quote_lines?: SecurityQuoteLineRecord[];
}

export interface SecurityDocumentEmailLogRecord {
  id: string;
  organization_id: string;
  document_kind: 'invoice' | 'quote';
  document_id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  message: string | null;
  status: 'sending' | 'sent' | 'failed';
  provider_message_id: string | null;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
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


export interface SecurityAgentAccessRecord {
  agent_id: string;
  full_name: string;
  email: string | null;
  linked_user_id: string | null;
  access_status: 'active' | 'disabled' | 'pending' | 'expired' | 'none';
  invitation_id: string | null;
  invitation_status: string | null;
  invitation_expires_at: string | null;
}

export interface SecurityInstructionRecord {
  id: string;
  organization_id: string;
  site_id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'critical';
  active_from: string | null;
  active_until: string | null;
  status: 'active' | 'archived';
  created_at: string;
  security_sites?: { name: string } | null;
}

export interface SecurityAlertRecord {
  id: string;
  organization_id: string;
  site_id: string;
  agent_id: string | null;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'resolved';
  resolved_at: string | null;
  created_at: string;
  security_sites?: { name: string } | null;
  security_agents?: { first_name: string; last_name: string } | null;
  acknowledged?: boolean;
}

export interface SecurityLogbookEntryRecord {
  id: string;
  organization_id: string;
  site_id: string;
  agent_id: string;
  shift_id: string | null;
  occurred_at: string;
  category: 'prise_poste' | 'fin_poste' | 'ronde' | 'anomalie' | 'incident' | 'visiteur' | 'livraison' | 'appel' | 'consigne' | 'autre';
  severity: 'info' | 'attention' | 'urgent';
  title: string;
  details: string | null;
  status: 'open' | 'processed' | 'archived';
  created_at: string;
  security_sites?: { name: string; color_hex?: string | null } | null;
  security_agents?: { first_name: string; last_name: string } | null;
  security_shifts?: { id: string; starts_at: string; ends_at: string; status: SecurityShiftRecord['status']; title: string | null } | null;
}

export interface SecurityPatrolPointRecord {
  id: string;
  organization_id: string;
  site_id: string;
  label: string;
  qr_code: string;
  sequence_number: number;
  instructions: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  security_sites?: { name: string } | null;
}

export interface SecurityPatrolScanRecord {
  id: string;
  organization_id: string;
  patrol_id: string;
  point_id: string;
  scanned_at: string;
  status: 'valid' | 'unexpected';
  created_at?: string;
  security_patrol_points?: { label: string; sequence_number?: number } | null;
}

export interface SecurityPatrolRecord {
  id: string;
  organization_id: string;
  site_id: string;
  agent_id: string;
  shift_id?: string | null;
  started_at: string;
  completed_at: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  notes: string | null;
  created_at: string;
  security_sites?: { name: string } | null;
  security_agents?: { first_name: string; last_name: string } | null;
  security_patrol_scans?: SecurityPatrolScanRecord[];
}

export function securityPriorityLabel(value: SecurityInstructionRecord['priority']) {
  return value === 'critical' ? 'Critique' : value === 'important' ? 'Importante' : 'Normale';
}

export interface SecurityAgentPositionRecord {
  id: string;
  organization_id: string;
  agent_id: string;
  shift_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  recorded_at: string;
  created_at: string;
  security_agents?: { first_name: string; last_name: string; phone?: string | null } | null;
  security_shifts?: { starts_at: string; ends_at: string; title: string | null; security_sites?: { name: string; address?: string | null; city?: string | null } | null } | null;
}

export interface SecurityPtiSessionRecord {
  id: string;
  organization_id: string;
  agent_id: string;
  shift_id: string;
  status: 'active' | 'alerted' | 'closed';
  check_interval_minutes: number;
  activated_at: string;
  last_check_in_at: string;
  next_check_due_at: string;
  triggered_at: string | null;
  trigger_reason: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  security_agents?: { first_name: string; last_name: string; phone?: string | null } | null;
  security_shifts?: { starts_at: string; ends_at: string; title: string | null; security_sites?: { name: string; address?: string | null; city?: string | null } | null } | null;
}

export interface SecurityEmergencyAlertRecord {
  id: string;
  organization_id: string;
  agent_id: string;
  shift_id: string;
  pti_session_id: string | null;
  alert_type: 'sos' | 'pti_timeout';
  status: 'open' | 'acknowledged' | 'resolved';
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  message: string | null;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  security_agents?: { first_name: string; last_name: string; phone?: string | null } | null;
  security_shifts?: { starts_at: string; ends_at: string; title: string | null; security_sites?: { name: string; address?: string | null; city?: string | null } | null } | null;
}

export interface SecurityAgentPresenceRecord {
  id: string;
  organization_id: string;
  agent_id: string;
  shift_id: string;
  status: 'active' | 'paused' | 'stopped';
  network_status: 'online' | 'offline';
  app_state: 'visible' | 'hidden';
  tracking_active: boolean;
  wake_lock_active: boolean;
  started_at: string;
  last_seen_at: string;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
  security_agents?: { first_name: string; last_name: string; phone?: string | null } | null;
  security_shifts?: { starts_at: string; ends_at: string; title: string | null; security_sites?: { name: string; address?: string | null; city?: string | null } | null } | null;
}


export interface SecurityShiftDossierReadiness {
  ready: boolean;
  reasons: string[];
  logbook_count: number;
  has_start: boolean;
  has_end: boolean;
  patrol_points: number;
  completed_patrols: number;
  active_pti: number;
  open_emergencies: number;
  active_presence: number;
}
