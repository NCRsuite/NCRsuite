export type TrainingModality = 'presentiel' | 'distanciel' | 'hybride';
export type TrainingEntityStatus = 'active' | 'inactive' | 'archived';
export type TrainingSessionStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'canceled';

export interface TrainingProgramRecord {
  id: string;
  organization_id: string;
  site_id: string | null;
  title: string;
  code: string | null;
  duration_hours: number;
  modality: TrainingModality;
  objectives: string | null;
  description: string | null;
  status: TrainingEntityStatus;
  created_at: string;
}

export interface TrainingTraineeRecord {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  status: TrainingEntityStatus;
  created_at: string;
}

export interface TrainingTrainerRecord {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  specialties: string[];
  notes: string | null;
  status: TrainingEntityStatus;
  created_at: string;
}

export interface TrainingSessionRecord {
  id: string;
  organization_id: string;
  site_id: string | null;
  program_id: string;
  trainer_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  location: string | null;
  modality: TrainingModality;
  status: TrainingSessionStatus;
  notes: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  closure_notes?: string | null;
  reopened_at?: string | null;
  reopened_by?: string | null;
  training_dossier_requirements?: TrainingDossierRequirementOverrides | null;
  training_dossier_notes?: string | null;
  training_dossier_reviewed_at?: string | null;
  training_dossier_reviewed_by?: string | null;
  created_at: string;
}

export interface TrainingEnrollmentRecord {
  organization_id: string;
  session_id: string;
  trainee_id: string;
  status: 'registered' | 'confirmed' | 'completed' | 'absent' | 'canceled';
}


export type TrainingDocumentCategory = 'convocation' | 'programme' | 'support' | 'attestation' | 'administrative' | 'other';
export type TrainingDocumentVisibility = 'internal' | 'session' | 'trainee';
export type TrainingDocumentStatus = 'draft' | 'published' | 'archived';

export interface TrainingDocumentRecord {
  id: string;
  organization_id: string;
  site_id: string | null;
  session_id: string | null;
  program_id: string | null;
  trainee_id: string | null;
  title: string;
  category: TrainingDocumentCategory;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  visibility: TrainingDocumentVisibility;
  status: TrainingDocumentStatus;
  notes: string | null;
  generated_automatically?: boolean;
  automation_key?: string | null;
  generated_at?: string | null;
  emailed_at?: string | null;
  created_at: string;
}

export type TrainingDocumentJobKind = 'convocation' | 'attestation';
export type TrainingDocumentJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface TrainingDocumentJobRecord {
  id: string;
  organization_id: string;
  site_id: string | null;
  session_id: string;
  trainee_id: string;
  document_kind: TrainingDocumentJobKind;
  generation_version: number;
  send_email: boolean;
  status: TrainingDocumentJobStatus;
  attempts: number;
  document_id: string | null;
  last_error: string | null;
  created_at: string;
  completed_at: string | null;
}

export const trainingDocumentCategoryLabels: Record<TrainingDocumentCategory, string> = {
  convocation: 'Convocation',
  programme: 'Programme',
  support: 'Support pédagogique',
  attestation: 'Attestation',
  administrative: 'Document administratif',
  other: 'Autre document'
};

export const trainingDocumentVisibilityLabels: Record<TrainingDocumentVisibility, string> = {
  internal: 'Interne',
  session: 'Toute la session',
  trainee: 'Un stagiaire'
};

export const modalityLabels: Record<TrainingModality, string> = {
  presentiel: 'Présentiel',
  distanciel: 'Distanciel',
  hybride: 'Hybride'
};

export const sessionStatusLabels: Record<TrainingSessionStatus, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Clôturée',
  canceled: 'Annulée'
};

export function nullableText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function personName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export type TrainingAttendancePeriod = 'morning' | 'afternoon';
export type TrainingAttendanceStatus = 'pending' | 'present' | 'absent' | 'excused';

export interface TrainingAttendanceRecord {
  id: string;
  organization_id: string;
  site_id: string | null;
  session_id: string;
  trainee_id: string;
  attendance_date: string;
  period: TrainingAttendancePeriod;
  status: TrainingAttendanceStatus;
  signature_path: string | null;
  signatory_name: string | null;
  signed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const attendancePeriodLabels: Record<TrainingAttendancePeriod, string> = {
  morning: 'Matin',
  afternoon: 'Après-midi'
};

export const attendanceStatusLabels: Record<TrainingAttendanceStatus, string> = {
  pending: 'À émarger',
  present: 'Présent · signé',
  absent: 'Absent',
  excused: 'Absence justifiée'
};

export type TrainingSatisfactionStatus = 'pending' | 'sent' | 'completed' | 'expired' | 'cancelled';

export interface TrainingSatisfactionRecord {
  id: string;
  organization_id: string;
  site_id: string | null;
  session_id: string;
  trainee_id: string;
  public_token: string;
  status: TrainingSatisfactionStatus;
  scheduled_for: string;
  emailed_at: string | null;
  completed_at: string | null;
  content_rating: number | null;
  trainer_rating: number | null;
  organization_rating: number | null;
  objectives_rating: number | null;
  recommend: boolean | null;
  comment: string | null;
  improvement: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingSatisfactionSummary {
  total: number;
  completed: number;
  pending: number;
  response_rate: number;
  average_rating: number | null;
  recommendation_rate: number;
}

export type TrainingCustomerType = 'company' | 'individual';
export type TrainingFunderType = 'opco' | 'employer' | 'cpf' | 'public' | 'self' | 'other';
export type TrainingCommercialDocumentType = 'quote' | 'agreement' | 'contract';
export type TrainingCommercialDocumentStatus = 'draft' | 'sent' | 'accepted' | 'signed' | 'refused' | 'canceled' | 'completed';

export interface TrainingCustomerRecord {
  id: string;
  organization_id: string;
  site_id: string | null;
  customer_type: TrainingCustomerType;
  legal_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  postal_code: string | null;
  city: string | null;
  siret: string | null;
  vat_number: string | null;
  notes: string | null;
  status: TrainingEntityStatus;
  created_at: string;
  updated_at?: string;
}

export interface TrainingFunderRecord {
  id: string;
  organization_id: string;
  funder_type: TrainingFunderType;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  postal_code: string | null;
  city: string | null;
  reference_code: string | null;
  notes: string | null;
  status: TrainingEntityStatus;
  created_at: string;
  updated_at?: string;
}

export interface TrainingCommercialDocumentRecord {
  id: string;
  organization_id: string;
  site_id: string | null;
  customer_id: string | null;
  funder_id: string | null;
  session_id: string | null;
  trainee_id: string | null;
  document_type: TrainingCommercialDocumentType;
  reference: string;
  title: string;
  training_summary: string | null;
  participant_count: number;
  issue_date: string;
  valid_until: string | null;
  status: TrainingCommercialDocumentStatus;
  amount_excl_tax_cents: number;
  vat_rate_basis_points: number;
  tax_cents: number;
  amount_incl_tax_cents: number;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at?: string;
}

export const trainingCustomerTypeLabels: Record<TrainingCustomerType, string> = {
  company: 'Entreprise',
  individual: 'Particulier'
};

export const trainingFunderTypeLabels: Record<TrainingFunderType, string> = {
  opco: 'OPCO',
  employer: 'Employeur',
  cpf: 'CPF',
  public: 'Financeur public',
  self: 'Autofinancement',
  other: 'Autre'
};

export const trainingCommercialDocumentTypeLabels: Record<TrainingCommercialDocumentType, string> = {
  quote: 'Devis',
  agreement: 'Convention',
  contract: 'Contrat'
};

export const trainingCommercialDocumentStatusLabels: Record<TrainingCommercialDocumentStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  signed: 'Signé',
  refused: 'Refusé',
  canceled: 'Annulé',
  completed: 'Terminé'
};

export function formatTrainingMoney(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((Number(cents) || 0) / 100);
}


export type TrainingDossierRequirementKey =
  | 'commercial'
  | 'program_document'
  | 'convocations'
  | 'attendance'
  | 'evaluations'
  | 'certificates'
  | 'administrative';

export type TrainingDossierRequirementOverrides = Partial<Record<TrainingDossierRequirementKey, boolean>>;
export type TrainingDossierPhase = 'preparation' | 'delivery' | 'closure' | 'closed' | 'canceled';
export type TrainingDossierCheckState = 'ready' | 'missing' | 'upcoming' | 'not_required';

export interface TrainingDossierCheck {
  key: string;
  requirementKey?: TrainingDossierRequirementKey;
  label: string;
  detail: string;
  group: 'preparation' | 'delivery' | 'closure';
  path: string;
  state: TrainingDossierCheckState;
  required: boolean;
  current: number;
  expected: number;
}

export interface TrainingSessionDossierSummary {
  session: TrainingSessionRecord;
  phase: TrainingDossierPhase;
  progress: number;
  readyCount: number;
  requiredCount: number;
  missingCount: number;
  canClose: boolean;
  checks: TrainingDossierCheck[];
  enrollmentCount: number;
  commercialReference: string | null;
  customerName: string | null;
  funderName: string | null;
}

export const trainingDossierRequirementLabels: Record<TrainingDossierRequirementKey, string> = {
  commercial: 'Pièce commerciale',
  program_document: 'Programme pédagogique',
  convocations: 'Convocations',
  attendance: 'Émargements',
  evaluations: 'Évaluations',
  certificates: 'Attestations',
  administrative: 'Justificatifs administratifs'
};
