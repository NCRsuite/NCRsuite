import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatSecurityDate,
  formatSecurityDateTime,
  formatSecurityDuration,
  securityPersonName,
  securityShiftMinutes,
  type SecurityAgentRecord,
  type SecurityShiftRecord
} from '../features/security/types';
import { supabase } from '../lib/supabase';

type ViewMode = 'week' | 'month';

function statusLabel(status: SecurityShiftRecord['status']) {
  if (status === 'in_progress') return 'En cours';
  if (status === 'completed') return 'Terminée';
  if (status === 'canceled') return 'Annulée';
  return 'Planifiée';
}

function isoDate(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function startOfWeek(reference: Date) {
  const date = new Date(reference);
  const day = date.getDay() || 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day + 1);
  return date;
}

function endOfWeek(reference: Date) {
  const date = startOfWeek(reference);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
}

function startOfMonth(reference: Date) {
  return new Date(reference.getFullYear(), reference.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(reference: Date) {
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addPeriod(reference: Date, mode: ViewMode, amount: number) {
  const date = new Date(reference);
  if (mode === 'week') date.setDate(date.getDate() + amount * 7);
  else date.setMonth(date.getMonth() + amount);
  return date;
}

function dayKey(value: string) {
  return value.slice(0, 10);
}

function weekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function SecurityAgentDetailPage() {
  const { organization } = useOrganization();
  const { agentId = '' } = useParams();
  const [mode, setMode] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [agent, setAgent] = useState<SecurityAgentRecord | null>(null);
  const [shifts, setShifts] = useState<SecurityShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const period = useMemo(() => {
    const start = mode === 'week' ? startOfWeek(anchor) : startOfMonth(anchor);
    const end = mode === 'week' ? endOfWeek(anchor) : endOfMonth(anchor);
    return { start, end, from: isoDate(start), to: isoDate(end) };
  }, [anchor, mode]);

  async function load() {
    if (!organization || !supabase || !agentId) return;
    setLoading(true);
    setError('');
    const [agentResult, shiftResult] = await Promise.all([
      supabase.from('security_agents')
        .select('id,organization_id,first_name,last_name,employee_number,email,phone,contract_type,weekly_hours,notes,status,linked_user_id,created_at')
        .eq('organization_id', organization.id).eq('id', agentId).maybeSingle(),
      supabase.from('security_shifts')
        .select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,actual_minutes,actual_validation_note,completed_at,final_invoice_id,clocked_in_at,clocked_in_source,clocked_out_at,clocked_out_source,logbook_status,billing_minutes_override,billing_override_reason,created_at,security_sites!security_shifts_site_fk(name,hourly_rate_cents,color_hex,address,postal_code,city,security_clients(company_name)),security_agents!security_shifts_agent_fk(first_name,last_name)')
        .eq('organization_id', organization.id).eq('agent_id', agentId)
        .gte('starts_at', period.start.toISOString()).lte('starts_at', period.end.toISOString())
        .order('starts_at')
    ]);
    const firstError = agentResult.error || shiftResult.error;
    if (firstError) setError(firstError.message);
    else {
      setAgent((agentResult.data ?? null) as SecurityAgentRecord | null);
      setShifts((shiftResult.data ?? []) as unknown as SecurityShiftRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id, agentId, period.from, period.to]);

  const active = shifts.filter((row) => row.status !== 'canceled');
  const plannedMinutes = active.reduce((sum, row) => sum + securityShiftMinutes(row), 0);
  const completed = active.filter((row) => row.status === 'completed');
  const completedMinutes = completed.reduce((sum, row) => sum + (row.actual_minutes ?? securityShiftMinutes(row)), 0);
  const billableMinutes = active.reduce((sum, row) => sum + (row.billing_minutes_override ?? securityShiftMinutes(row)), 0);
  const sites = new Set(active.map((row) => row.site_id)).size;

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const current = new Date(period.start);
    for (let index = 0; index < 7; index += 1) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [period.from, mode]);

  const monthlyWeeks = useMemo(() => {
    const rows = new Map<string, { label: string; planned: number; completed: number; missions: number }>();
    active.forEach((shift) => {
      const date = new Date(shift.starts_at);
      const key = `${date.getFullYear()}-${weekNumber(date)}`;
      const row = rows.get(key) ?? { label: `Semaine ${weekNumber(date)}`, planned: 0, completed: 0, missions: 0 };
      row.planned += securityShiftMinutes(shift);
      if (shift.status === 'completed') row.completed += shift.actual_minutes ?? securityShiftMinutes(shift);
      row.missions += 1;
      rows.set(key, row);
    });
    return [...rows.values()];
  }, [active]);

  const periodTitle = mode === 'week'
    ? `Du ${formatSecurityDate(period.from)} au ${formatSecurityDate(period.to)}`
    : new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(anchor);

  if (!organization) return null;

  return <div className="page security-page security-agent-detail-page">
    <header className="page-header">
      <div><p className="eyebrow">SÉCURITÉ PRIVÉE · FICHE AGENT</p><h1>{agent ? securityPersonName(agent.first_name, agent.last_name) : 'Planning agent'}</h1><p>Consulte son planning semaine par semaine et son volume d’heures mensuel.</p></div>
      <div className="header-actions"><Link className="secondary-button" to="/agents"><Icon name="users" size={18}/>Retour aux agents</Link><Link className="primary-button" to="/planning"><Icon name="calendar" size={18}/>Planning général</Link></div>
    </header>

    {error && <div className="error-message page-message">{error}</div>}

    {agent && <section className="panel security-agent-identity-card">
      <span className="security-record-icon"><Icon name="shield" size={24}/></span>
      <div><strong>{securityPersonName(agent.first_name, agent.last_name)}</strong><span>{[agent.employee_number && `Matricule ${agent.employee_number}`, agent.email, agent.phone].filter(Boolean).join(' · ') || 'Coordonnées à compléter'}</span><small>{Number(agent.weekly_hours)} h contractuelles par semaine · {agent.linked_user_id ? 'Compte terrain connecté' : 'Fiche interne'}</small></div>
    </section>}

    <section className="panel security-agent-period-panel security-agent-period-tabs">
      <div><p className="eyebrow">PÉRIODE</p><h2>{periodTitle}</h2></div>
      <div className="security-view-switch"><button className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>Semaine</button><button className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>Mois</button></div>
      <div className="security-period-navigation"><button className="secondary-button compact-button" onClick={() => setAnchor(addPeriod(anchor, mode, -1))}>←</button><button className="secondary-button compact-button" onClick={() => setAnchor(new Date())}>Aujourd’hui</button><button className="secondary-button compact-button" onClick={() => setAnchor(addPeriod(anchor, mode, 1))}>→</button></div>
    </section>

    <section className="security-planning-summary">
      <article><Icon name="calendar" size={20}/><div><strong>{loading ? '…' : active.length}</strong><span>missions</span></div></article>
      <article><Icon name="activity" size={20}/><div><strong>{loading ? '…' : formatSecurityDuration(plannedMinutes)}</strong><span>heures programmées</span></div></article>
      <article><Icon name="check" size={20}/><div><strong>{loading ? '…' : formatSecurityDuration(completedMinutes)}</strong><span>heures terminées</span></div></article>
      <article><Icon name="file" size={20}/><div><strong>{loading ? '…' : formatSecurityDuration(billableMinutes)}</strong><span>heures facturables</span></div></article>
      <article><Icon name="map" size={20}/><div><strong>{loading ? '…' : sites}</strong><span>sites différents</span></div></article>
      {mode === 'week' && agent && <article><Icon name="clock" size={20}/><div><strong>{formatSecurityDuration(Math.round(Number(agent.weekly_hours) * 60))}</strong><span>contrat hebdomadaire</span></div></article>}
    </section>

    {mode === 'week' && <section className="security-agent-week-grid">
      {weekDays.map((day) => {
        const key = isoDate(day);
        const dayShifts = active.filter((shift) => dayKey(shift.starts_at) === key);
        const total = dayShifts.reduce((sum, shift) => sum + securityShiftMinutes(shift), 0);
        return <article className="panel security-agent-day-card" key={key}>
          <div className="security-agent-day-heading"><div><strong>{new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(day)}</strong><span>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(day)}</span></div><b>{formatSecurityDuration(total)}</b></div>
          {dayShifts.length === 0 ? <small className="security-agent-day-empty">Aucune mission</small> : dayShifts.map((shift) => <div className="security-agent-day-shift" key={shift.id} style={{ '--site-color': shift.security_sites?.color_hex || '#0A84FF' } as CSSProperties}><i/><div><strong>{shift.security_sites?.name || 'Site'}</strong><span>{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(shift.starts_at))} → {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(shift.ends_at))}</span></div><b>{formatSecurityDuration(securityShiftMinutes(shift))}</b></div>)}
        </article>;
      })}
    </section>}

    {mode === 'month' && <section className="panel security-agent-monthly-hours"><div className="panel-header"><div><p className="eyebrow">HEURES DU MOIS</p><h2>Répartition hebdomadaire</h2></div></div>
      {monthlyWeeks.length === 0 ? <div className="security-empty">Aucune heure planifiée sur ce mois.</div> : <div className="security-agent-month-table"><div className="security-agent-month-row heading"><span>Semaine</span><span>Missions</span><span>Planifiées</span><span>Terminées</span></div>{monthlyWeeks.map((row) => <div className="security-agent-month-row" key={row.label}><strong>{row.label}</strong><span>{row.missions}</span><span>{formatSecurityDuration(row.planned)}</span><span>{formatSecurityDuration(row.completed)}</span></div>)}</div>}
    </section>}

    <section className="panel security-list-panel"><div className="panel-header"><div><p className="eyebrow">DÉTAIL DES MISSIONS</p><h2>{active.length} vacation{active.length > 1 ? 's' : ''}</h2></div></div>
      {loading ? <div className="security-empty">Chargement du planning…</div> : !agent ? <div className="security-empty"><strong>Agent introuvable</strong></div> : active.length === 0 ? <div className="security-empty"><Icon name="calendar" size={30}/><strong>Aucune mission sur cette période</strong><span>Change de semaine ou de mois, ou ajoute une vacation depuis le planning.</span></div> : <div className="security-agent-shift-list">{active.map((shift) => {
        const planned = securityShiftMinutes(shift);
        const billed = shift.billing_minutes_override ?? planned;
        return <article key={shift.id} style={{ '--site-color': shift.security_sites?.color_hex || '#0A84FF' } as CSSProperties}>
          <span className="security-agent-shift-color"/>
          <div><strong>{shift.security_sites?.name || 'Site'}</strong><span>{shift.security_sites?.security_clients?.company_name || shift.title || 'Mission de sécurité'}</span><small>{formatSecurityDateTime(shift.starts_at)} → {new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(shift.ends_at))}</small></div>
          <div className="security-agent-shift-hours"><strong>{formatSecurityDuration(planned)}</strong><small>{shift.billing_minutes_override != null ? `Facturé ${formatSecurityDuration(billed)}` : 'Facturation sur planning'}</small></div>
          <span className={`security-status-pill ${shift.status}`}>{statusLabel(shift.status)}</span>
          <div className="security-agent-shift-checks"><span className={shift.clocked_in_at ? 'ok' : ''}>Prise de poste</span><span className={shift.clocked_out_at ? 'ok' : ''}>Fin de poste</span><span className={shift.logbook_status === 'closed' ? 'ok' : ''}>Main courante</span></div>
        </article>;
      })}</div>}
    </section>
  </div>;
}
