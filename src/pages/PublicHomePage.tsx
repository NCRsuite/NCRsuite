import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageMetadata } from '../components/PageMetadata';
import { PublicSiteFooter } from '../components/PublicSiteFooter';
import { PublicSiteHeader } from '../components/PublicSiteHeader';
import { formatPublicMonthlyPrice, publicOfferCatalog } from '../config/publicOfferCatalog';
import type { IconName } from '../types';

type PublicBusiness = {
  key: string;
  name: string;
  label: string;
  icon: IconName;
  color: string;
  summary: string;
  outcome: string;
  features: string[];
  path: string;
};

const businesses: PublicBusiness[] = [
  {
    key: 'formation',
    name: 'Formation',
    label: 'Organismes de formation',
    icon: 'graduation',
    color: '#0878f9',
    summary: 'Du premier prospect jusqu’au BPF, chaque étape du parcours reste liée et exploitable',
    outcome: 'Commercial, pédagogique, qualité et finance réunis',
    features: ['CRM et pipeline commercial', 'Catalogue et programmes', 'Sessions et émargements', 'Évaluations automatisées', 'Facturation et BPF', 'Qualiopi et preuves'],
    path: '/logiciel-gestion-formation'
  },
  {
    key: 'securite',
    name: 'Sécurité privée',
    label: 'Entreprises de sécurité',
    icon: 'shield',
    color: '#d92d20',
    summary: 'Les équipes du bureau et du terrain partagent enfin le même niveau d’information',
    outcome: 'Des opérations suivies, traçables et facturables',
    features: ['Clients, sites et contrats', 'Agents et agréments', 'Planning et vacations', 'Rondes QR et PTI', 'Main courante terrain', 'Facturation et portail client'],
    path: '/logiciel-securite-privee'
  },
  {
    key: 'nettoyage',
    name: 'Nettoyage',
    label: 'Propreté et multiservices',
    icon: 'sparkles',
    color: '#07865c',
    summary: 'Chaque intervention devient une prestation planifiée, prouvée et mesurable',
    outcome: 'Qualité terrain et rentabilité dans un même flux',
    features: ['Clients et sites', 'Agents et affectations', 'Pointage et consignes', 'Rapports et anomalies', 'Contrôles qualité', 'Stocks et rentabilité'],
    path: '/logiciel-entreprise-nettoyage'
  },
  {
    key: 'restauration',
    name: 'Restauration',
    label: 'Restaurants et établissements',
    icon: 'utensils',
    color: '#b36a08',
    summary: 'La salle, la cuisine et la gestion avancent avec une vision commune du service',
    outcome: 'Une exploitation fluide, du couvert jusqu’au stock',
    features: ['Réservations et plan de salle', 'Carte et recettes', 'Commandes et écran cuisine', 'Planning des équipes', 'Hygiène et traçabilité', 'Stocks et pilotage'],
    path: '/logiciel-gestion-restaurant'
  },
  {
    key: 'coiffure',
    name: 'Coiffure & beauté',
    label: 'Salons et instituts',
    icon: 'scissors',
    color: '#9b3db4',
    summary: 'Les rendez-vous, l’équipe et la fidélité client se pilotent sans alourdir l’accueil',
    outcome: 'Une relation client suivie avant et après la visite',
    features: ['Réservation en ligne', 'Planning du salon', 'Fichier client', 'Prestations et équipe', 'Fidélité personnalisée', 'Espace client'],
    path: '/logiciel-coiffure'
  }
];

const platformPoints: Array<{ icon: IconName; title: string; text: string; number: string; metric: string; visual: string }> = [
  { icon: 'briefcase', title: 'Une expérience par métier', text: 'Menus, indicateurs et automatisations suivent la réalité opérationnelle de chaque entreprise.', number: '01', metric: '5 univers prêts', visual: 'domains' },
  { icon: 'tool', title: 'Un catalogue modulaire', text: 'Activez les fonctions utiles, visualisez les suivantes et changez de formule au bon moment.', number: '02', metric: 'Montée en gamme lisible', visual: 'modules' },
  { icon: 'shield', title: 'Des accès maîtrisés', text: 'Équipes, clients, formateurs et intervenants disposent chacun d’un espace adapté à leur rôle.', number: '03', metric: 'Un espace par rôle', visual: 'access' },
  { icon: 'monitor', title: 'Une PWA partout', text: 'Le même environnement rapide et cohérent accompagne le bureau comme le terrain.', number: '04', metric: 'Bureau + terrain', visual: 'devices' }
];

const operatingFlow: Array<{ step: string; title: string; text: string; outcome: string; icon: IconName }> = [
  { step: '01', title: 'Collecter', text: 'Clients, équipes, besoins et documents entrent au bon endroit.', outcome: 'Données qualifiées', icon: 'users' },
  { step: '02', title: 'Orchestrer', text: 'Plannings, tâches et automatisations font circuler l’information.', outcome: 'Actions coordonnées', icon: 'activity' },
  { step: '03', title: 'Prouver', text: 'Signatures, contrôles et historiques sécurisent chaque dossier.', outcome: 'Preuves horodatées', icon: 'shield' },
  { step: '04', title: 'Piloter', text: 'Les indicateurs transforment l’activité en décisions concrètes.', outcome: 'Décisions éclairées', icon: 'chart' }
];

const heroSignals: Array<{ key: string; icon: IconName; eyebrow: string; metric: string; label: string; detail: string; status: string }> = [
  { key: 'clients', icon: 'users', eyebrow: 'RELATION CLIENT', metric: '8', label: 'opportunités actives', detail: '2 décisions aujourd’hui', status: '+12 %' },
  { key: 'planning', icon: 'calendar', eyebrow: 'PLANNING', metric: '28', label: 'actions coordonnées', detail: 'Semaine maîtrisée', status: 'À jour' },
  { key: 'documents', icon: 'file', eyebrow: 'DOCUMENTS', metric: '14', label: 'dossiers prêts', detail: '3 automatisés à l’instant', status: 'Prêts' },
  { key: 'quality', icon: 'shield', eyebrow: 'CONFORMITÉ', metric: '91 %', label: 'preuves complètes', detail: 'Aucune anomalie critique', status: 'Conforme' }
];

function introShouldBeVisible() {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return sessionStorage.getItem('ncr:showcase-intro-v2222') !== 'seen';
  } catch {
    return false;
  }
}

export function PublicHomePage() {
  const heroRef = useRef<HTMLElement | null>(null);
  const [activeBusinessKey, setActiveBusinessKey] = useState(businesses[0].key);
  const [activeOfferBusinessKey, setActiveOfferBusinessKey] = useState(publicOfferCatalog[0].key);
  const [showIntro, setShowIntro] = useState(introShouldBeVisible);
  const activeBusiness = businesses.find((business) => business.key === activeBusinessKey) ?? businesses[0];
  const activeOfferBusiness = publicOfferCatalog.find((business) => business.key === activeOfferBusinessKey) ?? publicOfferCatalog[0];
  const businessStyle = { '--business-color': activeBusiness.color } as CSSProperties;
  const offerStyle = { '--offer-color': activeOfferBusiness.color } as CSSProperties;

  useEffect(() => {
    if (!showIntro) return;
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem('ncr:showcase-intro-v2222', 'seen');
      } catch {
        // L’animation reste facultative lorsque le stockage privé est indisponible.
      }
      setShowIntro(false);
    }, 1250);
    return () => window.clearTimeout(timer);
  }, [showIntro]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.public-home-v2222 .public-reveal'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || !window.matchMedia('(pointer: fine)').matches) return;
    const signals = Array.from(hero.querySelectorAll<HTMLElement>('.public-hero-signal'));

    const updateParallax = (event: PointerEvent) => {
      const bounds = hero.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      signals.forEach((signal, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        const intensity = 14 + index * 3;
        signal.style.setProperty('--pointer-x', `${x * intensity * direction}px`);
        signal.style.setProperty('--pointer-y', `${y * intensity}px`);
      });
    };
    const resetParallax = () => {
      signals.forEach((signal) => {
        signal.style.setProperty('--pointer-x', '0px');
        signal.style.setProperty('--pointer-y', '0px');
      });
    };

    hero.addEventListener('pointermove', updateParallax);
    hero.addEventListener('pointerleave', resetParallax);
    return () => {
      hero.removeEventListener('pointermove', updateParallax);
      hero.removeEventListener('pointerleave', resetParallax);
    };
  }, []);

  return (
    <div className="public-home public-home-v2221 public-home-v2222 public-home-v230 public-home-v231 public-home-v232">
      <PageMetadata
        title="NCR Suite | La plateforme de gestion conçue pour votre métier"
        description="NCR Suite réunit clients, équipes, planning, documents, facturation, conformité et automatisations dans une plateforme métier claire, modulaire et sécurisée."
        image="/og/ncr-suite-og-v2221.webp"
        index
      />

      {showIntro && (
        <div className="public-showcase-intro" aria-hidden="true">
          <img src="/brand/ncr-suite-icon.png" alt="" />
          <span><strong>NCR</strong> Suite</span>
        </div>
      )}

      <section className="public-hero" ref={heroRef}>
        <PublicSiteHeader />
        <div className="public-hero-canvas" aria-hidden="true">
          {heroSignals.map((signal) => (
            <div className={`public-hero-signal ${signal.key}`} key={signal.key}>
              <div className="public-hero-signal-inner">
                <header>
                  <span><Icon name={signal.icon} size={17} /></span>
                  <small>{signal.eyebrow}</small>
                  <i>{signal.status}</i>
                </header>
                <div className="public-signal-value"><strong>{signal.metric}</strong><span>{signal.label}</span></div>
                <div className={`public-signal-visual ${signal.key}`} aria-hidden="true">
                  {signal.key === 'clients' && <><span /><span /><span /><b /><b /><b /></>}
                  {signal.key === 'planning' && <><small>L</small><small>M</small><small>M</small><small>J</small><small>V</small></>}
                  {signal.key === 'documents' && <><span /><span /><span /></>}
                  {signal.key === 'quality' && <><span /><span /><span /><span /><span /></>}
                </div>
                <footer><span />{signal.detail}</footer>
              </div>
            </div>
          ))}
        </div>
        <div className="public-hero-copy">
          <span className="public-hero-symbol"><img src="/brand/ncr-suite-symbol-v2221.png" alt="" /></span>
          <p className="public-kicker"><span />UNE SUITE. TOUS VOS MÉTIERS. UNE SEULE PLATEFORME.</p>
          <h1><span>NCR</span> Suite</h1>
          <p className="public-hero-statement">Le système de gestion qui relie votre activité commerciale, vos équipes et vos opérations, sans transformer votre quotidien en usine à gaz.</p>
          <div className="public-mobile-signals" aria-label="Aperçu des fonctions reliées par NCR Suite">
            {heroSignals.map((signal) => (
              <span key={signal.key}>
                <Icon name={signal.icon} size={15} />
                <strong>{signal.metric} {signal.label}</strong>
                <i>{signal.status}</i>
              </span>
            ))}
          </div>
          <div className="public-hero-actions">
            <Link className="public-primary-action" to="/demande-acces">Demander un accès <Icon name="chevronRight" size={17} /></Link>
            <Link className="public-secondary-action" to="/connexion"><Icon name="lock" size={16} />Se connecter</Link>
          </div>
          <div className="public-hero-assurance">
            <span><Icon name="shield" size={15} />Accès contrôlés</span>
            <span><Icon name="activity" size={15} />Automatisations traçables</span>
            <span><Icon name="monitor" size={15} />Ordinateur et mobile</span>
          </div>
        </div>
        <div className="public-hero-facts" aria-label="Points forts de NCR Suite">
          <span><strong>5</strong><small>univers métier immédiatement disponibles</small></span>
          <span><strong>1</strong><small>source fiable pour toute l’entreprise</small></span>
          <span><strong>24/7</strong><small>au bureau comme sur le terrain</small></span>
        </div>
      </section>

      <main>
        <section className="public-intro-band public-reveal">
          <div>
            <p className="public-section-label">LE TRAVAIL, ENFIN RELIÉ</p>
            <h2>Une plateforme qui comprend ce qui se passe après le clic</h2>
          </div>
          <div className="public-intro-copy">
            <p>Un devis accepté devient un dossier. Un dossier alimente le planning. Le terrain produit des preuves. Les preuves déclenchent la suite. NCR Suite fait circuler l’information sans multiplier les ressaisies.</p>
            <a href="#plateforme">Voir la plateforme <Icon name="chevronRight" size={15} /></a>
          </div>
        </section>

        <section className="public-product-section public-reveal" id="plateforme">
          <div className="public-product-copy">
            <p className="public-section-label">POSTE DE PILOTAGE</p>
            <h2>Voir juste, agir vite</h2>
            <p>Les priorités du jour, les dossiers incomplets et les prochaines actions restent lisibles dans une interface conçue pour travailler, pas pour décorer.</p>
            <ul>
              <li><Icon name="check" size={16} />Tableaux de bord adaptés à chaque activité</li>
              <li><Icon name="check" size={16} />Documents rattachés au bon client et au bon dossier</li>
              <li><Icon name="check" size={16} />Automatisations visibles, contrôlables et historisées</li>
            </ul>
            <div className="public-product-signal"><span />Synchronisation opérationnelle<small>Tout est à jour</small></div>
          </div>

          <div className="public-product-preview" role="img" aria-label="Aperçu du tableau de bord professionnel NCR Suite">
            <div className="public-preview-topbar">
              <div><img src="/brand/ncr-suite-icon.png" alt="" /><span><strong>NCR Suite</strong><small>Poste de pilotage</small></span></div>
              <div><span className="public-preview-search"><Icon name="search" size={12} />Rechercher</span><i /><i /></div>
            </div>
            <div className="public-preview-shell">
              <nav aria-hidden="true">
                <span className="active"><Icon name="home" size={13} /></span>
                <span><Icon name="briefcase" size={13} /></span>
                <span><Icon name="calendar" size={13} /></span>
                <span><Icon name="file" size={13} /></span>
                <span><Icon name="chart" size={13} /></span>
              </nav>
              <div className="public-preview-workspace">
                <header><div><small>VENDREDI 25 JUILLET</small><strong>Bonjour, voici l’essentiel.</strong></div><button type="button"><Icon name="plus" size={12} />Nouvelle action</button></header>
                <div className="public-preview-metrics">
                  <span><small>À traiter</small><strong>12</strong><em>3 prioritaires</em></span>
                  <span><small>Planifiés</small><strong>28</strong><em>cette semaine</em></span>
                  <span><small>Dossiers prêts</small><strong>91 %</strong><em>objectif atteint</em></span>
                </div>
                <div className="public-preview-body">
                  <div className="public-preview-chart">
                    <div><strong>Activité maîtrisée</strong><small>7 derniers jours</small></div>
                    <span style={{ height: '38%' }} /><span style={{ height: '55%' }} /><span style={{ height: '47%' }} />
                    <span style={{ height: '72%' }} /><span style={{ height: '63%' }} /><span style={{ height: '86%' }} />
                    <span style={{ height: '74%' }} />
                  </div>
                  <div className="public-preview-list">
                    <strong>Prochaines actions</strong>
                    <span><i className="blue" /><small>Valider les documents</small><em>4</em></span>
                    <span><i className="green" /><small>Confirmer les plannings</small><em>6</em></span>
                    <span><i className="red" /><small>Traiter les alertes</small><em>2</em></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="public-business-section public-reveal" id="catalogue">
          <header>
            <p className="public-section-label">CATALOGUE MÉTIER</p>
            <h2>Cinq environnements, une exigence commune</h2>
            <p>Choisissez un métier pour découvrir un espace débarrassé du superflu et déjà structuré autour de ses opérations essentielles.</p>
          </header>

          <div className="public-business-grid" role="tablist" aria-label="Catalogue des métiers NCR Suite">
            {businesses.map((business, index) => (
              <button
                key={business.key}
                type="button"
                role="tab"
                aria-selected={business.key === activeBusiness.key}
                aria-controls="public-business-catalog"
                className={business.key === activeBusiness.key ? 'active' : ''}
                style={{ '--business-color': business.color } as CSSProperties}
                onClick={() => setActiveBusinessKey(business.key)}
              >
                <small>0{index + 1}</small>
                <span><Icon name={business.icon} size={18} /></span>
                <strong>{business.name}</strong>
              </button>
            ))}
          </div>

          <article key={activeBusiness.key} id="public-business-catalog" className="public-business-showcase" style={businessStyle} role="tabpanel">
            <div className="public-business-story">
              <span><Icon name={activeBusiness.icon} size={24} /></span>
              <p>{activeBusiness.label}</p>
              <h3>{activeBusiness.summary}</h3>
              <strong><Icon name="activity" size={16} />{activeBusiness.outcome}</strong>
              <Link className="public-business-detail-link" to={activeBusiness.path}>Découvrir la solution {activeBusiness.name} <Icon name="chevronRight" size={15} /></Link>
            </div>
            <div className="public-business-modules">
              <small>MODULES CLÉS</small>
              <ul>{activeBusiness.features.map((feature) => <li key={feature}><Icon name="check" size={15} />{feature}</li>)}</ul>
            </div>
            <div className="public-business-index">
              <small>ENVIRONNEMENT</small>
              <strong>{String(businesses.findIndex((business) => business.key === activeBusiness.key) + 1).padStart(2, '0')}</strong>
              <span>sur 05</span>
            </div>
          </article>
        </section>

        <section className="public-flow-section public-reveal">
          <div className="public-flow-heading">
            <div>
              <p className="public-section-label">DU SIGNAL À LA DÉCISION</p>
              <h2>Un seul flux de travail, sans angles morts</h2>
            </div>
            <p>Chaque information poursuit son chemin sans ressaisie et laisse une trace exploitable. Vous savez ce qui entre, ce qui avance et ce qui demande une décision.</p>
          </div>
          <div className="public-flow-rail" aria-hidden="true" />
          <div className="public-flow-grid" aria-label="Parcours opérationnel NCR Suite">
            {operatingFlow.map((item, index) => (
              <article key={item.step} style={{ '--flow-index': index } as CSSProperties}>
                <div className="public-flow-top">
                  <small>{item.step}</small>
                  <div className="public-flow-node"><Icon name={item.icon} size={19} /></div>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <strong><Icon name="check" size={13} />{item.outcome}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="public-platform-section public-reveal">
          <div>
            <p className="public-section-label">UN SOCLE QUI RESTE SIMPLE</p>
            <h2>Assez complet pour grandir, assez clair pour être adopté</h2>
          </div>
          <div className="public-platform-grid">
            {platformPoints.map((point) => (
              <article className={`public-platform-card ${point.visual}`} key={point.title}>
                <header><small>{point.number}</small><span><Icon name={point.icon} size={21} /></span></header>
                <div className="public-platform-card-copy">
                  <strong>{point.metric}</strong>
                  <h3>{point.title}</h3>
                  <p>{point.text}</p>
                </div>
                <div className={`public-platform-visual ${point.visual}`} aria-hidden="true">
                  {point.visual === 'domains' && <><span>Formation</span><span>Sécurité</span><span>Nettoyage</span><span>Restauration</span><span>Coiffure</span></>}
                  {point.visual === 'modules' && <><span><i />CRM<b>Actif</b></span><span><i />Planning<b>Actif</b></span><span><i />Automatisations<b>+</b></span></>}
                  {point.visual === 'access' && <><span>AD</span><span>MG</span><span>EQ</span><span>CL</span><strong>4 rôles reliés</strong></>}
                  {point.visual === 'devices' && <><span className="public-device-desktop"><i /><b /><b /><b /></span><span className="public-device-mobile"><i /><b /><b /></span></>}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="public-offer-section public-reveal" id="offres">
          <div className="public-offer-copy">
            <div>
              <p className="public-section-label">CATALOGUE DES OFFRES</p>
              <h2>Votre outil évolue au rythme de votre entreprise</h2>
            </div>
            <p>Choisissez votre métier pour retrouver une gamme claire, les accès inclus et les fonctions qui font réellement progresser votre organisation.</p>
          </div>

          <div className="public-offer-business-tabs" role="tablist" aria-label="Tarifs par métier">
            {publicOfferCatalog.map((business) => (
              <button
                key={business.key}
                type="button"
                role="tab"
                aria-selected={business.key === activeOfferBusiness.key}
                aria-controls="public-offer-catalog"
                className={business.key === activeOfferBusiness.key ? 'active' : ''}
                style={{ '--offer-color': business.color } as CSSProperties}
                onClick={() => setActiveOfferBusinessKey(business.key)}
              >
                <Icon name={business.icon} size={17} />
                <span>{business.name}</span>
              </button>
            ))}
          </div>

          <div key={activeOfferBusiness.key} id="public-offer-catalog" className="public-offer-catalog" style={offerStyle} role="tabpanel">
            <header>
              <div>
                <span><Icon name={activeOfferBusiness.icon} size={21} /></span>
                <p><small>TARIFS {activeOfferBusiness.label.toUpperCase()}</small><strong>{activeOfferBusiness.name}</strong></p>
              </div>
              <p><strong>HT / mois</strong><span>Activation après validation de votre demande</span></p>
            </header>
            <div className="public-offer-plans">
              {activeOfferBusiness.plans.map((plan, index) => (
                <article className={plan.recommended ? 'recommended' : ''} key={plan.key}>
                  <div className="public-offer-plan-heading">
                    <small>0{index + 1}</small>
                    {plan.recommended && <em>RECOMMANDÉE</em>}
                    {plan.custom && <em>SUR MESURE</em>}
                  </div>
                  <h3>{plan.name}</h3>
                  <p className="public-offer-price">
                    {plan.custom && <small>À partir de</small>}
                    <strong>{formatPublicMonthlyPrice(plan.monthlyPriceCents)} <sup>€</sup></strong>
                    <span>HT / mois</span>
                  </p>
                  <p className="public-offer-summary">{plan.summary}</p>
                  <p className="public-offer-access"><Icon name="users" size={15} />{plan.memberLimit === 1 ? '1 accès inclus' : `Jusqu’à ${plan.memberLimit} accès`}</p>
                  <ul>
                    {plan.highlights.map((highlight) => <li key={highlight}><Icon name="check" size={14} />{highlight}</li>)}
                  </ul>
                  <Link to="/demande-acces">Demander cette offre <Icon name="chevronRight" size={15} /></Link>
                </article>
              ))}
            </div>
            <footer>
              <span><Icon name="activity" size={15} />Comparaison automatique avec les modules à la carte</span>
              <span><Icon name="shield" size={15} />Montée en gamme signalée avant tout surcoût</span>
            </footer>
          </div>
        </section>

        <section className="public-final-cta public-reveal">
          <p className="public-section-label">OUVERTURE SUR VALIDATION</p>
          <h2>Votre entreprise mérite mieux qu’un assemblage d’outils</h2>
          <p>Présentez-nous votre activité. Chaque nouvelle demande est examinée avant l’ouverture pour vous livrer un environnement propre, sécurisé et correctement configuré.</p>
          <div>
            <Link className="public-primary-action" to="/demande-acces">Présenter mon besoin <Icon name="chevronRight" size={17} /></Link>
            <a href="mailto:contact@ncr-suite.fr" className="public-contact-link">contact@ncr-suite.fr</a>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
