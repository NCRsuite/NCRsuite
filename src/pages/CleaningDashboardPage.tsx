import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { StatCard } from '../components/StatCard';
import { organizationHasFeature } from '../config/planEntitlements';
import { useOrganization } from '../contexts/OrganizationContext';
import { formatCleaningDateTime, formatCleaningMoney, type CleaningAnomalyRecord, type CleaningInterventionRecord, type CleaningStockItemRecord } from '../features/cleaning/types';
import { supabase } from '../lib/supabase';

export function CleaningDashboardPage() {
  const { organization } = useOrganization();
  const [interventions, setInterventions] = useState<CleaningInterventionRecord[]>([]);
  const [anomalies, setAnomalies] = useState<CleaningAnomalyRecord[]>([]);
  const [stock, setStock] = useState<CleaningStockItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!organization || !supabase) { setLoading(false); return; }
    const client = supabase;
    const currentOrganization = organization;
    const organizationId = organization.id;
    let active = true;
    async function load() {
      setLoading(true); const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 8);
      const requests = [client.from('cleaning_interventions').select('*,cleaning_sites(name,address,city,instructions,cleaning_clients(company_name)),cleaning_agents(first_name,last_name)').eq('organization_id', organizationId).gte('starts_at', start.toISOString()).lt('starts_at', end.toISOString()).order('starts_at')];
      const [interventionResult] = await Promise.all(requests);
      if (!active) return;
      if (interventionResult.error) setError(interventionResult.error.message); else setInterventions((interventionResult.data ?? []) as CleaningInterventionRecord[]);
      if (organizationHasFeature(currentOrganization, 'cleaning_anomalies')) {
        const { data } = await client.from('cleaning_anomalies').select('*,cleaning_sites(name),cleaning_agents(first_name,last_name)').eq('organization_id', organizationId).in('status', ['open', 'in_progress']).order('created_at', { ascending: false }).limit(10);
        if (active) setAnomalies((data ?? []) as CleaningAnomalyRecord[]);
      }
      if (organizationHasFeature(currentOrganization, 'cleaning_stock')) {
        const { data } = await client.from('cleaning_stock_items').select('*').eq('organization_id', organizationId).eq('status', 'active').order('quantity').limit(20);
        if (active) setStock((data ?? []) as CleaningStockItemRecord[]);
      }
      if (active) setLoading(false);
    }
    void load(); return () => { active = false; };
  }, [organization?.id, organization?.plan]);

  if (!organization) return null;
  const todayKey = new Date().toISOString().slice(0, 10);
  const today = interventions.filter((row) => row.starts_at.slice(0, 10) === todayKey);
  const inProgress = today.filter((row) => row.status === 'in_progress');
  const completed = today.filter((row) => row.status === 'completed');
  const plannedRevenue = today.filter((row) => row.status !== 'canceled').reduce((total, row) => total + row.planned_price_cents, 0);
  const lowStock = stock.filter((row) => row.quantity <= row.minimum_quantity);
  const priorities = useMemo(() => {
    const now = Date.now();
    return interventions.filter((row) => row.status === 'planned' && new Date(row.starts_at).getTime() < now - 15 * 60000).slice(0, 5);
  }, [interventions]);

  return <div className="page cleaning-page cleaning-dashboard-page"><header className="page-header"><div><p className="eyebrow">NETTOYAGE</p><h1>Pilotage de l’exploitation</h1><p>Interventions, équipes, qualité et facturation en un seul regard.</p></div><div className="header-actions"><Link className="primary-button" to="/planning"><Icon name="calendar" size={18}/>Planifier une intervention</Link></div></header>
    {error && <div className="error-message page-message">{error}</div>}
    <section className="stats-grid"><StatCard label="Interventions aujourd’hui" value={loading ? '…' : String(today.length)} detail={`${inProgress.length} en cours`} icon="clipboard"/><StatCard label="Agents sur le terrain" value={loading ? '…' : String(new Set(inProgress.map((row) => row.agent_id)).size)} detail={`${completed.length} passages terminés`} icon="users"/><StatCard label="Avancement" value={today.length ? `${Math.round((completed.length / today.length) * 100)} %` : '0 %'} detail="des interventions du jour" icon="chart"/><StatCard label="Prévision HT du jour" value={formatCleaningMoney(plannedRevenue)} detail="selon le planning" icon="creditCard"/></section>
    <section className="cleaning-dashboard-grid"><article className="panel cleaning-dashboard-main"><div className="panel-header"><div><p className="eyebrow">AUJOURD’HUI</p><h2>Interventions opérationnelles</h2></div><Link className="secondary-button compact-button" to="/interventions">Tout voir</Link></div>{today.length === 0 ? <div className="cleaning-empty"><Icon name="calendar" size={30}/><strong>Planning libre aujourd’hui</strong></div> : <div className="cleaning-card-list">{today.slice(0, 8).map((row) => <article className="cleaning-record-card" key={row.id}><span className="cleaning-record-icon"><Icon name="sparkles" size={20}/></span><div className="cleaning-record-main"><strong>{row.cleaning_sites?.name}</strong><span>{row.cleaning_agents?.first_name} {row.cleaning_agents?.last_name} · {row.title}</span><small>{formatCleaningDateTime(row.starts_at)} · {formatCleaningMoney(row.planned_price_cents)}</small></div><span className={`cleaning-status-pill ${row.status}`}>{row.status === 'planned' ? 'Planifiée' : row.status === 'in_progress' ? 'En cours' : row.status === 'completed' ? 'Terminée' : 'Annulée'}</span></article>)}</div>}</article>
      <article className="panel"><div className="panel-header"><div><p className="eyebrow">À TRAITER</p><h2>Priorités QG</h2></div></div><div className="cleaning-priority-list"><Link to="/interventions"><span className="task-dot urgent"/><div><strong>Pointages en retard</strong><small>Interventions commencées sans arrivée</small></div><b>{priorities.length}</b></Link>{organizationHasFeature(organization, 'cleaning_anomalies') ? <Link to="/anomalies"><span className="task-dot"/><div><strong>Anomalies ouvertes</strong><small>Actions correctives à suivre</small></div><b>{anomalies.length}</b></Link> : <Link to="/abonnement"><span className="task-dot"/><div><strong>Anomalies terrain</strong><small>Disponible en Professionnelle</small></div><Icon name="lock" size={16}/></Link>}{organizationHasFeature(organization, 'cleaning_stock') ? <Link to="/stocks"><span className="task-dot success"/><div><strong>Stocks sous seuil</strong><small>Produits à réapprovisionner</small></div><b>{lowStock.length}</b></Link> : <Link to="/abonnement"><span className="task-dot success"/><div><strong>Stocks et consommables</strong><small>Disponible en Professionnelle</small></div><Icon name="lock" size={16}/></Link>}</div></article>
    </section>
    {organizationHasFeature(organization, 'cleaning_statistics') ? <section className="panel cleaning-kpi-panel"><div className="panel-header"><div><p className="eyebrow">PERFORMANCE</p><h2>Indicateurs de la semaine</h2></div></div><div className="cleaning-kpi-grid"><div><span>Ponctualité</span><strong>{today.length ? `${Math.max(0, 100 - priorities.length * 10)} %` : '—'}</strong></div><div><span>Conformité des passages</span><strong>{today.length ? `${Math.round((completed.filter((row) => row.report_text).length / Math.max(completed.length, 1)) * 100)} %` : '—'}</strong></div><div><span>Anomalies actives</span><strong>{anomalies.length}</strong></div><div><span>Produits sous seuil</span><strong>{lowStock.length}</strong></div></div></section> : <section className="panel cleaning-premium-teaser"><Icon name="lock" size={24}/><div><p className="eyebrow">OFFRE PROFESSIONNELLE</p><h2>Statistiques opérationnelles</h2><p>Suivez ponctualité, qualité, conformité, anomalies et consommations.</p></div><Link className="secondary-button" to="/abonnement">Voir l’offre</Link></section>}
  </div>;
}
