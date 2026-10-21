/**
 * Download selected entries from the official 3.0/95 ZIP using HTTP ranges,
 * then publish independently framed HD inspections. Never modify base GLBs.
 * No registration, deformation, subdivision or decimation is performed.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { inflateRawSync, crc32 } from "node:zlib";
import { unzipSync } from "fflate";
import { MeshoptEncoder } from "meshoptimizer";

const sourceUrl =
  "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_95.zip";
const sourceDataset = "BodyParts3D 3.0 — isolated 95% detail models";
const license = "CC-BY-SA-2.1-JP";
const licenseUrl = "https://creativecommons.org/licenses/by-sa/2.1/jp/";
const attribution =
  "BodyParts3D, Copyright(C) 2010-2011 The Database Center for Life Science licensed under CC Attribution-ShareAlike 2.1 Japan";
const cache = path.resolve(".local/bodyparts3d-3.0-95");
const output = path.resolve("public/anatomy/bodyparts3d/details");
const manifestPath = path.resolve("public/anatomy/bodyparts3d/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const baseMeshCount = manifest.meshes.length;
const baseTriangles = manifest.meshes.reduce(
  (sum, mesh) => sum + mesh.triangles,
  0,
);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const groups = [
  "biceps",
  "triceps",
  "deltoid",
  "pectoralis-major",
  "rectus-abdominis",
  "quadriceps",
  "diaphragm",
];
const requested = new Set(
  groups.flatMap((id) => manifest.legacyMapping[id] ?? []),
);
const meshes = manifest.meshes.filter((mesh) => requested.has(mesh.id));
if (!meshes.length) throw Error("No compatible base muscle surfaces found");
fs.mkdirSync(path.join(cache, "objs"), { recursive: true });
fs.mkdirSync(output, { recursive: true });
let fetchedBytes = 0;
async function range(start, end) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(sourceUrl, {
        headers: { Range: `bytes=${start}-${end}` },
        signal: AbortSignal.timeout(60000),
      });
      if (
        response.status !== 206 ||
        !response.headers
          .get("content-range")
          ?.startsWith(`bytes ${start}-${end}/`)
      )
        throw Error(
          `The source did not honor a byte range (HTTP ${response.status}); refusing a full-archive download`,
        );
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length !== end - start + 1)
        throw Error("Truncated source range");
      fetchedBytes += bytes.length;
      return bytes;
    } catch (issue) {
      if (attempt === 2) throw issue;
    }
  }
}
const head = await fetch(sourceUrl, {
  method: "HEAD",
  signal: AbortSignal.timeout(30000),
});
const archiveBytes = Number(head.headers.get("content-length"));
if (!head.ok || !Number.isSafeInteger(archiveBytes) || archiveBytes < 1000000)
  throw Error("Invalid source archive length");
const tail = await range(archiveBytes - 131072, archiveBytes - 1);
let endRecord = -1;
for (let i = tail.length - 22; i >= 0; i--)
  if (tail.readUInt32LE(i) === 0x06054b50) {
    endRecord = i;
    break;
  }
if (endRecord < 0) throw Error("ZIP end record missing");
const centralSize = tail.readUInt32LE(endRecord + 12),
  centralOffset = tail.readUInt32LE(endRecord + 16);
const central = await range(centralOffset, centralOffset + centralSize - 1);
const index = [];
for (let cursor = 0; cursor < central.length;) {
  if (central.readUInt32LE(cursor) !== 0x02014b50)
    throw Error("Invalid central directory entry");
  const nameLength = central.readUInt16LE(cursor + 28),
    extraLength = central.readUInt16LE(cursor + 30),
    commentLength = central.readUInt16LE(cursor + 32);
  const name = central
    .subarray(cursor + 46, cursor + 46 + nameLength)
    .toString("utf8");
  index.push({
    name,
    method: central.readUInt16LE(cursor + 10),
    crc: central.readUInt32LE(cursor + 16),
    compressedBytes: central.readUInt32LE(cursor + 20),
    bytes: central.readUInt32LE(cursor + 24),
    offset: central.readUInt32LE(cursor + 42),
  });
  cursor += 46 + nameLength + extraLength + commentLength;
}
const basename = (name) => name.split(/[\\/]/).at(-1);
const oldMeshes = unzipSync(
  fs.readFileSync(".local/bodyparts3d/isa_BP3D_4.0_obj_99.zip"),
  {
    filter: (entry) =>
      meshes.some((mesh) => basename(entry.name) === `${mesh.elementId}.obj`),
  },
);
const sourceConcepts = new Map(
  Object.entries(oldMeshes).map(([name, bytes]) => {
    const concept = Buffer.from(bytes)
      .toString("utf8")
      .match(/# Concept ID : (FMA\d+)/)?.[1];
    if (!concept) throw Error(`Source concept missing: ${name}`);
    return [basename(name).replace(/\.obj$/, ""), concept];
  }),
);
const candidates = [],
  unavailable = [];
for (const mesh of meshes) {
  const sourceFmaId = sourceConcepts.get(mesh.elementId);
  const archiveEntry = index.find(
    (entry) => basename(entry.name) === `${sourceFmaId}.obj`,
  );
  if (archiveEntry) candidates.push({ mesh, sourceFmaId, archiveEntry });
  else
    unavailable.push({
      id: mesh.id,
      sourceFmaId,
      reason: "No matching concept in the official 3.0/95 archive",
    });
}
const queue = [...candidates],
  sources = [];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const candidate = queue.shift();
      const { archiveEntry: entry, sourceFmaId } = candidate;
      const location = path.join(cache, "objs", `${sourceFmaId}.obj`);
      let obj = fs.existsSync(location) ? fs.readFileSync(location) : null;
      if (!obj || obj.length !== entry.bytes || crc32(obj) !== entry.crc) {
        const header = await range(entry.offset, entry.offset + 29);
        if (header.readUInt32LE(0) !== 0x04034b50)
          throw Error("Invalid local source ZIP header");
        const offset =
          entry.offset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
        const encoded = await range(offset, offset + entry.compressedBytes - 1);
        obj =
          entry.method === 8
            ? inflateRawSync(encoded)
            : entry.method === 0
              ? encoded
              : null;
        if (!obj || obj.length !== entry.bytes || crc32(obj) !== entry.crc)
          throw Error(`Integrity verification failed: ${entry.name}`);
        fs.writeFileSync(location, obj);
      }
      sources.push({ ...candidate, obj, sha256: hash(obj) });
      console.log(
        `Verified isolated source ${sources.length}/${candidates.length}: ${sourceFmaId}`,
      );
    }
  }),
);
sources.sort((a, b) => a.mesh.id.localeCompare(b.mesh.id));

function parse(obj) {
  const vertices = [],
    normals = [],
    indices = [];
  for (const line of obj.toString("utf8").split(/\r?\n/)) {
    if (line.startsWith("v "))
      vertices.push(...line.trim().split(/\s+/).slice(1, 4).map(Number));
    if (line.startsWith("vn "))
      normals.push(...line.trim().split(/\s+/).slice(1, 4).map(Number));
    if (line.startsWith("f ")) {
      const face = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((token) => {
          const [v, , n] = token.split("/").map(Number);
          if (!Number.isInteger(v) || v < 1 || v !== n)
            throw Error(
              "Unexpected source normal indexing; review before converting",
            );
          return v - 1;
        });
      for (let i = 1; i + 1 < face.length; i++)
        indices.push(face[0], face[i], face[i + 1]);
    }
  }
  if (
    !indices.length ||
    vertices.length !== normals.length ||
    vertices.some((value) => !Number.isFinite(value)) ||
    indices.some((index) => index >= vertices.length / 3)
  )
    throw Error("Invalid source geometry");
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  const position = new Float32Array(vertices.length),
    normal = new Float32Array(normals.length);
  const { scale, translation } = manifest.normalization;
  for (let i = 0; i < vertices.length; i += 3) {
    position[i] = vertices[i] * scale + translation[0];
    position[i + 1] = vertices[i + 2] * scale + translation[1];
    position[i + 2] = -vertices[i + 1] * scale + translation[2];
    const rotated = [normals[i], normals[i + 2], -normals[i + 1]];
    const length = Math.hypot(...rotated);
    if (!length) throw Error("Source normal is zero; review before converting");
    for (let a = 0; a < 3; a++) {
      normal[i + a] = rotated[a] / length;
      bounds.min[a] = Math.min(bounds.min[a], position[i + a]);
      bounds.max[a] = Math.max(bounds.max[a], position[i + a]);
    }
  }
  return {
    position,
    normal,
    indices:
      vertices.length / 3 <= 65535
        ? Uint16Array.from(indices)
        : Uint32Array.from(indices),
    bounds,
  };
}
await MeshoptEncoder.ready;
const align = (value) => (value + 3) & ~3;
function glb(mesh, geometry) {
  const json = {
    asset: {
      version: "2.0",
      generator: "Ippomed isolated BodyParts3D detail importer",
      copyright: attribution,
    },
    extensionsUsed: ["EXT_meshopt_compression"],
    extensionsRequired: ["EXT_meshopt_compression"],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      {
        name: mesh.id,
        mesh: 0,
        extras: {
          structureId: mesh.id,
          fmaId: mesh.fmaId,
          elementId: mesh.elementId,
          name: mesh.name,
          system: "muscles",
          isolatedOnly: true,
          sourceVersion: "3.0",
          legacyIds: mesh.legacyIds,
        },
      },
    ],
    meshes: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
    materials: [
      {
        name: "muscle-detail",
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: [0.64, 0.22, 0.2, 1],
          metallicFactor: 0,
          roughnessFactor: 0.65,
        },
      },
    ],
  };
  const parts = [];
  let compressedOffset = 0,
    fallbackOffset = 0;
  function accessor(array, count, stride, componentType, type, mode, bounds) {
    const raw = new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength,
    );
    const encoded = MeshoptEncoder.encodeGltfBuffer(raw, count, stride, mode);
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
      Buffer.alloc(align(encoded.length) - encoded.length),
    );
    compressedOffset += align(encoded.length);
    fallbackOffset += align(array.byteLength);
    json.bufferViews.push(view);
    json.accessors.push({
      bufferView: json.bufferViews.length - 1,
      count,
      componentType,
      type,
      ...(bounds ?? {}),
    });
    return json.accessors.length - 1;
  }
  const count = geometry.position.length / 3;
  const p = accessor(
    geometry.position,
    count,
    12,
    5126,
    "VEC3",
    "ATTRIBUTES",
    geometry.bounds,
  );
  const n = accessor(geometry.normal, count, 12, 5126, "VEC3", "ATTRIBUTES");
  const i = accessor(
    geometry.indices,
    geometry.indices.length,
    geometry.indices.BYTES_PER_ELEMENT,
    geometry.indices.BYTES_PER_ELEMENT === 2 ? 5123 : 5125,
    "SCALAR",
    "TRIANGLES",
  );
  json.meshes.push({
    name: mesh.id,
    primitives: [
      { attributes: { POSITION: p, NORMAL: n }, indices: i, material: 0 },
    ],
  });
  json.buffers = [
    { byteLength: compressedOffset },
    {
      byteLength: fallbackOffset,
      extensions: { EXT_meshopt_compression: { fallback: true } },
    },
  ];
  const text = Buffer.from(JSON.stringify(json)),
    jsonChunk = Buffer.concat([
      text,
      Buffer.alloc(align(text.length) - text.length, 32),
    ]),
    bin = Buffer.concat(parts);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jsonChunk.length + bin.length, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, bin]);
}
const details = [],
  provenance = [];
for (const source of sources) {
  const geometry = parse(source.obj),
    bytes = glb(source.mesh, geometry);
  if (bytes.length >= 25 * 1024 * 1024)
    throw Error("Isolated detail exceeds the hosting asset limit");
  const filename = `${source.mesh.id.toLowerCase().replaceAll("_", "-")}.glb`;
  fs.writeFileSync(path.join(output, filename), bytes);
  details.push({
    id: source.mesh.id,
    sourceFmaId: source.sourceFmaId,
    url: `/anatomy/bodyparts3d/details/${filename}`,
    bytes: bytes.length,
    triangles: geometry.indices.length / 3,
    vertexCount: geometry.position.length / 3,
    bounds: geometry.bounds,
    sourceVersion: "3.0",
    sourceSha256: source.sha256,
    assetSha256: hash(bytes),
  });
  provenance.push({
    id: source.mesh.id,
    sourceFmaId: source.sourceFmaId,
    archiveEntry: source.archiveEntry.name,
    sourceBytes: source.obj.length,
    compressedBytes: source.archiveEntry.compressedBytes,
    crc32: source.archiveEntry.crc,
    sha256: source.sha256,
  });
}
manifest.isolatedDetails = {
  dataset: sourceDataset,
  license,
  licenseUrl,
  attribution,
  isolatedOnly: true,
  entries: details,
};
if (
  manifest.meshes.length !== baseMeshCount ||
  manifest.meshes.reduce((sum, mesh) => sum + mesh.triangles, 0) !==
    baseTriangles
)
  throw Error("The base atlas changed during detail conversion");
const serialized = JSON.stringify(manifest, null, 2) + "\n";
fs.writeFileSync(manifestPath, serialized);
fs.writeFileSync("src/data/bodyparts3d-manifest.json", serialized);
const notice = `ISOLATED HD DETAILS: BodyParts3D 3.0, official 95% archive\n${attribution}\nLicense: Creative Commons Attribution-ShareAlike 2.1 Japan (${license})\n${licenseUrl}\nSource archive: ${sourceUrl}\nFiles: details/*.glb\nThese adapted detail files remain distributed under ${license}, separately from the base atlas.\nAdaptations: selected archive entries, original positions converted to metres with the base atlas axis convention, source normals retained, lossless Meshopt compression. No registration or additional decimation.\nThe 3.0 details retain their original geometry and are for isolated inspection only; they must not be superimposed on the 4.0/4.3 body or used to infer relationships between versions.\n`;
fs.writeFileSync(path.join(output, "LICENSE.txt"), notice);
for (const name of ["LICENSE.txt", "ATTRIBUTION.txt"]) {
  const filename = path.resolve("public/anatomy/bodyparts3d", name);
  const existing = fs
    .readFileSync(filename, "utf8")
    .split("\nISOLATED HD DETAILS:")[0]
    .trimEnd();
  fs.writeFileSync(filename, existing + "\n\n" + notice);
}
const sourceRecord = {
  dataset: sourceDataset,
  archive: {
    url: sourceUrl,
    bytes: archiveBytes,
    centralDirectorySha256: hash(central),
    retrieval:
      "Verified HTTP byte ranges; the whole archive was not downloaded",
  },
  importer: "scripts/import-bodyparts3d-details.mjs",
  license,
  licenseUrl,
  attribution,
  isolatedOnly: true,
  normalization: manifest.normalization,
  entries: provenance,
  unavailable,
};
fs.writeFileSync(
  path.join(output, "provenance.json"),
  JSON.stringify(sourceRecord, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(cache, "details-metadata.json"),
  JSON.stringify(sourceRecord, null, 2) + "\n",
);
const mainProvenancePath = path.resolve(
  "public/anatomy/bodyparts3d/provenance.json",
);
const mainProvenance = JSON.parse(fs.readFileSync(mainProvenancePath, "utf8"));
mainProvenance.isolatedDetails = {
  dataset: sourceDataset,
  license,
  notice: "/anatomy/bodyparts3d/details/LICENSE.txt",
  provenance: "/anatomy/bodyparts3d/details/provenance.json",
  meshCount: details.length,
};
fs.writeFileSync(
  mainProvenancePath,
  JSON.stringify(mainProvenance, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      isolatedDetails: details.length,
      triangles: details.reduce((sum, entry) => sum + entry.triangles, 0),
      totalMiB: details.reduce((sum, entry) => sum + entry.bytes, 0) / 1048576,
      downloadedMiB: fetchedBytes / 1048576,
      unavailable,
      baseMeshCount,
      baseTriangles,
      completeQuizGroups: groups.filter(
        (group) =>
          (manifest.legacyMapping[group]?.length ?? 0) > 0 &&
          manifest.legacyMapping[group].every((id) =>
            details.some((entry) => entry.id === id),
          ),
      ),
    },
    null,
    2,
  ),
);
