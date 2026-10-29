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

test('the BodyParts3D reader remains usable while historical third-party notices and source references stay available', async ({ page, request }) => {
  await page.goto('/anatomy?lang=fr');
  await expect(page.getByTestId('anatomy-3d-scene')).toHaveAttribute('data-source-id', 'bodyparts3d-2018');
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
  const legacyNerve = manifest.meshes.find((mesh: { name: string; legacyIds: string[] }) => /left/i.test(mesh.name) && mesh.legacyIds.includes('sciatic-nerve'));
  expect(legacyNerve, 'an existing installation must still be able to load its actual historical nerve model').toBeDefined();
  const geometry = await request.get(legacyNerve.lod.files[0]);
  expect(geometry.status()).toBe(200);
  const bytes = await geometry.body();
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const glb = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
  expect(glb.nodes.some((node: { extras?: { structureId?: string } }) => node.extras?.structureId === legacyNerve.id)).toBe(true);
});
