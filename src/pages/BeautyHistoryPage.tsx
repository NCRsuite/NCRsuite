import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useBeautyEnseigneContext } from '../hooks/useBeautyEnseigneContext';
import { supabase } from '../lib/supabase';
import '../beautyHistory.css';

type HistoryCategory = 'all' | 'appointments' | 'clients' | 'services' | 'team' | 'resources' | 'stock' | 'loyalty' | 'settings';

interface AuditItem {
  id: number;
  created_at: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  user_id: string | null;
  actor_name: string;
  actor_avatar_url: string | null;
  company_id: string;
  company_name: string | null;
  site_id: string | null;
  site_name: string | null;
  entity_label: string;
}

interface AuditPayload {
  total: number;
  items: AuditItem[];
}

const categoryLabels: Record<HistoryCategory, string> = {
  all: 'Tout',
  appointments: 'Rendez-vous',
  clients: 'Clients',
  services: 'Prestations',
  team: 'Équipe',
  resources: 'Ressources',
  stock: 'Stock',
  loyalty: 'Fidélité',
  settings: 'Réglages'
};

const actionLabels: Record<string, string> = {
  'appointment.created': 'Rendez-vous créé',
  'appointment.updated': 'Rendez-vous modifié',
  'appointment.status_changed': 'Statut du rendez-vous modifié',
  'appointment.public_created': 'Rendez-vous créé en ligne',
  'appointment.public_company_created': 'Rendez-vous créé en ligne',
  'appointment.public_cancelled': 'Rendez-vous annulé en ligne',
  'staff.created': 'Collaborateur créé',
  'staff.updated': 'Collaborateur modifié',
  'beauty.client_created': 'Client créé',
  'beauty.client_updated': 'Client modifié',
  'beauty.client_archived': 'Client archivé',
  'beauty.service_created': 'Prestation créée',
  'beauty.service_updated': 'Prestation modifiée',
  'beauty.service_disabled': 'Prestation désactivée',
  'beauty.service_reactivated': 'Prestation réactivée',
  'beauty.resource_created': 'Ressource créée',
  'beauty.resource_updated': 'Ressource modifiée',
  'beauty.resource_disabled': 'Ressource désactivée',
  'beauty.resource_reactivated': 'Ressource réactivée',
  'beauty.resource_services_updated': 'Prestations de la ressource modifiées',
  'beauty.stock_item_created': 'Produit ajouté au stock',
  'beauty.stock_item_updated': 'Fiche stock modifiée',
  'beauty.stock_item_disabled': 'Produit stock désactivé',
  'beauty.stock_item_reactivated': 'Produit stock réactivé',
  'beauty.stock_adjusted': 'Mouvement de stock enregistré',
  'beauty.stock_consumables_updated': 'Consommation par prestation modifiée',
  'beauty.company_loyalty_settings_updated': 'Programme fidélité modifié',
  'coiffure.loyalty_settings_updated': 'Programme fidélité modifié',
  'metier.company_saved': 'Enseigne modifiée',
  'metier.company_public_page_updated': 'Page de réservation modifiée',
  'metier.company_public_logo_updated': 'Logo public modifié',
  'metier.company_public_banner_position_updated': 'Position de couverture modifiée',
  'metier.company_public_banner_crop_updated': 'Recadrage de couverture modifié',
  'metier.site_saved': 'Établissement modifié',
  'metier.site_status_updated': 'Statut de l’établissement modifié',
  'metier.site_location_assigned': 'Adresse de l’établissement modifiée',
  'booking.settings_updated': 'Réglages de réservation modifiés',
  'booking.email_settings_updated': 'Notifications de réservation modifiées',
  'booking.client_experience_updated': 'Expérience client modifiée',
  'organization.commercial_branding_updated': 'Identité commerciale modifiée'
};

const fieldLabels: Record<string, string> = {
  created: 'Création',
  name: 'Nom',
  category_name: 'Catégorie',
  category: 'Catégorie',
  duration_minutes: 'Durée',
  price_cents: 'Tarif',
  online_booking_enabled: 'Réservation en ligne',
  booking_min_notice_hours: 'Délai minimum',
  booking_max_days_ahead: 'Horizon de réservation',
  booking_buffer_before_minutes: 'Temps avant',
  booking_buffer_after_minutes: 'Temps après',
  booking_weekdays: 'Jours réservables',
  booking_start_time: 'Heure de début',
  booking_end_time: 'Heure de fin',
  active: 'Statut actif',
  status: 'Statut',
  kind: 'Type',
  capacity: 'Capacité',
  notes: 'Notes',
  sku: 'Référence',
  unit: 'Unité',
  alert_threshold: 'Seuil d’alerte',
  unit_cost_cents: 'Coût unitaire',
  supplier: 'Fournisseur',
  storage_location: 'Emplacement',
  first_name: 'Prénom',
  last_name: 'Nom',
  email: 'E-mail',
  phone: 'Téléphone',
  company_id: 'Enseigne',
  site_id: 'Établissement'
};

function categoryFor(item: AuditItem): HistoryCategory {
  const value = `${item.action} ${item.entity_type ?? ''}`;
  if (/appointment/.test(value)) return 'appointments';
  if (/client/.test(value)) return 'clients';
  if (/service/.test(value) && !/resource_services|stock_consumables/.test(value)) return 'services';
  if (/staff|team/.test(value)) return 'team';
  if (/resource/.test(value)) return 'resources';
  if (/stock|consumable/.test(value)) return 'stock';
  if (/loyalty|fidel/.test(value)) return 'loyalty';
  return 'settings';
}

function iconFor(category: HistoryCategory) {
  if (category === 'appointments') return 'calendar' as const;
  if (category === 'clients') return 'users' as const;
  if (category === 'services') return 'sparkles' as const;
  if (category === 'team') return 'briefcase' as const;
  if (category === 'resources') return 'tool' as const;
  if (category === 'stock') return 'briefcase' as const;
  if (category === 'loyalty') return 'chart' as const;
  return 'settings' as const;
}

function labelForAction(action: string) {
  if (actionLabels[action]) return actionLabels[action];
  return action.split('.').pop()?.replace(/_/g, ' ') || 'Modification';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

function formatValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'price_cents' || field === 'unit_cost_cents') {
    const cents = Number(value);
    return Number.isFinite(cents)
      ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
      : String(value);
  }
  if (field.endsWith('_minutes')) return `${value} min`;
  if (field.endsWith('_hours')) return `${value} h`;
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return 'Configuration modifiée';
  return String(value);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

export function BeautyHistoryPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const { beautyMode, selectedEnseigne, selectedEnseigneId, loading: enseigneLoading } = useBeautyEnseigneContext();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loadedLimit, setLoadedLimit] = useState(100);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<HistoryCategory>('all');
  const [siteId, setSiteId] = useState('all');
  const [actor, setActor] = useState('all');
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<'7' | '30' | '90' | 'all'>('30');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const canView = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const sites = selectedEnseigne?.sites ?? [];

  async function load(limit = loadedLimit, append = false) {
    if (!organization || !selectedEnseigneId || !canView) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    if (demoMode || !supabase) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const offset = append ? items.length : 0;
      const { data, error: rpcError } = await supabase.rpc('beauty_audit_history', {
        p_organization_id: organization.id,
        p_company_id: selectedEnseigneId,
        p_limit: limit,
        p_offset: offset
      });
      if (rpcError) throw rpcError;
      const payload = (data ?? { total: 0, items: [] }) as AuditPayload;
      setTotal(Number(payload.total ?? 0));
      const next = Array.isArray(payload.items) ? payload.items : [];
      setItems((current) => append ? [...current, ...next] : next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de charger l’historique.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    setLoadedLimit(100);
    setCategory('all');
    setSiteId('all');
    setActor('all');
    setQuery('');
    setPeriod('30');
    setExpandedId(null);
    void load(100, false);
  }, [organization?.id, selectedEnseigneId, canView, demoMode]);

  const actors = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => map.set(item.user_id ?? 'system', item.actor_name));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [items]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr-FR');
    const now = Date.now();
    const cutoff = period === 'all' ? null : now - Number(period) * 86_400_000;

    return items.filter((item) => {
      const itemCategory = categoryFor(item);
      if (category !== 'all' && itemCategory !== category) return false;
      if (siteId !== 'all' && item.site_id !== siteId) return false;
      if (actor !== 'all' && (item.user_id ?? 'system') !== actor) return false;
      if (cutoff !== null && new Date(item.created_at).getTime() < cutoff) return false;
      if (needle) {
        const haystack = [
          item.actor_name,
          item.entity_label,
          item.site_name,
          item.company_name,
          labelForAction(item.action),
          ...(Array.isArray(item.metadata?.changed_fields) ? item.metadata.changed_fields.map(String) : [])
        ].filter(Boolean).join(' ').toLocaleLowerCase('fr-FR');
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [items, category, siteId, actor, query, period]);

  const todayCount = items.filter((item) => {
    const date = new Date(item.created_at);
    const today = new Date();
    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  }).length;
  const activeActors = new Set(items.map((item) => item.user_id ?? 'system')).size;
  const sensitiveCount = items.filter((item) => ['clients', 'stock', 'settings'].includes(categoryFor(item))).length;

  if (!organization) return null;
  if (!beautyMode) return <div className="page"><div className="info-message page-message">L’historique avancé est disponible dans l’environnement Coiffure & beauté Métier.</div></div>;
  if (!canView) return <div className="page"><div className="error-message page-message">Cet historique est réservé aux propriétaires, administrateurs et managers.</div></div>;

  return <div className="page beauty-history-page">
    <header className="page-header">
      <div>
        <p className="eyebrow">GESTION AVANCÉE</p>
        <h1>Historique</h1>
        <p>{selectedEnseigne ? `Retrouvez les modifications de ${selectedEnseigne.name} : rendez-vous, clients, prestations, équipe, ressources, stock et réglages.` : 'Sélectionnez une enseigne pour consulter son journal.'}</p>
      </div>
      <button type="button" className="secondary-button" onClick={() => void load(100, false)} disabled={loading || !selectedEnseigneId}><Icon name="activity" size={17}/>Actualiser</button>
    </header>

    {!selectedEnseigneId && !enseigneLoading && <div className="info-message page-message">Aucune enseigne Beauty sélectionnée.</div>}
    {error && <div className="error-message page-message" role="alert">{error}</div>}

    <section className="service-summary-grid beauty-history-summary">
      <article className="panel service-summary-card"><span>Événements</span><strong>{total}</strong><small>journalisés pour l’enseigne</small></article>
      <article className="panel service-summary-card"><span>Aujourd’hui</span><strong>{todayCount}</strong><small>sur les événements chargés</small></article>
      <article className="panel service-summary-card"><span>Acteurs</span><strong>{activeActors}</strong><small>utilisateurs / système</small></article>
      <article className="panel service-summary-card"><span>Opérations sensibles</span><strong>{sensitiveCount}</strong><small>clients, stock ou réglages</small></article>
    </section>

    <section className="panel beauty-history-panel">
      <div className="beauty-history-toolbar">
        <div>
          <p className="eyebrow">JOURNAL · {selectedEnseigne?.name ?? 'BEAUTY'}</p>
          <h2>{filteredItems.length} événement{filteredItems.length > 1 ? 's' : ''} affiché{filteredItems.length > 1 ? 's' : ''}</h2>
        </div>
        <div className="beauty-history-search">
          <Icon name="search" size={16}/>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une action, un élément…"/>
        </div>
      </div>

      <div className="beauty-history-filters">
        <select value={period} onChange={(event) => setPeriod(event.target.value as '7' | '30' | '90' | 'all')}>
          <option value="7">7 derniers jours</option>
          <option value="30">30 derniers jours</option>
          <option value="90">90 derniers jours</option>
          <option value="all">Toute la période chargée</option>
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value as HistoryCategory)}>
          {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={siteId} onChange={(event) => setSiteId(event.target.value)}>
          <option value="all">Tous les établissements</option>
          {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select>
        <select value={actor} onChange={(event) => setActor(event.target.value)}>
          <option value="all">Tous les acteurs</option>
          {actors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {loading || enseigneLoading ? <div className="list-state">Chargement de l’historique…</div> : filteredItems.length === 0 ? <div className="list-state empty-service-state"><div className="empty-icon"><Icon name="activity" size={30}/></div><h3>Aucun événement</h3><p>Modifiez les filtres ou effectuez une action sur cette enseigne pour alimenter le journal.</p></div> : <div className="beauty-history-timeline">
        {filteredItems.map((item) => {
          const itemCategory = categoryFor(item);
          const changedFields = Array.isArray(item.metadata?.changed_fields) ? item.metadata.changed_fields.map(String) : [];
          const before = item.metadata?.before && typeof item.metadata.before === 'object' ? item.metadata.before as Record<string, unknown> : {};
          const after = item.metadata?.after && typeof item.metadata.after === 'object' ? item.metadata.after as Record<string, unknown> : {};
          const hasDiff = changedFields.length > 0 && !changedFields.includes('created');
          const expanded = expandedId === item.id;
          const requirementCount = Number(item.metadata?.requirement_count ?? NaN);
          const statusValue = typeof item.metadata?.status === 'string' ? item.metadata.status : null;
          const delta = Number(item.metadata?.quantity_delta ?? NaN);

          return <article className={`beauty-history-event category-${itemCategory}`} key={item.id}>
            <div className="beauty-history-event-icon"><Icon name={iconFor(itemCategory)} size={18}/></div>
            <div className="beauty-history-event-main">
              <div className="beauty-history-event-title">
                <div><strong>{labelForAction(item.action)}</strong><span>{item.entity_label}</span></div>
                <time>{formatDateTime(item.created_at)}</time>
              </div>
              <div className="beauty-history-event-context">
                <span className="beauty-history-actor">
                  {item.actor_avatar_url ? <img src={item.actor_avatar_url} alt="" loading="lazy"/> : <i>{initials(item.actor_name)}</i>}
                  {item.actor_name}
                </span>
                {item.site_name && <span><Icon name="map" size={12}/>{item.site_name}</span>}
                <span>{categoryLabels[itemCategory]}</span>
              </div>

              {statusValue && <p className="beauty-history-inline-detail">Nouveau statut : <strong>{statusValue}</strong></p>}
              {Number.isFinite(requirementCount) && <p className="beauty-history-inline-detail"><strong>{requirementCount}</strong> prestation{requirementCount > 1 ? 's' : ''} configurée{requirementCount > 1 ? 's' : ''}.</p>}
              {Number.isFinite(delta) && <p className="beauty-history-inline-detail">Mouvement : <strong>{delta > 0 ? '+' : ''}{delta}</strong></p>}
              {changedFields.length > 0 && !changedFields.includes('created') && <div className="beauty-history-changed-fields">{changedFields.map((field) => <span key={field}>{fieldLabels[field] || field.replace(/_/g, ' ')}</span>)}</div>}

              {hasDiff && <button type="button" className="beauty-history-detail-button" onClick={() => setExpandedId(expanded ? null : item.id)}>
                {expanded ? 'Masquer le détail' : 'Voir le détail avant / après'} <span className={expanded ? 'rotated' : ''}><Icon name="chevronDown" size={13}/></span>
              </button>}

              {expanded && <div className="beauty-history-diff">
                {changedFields.map((field) => {
                  const hasBefore = Object.prototype.hasOwnProperty.call(before, field);
                  const hasAfter = Object.prototype.hasOwnProperty.call(after, field);
                  if (!hasBefore && !hasAfter) return <div key={field} className="privacy-only"><span>{fieldLabels[field] || field}</span><small>Champ modifié · valeur non dupliquée dans le journal</small></div>;
                  return <div key={field}>
                    <span>{fieldLabels[field] || field.replace(/_/g, ' ')}</span>
                    <div><del>{formatValue(field, before[field])}</del><Icon name="chevronRight" size={12}/><ins>{formatValue(field, after[field])}</ins></div>
                  </div>;
                })}
              </div>}
            </div>
          </article>;
        })}
      </div>}

      {items.length < total && <div className="beauty-history-load-more">
        <button type="button" className="secondary-button" disabled={loadingMore} onClick={() => {
          const next = Math.min(100, total - items.length);
          setLoadedLimit(next);
          void load(next, true);
        }}>{loadingMore ? 'Chargement…' : `Charger les événements précédents (${total - items.length} restant${total - items.length > 1 ? 's' : ''})`}</button>
      </div>}
    </section>

    <p className="beauty-history-privacy-note"><Icon name="lock" size={14}/><span>Le journal n’enregistre pas une copie des e-mails, téléphones ou notes clients. Pour ces champs, seule l’existence d’une modification est conservée.</span></p>
  </div>;
}
