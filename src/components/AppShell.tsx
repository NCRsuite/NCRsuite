import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { businessPacks } from '../config/businessPacks';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { Icon } from './Icon';

export function AppShell() {
  const { signOut, user } = useAuth();
  const { organization, organizations, selectOrganization } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);

  useEffect(() => {
    setMobileAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileAccountOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileAccountOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileAccountOpen]);

  if (!organization) return null;
  const pack = businessPacks[organization.business_type];
  const restrictedRole = ['employee', 'viewer'].includes(organization.role ?? 'viewer');
  const navigation = restrictedRole
    ? pack.navigation.filter((item) => ['/', '/rendez-vous'].includes(item.path))
    : pack.navigation;

  function changeOrganization(id: string) {
    if (id !== organization?.id) {
      selectOrganization(id);
      navigate('/', { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setMobileAccountOpen(false);
  }

  async function handleSignOut() {
    setMobileAccountOpen(false);
    await signOut();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand brand-horizontal">
          <img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
          <span>Plateforme métier</span>
        </div>

        <div className="organization-switcher">
          <label htmlFor="organization">Entreprise</label>
          <select
            id="organization"
            value={organization.id}
            onChange={(event) => changeOrganization(event.target.value)}
          >
            {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
          <small>{pack.label} · {organization.plan} · {organization.role ?? 'viewer'}</small>
        </div>

        <nav className="main-nav" aria-label="Navigation principale">
          {navigation.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'}>
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
              {item.badge && <b className="nav-badge">{item.badge}</b>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">{(user?.email?.[0] ?? 'N').toUpperCase()}</div>
          <div className="user-summary">
            <strong>{user?.user_metadata?.full_name || 'Utilisateur'}</strong>
            <span>{user?.email}</span>
          </div>
          <button className="icon-button" onClick={handleSignOut} title="Se déconnecter" aria-label="Se déconnecter">
            <Icon name="logout" size={19} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="mobile-header">
          <div className="brand compact">
            <img src="/brand/ncr-suite-icon.png" alt="" />
            <strong>NCR Suite</strong>
          </div>
          <button
            className="mobile-account-button"
            type="button"
            onClick={() => setMobileAccountOpen(true)}
            aria-expanded={mobileAccountOpen}
            aria-controls="mobile-account-sheet"
          >
            <span className="mobile-account-label">
              <strong>{organization.name}</strong>
              <small>{organization.role === 'owner' ? 'Propriétaire' : organization.role ?? 'Utilisateur'}</small>
            </span>
            <span className="mobile-account-avatar">{(user?.email?.[0] ?? 'N').toUpperCase()}</span>
            <Icon name="chevronDown" size={16} />
          </button>
        </header>
        <Outlet />
      </main>

      {mobileAccountOpen && (
        <div className="mobile-account-overlay" role="presentation" onClick={() => setMobileAccountOpen(false)}>
          <section
            id="mobile-account-sheet"
            className="mobile-account-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Compte et entreprise"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-header">
              <div className="mobile-sheet-user">
                <span className="mobile-sheet-avatar">{(user?.email?.[0] ?? 'N').toUpperCase()}</span>
                <div>
                  <strong>{user?.user_metadata?.full_name || 'Utilisateur'}</strong>
                  <small>{user?.email}</small>
                </div>
              </div>
              <button className="icon-button" type="button" onClick={() => setMobileAccountOpen(false)} aria-label="Fermer">
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="mobile-organization-section">
              <div className="mobile-sheet-title">
                <div>
                  <span>Entreprise active</span>
                  <small>{organizations.length > 1 ? `${organizations.length} espaces accessibles` : '1 espace accessible'}</small>
                </div>
              </div>

              <div className="mobile-organization-list">
                {organizations.map((org) => {
                  const orgPack = businessPacks[org.business_type];
                  const active = org.id === organization.id;
                  return (
                    <button
                      type="button"
                      key={org.id}
                      className={`mobile-organization-option${active ? ' active' : ''}`}
                      onClick={() => changeOrganization(org.id)}
                    >
                      <span className="mobile-organization-logo" style={{ background: org.primary_color || '#0a84ff' }}>
                        {org.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="mobile-organization-copy">
                        <strong>{org.name}</strong>
                        <small>{orgPack.label} · {org.plan}</small>
                      </span>
                      {active && <Icon name="check" size={20} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mobile-account-actions">
              <NavLink to="/parametres" className="mobile-account-action" onClick={() => setMobileAccountOpen(false)}>
                <Icon name="settings" size={20} />
                <span>Paramètres de l’entreprise</span>
                <Icon name="chevronRight" size={17} />
              </NavLink>
              <button type="button" className="mobile-account-action danger" onClick={handleSignOut}>
                <Icon name="logout" size={20} />
                <span>Se déconnecter</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
