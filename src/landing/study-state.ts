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
export function chapterOpacity(progress: number, index: number) {
  if (index === 0) return 1 - clamp(progress / 0.035);
  const center = chapterStops[index];
  const before = (chapterStops[index - 1] + center) / 2;
  const after = index === 6 ? 1.1 : (center + chapterStops[index + 1]) / 2;
  return Math.min(
    clamp((progress - before) / 0.025),
    clamp((after - progress) / 0.025),
  );
}
