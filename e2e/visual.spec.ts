import { test, expect } from "@playwright/test";
test("accueil et parcours sans débordement avec texte agrandi", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Essayer un quiz" }),
  ).toBeVisible();
  const heading = await page
    .getByRole("heading", { name: /Un nouveau jour pour apprendre/ })
    .boundingBox();
  expect(heading!.x + heading!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.screenshot({
    path: `artifacts/accueil-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Profil", exact: true }).click();
  await page.getByRole("switch", { name: "Texte plus grand" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Accueil", exact: true }).click();
  await page.getByRole("button", { name: "Essayer un quiz" }).click();
  await page.getByRole("button", { name: "C’est parti" }).click();
  await expect(
    page.getByText("Question 1 sur 5", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
