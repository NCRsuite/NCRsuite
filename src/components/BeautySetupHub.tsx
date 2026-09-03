import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';
import { MetierSimpleSetup } from './MetierSimpleSetup';
import '../beautySetupHub.css';

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

interface BeautyLocation {
  id: string;
  status: string;
}

interface BeautyMember {
  user_id: string;
  role: string;
  shared_reception_enabled: boolean;
}

interface BeautyConfig {
  companies: BeautyCompany[];
  locations: BeautyLocation[];
  members: BeautyMember[];
}

export function BeautySetupHub({ onOpenReception, onOpenAdvanced }: {
  onOpenReception: () => void;
  onOpenAdvanced: () => void;
}) {
  const { organization } = useOrganization();
  const [config, setConfig] = useState<BeautyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetailed, setShowDetailed] = useState(false);

  const canManage = ['owner', 'admin'].includes(organization?.role ?? 'viewer');

  useEffect(() => {
    if (!organization || organization.plan !== 'metier' || !canManage || !supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    void supabase.rpc('metier_simple_configuration', { p_organization_id: organization.id }).then(({ data, error: requestError }) => {
      if (!active) return;
      if (requestError) {
        setError(requestError.message);
        setConfig(null);
      } else {
        const payload = (data ?? { companies: [], locations: [], members: [] }) as BeautyConfig;
        setConfig({
          companies: Array.isArray(payload.companies) ? payload.companies.filter((company) => company.status === 'active') : [],
          locations: Array.isArray(payload.locations) ? payload.locations.filter((location) => location.status === 'active') : [],
          members: Array.isArray(payload.members) ? payload.members : []
        });
      }
      setLoading(false);
    });

    return () => { active = false; };
  }, [organization?.id, organization?.plan, canManage]);

  const companies = config?.companies ?? [];
  const centerMode = companies.length > 1;
  const primaryCompany = companies.find((company) => company.is_primary) ?? companies[0] ?? null;
  const readyCompanies = useMemo(
    () => companies.filter((company) => company.booking_enabled && company.site_count > 0 && company.service_count > 0 && company.staff_count > 0),
    [companies]
  );
  const receptionUsers = useMemo(
    () => (config?.members ?? []).filter((member) => member.shared_reception_enabled).length,
    [config?.members]
  );

  const singleSteps = primaryCompany ? [
    { label: 'Votre activité', detail: 'Nom, identité et informations principales', done: true, icon: 'building' as const, action: 'detail' as const },
    { label: 'Votre établissement', detail: 'Adresse et lieu de rendez-vous', done: primaryCompany.site_count > 0, icon: 'building' as const, action: 'detail' as const },
    { label: 'Vos prestations', detail: 'Services, durées et tarifs', done: primaryCompany.service_count > 0, icon: 'sparkles' as const, path: '/prestations' },
    { label: 'Votre équipe', detail: 'Collaborateurs et disponibilités', done: primaryCompany.staff_count > 0, icon: 'users' as const, path: '/equipe' },
    { label: 'Réservation en ligne', detail: 'Page publique et rendez-vous', done: primaryCompany.booking_enabled, icon: 'calendar' as const, action: 'detail' as const }
  ] : [
    { label: 'Votre activité', detail: 'Créez votre salon ou votre première activité', done: false, icon: 'building' as const, action: 'detail' as const },
    { label: 'Votre établissement', detail: 'Ajoutez votre adresse', done: false, icon: 'building' as const, action: 'detail' as const },
    { label: 'Vos prestations', detail: 'Ajoutez ce que vous proposez', done: false, icon: 'sparkles' as const, path: '/prestations' },
    { label: 'Votre équipe', detail: 'Ajoutez vos collaborateurs', done: false, icon: 'users' as const, path: '/equipe' },
    { label: 'Réservation en ligne', detail: 'Publiez votre page', done: false, icon: 'calendar' as const, action: 'detail' as const }
  ];

  if (!organization || organization.plan !== 'metier') return null;

  function openDetails() {
    setShowDetailed(true);
    window.setTimeout(() => document.querySelector('.beauty-detailed-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  return (
    <div className="metier-simple-page beauty-setup-hub">
      <header className="beauty-setup-hero">
        <div className="beauty-setup-hero-top">
          <div className="beauty-setup-hero-copy">
            <p className="eyebrow">COIFFURE & BEAUTÉ</p>
            <h1>{centerMode ? 'Configurer votre centre' : 'Configurer votre activité'}</h1>
            <p>{centerMode
              ? 'Chaque entreprise garde son identité, son équipe, ses prestations et sa page publique. Le centre réunit seulement ce qui doit l’être : l’adresse, l’accueil et les accès.'
              : 'Suivez quelques étapes simples. NCR Suite s’occupe des liens techniques en arrière-plan.'}</p>
            <div className="beauty-setup-mode">
              <span><Icon name={centerMode ? 'building' : 'scissors'} size={19} /></span>
              <div><strong>{centerMode ? 'Centre multi-entreprises' : 'Salon / activité indépendante'}</strong><small>{centerMode ? `${companies.length} entreprises détectées dans ce centre` : 'Parcours simplifié Coiffure & Beauté'}</small></div>
            </div>
          </div>
          <button type="button" className="secondary-button" onClick={onOpenAdvanced}><Icon name="tool" size={16} /> Réglages avancés</button>
        </div>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {loading ? <section className="beauty-hub-section beauty-hub-loading" /> : (
        <>
          <section className="beauty-setup-summary" aria-label="Résumé de la configuration">
            <article><small>{centerMode ? 'Entreprises' : 'Activité'}</small><strong>{centerMode ? companies.length : primaryCompany ? 1 : 0}</strong></article>
            <article><small>Adresse{(config?.locations.length ?? 0) > 1 ? 's' : ''}</small><strong>{config?.locations.length ?? 0}</strong></article>
            <article><small>Prêtes à réserver</small><strong>{centerMode ? readyCompanies.length : primaryCompany?.booking_enabled ? 1 : 0}</strong></article>
            <article><small>Accès secrétariat</small><strong>{receptionUsers}</strong></article>
          </section>

          {!centerMode ? (
            <section className="beauty-hub-section">
              <div className="beauty-hub-heading"><div><p>MISE EN ROUTE</p><h2>Tout préparer en 5 étapes</h2></div><span>Vous pouvez revenir modifier chaque étape à tout moment.</span></div>
              <div className="beauty-guide-grid">
                {singleSteps.map((step, index) => (
                  <article className={`beauty-guide-step${step.done ? ' done' : ''}`} key={step.label}>
                    <div className="beauty-guide-index"><span><Icon name={step.done ? 'check' : step.icon} size={16} /></span><b>Étape {index + 1}</b></div>
                    <h3>{step.label}</h3>
                    <p>{step.detail}</p>
                    {'path' in step && step.path
                      ? <Link to={step.path}>{step.done ? 'Modifier' : 'Configurer'} →</Link>
                      : <button type="button" onClick={openDetails}>{step.done ? 'Modifier' : 'Configurer'} →</button>}
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <>
              <section className="beauty-hub-section">
                <div className="beauty-hub-heading"><div><p>GESTION DU CENTRE</p><h2>Un centre commun, des entreprises indépendantes</h2></div><span>Pas besoin de changer de compte pour gérer le centre.</span></div>
                <div className="beauty-center-hub-grid">
                  <button type="button" className="beauty-center-hub-card" onClick={openDetails}><span><Icon name="building" size={20} /></span><div><strong>Mes entreprises</strong><small>Ajouter une activité, gérer son identité et son rattachement au centre.</small></div><Icon name="chevronRight" size={17} /></button>
                  <button type="button" className="beauty-center-hub-card" onClick={openDetails}><span><Icon name="map" size={20} /></span><div><strong>Adresse du centre</strong><small>Réutiliser la même adresse pour plusieurs entreprises sans les fusionner.</small></div><Icon name="chevronRight" size={17} /></button>
                  <button type="button" className="beauty-center-hub-card" onClick={onOpenReception}><span><Icon name="calendar" size={20} /></span><div><strong>Accueil partagé</strong><small>Prendre les rendez-vous de toutes les entreprises autorisées.</small></div><Icon name="chevronRight" size={17} /></button>
                  <button type="button" className="beauty-center-hub-card" onClick={openDetails}><span><Icon name="shield" size={20} /></span><div><strong>Accès & secrétariat</strong><small>Choisir quelles entreprises chaque personne peut voir ou gérer.</small></div><Icon name="chevronRight" size={17} /></button>
                </div>
              </section>

              <section className="beauty-hub-section">
                <div className="beauty-hub-heading"><div><p>ENTREPRISES DU CENTRE</p><h2>État de vos activités</h2></div><span>{readyCompanies.length}/{companies.length} prêtes à recevoir des rendez-vous</span></div>
                <div className="beauty-company-config-list">
                  {companies.map((company) => {
                    const ready = company.booking_enabled && company.site_count > 0 && company.service_count > 0 && company.staff_count > 0;
                    return <article className="beauty-company-config-card" key={company.id}>
                      <div className="beauty-company-config-head">
                        <span className="beauty-company-config-logo" style={{ background: company.logo_url ? '#fff' : company.primary_color }}>{company.logo_url ? <img src={company.logo_url} alt="" /> : company.name.slice(0, 1).toUpperCase()}</span>
                        <div><strong>{company.name}</strong><small>{company.is_primary ? 'Entreprise principale' : 'Entreprise du centre'}</small></div>
                      </div>
                      <div className="beauty-company-readiness"><span><strong>{company.service_count}</strong><small>prestations</small></span><span><strong>{company.staff_count}</strong><small>équipe</small></span><span><strong>{company.site_count}</strong><small>lieux</small></span></div>
                      <div className="beauty-company-config-foot"><span className={ready ? '' : 'todo'}><Icon name={ready ? 'check' : 'activity'} size={11} /> {ready ? 'Prête' : 'À terminer'}</span><button type="button" onClick={openDetails}>Gérer</button></div>
                    </article>;
                  })}
                </div>
              </section>
            </>
          )}

          <section className="beauty-detail-gate">
            <div><span><Icon name="settings" size={18} /></span><div><strong>Besoin d’un réglage plus précis ?</strong><small>Les paramètres détaillés restent disponibles, mais ne sont plus imposés dans le parcours principal.</small></div></div>
            <button type="button" className="secondary-button" onClick={() => setShowDetailed((current) => !current)}>{showDetailed ? 'Masquer les réglages détaillés' : 'Ouvrir les réglages détaillés'}</button>
          </section>

          {showDetailed && (
            <section className="beauty-detailed-wrap">
              <div className="beauty-detailed-bar"><div><strong>Réglages détaillés</strong><small>Entreprises, enseignes, adresses, ressources et accès.</small></div><button type="button" className="secondary-button compact-button" onClick={() => setShowDetailed(false)}>Fermer</button></div>
              <MetierSimpleSetup onOpenReception={onOpenReception} onOpenAdvanced={onOpenAdvanced} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
