import { test, expect } from "@playwright/test";
test("gratuit : compteur persistant, reprise sans crédit et quatrième session bloquée", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Essayer un quiz", exact: true }).click();
  await expect(page.getByText("3 session(s) restante(s) aujourd’hui", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "20 questions", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "C’est parti", exact: true }).click();
  await expect(page.getByText("Question 1 sur 5", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Quitter et reprendre plus tard" }).click();
  await page.reload();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("medquiz.guest-quota.v1") ?? "[]"));
  expect(stored).toHaveLength(1);
  await page.getByRole("button", { name: "Reprendre mon quiz", exact: true }).click();
  await expect(page.getByText("Question 1 sur 5", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("medquiz.guest-quota.v1") ?? "[]").length)).toBe(1);
  await page.getByRole("button", { name: "Quitter et reprendre plus tard" }).click();
  // Simulate three completed valid sessions, then check persistence and the public start boundary.
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("medquiz.guest-quota.v1")!);
    localStorage.setItem("medquiz.guest-quota.v1", JSON.stringify([saved[0], { ...saved[0], id: "second" }, { ...saved[0], id: "third" }]));
    const state = JSON.parse(localStorage.getItem("medquiz.local.v1")!);
    state.active = null;
    localStorage.setItem("medquiz.local.v1", JSON.stringify(state));
  });
  await page.reload();
  await page.getByRole("button", { name: "Essayer un quiz", exact: true }).click();
  await expect(page.getByText("0 session(s) restante(s) aujourd’hui", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "C’est parti", exact: true })).toBeDisabled();
});
