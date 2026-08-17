import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requireText = (file, snippets) => {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`Fichier de stabilisation absent : ${file}`);
    return;
  }
  const source = read(file);
  for (const snippet of snippets) {
    if (!source.includes(snippet)) failures.push(`Contrôle de livraison absent dans ${file} : ${snippet}`);
  }
};

const pkg = JSON.parse(read('package.json'));
const expectedCache = `ncr-suite-shell-v${pkg.version}-training-test-sandbox`;
const publicMotionCache = 'ncr-suite-shell-v2.29.5-public-motion';
const publicFlowSignalCache = 'ncr-suite-shell-v2.29.4-public-flow-signal';
const publicUiAlignmentContrastCache = 'ncr-suite-shell-v2.29.3-public-ui-alignment-contrast';
const publicUiSpacingFixCache = 'ncr-suite-shell-v2.29.2-public-ui-spacing-fix';
const publicUiPremiumCache = 'ncr-suite-shell-v2.29.1-public-ui-premium';
const subscriptionContractCache = 'ncr-suite-shell-v2.29.0-subscription-contract-signature';
const unifiedExternalPortalsCache = 'ncr-suite-shell-v2.28.9-unified-external-portals-photo-reports';
const cleaningAgentCameraCache = 'ncr-suite-shell-v2.28.8-cleaning-agent-camera';
const googleSearchFaviconCache = 'ncr-suite-shell-v2.28.7-google-favicon';
const publicSolutionsMenuCache = 'ncr-suite-shell-v2.28.6-solutions-menu';
const universalNotificationAccessCache = 'ncr-suite-shell-v2.28.5-universal-notification-access';
const enterpriseNotificationShortcutCache = 'ncr-suite-shell-v2.28.4-enterprise-notification-shortcut';
const solutionLayoutFixCache = 'ncr-suite-shell-v2.28.3-solution-layout-fix';
const solutionArtDirectionCache = 'ncr-suite-shell-v2.28.2-solution-art-direction';
const premiumSolutionPagesCache = 'ncr-suite-shell-v2.28.1-premium-solution-pages';
const seoAcquisitionCache = 'ncr-suite-shell-v2.28.0-seo-acquisition';
const interactionsCache = 'ncr-suite-shell-v2.27.1-interactions';
const commercialReadinessCache = 'ncr-suite-shell-v2.27.0-commercial-readiness';
const platformAdminLockedPushCache = 'ncr-suite-shell-v2.24.1-platform-admin-locked-screen-push';
const portalAccessAlertsCache = 'ncr-suite-shell-v2.24.0-portal-access-support-alerts';
const showcasePolishCache = 'ncr-suite-shell-v2.23.2-showcase-polish';
const commercialLaunchCache = 'ncr-suite-shell-v2.22.0-commercial-launch';
const finalProductionValidationCache = 'ncr-suite-shell-v2.21.2-final-production-validation';
const trainingDataRecoveryCache = 'ncr-suite-shell-v2.21.1-training-data-recovery';
const trainingPortalsCache = 'ncr-suite-shell-v2.21.0-training-portals-signatures';
const lockedNavigationCache = 'ncr-suite-shell-v2.20.1-training-locked-navigation';
const finalStabilizationCache = 'ncr-suite-shell-v2.20.0-final-stabilization';
const runtime = read('src/config/runtime.ts');
const serviceWorker = read('public/sw.js');

if (pkg.version !== '2.29.25') failures.push('package.json doit annoncer la V2.29.25.');
if (!runtime.includes(`APP_VERSION = '${pkg.version}'`)) failures.push('La version runtime ne correspond pas au paquet.');
if (!runtime.includes(`PWA_CACHE_NAME = '${expectedCache}'`)) failures.push('Le cache runtime V2.29.25 est incohérent.');
if (!serviceWorker.includes(`const CACHE = '${expectedCache}'`)) failures.push('Le Service Worker V2.29.25 est incohérent.');
if (!serviceWorker.includes("key.startsWith(CACHE_PREFIX)")) failures.push('Le nettoyage PWA doit être limité aux caches NCR Suite.');
if (!serviceWorker.includes("if (isNavigation) return (await caches.match('/index.html'))")) failures.push('Le repli PWA de navigation a été retiré.');
for (const asset of [
  'public/brand/ncr-suite-logo-header-v2221.png',
  'public/brand/ncr-suite-symbol-v2221.png',
  'public/brand/ncr-suite-application-icon-v281.png',
  'public/og/ncr-suite-og-v2221.webp'
]) {
  if (!fs.existsSync(path.join(root, asset))) failures.push(`Asset V2.22.1 absent : ${asset}`);
}

requireText('supabase/migrations/080_final_stabilization_training_modules.sql', [
  'create table if not exists public.training_module_catalog',
  'create table if not exists public.organization_training_modules',
  'create table if not exists public.training_module_change_requests',
  'create or replace function public.training_module_portal',
  'create or replace function public.request_training_module_change',
  'create or replace function public.admin_review_training_module_request',
  'create or replace function public.reconcile_training_modules_after_plan_change',
  'create or replace function public.platform_release_readiness_report',
  "'2.20.0'",
  finalStabilizationCache,
  'set search_path = public'
]);

requireText('supabase/migrations/081_training_locked_module_navigation.sql', [
  "'2.20.1'",
  lockedNavigationCache,
  'platform_release_state'
]);

requireText('supabase/migrations/082_training_portals_signatures.sql', [
  'create table if not exists public.training_portal_accounts',
  'create table if not exists public.training_portal_invitations',
  'create table if not exists public.training_portal_documents',
  'create table if not exists public.training_signature_requests',
  'create table if not exists public.training_signature_events',
  'create or replace function public.complete_training_signature',
  'can_upload_training_portal_document_asset',
  'training_portals_signatures_addon',
  "'2.21.0'",
  trainingPortalsCache
]);

requireText('supabase/migrations/083_training_data_recovery.sql', [
  'create or replace function public.preview_training_recovery_import',
  'create or replace function public.import_training_recovery_records',
  "'training_customers'",
  "'training_funders'",
  "'training_opportunities'",
  "'training_sessions'",
  "'training_enrollments'",
  "set_config('ncr.allow_training_history_import','1',true)",
  'delete from public.notification_events',
  "'2.21.1'",
  trainingDataRecoveryCache,
  'set search_path = public'
]);

requireText('supabase/migrations/084_final_production_validation.sql', [
  'create table if not exists public.platform_production_validation_runs',
  'create or replace function public.platform_production_validation_report',
  'create or replace function public.platform_production_validation_history',
  'public.is_platform_super_admin()',
  "'manual_validation'",
  "'2.21.2'",
  finalProductionValidationCache,
  'set search_path = public'
]);

requireText('supabase/migrations/088_commercial_launch_controlled_access.sql', [
  'create table if not exists public.platform_access_requests',
  'create table if not exists public.platform_auth_email_events',
  'platform_access_requests_admin_read',
  "'access_requests'",
  "'2.22.0'",
  commercialLaunchCache,
  'set search_path = public'
]);

requireText('supabase/migrations/089_premium_showcase_offer_catalog.sql', [
  "'2.23.0'",
  'ncr-suite-shell-v2.23.0-premium-catalog',
  'platform_release_state'
]);
requireText('supabase/migrations/090_signature_showcase_release.sql', [
  "'2.23.1'",
  'ncr-suite-shell-v2.23.1-signature-showcase',
  'platform_release_state'
]);
requireText('supabase/migrations/091_showcase_polish_release.sql', [
  "'2.23.2'",
  showcasePolishCache,
  'platform_release_state'
]);
requireText('supabase/migrations/092_portal_access_support_alerts.sql', [
  'prepare_training_portal_manual_link',
  'create table if not exists public.platform_admin_notifications',
  'notify_platform_admin_support_ticket',
  'notify_platform_admin_access_request',
  'notify_platform_admin_subscription_request',
  'notify_platform_admin_security_module_request',
  'notify_platform_admin_training_module_request',
  "'2.24.0'",
  portalAccessAlertsCache,
  'platform_release_state'
]);
requireText('supabase/migrations/093_platform_admin_locked_screen_push.sql', [
  'alter column organization_id drop not null',
  "metadata->>'scope'='platform_admin'",
  'platform-admin-push:',
  'push_delivery_queue',
  'queue_platform_admin_push_test',
  "'2.24.1'",
  platformAdminLockedPushCache,
  'platform_release_state'
]);
requireText('supabase/migrations/094_stripe_subscription_billing.sql', [
  'create table if not exists public.stripe_price_catalog',
  'create table if not exists public.stripe_webhook_events',
  'stripe_customer_id',
  'stripe_subscription_id',
  'claim_stripe_webhook_event',
  'complete_stripe_webhook_event',
  'apply_stripe_billing_event',
  "'2.25.0'",
  'ncr-suite-shell-v2.25.0-stripe-billing',
  'platform_release_state'
]);
requireText('supabase/migrations/095_stripe_catalog_lifecycle_paid_activation.sql', [
  'create table if not exists public.stripe_addon_price_catalog',
  'create table if not exists public.subscription_data_retention_events',
  'organization_billing_access_allowed',
  'organization_billing_portal',
  'request_stripe_addon_change',
  'record_stripe_scheduled_plan_change',
  'apply_stripe_lifecycle_state',
  'audit_plan_change_data_retention',
  'create or replace function public.apply_organization_plan_defaults()',
  "if tg_op='INSERT' then",
  "check (data_retention_mode='preserve')",
  "'data_retained',true",
  "'2.26.0'",
  'ncr-suite-shell-v2.26.0-stripe-billing',
  'platform_release_state'
]);
requireText('supabase/migrations/096_premium_context_switchers.sql', [
  "'2.26.1'",
  'ncr-suite-shell-v2.26.1-premium-switchers',
  'platform_release_state'
]);
requireText('supabase/migrations/097_premium_cockpit_polish.sql', [
  "'2.26.2'",
  'ncr-suite-shell-v2.26.2-premium-cockpit',
  'platform_release_state'
]);
requireText('supabase/migrations/098_identity_logos_profile_avatar.sql', [
  "'2.26.3'",
  'ncr-suite-shell-v2.26.3-visual-identities',
  'add column if not exists avatar_url',
  "'profile-avatars'",
  'platform_release_state'
]);
requireText('supabase/migrations/099_profile_avatar_crop_release.sql', [
  "'2.26.4'",
  'ncr-suite-shell-v2.26.4-avatar-crop',
  'avatar_url',
  "'profile-avatars'",
  'platform_release_state'
]);
requireText('supabase/migrations/100_premium_workspace_polish.sql', [
  "'2.26.5'",
  'ncr-suite-shell-v2.26.5-premium-workspace',
  'platform_release_state'
]);
requireText('supabase/migrations/101_compact_navigation_subscription_consistency.sql', [
  "'2.26.6'",
  'ncr-suite-shell-v2.26.6-compact-navigation',
  'security_addon_catalog',
  'training_module_catalog',
  'platform_release_state'
]);
requireText('supabase/migrations/102_commercial_readiness_pilot_validation.sql', [
  "'2.27.0'",
  commercialReadinessCache,
  'platform_commercial_validation_runs',
  'platform_commercial_readiness_report',
  'store_platform_commercial_validation',
  'platform_commercial_validation_history',
  'data_retention_mode',
  'platform_release_state'
]);
requireText('supabase/migrations/103_v2_27_1_interactions_release.sql', [
  "'2.27.1'",
  interactionsCache,
  'platform_release_state'
]);
requireText('supabase/migrations/104_seo_acquisition_release.sql', [
  "'2.28.0'",
  seoAcquisitionCache,
  'acquisition_source',
  'acquisition_medium',
  'acquisition_campaign',
  'landing_path',
  'platform_release_state'
]);
requireText('supabase/migrations/105_premium_solution_pages_release.sql', [
  "'2.28.1'",
  premiumSolutionPagesCache,
  'platform_release_state'
]);
requireText('supabase/migrations/106_solution_art_direction_release.sql', [
  "'2.28.2'",
  solutionArtDirectionCache,
  'platform_release_state'
]);
requireText('supabase/migrations/107_solution_layout_fix_release.sql', [
  "'2.28.3'",
  solutionLayoutFixCache,
  'platform_release_state'
]);
requireText('supabase/migrations/108_enterprise_notification_shortcut.sql', [
  "'2.28.4'",
  enterpriseNotificationShortcutCache,
  'platform_release_state'
]);
requireText('supabase/migrations/109_universal_notification_access.sql', [
  "'2.28.5'",
  universalNotificationAccessCache,
  'platform_release_state'
]);
requireText('supabase/migrations/110_public_solutions_menu.sql', [
  "'2.28.6'",
  publicSolutionsMenuCache,
  'platform_release_state'
]);
requireText('supabase/migrations/111_google_search_favicon.sql', [
  "'2.28.7'",
  googleSearchFaviconCache,
  'platform_release_state'
]);
requireText('supabase/migrations/112_cleaning_agent_camera_photos.sql', [
  "'2.28.8'",
  cleaningAgentCameraCache,
  'can_access_cleaning_intervention_photo',
  'set_cleaning_intervention_photo',
  'cleaning_photos_insert',
  'platform_release_state'
]);
requireText('src/features/cleaning/photoUpload.ts', [
  'MAX_SOURCE_SIZE',
  'MAX_OUTPUT_SIZE',
  "canvas.toBlob",
  "type: 'image/jpeg'"
]);
requireText('src/pages/CleaningAgentPortalPage.tsx', [
  'prepareCleaningPhoto',
  "capture=\"environment\"",
  "supabase.rpc('set_cleaning_intervention_photo'",
  'Prendre la photo avant',
  'Prendre la photo après'
]);
requireText('src/pages/LoginPage.tsx', [
  'agent-nettoyage',
  'to="/espace-securite"',
  'to="/espace-nettoyage"',
  'Client · Agent'
]);
requireText('supabase/migrations/113_unified_external_portals_photo_reports.sql', [
  "'2.28.9'",
  unifiedExternalPortalsCache,
  'platform_release_state'
]);
requireText('supabase/migrations/114_subscription_contracts_signature.sql', [
  'create table if not exists public.subscription_contracts',
  'create table if not exists public.subscription_contract_events',
  "'subscription-contracts','subscription-contracts',false",
  'current_contract_id',
  "'2.29.0'",
  subscriptionContractCache,
  'platform_release_state'
]);
requireText('supabase/migrations/115_public_ui_premium_trial_cta.sql', [
  "'2.29.1'",
  publicUiPremiumCache,
  'platform_release_state'
]);
requireText('supabase/migrations/116_public_ui_spacing_fix.sql', [
  "'2.29.2'",
  publicUiSpacingFixCache,
  'platform_release_state'
]);
requireText('supabase/migrations/117_public_ui_alignment_contrast.sql', [
  "'2.29.3'",
  publicUiAlignmentContrastCache,
  'platform_release_state'
]);
requireText('supabase/migrations/118_public_flow_signal.sql', [
  "'2.29.4'",
  publicFlowSignalCache,
  'platform_release_state'
]);
requireText('supabase/migrations/119_public_motion_override.sql', [
  "'2.29.5'",
  publicMotionCache,
  'platform_release_state'
]);
requireText('supabase/migrations/120_public_flow_transmission.sql', [
  "'2.29.6'",
  'ncr-suite-shell-v2.29.6-public-flow-transmission',
  'platform_release_state'
]);

requireText('supabase/migrations/123_security_logbook_photos_quick_texts.sql', [
  "'2.29.8'",
  'ncr-suite-shell-v2.29.8-security-logbook-photos',
  'security_logbook_photos',
  'security-logbook-photos',
  'attach_security_logbook_photo',
  'platform_release_state'
]);
requireText('supabase/migrations/124_security_logbook_photo_display_fix.sql', [
  "'2.29.9'",
  'ncr-suite-shell-v2.29.9-security-logbook-photo-display',
  'can_read_security_logbook_photo_object',
  'platform_release_state'
]);
requireText('supabase/migrations/125_security_logbook_pdf_photos.sql', [
  "'2.29.10'",
  'ncr-suite-shell-v2.29.10-security-logbook-photo-display',
  'platform_release_state'
]);
requireText('supabase/migrations/126_security_vacation_hardening.sql', [
  "'2.29.11'",
  'ncr-suite-shell-v2.29.11-security-vacation-hardening',
  'enforce_single_active_security_shift',
  'security_patrols_agent_insert',
  'platform_release_state'
]);
requireText('supabase/migrations/127_security_premium_shift_presence.sql', [
  "'2.29.12'",
  'ncr-suite-shell-v2.29.12-security-premium-presence',
  'security_shift_proofs',
  'set_security_shift_presence_event_premium',
  'get_security_shift_handover',
  'platform_release_state'
]);
requireText('supabase/functions/subscription-contract/index.ts', [
  "action === 'prepare'",
  "action === 'request_code'",
  "action === 'sign'",
  'appendSignaturePage',
  'signature_payload_sha256',
  'BREVO_API_KEY'
]);
requireText('src/pages/OnboardingPage.tsx', [
  "invoke('subscription-contract'",
  'Signer et passer au paiement',
  'J’ai lu et j’accepte le contrat d’abonnement',
  'contractId'
]);
requireText('supabase/functions/create-stripe-checkout/index.ts', [
  'Le contrat d abonnement doit etre signe avant le paiement',
  'ncr_contract_id',
  "from('subscription_contracts')"
]);
requireText('supabase/functions/stripe-webhook/index.ts', [
  "from('subscription_contracts')",
  'current_contract_id',
  'ncr_contract_id'
]);
requireText('src/pages/SubscriptionPage.tsx', [
  "invoke('subscription-contract'",
  'Mes contrats NCR Suite',
  'Ouvrir'
]);
requireText('src/App.tsx', [
  'path="/espace-securite"',
  'to="/espace-securite"',
  'path="/espace-nettoyage"',
  'to="/espace-nettoyage"'
]);
requireText('src/pages/SecurityClientPortalPage.tsx', ['agentOrganization', "item.role === 'employee'", '<Navigate to="/terrain" replace />']);
requireText('src/pages/CleaningClientPortalPage.tsx', ['agentOrganization', "item.role === 'employee'", '<Navigate to="/terrain" replace />']);
requireText('src/features/cleaning/visitReportPdf.ts', ['embedRemotePhoto', 'drawPhotoCard', 'scaleToFit', 'PREUVES PHOTO']);
requireText('supabase/functions/create-stripe-checkout/index.ts', [
  "mode: 'subscription'",
  'stripe_price_catalog',
  'subscription_data',
  'success_url',
  'cancel_url',
  'subscriptionSchedules',
  "destination: 'scheduled'",
  'dataRetained: true'
]);
requireText('supabase/functions/manage-stripe-addon/index.ts', [
  'subscriptionItems.create',
  'subscriptionItems.del',
  'complete_stripe_addon_removal',
  'dataRetained: true'
]);
requireText('supabase/functions/create-stripe-portal/index.ts', [
  'billingPortal.sessions.create'
]);
requireText('supabase/functions/stripe-webhook/index.ts', [
  'constructEventAsync',
  'await request.text()',
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.updated',
  'customer.subscription.deleted'
]);

requireText('src/pages/PublicHomePage.tsx', [
  '<PublicSiteHeader />',
  'NCR Suite',
  'Essai gratuit de 7 jours',
  'public-business-grid',
  'public-business-showcase',
  'public-hero-canvas',
  'public-home-v2222',
  'public-home-v230',
  'public-home-v231',
  'public-home-v232',
  'public-home-v291',
  'public-home-v292',
  'public-home-v293',
  'public-home-v294',
  'public-home-v295',
  'public-home-v296',
  'public-flow-transmission',
  'public-flow-rail',
  'public-flow-top',
  'public-platform-card',
  'public-offer-business-tabs',
  'public-showcase-intro',
  'public-mobile-signals',
  '/brand/ncr-suite-symbol-v2221.png'
]);
requireText('src/pages/PublicSolutionPage.tsx', [
  'public-solution-v291',
  'public-solution-v292',
  'public-solution-v293',
  'public-solution-v295',
  'public-solution-v296',
  'essai=7',
  'Essai gratuit de 7 jours'
]);
requireText('src/pages/AccessRequestPage.tsx', [
  'trialRequested',
  'Demande d’essai gratuit de 7 jours',
  'public-form-page-v291',
  'public-form-page-v292',
  'public-form-page-v293',
  'public-form-page-v295'
]);

requireText('public/manifest.webmanifest', [
  '"start_url": "/connexion?source=pwa"',
  '"display": "standalone"'
]);

requireText('src/App.tsx', [
  'runsAsInstalledPwa',
  "return <Navigate to=\"/connexion\" replace />"
]);

requireText('src/components/AppErrorBoundary.tsx', [
  'MODULE_LOAD_ERROR',
  'MODULE_RECOVERY_KEY',
  'this.resetAndReload()'
]);

requireText('scripts/generate-public-showcase-css.mjs', [
  'ncr-suite-showcase-v2925.css',
  'ncr-suite-app-v2925.css',
  "source.indexOf('.public-home,')",
  'fs.writeFileSync'
]);

requireText('index.html', [
  '/favicon.ico',
  '/icons/favicon-96.png',
  '/icons/favicon-48.png',
  '/ncr-suite-showcase-v2925.css',
  '/ncr-suite-app-v2925.css',
  'ncr-style-guard',
  'ncr:css-recovery-v2.29.25',
  '--ncr-styles-ready'
]);

requireText('public/_headers', [
  'Content-Type: text/css; charset=utf-8',
  '/ncr-suite-showcase-v2925.css',
  '/ncr-suite-app-v2925.css',
  '/favicon.ico',
  'X-Robots-Tag: noindex, nofollow'
]);

if (!fs.existsSync(path.join(root, 'public/ncr-suite-showcase-v2925.css'))) {
  failures.push('La feuille de style critique V2.29.21 n’a pas été générée.');
}
if (!fs.existsSync(path.join(root, 'public/ncr-suite-app-v2925.css'))) {
  failures.push('La feuille de style complète V2.29.21 n’a pas été générée.');
}
for (const favicon of [
  'public/favicon.ico',
  'public/icons/favicon-48.png',
  'public/icons/favicon-96.png'
]) {
  if (!fs.existsSync(path.join(root, favicon))) failures.push(`Favicon Google absent : ${favicon}`);
}

requireText('vite.config.ts', [
  'codeSplitting: false',
  "entryFileNames: 'ncr-suite-app-v2925-r4.js'"
]);
if (read('src/main.tsx').includes("import './styles.css'")) {
  failures.push('Le style complet ne doit plus être généré dans /assets.');
}

requireText('src/components/PublicSiteHeader.tsx', [
  '/brand/ncr-suite-logo-horizontal.png',
  'Solutions métier',
  'public-solutions-trigger',
  'public-solutions-strip',
  'publicSeoPages.json',
  'aria-expanded={solutionsOpen}'
]);

requireText('src/styles.css', [
  'NCR Suite V2.28.6 - menu horizontal des solutions metier',
  'NCR Suite V2.29.1 - refonte UI publique premium en mode clair',
  'V2.29.2 - Corrections de cadrage de la vitrine publique',
  'V2.29.3 - Alignements, catalogue et contrastes de la vitrine publique',
  'V2.29.4 - Signal automatique du flux public',
  '@keyframes public-flow-ecg-v294',
  'V2.29.5 - animations publiques actives quel que soit le reglage systeme',
  'V2.29.6 - transmission progressive du flux public',
  '@keyframes public-flow-transmission-pulse-v296',
  '@keyframes public-flow-card-receive-v296',
  '@keyframes public-solution-interface-enter-v296',
  '@keyframes public-solution-interface-float-v296',
  'font-family: "NCR Public Inter"',
  '.public-solutions-panel',
  'grid-template-columns: repeat(5, minmax(0, 1fr))',
  '.public-solutions-strip > a:hover'
]);

requireText('src/components/PublicSiteFooter.tsx', [
  'public-footer-brand',
  'contact@ncr-suite.fr',
  'publicSeoPages.json'
]);

requireText('scripts/generate-seo-pages.mjs', [
  'src',
  'publicSeoPages.json',
  'BreadcrumbList',
  'SoftwareApplication',
  'FAQPage',
  'sitemap.xml',
  'ncr-seo-prerender'
]);

requireText('src/pages/PublicSolutionPage.tsx', [
  'structuredData',
  'public-solution-v283',
  'data-solution-reveal',
  'IntersectionObserver',
  'public-solution-feature-preview',
  'public-solution-interface-workspace',
  '/brand/ncr-suite-application-icon-v281.png',
  'logiciel de gestion métier',
  '/demande-acces?metier='
]);

requireText('src/styles.css', [
  'NCR Suite V2.28.3 - lisibilite des cartes et rythme vertical desktop',
  '@media (min-width: 1001px)',
  'article.public-solution-feature-card',
  '"feature-header"',
  '"outcome-label outcome-title"'
]);

requireText('src/components/AppShell.tsx', [
  'app-shell-v284',
  'enterprise-notification-shortcut desktop',
  'enterprise-notification-shortcut mobile',
  'to="/notifications"',
  'notificationUnread > 99'
]);

requireText('src/styles.css', [
  'NCR Suite V2.28.4 - raccourci permanent des notifications entreprise',
  '.app-shell-v284 .enterprise-notification-shortcut',
  'grid-template-columns: 42px minmax(0, 1fr) 38px 42px'
]);

requireText('src/config/moduleAccess.ts', [
  "const UNIVERSAL_MODULE_PATHS = new Set(['/notifications'])",
  'const isUniversalModule = UNIVERSAL_MODULE_PATHS.has(normalized)',
  '!isUniversalModule && !isCoiffureLoyaltyBase',
  '!isUniversalModule && organization.plan'
]);

requireText('src/features/acquisition.ts', [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'landingPath',
  'document.referrer'
]);

requireText('public/sitemap.xml', [
  '/logiciel-gestion-formation',
  '/logiciel-securite-privee',
  '/logiciel-entreprise-nettoyage',
  '/logiciel-gestion-restaurant',
  '/logiciel-coiffure'
]);

requireText('functions/_middleware.ts', [
  'normalizedPath',
  'indexablePaths',
  '/logiciel-gestion-formation',
  '/logiciel-securite-privee',
  '/logiciel-entreprise-nettoyage',
  '/logiciel-gestion-restaurant',
  '/logiciel-coiffure',
  'NCR_CANONICAL_REDIRECT_ENABLED',
  "headers.set('X-Robots-Tag', 'noindex, nofollow')"
]);

requireText('index.html', [
  '/og/ncr-suite-og-v2221.webp',
  '/brand/ncr-suite-logo-horizontal.png',
  '/fonts/inter-variable.woff2'
]);

requireText('src/pages/AccessRequestPage.tsx', [
  "functions.invoke('request-platform-access'",
  'VITE_TURNSTILE_SITE_KEY'
]);

requireText('src/components/AdminAccessRequestsPanel.tsx', [
  "from('platform_access_requests')",
  "functions.invoke('admin-review-access-request'",
  'Accepter et inviter'
]);

requireText('src/pages/LoginPage.tsx', [
  'auth-portal-chooser',
  'to="/espace-formation"',
  'to="/espace-securite"',
  'to="/espace-nettoyage"',
  'to="/espace-client-coiffure"'
]);
requireText('src/components/AppShell.tsx', [
  'desktop-context-switchers',
  'context-switcher organization-switcher',
  'context-switcher site-switcher',
  "desktopContextMenu === 'organization'",
  "desktopContextMenu === 'site'",
  "document.addEventListener('pointerdown'"
]);
requireText('src/styles.css', [
  '.context-switcher-trigger',
  '.context-switcher-menu',
  '.context-switcher-options > button.active',
  '.desktop-context-switchers, .organization-switcher'
]);
requireText('src/pages/TrainingPortalAdminPage.tsx', [
  "supabase.rpc('prepare_training_portal_manual_link'",
  'Lien prêt à transmettre',
  'shareManualInvitationLink'
]);
requireText('src/components/AdminNotificationCenter.tsx', [
  "from('platform_admin_notifications')",
  "supabase.rpc('mark_platform_admin_notifications_read'",
  "supabase!.rpc('queue_platform_admin_push_test'",
  'currentPushSubscription',
  'écran verrouillé',
  'setInterval',
  'Activer sur ce téléphone'
]);
requireText('src/pages/PlatformAdminPage.tsx', [
  "get('section')",
  "get('notification')",
  "window.history.replaceState({}, '', '/administration-ncr')"
]);

requireText('supabase/functions/request-platform-access/index.ts', [
  'TURNSTILE_SECRET_KEY',
  'ACCESS_REQUEST_HASH_SALT',
  'platform_access_requests'
]);

requireText('supabase/functions/admin-review-access-request/index.ts', [
  "eq('role', 'super_admin')",
  "type: 'magiclink'",
  'contact@ncr-suite.fr'
]);

requireText('supabase/functions/request-account-recovery/index.ts', [
  "type: 'recovery'",
  'platform_auth_email_events',
  'contact@ncr-suite.fr'
]);

requireText('supabase/migrations/085_production_validation_security_correction.sql', [
  'create temporary table ncr_function_access_snapshot on commit drop',
  "has_function_privilege('authenticated',p.oid,'EXECUTE')",
  "has_function_privilege('service_role',p.oid,'EXECUTE')",
  'revoke execute on all functions in schema public from public,anon',
  "where authenticated_execute",
  "where service_execute",
  'alter default privileges in schema public revoke execute on functions from public',
  'create or replace function public.platform_access_security_report',
  'platform_production_validation_report_v212',
  "'platform.production_validation_security_corrected'",
  "'migration','085'",
  'set search_path = public'
]);

requireText('supabase/migrations/086_security_definer_search_path_hardening.sql', [
  'create temporary table ncr_security_definer_path_snapshot on commit drop',
  'revoke create on schema public from public,anon,authenticated',
  "and p.prokind in ('f','p','w')",
  "where setting like 'search_path=%'",
  'alter procedure %s set search_path = pg_catalog, public, extensions, pg_temp',
  'alter function %s set search_path = pg_catalog, public, extensions, pg_temp',
  'platform.security_definer_search_path_hardened',
  "'migration','086'",
  'set search_path = pg_catalog, public, extensions, pg_temp'
]);

requireText('supabase/migrations/087_final_public_function_acl_cleanup.sql', [
  'create or replace function public.platform_access_security_report',
  "d.classid='pg_proc'::regclass",
  "d.refclassid='pg_extension'::regclass",
  "d.deptype='e'",
  "'extension_public_functions',v_extension_functions",
  "'policyless',0",
  "'sealed_by_rls_tables',v_sealed_tables",
  'fonction(s) applicative(s) reste(nt) accessible(s) au role anon.',
  'platform.extension_access_classification_corrected',
  "'extension_objects','inventoried_not_modified'",
  "'migration','087'",
  'set search_path = public,pg_catalog'
]);

requireText('src/components/AdminProductionValidationPanel.tsx', [
  "supabase.rpc('platform_production_validation_report'",
  "supabase.rpc('platform_production_validation_history'",
  'Enregistrer ce contrôle',
  'Exporter l’historique',
  'manualChecks'
]);

requireText('src/pages/SaasLaunchCenterPage.tsx', [
  "supabase.rpc('preview_training_recovery_import'",
  "'import_training_recovery_records'",
  'trainingRecoveryImportTypes',
  'Télécharger les erreurs',
  'Aucune donnée n’est écrite pendant ce contrôle.'
]);

requireText('src/pages/TrainingPortalAdminPage.tsx', [
  'training_portal_admin_overview',
  'create_training_portal_invitation',
  'publish_training_portal_document',
  'create_training_signature_request'
]);

requireText('src/pages/TrainingPortalPage.tsx', [
  'current_training_portal_accounts',
  'training_portal_dashboard',
  'register_training_portal_document',
  'complete_training_signature',
  "crypto.subtle.digest('SHA-256'"
]);

requireText('src/pages/TrainingPortalInvitationPage.tsx', [
  'get_training_portal_invitation',
  'accept_training_portal_invitation'
]);

requireText('src/components/TrainingFeatureGate.tsx', [
  'organizationHasFeature',
  'Module non inclus dans votre configuration',
  '#training-modules',
  'Voir ce module dans mon abonnement'
]);

requireText('src/components/AppShell.tsx', [
  'formationPathIsLocked',
  'formationRequiredPlanForPath',
  'premium-locked',
  'navigation-search',
  'grouped-navigation',
  'Modules disponibles',
  'app-shell-v266',
  'app-shell-v270',
  'app-shell-v271'
]);
requireText('src/components/AdminCommercialReadinessPanel.tsx', [
  "supabase.rpc('platform_commercial_readiness_report'",
  "supabase.rpc('store_platform_commercial_validation'",
  'Entreprise pilote',
  'Clôturer la recette'
]);
requireText('src/pages/PlatformAdminPage.tsx', [
  "'validation'",
  '<AdminCommercialReadinessPanel />',
  'Recette client'
]);

requireText('src/config/moduleAccess.ts', [
  'FORMATION_UPSELL_PATHS',
  'formationPathIsLocked',
  'formationRequiredPlanForPath'
]);

requireText('src/components/TrainingModulesPanel.tsx', [
  'id="training-modules"',
  'requestedFeature',
  "item.feature_keys.includes(requestedFeature)"
]);
requireText('src/pages/SubscriptionPage.tsx', [
  "data.business_type === 'securite' && ['decouverte', 'essentielle'].includes(data.subscription.plan)",
  "data.business_type === 'formation' && ['decouverte', 'essentielle'].includes(data.subscription.plan)"
]);
requireText('src/styles.css', [
  '.navigation-search',
  '.navigation-group.available',
  '.mobile-drawer-nav.grouped-navigation'
]);

requireText('src/components/TrainingModulesPanel.tsx', [
  "supabase.rpc('training_module_portal'",
  "supabase.rpc('request_training_module_change'",
  "supabase.rpc('request_stripe_addon_change'",
  "functions.invoke('manage-stripe-addon'",
  "supabase.rpc('cancel_training_module_request'",
  'projectedTotal',
  'upgradeWouldBeCheaper',
  'La formule',
  'Ses données restent conservées',
  'MODULES FORMATION À LA CARTE'
]);

requireText('src/pages/SubscriptionPage.tsx', [
  "import { TrainingModulesPanel }",
  "data.business_type === 'formation'",
  '<TrainingModulesPanel />',
  'id="subscription-plans"',
  'Rétrogradation programmée',
  'sans suppression des données',
  'Vos données sont conservées'
]);

requireText('src/components/BillingAdminPanel.tsx', [
  "supabase.rpc('admin_training_module_configuration')",
  "supabase.rpc('admin_list_training_module_requests'",
  "supabase.rpc('admin_update_stripe_catalog_item'",
  "supabase.rpc('admin_update_billing_settings_v2'",
  "supabase.rpc('admin_review_training_module_request'",
  'MODULES FORMATION',
  'Modules Stripe Formation',
  'Qonto hors abonnement'
]);

requireText('src/components/AdminMonitoringPanel.tsx', [
  "supabase.rpc('platform_release_readiness_report')",
  '<AdminProductionValidationPanel />',
  "profile?.role === 'super_admin'",
  'PRÉPARATION V2.20',
  'MULTI-MÉTIERS'
]);

requireText('src/config/planEntitlements.ts', [
  "training_digital_attendance: 'training_digital_attendance'",
  "training_session_dossier: 'training_session_dossier'",
  "organization.business_type === 'formation'"
]);

requireText('src/config/moduleAccess.ts', [
  "'/dossiers-formation': 'training_session_dossier'",
  "'/qualite-formation': 'training_quality'",
  "'/facturation-formation': 'training_billing'",
  "'/portails-formation': 'training_portals_signatures'"
]);

const retentionSources = [
  read('supabase/migrations/057_security_addons.sql'),
  read('supabase/migrations/080_final_stabilization_training_modules.sql'),
  read('supabase/migrations/095_stripe_catalog_lifecycle_paid_activation.sql')
].join('\n').toLowerCase();
for (const destructiveStatement of [
  'delete from public.organization_training_modules',
  'delete from public.organization_security_addons',
  'delete from public.training_trainees',
  'delete from public.training_sessions',
  'delete from public.training_documents',
  'delete from public.training_customers',
  'delete from public.clients',
  'truncate public.'
]) {
  if (retentionSources.includes(destructiveStatement)) {
    failures.push(`La rétrogradation ne doit jamais exécuter : ${destructiveStatement}.`);
  }
}

const businessPacks = read('src/config/businessPacks.ts');
const accessMatrix = read('src/config/accessMatrix.ts');
const domains = ['coiffure', 'formation', 'securite', 'nettoyage', 'restauration'];
for (const domain of domains) {
  const packStart = businessPacks.indexOf(`  ${domain}: {`);
  const nextPackMatch = packStart >= 0
    ? businessPacks.slice(packStart + 1).match(/\n  (?:coiffure|formation|securite|nettoyage|restauration): \{/)
    : null;
  const packEnd = nextPackMatch?.index !== undefined
    ? packStart + 1 + nextPackMatch.index
    : businessPacks.indexOf('\n};', packStart);
  const packSection = packStart >= 0 && packEnd > packStart ? businessPacks.slice(packStart, packEnd) : '';
  const navigationEnd = packSection.indexOf('    metrics:');
  const navigationSection = navigationEnd > 0 ? packSection.slice(0, navigationEnd) : packSection;
  const navigationPaths = [...navigationSection.matchAll(/path:\s*'([^']+)'/g)]
    .map((match) => `/${match[1].split('?')[0].split('/').filter(Boolean)[0] ?? ''}`)
    .map((value) => value === '//' ? '/' : value);

  const accessStart = accessMatrix.indexOf(`  ${domain}: new Set([`);
  const accessEndWithComma = accessMatrix.indexOf('  ]),', accessStart);
  const accessEnd = accessEndWithComma >= 0
    ? accessEndWithComma
    : accessMatrix.indexOf('  ])', accessStart);
  const accessSection = accessStart >= 0 && accessEnd > accessStart ? accessMatrix.slice(accessStart, accessEnd) : '';
  if (!packSection || !accessSection) {
    failures.push(`Configuration métier illisible : ${domain}.`);
    continue;
  }
  for (const route of navigationPaths) {
    if (route !== '/' && !accessSection.includes(`'${route}'`)) {
      failures.push(`Navigation ${domain} non autorisée par sa matrice : ${route}`);
    }
  }
}

const migrationFiles = fs.readdirSync(path.join(root, 'supabase', 'migrations'));
for (const migrationNumber of ['054','055','056','057','058','059','060','061','062','063','064','065','066','067','068','069','070','071','072','073','074','075','076','077','078','079','080','081','082','083','084','085','086','087','088','089','090','091','092','093','094','095','096','097','098','099','100','101','102','103','104','105','106','107','108','109','110','111','112','113','114']) {
  if (!migrationFiles.some((file) => file.startsWith(`${migrationNumber}_`))) {
    failures.push(`Migration de production ${migrationNumber} absente.`);
  }
}


requireText('supabase/migrations/131_training_trainer_personal_bpf.sql', [
  'create table if not exists public.training_trainer_bpf_entries',
  'create or replace function public.training_trainer_bpf_overview',
  'create or replace function public.save_training_trainer_bpf_entry',
  "coalesce(tr.bpf_relationship,'internal')='external'",
  "'2.29.17'",
  'ncr-suite-shell-v2.29.17-trainer-personal-bpf'
]);

requireText('supabase/migrations/132_training_bpf_mixed_activity_scope.sql', [
  'add column if not exists bpf_regulatory_scope',
  'add column if not exists bpf_included',
  'training_trainer_bpf_preferences',
  'set_training_trainer_bpf_reporting_organization',
  'training_reporting_org_external_bpf_rows',
  'trainer_external_scope_pending',
  "'2.29.18'",
  'ncr-suite-shell-v2.29.18-bpf-mixed-activity'
]);

requireText('supabase/migrations/133_training_bpf_guided_assistant_release.sql', [
  "'2.29.19'",
  'ncr-suite-shell-v2.29.19-bpf-guided-assistant',
  'Assistant BPF guidé'
]);

requireText('supabase/migrations/134_training_premium_documents_release.sql', [
  "'2.29.20'",
  'ncr-suite-shell-v2.29.20-training-premium-documents',
  'documents Formation premium'
]);

requireText('supabase/migrations/135_training_bpf_guided_completed_session_fix.sql', [
  "'2.29.21'",
  'ncr-suite-shell-v2.29.21-training-bpf-guided-hotfix',
  'set_training_bpf_session_regulatory_scope',
  'set_training_bpf_session_delivery_mode',
  'set_training_bpf_enrollment_trainee_type',
  'set_training_bpf_session_trainee_type'
]);

requireText('supabase/migrations/136_training_pdf_multiline_definitive.sql', [
  "'2.29.22'",
  'ncr-suite-shell-v2.29.22-pdf-multiline-definitive',
  'rendu PDF Formation multi-ligne corrigé'
]);

requireText('src/pages/TrainingBpfPage.tsx', [
  "supabase.rpc('set_training_bpf_session_regulatory_scope'",
  "supabase.rpc('set_training_bpf_session_delivery_mode'",
  "supabase.rpc('set_training_bpf_enrollment_trainee_type'",
  "supabase.rpc('set_training_bpf_session_trainee_type'"
]);

requireText('src/components/TrainingBpfAssistant.tsx', [
  'ASSISTANT BPF · MODE GUIDÉ',
  'Quelles formations entrent dans ton BPF ?',
  'Qui a été formé ?',
  'Qui t’a payé ?',
  'Prêt à déclarer'
]);

requireText('src/components/TrainingTrainerBpfPanel.tsx', [
  "supabase.rpc('training_trainer_bpf_overview'",
  "supabase.rpc('save_training_trainer_bpf_entry'",
  'Cadre C · ligne 10',
  'heures-stagiaires',
  'Exporter CSV'
]);
requireText('src/pages/TrainingPortalPage.tsx', [
  "['bpf', 'Mon BPF', 'chart']",
  '<TrainingTrainerBpfPanel />'
]);
requireText('src/pages/TrainingTrainersPage.tsx', [
  "bpfRelationship: 'internal'",
  'Externe / sous-traitant',
  'updateBpfRelationship'
]);

requireText('src/features/training/commercialPdf.ts', [
  'Devis de formation',
  'SYNTHÈSE DE L’OFFRE',
  'Bon pour accord',
  "NCR Suite V2.29.20"
]);
requireText('supabase/functions/process-email-queue/index.ts', [
  'FORMATION · CONVOCATION PERSONNELLE',
  'VOTRE SESSION EN UN COUP D’ŒIL',
  'DOCUMENT_DATA_REQUIRED',
  "NCR Suite V2.29.25",
  'ATTESTATION NOMINATIVE',
  'SYNTHÈSE DE PRÉSENCE'
]);
requireText('src/features/training/certificateOfRealizationPdf.ts', [
  'Certificat de réalisation',
  'Durée réalisée',
  'NCR Suite V2.29.25'
]);
requireText('supabase/migrations/139_training_test_session_sandbox.sql', [
  "'2.29.25'",
  'ncr-suite-shell-v2.29.25-training-test-sandbox',
  'create_training_test_session',
  'configure_training_test_recipient',
  'is_test'
]);
requireText('src/pages/TrainingSessionsPage.tsx', [
  'Tester la clôture',
  'BAC À SABLE FORMATION',
  'create_training_test_session',
  'TEST · HORS BPF'
]);

if (failures.length) {
  console.error(`Préparation release NCR Suite : ${failures.length} échec(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Préparation release NCR Suite : validation finale et correctif de sécurité vérifiés.');
