import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { ProductData } from "../../src/product/model";
async function nav(page: Page, name = "School connection") {
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
async function ready(page: Page) {
  await page.goto("/");
  await nav(page);
  await expect(
    page.getByRole("button", { name: "Connect mock student", exact: true }),
  ).toBeEnabled();
}
async function connect(page: Page) {
  await page
    .getByRole("button", { name: "Connect mock student", exact: true })
    .click();
  await expect(page.locator(".hac-session-status")).toContainText(
    "Mock session connected",
  );
}
async function preview(page: Page) {
  await page
    .getByRole("button", { name: "Refresh preview", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review before importing", exact: true }),
  ).toBeVisible();
}
async function saved(page: Page) {
  await expect(page.locator(".product-status-line")).toContainText(
    "Saved on this device",
  );
}
async function stored(page: Page): Promise<ProductData> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("gradelarp-product-v2", 1);
        r.onsuccess = () => {
          const db = r.result;
          const get = db
            .transaction("workspace")
            .objectStore("workspace")
            .get("current");
          get.onsuccess = () => {
            resolve(get.result.data);
            db.close();
          };
          get.onerror = () => reject(get.error);
        };
        r.onerror = () => reject(r.error);
      }),
  );
}
async function condition(page: Page, value: string) {
  const tools = page.locator(".hac-fixture-tools");
  if ((await tools.getAttribute("open")) === null)
    await tools.locator("summary").click();
  await page.getByLabel("Preview fixture").selectOption(value);
}
async function imported(page: Page) {
  await ready(page);
  await connect(page);
  await preview(page);
  await page
    .getByRole("button", { name: "Import 2 courses", exact: true })
    .click();
  await saved(page);
  await expect(page.locator(".hac-managed-row")).toHaveCount(2);
}
test("district onboarding imports only into a synthetic profile, persists and uses the grade engine", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  const before = await stored(page);
  await page.getByLabel("Search districts").fill("RRISD");
  await expect(page.getByRole("button", { name: /Leander ISD/ })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: /Round Rock ISD/ }).click();
  await connect(page);
  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === "gradelarp-hac-mock");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Strict");
  expect(session?.path).toBe("/api/hac");
  await preview(page);
  await expect(page.locator(".hac-preview")).toContainText("75.0%");
  await expect(page.locator(".hac-preview")).toContainText("88%");
  await page
    .getByRole("button", { name: "Import 2 courses", exact: true })
    .click();
  await saved(page);
  const after = await stored(page);
  expect(after.profiles[0]).toEqual(before.profiles[0]);
  expect(after.profiles).toHaveLength(2);
  const sandbox = after.profiles.find((p) => p.hac)!;
  expect(sandbox.hac?.district).toBe("rrisd");
  expect(sandbox.state.courses).toHaveLength(2);
  expect(sandbox.state.courses.flatMap((c) => c.assignments)).toHaveLength(6);
  await nav(page, "Overview");
  await expect(page.locator(".product-status-line")).toContainText(
    "HAC sandbox · synthetic grades",
  );
  await expect(page.getByTestId("course-select")).toHaveCount(2);
  await page.reload();
  await expect(page.getByTestId("course-select")).toHaveCount(2);
  expect((await stored(page)).profiles[0]).toEqual(before.profiles[0]);
  expect(errors).toEqual([]);
});
test("refresh is idempotent, updated scores apply and partial sync retains unavailable courses", async ({
  page,
}) => {
  await imported(page);
  const original = await stored(page);
  await preview(page);
  await expect(page.locator(".hac-preview")).toContainText(
    "Already up to date",
  );
  await page.getByRole("button", { name: "Confirm reviewed preview" }).click();
  await saved(page);
  let data = await stored(page);
  expect(data.profiles[1].state.courses).toEqual(
    original.profiles[1].state.courses,
  );
  expect(data.profiles[1].state.snapshots).toEqual(
    original.profiles[1].state.snapshots,
  );
  await condition(page, "updated");
  await preview(page);
  await page
    .getByRole("button", { name: "Import 1 course", exact: true })
    .click();
  await saved(page);
  data = await stored(page);
  expect(data.profiles[1].state.courses[0].assignments[0].earned).toBe(95);
  const lastComplete = data.profiles[1].hac?.lastCompleteImport;
  await condition(page, "partial");
  await preview(page);
  await expect(page.locator(".hac-preview")).toContainText("Partial preview");
  await expect(page.locator(".hac-preview")).toContainText("Course english");
  await page
    .getByRole("button", { name: "Import 1 course", exact: true })
    .click();
  await saved(page);
  data = await stored(page);
  expect(data.profiles[1].state.courses).toHaveLength(2);
  expect(data.profiles[1].hac?.lastCompleteImport).toBe(lastComplete);
});
test("authentication, malformed and mismatched district errors never claim success or replace records", async ({
  page,
}) => {
  await imported(page);
  const before = (await stored(page)).profiles;
  for (const scenario of ["malformed", "district-mismatch"]) {
    await condition(page, scenario);
    await page
      .getByRole("button", { name: "Refresh preview", exact: true })
      .click();
    await expect(page.locator(".hac-error")).toBeVisible();
    await expect(page.locator(".hac-preview")).toHaveCount(0);
    expect((await stored(page)).profiles).toEqual(before);
  }
  await page
    .getByRole("button", { name: "Test sign-in failure", exact: true })
    .click();
  await expect(page.locator(".hac-error")).toContainText("rejected");
  await expect(
    page.getByRole("button", { name: "Connect mock student", exact: true }),
  ).toBeEnabled();
  expect((await stored(page)).profiles).toEqual(before);
});
test("disconnect revokes the server session without deleting imports; expired sessions recover", async ({
  page,
}) => {
  await imported(page);
  const before = (await stored(page)).profiles;
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(page.locator(".hac-session-status")).toContainText(
    "Not connected",
  );
  expect((await stored(page)).profiles).toEqual(before);
  const response = await page.evaluate(() =>
    fetch("/api/hac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync",
        district: "lisd",
        scenario: "normal",
      }),
    }).then(async (r) => ({ status: r.status, body: await r.json() })),
  );
  expect(response.status).toBe(401);
  await connect(page);
  await page.context().clearCookies();
  await page
    .getByRole("button", { name: "Refresh preview", exact: true })
    .click();
  await expect(page.locator(".hac-error")).toContainText("session ended");
  await expect(
    page.getByRole("button", { name: "Connect mock student", exact: true }),
  ).toBeEnabled();
  expect((await stored(page)).profiles).toEqual(before);
});
test("imported-record removal and detaching are confirmed, isolated, and survive duplicate refresh", async ({
  page,
}) => {
  await imported(page);
  await page
    .locator(".hac-managed-row")
    .first()
    .getByRole("button", { name: "Remove imported course" })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".hac-managed-row")).toHaveCount(2);
  await page
    .locator(".hac-managed-row")
    .first()
    .getByRole("button", { name: "Remove imported course" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Remove course", exact: true })
    .click();
  await saved(page);
  await expect(page.locator(".hac-managed-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Keep as local copy", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Keep local copy", exact: true })
    .click();
  await saved(page);
  await preview(page);
  await expect(page.locator(".hac-preview .hac-decision")).toHaveText([
    "Excluded from imports",
    "Excluded from imports",
  ]);
  await page.getByRole("button", { name: "Confirm reviewed preview" }).click();
  await saved(page);
  const data = await stored(page);
  expect(data.profiles[0].state.courses).toHaveLength(0);
  expect(data.profiles[1].state.courses).toHaveLength(1);
  expect(data.profiles[1].hac?.ignored).toHaveLength(2);
});
test("API rejects live mode, credentials, query strings and cross-origin requests with no-store headers", async ({
  page,
}) => {
  await ready(page);
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
    path: `artifacts/hac-live-2026-10-15/${info.project.name}-landing.png`,
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
    path: `artifacts/hac-live-2026-10-15/${info.project.name}-source-gradebook.png`,
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
    path: `artifacts/hac-live-2026-10-15/${info.project.name}-source-dark.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
