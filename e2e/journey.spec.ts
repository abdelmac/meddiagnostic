import { test, expect, type Page } from "@playwright/test";
async function start(page: Page, exam = false) {
  await page.getByRole("button", { name: "Essayer un quiz" }).click();
  if (exam)
    await page
      .getByRole("button", { name: "Examen · correction à la fin" })
      .click();
  await page.getByRole("button", { name: "C’est parti" }).click();
  await expect(
    page.getByText("Question 1 sur 5", { exact: true }),
  ).toBeVisible();
}
async function answer(page: Page, exam = false) {
  await page.getByRole("radio").first().click();
  await page
    .getByRole("button", {
      name: exam ? "Enregistrer ma réponse" : "Valider ma réponse",
    })
    .click();
}
test("invité : quiz, reprise, bilan, corrections, révisions et favoris", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Les bons réflexes commencent")).toBeVisible();
  await start(page);
  await answer(page);
  await expect(
    page.getByText("Les indices qui font la différence"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Garder en favori" }).click();
  await page.getByRole("button", { name: "À revoir", exact: true }).click();
  await page
    .getByRole("button", { name: "Quitter et reprendre plus tard" })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Reprendre mon quiz" }).click();
  await expect(
    page.getByText("Question 1 sur 5", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Les indices qui font la différence"),
  ).toBeVisible();
  for (let i = 1; i < 5; i++) {
    await page.getByRole("button", { name: "Question suivante" }).click();
    await expect(
      page.getByText(`Question ${i + 1} sur 5`, { exact: true }),
    ).toBeVisible();
    await answer(page);
  }
  await page.getByRole("button", { name: "Voir mon bilan" }).click();
  await expect(
    page.getByText("Un pas de plus dans votre apprentissage."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retrouver mes révisions" }).click();
  await expect(
    page.getByText("Ce qui mérite un deuxième regard"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Favoris", exact: true }).click();
  await expect(
    page.getByText("Consulter le corrigé", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lancer mes révisions" }).click();
  await expect(
    page.getByText("Question 1 sur 1", { exact: true }),
  ).toBeVisible();
  await answer(page);
  await page.getByRole("button", { name: "Voir mon bilan" }).click();
  await expect(
    page.getByText("Un pas de plus dans votre apprentissage."),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("examen : correction différée et bilan disponible", async ({ page }) => {
  await page.goto("/");
  await start(page, true);
  for (let i = 0; i < 5; i++) {
    await answer(page, true);
    await expect(
      page.getByText("Les indices qui font la différence"),
    ).toHaveCount(0);
    await page
      .getByRole("button", {
        name: i === 4 ? "Voir mon bilan" : "Question suivante",
      })
      .click();
  }
  await expect(page.getByText("Revenir sur les raisonnements")).toBeVisible();
});
test("adaptation au stock, préférences persistantes et absence de débordement", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Commencer un quiz de Dermatologie" })
    .click();
  await page.getByRole("button", { name: "20 questions", exact: true }).click();
  await expect(
    page.getByText(
      "10 questions disponibles : la session sera adaptée, sans répétition.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("button", { name: "Profil", exact: true }).click();
  await page.getByRole("switch", { name: "Mode sombre" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Profil", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Mode sombre" })).toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
