import type { NavigationItem, Organization } from '../types';
import { organizationHasFeature, type PlanFeature } from './planEntitlements';

export const MODULE_BY_PATH: Record<string, string> = {
  '/': 'dashboard',
  '/rendez-vous': 'appointments',
  '/clients': 'clients',
  '/equipe': 'staff',
  '/acces-equipe': 'team_access',
  '/prestations': 'services',
  '/fidelite': 'loyalty',
  '/personnalisation': 'commercial_branding',
  '/planning': 'planning',
  '/terrain': 'security_agent_portal',
  '/agents': 'agents',
  '/sites': 'sites',
  '/etablissements': 'sites',
  '/interventions': 'interventions',
  '/rapports': 'reports',
  '/anomalies': 'anomalies',
  '/prises-de-poste': 'shifts',
  '/main-courante': 'logbook',
  '/rondes': 'patrols',
  '/alertes': 'alerts',
  '/facturation': 'security_billing',
  '/consignes': 'security_site_instructions',
  '/documents': 'documents',
  '/formations': 'training_programs',
  '/stagiaires': 'trainees',
  '/formateurs': 'trainers',
  '/sessions': 'sessions',
  '/emargements': 'attendance',
  '/evaluations': 'evaluations',
  '/attestations': 'certificates',
  '/devis': 'quotes',
  '/carte': 'restaurant_menu',
  '/reservations': 'restaurant_reservations',
  '/salle': 'restaurant_floor_plan',
  '/menu-qr': 'restaurant_qr_menu',
  '/hygiene': 'restaurant_food_safety',
  '/stocks': 'restaurant_stock'
};

const FEATURE_BY_PATH: Partial<Record<string, PlanFeature>> = {
  '/acces-equipe': 'team_access',
  '/personnalisation': 'commercial_branding',
  '/etablissements': 'multi_site',
  '/evaluations': 'training_satisfaction',
  '/emargements': 'training_blank_attendance',
  '/attestations': 'training_automatic_certificates',
  '/terrain': 'security_agent_portal',
  '/rondes': 'security_qr_patrols',
  '/main-courante': 'security_smart_logbook',
  '/consignes': 'security_site_instructions'
};

export function moduleKeyForPath(pathname: string, businessType?: Organization['business_type']) {
  if (pathname === '/') return 'dashboard';
  const normalized = `/${pathname.split('/').filter(Boolean)[0] ?? ''}`;
  if (businessType === 'securite') {
    const securityModules: Record<string, string> = {
      '/terrain': 'security_agent_portal',
      '/clients': 'security_clients',
      '/sites': 'security_sites',
      '/agents': 'security_agents',
      '/planning': 'security_planning',
      '/facturation': 'security_billing',
      '/rondes': 'security_qr_patrols',
      '/main-courante': 'security_smart_logbook',
      '/consignes': 'security_site_instructions'
    };
    if (securityModules[normalized]) return securityModules[normalized];
  }
  return MODULE_BY_PATH[normalized];
}

export function featureKeyForPath(pathname: string) {
  const normalized = `/${pathname.split('/').filter(Boolean)[0] ?? ''}`;
  return FEATURE_BY_PATH[normalized];
}

export function organizationCanAccessPath(organization: Organization, pathname: string) {
  const normalized = pathname === '/' ? '/' : `/${pathname.split('/').filter(Boolean)[0] ?? ''}`;

  if (organization.business_type === 'securite' && organization.role === 'employee') {
    const agentPaths = ['/', '/terrain', '/planning', '/rondes', '/main-courante', '/consignes'];
    if (!agentPaths.includes(normalized)) return false;
  }

  if (pathname === '/offre-metier') {
    return organization.plan === 'metier' && ['owner', 'admin', 'manager'].includes(organization.role ?? 'viewer');
  }

  const requiredFeature = featureKeyForPath(pathname);
  if (requiredFeature && !organizationHasFeature(organization, requiredFeature)) return false;

  const moduleKey = moduleKeyForPath(pathname, organization.business_type);
  if (!moduleKey) return true;

  if (organization.plan === 'metier' && organization.metier_modules_configured) {
    if (!(organization.enabled_modules ?? []).includes(moduleKey)) return false;
  }

  if (organization.plan === 'metier' && organization.custom_role_id) {
    if (moduleKey !== 'dashboard' && !(organization.custom_module_keys ?? []).includes(moduleKey)) return false;
  }

  return true;
}

export function filterNavigationForOrganization(organization: Organization, navigation: NavigationItem[]) {
  return navigation.filter((item) => organizationCanAccessPath(organization, item.path));
}
