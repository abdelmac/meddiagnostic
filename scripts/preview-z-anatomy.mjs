// Private, loopback-only review. This command never deploys or changes licensing.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { cp, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const privateRoot = path.join(workspace, '.local');
const assets = path.join(privateRoot, 'z-anatomy-preview-assets');
const output = path.join(privateRoot, 'z-anatomy-preview-dist');
const destination = path.join(output, 'anatomy', 'z-anatomy');
for (const target of [assets, output, destination]) {
  if (!target.startsWith(privateRoot + path.sep)) throw Error('Preview must stay in .local');
}

async function run(args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: workspace, stdio: 'inherit', windowsHide: true,
      env: { ...process.env, EXPO_PUBLIC_Z_ANATOMY_PRIVATE_PREVIEW: '1' },
    });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(Error(`Preview build exited ${code}`)));
  });
}

if (process.argv[2] === 'build') {
  const manifest = JSON.parse(await readFile(path.join(assets, 'manifest.json'), 'utf8'));
  if (manifest.status !== 'ready' || !['private-preview-pending-approval', 'approved'].includes(manifest.publicationStatus)) {
    throw Error('A completed private source conversion is required');
  }
  await run([path.join(workspace, 'node_modules/expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', output]);
  await mkdir(destination, { recursive: true });
  // Only converted assets and notices may enter the preview, never raw Blender files or scripts.
  async function copyConverted(dir, target) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw Error('Unexpected linked preview asset');
      const from = path.join(dir, entry.name), to = path.join(target, entry.name);
      if (entry.isDirectory()) { await mkdir(to, { recursive: true }); await copyConverted(from, to); }
      else if (/\.(glb|json|txt)$/i.test(entry.name)) await cp(from, to);
      else throw Error(`Unexpected preview asset extension: ${path.extname(entry.name)}`);
    }
  }
  await copyConverted(assets, destination);
  console.log('Private preview prepared in .local/z-anatomy-preview-dist. No deployment performed.');
} else if (process.argv[2] === 'serve') {
  await stat(path.join(output, 'index.html'));
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
  createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1:8082');
      let file = path.resolve(output, `.${decodeURIComponent(url.pathname)}`);
      if (!file.startsWith(output + path.sep) && file !== output) throw Error('Invalid path');
      let info;
      try { info = await stat(file); }
      catch { if (path.extname(file)) throw Error('Not found'); file += '.html'; info = await stat(file); }
      if (info.isDirectory()) file = path.join(file, 'index.html');
      res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end('Not found'); }
  }).listen(8082, '127.0.0.1', () => console.log('Ippomed private preview: http://127.0.0.1:8082/anatomy?lang=fr'));
} else {
  throw Error('Usage: node scripts/preview-z-anatomy.mjs build|serve');
}
