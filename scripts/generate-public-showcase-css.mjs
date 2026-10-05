import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const sourcePath = path.join(root, 'src', 'styles.css');
const showcaseOutputPath = path.join(root, 'public', 'ncr-suite-showcase-v2925.css');
const appOutputPath = path.join(root, 'public', 'ncr-suite-app-v2925.css');
const source = fs.readFileSync(sourcePath, 'utf8');

// Frozen public/legacy cascade from the audited 9a5857b checkpoint. The old
// generated files are intentionally not identical to current styles.css.
// An ordinary app build must never silently replace that visual baseline.
const auditedBaseline = new Map([
  [sourcePath, '6a113e60966082992a382e75b54117fbf5cd0c7acc5871071ce7988a4c310235'],
  [showcaseOutputPath, '30c0c210961ea746d387fbee3834d04f8ffc78e0d2adfaaaae556fae92fbeb7b'],
  [appOutputPath, '6c5a9e0808cf4dd7d64ee043f688f1b86eb11d0555f900ed8a994f4958d57c33']
]);
if (!process.argv.includes('--refresh-legacy')) {
  for (const [file, expected] of auditedBaseline) {
    const actual = fs.existsSync(file)
      ? createHash('sha256').update(fs.readFileSync(file)).digest('hex')
      : null;
    if (actual !== expected) {
      throw new Error(`Baseline CSS héritée modifiée : ${path.relative(root, file)}. ` +
        'Préserver les fichiers audités pour un lot applicatif. Une migration volontaire nécessite ' +
        '--refresh-legacy, une comparaison visuelle publique et la mise à jour des empreintes.');
    }
  }
  console.log('Baseline CSS publique/héritée auditée conservée (aucune régénération implicite).');
  process.exit(0);
}

const resetEnd = source.indexOf('.loading-screen');
const publicStart = source.indexOf('.public-home,');

if (resetEnd < 0 || publicStart < 0) {
  throw new Error('Impossible d’isoler les styles de la vitrine NCR Suite.');
}

const output = [
  '/* NCR Suite V2.29.25 - styles critiques de la vitrine */',
  source.slice(0, resetEnd).trim(),
  source.slice(publicStart).trim(),
  ''
].join('\n');

fs.writeFileSync(showcaseOutputPath, output, 'utf8');
fs.writeFileSync(appOutputPath, [
  '/* NCR Suite V2.29.25 - styles complets servis hors du dossier assets */',
  source,
  ''
].join('\n'), 'utf8');
console.log('Styles critiques et complets de NCR Suite générés.');
