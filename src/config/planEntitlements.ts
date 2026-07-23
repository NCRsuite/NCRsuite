import type { BusinessType, Organization, Plan } from '../types';
import { DOMAIN_OFFER_CATALOG, type OfferFeatureKey } from './domainOfferCatalog';

export type PlanFeature = OfferFeatureKey;

export interface PlanDefinition {
  label: string;
  monthlyPriceCents: number;
  memberLimit: number;
  features: PlanFeature[];
}

function definitionsFor(businessType: BusinessType): Record<Plan, PlanDefinition> {
  const plans = DOMAIN_OFFER_CATALOG[businessType].plans;
  return Object.fromEntries(Object.entries(plans).map(([plan, definition]) => [plan, {
    label: definition.label,
    monthlyPriceCents: definition.monthlyPriceCents,
    memberLimit: definition.memberLimit,
    features: definition.features
  }])) as Record<Plan, PlanDefinition>;
}

export const DOMAIN_PLAN_DEFINITIONS: Record<BusinessType, Record<Plan, PlanDefinition>> = {
  coiffure: definitionsFor('coiffure'),
  formation: definitionsFor('formation'),
  securite: definitionsFor('securite'),
  nettoyage: definitionsFor('nettoyage'),
  restauration: definitionsFor('restauration')
};

/** Compatibilité avec les écrans historiques Coiffure. */
export const PLAN_DEFINITIONS = DOMAIN_PLAN_DEFINITIONS.coiffure;
export const FORMATION_PLAN_DEFINITIONS = DOMAIN_PLAN_DEFINITIONS.formation;

export function getPlanDefinition(businessType: BusinessType, plan: Plan) {
  return DOMAIN_PLAN_DEFINITIONS[businessType][plan];
}

/** Compatibilité avec les écrans historiques Coiffure. */
export function planHasFeature(plan: Plan, feature: PlanFeature) {
  return PLAN_DEFINITIONS[plan].features.includes(feature);
}

export function businessPlanHasFeature(businessType: BusinessType, plan: Plan, feature: PlanFeature) {
  return getPlanDefinition(businessType, plan).features.includes(feature);
}


const SECURITY_ADDON_FEATURE_MODULES: Partial<Record<PlanFeature, string>> = {
  team_access: 'team_access',
  manager_role: 'security_agent_roles',
  security_agent_portal: 'security_agent_portal',
  security_qr_patrols: 'security_qr_patrols',
  security_smart_logbook: 'security_smart_logbook',
  security_site_instructions: 'security_site_instructions',
  security_logbook_pdf: 'security_logbook_pdf',
  security_geolocation: 'security_geolocation',
  security_pti_sos: 'security_pti_sos',
  security_realtime_supervision: 'security_realtime_supervision',
  security_agent_roles: 'security_agent_roles'
};

const FORMATION_FEATURE_MODULES: Partial<Record<PlanFeature, string>> = {
  training_programs: 'training_programs',
  training_trainees: 'trainees',
  training_trainers: 'trainers',
  training_sessions: 'sessions',
  training_documents: 'documents',
  training_blank_attendance: 'attendance',
  training_digital_attendance: 'attendance',
  training_attendance_pdf: 'attendance',
  training_automatic_certificates: 'certificates',
  commercial_branding: 'commercial_branding',
  training_document_branding: 'commercial_branding',
  training_email_branding: 'commercial_branding',
  training_satisfaction: 'evaluations',
  training_session_dossier: 'documents',
  training_commercial: 'training_commercial',
  multi_site: 'sites',
  team_access: 'team_access',
  manager_role: 'team_access'
};

export function organizationHasFeature(organization: Organization, feature: PlanFeature) {
  if (organization.business_type === 'securite') {
    const addonModule = SECURITY_ADDON_FEATURE_MODULES[feature];
    if (addonModule && (organization.enabled_modules ?? []).includes(addonModule)) return true;
  }

  if (!businessPlanHasFeature(organization.business_type, organization.plan, feature)) return false;

  if (organization.business_type === 'formation' && organization.plan === 'metier' && organization.metier_modules_configured) {
    const moduleKey = FORMATION_FEATURE_MODULES[feature];
    if (moduleKey && !(organization.enabled_modules ?? []).includes(moduleKey)) return false;
  }

  return true;
}

export function planLabel(plan: Plan) {
  return PLAN_DEFINITIONS[plan].label;
}
