import { useEffect, useMemo, useState } from 'react';
import { businessPacks } from '../config/businessPacks';
import { Icon } from './Icon';
import { supabase } from '../lib/supabase';
import type { BusinessType } from '../types';

interface ActivityRow {
  id: number;
  organization_id: string | null;
  organization_name: string | null;
  business_type: BusinessType | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

function fullDate(value: string) { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function actionLabel(action: string) {
  const map: Record<string, string> = {
    'organization.created': 'Nouvel espace créé',
    'organization.onboarding_completed': 'Onboarding terminé',
    'platform.subscription_updated': 'Abonnement modifié',
    'support.ticket_created': 'Ticket support créé',
    'platform.support_ticket_updated': 'Ticket support traité',
    'restaurant.order_item_served': 'Article servi',
    'security.shift.closed': 'Vacation clôturée'
  };
  return map[action] ?? action.split('.').join(' · ');
}

export function AdminActivityPanel() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState<'all' | BusinessType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!supabase) return;
    setLoading(true); setError('');
    const { data, error: requestError } = await supabase.rpc('admin_recent_platform_activity', { p_limit: 160 });
    if (requestError) setError(requestError.message);
    else setRows((Array.isArray(data) ? data : []) as ActivityRow[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => (domain === 'all' || row.business_type === domain) && (!needle || `${row.organization_name ?? ''} ${row.user_email ?? ''} ${row.action}`.toLowerCase().includes(needle)));
  }, [rows, search, domain]);

  return <div className="admin-activity-page">
    <section className="admin-section-heading"><div><p className="eyebrow">TRAÇABILITÉ</p><h1>Journal d’activité</h1><p>Une lecture chronologique des événements importants de la plateforme et des entreprises.</p></div><button type="button" className="secondary-button" onClick={() => void load()}><Icon name="activity" size={17} /> Actualiser</button></section>
    {error && <div className="error-message" role="alert">{error}</div>}
    <section className="panel admin-activity-panel">
      <div className="admin-support-filters"><label><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Entreprise, utilisateur ou action…" /></label><select value={domain} onChange={(event) => setDomain(event.target.value as 'all' | BusinessType)}><option value="all">Tous les métiers</option>{Object.values(businessPacks).map((pack) => <option key={pack.id} value={pack.id}>{pack.label}</option>)}</select><span className="admin-result-count">{visible.length} événement(s)</span></div>
      <div className="admin-activity-timeline">
        {loading && <div className="admin-empty-state">Chargement du journal…</div>}
        {!loading && visible.length === 0 && <div className="admin-empty-state">Aucun événement ne correspond aux filtres.</div>}
        {visible.map((row) => {
          const pack = row.business_type ? businessPacks[row.business_type] : null;
          return <article key={row.id}><span className="admin-activity-line-icon"><Icon name={row.action.includes('support') ? 'alert' : row.action.includes('subscription') ? 'creditCard' : pack?.icon ?? 'activity'} size={17} /></span><div className="admin-activity-copy"><div><strong>{actionLabel(row.action)}</strong><span>{row.entity_type || 'événement'}</span></div><p>{row.organization_name || 'Plateforme NCR'} <small>par {row.user_email || 'le système'}</small></p></div><time>{fullDate(row.created_at)}</time></article>;
        })}
      </div>
    </section>
  </div>;
}
