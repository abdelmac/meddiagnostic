import {
  expect,
  test,
  type BrowserContext,
  type CDPSession,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { writeFileSync } from "node:fs";
import sourceData from "../src/data/bodyparts3d-manifest.json";
import { atlasCatalog, atlasSources, defaultAtlasSource, type AtlasSource } from "../src/data/anatomy-catalog";
import {
  anatomyNameHasFrench,
  localizeAnatomyName,
} from "../src/data/anatomy-nomenclature";
import {
  closeAtlasPanel,
  chooseAtlasSource,
  chooseAtlasSystem,
  openAtlasPanel,
  selectAtlasStructure,
  waitForAtlasSteady,
} from "./anatomy-helpers";

type SourceMesh = {
  id: string;
  fmaId?: string;
  elementId: string;
  name: string;
  system: string;
  sourceVersion: string;
  source?: { originalName?: string };
  vascularKind?: "artery" | "vein" | "other";
  representationGroup?: string;
  representationDefault?: boolean;
  lod?: { triangles: number; bytes: number };
};
type SourceManifest = {
  datasetId: string;
  meshes: SourceMesh[];
};
const bodyPartsManifest = sourceData as unknown as SourceManifest;
const manifest = atlasCatalog(defaultAtlasSource).manifest as unknown as SourceManifest;
const arterialIds = manifest.meshes
  .filter((mesh) => mesh.system === "vessels" && mesh.vascularKind === "artery")
  .map((mesh) => mesh.id);
const venousIds = manifest.meshes
  .filter((mesh) => mesh.system === "vessels" && mesh.vascularKind === "vein")
  .map((mesh) => mesh.id);
const sourceById = new Map(manifest.meshes.map((mesh) => [mesh.id, mesh]));
const bodyPartsById = new Map(bodyPartsManifest.meshes.map((mesh) => [mesh.id, mesh]));
const neuralIds = manifest.meshes.filter(mesh => mesh.system === "nerves").map(mesh => mesh.id);

async function openBody(page: Page, source: AtlasSource = defaultAtlasSource) {
  await page.goto("/anatomy?lang=fr");
  if (source !== defaultAtlasSource) await chooseAtlasSource(page, source);
  const scene = page.getByTestId("anatomy-3d-scene");
  const canvas = page.getByTestId("anatomy-webgl-canvas");
  await expect(scene).toHaveAttribute("data-source-id", atlasCatalog(source).manifest.datasetId!);
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await closeAtlasPanel(page);
  await waitForAtlasSteady(canvas);
  return { scene, canvas };
}

async function counter(canvas: Locator, kind: "arteries" | "veins") {
  return Number(await canvas.getAttribute(`data-visible-${kind}`));
}

async function quickView(page: Page, canvas: Locator, name: string) {
  const action = page
    .getByTestId("anatomy-quick-views")
    .getByRole("button", { name, exact: true });
  await expect(action).toBeEnabled();
  await action.click();
  await expect(action).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("anatomy-3d-scene")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 60000 },
  );
  await expect(canvas).toHaveAttribute("data-source-id", manifest.datasetId);
  await waitForAtlasSteady(canvas);
}

async function physicalSelection(
  page: Page,
  canvas: Locator,
  mesh: SourceMesh,
) {
  expect(mesh).toBeDefined();
  await selectAtlasStructure(
    page,
    localizeAnatomyName(mesh.name, "fr"),
    mesh.id,
  );
  await expect(canvas).toHaveAttribute("data-selected-id", mesh.id);
  await expect(page.getByTestId("anatomy-selection-summary")).toContainText(
    localizeAnatomyName(mesh.name, "fr"),
  );
}

async function touchSession(
  context: BrowserContext,
  page: Page,
  project: string,
) {
  if (project !== "mobile-web") return undefined;
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 2,
  });
  return session;
}

/** The click/touch must hit the actual source mesh, not a UI selection shortcut. */
async function pickSourceSurface(
  page: Page,
  canvas: Locator,
  allowedId: string,
  session?: CDPSession,
) {
  const box = (await canvas.boundingBox())!;
  expect(box).not.toBeNull();
  for (const y of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
    for (const x of [
      0.5, 0.49, 0.51, 0.47, 0.53, 0.44, 0.56, 0.4, 0.6, 0.35, 0.65,
    ]) {
      const point = {
        x: Math.round(box.x + box.width * x),
        y: Math.round(box.y + box.height * y),
      };
      await page.mouse.move(point.x, point.y);
      await page.waitForTimeout(60); // The public hover raycaster is throttled.
      const hovered = await canvas.getAttribute("data-hover-id");
      if (hovered !== allowedId) continue;
      if (session) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ id: 1, ...point, radiusX: 3, radiusY: 3, force: 1 }],
        });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      } else await page.mouse.click(point.x, point.y);
      await expect(canvas).toHaveAttribute("data-last-pick-id", allowedId);
      await expect(canvas).toHaveAttribute("data-selected-id", allowedId);
      const worldPoint = JSON.parse(
        (await canvas.getAttribute("data-last-pick-point")) ?? "null",
      ) as number[];
      expect(worldPoint).toHaveLength(3);
      expect(worldPoint.every(Number.isFinite)).toBe(true);
      return { id: allowedId, worldPoint, actualTouch: !!session };
    }
  }
  throw new Error(
    `The real visible source mesh ${allowedId} must respond to a pointer.`,
  );
}

async function record(page: Page, info: TestInfo, name: string, data: unknown) {
  const value = {
    origin: new URL(page.url()).origin,
    project: info.project.name,
    datasetId: await page.getByTestId("anatomy-webgl-canvas").getAttribute("data-source-id"),
    data,
  };
  writeFileSync(
    `artifacts/ippomed-networks-${name}-${info.project.name}.json`,
    JSON.stringify(value, null, 2),
  );
}

test("whole body defaults to one coherent source and network shortcuts preserve section, camera and dissection", async ({
  page,
}, info) => {
  test.setTimeout(210000);
  expect(manifest.meshes.length).toBeGreaterThan(3000);
  expect(manifest.meshes.every((mesh) => defaultAtlasSource === "comprehensive"
    ? mesh.id.startsWith("ZA_") && !!mesh.source?.originalName
    : mesh.sourceVersion === "4.3")).toBe(
    true,
  );
  expect(arterialIds.length).toBeGreaterThan(defaultAtlasSource === "comprehensive" ? 400 : 800);
  expect(venousIds.length).toBeGreaterThan(defaultAtlasSource === "comprehensive" ? 200 : 500);
  const { canvas } = await openBody(page);
  let panel = await openAtlasPanel(page, "layers");
  await expect(
    panel.getByRole("button", { name: atlasSources[defaultAtlasSource].name.fr, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await closeAtlasPanel(page);
  await page
    .getByRole("button", { name: "Masquer la structure", exact: true })
    .click();
  const hidden = await canvas.getAttribute("data-hidden-ids");
  expect(JSON.parse(hidden!)).not.toHaveLength(0);
  const hiddenIds = new Set(JSON.parse(hidden!) as string[]);
  const visibleNerves = neuralIds.filter(id => !hiddenIds.has(id)).length;
  panel = await openAtlasPanel(page, "layers");
  await panel
    .getByRole("button", { name: "Coupe anatomique", exact: true })
    .click();
  await panel
    .getByRole("button", { name: "Milieu du corps", exact: true })
    .click();
  await closeAtlasPanel(page);
  await waitForAtlasSteady(canvas);
  const camera = await canvas.getAttribute("data-camera");
  const section = await canvas.getAttribute("data-section");
  expect(section).not.toBe("off");
  const views: unknown[] = [];
  for (const name of ["Nerfs", "Artères", "Veines", "Os"]) {
    await quickView(page, canvas, name);
    await expect(canvas).toHaveAttribute("data-camera", camera!);
    await expect(canvas).toHaveAttribute("data-hidden-ids", hidden!);
    await expect(canvas).toHaveAttribute("data-section", section!);
    expect(
      Number(await canvas.getAttribute("data-mesh-count")),
    ).toBeGreaterThan(0);
    const arteries = await counter(canvas, "arteries"),
      veins = await counter(canvas, "veins");
    expect(arteries).toBe(name === "Artères" ? arterialIds.length : 0);
    expect(veins).toBe(name === "Veines" ? venousIds.length : 0);
    await expect(canvas).toHaveAttribute(
      "data-visible-nerves",
      name === "Nerfs" ? String(visibleNerves) : "0",
    );
    if (name === "Nerfs") {
      await expect(canvas).toHaveAttribute("data-visible-skeleton", "0");
      panel = await openAtlasPanel(page, "layers");
      await panel
        .getByRole("button", { name: "Superposer Squelette", exact: true })
        .click();
      await closeAtlasPanel(page);
      await waitForAtlasSteady(canvas);
      expect(
        Number(await canvas.getAttribute("data-visible-skeleton")),
      ).toBeGreaterThan(0);
      await expect(canvas).toHaveAttribute("data-visible-nerves", String(visibleNerves));
      await expect(canvas).toHaveAttribute("data-camera", camera!);
      await expect(canvas).toHaveAttribute("data-section", section!);
      await expect(canvas).toHaveAttribute("data-hidden-ids", hidden!);
      await quickView(page, canvas, "Nerfs");
      await expect(canvas).toHaveAttribute("data-visible-skeleton", "0");
      await expect(canvas).toHaveAttribute("data-camera", camera!);
      await expect(canvas).toHaveAttribute("data-section", section!);
      await expect(canvas).toHaveAttribute("data-hidden-ids", hidden!);
    }
    views.push({
      name,
      arteries,
      veins,
      camera,
      section,
      hiddenIds: JSON.parse(hidden!),
    });
    await page.screenshot({
      path: `artifacts/ippomed-networks-${({ Nerfs: "nerves", Artères: "arteries", Veines: "veins", Os: "bones" } as Record<string, string>)[name]}-${info.project.name}.png`,
    });
  }
  panel = await openAtlasPanel(page, "layers");
  await expect(panel).toContainText(
    `Modèles d’artères : ${arterialIds.length}`,
  );
  await expect(panel).toContainText(`Modèles de veines : ${venousIds.length}`);
  await expect(panel).toContainText("cartilages et les articulations");
  await panel
    .getByRole("button", { name: "Annuler le dernier retrait", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-hidden-ids", "[]");
  await expect(canvas).toHaveAttribute("data-camera", camera!);
  await expect(canvas).toHaveAttribute("data-section", section!);
  await record(page, info, "presets", views);
  await panel
    .getByRole("button", { name: "Coupe anatomique", exact: true })
    .click();
  await closeAtlasPanel(page);
  await page
    .getByRole("button", { name: "Revoir le corps entier", exact: true })
    .click();
  await waitForAtlasSteady(canvas);
  for (const [name, slug] of [
    ["Nerfs", "nerves"],
    ["Artères", "arteries"],
    ["Veines", "veins"],
    ["Os", "bones"],
  ] as const) {
    await quickView(page, canvas, name);
    await expect(canvas).toHaveAttribute("data-section-axis", "off");
    await expect(canvas).toHaveAttribute("data-hidden-ids", "[]");
    await page.screenshot({
      path: `artifacts/ippomed-networks-whole-${slug}-${info.project.name}.png`,
    });
  }
  if (info.project.name === "mobile-web") {
    const original = page.viewportSize()!;
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.getByTestId("anatomy-quick-views")).toHaveCount(0);
    panel = await openAtlasPanel(page, "layers");
    const compactQuick = panel.getByTestId("anatomy-quick-views");
    for (const name of ["Nerfs", "Artères", "Veines", "Os"]) {
      const action = compactQuick.getByRole("button", { name, exact: true });
      await expect(action).toBeVisible();
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await compactQuick
      .getByRole("button", { name: "Nerfs", exact: true })
      .click();
    await closeAtlasPanel(page);
    await waitForAtlasSteady(canvas);
    await expect(canvas).toHaveAttribute("data-visible-nerves", String(neuralIds.length));
    await expect(canvas).toHaveAttribute("data-visible-skeleton", "0");
    expect(
      (await page.getByTestId("anatomy-study-stage").boundingBox())!.height /
        390,
    ).toBeGreaterThan(0.5);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize(original);
  }
});

test("global search reveals a vein during an arterial subset and real picks cannot hit filtered vessels", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  const { canvas } = await openBody(page);
  await quickView(page, canvas, "Artères");
  expect(await counter(canvas, "arteries")).toBe(arterialIds.length);
  expect(await counter(canvas, "veins")).toBe(0);
  const excludedArterial = JSON.parse(
    (await canvas.getAttribute("data-excluded-ids")) ?? "null",
  ) as string[];
  expect(excludedArterial.sort()).toEqual(
    manifest.meshes
      .filter(
        (mesh) => mesh.system === "vessels" && mesh.vascularKind !== "artery",
      )
      .map((mesh) => mesh.id)
      .sort(),
  );
  const vein = manifest.meshes.find(
    (mesh) =>
      mesh.vascularKind === "vein" && /^inferior vena cava(?: \((?:abdominal|thoracic) part\))?$/i.test(mesh.name),
  )!;
  await physicalSelection(page, canvas, vein);
  await waitForAtlasSteady(canvas);
  expect(await counter(canvas, "arteries")).toBe(0);
  expect(await counter(canvas, "veins")).toBe(venousIds.length);
  const excludedVenous = JSON.parse(
    (await canvas.getAttribute("data-excluded-ids")) ?? "null",
  ) as string[];
  expect(excludedVenous).not.toContain(vein.id);
  expect(arterialIds.every((id) => excludedVenous.includes(id))).toBe(true);
  await page.getByRole("button", { name: "Isoler", exact: true }).click();
  await page
    .getByRole("button", { name: "Centrer la structure", exact: true })
    .click();
  await waitForAtlasSteady(canvas);
  expect(await counter(canvas, "arteries")).toBe(0);
  expect(await counter(canvas, "veins")).toBe(1);
  const session = await touchSession(context, page, info.project.name);
  let picked: unknown;
  try {
    picked = await pickSourceSurface(page, canvas, vein.id, session);
    expect(sourceById.get(vein.id)?.vascularKind).toBe("vein");
  } finally {
    await session?.detach();
  }
  await page.getByRole("button", { name: "Isoler", exact: true }).click();
  const panel = await openAtlasPanel(page, "layers");
  await expect(
    panel.getByRole("button", { name: "Veines uniquement", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await panel
    .getByRole("button", { name: "Tous les vaisseaux", exact: true })
    .click();
  await closeAtlasPanel(page);
  await waitForAtlasSteady(canvas);
  await expect(canvas).toHaveAttribute("data-excluded-ids", "[]");
  expect(await counter(canvas, "arteries")).toBe(arterialIds.length);
  expect(await counter(canvas, "veins")).toBe(venousIds.length);
  await record(page, info, "vascular-picking", {
    picked,
    excludedArterial: excludedArterial.length,
    excludedVenous: excludedVenous.length,
  });
});

test("true spinal cord and high-detail bone shapes retain their physical identity and language in the same body", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  const { canvas } = await openBody(page, "extended");
  const cord = bodyPartsManifest.meshes.find(
    (mesh) => mesh.elementId === "FJ4426" && mesh.fmaId === "FMA242005",
  )!;
  expect(cord).toBeDefined();
  expect(cord.system).toBe("nerves");
  expect(cord.name.toLowerCase()).not.toContain("central canal");
  await physicalSelection(page, canvas, cord);
  await page.getByRole("button", { name: "Isoler", exact: true }).click();
  await page
    .getByRole("button", { name: "Centrer la structure", exact: true })
    .click();
  await waitForAtlasSteady(canvas);
  await expect(canvas).toHaveAttribute("data-selected-lod", "high");
  await expect(canvas).toHaveAttribute("data-source-id", bodyPartsManifest.datasetId);
  await page.screenshot({
    path: `artifacts/ippomed-networks-spinal-cord-${info.project.name}.png`,
  });
  const cordCamera = await canvas.getAttribute("data-camera");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.getByTestId("anatomy-selection-summary")).toContainText(
    cord.name,
  );
  await expect(canvas).toHaveAttribute("data-selected-id", cord.id);
  await expect(canvas).toHaveAttribute("data-camera", cordCamera!);
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await expect(page.getByTestId("anatomy-selection-summary")).toContainText(
    "Tissu nerveux de la moelle spinale",
  );
  await expect(canvas).toHaveAttribute("data-selected-id", cord.id);
  await expect(canvas).toHaveAttribute("data-camera", cordCamera!);
  await chooseAtlasSystem(page, "Squelette");
  const bone = bodyPartsManifest.meshes.find(
    (mesh) => mesh.system === "skeleton" && /^left humerus$/i.test(mesh.name),
  )!;
  expect(bone).toBeDefined();
  expect(bone.lod?.triangles).toBeGreaterThan(0);
  expect(anatomyNameHasFrench(bone.name)).toBe(true);
  await physicalSelection(page, canvas, bone);
  await page.getByRole("button", { name: "Isoler", exact: true }).click();
  await page
    .getByRole("button", { name: "Centrer la structure", exact: true })
    .click();
  await waitForAtlasSteady(canvas);
  await expect(canvas).toHaveAttribute("data-selected-lod", "high");
  await expect(canvas).toHaveAttribute("data-source-id", bodyPartsManifest.datasetId);
  expect(
    Number(await canvas.getAttribute("data-lod-triangles")),
  ).toBeGreaterThanOrEqual(bone.lod!.triangles);
  const session = await touchSession(context, page, info.project.name);
  let picked: unknown;
  try {
    picked = await pickSourceSurface(page, canvas, bone.id, session);
  } finally {
    await session?.detach();
  }
  const camera = await canvas.getAttribute("data-camera");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.getByTestId("anatomy-selection-summary")).toContainText(
    bone.name,
  );
  await expect(canvas).toHaveAttribute("data-selected-id", bone.id);
  await expect(canvas).toHaveAttribute("data-camera", camera!);
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await expect(page.getByTestId("anatomy-selection-summary")).toContainText(
    localizeAnatomyName(bone.name, "fr"),
  );
  await waitForAtlasSteady(canvas);
  await page.screenshot({
    path: `artifacts/ippomed-networks-bone-detail-${info.project.name}.png`,
  });
  await record(page, info, "source-shapes", {
    cord: { id: cord.id, fmaId: cord.fmaId, name: cord.name },
    bone: { id: bone.id, name: bone.name, highTriangles: bone.lod!.triangles },
    picked,
  });
});

test("bone source variants display one surface at a time and dissection never substitutes the other variant", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  const { canvas } = await openBody(page, "extended");
  await chooseAtlasSystem(page, "Squelette");
  const femora = bodyPartsManifest.meshes.filter((mesh) =>
    ["FJ3259", "FJ6370"].includes(mesh.elementId),
  );
  expect(femora).toHaveLength(2);
  const preferred = femora.find((mesh) => mesh.representationDefault === true)!;
  const alternate = femora.find(
    (mesh) => mesh.representationDefault === false,
  )!;
  expect(preferred).toBeDefined();
  expect(alternate).toBeDefined();
  expect(preferred.representationGroup).toBeTruthy();
  expect(alternate.representationGroup).toBe(preferred.representationGroup);
  const group = preferred.representationGroup!;
  const groups = new Set(
    bodyPartsManifest.meshes.map((mesh) => mesh.representationGroup).filter(Boolean),
  );
  expect(groups.size).toBe(84);
  const visibleRepresentations = async () => {
    const value = JSON.parse(
      (await canvas.getAttribute("data-visible-representations")) ?? "null",
    ) as Record<string, string[]>;
    expect(value).not.toBeNull();
    for (const [key, ids] of Object.entries(value)) {
      expect(groups.has(key)).toBe(true);
      expect(
        ids.length,
        "Alternative source surfaces must never be superimposed",
      ).toBeLessThanOrEqual(1);
      for (const id of ids)
        expect(bodyPartsById.get(id)?.representationGroup).toBe(key);
    }
    return value;
  };
  const choices = async () =>
    JSON.parse(
      (await canvas.getAttribute("data-representation-choices")) ?? "null",
    ) as Record<string, string>;
  const initial = await visibleRepresentations();
  expect(initial[group]).toEqual([preferred.id]);
  expect(Object.keys(initial).length).toBe(groups.size);
  await physicalSelection(page, canvas, alternate);
  await page.getByRole("button", { name: "Isoler", exact: true }).click();
  await page
    .getByRole("button", { name: "Centrer la structure", exact: true })
    .click();
  await waitForAtlasSteady(canvas);
  expect((await visibleRepresentations())[group]).toEqual([alternate.id]);
  expect((await choices())[group]).toBe(alternate.id);
  await expect(canvas).toHaveAttribute("data-selected-lod", "high");
  const session = await touchSession(context, page, info.project.name);
  let alternatePick: unknown, preferredPick: unknown;
  try {
    alternatePick = await pickSourceSurface(
      page,
      canvas,
      alternate.id,
      session,
    );
    await page.getByRole("button", { name: "Isoler", exact: true }).click();
    await waitForAtlasSteady(canvas);
    const camera = await canvas.getAttribute("data-camera");
    await page
      .getByRole("button", { name: "Masquer la structure", exact: true })
      .click();
    await expect(canvas).toHaveAttribute(
      "data-hidden-ids",
      JSON.stringify([alternate.id]),
    );
    expect((await visibleRepresentations())[group] ?? []).toEqual([]);
    expect((await choices())[group]).toBe(alternate.id);
    expect(
      JSON.parse(
        (await canvas.getAttribute("data-representation-ids")) ?? "null",
      ),
    ).toContain(alternate.id);
    await expect(canvas).toHaveAttribute("data-camera", camera!);
    const unrelated = bodyPartsManifest.meshes.find(
      (mesh) =>
        mesh.system === "skeleton" &&
        /^left humerus$/i.test(mesh.name) &&
        mesh.representationGroup !== group,
    )!;
    await physicalSelection(page, canvas, unrelated);
    await waitForAtlasSteady(canvas);
    await expect(canvas).toHaveAttribute(
      "data-hidden-ids",
      JSON.stringify([alternate.id]),
    );
    expect((await visibleRepresentations())[group] ?? []).toEqual([]);
    expect((await choices())[group]).toBe(alternate.id);
    expect(
      JSON.parse(
        (await canvas.getAttribute("data-representation-ids")) ?? "null",
      ),
    ).toContain(alternate.id);
    await expect(canvas).toHaveAttribute("data-camera", camera!);
    await page.getByTestId("anatomy-undo-removal").click();
    await waitForAtlasSteady(canvas);
    await expect(canvas).toHaveAttribute("data-hidden-ids", "[]");
    expect((await visibleRepresentations())[group]).toEqual([alternate.id]);
    expect((await choices())[group]).toBe(alternate.id);
    await expect(canvas).toHaveAttribute("data-selected-id", unrelated.id);
    await expect(canvas).toHaveAttribute("data-camera", camera!);
    await physicalSelection(page, canvas, preferred);
    await page.getByRole("button", { name: "Isoler", exact: true }).click();
    await page
      .getByRole("button", { name: "Centrer la structure", exact: true })
      .click();
    await waitForAtlasSteady(canvas);
    expect((await visibleRepresentations())[group]).toEqual([preferred.id]);
    expect((await choices())[group]).toBe(preferred.id);
    const preferences = JSON.parse(
      (await canvas.getAttribute("data-representation-ids")) ?? "null",
    ) as string[];
    expect(preferences).toContain(preferred.id);
    expect(preferences).not.toContain(alternate.id);
    preferredPick = await pickSourceSurface(
      page,
      canvas,
      preferred.id,
      session,
    );
  } finally {
    await session?.detach();
  }
  const panel = await openAtlasPanel(page, "notes");
  await expect(panel).toContainText("Variante du modèle source");
  await closeAtlasPanel(page);
  await waitForAtlasSteady(canvas);
  await page.screenshot({
    path: `artifacts/ippomed-networks-bone-variant-${info.project.name}.png`,
  });
  const savedPreferences = await canvas.getAttribute("data-representation-ids");
  await page
    .getByRole("button", { name: "Revoir le corps entier", exact: true })
    .click();
  await waitForAtlasSteady(canvas);
  await expect(canvas).toHaveAttribute(
    "data-representation-ids",
    savedPreferences!,
  );
  expect((await visibleRepresentations())[group]).toEqual([preferred.id]);
  await record(page, info, "bone-variants", {
    group,
    preferred: preferred.id,
    alternate: alternate.id,
    alternatePick,
    preferredPick,
    visible: await visibleRepresentations(),
    choices: await choices(),
  });
});
