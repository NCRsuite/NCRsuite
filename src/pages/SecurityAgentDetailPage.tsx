import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatSecurityDate,
  formatSecurityDateTime,
  formatSecurityDuration,
  monthRange,
  securityPersonName,
  securityShiftMinutes,
  type SecurityAgentRecord,
  type SecurityShiftRecord
} from '../features/security/types';
import { supabase } from '../lib/supabase';

function statusLabel(status: SecurityShiftRecord['status']) {
  if (status === 'in_progress') return 'En cours';
  if (status === 'completed') return 'Terminée';
  if (status === 'canceled') return 'Annulée';
  return 'Planifiée';
}

export function SecurityAgentDetailPage() {
  const { organization } = useOrganization();
  const { agentId = '' } = useParams();
  const initial = useMemo(() => monthRange(), []);
  const [from, setFrom] = useState(initial.start);
  const [to, setTo] = useState(initial.end);
  const [agent, setAgent] = useState<SecurityAgentRecord | null>(null);
  const [shifts, setShifts] = useState<SecurityShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        .gte('starts_at', `${from}T00:00:00`).lt('starts_at', `${to}T23:59:59.999`)
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

  useEffect(() => { void load(); }, [organization?.id, agentId, from, to]);

  const active = shifts.filter((row) => row.status !== 'canceled');
  const plannedMinutes = active.reduce((sum, row) => sum + securityShiftMinutes(row), 0);
  const completed = active.filter((row) => row.status === 'completed');
  const completedMinutes = completed.reduce((sum, row) => sum + (row.actual_minutes ?? securityShiftMinutes(row)), 0);
  const sites = new Set(active.map((row) => row.site_id)).size;

  if (!organization) return null;

  return <div className="page security-page security-agent-detail-page">
    <header className="page-header">
      <div><p className="eyebrow">SÉCURITÉ PRIVÉE · FICHE AGENT</p><h1>{agent ? securityPersonName(agent.first_name, agent.last_name) : 'Planning agent'}</h1><p>Consulte ses missions, ses heures et l’état de chaque vacation.</p></div>
      <div className="header-actions"><Link className="secondary-button" to="/agents"><Icon name="users" size={18}/>Retour aux agents</Link><Link className="primary-button" to="/planning"><Icon name="calendar" size={18}/>Planning général</Link></div>
    </header>

    {error && <div className="error-message page-message">{error}</div>}

    {agent && <section className="panel security-agent-identity-card">
      <span className="security-record-icon"><Icon name="shield" size={24}/></span>
      <div><strong>{securityPersonName(agent.first_name, agent.last_name)}</strong><span>{[agent.employee_number && `Matricule ${agent.employee_number}`, agent.email, agent.phone].filter(Boolean).join(' · ') || 'Coordonnées à compléter'}</span><small>{Number(agent.weekly_hours)} h contractuelles par semaine · {agent.linked_user_id ? 'Compte terrain connecté' : 'Fiche interne'}</small></div>
    </section>}

    <section className="panel security-agent-period-panel"><div><p className="eyebrow">PÉRIODE</p><h2>Planning individuel</h2></div><label>Du<input type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label><label>Au<input type="date" value={to} onChange={(event) => setTo(event.target.value)}/></label></section>

    <section className="security-planning-summary">
      <article><Icon name="calendar" size={20}/><div><strong>{loading ? '…' : active.length}</strong><span>missions planifiées</span></div></article>
      <article><Icon name="activity" size={20}/><div><strong>{loading ? '…' : formatSecurityDuration(plannedMinutes)}</strong><span>heures programmées</span></div></article>
      <article><Icon name="check" size={20}/><div><strong>{loading ? '…' : formatSecurityDuration(completedMinutes)}</strong><span>heures terminées</span></div></article>
      <article><Icon name="map" size={20}/><div><strong>{loading ? '…' : sites}</strong><span>sites différents</span></div></article>
    </section>

    <section className="panel security-list-panel"><div className="panel-header"><div><p className="eyebrow">MISSIONS</p><h2>{active.length} vacation{active.length > 1 ? 's' : ''}</h2></div></div>
      {loading ? <div className="security-empty">Chargement du planning…</div> : !agent ? <div className="security-empty"><strong>Agent introuvable</strong></div> : active.length === 0 ? <div className="security-empty"><Icon name="calendar" size={30}/><strong>Aucune mission sur cette période</strong><span>Modifie les dates ou ajoute une vacation depuis le planning.</span></div> : <div className="security-agent-shift-list">{active.map((shift) => {
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
