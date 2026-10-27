import { expect, test, type BrowserContext, type CDPSession, type Locator, type Page, type TestInfo } from "@playwright/test";
import { writeFileSync } from "node:fs";
import manifest from "../src/data/bodyparts3d-complete-manifest.json";
import extendedManifest from "../src/data/bodyparts3d-manifest.json";
import { localizeAnatomyName } from "../src/data/anatomy-nomenclature";
import { chooseAtlasMode, chooseAtlasSource, closeAtlasPanel, openAtlasPanel, selectAtlasStructure, waitForAtlasSteady } from "./anatomy-helpers";

type SectionPlane = { normal: number[]; constant: number; coordinate: number };
type Camera = { raw: string; position: number[]; target: number[]; direction: number[]; radius: number };
const muscleIds = new Set(manifest.meshes.filter((mesh) => mesh.system === "muscles").map((mesh) => mesh.id));
const axes = [
  { id: "axial", name: "Axial", dimension: 1 },
  { id: "sagittal", name: "Sagittal", dimension: 0 },
  { id: "coronal", name: "Coronal", dimension: 2 },
] as const;

async function frames(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function openBody(page: Page) {
  await page.goto("/anatomy?lang=fr");
  await chooseAtlasSource(page, "detailed");
  const scene = page.getByTestId("anatomy-3d-scene");
  const canvas = page.getByTestId("anatomy-webgl-canvas");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await expect(canvas).toHaveAttribute("data-source-id", "bodyparts3d-3.0-95");
  await closeAtlasPanel(page);
  await frames(page);
  return { scene, canvas };
}

async function touchSession(context: BrowserContext, page: Page, project: string) {
  if (project !== "mobile-web") return undefined;
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
  return session;
}

async function touch(session: CDPSession, type: "touchStart" | "touchMove" | "touchEnd", points: { x: number; y: number; id: number }[]) {
  await session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: points.map((point) => ({ ...point, radiusX: 3, radiusY: 3, force: 1 })),
  });
}

async function camera(canvas: Locator): Promise<Camera> {
  const raw = await canvas.getAttribute("data-camera");
  expect(raw).not.toBeNull();
  const coordinates = raw!.split(",").map(Number);
  expect(coordinates).toHaveLength(6);
  expect(coordinates.every(Number.isFinite)).toBe(true);
  const position = coordinates.slice(0, 3), target = coordinates.slice(3);
  const delta = position.map((value, index) => value - target[index]!);
  const radius = Math.hypot(...delta);
  expect(radius).toBeGreaterThan(0);
  return { raw: raw!, position, target, radius, direction: delta.map((value) => value / radius) };
}

function sameViewingAngle(before: Camera, after: Camera) {
  const cosine = before.direction.reduce((sum, value, index) => sum + value * after.direction[index]!, 0);
  expect(cosine, "Zoom controls must retain the direction established by a real orbit").toBeGreaterThan(0.99999);
  for (let index = 0; index < 3; index++) expect(Math.abs(before.target[index]! - after.target[index]!)).toBeLessThan(0.00002);
}

async function readPlane(canvas: Locator): Promise<SectionPlane> {
  const plane = JSON.parse(await canvas.getAttribute("data-section-plane") ?? "null") as SectionPlane | null;
  expect(plane).not.toBeNull();
  expect(plane!.normal).toHaveLength(3);
  expect([...plane!.normal, plane!.constant, plane!.coordinate].every(Number.isFinite)).toBe(true);
  return plane!;
}

async function enableSection(page: Page, canvas: Locator) {
  const panel = await openAtlasPanel(page, "layers");
  const action = panel.getByRole("button", { name: "Coupe anatomique", exact: true });
  await expect(action).toBeEnabled();
  if (await action.getAttribute("aria-pressed") !== "true") await action.click();
  await expect(page.getByTestId("anatomy-section-controls")).toBeVisible();
  await expect(canvas).not.toHaveAttribute("data-section-axis", "off");
  return panel;
}

/** Hover locates a real visible pixel; selection itself is a mouse click or CDP touch. */
async function pickVisibleSurface(page: Page, canvas: Locator, session?: CDPSession, excluded: readonly string[] = [], musclesOnly = false) {
  const box = (await canvas.boundingBox())!;
  expect(box).not.toBeNull();
  for (const y of [0.3, 0.42, 0.54, 0.66, 0.2, 0.76]) {
    // On wide viewports the legs occupy only a few percent either side of
    // centre; sampling only 0.5 and 0.42/0.58 misses their retained surfaces.
    for (const x of [0.49, 0.51, 0.475, 0.525, 0.46, 0.54, 0.5, 0.42, 0.58, 0.34, 0.66]) {
      const point = { x: Math.round(box.x + box.width * x), y: Math.round(box.y + box.height * y) };
      await page.mouse.move(point.x, point.y);
      await page.waitForTimeout(60); // The real hover raycaster is throttled at 42 ms.
      const id = await canvas.getAttribute("data-hover-id");
      if (!id || excluded.includes(id) || (musclesOnly && !muscleIds.has(id))) continue;
      if (session) {
        await touch(session, "touchStart", [{ id: 1, ...point }]);
        await touch(session, "touchEnd", []);
      } else await page.mouse.click(point.x, point.y);
      await expect(canvas).toHaveAttribute("data-last-pick-id", id);
      await expect(canvas).toHaveAttribute("data-selected-id", id);
      const worldPoint = JSON.parse(await canvas.getAttribute("data-last-pick-point") ?? "null") as number[] | null;
      expect(worldPoint).toHaveLength(3);
      expect(worldPoint!.every(Number.isFinite)).toBe(true);
      return { id, worldPoint: worldPoint! };
    }
  }
  throw new Error("A retained, visible anatomical surface must respond to a real pointer event.");
}

async function orbitBody(page: Page, canvas: Locator, session?: CDPSession) {
  const box = (await canvas.boundingBox())!;
  const from = { x: box.x + box.width * 0.48, y: box.y + box.height * 0.5 };
  const before = await canvas.getAttribute("data-camera");
  if (session) {
    await touch(session, "touchStart", [{ id: 1, ...from }]);
    try {
      for (let step = 1; step <= 6; step++) {
        await touch(session, "touchMove", [{ id: 1, x: from.x + step * 8, y: from.y + step * 2 }]);
        await page.waitForTimeout(20);
      }
    } finally { await touch(session, "touchEnd", []); }
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    try { await page.mouse.move(from.x + 48, from.y + 12, { steps: 6 }); }
    finally { await page.mouse.up(); }
  }
  await expect(canvas).not.toHaveAttribute("data-camera", before!);
  await frames(page);
}

async function metrics(info: TestInfo, name: string, value: unknown) {
  const body = JSON.stringify(value, null, 2);
  writeFileSync(`artifacts/ippomed-section-${name}-${info.project.name}.json`, body + "\n");
  await info.attach(`anatomy-section-${name}`, { body, contentType: "application/json" });
}

test("section axes, reversal and accessible position controls pick only retained source surfaces", async ({ page, context }, info) => {
  test.setTimeout(180000);
  const { canvas } = await openBody(page);
  const session = await touchSession(context, page, info.project.name);
  const picks: unknown[] = [];
  try {
    let panel = await enableSection(page, canvas);
    await panel.getByRole("button", { name: "Milieu du corps", exact: true }).click();
    const slider = panel.getByRole("slider", { name: "Position du plan de coupe", exact: true });
    await expect(slider).toHaveAttribute("aria-valuemin", "0");
    await expect(slider).toHaveAttribute("aria-valuemax", "100");
    await expect(slider).toHaveAttribute("aria-valuenow", "50");
    await slider.focus();
    await slider.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "50.5");
    await expect.poll(async () => Number(await canvas.getAttribute("data-section-position"))).toBeCloseTo(0.505, 4);
    await slider.press("Home");
    await expect(slider).toHaveAttribute("aria-valuenow", "0");
    await slider.press("End");
    await expect(slider).toHaveAttribute("aria-valuenow", "100");
    if (session) {
      await slider.scrollIntoViewIfNeeded();
      const track = (await slider.boundingBox())!;
      const y = track.y + track.height / 2;
      await touch(session, "touchStart", [{ id: 1, x: track.x + track.width * 0.25, y }]);
      try {
        for (let step = 1; step <= 6; step++) {
          await touch(session, "touchMove", [{ id: 1, x: track.x + track.width * (0.25 + step * 0.075), y }]);
          await page.waitForTimeout(20);
        }
      } finally { await touch(session, "touchEnd", []); }
      await expect.poll(async () => Number(await slider.getAttribute("aria-valuenow"))).toBeGreaterThan(65);
      expect(Number(await slider.getAttribute("aria-valuenow"))).toBeLessThan(75);
      expect(Number(await canvas.getAttribute("data-section-position"))).toBeCloseTo(Number(await slider.getAttribute("aria-valuenow")) / 100, 3);
    }
    await closeAtlasPanel(page);
    let previousPick: string | undefined;
    for (const axis of axes) {
      panel = await openAtlasPanel(page, "layers");
      await panel.getByRole("button", { name: axis.name, exact: true }).click();
      await panel.getByRole("button", { name: "Milieu du corps", exact: true }).click();
      if (await canvas.getAttribute("data-section-inverted") === "true") await panel.getByRole("button", { name: "Inverser le côté", exact: true }).click();
      await expect(canvas).toHaveAttribute("data-section-axis", axis.id);
      await expect(canvas).toHaveAttribute("data-section-position", "0.5");
      const positive = await readPlane(canvas);
      expect(positive.normal).toEqual([0, 1, 2].map((dimension) => dimension === axis.dimension ? 1 : 0));
      await panel.getByRole("button", { name: "Inverser le côté", exact: true }).click();
      await expect(canvas).toHaveAttribute("data-section-inverted", "true");
      const retained = await readPlane(canvas);
      expect(retained.normal).toEqual(positive.normal.map((component) => component === 0 ? 0 : -component));
      expect(retained.constant).toBeCloseTo(-positive.constant, 10);
      expect(retained.coordinate).toBeCloseTo(positive.coordinate, 10);
      await closeAtlasPanel(page);
      await waitForAtlasSteady(canvas);
      const picked = await pickVisibleSurface(page, canvas, session, previousPick ? [previousPick] : []);
      const distance = retained.normal.reduce((sum, component, dimension) => sum + component * picked.worldPoint[dimension]!, retained.constant);
      expect(distance, "A real click/touch must ignore the clipped half-space, including front surfaces discarded by a coronal section").toBeGreaterThanOrEqual(-0.0000011);
      previousPick = picked.id;
      picks.push({ axis: axis.id, plane: retained, picked, signedDistance: distance });
      await waitForAtlasSteady(canvas);
      await frames(page);
      await page.screenshot({ path: `artifacts/ippomed-section-${axis.id}-${info.project.name}.png` });
    }
    panel = await openAtlasPanel(page, "layers");
    await panel.getByRole("button", { name: "Coupe anatomique", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-section-axis", "off");
    await expect(page.getByTestId("anatomy-section-controls")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await metrics(info, "planes", { project: info.project.name, actualTouchSlider: !!session, picks });
  } finally { await session?.detach(); }
});

test("real orbit keeps its angle through zoom and two surface removals can be undone and restored in place", async ({ page, context }, info) => {
  test.setTimeout(150000);
  const { canvas } = await openBody(page);
  const session = await touchSession(context, page, info.project.name);
  try {
    await orbitBody(page, canvas, session);
    const orbited = await camera(canvas);
    await page.getByRole("button", { name: "Zoomer sur la structure", exact: true }).click();
    await expect.poll(async () => (await camera(canvas)).radius).toBeLessThan(orbited.radius * 0.8);
    const closer = await camera(canvas);
    sameViewingAngle(orbited, closer);
    await page.getByRole("button", { name: "Dézoomer le corps", exact: true }).click();
    await expect.poll(async () => (await camera(canvas)).radius).toBeGreaterThan(closer.radius * 1.2);
    const returned = await camera(canvas);
    sameViewingAngle(orbited, returned);
    expect(Math.abs(returned.radius - orbited.radius)).toBeLessThan(0.001);

    const first = await pickVisibleSurface(page, canvas, session, [], true);
    const baseline = Number(await canvas.getAttribute("data-mesh-count"));
    const stableCamera = await canvas.getAttribute("data-camera");
    await page.getByRole("button", { name: "Masquer la structure", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-hidden-ids", JSON.stringify([first.id]));
    const second = await pickVisibleSurface(page, canvas, session, [first.id], true);
    await page.getByRole("button", { name: "Masquer la structure", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-hidden-ids", JSON.stringify([first.id, second.id]));
    await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBe(baseline - 2);
    await expect(canvas).toHaveAttribute("data-camera", stableCamera!);

    const panel = await openAtlasPanel(page, "layers");
    await expect(panel).toContainText("2 structures retirées");
    await expect(canvas).toHaveAttribute("data-camera", stableCamera!);
    await page.screenshot({ path: `artifacts/ippomed-section-dissection-${info.project.name}.png` });
    await panel.getByRole("button", { name: "Annuler le dernier retrait", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-hidden-ids", JSON.stringify([first.id]));
    await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBe(baseline - 1);
    await expect(canvas).toHaveAttribute("data-camera", stableCamera!);
    await panel.getByRole("button", { name: "Tout réafficher", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-hidden-ids", "[]");
    await expect(canvas).toHaveAttribute("data-hidden-count", "0");
    await expect.poll(async () => Number(await canvas.getAttribute("data-mesh-count"))).toBe(baseline);
    await expect(panel.getByRole("button", { name: "Annuler le dernier retrait", exact: true })).toBeDisabled();
    await expect(panel.getByRole("button", { name: "Tout réafficher", exact: true })).toBeDisabled();
    await expect(canvas).toHaveAttribute("data-camera", stableCamera!);
    await closeAtlasPanel(page);
    await expect(canvas).toHaveAttribute("data-camera", stableCamera!);
    await waitForAtlasSteady(canvas);
    await page.screenshot({ path: `artifacts/ippomed-section-restored-${info.project.name}.png` });
    await metrics(info, "dissection", { project: info.project.name, baselineMeshes: baseline, removedIds: [first.id, second.id], orbited, closer, restoredCamera: await camera(canvas) });
  } finally { await session?.detach(); }
});

test("a section is cleared when entering 2D, changing reference or inspecting the isolated HD source", async ({ page }, info) => {
  test.setTimeout(180000);
  const { scene, canvas } = await openBody(page);
  await enableSection(page, canvas);
  await chooseAtlasMode(page, "2d");
  await expect(page.getByTestId("anatomy-body-diagram")).toBeVisible();
  await expect(canvas).toHaveCount(0);
  await chooseAtlasMode(page, "3d");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await expect(canvas).toHaveAttribute("data-section-axis", "off");
  await enableSection(page, canvas);
  await chooseAtlasSource(page, "extended");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await expect(canvas).not.toHaveAttribute("data-source-id", "bodyparts3d-3.0-95");
  await expect(canvas).toHaveAttribute("data-section-axis", "off");

  const shoulder = extendedManifest.meshes.find((mesh) => mesh.id === "FMA34682_FJ1467")!;
  await selectAtlasStructure(page, localizeAnatomyName(shoulder.name, "fr"), shoulder.id);
  await enableSection(page, canvas);
  await closeAtlasPanel(page);
  await expect(page.getByRole("button", { name: "Détail HD", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Détail HD", exact: true }).click();
  await expect(scene).toHaveAttribute("data-detail-ready", "true", { timeout: 60000 });
  await expect(scene).toHaveAttribute("data-detail-mode", "true");
  await expect(canvas).toHaveAttribute("data-section-axis", "off");
  await expect(canvas).toHaveAttribute("data-selected-id", shoulder.id);
  await page.screenshot({ path: `artifacts/ippomed-section-isolated-hd-${info.project.name}.png` });
  const panel = await openAtlasPanel(page, "layers");
  await expect(panel.getByRole("button", { name: "Coupe anatomique", exact: true })).toBeDisabled();
  await expect(page.getByTestId("anatomy-section-controls")).toHaveCount(0);
  await closeAtlasPanel(page);
  await page.getByRole("button", { name: "Revenir au corps", exact: true }).click();
  await expect(scene).toHaveAttribute("data-detail-mode", "false");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await expect(canvas).toHaveAttribute("data-section-axis", "off");
  const returned = await openAtlasPanel(page, "layers");
  await expect(returned.getByRole("button", { name: "Coupe anatomique", exact: true })).toBeEnabled();
  await expect(returned.getByRole("button", { name: "Coupe anatomique", exact: true })).toHaveAttribute("aria-pressed", "false");
});
