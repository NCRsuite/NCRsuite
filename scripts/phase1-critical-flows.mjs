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
const expectedCache = `ncr-suite-shell-v${pkg.version}-phase1-complete`;
if (!runtime.includes(`APP_VERSION = '${pkg.version}'`)) failures.push('La version frontend ne correspond pas à package.json.');
if (!runtime.includes(`PWA_CACHE_NAME = '${expectedCache}'`)) failures.push('Le cache runtime ne correspond pas à la release attendue.');
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
  '/invitation/:token'
];
for (const route of publicRoutes) {
  if (!app.includes(`path=\"${route}\"`) && !app.includes(`path='${route}'`)) {
    failures.push(`Route publique critique absente : ${route}`);
  }
}

const access = read('src/config/accessMatrix.ts');
const crossDomainRoutes = [
  ['coiffure', '/rendez-vous'],
  ['formation', '/sessions'],
  ['securite', '/rondes'],
  ['nettoyage', '/interventions'],
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
  expectedCache,
  'set search_path = public'
]);

const migrationFiles = fs.readdirSync(path.join(root, 'supabase', 'migrations'));
for (const number of ['054', '055', '056', '057', '058', '059']) {
  if (!migrationFiles.some((file) => file.startsWith(`${number}_`))) failures.push(`Migration critique ${number} absente.`);
}

if (failures.length) {
  console.error(`Parcours critiques NCR Suite : ${failures.length} échec(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Parcours critiques NCR Suite : validation statique réussie.');
