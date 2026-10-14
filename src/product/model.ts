import { z } from "zod";
import { AssignmentSchema, StateSchema, type AppState } from "../lib/model";
import { emptyState, createDemo } from "../lib/demo";
import { uid } from "../lib/utils";

export const dashboardWidgets = [
  "courses",
  "distribution",
  "upcoming",
  "activity",
] as const;
export const PreferencesSchema = z.object({
  appearance: z.enum(["light", "dark", "system"]),
  accent: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  density: z.enum(["compact", "spacious"]),
  motion: z.enum(["full", "subtle", "none"]),
  sidebar: z.enum(["compact", "expanded"]),
  layout: z.enum(["balanced", "wide"]),
  chart: z.enum(["bars", "dots"]),
});
export type Preferences = z.infer<typeof PreferencesSchema>;
export const defaultPreferences: Preferences = {
  appearance: "light",
  accent: "#93536f",
  density: "spacious",
  motion: "subtle",
  sidebar: "compact",
  layout: "balanced",
  chart: "bars",
};
const id = z.string().min(1).max(200);
const title = z.string().trim().min(1).max(160);
export const ScenarioSchema = z
  .object({
    id,
    name: title,
    courseId: id,
    createdAt: z.iso.datetime(),
    baseFingerprint: z.string(),
    changes: z
      .array(
        z.object({
          assignmentId: id,
          earned: z.number().finite().nonnegative().nullable(),
          status: z.enum([
            "graded",
            "missing",
            "ungraded",
            "future",
            "dropped",
            "exempt",
          ]),
        }),
      )
      .max(10000),
    additions: z.array(AssignmentSchema).max(1000),
  })
  .refine(
    (s) =>
      new Set(s.changes.map((c) => c.assignmentId)).size === s.changes.length,
    "Each assignment may be changed once.",
  );
export type Scenario = z.infer<typeof ScenarioSchema>;
export const TaskSchema = z.object({
  id,
  title,
  courseId: z.string(),
  date: z.iso.date(),
  priority: z.enum(["low", "normal", "high"]),
  done: z.boolean(),
  notes: z.string().max(2000),
});
export type Task = z.infer<typeof TaskSchema>;
export const ScheduleSchema = z
  .object({
    id,
    title,
    courseId: z.string(),
    day: z.number().int().min(0).max(6),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    room: z.string().max(100),
    semester: z.string().min(1).max(60),
  })
  .refine((s) => s.end > s.start, "End time must follow start time.");
export type Schedule = z.infer<typeof ScheduleSchema>;
export const AttendanceSchema = z.object({
  id,
  date: z.iso.date(),
  courseId: id,
  status: z.enum(["present", "absent", "tardy", "excused"]),
  note: z.string().max(1000),
});
export type Attendance = z.infer<typeof AttendanceSchema>;
export const TranscriptSchema = z.object({
  id,
  course: title,
  semester: z.string().trim().min(1).max(60),
  level: z.enum(["Regular", "Honors", "AP"]),
  credits: z.number().positive().max(20),
  grade: z.number().min(0).max(100),
  note: z.string().max(1000),
});
export type TranscriptRecord = z.infer<typeof TranscriptSchema>;
export const ContactSchema = z.object({
  id,
  courseId: id,
  name: title,
  email: z.union([z.email(), z.literal("")]),
  room: z.string().max(100),
  hours: z.string().max(200),
  note: z.string().max(2000),
});
export type Contact = z.infer<typeof ContactSchema>;
export const GoalSchema = z.object({
  id,
  title,
  date: z.iso.date(),
  done: z.boolean(),
  note: z.string().max(1000),
});
export type Goal = z.infer<typeof GoalSchema>;
export const ProfileSchema = z
  .object({
    id,
    name: z.string().trim().min(1).max(50),
    state: StateSchema,
    hac: ImportStateSchema.optional(),
    preferences: PreferencesSchema,
    periods: z
      .record(
        z.string(),
        z
          .object({ start: z.iso.date(), end: z.iso.date() })
          .refine(
            (p) => p.end > p.start,
            "Semester end must follow its start.",
          ),
      )
      .default({}),
    scenarios: z.array(ScenarioSchema).max(500),
    tasks: z.array(TaskSchema).max(5000),
    completedAssignments: z.array(id).max(10000),
    schedules: z.array(ScheduleSchema).max(1000),
    attendance: z.array(AttendanceSchema).max(10000),
    records: z.array(TranscriptSchema).max(2000),
    contacts: z.array(ContactSchema).max(500),
    goals: z.array(GoalSchema).max(1000),
    gpaPlan: z.object({
      target: z.number().min(0).max(15),
      futureCredits: z.number().positive().max(1000),
      futureLevel: z.enum(["Regular", "Honors", "AP"]),
      projectedGrades: z
        .record(z.string(), z.number().min(0).max(100))
        .default({}),
    }),
  })
  .superRefine((p, ctx) => {
    if (p.hac && !p.state.demo)
      ctx.addIssue({
        code: "custom",
        message: "HAC mock records must remain in a synthetic sandbox profile.",
      });
    for (const key of [
      "scenarios",
      "tasks",
      "schedules",
      "attendance",
      "records",
      "contacts",
      "goals",
    ] as const)
      if (new Set(p[key].map((x) => x.id)).size !== p[key].length)
        ctx.addIssue({ code: "custom", message: `Duplicate ${key} IDs.` });
    if (
      new Set(p.attendance.map((a) => `${a.courseId}/${a.date}`)).size !==
      p.attendance.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Only one attendance entry per course and date.",
      });
  });
export type Profile = z.infer<typeof ProfileSchema>;
export const ProductSchema = z
  .object({
    format: z.literal("gradelarp-product"),
    version: z.literal(2),
    activeProfileId: id,
    profiles: z.array(ProfileSchema).min(1).max(25),
  })
  .superRefine((p, ctx) => {
    if (new Set(p.profiles.map((x) => x.id)).size !== p.profiles.length)
      ctx.addIssue({ code: "custom", message: "Profile IDs must be unique." });
    if (!p.profiles.some((x) => x.id === p.activeProfileId))
      ctx.addIssue({ code: "custom", message: "Active profile is missing." });
  });
export type ProductData = z.infer<typeof ProductSchema>;
export function newProfile(name = "Student", demo = false): Profile {
  const state = demo ? createDemo() : emptyState();
  state.settings.name = name;
  return {
    id: uid(),
    name,
    state,
    preferences: { ...defaultPreferences },
    periods: demo
      ? {
          [state.courses[0].semester]: {
            start: state.settings.semesterStart,
            end: state.settings.semesterEnd,
          },
        }
      : {},
    scenarios: [],
    tasks: [],
    completedAssignments: [],
    schedules: [],
    attendance: [],
    records: [],
    contacts: [],
    goals: [],
    gpaPlan: {
      target: 4,
      futureCredits: 3,
      futureLevel: "Regular",
      projectedGrades: {},
    },
  };
}
/** Migration copies the validated legacy state; the legacy database remains untouched. */
export function migrateLegacy(raw: unknown | null): ProductData {
  const p = newProfile();
  if (raw !== null) {
    p.state = StateSchema.parse(raw);
    p.name = p.state.settings.name;
    const s = p.state.settings;
    if (p.state.courses[0])
      p.periods = {
        [p.state.courses[0].semester]: {
          start: s.semesterStart,
          end: s.semesterEnd,
        },
      };
    p.preferences = {
      ...defaultPreferences,
      appearance: s.theme,
      accent: {
        lavender: "#ada0ed",
        mint: "#77c5b4",
        blue: "#88add9",
        rose: "#93536f",
      }[s.accent],
      density: s.density === "compact" ? "compact" : "spacious",
      layout: s.layout,
      motion: s.motion,
    };
  }
  return ProductSchema.parse({
    format: "gradelarp-product",
    version: 2,
    activeProfileId: p.id,
    profiles: [p],
  });
}
export function parseProductBackup(text: string): ProductData {
  const raw = JSON.parse(text);
  return raw.format === "gradelarp-product"
    ? ProductSchema.parse(raw)
    : migrateLegacy(raw);
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function currentSemester() {
  const now = new Date();
  return `${now.getMonth() < 6 ? "Spring" : "Fall"} ${now.getFullYear()}`;
}
export function recordState(state: AppState): AppState {
  // Lazy import is unnecessary: this pure capture deliberately contains no generated history.
  const at = new Date().toISOString();
  const snapshots = [...new Set(state.courses.map((c) => c.semester))].map(
    (semester) => ({
      at,
      semester,
      ...snapshotScores(state.courses.filter((c) => c.semester === semester)),
    }),
  );
  return {
    ...state,
    snapshots: [...state.snapshots, ...snapshots].slice(-5000),
  };
}
import { snapshotScores } from "../lib/calculations";
