import { describe, it, expect } from "vitest";
import {
  snapshotScores,
  assignmentChanges,
  courseGrade,
  gpa,
  cumulativeGpa,
  requiredScore,
  scenarioCourse,
  categoryBreakdown,
  semesterProgress,
} from "../src/lib/calculations";
import {
  defaultPolicy,
  CourseSchema,
  type Course,
  type Assignment,
} from "../src/lib/model";
const a = (
  id: string,
  categoryId: string,
  earned: number | null,
  possible = 100,
  status: Assignment["status"] = "graded",
): Assignment => ({
  id,
  name: id,
  categoryId,
  earned,
  possible,
  status,
  due: "2026-10-15",
});
const c = (
  assignments: Assignment[],
  mode: Course["mode"] = "weighted",
): Course => ({
  id: "c",
  name: "Calculus",
  teacher: "Teacher",
  credits: 0.5,
  level: "Regular",
  semester: "Fall 2026",
  target: 90,
  color: "#aaaaaa",
  mode,
  categories: [
    { id: "test", name: "Test", weight: 60 },
    { id: "work", name: "Work", weight: 40 },
  ],
  assignments,
});
describe("grade calculations", () => {
  it("returns null for no graded work", () =>
    expect(courseGrade(c([]))).toBeNull());
  it("weights category points, not assignment percentages", () =>
    expect(
      courseGrade(c([a("a", "test", 90), a("b", "work", 40, 50)])),
    ).toBeCloseTo(86));
  it("renormalizes only populated categories", () =>
    expect(courseGrade(c([a("a", "test", 90)]))).toBe(90));
  it("uses total points for point-based courses", () =>
    expect(
      courseGrade(c([a("a", "test", 90), a("b", "work", 40, 50)], "points")),
    ).toBeCloseTo(86.6666667));
  it("counts missing work as zero even with stale score", () =>
    expect(
      courseGrade(c([a("a", "test", 90), a("b", "test", 50, 100, "missing")])),
    ).toBe(45));
  for (const status of ["exempt", "dropped", "ungraded", "future"] as const)
    it(`excludes ${status} work`, () =>
      expect(
        courseGrade(c([a("a", "test", 90), a("b", "test", null, 100, status)])),
      ).toBe(90));
  it("does not count zero-weight categories", () =>
    expect(
      courseGrade({
        ...c([a("a", "work", 50)]),
        categories: [
          { id: "test", name: "Test", weight: 100 },
          { id: "work", name: "Work", weight: 0 },
        ],
      }),
    ).toBeNull());
  it("shows category totals", () =>
    expect(categoryBreakdown(c([a("a", "test", 90)]))[0].earned).toBe(90));
  it("finds minimum target score", () =>
    expect(
      requiredScore(
        c([a("a", "test", 80)]),
        a("future", "test", null, 100, "future"),
        90,
      ),
    ).toBe(100));
  it("detects unreachable targets", () =>
    expect(
      requiredScore(
        c([a("a", "test", 50)]),
        a("future", "test", null, 100, "future"),
        90,
      ),
    ).toBeNull());
  it("returns zero if target is already guaranteed", () =>
    expect(
      requiredScore(
        c([a("a", "test", 100)]),
        a("future", "test", null, 1, "future"),
        90,
      ),
    ).toBe(0));
  it("replaces a score without duplicating assignments", () =>
    expect(
      scenarioCourse(c([a("a", "test", 80)]), a("a", "test", 80), 90)
        .assignments,
    ).toHaveLength(1));
  it("rejects invalid category weights", () =>
    expect(() =>
      CourseSchema.parse({
        ...c([]),
        categories: [{ id: "x", name: "X", weight: 30 }],
      }),
    ).toThrow());
  it("rejects scores above possible points", () =>
    expect(() => CourseSchema.parse(c([a("a", "test", 101)]))).toThrow());
  it("clamps semester progress", () =>
    expect(
      semesterProgress("2026-01-01", "2026-02-01", new Date("2026-03-01")),
    ).toBe(100));
});
describe("GPA calculations", () => {
  const ap = { ...c([a("a", "test", 95)]), level: "AP" as const };
  const regular = { ...c([a("b", "test", 85)]), credits: 1 };
  it("weights quality points by credits", () =>
    expect(gpa([ap, regular], defaultPolicy)?.value).toBeCloseTo(3.6666667));
  it("can disable weighted bonuses", () =>
    expect(gpa([ap], defaultPolicy, false)?.value).toBe(4));
  it("does not apply bonuses to failing AP courses", () =>
    expect(
      gpa([{ ...ap, assignments: [a("a", "test", 50)] }], defaultPolicy)?.value,
    ).toBe(0));
  it("excludes ungraded courses", () =>
    expect(gpa([c([])], defaultPolicy)).toBeNull());
  it("combines prior quality points correctly", () =>
    expect(
      cumulativeGpa([ap], { ...defaultPolicy, priorCredits: 0.5, priorGpa: 3 }),
    ).toBe(4));
  it("uses an exact unrounded threshold", () =>
    expect(gpa([c([a("a", "test", 89.99)])], defaultPolicy)?.value).toBe(3));
});

describe("actual assignment snapshots", () => {
  it("captures entered assignment values and distinguishes ungraded work", () => {
    const scores = snapshotScores([
      c([a("a", "test", 90), a("b", "test", null, 100, "future")]),
    ]);
    expect(scores.assignments.c.a.percent).toBe(90);
    expect(scores.assignments.c.b.percent).toBeNull();
  });
  it("reports only actual assignment changes between captured states", () => {
    const course = c([a("a", "test", 90)]);
    const next = { ...course, assignments: [a("a", "test", 100)] };
    const snapshots = [
      {
        at: "2026-10-13T10:00:00Z",
        semester: "Fall 2026",
        ...snapshotScores([course]),
      },
      {
        at: "2026-10-13T11:00:00Z",
        semester: "Fall 2026",
        ...snapshotScores([next]),
      },
    ];
    const changes = assignmentChanges(snapshots, [next]);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ before: 90, after: 100 });
  });
  it("does not create changes from identical snapshots", () => {
    const course = c([a("a", "test", 90)]);
    const scores = snapshotScores([course]);
    expect(
      assignmentChanges(
        [
          { at: "2026-10-13T10:00:00Z", semester: "Fall 2026", ...scores },
          { at: "2026-10-13T11:00:00Z", semester: "Fall 2026", ...scores },
        ],
        [course],
      ),
    ).toEqual([]);
  });
});
