/** Scroll stage shared by camera, screen, accent and text. No frame allocations. */
export const clampStage = (value: number) => Math.max(0, Math.min(5, value));
export function smoothPhase(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}
export function advanceStage(current: number, target: number, dt: number) {
  const goal = clampStage(target);
  const next = current + (goal - current) * -Math.expm1(-9 * Math.max(0, Math.min(dt, 0.05)));
  return Math.abs(next - goal) < 0.0005 ? goal : clampStage(next);
}
export const screenBlend = (stage: number, upper: number) => smoothPhase((stage - upper + 0.85) / 0.7);
export function renderRatio(dpr: number, width: number, height: number, mobile: boolean, cores: number) {
  const modest = cores > 0 && cores <= 4;
  const ceiling = mobile ? (modest ? 1 : 1.25) : (modest ? 1.25 : 1.5);
  const budget = mobile || modest ? 2e6 : 4e6;
  return Math.max(0.75, Math.min(dpr || 1, ceiling, Math.sqrt(budget / Math.max(1, width * height))));
}
