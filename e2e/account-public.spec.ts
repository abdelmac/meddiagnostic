import { test, expect } from "@playwright/test";

test("public profile keeps free quotas visible and opens the dedicated bilingual account page", async ({ page }) => {
  await page.route("**/auth/v1/settings", (route) => route.fulfill({ json: { external: { google: false } } }));
  // No delivery action is expected; intercept it defensively so this public test cannot send mail.
  await page.route("**/auth/v1/otp**", (route) => route.fulfill({ status: 200, json: {} }));
  await page.goto("/?lang=fr");
  await page.getByRole("button", { name: "Profil", exact: true }).click();
  await expect(page.getByText("Gratuit · 3 sessions de 10 questions par jour", { exact: true })).toBeVisible();
  await expect(page.getByText("Les abonnements Premium seront disponibles après configuration de Stripe et des tarifs. Aucun paiement n’est disponible actuellement.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Se connecter", exact: true }).last().click();
  await expect(page).toHaveURL((url) => url.pathname === "/auth" && url.searchParams.get("mode") === "login");
  await expect(page.getByRole("textbox", { name: "Adresse e-mail", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuer avec Google", exact: true })).toBeVisible();

  await page.goto("/?lang=en");
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(page.getByText("Free · 3 sessions of up to 10 questions per day", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create an account", exact: true }).last().click();
  await expect(page).toHaveURL((url) => url.pathname === "/auth" && url.searchParams.get("mode") === "signup");
  await expect(page.getByRole("textbox", { name: "Email address", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google", exact: true })).toBeVisible();
});
