import { expect, test } from '@playwright/test';
import { openAtlasPanel } from './anatomy-helpers';
import source from '../src/data/z-anatomy-manifest.json';

test('normal builds keep the published atlas and cannot open publication-pending geometry', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PRIVATE_ANATOMY === '1', 'Check the normal build without the local preview flag');
  test.skip((source as { publicationStatus?: string }).publicationStatus !== 'private-preview-pending-approval', 'The owner has approved this dataset for publication');
  const privateRequests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/anatomy/z-anatomy/')) privateRequests.push(url.pathname);
  });
  await page.goto('/anatomy?lang=fr');
  await expect(page.getByTestId('anatomy-3d-scene')).toHaveAttribute('data-source-id', 'bodyparts3d-4.3');
  await expect(page.getByTestId('anatomy-3d-scene')).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
  const panel = await openAtlasPanel(page, 'layers');
  await expect(panel.getByRole('button', { name: 'Atlas neurovasculaire', exact: true })).toBeDisabled();
  await expect(panel.getByRole('button', { name: 'Corps complet', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(privateRequests).toEqual([]);
});
