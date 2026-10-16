import { test, expect, type Page } from "@playwright/test";
import {
  newProfile,
  ProductSchema,
  type ProductData,
} from "../../src/product/model";
import {
  workspaceViews,
  workspaceShortcuts,
  workspaceHref,
} from "../../src/product/workspace-routes";
import type { LiveSnapshot } from "../../src/hac/live-types";

async function seed(page: Page) {
  const profile = newProfile("Navigation test student");
  profile.state.courses = [
    {
      id: "entry-algebra",
      name: "Entry test algebra",
      teacher: "Test teacher",
      semester: "Fall 2026",
      level: "Regular",
      credits: 0.5,
      mode: "points",
      target: 90,
      color: "#93536f",
      categories: [{ id: "work", name: "Work", weight: 100 }],
      assignments: [
        {
          id: "quiz",
          name: "Entry test quiz",
          categoryId: "work",
          earned: 80,
          possible: 100,
          status: "graded",
          due: "2026-10-16",
        },
      ],
    },
  ];
  const data = ProductSchema.parse({
    format: "gradelarp-product",
    version: 2,
    activeProfileId: profile.id,
    profiles: [profile],
  });
  await page.goto("/icon.svg");
  await page.evaluate(
    (data) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("gradelarp-product-v2", 1);
        open.onupgradeneeded = () => {
          open.result.createObjectStore("workspace");
          open.result.createObjectStore("preservation");
        };
        open.onsuccess = () => {
          const db = open.result,
            tx = db.transaction("workspace", "readwrite");
          tx.objectStore("workspace").put({ revision: 0, data }, "current");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        open.onerror = () => reject(open.error);
      }),
    data,
  );
}
async function stored(page: Page): Promise<ProductData> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("gradelarp-product-v2", 1);
        open.onsuccess = () => {
          const db = open.result,
            get = db
              .transaction("workspace")
              .objectStore("workspace")
              .get("current");
          get.onsuccess = () => {
            db.close();
            resolve(get.result.data);
          };
          get.onerror = () => reject(get.error);
        };
        open.onerror = () => reject(open.error);
      }),
  );
}
async function nav(page: Page, name: string) {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("landing opens the requested calculator through onboarding, with real course setup and history", async ({
  page,
}, info) => {
  await page.goto("/");
  const links = page.getByRole("navigation", { name: "Open a workspace tool" });
  await expect(
    links.getByRole("link", { name: "Grades", exact: false }),
  ).toHaveAttribute("href", "/app#courses");
  await expect(page.getByTestId("study")).toHaveAttribute(
    "data-webgl",
    "ready",
    { timeout: 45000 },
  );
  await page.screenshot({
    path: `artifacts/connect-2026-10-16/${info.project.name}-landing-links.png`,
  });
  await links
    .getByRole("link", { name: "What-if calculator", exact: false })
    .click();
  await expect(page).toHaveURL(/\/app#whatif$/);
  await expect(page.getByTestId("entry-destination")).toContainText(
    "Next: What-if calculator",
  );
  await page
    .getByRole("button", { name: "Continue with manual grades instead" })
    .click();
  await expect(page.locator(".product-view")).toHaveAttribute(
    "data-view",
    "whatif",
  );
  await page.getByRole("button", { name: "Add your first course" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await nav(page, "Courses");
  await expect(page).toHaveURL(/#courses$/);
  await page.goBack();
  await expect(page.locator(".product-view")).toHaveAttribute(
    "data-view",
    "whatif",
  );
  await page.goForward();
  await expect(page.locator(".product-view")).toHaveAttribute(
    "data-view",
    "courses",
  );
  await page.reload();
  await expect(page.locator(".product-view")).toHaveAttribute(
    "data-view",
    "courses",
  );
});

test("landing reaches the existing what-if engine, saves a scenario, and never alters real grades", async ({
  page,
}, info) => {
  await seed(page);
  await page.goto("/");
  await expect(page.getByTestId("study")).toHaveAttribute(
    "data-webgl",
    "ready",
    { timeout: 45000 },
  );
  await page
    .getByRole("navigation", { name: "Open a workspace tool" })
    .getByRole("link", { name: "What-if calculator", exact: false })
    .click();
  await expect(page.getByTestId("actual-grade")).toContainText("80");
  await page.getByLabel("Scenario 1 earned", { exact: true }).fill("100");
  await expect(page.getByTestId("projected-grade")).toContainText("100");
  await expect(page.getByTestId("actual-grade")).toContainText("80");
  await page
    .getByLabel("Scenario name", { exact: true })
    .fill("Navigation scenario");
  await page
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  await expect(page.locator(".product-status-line")).toContainText(
    "Saved on this device",
  );
  const saved = await stored(page);
  expect(saved.profiles[0].state.courses[0].assignments[0].earned).toBe(80);
  expect(saved.profiles[0].scenarios).toHaveLength(1);
  await page.reload();
  await expect(page.locator(".product-view")).toHaveAttribute(
    "data-view",
    "whatif",
  );
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByTestId("projected-grade")).toContainText("100");
  await expect(page.getByTestId("actual-grade")).toContainText("80");
  await page.screenshot({
    path: `artifacts/connect-2026-10-16/${info.project.name}-actual-calculator.png`,
  });
});

test("a grades deep link keeps its destination after HAC sync and displays source records", async ({
  page,
}) => {
  // Controlled transport fixture only; this is not a real district account sign-in.
  const snapshot: LiveSnapshot = {
    mode: "live",
    portal: "https://lis-hac.eschoolplus.powerschool.com/HomeAccess",
    studentId: "entry-student",
    studentName: "Entry source student",
    term: "Quarter 1",
    fetchedAt: new Date().toISOString(),
    status: "complete",
    issues: [],
    courses: [
      {
        id: "source-algebra",
        name: "School algebra",
        teacher: "Source teacher",
        average: 88,
        averageText: "88.00",
        assignmentsAvailable: true,
        categories: [{ name: "Work", weight: 100 }],
        assignments: [
          {
            id: "source-quiz",
            name: "Source quiz",
            category: "Work",
            due: "10/16/2026",
            score: "85",
            earned: 85,
            possible: 100,
            status: "graded",
          },
        ],
      },
    ],
  };
  await page.route("**/api/hac", async (route) => {
    const command = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      json:
        command.action === "status"
          ? { session: null }
          : {
              snapshot,
              session: {
                mode: "live",
                portal: snapshot.portal,
                studentId: snapshot.studentId,
                studentName: snapshot.studentName,
                expiresAt: new Date(Date.now() + 1800000).toISOString(),
              },
            },
    });
  });
  await page.goto("/");
  await expect(page.getByTestId("study")).toHaveAttribute(
    "data-webgl",
    "ready",
    { timeout: 45000 },
  );
  await page
    .getByRole("navigation", { name: "Open a workspace tool" })
    .getByRole("link", { name: "Grades", exact: false })
    .click();
  await expect(page.getByTestId("entry-destination")).toContainText("Courses");
  await page
    .getByLabel("HAC username", { exact: true })
    .fill("entry-test-only");
  await page
    .getByLabel("HAC password", { exact: true })
    .fill("not-a-real-password");
  await page
    .getByRole("button", { name: "Sign in & sync", exact: true })
    .click();
  await expect(page.locator(".product-view")).toHaveAttribute(
    "data-view",
    "courses",
  );
  await expect(page.locator(".product-view")).toContainText("School algebra");
  await expect(page.locator(".product-view")).toContainText("88.00");
  await expect(page.locator(".product-view")).toContainText("Source quiz");
  await nav(page, "What-if calculator");
  await page
    .getByRole("button", { name: "Open student profiles", exact: true })
    .click();
  await page.getByLabel("New student name").fill("Separate planning profile");
  await page
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
  await expect(page.locator(".product-view")).toHaveAttribute(
    "data-view",
    "whatif",
  );
  await expect(
    page.getByRole("button", { name: "Add your first course" }),
  ).toBeVisible();
  await expect.poll(async () => (await stored(page)).profiles.length).toBe(3);
  const data = await stored(page);
  const sourceProfile = data.profiles.find((p) => p.hacLive);
  expect(sourceProfile?.hacLive?.snapshot.courses[0].average).toBe(88);
});

test("every existing tool has a reloadable URL and the closing links target real workspace views", async ({
  page,
}, info) => {
  await seed(page);
  for (const view of workspaceViews) {
    await page.goto(workspaceHref(view));
    await expect(page.locator(".product-view")).toHaveAttribute(
      "data-view",
      view,
    );
  }
  await page.goto("/app#not-a-tool");
  await expect(page.locator(".product-view")).toHaveAttribute(
    "data-view",
    "overview",
  );
  await page.goto("/");
  await expect(page.getByTestId("study")).toHaveAttribute(
    "data-webgl",
    "ready",
    { timeout: 45000 },
  );
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  const links = page.getByRole("navigation", {
    name: "Choose a workspace tool",
  });
  await expect(links).toBeVisible();
  const actions = await page.locator(".closing-primary-actions").boundingBox();
  const shortcuts = await links.boundingBox();
  expect(shortcuts!.y).toBeGreaterThan(actions!.y + actions!.height);
  for (const shortcut of workspaceShortcuts) {
    await expect(
      links.getByRole("link", { name: shortcut.label, exact: false }),
    ).toHaveAttribute("href", workspaceHref(shortcut.view));
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/connect-2026-10-16/${info.project.name}-closing-links.png`,
  });
});

test("app entry remains available before the cinematic JavaScript loads", async ({
  page,
}) => {
  await page.route("**/*.js", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("link", { name: "Open app without waiting", exact: false })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByText("Opening your local academic workspace…", { exact: true }),
  ).toBeVisible();
});
