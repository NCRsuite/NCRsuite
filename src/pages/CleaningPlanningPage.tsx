import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { formatCleaningMoney, nullableCleaningText, type CleaningAgentRecord, type CleaningInterventionRecord, type CleaningProtocolRecord, type CleaningSiteRecord } from '../features/cleaning/types';
import { supabase } from '../lib/supabase';

type PlanningView = 'week' | 'month' | 'day';

function toLocalInput(date: Date) { const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return shifted.toISOString().slice(0, 16); }
const defaultStart = () => { const date = new Date(); date.setHours(date.getHours() + 1, 0, 0, 0); return toLocalInput(date); };
const defaultEnd = () => { const date = new Date(); date.setHours(date.getHours() + 3, 0, 0, 0); return toLocalInput(date); };
function startOfDay(date: Date) { const copy = new Date(date); copy.setHours(0, 0, 0, 0); return copy; }
function startOfWeek(date: Date) { const copy = startOfDay(date); copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); return copy; }
function addDays(date: Date, count: number) { const copy = new Date(date); copy.setDate(copy.getDate() + count); return copy; }
function sameDay(value: string | Date, date: Date) { const source = new Date(value); return source.getFullYear() === date.getFullYear() && source.getMonth() === date.getMonth() && source.getDate() === date.getDate(); }
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function time(value: string) { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function durationMinutes(row: CleaningInterventionRecord) { return Math.max(0, Math.round((new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000) - Number(row.break_minutes || 0)); }
function statusLabel(status: CleaningInterventionRecord['status']) { return status === 'planned' ? 'Planifiée' : status === 'in_progress' ? 'En cours' : status === 'completed' ? 'Terminée' : 'Annulée'; }
function agentName(agent?: Pick<CleaningAgentRecord, 'first_name' | 'last_name'> | null) { return agent ? `${agent.first_name} ${agent.last_name}`.trim() : 'Agent'; }
const sitePalette = ['#2f9e74', '#3978d4', '#8b5cf6', '#d97706', '#d14f62', '#0f8a96', '#6b7280'];
function siteColor(siteId: string) { let hash = 0; for (let index = 0; index < siteId.length; index += 1) hash = ((hash << 5) - hash + siteId.charCodeAt(index)) | 0; return sitePalette[Math.abs(hash) % sitePalette.length]; }

export function CleaningPlanningPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [rows, setRows] = useState<CleaningInterventionRecord[]>([]);
  const [sites, setSites] = useState<CleaningSiteRecord[]>([]);
  const [agents, setAgents] = useState<CleaningAgentRecord[]>([]);
  const [protocols, setProtocols] = useState<CleaningProtocolRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ siteId: '', agentId: '', protocolId: '', title: 'Entretien régulier', startsAt: defaultStart(), endsAt: defaultEnd(), breakMinutes: '0', notes: '' });
  const [view, setView] = useState<PlanningView>('week');
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [agentFilter, setAgentFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!organization) return;
    setLoading(true); setError('');
    if (demoMode || !supabase) {
      setRows(JSON.parse(localStorage.getItem(`ncr-cleaning-interventions-${organization.id}`) || '[]') as CleaningInterventionRecord[]);
      setSites(JSON.parse(localStorage.getItem(`ncr-cleaning-sites-${organization.id}`) || '[]') as CleaningSiteRecord[]);
      setAgents(JSON.parse(localStorage.getItem(`ncr-cleaning-agents-${organization.id}`) || '[]') as CleaningAgentRecord[]);
      setProtocols(JSON.parse(localStorage.getItem(`ncr-cleaning-protocols-${organization.id}`) || '[]') as CleaningProtocolRecord[]);
      setLoading(false); return;
    }
    const now = new Date(); const from = new Date(now); from.setDate(from.getDate() - 70); const to = new Date(now); to.setDate(to.getDate() + 150);
    const [interventionResult, siteResult, agentResult, protocolResult] = await Promise.all([
      supabase.from('cleaning_interventions').select('*,cleaning_sites(name,address,city,instructions,cleaning_clients(company_name)),cleaning_agents(first_name,last_name)').eq('organization_id', organization.id).gte('starts_at', from.toISOString()).lte('starts_at', to.toISOString()).order('starts_at'),
      supabase.from('cleaning_sites').select('*,cleaning_clients(company_name)').eq('organization_id', organization.id).eq('status', 'active').order('name'),
      supabase.from('cleaning_agents').select('*').eq('organization_id', organization.id).eq('status', 'active').order('last_name'),
      supabase.from('cleaning_protocols').select('*,cleaning_sites(name,cleaning_clients(company_name)),cleaning_protocol_tasks(*)').eq('organization_id', organization.id).eq('status', 'active').order('name')
    ]);
    const firstError = interventionResult.error || siteResult.error || agentResult.error || protocolResult.error;
    if (firstError) setError(firstError.message); else {
      setRows((interventionResult.data ?? []) as CleaningInterventionRecord[]);
      setSites((siteResult.data ?? []) as CleaningSiteRecord[]);
      setAgents((agentResult.data ?? []) as CleaningAgentRecord[]);
      setProtocols((protocolResult.data ?? []) as CleaningProtocolRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id, demoMode]);

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const activeRows = useMemo(() => rows.filter((row) => row.status !== 'canceled'), [rows]);
  const visibleAgents = useMemo(() => agents.filter((agent) => agentFilter === 'all' || agent.id === agentFilter), [agents, agentFilter]);
  const filteredRows = useMemo(() => activeRows.filter((row) => (agentFilter === 'all' || row.agent_id === agentFilter) && (siteFilter === 'all' || row.site_id === siteFilter)), [activeRows, agentFilter, siteFilter]);
  const weekRows = useMemo(() => filteredRows.filter((row) => new Date(row.starts_at) >= weekStart && new Date(row.starts_at) < addDays(weekStart, 7)), [filteredRows, weekStart]);
  const dayRows = useMemo(() => filteredRows.filter((row) => sameDay(row.starts_at, selectedDate)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)), [filteredRows, selectedDate]);
  const monthStart = useMemo(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1), [selectedDate]);
  const monthGridStart = useMemo(() => startOfWeek(monthStart), [monthStart]);
  const monthDays = useMemo(() => Array.from({ length: 42 }, (_, index) => addDays(monthGridStart, index)), [monthGridStart]);
  const weekMinutes = weekRows.reduce((total, row) => total + durationMinutes(row), 0);
  const inProgress = filteredRows.filter((row) => row.status === 'in_progress').length;
  const completedWeek = weekRows.filter((row) => row.status === 'completed').length;
  const weekSites = new Set(weekRows.map((row) => row.site_id)).size;

  function openCell(agent: CleaningAgentRecord, day: Date) {
    const start = new Date(day); start.setHours(8, 0, 0, 0); const end = new Date(start); end.setHours(10, 0, 0, 0);
    setForm((current) => ({ ...current, agentId: agent.id, startsAt: toLocalInput(start), endsAt: toLocalInput(end) })); setFormOpen(true);
  }

  async function createIntervention(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !form.siteId || !form.agentId) return;
    const site = sites.find((item) => item.id === form.siteId); const start = new Date(form.startsAt); const end = new Date(form.endsAt);
    if (end <= start) { setError('L’heure de fin doit être postérieure au début.'); return; }
    const conflict = activeRows.some((row) => row.agent_id === form.agentId && start < new Date(row.ends_at) && end > new Date(row.starts_at));
    if (conflict) { setError('Cet agent possède déjà une intervention sur tout ou partie de ce créneau.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000) - Number(form.breakMinutes || 0));
    const plannedPrice = site?.billing_mode === 'flat' ? site.service_rate_cents : Math.round((minutes / 60) * (site?.service_rate_cents ?? 0));
    const payload = { organization_id: organization.id, site_id: form.siteId, agent_id: form.agentId, protocol_id: form.protocolId || null, title: form.title.trim() || 'Intervention de nettoyage', starts_at: start.toISOString(), ends_at: end.toISOString(), break_minutes: Math.max(0, Number(form.breakMinutes) || 0), planned_price_cents: plannedPrice, notes: nullableCleaningText(form.notes), created_by: user.id };
    try {
      let created: CleaningInterventionRecord;
      if (demoMode || !supabase) {
        const agent = agents.find((item) => item.id === form.agentId);
        created = { id: crypto.randomUUID(), ...payload, status: 'planned', actual_started_at: null, actual_ended_at: null, report_text: null, before_photo_url: null, after_photo_url: null, agent_signature: null, client_signature: null, created_at: new Date().toISOString(), cleaning_sites: site ? { name: site.name, address: site.address, city: site.city, instructions: site.instructions, cleaning_clients: site.cleaning_clients } : null, cleaning_agents: agent ? { first_name: agent.first_name, last_name: agent.last_name } : null } as CleaningInterventionRecord;
        localStorage.setItem(`ncr-cleaning-interventions-${organization.id}`, JSON.stringify([...rows, created]));
      } else {
        const { data, error: insertError } = await supabase.from('cleaning_interventions').insert(payload).select('*,cleaning_sites(name,address,city,instructions,cleaning_clients(company_name)),cleaning_agents(first_name,last_name)').single();
        if (insertError) throw insertError; created = data as CleaningInterventionRecord;
      }
      setRows((current) => [...current, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
      setForm({ siteId: '', agentId: '', protocolId: '', title: 'Entretien régulier', startsAt: defaultStart(), endsAt: defaultEnd(), breakMinutes: '0', notes: '' });
      setFormOpen(false); setSuccess('L’intervention a été planifiée.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Planification impossible.'); } finally { setSaving(false); }
  }

  async function cancel(row: CleaningInterventionRecord) {
    if (!organization || !window.confirm('Annuler cette intervention ?')) return;
    try {
      if (demoMode || !supabase) { const next = rows.map((item) => item.id === row.id ? { ...item, status: 'canceled' as const } : item); localStorage.setItem(`ncr-cleaning-interventions-${organization.id}`, JSON.stringify(next)); setRows(next); }
      else { const { error: updateError } = await supabase.from('cleaning_interventions').update({ status: 'canceled' }).eq('organization_id', organization.id).eq('id', row.id); if (updateError) throw updateError; setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: 'canceled' } : item)); }
      setSuccess('L’intervention a été annulée.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Annulation impossible.'); }
  }

  if (!organization) return null;

  return <div className="page cleaning-page cleaning-planning-premium">
    <header className="page-header cleaning-planning-hero"><div><p className="eyebrow">NETTOYAGE · EXPLOITATION TERRAIN</p><h1>Planning des interventions</h1><p>Agents, sites clients, protocoles et états d’exécution visibles immédiatement.</p></div><button className="primary-button" disabled={!sites.length || !agents.length} onClick={() => setFormOpen(true)}><Icon name="plus" size={18}/>Planifier</button></header>

    {(!sites.length || !agents.length) && <div className="info-message page-message">Il faut au moins un site actif et un agent actif pour planifier.</div>}
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}

    <section className="planning-kpi-row cleaning-planning-kpis">
      <article><span className="planning-kpi-icon"><Icon name="users" size={19}/></span><div><strong>{agents.length}</strong><span>agents actifs</span></div></article>
      <article><span className="planning-kpi-icon"><Icon name="clock" size={19}/></span><div><strong>{Math.round(weekMinutes / 60)} h</strong><span>prévues cette semaine</span></div></article>
      <article><span className="planning-kpi-icon"><Icon name="map" size={19}/></span><div><strong>{weekSites}</strong><span>sites couverts</span></div></article>
      <article><span className="planning-kpi-icon"><Icon name="check" size={19}/></span><div><strong>{completedWeek}</strong><span>passages terminés</span></div></article>
      {inProgress > 0 && <article className="is-live"><span className="planning-kpi-icon"><Icon name="activity" size={19}/></span><div><strong>{inProgress}</strong><span>en cours maintenant</span></div></article>}
    </section>

    {formOpen && <section className="panel planning-quick-form cleaning-form-panel"><div className="panel-header"><div><p className="eyebrow">NOUVELLE INTERVENTION</p><h2>Planifier un passage</h2><p>Le contrôle de chevauchement agent est effectué avant validation.</p></div><button className="secondary-button compact-button" type="button" onClick={() => setFormOpen(false)}>Fermer</button></div><form className="cleaning-form-grid" onSubmit={createIntervention}>
      <label>Site *<select required value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value, protocolId: '' })}><option value="">Sélectionner</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.cleaning_clients?.company_name}</option>)}</select></label><label>Agent *<select required value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}><option value="">Sélectionner</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.first_name} {agent.last_name}</option>)}</select></label><label>Protocole<select value={form.protocolId} onChange={(e) => setForm({ ...form, protocolId: e.target.value })}><option value="">Sans protocole</option>{protocols.filter((protocol) => protocol.site_id === form.siteId).map((protocol) => <option key={protocol.id} value={protocol.id}>{protocol.name}</option>)}</select></label>
      <label className="full-field">Intitulé<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/></label><label>Début<input type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}/></label><label>Fin<input type="datetime-local" required value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })}/></label><label>Pause (minutes)<input type="number" min="0" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })}/></label><label className="full-field">Notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label><div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Planification…' : 'Planifier'}</button></div>
    </form></section>}

    <section className="panel planning-workspace cleaning-planning-workspace">
      <div className="planning-master-toolbar"><div className="planning-period-navigation"><button type="button" className="icon-nav-button" onClick={() => setSelectedDate(addDays(selectedDate, view === 'month' ? -28 : view === 'week' ? -7 : -1))}>‹</button><button type="button" className="secondary-button compact-button" onClick={() => setSelectedDate(startOfDay(new Date()))}>Aujourd’hui</button><button type="button" className="icon-nav-button" onClick={() => setSelectedDate(addDays(selectedDate, view === 'month' ? 28 : view === 'week' ? 7 : 1))}>›</button><div><p className="eyebrow">{view === 'month' ? 'VUE MENSUELLE' : view === 'week' ? 'SEMAINE D’EXPLOITATION' : 'PASSAGES DU JOUR'}</p><h2>{view === 'month' ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(selectedDate) : view === 'week' ? `Du ${new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(weekStart)} au ${new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(addDays(weekStart, 6))}` : new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }).format(selectedDate)}</h2></div></div>
        <div className="planning-toolbar-filters"><div className="segmented-control"><button type="button" className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Semaine</button><button type="button" className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Mois</button><button type="button" className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>Jour</button></div><select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}><option value="all">Tous les sites</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select><select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}><option value="all">Tous les agents</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.first_name} {agent.last_name}</option>)}</select></div>
      </div>

      <div className="planning-mobile-day-strip">{weekDays.map((day) => <button key={dateKey(day)} type="button" className={`${sameDay(day, selectedDate) ? 'active' : ''}${sameDay(day, new Date()) ? ' today' : ''}`} onClick={() => { setSelectedDate(day); setView('day'); }}><span>{new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(day)}</span><strong>{day.getDate()}</strong><small>{weekRows.filter((row) => sameDay(row.starts_at, day)).length}</small></button>)}</div>

      {loading ? <div className="planning-empty-state">Chargement du planning…</div> : view === 'week' ? <div className="planning-grid-scroll"><div className="planning-team-grid cleaning-team-grid" style={{ gridTemplateColumns: `190px repeat(7, minmax(150px, 1fr))` }}>
        <div className="planning-grid-corner">AGENTS</div>{weekDays.map((day) => <button key={dateKey(day)} type="button" className={`planning-grid-date${sameDay(day, new Date()) ? ' today' : ''}`} onClick={() => { setSelectedDate(day); setView('day'); }}><span>{new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(day)}</span><strong>{day.getDate()}</strong><small>{weekRows.filter((row) => sameDay(row.starts_at, day)).length} passage{weekRows.filter((row) => sameDay(row.starts_at, day)).length > 1 ? 's' : ''}</small></button>)}
        {visibleAgents.map((agent) => <div className="planning-grid-row" style={{ display: 'contents' }} key={agent.id}><div className="planning-person-cell"><span className="planning-avatar cleaning-avatar">{agent.first_name.slice(0, 1)}{agent.last_name.slice(0, 1)}</span><div><strong>{agent.first_name} {agent.last_name}</strong><small>{weekRows.filter((row) => row.agent_id === agent.id).reduce((total, row) => total + durationMinutes(row), 0) / 60} h cette semaine</small></div></div>{weekDays.map((day) => { const cellRows = weekRows.filter((row) => row.agent_id === agent.id && sameDay(row.starts_at, day)); return <div className="planning-grid-cell cleaning-intervention-cell" key={`${agent.id}-${dateKey(day)}`} onClick={() => openCell(agent, day)}>{cellRows.map((row) => <article key={row.id} className={`cleaning-intervention-block ${row.status}`} onClick={(event) => event.stopPropagation()}><i style={{ background: siteColor(row.site_id) }}/><div><strong>{time(row.starts_at)}–{time(row.ends_at)}</strong><span>{row.cleaning_sites?.name || row.title}</span><small>{row.title} · {Math.round(durationMinutes(row) / 6) / 10} h</small></div>{row.status === 'planned' && <button type="button" aria-label="Annuler" onClick={() => void cancel(row)}>×</button>}</article>)}<button className="planning-cell-add" type="button" onClick={(event) => { event.stopPropagation(); openCell(agent, day); }}>+</button></div>; })}</div>)}
      </div></div> : view === 'month' ? <div className="planning-month-calendar cleaning-month-calendar"><div className="planning-month-weekdays">{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((label) => <span key={label}>{label}</span>)}</div><div className="planning-month-grid">{monthDays.map((day) => { const items = filteredRows.filter((row) => sameDay(row.starts_at, day)); return <button type="button" key={dateKey(day)} className={`${day.getMonth() !== selectedDate.getMonth() ? 'outside' : ''}${sameDay(day, new Date()) ? ' today' : ''}`} onClick={() => { setSelectedDate(day); setView('day'); }}><span>{day.getDate()}</span><strong>{items.length || ''}</strong><div>{items.slice(0, 3).map((row) => <i key={row.id} className={row.status} style={{ background: siteColor(row.site_id) }}/>)}</div>{items.length > 0 && <small>{items.reduce((total, row) => total + durationMinutes(row), 0) / 60} h</small>}</button>; })}</div></div> : <div className="planning-day-board cleaning-day-board">{dayRows.length === 0 ? <div className="planning-empty-state"><Icon name="calendar" size={30}/><strong>Aucun passage</strong><span>Cette journée ne contient aucune intervention pour les filtres sélectionnés.</span></div> : dayRows.map((row) => <article key={row.id} className={`planning-day-card cleaning-day-intervention ${row.status}`}><div className="planning-day-time"><strong>{time(row.starts_at)}</strong><span>{time(row.ends_at)}</span></div><i className="cleaning-site-dot" style={{ background: siteColor(row.site_id) }}/><div className="planning-day-main"><strong>{row.cleaning_sites?.name || row.title}</strong><span>{row.title} · {agentName(row.cleaning_agents)}</span><small>{statusLabel(row.status)} · {Math.round(durationMinutes(row) / 6) / 10} h · {formatCleaningMoney(row.planned_price_cents)}</small></div>{row.status === 'planned' && <button className="secondary-button compact-button" type="button" onClick={() => void cancel(row)}>Annuler</button>}</article>)}</div>}
      <div className="planning-mobile-agenda"><div className="planning-mobile-agenda-heading"><p className="eyebrow">JOUR SÉLECTIONNÉ</p><strong>{new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }).format(selectedDate)}</strong></div>{dayRows.length === 0 ? <div className="planning-empty-state compact"><Icon name="calendar" size={26}/><strong>Aucun passage</strong><span>Aucune intervention pour les filtres sélectionnés.</span></div> : <div className="planning-day-board">{dayRows.map((row) => <article key={`mobile-${row.id}`} className={`planning-day-card cleaning-day-intervention ${row.status}`}><div className="planning-day-time"><strong>{time(row.starts_at)}</strong><span>{time(row.ends_at)}</span></div><i className="cleaning-site-dot" style={{ background: siteColor(row.site_id) }}/><div className="planning-day-main"><strong>{row.cleaning_sites?.name || row.title}</strong><span>{row.title} · {agentName(row.cleaning_agents)}</span><small>{statusLabel(row.status)} · {Math.round(durationMinutes(row) / 6) / 10} h</small></div></article>)}</div>}</div>
    </section>
  </div>;
}
