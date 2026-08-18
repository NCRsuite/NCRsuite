import { useEffect, useMemo, useState } from 'react';
import { businessPacks } from '../config/businessPacks';
import { supabase } from '../lib/supabase';
import type { BusinessType, Plan } from '../types';
import { Icon } from './Icon';

type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

interface AccessRequest {
  id: string;
  reference: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string;
  business_type: BusinessType;
  requested_plan: Plan;
  trial_requested: boolean;
  team_size: string | null;
  message: string | null;
  status: AccessRequestStatus;
  submitted_at: string;
  reviewed_at: string | null;
  decision_note: string | null;
  invited_user_id: string | null;
  invitation_sent_at: string | null;
  invitation_count: number;
  last_invitation_error: string | null;
  acquisition_source: string | null;
  acquisition_medium: string | null;
  acquisition_campaign: string | null;
  acquisition_content: string | null;
  landing_path: string | null;
  referrer_url: string | null;
}

const statusLabels: Record<AccessRequestStatus, string> = {
  pending: 'À étudier',
  approved: 'Acceptée',
  rejected: 'Refusée'
};

const planLabels: Record<Plan, string> = {
  decouverte: 'Découverte',
  essentielle: 'Essentielle',
  professionnelle: 'Professionnelle',
  metier: 'Métier'
};

function dateLabel(value: string | null) {
  if (!value) return 'Non envoyée';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function AdminAccessRequestsPanel({ canReview }: { canReview: boolean }) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [selected, setSelected] = useState<AccessRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | AccessRequestStatus>('pending');
  const [search, setSearch] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<'approve' | 'reject' | 'resend' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load(preserveSelection = true, silent = false) {
    if (!supabase) return;
    if (!silent) setLoading(true);
    setError('');

    let query = supabase
      .from('platform_access_requests')
      .select('id,reference,full_name,email,phone,company_name,business_type,requested_plan,trial_requested,team_size,message,status,submitted_at,reviewed_at,decision_note,invited_user_id,invitation_sent_at,invitation_count,last_invitation_error,acquisition_source,acquisition_medium,acquisition_campaign,acquisition_content,landing_path,referrer_url')
      .order('submitted_at', { ascending: false })
      .limit(250);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data, error: requestError } = await query;

    if (requestError) {
      setError(requestError.message);
      setRequests([]);
    } else {
      const rows = (data ?? []) as AccessRequest[];
      setRequests(rows);
      if (preserveSelection && selected) {
        const next = rows.find((request) => request.id === selected.id) ?? null;
        setSelected(next);
        if (next) setDecisionNote(next.decision_note ?? '');
      }
    }
    if (!silent) setLoading(false);
  }

  useEffect(() => {
    void load(false);
  }, [statusFilter]);

  useEffect(() => {
    const refreshVisibleRequests = () => {
      if (document.visibilityState !== 'visible') return;
      void load(true, true);
    };

    const interval = window.setInterval(refreshVisibleRequests, 10_000);
    window.addEventListener('focus', refreshVisibleRequests);
    document.addEventListener('visibilitychange', refreshVisibleRequests);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshVisibleRequests);
      document.removeEventListener('visibilitychange', refreshVisibleRequests);
    };
  }, [statusFilter, selected?.id]);

  const visibleRequests = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr-FR');
    if (!needle) return requests;
    return requests.filter((request) => (
      request.company_name.toLocaleLowerCase('fr-FR').includes(needle)
      || request.full_name.toLocaleLowerCase('fr-FR').includes(needle)
      || request.email.toLocaleLowerCase('fr-FR').includes(needle)
      || request.reference.toLocaleLowerCase('fr-FR').includes(needle)
    ));
  }, [requests, search]);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'pending').length,
    [requests]
  );

  function selectRequest(request: AccessRequest) {
    setSelected(request);
    setDecisionNote(request.decision_note ?? '');
    setError('');
    setMessage('');
  }

  async function review(action: 'approve' | 'reject' | 'resend') {
    if (!supabase || !selected || !canReview || processing) return;
    if (action === 'reject' && decisionNote.trim().length < 3) {
      setError('Ajoutez une courte note interne avant de refuser la demande.');
      return;
    }

    setProcessing(action);
    setError('');
    setMessage('');
    const { data, error: requestError } = await supabase.functions.invoke('admin-review-access-request', {
      body: {
        requestId: selected.id,
        action,
        decisionNote: decisionNote.trim() || null
      }
    });

    if (requestError || data?.error) {
      setError(String(data?.error || requestError?.message || 'Le traitement de la demande a échoué.'));
    } else {
      setMessage(String(data?.message || 'La demande a été traitée.'));
      await load(true);
    }
    setProcessing(null);
  }

  return (
    <div className="admin-access-page">
      <section className="admin-section-heading">
        <div>
          <p className="eyebrow">OUVERTURE DES COMPTES</p>
          <h1>Demandes d’accès</h1>
          <p>Vérifie chaque entreprise avant d’autoriser l’activation de son compte NCR Suite.</p>
        </div>
        <div className="admin-heading-stats">
          <span className={pendingCount ? 'warning' : ''}><small>À étudier</small><strong>{pendingCount}</strong></span>
        </div>
      </section>

      {error && <div className="error-message" role="alert">{error}</div>}
      {message && <div className="success-message" role="status">{message}</div>}
      {!canReview && <div className="info-message">Ce rôle peut consulter les demandes. Seul le super-administrateur peut décider et envoyer une invitation.</div>}

      <section className="admin-access-layout">
        <article className="panel admin-access-list-panel">
          <div className="admin-access-filters">
            <label><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Entreprise, personne, e-mail ou référence" /></label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | AccessRequestStatus)} aria-label="Filtrer les demandes">
              <option value="pending">À étudier</option>
              <option value="approved">Acceptées</option>
              <option value="rejected">Refusées</option>
              <option value="all">Toutes les demandes</option>
            </select>
            <button type="button" className="icon-button" onClick={() => void load(true)} disabled={loading} aria-label="Actualiser les demandes" title="Actualiser">
              <Icon name="refresh" size={17} />
            </button>
          </div>

          <div className="admin-access-list">
            {loading && <div className="admin-empty-state">Chargement des demandes…</div>}
            {!loading && visibleRequests.length === 0 && (
              <div className="admin-positive-empty"><Icon name="check" size={24} /><div><strong>Aucune demande à afficher</strong><small>La file correspondant à ce filtre est vide.</small></div></div>
            )}
            {visibleRequests.map((request) => (
              <button key={request.id} type="button" className={selected?.id === request.id ? 'selected' : ''} onClick={() => selectRequest(request)}>
                <span className="admin-access-business-icon"><Icon name={businessPacks[request.business_type].icon} size={18} /></span>
                <span className="admin-access-copy">
                  <small>{request.reference} · {businessPacks[request.business_type].label}{request.trial_requested ? ' · ESSAI' : ''}</small>
                  <strong>{request.company_name}</strong>
                  <em>{request.full_name} · {request.email}</em>
                </span>
                <span className="admin-access-meta">
                  <span className={`admin-access-status ${request.status}`}>{statusLabels[request.status]}</span>
                  <time>{dateLabel(request.submitted_at)}</time>
                </span>
                <Icon name="chevronRight" size={17} />
              </button>
            ))}
          </div>
        </article>

        <aside className="panel admin-access-editor">
          {!selected ? (
            <div className="admin-editor-empty">
              <span><Icon name="users" size={28} /></span>
              <h2>Sélectionne une demande</h2>
              <p>Les coordonnées, le besoin et les actions de validation apparaîtront ici.</p>
            </div>
          ) : (
            <>
              <header className="admin-access-editor-head">
                <span className="admin-access-business-icon large"><Icon name={businessPacks[selected.business_type].icon} size={24} /></span>
                <div>
                  <p className="eyebrow">{selected.reference}</p>
                  <h2>{selected.company_name}</h2>
                  <small>{businessPacks[selected.business_type].label} · formule {planLabels[selected.requested_plan]} · équipe {selected.team_size || 'non précisée'}{selected.trial_requested ? ' · essai demandé' : ''}</small>
                </div>
                <span className={`admin-access-status ${selected.status}`}>{statusLabels[selected.status]}</span>
              </header>

              <dl className="admin-access-details">
                <div><dt>Demandeur</dt><dd>{selected.full_name}</dd></div>
                <div><dt>E-mail</dt><dd><a href={`mailto:${selected.email}`}>{selected.email}</a></dd></div>
                <div><dt>Téléphone</dt><dd>{selected.phone || 'Non renseigné'}</dd></div>
                <div><dt>Formule</dt><dd>{planLabels[selected.requested_plan]}</dd></div>
                <div><dt>Accès demandé</dt><dd>{selected.trial_requested ? 'Essai gratuit demandé' : 'Souscription directe'}</dd></div>
                <div><dt>Reçue le</dt><dd>{dateLabel(selected.submitted_at)}</dd></div>
                <div><dt>Origine</dt><dd>{selected.acquisition_source || 'direct'} · {selected.acquisition_medium || 'none'}</dd></div>
                <div><dt>Page d’entrée</dt><dd>{selected.landing_path || 'Non identifiée'}</dd></div>
              </dl>

              {(selected.acquisition_campaign || selected.referrer_url) && (
                <section className="admin-access-acquisition">
                  <strong>Acquisition</strong>
                  {selected.acquisition_campaign && <p>Campagne : {selected.acquisition_campaign}{selected.acquisition_content ? ` · ${selected.acquisition_content}` : ''}</p>}
                  {selected.referrer_url && <p>Référent : {selected.referrer_url}</p>}
                </section>
              )}

              <section className="admin-access-need">
                <strong>Besoin exprimé</strong>
                <p>{selected.message || 'Aucune précision supplémentaire.'}</p>
              </section>

              <label className="admin-access-note">
                Note interne de décision
                <textarea rows={4} maxLength={2000} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} disabled={!canReview} placeholder="Vérification effectuée, échange commercial, motif du refus…" />
              </label>

              {selected.status === 'approved' && (
                <div className="admin-access-invitation">
                  <Icon name="check" size={18} />
                  <span><strong>Invitation envoyée {dateLabel(selected.invitation_sent_at)}</strong><small>{selected.invitation_count} envoi(s). Le compte sera configuré après activation.</small></span>
                </div>
              )}
              {selected.last_invitation_error && <div className="warning-message">{selected.last_invitation_error}</div>}

              {canReview && (
                <div className="admin-access-actions">
                  {selected.status === 'pending' && (
                    <>
                      <button type="button" className="primary-button" onClick={() => void review('approve')} disabled={Boolean(processing)}>
                        <Icon name="check" size={17} /> {processing === 'approve' ? 'Envoi de l’invitation…' : 'Accepter et inviter'}
                      </button>
                      <button type="button" className="secondary-button danger-button" onClick={() => void review('reject')} disabled={Boolean(processing)}>
                        {processing === 'reject' ? 'Refus en cours…' : 'Refuser'}
                      </button>
                    </>
                  )}
                  {selected.status === 'approved' && (
                    <button type="button" className="secondary-button" onClick={() => void review('resend')} disabled={Boolean(processing)}>
                      <Icon name="refresh" size={17} /> {processing === 'resend' ? 'Nouvel envoi…' : 'Renvoyer l’invitation'}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </aside>
      </section>
    </div>
  );
}
