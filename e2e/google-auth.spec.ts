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
  await page.goto("/auth?mode=login&lang=fr");
  const appOrigin = new URL(page.url()).origin;
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
  await expect(page).toHaveURL((url) => url.pathname === "/auth");
  await expect(
    page.getByText("Connexion Google annulée. Vous pouvez réessayer ou utiliser votre e-mail.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("DO_NOT_DISPLAY_SECRET", { exact: true }),
  ).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("error_description")).toBe(false);
  await expect(
    page.getByRole("button", { name: "Continuer avec Google", exact: true }),
  ).toBeDisabled();
});

test("réessayer Google après un refus conserve la destination compétition", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("medquiz.auth.destination", "competition"));
  await page.route("**/auth/v1/settings", (route) => route.fulfill({ json: { external: { google: true } } }));
  let authorize: URL | undefined;
  await page.route("**/auth/v1/authorize?**", async (route) => {
    authorize = new URL(route.request().url());
    await route.fulfill({ contentType: "text/html", body: "<p>OAuth retry test boundary</p>" });
  });
  await page.goto("/?lang=fr&error=access_denied&error_description=DO_NOT_DISPLAY_SECRET");
  await expect(page).toHaveURL((url) => url.pathname === "/auth" && url.searchParams.get("next") === "competition");
  await expect(page.getByText("Connexion Google annulée. Vous pouvez réessayer ou utiliser votre e-mail.", { exact: true })).toBeVisible();
  const appOrigin = new URL(page.url()).origin;
  const retry = page.getByRole("button", { name: "Continuer avec Google", exact: true });
  await expect(retry).toBeEnabled();
  await retry.click();
  await expect.poll(() => authorize?.searchParams.get("provider")).toBe("google");
  expect(authorize!.searchParams.get("redirect_to")).toBe(appOrigin);
  const state = await page.context().storageState();
  const origin = state.origins.find((entry) => entry.origin === appOrigin);
  expect(origin?.localStorage.find((entry) => entry.name === "medquiz.auth.destination")?.value).toBe("competition");
});
