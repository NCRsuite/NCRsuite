import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { formatCleaningDateTime, formatCleaningMoney, nullableCleaningText, type CleaningAgentRecord, type CleaningInterventionRecord, type CleaningProtocolRecord, type CleaningSiteRecord } from '../features/cleaning/types';
import { supabase } from '../lib/supabase';

function toLocalInput(date: Date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

const defaultStart = () => { const date = new Date(); date.setHours(date.getHours() + 1, 0, 0, 0); return toLocalInput(date); };
const defaultEnd = () => { const date = new Date(); date.setHours(date.getHours() + 3, 0, 0, 0); return toLocalInput(date); };

export function CleaningPlanningPage() {
  const { organization } = useOrganization(); const { user, demoMode } = useAuth();
  const [rows, setRows] = useState<CleaningInterventionRecord[]>([]); const [sites, setSites] = useState<CleaningSiteRecord[]>([]); const [agents, setAgents] = useState<CleaningAgentRecord[]>([]); const [protocols, setProtocols] = useState<CleaningProtocolRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false); const [form, setForm] = useState({ siteId: '', agentId: '', protocolId: '', title: 'Entretien régulier', startsAt: defaultStart(), endsAt: defaultEnd(), breakMinutes: '0', notes: '' });
  const [range, setRange] = useState<'week' | 'month'>('week'); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');

  async function load() {
    if (!organization) return; setLoading(true); setError('');
    if (demoMode || !supabase) {
      setRows(JSON.parse(localStorage.getItem(`ncr-cleaning-interventions-${organization.id}`) || '[]') as CleaningInterventionRecord[]);
      setSites(JSON.parse(localStorage.getItem(`ncr-cleaning-sites-${organization.id}`) || '[]') as CleaningSiteRecord[]);
      setAgents(JSON.parse(localStorage.getItem(`ncr-cleaning-agents-${organization.id}`) || '[]') as CleaningAgentRecord[]);
      setProtocols(JSON.parse(localStorage.getItem(`ncr-cleaning-protocols-${organization.id}`) || '[]') as CleaningProtocolRecord[]);
      setLoading(false); return;
    }
    const now = new Date(); const from = new Date(now); from.setDate(from.getDate() - 7); const to = new Date(now); to.setDate(to.getDate() + 45);
    const [interventionResult, siteResult, agentResult, protocolResult] = await Promise.all([
      supabase.from('cleaning_interventions').select('*,cleaning_sites(name,address,city,instructions,cleaning_clients(company_name)),cleaning_agents(first_name,last_name)').eq('organization_id', organization.id).gte('starts_at', from.toISOString()).lte('starts_at', to.toISOString()).order('starts_at'),
      supabase.from('cleaning_sites').select('*,cleaning_clients(company_name)').eq('organization_id', organization.id).eq('status', 'active').order('name'),
      supabase.from('cleaning_agents').select('*').eq('organization_id', organization.id).eq('status', 'active').order('last_name'),
      supabase.from('cleaning_protocols').select('*,cleaning_sites(name,cleaning_clients(company_name)),cleaning_protocol_tasks(*)').eq('organization_id', organization.id).eq('status', 'active').order('name')
    ]);
    const firstError = interventionResult.error || siteResult.error || agentResult.error || protocolResult.error; if (firstError) setError(firstError.message); else { setRows((interventionResult.data ?? []) as CleaningInterventionRecord[]); setSites((siteResult.data ?? []) as CleaningSiteRecord[]); setAgents((agentResult.data ?? []) as CleaningAgentRecord[]); setProtocols((protocolResult.data ?? []) as CleaningProtocolRecord[]); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id, demoMode]);

  const visibleRows = useMemo(() => {
    const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (range === 'week' ? 2 : 7)); const end = new Date(start); end.setDate(end.getDate() + (range === 'week' ? 10 : 40));
    return rows.filter((row) => new Date(row.starts_at) >= start && new Date(row.starts_at) <= end);
  }, [rows, range]);

  async function createIntervention(event: FormEvent) {
    event.preventDefault(); if (!organization || !user || !form.siteId || !form.agentId) return; setSaving(true); setError(''); setSuccess('');
    const site = sites.find((item) => item.id === form.siteId); const start = new Date(form.startsAt); const end = new Date(form.endsAt); const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000) - Number(form.breakMinutes || 0));
    const plannedPrice = site?.billing_mode === 'flat' ? site.service_rate_cents : Math.round((durationMinutes / 60) * (site?.service_rate_cents ?? 0));
    const payload = { organization_id: organization.id, site_id: form.siteId, agent_id: form.agentId, protocol_id: form.protocolId || null, title: form.title.trim() || 'Intervention de nettoyage', starts_at: start.toISOString(), ends_at: end.toISOString(), break_minutes: Math.max(0, Number(form.breakMinutes) || 0), planned_price_cents: plannedPrice, notes: nullableCleaningText(form.notes), created_by: user.id };
    try {
      let created: CleaningInterventionRecord;
      if (demoMode || !supabase) {
        const agent = agents.find((item) => item.id === form.agentId); created = { id: crypto.randomUUID(), ...payload, status: 'planned', actual_started_at: null, actual_ended_at: null, report_text: null, before_photo_url: null, after_photo_url: null, agent_signature: null, client_signature: null, created_at: new Date().toISOString(), cleaning_sites: site ? { name: site.name, address: site.address, city: site.city, instructions: site.instructions, cleaning_clients: site.cleaning_clients } : null, cleaning_agents: agent ? { first_name: agent.first_name, last_name: agent.last_name } : null } as CleaningInterventionRecord;
        localStorage.setItem(`ncr-cleaning-interventions-${organization.id}`, JSON.stringify([...rows, created]));
      } else {
        const { data, error: insertError } = await supabase.from('cleaning_interventions').insert(payload).select('*,cleaning_sites(name,address,city,instructions,cleaning_clients(company_name)),cleaning_agents(first_name,last_name)').single(); if (insertError) throw insertError; created = data as CleaningInterventionRecord;
      }
      setRows((current) => [...current, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at))); setForm({ siteId: '', agentId: '', protocolId: '', title: 'Entretien régulier', startsAt: defaultStart(), endsAt: defaultEnd(), breakMinutes: '0', notes: '' }); setFormOpen(false); setSuccess('L’intervention a été planifiée.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Planification impossible.'); } finally { setSaving(false); }
  }

  async function cancel(row: CleaningInterventionRecord) {
    if (!organization || !window.confirm('Annuler cette intervention ?')) return;
    try { if (demoMode || !supabase) { const next = rows.map((item) => item.id === row.id ? { ...item, status: 'canceled' as const } : item); localStorage.setItem(`ncr-cleaning-interventions-${organization.id}`, JSON.stringify(next)); setRows(next); } else { const { error: updateError } = await supabase.from('cleaning_interventions').update({ status: 'canceled' }).eq('organization_id', organization.id).eq('id', row.id); if (updateError) throw updateError; setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: 'canceled' } : item)); } setSuccess('L’intervention a été annulée.'); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Annulation impossible.'); }
  }

  if (!organization) return null;
  return <div className="page cleaning-page"><header className="page-header"><div><p className="eyebrow">NETTOYAGE</p><h1>Planning des interventions</h1><p>Affecte les agents, contrôle les chevauchements et prépare la facturation.</p></div><button className="primary-button" disabled={!sites.length || !agents.length} onClick={() => setFormOpen(true)}><Icon name="plus" size={18}/>Planifier</button></header>
    {(!sites.length || !agents.length) && <div className="info-message page-message">Il faut au moins un site actif et un agent actif pour planifier.</div>}
    {formOpen && <section className="panel cleaning-form-panel"><div className="panel-header"><div><p className="eyebrow">NOUVELLE INTERVENTION</p><h2>Planifier un passage</h2></div><button className="secondary-button compact-button" onClick={() => setFormOpen(false)}>Fermer</button></div><form className="cleaning-form-grid" onSubmit={createIntervention}>
      <label>Site *<select required value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value, protocolId: '' })}><option value="">Sélectionner</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.cleaning_clients?.company_name}</option>)}</select></label><label>Agent *<select required value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}><option value="">Sélectionner</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.first_name} {agent.last_name}</option>)}</select></label><label>Protocole<select value={form.protocolId} onChange={(e) => setForm({ ...form, protocolId: e.target.value })}><option value="">Sans protocole</option>{protocols.filter((protocol) => protocol.site_id === form.siteId).map((protocol) => <option key={protocol.id} value={protocol.id}>{protocol.name}</option>)}</select></label>
      <label className="full-field">Intitulé<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/></label><label>Début<input type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}/></label><label>Fin<input type="datetime-local" required value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })}/></label><label>Pause (minutes)<input type="number" min="0" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })}/></label><label className="full-field">Notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label><div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Planification…' : 'Planifier'}</button></div>
    </form></section>}
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
    <section className="panel cleaning-list-panel"><div className="cleaning-toolbar"><div><p className="eyebrow">CALENDRIER</p><h2>{visibleRows.length} intervention{visibleRows.length > 1 ? 's' : ''}</h2></div><div className="cleaning-segmented"><button className={range === 'week' ? 'active' : ''} onClick={() => setRange('week')}>Semaine</button><button className={range === 'month' ? 'active' : ''} onClick={() => setRange('month')}>Mois</button></div></div>
      {loading ? <div className="cleaning-empty">Chargement…</div> : visibleRows.length === 0 ? <div className="cleaning-empty"><Icon name="calendar" size={30}/><strong>Aucune intervention</strong><span>Planifie les prochains passages.</span></div> : <div className="cleaning-schedule-list">{visibleRows.map((row) => <article key={row.id} className={`cleaning-schedule-card ${row.status}`}><div className="cleaning-schedule-date"><strong>{new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit' }).format(new Date(row.starts_at))}</strong><span>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(row.starts_at))}</span></div><div className="cleaning-record-main"><strong>{row.title}</strong><span>{row.cleaning_sites?.name} · {row.cleaning_agents?.first_name} {row.cleaning_agents?.last_name}</span><small>{formatCleaningDateTime(row.starts_at)} → {new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date(row.ends_at))} · {formatCleaningMoney(row.planned_price_cents)}</small></div><span className={`cleaning-status-pill ${row.status}`}>{row.status === 'planned' ? 'Planifiée' : row.status === 'in_progress' ? 'En cours' : row.status === 'completed' ? 'Terminée' : 'Annulée'}</span>{row.status === 'planned' && <button className="secondary-button compact-button" onClick={() => void cancel(row)}>Annuler</button>}</article>)}</div>}
    </section>
  </div>;
}
