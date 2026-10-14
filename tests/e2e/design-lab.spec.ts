import { test, expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createDemo } from "../../src/lib/demo";
import {
  categoryBreakdown,
  courseGrade,
  gpa,
  scenarioCourse,
} from "../../src/lib/calculations";
import { StateSchema, type AppState } from "../../src/lib/model";

const directions = ["precision", "expressive", "kinetic"] as const;
type Direction = (typeof directions)[number];
type LabView = "overview" | "courses" | "whatif" | "gpa" | "trends" | "planner";
const demo = createDemo();
const calculus = demo.courses[0];
const chemistry = demo.courses[2];
const future = calculus.assignments.find(
  (assignment) => assignment.status === "future",
)!;
const pageErrors = new Map<Page, string[]>();

async function ready(page: Page, direction: Direction) {
  await page.goto(`/design-lab/${direction}`);
  await expect(page.locator(".lab-root")).toHaveAttribute(
    "data-direction",
    direction,
  );
  await expect(page.getByTestId("concept-overview")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => storedLab(page, direction)).not.toBeNull();
}

async function setTheme(page: Page, theme: "dark" | "light") {
  if ((await page.locator(".lab-root").getAttribute("data-theme")) !== theme) {
    await page
      .getByRole("button", { name: `Switch to ${theme} mode`, exact: true })
      .click();
  }
  await expect(page.locator(".lab-root")).toHaveAttribute("data-theme", theme);
  const direction = (await page
    .locator(".lab-root")
    .getAttribute("data-direction")) as Direction;
  await expect
    .poll(async () => {
      const value = await storedLab(page, direction);
      return value ? JSON.parse(value).preferences.appearance : null;
    })
    .toBe(theme);
}

async function navigate(page: Page, name: string, view: LabView) {
  await openNavigation(page);
  const navigation = page
    .locator('aside[aria-label="Design navigation"]')
    .getByRole("button", { name, exact: true });
  await navigation.click();
  await expect(page.locator(`.lab-view[data-view="${view}"]`)).toBeVisible();
}

async function openNavigation(page: Page) {
  const toggle = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await toggle.isVisible()) {
    if ((await toggle.getAttribute("aria-expanded")) !== "true")
      await toggle.click();
  }
}

async function openAppearance(page: Page) {
  await openNavigation(page);
  await page
    .locator('aside[aria-label="Design navigation"]')
    .getByRole("button", { name: "Appearance", exact: true })
    .click();
}

async function openCalculus(page: Page) {
  await page.keyboard.press("Control+k");
  await page
    .getByRole("textbox", { name: "Search design workspace", exact: true })
    .fill("calculus");
  await page.getByRole("button", { name: /AP Calculus AB/ }).click();
  await expect(page.getByRole("dialog")).toContainText(calculus.name);
}

async function storedOriginal(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("gradelarp", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      if (!database.objectStoreNames.contains("workspace")) return null;
      return await new Promise<string | null>((resolve, reject) => {
        const request = database
          .transaction("workspace", "readonly")
          .objectStore("workspace")
          .get("state");
        request.onsuccess = () =>
          resolve(request.result ? JSON.stringify(request.result) : null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
}

async function seedOriginal(page: Page, state: AppState) {
  await page.evaluate(async (value) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("gradelarp", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("workspace");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("workspace", "readwrite");
        transaction.objectStore("workspace").put(value, "state");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  }, state);
}

async function storedLab(page: Page, direction: Direction) {
  return page.evaluate(async (key) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("gradelarp-design-lab-v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      if (!database.objectStoreNames.contains("workspaces")) return null;
      return await new Promise<string | null>((resolve, reject) => {
        const request = database
          .transaction("workspaces", "readonly")
          .objectStore("workspaces")
          .get(key);
        request.onsuccess = () =>
          resolve(request.result ? JSON.stringify(request.result) : null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  }, direction);
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

async function screenshot(
  page: Page,
  info: TestInfo,
  direction: Direction,
  theme: string,
) {
  await expect(page.locator(".lab-view")).toHaveCSS("opacity", "1");
  await page.evaluate(async () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  });
  await noOverflow(page);
  await page.screenshot({
    path: `artifacts/design-lab-${info.project.name}-${direction}-${theme}.png`,
    fullPage: true,
  });
}

async function accessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
}

test.beforeEach(async ({ page }, info) => {
  await page.setViewportSize(
    info.project.name === "mobile"
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 },
  );
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(
    pageErrors.get(page) ?? [],
    "Unexpected browser runtime errors",
  ).toEqual([]);
  pageErrors.delete(page);
});

test("historical comparison retains three isolated references and marks Expressive approved", async ({
  page,
}) => {
  await page.goto("/design-lab");
  for (const direction of directions) {
    const name = direction[0].toUpperCase() + direction.slice(1);
    await expect(
      page.locator(`a[href="/design-lab/${direction}"]`),
    ).toHaveCount(2);
    await expect(
      page.getByRole("link", { name: `Open ${name} preview`, exact: true }),
    ).toHaveAttribute("href", `/design-lab/${direction}`);
    await expect(
      page.getByRole("link", { name: `Explore ${name}`, exact: true }),
    ).toHaveAttribute("href", `/design-lab/${direction}`);
  }
  await expect(
    page.getByText(
      "Expressive is the approved direction. These previews remain isolated references.",
      { exact: true },
    ),
  ).toBeVisible();
  await noOverflow(page);
  await accessible(page);
  const signatures: string[] = [];
  for (const direction of directions) {
    await ready(page, direction);
    signatures.push(
      await page
        .getByTestId("concept-overview")
        .evaluate((element) => element.innerHTML),
    );
  }
  expect(new Set(signatures).size).toBe(3);
});

test("all concepts fit tablet and wide desktop layouts", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Additional viewports use the desktop browser context.",
  );
  for (const viewport of [
    { name: "tablet", width: 768, height: 1024 },
    { name: "wide", width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/design-lab");
    await noOverflow(page);
    for (const direction of directions) {
      await ready(page, direction);
      await expect(page.locator(".lab-view")).toHaveCSS("opacity", "1");
      await noOverflow(page);
      await accessible(page);
      await page.screenshot({
        path: `artifacts/design-lab-${viewport.name}-${direction}.png`,
        fullPage: true,
      });
      await navigate(page, "Courses", "courses");
      await expect(page.locator(".course-card")).toHaveCount(
        demo.courses.length,
      );
      await noOverflow(page);
      await navigate(page, "Overview", "overview");
    }
  }
});

for (const direction of directions) {
  test.describe(`${direction} concept`, () => {
    test("shows engine-derived demo overview with accessible responsive composition", async ({
      page,
    }, info) => {
      await ready(page, direction);
      const overview = page.getByTestId("concept-overview");
      await setTheme(page, "dark");
      await expect(page.locator(".lab-root")).toContainText(/demo/i);
      await expect(overview).toContainText(
        gpa(demo.courses, demo.policy)!.value.toFixed(2),
      );
      await expect(overview).toContainText(courseGrade(calculus)!.toFixed(1));
      for (const course of demo.courses)
        await expect(overview).toContainText(course.name);
      await expect(overview).toContainText(/goal|target/i);
      await expect(overview).toContainText(future.name);
      const selectors = overview.getByTestId("course-select");
      await expect(selectors).toHaveCount(demo.courses.length);
      await selectors.filter({ hasText: calculus.name }).click();
      await expect(
        selectors.filter({ hasText: calculus.name }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(overview.getByTestId("concept-analytics")).toContainText(
        "Calculus AB",
      );
      await selectors.filter({ hasText: chemistry.name }).click();
      await expect(
        selectors.filter({ hasText: chemistry.name }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        selectors.filter({ hasText: calculus.name }),
      ).toHaveAttribute("aria-pressed", "false");
      const analytics = overview.getByTestId("concept-analytics");
      await expect(analytics).toContainText("Chemistry");
      for (const category of categoryBreakdown(chemistry))
        await expect(analytics).toContainText(category.grade!.toFixed(1));
      await screenshot(page, info, direction, "dark");
      await accessible(page);
    });

    test("course, GPA, calculator and planner navigation use real data without scenario mutation", async ({
      page,
    }) => {
      await ready(page, direction);
      await navigate(page, "Courses", "courses");
      await expect(page.locator(".course-card")).toHaveCount(
        demo.courses.length,
      );
      for (const course of demo.courses) {
        await expect(
          page.locator(".course-card").filter({ hasText: course.name }),
        ).toContainText(courseGrade(course)!.toFixed(1));
      }
      await expect.poll(() => storedLab(page, direction)).not.toBeNull();
      const original = await storedLab(page, direction);
      await navigate(page, "What-if calculator", "whatif");
      await page
        .getByLabel("What-if course", { exact: true })
        .selectOption(calculus.id);
      await expect(page.locator(".lab-view")).toContainText("Hypothetical");
      for (const score of [100, 70]) {
        await page
          .getByRole("button", { name: `${score}%`, exact: true })
          .click();
        await expect(page.getByTestId("projected-grade")).toContainText(
          courseGrade(scenarioCourse(calculus, future, score))!.toFixed(1),
        );
      }
      await page
        .getByRole("spinbutton", { name: "Target course grade", exact: true })
        .fill("99");
      await expect(
        page.getByText("Not with this assignment alone."),
      ).toBeVisible();
      await navigate(page, "GPA planner", "gpa");
      await expect(page.locator(".gpa-stat").first()).toContainText(
        gpa(demo.courses, demo.policy)!.value.toFixed(2),
      );
      await expect(page.locator(".gpa-stat").nth(1)).toContainText(
        gpa(demo.courses, demo.policy, false)!.value.toFixed(2),
      );
      await expect(page.getByText(/estimated—not official/)).toBeVisible();
      expect(await storedLab(page, direction)).toBe(original);
      await navigate(page, "Assignment planner", "planner");
      await expect(
        page.locator('.lab-view[data-view="planner"]'),
      ).toContainText(future.name);
      await page
        .getByRole("checkbox", { name: `Complete ${future.name}`, exact: true })
        .click();
      await expect(
        page.getByRole("checkbox", {
          name: `Complete ${future.name}`,
          exact: true,
        }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Completed", exact: true })
        .click();
      await expect(
        page.getByRole("checkbox", {
          name: `Complete ${future.name}`,
          exact: true,
        }),
      ).toBeChecked();
      await expect
        .poll(async () => {
          const value = await storedLab(page, direction);
          return value ? JSON.parse(value).completed : [];
        })
        .toContain(future.id);
      const completed = JSON.parse((await storedLab(page, direction))!);
      expect(completed.state.courses).toEqual(
        JSON.parse(original!).state.courses,
      );
      await page.reload();
      await expect(page.getByTestId("concept-overview")).toBeVisible();
      await navigate(page, "Assignment planner", "planner");
      await page
        .getByRole("button", { name: "Completed", exact: true })
        .click();
      await expect(
        page.getByRole("checkbox", {
          name: `Complete ${future.name}`,
          exact: true,
        }),
      ).toBeChecked();
      await navigate(page, "Overview", "overview");
      await noOverflow(page);
    });

    test("real editor previews status rules and saves only its concept with real history", async ({
      page,
    }) => {
      await ready(page, direction);
      await openCalculus(page);
      const status = page.getByRole("combobox", {
        name: "Assignment 1 status",
        exact: true,
      });
      await status.selectOption("missing");
      const missing = structuredClone(calculus);
      missing.assignments[0].status = "missing";
      await expect(page.locator(".editor-grade")).toContainText(
        courseGrade(missing)!.toFixed(1),
      );
      await status.selectOption("dropped");
      missing.assignments[0].status = "dropped";
      await expect(page.locator(".editor-grade")).toContainText(
        courseGrade(missing)!.toFixed(1),
      );
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await openCalculus(page);
      await page
        .getByRole("spinbutton", { name: "Assignment 1 earned", exact: true })
        .fill("100");
      await page
        .getByRole("button", { name: "Save course", exact: true })
        .click();
      const edited = structuredClone(calculus);
      edited.assignments[0].earned = 100;
      await navigate(page, "Courses", "courses");
      await expect(
        page.locator(".course-card").filter({ hasText: calculus.name }),
      ).toContainText(courseGrade(edited)!.toFixed(1));
      await expect
        .poll(() => storedLab(page, direction))
        .toMatch(/"id":"demo-0-0"[^}]*"earned":100/);
      await page.reload();
      await expect(page.getByTestId("concept-overview")).toBeVisible();
      await navigate(page, "Courses", "courses");
      await expect(
        page.locator(".course-card").filter({ hasText: calculus.name }),
      ).toContainText(courseGrade(edited)!.toFixed(1));
      await navigate(page, "Grade history", "trends");
      await expect(
        page.getByText("2 real snapshots", { exact: true }),
      ).toBeVisible();
      await page
        .getByLabel("Trend course", { exact: true })
        .selectOption(calculus.id);
      await page
        .getByLabel("Trend assignment", { exact: true })
        .selectOption(calculus.assignments[0].id);
      await page
        .getByText("View snapshot data as a table", { exact: true })
        .click();
      await expect(page.locator(".calculation-details tbody")).toContainText(
        "94.0%",
      );
      await expect(page.locator(".calculation-details tbody")).toContainText(
        "100.0%",
      );
    });

    test("appearance and light theme persist independently with accessible dialog", async ({
      page,
    }, info) => {
      await ready(page, direction);
      await openAppearance(page);
      const dialog = page.getByRole("dialog", {
        name: "Your preview, your preferences",
      });
      await expect(dialog).toBeVisible();
      await dialog
        .getByLabel("Appearance mode", { exact: true })
        .selectOption("light");
      await dialog
        .getByLabel("Density", { exact: true })
        .selectOption("compact");
      await dialog.getByLabel("Motion", { exact: true }).selectOption("none");
      await dialog.getByLabel("Academic analysis", { exact: true }).uncheck();
      await dialog
        .getByLabel("Upcoming assignments", { exact: true })
        .uncheck();
      await accessible(page);
      await dialog
        .getByRole("button", { name: "Save preview preferences", exact: true })
        .click();
      await expect(page.locator(".lab-root")).toHaveAttribute(
        "data-theme",
        "light",
      );
      await expect(page.locator(".lab-root")).toHaveAttribute(
        "data-density",
        "compact",
      );
      await expect(page.locator(".lab-root")).toHaveAttribute(
        "data-motion",
        "none",
      );
      await expect(page.getByTestId("concept-analytics")).not.toBeVisible();
      await expect(page.getByTestId("concept-upcoming")).not.toBeVisible();
      await expect
        .poll(async () => {
          const value = await storedLab(page, direction);
          return value ? JSON.parse(value).preferences : null;
        })
        .toMatchObject({
          appearance: "light",
          density: "compact",
          motion: "none",
          showAnalysis: false,
          showUpcoming: false,
        });
      await page.reload();
      await expect(page.locator(".lab-root")).toHaveAttribute(
        "data-theme",
        "light",
      );
      await openAppearance(page);
      await expect(
        dialog.getByLabel("Appearance mode", { exact: true }),
      ).toHaveValue("light");
      await expect(dialog.getByLabel("Density", { exact: true })).toHaveValue(
        "compact",
      );
      await expect(dialog.getByLabel("Motion", { exact: true })).toHaveValue(
        "none",
      );
      await expect(
        dialog.getByLabel("Upcoming assignments", { exact: true }),
      ).not.toBeChecked();
      await expect(
        dialog.getByLabel("Academic analysis", { exact: true }),
      ).not.toBeChecked();
      await dialog.getByLabel("Academic analysis", { exact: true }).check();
      await dialog.getByLabel("Upcoming assignments", { exact: true }).check();
      await dialog
        .getByRole("button", { name: "Save preview preferences", exact: true })
        .click();
      await screenshot(page, info, direction, "light");
      await accessible(page);
      const other = directions.find((value) => value !== direction)!;
      await ready(page, other);
      await expect(page.locator(".lab-root")).toHaveAttribute(
        "data-theme",
        other === "precision" ? "dark" : "light",
      );
      await ready(page, direction);
      await expect(page.locator(".lab-root")).toHaveAttribute(
        "data-theme",
        "light",
      );
      await openAppearance(page);
      await dialog
        .getByLabel("Appearance mode", { exact: true })
        .selectOption("system");
      await dialog
        .getByRole("button", { name: "Save preview preferences", exact: true })
        .click();
      await expect(page.locator(".lab-root")).toHaveAttribute(
        "data-theme",
        "dark",
      );
      await expect
        .poll(async () => {
          const value = await storedLab(page, direction);
          return value ? JSON.parse(value).preferences.appearance : null;
        })
        .toBe("system");
      await page.emulateMedia({ colorScheme: "light" });
      await expect(page.locator(".lab-root")).toHaveAttribute(
        "data-theme",
        "light",
      );
      await page
        .getByRole("button", { name: "Switch to dark mode", exact: true })
        .click();
      await expect(page.locator(".lab-root")).toHaveAttribute(
        "data-theme",
        "dark",
      );
    });

    test("history starts with one genuine capture and records a second; keyboard dialog escapes", async ({
      page,
    }) => {
      await ready(page, direction);
      await page.keyboard.press("Control+k");
      await expect(
        page.getByRole("textbox", {
          name: "Search design workspace",
          exact: true,
        }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await navigate(page, "Grade history", "trends");
      const comparison = page.getByTestId("course-comparison");
      await comparison
        .getByRole("button", { name: "Target gaps", exact: true })
        .click();
      await expect(
        comparison.getByRole("button", { name: "Target gaps", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        comparison.getByRole("button", { name: "Course grades", exact: true }),
      ).toHaveAttribute("aria-pressed", "false");
      await expect(
        page.getByText("1 real snapshot", { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".trend-chart")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Record snapshot", exact: true })
        .click();
      await expect(
        page.getByText("2 real snapshots", { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".trend-chart")).toBeVisible();
      await page
        .getByText("View snapshot data as a table", { exact: true })
        .click();
      await expect(page.locator(".calculation-details tbody tr")).toHaveCount(
        2,
      );
      await noOverflow(page);
    });
  });
}

test("lab writes remain isolated from original data and from another concept", async ({
  page,
}) => {
  await page.goto("/design-lab");
  const preserved = createDemo();
  preserved.demo = false;
  preserved.settings.name = "Preserved original workspace QA";
  preserved.policy.name = "Preserved original policy QA";
  preserved.courses[0].name = "Preserved original Calculus QA";
  const canonicalOriginal = StateSchema.parse(preserved);
  await seedOriginal(page, canonicalOriginal);
  const before = await storedOriginal(page);
  expect(before).toBe(JSON.stringify(canonicalOriginal));
  for (const direction of directions) {
    await ready(page, direction);
    await setTheme(page, "light");
    expect(await storedOriginal(page)).toBe(before);
  }
  const expressiveBefore = await storedLab(page, "expressive");
  await ready(page, "precision");
  await openCalculus(page);
  await page
    .getByRole("spinbutton", { name: "Assignment 1 earned", exact: true })
    .fill("100");
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await navigate(page, "Courses", "courses");
  const edited = structuredClone(calculus);
  edited.assignments[0].earned = 100;
  await expect(
    page.locator(".course-card").filter({ hasText: calculus.name }),
  ).toContainText(courseGrade(edited)!.toFixed(1));
  await ready(page, "expressive");
  await navigate(page, "Courses", "courses");
  await expect(
    page.locator(".course-card").filter({ hasText: calculus.name }),
  ).toContainText(courseGrade(calculus)!.toFixed(1));
  expect(await storedLab(page, "expressive")).toBe(expressiveBefore);
  expect(await storedOriginal(page)).toBe(before);
  await page.goto("/");
  await expect(page.getByTestId("course-select").first()).toContainText(
    "Preserved original Calculus QA",
  );
  await expect(page.locator('nav a[href^="/design-lab"]')).toHaveCount(0);
  expect(await storedOriginal(page)).toBe(before);
});
