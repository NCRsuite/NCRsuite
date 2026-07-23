import type { Organization } from '../../types';
import type {
  TrainingAttendanceRecord,
  TrainingBpfDeliveryMode,
  TrainingBpfObjective,
  TrainingBpfRevenueCategory,
  TrainingBpfRncpLevel,
  TrainingBpfTraineeType,
  TrainingBpfTrainerRelationship,
  TrainingCommercialDocumentRecord,
  TrainingCustomerRecord,
  TrainingEnrollmentRecord,
  TrainingFunderRecord,
  TrainingProgramRecord,
  TrainingSessionRecord,
  TrainingTrainerRecord
} from './types';

export type {
  TrainingBpfDeliveryMode,
  TrainingBpfObjective,
  TrainingBpfRevenueCategory,
  TrainingBpfRncpLevel,
  TrainingBpfTraineeType,
  TrainingBpfTrainerRelationship
} from './types';

export type TrainingBpfReportStatus = 'draft' | 'reviewed' | 'locked';
export type TrainingBpfWarningSeverity = 'critical' | 'warning';

export interface TrainingBpfReportRecord {
  id: string;
  organization_id: string;
  reporting_year: number;
  exercise_start: string;
  exercise_end: string;
  status: TrainingBpfReportStatus;
  legal_form: string | null;
  naf_code: string | null;
  address_public: boolean;
  total_company_revenue_cents: number;
  total_training_charges_cents: number;
  trainer_salaries_cents: number;
  external_training_costs_cents: number;
  executive_name: string | null;
  executive_title: string | null;
  revenue_overrides: Partial<Record<TrainingBpfRevenueCategory, number>>;
  notes: string | null;
  calculated_data: TrainingBpfCalculation | null;
  calculated_at: string | null;
  locked_at: string | null;
  locked_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingBpfMetric {
  count: number;
  hours: number;
}

export interface TrainingBpfSpecialty extends TrainingBpfMetric {
  code: string;
  name: string;
}

export interface TrainingBpfWarning {
  severity: TrainingBpfWarningSeverity;
  code: string;
  label: string;
  entity_type: 'organization' | 'report' | 'program' | 'session' | 'enrollment' | 'commercial_document';
  entity_id: string;
}

export interface TrainingBpfCalculation {
  report_id: string;
  generated_at: string;
  period: { year: number; start: string; end: string };
  identity: {
    nda_number: string | null;
    siret: string | null;
    name: string;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    legal_form: string | null;
    naf_code: string | null;
    address_public: boolean;
    executive_name: string | null;
    executive_title: string | null;
  };
  general: { distance_learning: boolean; completed_sessions: number };
  financial: {
    auto_revenues_cents: Record<TrainingBpfRevenueCategory, number>;
    revenues_cents: Record<TrainingBpfRevenueCategory, number>;
    total_products_cents: number;
    total_company_revenue_cents: number;
    training_revenue_percent: number;
    total_training_charges_cents: number;
    trainer_salaries_cents: number;
    external_training_costs_cents: number;
  };
  trainers: Record<TrainingBpfTrainerRelationship, TrainingBpfMetric>;
  trainees: {
    categories: Record<TrainingBpfTraineeType, TrainingBpfMetric>;
    total: TrainingBpfMetric;
    outsourced_by_us: TrainingBpfMetric;
    subcontracted_for_other: TrainingBpfMetric;
  };
  objectives: {
    categories: Record<TrainingBpfObjective, TrainingBpfMetric>;
    rncp_levels: Record<TrainingBpfRncpLevel, TrainingBpfMetric>;
    total: TrainingBpfMetric;
  };
  specialties: {
    main: TrainingBpfSpecialty[];
    other: TrainingBpfMetric;
    total: TrainingBpfMetric;
  };
  quality: {
    completeness_percent: number;
    critical_count: number;
    warning_count: number;
    ready: boolean;
    warnings: TrainingBpfWarning[];
  };
  sources: {
    completed_sessions: number;
    enrollments: number;
    included_revenue_documents: number;
    unreviewed_revenue_documents: number;
  };
}

export const trainingBpfRevenueKeys: TrainingBpfRevenueCategory[] = [
  'companies',
  'apprenticeship',
  'professionalization',
  'pro_a',
  'transition',
  'cpf',
  'jobseekers_funds',
  'self_employed_funds',
  'skills_plan',
  'public_agents',
  'eu',
  'state',
  'regions',
  'france_travail',
  'other_public',
  'individuals',
  'training_organizations',
  'other_training'
];

export const trainingBpfRevenueLabels: Record<TrainingBpfRevenueCategory, string> = {
  companies: 'C1 · Entreprises pour leurs salariés',
  apprenticeship: 'C2a · Contrats d’apprentissage',
  professionalization: 'C2b · Contrats de professionnalisation',
  pro_a: 'C2c · Promotion ou reconversion par alternance',
  transition: 'C2d · Projets de transition professionnelle',
  cpf: 'C2e · Compte personnel de formation',
  jobseekers_funds: 'C2f · Dispositifs pour demandeurs d’emploi',
  self_employed_funds: 'C2g · Dispositifs pour non-salariés',
  skills_plan: 'C2h · Plan de développement des compétences',
  public_agents: 'C3 · Pouvoirs publics pour leurs agents',
  eu: 'C4 · Instances européennes',
  state: 'C5 · État',
  regions: 'C6 · Conseils régionaux',
  france_travail: 'C7 · France Travail',
  other_public: 'C8 · Autres ressources publiques',
  individuals: 'C9 · Particuliers à leurs frais',
  training_organizations: 'C10 · Autres organismes de formation',
  other_training: 'C11 · Autres produits de formation'
};

export const trainingBpfTraineeLabels: Record<TrainingBpfTraineeType, string> = {
  private_employee: 'Salariés d’employeurs privés',
  apprentice: 'Apprentis',
  jobseeker: 'Personnes en recherche d’emploi',
  individual: 'Particuliers à leurs frais',
  other: 'Autres stagiaires'
};

export const trainingBpfObjectiveLabels: Record<TrainingBpfObjective, string> = {
  rncp: 'Diplôme, titre ou CQP enregistré au RNCP',
  rs: 'Certification ou habilitation au Répertoire spécifique',
  cqp_unregistered: 'CQP non enregistré au RNCP ou au RS',
  other_professional: 'Autre formation professionnelle',
  skills_assessment: 'Bilan de compétences',
  vae: 'Accompagnement VAE'
};

export const trainingBpfRncpLevelLabels: Record<TrainingBpfRncpLevel, string> = {
  level_6_8: 'Niveaux 6 à 8',
  level_5: 'Niveau 5',
  level_4: 'Niveau 4',
  level_3: 'Niveau 3',
  level_2: 'Niveau 2',
  cqp_no_level: 'CQP sans niveau'
};

export const trainingBpfDeliveryModeLabels: Record<TrainingBpfDeliveryMode, string> = {
  direct: 'Réalisée directement',
  outsourced_by_us: 'Confiée à un autre organisme',
  subcontracted_for_other: 'Sous-traitance pour un autre organisme'
};

export const trainingBpfTrainerRelationshipLabels: Record<TrainingBpfTrainerRelationship, string> = {
  internal: 'Interne à l’organisme',
  external: 'Intervenant extérieur'
};

export const trainingBpfReportStatusLabels: Record<TrainingBpfReportStatus, string> = {
  draft: 'Brouillon',
  reviewed: 'Vérifié',
  locked: 'Verrouillé'
};

const traineeTypes = Object.keys(trainingBpfTraineeLabels) as TrainingBpfTraineeType[];
const objectives = Object.keys(trainingBpfObjectiveLabels) as TrainingBpfObjective[];
const rncpLevels = Object.keys(trainingBpfRncpLevelLabels) as TrainingBpfRncpLevel[];
const trainerRelationships = Object.keys(trainingBpfTrainerRelationshipLabels) as TrainingBpfTrainerRelationship[];

function metric(): TrainingBpfMetric {
  return { count: 0, hours: 0 };
}

function metricRecord<K extends string>(keys: K[]) {
  return Object.fromEntries(keys.map((key) => [key, metric()])) as Record<K, TrainingBpfMetric>;
}

function revenueRecord() {
  return Object.fromEntries(trainingBpfRevenueKeys.map((key) => [key, 0])) as Record<TrainingBpfRevenueCategory, number>;
}

function dateInPeriod(value: string, start: string, end: string) {
  const date = value.slice(0, 10);
  return date >= start && date <= end;
}

function roundHours(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function addMetric(target: TrainingBpfMetric, hours: number) {
  target.count += 1;
  target.hours = roundHours(target.hours + hours);
}

function documentRevenueCategory(
  document: TrainingCommercialDocumentRecord,
  customerById: Map<string, TrainingCustomerRecord>,
  funderById: Map<string, TrainingFunderRecord>
) {
  if (document.bpf_revenue_category) return document.bpf_revenue_category;
  const funderType = funderById.get(document.funder_id ?? '')?.funder_type;
  if (funderType === 'employer') return 'companies';
  if (funderType === 'cpf') return 'cpf';
  if (funderType === 'self') return 'individuals';
  const customerType = customerById.get(document.customer_id ?? '')?.customer_type;
  if (!funderType && customerType === 'company') return 'companies';
  if (!funderType && customerType === 'individual') return 'individuals';
  return null;
}

interface DemoBpfInput {
  organization: Organization;
  report: TrainingBpfReportRecord;
  programs: TrainingProgramRecord[];
  trainers: TrainingTrainerRecord[];
  sessions: TrainingSessionRecord[];
  enrollments: TrainingEnrollmentRecord[];
  attendance: TrainingAttendanceRecord[];
  documents: TrainingCommercialDocumentRecord[];
  customers: TrainingCustomerRecord[];
  funders: TrainingFunderRecord[];
}

export function calculateDemoTrainingBpf({
  organization,
  report,
  programs,
  trainers,
  sessions,
  enrollments,
  attendance,
  documents,
  customers,
  funders
}: DemoBpfInput): TrainingBpfCalculation {
  const programById = new Map(programs.map((row) => [row.id, row]));
  const trainerById = new Map(trainers.map((row) => [row.id, row]));
  const customerById = new Map(customers.map((row) => [row.id, row]));
  const funderById = new Map(funders.map((row) => [row.id, row]));
  const linkedDocumentIds = new Set(sessions.map((row) => row.source_commercial_document_id).filter(Boolean) as string[]);
  const periodSessions = sessions.filter((row) => row.status === 'completed' && dateInPeriod(row.ends_at, report.exercise_start, report.exercise_end));
  const periodSessionIds = new Set(periodSessions.map((row) => row.id));
  const warnings: TrainingBpfWarning[] = [];

  const warn = (warning: TrainingBpfWarning) => warnings.push(warning);
  if (!organization.training_nda_number?.trim()) warn({ severity: 'critical', code: 'identity_nda', label: 'Numéro de déclaration d’activité manquant', entity_type: 'organization', entity_id: organization.id });
  if (!organization.company_siret?.trim()) warn({ severity: 'critical', code: 'identity_siret', label: 'SIRET manquant', entity_type: 'organization', entity_id: organization.id });
  if (!report.legal_form?.trim()) warn({ severity: 'critical', code: 'identity_legal_form', label: 'Forme juridique manquante', entity_type: 'report', entity_id: report.id });
  if (!report.naf_code?.trim()) warn({ severity: 'critical', code: 'identity_naf', label: 'Code NAF manquant', entity_type: 'report', entity_id: report.id });
  if (!report.executive_name?.trim() || !report.executive_title?.trim()) warn({ severity: 'critical', code: 'identity_executive', label: 'Dirigeant ou qualité du signataire manquant', entity_type: 'report', entity_id: report.id });

  const attendeeRows: Array<{
    session: TrainingSessionRecord;
    enrollment: TrainingEnrollmentRecord;
    program: TrainingProgramRecord;
    hours: number;
  }> = [];

  for (const enrollment of enrollments) {
    if (!periodSessionIds.has(enrollment.session_id) || enrollment.status === 'canceled') continue;
    const session = periodSessions.find((row) => row.id === enrollment.session_id);
    const program = session ? programById.get(session.program_id) : undefined;
    if (!session || !program) continue;
    const marks = attendance.filter((row) => row.session_id === session.id && row.trainee_id === enrollment.trainee_id && ['present', 'absent', 'excused'].includes(row.status));
    const presentMarks = marks.filter((row) => row.status === 'present').length;
    let hours = enrollment.bpf_attended_hours == null ? Number(program.duration_hours) : Number(enrollment.bpf_attended_hours);
    if (enrollment.status === 'absent' && enrollment.bpf_attended_hours == null) hours = 0;
    else if (enrollment.bpf_attended_hours == null && marks.length > 0) hours = Number(program.duration_hours) * presentMarks / marks.length;
    hours = roundHours(Math.max(0, hours));
    if (hours <= 0) continue;
    attendeeRows.push({ session, enrollment, program, hours });

    if (session.bpf_delivery_mode !== 'subcontracted_for_other' && !enrollment.bpf_trainee_type) {
      warn({ severity: 'critical', code: 'trainee_type', label: 'Type de stagiaire à classer', entity_type: 'enrollment', entity_id: `${session.id}:${enrollment.trainee_id}` });
    }
    if (enrollment.bpf_attended_hours == null && marks.length === 0 && ['registered', 'confirmed'].includes(enrollment.status)) {
      warn({ severity: 'warning', code: 'attendance_unconfirmed', label: 'Présence calculée sans émargement complet', entity_type: 'enrollment', entity_id: `${session.id}:${enrollment.trainee_id}` });
    }
  }

  for (const session of periodSessions) {
    const program = programById.get(session.program_id);
    if (session.bpf_delivery_mode !== 'subcontracted_for_other' && program && (!program.bpf_specialty_code || !program.bpf_specialty_name)) {
      if (!warnings.some((row) => row.code === 'program_specialty' && row.entity_id === program.id)) {
        warn({ severity: 'critical', code: 'program_specialty', label: 'Spécialité de formation à renseigner', entity_type: 'program', entity_id: program.id });
      }
    }
    if (session.bpf_delivery_mode !== 'subcontracted_for_other' && program?.bpf_objective === 'rncp' && !program.bpf_rncp_level) {
      if (!warnings.some((row) => row.code === 'program_rncp_level' && row.entity_id === program.id)) {
        warn({ severity: 'critical', code: 'program_rncp_level', label: 'Niveau RNCP à renseigner', entity_type: 'program', entity_id: program.id });
      }
    }
    if (!session.trainer_id) warn({ severity: 'warning', code: 'session_trainer', label: 'Session clôturée sans formateur', entity_type: 'session', entity_id: session.id });
  }

  const traineeCategories = metricRecord(traineeTypes);
  const traineeTotal = metric();
  const outsourced = metric();
  const subcontracted = metric();
  const objectiveMetrics = metricRecord(objectives);
  const rncpMetrics = metricRecord(rncpLevels);
  const specialtyMap = new Map<string, TrainingBpfSpecialty>();

  for (const row of attendeeRows) {
    const delivery = row.session.bpf_delivery_mode ?? 'direct';
    if (delivery === 'subcontracted_for_other') {
      addMetric(subcontracted, row.hours);
      continue;
    }
    const traineeType = row.enrollment.bpf_trainee_type ?? 'other';
    addMetric(traineeCategories[traineeType], row.hours);
    addMetric(traineeTotal, row.hours);
    if (delivery === 'outsourced_by_us') addMetric(outsourced, row.hours);

    const objective = row.program.bpf_objective ?? 'other_professional';
    addMetric(objectiveMetrics[objective], row.hours);
    if (objective === 'rncp' && row.program.bpf_rncp_level) addMetric(rncpMetrics[row.program.bpf_rncp_level], row.hours);

    const specialtyCode = row.program.bpf_specialty_code || '---';
    const specialtyName = row.program.bpf_specialty_name || 'Non classée';
    const specialtyKey = `${specialtyCode}:${specialtyName}`;
    const specialty = specialtyMap.get(specialtyKey) ?? { code: specialtyCode, name: specialtyName, ...metric() };
    addMetric(specialty, row.hours);
    specialtyMap.set(specialtyKey, specialty);
  }

  const rankedSpecialties = [...specialtyMap.values()].sort((a, b) => b.hours - a.hours || b.count - a.count || a.code.localeCompare(b.code, 'fr'));
  const mainSpecialties = rankedSpecialties.slice(0, 5);
  const otherSpecialties = rankedSpecialties.slice(5).reduce((total, row) => ({
    count: total.count + row.count,
    hours: roundHours(total.hours + row.hours)
  }), metric());

  const trainerMetrics = metricRecord(trainerRelationships);
  const distinctTrainers: Record<TrainingBpfTrainerRelationship, Set<string>> = { internal: new Set(), external: new Set() };
  for (const session of periodSessions) {
    const trainer = trainerById.get(session.trainer_id ?? '');
    const program = programById.get(session.program_id);
    if (!trainer || !program) continue;
    const relationship = trainer.bpf_relationship ?? 'internal';
    distinctTrainers[relationship].add(trainer.id);
    trainerMetrics[relationship].hours = roundHours(trainerMetrics[relationship].hours + Number(program.duration_hours));
  }
  trainerRelationships.forEach((key) => { trainerMetrics[key].count = distinctTrainers[key].size; });

  const autoRevenues = revenueRecord();
  let includedDocuments = 0;
  let unreviewedDocuments = 0;
  for (const document of documents) {
    const realized = ['accepted', 'signed', 'completed'].includes(document.status);
    const included = document.bpf_included === true || linkedDocumentIds.has(document.id);
    const recognitionDate = document.bpf_revenue_recognized_at || document.issue_date;
    if (!realized || !dateInPeriod(recognitionDate, report.exercise_start, report.exercise_end)) continue;
    if (!included && document.amount_excl_tax_cents > 0) {
      unreviewedDocuments += 1;
      warn({ severity: 'warning', code: 'commercial_document_not_included', label: 'Document commercial réalisé non retenu', entity_type: 'commercial_document', entity_id: document.id });
      continue;
    }
    if (!included) continue;
    includedDocuments += 1;
    const category = documentRevenueCategory(document, customerById, funderById);
    if (!category) {
      warn({ severity: 'critical', code: 'revenue_category', label: 'Produit financier à classer', entity_type: 'commercial_document', entity_id: document.id });
      continue;
    }
    autoRevenues[category] += Number(document.amount_excl_tax_cents) || 0;
  }

  const revenues = revenueRecord();
  for (const key of trainingBpfRevenueKeys) {
    revenues[key] = Math.max(0, Number(report.revenue_overrides[key] ?? autoRevenues[key]) || 0);
  }
  const totalProducts = trainingBpfRevenueKeys.reduce((sum, key) => sum + revenues[key], 0);
  const trainingPercent = report.total_company_revenue_cents > 0 && totalProducts > 0
    ? Math.max(1, Math.min(100, Math.round(totalProducts * 100 / report.total_company_revenue_cents)))
    : 0;
  if (totalProducts > 0 && report.total_company_revenue_cents === 0) warn({ severity: 'warning', code: 'global_revenue', label: 'Chiffre d’affaires global à renseigner', entity_type: 'report', entity_id: report.id });
  if (periodSessions.length > 0 && report.total_training_charges_cents === 0) warn({ severity: 'warning', code: 'training_charges', label: 'Charges de formation à vérifier', entity_type: 'report', entity_id: report.id });

  const criticalCount = warnings.filter((row) => row.severity === 'critical').length;
  const warningCount = warnings.filter((row) => row.severity === 'warning').length;

  return {
    report_id: report.id,
    generated_at: new Date().toISOString(),
    period: { year: report.reporting_year, start: report.exercise_start, end: report.exercise_end },
    identity: {
      nda_number: organization.training_nda_number ?? null,
      siret: organization.company_siret ?? null,
      name: organization.public_name || organization.name,
      address: organization.company_address ?? null,
      postal_code: organization.company_postal_code ?? null,
      city: organization.company_city ?? null,
      phone: organization.company_phone ?? null,
      email: organization.company_email || organization.training_reply_to_email || null,
      legal_form: report.legal_form,
      naf_code: report.naf_code,
      address_public: report.address_public,
      executive_name: report.executive_name,
      executive_title: report.executive_title
    },
    general: {
      distance_learning: periodSessions.some((row) => ['distanciel', 'hybride'].includes(row.modality)),
      completed_sessions: periodSessions.length
    },
    financial: {
      auto_revenues_cents: autoRevenues,
      revenues_cents: revenues,
      total_products_cents: totalProducts,
      total_company_revenue_cents: report.total_company_revenue_cents,
      training_revenue_percent: trainingPercent,
      total_training_charges_cents: report.total_training_charges_cents,
      trainer_salaries_cents: report.trainer_salaries_cents,
      external_training_costs_cents: report.external_training_costs_cents
    },
    trainers: trainerMetrics,
    trainees: { categories: traineeCategories, total: traineeTotal, outsourced_by_us: outsourced, subcontracted_for_other: subcontracted },
    objectives: { categories: objectiveMetrics, rncp_levels: rncpMetrics, total: traineeTotal },
    specialties: { main: mainSpecialties, other: otherSpecialties, total: traineeTotal },
    quality: {
      completeness_percent: Math.max(0, 100 - criticalCount * 10 - warningCount * 3),
      critical_count: criticalCount,
      warning_count: warningCount,
      ready: criticalCount === 0,
      warnings
    },
    sources: {
      completed_sessions: periodSessions.length,
      enrollments: attendeeRows.length,
      included_revenue_documents: includedDocuments,
      unreviewed_revenue_documents: unreviewedDocuments
    }
  };
}

export function normalizeTrainingBpfReport(row: TrainingBpfReportRecord): TrainingBpfReportRecord {
  return {
    ...row,
    reporting_year: Number(row.reporting_year),
    total_company_revenue_cents: Number(row.total_company_revenue_cents) || 0,
    total_training_charges_cents: Number(row.total_training_charges_cents) || 0,
    trainer_salaries_cents: Number(row.trainer_salaries_cents) || 0,
    external_training_costs_cents: Number(row.external_training_costs_cents) || 0,
    revenue_overrides: Object.fromEntries(
      Object.entries(row.revenue_overrides ?? {}).map(([key, value]) => [key, Number(value) || 0])
    )
  };
}

export function normalizeTrainingBpfCalculation(data: TrainingBpfCalculation): TrainingBpfCalculation {
  const normalized = structuredClone(data);
  for (const key of trainingBpfRevenueKeys) {
    normalized.financial.auto_revenues_cents[key] = Number(normalized.financial.auto_revenues_cents[key]) || 0;
    normalized.financial.revenues_cents[key] = Number(normalized.financial.revenues_cents[key]) || 0;
  }
  normalized.financial.total_products_cents = Number(normalized.financial.total_products_cents) || 0;
  normalized.financial.total_company_revenue_cents = Number(normalized.financial.total_company_revenue_cents) || 0;
  normalized.financial.total_training_charges_cents = Number(normalized.financial.total_training_charges_cents) || 0;
  normalized.financial.trainer_salaries_cents = Number(normalized.financial.trainer_salaries_cents) || 0;
  normalized.financial.external_training_costs_cents = Number(normalized.financial.external_training_costs_cents) || 0;
  return normalized;
}
