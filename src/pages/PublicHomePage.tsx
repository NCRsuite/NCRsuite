import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageMetadata } from '../components/PageMetadata';
import { PublicSiteFooter } from '../components/PublicSiteFooter';
import { PublicSiteHeader } from '../components/PublicSiteHeader';
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
};

const businesses: PublicBusiness[] = [
  {
    key: 'formation',
    name: 'Formation',
    label: 'Organismes de formation',
    icon: 'graduation',
    color: '#0878f9',
    summary: 'Du premier prospect jusqu’au BPF, chaque étape du parcours reste liée et exploitable.',
    outcome: 'Commercial, pédagogique, qualité et finance réunis',
    features: ['CRM et pipeline commercial', 'Catalogue et programmes', 'Sessions et émargements', 'Évaluations automatisées', 'Facturation et BPF', 'Qualiopi et preuves']
  },
  {
    key: 'securite',
    name: 'Sécurité privée',
    label: 'Entreprises de sécurité',
    icon: 'shield',
    color: '#d92d20',
    summary: 'Les équipes du bureau et du terrain partagent enfin le même niveau d’information.',
    outcome: 'Des opérations suivies, traçables et facturables',
    features: ['Clients, sites et contrats', 'Agents et agréments', 'Planning et vacations', 'Rondes QR et PTI', 'Main courante terrain', 'Facturation et portail client']
  },
  {
    key: 'nettoyage',
    name: 'Nettoyage',
    label: 'Propreté et multiservices',
    icon: 'sparkles',
    color: '#07865c',
    summary: 'Chaque intervention devient une prestation planifiée, prouvée et mesurable.',
    outcome: 'Qualité terrain et rentabilité dans un même flux',
    features: ['Clients et sites', 'Agents et affectations', 'Pointage et consignes', 'Rapports et anomalies', 'Contrôles qualité', 'Stocks et rentabilité']
  },
  {
    key: 'restauration',
    name: 'Restauration',
    label: 'Restaurants et établissements',
    icon: 'utensils',
    color: '#b36a08',
    summary: 'La salle, la cuisine et la gestion avancent avec une vision commune du service.',
    outcome: 'Une exploitation fluide, du couvert jusqu’au stock',
    features: ['Réservations et plan de salle', 'Carte et recettes', 'Commandes et écran cuisine', 'Planning des équipes', 'Hygiène et traçabilité', 'Stocks et pilotage']
  },
  {
    key: 'coiffure',
    name: 'Coiffure & beauté',
    label: 'Salons et instituts',
    icon: 'scissors',
    color: '#9b3db4',
    summary: 'Les rendez-vous, l’équipe et la fidélité client se pilotent sans alourdir l’accueil.',
    outcome: 'Une relation client suivie avant et après la visite',
    features: ['Réservation en ligne', 'Planning du salon', 'Fichier client', 'Prestations et équipe', 'Fidélité personnalisée', 'Espace client']
  }
];

const platformPoints: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: 'briefcase', title: 'Une expérience par métier', text: 'Menus, indicateurs et automatisations suivent la réalité opérationnelle de chaque entreprise.' },
  { icon: 'tool', title: 'Un catalogue modulaire', text: 'Activez les fonctions utiles, visualisez les suivantes et changez de formule au bon moment.' },
  { icon: 'shield', title: 'Des accès maîtrisés', text: 'Équipes, clients, formateurs et intervenants disposent chacun d’un espace adapté à leur rôle.' },
  { icon: 'monitor', title: 'Une PWA partout', text: 'Le même environnement rapide et cohérent accompagne le bureau comme le terrain.' }
];

const operatingFlow: Array<{ step: string; title: string; text: string }> = [
  { step: '01', title: 'Collecter', text: 'Clients, équipes, besoins et documents entrent au bon endroit.' },
  { step: '02', title: 'Orchestrer', text: 'Plannings, tâches et automatisations font circuler l’information.' },
  { step: '03', title: 'Prouver', text: 'Signatures, contrôles et historiques sécurisent chaque dossier.' },
  { step: '04', title: 'Piloter', text: 'Les indicateurs transforment l’activité en décisions concrètes.' }
];

export function PublicHomePage() {
  const [activeBusinessKey, setActiveBusinessKey] = useState(businesses[0].key);
  const activeBusiness = businesses.find((business) => business.key === activeBusinessKey) ?? businesses[0];
  const businessStyle = { '--business-color': activeBusiness.color } as CSSProperties;

  return (
    <div className="public-home public-home-v2221">
      <PageMetadata
        title="NCR Suite | La plateforme de gestion conçue pour votre métier"
        description="NCR Suite réunit clients, équipes, planning, documents, facturation, conformité et automatisations dans une plateforme métier claire, modulaire et sécurisée."
        image="/og/ncr-suite-og-v2221.webp"
        index
      />

      <section className="public-hero">
        <PublicSiteHeader />
        <div className="public-hero-canvas" aria-hidden="true">
          <span className="public-hero-axis horizontal" />
          <span className="public-hero-axis vertical" />
          <div className="public-hero-signal clients">
            <Icon name="users" size={16} />
            <span><small>RELATION CLIENT</small><strong>8 opportunités actives</strong></span>
            <i>+12 %</i>
          </div>
          <div className="public-hero-signal planning">
            <Icon name="calendar" size={16} />
            <span><small>PLANNING</small><strong>28 actions coordonnées</strong></span>
            <i>À jour</i>
          </div>
          <div className="public-hero-signal documents">
            <Icon name="file" size={16} />
            <span><small>DOCUMENTS</small><strong>Dossiers automatiquement liés</strong></span>
            <i>Prêts</i>
          </div>
          <div className="public-hero-signal quality">
            <Icon name="shield" size={16} />
            <span><small>CONFORMITÉ</small><strong>Preuves et historique suivis</strong></span>
            <i>91 %</i>
          </div>
        </div>
        <div className="public-hero-copy">
          <span className="public-hero-symbol"><img src="/brand/ncr-suite-symbol-v2221.png" alt="" /></span>
          <p className="public-kicker"><span />UNE SUITE. TOUS VOS MÉTIERS. UNE SEULE PLATEFORME.</p>
          <h1><span>NCR</span> Suite</h1>
          <p className="public-hero-statement">Le système de gestion qui relie votre activité commerciale, vos équipes et vos opérations, sans transformer votre quotidien en usine à gaz.</p>
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
        <section className="public-intro-band">
          <div>
            <p className="public-section-label">LE TRAVAIL, ENFIN RELIÉ</p>
            <h2>Une plateforme qui comprend ce qui se passe après le clic.</h2>
          </div>
          <div className="public-intro-copy">
            <p>Un devis accepté devient un dossier. Un dossier alimente le planning. Le terrain produit des preuves. Les preuves déclenchent la suite. NCR Suite fait circuler l’information sans multiplier les ressaisies.</p>
            <a href="#plateforme">Voir la plateforme <Icon name="chevronRight" size={15} /></a>
          </div>
        </section>

        <section className="public-product-section" id="plateforme">
          <div className="public-product-copy">
            <p className="public-section-label">POSTE DE PILOTAGE</p>
            <h2>Voir juste. Agir vite.</h2>
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

        <section className="public-business-section" id="catalogue">
          <header>
            <p className="public-section-label">CATALOGUE MÉTIER</p>
            <h2>Cinq environnements. Une exigence commune.</h2>
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

          <article id="public-business-catalog" className="public-business-showcase" style={businessStyle} role="tabpanel">
            <div className="public-business-story">
              <span><Icon name={activeBusiness.icon} size={24} /></span>
              <p>{activeBusiness.label}</p>
              <h3>{activeBusiness.summary}</h3>
              <strong><Icon name="activity" size={16} />{activeBusiness.outcome}</strong>
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

        <section className="public-flow-section">
          <div className="public-flow-heading">
            <p className="public-section-label">DU SIGNAL À LA DÉCISION</p>
            <h2>Un seul flux de travail, sans angles morts.</h2>
          </div>
          <div className="public-flow-grid">
            {operatingFlow.map((item) => (
              <article key={item.step}>
                <small>{item.step}</small>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-platform-section">
          <div>
            <p className="public-section-label">UN SOCLE QUI RESTE SIMPLE</p>
            <h2>Assez complet pour grandir. Assez clair pour être adopté.</h2>
          </div>
          <div className="public-platform-grid">
            {platformPoints.map((point) => (
              <article key={point.title}>
                <Icon name={point.icon} size={21} />
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-offer-section" id="offres">
          <div className="public-offer-copy">
            <p className="public-section-label">UNE MONTÉE EN GAMME LISIBLE</p>
            <h2>Votre outil évolue au rythme de votre entreprise.</h2>
            <p>NCR Suite compare le coût de vos modules à la carte avec la formule supérieure et vous signale automatiquement l’option la plus avantageuse.</p>
          </div>
          <div className="public-offer-levels" aria-label="Formules NCR Suite">
            <span><small>01</small><strong>Découverte</strong><em>Structurer les premiers flux</em></span>
            <span><small>02</small><strong>Essentielle</strong><em>Équiper le quotidien</em></span>
            <span className="recommended"><small>03 · RECOMMANDÉE</small><strong>Professionnelle</strong><em>Automatiser et piloter</em></span>
            <span><small>04</small><strong>Métier</strong><em>Composer un environnement sur mesure</em></span>
          </div>
        </section>

        <section className="public-final-cta">
          <p className="public-section-label">OUVERTURE SUR VALIDATION</p>
          <h2>Votre entreprise mérite mieux qu’un assemblage d’outils.</h2>
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
