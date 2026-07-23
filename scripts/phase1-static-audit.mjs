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
  'create_public_restaurant_reservation','get_public_training_satisfaction','submit_public_training_satisfaction',
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
