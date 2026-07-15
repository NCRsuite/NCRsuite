import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatSecurityDate, formatSecurityDuration, formatSecurityMoney, nullableSecurityText, securityPersonName,
  securityShiftMinutes, toLocalDateTimeInput, type SecurityAgentRecord, type SecurityShiftRecord, type SecuritySiteRecord
} from '../features/security/types';
import { supabase } from '../lib/supabase';

function startOfWeek(reference: Date) {
  const date = new Date(reference); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); date.setHours(0, 0, 0, 0); return date;
}
function endOfWeek(reference: Date) { const date = startOfWeek(reference); date.setDate(date.getDate() + 7); return date; }

type FormState = { agentId: string; siteId: string; startsAt: string; endsAt: string; breakMinutes: string; title: string; notes: string };
function defaultForm(reference = new Date()): FormState {
  const start = new Date(reference); start.setMinutes(0, 0, 0); if (start.getHours() < 8) start.setHours(8); else start.setHours(start.getHours() + 1);
  const end = new Date(start); end.setHours(end.getHours() + 8);
  return { agentId: '', siteId: '', startsAt: toLocalDateTimeInput(start), endsAt: toLocalDateTimeInput(end), breakMinutes: '0', title: '', notes: '' };
}

export function SecurityPlanningPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [rows, setRows] = useState<SecurityShiftRecord[]>([]);
  const [agents, setAgents] = useState<SecurityAgentRecord[]>([]);
  const [sites, setSites] = useState<SecuritySiteRecord[]>([]);
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;
    async function load() {
      setLoading(true); setError('');
      const weekEnd = endOfWeek(week);
      if (demoMode || !supabase) {
        const storedRows = JSON.parse(localStorage.getItem(`ncr-suite-security-shifts-${organizationId}`) || '[]') as SecurityShiftRecord[];
        const storedAgents = JSON.parse(localStorage.getItem(`ncr-suite-security-agents-${organizationId}`) || '[]') as SecurityAgentRecord[];
        const storedSites = JSON.parse(localStorage.getItem(`ncr-suite-security-sites-${organizationId}`) || '[]') as SecuritySiteRecord[];
        if (active) {
          setAgents(storedAgents.filter((item) => item.status === 'active')); setSites(storedSites.filter((item) => item.status === 'active'));
          setRows(storedRows.filter((item) => new Date(item.starts_at) >= week && new Date(item.starts_at) < weekEnd)); setLoading(false);
        }
        return;
      }
      const [shiftResult, agentResult, siteResult] = await Promise.all([
        supabase.from('security_shifts').select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,created_at,security_sites(name,hourly_rate_cents,city,security_clients(company_name)),security_agents(first_name,last_name)').eq('organization_id', organizationId).gte('starts_at', week.toISOString()).lt('starts_at', weekEnd.toISOString()).order('starts_at'),
        supabase.from('security_agents').select('id,organization_id,first_name,last_name,employee_number,email,phone,contract_type,weekly_hours,notes,status,created_at').eq('organization_id', organizationId).eq('status', 'active').order('last_name'),
        supabase.from('security_sites').select('id,organization_id,client_id,name,code,address,postal_code,city,contact_name,contact_phone,hourly_rate_cents,timezone,notes,status,created_at,security_clients(company_name)').eq('organization_id', organizationId).eq('status', 'active').order('name')
      ]);
      if (!active) return;
      const firstError = shiftResult.error || agentResult.error || siteResult.error;
      if (firstError) setError(`Chargement impossible : ${firstError.message}`);
      else { setRows((shiftResult.data ?? []) as unknown as SecurityShiftRecord[]); setAgents((agentResult.data ?? []) as SecurityAgentRecord[]); setSites((siteResult.data ?? []) as unknown as SecuritySiteRecord[]); }
      setLoading(false);
    }
    void load(); return () => { active = false; };
  }, [organization, demoMode, week]);

  useEffect(() => {
    if (!formOpen) return;
    setForm((current) => ({ ...current, agentId: current.agentId || agents[0]?.id || '', siteId: current.siteId || sites[0]?.id || '' }));
  }, [formOpen, agents, sites]);

  const grouped = useMemo(() => {
    const map = new Map<string, SecurityShiftRecord[]>();
    for (const row of rows) {
      const key = new Date(row.starts_at).toISOString().slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);
  const scheduledMinutes = rows.filter((row) => row.status !== 'canceled').reduce((sum, row) => sum + securityShiftMinutes(row), 0);
  const forecastCents = rows.filter((row) => row.status !== 'canceled').reduce((sum, row) => sum + Math.round((securityShiftMinutes(row) / 60) * (row.security_sites?.hourly_rate_cents || 0)), 0);

  async function createShift(event: FormEvent) {
    event.preventDefault(); if (!organization || !user) return;
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
        created = { id: crypto.randomUUID(), ...payload, status: 'planned', created_at: new Date().toISOString(), security_agents: agent ? { first_name: agent.first_name, last_name: agent.last_name } : null, security_sites: site ? { name: site.name, hourly_rate_cents: site.hourly_rate_cents, city: site.city, security_clients: site.security_clients } : null };
        localStorage.setItem(`ncr-suite-security-shifts-${organization.id}`, JSON.stringify([...all, created]));
      } else {
        const { data, error: insertError } = await supabase.from('security_shifts').insert(payload).select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,created_at,security_sites(name,hourly_rate_cents,city,security_clients(company_name)),security_agents(first_name,last_name)').single();
        if (insertError) throw insertError; created = data as unknown as SecurityShiftRecord;
      }
      const weekEnd = endOfWeek(week); if (starts >= week && starts < weekEnd) setRows((current) => [...current, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
      setForm(defaultForm(starts)); setFormOpen(false); setSuccess('La mission a bien été planifiée.');
    } catch (caught) { setError(`Planification impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setSaving(false); }
  }

  async function changeStatus(row: SecurityShiftRecord, status: SecurityShiftRecord['status']) {
    if (!organization) return;
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

  function moveWeek(offset: number) { const next = new Date(week); next.setDate(next.getDate() + offset * 7); setWeek(next); }
  if (!organization) return null;
  return <div className="page security-page security-planning-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE</p><h1>Planning agents</h1><p>Programme les missions et calcule automatiquement les heures facturables.</p></div><button className="primary-button" type="button" disabled={agents.length === 0 || sites.length === 0} onClick={() => setFormOpen(true)}><Icon name="plus" size={18}/>Planifier une mission</button></header>
    {(agents.length === 0 || sites.length === 0) && !loading && <div className="security-callout"><Icon name="alert" size={20}/><div><strong>Préparation nécessaire</strong><span>Ajoute au moins un agent et un site actif avant de créer une mission.</span></div></div>}
    {formOpen && <section className="panel security-form-panel"><div className="panel-header"><div><p className="eyebrow">NOUVELLE MISSION</p><h2>Planifier un agent</h2></div><button className="secondary-button compact-button" onClick={() => setFormOpen(false)}>Fermer</button></div><form className="security-form-grid" onSubmit={createShift}>
      <label>Agent *<select value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}><option value="">Sélectionner</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{securityPersonName(agent.first_name, agent.last_name)}</option>)}</select></label>
      <label>Site *<select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}><option value="">Sélectionner</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} · {formatSecurityMoney(site.hourly_rate_cents)}/h</option>)}</select></label>
      <label>Début *<input type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}/></label>
      <label>Fin *<input type="datetime-local" required value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })}/></label>
      <label>Pause (minutes)<input type="number" min="0" max="720" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })}/></label>
      <label>Intitulé<input placeholder="Gardiennage, contrôle d’accès…" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/></label>
      <label className="full-field">Notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label>
      <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Planification…' : 'Planifier'}</button></div>
    </form></section>}
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
    <section className="security-planning-summary"><article><Icon name="calendar" size={20}/><div><strong>{rows.filter((row) => row.status !== 'canceled').length}</strong><span>missions cette semaine</span></div></article><article><Icon name="activity" size={20}/><div><strong>{formatSecurityDuration(scheduledMinutes)}</strong><span>heures programmées</span></div></article><article><Icon name="creditCard" size={20}/><div><strong>{formatSecurityMoney(forecastCents)}</strong><span>prévision HT</span></div></article></section>
    <section className="panel security-planning-panel"><div className="security-week-toolbar"><button className="secondary-button compact-button" onClick={() => moveWeek(-1)}>‹ Semaine précédente</button><div><p className="eyebrow">SEMAINE</p><h2>Du {formatSecurityDate(week)} au {formatSecurityDate(new Date(endOfWeek(week).getTime() - 86400000))}</h2></div><div className="security-week-actions"><button className="secondary-button compact-button" onClick={() => setWeek(startOfWeek(new Date()))}>Aujourd’hui</button><button className="secondary-button compact-button" onClick={() => moveWeek(1)}>Suivante ›</button></div></div>
      {loading ? <div className="security-empty">Chargement du planning…</div> : grouped.length === 0 ? <div className="security-empty"><Icon name="calendar" size={30}/><strong>Aucune mission</strong><span>Cette semaine est encore vide.</span></div> : <div className="security-day-list">{grouped.map(([date, shifts]) => <section key={date} className="security-day"><header><strong>{formatSecurityDate(`${date}T12:00:00`, { weekday: 'long', day: 'numeric', month: 'long' })}</strong><span>{formatSecurityDuration(shifts.filter((row) => row.status !== 'canceled').reduce((sum, row) => sum + securityShiftMinutes(row), 0))}</span></header>{shifts.map((row) => <article key={row.id} className={`security-shift ${row.status}`}><div className="security-shift-time"><strong>{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(row.starts_at))}</strong><span>{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(row.ends_at))}</span></div><span className="security-record-icon"><Icon name="shield" size={19}/></span><div className="security-record-main"><strong>{row.security_agents ? securityPersonName(row.security_agents.first_name, row.security_agents.last_name) : 'Agent'}</strong><span>{row.security_sites?.name || 'Site'} · {row.security_sites?.security_clients?.company_name || 'Client'}</span><small>{row.title || 'Mission de sécurité'} · {formatSecurityDuration(securityShiftMinutes(row))} · {formatSecurityMoney(Math.round((securityShiftMinutes(row) / 60) * (row.security_sites?.hourly_rate_cents || 0)))}</small></div><span className={`security-status-pill ${row.status}`}>{row.status === 'planned' ? 'Planifiée' : row.status === 'completed' ? 'Réalisée' : 'Annulée'}</span><div className="security-record-actions">{row.status === 'planned' && <><button className="secondary-button compact-button" onClick={() => void changeStatus(row, 'completed')}>Réalisée</button><button className="secondary-button compact-button danger-button" onClick={() => void changeStatus(row, 'canceled')}>Annuler</button></>}</div></article>)}</section>)}</div>}
    </section>
  </div>;
}
