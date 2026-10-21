import { test, expect } from "@playwright/test";

test("a real answer earns the study day, survives reload and only celebrates once", async ({
  page,
}) => {
  await page.goto("/?lang=fr");
  await expect(
    page.getByRole("heading", { name: "0 jours de suite", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("streak-celebration")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Essayer un quiz", exact: true })
    .click();
  await page.getByRole("button", { name: "C’est parti", exact: true }).click();
  await page.getByRole("radio").first().click();
  await page
    .getByRole("button", { name: "Valider ma réponse", exact: true })
    .click();
  await expect(page.getByTestId("streak-celebration")).toBeVisible();
  await expect(
    page.getByText("Votre journée de révision est validée !", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Fermer le message de série", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Quitter et reprendre plus tard",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "1 jour de suite", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "1 jour de suite", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("streak-celebration")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Reprendre mon quiz", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Question suivante", exact: true })
    .click();
  await page.getByRole("radio").first().click();
  await page
    .getByRole("button", { name: "Valider ma réponse", exact: true })
    .click();
  await expect(
    page.getByText("Les indices qui font la différence", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("streak-celebration")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Quitter et reprendre plus tard",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "1 jour de suite", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "English", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "1 day streak", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("YOUR STUDY RHYTHM", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
