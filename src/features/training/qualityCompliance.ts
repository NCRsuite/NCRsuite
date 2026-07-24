import type {
  TrainingQualityAuditRecord,
  TrainingQualityAuditResult,
  TrainingQualityAuditStatus,
  TrainingQualityAuditType,
  TrainingQualityControlRecord,
  TrainingQualityControlStatus,
  TrainingQualityEvidenceRecord
} from './types';

export const trainingQualityCriteria = [
  { number: 1, label: 'Information du public', shortLabel: 'Information' },
  { number: 2, label: 'Objectifs et conception', shortLabel: 'Conception' },
  { number: 3, label: 'Accueil, suivi et évaluation', shortLabel: 'Accompagnement' },
  { number: 4, label: 'Moyens pédagogiques et encadrement', shortLabel: 'Moyens' },
  { number: 5, label: 'Compétences des intervenants', shortLabel: 'Compétences' },
  { number: 6, label: 'Environnement professionnel', shortLabel: 'Veille & réseau' },
  { number: 7, label: 'Appréciations et amélioration', shortLabel: 'Amélioration' }
] as const;

export const trainingQualityIndicatorSeeds = [
  [1, 1, 'Information détaillée sur les prestations'],
  [1, 2, 'Indicateurs de résultats adaptés'],
  [1, 3, 'Information sur les certifications préparées'],
  [2, 4, 'Analyse du besoin du bénéficiaire'],
  [2, 5, 'Objectifs opérationnels et évaluables'],
  [2, 6, 'Contenus et modalités adaptés'],
  [2, 7, 'Adéquation aux exigences de certification'],
  [2, 8, 'Positionnement à l’entrée'],
  [3, 9, 'Information sur le déroulement'],
  [3, 10, 'Adaptation et accompagnement des publics'],
  [3, 11, 'Évaluation de l’atteinte des objectifs'],
  [3, 12, 'Engagement et prévention des ruptures'],
  [3, 13, 'Coordination des formations en alternance'],
  [3, 14, 'Accompagnement socio-professionnel'],
  [3, 15, 'Droits, devoirs, santé et sécurité des apprentis'],
  [3, 16, 'Conditions de présentation à la certification'],
  [4, 17, 'Moyens humains, techniques et environnement'],
  [4, 18, 'Coordination des intervenants'],
  [4, 19, 'Ressources pédagogiques accessibles'],
  [4, 20, 'Référents et conseil de perfectionnement'],
  [5, 21, 'Compétences des intervenants'],
  [5, 22, 'Développement des compétences des salariés'],
  [6, 23, 'Veille légale et réglementaire'],
  [6, 24, 'Veille métiers et compétences'],
  [6, 25, 'Veille pédagogique et technologique'],
  [6, 26, 'Réseau et expertise handicap'],
  [6, 27, 'Conformité des sous-traitants'],
  [6, 28, 'Partenaires des formations en situation de travail'],
  [6, 29, 'Insertion professionnelle et poursuite d’étude'],
  [7, 30, 'Recueil des appréciations'],
  [7, 31, 'Traitement des difficultés et réclamations'],
  [7, 32, 'Mesures d’amélioration continue']
] as const;

export const trainingQualityStatusLabels: Record<TrainingQualityControlStatus, string> = {
  not_started: 'À démarrer',
  in_progress: 'En cours',
  ready: 'Maîtrisé',
  attention: 'À corriger',
  not_applicable: 'Non applicable'
};

export const trainingQualityAuditTypeLabels: Record<TrainingQualityAuditType, string> = {
  initial: 'Audit initial',
  surveillance: 'Audit de surveillance',
  renewal: 'Audit de renouvellement',
  internal: 'Audit interne'
};

export const trainingQualityAuditStatusLabels: Record<TrainingQualityAuditStatus, string> = {
  planned: 'Planifié',
  preparing: 'En préparation',
  completed: 'Terminé'
};

export const trainingQualityAuditResultLabels: Record<Exclude<TrainingQualityAuditResult, null>, string> = {
  conform: 'Conforme',
  minor_nonconformity: 'Non-conformité mineure',
  major_nonconformity: 'Non-conformité majeure'
};

export function buildDemoTrainingQualityControls(organizationId: string): TrainingQualityControlRecord[] {
  const now = new Date().toISOString();
  return trainingQualityIndicatorSeeds.map(([criterion, indicator, title]) => ({
    id: `quality-${organizationId}-${indicator}`,
    organization_id: organizationId,
    criterion_number: criterion,
    indicator_number: indicator,
    title,
    objective: null,
    applicable: true,
    status: 'not_started',
    owner_name: null,
    due_date: null,
    notes: null,
    reviewed_at: null,
    evidence_count: 0,
    active_evidence_count: 0,
    expiring_evidence_count: 0,
    created_at: now,
    updated_at: now
  }));
}

export function buildTrainingQualitySummary(
  controls: TrainingQualityControlRecord[],
  evidence: TrainingQualityEvidenceRecord[],
  audits: TrainingQualityAuditRecord[]
) {
  const applicable = controls.filter((control) => control.applicable && control.status !== 'not_applicable');
  const ready = applicable.filter((control) => control.status === 'ready');
  const attention = applicable.filter((control) => control.status === 'attention');
  const missingEvidence = applicable.filter((control) => !evidence.some((item) => item.control_id === control.id && item.status === 'current'));
  const now = new Date();
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 60);
  const expiringEvidence = evidence.filter((item) => item.status === 'current' && item.expires_at && new Date(item.expires_at) <= limit);
  const nextAudit = audits
    .filter((audit) => audit.status !== 'completed')
    .sort((a, b) => a.planned_date.localeCompare(b.planned_date))[0] ?? null;
  return {
    applicableCount: applicable.length,
    readyCount: ready.length,
    attentionCount: attention.length,
    missingEvidenceCount: missingEvidence.length,
    expiringEvidenceCount: expiringEvidence.length,
    progressPercent: applicable.length ? Math.round((ready.length / applicable.length) * 100) : 0,
    nextAudit
  };
}

export function formatTrainingQualityDate(value?: string | null) {
  if (!value) return 'Non définie';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}
