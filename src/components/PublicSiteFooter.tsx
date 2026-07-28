import { Link } from 'react-router-dom';
import seoPagesData from '../config/publicSeoPages.json';

const solutionLinks = seoPagesData as Array<{ key: string; name: string; path: string }>;

export function PublicSiteFooter() {
  return (
    <footer className="public-site-footer">
      <div>
        <Link className="public-footer-brand" to="/" aria-label="Accueil NCR Suite">
          <img src="/brand/ncr-suite-icon.png" alt="" width="54" height="54" />
          <span><strong>NCR</strong><em>Suite</em></span>
        </Link>
        <p>La plateforme professionnelle qui relie les équipes, les clients et les opérations sans complexifier le quotidien.</p>
      </div>
      <nav className="public-footer-primary" aria-label="Informations NCR Suite">
        <a href="/#plateforme">Plateforme</a>
        <a href="/#catalogue">Solutions métier</a>
        <a href="/#offres">Offres</a>
        <Link to="/connexion">Se connecter</Link>
        <Link to="/demande-acces">Demander un accès</Link>
        <Link to="/confidentialite">Confidentialité</Link>
        <Link to="/mentions-legales">Mentions légales</Link>
        <a href="mailto:contact@ncr-suite.fr">contact@ncr-suite.fr</a>
      </nav>
      <nav className="public-footer-solutions" aria-label="Logiciels métier NCR Suite">
        {solutionLinks.map((item) => <Link to={item.path} key={item.key}>Logiciel {item.name}</Link>)}
      </nav>
      <small>© {new Date().getFullYear()} NCR Suite. Tous droits réservés.</small>
    </footer>
  );
}
