import type { BusinessType } from '../types';

export interface BusinessUiTheme {
  accent: string;
  accentRgb: string;
  strong: string;
  label: string;
}

/**
 * Couleurs d'interface NCR Suite.
 * Elles sont déterminées par le métier et ne dépendent jamais de la couleur
 * commerciale personnalisable de l'entreprise (organizations.primary_color).
 */
export const BUSINESS_UI_THEMES: Record<BusinessType, BusinessUiTheme> = {
  formation: {
    accent: '#3370EC',
    accentRgb: '51, 112, 236',
    strong: '#2458C6',
    label: 'Bleu Formation'
  },
  nettoyage: {
    accent: '#44946E',
    accentRgb: '68, 148, 110',
    strong: '#2F7654',
    label: 'Vert Nettoyage'
  },
  securite: {
    // Rouge foncé franc demandé pour la sécurité, distinct du rouge danger.
    accent: '#9B1C1C',
    accentRgb: '155, 28, 28',
    strong: '#7F1414',
    label: 'Rouge foncé Sécurité'
  },
  coiffure: {
    accent: '#5C194B',
    accentRgb: '92, 25, 75',
    strong: '#451238',
    label: 'Violet Coiffure & beauté'
  },
  restauration: {
    // Ocre d'interface dérivé du jaune de marque afin de conserver le contraste.
    accent: '#B78324',
    accentRgb: '183, 131, 36',
    strong: '#91661A',
    label: 'Ocre Restauration'
  }
};

export function businessUiTheme(businessType: BusinessType): BusinessUiTheme {
  return BUSINESS_UI_THEMES[businessType];
}

export function businessUiAccent(businessType: BusinessType): string {
  return BUSINESS_UI_THEMES[businessType].accent;
}
