import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatSecurityDateTime, formatSecurityDuration, formatSecurityMoney, monthRange,
  securityPersonName, securityShiftMinutes, type SecurityAgentRecord, type SecurityShiftRecord, type SecuritySiteRecord
} from '../features/security/types';
import { supabase } from '../lib/supabase';

export function SecurityDashboardPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const [agents, setAgents] = useState<SecurityAgentRecord[]>([]);
  const [sites, setSites] = useState<SecuritySiteRecord[]>([]);
  const [shifts, setShifts] = useState<SecurityShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;
    async function load() {
      setLoading(true); setError('');
      const range = monthRange();
      const monthStart = new Date(`${range.start}T00:00:00`).toISOString();
      const monthEnd = new Date(`${range.end}T23:59:59.999`).toISOString();
      if (demoMode || !supabase) {
        const agentRows = JSON.parse(localStorage.getItem(`ncr-suite-security-agents-${organizationId}`) || '[]') as SecurityAgentRecord[];
        const siteRows = JSON.parse(localStorage.getItem(`ncr-suite-security-sites-${organizationId}`) || '[]') as SecuritySiteRecord[];
        const shiftRows = JSON.parse(localStorage.getItem(`ncr-suite-security-shifts-${organizationId}`) || '[]') as SecurityShiftRecord[];
        if (active) { setAgents(agentRows.filter((row) => row.status === 'active')); setSites(siteRows.filter((row) => row.status === 'active')); setShifts(shiftRows.filter((row) => row.starts_at >= monthStart && row.starts_at <= monthEnd)); setLoading(false); }
        return;
      }
      const [agentResult, siteResult, shiftResult] = await Promise.all([
        supabase.from('security_agents').select('id,organization_id,first_name,last_name,employee_number,email,phone,contract_type,weekly_hours,notes,status,created_at').eq('organization_id', organizationId).eq('status', 'active'),
        supabase.from('security_sites').select('id,organization_id,client_id,name,code,address,postal_code,city,contact_name,contact_phone,hourly_rate_cents,timezone,notes,status,created_at,security_clients(company_name)').eq('organization_id', organizationId).eq('status', 'active'),
        supabase.from('security_shifts').select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,created_at,security_sites(name,hourly_rate_cents,city,security_clients(company_name)),security_agents(first_name,last_name)').eq('organization_id', organizationId).gte('starts_at', monthStart).lte('starts_at', monthEnd).order('starts_at')
      ]);
      if (!active) return;
      const firstError = agentResult.error || siteResult.error || shiftResult.error;
      if (firstError) setError(`Chargement impossible : ${firstError.message}`);
      else { setAgents((agentResult.data ?? []) as SecurityAgentRecord[]); setSites((siteResult.data ?? []) as unknown as SecuritySiteRecord[]); setShifts((shiftResult.data ?? []) as unknown as SecurityShiftRecord[]); }
      setLoading(false);
    }
    void load(); return () => { active = false; };
  }, [organization, demoMode]);

  const activeShifts = shifts.filter((row) => row.status !== 'canceled');
  const minutes = activeShifts.reduce((sum, row) => sum + securityShiftMinutes(row), 0);
  const forecast = activeShifts.reduce((sum, row) => sum + Math.round((securityShiftMinutes(row) / 60) * (row.security_sites?.hourly_rate_cents || 0)), 0);
  const upcoming = useMemo(() => activeShifts.filter((row) => new Date(row.ends_at) >= new Date()).slice(0, 6), [activeShifts]);
  const unassignedSetup = [agents.length === 0 ? 'agents' : '', sites.length === 0 ? 'sites' : ''].filter(Boolean);

  if (!organization) return null;
  return <div className="page security-page security-dashboard-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE · DÉCOUVERTE</p><h1>Bonjour, bienvenue sur {organization.name}.</h1><p>Pilote les agents, les sites, les heures programmées et la facturation prévisionnelle.</p></div><div className="header-actions"><Link className="secondary-button" to="/sites?new=1"><Icon name="map" size={18}/>Ajouter un site</Link><Link className="primary-button" to="/planning"><Icon name="calendar" size={18}/>Planifier</Link></div></header>
    {error && <div className="error-message page-message">{error}</div>}
    {unassignedSetup.length > 0 && !loading && <div className="security-callout"><Icon name="alert" size={20}/><div><strong>Finalise la configuration</strong><span>Ajoute {unassignedSetup.join(' et ')} pour exploiter le planning et la facturation.</span></div></div>}
    <section className="stats-grid"><StatCard label="Agents actifs" value={loading ? '…' : String(agents.length)} detail="fichier opérationnel" icon="users"/><StatCard label="Sites actifs" value={loading ? '…' : String(sites.length)} detail="avec tarif horaire" icon="map"/><StatCard label="Heures programmées" value={loading ? '…' : formatSecurityDuration(minutes)} detail="ce mois-ci" icon="calendar"/><StatCard label="Prévision HT" value={loading ? '…' : formatSecurityMoney(forecast)} detail="heures planifiées × tarif site" icon="creditCard"/></section>
    <section className="dashboard-grid"><article className="panel large-panel security-dashboard-schedule"><div className="panel-header"><div><p className="eyebrow">PROCHAINES MISSIONS</p><h2>Planning à venir</h2></div><Link className="secondary-button" to="/planning">Voir le planning</Link></div>{loading ? <div className="security-empty">Chargement…</div> : upcoming.length === 0 ? <div className="security-empty"><Icon name="calendar" size={30}/><strong>Aucune mission à venir</strong><span>Le planning est prêt à être alimenté.</span></div> : <div className="security-upcoming-list">{upcoming.map((shift) => <article key={shift.id}><span className="security-record-icon"><Icon name="shield" size={19}/></span><div><strong>{shift.security_agents ? securityPersonName(shift.security_agents.first_name, shift.security_agents.last_name) : 'Agent'}</strong><span>{shift.security_sites?.name || 'Site'} · {shift.security_sites?.security_clients?.company_name || 'Client'}</span><small>{formatSecurityDateTime(shift.starts_at)} · {formatSecurityDuration(securityShiftMinutes(shift))}</small></div><b>{formatSecurityMoney(Math.round((securityShiftMinutes(shift) / 60) * (shift.security_sites?.hourly_rate_cents || 0)))}</b></article>)}</div>}</article>
      <aside className="panel security-dashboard-actions"><div className="panel-header"><div><p className="eyebrow">RACCOURCIS</p><h2>Préparer l’activité</h2></div></div><div className="security-action-list"><Link to="/clients?new=1"><span><Icon name="building" size={19}/></span><div><strong>Nouveau client</strong><small>Créer le donneur d’ordre</small></div><Icon name="chevronRight" size={17}/></Link><Link to="/agents?new=1"><span><Icon name="users" size={19}/></span><div><strong>Nouvel agent</strong><small>Compléter l’effectif</small></div><Icon name="chevronRight" size={17}/></Link><Link to="/facturation"><span><Icon name="creditCard" size={19}/></span><div><strong>Facturation</strong><small>Générer une préfacture</small></div><Icon name="chevronRight" size={17}/></Link></div></aside></section>
    <section className="panel security-discovery-rule"><span><Icon name="shield" size={25}/></span><div><p className="eyebrow">OFFRE DÉCOUVERTE</p><h2>Une gestion bureau simple</h2><p>Cette formule ne donne pas encore d’accès terrain aux agents. Les rondes QR, la main courante intelligente et les connexions agents arriveront avec l’offre Essentielle.</p></div></section>
  </div>;
}
