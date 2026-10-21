import { test, expect, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

const file = ".local/competitive-fixtures.json";
test("competition: two real accounts, invitation, shared timer, answers, results and beta rankings", async ({
  browser,
}) => {
  test.setTimeout(150000);
  test.skip(
    test.info().project.name !== "desktop",
    "Two-context integration is exercised once.",
  );
  test.skip(
    !existsSync(file),
    "Requires dedicated temporary Supabase accounts.",
  );
  const fixture = JSON.parse(readFileSync(file, "utf8"));
  const contexts = await Promise.all([
    browser.newContext({ locale: "fr-FR" }),
    browser.newContext({ locale: "fr-FR" }),
  ]);
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  try {
    for (const [index, page] of pages.entries()) {
      await page.addInitScript(
        ({ storageKey, session }) => {
          localStorage.setItem(storageKey, JSON.stringify(session));
          localStorage.setItem("medquiz.language.v1", "fr");
        },
        {
          storageKey: fixture.storageKey,
          session: fixture.users[index].session,
        },
      );
      await page.goto(
        process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8081",
      );
      await page
        .getByRole("button", { name: "Compétition", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Pseudonyme compétitif" })
        .fill(index === 0 ? "QA Alice" : "QA Bob");
      await page
        .getByRole("button", { name: "Année 3", exact: true })
        .first()
        .click();
      await page
        .getByRole("button", {
          name: "Enregistrer mon profil compétitif",
          exact: true,
        })
        .click();
      await expect(
        page.getByText("Profil compétitif enregistré.", { exact: true }),
      ).toBeVisible();
    }
    const alice = pages[0]!;
    const bob = pages[1]!;
    const answerAll = async (page: Page) => {
      for (let ordinal = 1; ordinal <= 10; ordinal++) {
        await expect(
          page.getByText(`Question ${ordinal}/10`, { exact: true }),
        ).toBeVisible({ timeout: 12000 });
        await page.getByRole("button", { name: /^A\. / }).click();
      }
    };
    for (const mode of ["duel", "race"] as const) {
      if (mode === "race")
        await alice
          .getByRole("button", { name: "Sprint · 60 secondes", exact: true })
          .click();
      await alice
        .getByRole("button", {
          name: "Créer une invitation · 1 session",
          exact: true,
        })
        .click();
      const code = await alice.getByText(/^[A-F0-9]{12}$/).innerText();
      await bob.getByRole("textbox", { name: "Code d’invitation" }).fill(code);
      await bob
        .getByRole("button", { name: "Rejoindre · 1 session", exact: true })
        .click();
      await expect(alice.getByText(/QA Bob · année 3/)).toBeVisible({
        timeout: 12000,
      });
      if (mode === "race")
        await expect(
          bob.getByText("Revanche d’entraînement · sans points Elo", {
            exact: true,
          }),
        ).toBeVisible();
      await alice
        .getByRole("button", { name: "Lancer la partie", exact: true })
        .click();
      await Promise.all([answerAll(alice), answerAll(bob)]);
      for (const page of pages) {
        await expect(page.getByText("Égalité", { exact: true })).toBeVisible({
          timeout: 12000,
        });
        await expect(
          page.getByText("Mes corrections", { exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Retour aux invitations", exact: true })
          .click();
        await expect(
          page.getByText(/Placement · 1000 Elo · 1 parties/),
        ).toBeVisible();
      }
    }
    await expect(
      alice.getByText(/\d+\. QA Alice.*Placement.*1000 Elo/),
    ).toBeVisible();
    await alice.getByRole("button", { name: "Accueil", exact: true }).click();
    await expect(
      alice.getByRole("heading", { name: "1 jour de suite", exact: true }),
    ).toBeVisible();
    await alice.reload();
    await expect(
      alice.getByRole("heading", { name: "1 jour de suite", exact: true }),
    ).toBeVisible();
    await expect.poll(async () => alice.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key) || "{}");
      const events = state.studyEvents || [];
      return { count: events.length, unique: new Set(events.map((event: { id: string }) => event.id)).size };
    }, `medquiz.account.${fixture.users[0].userId}.v1`)).toEqual({ count: 20, unique: 20 });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
