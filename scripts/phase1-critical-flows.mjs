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
const expectedCache = `ncr-suite-shell-v${pkg.version}-restaurant-premium`;
const coiffureCache = 'ncr-suite-shell-v2.12.3-coiffure-loyalty-portal';
const cleaningCache = 'ncr-suite-shell-v2.12.2-cleaning-client-portal';
if (!runtime.includes(`APP_VERSION = '${pkg.version}'`)) failures.push('La version frontend ne correspond pas à package.json.');
if (!runtime.includes(`PWA_CACHE_NAME = '${expectedCache}'`)) failures.push('Le cache runtime ne correspond pas à la release attendue.');
if (!runtime.includes('RUNTIME_HEARTBEAT_INTERVAL_MS')) failures.push('La surveillance runtime a été retirée par erreur.');
if (!sw.includes(`const CACHE = '${expectedCache}'`)) failures.push('Le Service Worker ne correspond pas à la release attendue.');

requireText('src/main.tsx', ['<RuntimeMonitor />', '<ConnectivityStatus />']);
requireText('src/components/AppErrorBoundary.tsx', ["source: 'react'", "severity: 'critical'", 'componentStack']);
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
  '/invitation/:token',
  '/client-securite/invitation/:token',
  '/espace-client-securite',
  '/client-nettoyage/invitation/:token',
  '/espace-client-nettoyage',
  '/client-coiffure/invitation/:token',
  '/espace-client-coiffure'
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
for (const number of ['054', '055', '056', '057', '058', '059', '060', '061', '062', '063', '064', '065', '066']) {
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
  expectedCache,
  'on conflict(singleton) do update set'
]);

requireText('supabase/functions/process-email-queue/index.ts', [
  "case 'security_client_portal_invitation'",
  "case 'cleaning_client_portal_invitation'",
  "case 'coiffure_client_portal_invitation'",
  '/client-securite/invitation/',
  'Votre portail client Sécurité est prêt',
  'Votre portail client Nettoyage est prêt',
  '/client-coiffure/invitation/',
  'Votre espace client Coiffure'
]);

if (failures.length) {
  console.error(`Parcours critiques NCR Suite : ${failures.length} échec(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Parcours critiques NCR Suite : validation statique réussie.');
