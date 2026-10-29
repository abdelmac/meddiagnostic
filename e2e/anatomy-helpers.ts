import { expect, type Locator, type Page } from "@playwright/test";

/** pending=0 can precede a debounced LOD refresh. Image/pointer comparisons
 * require a quiet reference, not just one idle sample between two downloads. */
export async function waitForAtlasSteady(canvas: Locator, quietMs = 800) {
  let previous = "", stableSince = 0;
  await expect.poll(async () => {
    const state = await canvas.evaluate(node => {
      const data = (node as HTMLCanvasElement).dataset;
      return { pending: data.lodPending, resolving: data.resolutionPending, camera: data.camera, ids: data.lodIds, pixels: data.bufferPixels, selected: data.selectedId, section: data.section, source: data.sourceId };
    });
    if (state.pending !== "0" || state.resolving === "true" || !state.camera) { previous = ""; stableSince = 0; return false; }
    const key = JSON.stringify(state);
    if (key !== previous) { previous = key; stableSince = Date.now(); return false; }
    return Date.now() - stableSince >= quietMs;
  }, { timeout: 60000, intervals: [100, 200, 250], message: "Wait for the anatomical reference, camera and drawing buffer to settle" }).toBe(true);
}

/** All atlas work is routed through the same public controls as touch users. */
export async function closeAtlasPanel(page: Page) {
  const close = page.getByRole("button", { name: /^(Fermer le panneau|Close panel)$/ });
  if (await close.count()) await close.click();
}

export async function openAtlasPanel(page: Page, panel: "search" | "layers" | "notes") {
  const target = panel === "search"
    ? page.getByRole("textbox", { name: /^(Rechercher une structure anatomique|Search for an anatomical structure)$/ })
    : panel === "notes" ? page.getByTestId("anatomy-selected-structure")
      : page.getByRole("button", { name: /^(Corps détaillé|Detailed body)$/, exact: true });
  if (!(await target.count())) {
    const names = { search: /^(Rechercher|Search)$/, layers: /^(Couches|Layers)$/, notes: /^(Fiche|Notes)$/ };
    await page.getByRole("button", { name: names[panel] }).click();
  }
  await expect(page.getByTestId("anatomy-study-panel")).toBeVisible();
  return page.getByTestId("anatomy-study-panel");
}

export async function chooseAtlasSource(page: Page, source: "detailed" | "extended" | "comprehensive" | "regional") {
  const panel = await openAtlasPanel(page, "layers");
  const names = { detailed: /^(Corps détaillé|Detailed body)$/, extended: /^(Corps complet|Whole body)$/, comprehensive: /^(Atlas neurovasculaire|Neurovascular atlas)$/, regional: /^(Anatomie régionale|Regional anatomy)$/ };
  await panel.getByRole("button", { name: names[source] }).click();
  await closeAtlasPanel(page);
}

export async function chooseAtlasSystem(page: Page, name: string) {
  const panel = await openAtlasPanel(page, "layers");
  await panel.getByRole("button", { name, exact: true }).click();
  await closeAtlasPanel(page);
}

export async function chooseAtlasMode(page: Page, mode: "2d" | "3d") {
  const panel = await openAtlasPanel(page, "layers");
  await panel.getByRole("button", { name: mode === "2d" ? /^(Vue 2D|2D view)$/ : /^(Vue 3D|3D view)$/ }).click();
  await closeAtlasPanel(page);
}

export async function searchAtlas(page: Page, query: string) {
  const panel = await openAtlasPanel(page, "search");
  const search = panel.getByRole("textbox");
  await search.fill(query);
  return panel;
}

export async function selectAtlasStructure(page: Page, name: string, query = name) {
  const panel = await searchAtlas(page, query);
  await panel.getByRole("button", { name, exact: true }).click();
  await closeAtlasPanel(page);
}

export async function openImmersiveAtlas(page: Page) {
  await page.getByRole("button", { name: /^(Explorer le corps humain|Explore the human body)$/, exact: true }).click();
  await expect(page).toHaveURL(/\/anatomy(?:\?|$)/);
  await expect(page.getByTestId("anatomy-study-workspace")).toBeVisible();
  await closeAtlasPanel(page);
}
