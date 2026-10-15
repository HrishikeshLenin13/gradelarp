import { z } from "zod";
const text = z.string().trim().min(1).max(300);
// Source display text is not a short manual-entry label. Keep it intact.
const sourceLabel = z.string().trim().min(1).max(16_384);
export const SourceAssignmentSchema = z.object({
  id: text,
  name: sourceLabel,
  category: z.string().max(4096),
  due: z.string().max(512).nullable(),
  score: z.string().max(2048),
  earned: z.number().finite().nonnegative().nullable(),
  possible: z.number().finite().positive().nullable(),
  possibleText: z.string().max(2048).optional(),
  status: z.enum([
    "graded",
    "missing",
    "ungraded",
    "exempt",
    "dropped",
    "unknown",
  ]),
});
export const SourceCourseSchema = z.object({
  id: text,
  name: sourceLabel,
  teacher: z.string().max(4096),
  average: z.number().finite().min(0).max(1000).nullable(),
  averageText: z.string().max(2048),
  assignmentsAvailable: z.boolean(),
  assignments: z.array(SourceAssignmentSchema).max(10000),
  categories: z
    .array(
      z.object({
        name: sourceLabel,
        weight: z.number().finite().min(0).nullable(),
        weightText: z.string().max(2048).optional(),
        percentText: z.string().max(2048).optional(),
      }),
    )
    .max(100),
});
export const LiveSnapshotSchema = z
  .object({
    mode: z.literal("live"),
    portal: z.url(),
    studentId: text,
    studentName: text,
    term: z.string().max(2048),
    fetchedAt: z.iso.datetime(),
    status: z.enum(["complete", "partial"]),
    issues: z.array(z.string().max(20_000)).max(500),
    courses: z.array(SourceCourseSchema).max(500),
  })
  .superRefine((s, ctx) => {
    if (new Set(s.courses.map((c) => c.id)).size !== s.courses.length)
      ctx.addIssue({
        code: "custom",
        message: "Duplicate course identifiers.",
      });
  });
export type LiveSnapshot = z.infer<typeof LiveSnapshotSchema>;
export type SourceCourse = z.infer<typeof SourceCourseSchema>;
export const LiveSessionSchema = z.object({
  mode: z.literal("live"),
  portal: z.url(),
  studentId: text,
  studentName: text,
  expiresAt: z.iso.datetime(),
});
export type LiveSession = z.infer<typeof LiveSessionSchema>;
export const LiveConnectionSchema = z.object({
  mode: z.literal("live"),
  portal: z.url(),
  studentId: text,
  lastSync: z.iso.datetime(),
  snapshot: LiveSnapshotSchema,
});
export const LiveResponseSchema = z.object({
  session: LiveSessionSchema.nullable(),
  portalCheck: z.object({ portal: z.url(), ready: z.literal(true) }).optional(),
  snapshot: LiveSnapshotSchema.optional(),
});
export const LiveCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }).strict(),
  z
    .object({ action: z.literal("probe"), portal: z.string().min(1).max(500) })
    .strict(),
  z
    .object({
      action: z.literal("connect"),
      portal: z.string().min(1).max(500),
      username: z.string().trim().min(1).max(200),
      password: z.string().min(1).max(500),
      database: z.string().max(80).optional(),
    })
    .strict(),
  z.object({ action: z.literal("sync") }).strict(),
  z.object({ action: z.literal("disconnect") }).strict(),
]);
