import { NCR_UI_2026_ENABLED } from './ui2026';

/*
 * NCR Dashboard Smart 2026 — feature flag indépendant.
 * Mettre à false pour revenir au dashboard Motion + Interactive sans Smart Cockpit.
 * Le Smart Cockpit reste automatiquement désactivé si NCR UI 2026 est coupé globalement.
 */
const NCR_DASHBOARD_SMART_2026_FEATURE_ENABLED = true;

export const NCR_DASHBOARD_SMART_2026_ENABLED = NCR_UI_2026_ENABLED && NCR_DASHBOARD_SMART_2026_FEATURE_ENABLED;
