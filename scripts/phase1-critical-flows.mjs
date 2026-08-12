import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const requireText = (file, snippets) => {
  if (!exists(file)) {
    failures.push(`Fichier critique absent : ${file}`);
    return;
  }
  const source = read(file);
  for (const snippet of snippets) {
    if (!source.includes(snippet)) failures.push(`Contrôle absent dans ${file} : ${snippet}`);
  }
};

const pkg = JSON.parse(read('package.json'));
const runtime = read('src/config/runtime.ts');
const sw = read('public/sw.js');
const expectedCache = `ncr-suite-shell-v${pkg.version}-public-ui-alignment-contrast`;
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
const trainingQualityCache = 'ncr-suite-shell-v2.19.0-training-quality-compliance';
const trainingBillingCache = 'ncr-suite-shell-v2.18.0-training-billing-collections';
const trainingBpfCache = 'ncr-suite-shell-v2.17.0-training-bpf-automation';
const trainingCrmCache = 'ncr-suite-shell-v2.16.0-training-crm-pipeline';
const trainingSavCache = 'ncr-suite-shell-v2.15.4-training-sav-admin';
const trainingIntegrityCache = 'ncr-suite-shell-v2.15.3-training-automation-integrity';
const trainingClosureCache = 'ncr-suite-shell-v2.15.2-training-closure';
const trainingDocumentsCache = 'ncr-suite-shell-v2.15.1-training-documents';
const trainingWorkflowCache = 'ncr-suite-shell-v2.15.0-training-workflow';
const trainingCommercialCache = 'ncr-suite-shell-v2.14.0-training-commercial';
const trainingDossiersCache = 'ncr-suite-shell-v2.14.1-training-dossiers';
const coiffureCache = 'ncr-suite-shell-v2.12.3-coiffure-loyalty-portal';
const cleaningCache = 'ncr-suite-shell-v2.12.2-cleaning-client-portal';
if (!runtime.includes(`APP_VERSION = '${pkg.version}'`)) failures.push('La version frontend ne correspond pas à package.json.');
if (!runtime.includes(`PWA_CACHE_NAME = '${expectedCache}'`)) failures.push('Le cache runtime ne correspond pas à la release attendue.');
if (!runtime.includes('RUNTIME_HEARTBEAT_INTERVAL_MS')) failures.push('La surveillance runtime a été retirée par erreur.');
if (!sw.includes(`const CACHE = '${expectedCache}'`)) failures.push('Le Service Worker ne correspond pas à la release attendue.');

requireText('src/main.tsx', ['<RuntimeMonitor />', '<ConnectivityStatus />']);
requireText('src/components/AppErrorBoundary.tsx', [
  "source: 'react'",
  "severity: 'critical'",
  'componentStack',
  'MODULE_LOAD_ERROR',
  'MODULE_RECOVERY_KEY',
  'this.resetAndReload()'
]);
requireText('public/manifest.webmanifest', ['"start_url": "/connexion?source=pwa"']);
requireText('src/App.tsx', ['runsAsInstalledPwa']);
requireText('src/pages/PublicHomePage.tsx', [
  'public-home-v291',
  'public-home-v292',
  'public-home-v293',
  'Essai gratuit de 7 jours',
  'essai=7'
]);
requireText('src/pages/PublicSolutionPage.tsx', [
  'public-solution-v291',
  'public-solution-v292',
  'public-solution-v293',
  'Essai gratuit de 7 jours',
  'essai=7'
]);
requireText('src/pages/AccessRequestPage.tsx', [
  'trialRequested',
  "functions.invoke('request-platform-access'",
  'public-form-page-v291',
  'public-form-page-v292',
  'public-form-page-v293'
]);
requireText('index.html', [
  '/favicon.ico',
  '/icons/favicon-96.png',
  '/icons/favicon-48.png',
  '/ncr-suite-showcase-v293.css',
  '/ncr-suite-app-v293.css',
  'ncr-style-guard',
  'ncr:css-recovery-v2.29.3'
]);
requireText('public/_headers', [
  '/ncr-suite-app-v293.css',
  '/favicon.ico',
  'Content-Type: text/css; charset=utf-8'
]);
requireText('vite.config.ts', [
  'codeSplitting: false',
  "entryFileNames: 'ncr-suite-app-v293.js'"
]);
requireText('src/components/RuntimeMonitor.tsx', [
  "window.addEventListener('error'",
  "window.addEventListener('unhandledrejection'",
  "supabase.rpc('record_runtime_heartbeat'",
  "supabase.rpc('report_client_runtime_error'",
  "supabase.rpc('get_runtime_release_state'"
]);
requireText('src/components/AdminMonitoringPanel.tsx', [
  "supabase.rpc('platform_global_health_report'",
  "supabase.rpc('admin_resolve_runtime_error'",
  'ERREURS RUNTIME',
  'INTÉGRITÉ DE VERSION'
]);
requireText('src/pages/PlatformAdminPage.tsx', ["activeSection === 'monitoring'", '<AdminMonitoringPanel />']);

const app = read('src/App.tsx');
const publicRoutes = [
  '/reserver/:slug',
  '/reservation/:token',
  '/r/:slug/menu',
  '/r/:slug/reserver',
  '/evaluation/:token',
  '/formation/invitation/:token',
  '/espace-formation',
  '/invitation/:token',
  '/client-securite/invitation/:token',
  '/espace-client-securite',
  '/client-nettoyage/invitation/:token',
  '/espace-client-nettoyage',
  '/client-coiffure/invitation/:token',
  '/espace-client-coiffure'
  ,'/demande-acces'
  ,'/mot-de-passe-oublie'
  ,'/activation'
  ,'/mentions-legales'
  ,'/confidentialite'
];
for (const route of publicRoutes) {
  if (!app.includes(`path=\"${route}\"`) && !app.includes(`path='${route}'`)) {
    failures.push(`Route publique critique absente : ${route}`);
  }
}

const access = read('src/config/accessMatrix.ts');
const crossDomainRoutes = [
  ['coiffure', '/rendez-vous'],
  ['coiffure', '/fidelite'],
  ['formation', '/sessions'],
  ['securite', '/rondes'],
  ['securite', '/portail-clients'],
  ['nettoyage', '/interventions'],
  ['nettoyage', '/portail-clients'],
  ['restauration', '/commandes']
];
for (const [domain, route] of crossDomainRoutes) {
  const marker = `${domain}: new Set([`;
  const start = access.indexOf(marker);
  const end = access.indexOf(']),', start);
  if (start < 0 || end < 0 || !access.slice(start, end).includes(`'${route}'`)) {
    failures.push(`Route métier attendue absente de la matrice : ${domain} ${route}`);
  }
}
for (const sensitive of ['/abonnement', '/acces-equipe', '/personnalisation', '/offre-metier']) {
  if (!access.includes(`'${sensitive}'`)) failures.push(`Route sensible non déclarée : ${sensitive}`);
}

const migration = 'supabase/migrations/059_global_observability_release_validation.sql';
requireText(migration, [
  'create table if not exists public.platform_runtime_errors',
  'create table if not exists public.platform_runtime_heartbeats',
  'create or replace function public.report_client_runtime_error',
  'create or replace function public.platform_global_health_report',
  'create or replace function public.admin_resolve_runtime_error',
  "'2.11.6'",
  'ncr-suite-shell-v2.11.6-phase1-complete',
  'set search_path = public'
]);

const migrationFiles = fs.readdirSync(path.join(root, 'supabase', 'migrations'));
for (const number of ['054', '055', '056', '057', '058', '059', '060', '061', '062', '063', '064', '065', '066', '067', '068', '069', '070', '071', '072', '073', '074', '075', '076', '077', '078', '079', '080', '081', '082', '083', '084', '085', '086', '087', '088']) {
  if (!migrationFiles.some((file) => file.startsWith(`${number}_`))) failures.push(`Migration critique ${number} absente.`);
}


requireText('src/pages/SecurityClientPortalAdminPage.tsx', [
  "security_client_portal_admin_overview",
  "create_security_client_portal_invitation",
  "security-client-documents",
  "security_client_portal_admin_send_message"
]);
requireText('src/pages/SecurityClientPortalPage.tsx', [
  "current_security_client_portal_accounts",
  "security_client_portal_dashboard",
  "security_client_portal_send_message",
  "security-client-documents"
]);
requireText('src/pages/SecurityClientPortalInvitationPage.tsx', [
  "get_security_client_portal_invitation",
  "accept_security_client_portal_invitation"
]);
requireText('supabase/migrations/060_security_client_portal.sql', [
  'create table if not exists public.security_client_portal_accounts',
  'create table if not exists public.security_client_portal_documents',
  'create or replace function public.security_client_portal_dashboard',
  'create or replace function public.get_security_client_portal_invitation',
  'security_client_portal_documents_storage_path_check',
  'email_outbox_template_key_check',
  "'security_client_portal_invitation'",
  "bucket_id='security-client-documents'",
  'Trop de messages envoyés',
  "'2.12.0'",
  'ncr-suite-shell-v2.12.0-security-client-portal',
  'set search_path = public'
]);


requireText('supabase/functions/admin-delete-organization/index.ts', [
  "eq('role', 'super_admin')",
  "from('organizations')",
  "removeOrganizationStorage",
  "platform_deleted_organizations",
  "platform.organization_deleted"
]);
requireText('supabase/migrations/062_platform_organization_secure_deletion.sql', [
  'create table if not exists public.platform_deleted_organizations',
  'enable row level security',
  "'2.12.1'",
  'ncr-suite-shell-v2.12.1-secure-organization-deletion'
]);
requireText('src/pages/PlatformAdminPage.tsx', [
  "supabase.functions.invoke('admin-delete-organization'",
  'Supprimer définitivement cette entreprise',
  'deleteOrganizationName'
]);


requireText('src/pages/CleaningClientPortalAdminPage.tsx', [
  "cleaning_client_portal_admin_overview",
  "create_cleaning_client_portal_invitation",
  "cleaning-client-documents",
  "cleaning_client_portal_admin_send_message"
]);
requireText('src/pages/CleaningClientPortalPage.tsx', [
  "current_cleaning_client_portal_accounts",
  "cleaning_client_portal_dashboard",
  "cleaning_client_portal_send_message",
  "cleaning-client-documents"
]);
requireText('src/pages/CleaningClientPortalInvitationPage.tsx', [
  "get_cleaning_client_portal_invitation",
  "accept_cleaning_client_portal_invitation"
]);
requireText('supabase/migrations/063_cleaning_client_portal.sql', [
  'create table if not exists public.cleaning_client_portal_accounts',
  'create table if not exists public.cleaning_client_portal_documents',
  'create or replace function public.cleaning_client_portal_dashboard',
  'create or replace function public.get_cleaning_client_portal_invitation',
  'cleaning_client_portal_documents_storage_path_check',
  'validate_cleaning_client_portal_document_scope',
  "'cleaning_client_portal_invitation'",
  "bucket_id='cleaning-client-documents'",
  'Trop de messages envoyés',
  "'2.12.2'",
  cleaningCache,
  'set search_path = public'
]);

requireText('src/pages/LoyaltyPage.tsx', [
  "coiffure_loyalty_admin_overview",
  "update_coiffure_loyalty_settings",
  "create_coiffure_client_portal_invitation",
  "adjust_coiffure_loyalty_balance",
  "issue_coiffure_manual_reward",
  "set_coiffure_client_portal_account_status"
]);
requireText('src/pages/CoiffureClientPortalPage.tsx', [
  "current_coiffure_client_portal_accounts",
  "coiffure_client_portal_dashboard",
  "update_coiffure_client_portal_profile",
  '/reserver/'
]);
requireText('src/pages/CoiffureClientPortalInvitationPage.tsx', [
  "get_coiffure_client_portal_invitation",
  "accept_coiffure_client_portal_invitation"
]);
requireText('supabase/migrations/064_coiffure_loyalty_client_portal.sql', [
  'create table if not exists public.coiffure_loyalty_settings',
  'create table if not exists public.coiffure_client_portal_accounts',
  'create table if not exists public.coiffure_loyalty_rewards',
  'create table if not exists public.coiffure_loyalty_ledger',
  'create or replace function public.process_coiffure_appointment_loyalty',
  'create or replace function public.coiffure_client_portal_dashboard',
  'create or replace function public.get_coiffure_client_portal_invitation',
  'create or replace function public.set_coiffure_client_portal_account_status',
  "'coiffure_client_portal_invitation'",
  "'2.12.3'",
  coiffureCache,
  'set search_path = public'
]);

requireText('src/pages/RestaurantCommercialBrandingPage.tsx', [
  "update_restaurant_public_menu_settings",
  "organization-branding",
  "restaurant-theme-grid",
  "showDishImages",
  "showBookingButton",
  "update_restaurant_public_menu_translations"
]);
requireText('src/pages/PublicRestaurantMenuPage.tsx', [
  "get_public_restaurant_menu",
  "restaurant-theme-",
  "image_url",
  "restaurant-public-category-nav",
  "/reserver",
  "hero_eyebrow_en",
  "booking_button_label_it",
  "localeByLanguage",
  "loadFailed"
]);
requireText('src/pages/RestaurantMenuPage.tsx', [
  "restaurant-dish-photo-field",
  "organization-branding",
  "image_url"
]);
requireText('src/pages/RestaurantQrMenuPage.tsx', [
  "Personnaliser le rendu",
  "QRCode.toDataURL",
  "restaurant-qr-premium"
]);
requireText('src/pages/CommercialBrandingPage.tsx', [
  "business_type === 'restauration'",
  "<RestaurantCommercialBrandingPage />"
]);
requireText('supabase/migrations/065_restaurant_public_menu_premium.sql', [
  'create table if not exists public.restaurant_public_menu_settings',
  'create or replace function public.update_restaurant_public_menu_settings',
  'create or replace function public.get_public_restaurant_menu',
  "public.organization_has_plan_feature(o.id, 'commercial_branding')",
  "o.business_type = 'securite'",
  "'image_url', i.image_url",
  "'2.13.0'",
  'ncr-suite-shell-v2.13.0-restaurant-premium',
  'set search_path = public'
]);


requireText('src/pages/PublicRestaurantBookingPage.tsx', [
  "booking_welcome_text_en",
  "restaurant-public-languages",
  "ONLINE BOOKING",
  "RESERVA EN LÍNEA",
  "PRENOTAZIONE ONLINE",
  "source === ui.fr.defaultWelcome"
]);
requireText('supabase/migrations/066_restaurant_public_translations_complete.sql', [
  'update_restaurant_public_menu_translations',
  'hero_description_en',
  'booking_welcome_text_it',
  'create or replace function public.get_public_restaurant_booking_config',
  "'2.13.1'",
  'ncr-suite-shell-v2.13.1-restaurant-premium',
  'set search_path = public'
]);

requireText('src/pages/RestaurantFloorPlanPage.tsx', [
  'RESTAURATION · PLAN DE SALLE'
]);
requireText('supabase/migrations/067_restaurant_finalization_release.sql', [
  "'2.13.2'",
  'ncr-suite-shell-v2.13.2-restaurant-premium',
  'on conflict(singleton) do update set'
]);

requireText('src/pages/TrainingCommercialPage.tsx', [
  'training_customers',
  'training_funders',
  'training_commercial_documents',
  'generateTrainingCommercialPdf',
  'CRM & COMMERCIAL'
]);
requireText('supabase/migrations/068_training_commercial_administration.sql', [
  'create table if not exists public.training_customers',
  'create table if not exists public.training_funders',
  'create table if not exists public.training_commercial_documents',
  'next_training_commercial_reference',
  "when 'training_commercial' then 'training_commercial'",
  "organization_has_plan_feature(organization_id, 'training_commercial')",
  "'2.14.0'",
  trainingCommercialCache,
  'set search_path = public'
]);


requireText('src/pages/TrainingDossiersPage.tsx', [
  'Dossiers de formation',
  'training_session_dossier',
  'update_training_session_dossier_settings',
  'close_training_session',
  'generateSessionDossierPdf',
  'training-workspace-premium'
]);
requireText('supabase/migrations/069_training_session_dossier_workspace.sql', [
  'training_dossier_requirements',
  'update_training_session_dossier_settings',
  "organization_has_plan_feature(p_organization_id, 'training_session_dossier')",
  "'2.14.1'",
  trainingDossiersCache,
  'set search_path = public'
]);
if (!app.includes('path="dossiers-formation"') || !access.includes("'/dossiers-formation'")) {
  failures.push('Le dossier centralisé Formation doit rester raccordé à la navigation et à la matrice d’accès.');
}


requireText('src/pages/TrainingProgramsPage.tsx', [
  'Formations complètes',
  'trainingProgramCompletion',
  'training_program_trainers',
  'Créer une proposition'
]);
requireText('src/pages/TrainingOrganizationProfilePage.tsx', [
  'Profil de l’organisme',
  'update_training_organization_profile',
  'Adresse de réponse pour les documents signés'
]);
requireText('src/pages/TrainingWorkflowPage.tsx', [
  'Du programme au dossier complet',
  'create_training_session_from_commercial',
  'validate_training_session_workflow',
  'Valider et envoyer'
]);
requireText('supabase/migrations/070_training_unified_workflow.sql', [
  'create table if not exists public.training_program_trainers',
  'create or replace function public.update_training_organization_profile',
  'create or replace function public.create_training_session_from_commercial',
  'create or replace function public.validate_training_session_workflow',
  "'2.15.0'",
  trainingWorkflowCache,
  'set search_path = public'
]);
if (!app.includes('path="parcours-formation"') || !app.includes('path="profil-organisme"') || !access.includes("'/parcours-formation'") || !access.includes("'/profil-organisme'")) {
  failures.push('Le parcours Formation V2.15.0 doit rester raccordé aux routes et à la matrice d’accès.');
}

requireText('src/features/training/premiumPdf.ts', [
  'drawTrainingPremiumHeader',
  'drawTrainingPremiumFooter',
  'training_signature_url',
  'training_stamp_url'
]);
requireText('src/features/training/programPdf.ts', [
  'generateTrainingProgramPdf',
  'Programme de formation',
  'Organisation pratique'
]);
requireText('src/features/training/commercialPdf.ts', [
  'NCR Suite V2.18.0',
  'Acceptation et signatures',
  'Programme détaillé'
]);
requireText('src/pages/TrainingCommercialPage.tsx', [
  'queue_training_commercial_document_email',
  'training-documents',
  'Envoi programmé'
]);
requireText('src/pages/TrainingOrganizationProfilePage.tsx', [
  'update_training_document_branding',
  'Signature du représentant',
  'Cachet de l’organisme'
]);
requireText('supabase/migrations/071_training_premium_documents_brevo.sql', [
  'training_commercial_document',
  'queue_training_commercial_document_email',
  'update_training_document_branding',
  "'2.15.1'",
  trainingDocumentsCache,
  'set search_path = public'
]);
requireText('supabase/functions/process-email-queue/index.ts', [
  "case 'training_commercial_document'",
  "item.template_key === 'training_commercial_document'",
  'Convocation à une formation',
  'NCR Suite V2.18.0'
]);
requireText('supabase/migrations/073_training_delivery_closure_automation.sql', [
  'update_training_evaluation_settings',
  'queue_training_session_evaluation',
  'queue_due_training_evaluation_reminders',
  'launch_training_session_closure_automation',
  'refresh_training_session_dossier_completion',
  "'2.15.2'",
  trainingClosureCache,
  'set search_path = public'
]);
requireText('supabase/migrations/074_training_automation_integrity.sql', [
  'create table if not exists public.training_document_jobs',
  'create unique index if not exists uq_training_documents_automation_key',
  'create or replace function public.claim_training_document_jobs',
  'create or replace function public.training_document_job_payload',
  'create or replace function public.guard_training_session_validation',
  'create or replace function public.training_automation_integrity_report',
  "'2.15.3'",
  trainingIntegrityCache,
  'set search_path = public'
]);
requireText('src/pages/TrainingEvaluationsPage.tsx', [
  'Évaluations début & fin',
  'queue_training_session_evaluation',
  'training_evaluation_summary'
]);
requireText('src/pages/TrainingSessionsPage.tsx', [
  "status: 'draft' as TrainingSessionStatus",
  "p_status: creationStatus",
  "supabase.rpc('validate_training_session_workflow'",
  'p_send_convocations: true',
  'evaluation_type,status,scheduled_for'
]);
requireText('src/pages/PublicTrainingSatisfactionPage.tsx', [
  'submit_public_training_evaluation',
  "evaluation_type === 'initial'"
]);
requireText('src/pages/TrainingWorkflowPage.tsx', [
  'finishSession',
  'Terminer et lancer la clôture automatisée'
]);

requireText('supabase/migrations/075_admin_training_sav_supervision.sql', [
  'create or replace function public.admin_training_sav_overview',
  'create or replace function public.admin_training_sav_organization_report',
  'create or replace function public.admin_training_sav_retry_document_job',
  'create or replace function public.admin_training_sav_retry_training_emails',
  'create or replace function public.admin_training_sav_repair_session',
  'public.is_platform_super_admin()',
  "'2.15.4'",
  trainingSavCache,
  'set search_path = public'
]);
requireText('src/components/AdminTrainingSavPanel.tsx', [
  "supabase.rpc('admin_training_sav_overview'",
  "supabase.rpc('admin_training_sav_organization_report'",
  "supabase.rpc('admin_training_sav_repair_session'",
  "supabase.rpc('admin_training_sav_retry_document_job'",
  "supabase.rpc('admin_training_sav_retry_training_emails'",
  'SAV FORMATION',
  'Les clients ne voient pas cette console.'
]);
requireText('src/pages/PlatformAdminPage.tsx', [
  "import { AdminTrainingSavPanel }",
  "activeSection === 'trainingSav'",
  'SAV Formation',
  '<AdminTrainingSavPanel />'
]);

requireText('supabase/migrations/076_training_crm_pipeline.sql', [
  'create table if not exists public.training_crm_opportunities',
  'create table if not exists public.training_crm_activities',
  'create or replace function public.move_training_crm_opportunity',
  'create or replace function public.convert_training_crm_opportunity_to_customer',
  'create or replace function public.set_training_crm_activity_completed',
  'create or replace function public.sync_training_crm_from_commercial_document',
  'alter table public.training_crm_opportunities enable row level security',
  'alter table public.training_crm_activities enable row level security',
  "'2.16.0'",
  trainingCrmCache,
  'set search_path = public'
]);
requireText('src/components/TrainingCrmPipeline.tsx', [
  "supabase.rpc('move_training_crm_opportunity'",
  "supabase.rpc('convert_training_crm_opportunity_to_customer'",
  "supabase.rpc('set_training_crm_activity_completed'",
  "from('training_crm_opportunities')",
  "from('training_crm_activities')",
  'Pipeline',
  'Prochaines actions',
  'Préparer le devis'
]);
requireText('src/pages/TrainingCommercialPage.tsx', [
  "type Tab = 'crm'",
  '<TrainingCrmPipeline',
  'opportunity_id',
  'createDocumentFromOpportunity',
  'CRM & COMMERCIAL'
]);

requireText('supabase/migrations/077_training_bpf_automation.sql', [
  'create table if not exists public.training_bpf_reports',
  'create or replace function public.create_training_bpf_report',
  'create or replace function public.refresh_training_bpf_report',
  'create or replace function public.set_training_bpf_report_status',
  'create or replace function public.reopen_training_bpf_report',
  'create or replace function public.training_bpf_participant_rows',
  'alter table public.training_bpf_reports enable row level security',
  "'2.17.0'",
  trainingBpfCache,
  'set search_path = public'
]);
requireText('src/pages/TrainingBpfPage.tsx', [
  "supabase.rpc('create_training_bpf_report'",
  "supabase.rpc('refresh_training_bpf_report'",
  "supabase.rpc('set_training_bpf_report_status'",
  "supabase.rpc('reopen_training_bpf_report'",
  'Bilan pédagogique et financier',
  'Origine des produits hors taxes',
  'Type de stagiaires',
  'Principales spécialités de formation',
  'Verrouiller le BPF'
]);
requireText('src/features/training/bpfPdf.ts', [
  'NCR Suite V2.18.0',
  'Cerfa 10443*17',
  'BPF PREPARATOIRE'
]);
requireText('src/features/training/bpfCsv.ts', [
  'generateTrainingBpfCsv',
  'Total des produits de formation',
  'Heures-stagiaires'
]);
if (!app.includes('path="bpf"') || !access.includes("'/bpf'")) {
  failures.push('Le BPF Formation V2.17.0 doit rester raccordé aux routes et à la matrice d’accès.');
}

requireText('supabase/migrations/078_training_billing_collections.sql', [
  'create table if not exists public.training_invoices',
  'create table if not exists public.training_invoice_lines',
  'create table if not exists public.training_invoice_payments',
  'create or replace function public.create_training_invoice',
  'create or replace function public.issue_training_invoice',
  'create or replace function public.record_training_invoice_payment',
  'create or replace function public.create_training_credit_note',
  'create or replace function public.queue_training_invoice_email',
  'create or replace function public.queue_due_training_invoice_reminders',
  'refresh_training_bpf_report_commercial_legacy',
  'alter table public.training_invoices enable row level security',
  "'2.18.0'",
  trainingBillingCache,
  'set search_path = public'
]);
requireText('src/pages/TrainingBillingPage.tsx', [
  "supabase.rpc('create_training_invoice'",
  "supabase.rpc('issue_training_invoice'",
  "supabase.rpc('record_training_invoice_payment'",
  "supabase.rpc('create_training_credit_note'",
  "supabase.rpc('queue_training_invoice_email'",
  'Facturation et encaissements',
  'Nouvelle facture'
]);
requireText('src/features/training/invoicePdf.ts', [
  'NCR Suite V2.18.0',
  'Indemnite forfaitaire pour frais de recouvrement',
  'BROUILLON'
]);
requireText('supabase/functions/process-email-queue/index.ts', [
  "case 'training_invoice'",
  "item.template_key === 'training_invoice'",
  'queue_due_training_invoice_reminders'
]);
if (!app.includes('path="facturation-formation"') || !access.includes("'/facturation-formation'")) {
  failures.push('La facturation Formation V2.18.0 doit rester raccordée aux routes et à la matrice d’accès.');
}

requireText('supabase/migrations/079_training_quality_compliance.sql', [
  'create table if not exists public.training_quality_controls',
  'create table if not exists public.training_quality_evidence',
  'create table if not exists public.training_quality_audits',
  'create or replace function public.initialize_training_quality_framework',
  'create or replace function public.sync_training_quality_automatic_evidence',
  'create or replace function public.update_training_quality_control',
  'create or replace function public.add_training_quality_evidence',
  'create or replace function public.archive_training_quality_evidence',
  'create or replace function public.create_training_quality_audit',
  'create or replace function public.update_training_quality_audit',
  "when 'training_quality' then 'training_quality'",
  'alter table public.training_quality_controls enable row level security',
  "'2.19.0'",
  trainingQualityCache,
  'set search_path = public'
]);
requireText('src/pages/TrainingQualityCompliancePage.tsx', [
  "supabase.rpc('initialize_training_quality_framework'",
  "supabase.rpc('sync_training_quality_automatic_evidence'",
  "supabase.rpc('update_training_quality_control'",
  "supabase.rpc('add_training_quality_evidence'",
  "supabase.rpc('create_training_quality_audit'",
  "supabase.rpc('update_training_quality_audit'",
  'Qualiopi & conformité',
  '32 indicateurs',
  'Dossier PDF'
]);
requireText('src/features/training/qualityCompliance.ts', [
  'trainingQualityIndicatorSeeds',
  '[1, 1',
  '[7, 32',
  'buildTrainingQualitySummary'
]);
requireText('src/features/training/qualityCompliancePdf.ts', [
  'NCR Suite V2.19.0',
  'Dossier de préparation qualité',
  'Ce dossier facilite la préparation'
]);
requireText('src/features/training/qualityComplianceCsv.ts', [
  'NCR Suite V2.19.0',
  'INDICATEURS',
  'PREUVES',
  'AUDITS'
]);
if (!app.includes('path="qualite-formation"') || !access.includes("'/qualite-formation'")) {
  failures.push('Le module Qualiopi Formation V2.19.0 doit rester raccordé aux routes et à la matrice d’accès.');
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
requireText('src/components/TrainingFeatureGate.tsx', [
  'organizationHasFeature',
  'Module non inclus dans votre configuration',
  '#training-modules',
  'Voir ce module dans mon abonnement'
]);
requireText('src/components/AppShell.tsx', [
  'formationPathIsLocked',
  'formationRequiredPlanForPath'
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
for (const [route, feature] of [
  ['parcours-formation', 'training_session_dossier'],
  ['commercial', 'training_commercial'],
  ['facturation-formation', 'training_billing'],
  ['bpf', 'training_bpf'],
  ['qualite-formation', 'training_quality'],
  ['evaluations', 'training_satisfaction']
]) {
  if (!app.includes(`path="${route}"`) || !app.includes(`feature="${feature}"`)) {
    failures.push(`Le verrou Formation V2.20.1 est absent ou incomplet : ${route}.`);
  }
}
requireText('supabase/migrations/082_training_portals_signatures.sql', [
  'create table if not exists public.training_portal_accounts',
  'create table if not exists public.training_portal_documents',
  'create table if not exists public.training_signature_requests',
  'create or replace function public.training_portal_admin_overview',
  'create or replace function public.training_portal_dashboard',
  'create or replace function public.complete_training_signature',
  'training_portals_signatures_addon',
  "'2.21.0'",
  trainingPortalsCache,
  'set search_path = public'
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
  "'training_documents'",
  "'training_imports'",
  "'training_signatures'",
  "'manual_validation'",
  "'2.21.2'",
  finalProductionValidationCache,
  'set search_path = public'
]);
requireText('supabase/migrations/088_commercial_launch_controlled_access.sql', [
  'create table if not exists public.platform_access_requests',
  'create table if not exists public.platform_auth_email_events',
  'platform_access_requests_admin_read',
  'public.is_platform_admin()',
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
  'platform_admin_notifications',
  'notify_platform_admin_support_ticket',
  'notify_platform_admin_access_request',
  "'2.24.0'",
  portalAccessAlertsCache
]);
requireText('supabase/migrations/093_platform_admin_locked_screen_push.sql', [
  'alter column organization_id drop not null',
  "metadata->>'scope'='platform_admin'",
  'platform-admin-push:',
  'push_delivery_queue',
  'queue_platform_admin_push_test',
  "'2.24.1'",
  platformAdminLockedPushCache
]);
requireText('supabase/migrations/094_stripe_subscription_billing.sql', [
  'create table if not exists public.stripe_price_catalog',
  'stripe_customer_id',
  'stripe_subscription_id',
  'claim_stripe_webhook_event',
  'apply_stripe_billing_event',
  "'2.25.0'",
  'ncr-suite-shell-v2.25.0-stripe-billing'
]);
requireText('supabase/migrations/095_stripe_catalog_lifecycle_paid_activation.sql', [
  'create table if not exists public.stripe_addon_price_catalog',
  'create table if not exists public.subscription_data_retention_events',
  'organization_billing_access_allowed',
  'request_stripe_addon_change',
  'record_stripe_scheduled_plan_change',
  'data_retention_mode',
  "check (data_retention_mode='preserve')",
  "'data_retained',true",
  "'2.26.0'",
  'ncr-suite-shell-v2.26.0-stripe-billing'
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
  'profile_avatars_insert_own',
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
  'create table if not exists public.platform_commercial_validation_runs',
  'create or replace function public.platform_commercial_readiness_report',
  'create or replace function public.store_platform_commercial_validation',
  'create or replace function public.platform_commercial_validation_history',
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
requireText('src/pages/CleaningAgentPortalPage.tsx', [
  'prepareCleaningPhoto',
  "capture=\"environment\"",
  "supabase.rpc('set_cleaning_intervention_photo'",
  'Prendre la photo avant',
  'Prendre la photo après'
]);
requireText('src/pages/LoginPage.tsx', [
  'agent-nettoyage',
  "cleaningAgentMode ? '/terrain' : '/'",
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
  expectedCache,
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
requireText('src/pages/SecurityClientPortalPage.tsx', [
  'agentOrganization',
  "item.role === 'employee'",
  '<Navigate to="/terrain" replace />'
]);
requireText('src/pages/CleaningClientPortalPage.tsx', [
  'agentOrganization',
  "item.role === 'employee'",
  '<Navigate to="/terrain" replace />'
]);
requireText('src/features/cleaning/visitReportPdf.ts', [
  'embedRemotePhoto',
  'drawPhotoCard',
  'scaleToFit',
  "pdf.addPage([595.28, 841.89])",
  'PREUVES PHOTO'
]);
requireText('src/pages/PublicSolutionPage.tsx', [
  'public-solution-v283',
  'data-solution-reveal',
  'IntersectionObserver',
  'public-solution-feature-preview',
  'public-solution-interface-workspace',
  '/brand/ncr-suite-application-icon-v281.png'
]);
requireText('src/styles.css', [
  'NCR Suite V2.28.3 - lisibilite des cartes et rythme vertical desktop',
  '@media (min-width: 1001px)',
  'article.public-solution-feature-card',
  '"outcome-label outcome-title"'
]);
requireText('src/components/AppShell.tsx', [
  'app-shell-v284',
  'enterprise-notification-shortcut desktop',
  'enterprise-notification-shortcut mobile',
  'to="/notifications"'
]);
requireText('src/styles.css', [
  'NCR Suite V2.28.4 - raccourci permanent des notifications entreprise',
  '.app-shell-v284 .enterprise-notification-shortcut'
]);
requireText('src/config/moduleAccess.ts', [
  "const UNIVERSAL_MODULE_PATHS = new Set(['/notifications'])",
  'const isUniversalModule = UNIVERSAL_MODULE_PATHS.has(normalized)',
  '!isUniversalModule && organization.plan'
]);
requireText('src/components/PublicSiteHeader.tsx', [
  'public-solutions-trigger',
  'public-solutions-strip',
  'publicSeoPages.json',
  'aria-expanded={solutionsOpen}',
  'setSolutionsOpen(false)'
]);
requireText('src/styles.css', [
  'NCR Suite V2.28.6 - menu horizontal des solutions metier',
  '.public-solutions-panel',
  'grid-template-columns: repeat(5, minmax(0, 1fr))',
  '.public-solutions-strip > a:hover'
]);
requireText('scripts/generate-seo-pages.mjs', [
  'publicSeoPages.json',
  'BreadcrumbList',
  'FAQPage',
  'sitemap.xml',
  'ncr-seo-prerender'
]);
requireText('src/pages/AccessRequestPage.tsx', [
  'readAcquisitionContext',
  'acquisitionSource',
  'landingPath'
]);
requireText('supabase/functions/request-platform-access/index.ts', [
  'acquisition_source',
  'landing_path'
]);
requireText('functions/_middleware.ts', [
  'indexablePaths',
  '/logiciel-gestion-formation',
  '/logiciel-securite-privee',
  '/logiciel-entreprise-nettoyage',
  '/logiciel-gestion-restaurant',
  '/logiciel-coiffure',
  'NCR_CANONICAL_REDIRECT_ENABLED'
]);
requireText('supabase/functions/create-stripe-checkout/index.ts', [
  "mode: 'subscription'",
  'stripe_price_catalog',
  'subscription_data',
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
requireText('src/components/AppShell.tsx', [
  'desktop-context-switchers',
  'context-switcher organization-switcher',
  'context-switcher site-switcher',
  "desktopContextMenu === 'organization'",
  "desktopContextMenu === 'site'",
  'organization.logo_url',
  'org.logo_url',
  "from('profile-avatars')",
  "from('user_profiles')",
  'profile-avatar-upload',
  '<AvatarContent',
  'app-shell app-shell-v265',
  'AVATAR_CROP_SIZE',
  'handleAvatarCropPointerMove',
  "canvas.toBlob(resolve, 'image/webp'",
  "canvas.toBlob(resolve, 'image/jpeg'",
  'Utiliser la photo'
  ,'navigation-search'
  ,'grouped-navigation'
  ,'Modules disponibles'
  ,'app-shell-v266'
  ,'app-shell-v270'
  ,'app-shell-v271'
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
requireText('src/styles.css', [
  '.context-switcher-trigger',
  '.context-switcher-menu',
  '.context-switcher-options > button.active',
  '.desktop-context-switchers, .organization-switcher',
  '.training-quality-period-segmented',
  '.training-quality-period.training-quality-period-mobile { display:none !important; }',
  '.training-quality-period.training-quality-period-mobile { display:grid !important;grid-column:1/-1; }',
  '.training-quality-export-actions',
  '.context-switcher-icon.has-image',
  '.profile-avatar-upload',
  '.profile-avatar-toast',
  '.avatar-crop-overlay',
  '.avatar-crop-viewport',
  '.avatar-crop-zoom',
  '.user-avatar > img',
  '.app-shell-v265 .page > .page-header',
  '.app-shell-v265 .main-nav a.active::before',
  '.app-shell-v265 .primary-button',
  '.app-shell-v265 .stat-card:hover',
  '.app-shell-v265 .empty-state',
  '.app-shell-v265 .client-table th',
  '.navigation-group.available',
  '.navigation-search',
  '@keyframes premium-page-enter'
]);
requireText('src/pages/SubscriptionPage.tsx', [
  "data.business_type === 'securite' && ['decouverte', 'essentielle'].includes(data.subscription.plan)",
  "data.business_type === 'formation' && ['decouverte', 'essentielle'].includes(data.subscription.plan)"
]);
requireText('src/pages/TrainingDashboardPage.tsx', [
  'training-quality-period-segmented',
  'training-quality-period-mobile',
  'training-quality-export-actions',
  '<h1>Bonjour, bienvenue sur {organization.name}</h1>'
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
requireText('src/pages/SubscriptionPage.tsx', [
  "functions.invoke('create-stripe-checkout'",
  "functions.invoke('create-stripe-portal'",
  'Rétrogradation programmée',
  'sans suppression des données',
  'Vos données sont conservées'
]);
requireText('src/pages/OnboardingPage.tsx', [
  'Créer et préparer le contrat',
  'Signer et passer au paiement',
  'L’espace restera verrouillé jusqu’à la confirmation du paiement'
]);
requireText('src/components/BillingAdminPanel.tsx', [
  "supabase.rpc('admin_update_stripe_catalog_item'",
  "supabase.rpc('admin_update_billing_settings_v2'",
  'Qonto hors abonnement'
]);
requireText('src/config/publicOfferCatalog.ts', [
  "key: 'formation'",
  "key: 'securite'",
  "key: 'nettoyage'",
  "key: 'restauration'",
  "key: 'coiffure'",
  'monthlyPriceCents: 14990',
  'monthlyPriceCents: 990'
]);
requireText('src/pages/PublicHomePage.tsx', [
  'public-home-v230',
  'public-home-v231',
  'public-home-v232',
  'public-flow-rail',
  'public-flow-top',
  'public-platform-card',
  'public-offer-business-tabs',
  'public-offer-catalog'
]);
requireText('src/pages/LoginPage.tsx', [
  "to=\"/mot-de-passe-oublie\"",
  "to=\"/demande-acces\"",
  "to=\"/espace-formation\"",
  "to=\"/espace-securite\"",
  "to=\"/espace-nettoyage\"",
  "to=\"/espace-client-coiffure\""
]);
requireText('src/pages/TrainingPortalAdminPage.tsx', [
  "supabase.rpc('prepare_training_portal_manual_link'",
  'shareManualInvitationLink'
]);
requireText('src/components/AdminNotificationCenter.tsx', [
  "from('platform_admin_notifications')",
  "supabase.rpc('mark_platform_admin_notifications_read'",
  "supabase!.rpc('queue_platform_admin_push_test'",
  'currentPushSubscription',
  'écran verrouillé',
  'setInterval'
]);
requireText('src/pages/PlatformAdminPage.tsx', [
  "get('section')",
  "get('notification')",
  "window.history.replaceState({}, '', '/administration-ncr')"
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
requireText('supabase/functions/admin-review-access-request/index.ts', [
  "eq('role', 'super_admin')",
  "type: 'magiclink'",
  'contact@ncr-suite.fr',
  '/activation?token_hash='
]);
requireText('supabase/functions/request-account-recovery/index.ts', [
  "type: 'recovery'",
  'platform_auth_email_events',
  'contact@ncr-suite.fr'
]);
requireText('index.html', [
  'https://ncr-suite.fr/',
  'application/ld+json',
  'SoftwareApplication'
]);
requireText('supabase/migrations/085_production_validation_security_correction.sql', [
  'create temporary table ncr_function_access_snapshot on commit drop',
  "has_function_privilege('authenticated',p.oid,'EXECUTE')",
  "has_function_privilege('service_role',p.oid,'EXECUTE')",
  'revoke execute on all functions in schema public from public,anon',
  "where authenticated_execute",
  "where service_execute",
  'get_training_portal_invitation',
  'submit_public_training_evaluation',
  'create or replace function public.platform_access_security_report',
  'platform_production_validation_report_v212',
  "'platform.production_validation_security_corrected'"
]);
requireText('supabase/migrations/086_security_definer_search_path_hardening.sql', [
  'create temporary table ncr_security_definer_path_snapshot on commit drop',
  'revoke create on schema public from public,anon,authenticated',
  "and p.prokind in ('f','p','w')",
  "where setting like 'search_path=%'",
  'alter procedure %s set search_path = pg_catalog, public, extensions, pg_temp',
  'alter function %s set search_path = pg_catalog, public, extensions, pg_temp',
  'platform.security_definer_search_path_hardened',
  "'migration','086'"
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
  "'migration','087'"
]);
requireText('src/components/AdminProductionValidationPanel.tsx', [
  "supabase.rpc('platform_production_validation_report'",
  "supabase.rpc('platform_production_validation_history'",
  'p_manual_checks',
  'Enregistrer ce contrôle',
  'Exporter l’historique'
]);
requireText('src/pages/SaasLaunchCenterPage.tsx', [
  "supabase.rpc('preview_training_recovery_import'",
  "'import_training_recovery_records'",
  'trainingRecoveryImportTypes',
  'downloadImportErrors'
]);
requireText('src/pages/TrainingPortalAdminPage.tsx', [
  "supabase.rpc('training_portal_admin_overview'",
  "supabase.rpc('create_training_portal_invitation'",
  "supabase.rpc('publish_training_portal_document'",
  "supabase.rpc('create_training_signature_request'"
]);
requireText('src/pages/TrainingPortalPage.tsx', [
  "supabase.rpc('current_training_portal_accounts'",
  "supabase.rpc('training_portal_dashboard'",
  "supabase.rpc('register_training_portal_document'",
  "supabase.rpc('complete_training_signature'",
  "crypto.subtle.digest('SHA-256'"
]);
requireText('src/pages/TrainingPortalInvitationPage.tsx', [
  "supabase.rpc('get_training_portal_invitation'",
  "supabase.rpc('accept_training_portal_invitation'"
]);
if (!app.includes('path="portails-formation"') || !app.includes('feature="training_portals_signatures"')) {
  failures.push('Le module Espaces & signatures V2.21.0 n’est pas protégé par le droit Formation attendu.');
}
requireText('src/components/TrainingModulesPanel.tsx', [
  "supabase.rpc('training_module_portal'",
  "supabase.rpc('request_training_module_change'",
  "supabase.rpc('cancel_training_module_request'",
  'MODULES FORMATION À LA CARTE',
  'upgradeWouldBeCheaper'
]);
requireText('src/pages/SubscriptionPage.tsx', [
  "data.business_type === 'formation'",
  '<TrainingModulesPanel />'
]);
requireText('src/components/BillingAdminPanel.tsx', [
  "supabase.rpc('admin_training_module_configuration')",
  "supabase.rpc('admin_list_training_module_requests'",
  "supabase.rpc('admin_review_training_module_request'",
  'MODULES FORMATION'
]);
requireText('src/components/AdminMonitoringPanel.tsx', [
  "supabase.rpc('platform_release_readiness_report')",
  '<AdminProductionValidationPanel />',
  'PRÉPARATION V2.20'
]);

requireText('supabase/functions/process-email-queue/index.ts', [
  "case 'security_client_portal_invitation'",
  "case 'cleaning_client_portal_invitation'",
  "case 'coiffure_client_portal_invitation'",
  '/client-securite/invitation/',
  'Votre portail client Sécurité est prêt',
  'Votre portail client Nettoyage est prêt',
  '/client-coiffure/invitation/',
  'Votre espace client Coiffure',
  "case 'training_portal_invitation'",
  "case 'training_signature_request'",
  '/formation/invitation/',
  '/espace-formation'
]);

if (failures.length) {
  console.error(`Parcours critiques NCR Suite : ${failures.length} échec(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Parcours critiques NCR Suite : validation statique réussie.');
