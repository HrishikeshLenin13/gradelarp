import { CourseSchema, type Course, type GpaPolicy } from "../lib/model";
import { categoryBreakdown, courseGrade, gpa } from "../lib/calculations";
import type { Scenario, Schedule, TranscriptRecord } from "./model";
export function courseFingerprint(course: Course) {
  return JSON.stringify([course.mode, course.categories, course.assignments]);
}
/** Immutable simulation. Stale/deleted references fail visibly instead of silently changing math. */
export function applyScenario(
  course: Course,
  scenario: Pick<Scenario, "courseId" | "changes" | "additions">,
): Course {
  if (scenario.courseId !== course.id)
    throw new Error("This scenario belongs to another course.");
  if (
    new Set(scenario.changes.map((x) => x.assignmentId)).size !==
    scenario.changes.length
  )
    throw new Error("Duplicate assignment changes.");
  for (const change of scenario.changes)
    if (!course.assignments.some((a) => a.id === change.assignmentId))
      throw new Error(
        "An assignment in this scenario was deleted. Reset or rebuild the scenario.",
      );
  return CourseSchema.parse({
    ...course,
    assignments: [
      ...course.assignments.map((a) => {
        const c = scenario.changes.find((x) => x.assignmentId === a.id);
        return c ? { ...a, earned: c.earned, status: c.status } : a;
      }),
      ...scenario.additions,
    ],
  });
}
export function calculationExplanation(course: Course) {
  const rows = categoryBreakdown(course);
  const activeWeight = rows
    .filter((x) => x.grade !== null && x.weight > 0)
    .reduce((n, x) => n + x.weight, 0);
  return {
    mode: course.mode,
    grade: courseGrade(course),
    activeWeight,
    rows: rows.map((r) => ({
      ...r,
      effectiveWeight:
        course.mode === "weighted" && r.grade !== null && activeWeight
          ? (r.weight / activeWeight) * 100
          : 0,
    })),
  };
}
export function requiredFutureGpa(
  qualityPoints: number,
  credits: number,
  target: number,
  futureCredits: number,
  maximum: number,
) {
  if (
    ![qualityPoints, credits, target, futureCredits, maximum].every(
      Number.isFinite,
    ) ||
    qualityPoints < 0 ||
    credits < 0 ||
    target < 0 ||
    futureCredits <= 0 ||
    maximum < 0
  )
    throw new Error("Enter valid credits and GPA values.");
  const raw =
    (target * (credits + futureCredits) - qualityPoints) / futureCredits;
  return {
    value: Math.max(0, raw),
    possible: raw <= maximum + 1e-10,
    alreadySecured: raw <= 0,
  };
}
export function maximumPoints(policy: GpaPolicy, level: Course["level"]) {
  const thresholds = [...policy.scale].sort((a, b) => b.min - a.min);
  const candidates = [
    0,
    100,
    policy.bonusMinimum,
    ...policy.scale.map((s) => s.min),
  ];
  return Math.max(
    ...candidates.map((grade) => {
      const points = thresholds.find((s) => grade >= s.min)?.points ?? 0;
      return (
        points +
        (grade >= policy.bonusMinimum
          ? level === "AP"
            ? policy.apBonus
            : level === "Honors"
              ? policy.honorsBonus
              : 0
          : 0)
      );
    }),
  );
}
export function transcriptCourses(records: TranscriptRecord[]): Course[] {
  return records.map((r) => ({
    id: `record-${r.id}`,
    name: r.course,
    teacher: "",
    level: r.level,
    semester: r.semester,
    credits: r.credits,
    mode: "points",
    target: 90,
    color: "#93536f",
    categories: [{ id: "final", name: "Final grade", weight: 100 }],
    assignments: [
      {
        id: r.id,
        name: "Entered final grade",
        categoryId: "final",
        earned: r.grade,
        possible: 100,
        status: "graded",
        due: "2000-01-01",
      },
    ],
  }));
}
export function cumulativeTotals(
  courses: Course[],
  policy: GpaPolicy,
  records: TranscriptRecord[] = [],
) {
  const actual = gpa([...courses, ...transcriptCourses(records)], policy);
  const credits = (actual?.credits ?? 0) + policy.priorCredits;
  const qualityPoints =
    (actual?.qualityPoints ?? 0) + policy.priorCredits * policy.priorGpa;
  return {
    credits,
    qualityPoints,
    value: credits ? qualityPoints / credits : null,
  };
}
export function bellStatus(
  schedules: Schedule[],
  semester: string,
  now = new Date(),
) {
  const today = schedules
    .filter((s) => s.day === now.getDay() && s.semester === semester)
    .sort((a, b) => a.start.localeCompare(b.start));
  const minute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const minutes = (s: string) =>
    Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const current = today.find(
    (s) => minutes(s.start) <= minute && minutes(s.end) > minute,
  );
  const next = today.find((s) => minutes(s.start) > minute);
  return current
    ? {
        kind: "current" as const,
        block: current,
        seconds: Math.ceil((minutes(current.end) - minute) * 60),
      }
    : next
      ? {
          kind: "next" as const,
          block: next,
          seconds: Math.ceil((minutes(next.start) - minute) * 60),
        }
      : null;
}
