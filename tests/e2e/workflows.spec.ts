import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function nav(page: Page, name: string) {
  const mobile = await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .isVisible();
  if (mobile)
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await page.getByRole("button", { name, exact: true }).click();
  const ids: Record<string, string> = {
    Overview: "overview",
    "My courses 6": "courses",
    "What-if lab LAB": "whatif",
    "GPA planner": "gpa",
    "Grade trends": "trends",
    "Data & import": "data",
  };
  await expect(
    page.locator(`.page-content[data-page="${ids[name]}"]`),
  ).toHaveCSS("opacity", "1");
}
async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Let’s make this semester yours." }),
  ).toBeVisible();
  await expect(page.locator(".stat-card").last()).toHaveCSS("opacity", "1");
  await expect(page.locator(".stat-card").last()).toHaveCSS(
    "transform",
    "none",
  );
}
test.beforeEach(async ({ page }) => {
  await ready(page);
});
test("dashboard uses computed demo grades and fits viewport", async ({
  page,
}, info) => {
  await expect(page.getByText("4.42", { exact: true })).toBeVisible();
  await expect(page.getByText("94.0%", { exact: true })).toBeVisible();
  await expect(page.locator(".course-row")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/${info.project.name}-dashboard.png`,
    fullPage: true,
  });
});
test("what-if calculation changes projection without altering real grades", async ({
  page,
}) => {
  await nav(page, "What-if lab LAB");
  await page.getByRole("button", { name: "100%", exact: true }).click();
  await expect(page.getByTestId("projected-grade")).toContainText("95.5");
  await page.getByRole("button", { name: "70%", exact: true }).click();
  await expect(page.getByTestId("projected-grade")).toContainText("91.0");
  await page
    .getByRole("spinbutton", { name: "Target course grade", exact: true })
    .fill("99");
  await expect(page.getByText("Not with this assignment alone.")).toBeVisible();
  await nav(page, "Overview");
  await expect(page.locator(".course-row").first()).toContainText("94.9");
});
test("course editing persists and creates actual history", async ({ page }) => {
  await page.locator(".course-row").first().click();
  await page
    .getByRole("spinbutton", { name: "Assignment 1 earned", exact: true })
    .fill("100");
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await expect(page.locator(".course-row").first()).toContainText("96.1");
  await page.reload();
  await expect(page.locator(".course-row").first()).toContainText("96.1");
  await nav(page, "Grade trends");
  await expect(page.getByText("2 real snapshots")).toBeVisible();
  await expect(page.locator(".trend-chart")).toBeVisible();
  await page
    .getByLabel("Trend course", { exact: true })
    .selectOption("demo-course-0");
  await page
    .getByLabel("Trend assignment", { exact: true })
    .selectOption("demo-0-0");
  await page
    .getByText("View snapshot data as a table", { exact: true })
    .click();
  await expect(page.locator(".calculation-details tbody")).toContainText(
    "94.0%",
  );
  await expect(page.locator(".calculation-details tbody")).toContainText(
    "100.0%",
  );
  await nav(page, "Overview");
  await expect(page.locator(".widget-activity")).toContainText(
    "Recent changes",
  );
  await expect(page.locator(".widget-activity")).toContainText("94.0 → 100.0%");
});
test("ungraded, missing and dropped statuses change inclusion", async ({
  page,
}) => {
  await page.locator(".course-row").first().click();
  await page
    .getByRole("combobox", { name: "Assignment 1 status", exact: true })
    .selectOption("missing");
  await expect(page.locator(".editor-grade")).toContainText("76.1");
  await page
    .getByRole("combobox", { name: "Assignment 1 status", exact: true })
    .selectOption("dropped");
  await expect(page.locator(".editor-grade")).toContainText("95.5");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".course-row").first()).toContainText("94.9");
});
test("preferences persist: light theme, accent, density and visibility", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.getByRole("button", { name: "Daylight", exact: false }).click();
  await page.getByRole("button", { name: "mint accent", exact: true }).click();
  await page.getByLabel("Density", { exact: true }).selectOption("compact");
  await page
    .getByLabel("Animation intensity", { exact: true })
    .selectOption("none");
  await page.getByLabel("Recent assignments", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(page.locator(".app")).toHaveClass(
    /light.*accent-mint.*density-compact.*no-motion/,
  );
  await expect(page.locator(".widget-activity")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".app")).toHaveClass(
    /light.*accent-mint.*density-compact.*no-motion/,
  );
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
});
test("widget keyboard drag reorders and persists", async ({ page }) => {
  const grip = page.getByRole("button", {
    name: "Reorder courses widget",
    exact: true,
  });
  await grip.focus();
  await page.keyboard.press("Space");
  await expect(grip).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
    "over droppable area courses",
  );
  await page.keyboard.press(infoMobile(page) ? "ArrowDown" : "ArrowRight");
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
    "distribution",
  );
  await page.keyboard.press("Space");
  await expect(page.locator(".dashboard-widget").first()).not.toHaveClass(
    /widget-courses/,
  );
  await page.reload();
  await expect(page.locator(".dashboard-widget").first()).not.toHaveClass(
    /widget-courses/,
  );
});
function infoMobile(page: Page) {
  return (page.viewportSize()?.width ?? 1440) < 740;
}
test("GPA policy is editable and labeled hypothetical", async ({ page }) => {
  await nav(page, "GPA planner");
  await expect(
    page.getByText("Your GPA, estimated—not official.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit grading policy", exact: false })
    .click();
  await page
    .getByRole("spinbutton", { name: "AP bonus", exact: true })
    .fill("0");
  await page.getByRole("button", { name: "Save policy", exact: false }).click();
  await expect(page.locator(".gpa-stat").first()).toContainText("3.92");
  await expect(page.locator(".gpa-stat").nth(1)).toContainText("3.83");
});
test("CSV validates, imports, exports, and survives reload", async ({
  page,
}) => {
  await nav(page, "Data & import");
  const text =
    "course,teacher,level,semester,credits,mode,category,weight,assignment,earned,possible,status,due\nBiology,Ms. Smith,Regular,Fall 2026,0.5,points,Work,100,Lab,45,50,graded,2026-10-13\n";
  await page.getByLabel("Import CSV or backup").setInputFiles({
    name: "grades.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(text),
  });
  await expect(page.getByRole("dialog")).toContainText("Biology");
  await page
    .getByRole("button", { name: "Confirm import", exact: false })
    .click();
  await expect(page.locator(".data-summary")).toContainText(
    "Manual / imported",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("gradelarp-grades.csv");
  await page.reload();
  await expect(page.locator(".course-row")).toHaveCount(1);
  await expect(page.locator(".course-row")).toContainText("90.0");
});
test("invalid CSV shows error without overwriting workspace", async ({
  page,
}) => {
  await nav(page, "Data & import");
  await page.getByLabel("Import CSV or backup").setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("course,grade\nBiology,95\n"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "Missing columns" }),
  ).toBeVisible();
  await nav(page, "Overview");
  await expect(page.locator(".course-row")).toHaveCount(6);
});
test("JSON backup round-trips full workspace; clear requires confirmation", async ({
  page,
}) => {
  await nav(page, "Data & import");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Full backup", exact: true }).click();
  const backup = await event;
  const path = await backup.path();
  expect(path).not.toBeNull();
  await page
    .getByRole("button", { name: "Clear all data", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Yes, clear everything", exact: true })
    .click();
  await expect(page.locator(".data-summary")).toContainText("0");
  await page.getByLabel("Import CSV or backup").setInputFiles(path!);
  await page
    .getByRole("button", { name: "Confirm import", exact: false })
    .click();
  await expect(page.locator(".data-summary")).toContainText("6");
  await nav(page, "Overview");
  await expect(page.locator(".course-row")).toHaveCount(6);
});
test("add a manual course with assignment and credits", async ({ page }) => {
  await page.getByRole("button", { name: "+ Add course", exact: true }).click();
  await page
    .getByRole("button", { name: "Course & grading", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Course name", exact: true })
    .fill("Statistics");
  await page
    .getByRole("combobox", { name: "Grading method", exact: true })
    .selectOption("points");
  await page
    .getByRole("spinbutton", { name: "Course credits", exact: true })
    .fill("1");
  await page.getByRole("button", { name: "Assignments", exact: true }).click();
  await page
    .getByRole("button", { name: "Add assignment", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Assignment 1 name", exact: true })
    .fill("First exam");
  await page
    .getByRole("combobox", { name: "Assignment 1 status", exact: true })
    .selectOption("graded");
  await page
    .getByRole("spinbutton", { name: "Assignment 1 earned", exact: true })
    .fill("92");
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await expect(page.locator(".course-row")).toHaveCount(7);
  await expect(page.locator(".course-row").last()).toContainText("Statistics");
  await expect(page.locator(".course-row").last()).toContainText("92.0");
});
test("real snapshots only and no invented initial trend", async ({ page }) => {
  await nav(page, "Grade trends");
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
  await page
    .getByText("View snapshot data as a table", { exact: true })
    .click();
  await expect(page.locator(".calculation-details tbody tr")).toHaveCount(2);
});
test("keyboard search and dialog escape work", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search workspace", exact: true })
    .fill("chemistry");
  await page
    .getByRole("button", { name: "Honors Chemistry Fall 2026", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Honors Chemistry");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("dashboard and preferences pass accessibility scan", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".stat-card").last()).toHaveCSS("opacity", "1");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  const dialog = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dialog.violations).toEqual([]);
});
test("reduced motion and light theme render without overflow", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.getByRole("button", { name: "Daylight", exact: false }).click();
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(page.locator(".app")).toHaveClass(/light/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/${info.project.name}-light.png`,
    fullPage: true,
  });
});

test("light dashboard and course cards pass accessibility checks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.getByRole("button", { name: "Daylight", exact: false }).click();
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(page.locator(".app")).toHaveClass(/light/);
  await page.mouse.move(0, 0);
  const dashboard = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dashboard.violations).toEqual([]);
  await nav(page, "My courses 6");
  await expect(page.locator(".course-card")).toHaveCount(6);
  const courses = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(courses.violations).toEqual([]);
});
test("calculator, GPA, trends, data and course editor are accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const name of [
    "What-if lab LAB",
    "GPA planner",
    "Grade trends",
    "Data & import",
  ]) {
    await page.setViewportSize(viewport);
    await nav(page, "Overview");
    await fit(page);
    await axe(page);
    await page.screenshot({
      path: `artifacts/product-2026-10-14/overview-${viewport.width}.png`,
      fullPage: true,
    });
  }
});
