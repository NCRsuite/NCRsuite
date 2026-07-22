import type { BusinessType, MemberRole, Organization } from '../types';
import { organizationHasFeature } from './planEntitlements';

export type AccessDenialReason = 'business' | 'role' | null;

export function normalizeRoutePath(pathname: string) {
  if (pathname === '/') return '/';
  return `/${pathname.split('?')[0].split('#')[0].split('/').filter(Boolean)[0] ?? ''}`;
}

const COMMON_ORGANIZATION_PATHS = [
  '/',
  '/notifications',
  '/assistance',
  '/abonnement',
  '/parametres',
  '/demarrage',
  '/offre-metier'
] as const;

const common = () => new Set<string>(COMMON_ORGANIZATION_PATHS);

export const BUSINESS_ROUTE_PATHS: Record<BusinessType, Set<string>> = {
  coiffure: new Set([
    ...common(),
    '/rendez-vous', '/clients', '/equipe', '/acces-equipe', '/prestations', '/fidelite', '/personnalisation'
  ]),
  formation: new Set([
    ...common(),
    '/formations', '/stagiaires', '/formateurs', '/sessions', '/documents', '/emargements', '/evaluations', '/attestations', '/etablissements', '/acces-equipe', '/personnalisation'
  ]),
  securite: new Set([
    ...common(),
    '/terrain', '/planning', '/clients', '/portail-clients', '/agents', '/sites', '/devis', '/facturation', '/acces-equipe', '/rondes', '/main-courante', '/consignes', '/geolocalisation', '/pti', '/supervision', '/dossiers-vacations', '/personnalisation'
  ]),
  nettoyage: new Set([
    ...common(),
    '/terrain', '/planning', '/clients', '/sites', '/agents', '/interventions', '/protocoles', '/rapports', '/anomalies', '/qualite', '/stocks', '/rentabilite', '/facturation', '/acces-equipe'
  ]),
  restauration: new Set([
    ...common(),
    '/terrain', '/planning', '/equipe', '/acces-equipe', '/carte', '/recettes', '/reservations', '/commandes', '/cuisine', '/salle', '/menu-qr', '/hygiene', '/stocks', '/personnalisation'
  ])
};

const OWNER_ADMIN_ONLY_PATHS = new Set(['/abonnement', '/acces-equipe', '/personnalisation', '/offre-metier']);
const ALL_ROLE_PATHS = new Set(['/', '/notifications', '/assistance']);
const MANAGER_COMMON_PATHS = new Set(['/', '/notifications', '/assistance', '/parametres', '/demarrage']);

const EMPLOYEE_PATHS: Record<BusinessType, Set<string>> = {
  coiffure: new Set(['/', '/rendez-vous', '/notifications', '/assistance']),
  formation: new Set(['/', '/formations', '/stagiaires', '/formateurs', '/sessions', '/documents', '/emargements', '/evaluations', '/attestations', '/notifications', '/assistance']),
  securite: new Set(['/', '/terrain', '/planning', '/rondes', '/main-courante', '/consignes', '/pti', '/notifications', '/assistance']),
  nettoyage: new Set(['/', '/terrain', '/planning', '/interventions', '/rapports', '/anomalies', '/notifications', '/assistance']),
  restauration: new Set(['/', '/terrain', '/planning', '/carte', '/recettes', '/reservations', '/commandes', '/cuisine', '/salle', '/hygiene', '/notifications', '/assistance'])
};

const MANAGER_PATHS: Partial<Record<BusinessType, Set<string>>> = {
  securite: new Set(['/', '/terrain', '/planning', '/portail-clients', '/agents', '/sites', '/rondes', '/main-courante', '/consignes', '/geolocalisation', '/pti', '/supervision', '/dossiers-vacations', '/notifications', '/assistance', '/parametres', '/demarrage']),
  nettoyage: new Set(['/', '/terrain', '/planning', '/agents', '/sites', '/interventions', '/protocoles', '/rapports', '/anomalies', '/qualite', '/stocks', '/notifications', '/assistance', '/parametres', '/demarrage']),
  restauration: new Set(['/', '/terrain', '/planning', '/equipe', '/carte', '/recettes', '/reservations', '/commandes', '/cuisine', '/salle', '/menu-qr', '/hygiene', '/stocks', '/notifications', '/assistance', '/parametres', '/demarrage'])
};

export function businessAllowsRoute(businessType: BusinessType, pathname: string) {
  return BUSINESS_ROUTE_PATHS[businessType].has(normalizeRoutePath(pathname));
}

export function roleAllowsRoute(organization: Organization, pathname: string) {
  const path = normalizeRoutePath(pathname);
  const role: MemberRole = organization.role ?? 'viewer';

  if (ALL_ROLE_PATHS.has(path)) return true;
  if (role === 'owner' || role === 'admin') return true;
  if (OWNER_ADMIN_ONLY_PATHS.has(path)) return false;

  if (role === 'manager') {
    const restrictedManagerPaths = MANAGER_PATHS[organization.business_type];
    if (restrictedManagerPaths) return restrictedManagerPaths.has(path);
    return BUSINESS_ROUTE_PATHS[organization.business_type].has(path) || MANAGER_COMMON_PATHS.has(path);
  }

  if (organization.business_type === 'formation' && !organizationHasFeature(organization, 'team_access')) {
    return ALL_ROLE_PATHS.has(path);
  }

  return EMPLOYEE_PATHS[organization.business_type].has(path);
}

export function routeAccessDenial(organization: Organization, pathname: string): AccessDenialReason {
  if (!businessAllowsRoute(organization.business_type, pathname)) return 'business';
  if (!roleAllowsRoute(organization, pathname)) return 'role';
  return null;
}
