import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generator = path.join(root, 'scripts/generate-public-showcase-css.mjs');
const files = ['src/styles.css', 'public/ncr-suite-showcase-v2925.css', 'public/ncr-suite-app-v2925.css'];

function sandbox(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'ncr-ui-baseline-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const file of files) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    copyFileSync(path.join(root, file), path.join(dir, file));
  }
  return dir;
}

for (const changed of [null, ...files]) {
  test(changed ? `refuse la dérive de ${changed} sans écraser les sorties` : 'build normal : conserve exactement la baseline publique', t => {
    const dir = sandbox(t);
    if (changed) appendFileSync(path.join(dir, changed), '\n/* changement non validé */\n');
    const before = files.map(file => readFileSync(path.join(dir, file)));
    const run = spawnSync(process.execPath, [generator], { cwd: dir, encoding: 'utf8' });
    assert.equal(run.status, changed ? 1 : 0, run.stderr);
    for (const [i, file] of files.entries()) assert.deepEqual(readFileSync(path.join(dir, file)), before[i]);
  });
}

test('régénération héritée possible uniquement sur demande explicite', t => {
  const dir = sandbox(t);
  appendFileSync(path.join(dir, 'src/styles.css'), '\n.explicit-baseline-test { color: red; }\n');
  const run = spawnSync(process.execPath, [generator, '--refresh-legacy'], { cwd: dir, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  for (const file of files.slice(1)) assert.match(readFileSync(path.join(dir, file), 'utf8'), /explicit-baseline-test/);
});
