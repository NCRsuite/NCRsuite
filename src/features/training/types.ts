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
