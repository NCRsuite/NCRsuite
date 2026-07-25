import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageMetadata } from '../components/PageMetadata';
import { PublicSiteFooter } from '../components/PublicSiteFooter';
import { PublicSiteHeader } from '../components/PublicSiteHeader';
import type { IconName } from '../types';

const businesses: Array<{ name: string; icon: IconName; color: string; summary: string; features: string[] }> = [
  {
    name: 'Formation',
    icon: 'graduation',
    color: '#0878f9',
    summary: 'Pilotez le parcours complet, du prospect jusqu’au BPF.',
    features: ['CRM, devis et conventions', 'Sessions, émargements et évaluations', 'BPF, Qualiopi et facturation']
  },
  {
    name: 'Sécurité privée',
    icon: 'shield',
    color: '#d92d20',
    summary: 'Coordonnez agents, sites et opérations terrain.',
    features: ['Planning et espaces agents', 'Rondes QR, PTI et main courante', 'Devis, facturation et portails clients']
  },
  {
    name: 'Nettoyage',
    icon: 'sparkles',
    color: '#07865c',
    summary: 'Gardez chaque intervention, preuve et contrôle sous contrôle.',
    features: ['Agents, sites et plannings', 'Rapports, anomalies et qualité', 'Stocks, rentabilité et facturation']
  },
  {
    name: 'Restauration',
    icon: 'utensils',
    color: '#9c5b10',
    summary: 'Réunissez la salle, la cuisine et la gestion.',
    features: ['Réservations et plan de salle', 'Carte, commandes et écran cuisine', 'Hygiène, stocks et équipe']
  },
  {
    name: 'Coiffure & beauté',
    icon: 'scissors',
    color: '#a23cb7',
    summary: 'Transformez les rendez-vous en relation client durable.',
    features: ['Réservation et planning', 'Clients, équipe et prestations', 'Fidélité et espace client']
  }
];

const platformPoints: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: 'briefcase', title: 'Une interface par métier', text: 'Chaque entreprise retrouve uniquement les menus, données et automatisations utiles à son activité.' },
  { icon: 'tool', title: 'Des modules qui évoluent', text: 'Commencez avec l’essentiel, ajoutez un module ou passez à la formule supérieure lorsque cela devient plus avantageux.' },
  { icon: 'shield', title: 'Des accès maîtrisés', text: 'Rôles, entreprises et portails externes restent isolés avec des droits adaptés à chaque profil.' },
  { icon: 'monitor', title: 'Disponible partout', text: 'Ordinateur, tablette et mobile partagent la même PWA, sans installation complexe ni changement d’outil.' }
];

export function PublicHomePage() {
  return (
    <div className="public-home">
      <PageMetadata
        title="NCR Suite | Logiciel de gestion métier pour les entreprises"
        description="NCR Suite réunit planning, clients, équipes, documents, facturation et automatisations dans une plateforme adaptée à la formation, la sécurité privée, le nettoyage, la restauration et la beauté."
        index
      />

      <section className="public-hero">
        <PublicSiteHeader />
        <img className="public-hero-image" src="/marketing/ncr-suite-hero-v2220.jpg" alt="" fetchPriority="high" />
        <div className="public-hero-copy">
          <p className="public-kicker">UNE PLATEFORME. PLUSIEURS MÉTIERS.</p>
          <h1>NCR Suite</h1>
          <p>Le logiciel de gestion qui rassemble vos équipes, vos clients, vos documents et vos opérations dans un environnement vraiment adapté à votre activité.</p>
          <div className="public-hero-actions">
            <Link className="public-primary-action" to="/demande-acces">Demander un accès <Icon name="chevronRight" size={17} /></Link>
            <Link className="public-secondary-action" to="/connexion"><Icon name="lock" size={17} />Se connecter</Link>
          </div>
        </div>
        <div className="public-hero-facts" aria-label="Points forts">
          <span><strong>5</strong> métiers disponibles</span>
          <span><strong>1</strong> espace centralisé</span>
          <span><strong>24/7</strong> sur ordinateur et mobile</span>
        </div>
      </section>

      <main>
        <section className="public-intro-band">
          <div>
            <p className="public-section-label">PENSÉE POUR LE TERRAIN</p>
            <h2>Moins d’outils dispersés. Plus de travail réellement suivi.</h2>
          </div>
          <p>NCR Suite relie les actions commerciales, administratives et opérationnelles. L’information saisie une fois alimente ensuite les plannings, documents, relances, preuves et tableaux de bord concernés.</p>
        </section>

        <section className="public-product-section" id="plateforme">
          <div className="public-product-copy">
            <p className="public-section-label">VOTRE ACTIVITÉ EN UN COUP D’ŒIL</p>
            <h2>Une plateforme calme, lisible et faite pour agir.</h2>
            <p>Les priorités du jour, les dossiers incomplets et les prochaines actions restent visibles sans multiplier les tableaux ni les doubles saisies.</p>
            <ul>
              <li><Icon name="check" size={16} />Tableaux de bord adaptés à chaque métier</li>
              <li><Icon name="check" size={16} />Documents et preuves rattachés au bon dossier</li>
              <li><Icon name="check" size={16} />Automatisations contrôlables et traçables</li>
            </ul>
          </div>
          <div className="public-product-preview" role="img" aria-label="Aperçu d’un tableau de bord NCR Suite">
            <header>
              <img src="/brand/ncr-suite-icon.png" alt="" />
              <span><strong>Tableau de bord</strong><small>Activité du jour</small></span>
              <i />
            </header>
            <div className="public-preview-metrics">
              <span><small>À traiter</small><strong>12</strong><em>3 prioritaires</em></span>
              <span><small>Planifiés</small><strong>28</strong><em>cette semaine</em></span>
              <span><small>Dossiers prêts</small><strong>91 %</strong><em>objectif atteint</em></span>
            </div>
            <div className="public-preview-body">
              <div className="public-preview-chart">
                <div><strong>Activité</strong><small>7 derniers jours</small></div>
                <span style={{ height: '38%' }} /><span style={{ height: '55%' }} /><span style={{ height: '47%' }} />
                <span style={{ height: '72%' }} /><span style={{ height: '63%' }} /><span style={{ height: '86%' }} />
              </div>
              <div className="public-preview-list">
                <strong>Prochaines actions</strong>
                <span><i className="blue" /><small>Valider les documents</small><em>4</em></span>
                <span><i className="green" /><small>Confirmer les plannings</small><em>6</em></span>
                <span><i className="red" /><small>Traiter les alertes</small><em>2</em></span>
              </div>
            </div>
          </div>
        </section>

        <section className="public-business-section" id="metiers">
          <header>
            <p className="public-section-label">CINQ EXPÉRIENCES MÉTIER</p>
            <h2>Le même socle, jamais la même usine à gaz.</h2>
            <p>Votre navigation, vos indicateurs et vos automatismes suivent votre activité. Les autres métiers ne viennent pas encombrer votre quotidien.</p>
          </header>
          <div className="public-business-grid">
            {businesses.map((business) => (
              <article key={business.name} style={{ '--business-color': business.color } as React.CSSProperties}>
                <span><Icon name={business.icon} size={21} /></span>
                <h3>{business.name}</h3>
                <p>{business.summary}</p>
                <ul>{business.features.map((feature) => <li key={feature}><Icon name="check" size={14} />{feature}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        <section className="public-platform-section">
          <div>
            <p className="public-section-label">UN SOCLE QUI RESTE SIMPLE</p>
            <h2>Assez complet pour grandir. Assez clair pour être utilisé.</h2>
          </div>
          <div className="public-platform-grid">
            {platformPoints.map((point) => (
              <article key={point.title}>
                <Icon name={point.icon} size={22} />
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-offer-section" id="offres">
          <div className="public-offer-copy">
            <p className="public-section-label">UNE MONTÉE EN GAMME LISIBLE</p>
            <h2>Votre offre évolue avec votre entreprise.</h2>
            <p>Découverte, Essentielle, Professionnelle ou Métier : NCR Suite compare vos modules à la carte avec la formule supérieure et vous signale automatiquement l’option la plus avantageuse.</p>
          </div>
          <div className="public-offer-levels" aria-label="Formules NCR Suite">
            <span><small>01</small><strong>Découverte</strong><em>Poser les bases</em></span>
            <span><small>02</small><strong>Essentielle</strong><em>Structurer le quotidien</em></span>
            <span className="recommended"><small>03</small><strong>Professionnelle</strong><em>Automatiser et piloter</em></span>
            <span><small>04</small><strong>Métier</strong><em>Composer sur mesure</em></span>
          </div>
        </section>

        <section className="public-final-cta">
          <p className="public-section-label">OUVERTURE SUR VALIDATION</p>
          <h2>Préparons un espace qui correspond vraiment à votre activité.</h2>
          <p>Chaque nouvelle demande est examinée avant l’ouverture du compte. Vous démarrez ainsi dans un environnement propre, sécurisé et correctement configuré.</p>
          <div>
            <Link className="public-primary-action" to="/demande-acces">Présenter mon besoin <Icon name="chevronRight" size={17} /></Link>
            <a href="mailto:contact@ncr-suite.fr" className="public-contact-link">Écrire à contact@ncr-suite.fr</a>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
