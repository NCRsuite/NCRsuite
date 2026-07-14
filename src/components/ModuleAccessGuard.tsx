import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';

interface ModuleAccessGuardProps {
  moduleKey: string;
  children: ReactNode;
}

/**
 * Empêche l'ouverture directe d'une route masquée par la configuration Métier
 * ou par un rôle personnalisé. Les règles PostgreSQL restent la source de vérité
 * pour les actions autorisées selon le rôle système.
 */
export function ModuleAccessGuard({ moduleKey, children }: ModuleAccessGuardProps) {
  const { organization } = useOrganization();
  if (!organization) return null;

  if (organization.plan !== 'metier') return <>{children}</>;

  if (organization.metier_modules_configured && !(organization.enabled_modules ?? []).includes(moduleKey)) {
    return <Navigate to="/" replace />;
  }

  if (organization.custom_role_id && !(organization.custom_module_keys ?? []).includes(moduleKey)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
