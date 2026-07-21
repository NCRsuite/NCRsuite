import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { supabase } from '../lib/supabase';

type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
type Viewer = 'admin' | 'customer';

type SupportMessage = {
  id: string;
  sender_kind: 'customer' | 'ncr_admin' | 'system';
  sender_id: string | null;
  sender_name: string;
  sender_email: string | null;
  body: string;
  is_initial: boolean;
  created_at: string;
};

type SupportAccessRequest = {
  id: string;
  reason: string;
  duration_minutes: number;
  status: 'pending' | 'approved' | 'denied' | 'active' | 'ended' | 'revoked' | 'expired' | 'cancelled';
  requested_by: string;
  requested_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  requested_at: string;
  approved_at: string | null;
  started_at: string | null;
  expires_at: string | null;
  ended_at: string | null;
  can_start: boolean;
  can_enter: boolean;
  can_respond: boolean;
  can_revoke: boolean;
};

type ThreadPayload = {
  messages: SupportMessage[];
  access_requests: SupportAccessRequest[];
};

const accessLabels: Record<SupportAccessRequest['status'], string> = {
  pending: 'Autorisation attendue',
  approved: 'Autorisation accordée',
  denied: 'Accès refusé',
  active: 'Assistance en cours',
  ended: 'Session terminée',
  revoked: 'Accès révoqué',
  expired: 'Session expirée',
  cancelled: 'Demande annulée'
};

function fullDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function timeLeft(value: string | null) {
  if (!value) return '';
  const minutes = Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 60000));
  return minutes > 1 ? `${minutes} min restantes` : minutes === 1 ? '1 min restante' : 'Expiration imminente';
}

export function SupportConversation({ ticketId, ticketStatus, viewer, canApproveAccess = false }: {
  ticketId: string;
  ticketStatus: TicketStatus;
  viewer: Viewer;
  canApproveAccess?: boolean;
}) {
  const [thread, setThread] = useState<ThreadPayload>({ messages: [], access_requests: [] });
  const [body, setBody] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(30);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const ticketOpen = !['resolved', 'closed'].includes(ticketStatus);
  const currentAccess = useMemo(
    () => thread.access_requests.find((request) => ['pending', 'approved', 'active'].includes(request.status)) ?? thread.access_requests[0] ?? null,
    [thread.access_requests]
  );

  async function load(silent = false) {
    if (!supabase) return;
    if (!silent) setLoading(true);
    const { data, error: requestError } = await supabase.rpc('get_support_ticket_thread', { p_ticket_id: ticketId });
    if (requestError) setError(requestError.message);
    else setThread((data ?? { messages: [], access_requests: [] }) as ThreadPayload);
    if (!silent) setLoading(false);
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [ticketId]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !body.trim() || !ticketOpen) return;
    setSaving(true); setError(''); setMessage('');
    const { error: requestError } = await supabase.rpc('send_support_ticket_message', { p_ticket_id: ticketId, p_body: body.trim() });
    if (requestError) setError(requestError.message);
    else { setBody(''); await load(true); }
    setSaving(false);
  }

  async function requestAccess(event: FormEvent) {
    event.preventDefault();
    if (!supabase || reason.trim().length < 5) {
      setError('Indique précisément pourquoi la prise en main est nécessaire.');
      return;
    }
    setSaving(true); setError(''); setMessage('');
    const { error: requestError } = await supabase.rpc('request_support_access', {
      p_ticket_id: ticketId,
      p_reason: reason.trim(),
      p_duration_minutes: duration
    });
    if (requestError) setError(requestError.message);
    else {
      setReason(''); setShowAccessForm(false);
      setMessage('La demande d’autorisation a été envoyée à l’entreprise.');
      await load(true);
    }
    setSaving(false);
  }

  async function respondAccess(requestId: string, approved: boolean) {
    if (!supabase) return;
    setSaving(true); setError(''); setMessage('');
    const { error: requestError } = await supabase.rpc('respond_support_access', { p_request_id: requestId, p_approved: approved });
    if (requestError) setError(requestError.message);
    else {
      setMessage(approved ? 'Tu as autorisé temporairement l’équipe NCR à intervenir.' : 'La demande d’accès a été refusée.');
      await load(true);
    }
    setSaving(false);
  }

  async function startAccess(requestId: string) {
    if (!supabase) return;
    setSaving(true); setError(''); setMessage('');
    const { error: requestError } = await supabase.rpc('start_support_access', { p_request_id: requestId });
    if (requestError) { setError(requestError.message); setSaving(false); return; }
    window.location.assign('/');
  }

  async function enterAccess() {
    window.location.assign('/');
  }

  async function revokeAccess(requestId: string) {
    if (!supabase) return;
    setSaving(true); setError(''); setMessage('');
    const { error: requestError } = await supabase.rpc('revoke_support_access', { p_request_id: requestId });
    if (requestError) setError(requestError.message);
    else { setMessage('L’autorisation d’assistance a été terminée.'); await load(true); }
    setSaving(false);
  }

  return <section className="support-conversation">
    <header className="support-conversation-head">
      <div>
        <span className="support-conversation-icon"><Icon name="message" size={19} /></span>
        <span><strong>Conversation du ticket</strong><small>Échanges visibles par l’entreprise et l’équipe NCR</small></span>
      </div>
      <button type="button" className="secondary-button compact" onClick={() => void load()} disabled={loading}>
        <Icon name="activity" size={14} /> Actualiser
      </button>
    </header>

    {error && <div className="error-message" role="alert">{error}</div>}
    {message && <div className="success-message" role="status">{message}</div>}

    <div className="support-message-thread" aria-live="polite">
      {loading && <div className="admin-empty-state">Chargement de la conversation…</div>}
      {!loading && thread.messages.length === 0 && <div className="admin-empty-state">Aucun message pour le moment.</div>}
      {thread.messages.map((item) => {
        const ownSide = viewer === 'admin' ? item.sender_kind === 'ncr_admin' : item.sender_kind === 'customer';
        return <article key={item.id} className={`support-message ${item.sender_kind} ${ownSide ? 'own' : ''}`}>
          {item.sender_kind === 'system' ? <span className="support-system-icon"><Icon name="lock" size={14} /></span> : <span className="support-message-avatar">{item.sender_name.slice(0, 1).toUpperCase()}</span>}
          <div>
            <header><strong>{item.sender_name}</strong><time>{fullDate(item.created_at)}</time></header>
            <p>{item.body}</p>
          </div>
        </article>;
      })}
    </div>

    {currentAccess && <article className={`support-access-card ${currentAccess.status}`}>
      <div className="support-access-card-icon"><Icon name="monitor" size={23} /></div>
      <div className="support-access-card-copy">
        <header><span><strong>Prise en main sécurisée</strong><small>{accessLabels[currentAccess.status]}</small></span><b>{currentAccess.duration_minutes} min</b></header>
        <p>{currentAccess.reason}</p>
        <dl>
          <div><dt>Demandée par</dt><dd>{currentAccess.requested_by_name}</dd></div>
          <div><dt>Demandée le</dt><dd>{fullDate(currentAccess.requested_at)}</dd></div>
          {currentAccess.expires_at && <div><dt>Expiration</dt><dd>{fullDate(currentAccess.expires_at)} · {timeLeft(currentAccess.expires_at)}</dd></div>}
        </dl>
        <div className="support-access-actions">
          {viewer === 'customer' && canApproveAccess && currentAccess.can_respond && <>
            <button type="button" className="primary-button compact" disabled={saving} onClick={() => void respondAccess(currentAccess.id, true)}><Icon name="check" size={15} /> Autoriser</button>
            <button type="button" className="secondary-button compact" disabled={saving} onClick={() => void respondAccess(currentAccess.id, false)}><Icon name="close" size={15} /> Refuser</button>
          </>}
          {viewer === 'admin' && currentAccess.can_start && <button type="button" className="primary-button compact" disabled={saving} onClick={() => void startAccess(currentAccess.id)}><Icon name="monitor" size={15} /> Démarrer la prise en main</button>}
          {viewer === 'admin' && currentAccess.can_enter && <button type="button" className="primary-button compact" onClick={() => void enterAccess()}><Icon name="eye" size={15} /> Entrer dans l’entreprise</button>}
          {currentAccess.can_revoke && <button type="button" className="secondary-button compact danger-outline" disabled={saving} onClick={() => void revokeAccess(currentAccess.id)}><Icon name="close" size={15} /> {currentAccess.status === 'active' ? 'Terminer l’accès' : 'Annuler l’autorisation'}</button>}
        </div>
        {viewer === 'customer' && currentAccess.status === 'active' && <div className="support-access-warning"><Icon name="eye" size={15} /><span>L’équipe NCR peut actuellement intervenir dans cet espace. Tu peux révoquer l’accès immédiatement.</span></div>}
      </div>
    </article>}

    {viewer === 'admin' && ticketOpen && !thread.access_requests.some((request) => ['pending','approved','active'].includes(request.status)) && (
      showAccessForm ? <form className="support-access-request-form" onSubmit={requestAccess}>
        <div><strong>Demander l’autorisation de prendre la main</strong><small>La durée ne commencera qu’après l’accord du client et le démarrage de la session.</small></div>
        <label>Motif<textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex. Reproduire le blocage sur le planning et corriger la configuration concernée." maxLength={1000} /></label>
        <label>Durée<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option></select></label>
        <div className="support-access-request-actions"><button type="button" className="secondary-button compact" onClick={() => setShowAccessForm(false)}>Annuler</button><button className="primary-button compact" disabled={saving}>Envoyer la demande</button></div>
      </form> : <button type="button" className="support-request-access-button" onClick={() => setShowAccessForm(true)}><span><Icon name="headset" size={19} /></span><span><strong>Prendre la main sur l’entreprise</strong><small>Demander une autorisation temporaire, visible et entièrement tracée.</small></span><Icon name="chevronRight" size={17} /></button>
    )}

    <form className="support-message-composer" onSubmit={send}>
      <label htmlFor={`support-message-${ticketId}`}>Écrire un message</label>
      <div><textarea id={`support-message-${ticketId}`} value={body} onChange={(event) => setBody(event.target.value)} placeholder={ticketOpen ? 'Écris ta réponse…' : 'La conversation est fermée.'} rows={3} maxLength={5000} disabled={!ticketOpen || saving} /><button className="primary-button" disabled={!ticketOpen || saving || !body.trim()}><Icon name="message" size={16} /> Envoyer</button></div>
      {!ticketOpen && <small>Ce ticket est résolu ou fermé. Crée une nouvelle demande pour reprendre la conversation.</small>}
    </form>
  </section>;
}
