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
const expectedCache = `ncr-suite-shell-v${pkg.version}-final-stabilization`;
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
for (const number of ['054', '055', '056', '057', '058', '059', '060', '061', '062', '063', '064', '065', '066', '067', '068', '069', '070', '071', '072', '073', '074', '075', '076', '077', '078', '079', '080']) {
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
  'Brevo'
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
  expectedCache,
  'set search_path = public'
]);
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
  'Votre espace client Coiffure'
]);

if (failures.length) {
  console.error(`Parcours critiques NCR Suite : ${failures.length} échec(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Parcours critiques NCR Suite : validation statique réussie.');
