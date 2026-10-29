import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const historicalImport = /["'][^"']*z-anatomy-manifest(?:\.json)?["']/;
const modelPath = /\/anatomy\/z-anatomy\//;
const modelIdentity = /ZA_[a-f0-9]{16}/;
const normalized = text => text.replaceAll('\\/', '/');
const currentReferences = {
  regional: ['bodyparts3d-2018', 'src/data/bodyparts3d-regional-manifest.json', '/anatomy/bodyparts3d-regional/'],
  extended: ['bodyparts3d-4.3', 'src/data/bodyparts3d-manifest.json', '/anatomy/bodyparts3d/'],
  detailed: ['bodyparts3d-3.0-95', 'src/data/bodyparts3d-complete-manifest.json', '/anatomy/bodyparts3d-complete/'],
};
const validAsset = (url, prefix) => typeof url === 'string' && url.startsWith(prefix) && url.endsWith('.glb')
  && url.slice(prefix.length).split('/').every(segment => segment !== '.' && segment !== '..' && /^[a-zA-Z0-9_.-]+$/.test(segment));

function filesUnder(root, extension) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isSymbolicLink()) throw Error(`Linked anatomy publication input: ${file}`);
    if (entry.isDirectory()) files.push(...filesUnder(file, extension));
    else if (extension.test(entry.name)) files.push(file);
  }
  return files;
}

/**
 * Historical assets stay available; current code and bundles cannot load them.
 * @param {{ root?: string, bundleRoots?: string[] }} [options]
 */
export function assertBodyPartsOnlyReader({ root = workspace, bundleRoots = [] } = {}) {
  const policy = JSON.parse(fs.readFileSync(path.join(root, 'config/anatomy-distribution.json'), 'utf8'));
  const sources = policy.currentSources;
  if (policy.applicationSourcePublication !== 'disabled' || policy.legacyZAnatomy.activeInCurrentReader !== false || policy.defaultSource !== 'regional'
    || !Array.isArray(sources) || sources.length !== 3
    || new Set(sources.map(source => source.id)).size !== 3
    || sources.some(source => !Object.hasOwn(currentReferences, source.id)
      || currentReferences[source.id].some((value, index) => value !== [source.datasetId, source.manifest, source.assetPrefix][index]))) {
    throw Error('The current anatomy reader must retain the authorized BodyParts3D-only distribution policy');
  }
  for (const source of sources) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, source.manifest), 'utf8'));
    if (manifest.datasetId !== source.datasetId || manifest.status !== 'ready' || !manifest.meshes?.length
      || manifest.meshes.some(mesh => modelIdentity.test(mesh.id))) throw Error(`Invalid current BodyParts3D reference: ${source.id}`);
    const urls = [
      ...manifest.systems.flatMap(system => [...system.files, ...(system.url ? [system.url] : [])]),
      ...manifest.meshes.flatMap(mesh => [...(mesh.lod?.files ?? []), ...(mesh.lod?.url ? [mesh.lod.url] : [])]),
      ...(manifest.isolatedDetails?.entries ?? []).map(entry => entry.url),
    ];
    if (urls.some(url => !validAsset(url, source.assetPrefix))) throw Error(`A current reference points outside its own BodyParts3D assets: ${source.id}`);
  }
  const sourceFiles = ['src', 'app'].flatMap(dir => filesUnder(path.join(root, dir), /\.[cm]?[jt]sx?$/));
  for (const file of sourceFiles) {
    const text = normalized(fs.readFileSync(file, 'utf8'));
    if (historicalImport.test(text) || modelPath.test(text)) throw Error(`The current reader still references the historical Z-Anatomy model: ${path.relative(root, file)}`);
  }
  let bundleFiles = 0;
  for (const bundleRoot of bundleRoots) {
    const files = filesUnder(path.resolve(root, bundleRoot), /\.(?:js|hbc)$/);
    if (!files.length) throw Error(`No built anatomy-reader code found under ${bundleRoot}`);
    for (const file of files) {
      const text = normalized(fs.readFileSync(file).toString('utf8'));
      if (modelPath.test(text) || modelIdentity.test(text) || historicalImport.test(text)) {
        throw Error(`A current application bundle still includes Z-Anatomy model data: ${path.relative(root, file)}`);
      }
      bundleFiles++;
    }
  }
  const legacyFile = path.join(root, 'public/anatomy/z-anatomy/manifest.json');
  if (fs.existsSync(legacyFile)) {
    const legacy = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
    if (legacy.publicationStatus !== 'approved' || legacy.publicationBasis?.sourceCodeUrl !== policy.legacyZAnatomy.sourceUrl) {
      throw Error('Retained legacy anatomy assets must preserve their approved historical source reference');
    }
  }
  return { currentSources: sources.map(source => source.id), sourceFiles: sourceFiles.length, bundleFiles, legacyAssetsRetained: fs.existsSync(legacyFile) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--web')) throw Error('Usage: node scripts/check-anatomy-publication.mjs [--web]');
  console.log(JSON.stringify({ ...assertBodyPartsOnlyReader({ bundleRoots: args.includes('--web') ? ['dist/_expo/static/js'] : [] }), result: 'BodyParts3D-only current reader; historical model assets retained separately' }));
}
