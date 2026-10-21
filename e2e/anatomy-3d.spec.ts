import { test, expect } from "@playwright/test";
import { questions } from "../src/data/questions";

test("anatomy keeps an interactive diagram when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/?lang=fr");
  await page.getByRole("button", { name: "Explorer le corps humain", exact: true }).click();
  await expect(page.getByTestId("anatomy-webgl-fallback")).toBeVisible();
  await expect(page.getByText("La 3D est indisponible dans ce navigateur. Le schéma 2D reste interactif.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Biceps brachial", exact: true }).first().click();
  await page.getByRole("button", { name: "Origines et insertions", exact: true }).click();
  await expect(page.getByText(/Tubérosité radiale ; l’aponévrose bicipitale/)).toBeVisible();
});

test("Ippomed: equal home entries, real WebGL rotation and a muscle insertion quiz", async ({ page }, info) => {
  test.setTimeout(90000);
  await page.goto("/?lang=fr");
  await expect(page).toHaveTitle(/Ippomed/);
  await expect(page.getByRole("img", { name: "Logo Ippomed", exact: true })).toBeVisible();
  const a = await page.getByTestId("home-space-anatomy").boundingBox();
  const b = await page.getByTestId("home-space-specialties").boundingBox();
  expect(Math.abs(a!.width - b!.width)).toBeLessThan(2);
  expect(Math.abs(a!.height - b!.height)).toBeLessThan(2);
  if (info.project.name === "desktop") expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
  await page.getByRole("button", { name: "Explorer le corps humain", exact: true }).click();
  const scene = page.getByTestId("anatomy-3d-scene");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  const canvas = page.getByTestId("anatomy-webgl-canvas");
  const version = await canvas.evaluate((node) => {
    const gl = (node as HTMLCanvasElement).getContext("webgl2");
    return gl ? gl.getParameter(gl.VERSION) : "";
  });
  expect(version).toContain("WebGL 2");
  await canvas.scrollIntoViewIfNeeded();
  const front = await canvas.screenshot();
  await canvas.focus();
  await canvas.press("ArrowLeft");
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const rotated = await canvas.screenshot({ path: "artifacts/ippomed-3d-" + info.project.name + ".png" });
  expect(front.equals(rotated)).toBe(false);
  await page.getByRole("button", { name: "Biceps brachial", exact: true }).first().click();
  await page.getByRole("button", { name: "Origines et insertions", exact: true }).click();
  await expect(page.getByText(/Tubérosité radiale ; l’aponévrose bicipitale/)).toBeVisible();
  await page.getByRole("button", { name: "Attaches", exact: true }).click();
  await expect(page.getByText(/Bleu : origine/)).toBeVisible();
  await page.getByRole("button", { name: "Isoler", exact: true }).click();
  await expect(page.getByRole("button", { name: "Isoler", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Quiz sur cette structure", exact: true }).click();
  await page.getByRole("button", { name: "Quiz · Insertions", exact: true }).click();
  await expect(page.getByRole("button", { name: "Insertions", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "C’est parti", exact: true }).click();
  await expect(page.getByTestId("anatomy-question-diagram")).toBeVisible();
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem("medquiz.local.v1")!).active);
  expect(session.questionIds.length).toBeGreaterThan(0);
  for (const id of session.questionIds) {
    const q = questions.find((item) => item.id === id)!;
    expect(q.anatomyFocus).toBe("insertion");
    expect(q.diagram?.structureId).toBe("biceps");
  }
});
