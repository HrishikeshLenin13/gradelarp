import type { Course, GpaPolicy, Assignment, AppState } from "./model";
export function included(a: Assignment) {
  return a.status === "graded" || a.status === "missing";
}
type AssignmentTotals = { earned: number; possible: number };
function categoryTotals(assignments: Assignment[]) {
  const totals = new Map<string, AssignmentTotals>();
  for (const assignment of assignments) {
    if (!included(assignment)) continue;
    const current = totals.get(assignment.categoryId);
    const earned =
      assignment.status === "missing" ? 0 : (assignment.earned ?? 0);
    if (current) {
      current.earned += earned;
      current.possible += assignment.possible;
    } else {
      totals.set(assignment.categoryId, {
        earned,
        possible: assignment.possible,
      });
    }
  }
  return totals;
}
export function courseGrade(course: Course): number | null {
  if (course.assignments.some(a => included(a) && (!Number.isFinite(a.possible) || a.possible < 0 || (a.status === "graded" && a.earned !== null && !Number.isFinite(a.earned))))) return null;
  if (course.mode === "points") {
    let earned = 0,
      possible = 0;
    for (const assignment of course.assignments) {
      if (!included(assignment)) continue;
      possible += assignment.possible;
      earned +=
        assignment.status === "missing" ? 0 : (assignment.earned ?? 0);
    }
    return possible ? (earned / possible) * 100 : null;
  }
  if (new Set(course.categories.map(c => c.id)).size !== course.categories.length || course.categories.some(c => !Number.isFinite(c.weight) || c.weight < 0)) return null;
  const totals = categoryTotals(course.assignments);
  let total = 0,
    weights = 0;
  for (const category of course.categories) {
    const categoryTotal = totals.get(category.id);
    if (categoryTotal?.possible && category.weight > 0) {
      total +=
        (categoryTotal.earned / categoryTotal.possible) *
        100 *
        category.weight;
      weights += category.weight;
    }
  }
  return weights ? total / weights : null;
}
export function gradeLetter(grade: number | null, policy: GpaPolicy) {
  if (grade === null) return "—";
  return (
    [...policy.scale].sort((a, b) => b.min - a.min).find((s) => grade >= s.min)
      ?.letter ?? "F"
  );
}
export function gpa(courses: Course[], policy: GpaPolicy, weighted = true) {
  let sum = 0,
    credits = 0;
  const scale = [...policy.scale].sort((a, b) => b.min - a.min);
  for (const course of courses) {
    const grade = courseGrade(course);
    if (grade === null || !Number.isFinite(grade) || !Number.isFinite(course.credits) || course.credits <= 0) continue;
    let points =
      scale.find((threshold) => grade >= threshold.min)?.points ?? 0;
    if (weighted && grade >= policy.bonusMinimum)
      points +=
        course.level === "AP"
          ? policy.apBonus
          : course.level === "Honors"
            ? policy.honorsBonus
            : 0;
    sum += points * course.credits;
    credits += course.credits;
  }
  return credits ? { value: sum / credits, credits, qualityPoints: sum } : null;
}
export function cumulativeGpa(courses: Course[], policy: GpaPolicy) {
  const current = gpa(courses, policy);
  const credits = (current?.credits ?? 0) + policy.priorCredits;
  return credits
    ? ((current?.qualityPoints ?? 0) + policy.priorCredits * policy.priorGpa) /
        credits
    : null;
}
export function averageGrade(courses: Course[]) {
  const grades = courses
    .map(courseGrade)
    .filter((g): g is number => g !== null);
  return grades.length
    ? grades.reduce((a, b) => a + b, 0) / grades.length
    : null;
}
export function scenarioCourse(
  course: Course,
  assignment: Assignment,
  percent: number,
) {
  const newAssignment = {
    ...assignment,
    earned: (assignment.possible * percent) / 100,
    status: "graded" as const,
  };
  return {
    ...course,
    assignments: [
      ...course.assignments.filter((a) => a.id !== assignment.id),
      newAssignment,
    ],
  };
}
export function requiredScore(
  course: Course,
  assignment: Assignment,
  target: number,
): number | null {
  if (!Number.isFinite(target) || !Number.isFinite(assignment.possible) || assignment.possible <= 0) return null;
  const range = assignmentGradeRange(course, assignment);
  if (!range || range.maximum + 1e-8 < target) return null;
  if (range.minimum >= target) return 0;
  const span = range.maximum - range.minimum;
  if (span <= 0) return null;
  const percent = (target - range.minimum) / span * 100;
  return Math.min(100, Math.max(0, Math.ceil(percent * 100 - 1e-8) / 100));
}
export function categoryBreakdown(course: Course) {
  const totals = categoryTotals(course.assignments);
  return course.categories.map((c) => {
    const { earned = 0, possible = 0 } = totals.get(c.id) ?? {};
    return {
      ...c,
      earned,
      possible,
      grade: possible ? (earned / possible) * 100 : null,
    };
  });
}
/** Remaining calendar days, excluding today; null means no valid end date. */
export function semesterDaysRemaining(end: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isFinite(now.getTime())) return null;
  const finish = new Date(end + "T00:00:00Z");
  if (!Number.isFinite(finish.getTime()) || finish.toISOString().slice(0, 10) !== end) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((finish.getTime() - today) / 86_400_000));
}

export function semesterProgress(start: string, end: string, now = new Date()) {
  const from = new Date(start + "T00:00:00").getTime(),
    to = new Date(end + "T23:59:59").getTime();
  if (![from, to, now.getTime()].every(Number.isFinite) || to <= from) return 0;
  return Math.min(
    100,
    Math.max(0, ((now.getTime() - from) / (to - from)) * 100),
  );
}

/** Snapshot only the values actually entered at the moment of capture. */
export function snapshotScores(courses: Course[]) {
  return {
    grades: Object.fromEntries(courses.map((c) => [c.id, courseGrade(c)])),
    assignments: Object.fromEntries(
      courses.map((c) => [
        c.id,
        Object.fromEntries(
          c.assignments.map((a) => [
            a.id,
            {
              name: a.name,
              status: a.status,
              percent: assignmentPercent(a),
            },
          ]),
        ),
      ]),
    ),
  };
}
/** Historical changes come from adjacent real snapshots, never a demo timeline. */
export function assignmentChanges(
  snapshots: AppState["snapshots"],
  courses: Course[],
) {
  const changes: Array<{
    id: string;
    at: string;
    course: Course;
    name: string;
    before: number | null;
    after: number | null;
    status: string;
  }> = [];
  const bySemester = new Map<string, AppState["snapshots"][number]>();
  for (const [index, snapshot] of snapshots.entries()) {
    const previous = bySemester.get(snapshot.semester);
    bySemester.set(snapshot.semester, snapshot);
    if (!previous?.assignments || !snapshot.assignments) continue;
    for (const course of courses) {
      const old = previous.assignments[course.id],
        current = snapshot.assignments[course.id];
      if (!old || !current) continue;
      for (const [id, grade] of Object.entries(current)) {
        const before = old[id];
        if (
          before &&
          (before.percent !== grade.percent || before.status !== grade.status)
        )
          changes.push({
            id: `${index}/${course.id}/${id}`,
            at: snapshot.at,
            course,
            name: grade.name,
            before: before.percent,
            after: grade.percent,
            status: grade.status,
          });
      }
    }
  }
  return changes.reverse();
}

/** Weekday planning estimate; explicit exclusions are not school-calendar sync. */
export function semesterWeekdaysRemaining(end: string, now = new Date(), excludedDates: string[] = []): number | null {
  const days = semesterDaysRemaining(end, now);
  if (days === null) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let result = Math.floor(days / 7) * 5;
  for (let offset = 1; offset <= days % 7; offset++) {
    const weekday = new Date(today + offset * 86_400_000).getUTCDay();
    if (weekday !== 0 && weekday !== 6) result++;
  }
  const last = today + days * 86_400_000;
  for (const date of new Set(excludedDates)) {
    const at = Date.parse(date + "T00:00:00Z");
    if (Number.isFinite(at) && at > today && at <= last && new Date(at).toISOString().slice(0,10) === date) {
      const weekday = new Date(at).getUTCDay();
      if (weekday !== 0 && weekday !== 6) result--;
    }
  }
  return result;
}

/** Non-graded or malformed work has no grade. */
export function assignmentPercent(assignment: Assignment): number | null {
  if (assignment.status === "missing") return 0;
  if (assignment.status !== "graded" || assignment.earned === null || !Number.isFinite(assignment.earned) || !Number.isFinite(assignment.possible) || assignment.possible <= 0) return null;
  return assignment.earned / assignment.possible * 100;
}

/** Reachable grade interval; does not mutate a course. */
export function assignmentGradeRange(course: Course, assignment: Assignment) {
  if (!Number.isFinite(assignment.possible) || assignment.possible <= 0) return null;
  const minimum = courseGrade(scenarioCourse(course, assignment, 0));
  const maximum = courseGrade(scenarioCourse(course, assignment, 100));
  if (minimum === null || maximum === null || !Number.isFinite(minimum) || !Number.isFinite(maximum)) return null;
  return { minimum, maximum };
}
