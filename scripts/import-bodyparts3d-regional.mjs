/**
 * Import the official, independent BodyParts3D 20181210 reference.
 * The default operation writes a private audit. --export-assets explicitly
 * writes adapted GLBs after that audit; it never publishes application code.
 * No downloaded upstream code is executed.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { createAnatomyGltfEncoder } from "./lib/anatomy-gltf-encoder.mjs";

export const REGIONAL_DATASET_ID = "bodyparts3d-2018";
const CACHE = path.resolve(".local/bodyparts3d-v53-audit");
const OUTPUT = path.resolve("public/anatomy/bodyparts3d-regional");
const PREFIX = "/anatomy/bodyparts3d-regional";
const SOURCE_VERSION = "20181210i412";
const POSITION_ERROR = 0.00002, NORMAL_ERROR_DEGREES = 1, BASE_ERROR = 0.0005;
const MAX_ASSET_BYTES = 24 * 1024 * 1024;
const SYSTEMS = ["skeleton", "muscles", "organs", "nerves", "vessels"];
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
const emptyBounds = () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
const unionBounds = meshes => {
  const result = emptyBounds();
  for (const mesh of meshes) for (let axis = 0; axis < 3; axis++) {
    result.min[axis] = Math.min(result.min[axis], mesh.bounds.min[axis]);
    result.max[axis] = Math.max(result.max[axis], mesh.bounds.max[axis]);
  }
  return result;
};
export const regionalCanonicalName = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const numericConcept = value => /^FMA\d+/.exec(value ?? "")?.[0];
const baselineFiles = ["z-anatomy-manifest.json", "bodyparts3d-manifest.json", "bodyparts3d-complete-manifest.json"];
export function loadRegionalBaselines() {
  return baselineFiles.map(file => JSON.parse(fs.readFileSync(path.resolve("src/data", file), "utf8")));
}

/** An unfamiliar physical object ID alone is not evidence of a new detail. */
export function regionalDetailExpansion(meshes, baselines, excludedUnmappedCount, { metadataOnly = false } = {}) {
  const concepts = new Set(), names = new Set(), hashes = new Set(), elementIds = new Set(), geometryHashes = new Set();
  for (const baseline of baselines) for (const mesh of baseline.meshes) {
    const concept = numericConcept(mesh.sourceConceptId ?? mesh.fmaId ?? mesh.id);
    if (concept) concepts.add(concept);
    for (const name of [mesh.name, mesh.source?.originalName]) if (name) names.add(regionalCanonicalName(name));
    if (mesh.sourceSha256) hashes.add(mesh.sourceSha256);
    if (mesh.elementId) elementIds.add(mesh.elementId);
    if (mesh.sourceGeometrySha256) geometryHashes.add(mesh.sourceGeometrySha256);
  }
  const newMeshes = meshes.filter(mesh => {
    const concept = numericConcept(mesh.sourceConceptId ?? mesh.fmaId);
    return concept && !concepts.has(concept) && !names.has(regionalCanonicalName(mesh.name)) && !elementIds.has(mesh.elementId)
      && (metadataOnly || /^[a-f0-9]{64}$/.test(mesh.sourceSha256 ?? ""))
      && (!mesh.sourceSha256 || !hashes.has(mesh.sourceSha256)) && (!mesh.sourceGeometrySha256 || !geometryHashes.has(mesh.sourceGeometrySha256));
  });
  const seenGeometry = new Set();
  const uniqueMeshes = newMeshes.filter(mesh => {
    if (!mesh.sourceGeometrySha256) return true;
    if (seenGeometry.has(mesh.sourceGeometrySha256)) return false;
    seenGeometry.add(mesh.sourceGeometrySha256); return true;
  });
  return {
    baselineDatasets: baselines.map(baseline => baseline.datasetId),
    newMeshIds: uniqueMeshes.map(mesh => mesh.id),
    newConceptIds: [...new Set(uniqueMeshes.map(mesh => numericConcept(mesh.sourceConceptId ?? mesh.fmaId)))].sort(),
    excludedUnmappedCount,
    definition: "Source details absent from the indexed numeric FMA concepts (including extension bases), canonical English names and comparable object IDs of the three preceding references, also excluding matching available OBJ hashes. Exact duplicate source positions and triangulated faces are counted once. This index comparison is not a claim of anatomical novelty against references without a complete concept crosswalk. Named source spaces and regions are not presented as additional tissues.",
  };
}

export function regionalGeometryHash(position, indices) {
  if (!(position instanceof Float32Array) || !(indices instanceof Uint32Array) || position.length % 3 || indices.length % 3) throw Error("Invalid source geometry hash arrays");
  if (new Uint8Array(new Uint16Array([1]).buffer)[0] !== 1) throw Error("Source geometry hashing requires little-endian arrays");
  return createHash("sha256").update(`BodyParts3D-source-geometry-v1\0vertices:${position.length / 3};triangles:${indices.length / 3}\0`)
    .update(Buffer.from(position.buffer, position.byteOffset, position.byteLength)).update(Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength)).digest("hex");
}

/** Repair only absent source normals; retain authored valid directions. */
export function regionalZeroNormalRepairs(position, indices, zeroNormalIndices) {
  if (!zeroNormalIndices.length) return undefined;
  const missing = new Set(zeroNormalIndices), corners = [], removedDegenerateFaces = [], used = new Set();
  for (let offset = 0; offset < indices.length; offset += 3) {
    const face = [indices[offset], indices[offset + 1], indices[offset + 2]], targets = [...new Set(face.filter(index => missing.has(index)))];
    if (!targets.length) continue;
    for (const index of targets) used.add(index);
    const a = face[0] * 3, b = face[1] * 3, c = face[2] * 3;
    const u = [position[b] - position[a], position[b + 1] - position[a + 1], position[b + 2] - position[a + 2]];
    const v = [position[c] - position[a], position[c + 1] - position[a + 1], position[c + 2] - position[a + 2]];
    const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], area = Math.hypot(...cross);
    if (!Number.isFinite(area)) throw Error(`Non-finite source triangle area: ${offset / 3}`);
    if (!area) {
      removedDegenerateFaces.push({ sourceFaceIndex: offset / 3, sourceVertexIndices: face, sourcePositionsMillimetres: face.map(index => [...position.subarray(index * 3, index * 3 + 3)]), reason: "Exactly zero source triangle area; no rendered surface" });
      continue;
    }
    const normal = cross.map(value => value / area);
    for (let cornerIndex = 0; cornerIndex < 3; cornerIndex++) if (missing.has(face[cornerIndex])) corners.push({ sourceFaceIndex: offset / 3, cornerIndex, sourceVertexIndex: face[cornerIndex], sourceVertexNumber: face[cornerIndex] + 1, normal });
  }
  return { method: "Only corners with an authored zero normal are split per non-degenerate source triangle and assigned that triangle's oriented face normal. Existing coordinates, non-degenerate triangles and valid authored normals are preserved. Only exactly zero-area triangles incident to a zero normal are omitted from rendering and listed separately. Source indices are zero-based unless sourceVertexNumber is named; normals are in original source coordinates.", zeroNormalVertexIndices: zeroNormalIndices, corners, removedDegenerateFaces, unusedVertexIndices: zeroNormalIndices.filter(index => !used.has(index)) };
}

const roots = {
  skeleton: ["FMA5018", "FMA23881"],
  muscles: ["FMA5022", "FMA32558", "FMA13295", "FMA10474", "FMA85453", "FMA32555", "FMA32557"],
  nerves: ["FMA7157", "FMA65132", "FMA5913", "FMA5884", "FMA67242", "FMA83929", "FMA7647", "FMA11195", "FMA7041"],
  vessels: ["FMA50722", "FMA86187", "FMA86188", "FMA49894", "FMA82672"],
  organs: ["FMA7152", "FMA7158", "FMA7159", "FMA7160", "FMA9668", "FMA7088", "FMA67498"],
};
export function regionalClassifier(relations) {
  const memberships = new Map();
  for (const row of relations) {
    if (!memberships.has(row.conceptId)) memberships.set(row.conceptId, new Set());
    for (const element of row.elementIds) memberships.get(row.conceptId).add(element);
  }
  const union = ids => new Set(ids.flatMap(id => [...(memberships.get(id) ?? [])]));
  const groups = Object.fromEntries(Object.entries(roots).map(([system, ids]) => [system, union(ids)]));
  const arteries = union(["FMA86187"]), veins = union(["FMA86188"]);
  const envelopes = union(["FMA7163"]);
  function classify(elementId, name) {
    const rooted = arteries.has(elementId) || veins.has(elementId) ? "vessels"
      : ["muscles", "skeleton", "nerves", "vessels", "organs"].find(system => groups[system].has(elementId));
    let system = rooted, classificationMethod = rooted ? "official release FMA2Obj membership" : "residual study group";
    if (!system && /\b(?:artery|arteries|arterial|aorta|vein|veins|venous)\b|pulmonary trunk|vena cava|jugular bulb|palmar arch|plantar arch|confluence of sinuses/i.test(name)) {
      system = "vessels"; classificationMethod = "explicit authored vascular name outside the root memberships";
    }
    if ((!system || system === "organs") && /\bnerve\b|neural tissue|ganglion|ganglia|cauda equina|plexus/i.test(name) && !/venous|vascular|arter/i.test(name)) {
      system = "nerves"; classificationMethod = "explicit authored neural name outside the neural root memberships";
    }
    // These are study-layer assignments for existing source surfaces, not new
    // part-of relationships. Preserve named visceral supports in their context.
    const visceralSupport = /arterios|venos|pulmonary|hepat|gastr|splen|duoden|colon|pancreat|esophag|oesophag|uter|ovar|prostat|vesic|bladder|umbilic|vocal|thyro|crico|laryng|epiglott|vestibular|pharyng|trache|pericard|palpebr|ciliar|lacrim|penis|clitoris|ligament of lens|check ligament/i.test(name);
    if ((!system || system === "organs") && !/tendon of Todaro/i.test(name) && /\btendon\b|intertendon|aponeurosis|aponeuroses/i.test(name)) {
      system = "muscles"; classificationMethod = "explicit authored tendon or aponeurosis name; musculoskeletal study grouping";
    }
    if ((!system || system === "organs") && !visceralSupport && /\bligament\b|cartilage|fibrocartilage|interosseous membrane|joint capsule|retinaculum/i.test(name)) {
      system = "skeleton"; classificationMethod = "explicit authored skeletal-support name; musculoskeletal study grouping";
    }
    if ((!system || system === "organs") && !visceralSupport && /\b(?:bone|osseous|periosteum|vertebra|rib|ribs|phalanx|phalanges|scapula|clavicle|humerus|radius|ulna|femur|tibia|fibula|patella|sacrum|coccyx|maxilla|mandible|metacarpal|metatarsal)\b/i.test(name)) {
      system = "skeleton"; classificationMethod = "explicit authored bone or named bone-region; skeletal study grouping";
    }
    const vascularKind = system === "vessels" ? arteries.has(elementId) ? "artery" : veins.has(elementId) ? "vein"
      : /\b(?:vein|veins|venous)\b|vena cava|jugular bulb|confluence of sinuses/i.test(name) ? "vein"
        : /\b(?:artery|arteries|arterial|aorta)\b|pulmonary trunk|palmar arch|plantar arch/i.test(name) ? "artery" : "other" : undefined;
    return { system: system ?? "organs", classificationMethod, ...(vascularKind ? { vascularKind } : {}), defaultVisible: !envelopes.has(elementId) && !/^skin$/i.test(name) };
  }
  return { classify, memberships, groups, arteries, veins, envelopes };
}

const legacyRules = {
  clavicle: ["skeleton", /^(?:(?:right|left) )?clavicle$/i], scapula: ["skeleton", /^(?:(?:right|left) )?scapula$/i], humerus: ["skeleton", /^(?:(?:right|left) )?humerus$/i], radius: ["skeleton", /^(?:(?:right|left) )?radius$/i], ulna: ["skeleton", /^(?:(?:right|left) )?ulna$/i], femur: ["skeleton", /^(?:(?:right|left) )?femur$/i], pelvis: ["skeleton", /bony pelvis|hip bone/i], patella: ["skeleton", /^(?:(?:right|left) )?patella$/i], tibia: ["skeleton", /^(?:(?:right|left) )?tibia$/i],
  deltoid: ["muscles", /\bdeltoid\b/i], biceps: ["muscles", /\bbiceps brachii\b/i], triceps: ["muscles", /\btriceps brachii\b/i], "pectoralis-major": ["muscles", /\bpectoralis major\b/i], "rectus-abdominis": ["muscles", /\brectus abdominis\b/i], quadriceps: ["muscles", /\b(quadriceps femoris|rectus femoris|vastus lateralis|vastus medialis|vastus intermedius)\b/i], diaphragm: ["muscles", /\bdiaphragm\b/i],
  "median-nerve": ["nerves", /\bmedian nerve\b/i], "ulnar-nerve": ["nerves", /\bulnar nerve\b/i], "radial-nerve": ["nerves", /\bradial nerve\b/i], "sciatic-nerve": ["nerves", /\bsciatic nerve\b/i], "femoral-nerve": ["nerves", /\bfemoral nerve\b/i], "tibial-nerve": ["nerves", /\btibial nerve\b/i], "brachial-plexus": ["nerves", /\bbrachial (?:nerve )?plexus\b/i], "spinal-cord": ["nerves", /^neural tissue of spinal cord$/i],
  heart: ["organs", /^heart$/i], lungs: ["organs", /^(?:(?:right|left) )?lungs?$/i], liver: ["organs", /^liver$/i], stomach: ["organs", /^stomach$/i], kidneys: ["organs", /^(?:(?:right|left) )?kidney$/i], bladder: ["organs", /^urinary bladder$/i],
  aorta: ["vessels", /\baorta\b/i], carotid: ["vessels", /\bcommon carotid artery\b/i], "subclavian-artery": ["vessels", /\bsubclavian artery\b/i], "femoral-artery": ["vessels", /^(?:trunk of )?(?:(?:right|left) )?femoral artery$/i], "inferior-vena-cava": ["vessels", /\binferior vena cava\b/i], "pulmonary-artery": ["vessels", /\bpulmonary artery\b|^pulmonary trunk$/i],
};

/** Read original authored triangles and normals, with identity and hash checks. */
export function inspectRegionalObject(bytes, entry, classify) {
  if (entry.sourceSha256 && hash(bytes) !== entry.sourceSha256) throw Error(`Source SHA-256 mismatch: ${entry.elementId}`);
  if (entry.sourceBytes !== undefined && bytes.length !== entry.sourceBytes) throw Error(`Source byte count mismatch: ${entry.elementId}`);
  const text = bytes.toString("utf8"), header = {};
  for (const line of text.slice(0, 8192).split(/\r?\n/)) {
    const match = /^#\s*([^:]+?)\s*:\s*(.*?)\s*$/.exec(line);
    if (match) header[match[1]] = match[2];
  }
  if (header["Compatibility version"] !== SOURCE_VERSION || header["File ID"] !== entry.elementId
    || header["Concept ID"] !== (entry.sourceConceptId ?? entry.fmaId)
    || header["Representation ID"] !== entry.representationId || !header["English name"])
    throw Error(`Authored source identity mismatch: ${entry.elementId}`);
  const bounds = emptyBounds();
  const sourcePositions = Number.isSafeInteger(entry.sourceVertexCount) ? new Float64Array(entry.sourceVertexCount * 3) : [];
  const sourceIndices = Number.isSafeInteger(entry.sourceTriangles) ? new Uint32Array(entry.sourceTriangles * 3) : [];
  const zeroNormalIndices = [];
  let vertexCount = 0, normalCount = 0, triangles = 0;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("v ")) {
      const vertex = line.trim().split(/\s+/).slice(1, 4).map(Number);
      if (vertex.length !== 3 || vertex.some(value => !Number.isFinite(value))) throw Error(`Non-finite vertex: ${entry.elementId}`);
      for (let axis = 0; axis < 3; axis++) { bounds.min[axis] = Math.min(bounds.min[axis], vertex[axis]); bounds.max[axis] = Math.max(bounds.max[axis], vertex[axis]); sourcePositions[vertexCount * 3 + axis] = vertex[axis]; }
      vertexCount++;
    } else if (line.startsWith("vn ")) {
      const normal = line.trim().split(/\s+/).slice(1, 4).map(Number);
      if (normal.length !== 3 || normal.some(value => !Number.isFinite(value))) throw Error(`Invalid authored normal: ${entry.elementId}`);
      if (Math.hypot(...normal) === 0) zeroNormalIndices.push(normalCount);
      normalCount++;
    } else if (line.startsWith("f ")) {
      const face = line.trim().split(/\s+/).slice(1);
      if (face.length < 3) throw Error(`Invalid authored face: ${entry.elementId}`);
      for (const token of face) {
        const [vertex, , normal] = token.split("/").map(Number);
        if (!Number.isSafeInteger(vertex) || vertex < 1 || vertex > vertexCount || normal !== vertex) throw Error(`Unsupported authored normal indexing: ${entry.elementId}`);
      }
      const vertexIds = face.map(token => Number(token.split("/")[0]) - 1);
      for (let index = 1; index + 1 < vertexIds.length; index++) {
        const offset = (triangles + index - 1) * 3;
        sourceIndices[offset] = vertexIds[0]; sourceIndices[offset + 1] = vertexIds[index]; sourceIndices[offset + 2] = vertexIds[index + 1];
      }
      triangles += face.length - 2;
    }
  }
  if (vertexCount < 3 || triangles < 1 || vertexCount !== normalCount || !bounds.max.every(Number.isFinite)) throw Error(`Invalid source topology: ${entry.elementId}`);
  if ((entry.sourceTriangles !== undefined && triangles !== entry.sourceTriangles) || (entry.sourceVertexCount !== undefined && vertexCount !== entry.sourceVertexCount)) throw Error(`Source topology count mismatch: ${entry.elementId}`);
  const name = header["English name"], sourceConceptId = header["Concept ID"], classification = classify(entry.elementId, name);
  const preciseSourcePositions = sourcePositions instanceof Float64Array ? sourcePositions : Float64Array.from(sourcePositions);
  const sourcePositionArray = Float32Array.from(preciseSourcePositions);
  const sourceIndexArray = sourceIndices instanceof Uint32Array ? sourceIndices : Uint32Array.from(sourceIndices);
  const normalRepairs = regionalZeroNormalRepairs(preciseSourcePositions, sourceIndexArray, zeroNormalIndices);
  return {
    ...entry, id: `${sourceConceptId}_${entry.elementId}`, sourceConceptId,
    fmaId: /^FMA\d+$/.test(sourceConceptId) ? sourceConceptId : undefined,
    sourceVersion: SOURCE_VERSION, name, sourceSha256: hash(bytes), sourceGeometrySha256: regionalGeometryHash(sourcePositionArray, sourceIndexArray), sourceBytes: bytes.length,
    ...(normalRepairs ? { normalRepairs } : {}),
    removedDegenerateTriangles: normalRepairs?.removedDegenerateFaces.length ?? 0,
    renderTriangles: triangles - (normalRepairs?.removedDegenerateFaces.length ?? 0),
    sourceVolumeCm3: Number(header["Volume(cm3)"]), bounds, vertexCount, triangles, ...classification,
    legacyIds: Object.entries(legacyRules).filter(([, [system, pattern]]) => system === classification.system && pattern.test(name)).map(([id]) => id),
  };
}

export function regionalNormalization(meshes) {
  if (!meshes.length) throw Error("No verified source geometry");
  const sourceBounds = unionBounds(meshes);
  return {
    scale: 0.001,
    translation: [-(sourceBounds.min[0] + sourceBounds.max[0]) * 0.0005, -sourceBounds.min[2] * 0.001, (sourceBounds.min[1] + sourceBounds.max[1]) * 0.0005],
    sourceBounds, sourceAxis: "Z-up, -Y-anterior", targetAxis: "Y-up, +Z-anterior", units: "metres",
    applied: true, up: "+Y", anterior: "+Z", floorY: 0, sourceUnits: "millimetres", rotationDegreesX: -90,
  };
}

export function regionalGeometry(bytes, mesh, normalization) {
  const positions = new Float32Array(mesh.vertexCount * 3), normals = new Float32Array(mesh.vertexCount * 3), indices = new Uint32Array(mesh.triangles * 3), bounds = emptyBounds();
  let positionOffset = 0, normalOffset = 0, faceOffset = 0;
  const zeroNormals = new Set(mesh.normalRepairs?.zeroNormalVertexIndices ?? []);
  for (const line of bytes.toString("utf8").split(/\r?\n/)) {
    if (line.startsWith("v ")) {
      const vertex = line.trim().split(/\s+/).slice(1, 4).map(Number);
      const transformed = [vertex[0] * 0.001 + normalization.translation[0], vertex[2] * 0.001 + normalization.translation[1], -vertex[1] * 0.001 + normalization.translation[2]];
      for (let axis = 0; axis < 3; axis++) {
        positions[positionOffset + axis] = transformed[axis];
        const value = positions[positionOffset + axis];
        bounds.min[axis] = Math.min(bounds.min[axis], value); bounds.max[axis] = Math.max(bounds.max[axis], value);
      }
      positionOffset += 3;
    } else if (line.startsWith("vn ")) {
      const normalIndex = normalOffset / 3;
      let normal = line.trim().split(/\s+/).slice(1, 4).map(Number), length = Math.hypot(...normal);
      if (!length && zeroNormals.has(normalIndex)) { normalOffset += 3; continue; }
      if (!Number.isFinite(length) || !length) throw Error(`Invalid source normal: ${mesh.id}`);
      normals[normalOffset++] = normal[0] / length; normals[normalOffset++] = normal[2] / length; normals[normalOffset++] = -normal[1] / length;
    } else if (line.startsWith("f ")) {
      const face = line.trim().split(/\s+/).slice(1).map(token => {
        const [vertex, , normal] = token.split("/").map(Number);
        if (!Number.isSafeInteger(vertex) || vertex < 1 || vertex > mesh.vertexCount || normal !== vertex) throw Error(`Unsupported authored normal indexing: ${mesh.id}`);
        return vertex - 1;
      });
      if (face.length < 3) throw Error(`Invalid authored face: ${mesh.id}`);
      for (let index = 1; index + 1 < face.length; index++) { indices[faceOffset++] = face[0]; indices[faceOffset++] = face[index]; indices[faceOffset++] = face[index + 1]; }
    }
  }
  if (positionOffset !== positions.length || normalOffset !== normals.length || faceOffset !== indices.length) throw Error(`Geometry count changed: ${mesh.id}`);
  if (mesh.normalRepairs) {
    const expandedCount = mesh.vertexCount + mesh.normalRepairs.corners.length, expandedPosition = new Float32Array(expandedCount * 3), expandedNormal = new Float32Array(expandedCount * 3);
    expandedPosition.set(positions); expandedNormal.set(normals);
    const repairedCorners = new Map(mesh.normalRepairs.corners.map((record, index) => {
      const target = mesh.vertexCount + index;
      expandedPosition.set(positions.subarray(record.sourceVertexIndex * 3, record.sourceVertexIndex * 3 + 3), target * 3);
      expandedNormal.set([record.normal[0], record.normal[2], -record.normal[1]], target * 3);
      return [`${record.sourceFaceIndex}:${record.cornerIndex}`, target];
    }));
    const removedFaces = new Set(mesh.normalRepairs.removedDegenerateFaces.map(record => record.sourceFaceIndex)), renderIndices = new Uint32Array(mesh.renderTriangles * 3);
    let rendered = 0;
    for (let face = 0; face < mesh.triangles; face++) {
      if (removedFaces.has(face)) continue;
      for (let corner = 0; corner < 3; corner++) renderIndices[rendered++] = repairedCorners.get(`${face}:${corner}`) ?? indices[face * 3 + corner];
    }
    if (rendered !== renderIndices.length) throw Error(`Render triangle repair count mismatch: ${mesh.id}`);
    const used = new Uint8Array(expandedCount);
    for (const index of renderIndices) used[index] = 1;
    const remap = new Uint32Array(expandedCount), count = used.reduce((sum, value) => sum + value, 0);
    const compactPosition = new Float32Array(count * 3), compactNormal = new Float32Array(count * 3), compactBounds = emptyBounds();
    let next = 0;
    for (let index = 0; index < expandedCount; index++) if (used[index]) {
      if (index < mesh.vertexCount && zeroNormals.has(index)) throw Error(`A zero-normal source vertex was not split: ${mesh.id}`);
      remap[index] = next;
      compactPosition.set(expandedPosition.subarray(index * 3, index * 3 + 3), next * 3); compactNormal.set(expandedNormal.subarray(index * 3, index * 3 + 3), next * 3);
      for (let axis = 0; axis < 3; axis++) { compactBounds.min[axis] = Math.min(compactBounds.min[axis], expandedPosition[index * 3 + axis]); compactBounds.max[axis] = Math.max(compactBounds.max[axis], expandedPosition[index * 3 + axis]); }
      next++;
    }
    return { position: compactPosition, normal: compactNormal, indices: Uint32Array.from(renderIndices, index => remap[index]), bounds: compactBounds };
  }
  return { position: positions, normal: normals, indices, bounds };
}

/** Candidates only: bounds containment is not proof that two surfaces overlap. */
export function regionalSurfaceAudit(meshes, relations) {
  const byElement = new Map(meshes.map(mesh => [mesh.elementId, mesh]));
  const containment = [];
  const exactConcepts = new Map();
  const geometries = new Map();
  for (const mesh of meshes) {
    const same = exactConcepts.get(mesh.sourceConceptId) ?? [];
    same.push(mesh.id); exactConcepts.set(mesh.sourceConceptId, same);
    if (mesh.sourceGeometrySha256) {
      const copies = geometries.get(mesh.sourceGeometrySha256) ?? [];
      copies.push(mesh.id); geometries.set(mesh.sourceGeometrySha256, copies);
    }
  }
  const conceptParts = new Map();
  for (const relation of relations) {
    const components = conceptParts.get(relation.conceptId) ?? new Set();
    for (const id of relation.elementIds) components.add(id);
    conceptParts.set(relation.conceptId, components);
  }
  for (const [conceptId, components] of conceptParts) {
    if (components.size < 2 || components.size > 160) continue;
    const members = [...components].map(id => byElement.get(id)).filter(Boolean);
    const parent = members.find(mesh => mesh.sourceConceptId === conceptId && mesh.system === "skeleton");
    if (!parent) continue;
    const children = members.filter(mesh => mesh.id !== parent.id && mesh.sourceConceptId !== parent.sourceConceptId && mesh.system === "skeleton"
      && mesh.bounds.min.every((value, axis) => value >= parent.bounds.min[axis] - 2)
      && mesh.bounds.max.every((value, axis) => value <= parent.bounds.max[axis] + 2));
    if (children.length) containment.push({ sourceConceptId: conceptId, wholeId: parent.id, childIds: children.map(mesh => mesh.id) });
  }
  const spatial = [];
  const wholeBoneName = /\b(?:femur|humerus|tibia|fibula|ulna|radius|patella|scapula|clavicle|sternum|sacrum|coccyx|mandible|maxilla|zygomatic bone|temporal bone|parietal bone|frontal bone|occipital bone|sphenoid|ethmoid|hip bone|vertebra|rib|metacarpal|metatarsal|phalanx)\b/i;
  const regionalName = /\b(?:head|neck|body|part|surface|process|tubercle|tuberosity|epicondyle|condyle|shaft|crest|diaphysis|epiphysis|metaphysis|ramus|branch|fossa|foramen|notch|margin|edge)\b/i;
  const boneParents = meshes.filter(mesh => mesh.system === "skeleton" && mesh.elementId.startsWith("FJ") && wholeBoneName.test(mesh.name) && !regionalName.test(mesh.name));
  for (const parent of boneParents) {
    const name = regionalCanonicalName(parent.name);
    const children = meshes.filter(mesh => mesh.id !== parent.id && mesh.system === "skeleton" && mesh.sourceConceptId !== parent.sourceConceptId
      && regionalCanonicalName(mesh.name).includes(name)
      && mesh.bounds.min.every((value, axis) => value >= parent.bounds.min[axis] - 2)
      && mesh.bounds.max.every((value, axis) => value <= parent.bounds.max[axis] + 2));
    if (children.length) spatial.push({ wholeId: parent.id, wholeName: parent.name, childIds: children.map(mesh => mesh.id) });
  }
  return {
    exactGeometryDuplicates: [...geometries].filter(([, ids]) => ids.length > 1).map(([sourceGeometrySha256, ids]) => ({ sourceGeometrySha256, ids })),
    exactConceptAlternatives: [...exactConcepts].filter(([, ids]) => ids.length > 1).map(([sourceConceptId, ids]) => ({ sourceConceptId, ids })),
    wholeBoneAndContainedPartCandidates: containment,
    spatialBonePartCandidates: spatial,
    spatialCriteria: "An authored FJ whole-bone name, a different skeletal source concept whose canonical name includes that complete bone name, and source bounds contained within the whole-bone bounds with a 2 mm tolerance. A diagnostic, not an inferred anatomical relation or a measured surface intersection.",
    note: "Every source object is retained. Equal concepts can be alternative representations; a regional bone surface can coincide with its whole bone. Containment is a diagnostic only, never a measured intersection or evidence of a distinct tissue. Visibility is reviewed independently of source identity.",
  };
}

function safeProvenance(mesh) {
  const { cacheFile, ...publicFields } = mesh;
  return publicFields;
}

function visibilityReview(meshes, reviewFile) {
  if (!fs.existsSync(reviewFile)) return { status: "pending", hiddenIds: [], representationGroups: [] };
  const review = JSON.parse(fs.readFileSync(reviewFile, "utf8")), ids = new Set(meshes.map(mesh => mesh.id));
  if (review.status !== "reviewed" || !Array.isArray(review.hiddenIds) || !Array.isArray(review.representationGroups)) throw Error("Malformed regional visibility review");
  if (review.hiddenIds.some(id => !ids.has(id))) throw Error("Unknown physical ID in the regional visibility review");
  const grouped = new Set(), groupNames = new Set();
  for (const group of review.representationGroups) {
    if (typeof group.id !== "string" || !group.id || groupNames.has(group.id) || !Array.isArray(group.ids) || group.ids.length < 2 || new Set(group.ids).size !== group.ids.length || !group.ids.includes(group.defaultId) || group.ids.some(id => !ids.has(id) || grouped.has(id))) throw Error("Invalid regional representation group");
    groupNames.add(group.id);
    for (const id of group.ids) grouped.add(id);
  }
  return review;
}

function applyVisibility(meshes, review) {
  const hidden = new Set(review.hiddenIds);
  const alternatives = new Map(review.representationGroups.flatMap(group => group.ids.map(id => [id, group])));
  for (const mesh of meshes) {
    if (hidden.has(mesh.id)) mesh.defaultVisible = false;
    const group = alternatives.get(mesh.id);
    if (group) { mesh.representationGroup = group.id; mesh.representationDefault = group.defaultId === mesh.id; }
  }
}

async function exportRegionalAssets(source, meshes, audit, review) {
  if (review.status !== "reviewed") throw Error("Review private surface-overlap diagnostics and create visibility-review.json before exporting regional assets");
  const { metadata } = source;
  await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  const codec = createAnatomyGltfEncoder({ attribution: metadata.attribution, generator: "Ippomed coherent BodyParts3D 2018 importer", positionErrorMetres: POSITION_ERROR, normalErrorDegrees: NORMAL_ERROR_DEGREES });
  fs.mkdirSync(path.join(OUTPUT, "high"), { recursive: true }); fs.mkdirSync(path.join(OUTPUT, "preview"), { recursive: true });
  const records = [], files = [], preview = Object.fromEntries(SYSTEMS.map(system => [system, []]));
  const normalizedBounds = emptyBounds();
  let maxPositionError = 0, maxNormalError = 0;
  for (let ordinal = 0; ordinal < meshes.length; ordinal++) {
    const mesh = meshes[ordinal], bytes = fs.readFileSync(mesh.cacheFile);
    if (hash(bytes) !== mesh.sourceSha256) throw Error(`Source changed after audit: ${mesh.id}`);
    const geometry = regionalGeometry(bytes, mesh, audit.normalization), encoded = codec.quantization(geometry), high = codec.selectVertices(geometry, encoded, geometry.indices);
    maxPositionError = Math.max(maxPositionError, encoded.maxPositionError); maxNormalError = Math.max(maxNormalError, encoded.maxNormalError);
    for (let axis = 0; axis < 3; axis++) { normalizedBounds.min[axis] = Math.min(normalizedBounds.min[axis], geometry.bounds.min[axis]); normalizedBounds.max[axis] = Math.max(normalizedBounds.max[axis], geometry.bounds.max[axis]); }
    const target = Math.min(mesh.renderTriangles, Math.max(80, Math.min(12000, Math.floor(mesh.renderTriangles * 0.1))));
    const [baseIndices, error] = MeshoptSimplifier.simplify(geometry.indices, geometry.position, 3, target * 3, BASE_ERROR, ["ErrorAbsolute", "LockBorder"]);
    const base = codec.selectVertices(geometry, encoded, baseIndices), highFiles = [];
    const splitHigh = (data, suffix = "") => {
      const glb = codec.makeGlb([{ mesh, data }], mesh.system, "high");
      if (glb.length > MAX_ASSET_BYTES) {
        const split = Math.floor(data.indices.length / 6) * 3;
        if (split < 3) throw Error(`Cannot split asset: ${mesh.id}`);
        splitHigh(codec.selectVertices(null, data, Uint32Array.from(data.indices.subarray(0, split))), suffix + "a");
        splitHigh(codec.selectVertices(null, data, Uint32Array.from(data.indices.subarray(split))), suffix + "b");
        return;
      }
      const name = `${mesh.id.toLowerCase()}${suffix ? `-${suffix}` : ""}.glb`, file = { url: `${PREFIX}/high/${name}`, bytes: glb.length, sha256: hash(glb) };
      fs.writeFileSync(path.join(OUTPUT, "high", name), glb); files.push(file); highFiles.push(file);
    };
    splitHigh(high);
    preview[mesh.system].push({ mesh, data: base });
    records.push({
      id: mesh.id, elementId: mesh.elementId, representationId: mesh.representationId, sourceConceptId: mesh.sourceConceptId, ...(mesh.fmaId ? { fmaId: mesh.fmaId } : {}),
      name: mesh.name, normalizedName: regionalCanonicalName(mesh.name).replace(/ /g, "-"), system: mesh.system, classificationMethod: mesh.classificationMethod,
      ...(mesh.vascularKind ? { vascularKind: mesh.vascularKind } : {}), legacyIds: mesh.legacyIds, defaultVisible: mesh.defaultVisible,
      ...(mesh.representationGroup ? { representationGroup: mesh.representationGroup, representationDefault: mesh.representationDefault } : {}),
      source: { originalName: mesh.name, objectFile: mesh.sourceObjectName, objectGroup: mesh.sourceObjectGroup, conceptId: mesh.sourceConceptId }, bounds: geometry.bounds,
      sourceVersion: SOURCE_VERSION, sourceSha256: mesh.sourceSha256, sourceTriangles: mesh.triangles, sourceVertexCount: mesh.vertexCount,
      sourceGeometrySha256: mesh.sourceGeometrySha256,
      removedDegenerateTriangles: mesh.removedDegenerateTriangles, renderVertexCount: high.vertexCount,
      ...(mesh.normalRepairs ? { normalRepair: { method: mesh.normalRepairs.method, repairedCornerCount: mesh.normalRepairs.corners.length, zeroNormalVertexCount: mesh.normalRepairs.zeroNormalVertexIndices.length, removedDegenerateTriangles: mesh.removedDegenerateTriangles } } : {}),
      triangles: base.indices.length / 3, vertexCount: base.vertexCount,
      lod: { ...(highFiles.length === 1 ? { url: highFiles[0].url, sha256: highFiles[0].sha256 } : {}), files: highFiles.map(file => file.url), bytes: highFiles.reduce((sum, file) => sum + file.bytes, 0), triangles: mesh.renderTriangles, vertexCount: high.vertexCount },
      previewErrorMetres: error, quantization: { positionBits: encoded.quantized ? 16 : 32, positionErrorMetres: encoded.maxPositionError, normalBits: 16, normalErrorDegrees: encoded.maxNormalError, translation: encoded.translation, uniformScale: encoded.scale },
    });
    if ((ordinal + 1) % 50 === 0 || ordinal + 1 === meshes.length) console.log(`Encoded regional surfaces ${ordinal + 1}/${meshes.length}`);
  }
  const systems = [];
  for (const system of SYSTEMS) {
    const items = preview[system], systemFiles = [];
    let batch = [], rawBytes = 0;
    const flush = () => {
      if (!batch.length) return;
      const glb = codec.makeGlb(batch, system, "preview");
      if (glb.length > MAX_ASSET_BYTES) throw Error(`Oversized regional preview: ${system}`);
      const name = `${system}-${String(systemFiles.length + 1).padStart(2, "0")}.glb`, file = { url: `${PREFIX}/preview/${name}`, bytes: glb.length, sha256: hash(glb) };
      fs.writeFileSync(path.join(OUTPUT, "preview", name), glb); files.push(file); systemFiles.push(file); batch = []; rawBytes = 0;
    };
    for (const item of items) {
      const size = item.data.position.byteLength + item.data.normal.byteLength + item.data.indices.byteLength;
      if (rawBytes + size > 12 * 1024 * 1024) flush();
      batch.push(item); rawBytes += size;
    }
    flush();
    systems.push({ id: system, files: systemFiles.map(file => file.url), bytes: systemFiles.reduce((sum, file) => sum + file.bytes, 0), meshCount: items.length, triangles: items.reduce((sum, item) => sum + item.data.indices.length / 3, 0), highTriangles: meshes.filter(mesh => mesh.system === system).reduce((sum, mesh) => sum + mesh.renderTriangles, 0), sourceTriangles: meshes.filter(mesh => mesh.system === system).reduce((sum, mesh) => sum + mesh.triangles, 0) });
  }
  const manifest = {
    version: "2018", schemaVersion: 1, datasetId: REGIONAL_DATASET_ID, dataset: "BodyParts3D 2018 (5.3)", status: "ready",
    sourceVersion: SOURCE_VERSION, sourceRelease: metadata.sourceRelease, source: metadata.sourceUrl, license: metadata.license, licenseUrl: metadata.licenseUrl,
    attribution: metadata.attribution, attributionUrl: `${PREFIX}/ATTRIBUTION.txt`, systems, meshes: records,
    legacyMapping: Object.fromEntries(Object.keys(legacyRules).map(id => [id, records.filter(mesh => mesh.legacyIds.includes(id)).map(mesh => mesh.id)])),
    bounds: normalizedBounds, normalization: audit.normalization, detailExpansion: audit.detailExpansion,
    classification: audit.classification, representations: review.representationGroups, files,
    lodPolicy: { high: "Every non-degenerate source triangle and its coordinates retained; no geometric smoothing, subdivision or decimation. Only documented exactly zero-area source faces incident to an absent normal are omitted. Zero-normal corners on valid source triangles are split and receive their own source-oriented face normal; valid authored normals remain unchanged apart from normalization.", removedDegenerateTriangles: meshes.reduce((sum, mesh) => sum + mesh.removedDegenerateTriangles, 0), preview: "Same coherent 2018 reference; 10% target, 80–12000 triangles per element, 0.5 mm estimated appearance error bound, locked boundaries", maximumPositionErrorMetres: POSITION_ERROR, maximumNormalErrorDegrees: NORMAL_ERROR_DEGREES },
  };
  const serialized = JSON.stringify(manifest, null, 2) + "\n";
  fs.writeFileSync(path.join(OUTPUT, "manifest.json"), serialized); fs.writeFileSync("src/data/bodyparts3d-regional-manifest.json", serialized);
  const notice = `${metadata.attribution}\nLicense: ${metadata.license}\n${metadata.licenseUrl}\nOfficial source: ${metadata.sourceUrl}\nOfficial license: ${metadata.attributionUrl}\nReference: BodyParts3D 20181210i412 / object set 20181210 / FMA4.12.0-inference.\nAdaptations: one coherent source reference, axes rotated -90 degrees about X and millimetres converted to metres; source normals normalized and encoded with measured angular error <=1 degree; position quantization bounded by measured vector error <=0.02 mm, float fallback otherwise; lossless Meshopt compression and indexing reorder. HIGH preserves every non-degenerate source triangle and its coordinates. Exactly ${manifest.lodPolicy.removedDegenerateTriangles} zero-area source faces incident to absent normals are excluded from rendering and listed in provenance. Only source zero-normal corners are split per valid triangle and assigned that source-oriented face normal; valid authored normal directions are preserved. Original source vertex/triangle counts and rendered counts are recorded separately. Only preview geometry is simplified, with a 0.5 mm estimated appearance error limit.\nSource regions, spaces, alternative representations and their authored concept extensions retain their identities. They are not claimed to be additional tissues or exhaustive human anatomy. Geometry from another body reference is never merged here. These anatomical asset terms are separate from application-code terms.\n`;
  fs.writeFileSync(path.join(OUTPUT, "ATTRIBUTION.txt"), notice); fs.writeFileSync(path.join(OUTPUT, "LICENSE.txt"), notice);
  const provenanceMeshes = meshes.map(mesh => {
    const { bounds, triangles, vertexCount, ...entry } = safeProvenance(mesh);
    return { ...entry, sourceBoundsMillimetres: bounds, sourceTriangles: triangles, sourceVertices: vertexCount };
  });
  writeJson(path.join(OUTPUT, "provenance.json"), { datasetId: REGIONAL_DATASET_ID, sourceVersion: SOURCE_VERSION, metadata: { sourceUrl: metadata.sourceUrl, metadataUrl: metadata.metadataUrl, mappingUrl: metadata.mappingUrl, metadataSha256: metadata.metadataSha256 }, sourceLicense: metadata.license, normalization: audit.normalization, detailExpansion: audit.detailExpansion, surfaceAudit: audit.surfaceAudit, visibility: review, measuredPositionErrorMetres: maxPositionError, measuredNormalErrorDegrees: maxNormalError, importer: "scripts/import-bodyparts3d-regional.mjs", meshes: provenanceMeshes, exclusions: source.exclusions, files });
  console.log(JSON.stringify({ exported: true, datasetId: manifest.datasetId, objects: records.length, sourceTriangles: audit.sourceTriangles, renderTriangles: audit.renderTriangles, removedDegenerateTriangles: audit.removedDegenerateTriangles, previewTriangles: systems.reduce((sum, system) => sum + system.triangles, 0), newMeshCount: audit.detailExpansion.newMeshIds.length, newConceptCount: audit.detailExpansion.newConceptIds.length, files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0) }, null, 2));
  return manifest;
}

export async function importRegionalBody(args = process.argv.slice(2)) {
  const option = name => args.find(value => value.startsWith(name + "="))?.slice(name.length + 1);
  const limitValue = option("--limit"), limit = limitValue === undefined ? undefined : Number(limitValue);
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) throw Error("--limit must be a positive integer");
  const exportAssets = args.includes("--export-assets"), metadataOnly = args.includes("--metadata-only");
  if (exportAssets && (limit !== undefined || metadataOnly || args.includes("--download-only") || args.includes("--audit-only"))) throw Error("Export requires the complete verified reference and cannot be combined with audit/download-only flags");
  const { loadRegionalSource } = await import("./lib/bodyparts3d-regional-source.mjs");
  const source = await loadRegionalSource({ download: !metadataOnly, ...(limit !== undefined ? { limit } : {}), onProgress: progress => console.log(JSON.stringify(progress)) });
  const baselines = loadRegionalBaselines();
  fs.mkdirSync(CACHE, { recursive: true });
  if (metadataOnly || args.includes("--download-only")) {
    const classifier = regionalClassifier(source.metadata.relations);
    const candidates = source.meshes.map(mesh => ({ ...mesh, id: `${mesh.sourceConceptId ?? mesh.fmaId}_${mesh.elementId}`, ...classifier.classify(mesh.elementId, mesh.name) }));
    const audit = { datasetId: REGIONAL_DATASET_ID, sourceVersion: SOURCE_VERSION, verification: metadataOnly ? "metadata-only; geometry unverified" : "source downloads verified; geometry encoding not run", mappedObjectCount: source.metadata.mappedObjectCount, selectedObjectCount: candidates.length, excludedUnmappedCount: source.exclusions.length, candidateDetailExpansion: regionalDetailExpansion(candidates, baselines, source.exclusions.length, { metadataOnly }), exclusions: source.exclusions, meshes: candidates.map(safeProvenance) };
    writeJson(path.join(CACHE, metadataOnly ? "import-metadata-audit.json" : "import-download-audit.json"), audit);
    console.log(JSON.stringify({ ...audit, meshes: undefined, exclusions: undefined, candidateDetailExpansion: { ...audit.candidateDetailExpansion, newMeshIds: audit.candidateDetailExpansion.newMeshIds.length, newConceptIds: audit.candidateDetailExpansion.newConceptIds.length } }, null, 2));
    return audit;
  }
  const classifier = regionalClassifier(source.metadata.relations), meshes = [];
  for (const entry of source.meshes) meshes.push(inspectRegionalObject(fs.readFileSync(entry.cacheFile), entry, classifier.classify));
  if (new Set(meshes.map(mesh => mesh.id)).size !== meshes.length) throw Error("Duplicate regional physical IDs");
  const normalization = regionalNormalization(meshes), review = visibilityReview(meshes, path.join(CACHE, "visibility-review.json"));
  applyVisibility(meshes, review);
  const audit = {
    datasetId: REGIONAL_DATASET_ID, sourceVersion: SOURCE_VERSION, verification: "Source OBJ SHA-256, authored identity, vertices, normals and face counts verified; no upstream code executed",
    objectCount: meshes.length, sourceTriangles: meshes.reduce((sum, mesh) => sum + mesh.triangles, 0), renderTriangles: meshes.reduce((sum, mesh) => sum + mesh.renderTriangles, 0), removedDegenerateTriangles: meshes.reduce((sum, mesh) => sum + mesh.removedDegenerateTriangles, 0), sourceVertices: meshes.reduce((sum, mesh) => sum + mesh.vertexCount, 0), normalization,
    systems: SYSTEMS.map(id => ({ id, meshCount: meshes.filter(mesh => mesh.system === id).length, triangles: meshes.filter(mesh => mesh.system === id).reduce((sum, mesh) => sum + mesh.triangles, 0) })),
    normalRepairs: meshes.filter(mesh => mesh.normalRepairs).map(mesh => ({ id: mesh.id, repairedCornerCount: mesh.normalRepairs.corners.length, zeroNormalVertexCount: mesh.normalRepairs.zeroNormalVertexIndices.length, unusedZeroNormalVertexCount: mesh.normalRepairs.unusedVertexIndices.length, removedDegenerateTriangles: mesh.removedDegenerateTriangles })),
    classification: { roots, method: "Release FMA2Obj memberships; explicit authored neural, vascular and musculoskeletal-support names provide study groupings, with visceral context preserved. Residual anatomy stays in the organs study layer without claiming every residual region is an organ. No anatomical relationship is invented.", arterialRoot: "FMA86187", venousRoot: "FMA86188", arterialComponents: classifier.arteries.size, venousComponents: classifier.veins.size },
    detailExpansion: regionalDetailExpansion(meshes, baselines, source.exclusions.length), surfaceAudit: regionalSurfaceAudit(meshes, source.metadata.relations), visibilityStatus: review.status,
    exclusions: source.exclusions, meshes: meshes.map(safeProvenance),
  };
  writeJson(path.join(CACHE, "import-audit.json"), audit);
  console.log(JSON.stringify({ ...audit, meshes: undefined, exclusions: undefined, classification: undefined, normalRepairs: { affectedObjects: audit.normalRepairs.length, splitCorners: audit.normalRepairs.reduce((sum, repair) => sum + repair.repairedCornerCount, 0), zeroNormalVertices: audit.normalRepairs.reduce((sum, repair) => sum + repair.zeroNormalVertexCount, 0) }, surfaceAudit: { exactGeometryDuplicateCount: audit.surfaceAudit.exactGeometryDuplicates.length, exactConceptAlternativeCount: audit.surfaceAudit.exactConceptAlternatives.length, wholeBoneAndContainedPartCandidateCount: audit.surfaceAudit.wholeBoneAndContainedPartCandidates.length, spatialBonePartCandidateCount: audit.surfaceAudit.spatialBonePartCandidates.length, note: audit.surfaceAudit.note }, detailExpansion: { ...audit.detailExpansion, newMeshIds: audit.detailExpansion.newMeshIds.length, newConceptIds: audit.detailExpansion.newConceptIds.length } }, null, 2));
  if (exportAssets) return exportRegionalAssets(source, meshes, audit, review);
  return audit;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await importRegionalBody();
}
