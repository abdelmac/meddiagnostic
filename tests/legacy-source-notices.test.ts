import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { legacyModelManifest, legacyModelNotice, legacySourceUrl, retiredSourceArchiveUrl } from '../scripts/lib/legacy-source-notices.mjs';

test('retiring a source link changes provenance without changing anatomical data or licensing assets again', () => {
  const original = {
    datasetId: 'z-anatomy-neurovascular', publicationStatus: 'approved',
    publicationBasis: { sourceCodeUrl: retiredSourceArchiveUrl, applicationCodeLicense: 'CC-BY-SA-4.0' },
    meshes: [{ id: 'ZA_0123456789abcdef', system: 'nerves', lod: { url: '/anatomy/z-anatomy/high/ZA_0123456789abcdef.glb' } }],
    systems: [{ id: 'nerves', files: ['/anatomy/z-anatomy/preview/nerves-001.glb'] }],
    bounds: { min: [-1, 0, -1], max: [1, 2, 1] }, files: [{ url: '/anatomy/z-anatomy/preview/nerves-001.glb', sha256: 'retained' }],
  };
  const next = legacyModelManifest(original);
  assert.equal(original.publicationBasis.sourceCodeUrl, retiredSourceArchiveUrl);
  assert.equal(next.publicationBasis.sourceCodeUrl, legacySourceUrl);
  assert.equal(next.publicationBasis.applicationCodeLicense, 'CC-BY-SA-4.0');
  for (const key of ['meshes', 'systems', 'bounds', 'files'] as const) assert.deepEqual(next[key], original[key]);
  assert.equal(next.sourceDistributionPolicy.previousValidGrantsRetained, true);
  assert.equal(next.sourceDistributionPolicy.entireProjectIsPrivate, false);
  assert.throws(() => legacyModelManifest({ ...original, publicationBasis: { sourceCodeUrl: 'https://example.test/private-code' } }), /Unexpected historical source/);
});

test('mandatory source notices retain third-party credits, licences and model downloads', () => {
  const body = `Z-Anatomy — Gauthier Kervyn; BodyParts3D — DBCLS.\nCC-BY-SA-4.0, CC-BY-SA-2.1-JP.\nModel: https://example.test/BodyParts3D.zip\nApplication code: ${retiredSourceArchiveUrl}\n`;
  const next = legacyModelNotice(body);
  assert.ok(next.includes('Z-Anatomy — Gauthier Kervyn; BodyParts3D — DBCLS.'));
  assert.ok(next.includes('CC-BY-SA-4.0, CC-BY-SA-2.1-JP.'));
  assert.ok(next.includes('https://example.test/BodyParts3D.zip'));
  assert.ok(next.includes(legacySourceUrl));
  assert.ok(!next.includes(retiredSourceArchiveUrl));
  assert.equal(legacyModelNotice(next), next);
});

test('the historical publication flag cannot authorize another full-code publication', () => {
  const result = spawnSync(process.execPath, ['scripts/import-z-anatomy.mjs', '--publication-approved'], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /New application-source publication is disabled/);
});
