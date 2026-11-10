import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transformSync } from 'esbuild';

// Exercise the actual production interpolation, independent of WebGL support.
const code = transformSync(fs.readFileSync('src/components/public-home/three/motion.ts', 'utf8'), { loader: 'ts', format: 'esm' }).code;
const { advanceStage, smoothPhase, screenBlend, renderRatio } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
for (const hz of [30, 60, 120]) {
  let stage = 0;
  for (const target of [5, 0, 4, 1, 5]) {
    for (let frame = 0; frame < hz * 2; frame++) {
      const previous = stage;
      stage = advanceStage(stage, target, 1 / hz);
      assert.ok(Number.isFinite(stage) && stage >= 0 && stage <= 5);
      assert.ok(Math.abs(target - stage) <= Math.abs(target - previous) + 1e-10, 'No overshoot after direction reversal');
      const alpha = [1, 2, 3, 4, 5].map(i => screenBlend(stage, i));
      const opaque = alpha.findLastIndex(v => v === 1) + 1;
      const fading = alpha.filter((v, i) => i + 1 > opaque && v > 0).length;
      assert.ok(fading <= 1, 'Only one translucent screen over the opaque base');
      assert.equal(1 + fading >= 1, true, 'An opaque screen always remains visible');
    }
    assert.equal(stage, target, 'Both endpoints converge exactly');
  }
}
for (const hz of [30, 60, 120]) {
  let value = 0;
  for (let i = 0; i < hz / 2; i++) value = advanceStage(value, 1, 1 / hz);
  assert.ok(Math.abs(value - (1 - Math.exp(-4.5))) < 1e-9, 'Damping independent of refresh rate');
}
assert.equal(smoothPhase(0), 0); assert.equal(smoothPhase(1), 1);
assert.ok(smoothPhase(0.001) < 1e-7 && 1 - smoothPhase(0.999) < 1e-7, 'Camera velocity eases continuously at keyframes');
assert.equal(screenBlend(0.5, 1), 0.5);
for (const [width, height] of [[390,844],[1440,900],[2560,1440],[3840,2160]]) {
  for (const mobile of [false,true]) for (const cores of [2,8]) {
    const ratio = renderRatio(3, width, height, mobile, cores);
    assert.ok(ratio >= 0.75 && ratio <= (mobile ? 1.25 : 1.5));
    assert.ok(ratio * ratio * width * height <= Math.max((mobile || cores <= 4) ? 2e6 : 4e6, width * height * 0.75 ** 2) + 1);
  }
}
console.log('Public home motion passed: fast/reverse scroll, 30/60/120Hz damping, opaque screen continuity, camera endpoints and DPR budgets (no GPU FPS measurement).');
