import { describe, it, expect } from "vitest";
import { applyLiveSnapshot } from "../src/hac/live-sync";
import { parseLiveAssignments } from "../src/hac/live-parser";
import { gradebook } from "./fixtures/hac-pages";
import {
  newProfile,
  parseProductBackup,
  type ProductData,
} from "../src/product/model";
import {
  sourceDate,
  sourcePlannerAssignments,
  profileCourseCatalog,
} from "../src/product/source-records";
const snapshot = () =>
  parseLiveAssignments(
    gradebook(),
    "https://hac.example.edu/HomeAccess",
    "Test Student",
    "student-id",
    new Date("2026-10-15T12:00:00Z"),
  );
const initial = (): ProductData => {
  const p = newProfile("Personal");
  return {
    format: "gradelarp-product",
    version: 2,
    activeProfileId: p.id,
    profiles: [p],
  };
};
describe("source feature integration", () => {
  it("creates one real first history point and does not duplicate unchanged school averages", () => {
    const one = applyLiveSnapshot(initial(), snapshot());
    const s = snapshot();
    s.fetchedAt = "2026-10-15T12:01:00Z";
    const two = applyLiveSnapshot(one, s);
    expect(two.profiles[1].hacLive?.history).toHaveLength(1);
    expect(two.profiles[1].hacLive?.lastSync).toBe(s.fetchedAt);
    expect(two.profiles).toHaveLength(2);
  });
  it("records changed reported averages without copying assignment payloads into history", () => {
    const one = applyLiveSnapshot(initial(), snapshot());
    const s = snapshot();
    s.fetchedAt = "2026-10-15T12:02:00Z";
    s.courses[0].average = 91;
    s.courses[0].averageText = "91.00";
    const two = applyLiveSnapshot(one, s);
    const points = two.profiles[1].hacLive!.history;
    expect(points).toHaveLength(2);
    expect(points[1].courses[0].averageText).toBe("91.00");
    expect(points[1].courses[0]).not.toHaveProperty("assignments");
    expect(one.profiles[1].hacLive!.snapshot.courses[0].averageText).toBe(
      "88.00",
    );
  });
  it("retains only the most recent sixty observed history entries", () => {
    let data = initial();
    for (let i = 0; i < 70; i++) {
      const s = snapshot();
      s.fetchedAt = new Date(Date.UTC(2026, 9, 15, 12, i)).toISOString();
      s.courses[0].average = i;
      s.courses[0].averageText = String(i);
      data = applyLiveSnapshot(data, s);
    }
    expect(data.profiles[1].hacLive!.history).toHaveLength(60);
    expect(data.profiles[1].hacLive!.history[0].courses[0].average).toBe(10);
  });
  it("rejects an out-of-order older response without losing newer records or plans", () => {
    const newer = snapshot();
    newer.fetchedAt = "2026-10-15T13:00:00Z";
    newer.courses[0].averageText = "95";
    const data = applyLiveSnapshot(initial(), newer);
    expect(applyLiveSnapshot(data, snapshot())).toBe(data);
  });
  it("flags absent courses retained during a partial same-term sync as stale", () => {
    const one = applyLiveSnapshot(initial(), snapshot());
    const s = snapshot();
    s.status = "partial";
    s.fetchedAt = "2026-10-15T13:00:00Z";
    s.courses = [];
    const next = applyLiveSnapshot(one, s);
    expect(next.profiles[1].hacLive!.snapshot.courses[0]).toMatchObject({
      stale: true,
      averageText: "88.00",
    });
  });
  it("does not carry courses into a different term on a partial sync", () => {
    const one = applyLiveSnapshot(initial(), snapshot());
    const s = snapshot();
    s.status = "partial";
    s.term = "Quarter 2";
    s.courses = [];
    const next = applyLiveSnapshot(one, s);
    expect(next.profiles[1].hacLive!.snapshot.courses).toEqual([]);
  });
  it("keeps personal completion, tasks and all manual profiles through source refreshes", () => {
    const one = applyLiveSnapshot(initial(), snapshot());
    const p = one.profiles[1];
    p.tasks = [
      {
        id: "task",
        title: "Study",
        courseId: p.hacLive!.snapshot.courses[0].id,
        date: "2026-10-16",
        priority: "high",
        done: false,
        notes: "",
      },
    ];
    p.completedAssignments = ["hac:example"];
    const next = applyLiveSnapshot(one, snapshot());
    expect(next.profiles[0]).toEqual(one.profiles[0]);
    expect(next.profiles[1].tasks).toEqual(p.tasks);
    expect(next.profiles[1].completedAssignments).toEqual(
      p.completedAssignments,
    );
  });
  it("uses source course identities for personal academic tools, never invented grade policies", () => {
    const p = applyLiveSnapshot(initial(), snapshot()).profiles[1];
    expect(profileCourseCatalog(p)[0]).toMatchObject({
      name: "Algebra II",
      teacher: "Test Teacher",
      semester: "Quarter 1",
    });
    expect(p.state.courses).toEqual([]);
  });
  it("shows undated source assignments without inventing a calendar date or grade", () => {
    const p = applyLiveSnapshot(initial(), snapshot()).profiles[1];
    const rows = sourcePlannerAssignments(p);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "Upcoming work",
      date: "",
      sourceDate: null,
      kind: "source",
      done: false,
    });
    const before = structuredClone(p.hacLive!.snapshot);
    p.completedAssignments = [rows[0].key];
    expect(sourcePlannerAssignments(p)[0].done).toBe(true);
    expect(p.hacLive!.snapshot).toEqual(before);
  });
  it("round-trips source history and planning records in full backups", () => {
    const data = applyLiveSnapshot(initial(), snapshot());
    const restored = parseProductBackup(JSON.stringify(data));
    expect(restored.profiles[1].hacLive!.history).toEqual(
      data.profiles[1].hacLive!.history,
    );
  });
  it.each(["2026-10-15", "10/15/2026", "2/29/2024"])(
    "parses explicit full dates: %s",
    (raw) => expect(sourceDate(raw)).toMatch(/^\d{4}-\d{2}-\d{2}$/),
  );
  it.each([
    null,
    "10/15",
    "Tomorrow",
    "2/29/2025",
    "2/31/2026",
    "13/12/2026",
    "2026-02-30",
    "2026-13-01",
  ])("keeps ambiguous/invalid dates out of the calendar: %s", (raw) =>
    expect(sourceDate(raw)).toBeNull(),
  );
});

import { exportSourceCsv } from "../src/product/source-export";
import Papa from "papaparse";
it("exports actual source averages, raw marks and due strings, without a fabricated GPA", () => {
  const s = snapshot();
  const csv = exportSourceCsv(s);
  const rows = Papa.parse<Record<string, string>>(csv, { header: true }).data;
  expect(rows[0]).toMatchObject({
    course: "Algebra II",
    reported_average: "88.00",
    source_due: "10/12/2026",
    source_score: "85",
  });
  expect(rows[1].source_score).toBe("EX");
  expect(csv).not.toContain("GPA");
  expect(rows).toHaveLength(3);
});
it("retains reported course averages even when no assignment table was available", () => {
  const s = snapshot();
  s.courses[0].assignments = [];
  s.courses[0].assignmentsAvailable = false;
  const rows = Papa.parse<Record<string, string>>(exportSourceCsv(s), {
    header: true,
  }).data;
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    reported_average: "88.00",
    assignment: "",
    saved_from_earlier_sync: "yes",
  });
});
it("escapes spreadsheet formulas in untrusted source text", () => {
  const s = snapshot();
  s.courses[0].name = "=1+1";
  const rows = Papa.parse<Record<string, string>>(exportSourceCsv(s), {
    header: true,
  }).data;
  expect(rows[0].course).toBe("'=1+1");
});
