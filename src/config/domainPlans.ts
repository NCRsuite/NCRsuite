import type { BusinessType, Plan } from '../types';

export interface DomainPlanPresentation {
  label: string;
  monthlyPriceCents: number;
  memberLimit: number;
  detail: string;
}

const genericPlans: Record<Plan, DomainPlanPresentation> = {
  decouverte: {
    label: 'Découverte',
    monthlyPriceCents: 990,
    memberLimit: 1,
    detail: '1 accès et fonctions essentielles.'
  },
  essentielle: {
    label: 'Essentielle',
    monthlyPriceCents: 1990,
    memberLimit: 3,
    detail: 'Jusqu’à 3 accès et fonctions collaboratives.'
  },
  professionnelle: {
    label: 'Professionnelle',
    monthlyPriceCents: 3990,
    memberLimit: 10,
    detail: 'Jusqu’à 10 accès, personnalisation et permissions avancées.'
  },
  metier: {
    label: 'Métier',
    monthlyPriceCents: 6990,
    memberLimit: 100,
    detail: 'Tarif, limites et modules configurés sur mesure.'
  }
};

export const DOMAIN_PLAN_PRESENTATIONS: Partial<Record<BusinessType, Record<Plan, DomainPlanPresentation>>> = {
  coiffure: genericPlans,
  formation: {
    decouverte: {
      label: 'Découverte',
      monthlyPriceCents: 3990,
      memberLimit: 1,
      detail: 'Pour un formateur indépendant : formations, stagiaires et sessions.'
    },
    essentielle: {
      label: 'Essentielle',
      monthlyPriceCents: 6990,
      memberLimit: 3,
      detail: 'Pour une petite équipe : jusqu’à 3 accès et gestion collaborative.'
    },
    professionnelle: {
      label: 'Professionnelle',
      monthlyPriceCents: 9990,
      memberLimit: 10,
      detail: 'Pour un organisme structuré : 10 accès, responsable et personnalisation.'
    },
    metier: {
      label: 'Métier',
      monthlyPriceCents: 14990,
      memberLimit: 100,
      detail: 'Pour les organismes multi-sites et les besoins contractuels sur mesure.'
    }
  }
};

export function getDomainPlans(businessType: BusinessType): Record<Plan, DomainPlanPresentation> {
  return DOMAIN_PLAN_PRESENTATIONS[businessType] ?? genericPlans;
}

export function getDomainPlan(businessType: BusinessType, plan: Plan): DomainPlanPresentation {
  return getDomainPlans(businessType)[plan];
}
