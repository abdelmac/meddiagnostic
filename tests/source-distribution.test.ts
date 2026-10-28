import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { unzipSync } from 'fflate';
import { assertNoPublicSourceDistribution, isRetiredSourcePath, sourceDistributionViolations } from '../scripts/check-source-distribution.mjs';
import { createPrivateSourceBackup } from '../scripts/package-source.mjs';

function fixture(run: (directory: string) => void) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ippomed-source-withdrawal-'));
  try { run(directory); }
  finally {
    const resolved = fs.realpathSync(directory);
    assert(resolved.startsWith(fs.realpathSync(os.tmpdir()) + path.sep));
    assert(path.basename(resolved).startsWith('ippomed-source-withdrawal-'));
    fs.rmSync(resolved, { recursive: true });
  }
}

test('retired source paths include query, HEAD/Range request paths and encoded variants without hiding third-party assets', () => {
  for (const target of ['/source', '/source/', '/source/ippomed-source-2026-10-28.zip', '/source/ippomed-source-2026-10-28.zip?download=1', '/source/SOURCE-DISTRIBUTION.json', '/%73ource/ippomed-source-2026-10-28.zip', '/source%2fippomed-source-2026-10-28.zip', '/source%252fippomed-source-2026-10-28.zip']) assert.equal(isRetiredSourcePath(target), true, target);
  for (const target of ['/', '/sources', '/source-catalog.json', '/anatomy', '/anatomy/z-anatomy/LICENSE.txt', '/anatomy/bodyparts3d/source.zip', '/_expo/static/js/web/source.js']) assert.equal(isRetiredSourcePath(target), false, target);
});

test('publication guard rejects source ZIPs and distribution manifests while preserving third-party notices', () => fixture(directory => {
  const publicRoot = path.join(directory, 'public');
  fs.mkdirSync(path.join(publicRoot, 'source'), { recursive: true });
  fs.mkdirSync(path.join(publicRoot, 'anatomy/z-anatomy'), { recursive: true });
  fs.writeFileSync(path.join(publicRoot, 'anatomy/z-anatomy/LICENSE.txt'), 'Third-party CC BY-SA attribution must remain.');
  const forbidden = ['source/ippomed-source-2026-10-28.zip', 'source/ippomed-source-2026-10-28.zip.sha256', 'source/SOURCE-DISTRIBUTION.json'];
  forbidden.forEach(name => fs.writeFileSync(path.join(publicRoot, name), 'withdrawal-fixture'));
  assert.equal(sourceDistributionViolations([publicRoot]).length, 3);
  assert.throws(() => assertNoPublicSourceDistribution([publicRoot]), /Public source distribution is disabled/);
  forbidden.forEach(name => fs.unlinkSync(path.join(publicRoot, name)));
  assert.deepEqual(assertNoPublicSourceDistribution([publicRoot]), { roots: 1, forbiddenFiles: 0 });
  fs.mkdirSync(path.join(publicRoot, 'downloads'));
  fs.writeFileSync(path.join(publicRoot, 'downloads/ippomed-source-renamed.zip'), 'fixture');
  assert.equal(sourceDistributionViolations([publicRoot]).length, 1);
}));

test('development packaging writes only a private backup and never creates a new global licence grant', () => fixture(directory => {
  fs.writeFileSync(path.join(directory, 'README.md'), 'Private development fixture.');
  fs.writeFileSync(path.join(directory, '.env'), 'PRIVATE_SECRET=not-distributed');
  fs.writeFileSync(path.join(directory, '.env.example'), 'PUBLIC_PLACEHOLDER=example');
  const result = createPrivateSourceBackup(directory, ['README.md', '.env', '.env.example'], []);
  assert.equal(result.publicDistribution, false);
  assert(result.file.startsWith('.local/private-source-backups/'));
  assert.equal(fs.existsSync(path.join(directory, 'public')), false);
  assert.equal(fs.existsSync(path.join(directory, 'dist')), false);
  const entries = unzipSync(fs.readFileSync(path.join(directory, result.file)));
  assert.deepEqual(Object.keys(entries).sort(), ['.env.example', 'PRIVATE-SNAPSHOT.json', 'README.md']);
  const snapshot = JSON.parse(Buffer.from(entries['PRIVATE-SNAPSHOT.json']!).toString('utf8'));
  assert.equal(snapshot.publicDistribution, false);
  assert.equal(snapshot.kind, 'private-development-backup');
  assert.equal(Object.hasOwn(snapshot, 'sourceUrl'), false);
  assert.equal(Object.hasOwn(snapshot, 'codeLicence'), false);
  assert.match(snapshot.licencePolicy, /No licence is granted/);
}));

test('build/deploy guards and asset exclusions prevent the retired archive from being republished', () => {
  const config = JSON.parse(fs.readFileSync('wrangler.jsonc', 'utf8').replace(/,\s*}/g, '}'));
  assert.equal(config.assets.not_found_handling, '404-page');
  assert.equal(config.preview_urls, false);
  assert.equal(Object.hasOwn(config, 'main'), false);
  const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
  const before = scripts['build:web'].indexOf('check-source-distribution.mjs public');
  const exportAt = scripts['build:web'].indexOf('expo export --platform web');
  const after = scripts['build:web'].lastIndexOf('check-source-distribution.mjs public dist');
  assert(before >= 0 && before < exportAt && after > exportAt);
  assert(scripts['deploy:web'].startsWith('node scripts/check-source-distribution.mjs public dist'));
  assert(!scripts['build:web'].includes('package-source'));
  assert(!scripts['deploy:web'].includes('package-source'));
  const ignore = fs.readFileSync('public/.assetsignore', 'utf8');
  assert.match(ignore, /^\/source\/\*\*$/m);
  assert.match(ignore, /SOURCE-DISTRIBUTION\.json/);
  assert.match(fs.readFileSync('.gitignore', 'utf8'), /^public\/source\/$/m);
});
