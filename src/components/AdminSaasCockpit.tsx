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
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  created_at: string;
  updated_at?: string;
}

type AttentionItem = {
  key: string;
  icon: 'headset' | 'creditCard' | 'clock' | 'clipboard' | 'activity';
  title: string;
  detail: string;
  count: number;
  tone?: 'warning' | 'critical';
  action: () => void;
};

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

const priorityRank: Record<TicketRow['priority'], number> = { urgent: 4, high: 3, normal: 2, low: 1 };
const ticketStatusLabels: Record<TicketRow['status'], string> = {
  open: 'Nouveau',
  in_progress: 'En cours',
  waiting_customer: 'Attente client',
  resolved: 'Résolu',
  closed: 'Fermé'
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
    'organization.created_trial': 'Espace créé en essai',
    'organization.created_payment_required': 'Espace créé — paiement requis',
    'organization.onboarding_completed': 'Configuration terminée',
    'organization.onboarding_completed_trial': 'Démarrage terminé pendant l’essai',
    'organization.onboarding_completed_payment_pending': 'Démarrage terminé — paiement en attente',
    'platform.subscription_updated': 'Abonnement mis à jour',
    'support.ticket_created': 'Demande d’assistance créée',
    'platform.support_ticket_updated': 'Ticket d’assistance mis à jour',
    'platform.support_access_requested': 'Prise en main demandée',
    'platform.support_session_started': 'Prise en main démarrée',
    'platform.support_session_ended': 'Prise en main terminée'
  };
  return labels[action] ?? action.split('.').join(' · ');
}

export function AdminSaasCockpit({ onOpenOrganizations, onOpenBilling, onOpenSupport, onOpenActivity }: {
  onOpenOrganizations: () => void;
  onOpenBilling: () => void;
  onOpenSupport: (ticketId?: string) => void;
  onOpenActivity: () => void;
}) {
  const [overview, setOverview] = useState<SaasOverview>(emptyOverview);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

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
      setTickets(
        ticketRows
          .filter((ticket) => !['resolved', 'closed'].includes(ticket.status))
          .sort((left, right) => {
            const priorityDelta = priorityRank[right.priority] - priorityRank[left.priority];
            if (priorityDelta !== 0) return priorityDelta;
            return new Date(right.updated_at ?? right.created_at).getTime() - new Date(left.updated_at ?? left.created_at).getTime();
          })
          .slice(0, 5)
      );
      setLastLoadedAt(new Date());
    } catch (cause: any) {
      setError(cause?.message ?? 'Impossible de charger le cockpit SaaS.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    if (overview.open_support_tickets > 0) {
      items.push({
        key: 'support',
        icon: 'headset',
        title: overview.urgent_support_tickets > 0 ? 'Assistance prioritaire' : 'Demandes d’assistance ouvertes',
        detail: overview.urgent_support_tickets > 0
          ? `${overview.urgent_support_tickets} urgence(s) dans la file NCR`
          : 'Conversations client à suivre ou à clôturer',
        count: overview.open_support_tickets,
        tone: overview.urgent_support_tickets > 0 ? 'critical' : undefined,
        action: () => onOpenSupport()
      });
    }
    if (overview.payments_past_due > 0) items.push({ key: 'payments', icon: 'creditCard', title: 'Paiements en retard', detail: 'Abonnements à régulariser', count: overview.payments_past_due, tone: 'critical', action: onOpenBilling });
    if (overview.trials_ending_soon > 0) items.push({ key: 'trials', icon: 'clock', title: 'Essais bientôt terminés', detail: 'À convertir ou prolonger si nécessaire', count: overview.trials_ending_soon, tone: 'warning', action: onOpenBilling });
    if (overview.onboarding_incomplete > 0) items.push({ key: 'onboarding', icon: 'clipboard', title: 'Démarrages incomplets', detail: 'Espaces encore non configurés', count: overview.onboarding_incomplete, tone: 'warning', action: onOpenOrganizations });
    if (overview.inactive_14_days > 0) items.push({ key: 'inactive', icon: 'activity', title: 'Clients inactifs depuis 14 jours', detail: 'À relancer ou diagnostiquer', count: overview.inactive_14_days, action: onOpenOrganizations });
    return items;
  }, [overview, onOpenOrganizations, onOpenBilling, onOpenSupport]);

  const attentionCount = useMemo(() => attentionItems.reduce((sum, item) => sum + item.count, 0), [attentionItems]);

  return (
    <div className="admin-saas-cockpit">
      <section className="admin-cockpit-hero admin-cockpit-hero-r53">
        <div>
          <span className="admin-live-pill"><i /> Plateforme opérationnelle</span>
          <p className="eyebrow">NCR SUITE · PILOTAGE DU JOUR</p>
          <h1>{attentionCount > 0 ? `${attentionCount} point${attentionCount > 1 ? 's' : ''} à suivre` : 'Tout est sous contrôle'}</h1>
          <p>{attentionCount > 0 ? 'Le cockpit remonte uniquement ce qui mérite ton attention. Le reste reste disponible sans encombrer l’écran.' : 'Aucune urgence détectée pour le moment. Tu peux te concentrer sur les clients, les essais et le développement commercial.'}</p>
          {lastLoadedAt && <small className="admin-cockpit-last-update">Dernière actualisation : {lastLoadedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small>}
        </div>
        <div className="admin-cockpit-actions">
          <button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}><Icon name="activity" size={17} /> {loading ? 'Actualisation…' : 'Actualiser'}</button>
          <button type="button" className="primary-button" onClick={onOpenOrganizations}><Icon name="building" size={17} /> Clients</button>
          <button type="button" className="secondary-button" onClick={() => onOpenSupport()}><Icon name="headset" size={17} /> Assistance</button>
        </div>
      </section>

      {error && <div className="error-message" role="alert">{error}</div>}

      <section className="admin-cockpit-metrics">
        <article className="admin-kpi-card primary"><span><Icon name="building" size={21} /></span><div><small>Entreprises actives</small><strong>{overview.organizations_active}</strong><em>{overview.organizations_total} au total · {overview.organizations_trial} en essai</em></div></article>
        <article className="admin-kpi-card"><span><Icon name="creditCard" size={21} /></span><div><small>MRR estimé</small><strong>{money(overview.estimated_mrr_cents)}</strong><em>{overview.payments_past_due} paiement(s) en retard</em></div></article>
        <article className="admin-kpi-card"><span><Icon name="users" size={21} /></span><div><small>Utilisateurs actifs</small><strong>{overview.active_users}</strong><em>tous métiers confondus</em></div></article>
        <article className={`admin-kpi-card ${overview.open_support_tickets > 0 ? 'warning' : ''}`}><span><Icon name="headset" size={21} /></span><div><small>Assistance ouverte</small><strong>{overview.open_support_tickets}</strong><em>{overview.urgent_support_tickets} urgence(s)</em></div></article>
      </section>

      <section className="admin-cockpit-grid">
        <article className="panel admin-attention-panel">
          <div className="panel-header"><div><p className="eyebrow">À TRAITER</p><h2>Priorités du jour</h2></div><span className="admin-count-badge">{attentionCount}</span></div>
          {attentionItems.length > 0 ? <div className="admin-attention-list">
            {attentionItems.map((item) => <button type="button" key={item.key} onClick={item.action} className={item.tone ?? ''}><span><Icon name={item.icon} size={18} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><b>{item.count}</b><Icon name="chevronRight" size={17} /></button>)}
          </div> : <div className="admin-positive-empty admin-cockpit-healthy-state"><Icon name="check" size={24} /><div><strong>Aucune action prioritaire</strong><small>Les essais, paiements, démarrages et demandes d’assistance ne nécessitent pas d’intervention immédiate.</small></div></div>}
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
          <div className="panel-header"><div><p className="eyebrow">ASSISTANCE NCR</p><h2>À répondre en priorité</h2></div><button type="button" className="text-button" onClick={() => onOpenSupport()}>Toute la file <Icon name="chevronRight" size={15} /></button></div>
          <div className="admin-ticket-preview-list">
            {tickets.map((ticket) => <button key={ticket.id} type="button" onClick={() => onOpenSupport(ticket.id)}><span className={`admin-priority-dot ${ticket.priority}`} /><div><strong>{ticket.subject}</strong><small>{ticket.organization_name} · {ticketStatusLabels[ticket.status]} · {relativeDate(ticket.updated_at ?? ticket.created_at)}</small></div><span className={`admin-priority-pill ${ticket.priority}`}>{ticket.priority === 'urgent' ? 'Urgent' : ticket.priority === 'high' ? 'Haute' : ticket.priority === 'normal' ? 'Normale' : 'Faible'}</span></button>)}
            {!loading && tickets.length === 0 && <div className="admin-positive-empty"><Icon name="check" size={22} /><div><strong>Aucun ticket actif</strong><small>La file d’assistance est à jour.</small></div></div>}
          </div>
        </article>

        <article className="panel admin-activity-preview">
          <div className="panel-header"><div><p className="eyebrow">ACTIVITÉ</p><h2>Derniers événements</h2></div><button type="button" className="text-button" onClick={onOpenActivity}>Journal complet <Icon name="chevronRight" size={15} /></button></div>
          <div className="admin-activity-mini-list">
            {activity.slice(0, 7).map((row) => <div key={row.id}><span><Icon name={row.action.includes('support') ? 'headset' : row.action.includes('subscription') ? 'creditCard' : 'activity'} size={16} /></span><div><strong>{activityLabel(row.action)}</strong><small>{row.organization_name || 'Plateforme NCR'} · {row.user_email || 'Système'}</small></div><time>{relativeDate(row.created_at)}</time></div>)}
          </div>
        </article>
      </section>
    </div>
  );
}
