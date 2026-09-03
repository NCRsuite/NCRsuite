import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import '../beautyUniverse.css';

type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

interface AppointmentSummary {
  starts_at: string;
  status: AppointmentStatus;
  amount_cents: number | null;
  client_id: string;
  site_id: string | null;
  company_id?: string | null;
}

interface BeautyCompany {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  booking_enabled: boolean;
  is_primary: boolean;
  status: string;
  brand_count: number;
  site_count: number;
  staff_count: number;
  service_count: number;
}

interface BeautySimpleConfig {
  companies: BeautyCompany[];
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function statusLabel(status: AppointmentStatus) {
  if (status === 'confirmed') return 'Confirmé';
  if (status === 'pending') return 'À confirmer';
  if (status === 'completed') return 'Terminé';
  if (status === 'no_show') return 'Absent';
  return 'Annulé';
}

function formatAppointmentDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const day = sameDay(date, today)
    ? "Aujourd'hui"
    : sameDay(date, tomorrow)
      ? 'Demain'
      : new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }).format(date);
  const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
  return { day, time };
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});

export function BookingDashboardPage() {
  const { organization, activeSite, activeSiteId } = useOrganization();
  const { demoMode } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [structure, setStructure] = useState<BeautySimpleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [structureLoading, setStructureLoading] = useState(false);

  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const canConfigure = ['owner', 'admin'].includes(organization?.role ?? 'viewer');
  const isPersonalView = ['employee', 'viewer'].includes(organization?.role ?? 'viewer');

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;

    async function loadActivity() {
      setLoading(true);
      const weekStart = startOfWeek(new Date());
      const weekEnd = addDays(weekStart, 7);

      if (demoMode || !supabase) {
        const rawAppointments = localStorage.getItem(`ncr-suite-demo-appointments-${organizationId}`);
        const rawClients = localStorage.getItem(`ncr-suite-demo-clients-${organizationId}`);
        if (active) {
          setAppointments(rawAppointments ? JSON.parse(rawAppointments) as AppointmentSummary[] : []);
          setClientCount(rawClients ? (JSON.parse(rawClients) as unknown[]).length : 0);
          setLoading(false);
        }
        return;
      }

      let appointmentsQuery = supabase
        .from('appointments')
        .select('starts_at,status,amount_cents,client_id,site_id,company_id')
        .eq('organization_id', organizationId)
        .gte('starts_at', weekStart.toISOString())
        .lt('starts_at', weekEnd.toISOString())
        .order('starts_at', { ascending: true });

      if (organization.plan === 'metier' && activeSiteId) {
        appointmentsQuery = appointmentsQuery.eq('site_id', activeSiteId);
      }

      const [appointmentsResult, clientsResult] = await Promise.all([
        appointmentsQuery,
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active')
      ]);

      if (!active) return;
      if (!appointmentsResult.error) {
        const rows = (appointmentsResult.data ?? []) as AppointmentSummary[];
        setAppointments(rows);
        if (organization.plan === 'metier' && activeSiteId) {
          setClientCount(new Set(rows.map((row) => row.client_id)).size);
        } else if (!clientsResult.error) {
          setClientCount(clientsResult.count ?? 0);
        }
      }
      setLoading(false);
    }

    void loadActivity();
    return () => { active = false; };
  }, [organization?.id, organization?.plan, activeSiteId, demoMode]);

  useEffect(() => {
    if (!organization || organization.plan !== 'metier' || !canConfigure || !supabase || demoMode) {
      setStructure(null);
      setStructureLoading(false);
      return;
    }

    let active = true;
    setStructureLoading(true);
    void supabase.rpc('metier_simple_configuration', { p_organization_id: organization.id }).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setStructure(null);
      } else {
        const payload = (data ?? { companies: [] }) as BeautySimpleConfig;
        setStructure({ companies: Array.isArray(payload.companies) ? payload.companies.filter((company) => company.status === 'active') : [] });
      }
      setStructureLoading(false);
    });

    return () => { active = false; };
  }, [organization?.id, organization?.plan, canConfigure, demoMode]);

  const now = new Date();
  const todayCount = appointments.filter((row) => row.status !== 'cancelled' && sameDay(new Date(row.starts_at), now)).length;
  const activeAppointments = appointments.filter((row) => row.status !== 'cancelled');
  const pendingCount = appointments.filter((row) => row.status === 'pending').length;
  const forecast = activeAppointments.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
  const upcoming = useMemo(
    () => activeAppointments.filter((row) => new Date(row.starts_at).getTime() >= Date.now()).slice(0, 4),
    [appointments]
  );

  if (!organization) return null;

  const companies = structure?.companies ?? [];
  const centerMode = organization.plan === 'metier' && companies.length > 1;
  const singleCompany = companies.find((company) => company.is_primary) ?? companies[0] ?? null;
  const receptionReady = companies.filter((company) => company.booking_enabled && company.site_count > 0 && company.service_count > 0 && company.staff_count > 0);

  const setupChecks = singleCompany ? [
    { label: 'Votre activité', detail: 'Identité et informations principales', done: true, path: '/offre-metier' },
    { label: 'Votre établissement', detail: 'Adresse et lieu de rendez-vous', done: singleCompany.site_count > 0, path: '/offre-metier' },
    { label: 'Vos prestations', detail: 'Services, durées et tarifs', done: singleCompany.service_count > 0, path: '/prestations' },
    { label: 'Votre équipe', detail: 'Collaborateurs et disponibilités', done: singleCompany.staff_count > 0, path: '/equipe' },
    { label: 'Réservation en ligne', detail: 'Page publique et prise de rendez-vous', done: singleCompany.booking_enabled, path: '/offre-metier' }
  ] : [
    { label: 'Votre activité', detail: 'Créez votre salon ou votre première activité', done: false, path: '/offre-metier' },
    { label: 'Votre établissement', detail: 'Ajoutez votre adresse', done: false, path: '/offre-metier' },
    { label: 'Vos prestations', detail: 'Ajoutez ce que vous proposez', done: false, path: '/prestations' },
    { label: 'Votre équipe', detail: 'Ajoutez vos collaborateurs', done: false, path: '/equipe' },
    { label: 'Réservation en ligne', detail: 'Publiez votre page', done: false, path: '/offre-metier' }
  ];
  const completedSetup = setupChecks.filter((step) => step.done).length;
  const setupPercent = Math.round((completedSetup / setupChecks.length) * 100);
  const ringStyle = { '--value': setupPercent } as CSSProperties;

  const heroTitle = isPersonalView
    ? `Bonjour, bienvenue sur ${activeSite?.name ?? organization.name}`
    : centerMode
      ? organization.name
      : singleCompany?.name || activeSite?.name || organization.name;

  return (
    <div className="page beauty-universe-page">
      <header className="beauty-hero">
        <div className="beauty-hero-copy">
          <span className="beauty-hero-badge"><i /> Coiffure & Beauté</span>
          <h1>{heroTitle}</h1>
          <p>{isPersonalView
            ? 'Votre journée, vos rendez-vous et vos clients dans un espace simple.'
            : centerMode
              ? 'Pilotez toutes les activités de votre centre depuis un seul espace, tout en gardant chaque entreprise indépendante.'
              : 'Votre activité, vos rendez-vous et les réglages essentiels au même endroit.'}</p>
          {!isPersonalView && organization.plan === 'metier' && (
            <div className="beauty-mode-pill">
              <span className="beauty-mode-icon"><Icon name={centerMode ? 'building' : 'scissors'} size={18} /></span>
              <span><strong>{centerMode ? 'Centre multi-entreprises' : 'Salon / activité indépendante'}</strong><br />{centerMode ? `${companies.length} entreprises dans cet espace` : 'Parcours simplifié Coiffure & Beauté'}</span>
            </div>
          )}
        </div>
        <div className="beauty-hero-actions">
          {canManage ? <Link className="primary-button" to="/rendez-vous?new=1"><Icon name="plus" size={17} /> Nouveau rendez-vous</Link> : <Link className="primary-button" to="/rendez-vous"><Icon name="calendar" size={17} /> Mon planning</Link>}
          {canConfigure && centerMode && receptionReady.length > 0
            ? <Link className="secondary-button" to="/?metier=reception"><Icon name="calendar" size={17} /> Accueil partagé</Link>
            : canConfigure && organization.plan === 'metier'
              ? <Link className="secondary-button" to="/offre-metier"><Icon name="settings" size={17} /> Paramétrer</Link>
              : null}
        </div>
      </header>

      <section className="beauty-kpis" aria-label="Résumé de l'activité">
        <article className="beauty-kpi"><div className="beauty-kpi-head"><small>Aujourd'hui</small><span className="beauty-kpi-icon"><Icon name="calendar" size={18} /></span></div><strong>{loading ? '…' : todayCount}</strong><em>rendez-vous prévus</em></article>
        <article className="beauty-kpi"><div className="beauty-kpi-head"><small>Cette semaine</small><span className="beauty-kpi-icon"><Icon name="activity" size={18} /></span></div><strong>{loading ? '…' : activeAppointments.length}</strong><em>rendez-vous actifs</em></article>
        <article className="beauty-kpi"><div className="beauty-kpi-head"><small>Clients</small><span className="beauty-kpi-icon"><Icon name="users" size={18} /></span></div><strong>{loading ? '…' : clientCount}</strong><em>{activeSite ? 'vus sur cet établissement' : 'clients actifs'}</em></article>
        <article className="beauty-kpi"><div className="beauty-kpi-head"><small>Prévisionnel</small><span className="beauty-kpi-icon"><Icon name="chart" size={18} /></span></div><strong>{loading ? '…' : currencyFormatter.format(forecast / 100)}</strong><em>sur la semaine</em></article>
      </section>

      <section className="beauty-main-grid">
        <article className="beauty-card">
          <div className="beauty-card-heading"><div><p>ACCÈS RAPIDES</p><h2>Que souhaitez-vous faire ?</h2></div><span>{pendingCount > 0 ? `${pendingCount} rendez-vous à confirmer` : 'Tout est à jour'}</span></div>
          <div className="beauty-day-actions">
            <Link className="beauty-action-tile" to="/rendez-vous"><span><Icon name="calendar" size={20} /></span><span><strong>Agenda</strong><small>Voir et organiser les rendez-vous</small></span><Icon name="chevronRight" size={16} /></Link>
            <Link className="beauty-action-tile" to="/clients"><span><Icon name="users" size={20} /></span><span><strong>Clients</strong><small>Fiches, historique et coordonnées</small></span><Icon name="chevronRight" size={16} /></Link>
            <Link className="beauty-action-tile" to="/prestations"><span><Icon name="sparkles" size={20} /></span><span><strong>Prestations</strong><small>Services, durées et tarifs</small></span><Icon name="chevronRight" size={16} /></Link>
            <Link className="beauty-action-tile" to="/equipe"><span><Icon name="users" size={20} /></span><span><strong>Équipe</strong><small>Collaborateurs et disponibilités</small></span><Icon name="chevronRight" size={16} /></Link>
          </div>
        </article>

        <article className="beauty-card">
          <div className="beauty-card-heading"><div><p>PROCHAINS RENDEZ-VOUS</p><h2>Votre journée</h2></div><Link className="secondary-button compact-button" to="/rendez-vous">Tout voir</Link></div>
          {loading ? <div className="beauty-skeleton" /> : upcoming.length === 0 ? (
            <div className="beauty-next-empty"><span><Icon name="calendar" size={18} /></span><div><strong>Aucun rendez-vous à venir</strong><br /><small>Votre prochain rendez-vous apparaîtra ici.</small></div></div>
          ) : (
            <div className="beauty-next-list">
              {upcoming.map((appointment, index) => {
                const formatted = formatAppointmentDate(appointment.starts_at);
                return <div className="beauty-next-row" key={`${appointment.starts_at}-${appointment.client_id}-${index}`}>
                  <div className="beauty-next-time">{formatted.time}<br /><small>{formatted.day}</small></div>
                  <div className="beauty-next-copy"><strong>Rendez-vous client</strong><small>{appointment.amount_cents ? currencyFormatter.format(appointment.amount_cents / 100) : 'Montant à préciser'}</small></div>
                  <span className={`beauty-status ${appointment.status}`}>{statusLabel(appointment.status)}</span>
                </div>;
              })}
            </div>
          )}
        </article>
      </section>

      {canConfigure && organization.plan === 'metier' && (
        <section className="beauty-center-section">
          {structureLoading ? <div className="beauty-card beauty-skeleton" /> : centerMode ? (
            <>
              <div className="beauty-card-heading"><div><p>VOTRE CENTRE</p><h2>{companies.length} entreprises, une gestion commune</h2></div><Link className="secondary-button" to="/offre-metier"><Icon name="settings" size={16} /> Gérer le centre</Link></div>
              <div className="beauty-company-grid">
                {companies.map((company) => {
                  const ready = company.booking_enabled && company.site_count > 0 && company.service_count > 0 && company.staff_count > 0;
                  return <article className="beauty-company-card" key={company.id}>
                    <div className="beauty-company-top">
                      <span className="beauty-company-logo" style={{ background: company.logo_url ? '#fff' : company.primary_color }}>{company.logo_url ? <img src={company.logo_url} alt="" /> : company.name.slice(0, 1).toUpperCase()}</span>
                      <div><strong>{company.name}</strong><small>{company.is_primary ? 'Activité principale' : 'Entreprise du centre'}</small></div>
                    </div>
                    <div className="beauty-company-metrics"><span><strong>{company.service_count}</strong><small>prestations</small></span><span><strong>{company.staff_count}</strong><small>équipe</small></span><span><strong>{company.site_count}</strong><small>lieux</small></span></div>
                    <div className="beauty-company-foot"><span className={`beauty-company-ready${ready ? '' : ' todo'}`}><Icon name={ready ? 'check' : 'activity'} size={12} /> {ready ? 'Prête à réserver' : 'À terminer'}</span><Link to="/offre-metier">Gérer</Link></div>
                  </article>;
                })}
              </div>
              <div className="beauty-center-tools">
                <Link className="beauty-center-tool" to="/?metier=reception"><span><Icon name="calendar" size={18} /></span><div><strong>Accueil partagé</strong><small>Prendre les rendez-vous de plusieurs entreprises</small></div></Link>
                <Link className="beauty-center-tool" to="/offre-metier"><span><Icon name="building" size={18} /></span><div><strong>Entreprises du centre</strong><small>Identités, adresses et pages publiques</small></div></Link>
                <Link className="beauty-center-tool" to="/offre-metier"><span><Icon name="shield" size={18} /></span><div><strong>Accès & secrétariat</strong><small>Choisir qui peut gérer quoi</small></div></Link>
              </div>
            </>
          ) : (
            <article className="beauty-card beauty-setup">
              <div className="beauty-card-heading"><div><p>MISE EN ROUTE</p><h2>Votre espace Coiffure & Beauté</h2></div><Link className="secondary-button" to="/offre-metier"><Icon name="settings" size={16} /> Paramétrer</Link></div>
              <div className="beauty-setup-banner">
                <div className="beauty-setup-ring" style={ringStyle}><strong>{setupPercent}%</strong></div>
                <div><h3>{setupPercent === 100 ? 'Votre activité est prête ✨' : 'Quelques étapes et votre espace sera prêt'}</h3><p>NCR Suite vous guide sans vous demander de comprendre les réglages techniques.</p></div>
              </div>
              <div className="beauty-setup-steps">
                {setupChecks.map((step) => <div className={`beauty-step${step.done ? ' done' : ''}`} key={step.label}><span><Icon name={step.done ? 'check' : 'chevronRight'} size={14} /></span><div><strong>{step.label}</strong><small>{step.detail}</small></div><Link to={step.path}>{step.done ? 'Modifier' : 'Configurer'}</Link></div>)}
              </div>
            </article>
          )}
        </section>
      )}
    </div>
  );
}
