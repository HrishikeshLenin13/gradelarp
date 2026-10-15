import { z } from "zod";
export const DistrictId = z.enum(["lisd", "rrisd"]);
export type DistrictId = z.infer<typeof DistrictId>;
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
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
export class HacError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 422,
    public details?: { databases?: { id: string; name: string }[] },
  ) {
    super(message);
    this.name = "HacError";
  }
}

/** Survives Next dev module re-evaluation without trusting an arbitrary name. */
export function isHacError(error: unknown): error is HacError {
  return (
    error instanceof HacError ||
    (error instanceof Error &&
      errorBrand in error &&
      error[errorBrand] === true)
  );
}
