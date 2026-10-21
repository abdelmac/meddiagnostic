import { test, expect, type Locator, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import manifest from "../src/data/bodyparts3d-complete-manifest.json";
import { localizeAnatomyName } from "../src/data/anatomy-nomenclature";

const sourceId = "bodyparts3d-3.0-95";
const highRoute = "**/anatomy/bodyparts3d-complete/high/*.glb";

async function frames(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function openDetailedBody(page: Page) {
  await page.goto("/?lang=fr");
  await page.getByRole("button", { name: "Explorer le corps humain", exact: true }).click();
  await expect(page.getByRole("button", { name: "Corps détaillé", exact: true })).toHaveAttribute("aria-pressed", "true");
  const scene = page.getByTestId("anatomy-3d-scene");
  await expect(scene).toHaveAttribute("data-source-id", sourceId);
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await expect(page.getByRole("button", { name: /^Explorer la région : / })).toHaveCount(5);
  return { scene, canvas: page.getByTestId("anatomy-webgl-canvas") };
}

async function selectPhysicalStructure(page: Page, canvas: Locator, id: string) {
  const entry = manifest.meshes.find((mesh) => mesh.id === id)!;
  expect(entry).toBeDefined();
  await page.getByRole("textbox", { name: "Rechercher une structure anatomique", exact: true }).fill(id);
  await page.getByRole("button", { name: localizeAnatomyName(entry.name, "fr"), exact: true }).click();
  await expect(canvas).toHaveAttribute("data-selected-id", id);
  await expect(page.getByTestId("anatomy-selected-structure")).toContainText(localizeAnatomyName(entry.name, "fr"));
  return entry;
}

async function actualSurfaceClick(page: Page, canvas: Locator) {
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  for (const [x, y] of [[0.5, 0.4], [0.5, 0.5], [0.4, 0.4], [0.6, 0.4], [0.4, 0.6], [0.6, 0.6], [0.3, 0.4], [0.7, 0.4]]) {
    const position = { x: bounds!.width * x!, y: bounds!.height * y! };
    await canvas.hover({ position });
    await page.waitForTimeout(60); // The real hover raycaster is throttled.
    const id = await canvas.getAttribute("data-hover-id");
    if (!id) continue;
    const entry = manifest.meshes.find((mesh) => mesh.id === id);
    expect(entry).toBeDefined();
    await canvas.click({ position });
    await expect(canvas).toHaveAttribute("data-selected-id", id);
    await expect(page.getByTestId("anatomy-selected-structure")).toContainText(localizeAnatomyName(entry!.name, "fr"));
    return id;
  }
  throw Error("Aucun pixel du modèle détaillé ne répond à un clic anatomique.");
}

async function screenshot(page: Page, canvas: Locator, name: string, project: string) {
  await canvas.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(canvas).not.toHaveAttribute("data-resolution-pending", "true");
  await frames(page);
  await canvas.screenshot({ path: `artifacts/ippomed-complete-${name}-${project}.png` });
}

async function captureWorkspace(page: Page, project: string) {
  const viewport = page.viewportSize()!;
  const workspace = page.getByTestId("anatomy-workspace");
  const bounds = await workspace.boundingBox();
  await page.setViewportSize({ width: viewport.width, height: Math.ceil(bounds!.height + 1000) });
  await workspace.evaluate((node) => {
    for (let parent = node.parentElement; parent; parent = parent.parentElement) parent.scrollTop = 0;
  });
  await frames(page);
  await page.screenshot({ path: `artifacts/ippomed-complete-atlas-${project}.png`, fullPage: true });
  await page.setViewportSize(viewport);
  await frames(page);
}

async function canvasPixelRatio(canvas: Locator) {
  return canvas.evaluate((node) => (node as HTMLCanvasElement).width / node.clientWidth);
}

async function counters(canvas: Locator) {
  return {
    meshes: Number(await canvas.getAttribute("data-mesh-count")),
    triangles: Number(await canvas.getAttribute("data-triangles")),
    drawCalls: Number(await canvas.getAttribute("data-draw-calls")),
    highMeshes: Number(await canvas.getAttribute("data-lod-mesh-count")),
    highTriangles: Number(await canvas.getAttribute("data-lod-triangles")),
    residentTriangles: Number(await canvas.getAttribute("data-lod-resident-triangles")),
  };
}

test("the coherent body stays interactive before HIGH loads and gains detail in place across regions", async ({ page }, info) => {
  test.setTimeout(180000);
  let releaseHigh: () => void = () => {};
  const gate = new Promise<void>((resolve) => { releaseHigh = resolve; });
  let released = false, highRequests = 0;
  await page.route(highRoute, async (route) => {
    highRequests++;
    if (!released) await gate;
    try { await route.continue(); }
    catch (error) { if (!page.isClosed() && !route.request().failure()) throw error; }
  });
  try {
    const started = Date.now();
    const { scene, canvas } = await openDetailedBody(page);
    const previewLoadMs = Date.now() - started;
    await expect(canvas).toHaveAttribute("data-source-id", sourceId);
    await expect(canvas).toHaveAttribute("data-selected-lod", "base");
    await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBeGreaterThan(600);
    if (info.project.name === "mobile-web") await expect.poll(() => canvasPixelRatio(canvas)).toBeCloseTo(1, 1);
    await expect(page.getByTestId("anatomy-webgl-fallback")).toHaveCount(0);
    const initial = await counters(canvas);
    await screenshot(page, canvas, "body-preview", info.project.name);
    await captureWorkspace(page, info.project.name);
    await actualSurfaceClick(page, canvas);

    await page.getByRole("button", { name: "Muscles", exact: true }).click();
    const shoulder = await selectPhysicalStructure(page, canvas, "FMA34682");
    await page.getByRole("button", { name: "Centrer la structure", exact: true }).click();
    await page.waitForTimeout(300); // Complete the documented 240 ms camera transition.
    await frames(page);
    await expect(canvas).toHaveAttribute("data-selected-lod", "base");
    expect(highRequests).toBeGreaterThan(0);
    const camera = await canvas.getAttribute("data-camera");
    const projection = JSON.parse(await canvas.getAttribute("data-selection-projection") ?? "null");
    const bodyMeshes = Number(await canvas.getAttribute("data-mesh-count"));
    await screenshot(page, canvas, "shoulder-preview", info.project.name);
    released = true; releaseHigh();
    await expect(canvas).toHaveAttribute("data-selected-lod", "high", { timeout: 60000 });
    await expect(canvas).toHaveAttribute("data-camera", camera!);
    await expect(canvas).toHaveAttribute("data-selected-id", shoulder.id);
    await expect(scene).toHaveAttribute("data-detail-mode", "false");
    await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBe(bodyMeshes);
    const after = JSON.parse(await canvas.getAttribute("data-selection-projection") ?? "null");
    expect(Math.abs(after.x - projection.x)).toBeLessThan(0.005);
    expect(Math.abs(after.y - projection.y)).toBeLessThan(0.005);
    await screenshot(page, canvas, "shoulder-high", info.project.name);
    const highShoulder = await counters(canvas);
    expect(highShoulder.highTriangles).toBeGreaterThanOrEqual(shoulder.lod.triangles);
    expect((await canvas.getAttribute("data-lod-ids"))!.split(",")).toContain(shoulder.id);
    if (info.project.name === "mobile-web") {
      await expect(canvas).toHaveAttribute("data-resolution-mode", "inspection");
      await expect.poll(() => canvasPixelRatio(canvas)).toBeCloseTo(2, 1);
      const pixels = await canvas.evaluate((node) => (node as HTMLCanvasElement).width * (node as HTMLCanvasElement).height);
      expect(pixels).toBeLessThanOrEqual(Number(await canvas.getAttribute("data-pixel-budget")));
      const bounds = await canvas.boundingBox();
      const from = { x: bounds!.x + bounds!.width * 0.5, y: bounds!.y + bounds!.height * 0.5 };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      try {
        await expect(canvas).toHaveAttribute("data-resolution-mode", "moving");
        await expect.poll(() => canvasPixelRatio(canvas)).toBeCloseTo(1, 1);
        await page.mouse.move(from.x + 35, from.y + 15, { steps: 4 });
      } finally { await page.mouse.up(); }
      await expect(canvas).toHaveAttribute("data-resolution-mode", "inspection");
      await expect.poll(() => canvasPixelRatio(canvas)).toBeCloseTo(2, 1);
    }
    await actualSurfaceClick(page, canvas);
    await expect(scene).toHaveAttribute("data-source-id", sourceId);

    for (const region of ["Tête et cou", "Thorax", "Abdomen et bassin", "Bras et mains", "Jambes et pieds"]) {
      const previous = await canvas.getAttribute("data-camera");
      await page.getByRole("button", { name: `Explorer la région : ${region}`, exact: true }).click();
      await expect(canvas).not.toHaveAttribute("data-camera", previous!);
      await expect(scene).toHaveAttribute("data-ready", "true");
    }
    for (const target of [{ id: "FMA13377", region: "Abdomen et bassin", capture: "abdomen-high" }, { id: "FMA38930", region: "Jambes et pieds", capture: "thigh-high" }]) {
      await selectPhysicalStructure(page, canvas, target.id);
      await page.getByRole("button", { name: `Explorer la région : ${target.region}`, exact: true }).click();
      await page.getByRole("button", { name: "Centrer la structure", exact: true }).click();
      await expect(canvas).toHaveAttribute("data-selected-lod", "high", { timeout: 60000 });
      await page.waitForTimeout(300);
      expect(Number(await canvas.getAttribute("data-mesh-count"))).toBeGreaterThan(600);
      await screenshot(page, canvas, target.capture, info.project.name);
      if (target.id === "FMA13377") {
        // The authored lateral abdominal layers cover the rectus in this
        // reference. Exercise dissection to inspect the deeper muscle honestly.
        const abdominalLayers = ["FMA13336", "FMA13337", "FMA13892", "FMA13893", "FMA22344", "FMA22345"];
        for (const cover of abdominalLayers) {
          await selectPhysicalStructure(page, canvas, cover);
          await page.getByRole("button", { name: "Masquer la structure", exact: true }).click();
        }
        await selectPhysicalStructure(page, canvas, target.id);
        await page.getByRole("button", { name: "Centrer la structure", exact: true }).click();
        await expect(canvas).toHaveAttribute("data-selected-lod", "high", { timeout: 60000 });
        await page.waitForTimeout(300);
        await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBe(bodyMeshes - abdominalLayers.length);
        await screenshot(page, canvas, "abdomen-dissection-high", info.project.name);
        await page.getByRole("button", { name: "Revoir le corps entier", exact: true }).click();
      }
    }
    await expect.poll(async () => Number(await canvas.getAttribute("data-lod-pending")), { timeout: 60000 }).toBe(0);
    const lowPower = await page.evaluate(() => matchMedia("(pointer: coarse)").matches || navigator.hardwareConcurrency <= 4);
    const budget = lowPower ? 1_600_000 : 3_500_000;
    const final = await counters(canvas);
    expect(final.highTriangles).toBeLessThanOrEqual(budget);
    expect(final.residentTriangles).toBeLessThanOrEqual(budget * 1.4);
    expect(final.highMeshes).toBeLessThanOrEqual(lowPower ? 14 : 26);
    await page.getByRole("button", { name: "Revoir le corps entier", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-selected-lod", "high", { timeout: 60000 });
    await expect.poll(async () => Number(await canvas.getAttribute("data-lod-pending")), { timeout: 60000 }).toBe(0);
    if (info.project.name === "mobile-web") {
      await expect(canvas).toHaveAttribute("data-resolution-mode", "body");
      await expect.poll(() => canvasPixelRatio(canvas)).toBeCloseTo(1, 1);
    }
    await screenshot(page, canvas, "body-high", info.project.name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const metrics = {
      origin: new URL(page.url()).origin, project: info.project.name,
      timingScope: "Navigation to interactive preview; HIGH requests held", previewLoadMs,
      initial, shoulder: highShoulder, final,
    };
    console.log("Coherent body render:", JSON.stringify(metrics));
    writeFileSync(`artifacts/ippomed-complete-metrics-${info.project.name}.json`, JSON.stringify(metrics, null, 2) + "\n");
    await info.attach("coherent-body-metrics", { body: JSON.stringify(metrics, null, 2), contentType: "application/json" });
  } finally { released = true; releaseHigh(); }
});

test("failed HIGH keeps the preview usable and absent nerves keep their own source warning", async ({ page }) => {
  test.setTimeout(150000);
  let unavailable = true;
  await page.route(highRoute, (route) => unavailable
    ? route.fulfill({ status: 503, contentType: "text/plain", body: "Temporarily unavailable" })
    : route.continue());
  const { scene, canvas } = await openDetailedBody(page);
  await selectPhysicalStructure(page, canvas, "FMA34682");
  await expect.poll(async () => Number(await canvas.getAttribute("data-lod-errors")), { timeout: 60000 }).toBeGreaterThan(0);
  await expect.poll(async () => Number(await canvas.getAttribute("data-lod-pending")), { timeout: 60000 }).toBe(0);
  await expect(scene).toHaveAttribute("data-ready", "true");
  await expect(canvas).toHaveAttribute("data-selected-lod", "base");
  await expect(page.getByTestId("anatomy-webgl-fallback")).toHaveCount(0);
  await actualSurfaceClick(page, canvas);
  await selectPhysicalStructure(page, canvas, "FMA34682");
  unavailable = false;
  await page.getByTestId("anatomy-progressive-detail-status").getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-selected-lod", "high", { timeout: 60000 });
  await expect(scene).toHaveAttribute("data-ready", "true");

  await page.getByRole("textbox", { name: "Rechercher une structure anatomique", exact: true }).fill("médian");
  await page.getByRole("button", { name: "Nerf médian", exact: true }).click();
  const inspector = page.getByTestId("anatomy-selected-structure");
  await expect(inspector).toContainText("Ce repère n’est pas modélisé dans cette référence.");
  await inspector.getByRole("button", { name: "Voir dans l’atlas étendu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Atlas étendu", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(scene).not.toHaveAttribute("data-source-id", sourceId);
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await expect(inspector).toContainText("Nerf médian");
  await expect(inspector).not.toContainText("Ce repère n’est pas modélisé dans cette référence.");
  await page.getByRole("button", { name: "Corps détaillé", exact: true }).click();
  await expect(inspector).toContainText("Ce repère n’est pas modélisé dans cette référence.");
  await inspector.getByRole("button", { name: "Voir le schéma 2D", exact: true }).click();
  await expect(page.getByTestId("anatomy-body-diagram")).toHaveAccessibleName(/Nerf médian/);
});
