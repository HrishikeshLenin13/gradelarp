export interface StudyState {
  progress: number;
  stack: number;
  pointerX: number;
  pointerY: number;
  reduced: boolean;
  yaw: number;
  cover: number | null;
}
export const chapterStops = [0, 0.075, 0.22, 0.43, 0.65, 0.83, 1] as const;
export const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));
function handoff(progress: number, left: number, right: number) {
  const t = clamp(((progress - left) / (right - left) - 0.42) / 0.16);
  return t * t * (3 - 2 * t);
}
/** Complementary crossfades: adjacent chapters sum to one, never both disappear. */
export function chapterOpacity(progress: number, index: number) {
  if (index < 0 || index >= chapterStops.length) return 0;
  const center = chapterStops[index];
  const enter =
    index === 0 ? 1 : handoff(progress, chapterStops[index - 1], center);
  const leave =
    index === chapterStops.length - 1
      ? 1
      : 1 - handoff(progress, center, chapterStops[index + 1]);
  return Math.min(enter, leave);
}
