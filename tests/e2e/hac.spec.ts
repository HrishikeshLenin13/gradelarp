import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { newProfile, type ProductData } from "../../src/product/model";
import type { LiveSnapshot } from "../../src/hac/live-types";
const portal = "https://lis-hac.eschoolplus.powerschool.com/HomeAccess";
const source: LiveSnapshot = {
  mode: "live",
  portal,
  studentId: "test-source-id",
  studentName: "Browser Test Student",
  term: "Quarter 1",
  fetchedAt: "2026-10-15T12:00:00Z",
  status: "complete",
  issues: [],
  courses: [
    {
      id: "course-1",
      name: "Algebra II",
      teacher: "Teacher from source",
      average: 88,
      averageText: "88.00",
      assignmentsAvailable: true,
      assignments: [
        {
          id: "assignment-1",
          name: "Published test",
          category: "Major",
          due: "10/12/2026",
          score: "85",
          earned: 85,
          possible: 100,
          status: "graded",
        },
        {
          id: "assignment-2",
          name: "Source exemption",
          category: "Daily",
          due: null,
          score: "EX",
          earned: null,
          possible: 10,
          status: "exempt",
        },
      ],
      categories: [
        { name: "Major", weight: 60 },
        { name: "Daily", weight: 40 },
      ],
    },
  ],
};
async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("hac-entry")).toBeVisible();
}
async function fill(page: Page) {
  await page
    .getByLabel("HAC username", { exact: true })
    .fill("browser-test-only");
  await page
    .getByLabel("HAC password", { exact: true })
    .fill("not-a-real-password");
}
async function nav(page: Page, name: string) {
  await expect(page.locator(".product-root")).toBeVisible();
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();
  await expect(page.locator(".product-view")).toHaveCSS("opacity", "1");
}
async function stored(page: Page): Promise<ProductData> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("gradelarp-product-v2", 1);
        r.onsuccess = () => {
          const db = r.result,
            g = db
              .transaction("workspace")
              .objectStore("workspace")
              .get("current");
          g.onsuccess = () => {
            resolve(g.result.data);
            db.close();
          };
          g.onerror = () => reject(g.error);
        };
        r.onerror = () => reject(r.error);
      }),
  );
}
async function simulatePortal(
  page: Page,
  {
    failure = false,
    partial = false,
    syncFailure = false,
  }: { failure?: boolean; partial?: boolean; syncFailure?: boolean } = {},
) {
  let connected = false;
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/hac", async (route) => {
    const command = route.request().postDataJSON();
    requests.push(command);
    let body: unknown,
      status = 200;
    if (command.action === "connect" && failure) {
      status = 401;
      body = {
        error: {
          code: "AUTH_FAILED",
          details: { stage: "sign-in" },
          message:
            "HAC did not accept this sign-in. Check your district, username and password.",
        },
      };
    } else if (command.action === "sync" && syncFailure) {
      status = 502;
      body = {
        error: {
          code: "DNS",
          message: "The district HAC address could not be found.",
          details: { stage: "refresh" },
        },
      };
    } else if (command.action === "disconnect") {
      connected = false;
      body = { session: null };
    } else if (command.action === "status") {
      body = {
        session: connected
          ? {
              mode: "live",
              portal,
              studentId: source.studentId,
              studentName: source.studentName,
              expiresAt: new Date(Date.now() + 1800000).toISOString(),
            }
          : null,
      };
    } else {
      connected = true;
      body = {
        session: {
          mode: "live",
          portal,
          studentId: source.studentId,
          studentName: source.studentName,
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
        },
        snapshot: {
          ...source,
          ...(partial && command.action === "sync"
            ? {
                status: "partial",
                issues: [
                  "Algebra II: assignment table unavailable; previous assignments retained.",
                ],
                courses: [
                  {
                    ...source.courses[0],
                    assignmentsAvailable: false,
                    assignments: [],
                  },
                ],
              }
            : {}),
        },
      };
    }
    await route.fulfill({
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(body),
    });
  });
  return requests;
}
test("first visit has an information page, direct HAC form and absolutely no seeded grades", async ({
  page,
}) => {
  await ready(page);
  await expect(
    page.getByRole("heading", { name: "Less checking. More understanding." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in & sync", exact: true }),
  ).toBeVisible();
  expect(
    (await stored(page)).profiles.every(
      (p) => p.state.courses.length === 0 && !p.state.demo && !p.hac,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: /mock|demo|fixture/i }),
  ).toHaveCount(0);
});
test("one sign-in automatically saves school-reported records, clears password and opens the real gradebook", async ({
  page,
}) => {
  const requests = await simulatePortal(page);
  await ready(page);
  await fill(page);
  await page
    .getByRole("button", { name: "Sign in & sync", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Browser Test Student’s gradebook" }),
  ).toBeVisible();
  await expect(page.getByText("88.00", { exact: true })).toBeVisible();
  await expect(page.getByText("EX / 10", { exact: true })).toBeVisible();
  await expect(page.locator(".product-status-line")).toContainText(
    "Saved on this device",
  );
  const data = await stored(page);
  expect(data.profiles).toHaveLength(2);
  expect(data.profiles[1].hacLive?.snapshot.courses).toHaveLength(1);
  expect(data.profiles[1].state.courses).toEqual([]);
  expect(JSON.stringify(data)).not.toContain("not-a-real-password");
  expect(requests.find((c) => c.action === "connect")).toMatchObject({
    portal,
    username: "browser-test-only",
    password: "not-a-real-password",
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Browser Test Student’s gradebook" }),
  ).toBeVisible();
});
test("another district supports a user-confirmed official HAC URL rather than a hosted third-party API", async ({
  page,
}) => {
  const requests = await simulatePortal(page);
  await ready(page);
  await page
    .getByLabel("School district", { exact: true })
    .selectOption("other");
  await page
    .getByLabel("Official HAC portal address")
    .fill("https://hac.example.edu/HomeAccess");
  await page
    .getByLabel("I checked this is my district’s official HAC address.")
    .check();
  await fill(page);
  await page
    .getByRole("button", { name: "Sign in & sync", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Browser Test Student’s gradebook" }),
  ).toBeVisible();
  expect(requests.find((c) => c.action === "connect")?.portal).toBe(
    "https://hac.example.edu/HomeAccess",
  );
});
test("bad credentials stay on sign-in with a clear error and no fabricated success", async ({
  page,
}) => {
  await simulatePortal(page, { failure: true });
  await ready(page);
  await fill(page);
  await page
    .getByRole("button", { name: "Sign in & sync", exact: true })
    .click();
  await expect(page.locator(".hac-login-error")).toContainText(
    "did not accept",
  );
  await expect(page.getByLabel("HAC password", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByText("Connection details: AUTH_FAILED · sign-in"),
  ).toBeVisible();
  expect((await stored(page)).profiles).toHaveLength(1);
});
test("refresh, partial sync and confirmed disconnect preserve imported source records", async ({
  page,
}) => {
  const requests = await simulatePortal(page, { partial: true });
  await ready(page);
  await fill(page);
  await page
    .getByRole("button", { name: "Sign in & sync", exact: true })
    .click();
  await nav(page, "School connection");
  await expect(
    page.getByText("Connected to HAC", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sync now", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Test Student’s gradebook" }),
  ).toBeVisible();
  expect(
    (await stored(page)).profiles[1].hacLive?.snapshot.courses[0].assignments,
  ).toHaveLength(2);
  await nav(page, "School connection");
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Disconnect", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign in & sync", exact: true }),
  ).toBeVisible();
  expect(
    (await stored(page)).profiles[1].hacLive?.snapshot.courses[0].assignments,
  ).toHaveLength(2);
  expect(
    requests
      .filter((c) => c.action === "sync" || c.action === "disconnect")
      .every((c) => !("password" in c)),
  ).toBe(true);
});
test("stored marked samples are removed but genuine manual grades survive", async ({
  page,
}) => {
  await page.goto("/icon.svg");
  const real = newProfile("Genuine user"),
    sample = newProfile("Old mock profile");
  sample.state.demo = true;
  await page.evaluate(
    (data) =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open("gradelarp-product-v2", 1);
        r.onupgradeneeded = () => {
          r.result.createObjectStore("workspace");
          r.result.createObjectStore("preservation");
        };
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("workspace", "readwrite");
          tx.objectStore("workspace").put({ revision: 4, data }, "current");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
    {
      format: "gradelarp-product",
      version: 2,
      activeProfileId: sample.id,
      profiles: [real, sample],
    },
  );
  await page.goto("/");
  await expect(page.getByTestId("hac-entry")).toBeVisible();
  expect((await stored(page)).profiles).toEqual([real]);
});
test("manual entry remains available without any school account or sample dataset", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Continue with manual grades instead" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your next chapter starts right here." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Connect HAC", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /demo|mock/i })).toHaveCount(0);
});
test("API rejects GET, query secrets, missing credentials, cross-origin and private portal destinations", async ({
  page,
}) => {
  await ready(page);
  const get = await page.request.get("/api/hac");
  expect(get.status()).toBe(405);
  const results = await page.evaluate(async () => {
    return Promise.all(
      [
        { url: "/api/hac?pass=test", body: { action: "status" } },
        {
          url: "/api/hac",
          body: {
            action: "connect",
            portal: "https://example.edu",
            username: "",
            password: "",
          },
        },
        {
          url: "/api/hac",
          body: {
            action: "connect",
            portal: "https://127.0.0.1/HomeAccess",
            username: "test-only",
            password: "test-only",
          },
        },
      ].map(async (c) => {
        const r = await fetch(c.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(c.body),
        });
        return { status: r.status, cache: r.headers.get("cache-control") };
      }),
    );
  });
  for (const r of results) {
    expect(r.status).toBe(400);
    expect(r.cache).toContain("no-store");
  }
  expect(
    (
      await page.request.post("/api/hac", {
        headers: { origin: "https://other.example" },
        data: { action: "status" },
      })
    ).status(),
  ).toBe(403);
});
test("landing and school records are accessible, responsive and free of runtime errors", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await simulatePortal(page);
  await ready(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page
    .getByRole("heading", { name: "Less checking. More understanding." })
    .click();
  await page.screenshot({
    path: `artifacts/hac-records-fix-2026-10-15/test-only-${info.project.name}-landing.png`,
    fullPage: true,
  });
  await fill(page);
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(
    page.getByLabel("HAC password", { exact: true }),
  ).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sign in & sync", exact: true })
    .click();
  await expect(page.locator(".product-view")).toHaveCSS("opacity", "1");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/hac-records-fix-2026-10-15/test-only-${info.project.name}-source-gradebook.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await expect(page.locator(".hac-source-course").first()).toHaveCSS(
    "background-color",
    "rgb(38, 33, 42)",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole("heading", { name: "Browser Test Student’s gradebook" })
    .click();
  await page.screenshot({
    path: `artifacts/hac-records-fix-2026-10-15/test-only-${info.project.name}-source-dark.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("district check excludes filled credentials and never reports authenticated sync", async ({
  page,
}) => {
  const sent: unknown[] = [];
  await page.route("**/api/hac", async (route) => {
    const command = route.request().postDataJSON();
    sent.push(command);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: null,
        ...(command.action === "probe"
          ? { portalCheck: { portal, ready: true } }
          : {}),
      }),
    });
  });
  await ready(page);
  await fill(page);
  await page
    .getByRole("button", { name: "Check district connection", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "This check does not sign into your account",
  );
  expect(sent).toContainEqual({ action: "probe", portal });
  expect(JSON.stringify(sent)).not.toContain("not-a-real-password");
  expect(JSON.stringify(sent)).not.toContain("browser-test-only");
  expect((await stored(page)).profiles).toHaveLength(1);
  await page
    .getByLabel("School district", { exact: true })
    .selectOption("rrisd");
  await expect(
    page.getByText("District login page reached.", { exact: false }),
  ).toHaveCount(0);
});
test("district failure displays code and step without importing records", async ({
  page,
}) => {
  await page.route("**/api/hac", async (route) => {
    const command = route.request().postDataJSON();
    await route.fulfill({
      status: command.action === "probe" ? 502 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        command.action === "probe"
          ? {
              error: {
                code: "DNS",
                message: "The district HAC address could not be found.",
                details: { stage: "login-page" },
              },
            }
          : { session: null },
      ),
    });
  });
  await ready(page);
  await page
    .getByRole("button", { name: "Check district connection", exact: true })
    .click();
  await expect(page.locator(".hac-login-error")).toContainText(
    "Connection details: DNS · login-page",
  );
  expect((await stored(page)).profiles).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: "Sign in & sync", exact: true }),
  ).toBeEnabled();
});

test("refresh failure exposes its step while preserving saved source records", async ({
  page,
}) => {
  await simulatePortal(page, { syncFailure: true });
  await ready(page);
  await fill(page);
  await page
    .getByRole("button", { name: "Sign in & sync", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Browser Test Student’s gradebook" }),
  ).toBeVisible();
  const before = (await stored(page)).profiles[1].hacLive;
  await nav(page, "School connection");
  await page.getByRole("button", { name: "Sync now", exact: true }).click();
  await expect(page.locator(".hac-login-error")).toContainText(
    "Connection details: DNS · refresh",
  );
  expect((await stored(page)).profiles[1].hacLive).toEqual(before);
  await expect(
    page.getByRole("button", { name: "Sync now", exact: true }),
  ).toBeEnabled();
});

test("source validation shows field names only and leaves the local gradebook unchanged", async ({
  page,
}) => {
  await page.route("**/api/hac", async (route) => {
    const command = route.request().postDataJSON();
    await route.fulfill({
      status: command.action === "connect" ? 422 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        command.action === "connect"
          ? {
              error: {
                code: "SOURCE_VALIDATION",
                message:
                  "HAC returned records that need a parser adjustment. Your existing grades are unchanged.",
                details: {
                  stage: "parse-records",
                  validation: ["courses[].assignments[].name:too_big"],
                },
              },
            }
          : { session: null },
      ),
    });
  });
  await ready(page);
  await fill(page);
  const before = await stored(page);
  await page
    .getByRole("button", { name: "Sign in & sync", exact: true })
    .click();
  await expect(page.locator(".hac-login-error")).toContainText(
    "Record fields: courses[].assignments[].name:too_big",
  );
  await expect(page.getByLabel("HAC password", { exact: true })).toHaveValue(
    "",
  );
  expect(await stored(page)).toEqual(before);
});
