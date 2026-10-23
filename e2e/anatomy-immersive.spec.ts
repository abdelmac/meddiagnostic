import { expect, test, type CDPSession, type Locator, type Page } from "@playwright/test";
import { questions } from "../src/data/questions";
import { closeAtlasPanel, openAtlasPanel, searchAtlas } from "./anatomy-helpers";

async function touch(session: CDPSession, type: "touchStart" | "touchMove" | "touchEnd", points: { id: number; x: number; y: number }[]) {
  await session.send("Input.dispatchTouchEvent", { type, touchPoints: points.map((point) => ({ ...point, radiusX: 3, radiusY: 3, force: 1 })) });
}

function distance(camera: string | null) {
  const p = camera!.split(",").map(Number);
  return Math.hypot(p[0]! - p[3]!, p[1]! - p[4]!, p[2]! - p[5]!);
}

async function actualTouchSelection(page: Page, canvas: Locator, session: CDPSession) {
  const box = (await canvas.boundingBox())!;
  const previous = await canvas.getAttribute("data-selected-id");
  for (const [x, y] of [[0.5, 0.38], [0.5, 0.48], [0.46, 0.32], [0.54, 0.32], [0.45, 0.55], [0.55, 0.55]]) {
    const at = { x: box.x + box.width * x!, y: box.y + box.height * y! };
    await page.mouse.move(at.x, at.y);
    await page.waitForTimeout(60);
    const id = await canvas.getAttribute("data-hover-id");
    if (!id || id === previous) continue;
    await touch(session, "touchStart", [{ id: 1, ...at }]);
    await touch(session, "touchEnd", []);
    await expect(canvas).toHaveAttribute("data-selected-id", id);
    return id;
  }
  throw Error("A real touch on the body must select a visible anatomical surface.");
}

test("immersive atlas gives the body the viewport, scrolls panels separately and accepts rotation and pinch", async ({ page, context }, info) => {
  test.setTimeout(180000);
  await page.goto("/anatomy?lang=fr");
  const workspace = page.getByTestId("anatomy-study-workspace");
  const stage = page.getByTestId("anatomy-study-stage");
  const canvas = page.getByTestId("anatomy-webgl-canvas");
  await expect(page.getByTestId("anatomy-3d-scene")).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await closeAtlasPanel(page);
  const sizes = info.project.name === "desktop"
    ? [{ width: 768, height: 1024 }, { width: 1024, height: 768 }]
    : [{ width: 390, height: 844 }, { width: 844, height: 390 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expect.poll(async () => Math.abs((await workspace.boundingBox())!.height - size.height)).toBeLessThan(3);
    await expect.poll(async () => (await stage.boundingBox())!.height / size.height).toBeGreaterThan(size.height > size.width ? 0.6 : 0.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/ippomed-immersive-${size.width}x${size.height}-${info.project.name}.png` });
  }
  if (info.project.name === "mobile-web") {
    await page.setViewportSize({ width: 320, height: 568 });
    for (const name of ["Rechercher", "Couches", "Fiche", "Quiz"]) {
      const action = page.getByRole("button", { name, exact: true });
      await expect(action).toBeVisible();
      const bounds = (await action.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(321);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/ippomed-immersive-320x568-${info.project.name}.png` });
  }
  await page.setViewportSize(sizes[0]!);
  let panel = await searchAtlas(page, "");
  const before = await stage.boundingBox();
  const scrollPosition = () => panel.evaluate((node) => Math.max(0, ...[node, ...node.querySelectorAll("*")].map((item) => (item as HTMLElement).scrollTop)));
  const box = (await panel.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.7);
  await page.mouse.wheel(0, 650);
  await expect.poll(scrollPosition).toBeGreaterThan(0);
  expect((await stage.boundingBox())!.y).toBeCloseTo(before!.y, 0);
  expect(await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBe(0);
  await closeAtlasPanel(page);

  // Material changes are local presentation, with no replacement asset fetch.
  let glbRequests = 0;
  const count = (request: { url: () => string }) => { if (request.url().endsWith(".glb")) glbRequests++; };
  await expect(canvas).toHaveAttribute("data-material-model", "standard-pbr");
  await expect(canvas).toHaveAttribute("data-appearance", "natural");
  await expect.poll(async () => Number(await canvas.getAttribute("data-lod-pending")), { timeout: 60000 }).toBe(0);
  page.on("request", count);
  panel = await openAtlasPanel(page, "layers");
  await panel.getByRole("button", { name: "Repérage", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-appearance", "study");
  await panel.getByRole("button", { name: "Rendu naturel", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-appearance", "natural");
  page.off("request", count);
  expect(glbRequests).toBe(0);
  await closeAtlasPanel(page);
  await page.getByRole("button", { name: "Agrandir la scène", exact: true }).click();
  await expect.poll(async () => (await stage.boundingBox())!.height / sizes[0]!.height).toBeGreaterThan(0.75);

  const session = await context.newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
  try {
    await actualTouchSelection(page, canvas, session);
    const bounds = (await canvas.boundingBox())!;
    const centre = { x: bounds.x + bounds.width * 0.5, y: bounds.y + bounds.height * 0.5 };
    const selected = await canvas.getAttribute("data-selected-id");
    const camera = await canvas.getAttribute("data-camera");
    await touch(session, "touchStart", [{ id: 1, ...centre }]);
    for (let i = 1; i <= 6; i++) {
      await touch(session, "touchMove", [{ id: 1, x: centre.x + i * 9, y: centre.y + i * 2 }]);
      await page.waitForTimeout(20);
    }
    await touch(session, "touchEnd", []);
    await expect(canvas).not.toHaveAttribute("data-camera", camera!);
    await expect(canvas).toHaveAttribute("data-selected-id", selected!);
    await page.waitForTimeout(350);
    const beforePinch = distance(await canvas.getAttribute("data-camera"));
    await touch(session, "touchStart", [{ id: 1, x: centre.x - 35, y: centre.y }, { id: 2, x: centre.x + 35, y: centre.y }]);
    for (let i = 1; i <= 6; i++) {
      const separation = 35 + i * 6;
      await touch(session, "touchMove", [{ id: 1, x: centre.x - separation, y: centre.y }, { id: 2, x: centre.x + separation, y: centre.y }]);
      await page.waitForTimeout(20);
    }
    await touch(session, "touchEnd", []);
    await expect.poll(async () => distance(await canvas.getAttribute("data-camera"))).toBeLessThan(beforePinch * 0.8);
    await expect(canvas).toHaveAttribute("data-selected-id", selected!);
    await page.screenshot({ path: `artifacts/ippomed-immersive-touch-${info.project.name}.png` });
  } finally { await session.detach(); }
  await page.getByRole("button", { name: "Afficher les outils", exact: true }).click();
  await expect(page.getByRole("button", { name: "Couches", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Quitter l’atlas", exact: true }).click();
  await expect(page).toHaveURL(/\/(?:\?[^/]*)?$/);
  await expect(page.getByTestId("home-space-anatomy")).toBeVisible();
});

test("dedicated atlas routes preserve language, study year and muscle objective when opening courses and a quiz", async ({ page }) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  await page.goto("/anatomy?lang=fr&structure=biceps&year=12");
  const summary = page.getByTestId("anatomy-selection-summary");
  const canvas = page.getByTestId("anatomy-webgl-canvas");
  await expect(page.getByTestId("anatomy-3d-scene")).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  const originalCanvas = (await canvas.elementHandle())!;
  const expectSameAtlas = async () => {
    await expect(page).toHaveURL(/\/anatomy(?:\?|$)/);
    await expect(canvas).toHaveCount(1);
    expect(await originalCanvas.evaluate((node) => node.isConnected && node === document.querySelector('[data-testid="anatomy-webgl-canvas"]')), "Returning to the atlas must reuse its existing WebGL canvas").toBe(true);
    await expect(summary).toContainText("Biceps brachii");
  };
  await expect(summary).toContainText("Biceps brachial");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(summary).toContainText("Biceps brachii");
  for (const returning of ["Back to the body", "Explore the body in full screen"]) {
    if (returning === "Explore the body in full screen") {
      await closeAtlasPanel(page);
      await page.getByRole("button", { name: "Explore region: Legs and feet", exact: true }).click();
      await expect.poll(async () => JSON.parse(await canvas.getAttribute("data-selection-projection") ?? "null")?.inView).toBe(false);
    }
    await page.getByRole("button", { name: "Anatomy courses", exact: true }).click();
    await expect(page).toHaveURL(/\/anatomy\/courses(?:\?|$)/);
    await expect(page.getByRole("button", { name: "Residency · Year 7+", exact: true })).toHaveAttribute("aria-pressed", "true");
    const coreNotes = page.getByRole("heading", { name: "Core course notes", exact: true });
    if (!(await coreNotes.count())) await page.getByRole("button", { name: "Open course notes", exact: true }).click();
    await expect(coreNotes).toBeVisible();
    if (returning === "Explore the body in full screen") await page.getByRole("button", { name: "Biceps brachii", exact: true }).click();
    await page.getByRole("button", { name: returning, exact: true }).click();
    await expectSameAtlas();
    if (returning === "Explore the body in full screen") {
      await expect.poll(async () => {
        const projection = JSON.parse(await canvas.getAttribute("data-selection-projection") ?? "null");
        return projection?.inView && Math.abs(projection.x - 0.5) < 0.05 && Math.abs(projection.y - 0.5) < 0.05;
      }).toBe(true);
    }
  }
  // A quiz opened from course notes must return to the body, rather than
  // popping back to the course page or stacking another GPU context.
  await page.getByRole("button", { name: "Anatomy courses", exact: true }).click();
  await page.getByRole("button", { name: "Start illustrated questions", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Back to the atlas", exact: true }).click();
  await expectSameAtlas();
  await closeAtlasPanel(page);
  await page.getByRole("button", { name: "Quiz", exact: true }).click();
  await page.getByRole("button", { name: "Quiz · Insertions", exact: true }).click();
  await expect(page.getByRole("button", { name: "Insertions", exact: true })).toHaveAttribute("aria-pressed", "true");
  const start = page.getByRole("button", { name: /^(Let’s begin|C’est parti)$/ });
  await expect(start).toBeVisible();
  await start.click();
  await expect(page.getByTestId("anatomy-question-diagram")).toHaveAccessibleName("Anatomical diagram: identify the structure marked A.");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("medquiz.local.v1") ?? "null")?.active?.questionIds?.length ?? 0)).toBeGreaterThan(0);
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem("medquiz.local.v1")!).active);
  expect(session.studyYear).toBe(12);
  expect(session.questionIds.length).toBeGreaterThan(0);
  for (const id of session.questionIds) {
    const question = questions.find((q) => q.id === id)!;
    expect(question.diagram?.structureId).toBe("biceps");
    expect(question.anatomyFocus).toBe("insertion");
    expect(question.studyYears).toContain(12);
  }
  await page.getByRole("button", { name: "Leave and resume later", exact: true }).click();
  await page.getByRole("button", { name: "Back to the atlas", exact: true }).click();
  await expectSameAtlas();
});
