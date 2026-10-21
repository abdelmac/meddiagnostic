import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import type { AnatomySystem } from "../data/anatomy-structures";

export type BodyPartsEntry = {
  id: string;
  name: string;
  system: AnatomySystem;
  representationId?: string;
  fmaId?: string;
  elementId?: string;
  legacyIds?: readonly string[];
  bounds?: { min: number[]; max: number[] };
};
export type BodyPartsManifest = {
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

function displayColor(entry: BodyPartsEntry) {
  const name = entry.name.toLowerCase();
  if (entry.system === "skeleton") return /cartilage|disc|meniscus/.test(name) ? "#97aaae" : "#c8bda4";
  if (entry.system === "muscles") return /tendon|fascia|aponeurosis|retinaculum|ligament/.test(name) ? "#bfb5a3" : "#943c40";
  if (entry.system === "nerves") return /brain|cerebr|cerebell|thalam|pons|medulla/.test(name) ? "#bfa6a0" : "#e3ca82";
  if (entry.system === "vessels") return /vein|venous|vena|sinus/.test(name) ? "#607fba" : "#be5055";
  if (/lung|bronch/.test(name)) return "#bf909b";
  if (/liver|hepatic/.test(name)) return "#82474e";
  if (/heart|atrium|ventricle|myocard/.test(name)) return "#aa4854";
  if (/kidney|renal|spleen/.test(name)) return "#984a59";
  if (/stomach|intestin|colon|duoden|esophag|jejun|ileum|cecum/.test(name)) return "#b78685";
  if (/bladder|ureter|uter|ovary|prostate/.test(name)) return "#c3a396";
  if (/brain|cerebr|cerebell|thalam/.test(name)) return "#bfa6a0";
  return "#b19aab";
}

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

async function fetchGLB(url: string, signal: AbortSignal, progress: (loaded: number) => void) {
  const resolved = new URL(url, window.location.origin);
  if (resolved.origin !== window.location.origin || !resolved.pathname.endsWith(".glb")) throw new Error("Invalid anatomy asset");
  const response = await fetch(resolved, { signal, credentials: "same-origin" });
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
      const buffer = await fetchGLB(file, signal, (loaded) => progress(completed + loaded, entry?.bytes ?? 0));
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const gltf = await loader.parseAsync(buffer, new URL(".", new URL(file, window.location.origin)).href);
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
      node.userData.contextEnvelope = entry.fmaId === "FMA7163" || /^skin$/i.test(entry.name);
      node.geometry.computeBoundingBox(); node.geometry.computeBoundingSphere();
      const color = displayColor(entry);
      const style = (original: THREE.Material) => {
        const key = `${original.uuid}:${color}`;
        let material = colored.get(key);
        if (!material) {
          material = original.clone();
          if (material instanceof THREE.MeshStandardMaterial) {
            material.color.set(color);
            material.roughness = system === "skeleton" ? 0.67 : system === "organs" ? 0.44 : 0.53;
            material.metalness = 0; material.envMapIntensity = 0.4;
          }
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
