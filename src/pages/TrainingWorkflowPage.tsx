import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatDateTime,
  personName,
  sessionStatusLabels,
  trainingCommercialDocumentTypeLabels,
  trainingProgramCompletion,
  type TrainingAttendanceRecord,
  type TrainingCommercialDocumentRecord,
  type TrainingDocumentRecord,
  type TrainingEnrollmentRecord,
  type TrainingProgramRecord,
  type TrainingProgramTrainerRecord,
  type TrainingSatisfactionRecord,
  type TrainingSessionRecord,
  type TrainingTraineeRecord,
  type TrainingTrainerRecord
} from '../features/training/types';
import { readJsonStorage, writeJsonStorage } from '../lib/safeStorage';
import { supabase } from '../lib/supabase';

type ConvertForm = {
  documentId: string;
  siteId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  trainerId: string;
  capacity: string;
  location: string;
  traineeIds: string[];
};

const PROGRAM_SELECT = 'id,organization_id,site_id,title,code,duration_hours,modality,objectives,description,audience,prerequisites,detailed_program,teaching_methods,training_resources,assessment_methods,accessibility,price_excl_tax_cents,vat_rate_basis_points,default_capacity,default_location,completion_status,status,created_at,updated_at';
const SESSION_SELECT = 'id,organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,capacity,location,modality,status,notes,closed_at,closed_by,closure_notes,reopened_at,reopened_by,source_commercial_document_id,validated_at,validated_by,training_dossier_requirements,training_dossier_notes,training_dossier_reviewed_at,training_dossier_reviewed_by,created_at';
const COMMERCIAL_SELECT = 'id,organization_id,site_id,customer_id,funder_id,session_id,trainee_id,program_id,document_type,reference,title,training_summary,participant_count,issue_date,valid_until,status,amount_excl_tax_cents,vat_rate_basis_points,tax_cents,amount_incl_tax_cents,notes,terms,sent_at,accepted_at,signed_at,signed_document_path,signed_document_received_at,signed_document_received_by,created_at,updated_at';

function toLocalParts(value: Date) {
  const pad = (number: number) => String(number).padStart(2, '0');
  return { date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`, time: `${pad(value.getHours())}:${pad(value.getMinutes())}` };
}

function nextWorkingStart() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

function suggestedSessionEnd(start: Date, durationHours: number) {
  const duration = Math.max(1, durationHours);
  if (duration < 7) return new Date(start.getTime() + duration * 60 * 60 * 1000);
  const end = new Date(start);
  const trainingDays = Math.max(1, Math.ceil(duration / 7));
  let remainingDays = trainingDays - 1;
  while (remainingDays > 0) {
    end.setDate(end.getDate() + 1);
    if (![0, 6].includes(end.getDay())) remainingDays -= 1;
  }
  end.setHours(17, 0, 0, 0);
  return end;
}

function readRows<T>(key: string) {
  return readJsonStorage<T[]>(key, []);
}

function workflowErrorMessage(caught: unknown) {
  if (caught instanceof Error && caught.message) return caught.message;
  if (caught && typeof caught === 'object' && 'message' in caught) {
    const message = String((caught as { message?: unknown }).message ?? '').trim();
    if (message) return message;
  }
  return 'erreur inconnue';
}

function statusTone(status: TrainingSessionRecord['status']) {
  if (status === 'completed') return 'complete';
  if (status === 'in_progress') return 'live';
  if (status === 'scheduled') return 'scheduled';
  if (status === 'canceled') return 'canceled';
  return 'draft';
}

export function TrainingWorkflowPage() {
  const { organization, sites, activeSiteId } = useOrganization();
  const { demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [programs, setPrograms] = useState<TrainingProgramRecord[]>([]);
  const [trainers, setTrainers] = useState<TrainingTrainerRecord[]>([]);
  const [programTrainers, setProgramTrainers] = useState<TrainingProgramTrainerRecord[]>([]);
  const [trainees, setTrainees] = useState<TrainingTraineeRecord[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRecord[]>([]);
  const [enrollments, setEnrollments] = useState<TrainingEnrollmentRecord[]>([]);
  const [commercials, setCommercials] = useState<TrainingCommercialDocumentRecord[]>([]);
  const [documents, setDocuments] = useState<TrainingDocumentRecord[]>([]);
  const [attendance, setAttendance] = useState<TrainingAttendanceRecord[]>([]);
  const [surveys, setSurveys] = useState<TrainingSatisfactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [convertForm, setConvertForm] = useState<ConvertForm | null>(null);
  const selectedSessionId = searchParams.get('session');
  const convertDocumentId = searchParams.get('convert');
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const usesSites = organization ? organizationHasFeature(organization, 'multi_site') : false;

  async function loadData() {
    if (!organization) return;
    setLoading(true); setError('');
    const organizationId = organization.id;
    if (demoMode || !supabase) {
      setPrograms(readRows<TrainingProgramRecord>(`ncr-suite-training-programs-${organizationId}`));
      setTrainers(readRows<TrainingTrainerRecord>(`ncr-suite-training-trainers-${organizationId}`));
      setProgramTrainers(readRows<TrainingProgramTrainerRecord>(`ncr-suite-training-program-trainers-${organizationId}`));
      setTrainees(readRows<TrainingTraineeRecord>(`ncr-suite-training-trainees-${organizationId}`));
      setSessions(readRows<TrainingSessionRecord>(`ncr-suite-training-sessions-${organizationId}`));
      setEnrollments(readRows<TrainingEnrollmentRecord>(`ncr-suite-training-enrollments-${organizationId}`));
      setCommercials(readRows<TrainingCommercialDocumentRecord>(`ncr-suite-training-commercial-${organizationId}`));
      setDocuments(readRows<TrainingDocumentRecord>(`ncr-suite-training-documents-${organizationId}`));
      setAttendance(readRows<TrainingAttendanceRecord>(`ncr-suite-training-attendance-${organizationId}`));
      setSurveys(readRows<TrainingSatisfactionRecord>(`ncr-suite-training-satisfaction-${organizationId}`));
      setLoading(false);
      return;
    }
    const [programResult, trainerResult, programTrainerResult, traineeResult, sessionResult, enrollmentResult, commercialResult, documentResult, attendanceResult, surveyResult] = await Promise.all([
      supabase.from('training_programs').select(PROGRAM_SELECT).eq('organization_id', organizationId).neq('status', 'archived').order('title'),
      supabase.from('training_trainers').select('id,organization_id,first_name,last_name,email,phone,specialties,notes,status,created_at').eq('organization_id', organizationId).eq('status', 'active').order('last_name'),
      supabase.from('training_program_trainers').select('organization_id,program_id,trainer_id,is_primary,created_at').eq('organization_id', organizationId),
      supabase.from('training_trainees').select('id,organization_id,first_name,last_name,email,phone,company,notes,status,created_at').eq('organization_id', organizationId).eq('status', 'active').order('last_name'),
      supabase.from('training_sessions').select(SESSION_SELECT).eq('organization_id', organizationId).order('starts_at', { ascending: false }),
      supabase.from('training_session_enrollments').select('organization_id,session_id,trainee_id,status').eq('organization_id', organizationId),
      supabase.from('training_commercial_documents').select(COMMERCIAL_SELECT).eq('organization_id', organizationId).order('created_at', { ascending: false }),
      supabase.from('training_documents').select('id,organization_id,site_id,session_id,program_id,trainee_id,title,category,storage_path,mime_type,size_bytes,visibility,status,notes,generated_automatically,automation_key,generated_at,emailed_at,created_at').eq('organization_id', organizationId).neq('status', 'archived'),
      supabase.from('training_attendance').select('id,organization_id,site_id,session_id,trainee_id,attendance_date,period,status,signature_path,signatory_name,signed_at,notes,created_at,updated_at').eq('organization_id', organizationId),
      supabase.from('training_satisfaction_surveys').select('id,organization_id,site_id,session_id,trainee_id,public_token,status,scheduled_for,emailed_at,completed_at,content_rating,trainer_rating,organization_rating,objectives_rating,recommend,comment,improvement,created_at,updated_at').eq('organization_id', organizationId)
    ]);
    const firstError = programResult.error || trainerResult.error || programTrainerResult.error || traineeResult.error || sessionResult.error || enrollmentResult.error || commercialResult.error || documentResult.error || attendanceResult.error || surveyResult.error;
    if (firstError) setError(`Chargement impossible : ${firstError.message}`);
    else {
      setPrograms((programResult.data ?? []).map((row) => ({ ...row, duration_hours: Number(row.duration_hours), price_excl_tax_cents: Number(row.price_excl_tax_cents), vat_rate_basis_points: Number(row.vat_rate_basis_points), default_capacity: Number(row.default_capacity) })) as TrainingProgramRecord[]);
      setTrainers((trainerResult.data ?? []) as TrainingTrainerRecord[]);
      setProgramTrainers((programTrainerResult.data ?? []) as TrainingProgramTrainerRecord[]);
      setTrainees((traineeResult.data ?? []) as TrainingTraineeRecord[]);
      setSessions((sessionResult.data ?? []) as TrainingSessionRecord[]);
      setEnrollments((enrollmentResult.data ?? []) as TrainingEnrollmentRecord[]);
      setCommercials((commercialResult.data ?? []).map((row) => ({ ...row, participant_count: Number(row.participant_count), amount_excl_tax_cents: Number(row.amount_excl_tax_cents), vat_rate_basis_points: Number(row.vat_rate_basis_points), tax_cents: Number(row.tax_cents), amount_incl_tax_cents: Number(row.amount_incl_tax_cents) })) as TrainingCommercialDocumentRecord[]);
      setDocuments((documentResult.data ?? []) as TrainingDocumentRecord[]);
      setAttendance((attendanceResult.data ?? []) as TrainingAttendanceRecord[]);
      setSurveys((surveyResult.data ?? []) as TrainingSatisfactionRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [organization?.id, demoMode]);

  const programById = useMemo(() => new Map(programs.map((row) => [row.id, row])), [programs]);
  const trainerById = useMemo(() => new Map(trainers.map((row) => [row.id, row])), [trainers]);
  const traineeById = useMemo(() => new Map(trainees.map((row) => [row.id, row])), [trainees]);
  const commercialById = useMemo(() => new Map(commercials.map((row) => [row.id, row])), [commercials]);

  const convertibleDocuments = useMemo(() => commercials.filter((row) => row.status === 'signed' && row.program_id && !row.session_id), [commercials]);
  const activeSessions = useMemo(() => sessions.filter((row) => row.status !== 'canceled').sort((a, b) => {
    const statusOrder = { draft: 0, in_progress: 1, scheduled: 2, completed: 3, canceled: 4 };
    return statusOrder[a.status] - statusOrder[b.status] || a.starts_at.localeCompare(b.starts_at);
  }), [sessions]);
  const selectedSession = useMemo(() => activeSessions.find((row) => row.id === selectedSessionId) ?? activeSessions[0] ?? null, [activeSessions, selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId && activeSessions[0]) setSearchParams((current) => { const next = new URLSearchParams(current); next.set('session', activeSessions[0].id); return next; }, { replace: true });
  }, [selectedSessionId, activeSessions, setSearchParams]);

  useEffect(() => {
    if (!convertDocumentId) { setConvertForm(null); return; }
    const document = commercials.find((row) => row.id === convertDocumentId);
    const program = document?.program_id ? programById.get(document.program_id) : null;
    if (!document || !program) return;
    const start = nextWorkingStart();
    const end = suggestedSessionEnd(start, program.duration_hours);
    const startParts = toLocalParts(start);
    const endParts = toLocalParts(end);
    setConvertForm({
      documentId: document.id,
      siteId: document.site_id ?? program.site_id ?? activeSiteId ?? sites.find((site) => site.status === 'active')?.id ?? '',
      startDate: startParts.date,
      startTime: startParts.time,
      endDate: endParts.date,
      endTime: endParts.time,
      trainerId: programTrainers.find((link) => link.program_id === program.id && link.is_primary)?.trainer_id
        ?? programTrainers.find((link) => link.program_id === program.id)?.trainer_id
        ?? '',
      capacity: String(Math.max(program.default_capacity, document.participant_count)),
      location: program.default_location ?? '',
      traineeIds: document.trainee_id ? [document.trainee_id] : []
    });
  }, [convertDocumentId, commercials, programById, programTrainers, activeSiteId, sites]);

  const pipeline = useMemo(() => ({
    programsReady: programs.filter((row) => trainingProgramCompletion(row).ready).length,
    proposals: commercials.filter((row) => ['draft', 'sent', 'accepted'].includes(row.status)).length,
    signed: convertibleDocuments.length,
    drafts: sessions.filter((row) => row.status === 'draft').length,
    live: sessions.filter((row) => row.status === 'in_progress').length,
    closure: sessions.filter((row) => row.status !== 'completed' && row.status !== 'canceled' && new Date(row.ends_at) < new Date()).length
  }), [programs, commercials, convertibleDocuments, sessions]);

  const sessionData = useMemo(() => {
    if (!selectedSession) return null;
    const sessionEnrollments = enrollments.filter((row) => row.session_id === selectedSession.id && row.status !== 'canceled');
    const sessionDocuments = documents.filter((row) => row.session_id === selectedSession.id);
    const sessionAttendance = attendance.filter((row) => row.session_id === selectedSession.id);
    const sessionSurveys = surveys.filter((row) => row.session_id === selectedSession.id);
    const commercial = selectedSession.source_commercial_document_id ? commercialById.get(selectedSession.source_commercial_document_id) ?? commercials.find((row) => row.session_id === selectedSession.id) ?? null : commercials.find((row) => row.session_id === selectedSession.id) ?? null;
    const convocationCount = sessionDocuments.filter((row) => row.category === 'convocation').length;
    const certificateCount = sessionDocuments.filter((row) => row.category === 'attestation').length;
    const signedAttendance = sessionAttendance.filter((row) => row.status === 'present' && row.signed_at).length;
    const completedSurveys = sessionSurveys.filter((row) => row.status === 'completed').length;
    const program = programById.get(selectedSession.program_id) ?? null;
    const programReady = program ? trainingProgramCompletion(program).ready : false;
    const isValidated = Boolean(selectedSession.validated_at) || selectedSession.status !== 'draft';
    const steps = [
      { key: 'commercial', label: 'Commercial', detail: commercial ? `${trainingCommercialDocumentTypeLabels[commercial.document_type]} ${commercial.reference} · ${commercial.status === 'completed' ? 'transformé' : commercial.status}` : 'Aucune proposition reliée', icon: 'creditCard' as const, state: commercial ? 'ready' : 'attention', path: '/commercial' },
      { key: 'participants', label: 'Participants', detail: `${sessionEnrollments.length} / ${selectedSession.capacity} inscrit${sessionEnrollments.length > 1 ? 's' : ''}`, icon: 'users' as const, state: sessionEnrollments.length > 0 ? 'ready' : 'attention', path: `/sessions?session=${selectedSession.id}` },
      { key: 'convocations', label: 'Validation & convocations', detail: isValidated ? `${convocationCount} convocation${convocationCount > 1 ? 's' : ''} disponible${convocationCount > 1 ? 's' : ''}` : 'Session encore en préparation', icon: 'file' as const, state: isValidated && convocationCount >= sessionEnrollments.length && sessionEnrollments.length > 0 ? 'ready' : isValidated ? 'progress' : 'attention', path: `/documents?session=${selectedSession.id}&category=convocation` },
      { key: 'initial', label: 'Évaluation initiale', detail: selectedSession.status === 'draft' ? 'Préparée après validation' : 'À réaliser au démarrage', icon: 'chart' as const, state: selectedSession.status === 'draft' ? 'upcoming' : 'progress', path: `/evaluations?session=${selectedSession.id}` },
      { key: 'attendance', label: 'Émargements', detail: `${signedAttendance} présence${signedAttendance > 1 ? 's' : ''} signée${signedAttendance > 1 ? 's' : ''}`, icon: 'signature' as const, state: signedAttendance > 0 ? 'progress' : selectedSession.status === 'completed' ? 'attention' : 'upcoming', path: `/emargements?session=${selectedSession.id}` },
      { key: 'final', label: 'Évaluation de fin', detail: `${completedSurveys} réponse${completedSurveys > 1 ? 's' : ''} reçue${completedSurveys > 1 ? 's' : ''}`, icon: 'chart' as const, state: completedSurveys >= sessionEnrollments.length && sessionEnrollments.length > 0 ? 'ready' : selectedSession.status === 'completed' ? 'attention' : 'upcoming', path: `/evaluations?session=${selectedSession.id}` },
      { key: 'certificates', label: 'Attestations', detail: `${certificateCount} attestation${certificateCount > 1 ? 's' : ''}`, icon: 'graduation' as const, state: certificateCount >= sessionEnrollments.length && sessionEnrollments.length > 0 ? 'ready' : selectedSession.status === 'completed' ? 'progress' : 'upcoming', path: `/attestations?session=${selectedSession.id}` },
      { key: 'dossier', label: 'Dossier complet', detail: selectedSession.status === 'completed' ? 'Contrôle final disponible' : 'Se complète au fil du parcours', icon: 'clipboard' as const, state: selectedSession.status === 'completed' ? 'progress' : 'upcoming', path: `/dossiers-formation?session=${selectedSession.id}` }
    ];
    return { sessionEnrollments, sessionDocuments, commercial, convocationCount, certificateCount, signedAttendance, completedSurveys, program, programReady, isValidated, steps };
  }, [selectedSession, enrollments, documents, attendance, surveys, commercialById, commercials, programById]);

  function toggleTrainee(id: string) {
    setConvertForm((current) => current ? { ...current, traineeIds: current.traineeIds.includes(id) ? current.traineeIds.filter((value) => value !== id) : [...current.traineeIds, id] } : current);
  }

  async function convertToSession(event: FormEvent) {
    event.preventDefault();
    if (!organization || !convertForm || !canManage) return;
    const document = commercialById.get(convertForm.documentId);
    if (!document) return;
    const startsAt = new Date(`${convertForm.startDate}T${convertForm.startTime}:00`);
    const endsAt = new Date(`${convertForm.endDate}T${convertForm.endTime}:00`);
    const capacity = Number(convertForm.capacity);
    if (usesSites && !convertForm.siteId) { setError('Sélectionne un établissement actif.'); return; }
    if (!convertForm.trainerId) { setError('Sélectionne un formateur.'); return; }
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) { setError('Les dates de session sont invalides.'); return; }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) { setError('La capacité est invalide.'); return; }
    if (convertForm.traineeIds.length === 0) { setError('Ajoute au moins un stagiaire.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      let sessionId = '';
      if (demoMode || !supabase) {
        const program = document.program_id ? programById.get(document.program_id) : null;
        if (!program) throw new Error('Formation introuvable.');
        sessionId = crypto.randomUUID();
        const created: TrainingSessionRecord = {
          id: sessionId, organization_id: organization.id, site_id: usesSites ? convertForm.siteId : null, program_id: program.id, trainer_id: convertForm.trainerId,
          title: program.title, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), capacity, location: convertForm.location || program.default_location,
          modality: program.modality, status: 'draft', notes: `Créée depuis ${document.reference}`, source_commercial_document_id: document.id,
          validated_at: null, validated_by: null, created_at: new Date().toISOString()
        };
        const nextSessions = [created, ...sessions];
        const nextEnrollments = [...enrollments, ...convertForm.traineeIds.map((traineeId) => ({ organization_id: organization.id, session_id: sessionId, trainee_id: traineeId, status: 'confirmed' as const }))];
        const nextCommercials = commercials.map((row) => row.id === document.id ? { ...row, session_id: sessionId, status: 'completed' as const } : row);
        writeJsonStorage(`ncr-suite-training-sessions-${organization.id}`, nextSessions);
        writeJsonStorage(`ncr-suite-training-enrollments-${organization.id}`, nextEnrollments);
        writeJsonStorage(`ncr-suite-training-commercial-${organization.id}`, nextCommercials);
        setSessions(nextSessions); setEnrollments(nextEnrollments); setCommercials(nextCommercials);
      } else {
        const { data, error: rpcError } = await supabase.rpc('create_training_session_from_commercial', {
          p_organization_id: organization.id,
          p_document_id: document.id,
          p_site_id: usesSites ? convertForm.siteId : null,
          p_starts_at: startsAt.toISOString(),
          p_ends_at: endsAt.toISOString(),
          p_trainer_id: convertForm.trainerId,
          p_capacity: capacity,
          p_location: convertForm.location,
          p_trainee_ids: convertForm.traineeIds
        });
        if (rpcError) throw rpcError;
        sessionId = String((data as { session_id?: string } | null)?.session_id ?? '');
        if (!sessionId) throw new Error('La session créée n’a pas été retournée.');
        await loadData();
      }
      setConvertForm(null);
      setSearchParams({ session: sessionId });
      setSuccess('La proposition signée a été transformée en session en préparation.');
    } catch (caught) { setError(`Création impossible : ${workflowErrorMessage(caught)}`); }
    finally { setSaving(false); }
  }

  async function validateSession(session: TrainingSessionRecord) {
    if (!organization || !canManage || !window.confirm('Valider cette session et préparer l’envoi des convocations à tous les stagiaires ?')) return;
    setBusyId(session.id); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const next = sessions.map((row) => row.id === session.id ? { ...row, status: 'scheduled' as const, validated_at: new Date().toISOString(), validated_by: 'demo' } : row);
        writeJsonStorage(`ncr-suite-training-sessions-${organization.id}`, next); setSessions(next);
      } else {
        const { data, error: rpcError } = await supabase.rpc('validate_training_session_workflow', { p_organization_id: organization.id, p_session_id: session.id, p_send_convocations: true });
        if (rpcError) throw rpcError;
        const queued = Number((data as { convocations_queued?: number } | null)?.convocations_queued ?? 0);
        setSuccess(`Session validée. ${queued} convocation${queued > 1 ? 's ont' : ' a'} été mise${queued > 1 ? 's' : ''} en file d’envoi Brevo.`);
        await loadData();
      }
      if (demoMode || !supabase) setSuccess('Session validée. Les convocations seront préparées par le processeur d’e-mails.');
    } catch (caught) { setError(`Validation impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setBusyId(''); }
  }

  if (!organization) return null;

  return <div className="page training-workflow-page">
    <section className="training-workflow-hero">
      <div className="training-workflow-hero-main"><span><Icon name="sparkles" size={25} /></span><div><p className="eyebrow">FORMATION · PARCOURS UNIFIÉ</p><h1>Du programme au dossier complet</h1><p>Un seul espace pour suivre la formation, la proposition signée, les stagiaires, la validation de session et chaque étape administrative.</p></div></div>
      <div className="training-workflow-hero-actions"><Link className="secondary-button" to="/profil-organisme"><Icon name="building" size={17} />Profil organisme</Link><Link className="primary-button" to="/formations?new=1"><Icon name="plus" size={17} />Nouvelle formation</Link></div>
      <div className="training-workflow-pipeline">
        <article><span>01</span><div><strong>{pipeline.programsReady}</strong><small>formations prêtes</small></div></article>
        <article><span>02</span><div><strong>{pipeline.proposals}</strong><small>propositions ouvertes</small></div></article>
        <article className={pipeline.signed ? 'attention' : ''}><span>03</span><div><strong>{pipeline.signed}</strong><small>signées à convertir</small></div></article>
        <article className={pipeline.drafts ? 'attention' : ''}><span>04</span><div><strong>{pipeline.drafts}</strong><small>sessions à valider</small></div></article>
        <article><span>05</span><div><strong>{pipeline.live}</strong><small>en cours</small></div></article>
        <article className={pipeline.closure ? 'attention' : ''}><span>06</span><div><strong>{pipeline.closure}</strong><small>à clôturer</small></div></article>
      </div>
    </section>

    {error && <div className="error-message page-message" role="alert">{error}</div>}
    {success && <div className="success-message page-message" role="status">{success}</div>}

    {convertForm && (() => {
      const document = commercialById.get(convertForm.documentId);
      const program = document?.program_id ? programById.get(document.program_id) : null;
      return <section className="panel training-convert-panel"><header><div><p className="eyebrow">PROPOSITION SIGNÉE</p><h2>Créer la session</h2><p>{document?.reference} · {program?.title}</p></div><button type="button" className="secondary-button compact-button" onClick={() => { setConvertForm(null); setSearchParams({}); }}>Fermer</button></header><form onSubmit={convertToSession}>
        <div className="training-form-grid">
          <label>Date de début<input type="date" required value={convertForm.startDate} onChange={(event) => setConvertForm({ ...convertForm, startDate: event.target.value })} /></label>
          <label>Heure de début<input type="time" required value={convertForm.startTime} onChange={(event) => setConvertForm({ ...convertForm, startTime: event.target.value })} /></label>
          <label>Date de fin<input type="date" required value={convertForm.endDate} onChange={(event) => setConvertForm({ ...convertForm, endDate: event.target.value })} /></label>
          <label>Heure de fin<input type="time" required value={convertForm.endTime} onChange={(event) => setConvertForm({ ...convertForm, endTime: event.target.value })} /></label>
          {usesSites && <label>Établissement *<select required value={convertForm.siteId} onChange={(event) => setConvertForm({ ...convertForm, siteId: event.target.value })}><option value="">Sélectionner</option>{sites.filter((site) => site.status === 'active').map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
          <label>Formateur *<select required value={convertForm.trainerId} onChange={(event) => setConvertForm({ ...convertForm, trainerId: event.target.value })}><option value="">Sélectionner</option>{trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{personName(trainer.first_name, trainer.last_name)}</option>)}</select></label>
          <label>Capacité<input type="number" min="1" max="500" value={convertForm.capacity} onChange={(event) => setConvertForm({ ...convertForm, capacity: event.target.value })} /></label>
          <label className="full-field">Lieu / accès<input value={convertForm.location} onChange={(event) => setConvertForm({ ...convertForm, location: event.target.value })} /></label>
        </div>
        <div className="training-convert-trainees"><div className="training-convert-trainees-head"><div><p className="eyebrow">PARTICIPANTS</p><h3>Ajouter les stagiaires validés</h3></div><div><Link className="secondary-button compact-button" to="/stagiaires?new=1" target="_blank" rel="noreferrer"><Icon name="plus" size={14} />Nouveau stagiaire</Link><button className="secondary-button compact-button" type="button" onClick={() => void loadData()}><Icon name="refresh" size={14} />Actualiser</button></div></div><div>{trainees.length === 0 ? <div className="training-empty compact"><strong>Aucun stagiaire actif</strong><span>Crée le stagiaire validé puis actualise cette liste.</span></div> : trainees.map((trainee) => <label key={trainee.id} className={convertForm.traineeIds.includes(trainee.id) ? 'selected' : ''}><input type="checkbox" checked={convertForm.traineeIds.includes(trainee.id)} onChange={() => toggleTrainee(trainee.id)} /><span>{personName(trainee.first_name, trainee.last_name)}</span><small>{trainee.email || 'E-mail à compléter'}</small></label>)}</div></div>
        <footer><p><Icon name="check" size={17} /><span>La session sera créée en préparation. Rien ne sera envoyé avant ta validation finale.</span></p><button className="primary-button" disabled={saving}>{saving ? 'Création…' : 'Créer la session en préparation'}</button></footer>
      </form></section>;
    })()}

    <section className="training-workflow-layout">
      <aside className="panel training-workflow-session-panel">
        <header><div><p className="eyebrow">SESSIONS</p><h2>{activeSessions.length} dossier{activeSessions.length > 1 ? 's' : ''}</h2></div><Link to="/sessions?new=1" aria-label="Créer une session"><Icon name="plus" size={18} /></Link></header>
        {convertibleDocuments.length > 0 && <div className="training-workflow-signed-box"><div><Icon name="signature" size={18} /><span><strong>{convertibleDocuments.length} proposition{convertibleDocuments.length > 1 ? 's' : ''} signée{convertibleDocuments.length > 1 ? 's' : ''}</strong><small>Prête{convertibleDocuments.length > 1 ? 's' : ''} à devenir une session</small></span></div>{convertibleDocuments.map((row) => <button key={row.id} type="button" onClick={() => setSearchParams({ convert: row.id })}>{row.reference}<Icon name="chevronRight" size={15} /></button>)}</div>}
        <div className="training-workflow-session-list">{loading ? <div className="training-empty compact">Chargement…</div> : activeSessions.length === 0 ? <div className="training-empty compact"><Icon name="calendar" size={26} /><strong>Aucune session</strong><span>Transforme une proposition signée ou crée une session manuellement.</span></div> : activeSessions.map((session) => {
          const count = enrollments.filter((row) => row.session_id === session.id && row.status !== 'canceled').length;
          return <button key={session.id} type="button" className={`${selectedSession?.id === session.id ? 'active' : ''} ${statusTone(session.status)}`} onClick={() => setSearchParams({ session: session.id })}><span className="training-workflow-session-date"><b>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(new Date(session.starts_at))}</b><small>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(session.starts_at)).replace('.', '')}</small></span><span><small>{sessionStatusLabels[session.status]}</small><strong>{session.title}</strong><em>{count} participant{count > 1 ? 's' : ''}</em></span><Icon name="chevronRight" size={16} /></button>;
        })}</div>
      </aside>

      <main className="panel training-workflow-cockpit">
        {!selectedSession || !sessionData ? <div className="training-empty"><Icon name="clipboard" size={31} /><strong>Sélectionne une session</strong><span>Le cockpit affichera le parcours complet et la prochaine action.</span></div> : <>
          <header className="training-workflow-cockpit-head"><div><p className="eyebrow">COCKPIT DE SESSION</p><h2>{selectedSession.title}</h2><p>{formatDateTime(selectedSession.starts_at)} → {formatDateTime(selectedSession.ends_at)}</p><div><span className={`status-chip ${statusTone(selectedSession.status)}`}>{sessionStatusLabels[selectedSession.status]}</span>{selectedSession.location && <span><Icon name="map" size={13} />{selectedSession.location}</span>}{selectedSession.trainer_id && <span><Icon name="briefcase" size={13} />{personName(trainerById.get(selectedSession.trainer_id)?.first_name ?? '', trainerById.get(selectedSession.trainer_id)?.last_name ?? '')}</span>}</div></div><div className="training-workflow-cockpit-score"><strong>{sessionData.steps.filter((step) => step.state === 'ready').length}/{sessionData.steps.length}</strong><small>étapes prêtes</small></div></header>

          {selectedSession.status === 'draft' && <section className="training-workflow-next-action"><span><Icon name="sparkles" size={21} /></span><div><p className="eyebrow">PROCHAINE ACTION</p><h3>Valider la session et envoyer les convocations</h3><p>NCR Suite contrôle la fiche formation, le formateur, les stagiaires et leurs adresses e-mail avant de lancer la génération automatique.</p>{!sessionData.programReady && <Link to={`/formations?edit=${encodeURIComponent(selectedSession.program_id)}`}>Compléter la fiche formation <Icon name="chevronRight" size={14} /></Link>}</div><button type="button" className="primary-button" disabled={busyId === selectedSession.id || !sessionData.programReady || sessionData.sessionEnrollments.length === 0} onClick={() => void validateSession(selectedSession)}>{busyId === selectedSession.id ? 'Validation…' : 'Valider et envoyer'}</button></section>}

          <div className="training-workflow-facts"><article><span><Icon name="graduation" size={17} /></span><div><small>Formation</small><strong>{sessionData.program?.title || 'Introuvable'}</strong></div></article><article><span><Icon name="users" size={17} /></span><div><small>Participants</small><strong>{sessionData.sessionEnrollments.length} / {selectedSession.capacity}</strong></div></article><article><span><Icon name="creditCard" size={17} /></span><div><small>Origine</small><strong>{sessionData.commercial?.reference || 'Session directe'}</strong></div></article><article><span><Icon name="check" size={17} /></span><div><small>Validation</small><strong>{selectedSession.validated_at ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(selectedSession.validated_at)) : 'En attente'}</strong></div></article></div>

          <div className="training-workflow-steps">{sessionData.steps.map((step, index) => <Link key={step.key} to={step.path} className={`training-workflow-step ${step.state}`}><span className="training-workflow-step-index">{String(index + 1).padStart(2, '0')}</span><span className="training-workflow-step-icon"><Icon name={step.icon} size={18} /></span><span className="training-workflow-step-copy"><small>{step.label}</small><strong>{step.detail}</strong></span><span className="training-workflow-step-state">{step.state === 'ready' ? <Icon name="check" size={15} /> : step.state === 'attention' ? <Icon name="alert" size={15} /> : <Icon name="chevronRight" size={15} />}</span></Link>)}</div>

          <footer className="training-workflow-cockpit-footer"><Link to={`/dossiers-formation?session=${selectedSession.id}`} className="primary-button"><Icon name="clipboard" size={16} />Ouvrir le dossier complet</Link><Link to={`/sessions?session=${selectedSession.id}`} className="secondary-button">Voir la session</Link></footer>
        </>}
      </main>
    </section>
  </div>;
}
