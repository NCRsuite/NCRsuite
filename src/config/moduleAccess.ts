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
  '/terrain': 'agent_portal',
  '/agents': 'agents',
  '/sites': 'sites',
  '/etablissements': 'sites',
  '/interventions': 'interventions',
  '/protocoles': 'cleaning_protocols',
  '/rentabilite': 'cleaning_profitability',
  '/rapports': 'reports',
  '/anomalies': 'anomalies',
  '/qualite': 'quality',
  '/prises-de-poste': 'shifts',
  '/main-courante': 'logbook',
  '/rondes': 'patrols',
  '/alertes': 'alerts',
  '/facturation': 'billing',
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
  '/recettes': 'restaurant_recipes',
  '/reservations': 'restaurant_reservations',
  '/commandes': 'restaurant_ordering',
  '/cuisine': 'restaurant_kitchen',
  '/salle': 'restaurant_floor_plan',
  '/menu-qr': 'restaurant_qr_menu',
  '/hygiene': 'restaurant_food_safety',
  '/stocks': 'stock',
  '/notifications': 'notifications'
};

const GENERIC_FEATURE_BY_PATH: Partial<Record<string, PlanFeature>> = {
  '/acces-equipe': 'team_access',
  '/etablissements': 'multi_site',
  '/evaluations': 'training_satisfaction',
  '/emargements': 'training_blank_attendance',
  '/attestations': 'training_automatic_certificates'
};

const SECURITY_FEATURE_BY_PATH: Partial<Record<string, PlanFeature>> = {
  '/terrain': 'security_agent_portal',
  '/rondes': 'security_qr_patrols',
  '/main-courante': 'security_smart_logbook',
  '/consignes': 'security_site_instructions',
  '/geolocalisation': 'security_geolocation',
  '/pti': 'security_pti_sos',
  '/supervision': 'security_realtime_supervision'
};

const RESTAURANT_FEATURE_BY_PATH: Partial<Record<string, PlanFeature>> = {
  '/terrain': 'restaurant_employee_portal',
  '/planning': 'restaurant_staff_planning',
  '/carte': 'restaurant_menu',
  '/recettes': 'restaurant_recipe_cards',
  '/reservations': 'restaurant_manual_reservations',
  '/commandes': 'restaurant_ordering',
  '/cuisine': 'restaurant_kitchen_display',
  '/salle': 'restaurant_floor_plan',
  '/menu-qr': 'restaurant_multilingual_qr_menu',
  '/hygiene': 'restaurant_temperatures',
  '/stocks': 'restaurant_basic_stock',
  '/acces-equipe': 'team_access',
  '/personnalisation': 'commercial_branding'
};

const CLEANING_FEATURE_BY_PATH: Partial<Record<string, PlanFeature>> = {
  '/terrain': 'cleaning_agent_portal',
  '/rapports': 'cleaning_visit_reports',
  '/anomalies': 'cleaning_anomalies',
  '/qualite': 'cleaning_quality_control',
  '/stocks': 'cleaning_stock',
  '/acces-equipe': 'team_access',
  '/protocoles': 'cleaning_protocols',
  '/rentabilite': 'cleaning_profitability'
};

const SECURITY_UPSELL_PATHS = new Set(['/acces-equipe', '/rondes', '/main-courante', '/consignes', '/geolocalisation', '/pti', '/supervision']);
const CLEANING_UPSELL_PATHS = new Set(['/terrain', '/rapports', '/anomalies', '/qualite', '/stocks', '/rentabilite', '/acces-equipe']);
const RESTAURANT_UPSELL_PATHS = new Set(['/terrain', '/acces-equipe', '/salle', '/menu-qr', '/hygiene', '/cuisine', '/personnalisation']);

const SECURITY_CHEF_PATHS = new Set(['/', '/terrain', '/planning', '/agents', '/sites', '/rondes', '/main-courante', '/consignes', '/geolocalisation', '/pti', '/supervision', '/dossiers-vacations', '/notifications']);
const CLEANING_CHEF_PATHS = new Set(['/', '/terrain', '/planning', '/agents', '/sites', '/interventions', '/protocoles', '/rapports', '/anomalies', '/qualite', '/stocks', '/notifications']);
const RESTAURANT_MANAGER_PATHS = new Set(['/', '/terrain', '/planning', '/equipe', '/carte', '/recettes', '/reservations', '/commandes', '/cuisine', '/salle', '/menu-qr', '/hygiene', '/stocks', '/notifications']);

export function normalizedModulePath(pathname: string) {
  return pathname === '/' ? '/' : `/${pathname.split('/').filter(Boolean)[0] ?? ''}`;
}

export function moduleKeyForPath(pathname: string, businessType?: Organization['business_type']) {
  if (pathname === '/') return 'dashboard';
  const normalized = normalizedModulePath(pathname);
  if (businessType === 'securite') {
    const securityModules: Record<string, string> = {
      '/terrain': 'security_agent_portal', '/clients': 'security_clients', '/sites': 'security_sites', '/agents': 'security_agents', '/planning': 'security_planning', '/devis': 'security_quotes', '/facturation': 'security_billing', '/rondes': 'security_qr_patrols', '/main-courante': 'security_smart_logbook', '/consignes': 'security_site_instructions', '/personnalisation': 'security_document_branding', '/geolocalisation': 'security_geolocation', '/pti': 'security_pti_sos', '/supervision': 'security_realtime_supervision', '/dossiers-vacations': 'security_planning'
    };
    if (securityModules[normalized]) return securityModules[normalized];
  }
  if (businessType === 'restauration') {
    const restaurantModules: Record<string, string> = {
      '/terrain': 'restaurant_employee_portal', '/planning': 'restaurant_staff_planning', '/equipe': 'restaurant_staff', '/acces-equipe': 'team_access', '/carte': 'restaurant_menu', '/recettes': 'restaurant_recipes', '/reservations': 'restaurant_reservations', '/commandes': 'restaurant_ordering', '/cuisine': 'restaurant_kitchen', '/salle': 'restaurant_floor_plan', '/menu-qr': 'restaurant_qr_menu', '/hygiene': 'restaurant_food_safety', '/stocks': 'restaurant_stock', '/personnalisation': 'commercial_branding'
    };
    if (restaurantModules[normalized]) return restaurantModules[normalized];
  }
  if (businessType === 'nettoyage') {
    const cleaningModules: Record<string, string> = {
      '/terrain': 'cleaning_agent_portal', '/clients': 'cleaning_clients', '/sites': 'cleaning_sites', '/agents': 'cleaning_agents', '/planning': 'cleaning_planning', '/interventions': 'cleaning_interventions', '/protocoles': 'cleaning_protocols', '/rentabilite': 'cleaning_profitability', '/rapports': 'cleaning_reports', '/anomalies': 'cleaning_anomalies', '/qualite': 'cleaning_quality', '/stocks': 'cleaning_stock', '/facturation': 'cleaning_billing', '/acces-equipe': 'team_access'
    };
    if (cleaningModules[normalized]) return cleaningModules[normalized];
  }
  return MODULE_BY_PATH[normalized];
}

export function featureKeyForPath(pathname: string, businessType?: Organization['business_type']) {
  const normalized = normalizedModulePath(pathname);
  if (businessType === 'securite') return SECURITY_FEATURE_BY_PATH[normalized] ?? GENERIC_FEATURE_BY_PATH[normalized];
  if (businessType === 'nettoyage') return CLEANING_FEATURE_BY_PATH[normalized] ?? GENERIC_FEATURE_BY_PATH[normalized];
  if (businessType === 'restauration') return RESTAURANT_FEATURE_BY_PATH[normalized] ?? GENERIC_FEATURE_BY_PATH[normalized];
  return GENERIC_FEATURE_BY_PATH[normalized];
}

export function securityRequiredPlanForPath(pathname: string): 'Essentielle' | 'Professionnelle' | null {
  const normalized = normalizedModulePath(pathname);
  if (['/geolocalisation', '/pti', '/supervision'].includes(normalized)) return 'Professionnelle';
  if (['/acces-equipe', '/rondes', '/main-courante', '/consignes'].includes(normalized)) return 'Essentielle';
  return null;
}

export function cleaningRequiredPlanForPath(pathname: string): 'Essentielle' | 'Professionnelle' | null {
  const normalized = normalizedModulePath(pathname);
  if (['/anomalies', '/qualite', '/stocks', '/rentabilite'].includes(normalized)) return 'Professionnelle';
  if (['/terrain', '/rapports', '/acces-equipe'].includes(normalized)) return 'Essentielle';
  return null;
}

export function restaurantRequiredPlanForPath(pathname: string): 'Essentielle' | 'Professionnelle' | null {
  const normalized = normalizedModulePath(pathname);
  if (['/terrain', '/acces-equipe', '/salle', '/menu-qr', '/hygiene', '/cuisine', '/personnalisation'].includes(normalized)) return 'Essentielle';
  return null;
}

export function securityPathIsLocked(organization: Organization, pathname: string) {
  if (organization.business_type !== 'securite') return false;
  const feature = featureKeyForPath(pathname, 'securite');
  return Boolean(feature && !organizationHasFeature(organization, feature));
}

export function restaurantPathIsLocked(organization: Organization, pathname: string) {
  if (organization.business_type !== 'restauration') return false;
  const feature = featureKeyForPath(pathname, 'restauration');
  return Boolean(feature && !organizationHasFeature(organization, feature));
}

export function cleaningPathIsLocked(organization: Organization, pathname: string) {
  if (organization.business_type !== 'nettoyage') return false;
  const feature = featureKeyForPath(pathname, 'nettoyage');
  return Boolean(feature && !organizationHasFeature(organization, feature));
}

export function organizationCanAccessPath(organization: Organization, pathname: string) {
  const normalized = normalizedModulePath(pathname);

  if (organization.business_type === 'securite') {
    if (organization.role === 'employee' && !['/', '/terrain', '/planning', '/rondes', '/main-courante', '/consignes', '/pti', '/notifications'].includes(normalized)) return false;
    if (organization.role === 'manager' && !SECURITY_CHEF_PATHS.has(normalized)) return false;
  }

  if (organization.business_type === 'restauration') {
    if (organization.role === 'employee' && !['/', '/terrain', '/planning', '/carte', '/recettes', '/reservations', '/commandes', '/cuisine', '/salle', '/hygiene', '/notifications'].includes(normalized)) return false;
    if (organization.role === 'manager' && !RESTAURANT_MANAGER_PATHS.has(normalized)) return false;
  }

  if (organization.business_type === 'nettoyage') {
    if (organization.role === 'employee' && !['/', '/terrain', '/planning', '/interventions', '/rapports', '/anomalies', '/notifications'].includes(normalized)) return false;
    if (organization.role === 'manager' && !CLEANING_CHEF_PATHS.has(normalized)) return false;
  }

  if (normalized === '/notifications') return true;
  if (pathname === '/offre-metier') return organization.plan === 'metier' && ['owner', 'admin', 'manager'].includes(organization.role ?? 'viewer');

  const requiredFeature = normalized === '/personnalisation'
    ? (organization.business_type === 'securite' ? 'security_document_branding' : 'commercial_branding')
    : featureKeyForPath(pathname, organization.business_type);

  if (requiredFeature && !organizationHasFeature(organization, requiredFeature)) {
    if (organization.business_type === 'securite' && ['owner', 'admin'].includes(organization.role ?? 'viewer') && SECURITY_UPSELL_PATHS.has(normalized)) return true;
    if (organization.business_type === 'nettoyage' && ['owner', 'admin'].includes(organization.role ?? 'viewer') && CLEANING_UPSELL_PATHS.has(normalized)) return true;
    if (organization.business_type === 'restauration' && ['owner', 'admin'].includes(organization.role ?? 'viewer') && RESTAURANT_UPSELL_PATHS.has(normalized)) return true;
    return false;
  }

  const moduleKey = moduleKeyForPath(pathname, organization.business_type);
  if (!moduleKey) return true;
  if (organization.plan === 'metier' && organization.metier_modules_configured && !(organization.enabled_modules ?? []).includes(moduleKey)) return false;
  if (organization.plan === 'metier' && organization.custom_role_id && moduleKey !== 'dashboard' && !(organization.custom_module_keys ?? []).includes(moduleKey)) return false;
  return true;
}

export function filterNavigationForOrganization(organization: Organization, navigation: NavigationItem[]) {
  return navigation.filter((item) => organizationCanAccessPath(organization, item.path));
}
