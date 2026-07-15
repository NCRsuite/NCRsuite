import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatDateTime,
  modalityLabels,
  nullableText,
  personName,
  sessionStatusLabels,
  type TrainingAttendanceRecord,
  type TrainingDocumentRecord,
  type TrainingEnrollmentRecord,
  type TrainingModality,
  type TrainingProgramRecord,
  type TrainingSessionRecord,
  type TrainingSessionStatus,
  type TrainingSatisfactionRecord,
  type TrainingTraineeRecord,
  type TrainingTrainerRecord
} from '../features/training/types';
import { closeFileWindow, navigateFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initialForm() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    programId: '', trainerId: '', title: '', startDate: dateInputValue(tomorrow), endDate: dateInputValue(tomorrow),
    startTime: '09:00', endTime: '17:00', capacity: '12', location: '', modality: 'presentiel' as TrainingModality,
    status: 'scheduled' as TrainingSessionStatus, notes: '', siteId: '', traineeIds: [] as string[]
  };
}

type FormState = ReturnType<typeof initialForm>;
type SessionView = 'planned' | 'current' | 'closed' | 'canceled';

interface SessionClosureCheck {
  session_id: string;
  session_status: TrainingSessionStatus;
  session_ended: boolean;
  trainer_assigned: boolean;
  enrollment_count: number;
  digital_attendance_required: boolean;
  expected_attendance: number;
  completed_attendance: number;
  missing_attendance: number;
  documents_count: number;
  attestations_count: number;
  can_close: boolean;
  blockers: string[];
}

function sessionViewFor(session: TrainingSessionRecord): SessionView {
  if (session.status === 'completed') return 'closed';
  if (session.status === 'canceled') return 'canceled';
  if (session.status === 'in_progress' || new Date(session.starts_at).getTime() <= Date.now()) return 'current';
  return 'planned';
}

function inclusiveSessionDays(session: TrainingSessionRecord) {
  const start = new Date(session.starts_at); const end = new Date(session.ends_at);
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(1, Math.floor((endUtc - startUtc) / 86_400_000) + 1);
}

export function TrainingSessionsPage() {
  const { organization, sites, activeSiteId } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState<TrainingSessionRecord[]>([]);
  const [programs, setPrograms] = useState<TrainingProgramRecord[]>([]);
  const [trainers, setTrainers] = useState<TrainingTrainerRecord[]>([]);
  const [trainees, setTrainees] = useState<TrainingTraineeRecord[]>([]);
  const [enrollments, setEnrollments] = useState<TrainingEnrollmentRecord[]>([]);
  const [documents, setDocuments] = useState<TrainingDocumentRecord[]>([]);
  const [attendance, setAttendance] = useState<TrainingAttendanceRecord[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionView, setSessionView] = useState<SessionView>('current');
  const [dossierBusyId, setDossierBusyId] = useState('');
  const [closureBusyId, setClosureBusyId] = useState('');
  const [closureSession, setClosureSession] = useState<TrainingSessionRecord | null>(null);
  const [closureCheck, setClosureCheck] = useState<SessionClosureCheck | null>(null);
  const [closureNotes, setClosureNotes] = useState('');
  const formOpen = searchParams.get('new') === '1';

  useEffect(() => {
    setForm((current) => ({ ...current, siteId: current.siteId || activeSiteId || sites[0]?.id || '' }));
  }, [activeSiteId, sites]);

  async function loadData() {
    if (!organization) return;
    setLoading(true);
    setError('');

    if (demoMode || !supabase) {
      const get = <T,>(key: string) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) as T : [] as T;
      };
      setSessions(get<TrainingSessionRecord[]>(`ncr-suite-training-sessions-${organization.id}`));
      setPrograms(get<TrainingProgramRecord[]>(`ncr-suite-training-programs-${organization.id}`));
      setTrainers(get<TrainingTrainerRecord[]>(`ncr-suite-training-trainers-${organization.id}`));
      setTrainees(get<TrainingTraineeRecord[]>(`ncr-suite-training-trainees-${organization.id}`));
      setEnrollments(get<TrainingEnrollmentRecord[]>(`ncr-suite-training-enrollments-${organization.id}`));
      setDocuments(get<TrainingDocumentRecord[]>(`ncr-suite-training-documents-${organization.id}`));
      setAttendance(get<TrainingAttendanceRecord[]>(`ncr-suite-training-attendance-${organization.id}`));
      setLoading(false);
      return;
    }

    let sessionsQuery = supabase
      .from('training_sessions')
      .select('id,organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,capacity,location,modality,status,notes,closed_at,closed_by,closure_notes,reopened_at,reopened_by,created_at')
      .eq('organization_id', organization.id)
      .order('starts_at', { ascending: true });
    let programsQuery = supabase
      .from('training_programs')
      .select('id,organization_id,site_id,title,code,duration_hours,modality,objectives,description,status,created_at')
      .eq('organization_id', organization.id)
      .eq('status', 'active')
      .order('title');
    if (activeSiteId) {
      sessionsQuery = sessionsQuery.eq('site_id', activeSiteId);
      programsQuery = programsQuery.eq('site_id', activeSiteId);
    }

    const [sessionsResult, programsResult, trainersResult, traineesResult, enrollmentsResult, documentsResult, attendanceResult] = await Promise.all([
      sessionsQuery,
      programsQuery,
      supabase.from('training_trainers').select('id,organization_id,first_name,last_name,email,phone,specialties,notes,status,created_at').eq('organization_id', organization.id).eq('status', 'active').order('last_name'),
      supabase.from('training_trainees').select('id,organization_id,first_name,last_name,email,phone,company,notes,status,created_at').eq('organization_id', organization.id).eq('status', 'active').order('last_name'),
      supabase.from('training_session_enrollments').select('organization_id,session_id,trainee_id,status').eq('organization_id', organization.id),
      supabase.from('training_documents').select('id,organization_id,site_id,session_id,program_id,trainee_id,title,category,storage_path,mime_type,size_bytes,visibility,status,notes,generated_automatically,automation_key,generated_at,emailed_at,created_at').eq('organization_id', organization.id).neq('status', 'archived'),
      supabase.from('training_attendance').select('id,organization_id,site_id,session_id,trainee_id,attendance_date,period,status,signature_path,signatory_name,signed_at,notes,created_at,updated_at').eq('organization_id', organization.id)
    ]);

    const firstError = sessionsResult.error || programsResult.error || trainersResult.error || traineesResult.error || enrollmentsResult.error || documentsResult.error || attendanceResult.error;
    if (firstError) setError(`Chargement impossible : ${firstError.message}`);
    else {
      setSessions((sessionsResult.data ?? []) as TrainingSessionRecord[]);
      setPrograms((programsResult.data ?? []).map((row) => ({ ...row, duration_hours: Number(row.duration_hours) })) as TrainingProgramRecord[]);
      setTrainers((trainersResult.data ?? []) as TrainingTrainerRecord[]);
      setTrainees((traineesResult.data ?? []) as TrainingTraineeRecord[]);
      setEnrollments((enrollmentsResult.data ?? []) as TrainingEnrollmentRecord[]);
      setDocuments((documentsResult.data ?? []).map((row) => ({ ...row, size_bytes: row.size_bytes ? Number(row.size_bytes) : null })) as TrainingDocumentRecord[]);
      setAttendance((attendanceResult.data ?? []) as TrainingAttendanceRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [organization?.id, activeSiteId, demoMode]);

  const sessionGroups = useMemo(() => ({
    planned: sessions.filter((session) => sessionViewFor(session) === 'planned'),
    current: sessions.filter((session) => sessionViewFor(session) === 'current'),
    closed: sessions.filter((session) => sessionViewFor(session) === 'closed').sort((a, b) => (b.closed_at || b.ends_at).localeCompare(a.closed_at || a.ends_at)),
    canceled: sessions.filter((session) => sessionViewFor(session) === 'canceled')
  }), [sessions]);
  const filteredSessions = sessionGroups[sessionView];
  const programMap = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);
  const trainerMap = useMemo(() => new Map(trainers.map((trainer) => [trainer.id, trainer])), [trainers]);
  const enrollmentCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const enrollment of enrollments) {
      if (enrollment.status === 'canceled') continue;
      map.set(enrollment.session_id, (map.get(enrollment.session_id) ?? 0) + 1);
    }
    return map;
  }, [enrollments]);
  const documentCounts = useMemo(() => {
    const map = new Map<string, { total: number; attestations: number }>();
    for (const document of documents) {
      if (!document.session_id || document.status === 'archived') continue;
      const current = map.get(document.session_id) ?? { total: 0, attestations: 0 };
      current.total += 1;
      if (document.category === 'attestation') current.attestations += 1;
      map.set(document.session_id, current);
    }
    return map;
  }, [documents]);

  function toggleTrainee(id: string) {
    setForm((current) => ({
      ...current,
      traineeIds: current.traineeIds.includes(id) ? current.traineeIds.filter((value) => value !== id) : [...current.traineeIds, id]
    }));
  }

  function selectProgram(programId: string) {
    const program = programs.find((row) => row.id === programId);
    setForm((current) => ({
      ...current,
      programId,
      title: current.title || program?.title || '',
      modality: program?.modality || current.modality,
      siteId: program?.site_id || current.siteId
    }));
  }

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !user) return;
    if (!form.programId) { setError('Sélectionne une formation.'); return; }
    if (organizationHasFeature(organization, 'multi_site') && !form.siteId) { setError('Sélectionne un établissement.'); return; }
    const startsAt = new Date(`${form.startDate}T${form.startTime}:00`);
    const endsAt = new Date(`${form.endDate}T${form.endTime}:00`);
    const capacity = Number(form.capacity);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) { setError('Les dates et horaires sont invalides.'); return; }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) { setError('La capacité doit être comprise entre 1 et 500.'); return; }
    if (form.traineeIds.length > capacity) { setError('Le nombre de stagiaires dépasse la capacité.'); return; }

    setSaving(true); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const created: TrainingSessionRecord = {
          id: crypto.randomUUID(), organization_id: organization.id, site_id: organizationHasFeature(organization, 'multi_site') ? form.siteId : null,
          program_id: form.programId, trainer_id: form.trainerId || null, title: form.title.trim(), starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(), capacity, location: nullableText(form.location), modality: form.modality, status: form.status,
          notes: nullableText(form.notes), created_at: new Date().toISOString()
        };
        const nextSessions = [...sessions, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
        const createdEnrollments = form.traineeIds.map((traineeId) => ({ organization_id: organization.id, session_id: created.id, trainee_id: traineeId, status: 'registered' as const }));
        const nextEnrollments = [...enrollments, ...createdEnrollments];
        localStorage.setItem(`ncr-suite-training-sessions-${organization.id}`, JSON.stringify(nextSessions));
        localStorage.setItem(`ncr-suite-training-enrollments-${organization.id}`, JSON.stringify(nextEnrollments));
        setSessions(nextSessions); setEnrollments(nextEnrollments);
      } else {
        const { error: rpcError } = await supabase.rpc('create_training_session', {
          p_organization_id: organization.id,
          p_site_id: organizationHasFeature(organization, 'multi_site') ? form.siteId : null,
          p_program_id: form.programId,
          p_trainer_id: form.trainerId || null,
          p_title: form.title.trim() || programMap.get(form.programId)?.title || 'Session de formation',
          p_starts_at: startsAt.toISOString(),
          p_ends_at: endsAt.toISOString(),
          p_capacity: capacity,
          p_location: nullableText(form.location),
          p_modality: form.modality,
          p_status: form.status,
          p_notes: nullableText(form.notes),
          p_trainee_ids: form.traineeIds
        });
        if (rpcError) throw rpcError;
        await loadData();
      }
      setForm({ ...initialForm(), siteId: activeSiteId || sites[0]?.id || '' });
      setSearchParams({}); setSuccess('La session a bien été créée.');
    } catch (caught) {
      setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function generateSessionDossier(session: TrainingSessionRecord, mode: 'preview' | 'download') {
    if (!organization || !organizationHasFeature(organization, 'training_session_dossier')) return;
    const fileWindow = prepareFileWindow(
      mode === 'preview' ? 'Dossier complet de session' : 'Téléchargement du dossier de session',
      'NCR Suite rassemble les participants, émargements, évaluations et documents…'
    );
    setDossierBusyId(session.id); setError(''); setSuccess('');
    try {
      let attendance: TrainingAttendanceRecord[] = [];
      let satisfaction: TrainingSatisfactionRecord[] = [];
      if (demoMode || !supabase) {
        const storedAttendance = localStorage.getItem(`ncr-suite-training-attendance-${organization.id}`);
        const storedSatisfaction = localStorage.getItem(`ncr-suite-training-satisfaction-${organization.id}`);
        attendance = (storedAttendance ? JSON.parse(storedAttendance) as TrainingAttendanceRecord[] : []).filter((item) => item.session_id === session.id);
        satisfaction = (storedSatisfaction ? JSON.parse(storedSatisfaction) as TrainingSatisfactionRecord[] : []).filter((item) => item.session_id === session.id);
      } else {
        const [attendanceResult, satisfactionResult] = await Promise.all([
          supabase.from('training_attendance').select('id,organization_id,site_id,session_id,trainee_id,attendance_date,period,status,signature_path,signatory_name,signed_at,notes,created_at,updated_at').eq('organization_id', organization.id).eq('session_id', session.id),
          supabase.from('training_satisfaction_surveys').select('id,organization_id,site_id,session_id,trainee_id,public_token,status,scheduled_for,emailed_at,completed_at,content_rating,trainer_rating,organization_rating,objectives_rating,recommend,comment,improvement,created_at,updated_at').eq('organization_id', organization.id).eq('session_id', session.id)
        ]);
        const queryError = attendanceResult.error || satisfactionResult.error;
        if (queryError) throw queryError;
        attendance = (attendanceResult.data ?? []) as TrainingAttendanceRecord[];
        satisfaction = (satisfactionResult.data ?? []) as TrainingSatisfactionRecord[];
      }

      const { generateSessionDossierPdf } = await import('../features/training/sessionDossierPdf');
      const result = await generateSessionDossierPdf({
        organization,
        site: session.site_id ? sites.find((site) => site.id === session.site_id) ?? null : null,
        session,
        program: programMap.get(session.program_id) ?? null,
        trainer: session.trainer_id ? trainerMap.get(session.trainer_id) ?? null : null,
        trainees,
        enrollments: enrollments.filter((item) => item.session_id === session.id),
        attendance,
        satisfaction,
        documents: documents.filter((item) => item.session_id === session.id)
      });
      const buffer = result.bytes.buffer.slice(result.bytes.byteOffset, result.bytes.byteOffset + result.bytes.byteLength) as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
      if (mode === 'preview') navigateFileWindow(fileWindow, url);
      else showBlobDownload(fileWindow, url, result.filename, 'Dossier complet prêt');
      window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
      setSuccess(mode === 'preview' ? 'Le dossier complet de la session est ouvert.' : 'Le dossier complet est prêt au téléchargement.');
    } catch (caught) {
      closeFileWindow(fileWindow);
      setError(`Dossier impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setDossierBusyId(''); }
  }

  async function prepareClosure(session: TrainingSessionRecord) {
    if (!organization) return;
    setClosureBusyId(session.id); setError(''); setSuccess('');
    try {
      let check: SessionClosureCheck;
      if (demoMode || !supabase) {
        const activeEnrollments = enrollments.filter((item) => item.session_id === session.id && item.status !== 'canceled');
        const expectedAttendance = organizationHasFeature(organization, 'training_digital_attendance')
          ? activeEnrollments.length * inclusiveSessionDays(session) * 2
          : 0;
        const completedAttendance = attendance.filter((item) => item.session_id === session.id && ['present', 'absent', 'excused'].includes(item.status)).length;
        const missingAttendance = Math.max(0, expectedAttendance - completedAttendance);
        const blockers: string[] = [];
        if (session.status === 'canceled') blockers.push('La session est annulée.');
        if (session.status === 'completed') blockers.push('La session est déjà clôturée.');
        if (new Date(session.ends_at).getTime() > Date.now()) blockers.push('La date de fin de la session n’est pas encore passée.');
        if (!session.trainer_id) blockers.push('Aucun formateur n’est affecté à la session.');
        if (activeEnrollments.length === 0) blockers.push('Aucun stagiaire n’est inscrit à la session.');
        if (expectedAttendance > 0 && missingAttendance > 0) blockers.push(`${missingAttendance} émargement(s) restent à compléter.`);
        check = {
          session_id: session.id,
          session_status: session.status,
          session_ended: new Date(session.ends_at).getTime() <= Date.now(),
          trainer_assigned: Boolean(session.trainer_id),
          enrollment_count: activeEnrollments.length,
          digital_attendance_required: organizationHasFeature(organization, 'training_digital_attendance'),
          expected_attendance: expectedAttendance,
          completed_attendance: completedAttendance,
          missing_attendance: missingAttendance,
          documents_count: documents.filter((item) => item.session_id === session.id && item.status !== 'archived').length,
          attestations_count: documents.filter((item) => item.session_id === session.id && item.category === 'attestation' && item.status !== 'archived').length,
          can_close: blockers.length === 0,
          blockers
        };
      } else {
        const { data, error: rpcError } = await supabase.rpc('training_session_closure_check', {
          p_organization_id: organization.id,
          p_session_id: session.id
        });
        if (rpcError) throw rpcError;
        check = data as SessionClosureCheck;
      }
      setClosureSession(session); setClosureCheck(check); setClosureNotes('');
    } catch (caught) {
      setError(`Contrôle impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setClosureBusyId(''); }
  }

  async function closeSession() {
    if (!organization || !closureSession || !closureCheck?.can_close) return;
    setClosureBusyId(closureSession.id); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const now = new Date().toISOString();
        const next = sessions.map((item) => item.id === closureSession.id ? { ...item, status: 'completed' as const, closed_at: now, closed_by: user?.id ?? null, closure_notes: nullableText(closureNotes) } : item);
        localStorage.setItem(`ncr-suite-training-sessions-${organization.id}`, JSON.stringify(next));
        setSessions(next);
      } else {
        const { error: rpcError } = await supabase.rpc('close_training_session', {
          p_organization_id: organization.id,
          p_session_id: closureSession.id,
          p_closure_notes: nullableText(closureNotes)
        });
        if (rpcError) throw rpcError;
        await loadData();
      }
      setClosureSession(null); setClosureCheck(null); setClosureNotes(''); setSessionView('closed');
      setSuccess('La session est clôturée. Les attestations et évaluations prévues peuvent maintenant être générées ou envoyées.');
    } catch (caught) {
      setError(`Clôture impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setClosureBusyId(''); }
  }

  async function reopenSession(session: TrainingSessionRecord) {
    if (!organization || !['owner', 'admin'].includes(organization.role ?? 'viewer')) return;
    if (!window.confirm(`Rouvrir la session « ${session.title} » ? Les émargements redeviendront modifiables.`)) return;
    setClosureBusyId(session.id); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const next = sessions.map((item) => item.id === session.id ? { ...item, status: 'in_progress' as const, closed_at: null, closed_by: null, reopened_at: new Date().toISOString(), reopened_by: user?.id ?? null } : item);
        localStorage.setItem(`ncr-suite-training-sessions-${organization.id}`, JSON.stringify(next));
        setSessions(next);
      } else {
        const { error: rpcError } = await supabase.rpc('reopen_training_session', {
          p_organization_id: organization.id,
          p_session_id: session.id,
          p_reason: 'Réouverture depuis la gestion des sessions'
        });
        if (rpcError) throw rpcError;
        await loadData();
      }
      setSessionView('current'); setSuccess('La session a été rouverte.');
    } catch (caught) {
      setError(`Réouverture impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setClosureBusyId(''); }
  }

  async function updateStatus(session: TrainingSessionRecord, status: TrainingSessionStatus) {
    if (!organization) return;
    setError('');
    try {
      if (demoMode || !supabase) {
        const next = sessions.map((row) => row.id === session.id ? { ...row, status } : row);
        setSessions(next);
        localStorage.setItem(`ncr-suite-training-sessions-${organization.id}`, JSON.stringify(next));
      } else {
        const { error: rpcError } = await supabase.rpc('set_training_session_status', {
          p_organization_id: organization.id,
          p_session_id: session.id,
          p_status: status
        });
        if (rpcError) throw rpcError;
        setSessions((current) => current.map((row) => row.id === session.id ? { ...row, status } : row));
      }
      setSuccess('Le statut de la session a été mis à jour.');
    } catch (caught) { setError(`Modification impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
  }

  if (!organization) return null;

  return (
    <div className="page training-page">
      <header className="page-header">
        <div><p className="eyebrow">PACK FORMATION</p><h1>Sessions</h1><p>Planifiez vos sessions et inscrivez les stagiaires en une seule opération.</p></div>
        <button className="primary-button" type="button" onClick={() => setSearchParams({ new: '1' })}><Icon name="plus" size={18} />Créer une session</button>
      </header>

      {formOpen && (
        <section className="panel training-form-panel training-session-form-panel">
          <div className="panel-header"><div><p className="eyebrow">PLANIFICATION</p><h2>Nouvelle session</h2></div><button className="secondary-button compact-button" type="button" onClick={() => setSearchParams({})}>Fermer</button></div>
          {programs.length === 0 ? <div className="training-warning"><Icon name="alert" size={20} /><span>Crée d’abord une formation dans le catalogue.</span></div> : (
            <form className="training-form-grid" onSubmit={createSession}>
              <label>Formation *<select required value={form.programId} onChange={(event) => selectProgram(event.target.value)}><option value="">Sélectionner</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}</select></label>
              <label>Formateur<select value={form.trainerId} onChange={(event) => setForm((current) => ({ ...current, trainerId: event.target.value }))}><option value="">À définir</option>{trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{personName(trainer.first_name, trainer.last_name)}</option>)}</select></label>
              <label className="full-field">Titre de la session *<input required minLength={2} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
              {organizationHasFeature(organization, 'multi_site') && <label>Établissement *<select required value={form.siteId} onChange={(event) => setForm((current) => ({ ...current, siteId: event.target.value }))}><option value="">Sélectionner</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
              <label>Modalité<select value={form.modality} onChange={(event) => setForm((current) => ({ ...current, modality: event.target.value as TrainingModality }))}><option value="presentiel">Présentiel</option><option value="distanciel">Distanciel</option><option value="hybride">Hybride</option></select></label>
              <label>Date de début *<input type="date" required value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} /></label>
              <label>Heure de début *<input type="time" required value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} /></label>
              <label>Date de fin *<input type="date" required value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} /></label>
              <label>Heure de fin *<input type="time" required value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} /></label>
              <label>Capacité *<input type="number" min={1} max={500} required value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} /></label>
              <label>Statut<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TrainingSessionStatus }))}><option value="draft">Brouillon</option><option value="scheduled">Planifiée</option><option value="in_progress">En cours</option><option value="canceled">Annulée</option></select></label>
              <label className="full-field">Lieu ou lien de visioconférence<input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} /></label>
              <fieldset className="full-field training-trainee-picker"><legend>Stagiaires inscrits <small>{form.traineeIds.length}/{form.capacity || 0}</small></legend>{trainees.length === 0 ? <p>Aucun stagiaire actif. Tu peux créer la session sans inscription.</p> : <div>{trainees.map((trainee) => <label key={trainee.id} className={form.traineeIds.includes(trainee.id) ? 'selected' : ''}><input type="checkbox" checked={form.traineeIds.includes(trainee.id)} onChange={() => toggleTrainee(trainee.id)} /><span><strong>{personName(trainee.first_name, trainee.last_name)}</strong><small>{trainee.company || trainee.email || 'Stagiaire'}</small></span></label>)}</div>}</fieldset>
              <label className="full-field">Notes internes<textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
              <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setSearchParams({})}>Annuler</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Création…' : 'Créer la session'}</button></div>
            </form>
          )}
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="panel training-list-panel training-session-workspace">
        <div className="training-toolbar training-session-toolbar">
          <div><p className="eyebrow">CYCLE DES SESSIONS</p><h2>{sessions.length} session{sessions.length > 1 ? 's' : ''}</h2><p>Planifie, suis l’émargement puis clôture la session lorsque le dossier est complet.</p></div>
        </div>

        <div className="training-session-view-tabs" role="tablist" aria-label="Classement des sessions">
          {([
            ['planned', 'Planifiées', sessionGroups.planned.length, 'calendar'],
            ['current', 'En cours', sessionGroups.current.length, 'activity'],
            ['closed', 'Clôturées', sessionGroups.closed.length, 'check'],
            ['canceled', 'Annulées', sessionGroups.canceled.length, 'close']
          ] as [SessionView, string, number, 'calendar' | 'activity' | 'check' | 'close'][]).map(([value, label, count, icon]) => (
            <button key={value} type="button" role="tab" aria-selected={sessionView === value} className={sessionView === value ? 'active' : ''} onClick={() => setSessionView(value)}>
              <Icon name={icon} size={18} /><span><strong>{label}</strong><small>{count} session{count > 1 ? 's' : ''}</small></span>
            </button>
          ))}
        </div>

        {loading ? <div className="training-empty">Chargement…</div> : filteredSessions.length === 0 ? (
          <div className="training-empty"><Icon name="calendar" size={30} /><strong>Aucune session {sessionView === 'planned' ? 'planifiée' : sessionView === 'current' ? 'en cours' : sessionView === 'closed' ? 'clôturée' : 'annulée'}</strong><span>Les sessions sont automatiquement rangées selon leur avancement.</span></div>
        ) : (
          <div className="training-session-list">
            {filteredSessions.map((session) => {
              const program = programMap.get(session.program_id);
              const trainer = session.trainer_id ? trainerMap.get(session.trainer_id) : null;
              const count = enrollmentCount.get(session.id) ?? 0;
              const isClosed = session.status === 'completed';
              const canReopen = ['owner', 'admin'].includes(organization.role ?? 'viewer');
              return (
                <article key={session.id} className={`training-session-card${isClosed ? ' closed' : ''}`}>
                  <div className="training-session-date"><strong>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(new Date(session.starts_at))}</strong><span>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(session.starts_at))}</span></div>
                  <div className="training-session-main">
                    <div><strong>{session.title}</strong><span>{program?.title || 'Formation'} · {modalityLabels[session.modality]}</span></div>
                    <p>{formatDateTime(session.starts_at)} → {formatDateTime(session.ends_at)}</p>
                    <small>{trainer ? `Formateur : ${personName(trainer.first_name, trainer.last_name)}` : 'Formateur à définir'}{session.location ? ` · ${session.location}` : ''}</small>
                    {isClosed && <em className="training-session-closed-meta">Clôturée {session.closed_at ? `le ${formatDateTime(session.closed_at)}` : 'avant la mise en place du suivi de clôture'}{session.closure_notes ? ` · ${session.closure_notes}` : ''}</em>}
                  </div>
                  <div className="training-session-capacity"><strong>{count}/{session.capacity}</strong><span>stagiaires</span></div>
                  <div className="training-session-controls">
                    {isClosed ? <span className="training-status-pill active"><Icon name="check" size={14} /> Clôturée</span> : (
                      <label className={`training-status-select status-${session.status}`}><span className="sr-only">Statut</span><select value={session.status} onChange={(event) => updateStatus(session, event.target.value as TrainingSessionStatus)}>
                        <option value="draft">Brouillon</option><option value="scheduled">Planifiée</option><option value="in_progress">En cours</option><option value="canceled">Annulée</option>
                      </select></label>
                    )}
                    <div className="training-document-automation-actions">
                      <Link className="secondary-button compact-button" to={`/documents?session=${encodeURIComponent(session.id)}`}>Documents</Link>
                      <Link className="secondary-button compact-button" to={`/documents?session=${encodeURIComponent(session.id)}&category=attestation`}>Attestations</Link>
                      <Link className="secondary-button compact-button" to={`/emargements?session=${encodeURIComponent(session.id)}`}>Émargements</Link>
                      {!isClosed && sessionView === 'current' && session.status !== 'canceled' && <button className="primary-button compact-button" type="button" disabled={closureBusyId === session.id} onClick={() => void prepareClosure(session)}><Icon name="check" size={16} />{closureBusyId === session.id ? 'Contrôle…' : 'Clôturer'}</button>}
                      {isClosed && canReopen && <button className="secondary-button compact-button" type="button" disabled={closureBusyId === session.id} onClick={() => void reopenSession(session)}>{closureBusyId === session.id ? 'Réouverture…' : 'Rouvrir'}</button>}
                      {organizationHasFeature(organization, 'training_session_dossier') && <>
                        <button className="secondary-button compact-button" type="button" disabled={dossierBusyId === session.id} onClick={() => void generateSessionDossier(session, 'preview')}>{dossierBusyId === session.id ? 'Préparation…' : 'Dossier complet'}</button>
                        <button className="secondary-button compact-button" type="button" disabled={dossierBusyId === session.id} onClick={() => void generateSessionDossier(session, 'download')}>Télécharger dossier</button>
                      </>}
                      <small>{documentCounts.get(session.id)?.attestations ?? 0} attestation{(documentCounts.get(session.id)?.attestations ?? 0) > 1 ? 's' : ''} · {documentCounts.get(session.id)?.total ?? 0} document{(documentCounts.get(session.id)?.total ?? 0) > 1 ? 's' : ''}</small>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {closureSession && closureCheck && (
        <div className="training-closure-modal-backdrop" role="presentation" onClick={() => !closureBusyId && setClosureSession(null)}>
          <section className="panel training-closure-modal" role="dialog" aria-modal="true" aria-labelledby="closure-title" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div><p className="eyebrow">CLÔTURE DE SESSION</p><h2 id="closure-title">{closureSession.title}</h2><p>La clôture verrouille les émargements et déclenche les automatisations prévues.</p></div>
              <button className="icon-button" type="button" onClick={() => setClosureSession(null)} disabled={Boolean(closureBusyId)} aria-label="Fermer"><Icon name="close" size={20} /></button>
            </div>
            <div className="training-closure-checklist">
              <article className={closureCheck.session_ended ? 'ok' : 'blocked'}><Icon name={closureCheck.session_ended ? 'check' : 'alert'} size={18} /><span><strong>Session terminée</strong><small>{closureCheck.session_ended ? 'La date de fin est passée.' : 'La session ne peut pas être clôturée avant sa fin.'}</small></span></article>
              <article className={closureCheck.trainer_assigned ? 'ok' : 'blocked'}><Icon name={closureCheck.trainer_assigned ? 'check' : 'alert'} size={18} /><span><strong>Formateur affecté</strong><small>{closureCheck.trainer_assigned ? 'Le formateur est renseigné.' : 'Affecte un formateur avant la clôture.'}</small></span></article>
              <article className={closureCheck.enrollment_count > 0 ? 'ok' : 'blocked'}><Icon name={closureCheck.enrollment_count > 0 ? 'check' : 'alert'} size={18} /><span><strong>Participants</strong><small>{closureCheck.enrollment_count} stagiaire{closureCheck.enrollment_count > 1 ? 's' : ''} inscrit{closureCheck.enrollment_count > 1 ? 's' : ''}.</small></span></article>
              <article className={closureCheck.missing_attendance === 0 ? 'ok' : 'blocked'}><Icon name={closureCheck.missing_attendance === 0 ? 'check' : 'alert'} size={18} /><span><strong>Émargements</strong><small>{closureCheck.digital_attendance_required ? `${closureCheck.completed_attendance}/${closureCheck.expected_attendance} créneaux complétés.` : 'Feuille papier autorisée avec cette formule.'}</small></span></article>
              <article className="info"><Icon name="file" size={18} /><span><strong>Documents de session</strong><small>{closureCheck.documents_count} document{closureCheck.documents_count > 1 ? 's' : ''} actuellement classé{closureCheck.documents_count > 1 ? 's' : ''}. Les attestations automatiques seront générées après la clôture.</small></span></article>
            </div>
            {closureCheck.blockers.length > 0 && <div className="error-message"><strong>Éléments à corriger :</strong><ul>{closureCheck.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>}
            <label className="training-closure-notes">Note de clôture<textarea rows={3} value={closureNotes} onChange={(event) => setClosureNotes(event.target.value)} placeholder="Observation interne facultative…" /></label>
            <div className="form-actions"><button className="secondary-button" type="button" onClick={() => setClosureSession(null)} disabled={Boolean(closureBusyId)}>Annuler</button><button className="primary-button" type="button" onClick={() => void closeSession()} disabled={!closureCheck.can_close || Boolean(closureBusyId)}>{closureBusyId ? 'Clôture…' : 'Clôturer définitivement'}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
