import { describe, it, expect } from "vitest";
import { createDemo, emptyState } from "../src/lib/demo";
import { courseGrade, requiredScore, gpa } from "../src/lib/calculations";
import { defaultPolicy, type Course } from "../src/lib/model";
import {
  migrateLegacy,
  ProductSchema,
  newProfile,
  ProfileSchema,
  parseProductBackup,
  recordState,
  ScheduleSchema,
  currentSemester,
} from "../src/product/model";
import {
  applyScenario,
  calculationExplanation,
  courseFingerprint,
  cumulativeTotals,
  requiredFutureGpa,
  maximumPoints,
  bellStatus,
  transcriptCourses,
} from "../src/product/engine";
const course = () => createDemo().courses[0];
const scenario = (c: Course) => ({
  courseId: c.id,
  changes: [],
  additions: [],
});
describe("Expressive product migration and data separation", () => {
  it("migrates every legacy grade, snapshot, and setting without mutating input", () => {
    const old = createDemo();
    old.demo = false;
    old.settings.name = "Jordan";
    const json = JSON.stringify(old);
    const next = migrateLegacy(old);
    expect(next.profiles[0].state).toEqual(old);
    expect(JSON.stringify(old)).toBe(json);
    expect(next.profiles[0].name).toBe("Jordan");
    expect(next.profiles[0].preferences.appearance).toBe(old.settings.theme);
  });
  it("opens a blank real profile on a new device, never auto-generates grades", () => {
    const p = migrateLegacy(null).profiles[0];
    expect(p.state.demo).toBe(false);
    expect(p.state.courses).toEqual([]);
    expect(p.name).toBe("Student");
    expect(p.state.snapshots).toEqual([]);
  });
  it("rejects malformed legacy data rather than replacing it with demo", () => {
    expect(() => migrateLegacy({ version: 1, courses: [] })).toThrow();
  });
  it("keeps demo profiles structurally separate", () => {
    const p = newProfile("Real");
    const d = newProfile("Demo", true);
    expect(p.id).not.toBe(d.id);
    expect(p.state.courses).toHaveLength(0);
    expect(d.state.demo).toBe(true);
  });
  it("round-trips complete multi-profile backups", () => {
    const a = newProfile("A"),
      b = newProfile("B", true);
    b.state.demo = false;
    a.tasks = [
      {
        id: "task",
        title: "Study",
        date: "2026-10-14",
        courseId: "",
        priority: "high",
        done: false,
        notes: "Notes",
      },
    ];
    const data = {
      format: "gradelarp-product" as const,
      version: 2 as const,
      activeProfileId: a.id,
      profiles: [a, b],
    };
    expect(parseProductBackup(JSON.stringify(data))).toEqual(data);
  });
  it("imports legacy JSON as a preserved independent profile", () => {
    const old = createDemo();
    old.demo = false;
    expect(parseProductBackup(JSON.stringify(old)).profiles[0].state).toEqual(
      old,
    );
  });
  it("validates the active profile and unique profile identities", () => {
    const d = migrateLegacy(null);
    expect(
      ProductSchema.safeParse({ ...d, activeProfileId: "missing" }).success,
    ).toBe(false);
    expect(
      ProductSchema.safeParse({
        ...d,
        profiles: [d.profiles[0], d.profiles[0]],
      }).success,
    ).toBe(false);
  });
  it("captures only actual grades and every real semester", () => {
    const s = emptyState();
    s.courses = [
      course(),
      { ...course(), id: "spring", semester: "Spring 2027" },
    ];
    const updated = recordState(s);
    expect(updated.snapshots).toHaveLength(2);
    expect(updated.snapshots[0].grades[s.courses[0].id]).toBe(
      courseGrade(s.courses[0]),
    );
    expect(s.snapshots).toHaveLength(0);
  });
  it("validates duplicates and fields in academic records", () => {
    const p = newProfile();
    p.attendance = [
      {
        id: "1",
        date: "2026-10-14",
        courseId: "c",
        status: "present",
        note: "",
      },
      {
        id: "2",
        date: "2026-10-14",
        courseId: "c",
        status: "absent",
        note: "",
      },
    ];
    expect(ProfileSchema.safeParse(p).success).toBe(false);
  });
  it("rejects invalid backup JSON", () => {
    expect(() => parseProductBackup("not json")).toThrow();
    expect(() =>
      parseProductBackup('{"format":"gradelarp-product","version":99}'),
    ).toThrow();
  });
  it("derives a current semester label", () => {
    expect(currentSemester()).toMatch(/^(Spring|Fall) \d{4}$/);
  });
  it("keeps semester dates optional, distinct, and chronologically valid", () => {
    const p = newProfile();
    expect(p.periods).toEqual({});
    p.periods = {
      "Fall 2026": { start: "2026-08-17", end: "2026-12-18" },
      "Spring 2027": { start: "2027-01-11", end: "2027-05-28" },
    };
    expect(ProfileSchema.parse(p).periods).toEqual(p.periods);
    p.periods["Spring 2027"].end = "2027-01-01";
    expect(ProfileSchema.safeParse(p).success).toBe(false);
  });
});
describe("immutable multi-change what-if math", () => {
  it("applies multiple scores and keeps original deeply unchanged", () => {
    const c = course(),
      before = JSON.stringify(c);
    const s = {
      ...scenario(c),
      changes: [
        {
          assignmentId: c.assignments[0].id,
          earned: 100,
          status: "graded" as const,
        },
        {
          assignmentId: c.assignments[1].id,
          earned: 100,
          status: "graded" as const,
        },
      ],
    };
    const result = applyScenario(c, s);
    expect(courseGrade(result)).toBeCloseTo(97.2, 5);
    expect(JSON.stringify(c)).toBe(before);
    expect(courseGrade(c)).toBeCloseTo(94.9333333);
  });
  it("supports hypothetical additional assignments with correct category weights", () => {
    const c = course();
    const result = applyScenario(c, {
      ...scenario(c),
      additions: [
        {
          id: "hyp",
          name: "Exam",
          categoryId: "major",
          earned: 100,
          possible: 100,
          status: "graded",
          due: "2026-10-14",
        },
      ],
    });
    expect(courseGrade(result)).toBeCloseTo(95.5333333);
    expect(c.assignments).toHaveLength(7);
  });
  it("combines missing, exempt, and points grading correctly", () => {
    const c = { ...course(), mode: "points" as const };
    const result = applyScenario(c, {
      ...scenario(c),
      changes: [
        { assignmentId: c.assignments[0].id, earned: null, status: "missing" },
        { assignmentId: c.assignments[1].id, earned: null, status: "exempt" },
      ],
    });
    expect(courseGrade(result)).toBeCloseTo(((98 + 95 + 96 + 93) / 500) * 100);
  });
  it("solves a target while holding other hypothetical scores fixed", () => {
    const c = course();
    const result = applyScenario(c, {
      ...scenario(c),
      changes: [
        { assignmentId: c.assignments[1].id, earned: 100, status: "graded" },
      ],
    });
    const a = result.assignments[6];
    const needed = requiredScore(result, a, 95)!;
    expect(needed).toBeGreaterThan(0);
    const applied = applyScenario(result, {
      ...scenario(c),
      changes: [{ assignmentId: a.id, earned: needed, status: "graded" }],
    });
    expect(courseGrade(applied)).toBeGreaterThanOrEqual(95 - 1e-9);
  });
  it("reports unattainable targets", () => {
    const c = course();
    expect(requiredScore(c, c.assignments[6], 99)).toBeNull();
  });
  it("rejects extra credit, invalid categories, and duplicate assignment ids", () => {
    const c = course();
    expect(() =>
      applyScenario(c, {
        ...scenario(c),
        changes: [
          { assignmentId: c.assignments[0].id, earned: 101, status: "graded" },
        ],
      }),
    ).toThrow();
    expect(() =>
      applyScenario(c, {
        ...scenario(c),
        additions: [{ ...c.assignments[0], id: "new", categoryId: "absent" }],
      }),
    ).toThrow();
    expect(() =>
      applyScenario(c, { ...scenario(c), additions: [c.assignments[0]] }),
    ).toThrow();
  });
  it("rejects references to deleted assignments or different courses", () => {
    const c = course();
    expect(() =>
      applyScenario(c, {
        ...scenario(c),
        changes: [{ assignmentId: "deleted", earned: 100, status: "graded" }],
      }),
    ).toThrow(/deleted/);
    expect(() =>
      applyScenario(c, { ...scenario(c), courseId: "other" }),
    ).toThrow(/another course/);
  });
  it("detects underlying real data changes", () => {
    const c = course(),
      before = courseFingerprint(c);
    c.assignments[0].earned = 100;
    expect(courseFingerprint(c)).not.toBe(before);
  });
  it("excludes empty categories and exposes normalized effective weights", () => {
    const c = course();
    c.assignments = c.assignments.filter((a) => a.categoryId === "major");
    const e = calculationExplanation(c);
    expect(e.activeWeight).toBe(60);
    expect(e.rows[0].effectiveWeight).toBe(100);
    expect(e.rows[1].effectiveWeight).toBe(0);
    expect(e.grade).toBe(96);
  });
  it("does not fabricate a zero when all work is ungraded", () => {
    const c = course();
    c.assignments = c.assignments.map((a) => ({
      ...a,
      status: "future",
      earned: null,
    }));
    expect(courseGrade(applyScenario(c, scenario(c)))).toBeNull();
  });
  it("reset identity yields the exact original grade", () => {
    const c = course();
    expect(applyScenario(c, scenario(c))).toEqual(c);
  });
});
describe("GPA planning", () => {
  it("retains weighted and unweighted demo GPA", () => {
    const c = createDemo().courses;
    expect(gpa(c, defaultPolicy)?.value).toBeCloseTo(4.4166667);
    expect(gpa(c, defaultPolicy, false)?.value).toBeCloseTo(3.8333333);
  });
  it("combines unequal credits across semesters and prior quality points", () => {
    const a = course();
    a.credits = 1;
    const b = {
      ...course(),
      id: "b",
      semester: "Spring",
      credits: 3,
      level: "Regular" as const,
    };
    b.assignments = b.assignments.map((x) => ({
      ...x,
      earned: 80,
      status: "graded" as const,
    }));
    const policy = { ...defaultPolicy, priorCredits: 2, priorGpa: 3 };
    const total = cumulativeTotals([a, b], policy);
    expect(total.credits).toBe(6);
    expect(total.value).toBeCloseTo((5 + 9 + 6) / 6);
  });
  it("includes manual transcript records exactly once when supplied", () => {
    const records = [
      {
        id: "r",
        course: "Algebra",
        semester: "Fall 2025",
        level: "Regular" as const,
        credits: 1,
        grade: 85,
        note: "",
      },
    ];
    expect(courseGrade(transcriptCourses(records)[0])).toBe(85);
    expect(cumulativeTotals([], defaultPolicy, records)).toEqual({
      credits: 1,
      qualityPoints: 3,
      value: 3,
    });
  });
  it("computes the future GPA algebraically", () => {
    expect(requiredFutureGpa(30, 10, 3.5, 5, 4)).toEqual({
      value: 4.5,
      possible: false,
      alreadySecured: false,
    });
    expect(requiredFutureGpa(30, 10, 3.2, 10, 4).value).toBeCloseTo(3.4);
  });
  it("handles secured goals and exact maximum", () => {
    expect(requiredFutureGpa(40, 10, 2, 5, 4).alreadySecured).toBe(true);
    expect(requiredFutureGpa(40, 10, 4, 5, 4).possible).toBe(true);
  });
  it("rejects zero, negative and nonfinite future credits", () => {
    for (const n of [0, -1, NaN, Infinity])
      expect(() => requiredFutureGpa(40, 10, 4, n, 4)).toThrow();
  });
  it("uses the selected future course level maximum", () => {
    expect(maximumPoints(defaultPolicy, "Regular")).toBe(4);
    expect(maximumPoints(defaultPolicy, "Honors")).toBe(4.5);
    expect(maximumPoints(defaultPolicy, "AP")).toBe(5);
  });
  it("does not count an empty course in cumulative credits", () => {
    const c = course();
    c.assignments = [];
    expect(cumulativeTotals([c], defaultPolicy).credits).toBe(0);
  });
});
describe("bell schedules", () => {
  const block = {
    id: "x",
    title: "Calculus",
    courseId: "c",
    semester: "Fall 2026",
    day: 3,
    start: "08:30",
    end: "09:20",
    room: "201",
  };
  it("counts down to next class", () => {
    const now = new Date(2026, 9, 14, 8, 0, 0);
    const s = bellStatus([block], "Fall 2026", now);
    expect(s?.kind).toBe("next");
    expect(s?.seconds).toBe(1800);
  });
  it("counts down within an active class", () => {
    const s = bellStatus([block], "Fall 2026", new Date(2026, 9, 14, 9, 0, 0));
    expect(s?.kind).toBe("current");
    expect(s?.seconds).toBe(1200);
  });
  it("ends at the exact bell and filters semesters", () => {
    expect(
      bellStatus([block], "Fall 2026", new Date(2026, 9, 14, 9, 20, 0)),
    ).toBeNull();
    expect(
      bellStatus([block], "Spring", new Date(2026, 9, 14, 9, 0, 0)),
    ).toBeNull();
  });
  it("rejects invalid times and reversed blocks", () => {
    expect(ScheduleSchema.safeParse({ ...block, start: "25:00" }).success).toBe(
      false,
    );
    expect(ScheduleSchema.safeParse({ ...block, end: "08:00" }).success).toBe(
      false,
    );
  });
});
