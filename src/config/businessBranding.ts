import type { BusinessType } from '../types';

export interface BusinessBrandAssets {
  horizontalLogo: string;
  icon: string;
}

export const BUSINESS_BRAND_ASSETS: Record<BusinessType, BusinessBrandAssets> = {
  formation: {
    horizontalLogo: '/brand/business/ncr-suite-logo-formation.png',
    icon: '/brand/business/ncr-suite-icon-formation.svg'
  },
  nettoyage: {
    horizontalLogo: '/brand/business/ncr-suite-logo-nettoyage.png',
    icon: '/brand/business/ncr-suite-icon-nettoyage.svg'
  },
  securite: {
    horizontalLogo: '/brand/business/ncr-suite-logo-securite.png',
    icon: '/brand/business/ncr-suite-icon-securite.svg'
  },
  coiffure: {
    horizontalLogo: '/brand/business/ncr-suite-logo-coiffure.png',
    icon: '/brand/business/ncr-suite-icon-coiffure.svg'
  },
  restauration: {
    horizontalLogo: '/brand/business/ncr-suite-logo-restauration.png',
    icon: '/brand/business/ncr-suite-icon-restauration.svg'
  }
};
