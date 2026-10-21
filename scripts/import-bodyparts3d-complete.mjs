/**
 * A coherent BodyParts3D 3.0 atlas. All high and preview meshes come from
 * the same official 95% archive; never register or combine other versions.
 * Raw OBJ files stay in .local. Published derivatives retain CC BY-SA 2.1 JP.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { crc32, inflateRawSync } from "node:zlib";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const SOURCE_ROOT =
  "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/";
const SOURCE_URL = `${SOURCE_ROOT}BodyParts3D_3.0_obj_95.zip`;
const LICENSE = "CC-BY-SA-2.1-JP";
const LICENSE_URL = "https://creativecommons.org/licenses/by-sa/2.1/jp/";
const ATTRIBUTION =
  "BodyParts3D, Copyright(C) 2010-2011 The Database Center for Life Science licensed under CC Attribution-ShareAlike 2.1 Japan";
const CACHE = path.resolve(".local/bodyparts3d-3.0-95");
const OUTPUT = path.resolve("public/anatomy/bodyparts3d-complete");
const PREFIX = "/anatomy/bodyparts3d-complete";
const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const POSITION_ERROR = 0.00002;
const NORMAL_ERROR_DEGREES = 1;
const BASE_ERROR = 0.0005;
const SYSTEMS = ["skeleton", "muscles", "organs", "nerves", "vessels"];
const ENVELOPES = new Set([
  "FMA7163",
  "FMA70751",
  "FMA70754",
  "FMA71098",
  "FMA46768",
]);
const colors = {
  skeleton: [0.82, 0.78, 0.66, 1],
  muscles: [0.64, 0.22, 0.2, 1],
  organs: [0.63, 0.34, 0.36, 1],
  nerves: [0.9, 0.73, 0.28, 1],
  vessels: [0.76, 0.16, 0.2, 1],
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const align = (value) => (value + 3) & ~3;
const basename = (value) => value.split(/[\\/]/).at(-1);
const writeJson = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
fs.mkdirSync(path.join(CACHE, "objs"), { recursive: true });
fs.mkdirSync(path.join(OUTPUT, "high"), { recursive: true });
fs.mkdirSync(path.join(OUTPUT, "preview"), { recursive: true });

let downloadedBytes = 0;
async function range(start, end) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(SOURCE_URL, {
        headers: { Range: `bytes=${start}-${end}` },
        signal: AbortSignal.timeout(90000),
      });
      if (
        response.status !== 206 ||
        !response.headers
          .get("content-range")
          ?.startsWith(`bytes ${start}-${end}/`)
      )
        throw Error(
          `Official source ignored the byte range (HTTP ${response.status}); refusing a whole-archive download`,
        );
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length !== end - start + 1)
        throw Error("Truncated official source range");
      downloadedBytes += bytes.length;
      return bytes;
    } catch (issue) {
      if (attempt === 3) throw issue;
    }
  }
}

async function sourceIndex() {
  const file = path.join(CACHE, "index.json");
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (
      data.sourceUrl !== SOURCE_URL ||
      data.entries.filter((e) => e.name.endsWith(".obj")).length !== 934
    )
      throw Error("Unexpected cached BodyParts3D 3.0 source index");
    return data;
  }
  const head = await fetch(SOURCE_URL, {
    method: "HEAD",
    signal: AbortSignal.timeout(30000),
  });
  const archiveBytes = Number(head.headers.get("content-length"));
  if (!head.ok || !Number.isSafeInteger(archiveBytes))
    throw Error("Official source length unavailable");
  const tail = await range(archiveBytes - 131072, archiveBytes - 1);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--)
    if (tail.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw Error("ZIP end record missing");
  const length = tail.readUInt32LE(eocd + 12),
    offset = tail.readUInt32LE(eocd + 16);
  const central = await range(offset, offset + length - 1),
    entries = [];
  for (let cursor = 0; cursor < central.length;) {
    if (central.readUInt32LE(cursor) !== 0x02014b50)
      throw Error("Invalid central-directory signature");
    const names = central.readUInt16LE(cursor + 28),
      extra = central.readUInt16LE(cursor + 30),
      comment = central.readUInt16LE(cursor + 32);
    entries.push({
      name: central.subarray(cursor + 46, cursor + 46 + names).toString("utf8"),
      compression: central.readUInt16LE(cursor + 10),
      crc32: central.readUInt32LE(cursor + 16),
      compressedBytes: central.readUInt32LE(cursor + 20),
      bytes: central.readUInt32LE(cursor + 24),
      offset: central.readUInt32LE(cursor + 42),
    });
    cursor += 46 + names + extra + comment;
  }
  const data = {
    sourceUrl: SOURCE_URL,
    archiveBytes,
    centralDirectorySha256: hash(central),
    entries,
  };
  writeJson(file, data);
  return data;
}

const index = await sourceIndex();
const sourceEntries = index.entries.filter((e) => e.name.endsWith(".obj"));
for (const name of [
  "parts_list_e.txt",
  "conventional_part_of.txt",
  "composite_parts.txt",
  "README_e.html",
]) {
  const file = path.join(CACHE, name);
  if (!fs.existsSync(file)) {
    const response = await fetch(SOURCE_ROOT + name, {
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw Error(`Official metadata unavailable: ${name}`);
    fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  }
}
const rows = (name) =>
  fs
    .readFileSync(path.join(CACHE, name), "utf8")
    .split(/\r?\n/)
    .map((line) => line.split("\t"));
const names = new Map(
  rows("parts_list_e.txt").filter(([id, name]) => /^(FMA|BP)/.test(id) && name),
);
const children = new Map();
for (const [parent, , child] of rows("conventional_part_of.txt")) {
  if (!/^(FMA|BP)/.test(parent) || !child) continue;
  if (!children.has(parent)) children.set(parent, new Set());
  children.get(parent).add(child);
}
// Composite tables also include terminal identities not directly represented by
// an edge. Union both official relationships; never infer medical membership.
for (const [parent, , child] of rows("composite_parts.txt")) {
  if (!/^(FMA|BP)/.test(parent) || !child) continue;
  if (!children.has(parent)) children.set(parent, new Set());
  children.get(parent).add(child);
}
const descendants = (roots) => {
  const found = new Set(),
    pending = [...roots];
  while (pending.length) {
    const id = pending.pop();
    if (found.has(id)) continue;
    found.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  return found;
};
const muscleSet = descendants(["FMA72954"]),
  skeletonSet = descendants(["FMA23881", "FMA23878"]),
  nervousSet = descendants(["FMA7157"]),
  cardiovascularSet = descendants(["FMA7161"]);
const vesselName =
  /artery|arteries|arterial|vein|veins|venous|aorta|pulmonary trunk|coronary sinus|vena cava/i;
const systemFor = (id, name) =>
  muscleSet.has(id)
    ? "muscles"
    : skeletonSet.has(id)
      ? "skeleton"
      : nervousSet.has(id)
        ? "nerves"
        : cardiovascularSet.has(id) && vesselName.test(name)
          ? "vessels"
          : "organs";
const legacyRules = {
  clavicle: ["skeleton", /^clavicle$/],
  scapula: ["skeleton", /^scapula$/],
  humerus: ["skeleton", /^humerus$/],
  radius: ["skeleton", /^radius$/],
  ulna: ["skeleton", /^ulna$/],
  femur: ["skeleton", /^femur$/],
  pelvis: ["skeleton", /^bony pelvis$/],
  patella: ["skeleton", /^patella$/],
  tibia: ["skeleton", /^tibia$/],
  deltoid: ["muscles", /\bdeltoid\b/],
  biceps: ["muscles", /\bbiceps brachii\b/],
  triceps: ["muscles", /\btriceps brachii\b/],
  "pectoralis-major": ["muscles", /\bpectoralis major\b/],
  "rectus-abdominis": ["muscles", /\brectus abdominis\b/],
  quadriceps: [
    "muscles",
    /\b(quadriceps femoris|rectus femoris|vastus lateralis|vastus medialis|vastus intermedius)\b/,
  ],
  diaphragm: ["muscles", /^diaphragm$/],
  "median-nerve": ["nerves", /\bmedian nerve\b/],
  "ulnar-nerve": ["nerves", /\bulnar nerve\b/],
  "radial-nerve": ["nerves", /\bradial nerve\b/],
  "sciatic-nerve": ["nerves", /\bsciatic nerve\b/],
  "femoral-nerve": ["nerves", /\bfemoral nerve\b/],
  "tibial-nerve": ["nerves", /\btibial nerve\b/],
  "brachial-plexus": ["nerves", /\bbrachial (?:nerve )?plexus\b/],
  "spinal-cord": ["nerves", /^spinal cord$/],
  heart: ["organs", /^heart$/],
  lungs: ["organs", /^(?:(?:right|left) )?lungs?$/],
  liver: ["organs", /^liver$/],
  stomach: ["organs", /^stomach$/],
  kidneys: ["organs", /^kidney$/],
  bladder: ["organs", /^urinary bladder$/],
  aorta: ["vessels", /^aorta$/],
  carotid: ["vessels", /^common carotid artery$/],
  "subclavian-artery": ["vessels", /^subclavian artery$/],
  "femoral-artery": ["vessels", /^femoral artery$/],
  "inferior-vena-cava": ["vessels", /^inferior vena cava$/],
  "pulmonary-artery": ["vessels", /^(pulmonary artery|pulmonary trunk)$/],
};
const legacySets = Object.fromEntries(
  Object.entries(legacyRules).map(([id, [, pattern]]) => [
    id,
    descendants(
      [...names].filter(([, name]) => pattern.test(name)).map(([key]) => key),
    ),
  ]),
);
// The only represented descendant is the central canal, not spinal cord tissue.
// A canal must never silently stand in for the missing physical cord.
legacySets["spinal-cord"] = new Set();

// Fetch each missing object independently and verify its original ZIP CRC.
// The small overshoot combines local header and compressed content in one GET.
const queue = [...sourceEntries];
let verified = 0;
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const entry = queue.shift(),
        id = basename(entry.name).replace(/\.obj$/, ""),
        file = path.join(CACHE, "objs", `${id}.obj`);
      let obj = fs.existsSync(file) ? fs.readFileSync(file) : null;
      if (!obj || obj.length !== entry.bytes || crc32(obj) !== entry.crc32) {
        const data = await range(
          entry.offset,
          Math.min(
            index.archiveBytes - 1,
            entry.offset + entry.compressedBytes + 4095,
          ),
        );
        if (data.readUInt32LE(0) !== 0x04034b50)
          throw Error(`Invalid ZIP local header: ${id}`);
        const offset = 30 + data.readUInt16LE(26) + data.readUInt16LE(28);
        if (offset + entry.compressedBytes > data.length)
          throw Error(`Unexpected ZIP extra field: ${id}`);
        const compressed = data.subarray(
          offset,
          offset + entry.compressedBytes,
        );
        obj =
          entry.compression === 8
            ? inflateRawSync(compressed)
            : entry.compression === 0
              ? compressed
              : null;
        if (!obj || obj.length !== entry.bytes || crc32(obj) !== entry.crc32)
          throw Error(`Source CRC mismatch: ${id}`);
        fs.writeFileSync(file, obj);
      }
      if (++verified % 100 === 0 || verified === sourceEntries.length)
        console.log(
          `Verified ${verified}/${sourceEntries.length} official sources`,
        );
    }
  }),
);

function forLines(text, visit) {
  let cursor = 0;
  while (cursor < text.length) {
    let end = text.indexOf("\n", cursor);
    if (end < 0) end = text.length;
    visit(text.slice(cursor, end));
    cursor = end + 1;
  }
}
function sourceStats(entry) {
  const id = basename(entry.name).replace(/\.obj$/, ""),
    obj = fs.readFileSync(path.join(CACHE, "objs", `${id}.obj`)),
    text = obj.toString("utf8");
  let vertexCount = 0,
    triangles = 0,
    normalCount = 0;
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  forLines(text, (line) => {
    if (line.startsWith("v ")) {
      vertexCount++;
      const values = line.trim().split(/\s+/);
      for (let a = 0; a < 3; a++) {
        const value = Number(values[a + 1]);
        bounds.min[a] = Math.min(bounds.min[a], value);
        bounds.max[a] = Math.max(bounds.max[a], value);
      }
    } else if (line.startsWith("vn ")) normalCount++;
    else if (line.startsWith("f "))
      triangles += line.trim().split(/\s+/).length - 3;
  });
  const name = names.get(id);
  if (!name || !triangles || vertexCount !== normalCount)
    throw Error(`Unsupported source geometry: ${id}`);
  const system = systemFor(id, name);
  return {
    id,
    name,
    system,
    bounds,
    vertexCount,
    triangles,
    sourceBytes: obj.length,
    sourceSha256: hash(obj),
    archiveEntry: entry.name,
    crc32: entry.crc32,
    legacyIds: Object.entries(legacyRules)
      .filter(([key, [target]]) => target === system && legacySets[key].has(id))
      .map(([key]) => key),
    defaultVisible: !ENVELOPES.has(id),
  };
}
const stats = sourceEntries
  .map(sourceStats)
  .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
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
writeJson(path.join(CACHE, "complete-import-audit.json"), {
  ...audit,
  meshes: stats,
});
console.log(JSON.stringify(audit, null, 2));
if (process.argv.includes("--audit-only")) process.exit(0);
await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);

function geometry(mesh) {
  const text = fs.readFileSync(
      path.join(CACHE, "objs", `${mesh.id}.obj`),
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
      generator: "Ippomed coherent BodyParts3D 3.0 importer",
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
        fmaId: mesh.id.startsWith("FMA") ? mesh.id : null,
        name: mesh.name,
        system: mesh.system,
        legacyIds: mesh.legacyIds,
        sourceVersion: "3.0",
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
const selected = process.argv.includes("--fixture")
  ? stats.filter((m) =>
      ["FMA34682", "FMA13377", "FMA13378", "FMA13336", "FMA7647"].includes(
        m.id,
      ),
    )
  : stats;
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
    Math.max(80, Math.min(12000, Math.floor(mesh.triangles * 0.1))),
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
    fmaId: mesh.id.startsWith("FMA") ? mesh.id : null,
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
    sourceVersion: "3.0",
    sourceSha256: mesh.sourceSha256,
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
    crc32: mesh.crc32,
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
const manifest = {
  version: "3.0",
  schemaVersion: 1,
  datasetId: "bodyparts3d-3.0-95",
  dataset: "BodyParts3D 3.0",
  status: process.argv.includes("--fixture") ? "fixture" : "ready",
  sourceVersion: "3.0",
  source: SOURCE_URL,
  sourceRelease: "2011-09-15",
  license: LICENSE,
  licenseUrl: LICENSE_URL,
  attribution: ATTRIBUTION,
  attributionUrl: `${PREFIX}/ATTRIBUTION.txt`,
  systems,
  meshes: records,
  legacyMapping: Object.fromEntries(
    Object.keys(legacyRules).map((id) => [
      id,
      records
        .filter((mesh) => mesh.legacyIds.includes(id))
        .map((mesh) => mesh.id),
    ]),
  ),
  normalization,
  bounds: {
    min: [0, 1, 2].map((axis) =>
      Math.min(...records.map((mesh) => mesh.bounds.min[axis])),
    ),
    max: [0, 1, 2].map((axis) =>
      Math.max(...records.map((mesh) => mesh.bounds.max[axis])),
    ),
  },
  lodPolicy: {
    high: "Original source triangles; no subdivision, smoothing or decimation",
    preview:
      "MeshoptSimplifier from the same 3.0/95 geometry; 10% target, 80–12000 triangles per element, 0.5 mm estimated appearance error limit, locked boundaries",
    maximumPositionErrorMetres: POSITION_ERROR,
    maximumNormalErrorDegrees: NORMAL_ERROR_DEGREES,
    quantization:
      "Uniform 16-bit per-element positions where the measured Euclidean error is <=0.02 mm; float positions otherwise. Signed normalized 16-bit authored normals. Identical node transform for preview and high.",
  },
  files: [...baseFiles, ...highFiles],
};
const serialized = JSON.stringify(manifest, null, 2) + "\n";
fs.writeFileSync(path.join(OUTPUT, "manifest.json"), serialized);
fs.writeFileSync("src/data/bodyparts3d-complete-manifest.json", serialized);
const notice = `${ATTRIBUTION}\nLicense: Creative Commons Attribution-ShareAlike 2.1 Japan (${LICENSE})\n${LICENSE_URL}\nOfficial source: ${SOURCE_URL}\nOfficial release README and license: ${SOURCE_ROOT}README_e.html\nAll preview and high GLB files in this directory are adaptations distributed under this same license.\nAdaptations: coherent source 3.0 only; axes and millimetres converted to Y-up, +Z-anterior metres; per-element uniform 16-bit position quantization with measured Euclidean error <=0.02 mm (float positions otherwise); authored normals normalized and encoded as signed 16-bit with measured angular error <1 degree; lossless Meshopt coding and vertex/triangle reordering. High detail retains every source triangle without geometric decimation. Preview alone uses MeshoptSimplifier with a 0.5 mm estimated appearance error limit; neither generated detail nor subdivision is added. Source meshes and missing structures are not invented.\nThese art assets have their own license; application code is separate.\n`;
fs.writeFileSync(path.join(OUTPUT, "LICENSE.txt"), notice);
fs.writeFileSync(path.join(OUTPUT, "ATTRIBUTION.txt"), notice);
writeJson(path.join(OUTPUT, "provenance.json"), {
  dataset: manifest.dataset,
  sourceVersion: "3.0",
  sourceUrl: SOURCE_URL,
  sourceArchiveBytes: index.archiveBytes,
  sourceIndexSha256: hash(fs.readFileSync(path.join(CACHE, "index.json"))),
  sourceLicense: LICENSE,
  sourceLicenseUrl: LICENSE_URL,
  sourceReadme: `${SOURCE_ROOT}README_e.html`,
  attribution: ATTRIBUTION,
  importer: "scripts/import-bodyparts3d-complete.mjs",
  meshoptimizerVersion: "1.1.1",
  normalization,
  quantization: {
    maximumPositionErrorMetres: POSITION_ERROR,
    measuredMaximumPositionErrorMetres: maxQuantizedError,
    maximumNormalErrorDegrees: NORMAL_ERROR_DEGREES,
    measuredMaximumNormalErrorDegrees: maxNormalError,
  },
  files: [...baseFiles, ...highFiles],
  metadata: [
    "parts_list_e.txt",
    "conventional_part_of.txt",
    "composite_parts.txt",
    "README_e.html",
  ].map((name) => ({
    name,
    url: SOURCE_ROOT + name,
    sha256: hash(fs.readFileSync(path.join(CACHE, name))),
  })),
  meshes: provenance,
});
console.log(
  JSON.stringify(
    {
      meshCount: records.length,
      sourceTriangles: records.reduce((s, m) => s + m.lod.triangles, 0),
      previewTriangles: records.reduce((s, m) => s + m.triangles, 0),
      highFiles: highFiles.length,
      highMiB: highBytes / 1048576,
      previewFiles: baseFiles.length,
      previewMiB: baseFiles.reduce((s, f) => s + f.bytes, 0) / 1048576,
      downloadedMiB: downloadedBytes / 1048576,
      maxQuantizedErrorMetres: maxQuantizedError,
      maxNormalErrorDegrees: maxNormalError,
    },
    null,
    2,
  ),
);
