import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function walk(directory, extension, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, extension, output);
    else if (entry.name.endsWith(extension)) output.push(full);
  }
  return output;
}

const app = read('src/App.tsx');
for (const match of app.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\('([^']+)'\)/g)) {
  const [, exportName, importPath] = match;
  const relative = `${importPath.replace(/^\.\//, 'src/')}.tsx`;
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    errors.push(`Page chargée dynamiquement introuvable : ${relative}`);
    continue;
  }
  const page = fs.readFileSync(absolute, 'utf8');
  if (!new RegExp(`export\\s+(?:function|const)\\s+${exportName}\\b|export\\s+default`).test(page)) {
    errors.push(`Export ${exportName} introuvable dans ${relative}`);
  }
}

for (const file of walk(path.join(root, 'src'), '.ts').concat(walk(path.join(root, 'src'), '.tsx'))) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('.replaceAll(')) errors.push(`replaceAll incompatible ES2020 : ${path.relative(root, file)}`);
  if (/JSON\.parse\(\s*localStorage\.getItem/.test(source)) warnings.push(`Lecture localStorage directe : ${path.relative(root, file)}`);
}

// Les routes visibles dans un pack métier doivent être déclarées dans la matrice centrale.
const businessPacks = read('src/config/businessPacks.ts');
const accessMatrix = read('src/config/accessMatrix.ts');
const navigationPaths = new Set([...businessPacks.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1].split('?')[0]));
for (const routePath of navigationPaths) {
  if (!accessMatrix.includes(`'${routePath}'`)) errors.push(`Route absente de la matrice d'accès : ${routePath}`);
}

// Empêche qu'une fonction d'un domaine soit accidentellement incluse dans l'offre d'un autre domaine.
const offerCatalog = read('src/config/domainOfferCatalog.ts');
const domainSections = [
  ['coiffure', 'const coiffureDecouverte', 'const formationBase', ['training_', 'security_', 'cleaning_', 'restaurant_']],
  ['formation', 'const formationBase', 'const securityDecouverte', ['security_', 'cleaning_', 'restaurant_']],
  ['securite', 'const securityDecouverte', 'const cleaningDecouverte', ['training_', 'cleaning_', 'restaurant_']],
  ['nettoyage', 'const cleaningDecouverte', 'const restaurantDecouverte', ['training_', 'security_', 'restaurant_']],
  ['restauration', 'const restaurantDecouverte', 'export const DOMAIN_OFFER_CATALOG', ['training_', 'security_', 'cleaning_']]
];
for (const [domain, startMarker, endMarker, forbiddenPrefixes] of domainSections) {
  const start = offerCatalog.indexOf(startMarker);
  const end = offerCatalog.indexOf(endMarker, start + 1);
  if (start < 0 || end < 0) continue;
  const section = offerCatalog.slice(start, end);
  for (const prefix of forbiddenPrefixes) {
    if (section.includes(`'${prefix}`)) errors.push(`Fonction ${prefix}* trouvée dans les offres ${domain}.`);
  }
}

if (!/SecurityFeatureGate[\s\S]{0,350}security_agent_portal/.test(app)) {
  errors.push('L’espace agent Sécurité doit être protégé par SecurityFeatureGate.');
}
if (!/business_type === 'securite'[\s\S]{0,220}SecurityBillingPage/.test(app)) {
  errors.push('La facturation Sécurité doit être limitée au domaine Sécurité.');
}
if (!/SecurityFeatureGate[\s\S]{0,350}security_client_portal/.test(app)) {
  errors.push('Le Portail clients Sécurité doit être protégé par SecurityFeatureGate.');
}


// V2.13.2 — le rendu public Restauration doit rester isolé, personnalisable et multilingue.
const commercialBrandingPage = read('src/pages/CommercialBrandingPage.tsx');
if (!commercialBrandingPage.includes("business_type === 'restauration'") || !commercialBrandingPage.includes('<RestaurantCommercialBrandingPage />')) {
  errors.push('La personnalisation Restauration premium n’est pas raccordée à la page centrale.');
}
const restaurantPremiumMigration = read('supabase/migrations/065_restaurant_public_menu_premium.sql');
if (!restaurantPremiumMigration.includes("o.business_type = 'securite'") || !restaurantPremiumMigration.includes("organization_has_plan_feature(o.id, 'commercial_branding')")) {
  errors.push('La règle Storage V2.13.0 doit préserver les logos Sécurité et la personnalisation par fonctionnalité.');
}
const restaurantTranslationsMigration = read('supabase/migrations/066_restaurant_public_translations_complete.sql');
if (!restaurantTranslationsMigration.includes("ncr-suite-shell-v2.13.1-restaurant-premium") || !restaurantTranslationsMigration.includes('update_restaurant_public_menu_translations')) {
  errors.push('La migration V2.13.1 des traductions publiques Restauration est incomplète.');
}
const restaurantFinalizationMigration = read('supabase/migrations/067_restaurant_finalization_release.sql');
if (!restaurantFinalizationMigration.includes("ncr-suite-shell-v2.13.2-restaurant-premium") || !restaurantFinalizationMigration.includes("'2.13.2'")) {
  errors.push('La migration V2.13.2 de finalisation Restauration est incomplète.');
}
const restaurantFloorPlanPage = read('src/pages/RestaurantFloorPlanPage.tsx');
if (!restaurantFloorPlanPage.includes('RESTAURATION · PLAN DE SALLE') || restaurantFloorPlanPage.includes('RESTAURATION · V2.8.2')) {
  errors.push('Le plan de salle Restauration affiche encore un ancien numéro de version statique.');
}
const publicRestaurantMenuPage = read('src/pages/PublicRestaurantMenuPage.tsx');
if (!publicRestaurantMenuPage.includes('localeByLanguage') || !publicRestaurantMenuPage.includes('loadFailed')) {
  errors.push('Le menu public Restauration doit conserver la localisation des prix et des erreurs publiques.');
}

// V2.14.0 — le module commercial Formation doit rester isolé au métier et audité.
const trainingCommercialPage = read('src/pages/TrainingCommercialPage.tsx');
const trainingCommercialMigration = read('supabase/migrations/068_training_commercial_administration.sql');
if (!trainingCommercialPage.includes('CRM & COMMERCIAL') || !trainingCommercialPage.includes('generateTrainingCommercialPdf')) {
  errors.push('La page commerciale Formation V2.14.0 est incomplète.');
}
if (!trainingCommercialMigration.includes('create table if not exists public.training_commercial_documents') || !trainingCommercialMigration.includes("ncr-suite-shell-v2.14.0-training-commercial") || !trainingCommercialMigration.includes("'2.14.0'")) {
  errors.push('La migration V2.14.0 du commercial Formation est incomplète.');
}
if (!trainingCommercialMigration.includes("when 'training_commercial' then 'training_commercial'") || !trainingCommercialMigration.includes("organization_has_plan_feature(organization_id, 'training_commercial')")) {
  errors.push('Le commercial Formation doit rester protégé par l’offre et la configuration Métier.');
}
if (!trainingCommercialMigration.includes("not (o.plan = 'metier'") && !trainingCommercialMigration.includes("o.plan <> 'metier' or not coalesce(o.metier_modules_configured, false)")) {
  errors.push('La migration commerciale ne doit pas écraser une offre Métier déjà configurée à la carte.');
}
if (!trainingCommercialPage.includes("organizationHasFeature(organization, 'multi_site')") || !trainingCommercialPage.includes('readJsonStorage')) {
  errors.push('La page commerciale doit respecter le multi-site et le stockage résilient.');
}
if (!accessMatrix.includes("'/commercial'")) errors.push('La route commerciale Formation est absente de la matrice d’accès.');


// V2.14.1 — le dossier centralisé Formation doit rester moderne, isolé et protégé par l’offre.
const trainingDossiersPage = read('src/pages/TrainingDossiersPage.tsx');
const trainingDossiersMigration = read('supabase/migrations/069_training_session_dossier_workspace.sql');
if (!trainingDossiersPage.includes('Dossiers de formation') || !trainingDossiersPage.includes('training-workspace-premium') || !trainingDossiersPage.includes('generateSessionDossierPdf')) {
  errors.push('L’espace dossier Formation V2.14.1 est incomplet.');
}
if (!trainingDossiersPage.includes("organizationHasFeature(organization, 'training_session_dossier')") || !trainingDossiersMigration.includes("organization_has_plan_feature(p_organization_id, 'training_session_dossier')")) {
  errors.push('Le dossier Formation doit rester protégé côté interface et côté base.');
}
if (!trainingDossiersMigration.includes('update_training_session_dossier_settings') || !trainingDossiersMigration.includes("ncr-suite-shell-v2.14.1-training-dossiers") || !trainingDossiersMigration.includes("'2.14.1'")) {
  errors.push('La migration V2.14.1 du dossier Formation est incomplète.');
}
if (!accessMatrix.includes("'/dossiers-formation'")) errors.push('La route des dossiers Formation est absente de la matrice d’accès.');


// V2.15.0 — parcours Formation unifié, profil unique et modèles de formation complets.
const trainingProgramsV215 = read('src/pages/TrainingProgramsPage.tsx');
const trainingProfileV215 = read('src/pages/TrainingOrganizationProfilePage.tsx');
const trainingWorkflowV215 = read('src/pages/TrainingWorkflowPage.tsx');
const trainingWorkflowMigration = read('supabase/migrations/070_training_unified_workflow.sql');
if (!trainingProgramsV215.includes('Formations complètes') || !trainingProgramsV215.includes('training_program_trainers')) {
  errors.push('Le catalogue maître Formation V2.15.0 est incomplet.');
}
if (!trainingProfileV215.includes('update_training_organization_profile') || !trainingProfileV215.includes('Adresse de réponse pour les documents signés')) {
  errors.push('Le profil unique de l’organisme Formation V2.15.0 est incomplet.');
}
if (!trainingWorkflowV215.includes('create_training_session_from_commercial') || !trainingWorkflowV215.includes('validate_training_session_workflow')) {
  errors.push('Le cockpit unifié Formation V2.15.0 est incomplet.');
}
if (!trainingWorkflowMigration.includes('training_program_trainers') || !trainingWorkflowMigration.includes("ncr-suite-shell-v2.15.0-training-workflow") || !trainingWorkflowMigration.includes("'2.15.0'")) {
  errors.push('La migration V2.15.0 du parcours Formation est incomplète.');
}
if (!accessMatrix.includes("'/parcours-formation'") || !accessMatrix.includes("'/profil-organisme'")) {
  errors.push('Les routes V2.15.0 Formation sont absentes de la matrice d’accès.');
}

// V2.15.1 — identité documentaire premium et envois Brevo commerciaux.
const trainingPremiumPdf = read('src/features/training/premiumPdf.ts');
const trainingProgramPdf = read('src/features/training/programPdf.ts');
const trainingPremiumMigration = read('supabase/migrations/071_training_premium_documents_brevo.sql');
const trainingEmailProcessor = read('supabase/functions/process-email-queue/index.ts');
if (!trainingPremiumPdf.includes('drawTrainingPremiumHeader') || !trainingPremiumPdf.includes('training_signature_url') || !trainingPremiumPdf.includes('training_stamp_url')) {
  errors.push('Le moteur documentaire premium Formation V2.15.1 est incomplet.');
}
if (!trainingProgramPdf.includes('generateTrainingProgramPdf') || !trainingProgramsV215.includes('Programme PDF')) {
  errors.push('Le programme PDF premium n’est pas raccordé à la fiche formation.');
}
if (!trainingCommercialPage.includes('queue_training_commercial_document_email') || !trainingCommercialPage.includes("storage.from('training-documents')")) {
  errors.push('L’envoi Brevo des documents commerciaux Formation n’est pas raccordé.');
}
if (!trainingProfileV215.includes('update_training_document_branding') || !trainingProfileV215.includes('Signature du représentant') || !trainingProfileV215.includes('Cachet de l’organisme')) {
  errors.push('Le profil organisme doit permettre de configurer signature et cachet.');
}
if (!trainingPremiumMigration.includes('queue_training_commercial_document_email') || !trainingPremiumMigration.includes('update_training_document_branding') || !trainingPremiumMigration.includes("ncr-suite-shell-v2.15.1-training-documents") || !trainingPremiumMigration.includes("'2.15.1'")) {
  errors.push('La migration V2.15.1 des documents premium et de Brevo est incomplète.');
}
if (!trainingEmailProcessor.includes("case 'training_commercial_document'") || !trainingEmailProcessor.includes("item.template_key === 'training_commercial_document'") || !trainingEmailProcessor.includes('Convocation à une formation')) {
  errors.push('Le processeur Brevo V2.15.1 ne couvre pas tous les documents Formation attendus.');
}

// V2.15.2 — évaluations début/fin, relances, attestations et clôture automatisée.
const trainingEvaluationsV2152 = read('src/pages/TrainingEvaluationsPage.tsx');
const publicTrainingEvaluationV2152 = read('src/pages/PublicTrainingSatisfactionPage.tsx');
const trainingClosureMigration = read('supabase/migrations/073_training_delivery_closure_automation.sql');
if (!trainingEvaluationsV2152.includes('Évaluations début & fin') || !trainingEvaluationsV2152.includes('queue_training_session_evaluation') || !trainingEvaluationsV2152.includes('training_evaluation_summary')) {
  errors.push('Le centre d’évaluations Formation V2.15.2 est incomplet.');
}
if (!publicTrainingEvaluationV2152.includes('submit_public_training_evaluation') || !publicTrainingEvaluationV2152.includes("evaluation_type === 'initial'")) {
  errors.push('Le questionnaire public V2.15.2 ne couvre pas les évaluations initiales et finales.');
}
if (!trainingWorkflowV215.includes('finishSession') || !trainingDossiersPage.includes('Clôture automatisée en cours')) {
  errors.push('Le cockpit et le dossier Formation ne sont pas raccordés à la clôture automatisée.');
}
if (!trainingClosureMigration.includes('queue_due_training_evaluation_reminders') || !trainingClosureMigration.includes('launch_training_session_closure_automation') || !trainingClosureMigration.includes("ncr-suite-shell-v2.15.2-training-closure") || !trainingClosureMigration.includes("'2.15.2'")) {
  errors.push('La migration V2.15.2 de clôture automatisée est incomplète.');
}
if (!trainingEmailProcessor.includes('queue_due_training_evaluation_reminders') || !trainingEmailProcessor.includes('FINAL_EVALUATION_REQUIRED') || !trainingEmailProcessor.includes("evaluation_type', 'final'")) {
  errors.push('Le processeur Brevo V2.15.2 ne couvre pas les relances et les attestations conditionnelles.');
}

// V2.15.3 — intégrité des automatisations Formation et dépôt autoportant.
const trainingSessionsV2153 = read('src/pages/TrainingSessionsPage.tsx');
const trainingIntegrityMigration = read('supabase/migrations/074_training_automation_integrity.sql');
if (!trainingIntegrityMigration.includes('create table if not exists public.training_document_jobs')
    || !trainingIntegrityMigration.includes('create unique index if not exists uq_training_documents_automation_key')
    || !trainingIntegrityMigration.includes('create or replace function public.claim_training_document_jobs')
    || !trainingIntegrityMigration.includes('create or replace function public.training_document_job_payload')
    || !trainingIntegrityMigration.includes('create or replace function public.guard_training_session_validation')
    || !trainingIntegrityMigration.includes('create or replace function public.training_automation_integrity_report')
    || !trainingIntegrityMigration.includes("ncr-suite-shell-v2.15.3-training-automation-integrity")
    || !trainingIntegrityMigration.includes("'2.15.3'")) {
  errors.push('La migration V2.15.3 d’intégrité des automatisations Formation est incomplète.');
}
if (!trainingSessionsV2153.includes("status: 'draft' as TrainingSessionStatus")
    || !trainingSessionsV2153.includes('p_status: creationStatus')
    || !trainingSessionsV2153.includes("supabase.rpc('validate_training_session_workflow'")
    || !trainingSessionsV2153.includes('p_send_convocations: true')
    || !trainingSessionsV2153.includes('evaluation_type,status,scheduled_for')) {
  errors.push('La page Sessions Formation doit passer par la validation officielle et lire les champs d’évaluation V2.15.2.');
}
if (!trainingEmailProcessor.includes('NCR Suite V2.18.0')) {
  errors.push('Le processeur documentaire Formation doit annoncer NCR Suite V2.18.0.');
}

// V2.15.4 — SAV Formation réservé au super administrateur NCR.
const trainingSavMigration = read('supabase/migrations/075_admin_training_sav_supervision.sql');
const trainingSavPanel = read('src/components/AdminTrainingSavPanel.tsx');
const platformAdminPage = read('src/pages/PlatformAdminPage.tsx');
if (!trainingSavMigration.includes('create or replace function public.admin_training_sav_overview')
    || !trainingSavMigration.includes('create or replace function public.admin_training_sav_organization_report')
    || !trainingSavMigration.includes('create or replace function public.admin_training_sav_retry_document_job')
    || !trainingSavMigration.includes('create or replace function public.admin_training_sav_retry_training_emails')
    || !trainingSavMigration.includes('create or replace function public.admin_training_sav_repair_session')
    || !trainingSavMigration.includes('public.is_platform_super_admin()')
    || !trainingSavMigration.includes("ncr-suite-shell-v2.15.4-training-sav-admin")
    || !trainingSavMigration.includes("'2.15.4'")) {
  errors.push('La migration V2.15.4 du SAV Formation super-admin est incomplète.');
}
if (!trainingSavPanel.includes("supabase.rpc('admin_training_sav_overview'")
    || !trainingSavPanel.includes("supabase.rpc('admin_training_sav_organization_report'")
    || !trainingSavPanel.includes("supabase.rpc('admin_training_sav_repair_session'")
    || !trainingSavPanel.includes("supabase.rpc('admin_training_sav_retry_document_job'")
    || !trainingSavPanel.includes("supabase.rpc('admin_training_sav_retry_training_emails'")
    || !trainingSavPanel.includes('SAV FORMATION')) {
  errors.push('Le panneau SAV Formation super-admin est incomplet.');
}
if (!platformAdminPage.includes('AdminTrainingSavPanel')
    || !platformAdminPage.includes("activeSection === 'trainingSav'")
    || !platformAdminPage.includes('SAV Formation')) {
  errors.push('Le SAV Formation doit rester raccordé à l’administration centrale.');
}

// V2.16.0 — CRM Formation, pipeline, relances et liaison avec les devis.
const trainingCrmMigration = read('supabase/migrations/076_training_crm_pipeline.sql');
const trainingCrmPipeline = read('src/components/TrainingCrmPipeline.tsx');
if (!trainingCrmMigration.includes('create table if not exists public.training_crm_opportunities')
    || !trainingCrmMigration.includes('create table if not exists public.training_crm_activities')
    || !trainingCrmMigration.includes('create or replace function public.move_training_crm_opportunity')
    || !trainingCrmMigration.includes('create or replace function public.convert_training_crm_opportunity_to_customer')
    || !trainingCrmMigration.includes('create or replace function public.set_training_crm_activity_completed')
    || !trainingCrmMigration.includes('create or replace function public.sync_training_crm_from_commercial_document')
    || !trainingCrmMigration.includes('alter table public.training_crm_opportunities enable row level security')
    || !trainingCrmMigration.includes('alter table public.training_crm_activities enable row level security')
    || !trainingCrmMigration.includes("ncr-suite-shell-v2.16.0-training-crm-pipeline")
    || !trainingCrmMigration.includes("'2.16.0'")) {
  errors.push('La migration V2.16.0 du CRM Formation est incomplète.');
}
if (!trainingCrmPipeline.includes("from('training_crm_opportunities')")
    || !trainingCrmPipeline.includes("from('training_crm_activities')")
    || !trainingCrmPipeline.includes("supabase.rpc('move_training_crm_opportunity'")
    || !trainingCrmPipeline.includes("supabase.rpc('convert_training_crm_opportunity_to_customer'")
    || !trainingCrmPipeline.includes("supabase.rpc('set_training_crm_activity_completed'")
    || !trainingCrmPipeline.includes('Prochaines actions')
    || !trainingCrmPipeline.includes('Préparer le devis')) {
  errors.push('Le pipeline CRM Formation V2.16.0 est incomplet.');
}
if (!trainingCommercialPage.includes('<TrainingCrmPipeline')
    || !trainingCommercialPage.includes('createDocumentFromOpportunity')
    || !trainingCommercialPage.includes('opportunity_id')
    || !trainingCommercialPage.includes('Pipeline CRM')) {
  errors.push('Le CRM doit rester intégré au module commercial Formation.');
}

// V2.17.0 — préparation automatique du BPF Formation.
const trainingBpfMigration = read('supabase/migrations/077_training_bpf_automation.sql');
const trainingBpfPage = read('src/pages/TrainingBpfPage.tsx');
const trainingBpfLogic = read('src/features/training/bpf.ts');
const trainingBpfPdf = read('src/features/training/bpfPdf.ts');
if (!trainingBpfMigration.includes('create table if not exists public.training_bpf_reports')
    || !trainingBpfMigration.includes('create or replace function public.training_bpf_participant_rows')
    || !trainingBpfMigration.includes('create or replace function public.refresh_training_bpf_report')
    || !trainingBpfMigration.includes('create or replace function public.set_training_bpf_report_status')
    || !trainingBpfMigration.includes('create or replace function public.reopen_training_bpf_report')
    || !trainingBpfMigration.includes('alter table public.training_bpf_reports enable row level security')
    || !trainingBpfMigration.includes("ncr-suite-shell-v2.17.0-training-bpf-automation")
    || !trainingBpfMigration.includes("'2.17.0'")) {
  errors.push('La migration V2.17.0 du BPF Formation est incomplète.');
}
if (!trainingBpfPage.includes("supabase.rpc('refresh_training_bpf_report'")
    || !trainingBpfPage.includes("supabase.rpc('set_training_bpf_report_status'")
    || !trainingBpfPage.includes('generateTrainingBpfPdf')
    || !trainingBpfPage.includes('generateTrainingBpfCsv')
    || !trainingBpfPage.includes('CADRE F1')
    || !trainingBpfPage.includes('Verrouiller le BPF')) {
  errors.push('La page BPF Formation V2.17.0 est incomplète.');
}
if (!trainingBpfPdf.includes('NCR Suite V2.18.0')
    || !trainingBpfPdf.includes('Cerfa 10443*17')
    || !trainingBpfPdf.includes('Document préparatoire')) {
  errors.push('L’export PDF préparatoire du BPF V2.17.0 est incomplet.');
}
if (trainingBpfMigration.includes("v_funder_type = 'opco' then 'skills_plan'")
    || trainingBpfLogic.includes("funderType === 'opco'")) {
  errors.push('Un financement OPCO ambigu ne doit pas être classé automatiquement dans le BPF.');
}

// V2.18.0 — facturation, encaissements et relances Formation.
const trainingBillingMigration = read('supabase/migrations/078_training_billing_collections.sql');
const trainingBillingPage = read('src/pages/TrainingBillingPage.tsx');
const trainingInvoicePdf = read('src/features/training/invoicePdf.ts');
if (!trainingBillingMigration.includes('create table if not exists public.training_invoices')
    || !trainingBillingMigration.includes('create table if not exists public.training_invoice_payments')
    || !trainingBillingMigration.includes('create or replace function public.issue_training_invoice')
    || !trainingBillingMigration.includes('create or replace function public.record_training_invoice_payment')
    || !trainingBillingMigration.includes('create or replace function public.queue_due_training_invoice_reminders')
    || !trainingBillingMigration.includes('refresh_training_bpf_report_commercial_legacy')
    || !trainingBillingMigration.includes('alter table public.training_invoices enable row level security')
    || !trainingBillingMigration.includes("ncr-suite-shell-v2.18.0-training-billing-collections")
    || !trainingBillingMigration.includes("'2.18.0'")) {
  errors.push('La migration V2.18.0 de facturation Formation est incomplète.');
}
if (!trainingBillingPage.includes("supabase.rpc('create_training_invoice'")
    || !trainingBillingPage.includes("supabase.rpc('issue_training_invoice'")
    || !trainingBillingPage.includes("supabase.rpc('record_training_invoice_payment'")
    || !trainingBillingPage.includes("supabase.rpc('queue_training_invoice_email'")
    || !trainingBillingPage.includes('Facturation et encaissements')) {
  errors.push('La page de facturation Formation V2.18.0 est incomplète.');
}
if (!trainingInvoicePdf.includes('NCR Suite V2.18.0')
    || !trainingInvoicePdf.includes('Indemnite forfaitaire pour frais de recouvrement')
    || !trainingInvoicePdf.includes('BROUILLON')) {
  errors.push('Le PDF de facturation Formation V2.18.0 est incomplet.');
}
if (!trainingEmailProcessor.includes("case 'training_invoice'")
    || !trainingEmailProcessor.includes('queue_due_training_invoice_reminders')) {
  errors.push('Les e-mails et relances de facturation Formation V2.18.0 sont incomplets.');
}

// V2.19.0 — dossier Qualiopi, conformité, preuves et audits Formation.
const trainingQualityMigration = read('supabase/migrations/079_training_quality_compliance.sql');
const trainingQualityPage = read('src/pages/TrainingQualityCompliancePage.tsx');
const trainingQualityLogic = read('src/features/training/qualityCompliance.ts');
const trainingQualityPdf = read('src/features/training/qualityCompliancePdf.ts');
if (!trainingQualityMigration.includes('create table if not exists public.training_quality_controls')
    || !trainingQualityMigration.includes('create table if not exists public.training_quality_evidence')
    || !trainingQualityMigration.includes('create table if not exists public.training_quality_audits')
    || !trainingQualityMigration.includes('create or replace function public.initialize_training_quality_framework')
    || !trainingQualityMigration.includes('create or replace function public.sync_training_quality_automatic_evidence')
    || !trainingQualityMigration.includes('create or replace function public.update_training_quality_control')
    || !trainingQualityMigration.includes('create or replace function public.add_training_quality_evidence')
    || !trainingQualityMigration.includes('alter table public.training_quality_controls enable row level security')
    || !trainingQualityMigration.includes("ncr-suite-shell-v2.19.0-training-quality-compliance")
    || !trainingQualityMigration.includes("'2.19.0'")) {
  errors.push('La migration V2.19.0 Qualiopi et conformité est incomplète.');
}
if (!trainingQualityPage.includes("supabase.rpc('initialize_training_quality_framework'")
    || !trainingQualityPage.includes("supabase.rpc('sync_training_quality_automatic_evidence'")
    || !trainingQualityPage.includes("supabase.rpc('update_training_quality_control'")
    || !trainingQualityPage.includes("supabase.rpc('add_training_quality_evidence'")
    || !trainingQualityPage.includes("supabase.rpc('create_training_quality_audit'")
    || !trainingQualityPage.includes('Qualiopi & conformité')) {
  errors.push('La page Qualiopi et conformité V2.19.0 est incomplète.');
}
if (!trainingQualityLogic.includes('trainingQualityIndicatorSeeds')
    || !trainingQualityLogic.includes('[7, 32')
    || !trainingQualityPdf.includes('NCR Suite V2.19.0')
    || !trainingQualityPdf.includes('Dossier de préparation qualité')) {
  errors.push('Le référentiel ou l’export qualité V2.19.0 est incomplet.');
}
if (!accessMatrix.includes("'/qualite-formation'")) {
  errors.push('La route Qualiopi Formation est absente de la matrice d’accès.');
}

// V2.20.0 — stabilisation multi-métiers et modules Formation à la carte.
const finalStabilizationMigration = read('supabase/migrations/080_final_stabilization_training_modules.sql');
const trainingModulesPanel = read('src/components/TrainingModulesPanel.tsx');
const billingAdminPanel = read('src/components/BillingAdminPanel.tsx');
const adminMonitoringPanel = read('src/components/AdminMonitoringPanel.tsx');
const subscriptionPage = read('src/pages/SubscriptionPage.tsx');
const planEntitlements = read('src/config/planEntitlements.ts');
const moduleAccess = read('src/config/moduleAccess.ts');
if (!finalStabilizationMigration.includes('create table if not exists public.training_module_catalog')
    || !finalStabilizationMigration.includes('create table if not exists public.organization_training_modules')
    || !finalStabilizationMigration.includes('create table if not exists public.training_module_change_requests')
    || !finalStabilizationMigration.includes('create or replace function public.training_module_portal')
    || !finalStabilizationMigration.includes('create or replace function public.request_training_module_change')
    || !finalStabilizationMigration.includes('create or replace function public.admin_review_training_module_request')
    || !finalStabilizationMigration.includes('create or replace function public.platform_release_readiness_report')
    || !finalStabilizationMigration.includes("ncr-suite-shell-v2.20.0-final-stabilization")
    || !finalStabilizationMigration.includes("'2.20.0'")) {
  errors.push('La migration V2.20.0 de stabilisation et des modules Formation est incomplète.');
}
if (!trainingModulesPanel.includes("supabase.rpc('training_module_portal'")
    || !trainingModulesPanel.includes("supabase.rpc('request_training_module_change'")
    || !trainingModulesPanel.includes('upgradeWouldBeCheaper')
    || !subscriptionPage.includes('<TrainingModulesPanel />')) {
  errors.push('La sélection et la comparaison tarifaire des modules Formation V2.20.0 sont incomplètes.');
}
if (!billingAdminPanel.includes("supabase.rpc('admin_training_module_configuration')")
    || !billingAdminPanel.includes("supabase.rpc('admin_review_training_module_request'")
    || !adminMonitoringPanel.includes("supabase.rpc('platform_release_readiness_report')")) {
  errors.push('La supervision administrateur V2.20.0 est incomplète.');
}
if (!planEntitlements.includes("training_digital_attendance: 'training_digital_attendance'")
    || !planEntitlements.includes("training_session_dossier: 'training_session_dossier'")
    || !moduleAccess.includes("'/dossiers-formation': 'training_session_dossier'")) {
  errors.push('Les droits distincts des modules Formation V2.20.0 sont incomplets.');
}

// V2.20.1 — modules Formation verrouilles visibles et montee en gamme ciblee.
const trainingLockedNavigationMigration = read('supabase/migrations/081_training_locked_module_navigation.sql');
const trainingFeatureGate = read('src/components/TrainingFeatureGate.tsx');
const appShell = read('src/components/AppShell.tsx');
if (!trainingLockedNavigationMigration.includes("'2.20.1'")
    || !trainingLockedNavigationMigration.includes('ncr-suite-shell-v2.20.1-training-locked-navigation')
    || !trainingLockedNavigationMigration.includes('platform_release_state')) {
  errors.push('La migration de synchronisation V2.20.1 est incomplète.');
}
if (!moduleAccess.includes('FORMATION_UPSELL_PATHS')
    || !moduleAccess.includes('formationPathIsLocked')
    || !moduleAccess.includes('formationRequiredPlanForPath')
    || !appShell.includes('formationPathIsLocked')
    || !appShell.includes('formationRequiredPlanForPath')) {
  errors.push('La navigation sous cadenas des modules Formation V2.20.1 est incomplète.');
}
if (!trainingFeatureGate.includes('organizationHasFeature')
    || !trainingFeatureGate.includes('#training-modules')
    || !trainingFeatureGate.includes('Voir ce module dans mon abonnement')
    || !trainingModulesPanel.includes('id="training-modules"')
    || !trainingModulesPanel.includes('requestedFeature')) {
  errors.push('La montée en gamme ciblée des modules Formation V2.20.1 est incomplète.');
}

// V2.21.0 — espaces externes Formation, dépôt ciblé et preuves de signature.
const trainingPortalsMigration = read('supabase/migrations/082_training_portals_signatures.sql');
const trainingPortalAdminPage = read('src/pages/TrainingPortalAdminPage.tsx');
const trainingPortalPage = read('src/pages/TrainingPortalPage.tsx');
const trainingPortalInvitationPage = read('src/pages/TrainingPortalInvitationPage.tsx');
if (!trainingPortalsMigration.includes('create table if not exists public.training_portal_accounts')
    || !trainingPortalsMigration.includes('create table if not exists public.training_signature_events')
    || !trainingPortalsMigration.includes('create or replace function public.complete_training_signature')
    || !trainingPortalsMigration.includes('can_upload_training_portal_document_asset')
    || !trainingPortalsMigration.includes('training_portals_signatures_addon')
    || !trainingPortalsMigration.includes('ncr-suite-shell-v2.21.0-training-portals-signatures')
    || !trainingPortalsMigration.includes("'2.21.0'")) {
  errors.push('La migration V2.21.0 des espaces et signatures Formation est incomplète.');
}
if (!trainingPortalAdminPage.includes('training_portal_admin_overview')
    || !trainingPortalAdminPage.includes('publish_training_portal_document')
    || !trainingPortalPage.includes('register_training_portal_document')
    || !trainingPortalPage.includes('complete_training_signature')
    || !trainingPortalInvitationPage.includes('accept_training_portal_invitation')) {
  errors.push('Les parcours V2.21.0 des espaces Formation sont incomplets.');
}
if (!moduleAccess.includes("'/portails-formation': 'training_portals_signatures'")
    || !accessMatrix.includes("'/portails-formation'")
    || !app.includes('feature="training_portals_signatures"')
    || !businessPacks.includes("path: '/portails-formation'")) {
  errors.push('Le droit à la carte et la navigation V2.21.0 sont incomplets.');
}

// V2.21.1 — reprise de donnees Formation controlee avant ecriture.
const trainingRecoveryMigration = read('supabase/migrations/083_training_data_recovery.sql');
const launchCenterPage = read('src/pages/SaasLaunchCenterPage.tsx');
if (!trainingRecoveryMigration.includes('create or replace function public.preview_training_recovery_import')
    || !trainingRecoveryMigration.includes('create or replace function public.import_training_recovery_records')
    || !trainingRecoveryMigration.includes("'training_customers'")
    || !trainingRecoveryMigration.includes("'training_funders'")
    || !trainingRecoveryMigration.includes("'training_opportunities'")
    || !trainingRecoveryMigration.includes("'training_sessions'")
    || !trainingRecoveryMigration.includes("'training_enrollments'")
    || !trainingRecoveryMigration.includes("set_config('ncr.allow_training_history_import','1',true)")
    || !trainingRecoveryMigration.includes('delete from public.notification_events')
    || !trainingRecoveryMigration.includes('ncr-suite-shell-v2.21.1-training-data-recovery')
    || !trainingRecoveryMigration.includes("'2.21.1'")) {
  errors.push('La migration V2.21.1 de reprise Formation est incomplète.');
}
if (!launchCenterPage.includes("supabase.rpc('preview_training_recovery_import'")
    || !launchCenterPage.includes("'import_training_recovery_records'")
    || !launchCenterPage.includes('trainingRecoveryImportTypes')
    || !launchCenterPage.includes('downloadImportErrors')) {
  errors.push('Le parcours V2.21.1 de contrôle et reprise Formation est incomplet.');
}

// V2.21.2 - validation production finale reservee au super administrateur.
const productionValidationMigration = read('supabase/migrations/084_final_production_validation.sql');
const productionValidationPanel = read('src/components/AdminProductionValidationPanel.tsx');
const productionAdminMonitoringPanel = read('src/components/AdminMonitoringPanel.tsx');
if (!productionValidationMigration.includes('create table if not exists public.platform_production_validation_runs')
    || !productionValidationMigration.includes('create or replace function public.platform_production_validation_report')
    || !productionValidationMigration.includes('create or replace function public.platform_production_validation_history')
    || !productionValidationMigration.includes('public.is_platform_super_admin()')
    || !productionValidationMigration.includes("'training_documents'")
    || !productionValidationMigration.includes("'training_imports'")
    || !productionValidationMigration.includes("'training_signatures'")
    || !productionValidationMigration.includes("'manual_validation'")
    || !productionValidationMigration.includes('ncr-suite-shell-v2.21.2-final-production-validation')
    || !productionValidationMigration.includes("'2.21.2'")) {
  errors.push('La migration V2.21.2 de validation production finale est incomplète.');
}
if (!productionValidationPanel.includes("supabase.rpc('platform_production_validation_report'")
    || !productionValidationPanel.includes("supabase.rpc('platform_production_validation_history'")
    || !productionValidationPanel.includes('p_manual_checks')
    || !productionValidationPanel.includes('Enregistrer ce contrôle')
    || !productionValidationPanel.includes('Exporter l’historique')
    || !productionAdminMonitoringPanel.includes("profile?.role === 'super_admin'")
    || !productionAdminMonitoringPanel.includes('<AdminProductionValidationPanel />')) {
  errors.push('La console V2.21.2 de validation production finale est incomplète ou mal protégée.');
}

// Correctif V2.21.2 - permissions anonymes et verdict des modules Formation.
const productionValidationCorrection = read('supabase/migrations/085_production_validation_security_correction.sql');
if (!productionValidationCorrection.includes('create temporary table ncr_function_access_snapshot on commit drop')
    || !productionValidationCorrection.includes("has_function_privilege('authenticated',p.oid,'EXECUTE')")
    || !productionValidationCorrection.includes("has_function_privilege('service_role',p.oid,'EXECUTE')")
    || !productionValidationCorrection.includes('revoke execute on all functions in schema public from public,anon')
    || !productionValidationCorrection.includes('where authenticated_execute')
    || !productionValidationCorrection.includes('where service_execute')
    || !productionValidationCorrection.includes('alter default privileges in schema public revoke execute on functions from public')
    || !productionValidationCorrection.includes('create or replace function public.platform_access_security_report')
    || !productionValidationCorrection.includes('platform_production_validation_report_v212')
    || !productionValidationCorrection.includes("'platform.production_validation_security_corrected'")
    || !productionValidationCorrection.includes("'migration','085'")) {
  errors.push('Le correctif V2.21.2 des permissions anonymes et du verdict Formation est incomplet.');
}
if (productionValidationMigration.includes("coalesce((v_readiness->>'ready')::boolean,false)=false")) {
  errors.push('Le rapport V2.21.2 ne doit plus transformer une autre anomalie V2.20 en demande de module Formation.');
}

// Correctif final V2.21.2 - search_path des fonctions historiques.
const securityDefinerPathCorrection = read('supabase/migrations/086_security_definer_search_path_hardening.sql');
if (!securityDefinerPathCorrection.includes('create temporary table ncr_security_definer_path_snapshot on commit drop')
    || !securityDefinerPathCorrection.includes('revoke create on schema public from public,anon,authenticated')
    || !securityDefinerPathCorrection.includes("and p.prokind in ('f','p','w')")
    || !securityDefinerPathCorrection.includes("where setting like 'search_path=%'")
    || !securityDefinerPathCorrection.includes('alter procedure %s set search_path = pg_catalog, public, extensions, pg_temp')
    || !securityDefinerPathCorrection.includes('alter function %s set search_path = pg_catalog, public, extensions, pg_temp')
    || !securityDefinerPathCorrection.includes('platform.security_definer_search_path_hardened')
    || !securityDefinerPathCorrection.includes("'migration','086'")) {
  errors.push('Le correctif final V2.21.2 du search_path des fonctions historiques est incomplet.');
}

// Correctif final V2.21.2 - extensions publiques et tables fermees par RLS.
const finalPublicAclCorrection = read('supabase/migrations/087_final_public_function_acl_cleanup.sql');
if (!finalPublicAclCorrection.includes('create or replace function public.platform_access_security_report')
    || !finalPublicAclCorrection.includes("d.classid='pg_proc'::regclass")
    || !finalPublicAclCorrection.includes("d.refclassid='pg_extension'::regclass")
    || !finalPublicAclCorrection.includes("d.deptype='e'")
    || !finalPublicAclCorrection.includes("'extension_public_functions',v_extension_functions")
    || !finalPublicAclCorrection.includes("'policyless',0")
    || !finalPublicAclCorrection.includes("'sealed_by_rls_tables',v_sealed_tables")
    || !finalPublicAclCorrection.includes('fonction(s) applicative(s) reste(nt) accessible(s) au role anon.')
    || !finalPublicAclCorrection.includes('platform.extension_access_classification_corrected')
    || !finalPublicAclCorrection.includes("'extension_objects','inventoried_not_modified'")
    || !finalPublicAclCorrection.includes("'migration','087'")) {
  errors.push('Le correctif final V2.21.2 de classification des extensions et des tables RLS fermees est incomplet.');
}
if (finalPublicAclCorrection.includes('set local role supabase_admin')
    || finalPublicAclCorrection.includes('owner to postgres')
    || finalPublicAclCorrection.includes('revoke execute on all functions in schema public')) {
  errors.push('Le correctif final V2.21.2 ne doit modifier aucun objet ou role gere par Supabase.');
}

// V2.22.0 - lancement commercial, acces controles et e-mails de marque.
const commercialLaunchMigration = read('supabase/migrations/088_commercial_launch_controlled_access.sql');
const publicHomePage = read('src/pages/PublicHomePage.tsx');
const accessRequestPage = read('src/pages/AccessRequestPage.tsx');
const adminAccessRequestsPanel = read('src/components/AdminAccessRequestsPanel.tsx');
const adminAccessFunction = read('supabase/functions/admin-review-access-request/index.ts');
const recoveryFunction = read('supabase/functions/request-account-recovery/index.ts');
if (!commercialLaunchMigration.includes('create table if not exists public.platform_access_requests')
    || !commercialLaunchMigration.includes('create table if not exists public.platform_auth_email_events')
    || !commercialLaunchMigration.includes('platform_access_requests_admin_read')
    || !commercialLaunchMigration.includes("'2.22.0'")
    || !commercialLaunchMigration.includes('ncr-suite-shell-v2.22.0-commercial-launch')) {
  errors.push('La migration V2.22.0 de lancement commercial est incomplete.');
}
if (!publicHomePage.includes('<PublicSiteHeader />')
    || !publicHomePage.includes('Demander un accès')
    || !accessRequestPage.includes("functions.invoke('request-platform-access'")
    || !adminAccessRequestsPanel.includes("functions.invoke('admin-review-access-request'")) {
  errors.push('Le parcours V2.22.0 de presentation et de validation des acces est incomplet.');
}
if (!adminAccessFunction.includes("eq('role', 'super_admin')")
    || !adminAccessFunction.includes("type: 'magiclink'")
    || !adminAccessFunction.includes('contact@ncr-suite.fr')
    || !recoveryFunction.includes("type: 'recovery'")
    || !recoveryFunction.includes('contact@ncr-suite.fr')) {
  errors.push('Les e-mails de compte V2.22.0 ne sont pas correctement proteges ou marques.');
}

// V2.22.1 - socle visuel premium, catalogue interactif et identite haute definition.
const publicHeader = read('src/components/PublicSiteHeader.tsx');
const publicFooter = read('src/components/PublicSiteFooter.tsx');
const runtimeConfig = read('src/config/runtime.ts');
const serviceWorker = read('public/sw.js');
if (!publicHomePage.includes('public-hero-canvas')
    || !publicHomePage.includes('public-business-showcase')
    || !publicHomePage.includes('/og/ncr-suite-og-v2221.webp')
    || !publicHeader.includes('/brand/ncr-suite-logo-header-v2221.png')
    || !publicFooter.includes('public-footer-brand')) {
  errors.push('La vitrine premium V2.22.1 ou son identite officielle est incomplete.');
}

// V2.22.2 - interactions premium, lancement PWA sur connexion et recuperation des modules.
const publicStyles = read('src/styles.css');
const webManifest = read('public/manifest.webmanifest');
const appErrorBoundary = read('src/components/AppErrorBoundary.tsx');
if (!publicHomePage.includes('public-home-v2222')
    || !publicHomePage.includes('public-showcase-intro')
    || !publicHomePage.includes('public-mobile-signals')
    || publicHomePage.includes('public-hero-axis')
    || !publicStyles.includes('public-showcase-exit')
    || !publicStyles.includes('.public-primary-action:active')) {
  errors.push('Les animations et interactions premium V2.22.2 sont incompletes.');
}
if (!app.includes('runsAsInstalledPwa')
    || !webManifest.includes('"start_url": "/connexion?source=pwa"')) {
  errors.push('Le lancement direct de la PWA sur la connexion est incomplet.');
}
if (!appErrorBoundary.includes('MODULE_LOAD_ERROR')
    || !appErrorBoundary.includes('MODULE_RECOVERY_KEY')
    || !appErrorBoundary.includes('this.resetAndReload()')) {
  errors.push('La recuperation automatique des modules PWA V2.22.2 est incomplete.');
}
// V2.23.2 - vitrine finalisee servie sans fragment CSS ou JS critique dans /assets.
const indexHtml = read('index.html');
const cloudflareHeaders = read('public/_headers');
const showcaseGenerator = read('scripts/generate-public-showcase-css.mjs');
const viteConfig = read('vite.config.ts');
const premiumShowcaseMigration = read('supabase/migrations/089_premium_showcase_offer_catalog.sql');
const signatureShowcaseMigration = read('supabase/migrations/090_signature_showcase_release.sql');
const showcasePolishMigration = read('supabase/migrations/091_showcase_polish_release.sql');
const portalAccessAlertsMigration = read('supabase/migrations/092_portal_access_support_alerts.sql');
const platformAdminLockedPushMigration = read('supabase/migrations/093_platform_admin_locked_screen_push.sql');
const stripeBillingMigration = read('supabase/migrations/094_stripe_subscription_billing.sql');
const stripeLifecycleMigration = read('supabase/migrations/095_stripe_catalog_lifecycle_paid_activation.sql');
const premiumContextSwitchersMigration = read('supabase/migrations/096_premium_context_switchers.sql');
const premiumCockpitMigration = read('supabase/migrations/097_premium_cockpit_polish.sql');
const stripeCheckoutFunction = read('supabase/functions/create-stripe-checkout/index.ts');
const stripePortalFunction = read('supabase/functions/create-stripe-portal/index.ts');
const stripeWebhookFunction = read('supabase/functions/stripe-webhook/index.ts');
const stripeAddonFunction = read('supabase/functions/manage-stripe-addon/index.ts');
const publicOfferCatalog = read('src/config/publicOfferCatalog.ts');
const trainingDashboardPage = read('src/pages/TrainingDashboardPage.tsx');
if (!indexHtml.includes('/ncr-suite-showcase-v262.css')
    || !indexHtml.includes('/ncr-suite-app-v262.css')
    || !indexHtml.includes('ncr-style-guard')
    || !indexHtml.includes('ncr:css-recovery-v2.26.2')
    || !showcaseGenerator.includes('ncr-suite-showcase-v262.css')
    || !showcaseGenerator.includes('ncr-suite-app-v262.css')
    || !viteConfig.includes('codeSplitting: false')
    || !viteConfig.includes("entryFileNames: 'ncr-suite-app-v262.js'")
    || !publicStyles.includes('--ncr-styles-ready: 1')) {
  errors.push('La protection V2.26.2 contre les fragments /assets indisponibles est incomplete.');
}
if (!cloudflareHeaders.includes('Content-Type: text/css; charset=utf-8')
    || !cloudflareHeaders.includes('/ncr-suite-showcase-v262.css')
    || !cloudflareHeaders.includes('/ncr-suite-app-v262.css')) {
  errors.push('Les en-tetes CSS Cloudflare V2.26.2 sont incomplets.');
}
if (!runtimeConfig.includes("APP_VERSION = '2.26.2'")
    || !runtimeConfig.includes("ncr-suite-shell-v2.26.2-premium-cockpit")
    || !serviceWorker.includes("ncr-suite-shell-v2.26.2-premium-cockpit")
    || !serviceWorker.includes("'/ncr-suite-showcase-v262.css'")
    || !serviceWorker.includes("'/ncr-suite-app-v262.css'")
    || !serviceWorker.includes("'/ncr-suite-app-v262.js'")) {
  errors.push('La version ou le cache PWA V2.26.2 est incoherent.');
}
if (read('src/main.tsx').includes("import './styles.css'")) {
  errors.push('Le style complet V2.26.2 ne doit pas etre fragmente dans /assets.');
}
if (!publicHomePage.includes('public-home-v232')
    || !publicHomePage.includes('public-offer-business-tabs')
    || !publicHomePage.includes('public-flow-rail')
    || !publicHomePage.includes('public-flow-top')
    || !publicHomePage.includes('public-platform-card')
    || !publicStyles.includes('.public-home-v232 .public-site-header nav > a:not(.public-access-link):hover')
    || !publicStyles.includes('.public-home-v232 .public-platform-visual.domains')
    || !publicOfferCatalog.includes('monthlyPriceCents: 14990')
    || !publicOfferCatalog.includes('monthlyPriceCents: 990')
    || !publicStyles.includes('@keyframes public-bento-float')
    || !publicStyles.includes('@keyframes public-flow-sweep')
    || !publicStyles.includes('@keyframes public-domain-shift')) {
  errors.push('Les finitions de vitrine ou le catalogue tarifaire V2.23.2 sont incomplets.');
}
if (!premiumShowcaseMigration.includes("'2.23.0'")
    || !premiumShowcaseMigration.includes('ncr-suite-shell-v2.23.0-premium-catalog')
    || !premiumShowcaseMigration.includes('platform_release_state')
    || !signatureShowcaseMigration.includes("'2.23.1'")
    || !signatureShowcaseMigration.includes('ncr-suite-shell-v2.23.1-signature-showcase')
    || !signatureShowcaseMigration.includes('platform_release_state')
    || !showcasePolishMigration.includes("'2.23.2'")
    || !showcasePolishMigration.includes('ncr-suite-shell-v2.23.2-showcase-polish')
    || !showcasePolishMigration.includes('platform_release_state')
    || !portalAccessAlertsMigration.includes("'2.24.0'")
    || !portalAccessAlertsMigration.includes('ncr-suite-shell-v2.24.0-portal-access-support-alerts')
    || !portalAccessAlertsMigration.includes('prepare_training_portal_manual_link')
    || !portalAccessAlertsMigration.includes('platform_admin_notifications')
    || !portalAccessAlertsMigration.includes('notify_platform_admin_training_module_request')
    || !portalAccessAlertsMigration.includes('platform_release_state')
    || !platformAdminLockedPushMigration.includes("alter column organization_id drop not null")
    || !platformAdminLockedPushMigration.includes("metadata->>'scope'='platform_admin'")
    || !platformAdminLockedPushMigration.includes('platform-admin-push:')
    || !platformAdminLockedPushMigration.includes('push_delivery_queue')
    || !platformAdminLockedPushMigration.includes('queue_platform_admin_push_test')
    || !platformAdminLockedPushMigration.includes("'2.24.1'")
    || !platformAdminLockedPushMigration.includes('ncr-suite-shell-v2.24.1-platform-admin-locked-screen-push')
    || !platformAdminLockedPushMigration.includes('platform_release_state')) {
  errors.push('La migration Push super-administrateur V2.24.1 est incomplete.');
}
if (!stripeBillingMigration.includes('create table if not exists public.stripe_price_catalog')
    || !stripeBillingMigration.includes('stripe_customer_id')
    || !stripeBillingMigration.includes('stripe_subscription_id')
    || !stripeBillingMigration.includes('claim_stripe_webhook_event')
    || !stripeBillingMigration.includes('apply_stripe_billing_event')
    || !stripeBillingMigration.includes("'2.25.0'")
    || !stripeBillingMigration.includes('ncr-suite-shell-v2.25.0-stripe-billing')
    || !stripeLifecycleMigration.includes('create table if not exists public.stripe_addon_price_catalog')
    || !stripeLifecycleMigration.includes('create table if not exists public.subscription_data_retention_events')
    || !stripeLifecycleMigration.includes("check (data_retention_mode='preserve')")
    || !stripeLifecycleMigration.includes('organization_billing_access_allowed')
    || !stripeLifecycleMigration.includes('record_stripe_scheduled_plan_change')
    || !stripeLifecycleMigration.includes("'data_retained',true")
    || !stripeLifecycleMigration.includes("'2.26.0'")
    || !stripeLifecycleMigration.includes('ncr-suite-shell-v2.26.0-stripe-billing')
    || !stripeCheckoutFunction.includes("mode: 'subscription'")
    || !stripeCheckoutFunction.includes('stripe_price_catalog')
    || !stripeCheckoutFunction.includes('subscription_data')
    || !stripeCheckoutFunction.includes('subscriptionSchedules')
    || !stripeCheckoutFunction.includes("destination: 'scheduled'")
    || !stripeAddonFunction.includes('subscriptionItems.create')
    || !stripeAddonFunction.includes('subscriptionItems.del')
    || !stripeAddonFunction.includes('complete_stripe_addon_removal')
    || !stripePortalFunction.includes('billingPortal.sessions.create')
    || !stripeWebhookFunction.includes('constructEventAsync')
    || !stripeWebhookFunction.includes('await request.text()')
    || !stripeWebhookFunction.includes('checkout.session.completed')
    || !stripeWebhookFunction.includes('invoice.payment_failed')
    || !stripeWebhookFunction.includes('customer.subscription.deleted')
    || !subscriptionPage.includes("functions.invoke('create-stripe-checkout'")
    || !subscriptionPage.includes("functions.invoke('create-stripe-portal'")
    || !subscriptionPage.includes('sans suppression des données')
    || !subscriptionPage.includes('Vos données sont conservées')) {
  errors.push('Le cycle Stripe et la conservation des donnees V2.26.0 sont incomplets.');
}
if (!premiumContextSwitchersMigration.includes("'2.26.1'")
    || !premiumContextSwitchersMigration.includes('ncr-suite-shell-v2.26.1-premium-switchers')
    || !premiumContextSwitchersMigration.includes('platform_release_state')
    || !appShell.includes('desktop-context-switchers')
    || !appShell.includes('context-switcher organization-switcher')
    || !appShell.includes('context-switcher site-switcher')
    || !appShell.includes("desktopContextMenu === 'organization'")
    || !appShell.includes("desktopContextMenu === 'site'")
    || !publicStyles.includes('.context-switcher-trigger')
    || !publicStyles.includes('.context-switcher-menu')
    || !publicStyles.includes('.desktop-context-switchers, .organization-switcher')) {
  errors.push('Les selecteurs premium V2.26.1 ou leur protection mobile sont incomplets.');
}
if (!premiumCockpitMigration.includes("'2.26.2'")
    || !premiumCockpitMigration.includes('ncr-suite-shell-v2.26.2-premium-cockpit')
    || !premiumCockpitMigration.includes('platform_release_state')
    || !trainingDashboardPage.includes('training-quality-period-segmented')
    || !trainingDashboardPage.includes('training-quality-period-mobile')
    || !trainingDashboardPage.includes('training-quality-export-actions')
    || !trainingDashboardPage.includes('<h1>Bonjour, bienvenue sur {organization.name}</h1>')
    || !publicStyles.includes('.training-quality-period-segmented')
    || !publicStyles.includes('.training-quality-period-mobile')
    || !publicStyles.includes('.training-quality-export-actions')
    || !publicStyles.includes('@media (max-width:760px)')) {
  errors.push('La finition premium V2.26.2 ou la protection du parcours mobile est incomplete.');
}
if ([subscriptionPage, publicHomePage, app, runtimeConfig].some((source) =>
  source.includes('STRIPE_SECRET_KEY') || source.includes('STRIPE_WEBHOOK_SECRET') || source.includes('rk_test_')
)) {
  errors.push('Un secret Stripe ne doit jamais etre present dans le frontend.');
}

const sqlFiles = walk(path.join(root, 'supabase', 'migrations'), '.sql');
let allSql = '';
for (const file of sqlFiles) {
  const sql = fs.readFileSync(file, 'utf8');
  allSql += `\n${sql}`;
  const blocks = sql.split(/(?=create\s+or\s+replace\s+function)/ig);
  for (const block of blocks) {
    if (/security\s+definer/i.test(block) && !/set\s+search_path\s*=/i.test(block)) {
      errors.push(`SECURITY DEFINER sans search_path : ${path.relative(root, file)}`);
      break;
    }
  }
}

// Vérifie les tables organisationnelles : RLS directe ou activation via une boucle idempotente.
const organizationTables = new Set();
for (const match of allSql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)\s*\(([\s\S]*?)\);/ig)) {
  if (/\borganization_id\b/i.test(match[2])) organizationTables.add(match[1]);
}
const dynamicallyEnabled = new Set();
for (const block of allSql.matchAll(/foreach\s+\w+\s+in\s+array\s+array\[([\s\S]*?)\][\s\S]*?enable\s+row\s+level\s+security/ig)) {
  for (const table of block[1].matchAll(/'([^']+)'/g)) dynamicallyEnabled.add(table[1]);
}
for (const table of organizationTables) {
  const direct = new RegExp(`alter\\s+table\\s+(?:if\\s+exists\\s+)?public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(allSql);
  if (!direct && !dynamicallyEnabled.has(table)) warnings.push(`Table organisationnelle sans activation RLS détectée statiquement : ${table}`);
}

const allowedAnonFunctions = new Set([
  'get_public_booking_page','get_public_available_slots','get_public_available_slots_v2',
  'create_public_booking','create_public_booking_v2','create_public_booking_v3',
  'get_public_booking','cancel_public_booking','reschedule_public_booking','reschedule_public_booking_v2',
  'get_public_restaurant_menu','get_public_restaurant_booking_config','get_public_restaurant_booking_availability',
  'create_public_restaurant_reservation','get_public_training_satisfaction','submit_public_training_satisfaction','submit_public_training_evaluation',
  'get_team_invitation','get_security_client_portal_invitation','get_cleaning_client_portal_invitation','get_coiffure_client_portal_invitation',
  'get_training_portal_invitation'
]);
for (const match of allSql.matchAll(/grant\s+execute\s+on\s+function\s+public\.(\w+)[^;]*?\s+to\s+([^;]+);/ig)) {
  const roles = match[2].toLowerCase().split(',').map((role) => role.trim());
  if (roles.includes('anon') && !allowedAnonFunctions.has(match[1])) errors.push(`Fonction anon non autorisée par l'audit : ${match[1]}`);
}

const packageJson = JSON.parse(read('package.json'));
const sw = read('public/sw.js');
if (!sw.includes(packageJson.version)) warnings.push(`Le cache PWA ne contient pas la version ${packageJson.version}.`);

if (warnings.length) {
  console.warn(`Audit NCR Suite : ${warnings.length} avertissement(s)`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (errors.length) {
  console.error(`Audit NCR Suite : ${errors.length} erreur(s) bloquante(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Audit NCR Suite : contrôles statiques validés.');
