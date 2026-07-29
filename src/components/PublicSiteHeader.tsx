import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import seoPagesData from '../config/publicSeoPages.json';
import type { IconName } from '../types';
import { Icon } from './Icon';

type PublicSiteHeaderProps = {
  compact?: boolean;
};

type PublicSolutionLink = {
  key: string;
  name: string;
  label: string;
  path: string;
  icon: IconName;
};

const solutionLinks = seoPagesData as PublicSolutionLink[];

export function PublicSiteHeader({ compact = false }: PublicSiteHeaderProps) {
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const solutionsMenuRef = useRef<HTMLDivElement | null>(null);
  const solutionsMenuId = useId();
  const location = useLocation();

  useEffect(() => {
    if (!solutionsOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!solutionsMenuRef.current?.contains(event.target as Node)) setSolutionsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSolutionsOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [solutionsOpen]);

  return (
    <header className={`public-site-header${compact ? ' compact' : ''}`}>
      <Link className="public-site-brand" to="/" aria-label="Accueil NCR Suite">
        <img src="/brand/ncr-suite-logo-header-v2221.png" alt="NCR Suite" />
      </Link>
      <nav aria-label="Navigation principale">
        {!compact && <a href="/#plateforme">Plateforme</a>}
        {!compact && (
          <div className={`public-solutions-menu${solutionsOpen ? ' open' : ''}`} ref={solutionsMenuRef}>
            <button
              type="button"
              className="public-solutions-trigger"
              aria-expanded={solutionsOpen}
              aria-controls={solutionsMenuId}
              aria-haspopup="true"
              aria-label="Solutions métier"
              onClick={() => setSolutionsOpen((current) => !current)}
            >
              <span className="public-solutions-label-full">Solutions métier</span>
              <span className="public-solutions-label-short" aria-hidden="true">Métiers</span>
              <Icon name="chevronDown" size={15} />
            </button>
            {solutionsOpen && (
              <div className="public-solutions-panel" id={solutionsMenuId}>
                <div className="public-solutions-strip">
                  {solutionLinks.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                      <Link
                        to={item.path}
                        key={item.key}
                        className={active ? 'active' : undefined}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setSolutionsOpen(false)}
                      >
                        <span><Icon name={item.icon} size={19} /></span>
                        <strong>{item.name}</strong>
                        <small>{item.label}</small>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {!compact && <a href="/#offres">Offres</a>}
        <Link className="public-login-link" to="/connexion"><Icon name="lock" size={16} />Se connecter</Link>
        <Link className="public-access-link" to="/demande-acces">Demander un accès</Link>
      </nav>
    </header>
  );
}
