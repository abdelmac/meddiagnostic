/** Publishable source for this exact Ippomed release; no credentials or model binaries. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const release = '2026-10-28';
const outputName = `ippomed-source-${release}.zip`;
const outputDir = path.join(root, 'public/source');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/data/z-anatomy-manifest.json'), 'utf8'));
const license = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
if (manifest.publicationStatus !== 'approved' || !license.includes('Attribution-ShareAlike 4.0 International')) {
  throw Error('Owner-approved publication and the complete code licence are required');
}
const excludedRoots = ['.git', '.local', '.codex', '.agents', '.aws', 'node_modules', 'dist', 'dist-native', 'artifacts', 'test-results', 'playwright-report', 'coverage', 'android', 'ios', 'public/anatomy', 'public/source'];
const binaryModel = /\.(glb|gltf|obj|blend|zip|pdf|apk|aab|ipa|exe|dll|msi|pdb|hbc|bin|pyc)$/i;
const candidates = execFileSync('git', ['ls-files', '-z', '-c', '-o', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true }).split('\0').filter(Boolean);
const filenames = [...new Set(candidates)].filter(name =>
  !excludedRoots.some(prefix => name === prefix || name.startsWith(prefix + '/')) &&
  !binaryModel.test(name) &&
  (name === '.env.example' || !/(^|\/)\.env(?:\.|$)/.test(name)) &&
  !/\.(?:pem|p12|p8|jks|keystore|key|log)$/i.test(name)
).sort();
const files = [], zip = Object.create(null);
const fixedTime = new Date('2026-10-28T00:00:00Z');
for (const name of filenames) {
  const resolved = path.resolve(root, name);
  if (!resolved.startsWith(root + path.sep) || name.includes('\\')) throw Error('Invalid source path');
  if (!fs.existsSync(resolved)) continue;
  const info = fs.lstatSync(resolved);
  if (!info.isFile() || info.isSymbolicLink()) throw Error(`Unexpected source entry: ${name}`);
  const bytes = fs.readFileSync(resolved);
  if (bytes.length > 20 * 1024 * 1024) throw Error(`Oversized source entry: ${name}`);
  files.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
  zip[name] = [bytes, { mtime: fixedTime }];
}
const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const distribution = {
  application: 'Ippomed', release, baseCommit,
  codeLicence: 'CC-BY-SA-4.0', licenceFile: 'LICENSE', thirdPartyNotices: 'NOTICE.md',
  sourceUrl: `https://medquiz-europe.medcompass-web.workers.dev/source/${outputName}`,
  excluded: 'Credentials, development caches, dependencies, compiled apps and model binaries. Model downloads and their licences are linked by the atlas manifests and notices.',
  files,
};
const record = Buffer.from(JSON.stringify(distribution, null, 2) + '\n');
zip['SOURCE-DISTRIBUTION.json'] = [record, { mtime: fixedTime }];
const fingerprint = hash(record).slice(0, 16);
const staging = path.join(root, '.local/source-distribution', fingerprint);
fs.mkdirSync(staging, { recursive: true });
for (const [name, [bytes]] of Object.entries(zip)) {
  const target = path.resolve(staging, name);
  if (!target.startsWith(staging + path.sep)) throw Error('Invalid staging path');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}
// Audit uncompressed source before writing any public ZIP; never print secret values.
const audit = execFileSync(process.execPath, ['scripts/check-client-secrets.mjs', staging], { cwd: root, encoding: 'utf8', windowsHide: true });
process.stdout.write(audit);
const bytes = Buffer.from(zipSync(zip, { level: 9 }));
if (bytes.length > 24 * 1024 * 1024) throw Error('Source archive exceeds the publication asset limit');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, outputName), bytes);
fs.writeFileSync(path.join(outputDir, outputName + '.sha256'), `${hash(bytes)}  ${outputName}\n`);
fs.writeFileSync(path.join(outputDir, 'SOURCE-DISTRIBUTION.json'), record);
console.log(JSON.stringify({ files: files.length, bytes: bytes.length, sha256: hash(bytes), sourceUrl: distribution.sourceUrl }));
