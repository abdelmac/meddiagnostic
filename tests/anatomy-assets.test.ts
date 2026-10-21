import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { unzipSync } from "fflate";
import { MeshoptDecoder } from "meshoptimizer";
import { anatomyStructures } from "../src/data/anatomy-structures";

type Bounds = { min: number[]; max: number[] };
type MeshEntry = {
  id: string; fmaId: string; elementId: string; name: string; system: string;
  sourceVersion: string; license: string; sourceArchive: string;
  legacyIds: string[]; vertexCount: number; triangles: number; bounds: Bounds;
  defaultVisible?: boolean;
};
type IsolatedDetailEntry = {
  id: string; sourceFmaId: string; url: string; bytes: number; triangles: number;
  vertexCount: number; bounds: Bounds; sourceVersion: string; sourceSha256: string;
  assetSha256: string;
};
type Manifest = {
  status: string; dataset: string; source: string; license: string; attribution: string;
  licenses: { id: string; url: string; attribution: string; files?: string[] }[];
  systems: { id: string; files: string[]; bytes: number; meshCount: number; triangles: number }[];
  meshes: MeshEntry[]; legacyMapping: Record<string, string[]>; bounds: Bounds;
  normalization: { applied: boolean; units: string; up: string; anterior: string; scale: number; translation: number[] };
  isolatedDetails?: { dataset: string; license: string; licenseUrl: string; attribution: string; isolatedOnly: boolean; entries: IsolatedDetailEntry[] };
};
type Gltf = {
  asset: { version: string; copyright: string };
  buffers: { byteLength: number }[];
  nodes: { name: string; mesh: number; extras: { structureId: string; fmaId: string; elementId: string; name: string; system: string; isolatedOnly?: boolean; sourceVersion?: string } }[];
  meshes: { name: string; primitives: { attributes: { POSITION: number; NORMAL: number }; indices: number }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number; type: string; componentType: number; min?: number[]; max?: number[] }[];
  bufferViews: { byteOffset?: number; byteLength: number; byteStride?: number; extensions?: { EXT_meshopt_compression?: { byteOffset: number; byteLength: number; byteStride: number; count: number; mode: string; filter?: string } } }[];
};
type ParsedGlb = { json: Gltf; binary: Buffer };
const root = path.resolve("public/anatomy/bodyparts3d");
const manifest: Manifest = JSON.parse(fs.readFileSync("src/data/bodyparts3d-manifest.json", "utf8"));
const meshById = new Map(manifest.meshes.map((mesh) => [mesh.id, mesh]));
const maximumFileBytes = 25 * 1024 * 1024;
const sha256 = (bytes: Uint8Array) => crypto.createHash("sha256").update(bytes).digest("hex");

function assetPath(url: string) {
  assert.match(url, /^\/anatomy\/bodyparts3d\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.glb$/);
  const result = path.resolve("public", url.slice(1));
  assert.ok(!path.relative(root, result).startsWith("..") && !path.isAbsolute(path.relative(root, result)));
  return result;
}

function publishedAssetFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? publishedAssetFiles(file) : [file];
  });
}

function parseGlb(file: string): ParsedGlb {
  const bytes = fs.readFileSync(file);
  assert.ok(bytes.length < maximumFileBytes, `${path.basename(file)} dépasse la limite d’hébergement`);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, "signature GLB");
  assert.equal(bytes.readUInt32LE(4), 2, "version GLB");
  assert.equal(bytes.readUInt32LE(8), bytes.length, "longueur GLB");
  const jsonLength = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const json: Gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
  const binHeader = 20 + jsonLength;
  assert.equal(bytes.readUInt32LE(binHeader + 4), 0x004e4942);
  const binary = bytes.subarray(binHeader + 8);
  assert.equal(bytes.readUInt32LE(binHeader), binary.length);
  assert.equal(json.asset.version, "2.0");
  assert.equal(json.buffers[0]!.byteLength, binary.length);
  assert.ok(json.meshes.length > 0, `${file}: un GLB vide ne peut pas valider un système`);
  return { json, binary };
}

function accessor(glb: ParsedGlb, accessorIndex: number, decoded: Map<number, Uint8Array>) {
  const description = glb.json.accessors[accessorIndex];
  assert.ok(description);
  const view = glb.json.bufferViews[description.bufferView];
  assert.ok(view);
  let bytes = decoded.get(description.bufferView);
  const compression = view.extensions?.EXT_meshopt_compression;
  if (!bytes) {
    assert.ok(compression, "chaque vue doit être décodable avec le codec réellement livré");
    assert.ok(compression.byteOffset >= 0 && compression.byteOffset + compression.byteLength <= glb.binary.length);
    bytes = new Uint8Array(compression.count * compression.byteStride);
    MeshoptDecoder.decodeGltfBuffer(bytes, compression.count, compression.byteStride,
      glb.binary.subarray(compression.byteOffset, compression.byteOffset + compression.byteLength), compression.mode, compression.filter);
    assert.equal(bytes.byteLength, view.byteLength);
    decoded.set(description.bufferView, bytes);
  }
  return { description, bytes, stride: view.byteStride ?? compression?.byteStride ?? 0 };
}

test("le catalogue décrit des surfaces sources uniques, leurs licences et des fichiers publiables", () => {
  assert.equal(manifest.status, "ready");
  assert.equal(manifest.dataset, manifest.meshes.some((mesh) => mesh.sourceVersion === "4.3")
    ? "BodyParts3D 4.0 + 4.3 peripheral nerves" : "BodyParts3D 4.0");
  assert.equal(manifest.license, "CC-BY-4.0");
  assert.match(manifest.source, /^https:\/\/dbarchive\.biosciencedbc\.jp\//);
  assert.match(manifest.attribution, /Database Center for Life Science/);
  assert.ok(manifest.meshes.length > 1500, "la validation ne doit pas porter sur un catalogue vide ou un mannequin simplifié");
  assert.equal(meshById.size, manifest.meshes.length);
  assert.equal(new Set(manifest.meshes.map((mesh) => mesh.elementId)).size, manifest.meshes.length, "un élément physique FJ ne doit pas être superposé plusieurs fois");
  assert.deepEqual(manifest.systems.map((system) => system.id).sort(), ["muscles", "nerves", "organs", "skeleton", "vessels"]);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8")), manifest);
  const baseFiles = manifest.systems.flatMap((system) => system.files);
  assert.equal(new Set(baseFiles).size, baseFiles.length);
  const publishedFiles = new Set([...baseFiles, ...(manifest.isolatedDetails?.entries.map((entry) => entry.url) ?? [])]);
  for (const system of manifest.systems) {
    const surfaces = manifest.meshes.filter((mesh) => mesh.system === system.id);
    assert.ok(surfaces.length > 0 && system.files.length > 0);
    assert.equal(system.meshCount, surfaces.length);
    assert.equal(system.triangles, surfaces.reduce((count, mesh) => count + mesh.triangles, 0));
    assert.equal(system.bytes, system.files.reduce((count, url) => count + fs.statSync(assetPath(url)).size, 0));
  }
  for (const mesh of manifest.meshes) {
    assert.match(mesh.fmaId, /^FMA\d+$/);
    assert.match(mesh.elementId, /^FJ\d+[A-Z]?$/);
    assert.equal(mesh.id, `${mesh.fmaId}_${mesh.elementId}`);
    assert.ok(mesh.name && mesh.vertexCount > 2 && mesh.triangles > 0);
    assert.ok(["4.0", "4.3"].includes(mesh.sourceVersion));
    assert.equal(mesh.license, mesh.sourceVersion === "4.3" ? "CC-BY-SA-2.1-JP" : "CC-BY-4.0");
    assert.ok(manifest.licenses.some((license) => license.id === mesh.license));
    if (mesh.fmaId === "FMA7163") assert.equal(mesh.defaultVisible, false, "la peau doit rester masquée pour laisser les structures internes cliquables");
  }
  for (const [legacyId, meshIds] of Object.entries(manifest.legacyMapping)) {
    assert.equal(new Set(meshIds).size, meshIds.length);
    for (const id of meshIds) assert.ok(meshById.get(id)?.legacyIds.includes(legacyId));
  }
  assert.deepEqual(Object.keys(manifest.legacyMapping).sort(), anatomyStructures.map((structure) => structure.id).sort(), "les 36 repères de cours conservent leurs identifiants même quand un maillage source manque");
  const attribution = fs.readFileSync(path.join(root, "ATTRIBUTION.txt"), "utf8");
  const licenseNotice = fs.readFileSync(path.join(root, "LICENSE.txt"), "utf8");
  assert.match(licenseNotice, /BASE: BodyParts3D 4\.0/);
  assert.match(licenseNotice, /creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(attribution, /BodyParts3D/);
  assert.match(attribution, /creativecommons\.org\/licenses\/by\/4\.0/);
  if (manifest.meshes.some((mesh) => mesh.sourceVersion === "4.3")) {
    assert.match(licenseNotice, /SUPPLEMENT: BodyParts3D 4\.3/);
    assert.match(licenseNotice, /Supplement file: nerves-peripheral\.glb/);
    assert.match(licenseNotice, /creativecommons\.org\/licenses\/by-sa\/2\.1\/jp/);
    assert.match(attribution, /Attribution-ShareAlike 2\.1 Japan/);
    assert.match(attribution, /nerves-peripheral\.glb/);
    assert.ok(manifest.licenses.find((license) => license.id === "CC-BY-SA-2.1-JP")?.files?.includes("/anatomy/bodyparts3d/nerves-peripheral.glb"));
  }
  for (const location of publishedAssetFiles(root)) {
    const filename = path.relative(root, location).split(path.sep).join("/");
    assert.ok(fs.statSync(location).isFile());
    assert.ok(fs.statSync(location).size < maximumFileBytes, filename);
    assert.match(filename, /\.(glb|json|txt)$/, "les archives OBJ brutes ne doivent pas être publiées");
    if (filename.endsWith(".glb")) assert.ok(publishedFiles.has(`/anatomy/bodyparts3d/${filename}`), `${filename}: fichier orphelin`);
  }
});

test("les GLB décodent toutes les surfaces annoncées, avec positions, normales et triangles valides", async () => {
  await MeshoptDecoder.ready;
  const appearances = new Map<string, number>();
  let triangles = 0;
  for (const system of manifest.systems) for (const url of system.files) {
    const glb = parseGlb(assetPath(url));
    const decoded = new Map<number, Uint8Array>();
    for (const node of glb.json.nodes) {
      const entry = meshById.get(node.extras.structureId);
      assert.ok(entry, `${url}: identifiant de sélection non répertorié`);
      appearances.set(entry.id, (appearances.get(entry.id) ?? 0) + 1);
      assert.equal(node.name, entry.id);
      assert.equal(node.extras.fmaId, entry.fmaId);
      assert.equal(node.extras.elementId, entry.elementId);
      assert.equal(node.extras.name, entry.name);
      assert.equal(node.extras.system, system.id);
      assert.equal(entry.system, system.id);
      if (entry.sourceVersion === "4.3") {
        assert.equal(url, "/anatomy/bodyparts3d/nerves-peripheral.glb");
        assert.match(glb.json.asset.copyright, /ShareAlike/);
      } else {
        assert.notEqual(url, "/anatomy/bodyparts3d/nerves-peripheral.glb");
        assert.match(glb.json.asset.copyright, /CC Attribution 4\.0/);
      }
      const mesh = glb.json.meshes[node.mesh]!;
      assert.equal(mesh.name, entry.id);
      assert.equal(mesh.primitives.length, 1);
      const primitive = mesh.primitives[0]!;
      const positions = accessor(glb, primitive.attributes.POSITION, decoded);
      const normals = accessor(glb, primitive.attributes.NORMAL, decoded);
      const indices = accessor(glb, primitive.indices, decoded);
      assert.equal(positions.description.componentType, 5126);
      assert.equal(positions.description.type, "VEC3");
      assert.equal(positions.description.count, entry.vertexCount);
      assert.equal(normals.description.count, entry.vertexCount);
      assert.equal(normals.description.componentType, 5126);
      assert.equal(normals.description.type, "VEC3");
      assert.deepEqual(positions.description.min, entry.bounds.min);
      assert.deepEqual(positions.description.max, entry.bounds.max);
      const positionView = new DataView(positions.bytes.buffer, positions.bytes.byteOffset);
      const normalView = new DataView(normals.bytes.buffer, normals.bytes.byteOffset);
      let nonzeroNormals = 0;
      for (let vertex = 0; vertex < entry.vertexCount; vertex++) {
        const normal: number[] = [];
        for (let axis = 0; axis < 3; axis++) {
          const coordinate = positionView.getFloat32((positions.description.byteOffset ?? 0) + vertex * positions.stride + axis * 4, true);
          assert.ok(Number.isFinite(coordinate));
          assert.ok(coordinate >= entry.bounds.min[axis]! - 1e-6 && coordinate <= entry.bounds.max[axis]! + 1e-6, entry.id);
          const component = normalView.getFloat32((normals.description.byteOffset ?? 0) + vertex * normals.stride + axis * 4, true);
          assert.ok(Number.isFinite(component));
          normal.push(component);
        }
        const length = Math.hypot(...normal);
        if (length > 0.01) { nonzeroNormals++; assert.ok(Math.abs(length - 1) < 0.002, `${entry.id}: normale non unitaire`); }
      }
      assert.ok(nonzeroNormals > entry.vertexCount * 0.9, `${entry.id}: normales absentes sur la surface`);
      assert.equal(indices.description.type, "SCALAR");
      assert.ok([5123, 5125].includes(indices.description.componentType));
      assert.equal(indices.description.count, entry.triangles * 3);
      const indexView = new DataView(indices.bytes.buffer, indices.bytes.byteOffset);
      for (let index = 0; index < indices.description.count; index++) {
        const at = (indices.description.byteOffset ?? 0) + index * indices.stride;
        const vertex = indices.description.componentType === 5123 ? indexView.getUint16(at, true) : indexView.getUint32(at, true);
        assert.ok(vertex < entry.vertexCount, `${entry.id}: triangle hors de la géométrie`);
      }
      triangles += entry.triangles;
    }
  }
  assert.equal(appearances.size, manifest.meshes.length);
  for (const entry of manifest.meshes) assert.equal(appearances.get(entry.id), 1, `${entry.id}: surface manquante ou dupliquée`);
  assert.equal(triangles, manifest.systems.reduce((count, system) => count + system.triangles, 0));
  assert.ok(triangles > 1_000_000, "les surfaces détaillées ne doivent pas être remplacées par quelques volumes primitifs");
  assert.equal(manifest.normalization.units, "metres");
  assert.equal(manifest.normalization.up, "+Y");
  assert.equal(manifest.normalization.anterior, "+Z");
  assert.ok(manifest.bounds.max[1]! - manifest.bounds.min[1]! > 1.4 && manifest.bounds.max[1]! - manifest.bounds.min[1]! < 2.5);
});

test("des surfaces décodées correspondent aux OBJ sources mis en cache, sans géométrie substituée", async (context) => {
  const provenance: { sources: { url?: string; sha256?: string; bytes?: number; files?: { elementId: string; url: string; bytes: number; sha256: string }[] }[] } = JSON.parse(fs.readFileSync(path.join(root, "provenance.json"), "utf8"));
  assert.ok(provenance.sources.some((source) => source.url?.endsWith("isa_BP3D_4.0_obj_99.zip")));
  assert.ok(provenance.sources.some((source) => source.url?.endsWith("partof_BP3D_4.0_obj_99.zip")));
  const samples = ["isa", "partof", "highres-4.3"].map((archive) => manifest.meshes.find((mesh) => mesh.sourceArchive === archive));
  await MeshoptDecoder.ready;
  let verified = 0;
  for (const entry of samples) {
    if (!entry) continue;
    let obj: Uint8Array | undefined;
    if (entry.sourceVersion === "4.0") {
      const filename = `${entry.sourceArchive}_BP3D_4.0_obj_99.zip`;
      const local = path.resolve(".local/bodyparts3d", filename);
      if (!fs.existsSync(local)) { context.diagnostic(`${filename}: cache source absent, contrôle de provenance limité aux fichiers publiés`); continue; }
      const bytes = fs.readFileSync(local);
      const source = provenance.sources.find((candidate) => candidate.url?.endsWith(filename));
      assert.equal(source?.sha256, sha256(bytes));
      assert.equal(source?.bytes, bytes.length);
      const extracted = unzipSync(bytes, { filter: (file) => path.basename(file.name) === `${entry.elementId}.obj` });
      obj = Object.values(extracted)[0];
    } else {
      const metadataFile = path.resolve(".local/bodyparts3d-highres/nerve-metadata.json");
      if (!fs.existsSync(metadataFile)) { context.diagnostic("Supplément : cache source absent, géométrie OBJ non comparée"); continue; }
      const metadata: { meshes: { elementId: string; file: string }[] } = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
      const sourceFile = metadata.meshes.find((mesh) => mesh.elementId === entry.elementId);
      assert.ok(sourceFile);
      obj = fs.readFileSync(path.resolve(".local/bodyparts3d-highres/objs", sourceFile.file));
      const source = provenance.sources.flatMap((candidate) => candidate.files ?? []).find((file) => file.elementId === entry.elementId);
      assert.equal(source?.sha256, sha256(obj));
      assert.equal(source?.bytes, obj.length);
    }
    assert.ok(obj, `${entry.elementId}: OBJ source absent de son archive`);
    const sourcePositions: number[] = []; let sourceTriangles = 0;
    for (const line of Buffer.from(obj).toString("utf8").split(/\r?\n/)) {
      if (line.startsWith("v ")) sourcePositions.push(...line.trim().split(/\s+/).slice(1, 4).map(Number));
      if (line.startsWith("f ")) sourceTriangles += line.trim().split(/\s+/).length - 3;
    }
    assert.equal(sourcePositions.length / 3, entry.vertexCount);
    assert.equal(sourceTriangles, entry.triangles);
    const layer = manifest.systems.find((system) => system.id === entry.system)!;
    let found = false;
    for (const url of layer.files) {
      const glb = parseGlb(assetPath(url));
      const node = glb.json.nodes.find((item) => item.extras.structureId === entry.id);
      if (!node) continue;
      const positions = accessor(glb, glb.json.meshes[node.mesh]!.primitives[0]!.attributes.POSITION, new Map());
      const decoded = new DataView(positions.bytes.buffer, positions.bytes.byteOffset);
      for (const vertex of [0, Math.floor(entry.vertexCount / 2), entry.vertexCount - 1]) {
        const raw = sourcePositions.slice(vertex * 3, vertex * 3 + 3).map(Math.fround);
        const expected = [raw[0]!, raw[2]!, -raw[1]!].map((value, axis) => Math.fround(value * manifest.normalization.scale + manifest.normalization.translation[axis]!));
        for (let axis = 0; axis < 3; axis++) {
          const actual = decoded.getFloat32(vertex * positions.stride + axis * 4, true);
          assert.ok(Math.abs(actual - expected[axis]!) < 1e-6, `${entry.id}: le sommet ne correspond pas à la transformation du modèle source`);
        }
      }
      found = true; verified++; break;
    }
    assert.ok(found);
  }
  if (!verified) context.skip("Aucun cache OBJ local : la comparaison géométrique aux originaux n’a pas été exécutée");
  else context.diagnostic(`${verified} surface(s) comparée(s) aux OBJ originaux disponibles localement`);
});

test("les détails HD sont des surfaces denses distinctes du corps, décodables et correctement attribuées", async () => {
  const details = manifest.isolatedDetails;
  assert.ok(details, "les détails doivent être publiés dans le manifeste avant validation");
  assert.equal(details.isolatedOnly, true);
  assert.equal(details.license, "CC-BY-SA-2.1-JP");
  assert.equal(details.licenseUrl, "https://creativecommons.org/licenses/by-sa/2.1/jp/");
  assert.match(details.dataset, /BodyParts3D 3\.0/);
  assert.match(details.attribution, /Database Center for Life Science/);
  assert.ok(details.entries.length >= 25, "les détails ne se limitent pas à une seule démonstration d’épaule");
  assert.equal(new Set(details.entries.map((entry) => entry.id)).size, details.entries.length);
  assert.equal(new Set(details.entries.map((entry) => entry.url)).size, details.entries.length);
  const ids = new Set(details.entries.map((entry) => entry.id));
  const completeGroups = ["deltoid", "biceps", "triceps", "pectoralis-major", "quadriceps", "diaphragm"];
  for (const group of completeGroups) {
    assert.ok(manifest.legacyMapping[group]!.length > 0);
    assert.ok(manifest.legacyMapping[group]!.every((id) => ids.has(id)), `${group}: tous les composants doivent être disponibles pour le détail du groupe`);
  }
  assert.ok(!manifest.legacyMapping["rectus-abdominis"]!.some((id) => ids.has(id)), "ne pas annoncer un détail absent de cette source");
  const licenseNotice = fs.readFileSync(path.join(root, "details/LICENSE.txt"), "utf8");
  assert.match(licenseNotice, /BodyParts3D 3\.0/);
  assert.match(licenseNotice, /creativecommons\.org\/licenses\/by-sa\/2\.1\/jp/);
  assert.match(licenseNotice, /isolated inspection only/);
  const baseFiles = new Set(manifest.systems.flatMap((system) => system.files));
  await MeshoptDecoder.ready;
  for (const entry of details.entries) {
    const base = meshById.get(entry.id);
    assert.ok(base, "le détail conserve un identifiant sélectionnable existant");
    assert.equal(base.system, "muscles");
    assert.equal(entry.sourceVersion, "3.0");
    assert.match(entry.sourceFmaId, /^FMA\d+$/);
    assert.match(entry.url, /^\/anatomy\/bodyparts3d\/details\//);
    assert.ok(!baseFiles.has(entry.url), "le détail ne doit pas entrer dans les couches du corps");
    const bytes = fs.readFileSync(assetPath(entry.url));
    assert.equal(bytes.length, entry.bytes);
    assert.equal(sha256(bytes), entry.assetSha256);
    assert.match(entry.sourceSha256, /^[a-f0-9]{64}$/);
    assert.ok(entry.triangles > base.triangles, `${entry.id}: le détail doit apporter une surface plus dense`);
    const glb = parseGlb(assetPath(entry.url));
    assert.match(glb.json.asset.copyright, /Attribution-ShareAlike 2\.1 Japan/);
    assert.equal(glb.json.nodes.length, 1, "aucune autre surface du corps ne doit être embarquée dans le détail isolé");
    assert.equal(glb.json.meshes.length, 1);
    const node = glb.json.nodes[0]!;
    assert.equal(node.extras.structureId, entry.id);
    assert.equal(node.extras.fmaId, base.fmaId);
    assert.equal(node.extras.elementId, base.elementId);
    assert.equal(node.extras.isolatedOnly, true);
    assert.equal(node.extras.sourceVersion, "3.0");
    const primitive = glb.json.meshes[node.mesh]!.primitives[0]!;
    const decoded = new Map<number, Uint8Array>();
    const positions = accessor(glb, primitive.attributes.POSITION, decoded);
    const normals = accessor(glb, primitive.attributes.NORMAL, decoded);
    const indices = accessor(glb, primitive.indices, decoded);
    assert.equal(positions.description.count, entry.vertexCount);
    assert.equal(normals.description.count, entry.vertexCount);
    assert.equal(positions.description.componentType, 5126);
    assert.equal(normals.description.componentType, 5126);
    assert.equal(positions.description.type, "VEC3");
    assert.equal(normals.description.type, "VEC3");
    assert.deepEqual(positions.description.min, entry.bounds.min);
    assert.deepEqual(positions.description.max, entry.bounds.max);
    const positionView = new DataView(positions.bytes.buffer, positions.bytes.byteOffset);
    const normalView = new DataView(normals.bytes.buffer, normals.bytes.byteOffset);
    for (let vertex = 0; vertex < entry.vertexCount; vertex++) {
      const normal: number[] = [];
      for (let axis = 0; axis < 3; axis++) {
        const value = positionView.getFloat32((positions.description.byteOffset ?? 0) + vertex * positions.stride + axis * 4, true);
        assert.ok(Number.isFinite(value));
        assert.ok(value >= entry.bounds.min[axis]! - 1e-6 && value <= entry.bounds.max[axis]! + 1e-6, entry.id);
        const component = normalView.getFloat32((normals.description.byteOffset ?? 0) + vertex * normals.stride + axis * 4, true);
        assert.ok(Number.isFinite(component)); normal.push(component);
      }
      assert.ok(Math.abs(Math.hypot(...normal) - 1) < 0.002, `${entry.id}: normale HD invalide`);
    }
    assert.equal(indices.description.count, entry.triangles * 3);
    assert.equal(indices.description.type, "SCALAR");
    assert.ok([5123, 5125].includes(indices.description.componentType));
    const indexView = new DataView(indices.bytes.buffer, indices.bytes.byteOffset);
    for (let index = 0; index < indices.description.count; index++) {
      const at = (indices.description.byteOffset ?? 0) + index * indices.stride;
      const vertex = indices.description.componentType === 5123 ? indexView.getUint16(at, true) : indexView.getUint32(at, true);
      assert.ok(vertex < entry.vertexCount, `${entry.id}: indice HD hors de la géométrie`);
    }
  }
});

test("les détails HD conservent les positions et normales des OBJ 3.0, sans recalage ni lissage inventé", async (context) => {
  const details = manifest.isolatedDetails;
  assert.ok(details);
  const provenance: {
    isolatedOnly: boolean; license: string; normalization: Manifest["normalization"];
    archive: { url: string }; entries: { id: string; sourceFmaId: string; archiveEntry: string; sourceBytes: number; sha256: string }[];
  } = JSON.parse(fs.readFileSync(path.join(root, "details/provenance.json"), "utf8"));
  assert.equal(provenance.isolatedOnly, true);
  assert.equal(provenance.license, "CC-BY-SA-2.1-JP");
  assert.match(provenance.archive.url, /^https:\/\/dbarchive\.biosciencedbc\.jp\/data\/bodyparts3d\/20110915\/BodyParts3D_3\.0_obj_95\.zip$/);
  assert.deepEqual(provenance.normalization, manifest.normalization);
  assert.equal(provenance.entries.length, details.entries.length);
  await MeshoptDecoder.ready;
  let compared = 0;
  for (const entry of details.entries) {
    const record = provenance.entries.find((source) => source.id === entry.id);
    assert.ok(record);
    assert.equal(record.sourceFmaId, entry.sourceFmaId);
    assert.equal(record.sha256, entry.sourceSha256);
    assert.equal(record.archiveEntry.split(/[\\/]/).at(-1), `${entry.sourceFmaId}.obj`);
    const local = path.resolve(".local/bodyparts3d-3.0-95/objs", `${entry.sourceFmaId}.obj`);
    if (!fs.existsSync(local)) continue;
    const obj = fs.readFileSync(local);
    assert.equal(obj.length, record.sourceBytes);
    assert.equal(sha256(obj), entry.sourceSha256);
    const glb = parseGlb(assetPath(entry.url));
    const primitive = glb.json.meshes[0]!.primitives[0]!;
    const decoded = new Map<number, Uint8Array>();
    const positions = accessor(glb, primitive.attributes.POSITION, decoded);
    const normals = accessor(glb, primitive.attributes.NORMAL, decoded);
    const positionView = new DataView(positions.bytes.buffer, positions.bytes.byteOffset);
    const normalView = new DataView(normals.bytes.buffer, normals.bytes.byteOffset);
    const indices = accessor(glb, primitive.indices, decoded);
    const indexView = new DataView(indices.bytes.buffer, indices.bytes.byteOffset);
    let vertices = 0, normalCount = 0, triangles = 0, indexCount = 0;
    for (const line of obj.toString("utf8").split(/\r?\n/)) {
      if (line.startsWith("v ") || line.startsWith("vn ")) {
        const raw = line.trim().split(/\s+/).slice(1, 4).map(Number);
        const rotated = [raw[0]!, raw[2]!, -raw[1]!];
        if (line.startsWith("v ")) {
          for (let axis = 0; axis < 3; axis++) {
            const expected = Math.fround(rotated[axis]! * manifest.normalization.scale + manifest.normalization.translation[axis]!);
            const actual = positionView.getFloat32(vertices * positions.stride + axis * 4, true);
            assert.ok(Math.abs(actual - expected) < 1e-6, `${entry.id}: sommet HD déplacé par rapport à la source`);
          }
          vertices++;
        } else {
          const length = Math.hypot(...rotated);
          for (let axis = 0; axis < 3; axis++) {
            const actual = normalView.getFloat32(normalCount * normals.stride + axis * 4, true);
            assert.ok(Math.abs(actual - rotated[axis]! / length) < 1e-6, `${entry.id}: normale source non conservée`);
          }
          normalCount++;
        }
      } else if (line.startsWith("f ")) {
        const face = line.trim().split(/\s+/).slice(1).map((token) => Number(token.split("/")[0]) - 1);
        triangles += face.length - 2;
        for (let corner = 1; corner + 1 < face.length; corner++) {
          const expected = [face[0]!, face[corner]!, face[corner + 1]!];
          const actual = [0, 1, 2].map(() => {
            const at = (indices.description.byteOffset ?? 0) + indexCount * indices.stride;
            indexCount++;
            return indices.description.componentType === 5123 ? indexView.getUint16(at, true) : indexView.getUint32(at, true);
          });
          // The TRIANGLES codec may cyclically rotate a triangle's first
          // corner, preserving its vertices and winding without changing it.
          assert.ok([0, 1, 2].some((rotation) => actual.every((vertex, axis) => vertex === expected[(axis + rotation) % 3])),
            `${entry.id}: triangle source ou orientation modifié`);
        }
      }
    }
    assert.equal(vertices, entry.vertexCount);
    assert.equal(normalCount, entry.vertexCount);
    assert.equal(triangles, entry.triangles);
    assert.equal(indexCount, entry.triangles * 3);
    compared++;
  }
  if (!compared) context.skip("Cache des OBJ 3.0 absent : comparaison aux originaux non exécutée");
  else context.diagnostic(`${compared}/${details.entries.length} détails comparés aux positions et normales originales`);
});
