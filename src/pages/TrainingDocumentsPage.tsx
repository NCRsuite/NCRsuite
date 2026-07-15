import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatDateTime,
  personName,
  sessionStatusLabels,
  trainingDocumentCategoryLabels,
  trainingDocumentVisibilityLabels,
  type TrainingDocumentCategory,
  type TrainingDocumentRecord,
  type TrainingDocumentStatus,
  type TrainingDocumentVisibility,
  type TrainingSessionRecord,
  type TrainingTraineeRecord
} from '../features/training/types';
import { closeFileWindow, navigateFileWindow, prepareFileWindow } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = [
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'
];

function initialForm() {
  return {
    title: '',
    category: 'convocation' as TrainingDocumentCategory,
    sessionId: '',
    traineeId: '',
    visibility: 'session' as TrainingDocumentVisibility,
    status: 'published' as TrainingDocumentStatus,
    notes: ''
  };
}

type FormState = ReturnType<typeof initialForm>;

function formatSize(size: number | null) {
  if (!size) return 'Taille inconnue';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

function safeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-120) || 'document';
}

export function TrainingDocumentsPage() {
  const { organization, activeSiteId } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const attestationsArea = location.pathname.endsWith('/attestations');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<TrainingDocumentRecord[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRecord[]>([]);
  const [trainees, setTrainees] = useState<TrainingTraineeRecord[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TrainingDocumentCategory>(() => {
    const requested = searchParams.get('category');
    return requested && requested in trainingDocumentCategoryLabels ? requested as TrainingDocumentCategory : attestationsArea ? 'attestation' : 'all';
  });
  const [statusFilter, setStatusFilter] = useState<'current' | 'archived'>('current');
  const [sessionFilter, setSessionFilter] = useState(() => searchParams.get('session') ?? 'all');
  const [search, setSearch] = useState('');
  const formOpen = searchParams.get('new') === '1';

  async function loadData() {
    if (!organization) return;
    setLoading(true);
    setError('');

    if (demoMode || !supabase) {
      const raw = localStorage.getItem(`ncr-suite-training-documents-${organization.id}`);
      setDocuments(raw ? JSON.parse(raw) as TrainingDocumentRecord[] : []);
      const sessionsRaw = localStorage.getItem(`ncr-suite-training-sessions-${organization.id}`);
      const traineesRaw = localStorage.getItem(`ncr-suite-training-trainees-${organization.id}`);
      setSessions(sessionsRaw ? JSON.parse(sessionsRaw) as TrainingSessionRecord[] : []);
      setTrainees(traineesRaw ? JSON.parse(traineesRaw) as TrainingTraineeRecord[] : []);
      setLoading(false);
      return;
    }

    let documentQuery = supabase
      .from('training_documents')
      .select('id,organization_id,site_id,session_id,program_id,trainee_id,title,category,storage_path,mime_type,size_bytes,visibility,status,notes,generated_automatically,automation_key,generated_at,emailed_at,created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });
    let sessionQuery = supabase
      .from('training_sessions')
      .select('id,organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,capacity,location,modality,status,notes,closed_at,closed_by,closure_notes,reopened_at,reopened_by,created_at')
      .eq('organization_id', organization.id)
      .order('starts_at', { ascending: false });

    if (activeSiteId) {
      documentQuery = documentQuery.eq('site_id', activeSiteId);
      sessionQuery = sessionQuery.eq('site_id', activeSiteId);
    }

    const [documentsResult, sessionsResult, traineesResult] = await Promise.all([
      documentQuery,
      sessionQuery,
      supabase
        .from('training_trainees')
        .select('id,organization_id,first_name,last_name,email,phone,company,notes,status,created_at')
        .eq('organization_id', organization.id)
        .neq('status', 'archived')
        .order('last_name')
    ]);

    const firstError = documentsResult.error || sessionsResult.error || traineesResult.error;
    if (firstError) setError(`Chargement impossible : ${firstError.message}`);
    else {
      setDocuments((documentsResult.data ?? []).map((row) => ({ ...row, size_bytes: row.size_bytes ? Number(row.size_bytes) : null })) as TrainingDocumentRecord[]);
      setSessions((sessionsResult.data ?? []) as TrainingSessionRecord[]);
      setTrainees((traineesResult.data ?? []) as TrainingTraineeRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [organization?.id, activeSiteId, demoMode]);

  useEffect(() => {
    const requestedSession = searchParams.get('session');
    const requestedCategory = searchParams.get('category');
    setSessionFilter(requestedSession || 'all');
    setCategoryFilter(requestedCategory && requestedCategory in trainingDocumentCategoryLabels ? requestedCategory as TrainingDocumentCategory : attestationsArea ? 'attestation' : 'all');
  }, [searchParams, attestationsArea]);

  const sessionMap = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
  const traineeMap = useMemo(() => new Map(trainees.map((trainee) => [trainee.id, trainee])), [trainees]);
  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return documents.filter((document) => {
      if (statusFilter === 'current' && document.status === 'archived') return false;
      if (statusFilter === 'archived' && document.status !== 'archived') return false;
      if (categoryFilter !== 'all' && document.category !== categoryFilter) return false;
      if (sessionFilter !== 'all' && document.session_id !== sessionFilter) return false;
      if (!normalizedSearch) return true;
      const session = document.session_id ? sessionMap.get(document.session_id) : null;
      const trainee = document.trainee_id ? traineeMap.get(document.trainee_id) : null;
      return [document.title, document.notes, session?.title, trainee ? personName(trainee.first_name, trainee.last_name) : '']
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [documents, statusFilter, categoryFilter, sessionFilter, search, sessionMap, traineeMap]);

  const documentGroups = useMemo(() => {
    const bySession = new Map<string, TrainingDocumentRecord[]>();
    for (const document of filteredDocuments) {
      const key = document.session_id ?? 'general';
      const current = bySession.get(key) ?? [];
      current.push(document);
      bySession.set(key, current);
    }
    const sessionOrder = sessions
      .filter((session) => bySession.has(session.id))
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
      .map((session) => session.id);
    if (bySession.has('general')) sessionOrder.push('general');
    return sessionOrder.map((key) => {
      const session = key === 'general' ? null : sessionMap.get(key) ?? null;
      const sessionDocuments = bySession.get(key) ?? [];
      const categories = (Object.keys(trainingDocumentCategoryLabels) as TrainingDocumentCategory[])
        .map((category) => ({ category, documents: sessionDocuments.filter((document) => document.category === category) }))
        .filter((group) => group.documents.length > 0);
      return { key, session, documents: sessionDocuments, categories };
    });
  }, [filteredDocuments, sessions, sessionMap]);

  function renderDocumentCard(document: TrainingDocumentRecord) {
    const session = document.session_id ? sessionMap.get(document.session_id) : null;
    const trainee = document.trainee_id ? traineeMap.get(document.trainee_id) : null;
    return (
      <article key={document.id} className="training-document-card">
        <span className={`training-document-icon category-${document.category}`}><Icon name="file" size={22} /></span>
        <div className="training-document-main">
          <div><strong>{document.title}</strong><span className={`training-status-pill ${document.status === 'published' ? 'active' : ''}`}>{document.status === 'draft' ? 'Brouillon' : document.status === 'archived' ? 'Archivé' : 'Publié'}</span>{document.generated_automatically && <span className="training-status-pill automation">Automatique</span>}{document.emailed_at && <span className="training-status-pill emailed">Envoyé</span>}</div>
          <p>{trainingDocumentCategoryLabels[document.category]} · {formatSize(document.size_bytes)}</p>
          <small>{session ? `Session : ${session.title}` : 'Document général'}{trainee ? ` · ${personName(trainee.first_name, trainee.last_name)}` : ''} · {formatDateTime(document.generated_at || document.created_at)}</small>
        </div>
        <div className="training-document-actions">
          <button className="primary-button compact-button" type="button" disabled={Boolean(downloadingId)} onClick={() => void openDocument(document)}>{downloadingId === `open-${document.id}` ? 'Ouverture…' : 'Visualiser'}</button>
          <button className="secondary-button compact-button" type="button" disabled={Boolean(downloadingId)} onClick={() => void downloadDocument(document)}>{downloadingId === `download-${document.id}` ? 'Téléchargement…' : 'Télécharger'}</button>
          <button className="text-button" type="button" onClick={() => void archiveDocument(document)}>{document.status === 'archived' ? 'Restaurer' : 'Archiver'}</button>
        </div>
      </article>
    );
  }

  function resetForm() {
    setForm(initialForm());
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function onFileSelected(selected: File | null) {
    setError('');
    if (!selected) { setFile(null); return; }
    if (selected.size > MAX_FILE_SIZE) { setError('Le fichier dépasse la limite de 20 Mo.'); return; }
    if (!ACCEPTED_TYPES.includes(selected.type)) { setError('Format non accepté. Utilise un PDF, une image, un document Word, Excel ou texte.'); return; }
    setFile(selected);
    setForm((current) => ({ ...current, title: current.title || selected.name.replace(/\.[^.]+$/, '') }));
  }

  async function saveDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !user) return;
    setError(''); setSuccess('');
    if (!file) { setError('Sélectionne le fichier à déposer.'); return; }
    if (form.title.trim().length < 2) { setError('Renseigne un titre clair.'); return; }
    if (form.visibility === 'session' && !form.sessionId) { setError('Sélectionne la session concernée.'); return; }
    if (form.visibility === 'trainee' && !form.traineeId) { setError('Sélectionne le stagiaire concerné.'); return; }

    const session = form.sessionId ? sessionMap.get(form.sessionId) : null;
    const path = `${organization.id}/${form.sessionId || 'general'}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const record: TrainingDocumentRecord = {
      id: crypto.randomUUID(), organization_id: organization.id, site_id: session?.site_id || activeSiteId || null,
      session_id: form.sessionId || null, program_id: session?.program_id || null, trainee_id: form.traineeId || null,
      title: form.title.trim(), category: form.category, storage_path: path, mime_type: file.type || null,
      size_bytes: file.size, visibility: form.visibility, status: form.status, notes: form.notes.trim() || null,
      created_at: new Date().toISOString()
    };

    setSaving(true);
    if (demoMode || !supabase) {
      const next = [record, ...documents];
      localStorage.setItem(`ncr-suite-training-documents-${organization.id}`, JSON.stringify(next));
      setDocuments(next);
      setSuccess('Document enregistré en mode démonstration.');
      resetForm(); setSearchParams({}); setSaving(false); return;
    }

    const { error: uploadError } = await supabase.storage.from('training-documents').upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type || undefined
    });
    if (uploadError) { setError(`Envoi impossible : ${uploadError.message}`); setSaving(false); return; }

    const { error: insertError } = await supabase.from('training_documents').insert({
      organization_id: organization.id,
      site_id: record.site_id,
      session_id: record.session_id,
      program_id: record.program_id,
      trainee_id: record.trainee_id,
      title: record.title,
      category: record.category,
      storage_path: record.storage_path,
      mime_type: record.mime_type,
      size_bytes: record.size_bytes,
      visibility: record.visibility,
      status: record.status,
      notes: record.notes,
      created_by: user.id
    });

    if (insertError) {
      await supabase.storage.from('training-documents').remove([path]);
      setError(`Enregistrement impossible : ${insertError.message}`);
    } else {
      setSuccess('Document ajouté à la bibliothèque de formation.');
      resetForm(); setSearchParams({}); await loadData();
    }
    setSaving(false);
  }

  function downloadFileName(document: TrainingDocumentRecord) {
    const storageName = document.storage_path.split('/').pop() ?? '';
    const extensionMatch = storageName.match(/(\.[a-z0-9]{1,8})$/i);
    const mimeExtensions: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt'
    };
    const extension = extensionMatch?.[1].toLowerCase() || mimeExtensions[document.mime_type ?? ''] || '';
    const title = safeFileName(document.title).replace(/\.[a-z0-9]{1,8}$/i, '');
    return `${title}${extension}`;
  }

  async function openDocument(document: TrainingDocumentRecord) {
    if (demoMode || !supabase) { setError('La visualisation réelle nécessite Supabase.'); return; }
    const target = prepareFileWindow('Ouverture du document', 'NCR Suite prépare un accès sécurisé au fichier…');
    setDownloadingId(`open-${document.id}`); setError('');
    try {
      const { data, error: signedError } = await supabase.storage
        .from('training-documents')
        .createSignedUrl(document.storage_path, 300);
      if (signedError || !data?.signedUrl) throw new Error(signedError?.message || 'lien indisponible');
      navigateFileWindow(target, data.signedUrl);
    } catch (reason) {
      closeFileWindow(target);
      setError(`Visualisation impossible : ${reason instanceof Error ? reason.message : 'fichier indisponible'}`);
    } finally {
      setDownloadingId('');
    }
  }

  async function downloadDocument(document: TrainingDocumentRecord) {
    if (demoMode || !supabase) { setError('Le téléchargement réel nécessite Supabase.'); return; }
    const filename = downloadFileName(document);
    const target = prepareFileWindow('Téléchargement du document', 'NCR Suite prépare le téléchargement sécurisé…');
    setDownloadingId(`download-${document.id}`); setError('');
    try {
      const { data, error: signedError } = await supabase.storage
        .from('training-documents')
        .createSignedUrl(document.storage_path, 300, { download: filename });
      if (signedError || !data?.signedUrl) throw new Error(signedError?.message || 'lien indisponible');
      navigateFileWindow(target, data.signedUrl);
      setSuccess(`Téléchargement de « ${document.title} » lancé.`);
    } catch (reason) {
      closeFileWindow(target);
      setError(`Téléchargement impossible : ${reason instanceof Error ? reason.message : 'fichier indisponible'}`);
    } finally {
      setDownloadingId('');
    }
  }

  async function archiveDocument(document: TrainingDocumentRecord) {
    if (!organization) return;
    setError(''); setSuccess('');
    const nextStatus: TrainingDocumentStatus = document.status === 'archived' ? 'published' : 'archived';
    if (demoMode || !supabase) {
      const next = documents.map((row) => row.id === document.id ? { ...row, status: nextStatus } : row);
      localStorage.setItem(`ncr-suite-training-documents-${organization.id}`, JSON.stringify(next));
      setDocuments(next); return;
    }
    const { error: updateError } = await supabase.from('training_documents').update({ status: nextStatus }).eq('organization_id', organization.id).eq('id', document.id);
    if (updateError) setError(`Modification impossible : ${updateError.message}`);
    else { setSuccess(nextStatus === 'archived' ? 'Document archivé.' : 'Document restauré.'); await loadData(); }
  }

  if (!organization) return null;

  return (
    <div className="page training-documents-page">
      <header className="page-header">
        <div><p className="eyebrow">FORMATION · {attestationsArea ? 'ATTESTATIONS' : 'DOCUMENTS'}</p><h1>{attestationsArea ? 'Attestations' : 'Documents'}</h1><p>{attestationsArea ? 'Retrouve, visualise et télécharge les attestations générées pour chaque stagiaire.' : 'Centralise les convocations, programmes, supports et attestations de chaque session.'}</p></div>
        <button className="primary-button" type="button" onClick={() => { setForm({ ...initialForm(), category: attestationsArea ? 'attestation' : 'convocation' }); setSearchParams({ new: '1' }); }}><Icon name="plus" size={18} />{attestationsArea ? 'Ajouter une attestation' : 'Ajouter un document'}</button>
      </header>

      {formOpen && (
        <section className="panel training-form-panel training-document-form-panel">
          <div className="panel-header"><div><p className="eyebrow">NOUVEAU DOCUMENT</p><h2>Déposer un fichier</h2></div><button className="icon-button" type="button" onClick={() => { resetForm(); setSearchParams({}); }} aria-label="Fermer"><Icon name="close" size={20} /></button></div>
          <form className="training-form-grid" onSubmit={saveDocument}>
            <label className="full-field training-file-drop"><span>Fichier *</span><input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt" onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)} /><strong>{file ? file.name : 'Choisir un fichier'}</strong><small>{file ? formatSize(file.size) : 'PDF, image, Word, Excel ou texte · 20 Mo maximum'}</small></label>
            <label>Titre *<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
            <label>Catégorie<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as TrainingDocumentCategory }))}>{Object.entries(trainingDocumentCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Session<select value={form.sessionId} onChange={(event) => setForm((current) => ({ ...current, sessionId: event.target.value }))}><option value="">Document général</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.title} · {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(session.starts_at))}</option>)}</select></label>
            <label>Destinataire<select value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as TrainingDocumentVisibility, traineeId: event.target.value === 'trainee' ? current.traineeId : '' }))}>{Object.entries(trainingDocumentVisibilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {form.visibility === 'trainee' && <label className="full-field">Stagiaire *<select value={form.traineeId} onChange={(event) => setForm((current) => ({ ...current, traineeId: event.target.value }))}><option value="">Sélectionner un stagiaire</option>{trainees.map((trainee) => <option key={trainee.id} value={trainee.id}>{personName(trainee.first_name, trainee.last_name)}{trainee.company ? ` · ${trainee.company}` : ''}</option>)}</select></label>}
            <label>État<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TrainingDocumentStatus }))}><option value="published">Publié</option><option value="draft">Brouillon</option></select></label>
            <label className="full-field">Notes internes<textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
            <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => { resetForm(); setSearchParams({}); }}>Annuler</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Envoi…' : 'Enregistrer le document'}</button></div>
          </form>
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="panel training-list-panel">
        <div className="training-toolbar training-document-toolbar">
          <div><p className="eyebrow">BIBLIOTHÈQUE</p><h2>{filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''}</h2></div>
          <div className="training-document-filters">
            <label><span className="sr-only">Rechercher</span><div className="search-field"><Icon name="search" size={17} /><input placeholder="Rechercher…" value={search} onChange={(event) => setSearch(event.target.value)} /></div></label>
            <label><span className="sr-only">Session</span><select value={sessionFilter} onChange={(event) => { const value = event.target.value; setSessionFilter(value); const next = new URLSearchParams(searchParams); if (value === 'all') next.delete('session'); else next.set('session', value); setSearchParams(next); }}><option value="all">Toutes les sessions</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}</select></label>
            {!attestationsArea && <label><span className="sr-only">Catégorie</span><select value={categoryFilter} onChange={(event) => { const value = event.target.value as 'all' | TrainingDocumentCategory; setCategoryFilter(value); const next = new URLSearchParams(searchParams); if (value === 'all') next.delete('category'); else next.set('category', value); setSearchParams(next); }}><option value="all">Toutes les catégories</option>{Object.entries(trainingDocumentCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
            <label><span className="sr-only">État</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'current' | 'archived')}><option value="current">Documents actifs</option><option value="archived">Archives</option></select></label>
          </div>
        </div>

        {loading ? <div className="training-empty">Chargement…</div> : filteredDocuments.length === 0 ? (
          <div className="training-empty"><Icon name="file" size={30} /><strong>{attestationsArea ? 'Aucune attestation' : 'Aucun document'}</strong><span>{attestationsArea ? 'Les attestations générées apparaîtront ici après la clôture des sessions.' : 'Dépose le premier fichier ou modifie les filtres.'}</span></div>
        ) : (
          <div className="training-document-session-groups">
            {documentGroups.map((group, groupIndex) => (
              <details key={group.key} className="training-document-session-group" open={sessionFilter !== 'all' || groupIndex === 0}>
                <summary>
                  <span className="training-document-session-icon"><Icon name={group.session ? 'calendar' : 'file'} size={20} /></span>
                  <span className="training-document-session-title"><strong>{group.session?.title ?? 'Documents généraux'}</strong><small>{group.session ? `${formatDateTime(group.session.starts_at)} · ${sessionStatusLabels[group.session.status]}` : 'Documents non rattachés à une session'}</small></span>
                  <span className="training-document-session-count">{group.documents.length} document{group.documents.length > 1 ? 's' : ''}</span>
                  <Icon name="chevronDown" size={18} />
                </summary>
                <div className="training-document-category-groups">
                  {group.categories.map((categoryGroup) => (
                    <section key={categoryGroup.category} className="training-document-category-group">
                      <header><div><span className={`training-document-icon category-${categoryGroup.category}`}><Icon name="file" size={18} /></span><strong>{trainingDocumentCategoryLabels[categoryGroup.category]}</strong></div><small>{categoryGroup.documents.length}</small></header>
                      <div className="training-document-list">{categoryGroup.documents.map(renderDocumentCard)}</div>
                    </section>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
