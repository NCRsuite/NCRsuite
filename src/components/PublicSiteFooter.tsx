import { Link } from 'react-router-dom';

export function PublicSiteFooter() {
  return (
    <footer className="public-site-footer">
      <div>
        <img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
        <p>Une plateforme professionnelle pensée pour les entreprises qui veulent avancer sans complexifier leur quotidien.</p>
      </div>
      <nav aria-label="Informations NCR Suite">
        <Link to="/connexion">Se connecter</Link>
        <Link to="/demande-acces">Demander un accès</Link>
        <Link to="/confidentialite">Confidentialité</Link>
        <Link to="/mentions-legales">Mentions légales</Link>
        <a href="mailto:contact@ncr-suite.fr">contact@ncr-suite.fr</a>
      </nav>
      <small>© {new Date().getFullYear()} NCR Suite. Tous droits réservés.</small>
    </footer>
  );
}
