import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
const file = ".local/account-fixtures.json";
test("comptes réels : import invité, deux appareils, retrait de favori et isolation", async ({
  browser,
}) => {
  test.skip(
    test.info().project.name !== "desktop",
    "Multi-context integration is exercised once.",
  );
  test.skip(!existsSync(file), "Requires temporary Supabase test accounts.");
  const fixture = JSON.parse(readFileSync(file, "utf8"));
  const alice = fixture.users[0];
  const bob = fixture.users[1];
  const contexts = await Promise.all([
    browser.newContext({ locale: "fr-FR" }),
    browser.newContext({ locale: "fr-FR" }),
    browser.newContext({ locale: "fr-FR" }),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8081";
  const { initialState } = await import("../src/domain/engine");
  await pages[0]!.addInitScript(
    ({ storageKey, session, email, guest }) => {
      localStorage.setItem(storageKey, JSON.stringify(session));
      localStorage.setItem("medquiz.pending-import", email);
      localStorage.setItem("medquiz.local.v1", JSON.stringify(guest));
    },
    {
      storageKey: fixture.storageKey,
      session: alice.session,
      email: alice.email,
      guest: {
        ...initialState,
        favorites: ["cardiologie-1"],
        preferences: { ...initialState.preferences, dailyGoal: 20 },
      },
    },
  );
  await pages[1]!.addInitScript(
    ({ storageKey, session }) =>
      localStorage.setItem(storageKey, JSON.stringify(session)),
    { storageKey: fixture.storageKey, session: alice.session },
  );
  await pages[2]!.addInitScript(
    ({ storageKey, session }) =>
      localStorage.setItem(storageKey, JSON.stringify(session)),
    { storageKey: fixture.storageKey, session: bob.session },
  );
  for (const p of pages) {
    await p.goto(base);
    await p.getByRole("button", { name: "Profil", exact: true }).click();
  }
  await expect(pages[0]!.getByText(alice.email, { exact: true })).toBeVisible();
  await expect(
    pages[0]!.getByText("Progression synchronisée", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await pages[1]!
    .getByRole("button", { name: "Synchroniser maintenant", exact: true })
    .click();
  await expect(
    pages[1]!.getByText("Progression synchronisée", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await pages[1]!
    .getByRole("button", { name: "Révisions", exact: true })
    .click();
  await pages[1]!.getByRole("button", { name: "Favoris", exact: true }).click();
  await expect(
    pages[1]!.getByText("Douleurs thoraciques", { exact: true }),
  ).toBeVisible();
  await pages[2]!
    .getByRole("button", { name: "Révisions", exact: true })
    .click();
  await pages[2]!.getByRole("button", { name: "Favoris", exact: true }).click();
  await expect(
    pages[2]!.getByText("Aucune question enregistrée", { exact: true }),
  ).toBeVisible();
  await pages[1]!.getByRole("button", { name: /Douleurs thoraciques/ }).click();
  await pages[1]!
    .getByRole("button", { name: "Retirer des favoris", exact: true })
    .click();
  await pages[1]!.getByRole("button", { name: "Fermer", exact: true }).click();
  await pages[1]!.getByRole("button", { name: "Profil", exact: true }).click();
  await expect(
    pages[1]!.getByText("Progression synchronisée", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await pages[0]!
    .getByRole("button", { name: "Synchroniser maintenant", exact: true })
    .click();
  await expect(
    pages[0]!.getByText("Progression synchronisée", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await pages[0]!
    .getByRole("button", { name: "Révisions", exact: true })
    .click();
  await pages[0]!.getByRole("button", { name: "Favoris", exact: true }).click();
  await expect(
    pages[0]!.getByText("Aucune question enregistrée", { exact: true }),
  ).toBeVisible();
  for (const context of contexts) await context.close();
});
