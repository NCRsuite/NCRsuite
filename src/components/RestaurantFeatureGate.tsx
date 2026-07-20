import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { OfferFeatureKey } from '../config/domainOfferCatalog';
import { OFFER_FEATURE_LABELS } from '../config/domainOfferCatalog';
import { organizationHasFeature } from '../config/planEntitlements';
import { useOrganization } from '../contexts/OrganizationContext';
import { Icon } from './Icon';

interface RestaurantFeatureGateProps {
  feature: OfferFeatureKey;
  requiredPlan: 'Essentielle' | 'Professionnelle';
  description: string;
  children: ReactNode;
}

export function RestaurantFeatureGate({ feature, requiredPlan, description, children }: RestaurantFeatureGateProps) {
  const { organization } = useOrganization();
  if (!organization) return null;
  if (organizationHasFeature(organization, feature)) return <>{children}</>;
  return <div className="page restaurant-page restaurant-locked-feature-page"><section className="panel restaurant-locked-feature-card"><span className="restaurant-locked-feature-icon"><Icon name="lock" size={34}/></span><p className="eyebrow">OFFRE {requiredPlan.toUpperCase()}</p><h1>{OFFER_FEATURE_LABELS[feature]}</h1><p>{description}</p><div className="restaurant-locked-feature-badge"><Icon name="utensils" size={17}/> Disponible avec l’offre {requiredPlan}</div><Link className="primary-button" to="/abonnement">Découvrir l’offre {requiredPlan}</Link></section></div>;
}
