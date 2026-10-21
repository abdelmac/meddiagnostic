/**
 * Rebuild the public BodyParts3D 4.0 assets from the official archive cache.
 * No decimation: source triangle topology is preserved. Run after downloading
 * the ISA/PARTOF ZIPs and metadata into .local/bodyparts3d (never public).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { unzipSync } from "fflate";
import { MeshoptEncoder } from "meshoptimizer";

const cache = path.resolve(".local/bodyparts3d");
const output = path.resolve("public/anatomy/bodyparts3d");
const base = "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/";
const publicBase = "/anatomy/bodyparts3d/";
const LIMIT = 23 * 1024 * 1024;
const systems = ["skeleton", "muscles", "organs", "nerves", "vessels"];
const attribution =
  "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International";
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const tables = ["isa", "partof"];
const concepts = new Map();
const provenance = [];
for (const table of tables) {
  const metadata = `${table}_parts_list_e.txt`;
  const elements = `${table}_element_parts.txt`;
  for (const filename of [metadata, elements]) {
    const bytes = fs.readFileSync(path.join(cache, filename));
    provenance.push({
      url: base + filename,
      bytes: bytes.length,
      sha256: sha(bytes),
    });
  }
  for (const line of fs
    .readFileSync(path.join(cache, metadata), "utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)) {
    const [id, representationId, name] = line.split("\t");
    if (!concepts.has(id))
      concepts.set(id, { id, representationId, name, elements: new Set() });
  }
  for (const line of fs
    .readFileSync(path.join(cache, elements), "utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)) {
    const [id, name, element] = line.split("\t");
    if (!concepts.has(id))
      concepts.set(id, {
        id,
        representationId: null,
        name,
        elements: new Set(),
      });
    concepts.get(id).elements.add(element);
  }
}
const roots = {
  skeleton: ["FMA5018", "FMA23881"],
  muscles: [
    "FMA5022",
    "FMA32558",
    "FMA13295",
    "FMA10474",
    "FMA85453",
    "FMA32555",
    "FMA32557",
  ],
  nerves: ["FMA7157", "FMA65132", "FMA5913", "FMA5884", "FMA67242", "FMA83929"],
  vessels: [
    "FMA50720",
    "FMA50723",
    "FMA3711",
    "FMA3734",
    "FMA10951",
    "FMA86187",
    "FMA86188",
    "FMA50722",
  ],
  organs: [
    "FMA7152",
    "FMA7158",
    "FMA7159",
    "FMA7160",
    "FMA9668",
    "FMA7088",
    "FMA67498",
  ],
};
const groupSets = Object.fromEntries(
  Object.entries(roots).map(([system, ids]) => [
    system,
    new Set(ids.flatMap((id) => [...(concepts.get(id)?.elements ?? [])])),
  ]),
);
// Retain the real skin shell for explicit study, but mark it hidden by default
// so a viewer can expose internal organs without an opaque outer envelope.
const skinElements = [...(concepts.get("FMA7163")?.elements ?? [])];
// Anatomical systems overlap. Give each physical surface one home, without
// duplicating diaphragm/heart/vessel meshes from different taxonomies.
const priority = ["muscles", "skeleton", "nerves", "vessels", "organs"];
const systemFor = (element) =>
  priority.find((system) => groupSets[system].has(element));
const wanted = new Set(priority.flatMap((system) => [...groupSets[system]]));
const sourceMeshes = new Map();
for (const table of tables) {
  const filename = `${table}_BP3D_4.0_obj_99.zip`;
  const bytes = fs.readFileSync(path.join(cache, filename));
  provenance.push({
    url: base + filename,
    bytes: bytes.length,
    sha256: sha(bytes),
  });
  const unpacked = unzipSync(bytes, {
    filter: (file) => {
      const id = path.basename(file.name, ".obj");
      return (
        file.name.endsWith(".obj") && wanted.has(id) && !sourceMeshes.has(id)
      );
    },
  });
  for (const [filename, obj] of Object.entries(unpacked)) {
    const id = path.basename(filename, ".obj");
    sourceMeshes.set(id, { obj, archive: table });
  }
  console.log(
    `${table}: ${Object.keys(unpacked).length} selected OBJ meshes, ${Math.round(bytes.length / 1048576)} MiB archive.`,
  );
}
const missing = [...wanted].filter((id) => !sourceMeshes.has(id));
if (missing.length)
  console.log(
    `Source concepts reference ${missing.length} unavailable elements; these are excluded, never invented.`,
  );

const candidates = new Map();
for (const concept of concepts.values()) {
  for (const element of concept.elements) {
    if (!sourceMeshes.has(element)) continue;
    if (!candidates.has(element)) candidates.set(element, []);
    candidates.get(element).push(concept);
  }
}
const compareConcepts = (a, b) =>
  a.elements.size - b.elements.size ||
  Number(/\b(left|right)\b/.test(b.name)) -
    Number(/\b(left|right)\b/.test(a.name)) ||
  a.id.localeCompare(b.id, "en", { numeric: true });

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
  diaphragm: ["muscles", /\bdiaphragm\b/],
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
const legacyElements = Object.fromEntries(
  Object.entries(legacyRules).map(([id, [, pattern]]) => [
    id,
    new Set(
      [...concepts.values()]
        .filter((concept) => pattern.test(concept.name))
        .flatMap((concept) => [...concept.elements]),
    ),
  ]),
);

// The separately licensed 4.3 supplement is never combined into the BY-4.0
// files. The source metadata includes per-file checksums and a pinned mirror.
const highresDirectory = path.resolve(".local/bodyparts3d-highres");
const highresPath = path.join(highresDirectory, "nerve-metadata.json");
const highres = fs.existsSync(highresPath)
  ? JSON.parse(fs.readFileSync(highresPath, "utf8"))
  : null;
let supplementCount = 0;
if (highres) {
  for (const metadata of highres.meshes) {
    // These three vascular plexuses were caught by the source-name search;
    // retain their correctly grouped 4.0 surfaces instead of calling them nerves.
    if (/venous plexus|pterygoid plexus/i.test(metadata.name)) continue;
    const obj = fs.readFileSync(
      path.join(highresDirectory, "objs", metadata.file),
    );
    if (obj.length !== metadata.bytes || sha(obj) !== metadata.sha256)
      throw Error(
        `High-resolution source checksum mismatch: ${metadata.elementId}`,
      );
    sourceMeshes.set(metadata.elementId, {
      obj,
      archive: "highres-4.3",
      metadata,
    });
    supplementCount++;
  }
  provenance.push({
    dataset: highres.dataset,
    source: highres.originalSource,
    mirror: highres.mirror,
    commit: highres.commit,
    license: highres.license,
    files: highres.meshes
      .filter((mesh) => !/venous plexus|pterygoid plexus/i.test(mesh.name))
      .map(({ elementId, sourceUrl, bytes, sha256 }) => ({
        elementId,
        url: sourceUrl,
        bytes,
        sha256,
      })),
  });
  console.log(
    `4.3 supplement: ${supplementCount} neural meshes, source checksums verified; overlapping FJ elements replace earlier surfaces.`,
  );
}

function parseOBJ(bytes, label) {
  const vertices = [];
  const indices = [];
  for (const line of Buffer.from(bytes).toString("utf8").split(/\r?\n/)) {
    if (line.startsWith("v ")) {
      const values = line.trim().split(/\s+/).slice(1, 4).map(Number);
      if (
        values.length !== 3 ||
        values.some((value) => !Number.isFinite(value))
      )
        throw Error(`Invalid vertex: ${label}`);
      vertices.push(...values);
    } else if (line.startsWith("f ")) {
      const face = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((item) => {
          const index = Number(item.split("/")[0]);
          return index < 0 ? vertices.length / 3 + index : index - 1;
        });
      for (let i = 1; i + 1 < face.length; i++)
        indices.push(face[0], face[i], face[i + 1]);
    }
  }
  if (
    !vertices.length ||
    !indices.length ||
    indices.some(
      (index) =>
        !Number.isInteger(index) || index < 0 || index >= vertices.length / 3,
    )
  )
    throw Error(`Invalid OBJ mesh: ${label}`);
  return {
    positions: Float32Array.from(vertices),
    indices: Uint32Array.from(indices),
  };
}
const parsed = [];
const originalBounds = {
  min: [Infinity, Infinity, Infinity],
  max: [-Infinity, -Infinity, -Infinity],
};
for (const elementId of [...sourceMeshes.keys()].sort((a, b) =>
  a.localeCompare(b, "en", { numeric: true }),
)) {
  const source = sourceMeshes.get(elementId);
  const concept = source.metadata
    ? { ...source.metadata, id: source.metadata.fmaId }
    : candidates.get(elementId).sort(compareConcepts)[0];
  const geometry = parseOBJ(source.obj, elementId);
  source.obj = null;
  for (let i = 0; i < geometry.positions.length; i++) {
    const axis = i % 3;
    originalBounds.min[axis] = Math.min(
      originalBounds.min[axis],
      geometry.positions[i],
    );
    originalBounds.max[axis] = Math.max(
      originalBounds.max[axis],
      geometry.positions[i],
    );
  }
  const system = source.metadata ? "nerves" : systemFor(elementId);
  parsed.push({
    ...geometry,
    id: `${concept.id}_${elementId}`,
    fmaId: concept.id,
    elementId,
    representationId: concept.representationId,
    name: concept.name,
    nameNormalized: concept.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    system,
    archive: source.archive,
    sourceVersion: source.metadata ? "4.3" : "4.0",
    license: source.metadata ? highres.license : "CC-BY-4.0",
    defaultVisible: !skinElements.includes(elementId),
    legacyIds: Object.entries(legacyRules)
      .filter(
        ([id, [legacySystem, pattern]]) =>
          legacySystem === system &&
          (legacyElements[id].has(elementId) ||
            (source.metadata && pattern.test(concept.name.toLowerCase()))),
      )
      .map(([id]) => id),
  });
}
const centerX = (originalBounds.min[0] + originalBounds.max[0]) / 2;
const centerY = (originalBounds.min[1] + originalBounds.max[1]) / 2;
const minZ = originalBounds.min[2];
const globalBounds = {
  min: [Infinity, Infinity, Infinity],
  max: [-Infinity, -Infinity, -Infinity],
};
for (const mesh of parsed) {
  const p = mesh.positions;
  mesh.bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i],
      y = p[i + 1],
      z = p[i + 2];
    p[i] = (x - centerX) / 1000;
    p[i + 1] = (z - minZ) / 1000;
    p[i + 2] = -(y - centerY) / 1000;
    for (let a = 0; a < 3; a++) {
      mesh.bounds.min[a] = Math.min(mesh.bounds.min[a], p[i + a]);
      mesh.bounds.max[a] = Math.max(mesh.bounds.max[a], p[i + a]);
      globalBounds.min[a] = Math.min(globalBounds.min[a], p[i + a]);
      globalBounds.max[a] = Math.max(globalBounds.max[a], p[i + a]);
    }
  }
  mesh.normals = new Float32Array(p.length);
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const a = mesh.indices[i] * 3,
      b = mesh.indices[i + 1] * 3,
      c = mesh.indices[i + 2] * 3;
    const ab = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
    const ac = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
    const n = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    for (const v of [a, b, c])
      for (let axis = 0; axis < 3; axis++) mesh.normals[v + axis] += n[axis];
  }
  for (let i = 0; i < mesh.normals.length; i += 3) {
    const length = Math.hypot(
      mesh.normals[i],
      mesh.normals[i + 1],
      mesh.normals[i + 2],
    );
    if (length) for (let a = 0; a < 3; a++) mesh.normals[i + a] /= length;
    else mesh.normals[i + 1] = 1;
  }
}
console.log(
  JSON.stringify(
    {
      meshCount: parsed.length,
      triangles: parsed.reduce((sum, mesh) => sum + mesh.indices.length / 3, 0),
      sourceBounds: originalBounds,
      normalizedBounds: globalBounds,
      systems: Object.fromEntries(
        systems.map((system) => [
          system,
          {
            meshes: parsed.filter((mesh) => mesh.system === system).length,
            triangles: parsed
              .filter((mesh) => mesh.system === system)
              .reduce((sum, mesh) => sum + mesh.indices.length / 3, 0),
          },
        ]),
      ),
    },
    null,
    2,
  ),
);
if (process.argv.includes("--stats-only")) process.exit(0);

await MeshoptEncoder.ready;
fs.mkdirSync(output, { recursive: true });
const align4 = (size) => (size + 3) & ~3;
const bytesOf = (array) =>
  new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
const colors = {
  skeleton: [0.82, 0.78, 0.66, 1],
  muscles: [0.64, 0.22, 0.2, 1],
  organs: [0.63, 0.34, 0.36, 1],
  nerves: [0.9, 0.73, 0.28, 1],
  vessels: [0.76, 0.16, 0.2, 1],
};
function glb(meshes, system, copyright = attribution) {
  const json = {
    asset: {
      version: "2.0",
      generator: "Ippomed BodyParts3D importer",
      copyright,
    },
    extensionsUsed: ["EXT_meshopt_compression"],
    extensionsRequired: ["EXT_meshopt_compression"],
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    accessors: [],
    bufferViews: [],
    materials: [
      {
        name: system,
        pbrMetallicRoughness: {
          baseColorFactor: colors[system],
          metallicFactor: 0,
          roughnessFactor: 0.65,
        },
        doubleSided: true,
      },
    ],
    buffers: [],
  };
  const parts = [];
  let compressedOffset = 0;
  let fallbackOffset = 0;
  const accessor = (
    array,
    count,
    stride,
    type,
    componentType,
    mode,
    bounds,
  ) => {
    const encoded = MeshoptEncoder.encodeGltfBuffer(
      bytesOf(array),
      count,
      stride,
      mode,
    );
    const view = {
      buffer: 1,
      byteOffset: fallbackOffset,
      byteLength: array.byteLength,
      target: mode === "ATTRIBUTES" ? 34962 : 34963,
      ...(mode === "ATTRIBUTES" ? { byteStride: stride } : {}),
      extensions: {
        EXT_meshopt_compression: {
          buffer: 0,
          byteOffset: compressedOffset,
          byteLength: encoded.length,
          byteStride: stride,
          count,
          mode,
        },
      },
    };
    parts.push(
      Buffer.from(encoded),
      Buffer.alloc(align4(encoded.length) - encoded.length),
    );
    compressedOffset += align4(encoded.length);
    fallbackOffset += align4(array.byteLength);
    json.bufferViews.push(view);
    const index = json.accessors.length;
    json.accessors.push({
      bufferView: json.bufferViews.length - 1,
      componentType,
      count,
      type,
      ...(bounds ?? {}),
    });
    return index;
  };
  for (const mesh of meshes) {
    const count = mesh.positions.length / 3;
    const indices =
      count <= 65535 ? Uint16Array.from(mesh.indices) : mesh.indices;
    const position = accessor(
      mesh.positions,
      count,
      12,
      "VEC3",
      5126,
      "ATTRIBUTES",
      mesh.bounds,
    );
    const normal = accessor(
      mesh.normals,
      count,
      12,
      "VEC3",
      5126,
      "ATTRIBUTES",
    );
    const index = accessor(
      indices,
      indices.length,
      indices.BYTES_PER_ELEMENT,
      "SCALAR",
      indices.BYTES_PER_ELEMENT === 2 ? 5123 : 5125,
      "TRIANGLES",
    );
    json.meshes.push({
      name: mesh.id,
      primitives: [
        {
          attributes: { POSITION: position, NORMAL: normal },
          indices: index,
          material: 0,
        },
      ],
    });
    json.nodes.push({
      name: mesh.id,
      mesh: json.meshes.length - 1,
      extras: {
        structureId: mesh.id,
        fmaId: mesh.fmaId,
        elementId: mesh.elementId,
        name: mesh.name,
        system,
        legacyIds: mesh.legacyIds,
        defaultVisible: mesh.defaultVisible,
      },
    });
    json.scenes[0].nodes.push(json.nodes.length - 1);
  }
  json.buffers = [
    { byteLength: compressedOffset },
    {
      byteLength: fallbackOffset,
      extensions: { EXT_meshopt_compression: { fallback: true } },
    },
  ];
  const text = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.concat([
    text,
    Buffer.alloc(align4(text.length) - text.length, 32),
  ]);
  const binary = Buffer.concat(parts);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binary.length, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binary]);
}

const systemFiles = [];
for (const system of systems) {
  const meshes = parsed.filter((mesh) => mesh.system === system);
  let batch = [],
    estimate = 0,
    chunk = 0;
  const files = [];
  let totalBytes = 0;
  const flush = () => {
    if (!batch.length) return;
    const bytes = glb(batch, system);
    if (bytes.length >= 25 * 1024 * 1024)
      throw Error(`${system} chunk exceeds the hosting asset limit`);
    const filename = `${system}-${String(++chunk).padStart(2, "0")}.glb`;
    fs.writeFileSync(path.join(output, filename), bytes);
    files.push(publicBase + filename);
    totalBytes += bytes.length;
    console.log(
      `${filename}: ${(bytes.length / 1048576).toFixed(2)} MiB, ${batch.length} clickable meshes.`,
    );
    batch = [];
    estimate = 0;
  };
  for (const mesh of meshes.filter((mesh) => mesh.sourceVersion === "4.0")) {
    const next =
      mesh.positions.byteLength +
      mesh.normals.byteLength +
      mesh.indices.byteLength +
      3500;
    if (batch.length && estimate + next > LIMIT) flush();
    batch.push(mesh);
    estimate += next;
  }
  flush();
  const supplement = meshes.filter((mesh) => mesh.sourceVersion === "4.3");
  if (supplement.length) {
    const bytes = glb(supplement, system, highres.attribution);
    if (bytes.length >= 25 * 1024 * 1024)
      throw Error("Neural supplement exceeds hosting asset limit");
    const filename = "nerves-peripheral.glb";
    fs.writeFileSync(path.join(output, filename), bytes);
    files.push(publicBase + filename);
    totalBytes += bytes.length;
    console.log(
      `${filename}: ${(bytes.length / 1048576).toFixed(2)} MiB, ${supplement.length} independently licensed clickable meshes.`,
    );
  }
  systemFiles.push({
    id: system,
    ...(files.length === 1 ? { url: files[0] } : {}),
    files,
    bytes: totalBytes,
    meshCount: meshes.length,
    triangles: meshes.reduce((sum, mesh) => sum + mesh.indices.length / 3, 0),
    licenses: [...new Set(meshes.map((mesh) => mesh.license))],
  });
}
const meshes = parsed.map(
  ({ positions, indices, normals, archive, ...metadata }) => ({
    ...metadata,
    vertexCount: positions.length / 3,
    triangles: indices.length / 3,
    sourceArchive: archive,
  }),
);
// A base rebuild must preserve separately generated isolated inspections;
// their geometry and framing never enter the base systems or base statistics.
const previousManifestPath = path.join(output, "manifest.json");
const isolatedDetails = fs.existsSync(previousManifestPath)
  ? JSON.parse(fs.readFileSync(previousManifestPath, "utf8")).isolatedDetails
  : undefined;
const previousProvenancePath = path.join(output, "provenance.json");
const isolatedProvenance = fs.existsSync(previousProvenancePath)
  ? JSON.parse(fs.readFileSync(previousProvenancePath, "utf8")).isolatedDetails
  : undefined;
const isolatedNotice = isolatedDetails
  ? fs.readFileSync(path.join(output, "details/LICENSE.txt"), "utf8")
  : "";
const manifest = {
  version: 1,
  dataset: highres
    ? "BodyParts3D 4.0 + 4.3 peripheral nerves"
    : "BodyParts3D 4.0",
  status: "ready",
  source: "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html",
  license: "CC-BY-4.0",
  licenseScope: highres
    ? "Base 4.0 GLB files only. nerves-peripheral.glb is separately licensed CC-BY-SA-2.1-JP; see licenses."
    : "All BodyParts3D 4.0 GLB files.",
  licenseUrl: "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html",
  attribution,
  licenses: [
    {
      id: "CC-BY-4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
      attribution,
    },
    ...(highres
      ? [
          {
            id: highres.license,
            url: highres.licenseUrl,
            attribution: highres.attribution,
            files: [publicBase + "nerves-peripheral.glb"],
          },
        ]
      : []),
  ],
  sourceRelease: "2013-06-19",
  licenseUpdated: "2025-02-27",
  systems: systemFiles,
  meshes,
  legacyMapping: Object.fromEntries(
    Object.keys(legacyRules).map((id) => [
      id,
      meshes
        .filter((mesh) => mesh.legacyIds.includes(id))
        .map((mesh) => mesh.id),
    ]),
  ),
  bounds: globalBounds,
  normalization: {
    applied: true,
    units: "metres",
    up: "+Y",
    anterior: "+Z",
    floorY: 0,
    sourceUnits: "millimetres",
    sourceBounds: originalBounds,
    rotationDegreesX: -90,
    scale: 0.001,
    translation: [-centerX / 1000, -minZ / 1000, centerY / 1000],
  },
  adaptations: [
    "Selected and deduplicated physical elements from official ISA and PART-OF archives",
    "Original triangle topology retained without additional decimation",
    "Converted positions to metres, rotated Z-up to Y-up, centred horizontally and placed feet at Y=0",
    "Generated smooth vertex normals and system materials",
    "Lossless EXT_meshopt_compression; no texture or geometry generated by AI",
  ],
  ...(isolatedDetails ? { isolatedDetails } : {}),
};
const serialized = JSON.stringify(manifest, null, 2) + "\n";
fs.writeFileSync(path.join(output, "manifest.json"), serialized);
fs.writeFileSync("src/data/bodyparts3d-manifest.json", serialized);
fs.writeFileSync(
  path.join(output, "provenance.json"),
  JSON.stringify(
    {
      importer: "scripts/import-bodyparts3d.mjs",
      dataset: manifest.dataset,
      sources: provenance,
      missingElements: missing,
      hiddenByDefaultWholeBodySkinElements: skinElements,
      files: systemFiles,
      ...(isolatedProvenance ? { isolatedDetails: isolatedProvenance } : {}),
    },
    null,
    2,
  ) + "\n",
);
fs.writeFileSync(
  path.join(output, "LICENSE.txt"),
  `BASE: BodyParts3D 4.0\n${attribution}\nBase files: skeleton-*.glb, muscles-*.glb, organs-*.glb, nerves-*.glb (except nerves-peripheral.glb), vessels-*.glb\nLicense: Creative Commons Attribution 4.0 International\nhttps://creativecommons.org/licenses/by/4.0/\nOfficial license confirmation (updated 2025-02-27): ${manifest.licenseUrl}\nSource: ${manifest.source}\n\n${highres ? `SUPPLEMENT: BodyParts3D 4.3\nSupplement file: nerves-peripheral.glb\n${highres.attribution}\nLicense: Creative Commons Attribution-ShareAlike 2.1 Japan (CC-BY-SA-2.1-JP)\n${highres.licenseUrl}\nOriginal source/license: https://lifesciencedb.jp/bp3d/info_en/license/index.html\nPinned distribution mirror: ${highres.mirror}/tree/${highres.commit}\nThe adapted supplement remains distributed under CC-BY-SA-2.1-JP, separately from the BY-4.0 base files.\n\n` : ""}Adaptations:\n${manifest.adaptations.map((line) => "- " + line).join("\n")}\n\nAdult male anatomical reference model. Educational use; this model and Ippomed content have not been independently medically reviewed.\n`,
);
fs.writeFileSync(
  path.join(output, "ATTRIBUTION.txt"),
  `${attribution}\nBase files: skeleton-*.glb, muscles-*.glb, organs-*.glb, nerves-*.glb (except nerves-peripheral.glb), vessels-*.glb\nLicense: https://creativecommons.org/licenses/by/4.0/\nOfficial source/license: ${manifest.source} ; ${manifest.licenseUrl}\n\n${highres ? `${highres.attribution}\nSupplement file: nerves-peripheral.glb\nLicense: ${highres.licenseUrl}\nOriginal source/license: https://lifesciencedb.jp/bp3d/info_en/license/index.html\nPinned distribution mirror: ${highres.mirror}/tree/${highres.commit}\nThe adapted supplement remains available under Creative Commons Attribution-ShareAlike 2.1 Japan.\n\n` : ""}Adaptations to the model files:\n${manifest.adaptations.map((line) => "- " + line).join("\n")}\n\nThe independently licensed model files are distributed as part of a collection; their licenses do not describe Ippomed application code. Source checksums and conversion details: provenance.json; importer: scripts/import-bodyparts3d.mjs.\n`,
);
fs.mkdirSync("public/licenses", { recursive: true });
fs.copyFileSync(
  "node_modules/meshoptimizer/LICENSE.md",
  "public/licenses/meshoptimizer-MIT.txt",
);
if (isolatedNotice) {
  for (const filename of ["LICENSE.txt", "ATTRIBUTION.txt"])
    fs.appendFileSync(path.join(output, filename), "\n" + isolatedNotice);
}
console.log(
  `Ready: ${meshes.length} physical meshes, ${(systemFiles.reduce((sum, system) => sum + system.bytes, 0) / 1048576).toFixed(2)} MiB GLBs. Raw OBJ archives remain local.`,
);
