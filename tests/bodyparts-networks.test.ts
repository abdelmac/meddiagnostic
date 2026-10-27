import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { MeshoptDecoder } from "meshoptimizer";

type Vec3 = [number, number, number];
type Entry = {
  id: string; fmaId: string; elementId: string; representationId: string;
  name: string; system: string; sourceVersion: string; license?: string;
  vascularKind?: "artery" | "vein" | "other";
  classificationMethod?: string; sourceSha256: string;
  representationGroup?: string; representationDefault?: boolean;
  bounds: { min: Vec3; max: Vec3 }; triangles: number; vertexCount: number;
  sourceTriangles: number; sourceVertexCount: number;
  defaultVisible: boolean; legacyIds: string[];
  lod: { files: string[]; bytes: number; triangles: number; vertexCount: number };
  quantization: { translation: Vec3; uniformScale: number; positionErrorMetres: number; normalErrorDegrees: number };
};
type Manifest = {
  status: string; datasetId: string; sourceVersion: string; license: string;
  licenseUrl: string; meshes: Entry[]; legacyMapping: Record<string, string[]>;
  files: { url: string; bytes: number; sha256: string }[];
  systems: { id: string; files: string[]; bytes: number; meshCount: number; triangles: number; highTriangles: number }[];
  normalization: { scale: number; translation: Vec3 };
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
const manifest: Manifest = JSON.parse(fs.readFileSync("src/data/bodyparts3d-manifest.json", "utf8"));
const output = path.resolve("public/anatomy/bodyparts3d/v43");
const sourceCache = path.resolve(".local/bodyparts3d-highres");
const sha = (value: Uint8Array) => crypto.createHash("sha256").update(value).digest("hex");
const byId = new Map(manifest.meshes.map(entry => [entry.id, entry]));
const byElement = new Map(manifest.meshes.map(entry => [entry.elementId, entry]));

function relationSets() {
  const file = path.join(sourceCache, "FMA2Obj.txt");
  if (!fs.existsSync(file)) return undefined;
  const text = fs.readFileSync(file, "utf8");
  assert.match(text, /# Data Version\t4\.3/);
  assert.match(text, /# Objects set\t4\.3/);
  const sets = new Map<string, Set<string>>();
  for (const line of text.split(/\r\n|\r|\n/)) {
    if (!line || line.startsWith("#")) continue;
    const [id, mode, components] = line.split("\t");
    assert.match(id!, /^FMA\d+$/);
    assert.ok(mode === "is_a" || mode === "part_of");
    if (!sets.has(id!)) sets.set(id!, new Set());
    for (const element of components!.split("+")) sets.get(id!)!.add(element);
  }
  return sets;
}

test("le nouvel atlas contient tout le corpus 4.3 épinglé et garde les autres références séparées", () => {
  assert.equal(manifest.status, "ready");
  assert.equal(manifest.datasetId, "bodyparts3d-4.3");
  assert.equal(manifest.sourceVersion, "4.3");
  assert.equal(manifest.license, "CC-BY-SA-2.1-JP");
  assert.equal(manifest.licenseUrl, "https://creativecommons.org/licenses/by-sa/2.1/jp/");
  assert.equal(manifest.meshes.length, 3210);
  assert.equal(byId.size, 3210);
  assert.equal(byElement.size, 3210, "chaque fichier FJ doit apparaître une seule fois dans le catalogue");
  assert.deepEqual(JSON.parse(fs.readFileSync("public/anatomy/bodyparts3d/manifest.json", "utf8")), manifest);
  for (const entry of manifest.meshes) {
    assert.equal(entry.id, `${entry.fmaId}_${entry.elementId}`);
    assert.match(entry.elementId, /^FJ\d+M?$/);
    assert.match(entry.fmaId, /^FMA\d+$/);
    assert.match(entry.representationId, /^BP\d+$/);
    assert.equal(entry.sourceVersion, "4.3");
    if (entry.license) assert.equal(entry.license, manifest.license);
    assert.match(entry.sourceSha256, /^[a-f0-9]{64}$/);
    assert.ok(entry.name && entry.sourceTriangles > 0 && entry.sourceVertexCount > 0);
    assert.equal(entry.lod.triangles, entry.sourceTriangles, `${entry.id}: le détail ne doit ni perdre ni créer de triangle source`);
    assert.equal(entry.lod.vertexCount, entry.sourceVertexCount);
    assert.ok(entry.triangles > 0 && entry.triangles <= entry.sourceTriangles);
    assert.ok(entry.lod.files.length > 0);
    assert.ok(entry.quantization.positionErrorMetres <= 0.00002);
    assert.ok(entry.quantization.normalErrorDegrees < 1);
  }
  assert.equal(manifest.meshes.reduce((sum, entry) => sum + entry.sourceTriangles, 0), 8_647_172);
  assert.equal(manifest.meshes.reduce((sum, entry) => sum + entry.sourceVertexCount, 0), 5_443_380);
  for (const system of manifest.systems) {
    const members = manifest.meshes.filter(entry => entry.system === system.id);
    assert.equal(system.meshCount, members.length);
    assert.equal(system.triangles, members.reduce((sum, entry) => sum + entry.triangles, 0));
    assert.equal(system.highTriangles, members.reduce((sum, entry) => sum + entry.lod.triangles, 0));
    assert.equal(system.bytes, system.files.reduce((sum, url) => sum + fs.statSync(assetPath(url)).size, 0));
  }
  const sets = relationSets();
  if (sets) {
    const officialElements = new Set([...sets.values()].flatMap(values => [...values]));
    assert.deepEqual(new Set(byElement.keys()), officialElements, "aucun maillage d’un autre millésime ne doit être ajouté sous l’étiquette 4.3");
  }
  // The mirror CSV may assign a broad compound FMA. Authored OBJ identity wins.
  assert.equal(byElement.get("FJ3926")!.fmaId, "FMA18157");
  assert.match(byElement.get("FJ3926")!.name, /left vagus nerve/i);
});

test("les artères, veines et vrais nerfs restent dans leur système, y compris les branches hors racines", () => {
  const vessels = manifest.meshes.filter(entry => entry.system === "vessels");
  assert.ok(vessels.length >= 1426);
  assert.ok(vessels.every(entry => entry.vascularKind === "artery" || entry.vascularKind === "vein"));
  const sets = relationSets();
  if (sets) {
    const arteries = sets.get("FMA86187")!, veins = sets.get("FMA86188")!;
    assert.equal(arteries.size, 849); assert.equal(veins.size, 577);
    assert.equal([...arteries].filter(id => veins.has(id)).length, 0);
    assert.deepEqual(new Set([...arteries, ...veins]), sets.get("FMA50722"));
    for (const [kind, members] of [["artery", arteries], ["vein", veins]] as const) for (const id of members) {
      assert.equal(byElement.get(id)!.system, "vessels", id);
      assert.equal(byElement.get(id)!.vascularKind, kind, id);
    }
  }
  for (const id of ["FJ1660", "FJ2227", "FJ2279", "FJ5048"]) {
    assert.equal(byElement.get(id)!.system, "vessels", id);
    assert.equal(byElement.get(id)!.vascularKind, "artery", id);
  }
  for (const id of ["FJ2228", "FJ5008", "FJ5092", "FJ4704"]) {
    assert.equal(byElement.get(id)!.system, "vessels", id);
    assert.equal(byElement.get(id)!.vascularKind, "vein", id);
  }
  for (const id of ["FJ1319", "FJ1370", "FJ3915", "FJ4018", "FJ4224", "FJ4225", "FJ4258", "FJ4425", "FJ4426"]) assert.equal(byElement.get(id)!.system, "nerves", id);
  for (const entry of manifest.meshes) {
    if (/\b(?:nerve|nerves|neural tissue|cauda equina)\b/i.test(entry.name) && entry.system !== "vessels") assert.equal(entry.system, "nerves", `${entry.elementId}: un nerf nommé explicitement ne doit pas rester dans un groupe d’organes composite`);
  }
  for (const legacy of ["median-nerve", "ulnar-nerve", "radial-nerve"]) {
    assert.ok(manifest.legacyMapping[legacy]!.length > 0, `${legacy}: repère réellement présent dans la source`);
    for (const id of manifest.legacyMapping[legacy]!) assert.equal(byId.get(id)!.system, "nerves");
  }
  assert.equal(byElement.get("FJ1858")!.system, "organs", "un segment hépatique n’est pas une veine malgré son nom hepatovenous");
  for (const id of ["FJ2426", "FJ2431", "FJ2435"]) assert.equal(byElement.get(id)!.system, "organs", "une cuspide de valve aortique ne doit pas être classée artère");
  const cord = byElement.get("FJ4426")!;
  assert.equal(cord.fmaId, "FMA242005");
  assert.ok(manifest.legacyMapping["spinal-cord"]!.includes(cord.id));
  assert.ok(!manifest.legacyMapping["spinal-cord"]!.includes(byElement.get("FJ1737")!.id), "le canal central n’est pas le tissu de la moelle");
  for (const absent of ["sciatic-nerve", "femoral-nerve", "tibial-nerve"]) assert.deepEqual(manifest.legacyMapping[absent], [], "les nerfs absents de la source ne peuvent être remplacés par une surface voisine");
});

test("les représentations alternatives des os restent consultables sans superposition par défaut", () => {
  const groups = new Map<string, Entry[]>();
  for (const entry of manifest.meshes) {
    if (!entry.representationGroup) continue;
    const members = groups.get(entry.representationGroup) ?? [];
    members.push(entry); groups.set(entry.representationGroup, members);
  }
  assert.ok(groups.size > 0, "les deux surfaces complètes du fémur ne doivent pas être rendues ensemble");
  for (const members of groups.values()) {
    assert.equal(members.filter(entry => entry.representationDefault).length, 1);
    const first = members[0]!;
    for (const entry of members) {
      assert.equal(entry.system, "skeleton"); assert.equal(entry.fmaId, first.fmaId);
      assert.equal(entry.representationId, first.representationId); assert.equal(entry.name, first.name);
      assert.ok(entry.lod.files.length > 0, "une alternative masquée reste inspectable en haute définition");
    }
  }
  for (const pair of [["FJ3259", "FJ6370"], ["FJ3282", "FJ6392"], ["FJ3284", "FJ6394"]]) {
    const [a, b] = pair.map(id => byElement.get(id)!);
    assert.ok(a!.representationGroup && b!.representationGroup);
    assert.equal(a!.representationGroup, b!.representationGroup);
    assert.equal(Number(a!.representationDefault) + Number(b!.representationDefault), 1);
  }
  const firstSesamoid = byElement.get("FJ1228")!, secondSesamoid = byElement.get("FJ1232")!;
  assert.equal(firstSesamoid.fmaId, secondSesamoid.fmaId);
  assert.equal(firstSesamoid.representationId, secondSesamoid.representationId);
  if (firstSesamoid.representationGroup && secondSesamoid.representationGroup) assert.notEqual(firstSesamoid.representationGroup, secondSesamoid.representationGroup, "deux os sésamoïdes adjacents ne sont pas deux versions du même os");
});

test("tous les GLB 4.3 preview et HIGH se décodent avec positions, normales et topologie valides", async context => {
  await MeshoptDecoder.ready;
  const files = new Map(manifest.files.map(file => [file.url, file]));
  assert.equal(files.size, manifest.files.length);
  const declared = [...manifest.systems.flatMap(system => system.files), ...manifest.meshes.flatMap(entry => entry.lod.files)];
  assert.equal(new Set(declared).size, declared.length);
  assert.deepEqual(new Set(declared), new Set(files.keys()));
  const appearances = new Map<string, { preview: number; high: number }>();
  let totalPreview = 0, totalHigh = 0, maximumBytes = 0;
  for (const [url, expected] of files) {
    const bytes = fs.readFileSync(assetPath(url));
    assert.equal(bytes.length, expected.bytes); assert.equal(sha(bytes), expected.sha256);
    maximumBytes = Math.max(maximumBytes, bytes.length);
    const glb = parseGlb(bytes), high = url.includes("/high/");
    for (const node of glb.json.nodes) {
      const entry = byId.get(node.extras.structureId);
      assert.ok(entry, `${url}: surface non cataloguée`);
      assert.equal(node.name, entry.id); assert.equal(node.extras.sourceVersion, "4.3");
      assert.equal(node.extras.level, high ? "high" : "preview");
      assert.equal(node.extras.defaultVisible, entry.defaultVisible);
      assert.deepEqual(node.translation, entry.quantization.translation);
      assert.deepEqual(node.scale, Array(3).fill(entry.quantization.uniformScale));
      if (high) assert.ok(entry.lod.files.includes(url));
      else assert.ok(manifest.systems.find(system => system.id === entry.system)!.files.includes(url));
      const geometry = surface(glb, node);
      let badPosition = false, badNormal = false, badIndex = false;
      for (let vertex = 0; vertex < geometry.positions.description.count; vertex++) {
        let normalLength = 0;
        for (let axis = 0; axis < 3; axis++) {
          const coordinate = geometry.positions.value(vertex, axis) * node.scale[axis]! + node.translation[axis]!;
          badPosition ||= !Number.isFinite(coordinate) || coordinate < entry.bounds.min[axis]! - 0.00002 || coordinate > entry.bounds.max[axis]! + 0.00002;
          const normal = geometry.normals.value(vertex, axis);
          badNormal ||= !Number.isFinite(normal); normalLength += normal * normal;
        }
        badNormal ||= Math.abs(normalLength - 1) > 0.001;
      }
      for (let index = 0; index < geometry.indices.description.count; index++) badIndex ||= geometry.indices.raw(index) >= geometry.positions.description.count;
      assert.equal(badPosition, false, `${entry.id}: position hors des bornes source`);
      assert.equal(badNormal, false, `${entry.id}: normale absente ou non unitaire`);
      assert.equal(badIndex, false, `${entry.id}: indice hors du maillage`);
      const triangles = geometry.indices.description.count / 3;
      const counts = appearances.get(entry.id) ?? { preview: 0, high: 0 };
      if (high) { counts.high += triangles; totalHigh += triangles; }
      else { counts.preview++; totalPreview += triangles; assert.equal(triangles, entry.triangles); }
      appearances.set(entry.id, counts);
    }
  }
  assert.equal(appearances.size, 3210);
  for (const entry of manifest.meshes) {
    assert.equal(appearances.get(entry.id)!.preview, 1, `${entry.id}: aperçu absent ou dupliqué`);
    assert.equal(appearances.get(entry.id)!.high, entry.lod.triangles, `${entry.id}: détail incomplet`);
  }
  assert.equal(totalHigh, 8_647_172);
  assert.ok(totalPreview < totalHigh);
  context.diagnostic(`${files.size} GLB décodés ; ${totalPreview} triangles preview / ${totalHigh} HIGH ; maximum ${(maximumBytes / 1048576).toFixed(2)} Mio`);
});

function assetPath(url: string) {
  assert.match(url, /^\/anatomy\/bodyparts3d\/v43\/(?:preview|high)\/[A-Za-z0-9_-]+\.glb$/);
  const file = path.resolve("public", url.slice(1));
  assert.ok(!path.relative(output, file).startsWith(".."));
  return file;
}

function parseGlb(bytes: Buffer): Glb {
  assert.ok(bytes.length < 25 * 1024 * 1024);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67); assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length); assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + length).toString("utf8"));
  assert.equal(bytes.readUInt32LE(24 + length), 0x004e4942);
  assert.equal(json.asset.version, "2.0"); assert.match(json.asset.copyright, /Attribution-ShareAlike 2\.1 Japan/);
  return { json, binary: bytes.subarray(28 + length), decoded: new Map() };
}

function accessor(glb: Glb, index: number) {
  const description = glb.json.accessors[index]!;
  assert.ok(description);
  const view = glb.json.bufferViews[description.bufferView]!, compression = view.extensions.EXT_meshopt_compression;
  let bytes = glb.decoded.get(description.bufferView);
  if (!bytes) {
    assert.ok(compression.byteOffset + compression.byteLength <= glb.binary.length);
    bytes = new Uint8Array(compression.count * compression.byteStride);
    MeshoptDecoder.decodeGltfBuffer(bytes, compression.count, compression.byteStride,
      glb.binary.subarray(compression.byteOffset, compression.byteOffset + compression.byteLength), compression.mode, compression.filter);
    assert.equal(bytes.length, view.byteLength); glb.decoded.set(description.bufferView, bytes);
  }
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const stride = view.byteStride ?? compression.byteStride;
  const width = description.componentType === 5125 || description.componentType === 5126 ? 4 : 2;
  function raw(vertex: number, axis = 0) {
    const offset = (description.byteOffset ?? 0) + vertex * stride + axis * width;
    switch (description.componentType) {
      case 5122: return data.getInt16(offset, true);
      case 5123: return data.getUint16(offset, true);
      case 5125: return data.getUint32(offset, true);
      case 5126: return data.getFloat32(offset, true);
      default: throw Error(`Unsupported 4.3 accessor ${description.componentType}`);
    }
  }
  const value = (vertex: number, axis = 0) => description.normalized && description.componentType === 5122 ? Math.max(-1, raw(vertex, axis) / 32767) : raw(vertex, axis);
  return { description, raw, value };
}

function surface(glb: Glb, node: Node) {
  const primitives = glb.json.meshes[node.mesh]!.primitives;
  assert.equal(primitives.length, 1); assert.equal(node.rotation, undefined);
  assert.ok(node.scale.every(scale => scale > 0 && scale === node.scale[0]));
  const primitive = primitives[0]!;
  const positions = accessor(glb, primitive.attributes.POSITION), normals = accessor(glb, primitive.attributes.NORMAL), indices = accessor(glb, primitive.indices);
  assert.equal(positions.description.count, normals.description.count);
  assert.equal(positions.description.type, "VEC3"); assert.ok([5123, 5126].includes(positions.description.componentType));
  assert.equal(normals.description.type, "VEC3"); assert.equal(normals.description.componentType, 5122); assert.equal(normals.description.normalized, true);
  assert.equal(indices.description.type, "SCALAR"); assert.ok([5123, 5125].includes(indices.description.componentType)); assert.equal(indices.description.count % 3, 0);
  const world = (vertex: number) => [0, 1, 2].map(axis => positions.value(vertex, axis) * node.scale[axis]! + node.translation[axis]!);
  const worldNormal = (vertex: number) => {
    const vector = [0, 1, 2].map(axis => normals.value(vertex, axis) / node.scale[axis]!);
    const length = Math.hypot(...vector); return vector.map(value => value / length);
  };
  const key = (vertex: number) => [0, 1, 2].map(axis => positions.raw(vertex, axis)).join(",") + "|" + [0, 1, 2].map(axis => normals.raw(vertex, axis)).join(",");
  return { positions, normals, indices, world, worldNormal, key };
}

function forLines(text: string, visit: (line: string) => void) {
  let start = 0;
  while (start < text.length) {
    const end = text.indexOf("\n", start); visit(text.slice(start, end < 0 ? text.length : end).trimEnd());
    if (end < 0) break; start = end + 1;
  }
}
const orientedTriangle = (a: number, b: number, c: number) => [`${a},${b},${c}`, `${b},${c},${a}`, `${c},${a},${b}`].sort()[0]!;

test("neuf détails nerveux, vasculaires et osseux conservent les triangles et normales OBJ authentiques", async context => {
  await MeshoptDecoder.ready;
  const representatives = ["FJ3926", "FJ1319", "FJ4426", "FJ2227", "FJ2103", "FJ5008", "FJ1228", "FJ1245", "FJ3259"];
  let compared = 0, maximumPositionError = 0, maximumNormalError = 0;
  for (const element of representatives) {
    const entry = byElement.get(element)!; assert.ok(entry, element);
    const file = path.join(sourceCache, "objs", `${element}.obj`);
    if (!fs.existsSync(file)) continue;
    const bytes = fs.readFileSync(file); assert.equal(sha(bytes), entry.sourceSha256);
    const text = bytes.toString("utf8"), header = text.slice(0, 2000);
    assert.ok(header.includes("Compatibility version : 4.3"));
    assert.ok(header.includes(`File ID : ${entry.elementId}`));
    assert.ok(header.includes(`Representation ID : ${entry.representationId}`));
    assert.ok(header.includes(`Concept ID : ${entry.fmaId}`));
    const highParts = entry.lod.files.map(url => parseGlb(fs.readFileSync(assetPath(url)))), first = highParts[0]!.json.nodes[0]!;
    const quantized = first.scale[0] !== 1, sourceValues: number[][] = [], sourceNormals: number[][] = [];
    forLines(text, line => {
      if (line.startsWith("v ")) {
        const [x, y, z] = line.trim().split(/\s+/).slice(1, 4).map(Number);
        sourceValues.push([x!, z!, -y!].map((value, axis) => value * manifest.normalization.scale + manifest.normalization.translation[axis]!));
      } else if (line.startsWith("vn ")) {
        const [x, y, z] = line.trim().split(/\s+/).slice(1, 4).map(Number), length = Math.hypot(x!, y!, z!);
        sourceNormals.push([x! / length, z! / length, -y! / length]);
      }
    });
    assert.equal(sourceValues.length, entry.sourceVertexCount); assert.equal(sourceNormals.length, sourceValues.length);
    const attributes = new Map<string, { id: number; vertex: number }>(), sourceVertexIds = new Uint32Array(sourceValues.length);
    for (let vertex = 0; vertex < sourceValues.length; vertex++) {
      const positions = sourceValues[vertex]!.map((value, axis) => quantized ? Math.round((Math.fround(value) - first.translation[axis]!) / first.scale[axis]!) : Math.fround(value));
      const normals = sourceNormals[vertex]!.map(value => Math.round(Math.max(-1, Math.min(1, Math.fround(value))) * 32767));
      const key = positions.join(",") + "|" + normals.join(",");
      if (!attributes.has(key)) attributes.set(key, { id: attributes.size, vertex });
      sourceVertexIds[vertex] = attributes.get(key)!.id;
    }
    const triangles = new Map<string, number>(); let sourceTriangles = 0;
    forLines(text, line => {
      if (!line.startsWith("f ")) return;
      const face = line.trim().split(/\s+/).slice(1).map(token => sourceVertexIds[Number(token.split("/")[0]) - 1]!);
      for (let corner = 1; corner + 1 < face.length; corner++) {
        const key = orientedTriangle(face[0]!, face[corner]!, face[corner + 1]!); triangles.set(key, (triangles.get(key) ?? 0) + 1); sourceTriangles++;
      }
    });
    let decodedTriangles = 0;
    for (const glb of highParts) for (const node of glb.json.nodes) {
      assert.equal(node.extras.structureId, entry.id); assert.equal(node.extras.sourceVersion, "4.3"); assert.equal(node.extras.level, "high");
      assert.deepEqual(node.scale, first.scale); assert.deepEqual(node.translation, first.translation);
      const geometry = surface(glb, node), remap = new Uint32Array(geometry.positions.description.count);
      for (let vertex = 0; vertex < remap.length; vertex++) {
        const source = attributes.get(geometry.key(vertex)); assert.ok(source, `${entry.id}: attribut étranger à la source`); remap[vertex] = source.id;
        const expectedPosition = sourceValues[source.vertex]!, actualPosition = geometry.world(vertex);
        const positionError = Math.hypot(...actualPosition.map((value, axis) => value - expectedPosition[axis]!)); maximumPositionError = Math.max(maximumPositionError, positionError);
        assert.ok(positionError <= 0.00002, `${entry.id}: position source modifiée`);
        const actualNormal = geometry.worldNormal(vertex), expectedNormal = sourceNormals[source.vertex]!;
        const angle = Math.acos(Math.min(1, Math.max(-1, actualNormal.reduce((sum, value, axis) => sum + value * expectedNormal[axis]!, 0)))) * 180 / Math.PI;
        maximumNormalError = Math.max(maximumNormalError, angle); assert.ok(angle < 1, `${entry.id}: normale source modifiée`);
      }
      for (let index = 0; index < geometry.indices.description.count; index += 3) {
        const key = orientedTriangle(remap[geometry.indices.raw(index)]!, remap[geometry.indices.raw(index + 1)]!, remap[geometry.indices.raw(index + 2)]!);
        const remaining = triangles.get(key) ?? 0; assert.ok(remaining > 0, `${entry.id}: triangle ajouté, dupliqué ou inversé`); triangles.set(key, remaining - 1); decodedTriangles++;
      }
    }
    assert.equal(decodedTriangles, sourceTriangles); assert.equal(decodedTriangles, entry.sourceTriangles);
    assert.ok([...triangles.values()].every(remaining => remaining === 0), `${entry.id}: triangle source manquant`); compared++;
  }
  if (!compared) context.skip("Cache OBJ absent : comparaison des neuf sources non exécutée");
  else { assert.equal(compared, representatives.length); context.diagnostic(`${compared} sources entièrement comparées ; erreur maximale ${(maximumPositionError * 1000).toFixed(6)} mm / ${maximumNormalError.toFixed(6)} degré`); }
});
