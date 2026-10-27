import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifest = JSON.parse(readFileSync(path.join(workspace, 'src/data/z-anatomy-manifest.json'), 'utf8'));
if (manifest.publicationStatus === 'private-preview-pending-approval') {
  if (process.env.EXPO_PUBLIC_Z_ANATOMY_PRIVATE_PREVIEW === '1') {
    throw Error('Private Z-Anatomy previews must stay local. Publication requires the owner’s licensing decision.');
  }
  for (const filename of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    const file = path.join(workspace, filename);
    if (existsSync(file) && /^\s*(?:export\s+)?EXPO_PUBLIC_Z_ANATOMY_PRIVATE_PREVIEW\s*=\s*['"]?1['"]?\s*(?:#.*)?$/m.test(readFileSync(file, 'utf8'))) {
      throw Error('A private anatomy preview flag is set in an environment file; production publication remains pending.');
    }
  }
  for (const dir of ['public', 'dist']) {
    if (existsSync(path.join(workspace, dir, 'anatomy/z-anatomy'))) {
      throw Error(`Private Z-Anatomy assets found under ${dir}; publication is pending approval.`);
    }
  }
}
console.log('Anatomy publication check passed.');
