import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { supabase } from '../lib/supabase';

interface PushStatus {
  configured: boolean;
  cron_configured: boolean;
  configured_at: string | null;
  last_worker_run_at: string | null;
  last_worker_error: string | null;
  active_subscriptions: number;
  pending_deliveries: number;
}

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Jamais';
}

export function PushAdminPanel({ canManage }: { canManage: boolean }) {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    if (!supabase) return;
    setLoading(true);
    const { data, error: requestError } = await supabase.rpc('platform_push_status');
    if (requestError) setError(requestError.message);
    else setStatus(data as PushStatus);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function initialize() {
    if (!supabase) return;
    setSaving(true);
    setError('');
    setMessage('');
    const { data, error: requestError } = await supabase.functions.invoke('setup-push-notifications', { body: {} });
    if (requestError) setError(requestError.message);
    else if (data?.error) setError(data.error);
    else {
      setMessage('Les clés Web Push et le traitement automatique chaque minute sont configurés.');
      await load();
    }
    setSaving(false);
  }

  return (
    <section className="panel push-admin-panel">
      <div className="panel-header">
        <div><p className="eyebrow">NOTIFICATIONS PUSH</p><h2>Infrastructure PWA</h2><p>Clés VAPID, abonnements appareils et file d’envoi centrale.</p></div>
        <span className={`admin-status-pill ${status?.configured && status?.cron_configured ? 'positive' : 'warning'}`}>{status?.configured ? 'Configurée' : 'À initialiser'}</span>
      </div>
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
      {loading ? <div className="admin-empty-state">Chargement de l’infrastructure…</div> : (
        <>
          <div className="platform-admin-metrics compact-metrics">
            <article><span className="admin-metric-icon"><Icon name="bell" size={22} /></span><div><small>Appareils actifs</small><strong>{status?.active_subscriptions ?? 0}</strong><em>abonnements push</em></div></article>
            <article><span className="admin-metric-icon"><Icon name="clock" size={22} /></span><div><small>En attente</small><strong>{status?.pending_deliveries ?? 0}</strong><em>notifications à traiter</em></div></article>
            <article><span className="admin-metric-icon"><Icon name="activity" size={22} /></span><div><small>Dernier passage</small><strong className="small-metric-value">{dateLabel(status?.last_worker_run_at ?? null)}</strong><em>traitement chaque minute</em></div></article>
          </div>
          {status?.last_worker_error && <div className="error-message">Dernier traitement : {status.last_worker_error}</div>}
          <div className="info-message">L’initialisation génère les clés Web Push côté serveur et programme automatiquement la fonction d’envoi toutes les minutes. Aucune clé Apple ou Google n’est nécessaire.</div>
          {canManage && <button className="primary-button" type="button" disabled={saving} onClick={initialize}>{saving ? 'Initialisation…' : status?.configured ? 'Réparer la planification' : 'Initialiser les notifications push'}</button>}
        </>
      )}
    </section>
  );
}
