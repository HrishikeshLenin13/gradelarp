import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const formatGrade = (grade: number | null) =>
  grade === null ? "—" : grade.toFixed(1);
export function uid() {
  return crypto.randomUUID();
}
