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
  created_at: string;
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
  completed: 'Terminée',
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
