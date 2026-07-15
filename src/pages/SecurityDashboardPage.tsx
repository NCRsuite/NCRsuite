import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { StatCard } from '../components/StatCard';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatSecurityDateTime,
  formatSecurityDuration,
  formatSecurityMoney,
  monthRange,
  securityPersonName,
  securityShiftMinutes,
  type SecurityAgentRecord,
  type SecurityAlertRecord,
  type SecurityLogbookEntryRecord,
  type SecurityPatrolRecord,
  type SecurityShiftRecord,
  type SecuritySiteRecord
} from '../features/security/types';
import { supabase } from '../lib/supabase';

export function SecurityDashboardPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const isAgent = organization?.role === 'employee';
  const essentialEnabled = Boolean(organization && organizationHasFeature(organization, 'security_agent_portal'));
  const [agents, setAgents] = useState<SecurityAgentRecord[]>([]);
  const [sites, setSites] = useState<SecuritySiteRecord[]>([]);
  const [shifts, setShifts] = useState<SecurityShiftRecord[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlertRecord[]>([]);
  const [patrols, setPatrols] = useState<SecurityPatrolRecord[]>([]);
  const [entries, setEntries] = useState<SecurityLogbookEntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      const range = monthRange();
      const monthStart = new Date(`${range.start}T00:00:00`).toISOString();
      const monthEnd = new Date(`${range.end}T23:59:59.999`).toISOString();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (demoMode || !supabase) {
        const agentRows = JSON.parse(localStorage.getItem(`ncr-suite-security-agents-${organizationId}`) || '[]') as SecurityAgentRecord[];
        const siteRows = JSON.parse(localStorage.getItem(`ncr-suite-security-sites-${organizationId}`) || '[]') as SecuritySiteRecord[];
        const shiftRows = JSON.parse(localStorage.getItem(`ncr-suite-security-shifts-${organizationId}`) || '[]') as SecurityShiftRecord[];
        if (active) {
          setAgents(agentRows.filter((row) => row.status === 'active'));
          setSites(siteRows.filter((row) => row.status === 'active'));
          setShifts(shiftRows.filter((row) => row.starts_at >= monthStart && row.starts_at <= monthEnd));
          setAlerts(JSON.parse(localStorage.getItem(`ncr-suite-security-alerts-${organizationId}`) || '[]'));
          setPatrols(JSON.parse(localStorage.getItem(`ncr-suite-security-patrols-${organizationId}`) || '[]'));
          setEntries(JSON.parse(localStorage.getItem(`ncr-suite-security-logbook-${organizationId}`) || '[]'));
          setLoading(false);
        }
        return;
      }

      const [agentResult, siteResult, shiftResult] = await Promise.all([
        supabase.from('security_agents').select('id,organization_id,first_name,last_name,employee_number,email,phone,contract_type,weekly_hours,notes,status,linked_user_id,created_at').eq('organization_id', organizationId).eq('status', 'active'),
        supabase.from('security_sites').select('id,organization_id,client_id,name,code,address,postal_code,city,contact_name,contact_phone,hourly_rate_cents,color_hex,timezone,notes,status,created_at,security_clients(company_name)').eq('organization_id', organizationId).eq('status', 'active'),
        supabase.from('security_shifts').select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,recurrence_group_id,duplicated_from_id,created_at,security_sites(name,hourly_rate_cents,color_hex,city,security_clients(company_name)),security_agents(first_name,last_name)').eq('organization_id', organizationId).gte('starts_at', monthStart).lte('starts_at', monthEnd).order('starts_at')
      ]);
      if (!active) return;
      const firstError = agentResult.error || siteResult.error || shiftResult.error;
      if (firstError) {
        setError(`Chargement impossible : ${firstError.message}`);
        setLoading(false);
        return;
      }
      setAgents((agentResult.data ?? []) as SecurityAgentRecord[]);
      setSites((siteResult.data ?? []) as unknown as SecuritySiteRecord[]);
      setShifts((shiftResult.data ?? []) as unknown as SecurityShiftRecord[]);

      if (essentialEnabled) {
        const [alertResult, patrolResult, logbookResult] = await Promise.all([
          supabase.from('security_alerts').select('id,organization_id,site_id,agent_id,title,message,severity,status,resolved_at,created_at,security_sites!security_alerts_site_fk(name,color_hex),security_agents!security_alerts_agent_fk(first_name,last_name)').eq('organization_id', organizationId).eq('status', 'open').order('created_at', { ascending: false }).limit(20),
          supabase.from('security_patrols').select('id,organization_id,site_id,agent_id,started_at,completed_at,status,notes,created_at,security_sites!security_alerts_site_fk(name,color_hex),security_agents!security_alerts_agent_fk(first_name,last_name),security_patrol_scans(id,organization_id,patrol_id,point_id,scanned_at,status)').eq('organization_id', organizationId).gte('started_at', todayStart.toISOString()).order('started_at', { ascending: false }).limit(20),
          supabase.from('security_logbook_entries').select('id,organization_id,site_id,agent_id,occurred_at,category,severity,title,details,status,created_at,security_sites!security_alerts_site_fk(name,color_hex),security_agents!security_alerts_agent_fk(first_name,last_name)').eq('organization_id', organizationId).gte('occurred_at', todayStart.toISOString()).order('occurred_at', { ascending: false }).limit(12)
        ]);
        if (!alertResult.error) setAlerts((alertResult.data ?? []) as unknown as SecurityAlertRecord[]);
        if (!patrolResult.error) setPatrols((patrolResult.data ?? []) as unknown as SecurityPatrolRecord[]);
        if (!logbookResult.error) setEntries((logbookResult.data ?? []) as unknown as SecurityLogbookEntryRecord[]);
      }
      setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, [organization?.id, organization?.role, organization?.plan, demoMode, essentialEnabled]);

  const activeShifts = shifts.filter((row) => row.status !== 'canceled');
  const minutes = activeShifts.reduce((sum, row) => sum + securityShiftMinutes(row), 0);
  const forecast = activeShifts.reduce((sum, row) => sum + Math.round((securityShiftMinutes(row) / 60) * (row.security_sites?.hourly_rate_cents || 0)), 0);
  const upcoming = useMemo(() => activeShifts.filter((row) => new Date(row.ends_at) >= new Date()).slice(0, 6), [activeShifts]);
  const activePatrols = patrols.filter((row) => row.status === 'in_progress');
  const criticalAlerts = alerts.filter((row) => row.severity === 'critical');
  const setupMissing = [agents.length === 0 ? 'un agent' : '', sites.length === 0 ? 'un site' : ''].filter(Boolean);

  if (!organization) return null;

  if (isAgent) {
    const currentAgent = agents[0];
    return <div className="page security-page security-dashboard-page">
      <header className="page-header"><div><p className="eyebrow">ESPACE AGENT · SÉCURITÉ PRIVÉE</p><h1>{currentAgent ? `Bonjour ${currentAgent.first_name}` : 'Bonjour, ton terrain est prêt.'}</h1><p>Retrouve ton planning, les consignes de tes sites, tes rondes et la main courante.</p></div><Link className="primary-button" to="/consignes"><Icon name="alert" size={18}/>Voir les consignes</Link></header>
      {error && <div className="error-message page-message">{error}</div>}
      {criticalAlerts.length > 0 && <div className="security-callout critical"><Icon name="alert" size={21}/><div><strong>{criticalAlerts.length} alerte{criticalAlerts.length > 1 ? 's' : ''} critique{criticalAlerts.length > 1 ? 's' : ''}</strong><span>Consulte les alertes et applique immédiatement les consignes du site.</span></div></div>}
      <section className="stats-grid"><StatCard label="Missions du mois" value={loading ? '…' : String(activeShifts.length)} detail="affectées à ton compte" icon="calendar"/><StatCard label="Heures programmées" value={loading ? '…' : formatSecurityDuration(minutes)} detail="sur le mois en cours" icon="activity"/><StatCard label="Rondes aujourd’hui" value={loading ? '…' : String(patrols.length)} detail={`${activePatrols.length} en cours`} icon="shield"/><StatCard label="Main courante" value={loading ? '…' : String(entries.length)} detail="saisies aujourd’hui" icon="clipboard"/></section>
      <section className="dashboard-grid"><article className="panel large-panel security-dashboard-schedule"><div className="panel-header"><div><p className="eyebrow">PROCHAINES MISSIONS</p><h2>Mon planning</h2></div><Link className="secondary-button" to="/planning">Tout voir</Link></div>{loading ? <div className="security-empty">Chargement…</div> : upcoming.length === 0 ? <div className="security-empty"><Icon name="calendar" size={30}/><strong>Aucune mission à venir</strong><span>Ton responsable n’a rien planifié sur la période.</span></div> : <div className="security-upcoming-list">{upcoming.map((shift) => <article key={shift.id}><span className="security-record-icon" style={{ background: `${shift.security_sites?.color_hex || '#0A84FF'}22`, color: shift.security_sites?.color_hex || '#0A84FF' }}><Icon name="shield" size={19}/></span><div><strong>{shift.security_sites?.name || 'Site'}</strong><span>{shift.title || 'Mission de sécurité'}</span><small>{formatSecurityDateTime(shift.starts_at)} · {formatSecurityDuration(securityShiftMinutes(shift))}</small></div></article>)}</div>}</article><aside className="panel security-dashboard-actions"><div className="panel-header"><div><p className="eyebrow">ACTIONS TERRAIN</p><h2>Accès rapide</h2></div></div><div className="security-action-list"><Link to="/rondes"><span><Icon name="shield" size={19}/></span><div><strong>Mes rondes QR</strong><small>Démarrer ou poursuivre une ronde</small></div><Icon name="chevronRight" size={17}/></Link><Link to="/main-courante"><span><Icon name="clipboard" size={19}/></span><div><strong>Main courante</strong><small>Ajouter un événement</small></div><Icon name="chevronRight" size={17}/></Link><Link to="/consignes"><span><Icon name="alert" size={19}/></span><div><strong>Consignes & alertes</strong><small>Consulter les informations terrain</small></div><Icon name="chevronRight" size={17}/></Link></div></aside></section>
    </div>;
  }

  return <div className="page security-page security-dashboard-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE · {organization.plan.toUpperCase()}</p><h1>Bonjour, bienvenue sur {organization.name}.</h1><p>{essentialEnabled ? 'Pilote le bureau et suis les premières opérations terrain.' : 'Pilote les agents, les sites, les heures programmées et la facturation prévisionnelle.'}</p></div><div className="header-actions"><Link className="secondary-button" to="/sites?new=1"><Icon name="map" size={18}/>Ajouter un site</Link><Link className="primary-button" to="/planning"><Icon name="calendar" size={18}/>Planifier</Link></div></header>
    {error && <div className="error-message page-message">{error}</div>}
    {setupMissing.length > 0 && !loading && <div className="security-callout"><Icon name="alert" size={20}/><div><strong>Finalise la configuration</strong><span>Ajoute {setupMissing.join(' et ')} pour exploiter le planning et la facturation.</span></div></div>}
    {essentialEnabled && criticalAlerts.length > 0 && <div className="security-callout critical"><Icon name="alert" size={21}/><div><strong>{criticalAlerts.length} alerte{criticalAlerts.length > 1 ? 's' : ''} critique{criticalAlerts.length > 1 ? 's' : ''}</strong><span>Une prise en charge immédiate est attendue.</span></div><Link className="secondary-button compact-button" to="/consignes">Traiter</Link></div>}
    <section className="stats-grid"><StatCard label="Agents actifs" value={loading ? '…' : String(agents.length)} detail={`${sites.length} site(s) actif(s)`} icon="users"/><StatCard label="Heures programmées" value={loading ? '…' : formatSecurityDuration(minutes)} detail="ce mois-ci" icon="calendar"/><StatCard label="Prévision HT" value={loading ? '…' : formatSecurityMoney(forecast)} detail="heures planifiées × tarif site" icon="creditCard"/><StatCard label={essentialEnabled ? 'Alertes ouvertes' : 'Sites actifs'} value={loading ? '…' : String(essentialEnabled ? alerts.length : sites.length)} detail={essentialEnabled ? `${activePatrols.length} ronde(s) en cours` : 'avec tarif horaire'} icon={essentialEnabled ? 'alert' : 'map'}/></section>
    <section className="dashboard-grid"><article className="panel large-panel security-dashboard-schedule"><div className="panel-header"><div><p className="eyebrow">PROCHAINES MISSIONS</p><h2>Planning à venir</h2></div><Link className="secondary-button" to="/planning">Voir le planning</Link></div>{loading ? <div className="security-empty">Chargement…</div> : upcoming.length === 0 ? <div className="security-empty"><Icon name="calendar" size={30}/><strong>Aucune mission à venir</strong><span>Le planning est prêt à être alimenté.</span></div> : <div className="security-upcoming-list">{upcoming.map((shift) => <article key={shift.id}><span className="security-record-icon" style={{ background: `${shift.security_sites?.color_hex || '#0A84FF'}22`, color: shift.security_sites?.color_hex || '#0A84FF' }}><Icon name="shield" size={19}/></span><div><strong>{shift.security_agents ? securityPersonName(shift.security_agents.first_name, shift.security_agents.last_name) : 'Agent'}</strong><span>{shift.security_sites?.name || 'Site'} · {shift.security_sites?.security_clients?.company_name || 'Client'}</span><small>{formatSecurityDateTime(shift.starts_at)} · {formatSecurityDuration(securityShiftMinutes(shift))}</small></div><b>{formatSecurityMoney(Math.round((securityShiftMinutes(shift) / 60) * (shift.security_sites?.hourly_rate_cents || 0)))}</b></article>)}</div>}</article><aside className="panel security-dashboard-actions"><div className="panel-header"><div><p className="eyebrow">RACCOURCIS</p><h2>{essentialEnabled ? 'Pilotage terrain' : 'Préparer l’activité'}</h2></div></div><div className="security-action-list">{essentialEnabled && <><Link to="/consignes"><span><Icon name="alert" size={19}/></span><div><strong>Alertes terrain</strong><small>{alerts.length} à suivre</small></div><Icon name="chevronRight" size={17}/></Link><Link to="/main-courante"><span><Icon name="clipboard" size={19}/></span><div><strong>Main courante</strong><small>{entries.length} événement(s) aujourd’hui</small></div><Icon name="chevronRight" size={17}/></Link><Link to="/rondes"><span><Icon name="shield" size={19}/></span><div><strong>Rondes QR</strong><small>{activePatrols.length} en cours</small></div><Icon name="chevronRight" size={17}/></Link><Link to="/acces-equipe"><span><Icon name="users" size={19}/></span><div><strong>Accès agents</strong><small>Inviter jusqu’à 10 agents</small></div><Icon name="chevronRight" size={17}/></Link></>}<Link to="/agents?new=1"><span><Icon name="users" size={19}/></span><div><strong>Nouvel agent</strong><small>Compléter l’effectif</small></div><Icon name="chevronRight" size={17}/></Link><Link to="/facturation"><span><Icon name="creditCard" size={19}/></span><div><strong>Facturation</strong><small>Préfactures et factures réalisées</small></div><Icon name="chevronRight" size={17}/></Link></div></aside></section>
    <section className="panel security-discovery-rule"><span><Icon name="shield" size={25}/></span><div><p className="eyebrow">OFFRE {organization.plan.toUpperCase()}</p><h2>{essentialEnabled ? 'Le terrain est connecté' : 'Une gestion bureau simple'}</h2><p>{essentialEnabled ? 'Jusqu’à 10 agents peuvent consulter leur planning, effectuer leurs rondes QR, alimenter la main courante et recevoir les consignes de leurs sites.' : 'Cette formule ne donne pas encore d’accès terrain aux agents. Les rondes QR, la main courante intelligente et les connexions agents sont disponibles avec l’offre Essentielle.'}</p></div></section>
  </div>;
}
