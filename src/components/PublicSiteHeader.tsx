import { Link } from 'react-router-dom';
import { Icon } from './Icon';

type PublicSiteHeaderProps = {
  compact?: boolean;
};

export function PublicSiteHeader({ compact = false }: PublicSiteHeaderProps) {
  return (
    <header className={`public-site-header${compact ? ' compact' : ''}`}>
      <Link className="public-site-brand" to="/" aria-label="Accueil NCR Suite">
        <img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
      </Link>
      <nav aria-label="Navigation principale">
        {!compact && <a href="/#metiers">Métiers</a>}
        {!compact && <a href="/#plateforme">Plateforme</a>}
        {!compact && <a href="/#offres">Offres</a>}
        <Link className="public-login-link" to="/connexion"><Icon name="lock" size={16} />Se connecter</Link>
        <Link className="public-access-link" to="/demande-acces">Demander un accès</Link>
      </nav>
    </header>
  );
}
