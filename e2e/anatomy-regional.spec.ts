import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import data from '../src/data/bodyparts3d-regional-manifest.json';
import { localizeAnatomyName } from '../src/data/anatomy-nomenclature';
import { chooseAtlasSource, closeAtlasPanel, openAtlasPanel, selectAtlasStructure, waitForAtlasSteady } from './anatomy-helpers';

const manifest = data as unknown as {
  datasetId: string;
  meshes: { id: string; elementId: string; name: string }[];
  detailExpansion: { newMeshIds: string[]; newConceptIds: string[] };
};
const artifacts = '.local/regional-anatomy-review';
mkdirSync(artifacts, { recursive: true });

async function pickIsolatedSurface(page: Page, canvas: Locator, id: string, touch: boolean) {
  const box = (await canvas.boundingBox())!;
  const png = await canvas.screenshot();
  const candidates = await page.evaluate(async base64 => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(Error('Screenshot decode'));
      image.src = `data:image/png;base64,${base64}`;
    });
    const bitmap = document.createElement('canvas'); bitmap.width = image.width; bitmap.height = image.height;
    const context = bitmap.getContext('2d')!; context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    const foreground = (x: number, y: number) => {
      const p = (y * image.width + x) * 4;
      return pixels[p]! + pixels[p + 1]! + pixels[p + 2]! > 245;
    };
    const points: { x: number; y: number; width: number }[] = [];
    let minX = image.width, maxX = -1, minY = image.height, maxY = -1;
    for (let y = Math.ceil(image.height * .08); y < image.height * .92; y += Math.max(1, Math.floor(image.height / 80))) {
      let start = -1;
      for (let x = Math.ceil(image.width * .08); x < image.width * .92; x++) {
        if (foreground(x, y)) {
          if (start === -1) start = x;
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
        else if (start !== -1) {
          points.push({ x: (x + start - 1) / 2 / image.width, y: y / image.height, width: x - start }); start = -1;
        }
      }
    }
    return {
      points: points.sort((a, b) => b.width - a.width).slice(0, 120),
      coverage: Math.max((maxX - minX + 1) / image.width, (maxY - minY + 1) / image.height),
    };
  }, png.toString('base64'));
  expect(candidates.coverage, 'An isolated detail must fill enough of the viewport to study its surface').toBeGreaterThan(.2);
  for (const candidate of candidates.points) {
    const point = { x: box.x + box.width * candidate.x, y: box.y + box.height * candidate.y };
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(50);
    if (await canvas.getAttribute('data-hover-id') !== id) continue;
    if (touch) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
    await expect(canvas).toHaveAttribute('data-last-pick-id', id);
    await expect(canvas).toHaveAttribute('data-selected-id', id);
    return;
  }
  throw Error(`No actual surface pick for ${id}`);
}

test('new anatomical details open their own body and remain selectable, isolated and sectionable', async ({ page }, info) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  expect(manifest.detailExpansion.newConceptIds.length).toBeGreaterThanOrEqual(1000);
  await page.goto('/anatomy?lang=fr');
  await closeAtlasPanel(page);
  await page.getByRole('button', { name: `${manifest.detailExpansion.newConceptIds.length} nouveaux détails`, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nouveaux détails uniquement', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const mesh = manifest.meshes.find(item => item.elementId === 'MM2407')!;
  expect(mesh).toBeDefined();
  expect(manifest.detailExpansion.newMeshIds).toContain(mesh.id);
  await selectAtlasStructure(page, localizeAnatomyName(mesh.name, 'fr'), mesh.id);
  const scene = page.getByTestId('anatomy-3d-scene');
  const canvas = page.getByTestId('anatomy-webgl-canvas');
  await expect(scene).toHaveAttribute('data-source-id', manifest.datasetId);
  await expect(scene).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  await page.getByRole('button', { name: 'Isoler', exact: true }).click();
  await page.getByRole('button', { name: 'Centrer la structure', exact: true }).click();
  await waitForAtlasSteady(canvas);
  await expect(canvas).toHaveAttribute('data-selected-lod', 'high');
  await pickIsolatedSurface(page, canvas, mesh.id, info.project.name === 'mobile-web');
  await page.screenshot({ path: `${artifacts}/vertebral-body-${info.project.name}.png` });
  const nerve = manifest.meshes.find(item => item.elementId === 'MM2242')!;
  expect(manifest.detailExpansion.newMeshIds).toContain(nerve.id);
  await selectAtlasStructure(page, localizeAnatomyName(nerve.name, 'fr'), nerve.id);
  await expect(scene).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  await page.getByRole('button', { name: 'Centrer la structure', exact: true }).click();
  await waitForAtlasSteady(canvas);
  await expect(canvas).toHaveAttribute('data-selected-lod', 'high');
  await pickIsolatedSurface(page, canvas, nerve.id, info.project.name === 'mobile-web');
  await page.screenshot({ path: `${artifacts}/optic-segment-${info.project.name}.png` });
  const panel = await openAtlasPanel(page, 'layers');
  await panel.getByRole('button', { name: 'Coupe anatomique', exact: true }).click();
  await expect(page.getByTestId('anatomy-section-controls')).toBeVisible();
  await closeAtlasPanel(page);
  await waitForAtlasSteady(canvas);
  await expect(canvas).toHaveAttribute('data-section', /"axis":"axial"/);
  await chooseAtlasSource(page, 'extended');
  await expect(scene).toHaveAttribute('data-source-id', 'bodyparts3d-4.3');
  await expect(scene).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  await chooseAtlasSource(page, 'regional');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const search = await openAtlasPanel(page, 'search');
  await expect(search.getByRole('button', { name: 'New details only', exact: true })).toBeVisible();
  await expect(search.getByRole('button', { name: 'New details only', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});
