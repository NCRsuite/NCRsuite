import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { BeautyPublicPageManagementPage } from '../pages/BeautyPublicPageManagementPage';

export function BeautyPublicPageManagementPortal() {
  const location = useLocation();
  const { organization } = useOrganization();
  const [host, setHost] = useState<HTMLElement | null>(null);

  const requested = location.pathname === '/'
    && new URLSearchParams(location.search).get('beauty') === 'page-reservation';
  const authorized = organization?.plan === 'metier'
    && organization.business_type === 'coiffure'
    && ['owner', 'admin', 'manager'].includes(organization.role ?? 'viewer');
  const active = requested && authorized;

  useEffect(() => {
    if (!active) {
      setHost(null);
      return;
    }

    let node: HTMLElement | null = null;

    function mount() {
      const stage = document.querySelector<HTMLElement>('.premium-route-stage');
      if (!stage) return;
      if (node && (!node.isConnected || node.parentElement !== stage)) {
        node.remove();
        node = null;
        setHost(null);
      }
      if (node) return;
      node = document.createElement('div');
      node.className = 'beauty-public-page-route-host';
      stage.appendChild(node);
      setHost(node);
    }

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      node?.remove();
      setHost(null);
    };
  }, [active, organization?.id]);

  if (!active || !host) return null;

  return createPortal(
    <>
      <style>{`
        .premium-route-stage:has(> .beauty-public-page-route-host) > :not(.beauty-public-page-route-host) { display: none !important; }
        .beauty-public-page-route-host { width: 100%; min-width: 0; }
        .beauty-public-page-route-host .beauty-public-page-management { padding-bottom: 48px; }
        @media (max-width: 860px) {
          .beauty-public-page-route-host .beauty-public-page-management { padding-bottom: 108px; }
        }
      `}</style>
      <BeautyPublicPageManagementPage />
    </>,
    host
  );
}
