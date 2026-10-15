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
    });
    await expect(refreshPortal(result.connection)).rejects.toThrow(
      /student could not be verified/,
    );
  });
  it("keeps school sessions isolated, expires and revokes them", async () => {
    let now = 1000;
    const f = fakeTransport();
    const service = new LiveHacService(
      () => f.transport,
      () => now,
    );
    const result = await service.handle(
      {
        action: "connect",
        portal,
        username: "test-user",
        password: "test-only",
      },
      undefined,
      "client-a",
    );
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result.session)).not.toContain("test-only");
    now += 30 * 60 * 1000;
    expect(
      (await service.handle({ action: "status" }, result.token)).session,
    ).toBeNull();
    expect(f.transport.destroy).toHaveBeenCalled();
  });
  it("rate-limits failed sign-ins without logging credentials", async () => {
    const f = fakeTransport({ rejected: true }),
      s = new LiveHacService(() => f.transport);
    const log = vi.spyOn(console, "log");
    for (let i = 0; i < 5; i++)
      await expect(
        s.handle(
          {
            action: "connect",
            portal,
            username: "test-user",
            password: "test-only",
          },
          undefined,
          "same-client",
        ),
      ).rejects.toThrow(/accept/);
    await expect(
      s.handle(
        {
          action: "connect",
          portal,
          username: "test-user",
          password: "test-only",
        },
        undefined,
        "same-client",
      ),
    ).rejects.toThrow(/attempts/);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("constructs a cookie jar per portal connection", async () => {
    const t = new DirectPortalTransport(portal);
    await t.destroy();
  });
});
describe("source grade accuracy and preservation", () => {
  it("retains school averages separately from assignment reconstruction and unknown marks", () => {
    const s = snapshot(),
      c = s.courses[0];
    expect(c.averageText).toBe("88.00");
    expect(
      parseLiveAssignments(
        gradebook().replace("Course: Algebra II", "Coursework I"),
        portal,
        "Test Student",
        "id",
      ).courses[0].name,
    ).toBe("Coursework I");
    expect(c.assignments[0].earned).toBe(85);
    expect(c.assignments[1].status).toBe("exempt");
    expect(c.assignments[1].score).toBe("EX");
    expect(c.assignments[2].due).toBeNull();
    expect(c.assignments[2].earned).toBeNull();
    expect(c.categories[0].weight).toBe(60);
  });
  it("does not guess an unknown mark into zero", () => {
    const s = parseLiveAssignments(
      gradebook({ score: "NG*" }),
      portal,
      "Test Student",
      "id",
    );
    expect(s.courses[0].assignments[0].earned).toBeNull();
    expect(s.courses[0].assignments[0].score).toBe("NG*");
  });
  it("distinguishes explicit empty records, missing tables, login expiry and malformed pages", () => {
    expect(
      parseLiveAssignments(
        gradebook({ empty: true }),
        portal,
        "Test Student",
        "id",
      ).courses,
    ).toEqual([]);
    expect(
      parseLiveAssignments(
        gradebook({ missing: true }),
        portal,
        "Test Student",
        "id",
      ).status,
    ).toBe("partial");
    expect(() =>
      parseLiveAssignments(LOGIN_HTML, portal, "Test Student", "id"),
    ).toThrow(/session ended/);
    expect(() =>
      parseLiveAssignments("<p>Maintenance</p>", portal, "Test Student", "id"),
    ).toThrow(/not recognized/);
  });
  it("rejects unfamiliar assignment columns instead of shifting scores", () => {
    expect(() =>
      parseLiveAssignments(
        gradebook().replace("<th>Score</th>", "<th>Other</th>"),
        portal,
        "Test Student",
        "id",
      ),
    ).toThrow(/columns/);
  });
  it("retains extra-credit source marks without clamping or declaring official GPA", () => {
    const s = parseLiveAssignments(
      gradebook({ score: "105" }),
      portal,
      "Test Student",
      "id",
    );
    expect(s.courses[0].assignments[0].earned).toBe(105);
    expect(s.courses[0]).not.toHaveProperty("credits");
    expect(s.courses[0]).not.toHaveProperty("level");
  });
  it("stable identities survive score changes; duplicate identities fail closed", () => {
    const a = snapshot(),
      b = parseLiveAssignments(
        gradebook({ score: "90" }),
        portal,
        "Test Student",
        "student-id",
      );
    expect(a.courses[0].id).toBe(b.courses[0].id);
    expect(a.courses[0].assignments[0].id).toBe(b.courses[0].assignments[0].id);
    expect(() =>
      parseLiveAssignments(
        gradebook().replace("showAssignment('a2')", "showAssignment('a1')"),
        portal,
        "Test Student",
        "id",
      ),
    ).toThrow(/uniquely/);
    expect(identity("a")).not.toBe(identity("b"));
  });
  it("syncs into a source-only student profile without overwriting manual courses or scenarios", () => {
    const p = newProfile("Manual"),
      data: ProductData = {
        format: "gradelarp-product",
        version: 2,
        activeProfileId: p.id,
        profiles: [p],
      };
    p.tasks.push({
      id: "task",
      title: "Manual task",
      courseId: "",
      date: "2026-10-15",
      priority: "normal",
      done: false,
      notes: "",
    });
    const before = structuredClone(p);
    const next = applyLiveSnapshot(data, snapshot());
    expect(next.profiles[0]).toEqual(before);
    expect(next.profiles[1].hacLive?.snapshot.courses).toHaveLength(1);
    expect(next.profiles[1].state.courses).toEqual([]);
    expect(next.profiles[1].state.demo).toBe(false);
    expect(applyLiveSnapshot(next, snapshot()).profiles).toHaveLength(2);
  });
  it("partial sync retains previously published assignments without claiming fresh completeness", () => {
    const p = newProfile(),
      d: ProductData = {
        format: "gradelarp-product",
        version: 2,
        activeProfileId: p.id,
        profiles: [p],
      },
      first = applyLiveSnapshot(d, snapshot()),
      partial = parseLiveAssignments(
        gradebook({ missing: true }),
        portal,
        "Test Student",
        "student-id",
      ),
      next = applyLiveSnapshot(first, partial);
    expect(next.profiles[1].hacLive?.snapshot.status).toBe("partial");
    expect(
      next.profiles[1].hacLive?.snapshot.courses[0].assignments,
    ).toHaveLength(3);
    expect(
      next.profiles[1].hacLive?.snapshot.courses[0].assignmentsAvailable,
    ).toBe(false);
    partial.term = "Quarter 2";
    expect(
      applyLiveSnapshot(first, partial).profiles[1].hacLive?.snapshot.courses[0]
        .assignments,
    ).toEqual([]);
  });
  it("purges marked sample profiles while retaining genuine user records and valid active selection", () => {
    const real = newProfile("Real"),
      demo = newProfile("Old sample");
    demo.state.demo = true;
    const d: ProductData = {
      format: "gradelarp-product",
      version: 2,
      activeProfileId: demo.id,
      profiles: [real, demo],
    };
    const next = removeDemonstrations(d);
    expect(next.profiles).toEqual([real]);
    expect(next.activeProfileId).toBe(real.id);
    expect(parseProductBackup(JSON.stringify(d)).profiles).toHaveLength(1);
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
