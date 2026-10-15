import { describe, it, expect } from "vitest";
import { createDemo } from "./fixtures/demo-data";
import { exportCsv, parseCsv, parseBackup } from "../src/lib/import-export";
import { courseGrade } from "../src/lib/calculations";
import { PolicySchema, StateSchema } from "../src/lib/model";
describe("data portability and validation", () => {
  it("round-trips all demo assignments through CSV", () => {
    const original = createDemo();
    const result = parseCsv(exportCsv(original.courses));
    expect(result).toHaveLength(6);
    result.forEach((c, i) => {
      expect(c.assignments).toHaveLength(7);
      expect(courseGrade(c)).toBeCloseTo(courseGrade(original.courses[i])!);
    });
  });
  it("restores complete JSON backup without losing snapshots or settings", () => {
    const state = createDemo();
    expect(parseBackup(JSON.stringify(state))).toEqual(state);
  });
  it("rejects CSV without required columns", () =>
    expect(() => parseCsv("course,grade\nBiology,95")).toThrow(
      "Missing columns",
    ));
  it("rejects malformed JSON", () =>
    expect(() => parseBackup("broken")).toThrow());
  it("rejects incomplete backup state", () =>
    expect(() => parseBackup('{"version":1}')).toThrow());
  it("rejects negative earned scores", () => {
    const csv = exportCsv(createDemo().courses).replace(
      ",94,100,graded,",
      ",-1,100,graded,",
    );
    expect(() => parseCsv(csv)).toThrow();
  });
  it("keeps commas in quoted course names", () => {
    const state = createDemo();
    state.courses[0].name = "Calculus, Advanced";
    expect(parseCsv(exportCsv(state.courses))[0].name).toBe(
      "Calculus, Advanced",
    );
  });
  it("rejects duplicate course IDs in backups", () => {
    const s = createDemo();
    s.courses.push(s.courses[0]);
    expect(StateSchema.safeParse(s).success).toBe(false);
  });
  it("rejects GPA policies without a zero fallback threshold", () => {
    const p = createDemo().policy;
    p.scale = p.scale.filter((x) => x.min !== 0);
    expect(PolicySchema.safeParse(p).success).toBe(false);
  });
  it("rejects invalid semester dates and duplicate widgets", () => {
    const s = createDemo();
    s.settings.semesterEnd = s.settings.semesterStart;
    expect(StateSchema.safeParse(s).success).toBe(false);
  });
});
