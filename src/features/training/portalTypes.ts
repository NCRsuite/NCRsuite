export type TrainingPortalSubjectKind = 'trainee' | 'trainer' | 'client';
export type TrainingPortalDocumentCategory =
  | 'identity'
  | 'prerequisite'
  | 'administrative'
  | 'programme'
  | 'support'
  | 'convocation'
  | 'agreement'
  | 'contract'
  | 'invoice'
  | 'attendance'
  | 'evaluation'
  | 'certificate'
  | 'other';
export type TrainingSignatureRequestType =
  | 'quote'
  | 'agreement'
  | 'contract'
  | 'rules'
  | 'attendance'
  | 'authorization'
  | 'other';

export interface TrainingPortalSubject {
  id: string;
  subject_kind: TrainingPortalSubjectKind;
  name: string;
  email: string | null;
  detail: string | null;
  status: 'active' | 'inactive' | 'archived';
  session_count: number;
}

export interface TrainingPortalAccount {
  id: string;
  subject_kind: TrainingPortalSubjectKind;
  subject_id: string;
  email: string;
  display_name: string | null;
  status: 'active' | 'disabled';
  last_seen_at: string | null;
  accepted_at: string;
  pending_signatures: number;
}

export interface TrainingPortalInvitation {
  id: string;
  subject_kind: TrainingPortalSubjectKind;
  subject_id: string;
  email: string;
  display_name: string | null;
  status: 'pending' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface TrainingPortalSession {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  trainer_id?: string | null;
  location?: string | null;
  modality?: string;
  program_title?: string;
  trainer_name?: string | null;
  enrollment_status?: string | null;
}

export interface TrainingPortalDocument {
  id: string;
  source_kind?: string;
  subject_kind?: TrainingPortalSubjectKind;
  subject_id?: string;
  session_id: string | null;
  title: string;
  category: string;
  direction: 'organization_to_portal' | 'portal_to_organization';
  storage_bucket: 'training-portal-documents' | 'training-documents';
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  status?: string;
  published_at: string;
}

export interface TrainingPortalSourceDocument {
  id: string;
  source_kind: 'training_document' | 'commercial_document' | 'invoice';
  title: string;
  category: string;
  storage_bucket: 'training-documents';
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  session_id: string | null;
  trainee_id: string | null;
  trainer_id: string | null;
  customer_id: string | null;
  training_document_id: string | null;
  commercial_document_id: string | null;
  invoice_id: string | null;
  created_at: string;
}

export interface TrainingSignatureEvent {
  id?: string;
  event_type: 'requested' | 'viewed' | 'reminded' | 'signed' | 'declined' | 'canceled';
  actor_label: string | null;
  metadata?: Record<string, unknown>;
  occurred_at: string;
}

export interface TrainingSignatureRequest {
  id: string;
  account_id?: string;
  subject_kind?: TrainingPortalSubjectKind;
  subject_id?: string;
  title: string;
  request_type: TrainingSignatureRequestType;
  source_bucket: 'training-portal-documents' | 'training-documents';
  source_path: string;
  session_id: string | null;
  status: 'pending' | 'signed' | 'declined' | 'canceled';
  due_date: string | null;
  consent_text?: string;
  opened_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  proof_reference: string | null;
  signature_image_path?: string | null;
  document_sha256: string | null;
  signature_payload_sha256: string | null;
  reminder_count?: number;
  last_reminded_at?: string | null;
  created_at: string;
  events: TrainingSignatureEvent[];
}

export interface TrainingPortalAdminOverview {
  summary: {
    active_accounts: number;
    pending_invitations: number;
    pending_signatures: number;
    signed_documents: number;
    received_documents: number;
  };
  subjects: TrainingPortalSubject[];
  accounts: TrainingPortalAccount[];
  invitations: TrainingPortalInvitation[];
  sessions: TrainingPortalSession[];
  account_sessions: Array<{ account_id: string; session_id: string }>;
  documents: TrainingPortalDocument[];
  signatures: TrainingSignatureRequest[];
  source_documents: TrainingPortalSourceDocument[];
}

export interface CurrentTrainingPortalAccount {
  account_id: string;
  organization_id: string;
  subject_kind: TrainingPortalSubjectKind;
  subject_id: string;
  organization_name: string;
  organization_logo_url: string | null;
  organization_primary_color: string | null;
  subject_name: string;
  display_name: string | null;
  email: string;
  pending_signatures: number;
  last_seen_at: string | null;
}

export interface TrainingPortalDashboard {
  account: {
    id: string;
    subject_kind: TrainingPortalSubjectKind;
    subject_id: string;
    display_name: string | null;
    email: string;
  };
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
    primary_color: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  subject: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    detail: string | null;
  };
  summary: {
    sessions: number;
    documents: number;
    pending_signatures: number;
    signed_documents: number;
  };
  sessions: TrainingPortalSession[];
  documents: TrainingPortalDocument[];
  signatures: TrainingSignatureRequest[];
  attendance: Array<{
    id: string;
    session_id: string;
    session_title: string;
    attendance_date: string;
    period: string;
    status: string;
    signatory_name: string | null;
    signed_at: string | null;
  }>;
  evaluations: Array<{
    id: string;
    session_id: string;
    session_title: string;
    status: string;
    scheduled_for: string;
    completed_at: string | null;
    public_token: string;
  }>;
}


export interface TrainingTrainerBpfIntervention {
  organization_id: string;
  organization_name: string;
  organization_siret: string | null;
  trainer_id: string;
  session_id: string;
  session_title: string;
  program_title: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  modality: string | null;
  training_hours: number;
  regulatory_scope: 'professional_continuing' | 'apprenticeship';
  trainee_count: number;
  trainee_hours: number;
  amount_excl_tax_cents: number | null;
  invoice_reference: string | null;
  invoice_date: string | null;
  notes: string | null;
  entry_status: 'draft' | 'confirmed';
  confirmed_at: string | null;
  updated_at: string | null;
}

export interface TrainingTrainerBpfReportingOrganization {
  id: string;
  name: string;
  siret: string | null;
  nda_number: string | null;
}

export interface TrainingTrainerBpfOverview {
  reporting_year: number;
  summary: {
    centers: number;
    interventions: number;
    trainees: number;
    trainee_hours: number;
    revenue_cents: number;
    completed_entries: number;
    to_complete: number;
  };
  excluded_internal_sessions: number;
  excluded_out_of_scope_sessions: number;
  pending_scope_sessions: number;
  reporting_organizations: TrainingTrainerBpfReportingOrganization[];
  selected_reporting_organization_id: string | null;
  interventions: TrainingTrainerBpfIntervention[];
}

export const trainingPortalSubjectLabels: Record<TrainingPortalSubjectKind, string> = {
  trainee: 'Stagiaire',
  trainer: 'Formateur',
  client: 'Client'
};

export const trainingPortalCategoryLabels: Record<string, string> = {
  identity: 'Identité',
  prerequisite: 'Prérequis',
  administrative: 'Administratif',
  programme: 'Programme',
  support: 'Support pédagogique',
  convocation: 'Convocation',
  agreement: 'Convention',
  contract: 'Contrat',
  invoice: 'Facture',
  attendance: 'Émargement',
  evaluation: 'Évaluation',
  certificate: 'Attestation',
  quote: 'Devis',
  credit_note: 'Avoir',
  other: 'Autre'
};

export const trainingSignatureTypeLabels: Record<TrainingSignatureRequestType, string> = {
  quote: 'Devis',
  agreement: 'Convention',
  contract: 'Contrat',
  rules: 'Règlement intérieur',
  attendance: 'Émargement',
  authorization: 'Autorisation',
  other: 'Autre document'
};
