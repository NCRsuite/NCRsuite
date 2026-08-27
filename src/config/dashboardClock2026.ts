import { NCR_UI_2026_ENABLED } from './ui2026';

/*
 * NCR Dashboard Clock 2026 — widget desktop indépendant.
 * Mettre à false pour retirer uniquement l'horloge/date du hero dashboard.
 */
const NCR_DASHBOARD_CLOCK_2026_FEATURE_ENABLED = true;

export const NCR_DASHBOARD_CLOCK_2026_ENABLED = NCR_UI_2026_ENABLED && NCR_DASHBOARD_CLOCK_2026_FEATURE_ENABLED;
