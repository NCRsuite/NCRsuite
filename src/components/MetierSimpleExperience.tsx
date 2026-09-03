import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { BeautyTeamAccessPage } from '../pages/BeautyTeamAccessPage';
import '../beautyTeamAccessRoute.css';
import { BeautySetupHub } from './BeautySetupHub';
import { Icon } from './Icon';
import { MetierSharedReception } from './MetierSharedReception';
import { MetierSimpleSetup } from './MetierSimpleSetup';

export function MetierSimpleExperience() {
  const route = useLocation();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [pageHost, setPageHost] = useState<HTMLElement | null>(null);

  const active = organization?.plan === 'metier';
  const params = new URLSearchParams(route.search);
  const view = params.get('view') || 'simple';
  const onMetierPage = route.pathname === '/offre-metier';
  const onBeautyTeamPage = route.pathname === '/acces-equipe' && organization?.business_type === 'coiffure';
  const reception = route.pathname === '/' && params.get('metier') === 'reception';
  const advanced = onMetierPage && view === 'advanced';
  const experienceVisible = onMetierPage || reception || onBeautyTeamPage;

  useEffect(() => {
    const root = document.documentElement;
    if (!active || organization?.business_type !== 'coiffure') {
      delete root.dataset.beautyMetier;
      return;
    }
    root.dataset.beautyMetier = 'true';
    return () => {
      if (root.dataset.beautyMetier === 'true') delete root.dataset.beautyMetier;
    };
  }, [active, organization?.business_type, organization?.id]);

  useEffect(() => {
    if (!active || !experienceVisible) {
      document.documentElement.removeAttribute('data-metier-simple-ui');
      setPageHost(null);
      return;
    }

    let node: HTMLElement | null = null;
    function ensureHost() {
      const stage = document.querySelector<HTMLElement>('.premium-route-stage');
      if (!stage) {
        if (node && !node.isConnected) {
          node = null;
          setPageHost(null);
        }
        return;
      }

      if (node?.isConnected && node.parentElement === stage) return;
      node?.remove();

      const nextNode = document.createElement('div');
      nextNode.className = 'metier-simple-experience-host';
      stage.insertBefore(nextNode, stage.firstChild);
      node = nextNode;
      setPageHost(nextNode);
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
  }, [active, experienceVisible, reception, advanced, onBeautyTeamPage, organization?.id, route.key]);

  if (!active) return null;

  const openReception = () => navigate('/?metier=reception');
  const closeReception = () => navigate('/');
  const openSimple = () => navigate('/offre-metier');
  const openAdvanced = () => navigate('/offre-metier?view=advanced');

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

  return pageHost ? createPortal(page, pageHost) : null;
}
