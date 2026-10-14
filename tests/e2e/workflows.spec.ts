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
test("multi-score scenario, hypothetical additions, target solver, save and restore leave real grades unchanged", async ({
  page,
}, info) => {
  const before = JSON.parse(await stored(page));
  const actual = before.profiles.find(
    (p: { id: string }) => p.id === before.activeProfileId,
  ).state.courses;
  await nav(page, "What-if calculator");
  await page
    .locator(".product-scenario-table tbody tr")
    .first()
    .screenshot({
      path: `artifacts/product-2026-10-14/${info.project.name}-scenario-row.png`,
      scale: "css",
    });
  await page.getByLabel("Scenario 1 earned", { exact: true }).fill("100");
  await page.getByLabel("Scenario 2 earned", { exact: true }).fill("100");
  await expect(page.getByTestId("projected-grade")).toContainText("97.2");
  await expect(page.getByTestId("actual-grade")).toContainText("94.9");
  await page
    .getByRole("button", { name: "Add hypothetical assignment", exact: true })
    .click();
  await page
    .getByLabel("Hypothetical 8 name", { exact: true })
    .fill("Final exam possibility");
  await page.getByLabel("Scenario 8 earned", { exact: true }).fill("100");
  await expect(page.getByTestId("projected-grade")).toContainText("97.5");
  await page.getByLabel("Target course grade", { exact: true }).fill("99");
  await expect(page.getByTestId("required-score")).toContainText(
    "Not with this assignment alone.",
  );
  await page.getByLabel("Scenario name", { exact: true }).fill("Strong finish");
  await page
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  await saved(page);
  await page
    .getByRole("button", { name: "Reset simulation", exact: true })
    .click();
  await expect(page.getByTestId("projected-grade")).toContainText("94.9");
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByTestId("projected-grade")).toContainText("97.5");
  await page.reload();
  await nav(page, "What-if calculator");
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByTestId("projected-grade")).toContainText("97.5");
  await page
    .getByLabel("Scenario name", { exact: true })
    .fill("Strong finish revised");
  await page
    .getByRole("button", { name: "Update scenario", exact: true })
    .click();
  const comparison = page.getByRole("region", {
    name: "Saved scenario comparison",
  });
  await expect(comparison.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Reset simulation", exact: true })
    .click();
  await page.getByLabel("Scenario 1 earned", { exact: true }).fill("0");
  await page.getByLabel("Scenario name", { exact: true }).fill("Missed exam");
  await page
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  await saved(page);
  await expect(comparison.locator("tbody tr")).toHaveCount(2);
  await expect(
    comparison.getByRole("row").filter({ hasText: "Missed exam" }),
  ).toContainText("76.1%");
  await expect(
    comparison.getByRole("row").filter({ hasText: "Strong finish revised" }),
  ).toContainText("97.5%");
  await page
    .getByRole("button", { name: "Delete scenario Missed exam", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await saved(page);
  await expect(comparison.locator("tbody tr")).toHaveCount(1);
  const after = JSON.parse(await stored(page));
  expect(
    after.profiles.find((p: { id: string }) => p.id === after.activeProfileId)
      .state.courses,
  ).toEqual(actual);
});
test("actual course editing persists and captures genuine assignment history", async ({
  page,
}) => {
  await openCourse(page);
  await page.getByLabel("Assignment 1 earned", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await saved(page);
  await expect(page.getByTestId("course-select").first()).toContainText("96.1");
  await page.reload();
  await expect(page.getByTestId("course-select").first()).toContainText("96.1");
  await nav(page, "Grade history");
  await expect(
    page.getByText("2 real snapshots", { exact: true }),
  ).toBeVisible();
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
  await expect(page.locator('[data-widget="activity"]')).toContainText(
    "94.0 → 100.0%",
  );
});
test("missing, exempt, dropped and invalid scores use real grading rules without accidental save", async ({
  page,
}) => {
  await openCourse(page);
  await page
    .getByLabel("Assignment 1 status", { exact: true })
    .selectOption("missing");
  await expect(page.locator(".editor-grade")).toContainText("76.1");
  await page
    .getByLabel("Assignment 1 status", { exact: true })
    .selectOption("exempt");
  await expect(page.locator(".editor-grade")).toContainText("95.5");
  await page
    .getByLabel("Assignment 1 status", { exact: true })
    .selectOption("dropped");
  await expect(page.locator(".editor-grade")).toContainText("95.5");
  await page
    .getByLabel("Assignment 1 status", { exact: true })
    .selectOption("graded");
  await page.getByLabel("Assignment 1 earned", { exact: true }).fill("101");
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Score must not exceed" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByTestId("course-select").first()).toContainText("94.9");
});
test("create course, configure points and credits, add/edit/delete assignment, and change semester", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Add course", exact: true }).click();
  await page
    .getByRole("button", { name: "Course & grading", exact: true })
    .click();
  await page.getByLabel("Course name", { exact: true }).fill("Statistics");
  await page
    .getByLabel("Grading method", { exact: true })
    .selectOption("points");
  await page.getByLabel("Course credits", { exact: true }).fill("1");
  await page
    .getByRole("dialog")
    .getByLabel("Semester", { exact: true })
    .fill("Spring 2027");
  await page.getByRole("button", { name: "Assignments", exact: true }).click();
  await page
    .getByRole("button", { name: "Add assignment", exact: true })
    .click();
  await page
    .getByLabel("Assignment 1 name", { exact: true })
    .fill("First exam");
  await page
    .getByLabel("Assignment 1 status", { exact: true })
    .selectOption("graded");
  await page.getByLabel("Assignment 1 earned", { exact: true }).fill("92");
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await saved(page);
  await expect(page.getByLabel("Active semester")).toHaveValue("Spring 2027");
  await expect(page.getByTestId("course-select")).toHaveCount(1);
  await expect(page.getByTestId("course-select")).toContainText("92.0");
  await page.reload();
  await page.getByLabel("Active semester").selectOption("Spring 2027");
  await openCourse(page);
  await page.getByLabel("Assignment 1 earned", { exact: true }).fill("95");
  await page
    .getByRole("button", { name: "Add assignment", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Delete assignment New assignment",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await expect(page.getByTestId("course-select")).toContainText("95.0");
  await appearance(page);
  await expect(page.getByLabel("Semester start", { exact: true })).toHaveValue(
    "",
  );
  await page.getByLabel("Semester start", { exact: true }).fill("2027-01-11");
  await page.getByLabel("Semester end", { exact: true }).fill("2027-05-28");
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await saved(page);
  await page.reload();
  await page.getByLabel("Active semester").selectOption("Spring 2027");
  await appearance(page);
  await expect(page.getByLabel("Semester start", { exact: true })).toHaveValue(
    "2027-01-11",
  );
  await expect(page.getByLabel("Semester end", { exact: true })).toHaveValue(
    "2027-05-28",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const workspace = JSON.parse(await stored(page));
  const active = workspace.profiles.find(
    (p: { id: string }) => p.id === workspace.activeProfileId,
  );
  expect(active.periods["Spring 2027"]).toEqual({
    start: "2027-01-11",
    end: "2027-05-28",
  });
  expect(Object.keys(active.periods)).toHaveLength(2);
});
test("course deletion requires explicit confirmation and persists", async ({
  page,
}) => {
  await openCourse(page);
  await page
    .getByRole("button", { name: "Delete course", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirm deletion", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep course", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Delete course", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm deletion", exact: true })
    .click();
  await saved(page);
  await page.reload();
  await expect(page.getByTestId("course-select")).toHaveCount(5);
});
test("theme, custom accent, layout, density, motion, widget order and visibility persist", async ({
  page,
}) => {
  await appearance(page);
  await fit(page);
  await page
    .getByRole("button", { name: "Midnight preset", exact: true })
    .click();
  await page.getByLabel("Accent hex", { exact: true }).fill("#123456");
  await page
    .getByLabel("Interface density", { exact: true })
    .selectOption("compact");
  await page
    .getByLabel("Animation intensity", { exact: true })
    .selectOption("none");
  await page
    .getByLabel("Dashboard layout", { exact: true })
    .selectOption("wide");
  await page
    .getByLabel("Categories & recent changes", { exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Move Course cards down", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await saved(page);
  await expect(page.locator(".product-root")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  await expect(page.locator(".product-root")).toHaveAttribute(
    "data-density",
    "compact",
  );
  await expect(page.locator('[data-widget="activity"]')).toHaveCount(0);
  await expect(page.locator("[data-widget]").first()).toHaveAttribute(
    "data-widget",
    "distribution",
  );
  await page.reload();
  await expect(page.locator(".product-root")).toHaveAttribute(
    "data-layout",
    "wide",
  );
  await appearance(page);
  await expect(page.getByLabel("Accent hex", { exact: true })).toHaveValue(
    "#123456",
  );
  await expect(
    page.getByLabel("Animation intensity", { exact: true }),
  ).toHaveValue("none");
  await axe(page);
});
test("keyboard widget drag reorders and persists", async ({ page }) => {
  const handle = page.getByRole("button", {
    name: "Reorder distribution widget",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  // Activation precedes the sensor's first layout measurement. Wait for its
  // measured drop target, not just the synchronous pressed state.
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
    "distribution was moved over droppable area distribution",
  );
  await page.keyboard.press(
    (page.viewportSize()?.width ?? 1440) < 740 ? "ArrowDown" : "ArrowRight",
  );
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText("upcoming");
  await page.keyboard.press("Space");
  await expect(page.locator("[data-widget]").nth(1)).toHaveAttribute(
    "data-widget",
    "upcoming",
  );
  await saved(page);
  const order = await page
    .locator("[data-widget]")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-widget")));
  expect(order).not.toEqual([
    "courses",
    "distribution",
    "upcoming",
    "activity",
  ]);
  await page.reload();
  expect(
    await page
      .locator("[data-widget]")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-widget"))),
  ).toEqual(order);
});
test("weighted, unweighted, projected and cumulative GPA update with an editable policy", async ({
  page,
}) => {
  await nav(page, "GPA planner");
  await expect(page.getByTestId("cumulative-gpa")).toHaveText("4.42");
  await expect(page.locator(".product-kpis")).toContainText("3.83");
  await page
    .getByLabel("Projected final AP Calculus AB", { exact: true })
    .fill("70");
  await expect(page.getByTestId("projected-gpa")).toHaveText("4.08");
  await page
    .getByRole("button", { name: "Edit grading policy", exact: true })
    .click();
  await page.getByLabel("AP bonus", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Save policy", exact: true }).click();
  await expect(page.getByTestId("cumulative-gpa")).toHaveText("3.92");
  await page.getByLabel("Goal cumulative GPA", { exact: true }).fill("5");
  await expect(page.getByTestId("future-gpa")).toContainText("Not attainable");
  await saved(page);
  await page.reload();
  await nav(page, "GPA planner");
  await expect(page.getByTestId("cumulative-gpa")).toHaveText("3.92");
  await expect(
    page.getByLabel("Projected final AP Calculus AB", { exact: true }),
  ).toHaveValue("70");
});
test("manual transcript records contribute to cumulative GPA and export", async ({
  page,
}) => {
  await nav(page, "Academic tools");
  await page.getByRole("button", { name: "Report cards", exact: true }).click();
  await page
    .getByRole("button", { name: "Add transcript record", exact: true })
    .click();
  await page.getByLabel("Transcript course", { exact: true }).fill("Algebra I");
  await page
    .getByLabel("Transcript semester", { exact: true })
    .fill("Fall 2025");
  await page.getByLabel("Transcript credits", { exact: true }).fill("1");
  await page.getByLabel("Final grade percent", { exact: true }).fill("85");
  await page
    .getByRole("button", { name: "Save transcript record", exact: true })
    .click();
  await expect(page.locator(".product-report")).toContainText("Algebra I");
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export transcript", exact: true })
    .click();
  expect((await event).suggestedFilename()).toBe("gradelarp-transcript.csv");
  await saved(page);
  await nav(page, "GPA planner");
  await expect(page.getByTestId("cumulative-gpa")).toHaveText("4.06");
  await page
    .getByLabel("GPA period", { exact: true })
    .selectOption("Fall 2026");
  await expect(page.locator(".product-kpis").first()).toContainText("4.42");
});
test("CSV imports a new profile without erasing demo or manual data; export works", async ({
  page,
}) => {
  await nav(page, "Data & backups");
  const csv =
    "course,teacher,level,semester,credits,mode,category,weight,assignment,earned,possible,status,due\nBiology,Ms. Smith,Regular,Fall 2026,0.5,points,Work,100,Lab,45,50,graded,2026-10-14\n";
  await page.getByLabel("Import CSV or backup").setInputFiles({
    name: "grades.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByRole("dialog")).toContainText("Biology");
  await page
    .getByRole("button", { name: "Confirm import", exact: true })
    .click();
  await saved(page);
  await expect(page.getByTestId("course-select")).toHaveCount(1);
  await expect(page.getByTestId("course-select")).toContainText("90.0");
  await nav(page, "Data & backups");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  expect((await event).suggestedFilename()).toBe("gradelarp-grades.csv");
  const data = JSON.parse(await stored(page));
  expect(data.profiles).toHaveLength(3);
  expect(
    data.profiles.find((p: { state: { demo: boolean } }) => p.state.demo).state
      .courses,
  ).toHaveLength(6);
});
test("invalid CSV and backup reject without overwriting any profile", async ({
  page,
}) => {
  const before = await stored(page);
  await nav(page, "Data & backups");
  await page.getByLabel("Import CSV or backup").setInputFiles({
    name: "bad.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("course,grade\nBiology,90"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "Missing columns" }),
  ).toBeVisible();
  await page.getByLabel("Import CSV or backup").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.locator(".error-message")).toBeVisible();
  expect(await stored(page)).toBe(before);
});
test("complete JSON backup restores academic records, profiles and scenarios without destructive replacement", async ({
  page,
}) => {
  await nav(page, "Assignment planner");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page
    .getByLabel("Task title", { exact: true })
    .fill("Backup proof task");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await saved(page);
  await nav(page, "Data & backups");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Full backup", exact: true }).click();
  const path = await (await event).path();
  expect(path).not.toBeNull();
  await page
    .getByRole("button", { name: "Clear current profile", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByLabel("Import CSV or backup").setInputFiles(path!);
  await page
    .getByRole("button", { name: "Confirm import", exact: true })
    .click();
  await saved(page);
  const data = JSON.parse(await stored(page));
  expect(data.profiles).toHaveLength(4);
  expect(
    data.profiles.filter((p: { tasks: { title: string }[] }) =>
      p.tasks.some((t) => t.title === "Backup proof task"),
    ),
  ).toHaveLength(2);
});
test("a new manual student can create real weighted grades independently of demo data", async ({
  page,
}, info) => {
  await profiles(page);
  await page.getByLabel("New student name", { exact: true }).fill("Jordan");
  await page
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your next chapter starts right here." }),
  ).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your next chapter starts right here." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add your first course", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Course & grading", exact: true })
    .click();
  await page.getByLabel("Course name", { exact: true }).fill("Manual algebra");
  await page.getByRole("button", { name: "Assignments", exact: true }).click();
  await page
    .getByRole("button", { name: "Add assignment", exact: true })
    .click();
  await page.getByLabel("Assignment 1 possible", { exact: true }).fill("10");
  await page
    .getByLabel("Assignment 1 status", { exact: true })
    .selectOption("graded");
  await page.getByLabel("Assignment 1 earned", { exact: true }).fill("9");
  await page
    .getByRole("button", { name: "Add assignment", exact: true })
    .click();
  await page
    .getByLabel("Assignment 2 category", { exact: true })
    .selectOption({ label: "Daily work" });
  await page.getByLabel("Assignment 2 possible", { exact: true }).fill("5");
  await page
    .getByLabel("Assignment 2 status", { exact: true })
    .selectOption("graded");
  await page.getByLabel("Assignment 2 earned", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await saved(page);
  await page.reload();
  await expect(page.getByTestId("course-select")).toHaveCount(1);
  await expect(page.getByTestId("course-select")).toContainText("86.0");
  await expect(page.locator(".product-status-line")).toContainText(
    "Manual / imported grades",
  );
  await expect(page.locator(".product-demo-banner")).toHaveCount(0);
  await page.screenshot({
    path: `artifacts/product-2026-10-14/${info.project.name}-manual-student.png`,
    scale: "css",
    fullPage: false,
  });
  await profiles(page);
  await page.getByRole("button").filter({ hasText: "Alex · Demo" }).click();
  await expect(page.getByTestId("course-select")).toHaveCount(6);
  await profiles(page);
  await expect(
    page.getByRole("button").filter({ hasText: "Jordan" }),
  ).toBeVisible();
  await page.getByRole("button").filter({ hasText: "Jordan" }).click();
  await expect(page.getByTestId("course-select")).toHaveCount(1);
  await expect(page.getByTestId("course-select")).toContainText("86.0");
});
test("planner tasks, completion, calendar and gradebook deadlines persist independently", async ({
  page,
}) => {
  const before = JSON.parse(await stored(page));
  const grades = before.profiles.find(
    (p: { id: string }) => p.id === before.activeProfileId,
  ).state.courses;
  await nav(page, "Assignment planner");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page
    .getByLabel("Task title", { exact: true })
    .fill("Study reaction rates");
  await page.getByLabel("Priority", { exact: true }).selectOption("high");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "Complete Study reaction rates",
      exact: true,
    })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Complete Unit 3: applications test",
      exact: true,
    })
    .click();
  await page.getByLabel("Show tasks", { exact: true }).selectOption("done");
  await expect(
    page.getByText("Study reaction rates", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(page.locator(".product-calendar")).toBeVisible();
  await fit(page);
  await saved(page);
  await page.reload();
  await nav(page, "Assignment planner");
  await page.getByLabel("Show tasks", { exact: true }).selectOption("done");
  await expect(
    page.getByRole("checkbox", {
      name: "Complete Study reaction rates",
      exact: true,
    }),
  ).toBeChecked();
  const after = JSON.parse(await stored(page));
  expect(
    after.profiles.find((p: { id: string }) => p.id === after.activeProfileId)
      .state.courses,
  ).toEqual(grades);
});
test("manual weekly schedule, attendance, teachers and goals complete real persistent workflows", async ({
  page,
}) => {
  await nav(page, "Academic tools");
  await page
    .getByRole("button", { name: "Add class block", exact: true })
    .click();
  await page.getByLabel("Block name", { exact: true }).fill("Chemistry block");
  await page.getByLabel("Room", { exact: true }).fill("Lab 204");
  await page
    .getByRole("button", { name: "Save class block", exact: true })
    .click();
  await expect(page.locator(".product-schedule-grid")).toContainText(
    "Chemistry block",
  );
  await page.getByRole("button", { name: "Attendance", exact: true }).click();
  await page
    .getByRole("button", { name: "Record attendance", exact: true })
    .click();
  await page
    .getByLabel("Attendance status", { exact: true })
    .selectOption("tardy");
  await page
    .getByRole("button", { name: "Save attendance", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Attendance entries" }),
  ).toContainText("tardy");
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  await page
    .getByRole("button", { name: "Add teacher contact", exact: true })
    .click();
  await page.getByLabel("Teacher name", { exact: true }).fill("Ms. Example");
  await page
    .getByLabel("Teacher email", { exact: true })
    .fill("teacher@example.com");
  await page
    .getByRole("button", { name: "Save teacher contact", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "teacher@example.com" }),
  ).toHaveAttribute("href", "mailto:teacher@example.com");
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page.getByRole("button", { name: "Add goal", exact: true }).click();
  await page
    .getByLabel("Goal title", { exact: true })
    .fill("Practice every weekday");
  await page
    .getByRole("button", { name: "Save academic goal", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Complete goal Practice every weekday",
      exact: true,
    })
    .check();
  await saved(page);
  await page.reload();
  await nav(page, "Academic tools");
  await expect(page.locator(".product-schedule-grid")).toContainText(
    "Chemistry block",
  );
  const data = JSON.parse(await stored(page));
  const p = data.profiles.find(
    (x: { id: string }) => x.id === data.activeProfileId,
  );
  expect(p.schedules).toHaveLength(1);
  expect(p.attendance[0].status).toBe("tardy");
  expect(p.contacts[0].email).toBe("teacher@example.com");
  expect(p.goals[0].done).toBe(true);
});
test("real snapshots only, interactive charts, no invented trend", async ({
  page,
}) => {
  await nav(page, "Grade history");
  await expect(
    page.getByText("1 real snapshot", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".trend-chart")).toHaveCount(0);
  await page.getByRole("button", { name: "Target gaps", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Target gaps", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
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
test("keyboard search, Escape, and every primary navigation destination work", async ({
  page,
}) => {
  await page.keyboard.press("Control+k");
  await page
    .getByRole("dialog")
    .getByLabel("Search workspace", { exact: true })
    .fill("chemistry");
  await page
    .getByRole("button", { name: "Honors Chemistry Fall 2026", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Honors Chemistry");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const name of [
    "Courses",
    "What-if calculator",
    "GPA planner",
    "Grade history",
    "Assignment planner",
    "Academic tools",
    "Data & backups",
    "Overview",
  ]) {
    await nav(page, name);
    await fit(page);
  }
});
test("all destinations and appearance pass accessibility checks in light and dark", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  for (const theme of ["light", "dark"]) {
    const toggle = page.getByRole("button", {
      name: `Switch to ${theme} mode`,
      exact: true,
    });
    if (await toggle.isVisible()) await toggle.click();
    await saved(page);
    for (const name of [
      "Overview",
      "Courses",
      "What-if calculator",
      "GPA planner",
      "Grade history",
      "Assignment planner",
      "Academic tools",
      "Data & backups",
    ]) {
      await nav(page, name);
      await axe(page);
      await fit(page);
    }
    await nav(page, "Overview");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `artifacts/product-2026-10-14/${info.project.name}-${theme}-overview.png`,
      fullPage: true,
    });
  }
  await appearance(page);
  await axe(page);
});
test("legacy migration is byte-preserving and design lab edits cannot alter the real product", async ({
  page,
}) => {
  const before = await stored(page);
  await page.goto("/design-lab/expressive");
  await expect(page.getByTestId("course-select")).toHaveCount(6);
  await page.getByTestId("course-open").click();
  await page.getByLabel("Assignment 1 earned", { exact: true }).fill("70");
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await expect(
    page.getByText("Saved in this preview", { exact: true }).first(),
  ).toHaveText("Saved in this preview");
  expect(await stored(page)).toBe(before);
  await page.goto("/");
  await expect(page.getByTestId("course-select").first()).toContainText("94.9");
});
// A separate context exercises first-load migration without any product database seeded by ready().
test("cold upgrade preserves an existing real gradebook verbatim", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(baseURL + "/icon.svg");
  const legacy = createDemo();
  legacy.demo = false;
  legacy.settings.name = "Preserved student";
  legacy.courses[0].name = "Real Calculus";
  await page.evaluate(
    (state) =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("gradelarp", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("workspace");
        r.onsuccess = () => {
          const d = r.result;
          const tx = d.transaction("workspace", "readwrite");
          tx.objectStore("workspace").put(state, "state");
          tx.oncomplete = () => {
            d.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    legacy,
  );
  await page.goto(baseURL + "/");
  await expect(page.getByTestId("course-select").first()).toContainText(
    "Real Calculus",
  );
  const data = JSON.parse(await stored(page));
  expect(data.profiles[0].state).toEqual(legacy);
  const preserved = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("gradelarp", 1);
        r.onsuccess = () => {
          const d = r.result;
          const g = d
            .transaction("workspace")
            .objectStore("workspace")
            .get("state");
          g.onsuccess = () => {
            d.close();
            resolve(g.result);
          };
        };
      }),
  );
  expect(preserved).toEqual(legacy);
  await context.close();
});

test("concurrent tabs detect stale writes instead of silently overwriting grades", async ({
  page,
  context,
}) => {
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByTestId("course-select")).toHaveCount(6);
  await openCourse(page);
  await page.getByLabel("Assignment 1 earned", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await saved(page);
  await openCourse(second);
  await second.getByLabel("Assignment 1 earned", { exact: true }).fill("70");
  await second
    .getByRole("button", { name: "Save course", exact: true })
    .click();
  await expect(
    second
      .getByRole("alert")
      .filter({ hasText: "Another tab saved newer data" }),
  ).toBeVisible();
  const data = JSON.parse(await stored(page));
  expect(
    data.profiles.find((p: { id: string }) => p.id === data.activeProfileId)
      .state.courses[0].assignments[0].earned,
  ).toBe(100);
  await second.close();
});

test("tablet and wide layouts preserve Expressive hierarchy and accessible controls", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Viewport sweep runs once; all workflows separately run on mobile.",
  );
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1920, height: 1080 },
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
