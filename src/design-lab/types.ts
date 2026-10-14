import type { AppState, Course } from "@/lib/model";
export const directions = ["precision", "expressive", "kinetic"] as const;
export type Direction = (typeof directions)[number];
export type LabView =
  "overview" | "courses" | "whatif" | "gpa" | "trends" | "planner" | "data";
export interface ConceptProps {
  state: AppState;
  motionEnabled?: boolean;
  selectedCourseId: string;
  onSelectCourse: (id: string) => void;
  onOpenCourse: (course: Course) => void;
  onWhatIf: (courseId?: string) => void;
  onNavigate: (view: LabView) => void;
  onAddCourse: () => void;
  onAddAssignment: (course: Course) => void;
  onRecordSnapshot: () => void;
  onAppearance: () => void;
}
export const directionInfo = {
  precision: {
    name: "Precision",
    tagline: "The academic instrument.",
    description:
      "A quiet, compact workspace with a course ledger, category-level analysis, and attention ordered by need.",
  },
  expressive: {
    name: "Expressive",
    tagline: "A semester with character.",
    description:
      "An editorial workspace with a focused course story, tactile subject cards, and a purposeful next-score spotlight.",
  },
  kinetic: {
    name: "Kinetic",
    tagline: "See the next move.",
    description:
      "A spatial, selection-led workspace that connects course position, target gaps, and upcoming deadlines.",
  },
} as const;
