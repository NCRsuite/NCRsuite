import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { usePlatformAdmin } from '../contexts/PlatformAdminContext';
import { supabase } from '../lib/supabase';

type AuthorizationState = 'idle' | 'checking' | 'allowed' | 'denied';

interface OnboardingAuthorization {
  allowed?: boolean;
  reason?: string;
}

export function EnterpriseOnboardingGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: organizationLoading } = useOrganization();
  const { isAdmin, loading: adminLoading } = usePlatformAdmin();
  const [authorizationState, setAuthorizationState] = useState<AuthorizationState>('idle');
  const [denialReason, setDenialReason] = useState('');

  const isOnboardingRoute = location.pathname === '/configuration'
    || location.pathname.startsWith('/configuration/');

  useEffect(() => {
    if (!isOnboardingRoute) {
      setAuthorizationState('idle');
      setDenialReason('');
      return;
    }

    if (authLoading || organizationLoading || adminLoading) return;

    // Les redirections normales de l'application restent responsables des visiteurs,
    // des administrateurs et des membres déjà rattachés à une entreprise.
    if (!user || isAdmin || organization) {
      setAuthorizationState('allowed');
      setDenialReason('');
      return;
    }

    if (!supabase) {
      setAuthorizationState('denied');
      setDenialReason('service_unavailable');
      return;
    }

    let cancelled = false;
    setAuthorizationState('checking');
    setDenialReason('');

    void supabase.rpc('get_my_onboarding_authorization').then(({ data, error }) => {
      if (cancelled) return;

      if (error) {
        console.error('Vérification de l’autorisation d’onboarding impossible.', error);
        // Fail closed : une panne de contrôle ne doit jamais ouvrir l’onboarding.
        setDenialReason('authorization_check_failed');
        setAuthorizationState('denied');
        return;
      }

      const authorization = (data ?? {}) as OnboardingAuthorization;
      if (authorization.allowed === true) {
        setAuthorizationState('allowed');
        return;
      }

      setDenialReason(String(authorization.reason ?? 'no_approved_request'));
      setAuthorizationState('denied');
    });

    return () => {
      cancelled = true;
    };
  }, [
    isOnboardingRoute,
    user?.id,
    authLoading,
    organizationLoading,
    adminLoading,
    isAdmin,
    organization?.id
  ]);

  if (!isOnboardingRoute) return <>{children}</>;

  if (authLoading || organizationLoading || adminLoading) return null;
  if (!user || isAdmin || organization) return <>{children}</>;

  if (authorizationState === 'denied') {
    return (
      <Navigate
        to="/demande-acces"
        replace
        state={{ enterpriseAccessDenied: true, reason: denialReason }}
      />
    );
  }

  if (authorizationState !== 'allowed') return null;

  return <>{children}</>;
}
