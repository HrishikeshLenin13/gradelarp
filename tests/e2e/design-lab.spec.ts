import { test, expect } from "@playwright/test";
for (const path of [
  "/design-lab",
  "/design-lab/precision",
  "/design-lab/expressive",
  "/design-lab/kinetic",
]) {
  test(`retired sample route ${path} redirects to sign-in without seeding grades`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Less checking. More understanding." }),
    ).toBeVisible();
    await expect(page.getByText("Alex · Demo", { exact: true })).toHaveCount(0);
  });
}
