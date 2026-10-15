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
describe("non-destructive reconciliation", () => {
  it("isolates synthetic imports and rejects manual profile targets", () => {
    const s = snapshot();
    expect(() => applyImport(newProfile(), s)).toThrow(/sandbox/);
    const p = imported();
    expect(p.state.demo).toBe(true);
    expect(p.hac?.mode).toBe("mock");
    expect(p.state.courses).toHaveLength(2);
  });
  it("duplicate import is idempotent and does not invent history", () => {
    const p = imported(),
      r = applyImport(p, snapshot());
    expect(r.changes).toBe(0);
    expect(r.profile.state.courses).toEqual(p.state.courses);
    expect(r.profile.state.snapshots).toEqual(p.state.snapshots);
  });
  it("updates only owned unchanged courses, retaining scenarios and manual additions", () => {
    const p = imported();
    p.state.courses.push({
      ...p.state.courses[0],
      id: "manual",
      name: "My manual course",
    });
    p.scenarios.push({
      id: "scenario",
      name: "What if",
      courseId: p.state.courses[0].id,
      createdAt: "2026-10-14T12:00:00Z",
      baseFingerprint: "snapshot",
      changes: [],
      additions: [],
    });
    const r = applyImport(p, snapshot("updated"));
    expect(r.changes).toBe(1);
    expect(r.profile.scenarios).toEqual(p.scenarios);
    expect(r.profile.state.courses.find((c) => c.id === "manual")).toEqual(
      p.state.courses[2],
    );
    expect(r.profile.state.courses[0].assignments[0].earned).toBe(95);
  });
  it("preserves manual edits to imported assignments and marks conflict", () => {
    const p = imported();
    p.state.courses[0].assignments[0].earned = 99;
    const r = applyImport(p, snapshot("updated"));
    expect(r.decisions[0].action).toBe("conflict");
    expect(r.profile.state.courses[0].assignments[0].earned).toBe(99);
  });
  it("partial import retains unavailable courses and last complete time", () => {
    const p = imported();
    const s = snapshot("partial");
    s.fetchedAt = "2026-10-14T13:00:00Z";
    const r = applyImport(p, s);
    expect(r.profile.state.courses).toEqual(p.state.courses);
    expect(r.profile.hac?.lastCompleteImport).toBe(p.hac?.lastCompleteImport);
    expect(r.profile.hac?.lastImport).toBe(s.fetchedAt);
  });
  it("rejects account/district mismatches", () => {
    const p = imported(),
      s = snapshot();
    s.studentId = "another";
    expect(() => applyImport(p, s)).toThrow(/matching/);
    expect(() =>
      applyImport(p, parseFixture(fixtureHtml("rrisd"), "rrisd")),
    ).toThrow(/matching/);
  });
  it("honors local deletion and never resurrects a removed source course", () => {
    const p = imported();
    p.state.courses.shift();
    expect(previewImport(p, snapshot())[0].action).toBe("conflict");
    const removed = removeImported(imported(), "algebra", true);
    expect(removed.state.courses).toHaveLength(1);
    expect(applyImport(removed, snapshot()).profile.state.courses).toHaveLength(
      1,
    );
  });
  it("detaches a local copy and round-trips provenance through backups", () => {
    const p = removeImported(imported(), "algebra", false);
    expect(p.state.courses).toHaveLength(2);
    expect(p.hac?.imported.algebra).toBeUndefined();
    expect(applyImport(p, snapshot()).decisions[0].action).toBe("ignored");
    const data = ProductSchema.parse({
      format: "gradelarp-product",
      version: 2,
      activeProfileId: p.id,
      profiles: [p],
    });
    expect(parseProductBackup(JSON.stringify(data))).toEqual(data);
    expect(() =>
      ProductSchema.parse({
        ...data,
        profiles: [{ ...p, state: { ...p.state, demo: false } }],
      }),
    ).toThrow();
  });
});
describe("server-only mock boundary", () => {
  it("creates opaque expiring sessions and revokes them on disconnect", () => {
    let now = 1000;
    const s = new MockHacService(() => now),
      c = s.handle({ action: "connect", mode: "mock", district: "lisd" });
    expect(c.token).toMatch(/^[a-f0-9]{64}$/);
    expect(s.handle({ action: "status" }, c.token).session?.district).toBe(
      "lisd",
    );
    now += 30 * 60 * 1000;
    expect(() =>
      s.handle(
        { action: "sync", district: "lisd", scenario: "normal" },
        c.token,
      ),
    ).toThrow(/ended/);
    const again = s.handle({
      action: "connect",
      mode: "mock",
      district: "rrisd",
    });
    s.handle({ action: "disconnect" }, again.token);
    expect(s.handle({ action: "status" }, again.token).session).toBeNull();
  });
  it("rejects credentials, live mode, arbitrary URLs, extra fields and wrong districts", () => {
    const s = new MockHacService();
    for (const extra of [
      { mode: "live" },
      { pass: "synthetic-test" },
      { link: "https://example.com" },
      { username: "synthetic" },
    ])
      expect(() =>
        s.handle({
          action: "connect",
          mode: "mock",
          district: "lisd",
          ...extra,
        }),
      ).toThrow(/disabled/);
    const c = s.handle({ action: "connect", mode: "mock", district: "lisd" });
    expect(() =>
      s.handle(
        { action: "sync", district: "rrisd", scenario: "normal" },
        c.token,
      ),
    ).toThrow(/selected district/);
  });
  it("authentication failures create no session and expire existing sessions", () => {
    const s = new MockHacService();
    expect(() =>
      s.handle({
        action: "connect",
        mode: "mock",
        district: "lisd",
        scenario: "auth-error",
      }),
    ).toThrow(/rejected/);
    const c = s.handle({ action: "connect", mode: "mock", district: "lisd" });
    expect(() =>
      s.handle(
        { action: "sync", district: "lisd", scenario: "auth-error" },
        c.token,
      ),
    ).toThrow(/rejected/);
    expect(s.handle({ action: "status" }, c.token).session).toBeNull();
  });
  it("rotates tokens and bounds connection attempts", () => {
    const s = new MockHacService();
    const a = s.handle({ action: "connect", mode: "mock", district: "lisd" });
    const b = s.handle(
      { action: "connect", mode: "mock", district: "rrisd" },
      a.token,
    );
    expect(a.token).not.toBe(b.token);
    expect(s.handle({ action: "status" }, a.token).session).toBeNull();
    for (let i = 0; i < 118; i++)
      s.handle({ action: "connect", mode: "mock", district: "lisd" });
    expect(() =>
      s.handle({ action: "connect", mode: "mock", district: "lisd" }),
    ).toThrow(/busy/);
  });
  it("allowlists exact HTTPS hosts and paths only", () => {
    expect(
      validateDestination(
        "lisd",
        "https://lis-hac.eschoolplus.powerschool.com/HomeAccess/Account/LogOn",
      ).protocol,
    ).toBe("https:");
    for (const url of [
      "http://lis-hac.eschoolplus.powerschool.com/HomeAccess/Account/LogOn",
      "https://127.0.0.1/HomeAccess/Account/LogOn",
      "https://lis-hac.eschoolplus.powerschool.com.evil.test/HomeAccess/Account/LogOn",
      "https://user:pass@lis-hac.eschoolplus.powerschool.com/HomeAccess/Account/LogOn",
      "https://lis-hac.eschoolplus.powerschool.com/HomeAccess/Account/LogOn?pass=test",
      "https://lis-hac.eschoolplus.powerschool.com:444/HomeAccess/Account/LogOn",
    ])
      expect(() => validateDestination("lisd", url)).toThrow();
  });
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
  it("accepts bounded same-origin POST JSON", async () => {
    expect(await readCommand(req('{"action":"status"}'))).toEqual({
      action: "status",
    });
  });
  it("rejects cross-origin requests, URL queries, plain HTTP on remote hosts, wrong content type and bad JSON", async () => {
    for (const r of [
      req("{}", { origin: "https://other.test" }),
      req("{}", {}, "http://localhost:3000/api/hac?pass=test"),
      req(
        "{}",
        { origin: "http://remote.example" },
        "http://remote.example/api/hac",
      ),
    ])
      await expect(readCommand(r)).rejects.toThrow();
  });
});
