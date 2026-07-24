import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { OfferFeatureKey } from '../config/domainOfferCatalog';
import { OFFER_FEATURE_LABELS } from '../config/domainOfferCatalog';
import { organizationHasFeature } from '../config/planEntitlements';
import { useOrganization } from '../contexts/OrganizationContext';
import { Icon } from './Icon';

interface TrainingFeatureGateProps {
  feature: OfferFeatureKey;
  requiredPlan: 'Essentielle' | 'Professionnelle';
  description: string;
  children: ReactNode;
}

export function TrainingFeatureGate({ feature, requiredPlan, description, children }: TrainingFeatureGateProps) {
  const { organization } = useOrganization();
  if (!organization) return null;
  if (organizationHasFeature(organization, feature)) return <>{children}</>;

  const isMetierPlan = organization.plan === 'metier';
  const destination = isMetierPlan
    ? '/offre-metier'
    : `/abonnement?feature=${encodeURIComponent(feature)}#training-modules`;

  return (
    <div className="page training-locked-feature-page">
      <section className="panel training-locked-feature-card">
        <span className="training-locked-feature-icon"><Icon name="lock" size={34} /></span>
        <p className="eyebrow">{isMetierPlan ? 'CONFIGURATION MÉTIER' : `OFFRE ${requiredPlan.toUpperCase()}`}</p>
        <h1>{OFFER_FEATURE_LABELS[feature]}</h1>
        <p>{description}</p>
        <div className="training-locked-feature-badge">
          <Icon name="sparkles" size={17} />
          {isMetierPlan
            ? 'Module non inclus dans votre configuration'
            : `Disponible à la carte ou avec l’offre ${requiredPlan}`}
        </div>
        <Link className="primary-button" to={destination}>
          {isMetierPlan ? 'Voir ma configuration Métier' : 'Voir ce module dans mon abonnement'}
        </Link>
      </section>
    </div>
  );
}
