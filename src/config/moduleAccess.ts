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
  '/geolocalisation': 'security_geolocation',
  '/pti': 'security_pti_sos',
  '/supervision': 'security_realtime_supervision',
  '/dossiers-vacations': 'security_planning',
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
  '/stocks': 'restaurant_stock',
  '/notifications': 'notifications'
};

const FEATURE_BY_PATH: Partial<Record<string, PlanFeature>> = {
  '/acces-equipe': 'team_access',
  '/etablissements': 'multi_site',
  '/evaluations': 'training_satisfaction',
  '/emargements': 'training_blank_attendance',
  '/attestations': 'training_automatic_certificates',
  '/terrain': 'security_agent_portal',
  '/rondes': 'security_qr_patrols',
  '/main-courante': 'security_smart_logbook',
  '/consignes': 'security_site_instructions',
  '/geolocalisation': 'security_geolocation',
  '/pti': 'security_pti_sos',
  '/supervision': 'security_realtime_supervision'
};

const SECURITY_UPSELL_PATHS = new Set([
  '/acces-equipe', '/rondes', '/main-courante', '/consignes',
  '/geolocalisation', '/pti', '/supervision'
]);

const SECURITY_CHEF_PATHS = new Set([
  '/', '/terrain', '/planning', '/agents', '/sites', '/rondes', '/main-courante',
  '/consignes', '/geolocalisation', '/pti', '/supervision', '/dossiers-vacations', '/notifications'
]);

export function normalizedModulePath(pathname: string) {
  return pathname === '/' ? '/' : `/${pathname.split('/').filter(Boolean)[0] ?? ''}`;
}

export function moduleKeyForPath(pathname: string, businessType?: Organization['business_type']) {
  if (pathname === '/') return 'dashboard';
  const normalized = normalizedModulePath(pathname);
  if (businessType === 'securite') {
    const securityModules: Record<string, string> = {
      '/terrain': 'security_agent_portal',
      '/clients': 'security_clients',
      '/sites': 'security_sites',
      '/agents': 'security_agents',
      '/planning': 'security_planning',
      '/devis': 'security_quotes',
      '/facturation': 'security_billing',
      '/rondes': 'security_qr_patrols',
      '/main-courante': 'security_smart_logbook',
      '/consignes': 'security_site_instructions',
      '/personnalisation': 'security_document_branding',
      '/geolocalisation': 'security_geolocation',
      '/pti': 'security_pti_sos',
      '/supervision': 'security_realtime_supervision',
      '/dossiers-vacations': 'security_planning'
    };
    if (securityModules[normalized]) return securityModules[normalized];
  }
  return MODULE_BY_PATH[normalized];
}

export function featureKeyForPath(pathname: string) {
  return FEATURE_BY_PATH[normalizedModulePath(pathname)];
}

export function securityRequiredPlanForPath(pathname: string): 'Essentielle' | 'Professionnelle' | null {
  const normalized = normalizedModulePath(pathname);
  if (['/geolocalisation', '/pti', '/supervision'].includes(normalized)) return 'Professionnelle';
  if (['/acces-equipe', '/rondes', '/main-courante', '/consignes'].includes(normalized)) return 'Essentielle';
  return null;
}

export function securityPathIsLocked(organization: Organization, pathname: string) {
  if (organization.business_type !== 'securite') return false;
  const feature = featureKeyForPath(pathname);
  return Boolean(feature && !organizationHasFeature(organization, feature));
}

export function organizationCanAccessPath(organization: Organization, pathname: string) {
  const normalized = normalizedModulePath(pathname);

  if (organization.business_type === 'securite') {
    if (organization.role === 'employee') {
      const agentPaths = ['/', '/terrain', '/planning', '/rondes', '/main-courante', '/consignes', '/pti', '/notifications'];
      if (!agentPaths.includes(normalized)) return false;
    }
    if (organization.role === 'manager' && !SECURITY_CHEF_PATHS.has(normalized)) return false;
  }

  if (normalized === '/notifications') return true;

  if (pathname === '/offre-metier') {
    return organization.plan === 'metier' && ['owner', 'admin', 'manager'].includes(organization.role ?? 'viewer');
  }

  const requiredFeature = normalized === '/personnalisation'
    ? (organization.business_type === 'securite' ? 'security_document_branding' : 'commercial_branding')
    : featureKeyForPath(pathname);

  if (requiredFeature && !organizationHasFeature(organization, requiredFeature)) {
    // Les propriétaires et administrateurs Sécurité peuvent ouvrir une page premium
    // verrouillée pour découvrir la fonction et changer de formule.
    if (organization.business_type === 'securite'
      && ['owner', 'admin'].includes(organization.role ?? 'viewer')
      && SECURITY_UPSELL_PATHS.has(normalized)) return true;
    return false;
  }

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
