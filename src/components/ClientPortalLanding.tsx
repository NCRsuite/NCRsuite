import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { usePlatformAdmin } from '../contexts/PlatformAdminContext';
import { supabase } from '../lib/supabase';

type ClientPortalDestination = {
  key: 'coiffure' | 'formation' | 'nettoyage' | 'securite';
  label: string;
  description: string;
  path: string;
};

const portalChecks: Array<ClientPortalDestination & { rpc: string }> = [
  {
    key: 'coiffure',
    label: 'Coiffure & beauté',
    description: 'Rendez-vous, fidélité et profil client.',
    path: '/espace-client-coiffure',
    rpc: 'current_coiffure_client_portal_accounts'
  },
  {
    key: 'formation',
    label: 'Formation',
    description: 'Sessions, documents, signatures et espace stagiaire.',
    path: '/espace-formation',
    rpc: 'current_training_portal_accounts'
  },
  {
    key: 'nettoyage',
    label: 'Nettoyage',
    description: 'Interventions, rapports, qualité et documents.',
    path: '/espace-nettoyage',
    rpc: 'current_cleaning_client_portal_accounts'
  },
  {
    key: 'securite',
    label: 'Sécurité privée',
    description: 'Missions, rapports, rondes et documents.',
    path: '/espace-securite',
    rpc: 'current_security_client_portal_accounts'
  }
];

export function ClientPortalConfigurationGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: organizationLoading } = useOrganization();
  const { isAdmin, loading: adminLoading } = usePlatformAdmin();
  const location = useLocation();
  const explicitEnterpriseOnboarding = new URLSearchParams(location.search).get('nouvelle-entreprise') === '1';
  const shouldResolve = location.pathname === '/configuration'
    && !explicitEnterpriseOnboarding
    && Boolean(user)
    && !authLoading
    && !organizationLoading
    && !adminLoading
    && !organization
    && !isAdmin;
  const [loading, setLoading] = useState(false);
  const [resolvedForUserId, setResolvedForUserId] = useState('');
  const [destinations, setDestinations] = useState<ClientPortalDestination[]>([]);

  useEffect(() => {
    let active = true;

    if (!shouldResolve || !user) {
      setLoading(false);
      setResolvedForUserId('');
      setDestinations([]);
      return () => { active = false; };
    }

    async function resolveClientPortals() {
      if (!supabase) {
        if (active) {
          setDestinations([]);
          setResolvedForUserId(user.id);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const checks = await Promise.all(portalChecks.map(async ({ rpc, ...destination }) => {
        const { data, error } = await supabase.rpc(rpc);
        if (error) {
          console.warn(`Impossible de vérifier le portail client ${destination.key}.`, error);
          return null;
        }
        return Array.isArray(data) && data.length > 0 ? destination : null;
      }));

      if (!active) return;
      setDestinations(checks.filter((item): item is ClientPortalDestination => Boolean(item)));
      setResolvedForUserId(user.id);
      setLoading(false);
    }

    void resolveClientPortals();
    return () => { active = false; };
  }, [shouldResolve, user?.id]);

  if (!shouldResolve) return <>{children}</>;
  if (loading || resolvedForUserId !== user?.id) {
    return <div className="loading-screen"><img src="/brand/ncr-suite-icon.png" alt="" /><span>Identification de ton espace…</span></div>;
  }

  if (destinations.length === 0) return <>{children}</>;
  if (destinations.length === 1) return <Navigate to={destinations[0].path} replace />;

  return (
    <main style={{ minHeight: '100dvh', background: '#f6f8fb', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <section style={{ width: 'min(620px, 100%)', background: '#fff', border: '1px solid #e4e8ef', borderRadius: 24, padding: '28px', boxShadow: '0 24px 70px rgba(15, 23, 42, .10)' }}>
        <img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" style={{ height: 42, width: 'auto', marginBottom: 28 }} />
        <p style={{ margin: 0, color: '#1677ff', fontSize: 13, fontWeight: 800, letterSpacing: '.08em' }}>TES ESPACES CLIENTS</p>
        <h1 style={{ margin: '8px 0 8px', fontSize: 'clamp(28px, 6vw, 40px)', lineHeight: 1.05, color: '#101828' }}>Où veux-tu aller ?</h1>
        <p style={{ margin: '0 0 22px', color: '#667085', lineHeight: 1.55 }}>Cette adresse possède plusieurs accès clients. Choisis simplement l’espace que tu souhaites ouvrir.</p>

        <div style={{ display: 'grid', gap: 12 }}>
          {destinations.map((destination) => (
            <Link
              key={destination.key}
              to={destination.path}
              style={{ display: 'grid', gap: 4, padding: '16px 18px', border: '1px solid #e4e8ef', borderRadius: 16, textDecoration: 'none', color: '#101828', background: '#fff' }}
            >
              <strong style={{ fontSize: 17 }}>{destination.label}</strong>
              <span style={{ color: '#667085', fontSize: 14 }}>{destination.description}</span>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #eef1f5', display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ color: '#98a2b3', fontSize: 13 }}>Accès client détecté automatiquement</span>
          <Link to="/configuration?nouvelle-entreprise=1" style={{ color: '#475467', fontSize: 13, fontWeight: 700 }}>Configurer une entreprise</Link>
        </div>
      </section>
    </main>
  );
}
