import type { BusinessType, Plan } from '../types';
import { DOMAIN_OFFER_CATALOG } from './domainOfferCatalog';

export interface DomainPlanPresentation {
  label: string;
  monthlyPriceCents: number;
  memberLimit: number;
  detail: string;
  additions: string[];
  startingAt?: boolean;
  recommended?: boolean;
}

export const DOMAIN_PLAN_PRESENTATIONS: Record<BusinessType, Record<Plan, DomainPlanPresentation>> = Object.fromEntries(
  Object.entries(DOMAIN_OFFER_CATALOG).map(([businessType, domain]) => [
    businessType,
    Object.fromEntries(Object.entries(domain.plans).map(([plan, definition]) => [plan, {
      label: definition.label,
      monthlyPriceCents: definition.monthlyPriceCents,
      memberLimit: definition.memberLimit,
      detail: definition.detail,
      additions: definition.additions,
      startingAt: definition.startingAt,
      recommended: definition.recommended
    }]))
  ])
) as Record<BusinessType, Record<Plan, DomainPlanPresentation>>;

export function getDomainPlans(businessType: BusinessType): Record<Plan, DomainPlanPresentation> {
  return DOMAIN_PLAN_PRESENTATIONS[businessType];
}

export function getDomainPlan(businessType: BusinessType, plan: Plan): DomainPlanPresentation {
  return getDomainPlans(businessType)[plan];
}
