import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'src', 'styles.css');
const showcaseOutputPath = path.join(root, 'public', 'ncr-suite-showcase-v280.css');
const appOutputPath = path.join(root, 'public', 'ncr-suite-app-v280.css');
const source = fs.readFileSync(sourcePath, 'utf8');
const resetEnd = source.indexOf('.loading-screen');
const publicStart = source.indexOf('.public-home,');

if (resetEnd < 0 || publicStart < 0) {
  throw new Error('Impossible d’isoler les styles de la vitrine NCR Suite.');
}

const output = [
  '/* NCR Suite V2.28.0 - styles critiques de la vitrine */',
  source.slice(0, resetEnd).trim(),
  source.slice(publicStart).trim(),
  ''
].join('\n');

fs.writeFileSync(showcaseOutputPath, output, 'utf8');
fs.writeFileSync(appOutputPath, [
  '/* NCR Suite V2.28.0 - styles complets servis hors du dossier assets */',
  source,
  ''
].join('\n'), 'utf8');
console.log('Styles critiques et complets de NCR Suite générés.');
