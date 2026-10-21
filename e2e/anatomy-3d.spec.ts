import { test, expect, type Locator, type Page } from "@playwright/test";
import { questions } from "../src/data/questions";
import manifest from "../src/data/bodyparts3d-manifest.json";
import { localizeAnatomyName } from "../src/data/anatomy-nomenclature";

async function nextRenderedFrames(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

function cameraDistance(value: string | null) {
  const coordinates = value?.split(",").map(Number) ?? [];
  expect(coordinates).toHaveLength(6);
  return Math.hypot(coordinates[0]! - coordinates[3]!, coordinates[1]! - coordinates[4]!, coordinates[2]! - coordinates[5]!);
}

async function renderCounters(canvas: Locator) {
  return {
    drawCalls: Number(await canvas.getAttribute("data-draw-calls")),
    triangles: Number(await canvas.getAttribute("data-triangles")),
    meshes: Number(await canvas.getAttribute("data-mesh-count")),
  };
}

async function captureAtlasPage(page: Page, project: string) {
  const viewport = page.viewportSize()!;
  const workspace = await page.getByTestId("anatomy-workspace").boundingBox();
  // The application scrolls inside a React Native ScrollView. A taller capture
  // viewport keeps the complete atlas, its tools and its course list together.
  await page.setViewportSize({ width: viewport.width, height: Math.ceil(workspace!.height + 700) });
  await nextRenderedFrames(page);
  await page.screenshot({ path: "artifacts/ippomed-atlas-" + project + ".png", fullPage: true });
  await page.setViewportSize(viewport);
  await nextRenderedFrames(page);
}

/** Use real pointer hit testing on the displayed model; never a structure-list click. */
async function clickAnatomicalSurface(page: Page, canvas: Locator) {
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  const previous = await canvas.getAttribute("data-selected-id");
  // The anterior torso and proximal limbs remain visible in the whole-body fit
  // on both supported viewport sizes. Hover reports the actual raycast result.
  for (const [x, y] of [[0.5, 0.38], [0.5, 0.48], [0.46, 0.32], [0.54, 0.32], [0.45, 0.55], [0.55, 0.55], [0.5, 0.25], [0.5, 0.66]]) {
    const position = { x: bounds!.width * x!, y: bounds!.height * y! };
    await canvas.hover({ position });
    // Hover raycasting is intentionally throttled to 30 Hz in the viewer.
    await page.waitForTimeout(60);
    const id = await canvas.getAttribute("data-hover-id");
    if (!id || id === previous) continue;
    const entry = manifest.meshes.find((mesh) => mesh.id === id);
    expect(entry, `le pixel survolé doit correspondre à une vraie surface du catalogue : ${id}`).toBeDefined();
    await canvas.click({ position });
    await expect(canvas).toHaveAttribute("data-selected-id", id);
    return entry!;
  }
  throw new Error("Aucune surface anatomique cliquable sur les pixels visibles du modèle.");
}

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
  await expect(page.getByTestId("anatomy-webgl-fallback").getByRole("alert")).toContainText("Le schéma 2D reste accessible.");
  await page.getByRole("button", { name: "Biceps brachial", exact: true }).first().click();
  await page.getByRole("button", { name: "Origines et insertions", exact: true }).click();
  await expect(page.getByText(/Tubérosité radiale ; l’aponévrose bicipitale/)).toBeVisible();
});

test("Ippomed: detailed meshes respond to clicks, focus, hide, rotation and a muscle quiz", async ({ page }, info) => {
  test.setTimeout(150000);
  await page.goto("/?lang=fr");
  await expect(page).toHaveTitle(/Ippomed/);
  await expect(page.getByRole("img", { name: "Logo Ippomed", exact: true })).toBeVisible();
  const a = await page.getByTestId("home-space-anatomy").boundingBox();
  const b = await page.getByTestId("home-space-specialties").boundingBox();
  expect(Math.abs(a!.width - b!.width)).toBeLessThan(2);
  expect(Math.abs(a!.height - b!.height)).toBeLessThan(2);
  if (info.project.name === "desktop") expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
  const loadStartedAt = Date.now();
  await page.getByRole("button", { name: "Explorer le corps humain", exact: true }).click();
  const scene = page.getByTestId("anatomy-3d-scene");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await expect(scene).toHaveAttribute("data-source", "BodyParts3D");
  const canvas = page.getByTestId("anatomy-webgl-canvas");
  const version = await canvas.evaluate((node) => {
    const gl = (node as HTMLCanvasElement).getContext("webgl2");
    return gl ? gl.getParameter(gl.VERSION) : "";
  });
  expect(version).toContain("WebGL 2");
  await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBeGreaterThan(200);
  await expect.poll(async () => Number(await canvas.getAttribute("data-triangles"))).toBeGreaterThan(100000);
  const initialCounters = await renderCounters(canvas);
  const localLoadMs = Date.now() - loadStartedAt;
  await captureAtlasPage(page, info.project.name);
  const selected = await clickAnatomicalSurface(page, canvas);
  const inspector = page.getByTestId("anatomy-selected-structure");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await expect(inspector).toContainText(localizeAnatomyName(selected.name, "fr"));
  await expect(inspector).toContainText(`${selected.fmaId} · ${selected.elementId}`);
  await canvas.scrollIntoViewIfNeeded();
  const front = await canvas.screenshot();
  const anteriorCamera = await canvas.getAttribute("data-camera");
  await canvas.focus();
  await canvas.press("ArrowLeft");
  await expect(canvas).not.toHaveAttribute("data-camera", anteriorCamera!);
  await nextRenderedFrames(page);
  const rotated = await canvas.screenshot({ path: "artifacts/ippomed-3d-" + info.project.name + ".png" });
  expect(front.equals(rotated)).toBe(false);

  const wholeBodyDistance = cameraDistance(await canvas.getAttribute("data-camera"));
  await page.getByRole("button", { name: "Centrer la structure", exact: true }).click();
  await expect.poll(async () => cameraDistance(await canvas.getAttribute("data-camera"))).toBeLessThan(wholeBodyDistance * 0.8);
  await expect.poll(async () => {
    const projection = JSON.parse(await canvas.getAttribute("data-selection-projection") ?? "null");
    return projection?.inView && Math.abs(projection.x - 0.5) < 0.04 && Math.abs(projection.y - 0.5) < 0.04;
  }).toBe(true);

  const visibleCount = Number(await canvas.getAttribute("data-mesh-count"));
  await page.getByRole("button", { name: "Masquer la structure", exact: true }).click();
  await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBeLessThan(visibleCount);
  await expect(inspector).toContainText("Structure masquée.");
  await page.getByRole("button", { name: "Afficher la structure", exact: true }).click();
  await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBe(visibleCount);
  await page.getByRole("button", { name: "Isoler", exact: true }).click();
  await expect(page.getByRole("button", { name: "Isoler", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBe(1);
  const isolatedCounters = await renderCounters(canvas);
  const counters = { project: info.project.name, localLoadMs, initial: initialCounters, isolated: isolatedCounters };
  console.log("Anatomy local render:", JSON.stringify(counters));
  await info.attach("local-render-counters", { body: JSON.stringify(counters, null, 2), contentType: "application/json" });
  await page.getByRole("button", { name: "Revoir le corps entier", exact: true }).click();
  await expect(page.getByRole("button", { name: "Isoler", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBe(visibleCount);

  // The existing course landmark still opens the same versioned quiz bank.
  await page.getByRole("button", { name: "Muscles", exact: true }).click();
  const shoulder = manifest.meshes.find((mesh) => mesh.name === "acromial part of right deltoid")!;
  expect(shoulder).toBeDefined();
  const search = page.getByRole("textbox", { name: "Rechercher une structure anatomique", exact: true });
  await search.fill(shoulder.id);
  await page.getByRole("button", { name: localizeAnatomyName(shoulder.name, "fr"), exact: true }).click();
  await expect(canvas).toHaveAttribute("data-selected-id", shoulder.id);
  await page.getByRole("button", { name: "Centrer la structure", exact: true }).click();
  await expect.poll(async () => {
    const projection = JSON.parse(await canvas.getAttribute("data-selection-projection") ?? "null");
    return projection?.inView && Math.abs(projection.x - 0.5) < 0.04 && Math.abs(projection.y - 0.5) < 0.04;
  }).toBe(true);
  await nextRenderedFrames(page);
  await canvas.scrollIntoViewIfNeeded();
  await canvas.screenshot({ path: "artifacts/ippomed-3d-shoulder-" + info.project.name + ".png" });
  await page.getByRole("button", { name: "Revoir le corps entier", exact: true }).click();
  await search.fill("");
  await page.getByRole("button", { name: "Biceps brachial", exact: true }).first().click();
  await page.getByRole("button", { name: "Attaches", exact: true }).click();
  await expect(inspector.getByText(/Tubérosité radiale ; l’aponévrose bicipitale/)).toBeVisible();
  await expect(inspector).toContainText("aucun point d’insertion approximatif n’est ajouté au modèle");
  await expect(page.getByText(/Bleu : origine/)).toHaveCount(0);
  await inspector.getByRole("button", { name: "Quiz sur cette structure", exact: true }).click();
  await inspector.getByRole("button", { name: "Quiz · Insertions", exact: true }).click();
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

test("anatomy recovers from an unavailable model asset without blocking the 2D course", async ({ page }) => {
  test.setTimeout(90000);
  let unavailable = true;
  let rejectedRequests = 0;
  await page.route("**/anatomy/bodyparts3d/*.glb", async (route) => {
    if (unavailable) {
      rejectedRequests++;
      await route.fulfill({ status: 503, contentType: "text/plain", body: "Temporarily unavailable" });
    } else await route.continue();
  });
  await page.goto("/?lang=fr");
  await page.getByRole("button", { name: "Explorer le corps humain", exact: true }).click();
  const fallback = page.getByTestId("anatomy-webgl-fallback");
  await expect(fallback).toBeVisible();
  await expect(fallback.getByRole("alert")).toContainText("Le modèle anatomique n’a pas pu être chargé.");
  expect(rejectedRequests).toBeGreaterThan(0);
  await expect(page.getByTestId("anatomy-3d-scene")).toHaveAttribute("data-ready", "false");
  await expect(fallback.getByTestId("anatomy-body-diagram")).toBeVisible();
  await page.getByRole("button", { name: "Biceps brachial", exact: true }).first().click();
  await expect(page.getByTestId("anatomy-selected-structure")).toContainText("Biceps brachial");
  await page.getByRole("button", { name: "Origines et insertions", exact: true }).click();
  await expect(page.getByText(/Tubérosité radiale ; l’aponévrose bicipitale/)).toBeVisible();
  unavailable = false;
  await fallback.getByRole("button", { name: "Réessayer la 3D", exact: true }).click();
  await expect(page.getByTestId("anatomy-3d-scene")).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await expect(fallback).toHaveCount(0);
  await expect.poll(async () => Number(await page.getByTestId("anatomy-webgl-canvas").getAttribute("data-mesh-count"))).toBeGreaterThan(200);
  const lost = await page.getByTestId("anatomy-webgl-canvas").evaluate((node) => {
    const context = (node as HTMLCanvasElement).getContext("webgl2");
    const extension = context?.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  expect(lost, "le navigateur de validation doit permettre une véritable perte du contexte GPU").toBe(true);
  await expect(fallback).toBeVisible();
  await expect(fallback.getByRole("alert")).toContainText("Le schéma 2D reste accessible.");
  await expect(fallback.getByTestId("anatomy-body-diagram")).toBeVisible();
  await fallback.getByRole("button", { name: "Réessayer la 3D", exact: true }).click();
  await expect(page.getByTestId("anatomy-3d-scene")).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await expect(fallback).toHaveCount(0);
  await expect.poll(async () => Number(await page.getByTestId("anatomy-webgl-canvas").getAttribute("data-mesh-count"))).toBeGreaterThan(200);
});

test("HD anatomy opens one dense source surface, supports pointer selection and restores the body", async ({ page }, info) => {
  test.setTimeout(150000);
  const details = (manifest as typeof manifest & {
    isolatedDetails?: { entries: { id: string; triangles: number; url: string }[] };
  }).isolatedDetails;
  expect(details, "le build de validation doit inclure les détails HD publiés").toBeDefined();
  const shoulder = manifest.meshes.find((mesh) => mesh.name === "acromial part of right deltoid")!;
  const detail = details!.entries.find((entry) => entry.id === shoulder.id)!;
  expect(detail).toBeDefined();
  await page.goto("/?lang=fr");
  await page.getByRole("button", { name: "Explorer le corps humain", exact: true }).click();
  const scene = page.getByTestId("anatomy-3d-scene");
  const canvas = page.getByTestId("anatomy-webgl-canvas");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  const search = page.getByRole("textbox", { name: "Rechercher une structure anatomique", exact: true });
  await search.fill(shoulder.id);
  await page.getByRole("button", { name: localizeAnatomyName(shoulder.name, "fr"), exact: true }).click();
  await expect(canvas).toHaveAttribute("data-selected-id", shoulder.id);
  await nextRenderedFrames(page);
  const bodyCamera = await canvas.getAttribute("data-camera");
  const bodyCounters = await renderCounters(canvas);
  await expect(page.getByRole("button", { name: "Détail HD", exact: true })).toBeEnabled();

  // A failed detail must remain recoverable without loading another body layer.
  let unavailable = true;
  let rejectedDetails = 0;
  await page.route("**/anatomy/bodyparts3d/details/*.glb", async (route) => {
    if (unavailable) {
      rejectedDetails++;
      await route.fulfill({ status: 503, contentType: "text/plain", body: "Temporarily unavailable" });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Détail HD", exact: true }).click();
  const fallback = page.getByTestId("anatomy-webgl-fallback");
  await expect(fallback).toBeVisible();
  expect(rejectedDetails).toBeGreaterThan(0);
  await expect(scene).toHaveAttribute("data-detail-ready", "false");
  unavailable = false;
  await fallback.getByRole("button", { name: "Réessayer la 3D", exact: true }).click();
  await expect(scene).toHaveAttribute("data-detail-mode", "true");
  await expect(scene).toHaveAttribute("data-detail-ready", "true", { timeout: 60000 });
  await expect(fallback).toHaveCount(0);
  await expect(canvas).toHaveAttribute("data-selected-id", shoulder.id);
  await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBe(1);
  await expect.poll(async () => Number(await canvas.getAttribute("data-triangles"))).toBeGreaterThan(shoulder.triangles * 2);
  expect(Number(await canvas.getAttribute("data-triangles"))).toBeGreaterThanOrEqual(detail.triangles);
  await expect(page.getByText(/Vue de détail isolée : référence BodyParts3D 3.0/)).toBeVisible();

  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  let hit = false;
  for (const [x, y] of [[0.5, 0.5], [0.4, 0.5], [0.6, 0.5], [0.5, 0.35], [0.5, 0.65], [0.4, 0.4], [0.6, 0.6]]) {
    const position = { x: bounds!.width * x!, y: bounds!.height * y! };
    await canvas.hover({ position });
    await page.waitForTimeout(60);
    if (await canvas.getAttribute("data-hover-id") !== shoulder.id) continue;
    await canvas.click({ position });
    hit = true;
    break;
  }
  expect(hit, "le modèle HD doit répondre à un véritable clic sur sa surface").toBe(true);
  await expect(canvas).toHaveAttribute("data-selected-id", shoulder.id);
  await expect(page.getByTestId("anatomy-selected-structure")).toContainText(localizeAnatomyName(shoulder.name, "fr"));
  await page.mouse.move(0, 0);
  await nextRenderedFrames(page);
  await canvas.screenshot({ path: "artifacts/ippomed-3d-shoulder-hd-" + info.project.name + ".png" });
  await info.attach("isolated-HD-render-counters", {
    body: JSON.stringify({ body: bodyCounters, detail: await renderCounters(canvas) }, null, 2), contentType: "application/json",
  });

  await page.getByRole("button", { name: "Revenir au corps", exact: true }).click();
  await expect(scene).toHaveAttribute("data-detail-mode", "false");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await expect(canvas).toHaveAttribute("data-camera", bodyCamera!);
  await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBe(bodyCounters.meshes);
  await expect(canvas).toHaveAttribute("data-selected-id", shoulder.id);
  await search.fill("");
  await page.getByRole("button", { name: "Droit de l’abdomen", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Détail HD", exact: true })).toBeDisabled();
});
