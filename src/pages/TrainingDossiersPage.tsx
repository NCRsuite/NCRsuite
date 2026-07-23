import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatDateTime,
  personName,
  sessionStatusLabels,
  type TrainingAttendanceRecord,
  type TrainingCommercialDocumentRecord,
  type TrainingCustomerRecord,
  type TrainingDocumentRecord,
  type TrainingDossierCheck,
  type TrainingDossierPhase,
  type TrainingDossierRequirementKey,
  type TrainingDossierRequirementOverrides,
  type TrainingEnrollmentRecord,
  type TrainingFunderRecord,
  type TrainingProgramRecord,
  type TrainingSatisfactionRecord,
  type TrainingSessionDossierSummary,
  type TrainingSessionRecord,
  type TrainingTraineeRecord,
  type TrainingTrainerRecord
} from '../features/training/types';
import { closeFileWindow, navigateFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { readJsonStorage, writeJsonStorage } from '../lib/safeStorage';
import { supabase } from '../lib/supabase';

type DossierTab = 'prepare' | 'active' | 'to_close' | 'closed' | 'all';
type CheckGroup = TrainingDossierCheck['group'];

const groupLabels: Record<CheckGroup, { eyebrow: string; title: string; description: string }> = {
  preparation: {
    eyebrow: 'AVANT LA SESSION',
    title: 'Préparation administrative',
    description: 'Cadre pédagogique, intervenants, bénéficiaires et documents de départ.'
  },
  delivery: {
    eyebrow: 'PENDANT LA FORMATION',
    title: 'Réalisation et preuves',
    description: 'Traçabilité de la présence et pièces produites pendant la session.'
  },
  closure: {
    eyebrow: 'APRÈS LA SESSION',
    title: 'Clôture et conformité',
    description: 'Évaluations, attestations et justificatifs nécessaires à l’archivage.'
  }
};

const tabLabels: Record<DossierTab, string> = {
  prepare: 'À préparer',
  active: 'En cours',
  to_close: 'À clôturer',
  closed: 'Clôturés',
  all: 'Tous'
};

const requirementDefaults: Record<TrainingDossierRequirementKey, boolean> = {
  commercial: true,
  program_document: true,
  convocations: true,
  attendance: true,
  evaluations: true,
  certificates: true,
  administrative: false
};

function readRows<T>(key: string) {
  return readJsonStorage<T[]>(key, []);
}

function inclusiveSessionDays(session: TrainingSessionRecord) {
  const start = new Date(session.starts_at);
  const end = new Date(session.ends_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.max(1, Math.floor((endDay - startDay) / 86_400_000) + 1);
}

function dossierPhase(session: TrainingSessionRecord): TrainingDossierPhase {
  if (session.status === 'canceled') return 'canceled';
  if (session.status === 'completed') return session.training_dossier_finalized_at ? 'closed' : 'closure';
  const now = Date.now();
  const startsAt = new Date(session.starts_at).getTime();
  const endsAt = new Date(session.ends_at).getTime();
  if (now < startsAt) return 'preparation';
  if (now <= endsAt || session.status === 'in_progress') return 'delivery';
  return 'closure';
}

function tabFor(summary: TrainingSessionDossierSummary): DossierTab {
  if (summary.phase === 'closed' || summary.phase === 'canceled') return 'closed';
  if (summary.phase === 'delivery') return 'active';
  if (summary.phase === 'closure') return 'to_close';
  return 'prepare';
}

function phaseLabel(phase: TrainingDossierPhase) {
  if (phase === 'preparation') return 'Préparation';
  if (phase === 'delivery') return 'Formation en cours';
  if (phase === 'closure') return 'Clôture à réaliser';
  if (phase === 'closed') return 'Dossier clôturé';
  return 'Session annulée';
}

function checkStateLabel(check: TrainingDossierCheck) {
  if (check.state === 'ready') return 'Complet';
  if (check.state === 'missing') return 'À compléter';
  if (check.state === 'upcoming') return 'À venir';
  return 'Non requis';
}

function compactDateRange(session: TrainingSessionRecord) {
  const start = new Date(session.starts_at);
  const end = new Date(session.ends_at);
  const sameDate = start.toDateString() === end.toDateString();
  const startLabel = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(start);
  if (sameDate) return startLabel;
  const endLabel = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(end);
  return `${startLabel} → ${endLabel}`;
}

function checkIcon(check: TrainingDossierCheck) {
  if (check.state === 'ready') return 'check' as const;
  if (check.state === 'missing') return 'alert' as const;
  if (check.state === 'upcoming') return 'clock' as const;
  return 'close' as const;
}

function normalizedRequirements(session: TrainingSessionRecord): TrainingDossierRequirementOverrides {
  const value = session.training_dossier_requirements;
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function TrainingDossiersPage() {
  const { organization, sites, activeSiteId } = useOrganization();
  const { demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState<TrainingSessionRecord[]>([]);
  const [programs, setPrograms] = useState<TrainingProgramRecord[]>([]);
  const [trainers, setTrainers] = useState<TrainingTrainerRecord[]>([]);
  const [trainees, setTrainees] = useState<TrainingTraineeRecord[]>([]);
  const [enrollments, setEnrollments] = useState<TrainingEnrollmentRecord[]>([]);
  const [documents, setDocuments] = useState<TrainingDocumentRecord[]>([]);
  const [attendance, setAttendance] = useState<TrainingAttendanceRecord[]>([]);
  const [satisfaction, setSatisfaction] = useState<TrainingSatisfactionRecord[]>([]);
  const [commercialDocuments, setCommercialDocuments] = useState<TrainingCommercialDocumentRecord[]>([]);
  const [customers, setCustomers] = useState<TrainingCustomerRecord[]>([]);
  const [funders, setFunders] = useState<TrainingFunderRecord[]>([]);
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<DossierTab>(['prepare', 'active', 'to_close', 'closed', 'all'].includes(initialTab ?? '') ? initialTab as DossierTab : 'prepare');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(searchParams.get('focus') ?? '');
  const [notesDraft, setNotesDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const detailRef = useRef<HTMLElement | null>(null);

  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const canReopen = ['owner', 'admin'].includes(organization?.role ?? 'viewer');
  const dossierEnabled = Boolean(organization && organizationHasFeature(organization, 'training_session_dossier'));

  async function loadData() {
    if (!organization) return;
    if (!organizationHasFeature(organization, 'training_session_dossier')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const organizationId = organization.id;

    if (demoMode || !supabase) {
      setSessions(readRows<TrainingSessionRecord>(`ncr-suite-training-sessions-${organizationId}`));
      setPrograms(readRows<TrainingProgramRecord>(`ncr-suite-training-programs-${organizationId}`));
      setTrainers(readRows<TrainingTrainerRecord>(`ncr-suite-training-trainers-${organizationId}`));
      setTrainees(readRows<TrainingTraineeRecord>(`ncr-suite-training-trainees-${organizationId}`));
      setEnrollments(readRows<TrainingEnrollmentRecord>(`ncr-suite-training-enrollments-${organizationId}`));
      setDocuments(readRows<TrainingDocumentRecord>(`ncr-suite-training-documents-${organizationId}`));
      setAttendance(readRows<TrainingAttendanceRecord>(`ncr-suite-training-attendance-${organizationId}`));
      setSatisfaction(readRows<TrainingSatisfactionRecord>(`ncr-suite-training-satisfaction-${organizationId}`));
      setCommercialDocuments(readRows<TrainingCommercialDocumentRecord>(`ncr-suite-training-commercial-${organizationId}`));
      setCustomers(readRows<TrainingCustomerRecord>(`ncr-suite-training-customers-${organizationId}`));
      setFunders(readRows<TrainingFunderRecord>(`ncr-suite-training-funders-${organizationId}`));
      setLoading(false);
      return;
    }

    let sessionRequest = supabase
      .from('training_sessions')
      .select('id,organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,capacity,location,modality,status,notes,closed_at,closed_by,closure_notes,reopened_at,reopened_by,delivery_completed_at,closure_automation_started_at,training_dossier_finalized_at,training_dossier_finalized_by,training_dossier_auto_completed,training_dossier_requirements,training_dossier_notes,training_dossier_reviewed_at,training_dossier_reviewed_by,created_at')
      .eq('organization_id', organizationId)
      .order('starts_at', { ascending: false });
    let programRequest = supabase
      .from('training_programs')
      .select('id,organization_id,site_id,title,code,duration_hours,modality,objectives,description,status,created_at')
      .eq('organization_id', organizationId)
      .neq('status', 'archived')
      .order('title');
    if (activeSiteId) {
      sessionRequest = sessionRequest.eq('site_id', activeSiteId);
      programRequest = programRequest.or(`site_id.is.null,site_id.eq.${activeSiteId}`);
    }

    const [
      sessionsResult,
      programsResult,
      trainersResult,
      traineesResult,
      enrollmentsResult,
      documentsResult,
      attendanceResult,
      satisfactionResult,
      commercialResult,
      customersResult,
      fundersResult
    ] = await Promise.all([
      sessionRequest,
      programRequest,
      supabase.from('training_trainers').select('id,organization_id,first_name,last_name,email,phone,specialties,notes,status,created_at').eq('organization_id', organizationId).neq('status', 'archived').order('last_name'),
      supabase.from('training_trainees').select('id,organization_id,first_name,last_name,email,phone,company,notes,status,created_at').eq('organization_id', organizationId).neq('status', 'archived').order('last_name'),
      supabase.from('training_session_enrollments').select('organization_id,session_id,trainee_id,status').eq('organization_id', organizationId),
      supabase.from('training_documents').select('id,organization_id,site_id,session_id,program_id,trainee_id,title,category,storage_path,mime_type,size_bytes,visibility,status,notes,generated_automatically,automation_key,generated_at,emailed_at,created_at').eq('organization_id', organizationId).neq('status', 'archived'),
      supabase.from('training_attendance').select('id,organization_id,site_id,session_id,trainee_id,attendance_date,period,status,signature_path,signatory_name,signed_at,notes,created_at,updated_at').eq('organization_id', organizationId),
      supabase.from('training_satisfaction_surveys').select('id,organization_id,site_id,session_id,trainee_id,public_token,evaluation_type,status,scheduled_for,emailed_at,completed_at,content_rating,trainer_rating,organization_rating,objectives_rating,recommend,comment,improvement,initial_level,initial_expectations,initial_objectives,initial_needs,reminder_count,last_reminded_at,created_at,updated_at').eq('organization_id', organizationId),
      supabase.from('training_commercial_documents').select('id,organization_id,site_id,customer_id,funder_id,session_id,trainee_id,document_type,reference,title,training_summary,participant_count,issue_date,valid_until,status,amount_excl_tax_cents,vat_rate_basis_points,tax_cents,amount_incl_tax_cents,notes,terms,sent_at,accepted_at,signed_at,created_at,updated_at').eq('organization_id', organizationId).order('created_at', { ascending: false }),
      supabase.from('training_customers').select('id,organization_id,site_id,customer_type,legal_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,notes,status,created_at,updated_at').eq('organization_id', organizationId).neq('status', 'archived'),
      supabase.from('training_funders').select('id,organization_id,funder_type,name,contact_name,email,phone,billing_address,postal_code,city,reference_code,notes,status,created_at,updated_at').eq('organization_id', organizationId).neq('status', 'archived')
    ]);

    const firstError = sessionsResult.error || programsResult.error || trainersResult.error || traineesResult.error || enrollmentsResult.error || documentsResult.error || attendanceResult.error || satisfactionResult.error || commercialResult.error || customersResult.error || fundersResult.error;
    if (firstError) {
      setError(`Chargement impossible : ${firstError.message}`);
    } else {
      setSessions((sessionsResult.data ?? []) as TrainingSessionRecord[]);
      setPrograms((programsResult.data ?? []).map((row) => ({ ...row, duration_hours: Number(row.duration_hours) })) as TrainingProgramRecord[]);
      setTrainers((trainersResult.data ?? []) as TrainingTrainerRecord[]);
      setTrainees((traineesResult.data ?? []) as TrainingTraineeRecord[]);
      setEnrollments((enrollmentsResult.data ?? []) as TrainingEnrollmentRecord[]);
      setDocuments((documentsResult.data ?? []).map((row) => ({ ...row, size_bytes: row.size_bytes ? Number(row.size_bytes) : null })) as TrainingDocumentRecord[]);
      setAttendance((attendanceResult.data ?? []) as TrainingAttendanceRecord[]);
      setSatisfaction((satisfactionResult.data ?? []) as TrainingSatisfactionRecord[]);
      setCommercialDocuments((commercialResult.data ?? []).map((row) => ({
        ...row,
        participant_count: Number(row.participant_count),
        amount_excl_tax_cents: Number(row.amount_excl_tax_cents),
        vat_rate_basis_points: Number(row.vat_rate_basis_points),
        tax_cents: Number(row.tax_cents),
        amount_incl_tax_cents: Number(row.amount_incl_tax_cents)
      })) as TrainingCommercialDocumentRecord[]);
      setCustomers((customersResult.data ?? []) as TrainingCustomerRecord[]);
      setFunders((fundersResult.data ?? []) as TrainingFunderRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [organization?.id, activeSiteId, demoMode]);

  const programMap = useMemo(() => new Map(programs.map((row) => [row.id, row])), [programs]);
  const trainerMap = useMemo(() => new Map(trainers.map((row) => [row.id, row])), [trainers]);
  const traineeMap = useMemo(() => new Map(trainees.map((row) => [row.id, row])), [trainees]);
  const customerMap = useMemo(() => new Map(customers.map((row) => [row.id, row])), [customers]);
  const funderMap = useMemo(() => new Map(funders.map((row) => [row.id, row])), [funders]);

  const summaries = useMemo<TrainingSessionDossierSummary[]>(() => {
    if (!organization) return [];
    const hasCommercial = organizationHasFeature(organization, 'training_commercial');
    const hasDocuments = organizationHasFeature(organization, 'training_documents');
    const hasAttendance = organizationHasFeature(organization, 'training_digital_attendance');
    const hasEvaluations = organizationHasFeature(organization, 'training_satisfaction') && organization.training_satisfaction_enabled !== false;
    const hasCertificates = organizationHasFeature(organization, 'training_automatic_certificates');

    return sessions.map((session) => {
      const phase = dossierPhase(session);
      const overrides = normalizedRequirements(session);
      const activeEnrollments = enrollments.filter((row) => row.session_id === session.id && row.status !== 'canceled');
      const sessionDocuments = documents.filter((row) => row.session_id === session.id && row.status !== 'archived');
      const sessionAttendance = attendance.filter((row) => row.session_id === session.id);
      const sessionSatisfaction = satisfaction.filter((row) => row.session_id === session.id && row.status !== 'cancelled');
      const sessionCommercial = commercialDocuments.filter((row) => row.session_id === session.id && !['refused', 'canceled'].includes(row.status));
      const acceptedCommercial = sessionCommercial.filter((row) => ['accepted', 'signed', 'completed'].includes(row.status));
      const latestCommercial = sessionCommercial[0] ?? null;
      const expectedAttendance = activeEnrollments.length * inclusiveSessionDays(session) * 2;
      const completedAttendance = sessionAttendance.filter((row) => ['present', 'absent', 'excused'].includes(row.status)).length;
      const initialEvaluations = sessionSatisfaction.filter((row) => row.evaluation_type === 'initial');
      const finalEvaluations = sessionSatisfaction.filter((row) => row.evaluation_type === 'final');
      const completedInitialEvaluations = initialEvaluations.filter((row) => row.status === 'completed').length;
      const completedFinalEvaluations = finalEvaluations.filter((row) => row.status === 'completed').length;
      const convocationCount = sessionDocuments.filter((row) => row.category === 'convocation').length;
      const programDocumentCount = sessionDocuments.filter((row) => row.category === 'programme').length;
      const certificateCount = sessionDocuments.filter((row) => row.category === 'attestation').length;
      const administrativeCount = sessionDocuments.filter((row) => row.category === 'administrative').length;

      const enabled = (key: TrainingDossierRequirementKey, available: boolean) => available && (overrides[key] ?? requirementDefaults[key]);
      const createCheck = (input: Omit<TrainingDossierCheck, 'state' | 'required'> & { enabled: boolean; activeNow?: boolean }): TrainingDossierCheck => {
        const { enabled: isEnabled, activeNow = true, ...check } = input;
        const required = isEnabled && activeNow;
        let state: TrainingDossierCheck['state'];
        if (!isEnabled) state = 'not_required';
        else if (!activeNow) state = 'upcoming';
        else state = check.current >= check.expected ? 'ready' : 'missing';
        return { ...check, required, state };
      };

      const checks: TrainingDossierCheck[] = [
        createCheck({ key: 'program', label: 'Formation et programme définis', detail: programMap.get(session.program_id)?.title || 'La formation liée à la session est introuvable.', group: 'preparation', path: '/formations', enabled: true, current: programMap.has(session.program_id) ? 1 : 0, expected: 1 }),
        createCheck({ key: 'trainer', label: 'Formateur affecté', detail: session.trainer_id && trainerMap.get(session.trainer_id) ? personName(trainerMap.get(session.trainer_id)!.first_name, trainerMap.get(session.trainer_id)!.last_name) : 'Aucun formateur n’est encore affecté.', group: 'preparation', path: `/sessions?focus=${session.id}`, enabled: true, current: session.trainer_id && trainerMap.has(session.trainer_id) ? 1 : 0, expected: 1 }),
        createCheck({ key: 'participants', label: 'Bénéficiaires inscrits', detail: `${activeEnrollments.length} stagiaire${activeEnrollments.length > 1 ? 's' : ''} inscrit${activeEnrollments.length > 1 ? 's' : ''}.`, group: 'preparation', path: `/sessions?focus=${session.id}`, enabled: true, current: activeEnrollments.length, expected: 1 }),
        createCheck({ key: 'commercial', requirementKey: 'commercial', label: 'Devis, convention ou contrat validé', detail: latestCommercial ? `${latestCommercial.reference} · ${latestCommercial.title}` : 'Aucune pièce commerciale n’est rattachée à cette session.', group: 'preparation', path: '/commercial', enabled: enabled('commercial', hasCommercial), current: acceptedCommercial.length, expected: 1 }),
        createCheck({ key: 'program_document', requirementKey: 'program_document', label: 'Programme pédagogique déposé', detail: `${programDocumentCount} programme${programDocumentCount > 1 ? 's' : ''} dans la bibliothèque.`, group: 'preparation', path: `/documents?session=${session.id}&category=programme`, enabled: enabled('program_document', hasDocuments), current: programDocumentCount, expected: 1 }),
        createCheck({ key: 'convocations', requirementKey: 'convocations', label: 'Convocations des stagiaires', detail: `${convocationCount} convocation${convocationCount > 1 ? 's' : ''} pour ${activeEnrollments.length} inscrit${activeEnrollments.length > 1 ? 's' : ''}.`, group: 'preparation', path: `/documents?session=${session.id}&category=convocation`, enabled: enabled('convocations', hasDocuments), current: convocationCount, expected: Math.max(activeEnrollments.length, 1) }),
        createCheck({ key: 'initial_evaluations', requirementKey: 'evaluations', label: 'Évaluations initiales', detail: `${completedInitialEvaluations} réponse${completedInitialEvaluations > 1 ? 's' : ''} sur ${activeEnrollments.length} stagiaire${activeEnrollments.length > 1 ? 's' : ''}.`, group: 'preparation', path: `/evaluations?session=${session.id}&type=initial`, enabled: enabled('evaluations', hasEvaluations) && (organization.training_initial_evaluation_enabled ?? true), activeNow: session.status !== 'draft', current: completedInitialEvaluations, expected: Math.max(activeEnrollments.length, 1) }),
        createCheck({ key: 'attendance', requirementKey: 'attendance', label: 'Émargements renseignés', detail: `${completedAttendance} créneau${completedAttendance > 1 ? 'x' : ''} complété${completedAttendance > 1 ? 's' : ''} sur ${expectedAttendance}.`, group: 'delivery', path: `/emargements?session=${session.id}`, enabled: enabled('attendance', hasAttendance), activeNow: ['delivery', 'closure', 'closed'].includes(phase), current: completedAttendance, expected: Math.max(expectedAttendance, 1) }),
        createCheck({ key: 'final_evaluations', requirementKey: 'evaluations', label: 'Évaluations finales', detail: `${completedFinalEvaluations} réponse${completedFinalEvaluations > 1 ? 's' : ''} complète${completedFinalEvaluations > 1 ? 's' : ''} sur ${activeEnrollments.length}.`, group: 'closure', path: `/evaluations?session=${session.id}&type=final`, enabled: enabled('evaluations', hasEvaluations) && (organization.training_satisfaction_enabled ?? true), activeNow: session.status === 'completed', current: completedFinalEvaluations, expected: Math.max(activeEnrollments.length, 1) }),
        createCheck({ key: 'certificates', requirementKey: 'certificates', label: 'Attestations de fin de formation', detail: `${certificateCount} attestation${certificateCount > 1 ? 's' : ''} pour ${activeEnrollments.length} bénéficiaire${activeEnrollments.length > 1 ? 's' : ''}.`, group: 'closure', path: `/attestations?session=${session.id}&category=attestation`, enabled: enabled('certificates', hasCertificates), activeNow: ['closure', 'closed'].includes(phase), current: certificateCount, expected: Math.max(activeEnrollments.length, 1) }),
        createCheck({ key: 'administrative', requirementKey: 'administrative', label: 'Justificatifs administratifs complémentaires', detail: `${administrativeCount} justificatif${administrativeCount > 1 ? 's' : ''} déposé${administrativeCount > 1 ? 's' : ''}.`, group: 'closure', path: `/documents?session=${session.id}&category=administrative`, enabled: overrides.administrative === true, activeNow: ['closure', 'closed'].includes(phase), current: administrativeCount, expected: 1 })
      ];

      const requiredChecks = checks.filter((check) => check.required);
      const readyChecks = requiredChecks.filter((check) => check.state === 'ready');
      const preClosureChecks = requiredChecks.filter((check) => !['final_evaluations', 'certificates'].includes(check.key));
      const preClosureReady = preClosureChecks.length > 0 && preClosureChecks.every((check) => check.state === 'ready');
      const requiredCount = requiredChecks.length;
      const readyCount = readyChecks.length;
      const progress = requiredCount === 0 ? 100 : Math.round((readyCount / requiredCount) * 100);
      const customer = latestCommercial?.customer_id ? customerMap.get(latestCommercial.customer_id) ?? null : null;
      const funder = latestCommercial?.funder_id ? funderMap.get(latestCommercial.funder_id) ?? null : null;

      return {
        session,
        phase,
        progress,
        readyCount,
        requiredCount,
        missingCount: Math.max(requiredCount - readyCount, 0),
        canClose: session.status === 'completed' && !session.training_dossier_finalized_at && requiredCount > 0 && readyCount === requiredCount,
        canLaunchClosure: phase === 'closure' && session.status !== 'completed' && preClosureReady,
        canFinalize: session.status === 'completed' && !session.training_dossier_finalized_at && requiredCount > 0 && readyCount === requiredCount,
        checks,
        enrollmentCount: activeEnrollments.length,
        commercialReference: latestCommercial?.reference ?? null,
        customerName: customer?.legal_name ?? null,
        funderName: funder?.name ?? null
      };
    });
  }, [organization, sessions, programs, trainers, enrollments, documents, attendance, satisfaction, commercialDocuments, customerMap, funderMap, programMap, trainerMap]);

  const tabCounts = useMemo(() => {
    const counts: Record<DossierTab, number> = { prepare: 0, active: 0, to_close: 0, closed: 0, all: summaries.length };
    summaries.forEach((summary) => { counts[tabFor(summary)] += 1; });
    return counts;
  }, [summaries]);

  const metrics = useMemo(() => {
    const active = summaries.filter((summary) => !['closed', 'canceled'].includes(summary.phase));
    const average = active.length ? Math.round(active.reduce((sum, summary) => sum + summary.progress, 0) / active.length) : 100;
    return {
      active: active.length,
      average,
      ready: summaries.filter((summary) => summary.canLaunchClosure || summary.canFinalize).length,
      missing: active.reduce((sum, summary) => sum + summary.missingCount, 0)
    };
  }, [summaries]);

  const visibleSummaries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return summaries.filter((summary) => {
      if (tab !== 'all' && tabFor(summary) !== tab) return false;
      if (!normalized) return true;
      const session = summary.session;
      const program = programMap.get(session.program_id);
      const trainer = session.trainer_id ? trainerMap.get(session.trainer_id) : null;
      return [session.title, program?.title, trainer ? personName(trainer.first_name, trainer.last_name) : '', summary.customerName, summary.funderName, session.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [summaries, tab, query, programMap, trainerMap]);

  const selectedSummary = useMemo(() => summaries.find((summary) => summary.session.id === selectedId) ?? null, [summaries, selectedId]);

  useEffect(() => {
    if (loading || summaries.length === 0) return;
    const requested = searchParams.get('focus');
    if (requested && summaries.some((summary) => summary.session.id === requested)) {
      setSelectedId(requested);
      return;
    }
    if (!selectedId || !summaries.some((summary) => summary.session.id === selectedId)) {
      const next = visibleSummaries[0] ?? summaries[0];
      if (next) setSelectedId(next.session.id);
    }
  }, [loading, summaries, visibleSummaries, searchParams, selectedId]);

  useEffect(() => {
    setNotesDraft(selectedSummary?.session.training_dossier_notes ?? '');
  }, [selectedSummary?.session.id, selectedSummary?.session.training_dossier_notes]);

  function selectSummary(summary: TrainingSessionDossierSummary) {
    setSelectedId(summary.session.id);
    const next = new URLSearchParams(searchParams);
    next.set('focus', summary.session.id);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
    window.setTimeout(() => {
      if (window.innerWidth <= 980) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  function changeTab(nextTab: DossierTab) {
    setTab(nextTab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', nextTab);
    next.delete('focus');
    setSearchParams(next, { replace: true });
    const first = summaries.find((summary) => nextTab === 'all' || tabFor(summary) === nextTab);
    if (first) setSelectedId(first.session.id);
  }

  async function persistDossierSettings(session: TrainingSessionRecord, requirements: TrainingDossierRequirementOverrides, notes: string, feedback: string) {
    if (!organization || !canManage) return;
    setBusyAction(`settings-${session.id}`);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const nextSessions = sessions.map((row) => row.id === session.id ? {
          ...row,
          training_dossier_requirements: requirements,
          training_dossier_notes: notes.trim() || null,
          training_dossier_reviewed_at: new Date().toISOString()
        } : row);
        writeJsonStorage(`ncr-suite-training-sessions-${organization.id}`, nextSessions);
        setSessions(nextSessions);
      } else {
        const { error: rpcError } = await supabase.rpc('update_training_session_dossier_settings', {
          p_organization_id: organization.id,
          p_session_id: session.id,
          p_requirements: requirements,
          p_notes: notes.trim() || null
        });
        if (rpcError) throw rpcError;
        await loadData();
      }
      setSuccess(feedback);
    } catch (caught) {
      setError(`Mise à jour impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally {
      setBusyAction('');
    }
  }

  async function toggleRequirement(check: TrainingDossierCheck) {
    if (!selectedSummary || !check.requirementKey) return;
    const session = selectedSummary.session;
    const current = normalizedRequirements(session);
    const availableDefault = check.requirementKey === 'administrative' ? false : requirementDefaults[check.requirementKey];
    const currentlyEnabled = current[check.requirementKey] ?? availableDefault;
    const next = { ...current, [check.requirementKey]: !currentlyEnabled };
    await persistDossierSettings(session, next, notesDraft, currentlyEnabled ? 'La pièce est désormais indiquée comme non requise.' : 'La pièce redevient obligatoire dans ce dossier.');
  }

  async function saveNotes() {
    if (!selectedSummary) return;
    await persistDossierSettings(selectedSummary.session, normalizedRequirements(selectedSummary.session), notesDraft, 'Les notes du dossier sont enregistrées.');
  }

  async function closeSessionDossier() {
    if (!organization || !selectedSummary) return;
    const launch = selectedSummary.canLaunchClosure;
    const finalize = selectedSummary.canFinalize;
    if (!launch && !finalize) return;
    const confirmation = launch
      ? 'Terminer la session et lancer automatiquement l’évaluation finale puis les attestations ?'
      : 'Finaliser ce dossier maintenant que toutes les pièces sont complètes ?';
    if (!window.confirm(confirmation)) return;
    const session = selectedSummary.session;
    setBusyAction(`close-${session.id}`);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const nextSessions = sessions.map((row) => row.id === session.id ? launch
          ? { ...row, status: 'completed' as const, closed_at: new Date().toISOString(), delivery_completed_at: new Date().toISOString(), closure_notes: notesDraft.trim() || null }
          : { ...row, training_dossier_finalized_at: new Date().toISOString(), training_dossier_auto_completed: false }
          : row);
        writeJsonStorage(`ncr-suite-training-sessions-${organization.id}`, nextSessions);
        setSessions(nextSessions);
      } else if (launch) {
        const { error: rpcError } = await supabase.rpc('close_training_session', {
          p_organization_id: organization.id,
          p_session_id: session.id,
          p_closure_notes: notesDraft.trim() || null
        });
        if (rpcError) throw rpcError;
        await loadData();
      } else {
        const { error: rpcError } = await supabase.rpc('finalize_training_session_dossier', {
          p_organization_id: organization.id,
          p_session_id: session.id
        });
        if (rpcError) throw rpcError;
        await loadData();
      }
      setSuccess(launch
        ? 'La session est terminée. Les évaluations finales sont envoyées par Brevo et les attestations suivront automatiquement.'
        : 'Le dossier complet est maintenant finalisé.');
      setTab(launch ? 'to_close' : 'closed');
    } catch (caught) {
      setError(`${launch ? 'Fin de session' : 'Finalisation'} impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally {
      setBusyAction('');
    }
  }

  async function reopenSessionDossier() {
    if (!organization || !selectedSummary || !canReopen) return;
    const reason = window.prompt('Indique la raison de la réouverture :', 'Correction du dossier administratif');
    if (reason === null) return;
    const session = selectedSummary.session;
    setBusyAction(`reopen-${session.id}`);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const nextSessions = sessions.map((row) => row.id === session.id ? { ...row, status: 'in_progress' as const, closed_at: null, closed_by: null, reopened_at: new Date().toISOString() } : row);
        writeJsonStorage(`ncr-suite-training-sessions-${organization.id}`, nextSessions);
        setSessions(nextSessions);
      } else {
        const { error: rpcError } = await supabase.rpc('reopen_training_session', {
          p_organization_id: organization.id,
          p_session_id: session.id,
          p_reason: reason.trim() || null
        });
        if (rpcError) throw rpcError;
        await loadData();
      }
      setSuccess('La session est rouverte. Les pièces peuvent à nouveau être corrigées.');
      setTab('to_close');
    } catch (caught) {
      setError(`Réouverture impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally {
      setBusyAction('');
    }
  }

  async function generateDossierPdf(mode: 'preview' | 'download') {
    if (!organization || !selectedSummary) return;
    const session = selectedSummary.session;
    const target = prepareFileWindow(
      mode === 'preview' ? 'Dossier complet de formation' : 'Téléchargement du dossier',
      'NCR Suite rassemble la session, les participants, les émargements, les évaluations et les documents…'
    );
    setBusyAction(`pdf-${session.id}`);
    setError('');
    try {
      const { generateSessionDossierPdf } = await import('../features/training/sessionDossierPdf');
      const result = await generateSessionDossierPdf({
        organization,
        site: session.site_id ? sites.find((site) => site.id === session.site_id) ?? null : null,
        session,
        program: programMap.get(session.program_id) ?? null,
        trainer: session.trainer_id ? trainerMap.get(session.trainer_id) ?? null : null,
        trainees,
        enrollments: enrollments.filter((row) => row.session_id === session.id),
        attendance: attendance.filter((row) => row.session_id === session.id),
        satisfaction: satisfaction.filter((row) => row.session_id === session.id),
        documents: documents.filter((row) => row.session_id === session.id)
      });
      const buffer = result.bytes.buffer.slice(result.bytes.byteOffset, result.bytes.byteOffset + result.bytes.byteLength) as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
      if (mode === 'preview') navigateFileWindow(target, url);
      else showBlobDownload(target, url, result.filename, 'Dossier complet prêt');
      window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    } catch (caught) {
      closeFileWindow(target);
      setError(`Génération impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally {
      setBusyAction('');
    }
  }

  const selectedProgram = selectedSummary ? programMap.get(selectedSummary.session.program_id) ?? null : null;
  const selectedTrainer = selectedSummary?.session.trainer_id ? trainerMap.get(selectedSummary.session.trainer_id) ?? null : null;
  const selectedSite = selectedSummary?.session.site_id ? sites.find((site) => site.id === selectedSummary.session.site_id) ?? null : null;
  const groupedChecks = selectedSummary ? (Object.keys(groupLabels) as CheckGroup[]).map((group) => ({ group, checks: selectedSummary.checks.filter((check) => check.group === group) })) : [];

  if (organization && !dossierEnabled) {
    return <div className="page"><section className="panel training-dossier-locked"><Icon name="lock" size={30} /><div><p className="eyebrow">FORMATION · DOSSIER COMPLET</p><h1>Le pilotage centralisé n’est pas inclus dans cette offre</h1><p>Retrouve toutes les pièces d’une session, le contrôle de complétude et la clôture guidée avec l’offre Professionnelle ou Métier.</p></div><Link className="primary-button" to="/abonnement">Voir les offres</Link></section></div>;
  }

  return (
    <div className="page training-dossier-page training-workspace-premium">
      <header className="training-dossier-hero">
        <div className="training-dossier-hero-copy">
          <span className="training-dossier-hero-icon"><Icon name="clipboard" size={25} /></span>
          <div>
            <p className="eyebrow">FORMATION · PILOTAGE ADMINISTRATIF</p>
            <h1>Dossiers de formation</h1>
            <p>Chaque session réunie dans un espace clair : pièces commerciales, convocations, émargements, évaluations et attestations.</p>
          </div>
        </div>
        <div className="training-dossier-hero-actions">
          <button type="button" className="training-dossier-ghost-button" onClick={() => void loadData()} disabled={loading}><Icon name="activity" size={17} />Actualiser</button>
          <Link className="training-dossier-primary-button" to="/sessions"><Icon name="calendar" size={17} />Voir les sessions</Link>
        </div>
        <div className="training-dossier-metrics">
          <article><span><Icon name="briefcase" size={19} /></span><div><strong>{loading ? '…' : metrics.active}</strong><small>Dossiers actifs</small></div></article>
          <article><span><Icon name="chart" size={19} /></span><div><strong>{loading ? '…' : `${metrics.average} %`}</strong><small>Complétude moyenne</small></div></article>
          <article className="is-ready"><span><Icon name="check" size={19} /></span><div><strong>{loading ? '…' : metrics.ready}</strong><small>Prêts à clôturer</small></div></article>
          <article className={metrics.missing > 0 ? 'has-alert' : ''}><span><Icon name="alert" size={19} /></span><div><strong>{loading ? '…' : metrics.missing}</strong><small>Pièces manquantes</small></div></article>
        </div>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="training-dossier-commandbar" aria-label="Filtres des dossiers">
        <div className="training-dossier-tabs" role="tablist">
          {(Object.keys(tabLabels) as DossierTab[]).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => changeTab(item)}>
              {tabLabels[item]}<b>{tabCounts[item]}</b>
            </button>
          ))}
        </div>
        <label className="training-dossier-search"><Icon name="search" size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une session, un client…" /></label>
      </section>

      <section className="training-dossier-workspace">
        <aside className="training-dossier-list-panel">
          <div className="training-dossier-list-heading">
            <div><p className="eyebrow">{tabLabels[tab].toUpperCase()}</p><h2>{visibleSummaries.length} dossier{visibleSummaries.length > 1 ? 's' : ''}</h2></div>
            {activeSiteId && <span>{sites.find((site) => site.id === activeSiteId)?.name || 'Établissement'}</span>}
          </div>
          {loading ? <div className="training-dossier-empty"><span className="training-dossier-loader" /><strong>Analyse des dossiers…</strong><p>NCR Suite contrôle les pièces de chaque session.</p></div> : visibleSummaries.length === 0 ? <div className="training-dossier-empty"><Icon name="file" size={34} /><strong>Aucun dossier ici</strong><p>Change de filtre ou crée une nouvelle session de formation.</p></div> : (
            <div className="training-dossier-session-list">
              {visibleSummaries.map((summary) => {
                const session = summary.session;
                const program = programMap.get(session.program_id);
                const trainer = session.trainer_id ? trainerMap.get(session.trainer_id) : null;
                return <button key={session.id} type="button" className={`training-dossier-session-card ${selectedId === session.id ? 'selected' : ''} phase-${summary.phase}`} onClick={() => selectSummary(summary)}>
                  <span className="training-dossier-session-date"><strong>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(new Date(session.starts_at))}</strong><small>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(session.starts_at))}</small></span>
                  <span className="training-dossier-session-copy"><small>{program?.code || phaseLabel(summary.phase)}</small><strong>{session.title}</strong><em>{trainer ? personName(trainer.first_name, trainer.last_name) : 'Formateur à affecter'} · {summary.enrollmentCount} stagiaire{summary.enrollmentCount > 1 ? 's' : ''}</em></span>
                  <span className="training-dossier-session-progress"><i style={{ '--dossier-progress': `${summary.progress}%` } as CSSProperties}><b>{summary.progress}</b></i><small>{summary.missingCount ? `${summary.missingCount} manquante${summary.missingCount > 1 ? 's' : ''}` : 'Complet'}</small></span>
                </button>;
              })}
            </div>
          )}
        </aside>

        <section className="training-dossier-detail" ref={detailRef}>
          {!selectedSummary ? <div className="training-dossier-detail-empty"><Icon name="clipboard" size={42} /><h2>Sélectionne un dossier</h2><p>Le contrôle détaillé de la session apparaîtra ici.</p></div> : (
            <>
              <div className="training-dossier-detail-header">
                <div className="training-dossier-detail-title">
                  <div className="training-dossier-kicker"><span className={`training-dossier-phase phase-${selectedSummary.phase}`}>{phaseLabel(selectedSummary.phase)}</span><span>{sessionStatusLabels[selectedSummary.session.status]}</span></div>
                  <h2>{selectedSummary.session.title}</h2>
                  <p>{selectedProgram?.title || 'Programme à définir'} · {compactDateRange(selectedSummary.session)}</p>
                </div>
                <div className="training-dossier-progress-ring" style={{ '--dossier-progress': `${selectedSummary.progress}%` } as CSSProperties}><div><strong>{selectedSummary.progress}%</strong><small>complet</small></div></div>
              </div>

              <div className="training-dossier-facts">
                <article><span><Icon name="calendar" size={18} /></span><div><small>Dates</small><strong>{compactDateRange(selectedSummary.session)}</strong><p>{formatDateTime(selectedSummary.session.starts_at).split(' à ')[1] || 'Horaires définis'}</p></div></article>
                <article><span><Icon name="briefcase" size={18} /></span><div><small>Formateur</small><strong>{selectedTrainer ? personName(selectedTrainer.first_name, selectedTrainer.last_name) : 'À affecter'}</strong><p>{selectedSite?.name || selectedSummary.session.location || 'Site principal'}</p></div></article>
                <article><span><Icon name="users" size={18} /></span><div><small>Bénéficiaires</small><strong>{selectedSummary.enrollmentCount} / {selectedSummary.session.capacity}</strong><p>places occupées</p></div></article>
                <article><span><Icon name="building" size={18} /></span><div><small>Commanditaire</small><strong>{selectedSummary.customerName || 'À préciser'}</strong><p>{selectedSummary.funderName || selectedSummary.commercialReference || 'Sans financeur renseigné'}</p></div></article>
              </div>

              <div className="training-dossier-detail-grid">
                <main className="training-dossier-checklist">
                  {groupedChecks.map(({ group, checks }) => <section key={group} className="training-dossier-check-group">
                    <header><div><p className="eyebrow">{groupLabels[group].eyebrow}</p><h3>{groupLabels[group].title}</h3><span>{groupLabels[group].description}</span></div><b>{checks.filter((check) => check.state === 'ready').length}/{checks.filter((check) => check.required).length || checks.length}</b></header>
                    <div>{checks.map((check) => <article key={check.key} className={`training-dossier-check state-${check.state}`}>
                      <span className="training-dossier-check-icon"><Icon name={checkIcon(check)} size={18} /></span>
                      <div className="training-dossier-check-copy"><div><strong>{check.label}</strong><span>{checkStateLabel(check)}</span></div><p>{check.detail}</p>{check.expected > 1 && check.state !== 'not_required' && <div className="training-dossier-mini-progress"><i style={{ width: `${Math.min(100, Math.round((check.current / Math.max(check.expected, 1)) * 100))}%` }} /></div>}</div>
                      <div className="training-dossier-check-actions"><Link to={check.path}>Ouvrir <Icon name="chevronRight" size={14} /></Link>{check.requirementKey && canManage && <button type="button" disabled={busyAction === `settings-${selectedSummary.session.id}`} onClick={() => void toggleRequirement(check)}>{check.state === 'not_required' ? 'Rendre obligatoire' : 'Non requis'}</button>}</div>
                    </article>)}</div>
                  </section>)}
                </main>

                <aside className="training-dossier-sidepanel">
                  <section className="training-dossier-action-card">
                    <p className="eyebrow">SYNTHÈSE DU DOSSIER</p>
                    <h3>{selectedSummary.missingCount === 0 ? 'Dossier maîtrisé' : `${selectedSummary.missingCount} pièce${selectedSummary.missingCount > 1 ? 's' : ''} à traiter`}</h3>
                    <p>{selectedSummary.phase === 'preparation' ? 'Prépare les éléments nécessaires avant l’accueil des stagiaires.' : selectedSummary.phase === 'delivery' ? 'Les preuves de réalisation se complètent pendant la formation.' : selectedSummary.phase === 'closure' ? 'Finalise les preuves puis clôture la session.' : 'Le dossier reste consultable et peut être exporté.'}</p>
                    <div className="training-dossier-scoreline"><span><i style={{ width: `${selectedSummary.progress}%` }} /></span><b>{selectedSummary.readyCount}/{selectedSummary.requiredCount}</b></div>
                    <div className="training-dossier-pdf-actions"><button type="button" className="secondary-button" disabled={busyAction === `pdf-${selectedSummary.session.id}`} onClick={() => void generateDossierPdf('preview')}><Icon name="eye" size={16} />Visualiser le PDF</button><button type="button" className="secondary-button" disabled={busyAction === `pdf-${selectedSummary.session.id}`} onClick={() => void generateDossierPdf('download')}><Icon name="file" size={16} />Télécharger</button></div>
                    {(selectedSummary.canLaunchClosure || selectedSummary.canFinalize) && canManage && <button type="button" className="training-dossier-close-button" disabled={busyAction === `close-${selectedSummary.session.id}`} onClick={() => void closeSessionDossier()}><Icon name="check" size={17} />{busyAction === `close-${selectedSummary.session.id}` ? 'Traitement…' : selectedSummary.canLaunchClosure ? 'Terminer et lancer la clôture' : 'Finaliser le dossier'}</button>}
                    {selectedSummary.session.status === 'completed' && !selectedSummary.session.training_dossier_finalized_at && !selectedSummary.canFinalize && <div className="training-dossier-automation-note"><Icon name="refresh" size={16} /><span><strong>Clôture automatisée en cours</strong><small>Les évaluations finales, attestations et relances complètent ce dossier automatiquement.</small></span></div>}
                    {selectedSummary.phase === 'closed' && canReopen && <button type="button" className="training-dossier-reopen-button" disabled={busyAction === `reopen-${selectedSummary.session.id}`} onClick={() => void reopenSessionDossier()}><Icon name="activity" size={16} />Rouvrir la session</button>}
                  </section>

                  <section className="training-dossier-notes-card">
                    <div><span><Icon name="message" size={17} /></span><div><p className="eyebrow">NOTES INTERNES</p><h3>Suivi administratif</h3></div></div>
                    <textarea rows={6} value={notesDraft} disabled={!canManage} onChange={(event) => setNotesDraft(event.target.value)} placeholder="Décisions, pièces attendues, relance OPCO, particularités du dossier…" />
                    {canManage && <button type="button" className="primary-button" disabled={busyAction === `settings-${selectedSummary.session.id}`} onClick={() => void saveNotes()}>{busyAction === `settings-${selectedSummary.session.id}` ? 'Enregistrement…' : 'Enregistrer les notes'}</button>}
                    {selectedSummary.session.training_dossier_reviewed_at && <small>Dernière revue : {formatDateTime(selectedSummary.session.training_dossier_reviewed_at)}</small>}
                  </section>

                  <section className="training-dossier-shortcuts">
                    <p className="eyebrow">ACCÈS RAPIDES</p>
                    <Link to={`/sessions?focus=${selectedSummary.session.id}`}><Icon name="calendar" size={16} /><span>Modifier la session</span><Icon name="chevronRight" size={14} /></Link>
                    <Link to={`/documents?session=${selectedSummary.session.id}`}><Icon name="file" size={16} /><span>Bibliothèque documentaire</span><Icon name="chevronRight" size={14} /></Link>
                    <Link to={`/emargements?session=${selectedSummary.session.id}`}><Icon name="signature" size={16} /><span>Émargements</span><Icon name="chevronRight" size={14} /></Link>
                    <Link to={`/evaluations?session=${selectedSummary.session.id}`}><Icon name="chart" size={16} /><span>Évaluations</span><Icon name="chevronRight" size={14} /></Link>
                  </section>
                </aside>
              </div>
            </>
          )}
        </section>
      </section>
    </div>
  );
}
