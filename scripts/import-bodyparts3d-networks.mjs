/**
 * Import every physical BodyParts3D 4.3 surface from a pinned data mirror.
 * No upstream code is executed. Git blobs, LFS SHA-256, sizes, authored OBJ
 * headers and topology are checked before a coherent preview/HIGH export.
 * Previous 4.0/4.3 and isolated 3.0 assets remain available for older clients.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const REPO = "olivercase/body_parts_3d_api";
const COMMIT = "fd527e6f4daf732fd814314d9257df5877b844bc";
const SOURCE_ROOT = `https://raw.githubusercontent.com/${REPO}/${COMMIT}/`;
const SOURCE_URL = "https://lifesciencedb.jp/bp3d/";
const LICENSE = "CC-BY-SA-2.1-JP";
const LICENSE_URL = "https://creativecommons.org/licenses/by-sa/2.1/jp/";
const ATTRIBUTION = "BodyParts3D, Copyright 2008 Database Center for Life Science (DBCLS), licensed under CC Attribution-ShareAlike 2.1 Japan";
const CACHE = path.resolve(".local/bodyparts3d-highres");
const ROOT_OUTPUT = path.resolve("public/anatomy/bodyparts3d");
const OUTPUT = path.join(ROOT_OUTPUT, "v43");
const PREFIX = "/anatomy/bodyparts3d/v43";
const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const POSITION_ERROR = 0.00002;
const NORMAL_ERROR_DEGREES = 1;
const BASE_ERROR = 0.0005;
const SYSTEMS = ["skeleton", "muscles", "organs", "nerves", "vessels"];
const colors = { skeleton: [0.82, 0.78, 0.66, 1], muscles: [0.64, 0.22, 0.2, 1], organs: [0.63, 0.34, 0.36, 1], nerves: [0.9, 0.73, 0.28, 1], vessels: [0.76, 0.16, 0.2, 1] };
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const gitBlob = bytes => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
const align = value => (value + 3) & ~3;
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
const lines = text => text.split(/\r\n|\r|\n/);
fs.mkdirSync(path.join(CACHE, "objs"), { recursive: true });
fs.mkdirSync(path.join(CACHE, "v43-pointers"), { recursive: true });
fs.mkdirSync(path.join(OUTPUT, "high"), { recursive: true });
fs.mkdirSync(path.join(OUTPUT, "preview"), { recursive: true });
let downloadedBytes = 0;
async function get(url) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw Error(`Public source HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      downloadedBytes += bytes.length;
      return bytes;
    } catch (error) { last = error; }
  }
  throw last;
}
const treeUrl = `https://api.github.com/repos/${REPO}/git/trees/${COMMIT}?recursive=1`;
const treeFile = path.join(CACHE, "v43-tree.json");
if (!fs.existsSync(treeFile)) fs.writeFileSync(treeFile, await get(treeUrl));
const tree = JSON.parse(fs.readFileSync(treeFile, "utf8"));
if (tree.truncated || !Array.isArray(tree.tree)) throw Error("Incomplete pinned source tree");
const treeEntries = new Map(tree.tree.map(entry => [entry.path, entry]));
async function metadata(upstreamPath, localName) {
  const entry = treeEntries.get(upstreamPath);
  if (!entry || entry.type !== "blob") throw Error(`Missing metadata ${upstreamPath}`);
  const file = path.join(CACHE, localName);
  let bytes = fs.existsSync(file) ? fs.readFileSync(file) : null;
  if (!bytes || bytes.length !== entry.size || gitBlob(bytes) !== entry.sha) {
    bytes = await get(SOURCE_ROOT + upstreamPath);
    if (bytes.length !== entry.size || gitBlob(bytes) !== entry.sha) throw Error(`Metadata integrity mismatch ${upstreamPath}`);
    fs.writeFileSync(file, bytes);
  }
  return bytes.toString("utf8");
}
const csv = await metadata("MANIFEST.csv", "MANIFEST.csv");
const relationships = await metadata("metadata/FMA2Obj.txt", "FMA2Obj.txt");
const csvRows = lines(csv).filter(Boolean).slice(1).map(line => {
  const values = line.split(",");
  return { elementId: values[0], manifestFmaId: values[2], name: values.slice(3, -4).join(","), triangles: Number(values.at(-4)), vertexCount: Number(values.at(-3)), bytes: Number(values.at(-2)) };
});
const sourceByElement = new Map(csvRows.map(row => [row.elementId, row]));
if (csvRows.length !== 3210 || sourceByElement.size !== 3210 || csvRows.reduce((sum, row) => sum + row.triangles, 0) !== 8647172) throw Error("Unexpected pinned 4.3 corpus");
const relationSets = new Map();
for (const line of lines(relationships)) {
  if (!line || line.startsWith("#")) continue;
  const [concept, mode, components] = line.split("\t");
  if (!/^FMA\d+$/.test(concept) || !["is_a", "part_of"].includes(mode) || !components) throw Error("Invalid official FMA2Obj row");
  if (!relationSets.has(concept)) relationSets.set(concept, new Set());
  for (const id of components.split("+")) relationSets.get(concept).add(id);
}
const componentUnion = ids => new Set(ids.flatMap(id => [...(relationSets.get(id) ?? [])]));
const roots = {
  skeleton: ["FMA5018", "FMA23881"],
  muscles: ["FMA5022", "FMA32558", "FMA13295", "FMA10474", "FMA85453", "FMA32555", "FMA32557"],
  nerves: ["FMA7157", "FMA65132", "FMA5913", "FMA5884", "FMA67242", "FMA83929", "FMA7647", "FMA11195", "FMA7041"],
  vessels: ["FMA50722", "FMA86187", "FMA86188", "FMA49894", "FMA82672"],
  organs: ["FMA7152", "FMA7158", "FMA7159", "FMA7160", "FMA9668", "FMA7088", "FMA67498"],
};
const groupSets = Object.fromEntries(Object.entries(roots).map(([key, ids]) => [key, componentUnion(ids)]));
const arterialSet = componentUnion(["FMA86187"]);
const venousSet = componentUnion(["FMA86188"]);
if (arterialSet.size !== 849 || venousSet.size !== 577 || [...arterialSet].some(id => venousSet.has(id))) throw Error("Unexpected official arterial/venous families");
const skinElements = componentUnion(["FMA7163", "FMA70751", "FMA70754", "FMA71098", "FMA46768"]);
function classify(elementId, name) {
  const rooted = arterialSet.has(elementId) || venousSet.has(elementId) ? "vessels" : ["muscles", "skeleton", "nerves", "vessels", "organs"].find(system => groupSets[system].has(elementId));
  let system = rooted;
  let method = rooted ? "official FMA2Obj membership" : "residual study group";
  // The source taxonomy omits a few named branches. Names only classify real,
  // already present meshes; they never generate new anatomy or relationships.
  if (!system && (elementId === "FJ4704" || /\b(?:artery|arteries|arterial|aorta|vein|veins|venous)\b|pulmonary trunk|vena cava|jugular bulb|palmar arch|plantar arch|confluence of sinuses/i.test(name))) { system = "vessels"; method = "explicit authored vascular name outside root groups"; }
  if ((!system || system === "organs") && /\bnerve\b|neural tissue|ganglion|ganglia|cauda equina|plexus/i.test(name) && !/venous|vascular|arter/i.test(name)) { system = "nerves"; method = "explicit authored neural name outside neural roots or within a broad regional group"; }
  let vascularKind;
  if (system === "vessels") {
    vascularKind = arterialSet.has(elementId) ? "artery" : venousSet.has(elementId) || elementId === "FJ4704" ? "vein" : /\b(?:vein|veins|venous)\b|vena cava|jugular bulb|confluence of sinuses/i.test(name) ? "vein" : /\b(?:artery|arteries|arterial|aorta)\b|pulmonary trunk|palmar arch|plantar arch/i.test(name) ? "artery" : "other";
  }
  return { system: system ?? "organs", ...(vascularKind ? { vascularKind } : {}), classificationMethod: method };
}
const sourceEntries = tree.tree.filter(entry => /^meshes\/(FJ\d+M?)_(BP\d+)_(FMA\d+)_(.+)\.obj$/.test(entry.path)).map(entry => {
  const [, elementId, representationId, fmaId, name] = /^meshes\/(FJ\d+M?)_(BP\d+)_(FMA\d+)_(.+)\.obj$/.exec(entry.path);
  const expected = sourceByElement.get(elementId);
  if (!expected || !Number.isSafeInteger(expected.bytes) || !Number.isSafeInteger(expected.triangles) || !Number.isSafeInteger(expected.vertexCount)) throw Error(`Missing source manifest row ${elementId}`);
  return { ...entry, ...expected, elementId, representationId, fmaId, name, id: `${fmaId}_${elementId}` };
});
if (sourceEntries.length !== 3210 || new Set(sourceEntries.map(entry => entry.elementId)).size !== 3210) throw Error("Incomplete source OBJ membership");
const queue = [...sourceEntries];
let verified = 0;
await Promise.all(Array.from({ length: 10 }, async () => {
  while (queue.length) {
    const entry = queue.shift();
    const pointerFile = path.join(CACHE, "v43-pointers", `${entry.elementId}.txt`);
    let pointer = fs.existsSync(pointerFile) ? fs.readFileSync(pointerFile) : null;
    if (!pointer || gitBlob(pointer) !== entry.sha) {
      pointer = await get(SOURCE_ROOT + entry.path.split("/").map(encodeURIComponent).join("/"));
      if (gitBlob(pointer) !== entry.sha) throw Error(`Pinned Git blob mismatch ${entry.elementId}`);
      fs.writeFileSync(pointerFile, pointer);
    }
    const lfs = /^version https:\/\/git-lfs.github.com\/spec\/v1\noid sha256:([a-f0-9]{64})\nsize (\d+)\n?$/.exec(pointer.toString("utf8"));
    if (!lfs || Number(lfs[2]) !== entry.bytes) throw Error(`Unexpected source LFS pointer ${entry.elementId}`);
    entry.sourceSha256 = lfs[1];
    entry.sourceUrl = `https://media.githubusercontent.com/media/${REPO}/${COMMIT}/${entry.path.split("/").map(encodeURIComponent).join("/")}`;
    const file = path.join(CACHE, "objs", `${entry.elementId}.obj`);
    let obj = fs.existsSync(file) ? fs.readFileSync(file) : null;
    if (!obj || obj.length !== entry.bytes || hash(obj) !== entry.sourceSha256) {
      obj = await get(entry.sourceUrl);
      if (obj.length !== entry.bytes || hash(obj) !== entry.sourceSha256) throw Error(`Source LFS SHA-256 mismatch ${entry.elementId}`);
      fs.writeFileSync(file, obj);
    }
    const header = obj.subarray(0, 2000).toString("utf8");
    if (!header.includes("Compatibility version : 4.3") || !header.includes(`File ID : ${entry.elementId}`) || !header.includes(`Representation ID : ${entry.representationId}`) || !header.includes(`Concept ID : ${entry.fmaId}`)) throw Error(`Unexpected authored source identity ${entry.elementId}`);
    if (++verified % 100 === 0 || verified === sourceEntries.length) console.log(`Verified ${verified}/${sourceEntries.length} pinned 4.3 OBJ sources`);
  }
}));
writeJson(path.join(CACHE, "v43-source-index.json"), { dataset: "BodyParts3D 4.3", repository: REPO, commit: COMMIT, treeUrl, entries: sourceEntries.map(({ elementId, representationId, fmaId, manifestFmaId, name, triangles, vertexCount, bytes, sourceSha256, sourceUrl, sha, path }) => ({ elementId, representationId, fmaId, manifestFmaId, name, triangles, vertexCount, bytes, sourceSha256, sourceUrl, gitBlobSha1: sha, path })) });
if (process.argv.includes("--download-only")) process.exit(0);

const legacyRules = {
  clavicle: ["skeleton", /^(?:(?:right|left) )?clavicle$/i], scapula: ["skeleton", /^(?:(?:right|left) )?scapula$/i], humerus: ["skeleton", /^(?:(?:right|left) )?humerus$/i], radius: ["skeleton", /^(?:(?:right|left) )?radius$/i], ulna: ["skeleton", /^(?:(?:right|left) )?ulna$/i], femur: ["skeleton", /^(?:(?:right|left) )?femur$/i], pelvis: ["skeleton", /bony pelvis|hip bone/i], patella: ["skeleton", /^(?:(?:right|left) )?patella$/i], tibia: ["skeleton", /^(?:(?:right|left) )?tibia$/i],
  deltoid: ["muscles", /\bdeltoid\b/i], biceps: ["muscles", /\bbiceps brachii\b/i], triceps: ["muscles", /\btriceps brachii\b/i], "pectoralis-major": ["muscles", /\bpectoralis major\b/i], "rectus-abdominis": ["muscles", /\brectus abdominis\b/i], quadriceps: ["muscles", /\b(quadriceps femoris|rectus femoris|vastus lateralis|vastus medialis|vastus intermedius)\b/i], diaphragm: ["muscles", /\bdiaphragm\b/i],
  "median-nerve": ["nerves", /\bmedian nerve\b/i], "ulnar-nerve": ["nerves", /\bulnar nerve\b/i], "radial-nerve": ["nerves", /\bradial nerve\b/i], "sciatic-nerve": ["nerves", /\bsciatic nerve\b/i], "femoral-nerve": ["nerves", /\bfemoral nerve\b/i], "tibial-nerve": ["nerves", /\btibial nerve\b/i], "brachial-plexus": ["nerves", /\bbrachial (?:nerve )?plexus\b/i], "spinal-cord": ["nerves", /^neural tissue of spinal cord$/i],
  heart: ["organs", /^heart$/i], lungs: ["organs", /^(?:(?:right|left) )?lungs?$/i], liver: ["organs", /^liver$/i], stomach: ["organs", /^stomach$/i], kidneys: ["organs", /^(?:(?:right|left) )?kidney$/i], bladder: ["organs", /^urinary bladder$/i],
  aorta: ["vessels", /\baorta\b/i], carotid: ["vessels", /\bcommon carotid artery\b/i], "subclavian-artery": ["vessels", /\bsubclavian artery\b/i], "femoral-artery": ["vessels", /^(?:trunk of )?(?:(?:right|left) )?femoral artery$/i], "inferior-vena-cava": ["vessels", /\binferior vena cava\b/i], "pulmonary-artery": ["vessels", /\bpulmonary artery\b|^pulmonary trunk$/i],
};
// Stable FMA concepts used by the existing course landmarks. Their physical
// components are resolved from this release's FMA2Obj, never another geometry.
// Whole organs may be represented only by lobes/walls, without a named shell.
const legacyConceptRoots = {
  clavicle: ["FMA13321"], scapula: ["FMA13394"], humerus: ["FMA13303"], radius: ["FMA23463"], ulna: ["FMA23466"], femur: ["FMA9611"], pelvis: ["FMA16580", "FMA16585", "FMA16586", "FMA16587"], patella: ["FMA24485"], tibia: ["FMA24476"],
  heart: ["FMA7088"], lungs: ["FMA7309", "FMA7310"], liver: ["FMA7197"], stomach: ["FMA7148"], kidneys: ["FMA7203"], bladder: ["FMA15900"],
  "femoral-artery": ["FMA70248"], "inferior-vena-cava": ["FMA10951"],
};
const legacyComponents = Object.fromEntries(Object.entries(legacyConceptRoots).map(([id, concepts]) => [id, componentUnion(concepts)]));

function sourceStats(entry) {
  const text = fs.readFileSync(path.join(CACHE, "objs", `${entry.elementId}.obj`), "utf8");
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  let vertexCount = 0, normalCount = 0, triangles = 0;
  forLines(text, line => {
    if (line.startsWith("v ")) { vertexCount++; const xyz = line.trim().split(/\s+/).slice(1, 4).map(Number); if (xyz.some(value => !Number.isFinite(value))) throw Error(`Nonfinite source vertex ${entry.elementId}`); for (let axis = 0; axis < 3; axis++) { bounds.min[axis] = Math.min(bounds.min[axis], xyz[axis]); bounds.max[axis] = Math.max(bounds.max[axis], xyz[axis]); } }
    else if (line.startsWith("vn ")) normalCount++;
    else if (line.startsWith("f ")) triangles += line.trim().split(/\s+/).length - 3;
  });
  if (vertexCount !== entry.vertexCount || triangles !== entry.triangles || normalCount !== vertexCount) throw Error(`Authored source counts mismatch ${entry.elementId}`);
  const authoredName = /# English name\s*:\s*([^\r\n]+)/.exec(text.slice(0, 2000))?.[1].trim() ?? entry.name;
  const classification = classify(entry.elementId, authoredName);
  const volume = /# Volume\(cm3\):\s*([\d.]+)/.exec(text.slice(0, 2000));
  return { id: entry.id, fmaId: entry.fmaId, elementId: entry.elementId, representationId: entry.representationId, name: authoredName, ...classification, bounds, vertexCount, triangles, sourceVolumeCm3: volume ? Number(volume[1]) : undefined, sourceBytes: entry.bytes, sourceSha256: entry.sourceSha256, sourceUrl: entry.sourceUrl, gitBlobSha1: entry.sha, archiveEntry: entry.path, legacyIds: Object.entries(legacyRules).filter(([id, [system, pattern]]) => system === classification.system && (legacyComponents[id]?.has(entry.elementId) || pattern.test(authoredName))).map(([id]) => id), defaultVisible: !skinElements.has(entry.elementId) };
}

function forLines(text, visit) {
  let cursor = 0;
  while (cursor < text.length) {
    let end = text.indexOf("\n", cursor);
    if (end < 0) end = text.length;
    visit(text.slice(cursor, end));
    cursor = end + 1;
  }
}

const stats = sourceEntries
  .map(sourceStats)
  .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
const representationCriteria = {
  scope: "Skeleton surfaces only; identical authored FMA concept, BP representation and English name",
  minimumExtentRatioPerAxis: 0.85,
  minimumSourceVolumeRatio: 0.85,
  maximumCenterDistanceToSmallerDiagonalRatio: 0.1,
  grouping: "Every pair in a group must satisfy every criterion; adjacent or dissimilar bones remain separate",
  default: "Most source triangles, then stable numeric FJ order; original geometry is never moved, blended or dropped",
};
const representationCandidates = new Map();
for (const mesh of stats.filter(mesh => mesh.system === "skeleton")) {
  const key = `${mesh.fmaId}|${mesh.representationId}|${mesh.name.trim().toLowerCase()}`;
  if (!representationCandidates.has(key)) representationCandidates.set(key, []);
  representationCandidates.get(key).push(mesh);
}
function nearRepresentation(a, b) {
  const aExtent = a.bounds.max.map((value, axis) => value - a.bounds.min[axis]);
  const bExtent = b.bounds.max.map((value, axis) => value - b.bounds.min[axis]);
  if (aExtent.some((value, axis) => value <= 0 || bExtent[axis] <= 0 || Math.min(value, bExtent[axis]) / Math.max(value, bExtent[axis]) < representationCriteria.minimumExtentRatioPerAxis)) return false;
  const smallerVolume = Math.min(a.sourceVolumeCm3 ?? 0, b.sourceVolumeCm3 ?? 0);
  const largerVolume = Math.max(a.sourceVolumeCm3 ?? 0, b.sourceVolumeCm3 ?? 0);
  if (smallerVolume <= 0 || smallerVolume / largerVolume < representationCriteria.minimumSourceVolumeRatio) return false;
  const aCenter = a.bounds.min.map((value, axis) => (value + a.bounds.max[axis]) / 2);
  const bCenter = b.bounds.min.map((value, axis) => (value + b.bounds.max[axis]) / 2);
  return Math.hypot(...aCenter.map((value, axis) => value - bCenter[axis])) / Math.min(Math.hypot(...aExtent), Math.hypot(...bExtent)) <= representationCriteria.maximumCenterDistanceToSmallerDiagonalRatio;
}
const representationGroups = [];
for (const candidates of representationCandidates.values()) {
  const ordered = [...candidates].sort((a, b) => b.triangles - a.triangles || a.elementId.localeCompare(b.elementId, "en", { numeric: true }));
  const clusters = [];
  for (const candidate of ordered) {
    const cluster = clusters.find(group => group.every(member => nearRepresentation(member, candidate)));
    if (cluster) cluster.push(candidate); else clusters.push([candidate]);
  }
  for (const group of clusters.filter(group => group.length > 1)) {
    const stable = [...group].sort((a, b) => a.elementId.localeCompare(b.elementId, "en", { numeric: true }))[0];
    const id = `v43:${stable.fmaId}:${stable.representationId}:${stable.elementId.toLowerCase()}`;
    for (const [index, mesh] of group.entries()) { mesh.representationGroup = id; mesh.representationDefault = index === 0; }
    representationGroups.push({ id, defaultId: group[0].id, members: group.map(mesh => ({ id: mesh.id, elementId: mesh.elementId, fmaId: mesh.fmaId, representationId: mesh.representationId, name: mesh.name, sourceTriangles: mesh.triangles, sourceVolumeCm3: mesh.sourceVolumeCm3, sourceBoundsMillimetres: mesh.bounds })) });
  }
}
writeJson(path.join(CACHE, "v43-representation-audit.json"), { criteria: representationCriteria, groups: representationGroups });
const rawBounds = {
  min: [Infinity, Infinity, Infinity],
  max: [-Infinity, -Infinity, -Infinity],
};
for (const mesh of stats)
  for (let a = 0; a < 3; a++) {
    rawBounds.min[a] = Math.min(rawBounds.min[a], mesh.bounds.min[a]);
    rawBounds.max[a] = Math.max(rawBounds.max[a], mesh.bounds.max[a]);
  }
const normalization = {
  scale: 0.001,
  translation: [
    -(rawBounds.min[0] + rawBounds.max[0]) * 0.0005,
    -rawBounds.min[2] * 0.001,
    (rawBounds.min[1] + rawBounds.max[1]) * 0.0005,
  ],
  sourceAxis: "Z-up, -Y-anterior",
  targetAxis: "Y-up, +Z-anterior",
  units: "metres",
  sourceBounds: rawBounds,
};
const audit = {
  objectCount: stats.length,
  sourceTriangles: stats.reduce((s, m) => s + m.triangles, 0),
  sourceVertices: stats.reduce((s, m) => s + m.vertexCount, 0),
  systems: SYSTEMS.map((id) => ({
    id,
    meshCount: stats.filter((m) => m.system === id).length,
    triangles: stats
      .filter((m) => m.system === id)
      .reduce((s, m) => s + m.triangles, 0),
  })),
  normalization,
};
writeJson(path.join(CACHE, "networks-import-audit.json"), {
  ...audit,
  meshes: stats,
});
console.log(JSON.stringify(audit, null, 2));
if (process.argv.includes("--audit-only")) process.exit(0);
await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);

function geometry(mesh) {
  const text = fs.readFileSync(
      path.join(CACHE, "objs", `${mesh.elementId}.obj`),
      "utf8",
    ),
    position = new Float32Array(mesh.vertexCount * 3),
    normal = new Float32Array(mesh.vertexCount * 3),
    indices = new Uint32Array(mesh.triangles * 3);
  let p = 0,
    n = 0,
    f = 0;
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  forLines(text, (line) => {
    if (line.startsWith("v ")) {
      const v = line.trim().split(/\s+/).slice(1).map(Number),
        value = [
          v[0] * 0.001 + normalization.translation[0],
          v[2] * 0.001 + normalization.translation[1],
          -v[1] * 0.001 + normalization.translation[2],
        ];
      for (let a = 0; a < 3; a++) {
        position[p + a] = value[a];
        bounds.min[a] = Math.min(bounds.min[a], position[p + a]);
        bounds.max[a] = Math.max(bounds.max[a], position[p + a]);
      }
      p += 3;
    } else if (line.startsWith("vn ")) {
      const v = line.trim().split(/\s+/).slice(1).map(Number),
        length = Math.hypot(...v);
      if (!length) throw Error(`Zero authored normal ${mesh.id}`);
      normal[n++] = v[0] / length;
      normal[n++] = v[2] / length;
      normal[n++] = -v[1] / length;
    } else if (line.startsWith("f ")) {
      const face = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((token) => {
          const [v, , vn] = token.split("/").map(Number);
          if (!Number.isInteger(v) || v < 1 || v > mesh.vertexCount || vn !== v)
            throw Error(`Unexpected authored normal indexing: ${mesh.id}`);
          return v - 1;
        });
      for (let i = 1; i + 1 < face.length; i++) {
        indices[f++] = face[0];
        indices[f++] = face[i];
        indices[f++] = face[i + 1];
      }
    }
  });
  if (p !== position.length || n !== normal.length || f !== indices.length)
    throw Error(`Source geometry count mismatch: ${mesh.id}`);
  return { position, normal, indices, bounds };
}

function quantization(source) {
  const translation = [...source.bounds.min],
    scale =
      Math.max(...source.bounds.max.map((v, a) => v - translation[a])) / 65535;
  let maxPositionError = 0;
  const count = source.position.length / 3,
    position = new Uint16Array(count * 4),
    normal = new Int16Array(count * 4);
  let maxNormalError = 0;
  for (let i = 0; i < count; i++) {
    let distance = 0;
    for (let a = 0; a < 3; a++) {
      const value = source.position[i * 3 + a],
        q = Math.round((value - translation[a]) / scale);
      position[i * 4 + a] = q;
      distance += (q * scale + translation[a] - value) ** 2;
      normal[i * 4 + a] = Math.round(
        Math.max(-1, Math.min(1, source.normal[i * 3 + a])) * 32767,
      );
    }
    maxPositionError = Math.max(maxPositionError, Math.sqrt(distance));
    const length = Math.hypot(
      normal[i * 4],
      normal[i * 4 + 1],
      normal[i * 4 + 2],
    );
    let dot = 0;
    for (let a = 0; a < 3; a++)
      dot += (normal[i * 4 + a] / length) * source.normal[i * 3 + a];
    const originalLength = Math.hypot(
      source.normal[i * 3],
      source.normal[i * 3 + 1],
      source.normal[i * 3 + 2],
    );
    maxNormalError = Math.max(
      maxNormalError,
      (Math.acos(Math.min(1, Math.max(-1, dot / originalLength))) * 180) /
        Math.PI,
    );
  }
  if (maxNormalError > NORMAL_ERROR_DEGREES)
    throw Error("Authored normal quantization exceeds its bound");
  // The largest body envelopes can exceed the 0.02 mm vector bound on a
  // uniform 16-bit grid; keep float positions and an identity transform there.
  if (maxPositionError > POSITION_ERROR - 0.0000001)
    return {
      position: source.position,
      normal,
      translation: [0, 0, 0],
      scale: 1,
      quantized: false,
      maxPositionError: 0,
      maxNormalError,
    };
  return {
    position,
    normal,
    translation,
    scale,
    quantized: true,
    maxPositionError,
    maxNormalError,
  };
}

function selectVertices(source, encoded, indices) {
  const cloned = Uint32Array.from(indices),
    [remap, count] = MeshoptEncoder.reorderMesh(cloned, true, true);
  const pStride = encoded.quantized ? 4 : 3,
    position = new encoded.position.constructor(count * pStride),
    normal = new Int16Array(count * 4);
  for (let i = 0; i < remap.length; i++)
    if (remap[i] !== 0xffffffff) {
      position.set(
        encoded.position.subarray(i * pStride, (i + 1) * pStride),
        remap[i] * pStride,
      );
      normal.set(encoded.normal.subarray(i * 4, (i + 1) * 4), remap[i] * 4);
    }
  return {
    ...encoded,
    position,
    normal,
    indices: count <= 65535 ? Uint16Array.from(cloned) : cloned,
    vertexCount: count,
  };
}

function makeGlb(items, system, level) {
  const json = {
    asset: {
      version: "2.0",
      generator: "Ippomed coherent BodyParts3D 4.3 importer",
      copyright: ATTRIBUTION,
    },
    extensionsUsed: ["EXT_meshopt_compression", "KHR_mesh_quantization"],
    extensionsRequired: ["EXT_meshopt_compression", "KHR_mesh_quantization"],
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    accessors: [],
    bufferViews: [],
    materials: [
      {
        name: system,
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: colors[system],
          metallicFactor: 0,
          roughnessFactor: 0.65,
        },
      },
    ],
    buffers: [],
  };
  const parts = [];
  let offset = 0,
    fallback = 0;
  const accessor = (
    array,
    count,
    stride,
    componentType,
    type,
    mode,
    normalized = false,
    bounds,
  ) => {
    const raw = new Uint8Array(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      ),
      bytes = MeshoptEncoder.encodeGltfBuffer(raw, count, stride, mode);
    json.bufferViews.push({
      buffer: 1,
      byteOffset: fallback,
      byteLength: raw.length,
      target: mode === "ATTRIBUTES" ? 34962 : 34963,
      ...(mode === "ATTRIBUTES" ? { byteStride: stride } : {}),
      extensions: {
        EXT_meshopt_compression: {
          buffer: 0,
          byteOffset: offset,
          byteLength: bytes.length,
          byteStride: stride,
          count,
          mode,
        },
      },
    });
    parts.push(
      Buffer.from(bytes),
      Buffer.alloc(align(bytes.length) - bytes.length),
    );
    offset += align(bytes.length);
    fallback += align(raw.length);
    json.accessors.push({
      bufferView: json.bufferViews.length - 1,
      componentType,
      count,
      type,
      ...(normalized ? { normalized: true } : {}),
      ...(bounds ?? {}),
    });
    return json.accessors.length - 1;
  };
  for (const { mesh, data } of items) {
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity],
      stride = data.quantized ? 4 : 3;
    for (let i = 0; i < data.vertexCount; i++)
      for (let a = 0; a < 3; a++) {
        const v = data.position[i * stride + a];
        min[a] = Math.min(min[a], v);
        max[a] = Math.max(max[a], v);
      }
    const p = accessor(
      data.position,
      data.vertexCount,
      data.quantized ? 8 : 12,
      data.quantized ? 5123 : 5126,
      "VEC3",
      "ATTRIBUTES",
      false,
      { min, max },
    );
    const n = accessor(
      data.normal,
      data.vertexCount,
      8,
      5122,
      "VEC3",
      "ATTRIBUTES",
      true,
    );
    const i = accessor(
      data.indices,
      data.indices.length,
      data.indices.BYTES_PER_ELEMENT,
      data.indices.BYTES_PER_ELEMENT === 2 ? 5123 : 5125,
      "SCALAR",
      "TRIANGLES",
    );
    json.scenes[0].nodes.push(json.nodes.length);
    json.nodes.push({
      name: mesh.id,
      mesh: json.meshes.length,
      translation: data.translation,
      scale: [data.scale, data.scale, data.scale],
      extras: {
        structureId: mesh.id,
        fmaId: mesh.fmaId,
        elementId: mesh.elementId,
        vascularKind: mesh.vascularKind,
        representationGroup: mesh.representationGroup,
        representationDefault: mesh.representationDefault,
        name: mesh.name,
        system: mesh.system,
        legacyIds: mesh.legacyIds,
        sourceVersion: "4.3",
        level,
        defaultVisible: mesh.defaultVisible,
      },
    });
    json.meshes.push({
      name: mesh.id,
      primitives: [
        { attributes: { POSITION: p, NORMAL: n }, indices: i, material: 0 },
      ],
    });
  }
  json.buffers = [
    { byteLength: offset },
    {
      byteLength: fallback,
      extensions: { EXT_meshopt_compression: { fallback: true } },
    },
  ];
  const text = Buffer.from(JSON.stringify(json)),
    jsonData = Buffer.concat([
      text,
      Buffer.alloc(align(text.length) - text.length, 32),
    ]),
    bin = Buffer.concat(parts);
  const header = Buffer.alloc(12),
    jh = Buffer.alloc(8),
    bh = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jsonData.length + bin.length, 8);
  jh.writeUInt32LE(jsonData.length);
  jh.writeUInt32LE(0x4e4f534a, 4);
  bh.writeUInt32LE(bin.length);
  bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, jsonData, bh, bin]);
}


const records = [],
  preview = Object.fromEntries(SYSTEMS.map((system) => [system, []])),
  provenance = [],
  highFiles = [];
let highBytes = 0,
  maxQuantizedError = 0,
  maxNormalError = 0;
const selected = stats;
for (let ordinal = 0; ordinal < selected.length; ordinal++) {
  const mesh = selected[ordinal],
    source = geometry(mesh),
    encoded = quantization(source),
    high = selectVertices(source, encoded, source.indices);
  maxQuantizedError = Math.max(maxQuantizedError, encoded.maxPositionError);
  maxNormalError = Math.max(maxNormalError, encoded.maxNormalError);
  // MeshoptSimplifier returns an appearance-error estimate, not a medical
  // guarantee. Preview alone is simplified; source HIGH triangles are retained.
  const target = Math.min(
    mesh.triangles,
    Math.max(80, Math.min(12000, Math.floor(mesh.triangles * 0.25))),
  );
  const [baseIndices, error] = MeshoptSimplifier.simplify(
    source.indices,
    source.position,
    3,
    target * 3,
    BASE_ERROR,
    ["ErrorAbsolute", "LockBorder"],
  );
  const base = selectVertices(source, encoded, baseIndices);
  const blobs = [];
  function splitHigh(data, part = "") {
    const bytes = makeGlb([{ mesh, data }], mesh.system, "high");
    if (bytes.length >= MAX_ASSET_BYTES) {
      const count = Math.floor(data.indices.length / 6) * 3;
      if (count < 3) throw Error(`Unsplitable high mesh ${mesh.id}`);
      for (const [suffix, indices] of [
        ["a", data.indices.subarray(0, count)],
        ["b", data.indices.subarray(count)],
      ]) {
        // Existing encoded vertices are compacted again, with the same node transform.
        const child = selectVertices(null, data, Uint32Array.from(indices));
        splitHigh(child, part + suffix);
      }
      return;
    }
    const name = `${mesh.id.toLowerCase()}${part ? `-${part}` : ""}.glb`,
      url = `${PREFIX}/high/${name}`;
    fs.writeFileSync(path.join(OUTPUT, "high", name), bytes);
    highBytes += bytes.length;
    const file = { url, bytes: bytes.length, sha256: hash(bytes) };
    highFiles.push(file);
    blobs.push(file);
  }
  splitHigh(high);
  const lod = {
    ...(blobs.length === 1
      ? { url: blobs[0].url, sha256: blobs[0].sha256 }
      : {}),
    files: blobs.map((file) => file.url),
    bytes: blobs.reduce((s, file) => s + file.bytes, 0),
    triangles: mesh.triangles,
    vertexCount: mesh.vertexCount,
  };
  preview[mesh.system].push({ mesh, data: base });
  records.push({
    id: mesh.id,
    fmaId: mesh.fmaId,
    elementId: mesh.elementId,
    representationId: mesh.representationId,
    ...(mesh.vascularKind ? { vascularKind: mesh.vascularKind } : {}),
    classificationMethod: mesh.classificationMethod,
    ...(mesh.representationGroup ? { representationGroup: mesh.representationGroup, representationDefault: mesh.representationDefault } : {}),
    name: mesh.name,
    normalizedName: mesh.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    system: mesh.system,
    legacyIds: mesh.legacyIds,
    bounds: source.bounds,
    triangles: base.indices.length / 3,
    vertexCount: base.vertexCount,
    sourceVersion: "4.3",
    sourceSha256: mesh.sourceSha256,
    sourceTriangles: mesh.triangles,
    sourceVertexCount: mesh.vertexCount,
    defaultVisible: mesh.defaultVisible,
    lod,
    previewErrorMetres: error,
    quantization: {
      positionBits: encoded.quantized ? 16 : 32,
      positionErrorMetres: encoded.maxPositionError,
      normalBits: 16,
      normalErrorDegrees: encoded.maxNormalError,
      translation: encoded.translation,
      uniformScale: encoded.scale,
    },
  });
  provenance.push({
    id: mesh.id,
    name: mesh.name,
    archiveEntry: mesh.archiveEntry,
    sourceBytes: mesh.sourceBytes,
    sourceSha256: mesh.sourceSha256,
    sourceUrl: mesh.sourceUrl,
    gitBlobSha1: mesh.gitBlobSha1,
    elementId: mesh.elementId,
    fmaId: mesh.fmaId,
    representationId: mesh.representationId,
    system: mesh.system,
    vascularKind: mesh.vascularKind,
    classificationMethod: mesh.classificationMethod,
    representationGroup: mesh.representationGroup,
    representationDefault: mesh.representationDefault,
    sourceVolumeCm3: mesh.sourceVolumeCm3,
    sourceBoundsMillimetres: mesh.bounds,
    sourceTriangles: mesh.triangles,
    sourceVertices: mesh.vertexCount,
  });
  if ((ordinal + 1) % 50 === 0 || ordinal + 1 === selected.length)
    console.log(
      `Converted ${ordinal + 1}/${selected.length} coherent HD sources`,
    );
}

const systems = [],
  baseFiles = [];
for (const system of SYSTEMS) {
  const items = preview[system],
    files = [];
  let batch = [],
    batchRaw = 0;
  const flush = () => {
    if (!batch.length) return;
    const bytes = makeGlb(batch, system, "preview");
    if (bytes.length >= MAX_ASSET_BYTES)
      throw Error(`Preview pack exceeds hosting limit: ${system}`);
    const name = `${system}-${String(files.length + 1).padStart(2, "0")}.glb`,
      url = `${PREFIX}/preview/${name}`;
    fs.writeFileSync(path.join(OUTPUT, "preview", name), bytes);
    files.push(url);
    baseFiles.push({ url, bytes: bytes.length, sha256: hash(bytes) });
    batch = [];
    batchRaw = 0;
  };
  for (const item of items) {
    const raw =
      item.data.position.byteLength +
      item.data.normal.byteLength +
      item.data.indices.byteLength;
    if (batchRaw + raw > 12 * 1024 * 1024) flush();
    batch.push(item);
    batchRaw += raw;
  }
  flush();
  systems.push({
    id: system,
    ...(files.length === 1 ? { url: files[0] } : {}),
    files,
    bytes: baseFiles
      .filter((file) => files.includes(file.url))
      .reduce((s, file) => s + file.bytes, 0),
    meshCount: items.length,
    triangles: items.reduce((s, item) => s + item.data.indices.length / 3, 0),
    highTriangles: stats
      .filter((m) => m.system === system)
      .reduce((s, mesh) => s + mesh.triangles, 0),
  });
}

// Snapshot the preceding public collection once. Its GLBs, notices and isolated
// detail files stay untouched so embedded manifests in older APKs still work.
const legacyManifestPath = path.join(ROOT_OUTPUT, "legacy-manifest.json");
if (!fs.existsSync(legacyManifestPath)) fs.copyFileSync(path.join(ROOT_OUTPUT, "manifest.json"), legacyManifestPath);
const legacyManifest = JSON.parse(fs.readFileSync(legacyManifestPath, "utf8"));
const legacyProvenancePath = path.join(ROOT_OUTPUT, "legacy-provenance.json");
if (!fs.existsSync(legacyProvenancePath)) fs.copyFileSync(path.join(ROOT_OUTPUT, "provenance.json"), legacyProvenancePath);
for (const filename of ["LICENSE.txt", "ATTRIBUTION.txt"]) {
  const legacyFile = path.join(CACHE, `legacy-${filename}`);
  if (!fs.existsSync(legacyFile)) fs.copyFileSync(path.join(ROOT_OUTPUT, filename), legacyFile);
}
const recordById = new Map(records.map(mesh => [mesh.id, mesh]));
const oldIsolated = legacyManifest.isolatedDetails;
const isolatedDetails = oldIsolated ? {
  ...oldIsolated,
  entries: oldIsolated.entries.filter(entry => {
    const target = recordById.get(entry.id);
    return target && target.fmaId === entry.sourceFmaId;
  }),
} : undefined;
const files = [...baseFiles, ...highFiles];
const manifest = {
  version: "4.3",
  schemaVersion: 1,
  datasetId: "bodyparts3d-4.3",
  dataset: "BodyParts3D 4.3",
  status: "ready",
  sourceVersion: "4.3",
  source: SOURCE_URL,
  sourceRelease: "4.3",
  mirror: `https://github.com/${REPO}/tree/${COMMIT}`,
  mirrorCommit: COMMIT,
  license: LICENSE,
  licenseScope: "Active 4.3 v43/ files. Earlier 4.0/4.3 collection and isolated 3.0 files retain their separate legacy notices.",
  licenseUrl: LICENSE_URL,
  attribution: ATTRIBUTION,
  attributionUrl: `${PREFIX}/ATTRIBUTION.txt`,
  licenses: [{ id: LICENSE, url: LICENSE_URL, attribution: ATTRIBUTION }],
  systems,
  meshes: records,
  legacyMapping: Object.fromEntries(Object.keys(legacyRules).map(id => [id, records.filter(mesh => mesh.legacyIds.includes(id)).map(mesh => mesh.id)])),
  normalization: { ...normalization, applied: true, up: "+Y", anterior: "+Z", floorY: 0, sourceUnits: "millimetres", rotationDegreesX: -90 },
  bounds: {
    min: [0, 1, 2].map(axis => Math.min(...records.map(mesh => mesh.bounds.min[axis]))),
    max: [0, 1, 2].map(axis => Math.max(...records.map(mesh => mesh.bounds.max[axis]))),
  },
  classification: {
    roots,
    arterialRoot: "FMA86187",
    venousRoot: "FMA86188",
    officialArterialComponents: arterialSet.size,
    officialVenousComponents: venousSet.size,
    method: "Official FMA2Obj physical component memberships, with explicit source-name classification for branches outside those roots. Vascular membership takes priority. The organs study layer also contains residual tissues, not a claim that every residual surface is an organ.",
  },
  representations: { criteria: representationCriteria, groupCount: representationGroups.length, alternativeSurfaceCount: representationGroups.reduce((sum, group) => sum + group.members.length, 0), groups: representationGroups.map(group => ({ id: group.id, defaultId: group.defaultId, ids: group.members.map(member => member.id) })) },
  lodPolicy: {
    high: "Every original 4.3 source triangle retained; no smoothing, subdivision or geometric decimation",
    preview: "Same coherent 4.3 geometry; 25% target, 80–12000 triangles per element, 0.5 mm estimated appearance error limit, locked boundaries",
    maximumPositionErrorMetres: POSITION_ERROR,
    maximumNormalErrorDegrees: NORMAL_ERROR_DEGREES,
    quantization: "Uniform 16-bit positions where measured vector error <=0.02 mm; float positions otherwise. Signed 16-bit authored normals, normalized. Preview and HIGH share the same transform.",
  },
  files,
  ...(isolatedDetails ? { isolatedDetails } : {}),
};
const serialized = JSON.stringify(manifest, null, 2) + "\n";
fs.writeFileSync(path.join(OUTPUT, "manifest.json"), serialized);
fs.writeFileSync(path.join(ROOT_OUTPUT, "manifest.json"), serialized);
fs.writeFileSync("src/data/bodyparts3d-manifest.json", serialized);
const notice = `${ATTRIBUTION}\nLicense: Creative Commons Attribution-ShareAlike 2.1 Japan (${LICENSE})\n${LICENSE_URL}\nOfficial source: ${SOURCE_URL}\nOfficial source license: https://lifesciencedb.jp/bp3d/info_en/license/index.html\nPinned data mirror: https://github.com/${REPO}/tree/${COMMIT}\nAll preview and HIGH GLB files under v43/ are adaptations distributed under this license.\nAdaptations: source 4.3 only; axes and millimetres converted to Y-up, +Z-anterior metres; authored normals normalized and encoded as signed 16-bit; uniform per-element position quantization with measured vector error <=0.02 mm (float positions otherwise); lossless Meshopt compression and vertex/triangle reordering. Every HIGH source triangle is retained. Preview alone is simplified with a 0.5 mm estimated appearance error limit. No anatomy, fibres, textures or subdivision is generated.\nAll original FJ surfaces remain available, including model alternatives identified in provenance. This is an adult male reference, not exhaustive human anatomy or an independently medically reviewed model. The art license does not describe Ippomed application code.\n`;
for (const filename of ["LICENSE.txt", "ATTRIBUTION.txt"]) {
  fs.writeFileSync(path.join(OUTPUT, filename), notice);
  const previous = fs.readFileSync(path.join(CACHE, `legacy-${filename}`), "utf8");
  fs.writeFileSync(path.join(ROOT_OUTPUT, filename), notice + "\nPRESERVED LEGACY COLLECTION (outside v43/):\n" + previous);
}
const result = {
  dataset: manifest.dataset,
  sourceVersion: "4.3",
  sourceUrl: SOURCE_URL,
  mirror: `https://github.com/${REPO}`,
  mirrorCommit: COMMIT,
  sourceTreeUrl: treeUrl,
  sourceTreeSha256: hash(fs.readFileSync(treeFile)),
  sourceIndexSha256: hash(fs.readFileSync(path.join(CACHE, "v43-source-index.json"))),
  sourceLicense: LICENSE,
  sourceLicenseUrl: LICENSE_URL,
  sourceLicensePage: "https://lifesciencedb.jp/bp3d/info_en/license/index.html",
  attribution: ATTRIBUTION,
  importer: "scripts/import-bodyparts3d-networks.mjs",
  meshoptimizerVersion: "1.1.1",
  integrity: "Each pinned Git LFS pointer is checked against its Git blob SHA-1; actual OBJ bytes are checked against its SHA-256 and size, the CSV face/vertex counts, and the authored version/File/Representation/Concept header. No upstream code executed.",
  normalization: manifest.normalization,
  classification: manifest.classification,
  representations: { criteria: representationCriteria, groups: representationGroups },
  quantization: { maximumPositionErrorMetres: POSITION_ERROR, measuredMaximumPositionErrorMetres: maxQuantizedError, maximumNormalErrorDegrees: NORMAL_ERROR_DEGREES, measuredMaximumNormalErrorDegrees: maxNormalError },
  files,
  metadata: [
    { path: "MANIFEST.csv", local: "MANIFEST.csv" },
    { path: "metadata/FMA2Obj.txt", local: "FMA2Obj.txt" },
  ].map(({ path: upstreamPath, local }) => ({ path: upstreamPath, url: SOURCE_ROOT + upstreamPath, sha256: hash(fs.readFileSync(path.join(CACHE, local))), gitBlobSha1: treeEntries.get(upstreamPath).sha })),
  meshes: provenance,
  legacyCollection: { manifest: "/anatomy/bodyparts3d/legacy-manifest.json", provenance: "/anatomy/bodyparts3d/legacy-provenance.json", filesUnchanged: true },
};
writeJson(path.join(OUTPUT, "provenance.json"), result);
writeJson(path.join(ROOT_OUTPUT, "provenance.json"), result);
console.log(JSON.stringify({
  meshCount: records.length,
  sourceTriangles: records.reduce((sum, mesh) => sum + mesh.lod.triangles, 0),
  sourceVertices: records.reduce((sum, mesh) => sum + mesh.sourceVertexCount, 0),
  previewTriangles: records.reduce((sum, mesh) => sum + mesh.triangles, 0),
  highFiles: highFiles.length,
  highMiB: highBytes / 1048576,
  previewFiles: baseFiles.length,
  previewMiB: baseFiles.reduce((sum, file) => sum + file.bytes, 0) / 1048576,
  downloadedMiB: downloadedBytes / 1048576,
  maxQuantizedErrorMetres: maxQuantizedError,
  maxNormalErrorDegrees: maxNormalError,
  systems: systems.map(system => ({ id: system.id, meshes: system.meshCount, previewTriangles: system.triangles, highTriangles: system.highTriangles })),
  vascularKinds: Object.fromEntries(["artery", "vein", "other"].map(kind => [kind, records.filter(mesh => mesh.vascularKind === kind).length])),
  representationGroups: representationGroups.length,
}, null, 2));
