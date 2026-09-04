import { useEffect, useMemo, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

export interface BeautyEnseigneContextItem {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  is_primary: boolean;
  booking_enabled: boolean;
  public_slug: string | null;
  public_page_enabled: boolean;
  client_profile_activity: 'general' | 'hair' | 'barber' | 'nails' | 'lashes' | 'aesthetics';
  sites: Array<{
    id: string;
    name: string;
    is_primary: boolean;
    location_id: string | null;
    location_name: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
  }>;
}

interface BeautyEnseignePayload {
  enseignes?: BeautyEnseigneContextItem[];
}

export function useBeautyEnseigneContext() {
  const { organization } = useOrganization();
  const [enseignes, setEnseignes] = useState<BeautyEnseigneContextItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const beautyMode = organization?.plan === 'metier' && organization.business_type === 'coiffure';

  useEffect(() => {
    let alive = true;
    let version = 0;

    async function load() {
      if (!beautyMode || !organization || !supabase) {
        if (alive) {
          setEnseignes([]);
          setSelectedId(null);
          setLoading(false);
        }
        return;
      }

      const requestVersion = ++version;
      setLoading(true);
      const { data, error } = await supabase.rpc('metier_beauty_accessible_enseignes', {
        p_organization_id: organization.id
      });
      if (!alive || requestVersion !== version) return;
      if (error) {
        console.error('Impossible de charger le contexte enseigne Beauty.', error);
        setEnseignes([]);
        setSelectedId(null);
        setLoading(false);
        return;
      }

      const next = Array.isArray((data as BeautyEnseignePayload | null)?.enseignes)
        ? ((data as BeautyEnseignePayload).enseignes as BeautyEnseigneContextItem[])
        : [];
      const storageKey = `ncr-suite-beauty-enseigne-${organization.id}`;
      const storedId = localStorage.getItem(storageKey);
      const resolved = (storedId ? next.find((item) => item.id === storedId) : null)
        ?? next.find((item) => item.is_primary)
        ?? next[0]
        ?? null;

      setEnseignes(next);
      setSelectedId(resolved?.id ?? null);
      if (resolved) localStorage.setItem(storageKey, resolved.id);
      setLoading(false);
    }

    function onEnseigneChanged(event: Event) {
      if (!organization) return;
      const custom = event as CustomEvent<{ companyId?: string }>;
      const nextId = custom.detail?.companyId ?? localStorage.getItem(`ncr-suite-beauty-enseigne-${organization.id}`);
      if (nextId) setSelectedId(nextId);
      void load();
    }

    function onStructureChanged() {
      void load();
    }

    void load();
    window.addEventListener('ncr:beauty-enseigne-changed', onEnseigneChanged);
    window.addEventListener('ncr:metier-structure-changed', onStructureChanged);
    return () => {
      alive = false;
      window.removeEventListener('ncr:beauty-enseigne-changed', onEnseigneChanged);
      window.removeEventListener('ncr:metier-structure-changed', onStructureChanged);
    };
  }, [beautyMode, organization?.id]);

  const selectedEnseigne = useMemo(
    () => enseignes.find((item) => item.id === selectedId)
      ?? enseignes.find((item) => item.is_primary)
      ?? enseignes[0]
      ?? null,
    [enseignes, selectedId]
  );

  return {
    beautyMode,
    enseignes,
    selectedEnseigne,
    selectedEnseigneId: selectedEnseigne?.id ?? null,
    loading
  };
}
