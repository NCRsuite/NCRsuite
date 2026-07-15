import { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  attendancePeriodLabels,
  attendanceStatusLabels,
  formatDateTime,
  personName,
  type TrainingAttendancePeriod,
  type TrainingAttendanceRecord,
  type TrainingAttendanceStatus,
  type TrainingEnrollmentRecord,
  type TrainingProgramRecord,
  type TrainingSessionRecord,
  type TrainingTraineeRecord,
  type TrainingTrainerRecord
} from '../features/training/types';
import { supabase } from '../lib/supabase';

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sessionDates(session: TrainingSessionRecord | undefined) {
  if (!session) return [];
  const start = new Date(session.starts_at);
  const end = new Date(session.ends_at);
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const result: string[] = [];
  while (cursor <= endDay && result.length < 366) {
    result.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function humanDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

interface SignatureModalProps {
  trainee: TrainingTraineeRecord;
  period: TrainingAttendancePeriod;
  date: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (blob: Blob, signatoryName: string) => void;
}

function SignatureModal({ trainee, period, date, saving, onCancel, onSave }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [signatoryName, setSignatoryName] = useState(personName(trainee.first_name, trainee.last_name));

  function prepareCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.max(Math.round(rect.width * ratio), 1);
    canvas.height = Math.max(Math.round(rect.height * ratio), 1);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, rect.width, rect.height);
    context.strokeStyle = '#111318';
    context.lineWidth = 2.4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    setDrawn(false);
  }

  useEffect(() => {
    prepareCanvas();
    const handleResize = () => prepareCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = point(event);
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const next = point(event);
    context.beginPath();
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    lastPointRef.current = next;
    setDrawn(true);
  }

  function stopDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function submit() {
    const canvas = canvasRef.current;
    if (!canvas || !drawn || !signatoryName.trim()) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob, signatoryName.trim());
    }, 'image/png', 0.92);
  }

  return (
    <div className="attendance-modal-overlay" role="presentation" onClick={onCancel}>
      <section className="attendance-signature-modal" role="dialog" aria-modal="true" aria-labelledby="signature-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><p className="eyebrow">ÉMARGEMENT {attendancePeriodLabels[period].toUpperCase()}</p><h2 id="signature-title">Signature de {personName(trainee.first_name, trainee.last_name)}</h2><p>{humanDate(date)} · Le stagiaire signe directement sur cet appareil.</p></div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Fermer"><Icon name="close" size={21} /></button>
        </header>
        <label>Nom du signataire<input value={signatoryName} onChange={(event) => setSignatoryName(event.target.value)} maxLength={180} /></label>
        <div className="signature-canvas-shell">
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            aria-label="Zone de signature"
          />
          {!drawn && <span>Signez dans ce cadre</span>}
        </div>
        <div className="attendance-signature-actions">
          <button className="secondary-button" type="button" onClick={prepareCanvas} disabled={saving}>Effacer</button>
          <button className="secondary-button" type="button" onClick={onCancel} disabled={saving}>Annuler</button>
          <button className="primary-button" type="button" onClick={submit} disabled={saving || !drawn || !signatoryName.trim()}>{saving ? 'Enregistrement…' : 'Valider la présence'}</button>
        </div>
      </section>
    </div>
  );
}

export function TrainingAttendancePage() {
  const { organization, activeSiteId, sites } = useOrganization();
  const { demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState<TrainingSessionRecord[]>([]);
  const [programs, setPrograms] = useState<TrainingProgramRecord[]>([]);
  const [trainers, setTrainers] = useState<TrainingTrainerRecord[]>([]);
  const [trainees, setTrainees] = useState<TrainingTraineeRecord[]>([]);
  const [enrollments, setEnrollments] = useState<TrainingEnrollmentRecord[]>([]);
  const [records, setRecords] = useState<TrainingAttendanceRecord[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [date, setDate] = useState('');
  const [period, setPeriod] = useState<TrainingAttendancePeriod>('morning');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signatureTrainee, setSignatureTrainee] = useState<TrainingTraineeRecord | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const canManage = ['owner', 'admin', 'manager', 'employee'].includes(organization?.role ?? 'viewer');

  async function loadData() {
    if (!organization) return;
    setLoading(true); setError('');
    if (demoMode || !supabase) {
      const get = <T,>(key: string): T => {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) as T : [] as T;
      };
      const loadedSessions = get<TrainingSessionRecord[]>(`ncr-suite-training-sessions-${organization.id}`).filter((item) => item.status !== 'canceled');
      setSessions(loadedSessions);
      setPrograms(get<TrainingProgramRecord[]>(`ncr-suite-training-programs-${organization.id}`));
      setTrainers(get<TrainingTrainerRecord[]>(`ncr-suite-training-trainers-${organization.id}`));
      setTrainees(get<TrainingTraineeRecord[]>(`ncr-suite-training-trainees-${organization.id}`));
      setEnrollments(get<TrainingEnrollmentRecord[]>(`ncr-suite-training-enrollments-${organization.id}`));
      setRecords(get<TrainingAttendanceRecord[]>(`ncr-suite-training-attendance-${organization.id}`));
      setLoading(false);
      return;
    }

    let sessionsQuery = supabase
      .from('training_sessions')
      .select('id,organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,capacity,location,modality,status,notes,created_at')
      .eq('organization_id', organization.id)
      .neq('status', 'canceled')
      .order('starts_at', { ascending: false });
    if (activeSiteId) sessionsQuery = sessionsQuery.eq('site_id', activeSiteId);

    const [sessionsResult, programsResult, trainersResult, traineesResult, enrollmentsResult, attendanceResult] = await Promise.all([
      sessionsQuery,
      supabase.from('training_programs').select('id,organization_id,site_id,title,code,duration_hours,modality,objectives,description,status,created_at').eq('organization_id', organization.id),
      supabase.from('training_trainers').select('id,organization_id,first_name,last_name,email,phone,specialties,notes,status,created_at').eq('organization_id', organization.id),
      supabase.from('training_trainees').select('id,organization_id,first_name,last_name,email,phone,company,notes,status,created_at').eq('organization_id', organization.id).order('last_name'),
      supabase.from('training_session_enrollments').select('organization_id,session_id,trainee_id,status').eq('organization_id', organization.id),
      supabase.from('training_attendance').select('id,organization_id,site_id,session_id,trainee_id,attendance_date,period,status,signature_path,signatory_name,signed_at,notes,created_at,updated_at').eq('organization_id', organization.id)
    ]);
    const firstError = sessionsResult.error || programsResult.error || trainersResult.error || traineesResult.error || enrollmentsResult.error || attendanceResult.error;
    if (firstError) setError(`Chargement impossible : ${firstError.message}`);
    else {
      setSessions((sessionsResult.data ?? []) as TrainingSessionRecord[]);
      setPrograms((programsResult.data ?? []).map((row) => ({ ...row, duration_hours: Number(row.duration_hours) })) as TrainingProgramRecord[]);
      setTrainers((trainersResult.data ?? []) as TrainingTrainerRecord[]);
      setTrainees((traineesResult.data ?? []) as TrainingTraineeRecord[]);
      setEnrollments((enrollmentsResult.data ?? []) as TrainingEnrollmentRecord[]);
      setRecords((attendanceResult.data ?? []) as TrainingAttendanceRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [organization?.id, activeSiteId, demoMode]);

  useEffect(() => {
    if (sessions.length === 0) { setSessionId(''); return; }
    const requestedSessionId = searchParams.get('session');
    if (requestedSessionId && sessions.some((item) => item.id === requestedSessionId)) {
      if (sessionId !== requestedSessionId) setSessionId(requestedSessionId);
      return;
    }
    if (!sessions.some((item) => item.id === sessionId)) setSessionId(sessions[0].id);
  }, [sessions, sessionId, searchParams]);

  const selectedSession = useMemo(() => sessions.find((item) => item.id === sessionId), [sessions, sessionId]);
  const dates = useMemo(() => sessionDates(selectedSession), [selectedSession]);

  useEffect(() => {
    if (dates.length === 0) { setDate(''); return; }
    const today = isoDate(new Date());
    setDate((current) => dates.includes(current) ? current : dates.includes(today) ? today : dates[0]);
  }, [sessionId, dates.join('|')]);

  const traineeMap = useMemo(() => new Map(trainees.map((item) => [item.id, item])), [trainees]);
  const programMap = useMemo(() => new Map(programs.map((item) => [item.id, item])), [programs]);
  const trainerMap = useMemo(() => new Map(trainers.map((item) => [item.id, item])), [trainers]);
  const enrolledTrainees = useMemo(() => enrollments
    .filter((item) => item.session_id === sessionId && item.status !== 'canceled')
    .map((item) => traineeMap.get(item.trainee_id))
    .filter((item): item is TrainingTraineeRecord => Boolean(item))
    .sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`, 'fr')),
  [enrollments, sessionId, traineeMap]);

  const dayRecords = useMemo(() => records.filter((item) => item.session_id === sessionId && item.attendance_date === date), [records, sessionId, date]);
  const currentRecords = useMemo(() => dayRecords.filter((item) => item.period === period), [dayRecords, period]);
  const recordMap = useMemo(() => new Map(currentRecords.map((item) => [item.trainee_id, item])), [currentRecords]);
  const stats = useMemo(() => {
    const counts = { present: 0, absent: 0, excused: 0, pending: 0 };
    for (const trainee of enrolledTrainees) counts[recordMap.get(trainee.id)?.status ?? 'pending'] += 1;
    return counts;
  }, [enrolledTrainees, recordMap]);


  async function createAttendancePdf(mode: 'preview' | 'download') {
    if (!organization || !selectedSession || !date || enrolledTrainees.length === 0) return;
    const previewWindow = mode === 'preview' ? window.open('', '_blank') : null;
    if (previewWindow) {
      previewWindow.document.write('<!doctype html><title>Feuille d\'émargement</title><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f5f5f7;color:#1d1d1f"><p>Préparation du PDF…</p></body>');
    }

    setPdfBusy(true); setError(''); setSuccess('');
    try {
      const signatureFiles = new Map<string, Blob>();
      if (!demoMode && supabase) {
        const paths = [...new Set(dayRecords.filter((record) => record.status === 'present' && record.signature_path).map((record) => record.signature_path!))];
        await Promise.all(paths.map(async (path) => {
          const { data, error: downloadError } = await supabase!.storage.from('training-signatures').download(path);
          if (downloadError || !data) throw new Error(`Signature inaccessible : ${downloadError?.message ?? 'fichier indisponible'}`);
          signatureFiles.set(path, data);
        }));
      }

      const { generateAttendanceDayPdf } = await import('../features/training/attendancePdf');
      const result = await generateAttendanceDayPdf({
        organization,
        site: selectedSession.site_id ? sites.find((site) => site.id === selectedSession.site_id) ?? null : null,
        session: selectedSession,
        program: programMap.get(selectedSession.program_id) ?? null,
        trainer: selectedSession.trainer_id ? trainerMap.get(selectedSession.trainer_id) ?? null : null,
        attendanceDate: date,
        trainees: enrolledTrainees,
        records: dayRecords,
        signatureFiles
      });
      const pdfBuffer = result.bytes.buffer.slice(result.bytes.byteOffset, result.bytes.byteOffset + result.bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      if (mode === 'preview') {
        if (previewWindow) previewWindow.location.replace(url);
        else window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = result.filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setSuccess(mode === 'preview' ? 'La feuille d’émargement PDF est ouverte.' : 'La feuille d’émargement PDF a été téléchargée.');
    } catch (reason) {
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      setError(reason instanceof Error ? reason.message : 'Impossible de générer la feuille d’émargement PDF.');
    } finally {
      setPdfBusy(false);
    }
  }

  async function persistStatus(trainee: TrainingTraineeRecord, status: Exclude<TrainingAttendanceStatus, 'present'>) {
    if (!organization || !selectedSession || !date || !canManage) return;
    const existing = recordMap.get(trainee.id);
    setSavingId(trainee.id); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const next: TrainingAttendanceRecord = {
          id: existing?.id ?? crypto.randomUUID(), organization_id: organization.id, site_id: selectedSession.site_id,
          session_id: selectedSession.id, trainee_id: trainee.id, attendance_date: date, period, status,
          signature_path: null, signatory_name: null, signed_at: null, notes: existing?.notes ?? null,
          created_at: existing?.created_at ?? new Date().toISOString(), updated_at: new Date().toISOString()
        };
        const updated = [...records.filter((item) => !(item.session_id === sessionId && item.trainee_id === trainee.id && item.attendance_date === date && item.period === period)), next];
        localStorage.setItem(`ncr-suite-training-attendance-${organization.id}`, JSON.stringify(updated));
        setRecords(updated);
      } else {
        const { error: rpcError } = await supabase.rpc('save_training_attendance', {
          p_organization_id: organization.id,
          p_session_id: selectedSession.id,
          p_trainee_id: trainee.id,
          p_attendance_date: date,
          p_period: period,
          p_status: status,
          p_signature_path: null,
          p_signatory_name: null,
          p_notes: existing?.notes ?? null
        });
        if (rpcError) throw rpcError;
        if (existing?.signature_path) await supabase.storage.from('training-signatures').remove([existing.signature_path]);
        await loadData();
      }
      setSuccess(`${personName(trainee.first_name, trainee.last_name)} : ${attendanceStatusLabels[status].toLowerCase()}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Enregistrement impossible.');
    } finally {
      setSavingId('');
    }
  }

  async function saveSignature(blob: Blob, signatoryName: string) {
    if (!organization || !selectedSession || !date || !signatureTrainee || !canManage) return;
    const trainee = signatureTrainee;
    const existing = recordMap.get(trainee.id);
    setSavingId(trainee.id); setError(''); setSuccess('');
    let newPath = '';
    try {
      if (demoMode || !supabase) {
        newPath = `demo/${trainee.id}.png`;
        const next: TrainingAttendanceRecord = {
          id: existing?.id ?? crypto.randomUUID(), organization_id: organization.id, site_id: selectedSession.site_id,
          session_id: selectedSession.id, trainee_id: trainee.id, attendance_date: date, period, status: 'present',
          signature_path: newPath, signatory_name: signatoryName, signed_at: new Date().toISOString(), notes: existing?.notes ?? null,
          created_at: existing?.created_at ?? new Date().toISOString(), updated_at: new Date().toISOString()
        };
        const updated = [...records.filter((item) => !(item.session_id === sessionId && item.trainee_id === trainee.id && item.attendance_date === date && item.period === period)), next];
        localStorage.setItem(`ncr-suite-training-attendance-${organization.id}`, JSON.stringify(updated));
        setRecords(updated);
      } else {
        newPath = `${organization.id}/${selectedSession.id}/${date}/${period}/${trainee.id}-${crypto.randomUUID()}.png`;
        const { error: uploadError } = await supabase.storage.from('training-signatures').upload(newPath, blob, { contentType: 'image/png', upsert: false });
        if (uploadError) throw new Error(`Signature impossible à envoyer : ${uploadError.message}`);
        const { error: rpcError } = await supabase.rpc('save_training_attendance', {
          p_organization_id: organization.id,
          p_session_id: selectedSession.id,
          p_trainee_id: trainee.id,
          p_attendance_date: date,
          p_period: period,
          p_status: 'present',
          p_signature_path: newPath,
          p_signatory_name: signatoryName,
          p_notes: existing?.notes ?? null
        });
        if (rpcError) throw rpcError;
        if (existing?.signature_path && existing.signature_path !== newPath) await supabase.storage.from('training-signatures').remove([existing.signature_path]);
        await loadData();
      }
      setSuccess(`Présence signée par ${signatoryName}.`);
      setSignatureTrainee(null);
    } catch (reason) {
      if (newPath && supabase && !demoMode) await supabase.storage.from('training-signatures').remove([newPath]);
      setError(reason instanceof Error ? reason.message : 'Signature impossible à enregistrer.');
    } finally {
      setSavingId('');
    }
  }

  async function openSignature(record: TrainingAttendanceRecord) {
    if (!record.signature_path || !supabase || demoMode) return;
    setError('');
    const { data, error: signedError } = await supabase.storage.from('training-signatures').createSignedUrl(record.signature_path, 120);
    if (signedError || !data?.signedUrl) setError(`Signature inaccessible : ${signedError?.message ?? 'lien indisponible'}`);
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  if (!organization) return null;

  return (
    <div className="page training-attendance-page">
      <header className="page-header">
        <div><p className="eyebrow">FORMATION · ÉMARGEMENTS</p><h1>Présences et signatures</h1><p>Le formateur sélectionne la session, puis fait signer chaque stagiaire matin et après-midi sur le même appareil.</p></div>
      </header>

      <section className="panel attendance-controls-panel">
        <div className="attendance-control-grid">
          <label>Session<select value={sessionId} onChange={(event) => { const value = event.target.value; setSessionId(value); setSearchParams(value ? { session: value } : {}); }} disabled={loading}>
            {sessions.length === 0 && <option value="">Aucune session</option>}
            {sessions.map((session) => <option key={session.id} value={session.id}>{session.title} · {formatDateTime(session.starts_at)}</option>)}
          </select></label>
          <label>Journée<select value={date} onChange={(event) => setDate(event.target.value)} disabled={dates.length === 0}>{dates.map((value) => <option key={value} value={value}>{humanDate(value)}</option>)}</select></label>
          <div className="attendance-period-control"><span>Période</span><div role="group" aria-label="Période d’émargement">
            {(['morning', 'afternoon'] as TrainingAttendancePeriod[]).map((value) => <button key={value} type="button" className={period === value ? 'active' : ''} onClick={() => setPeriod(value)}>{attendancePeriodLabels[value]}</button>)}
          </div></div>
        </div>
        {selectedSession && <div className="attendance-session-summary"><Icon name="calendar" size={19} /><span><strong>{selectedSession.title}</strong><small>{formatDateTime(selectedSession.starts_at)} → {formatDateTime(selectedSession.ends_at)}{selectedSession.location ? ` · ${selectedSession.location}` : ''}</small></span></div>}
        <div className="attendance-pdf-actions">
          <div><strong>Feuille de la journée</strong><small>Regroupe le matin et l’après-midi avec les signatures enregistrées.</small></div>
          <button className="primary-button" type="button" disabled={pdfBusy || !selectedSession || !date || enrolledTrainees.length === 0} onClick={() => void createAttendancePdf('preview')}><Icon name="file" size={17} />{pdfBusy ? 'Préparation…' : 'Visualiser le PDF'}</button>
          <button className="secondary-button" type="button" disabled={pdfBusy || !selectedSession || !date || enrolledTrainees.length === 0} onClick={() => void createAttendancePdf('download')}>Télécharger</button>
        </div>
      </section>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="attendance-stats-grid" aria-label="Résumé de la période">
        <article><span className="attendance-stat-icon signed"><Icon name="signature" size={20} /></span><div><strong>{stats.present}</strong><small>Présents signés</small></div></article>
        <article><span className="attendance-stat-icon absent"><Icon name="close" size={20} /></span><div><strong>{stats.absent}</strong><small>Absents</small></div></article>
        <article><span className="attendance-stat-icon excused"><Icon name="file" size={20} /></span><div><strong>{stats.excused}</strong><small>Justifiés</small></div></article>
        <article><span className="attendance-stat-icon pending"><Icon name="activity" size={20} /></span><div><strong>{stats.pending}</strong><small>À émarger</small></div></article>
      </section>

      <section className="panel attendance-roster-panel">
        <div className="panel-header"><div><p className="eyebrow">FEUILLE DE PRÉSENCE</p><h2>{date ? `${attendancePeriodLabels[period]} · ${humanDate(date)}` : 'Sélectionne une session'}</h2></div><span className="attendance-count">{enrolledTrainees.length} stagiaire{enrolledTrainees.length > 1 ? 's' : ''}</span></div>
        {loading ? <div className="training-empty">Chargement…</div> : !selectedSession ? <div className="training-empty"><Icon name="calendar" size={29} /><strong>Aucune session disponible</strong><span>Crée une session et inscris des stagiaires avant de lancer l’émargement.</span></div> : enrolledTrainees.length === 0 ? <div className="training-empty"><Icon name="users" size={29} /><strong>Aucun stagiaire inscrit</strong><span>Ajoute les participants depuis la fiche de la session.</span></div> : (
          <div className="attendance-roster-list">
            {enrolledTrainees.map((trainee) => {
              const record = recordMap.get(trainee.id);
              const status = record?.status ?? 'pending';
              const busy = savingId === trainee.id;
              return (
                <article key={trainee.id} className={`attendance-trainee-row status-${status}`}>
                  <span className="attendance-trainee-avatar">{trainee.first_name.slice(0, 1)}{trainee.last_name.slice(0, 1)}</span>
                  <div className="attendance-trainee-identity"><strong>{personName(trainee.first_name, trainee.last_name)}</strong><small>{trainee.company || trainee.email || 'Stagiaire'}</small>{record?.signed_at && <em>Signé le {formatDateTime(record.signed_at)}</em>}</div>
                  <div className="attendance-status-pill">{attendanceStatusLabels[status]}</div>
                  <div className="attendance-row-actions">
                    {status === 'present' ? <>
                      <button className="secondary-button compact-button" type="button" onClick={() => void openSignature(record!)}>Voir</button>
                      {canManage && <button className="secondary-button compact-button" type="button" onClick={() => setSignatureTrainee(trainee)}>Refaire</button>}
                    </> : canManage ? <>
                      <button className="primary-button compact-button" type="button" onClick={() => setSignatureTrainee(trainee)} disabled={busy}><Icon name="signature" size={17} />Faire signer</button>
                      <select aria-label={`Statut de ${personName(trainee.first_name, trainee.last_name)}`} value={status} disabled={busy} onChange={(event) => void persistStatus(trainee, event.target.value as Exclude<TrainingAttendanceStatus, 'present'>)}>
                        <option value="pending">À émarger</option><option value="absent">Absent</option><option value="excused">Justifié</option>
                      </select>
                    </> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel attendance-legal-note"><span><Icon name="shield" size={22} /></span><div><h2>Traçabilité</h2><p>Chaque signature est horodatée, rattachée à la session, au stagiaire, à la journée et à la période. Les fichiers sont privés et accessibles uniquement aux membres autorisés de l’entreprise.</p></div></section>

      {signatureTrainee && date && <SignatureModal trainee={signatureTrainee} period={period} date={date} saving={savingId === signatureTrainee.id} onCancel={() => !savingId && setSignatureTrainee(null)} onSave={(blob, name) => void saveSignature(blob, name)} />}
    </div>
  );
}
