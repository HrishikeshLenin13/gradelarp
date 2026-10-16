import Papa from "papaparse";
import type { LiveSnapshot } from "@/hac/live-types";
/** School source strings are exported verbatim (with spreadsheet formula escaping). */
export function exportSourceCsv(snapshot: LiveSnapshot) {
  const fields = [
    "portal",
    "term",
    "synced_at",
    "course",
    "teacher",
    "reported_average",
    "assignment",
    "category",
    "source_due",
    "source_score",
    "source_possible",
    "school_status",
    "saved_from_earlier_sync",
  ];
  const data = snapshot.courses.flatMap((course) =>
    (course.assignments.length ? course.assignments : [null]).map((a) => [
      snapshot.portal,
      snapshot.term,
      snapshot.fetchedAt,
      course.name,
      course.teacher,
      course.averageText,
      a?.name ?? "",
      a?.category ?? "",
      a?.due ?? "",
      a?.score ?? "",
      a
        ? (a.possibleText ?? (a.possible === null ? "" : String(a.possible)))
        : "",
      a?.status ?? "",
      course.stale || !course.assignmentsAvailable ? "yes" : "no",
    ]),
  );
  return Papa.unparse({ fields, data }, { escapeFormulae: true });
}
