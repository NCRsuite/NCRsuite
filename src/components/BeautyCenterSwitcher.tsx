import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

interface BeautyEnseigneSite {
  id: string;
  name: string;
  is_primary: boolean;
  location_id: string | null;
  location_name: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
}

interface BeautyEnseigne {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  is_primary: boolean;
  booking_enabled: boolean;
  public_slug: string | null;
  public_page_enabled: boolean;
  public_banner_url: string | null;
  sites: BeautyEnseigneSite[];
}

interface BeautyEnseignePayload {
  enseignes?: BeautyEnseigne[];
}

function locationLabel(site: BeautyEnseigneSite | null) {
  if (!site) return 'Adresse à configurer';
  return [site.location_name, site.city].filter(Boolean).join(' · ')
    || [site.address, site.postal_code, site.city].filter(Boolean).join(' · ')
    || site.name;
}

export function BeautyCenterSwitcher() {
  const { organization, activeSiteId, selectSite } = useOrganization();
  const [enseignes, setEnseignes] = useState<BeautyEnseigne[]>([]);
  const [selectedEnseigneId, setSelectedEnseigneId] = useState<string | null>(null);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [desktopHost, setDesktopHost] = useState<HTMLElement | null>(null);
  const [mobileHost, setMobileHost] = useState<HTMLElement | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  const active = organization?.plan === 'metier' && organization.business_type === 'coiffure';

  useEffect(() => {
    const refresh = () => setReloadVersion((current) => current + 1);
    window.addEventListener('ncr:metier-structure-changed', refresh);
    return () => window.removeEventListener('ncr:metier-structure-changed', refresh);
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!active || !organization || !supabase) {
        if (alive) {
          setEnseignes([]);
          setSelectedEnseigneId(null);
        }
        return;
      }

      const { data, error } = await supabase.rpc('metier_beauty_accessible_enseignes', {
        p_organization_id: organization.id
      });
      if (!alive) return;
      if (error) {
        console.error('Impossible de charger les enseignes Beauty.', error);
        setEnseignes([]);
        return;
      }

      const next = Array.isArray((data as BeautyEnseignePayload | null)?.enseignes)
        ? ((data as BeautyEnseignePayload).enseignes as BeautyEnseigne[])
        : [];
      setEnseignes(next);

      const storageKey = `ncr-suite-beauty-enseigne-${organization.id}`;
      const storedId = localStorage.getItem(storageKey);
      const siteEnseigne = activeSiteId
        ? next.find((enseigne) => enseigne.sites.some((site) => site.id === activeSiteId))
        : null;
      const stored = storedId ? next.find((enseigne) => enseigne.id === storedId) : null;
      const resolved = siteEnseigne || stored || next.find((enseigne) => enseigne.is_primary) || next[0] || null;

      setSelectedEnseigneId(resolved?.id ?? null);
      if (resolved) {
        localStorage.setItem(storageKey, resolved.id);
        if (!activeSiteId || !resolved.sites.some((site) => site.id === activeSiteId)) {
          const preferredSite = resolved.sites.find((site) => site.is_primary) || resolved.sites[0] || null;
          selectSite(preferredSite?.id ?? null);
        }
      }
    }

    void load();
    return () => { alive = false; };
  }, [active, organization?.id, activeSiteId, reloadVersion]);

  const selectedEnseigne = useMemo(
    () => enseignes.find((enseigne) => enseigne.id === selectedEnseigneId)
      ?? enseignes.find((enseigne) => enseigne.is_primary)
      ?? enseignes[0]
      ?? null,
    [enseignes, selectedEnseigneId]
  );

  const selectedSite = useMemo(() => {
    if (!selectedEnseigne) return null;
    return selectedEnseigne.sites.find((site) => site.id === activeSiteId)
      ?? selectedEnseigne.sites.find((site) => site.is_primary)
      ?? selectedEnseigne.sites[0]
      ?? null;
  }, [selectedEnseigne, activeSiteId]);

  useEffect(() => {
    if (!active) {
      setDesktopHost(null);
      setMobileHost(null);
      return;
    }

    let desktopNode: HTMLElement | null = null;
    let mobileNode: HTMLElement | null = null;

    function ensureHosts() {
      const desktopContainer = document.querySelector<HTMLElement>('.desktop-context-switchers');
      if (desktopNode && (!desktopNode.isConnected || desktopNode.parentElement !== desktopContainer)) {
        desktopNode.remove();
        desktopNode = null;
        setDesktopHost(null);
      }
      if (desktopContainer && !desktopNode) {
        desktopNode = document.createElement('div');
        desktopNode.className = 'beauty-center-switcher-host';
        const organizationSwitcher = desktopContainer.querySelector('.organization-switcher');
        if (organizationSwitcher?.nextSibling) desktopContainer.insertBefore(desktopNode, organizationSwitcher.nextSibling);
        else desktopContainer.appendChild(desktopNode);
        setDesktopHost(desktopNode);
      }

      const mobileSheet = document.querySelector<HTMLElement>('.mobile-account-sheet');
      if (mobileNode && (!mobileNode.isConnected || mobileNode.parentElement !== mobileSheet)) {
        mobileNode.remove();
        mobileNode = null;
        setMobileHost(null);
      }
      if (mobileSheet && !mobileNode) {
        mobileNode = document.createElement('div');
        mobileNode.className = 'mobile-organization-section beauty-center-mobile-host';
        const accountActions = mobileSheet.querySelector('.mobile-account-actions');
        mobileSheet.insertBefore(mobileNode, accountActions ?? null);
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

  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.dataset.beautyCenterContext = 'true';
    const originalTexts = new Map<HTMLElement, string>();

    function replaceText(node: HTMLElement | null, value: string) {
      if (!node) return;
      if (!originalTexts.has(node)) originalTexts.set(node, node.textContent ?? '');
      if (node.textContent !== value) node.textContent = value;
    }

    function applyLabels() {
      replaceText(document.querySelector<HTMLElement>('.sidebar .organization-switcher .context-switcher-label > span'), 'Maison mère');
      replaceText(document.querySelector<HTMLElement>('.sidebar .organization-switcher .context-switcher-label > small'), 'Centre actif');
      replaceText(document.querySelector<HTMLElement>('.mobile-account-sheet > .mobile-organization-section:not(.beauty-center-mobile-host) .mobile-sheet-title span'), 'Maison mère');
      replaceText(document.querySelector<HTMLElement>('.mobile-account-sheet > .mobile-organization-section:not(.beauty-center-mobile-host) .mobile-sheet-title small'), 'Centre Coiffure & Beauté');
      const drawerContext = document.querySelector<HTMLElement>('.mobile-drawer-organization > span:nth-child(2) small');
      if (selectedEnseigne) replaceText(drawerContext, `Enseigne · ${selectedEnseigne.name}`);
    }

    applyLabels();
    const observer = new MutationObserver(applyLabels);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      originalTexts.forEach((text, node) => { if (node.isConnected) node.textContent = text; });
      if (root.dataset.beautyCenterContext === 'true') delete root.dataset.beautyCenterContext;
    };
  }, [active, organization?.id, selectedEnseigne?.id, selectedEnseigne?.name]);

  function chooseEnseigne(enseigne: BeautyEnseigne) {
    if (!organization) return;
    setSelectedEnseigneId(enseigne.id);
    localStorage.setItem(`ncr-suite-beauty-enseigne-${organization.id}`, enseigne.id);
    const currentBelongsToEnseigne = activeSiteId && enseigne.sites.some((site) => site.id === activeSiteId);
    if (!currentBelongsToEnseigne) {
      const preferredSite = enseigne.sites.find((site) => site.is_primary) || enseigne.sites[0] || null;
      selectSite(preferredSite?.id ?? null);
    }
    setDesktopOpen(false);
    window.dispatchEvent(new CustomEvent('ncr:beauty-enseigne-changed', { detail: { companyId: enseigne.id } }));
  }

  function chooseSite(siteId: string) {
    selectSite(siteId || null);
    window.dispatchEvent(new CustomEvent('ncr:beauty-site-changed', { detail: { siteId: siteId || null } }));
  }

  if (!active || !selectedEnseigne || enseignes.length === 0) return null;

  const selectedLogo = selectedEnseigne.logo_url;
  const desktop = (
    <div className={`context-switcher beauty-enseigne-switcher${desktopOpen ? ' open' : ''}`}>
      <div className="context-switcher-label">
        <span>Enseigne</span>
        <small>{enseignes.length > 1 ? `${enseignes.length} dans le centre` : '1 dans le centre'}</small>
      </div>
      <button className="context-switcher-trigger" type="button" onClick={() => setDesktopOpen((current) => !current)} aria-expanded={desktopOpen}>
        <span className={`context-switcher-icon${selectedLogo ? ' has-image' : ''}`} style={{ background: selectedLogo ? '#fff' : selectedEnseigne.primary_color }}>
          {selectedLogo ? <img src={selectedLogo} alt="" /> : selectedEnseigne.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="context-switcher-copy">
          <strong>{selectedEnseigne.name}</strong>
          <small>{selectedEnseigne.public_page_enabled ? 'Page publique active' : 'Page publique à configurer'}</small>
        </span>
        <span className="context-switcher-chevron"><Icon name="chevronDown" size={17} /></span>
      </button>
      <div className="beauty-enseigne-location-row">
        <span><Icon name="map" size={13} /> {locationLabel(selectedSite)}</span>
        {selectedEnseigne.sites.length > 1 && (
          <select value={selectedSite?.id ?? ''} onChange={(event) => chooseSite(event.target.value)} aria-label="Choisir le lieu de cette enseigne">
            {selectedEnseigne.sites.map((site) => <option key={site.id} value={site.id}>{locationLabel(site)}</option>)}
          </select>
        )}
      </div>
      {desktopOpen && (
        <div className="context-switcher-menu beauty-enseigne-menu" role="listbox" aria-label="Choisir une enseigne">
          <header><span>Enseignes du centre</span><small>{enseignes.length}</small></header>
          <div className="context-switcher-options">
            {enseignes.map((enseigne) => {
              const current = enseigne.id === selectedEnseigne.id;
              return (
                <button type="button" role="option" aria-selected={current} key={enseigne.id} className={current ? 'active' : ''} onClick={() => chooseEnseigne(enseigne)}>
                  <span className={`context-option-icon${enseigne.logo_url ? ' has-image' : ''}`} style={{ background: enseigne.logo_url ? '#fff' : enseigne.primary_color }}>
                    {enseigne.logo_url ? <img src={enseigne.logo_url} alt="" /> : enseigne.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="context-option-copy">
                    <strong>{enseigne.name}</strong>
                    <small>{enseigne.sites.length ? locationLabel(enseigne.sites.find((site) => site.is_primary) || enseigne.sites[0]) : 'Adresse à configurer'} · {enseigne.public_page_enabled ? 'page publique' : 'page à publier'}</small>
                  </span>
                  {current ? <span className="context-option-check"><Icon name="check" size={15} /></span> : <Icon name="chevronRight" size={15} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const mobile = (
    <>
      <div className="mobile-sheet-title">
        <div><span>Enseigne active</span><small>{enseignes.length} enseigne{enseignes.length > 1 ? 's' : ''} dans ce centre</small></div>
      </div>
      <div className="mobile-organization-list beauty-enseigne-mobile-list">
        {enseignes.map((enseigne) => {
          const current = enseigne.id === selectedEnseigne.id;
          return (
            <button type="button" key={enseigne.id} className={`mobile-organization-option${current ? ' active' : ''}`} onClick={() => chooseEnseigne(enseigne)}>
              <span className={`mobile-organization-logo${enseigne.logo_url ? ' has-image' : ''}`} style={{ background: enseigne.logo_url ? '#fff' : enseigne.primary_color }}>
                {enseigne.logo_url ? <img src={enseigne.logo_url} alt="" /> : enseigne.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="mobile-organization-copy">
                <strong>{enseigne.name}</strong>
                <small>{enseigne.sites.length ? locationLabel(enseigne.sites.find((site) => site.is_primary) || enseigne.sites[0]) : 'Adresse à configurer'}</small>
              </span>
              {current && <Icon name="check" size={20} />}
            </button>
          );
        })}
      </div>
      {selectedEnseigne.sites.length > 1 && (
        <label className="beauty-mobile-location-picker">
          <span>Lieu de cette enseigne</span>
          <select value={selectedSite?.id ?? ''} onChange={(event) => chooseSite(event.target.value)}>
            {selectedEnseigne.sites.map((site) => <option key={site.id} value={site.id}>{locationLabel(site)}</option>)}
          </select>
        </label>
      )}
    </>
  );

  return <>{desktopHost && createPortal(desktop, desktopHost)}{mobileHost && createPortal(mobile, mobileHost)}</>;
}
