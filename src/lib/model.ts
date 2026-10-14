import { z } from "zod";
export const AssignmentSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(160),
    categoryId: z.string(),
    earned: z.number().finite().nonnegative().nullable(),
    possible: z.number().positive().finite(),
    status: z.enum([
      "graded",
      "missing",
      "ungraded",
      "future",
      "dropped",
      "exempt",
    ]),
    due: z.iso.date(),
  })
  .refine((a) => a.status !== "graded" || a.earned !== null, {
    message: "Graded assignments need a score.",
  })
  .refine((a) => a.earned === null || a.earned <= a.possible, {
    message: "Score must not exceed possible points.",
  });
export const CourseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(100),
    teacher: z.string().max(100),
    level: z.enum(["Regular", "Honors", "AP"]),
    semester: z.string().min(1).max(60),
    credits: z.number().positive().max(20),
    mode: z.enum(["weighted", "points"]),
    target: z.number().min(0).max(100),
    color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
    categories: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1).max(80),
          weight: z.number().min(0).max(100),
        }),
      )
      .min(1),
    assignments: z.array(AssignmentSchema).max(10000),
  })
  .superRefine((course, ctx) => {
    if (
      new Set(course.categories.map((c) => c.id)).size !==
      course.categories.length
    )
      ctx.addIssue({ code: "custom", message: "Category IDs must be unique." });
    if (
      new Set(course.assignments.map((a) => a.id)).size !==
      course.assignments.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Assignment IDs must be unique.",
      });
    if (
      course.assignments.some(
        (a) => !course.categories.some((c) => c.id === a.categoryId),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Assignment references an unknown category.",
      });
    if (
      course.mode === "weighted" &&
      Math.abs(course.categories.reduce((s, c) => s + c.weight, 0) - 100) > 0.01
    )
      ctx.addIssue({
        code: "custom",
        message: "Category weights must total 100%.",
      });
  });
export const PolicySchema = z
  .object({
    name: z.string().min(1),
    scale: z
      .array(
        z.object({
          min: z.number().min(0).max(100),
          points: z.number().min(0).max(10),
          letter: z.string().min(1),
        }),
      )
      .min(1),
    apBonus: z.number().min(0).max(5),
    honorsBonus: z.number().min(0).max(5),
    bonusMinimum: z.number().min(0).max(100),
    priorCredits: z.number().min(0).max(10000),
    priorGpa: z.number().min(0).max(10),
  })
  .refine(
    (p) =>
      p.scale.some((s) => s.min === 0) &&
      new Set(p.scale.map((s) => s.min)).size === p.scale.length,
    { message: "Scale must have unique thresholds and include 0." },
  );
export type Assignment = z.infer<typeof AssignmentSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type GpaPolicy = z.infer<typeof PolicySchema>;
export const widgets = [
  "courses",
  "distribution",
  "upcoming",
  "activity",
] as const;
export type Widget = (typeof widgets)[number];
export const SettingsSchema = z
  .object({
    theme: z.enum(["dark", "light"]),
    accent: z.enum(["lavender", "mint", "blue", "rose"]),
    density: z.enum(["comfortable", "compact"]),
    layout: z.enum(["balanced", "wide"]),
    motion: z.enum(["full", "subtle", "none"]),
    widgets: z.array(z.enum(widgets)),
    order: z.array(z.enum(widgets)),
    name: z.string().min(1).max(50),
    semesterStart: z.iso.date(),
    semesterEnd: z.iso.date(),
  })
  .refine((s) => s.semesterEnd > s.semesterStart, {
    message: "Semester end must follow its start.",
  })
  .refine(
    (s) =>
      s.order.length === widgets.length &&
      new Set(s.order).size === widgets.length &&
      new Set(s.widgets).size === s.widgets.length,
    { message: "Widget ordering must contain each widget once." },
  );
export type Settings = z.infer<typeof SettingsSchema>;
export const SnapshotSchema = z.object({
  at: z.string().datetime(),
  semester: z.string(),
  grades: z.record(z.string(), z.number().min(0).max(100).nullable()),
  assignments: z
    .record(
      z.string(),
      z.record(
        z.string(),
        z.object({
          name: z.string(),
          percent: z.number().min(0).max(100).nullable(),
          status: z.enum([
            "graded",
            "missing",
            "ungraded",
            "future",
            "dropped",
            "exempt",
          ]),
        }),
      ),
    )
    .optional(),
});
export const StateSchema = z
  .object({
    version: z.literal(1),
    demo: z.boolean(),
    courses: z.array(CourseSchema).max(500),
    settings: SettingsSchema,
    policy: PolicySchema,
    snapshots: z.array(SnapshotSchema).max(5000),
  })
  .refine(
    (s) => new Set(s.courses.map((c) => c.id)).size === s.courses.length,
    { message: "Course IDs must be unique." },
  );
export type AppState = z.infer<typeof StateSchema>;
export const defaultSettings: Settings = {
  theme: "dark",
  accent: "lavender",
  density: "comfortable",
  layout: "balanced",
  motion: "subtle",
  widgets: [...widgets],
  order: [...widgets],
  name: "Alex",
  semesterStart: "2026-08-17",
  semesterEnd: "2026-12-18",
};
export const defaultPolicy: GpaPolicy = {
  name: "Custom 4.0 scale",
  scale: [
    { min: 90, points: 4, letter: "A" },
    { min: 80, points: 3, letter: "B" },
    { min: 70, points: 2, letter: "C" },
    { min: 60, points: 1, letter: "D" },
    { min: 0, points: 0, letter: "F" },
  ],
  apBonus: 1,
  honorsBonus: 0.5,
  bonusMinimum: 60,
  priorCredits: 0,
  priorGpa: 0,
};
