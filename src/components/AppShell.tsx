import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { businessPacks } from '../config/businessPacks';
import { organizationHasFeature, planLabel } from '../config/planEntitlements';
import { cleaningPathIsLocked, cleaningRequiredPlanForPath, filterNavigationForOrganization, restaurantPathIsLocked, restaurantRequiredPlanForPath, securityPathIsLocked, securityRequiredPlanForPath } from '../config/moduleAccess';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { Icon } from './Icon';
import { supabase } from '../lib/supabase';


export function AppShell() {
  const { signOut, user } = useAuth();
  const { organization, organizations, selectOrganization, sites, activeSite, activeSiteId, selectSite, sitesLoading } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [notificationUnread, setNotificationUnread] = useState(0);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileAccountOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileMenuOpen && !mobileAccountOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        setMobileAccountOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen, mobileAccountOpen]);

  useEffect(() => {
    if (!organization || !user || !supabase) {
      setNotificationUnread(0);
      return;
    }
    const client = supabase;
    const organizationId = organization.id;
    let active = true;
    async function loadUnread() {
      const { count } = await client
        .from('notification_events')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('read_at', null)
        .lte('scheduled_for', new Date().toISOString());
      if (active) setNotificationUnread(count ?? 0);
    }
    void loadUnread();
    const channel = client.channel(`notification-events-shell-${organizationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_events', filter: `organization_id=eq.${organizationId}` }, () => void loadUnread())
      .subscribe();
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [organization?.id, user?.id]);

  if (!organization) return null;

  const pack = businessPacks[organization.business_type];
  const restrictedRole = ['employee', 'viewer'].includes(organization.role ?? 'viewer');
  const hasCustomRole = organization.plan === 'metier' && Boolean(organization.custom_role_id);
  const canManageOrganization = ['owner', 'admin', 'manager'].includes(organization.role ?? 'viewer');
  const hasMultiSite = organizationHasFeature(organization, 'multi_site');
  const baseNavigation = pack.navigation.filter((item) => item.path !== '/abonnement');
  let navigation = baseNavigation;

  if (['securite', 'nettoyage', 'restauration'].includes(organization.business_type) && ['owner', 'admin'].includes(organization.role ?? 'viewer')) {
    navigation = navigation.filter((item) => item.path !== '/terrain');
  }

  if (restrictedRole && !hasCustomRole) {
    if (organization.business_type === 'securite' && organization.role === 'employee') {
      navigation = baseNavigation.filter((item) => ['/', '/terrain', '/planning', '/rondes', '/main-courante', '/consignes', '/pti', '/notifications'].includes(item.path));
    } else if (organization.business_type === 'nettoyage' && organization.role === 'employee') {
      navigation = baseNavigation.filter((item) => ['/', '/terrain', '/planning', '/interventions', '/rapports', '/anomalies', '/notifications'].includes(item.path));
    } else if (organization.business_type === 'restauration' && organization.role === 'employee') {
      navigation = baseNavigation.filter((item) => ['/', '/terrain', '/planning', '/carte', '/reservations', '/salle', '/hygiene', '/notifications'].includes(item.path));
    } else if (organization.business_type === 'formation' && organizationHasFeature(organization, 'team_access')) {
      navigation = baseNavigation.filter((item) => !['/acces-equipe', '/personnalisation', '/etablissements', '/parametres'].includes(item.path));
    } else {
      navigation = baseNavigation.filter((item) => ['/', '/rendez-vous', '/planning', '/notifications'].includes(item.path));
    }
  }

  if (organization.business_type === 'securite' && organization.role === 'manager') {
    navigation = baseNavigation.filter((item) => ['/', '/terrain', '/planning', '/agents', '/sites', '/rondes', '/main-courante', '/consignes', '/geolocalisation', '/pti', '/supervision', '/dossiers-vacations', '/notifications'].includes(item.path));
  }

  if (organization.business_type === 'nettoyage' && organization.role === 'manager') {
    navigation = baseNavigation.filter((item) => ['/', '/terrain', '/planning', '/agents', '/sites', '/interventions', '/protocoles', '/rapports', '/anomalies', '/qualite', '/stocks', '/notifications'].includes(item.path));
  }

  if (organization.business_type === 'restauration' && organization.role === 'manager') {
    navigation = baseNavigation.filter((item) => ['/', '/terrain', '/planning', '/equipe', '/carte', '/reservations', '/salle', '/menu-qr', '/hygiene', '/stocks', '/notifications'].includes(item.path));
  }

  navigation = filterNavigationForOrganization(organization, navigation);

  if (organization.plan === 'metier' && canManageOrganization) {
    navigation = [...navigation, { label: 'Configuration Métier', path: '/offre-metier', icon: 'tool' }];
  }

  const hasCommercialBrandingModule = navigation.some((item) => item.path === '/personnalisation');
  const canManageSubscription = !restrictedRole && !(organization.business_type === 'securite' && organization.role === 'manager');

  const primaryMobileItem = navigation.find((item) => ['securite', 'restauration'].includes(organization.business_type) && restrictedRole ? item.path === '/terrain' : ['/rendez-vous', '/planning'].includes(item.path))
    ?? navigation.find((item) => item.path !== '/')
    ?? navigation[0];
  const quickAction = !restrictedRole ? pack.quickActions[0] : null;

  function closeMobileLayers() {
    setMobileMenuOpen(false);
    setMobileAccountOpen(false);
  }

  function changeSite(id: string | null) {
    selectSite(id);
    navigate('/', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMobileLayers();
  }

  function changeOrganization(id: string) {
    if (id !== organization?.id) {
      selectOrganization(id);
      navigate('/', { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    closeMobileLayers();
  }

  async function handleSignOut() {
    closeMobileLayers();
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
          <select id="organization" value={organization.id} onChange={(event) => changeOrganization(event.target.value)}>
            {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
          <small>{pack.label} · {planLabel(organization.plan)} · {organization.custom_role_label || organization.role || 'viewer'}</small>
        </div>

        {hasMultiSite && sites.length > 0 && (
          <div className="site-switcher">
            <label htmlFor="active-site">Établissement</label>
            <select id="active-site" value={activeSiteId ?? 'all'} onChange={(event) => changeSite(event.target.value === 'all' ? null : event.target.value)} disabled={sitesLoading}>
              {canManageOrganization && <option value="all">Tous les établissements</option>}
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}{site.is_primary ? ' · Principal' : ''}</option>)}
            </select>
            <small>{activeSite ? [activeSite.address, activeSite.city].filter(Boolean).join(' · ') || 'Établissement sélectionné' : 'Vue consolidée de tous les sites'}</small>
          </div>
        )}

        <nav className="main-nav" aria-label="Navigation principale">
          {navigation.map((item) => {
            const locked = securityPathIsLocked(organization, item.path) || cleaningPathIsLocked(organization, item.path) || restaurantPathIsLocked(organization, item.path);
            const requiredPlan = organization.business_type === 'nettoyage' ? cleaningRequiredPlanForPath(item.path) : organization.business_type === 'restauration' ? restaurantRequiredPlanForPath(item.path) : securityRequiredPlanForPath(item.path);
            return <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `${isActive ? 'active' : ''}${locked ? ' premium-locked' : ''}`}>
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
              {locked && <Icon name="lock" size={14} />}
              {locked && requiredPlan ? <b className="nav-badge premium">{requiredPlan}</b> : item.path === '/notifications' && notificationUnread > 0 ? <b className="nav-badge notification">{notificationUnread > 99 ? '99+' : notificationUnread}</b> : item.badge && <b className="nav-badge">{item.badge}</b>}
            </NavLink>;
          })}
        </nav>

        {canManageSubscription && (
          <NavLink className="sidebar-subscription-link" to="/abonnement">
            <span><Icon name="creditCard" size={20} /></span>
            <span><strong>Mon abonnement</strong><small>{planLabel(organization.plan)} · Gérer la formule</small></span>
            <Icon name="chevronRight" size={17} />
          </NavLink>
        )}

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
          <button
            className="mobile-menu-trigger"
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label="Ouvrir le menu"
          >
            <Icon name="menu" size={22} />
          </button>

          <button className="mobile-header-company" type="button" onClick={() => setMobileMenuOpen(true)}>
            <img src="/brand/ncr-suite-icon.png" alt="" />
            <span>
              <strong>{organization.name}</strong>
              <small>{pack.label}</small>
            </span>
          </button>

          <button
            className="mobile-account-avatar-button"
            type="button"
            onClick={() => setMobileAccountOpen(true)}
            aria-expanded={mobileAccountOpen}
            aria-controls="mobile-account-sheet"
            aria-label="Compte et entreprises"
          >
            {(user?.email?.[0] ?? 'N').toUpperCase()}
          </button>
        </header>

        <Outlet />
      </main>

      <nav className="mobile-bottom-nav" aria-label="Navigation rapide">
        <NavLink to="/" end>
          <Icon name="home" size={21} />
          <span>Accueil</span>
        </NavLink>
        {primaryMobileItem && (
          <NavLink to={primaryMobileItem.path}>
            <Icon name={primaryMobileItem.icon} size={21} />
            <span>{primaryMobileItem.label}</span>
          </NavLink>
        )}
        {quickAction ? (
          <NavLink className="mobile-create-action" to={quickAction.path} aria-label={quickAction.label}>
            <span><Icon name="plus" size={25} /></span>
            <small>Nouveau</small>
          </NavLink>
        ) : (
          <NavLink className="mobile-create-action" to={primaryMobileItem?.path ?? '/'} aria-label="Ouvrir le planning">
            <span><Icon name="calendar" size={23} /></span>
            <small>Planning</small>
          </NavLink>
        )}
        <button type="button" onClick={() => setMobileMenuOpen(true)} className={mobileMenuOpen ? 'active' : ''}>
          <Icon name="menu" size={21} />
          <span>Menu</span>
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" role="presentation" onClick={() => setMobileMenuOpen(false)}>
          <aside
            id="mobile-navigation-drawer"
            className="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation NCR Suite"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-drawer-header">
              <img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
              <button className="icon-button" type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Fermer le menu">
                <Icon name="close" size={21} />
              </button>
            </div>

            <button className="mobile-drawer-organization" type="button" onClick={() => { setMobileMenuOpen(false); setMobileAccountOpen(true); }}>
              <span className="mobile-organization-logo" style={{ background: organization.primary_color || '#0a84ff' }}>
                {organization.name.slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong>{organization.name}</strong>
                <small>{hasMultiSite && sites.length > 0 ? (activeSite ? activeSite.name : 'Tous les établissements') : organizations.length > 1 ? 'Changer d’entreprise' : `${pack.label} · ${planLabel(organization.plan)}`}</small>
              </span>
              <Icon name="chevronRight" size={18} />
            </button>

            {canManageSubscription && (
              <NavLink className="mobile-drawer-subscription-card" to="/abonnement" onClick={() => setMobileMenuOpen(false)}>
                <span className="mobile-drawer-subscription-icon"><Icon name="creditCard" size={21} /></span>
                <span><strong>Mon abonnement</strong><small>{planLabel(organization.plan)} · Offre, utilisation et changement</small></span>
                <Icon name="chevronRight" size={18} />
              </NavLink>
            )}

            <div className="mobile-drawer-section-title">Navigation</div>
            <nav className="mobile-drawer-nav" aria-label="Toutes les rubriques">
              {navigation.map((item) => {
                const locked = securityPathIsLocked(organization, item.path) || cleaningPathIsLocked(organization, item.path) || restaurantPathIsLocked(organization, item.path);
                const requiredPlan = organization.business_type === 'nettoyage' ? cleaningRequiredPlanForPath(item.path) : organization.business_type === 'restauration' ? restaurantRequiredPlanForPath(item.path) : securityRequiredPlanForPath(item.path);
                return <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `${isActive ? 'active' : ''}${locked ? ' premium-locked' : ''}`}>
                  <span className="mobile-drawer-nav-icon"><Icon name={item.icon} size={20} /></span>
                  <span>{item.label}</span>
                  {locked && <Icon name="lock" size={14} />}
                  {locked && requiredPlan ? <b className="nav-badge premium">{requiredPlan}</b> : item.path === '/notifications' && notificationUnread > 0 ? <b className="nav-badge notification">{notificationUnread > 99 ? '99+' : notificationUnread}</b> : item.badge && <b className="nav-badge">{item.badge}</b>}
                  <Icon name="chevronRight" size={17} />
                </NavLink>;
              })}
            </nav>

            <div className="mobile-drawer-account">
              <div className="mobile-drawer-user">
                <span>{(user?.email?.[0] ?? 'N').toUpperCase()}</span>
                <div>
                  <strong>{user?.user_metadata?.full_name || 'Utilisateur'}</strong>
                  <small>{user?.email}</small>
                </div>
              </div>
              <button type="button" onClick={handleSignOut}>
                <Icon name="logout" size={19} />
                Se déconnecter
              </button>
            </div>
          </aside>
        </div>
      )}

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

            {hasMultiSite && sites.length > 0 && (
              <div className="mobile-organization-section mobile-site-section">
                <div className="mobile-sheet-title">
                  <div>
                    <span>Établissement actif</span>
                    <small>{sites.length} site{sites.length > 1 ? 's' : ''} actif{sites.length > 1 ? 's' : ''}</small>
                  </div>
                </div>
                <div className="mobile-organization-list">
                  {canManageOrganization && (
                    <button type="button" className={`mobile-organization-option${activeSiteId === null ? ' active' : ''}`} onClick={() => changeSite(null)}>
                      <span className="mobile-organization-logo site-all"><Icon name="building" size={20} /></span>
                      <span className="mobile-organization-copy"><strong>Tous les établissements</strong><small>Vue consolidée de l’entreprise</small></span>
                      {activeSiteId === null && <Icon name="check" size={20} />}
                    </button>
                  )}
                  {sites.map((site) => {
                    const active = site.id === activeSiteId;
                    return (
                      <button type="button" key={site.id} className={`mobile-organization-option${active ? ' active' : ''}`} onClick={() => changeSite(site.id)}>
                        <span className="mobile-organization-logo" style={{ background: organization.primary_color || '#0a84ff' }}><Icon name="building" size={20} /></span>
                        <span className="mobile-organization-copy"><strong>{site.name}</strong><small>{site.is_primary ? 'Établissement principal' : [site.address, site.city].filter(Boolean).join(' · ') || 'Établissement'}</small></span>
                        {active && <Icon name="check" size={20} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mobile-account-actions">
              {hasCommercialBrandingModule && canManageOrganization && (
                <NavLink to="/personnalisation" className="mobile-account-action branding" onClick={() => setMobileAccountOpen(false)}>
                  <Icon name="sparkles" size={20} />
                  <span>Personnaliser l’entreprise</span>
                  <Icon name="chevronRight" size={17} />
                </NavLink>
              )}
              {canManageSubscription && (
                <NavLink to="/abonnement" className="mobile-account-action subscription" onClick={() => setMobileAccountOpen(false)}>
                  <Icon name="creditCard" size={20} />
                  <span>Mon abonnement</span>
                  <Icon name="chevronRight" size={17} />
                </NavLink>
              )}
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
