/** Private development backup only. This tool neither publishes code nor grants a licence. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';
import { auditClientSecrets, knownServerSecrets } from './check-client-secrets.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const excludedRoots = ['.git', '.local', '.codex', '.agents', '.aws', 'node_modules', 'dist', 'dist-native', 'artifacts', 'test-results', 'playwright-report', 'coverage', 'android', 'ios', 'public/anatomy', 'public/source'];
const binaryModel = /\.(glb|gltf|obj|blend|zip|pdf|apk|aab|ipa|exe|dll|msi|pdb|hbc|bin|pyc)$/i;

function allowedSource(name) {
  return !excludedRoots.some(prefix => name === prefix || name.startsWith(prefix + '/'))
    && !binaryModel.test(name)
    && (name === '.env.example' || !/(^|\/)\.env(?:\.|$)/.test(name))
    && !/\.(?:pem|p12|p8|jks|keystore|key|log)$/i.test(name);
}

export function createPrivateSourceBackup(projectRoot, selectedFiles, secrets = knownServerSecrets()) {
  const resolvedRoot = path.resolve(projectRoot);
  const files = [], zip = Object.create(null);
  const fixedTime = new Date('2026-10-28T00:00:00Z');
  for (const name of [...new Set(selectedFiles)].filter(allowedSource).sort()) {
    const resolved = path.resolve(resolvedRoot, name);
    if (!resolved.startsWith(resolvedRoot + path.sep) || name.includes('\\')) throw Error('Invalid source path');
    if (!fs.existsSync(resolved)) continue;
    const info = fs.lstatSync(resolved);
    if (!info.isFile() || info.isSymbolicLink()) throw Error('Unexpected source entry: ' + name);
    const bytes = fs.readFileSync(resolved);
    if (bytes.length > 20 * 1024 * 1024) throw Error('Oversized source entry: ' + name);
    files.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
    zip[name] = [bytes, { mtime: fixedTime }];
  }
  const snapshot = {
    application: 'Ippomed', kind: 'private-development-backup', publicDistribution: false,
    licencePolicy: 'No licence is granted by this backup tool. Preserve and consult the included licence files and third-party notices.',
    files,
  };
  const record = Buffer.from(JSON.stringify(snapshot, null, 2) + '\n');
  zip['PRIVATE-SNAPSHOT.json'] = [record, { mtime: fixedTime }];
  const fingerprint = hash(record).slice(0, 16);
  const privateRoot = path.join(resolvedRoot, '.local/private-source-backups');
  const staging = path.join(privateRoot, fingerprint, 'files');
  if (!staging.startsWith(path.join(resolvedRoot, '.local') + path.sep)) throw Error('Backup must stay under .local');
  fs.mkdirSync(staging, { recursive: true });
  for (const [name, [bytes]] of Object.entries(zip)) {
    const target = path.resolve(staging, name);
    if (!target.startsWith(staging + path.sep)) throw Error('Invalid staging path');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  const audit = auditClientSecrets([staging], secrets);
  const bytes = Buffer.from(zipSync(zip, { level: 9 }));
  const output = path.join(privateRoot, 'ippomed-development-' + fingerprint + '.zip');
  fs.writeFileSync(output, bytes);
  fs.writeFileSync(output + '.sha256', hash(bytes) + '  ' + path.basename(output) + '\n');
  return { kind: snapshot.kind, publicDistribution: false, files: files.length, bytes: bytes.length, sha256: hash(bytes), file: path.relative(resolvedRoot, output).split(path.sep).join('/'), knownSecrets: audit.knownSecrets };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw Error('Usage: node scripts/package-source.mjs. Output is fixed to a private .local backup.');
  const candidates = execFileSync('git', ['ls-files', '-z', '-c', '-o', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true }).split('\0').filter(Boolean);
  console.log(JSON.stringify(createPrivateSourceBackup(root, candidates)));
}
