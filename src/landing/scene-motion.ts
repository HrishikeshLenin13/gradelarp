import { clamp } from "./study-state";

export const cameraStops = [
  0, 0.028, 0.075, 0.22, 0.43, 0.6, 0.72, 0.83, 0.94, 1,
] as const;
const widths = cameraStops.slice(1).map((p, i) => p - cameraStops[i]);
const velocities = widths.map((width) => 1 / (9 * width));
// Monotone cubic timing preserves each art-directed pose without stopping at every pose.
const tangents = cameraStops.map((_, i) => {
  if (i === 0 || i === cameraStops.length - 1) return 0;
  const left = widths[i - 1],
    right = widths[i];
  const w1 = 2 * right + left,
    w2 = right + 2 * left;
  return (w1 + w2) / (w1 / velocities[i - 1] + w2 / velocities[i]);
});
export function routeTime(progress: number) {
  const p = clamp(progress);
  let i = 0;
  while (i < cameraStops.length - 2 && p > cameraStops[i + 1]) i++;
  const t = (p - cameraStops[i]) / widths[i],
    t2 = t * t,
    t3 = t2 * t;
  return clamp(
    (2 * t3 - 3 * t2 + 1) * (i / 9) +
      (t3 - 2 * t2 + t) * widths[i] * tangents[i] +
      (-2 * t3 + 3 * t2) * ((i + 1) / 9) +
      (t3 - t2) * widths[i] * tangents[i + 1],
  );
}
/** Delta-time based input smoothing. Snap at rest so demand rendering really stops. */
export function settleValue(
  current: number,
  target: number,
  delta: number,
  rate = 26,
  epsilon = 0.0001,
) {
  if (Math.abs(current - target) <= epsilon) return target;
  const next =
    current + (target - current) * -Math.expm1(-rate * clamp(delta, 0, 0.05));
  return Math.abs(next - target) <= epsilon ? target : next;
}
