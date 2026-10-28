import { expect, test } from '@playwright/test';

const retired = '/source/ippomed-source-2026-10-28.zip';
const priorETag = '"1631147ae628afa3851bb38fa9409e8b"';

test('the retired source archive returns a real 404 or 410 for GET, HEAD, ranges and conditional cache requests', async ({ request }) => {
  const cases: { url: string; method: string; headers: Record<string, string> }[] = [
    { url: retired, method: 'GET', headers: {} },
    { url: retired, method: 'HEAD', headers: {} },
    { url: retired + '?download=1', method: 'GET', headers: {} },
    { url: retired, method: 'GET', headers: { Range: 'bytes=0-31' } },
    { url: retired, method: 'GET', headers: { 'If-None-Match': priorETag } },
    { url: retired + '.sha256', method: 'GET', headers: {} },
    { url: '/source/SOURCE-DISTRIBUTION.json', method: 'GET', headers: {} },
  ];
  for (const item of cases) {
    const response = await request.fetch(item.url, { method: item.method, headers: item.headers });
    expect([404, 410], `${item.method} ${item.url}`).toContain(response.status());
    expect(response.headers()['content-type'] ?? '').not.toMatch(/application\/(?:zip|x-zip)/);
    const body = await response.body();
    expect(body.subarray(0, 2).toString('hex')).not.toBe('504b');
    if (item.method === 'HEAD') expect(body.length).toBe(0);
  }
});

test('the atlas remains usable and third-party notices retain the legacy public source reference', async ({ page, request }) => {
  await page.goto('/anatomy?lang=fr');
  await expect(page.getByTestId('anatomy-3d-scene')).toHaveAttribute('data-source-id', 'z-anatomy-neurovascular');
  await expect(page.getByTestId('anatomy-3d-scene')).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  await expect(page.locator('a[href*="/source/ippomed-source-"]')).toHaveCount(0);
  for (const url of ['/anatomy/z-anatomy/ATTRIBUTION.txt', '/anatomy/z-anatomy/LICENSE.txt']) {
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toMatch(/CC[- ]BY[- ]SA|Creative Commons Attribution-ShareAlike/);
    expect(text).not.toContain('medcompass-web.workers.dev/source/ippomed-source-2026-10-28.zip');
  }
  const response = await request.get('/anatomy/z-anatomy/manifest.json');
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.meshes.length).toBe(3642);
  expect(manifest.publicationBasis.sourceCodeUrl).toBe('https://github.com/abdelmac/meddiagnostic/tree/8bbcd75fc6946a0a1b2dbcd889892177776db500');
});
