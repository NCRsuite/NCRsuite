import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { TrainingPortalSignatureModal } from '../components/TrainingPortalSignatureModal';
import { useAuth } from '../contexts/AuthContext';
import {
  trainingPortalCategoryLabels,
  trainingPortalSubjectLabels,
  trainingSignatureTypeLabels,
  type CurrentTrainingPortalAccount,
  type TrainingPortalDashboard,
  type TrainingPortalDocument,
  type TrainingSignatureRequest
} from '../features/training/portalTypes';
import { closeFileWindow, navigateFileWindow, prepareFileWindow } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

type PortalTab = 'overview' | 'sessions' | 'documents' | 'signatures';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

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

async function sha256(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sessionStatus(value: string) {
  return ({
    draft: 'Brouillon',
    scheduled: 'Planifiée',
    confirmed: 'Confirmée',
    in_progress: 'En cours',
    completed: 'Terminée',
    canceled: 'Annulée'
  } as Record<string, string>)[value] || value;
}

function signatureStatus(value: string) {
  return ({ pending: 'À signer', signed: 'Signé', declined: 'Refusé', canceled: 'Annulé' } as Record<string, string>)[value] || value;
}

export function TrainingPortalPage() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authPending, setAuthPending] = useState(false);
  const [accounts, setAccounts] = useState<CurrentTrainingPortalAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [dashboard, setDashboard] = useState<TrainingPortalDashboard | null>(null);
  const [tab, setTab] = useState<PortalTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [depositFile, setDepositFile] = useState<File | null>(null);
  const [depositCategory, setDepositCategory] = useState('administrative');
  const [depositSessionId, setDepositSessionId] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [signatureRequest, setSignatureRequest] = useState<TrainingSignatureRequest | null>(null);
  const [signing, setSigning] = useState(false);

  const activeAccount = useMemo(
    () => accounts.find((account) => account.account_id === accountId) || accounts[0] || null,
    [accounts, accountId]
  );

  const loadAccounts = useCallback(async () => {
    if (!supabase || !user) {
      setAccounts([]);
      setDashboard(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('current_training_portal_accounts');
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    const nextAccounts = (data || []) as CurrentTrainingPortalAccount[];
    setAccounts(nextAccounts);
    const storedId = localStorage.getItem('ncr-training-portal-account');
    const nextId = nextAccounts.some((item) => item.account_id === storedId)
      ? storedId!
      : nextAccounts[0]?.account_id || '';
    setAccountId(nextId);
    setLoading(false);
  }, [user]);

  const loadDashboard = useCallback(async (nextAccountId: string) => {
    if (!supabase || !nextAccountId) {
      setDashboard(null);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('training_portal_dashboard', { p_account_id: nextAccountId });
    if (rpcError) setError(rpcError.message);
    else setDashboard(data as TrainingPortalDashboard);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) void loadAccounts();
  }, [authLoading, loadAccounts]);

  useEffect(() => {
    if (!accountId) return;
    localStorage.setItem('ncr-training-portal-account', accountId);
    void loadDashboard(accountId);
  }, [accountId, loadDashboard]);

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    setAuthPending(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Connexion impossible.');
    } finally {
      setAuthPending(false);
    }
  }

  async function openStoredFile(bucket: string, path: string, requestId?: string) {
    if (!supabase) return;
    const fileWindow = prepareFileWindow('Ouverture du document', 'Préparation du lien sécurisé…');
    setError('');
    try {
      if (requestId && accountId) {
        const { error: viewedError } = await supabase.rpc('mark_training_signature_viewed', {
          p_account_id: accountId,
          p_request_id: requestId
        });
        if (viewedError) throw viewedError;
      }
      const { data, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
      if (signedError || !data?.signedUrl) throw signedError || new Error('Document indisponible.');
      navigateFileWindow(fileWindow, data.signedUrl);
      if (requestId) void loadDashboard(accountId);
    } catch (caught) {
      closeFileWindow(fileWindow);
      setError(caught instanceof Error ? caught.message : 'Ouverture impossible.');
    }
  }

  async function depositDocument(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !activeAccount || !depositFile) return;
    if (depositFile.size > 20 * 1024 * 1024) {
      setError('Le fichier dépasse la limite de 20 Mo.');
      return;
    }
    setDepositing(true);
    setError('');
    setSuccess('');
    const sessionFolder = depositSessionId || 'general';
    const path = `${activeAccount.organization_id}/${activeAccount.subject_kind}/${activeAccount.subject_id}/${sessionFolder}/${crypto.randomUUID()}-${safeFileName(depositFile.name)}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from('training-portal-documents')
        .upload(path, depositFile, { contentType: depositFile.type || undefined, upsert: false });
      if (uploadError) throw uploadError;
      const { error: rpcError } = await supabase.rpc('register_training_portal_document', {
        p_account_id: activeAccount.account_id,
        p_session_id: depositSessionId || null,
        p_title: depositFile.name.trim().length >= 2 ? depositFile.name : 'Document déposé',
        p_category: depositCategory,
        p_storage_path: path,
        p_mime_type: depositFile.type || null,
        p_size_bytes: depositFile.size
      });
      if (rpcError) throw rpcError;
      setDepositFile(null);
      setDepositSessionId('');
      const input = document.getElementById('training-portal-deposit') as HTMLInputElement | null;
      if (input) input.value = '';
      setSuccess('La pièce a été déposée dans le bon dossier.');
      await loadDashboard(activeAccount.account_id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Dépôt impossible.');
    } finally {
      setDepositing(false);
    }
  }

  async function completeSignature(signature: Blob, signerName: string) {
    if (!supabase || !activeAccount || !signatureRequest) return;
    setSigning(true);
    setError('');
    setSuccess('');
    try {
      const { data: sourceBlob, error: downloadError } = await supabase.storage
        .from(signatureRequest.source_bucket)
        .download(signatureRequest.source_path);
      if (downloadError || !sourceBlob) throw downloadError || new Error('Document source indisponible.');
      const documentHash = await sha256(sourceBlob);
      const signaturePath = `${activeAccount.organization_id}/${activeAccount.subject_kind}/${activeAccount.subject_id}/signatures/${signatureRequest.id}/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('training-portal-documents')
        .upload(signaturePath, signature, { contentType: 'image/png', upsert: false });
      if (uploadError) throw uploadError;
      const { data, error: rpcError } = await supabase.rpc('complete_training_signature', {
        p_account_id: activeAccount.account_id,
        p_request_id: signatureRequest.id,
        p_signer_name: signerName,
        p_signature_image_path: signaturePath,
        p_document_sha256: documentHash,
        p_user_agent: navigator.userAgent
      });
      if (rpcError) throw rpcError;
      const proof = data as { proof_reference?: string } | null;
      setSignatureRequest(null);
      setSuccess(`Signature enregistrée${proof?.proof_reference ? ` sous la preuve ${proof.proof_reference}` : ''}.`);
      await Promise.all([loadDashboard(activeAccount.account_id), loadAccounts()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Signature impossible.');
    } finally {
      setSigning(false);
    }
  }

  if (authLoading) {
    return <main className="training-portal-public-shell"><div className="training-portal-loading"><span /><p>Ouverture de l’espace…</p></div></main>;
  }

  if (!user) {
    return (
      <main className="training-portal-public-shell">
        <section className="training-portal-auth-panel">
          <div className="training-portal-public-brand">
            <span><Icon name="graduation" size={25} /></span>
            <div><strong>Espace Formation</strong><small>Stagiaires, formateurs et clients</small></div>
          </div>
          <div className="training-portal-auth-heading">
            <p className="eyebrow">ACCÈS SÉCURISÉ</p>
            <h1>Retrouvez votre parcours.</h1>
            <p>Connectez-vous avec l’adresse utilisée pour votre invitation.</p>
          </div>
          <form className="training-portal-auth-form" onSubmit={authenticate}>
            <label>Adresse e-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button className="primary-button" disabled={authPending}>{authPending ? 'Connexion…' : 'Me connecter'}</button>
          </form>
          {error && <div className="training-portal-notice error"><Icon name="alert" size={19} /><span>{error}</span></div>}
        </section>
      </main>
    );
  }

  if (!loading && accounts.length === 0) {
    return (
      <main className="training-portal-public-shell">
        <section className="training-portal-auth-panel">
          <div className="training-portal-public-brand"><span><Icon name="graduation" size={25} /></span><div><strong>Espace Formation</strong><small>NCR Suite</small></div></div>
          <div className="training-portal-auth-heading">
            <p className="eyebrow">AUCUN ESPACE ACTIF</p>
            <h1>Votre compte est connecté.</h1>
            <p>Utilisez le lien reçu par e-mail pour accepter votre invitation, ou contactez votre organisme.</p>
          </div>
          {error && <div className="training-portal-notice error"><Icon name="alert" size={19} /><span>{error}</span></div>}
          <button className="secondary-button" onClick={() => void signOut()}>Se déconnecter</button>
        </section>
      </main>
    );
  }

  const accent = dashboard?.organization.primary_color || activeAccount?.organization_primary_color || '#147a52';
  const documents = dashboard?.documents || [];
  const pendingSignatures = (dashboard?.signatures || []).filter((request) => request.status === 'pending');
  const signedSignatures = (dashboard?.signatures || []).filter((request) => request.status === 'signed');

  return (
    <main className="training-portal-public-shell training-portal-app" style={{ '--portal-accent': accent } as CSSProperties}>
      <header className="training-portal-topbar">
        <div className="training-portal-public-brand">
          {dashboard?.organization.logo_url
            ? <img src={dashboard.organization.logo_url} alt="" />
            : <span><Icon name="graduation" size={24} /></span>}
          <div>
            <strong>{dashboard?.organization.name || activeAccount?.organization_name || 'Espace Formation'}</strong>
            <small>Espace {activeAccount ? trainingPortalSubjectLabels[activeAccount.subject_kind].toLowerCase() : ''}</small>
          </div>
        </div>
        <div className="training-portal-account-actions">
          {accounts.length > 1 && (
            <label>
              <span>Espace actif</span>
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                {accounts.map((account) => (
                  <option value={account.account_id} key={account.account_id}>
                    {account.organization_name} · {account.subject_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="icon-button" onClick={() => void signOut()} aria-label="Se déconnecter" title="Se déconnecter">
            <Icon name="logout" size={20} />
          </button>
        </div>
      </header>

      <div className="training-portal-workspace">
        <aside className="training-portal-sidebar">
          <div className="training-portal-identity">
            <span>{dashboard?.subject.name.slice(0, 2).toUpperCase() || 'NF'}</span>
            <div><strong>{dashboard?.subject.name || 'Votre espace'}</strong><small>{dashboard?.subject.detail || activeAccount?.email}</small></div>
          </div>
          <nav aria-label="Navigation de l’espace Formation">
            {([
              ['overview', 'Vue d’ensemble', 'home'],
              ['sessions', 'Mes sessions', 'calendar'],
              ['documents', 'Mes documents', 'file'],
              ['signatures', 'Signatures', 'signature']
            ] as const).map(([id, label, icon]) => (
              <button className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}>
                <Icon name={icon} size={18} /><span>{label}</span>
                {id === 'signatures' && pendingSignatures.length > 0 && <b>{pendingSignatures.length}</b>}
              </button>
            ))}
          </nav>
          <div className="training-portal-contact">
            <strong>Besoin d’aide ?</strong>
            {dashboard?.organization.email && <a href={`mailto:${dashboard.organization.email}`}>{dashboard.organization.email}</a>}
            {dashboard?.organization.phone && <a href={`tel:${dashboard.organization.phone}`}>{dashboard.organization.phone}</a>}
          </div>
        </aside>

        <section className="training-portal-content">
          {loading && !dashboard ? <div className="training-portal-loading"><span /><p>Chargement de votre espace…</p></div> : null}
          {error && <div className="training-portal-notice error"><Icon name="alert" size={19} /><span>{error}</span></div>}
          {success && <div className="training-portal-notice success"><Icon name="check" size={19} /><span>{success}</span></div>}

          {dashboard && tab === 'overview' && (
            <>
              <header className="training-portal-page-heading">
                <div><p className="eyebrow">BONJOUR {dashboard.subject.name.toUpperCase()}</p><h1>Votre espace Formation</h1><p>Les informations importantes de votre parcours sont réunies ici.</p></div>
              </header>
              <div className="training-portal-metrics">
                <article><span><Icon name="calendar" size={19} /></span><div><strong>{dashboard.summary.sessions}</strong><small>Sessions</small></div></article>
                <article><span><Icon name="file" size={19} /></span><div><strong>{dashboard.summary.documents}</strong><small>Documents</small></div></article>
                <article className={dashboard.summary.pending_signatures ? 'attention' : ''}><span><Icon name="signature" size={19} /></span><div><strong>{dashboard.summary.pending_signatures}</strong><small>À signer</small></div></article>
                <article><span><Icon name="check" size={19} /></span><div><strong>{dashboard.summary.signed_documents}</strong><small>Preuves signées</small></div></article>
              </div>

              {pendingSignatures.length > 0 && (
                <section className="training-portal-section">
                  <header><div><h2>Action requise</h2><p>Ces documents attendent votre signature.</p></div><button className="text-button" onClick={() => setTab('signatures')}>Tout voir</button></header>
                  <div className="training-portal-list">
                    {pendingSignatures.slice(0, 3).map((request) => (
                      <article key={request.id}>
                        <span className="training-portal-list-icon"><Icon name="signature" size={19} /></span>
                        <div><strong>{request.title}</strong><small>{trainingSignatureTypeLabels[request.request_type]} · échéance {humanDate(request.due_date)}</small></div>
                        <button className="primary-button compact-button" onClick={() => setSignatureRequest(request)}>Signer</button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {dashboard.account.subject_kind === 'trainee' && (
                <div className="training-portal-overview-grid">
                  <section className="training-portal-section">
                    <header><div><h2>Évaluations</h2><p>Questionnaires liés à vos sessions.</p></div></header>
                    {dashboard.evaluations.length === 0 ? <div className="training-portal-empty">Aucune évaluation disponible.</div> : (
                      <div className="training-portal-list compact">
                        {dashboard.evaluations.slice(0, 4).map((evaluation) => (
                          <article key={evaluation.id}>
                            <span className="training-portal-list-icon"><Icon name="clipboard" size={18} /></span>
                            <div><strong>{evaluation.session_title}</strong><small>{evaluation.status === 'completed' ? `Terminée le ${humanDate(evaluation.completed_at)}` : `Prévue le ${humanDate(evaluation.scheduled_for)}`}</small></div>
                            {evaluation.status !== 'completed' && <a className="secondary-button compact-button" href={`/evaluation/${evaluation.public_token}`}>Répondre</a>}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                  <section className="training-portal-section">
                    <header><div><h2>Émargements</h2><p>Présences et signatures enregistrées.</p></div></header>
                    {dashboard.attendance.length === 0 ? <div className="training-portal-empty">Aucun émargement enregistré.</div> : (
                      <div className="training-portal-list compact">
                        {dashboard.attendance.slice(0, 4).map((record) => (
                          <article key={record.id}>
                            <span className="training-portal-list-icon"><Icon name="check" size={18} /></span>
                            <div><strong>{record.session_title}</strong><small>{humanDate(record.attendance_date)} · {record.period}</small></div>
                            <span className={`training-portal-status ${record.status}`}>{record.status === 'present' ? 'Présent' : record.status}</span>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </>
          )}

          {dashboard && tab === 'sessions' && (
            <>
              <header className="training-portal-page-heading"><div><p className="eyebrow">PLANNING</p><h1>Mes sessions</h1><p>Dates, lieux et intervenants de votre parcours.</p></div></header>
              <div className="training-portal-session-grid">
                {dashboard.sessions.length === 0 ? <div className="training-portal-empty">Aucune session associée à cet espace.</div> : dashboard.sessions.map((session) => (
                  <article key={session.id}>
                    <div className="training-portal-session-date"><strong>{new Date(session.starts_at).getDate()}</strong><small>{new Date(session.starts_at).toLocaleDateString('fr-FR', { month: 'short' })}</small></div>
                    <div><span className={`training-portal-status ${session.status}`}>{sessionStatus(session.status)}</span><h2>{session.title}</h2><p>{session.program_title || 'Programme de formation'}</p><small>{humanDate(session.starts_at, true)} au {humanDate(session.ends_at, true)}</small><small>{session.location || session.modality || 'Lieu à confirmer'}{session.trainer_name ? ` · ${session.trainer_name}` : ''}</small></div>
                  </article>
                ))}
              </div>
            </>
          )}

          {dashboard && tab === 'documents' && (
            <>
              <header className="training-portal-page-heading"><div><p className="eyebrow">DOSSIER PARTAGÉ</p><h1>Mes documents</h1><p>Consultez les pièces reçues et déposez les justificatifs demandés.</p></div></header>
              <div className="training-portal-documents-layout">
                <section className="training-portal-section">
                  <header><div><h2>Documents disponibles</h2><p>{documents.length} pièce{documents.length > 1 ? 's' : ''} dans votre dossier.</p></div></header>
                  {documents.length === 0 ? <div className="training-portal-empty">Aucun document disponible.</div> : (
                    <div className="training-portal-list">
                      {documents.map((document: TrainingPortalDocument) => (
                        <article key={`${document.source_kind || 'portal'}-${document.id}`}>
                          <span className="training-portal-list-icon"><Icon name="file" size={19} /></span>
                          <div><strong>{document.title}</strong><small>{trainingPortalCategoryLabels[document.category] || document.category} · {document.direction === 'portal_to_organization' ? 'Déposé par vous' : 'Partagé par l’organisme'} · {humanDate(document.published_at)}</small></div>
                          <button className="icon-button" onClick={() => void openStoredFile(document.storage_bucket, document.storage_path)} aria-label="Ouvrir" title="Ouvrir"><Icon name="eye" size={18} /></button>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
                <form className="training-portal-deposit-panel" onSubmit={depositDocument}>
                  <div className="training-portal-deposit-icon"><Icon name="plus" size={21} /></div>
                  <div><h2>Déposer une pièce</h2><p>Elle sera automatiquement classée dans votre dossier et, si choisi, dans la bonne session.</p></div>
                  <label>Catégorie<select value={depositCategory} onChange={(event) => setDepositCategory(event.target.value)}><option value="administrative">Administratif</option><option value="identity">Identité</option><option value="prerequisite">Prérequis</option><option value="other">Autre</option></select></label>
                  <label>Session associée<select value={depositSessionId} onChange={(event) => setDepositSessionId(event.target.value)}><option value="">Dossier général</option>{dashboard.sessions.map((session) => <option value={session.id} key={session.id}>{session.title}</option>)}</select></label>
                  <label className="training-portal-file-field">
                    <span>{depositFile?.name || 'Choisir un fichier'}</span>
                    <input id="training-portal-deposit" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt" onChange={(event) => setDepositFile(event.target.files?.[0] || null)} required />
                  </label>
                  <small>PDF, image ou document bureautique · 20 Mo maximum</small>
                  <button className="primary-button" disabled={depositing || !depositFile}>{depositing ? 'Classement en cours…' : 'Déposer dans mon dossier'}</button>
                </form>
              </div>
            </>
          )}

          {dashboard && tab === 'signatures' && (
            <>
              <header className="training-portal-page-heading"><div><p className="eyebrow">TRAÇABILITÉ</p><h1>Signatures</h1><p>Consultez les documents à signer et leurs preuves horodatées.</p></div></header>
              <section className="training-portal-section">
                <header><div><h2>En attente</h2><p>{pendingSignatures.length} document{pendingSignatures.length > 1 ? 's' : ''} à traiter.</p></div></header>
                {pendingSignatures.length === 0 ? <div className="training-portal-empty success"><Icon name="check" size={24} />Aucune signature en attente.</div> : (
                  <div className="training-portal-signature-list">
                    {pendingSignatures.map((request) => (
                      <article key={request.id}>
                        <div><span className="training-portal-list-icon"><Icon name="signature" size={19} /></span><div><strong>{request.title}</strong><small>{trainingSignatureTypeLabels[request.request_type]} · demandée le {humanDate(request.created_at)} · échéance {humanDate(request.due_date)}</small></div></div>
                        <div><button className="secondary-button compact-button" onClick={() => void openStoredFile(request.source_bucket, request.source_path, request.id)}>Consulter</button><button className="primary-button compact-button" onClick={() => setSignatureRequest(request)}>Signer</button></div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <section className="training-portal-section">
                <header><div><h2>Historique des preuves</h2><p>Références et empreintes utilisables pour la conformité Qualiopi.</p></div></header>
                {signedSignatures.length === 0 ? <div className="training-portal-empty">Aucune preuve signée pour le moment.</div> : (
                  <div className="training-portal-proof-list">
                    {signedSignatures.map((request) => (
                      <article key={request.id}>
                        <div className="training-portal-proof-heading"><span><Icon name="check" size={18} /></span><div><strong>{request.title}</strong><small>{signatureStatus(request.status)} le {humanDate(request.signed_at, true)} par {request.signer_name}</small></div><b>{request.proof_reference}</b></div>
                        <dl><div><dt>Empreinte document</dt><dd title={request.document_sha256 || ''}>{request.document_sha256}</dd></div><div><dt>Empreinte preuve</dt><dd title={request.signature_payload_sha256 || ''}>{request.signature_payload_sha256}</dd></div></dl>
                        <div className="training-portal-proof-actions">
                          <button className="secondary-button compact-button" onClick={() => void openStoredFile(request.source_bucket, request.source_path)}>Ouvrir le document source</button>
                          {request.signature_image_path && <button className="secondary-button compact-button" onClick={() => void openStoredFile('training-portal-documents', request.signature_image_path!)}>Voir la signature</button>}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </div>

      {signatureRequest && (
        <TrainingPortalSignatureModal
          request={signatureRequest}
          defaultName={dashboard?.subject.name || activeAccount?.display_name || ''}
          saving={signing}
          onCancel={() => !signing && setSignatureRequest(null)}
          onSave={(blob, signerName) => void completeSignature(blob, signerName)}
        />
      )}
    </main>
  );
}
