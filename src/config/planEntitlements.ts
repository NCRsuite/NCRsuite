import type { BusinessType, Organization, Plan } from '../types';

export type PlanFeature =
  | 'public_booking'
  | 'confirmation_emails'
  | 'automatic_reminders'
  | 'online_booking_management'
  | 'calendar_links'
  | 'team_access'
  | 'manager_role'
  | 'commercial_branding'
  | 'white_label'
  | 'multi_site'
  | 'custom_modules'
  | 'custom_roles'
  | 'custom_domain'
  | 'training_programs'
  | 'training_trainees'
  | 'training_trainers'
  | 'training_sessions'
  | 'training_documents'
  | 'training_blank_attendance'
  | 'training_digital_attendance'
  | 'training_attendance_pdf'
  | 'training_automatic_certificates'
  | 'training_document_branding'
  | 'training_email_branding'
  | 'training_satisfaction'
  | 'training_session_dossier';

export interface PlanDefinition {
  label: string;
  monthlyPriceCents: number;
  memberLimit: number;
  features: PlanFeature[];
}

const commonTrainingBase: PlanFeature[] = [
  'training_programs',
  'training_trainees',
  'training_trainers',
  'training_sessions',
  'training_documents',
  'training_blank_attendance',
  'training_automatic_certificates'
];

export const PLAN_DEFINITIONS: Record<Plan, PlanDefinition> = {
  decouverte: {
    label: 'Découverte',
    monthlyPriceCents: 990,
    memberLimit: 1,
    features: ['public_booking', 'confirmation_emails']
  },
  essentielle: {
    label: 'Essentielle',
    monthlyPriceCents: 1990,
    memberLimit: 3,
    features: [
      'public_booking',
      'confirmation_emails',
      'automatic_reminders',
      'online_booking_management',
      'calendar_links',
      'team_access'
    ]
  },
  professionnelle: {
    label: 'Professionnelle',
    monthlyPriceCents: 3990,
    memberLimit: 10,
    features: [
      'public_booking',
      'confirmation_emails',
      'automatic_reminders',
      'online_booking_management',
      'calendar_links',
      'team_access',
      'manager_role',
      'commercial_branding'
    ]
  },
  metier: {
    label: 'Métier',
    monthlyPriceCents: 6990,
    memberLimit: 100,
    features: [
      'public_booking',
      'confirmation_emails',
      'automatic_reminders',
      'online_booking_management',
      'calendar_links',
      'team_access',
      'manager_role',
      'commercial_branding',
      'white_label',
      'multi_site',
      'custom_modules',
      'custom_roles',
      'custom_domain'
    ]
  }
};

export const FORMATION_PLAN_DEFINITIONS: Record<Plan, PlanDefinition> = {
  decouverte: {
    label: 'Découverte',
    monthlyPriceCents: 3990,
    memberLimit: 1,
    features: [...commonTrainingBase]
  },
  essentielle: {
    label: 'Essentielle',
    monthlyPriceCents: 6990,
    memberLimit: 3,
    features: [
      ...commonTrainingBase,
      'training_digital_attendance',
      'training_attendance_pdf',
      'commercial_branding',
      'training_document_branding',
      'training_email_branding'
    ]
  },
  professionnelle: {
    label: 'Professionnelle',
    monthlyPriceCents: 9990,
    memberLimit: 10,
    features: [
      ...commonTrainingBase,
      'training_digital_attendance',
      'training_attendance_pdf',
      'commercial_branding',
      'training_document_branding',
      'training_email_branding',
      'training_satisfaction',
      'training_session_dossier',
      'multi_site',
      'team_access',
      'manager_role'
    ]
  },
  metier: {
    label: 'Métier',
    monthlyPriceCents: 14990,
    memberLimit: 100,
    features: [
      ...commonTrainingBase,
      'training_digital_attendance',
      'training_attendance_pdf',
      'commercial_branding',
      'training_document_branding',
      'training_email_branding',
      'training_satisfaction',
      'training_session_dossier',
      'multi_site',
      'team_access',
      'manager_role',
      'white_label',
      'custom_modules',
      'custom_roles',
      'custom_domain'
    ]
  }
};

export function getPlanDefinition(businessType: BusinessType, plan: Plan) {
  return businessType === 'formation' ? FORMATION_PLAN_DEFINITIONS[plan] : PLAN_DEFINITIONS[plan];
}

/** Compatibilité avec les écrans historiques Coiffure. */
export function planHasFeature(plan: Plan, feature: PlanFeature) {
  return PLAN_DEFINITIONS[plan].features.includes(feature);
}

export function businessPlanHasFeature(businessType: BusinessType, plan: Plan, feature: PlanFeature) {
  return getPlanDefinition(businessType, plan).features.includes(feature);
}

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
  multi_site: 'sites',
  team_access: 'team_access',
  manager_role: 'team_access'
};

export function organizationHasFeature(organization: Organization, feature: PlanFeature) {
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
