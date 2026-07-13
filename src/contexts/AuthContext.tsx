import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  demoMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  startDemo: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const demoUser = {
  id: 'demo-user',
  email: 'demo@ncr-suite.local',
  user_metadata: { full_name: 'Compte de démonstration' }
} as unknown as User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(() =>
    localStorage.getItem('ncr-suite-demo') === 'true' ? demoUser : null
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const demoMode = !isSupabaseConfigured || user?.id === 'demo-user';

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    demoMode,
    async signIn(email, password) {
      if (!supabase) throw new Error('Supabase n’est pas encore configuré.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email, password, fullName) {
      if (!supabase) throw new Error('Supabase n’est pas encore configuré.');
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;
    },
    async signOut() {
      localStorage.removeItem('ncr-suite-demo');
      localStorage.removeItem('ncr-suite-demo-org');
      if (supabase) await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    },
    startDemo() {
      localStorage.setItem('ncr-suite-demo', 'true');
      setUser(demoUser);
    }
  }), [user, session, loading, demoMode]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}
