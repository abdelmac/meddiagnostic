import { test, expect } from "@playwright/test";

test("library searches source metadata and previews bilingual unreviewed drafts", async ({ page }) => {
  await page.goto("/?lang=fr");
  await page.getByRole("button", { name: "Spécialités", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Bibliothèque & nouveaux contenus", exact: true })).toBeVisible();
  const search = page.getByRole("textbox", { name: "Rechercher dans la bibliothèque", exact: true });
  await search.fill("langman");
  await expect(page.getByText("1 résultat", { exact: true })).toBeVisible();
  await expect(page.getByText("langmans-medical-embryology compress", { exact: true })).toBeVisible();
  await search.clear();
  await page.getByRole("button", { name: "Questions en préparation (64)", exact: true }).click();
  await search.fill("diaphragme");
  await page.getByRole("button", { name: "Voir le brouillon", exact: true }).first().click();
  await expect(page.getByText("Proposition éditoriale non relue par un professionnel de santé.", { exact: true })).toBeVisible();
  await expect(page.getByText(/page\(s\) du PDF/).first()).toBeVisible();
  await expect(page.getByText(/Augmentation du volume thoracique — réponse proposée/)).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Library & new content", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Search the library", exact: true }).fill("diaphragm");
  await expect(page.getByText("Editorial proposal not yet reviewed by a healthcare professional.", { exact: true })).toBeVisible();
  await expect(page.getByText(/Increased thoracic volume — proposed answer/)).toBeVisible();
});
