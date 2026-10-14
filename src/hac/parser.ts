import { load } from "cheerio";
import { CourseSchema } from "../lib/model";
import {
  HacError,
  SnapshotSchema,
  type DistrictId,
  type HacSnapshot,
} from "./types";
const remoteId = /^[a-zA-Z0-9_-]{1,80}$/;
export function parseFixture(
  html: string,
  district: DistrictId,
  now = new Date(),
): HacSnapshot {
  if (Buffer.byteLength(html) > 1_000_000)
    throw new HacError(
      "PAGE_SIZE",
      "The source page exceeds the parser limit.",
    );
  const $ = load(html);
  if ($("[data-login-error]").length)
    throw new HacError(
      "AUTH_FAILED",
      "The mock sign-in was rejected. Choose the normal fixture and reconnect.",
      401,
    );
  const root = $('main[data-fixture="gradelarp-hac-v1"]');
  if (root.length !== 1)
    throw new HacError(
      "PAGE_FORMAT",
      "The source page format is not recognized. No grades were changed.",
    );
  if (root.attr("data-district") !== district)
    throw new HacError(
      "DISTRICT_MISMATCH",
      "The response belongs to another district. No grades were changed.",
    );
  const studentId = root.attr("data-student") ?? "";
  if (!remoteId.test(studentId))
    throw new HacError("STUDENT_ID", "The source student identity is missing.");
  const courses: HacSnapshot["courses"] = [],
    issues: string[] = [];
  const seen = new Set<string>();
  const sections = root.find("[data-course]");
  if (!sections.length || sections.length > 100)
    throw new HacError(
      "PAGE_FORMAT",
      "The course list is missing or too large.",
    );
  for (const el of sections.toArray()) {
    const node = $(el),
      rid = node.attr("data-course") ?? "";
    if (!remoteId.test(rid) || seen.has(rid))
      throw new HacError(
        "DUPLICATE_COURSE",
        "The source contains missing or duplicate course identifiers.",
      );
    seen.add(rid);
    try {
      const cid = `hac:${district}:${studentId}:${rid}`;
      if (
        node.find("[data-assignments]").length !== 1 ||
        node.find("[data-categories]").length !== 1
      )
        throw new Error("Required grade tables are missing");
      const categories = node
        .find("[data-categories] tbody tr")
        .toArray()
        .map((row) => {
          const c = $(row),
            id = c.attr("data-id") ?? "";
          if (!remoteId.test(id) || !c.attr("data-weight"))
            throw new Error("Category identifier or weight is missing");
          return {
            id: `${cid}:${id}`,
            name: c.text().trim(),
            weight: Number(c.attr("data-weight")),
          };
        });
      const assignments = node
        .find("[data-assignments] tbody tr")
        .toArray()
        .map((row) => {
          const a = $(row),
            id = a.attr("data-id") ?? "";
          if (!remoteId.test(id))
            throw new Error("Assignment identifier is missing");
          return {
            id: `${cid}:${id}`,
            name: a.text().trim(),
            categoryId: `${cid}:${a.attr("data-category")}`,
            status: a.attr("data-status"),
            earned: a.attr("data-earned")?.trim()
              ? Number(a.attr("data-earned"))
              : null,
            possible: Number(a.attr("data-possible")),
            due: a.attr("data-due"),
          };
        });
      const parsed = CourseSchema.safeParse({
        id: cid,
        name: node.attr("data-name"),
        teacher: node.attr("data-teacher"),
        level: node.attr("data-level"),
        semester: node.attr("data-term"),
        credits: Number(node.attr("data-credits")),
        mode: "weighted",
        target: 90,
        color: "#93536f",
        categories,
        assignments,
      });
      if (!parsed.success)
        throw new Error("Course fields or grade values are invalid");
      const raw = node.attr("data-average"),
        avg = raw?.trim() ? Number(raw) : null;
      if (avg !== null && (!Number.isFinite(avg) || avg < 0 || avg > 100))
        throw new Error("Reported average is invalid");
      courses.push({
        remoteId: rid,
        course: parsed.data,
        reportedAverage: avg,
      });
    } catch {
      // Do not expose page content or parser exception payloads in logs/errors.
      issues.push(
        `Course ${rid}: incomplete or invalid grade data; existing records will be kept.`,
      );
    }
  }
  if (!courses.length)
    throw new HacError(
      "NO_VALID_COURSES",
      "No course passed validation. No grades were changed.",
    );
  const transcript = root
    .find("[data-transcript] tbody tr")
    .toArray()
    .map((row) => {
      const r = $(row);
      return {
        course: r.text().trim(),
        term: r.attr("data-term"),
        grade: Number(r.attr("data-grade")),
        credits: Number(r.attr("data-credits")),
      };
    });
  const rank = root.find("[data-rank]");
  const parsed = SnapshotSchema.safeParse({
    mode: "mock",
    district,
    studentId,
    studentName: root.find("[data-student-name]").text().trim(),
    fetchedAt: now.toISOString(),
    status: issues.length ? "partial" : "complete",
    issues,
    courses,
    transcript,
    rank: rank.length
      ? {
          position: Number(rank.attr("data-rank")),
          cohort: Number(rank.attr("data-cohort")),
        }
      : null,
  });
  if (!parsed.success)
    throw new HacError(
      "PAGE_FORMAT",
      "Academic record fields are invalid. No grades were changed.",
    );
  return parsed.data;
}
