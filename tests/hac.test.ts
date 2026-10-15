import { describe, it, expect } from "vitest";
import { fixtureHtml } from "../src/hac/fixtures";
import { parseFixture } from "../src/hac/parser";
import {
  applyImport,
  newSandbox,
  previewImport,
  removeImported,
} from "../src/hac/sync";
import { validateDestination } from "../src/hac/districts";
import { MockHacService, readCommand } from "../src/hac/server";
import {
  ProductSchema,
  newProfile,
  parseProductBackup,
} from "../src/product/model";
import { courseGrade } from "../src/lib/calculations";
const snapshot = (scenario: Parameters<typeof fixtureHtml>[1] = "normal") =>
  parseFixture(
    fixtureHtml("lisd", scenario),
    "lisd",
    new Date("2026-10-14T12:00:00Z"),
  );
const imported = () => {
  const s = snapshot();
  return applyImport(newSandbox(s), s).profile;
};
describe("synthetic HTML contract", () => {
  it("normalizes courses, category weights, statuses, points and source averages separately", () => {
    const s = snapshot();
    expect(s.mode).toBe("mock");
    expect(s.status).toBe("complete");
    expect(s.courses).toHaveLength(2);
    const c = s.courses[0].course;
    expect(c.assignments).toHaveLength(4);
    expect(c.assignments[2].earned).toBeNull();
    expect(c.assignments[3].status).toBe("missing");
    expect(courseGrade(c)).toBe(75);
    expect(s.courses[0].reportedAverage).toBe(88);
    expect(s.transcript).toHaveLength(1);
    expect(s.rank).toEqual({ position: 12, cohort: 240 });
  });
  it("supports both district namespaces without collisions", () => {
    const r = parseFixture(fixtureHtml("rrisd"), "rrisd");
    expect(r.courses[0].course.id).not.toBe(snapshot().courses[0].course.id);
  });
  it("distinguishes an empty assignment table from a missing table", () => {
    expect(snapshot("empty").courses[0].course.assignments).toEqual([]);
    const s = snapshot("partial");
    expect(s.status).toBe("partial");
    expect(s.courses).toHaveLength(1);
    expect(s.issues[0]).toContain("english");
  });
  it.each(["auth-error", "malformed", "district-mismatch"] as const)(
    "rejects %s instead of reporting sync success",
    (scenario) => {
      expect(() => snapshot(scenario)).toThrow();
    },
  );
  it("rejects duplicate courses, duplicate assignments and unknown statuses", () => {
    const html = fixtureHtml("lisd");
    expect(() =>
      parseFixture(
        html.replace('data-course="english"', 'data-course="algebra"'),
        "lisd",
      ),
    ).toThrow(/duplicate/);
    const duplicate = parseFixture(
      html.replace('data-id="practice-1"', 'data-id="quiz-1"'),
      "lisd",
    );
    expect(duplicate.status).toBe("partial");
    expect(duplicate.courses.map((c) => c.remoteId)).toEqual(["english"]);
    const unknown = parseFixture(
      html.replace('data-status="graded"', 'data-status="mystery"'),
      "lisd",
    );
    expect(unknown.status).toBe("partial");
  });
  it("rejects oversized pages and invalid scores without turning them into zeros", () => {
    expect(() => parseFixture(" ".repeat(1_000_001), "lisd")).toThrow(/limit/);
    expect(
      parseFixture(
        fixtureHtml("lisd").replace('data-earned="85"', 'data-earned="NaN"'),
        "lisd",
      ).status,
    ).toBe("partial");
  });
});
describe("request guards", () => {
  const req = (
    body: string,
    headers: Record<string, string> = {},
    url = "http://localhost:3000/api/hac",
  ) =>
    new Request(url, {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
        ...headers,
      },
      body,
    });
  it("accepts same-origin JSON without query secrets", async () =>
    expect(await readCommand(req('{"action":"status"}'))).toEqual({
      action: "status",
    }));
  it("rejects cross-origin, query secrets, non-JSON, oversize and remote HTTP requests", async () => {
    for (const r of [
      req("{}", { origin: "https://other.example" }),
      req("{}", {}, "http://localhost:3000/api/hac?pass=test"),
      req("{}", { "content-type": "text/plain" }),
      req(" ".repeat(2049)),
      req(
        "{}",
        { origin: "http://remote.example" },
        "http://remote.example/api/hac",
      ),
    ])
      await expect(readCommand(r)).rejects.toThrow();
  });
});
