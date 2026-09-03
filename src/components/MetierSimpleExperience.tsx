import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { BeautyTeamAccessPage } from '../pages/BeautyTeamAccessPage';
import { BeautySetupHub } from './BeautySetupHub';
import { Icon } from './Icon';
import { MetierSharedReception } from './MetierSharedReception';
import { MetierSimpleSetup } from './MetierSimpleSetup';

interface ReceptionAuthorization {
  authorized: boolean;
  shared_reception_enabled: boolean;
  role: string | null;
}

export function MetierSimpleExperience() {
  const route = useLocation();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [pageHost, setPageHost] = useState<HTMLElement | null>(null);
  const [desktopShortcutHost, setDesktopShortcutHost] = useState<HTMLElement | null>(null);
  const [mobileShortcutHost, setMobileShortcutHost] = useState<HTMLElement | null>(null);
  const [authorization, setAuthorization] = useState<ReceptionAuthorization | null>(null);
  const [receptionCompanyCount, setReceptionCompanyCount] = useState(0);

  const active = organization?.plan === 'metier';
  const params = new URLSearchParams(route.search);
  const view = params.get('view') || 'simple';
  const onMetierPage = route.pathname === '/offre-metier';
  const onBeautyTeamPage = route.pathname === '/acces-equipe' && organization?.business_type === 'coiffure';
  const reception = route.pathname === '/' && params.get('metier') === 'reception';
  const advanced = onMetierPage && view === 'advanced';
  const experienceVisible = onMetierPage || reception || onBeautyTeamPage;

  useEffect(() => {
    let alive = true;
    async function loadAuthorization() {
      if (!active || !organization || !supabase) {
        if (alive) {
          setAuthorization(null);
          setReceptionCompanyCount(0);
        }
        return;
      }

      const { data, error } = await supabase.rpc('metier_reception_authorization', {
        p_organization_id: organization.id
      });
      if (!alive) return;
      if (error) {
        setAuthorization(null);
        setReceptionCompanyCount(0);
        return;
      }

      const auth = (data ?? {
        authorized: false,
        shared_reception_enabled: false,
        role: null
      }) as ReceptionAuthorization;
      setAuthorization(auth);
      if (!auth.authorized) {
        setReceptionCompanyCount(0);
        return;
      }

      const { data: contextData, error: contextError } = await supabase.rpc('metier_reception_context', {
        p_organization_id: organization.id
      });
      if (!alive) return;
      if (contextError) {
        setReceptionCompanyCount(0);
        return;
      }
      const companies = (contextData as { companies?: unknown[] } | null)?.companies;
      setReceptionCompanyCount(Array.isArray(companies) ? companies.length : 0);
    }

    void loadAuthorization();
    return () => { alive = false; };
  }, [active, organization?.id]);

  useEffect(() => {
    if (!active || !experienceVisible) {
      document.documentElement.removeAttribute('data-metier-simple-ui');
      setPageHost(null);
      return;
    }

    let node: HTMLElement | null = null;
    function ensureHost() {
      const stage = document.querySelector<HTMLElement>('.premium-route-stage');
      if (!stage || node) return;
      node = document.createElement('div');
      node.className = 'metier-simple-experience-host';
      stage.insertBefore(node, stage.firstChild);
      setPageHost(node);
    }

    ensureHost();
    const observer = new MutationObserver(ensureHost);
    observer.observe(document.body, { childList: true, subtree: true });
    document.documentElement.setAttribute(
      'data-metier-simple-ui',
      reception ? 'reception' : onBeautyTeamPage ? 'team' : advanced ? 'advanced' : 'true'
    );

    return () => {
      observer.disconnect();
      node?.remove();
      setPageHost(null);
      document.documentElement.removeAttribute('data-metier-simple-ui');
    };
  }, [active, experienceVisible, reception, advanced, onBeautyTeamPage, organization?.id]);

  useEffect(() => {
    if (!active || !authorization?.authorized || receptionCompanyCount < 1) {
      setDesktopShortcutHost(null);
      setMobileShortcutHost(null);
      return;
    }

    let desktopNode: HTMLElement | null = null;
    let mobileNode: HTMLElement | null = null;

    function ensureShortcuts() {
      const sidebar = document.querySelector<HTMLElement>('.sidebar');
      if (sidebar && !desktopNode) {
        desktopNode = document.createElement('div');
        desktopNode.className = 'metier-reception-shortcut-host desktop';
        const subscription = sidebar.querySelector('.sidebar-subscription-link');
        const footer = sidebar.querySelector('.sidebar-footer');
        sidebar.insertBefore(desktopNode, subscription ?? footer ?? null);
        setDesktopShortcutHost(desktopNode);
      }

      const drawer = document.querySelector<HTMLElement>('.mobile-navigation-drawer');
      if (drawer && !mobileNode) {
        mobileNode = document.createElement('div');
        mobileNode.className = 'metier-reception-shortcut-host mobile';
        const account = drawer.querySelector('.mobile-drawer-account');
        drawer.insertBefore(mobileNode, account ?? null);
        setMobileShortcutHost(mobileNode);
      }
    }

    ensureShortcuts();
    const observer = new MutationObserver(ensureShortcuts);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      desktopNode?.remove();
      mobileNode?.remove();
      setDesktopShortcutHost(null);
      setMobileShortcutHost(null);
    };
  }, [active, authorization?.authorized, receptionCompanyCount, organization?.id]);

  if (!active) return null;

  const openReception = () => navigate('/?metier=reception');
  const closeReception = () => navigate('/');
  const openSimple = () => navigate('/offre-metier');
  const openAdvanced = () => navigate('/offre-metier?view=advanced');

  const shortcut = (
    <button type="button" className="metier-reception-shortcut" onClick={openReception}>
      <span><Icon name="calendar" size={19} /></span>
      <span>
        <strong>Accueil partagé</strong>
        <small>{receptionCompanyCount} entreprise{receptionCompanyCount > 1 ? 's' : ''} disponible{receptionCompanyCount > 1 ? 's' : ''}</small>
      </span>
      <Icon name="chevronRight" size={16} />
    </button>
  );

  const simplePage = organization?.business_type === 'coiffure'
    ? <BeautySetupHub onOpenReception={openReception} onOpenAdvanced={openAdvanced} />
    : <MetierSimpleSetup onOpenReception={openReception} onOpenAdvanced={openAdvanced} />;

  const page = onBeautyTeamPage
    ? <BeautyTeamAccessPage />
    : reception
      ? <MetierSharedReception onBack={closeReception} />
      : advanced
        ? (
          <div className="metier-advanced-toolbar">
            <button type="button" className="secondary-button" onClick={openSimple}>
              <Icon name="chevronRight" size={16} /> Retour à la configuration simple
            </button>
            <span>Réglages avancés · à utiliser uniquement si nécessaire</span>
          </div>
        )
        : simplePage;

  return (
    <>
      {pageHost && createPortal(page, pageHost)}
      {desktopShortcutHost && createPortal(shortcut, desktopShortcutHost)}
      {mobileShortcutHost && createPortal(shortcut, mobileShortcutHost)}
    </>
  );
}
