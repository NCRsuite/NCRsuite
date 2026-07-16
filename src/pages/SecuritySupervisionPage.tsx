import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatSecurityDateTime,
  securityPersonName,
  type SecurityAgentPositionRecord,
  type SecurityEmergencyAlertRecord,
  type SecurityPtiSessionRecord,
  type SecurityShiftRecord
} from '../features/security/types';
import { supabase } from '../lib/supabase';

export function SecuritySupervisionPage() {
  const { organization } = useOrganization();
  const [shifts, setShifts] = useState<SecurityShiftRecord[]>([]);
  const [positions, setPositions] = useState<SecurityAgentPositionRecord[]>([]);
  const [ptiSessions, setPtiSessions] = useState<SecurityPtiSessionRecord[]>([]);
  const [alerts, setAlerts] = useState<SecurityEmergencyAlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!organization || !supabase) return;
    setLoading(true);
    setError('');
    await supabase.rpc('refresh_security_pti_timeouts', { p_organization_id: organization.id });
    const now = new Date();
    const from = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const to = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
    const positionsSince = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const [shiftResult, positionResult, ptiResult, alertResult] = await Promise.all([
      supabase.from('security_shifts')
        .select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,actual_minutes,completed_at,created_at,security_sites(name,hourly_rate_cents,color_hex,address,postal_code,city,security_clients(company_name)),security_agents(first_name,last_name,phone)')
        .eq('organization_id', organization.id).neq('status','canceled').gte('ends_at',from).lte('starts_at',to).order('starts_at'),
      supabase.from('security_agent_positions')
        .select('id,organization_id,agent_id,shift_id,latitude,longitude,accuracy_m,recorded_at,created_at')
        .eq('organization_id', organization.id).gte('recorded_at',positionsSince).order('recorded_at',{ascending:false}).limit(500),
      supabase.from('security_pti_sessions')
        .select('id,organization_id,agent_id,shift_id,status,check_interval_minutes,activated_at,last_check_in_at,next_check_due_at,triggered_at,trigger_reason,closed_at,created_at,updated_at,security_agents(first_name,last_name,phone),security_shifts(starts_at,ends_at,title,security_sites(name,address,city))')
        .eq('organization_id', organization.id).in('status',['active','alerted']).order('activated_at',{ascending:false}),
      supabase.from('security_emergency_alerts')
        .select('id,organization_id,agent_id,shift_id,pti_session_id,alert_type,status,latitude,longitude,accuracy_m,message,triggered_at,acknowledged_at,acknowledged_by,resolved_at,resolved_by,resolution_notes,created_at,updated_at,security_agents(first_name,last_name,phone),security_shifts(starts_at,ends_at,title,security_sites(name,address,city))')
        .eq('organization_id', organization.id).in('status',['open','acknowledged']).order('triggered_at',{ascending:false})
    ]);
    const firstError = shiftResult.error || positionResult.error || ptiResult.error || alertResult.error;
    if (firstError) setError(firstError.message);
    else {
      setShifts((shiftResult.data ?? []) as unknown as SecurityShiftRecord[]);
      setPositions((positionResult.data ?? []) as unknown as SecurityAgentPositionRecord[]);
      setPtiSessions((ptiResult.data ?? []) as unknown as SecurityPtiSessionRecord[]);
      setAlerts((alertResult.data ?? []) as unknown as SecurityEmergencyAlertRecord[]);
    }
    setLoading(false);
  }, [organization]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const client = supabase;
    if (!organization || !client) return;
    const channel = client.channel(`security-supervision-${organization.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'security_agent_positions',filter:`organization_id=eq.${organization.id}`},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'security_pti_sessions',filter:`organization_id=eq.${organization.id}`},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'security_emergency_alerts',filter:`organization_id=eq.${organization.id}`},()=>void load())
      .subscribe();
    const timer = window.setInterval(() => void load(), 30000);
    return () => { window.clearInterval(timer); void client.removeChannel(channel); };
  }, [organization?.id, load]);

  const latestPositionByAgent = useMemo(() => {
    const map = new Map<string, SecurityAgentPositionRecord>();
    for (const row of positions) if (!map.has(row.agent_id)) map.set(row.agent_id,row);
    return map;
  }, [positions]);
  const ptiByAgent = useMemo(() => new Map(ptiSessions.map((row)=>[row.agent_id,row])), [ptiSessions]);
  const now = Date.now();
  const activeShifts = shifts.filter((row) => new Date(row.starts_at).getTime() <= now && new Date(row.ends_at).getTime() >= now && row.status !== 'canceled');
  const upcomingShifts = shifts.filter((row) => new Date(row.starts_at).getTime() > now).slice(0,8);
  const criticalAlerts = alerts.filter((row)=>row.status==='open');

  async function updateAlert(alert: SecurityEmergencyAlertRecord, action: 'ack'|'resolve') {
    if (!organization || !supabase) return;
    setBusyId(alert.id); setError(''); setSuccess('');
    const result = action === 'ack'
      ? await supabase.rpc('acknowledge_security_emergency',{p_organization_id:organization.id,p_alert_id:alert.id})
      : await supabase.rpc('resolve_security_emergency',{p_organization_id:organization.id,p_alert_id:alert.id,p_resolution_notes:'Alerte traitée depuis la supervision.'});
    if (result.error) setError(result.error.message);
    else { setSuccess(action==='ack'?'Alerte prise en charge.':'Alerte résolue.'); await load(); }
    setBusyId('');
  }

  if (!organization) return null;
  return <div className="page security-page security-supervision-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PROFESSIONNELLE</p><h1>Supervision temps réel</h1><p>Vacations en cours, positions GPS, protection PTI et alertes SOS sur un seul écran.</p></div><div className="security-header-actions"><Link className="secondary-button" to="/geolocalisation"><Icon name="map" size={18}/>Géolocalisation</Link><button className="primary-button" type="button" onClick={()=>void load()} disabled={loading}><Icon name="activity" size={18}/>{loading?'Actualisation…':'Actualiser'}</button></div></header>
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
    {criticalAlerts.length>0 && <div className="security-callout critical"><Icon name="alert" size={22}/><div><strong>{criticalAlerts.length} urgence{criticalAlerts.length>1?'s':''} à prendre en charge</strong><span>Un SOS ou un dépassement PTI nécessite une action immédiate.</span></div></div>}
    <section className="stats-grid"><article className="stat-card"><span><Icon name="activity" size={22}/></span><div><small>Vacations en cours</small><strong>{loading?'…':activeShifts.length}</strong><p>{upcomingShifts.length} à venir</p></div></article><article className="stat-card"><span><Icon name="map" size={22}/></span><div><small>Agents localisés</small><strong>{loading?'…':[...latestPositionByAgent.values()].filter((row)=>now-new Date(row.recorded_at).getTime()<5*60000).length}</strong><p>position depuis moins de 5 min</p></div></article><article className="stat-card"><span><Icon name="shield" size={22}/></span><div><small>PTI actifs</small><strong>{loading?'…':ptiSessions.filter((row)=>row.status==='active').length}</strong><p>{ptiSessions.filter((row)=>row.status==='alerted').length} en alerte</p></div></article><article className="stat-card"><span><Icon name="alert" size={22}/></span><div><small>Urgences ouvertes</small><strong>{loading?'…':criticalAlerts.length}</strong><p>{alerts.filter((row)=>row.status==='acknowledged').length} prises en charge</p></div></article></section>

    <section className="dashboard-grid security-supervision-grid"><article className="panel large-panel"><div className="panel-header"><div><p className="eyebrow">DISPOSITIF EN COURS</p><h2>Agents actuellement en vacation</h2></div></div>{loading?<div className="security-empty">Chargement du dispositif…</div>:activeShifts.length===0?<div className="security-empty"><Icon name="calendar" size={31}/><strong>Aucune vacation en cours</strong><span>Les prochaines missions apparaîtront automatiquement.</span></div>:<div className="security-supervision-shifts">{activeShifts.map((shift)=>{const position=latestPositionByAgent.get(shift.agent_id);const pti=ptiByAgent.get(shift.agent_id);const positionLive=position&&now-new Date(position.recorded_at).getTime()<5*60000;return <article key={shift.id}><span className="security-record-icon" style={{background:`${shift.security_sites?.color_hex||'#0A84FF'}22`,color:shift.security_sites?.color_hex||'#0A84FF'}}><Icon name="shield" size={19}/></span><div><strong>{shift.security_agents?securityPersonName(shift.security_agents.first_name,shift.security_agents.last_name):'Agent'}</strong><span>{shift.security_sites?.name||'Site'} · {shift.title||'Mission de sécurité'}</span><small>{formatSecurityDateTime(shift.starts_at)} → {new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(shift.ends_at))}</small></div><div className="security-supervision-statuses"><span className={`status-chip ${positionLive?'active':'inactive'}`}>{positionLive?'GPS actif':'GPS absent'}</span><span className={`status-chip ${pti?.status==='active'?'active':pti?.status==='alerted'?'danger':'inactive'}`}>{pti?.status==='active'?'PTI actif':pti?.status==='alerted'?'PTI alerte':'PTI inactif'}</span></div></article>})}</div>}</article>
      <aside className="panel security-emergency-panel"><div className="panel-header"><div><p className="eyebrow">URGENCES</p><h2>SOS & dépassements PTI</h2></div></div>{alerts.length===0?<div className="security-empty"><Icon name="check" size={30}/><strong>Aucune urgence ouverte</strong><span>Le dispositif ne signale aucune alerte critique.</span></div>:<div className="security-emergency-list">{alerts.map((alert)=>{const mapsUrl=alert.latitude!=null&&alert.longitude!=null?`https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`:null;return <article key={alert.id} className={alert.status}><div className="security-emergency-title"><span><Icon name="alert" size={19}/></span><div><strong>{alert.alert_type==='sos'?'SOS agent':'Délai PTI dépassé'}</strong><small>{formatSecurityDateTime(alert.triggered_at)}</small></div></div><p>{alert.security_agents?securityPersonName(alert.security_agents.first_name,alert.security_agents.last_name):'Agent'} · {alert.security_shifts?.security_sites?.name||'Site'}</p><div className="security-inline-actions">{mapsUrl&&<a className="secondary-button compact-button" href={mapsUrl} target="_blank" rel="noreferrer">Position</a>}{alert.status==='open'&&<button className="secondary-button compact-button" type="button" disabled={busyId===alert.id} onClick={()=>void updateAlert(alert,'ack')}>Prendre en charge</button>}<button className="primary-button compact-button" type="button" disabled={busyId===alert.id} onClick={()=>void updateAlert(alert,'resolve')}>Résoudre</button></div></article>})}</div>}</aside></section>

    <section className="panel"><div className="panel-header"><div><p className="eyebrow">À VENIR</p><h2>Prochaines vacations</h2></div><Link className="secondary-button" to="/planning">Planning complet</Link></div>{upcomingShifts.length===0?<div className="security-empty">Aucune mission à venir dans les prochaines heures.</div>:<div className="security-upcoming-list">{upcomingShifts.map((shift)=><article key={shift.id}><span className="security-record-icon"><Icon name="calendar" size={18}/></span><div><strong>{shift.security_agents?securityPersonName(shift.security_agents.first_name,shift.security_agents.last_name):'Agent'}</strong><span>{shift.security_sites?.name||'Site'}</span><small>{formatSecurityDateTime(shift.starts_at)}</small></div></article>)}</div>}</section>
  </div>;
}
