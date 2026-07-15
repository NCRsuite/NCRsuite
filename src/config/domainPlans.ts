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
      detail: 'Le socle Formation : gestion, documents, feuille vierge et attestations automatiques.'
    },
    essentielle: {
      label: 'Essentielle',
      monthlyPriceCents: 6990,
      memberLimit: 3,
      detail: 'Ajoute l’émargement numérique et la personnalisation des documents et e-mails.'
    },
    professionnelle: {
      label: 'Professionnelle',
      monthlyPriceCents: 9990,
      memberLimit: 10,
      detail: 'Ajoute les évaluations, le dossier complet, le multi-site et les accès employés avec rôles.'
    },
    metier: {
      label: 'Métier',
      monthlyPriceCents: 14990,
      memberLimit: 100,
      detail: 'Modules, rôles, limites et identité configurés sur mesure selon le contrat.'
    }
  }
};

export function getDomainPlans(businessType: BusinessType): Record<Plan, DomainPlanPresentation> {
  return DOMAIN_PLAN_PRESENTATIONS[businessType] ?? genericPlans;
}

export function getDomainPlan(businessType: BusinessType, plan: Plan): DomainPlanPresentation {
  return getDomainPlans(businessType)[plan];
}
