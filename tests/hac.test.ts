import { describe, it, expect } from "vitest";
import { fixtureHtml } from "../src/hac/fixtures";
import { parseFixture } from "../src/hac/parser";
import {
  DirectPortalTransport,
  isPublicAddress,
  normalizePortal,
  validatePortalRequest,
  type PortalTransport,
} from "../src/hac/transport";
import { parseLiveAssignments, identity } from "../src/hac/live-parser";
import { LiveHacService, readCommand } from "../src/hac/server";
import { applyLiveSnapshot } from "../src/hac/live-sync";
import {
  newProfile,
  removeDemonstrations,
  parseProductBackup,
  type ProductData,
} from "../src/product/model";
import { LOGIN_HTML, gradebook } from "./fixtures/hac-pages";
const portal = "https://hac.example.edu/HomeAccess";
const snapshot = () =>
  parseLiveAssignments(
    gradebook(),
    portal,
    "Test Student",
    "student-id",
    new Date("2026-10-15T12:00:00Z"),
  );
function fakeTransport({
  rejected = false,
  challenge = false,
  missing = false,
}: { rejected?: boolean; challenge?: boolean; missing?: boolean } = {}) {
  const calls: { url: string; body?: Record<string, string> }[] = [];
  const transport: PortalTransport = {
    page: vi.fn(async (url, options) => {
      calls.push({
        url,
        body: options?.body ? Object.fromEntries(options.body) : undefined,
      });
      return {
        url,
        status: 200,
        html: options?.body
          ? rejected
            ? LOGIN_HTML
            : challenge
              ? "<p>Verify your identity</p>"
              : gradebook()
          : url.includes("LogOn")
            ? LOGIN_HTML
            : gradebook({ missing }),
      };
    }),
    destroy: vi.fn(async () => {}),
  };
  return { transport, calls };
}
describe("direct HAC boundary", () => {
  it("normalizes compatible public HTTPS portals, not arbitrary paths or credential URLs", () => {
    expect(normalizePortal("hac.example.edu")).toBe(portal);
    expect(
      validatePortalRequest(
        "https://hac.example.edu",
        "https://hac.example.edu/HomeAccess",
      ).pathname,
    ).toBe("/HomeAccess");
    expect(() =>
      validatePortalRequest(
        "https://hac.example.edu",
        "https://other.example/HomeAccess",
      ),
    ).toThrow();
    expect(() =>
      validatePortalRequest(
        "https://hac.example.edu",
        "https://hac.example.edu/HomeAccess?password=secret",
      ),
    ).toThrow();
    expect(normalizePortal(portal + "/Account/LogOn")).toBe(portal);
    expect(
      normalizePortal(portal + "/Account/LogOn?ReturnUrl=%2FHomeAccess"),
    ).toBe(portal);
    for (const url of [
      "http://hac.example.edu",
      "https://127.0.0.1/HomeAccess",
      "https://[::1]/HomeAccess",
      "https://a:b@hac.example.edu/HomeAccess",
      "https://hac.example.edu:444/HomeAccess",
      "https://hac.example.edu/HomeAccess?pass=x",
      "https://hac.example.edu/other",
      "https://localhost/HomeAccess",
    ])
      expect(() => normalizePortal(url)).toThrow();
  });
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "198.18.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "2002:7f00:1::",
  ])("rejects nonpublic destination %s", (ip) =>
    expect(isPublicAddress(ip)).toBe(false),
  );
  it("allows ordinary public IPv4 and IPv6 addresses", () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  });
  it("parses current form fields dynamically without hardcoding district database or flags", () => {
    const f = buildLogin(
      LOGIN_HTML.replace('value="10"', 'value="42"'),
      portal + "/Account/LogOn",
      portal,
    );
    expect(f.fields.get("Database")).toBe("42");
    expect(f.fields.get("__RequestVerificationToken")).toBe("test-csrf");
    expect(f.fields.has("LogOnDetails.Password")).toBe(false);
  });
  it("rejects off-site login actions and absent CSRF fields before sending credentials", () => {
    expect(() =>
      buildLogin(
        LOGIN_HTML.replace(
          'action="/HomeAccess/Account/LogOn?ReturnUrl=%2FHomeAccess"',
          'action="https://other.example/HomeAccess/Account/LogOn"',
        ),
        portal + "/Account/LogOn",
        portal,
      ),
    ).toThrow(/outside/);
    expect(() =>
      buildLogin(
        LOGIN_HTML.replace('name="__RequestVerificationToken"', 'name="other"'),
        portal + "/Account/LogOn",
        portal,
      ),
    ).toThrow(/verification/);
  });
  it("requires an explicit database choice for multi-district portals", () => {
    const html = LOGIN_HTML.replace(
      '<input type="hidden" name="Database" value="10">',
      '<select name="Database"><option value="10">One</option><option value="20">Two</option></select>',
    );
    expect(() => buildLogin(html, portal + "/Account/LogOn", portal)).toThrow(
      /multiple/,
    );
    expect(
      buildLogin(html, portal + "/Account/LogOn", portal, "20").fields.get(
        "Database",
      ),
    ).toBe("20");
  });
  it("POSTs credentials only to the selected form and returns a validated real-mode snapshot", async () => {
    const { transport, calls } = fakeTransport();
    const result = await connectPortal(
      { portal, username: "test-user", password: "test-only-not-real" },
      () => transport,
    );
    expect(calls).toHaveLength(3);
    expect(calls[1].body?.["LogOnDetails.Password"]).toBe("test-only-not-real");
    expect(
      calls.every(
        (c) =>
          !c.url.includes("test-only-not-real") && !c.url.includes("test-user"),
      ),
    ).toBe(true);
    expect(result.snapshot.mode).toBe("live");
    expect(result.snapshot.courses[0].average).toBe(88);
    expect(result.connection).not.toHaveProperty("password");
  });
  it.each([{ rejected: true }, { challenge: true }])(
    "does not turn rejected/challenged sign-in into success: %j",
    async (options) => {
      const { transport } = fakeTransport(options);
      await expect(
        connectPortal(
          { portal, username: "test-user", password: "test-only" },
          () => transport,
        ),
      ).rejects.toThrow();
      expect(transport.destroy).toHaveBeenCalled();
    },
  );
  it("refreshes through the existing school session with no stored password", async () => {
    const { transport, calls } = fakeTransport();
    const result = await connectPortal(
      { portal, username: "test-user", password: "test-only" },
      () => transport,
    );
    await refreshPortal(result.connection);
    expect(calls[3].body).toBeUndefined();
    transport.page = async (url) => ({
      url,
      status: 200,
      html: gradebook().replace(
        '<div class="sg-banner-menu-container"><span>Test Student</span></div>',
        "",
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
