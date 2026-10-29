import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { MeshoptDecoder } from "meshoptimizer";

type Vec3 = [number, number, number];
type Bounds = { min: Vec3; max: Vec3 };
type Entry = {
  id: string; elementId: string; representationId: string; fmaId?: string;
  sourceConceptId: string; sourceVersion: string; name: string; system: string;
  sourceSha256: string; sourceGeometrySha256: string; sourceTriangles: number; sourceVertexCount: number;
  removedDegenerateTriangles: number; renderVertexCount: number;
  bounds: Bounds; triangles: number; defaultVisible: boolean;
  representationGroup?: string; representationDefault?: boolean;
  lod: { files: string[]; triangles: number; vertexCount: number; bytes: number };
  quantization: { translation: Vec3; uniformScale: number; positionErrorMetres: number; normalErrorDegrees: number };
};
type Manifest = {
  status: string; datasetId: string; sourceVersion: string; license: string;
  licenseUrl: string; attribution: string; bounds: Bounds; meshes: Entry[];
  systems: { id: string; files: string[]; meshCount: number; triangles: number; highTriangles: number; bytes: number }[];
  files: { url: string; bytes: number; sha256: string }[];
  normalization: { scale: number; translation: Vec3; sourceBounds: Bounds };
  detailExpansion: { baselineDatasets: string[]; newMeshIds: string[]; newConceptIds: string[]; excludedUnmappedCount: number };
};
type Accessor = { bufferView: number; byteOffset?: number; count: number; type: string; componentType: number; normalized?: boolean };
type Node = { name: string; mesh: number; translation: Vec3; scale: Vec3; rotation?: number[]; extras: { structureId: string; sourceVersion: string; level: string; defaultVisible: boolean } };
type Glb = {
  json: {
    asset: { version: string; copyright: string }; nodes: Node[];
    meshes: { primitives: { attributes: { POSITION: number; NORMAL: number }; indices: number }[] }[];
    accessors: Accessor[];
    bufferViews: { byteLength: number; byteStride?: number; extensions: { EXT_meshopt_compression: { byteOffset: number; byteLength: number; byteStride: number; count: number; mode: string; filter?: string } } }[];
  };
  binary: Buffer; decoded: Map<number, Uint8Array>;
};
const manifest: Manifest = JSON.parse(fs.readFileSync("src/data/bodyparts3d-regional-manifest.json", "utf8"));
const output = path.resolve("public/anatomy/bodyparts3d-regional");
const sourceCache = path.resolve(".local/bodyparts3d-v53-audit");
const byId = new Map(manifest.meshes.map(entry => [entry.id, entry]));
const sha = (value: Uint8Array) => crypto.createHash("sha256").update(value).digest("hex");
const baseConcept = (value: string | undefined) => /^FMA\d+/.exec(value ?? "")?.[0];
const canonicalName = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

test("the importer rejects identity and normal-index changes and keeps one source-wide coordinate transform", async () => {
  const api = await import(pathToFileURL(path.resolve("scripts/import-bodyparts3d-regional.mjs")).href);
  const entry = { elementId: "MM99999", representationId: "BP99999", sourceConceptId: "FMA99999-L", sourceVertexCount: 4, sourceTriangles: 2 };
  const bytes = fixtureObj(), classify = () => ({ system: "skeleton", defaultVisible: true });
  const inspected = api.inspectRegionalObject(bytes, entry, classify);
  assert.equal(inspected.sourceConceptId, "FMA99999-L");
  assert.equal(inspected.fmaId, undefined);
  assert.equal(inspected.id, "FMA99999-L_MM99999");
  const geometry = api.regionalGeometry(bytes, inspected, { scale: 0.001, translation: [0.2, -1, -0.3] });
  assert.deepEqual(Array.from(geometry.position), Array.from(Float32Array.from([0.21, 0, -0.28, 0.23, 0, -0.28, 0.23, 0, -0.26, 0.21, 0, -0.26])));
  assert.deepEqual(Array.from(geometry.indices), [0, 1, 2, 0, 2, 3]);
  assert.deepEqual(Array.from(geometry.normal, (value: number) => value === 0 ? 0 : value), [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
  // A small structure high in the body exposes Float64 -> Float32 rounding:
  // bounds calculated before storage can make a minimum encode as -1 and
  // wrap to 65535 in a Uint16 accessor, visibly moving the vertex.
  const tiny = Buffer.from(bytes.toString()
    .replace("v 10 -20 1000", "v 22.4981 -130.8100 1523.9500")
    .replace("v 30 -20 1000", "v 25.7193 -130.8100 1523.9500")
    .replace("v 30 -40 1000", "v 25.7193 -134.0280 1526.5100")
    .replace("v 10 -40 1000", "v 22.4981 -134.0280 1526.5100"));
  const tinyMesh = api.inspectRegionalObject(tiny, entry, classify);
  const tinyGeometry = api.regionalGeometry(tiny, tinyMesh, { scale: 0.001, translation: [0.000647, 0.0781112, -0.1007677] });
  for (let axis = 0; axis < 3; axis++) {
    const stored = Array.from(tinyGeometry.position).filter((_, index) => index % 3 === axis) as number[];
    assert.equal(tinyGeometry.bounds.min[axis], Math.min(...stored), "encoding bounds must describe the stored Float32 positions");
    assert.equal(tinyGeometry.bounds.max[axis], Math.max(...stored));
  }
  assert.throws(() => api.inspectRegionalObject(Buffer.from(bytes.toString().replace("20181210i412", "4.3")), entry, classify), /identity mismatch/);
  assert.throws(() => api.inspectRegionalObject(Buffer.from(bytes.toString().replace("1//1", "1//2")), entry, classify), /normal indexing/);
  assert.throws(() => api.inspectRegionalObject(bytes, { ...entry, sourceSha256: "0".repeat(64) }, classify), /SHA-256 mismatch/);
});

test("geometry-only identity ignores textual labels and normals but detects changed coordinates and winding", async () => {
  const api = await import(pathToFileURL(path.resolve("scripts/import-bodyparts3d-regional.mjs")).href);
  const inspect = (bytes: Buffer) => api.inspectRegionalObject(bytes, { elementId: "MM99999", representationId: "BP99999", sourceConceptId: "FMA99999-L", sourceVertexCount: 4, sourceTriangles: 2 }, () => ({ system: "skeleton" }));
  const original = fixtureObj(), originalHash = inspect(original).sourceGeometrySha256;
  assert.equal(originalHash, sourceGeometryHash(original.toString()));
  const renamed = Buffer.from(original.toString().replace("Fixture bone", "Different source label").replaceAll("vn 0 0 2", "vn 0 2 0"));
  assert.equal(inspect(renamed).sourceGeometrySha256, originalHash);
  assert.notEqual(inspect(renamed).sourceSha256, inspect(original).sourceSha256);
  assert.notEqual(inspect(Buffer.from(original.toString().replace("v 10 -20 1000", "v 11 -20 1000"))).sourceGeometrySha256, originalHash);
  assert.notEqual(inspect(Buffer.from(original.toString().replace("1//1 2//2 3//3 4//4", "4//4 3//3 2//2 1//1"))).sourceGeometrySha256, originalHash);
});

test("zero-normal repairs preserve valid authored normals and opposite source face orientations", async () => {
  const api = await import(pathToFileURL(path.resolve("scripts/import-bodyparts3d-regional.mjs")).href);
  const bytes = fixtureObj({ zeroFirstNormal: true }), entry = { elementId: "MM99999", representationId: "BP99999", sourceConceptId: "FMA99999-L", sourceVertexCount: 4, sourceTriangles: 2 };
  const inspected = api.inspectRegionalObject(bytes, entry, () => ({ system: "skeleton" }));
  assert.equal(inspected.normalRepairs.corners.length, 2);
  assert.deepEqual(inspected.normalRepairs.zeroNormalVertexIndices, [0]);
  for (const corner of inspected.normalRepairs.corners) {
    assert.equal(corner.sourceVertexIndex, 0);
    assert.equal(corner.sourceVertexNumber, 1);
    assert.deepEqual(corner.normal, [0, 0, -1]);
  }
  const geometry = api.regionalGeometry(bytes, inspected, { scale: 0.001, translation: [0, 0, 0] });
  for (let corner = 0; corner < geometry.indices.length; corner++) {
    const index = geometry.indices[corner] * 3;
    assert.deepEqual(Array.from(geometry.normal.subarray(index, index + 3), (value: number) => value === 0 ? 0 : value), corner % 3 === 0 ? [0, -1, 0] : [0, 1, 0], "valid original directions cannot be silently replaced with surface normals");
  }
  assert.equal(inspected.sourceGeometrySha256, sourceGeometryHash(bytes.toString()));
  assert.equal(geometry.indices.length, 6);
  const collinear = Float32Array.from([0, 0, 0, 1, 0, 0, 2, 0, 0]);
  const degenerate = api.regionalZeroNormalRepairs(collinear, Uint32Array.from([0, 1, 2]), [0]);
  assert.equal(degenerate.corners.length, 0);
  assert.deepEqual(degenerate.removedDegenerateFaces.map((face: { sourceFaceIndex: number }) => face.sourceFaceIndex), [0]);
  const triangle = Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const opposite = api.regionalZeroNormalRepairs(triangle, Uint32Array.from([0, 1, 2, 0, 2, 1]), [0]);
  assert.deepEqual(opposite.corners.map((corner: { normal: number[] }) => corner.normal), [[0, 0, 1], [0, 0, -1]]);
  assert.deepEqual(opposite.removedDegenerateFaces, []);
  assert.deepEqual(api.regionalZeroNormalRepairs(Float32Array.from([...triangle, 5, 5, 5]), Uint32Array.from([0, 1, 2]), [3]).unusedVertexIndices, [3]);
});

test("detail expansion excludes existing concepts, names, object identities and geometry copies", async () => {
  const api = await import(pathToFileURL(path.resolve("scripts/import-bodyparts3d-regional.mjs")).href);
  const candidate = (id: string, concept: string, name: string, number: number, extra = {}) => ({ id, elementId: `MM${number}`, sourceConceptId: concept, name, sourceSha256: number.toString(16).padStart(64, "0"), sourceGeometrySha256: (number + 20).toString(16).padStart(64, "0"), ...extra });
  const baseline = { datasetId: "baseline", meshes: [{ id: "old", elementId: "FJ77", fmaId: "FMA123", name: "Old Body", sourceSha256: "a".repeat(64), sourceGeometrySha256: "b".repeat(64) }] };
  const candidates = [
    candidate("old-concept", "FMA123-R", "Unfamiliar alias", 1),
    candidate("old-object", "FMA456", "Other name", 2, { elementId: "FJ77" }),
    candidate("old-name", "FMA457", "OLD_(BODY)", 3),
    candidate("old-bytes", "FMA458", "Another name", 4, { sourceSha256: "a".repeat(64) }),
    candidate("old-geometry", "FMA459", "Yet another name", 5, { sourceGeometrySha256: "b".repeat(64) }),
    candidate("unverified", "FMA460", "Unverified surface", 6, { sourceSha256: undefined }),
    candidate("kept", "FMA77-L", "New named surface", 7),
    candidate("copied-geometry", "FMA888-R", "Different label same geometry", 8, { sourceGeometrySha256: "1b".padStart(64, "0") }),
    candidate("second-kept", "FMA999", "Independent new surface", 9),
  ];
  const result = api.regionalDetailExpansion(candidates, [baseline], 65);
  assert.deepEqual(result.newMeshIds, ["kept", "second-kept"]);
  assert.deepEqual(result.newConceptIds, ["FMA77", "FMA999"]);
  assert.equal(result.excludedUnmappedCount, 65);
});

function fixtureObj({ zeroFirstNormal = false } = {}) {
  return Buffer.from([
    "# Compatibility version : 20181210i412", "# File ID : MM99999", "# Representation ID : BP99999", "# Concept ID : FMA99999-L", "# English name : Fixture bone", "# Volume(cm3): 1",
    "v 10 -20 1000", "v 30 -20 1000", "v 30 -40 1000", "v 10 -40 1000",
    zeroFirstNormal ? "vn 0 0 0" : "vn 0 0 2", "vn 0 0 2", "vn 0 0 2", "vn 0 0 2", "f 1//1 2//2 3//3 4//4", "",
  ].join("\n"));
}

test("the regional corpus retains its own release, authored identities and mandatory credits", () => {
  assert.equal(manifest.status, "ready");
  assert.equal(manifest.datasetId, "bodyparts3d-2018");
  assert.equal(manifest.sourceVersion, "20181210i412");
  assert.equal(manifest.license, "CC-BY-SA-2.1-JP");
  assert.equal(manifest.licenseUrl, "https://creativecommons.org/licenses/by-sa/2.1/jp/");
  assert.equal(manifest.meshes.length, 4614);
  assert.equal(manifest.meshes.reduce((sum, entry) => sum + entry.sourceTriangles, 0), 17_249_143);
  assert.equal(manifest.meshes.reduce((sum, entry) => sum + entry.removedDegenerateTriangles, 0), 4);
  assert.equal(byId.size, manifest.meshes.length);
  assert.equal(new Set(manifest.meshes.map(entry => entry.elementId)).size, manifest.meshes.length);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, "manifest.json"), "utf8")), manifest);
  for (const entry of manifest.meshes) {
    assert.match(entry.elementId, /^(?:FJ|MM|CX)\d+M?$/);
    assert.match(entry.sourceConceptId, /^FMA\d+(?:-[A-Z]+)?$/);
    assert.equal(entry.id, `${entry.sourceConceptId}_${entry.elementId}`);
    assert.equal(entry.fmaId, /^FMA\d+$/.test(entry.sourceConceptId) ? entry.sourceConceptId : undefined, "authored extensions must not be turned into invented FMA identifiers");
    assert.match(entry.representationId, /^BP\d+$/);
    assert.equal(entry.sourceVersion, manifest.sourceVersion);
    assert.ok(entry.name.trim().length > 0);
    assert.match(entry.sourceSha256, /^[a-f0-9]{64}$/);
    assert.match(entry.sourceGeometrySha256, /^[a-f0-9]{64}$/);
    assert.ok(entry.sourceTriangles > 0 && entry.sourceVertexCount >= 3);
    assert.equal(entry.lod.triangles, entry.sourceTriangles - entry.removedDegenerateTriangles, `${entry.id}: only separately proven zero-area faces may be omitted from rendering`);
    assert.equal(entry.lod.vertexCount, entry.renderVertexCount);
    assert.ok(entry.triangles > 0 && entry.triangles <= entry.sourceTriangles);
    assert.ok(entry.quantization.positionErrorMetres <= 0.00002);
    assert.ok(entry.quantization.normalErrorDegrees < 1);
  }
  assert.ok(manifest.meshes.some(entry => /-[A-Z]+$/.test(entry.sourceConceptId)), "source side/region extensions remain identifiable");
  for (const filename of ["ATTRIBUTION.txt", "LICENSE.txt"]) {
    const notice = fs.readFileSync(path.join(output, filename), "utf8");
    assert.match(notice, /BodyParts3D/);
    assert.match(notice, /Database Center for Life Science/);
    assert.match(notice, /2\.1 Japan/);
    assert.match(notice, /20181210/);
    assert.ok(!notice.includes("/source/ippomed-source-"), "model attribution must not restore the withdrawn application archive");
  }
  const provenanceText = fs.readFileSync(path.join(output, "provenance.json"), "utf8");
  assert.ok(!/cacheFile|C:\\\\project|private-source-backups/.test(provenanceText), "public provenance must not expose private working paths");
  const provenance = JSON.parse(provenanceText) as { exclusions: { elementId: string; reason: string }[] };
  assert.equal(provenance.exclusions.length, 65);
  const included = new Set(manifest.meshes.map(entry => entry.elementId));
  for (const excluded of provenance.exclusions) {
    assert.ok(!included.has(excluded.elementId));
    assert.ok(excluded.reason.trim().length > 0);
  }
});

test("at least one thousand additional details represent new named concepts, not aliases or new object IDs alone", () => {
  const baselineFiles = ["z-anatomy-manifest", "bodyparts3d-manifest", "bodyparts3d-complete-manifest"];
  const baselines = baselineFiles.map(file => JSON.parse(fs.readFileSync(`src/data/${file}.json`, "utf8")) as { datasetId: string; meshes: { id: string; elementId?: string; fmaId?: string; sourceConceptId?: string; name: string; sourceSha256?: string; sourceGeometrySha256?: string; source?: { originalName?: string } }[] });
  assert.deepEqual(new Set(manifest.detailExpansion.baselineDatasets), new Set(baselines.map(baseline => baseline.datasetId)));
  assert.equal(baselines[0]!.datasetId, "z-anatomy-neurovascular");
  assert.equal(baselines[0]!.meshes.length, 3642);
  assert.equal(baselines[1]!.datasetId, "bodyparts3d-4.3");
  assert.equal(baselines[1]!.meshes.length, 3210);
  assert.equal(baselines[2]!.datasetId, "bodyparts3d-3.0-95");
  assert.equal(baselines[2]!.meshes.length, 934);
  const oldConcepts = new Set(baselines.flatMap(baseline => baseline.meshes.map(entry => baseConcept(entry.sourceConceptId ?? entry.fmaId ?? entry.id))).filter(Boolean));
  const oldNames = new Set(baselines.flatMap(baseline => baseline.meshes.flatMap(entry => [entry.name, entry.source?.originalName].filter((name): name is string => !!name).map(canonicalName))));
  const oldHashes = new Set(baselines.flatMap(baseline => baseline.meshes.map(entry => entry.sourceSha256)).filter(Boolean));
  const oldElements = new Set(baselines.flatMap(baseline => baseline.meshes.map(entry => entry.elementId)).filter(Boolean));
  const oldGeometry = new Set(baselines.flatMap(baseline => baseline.meshes.map(entry => entry.sourceGeometrySha256)).filter(Boolean));
  assert.ok(manifest.detailExpansion.newMeshIds.length >= 1000);
  assert.equal(new Set(manifest.detailExpansion.newMeshIds).size, manifest.detailExpansion.newMeshIds.length);
  const verifiedConcepts = new Set<string>();
  const verifiedGeometry = new Set<string>();
  for (const id of manifest.detailExpansion.newMeshIds) {
    const entry = byId.get(id);
    assert.ok(entry, `${id}: a new detail must resolve to a real selectable source surface`);
    const concept = baseConcept(entry.sourceConceptId);
    assert.ok(concept && !oldConcepts.has(concept));
    assert.ok(!oldNames.has(canonicalName(entry.name)), `${id}: an existing name is not an additional concept`);
    assert.ok(!oldHashes.has(entry.sourceSha256));
    assert.ok(!oldElements.has(entry.elementId), `${id}: a reused physical ID cannot inflate the added-detail count`);
    assert.ok(!oldGeometry.has(entry.sourceGeometrySha256));
    assert.ok(!verifiedGeometry.has(entry.sourceGeometrySha256), `${id}: identical source geometry must be counted once`);
    verifiedConcepts.add(concept);
    verifiedGeometry.add(entry.sourceGeometrySha256);
  }
  assert.ok(verifiedConcepts.size >= 1000, "left/right suffixes and alternate surfaces cannot inflate the count of numeric FMA concepts");
  assert.deepEqual(new Set(manifest.detailExpansion.newConceptIds), verifiedConcepts);
  assert.equal(manifest.detailExpansion.excludedUnmappedCount, 65);
});

test("every published preview and HIGH surface decodes with valid coordinates, normals, indices and checksums", async context => {
  await MeshoptDecoder.ready;
  const files = new Map(manifest.files.map(file => [file.url, file]));
  assert.equal(files.size, manifest.files.length);
  const declared = [...manifest.systems.flatMap(system => system.files), ...manifest.meshes.flatMap(entry => entry.lod.files)];
  assert.equal(new Set(declared).size, declared.length);
  assert.deepEqual(new Set(declared), new Set(files.keys()));
  const appearances = new Map<string, { previews: number; highTriangles: number }>();
  let totalHighTriangles = 0;
  for (const [url, expected] of files) {
    const bytes = fs.readFileSync(assetPath(url));
    assert.equal(bytes.length, expected.bytes);
    assert.equal(sha(bytes), expected.sha256);
    const glb = parseGlb(bytes), high = url.includes("/high/");
    for (const node of glb.json.nodes) {
      const entry = byId.get(node.extras.structureId);
      assert.ok(entry);
      assert.equal(node.name, entry.id);
      assert.equal(node.extras.sourceVersion, manifest.sourceVersion);
      assert.equal(node.extras.level, high ? "high" : "preview");
      assert.equal(node.extras.defaultVisible, entry.defaultVisible);
      assert.deepEqual(node.translation, entry.quantization.translation);
      assert.deepEqual(node.scale, Array(3).fill(entry.quantization.uniformScale));
      assert.equal(node.rotation, undefined, "one source-wide axis transform must suffice");
      assert.ok(node.scale[0] > 0);
      if (high) assert.ok(entry.lod.files.includes(url));
      else assert.ok(manifest.systems.find(system => system.id === entry.system)!.files.includes(url));
      const geometry = surface(glb, node);
      let invalidPosition = false, invalidNormal = false, invalidIndex = false;
      for (let vertex = 0; vertex < geometry.positions.description.count; vertex++) {
        let length = 0;
        for (let axis = 0; axis < 3; axis++) {
          const coordinate = geometry.positions.value(vertex, axis) * node.scale[axis]! + node.translation[axis]!;
          invalidPosition ||= !Number.isFinite(coordinate) || coordinate < entry.bounds.min[axis]! - 0.00002 || coordinate > entry.bounds.max[axis]! + 0.00002;
          const normal = geometry.normals.value(vertex, axis);
          invalidNormal ||= !Number.isFinite(normal); length += normal * normal;
        }
        invalidNormal ||= Math.abs(length - 1) > 0.001;
      }
      for (let index = 0; index < geometry.indices.description.count; index++) invalidIndex ||= geometry.indices.raw(index) >= geometry.positions.description.count;
      assert.equal(invalidPosition, false, `${entry.id}: invalid world position`);
      assert.equal(invalidNormal, false, `${entry.id}: missing or non-unit normal`);
      assert.equal(invalidIndex, false, `${entry.id}: index outside the source surface`);
      const counts = appearances.get(entry.id) ?? { previews: 0, highTriangles: 0 }, triangles = geometry.indices.description.count / 3;
      if (high) { counts.highTriangles += triangles; totalHighTriangles += triangles; }
      else { counts.previews++; assert.equal(triangles, entry.triangles); }
      appearances.set(entry.id, counts);
    }
  }
  assert.equal(appearances.size, manifest.meshes.length);
  for (const entry of manifest.meshes) {
    assert.equal(appearances.get(entry.id)!.previews, 1);
    assert.equal(appearances.get(entry.id)!.highTriangles, entry.sourceTriangles - entry.removedDegenerateTriangles);
  }
  for (const system of manifest.systems) {
    const members = manifest.meshes.filter(entry => entry.system === system.id);
    assert.equal(system.meshCount, members.length);
    assert.equal(system.triangles, members.reduce((sum, entry) => sum + entry.triangles, 0));
    assert.equal(system.highTriangles, members.reduce((sum, entry) => sum + entry.lod.triangles, 0));
    assert.equal(system.bytes, system.files.reduce((sum, url) => sum + files.get(url)!.bytes, 0));
  }
  context.diagnostic(`${files.size} GLB files decoded; ${totalHighTriangles} original HIGH triangles`);
});

test("representative HIGH meshes preserve original positions, normals and oriented triangles after the common axis transform", async context => {
  if (!fs.existsSync(path.join(sourceCache, "objs"))) {
    context.skip("Original OBJ cache is absent; published GLBs are checked by the preceding test");
    return;
  }
  await MeshoptDecoder.ready;
  const chosen = new Set(["MM2407", "CX122", "FJ3175"]);
  const extension = manifest.meshes.find(entry => /-[A-Z]+$/.test(entry.sourceConceptId));
  if (extension) chosen.add(extension.elementId);
  const meshes = manifest.meshes.filter(entry => chosen.has(entry.elementId));
  assert.ok(meshes.length >= 3, "the sample must exercise FJ, MM and CX source geometry");
  let maximumPositionError = 0, maximumNormalError = 0;
  for (const entry of meshes) {
    const bytes = fs.readFileSync(path.join(sourceCache, "objs", `${entry.elementId}.obj`));
    assert.equal(sha(bytes), entry.sourceSha256);
    const text = bytes.toString("utf8"), header = text.slice(0, 8192);
    assert.equal(sourceGeometryHash(text), entry.sourceGeometrySha256, "the geometry-only checksum must survive header and normal changes");
    assert.ok(header.includes(`# File ID : ${entry.elementId}`));
    assert.ok(header.includes(`# Concept ID : ${entry.sourceConceptId}`));
    assert.ok(header.includes(`# Compatibility version : ${manifest.sourceVersion}`));
    assert.ok(header.includes(`# English name : ${entry.name}`));
    const high = entry.lod.files.map(url => parseGlb(fs.readFileSync(assetPath(url))));
    const first = high[0]!.json.nodes[0]!, quantized = first.scale[0] !== 1;
    const sourceValues: number[][] = [], sourceNormals: number[][] = [];
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith("v ")) {
        const [x, y, z] = line.trim().split(/\s+/).slice(1, 4).map(Number);
        sourceValues.push([x!, z!, -y!].map((value, axis) => value * manifest.normalization.scale + manifest.normalization.translation[axis]!));
      } else if (line.startsWith("vn ")) {
        const [x, y, z] = line.trim().split(/\s+/).slice(1, 4).map(Number), length = Math.hypot(x!, y!, z!);
        assert.ok(Number.isFinite(length) && length > 0);
        sourceNormals.push([x! / length, z! / length, -y! / length]);
      }
    }
    assert.equal(sourceValues.length, entry.sourceVertexCount);
    assert.equal(sourceNormals.length, sourceValues.length);
    const attributes = new Map<string, { id: number; vertex: number }>(), sourceVertexIds = new Uint32Array(sourceValues.length);
    for (let vertex = 0; vertex < sourceValues.length; vertex++) {
      const positions = sourceValues[vertex]!.map((value, axis) => quantized ? Math.round((Math.fround(value) - first.translation[axis]!) / first.scale[axis]!) : Math.fround(value));
      const normals = sourceNormals[vertex]!.map(value => Math.round(Math.max(-1, Math.min(1, Math.fround(value))) * 32767));
      const key = positions.join(",") + "|" + normals.join(",");
      if (!attributes.has(key)) attributes.set(key, { id: attributes.size, vertex });
      sourceVertexIds[vertex] = attributes.get(key)!.id;
    }
    const triangles = new Map<string, number>();
    let sourceTriangles = 0, decodedTriangles = 0;
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("f ")) continue;
      const face = line.trim().split(/\s+/).slice(1).map(token => sourceVertexIds[Number(token.split("/")[0]) - 1]!);
      for (let corner = 1; corner + 1 < face.length; corner++) {
        const key = orientedTriangle(face[0]!, face[corner]!, face[corner + 1]!);
        triangles.set(key, (triangles.get(key) ?? 0) + 1); sourceTriangles++;
      }
    }
    for (const glb of high) for (const node of glb.json.nodes) {
      assert.equal(node.extras.structureId, entry.id);
      const geometry = surface(glb, node), remap = new Uint32Array(geometry.positions.description.count);
      for (let vertex = 0; vertex < remap.length; vertex++) {
        const original = attributes.get(geometry.key(vertex));
        assert.ok(original, `${entry.id}: a decoded vertex or normal was not present in the source`);
        remap[vertex] = original.id;
        const expectedPosition = sourceValues[original.vertex]!;
        const world = [0, 1, 2].map(axis => geometry.positions.value(vertex, axis) * node.scale[axis]! + node.translation[axis]!);
        const positionError = Math.hypot(...world.map((value, axis) => value - expectedPosition[axis]!));
        maximumPositionError = Math.max(maximumPositionError, positionError);
        assert.ok(positionError <= 0.00002, `${entry.id}: source position changed`);
        const normal = [0, 1, 2].map(axis => geometry.normals.value(vertex, axis)), length = Math.hypot(...normal);
        const angle = Math.acos(Math.min(1, Math.max(-1, normal.reduce((sum, value, axis) => sum + value / length * sourceNormals[original.vertex]![axis]!, 0)))) * 180 / Math.PI;
        maximumNormalError = Math.max(maximumNormalError, angle);
        assert.ok(angle < 1, `${entry.id}: authored normal changed`);
      }
      for (let index = 0; index < geometry.indices.description.count; index += 3) {
        const key = orientedTriangle(remap[geometry.indices.raw(index)]!, remap[geometry.indices.raw(index + 1)]!, remap[geometry.indices.raw(index + 2)]!);
        const remaining = triangles.get(key) ?? 0;
        assert.ok(remaining > 0, `${entry.id}: added, duplicated or reversed triangle`);
        triangles.set(key, remaining - 1); decodedTriangles++;
      }
    }
    assert.equal(decodedTriangles, sourceTriangles);
    assert.equal(decodedTriangles, entry.sourceTriangles);
    assert.ok([...triangles.values()].every(remaining => remaining === 0), `${entry.id}: an authored triangle is missing`);
  }
  context.diagnostic(`${meshes.length} complete source comparisons; max error ${(maximumPositionError * 1000).toFixed(6)} mm / ${maximumNormalError.toFixed(6)} degrees`);
});

test("zero-normal repair provenance proves the four omitted faces and preserves all other source triangles and valid normals", async context => {
  type Repair = {
    zeroNormalVertexIndices: number[];
    corners: { sourceFaceIndex: number; cornerIndex: number; sourceVertexIndex: number; sourceVertexNumber: number; normal: number[] }[];
    removedDegenerateFaces: { sourceFaceIndex: number; sourceVertexIndices: number[]; sourcePositionsMillimetres: number[][]; reason: string }[];
    unusedVertexIndices: number[];
  };
  const provenance = JSON.parse(fs.readFileSync(path.join(output, "provenance.json"), "utf8")) as { meshes: { id: string; elementId: string; normalRepairs?: Repair }[] };
  const repaired = provenance.meshes.filter((entry): entry is typeof entry & { normalRepairs: Repair } => !!entry.normalRepairs);
  assert.equal(repaired.length, 20);
  assert.equal(repaired.reduce((sum, entry) => sum + entry.normalRepairs.zeroNormalVertexIndices.length, 0), 229);
  assert.equal(repaired.reduce((sum, entry) => sum + entry.normalRepairs.corners.length, 0), 450);
  const removed = repaired.flatMap(entry => entry.normalRepairs.removedDegenerateFaces.map(face => `${entry.elementId}:${face.sourceFaceIndex}`)).sort();
  assert.deepEqual(removed, ["MM1112:6903", "MM1112:6979", "MM1206:3290", "MM1206:3292"]);
  if (!fs.existsSync(path.join(sourceCache, "objs"))) {
    context.skip("Original OBJ cache absent; public repair metadata and all rendered normals were checked");
    return;
  }
  await MeshoptDecoder.ready;
  for (const record of repaired) {
    const entry = byId.get(record.id)!;
    const bytes = fs.readFileSync(path.join(sourceCache, "objs", `${record.elementId}.obj`));
    assert.equal(sha(bytes), entry.sourceSha256);
    assert.equal(sourceGeometryHash(bytes.toString()), entry.sourceGeometrySha256);
    const source = readObj(bytes.toString()), repair = record.normalRepairs;
    const zeroIndices = source.normals.flatMap((normal, index) => Math.hypot(...normal) === 0 ? [index] : []);
    assert.deepEqual(repair.zeroNormalVertexIndices, zeroIndices, "a valid authored normal cannot enter the repair list");
    const zero = new Set(zeroIndices), omitted = new Set(repair.removedDegenerateFaces.map(face => face.sourceFaceIndex));
    assert.equal(entry.removedDegenerateTriangles, omitted.size);
    const expectedCorners: string[] = [];
    for (let faceIndex = 0; faceIndex < source.faces.length; faceIndex++) {
      const face = source.faces[faceIndex]!;
      const hasZero = face.some(vertex => zero.has(vertex));
      if (!hasZero) continue;
      const normal = faceNormal(face.map(vertex => source.positions[vertex]!));
      const area = Math.hypot(...normal);
      assert.equal(omitted.has(faceIndex), area === 0, "only an exactly zero-area face incident to a missing normal may be omitted");
      if (area === 0) continue;
      for (let corner = 0; corner < 3; corner++) if (zero.has(face[corner]!)) expectedCorners.push(`${faceIndex}:${corner}`);
    }
    assert.deepEqual(repair.corners.map(corner => `${corner.sourceFaceIndex}:${corner.cornerIndex}`), expectedCorners);
    for (const corner of repair.corners) {
      const face = source.faces[corner.sourceFaceIndex]!;
      assert.equal(corner.sourceVertexIndex, face[corner.cornerIndex]);
      assert.equal(corner.sourceVertexNumber, corner.sourceVertexIndex + 1);
      assert.ok(zero.has(corner.sourceVertexIndex));
      const normal = faceNormal(face.map(vertex => source.positions[vertex]!)), length = Math.hypot(...normal);
      for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(corner.normal[axis]! - normal[axis]! / length) < 1e-12);
    }
    for (const face of repair.removedDegenerateFaces) {
      assert.deepEqual(face.sourceVertexIndices, source.faces[face.sourceFaceIndex]);
      assert.deepEqual(face.sourcePositionsMillimetres, face.sourceVertexIndices.map(index => source.positions[index]));
      assert.equal(Math.hypot(...faceNormal(face.sourcePositionsMillimetres)), 0);
      assert.ok(face.reason.length > 0);
    }
    if (!["MM851", "MM1112", "MM1206"].includes(record.elementId)) continue;
    const high = entry.lod.files.map(url => parseGlb(fs.readFileSync(assetPath(url))));
    const first = high[0]!.json.nodes[0]!, quantized = first.scale[0] !== 1;
    const attributes = (vertex: number, normal: number[]) => {
      const rawPosition = source.positions[vertex]!;
      const world = [rawPosition[0]!, rawPosition[2]!, -rawPosition[1]!].map((value, axis) => Math.fround(value * manifest.normalization.scale + manifest.normalization.translation[axis]!));
      const encoded = world.map((value, axis) => quantized ? Math.round((value - first.translation[axis]!) / first.scale[axis]!) : value);
      const length = Math.hypot(...normal);
      const transformedNormal = [normal[0]!, normal[2]!, -normal[1]!].map(value => Math.round(Math.max(-1, Math.min(1, Math.fround(value / length))) * 32767));
      return encoded.join(",") + "|" + transformedNormal.join(",");
    };
    const expected = new Map<string, number>();
    for (let faceIndex = 0; faceIndex < source.faces.length; faceIndex++) {
      if (omitted.has(faceIndex)) continue;
      const face = source.faces[faceIndex]!, derived = faceNormal(face.map(vertex => source.positions[vertex]!));
      const corners = face.map(vertex => attributes(vertex, zero.has(vertex) ? derived : source.normals[vertex]!));
      const key = orientedAttributes(corners);
      expected.set(key, (expected.get(key) ?? 0) + 1);
    }
    let renderedTriangles = 0;
    for (const glb of high) for (const node of glb.json.nodes) {
      const geometry = surface(glb, node);
      for (let index = 0; index < geometry.indices.description.count; index += 3) {
        const key = orientedAttributes([0, 1, 2].map(corner => geometry.key(geometry.indices.raw(index + corner))));
        const remaining = expected.get(key) ?? 0;
        assert.ok(remaining > 0, `${entry.id}: triangle positions, orientation or valid authored normals changed`);
        expected.set(key, remaining - 1); renderedTriangles++;
      }
    }
    assert.equal(renderedTriangles, source.faces.length - omitted.size);
    assert.ok([...expected.values()].every(remaining => remaining === 0), `${entry.id}: a non-degenerate source triangle is missing`);
  }
});

function readObj(text: string) {
  const positions: number[][] = [], normals: number[][] = [], faces: number[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("v ")) positions.push(line.trim().split(/\s+/).slice(1, 4).map(Number));
    else if (line.startsWith("vn ")) normals.push(line.trim().split(/\s+/).slice(1, 4).map(Number));
    else if (line.startsWith("f ")) {
      const face = line.trim().split(/\s+/).slice(1).map(token => Number(token.split("/")[0]) - 1);
      for (let corner = 1; corner + 1 < face.length; corner++) faces.push([face[0]!, face[corner]!, face[corner + 1]!]);
    }
  }
  return { positions, normals, faces };
}

function faceNormal([a, b, c]: number[][]) {
  const u = b!.map((value, axis) => value - a![axis]!), v = c!.map((value, axis) => value - a![axis]!);
  return [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
}

function orientedAttributes([a, b, c]: string[]) {
  return [`${a};${b};${c}`, `${b};${c};${a}`, `${c};${a};${b}`].sort()[0]!;
}

function orientedTriangle(a: number, b: number, c: number) {
  return [`${a},${b},${c}`, `${b},${c},${a}`, `${c},${a},${b}`].sort()[0]!;
}

function sourceGeometryHash(text: string) {
  const positions: number[] = [], indices: number[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("v ")) positions.push(...line.trim().split(/\s+/).slice(1, 4).map(Number));
    else if (line.startsWith("f ")) {
      const face = line.trim().split(/\s+/).slice(1).map(token => Number(token.split("/")[0]) - 1);
      for (let corner = 1; corner + 1 < face.length; corner++) indices.push(face[0]!, face[corner]!, face[corner + 1]!);
    }
  }
  const vertices = Buffer.alloc(positions.length * 4), faces = Buffer.alloc(indices.length * 4);
  positions.forEach((value, index) => vertices.writeFloatLE(value, index * 4));
  indices.forEach((value, index) => faces.writeUInt32LE(value, index * 4));
  return crypto.createHash("sha256").update(`BodyParts3D-source-geometry-v1\0vertices:${positions.length / 3};triangles:${indices.length / 3}\0`).update(vertices).update(faces).digest("hex");
}

function assetPath(url: string) {
  assert.match(url, /^\/anatomy\/bodyparts3d-regional\/(?:preview|high)\/[a-z0-9_-]+\.glb$/);
  const resolved = path.resolve("public", url.slice(1));
  assert.ok(!path.relative(output, resolved).startsWith(".."));
  return resolved;
}

function parseGlb(bytes: Buffer): Glb {
  assert.ok(bytes.length < 25 * 1024 * 1024);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + length).toString("utf8"));
  assert.equal(bytes.readUInt32LE(24 + length), 0x004e4942);
  assert.equal(json.asset.version, "2.0");
  assert.match(json.asset.copyright, /Database Center for Life Science/);
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
    MeshoptDecoder.decodeGltfBuffer(bytes, compression.count, compression.byteStride, glb.binary.subarray(compression.byteOffset, compression.byteOffset + compression.byteLength), compression.mode, compression.filter);
    assert.equal(bytes.length, view.byteLength);
    glb.decoded.set(description.bufferView, bytes);
  }
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), stride = view.byteStride ?? compression.byteStride;
  const width = description.componentType === 5125 || description.componentType === 5126 ? 4 : 2;
  function raw(vertex: number, axis = 0) {
    const offset = (description.byteOffset ?? 0) + vertex * stride + axis * width;
    switch (description.componentType) {
      case 5122: return data.getInt16(offset, true);
      case 5123: return data.getUint16(offset, true);
      case 5125: return data.getUint32(offset, true);
      case 5126: return data.getFloat32(offset, true);
      default: throw Error(`Unsupported accessor ${description.componentType}`);
    }
  }
  return { description, raw, value: (vertex: number, axis = 0) => description.normalized && description.componentType === 5122 ? Math.max(-1, raw(vertex, axis) / 32767) : raw(vertex, axis) };
}

function surface(glb: Glb, node: Node) {
  const primitives = glb.json.meshes[node.mesh]!.primitives;
  assert.equal(primitives.length, 1);
  const primitive = primitives[0]!, positions = accessor(glb, primitive.attributes.POSITION), normals = accessor(glb, primitive.attributes.NORMAL), indices = accessor(glb, primitive.indices);
  assert.equal(positions.description.count, normals.description.count);
  assert.equal(positions.description.type, "VEC3");
  assert.equal(normals.description.type, "VEC3");
  assert.equal(normals.description.componentType, 5122);
  assert.equal(normals.description.normalized, true);
  assert.equal(indices.description.type, "SCALAR");
  assert.equal(indices.description.count % 3, 0);
  const key = (vertex: number) => [0, 1, 2].map(axis => positions.raw(vertex, axis)).join(",") + "|" + [0, 1, 2].map(axis => normals.raw(vertex, axis)).join(",");
  return { positions, normals, indices, key };
}
