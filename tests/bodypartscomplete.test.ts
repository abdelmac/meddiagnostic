import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { MeshoptDecoder } from "meshoptimizer";

type Vec3 = [number, number, number];
type Entry = {
  id: string; name: string; system: string; sourceVersion: string; sourceSha256: string;
  bounds: { min: Vec3; max: Vec3 }; triangles: number; vertexCount: number; legacyIds: string[]; defaultVisible: boolean;
  lod: { files: string[]; bytes: number; triangles: number; vertexCount: number };
  quantization: { positionBits: number; positionErrorMetres: number; normalErrorDegrees: number; translation: Vec3; uniformScale: number };
  previewErrorMetres: number;
};
type Manifest = {
  status: string; datasetId: string; sourceVersion: string; source: string; license: string;
  licenseUrl: string; meshes: Entry[]; legacyMapping: Record<string, string[]>;
  systems: { id: string; files: string[]; bytes: number; meshCount: number; triangles: number; highTriangles: number }[];
  files: { url: string; bytes: number; sha256: string }[];
  bounds: { min: Vec3; max: Vec3 };
  normalization: { scale: number; translation: Vec3; units: string };
  lodPolicy: { maximumPositionErrorMetres: number; maximumNormalErrorDegrees: number };
};
type Accessor = { bufferView: number; byteOffset?: number; count: number; type: string; componentType: number; normalized?: boolean };
type Node = { name: string; mesh: number; translation: Vec3; scale: Vec3; rotation?: number[]; extras: { structureId: string; sourceVersion: string; level: string; defaultVisible: boolean } };
type Glb = {
  json: {
    asset: { version: string; copyright: string }; nodes: Node[];
    meshes: { primitives: { attributes: { POSITION: number; NORMAL: number }; indices: number }[] }[];
    accessors: Accessor[];
    bufferViews: { byteLength: number; byteStride?: number; extensions: { EXT_meshopt_compression: {
      byteOffset: number; byteLength: number; byteStride: number; count: number; mode: string; filter?: string;
    } } }[];
  };
  binary: Buffer; decoded: Map<number, Uint8Array>;
};
const manifest: Manifest = JSON.parse(fs.readFileSync("src/data/bodyparts3d-complete-manifest.json", "utf8"));
const output = path.resolve("public/anatomy/bodyparts3d-complete");
const sourceCache = path.resolve(".local/bodyparts3d-3.0-95");
const sha = (value: Uint8Array) => crypto.createHash("sha256").update(value).digest("hex");
const byId = new Map(manifest.meshes.map((entry) => [entry.id, entry]));

test("le corps détaillé conserve une source cohérente et annonce honnêtement sa couverture", () => {
  assert.equal(manifest.status, "ready", "une fixture partielle ne constitue pas le corps livré");
  assert.equal(manifest.datasetId, "bodyparts3d-3.0-95");
  assert.equal(manifest.sourceVersion, "3.0");
  assert.equal(manifest.license, "CC-BY-SA-2.1-JP");
  assert.equal(manifest.licenseUrl, "https://creativecommons.org/licenses/by-sa/2.1/jp/");
  assert.equal(manifest.source, "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_95.zip");
  assert.equal(manifest.meshes.length, 934, "la 935e entrée ZIP est un répertoire");
  assert.equal(byId.size, 934);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, "manifest.json"), "utf8")), manifest);
  assert.ok(manifest.bounds?.min.length === 3 && manifest.bounds.max.length === 3, "les régions exigent les bornes globales du corps");
  for (let axis = 0; axis < 3; axis++) {
    const minimum = Math.min(...manifest.meshes.map((entry) => entry.bounds.min[axis]!));
    const maximum = Math.max(...manifest.meshes.map((entry) => entry.bounds.max[axis]!));
    assert.ok(Number.isFinite(manifest.bounds.min[axis]) && Number.isFinite(manifest.bounds.max[axis]));
    assert.ok(Math.abs(manifest.bounds.min[axis]! - minimum) < 1e-6);
    assert.ok(Math.abs(manifest.bounds.max[axis]! - maximum) < 1e-6);
  }
  const expectedSystems = new Map([["muscles", 437], ["skeleton", 251], ["nerves", 99], ["vessels", 56], ["organs", 91]]);
  assert.equal(manifest.systems.length, expectedSystems.size);
  for (const system of manifest.systems) {
    const members = manifest.meshes.filter((entry) => entry.system === system.id);
    assert.equal(members.length, expectedSystems.get(system.id));
    assert.equal(system.meshCount, members.length);
    assert.equal(system.triangles, members.reduce((count, entry) => count + entry.triangles, 0));
    assert.equal(system.highTriangles, members.reduce((count, entry) => count + entry.lod.triangles, 0));
    assert.ok(system.files.length > 0);
  }
  const envelopes = new Set(["FMA7163", "FMA70751", "FMA70754", "FMA71098", "FMA46768"]);
  for (const entry of manifest.meshes) {
    assert.match(entry.id, /^(?:FMA|BP)\d+(?:nsn)?$/);
    assert.ok(entry.name);
    assert.equal(entry.sourceVersion, "3.0");
    assert.equal(entry.defaultVisible, !envelopes.has(entry.id));
    assert.ok(entry.triangles > 0 && entry.lod.triangles >= entry.triangles);
    assert.ok(entry.lod.files.length > 0);
    assert.match(entry.sourceSha256, /^[a-f0-9]{64}$/);
    assert.ok(entry.previewErrorMetres <= 0.0005 + 1e-9);
    assert.ok(entry.quantization.positionErrorMetres <= 0.00002);
    assert.ok(entry.quantization.normalErrorDegrees < 1);
    if (entry.id.endsWith("nsn")) assert.ok(!byId.has(entry.id.slice(0, -3)), "pas de seconde surface entière superposée au même élément nsn");
  }
  assert.equal(manifest.meshes.filter((entry) => entry.id.endsWith("nsn")).length, 10);
  assert.equal(manifest.meshes.filter((entry) => entry.id.startsWith("BP")).length, 9);
  assert.deepEqual(manifest.legacyMapping.diaphragm, ["FMA13295"], "ne pas confondre diaphragme thoracique et pelvien");
  assert.deepEqual(manifest.legacyMapping["rectus-abdominis"]!.slice().sort(), ["FMA13377", "FMA13378"]);
  const absent = ["median-nerve", "ulnar-nerve", "radial-nerve", "sciatic-nerve", "femoral-nerve", "tibial-nerve", "brachial-plexus", "spinal-cord", "femoral-artery"];
  for (const id of absent) assert.deepEqual(manifest.legacyMapping[id], [], `${id}: une structure voisine ne peut remplacer le repère absent`);
  assert.ok(!manifest.meshes.find((entry) => entry.id === "FMA78497")!.legacyIds.includes("spinal-cord"), "le canal central ne représente pas la moelle entière");
  assert.equal(Object.values(manifest.legacyMapping).filter((ids) => ids.length > 0).length, 27);
  for (const [legacy, ids] of Object.entries(manifest.legacyMapping)) for (const id of ids) assert.ok(byId.get(id)?.legacyIds.includes(legacy));
  for (const filename of ["LICENSE.txt", "ATTRIBUTION.txt"]) {
    const notice = fs.readFileSync(path.join(output, filename), "utf8");
    assert.match(notice, /Attribution-ShareAlike 2\.1 Japan/);
    assert.match(notice, /BodyParts3D_3\.0_obj_95\.zip/);
    assert.match(notice, /Preview alone/);
  }
  const sourceNamesFile = path.join(sourceCache, "parts_list_e.txt");
  if (fs.existsSync(sourceNamesFile)) {
    const names = new Map(fs.readFileSync(sourceNamesFile, "utf8").trim().split(/\r?\n/).slice(1).map((line) => line.split("\t") as [string, string]));
    for (const entry of manifest.meshes) assert.equal(entry.name, names.get(entry.id), "le nom reste traçable à la nomenclature du même millésime");
  }
});

test("preview et HIGH se décodent dans le même repère sans surface absente ou fichier non publiable", async (context) => {
  assert.equal(manifest.status, "ready");
  await MeshoptDecoder.ready;
  const files = new Map(manifest.files.map((file) => [file.url, file]));
  assert.equal(files.size, manifest.files.length);
  const declared = [...manifest.systems.flatMap((system) => system.files), ...manifest.meshes.flatMap((entry) => entry.lod.files)];
  assert.equal(new Set(declared).size, declared.length);
  assert.deepEqual(new Set(declared), new Set(files.keys()));
  const appearances = new Map<string, { preview: number; highTriangles: number }>();
  let totalHighTriangles = 0, totalPreviewTriangles = 0, maximumBytes = 0;
  for (const [url, expected] of files) {
    const bytes = fs.readFileSync(assetPath(url));
    maximumBytes = Math.max(maximumBytes, bytes.length);
    assert.equal(bytes.length, expected.bytes);
    assert.equal(sha(bytes), expected.sha256);
    const glb = parseGlb(url);
    for (const node of glb.json.nodes) {
      const entry = byId.get(node.extras.structureId);
      assert.ok(entry);
      assert.equal(node.name, entry.id);
      assert.equal(node.extras.sourceVersion, "3.0");
      assert.equal(node.extras.defaultVisible, entry.defaultVisible);
      assert.deepEqual(node.translation, entry.quantization.translation);
      assert.deepEqual(node.scale, Array(3).fill(entry.quantization.uniformScale));
      const high = url.includes("/high/");
      assert.equal(node.extras.level, high ? "high" : "preview");
      if (high) assert.ok(entry.lod.files.includes(url));
      else assert.ok(manifest.systems.find((system) => system.id === entry.system)!.files.includes(url));
      const geometry = surface(glb, node);
      assert.ok([5123, 5126].includes(geometry.positions.description.componentType));
      assert.equal(geometry.indices.description.type, "SCALAR");
      assert.ok([5123, 5125].includes(geometry.indices.description.componentType));
      assert.equal(geometry.indices.description.count % 3, 0);
      let invalidPosition = false, invalidNormal = false, invalidIndex = false;
      for (let vertex = 0; vertex < geometry.positions.description.count; vertex++) {
        let length = 0;
        for (let axis = 0; axis < 3; axis++) {
          const value = geometry.positions.value(vertex, axis) * node.scale[axis]! + node.translation[axis]!;
          invalidPosition ||= !Number.isFinite(value) || value < entry.bounds.min[axis]! - 0.00002 || value > entry.bounds.max[axis]! + 0.00002;
          const normal = geometry.normals.value(vertex, axis);
          invalidNormal ||= !Number.isFinite(normal); length += normal * normal;
        }
        invalidNormal ||= Math.abs(length - 1) > 0.001;
      }
      for (let index = 0; index < geometry.indices.description.count; index++) invalidIndex ||= geometry.indices.raw(index) >= geometry.positions.description.count;
      assert.equal(invalidPosition, false, `${entry.id}: positions mondiales invalides`);
      assert.equal(invalidNormal, false, `${entry.id}: normales absentes ou non unitaires`);
      assert.equal(invalidIndex, false, `${entry.id}: indices hors de la surface`);
      const counts = appearances.get(entry.id) ?? { preview: 0, highTriangles: 0 };
      const triangles = geometry.indices.description.count / 3;
      if (high) { counts.highTriangles += triangles; totalHighTriangles += triangles; }
      else { counts.preview++; totalPreviewTriangles += triangles; assert.equal(triangles, entry.triangles); }
      appearances.set(entry.id, counts);
    }
  }
  assert.equal(appearances.size, 934);
  for (const entry of manifest.meshes) {
    assert.equal(appearances.get(entry.id)!.preview, 1, `${entry.id}: preview manquante ou dupliquée`);
    assert.equal(appearances.get(entry.id)!.highTriangles, entry.lod.triangles, `${entry.id}: HIGH incomplète`);
  }
  assert.equal(totalHighTriangles, 26_317_506);
  assert.ok(totalPreviewTriangles < totalHighTriangles);
  context.diagnostic(`${files.size} fichiers décodés ; ${totalPreviewTriangles} triangles preview / ${totalHighTriangles} triangles HIGH ; maximum ${(maximumBytes / 1048576).toFixed(2)} MiB`);
});

function assetPath(url: string) {
  assert.match(url, /^\/anatomy\/bodyparts3d-complete\/(preview|high)\/[a-z0-9-]+\.glb$/);
  const file = path.resolve("public", url.slice(1));
  assert.ok(!path.relative(output, file).startsWith(".."));
  return file;
}

function parseGlb(url: string): Glb {
  const bytes = fs.readFileSync(assetPath(url));
  assert.ok(bytes.length < 25 * 1024 * 1024, `${url}: limite de publication`);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + length).toString("utf8"));
  assert.equal(bytes.readUInt32LE(24 + length), 0x004e4942);
  assert.equal(json.asset.version, "2.0");
  assert.match(json.asset.copyright, /Attribution-ShareAlike 2\.1 Japan/);
  return { json, binary: bytes.subarray(28 + length), decoded: new Map() };
}

function accessor(glb: Glb, index: number) {
  const description = glb.json.accessors[index]!;
  assert.ok(description);
  const view = glb.json.bufferViews[description.bufferView]!;
  const compression = view.extensions.EXT_meshopt_compression;
  let bytes = glb.decoded.get(description.bufferView);
  if (!bytes) {
    assert.ok(compression.byteOffset + compression.byteLength <= glb.binary.length);
    bytes = new Uint8Array(compression.count * compression.byteStride);
    MeshoptDecoder.decodeGltfBuffer(bytes, compression.count, compression.byteStride,
      glb.binary.subarray(compression.byteOffset, compression.byteOffset + compression.byteLength), compression.mode, compression.filter);
    assert.equal(bytes.length, view.byteLength);
    glb.decoded.set(description.bufferView, bytes);
  }
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const stride = view.byteStride ?? compression.byteStride;
  const width = description.componentType === 5125 || description.componentType === 5126 ? 4 : 2;
  function raw(vertex: number, axis = 0) {
    const at = (description.byteOffset ?? 0) + vertex * stride + axis * width;
    switch (description.componentType) {
      case 5122: return data.getInt16(at, true);
      case 5123: return data.getUint16(at, true);
      case 5125: return data.getUint32(at, true);
      case 5126: return data.getFloat32(at, true);
      default: throw Error(`Unsupported accessor ${description.componentType}`);
    }
  }
  function value(vertex: number, axis = 0) {
    const number = raw(vertex, axis);
    return description.normalized && description.componentType === 5122 ? Math.max(-1, number / 32767) : number;
  }
  return { description, raw, value };
}

function surface(glb: Glb, node: Node) {
  const primitives = glb.json.meshes[node.mesh]!.primitives;
  assert.equal(primitives.length, 1);
  const primitive = primitives[0]!;
  assert.equal(node.rotation, undefined, "aucun recalage ou changement de pose caché");
  assert.ok(node.scale.every((scale) => scale > 0 && scale === node.scale[0]), "la quantification utilise une échelle uniforme");
  const positions = accessor(glb, primitive.attributes.POSITION), normals = accessor(glb, primitive.attributes.NORMAL), indices = accessor(glb, primitive.indices);
  assert.equal(positions.description.count, normals.description.count);
  assert.equal(positions.description.type, "VEC3");
  assert.equal(normals.description.type, "VEC3");
  assert.equal(normals.description.componentType, 5122);
  assert.equal(normals.description.normalized, true);
  const world = (vertex: number) => [0, 1, 2].map((axis) => positions.value(vertex, axis) * node.scale[axis]! + node.translation[axis]!);
  const worldNormal = (vertex: number) => {
    const vector = [0, 1, 2].map((axis) => normals.value(vertex, axis) / node.scale[axis]!);
    const length = Math.hypot(...vector);
    return vector.map((value) => value / length);
  };
  const key = (vertex: number) => [0, 1, 2].map((axis) => positions.raw(vertex, axis)).join(",") + "|" + [0, 1, 2].map((axis) => normals.raw(vertex, axis)).join(",");
  return { positions, normals, indices, world, worldNormal, key };
}

function forLines(text: string, visit: (line: string) => void) {
  let start = 0;
  while (start < text.length) {
    const end = text.indexOf("\n", start);
    visit(text.slice(start, end < 0 ? text.length : end).trimEnd());
    if (end < 0) break;
    start = end + 1;
  }
}

function orientedTriangle(a: number, b: number, c: number) {
  return [`${a},${b},${c}`, `${b},${c},${a}`, `${c},${a},${b}`].sort()[0]!;
}

test("HIGH conserve la géométrie et les normales sources après quantification et changement d’axes", async (context) => {
  await MeshoptDecoder.ready;
  // These regions exercise both small curved structures and large elements.
  const representatives = new Set(["FMA34682", "FMA13336", "FMA13377", "FMA13378", "FMA38930", "FMA13395", "FMA7197", "FMA50875", "FMA3736"]);
  const entries = manifest.status === "fixture" ? manifest.meshes : manifest.meshes.filter((entry) => representatives.has(entry.id));
  assert.ok(entries.length >= 4);
  let compared = 0, maximumPositionError = 0, maximumNormalError = 0;
  for (const entry of entries) {
    const file = path.join(sourceCache, "objs", `${entry.id}.obj`);
    if (!fs.existsSync(file)) continue;
    const bytes = fs.readFileSync(file);
    assert.equal(sha(bytes), entry.sourceSha256);
    const text = bytes.toString("utf8"), highParts = entry.lod.files.map((url) => parseGlb(url));
    const first = highParts[0]!.json.nodes[0]!;
    const quantized = first.scale[0] !== 1;
    const sourceValues: number[][] = [], sourceNormals: number[][] = [];
    forLines(text, (line) => {
      if (line.startsWith("v ")) {
        const [x, y, z] = line.trim().split(/\s+/).slice(1, 4).map(Number);
        sourceValues.push([x!, z!, -y!].map((value, axis) => value * manifest.normalization.scale + manifest.normalization.translation[axis]!));
      } else if (line.startsWith("vn ")) {
        const [x, y, z] = line.trim().split(/\s+/).slice(1, 4).map(Number), length = Math.hypot(x!, y!, z!);
        sourceNormals.push([x! / length, z! / length, -y! / length]);
      }
    });
    assert.equal(sourceValues.length, entry.lod.vertexCount);
    assert.equal(sourceNormals.length, sourceValues.length);
    const attributes = new Map<string, { id: number; vertex: number }>();
    const sourceVertexIds = new Uint32Array(sourceValues.length);
    for (let vertex = 0; vertex < sourceValues.length; vertex++) {
      const positions = sourceValues[vertex]!.map((value, axis) => quantized ? Math.round((Math.fround(value) - first.translation[axis]!) / first.scale[axis]!) : Math.fround(value));
      const normals = sourceNormals[vertex]!.map((value) => Math.round(Math.max(-1, Math.min(1, Math.fround(value))) * 32767));
      const key = positions.join(",") + "|" + normals.join(",");
      if (!attributes.has(key)) attributes.set(key, { id: attributes.size, vertex });
      sourceVertexIds[vertex] = attributes.get(key)!.id;
    }
    const triangles = new Map<string, number>();
    let sourceTriangles = 0;
    forLines(text, (line) => {
      if (!line.startsWith("f ")) return;
      const face = line.trim().split(/\s+/).slice(1).map((token) => sourceVertexIds[Number(token.split("/")[0]) - 1]!);
      for (let corner = 1; corner + 1 < face.length; corner++) {
        const key = orientedTriangle(face[0]!, face[corner]!, face[corner + 1]!);
        triangles.set(key, (triangles.get(key) ?? 0) + 1); sourceTriangles++;
      }
    });
    let decodedTriangles = 0;
    for (const glb of highParts) for (const node of glb.json.nodes) {
      assert.equal(node.extras.structureId, entry.id);
      assert.equal(node.extras.sourceVersion, "3.0");
      assert.equal(node.extras.level, "high");
      assert.deepEqual(node.scale, first.scale);
      assert.deepEqual(node.translation, first.translation);
      const geometry = surface(glb, node), remap = new Uint32Array(geometry.positions.description.count);
      for (let vertex = 0; vertex < remap.length; vertex++) {
        const source = attributes.get(geometry.key(vertex));
        assert.ok(source, `${entry.id}: attribut absent de la géométrie source`);
        remap[vertex] = source.id;
        const expectedPosition = sourceValues[source.vertex]!, actualPosition = geometry.world(vertex);
        const positionError = Math.hypot(...actualPosition.map((value, axis) => value - expectedPosition[axis]!));
        maximumPositionError = Math.max(maximumPositionError, positionError);
        assert.ok(positionError <= 0.00002, `${entry.id}: erreur de position ${positionError} m`);
        const actualNormal = geometry.worldNormal(vertex), expectedNormal = sourceNormals[source.vertex]!;
        const angle = Math.acos(Math.min(1, Math.max(-1, actualNormal.reduce((sum, value, axis) => sum + value * expectedNormal[axis]!, 0)))) * 180 / Math.PI;
        maximumNormalError = Math.max(maximumNormalError, angle);
        assert.ok(angle < 1, `${entry.id}: normale différente de la normale source`);
      }
      for (let index = 0; index < geometry.indices.description.count; index += 3) {
        const key = orientedTriangle(remap[geometry.indices.raw(index)]!, remap[geometry.indices.raw(index + 1)]!, remap[geometry.indices.raw(index + 2)]!);
        const remaining = triangles.get(key) ?? 0;
        assert.ok(remaining > 0, `${entry.id}: triangle ajouté, dupliqué ou orientation inversée`);
        triangles.set(key, remaining - 1); decodedTriangles++;
      }
    }
    assert.equal(decodedTriangles, sourceTriangles);
    assert.equal(decodedTriangles, entry.lod.triangles);
    assert.ok([...triangles.values()].every((remaining) => remaining === 0), `${entry.id}: triangles sources manquants`);
    compared++;
  }
  if (!compared) context.skip("Cache source absent : comparaison aux OBJ non exécutée");
  else context.diagnostic(`${compared} maillages comparés entièrement ; erreur maximale ${(maximumPositionError * 1000).toFixed(6)} mm et ${maximumNormalError.toFixed(6)} degré`);
});
