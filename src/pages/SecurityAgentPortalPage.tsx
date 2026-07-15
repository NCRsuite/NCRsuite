import { SecurityDashboardPage } from './SecurityDashboardPage';

/**
 * Entrée dédiée au terrain. Le tableau de bord Sécurité adapte automatiquement
 * son contenu au rôle Agent et ne charge que les données autorisées par la RLS.
 */
export function SecurityAgentPortalPage() {
  return <SecurityDashboardPage />;
}
