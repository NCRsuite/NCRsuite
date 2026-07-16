import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { generateSecurityAgentPlanningPdf } from '../features/security/planningPdf';
import {
  formatSecurityDate, formatSecurityDuration, formatSecurityMoney, nullableSecurityText, securityPersonName,
  securityShiftMinutes, toLocalDateTimeInput, type SecurityAgentRecord, type SecurityShiftRecord, type SecuritySiteRecord
} from '../features/security/types';
import { closeFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

function startOfWeek(reference: Date) {
  const date = new Date(reference); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); date.setHours(0, 0, 0, 0); return date;
}
function endOfWeek(reference: Date) { const date = startOfWeek(reference); date.setDate(date.getDate() + 7); return date; }
function localDateKey(value: Date | string) { const date = typeof value === 'string' ? new Date(value) : value; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function weekDays(reference: Date) { return Array.from({ length: 7 }, (_, index) => { const date = startOfWeek(reference); date.setDate(date.getDate() + index); return date; }); }
function time(value: string) { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function monthStart(reference: Date) { return new Date(reference.getFullYear(), reference.getMonth(), 1); }
function monthEnd(reference: Date) { return new Date(reference.getFullYear(), reference.getMonth() + 1, 0); }

type FormState = { agentId: string; siteId: string; startsAt: string; endsAt: string; breakMinutes: string; title: string; notes: string };
function defaultForm(reference = new Date(), siteId = ''): FormState {
  const start = new Date(reference); start.setMinutes(0, 0, 0); if (start.getHours() < 8) start.setHours(8); else if (reference.getHours() === 0) start.setHours(8); else start.setHours(start.getHours() + 1);
  const end = new Date(start); end.setHours(end.getHours() + 8);
  return { agentId: '', siteId, startsAt: toLocalDateTimeInput(start), endsAt: toLocalDateTimeInput(end), breakMinutes: '0', title: '', notes: '' };
}

type ExportState = { agentId: string; from: string; to: string };

export function SecurityPlanningPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [rows, setRows] = useState<SecurityShiftRecord[]>([]);
  const [agents, setAgents] = useState<SecurityAgentRecord[]>([]);
  const [sites, setSites] = useState<SecuritySiteRecord[]>([]);
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const [formOpen, setFormOpen] = useState(false);
  const [duplicateRow, setDuplicateRow] = useState<SecurityShiftRecord | null>(null);
  const [duplicateDays, setDuplicateDays] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportState, setExportState] = useState<ExportState>(() => ({ agentId: '', from: localDateKey(monthStart(new Date())), to: localDateKey(monthEnd(new Date())) }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadWeek() {
    if (!organization) return;
    const organizationId = organization.id;
    setLoading(true); setError('');
    const weekEnd = endOfWeek(week);
    if (demoMode || !supabase) {
      const storedRows = JSON.parse(localStorage.getItem(`ncr-suite-security-shifts-${organizationId}`) || '[]') as SecurityShiftRecord[];
      const storedAgents = JSON.parse(localStorage.getItem(`ncr-suite-security-agents-${organizationId}`) || '[]') as SecurityAgentRecord[];
      const storedSites = JSON.parse(localStorage.getItem(`ncr-suite-security-sites-${organizationId}`) || '[]') as SecuritySiteRecord[];
      setAgents(storedAgents.filter((item) => item.status === 'active')); setSites(storedSites.filter((item) => item.status === 'active'));
      setRows(storedRows.filter((item) => new Date(item.starts_at) >= week && new Date(item.starts_at) < weekEnd)); setLoading(false); return;
    }
    const [shiftResult, agentResult, siteResult] = await Promise.all([
      supabase.from('security_shifts').select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,recurrence_group_id,duplicated_from_id,created_at,security_sites(name,hourly_rate_cents,color_hex,city,security_clients(company_name)),security_agents(first_name,last_name)').eq('organization_id', organizationId).gte('starts_at', week.toISOString()).lt('starts_at', weekEnd.toISOString()).order('starts_at'),
      supabase.from('security_agents').select('id,organization_id,first_name,last_name,employee_number,email,phone,contract_type,weekly_hours,notes,status,linked_user_id,created_at').eq('organization_id', organizationId).eq('status', 'active').order('last_name'),
      supabase.from('security_sites').select('id,organization_id,client_id,name,code,address,postal_code,city,contact_name,contact_phone,hourly_rate_cents,color_hex,timezone,notes,status,created_at,security_clients(company_name)').eq('organization_id', organizationId).eq('status', 'active').order('name')
    ]);
    const firstError = shiftResult.error || agentResult.error || siteResult.error;
    if (firstError) setError(`Chargement impossible : ${firstError.message}`);
    else { setRows((shiftResult.data ?? []) as unknown as SecurityShiftRecord[]); setAgents((agentResult.data ?? []) as SecurityAgentRecord[]); setSites((siteResult.data ?? []) as unknown as SecuritySiteRecord[]); }
    setLoading(false);
  }

  useEffect(() => { void loadWeek(); }, [organization?.id, demoMode, week]);
  useEffect(() => {
    if (!formOpen) return;
    setForm((current) => ({ ...current, agentId: current.agentId || agents[0]?.id || '', siteId: current.siteId || sites[0]?.id || '' }));
  }, [formOpen, agents, sites]);
  useEffect(() => { setExportState((current) => ({ ...current, agentId: current.agentId || agents[0]?.id || '' })); }, [agents]);

  const days = useMemo(() => weekDays(week), [week]);
  const siteRows = useMemo(() => {
    const visible = canManage ? sites : sites.filter((site) => rows.some((row) => row.site_id === site.id));
    return visible.map((site) => ({ site, cells: days.map((day) => rows.filter((row) => row.site_id === site.id && localDateKey(row.starts_at) === localDateKey(day)).sort((a, b) => a.starts_at.localeCompare(b.starts_at))) }));
  }, [sites, rows, days, canManage]);
  const scheduledMinutes = rows.filter((row) => row.status !== 'canceled').reduce((sum, row) => sum + securityShiftMinutes(row), 0);
  const forecastCents = rows.filter((row) => row.status !== 'canceled').reduce((sum, row) => sum + Math.round((securityShiftMinutes(row) / 60) * (row.security_sites?.hourly_rate_cents || 0)), 0);
  const agentTotals = useMemo(() => agents.map((agent) => ({
    id: agent.id,
    name: securityPersonName(agent.first_name, agent.last_name),
    minutes: rows.filter((row) => row.status !== 'canceled' && row.agent_id === agent.id).reduce((sum, row) => sum + securityShiftMinutes(row), 0),
    missions: rows.filter((row) => row.status !== 'canceled' && row.agent_id === agent.id).length
  })).filter((item) => item.minutes > 0).sort((a, b) => b.minutes - a.minutes), [agents, rows]);
  const siteTotals = useMemo(() => sites.map((site) => ({
    id: site.id,
    name: site.name,
    color: site.color_hex || '#0A84FF',
    minutes: rows.filter((row) => row.status !== 'canceled' && row.site_id === site.id).reduce((sum, row) => sum + securityShiftMinutes(row), 0),
    missions: rows.filter((row) => row.status !== 'canceled' && row.site_id === site.id).length
  })).filter((item) => item.minutes > 0).sort((a, b) => b.minutes - a.minutes), [sites, rows]);

  function openCell(siteId: string, day: Date) { if (!canManage) return; const reference = new Date(day); reference.setHours(7, 0, 0, 0); setForm(defaultForm(reference, siteId)); setFormOpen(true); }

  async function createShift(event: FormEvent) {
    event.preventDefault(); if (!organization || !user || !canManage) return;
    if (!form.agentId || !form.siteId) { setError('Sélectionne un agent et un site.'); return; }
    const starts = new Date(form.startsAt); const ends = new Date(form.endsAt);
    if (!(ends > starts)) { setError('La date de fin doit être postérieure au début.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const payload = { organization_id: organization.id, agent_id: form.agentId, site_id: form.siteId, starts_at: starts.toISOString(), ends_at: ends.toISOString(), break_minutes: Math.max(0, Number(form.breakMinutes) || 0), title: nullableSecurityText(form.title), notes: nullableSecurityText(form.notes), created_by: user.id };
    try {
      let created: SecurityShiftRecord;
      const agent = agents.find((item) => item.id === form.agentId); const site = sites.find((item) => item.id === form.siteId);
      if (demoMode || !supabase) {
        const all = JSON.parse(localStorage.getItem(`ncr-suite-security-shifts-${organization.id}`) || '[]') as SecurityShiftRecord[];
        const overlap = all.some((item) => item.agent_id === payload.agent_id && item.status !== 'canceled' && new Date(item.starts_at) < ends && new Date(item.ends_at) > starts);
        if (overlap) throw new Error('Cet agent possède déjà une mission sur ce créneau.');
        created = { id: crypto.randomUUID(), ...payload, status: 'planned', created_at: new Date().toISOString(), security_agents: agent ? { first_name: agent.first_name, last_name: agent.last_name } : null, security_sites: site ? { name: site.name, hourly_rate_cents: site.hourly_rate_cents, color_hex: site.color_hex, city: site.city, security_clients: site.security_clients } : null };
        localStorage.setItem(`ncr-suite-security-shifts-${organization.id}`, JSON.stringify([...all, created]));
      } else {
        const { data, error: insertError } = await supabase.from('security_shifts').insert(payload).select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,recurrence_group_id,duplicated_from_id,created_at,security_sites(name,hourly_rate_cents,color_hex,city,security_clients(company_name)),security_agents(first_name,last_name)').single();
        if (insertError) throw insertError; created = data as unknown as SecurityShiftRecord;
      }
      const weekEnd = endOfWeek(week); if (starts >= week && starts < weekEnd) setRows((current) => [...current, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
      setForm(defaultForm(starts)); setFormOpen(false); setSuccess('La mission a bien été planifiée.');
    } catch (caught) { setError(`Planification impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setSaving(false); }
  }

  function beginDuplicate(row: SecurityShiftRecord) {
    const sourceDay = localDateKey(row.starts_at);
    setDuplicateRow(row); setDuplicateDays(days.map(localDateKey).filter((day) => day !== sourceDay)); setError(''); setSuccess('');
  }

  async function duplicateMission() {
    if (!organization || !duplicateRow || !duplicateDays.length) return;
    setSaving(true); setError('');
    try {
      if (demoMode || !supabase) {
        const all = JSON.parse(localStorage.getItem(`ncr-suite-security-shifts-${organization.id}`) || '[]') as SecurityShiftRecord[];
        const sourceStart = new Date(duplicateRow.starts_at); const sourceEnd = new Date(duplicateRow.ends_at); const group = duplicateRow.recurrence_group_id || crypto.randomUUID();
        const created = duplicateDays.map((date) => {
          const start = new Date(`${date}T${String(sourceStart.getHours()).padStart(2, '0')}:${String(sourceStart.getMinutes()).padStart(2, '0')}:00`);
          const end = new Date(start.getTime() + (sourceEnd.getTime() - sourceStart.getTime()));
          return { ...duplicateRow, id: crypto.randomUUID(), starts_at: start.toISOString(), ends_at: end.toISOString(), recurrence_group_id: group, duplicated_from_id: duplicateRow.id, created_at: new Date().toISOString() };
        });
        localStorage.setItem(`ncr-suite-security-shifts-${organization.id}`, JSON.stringify([...all, ...created]));
      } else {
        const { error: duplicateError } = await supabase.rpc('duplicate_security_shift', { p_organization_id: organization.id, p_shift_id: duplicateRow.id, p_target_dates: duplicateDays });
        if (duplicateError) throw duplicateError;
      }
      setDuplicateRow(null); setDuplicateDays([]); setSuccess(`${duplicateDays.length} mission(s) dupliquée(s).`); await loadWeek();
    } catch (caught) { setError(`Duplication impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setSaving(false); }
  }

  async function changeStatus(row: SecurityShiftRecord, status: SecurityShiftRecord['status']) {
    if (!organization || !canManage) return;
    try {
      if (demoMode || !supabase) {
        const all = JSON.parse(localStorage.getItem(`ncr-suite-security-shifts-${organization.id}`) || '[]') as SecurityShiftRecord[];
        localStorage.setItem(`ncr-suite-security-shifts-${organization.id}`, JSON.stringify(all.map((item) => item.id === row.id ? { ...item, status } : item)));
      } else {
        const { error: updateError } = await supabase.from('security_shifts').update({ status }).eq('organization_id', organization.id).eq('id', row.id); if (updateError) throw updateError;
      }
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item)); setSuccess(status === 'canceled' ? 'La mission a été annulée.' : 'La mission a été marquée comme réalisée.');
    } catch (caught) { setError(`Mise à jour impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
  }

  async function exportPlanning(event: FormEvent) {
    event.preventDefault(); if (!organization || !exportState.agentId) return;
    const agent = agents.find((item) => item.id === exportState.agentId); if (!agent) return;
    const from = new Date(`${exportState.from}T00:00:00`); const to = new Date(`${exportState.to}T23:59:59`);
    if (to < from) { setError('La période d’export est invalide.'); return; }
    const target = prepareFileWindow('Préparation du planning', 'Le PDF du collaborateur est en cours de génération.');
    setExporting(true); setError('');
    try {
      let exportRows: SecurityShiftRecord[];
      if (demoMode || !supabase) {
        exportRows = (JSON.parse(localStorage.getItem(`ncr-suite-security-shifts-${organization.id}`) || '[]') as SecurityShiftRecord[]).filter((row) => row.agent_id === agent.id && new Date(row.starts_at) >= from && new Date(row.starts_at) <= to);
      } else {
        const { data, error: loadError } = await supabase.from('security_shifts').select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,recurrence_group_id,duplicated_from_id,created_at,security_sites(name,hourly_rate_cents,color_hex,city,security_clients(company_name)),security_agents(first_name,last_name)').eq('organization_id', organization.id).eq('agent_id', agent.id).gte('starts_at', from.toISOString()).lte('starts_at', to.toISOString()).order('starts_at');
        if (loadError) throw loadError; exportRows = (data ?? []) as unknown as SecurityShiftRecord[];
      }
      const result = await generateSecurityAgentPlanningPdf({ organization, agent, shifts: exportRows, sites, periodStart: from, periodEnd: to });
      const url = URL.createObjectURL(result.blob); showBlobDownload(target, url, result.filename, 'Planning agent prêt'); window.setTimeout(() => URL.revokeObjectURL(url), 120000);
      setSuccess('Le planning PDF a été généré.');
    } catch (caught) { closeFileWindow(target); setError(`Export impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setExporting(false); }
  }

  function moveWeek(offset: number) { const next = new Date(week); next.setDate(next.getDate() + offset * 7); setWeek(next); }
  if (!organization) return null;
  return <div className="page security-page security-planning-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE</p><h1>Planning agents</h1><p>Vue hebdomadaire par site, missions colorées, duplication et planning PDF individuel.</p></div><div className="security-header-actions">{canManage && <button className="secondary-button" type="button" onClick={() => setExportOpen((value) => !value)}><Icon name="file" size={18}/>Exporter PDF</button>}{canManage && <button className="primary-button" type="button" disabled={agents.length === 0 || sites.length === 0} onClick={() => { setForm(defaultForm()); setFormOpen(true); }}><Icon name="plus" size={18}/>Planifier une mission</button>}</div></header>
    {(agents.length === 0 || sites.length === 0) && !loading && canManage && <div className="security-callout"><Icon name="alert" size={20}/><div><strong>Préparation nécessaire</strong><span>Ajoute au moins un agent et un site actif avant de créer une mission.</span></div></div>}
    {exportOpen && canManage && <section className="panel security-form-panel"><div className="panel-header"><div><p className="eyebrow">PLANNING COLLABORATEUR</p><h2>Exporter un PDF individuel</h2></div><button className="secondary-button compact-button" type="button" onClick={() => setExportOpen(false)}>Fermer</button></div><form className="security-form-grid" onSubmit={exportPlanning}>
      <label>Agent *<select required value={exportState.agentId} onChange={(e) => setExportState({ ...exportState, agentId: e.target.value })}><option value="">Sélectionner</option>{agents.map((agent) => <option value={agent.id} key={agent.id}>{securityPersonName(agent.first_name, agent.last_name)}</option>)}</select></label>
      <label>Période rapide<select onChange={(e) => { const now = new Date(); const start = e.target.value === 'week' ? startOfWeek(week) : monthStart(now); const end = e.target.value === 'week' ? new Date(endOfWeek(week).getTime() - 86400000) : monthEnd(now); setExportState((current) => ({ ...current, from: localDateKey(start), to: localDateKey(end) })); }} defaultValue="month"><option value="month">Mois en cours</option><option value="week">Semaine affichée</option></select></label>
      <label>Du<input type="date" required value={exportState.from} onChange={(e) => setExportState({ ...exportState, from: e.target.value })}/></label><label>Au<input type="date" required value={exportState.to} onChange={(e) => setExportState({ ...exportState, to: e.target.value })}/></label>
      <div className="form-actions full-field"><button className="primary-button" disabled={exporting}>{exporting ? 'Génération…' : 'Générer le planning PDF'}</button></div>
    </form></section>}
    {formOpen && canManage && <section className="panel security-form-panel"><div className="panel-header"><div><p className="eyebrow">NOUVELLE MISSION</p><h2>Planifier un agent</h2></div><button className="secondary-button compact-button" onClick={() => setFormOpen(false)}>Fermer</button></div><form className="security-form-grid" onSubmit={createShift}>
      <label>Agent *<select value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}><option value="">Sélectionner</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{securityPersonName(agent.first_name, agent.last_name)}</option>)}</select></label>
      <label>Site *<select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}><option value="">Sélectionner</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} · {formatSecurityMoney(site.hourly_rate_cents)}/h</option>)}</select></label>
      <label>Début *<input type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}/></label><label>Fin *<input type="datetime-local" required value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })}/></label>
      <label>Pause (minutes)<input type="number" min="0" max="720" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })}/></label><label>Intitulé<input placeholder="Gardiennage, contrôle d’accès…" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/></label>
      <label className="full-field">Notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label><div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Planification…' : 'Planifier'}</button></div>
    </form></section>}
    {duplicateRow && canManage && <section className="panel security-duplicate-panel"><div className="panel-header"><div><p className="eyebrow">DUPLIQUER LA MISSION</p><h2>{duplicateRow.security_sites?.name} · {time(duplicateRow.starts_at)}-{time(duplicateRow.ends_at)}</h2><p>{duplicateRow.security_agents ? securityPersonName(duplicateRow.security_agents.first_name, duplicateRow.security_agents.last_name) : 'Agent'} — sélectionne les autres jours de la semaine.</p></div><button className="secondary-button compact-button" type="button" onClick={() => setDuplicateRow(null)}>Fermer</button></div><div className="security-duplicate-days">{days.map((day) => { const key = localDateKey(day); const source = key === localDateKey(duplicateRow.starts_at); const active = duplicateDays.includes(key); return <button type="button" key={key} disabled={source} className={active ? 'active' : ''} onClick={() => setDuplicateDays((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])}><strong>{new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(day)}</strong><span>{day.getDate()}</span>{source && <small>Originale</small>}</button>; })}</div><div className="form-actions"><button className="secondary-button" type="button" onClick={() => setDuplicateRow(null)}>Annuler</button><button className="primary-button" type="button" disabled={saving || duplicateDays.length === 0} onClick={() => void duplicateMission()}>{saving ? 'Duplication…' : `Dupliquer sur ${duplicateDays.length} jour(s)`}</button></div></section>}
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
    <section className="security-planning-summary"><article><Icon name="calendar" size={20}/><div><strong>{rows.filter((row) => row.status !== 'canceled').length}</strong><span>missions cette semaine</span></div></article><article><Icon name="activity" size={20}/><div><strong>{formatSecurityDuration(scheduledMinutes)}</strong><span>heures programmées</span></div></article>{canManage && <article><Icon name="creditCard" size={20}/><div><strong>{formatSecurityMoney(forecastCents)}</strong><span>prévision HT</span></div></article>}</section>
    {canManage && (agentTotals.length > 0 || siteTotals.length > 0) && <section className="security-planning-totals-grid"><article className="panel security-hours-total-panel"><div className="panel-header"><div><p className="eyebrow">TOTAL PAR AGENT</p><h2>Charge hebdomadaire</h2></div></div><div className="security-hours-total-list">{agentTotals.map((item) => <div key={item.id}><span><strong>{item.name}</strong><small>{item.missions} mission{item.missions > 1 ? 's' : ''}</small></span><b>{formatSecurityDuration(item.minutes)}</b></div>)}</div></article><article className="panel security-hours-total-panel"><div className="panel-header"><div><p className="eyebrow">TOTAL PAR SITE</p><h2>Heures programmées</h2></div></div><div className="security-hours-total-list">{siteTotals.map((item) => <div key={item.id}><span><i style={{ background: item.color }}/><span><strong>{item.name}</strong><small>{item.missions} mission{item.missions > 1 ? 's' : ''}</small></span></span><b>{formatSecurityDuration(item.minutes)}</b></div>)}</div></article></section>}
    <section className="panel security-planning-panel"><div className="security-week-toolbar"><button className="secondary-button compact-button" onClick={() => moveWeek(-1)}>‹ Semaine précédente</button><div><p className="eyebrow">SEMAINE</p><h2>Du {formatSecurityDate(week)} au {formatSecurityDate(new Date(endOfWeek(week).getTime() - 86400000))}</h2></div><div className="security-week-actions"><button className="secondary-button compact-button" onClick={() => setWeek(startOfWeek(new Date()))}>Aujourd’hui</button><button className="secondary-button compact-button" onClick={() => moveWeek(1)}>Suivante ›</button></div></div>
      {loading ? <div className="security-empty">Chargement du planning…</div> : siteRows.length === 0 ? <div className="security-empty"><Icon name="calendar" size={30}/><strong>Aucune mission</strong><span>Cette semaine est encore vide.</span></div> : <div className="security-planning-scroll"><div className="security-site-grid" style={{ gridTemplateColumns: `210px repeat(${days.length}, minmax(145px, 1fr))` }}><div className="security-grid-corner">SITES</div>{days.map((day) => <div className={`security-grid-day ${localDateKey(day) === localDateKey(new Date()) ? 'today' : ''}`} key={localDateKey(day)}><strong>{day.getDate().toString().padStart(2, '0')}/{(day.getMonth()+1).toString().padStart(2,'0')}</strong><span>{new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(day)}</span></div>)}
        {siteRows.map(({ site, cells }) => <div className="security-grid-row" style={{ display: 'contents' }} key={site.id}><div className="security-grid-site"><span style={{ background: site.color_hex || '#0A84FF' }}/><div><strong>{site.name}</strong><small>{site.security_clients?.company_name || site.city || 'Site client'}</small></div></div>{cells.map((cell, index) => <div className="security-grid-cell" key={`${site.id}-${index}`} onClick={() => openCell(site.id, days[index])}>{cell.filter((row) => row.status !== 'canceled').map((row) => <article key={row.id} className={`security-grid-mission ${row.status}`} style={{ '--site-color': site.color_hex || '#0A84FF' } as CSSProperties} onClick={(event) => event.stopPropagation()}><strong>{time(row.starts_at)}-{time(row.ends_at)}</strong><span>{row.security_agents ? securityPersonName(row.security_agents.first_name, row.security_agents.last_name) : 'Agent'}</span><small>{row.title || 'Mission de sécurité'}</small>{canManage && row.status === 'planned' && <div><button type="button" onClick={() => beginDuplicate(row)}>Dupliquer</button><button type="button" onClick={() => void changeStatus(row, 'completed')}>Réalisée</button><button type="button" className="danger" onClick={() => void changeStatus(row, 'canceled')}>×</button></div>}</article>)}{canManage && <button className="security-grid-add" type="button" onClick={() => openCell(site.id, days[index])}>+</button>}</div>)}</div>)}
      </div></div>}
    </section>
  </div>;
}
