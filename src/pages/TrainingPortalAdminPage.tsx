import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  trainingPortalCategoryLabels,
  trainingPortalSubjectLabels,
  trainingSignatureTypeLabels,
  type TrainingPortalAccount,
  type TrainingPortalAdminOverview,
  type TrainingPortalDocument,
  type TrainingPortalSourceDocument,
  type TrainingPortalSubject,
  type TrainingPortalSubjectKind,
  type TrainingSignatureRequest,
  type TrainingSignatureRequestType
} from '../features/training/portalTypes';
import { closeFileWindow, navigateFileWindow, prepareFileWindow } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

type AdminTab = 'access' | 'documents' | 'signatures';

const emptyOverview: TrainingPortalAdminOverview = {
  summary: { active_accounts: 0, pending_invitations: 0, pending_signatures: 0, signed_documents: 0, received_documents: 0 },
  subjects: [],
  accounts: [],
  invitations: [],
  sessions: [],
  account_sessions: [],
  documents: [],
  signatures: [],
  source_documents: []
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

function humanDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—';
  return (withTime ? dateTimeFormatter : dateFormatter).format(new Date(value));
}

function safeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110) || 'document';
}

function portalCategory(value: string) {
  if (['identity', 'prerequisite', 'administrative', 'programme', 'support', 'convocation', 'agreement', 'contract', 'invoice', 'attendance', 'evaluation', 'certificate'].includes(value)) {
    return value;
  }
  return 'other';
}

function defaultSignatureType(category: string): TrainingSignatureRequestType {
  if (category === 'agreement') return 'agreement';
  if (category === 'contract') return 'contract';
  if (category === 'attendance') return 'attendance';
  if (category === 'quote') return 'quote';
  return 'other';
}

export function TrainingPortalAdminPage() {
  const { organization } = useOrganization();
  const [searchParams] = useSearchParams();
  const [overview, setOverview] = useState<TrainingPortalAdminOverview>(emptyOverview);
  const [tab, setTab] = useState<AdminTab>(searchParams.get('signature') ? 'signatures' : 'access');
  const [kind, setKind] = useState<TrainingPortalSubjectKind>('trainee');
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('administrative');
  const [uploadSessionId, setUploadSessionId] = useState('');
  const [uploadSignature, setUploadSignature] = useState(false);
  const [signatureType, setSignatureType] = useState<TrainingSignatureRequestType>('other');
  const [signatureDueDate, setSignatureDueDate] = useState('');

  const canAdministerAccess = ['owner', 'admin'].includes(organization?.role || '');
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role || '');

  const loadOverview = useCallback(async () => {
    if (!supabase || !organization) return;
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('training_portal_admin_overview', {
      p_organization_id: organization.id
    });
    if (rpcError) setError(rpcError.message);
    else setOverview((data || emptyOverview) as TrainingPortalAdminOverview);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const visibleSubjects = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr-FR');
    return overview.subjects.filter((subject) =>
      subject.subject_kind === kind
      && (!needle || `${subject.name} ${subject.email || ''} ${subject.detail || ''}`.toLocaleLowerCase('fr-FR').includes(needle))
    );
  }, [overview.subjects, kind, search]);

  const selectedSubject = useMemo(
    () => overview.subjects.find((subject) => subject.id === subjectId && subject.subject_kind === kind)
      || visibleSubjects[0]
      || null,
    [overview.subjects, visibleSubjects, subjectId, kind]
  );

  const subjectAccounts = useMemo(
    () => selectedSubject
      ? overview.accounts.filter((account) => account.subject_kind === selectedSubject.subject_kind && account.subject_id === selectedSubject.id)
      : [],
    [overview.accounts, selectedSubject]
  );

  const selectedAccount = useMemo(
    () => subjectAccounts.find((account) => account.id === accountId)
      || subjectAccounts.find((account) => account.status === 'active')
      || subjectAccounts[0]
      || null,
    [subjectAccounts, accountId]
  );

  useEffect(() => {
    if (!selectedSubject) {
      setSubjectId('');
      return;
    }
    if (subjectId !== selectedSubject.id) {
      setSubjectId(selectedSubject.id);
      setInviteEmail(selectedSubject.email || '');
      setInviteName(selectedSubject.name);
    }
  }, [selectedSubject, subjectId]);

  useEffect(() => {
    if (selectedAccount && accountId !== selectedAccount.id) setAccountId(selectedAccount.id);
    if (!selectedAccount && accountId) setAccountId('');
  }, [selectedAccount, accountId]);

  const eligibleSessionIds = useMemo(
    () => new Set(overview.account_sessions.filter((item) => item.account_id === selectedAccount?.id).map((item) => item.session_id)),
    [overview.account_sessions, selectedAccount]
  );

  const eligibleSessions = useMemo(
    () => overview.sessions.filter((session) => eligibleSessionIds.has(session.id)),
    [overview.sessions, eligibleSessionIds]
  );

  const accountDocuments = useMemo(
    () => selectedSubject
      ? overview.documents.filter((document) => document.subject_kind === selectedSubject.subject_kind && document.subject_id === selectedSubject.id)
      : [],
    [overview.documents, selectedSubject]
  );

  const sourceDocuments = useMemo(() => {
    if (!selectedSubject || !selectedAccount) return [];
    const alreadyShared = new Set(accountDocuments.map((document) => `${document.storage_bucket}:${document.storage_path}`));
    return overview.source_documents.filter((document) => {
      if (alreadyShared.has(`${document.storage_bucket}:${document.storage_path}`)) return false;
      if (selectedSubject.subject_kind === 'trainee') {
        return document.trainee_id === selectedSubject.id || Boolean(document.session_id && eligibleSessionIds.has(document.session_id));
      }
      if (selectedSubject.subject_kind === 'trainer') {
        return Boolean(document.session_id && eligibleSessionIds.has(document.session_id));
      }
      return document.customer_id === selectedSubject.id;
    });
  }, [selectedSubject, selectedAccount, accountDocuments, overview.source_documents, eligibleSessionIds]);

  const accountSignatures = useMemo(
    () => selectedAccount ? overview.signatures.filter((request) => request.account_id === selectedAccount.id) : overview.signatures,
    [overview.signatures, selectedAccount]
  );

  function clearMessages() {
    setError('');
    setSuccess('');
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !organization || !selectedSubject) return;
    setBusyId('invite');
    clearMessages();
    try {
      const { error: rpcError } = await supabase.rpc('create_training_portal_invitation', {
        p_organization_id: organization.id,
        p_subject_kind: selectedSubject.subject_kind,
        p_subject_id: selectedSubject.id,
        p_email: inviteEmail,
        p_display_name: inviteName || null
      });
      if (rpcError) throw rpcError;
      setSuccess(`Invitation envoyée à ${inviteEmail}.`);
      await loadOverview();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invitation impossible.');
    } finally {
      setBusyId('');
    }
  }

  async function invitationAction(id: string, action: 'resend' | 'revoke') {
    if (!supabase || !organization) return;
    setBusyId(id);
    clearMessages();
    try {
      const { error: rpcError } = await supabase.rpc(
        action === 'resend' ? 'resend_training_portal_invitation' : 'revoke_training_portal_invitation',
        { p_organization_id: organization.id, p_invitation_id: id }
      );
      if (rpcError) throw rpcError;
      setSuccess(action === 'resend' ? 'Invitation renvoyée.' : 'Invitation révoquée.');
      await loadOverview();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action impossible.');
    } finally {
      setBusyId('');
    }
  }

  async function toggleAccount(account: TrainingPortalAccount) {
    if (!supabase || !organization) return;
    setBusyId(account.id);
    clearMessages();
    try {
      const { error: rpcError } = await supabase.rpc('set_training_portal_account_status', {
        p_organization_id: organization.id,
        p_account_id: account.id,
        p_status: account.status === 'active' ? 'disabled' : 'active'
      });
      if (rpcError) throw rpcError;
      setSuccess(account.status === 'active' ? 'Accès suspendu.' : 'Accès réactivé.');
      await loadOverview();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Modification impossible.');
    } finally {
      setBusyId('');
    }
  }

  async function requestSignature(portalDocumentId: string, title: string, type: TrainingSignatureRequestType) {
    if (!supabase || !organization || !selectedAccount) return;
    const { error: signatureError } = await supabase.rpc('create_training_signature_request', {
      p_organization_id: organization.id,
      p_account_id: selectedAccount.id,
      p_portal_document_id: portalDocumentId,
      p_title: title,
      p_request_type: type,
      p_due_date: signatureDueDate || null
    });
    if (signatureError) throw signatureError;
  }

  async function uploadDocument(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !organization || !selectedAccount || !selectedSubject || !uploadFile) return;
    if (uploadFile.size > 20 * 1024 * 1024) {
      setError('Le fichier dépasse la limite de 20 Mo.');
      return;
    }
    setBusyId('upload');
    clearMessages();
    const sessionFolder = uploadSessionId || 'general';
    const path = `${organization.id}/${selectedSubject.subject_kind}/${selectedSubject.id}/${sessionFolder}/${crypto.randomUUID()}-${safeFileName(uploadFile.name)}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from('training-portal-documents')
        .upload(path, uploadFile, { contentType: uploadFile.type || undefined, upsert: false });
      if (uploadError) throw uploadError;
      const candidateTitle = uploadTitle.trim() || uploadFile.name;
      const title = candidateTitle.length >= 2 ? candidateTitle : 'Document partagé';
      const { data: portalDocumentId, error: publishError } = await supabase.rpc('publish_training_portal_document', {
        p_organization_id: organization.id,
        p_account_id: selectedAccount.id,
        p_session_id: uploadSessionId || null,
        p_title: title,
        p_category: uploadCategory,
        p_storage_bucket: 'training-portal-documents',
        p_storage_path: path,
        p_mime_type: uploadFile.type || null,
        p_size_bytes: uploadFile.size,
        p_training_document_id: null,
        p_commercial_document_id: null,
        p_invoice_id: null
      });
      if (publishError) throw publishError;
      if (uploadSignature) await requestSignature(portalDocumentId as string, title, signatureType);
      setUploadFile(null);
      setUploadTitle('');
      setUploadSessionId('');
      setUploadSignature(false);
      const input = document.getElementById('training-admin-document') as HTMLInputElement | null;
      if (input) input.value = '';
      setSuccess(uploadSignature ? 'Document partagé et demande de signature envoyée.' : 'Document partagé dans l’espace.');
      await loadOverview();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Publication impossible.');
    } finally {
      setBusyId('');
    }
  }

  async function shareSource(document: TrainingPortalSourceDocument, withSignature: boolean) {
    if (!supabase || !organization || !selectedAccount) return;
    setBusyId(document.id + (withSignature ? '-sign' : ''));
    clearMessages();
    try {
      const category = portalCategory(document.category);
      const { data: portalDocumentId, error: publishError } = await supabase.rpc('publish_training_portal_document', {
        p_organization_id: organization.id,
        p_account_id: selectedAccount.id,
        p_session_id: document.session_id,
        p_title: document.title,
        p_category: category,
        p_storage_bucket: document.storage_bucket,
        p_storage_path: document.storage_path,
        p_mime_type: document.mime_type,
        p_size_bytes: document.size_bytes,
        p_training_document_id: document.training_document_id,
        p_commercial_document_id: document.commercial_document_id,
        p_invoice_id: document.invoice_id
      });
      if (publishError) throw publishError;
      if (withSignature) await requestSignature(
        portalDocumentId as string,
        document.title,
        defaultSignatureType(document.category)
      );
      setSuccess(withSignature ? 'Document partagé et signature demandée.' : 'Document partagé.');
      await loadOverview();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Partage impossible.');
    } finally {
      setBusyId('');
    }
  }

  async function archiveDocument(document: TrainingPortalDocument) {
    if (!supabase || !organization) return;
    setBusyId(document.id);
    clearMessages();
    try {
      const { error: rpcError } = await supabase.rpc('archive_training_portal_document', {
        p_organization_id: organization.id,
        p_document_id: document.id
      });
      if (rpcError) throw rpcError;
      setSuccess('Document retiré de l’espace.');
      await loadOverview();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Archivage impossible.');
    } finally {
      setBusyId('');
    }
  }

  async function openDocument(bucket: string, path: string) {
    if (!supabase) return;
    const fileWindow = prepareFileWindow('Ouverture du document', 'Préparation du lien sécurisé…');
    const { data, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (signedError || !data?.signedUrl) {
      closeFileWindow(fileWindow);
      setError(signedError?.message || 'Document indisponible.');
      return;
    }
    navigateFileWindow(fileWindow, data.signedUrl);
  }

  async function signatureAction(request: TrainingSignatureRequest, action: 'remind' | 'cancel') {
    if (!supabase || !organization) return;
    setBusyId(request.id);
    clearMessages();
    try {
      const { error: rpcError } = await supabase.rpc(
        action === 'remind' ? 'remind_training_signature_request' : 'cancel_training_signature_request',
        { p_organization_id: organization.id, p_request_id: request.id }
      );
      if (rpcError) throw rpcError;
      setSuccess(action === 'remind' ? 'Relance envoyée.' : 'Demande annulée.');
      await loadOverview();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action impossible.');
    } finally {
      setBusyId('');
    }
  }

  if (!organization) return null;

  const highlightedSignature = searchParams.get('signature');

  return (
    <div className="page training-portal-admin-page">
      <header className="page-header training-portal-admin-header">
        <div>
          <p className="eyebrow">FORMATION · ESPACES EXTERNES</p>
          <h1>Espaces & signatures</h1>
          <p>Ouvrez les accès, classez les pièces et suivez les preuves de signature depuis une seule console.</p>
        </div>
        <button className="secondary-button" onClick={() => void loadOverview()} disabled={loading}>
          <Icon name="refresh" size={17} />{loading ? 'Actualisation…' : 'Actualiser'}
        </button>
      </header>

      <div className="training-portal-admin-metrics">
        <article><span><Icon name="users" size={18} /></span><div><strong>{overview.summary.active_accounts}</strong><small>Accès actifs</small></div></article>
        <article><span><Icon name="clock" size={18} /></span><div><strong>{overview.summary.pending_invitations}</strong><small>Invitations</small></div></article>
        <article className={overview.summary.pending_signatures ? 'attention' : ''}><span><Icon name="signature" size={18} /></span><div><strong>{overview.summary.pending_signatures}</strong><small>À signer</small></div></article>
        <article><span><Icon name="check" size={18} /></span><div><strong>{overview.summary.signed_documents}</strong><small>Preuves signées</small></div></article>
        <article><span><Icon name="file" size={18} /></span><div><strong>{overview.summary.received_documents}</strong><small>Pièces reçues</small></div></article>
      </div>

      <div className="training-portal-admin-tabs" role="tablist" aria-label="Gestion des espaces Formation">
        <button className={tab === 'access' ? 'active' : ''} onClick={() => setTab('access')}><Icon name="users" size={17} />Accès</button>
        <button className={tab === 'documents' ? 'active' : ''} onClick={() => setTab('documents')}><Icon name="file" size={17} />Documents</button>
        <button className={tab === 'signatures' ? 'active' : ''} onClick={() => setTab('signatures')}><Icon name="signature" size={17} />Signatures</button>
      </div>

      {error && <div className="training-portal-admin-notice error"><Icon name="alert" size={18} /><span>{error}</span></div>}
      {success && <div className="training-portal-admin-notice success"><Icon name="check" size={18} /><span>{success}</span></div>}

      <div className="training-portal-admin-workspace">
        <aside className="training-portal-subjects">
          <div className="training-portal-kind-switch">
            {(['trainee', 'trainer', 'client'] as TrainingPortalSubjectKind[]).map((item) => (
              <button
                className={kind === item ? 'active' : ''}
                onClick={() => { setKind(item); setSubjectId(''); setAccountId(''); }}
                key={item}
              >
                {trainingPortalSubjectLabels[item]}s
              </button>
            ))}
          </div>
          <label className="training-portal-subject-search"><Icon name="search" size={16} /><input placeholder="Rechercher…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <div className="training-portal-subject-list">
            {visibleSubjects.length === 0 ? <p>Aucune fiche correspondante.</p> : visibleSubjects.map((subject: TrainingPortalSubject) => {
              const accounts = overview.accounts.filter((account) => account.subject_kind === subject.subject_kind && account.subject_id === subject.id);
              const pending = overview.invitations.some((invitation) => invitation.subject_kind === subject.subject_kind && invitation.subject_id === subject.id && invitation.status === 'pending');
              const active = accounts.some((account) => account.status === 'active');
              return (
                <button className={selectedSubject?.id === subject.id ? 'active' : ''} onClick={() => { setSubjectId(subject.id); setAccountId(''); setInviteEmail(subject.email || ''); setInviteName(subject.name); }} key={subject.id}>
                  <span>{subject.name.slice(0, 2).toUpperCase()}</span>
                  <div><strong>{subject.name}</strong><small>{subject.email || subject.detail || 'E-mail à renseigner'}</small></div>
                  <i className={active ? 'active' : pending ? 'pending' : 'none'} title={active ? 'Accès actif' : pending ? 'Invitation en attente' : 'Aucun accès'} />
                </button>
              );
            })}
          </div>
        </aside>

        <section className="training-portal-admin-main">
          {!selectedSubject ? (
            <div className="training-portal-admin-empty"><Icon name="users" size={30} /><strong>Sélectionnez une fiche</strong><span>Choisissez un stagiaire, un formateur ou un client.</span></div>
          ) : (
            <>
              <header className="training-portal-subject-header">
                <div><span>{selectedSubject.name.slice(0, 2).toUpperCase()}</span><div><p className="eyebrow">ESPACE {trainingPortalSubjectLabels[selectedSubject.subject_kind].toUpperCase()}</p><h2>{selectedSubject.name}</h2><small>{selectedSubject.detail || selectedSubject.email || 'Aucun détail'} · {selectedSubject.session_count} session{selectedSubject.session_count > 1 ? 's' : ''}</small></div></div>
                {subjectAccounts.length > 1 && <select value={selectedAccount?.id || ''} onChange={(event) => setAccountId(event.target.value)}>{subjectAccounts.map((account) => <option value={account.id} key={account.id}>{account.email} · {account.status === 'active' ? 'actif' : 'suspendu'}</option>)}</select>}
              </header>

              {tab === 'access' && (
                <div className="training-portal-admin-two-columns">
                  <section className="training-portal-admin-section">
                    <header><div><h3>Accès actifs</h3><p>Comptes ayant accepté une invitation.</p></div></header>
                    {subjectAccounts.length === 0 ? <div className="training-portal-admin-empty compact">Aucun accès accepté.</div> : (
                      <div className="training-portal-access-list">
                        {subjectAccounts.map((account) => (
                          <article key={account.id}>
                            <span className={account.status}><Icon name={account.status === 'active' ? 'check' : 'lock'} size={17} /></span>
                            <div><strong>{account.display_name || selectedSubject.name}</strong><small>{account.email} · dernière visite {humanDate(account.last_seen_at, true)}</small></div>
                            {canAdministerAccess && <button className="secondary-button compact-button" onClick={() => void toggleAccount(account)} disabled={busyId === account.id}>{account.status === 'active' ? 'Suspendre' : 'Réactiver'}</button>}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                  <section className="training-portal-admin-section">
                    <header><div><h3>Inviter dans cet espace</h3><p>Le lien personnel reste valable 7 jours.</p></div></header>
                    {canAdministerAccess ? (
                      <form className="training-portal-invite-form" onSubmit={invite}>
                        <label>Nom affiché<input value={inviteName} onChange={(event) => setInviteName(event.target.value)} required /></label>
                        <label>Adresse e-mail<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required /></label>
                        <button className="primary-button" disabled={busyId === 'invite'}>{busyId === 'invite' ? 'Envoi…' : 'Envoyer l’invitation'}</button>
                      </form>
                    ) : <div className="training-portal-admin-empty compact">Seuls le propriétaire et les administrateurs peuvent inviter.</div>}
                    {overview.invitations.filter((invitation) => invitation.subject_kind === selectedSubject.subject_kind && invitation.subject_id === selectedSubject.id).map((invitation) => (
                      <article className="training-portal-pending-invite" key={invitation.id}>
                        <div><strong>{invitation.email}</strong><small>{invitation.status === 'expired' ? 'Expirée' : `Valable jusqu’au ${humanDate(invitation.expires_at)}`}</small></div>
                        {canAdministerAccess && <div><button className="icon-button" onClick={() => void invitationAction(invitation.id, 'resend')} disabled={busyId === invitation.id} title="Renvoyer" aria-label="Renvoyer"><Icon name="refresh" size={17} /></button><button className="icon-button danger" onClick={() => void invitationAction(invitation.id, 'revoke')} disabled={busyId === invitation.id || invitation.status === 'expired'} title="Révoquer" aria-label="Révoquer"><Icon name="close" size={17} /></button></div>}
                      </article>
                    ))}
                  </section>
                </div>
              )}

              {tab === 'documents' && (
                selectedAccount?.status === 'active' ? (
                  <div className="training-portal-document-console">
                    <form className="training-portal-publish-form" onSubmit={uploadDocument}>
                      <header><div><h3>Partager un nouveau document</h3><p>Le fichier sera classé dans le dossier de {selectedSubject.name}.</p></div><span><Icon name="plus" size={19} /></span></header>
                      <div className="training-portal-form-grid">
                        <label>Titre<input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Nom affiché dans le portail" /></label>
                        <label>Catégorie<select value={uploadCategory} onChange={(event) => { setUploadCategory(event.target.value); setSignatureType(defaultSignatureType(event.target.value)); }}><option value="administrative">Administratif</option><option value="programme">Programme</option><option value="support">Support pédagogique</option><option value="convocation">Convocation</option><option value="agreement">Convention</option><option value="contract">Contrat</option><option value="invoice">Facture</option><option value="attendance">Émargement</option><option value="certificate">Attestation</option><option value="other">Autre</option></select></label>
                        <label>Session<select value={uploadSessionId} onChange={(event) => setUploadSessionId(event.target.value)}><option value="">Dossier général</option>{eligibleSessions.map((session) => <option value={session.id} key={session.id}>{session.title}</option>)}</select></label>
                        <label className="training-portal-admin-file"><span>{uploadFile?.name || 'Choisir le fichier'}</span><input id="training-admin-document" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} required /></label>
                      </div>
                      <label className="training-toggle-field"><input type="checkbox" checked={uploadSignature} onChange={(event) => setUploadSignature(event.target.checked)} /><span><strong>Demander une signature</strong><small>Un e-mail et une demande traçable seront créés.</small></span></label>
                      {uploadSignature && <div className="training-portal-form-grid"><label>Type<select value={signatureType} onChange={(event) => setSignatureType(event.target.value as TrainingSignatureRequestType)}>{Object.entries(trainingSignatureTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Échéance<input type="date" value={signatureDueDate} onChange={(event) => setSignatureDueDate(event.target.value)} /></label></div>}
                      <button className="primary-button" disabled={!uploadFile || busyId === 'upload'}>{busyId === 'upload' ? 'Publication…' : uploadSignature ? 'Partager et faire signer' : 'Partager le document'}</button>
                    </form>

                    <section className="training-portal-admin-section">
                      <header><div><h3>Documents déjà disponibles</h3><p>{accountDocuments.length} document{accountDocuments.length > 1 ? 's' : ''} partagé{accountDocuments.length > 1 ? 's' : ''}.</p></div></header>
                      {accountDocuments.length === 0 ? <div className="training-portal-admin-empty compact">Aucun document partagé.</div> : <div className="training-portal-admin-document-list">{accountDocuments.map((document) => <article key={document.id}><span><Icon name={document.direction === 'portal_to_organization' ? 'plus' : 'file'} size={18} /></span><div><strong>{document.title}</strong><small>{trainingPortalCategoryLabels[document.category] || document.category} · {document.direction === 'portal_to_organization' ? 'reçu' : 'envoyé'} le {humanDate(document.published_at)}</small></div><div><button className="icon-button" onClick={() => void openDocument(document.storage_bucket, document.storage_path)} title="Ouvrir" aria-label="Ouvrir"><Icon name="eye" size={17} /></button><button className="icon-button danger" onClick={() => void archiveDocument(document)} disabled={busyId === document.id} title="Retirer" aria-label="Retirer"><Icon name="close" size={17} /></button></div></article>)}</div>}
                    </section>

                    <section className="training-portal-admin-section">
                      <header><div><h3>Pièces Formation prêtes à partager</h3><p>Documents, devis, conventions et factures déjà générés dans NCR Suite.</p></div></header>
                      {sourceDocuments.length === 0 ? <div className="training-portal-admin-empty compact">Aucune nouvelle pièce compatible.</div> : <div className="training-portal-source-list">{sourceDocuments.map((document) => <article key={`${document.source_kind}-${document.id}`}><span><Icon name={document.source_kind === 'invoice' ? 'creditCard' : 'file'} size={18} /></span><div><strong>{document.title}</strong><small>{trainingPortalCategoryLabels[document.category] || document.category} · {humanDate(document.created_at)}</small></div><div><button className="secondary-button compact-button" onClick={() => void shareSource(document, false)} disabled={busyId === document.id}>Partager</button>{document.source_kind !== 'invoice' && <button className="primary-button compact-button" onClick={() => void shareSource(document, true)} disabled={busyId === `${document.id}-sign`}>Partager & signer</button>}</div></article>)}</div>}
                    </section>
                  </div>
                ) : <div className="training-portal-admin-empty"><Icon name="lock" size={28} /><strong>Accès actif requis</strong><span>Invitez d’abord le destinataire ou réactivez son compte pour lui partager des documents.</span></div>
              )}

              {tab === 'signatures' && (
                <section className="training-portal-admin-section training-portal-signature-console">
                  <header><div><h3>Demandes et preuves</h3><p>Historique horodaté, relances et empreintes Qualiopi.</p></div><select value={selectedAccount?.id || ''} onChange={(event) => setAccountId(event.target.value)}><option value="">Tous les comptes</option>{subjectAccounts.map((account) => <option value={account.id} key={account.id}>{account.email}</option>)}</select></header>
                  {accountSignatures.length === 0 ? <div className="training-portal-admin-empty compact">Aucune demande de signature.</div> : (
                    <div className="training-portal-admin-signature-list">
                      {accountSignatures.map((request) => (
                        <article className={highlightedSignature === request.id ? 'highlighted' : ''} key={request.id}>
                          <div className="training-portal-signature-row">
                            <span className={`training-portal-signature-state ${request.status}`}><Icon name={request.status === 'signed' ? 'check' : request.status === 'pending' ? 'signature' : 'close'} size={18} /></span>
                            <div><strong>{request.title}</strong><small>{trainingSignatureTypeLabels[request.request_type]} · créée le {humanDate(request.created_at)}{request.due_date ? ` · échéance ${humanDate(request.due_date)}` : ''}</small>{request.proof_reference && <b>{request.proof_reference}</b>}</div>
                            <span className={`training-portal-status ${request.status}`}>{request.status === 'pending' ? 'À signer' : request.status === 'signed' ? 'Signé' : 'Annulé'}</span>
                            <div className="training-portal-signature-actions"><button className="icon-button" onClick={() => void openDocument(request.source_bucket, request.source_path)} title="Ouvrir" aria-label="Ouvrir"><Icon name="eye" size={17} /></button>{request.status === 'pending' && <><button className="secondary-button compact-button" onClick={() => void signatureAction(request, 'remind')} disabled={busyId === request.id}>Relancer</button><button className="danger-text-button" onClick={() => void signatureAction(request, 'cancel')} disabled={busyId === request.id}>Annuler</button></>}</div>
                          </div>
                          <details>
                            <summary>Voir la preuve et l’historique</summary>
                            {request.status === 'signed' && <><dl><div><dt>Signataire</dt><dd>{request.signer_name}</dd></div><div><dt>Signé le</dt><dd>{humanDate(request.signed_at, true)}</dd></div><div><dt>Empreinte document</dt><dd>{request.document_sha256}</dd></div><div><dt>Empreinte preuve</dt><dd>{request.signature_payload_sha256}</dd></div></dl>{request.signature_image_path && <button className="secondary-button compact-button" onClick={() => void openDocument('training-portal-documents', request.signature_image_path!)}>Voir la signature</button>}</>}
                            <ol>{request.events.map((event, index) => <li key={event.id || `${event.event_type}-${index}`}><span /><div><strong>{event.event_type === 'requested' ? 'Demande créée' : event.event_type === 'viewed' ? 'Document consulté' : event.event_type === 'reminded' ? 'Relance envoyée' : event.event_type === 'signed' ? 'Document signé' : 'Demande annulée'}</strong><small>{humanDate(event.occurred_at, true)} · {event.actor_label || 'Système'}</small></div></li>)}</ol>
                          </details>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
