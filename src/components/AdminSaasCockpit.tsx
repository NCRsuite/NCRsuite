import { useEffect, useMemo, useState } from 'react';
import { businessPacks } from '../config/businessPacks';
import { Icon } from './Icon';
import { supabase } from '../lib/supabase';
import type { BusinessType } from '../types';

interface DomainMetric {
  business_type: BusinessType;
  organizations: number;
  active: number;
  mrr_cents: number;
}

interface SaasOverview {
  organizations_total: number;
  organizations_active: number;
  organizations_trial: number;
  organizations_suspended: number;
  active_users: number;
  estimated_mrr_cents: number;
  trials_ending_soon: number;
  payments_past_due: number;
  open_support_tickets: number;
  urgent_support_tickets: number;
  onboarding_incomplete: number;
  inactive_14_days: number;
  domains: DomainMetric[];
}

interface ActivityRow {
  id: number;
  organization_name: string | null;
  business_type: BusinessType | null;
  user_email: string | null;
  action: string;
  created_at: string;
}

interface TicketRow {
  id: string;
  organization_name: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subject: string;
  status: string;
  created_at: string;
}

const emptyOverview: SaasOverview = {
  organizations_total: 0,
  organizations_active: 0,
  organizations_trial: 0,
  organizations_suspended: 0,
  active_users: 0,
  estimated_mrr_cents: 0,
  trials_ending_soon: 0,
  payments_past_due: 0,
  open_support_tickets: 0,
  urgent_support_tickets: 0,
  onboarding_incomplete: 0,
  inactive_14_days: 0,
  domains: []
};

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format((cents || 0) / 100);
}

function relativeDate(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'À l’instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    'organization.created': 'Espace créé',
    'organization.onboarding_completed': 'Configuration terminée',
    'platform.subscription_updated': 'Abonnement mis à jour',
    'support.ticket_created': 'Demande de support créée',
    'platform.support_ticket_updated': 'Ticket de support mis à jour'
  };
  return labels[action] ?? action.replaceAll('.', ' · ');
}

export function AdminSaasCockpit({ onOpenOrganizations, onOpenSupport, onOpenActivity }: { onOpenOrganizations: () => void; onOpenSupport: () => void; onOpenActivity: () => void }) {
  const [overview, setOverview] = useState<SaasOverview>(emptyOverview);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const [overviewResponse, activityResponse, ticketResponse] = await Promise.all([
        supabase.rpc('admin_saas_overview'),
        supabase.rpc('admin_recent_platform_activity', { p_limit: 12 }),
        supabase.rpc('admin_list_support_tickets', { p_status: null, p_priority: null, p_search: null })
      ]);
      if (overviewResponse.error) throw overviewResponse.error;
      if (activityResponse.error) throw activityResponse.error;
      if (ticketResponse.error) throw ticketResponse.error;
      setOverview((overviewResponse.data ?? emptyOverview) as SaasOverview);
      setActivity((Array.isArray(activityResponse.data) ? activityResponse.data : []) as ActivityRow[]);
      const ticketRows = (Array.isArray(ticketResponse.data) ? ticketResponse.data : []) as TicketRow[];
      setTickets(ticketRows.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).slice(0, 5));
    } catch (cause: any) {
      setError(cause?.message ?? 'Impossible de charger le cockpit SaaS.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const attentionCount = useMemo(() => overview.payments_past_due + overview.urgent_support_tickets + overview.onboarding_incomplete + overview.inactive_14_days, [overview]);

  return (
    <div className="admin-saas-cockpit">
      <section className="admin-cockpit-hero">
        <div>
          <span className="admin-live-pill"><i /> Plateforme opérationnelle</span>
          <p className="eyebrow">NCR SUITE · EXPLOITATION SAAS</p>
          <h1>Tout ce qui mérite ton attention, au même endroit.</h1>
          <p>Entreprises, revenus, onboarding, support et activité récente sont regroupés dans un cockpit unique.</p>
        </div>
        <div className="admin-cockpit-actions">
          <button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}><Icon name="activity" size={17} /> Actualiser</button>
          <button type="button" className="primary-button" onClick={onOpenOrganizations}><Icon name="building" size={17} /> Gérer les entreprises</button>
        </div>
      </section>

      {error && <div className="error-message" role="alert">{error}</div>}

      <section className="admin-cockpit-metrics">
        <article className="admin-kpi-card primary"><span><Icon name="building" size={21} /></span><div><small>Entreprises actives</small><strong>{overview.organizations_active}</strong><em>{overview.organizations_total} au total · {overview.organizations_trial} en essai</em></div></article>
        <article className="admin-kpi-card"><span><Icon name="creditCard" size={21} /></span><div><small>MRR estimé</small><strong>{money(overview.estimated_mrr_cents)}</strong><em>{overview.payments_past_due} paiement(s) en retard</em></div></article>
        <article className="admin-kpi-card"><span><Icon name="users" size={21} /></span><div><small>Utilisateurs actifs</small><strong>{overview.active_users}</strong><em>tous métiers confondus</em></div></article>
        <article className={`admin-kpi-card ${attentionCount > 0 ? 'warning' : ''}`}><span><Icon name="alert" size={21} /></span><div><small>Points d’attention</small><strong>{attentionCount}</strong><em>{overview.urgent_support_tickets} urgence(s) support</em></div></article>
      </section>

      <section className="admin-cockpit-grid">
        <article className="panel admin-attention-panel">
          <div className="panel-header"><div><p className="eyebrow">À TRAITER</p><h2>Centre d’attention</h2></div><span className="admin-count-badge">{attentionCount}</span></div>
          <div className="admin-attention-list">
            <button type="button" onClick={onOpenSupport} className={overview.urgent_support_tickets ? 'critical' : ''}><span><Icon name="alert" size={18} /></span><div><strong>Tickets urgents</strong><small>Demandes nécessitant une réponse rapide</small></div><b>{overview.urgent_support_tickets}</b><Icon name="chevronRight" size={17} /></button>
            <button type="button" onClick={onOpenOrganizations} className={overview.payments_past_due ? 'warning' : ''}><span><Icon name="creditCard" size={18} /></span><div><strong>Paiements en retard</strong><small>Abonnements à régulariser</small></div><b>{overview.payments_past_due}</b><Icon name="chevronRight" size={17} /></button>
            <button type="button" onClick={onOpenOrganizations}><span><Icon name="clipboard" size={18} /></span><div><strong>Onboarding incomplet</strong><small>Espaces encore non configurés</small></div><b>{overview.onboarding_incomplete}</b><Icon name="chevronRight" size={17} /></button>
            <button type="button" onClick={onOpenOrganizations}><span><Icon name="clock" size={18} /></span><div><strong>Inactives depuis 14 jours</strong><small>Entreprises à relancer ou diagnostiquer</small></div><b>{overview.inactive_14_days}</b><Icon name="chevronRight" size={17} /></button>
          </div>
        </article>

        <article className="panel admin-domains-panel">
          <div className="panel-header"><div><p className="eyebrow">PORTEFEUILLE</p><h2>Activité par métier</h2></div></div>
          <div className="admin-domain-metrics">
            {overview.domains.map((domain) => {
              const pack = businessPacks[domain.business_type];
              return <div key={domain.business_type}><span><Icon name={pack.icon} size={18} /></span><div><strong>{pack.label}</strong><small>{domain.active}/{domain.organizations} actives</small></div><b>{money(domain.mrr_cents)}</b></div>;
            })}
            {!loading && overview.domains.length === 0 && <div className="admin-empty-state">Aucune entreprise enregistrée.</div>}
          </div>
        </article>
      </section>

      <section className="admin-cockpit-grid lower">
        <article className="panel admin-support-preview">
          <div className="panel-header"><div><p className="eyebrow">SUPPORT</p><h2>File active</h2></div><button type="button" className="text-button" onClick={onOpenSupport}>Tout voir <Icon name="chevronRight" size={15} /></button></div>
          <div className="admin-ticket-preview-list">
            {tickets.map((ticket) => <button key={ticket.id} type="button" onClick={onOpenSupport}><span className={`admin-priority-dot ${ticket.priority}`} /><div><strong>{ticket.subject}</strong><small>{ticket.organization_name} · {relativeDate(ticket.created_at)}</small></div><span className={`admin-priority-pill ${ticket.priority}`}>{ticket.priority}</span></button>)}
            {!loading && tickets.length === 0 && <div className="admin-positive-empty"><Icon name="check" size={22} /><div><strong>Aucun ticket actif</strong><small>La file de support est à jour.</small></div></div>}
          </div>
        </article>

        <article className="panel admin-activity-preview">
          <div className="panel-header"><div><p className="eyebrow">ACTIVITÉ</p><h2>Derniers événements</h2></div><button type="button" className="text-button" onClick={onOpenActivity}>Journal complet <Icon name="chevronRight" size={15} /></button></div>
          <div className="admin-activity-mini-list">
            {activity.slice(0, 7).map((row) => <div key={row.id}><span><Icon name={row.action.includes('support') ? 'alert' : row.action.includes('subscription') ? 'creditCard' : 'activity'} size={16} /></span><div><strong>{activityLabel(row.action)}</strong><small>{row.organization_name || 'Plateforme NCR'} · {row.user_email || 'Système'}</small></div><time>{relativeDate(row.created_at)}</time></div>)}
          </div>
        </article>
      </section>
    </div>
  );
}
