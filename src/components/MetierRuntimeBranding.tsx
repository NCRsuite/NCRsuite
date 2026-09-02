import { useEffect, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

interface RuntimeBranding {
  brand_id?: string;
  brand_name: string;
  logo_url: string | null;
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
  return {
    brand_id: typeof row.brand_id === 'string' ? row.brand_id : undefined,
    brand_name: brandName,
    logo_url: typeof row.logo_url === 'string' && row.logo_url.trim() ? row.logo_url : null,
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

      setBranding({
        brand_id: primary.id,
        brand_name: primary.name,
        logo_url: primary.logo_url || organization.logo_url || null,
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
    if (activeBranding.logo_url && favicon) favicon.href = activeBranding.logo_url;

    const restore = new Map<HTMLImageElement, { src: string; alt: string }>();

    function applyBranding() {
      if (!activeBranding.logo_url) return;
      const selectors = [
        '.sidebar .brand.brand-horizontal img',
        '.mobile-drawer-header img',
        '.showcase-brand img',
        '.auth-wordmark',
        '.loading-screen img'
      ];
      document.querySelectorAll<HTMLImageElement>(selectors.join(',')).forEach((image) => {
        if (!restore.has(image)) restore.set(image, { src: image.src, alt: image.alt });
        image.src = activeBranding.logo_url;
        image.alt = activeBranding.brand_name;
      });
    }

    applyBranding();
    const observer = new MutationObserver(applyBranding);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      restore.forEach((original, image) => {
        if (image.isConnected) {
          image.src = original.src;
          image.alt = original.alt;
        }
      });
      document.title = originalTitle;
      if (favicon && originalFavicon) favicon.href = originalFavicon;
      if (previousTenantAccent) root.style.setProperty('--tenant-brand-color', previousTenantAccent);
      else root.style.removeProperty('--tenant-brand-color');
    };
  }, [branding?.brand_id, branding?.brand_name, branding?.logo_url, branding?.primary_color, branding?.white_label_enabled]);

  return null;
}
