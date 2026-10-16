import { test, expect, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("study")).toHaveAttribute(
    "data-webgl",
    "ready",
    { timeout: 45000 },
  );
}
async function chapter(page: Page, progress: number) {
  await page.evaluate((p) => {
    const area = document.querySelector<HTMLElement>(".story-runway")!;
    scrollTo({
      top:
        area.getBoundingClientRect().top +
        scrollY +
        (area.offsetHeight - innerHeight) * p,
      behavior: "instant",
    });
  }, progress);
  await expect
    .poll(async () =>
      Math.abs(
        Number(await page.getByTestId("study").getAttribute("data-progress")) -
          progress,
      ),
    )
    .toBeLessThan(0.0002);
  await expect(page.locator("canvas")).toHaveAttribute("data-motion", "idle");
}

test("3D input settles smoothly and stops drawing while idle", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "3D controls", exact: true }).click();
  const slider = page.getByRole("slider", { name: "Rotate gradebook" });
  await slider.focus();
  await slider.press("End");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-model-yaw",
    "1.571",
  );
  await expect(page.locator("canvas")).toHaveAttribute("data-motion", "idle");
  const frames = await page.locator("canvas").evaluate(async (canvas) => {
    const before = canvas.dataset.sceneFrames;
    await new Promise<void>((resolve) => {
      let n = 0;
      function tick() {
        if (++n === 12) resolve();
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    return [before, canvas.dataset.sceneFrames];
  });
  expect(frames[1]).toBe(frames[0]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await slider.press("Home");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-model-yaw",
    "-1.571",
  );
  await expect(page.locator("canvas")).toHaveAttribute("data-motion", "idle");
});

test("chapter handoffs stay readable and the cover slider follows the scroll pose", async ({
  page,
}) => {
  await ready(page);
  for (const p of [0.0375, 0.1475, 0.325, 0.54, 0.74, 0.915]) {
    await chapter(page, p);
    const weights = await page
      .locator("article[data-chapter]")
      .evaluateAll((nodes) =>
        nodes.map((e) =>
          Number((e as HTMLElement).style.getPropertyValue("--opacity")),
        ),
      );
    expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 3);
    expect(Math.max(...weights)).toBeGreaterThan(0.49);
    await expect(
      page.locator('article[data-chapter][aria-hidden="false"]'),
    ).toHaveCount(1);
  }
  await chapter(page, 0.43);
  await page.getByRole("button", { name: "3D controls", exact: true }).click();
  const cover = page.getByRole("slider", { name: "Open cover", exact: true });
  await expect(cover).toHaveValue("100");
  await cover.focus();
  await cover.press("Home");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-cover-open",
    "0.000",
  );
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(cover).toHaveValue("100");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-cover-open",
    "1.000",
  );
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await chapter(page, 1);
  await expect(
    page.getByRole("link", { name: "Open Gradelarp", exact: false }),
  ).toBeVisible();
  expect(await page.evaluate(() => scrollX)).toBe(0);
});

test("the existing theme keeps readable mobile navigation, product copy and credited photos", async ({
  page,
}, info) => {
  await ready(page);
  const fit = await page.evaluate(() => {
    const h1 = document.querySelector("h1")!;
    const range = document.createRange();
    range.selectNodeContents(h1);
    return {
      right: range.getBoundingClientRect().right,
      rail: document.querySelector(".side-rail")!.getBoundingClientRect().left,
    };
  });
  expect(fit.right).toBeLessThanOrEqual(fit.rail);
  const screens = await page
    .locator(".story-runway")
    .evaluate((e) => (e as HTMLElement).offsetHeight / innerHeight);
  expect(screens).toBeGreaterThan(10);
  expect(screens).toBeLessThanOrEqual(23);
  await chapter(page, 0.43);
  const brand = await page
    .getByRole("button", { name: "Gradelarp, return to intro" })
    .boundingBox();
  const nav = await page
    .getByRole("navigation", { name: "Chapters" })
    .boundingBox();
  expect(brand!.x + brand!.width + 4).toBeLessThanOrEqual(nav!.x);
  await chapter(page, 0.65);
  for (const credit of await page.locator(".study-photo figcaption a").all()) {
    expect(
      await credit.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    ).toBeGreaterThanOrEqual(8);
  }
  if (info.project.name === "desktop") {
    const photo = page.locator(".study-photo.writing");
    const before = await photo.evaluate((e) => getComputedStyle(e).transform);
    await page.mouse.move(700, 700);
    await expect
      .poll(() => photo.evaluate((e) => getComputedStyle(e).transform))
      .not.toBe(before);
  }
  await chapter(page, 0.83);
  const description = page.locator(".product-description");
  await expect(description).toHaveCSS("background-color", "rgb(23, 24, 32)");
  await expect(description).toContainText("School-reported averages");
  await page
    .getByRole("group", { name: "Explore Gradelarp tools" })
    .getByRole("button", { name: "Planner", exact: false })
    .click();
  await expect(description).toContainText("Manual profiles");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/polish-2026-10-15/${info.project.name}-readability.png`,
  });
});
