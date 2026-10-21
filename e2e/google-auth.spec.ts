import { expect, test } from "@playwright/test";

test("Google activé prépare un échange PKCE avec retour sur l’origine de l’app", async ({
  page,
}) => {
  await page.route("**/auth/v1/settings", (route) =>
    route.fulfill({ json: { external: { google: true } } }),
  );
  let authorize: URL | undefined;
  await page.route("**/auth/v1/authorize?**", async (route) => {
    authorize = new URL(route.request().url());
    await route.fulfill({
      contentType: "text/html",
      body: "<p>OAuth provider test boundary</p>",
    });
  });
  await page.goto("/?lang=fr");
  const appOrigin = new URL(page.url()).origin;
  await page.getByRole("button", { name: "Profil", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continuer avec Google", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Continuer avec Google", exact: true })
    .click();
  await expect
    .poll(() => authorize?.searchParams.get("provider"))
    .toBe("google");
  expect(authorize!.searchParams.get("redirect_to")).toBe(appOrigin);
  expect(authorize!.searchParams.get("code_challenge_method")).toBe("s256");
  expect(authorize!.searchParams.get("code_challenge")).toMatch(
    /^[A-Za-z0-9_-]{43}$/,
  );
  expect(authorize!.searchParams.has("code_verifier")).toBe(false);
});

test("un refus OAuth affiche un message sûr puis retire les paramètres sensibles", async ({
  page,
}) => {
  await page.route("**/auth/v1/settings", (route) =>
    route.fulfill({ json: { external: { google: false } } }),
  );
  await page.goto(
    "/?lang=fr&error=access_denied&error_description=DO_NOT_DISPLAY_SECRET",
  );
  await page.getByRole("button", { name: "Profil", exact: true }).click();
  await expect(
    page.getByText("Connexion Google annulée.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("DO_NOT_DISPLAY_SECRET", { exact: true }),
  ).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("error_description")).toBe(false);
  await expect(
    page.getByRole("button", { name: "Continuer avec Google", exact: true }),
  ).toBeDisabled();
});
