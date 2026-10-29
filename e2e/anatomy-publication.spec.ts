import { expect, test } from '@playwright/test';
import { chooseAtlasSource, openAtlasPanel, closeAtlasPanel, waitForAtlasSteady } from './anatomy-helpers';

test('the current web reader ships and requests only BodyParts3D models across every active reference', async ({ page }) => {
  test.setTimeout(240000);
  const legacyRequests: string[] = [];
  const scriptChecks: Promise<{ url: string; modelIds: string[] }>[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/anatomy/z-anatomy/')) legacyRequests.push(url.pathname);
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (!url.pathname.endsWith('.js') || response.status() >= 400) return;
    scriptChecks.push(response.text().then(text => ({
      url: url.pathname,
      modelIds: [...new Set(text.match(/ZA_[a-f0-9]{16}/g) ?? [])],
    })));
  });
  await page.goto('/anatomy?lang=fr');
  const scene = page.getByTestId('anatomy-3d-scene');
  await expect(scene).toHaveAttribute('data-source-id', 'bodyparts3d-2018');
  await expect(scene).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  const panel = await openAtlasPanel(page, 'layers');
  await expect(panel.getByRole('button', { name: 'Atlas neurovasculaire', exact: true })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Anatomie régionale', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await closeAtlasPanel(page);
  for (const [source, dataset] of [
    ['extended', 'bodyparts3d-4.3'],
    ['detailed', 'bodyparts3d-3.0-95'],
    ['regional', 'bodyparts3d-2018'],
  ] as const) {
    await chooseAtlasSource(page, source);
    await expect(scene).toHaveAttribute('data-source-id', dataset);
    await expect(scene).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
    const canvas = page.getByTestId('anatomy-webgl-canvas');
    await waitForAtlasSteady(canvas);
    expect(await canvas.getAttribute('data-selected-id')).not.toMatch(/^ZA_/);
  }
  const scripts = await Promise.all(scriptChecks);
  expect(scripts.length, 'the check must inspect actual application JavaScript responses').toBeGreaterThan(0);
  for (const script of scripts) expect(script.modelIds, `${script.url} must not embed historical Z-Anatomy models`).toEqual([]);
  expect(legacyRequests).toEqual([]);
});
