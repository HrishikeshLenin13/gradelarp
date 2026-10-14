import { z } from "zod";
import { CourseSchema } from "../lib/model";
export const DistrictId = z.enum(["lisd", "rrisd"]);
export type DistrictId = z.infer<typeof DistrictId>;
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const FixtureCase = z.enum([
  "normal",
  "updated",
  "partial",
  "empty",
  "malformed",
  "auth-error",
  "district-mismatch",
]);
export type FixtureCase = z.infer<typeof FixtureCase>;
export const SnapshotSchema = z
  .object({
    mode: z.literal("mock"),
    district: DistrictId,
    studentId: id,
    studentName: z.string().min(1).max(100),
    fetchedAt: z.iso.datetime(),
    status: z.enum(["complete", "partial"]),
    issues: z.array(z.string().max(300)).max(100),
    courses: z
      .array(
        z.object({
          remoteId: id,
          course: CourseSchema,
          reportedAverage: z.number().min(0).max(100).nullable(),
        }),
      )
      .max(100),
    transcript: z
      .array(
        z.object({
          course: z.string().max(100),
          term: z.string().max(60),
          grade: z.number().min(0).max(100),
          credits: z.number().positive().max(20),
        }),
      )
      .max(100),
    rank: z
      .object({
        position: z.number().int().positive(),
        cohort: z.number().int().positive(),
      })
      .nullable(),
  })
  .superRefine((s, ctx) => {
    if (
      new Set(s.courses.map((c) => c.remoteId)).size !== s.courses.length ||
      new Set(s.courses.map((c) => c.course.id)).size !== s.courses.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate source courses." });
    if (s.rank && s.rank.position > s.rank.cohort)
      ctx.addIssue({ code: "custom", message: "Invalid rank." });
  });
export type HacSnapshot = z.infer<typeof SnapshotSchema>;
export const ImportStateSchema = z.object({
  mode: z.literal("mock"),
  district: DistrictId,
  studentId: id,
  lastImport: z.iso.datetime().nullable(),
  lastCompleteImport: z.iso.datetime().nullable(),
  imported: z.record(
    z.string(),
    z.object({
      courseId: z.string(),
      fingerprint: z.string(),
      reportedAverage: z.number().nullable(),
    }),
  ),
  ignored: z.array(id).max(100),
});
export type ImportState = z.infer<typeof ImportStateSchema>;
export const SessionSchema = z.object({
  district: DistrictId,
  studentName: z.literal("Jordan · Synthetic student"),
  expiresAt: z.iso.datetime(),
  mode: z.literal("mock"),
});
export type HacSession = z.infer<typeof SessionSchema>;
export class HacError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}
