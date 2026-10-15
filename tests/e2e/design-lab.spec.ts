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
