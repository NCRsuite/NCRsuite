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
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    if (authLoading) return;
    if (!user || demoMode || !supabase) {
      setProfile(null);
      setProfileUserId(user?.id ?? null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setProfile(null);
    const { data, error } = await supabase.rpc('platform_admin_profile');
    if (error) {
      console.error('Impossible de charger le profil administrateur NCR.', error);
      setProfile(null);
    } else {
      setProfile((data ?? null) as PlatformAdminProfile | null);
    }
    setProfileUserId(user.id);
    setLoading(false);
  }

  useEffect(() => {
    void loadProfile();
  }, [user?.id, authLoading, demoMode]);

  const resolvedLoading = loading || authLoading || Boolean(user && profileUserId !== user.id);

  const value = useMemo<PlatformAdminContextValue>(() => ({
    profile,
    loading: resolvedLoading,
    isAdmin: Boolean(profile),
    canManage: Boolean(profile?.can_manage),
    refresh: loadProfile
  }), [profile, resolvedLoading]);

  return <PlatformAdminContext.Provider value={value}>{children}</PlatformAdminContext.Provider>;
}

export function usePlatformAdmin() {
  const context = useContext(PlatformAdminContext);
  if (!context) throw new Error('usePlatformAdmin doit être utilisé dans PlatformAdminProvider.');
  return context;
}
