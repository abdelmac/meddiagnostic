import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import type { AnatomySystem } from "../data/anatomy-structures";
import { anatomyTissueProfile, applyAnatomyTissueProfile } from "./anatomy-materials.web";
import { ANATOMY_ASSET_ORIGIN, anatomyNativeAssetUrl } from "../domain/anatomy-native-bridge";
import { anatomySectionIntersectsBounds, type AnatomySectionPlane } from "../domain/anatomy-section";

export type BodyPartsEntry = {
  id: string;
  name: string;
  system: AnatomySystem;
  vascularKind?: "artery" | "vein" | "other";
  representationGroup?: string;
  representationDefault?: boolean;
  representationId?: string;
  fmaId?: string;
  elementId?: string;
  legacyIds?: readonly string[];
  bounds?: { min: number[]; max: number[] };
  defaultVisible?: boolean;
  triangles?: number;
  vertexCount?: number;
  lod?: { url?: string; files?: string[]; bytes: number; triangles: number; vertexCount?: number; sha256?: string };
};
export type BodyPartsManifest = {
  assetBaseUrl?: string;
  datasetId?: string;
  dataset?: string;
  version?: number | string;
  attributionUrl?: string;
  systems: { id: AnatomySystem; url?: string; files?: string[]; bytes?: number; meshCount?: number }[];
  meshes: BodyPartsEntry[];
  legacyMapping?: Record<string, string[]>;
  bounds?: { min: number[]; max: number[] };
  isolatedDetails?: {
    dataset: string;
    license: string;
    entries: { id: string; sourceFmaId?: string; url: string; bytes: number; triangles?: number; vertexCount?: number; bounds?: { min: number[]; max: number[] } }[];
  };
};
export type LoadedAnatomyLayer = {
  system: AnatomySystem;
  group: THREE.Group;
  meshes: THREE.Mesh[];
  byId: Map<string, THREE.Mesh[]>;
  entries: Map<string, BodyPartsEntry>;
  bounds: THREE.Box3;
  dispose: () => void;
};

/** Dispose textures as well as materials: GLTFLoader can own ImageBitmaps. */
export function disposeAnatomyObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    const list = Array.isArray(node.material) ? node.material : [node.material];
    list.forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) textures.add(value); });
    });
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => {
    const image = texture.image as { close?: () => void } | undefined;
    image?.close?.(); texture.dispose();
  });
  object.clear();
}

export function resolveAnatomyAssetUrl(url: string, assetBaseUrl?: string) {
  if (assetBaseUrl !== undefined) {
    if (assetBaseUrl !== ANATOMY_ASSET_ORIGIN) throw new Error("Invalid anatomy asset origin");
    const permitted = anatomyNativeAssetUrl(url);
    if (!permitted) throw new Error("Invalid anatomy asset");
    return new URL(permitted);
  }
  const resolved = new URL(url, window.location.origin);
  if (resolved.origin !== window.location.origin || !resolved.pathname.endsWith(".glb")) throw new Error("Invalid anatomy asset");
  return resolved;
}

async function fetchGLB(url: string, signal: AbortSignal, progress: (loaded: number) => void, assetBaseUrl?: string) {
  const resolved = resolveAnatomyAssetUrl(url, assetBaseUrl);
  const response = await fetch(resolved, { signal, credentials: assetBaseUrl === undefined ? "same-origin" : "omit" });
  if (!response.ok) throw new Error("Anatomy asset unavailable");
  if (!response.body) return response.arrayBuffer();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      chunks.push(next.value); size += next.value.byteLength; progress(size);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(size);
  let offset = 0;
  chunks.forEach((chunk) => { buffer.set(chunk, offset); offset += chunk.byteLength; });
  return buffer.buffer;
}

/** Load only the requested layer. Every anatomical mesh keeps its FMA identity. */
export async function loadAnatomyLayer(
  manifest: BodyPartsManifest,
  system: AnatomySystem,
  signal: AbortSignal,
  progress: (loaded: number, total: number) => void,
): Promise<LoadedAnatomyLayer> {
  const entry = manifest.systems.find((item) => item.id === system);
  const files = entry?.files?.length ? entry.files : entry?.url ? [entry.url] : [];
  if (!files.length) throw new Error("Anatomy layer unavailable");
  const group = new THREE.Group();
  const entries = new Map(manifest.meshes.map((item) => [item.id, item]));
  const meshes: THREE.Mesh[] = [];
  const byId = new Map<string, THREE.Mesh[]>();
  const colored = new Map<string, THREE.Material>();
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  let completed = 0;
  try {
    for (const file of files) {
      const buffer = await fetchGLB(file, signal, (loaded) => progress(completed + loaded, entry?.bytes ?? 0), manifest.assetBaseUrl);
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const gltf = await loader.parseAsync(buffer, new URL(".", resolveAnatomyAssetUrl(file, manifest.assetBaseUrl)).href);
      if (signal.aborted) { disposeAnatomyObject(gltf.scene); throw new DOMException("Aborted", "AbortError"); }
      group.add(gltf.scene);
      completed += buffer.byteLength; progress(completed, entry?.bytes ?? completed);
    }
    group.updateMatrixWorld(true);
    group.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      let ancestor: THREE.Object3D | null = node;
      let id: string | undefined;
      while (ancestor && !id) {
        const proposed = ancestor.userData.structureId as string | undefined;
        if (proposed && entries.has(proposed)) id = proposed;
        else if (entries.has(ancestor.name)) id = ancestor.name;
        ancestor = ancestor.parent;
      }
      if (!id) { node.visible = false; return; }
      node.userData.structureId = id;
      node.userData.legacyIds = entries.get(id)?.legacyIds ?? [];
      const entry = entries.get(id)!;
      // Keep the genuine skin mesh available for explicit study, while its
      // whole-body envelope must not cover or intercept the internal anatomy.
      node.userData.contextEnvelope = entry.defaultVisible === false || entry.fmaId === "FMA7163" || /^skin$/i.test(entry.name);
      node.geometry.computeBoundingBox(); node.geometry.computeBoundingSphere();
      const appearance = manifest.meshes.some((item) => item.lod) ? "natural" : "study";
      const profile = anatomyTissueProfile(entry, appearance);
      const style = (original: THREE.Material) => {
        const key = `${original.uuid}:${profile.id}`;
        let material = colored.get(key);
        if (!material) {
          material = original.clone();
          applyAnatomyTissueProfile(material, entry, appearance);
          colored.set(key, material);
        }
        return material;
      };
      node.material = Array.isArray(node.material) ? node.material.map(style) : style(node.material);
      const previous = byId.get(id) ?? []; previous.push(node); byId.set(id, previous); meshes.push(node);
    });
    if (!meshes.length) throw new Error("Anatomy layer has no mapped meshes");
    const bounds = new THREE.Box3().setFromObject(group);
    return { system, group, meshes, byId, entries, bounds, dispose: () => disposeAnatomyObject(group) };
  } catch (error) { disposeAnatomyObject(group); throw error; }
}

export function matchingAnatomyMeshes(layer: LoadedAnatomyLayer, id?: string) {
  if (!id) return [];
  const direct = layer.byId.get(id);
  if (direct) return direct;
  return layer.meshes.filter((mesh) => (mesh.userData.legacyIds as readonly string[]).includes(id));
}

export function anatomyMeshBounds(meshes: THREE.Mesh[]) {
  const bounds = new THREE.Box3();
  meshes.forEach((mesh) => { bounds.union(new THREE.Box3().setFromObject(mesh)); });
  return bounds;
}

export type AnatomyLodStatus = { pending: number; loaded: number; errors: number };

/** More samples for any idle view, bounded independently of device DPR. */
export function anatomyInspectionResolution(input: {
  width: number; height: number; devicePixelRatio: number; bodyPixelRatio: number;
  viewHeight: number; bodyHeight: number; moving: boolean; lowPower: boolean;
}) {
  const pixelBudget = input.lowPower ? 1_500_000 : 3_000_000;
  const pixelCap = Math.sqrt(pixelBudget / Math.max(1, input.width * input.height));
  const inspection = input.viewHeight < input.bodyHeight * 0.82;
  const ratio = Math.min(input.devicePixelRatio, input.moving ? input.bodyPixelRatio : 2, pixelCap);
  return { ratio, pixelBudget, mode: input.moving ? "moving" : inspection ? "inspection" : "body" } as const;
}

type DetailCacheEntry = { layer: LoadedAnatomyLayer; base: LoadedAnatomyLayer; originals: THREE.Mesh[]; applied: boolean; touched: number; triangles: number };

/** Swap whole source nodes, preserving each LOD's own quantisation transform. */
export function createAnatomyProgressiveLod(options: {
  manifest: BodyPartsManifest;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  lowPower: boolean;
  getLayers: () => LoadedAnatomyLayer[];
  getSelectedId: () => string | undefined;
  getSectionPlane?: () => AnatomySectionPlane | undefined;
  enabled: () => boolean;
  changed: () => void;
  status: (status: AnatomyLodStatus) => void;
  disposeLayer: (layer: LoadedAnatomyLayer) => void;
}) {
  const cache = new Map<string, DetailCacheEntry>(), pending = new Map<string, AbortController>(), failed = new Set<string>();
  const maxTriangles = options.lowPower ? 1_600_000 : 3_500_000, maxMeshes = options.lowPower ? 14 : 26;
  const maxResidentTriangles = maxTriangles * 1.4, maxResidentMeshes = maxMeshes + 8;
  const concurrency = options.lowPower ? 2 : 3;
  let wanted = new Set<string>(), queue: { entry: BodyPartsEntry; base: LoadedAnatomyLayer }[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined, disposed = false, paused = false, statusKey = "";
  const updateStatus = () => {
    const state = { pending: [...pending.keys()].filter((id) => wanted.has(id)).length + queue.length, loaded: [...cache.values()].filter((item) => item.applied).length, errors: [...failed].filter((id) => wanted.has(id)).length };
    const key = JSON.stringify(state);
    options.canvas.dataset.lodPending = String(state.pending); options.canvas.dataset.lodMeshCount = String(state.loaded);
    options.canvas.dataset.lodTriangles = String([...cache.values()].filter((item) => item.applied).reduce((sum, item) => sum + item.triangles, 0));
    options.canvas.dataset.lodResidentTriangles = String([...cache.values()].reduce((sum, item) => sum + item.triangles, 0));
    options.canvas.dataset.lodErrors = String(state.errors);
    options.canvas.dataset.lodIds = [...cache.entries()].filter(([, item]) => item.applied).map(([id]) => id).sort().join(",");
    const selected = options.getLayers().flatMap((layer) => matchingAnatomyMeshes(layer, options.getSelectedId())).filter((mesh) => mesh.visible);
    options.canvas.dataset.selectedLod = selected.length && selected.every((mesh) => mesh.userData.anatomyLod === "high") ? "high" : "base";
    if (key !== statusKey && !disposed) { statusKey = key; options.status(state); }
  };
  const replace = (layer: LoadedAnatomyLayer, remove: THREE.Mesh[], add: THREE.Mesh[], id: string) => {
    const removed = new Set(remove);
    layer.meshes = layer.meshes.filter((mesh) => !removed.has(mesh)).concat(add); layer.byId.set(id, add);
  };
  const install = (id: string, item: DetailCacheEntry) => {
    if (item.applied) return false;
    item.originals.forEach((mesh) => { mesh.visible = false; });
    item.base.group.add(item.layer.group); item.layer.group.visible = true; item.layer.group.updateMatrixWorld(true);
    replace(item.base, item.originals, item.layer.meshes, id); item.applied = true; item.touched = performance.now(); return true;
  };
  const restore = (id: string, item: DetailCacheEntry) => {
    if (!item.applied) return false;
    item.layer.group.removeFromParent(); replace(item.base, item.layer.meshes, item.originals, id); item.applied = false; return true;
  };
  const prune = () => {
    let triangles = [...cache.values()].reduce((sum, item) => sum + item.triangles, 0);
    const inactive = [...cache.entries()].filter(([id, item]) => !item.applied && !wanted.has(id)).sort((a, b) => a[1].touched - b[1].touched);
    for (const [id, item] of inactive) {
      if (cache.size <= maxResidentMeshes && triangles <= maxResidentTriangles) break;
      cache.delete(id); triangles -= item.triangles; options.disposeLayer(item.layer);
    }
  };
  const pump = () => {
    if (disposed || paused) return;
    while (queue.length && pending.size < concurrency) {
      const next = queue.shift()!;
      if (!wanted.has(next.entry.id) || cache.has(next.entry.id) || pending.has(next.entry.id) || failed.has(next.entry.id)) continue;
      const { entry, base } = next, controller = new AbortController(); pending.set(entry.id, controller);
      const source: BodyPartsManifest = { ...options.manifest, meshes: [entry], systems: [{ id: entry.system, url: entry.lod!.url, files: entry.lod!.files, bytes: entry.lod!.bytes }] };
      void loadAnatomyLayer(source, entry.system, controller.signal, () => {}).then((layer) => {
        if (disposed || controller.signal.aborted) { options.disposeLayer(layer); return; }
        layer.meshes.forEach((mesh) => { mesh.userData.anatomyLod = "high"; });
        const item: DetailCacheEntry = { layer, base, originals: base.byId.get(entry.id) ?? [], applied: false, touched: performance.now(), triangles: entry.lod!.triangles };
        cache.set(entry.id, item);
        if (wanted.has(entry.id) && options.enabled() && !paused && options.getLayers().includes(base)) { install(entry.id, item); options.changed(); }
        prune();
      }).catch(() => { if (!disposed && !controller.signal.aborted) failed.add(entry.id); }).finally(() => {
        if (pending.get(entry.id) === controller) pending.delete(entry.id);
        if (!disposed) { pump(); updateStatus(); }
      });
    }
    updateStatus();
  };
  const refresh = () => {
    timer = undefined;
    if (disposed || paused) return;
    const candidates: { entry: BodyPartsEntry; base: LoadedAnatomyLayer; score: number; chosen: boolean }[] = [];
    const sectionPlane = options.getSectionPlane?.();
    let sectionSkipped = 0;
    if (options.enabled()) {
      options.camera.updateMatrixWorld();
      const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(options.camera.projectionMatrix, options.camera.matrixWorldInverse));
      const width = options.canvas.clientWidth || 380, height = options.canvas.clientHeight || 580;
      for (const base of options.getLayers()) {
        const selected = new Set(matchingAnatomyMeshes(base, options.getSelectedId()).map((mesh) => mesh.userData.structureId as string));
        for (const [id, meshes] of base.byId) {
          const entry = base.entries.get(id);
          if (!entry?.lod || !meshes.some((mesh) => mesh.visible)) continue;
          const bounds = entry.bounds ? new THREE.Box3(new THREE.Vector3(...entry.bounds.min as [number, number, number]), new THREE.Vector3(...entry.bounds.max as [number, number, number])) : anatomyMeshBounds(meshes);
          if (!anatomySectionIntersectsBounds(sectionPlane, { min: bounds.min.toArray(), max: bounds.max.toArray() })) { sectionSkipped++; continue; }
          const chosen = selected.has(id);
          if (!chosen && !frustum.intersectsBox(bounds)) continue;
          const center = bounds.getCenter(new THREE.Vector3()).project(options.camera);
          if (!chosen && (center.z > 1 || center.z < -1)) continue;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let corner = 0; corner < 8; corner++) {
            const point = new THREE.Vector3(corner & 1 ? bounds.max.x : bounds.min.x, corner & 2 ? bounds.max.y : bounds.min.y, corner & 4 ? bounds.max.z : bounds.min.z).project(options.camera);
            minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x); minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
          }
          const pixels = Math.max(Math.min(2.5, maxX - minX) * width / 2, Math.min(2.5, maxY - minY) * height / 2);
          if (!chosen && pixels < (options.lowPower ? 105 : 95)) continue;
          const centrality = 1 / (1 + Math.hypot(center.x, center.y));
          candidates.push({ entry, base, chosen, score: (chosen ? 1_000_000 : 0) + pixels * centrality });
        }
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    options.canvas.dataset.lodSectionSkipped = String(sectionSkipped);
    let triangles = 0;
    const desired: typeof candidates = [];
    for (const item of candidates) {
      const count = item.entry.lod!.triangles;
      // Explicit study selections take priority, including a large composite
      // landmark. The normal budget limits its surrounding context, not the
      // anatomy the learner specifically asked to inspect.
      if (!item.chosen && (desired.length >= maxMeshes || triangles + count > maxTriangles)) continue;
      desired.push(item); triangles += count;
    }
    wanted = new Set(desired.map((item) => item.entry.id));
    pending.forEach((controller, id) => {
      if (!wanted.has(id)) { controller.abort(); pending.delete(id); }
    });
    let changed = false;
    cache.forEach((item, id) => {
      if (!wanted.has(id) || !options.getLayers().includes(item.base)) changed = restore(id, item) || changed;
      else { item.touched = performance.now(); changed = install(id, item) || changed; }
    });
    queue = desired.filter((item) => !cache.has(item.entry.id) && !pending.has(item.entry.id) && !failed.has(item.entry.id));
    if (changed) options.changed();
    prune(); pump(); updateStatus();
  };
  return {
    schedule() { if (disposed) return; if (timer) clearTimeout(timer); timer = setTimeout(refresh, 180); },
    pause() { paused = true; if (timer) clearTimeout(timer); },
    resume() { paused = false; if (timer) clearTimeout(timer); timer = setTimeout(refresh, 100); },
    retry() { failed.clear(); refresh(); },
    dispose() {
      disposed = true; if (timer) clearTimeout(timer); pending.forEach((controller) => controller.abort()); queue = [];
      cache.forEach((item, id) => { restore(id, item); options.disposeLayer(item.layer); }); cache.clear();
    },
  };
}
