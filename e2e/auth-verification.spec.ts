import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
test("vérification réelle du code et suppression du compte de test", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "desktop" ||
      !existsSync(".local/account-fixtures.json"),
    "Requires temporary Supabase accounts.",
  );
  const fixture = JSON.parse(
    readFileSync(".local/account-fixtures.json", "utf8"),
  );
  const bob = fixture.users[1];
  test.skip(!bob.code, "Generate a verification fixture first.");
  // Delivery is mocked to avoid sending any email. Verification and deletion use the real server.
  await page.route("**/auth/v1/otp**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/auth?mode=login&lang=fr");
  await page
    .getByRole("textbox", { name: "Adresse e-mail", exact: true })
    .fill(bob.email);
  await page
    .getByRole("button", { name: "Recevoir mon lien", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Code de vérification", exact: true })
    .fill(bob.code);
  await page
    .getByRole("button", { name: "Vérifier et continuer", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Code de vérification", exact: true }),
  ).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByText(bob.email, { exact: true })).toBeVisible();
  await expect(page).toHaveURL((url) => url.pathname === "/" && !url.searchParams.has("screen"));
  await page
    .getByRole("textbox", {
      name: "Confirmation de suppression du compte",
      exact: true,
    })
    .fill("DELETE");
  await page
    .getByRole("button", {
      name: "Supprimer définitivement mon compte",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Essayer un quiz", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Profil", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Se connecter", exact: true }).last(),
  ).toBeVisible();
  await expect(page.getByText(bob.email, { exact: true })).toHaveCount(0);
});
