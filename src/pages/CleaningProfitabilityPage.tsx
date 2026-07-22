import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatCleaningDateTime,
  formatCleaningMoney,
  type CleaningAgentCostRecord,
  type CleaningAgentRecord,
  type CleaningInterventionRecord,
  type CleaningProfitabilityRow
} from '../features/cleaning/types';
import { supabase } from '../lib/supabase';
import { readJsonStorage } from '../lib/safeStorage';

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return { start: local(start), end: local(end) };
}

export function CleaningProfitabilityPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const initial = monthBounds();
  const [periodStart, setPeriodStart] = useState(initial.start);
  const [periodEnd, setPeriodEnd] = useState(initial.end);
  const [rows, setRows] = useState<CleaningProfitabilityRow[]>([]);
  const [agents, setAgents] = useState<CleaningAgentRecord[]>([]);
  const [costs, setCosts] = useState<CleaningAgentCostRecord[]>([]);
  const [interventions, setInterventions] = useState<CleaningInterventionRecord[]>([]);
  const [costDrafts, setCostDrafts] = useState<Record<string, string>>({});
  const [consumableDrafts, setConsumableDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!organization) return;
    setLoading(true); setError('');
    if (demoMode || !supabase) {
      setRows([]);
      setAgents(readJsonStorage<CleaningAgentRecord[]>(`ncr-cleaning-agents-${organization.id}`, []));
      setInterventions(readJsonStorage<CleaningInterventionRecord[]>(`ncr-cleaning-interventions-${organization.id}`, []));
      setLoading(false); return;
    }
    const from = new Date(`${periodStart}T00:00:00`).toISOString();
    const endDate = new Date(`${periodEnd}T00:00:00`); endDate.setDate(endDate.getDate() + 1);
    const [summaryResult, agentResult, costResult, interventionResult] = await Promise.all([
      supabase.rpc('cleaning_profitability_summary', { p_organization_id: organization.id, p_period_start: periodStart, p_period_end: periodEnd }),
      supabase.from('cleaning_agents').select('*').eq('organization_id', organization.id).eq('status', 'active').order('last_name'),
      supabase.from('cleaning_agent_costs').select('*').eq('organization_id', organization.id),
      supabase.from('cleaning_interventions').select('*,cleaning_sites(name,address,city,instructions,cleaning_clients(company_name)),cleaning_agents(first_name,last_name)').eq('organization_id', organization.id).neq('status', 'canceled').gte('starts_at', from).lt('starts_at', endDate.toISOString()).order('starts_at', { ascending: false }).limit(120)
    ]);
    const firstError = summaryResult.error || agentResult.error || costResult.error || interventionResult.error;
    if (firstError) setError(firstError.message);
    else {
      const normalized = ((summaryResult.data ?? []) as CleaningProfitabilityRow[]).map((row) => ({ ...row, margin_rate: row.margin_rate == null ? null : Number(row.margin_rate) }));
      const loadedCosts = (costResult.data ?? []) as CleaningAgentCostRecord[];
      const loadedInterventions = (interventionResult.data ?? []) as CleaningInterventionRecord[];
      setRows(normalized); setAgents((agentResult.data ?? []) as CleaningAgentRecord[]); setCosts(loadedCosts); setInterventions(loadedInterventions);
      setCostDrafts(Object.fromEntries(((agentResult.data ?? []) as CleaningAgentRecord[]).map((agent) => [agent.id, String(((loadedCosts.find((cost) => cost.agent_id === agent.id)?.hourly_cost_cents ?? 0) / 100).toFixed(2))])));
      setConsumableDrafts(Object.fromEntries(loadedInterventions.map((intervention) => [intervention.id, String(((intervention.consumable_cost_cents ?? 0) / 100).toFixed(2))])));
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id, periodStart, periodEnd, demoMode]);

  const totals = useMemo(() => rows.reduce((acc, row) => ({ revenue: acc.revenue + Number(row.planned_revenue_cents || 0), labor: acc.labor + Number(row.labor_cost_cents || 0), consumables: acc.consumables + Number(row.consumable_cost_cents || 0), margin: acc.margin + Number(row.margin_cents || 0) }), { revenue: 0, labor: 0, consumables: 0, margin: 0 }), [rows]);
  const totalMarginRate = totals.revenue > 0 ? Math.round((totals.margin / totals.revenue) * 1000) / 10 : 0;

  async function saveAgentCost(agentId: string) {
    if (!organization || !supabase) return;
    setBusy(`agent-${agentId}`); setError(''); setSuccess('');
    try {
      const cents = Math.max(0, Math.round((Number(costDrafts[agentId]) || 0) * 100));
      const { error: rpcError } = await supabase.rpc('set_cleaning_agent_cost', { p_organization_id: organization.id, p_agent_id: agentId, p_hourly_cost_cents: cents }); if (rpcError) throw rpcError;
      setSuccess('Le coût horaire confidentiel a été enregistré.'); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.'); } finally { setBusy(''); }
  }

  async function saveConsumableCost(interventionId: string) {
    if (!organization || !supabase) return;
    setBusy(`intervention-${interventionId}`); setError(''); setSuccess('');
    try {
      const cents = Math.max(0, Math.round((Number(consumableDrafts[interventionId]) || 0) * 100));
      const { error: updateError } = await supabase.from('cleaning_interventions').update({ consumable_cost_cents: cents }).eq('organization_id', organization.id).eq('id', interventionId); if (updateError) throw updateError;
      setSuccess('Le coût des produits a été intégré à la marge du chantier.'); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.'); } finally { setBusy(''); }
  }

  if (!organization) return null;
  return <div className="page cleaning-page cleaning-profitability-page">
    <header className="page-header"><div><p className="eyebrow">OFFRE PROFESSIONNELLE</p><h1>Rentabilité par chantier</h1><p>Compare le chiffre prévu aux coûts de main-d’œuvre et de consommables pour repérer les contrats fragiles.</p></div></header>
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
    <section className="panel cleaning-period-panel"><div><p className="eyebrow">PÉRIODE ANALYSÉE</p><h2>Du {new Intl.DateTimeFormat('fr-FR').format(new Date(`${periodStart}T12:00:00`))} au {new Intl.DateTimeFormat('fr-FR').format(new Date(`${periodEnd}T12:00:00`))}</h2></div><div className="cleaning-period-fields"><label>Début<input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)}/></label><label>Fin<input type="date" value={periodEnd} min={periodStart} onChange={(event) => setPeriodEnd(event.target.value)}/></label></div></section>
    <section className="stats-grid"><StatCard label="Chiffre prévisionnel" value={loading ? '…' : formatCleaningMoney(totals.revenue)} detail="interventions non annulées" icon="creditCard"/><StatCard label="Coût main-d’œuvre" value={loading ? '…' : formatCleaningMoney(totals.labor)} detail="selon le coût horaire renseigné" icon="users"/><StatCard label="Produits consommés" value={loading ? '…' : formatCleaningMoney(totals.consumables)} detail="saisi par intervention" icon="briefcase"/><StatCard label="Marge estimée" value={loading ? '…' : formatCleaningMoney(totals.margin)} detail={`${totalMarginRate.toLocaleString('fr-FR')} % du chiffre`} icon="chart"/></section>

    <section className="cleaning-profitability-layout"><article className="panel"><div className="panel-header"><div><p className="eyebrow">CHANTIERS</p><h2>Marge par site</h2></div></div>{loading ? <div className="cleaning-empty">Calcul en cours…</div> : rows.length === 0 ? <div className="cleaning-empty"><Icon name="chart" size={34}/><strong>Aucune donnée sur cette période</strong><span>Planifie des interventions et renseigne les coûts horaires.</span></div> : <div className="cleaning-margin-list">{rows.map((row) => <article key={row.site_id} className={`cleaning-margin-card ${Number(row.margin_cents) < 0 ? 'negative' : Number(row.margin_rate ?? 0) < 15 ? 'warning' : 'healthy'}`}><div className="cleaning-margin-card-head"><div><strong>{row.site_name}</strong><span>{row.client_name} · {row.intervention_count} intervention(s)</span></div><div><strong>{formatCleaningMoney(Number(row.margin_cents))}</strong><span>{row.margin_rate == null ? '—' : `${Number(row.margin_rate).toLocaleString('fr-FR')} %`} de marge</span></div></div><div className="cleaning-margin-breakdown"><span><small>Chiffre</small><b>{formatCleaningMoney(Number(row.planned_revenue_cents))}</b></span><span><small>Main-d’œuvre</small><b>{formatCleaningMoney(Number(row.labor_cost_cents))}</b></span><span><small>Produits</small><b>{formatCleaningMoney(Number(row.consumable_cost_cents))}</b></span><span><small>Temps prévu / réel</small><b>{Math.round(Number(row.planned_minutes) / 60 * 10) / 10} h / {Math.round(Number(row.actual_minutes) / 60 * 10) / 10} h</b></span></div></article>)}</div>}</article>

      <aside className="panel"><div className="panel-header"><div><p className="eyebrow">COÛTS CONFIDENTIELS</p><h2>Coût horaire des agents</h2></div></div><p className="cleaning-panel-intro">Renseigne le coût employeur moyen par heure. Cette information n’est jamais visible dans l’espace agent.</p><div className="cleaning-cost-list">{agents.map((agent) => <div className="cleaning-cost-row" key={agent.id}><div><strong>{agent.first_name} {agent.last_name}</strong><span>{agent.contract_type.toUpperCase()} · {agent.weekly_hours} h/semaine</span></div><label><input type="number" min="0" step="0.01" value={costDrafts[agent.id] ?? '0.00'} onChange={(event) => setCostDrafts((current) => ({ ...current, [agent.id]: event.target.value }))}/><span>€ / h</span></label><button className="secondary-button compact-button" disabled={busy === `agent-${agent.id}`} onClick={() => void saveAgentCost(agent.id)}>{busy === `agent-${agent.id}` ? '…' : 'Enregistrer'}</button></div>)}</div></aside>
    </section>

    <section className="panel cleaning-consumables-panel"><div className="panel-header"><div><p className="eyebrow">CONSOMMABLES</p><h2>Coûts par intervention</h2></div></div><p className="cleaning-panel-intro">Ajoute le coût réel des produits, sacs, consommables ou petit matériel utilisés sur chaque passage.</p>{interventions.length === 0 ? <div className="cleaning-empty">Aucune intervention sur la période.</div> : <div className="cleaning-consumable-list">{interventions.map((intervention) => <article key={intervention.id}><div><strong>{intervention.cleaning_sites?.name}</strong><span>{intervention.cleaning_agents?.first_name} {intervention.cleaning_agents?.last_name} · {formatCleaningDateTime(intervention.starts_at)}</span><small>{formatCleaningMoney(intervention.planned_price_cents)} prévu · {intervention.status === 'completed' ? 'Terminée' : intervention.status === 'in_progress' ? 'En cours' : 'Planifiée'}</small></div><label><input type="number" min="0" step="0.01" value={consumableDrafts[intervention.id] ?? '0.00'} onChange={(event) => setConsumableDrafts((current) => ({ ...current, [intervention.id]: event.target.value }))}/><span>€</span></label><button className="secondary-button compact-button" disabled={busy === `intervention-${intervention.id}`} onClick={() => void saveConsumableCost(intervention.id)}>{busy === `intervention-${intervention.id}` ? '…' : 'Ajouter au coût'}</button></article>)}</div>}</section>
  </div>;
}
