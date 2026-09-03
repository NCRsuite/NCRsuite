import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { organizationCanAccessPath } from '../config/moduleAccess';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import type { IconName } from '../types';
import { Icon } from './Icon';

interface BeautyNavigationItem {
  label: string;
  path: string;
  icon: IconName;
  reception?: boolean;
  ownerOnly?: boolean;
}

interface BeautyNavigationGroup {
  label: string;
  items: BeautyNavigationItem[];
}

const BASE_GROUPS: BeautyNavigationGroup[] = [
  {
    label: 'Au quotidien',
    items: [
      { label: 'Accueil', path: '/', icon: 'home' },
      { label: 'Agenda', path: '/rendez-vous', icon: 'calendar' },
      { label: 'Clients', path: '/clients', icon: 'users' },
      { label: 'Prestations', path: '/prestations', icon: 'sparkles' },
      { label: 'Équipe', path: '/equipe', icon: 'briefcase' }
    ]
  },
  {
    label: 'Gestion',
    items: [
      { label: 'Accès équipe', path: '/acces-equipe', icon: 'users' },
      { label: 'Fidélité', path: '/fidelite', icon: 'chart' },
      { label: 'Secrétariat partagé', path: '/?metier=reception', icon: 'calendar', reception: true },
      { label: 'Mon espace', path: '/offre-metier', icon: 'building', ownerOnly: true }
    ]
  },
  {
    label: 'Réglages',
    items: [
      { label: 'Personnalisation', path: '/personnalisation', icon: 'sparkles' },
      { label: 'Notifications', path: '/notifications', icon: 'bell' },
      { label: 'Assistance', path: '/assistance', icon: 'headset' },
      { label: 'Paramètres', path: '/parametres', icon: 'settings' },
      { label: 'Abonnement', path: '/abonnement', icon: 'creditCard', ownerOnly: true }
    ]
  }
];

export function BeautySidebarNavigation() {
  const { organization } = useOrganization();
  const location = useLocation();
  const [receptionAuthorized, setReceptionAuthorized] = useState(false);
  const [desktopHost, setDesktopHost] = useState<HTMLElement | null>(null);
  const [mobileHost, setMobileHost] = useState<HTMLElement | null>(null);

  const active = organization?.plan === 'metier' && organization.business_type === 'coiffure';
  const owner = ['owner', 'admin'].includes(organization?.role ?? 'viewer');

  useEffect(() => {
    let alive = true;

    async function loadReceptionAccess() {
      if (!active || !organization || !supabase) {
        if (alive) setReceptionAuthorized(false);
        return;
      }

      const { data, error } = await supabase.rpc('metier_reception_authorization', {
        p_organization_id: organization.id
      });
      if (!alive) return;
      if (error) {
        setReceptionAuthorized(false);
        return;
      }

      const authorization = data as { authorized?: boolean } | null;
      setReceptionAuthorized(Boolean(authorization?.authorized));
    }

    void loadReceptionAccess();
    return () => { alive = false; };
  }, [active, organization?.id, organization?.role]);

  useEffect(() => {
    if (!active) {
      setDesktopHost(null);
      setMobileHost(null);
      return;
    }

    let desktopNode: HTMLElement | null = null;
    let mobileNode: HTMLElement | null = null;

    function ensureHosts() {
      const sidebar = document.querySelector<HTMLElement>('.sidebar');
      const originalDesktopNavigation = sidebar?.querySelector<HTMLElement>('.main-nav.grouped-navigation') ?? null;
      if (desktopNode && (!desktopNode.isConnected || desktopNode.parentElement !== sidebar)) {
        desktopNode.remove();
        desktopNode = null;
        setDesktopHost(null);
      }
      if (sidebar && originalDesktopNavigation && !desktopNode) {
        desktopNode = document.createElement('div');
        desktopNode.className = 'beauty-sidebar-navigation-host desktop';
        sidebar.insertBefore(desktopNode, originalDesktopNavigation);
        setDesktopHost(desktopNode);
      }

      const drawer = document.querySelector<HTMLElement>('.mobile-navigation-drawer');
      const originalMobileNavigation = drawer?.querySelector<HTMLElement>('.mobile-drawer-nav.grouped-navigation') ?? null;
      if (mobileNode && (!mobileNode.isConnected || mobileNode.parentElement !== drawer)) {
        mobileNode.remove();
        mobileNode = null;
        setMobileHost(null);
      }
      if (drawer && originalMobileNavigation && !mobileNode) {
        mobileNode = document.createElement('div');
        mobileNode.className = 'beauty-sidebar-navigation-host mobile';
        drawer.insertBefore(mobileNode, originalMobileNavigation);
        setMobileHost(mobileNode);
      }
    }

    ensureHosts();
    const observer = new MutationObserver(ensureHosts);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      desktopNode?.remove();
      mobileNode?.remove();
      setDesktopHost(null);
      setMobileHost(null);
    };
  }, [active, organization?.id]);

  const groups = useMemo(() => {
    if (!active || !organization) return [];

    return BASE_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.ownerOnly && !owner) return false;
        if (item.reception) return receptionAuthorized;
        return organizationCanAccessPath(organization, item.path);
      })
    })).filter((group) => group.items.length > 0);
  }, [active, organization, owner, receptionAuthorized]);

  if (!active) return null;

  function itemIsActive(item: BeautyNavigationItem) {
    if (item.reception) {
      return location.pathname === '/' && new URLSearchParams(location.search).get('metier') === 'reception';
    }
    if (item.path === '/') {
      return location.pathname === '/' && !new URLSearchParams(location.search).get('metier');
    }
    return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
  }

  const navigation = (mobile = false) => (
    <nav className={`beauty-sidebar-navigation${mobile ? ' mobile' : ''}`} aria-label="Navigation Coiffure & Beauté">
      {groups.map((group) => (
        <section className="beauty-sidebar-navigation-group" key={group.label}>
          <div className="beauty-sidebar-navigation-title">{group.label}</div>
          <div className="beauty-sidebar-navigation-items">
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={itemIsActive(item) ? 'active' : ''}
              >
                <span className="beauty-sidebar-navigation-icon"><Icon name={item.icon} size={18} /></span>
                <span>{item.label}</span>
                <Icon name="chevronRight" size={14} />
              </NavLink>
            ))}
          </div>
        </section>
      ))}
    </nav>
  );

  return (
    <>
      {desktopHost && createPortal(navigation(false), desktopHost)}
      {mobileHost && createPortal(navigation(true), mobileHost)}
    </>
  );
}
