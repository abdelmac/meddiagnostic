// Copy only an owner-approved, independently verified conversion into web assets.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { legacyCodeLicenceFile, legacyModelManifest, legacyModelNotice } from './lib/legacy-source-notices.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const converted = path.join(root, '.local/z-anatomy-preview-assets');
const target = path.join(root, 'public/anatomy/z-anatomy');
const report = JSON.parse(fs.readFileSync(path.join(root, '.local/z-anatomy-source/validation-report.json'), 'utf8'));
const manifestBytes = fs.readFileSync(path.join(converted, 'manifest.json'));
const manifest = JSON.parse(manifestBytes);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
if (report.status !== 'passed' || report.publicationStatus !== 'approved' ||
    report.manifestSha256 !== sha(manifestBytes) || manifest.publicationStatus !== 'approved' ||
    manifest.privateOnly !== false || manifest.publicationReview?.ownerPublicationApproved !== true) {
  throw Error('The final approved pack must pass its independent verification before publication');
}
if (!target.startsWith(path.join(root, 'public') + path.sep)) throw Error('Unsafe publication target');
const permitted = new Set();
for (const record of manifest.files) {
  if (!record.url.startsWith('/anatomy/z-anatomy/')) throw Error('Unexpected model prefix');
  const name = record.url.slice('/anatomy/z-anatomy/'.length);
  if (!name.endsWith('.glb') || name.includes('..') || name.includes('\\')) throw Error('Invalid converted asset');
  const bytes = fs.readFileSync(path.join(converted, name));
  if (bytes.length !== record.bytes || sha(bytes) !== record.sha256) throw Error('Converted asset changed after verification');
  permitted.add(name);
}
for (const name of ['manifest.json', 'ATTRIBUTION.txt', 'LICENSE.txt']) permitted.add(name);
for (const name of permitted) {
  let bytes = fs.readFileSync(path.join(converted, name));
  if (name === 'manifest.json') bytes = Buffer.from(JSON.stringify(legacyModelManifest(JSON.parse(bytes)), null, 2) + '\n');
  else if (name === 'ATTRIBUTION.txt' || name === 'LICENSE.txt') bytes = Buffer.from(legacyModelNotice(bytes.toString('utf8')));
  if (bytes.length > 25 * 1024 * 1024) throw Error('Publication asset exceeds hosting limit');
  const destination = path.resolve(target, name);
  if (!destination.startsWith(target + path.sep)) throw Error('Unsafe converted asset path');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
}
const licenceRoot = path.join(root, 'public/licenses');
fs.mkdirSync(licenceRoot, { recursive: true });
fs.copyFileSync(legacyCodeLicenceFile, path.join(licenceRoot, 'IPPOMED-CODE-CC-BY-SA-4.0.txt'));
fs.copyFileSync(path.join(root, 'NOTICE.md'), path.join(licenceRoot, 'IPPOMED-NOTICE.txt'));
console.log(JSON.stringify({ status: 'staged-for-publication', files: permitted.size, verifiedInputManifestSha256: sha(manifestBytes), publishedManifestSha256: sha(fs.readFileSync(path.join(target, 'manifest.json'))), target: 'public/anatomy/z-anatomy', deployed: false }));
