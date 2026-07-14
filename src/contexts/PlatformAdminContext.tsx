import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export type PlatformAdminRole = 'super_admin' | 'support';

interface PlatformAdminProfile {
  role: PlatformAdminRole;
  can_manage: boolean;
}

interface PlatformAdminContextValue {
  profile: PlatformAdminProfile | null;
  loading: boolean;
  isAdmin: boolean;
  canManage: boolean;
  refresh: () => Promise<void>;
}

const PlatformAdminContext = createContext<PlatformAdminContextValue | null>(null);

export function PlatformAdminProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, demoMode } = useAuth();
  const [profile, setProfile] = useState<PlatformAdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    if (authLoading) return;
    if (!user || demoMode || !supabase) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc('platform_admin_profile');
    if (error) {
      console.error('Impossible de charger le profil administrateur NCR.', error);
      setProfile(null);
    } else {
      setProfile((data ?? null) as PlatformAdminProfile | null);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadProfile();
  }, [user?.id, authLoading, demoMode]);

  const value = useMemo<PlatformAdminContextValue>(() => ({
    profile,
    loading,
    isAdmin: Boolean(profile),
    canManage: Boolean(profile?.can_manage),
    refresh: loadProfile
  }), [profile, loading]);

  return <PlatformAdminContext.Provider value={value}>{children}</PlatformAdminContext.Provider>;
}

export function usePlatformAdmin() {
  const context = useContext(PlatformAdminContext);
  if (!context) throw new Error('usePlatformAdmin doit être utilisé dans PlatformAdminProvider.');
  return context;
}
