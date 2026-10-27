import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { anatomyInspectionResolution, createAnatomyProgressiveLod, type BodyPartsEntry, type BodyPartsManifest, type LoadedAnatomyLayer } from '../src/ui/anatomy-gltf.web';
import type { AnatomySectionPlane } from '../src/domain/anatomy-section';

Object.assign(globalThis, { window: { location: { origin: 'https://anatomy.test' } } });

function glb(id: string) {
  const positions = new Float32Array([0, 0, 0, 100, 0, 0, 0, 100, 0]);
  const document = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: id, extras: { structureId: id }, translation: [-0.05, 0.95, 0], scale: [0.001, 0.001, 0.001] }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], buffers: [{ byteLength: positions.byteLength }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [100, 100, 0] }] };
  const jsonBytes = Buffer.from(JSON.stringify(document)), padding = (4 - jsonBytes.length % 4) % 4;
  const json = Buffer.concat([jsonBytes, Buffer.alloc(padding, 32)]), binary = Buffer.from(positions.buffer);
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length);
  output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20);
  const offset = 20 + json.length; output.writeUInt32LE(binary.length, offset); output.writeUInt32LE(0x004e4942, offset + 4); binary.copy(output, offset + 8);
  return output;
}
const wait = async (predicate: () => boolean) => {
  for (let i = 0; i < 150 && !predicate(); i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(predicate(), true, 'asynchronous LOD transition timed out');
};
function fixture(ids: string[], triangles = 10_000, getSectionPlane?: () => AnatomySectionPlane | undefined) {
  const group = new THREE.Group();
  const entries: BodyPartsEntry[] = ids.map(id => ({ id, name: 'biceps brachii', system: 'muscles', legacyIds: [id], bounds: { min: [-0.05, 0.95, 0], max: [0.05, 1.05, 0] }, triangles: 1, lod: { url: '/' + id + '.glb', bytes: glb(id).length, triangles } }));
  const originals = entries.map((entry) => {
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.05, 0.95, 0, 0.05, 0.95, 0, -0.05, 1.05, 0], 3));
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()); mesh.userData.structureId = entry.id; mesh.userData.legacyIds = [entry.id]; group.add(mesh); return mesh;
  });
  const layer: LoadedAnatomyLayer = { system: 'muscles', group, meshes: [...originals], byId: new Map(entries.map((entry, i) => [entry.id, [originals[i]!]])), entries: new Map(entries.map(entry => [entry.id, entry])), bounds: new THREE.Box3().setFromObject(group), dispose() {} };
  const manifest: BodyPartsManifest = { datasetId: 'coherent-test', systems: [], meshes: entries };
  const camera = new THREE.PerspectiveCamera(35, 1, 0.005, 40); camera.position.set(0, 1, 3); camera.lookAt(0, 1, 0); camera.updateMatrixWorld();
  const canvas = { dataset: {}, clientWidth: 600, clientHeight: 600 } as unknown as HTMLCanvasElement;
  let selected = ids[0], enabled = true, disposals = 0;
  const lod = createAnatomyProgressiveLod({ manifest, camera, canvas, lowPower: true, getLayers: () => [layer], getSelectedId: () => selected, getSectionPlane, enabled: () => enabled,
    changed() { layer.meshes.forEach(mesh => { mesh.visible = true; }); }, status() {}, disposeLayer(high) { disposals++; high.dispose(); } });
  return { lod, layer, originals, canvas, select(id: string) { selected = id; lod.schedule(); }, disable() { enabled = false; lod.schedule(); }, enable() { enabled = true; lod.schedule(); }, get disposals() { return disposals; } };
}

test('full-body LOD preserves node transforms, physical IDs, original geometry and cached return', async () => {
  let fetches = 0;
  globalThis.fetch = async input => { fetches++; const id = new URL(String(input)).pathname.slice(1, -4); return new Response(glb(id)); };
  const f = fixture(['A']); const originalBounds = new THREE.Box3().setFromObject(f.originals[0]!);
  f.lod.schedule(); await wait(() => f.canvas.dataset.selectedLod === 'high');
  assert.equal(f.layer.byId.get('A')?.length, 1); assert.notEqual(f.layer.byId.get('A')?.[0], f.originals[0]); assert.equal(f.originals[0]!.visible, false);
  const high = f.layer.byId.get('A')![0]!, highBounds = new THREE.Box3().setFromObject(high);
  assert.ok(highBounds.min.distanceTo(originalBounds.min) < 1e-6); assert.ok(highBounds.max.distanceTo(originalBounds.max) < 1e-6);
  assert.equal(high.userData.structureId, 'A');
  f.disable(); await wait(() => f.layer.byId.get('A')?.[0] === f.originals[0]);
  f.enable(); await wait(() => f.canvas.dataset.selectedLod === 'high'); assert.equal(fetches, 1);
  f.lod.dispose(); assert.equal(f.layer.byId.get('A')?.[0], f.originals[0]); assert.equal(f.disposals, 1);
});

test('unavailable region keeps base geometry and allows a successful explicit retry', async () => {
  let unavailable = true;
  globalThis.fetch = async input => unavailable ? new Response('unavailable', { status: 503 }) : new Response(glb(new URL(String(input)).pathname.slice(1, -4)));
  const f = fixture(['A']); f.lod.schedule(); await wait(() => f.canvas.dataset.lodErrors === '1');
  assert.equal(f.layer.byId.get('A')?.[0], f.originals[0]);
  unavailable = false; f.lod.retry(); await wait(() => f.canvas.dataset.selectedLod === 'high'); assert.equal(f.canvas.dataset.lodErrors, '0'); f.lod.dispose();
});

test('obsolete in-flight details abort and never replace the newly selected anatomy', async () => {
  let aborted = false;
  globalThis.fetch = async (input, init) => {
    const id = new URL(String(input)).pathname.slice(1, -4);
    if (id === 'A') return new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); }));
    return new Response(glb(id));
  };
  const f = fixture(['A', 'B']); f.lod.schedule(); await wait(() => f.canvas.dataset.lodPending === '1');
  f.select('B'); await wait(() => f.canvas.dataset.selectedLod === 'high'); assert.equal(aborted, true);
  assert.equal(f.layer.byId.get('A')?.[0], f.originals[0]); assert.equal(f.layer.byId.get('B')?.[0]?.userData.anatomyLod, 'high'); f.lod.dispose();
});

test('touring many regions evicts inactive detail buffers within the triangle budget', async () => {
  globalThis.fetch = async input => new Response(glb(new URL(String(input)).pathname.slice(1, -4)));
  const ids = Array.from({ length: 25 }, (_, index) => 'part' + index), f = fixture(ids, 200_000);
  for (const id of ids) {
    f.select(id); await wait(() => f.canvas.dataset.selectedLod === 'high' && f.canvas.dataset.lodIds === id);
  }
  assert.ok(f.disposals >= 14, 'inactive cache must fit the 2.24M-triangle mobile resident budget');
  assert.equal(f.canvas.dataset.lodMeshCount, '1');
  f.lod.dispose(); assert.equal(f.disposals, 25);
  for (let i = 0; i < ids.length; i++) assert.equal(f.layer.byId.get(ids[i]!)?.[0], f.originals[i]);
});

test('an explicit composite selection takes priority over the surrounding detail budget', async () => {
  globalThis.fetch = async input => new Response(glb(new URL(String(input)).pathname.slice(1, -4)));
  const f = fixture(['left', 'right', 'context'], 1_000_000);
  for (const id of ['left', 'right']) {
    f.layer.entries.get(id)!.legacyIds = [id, 'both']; f.layer.byId.get(id)![0]!.userData.legacyIds = [id, 'both'];
  }
  f.layer.entries.get('context')!.bounds = { min: [-0.7, 0.3, 0], max: [0.7, 1.7, 0] };
  f.select('both'); await wait(() => f.canvas.dataset.lodIds === 'left,right' && f.canvas.dataset.selectedLod === 'high');
  assert.equal(f.canvas.dataset.lodTriangles, '2000000');
  assert.equal(f.layer.byId.get('context')?.[0], f.originals[2]); f.lod.dispose();
});

test('returning to an aborted region starts a fresh request before old decode work settles', async () => {
  let firstA = true, aRequests = 0;
  globalThis.fetch = async (input, init) => {
    const id = new URL(String(input)).pathname.slice(1, -4);
    if (id === 'A') {
      aRequests++;
      if (firstA) {
        firstA = false;
        return new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 600)));
      }
    }
    return new Response(glb(id));
  };
  const f = fixture(['A', 'B']); f.lod.schedule(); await wait(() => f.canvas.dataset.lodPending === '1');
  f.select('B'); await wait(() => f.canvas.dataset.selectedLod === 'high' && f.canvas.dataset.lodIds === 'B');
  f.select('A'); await wait(() => f.canvas.dataset.selectedLod === 'high' && f.canvas.dataset.lodIds === 'A');
  assert.equal(aRequests, 2); f.lod.dispose();
});

test('whole-body and close-up views reach DPR2 at rest, drop during gestures, and cap large buffers', () => {
  const phone = { width: 328, height: 510, devicePixelRatio: 3, bodyPixelRatio: 1, viewHeight: 0.6, bodyHeight: 1.72, moving: false, lowPower: true };
  assert.deepEqual(anatomyInspectionResolution(phone), { ratio: 2, pixelBudget: 1_500_000, mode: 'inspection' });
  assert.equal(anatomyInspectionResolution({ ...phone, moving: true }).ratio, 1);
  assert.deepEqual(anatomyInspectionResolution({ ...phone, viewHeight: 2.1 }), { ratio: 2, pixelBudget: 1_500_000, mode: 'body' });
  const large = anatomyInspectionResolution({ ...phone, width: 1200, height: 1000 });
  assert.ok(large.ratio < 2); assert.ok(1200 * 1000 * large.ratio ** 2 <= large.pixelBudget + 1e-6);
  const desktop = anatomyInspectionResolution({ ...phone, devicePixelRatio: 2, bodyPixelRatio: 1.5, lowPower: false, viewHeight: 2.1 });
  assert.equal(desktop.ratio, 2); assert.equal(desktop.mode, 'body');
  assert.equal(anatomyInspectionResolution({ ...phone, lowPower: false, bodyPixelRatio: 1.5, moving: true }).ratio, 1.5);
  assert.equal(anatomyInspectionResolution({ ...phone, viewHeight: 2.1, devicePixelRatio: 1.25 }).ratio, 1.25);
  const wideBody = anatomyInspectionResolution({ ...phone, viewHeight: 2.1, width: 1600, height: 900 });
  assert.equal(wideBody.mode, 'body');
  assert.ok(wideBody.ratio < 2 && wideBody.ratio ** 2 * 1600 * 900 <= 1_500_000 + 1e-6);
});

test('virtual sections preserve HIGH for intersecting anatomy and restore cut-away details without refetching', async () => {
  let fetches = 0;
  globalThis.fetch = async input => { fetches++; return new Response(glb(new URL(String(input)).pathname.slice(1, -4))); };
  let plane: AnatomySectionPlane | undefined = { normal: [0, 1, 0], constant: -1.1, coordinate: 1.1 };
  const f = fixture(['A'], 10_000, () => plane);
  f.lod.schedule();
  await wait(() => f.canvas.dataset.lodSectionSkipped === '1');
  assert.equal(fetches, 0, 'a selected but wholly cut-away structure must not consume the detail budget');
  plane = { normal: [0, 1, 0], constant: -1, coordinate: 1 };
  f.lod.schedule(); await wait(() => f.canvas.dataset.selectedLod === 'high');
  assert.equal(fetches, 1, 'partly sectioned structures retain their true detail');
  plane = { normal: [0, 1, 0], constant: -1.1, coordinate: 1.1 };
  f.lod.schedule(); await wait(() => f.layer.byId.get('A')?.[0] === f.originals[0]);
  plane = undefined;
  f.lod.schedule(); await wait(() => f.canvas.dataset.selectedLod === 'high');
  assert.equal(fetches, 1, 'restoring the section reuses the bounded detail cache');
  f.lod.dispose();
});

test('moving a virtual section cancels obsolete source detail requests', async () => {
  let aborted = false;
  globalThis.fetch = async (_input, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); }));
  let plane: AnatomySectionPlane | undefined;
  const f = fixture(['A'], 10_000, () => plane);
  f.lod.schedule(); await wait(() => f.canvas.dataset.lodPending === '1');
  plane = { normal: [0, 1, 0], constant: -1.1, coordinate: 1.1 };
  f.lod.schedule(); await wait(() => aborted && f.canvas.dataset.lodPending === '0');
  assert.equal(f.layer.byId.get('A')?.[0], f.originals[0]);
  assert.equal(f.canvas.dataset.lodErrors, '0');
  f.lod.dispose();
});
