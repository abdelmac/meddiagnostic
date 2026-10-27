import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import sourceData from '../src/data/z-anatomy-manifest.json';
import { localizeAnatomyName } from '../src/data/anatomy-nomenclature';
import { chooseAtlasSource, closeAtlasPanel, openAtlasPanel, selectAtlasStructure, waitForAtlasSteady } from './anatomy-helpers';

type Mesh = { id: string; name: string; source: { originalName: string }; system: string; vascularKind?: string };
const manifest = sourceData as unknown as { datasetId: string; meshes: Mesh[]; publicationStatus: string };
test.skip(manifest.publicationStatus !== 'approved' && process.env.PLAYWRIGHT_PRIVATE_ANATOMY !== '1', 'Private source approval preview only');
const artifacts = '.local/z-anatomy-review';
mkdirSync(artifacts, { recursive: true });

async function openPreview(page: Page) {
  await page.goto('/anatomy?lang=fr');
  const scene = page.getByTestId('anatomy-3d-scene');
  await expect(scene).toHaveAttribute('data-source-id', manifest.datasetId);
  await expect(scene).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  await closeAtlasPanel(page);
  const canvas = page.getByTestId('anatomy-webgl-canvas');
  await waitForAtlasSteady(canvas);
  return canvas;
}

async function pickRealMesh(page: Page, canvas: Locator, id: string, touch: boolean) {
  const box = (await canvas.boundingBox())!;
  // Thin nerves can fall between a coarse screen grid. Locate their visible
  // yellow pixels, then confirm the public hover raycaster and real pointer hit.
  const png = await canvas.screenshot();
  const candidates = await page.evaluate(async base64 => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(Error('Screenshot decode')); image.src = `data:image/png;base64,${base64}`; });
    const bitmap = document.createElement('canvas'); bitmap.width = image.width; bitmap.height = image.height;
    const context = bitmap.getContext('2d')!; context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    const visible = (x: number, y: number) => { const offset = (y * image.width + x) * 4; const r = pixels[offset]!, g = pixels[offset + 1]!, b = pixels[offset + 2]!; return Math.max(r, g) > 95 && Math.max(r, g) > b * 1.15; };
    const points: { x: number; y: number; width: number }[] = [];
    for (let y = Math.ceil(image.height * 0.08); y < image.height * 0.92; y += Math.max(1, Math.floor(image.height / 90))) {
      let start = -1;
      for (let x = Math.ceil(image.width * 0.08); x < image.width * 0.92; x++) {
        if (visible(x, y)) { if (start === -1) start = x; }
        else if (start !== -1) { points.push({ x: (x + start - 1) / 2 / image.width, y: y / image.height, width: x - start }); start = -1; }
      }
    }
    return points.sort((a, b) => b.width - a.width).slice(0, 120);
  }, png.toString('base64'));
  for (const candidate of candidates) {
      const point = { x: box.x + box.width * candidate.x, y: box.y + box.height * candidate.y };
      await page.mouse.move(point.x, point.y);
      await page.waitForTimeout(60);
      if (await canvas.getAttribute('data-hover-id') !== id) continue;
      if (touch) await page.touchscreen.tap(point.x, point.y);
      else await page.mouse.click(point.x, point.y);
      await expect(canvas).toHaveAttribute('data-last-pick-id', id);
      await expect(canvas).toHaveAttribute('data-selected-id', id);
      const worldPoint = JSON.parse((await canvas.getAttribute('data-last-pick-point'))!);
      expect(worldPoint.every(Number.isFinite)).toBe(true);
      return { id, worldPoint, touch };
  }
  await canvas.screenshot({ path: `${artifacts}/failed-pick-${id}-${touch ? 'touch' : 'mouse'}.png` });
  throw Error(`No real surface pick for ${id}`);
}

test('bilateral sciatic, femoral and tibial nerves retain source identity and respond to real surface picks', async ({ page }, info) => {
  test.setTimeout(360000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const canvas = await openPreview(page);
  const picks = [];
  for (const name of ['Sciatic nerve', 'Femoral nerve', 'Tibial nerve']) {
    for (const side of ['l', 'r']) {
      const mesh = manifest.meshes.find(entry => entry.source.originalName === `${name}.${side}`);
      expect(mesh, `${name}.${side} needs its own actual source object`).toBeDefined();
      await selectAtlasStructure(page, localizeAnatomyName(mesh!.name, 'fr'), mesh!.id);
      await page.getByRole('button', { name: 'Isoler', exact: true }).click();
      await page.getByRole('button', { name: 'Centrer la structure', exact: true }).click();
      await waitForAtlasSteady(canvas);
      await expect(canvas).toHaveAttribute('data-selected-lod', 'high');
      picks.push({ name: mesh!.source.originalName, ...await pickRealMesh(page, canvas, mesh!.id, info.project.name === 'mobile-web') });
      if (name === 'Sciatic nerve' && side === 'l') await page.screenshot({ path: `${artifacts}/sciatic-${info.project.name}.png` });
      await page.getByRole('button', { name: 'Isoler', exact: true }).click();
    }
  }
  expect(errors).toEqual([]);
  writeFileSync(`${artifacts}/picks-${info.project.name}.json`, JSON.stringify({ localOnly: true, origin: new URL(page.url()).origin, dataset: manifest.datasetId, picks }, null, 2));
});

test('neural and vascular layers filter the real source objects and preserve a separate coherent body', async ({ page }, info) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let canvas = await openPreview(page);
  const counts = [];
  for (const [label, kind] of [['Nerfs', 'nerves'], ['Artères', 'artery'], ['Veines', 'vein']] as const) {
    await page.getByTestId('anatomy-quick-views').getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByTestId('anatomy-3d-scene')).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
    await waitForAtlasSteady(canvas);
    const arteries = Number(await canvas.getAttribute('data-visible-arteries'));
    const veins = Number(await canvas.getAttribute('data-visible-veins'));
    expect(arteries).toBe(kind === 'artery' ? manifest.meshes.filter(mesh => mesh.system === 'vessels' && mesh.vascularKind === 'artery').length : 0);
    expect(veins).toBe(kind === 'vein' ? manifest.meshes.filter(mesh => mesh.system === 'vessels' && mesh.vascularKind === 'vein').length : 0);
    await expect(canvas).toHaveAttribute('data-source-id', manifest.datasetId);
    await page.screenshot({ path: `${artifacts}/${kind}-${info.project.name}.png` });
    counts.push({ kind, arteries, veins, meshes: await canvas.getAttribute('data-mesh-count') });
  }
  for (const source of ['extended', 'detailed', 'comprehensive'] as const) {
    await chooseAtlasSource(page, source);
    canvas = page.getByTestId('anatomy-webgl-canvas');
    await expect(page.getByTestId('anatomy-3d-scene')).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
    await waitForAtlasSteady(canvas);
    await expect(canvas).toHaveAttribute('data-source-id', source === 'extended' ? 'bodyparts3d-4.3' : source === 'detailed' ? 'bodyparts3d-3.0-95' : manifest.datasetId);
  }
  await page.getByTestId('anatomy-quick-views').getByRole('button', { name: 'Nerfs', exact: true }).click();
  await expect(page.getByTestId('anatomy-3d-scene')).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  await waitForAtlasSteady(canvas);
  const panel = await openAtlasPanel(page, 'layers');
  await panel.getByRole('button', { name: 'Superposer Squelette', exact: true }).click();
  await closeAtlasPanel(page);
  await expect(page.getByTestId('anatomy-3d-scene')).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  await waitForAtlasSteady(canvas);
  expect(Number(await canvas.getAttribute('data-visible-skeleton'))).toBeGreaterThan(0);
  await page.screenshot({ path: `${artifacts}/body-context-${info.project.name}.png` });
  expect(errors).toEqual([]);
  writeFileSync(`${artifacts}/layers-${info.project.name}.json`, JSON.stringify({ localOnly: true, counts }, null, 2));
});
