import { useEffect, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

interface RuntimeBranding {
  brand_id?: string;
  brand_name: string;
  logo_url: string | null;
  compact_logo_url: string | null;
  primary_color: string | null;
  platform_domain?: string | null;
  custom_domain?: string | null;
  white_label_enabled: boolean;
  show_ncr_branding: boolean;
}

interface ListedBrand {
  id: string;
  name: string;
  logo_url: string | null;
  compact_logo_url: string | null;
  primary_color: string | null;
  is_primary: boolean;
  status: string;
  platform_domain?: string | null;
  custom_domain?: string | null;
}

function normalizeRuntimePayload(value: unknown): RuntimeBranding | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const brandName = typeof row.brand_name === 'string' ? row.brand_name.trim() : '';
  if (!brandName) return null;
  const logoUrl = typeof row.logo_url === 'string' && row.logo_url.trim() ? row.logo_url : null;
  const compactLogoUrl = typeof row.compact_logo_url === 'string' && row.compact_logo_url.trim()
    ? row.compact_logo_url
    : logoUrl;
  return {
    brand_id: typeof row.brand_id === 'string' ? row.brand_id : undefined,
    brand_name: brandName,
    logo_url: logoUrl,
    compact_logo_url: compactLogoUrl,
    primary_color: typeof row.primary_color === 'string' ? row.primary_color : null,
    platform_domain: typeof row.platform_domain === 'string' ? row.platform_domain : null,
    custom_domain: typeof row.custom_domain === 'string' ? row.custom_domain : null,
    white_label_enabled: row.white_label_enabled === true,
    show_ncr_branding: row.show_ncr_branding !== false
  };
}

export function MetierRuntimeBranding() {
  const { organization } = useOrganization();
  const [branding, setBranding] = useState<RuntimeBranding | null>(null);

  useEffect(() => {
    let active = true;

    async function resolveBranding() {
      if (!supabase) {
        if (active) setBranding(null);
        return;
      }

      const hostname = window.location.hostname.toLowerCase();
      const { data: hostData, error: hostError } = await supabase.rpc('resolve_public_metier_brand_host', {
        p_host: hostname
      });
      if (!active) return;

      if (!hostError) {
        const hostBranding = normalizeRuntimePayload(hostData);
        if (hostBranding?.white_label_enabled) {
          setBranding(hostBranding);
          return;
        }
      }

      if (!organization || organization.plan !== 'metier' || organization.white_label_enabled !== true) {
        setBranding(null);
        return;
      }

      const { data: brandsData, error: brandsError } = await supabase.rpc('metier_list_brands', {
        p_organization_id: organization.id
      });
      if (!active) return;
      if (brandsError || !Array.isArray(brandsData)) {
        setBranding(null);
        return;
      }

      const brands = brandsData as ListedBrand[];
      const primary = brands.find((brand) => brand.is_primary && brand.status === 'active')
        ?? brands.find((brand) => brand.status === 'active');
      if (!primary) {
        setBranding(null);
        return;
      }

      const mainLogo = primary.logo_url || organization.logo_url || null;
      setBranding({
        brand_id: primary.id,
        brand_name: primary.name,
        logo_url: mainLogo,
        compact_logo_url: primary.compact_logo_url || mainLogo,
        primary_color: primary.primary_color || organization.primary_color || null,
        platform_domain: primary.platform_domain ?? null,
        custom_domain: primary.custom_domain ?? null,
        white_label_enabled: true,
        show_ncr_branding: organization.show_ncr_branding !== false
      });
    }

    void resolveBranding();
    return () => { active = false; };
  }, [organization?.id, organization?.plan, organization?.white_label_enabled, organization?.show_ncr_branding, organization?.logo_url]);

  useEffect(() => {
    if (!branding?.white_label_enabled) return;
    const activeBranding = branding;

    const originalTitle = document.title;
    const root = document.documentElement;
    const previousTenantAccent = root.style.getPropertyValue('--tenant-brand-color');
    if (activeBranding.primary_color) root.style.setProperty('--tenant-brand-color', activeBranding.primary_color);
    document.title = activeBranding.brand_name;

    const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const originalFavicon = favicon?.href ?? null;
    const faviconLogo = activeBranding.compact_logo_url || activeBranding.logo_url;
    if (faviconLogo && favicon) favicon.href = faviconLogo;

    const restore = new Map<HTMLImageElement, { src: string; alt: string; style: string | null }>();

    function remember(image: HTMLImageElement) {
      if (!restore.has(image)) {
        restore.set(image, { src: image.src, alt: image.alt, style: image.getAttribute('style') });
      }
    }

    function applyLogo(image: HTMLImageElement, logoUrl: string, mode: 'compact' | 'mobileHeader' | 'main' | 'loading') {
      remember(image);
      image.src = logoUrl;
      image.alt = activeBranding.brand_name;
      image.style.setProperty('object-fit', 'contain', 'important');
      image.style.setProperty('object-position', 'center', 'important');
      image.style.setProperty('display', 'block', 'important');
      image.style.setProperty('width', 'auto', 'important');
      image.style.setProperty('height', 'auto', 'important');

      if (mode === 'mobileHeader') {
        image.style.setProperty('max-width', '46px', 'important');
        image.style.setProperty('max-height', '46px', 'important');
        image.style.setProperty('margin', '0', 'important');
        image.style.setProperty('flex', '0 0 auto', 'important');
      } else if (mode === 'compact') {
        const mobileDrawer = image.matches('.mobile-drawer-header img');
        image.style.setProperty('max-width', mobileDrawer ? '112px' : '132px', 'important');
        image.style.setProperty('max-height', mobileDrawer ? '40px' : '52px', 'important');
        image.style.setProperty('margin', '0 auto', 'important');
        image.style.setProperty('flex', '0 0 auto', 'important');
      } else if (mode === 'loading') {
        image.style.setProperty('max-width', '72px', 'important');
        image.style.setProperty('max-height', '72px', 'important');
        image.style.setProperty('margin', '0 auto', 'important');
      } else {
        image.style.setProperty('max-width', '240px', 'important');
        image.style.setProperty('max-height', '88px', 'important');
      }
    }

    function applyBranding() {
      const compactLogoUrl = activeBranding.compact_logo_url || activeBranding.logo_url;
      const mainLogoUrl = activeBranding.logo_url || compactLogoUrl;

      if (compactLogoUrl) {
        document.querySelectorAll<HTMLImageElement>('.sidebar .brand.brand-horizontal img, .mobile-drawer-header img')
          .forEach((image) => applyLogo(image, compactLogoUrl, 'compact'));
        document.querySelectorAll<HTMLImageElement>('.mobile-header-company img')
          .forEach((image) => applyLogo(image, compactLogoUrl, 'mobileHeader'));
      }

      if (mainLogoUrl) {
        document.querySelectorAll<HTMLImageElement>('.showcase-brand img, .auth-wordmark')
          .forEach((image) => applyLogo(image, mainLogoUrl, 'main'));
        document.querySelectorAll<HTMLImageElement>('.loading-screen img')
          .forEach((image) => applyLogo(image, compactLogoUrl || mainLogoUrl, 'loading'));
      }
    }

    applyBranding();
    const observer = new MutationObserver(applyBranding);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      restore.forEach((original, image) => {
        if (!image.isConnected) return;
        image.src = original.src;
        image.alt = original.alt;
        if (original.style === null) image.removeAttribute('style');
        else image.setAttribute('style', original.style);
      });
      document.title = originalTitle;
      if (favicon && originalFavicon) favicon.href = originalFavicon;
      if (previousTenantAccent) root.style.setProperty('--tenant-brand-color', previousTenantAccent);
      else root.style.removeProperty('--tenant-brand-color');
    };
  }, [branding?.brand_id, branding?.brand_name, branding?.logo_url, branding?.compact_logo_url, branding?.primary_color, branding?.white_label_enabled]);

  return null;
}
