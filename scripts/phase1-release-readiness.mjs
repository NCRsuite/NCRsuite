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
    if (!source.includes(snippet)) failures.push(`Contrôle V2.20.1 absent dans ${file} : ${snippet}`);
  }
};

const pkg = JSON.parse(read('package.json'));
const expectedCache = `ncr-suite-shell-v${pkg.version}-training-locked-navigation`;
const finalStabilizationCache = 'ncr-suite-shell-v2.20.0-final-stabilization';
const runtime = read('src/config/runtime.ts');
const serviceWorker = read('public/sw.js');

if (pkg.version !== '2.20.1') failures.push('package.json doit annoncer la V2.20.1.');
if (!runtime.includes(`APP_VERSION = '${pkg.version}'`)) failures.push('La version runtime ne correspond pas au paquet.');
if (!runtime.includes(`PWA_CACHE_NAME = '${expectedCache}'`)) failures.push('Le cache runtime V2.20.1 est incohérent.');
if (!serviceWorker.includes(`const CACHE = '${expectedCache}'`)) failures.push('Le Service Worker V2.20.1 est incohérent.');
if (!serviceWorker.includes("key.startsWith(CACHE_PREFIX)")) failures.push('Le nettoyage PWA doit être limité aux caches NCR Suite.');
if (!serviceWorker.includes("if (isNavigation) return (await caches.match('/index.html'))")) failures.push('Le repli PWA de navigation a été retiré.');

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
  expectedCache,
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
  'formationRequiredPlanForPath',
  'premium-locked'
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

requireText('src/components/TrainingModulesPanel.tsx', [
  "supabase.rpc('training_module_portal'",
  "supabase.rpc('request_training_module_change'",
  "supabase.rpc('cancel_training_module_request'",
  'projectedTotal',
  'upgradeWouldBeCheaper',
  'La formule',
  'MODULES FORMATION À LA CARTE'
]);

requireText('src/pages/SubscriptionPage.tsx', [
  "import { TrainingModulesPanel }",
  "data.business_type === 'formation'",
  '<TrainingModulesPanel />',
  'id="subscription-plans"'
]);

requireText('src/components/BillingAdminPanel.tsx', [
  "supabase.rpc('admin_training_module_configuration')",
  "supabase.rpc('admin_list_training_module_requests'",
  "supabase.rpc('admin_update_training_module_link'",
  "supabase.rpc('admin_review_training_module_request'",
  'MODULES FORMATION',
  'Liens Qonto Formation'
]);

requireText('src/components/AdminMonitoringPanel.tsx', [
  "supabase.rpc('platform_release_readiness_report')",
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
  "'/facturation-formation': 'training_billing'"
]);

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
for (const migrationNumber of ['054','055','056','057','058','059','060','061','062','063','064','065','066','067','068','069','070','071','072','073','074','075','076','077','078','079','080','081']) {
  if (!migrationFiles.some((file) => file.startsWith(`${migrationNumber}_`))) {
    failures.push(`Migration de production ${migrationNumber} absente.`);
  }
}

if (failures.length) {
  console.error(`Préparation release NCR Suite : ${failures.length} échec(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Préparation release NCR Suite : navigation Formation verrouillée et cohérence multi-métiers validées.');
