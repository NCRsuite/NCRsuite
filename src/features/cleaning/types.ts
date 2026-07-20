export type CleaningStatus = 'active' | 'inactive' | 'archived';
export type CleaningInterventionStatus = 'planned' | 'in_progress' | 'completed' | 'canceled';

export interface CleaningClientRecord {
  id: string;
  organization_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  postal_code: string | null;
  city: string | null;
  payment_terms_days: number;
  notes: string | null;
  status: CleaningStatus;
  created_at: string;
}

export interface CleaningSiteRecord {
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
  service_rate_cents: number;
  billing_mode: 'hourly' | 'flat';
  instructions: string | null;
  access_details: string | null;
  expected_frequency: string | null;
  status: CleaningStatus;
  created_at: string;
  cleaning_clients?: { company_name: string } | null;
}

export interface CleaningAgentRecord {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  employee_number: string | null;
  email: string | null;
  phone: string | null;
  contract_type: string;
  weekly_hours: number;
  skills: string[];
  linked_user_id: string | null;
  status: CleaningStatus;
  created_at: string;
}

export interface CleaningInterventionRecord {
  id: string;
  organization_id: string;
  site_id: string;
  agent_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  status: CleaningInterventionStatus;
  planned_price_cents: number;
  actual_started_at: string | null;
  actual_ended_at: string | null;
  report_text: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  agent_signature: string | null;
  client_signature: string | null;
  notes: string | null;
  created_at: string;
  cleaning_sites?: { name: string; address: string | null; city: string | null; instructions: string | null; cleaning_clients?: { company_name: string } | null } | null;
  cleaning_agents?: { first_name: string; last_name: string } | null;
}

export interface CleaningAnomalyRecord {
  id: string;
  organization_id: string;
  intervention_id: string | null;
  site_id: string;
  agent_id: string | null;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  corrective_action: string | null;
  resolved_at: string | null;
  created_at: string;
  cleaning_sites?: { name: string } | null;
  cleaning_agents?: { first_name: string; last_name: string } | null;
}

export interface CleaningQualityControlRecord {
  id: string;
  organization_id: string;
  intervention_id: string | null;
  site_id: string;
  agent_id: string | null;
  score_cleanliness: number;
  score_compliance: number;
  score_punctuality: number;
  score_material: number;
  overall_score: number;
  observations: string | null;
  corrective_action: string | null;
  controlled_at: string;
  created_at: string;
  cleaning_sites?: { name: string } | null;
  cleaning_agents?: { first_name: string; last_name: string } | null;
}

export interface CleaningStockItemRecord {
  id: string;
  organization_id: string;
  name: string;
  category: string | null;
  unit: string;
  quantity: number;
  minimum_quantity: number;
  unit_cost_cents: number;
  supplier: string | null;
  storage_location: string | null;
  status: CleaningStatus;
  updated_at: string;
}

export interface CleaningInvoiceRecord {
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
  created_at: string;
  cleaning_clients?: { company_name: string } | null;
}

export function nullableCleaningText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function formatCleaningMoney(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

export function formatCleaningDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function interventionDurationMinutes(intervention: Pick<CleaningInterventionRecord, 'starts_at' | 'ends_at' | 'break_minutes'>) {
  return Math.max(0, Math.round((new Date(intervention.ends_at).getTime() - new Date(intervention.starts_at).getTime()) / 60000) - intervention.break_minutes);
}
