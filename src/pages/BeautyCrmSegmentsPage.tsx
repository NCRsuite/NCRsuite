import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BeautyClientCrmPanel } from '../components/BeautyClientCrmPanel';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useBeautyEnseigneContext } from '../hooks/useBeautyEnseigneContext';
import { supabase } from '../lib/supabase';
import '../beautyCrmSegments.css';

type SegmentKey =
  | 'all'
  | 'marketing'
  | 'new'
  | 'loyal'
  | 'vip'
  | 'rebook_due'
  | 'inactive'
  | 'lost'
  | 'birthday'
  | 'prospect'
  | 'at_risk';

interface SegmentSummary {
  summary: {
    active_clients: number;
    marketing_allowed: number;
    with_email: number;
    with_phone: number;
    average_visits: number;
    average_spent_cents: number;
    vip_threshold_visits: number;
  };
  segments: Array<{
    key: SegmentKey;
    count: number;
    marketing_eligible_count: number;
  }>;
}

interface SegmentClient {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  marketing_allowed: boolean;
  birthday_allowed: boolean;
  birth_date: string | null;
  next_birthday: string | null;
  visit_count: number;
  total_spent_cents: number;
  first_visit: string | null;
  last_visit: string | null;
  next_appointment: string | null;
  average_days_between: number | null;
  no_show_count: number;
  last_service_name: string | null;
  last_staff_name: string | null;
  segment_keys: SegmentKey[];
}

interface SegmentClientsPayload {
  segment: SegmentKey;
  total: number;
  limit: number;
  offset: number;
  items: SegmentClient[];
}

interface CrmWorkspacePayload extends SegmentSummary {
  audience: SegmentClientsPayload;
}

const money = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});
const number = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const segmentMeta: Record<SegmentKey, {
  label: string;
  short: string;
  detail: string;
  icon: 'users' | 'message' | 'sparkles' | 'chart' | 'activity' | 'calendar' | 'refresh' | 'alert';
  tone: 'default' | 'positive' | 'warning' | 'accent';
}> = {
  all: {
    label: 'Tous les clients',
    short: 'Base active',
    detail: 'Toutes les fiches actives de cette enseigne.',
    icon: 'users',
    tone: 'default'
  },
  marketing: {
    label: 'Marketing autorisé',
    short: 'Consentement actif',
    detail: 'Dernier consentement marketing enregistré = autorisé.',
    icon: 'message',
    tone: 'positive'
  },
  new: {
    label: 'Nouveaux',
    short: '30 derniers jours',
    detail: 'Première visite terminée au cours des 30 derniers jours.',
    icon: 'sparkles',
    tone: 'accent'
  },
  loyal: {
    label: 'Fidèles',
    short: '5 visites ou plus',
    detail: 'Clients ayant déjà terminé au moins 5 rendez-vous.',
    icon: 'activity',
    tone: 'positive'
  },
  vip: {
    label: 'VIP',
    short: 'Seuil fidélité',
    detail: 'Le seuil VIP est repris directement du programme fidélité de l’enseigne.',
    icon: 'chart',
    tone: 'accent'
  },
  rebook_due: {
    label: 'À replanifier',
    short: 'Cycle dépassé',
    detail: 'Le délai habituel entre deux visites est dépassé et aucun prochain rendez-vous n’est prévu.',
    icon: 'refresh',
    tone: 'warning'
  },
  inactive: {
    label: 'Inactifs',
    short: '60 à 120 jours',
    detail: 'Dernière visite entre 60 et 120 jours, sans prochain rendez-vous.',
    icon: 'calendar',
    tone: 'warning'
  },
  lost: {
    label: 'À reconquérir',
    short: '120 jours et +',
    detail: 'Aucune visite depuis plus de 120 jours et aucun rendez-vous à venir.',
    icon: 'alert',
    tone: 'warning'
  },
  birthday: {
    label: 'Anniversaires',
    short: '30 jours à venir',
    detail: 'Anniversaire dans les 30 jours avec consentement anniversaire actif.',
    icon: 'sparkles',
    tone: 'accent'
  },
  prospect: {
    label: 'Prospects',
    short: 'Aucune visite terminée',
    detail: 'Fiches actives qui n’ont encore aucun rendez-vous terminé.',
    icon: 'users',
    tone: 'default'
  },
  at_risk: {
    label: 'Absences répétées',
    short: '2 no-shows ou plus',
    detail: 'Clients avec au moins deux rendez-vous marqués absents.',
    icon: 'alert',
    tone: 'warning'
  }
};

const segmentOrder: SegmentKey[] = [
  'all','marketing','new','loyal','vip','rebook_due','inactive','lost','birthday','prospect','at_risk'
];

function clientName(client: Pick<SegmentClient,'first_name'|'last_name'>) {
  return [client.first_name, client.last_name].filter(Boolean).join(' ');
}

function dateLabel(value: string | null) {
  return value ? shortDate.format(new Date(value)) : '—';
}

export function BeautyCrmSegmentsPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const { beautyMode, selectedEnseigne, selectedEnseigneId, loading: enseigneLoading } = useBeautyEnseigneContext();
  const [summary, setSummary] = useState<SegmentSummary | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<SegmentKey>('all');
  const [clientsPayload, setClientsPayload] = useState<SegmentClientsPayload | null>(null);
  const [query, setQuery] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [offset, setOffset] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState('');
  const [selectedClient, setSelectedClient] = useState<SegmentClient | null>(null);

  const canView = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const canManage = canView;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOffset(0);
      setQuery(searchValue.trim());
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    setSelectedSegment('all');
    setOffset(0);
    setQuery('');
    setSearchValue('');
    setSelectedClient(null);
  }, [selectedEnseigneId]);

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      if (!organization || !selectedEnseigneId || !canView || demoMode || !supabase) {
        if (active) {
          setSummary(null);
          setClientsPayload(null);
          setLoadingSummary(false);
          setLoadingClients(false);
        }
        return;
      }

      if (!summary) setLoadingSummary(true);
      setLoadingClients(true);
      setError('');

      const { data, error: requestError } = await supabase.rpc('beauty_crm_workspace', {
        p_organization_id: organization.id,
        p_company_id: selectedEnseigneId,
        p_segment: selectedSegment,
        p_search: query || null,
        p_limit: 100,
        p_offset: offset
      });

      if (!active) return;

      if (requestError) {
        setError(requestError.message);
        setSummary(null);
        setClientsPayload(null);
      } else {
        const workspace = (data ?? null) as CrmWorkspacePayload | null;
        setSummary(workspace ? {
          summary: workspace.summary,
          segments: workspace.segments
        } : null);
        setClientsPayload(workspace?.audience ?? null);
      }

      setLoadingSummary(false);
      setLoadingClients(false);
    }

    void loadWorkspace();
    return () => { active = false; };
  }, [organization?.id, selectedEnseigneId, selectedSegment, query, offset, canView, demoMode]);

  const segmentCounts = useMemo(() => {
    const map = new Map<SegmentKey, SegmentSummary['segments'][number]>();
    summary?.segments.forEach((item) => map.set(item.key, item));
    return map;
  }, [summary]);

  const currentCount = segmentCounts.get(selectedSegment);
  const currentMeta = segmentMeta[selectedSegment];
  const items = clientsPayload?.items ?? [];
  const total = clientsPayload?.total ?? 0;
  const pageSize = clientsPayload?.limit ?? 100;
  const hasPrevious = offset > 0;
  const hasNext = offset + pageSize < total;

  if (!organization) return null;
  if (!beautyMode) return <div className="page"><div className="info-message page-message">Le CRM avancé est disponible dans l’environnement Coiffure & beauté Métier.</div></div>;
  if (!canView) return <div className="page"><div className="error-message page-message">Le CRM est réservé aux propriétaires, administrateurs et managers autorisés.</div></div>;

  return <div className="page beauty-crm-segments-page">
    <header className="page-header beauty-crm-segments-header">
      <div>
        <p className="eyebrow">CRM BEAUTY</p>
        <h1>Clients & segments</h1>
        <p>{selectedEnseigne
          ? `Analyse comportementale propre à ${selectedEnseigne.name}. Les audiences ne mélangent jamais les autres enseignes du centre.`
          : 'Sélectionnez une enseigne Beauty.'}</p>
      </div>
      <div className="beauty-crm-header-actions">
        <Link className="secondary-button" to="/clients"><Icon name="users" size={16}/> Répertoire clients</Link>
        <Link className="secondary-button" to="/imports"><Icon name="file" size={16}/> Imports</Link>
        <Link className="secondary-button" to="/pilotage"><Icon name="chart" size={16}/> Pilotage</Link>
      </div>
    </header>

    {demoMode && <div className="info-message page-message">Les segments CRM utilisent les données réelles Supabase et ne sont pas simulés en mode démonstration.</div>}
    {!selectedEnseigneId && !enseigneLoading && <div className="info-message page-message">Aucune enseigne Beauty sélectionnée.</div>}
    {error && <div className="error-message page-message" role="alert">{error}</div>}

    {loadingSummary || enseigneLoading ? <div className="panel beauty-crm-loading beauty-loading-state" aria-busy="true">Analyse du fichier client…</div> : summary ? <>
      <section className="beauty-crm-kpis">
        <article className="panel"><span>Clients actifs</span><strong>{summary.summary.active_clients}</strong><small>dans cette enseigne</small></article>
        <article className="panel"><span>Marketing autorisé</span><strong>{summary.summary.marketing_allowed}</strong><small>selon le dernier consentement</small></article>
        <article className="panel"><span>Dépense moyenne</span><strong>{money.format(summary.summary.average_spent_cents / 100)}</strong><small>par fiche active</small></article>
        <article className="panel"><span>Visites moyennes</span><strong>{number.format(summary.summary.average_visits)}</strong><small>rendez-vous terminés</small></article>
      </section>

      <section className="panel beauty-crm-segment-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">SEGMENTS INTELLIGENTS</p>
            <h2>Audiences dynamiques</h2>
            <small>Les segments se recalculent automatiquement à partir des rendez-vous, de la fidélité et des consentements.</small>
          </div>
        </div>
        <div className="beauty-crm-segment-grid">
          {segmentOrder.map((key) => {
            const meta = segmentMeta[key];
            const counts = segmentCounts.get(key);
            const active = key === selectedSegment;
            return <button
              type="button"
              key={key}
              className={`beauty-crm-segment-card ${meta.tone}${active ? ' active' : ''}`}
              onClick={() => { setSelectedSegment(key); setOffset(0); }}
            >
              <span className="beauty-crm-segment-icon"><Icon name={meta.icon} size={17}/></span>
              <span className="beauty-crm-segment-copy">
                <strong>{meta.label}</strong>
                <small>{key === 'vip' ? `${summary.summary.vip_threshold_visits} visites ou plus` : meta.short}</small>
              </span>
              <b>{counts?.count ?? 0}</b>
              <em>{counts?.marketing_eligible_count ?? 0} marketing</em>
            </button>;
          })}
        </div>
        <p className="beauty-crm-overlap-note"><Icon name="info" size={13}/> Une même cliente peut appartenir à plusieurs segments. « marketing » indique uniquement les clientes dont le dernier consentement marketing est actif.</p>
      </section>

      <section className="panel beauty-crm-audience-panel">
        <div className="beauty-crm-audience-head">
          <div>
            <p className="eyebrow">AUDIENCE</p>
            <h2>{currentMeta.label}</h2>
            <p>{currentMeta.detail}</p>
          </div>
          <div className="beauty-crm-audience-count">
            <strong>{currentCount?.count ?? total}</strong>
            <span>cliente{(currentCount?.count ?? total) > 1 ? 's' : ''}</span>
            <small>{currentCount?.marketing_eligible_count ?? 0} avec marketing autorisé</small>
          </div>
        </div>

        <div className="beauty-crm-toolbar">
          <label className="beauty-crm-search">
            <Icon name="search" size={15}/>
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Rechercher nom, e-mail ou téléphone…"
            />
            {searchValue && <button type="button" onClick={() => setSearchValue('')} aria-label="Effacer la recherche"><Icon name="close" size={13}/></button>}
          </label>
          <div className="beauty-crm-contact-stats">
            <span><Icon name="message" size={13}/> {summary.summary.with_email} e-mails</span>
            <span><Icon name="phone" size={13}/> {summary.summary.with_phone} téléphones</span>
          </div>
        </div>

        {loadingClients ? <div className="beauty-crm-loading compact beauty-loading-state" aria-busy="true">Chargement de l’audience…</div> : items.length === 0 ? <div className="list-state">Aucune cliente dans ce segment{query ? ' pour cette recherche' : ''}.</div> : <>
          <div className="beauty-crm-client-list">
            {items.map((client) => <article key={client.id} className="beauty-crm-client-card">
              <div className="beauty-crm-client-avatar">{client.first_name.slice(0,1).toUpperCase()}</div>
              <div className="beauty-crm-client-main">
                <div className="beauty-crm-client-title">
                  <strong>{clientName(client)}</strong>
                  <span className={client.marketing_allowed ? 'allowed' : 'blocked'}>
                    <Icon name={client.marketing_allowed ? 'check' : 'lock'} size={11}/>
                    {client.marketing_allowed ? 'Marketing autorisé' : 'Marketing non autorisé'}
                  </span>
                </div>
                <div className="beauty-crm-client-contact">
                  <span>{client.phone || 'Téléphone non renseigné'}</span>
                  <span>{client.email || 'E-mail non renseigné'}</span>
                </div>
                <div className="beauty-crm-client-tags">
                  {client.segment_keys.filter((key) => key !== 'all').slice(0,4).map((key) => <span key={key}>{segmentMeta[key]?.label ?? key}</span>)}
                </div>
              </div>

              <div className="beauty-crm-client-metrics">
                <div><span>Visites</span><strong>{client.visit_count}</strong></div>
                <div><span>Dépensé</span><strong>{money.format(client.total_spent_cents / 100)}</strong></div>
                <div><span>Dernière visite</span><strong>{dateLabel(client.last_visit)}</strong></div>
                <div><span>Prochain RDV</span><strong>{dateLabel(client.next_appointment)}</strong></div>
              </div>

              <div className="beauty-crm-client-context">
                <span><small>Dernière prestation</small><strong>{client.last_service_name || 'Aucune visite terminée'}</strong></span>
                <span><small>Dernier professionnel</small><strong>{client.last_staff_name || '—'}</strong></span>
                {client.average_days_between !== null && <span><small>Cycle moyen</small><strong>{number.format(client.average_days_between)} jours</strong></span>}
                {client.no_show_count > 0 && <span className="warning"><small>Absences</small><strong>{client.no_show_count}</strong></span>}
              </div>

              <div className="beauty-crm-client-actions">
                <button type="button" className="secondary-button compact-button" onClick={() => setSelectedClient(client)}>
                  <Icon name="sparkles" size={14}/> Fiche client pro
                </button>
                <Link className="secondary-button compact-button" to="/rendez-vous?new=1"><Icon name="calendar" size={14}/> Rendez-vous</Link>
              </div>
            </article>)}
          </div>

          {(hasPrevious || hasNext) && <div className="beauty-crm-pagination">
            <button type="button" className="secondary-button compact-button" disabled={!hasPrevious} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Précédent</button>
            <span>{offset + 1}–{Math.min(offset + items.length, total)} sur {total}</span>
            <button type="button" className="secondary-button compact-button" disabled={!hasNext} onClick={() => setOffset(offset + pageSize)}>Suivant</button>
          </div>}
        </>}
      </section>

      <section className="panel beauty-crm-marketing-readiness">
        <div>
          <span className="beauty-crm-marketing-icon"><Icon name="message" size={19}/></span>
          <div><p className="eyebrow">PRÊT POUR LES CAMPAGNES</p><h2>Audience qualifiée, consentements respectés</h2><p>Le CRM sait déjà quelles clientes sont éligibles à une communication marketing. La prochaine brique pourra préparer les campagnes sans envoyer quoi que ce soit aux clientes non consentantes.</p></div>
        </div>
        <strong>{summary.summary.marketing_allowed}<small>contacts autorisés</small></strong>
      </section>
    </> : !demoMode && <div className="panel list-state">Aucune donnée CRM disponible.</div>}

    {selectedClient && selectedEnseigneId && user && (
      <BeautyClientCrmPanel
        organizationId={organization.id}
        companyId={selectedEnseigneId}
        client={{
          id: selectedClient.id,
          first_name: selectedClient.first_name,
          last_name: selectedClient.last_name,
          email: selectedClient.email,
          phone: selectedClient.phone
        }}
        userId={user.id}
        canManage={canManage}
        publicSlug={selectedEnseigne?.public_slug}
        onClose={() => setSelectedClient(null)}
      />
    )}
  </div>;
}
