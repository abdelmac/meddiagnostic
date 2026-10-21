import { test, expect, type Page } from "@playwright/test";

const email = "learner@example.invalid";
type OtpRequest = { email: string; create_user: boolean; [key: string]: unknown };

async function mockGoogle(page: Page) {
  await page.route("**/auth/v1/settings", (route) => route.fulfill({ json: { external: { google: false } } }));
}

async function mockDelivery(page: Page) {
  const requests: OtpRequest[] = [];
  await page.route("**/auth/v1/otp**", (route) => {
    requests.push(route.request().postDataJSON() as OtpRequest);
    return route.fulfill({ status: 200, json: {} });
  });
  return requests;
}

async function requestLink(page: Page, address = email) {
  await page.getByRole("textbox", { name: "Adresse e-mail", exact: true }).fill(address);
  await page.getByRole("button", { name: "Recevoir mon lien", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Consultez votre boîte mail", exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockGoogle(page);
});

test("default login accepts submission and announces invalid email without sending a request", async ({ page }, info) => {
  const requests = await mockDelivery(page);
  await page.goto("/auth?lang=fr");
  const submit = page.getByRole("button", { name: "Recevoir mon lien", exact: true });
  await expect(submit).toBeEnabled();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.screenshot({ path: `artifacts/auth-${info.project.name}.png`, fullPage: true });
  await submit.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("textbox", { name: "Adresse e-mail", exact: true }).fill("adresse-invalide");
  await submit.click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(requests).toHaveLength(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const mode of ["login", "signup"] as const) {
  test(`${mode} sends the correct account-creation policy and keeps provider secrets out of the UI`, async ({ page }, info) => {
    const requests = await mockDelivery(page);
    await page.goto(`/auth?mode=${mode}&lang=fr`);
    await requestLink(page);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.email).toBe(email);
    expect(requests[0]!.create_user).toBe(mode === "signup");
    expect(requests[0]).not.toHaveProperty("password");
    expect(requests[0]).not.toHaveProperty("client_secret");
    expect(requests[0]).not.toHaveProperty("code_verifier");
    await expect(page.getByRole("textbox", { name: "Code de vérification", exact: true })).toBeVisible();
    if (mode === "login" && info.project.name === "desktop") await page.screenshot({ path: "artifacts/auth-verification-desktop.png", fullPage: true });
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("resending is blocked for sixty seconds and starts a new cooldown after delivery", async ({ page }) => {
  await page.clock.install();
  const requests = await mockDelivery(page);
  await page.goto("/auth?mode=login&lang=fr");
  await requestLink(page);
  const resend = page.getByRole("button", { name: /^Renvoyer le lien/ });
  await expect(resend).toBeDisabled();
  await expect(page.getByText(/\b(?:60|59)\s*s\b/)).toBeVisible();
  await page.clock.fastForward(30_000);
  await expect(resend).toBeDisabled();
  expect(requests).toHaveLength(1);
  await page.clock.fastForward(31_000);
  await expect(resend).toBeEnabled();
  await resend.click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(resend).toBeDisabled();
});

test("editing the email discards the old verification code", async ({ page }) => {
  const requests = await mockDelivery(page);
  await page.goto("/auth?mode=login&lang=fr");
  await requestLink(page);
  const code = page.getByRole("textbox", { name: "Code de vérification", exact: true });
  await code.fill("83495127");
  await page.getByRole("button", { name: "Modifier l’adresse e-mail", exact: true }).click();
  await expect(code).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Adresse e-mail", exact: true })).toHaveValue(email);
  await requestLink(page, "another-learner@example.invalid");
  await expect(code).toHaveValue("");
  expect(requests.map((request) => request.email)).toEqual([email, "another-learner@example.invalid"]);
});

test("reloading restores the pending address and cooldown but never the entered code", async ({ page }) => {
  const requests = await mockDelivery(page);
  await page.goto("/auth?mode=login&lang=fr");
  await requestLink(page);
  await page.getByRole("textbox", { name: "Code de vérification", exact: true }).fill("83495127");
  const saved = await page.evaluate(() => localStorage.getItem("medquiz.auth.pending-request.v1"));
  expect(saved).not.toContain("83495127");
  const pending = JSON.parse(saved!);
  expect(pending.email).toBe(email);
  expect(pending).not.toHaveProperty("code");
  expect(pending).not.toHaveProperty("token");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Consultez votre boîte mail", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Code de vérification", exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: /^Renvoyer le lien/ })).toBeDisabled();
  expect(requests).toHaveLength(1);
});

test("the mode switch updates the destination and the policy sent to Supabase", async ({ page }) => {
  const requests = await mockDelivery(page);
  await page.goto("/auth?lang=fr");
  await expect(page.getByRole("heading", { name: "Heureux de vous retrouver.", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Créer un compte", exact: true }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("mode") === "signup");
  await expect(page.getByRole("heading", { name: "Créez votre compte.", exact: true })).toBeVisible();
  await requestLink(page);
  await page.getByRole("button", { name: "Modifier l’adresse e-mail", exact: true }).click();
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("mode") === "login");
  await requestLink(page);
  expect(requests.map((request) => request.create_user)).toEqual([true, false]);
});

test("an expired code stays on the verification step and never exposes backend diagnostics", async ({ page }) => {
  await mockDelivery(page);
  let verification: Record<string, unknown> | undefined;
  await page.route("**/auth/v1/verify**", (route) => {
    verification = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({ status: 403, json: { code: "otp_expired", message: "DO_NOT_DISPLAY_INTERNAL_SECRET: token has expired" } });
  });
  await page.goto("/auth?mode=login&lang=fr");
  await requestLink(page);
  await page.getByRole("textbox", { name: "Code de vérification", exact: true }).fill("83495127");
  await page.getByRole("button", { name: "Vérifier et continuer", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Consultez votre boîte mail", exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("DO_NOT_DISPLAY_INTERNAL_SECRET");
  expect(verification?.email).toBe(email);
  expect(verification?.type).toBe("email");
  await expect(page.getByRole("textbox", { name: "Code de vérification", exact: true })).toBeVisible();
});

test("a rate-limited delivery announces a safe error without claiming an email was sent", async ({ page }) => {
  await page.route("**/auth/v1/otp**", (route) => route.fulfill({
    status: 429,
    headers: { "retry-after": "60" },
    json: { code: "over_email_send_rate_limit", message: "DO_NOT_DISPLAY_INTERNAL_SECRET: provider diagnostics" },
  }));
  await page.goto("/auth?mode=signup&lang=fr");
  await page.getByRole("textbox", { name: "Adresse e-mail", exact: true }).fill(email);
  await page.getByRole("button", { name: "Recevoir mon lien", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Consultez votre boîte mail", exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Adresse e-mail", exact: true })).toHaveValue(email);
  await expect(page.locator("body")).not.toContainText("DO_NOT_DISPLAY_INTERNAL_SECRET");
});

test("English account creation and inbox remain usable on narrow screens", async ({ page }) => {
  const requests = await mockDelivery(page);
  await page.goto("/auth?mode=signup&lang=en");
  await expect(page.getByRole("button", { name: "Continue with Google", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Email address", exact: true }).fill(email);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Send my sign-in link", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Verification code", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Verify and continue", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Resend sign-in link/ })).toBeDisabled();
  expect(requests[0]!.create_user).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Change email address", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Verification code", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Continue without an account", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
});
