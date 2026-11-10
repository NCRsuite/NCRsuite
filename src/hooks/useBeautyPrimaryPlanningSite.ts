import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { OrganizationSite } from '../types';

interface PrimaryPlanningSite extends OrganizationSite { company_id: string }

/** Single-site planning only: never exposes the Métier company/site switcher. */
export function useBeautyPrimaryPlanningSite(organizationId: string | undefined, enabled: boolean) {
  const [state, setState] = useState<{ organizationId?: string; site: PrimaryPlanningSite | null; error: string }>({ site: null, error: '' });
  useEffect(() => {
    let active = true;
    async function load() {
      if (!enabled || !organizationId || !supabase) return;
      const company = await supabase.from('organization_companies').select('id')
        .eq('organization_id', organizationId).eq('status', 'active').eq('is_primary', true).maybeSingle();
      if (!active) return;
      if (company.error || !company.data) {
        setState({ organizationId, site: null, error: 'Impossible de déterminer l’enseigne principale du planning.' });
        return;
      }
      const site = await supabase.from('organization_sites')
        .select('id,organization_id,company_id,name,timezone,is_primary,status')
        .eq('organization_id', organizationId).eq('company_id', company.data.id)
        .eq('status', 'active').eq('is_primary', true).maybeSingle();
      if (!active) return;
      setState({ organizationId, site: site.error ? null : site.data as PrimaryPlanningSite | null,
        error: site.error || !site.data ? 'Impossible de déterminer l’établissement principal du planning.' : '' });
    }
    void load();
    return () => { active = false; };
  }, [organizationId, enabled]);
  const current = enabled && state.organizationId === organizationId;
  return { site: current ? state.site : null, error: current ? state.error : '', loading: enabled && !current };
}
