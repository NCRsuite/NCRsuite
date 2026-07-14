import type { Plan } from '../types';

export type PlanFeature =
  | 'public_booking'
  | 'confirmation_emails'
  | 'automatic_reminders'
  | 'online_booking_management'
  | 'calendar_links'
  | 'team_access'
  | 'manager_role'
  | 'commercial_branding'
  | 'white_label';

export interface PlanDefinition {
  label: string;
  monthlyPriceCents: number;
  memberLimit: number;
  features: PlanFeature[];
}

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
      'white_label'
    ]
  }
};

export function planHasFeature(plan: Plan, feature: PlanFeature) {
  return PLAN_DEFINITIONS[plan].features.includes(feature);
}

export function planLabel(plan: Plan) {
  return PLAN_DEFINITIONS[plan].label;
}
