import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useBeautyEnseigneContext } from '../hooks/useBeautyEnseigneContext';
import { supabase } from '../lib/supabase';
import '../beautyPilotage.css';

type PilotPeriod = 7 | 30 | 90 | 365;

interface PilotDashboard {
  company: { id: string; name: string };
  period: {
    days: number;
    start_date: string;
    end_date: string;
    previous_start_date: string;
    previous_end_date: string;
  };
  summary: {
    appointments_total: number;
    completed: number;
    cancelled: number;
    no_show: number;
    upcoming_or_active: number;
    revenue_cents: number;
    average_basket_cents: number;
    unique_clients: number;
    new_clients: number;
    returning_clients: number;
    booked_minutes: number;
    available_minutes: number;
    occupancy_rate: number;
    cancellation_rate: number;
    no_show_rate: number;
  };
  previous: {
    appointments_total: number;
    completed: number;
    cancelled: number;
    no_show: number;
    revenue_cents: number;
    average_basket_cents: number;
  };
  changes: {
    revenue_pct: number;
    completed_pct: number;
    average_basket_pct: number;
  };
  daily: Array<{ date: string; appointments: number; completed: number; revenue_cents: number }>;
  sources: Array<{ origin: string; appointments: number; revenue_cents: number }>;
  top_services: Array<{
    service_id: string;
    service_name: string;
    appointments: number;
    completed: number;
    revenue_cents: number;
    booked_minutes: number;
  }>;
  top_staff: Array<{
    id: string;
    name: string;
    appointments: number;
    completed: number;
    revenue_cents: number;
    booked_minutes: number;
  }>;
  peak_hours: Array<{ hour: number; appointments: number }>;
  weekdays: Array<{ weekday: number; appointments: number; revenue_cents: number }>;
}

interface GrowthDashboard {
  summary?: {
    waiting?: number;
    inactive?: number;
    birthday?: number;
    rebook_due?: number;
    verified_reviews?: number;
    average_rating?: number | null;
    review_opportunities?: number;
    qualified_referrals?: number;
    pending_referrals?: number;
  };
  opportunities?: Array<{
    client_id: string;
    first_name: string;
    last_name: string | null;
    reason: 'birthday' | 'inactive' | 'rebook_due' | string;
    score: number;
    last_visit: string | null;
    next_appointment: string | null;
    last_service_name?: string | null;
  }>;
}

const money = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});
const moneyPrecise = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2
});
const number = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

const periodLabels: Record<PilotPeriod, string> = {
  7: '7 jours',
  30: '30 jours',
  90: '90 jours',
  365: '1 an'
};

const originLabels: Record<string, string> = {
  internal_agenda: 'Agenda interne',
  shared_reception: 'Accueil partagé',
  public_page: 'Page publique',
  client_portal: 'Espace client',
  referral: 'Parrainage',
  qr_code: 'QR code',
  widget: 'Widget',
  direct_link: 'Lien direct',
  import: 'Import',
  unknown: 'Autre'
};

const weekdayLabels: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
  7: 'Dim'
};

function formatChange(value: number) {
  if (!Number.isFinite(value)) return '0 %';
  return `${value > 0 ? '+' : ''}${number.format(value)} %`;
}

function fullName(first: string, last: string | null) {
  return [first, last].filter(Boolean).join(' ');
}

function opportunityLabel(reason: string) {
  if (reason === 'birthday') return 'Anniversaire à venir';
  if (reason === 'inactive') return 'Client inactif';
  if (reason === 'rebook_due') return 'À replanifier';
  return 'Opportunité';
}

function trendTone(value: number) {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

function buildTrendPoints(rows: PilotDashboard['daily']) {
  if (rows.length <= 31) return rows;
  const bucketSize = Math.ceil(rows.length / 30);
  const points: PilotDashboard['daily'] = [];
  for (let index = 0; index < rows.length; index += bucketSize) {
    const bucket = rows.slice(index, index + bucketSize);
    points.push({
      date: bucket[0].date,
      appointments: bucket.reduce((sum, item) => sum + item.appointments, 0),
      completed: bucket.reduce((sum, item) => sum + item.completed, 0),
      revenue_cents: bucket.reduce((sum, item) => sum + item.revenue_cents, 0)
    });
  }
  return points;
}

export function BeautyPilotagePage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const { beautyMode, selectedEnseigne, selectedEnseigneId, loading: enseigneLoading } = useBeautyEnseigneContext();
  const [period, setPeriod] = useState<PilotPeriod>(30);
  const [dashboard, setDashboard] = useState<PilotDashboard | null>(null);
  const [growth, setGrowth] = useState<GrowthDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');

  async function load() {
    if (!organization || !selectedEnseigneId || !canView) {
      setDashboard(null);
      setGrowth(null);
      setLoading(false);
      return;
    }

    if (demoMode || !supabase) {
      setDashboard(null);
      setGrowth(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const [pilotResult, growthResult] = await Promise.all([
      supabase.rpc('beauty_pilot_dashboard', {
        p_organization_id: organization.id,
        p_company_id: selectedEnseigneId,
        p_days: period
      }),
      supabase.rpc('beauty_growth_pilot_compact', {
        p_organization_id: organization.id,
        p_company_id: selectedEnseigneId
      })
    ]);

    const firstError = pilotResult.error || growthResult.error;
    if (firstError) {
      setError(firstError.message);
      setDashboard(null);
      setGrowth(null);
    } else {
      setDashboard((pilotResult.data ?? null) as PilotDashboard | null);
      setGrowth((growthResult.data ?? null) as GrowthDashboard | null);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [organization?.id, selectedEnseigneId, period, canView, demoMode]);

  const trendPoints = useMemo(() => buildTrendPoints(dashboard?.daily ?? []), [dashboard?.daily]);
  const maxTrendRevenue = Math.max(1, ...trendPoints.map((item) => item.revenue_cents));
  const maxSourceAppointments = Math.max(1, ...(dashboard?.sources ?? []).map((item) => item.appointments));
  const maxServiceRevenue = Math.max(1, ...(dashboard?.top_services ?? []).map((item) => item.revenue_cents));
  const maxStaffRevenue = Math.max(1, ...(dashboard?.top_staff ?? []).map((item) => item.revenue_cents));
  const maxHourAppointments = Math.max(1, ...(dashboard?.peak_hours ?? []).map((item) => item.appointments));
  const maxWeekdayAppointments = Math.max(1, ...(dashboard?.weekdays ?? []).map((item) => item.appointments));

  const insights = useMemo(() => {
    if (!dashboard) return [];
    const rows: Array<{ tone: 'good' | 'warning' | 'neutral'; title: string; text: string }> = [];
    const s = dashboard.summary;

    if (s.appointments_total === 0) {
      rows.push({
        tone: 'neutral',
        title: 'Pas encore assez de données',
        text: 'Les recommandations apparaîtront dès que des rendez-vous seront enregistrés sur cette période.'
      });
      return rows;
    }

    if (s.occupancy_rate < 35 && s.available_minutes > 0) {
      rows.push({
        tone: 'warning',
        title: 'Capacité encore disponible',
        text: `Le planning est occupé à ${number.format(s.occupancy_rate)} %. Des actions de relance peuvent aider à remplir les créneaux.`
      });
    } else if (s.occupancy_rate >= 75) {
      rows.push({
        tone: 'good',
        title: 'Planning bien rempli',
        text: `Le taux de remplissage atteint ${number.format(s.occupancy_rate)} % sur la période.`
      });
    }

    if (s.cancellation_rate >= 12) {
      rows.push({
        tone: 'warning',
        title: 'Annulations à surveiller',
        text: `${number.format(s.cancellation_rate)} % des rendez-vous de la période ont été annulés.`
      });
    }

    if (s.no_show_rate >= 5) {
      rows.push({
        tone: 'warning',
        title: 'Absences à réduire',
        text: `${number.format(s.no_show_rate)} % des rendez-vous ont été marqués absents.`
      });
    }

    if (s.new_clients > 0) {
      rows.push({
        tone: 'good',
        title: 'Acquisition active',
        text: `${s.new_clients} nouveau${s.new_clients > 1 ? 'x' : ''} client${s.new_clients > 1 ? 's' : ''} sur cette période.`
      });
    }

    if (rows.length === 0) {
      rows.push({
        tone: 'neutral',
        title: 'Activité stable',
        text: 'Aucun signal prioritaire détecté sur cette période.'
      });
    }
    return rows.slice(0, 3);
  }, [dashboard]);

  if (!organization) return null;
  if (!beautyMode) return <div className="page"><div className="info-message page-message">Le pilotage avancé est disponible dans l’environnement Coiffure & beauté Métier.</div></div>;
  if (!canView) return <div className="page"><div className="error-message page-message" role="alert">Le pilotage est réservé aux propriétaires, administrateurs et managers.</div></div>;

  const s = dashboard?.summary;
  const changes = dashboard?.changes;
  const growthSummary = growth?.summary ?? {};
  const opportunities = growth?.opportunities ?? [];

  return <div className="page beauty-pilot-page">
    <header className="page-header beauty-pilot-header">
      <div>
        <p className="eyebrow">CROISSANCE & PILOTAGE</p>
        <h1>Vue patron</h1>
        <p>{selectedEnseigne
          ? `Suivez la performance réelle de ${selectedEnseigne.name}, sans mélanger les données des autres enseignes.`
          : 'Sélectionnez une enseigne Beauty.'}</p>
      </div>
      <div className="beauty-pilot-period" aria-label="Période d’analyse">
        {(Object.keys(periodLabels).map(Number) as PilotPeriod[]).map((value) => <button
          type="button"
          key={value}
          className={period === value ? 'active' : ''}
          onClick={() => setPeriod(value)}
          disabled={loading}
          aria-busy={loading && period === value}
        >{periodLabels[value]}</button>)}
      </div>
    </header>

    {!selectedEnseigneId && !enseigneLoading && <div className="info-message page-message">Aucune enseigne Beauty sélectionnée.</div>}
    {error && <div className="error-message page-message" role="alert">{error}</div>}

    {loading || enseigneLoading ? <div className="panel beauty-pilot-loading beauty-loading-state" aria-busy="true">Calcul des indicateurs…</div> : !dashboard || !s || !changes ? <div className="panel list-state empty-service-state">
      <div className="empty-icon"><Icon name="chart" size={28}/></div>
      <h3>Pas encore d’indicateurs à analyser</h3>
      <p>Les statistiques apparaîtront dès que l’enseigne aura des rendez-vous et des prestations terminées sur la période choisie.</p>
    </div> : <>
      <section className="beauty-pilot-kpis">
        <article className="panel beauty-pilot-kpi primary">
          <div className="beauty-pilot-kpi-head"><span>CA réalisé</span><span className="beauty-pilot-kpi-icon"><Icon name="chart" size={18}/></span></div>
          <strong>{money.format(s.revenue_cents / 100)}</strong>
          <small className={trendTone(changes.revenue_pct)}>{formatChange(changes.revenue_pct)} vs période précédente</small>
          <em>Uniquement les rendez-vous terminés</em>
        </article>

        <article className="panel beauty-pilot-kpi">
          <div className="beauty-pilot-kpi-head"><span>Rendez-vous terminés</span><span className="beauty-pilot-kpi-icon"><Icon name="calendar" size={18}/></span></div>
          <strong>{s.completed}</strong>
          <small className={trendTone(changes.completed_pct)}>{formatChange(changes.completed_pct)} vs période précédente</small>
          <em>{s.upcoming_or_active} en attente ou confirmés</em>
        </article>

        <article className="panel beauty-pilot-kpi">
          <div className="beauty-pilot-kpi-head"><span>Panier moyen</span><span className="beauty-pilot-kpi-icon"><Icon name="creditCard" size={18}/></span></div>
          <strong>{moneyPrecise.format(s.average_basket_cents / 100)}</strong>
          <small className={trendTone(changes.average_basket_pct)}>{formatChange(changes.average_basket_pct)} vs période précédente</small>
          <em>Sur les prestations terminées</em>
        </article>

        <article className="panel beauty-pilot-kpi">
          <div className="beauty-pilot-kpi-head"><span>Remplissage</span><span className="beauty-pilot-kpi-icon"><Icon name="activity" size={18}/></span></div>
          <strong>{number.format(s.occupancy_rate)} %</strong>
          <div className="beauty-pilot-progress"><span style={{ width: `${Math.min(100, Math.max(0, s.occupancy_rate))}%` }}/></div>
          <em>{Math.round(s.booked_minutes / 60)} h réservées / {Math.round(s.available_minutes / 60)} h disponibles</em>
        </article>
      </section>

      <section className="beauty-pilot-health">
        <article className="panel"><span>Nouveaux clients</span><strong>{s.new_clients}</strong><small>première réservation</small></article>
        <article className="panel"><span>Clients récurrents</span><strong>{s.returning_clients}</strong><small>déjà venus auparavant</small></article>
        <article className="panel"><span>Annulations</span><strong>{number.format(s.cancellation_rate)} %</strong><small>{s.cancelled} rendez-vous</small></article>
        <article className="panel"><span>Absents</span><strong>{number.format(s.no_show_rate)} %</strong><small>{s.no_show} rendez-vous</small></article>
      </section>

      <section className="beauty-pilot-grid">
        <article className="panel beauty-pilot-chart-card">
          <div className="panel-header">
            <div><p className="eyebrow">ÉVOLUTION</p><h2>Chiffre d’affaires réalisé</h2><small>{dashboard.period.start_date} → {dashboard.period.end_date}</small></div>
          </div>
          <div className="beauty-pilot-bars" aria-label="Évolution du chiffre d’affaires">
            {trendPoints.map((item) => {
              const height = item.revenue_cents === 0 ? 3 : Math.max(8, Math.round((item.revenue_cents / maxTrendRevenue) * 100));
              return <div key={item.date} title={`${item.date} · ${moneyPrecise.format(item.revenue_cents / 100)} · ${item.appointments} RDV`}>
                <span style={{ height: `${height}%` }}/>
              </div>;
            })}
          </div>
          <div className="beauty-pilot-chart-foot"><span>{dashboard.period.start_date}</span><span>{dashboard.period.end_date}</span></div>
        </article>

        <article className="panel beauty-pilot-insights">
          <div className="panel-header"><div><p className="eyebrow">À RETENIR</p><h2>Signaux du moment</h2></div></div>
          <div className="beauty-pilot-insight-list">
            {insights.map((item) => <div className={item.tone} key={item.title}>
              <span><Icon name={item.tone === 'good' ? 'check' : item.tone === 'warning' ? 'alert' : 'info'} size={15}/></span>
              <div><strong>{item.title}</strong><small>{item.text}</small></div>
            </div>)}
          </div>
        </article>
      </section>

      <section className="beauty-pilot-grid">
        <article className="panel beauty-pilot-ranking-card">
          <div className="panel-header"><div><p className="eyebrow">ACQUISITION</p><h2>Provenance des rendez-vous</h2><small>Canal utilisé au moment de la réservation</small></div></div>
          {(dashboard.sources ?? []).length === 0 ? <div className="list-state">Aucune provenance à analyser.</div> : <div className="beauty-pilot-source-list">
            {dashboard.sources.map((item) => {
              const width = Math.max(4, Math.round((item.appointments / maxSourceAppointments) * 100));
              const share = s.appointments_total > 0 ? Math.round((item.appointments / Math.max(1, dashboard.sources.reduce((sum, row) => sum + row.appointments, 0))) * 100) : 0;
              return <div key={item.origin}>
                <div><strong>{originLabels[item.origin] || item.origin}</strong><span>{item.appointments} RDV · {share} %</span></div>
                <div className="beauty-pilot-source-bar"><span style={{ width: `${width}%` }}/></div>
                <small>{moneyPrecise.format(item.revenue_cents / 100)} réalisé</small>
              </div>;
            })}
          </div>}
          <p className="beauty-pilot-track-note"><Icon name="info" size={13}/> Les QR, widgets et liens générés depuis NCR Suite sont maintenant suivis séparément.</p>
        </article>

        <article className="panel beauty-pilot-demand-card">
          <div className="panel-header"><div><p className="eyebrow">MOMENTS FORTS</p><h2>Quand vos clients réservent</h2></div></div>
          <div className="beauty-pilot-demand-section">
            <small>Heures les plus demandées</small>
            <div className="beauty-pilot-hour-list">{dashboard.peak_hours.slice(0, 8).map((item) => <div key={item.hour}>
              <span>{String(item.hour).padStart(2, '0')}h</span>
              <i><b style={{ width: `${Math.max(5, Math.round((item.appointments / maxHourAppointments) * 100))}%` }}/></i>
              <strong>{item.appointments}</strong>
            </div>)}</div>
          </div>
          <div className="beauty-pilot-demand-section">
            <small>Jours les plus chargés</small>
            <div className="beauty-pilot-weekday-list">{dashboard.weekdays.map((item) => <div key={item.weekday}>
              <span>{weekdayLabels[item.weekday] || item.weekday}</span>
              <i><b style={{ width: `${Math.max(5, Math.round((item.appointments / maxWeekdayAppointments) * 100))}%` }}/></i>
              <strong>{item.appointments}</strong>
            </div>)}</div>
          </div>
        </article>
      </section>

      <section className="beauty-pilot-grid">
        <article className="panel beauty-pilot-ranking-card">
          <div className="panel-header"><div><p className="eyebrow">PRESTATIONS</p><h2>Top prestations</h2><small>Classées par CA réalisé</small></div><Link className="secondary-button compact-button" to="/prestations">Catalogue</Link></div>
          {(dashboard.top_services ?? []).length === 0 ? <div className="list-state">Aucune prestation terminée sur la période.</div> : <div className="beauty-pilot-rank-list">
            {dashboard.top_services.map((item, index) => <div key={item.service_id}>
              <span className="beauty-pilot-rank-number">{index + 1}</span>
              <div><strong>{item.service_name}</strong><small>{item.appointments} RDV · {item.completed} terminé{item.completed > 1 ? 's' : ''}</small><i><b style={{ width: `${Math.max(3, Math.round((item.revenue_cents / maxServiceRevenue) * 100))}%` }}/></i></div>
              <em>{moneyPrecise.format(item.revenue_cents / 100)}</em>
            </div>)}
          </div>}
        </article>

        <article className="panel beauty-pilot-ranking-card">
          <div className="panel-header"><div><p className="eyebrow">ÉQUIPE</p><h2>Performance collaborateurs</h2><small>CA et rendez-vous réalisés</small></div><Link className="secondary-button compact-button" to="/equipe">Équipe</Link></div>
          {(dashboard.top_staff ?? []).length === 0 ? <div className="list-state">Aucune donnée collaborateur sur la période.</div> : <div className="beauty-pilot-rank-list">
            {dashboard.top_staff.map((item, index) => <div key={item.id}>
              <span className="beauty-pilot-rank-number">{index + 1}</span>
              <div><strong>{item.name}</strong><small>{item.appointments} RDV · {item.completed} terminé{item.completed > 1 ? 's' : ''}</small><i><b style={{ width: `${Math.max(3, Math.round((item.revenue_cents / maxStaffRevenue) * 100))}%` }}/></i></div>
              <em>{moneyPrecise.format(item.revenue_cents / 100)}</em>
            </div>)}
          </div>}
        </article>
      </section>

      <section className="panel beauty-pilot-growth">
        <div className="panel-header">
          <div><p className="eyebrow">CROISSANCE CLIENT</p><h2>Opportunités à exploiter</h2><small>Relances, avis, anniversaires et parrainage déjà détectés par NCR Suite.</small></div>
          <Link className="secondary-button compact-button" to="/crm">CRM & segments</Link>
        </div>
        <div className="beauty-pilot-growth-kpis">
          <div><span>À replanifier</span><strong>{growthSummary.rebook_due ?? 0}</strong></div>
          <div><span>Clients inactifs</span><strong>{growthSummary.inactive ?? 0}</strong></div>
          <div><span>Anniversaires</span><strong>{growthSummary.birthday ?? 0}</strong></div>
          <div><span>Avis à solliciter</span><strong>{growthSummary.review_opportunities ?? 0}</strong></div>
          <div><span>Parrainages validés</span><strong>{growthSummary.qualified_referrals ?? 0}</strong></div>
        </div>

        {opportunities.length > 0 && <div className="beauty-pilot-opportunity-list">
          {opportunities.slice(0, 6).map((item) => <article key={item.client_id}>
            <span><Icon name="users" size={16}/></span>
            <div><strong>{fullName(item.first_name, item.last_name)}</strong><small>{opportunityLabel(item.reason)}{item.last_service_name ? ` · ${item.last_service_name}` : ''}</small></div>
            <em>Score {item.score}</em>
          </article>)}
        </div>}
      </section>
    </>}
  </div>;
}
