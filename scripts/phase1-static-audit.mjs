import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

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

function walk(directory, extension, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, extension, output);
    else if (entry.name.endsWith(extension)) output.push(full);
  }
  return output;
}

for (const file of walk(path.join(root, 'src'), '.ts').concat(walk(path.join(root, 'src'), '.tsx'))) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('.replaceAll(')) errors.push(`replaceAll incompatible ES2020 : ${path.relative(root, file)}`);
  if (/JSON\.parse\(\s*localStorage\.getItem/.test(source)) warnings.push(`Lecture localStorage directe : ${path.relative(root, file)}`);
}

for (const file of walk(path.join(root, 'supabase', 'migrations'), '.sql')) {
  const sql = fs.readFileSync(file, 'utf8');
  const blocks = sql.split(/(?=create\s+or\s+replace\s+function)/ig);
  for (const block of blocks) {
    if (/security\s+definer/i.test(block) && !/set\s+search_path\s*=/i.test(block)) {
      errors.push(`SECURITY DEFINER sans search_path : ${path.relative(root, file)}`);
      break;
    }
  }
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
