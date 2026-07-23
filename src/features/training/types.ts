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
  audience: string | null;
  prerequisites: string | null;
  detailed_program: string | null;
  teaching_methods: string | null;
  training_resources: string | null;
  assessment_methods: string | null;
  accessibility: string | null;
  price_excl_tax_cents: number;
  vat_rate_basis_points: number;
  default_capacity: number;
  default_location: string | null;
  completion_status: 'draft' | 'ready';
  status: TrainingEntityStatus;
  created_at: string;
  updated_at?: string;
}

export interface TrainingProgramTrainerRecord {
  organization_id: string;
  program_id: string;
  trainer_id: string;
  is_primary: boolean;
  created_at?: string;
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
  delivery_completed_at?: string | null;
  closure_automation_started_at?: string | null;
  training_dossier_finalized_at?: string | null;
  training_dossier_finalized_by?: string | null;
  training_dossier_auto_completed?: boolean;
  source_commercial_document_id?: string | null;
  validated_at?: string | null;
  validated_by?: string | null;
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



export function trainingProgramCompletion(program: TrainingProgramRecord) {
  const required = [
    program.title,
    program.objectives,
    program.audience,
    program.prerequisites,
    program.detailed_program,
    program.teaching_methods,
    program.assessment_methods,
    program.accessibility
  ];
  const completed = required.filter((value) => Boolean(String(value ?? '').trim())).length;
  return {
    completed,
    total: required.length,
    percent: Math.round((completed / required.length) * 100),
    ready: program.completion_status === 'ready' || completed === required.length
  };
}

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

export type TrainingEvaluationType = 'initial' | 'final';
export type TrainingSatisfactionStatus = 'pending' | 'sent' | 'completed' | 'expired' | 'cancelled';

export interface TrainingSatisfactionRecord {
  id: string;
  organization_id: string;
  site_id: string | null;
  session_id: string;
  trainee_id: string;
  public_token: string;
  evaluation_type: TrainingEvaluationType;
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
  initial_level: number | null;
  initial_expectations: string | null;
  initial_objectives: string | null;
  initial_needs: string | null;
  reminder_count: number;
  last_reminded_at: string | null;
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
export type TrainingCrmStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type TrainingCrmSource = 'website' | 'referral' | 'outbound' | 'event' | 'partner' | 'existing_customer' | 'other';
export type TrainingCrmActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task';
export type TrainingCrmActivityStatus = 'planned' | 'completed' | 'canceled';

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
  opportunity_id: string | null;
  customer_id: string | null;
  funder_id: string | null;
  session_id: string | null;
  trainee_id: string | null;
  program_id: string | null;
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
  signed_document_path: string | null;
  signed_document_received_at: string | null;
  signed_document_received_by: string | null;
  generated_document_path?: string | null;
  generated_document_name?: string | null;
  generated_at?: string | null;
  email_queued_at?: string | null;
  emailed_at?: string | null;
  last_email_recipient?: string | null;
  last_email_outbox_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface TrainingCrmOpportunityRecord {
  id: string;
  organization_id: string;
  site_id: string | null;
  customer_id: string | null;
  program_id: string | null;
  title: string;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source: TrainingCrmSource;
  stage: TrainingCrmStage;
  estimated_value_cents: number;
  probability: number;
  expected_close_date: string | null;
  next_action_label: string | null;
  next_action_at: string | null;
  notes: string | null;
  lost_reason: string | null;
  assigned_to: string | null;
  created_by: string | null;
  won_at: string | null;
  lost_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingCrmActivityRecord {
  id: string;
  organization_id: string;
  opportunity_id: string;
  activity_type: TrainingCrmActivityType;
  subject: string;
  details: string | null;
  due_at: string | null;
  status: TrainingCrmActivityStatus;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

export const trainingCrmStageLabels: Record<TrainingCrmStage, string> = {
  new: 'Nouveau',
  qualified: 'Qualifié',
  proposal: 'Proposition',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu'
};

export const trainingCrmSourceLabels: Record<TrainingCrmSource, string> = {
  website: 'Site internet',
  referral: 'Recommandation',
  outbound: 'Prospection',
  event: 'Événement',
  partner: 'Partenaire',
  existing_customer: 'Client existant',
  other: 'Autre'
};

export const trainingCrmActivityTypeLabels: Record<TrainingCrmActivityType, string> = {
  note: 'Note',
  call: 'Appel',
  email: 'E-mail',
  meeting: 'Rendez-vous',
  task: 'Tâche'
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
  canLaunchClosure: boolean;
  canFinalize: boolean;
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
