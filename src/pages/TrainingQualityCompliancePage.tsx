import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  buildDemoTrainingQualityControls,
  buildTrainingQualitySummary,
  formatTrainingQualityDate,
  trainingQualityAuditResultLabels,
  trainingQualityAuditStatusLabels,
  trainingQualityAuditTypeLabels,
  trainingQualityCriteria,
  trainingQualityStatusLabels
} from '../features/training/qualityCompliance';
import { generateTrainingQualityComplianceCsv } from '../features/training/qualityComplianceCsv';
import type {
  TrainingQualityAuditRecord,
  TrainingQualityAuditResult,
  TrainingQualityAuditStatus,
  TrainingQualityAuditType,
  TrainingQualityControlRecord,
  TrainingQualityControlStatus,
  TrainingQualityEvidenceRecord,
  TrainingSessionRecord
} from '../features/training/types';
import { closeFileWindow, navigateFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { parseStoredJson, writeJsonStorage } from '../lib/safeStorage';
import { supabase } from '../lib/supabase';

type Tab = 'indicators' | 'evidence' | 'audits';
type IndicatorFilter = 'all' | TrainingQualityControlStatus | 'missing_evidence';
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = [
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'
];

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(-120) || 'preuve';
}

function initialEvidenceForm(controlId = '') {
  return {
    controlId,
    label: '',
    description: '',
    sessionId: '',
    evidenceDate: new Date().toISOString().slice(0, 10),
    expiresAt: ''
  };
}

function initialAuditForm() {
  return {
    type: 'internal' as TrainingQualityAuditType,
    plannedDate: new Date().toISOString().slice(0, 10),
    auditorName: '',
    scope: '',
    notes: ''
  };
}

function formatSize(value: number | null) {
  if (!value) return '';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

export function TrainingQualityCompliancePage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('indicators');
  const [controls, setControls] = useState<TrainingQualityControlRecord[]>([]);
  const [evidence, setEvidence] = useState<TrainingQualityEvidenceRecord[]>([]);
  const [audits, setAudits] = useState<TrainingQualityAuditRecord[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRecord[]>([]);
  const [selectedControlId, setSelectedControlId] = useState('');
  const [criterionFilter, setCriterionFilter] = useState(0);
  const [indicatorFilter, setIndicatorFilter] = useState<IndicatorFilter>('all');
  const [search, setSearch] = useState('');
  const [evidenceForm, setEvidenceForm] = useState(initialEvidenceForm);
  const [auditForm, setAuditForm] = useState(initialAuditForm);
  const [controlForm, setControlForm] = useState({
    status: 'not_started' as TrainingQualityControlStatus,
    applicable: true,
    ownerName: '',
    dueDate: '',
    notes: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [auditResults, setAuditResults] = useState<Record<string, Exclude<TrainingQualityAuditResult, null>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const storageKeys = useMemo(() => organization ? ({
    controls: `ncr-suite-training-quality-controls-${organization.id}`,
    evidence: `ncr-suite-training-quality-evidence-${organization.id}`,
    audits: `ncr-suite-training-quality-audits-${organization.id}`,
    sessions: `ncr-suite-training-sessions-${organization.id}`
  }) : null, [organization?.id]);

  async function loadData(showLoader = true) {
    if (!organization || !storageKeys) return;
    if (showLoader) setLoading(true);
    setError('');

    if (demoMode || !supabase) {
      const storedControls = parseStoredJson<TrainingQualityControlRecord[]>(localStorage.getItem(storageKeys.controls), []);
      const nextControls = storedControls.length ? storedControls : buildDemoTrainingQualityControls(organization.id);
      if (!storedControls.length) writeJsonStorage(storageKeys.controls, nextControls);
      setControls(nextControls);
      setEvidence(parseStoredJson<TrainingQualityEvidenceRecord[]>(localStorage.getItem(storageKeys.evidence), []));
      setAudits(parseStoredJson<TrainingQualityAuditRecord[]>(localStorage.getItem(storageKeys.audits), []));
      setSessions(parseStoredJson<TrainingSessionRecord[]>(localStorage.getItem(storageKeys.sessions), []));
      setLoading(false);
      return;
    }

    const initializeResult = await supabase.rpc('initialize_training_quality_framework', {
      p_organization_id: organization.id
    });
    if (initializeResult.error) {
      setError(`Initialisation du dossier qualité impossible : ${initializeResult.error.message}`);
      setLoading(false);
      return;
    }
    const syncResult = await supabase.rpc('sync_training_quality_automatic_evidence', {
      p_organization_id: organization.id
    });
    if (syncResult.error) {
      setError(`Synchronisation des preuves impossible : ${syncResult.error.message}`);
      setLoading(false);
      return;
    }

    const [controlsResult, evidenceResult, auditsResult, sessionsResult] = await Promise.all([
      supabase.from('training_quality_controls')
        .select('id,organization_id,criterion_number,indicator_number,title,objective,applicable,status,owner_name,due_date,notes,reviewed_at,created_at,updated_at')
        .eq('organization_id', organization.id).order('indicator_number'),
      supabase.from('training_quality_evidence')
        .select('id,organization_id,control_id,session_id,training_document_id,label,description,source_kind,source_reference,action_path,storage_path,file_name,mime_type,size_bytes,evidence_date,expires_at,status,created_at,updated_at')
        .eq('organization_id', organization.id).order('evidence_date', { ascending: false }),
      supabase.from('training_quality_audits')
        .select('id,organization_id,audit_type,status,planned_date,completed_date,auditor_name,scope,notes,result,summary_snapshot,created_at,updated_at')
        .eq('organization_id', organization.id).order('planned_date', { ascending: false }),
      supabase.from('training_sessions')
        .select('id,organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,capacity,location,modality,status,notes,created_at')
        .eq('organization_id', organization.id).order('starts_at', { ascending: false })
    ]);
    const firstError = controlsResult.error || evidenceResult.error || auditsResult.error || sessionsResult.error;
    if (firstError) setError(`Chargement du dossier qualité impossible : ${firstError.message}`);
    else {
      const nextEvidence = (evidenceResult.data ?? []).map((item) => ({
        ...item,
        size_bytes: item.size_bytes == null ? null : Number(item.size_bytes)
      })) as TrainingQualityEvidenceRecord[];
      setEvidence(nextEvidence);
      setControls((controlsResult.data ?? []).map((control) => ({
        ...control,
        evidence_count: nextEvidence.filter((item) => item.control_id === control.id).length,
        active_evidence_count: nextEvidence.filter((item) => item.control_id === control.id && item.status === 'current').length
      })) as TrainingQualityControlRecord[]);
      setAudits((auditsResult.data ?? []) as TrainingQualityAuditRecord[]);
      setSessions((sessionsResult.data ?? []) as TrainingSessionRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [organization?.id, demoMode]);

  const selectedControl = controls.find((control) => control.id === selectedControlId) ?? null;
  useEffect(() => {
    if (!selectedControl) return;
    setControlForm({
      status: selectedControl.status,
      applicable: selectedControl.applicable,
      ownerName: selectedControl.owner_name ?? '',
      dueDate: selectedControl.due_date ?? '',
      notes: selectedControl.notes ?? ''
    });
  }, [selectedControl?.id]);

  const summary = useMemo(() => buildTrainingQualitySummary(controls, evidence, audits), [controls, evidence, audits]);
  const sessionMap = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
  const controlMap = useMemo(() => new Map(controls.map((control) => [control.id, control])), [controls]);
  const filteredControls = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return controls.filter((control) => {
      if (criterionFilter && control.criterion_number !== criterionFilter) return false;
      if (indicatorFilter === 'missing_evidence' && evidence.some((item) => item.control_id === control.id && item.status === 'current')) return false;
      if (indicatorFilter !== 'all' && indicatorFilter !== 'missing_evidence' && control.status !== indicatorFilter) return false;
      return !normalizedSearch || `${control.indicator_number} ${control.title} ${control.owner_name ?? ''} ${control.notes ?? ''}`.toLowerCase().includes(normalizedSearch);
    });
  }, [controls, criterionFilter, indicatorFilter, search, evidence]);

  const visibleEvidence = useMemo(() => evidence.filter((item) => item.status !== 'archived'), [evidence]);
  const canCompleteAudits = ['owner', 'admin'].includes(organization?.role ?? '');

  function selectControl(control: TrainingQualityControlRecord) {
    setSelectedControlId(control.id);
  }

  async function saveControl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !selectedControl || !storageKeys) return;
    setSaving('control'); setError(''); setSuccess('');
    const normalizedStatus = controlForm.applicable ? controlForm.status : 'not_applicable';
    if (normalizedStatus === 'ready' && !evidence.some((item) => item.control_id === selectedControl.id && item.status === 'current')) {
      setError('Ajoute au moins une preuve active avant de déclarer cet indicateur maîtrisé.');
      setSaving('');
      return;
    }

    if (demoMode || !supabase) {
      const next = controls.map((control) => control.id === selectedControl.id ? {
        ...control,
        status: normalizedStatus,
        applicable: normalizedStatus !== 'not_applicable',
        owner_name: controlForm.ownerName.trim() || null,
        due_date: controlForm.dueDate || null,
        notes: controlForm.notes.trim() || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } : control);
      setControls(next); writeJsonStorage(storageKeys.controls, next);
      setSuccess('Indicateur mis à jour.');
      setSaving('');
      return;
    }
    const { error: rpcError } = await supabase.rpc('update_training_quality_control', {
      p_organization_id: organization.id,
      p_control_id: selectedControl.id,
      p_status: normalizedStatus,
      p_applicable: normalizedStatus !== 'not_applicable',
      p_owner_name: controlForm.ownerName.trim() || null,
      p_due_date: controlForm.dueDate || null,
      p_notes: controlForm.notes.trim() || null
    });
    if (rpcError) setError(`Mise à jour impossible : ${rpcError.message}`);
    else {
      setSuccess('Indicateur mis à jour.');
      await loadData(false);
    }
    setSaving('');
  }

  function openEvidenceForm(controlId = '') {
    setEvidenceForm(initialEvidenceForm(controlId));
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowEvidenceForm(true);
  }

  function onFileSelected(selected: File | null) {
    setError('');
    if (!selected) { setFile(null); return; }
    if (selected.size > MAX_FILE_SIZE) { setError('Le fichier dépasse la limite de 20 Mo.'); return; }
    if (!ACCEPTED_TYPES.includes(selected.type)) { setError('Format non accepté. Utilise un PDF, une image, un document Word, Excel ou texte.'); return; }
    setFile(selected);
    setEvidenceForm((current) => ({ ...current, label: current.label || selected.name.replace(/\.[^.]+$/, '') }));
  }

  async function addEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !storageKeys) return;
    if (!evidenceForm.controlId) { setError('Sélectionne un indicateur.'); return; }
    if (!file) { setError('Sélectionne le fichier de preuve.'); return; }
    if (evidenceForm.label.trim().length < 2) { setError('Renseigne un libellé clair.'); return; }
    setSaving('evidence'); setError(''); setSuccess('');
    const now = new Date().toISOString();
    const path = `${organization.id}/quality/${evidenceForm.controlId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

    if (demoMode || !supabase) {
      const record: TrainingQualityEvidenceRecord = {
        id: crypto.randomUUID(), organization_id: organization.id, control_id: evidenceForm.controlId,
        session_id: evidenceForm.sessionId || null, training_document_id: null,
        label: evidenceForm.label.trim(), description: evidenceForm.description.trim() || null,
        source_kind: 'upload', source_reference: null, action_path: null, storage_path: path,
        file_name: file.name, mime_type: file.type || null, size_bytes: file.size,
        evidence_date: evidenceForm.evidenceDate, expires_at: evidenceForm.expiresAt || null,
        status: 'current', created_at: now, updated_at: now
      };
      const next = [record, ...evidence];
      setEvidence(next); writeJsonStorage(storageKeys.evidence, next);
      setShowEvidenceForm(false); setSuccess('Preuve ajoutée.');
      setSaving('');
      return;
    }

    const uploadResult = await supabase.storage.from('training-documents').upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type || undefined
    });
    if (uploadResult.error) {
      setError(`Envoi du fichier impossible : ${uploadResult.error.message}`);
      setSaving('');
      return;
    }
    const { error: rpcError } = await supabase.rpc('add_training_quality_evidence', {
      p_organization_id: organization.id,
      p_control_id: evidenceForm.controlId,
      p_label: evidenceForm.label.trim(),
      p_description: evidenceForm.description.trim() || null,
      p_session_id: evidenceForm.sessionId || null,
      p_storage_path: path,
      p_file_name: file.name,
      p_mime_type: file.type || null,
      p_size_bytes: file.size,
      p_evidence_date: evidenceForm.evidenceDate,
      p_expires_at: evidenceForm.expiresAt || null
    });
    if (rpcError) {
      await supabase.storage.from('training-documents').remove([path]);
      setError(`Enregistrement de la preuve impossible : ${rpcError.message}`);
    } else {
      setShowEvidenceForm(false); setSuccess('Preuve ajoutée.');
      await loadData(false);
    }
    setSaving('');
  }

  async function openEvidence(item: TrainingQualityEvidenceRecord) {
    if (item.storage_path && supabase && !demoMode) {
      const fileWindow = prepareFileWindow(item.label, 'Ouverture de la preuve…');
      const { data, error: signedError } = await supabase.storage.from('training-documents').createSignedUrl(item.storage_path, 300);
      if (signedError || !data?.signedUrl) {
        closeFileWindow(fileWindow);
        setError(`Ouverture impossible : ${signedError?.message ?? 'lien indisponible'}`);
        return;
      }
      navigateFileWindow(fileWindow, data.signedUrl);
      return;
    }
    if (item.action_path) navigate(item.action_path);
    else setError(demoMode ? 'La prévisualisation des fichiers est inactive en mode démonstration.' : 'Cette preuve ne contient pas de fichier.');
  }

  async function archiveEvidence(item: TrainingQualityEvidenceRecord) {
    if (!organization || !storageKeys) return;
    setSaving(`archive-${item.id}`); setError('');
    if (demoMode || !supabase) {
      const next = evidence.map((candidate) => candidate.id === item.id ? { ...candidate, status: 'archived' as const } : candidate);
      setEvidence(next); writeJsonStorage(storageKeys.evidence, next);
      setSaving('');
      return;
    }
    const { error: rpcError } = await supabase.rpc('archive_training_quality_evidence', {
      p_organization_id: organization.id, p_evidence_id: item.id
    });
    if (rpcError) setError(`Archivage impossible : ${rpcError.message}`);
    else await loadData(false);
    setSaving('');
  }

  async function synchronizeEvidence() {
    if (!organization || demoMode || !supabase) {
      setSuccess('Les preuves automatiques sont déjà synchronisées en mode démonstration.');
      return;
    }
    setSaving('sync'); setError(''); setSuccess('');
    const { error: rpcError } = await supabase.rpc('sync_training_quality_automatic_evidence', {
      p_organization_id: organization.id
    });
    if (rpcError) setError(`Synchronisation impossible : ${rpcError.message}`);
    else {
      await loadData(false);
      setSuccess('Programmes, convocations, supports, attestations et évaluations synchronisés.');
    }
    setSaving('');
  }

  async function createAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !storageKeys) return;
    setSaving('audit'); setError(''); setSuccess('');
    const now = new Date().toISOString();
    if (demoMode || !supabase) {
      const record: TrainingQualityAuditRecord = {
        id: crypto.randomUUID(), organization_id: organization.id, audit_type: auditForm.type,
        status: 'planned', planned_date: auditForm.plannedDate, completed_date: null,
        auditor_name: auditForm.auditorName.trim() || null, scope: auditForm.scope.trim() || null,
        notes: auditForm.notes.trim() || null, result: null, summary_snapshot: {},
        created_at: now, updated_at: now
      };
      const next = [record, ...audits];
      setAudits(next); writeJsonStorage(storageKeys.audits, next);
      setShowAuditForm(false); setAuditForm(initialAuditForm()); setSuccess('Audit planifié.');
      setSaving('');
      return;
    }
    const { error: rpcError } = await supabase.rpc('create_training_quality_audit', {
      p_organization_id: organization.id, p_audit_type: auditForm.type,
      p_planned_date: auditForm.plannedDate, p_auditor_name: auditForm.auditorName.trim() || null,
      p_scope: auditForm.scope.trim() || null, p_notes: auditForm.notes.trim() || null
    });
    if (rpcError) setError(`Planification impossible : ${rpcError.message}`);
    else {
      setShowAuditForm(false); setAuditForm(initialAuditForm()); setSuccess('Audit planifié.');
      await loadData(false);
    }
    setSaving('');
  }

  async function setAuditStatus(audit: TrainingQualityAuditRecord, status: TrainingQualityAuditStatus) {
    if (!organization || !storageKeys) return;
    const result = status === 'completed' ? auditResults[audit.id] : null;
    if (status === 'completed' && !result) {
      setError('Sélectionne le résultat avant de terminer l’audit.');
      return;
    }
    setSaving(`audit-${audit.id}`); setError('');
    if (demoMode || !supabase) {
      const next = audits.map((candidate) => candidate.id === audit.id ? {
        ...candidate, status, result,
        completed_date: status === 'completed' ? new Date().toISOString().slice(0, 10) : null,
        summary_snapshot: status === 'completed' ? {
          applicable_indicators: summary.applicableCount,
          ready_indicators: summary.readyCount,
          active_evidence: evidence.filter((item) => item.status === 'current').length
        } : {}
      } : candidate);
      setAudits(next); writeJsonStorage(storageKeys.audits, next);
      setSaving('');
      return;
    }
    const { error: rpcError } = await supabase.rpc('update_training_quality_audit', {
      p_organization_id: organization.id, p_audit_id: audit.id, p_status: status,
      p_planned_date: audit.planned_date, p_auditor_name: audit.auditor_name,
      p_scope: audit.scope, p_notes: audit.notes, p_result: result
    });
    if (rpcError) setError(`Mise à jour de l’audit impossible : ${rpcError.message}`);
    else await loadData(false);
    setSaving('');
  }

  function exportCsv() {
    if (!organization) return;
    setExporting('csv');
    const result = generateTrainingQualityComplianceCsv(organization, controls, evidence, audits);
    const url = URL.createObjectURL(new Blob([result.content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = result.filename; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setExporting('');
  }

  async function exportPdf() {
    if (!organization) return;
    const fileWindow = prepareFileWindow('Dossier Qualiopi', 'NCR Suite prépare le dossier qualité…');
    setExporting('pdf'); setError('');
    try {
      const { generateTrainingQualityCompliancePdf } = await import('../features/training/qualityCompliancePdf');
      const result = await generateTrainingQualityCompliancePdf({ organization, controls, evidence, audits });
      const buffer = result.bytes.buffer.slice(result.bytes.byteOffset, result.bytes.byteOffset + result.bytes.byteLength) as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
      showBlobDownload(fileWindow, url, result.filename, 'Dossier qualité prêt');
      window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    } catch (caught) {
      closeFileWindow(fileWindow);
      setError(`Export PDF impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setExporting(''); }
  }

  if (!organization) return null;

  return (
    <div className="page training-quality-compliance-page">
      <header className="page-header training-compliance-header">
        <div>
          <p className="eyebrow">FORMATION · QUALITÉ & CONFORMITÉ</p>
          <h1>Qualiopi & conformité</h1>
          <p>Référentiel, preuves, échéances et audits de l’organisme.</p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" type="button" disabled={Boolean(saving)} onClick={() => void synchronizeEvidence()} title="Synchroniser les preuves existantes"><Icon name="refresh" size={17} />{saving === 'sync' ? 'Synchronisation…' : 'Actualiser'}</button>
          <button className="secondary-button" type="button" disabled={Boolean(exporting) || loading} onClick={exportCsv}><Icon name="file" size={17} />CSV</button>
          <button className="primary-button" type="button" disabled={Boolean(exporting) || loading} onClick={() => void exportPdf()}><Icon name="file" size={17} />{exporting === 'pdf' ? 'Préparation…' : 'Dossier PDF'}</button>
        </div>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="training-compliance-metrics" aria-label="Synthèse conformité">
        <article><span><Icon name="chart" size={20} /></span><div><small>Avancement</small><strong>{loading ? '…' : `${summary.progressPercent} %`}</strong><em>{summary.readyCount}/{summary.applicableCount} indicateurs maîtrisés</em></div></article>
        <article><span><Icon name="file" size={20} /></span><div><small>Preuves actives</small><strong>{loading ? '…' : visibleEvidence.length}</strong><em>{summary.expiringEvidenceCount} à renouveler</em></div></article>
        <article className={summary.missingEvidenceCount ? 'is-alert' : ''}><span><Icon name="alert" size={20} /></span><div><small>Sans preuve</small><strong>{loading ? '…' : summary.missingEvidenceCount}</strong><em>indicateurs applicables</em></div></article>
        <article className={summary.attentionCount ? 'is-alert' : ''}><span><Icon name="shield" size={20} /></span><div><small>À corriger</small><strong>{loading ? '…' : summary.attentionCount}</strong><em>écarts déclarés</em></div></article>
        <article><span><Icon name="calendar" size={20} /></span><div><small>Prochain audit</small><strong>{loading ? '…' : summary.nextAudit ? formatTrainingQualityDate(summary.nextAudit.planned_date) : 'Non planifié'}</strong><em>{summary.nextAudit ? trainingQualityAuditTypeLabels[summary.nextAudit.audit_type] : 'calendrier libre'}</em></div></article>
      </section>

      <nav className="training-compliance-tabs" aria-label="Dossier qualité">
        <button type="button" className={tab === 'indicators' ? 'active' : ''} onClick={() => setTab('indicators')}><Icon name="clipboard" size={17} />32 indicateurs</button>
        <button type="button" className={tab === 'evidence' ? 'active' : ''} onClick={() => setTab('evidence')}><Icon name="file" size={17} />Preuves <b>{visibleEvidence.length}</b></button>
        <button type="button" className={tab === 'audits' ? 'active' : ''} onClick={() => setTab('audits')}><Icon name="shield" size={17} />Audits <b>{audits.length}</b></button>
      </nav>

      {tab === 'indicators' && (
        <section className="training-compliance-workspace">
          <article className="panel training-compliance-list">
            <div className="training-compliance-toolbar">
              <label className="training-search"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Indicateur, responsable…" /></label>
              <select value={criterionFilter} onChange={(event) => setCriterionFilter(Number(event.target.value))} aria-label="Critère">
                <option value={0}>Tous les critères</option>
                {trainingQualityCriteria.map((criterion) => <option key={criterion.number} value={criterion.number}>Critère {criterion.number} · {criterion.shortLabel}</option>)}
              </select>
              <select value={indicatorFilter} onChange={(event) => setIndicatorFilter(event.target.value as IndicatorFilter)} aria-label="Statut">
                <option value="all">Tous les statuts</option>
                <option value="missing_evidence">Sans preuve</option>
                {Object.entries(trainingQualityStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            {loading ? <div className="training-empty">Chargement du référentiel…</div> : filteredControls.length === 0 ? <div className="training-empty">Aucun indicateur ne correspond aux filtres.</div> : (
              <div className="training-compliance-control-list">
                {filteredControls.map((control) => {
                  const proofCount = evidence.filter((item) => item.control_id === control.id && item.status === 'current').length;
                  return (
                    <button key={control.id} type="button" className={`training-compliance-control ${selectedControlId === control.id ? 'selected' : ''} status-${control.status}`} onClick={() => selectControl(control)}>
                      <span className="indicator-number">{control.indicator_number}</span>
                      <span className="indicator-main"><strong>{control.title}</strong><small>Critère {control.criterion_number} · {control.owner_name || 'Responsable non défini'}</small></span>
                      <span className={`training-compliance-status status-${control.status}`}>{trainingQualityStatusLabels[control.status]}</span>
                      <span className={`indicator-proof ${proofCount ? '' : 'missing'}`}><Icon name="file" size={14} />{proofCount}</span>
                      <Icon name="chevronRight" size={16} />
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="panel training-compliance-editor">
            {!selectedControl ? (
              <div className="training-compliance-empty-editor"><span><Icon name="clipboard" size={25} /></span><strong>Sélectionne un indicateur</strong><p>Son statut, son échéance et ses preuves apparaîtront ici.</p></div>
            ) : (
              <>
                <header>
                  <div><p className="eyebrow">CRITÈRE {selectedControl.criterion_number} · INDICATEUR {selectedControl.indicator_number}</p><h2>{selectedControl.title}</h2><p>{selectedControl.objective}</p></div>
                  <button className="icon-button" type="button" onClick={() => setSelectedControlId('')} title="Fermer"><Icon name="close" size={18} /></button>
                </header>
                <form onSubmit={saveControl}>
                  <label>Statut<select value={controlForm.status} onChange={(event) => setControlForm((current) => ({ ...current, status: event.target.value as TrainingQualityControlStatus, applicable: event.target.value !== 'not_applicable' }))}>
                    {Object.entries(trainingQualityStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select></label>
                  <div className="training-compliance-form-row">
                    <label>Responsable<input value={controlForm.ownerName} onChange={(event) => setControlForm((current) => ({ ...current, ownerName: event.target.value }))} placeholder="Nom ou fonction" /></label>
                    <label>Échéance<input type="date" value={controlForm.dueDate} onChange={(event) => setControlForm((current) => ({ ...current, dueDate: event.target.value }))} /></label>
                  </div>
                  <label>Constat et actions<textarea value={controlForm.notes} onChange={(event) => setControlForm((current) => ({ ...current, notes: event.target.value }))} rows={4} placeholder="Constat, écart ou action en cours" /></label>
                  <div className="training-compliance-editor-actions">
                    <button className="secondary-button" type="button" onClick={() => openEvidenceForm(selectedControl.id)}><Icon name="plus" size={16} />Ajouter une preuve</button>
                    <button className="primary-button" type="submit" disabled={Boolean(saving)}><Icon name="check" size={16} />{saving === 'control' ? 'Enregistrement…' : 'Enregistrer'}</button>
                  </div>
                </form>
                <div className="training-compliance-linked-evidence">
                  <div><strong>Preuves actives</strong><button className="text-button" type="button" onClick={() => { setTab('evidence'); }}>Tout afficher</button></div>
                  {evidence.filter((item) => item.control_id === selectedControl.id && item.status === 'current').slice(0, 4).map((item) => (
                    <button type="button" key={item.id} onClick={() => void openEvidence(item)}><Icon name={item.source_kind === 'system' ? 'activity' : 'file'} size={16} /><span><strong>{item.label}</strong><small>{formatTrainingQualityDate(item.evidence_date)}{item.expires_at ? ` · expire ${formatTrainingQualityDate(item.expires_at)}` : ''}</small></span><Icon name="chevronRight" size={14} /></button>
                  ))}
                  {!evidence.some((item) => item.control_id === selectedControl.id && item.status === 'current') && <p>Aucune preuve active.</p>}
                </div>
              </>
            )}
          </aside>
        </section>
      )}

      {tab === 'evidence' && (
        <section className="panel training-compliance-evidence-panel">
          <div className="panel-header">
            <div><p className="eyebrow">BIBLIOTHÈQUE</p><h2>Preuves de conformité</h2><p>Documents déposés et éléments réutilisés depuis le parcours Formation.</p></div>
            <button className="primary-button" type="button" onClick={() => openEvidenceForm()}><Icon name="plus" size={17} />Ajouter une preuve</button>
          </div>
          {loading ? <div className="training-empty">Chargement des preuves…</div> : visibleEvidence.length === 0 ? <div className="training-empty">Aucune preuve enregistrée.</div> : (
            <div className="training-compliance-evidence-list">
              {visibleEvidence.map((item) => {
                const control = controlMap.get(item.control_id);
                const session = item.session_id ? sessionMap.get(item.session_id) : null;
                return (
                  <article key={item.id} className={`training-compliance-evidence status-${item.status}`}>
                    <span><Icon name={item.source_kind === 'system' ? 'activity' : 'file'} size={20} /></span>
                    <div><strong>{item.label}</strong><p>Indicateur {control?.indicator_number ?? '—'} · {control?.title ?? 'Référentiel'}</p><small>{formatTrainingQualityDate(item.evidence_date)}{session ? ` · ${session.title}` : ''}{item.file_name ? ` · ${formatSize(item.size_bytes)}` : ''}</small></div>
                    <div className="evidence-meta"><span className={`training-compliance-status status-${item.status === 'expired' ? 'attention' : 'ready'}`}>{item.status === 'expired' ? 'Expirée' : item.source_kind === 'upload' ? 'Déposée' : 'Automatique'}</span>{item.expires_at && <small>Expiration {formatTrainingQualityDate(item.expires_at)}</small>}</div>
                    <div className="evidence-actions"><button className="secondary-button compact-button" type="button" onClick={() => void openEvidence(item)}><Icon name="eye" size={15} />Ouvrir</button><button className="icon-button" type="button" disabled={saving === `archive-${item.id}`} onClick={() => void archiveEvidence(item)} title="Archiver"><Icon name="close" size={15} /></button></div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'audits' && (
        <section className="training-compliance-audits-grid">
          <article className="panel training-compliance-audits-panel">
            <div className="panel-header">
              <div><p className="eyebrow">CALENDRIER</p><h2>Audits qualité</h2><p>Préparation, résultat et photographie du dossier au jour de l’audit.</p></div>
              {canCompleteAudits && <button className="primary-button" type="button" onClick={() => setShowAuditForm(true)}><Icon name="plus" size={17} />Planifier</button>}
            </div>
            {audits.length === 0 ? <div className="training-empty">Aucun audit planifié.</div> : (
              <div className="training-compliance-audit-list">
                {audits.map((audit) => (
                  <article key={audit.id} className={`training-compliance-audit status-${audit.status}`}>
                    <div className="audit-date"><strong>{new Date(`${audit.planned_date}T12:00:00`).getDate()}</strong><small>{new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(new Date(`${audit.planned_date}T12:00:00`))}</small></div>
                    <div className="audit-main"><div><strong>{trainingQualityAuditTypeLabels[audit.audit_type]}</strong><span className={`training-compliance-status status-${audit.status === 'completed' ? audit.result === 'major_nonconformity' ? 'attention' : 'ready' : 'in_progress'}`}>{trainingQualityAuditStatusLabels[audit.status]}</span></div><p>{audit.scope || 'Périmètre à préciser'}</p><small>{audit.auditor_name || 'Auditeur à préciser'}{audit.result ? ` · ${trainingQualityAuditResultLabels[audit.result]}` : ''}</small></div>
                    {canCompleteAudits && audit.status !== 'completed' && <div className="audit-actions">
                      {audit.status === 'planned' ? <button className="secondary-button compact-button" type="button" onClick={() => void setAuditStatus(audit, 'preparing')}>Préparer</button> : <>
                        <select value={auditResults[audit.id] ?? ''} onChange={(event) => setAuditResults((current) => ({ ...current, [audit.id]: event.target.value as Exclude<TrainingQualityAuditResult, null> }))} aria-label="Résultat"><option value="">Résultat…</option>{Object.entries(trainingQualityAuditResultLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                        <button className="primary-button compact-button" type="button" onClick={() => void setAuditStatus(audit, 'completed')}>Terminer</button>
                      </>}
                    </div>}
                  </article>
                ))}
              </div>
            )}
          </article>
          <aside className="panel training-compliance-audit-readiness">
            <span><Icon name={summary.missingEvidenceCount || summary.attentionCount ? 'alert' : 'shield'} size={25} /></span>
            <p className="eyebrow">PRÉPARATION</p>
            <h2>{summary.missingEvidenceCount ? 'Dossier à compléter' : summary.attentionCount ? 'Écarts à traiter' : 'Dossier documenté'}</h2>
            <strong>{summary.progressPercent} %</strong>
            <div><i style={{ width: `${summary.progressPercent}%` }} /></div>
            <p>{summary.missingEvidenceCount} indicateur(s) sans preuve active et {summary.attentionCount} écart(s) déclaré(s).</p>
            <Link className="secondary-button" to="/bpf"><Icon name="chart" size={16} />Ouvrir le BPF</Link>
          </aside>
        </section>
      )}

      {showEvidenceForm && <div className="training-compliance-modal-backdrop" role="presentation">
        <form className="training-compliance-modal" onSubmit={addEvidence}>
          <header><div><p className="eyebrow">NOUVELLE PREUVE</p><h2>Ajouter au dossier qualité</h2></div><button className="icon-button" type="button" onClick={() => setShowEvidenceForm(false)} title="Fermer"><Icon name="close" size={18} /></button></header>
          <label>Indicateur<select required value={evidenceForm.controlId} onChange={(event) => setEvidenceForm((current) => ({ ...current, controlId: event.target.value }))}><option value="">Sélectionner…</option>{controls.map((control) => <option key={control.id} value={control.id}>{control.indicator_number} · {control.title}</option>)}</select></label>
          <label>Fichier<input ref={fileInputRef} type="file" required accept={ACCEPTED_TYPES.join(',')} onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)} /></label>
          <label>Libellé<input required minLength={2} value={evidenceForm.label} onChange={(event) => setEvidenceForm((current) => ({ ...current, label: event.target.value }))} /></label>
          <label>Description<textarea rows={3} value={evidenceForm.description} onChange={(event) => setEvidenceForm((current) => ({ ...current, description: event.target.value }))} /></label>
          <label>Session liée<select value={evidenceForm.sessionId} onChange={(event) => setEvidenceForm((current) => ({ ...current, sessionId: event.target.value }))}><option value="">Preuve générale</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}</select></label>
          <div className="training-compliance-form-row"><label>Date de preuve<input type="date" required value={evidenceForm.evidenceDate} onChange={(event) => setEvidenceForm((current) => ({ ...current, evidenceDate: event.target.value }))} /></label><label>Expiration<input type="date" min={evidenceForm.evidenceDate} value={evidenceForm.expiresAt} onChange={(event) => setEvidenceForm((current) => ({ ...current, expiresAt: event.target.value }))} /></label></div>
          <footer><button className="secondary-button" type="button" onClick={() => setShowEvidenceForm(false)}>Annuler</button><button className="primary-button" type="submit" disabled={Boolean(saving)}><Icon name="plus" size={16} />{saving === 'evidence' ? 'Ajout…' : 'Ajouter'}</button></footer>
        </form>
      </div>}

      {showAuditForm && <div className="training-compliance-modal-backdrop" role="presentation">
        <form className="training-compliance-modal compact" onSubmit={createAudit}>
          <header><div><p className="eyebrow">CALENDRIER QUALITÉ</p><h2>Planifier un audit</h2></div><button className="icon-button" type="button" onClick={() => setShowAuditForm(false)} title="Fermer"><Icon name="close" size={18} /></button></header>
          <label>Type<select value={auditForm.type} onChange={(event) => setAuditForm((current) => ({ ...current, type: event.target.value as TrainingQualityAuditType }))}>{Object.entries(trainingQualityAuditTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Date prévue<input type="date" required value={auditForm.plannedDate} onChange={(event) => setAuditForm((current) => ({ ...current, plannedDate: event.target.value }))} /></label>
          <label>Auditeur<input value={auditForm.auditorName} onChange={(event) => setAuditForm((current) => ({ ...current, auditorName: event.target.value }))} /></label>
          <label>Périmètre<textarea rows={3} value={auditForm.scope} onChange={(event) => setAuditForm((current) => ({ ...current, scope: event.target.value }))} /></label>
          <label>Notes<textarea rows={3} value={auditForm.notes} onChange={(event) => setAuditForm((current) => ({ ...current, notes: event.target.value }))} /></label>
          <footer><button className="secondary-button" type="button" onClick={() => setShowAuditForm(false)}>Annuler</button><button className="primary-button" type="submit" disabled={Boolean(saving)}><Icon name="calendar" size={16} />{saving === 'audit' ? 'Planification…' : 'Planifier'}</button></footer>
        </form>
      </div>}
    </div>
  );
}
