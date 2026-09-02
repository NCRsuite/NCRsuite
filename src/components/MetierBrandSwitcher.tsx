import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

interface AccessibleBrand {
  id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
  compact_logo_url: string | null;
  primary_color: string;
  platform_domain: string | null;
  custom_domain: string | null;
  is_primary: boolean;
  status: string;
  active_sites: number;
}

interface AccessibleSite {
  id: string;
  name: string;
  brand_id: string | null;
}

function brandLogo(brand: AccessibleBrand | null) {
  return brand?.compact_logo_url || brand?.logo_url || null;
}

export function MetierBrandSwitcher() {
  const { organization, activeSiteId, selectSite } = useOrganization();
  const [brands, setBrands] = useState<AccessibleBrand[]>([]);
  const [sites, setSites] = useState<AccessibleSite[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [desktopHost, setDesktopHost] = useState<HTMLElement | null>(null);
  const [mobileHost, setMobileHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!organization || organization.plan !== 'metier' || !supabase) {
        if (active) {
          setBrands([]);
          setSites([]);
          setSelectedBrandId(null);
        }
        return;
      }

      const [brandResult, siteResult] = await Promise.all([
        supabase.rpc('metier_list_accessible_brands', { p_organization_id: organization.id }),
        supabase.rpc('metier_list_accessible_sites', { p_organization_id: organization.id })
      ]);
      if (!active) return;
      if (brandResult.error || siteResult.error) {
        console.error('Impossible de charger le périmètre multi-enseigne.', brandResult.error || siteResult.error);
        setBrands([]);
        setSites([]);
        return;
      }

      const nextBrands = (Array.isArray(brandResult.data) ? brandResult.data : []) as AccessibleBrand[];
      const nextSites = (Array.isArray(siteResult.data) ? siteResult.data : []) as AccessibleSite[];
      setBrands(nextBrands);
      setSites(nextSites);

      const storageKey = `ncr-suite-brand-id-${organization.id}`;
      const storedId = localStorage.getItem(storageKey);
      const host = window.location.hostname.toLowerCase();
      const hostBrand = nextBrands.find((brand) => brand.platform_domain?.toLowerCase() === host || brand.custom_domain?.toLowerCase() === host);
      const siteBrand = activeSiteId ? nextBrands.find((brand) => nextSites.some((site) => site.id === activeSiteId && site.brand_id === brand.id)) : null;
      const storedBrand = storedId ? nextBrands.find((brand) => brand.id === storedId) : null;
      const resolved = siteBrand || storedBrand || hostBrand || nextBrands.find((brand) => brand.is_primary) || nextBrands[0] || null;
      setSelectedBrandId(resolved?.id ?? null);
      if (resolved) localStorage.setItem(storageKey, resolved.id);
    }

    void load();
    return () => { active = false; };
  }, [organization?.id, organization?.plan]);

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === selectedBrandId) ?? brands.find((brand) => brand.is_primary) ?? brands[0] ?? null,
    [brands, selectedBrandId]
  );

  useEffect(() => {
    if (!organization || organization.plan !== 'metier' || brands.length < 2) {
      setDesktopHost(null);
      setMobileHost(null);
      return;
    }

    let desktopNode: HTMLElement | null = null;
    let mobileNode: HTMLElement | null = null;

    function ensureHosts() {
      const desktopContainer = document.querySelector<HTMLElement>('.desktop-context-switchers');
      if (desktopContainer && !desktopNode) {
        desktopNode = document.createElement('div');
        desktopNode.className = 'metier-brand-switcher-host';
        const siteSwitcher = desktopContainer.querySelector('.site-switcher');
        desktopContainer.insertBefore(desktopNode, siteSwitcher ?? null);
        setDesktopHost(desktopNode);
      }

      const mobileSheet = document.querySelector<HTMLElement>('.mobile-account-sheet');
      if (mobileSheet && !mobileNode) {
        mobileNode = document.createElement('div');
        mobileNode.className = 'mobile-organization-section metier-brand-mobile-host';
        const siteSection = mobileSheet.querySelector('.mobile-site-section');
        const accountActions = mobileSheet.querySelector('.mobile-account-actions');
        mobileSheet.insertBefore(mobileNode, siteSection ?? accountActions ?? null);
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
  }, [organization?.id, organization?.plan, brands.length]);

  useEffect(() => {
    if (!organization || organization.plan !== 'metier' || organization.white_label_enabled !== true || !selectedBrand) return;
    const root = document.documentElement;
    const previousColor = root.style.getPropertyValue('--tenant-brand-color');
    const previousTitle = document.title;
    const logoUrl = brandLogo(selectedBrand);
    const mainLogoUrl = selectedBrand.logo_url || logoUrl;
    const previousImages = new Map<HTMLImageElement, { src: string; alt: string }>();
    const previousTexts = new Map<HTMLElement, string>();

    root.dataset.metierWhiteLabel = 'true';
    root.style.setProperty('--tenant-brand-color', selectedBrand.primary_color);
    document.title = selectedBrand.name;

    function apply() {
      if (logoUrl) {
        document.querySelectorAll<HTMLImageElement>('.sidebar .brand.brand-horizontal img, .mobile-drawer-header img, .mobile-header-company img, .loading-screen img').forEach((image) => {
          if (!previousImages.has(image)) previousImages.set(image, { src: image.src, alt: image.alt });
          image.src = logoUrl;
          image.alt = selectedBrand.name;
        });
      }
      if (mainLogoUrl) {
        document.querySelectorAll<HTMLImageElement>('.showcase-brand img, .auth-wordmark').forEach((image) => {
          if (!previousImages.has(image)) previousImages.set(image, { src: image.src, alt: image.alt });
          image.src = mainLogoUrl;
          image.alt = selectedBrand.name;
        });
      }
      document.querySelectorAll<HTMLElement>('.mobile-header-company strong').forEach((node) => {
        if (!previousTexts.has(node)) previousTexts.set(node, node.textContent ?? '');
        node.textContent = selectedBrand.name;
      });
      const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
      if (favicon && logoUrl) favicon.href = logoUrl;
    }

    apply();
    const observer = new MutationObserver(() => queueMicrotask(apply));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      previousImages.forEach((previous, image) => {
        if (image.isConnected) {
          image.src = previous.src;
          image.alt = previous.alt;
        }
      });
      previousTexts.forEach((text, node) => { if (node.isConnected) node.textContent = text; });
      document.title = previousTitle;
      if (previousColor) root.style.setProperty('--tenant-brand-color', previousColor);
      else root.style.removeProperty('--tenant-brand-color');
    };
  }, [organization?.id, organization?.plan, organization?.white_label_enabled, selectedBrand?.id, selectedBrand?.primary_color, selectedBrand?.logo_url, selectedBrand?.compact_logo_url]);

  function chooseBrand(brand: AccessibleBrand) {
    if (!organization) return;
    setSelectedBrandId(brand.id);
    localStorage.setItem(`ncr-suite-brand-id-${organization.id}`, brand.id);
    const brandSites = sites.filter((site) => site.brand_id === brand.id);
    if (!activeSiteId || !brandSites.some((site) => site.id === activeSiteId)) {
      selectSite(brandSites[0]?.id ?? null);
    }
    setDesktopOpen(false);
  }

  if (!organization || organization.plan !== 'metier' || brands.length < 2 || !selectedBrand) return null;

  const logo = brandLogo(selectedBrand);
  const desktop = (
    <div className={`context-switcher metier-brand-switcher${desktopOpen ? ' open' : ''}`}>
      <div className="context-switcher-label"><span>Enseigne</span><small>{brands.length} accessibles</small></div>
      <button className="context-switcher-trigger" type="button" onClick={() => setDesktopOpen((current) => !current)} aria-expanded={desktopOpen}>
        <span className={`context-switcher-icon${logo ? ' has-image' : ''}`} style={{ background: logo ? '#fff' : selectedBrand.primary_color }}>
          {logo ? <img src={logo} alt="" /> : <Icon name="sparkles" size={18} />}
        </span>
        <span className="context-switcher-copy"><strong>{selectedBrand.name}</strong><small>{selectedBrand.code || 'Enseigne active'}</small></span>
        <span className="context-switcher-chevron"><Icon name="chevronDown" size={17} /></span>
      </button>
      <div className="context-switcher-foot site"><span><i />{selectedBrand.active_sites} établissement(s)</span></div>
      {desktopOpen && (
        <div className="context-switcher-menu" role="listbox" aria-label="Choisir une enseigne">
          <header><span>Vos enseignes</span><small>{brands.length}</small></header>
          <div className="context-switcher-options">
            {brands.map((brand) => {
              const active = brand.id === selectedBrand.id;
              const itemLogo = brandLogo(brand);
              return <button type="button" role="option" aria-selected={active} key={brand.id} className={active ? 'active' : ''} onClick={() => chooseBrand(brand)}>
                <span className={`context-option-icon${itemLogo ? ' has-image' : ''}`} style={{ background: itemLogo ? '#fff' : brand.primary_color }}>{itemLogo ? <img src={itemLogo} alt="" /> : <Icon name="sparkles" size={17} />}</span>
                <span className="context-option-copy"><strong>{brand.name}</strong><small>{brand.active_sites} établissement(s)</small></span>
                {active ? <span className="context-option-check"><Icon name="check" size={15} /></span> : <Icon name="chevronRight" size={15} />}
              </button>;
            })}
          </div>
        </div>
      )}
    </div>
  );

  const mobile = (
    <>
      <div className="mobile-sheet-title"><div><span>Enseigne active</span><small>{brands.length} enseignes accessibles</small></div></div>
      <div className="mobile-organization-list">
        {brands.map((brand) => {
          const active = brand.id === selectedBrand.id;
          const itemLogo = brandLogo(brand);
          return <button type="button" key={brand.id} className={`mobile-organization-option${active ? ' active' : ''}`} onClick={() => chooseBrand(brand)}>
            <span className={`mobile-organization-logo${itemLogo ? ' has-image' : ''}`} style={{ background: itemLogo ? '#fff' : brand.primary_color }}>{itemLogo ? <img src={itemLogo} alt="" /> : <Icon name="sparkles" size={19} />}</span>
            <span className="mobile-organization-copy"><strong>{brand.name}</strong><small>{brand.active_sites} établissement(s){brand.code ? ` · ${brand.code}` : ''}</small></span>
            {active && <Icon name="check" size={20} />}
          </button>;
        })}
      </div>
    </>
  );

  return <>{desktopHost && createPortal(desktop, desktopHost)}{mobileHost && createPortal(mobile, mobileHost)}</>;
}
