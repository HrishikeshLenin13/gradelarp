import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("landing opens the real HAC app without contacting HAC or creating grades first", async ({
  page,
}, info) => {
  const errors: string[] = [];
  let requests = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().includes("/api/hac")) requests++;
  });
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("gradelarp");
  await expect(page.getByTestId("study")).toHaveAttribute(
    "data-webgl",
    "ready",
    { timeout: 45000 },
  );
  expect(requests).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/homepage-flow-2026-10-16/${info.project.name}-homepage.png`,
  });
  await page.getByRole("link", { name: "Open app", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByTestId("hac-entry")).toBeVisible();
  await expect(page.getByLabel("HAC username", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/homepage-flow-2026-10-16/${info.project.name}-signin.png`,
  });
  const homepage = page.getByRole("link", { name: "3D website", exact: true });
  await expect(homepage).toBeVisible();
  const linkBox = await homepage.boundingBox();
  const brandBox = await page
    .getByRole("link", { name: "Gradelarp home", exact: true })
    .boundingBox();
  expect(linkBox!.x).toBeGreaterThan(brandBox!.x + brandBox!.width);
  expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(
    await page.evaluate(() => innerWidth),
  );
  await homepage.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("study")).toHaveAttribute(
    "data-webgl",
    "ready",
    { timeout: 45000 },
  );
  expect(errors).toEqual([]);
});
test("landing stylesheet and scroll state never leak into a returning workspace", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("study")).toHaveAttribute(
    "data-webgl",
    "ready",
    { timeout: 45000 },
  );
  await page.getByRole("link", { name: "Open app", exact: true }).click();
  await page
    .getByRole("button", { name: "Continue with manual grades instead" })
    .click();
  await expect(page.locator(".product-root")).toBeVisible();
  const before = await page.locator(".product-root").evaluate((e) => ({
    font: getComputedStyle(e).fontFamily,
    bg: getComputedStyle(e).backgroundColor,
    color: getComputedStyle(e).color,
  }));
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("link", { name: "Gradelarp 3D website", exact: true })
    .click();
  await expect(page.getByTestId("study")).toHaveAttribute(
    "data-webgl",
    "ready",
    { timeout: 45000 },
  );
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("study")).toHaveAttribute(
    "data-webgl",
    "ready",
    { timeout: 45000 },
  );
  await page.getByRole("link", { name: "Open app", exact: true }).click();
  await expect(page.locator(".product-root")).toBeVisible();
  const after = await page.locator(".product-root").evaluate((e) => ({
    font: getComputedStyle(e).fontFamily,
    bg: getComputedStyle(e).backgroundColor,
    color: getComputedStyle(e).color,
  }));
  expect(after).toEqual(before);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});

test("3D controls respond to keyboard and touch-friendly controls while vertical scrolling remains native", async ({
  page,
}, info) => {
  await page.goto("/");
  const study = page.getByTestId("study");
  await expect(study).toHaveAttribute("data-webgl", "ready", {
    timeout: 45000,
  });
  const description = await page.locator(".opening-description").boundingBox();
  const preview = await page.locator(".opening-preview").boundingBox();
  if (info.project.name === "mobile") {
    expect(description!.y + description!.height).toBeLessThan(preview!.y);
  }
  await page.getByRole("button", { name: "3D controls", exact: true }).click();
  const rotate = page.getByRole("slider", { name: "Rotate gradebook" });
  await rotate.focus();
  await rotate.press("End");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-model-yaw",
    "1.571",
  );
  const cover = page.getByRole("slider", { name: "Open cover", exact: true });
  await cover.focus();
  await cover.press("End");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-cover-open",
    "1.000",
  );
  await page
    .getByRole("group", { name: "Gradebook page", exact: true })
    .getByRole("button", { name: "Planner", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-selected-page",
    "2",
  );
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-model-yaw",
    "0.000",
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-cover-open",
    "0.000",
  );
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(rotate).toHaveCount(0);
  await page.mouse.wheel(0, 2500);
  await expect
    .poll(async () => Number(await study.getAttribute("data-progress")))
    .toBeGreaterThan(0.03);
  expect(await page.evaluate(() => scrollX)).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(study).toHaveAttribute("data-reduced-motion", "true");
  await page.getByRole("button", { name: "3D controls", exact: true }).click();
  await page.getByRole("slider", { name: "Open cover", exact: true }).focus();
  await page
    .getByRole("slider", { name: "Open cover", exact: true })
    .press("End");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-cover-open",
    "1.000",
  );
  await page.screenshot({
    path: `artifacts/integration-2026-10-15/${info.project.name}-interactive.png`,
  });
});
