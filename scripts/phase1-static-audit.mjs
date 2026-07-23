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
if (!trainingCommercialPage.includes('Commercial & financeurs') || !trainingCommercialPage.includes('generateTrainingCommercialPdf')) {
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
if (!trainingEmailProcessor.includes('NCR Suite V2.15.4')) {
  errors.push('Le processeur documentaire Formation doit annoncer NCR Suite V2.15.4.');
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
  'get_team_invitation','get_security_client_portal_invitation','get_cleaning_client_portal_invitation','get_coiffure_client_portal_invitation'
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
