import { NavLink, Outlet } from 'react-router-dom';
import { businessPacks } from '../config/businessPacks';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { Icon } from './Icon';

export function AppShell() {
  const { signOut, user } = useAuth();
  const { organization, organizations, selectOrganization } = useOrganization();

  if (!organization) return null;
  const pack = businessPacks[organization.business_type];

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
            onChange={(event) => selectOrganization(event.target.value)}
          >
            {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
          <small>{pack.label} · {organization.plan}</small>
        </div>

        <nav className="main-nav" aria-label="Navigation principale">
          {pack.navigation.map((item) => (
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
          <button className="icon-button" onClick={() => signOut()} title="Se déconnecter">↗</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="mobile-header">
          <div className="brand compact">
            <img src="/brand/ncr-suite-icon.png" alt="" />
            <strong>NCR Suite</strong>
          </div>
          <span>{organization.name}</span>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
